"""Offline tests for the privacy alert pipeline. Run from the privacy-alert folder:

    python -m pytest -q

No network, no API keys: HTTP and WhatsApp calls are replaced with fakes.
"""

import csv
import json
import sys
from datetime import date
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import config  # noqa: E402
import main  # noqa: E402


@pytest.fixture
def tmp_paths(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "SEEN_FILE", tmp_path / "seen.json")
    monkeypatch.setattr(config, "LOG_FILE", tmp_path / "alerts_log.csv")
    return tmp_path


def make_item(title, text="", jurisdiction="UK", url=None):
    url = url or f"https://example.test/{title.replace(' ', '-')}"
    return main.Item(main._sha(url), "Test source", jurisdiction, "entry", title, url,
                     "2026-10-27", text)


# --- keyword filter ---------------------------------------------------------
def test_keyword_matches_whole_words_only():
    assert main.matches_keywords("New guidance on personal data transfers")
    assert main.matches_keywords("Decree on DPO appointments")
    assert not main.matches_keywords("Quarterly sales report")


def test_keyword_matches_arabic_and_portuguese():
    assert main.matches_keywords("قرار جديد بشأن البيانات الشخصية")
    assert main.matches_keywords("Novo decreto sobre dados pessoais")


# --- state -------------------------------------------------------------------
def test_state_round_trip_and_pruning(tmp_paths, monkeypatch):
    monkeypatch.setattr(config, "MAX_SEEN_ITEMS", 2)
    state = main.load_state()
    state["items"] = {
        "a": {"first_seen": "2026-01-01T00:00:00+00:00"},
        "b": {"first_seen": "2026-03-01T00:00:00+00:00"},
        "c": {"first_seen": "2026-02-01T00:00:00+00:00"},
    }
    main.save_state(state)
    reloaded = main.load_state()
    assert set(reloaded["items"]) == {"b", "c"}  # oldest pruned


def test_corrupt_state_refuses_to_run(tmp_paths):
    config.SEEN_FILE.write_text("{not json", encoding="utf-8")
    with pytest.raises(SystemExit):
        main.load_state()


# --- collection: dedupe and baseline -----------------------------------------
def test_collect_dedupes_and_baselines(tmp_paths, monkeypatch):
    monkeypatch.setattr(config, "SOURCES", {
        "Test feed": {"jurisdiction": "UK", "type": "rss", "url": "unused"},
    })
    feed_items = [make_item("Old GDPR news"), make_item("Breach guidance update")]
    monkeypatch.setattr(main, "fetch_feed", lambda src, today: list(feed_items))

    state = main.load_state()
    relevant, new_count, ok, failed = main.collect(state, None, date(2026, 10, 27), "now")
    assert relevant == [] and new_count == 0  # first run: baseline, no alerts
    assert ok == ["Test feed"] and failed == []

    feed_items.append(make_item("Data Act amendment consultation"))
    relevant, new_count, _, _ = main.collect(state, None, date(2026, 10, 28), "now")
    assert new_count == 1
    assert [i.title for i in relevant] == ["Data Act amendment consultation"]

    relevant, new_count, _, _ = main.collect(state, None, date(2026, 10, 29), "now")
    assert new_count == 0  # already seen


def test_failed_source_is_logged_and_skipped(tmp_paths, monkeypatch):
    monkeypatch.setattr(config, "SOURCES", {
        "Broken": {"jurisdiction": "UK", "type": "rss", "url": "unused"},
        "Working": {"jurisdiction": "EU", "type": "rss", "url": "unused"},
    })

    def fake_feed(src, today):
        if src["jurisdiction"] == "UK":
            raise ConnectionError("simulated outage")
        return []

    monkeypatch.setattr(main, "fetch_feed", fake_feed)
    state = main.load_state()
    _, _, ok, failed = main.collect(state, None, date(2026, 10, 27), "now")
    assert failed == ["Broken"]
    assert ok == ["Working"]


def test_disabled_source_is_skipped(tmp_paths, monkeypatch):
    monkeypatch.setattr(config, "SOURCES", {
        "Off": {"jurisdiction": "UK", "type": "rss", "url": "unused", "enabled": False},
    })
    called = []
    monkeypatch.setattr(main, "fetch_feed", lambda *a: called.append(a) or [])
    _, _, ok, failed = main.collect(main.load_state(), None, date(2026, 10, 27), "now")
    assert called == [] and ok == [] and failed == []


# --- messages ----------------------------------------------------------------
def test_split_message_respects_limit_and_numbers_parts():
    text = "\n\n".join(f"Paragraph {n} " + "x" * 400 for n in range(10))
    parts = main.split_message(text, 1500)
    assert len(parts) > 1
    assert all(len(p) <= 1500 for p in parts)
    assert parts[0].startswith(f"(1/{len(parts)})")
    assert parts[-1].startswith(f"({len(parts)}/{len(parts)})")


def test_short_message_is_not_split():
    assert main.split_message("short digest", 1500) == ["short digest"]


def test_quiet_day_message(monkeypatch):
    monkeypatch.setattr(main, "uses_template", lambda: False)
    messages = main.compose(None, date(2026, 10, 27), ["a", "b"], [])
    assert len(messages) == 1
    assert "No material changes today." in messages[0]


def test_model_reply_of_no_changes_is_treated_as_quiet(monkeypatch):
    monkeypatch.setattr(main, "uses_template", lambda: False)
    messages = main.compose("No material changes today.", date(2026, 10, 27), ["a"], ["b"])
    assert "No material changes today." in messages[0]
    assert "Source errors today: b" in messages[0]


def test_digest_carries_verification_footer(monkeypatch):
    monkeypatch.setattr(main, "uses_template", lambda: False)
    messages = main.compose("*UK*\n- Something", date(2026, 10, 27), ["a"], [])
    assert "Verify against the official gazette or regulator text" in messages[0]


def test_plain_digest_groups_by_jurisdiction():
    items = [make_item("UK item", jurisdiction="UK"), make_item("KSA item", jurisdiction="Saudi Arabia")]
    text = main.plain_digest(items)
    assert text.index("*UK*") < text.index("*Saudi Arabia*")


# --- audit log ---------------------------------------------------------------
def test_audit_log_appends_with_header(tmp_paths):
    row = {"run_utc": "t1", "new_items": 3, "whatsapp_sent": "yes"}
    main.append_log(row)
    main.append_log(row)
    with config.LOG_FILE.open(encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == 2
    assert rows[0]["whatsapp_sent"] == "yes"
    assert list(rows[0].keys()) == main.LOG_COLUMNS


# --- delivery is never reached in dry-run ------------------------------------
def test_dry_run_writes_nothing(tmp_paths, monkeypatch, capsys):
    monkeypatch.setattr(config, "SOURCES", {})
    args = main.parse_args(["--dry-run"])
    assert main.run(args) == 0
    assert not config.SEEN_FILE.exists()
    assert not config.LOG_FILE.exists()
    assert "dry-run=True" in capsys.readouterr().out


def test_delivery_failure_keeps_state_unsaved(tmp_paths, monkeypatch):
    monkeypatch.setattr(config, "SOURCES", {
        "Feed": {"jurisdiction": "UK", "type": "rss", "url": "unused"},
    })
    config.SEEN_FILE.write_text(json.dumps({"items": {}, "pages": {}, "initialised": ["Feed"]}))
    monkeypatch.setattr(main, "fetch_feed", lambda src, today: [make_item("Breach notification rule")])
    monkeypatch.setattr(main, "deliver", lambda messages: (_ for _ in ()).throw(RuntimeError("twilio down")))
    monkeypatch.setattr(main, "_require", lambda name: "x")
    monkeypatch.setattr(main, "summarise", lambda items: "*UK*\n- Breach notification rule")

    assert main.run(main.parse_args([])) == 1
    saved = json.loads(config.SEEN_FILE.read_text(encoding="utf-8"))
    assert saved["items"] == {}  # nothing marked seen, so the item is retried tomorrow
    with config.LOG_FILE.open(encoding="utf-8") as handle:
        assert list(csv.DictReader(handle))[0]["whatsapp_sent"] == "no"


# --- Claude summarisation (SDK client faked, no network) ----------------------
class _FakeMessages:
    def __init__(self, response):
        self.response = response
        self.kwargs = None

    def create(self, **kwargs):
        self.kwargs = kwargs
        return self.response


def _fake_client(monkeypatch, response):
    from types import SimpleNamespace

    messages = _FakeMessages(response)
    monkeypatch.setattr(main.anthropic, "Anthropic", lambda: SimpleNamespace(messages=messages))
    return messages


def test_summarise_calls_claude_with_adaptive_thinking(monkeypatch):
    from types import SimpleNamespace

    response = SimpleNamespace(
        stop_reason="end_turn", stop_details=None,
        content=[SimpleNamespace(type="thinking", thinking=""),
                 SimpleNamespace(type="text", text="*UK*\n- Item")],
    )
    messages = _fake_client(monkeypatch, response)
    assert main.summarise([make_item("Consent guidance")]) == "*UK*\n- Item"
    assert messages.kwargs["model"] == config.AI_MODEL
    assert messages.kwargs["thinking"] == {"type": "adaptive"}
    assert messages.kwargs["output_config"] == {"effort": config.AI_EFFORT}
    assert "Consent guidance" in messages.kwargs["messages"][0]["content"]


def test_summarise_raises_on_refusal(monkeypatch):
    from types import SimpleNamespace

    response = SimpleNamespace(stop_reason="refusal",
                               stop_details=SimpleNamespace(category="cyber"), content=[])
    _fake_client(monkeypatch, response)
    with pytest.raises(RuntimeError, match="declined"):
        main.summarise([make_item("Consent guidance")])


def test_summarise_raises_on_truncation(monkeypatch):
    from types import SimpleNamespace

    response = SimpleNamespace(stop_reason="max_tokens", stop_details=None, content=[])
    _fake_client(monkeypatch, response)
    with pytest.raises(RuntimeError, match="truncated"):
        main.summarise([make_item("Consent guidance")])

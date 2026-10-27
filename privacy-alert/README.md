# Data-Privacy Regulatory Alert

A daily job that watches privacy regulators and legislation for six jurisdictions
(UK, EU, Canada, Bahrain, Saudi Arabia, Mozambique), filters for personal-data
keywords, summarises new items with Gemini, and sends a digest to WhatsApp.

```
config.py          sources, keywords, jurisdictions, schedule, tuning (edit this)
main.py            pipeline: fetch -> de-duplicate -> keyword filter -> Gemini -> WhatsApp -> log
requirements.txt   Python dependencies
.env.example       environment variables (copy to .env)
seen.json          created on first run: item and page hashes already processed
alerts_log.csv     created on first run: one row per run (audit trail)
tests/             offline tests (no network, no keys)
../.github/workflows/privacy-alert.yml   daily GitHub Actions schedule
```

> **Triage aid, not legal advice.** Every digest says so. Verify against the
> official gazette or regulator text before any compliance action.

---

## 1. How it behaves

| Situation | Result |
|---|---|
| New relevant item | Grouped digest by jurisdiction, with impact rating, flags, source, date and link |
| Nothing relevant | Short "No material changes today" message, so you know it ran |
| One source is down | Logged, listed in the message footer, other sources continue |
| Gemini fails | Plain list of the relevant items is sent instead, and the footer says so |
| WhatsApp send fails | Exit code 1, the audit log records `whatsapp_sent = no`, and the items are **not** marked seen, so they are retried tomorrow |
| First run for a source | Existing items are recorded silently (baseline). Set `BASELINE_ON_FIRST_RUN = False` to alert on everything the first time |
| Digest over 1,500 characters | Split into numbered messages `(1/3)`, `(2/3)` and so on |

---

## 2. Setup

### Prerequisites
- Python 3.11 or newer
- A Gemini API key (Google AI Studio)
- A Twilio account (sandbox is free) or a Meta WhatsApp Cloud API app
- Your WhatsApp number in international format, e.g. `+973XXXXXXXX`

### Step 1: Gemini API key
1. Open Google AI Studio and create an API key.
2. Put it in `.env` as `GEMINI_API_KEY`. The model is set by `GEMINI_MODEL` in `config.py` (default `gemini-2.5-flash`).

### Step 2: Twilio WhatsApp sandbox (testing)
1. Create a Twilio account and note **Account SID** and **Auth Token** from the console home page.
2. In the console go to **Messaging > Try it out > Send a WhatsApp message**.
3. From your phone, send the join code shown (`join <two-words>`) to the sandbox number **+1 415 523 8886**. Twilio replies to confirm.
4. In `.env` set:
   ```
   TWILIO_SID=AC...
   TWILIO_TOKEN=...
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   MY_WHATSAPP_NUMBER=+973XXXXXXXX
   ```
5. Sandbox sessions expire after about 72 hours without a message from you. If the digest stops arriving, send the join code again.

### Step 3: Move to a production WhatsApp sender
The sandbox is for testing only. For a permanent daily digest:

1. **Meta Business verification.** Your organisation needs a verified Meta Business Manager account (Twilio asks for this when you register a sender).
2. **Dedicated number.** Use a phone number that is not already registered on WhatsApp or WhatsApp Business.
3. **Register the sender.** In Twilio: **Messaging > Senders > WhatsApp senders > Create**. Set the display name and wait for Meta to approve it. This can take days.
4. **Create a template.** The digest starts outside the 24-hour customer-service window, so WhatsApp only accepts it as an approved template. In Twilio **Content Template Builder**, create a template with category **Utility** and a single body variable:
   ```
   {{1}}
   ```
   Submit it for WhatsApp approval. Meta can reclassify a template it considers marketing, and then reject it. Keep the content to regulatory updates.
5. Copy the template's **Content SID** (starts `HX...`) into `TWILIO_CONTENT_SID`, and set `TWILIO_WHATSAPP_FROM` to your approved sender.
6. When `TWILIO_CONTENT_SID` is set, the script sends in template mode and uses 1,000-character chunks (WhatsApp caps template variables at 1,024 characters).

**Meta Cloud API alternative.** Set `WHATSAPP_PROVIDER = "meta"` in `config.py`, then:
1. In developers.facebook.com create an app, add the **WhatsApp** product, and note the **Phone number ID**.
2. Create a **system user** with a permanent access token that has `whatsapp_business_messaging` permission.
3. Create an approved utility template with one body variable and note its name. Set `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`, `META_TEMPLATE_NAME` and optionally `META_TEMPLATE_LANG`.
4. Template parameters cannot contain newlines, so the digest is flattened to a single line in this mode.

### Step 4: Local install
```bash
cd privacy-alert
python3 -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # then fill in the values
chmod 600 .env                      # Linux/macOS
```

### Step 5: Check the source URLs
The URLs in `config.py` were written without live verification. Some regulator sites block automated clients or have moved pages. Check each one before going live:

```bash
python main.py --stage fetch                       # all sources, no sending, no state written
python main.py --stage fetch --source "EU - "      # just one jurisdiction
```

Every failing source prints `FAILED <name>: <reason>`. Fix the URL in `config.py`, or set `"enabled": False`. For a page source, check that the links it returns make sense: the scraper keeps same-site links with titles of 15 characters or more.

---

## 3. Adding, removing or tuning sources

Everything is in `config.py`:

- **Add a source:** add an entry to `SOURCES`. Use `"type": "rss"` for a feed, or `"type": "page"` for a web page. For a page, `same_domain_only` and `ignore_patterns` (regexes stripped before hashing, e.g. "Last updated" dates) reduce noise.
- **Remove a source:** delete its entry, or set `"enabled": False`.
- **Keywords:** edit `KEYWORDS`. Matching is case-insensitive and whole-word, and includes Portuguese and Arabic terms.
- **Jurisdictions:** `JURISDICTIONS` sets the order in the digest. Each source's `jurisdiction` must match one of these names.

---

## 4. Testing

Run the stages in order. Each one must pass before you move to the next.

| # | Stage | Command | Expected result |
|---|---|---|---|
| 1 | Offline unit tests | `python -m pytest -q` | 16 passed, no network needed |
| 2 | Collection | `python main.py --stage fetch` | Per-source `OK` lines. Failing sources are named. Nothing written to disk |
| 3 | Baseline | Run stage 2 once, then `python main.py --stage send --dry-run` | Quiet-day message printed. `seen.json` is not created in dry-run |
| 4 | Summarisation | `python main.py --stage summarise` | Gemini digest printed, grouped by jurisdiction, with footer. Try `--no-ai` to see the plain list without a key |
| 5 | Delivery test | `python main.py --ping` | A WhatsApp message arrives on your phone |
| 6 | Real send | `python main.py` | Digest or quiet notice arrives. `seen.json` and `alerts_log.csv` are created. `whatsapp_sent = yes` |
| 7 | De-duplication | Run `python main.py` again straight away | Quiet-day message. No repeated items |
| 8 | Failure path | Set `GEMINI_API_KEY=bad` and run with a new item present | Plain-list fallback sent, with footer note |
| 9 | Failure path | Set `TWILIO_TOKEN=bad` and run with a new item present | Exit code 1. `whatsapp_sent = no`. `seen.json` unchanged, so the item is retried |
| 10 | Change detection | Edit a tracked page or feed in a test copy, then run | Only the new or changed item is alerted |
| 11 | Scheduled run | Trigger the GitHub workflow manually (section 5) | Green run. State commit appears on the branch |

Remember to restore any deliberately broken `.env` values before stage 6.

---

## 5. Scheduling

### Option A: cron on a server (07:00 Bahrain time)
Bahrain is UTC+3 with no daylight saving, so 07:00 local = 04:00 UTC.

```bash
crontab -e
```
```cron
# Daily 07:00 Asia/Bahrain (04:00 UTC). Use the venv's Python so dependencies load.
0 4 * * * cd /opt/privacy-alert && /opt/privacy-alert/.venv/bin/python main.py >> /opt/privacy-alert/cron.log 2>&1
```

If your cron supports `CRON_TZ` (cronie, most Linux distributions), you can write the time in local terms:
```cron
CRON_TZ=Asia/Bahrain
0 7 * * * cd /opt/privacy-alert && /opt/privacy-alert/.venv/bin/python main.py >> /opt/privacy-alert/cron.log 2>&1
```

`cron` does not read your shell profile, so the script loads `.env` itself. Keep `.env` readable by the cron user only.

### Option B: GitHub Actions (recommended for a managed schedule)
The workflow is at `.github/workflows/privacy-alert.yml`. GitHub only reads workflows from the repository root, so it sits there and runs the code in `privacy-alert/`.

1. **Add secrets.** Repository **Settings > Secrets and variables > Actions > New repository secret**. Add `GEMINI_API_KEY`, `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_WHATSAPP_FROM`, `MY_WHATSAPP_NUMBER`, and where needed `TWILIO_CONTENT_SID` or the Meta variables.
2. **Enable write access for the workflow.** The workflow commits `seen.json` and `alerts_log.csv` back to the branch. Check **Settings > Actions > General > Workflow permissions**. If the branch is protected, allow the bot to push or the state commit will fail. Without it the state is lost and items re-alert.
3. **Schedule runs from the default branch only.** GitHub reads `schedule` triggers from the default branch. Merge the workflow there before relying on the cron.
4. **Test it:** Actions tab > *Privacy regulatory alert* > **Run workflow** (use `stage = fetch` first).
5. Scheduled runs can start several minutes late under load. That is acceptable for a daily digest.

---

## 6. Audit trail

Each real run appends one row to `alerts_log.csv`:

| Column | Meaning |
|---|---|
| `run_utc`, `run_date_bahrain` | When the run happened |
| `stage` | `send` for scheduled runs |
| `new_items` | New items found, before keyword filtering |
| `relevant_items` | New items that matched a keyword |
| `jurisdictions_covered` | Jurisdictions with at least one source checked successfully |
| `sources_ok`, `sources_failed` | Counts and names of failed sources |
| `messages` | WhatsApp messages in this run |
| `whatsapp_sent` | `yes`, or `no` if delivery failed |
| `notes` | Fallbacks used and error text |

Dry runs and `--stage fetch` or `summarise` write nothing to the log.

---

## 7. Limitations to keep in mind

- **Scraped pages break.** Regulator sites change layout. A broken page source shows up in the footer as a source error. Review failed sources monthly.
- **Page-change alerts are unidentified.** A "Page updated" item means a monitored page changed in a keyword line. The digest says it needs review. It does not say what changed.
- **Keyword noise.** Words such as "regulation" and "consent" match a lot of text, especially EUR-Lex. Tighten `KEYWORDS` if the digest gets noisy.
- **AI summaries can be wrong.** The prompt forbids inventing facts, but the output is still generated. Check the official text before acting on it.
- **Portuguese and Arabic.** Gemini can read these sources, but the scraper's keyword matching is only as good as the page text it receives.
- **Partial delivery.** If a multi-part message fails part way through, the next run re-sends the whole digest, so the first parts can arrive twice.
- **Data handling.** Only public regulator text is sent to Gemini. Do not add internal sources to `SOURCES`.

---

## 8. Quick reference

```bash
python main.py                      # full run (send)
python main.py --stage fetch        # collect and filter only
python main.py --stage summarise    # also build the digest
python main.py --dry-run            # full run, print messages, no state or log
python main.py --no-ai              # plain list instead of Gemini
python main.py --ping               # WhatsApp system check
python main.py --source "UK - "     # restrict to sources whose name contains text
python -m pytest -q                 # offline tests
```

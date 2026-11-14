"""PDF report: content in both languages, release rules, and that a PDF comes out."""
import pytest

from app.config import get_settings
from app.reports.charts import progress_chart_svg
from app.reports.report import fmt_int, fmt_progress
from app.seed import main as seed


@pytest.fixture
def demo(anon, monkeypatch):
    """The seeded demo site, with the analyst and viewer clients signed in."""
    from fastapi.testclient import TestClient
    from app.main import app

    settings = get_settings()
    for key, value in (("demo_analyst_email", "ra@test.example"), ("demo_analyst_password", "report-analyst-pw"),
                       ("demo_viewer_email", "rv@test.example"), ("demo_viewer_password", "report-viewer-pw")):
        monkeypatch.setattr(settings, key, value)
    seed()
    analyst, viewer = TestClient(app), TestClient(app)
    analyst.post("/api/auth/login", json={"email": "ra@test.example", "password": "report-analyst-pw"})
    viewer.post("/api/auth/login", json={"email": "rv@test.example", "password": "report-viewer-pw"})
    project = analyst.get("/api/projects").json()[0]
    site = analyst.get(f"/api/projects/{project['id']}/sites").json()[0]
    surfaces = {s["name"]: s for s in analyst.get(f"/api/sites/{site['id']}/surfaces").json()}
    return {"analyst": analyst, "viewer": viewer, "site": site, "surfaces": surfaces}


def _html(site_id, surface_id, languages=("en",), released_only=False):
    from app.db import new_session
    from app.models import Site, Surface
    from app.reports.report import build_report_html

    with new_session() as db:
        return build_report_html(db, db.get(Site, site_id), db.get(Surface, surface_id), languages, released_only)


def test_report_content_in_english_and_arabic(demo):
    survey = demo["surfaces"]["Survey 3"]
    html = _html(demo["site"]["id"], survey["id"], ("en", "ar"))
    assert html.count('<section class="report"') == 2
    assert 'lang="en" dir="ltr"' in html and 'lang="ar" dir="rtl"' in html
    # Volumes always carry their +/- range.
    analyses = demo["analyst"].get(f"/api/sites/{demo['site']['id']}/analyses").json()
    base_id = demo["surfaces"]["Baseline survey"]["id"]
    main = next(a for a in analyses if a["from_surface_id"] == base_id and a["to_surface_id"] == survey["id"])
    zone = main["results"]["zones"][0]
    assert f"{fmt_int(zone['fill_m3'])} ± {fmt_int(zone['fill_pm_m3'])}" in html
    for text in ("Earthworks progress report", "Change since the baseline (Baseline survey → Survey 3)",
                 "Change since the previous survey (Survey 2 → Survey 3)", "Remaining to design",
                 "Progress over time", "Data sources and processing", "1 July 2026",
                 "Uses NASA Ames Stereo Pipeline (Apache-2.0).", "65.0% ±",
                 "تقرير تقدّم أعمال الحفر والردم", "1 يوليو 2026", "نسبة الإنجاز", "المنهجية"):
        assert text in html, text
    assert html.count("data:image/png;base64,") == 4  # terrain and cut/fill maps, per language
    assert "<svg" in html and "DRAFT" not in html and "Demonstration resolution" not in html
    assert "synthetic-survey-3.tif" in html  # provenance: input file and hash


def test_baseline_report_has_no_volumes_and_draft_is_marked(demo):
    base = demo["surfaces"]["Baseline survey"]
    html = _html(demo["site"]["id"], base["id"])
    assert "This is the baseline survey of the site" in html and "Change since the baseline" not in html
    survey = demo["surfaces"]["Survey 2"]
    demo["analyst"].patch(f"/api/surfaces/{survey['id']}", json={"released": False})
    assert "DRAFT" in _html(demo["site"]["id"], survey["id"])


def test_pdf_endpoint_and_release_rules(demo):
    site_id, survey = demo["site"]["id"], demo["surfaces"]["Survey 4"]
    url = f"/api/sites/{site_id}/report.pdf?surface_id={survey['id']}"
    for lang in ("en", "ar", "both"):
        response = demo["viewer"].get(f"{url}&lang={lang}")
        assert response.status_code == 200 and response.headers["content-type"] == "application/pdf"
        assert response.content[:5] == b"%PDF-" and len(response.content) > 50_000
    assert demo["viewer"].get(f"{url}&lang=fr").status_code == 422
    # Withdrawn survey: the viewer can no longer get its report, the analyst gets a draft.
    demo["analyst"].patch(f"/api/surfaces/{survey['id']}", json={"released": False})
    assert demo["viewer"].get(url).status_code == 404
    assert demo["analyst"].get(url).status_code == 200
    design = demo["surfaces"]["Design surface"]
    assert demo["analyst"].get(f"/api/sites/{site_id}/report.pdf?surface_id={design['id']}").status_code == 404
    from fastapi.testclient import TestClient
    from app.main import app
    assert TestClient(app).get(url).status_code == 401


def test_withdrawn_design_hides_progress_from_viewer_report(demo):
    design, survey = demo["surfaces"]["Design surface"], demo["surfaces"]["Survey 3"]
    demo["analyst"].patch(f"/api/surfaces/{design['id']}", json={"released": False})
    html = _html(demo["site"]["id"], survey["id"], released_only=True)
    assert "Progress over time" not in html and "Remaining to design" not in html
    assert "No design surface is available" in html and "Change since the baseline" in html


def test_formatting_and_chart():
    assert fmt_int(-1234567.4) == "−1,234,567"
    assert fmt_progress(0.6504, 0.012) == "65.0% ± 1.2" and fmt_progress(None, None) is None
    zone = lambda p: [{"zone_id": "z", "progress": p, "progress_pm": 0.02}]
    epochs = [{"surface_id": "a", "survey_date": "2026-01-01", "zones": zone(0.0)},
              {"surface_id": "b", "survey_date": "2026-03-01", "zones": zone(1.3)}]
    svg = progress_chart_svg(epochs, "b")
    assert svg.startswith("<svg") and "2026-03-01" in svg and "140%" in svg  # axis grows past 100 %
    assert progress_chart_svg(epochs[:1]) is None

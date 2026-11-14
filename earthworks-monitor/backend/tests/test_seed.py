import pytest

from app.config import get_settings
from app.seed import DEMO_PROJECT, main


def test_seed_populates_demo_with_plausible_progress(anon, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "demo_analyst_email", "seed-analyst@test.example")
    monkeypatch.setattr(settings, "demo_analyst_password", "seed-analyst-pw")
    monkeypatch.setattr(settings, "demo_viewer_email", "seed-viewer@test.example")
    monkeypatch.setattr(settings, "demo_viewer_password", "seed-viewer-pw")
    main()
    main()  # idempotent

    # The viewer sees the released demo straight away.
    anon.post("/api/auth/login", json={"email": "seed-viewer@test.example", "password": "seed-viewer-pw"})
    (project,) = anon.get("/api/projects").json()
    assert project["name"] == DEMO_PROJECT
    (site,) = anon.get(f"/api/projects/{project['id']}/sites").json()
    surfaces = anon.get(f"/api/sites/{site['id']}/surfaces").json()
    assert len(surfaces) == 5 and all(s["status"] == "ready" for s in surfaces)
    offsets = sorted(round(s["vertical_offset_m"], 1) for s in surfaces if s["kind"] == "survey")
    assert offsets == [-0.3, 0.0, 0.4, 0.6]

    progress = anon.get(f"/api/sites/{site['id']}/progress").json()
    built = [[z["progress"] for z in e["zones"]] for e in progress["epochs"]]
    for epoch, expected in zip(built, (0.0, 0.3, 0.65, 0.9)):
        assert epoch == pytest.approx([expected, expected], abs=0.02)

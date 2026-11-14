"""Upload -> align -> analyse -> progress -> tiles, through the HTTP API (jobs run inline)."""
import io

import pytest
import rasterio
from pyproj import CRS
from shapely.geometry import shape

from app.geo.grid import WGS84, reproject_geometry
from app.geo.synthetic import Mound, write_synthetic_dem
from tests.conftest import SITE_SQUARE, ZONE_INSIDE

UTM = CRS.from_epsg(32638)
SITE_UTM = reproject_geometry(shape(SITE_SQUARE), WGS84, UTM)
ZONE_UTM = reproject_geometry(shape(ZONE_INSIDE), WGS84, UTM)
_b = SITE_UTM.bounds
BOUNDS = (round(_b[0]) - 120.0, round(_b[1]) - 120.0, round(_b[2]) + 120.0, round(_b[3]) + 120.0)
_z = ZONE_UTM.bounds
DESIGN_FILL = Mound(round(_z[0]) + 60.0, round(_z[1]) + 60.0, round(_z[2]) - 60.0, round(_z[3]) - 60.0, height=4.0, ramp=12.0)
NOISE = 0.04


def dem_bytes(tmp_path, **kwargs) -> bytes:
    path = str(tmp_path / "dem.tif")
    params = {"epsg": 32638, "bounds": BOUNDS, "resolution": 2.0}
    params.update(kwargs)
    write_synthetic_dem(path, **params)
    with open(path, "rb") as handle:
        return handle.read()


def upload(client, site_id, data: bytes, **fields):
    form = {"kind": "survey", "vertical_datum": "ellipsoidal_wgs84", "stated_accuracy_m": "0.05"} | fields
    return client.post(
        f"/api/sites/{site_id}/surfaces",
        data=form,
        files={"file": ("dem.tif", io.BytesIO(data), "image/tiff")},
    )


@pytest.fixture
def zone(analyst, site):
    body = {"name": "Zone A", "zone_type": "fill", "geometry": ZONE_INSIDE}
    return analyst.post(f"/api/sites/{site['id']}/zones", json=body).json()


@pytest.fixture
def populated(analyst, site, zone, tmp_path):
    """Baseline, a half-built epoch with a vertical offset, and the design surface."""
    sid = site["id"]
    base = upload(analyst, sid, dem_bytes(tmp_path, noise_sigma=NOISE, seed=1), name="Baseline", survey_date="2026-01-01")
    half = upload(
        analyst, sid,
        dem_bytes(tmp_path, mounds=(DESIGN_FILL.scaled(0.5),), noise_sigma=NOISE, seed=2, vertical_offset=-0.6),
        name="Epoch 2", survey_date="2026-03-01",
    )
    design = upload(analyst, sid, dem_bytes(tmp_path, mounds=(DESIGN_FILL,)), kind="design", name="Design")
    for response in (base, half, design):
        assert response.status_code == 201, response.text
    return {"site": sid, "zone": zone["id"], "base": base.json()["id"], "half": half.json()["id"], "design": design.json()["id"]}


def _analysis(client, ids, from_key, to_key):
    for a in client.get(f"/api/sites/{ids['site']}/analyses").json():
        if a["from_surface_id"] == ids[from_key] and a["to_surface_id"] == ids[to_key]:
            return a
    return None


def test_upload_pipeline_aligns_and_recovers_known_volume(analyst, populated):
    surfaces = {s["id"]: s for s in analyst.get(f"/api/sites/{populated['site']}/surfaces").json()}
    base, half, design = (surfaces[populated[k]] for k in ("base", "half", "design"))
    assert {s["status"] for s in surfaces.values()} == {"ready"}
    assert base["is_reference"] and base["alignment"]["method"] == "reference"
    assert half["vertical_offset_m"] == pytest.approx(-0.6, abs=0.01)
    assert half["alignment"]["residual_rmse_m"] == pytest.approx(NOISE * 2**0.5, rel=0.1)
    assert design["alignment"] is None and design["stated_accuracy_m"] is None
    assert half["stats"]["site_coverage"] == pytest.approx(1.0, abs=0.01)
    assert half["provenance"]["source"]["sha256"] and half["provenance"]["processing"]["software"]["gdal"]

    done = _analysis(analyst, populated, "base", "half")
    assert done["status"] == "ready" and not done["stale"]
    zone = done["results"]["zones"][0]
    truth = DESIGN_FILL.volume / 2
    assert zone["fill_m3"] == pytest.approx(truth, rel=0.02)
    assert abs(zone["fill_m3"] - truth) <= zone["fill_pm_m3"]
    assert 0 < zone["fill_pm_m3"] < 0.1 * truth
    assert zone["cut_m3"] < 0.01 * truth
    assert done["results"]["uncertainty"]["source"] == "stable_ground"
    assert done["results"]["lod_m"] == pytest.approx(1.96 * done["results"]["uncertainty"]["sigma_pixel_m"])
    inputs = done["provenance"]["inputs"]
    assert [i["role"] for i in inputs] == ["from", "to"] and inputs[1]["vertical_offset_applied_m"] == half["vertical_offset_m"]

    planned = _analysis(analyst, populated, "base", "design")
    assert planned["results"]["zones"][0]["fill_m3"] == pytest.approx(DESIGN_FILL.volume, rel=0.02)
    assert planned["results"]["uncertainty"]["source"] == "stated_accuracy"


def test_progress_is_achieved_over_design_per_zone(analyst, populated):
    progress = analyst.get(f"/api/sites/{populated['site']}/progress").json()
    assert progress["available"]
    baseline, epoch = progress["epochs"]
    assert baseline["is_reference"] and baseline["zones"][0]["progress"] == 0
    zone = epoch["zones"][0]
    assert zone["progress"] == pytest.approx(0.5, abs=0.02)
    assert 0 < zone["progress_pm"] < 0.1
    assert abs(zone["progress"] - 0.5) <= zone["progress_pm"]


def test_any_two_surfaces_can_be_compared_on_request(analyst, populated):
    body = {"from_surface_id": populated["half"], "to_surface_id": populated["design"]}
    response = analyst.post(f"/api/sites/{populated['site']}/analyses", json=body)
    assert response.status_code == 202
    remaining = response.json()
    assert remaining["results"]["uncertainty"]["source"] == "alignment_residual"
    assert remaining["results"]["zones"][0]["fill_m3"] == pytest.approx(DESIGN_FILL.volume / 2, rel=0.03)

    explicit = analyst.post(f"/api/sites/{populated['site']}/analyses", json=body | {"lod_m": 1.0}).json()
    assert explicit["id"] == remaining["id"] and explicit["results"]["lod_m"] == 1.0
    assert explicit["results"]["zones"][0]["fill_m3"] < remaining["results"]["zones"][0]["fill_m3"]

    same = {"from_surface_id": populated["half"], "to_surface_id": populated["half"]}
    assert "two different" in analyst.post(f"/api/sites/{populated['site']}/analyses", json=same).json()["detail"]


def test_editing_zones_marks_results_stale_until_recomputed(analyst, populated):
    assert analyst.patch(f"/api/zones/{populated['zone']}", json={"name": "Renamed"}).status_code == 200
    done = _analysis(analyst, populated, "base", "half")
    assert done["stale"]
    body = {"from_surface_id": populated["base"], "to_surface_id": populated["half"]}
    fresh = analyst.post(f"/api/sites/{populated['site']}/analyses", json=body).json()
    assert not fresh["stale"] and fresh["results"]["zones"][0]["name"] == "Renamed"


def test_viewers_see_only_released_results(analyst, viewer, populated, project):
    sid = populated["site"]
    viewer_id = viewer.get("/api/auth/me").json()["id"]
    analyst.put(f"/api/projects/{project['id']}/members", json={"user_ids": [viewer_id]})
    tile = f"/api/tiles/surfaces/{populated['half']}/hillshade/14/10330/7058.png"

    assert viewer.get(f"/api/sites/{sid}/surfaces").json() == []
    assert viewer.get(f"/api/sites/{sid}/analyses").json() == []
    assert viewer.get(f"/api/sites/{sid}/progress").json()["available"] is False
    assert viewer.get(f"/api/sites/{sid}/jobs").status_code == 403
    assert viewer.patch(f"/api/surfaces/{populated['half']}", json={"released": True}).status_code == 404

    from fastapi.testclient import TestClient
    from app.tiler import app as tiler_app
    tiles_viewer = TestClient(tiler_app, cookies=viewer.cookies)
    assert tiles_viewer.get(tile).status_code == 404

    for key in ("base", "half"):
        assert analyst.patch(f"/api/surfaces/{populated[key]}", json={"released": True}).status_code == 200
    assert {s["name"] for s in viewer.get(f"/api/sites/{sid}/surfaces").json()} == {"Baseline", "Epoch 2"}
    assert len(viewer.get(f"/api/sites/{sid}/analyses").json()) == 1  # design not released yet
    assert viewer.get(f"/api/sites/{sid}/progress").json()["available"] is False
    assert tiles_viewer.get(tile).status_code in (200, 204)

    analyst.patch(f"/api/surfaces/{populated['design']}", json={"released": True})
    assert viewer.get(f"/api/sites/{sid}/progress").json()["available"] is True
    assert viewer.post(f"/api/sites/{sid}/analyses", json={"from_surface_id": populated["base"], "to_surface_id": populated["half"]}).status_code == 403


def _tile_for(lon, lat, z):
    import math
    n = 2**z
    x = int((lon + 180.0) / 360.0 * n)
    y = int((1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n)
    return z, x, y


def test_tiles_render_hillshade_and_cut_fill(analyst, populated):
    from fastapi.testclient import TestClient
    from app.tiler import app as tiler_app
    tiles = TestClient(tiler_app, cookies=analyst.cookies)
    centre = shape(ZONE_INSIDE).centroid
    z, x, y = _tile_for(centre.x, centre.y, 16)

    hillshade = tiles.get(f"/api/tiles/surfaces/{populated['half']}/hillshade/{z}/{x}/{y}.png")
    assert hillshade.status_code == 200 and hillshade.headers["content-type"] == "image/png"
    with rasterio.open(io.BytesIO(hillshade.content)) as png:
        assert (png.width, png.height, png.count) == (256, 256, 4)
        assert png.read(4).min() == 255 and 100 < png.read(1).mean() < 220

    done = _analysis(analyst, populated, "base", "half")
    dod = tiles.get(f"/api/tiles/analyses/{done['id']}/dod/{z}/{x}/{y}.png")
    assert dod.status_code == 200
    with rasterio.open(io.BytesIO(dod.content)) as png:
        red, blue, alpha = png.read(1), png.read(3), png.read(4)
        filled = alpha > 0
        assert 0.05 < filled.mean() < 1.0  # only the mound is drawn; unchanged ground is transparent
        assert red[filled].mean() > blue[filled].mean() + 50  # fill is red

    far = tiles.get(f"/api/tiles/surfaces/{populated['half']}/hillshade/16/0/0.png")
    assert far.status_code == 204
    assert TestClient(tiler_app).get(f"/api/tiles/surfaces/{populated['half']}/hillshade/{z}/{x}/{y}.png").status_code == 401


def test_bad_uploads_are_rejected_immediately_with_reasons(analyst, site, tmp_path):
    sid = site["id"]
    common = {"name": "S", "survey_date": "2026-01-01"}
    cases = [
        (dem_bytes(tmp_path, with_crs=False), {}, "no coordinate reference system"),
        (dem_bytes(tmp_path, bounds=(300000, 2000000, 300400, 2000400)), {}, "does not overlap the site"),
        (b"not a tiff", {}, "could not be read"),
        (dem_bytes(tmp_path), {"stated_accuracy_m": ""}, "stated vertical accuracy"),
        (dem_bytes(tmp_path), {"survey_date": ""}, "survey date"),
    ]
    for data, overrides, message in cases:
        response = upload(analyst, sid, data, **(common | overrides))
        assert response.status_code == 422, response.text
        assert message in str(response.json()["detail"])
    assert upload(analyst, sid, dem_bytes(tmp_path), **common, vertical_datum="mars").status_code == 422
    assert analyst.get(f"/api/sites/{sid}/surfaces").json() == []


def test_mixed_vertical_datums_are_refused(analyst, populated, tmp_path):
    """A project datum cannot be converted, so it is refused against an ellipsoidal site."""
    response = upload(analyst, populated["site"], dem_bytes(tmp_path), name="Local", survey_date="2026-04-01", vertical_datum="local")
    assert response.status_code == 422 and "cannot be converted" in response.json()["detail"]


def test_second_design_and_baseline_deletion_are_guarded(analyst, populated, tmp_path):
    again = upload(analyst, populated["site"], dem_bytes(tmp_path), kind="design", name="Design 2")
    assert again.status_code == 422 and "already has a design" in again.json()["detail"]
    response = analyst.delete(f"/api/surfaces/{populated['base']}")
    assert response.status_code == 400 and "baseline" in response.json()["detail"]
    assert analyst.delete(f"/api/surfaces/{populated['half']}").status_code == 204
    assert _analysis(analyst, populated, "base", "half") is None
    assert analyst.delete(f"/api/surfaces/{populated['base']}").status_code == 204


def test_changing_the_baseline_realigns_and_recomputes(analyst, populated):
    sid = populated["site"]
    response = analyst.post(f"/api/sites/{sid}/reference", json={"surface_id": populated["half"]})
    assert response.status_code == 200
    surfaces = {s["id"]: s for s in response.json()}
    assert surfaces[populated["half"]]["is_reference"] and surfaces[populated["half"]]["vertical_offset_m"] == 0
    assert surfaces[populated["base"]]["vertical_offset_m"] == pytest.approx(0.6, abs=0.01)
    done = _analysis(analyst, populated, "base", "half")
    assert done["status"] == "ready" and not done["stale"]
    assert done["results"]["zones"][0]["fill_m3"] == pytest.approx(DESIGN_FILL.volume / 2, rel=0.02)
    assert _analysis(analyst, populated, "half", "design") is not None


def test_without_zones_uncertainty_still_comes_from_stable_ground(analyst, site, tmp_path):
    sid = site["id"]
    upload(analyst, sid, dem_bytes(tmp_path, noise_sigma=NOISE, seed=1), name="A", survey_date="2026-01-01")
    second = upload(analyst, sid, dem_bytes(tmp_path, noise_sigma=NOISE, seed=2), name="B", survey_date="2026-02-01").json()
    analysis = analyst.get(f"/api/sites/{sid}/analyses").json()[0]
    site_result = analysis["results"]["site"]
    assert second["alignment"]["method"] == "vertical_shift_median_stable_ground"
    # Nothing changed: almost everything is below the level of detection.
    assert site_result["below_lod_area_m2"] > 0.9 * site_result["region_area_m2"]
    assert analysis["results"]["zones"] == []


def test_failed_job_is_logged_and_can_be_retried(analyst, site, tmp_path, monkeypatch):
    from app.services import surfaces as surface_service

    def boom(*args, **kwargs):
        raise RuntimeError("disk on fire")

    monkeypatch.setattr(surface_service, "prepare_surface", boom)
    created = upload(analyst, site["id"], dem_bytes(tmp_path), name="A", survey_date="2026-01-01").json()
    assert created["status"] == "failed" and "Unexpected processing error" in created["error"]
    job = analyst.get(f"/api/sites/{site['id']}/jobs").json()[0]
    assert job["status"] == "failed" and job["attempts"] == 1
    assert "disk on fire" in analyst.get(f"/api/jobs/{job['id']}").json()["log"]

    monkeypatch.undo()
    retried = analyst.post(f"/api/jobs/{job['id']}/retry").json()
    assert retried["status"] == "done" and retried["attempts"] == 2
    assert analyst.get(f"/api/sites/{site['id']}/surfaces").json()[0]["status"] == "ready"
    assert analyst.post(f"/api/jobs/{job['id']}/retry").status_code == 400

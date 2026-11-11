import pytest

from tests.conftest import SITE_SQUARE, ZONE_INSIDE


def test_project_crud(analyst):
    created = analyst.post("/api/projects", json={"name": "Port", "client_name": "X"})
    assert created.status_code == 201
    pid = created.json()["id"]
    assert analyst.patch(f"/api/projects/{pid}", json={"name": "Port 2"}).json()["name"] == "Port 2"
    assert [p["name"] for p in analyst.get("/api/projects").json()] == ["Port 2"]
    assert analyst.delete(f"/api/projects/{pid}").status_code == 204
    assert analyst.get(f"/api/projects/{pid}").status_code == 404


def test_viewer_sees_only_member_projects_and_cannot_write(analyst, viewer, project, site):
    pid = project["id"]
    assert viewer.get("/api/projects").json() == []
    assert viewer.get(f"/api/projects/{pid}").status_code == 404
    assert viewer.get(f"/api/sites/{site['id']}").status_code == 404

    viewer_id = viewer.get("/api/auth/me").json()["id"]
    assert analyst.put(f"/api/projects/{pid}/members", json={"user_ids": [viewer_id]}).status_code == 200

    assert [p["id"] for p in viewer.get("/api/projects").json()] == [pid]
    assert viewer.get(f"/api/projects/{pid}/sites").json()[0]["name"] == "S1"
    assert viewer.post("/api/projects", json={"name": "nope"}).status_code == 403
    assert viewer.patch(f"/api/sites/{site['id']}", json={"name": "nope"}).status_code == 403
    assert viewer.delete(f"/api/projects/{pid}").status_code == 403
    assert viewer.post(f"/api/sites/{site['id']}/zones", json={"name": "z", "geometry": ZONE_INSIDE}).status_code == 403


def test_site_is_stored_with_metric_area(site):
    # 0.01 deg x 0.01 deg at 24.2 N is about 1.014 km x 1.108 km
    assert site["area_m2"] == pytest.approx(1.123e6, rel=0.01)
    assert site["geometry"]["type"] == "MultiPolygon"
    assert site["bbox"] == [46.90, 24.20, 46.91, 24.21]


@pytest.mark.parametrize(
    "geometry, fragment",
    [
        ({"type": "Point", "coordinates": [46.9, 24.2]}, "Only polygon"),
        ({"type": "Polygon", "coordinates": [[[500000, 2700000], [501000, 2700000], [501000, 2701000], [500000, 2700000]]]}, "projected coordinate system"),
        ({"type": "Polygon", "coordinates": []}, "empty"),
        ({"type": "Nonsense"}, "valid GeoJSON"),
    ],
)
def test_bad_site_geometry_gives_clear_error(analyst, project, geometry, fragment):
    response = analyst.post(f"/api/projects/{project['id']}/sites", json={"name": "bad", "geometry": geometry})
    assert response.status_code == 422
    assert fragment in response.json()["detail"]


def test_self_intersecting_outline_is_repaired(analyst, project):
    bowtie = {"type": "Polygon", "coordinates": [[[46.90, 24.20], [46.91, 24.21], [46.91, 24.20], [46.90, 24.21], [46.90, 24.20]]]}
    response = analyst.post(f"/api/projects/{project['id']}/sites", json={"name": "bowtie", "geometry": bowtie})
    assert response.status_code == 201
    assert len(response.json()["geometry"]["coordinates"]) == 2


def test_zone_crud_and_containment(analyst, site):
    sid = site["id"]
    created = analyst.post(f"/api/sites/{sid}/zones", json={"name": "Zone A", "zone_type": "fill", "geometry": ZONE_INSIDE})
    assert created.status_code == 201
    zone = created.json()
    assert 0 < zone["area_m2"] < site["area_m2"]
    assert analyst.get(f"/api/sites/{sid}").json()["zones"][0]["zone_type"] == "fill"

    outside = {"type": "Polygon", "coordinates": [[[46.905, 24.205], [46.92, 24.205], [46.92, 24.22], [46.905, 24.205]]]}
    response = analyst.post(f"/api/sites/{sid}/zones", json={"name": "out", "geometry": outside})
    assert response.status_code == 422 and "outside the boundary" in response.json()["detail"]
    assert analyst.patch(f"/api/zones/{zone['id']}", json={"geometry": outside}).status_code == 422
    assert analyst.post(f"/api/sites/{sid}/zones", json={"name": "bad", "zone_type": "tunnel", "geometry": ZONE_INSIDE}).status_code == 422

    # Shrinking the site so that it no longer contains the zone is refused.
    response = analyst.patch(f"/api/sites/{sid}", json={"geometry": outside})
    assert response.status_code == 422 and "Zone A" in response.json()["detail"]

    assert analyst.delete(f"/api/zones/{zone['id']}").status_code == 204
    assert analyst.get(f"/api/sites/{sid}").json()["zones"] == []


def test_deleting_project_cascades(analyst, project, site):
    analyst.post(f"/api/sites/{site['id']}/zones", json={"name": "Z", "geometry": ZONE_INSIDE})
    assert analyst.delete(f"/api/projects/{project['id']}").status_code == 204
    assert analyst.get(f"/api/sites/{site['id']}").status_code == 404


def test_public_config_exposes_no_secrets(anon):
    config = anon.get("/api/config").json()
    assert set(config) == {"app_name", "basemap_tile_url", "basemap_attribution", "max_upload_mb", "max_dem_upload_mb"}

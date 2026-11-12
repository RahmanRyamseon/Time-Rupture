"""The photogrammetry engine: command wrappers, API validation and, when Ames Stereo
Pipeline is installed (tests marked requires_asp), the real tools end to end."""
import io
from pathlib import Path

import numpy as np
import pytest
import rasterio
from pyproj import CRS
from rasterio.transform import from_origin
from shapely.geometry import box, mapping

from app.config import get_settings
from app.engines.asp.commands import (
    Aster2Asp,
    BundleAdjust,
    DemGeoid,
    ParallelStereo,
    PcAlign,
    Point2Dem,
    parse_pc_align_output,
)
from app.engines.asp.engine import AspEngine
from app.engines.base import EngineError, EngineUnavailable, StereoRequest
from app.geo.grid import WGS84, reproject_geometry
from app.geo.synthetic import Mound
from tests.conftest import requires_asp

EPSG = 32640
UTM = CRS.from_epsg(EPSG)


# ------------------------------------------------------------ command builders


def test_parallel_stereo_command_line():
    command = ParallelStereo(
        Path("l.tif"), Path("r.tif"), Path("l.xml"), Path("r.xml"), Path("out/run"), "rpc",
        bundle_adjust_prefix=Path("ba/run"), processes=2, threads=4,
    )
    assert command.argv() == [
        "parallel_stereo", "-t", "rpc", "--stereo-algorithm", "asp_mgm", "--subpixel-mode", "9",
        "--bundle-adjust-prefix", "ba/run", "--processes", "2",
        "--threads-multiprocess", "4", "--threads-singleprocess", "4",
        "l.tif", "r.tif", "l.xml", "r.xml", "out/run",
    ]
    assert command.point_cloud == Path("out/run-PC.tif")
    embedded = ParallelStereo(Path("l.tif"), Path("r.tif"), None, None, Path("o/run"), "rpc")
    assert embedded.argv()[-3:] == ["l.tif", "r.tif", "o/run"]
    with pytest.raises(ValueError, match="session type"):
        ParallelStereo(Path("l"), Path("r"), None, None, Path("o"), "isis").argv()
    with pytest.raises(ValueError, match="stereo algorithm"):
        ParallelStereo(Path("l"), Path("r"), None, None, Path("o"), "rpc", stereo_algorithm="magic").argv()


def test_point2dem_command_line_and_output_names():
    grid = Point2Dem(Path("st/run-PC.tif"), 32640, 15, error_image=True, orthoimage_texture=Path("st/run-L.tif"))
    assert grid.argv() == [
        "point2dem", "--t_srs", "EPSG:32640", "--tr", "15", "--errorimage", "--orthoimage",
        "st/run-PC.tif", "st/run-L.tif",
    ]
    assert (grid.dem, grid.orthoimage, grid.intersection_error) == (
        Path("st/run-DEM.tif"), Path("st/run-DRG.tif"), Path("st/run-IntersectionErr.tif"),
    )
    assert Point2Dem(Path("al/run-trans_source.tif"), 32640).dem == Path("al/run-trans_source-DEM.tif")
    assert Point2Dem(Path("a.tif"), 32640, output_prefix=Path("x/y")).dem == Path("x/y-DEM.tif")


def test_pc_align_estimate_and_apply_command_lines():
    estimate = PcAlign(Path("ref.tif"), Path("src.tif"), Path("e/run"), 50, compute_translation_only=True)
    assert estimate.argv() == [
        "pc_align", "--max-displacement", "50", "--alignment-method", "nuth",
        "--compute-translation-only", "ref.tif", "src.tif", "-o", "e/run",
    ]
    apply = PcAlign(
        Path("ref.tif"), Path("src.tif"), Path("a/run"), -1, alignment_method="point-to-plane",
        initial_transform=estimate.transform, num_iterations=0, save_transformed_source_points=True,
    )
    assert apply.argv() == [
        "pc_align", "--max-displacement", "-1", "--alignment-method", "point-to-plane",
        "--initial-transform", "e/run-transform.txt", "--num-iterations", "0",
        "--save-transformed-source-points", "ref.tif", "src.tif", "-o", "a/run",
    ]
    assert apply.transformed_source == Path("a/run-trans_source.tif")
    with pytest.raises(ValueError, match="alignment method"):
        PcAlign(Path("a"), Path("b"), Path("c"), 1, alignment_method="guess").argv()


def test_other_command_lines():
    assert Aster2Asp(Path("scene.hdf"), Path("a/scene")).argv() == ["aster2asp", "scene.hdf", "-o", "a/scene"]
    assert Aster2Asp(Path("s.hdf"), Path("a/s")).outputs()["right_camera"] == Path("a/s-Band3B.xml")
    assert BundleAdjust(Path("l.tif"), Path("r.tif"), Path("l.xml"), Path("r.xml"), Path("ba/run"), "aster").argv() == [
        "bundle_adjust", "-t", "aster", "l.tif", "r.tif", "l.xml", "r.xml", "-o", "ba/run",
    ]
    to_ellipsoid = DemGeoid(Path("dem.tif"), "EGM2008", Path("d/out"), reverse=True)
    assert to_ellipsoid.argv() == ["dem_geoid", "dem.tif", "--geoid", "EGM2008", "--reverse-adjustment", "-o", "d/out"]
    assert to_ellipsoid.adjusted == Path("d/out-adj.tif")
    with pytest.raises(ValueError, match="geoid"):
        DemGeoid(Path("dem.tif"), "NAVD88", Path("o")).argv()


# Captured from pc_align 3.7.0 aligning a DEM displaced by 40 m east, 20 m south, 7 m up.
PC_ALIGN_OUTPUT = """
Input: error percentile of smallest errors (meters): 16%: 5.13214, 50%: 7.13346, 84%: 11.2598
Input stats (meters): Mean: 8.80073, StdDev: 6.24672, RMSE: 10.7923, Median: 7.13346, NMAD: 2.29253
Output: error percentile of smallest errors (meters): 16%: 0.367021, 50%: 1.30757, 84%: 4.53147
Output stats (meters): Mean: 2.55043, StdDev: 3.58763, RMSE: 4.40179, Median: 1.30757, NMAD: 1.31289
Translation vector (Cartesian, meters): Vector3(24.508151,-35.821924,18.116171)
Translation vector (North-East-Down, meters): Vector3(22.997855,-40.413286,7.0654322)
Translation vector magnitude (meters): 47.032493
Transform scale - 1 = -1.110223e-16
"""


def test_pc_align_output_is_parsed():
    report = parse_pc_align_output(PC_ALIGN_OUTPUT)
    assert (report.north_m, report.east_m, report.down_m) == (22.997855, -40.413286, 7.0654322)
    assert report.magnitude_m == 47.032493
    assert report.input_stats["rmse_m"] == 10.7923 and report.output_stats["nmad_m"] == 1.31289
    with pytest.raises(ValueError, match="alignment summary"):
        parse_pc_align_output("ERROR: something went wrong")


def test_missing_asp_is_reported_clearly(tmp_path):
    engine = AspEngine(str(tmp_path / "no-asp-here"))
    with pytest.raises(EngineUnavailable, match="worker image"):
        engine.version()
    request = StereoRequest("sonar", {}, tmp_path, EPSG)
    with pytest.raises(EngineError, match="Unsupported camera model 'sonar'"):
        engine.build_dem(request, lambda _: None)


# ----------------------------------------------------------------- API checks


def _stereo(client, site_id, files, **fields):
    form = {"name": "Stereo", "survey_date": "2026-05-01", "stated_accuracy_m": "2.5", "camera_model": "rpc"} | fields
    return client.post(
        f"/api/sites/{site_id}/stereo-surveys",
        data=form,
        files={role: (name, io.BytesIO(data), "application/octet-stream") for role, (name, data) in files.items()},
    )


def test_stereo_upload_validation(analyst, viewer, site):
    sid = site["id"]
    image = ("a.tif", b"x")
    cases = [
        ({"left_image": image, "right_image": image}, {"camera_model": "kh9"}, "Unsupported camera model 'kh9'"),
        ({"left_image": image}, {}, "both a left and a right image"),
        ({"left_image": image, "right_image": image, "left_camera": ("l.xml", b"x")}, {}, "both images, or for neither"),
        ({"left_image": image, "right_image": image}, {"camera_model": "aster"}, "exactly one file"),
        ({"scene": ("s.hdf", b"x")}, {"camera_model": "rpc"}, "both a left and a right image"),
    ]
    for files, fields, message in cases:
        response = _stereo(analyst, sid, files, **fields)
        assert response.status_code == 422 and message in response.json()["detail"], response.text
    assert analyst.get(f"/api/sites/{sid}/surfaces").json() == []
    assert _stereo(viewer, sid, {"left_image": image, "right_image": image}).status_code in (403, 404)
    config = analyst.get("/api/config").json()
    assert "aster" in config["camera_models"] and config["single_file_camera_models"] == ["aster"]


def test_stereo_job_fails_with_reason_when_engine_is_missing(analyst, site, monkeypatch, tmp_path):
    from app.engines import registry

    monkeypatch.setattr(get_settings(), "asp_prefix", str(tmp_path / "missing"))
    registry.get_engine.cache_clear()
    try:
        image = ("a.tif", b"not really an image")
        created = _stereo(analyst, site["id"], {"left_image": image, "right_image": image}).json()
        assert created["status"] == "failed" and "worker image" in created["error"]
        assert created["provenance"]["source"]["files"][0]["sha256"]
        job = analyst.get(f"/api/sites/{site['id']}/jobs").json()[0]
        assert job["kind"] == "stereo_surface" and job["status"] == "failed"
    finally:
        registry.get_engine.cache_clear()


# ------------------------------------------------------------- real ASP tools


def _rugged(path, bounds, resolution, shift=(0.0, 0.0, 0.0), pit: Mound | None = None):
    """Terrain with relief at many scales, optionally displaced and with a pit cut in."""
    xmin, ymin, xmax, ymax = bounds
    width, height = int((xmax - xmin) / resolution), int((ymax - ymin) / resolution)
    x = xmin + (np.arange(width) + 0.5) * resolution - shift[0]
    y = ymax - (np.arange(height) + 0.5) * resolution - shift[1]
    xx, yy = np.meshgrid(x, y)
    z = (
        400.0 + 120.0 * np.sin(xx / 900.0) * np.cos(yy / 700.0)
        + 40.0 * np.sin(xx / 260.0 + yy / 310.0) + 12.0 * np.cos(xx / 90.0) * np.sin(yy / 110.0)
    )
    if pit is not None:
        z = z + pit.heights(xx, yy)
    profile = dict(driver="GTiff", dtype="float32", count=1, width=width, height=height,
                   crs=f"EPSG:{EPSG}", transform=from_origin(xmin, ymax, resolution, resolution), nodata=-9999.0)
    with rasterio.open(path, "w", **profile) as dst:
        dst.write((z + shift[2]).astype("float32"), 1)


def _site(client, project, utm_box, name="ASP site"):
    geometry = mapping(reproject_geometry(utm_box, UTM, WGS84))
    response = client.post(f"/api/projects/{project['id']}/sites", json={"name": name, "geometry": geometry})
    assert response.status_code == 201, response.text
    return response.json()


def _upload_dem(client, site_id, path, **fields):
    form = {"kind": "survey", "stated_accuracy_m": "1.0"} | fields
    with open(path, "rb") as handle:
        return client.post(f"/api/sites/{site_id}/surfaces", data=form, files={"file": ("dem.tif", handle, "image/tiff")})


@requires_asp
def test_asp_smoke():
    from app.engines.asp.smoke import run

    result = run(out=lambda _: None)
    assert result["version"].startswith("3.7.0")


@requires_asp
def test_upload_with_other_height_reference_and_3d_shift_is_converted_and_aligned(
    analyst, project, tmp_path, monkeypatch
):
    """Baseline in EGM2008; second survey ellipsoidal and displaced in 3-D by a known amount."""
    monkeypatch.setattr(get_settings(), "alignment_method_upload", "pc_align")
    site_box = box(371000, 2661000, 373000, 2663000)
    bounds = (370500.0, 2660500.0, 373500.0, 2663500.0)
    site = _site(analyst, project, site_box)
    _rugged(tmp_path / "base.tif", bounds, 5.0)
    _rugged(tmp_path / "moved.tif", bounds, 5.0, shift=(11.0, -7.0, 2.0))

    base = _upload_dem(analyst, site["id"], tmp_path / "base.tif", name="Base", survey_date="2026-01-01", vertical_datum="egm2008")
    assert base.status_code == 201, base.text
    moved = _upload_dem(analyst, site["id"], tmp_path / "moved.tif", name="Moved", survey_date="2026-02-01", vertical_datum="ellipsoidal_wgs84").json()
    assert moved["status"] == "ready", moved["error"]

    # Declared ellipsoidal, converted to the site's EGM2008: the geoid here is about -32 m,
    # so ellipsoidal values read as geoid heights come out about 32 m higher.
    assert moved["vertical_datum"] == "egm2008"
    assert moved["provenance"]["datum_conversion"]["from"] == "ellipsoidal_wgs84"
    three_d = moved["alignment"]["pc_align"]
    assert three_d["accepted"] and three_d["engine_version"].startswith("3.7.0")
    assert three_d["translation_east_m"] == pytest.approx(-11.0, abs=0.6)
    assert three_d["translation_north_m"] == pytest.approx(7.0, abs=0.6)
    assert three_d["translation_up_m"] == pytest.approx(-2.0 - 32.3, abs=1.0)
    assert three_d["stable_ground_after"]["nmad_m"] < 0.2 * three_d["stable_ground_before"]["nmad_m"]
    assert moved["alignment"]["residual_rmse_m"] < 0.5 and abs(moved["vertical_offset_m"]) < 0.3
    assert any(cmd[0] == "pc_align" for cmd in three_d["commands"])

    analysis = analyst.get(f"/api/sites/{site['id']}/analyses").json()[0]
    result = analysis["results"]["site"]
    assert result["below_lod_area_m2"] > 0.9 * result["region_area_m2"]  # nothing really changed


@requires_asp
def test_stereo_pair_becomes_an_aligned_survey_with_known_cut_volume(analyst, project, tmp_path):
    """sat_sim renders a stereo pair of terrain with a pit; the stereo path must find it."""
    from app.demo import simulate_stereo_pair

    wide = (340000.0, 2656000.0, 400000.0, 2668000.0)  # the simulated views need room
    site_box = box(371000, 2660500, 374000, 2663500)
    pit = Mound(371800, 2661300, 372200, 2661600, height=-30.0, ramp=40.0)
    site = _site(analyst, project, site_box)
    zone = mapping(reproject_geometry(box(371700, 2661200, 372300, 2661700), UTM, WGS84))
    assert analyst.post(f"/api/sites/{site['id']}/zones", json={"name": "Pit", "zone_type": "cut", "geometry": zone}).status_code == 201

    _rugged(tmp_path / "terrain.tif", wide, 30.0)
    assert _upload_dem(analyst, site["id"], tmp_path / "terrain.tif", name="Reference", survey_date="2026-01-01",
                       vertical_datum="ellipsoidal_wgs84", stated_accuracy_m="2.5").status_code == 201
    pair = simulate_stereo_pair(tmp_path / "terrain.tif", site_box, EPSG, tmp_path / "sim", pit, log=lambda _: None)

    files = {role: (path.name, path.read_bytes()) for role, path in pair.items()}
    survey = _stereo(analyst, site["id"], files, camera_model="nadirpinhole", resolution_m="20").json()
    assert survey["status"] == "ready", survey["error"]
    assert survey["source_type"] == "stereo" and survey["resolution_m"] == 20.0
    assert survey["has_orthoimage"] and survey["demo_resolution"]
    engine = survey["provenance"]["engine"]
    assert engine["version"].startswith("3.7.0") and engine["intersection_error"]["median_m"] < 5
    assert [cmd[0] for cmd in engine["commands"]] == ["parallel_stereo", "point2dem"]
    assert survey["alignment"]["residual_rmse_m"] < 6.0

    analysis = analyst.get(f"/api/sites/{site['id']}/analyses").json()[0]
    cut = analysis["results"]["zones"][0]
    assert cut["cut_m3"] == pytest.approx(pit.volume, rel=0.25)
    assert abs(cut["cut_m3"] - pit.volume) <= cut["cut_pm_m3"]

    from fastapi.testclient import TestClient
    from app.tiler import app as tiler_app
    import math
    centre = reproject_geometry(site_box, UTM, WGS84).centroid
    n = 2**13
    x = int((centre.x + 180.0) / 360.0 * n)
    y = int((1.0 - math.asinh(math.tan(math.radians(centre.y))) / math.pi) / 2.0 * n)
    tile = TestClient(tiler_app, cookies=analyst.cookies).get(f"/api/tiles/surfaces/{survey['id']}/ortho/13/{x}/{y}.png")
    assert tile.status_code == 200 and tile.headers["content-type"] == "image/png"

"""Real-data demonstration of the satellite-stereo path.

Run inside the worker container (it needs Ames Stereo Pipeline):

    python -m app.demo --scene /demo/AST_L1A_....hdf --date 2023-05-14
    python -m app.demo --simulate

Creates a demo project over an arid site with relief (default: Jebel Hafeet, on the
UAE / Oman border), loads the Copernicus GLO-30 DEM as the reference surface, then
builds a second survey with ASP from either

* an ASTER Level 1A scene you downloaded from NASA Earthdata (free account), or
* `--simulate`: a stereo pair rendered by ASP's `sat_sim` from the reference terrain,
  with a quarry of known volume cut into it. No external imagery is needed, and the
  result can be checked against the known answer. The imagery is synthetic.

Both are at 10-30 m resolution: a demonstration of the pipeline, not of the accuracy
achievable with sub-metre customer data.
"""
from __future__ import annotations

import argparse
import math
import shutil
import tempfile
import urllib.request
from datetime import date
from pathlib import Path

import numpy as np
import rasterio
from geoalchemy2.shape import from_shape
from pyproj import CRS, Transformer
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject
from shapely.geometry import MultiPolygon, box
from sqlalchemy import select

from app.config import get_settings
from app.db import new_session
from app.engines.asp.commands import SatSim
from app.engines.registry import get_engine
from app.geo.grid import WGS84, reproject_geometry, utm_epsg_for
from app.geo.synthetic import Mound
from app.jobs.runner import dispatch
from app.models import ROLE_ANALYST, Analysis, Project, Site, Surface, User, Zone
from app.services.stereo import register_stereo_survey
from app.services.surfaces import register_surface

PROJECT_NAME = "Demo – satellite stereo (Jebel Hafeet)"
GLO30_URL = (
    "https://copernicus-dem-30m.s3.amazonaws.com/"
    "Copernicus_DSM_COG_10_{ns}{lat:02d}_00_{ew}{lon:03d}_00_DEM/"
    "Copernicus_DSM_COG_10_{ns}{lat:02d}_00_{ew}{lon:03d}_00_DEM.tif"
)
# Copernicus GLO-30: absolute vertical accuracy better than 4 m (90 % linear error),
# i.e. roughly 2.5 m RMSE. ASTER stereo DEMs are typically around 10 m RMSE.
GLO30_ACCURACY_M = 2.5
ASTER_ACCURACY_M = 10.0
SIMULATED_ACCURACY_M = 2.5
# Simulated quarry: 400 m x 300 m, 25 m deep, sides ramping over 40 m.
QUARRY = {"width": 400.0, "height": 300.0, "depth": 25.0, "ramp": 40.0}


def glo30_tile_url(lon: float, lat: float) -> str:
    lat0, lon0 = math.floor(lat), math.floor(lon)
    return GLO30_URL.format(
        ns="N" if lat0 >= 0 else "S", lat=abs(lat0), ew="E" if lon0 >= 0 else "W", lon=abs(lon0)
    )


def fetch_reference(lon: float, lat: float, target: Path) -> Path:
    url = glo30_tile_url(lon, lat)
    print(f"Downloading Copernicus GLO-30 tile: {url}")
    with urllib.request.urlopen(url, timeout=300) as response, open(target, "wb") as out:
        shutil.copyfileobj(response, out)
    return target


def quarry_for(site_utm) -> Mound:
    """A pit in the south-west quarter of the site."""
    xmin, ymin, xmax, ymax = site_utm.bounds
    x0 = round(xmin + 0.25 * (xmax - xmin) - QUARRY["width"] / 2)
    y0 = round(ymin + 0.30 * (ymax - ymin) - QUARRY["height"] / 2)
    return Mound(x0, y0, x0 + QUARRY["width"], y0 + QUARRY["height"], -QUARRY["depth"], QUARRY["ramp"])


def simulate_stereo_pair(
    reference_ellipsoidal: Path,
    site_utm,
    epsg: int,
    work: Path,
    pit: Mound | None,
    log=print,
    gsd_m: float = 10.0,
    margin_m: float = 1500.0,
) -> dict[str, Path]:
    """Render a convergent stereo pair of the site with ASP sat_sim.

    The terrain is `reference_ellipsoidal` (heights above the WGS84 ellipsoid), with
    `pit` cut into it. Returns the files by role (images and .tsai pinhole cameras).
    """
    engine = get_engine()
    work.mkdir(parents=True, exist_ok=True)
    crs_wkt = CRS.from_epsg(epsg).to_wkt()

    # Terrain on the UTM grid for the whole reference raster: the simulated satellite
    # positions have to lie inside this DEM.
    with rasterio.open(reference_ellipsoidal) as src:
        from rasterio.warp import calculate_default_transform

        transform, width, height = calculate_default_transform(
            src.crs, crs_wkt, src.width, src.height, *src.bounds
        )
        res = float(transform.a)
        terrain = np.full((height, width), -9999.0, dtype="float32")
        reproject(
            rasterio.band(src, 1), terrain, dst_transform=transform, dst_crs=crs_wkt,
            dst_nodata=-9999.0, resampling=Resampling.bilinear,
        )
    if pit is not None:
        cols, rows = np.meshgrid(np.arange(width), np.arange(height))
        x = transform.c + (cols + 0.5) * res
        y = transform.f - (rows + 0.5) * res
        terrain = np.where(terrain > -9000, terrain + pit.heights(x, y).astype("float32"), terrain)
    dem_path = work / "terrain.tif"
    profile = dict(driver="GTiff", dtype="float32", count=1, width=width, height=height,
                   crs=crs_wkt, transform=transform, nodata=-9999.0, tiled=True, compress="DEFLATE")
    with rasterio.open(dem_path, "w", **profile) as dst:
        dst.write(terrain, 1)

    # Image texture over the site: shaded relief plus multi-scale random texture, so the
    # stereo correlator has detail to match (bare synthetic terrain has none).
    xmin, ymin, xmax, ymax = site_utm.buffer(margin_m).bounds
    left, top = math.floor(xmin / gsd_m) * gsd_m, math.ceil(ymax / gsd_m) * gsd_m
    n_cols, n_rows = math.ceil((xmax - left) / gsd_m), math.ceil((top - ymin) / gsd_m)
    ortho_transform = from_origin(left, top, gsd_m, gsd_m)
    fine = np.zeros((n_rows, n_cols), dtype="float32")
    reproject(terrain, fine, src_transform=transform, src_crs=crs_wkt, src_nodata=-9999.0,
              dst_transform=ortho_transform, dst_crs=crs_wkt, resampling=Resampling.cubic)
    d_row, d_col = np.gradient(fine, gsd_m)
    shade = np.clip(0.5 + 2.0 * (d_col + d_row), 0.0, 1.0)
    rng = np.random.default_rng(7)
    texture = np.zeros_like(fine)
    for scale, weight in ((1, 0.25), (3, 0.3), (9, 0.3), (27, 0.2)):
        coarse = rng.random((n_rows // scale + 2, n_cols // scale + 2)).astype("float32")
        texture += weight * np.kron(coarse, np.ones((scale, scale), "float32"))[:n_rows, :n_cols]
    image = (600.0 * (0.6 * shade + 0.4 * texture / texture.max()) + 100.0).astype("float32")
    # A numeric no-data value matters: with none declared sat_sim marks missing pixels
    # as NaN, and ASP then finds no interest points in the images.
    ortho_path = work / "texture.tif"
    with rasterio.open(ortho_path, "w", **(profile | dict(width=n_cols, height=n_rows, transform=ortho_transform, nodata=-9999.0))) as dst:
        dst.write(image, 1)

    # Two views converging on the site centre from 100 km up, one from the west and one
    # from the east (base-to-height ratio about 0.5), at ~10 m ground sample distance.
    centre = site_utm.centroid
    col = int((centre.x - transform.c) / res)
    row = int((transform.f - centre.y) / res)
    altitude = 100_000.0
    west = max(5, col - int(30_000 / res))
    east = min(width - 6, col + int(20_000 / res))
    if east - west < 20_000 / res:
        raise SystemExit("The reference raster is too narrow to place two simulated views.")
    size = int(max(n_cols, n_rows) * 1.05)
    command = SatSim(
        dem=dem_path, ortho=ortho_path, output_prefix=work / "sim" / "view",
        first=(west, row, altitude), last=(east, row, altitude), ground_position=(col, row),
        focal_length_px=altitude / gsd_m, image_size=(size, size),
    )
    log("Rendering a simulated stereo pair with ASP sat_sim")
    engine.tools.run(command.argv(), lambda _: None, cwd=work)
    return command.outputs()


def main() -> None:
    parser = argparse.ArgumentParser(prog="app.demo", description=__doc__.split("\n\n")[0])
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--scene", type=Path, help="ASTER Level 1A scene (.hdf) from NASA Earthdata")
    source.add_argument("--simulate", action="store_true", help="render a synthetic stereo pair with ASP sat_sim")
    parser.add_argument("--date", type=date.fromisoformat, default=date.today(), help="acquisition date of the scene (YYYY-MM-DD)")
    parser.add_argument("--reference", type=Path, help="reference DEM GeoTIFF with EGM2008 heights (default: download Copernicus GLO-30)")
    parser.add_argument("--lon", type=float, default=55.77)
    parser.add_argument("--lat", type=float, default=24.07)
    parser.add_argument("--size-km", type=float, default=6.0, help="side of the square site")
    args = parser.parse_args()
    if args.scene and not args.scene.exists():
        raise SystemExit(f"Scene file not found: {args.scene}")

    engine = get_engine()
    print(f"Engine: {engine.name} {engine.version()}")
    epsg = utm_epsg_for(args.lon, args.lat)
    utm = CRS.from_epsg(epsg)
    x, y = Transformer.from_crs(4326, epsg, always_xy=True).transform(args.lon, args.lat)
    half = args.size_km * 500.0
    site_utm = box(round(x - half), round(y - half), round(x + half), round(y + half))
    site_wgs84 = reproject_geometry(site_utm, utm, WGS84)
    pit = quarry_for(site_utm) if args.simulate else None

    with new_session() as db, tempfile.TemporaryDirectory(dir=get_settings().data_dir) as tmp:
        tmp_dir = Path(tmp)
        if db.scalar(select(Project).where(Project.name == PROJECT_NAME)):
            raise SystemExit(f"'{PROJECT_NAME}' already exists; delete it in the UI to run the demo again.")
        reference = tmp_dir / "reference.tif"
        if args.reference:
            shutil.copyfile(args.reference, reference)
        else:
            fetch_reference(args.lon, args.lat, reference)

        owner = db.scalar(select(User).where(User.role == ROLE_ANALYST).order_by(User.created_at))
        owner_id = owner.id if owner else None
        project = Project(
            name=PROJECT_NAME,
            client_name="Demonstration",
            description="Satellite-stereo pipeline demonstration at 10-30 m resolution. "
            "Not representative of the accuracy of sub-metre customer data.",
            created_by=owner_id,
        )
        site = Site(name="Jebel Hafeet test area", geom=from_shape(MultiPolygon([site_wgs84]), srid=4326))
        zone_utm = _zone_outline(pit or quarry_for(site_utm))
        site.zones = [
            Zone(
                name="Zone A – quarry (simulated)" if pit else "Zone A – sample area",
                zone_type="cut",
                geom=from_shape(MultiPolygon([reproject_geometry(zone_utm, utm, WGS84)]), srid=4326),
            )
        ]
        project.sites = [site]
        db.add(project)
        db.commit()

        simulated_inputs = None
        if args.simulate:
            # Rendered before the reference file is handed over to storage below.
            ellipsoidal = engine.convert_vertical_datum(
                reference, "egm2008", "ellipsoidal_wgs84", tmp_dir / "datum", lambda _: None
            )
            simulated_inputs = simulate_stereo_pair(ellipsoidal, site_utm, epsg, tmp_dir / "simulate", pit)

        print("Loading the reference DEM as the baseline survey")
        _, job = register_surface(
            db, site, src_path=str(reference), filename="Copernicus_GLO-30.tif", kind="survey",
            name="Copernicus GLO-30 (reference)", survey_date=date(2013, 1, 1),
            vertical_datum="egm2008", stated_accuracy_m=GLO30_ACCURACY_M, user_id=owner_id, released=True,
        )
        dispatch(db, [job], eager=True)

        if simulated_inputs is not None:
            files = {role: (str(path), path.name) for role, path in simulated_inputs.items()}
            name, camera, accuracy = "Simulated stereo survey (ASP sat_sim)", "nadirpinhole", SIMULATED_ACCURACY_M
        else:
            copy = tmp_dir / args.scene.name
            shutil.copyfile(args.scene, copy)
            files = {"scene": (str(copy), args.scene.name)}
            name, camera, accuracy = f"ASTER L1A {args.date.isoformat()}", "aster", ASTER_ACCURACY_M
        print(f"Building '{name}' with ASP (this takes a few minutes)")
        surface, job = register_stereo_survey(
            db, site, files=files, camera_model=camera, name=name, survey_date=args.date,
            stated_accuracy_m=accuracy, bundle_adjust=False,
            # 10 m simulated imagery: grid at twice the pixel size. ASTER: let ASP choose.
            resolution_m=20.0 if args.simulate else None, user_id=owner_id, released=True,
        )
        surface_id, site_id = surface.id, site.id
        dispatch(db, [job], eager=True)

        surface = db.get(Surface, surface_id)
        if surface.status != "ready":
            raise SystemExit(f"Stereo survey failed: {surface.error}")
        moved = (surface.alignment or {}).get("pc_align") or {}
        print(f"DEM at {surface.resolution_m:.1f} m; alignment residual RMSE "
              f"{surface.alignment.get('residual_rmse_m', float('nan')):.2f} m; "
              f"3-D alignment accepted: {moved.get('accepted')}")
        analysis = db.scalar(select(Analysis).where(Analysis.site_id == site_id, Analysis.to_surface_id == surface_id))
        if analysis is not None and analysis.results:
            for zone in analysis.results["zones"]:
                print(f"{zone['name']}: cut {zone['cut_m3']:,.0f} ± {zone['cut_pm_m3']:,.0f} m³"
                      + (f" (known volume removed: {pit.volume:,.0f} m³)" if pit else ""))
        print("Done. Open the project in the dashboard.")


def _zone_outline(pit: Mound):
    return box(pit.xmin - 60, pit.ymin - 60, pit.xmax + 60, pit.ymax + 60)


if __name__ == "__main__":
    main()

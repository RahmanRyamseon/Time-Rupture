"""Smoke test: is Ames Stereo Pipeline installed and able to run in this container?

    python -m app.engines.asp.smoke

Checks that every tool this product calls starts and reports the pinned version, then
exercises the tools that need no imagery on a small synthetic terrain: a DEM is shifted
by a known amount and pc_align must recover that shift, point2dem must grid the result,
and dem_geoid must apply a plausible geoid height. Exits non-zero on any failure.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin

from app.config import get_settings
from app.engines.asp.engine import AspEngine
from app.engines.base import AlignmentRequest

TOOLS = (
    "aster2asp",
    "bundle_adjust",
    "parallel_stereo",
    "point2dem",
    "pc_align",
    "dem_geoid",
)
SHIFT_EAST_M, SHIFT_NORTH_M, SHIFT_UP_M = 12.0, -8.0, 3.0
EPSG = 32640  # UTM 40N (UAE / Oman)


def _terrain(path: Path, shift=(0.0, 0.0, 0.0), resolution=5.0) -> None:
    """Rugged terrain (so a horizontal shift is observable), 2 km x 2 km."""
    size = int(2000 / resolution)
    x = 370000.0 + (np.arange(size) + 0.5) * resolution - shift[0]
    y = 2664000.0 - (np.arange(size) + 0.5) * resolution - shift[1]
    xx, yy = np.meshgrid(x, y)
    z = (
        300.0
        + 60.0 * np.sin(xx / 170.0) * np.cos(yy / 230.0)
        + 25.0 * np.sin(xx / 61.0 + yy / 83.0)
        + 8.0 * np.cos(xx / 23.0) * np.sin(yy / 31.0)
        + shift[2]
    )
    profile = dict(driver="GTiff", dtype="float32", count=1, width=size, height=size,
                   crs=f"EPSG:{EPSG}", transform=from_origin(370000.0, 2664000.0, resolution, resolution),
                   nodata=-9999.0)
    with rasterio.open(path, "w", **profile) as dst:
        dst.write(z.astype("float32"), 1)


def run(prefix: str | None = None, out=print) -> dict:
    settings = get_settings()
    engine = AspEngine(prefix or settings.asp_prefix, threads=settings.asp_threads)
    version = engine.version()
    out(f"Ames Stereo Pipeline {version} at {engine.tools.prefix}")
    for tool in TOOLS:
        result = subprocess.run(
            [engine.tools.tool(tool), "--version"],
            env=engine.tools.environment(), capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            raise SystemExit(f"FAIL {tool} --version: {(result.stdout + result.stderr)[-400:]}")
        out(f"  ok  {tool}")

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        _terrain(work / "reference.tif")
        _terrain(work / "source.tif", shift=(SHIFT_EAST_M, SHIFT_NORTH_M, SHIFT_UP_M))
        aligned = engine.align_dem(
            AlignmentRequest(
                reference_dem=work / "reference.tif",
                source_dem=work / "source.tif",
                source_stable_dem=work / "source.tif",
                workdir=work / "align",
                target_epsg=EPSG,
                resolution_m=5.0,
                max_displacement_m=60.0,
            ),
            lambda _: None,
        )
        # The source was displaced by +shift, so alignment must move it by -shift.
        found = (aligned.translation_east_m, aligned.translation_north_m, aligned.translation_up_m)
        wanted = (-SHIFT_EAST_M, -SHIFT_NORTH_M, -SHIFT_UP_M)
        if max(abs(f - w) for f, w in zip(found, wanted)) > 0.5:
            raise SystemExit(f"FAIL pc_align: moved {found}, expected about {wanted}")
        with rasterio.open(aligned.aligned_dem) as dem, rasterio.open(work / "reference.tif") as ref:
            point = [(371000.0, 2663000.0)]
            residual = float(next(dem.sample(point))[0] - next(ref.sample(point))[0])
        if abs(residual) > 1.0:
            raise SystemExit(f"FAIL point2dem: aligned DEM differs from reference by {residual:.2f} m")
        out(f"  ok  pc_align recovered a known 3-D shift (moved E {found[0]:+.2f}, N {found[1]:+.2f}, up {found[2]:+.2f} m)")
        out(f"  ok  point2dem gridded the aligned cloud (residual {residual:+.2f} m)")

        geoid = engine.convert_vertical_datum(
            work / "reference.tif", "egm2008", "ellipsoidal_wgs84", work / "datum", lambda _: None
        )
        with rasterio.open(geoid) as dem, rasterio.open(work / "reference.tif") as ref:
            undulation = float(next(dem.sample(point))[0] - next(ref.sample(point))[0])
        # EGM2008 geoid height near Al Ain is about -32 m.
        if not -36.0 < undulation < -28.0:
            raise SystemExit(f"FAIL dem_geoid: geoid height {undulation:.2f} m, expected about -32 m")
        out(f"  ok  dem_geoid applied the bundled EGM2008 geoid ({undulation:+.2f} m)")
    out("ASP smoke test passed")
    return {"version": version, "translation": found, "geoid_height_m": undulation}


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else None)

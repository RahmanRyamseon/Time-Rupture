"""Static map snapshots for the report, rendered straight from the site's rasters."""
from __future__ import annotations

import io
import math
from dataclasses import dataclass

import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.features import rasterize
from rasterio.transform import from_origin
from rasterio.windows import from_bounds
from shapely.geometry.base import BaseGeometry

from app.geo.raster_io import NODATA
from app.geo.tiles import dod_colors, hillshade

SITE_RGB = (31, 41, 51)
ZONE_RGB = {"cut": (33, 102, 172), "fill": (178, 24, 43), "mixed": (123, 50, 148)}
BACKGROUND = 236
_NICE = (1, 2, 5)


@dataclass(frozen=True)
class MapImage:
    png: bytes
    width_px: int
    scale_bar_m: float  # ground length of the bar drawn in the bottom-left corner


def _read(path: str, bounds, shape) -> tuple[np.ndarray, np.ndarray]:
    """Read band 1 resampled to `shape` over `bounds`; areas outside the raster are invalid."""
    with rasterio.open(path) as src:
        nodata = src.nodata if src.nodata is not None else NODATA
        data = src.read(
            1,
            window=from_bounds(*bounds, transform=src.transform),
            out_shape=shape,
            boundless=True,
            fill_value=nodata,
            resampling=Resampling.bilinear,
        ).astype("float64")
    valid = np.isfinite(data) & (data != nodata)
    return data, valid


def _outline(geom: BaseGeometry, transform, shape, width_m: float) -> np.ndarray:
    return rasterize([(geom.boundary.buffer(width_m / 2), 1)], out_shape=shape, transform=transform).astype(bool)


def render_site_map(
    site_geom: BaseGeometry,
    zones: list[tuple[BaseGeometry, str]],
    *,
    dem_path: str | None = None,
    ortho: tuple[str, float, float] | None = None,
    dod: tuple[str, float, float] | None = None,
    width_px: int = 1200,
) -> MapImage:
    """Draw the site: terrain hillshade or orthoimage, optional cut/fill overlay, outlines.

    Geometries and rasters are in the site's working (UTM) CRS. `ortho` is
    (path, display minimum, display maximum); `dod` is (path, level of detection,
    colour range), drawn like the dashboard: blue = cut, red = fill.
    """
    xmin, ymin, xmax, ymax = site_geom.bounds
    margin = 0.04 * max(xmax - xmin, ymax - ymin)
    xmin, ymin, xmax, ymax = xmin - margin, ymin - margin, xmax + margin, ymax + margin
    res = (xmax - xmin) / width_px
    height_px = max(1, round((ymax - ymin) / res))
    shape = (height_px, width_px)
    bounds = (xmin, ymax - height_px * res, xmin + width_px * res, ymax)
    transform = from_origin(xmin, ymax, res, res)

    rgb = np.full((3, *shape), float(BACKGROUND))
    if ortho is not None:
        values, valid = _read(ortho[0], bounds, shape)
        grey = np.clip((values - ortho[1]) / max(ortho[2] - ortho[1], 1e-9), 0, 1) * 255.0
        rgb = np.where(valid, grey, rgb)
    elif dem_path is not None:
        values, valid = _read(dem_path, bounds, shape)
        if valid.any():
            rgb = np.where(valid, hillshade(values, valid, res), rgb)
    if dod is not None:
        dh, valid = _read(dod[0], bounds, shape)
        visible = valid & (np.abs(dh) >= dod[1]) & (dh != 0)
        overlay = dod_colors(np.where(visible, dh, 0.0), dod[2])
        rgb = np.where(visible, 0.8 * overlay + 0.2 * rgb, rgb)

    line = max(res * 2.5, 1e-6)
    for geom, zone_type in zones:
        rgb[:, _outline(geom, transform, shape, line)] = np.array(ZONE_RGB.get(zone_type, ZONE_RGB["mixed"]))[:, None]
    rgb[:, _outline(site_geom, transform, shape, line * 1.3)] = np.array(SITE_RGB)[:, None]

    # Scale bar: a round length close to a fifth of the map width.
    target = (xmax - xmin) / 5
    magnitude = 10 ** math.floor(math.log10(target))
    bar_m = max(n * magnitude for n in _NICE if n * magnitude <= target)
    bar_px, pad, thick = round(bar_m / res), round(width_px * 0.025), max(4, width_px // 200)
    row0 = height_px - pad - thick
    rgb[:, row0 - 2 : row0 + thick + 2, pad - 2 : pad + bar_px + 2] = 255.0
    rgb[:, row0 : row0 + thick, pad : pad + bar_px] = 20.0

    image = Image.fromarray(np.moveaxis(rgb, 0, -1).clip(0, 255).astype("uint8"), "RGB")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return MapImage(buffer.getvalue(), width_px, bar_m)

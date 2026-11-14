"""Validate uploaded elevation rasters and convert them to analysis-ready COGs.

Rasters are never read whole: reprojection and copying go through GDAL's chunked warper
and block-wise I/O, so sub-metre rasters of many gigabytes are handled in bounded memory.
"""
from __future__ import annotations

import math
import os
from dataclasses import asdict, dataclass

import numpy as np
import rasterio
import rasterio.shutil
from pyproj import CRS
from rasterio.enums import Resampling
from rasterio.errors import RasterioError
from rasterio.transform import from_origin
from rasterio.warp import calculate_default_transform, reproject, transform_bounds
from rasterio.windows import Window
from shapely.geometry import box
from shapely.geometry.base import BaseGeometry

from app.geo.grid import WGS84, reproject_geometry

NODATA = -9999.0
BLOCK = 512
# Values outside this range cannot be terrain heights in metres; treated as "no data"
# to catch files that use an undeclared sentinel such as -32767 or 3.4e38.
PLAUSIBLE_ELEVATION_M = (-1000.0, 9000.0)
COG_OPTIONS = {"driver": "COG", "compress": "DEFLATE", "predictor": 3, "blocksize": BLOCK}


class RasterInputError(ValueError):
    """Bad user-supplied raster; the message is safe to show to the user."""


@dataclass(frozen=True)
class RasterSummary:
    crs_wkt: str
    crs_name: str
    width: int
    height: int
    band_count: int
    dtype: str
    nodata: float | None
    bounds_wgs84: tuple[float, float, float, float]

    def as_dict(self) -> dict:
        return asdict(self)


def inspect_elevation_raster(path: str, site_geom_wgs84: BaseGeometry) -> RasterSummary:
    """Cheap checks done at upload time so the analyst gets an immediate, specific error."""
    try:
        src = rasterio.open(path)
    except RasterioError as exc:
        raise RasterInputError(
            "The file could not be read as a raster. Upload a GeoTIFF elevation model."
        ) from exc
    with src:
        if src.driver != "GTiff":
            raise RasterInputError(f"Only GeoTIFF is supported (this file is {src.driver}).")
        if src.crs is None:
            raise RasterInputError(
                "The GeoTIFF has no coordinate reference system (CRS). Re-export it with its "
                "CRS embedded; heights cannot be located on the ground without it."
            )
        if src.count != 1:
            raise RasterInputError(
                f"Expected a single-band elevation raster but the file has {src.count} bands "
                "(it may be an orthoimage rather than a DEM/DSM)."
            )
        if src.transform.is_identity or src.transform.b != 0 or src.transform.d != 0:
            raise RasterInputError(
                "The GeoTIFF is not georeferenced as a north-up grid (missing or rotated "
                "geotransform). Re-export it as a north-up raster."
            )
        if src.width < 2 or src.height < 2:
            raise RasterInputError("The raster is smaller than 2 x 2 pixels.")
        try:
            bounds = transform_bounds(src.crs, WGS84.to_wkt(), *src.bounds, densify_pts=21)
        except Exception as exc:
            raise RasterInputError("The raster's CRS could not be interpreted.") from exc
        if not box(*bounds).intersects(site_geom_wgs84):
            raise RasterInputError(
                "The raster does not overlap the site boundary. Raster extent (lon/lat): "
                f"{bounds[0]:.5f}, {bounds[1]:.5f} to {bounds[2]:.5f}, {bounds[3]:.5f}. "
                "Check that the file belongs to this site and that its CRS is correct."
            )
        crs = CRS.from_user_input(src.crs)
        return RasterSummary(
            crs_wkt=crs.to_wkt(),
            crs_name=crs.name,
            width=src.width,
            height=src.height,
            band_count=src.count,
            dtype=src.dtypes[0],
            nodata=src.nodata,
            bounds_wgs84=tuple(bounds),  # type: ignore[arg-type]
        )


@dataclass(frozen=True)
class PreparedSurface:
    epsg: int
    resolution_m: float
    width: int
    height: int
    bounds: tuple[float, float, float, float]
    bounds_wgs84: tuple[float, float, float, float]
    min_m: float
    max_m: float
    mean_m: float
    valid_pixels: int
    site_coverage: float  # fraction of the site boundary that has elevation data

    def as_dict(self) -> dict:
        return asdict(self)


def prepare_surface(
    src_path: str,
    dst_path: str,
    grid_crs: CRS,
    site_geom_wgs84: BaseGeometry,
    buffer_m: float,
) -> PreparedSurface:
    """Reproject an elevation raster to the site's metric grid and store it as a COG.

    The output keeps the source's native ground resolution and is cropped to the site
    boundary plus `buffer_m` (kept as stable-ground context for alignment). A source
    already in the working CRS keeps its own pixel grid (no interpolation); otherwise
    the origin is snapped to whole multiples of the pixel size, so that reprojected
    surveys of equal resolution share one grid and need no further resampling.
    """
    site_geom = reproject_geometry(site_geom_wgs84, WGS84, grid_crs)
    dst_crs_wkt = grid_crs.to_wkt()
    tmp_path = dst_path + ".tmp.tif"
    try:
        with rasterio.open(src_path) as src:
            transform, _, _ = calculate_default_transform(
                src.crs, dst_crs_wkt, src.width, src.height, *src.bounds
            )
            res = float(transform.a)
            if not math.isfinite(res) or res <= 0:
                raise RasterInputError("Could not determine the raster's ground resolution.")

            src_bounds = transform_bounds(src.crs, dst_crs_wkt, *src.bounds, densify_pts=21)
            want = site_geom.buffer(buffer_m).bounds
            left = max(src_bounds[0], want[0])
            bottom = max(src_bounds[1], want[1])
            right = min(src_bounds[2], want[2])
            top = min(src_bounds[3], want[3])
            if right - left < res or top - bottom < res:
                raise RasterInputError("The raster does not overlap the site boundary.")
            same_grid = (
                CRS.from_user_input(src.crs).equals(grid_crs)
                and math.isclose(src.transform.a, -src.transform.e, rel_tol=1e-9)
            )
            if same_grid:
                # Already on the working CRS: keep the source's own pixel grid so heights
                # are copied exactly instead of being interpolated (which smooths them).
                res = float(src.transform.a)
                left = src.bounds.left + math.floor((left - src.bounds.left) / res + 1e-9) * res
                top = src.bounds.top - math.floor((src.bounds.top - top) / res + 1e-9) * res
            else:
                left = math.floor(left / res) * res
                top = math.ceil(top / res) * res
            width = max(1, math.ceil((right - left) / res))
            height = max(1, math.ceil((top - bottom) / res))
            dst_transform = from_origin(left, top, res, res)

            profile = {
                "driver": "GTiff",
                "dtype": "float32",
                "count": 1,
                "crs": dst_crs_wkt,
                "transform": dst_transform,
                "width": width,
                "height": height,
                "nodata": NODATA,
                "tiled": True,
                "blockxsize": BLOCK,
                "blockysize": BLOCK,
                "compress": "DEFLATE",
                "BIGTIFF": "IF_SAFER",
            }
            with rasterio.open(tmp_path, "w", **profile) as dst:
                reproject(
                    source=rasterio.band(src, 1),
                    destination=rasterio.band(dst, 1),
                    src_nodata=src.nodata,
                    dst_nodata=NODATA,
                    resampling=Resampling.bilinear,
                    warp_mem_limit=256,
                )

        stats = _clean_and_summarise(tmp_path, site_geom)
        if stats["valid"] == 0:
            raise RasterInputError(
                "The raster contains no valid elevation values inside the site area "
                "(everything is no-data)."
            )
        rasterio.shutil.copy(tmp_path, dst_path, **COG_OPTIONS)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    bounds = (left, top - height * res, left + width * res, top)
    return PreparedSurface(
        epsg=grid_crs.to_epsg(),
        resolution_m=res,
        width=width,
        height=height,
        bounds=bounds,
        bounds_wgs84=tuple(transform_bounds(dst_crs_wkt, WGS84.to_wkt(), *bounds)),  # type: ignore[arg-type]
        min_m=stats["min"],
        max_m=stats["max"],
        mean_m=stats["sum"] / max(stats["valid"], 1),
        valid_pixels=stats["valid"],
        site_coverage=stats["site_valid"] / max(stats["site_pixels"], 1),
    )


def iter_windows(width: int, height: int, size: int = 1024):
    for row in range(0, height, size):
        for col in range(0, width, size):
            yield Window(col, row, min(size, width - col), min(size, height - row))


def _clean_and_summarise(path: str, site_geom: BaseGeometry) -> dict:
    """Blank implausible values in place and gather statistics, one block at a time."""
    from rasterio.features import geometry_mask

    low, high = PLAUSIBLE_ELEVATION_M
    out = {"valid": 0, "sum": 0.0, "min": math.inf, "max": -math.inf, "site_valid": 0, "site_pixels": 0}
    with rasterio.open(path, "r+") as dst:
        for window in iter_windows(dst.width, dst.height):
            data = dst.read(1, window=window)
            bad = ~np.isfinite(data) | (data < low) | (data > high)
            implausible = bad & (data != NODATA)
            if implausible.any():
                data[implausible] = NODATA
                dst.write(data, 1, window=window)
            valid = ~bad & (data != NODATA)
            inside = geometry_mask(
                [site_geom], out_shape=data.shape, transform=dst.window_transform(window), invert=True
            )
            out["site_pixels"] += int(inside.sum())
            out["site_valid"] += int((inside & valid).sum())
            if valid.any():
                values = data[valid].astype("float64")
                out["valid"] += values.size
                out["sum"] += float(values.sum())
                out["min"] = min(out["min"], float(values.min()))
                out["max"] = max(out["max"], float(values.max()))
    return out


def write_masked_copy(src_path: str, dst_path: str, blank: list[BaseGeometry]) -> None:
    """Copy a raster, setting pixels inside the `blank` polygons (raster CRS) to no-data."""
    from rasterio.features import geometry_mask

    with rasterio.open(src_path) as src:
        profile = src.profile | {"driver": "GTiff", "tiled": True, "compress": "DEFLATE"}
        nodata = src.nodata if src.nodata is not None else NODATA
        profile["nodata"] = nodata
        with rasterio.open(dst_path, "w", **profile) as dst:
            for window in iter_windows(src.width, src.height):
                data = src.read(1, window=window)
                if blank:
                    keep = geometry_mask(
                        blank, out_shape=data.shape, transform=src.window_transform(window)
                    )
                    data = np.where(keep, data, nodata).astype(data.dtype)
                dst.write(data, 1, window=window)


@dataclass(frozen=True)
class PreparedImage:
    bounds_wgs84: tuple[float, float, float, float]
    resolution_m: float
    display_min: float  # 2nd / 98th percentile, for the grey-scale stretch
    display_max: float

    def as_dict(self) -> dict:
        return asdict(self)


def prepare_orthoimage(
    src_path: str,
    dst_path: str,
    grid_crs: CRS,
    site_geom_wgs84: BaseGeometry,
    buffer_m: float,
    shift_east_m: float = 0.0,
    shift_north_m: float = 0.0,
) -> PreparedImage:
    """Store band 1 of an orthoimage as a COG on the site grid, cropped to the site.

    `shift_*` moves the image by the horizontal translation found when its DEM was
    aligned, so that image and terrain stay registered to each other.
    """
    from affine import Affine

    site_geom = reproject_geometry(site_geom_wgs84, WGS84, grid_crs)
    dst_crs_wkt = grid_crs.to_wkt()
    tmp_path = dst_path + ".tmp.tif"
    try:
        with rasterio.open(src_path) as src:
            if src.crs is None:
                raise RasterInputError("The orthoimage has no coordinate reference system.")
            t = src.transform
            src_transform = Affine(t.a, t.b, t.c + shift_east_m, t.d, t.e, t.f + shift_north_m)
            left0, top0 = src_transform.c, src_transform.f
            src_bounds_native = (left0, top0 + t.e * src.height, left0 + t.a * src.width, top0)
            transform, _, _ = calculate_default_transform(
                src.crs, dst_crs_wkt, src.width, src.height, *src_bounds_native
            )
            res = float(transform.a)
            src_bounds = transform_bounds(src.crs, dst_crs_wkt, *src_bounds_native, densify_pts=21)
            want = site_geom.buffer(buffer_m).bounds
            left, bottom = max(src_bounds[0], want[0]), max(src_bounds[1], want[1])
            right, top = min(src_bounds[2], want[2]), min(src_bounds[3], want[3])
            if right - left < res or top - bottom < res:
                raise RasterInputError("The orthoimage does not overlap the site boundary.")
            left, top = math.floor(left / res) * res, math.ceil(top / res) * res
            width = max(1, math.ceil((right - left) / res))
            height = max(1, math.ceil((top - bottom) / res))
            nodata = src.nodata if src.nodata is not None else NODATA
            profile = {
                "driver": "GTiff",
                "dtype": "float32",
                "count": 1,
                "crs": dst_crs_wkt,
                "transform": from_origin(left, top, res, res),
                "width": width,
                "height": height,
                "nodata": nodata,
                "tiled": True,
                "blockxsize": BLOCK,
                "blockysize": BLOCK,
                "compress": "DEFLATE",
            }
            with rasterio.open(tmp_path, "w", **profile) as dst:
                reproject(
                    source=rasterio.band(src, 1),
                    destination=rasterio.band(dst, 1),
                    src_transform=src_transform,
                    src_crs=src.crs,
                    src_nodata=src.nodata,
                    dst_nodata=nodata,
                    resampling=Resampling.bilinear,
                    warp_mem_limit=256,
                )
        with rasterio.open(tmp_path) as img:
            scale = max(1, max(img.width, img.height) // 1024)
            sample = img.read(
                1, out_shape=(max(1, img.height // scale), max(1, img.width // scale)), masked=True
            ).compressed()
        if sample.size == 0:
            raise RasterInputError("The orthoimage has no valid pixels inside the site area.")
        low, high = (float(v) for v in np.percentile(sample, [2, 98]))
        rasterio.shutil.copy(tmp_path, dst_path, **(COG_OPTIONS | {"predictor": 1}))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
    bounds = (left, top - height * res, left + width * res, top)
    return PreparedImage(
        bounds_wgs84=tuple(transform_bounds(dst_crs_wkt, WGS84.to_wkt(), *bounds)),  # type: ignore[arg-type]
        resolution_m=res,
        display_min=low,
        display_max=high if high > low else low + 1.0,
    )

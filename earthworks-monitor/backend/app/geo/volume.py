"""DEM of Difference, cut / fill volumes and their uncertainty.

Pure raster maths: no database, no web framework. Inputs are analysis-ready rasters in
the same projected (metric) CRS, as produced by `raster_io.prepare_surface`.
See METHOD.md for the plain-language description of every formula here.
"""
from __future__ import annotations

import math
from dataclasses import asdict, dataclass, field

import numpy as np
import rasterio
import rasterio.shutil
from rasterio.enums import Resampling
from rasterio.features import geometry_mask
from rasterio.vrt import WarpedVRT
from rasterio.windows import Window, from_bounds
from shapely.geometry import box
from shapely.geometry.base import BaseGeometry

from app.geo.raster_io import BLOCK, COG_OPTIONS, NODATA, iter_windows

STABLE_BLOCKS_PER_SIDE = 8
MIN_PIXELS_PER_BLOCK = 50
MIN_BLOCKS_FOR_SYSTEMATIC = 4
MAX_STABLE_SAMPLES = 2_000_000


class AnalysisError(ValueError):
    """The analysis cannot be done with these inputs; the message is safe to show."""


@dataclass(frozen=True)
class Surface:
    path: str
    # Vertical shift found by alignment; subtracted from every height before differencing.
    vertical_offset_m: float = 0.0


# --------------------------------------------------------------------------- pairing


class _Pair:
    """Two surfaces read block by block on one common grid: `to` minus `from`.

    The grid is that of the coarser surface, restricted to the area both cover; the
    finer surface is resampled onto it (averaged if at least twice as fine).
    """

    def __init__(self, from_: Surface, to: Surface):
        self._a = rasterio.open(from_.path)
        self._b = rasterio.open(to.path)
        self._offsets = (from_.vertical_offset_m, to.vertical_offset_m)
        a, b = self._a, self._b
        if a.crs != b.crs:
            raise AnalysisError(
                "The two surfaces are on different working grids (CRS). Re-process the "
                "older surface so both use the site's current grid."
            )
        overlap = box(*a.bounds).intersection(box(*b.bounds))
        res = max(a.res[0], b.res[0])
        if overlap.is_empty or overlap.area < res * res:
            raise AnalysisError(
                "The two surfaces do not overlap, so there is nothing to compare. Check "
                "that both cover the same site."
            )
        base, other = (a, b) if a.res[0] >= b.res[0] else (b, a)
        window = from_bounds(*overlap.bounds, transform=base.transform)
        col0, row0 = round(window.col_off), round(window.row_off)
        self.width = max(1, round(window.width))
        self.height = max(1, round(window.height))
        self._base_window = Window(col0, row0, self.width, self.height)
        self.transform = base.window_transform(self._base_window)
        self.crs = base.crs
        self.resolution_m = float(base.res[0])
        self.bounds = rasterio.windows.bounds(self._base_window, base.transform)
        ratio = base.res[0] / other.res[0]
        self._vrt = WarpedVRT(
            other,
            crs=base.crs,
            transform=self.transform,
            width=self.width,
            height=self.height,
            resampling=Resampling.average if ratio >= 2 else Resampling.bilinear,
            nodata=NODATA,
        )
        self._base, self._base_is_from = base, base is a

    def close(self) -> None:
        self._vrt.close()
        self._a.close()
        self._b.close()

    def __enter__(self) -> "_Pair":
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    def windows(self):
        return iter_windows(self.width, self.height)

    def window_transform(self, window: Window):
        return rasterio.windows.transform(window, self.transform)

    def read_difference(self, window: Window) -> tuple[np.ndarray, np.ndarray]:
        """Return (dh, valid) for a window; dh = aligned `to` minus aligned `from`."""
        shifted = Window(
            window.col_off + self._base_window.col_off,
            window.row_off + self._base_window.row_off,
            window.width,
            window.height,
        )
        base = self._base.read(1, window=shifted).astype("float64")
        other = self._vrt.read(1, window=window).astype("float64")
        valid = (base != NODATA) & (other != NODATA) & np.isfinite(base) & np.isfinite(other)
        from_values, to_values = (base, other) if self._base_is_from else (other, base)
        dh = (to_values - self._offsets[1]) - (from_values - self._offsets[0])
        return dh, valid


# ------------------------------------------------------------------ stable ground


@dataclass(frozen=True)
class StableGroundStats:
    """Height disagreement between two surfaces where the ground should not have changed."""

    n_pixels: int
    area_m2: float
    median_m: float
    mean_m: float
    nmad_m: float  # robust spread: 1.4826 x median absolute deviation
    rmse_m: float  # about `center`, after rejecting outliers beyond 3 NMAD
    # Spread of the regional (block) medians: error that does not average out over an
    # area. None when the stable ground is too small or too clustered to measure it.
    systematic_m: float | None
    n_blocks: int
    center_m: float
    # Measured noise leakage: the average phantom cut and fill per square metre of
    # stable ground at the level of detection `leak_lod_m` (None if not requested).
    leak_lod_m: float | None = None
    leak_cut_m: float | None = None
    leak_fill_m: float | None = None

    def as_dict(self) -> dict:
        return asdict(self)


def measure_stable_ground(
    from_: Surface,
    to: Surface,
    exclude: list[BaseGeometry],
    *,
    center: float | None = 0.0,
    min_pixels: int = 1000,
    lod_sigma_multiplier: float | None = None,
    lod_m: float | None = None,
) -> StableGroundStats | None:
    """Compare two surfaces outside the `exclude` geometries (the work zones).

    `center=None` measures spread about the median (use this to *find* a vertical
    offset: it is the returned `median_m`). `center=0.0` measures the error remaining
    between two surfaces that are already aligned, residual bias included.
    Returns None when fewer than `min_pixels` stable pixels exist.

    With `lod_m` (or `lod_sigma_multiplier`, times the measured RMSE) the phantom cut
    and fill that noise alone produces at that level of detection are measured too,
    using every stable pixel, outliers included: real DEM errors have heavier tails
    than a normal distribution, especially on steep slopes.
    """
    with _Pair(from_, to) as pair:
        total = pair.width * pair.height
        stride = max(1, math.ceil(math.sqrt(total / MAX_STABLE_SAMPLES)))
        samples: list[np.ndarray] = []
        block_ids: list[np.ndarray] = []
        stable_pixels = 0
        n = STABLE_BLOCKS_PER_SIDE
        for window in pair.windows():
            dh, valid = pair.read_difference(window)
            if exclude:
                valid &= geometry_mask(
                    exclude, out_shape=dh.shape, transform=pair.window_transform(window)
                )
            stable_pixels += int(valid.sum())
            # Regular sub-sampling on the full-raster lattice keeps memory bounded.
            row_start = (-window.row_off) % stride
            col_start = (-window.col_off) % stride
            sub = valid[row_start::stride, col_start::stride]
            if not sub.any():
                continue
            rows = np.arange(row_start, dh.shape[0], stride) + window.row_off
            cols = np.arange(col_start, dh.shape[1], stride) + window.col_off
            block = (rows * n // pair.height)[:, None] * n + (cols * n // pair.width)[None, :]
            samples.append(dh[row_start::stride, col_start::stride][sub])
            block_ids.append(block[sub])
        pixel_area = pair.resolution_m**2

    if stable_pixels < min_pixels or not samples:
        return None
    values = np.concatenate(samples)
    blocks = np.concatenate(block_ids)
    median = float(np.median(values))
    nmad = float(1.4826 * np.median(np.abs(values - median)))
    centre = median if center is None else center
    keep = np.abs(values - median) <= 3 * max(nmad, 1e-6)
    residual = values[keep] - centre
    rmse = float(np.sqrt(np.mean(residual**2)))

    block_medians = [
        float(np.median(residual[blocks[keep] == b]))
        for b in np.unique(blocks[keep])
        if np.count_nonzero(blocks[keep] == b) >= MIN_PIXELS_PER_BLOCK
    ]
    systematic = (
        float(np.sqrt(np.mean(np.square(block_medians))))
        if len(block_medians) >= MIN_BLOCKS_FOR_SYSTEMATIC
        else None
    )
    leak_lod = lod_m if lod_m is not None else (
        lod_sigma_multiplier * rmse if lod_sigma_multiplier is not None else None
    )
    leak_cut = leak_fill = None
    if leak_lod is not None:
        deviations = values - centre
        leak_fill = float(np.where(deviations >= leak_lod, deviations, 0.0).mean())
        leak_cut = float(np.where(deviations <= -leak_lod, -deviations, 0.0).mean())
    return StableGroundStats(
        leak_lod_m=leak_lod,
        leak_cut_m=leak_cut,
        leak_fill_m=leak_fill,
        n_pixels=stable_pixels,
        area_m2=stable_pixels * pixel_area,
        median_m=median,
        mean_m=float(values.mean()),
        nmad_m=nmad,
        rmse_m=rmse,
        systematic_m=systematic,
        n_blocks=len(block_medians),
        center_m=centre,
    )


# ----------------------------------------------------------------------- volumes


@dataclass
class RegionSums:
    """Raw per-region accumulators (pixel counts and summed height change)."""

    region_area_m2: float  # true ground area of the region polygon
    n_valid: int = 0
    n_cut: int = 0
    n_fill: int = 0
    cut_sum_m: float = 0.0  # positive magnitudes
    fill_sum_m: float = 0.0


@dataclass(frozen=True)
class Uncertainty:
    sigma_pixel_m: float  # 1-sigma height error of one DoD pixel
    sigma_systematic_m: float  # 1-sigma error that is the same over a whole region
    correlation_length_m: float
    confidence_z: float = 1.96
    lod_m: float = 0.0  # level of detection the volumes were thresholded at
    # Phantom cut / fill per square metre measured on stable ground at `lod_m`, if known.
    measured_leak_cut_m: float | None = None
    measured_leak_fill_m: float | None = None


@dataclass(frozen=True)
class VolumeResult:
    cut_m3: float
    fill_m3: float
    net_m3: float  # fill minus cut
    cut_pm_m3: float  # +/- half-width at the stated confidence
    fill_pm_m3: float
    net_pm_m3: float
    cut_area_m2: float
    fill_area_m2: float
    below_lod_area_m2: float
    region_area_m2: float
    data_coverage: float  # fraction of the region where both surfaces have data

    def as_dict(self) -> dict:
        return asdict(self)


@dataclass
class DodOutput:
    sums: dict[str, RegionSums]
    pixel_area_m2: float
    resolution_m: float
    display_range_m: float  # 98th percentile of |dh| above the LoD, for the colour ramp
    width: int
    height: int
    bounds: tuple[float, float, float, float] = field(default=(0, 0, 0, 0))


def compute_dod(
    from_: Surface,
    to: Surface,
    regions: dict[str, BaseGeometry],
    lod_m: float,
    *,
    areal_scale: float = 1.0,
    out_path: str | None = None,
) -> DodOutput:
    """Difference two surfaces and accumulate cut / fill per region, block by block.

    `regions` are polygons in the surfaces' CRS (the site and its zones). A pixel belongs
    to a region when its centre lies inside the polygon. Height changes smaller than
    `lod_m` (level of detection) are not counted as cut or fill. If `out_path` is given
    the full, unthresholded DoD is written there as a Cloud-Optimized GeoTIFF.
    """
    if lod_m < 0 or not math.isfinite(lod_m):
        raise AnalysisError("The level-of-detection threshold must be zero or positive.")
    with _Pair(from_, to) as pair:
        pixel_area = pair.resolution_m**2 / areal_scale
        extent = box(*pair.bounds)
        sums = {key: RegionSums(geom.area / areal_scale) for key, geom in regions.items()}
        active = {key: geom for key, geom in regions.items() if geom.intersects(extent)}
        magnitudes: list[np.ndarray] = []
        stride = max(1, math.ceil(math.sqrt(pair.width * pair.height / 500_000)))

        tmp_path = f"{out_path}.tmp.tif" if out_path else None
        writer = (
            rasterio.open(
                tmp_path,
                "w",
                driver="GTiff",
                dtype="float32",
                count=1,
                crs=pair.crs,
                transform=pair.transform,
                width=pair.width,
                height=pair.height,
                nodata=NODATA,
                tiled=True,
                blockxsize=BLOCK,
                blockysize=BLOCK,
                compress="DEFLATE",
                BIGTIFF="IF_SAFER",
            )
            if tmp_path
            else None
        )
        try:
            for window in pair.windows():
                dh, valid = pair.read_difference(window)
                if writer is not None:
                    writer.write(np.where(valid, dh, NODATA).astype("float32"), 1, window=window)
                if not valid.any():
                    continue
                transform = pair.window_transform(window)
                window_box = box(*rasterio.windows.bounds(window, pair.transform))
                cut = valid & (dh <= -lod_m) & (dh < 0)
                fill = valid & (dh >= lod_m) & (dh > 0)
                for key, geom in active.items():
                    if not geom.intersects(window_box):
                        continue
                    inside = geometry_mask(
                        [geom], out_shape=dh.shape, transform=transform, invert=True
                    )
                    acc = sums[key]
                    acc.n_valid += int((inside & valid).sum())
                    in_cut, in_fill = inside & cut, inside & fill
                    acc.n_cut += int(in_cut.sum())
                    acc.n_fill += int(in_fill.sum())
                    acc.cut_sum_m += float(-dh[in_cut].sum())
                    acc.fill_sum_m += float(dh[in_fill].sum())
                changed = (cut | fill)[::stride, ::stride]
                if changed.any():
                    magnitudes.append(np.abs(dh[::stride, ::stride][changed]))
        finally:
            if writer is not None:
                writer.close()
        if tmp_path and out_path:
            import os

            rasterio.shutil.copy(tmp_path, out_path, **COG_OPTIONS)
            os.remove(tmp_path)

        display_range = (
            float(np.percentile(np.concatenate(magnitudes), 98)) if magnitudes else max(lod_m, 0.0)
        )
        return DodOutput(
            sums=sums,
            pixel_area_m2=pixel_area,
            resolution_m=pair.resolution_m,
            display_range_m=max(display_range, lod_m, 1e-3),
            width=pair.width,
            height=pair.height,
            bounds=tuple(pair.bounds),  # type: ignore[arg-type]
        )


def volume_sigma_m3(area_m2: float, pixel_area_m2: float, u: Uncertainty) -> float:
    """1-sigma volume error for height change summed over `area_m2`.

    Two parts added in quadrature:
    * systematic - the same height error everywhere: sigma_sys x area;
    * random - pixel noise that partly averages out. Neighbouring pixels share errors,
      so only one independent sample is assumed per (pi x L^2 / 5) of area, where L is
      the correlation length (Rolstad et al., 2009). Never fewer than one sample.
    """
    if area_m2 <= 0:
        return 0.0
    n_pixels = area_m2 / pixel_area_m2
    correlated_area = math.pi * u.correlation_length_m**2 / 5.0
    n_independent = n_pixels if correlated_area <= pixel_area_m2 else area_m2 / correlated_area
    n_independent = max(1.0, min(n_pixels, n_independent))
    random_part = u.sigma_pixel_m * area_m2 / math.sqrt(n_independent)
    systematic_part = u.sigma_systematic_m * area_m2
    return math.hypot(random_part, systematic_part)


def noise_leakage_m3(area_m2: float, u: Uncertainty, measured_m: float | None = None) -> float:
    """Phantom volume expected from pure noise that happens to exceed the threshold.

    Over unchanged ground a fraction of pixels still exceeds the level of detection by
    chance and is counted, as cut and as fill alike. For normal noise the expected
    one-sided amount is sigma x pdf(LoD / sigma) per unit area. Where the amount was
    measured on stable ground (`measured_m`, metres of phantom change per unit area)
    the larger of the two is used, since real errors have heavier tails than normal
    noise. It largely cancels in the net volume but not in cut or fill taken alone, so
    it is added to their +/- ranges (conservatively over the region's surveyed area).
    """
    if area_m2 <= 0:
        return 0.0
    theory = 0.0
    if u.sigma_pixel_m > 0:
        k = u.lod_m / u.sigma_pixel_m
        theory = u.sigma_pixel_m * math.exp(-0.5 * k * k) / math.sqrt(2.0 * math.pi)
    return area_m2 * max(theory, measured_m or 0.0)


def finalize_volumes(acc: RegionSums, pixel_area_m2: float, u: Uncertainty) -> VolumeResult:
    cut_area = acc.n_cut * pixel_area_m2
    fill_area = acc.n_fill * pixel_area_m2
    valid_area = acc.n_valid * pixel_area_m2
    cut = acc.cut_sum_m * pixel_area_m2
    fill = acc.fill_sum_m * pixel_area_m2
    z = u.confidence_z
    return VolumeResult(
        cut_m3=cut,
        fill_m3=fill,
        net_m3=fill - cut,
        cut_pm_m3=z * volume_sigma_m3(cut_area, pixel_area_m2, u)
        + noise_leakage_m3(valid_area, u, u.measured_leak_cut_m),
        fill_pm_m3=z * volume_sigma_m3(fill_area, pixel_area_m2, u)
        + noise_leakage_m3(valid_area, u, u.measured_leak_fill_m),
        # A shared height bias raises fill and lowers cut together, so for the net
        # volume it acts over the whole changed area. Phantom cut and fill cancel in
        # the net only as far as they are equal; any measured imbalance is added.
        net_pm_m3=z * volume_sigma_m3(cut_area + fill_area, pixel_area_m2, u)
        + valid_area * abs((u.measured_leak_fill_m or 0.0) - (u.measured_leak_cut_m or 0.0)),
        cut_area_m2=cut_area,
        fill_area_m2=fill_area,
        below_lod_area_m2=max(valid_area - cut_area - fill_area, 0.0),
        region_area_m2=acc.region_area_m2,
        data_coverage=min(1.0, valid_area / acc.region_area_m2) if acc.region_area_m2 > 0 else 0.0,
    )

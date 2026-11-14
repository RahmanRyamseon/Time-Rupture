"""Synthetic elevation models with exactly known volumes (tests and the demo seed)."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import rasterio
from rasterio.transform import from_origin


@dataclass(frozen=True)
class Mound:
    """Flat-topped rectangular mound (height > 0) or pit (height < 0) with sloping sides.

    The sides ramp linearly over `ramp` metres measured inwards from the rectangle edge.
    """

    xmin: float
    ymin: float
    xmax: float
    ymax: float
    height: float
    ramp: float = 0.0

    @property
    def volume(self) -> float:
        a, b, r = self.xmax - self.xmin, self.ymax - self.ymin, self.ramp
        return abs(self.height) * ((a - 2 * r) * (b - 2 * r) + r * (a - 2 * r) + r * (b - 2 * r) + 4 * r * r / 3)

    def scaled(self, fraction: float) -> "Mound":
        return Mound(self.xmin, self.ymin, self.xmax, self.ymax, self.height * fraction, self.ramp)

    def heights(self, x: np.ndarray, y: np.ndarray) -> np.ndarray:
        inside = np.minimum(np.minimum(x - self.xmin, self.xmax - x), np.minimum(y - self.ymin, self.ymax - y))
        if self.ramp > 0:
            return self.height * np.clip(inside / self.ramp, 0.0, 1.0)
        return np.where(inside > 0, self.height, 0.0)


def write_synthetic_dem(
    path: str,
    *,
    epsg: int,
    bounds: tuple[float, float, float, float],
    resolution: float,
    mounds: tuple[Mound, ...] = (),
    base_height: float = 600.0,
    slope: tuple[float, float] = (0.002, -0.001),
    undulation: float = 0.5,
    noise_sigma: float = 0.0,
    vertical_offset: float = 0.0,
    seed: int = 0,
    nodata: float | None = -9999.0,
    with_crs: bool = True,
) -> None:
    """Write a gently sloping, undulating terrain with mounds/pits, noise and an offset."""
    xmin, ymin, xmax, ymax = bounds
    width = int(round((xmax - xmin) / resolution))
    height = int(round((ymax - ymin) / resolution))
    x = xmin + (np.arange(width) + 0.5) * resolution
    y = ymax - (np.arange(height) + 0.5) * resolution
    xx, yy = np.meshgrid(x, y)
    z = (
        base_height
        + slope[0] * (xx - xmin)
        + slope[1] * (yy - ymin)
        + undulation * np.sin((xx - xmin) / 180.0) * np.cos((yy - ymin) / 240.0)
    )
    for mound in mounds:
        z = z + mound.heights(xx, yy)
    if noise_sigma > 0:
        z = z + np.random.default_rng(seed).normal(0.0, noise_sigma, z.shape)
    z = z + vertical_offset
    profile = {
        "driver": "GTiff",
        "dtype": "float32",
        "count": 1,
        "width": width,
        "height": height,
        "transform": from_origin(xmin, ymax, resolution, resolution),
        "nodata": nodata,
        "tiled": True,
        "compress": "DEFLATE",
    }
    if with_crs:
        profile["crs"] = f"EPSG:{epsg}"
    with rasterio.open(path, "w", **profile) as dst:
        dst.write(z.astype("float32"), 1)

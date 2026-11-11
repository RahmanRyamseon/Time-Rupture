"""Render map tiles (PNG) from COGs: hillshade for surfaces, cut/fill for DoDs."""
from __future__ import annotations

import math

import numpy as np
from rio_tiler.errors import TileOutsideBounds
from rio_tiler.io import Reader
from rio_tiler.models import ImageData

TILE_SIZE = 256
_BUFFER = 2
# Gulf sites are flat; relief is exaggerated for display only (never for volumes).
HILLSHADE_EXAGGERATION = 3.0
CUT_RGB = np.array([33, 102, 172], dtype="float64")  # blue
FILL_RGB = np.array([178, 24, 43], dtype="float64")  # red
WHITE = np.array([247, 247, 247], dtype="float64")


def _read(path: str, z: int, x: int, y: int, buffer: int = 0) -> tuple[np.ndarray, np.ndarray] | None:
    try:
        with Reader(path) as reader:
            image = reader.tile(x, y, z, tilesize=TILE_SIZE, buffer=buffer or None, resampling_method="bilinear")
    except TileOutsideBounds:
        return None
    data = image.array[0]
    values = np.asarray(data.filled(np.nan), dtype="float64")
    valid = ~np.ma.getmaskarray(data) & np.isfinite(values)
    return values, valid


def _png(rgb: np.ndarray, valid: np.ndarray) -> bytes | None:
    if not valid.any():
        return None
    mask = np.broadcast_to(~valid, rgb.shape)
    return ImageData(np.ma.MaskedArray(rgb.astype("uint8"), mask=mask)).render(img_format="PNG")


def _tile_latitude(z: int, y: int) -> float:
    n = math.pi - 2.0 * math.pi * (y + 0.5) / 2**z
    return math.degrees(math.atan(math.sinh(n)))


def hillshade_tile(path: str, z: int, x: int, y: int) -> bytes | None:
    read = _read(path, z, x, y, buffer=_BUFFER)
    if read is None:
        return None
    values, valid = read
    ground_res = 40075016.686 * math.cos(math.radians(_tile_latitude(z, y))) / (TILE_SIZE * 2**z)
    filled = np.where(valid, values, np.nanmean(values[valid]) if valid.any() else 0.0)
    # Rows run north to south, so the northward gradient is minus the row gradient.
    d_row, dz_dx = np.gradient(filled * HILLSHADE_EXAGGERATION, ground_res)
    dz_dy = -d_row
    slope = np.arctan(np.hypot(dz_dx, dz_dy))
    aspect = np.arctan2(dz_dy, -dz_dx)
    azimuth, altitude = math.radians(360.0 - 315.0 + 90.0), math.radians(45.0)
    shade = np.sin(altitude) * np.cos(slope) + np.cos(altitude) * np.sin(slope) * np.cos(azimuth - aspect)
    grey = np.clip(shade * 255.0, 0, 255)
    crop = (slice(_BUFFER, -_BUFFER), slice(_BUFFER, -_BUFFER))
    grey, valid = grey[crop], valid[crop]
    return _png(np.stack([grey, grey, grey]), valid)


def dod_colors(dh: np.ndarray, value_range: float) -> np.ndarray:
    """Diverging ramp: blue = cut (negative), white = no change, red = fill (positive)."""
    t = np.clip(np.abs(dh) / max(value_range, 1e-9), 0.0, 1.0)[None, :, :]
    end = np.where((dh < 0)[None, :, :], CUT_RGB[:, None, None], FILL_RGB[:, None, None])
    return WHITE[:, None, None] + (end - WHITE[:, None, None]) * (0.25 + 0.75 * t)


def dod_tile(path: str, z: int, x: int, y: int, lod_m: float, value_range: float) -> bytes | None:
    """Cut/fill tile. Changes below the level of detection are transparent."""
    read = _read(path, z, x, y)
    if read is None:
        return None
    dh, valid = read
    visible = valid & (np.abs(dh) >= lod_m) & (dh != 0)
    return _png(dod_colors(np.where(visible, dh, 0.0), value_range), visible)

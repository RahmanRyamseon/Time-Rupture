"""Where files live on the shared data volume. Swap this module for object storage later."""
import shutil
import uuid
from pathlib import Path

from app.config import get_settings


def site_dir(site_id: uuid.UUID) -> Path:
    return Path(get_settings().data_dir) / "sites" / str(site_id)


def surface_dir(site_id: uuid.UUID, surface_id: uuid.UUID) -> Path:
    return site_dir(site_id) / "surfaces" / str(surface_id)


def surface_original_path(site_id: uuid.UUID, surface_id: uuid.UUID) -> Path:
    return surface_dir(site_id, surface_id) / "original.tif"


def surface_dem_path(site_id: uuid.UUID, surface_id: uuid.UUID) -> Path:
    return surface_dir(site_id, surface_id) / "dem.tif"


def analysis_dir(site_id: uuid.UUID, analysis_id: uuid.UUID) -> Path:
    return site_dir(site_id) / "analyses" / str(analysis_id)


def analysis_dod_path(site_id: uuid.UUID, analysis_id: uuid.UUID) -> Path:
    return analysis_dir(site_id, analysis_id) / "dod.tif"


def remove_tree(path: Path) -> None:
    shutil.rmtree(path, ignore_errors=True)

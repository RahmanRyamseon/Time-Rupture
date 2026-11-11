"""Registering, preparing and aligning elevation surfaces."""
from __future__ import annotations

import hashlib
import shutil
import uuid
from collections.abc import Callable
from datetime import date, datetime, timezone

import numpy
import rasterio
from geoalchemy2.shape import to_shape
from pyproj import CRS
from shapely.geometry.base import BaseGeometry
from sqlalchemy.orm import Session

from app import storage
from app.config import get_settings
from app.geo.grid import WGS84, reproject_geometry, utm_crs_for_geometry
from app.geo.raster_io import inspect_elevation_raster, prepare_surface
from app.geo.volume import AnalysisError
from app.geo.volume import Surface as RasterSurface
from app.geo.volume import measure_stable_ground
from app.models import (
    KIND_DESIGN,
    KIND_SURVEY,
    STATUS_READY,
    VERTICAL_DATUMS,
    Job,
    Site,
    Surface,
)

Log = Callable[[str], None]
ALIGN_SHIFT = "vertical_shift_median_stable_ground"
ALIGN_REFERENCE = "reference"
ALIGN_NONE = "none"


def software_versions() -> dict:
    return {
        "rasterio": rasterio.__version__,
        "gdal": rasterio.__gdal_version__,
        "numpy": numpy.__version__,
    }


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def site_geometry(site: Site) -> BaseGeometry:
    return to_shape(site.geom)


def raster_surface(surface: Surface, aligned: bool = True) -> RasterSurface:
    path = storage.surface_dem_path(surface.site_id, surface.id)
    return RasterSurface(str(path), surface.vertical_offset_m if aligned else 0.0)


def stable_ground_exclusions(site: Site, crs: CRS) -> list[BaseGeometry]:
    """Work zones (buffered) in the working CRS: ground there is expected to change."""
    buffer_m = get_settings().stable_zone_buffer_m
    return [reproject_geometry(to_shape(z.geom), WGS84, crs).buffer(buffer_m) for z in site.zones]


def check_datum_matches_site(site: Site, vertical_datum: str, db: Session) -> None:
    if vertical_datum not in VERTICAL_DATUMS:
        raise AnalysisError(f"Unknown vertical datum '{vertical_datum}'.")
    reference = db.get(Surface, site.reference_surface_id) if site.reference_surface_id else None
    if reference is not None and reference.vertical_datum != vertical_datum:
        raise AnalysisError(
            f"This surface is declared as '{vertical_datum}' heights but the site's baseline "
            f"survey uses '{reference.vertical_datum}'. Surfaces are only compared within one "
            "vertical datum; convert the file first (automatic geoid conversion is planned)."
        )


def register_surface(
    db: Session,
    site: Site,
    *,
    src_path: str,
    filename: str,
    kind: str,
    name: str,
    survey_date: date | None,
    vertical_datum: str,
    stated_accuracy_m: float | None,
    user_id: uuid.UUID | None,
    released: bool = False,
) -> tuple[Surface, Job]:
    """Validate an uploaded raster, store it and create the surface with its ingest job.

    Raises RasterInputError / AnalysisError with a user-facing message on bad input.
    The caller enqueues the returned job.
    """
    if kind == KIND_SURVEY:
        if survey_date is None:
            raise AnalysisError("A survey needs its survey date.")
        if not stated_accuracy_m or stated_accuracy_m <= 0:
            raise AnalysisError(
                "A survey needs the supplier's stated vertical accuracy (RMSE, metres). It is "
                "the fallback for the uncertainty when stable ground cannot be measured."
            )
    elif kind == KIND_DESIGN:
        survey_date, stated_accuracy_m = None, None
        if any(s.kind == KIND_DESIGN for s in site.surfaces):
            raise AnalysisError(
                "This site already has a design surface. Delete it before uploading a new one."
            )
    else:
        raise AnalysisError("Surface kind must be 'survey' or 'design'.")
    check_datum_matches_site(site, vertical_datum, db)
    summary = inspect_elevation_raster(src_path, site_geometry(site))

    surface = Surface(
        id=uuid.uuid4(),
        site_id=site.id,
        kind=kind,
        name=name,
        survey_date=survey_date,
        source_type="dem_upload",
        vertical_datum=vertical_datum,
        stated_accuracy_m=stated_accuracy_m,
        released=released,
        original_filename=filename[:300],
        created_by=user_id,
    )
    target = storage.surface_original_path(site.id, surface.id)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(src_path, target)
    digest = hashlib.sha256()
    with open(target, "rb") as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            digest.update(chunk)
    surface.provenance = {
        "source": {
            "type": "dem_upload",
            "filename": filename,
            "sha256": digest.hexdigest(),
            "size_bytes": target.stat().st_size,
            "crs": summary.crs_name,
            "crs_wkt": summary.crs_wkt,
            "width": summary.width,
            "height": summary.height,
            "dtype": summary.dtype,
            "declared_nodata": summary.nodata,
            "declared_vertical_datum": vertical_datum,
            "stated_accuracy_m": stated_accuracy_m,
            "uploaded_at": now_iso(),
            "uploaded_by": str(user_id) if user_id else None,
        }
    }
    db.add(surface)
    db.flush()  # the job's foreign key needs the surface row to exist first
    job = Job(site_id=site.id, kind="ingest_surface", surface_id=surface.id, created_by=user_id)
    db.add(job)
    return surface, job


def ingest_surface(db: Session, surface: Surface, log: Log) -> None:
    """Reproject to the site grid, store as COG, then align (surveys only)."""
    settings = get_settings()
    site = surface.site
    geom = site_geometry(site)
    crs = utm_crs_for_geometry(geom)
    log(f"Reprojecting to {crs.name} (EPSG:{crs.to_epsg()}) at native resolution")
    info = prepare_surface(
        str(storage.surface_original_path(site.id, surface.id)),
        str(storage.surface_dem_path(site.id, surface.id)),
        crs,
        geom,
        settings.site_buffer_m,
    )
    log(
        f"Grid {info.width} x {info.height} px at {info.resolution_m:.3f} m; "
        f"site coverage {info.site_coverage:.1%}; heights {info.min_m:.2f} to {info.max_m:.2f} m"
    )
    surface.grid_epsg = info.epsg
    surface.resolution_m = info.resolution_m
    surface.bounds_wgs84 = list(info.bounds_wgs84)
    surface.stats = info.as_dict()
    surface.provenance = surface.provenance | {
        "processing": {
            "grid_epsg": info.epsg,
            "resolution_m": info.resolution_m,
            "resampling": "bilinear",
            "crop_buffer_m": settings.site_buffer_m,
            "software": software_versions(),
            "processed_at": now_iso(),
        }
    }
    if surface.kind == KIND_SURVEY:
        if site.reference_surface_id is None:
            site.reference_surface_id = surface.id
            log("First survey of the site: set as the baseline (reference) epoch")
        align_surface(db, surface, log)
    surface.status = STATUS_READY
    surface.error = None


def align_surface(db: Session, surface: Surface, log: Log) -> None:
    """Find the vertical shift of a survey relative to the site's reference survey.

    The shift is the median height difference over stable ground (everything outside
    the buffered work zones). It is stored, not burnt into the raster.
    """
    settings = get_settings()
    site = surface.site
    if surface.id == site.reference_surface_id:
        surface.vertical_offset_m = 0.0
        surface.alignment = {"method": ALIGN_REFERENCE, "aligned_at": now_iso()}
        return
    reference = db.get(Surface, site.reference_surface_id)
    if reference is None or reference.status != STATUS_READY:
        raise AnalysisError("The site's baseline survey is not ready; cannot align to it.")
    check_datum_matches_site(site, surface.vertical_datum, db)

    crs = CRS.from_epsg(surface.grid_epsg)
    stats = measure_stable_ground(
        raster_surface(reference, aligned=False),
        raster_surface(surface, aligned=False),
        stable_ground_exclusions(site, crs),
        center=None,
        min_pixels=settings.min_stable_pixels,
    )
    base = {
        "reference_surface_id": str(reference.id),
        "zone_buffer_m": settings.stable_zone_buffer_m,
        "aligned_at": now_iso(),
    }
    if stats is None:
        surface.vertical_offset_m = 0.0
        surface.alignment = base | {
            "method": ALIGN_NONE,
            "reason": "Not enough stable ground outside the work zones to measure a shift.",
        }
        log("Alignment skipped: not enough stable ground; stated accuracy will be used")
        return
    surface.vertical_offset_m = stats.median_m
    surface.alignment = base | {
        "method": ALIGN_SHIFT,
        "offset_m": stats.median_m,
        "stable_pixels": stats.n_pixels,
        "stable_area_m2": stats.area_m2,
        "residual_rmse_m": stats.rmse_m,
        "residual_nmad_m": stats.nmad_m,
        "residual_systematic_m": stats.systematic_m,
        "stable_blocks": stats.n_blocks,
    }
    log(
        f"Aligned to baseline: vertical shift {stats.median_m:+.3f} m over "
        f"{stats.area_m2 / 1e4:.1f} ha of stable ground; residual RMSE {stats.rmse_m:.3f} m"
    )

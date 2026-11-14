"""Registering, preparing and aligning elevation surfaces."""
from __future__ import annotations

import hashlib
import math
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
from app.engines.base import AlignmentRequest, EngineError
from app.engines.registry import get_engine
from app.geo.raster_io import (
    inspect_elevation_raster,
    prepare_orthoimage,
    prepare_surface,
    write_masked_copy,
)
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
METHOD_VERTICAL = "vertical_shift"
METHOD_PC_ALIGN = "pc_align"
SOURCE_UPLOAD = "dem_upload"
SOURCE_STEREO = "stereo"
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


def site_datum(site: Site, db: Session) -> str | None:
    """The height reference every surface of the site is held in: the baseline's."""
    reference = db.get(Surface, site.reference_surface_id) if site.reference_surface_id else None
    return reference.vertical_datum if reference is not None else None


def check_datum_matches_site(site: Site, vertical_datum: str, db: Session) -> None:
    """Refuse a height reference that can neither match nor be converted to the site's."""
    if vertical_datum not in VERTICAL_DATUMS:
        raise AnalysisError(f"Unknown vertical datum '{vertical_datum}'.")
    target = site_datum(site, db)
    if target is None or target == vertical_datum:
        return
    convertible = get_engine().convertible_datums() if get_settings().geoid_conversion else ()
    if vertical_datum in convertible and target in convertible:
        return
    raise AnalysisError(
        f"This surface is declared as '{vertical_datum}' heights but the site's baseline "
        f"survey uses '{target}'. These two height references cannot be converted "
        "automatically (only the WGS84 ellipsoid, EGM96 and EGM2008 can); convert the file "
        "before uploading."
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
        source_type=SOURCE_UPLOAD,
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
    """Bring a surface onto the site grid and into the site's height reference, store it
    as a COG, then align it to the baseline (surveys only)."""
    settings = get_settings()
    site = surface.site
    geom = site_geometry(site)
    crs = utm_crs_for_geometry(geom)
    source = storage.surface_original_path(site.id, surface.id)
    work = storage.surface_work_dir(site.id, surface.id)
    provenance = dict(surface.provenance)

    declared = provenance.get("source", {}).get("declared_vertical_datum", surface.vertical_datum)
    target = site_datum(site, db)
    if target is not None and surface.id != site.reference_surface_id and declared != target:
        engine = get_engine()
        log(f"Converting heights from {declared} to the site's reference, {target}")
        source = engine.convert_vertical_datum(source, declared, target, work / "datum", log)
        surface.vertical_datum = target
        provenance["datum_conversion"] = {
            "from": declared,
            "to": target,
            "engine": engine.name,
            "engine_version": engine.version(),
            "converted_at": now_iso(),
        }

    log(f"Reprojecting to {crs.name} (EPSG:{crs.to_epsg()}) at native resolution")
    dem_path = storage.surface_dem_path(site.id, surface.id)
    info = prepare_surface(str(source), str(dem_path), crs, geom, settings.site_buffer_m)
    log(
        f"Grid {info.width} x {info.height} px at {info.resolution_m:.3f} m; "
        f"site coverage {info.site_coverage:.1%}; heights {info.min_m:.2f} to {info.max_m:.2f} m"
    )
    provenance["processing"] = {
        "grid_epsg": info.epsg,
        "resolution_m": info.resolution_m,
        "resampling": "bilinear",
        "crop_buffer_m": settings.site_buffer_m,
        "software": software_versions(),
        "processed_at": now_iso(),
    }
    surface.grid_epsg = info.epsg
    surface.resolution_m = info.resolution_m

    shift_east = shift_north = 0.0
    surface.vertical_offset_m = 0.0
    surface.alignment = None
    if surface.kind == KIND_SURVEY:
        if site.reference_surface_id is None:
            site.reference_surface_id = surface.id
            log("First survey of the site: set as the baseline (reference) epoch")
        method = (
            settings.alignment_method_stereo
            if surface.source_type == SOURCE_STEREO
            else settings.alignment_method_upload
        )
        three_d = None
        if method == METHOD_PC_ALIGN and surface.id != site.reference_surface_id:
            three_d = _align_3d(db, surface, crs, log)
            if three_d is not None and three_d["accepted"]:
                shift_east, shift_north = three_d["translation_east_m"], three_d["translation_north_m"]
                info = prepare_surface(
                    three_d.pop("aligned_dem"), str(dem_path), crs, geom, settings.site_buffer_m
                )
            elif three_d is not None:
                three_d.pop("aligned_dem")
        align_surface(db, surface, log)
        if three_d is not None:
            surface.alignment = surface.alignment | {"pc_align": three_d}

    stats = info.as_dict()
    ortho_raw = storage.surface_ortho_raw_path(site.id, surface.id)
    if ortho_raw.exists():
        image = prepare_orthoimage(
            str(ortho_raw),
            str(storage.surface_ortho_path(site.id, surface.id)),
            crs,
            geom,
            settings.site_buffer_m,
            shift_east,
            shift_north,
        )
        stats["orthoimage"] = image.as_dict()
    surface.bounds_wgs84 = list(info.bounds_wgs84)
    surface.stats = stats
    surface.provenance = provenance
    surface.status = STATUS_READY
    surface.error = None
    if not settings.keep_engine_workdir:
        storage.remove_tree(work)


def _align_3d(db: Session, surface: Surface, crs: CRS, log: Log) -> dict | None:
    """3-D alignment to the baseline with the photogrammetry engine (ASP pc_align).

    The transform is estimated on stable ground only (work zones blanked) and applied
    to the whole DEM. Returns the engine's report, or None when it cannot be done.
    """
    settings = get_settings()
    site = surface.site
    reference = db.get(Surface, site.reference_surface_id)
    if reference is None or reference.status != STATUS_READY:
        raise AnalysisError("The site's baseline survey is not ready; cannot align to it.")
    exclusions = stable_ground_exclusions(site, crs)
    before = measure_stable_ground(
        raster_surface(reference, aligned=False),
        raster_surface(surface, aligned=False),
        exclusions,
        center=None,
        min_pixels=settings.min_stable_pixels,
    )
    if before is None:
        log("3-D alignment skipped: not enough stable ground outside the work zones")
        return None
    resolution = max(reference.resolution_m, surface.resolution_m)
    # ASP guidance: a multiple (5-10x) of the spread of the height differences, plus
    # here the offset itself and room for a horizontal error of a few pixels.
    max_displacement = settings.pc_align_max_displacement_m or (
        abs(before.median_m) + 10.0 * before.nmad_m + 3.0 * resolution
    )
    work = storage.surface_work_dir(site.id, surface.id) / "align"
    work.mkdir(parents=True, exist_ok=True)
    dem_path = storage.surface_dem_path(site.id, surface.id)
    stable_path = work / "source_stable.tif"
    write_masked_copy(str(dem_path), str(stable_path), exclusions)

    engine = get_engine()
    log(f"3-D alignment to the baseline with {engine.name} (max displacement {max_displacement:.1f} m)")
    result = engine.align_dem(
        AlignmentRequest(
            reference_dem=storage.surface_dem_path(site.id, reference.id),
            source_dem=dem_path,
            source_stable_dem=stable_path,
            workdir=work,
            target_epsg=crs.to_epsg(),
            resolution_m=surface.resolution_m,
            max_displacement_m=max_displacement,
            translation_only=settings.pc_align_translation_only,
            method=settings.pc_align_method,
        ),
        log,
    )
    log(
        f"Moved {result.translation_north_m:+.2f} m north, {result.translation_east_m:+.2f} m east, "
        f"{result.translation_up_m:+.2f} m up"
    )
    # Accept the 3-D result only if it really improves agreement on stable ground.
    # On flat terrain a horizontal shift cannot be observed and the solution may wander.
    after = measure_stable_ground(
        raster_surface(reference, aligned=False),
        RasterSurface(str(result.aligned_dem)),
        exclusions,
        center=None,
        min_pixels=settings.min_stable_pixels,
    )
    horizontal = math.hypot(result.translation_north_m, result.translation_east_m)
    accepted = (
        after is not None
        and after.nmad_m <= before.nmad_m * 1.02
        and horizontal <= max_displacement
    )
    if not accepted:
        log(
            "3-D alignment rejected (it did not improve agreement on stable ground); "
            "only the vertical shift is applied"
        )
    return {
        "accepted": accepted,
        "stable_ground_after": after.as_dict() if after is not None else None,
        "aligned_dem": str(result.aligned_dem),
        "method": result.method,
        "engine": engine.name,
        "engine_version": engine.version(),
        "translation_north_m": result.translation_north_m,
        "translation_east_m": result.translation_east_m,
        "translation_up_m": result.translation_up_m,
        "stable_ground_before": before.as_dict(),
        "commands": result.commands,
        **result.stats,
    }


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

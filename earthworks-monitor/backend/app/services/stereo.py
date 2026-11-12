"""Survey epochs built from a satellite stereo pair by the photogrammetry engine."""
from __future__ import annotations

import hashlib
import shutil
import uuid
from datetime import date
from pathlib import Path

from sqlalchemy.orm import Session

from app import storage
from app.config import get_settings
from app.engines.base import StereoRequest
from app.engines.registry import get_engine
from app.geo.grid import utm_crs_for_geometry
from app.geo.volume import AnalysisError
from app.models import KIND_SURVEY, Job, Site, Surface
from app.services.surfaces import (
    SOURCE_STEREO,
    Log,
    check_datum_matches_site,
    ingest_surface,
    now_iso,
    site_geometry,
)

PAIR_ROLES = ("left_image", "right_image", "left_camera", "right_camera")
SCENE_ROLE = "scene"
# What a stereo engine's DEM is referenced to until converted to the site's datum.
ENGINE_DATUM = "ellipsoidal_wgs84"


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_stereo_inputs(camera_model: str, roles: set[str]) -> None:
    """Check the camera model is supported and the right files were supplied."""
    engine = get_engine()
    if camera_model not in engine.camera_models:
        raise AnalysisError(
            f"Unsupported camera model '{camera_model}'. This installation supports: "
            f"{', '.join(engine.camera_models)}."
        )
    if camera_model in engine.single_file_camera_models:
        if roles != {SCENE_ROLE}:
            raise AnalysisError(
                f"A '{camera_model}' survey takes exactly one file: the scene "
                "(for ASTER, the Level 1A .hdf)."
            )
        return
    if not {"left_image", "right_image"} <= roles:
        raise AnalysisError("A stereo survey needs both a left and a right image.")
    if ("left_camera" in roles) != ("right_camera" in roles):
        raise AnalysisError("Provide camera files for both images, or for neither.")
    if SCENE_ROLE in roles:
        raise AnalysisError(f"A '{camera_model}' survey takes an image pair, not a single scene file.")


def register_stereo_survey(
    db: Session,
    site: Site,
    *,
    files: dict[str, tuple[str, str]],  # role -> (temporary path, original filename)
    camera_model: str,
    name: str,
    survey_date: date,
    stated_accuracy_m: float,
    bundle_adjust: bool,
    resolution_m: float | None,
    user_id: uuid.UUID | None,
    released: bool = False,
) -> tuple[Surface, Job]:
    """Store the stereo inputs and create the survey with its processing job."""
    if not stated_accuracy_m or stated_accuracy_m <= 0:
        raise AnalysisError("A survey needs the expected vertical accuracy (RMSE, metres).")
    validate_stereo_inputs(camera_model, set(files))
    check_datum_matches_site(site, ENGINE_DATUM, db)

    surface = Surface(
        id=uuid.uuid4(),
        site_id=site.id,
        kind=KIND_SURVEY,
        name=name,
        survey_date=survey_date,
        source_type=SOURCE_STEREO,
        vertical_datum=ENGINE_DATUM,
        stated_accuracy_m=stated_accuracy_m,
        released=released,
        original_filename=", ".join(filename for _, filename in files.values())[:300],
        created_by=user_id,
    )
    inputs = storage.surface_inputs_dir(site.id, surface.id)
    inputs.mkdir(parents=True, exist_ok=True)
    manifest = []
    for role, (tmp_path, filename) in files.items():
        # Keep the extension: ASP chooses file readers and camera parsers by it.
        target = inputs / f"{role}{Path(filename).suffix.lower()}"
        shutil.move(tmp_path, target)
        manifest.append(
            {
                "role": role,
                "filename": filename,
                "stored_as": target.name,
                "sha256": _sha256(target),
                "size_bytes": target.stat().st_size,
            }
        )
    surface.provenance = {
        "source": {
            "type": SOURCE_STEREO,
            "camera_model": camera_model,
            "files": manifest,
            "bundle_adjust": bundle_adjust,
            "requested_resolution_m": resolution_m,
            "declared_vertical_datum": ENGINE_DATUM,
            "stated_accuracy_m": stated_accuracy_m,
            "uploaded_at": now_iso(),
            "uploaded_by": str(user_id) if user_id else None,
        }
    }
    db.add(surface)
    db.flush()
    job = Job(site_id=site.id, kind="stereo_surface", surface_id=surface.id, created_by=user_id)
    db.add(job)
    return surface, job


def build_stereo_surface(db: Session, surface: Surface, log: Log) -> None:
    """Stereo pair -> DEM and orthoimage with the engine, then the normal ingest path
    (height-reference conversion, site grid, alignment to the baseline)."""
    site = surface.site
    source = surface.provenance["source"]
    inputs = storage.surface_inputs_dir(site.id, surface.id)
    files = {item["role"]: inputs / item["stored_as"] for item in source["files"]}
    work = storage.surface_work_dir(site.id, surface.id)
    storage.remove_tree(work)  # a retry starts clean

    engine = get_engine()
    version = engine.version()
    log(f"Engine: {engine.name} {version}")
    result = engine.build_dem(
        StereoRequest(
            camera_model=source["camera_model"],
            files=files,
            workdir=work / "stereo",
            target_epsg=utm_crs_for_geometry(site_geometry(site)).to_epsg(),
            resolution_m=source.get("requested_resolution_m"),
            bundle_adjust=bool(source.get("bundle_adjust")),
        ),
        log,
    )
    shutil.copyfile(result.dem, storage.surface_original_path(site.id, surface.id))
    if result.orthoimage is not None:
        shutil.copyfile(result.orthoimage, storage.surface_ortho_raw_path(site.id, surface.id))
    surface.provenance = surface.provenance | {
        "engine": {
            "name": engine.name,
            "version": version,
            "parameters": result.parameters,
            "commands": result.commands,
            "intersection_error": _intersection_error_summary(result.intersection_error),
            "built_at": now_iso(),
        }
    }
    db.flush()
    ingest_surface(db, surface, log)
    if not get_settings().keep_engine_workdir:
        storage.remove_tree(work)


def _intersection_error_summary(path: Path | None) -> dict | None:
    """Median and 90th percentile of the triangulation error (how well the two views
    agree on each point), a per-survey quality indicator independent of any reference."""
    if path is None or not path.exists():
        return None
    import numpy as np
    import rasterio

    with rasterio.open(path) as src:
        scale = max(1, max(src.width, src.height) // 1024)
        sample = src.read(
            1, out_shape=(max(1, src.height // scale), max(1, src.width // scale)), masked=True
        ).compressed()
    if sample.size == 0:
        return None
    return {"median_m": float(np.median(sample)), "p90_m": float(np.percentile(sample, 90))}

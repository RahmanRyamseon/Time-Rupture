"""Survey epochs, design surfaces, DEM-of-Difference analyses, progress and jobs."""
import os
import tempfile
import uuid
from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Form, HTTPException, Response, UploadFile, status
from starlette.concurrency import run_in_threadpool
from sqlalchemy import select

from app import storage
from app.config import get_settings
from app.deps import (
    AnalysisDep,
    AnalystUser,
    CurrentUser,
    DbSession,
    SiteDep,
    SurfaceDep,
    analysis_visible_to_viewer,
    surface_visible_to_viewer,
)
from app.engines.base import EngineError
from app.geo.raster_io import RasterInputError
from app.geo.volume import AnalysisError
from app.jobs.runner import dispatch, reset_for_retry
from app.models import JOB_FAILED, KIND_SURVEY, ROLE_ANALYST, STATUS_READY, Analysis, Job, Surface
from app.schemas import (
    AnalysisCreate,
    AnalysisOut,
    JobDetail,
    JobOut,
    ReferenceIn,
    SurfaceKind,
    SurfaceOut,
    SurfaceUpdate,
    VerticalDatum,
)
from app.services import analysis as analysis_service
from app.services.stereo import PAIR_ROLES, SCENE_ROLE, register_stereo_survey
from app.services.surfaces import register_surface

router = APIRouter(tags=["surfaces"])
_CHUNK = 4 * 1024 * 1024


def _unprocessable(exc: Exception) -> HTTPException:
    return HTTPException(422, str(exc))


def _analysis_out(analysis: Analysis) -> AnalysisOut:
    return AnalysisOut(
        id=analysis.id,
        site_id=analysis.site_id,
        from_surface_id=analysis.from_surface_id,
        to_surface_id=analysis.to_surface_id,
        status=analysis.status,
        stale=analysis_service.is_stale(analysis),
        lod_override_m=analysis.lod_override_m,
        results=analysis.results if analysis.status == STATUS_READY else None,
        provenance=analysis.provenance,
        error=analysis.error,
        computed_at=analysis.computed_at,
    )


# --- surfaces ---


@router.get("/sites/{site_id}/surfaces", response_model=list[SurfaceOut])
def list_surfaces(site: SiteDep, user: CurrentUser):
    surfaces = site.surfaces
    if user.role != ROLE_ANALYST:
        surfaces = [s for s in surfaces if surface_visible_to_viewer(s)]
    return [SurfaceOut.from_model(s) for s in surfaces]


@router.post("/sites/{site_id}/surfaces", response_model=SurfaceOut, status_code=status.HTTP_201_CREATED)
async def upload_surface(
    site: SiteDep,
    user: AnalystUser,
    db: DbSession,
    file: UploadFile,
    kind: Annotated[SurfaceKind, Form()],
    name: Annotated[str, Form(min_length=1, max_length=200)],
    vertical_datum: Annotated[VerticalDatum, Form()],
    survey_date: Annotated[date | None, Form()] = None,
    stated_accuracy_m: Annotated[float | None, Form(gt=0, le=100)] = None,
):
    """Upload a DEM/DSM GeoTIFF as a survey epoch or as the site's design surface.

    The file is checked immediately (CRS, bands, overlap with the site); reprojection,
    alignment and the default analyses then run in the background worker.
    """
    settings = get_settings()
    limit = settings.max_dem_upload_mb * 1024 * 1024
    incoming = storage.site_dir(site.id) / "incoming"
    incoming.mkdir(parents=True, exist_ok=True)
    handle, tmp_path = tempfile.mkstemp(suffix=".tif", dir=incoming)
    try:
        size = 0
        with os.fdopen(handle, "wb") as out:
            while chunk := await file.read(_CHUNK):
                size += len(chunk)
                if size > limit:
                    raise HTTPException(
                        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        f"The file is larger than the {settings.max_dem_upload_mb} MB limit.",
                    )
                out.write(chunk)
        try:
            surface, job = register_surface(
                db,
                site,
                src_path=tmp_path,
                filename=file.filename or "upload.tif",
                kind=kind,
                name=name,
                survey_date=survey_date,
                vertical_datum=vertical_datum,
                stated_accuracy_m=stated_accuracy_m,
                user_id=user.id,
            )
        except (RasterInputError, AnalysisError) as exc:
            raise _unprocessable(exc) from exc
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
    dispatch(db, [job])
    return SurfaceOut.from_model(db.get(Surface, surface.id))


async def _save_upload(file: UploadFile, directory, limit: int, limit_mb: int) -> str:
    handle, tmp_path = tempfile.mkstemp(dir=directory)
    size = 0
    try:
        with os.fdopen(handle, "wb") as out:
            while chunk := await file.read(_CHUNK):
                size += len(chunk)
                if size > limit:
                    raise HTTPException(
                        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        f"'{file.filename}' is larger than the {limit_mb} MB limit.",
                    )
                out.write(chunk)
    except BaseException:
        os.remove(tmp_path)
        raise
    return tmp_path


@router.post(
    "/sites/{site_id}/stereo-surveys", response_model=SurfaceOut, status_code=status.HTTP_201_CREATED
)
async def upload_stereo_survey(
    site: SiteDep,
    user: AnalystUser,
    db: DbSession,
    camera_model: Annotated[str, Form()],
    name: Annotated[str, Form(min_length=1, max_length=200)],
    survey_date: Annotated[date, Form()],
    stated_accuracy_m: Annotated[float, Form(gt=0, le=100)],
    bundle_adjust: Annotated[bool, Form()] = False,
    resolution_m: Annotated[float | None, Form(gt=0, le=1000)] = None,
    scene: UploadFile | None = None,
    left_image: UploadFile | None = None,
    right_image: UploadFile | None = None,
    left_camera: UploadFile | None = None,
    right_camera: UploadFile | None = None,
):
    """Create a survey epoch from a satellite stereo pair.

    Send either `scene` (a single-file product such as an ASTER L1A .hdf) or
    `left_image` + `right_image`, with `left_camera` + `right_camera` unless the camera
    model is embedded in the images. The worker builds the DEM and orthoimage with the
    photogrammetry engine, then aligns the DEM to the site's baseline.
    """
    settings = get_settings()
    uploads = {
        role: upload
        for role, upload in zip(
            (SCENE_ROLE, *PAIR_ROLES), (scene, left_image, right_image, left_camera, right_camera)
        )
        if upload is not None and upload.filename
    }
    incoming = storage.site_dir(site.id) / "incoming"
    incoming.mkdir(parents=True, exist_ok=True)
    limit = settings.max_stereo_upload_mb * 1024 * 1024
    saved: dict[str, tuple[str, str]] = {}
    try:
        for role, upload in uploads.items():
            path = await _save_upload(upload, incoming, limit, settings.max_stereo_upload_mb)
            saved[role] = (path, upload.filename or role)
        try:
            surface, job = register_stereo_survey(
                db,
                site,
                files=saved,
                camera_model=camera_model,
                name=name,
                survey_date=survey_date,
                stated_accuracy_m=stated_accuracy_m,
                bundle_adjust=bundle_adjust,
                resolution_m=resolution_m,
                user_id=user.id,
            )
        except (AnalysisError, EngineError) as exc:
            raise _unprocessable(exc) from exc
    finally:
        for path, _ in saved.values():
            if os.path.exists(path):
                os.remove(path)
    dispatch(db, [job])
    return SurfaceOut.from_model(db.get(Surface, surface.id))


@router.patch("/surfaces/{surface_id}", response_model=SurfaceOut)
def update_surface(body: SurfaceUpdate, surface: SurfaceDep, _: AnalystUser, db: DbSession):
    if body.name is not None:
        surface.name = body.name
    if body.released is not None:
        if body.released and surface.status != STATUS_READY:
            raise HTTPException(400, "Only a surface that finished processing can be released.")
        surface.released = body.released
    db.commit()
    return SurfaceOut.from_model(surface)


@router.delete("/surfaces/{surface_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_surface(surface: SurfaceDep, _: AnalystUser, db: DbSession):
    site = surface.site
    others = [s for s in site.surfaces if s.kind == KIND_SURVEY and s.id != surface.id]
    if site.reference_surface_id == surface.id and others:
        raise HTTPException(
            400,
            "This is the site's baseline survey. Choose another baseline before deleting it.",
        )
    analysis_ids = db.scalars(
        select(Analysis.id).where(
            (Analysis.from_surface_id == surface.id) | (Analysis.to_surface_id == surface.id)
        )
    ).all()
    site_id, surface_id = site.id, surface.id
    db.delete(surface)
    db.commit()
    storage.remove_tree(storage.surface_dir(site_id, surface_id))
    for analysis_id in analysis_ids:
        storage.remove_tree(storage.analysis_dir(site_id, analysis_id))


@router.post("/sites/{site_id}/reference", response_model=list[SurfaceOut])
def set_reference(body: ReferenceIn, site: SiteDep, user: AnalystUser, db: DbSession):
    """Make a survey the baseline. Every survey is re-aligned and every analysis recomputed."""
    surface = db.get(Surface, body.surface_id)
    if surface is None or surface.site_id != site.id or surface.kind != KIND_SURVEY:
        raise HTTPException(404, "Survey not found on this site")
    if surface.status != STATUS_READY:
        raise HTTPException(400, "Only a survey that finished processing can be the baseline.")
    if site.reference_surface_id != surface.id:
        site.reference_surface_id = surface.id
        job = Job(site_id=site.id, kind="realign_site", created_by=user.id)
        db.add(job)
        dispatch(db, [job])
    return [SurfaceOut.from_model(s) for s in site.surfaces]


# --- analyses ---


@router.get("/sites/{site_id}/analyses", response_model=list[AnalysisOut])
def list_analyses(site: SiteDep, user: CurrentUser, db: DbSession):
    analyses = db.scalars(
        select(Analysis).where(Analysis.site_id == site.id).order_by(Analysis.created_at)
    ).all()
    if user.role != ROLE_ANALYST:
        analyses = [a for a in analyses if analysis_visible_to_viewer(a)]
    return [_analysis_out(a) for a in analyses]


@router.post("/sites/{site_id}/analyses", response_model=AnalysisOut, status_code=status.HTTP_202_ACCEPTED)
def create_analysis(body: AnalysisCreate, site: SiteDep, user: AnalystUser, db: DbSession):
    """Compute (or recompute) the DEM of Difference `to` minus `from` for any two surfaces."""
    from_surface = db.get(Surface, body.from_surface_id)
    to_surface = db.get(Surface, body.to_surface_id)
    if not from_surface or not to_surface or {from_surface.site_id, to_surface.site_id} != {site.id}:
        raise HTTPException(404, "Surface not found on this site")
    try:
        job = analysis_service.ensure_analysis(
            db, site, from_surface, to_surface, user_id=user.id, lod_override_m=body.lod_m
        )
    except AnalysisError as exc:
        raise _unprocessable(exc) from exc
    analysis_id = job.analysis_id
    dispatch(db, [job])
    return _analysis_out(db.get(Analysis, analysis_id))


@router.get("/analyses/{analysis_id}", response_model=AnalysisOut)
def read_analysis(analysis: AnalysisDep):
    return _analysis_out(analysis)


@router.get("/sites/{site_id}/progress")
def read_progress(site: SiteDep, user: CurrentUser, db: DbSession):
    return analysis_service.site_progress(db, site, released_only=user.role != ROLE_ANALYST)


# --- report ---


@router.get("/sites/{site_id}/report.pdf")
async def site_report(
    site: SiteDep,
    user: CurrentUser,
    db: DbSession,
    surface_id: uuid.UUID,
    lang: Literal["en", "ar", "both"] = "en",
):
    """PDF report for one survey epoch: summary, maps, volumes with uncertainty, progress
    chart, method and data-source notes. `lang=both` gives English then Arabic."""
    from app.reports.report import ReportError, build_report_html, render_pdf

    surface = db.get(Surface, surface_id)
    if surface is None or surface.site_id != site.id:
        raise HTTPException(404, "Survey not found on this site")
    languages = ("en", "ar") if lang == "both" else (lang,)
    try:
        html = build_report_html(db, site, surface, languages, released_only=user.role != ROLE_ANALYST)
    except ReportError as exc:
        raise HTTPException(404, str(exc)) from exc
    pdf = await run_in_threadpool(render_pdf, html)
    filename = f"report-{surface.survey_date.isoformat()}-{lang}.pdf"
    return Response(
        pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"', "Cache-Control": "private, no-store"},
    )


# --- jobs (analysts only) ---


@router.get("/sites/{site_id}/jobs", response_model=list[JobOut])
def list_jobs(site: SiteDep, _: AnalystUser, db: DbSession):
    return db.scalars(
        select(Job).where(Job.site_id == site.id).order_by(Job.created_at.desc()).limit(200)
    ).all()


def _job(job_id: uuid.UUID, db: DbSession) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(404, "Job not found")
    return job


@router.get("/jobs/{job_id}", response_model=JobDetail)
def read_job(job_id: uuid.UUID, _: AnalystUser, db: DbSession):
    return _job(job_id, db)


@router.post("/jobs/{job_id}/retry", response_model=JobOut)
def retry_job(job_id: uuid.UUID, _: AnalystUser, db: DbSession):
    job = _job(job_id, db)
    if job.status != JOB_FAILED:
        raise HTTPException(400, "Only a failed job can be retried.")
    reset_for_retry(db, job)
    dispatch(db, [job])
    return db.get(Job, job_id)

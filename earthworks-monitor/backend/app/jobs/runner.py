"""Background job execution: status tracking, logs and failure handling."""
from __future__ import annotations

import logging
import traceback
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import new_session
from app.geo.raster_io import RasterInputError
from app.geo.volume import AnalysisError
from app.models import (
    JOB_DONE,
    JOB_FAILED,
    JOB_QUEUED,
    JOB_RUNNING,
    KIND_SURVEY,
    STATUS_FAILED,
    STATUS_PROCESSING,
    STATUS_READY,
    Analysis,
    Job,
    Site,
    Surface,
)
from app.services import analysis as analysis_service
from app.services import surfaces as surface_service

log = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def dispatch(db: Session, jobs: list[Job], *, eager: bool | None = None) -> None:
    """Commit and hand jobs to the worker (or run them inline when eager)."""
    db.commit()
    if not jobs:
        return
    run_inline = get_settings().jobs_eager if eager is None else eager
    job_ids = [str(job.id) for job in jobs]
    if run_inline:
        for job_id in job_ids:
            run_job(job_id, eager=True)
        db.expire_all()  # the inline run used its own session
        return
    from app.worker import get_queue

    queue = get_queue()
    for job_id in job_ids:
        queue.enqueue(run_job, job_id, job_timeout=get_settings().job_timeout_seconds)


def run_job(job_id: str, eager: bool = False) -> None:
    with new_session() as db:
        job = db.get(Job, uuid.UUID(job_id))
        if job is None:  # its site or surface was deleted while queued
            return
        job.status = JOB_RUNNING
        job.attempts += 1
        job.started_at = _now()
        job.finished_at = None
        job.error = None
        db.commit()

        def write(message: str) -> None:
            job.log += f"[{_now().strftime('%Y-%m-%d %H:%M:%S')}Z] {message}\n"
            db.commit()

        write(f"Attempt {job.attempts}: {job.kind} started")
        try:
            follow_ups = _HANDLERS[job.kind](db, job, write)
            job.status = JOB_DONE
            job.finished_at = _now()
            write("Finished")
        except (RasterInputError, AnalysisError) as exc:
            db.rollback()
            _fail(db, job, str(exc), write)
            return
        except Exception:  # noqa: BLE001 - a job must never take the worker down
            db.rollback()
            log.exception("Job %s failed", job_id)
            write(traceback.format_exc())
            _fail(db, job, "Unexpected processing error. See the job log for details.", write)
            return
        dispatch(db, follow_ups, eager=eager)


def _fail(db: Session, job: Job, message: str, write) -> None:
    job = db.get(Job, job.id)
    job.status = JOB_FAILED
    job.error = message
    job.finished_at = _now()
    target = _target(db, job)
    if target is not None:
        target.status = STATUS_FAILED
        target.error = message
    write(f"FAILED: {message}")


def _target(db: Session, job: Job) -> Surface | Analysis | None:
    if job.kind == "ingest_surface":
        return db.get(Surface, job.surface_id)
    if job.kind == "analysis":
        return db.get(Analysis, job.analysis_id)
    return None


def reset_for_retry(db: Session, job: Job) -> None:
    job.status = JOB_QUEUED
    job.error = None
    target = _target(db, job)
    if target is not None:
        target.status = STATUS_PROCESSING
        target.error = None


# ------------------------------------------------------------------------ handlers


def _ingest_surface(db: Session, job: Job, write) -> list[Job]:
    surface = db.get(Surface, job.surface_id)
    surface_service.ingest_surface(db, surface, write)
    db.flush()
    return analysis_service.schedule_default_analyses(db, surface.site, surface)


def _analysis(db: Session, job: Job, write) -> list[Job]:
    analysis_service.run_analysis(db, db.get(Analysis, job.analysis_id), write)
    return []


def _realign_site(db: Session, job: Job, write) -> list[Job]:
    """After the baseline changes: re-align every survey, then recompute every analysis."""
    site = db.get(Site, job.site_id)
    for surface in site.surfaces:
        if surface.kind == KIND_SURVEY and surface.status == STATUS_READY:
            write(f"Re-aligning '{surface.name}'")
            surface_service.align_surface(db, surface, write)
    db.flush()
    jobs = []
    for analysis in db.scalars(select(Analysis).where(Analysis.site_id == site.id)):
        try:
            jobs.append(
                analysis_service.ensure_analysis(
                    db,
                    site,
                    analysis.from_surface,
                    analysis.to_surface,
                    lod_override_m=analysis.lod_override_m,
                )
            )
        except AnalysisError as exc:
            write(f"Skipped an analysis: {exc}")
    for surface in site.surfaces:
        jobs.extend(analysis_service.schedule_default_analyses(db, site, surface))
    return [j for j in jobs if j is not None]


_HANDLERS = {
    "ingest_surface": _ingest_surface,
    "analysis": _analysis,
    "realign_site": _realign_site,
}

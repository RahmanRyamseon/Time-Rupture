"""Running DEM-of-Difference analyses and deriving progress from them."""
from __future__ import annotations

import hashlib
import json
import math
import os
from datetime import datetime, timezone

from geoalchemy2.shape import to_shape
from pyproj import CRS
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import storage
from app.config import get_settings
from app.geo.grid import WGS84, areal_scale_factor, reproject_geometry
from app.geo.volume import AnalysisError, Uncertainty, compute_dod, finalize_volumes, measure_stable_ground
from app.models import (
    KIND_DESIGN,
    KIND_SURVEY,
    STATUS_PROCESSING,
    STATUS_READY,
    Analysis,
    Job,
    Site,
    Surface,
)
from app.services.surfaces import (
    ALIGN_SHIFT,
    Log,
    now_iso,
    raster_surface,
    site_geometry,
    software_versions,
    stable_ground_exclusions,
)

SITE_KEY = "__site__"


def _settings_fingerprint() -> dict:
    s = get_settings()
    return {
        "lod_sigma_multiplier": s.lod_sigma_multiplier,
        "confidence_z": s.confidence_z,
        "uncertainty_correlation_pixels": s.uncertainty_correlation_pixels,
        "stable_zone_buffer_m": s.stable_zone_buffer_m,
        "min_stable_pixels": s.min_stable_pixels,
    }


def current_inputs_hash(analysis: Analysis) -> str:
    """Fingerprint of everything a result depends on. A stored result whose hash no
    longer matches (zones edited, surfaces re-aligned, settings changed) is stale."""
    site = analysis.site

    def surface_part(surface: Surface) -> list:
        path = storage.surface_dem_path(surface.site_id, surface.id)
        mtime = os.path.getmtime(path) if path.exists() else None
        return [str(surface.id), round(surface.vertical_offset_m, 6), mtime, surface.alignment and surface.alignment.get("aligned_at")]

    payload = {
        "site": to_shape(site.geom).wkb_hex,
        "zones": sorted([str(z.id), z.name, z.zone_type, to_shape(z.geom).wkb_hex] for z in site.zones),
        "from": surface_part(analysis.from_surface),
        "to": surface_part(analysis.to_surface),
        "lod_override_m": analysis.lod_override_m,
        "settings": _settings_fingerprint(),
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def is_stale(analysis: Analysis) -> bool:
    return analysis.status == STATUS_READY and analysis.inputs_hash != current_inputs_hash(analysis)


def ensure_analysis(
    db: Session,
    site: Site,
    from_surface: Surface,
    to_surface: Surface,
    *,
    user_id=None,
    lod_override_m: float | None = None,
    recompute: bool = True,
) -> Job | None:
    """Create (or reset) the analysis for a pair and return the job that computes it.

    Returns None when the analysis already exists and `recompute` is False.
    """
    validate_pair(from_surface, to_surface)
    analysis = db.scalar(
        select(Analysis).where(
            Analysis.from_surface_id == from_surface.id, Analysis.to_surface_id == to_surface.id
        )
    )
    if analysis is not None and not recompute:
        return None
    if analysis is None:
        analysis = Analysis(site_id=site.id, from_surface_id=from_surface.id, to_surface_id=to_surface.id)
        db.add(analysis)
    analysis.status = STATUS_PROCESSING
    analysis.error = None
    analysis.lod_override_m = lod_override_m
    db.flush()
    job = Job(site_id=site.id, kind="analysis", analysis_id=analysis.id, created_by=user_id)
    db.add(job)
    return job


def validate_pair(from_surface: Surface, to_surface: Surface) -> None:
    if from_surface.id == to_surface.id:
        raise AnalysisError("Choose two different surfaces to compare.")
    if from_surface.site_id != to_surface.site_id:
        raise AnalysisError("Both surfaces must belong to the same site.")
    if from_surface.kind == KIND_DESIGN and to_surface.kind == KIND_DESIGN:
        raise AnalysisError("At least one of the two surfaces must be a survey.")
    for surface in (from_surface, to_surface):
        if surface.status != STATUS_READY:
            raise AnalysisError(f"'{surface.name}' has not finished processing.")
    if from_surface.vertical_datum != to_surface.vertical_datum:
        raise AnalysisError(
            f"'{from_surface.name}' uses {from_surface.vertical_datum} heights and "
            f"'{to_surface.name}' uses {to_surface.vertical_datum}. Surfaces are only compared "
            "within one vertical datum."
        )


def schedule_default_analyses(db: Session, site: Site, surface: Surface) -> list[Job]:
    """Analyses every site wants: since baseline, since previous survey, design vs baseline."""
    reference = db.get(Surface, site.reference_surface_id) if site.reference_surface_id else None
    if reference is None or reference.status != STATUS_READY:
        return []
    ready = [s for s in site.surfaces if s.status == STATUS_READY]
    surveys = sorted(
        (s for s in ready if s.kind == KIND_SURVEY), key=lambda s: (s.survey_date, s.created_at)
    )
    design = next((s for s in ready if s.kind == KIND_DESIGN), None)

    pairs: list[tuple[Surface, Surface]] = []
    if surface.kind == KIND_SURVEY and surface.id != reference.id:
        pairs.append((reference, surface))
        index = surveys.index(surface)
        if index > 0:
            pairs.append((surveys[index - 1], surface))
        if index + 1 < len(surveys):
            pairs.append((surface, surveys[index + 1]))
    if design is not None:
        pairs.append((reference, design))

    jobs, seen = [], set()
    for from_surface, to_surface in pairs:
        key = (from_surface.id, to_surface.id)
        if from_surface.id == to_surface.id or key in seen:
            continue
        seen.add(key)
        try:
            job = ensure_analysis(db, site, from_surface, to_surface, recompute=False)
        except AnalysisError:
            continue
        if job is not None:
            jobs.append(job)
    return jobs


def _pair_uncertainty(
    from_surface: Surface, to_surface: Surface, exclusions, lod_override_m: float | None, log: Log
) -> tuple[float, float, dict]:
    """Choose the 1-sigma pixel and systematic height errors for a pair (METHOD.md §4)."""
    settings = get_settings()
    surveys = [s for s in (from_surface, to_surface) if s.kind == KIND_SURVEY]
    if len(surveys) == 2:
        stats = measure_stable_ground(
            raster_surface(from_surface),
            raster_surface(to_surface),
            exclusions,
            center=0.0,
            min_pixels=settings.min_stable_pixels,
            lod_sigma_multiplier=settings.lod_sigma_multiplier,
            lod_m=lod_override_m,
        )
        if stats is not None:
            systematic = stats.systematic_m if stats.systematic_m is not None else stats.rmse_m
            log(
                f"Stable ground: {stats.area_m2 / 1e4:.1f} ha, RMSE {stats.rmse_m:.3f} m, "
                f"regional (systematic) spread {systematic:.3f} m"
            )
            return stats.rmse_m, systematic, {"source": "stable_ground", "stable_ground": stats.as_dict()}
        sigma = math.hypot(*(s.stated_accuracy_m for s in surveys))
        log("No measurable stable ground: using the surveys' stated accuracies, fully correlated")
        return sigma, sigma, {"source": "stated_accuracy", "stable_ground": None}

    survey = surveys[0]
    alignment = survey.alignment or {}
    if alignment.get("method") == ALIGN_SHIFT:
        sigma = alignment["residual_rmse_m"]
        systematic = alignment.get("residual_systematic_m")
        return sigma, systematic if systematic is not None else sigma, {
            "source": "alignment_residual",
            "stable_ground": None,
        }
    sigma = survey.stated_accuracy_m
    return sigma, sigma, {"source": "stated_accuracy", "stable_ground": None}


def run_analysis(db: Session, analysis: Analysis, log: Log) -> None:
    settings = get_settings()
    site = analysis.site
    from_surface, to_surface = analysis.from_surface, analysis.to_surface
    validate_pair(from_surface, to_surface)

    crs = CRS.from_epsg(from_surface.grid_epsg)
    site_geom_wgs84 = site_geometry(site)
    regions = {SITE_KEY: reproject_geometry(site_geom_wgs84, WGS84, crs)}
    for zone in site.zones:
        regions[str(zone.id)] = reproject_geometry(to_shape(zone.geom), WGS84, crs)
    centroid = site_geom_wgs84.centroid
    areal_scale = areal_scale_factor(crs, centroid.x, centroid.y)

    sigma_px, sigma_sys, how = _pair_uncertainty(
        from_surface, to_surface, stable_ground_exclusions(site, crs), analysis.lod_override_m, log
    )
    measured = how.get("stable_ground") or {}
    resolution = max(from_surface.resolution_m, to_surface.resolution_m)
    lod = (
        analysis.lod_override_m
        if analysis.lod_override_m is not None
        else settings.lod_sigma_multiplier * sigma_px
    )
    uncertainty = Uncertainty(
        sigma_pixel_m=sigma_px,
        sigma_systematic_m=sigma_sys,
        correlation_length_m=settings.uncertainty_correlation_pixels * resolution,
        confidence_z=settings.confidence_z,
        lod_m=lod,
        measured_leak_cut_m=measured.get("leak_cut_m"),
        measured_leak_fill_m=measured.get("leak_fill_m"),
    )
    log(f"Level of detection {lod:.3f} m; differencing '{to_surface.name}' minus '{from_surface.name}'")

    dod_path = storage.analysis_dod_path(site.id, analysis.id)
    dod_path.parent.mkdir(parents=True, exist_ok=True)
    out = compute_dod(
        raster_surface(from_surface),
        raster_surface(to_surface),
        regions,
        lod,
        areal_scale=areal_scale,
        out_path=str(dod_path),
    )
    volumes = {key: finalize_volumes(acc, out.pixel_area_m2, uncertainty).as_dict() for key, acc in out.sums.items()}
    from rasterio.warp import transform_bounds

    analysis.results = {
        "site": volumes[SITE_KEY],
        "zones": [
            {"zone_id": str(z.id), "name": z.name, "zone_type": z.zone_type} | volumes[str(z.id)]
            for z in site.zones
        ],
        "lod_m": lod,
        "uncertainty": {
            "sigma_pixel_m": sigma_px,
            "sigma_systematic_m": sigma_sys,
            "correlation_length_m": uncertainty.correlation_length_m,
            "confidence_z": uncertainty.confidence_z,
        }
        | how,
        "pixel_area_m2": out.pixel_area_m2,
        "resolution_m": out.resolution_m,
        "grid_epsg": crs.to_epsg(),
        "display_range_m": out.display_range_m,
        "bounds_wgs84": list(transform_bounds(crs.to_wkt(), "EPSG:4326", *out.bounds)),
    }
    analysis.provenance = {
        "inputs": [
            {
                "role": role,
                "surface_id": str(s.id),
                "name": s.name,
                "kind": s.kind,
                "survey_date": s.survey_date.isoformat() if s.survey_date else None,
                "filename": s.original_filename,
                "sha256": s.provenance.get("source", {}).get("sha256"),
                "vertical_datum": s.vertical_datum,
                "stated_accuracy_m": s.stated_accuracy_m,
                "vertical_offset_applied_m": s.vertical_offset_m,
                "alignment": s.alignment,
            }
            for role, s in (("from", from_surface), ("to", to_surface))
        ],
        "parameters": _settings_fingerprint()
        | {"lod_override_m": analysis.lod_override_m, "areal_scale_factor": areal_scale},
        "software": software_versions(),
        "computed_at": now_iso(),
    }
    analysis.inputs_hash = current_inputs_hash(analysis)
    analysis.computed_at = datetime.now(timezone.utc)
    analysis.status = STATUS_READY
    analysis.error = None
    site_result = volumes[SITE_KEY]
    log(
        f"Site: cut {site_result['cut_m3']:,.0f} ± {site_result['cut_pm_m3']:,.0f} m³, "
        f"fill {site_result['fill_m3']:,.0f} ± {site_result['fill_pm_m3']:,.0f} m³"
    )


# ------------------------------------------------------------------------ progress


def _achieved(volume: dict, zone_type: str) -> tuple[float, float]:
    """The quantity progress is measured in, by zone type, with its +/- range."""
    if zone_type == "cut":
        return volume["cut_m3"], volume["cut_pm_m3"]
    if zone_type == "fill":
        return volume["fill_m3"], volume["fill_pm_m3"]
    return volume["cut_m3"] + volume["fill_m3"], volume["net_pm_m3"]


def progress_ratio(achieved: float, achieved_pm: float, design: float, design_pm: float) -> tuple[float | None, float | None]:
    """Progress = achieved / design, with first-order propagation of both +/- ranges."""
    if design <= 0:
        return None, None
    ratio = achieved / design
    pm = math.hypot(achieved_pm / design, ratio * design_pm / design)
    return ratio, pm


def site_progress(db: Session, site: Site, released_only: bool) -> dict:
    """Progress per survey epoch and zone: volume achieved since the baseline divided by
    the volume the design requires from the same baseline."""
    reference = db.get(Surface, site.reference_surface_id) if site.reference_surface_id else None

    def visible(surface: Surface | None) -> bool:
        return surface is not None and surface.status == STATUS_READY and (surface.released or not released_only)

    design = next((s for s in site.surfaces if s.kind == KIND_DESIGN), None)
    if not visible(reference) or not visible(design):
        return {"available": False, "epochs": []}
    analyses = {
        (a.from_surface_id, a.to_surface_id): a
        for a in db.scalars(
            select(Analysis).where(Analysis.site_id == site.id, Analysis.from_surface_id == reference.id)
        )
        if a.status == STATUS_READY and a.results
    }
    planned = analyses.get((reference.id, design.id))
    if planned is None:
        return {"available": False, "epochs": []}
    planned_by_zone = {z["zone_id"]: z for z in planned.results["zones"]}

    epochs = []
    for survey in site.surfaces:
        if survey.kind != KIND_SURVEY or not visible(survey):
            continue
        done = analyses.get((reference.id, survey.id))
        if survey.id != reference.id and done is None:
            continue
        zones = []
        for zone in site.zones:
            plan = planned_by_zone.get(str(zone.id))
            if plan is None:
                continue
            design_volume, design_pm = _achieved(plan, zone.zone_type)
            if survey.id == reference.id:
                achieved, achieved_pm = 0.0, 0.0
            else:
                current = next((z for z in done.results["zones"] if z["zone_id"] == str(zone.id)), None)
                if current is None:
                    continue
                achieved, achieved_pm = _achieved(current, zone.zone_type)
            ratio, ratio_pm = progress_ratio(achieved, achieved_pm, design_volume, design_pm)
            zones.append(
                {
                    "zone_id": str(zone.id),
                    "name": zone.name,
                    "zone_type": zone.zone_type,
                    "achieved_m3": achieved,
                    "achieved_pm_m3": achieved_pm,
                    "design_m3": design_volume,
                    "design_pm_m3": design_pm,
                    "progress": ratio,
                    "progress_pm": ratio_pm,
                }
            )
        epochs.append(
            {
                "surface_id": str(survey.id),
                "name": survey.name,
                "survey_date": survey.survey_date.isoformat(),
                "is_reference": survey.id == reference.id,
                "zones": zones,
            }
        )
    return {"available": True, "epochs": epochs}

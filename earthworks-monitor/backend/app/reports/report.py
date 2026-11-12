"""One-click PDF report for a site and survey epoch: HTML rendered to PDF with WeasyPrint,
so Arabic is shaped and laid out right-to-left correctly with the bundled Noto fonts."""
from __future__ import annotations

import base64
import json
from datetime import date, datetime, timezone
from functools import lru_cache
from pathlib import Path

from geoalchemy2.shape import to_shape
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pyproj import CRS
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import storage
from app.config import get_settings
from app.geo.grid import WGS84, reproject_geometry
from app.geo.vector_io import geodesic_area_m2
from app.models import KIND_DESIGN, KIND_SURVEY, STATUS_READY, Analysis, Site, Surface
from app.reports.charts import progress_chart_svg, zone_color
from app.reports.maps import render_site_map
from app.services import analysis as analysis_service
from app.services.surfaces import ALIGN_NONE, ALIGN_REFERENCE, ALIGN_SHIFT, SOURCE_STEREO, software_versions

HERE = Path(__file__).parent
LANGUAGES = ("en", "ar")


class ReportError(ValueError):
    """The report cannot be produced; the message is safe to show."""


@lru_cache
def _strings(lang: str) -> dict:
    return json.loads((HERE / "i18n" / f"{lang}.json").read_text(encoding="utf-8"))


@lru_cache
def _environment() -> Environment:
    return Environment(loader=FileSystemLoader(HERE), autoescape=select_autoescape(["html"]))


# ------------------------------------------------------------------ formatting
# Western digits in both languages, as is usual in Gulf engineering documents.


def fmt_int(value: float) -> str:
    return f"{value:,.0f}".replace("-", "−")


def fmt_num(value: float, digits: int = 2) -> str:
    return f"{value:,.{digits}f}".replace("-", "−")


def fmt_date(value: date | None, t: dict) -> str:
    return f"{value.day} {t['months'][value.month - 1]} {value.year}" if value else "–"


def fmt_area(area_m2: float) -> str:
    return f"{fmt_num(area_m2 / 1e4, 1)} ha" if area_m2 < 1e6 else f"{fmt_num(area_m2 / 1e6, 2)} km²"


def fmt_progress(ratio: float | None, pm: float | None) -> str | None:
    if ratio is None:
        return None
    return f"{fmt_num(ratio * 100, 1)}%" + (f" ± {fmt_num(pm * 100, 1)}" if pm is not None else "")


def confidence_percent(z: float) -> str:
    import math

    return fmt_num(math.erf(z / math.sqrt(2)) * 100, 0 if abs(z - 1.96) < 0.01 else 1)


def _volume_row(name: str, v: dict, total: bool = False, progress: str | None = None) -> dict:
    return {
        "name": name, "total": total, "progress": progress,
        "cut": fmt_int(v["cut_m3"]), "cut_pm": fmt_int(v["cut_pm_m3"]),
        "fill": fmt_int(v["fill_m3"]), "fill_pm": fmt_int(v["fill_pm_m3"]),
        "net": fmt_int(v["net_m3"]), "net_pm": fmt_int(v["net_pm_m3"]),
    }


# --------------------------------------------------------------------- content


def _visible(surface: Surface | None, released_only: bool) -> bool:
    return surface is not None and surface.status == STATUS_READY and (surface.released or not released_only)


def _analysis(db: Session, from_surface: Surface | None, to_surface: Surface | None) -> Analysis | None:
    if from_surface is None or to_surface is None or from_surface.id == to_surface.id:
        return None
    analysis = db.scalar(
        select(Analysis).where(
            Analysis.from_surface_id == from_surface.id, Analysis.to_surface_id == to_surface.id
        )
    )
    return analysis if analysis is not None and analysis.status == STATUS_READY and analysis.results else None


def _data_uri(png: bytes) -> str:
    return "data:image/png;base64," + base64.b64encode(png).decode("ascii")


def _alignment_text(surface: Surface, t: dict) -> str:
    if surface.kind == KIND_DESIGN:
        return t["alignDesign"]
    alignment = surface.alignment or {}
    method = alignment.get("method")
    if method == ALIGN_REFERENCE:
        return t["alignReference"]
    if method == ALIGN_NONE or method is None:
        return t["alignNone"]
    text = t["alignShift"].format(
        offset=fmt_num(-surface.vertical_offset_m, 2), rmse=fmt_num(alignment.get("residual_rmse_m", 0.0), 2)
    )
    three_d = alignment.get("pc_align")
    if method == ALIGN_SHIFT and three_d and three_d.get("accepted"):
        return t["align3d"].format(
            north=fmt_num(three_d["translation_north_m"], 1), east=fmt_num(three_d["translation_east_m"], 1), text=text
        )
    return text


def _source_row(surface: Surface, t: dict) -> dict:
    source = surface.provenance.get("source", {})
    if surface.kind == KIND_DESIGN:
        kind = t["typeDesign"]
    elif surface.source_type == SOURCE_STEREO:
        kind = t["typeStereo"].format(camera=source.get("camera_model", "?"))
    else:
        kind = t["typeUpload"]
    datum = t["datums"].get(surface.vertical_datum, surface.vertical_datum)
    conversion = surface.provenance.get("datum_conversion")
    if conversion:
        datum += " (" + t["converted"].format(**{"from": t["datums"].get(conversion["from"], conversion["from"])}) + ")"
    files = source.get("files") or [{"filename": source.get("filename", surface.original_filename), "sha256": source.get("sha256")}]
    file_text = "; ".join(f"{f['filename']} ({(f.get('sha256') or '')[:12]}…)" for f in files)
    return {
        "name": surface.name,
        "date": surface.survey_date.isoformat() if surface.survey_date else "–",
        "type": kind,
        "resolution": f"{fmt_num(surface.resolution_m, 2)} m" if surface.resolution_m else "–",
        "datum": datum,
        "alignment": _alignment_text(surface, t),
        "file": file_text,
    }


def build_report_html(db: Session, site: Site, surface: Surface, languages: tuple[str, ...], released_only: bool) -> str:
    """Assemble the report as one HTML document, one section per language."""
    if surface.kind != KIND_SURVEY or surface.site_id != site.id:
        raise ReportError("A report is produced for a survey of this site.")
    if not _visible(surface, released_only):
        raise ReportError("This survey is not available for reporting.")
    if any(lang not in LANGUAGES for lang in languages) or not languages:
        raise ReportError("Report language must be 'en', 'ar' or 'both'.")

    settings = get_settings()
    reference = db.get(Surface, site.reference_surface_id) if site.reference_surface_id else None
    if not _visible(reference, released_only):
        reference = None
    design = next((s for s in site.surfaces if s.kind == KIND_DESIGN and _visible(s, released_only)), None)
    surveys = sorted(
        (s for s in site.surfaces if s.kind == KIND_SURVEY and _visible(s, released_only)),
        key=lambda s: (s.survey_date, s.created_at),
    )
    index = surveys.index(surface)
    previous = surveys[index - 1] if index > 0 else None
    is_reference = reference is not None and surface.id == reference.id

    main = _analysis(db, reference, surface)
    comparisons = [("tblBaseline", reference, surface, main)]
    if previous is not None and (reference is None or previous.id != reference.id):
        comparisons.append(("tblPrevious", previous, surface, _analysis(db, previous, surface)))
    comparisons.append(("tblRemaining", surface, design, _analysis(db, surface, design)))
    comparisons.append(("tblPlanned", reference, design, _analysis(db, reference, design)))
    comparisons = [c for c in comparisons if c[3] is not None]

    progress = analysis_service.site_progress(db, site, released_only)
    epoch_progress = next((e for e in progress["epochs"] if e["surface_id"] == str(surface.id)), None)
    progress_by_zone = {z["zone_id"]: z for z in (epoch_progress or {}).get("zones", [])}

    used = {s.id: s for _, a, b, _ in comparisons for s in (a, b)}
    used[surface.id] = surface
    if reference is not None:
        used[reference.id] = reference
    used_surfaces = sorted(used.values(), key=lambda s: (s.kind == KIND_DESIGN, s.survey_date or date.max))
    draft = any(not s.released for s in used_surfaces)
    demo = [s.resolution_m for s in used_surfaces if (s.resolution_m or 0) >= settings.demo_resolution_threshold_m]

    # --- maps (language independent) ---
    crs = CRS.from_epsg(surface.grid_epsg)
    site_wgs84 = to_shape(site.geom)
    site_utm = reproject_geometry(site_wgs84, WGS84, crs)
    zones = [(reproject_geometry(to_shape(z.geom), WGS84, crs), z.zone_type) for z in site.zones]
    dem_path = str(storage.surface_dem_path(site.id, surface.id))
    maps: list[tuple[str, bytes]] = []
    terrain = render_site_map(site_utm, zones, dem_path=dem_path)
    scale_bar_m = terrain.scale_bar_m
    maps.append(("mapTerrain", terrain.png))
    ramp = None
    if main is not None:
        results = main.results
        dod = (str(storage.analysis_dod_path(site.id, main.id)), results["lod_m"], results["display_range_m"])
        maps.append(("mapCutFill", render_site_map(site_utm, zones, dem_path=dem_path, dod=dod).png))
        ramp = (results["display_range_m"], results["lod_m"])
    image = (surface.stats or {}).get("orthoimage")
    if image:
        ortho = (str(storage.surface_ortho_path(site.id, surface.id)), image["display_min"], image["display_max"])
        maps.append(("mapOrtho", render_site_map(site_utm, zones, ortho=ortho).png))
    map_uris = [(key, _data_uri(png)) for key, png in maps]

    chart_svg = progress_chart_svg(progress["epochs"], str(surface.id)) if progress["available"] else None
    chart_zone_ids: list[str] = []
    for epoch in progress["epochs"]:
        for z in epoch["zones"]:
            if z["zone_id"] not in chart_zone_ids:
                chart_zone_ids.append(z["zone_id"])
    zone_names = {str(z.id): z.name for z in site.zones}
    chart_zones = [{"name": zone_names.get(zid, "?"), "color": zone_color(i)} for i, zid in enumerate(chart_zone_ids)]

    versions = ", ".join(f"{k} {v}" for k, v in software_versions().items())
    engines = sorted(
        {f"{e['name']} {e['version']}" for s in used_surfaces if (e := s.provenance.get("engine"))}
        | {f"{c['engine']} {c['engine_version']}" for s in used_surfaces if (c := s.provenance.get("datum_conversion"))}
    )
    now = datetime.now(timezone.utc)

    reports = []
    for lang in languages:
        t = _strings(lang)
        tables = []
        for key, from_surface, to_surface, analysis in comparisons:
            results = analysis.results
            show_progress = key == "tblBaseline" and bool(progress_by_zone)
            rows = [
                _volume_row(
                    z["name"], z,
                    progress=fmt_progress(p["progress"], p["progress_pm"]) if (p := progress_by_zone.get(z["zone_id"])) and show_progress else None,
                )
                for z in results["zones"]
            ]
            rows.append(_volume_row(t["wholeSite"], results["site"], total=True))
            u = results["uncertainty"]
            regions = [(z["name"], z) for z in results["zones"]] + [(t["wholeSite"], results["site"])]
            tables.append(
                {
                    "title": t[key].format(**{"from": from_surface.name, "to": to_surface.name}),
                    "rows": rows,
                    "show_progress": show_progress,
                    "stale": analysis_service.is_stale(analysis),
                    "warnings": [
                        t["coverageWarning"].format(percent=fmt_num(v["data_coverage"] * 100, 0), name=name)
                        for name, v in regions if v["data_coverage"] < 0.99
                    ],
                    "note": t["tableNote"].format(
                        confidence=confidence_percent(u["confidence_z"]),
                        lod=fmt_num(results["lod_m"], 2),
                        pixel=fmt_num(u["sigma_pixel_m"], 3),
                        systematic=fmt_num(u["sigma_systematic_m"], 3),
                        source=t["source"][u["source"]],
                    ),
                }
            )
        main_summary = None
        if main is not None:
            site_row = _volume_row(t["wholeSite"], main.results["site"])
            main_summary = {"site": site_row}
        reports.append(
            {
                "lang": lang,
                "dir": "rtl" if lang == "ar" else "ltr",
                "t": t,
                "survey_date": fmt_date(surface.survey_date, t),
                "site_area": fmt_area(geodesic_area_m2(site_wgs84)),
                # Isolates keep a Latin name from capturing the digits next to it in Arabic.
                "baseline_label": f"\u2068{reference.name}\u2069 · {fmt_date(reference.survey_date, t)}" if reference else "–",
                "generated": f"{fmt_date(now.date(), t)}, {now:%H:%M} UTC",
                "demo_notice": t["demoNotice"].format(resolution=fmt_num(max(demo), 0)) if demo else "",
                "main": main_summary,
                "summary_lead": t["summaryLead"].format(
                    baseline_date=fmt_date(reference.survey_date, t), survey_date=fmt_date(surface.survey_date, t)
                ) if main is not None else "",
                "progress_rows": [
                    {"name": z["name"], "progress": fmt_progress(z["progress"], z["progress_pm"]) or "–"}
                    for z in (epoch_progress or {}).get("zones", [])
                ],
                "maps": [{"caption": t[key], "src": uri} for key, uri in map_uris],
                "ramp_legend": t["legendRamp"].format(range=fmt_num(ramp[0], 1), lod=fmt_num(ramp[1], 2)) if ramp else "",
                "scale_note": t["scaleBar"].format(length=fmt_int(scale_bar_m)),
                "tables": tables,
                "chart_rows": [
                    {
                        "date": e["survey_date"],
                        "name": e["name"],
                        "values": [
                            fmt_progress(z["progress"], z["progress_pm"]) or "–"
                            if (z := next((z for z in e["zones"] if z["zone_id"] == zid), None)) else "–"
                            for zid in chart_zone_ids
                        ],
                    }
                    for e in progress["epochs"]
                ],
                "method_p1": t["methodP1"].format(epsg=surface.grid_epsg),
                "sources": [_source_row(s, t) for s in used_surfaces],
                "software": t["software"].format(versions=versions),
                "engine_line": t["engineLine"].format(engine="; ".join(engines)) if engines else "",
            }
        )

    css = (HERE / "report.css").read_text(encoding="utf-8").replace("__FONTS__", (HERE / "fonts").as_uri())
    return _environment().get_template("report.html").render(
        title=f"{settings.app_name} – {site.name} – {surface.name}",
        app_name=settings.app_name,
        css=css,
        reports=reports,
        project=site.project,
        site=site,
        surface=surface,
        draft=draft,
        demo_resolution=bool(demo),
        is_reference=is_reference,
        has_design=design is not None,
        zone_types={kind: any(z.zone_type == kind for z in site.zones) for kind in ("cut", "fill", "mixed")},
        chart_svg=chart_svg,
        chart_zones=chart_zones,
    )


def render_pdf(html: str) -> bytes:
    from weasyprint import HTML  # imported here: only the API image needs its system libraries

    return HTML(string=html, base_url=str(HERE)).write_pdf()

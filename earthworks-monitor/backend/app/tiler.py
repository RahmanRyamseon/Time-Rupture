"""Tile server: a separate process so tile rendering never starves the API.

It shares the API's authentication and access rules, so a tile is only served to a
user who may see the surface or analysis behind it.
"""
from fastapi import FastAPI, HTTPException, Response
from starlette.concurrency import run_in_threadpool

from app import storage
from app.deps import AnalysisDep, SurfaceDep
from app.geo.tiles import dod_tile, hillshade_tile, ortho_tile
from app.models import STATUS_READY

app = FastAPI(title="Tiles", docs_url=None, redoc_url=None, openapi_url=None)
_HEADERS = {"Cache-Control": "private, max-age=300"}


def _respond(png: bytes | None) -> Response:
    if png is None:
        return Response(status_code=204, headers=_HEADERS)
    return Response(png, media_type="image/png", headers=_HEADERS)


def _check_zoom(z: int) -> None:
    if not 0 <= z <= 24:
        raise HTTPException(400, "Invalid zoom level")


@app.get("/api/tiles/surfaces/{surface_id}/hillshade/{z}/{x}/{y}.png")
async def surface_hillshade(surface: SurfaceDep, z: int, x: int, y: int):
    _check_zoom(z)
    if surface.status != STATUS_READY:
        raise HTTPException(404, "Surface is not ready")
    path = str(storage.surface_dem_path(surface.site_id, surface.id))
    return _respond(await run_in_threadpool(hillshade_tile, path, z, x, y))


@app.get("/api/tiles/surfaces/{surface_id}/ortho/{z}/{x}/{y}.png")
async def surface_orthoimage(surface: SurfaceDep, z: int, x: int, y: int):
    _check_zoom(z)
    image = (surface.stats or {}).get("orthoimage")
    if surface.status != STATUS_READY or not image:
        raise HTTPException(404, "This surface has no orthoimage")
    path = str(storage.surface_ortho_path(surface.site_id, surface.id))
    png = await run_in_threadpool(
        ortho_tile, path, z, x, y, image["display_min"], image["display_max"]
    )
    return _respond(png)


@app.get("/api/tiles/analyses/{analysis_id}/dod/{z}/{x}/{y}.png")
async def analysis_dod(analysis: AnalysisDep, z: int, x: int, y: int):
    _check_zoom(z)
    if analysis.status != STATUS_READY or not analysis.results:
        raise HTTPException(404, "Analysis is not ready")
    path = str(storage.analysis_dod_path(analysis.site_id, analysis.id))
    results = analysis.results
    png = await run_in_threadpool(dod_tile, path, z, x, y, results["lod_m"], results["display_range_m"])
    return _respond(png)


@app.get("/api/tiles/health")
def health():
    return {"status": "ok"}

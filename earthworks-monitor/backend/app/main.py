from fastapi import APIRouter, FastAPI
from sqlalchemy import text

from app.config import get_settings
from app.deps import DbSession
from app.engines.registry import get_engine
from app.routers import auth, projects, sites, surfaces, users
from app.schemas import ConfigOut


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, docs_url="/api/docs", openapi_url="/api/openapi.json")
    api = APIRouter(prefix="/api")

    @api.get("/health", tags=["meta"])
    def health(db: DbSession):
        db.execute(text("SELECT 1"))
        return {"status": "ok"}

    @api.get("/config", response_model=ConfigOut, tags=["meta"])
    def config():
        """Public, non-secret settings the web client needs before sign-in."""
        s = get_settings()
        engine = get_engine()
        return ConfigOut(
            app_name=s.app_name,
            basemap_tile_url=s.basemap_tile_url,
            basemap_attribution=s.basemap_attribution,
            max_upload_mb=s.max_upload_mb,
            max_dem_upload_mb=s.max_dem_upload_mb,
            max_stereo_upload_mb=s.max_stereo_upload_mb,
            camera_models=list(engine.camera_models),
            single_file_camera_models=list(engine.single_file_camera_models),
        )

    for module in (auth, users, projects, sites, surfaces):
        api.include_router(module.router)
    app.include_router(api)
    return app


app = create_app()

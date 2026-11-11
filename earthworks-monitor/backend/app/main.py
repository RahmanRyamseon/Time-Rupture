from fastapi import APIRouter, FastAPI
from sqlalchemy import text

from app.config import get_settings
from app.deps import DbSession
from app.routers import auth, projects, sites, users
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
        return ConfigOut(
            app_name=s.app_name,
            basemap_tile_url=s.basemap_tile_url,
            basemap_attribution=s.basemap_attribution,
            max_upload_mb=s.max_upload_mb,
        )

    for module in (auth, users, projects, sites):
        api.include_router(module.router)
    app.include_router(api)
    return app


app = create_app()

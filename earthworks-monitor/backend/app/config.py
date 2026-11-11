"""All runtime configuration comes from environment variables (see .env.example)."""
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # The product name lives here and nowhere else; the frontend reads it from /api/config.
    app_name: str = "Earthworks Monitor"

    database_url: str
    redis_url: str = "redis://localhost:6379/0"

    secret_key: str = Field(min_length=32)
    access_token_ttl_minutes: int = 480
    cookie_secure: bool = True
    login_max_attempts: int = 10
    login_window_seconds: int = 900

    data_dir: str = "/data"
    max_upload_mb: int = 50  # outline files
    max_dem_upload_mb: int = 4096  # elevation rasters

    # --- volume analytics (see METHOD.md) ---
    # Height changes smaller than this many pixel sigmas are not counted (1.96 = 95 %).
    lod_sigma_multiplier: float = 1.96
    # Reported +/- ranges are this many sigmas wide (1.96 = 95 % confidence).
    confidence_z: float = 1.96
    # Assumed correlation length of DEM errors, in pixels of the analysis grid.
    uncertainty_correlation_pixels: float = 20.0
    # Ground within this distance of a work zone is not trusted as stable.
    stable_zone_buffer_m: float = 10.0
    min_stable_pixels: int = 1000
    # Surveys are cropped to the site boundary plus this margin (stable-ground context).
    site_buffer_m: float = 150.0

    # --- jobs ---
    jobs_eager: bool = False  # run jobs inline instead of queueing (tests, seed)
    job_timeout_seconds: int = 6 * 3600

    basemap_tile_url: str = ""
    basemap_attribution: str = ""

    demo_analyst_email: str = ""
    demo_analyst_password: str = ""
    demo_viewer_email: str = ""
    demo_viewer_password: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]

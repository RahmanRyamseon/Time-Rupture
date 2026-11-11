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
    max_upload_mb: int = 50

    basemap_tile_url: str = ""
    basemap_attribution: str = ""

    demo_analyst_email: str = ""
    demo_analyst_password: str = ""
    demo_viewer_email: str = ""
    demo_viewer_password: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]

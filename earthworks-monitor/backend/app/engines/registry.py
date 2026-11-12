"""Which photogrammetry engine is configured. Add new engines here."""
from functools import lru_cache

from app.config import get_settings
from app.engines.base import EngineError, PhotogrammetryEngine


@lru_cache
def get_engine() -> PhotogrammetryEngine:
    settings = get_settings()
    if settings.photogrammetry_engine == "asp":
        from app.engines.asp.engine import AspEngine

        return AspEngine(
            settings.asp_prefix,
            threads=settings.asp_threads,
            processes=settings.asp_processes,
            stereo_algorithm=settings.stereo_algorithm,
            subpixel_mode=settings.stereo_subpixel_mode,
            alignment_method=settings.pc_align_method,
        )
    raise EngineError(f"Unknown photogrammetry engine '{settings.photogrammetry_engine}'.")

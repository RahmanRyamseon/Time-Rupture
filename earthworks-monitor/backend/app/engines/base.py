"""Photogrammetry engine interface.

Everything that turns imagery into elevation (and aligns or re-references elevation
models) sits behind this interface. NASA Ames Stereo Pipeline is the first
implementation; a drone photogrammetry engine can be added by implementing the same
class and registering it in `app.engines.registry`.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

Log = Callable[[str], None]


class EngineError(RuntimeError):
    """Processing failed inside the engine; the message is safe to show to an analyst."""


class EngineUnavailable(EngineError):
    """The engine's tools are not installed where this code is running."""


@dataclass(frozen=True)
class StereoRequest:
    """One stereo pair to turn into a DEM."""

    camera_model: str  # one of the engine's `camera_models`
    # Input files by role. Roles: left_image, right_image, left_camera, right_camera,
    # or `scene` for single-file products that contain both views (e.g. ASTER L1A).
    files: dict[str, Path]
    workdir: Path
    target_epsg: int  # projected CRS the DEM is gridded in
    resolution_m: float | None = None  # None: let the engine choose (about the image GSD)
    bundle_adjust: bool = False


@dataclass(frozen=True)
class StereoResult:
    dem: Path  # heights in `vertical_datum`
    vertical_datum: str
    orthoimage: Path | None
    intersection_error: Path | None
    commands: list[list[str]]  # exactly what was run, for provenance
    parameters: dict


@dataclass(frozen=True)
class AlignmentRequest:
    reference_dem: Path  # stays fixed
    source_dem: Path  # moved onto the reference
    # The source restricted to ground that should not have changed (work zones blanked).
    # The transform is estimated from this and then applied to the whole source.
    source_stable_dem: Path
    workdir: Path
    target_epsg: int
    resolution_m: float
    max_displacement_m: float
    translation_only: bool = True
    method: str | None = None  # engine-specific algorithm name; None = engine default


@dataclass(frozen=True)
class AlignmentResult:
    aligned_dem: Path
    method: str
    # Movement applied to the source, metres: north, east, up.
    translation_north_m: float
    translation_east_m: float
    translation_up_m: float
    stats: dict  # engine-reported error statistics before/after
    commands: list[list[str]] = field(default_factory=list)


class PhotogrammetryEngine(ABC):
    name: str
    #: camera model identifiers accepted in StereoRequest.camera_model
    camera_models: tuple[str, ...] = ()
    #: camera models whose input is a single `scene` file rather than an image pair
    single_file_camera_models: tuple[str, ...] = ()

    @abstractmethod
    def version(self) -> str:
        """Version string recorded in provenance. Raises EngineUnavailable."""

    @abstractmethod
    def build_dem(self, request: StereoRequest, log: Log) -> StereoResult: ...

    @abstractmethod
    def align_dem(self, request: AlignmentRequest, log: Log) -> AlignmentResult: ...

    @abstractmethod
    def convert_vertical_datum(
        self, dem: Path, from_datum: str, to_datum: str, workdir: Path, log: Log
    ) -> Path:
        """Return a copy of `dem` with heights re-referenced, or raise EngineError."""

    @abstractmethod
    def convertible_datums(self) -> tuple[str, ...]: ...

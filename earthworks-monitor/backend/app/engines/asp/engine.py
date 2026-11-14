"""NASA Ames Stereo Pipeline as a PhotogrammetryEngine."""
from __future__ import annotations

from pathlib import Path

import rasterio

from app.engines.asp.commands import (
    ALIGNMENT_METHODS,
    GEOIDS,
    SESSION_TYPES,
    Aster2Asp,
    BundleAdjust,
    DemGeoid,
    ParallelStereo,
    PcAlign,
    Point2Dem,
    parse_pc_align_output,
)
from app.engines.asp.toolchain import AspToolchain
from app.engines.base import (
    AlignmentRequest,
    AlignmentResult,
    EngineError,
    Log,
    PhotogrammetryEngine,
    StereoRequest,
    StereoResult,
)

ELLIPSOIDAL = "ellipsoidal_wgs84"

# DEM grid spacing used when the request names none. Left to itself, point2dem picked
# 80 m for a real ASTER scene (15 m images); the ASP guide grids ASTER at about 30 m.
DEFAULT_DEM_SPACING_M = {"aster": 30.0}


class AspEngine(PhotogrammetryEngine):
    name = "NASA Ames Stereo Pipeline"
    camera_models = SESSION_TYPES
    single_file_camera_models = ("aster",)

    def __init__(
        self,
        prefix: str,
        *,
        threads: int = 0,
        processes: int = 0,
        stereo_algorithm: str = "asp_mgm",
        subpixel_mode: int = 9,
        alignment_method: str = "nuth",
    ):
        self.alignment_method = alignment_method
        self.tools = AspToolchain(prefix, threads)
        self.threads = threads
        self.processes = processes
        self.stereo_algorithm = stereo_algorithm
        self.subpixel_mode = subpixel_mode

    def version(self) -> str:
        return self.tools.version()

    def convertible_datums(self) -> tuple[str, ...]:
        return (ELLIPSOIDAL, *GEOIDS)

    # ------------------------------------------------------------------ stereo

    def build_dem(self, request: StereoRequest, log: Log) -> StereoResult:
        if request.camera_model not in self.camera_models:
            raise EngineError(
                f"Unsupported camera model '{request.camera_model}'. "
                f"Supported: {', '.join(self.camera_models)}."
            )
        work = request.workdir
        work.mkdir(parents=True, exist_ok=True)
        commands: list[list[str]] = []

        def run(command) -> str:
            argv = command.argv()
            commands.append(argv)
            return self.tools.run(argv, log, cwd=work)

        files = dict(request.files)
        if request.camera_model in self.single_file_camera_models:
            if "scene" not in files:
                raise EngineError("An ASTER survey needs the Level 1A scene file (.hdf).")
            log("Extracting ASTER nadir (3N) and backward (3B) images and cameras")
            prepare = Aster2Asp(files["scene"], work / "aster" / "scene")
            run(prepare)
            files = prepare.outputs()
        for role in ("left_image", "right_image"):
            if role not in files or not Path(files[role]).exists():
                raise EngineError(f"The stereo pair is missing its {role.replace('_', ' ')}.")
        left_camera, right_camera = files.get("left_camera"), files.get("right_camera")
        if (left_camera is None) != (right_camera is None):
            raise EngineError("Provide camera files for both images, or for neither.")

        adjust_prefix = None
        if request.bundle_adjust:
            log("Bundle adjustment: refining the two cameras against each other")
            adjust_prefix = work / "ba" / "run"
            run(
                BundleAdjust(
                    files["left_image"],
                    files["right_image"],
                    left_camera,
                    right_camera,
                    adjust_prefix,
                    request.camera_model,
                    self.threads,
                )
            )

        log("Stereo correlation and triangulation")
        stereo = ParallelStereo(
            files["left_image"],
            files["right_image"],
            left_camera,
            right_camera,
            work / "stereo" / "run",
            request.camera_model,
            self.stereo_algorithm,
            self.subpixel_mode,
            adjust_prefix,
            self.processes,
            self.threads,
        )
        run(stereo)
        if not stereo.point_cloud.exists():
            raise EngineError("Stereo finished without producing a point cloud.")

        spacing = request.resolution_m or DEFAULT_DEM_SPACING_M.get(request.camera_model)
        log("Gridding the point cloud into a DEM, error image and orthoimage")
        grid = Point2Dem(
            stereo.point_cloud,
            request.target_epsg,
            spacing,
            error_image=True,
            orthoimage_texture=stereo.left_aligned_image,
            threads=self.threads,
        )
        run(grid)
        if not grid.dem.exists():
            raise EngineError("Gridding finished without producing a DEM.")
        with rasterio.open(grid.dem) as dem:
            resolution = float(dem.res[0])
        return StereoResult(
            dem=grid.dem,
            vertical_datum=ELLIPSOIDAL,  # point2dem heights are above the WGS84 ellipsoid
            orthoimage=grid.orthoimage if grid.orthoimage.exists() else None,
            intersection_error=grid.intersection_error if grid.intersection_error.exists() else None,
            commands=commands,
            parameters={
                "camera_model": request.camera_model,
                "stereo_algorithm": self.stereo_algorithm,
                "subpixel_mode": self.subpixel_mode,
                "bundle_adjust": request.bundle_adjust,
                "target_epsg": request.target_epsg,
                "requested_resolution_m": request.resolution_m,
                "dem_spacing_m": spacing,
                "dem_resolution_m": resolution,
            },
        )

    # --------------------------------------------------------------- alignment

    def align_dem(self, request: AlignmentRequest, log: Log) -> AlignmentResult:
        """Estimate a rigid transform with pc_align on stable ground, apply it to the
        whole source DEM and grid the result again."""
        work = request.workdir
        work.mkdir(parents=True, exist_ok=True)
        commands: list[list[str]] = []

        def run(command) -> str:
            argv = command.argv()
            commands.append(argv)
            return self.tools.run(argv, log, cwd=work)

        method = request.method or self.alignment_method
        if method not in ALIGNMENT_METHODS:
            raise EngineError(
                f"Unsupported alignment method '{method}'. Supported: {', '.join(ALIGNMENT_METHODS)}."
            )
        with rasterio.open(request.reference_dem) as ref, rasterio.open(request.source_dem) as src:
            source_is_denser = src.res[0] < ref.res[0]

        # pc_align wants the denser cloud (for nuth: the finer grid) as its fixed
        # "reference". When our source is the denser one the roles are swapped and the
        # inverse transform is used.
        fixed, moving = (
            (request.source_stable_dem, request.reference_dem)
            if source_is_denser
            else (request.reference_dem, request.source_stable_dem)
        )
        estimate = PcAlign(
            reference=fixed,
            source=moving,
            output_prefix=work / "estimate" / "run",
            max_displacement_m=request.max_displacement_m,
            alignment_method=method,
            compute_translation_only=request.translation_only,
            threads=self.threads,
        )
        report = parse_pc_align_output(run(estimate))
        transform = estimate.inverse_transform if source_is_denser else estimate.transform
        sign = -1.0 if source_is_denser else 1.0

        apply = PcAlign(
            reference=request.reference_dem,
            source=request.source_dem,
            output_prefix=work / "apply" / "run",
            max_displacement_m=-1,
            alignment_method="point-to-plane",  # nuth cannot take an initial transform
            initial_transform=transform,
            num_iterations=0,
            save_transformed_source_points=True,
            threads=self.threads,
        )
        run(apply)
        grid = Point2Dem(
            apply.transformed_source, request.target_epsg, request.resolution_m, threads=self.threads
        )
        run(grid)
        if not grid.dem.exists():
            raise EngineError("Alignment finished without producing an aligned DEM.")
        return AlignmentResult(
            aligned_dem=grid.dem,
            method=f"pc_align {method}"
            + (", translation only" if request.translation_only else ", rigid"),
            translation_north_m=sign * report.north_m,
            translation_east_m=sign * report.east_m,
            translation_up_m=-sign * report.down_m,
            stats={
                "roles_swapped_source_denser": source_is_denser,
                "max_displacement_m": request.max_displacement_m,
                "translation_magnitude_m": report.magnitude_m,
                "error_before": report.input_stats,
                "error_after": report.output_stats,
            },
            commands=commands,
        )

    # ------------------------------------------------------------------ datums

    def convert_vertical_datum(
        self, dem: Path, from_datum: str, to_datum: str, workdir: Path, log: Log
    ) -> Path:
        """Re-reference heights between the WGS84 ellipsoid and the EGM96/EGM2008 geoids."""
        supported = self.convertible_datums()
        if from_datum not in supported or to_datum not in supported:
            raise EngineError(
                f"Heights cannot be converted from '{from_datum}' to '{to_datum}'. "
                f"Convertible height references: {', '.join(supported)}."
            )
        workdir.mkdir(parents=True, exist_ok=True)
        current = dem
        if from_datum != ELLIPSOIDAL:  # geoid -> ellipsoid
            step = DemGeoid(current, GEOIDS[from_datum], workdir / "to_ellipsoid", reverse=True)
            self.tools.run(step.argv(), log, cwd=workdir)
            current = step.adjusted
        if to_datum != ELLIPSOIDAL:  # ellipsoid -> geoid
            step = DemGeoid(current, GEOIDS[to_datum], workdir / "to_geoid")
            self.tools.run(step.argv(), log, cwd=workdir)
            current = step.adjusted
        if not Path(current).exists():
            raise EngineError("Height conversion finished without producing an output file.")
        return Path(current)


__all__ = ["AspEngine"]

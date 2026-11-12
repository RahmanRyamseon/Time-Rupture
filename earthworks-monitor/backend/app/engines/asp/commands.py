"""Typed builders for the ASP commands this product uses.

Each class maps one-to-one onto a command line. Only options that were checked against
the ASP 3.7.0 documentation and the installed tools' `--help` output are exposed; the
section references are to stereopipeline.readthedocs.io.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

# `-t/--session-type` values (docs: parallel_stereo, "session-type"), limited to the
# Earth-observation camera models available in ASP 3.7.0.
SESSION_TYPES = ("rpc", "dg", "aster", "pleiades", "perusat", "csm", "nadirpinhole")
STEREO_ALGORITHMS = ("asp_bm", "asp_sgm", "asp_mgm", "asp_final_mgm")
GEOIDS = {"egm2008": "EGM2008", "egm96": "EGM96"}  # dem_geoid --geoid
# pc_align --alignment-method values offered here. "nuth" (Nuth and Kaab, 2011) is made
# for co-registering two DEMs that differ by a translation and recovers sub-pixel
# horizontal shifts; it needs terrain with relief. "point-to-plane" is general ICP.
ALIGNMENT_METHODS = ("nuth", "point-to-plane")


def _paths(*paths: Path | None) -> list[str]:
    return [str(p) for p in paths if p is not None]


@dataclass(frozen=True)
class Aster2Asp:
    """aster2asp <input.hdf | input directory> -o <output prefix>

    Writes <prefix>-Band3N.tif, -Band3B.tif (nadir and backward views) and matching
    .xml cameras. HDF (V004) input needs an ASP build from 2026-01 or later.
    """

    source: Path
    output_prefix: Path

    def argv(self) -> list[str]:
        return ["aster2asp", str(self.source), "-o", str(self.output_prefix)]

    def outputs(self) -> dict[str, Path]:
        base = str(self.output_prefix)
        return {
            "left_image": Path(base + "-Band3N.tif"),
            "right_image": Path(base + "-Band3B.tif"),
            "left_camera": Path(base + "-Band3N.xml"),
            "right_camera": Path(base + "-Band3B.xml"),
        }


@dataclass(frozen=True)
class BundleAdjust:
    """bundle_adjust <images> <cameras> -o <output prefix> [-t <session>]"""

    left_image: Path
    right_image: Path
    left_camera: Path | None
    right_camera: Path | None
    output_prefix: Path
    session_type: str
    threads: int = 0

    def argv(self) -> list[str]:
        args = ["bundle_adjust", "-t", self.session_type]
        args += _paths(self.left_image, self.right_image, self.left_camera, self.right_camera)
        args += ["-o", str(self.output_prefix)]
        if self.threads:
            args += ["--threads", str(self.threads)]
        return args


@dataclass(frozen=True)
class ParallelStereo:
    """parallel_stereo [options] <images> [<cameras>] <output prefix>

    Produces the point cloud <prefix>-PC.tif and the aligned left image <prefix>-L.tif.
    Cameras are omitted when the camera model is embedded in the images (RPC in TIFF).
    """

    left_image: Path
    right_image: Path
    left_camera: Path | None
    right_camera: Path | None
    output_prefix: Path
    session_type: str
    stereo_algorithm: str = "asp_mgm"
    subpixel_mode: int = 9
    bundle_adjust_prefix: Path | None = None
    processes: int = 0
    threads: int = 0

    def argv(self) -> list[str]:
        if self.session_type not in SESSION_TYPES:
            raise ValueError(f"Unsupported session type {self.session_type!r}")
        if self.stereo_algorithm not in STEREO_ALGORITHMS:
            raise ValueError(f"Unsupported stereo algorithm {self.stereo_algorithm!r}")
        args = [
            "parallel_stereo",
            "-t",
            self.session_type,
            "--stereo-algorithm",
            self.stereo_algorithm,
            "--subpixel-mode",
            str(self.subpixel_mode),
        ]
        if self.bundle_adjust_prefix is not None:
            args += ["--bundle-adjust-prefix", str(self.bundle_adjust_prefix)]
        if self.processes:
            args += ["--processes", str(self.processes)]
        if self.threads:
            args += ["--threads-multiprocess", str(self.threads)]
            args += ["--threads-singleprocess", str(self.threads)]
        args += _paths(self.left_image, self.right_image, self.left_camera, self.right_camera)
        args.append(str(self.output_prefix))
        return args

    @property
    def point_cloud(self) -> Path:
        return Path(str(self.output_prefix) + "-PC.tif")

    @property
    def left_aligned_image(self) -> Path:
        return Path(str(self.output_prefix) + "-L.tif")


@dataclass(frozen=True)
class Point2Dem:
    """point2dem [options] <point cloud> [<texture image>]

    Grids a point cloud into <prefix>-DEM.tif. With --errorimage also writes
    <prefix>-IntersectionErr.tif (triangulation ray intersection error, metres); with
    --orthoimage and a texture image also writes the orthoimage <prefix>-DRG.tif.
    Heights are relative to the datum ellipsoid.
    """

    point_cloud: Path
    target_epsg: int
    resolution_m: float | None = None
    error_image: bool = False
    orthoimage_texture: Path | None = None
    output_prefix: Path | None = None
    threads: int = 0

    def argv(self) -> list[str]:
        args = ["point2dem", "--t_srs", f"EPSG:{self.target_epsg}"]
        if self.resolution_m is not None:
            args += ["--tr", f"{self.resolution_m:g}"]
        if self.error_image:
            args.append("--errorimage")
        if self.output_prefix is not None:
            args += ["-o", str(self.output_prefix)]
        if self.threads:
            args += ["--threads", str(self.threads)]
        if self.orthoimage_texture is not None:
            args.append("--orthoimage")
        args.append(str(self.point_cloud))
        if self.orthoimage_texture is not None:
            args.append(str(self.orthoimage_texture))
        return args

    def _output(self, suffix: str) -> Path:
        # Without -o, point2dem derives the prefix from the cloud name minus "-PC.tif"
        # for stereo clouds, or minus ".tif" otherwise.
        if self.output_prefix is not None:
            return Path(f"{self.output_prefix}-{suffix}.tif")
        name = str(self.point_cloud)
        stem = name[: -len("-PC.tif")] if name.endswith("-PC.tif") else name[: -len(".tif")]
        return Path(f"{stem}-{suffix}.tif")

    @property
    def dem(self) -> Path:
        return self._output("DEM")

    @property
    def intersection_error(self) -> Path:
        return self._output("IntersectionErr")

    @property
    def orthoimage(self) -> Path:
        return self._output("DRG")


@dataclass(frozen=True)
class PcAlign:
    """pc_align --max-displacement <m> [options] <reference> <source> -o <prefix>

    The reference stays fixed; the source is moved. ASP asks for the denser cloud to be
    the reference. Writes <prefix>-transform.txt (source to reference) and
    <prefix>-inverse-transform.txt, and with --save-transformed-source-points the moved
    source as <prefix>-trans_source.tif.

    To apply a previously computed transform without refining it (docs: "Applying an
    initial transform"): initial_transform=<file>, num_iterations=0, max_displacement=-1.
    """

    reference: Path
    source: Path
    output_prefix: Path
    max_displacement_m: float
    alignment_method: str = "nuth"
    compute_translation_only: bool = False
    save_transformed_source_points: bool = False
    initial_transform: Path | None = None
    num_iterations: int | None = None
    threads: int = 0

    def argv(self) -> list[str]:
        if self.alignment_method not in ALIGNMENT_METHODS:
            raise ValueError(f"Unsupported alignment method {self.alignment_method!r}")
        args = ["pc_align", "--max-displacement", f"{self.max_displacement_m:g}"]
        args += ["--alignment-method", self.alignment_method]
        if self.compute_translation_only:
            args.append("--compute-translation-only")
        if self.initial_transform is not None:
            args += ["--initial-transform", str(self.initial_transform)]
        if self.num_iterations is not None:
            args += ["--num-iterations", str(self.num_iterations)]
        if self.save_transformed_source_points:
            args.append("--save-transformed-source-points")
        if self.threads:
            args += ["--threads", str(self.threads)]
        args += [str(self.reference), str(self.source), "-o", str(self.output_prefix)]
        return args

    def _output(self, suffix: str) -> Path:
        return Path(f"{self.output_prefix}-{suffix}")

    @property
    def transform(self) -> Path:
        return self._output("transform.txt")

    @property
    def inverse_transform(self) -> Path:
        return self._output("inverse-transform.txt")

    @property
    def transformed_source(self) -> Path:
        return self._output("trans_source.tif")


@dataclass(frozen=True)
class DemGeoid:
    """dem_geoid <dem> --geoid <EGM96|EGM2008> [--reverse-adjustment] -o <prefix>

    Default direction: ellipsoid heights to geoid heights. --reverse-adjustment goes
    from geoid heights to ellipsoid heights. Writes <prefix>-adj.tif. The geoid grids
    ship with ASP, so no download is needed.
    """

    dem: Path
    geoid: str
    output_prefix: Path
    reverse: bool = False

    def argv(self) -> list[str]:
        if self.geoid not in GEOIDS.values():
            raise ValueError(f"Unsupported geoid {self.geoid!r}")
        args = ["dem_geoid", str(self.dem), "--geoid", self.geoid]
        if self.reverse:
            args.append("--reverse-adjustment")
        args += ["-o", str(self.output_prefix)]
        return args

    @property
    def adjusted(self) -> Path:
        return Path(f"{self.output_prefix}-adj.tif")


@dataclass(frozen=True)
class SatSim:
    """sat_sim --dem <dem> --ortho <ortho> --first <col row height> --last <...> ...

    Renders synthetic frame-camera images of a DEM draped with an orthoimage, and writes
    their pinhole cameras (<prefix>-10000.tif/.tsai, <prefix>-10001.tif/.tsai for
    --num 2). Positions are DEM pixel column and row plus height above the datum, and
    must lie inside the DEM. With both ground positions equal the two cameras converge
    on one point, giving a stereo pair. Used only by the simulated demo and tests.
    """

    dem: Path
    ortho: Path
    output_prefix: Path
    first: tuple[int, int, float]
    last: tuple[int, int, float]
    ground_position: tuple[int, int]
    focal_length_px: float
    image_size: tuple[int, int]

    def argv(self) -> list[str]:
        def numbers(values) -> list[str]:
            return [f"{v:g}" for v in values]

        width, height = self.image_size
        return [
            "sat_sim",
            "--dem", str(self.dem),
            "--ortho", str(self.ortho),
            "--first", *numbers(self.first),
            "--last", *numbers(self.last),
            "--first-ground-pos", *numbers(self.ground_position),
            "--last-ground-pos", *numbers(self.ground_position),
            "--num", "2",
            "--focal-length", f"{self.focal_length_px:g}",
            "--optical-center", f"{width / 2:g}", f"{height / 2:g}",
            "--image-size", str(width), str(height),
            "-o", str(self.output_prefix),
        ]

    def outputs(self) -> dict[str, Path]:
        base = str(self.output_prefix)
        return {
            "left_image": Path(base + "-10000.tif"),
            "right_image": Path(base + "-10001.tif"),
            "left_camera": Path(base + "-10000.tsai"),
            "right_camera": Path(base + "-10001.tsai"),
        }


# ----------------------------------------------------------------- output parsing

_NUMBER = r"[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?"
_STATS = re.compile(
    rf"^(Input|Output) stats \(meters\): Mean: ({_NUMBER}), StdDev: ({_NUMBER}), "
    rf"RMSE: ({_NUMBER}), Median: ({_NUMBER}), NMAD: ({_NUMBER})",
    re.MULTILINE,
)
_NED = re.compile(
    rf"^Translation vector \(North-East-Down, meters\): Vector3\(({_NUMBER}),({_NUMBER}),({_NUMBER})\)",
    re.MULTILINE,
)
_MAGNITUDE = re.compile(rf"^Translation vector magnitude \(meters\): ({_NUMBER})", re.MULTILINE)


@dataclass(frozen=True)
class PcAlignReport:
    """What pc_align prints about one alignment (docs: "Error metrics and outliers").

    Errors are distances from source points to the reference, in metres, before
    ("input") and after ("output") alignment. The translation is the movement of the
    source cloud's centroid in local North-East-Down coordinates.
    """

    north_m: float
    east_m: float
    down_m: float
    magnitude_m: float
    input_stats: dict[str, float]
    output_stats: dict[str, float]


def parse_pc_align_output(text: str) -> PcAlignReport:
    ned = _NED.search(text)
    stats = {m.group(1): m.groups()[1:] for m in _STATS.finditer(text)}
    if not ned or "Input" not in stats or "Output" not in stats:
        raise ValueError("pc_align output did not contain the expected alignment summary")

    def as_dict(values) -> dict[str, float]:
        keys = ("mean_m", "stddev_m", "rmse_m", "median_m", "nmad_m")
        return dict(zip(keys, map(float, values)))

    north, east, down = map(float, ned.groups())
    magnitude = _MAGNITUDE.search(text)
    return PcAlignReport(
        north_m=north,
        east_m=east,
        down_m=down,
        magnitude_m=float(magnitude.group(1)) if magnitude else (north**2 + east**2 + down**2) ** 0.5,
        input_stats=as_dict(stats["Input"]),
        output_stats=as_dict(stats["Output"]),
    )

"""Parse and validate site / zone outlines from untrusted input.

Everything is normalised to a valid 2-D MultiPolygon in WGS84 (EPSG:4326, lon/lat).
Supported uploads: GeoJSON, KML, KMZ, zipped ESRI Shapefile.
"""
from __future__ import annotations

import io
import json
import zipfile
from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Any

import shapefile  # pyshp
import shapely
from defusedxml import ElementTree
from pyproj import CRS, Geod, Transformer
from pyproj.exceptions import CRSError
from shapely.geometry import MultiPolygon, Polygon, shape
from shapely.geometry.base import BaseGeometry
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

WGS84 = CRS.from_epsg(4326)
_GEOD = Geod(ellps="WGS84")

MAX_VERTICES = 200_000
MIN_AREA_M2 = 1.0
MAX_UNZIPPED_BYTES = 200 * 1024 * 1024
_POLYGONAL_TYPES = ("Polygon", "MultiPolygon", "GeometryCollection")
_NAME_FIELDS = ("name", "zone", "zone_name", "label", "title", "id")


class GeometryInputError(ValueError):
    """Bad user-supplied geometry; the message is safe to show to the user."""


@dataclass(frozen=True)
class ParsedFeature:
    name: str | None
    geometry: MultiPolygon


def geodesic_area_m2(geom: BaseGeometry) -> float:
    return abs(_GEOD.geometry_area_perimeter(geom)[0])


def normalize_geometry(geom: BaseGeometry, source_crs: CRS | None = None) -> MultiPolygon:
    """Return a valid, 2-D, CCW-oriented MultiPolygon in WGS84 or raise GeometryInputError."""
    if geom.is_empty:
        raise GeometryInputError("The geometry is empty.")
    if shapely.get_num_coordinates(geom) > MAX_VERTICES:
        raise GeometryInputError(
            f"The outline has more than {MAX_VERTICES:,} vertices; simplify it before uploading."
        )
    geom = shapely.force_2d(geom)

    if source_crs is not None and not source_crs.equals(WGS84):
        transformer = Transformer.from_crs(source_crs, WGS84, always_xy=True)
        geom = shapely.transform(geom, transformer.transform, interleaved=False)

    if not geom.is_valid:
        geom = shapely.make_valid(geom)

    polygons = _polygon_parts(geom)
    if not polygons:
        raise GeometryInputError(
            "Only polygon outlines are supported (points and lines cannot define an area)."
        )
    merged = unary_union(polygons)
    polygons = list(merged.geoms) if isinstance(merged, MultiPolygon) else [merged]

    min_x, min_y, max_x, max_y = merged.bounds
    if not all(map(_finite, merged.bounds)) or min_x < -180 or max_x > 180 or min_y < -90 or max_y > 90:
        raise GeometryInputError(
            "Coordinates are outside the longitude/latitude range. The file is probably in a "
            "projected coordinate system without CRS information; re-export it with a CRS "
            "(or as WGS84 GeoJSON)."
        )
    result = MultiPolygon([orient(p, sign=1.0) for p in polygons])
    if geodesic_area_m2(result) < MIN_AREA_M2:
        raise GeometryInputError("The outline encloses less than 1 m²; check the coordinates.")
    return result


def _polygon_parts(geom: BaseGeometry) -> list[Polygon]:
    if isinstance(geom, Polygon):
        return [] if geom.is_empty else [geom]
    return [p for part in getattr(geom, "geoms", []) for p in _polygon_parts(part)]


def _finite(value: float) -> bool:
    return value == value and abs(value) != float("inf")


def geometry_from_geojson(obj: Any) -> MultiPolygon:
    """Validate one GeoJSON geometry object (as sent by the map drawing tool)."""
    try:
        geom = shape(obj)
    except Exception as exc:  # shapely raises many types for malformed input
        raise GeometryInputError("Not a valid GeoJSON geometry.") from exc
    return normalize_geometry(geom)


def union_features(features: list[ParsedFeature]) -> MultiPolygon:
    return normalize_geometry(unary_union([f.geometry for f in features]))


def parse_vector_file(filename: str, data: bytes) -> list[ParsedFeature]:
    suffix = PurePosixPath(filename.lower()).suffix
    if suffix in (".geojson", ".json"):
        features = _parse_geojson(data)
    elif suffix == ".kml":
        features = _parse_kml(data)
    elif suffix == ".kmz":
        features = _parse_kml(_kml_from_kmz(data))
    elif suffix == ".zip":
        features = _parse_shapefile_zip(data)
    else:
        raise GeometryInputError(
            "Unsupported file type. Upload GeoJSON (.geojson/.json), KML (.kml/.kmz) or a "
            "zipped Shapefile (.zip containing .shp, .shx, .dbf and .prj)."
        )
    if not features:
        raise GeometryInputError("No polygon features were found in the file.")
    return features


# --- GeoJSON ---------------------------------------------------------------


def _parse_geojson(data: bytes) -> list[ParsedFeature]:
    try:
        doc = json.loads(data.decode("utf-8-sig"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise GeometryInputError("The file is not valid GeoJSON (could not parse JSON).") from exc
    if not isinstance(doc, dict):
        raise GeometryInputError("The file is not valid GeoJSON.")

    crs = _legacy_geojson_crs(doc)
    kind = doc.get("type")
    if kind == "FeatureCollection":
        raw = doc.get("features") or []
    elif kind == "Feature":
        raw = [doc]
    else:
        raw = [{"type": "Feature", "properties": {}, "geometry": doc}]

    features = []
    for item in raw:
        geometry = item.get("geometry") if isinstance(item, dict) else None
        if not isinstance(geometry, dict) or geometry.get("type") not in _POLYGONAL_TYPES:
            continue  # points, lines and null geometries are ignored
        try:
            geom = shape(geometry)
        except Exception as exc:
            raise GeometryInputError("The file contains a malformed GeoJSON geometry.") from exc
        features.append(ParsedFeature(_pick_name(item.get("properties")), normalize_geometry(geom, crs)))
    return features


def _legacy_geojson_crs(doc: dict) -> CRS | None:
    """RFC 7946 GeoJSON is always WGS84, but older exports carry a `crs` member."""
    name = ((doc.get("crs") or {}).get("properties") or {}).get("name")
    if not name:
        return None
    try:
        return CRS.from_user_input(name)
    except CRSError as exc:
        raise GeometryInputError(f"Unrecognised coordinate reference system: {name!r}.") from exc


def _pick_name(properties: Any) -> str | None:
    if not isinstance(properties, dict):
        return None
    lowered = {str(k).lower(): v for k, v in properties.items()}
    for field in _NAME_FIELDS:
        value = lowered.get(field)
        if value not in (None, ""):
            return str(value).strip()[:200] or None
    return None


# --- KML / KMZ ---------------------------------------------------------------


def _kml_from_kmz(data: bytes) -> bytes:
    with _open_zip(data) as archive:
        names = [n for n in archive.namelist() if n.lower().endswith(".kml")]
        if not names:
            raise GeometryInputError("The KMZ archive does not contain a .kml file.")
        return archive.read(names[0])


def _parse_kml(data: bytes) -> list[ParsedFeature]:
    try:
        root = ElementTree.fromstring(data)
    except Exception as exc:  # defusedxml raises on malformed or malicious XML
        raise GeometryInputError("The file is not valid KML (could not parse XML).") from exc

    features = []
    for placemark in root.findall(".//{*}Placemark"):
        polygons = []
        for node in placemark.findall(".//{*}Polygon"):
            outer = node.find("{*}outerBoundaryIs/{*}LinearRing/{*}coordinates")
            if outer is None:
                continue
            holes = [
                _kml_ring(inner.text)
                for inner in node.findall("{*}innerBoundaryIs/{*}LinearRing/{*}coordinates")
            ]
            polygons.append(Polygon(_kml_ring(outer.text), holes))
        if polygons:
            name = placemark.findtext("{*}name")
            features.append(
                ParsedFeature(
                    (name or "").strip()[:200] or None, normalize_geometry(MultiPolygon(polygons))
                )
            )
    return features


def _kml_ring(text: str | None) -> list[tuple[float, float]]:
    try:
        ring = [tuple(map(float, token.split(",")[:2])) for token in (text or "").split()]
    except ValueError as exc:
        raise GeometryInputError("The KML contains malformed coordinates.") from exc
    if len(ring) < 4 or any(len(point) != 2 for point in ring):
        raise GeometryInputError("The KML contains a polygon ring with fewer than 4 points.")
    return ring  # type: ignore[return-value]


# --- Shapefile -------------------------------------------------------------------


def _open_zip(data: bytes) -> zipfile.ZipFile:
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        raise GeometryInputError("The file is not a valid zip archive.") from exc
    if sum(info.file_size for info in archive.infolist()) > MAX_UNZIPPED_BYTES:
        raise GeometryInputError("The archive is too large once uncompressed.")
    return archive


def _parse_shapefile_zip(data: bytes) -> list[ParsedFeature]:
    with _open_zip(data) as archive:
        by_suffix: dict[str, list[str]] = {}
        for name in archive.namelist():
            if not name.endswith("/") and "__MACOSX" not in name:
                by_suffix.setdefault(PurePosixPath(name.lower()).suffix, []).append(name)

        shp_names = by_suffix.get(".shp", [])
        if len(shp_names) != 1:
            raise GeometryInputError(
                "The zip must contain exactly one Shapefile (.shp); "
                f"found {len(shp_names)}."
            )
        stem = PurePosixPath(shp_names[0]).with_suffix("")

        def part(suffix: str) -> bytes | None:
            for name in by_suffix.get(suffix, []):
                if PurePosixPath(name).with_suffix("") == stem:
                    return archive.read(name)
            return None

        shx, dbf, prj = part(".shx"), part(".dbf"), part(".prj")
        if prj is None:
            raise GeometryInputError(
                "The Shapefile has no .prj file, so its coordinate reference system is unknown. "
                "Include the .prj in the zip."
            )
        try:
            crs = CRS.from_wkt(prj.decode("utf-8", errors="replace"))
        except CRSError as exc:
            raise GeometryInputError("The Shapefile .prj could not be interpreted.") from exc

        try:
            reader = shapefile.Reader(
                shp=io.BytesIO(archive.read(shp_names[0])),
                shx=io.BytesIO(shx) if shx else None,
                dbf=io.BytesIO(dbf) if dbf else None,
            )
            field_names = [f[0] for f in reader.fields[1:]] if dbf else []
            features = []
            for index, shp in enumerate(reader.iterShapes()):
                if shp.shapeType in (shapefile.NULL,):
                    continue
                if shp.shapeType not in (shapefile.POLYGON, shapefile.POLYGONZ, shapefile.POLYGONM):
                    raise GeometryInputError(
                        "The Shapefile does not contain polygons "
                        f"(found shape type {shp.shapeTypeName})."
                    )
                properties = dict(zip(field_names, reader.record(index))) if dbf else None
                features.append(
                    ParsedFeature(
                        _pick_name(properties),
                        normalize_geometry(shape(shp.__geo_interface__), crs),
                    )
                )
            return features
        except shapefile.ShapefileException as exc:
            raise GeometryInputError("The Shapefile could not be read; it may be corrupt.") from exc

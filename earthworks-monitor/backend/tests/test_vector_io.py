import io
import json
import zipfile

import pytest
import shapefile
from pyproj import CRS, Transformer

from app.geo.vector_io import GeometryInputError, geodesic_area_m2, parse_vector_file

UTM38N = CRS.from_epsg(32638)  # covers 42E-48E, i.e. central Saudi Arabia
RING_LL = [(46.90, 24.20), (46.91, 24.20), (46.91, 24.21), (46.90, 24.21), (46.90, 24.20)]


def _shapefile_zip(ring, prj_wkt, names=("Zone A",)) -> bytes:
    shp, shx, dbf = io.BytesIO(), io.BytesIO(), io.BytesIO()
    writer = shapefile.Writer(shp=shp, shx=shx, dbf=dbf)
    writer.field("NAME", "C")
    for name in names:
        writer.poly([list(reversed(ring))])  # shapefile outer rings are clockwise
        writer.record(name)
    writer.close()
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w") as archive:
        archive.writestr("export/site.shp", shp.getvalue())
        archive.writestr("export/site.shx", shx.getvalue())
        archive.writestr("export/site.dbf", dbf.getvalue())
        if prj_wkt:
            archive.writestr("export/site.prj", prj_wkt)
    return out.getvalue()


def test_geojson_feature_collection_names_and_skips_non_polygons():
    doc = {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {"Name": "Zone A"}, "geometry": {"type": "Polygon", "coordinates": [RING_LL]}},
            {"type": "Feature", "properties": {}, "geometry": {"type": "Point", "coordinates": [46.9, 24.2]}},
            {"type": "Feature", "properties": {}, "geometry": None},
        ],
    }
    features = parse_vector_file("zones.geojson", json.dumps(doc).encode())
    assert [f.name for f in features] == ["Zone A"]
    assert geodesic_area_m2(features[0].geometry) == pytest.approx(1.123e6, rel=0.01)


def test_geojson_with_legacy_projected_crs_is_reprojected():
    to_utm = Transformer.from_crs(4326, UTM38N, always_xy=True)
    doc = {
        "type": "Polygon",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::32638"}},
        "coordinates": [[to_utm.transform(*p) for p in RING_LL]],
    }
    (feature,) = parse_vector_file("site.json", json.dumps(doc).encode())
    assert feature.geometry.bounds == pytest.approx((46.90, 24.20, 46.91, 24.21), abs=1e-6)


def test_shapefile_in_utm_is_reprojected_to_wgs84():
    to_utm = Transformer.from_crs(4326, UTM38N, always_xy=True)
    data = _shapefile_zip([to_utm.transform(*p) for p in RING_LL], UTM38N.to_wkt(), names=("A", "B"))
    features = parse_vector_file("site.zip", data)
    assert [f.name for f in features] == ["A", "B"]
    assert features[0].geometry.bounds == pytest.approx((46.90, 24.20, 46.91, 24.21), abs=1e-6)


def test_shapefile_without_prj_reports_missing_crs():
    with pytest.raises(GeometryInputError, match="no .prj"):
        parse_vector_file("site.zip", _shapefile_zip(RING_LL, None))


def test_kml_polygon_with_hole_and_altitude():
    outer = " ".join(f"{x},{y},0" for x, y in RING_LL)
    hole = "46.904,24.204,0 46.906,24.204,0 46.906,24.206,0 46.904,24.206,0 46.904,24.204,0"
    kml = f"""<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>
      <Placemark><name>Pit</name><Polygon>
        <outerBoundaryIs><LinearRing><coordinates>{outer}</coordinates></LinearRing></outerBoundaryIs>
        <innerBoundaryIs><LinearRing><coordinates>{hole}</coordinates></LinearRing></innerBoundaryIs>
      </Polygon></Placemark>
      <Placemark><name>Gate</name><Point><coordinates>46.9,24.2,0</coordinates></Point></Placemark>
    </Document></kml>""".encode()
    (feature,) = parse_vector_file("site.kml", kml)
    assert feature.name == "Pit"
    assert len(feature.geometry.geoms[0].interiors) == 1
    assert not feature.geometry.has_z

    kmz = io.BytesIO()
    with zipfile.ZipFile(kmz, "w") as archive:
        archive.writestr("doc.kml", kml)
    assert parse_vector_file("site.kmz", kmz.getvalue())[0].name == "Pit"


def test_kml_with_entity_expansion_is_rejected():
    bomb = b'<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "aaaa">]><kml><Placemark>&a;</Placemark></kml>'
    with pytest.raises(GeometryInputError, match="not valid KML"):
        parse_vector_file("x.kml", bomb)


@pytest.mark.parametrize(
    "filename, data, message",
    [
        ("site.dwg", b"x", "Unsupported file type"),
        ("site.geojson", b"{not json", "not valid GeoJSON"),
        ("site.zip", b"not a zip", "not a valid zip"),
        ("site.geojson", b'{"type":"FeatureCollection","features":[]}', "No polygon features"),
        ("site.geojson", json.dumps({"type": "Polygon", "crs": {"properties": {"name": "EPSG:bogus"}}, "coordinates": [RING_LL]}).encode(), "Unrecognised coordinate"),
    ],
)
def test_bad_files_give_clear_errors(filename, data, message):
    with pytest.raises(GeometryInputError, match=message):
        parse_vector_file(filename, data)


def test_parse_endpoint_returns_features_and_union(analyst, viewer):
    data = _shapefile_zip(RING_LL, CRS.from_epsg(4326).to_wkt(), names=("A", "B"))
    files = {"file": ("site.zip", data, "application/zip")}
    assert viewer.post("/api/geometry/parse", files=files).status_code == 403
    body = analyst.post("/api/geometry/parse", files=files).json()
    assert len(body["features"]) == 2
    assert body["union"]["area_m2"] == pytest.approx(body["features"][0]["area_m2"], rel=1e-6)
    bad = analyst.post("/api/geometry/parse", files={"file": ("a.txt", b"x", "text/plain")})
    assert bad.status_code == 422 and "Unsupported" in bad.json()["detail"]

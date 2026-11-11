"""Working grid for metric calculations: the local UTM zone of a site."""
from __future__ import annotations

from pyproj import CRS, Proj, Transformer
from shapely.geometry.base import BaseGeometry
import shapely

WGS84 = CRS.from_epsg(4326)


def utm_epsg_for(lon: float, lat: float) -> int:
    """EPSG code of the WGS84 / UTM zone containing a point (326xx north, 327xx south)."""
    zone = min(60, int((lon + 180.0) // 6) + 1)
    return (32600 if lat >= 0 else 32700) + zone


def utm_crs_for_geometry(geom_wgs84: BaseGeometry) -> CRS:
    centroid = geom_wgs84.centroid
    return CRS.from_epsg(utm_epsg_for(centroid.x, centroid.y))


def reproject_geometry(geom: BaseGeometry, src: CRS, dst: CRS) -> BaseGeometry:
    if src.equals(dst):
        return geom
    transformer = Transformer.from_crs(src, dst, always_xy=True)
    return shapely.transform(geom, transformer.transform, interleaved=False)


def areal_scale_factor(crs: CRS, lon: float, lat: float) -> float:
    """Ratio of map area to true ground area at a point (1.0 for geographic CRS input).

    UTM is conformal, not equal-area: map areas differ from ground areas by up to about
    0.1 %. Dividing a pixel's map area by this factor gives its true area.
    """
    if not crs.is_projected:
        return 1.0
    return float(Proj(crs).get_factors(lon, lat).areal_scale)

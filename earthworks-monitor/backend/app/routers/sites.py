from fastapi import APIRouter, HTTPException, UploadFile, status
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import MultiPolygon, mapping

from app.config import get_settings
from app.deps import AnalystUser, DbSession, ProjectDep, SiteDep, ZoneDep
from app.geo.vector_io import (
    GeometryInputError,
    geodesic_area_m2,
    geometry_from_geojson,
    parse_vector_file,
    union_features,
)
from app.models import Site, Zone
from app.schemas import (
    ParsedFeatureOut,
    ParsedFileOut,
    SiteCreate,
    SiteOut,
    SiteUpdate,
    ZoneCreate,
    ZoneOut,
    ZoneUpdate,
)

router = APIRouter(tags=["sites"])

# Zones may overshoot the site boundary by this much (hand-drawn edges, rounding).
_ZONE_TOLERANCE_DEG = 1e-5  # about 1 m


def _bad_geometry(exc: GeometryInputError) -> HTTPException:
    return HTTPException(422, str(exc))


def _parse(geometry: dict) -> MultiPolygon:
    try:
        return geometry_from_geojson(geometry)
    except GeometryInputError as exc:
        raise _bad_geometry(exc) from exc


def _check_zone_inside_site(zone_geom: MultiPolygon, site: Site) -> None:
    if not to_shape(site.geom).buffer(_ZONE_TOLERANCE_DEG).covers(zone_geom):
        raise HTTPException(
            422,
            f"The zone extends outside the boundary of site '{site.name}'. "
            "Zones must lie within their site.",
        )


def _to_db(geom: MultiPolygon):
    return from_shape(geom, srid=4326)


@router.post("/geometry/parse", response_model=ParsedFileOut)
async def parse_geometry_file(file: UploadFile, _: AnalystUser):
    """Read an outline file and return its polygons in WGS84, without storing anything."""
    limit = get_settings().max_upload_mb * 1024 * 1024
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"The file is larger than the {get_settings().max_upload_mb} MB upload limit.",
        )
    try:
        features = parse_vector_file(file.filename or "", data)
        union = union_features(features)
    except GeometryInputError as exc:
        raise _bad_geometry(exc) from exc

    def out(name, geom):
        return ParsedFeatureOut(name=name, geometry=mapping(geom), area_m2=geodesic_area_m2(geom))

    return ParsedFileOut(
        features=[out(f.name, f.geometry) for f in features], union=out(None, union)
    )


# --- sites ---


@router.get("/projects/{project_id}/sites", response_model=list[SiteOut])
def list_sites(project: ProjectDep):
    return [SiteOut.from_model(s) for s in project.sites]


@router.post(
    "/projects/{project_id}/sites", response_model=SiteOut, status_code=status.HTTP_201_CREATED
)
def create_site(body: SiteCreate, project: ProjectDep, _: AnalystUser, db: DbSession):
    site = Site(
        project_id=project.id,
        name=body.name,
        description=body.description,
        geom=_to_db(_parse(body.geometry)),
    )
    db.add(site)
    db.commit()
    return SiteOut.from_model(site)


@router.get("/sites/{site_id}", response_model=SiteOut)
def read_site(site: SiteDep):
    return SiteOut.from_model(site)


@router.patch("/sites/{site_id}", response_model=SiteOut)
def update_site(body: SiteUpdate, site: SiteDep, _: AnalystUser, db: DbSession):
    if body.name is not None:
        site.name = body.name
    if body.description is not None:
        site.description = body.description
    if body.geometry is not None:
        geom = _parse(body.geometry)
        outside = [
            z.name
            for z in site.zones
            if not geom.buffer(_ZONE_TOLERANCE_DEG).covers(to_shape(z.geom))
        ]
        if outside:
            raise HTTPException(
                422,
                "The new boundary would leave these zones outside the site: "
                + ", ".join(outside),
            )
        site.geom = _to_db(geom)
    db.commit()
    return SiteOut.from_model(site)


@router.delete("/sites/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_site(site: SiteDep, _: AnalystUser, db: DbSession):
    db.delete(site)
    db.commit()


# --- zones ---


@router.post("/sites/{site_id}/zones", response_model=ZoneOut, status_code=status.HTTP_201_CREATED)
def create_zone(body: ZoneCreate, site: SiteDep, _: AnalystUser, db: DbSession):
    geom = _parse(body.geometry)
    _check_zone_inside_site(geom, site)
    zone = Zone(
        site_id=site.id,
        name=body.name,
        zone_type=body.zone_type,
        description=body.description,
        geom=_to_db(geom),
    )
    db.add(zone)
    db.commit()
    return ZoneOut.from_model(zone)


@router.patch("/zones/{zone_id}", response_model=ZoneOut)
def update_zone(body: ZoneUpdate, zone: ZoneDep, _: AnalystUser, db: DbSession):
    if body.name is not None:
        zone.name = body.name
    if body.description is not None:
        zone.description = body.description
    if body.zone_type is not None:
        zone.zone_type = body.zone_type
    if body.geometry is not None:
        geom = _parse(body.geometry)
        _check_zone_inside_site(geom, zone.site)
        zone.geom = _to_db(geom)
    db.commit()
    return ZoneOut.from_model(zone)


@router.delete("/zones/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zone(zone: ZoneDep, _: AnalystUser, db: DbSession):
    db.delete(zone)
    db.commit()

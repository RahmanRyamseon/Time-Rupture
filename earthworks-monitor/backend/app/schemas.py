import uuid
from datetime import date, datetime
from typing import Any, Literal

from geoalchemy2.shape import to_shape
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from shapely.geometry import mapping

from app.geo.vector_io import geodesic_area_m2
from app.models import Project, Site, Zone
from app.security import MIN_PASSWORD_LENGTH

Role = Literal["analyst", "viewer"]
ZoneType = Literal["cut", "fill", "mixed"]


def _name(**kw):
    return Field(min_length=1, max_length=200, **kw)


def _password(**kw):
    return Field(min_length=MIN_PASSWORD_LENGTH, max_length=200, **kw)



class _Orm(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- auth / users ---


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(_Orm):
    id: uuid.UUID
    email: str
    full_name: str
    role: Role
    is_active: bool


class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(default="", max_length=200)
    role: Role
    password: str = _password()


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=200)
    role: Role | None = None
    is_active: bool | None = None
    password: str | None = _password(default=None)


# --- geometry-bearing resources ---


class ZoneOut(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    name: str
    zone_type: ZoneType
    description: str
    geometry: dict[str, Any]
    area_m2: float

    @classmethod
    def from_model(cls, zone: Zone) -> "ZoneOut":
        geom = to_shape(zone.geom)
        return cls(
            id=zone.id,
            site_id=zone.site_id,
            name=zone.name,
            zone_type=zone.zone_type,  # type: ignore[arg-type]
            description=zone.description,
            geometry=mapping(geom),
            area_m2=geodesic_area_m2(geom),
        )


class SiteOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: str
    geometry: dict[str, Any]
    area_m2: float
    bbox: tuple[float, float, float, float]
    zones: list[ZoneOut]
    created_at: datetime

    @classmethod
    def from_model(cls, site: Site) -> "SiteOut":
        geom = to_shape(site.geom)
        return cls(
            id=site.id,
            project_id=site.project_id,
            name=site.name,
            description=site.description,
            geometry=mapping(geom),
            area_m2=geodesic_area_m2(geom),
            bbox=geom.bounds,
            zones=[ZoneOut.from_model(z) for z in site.zones],
            created_at=site.created_at,
        )


class SiteCreate(BaseModel):
    name: str = _name()
    description: str = ""
    geometry: dict[str, Any]


class SiteUpdate(BaseModel):
    name: str | None = _name(default=None)
    description: str | None = None
    geometry: dict[str, Any] | None = None


class ZoneCreate(SiteCreate):
    zone_type: ZoneType = "mixed"


class ZoneUpdate(SiteUpdate):
    zone_type: ZoneType | None = None


class ProjectOut(BaseModel):
    id: uuid.UUID
    name: str
    client_name: str
    description: str
    site_count: int
    created_at: datetime

    @classmethod
    def from_model(cls, project: Project) -> "ProjectOut":
        return cls(
            id=project.id,
            name=project.name,
            client_name=project.client_name,
            description=project.description,
            site_count=len(project.sites),
            created_at=project.created_at,
        )


class ProjectCreate(BaseModel):
    name: str = _name()
    client_name: str = Field(default="", max_length=200)
    description: str = ""


class ProjectUpdate(BaseModel):
    name: str | None = _name(default=None)
    client_name: str | None = Field(default=None, max_length=200)
    description: str | None = None


class MembersIn(BaseModel):
    user_ids: list[uuid.UUID]


class ParsedFeatureOut(BaseModel):
    name: str | None
    geometry: dict[str, Any]
    area_m2: float


class ParsedFileOut(BaseModel):
    features: list[ParsedFeatureOut]
    # All features dissolved into one outline (what a site boundary upload uses).
    union: ParsedFeatureOut


class ConfigOut(BaseModel):
    app_name: str
    basemap_tile_url: str
    basemap_attribution: str
    max_upload_mb: int
    max_dem_upload_mb: int
    max_stereo_upload_mb: int
    camera_models: list[str]
    single_file_camera_models: list[str]


# --- surfaces, analyses, jobs ---

SurfaceKind = Literal["survey", "design"]
VerticalDatum = Literal["ellipsoidal_wgs84", "egm2008", "egm96", "local"]


class SurfaceOut(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    kind: SurfaceKind
    name: str
    survey_date: date | None
    source_type: str
    vertical_datum: str
    stated_accuracy_m: float | None
    status: str
    released: bool
    is_reference: bool
    original_filename: str
    resolution_m: float | None
    bounds_wgs84: list[float] | None
    stats: dict[str, Any] | None
    vertical_offset_m: float
    alignment: dict[str, Any] | None
    provenance: dict[str, Any]
    error: str | None
    created_at: datetime
    has_orthoimage: bool
    # Too coarse for real earthworks measurement; shown with a "demonstration" notice.
    demo_resolution: bool

    @classmethod
    def from_model(cls, surface: Any) -> "SurfaceOut":
        from app.config import get_settings

        computed = ("is_reference", "has_orthoimage", "demo_resolution")
        data = {name: getattr(surface, name) for name in cls.model_fields if name not in computed}
        return cls(
            **data,
            is_reference=surface.site.reference_surface_id == surface.id,
            has_orthoimage=bool((surface.stats or {}).get("orthoimage")),
            demo_resolution=(surface.resolution_m or 0) >= get_settings().demo_resolution_threshold_m,
        )


class SurfaceUpdate(BaseModel):
    name: str | None = _name(default=None)
    released: bool | None = None


class ReferenceIn(BaseModel):
    surface_id: uuid.UUID


class AnalysisCreate(BaseModel):
    from_surface_id: uuid.UUID
    to_surface_id: uuid.UUID
    # Absolute level-of-detection threshold in metres; omit to derive it from the data.
    lod_m: float | None = Field(default=None, ge=0, le=1000)


class AnalysisOut(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    from_surface_id: uuid.UUID
    to_surface_id: uuid.UUID
    status: str
    stale: bool
    lod_override_m: float | None
    results: dict[str, Any] | None
    provenance: dict[str, Any]
    error: str | None
    computed_at: datetime | None


class JobOut(_Orm):
    id: uuid.UUID
    site_id: uuid.UUID
    kind: str
    surface_id: uuid.UUID | None
    analysis_id: uuid.UUID | None
    status: str
    attempts: int
    error: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None


class JobDetail(JobOut):
    log: str

import uuid
from datetime import date, datetime

from geoalchemy2 import Geometry, WKBElement
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

ROLE_ANALYST = "analyst"
ROLE_VIEWER = "viewer"
ROLES = (ROLE_ANALYST, ROLE_VIEWER)
ZONE_TYPES = ("cut", "fill", "mixed")

KIND_SURVEY = "survey"
KIND_DESIGN = "design"
STATUS_PROCESSING = "processing"
STATUS_READY = "ready"
STATUS_FAILED = "failed"
JOB_QUEUED, JOB_RUNNING, JOB_FAILED, JOB_DONE = "queued", "running", "failed", "done"
# Height reference of an elevation raster. Surfaces are only compared within one datum.
VERTICAL_DATUMS = ("ellipsoidal_wgs84", "egm2008", "egm96", "local")


class Base(DeclarativeBase):
    pass


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def _created_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now())


def _geom() -> Mapped[WKBElement]:
    # Stored in WGS84 lon/lat; metric work reprojects to the local UTM zone.
    return mapped_column(Geometry("MULTIPOLYGON", srid=4326, spatial_index=False), nullable=False)


project_members = Table(
    "project_members",
    Base.metadata,
    Column("project_id", ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('analyst', 'viewer')", name="ck_users_role"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    email: Mapped[str] = mapped_column(String(320), unique=True)
    full_name: Mapped[str] = mapped_column(String(200), default="", server_default="")
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = _created_at()


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(String(200))
    client_name: Mapped[str] = mapped_column(String(200), default="", server_default="")
    description: Mapped[str] = mapped_column(Text, default="", server_default="")
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = _created_at()

    sites: Mapped[list["Site"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="Site.created_at"
    )
    members: Mapped[list[User]] = relationship(secondary=project_members, order_by=User.email)


class Site(Base):
    __tablename__ = "sites"
    __table_args__ = (Index("ix_sites_geom", "geom", postgresql_using="gist"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="", server_default="")
    geom: Mapped[WKBElement] = _geom()
    # The baseline epoch every other survey is aligned to and progress is measured from.
    reference_surface_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("surfaces.id", ondelete="SET NULL", name="fk_sites_reference_surface")
    )
    created_at: Mapped[datetime] = _created_at()

    project: Mapped[Project] = relationship(back_populates="sites")
    surfaces: Mapped[list["Surface"]] = relationship(
        back_populates="site",
        cascade="all, delete-orphan",
        foreign_keys="Surface.site_id",
        order_by="Surface.survey_date, Surface.created_at",
    )
    zones: Mapped[list["Zone"]] = relationship(
        back_populates="site", cascade="all, delete-orphan", order_by="Zone.created_at"
    )


class Zone(Base):
    __tablename__ = "zones"
    __table_args__ = (
        CheckConstraint("zone_type IN ('cut', 'fill', 'mixed')", name="ck_zones_type"),
        Index("ix_zones_geom", "geom", postgresql_using="gist"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    site_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sites.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    zone_type: Mapped[str] = mapped_column(String(20), default="mixed", server_default="mixed")
    description: Mapped[str] = mapped_column(Text, default="", server_default="")
    geom: Mapped[WKBElement] = _geom()
    created_at: Mapped[datetime] = _created_at()

    site: Mapped[Site] = relationship(back_populates="zones")


class Surface(Base):
    """An elevation surface of a site: a dated survey epoch or the design surface."""

    __tablename__ = "surfaces"

    id: Mapped[uuid.UUID] = _uuid_pk()
    site_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sites.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(200))
    survey_date: Mapped[date | None] = mapped_column(Date)
    source_type: Mapped[str] = mapped_column(String(30))  # dem_upload | stereo (Phase 3)
    vertical_datum: Mapped[str] = mapped_column(String(30))
    # Supplier-stated vertical accuracy (1-sigma / RMSE, metres). Not used for design.
    stated_accuracy_m: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), default=STATUS_PROCESSING)
    # Viewers only ever see released surfaces and results derived from them.
    released: Mapped[bool] = mapped_column(Boolean, default=False)
    original_filename: Mapped[str] = mapped_column(String(300), default="")
    grid_epsg: Mapped[int | None] = mapped_column(Integer)
    resolution_m: Mapped[float | None] = mapped_column(Float)
    bounds_wgs84: Mapped[list | None] = mapped_column(JSONB)
    stats: Mapped[dict | None] = mapped_column(JSONB)
    # Found by alignment to the reference; subtracted from heights before differencing.
    vertical_offset_m: Mapped[float] = mapped_column(Float, default=0.0)
    alignment: Mapped[dict | None] = mapped_column(JSONB)
    provenance: Mapped[dict] = mapped_column(JSONB, default=dict)
    error: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = _created_at()

    site: Mapped[Site] = relationship(back_populates="surfaces", foreign_keys=[site_id])


class Analysis(Base):
    """A DEM of Difference (`to` minus `from`) with per-zone volumes."""

    __tablename__ = "analyses"
    __table_args__ = (UniqueConstraint("from_surface_id", "to_surface_id", name="uq_analyses_pair"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    site_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sites.id", ondelete="CASCADE"), index=True)
    from_surface_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("surfaces.id", ondelete="CASCADE"), index=True
    )
    to_surface_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("surfaces.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(20), default=STATUS_PROCESSING)
    lod_override_m: Mapped[float | None] = mapped_column(Float)
    # Fingerprint of everything the result depends on; a mismatch marks it stale.
    inputs_hash: Mapped[str | None] = mapped_column(String(64))
    results: Mapped[dict | None] = mapped_column(JSONB)
    provenance: Mapped[dict] = mapped_column(JSONB, default=dict)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created_at()
    computed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    site: Mapped[Site] = relationship()
    from_surface: Mapped[Surface] = relationship(foreign_keys=[from_surface_id])
    to_surface: Mapped[Surface] = relationship(foreign_keys=[to_surface_id])


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = _uuid_pk()
    site_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sites.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(30))  # ingest_surface | analysis | realign_site
    surface_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("surfaces.id", ondelete="CASCADE"), index=True
    )
    analysis_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(20), default=JOB_QUEUED)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    log: Mapped[str] = mapped_column(Text, default="")
    error: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = _created_at()
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

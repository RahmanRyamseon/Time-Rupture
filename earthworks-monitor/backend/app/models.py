import uuid
from datetime import datetime

from geoalchemy2 import Geometry, WKBElement
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

ROLE_ANALYST = "analyst"
ROLE_VIEWER = "viewer"
ROLES = (ROLE_ANALYST, ROLE_VIEWER)
ZONE_TYPES = ("cut", "fill", "mixed")


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
    created_at: Mapped[datetime] = _created_at()

    project: Mapped[Project] = relationship(back_populates="sites")
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

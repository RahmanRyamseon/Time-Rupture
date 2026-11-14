"""Initial schema: users, projects, membership, sites, zones.

Revision ID: 0001
"""
import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geometry
from sqlalchemy.dialects.postgresql import UUID

revision = "0001"
down_revision = None


def _geom():
    return Geometry("MULTIPOLYGON", srid=4326, spatial_index=False)


def _ts():
    return sa.Column(
        "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("full_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        _ts(),
        sa.CheckConstraint("role IN ('analyst', 'viewer')", name="ck_users_role"),
    )
    op.create_table(
        "projects",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("client_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        _ts(),
    )
    op.create_table(
        "project_members",
        sa.Column(
            "project_id",
            UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )
    op.create_table(
        "sites",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("geom", _geom(), nullable=False),
        _ts(),
    )
    op.create_index("ix_sites_geom", "sites", ["geom"], postgresql_using="gist")
    op.create_table(
        "zones",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "site_id",
            UUID(as_uuid=True),
            sa.ForeignKey("sites.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("zone_type", sa.String(20), nullable=False, server_default="mixed"),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("geom", _geom(), nullable=False),
        _ts(),
        sa.CheckConstraint("zone_type IN ('cut', 'fill', 'mixed')", name="ck_zones_type"),
    )
    op.create_index("ix_zones_geom", "zones", ["geom"], postgresql_using="gist")


def downgrade() -> None:
    for table in ("zones", "sites", "project_members", "projects", "users"):
        op.drop_table(table)

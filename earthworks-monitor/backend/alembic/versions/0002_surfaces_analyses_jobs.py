"""Surfaces (survey epochs and design surfaces), analyses (DEM of Difference), jobs.

Revision ID: 0002
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0002"
down_revision = "0001"


def _id():
    return sa.Column("id", UUID(as_uuid=True), primary_key=True)


def _fk(name, target, ondelete="CASCADE", nullable=False):
    return sa.Column(
        name, UUID(as_uuid=True), sa.ForeignKey(target, ondelete=ondelete), nullable=nullable, index=True
    )


def _ts():
    return sa.Column(
        "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )


def upgrade() -> None:
    op.create_table(
        "surfaces",
        _id(),
        _fk("site_id", "sites.id"),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("survey_date", sa.Date),
        sa.Column("source_type", sa.String(30), nullable=False),
        sa.Column("vertical_datum", sa.String(30), nullable=False),
        sa.Column("stated_accuracy_m", sa.Float),
        sa.Column("status", sa.String(20), nullable=False, server_default="processing"),
        sa.Column("released", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("original_filename", sa.String(300), nullable=False, server_default=""),
        sa.Column("grid_epsg", sa.Integer),
        sa.Column("resolution_m", sa.Float),
        sa.Column("bounds_wgs84", JSONB),
        sa.Column("stats", JSONB),
        sa.Column("vertical_offset_m", sa.Float, nullable=False, server_default="0"),
        sa.Column("alignment", JSONB),
        sa.Column("provenance", JSONB, nullable=False, server_default="{}"),
        sa.Column("error", sa.Text),
        _fk("created_by", "users.id", ondelete="SET NULL", nullable=True),
        _ts(),
        sa.CheckConstraint("kind IN ('survey', 'design')", name="ck_surfaces_kind"),
        sa.CheckConstraint("status IN ('processing', 'ready', 'failed')", name="ck_surfaces_status"),
        sa.CheckConstraint("kind = 'design' OR survey_date IS NOT NULL", name="ck_surfaces_survey_date"),
        sa.CheckConstraint(
            "kind = 'design' OR stated_accuracy_m > 0", name="ck_surfaces_stated_accuracy"
        ),
    )
    op.add_column(
        "sites",
        sa.Column(
            "reference_surface_id",
            UUID(as_uuid=True),
            sa.ForeignKey("surfaces.id", ondelete="SET NULL", name="fk_sites_reference_surface"),
        ),
    )
    op.create_table(
        "analyses",
        _id(),
        _fk("site_id", "sites.id"),
        _fk("from_surface_id", "surfaces.id"),
        _fk("to_surface_id", "surfaces.id"),
        sa.Column("status", sa.String(20), nullable=False, server_default="processing"),
        sa.Column("lod_override_m", sa.Float),
        sa.Column("inputs_hash", sa.String(64)),
        sa.Column("results", JSONB),
        sa.Column("provenance", JSONB, nullable=False, server_default="{}"),
        sa.Column("error", sa.Text),
        _ts(),
        sa.Column("computed_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("from_surface_id", "to_surface_id", name="uq_analyses_pair"),
        sa.CheckConstraint("from_surface_id <> to_surface_id", name="ck_analyses_distinct"),
        sa.CheckConstraint("status IN ('processing', 'ready', 'failed')", name="ck_analyses_status"),
    )
    op.create_table(
        "jobs",
        _id(),
        _fk("site_id", "sites.id"),
        sa.Column("kind", sa.String(30), nullable=False),
        _fk("surface_id", "surfaces.id", nullable=True),
        _fk("analysis_id", "analyses.id", nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="queued"),
        sa.Column("attempts", sa.Integer, nullable=False, server_default="0"),
        sa.Column("log", sa.Text, nullable=False, server_default=""),
        sa.Column("error", sa.Text),
        _fk("created_by", "users.id", ondelete="SET NULL", nullable=True),
        _ts(),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint(
            "status IN ('queued', 'running', 'failed', 'done')", name="ck_jobs_status"
        ),
    )


def downgrade() -> None:
    op.drop_table("jobs")
    op.drop_table("analyses")
    op.drop_constraint("fk_sites_reference_surface", "sites", type_="foreignkey")
    op.drop_column("sites", "reference_surface_id")
    op.drop_table("surfaces")

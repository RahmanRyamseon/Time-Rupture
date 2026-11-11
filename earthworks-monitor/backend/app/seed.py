"""Idempotent demo seed: two users and one project with a site and two zones.

The site is a fictional rectangle in open desert; it does not represent a real project.
Synthetic survey data is added to this seed in Phase 2.
"""
from geoalchemy2.shape import from_shape
from shapely.geometry import MultiPolygon, box
from sqlalchemy import select

from app.cli import upsert_user
from app.config import get_settings
from app.db import new_session
from app.models import ROLE_ANALYST, ROLE_VIEWER, Project, Site, Zone

DEMO_PROJECT = "Demo – Desert Logistics Platform"
# lon/lat rectangle of roughly 1.0 km x 0.8 km
_SITE = box(46.9000, 24.2000, 46.9100, 24.2072)
_ZONES = [
    ("Zone A – fill embankment", "fill", box(46.9010, 24.2010, 46.9045, 24.2060)),
    ("Zone B – borrow pit", "cut", box(46.9055, 24.2010, 46.9090, 24.2060)),
]


def _geom(polygon):
    return from_shape(MultiPolygon([polygon]), srid=4326)


def main() -> None:
    settings = get_settings()
    with new_session() as db:
        users = {}
        for role, email, password in (
            (ROLE_ANALYST, settings.demo_analyst_email, settings.demo_analyst_password),
            (ROLE_VIEWER, settings.demo_viewer_email, settings.demo_viewer_password),
        ):
            if not email or not password:
                print(f"Seed: DEMO_{role.upper()}_EMAIL/PASSWORD not set; skipping {role} user")
                continue
            exists = upsert_user(db, email, role, password, f"Demo {role}")
            users[role] = exists

        project = db.scalar(select(Project).where(Project.name == DEMO_PROJECT))
        if project is not None:
            print("Seed: demo project already present")
            return
        project = Project(
            name=DEMO_PROJECT,
            client_name="Demo Client",
            description="Fictional site with synthetic data, for demonstration only.",
            created_by=users[ROLE_ANALYST].id if ROLE_ANALYST in users else None,
        )
        if ROLE_VIEWER in users:
            project.members = [users[ROLE_VIEWER]]
        site = Site(name="Main platform", geom=_geom(_SITE), description="Demo site boundary")
        site.zones = [Zone(name=n, zone_type=t, geom=_geom(g)) for n, t, g in _ZONES]
        project.sites = [site]
        db.add(project)
        db.commit()
        print("Seed: demo project created")


if __name__ == "__main__":
    main()

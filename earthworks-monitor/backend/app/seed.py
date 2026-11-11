"""Idempotent demo seed: two users and one project with a site, two zones, a design
surface and four synthetic survey epochs, so the dashboard is populated on first run.

The site is a fictional rectangle in open desert; it does not represent a real project.
The surveys are generated terrain with exactly known volumes, noise and deliberate
vertical offsets (see app/geo/synthetic.py); they go through the normal upload pipeline.
"""
import os
import tempfile
from datetime import date

from geoalchemy2.shape import to_shape
from geoalchemy2.shape import from_shape
from shapely.geometry import MultiPolygon, box
from sqlalchemy import select

from app.cli import upsert_user
from app.config import get_settings
from app.db import new_session
from app.geo.grid import WGS84, reproject_geometry, utm_crs_for_geometry
from app.geo.synthetic import Mound, write_synthetic_dem
from app.jobs.runner import dispatch
from app.models import ROLE_ANALYST, ROLE_VIEWER, Project, Site, Zone
from app.services.surfaces import register_surface

DEMO_PROJECT = "Demo – Desert Logistics Platform"
# lon/lat rectangle of roughly 1.0 km x 0.8 km
_SITE = box(46.9000, 24.2000, 46.9100, 24.2072)
_ZONES = [
    ("Zone A – fill embankment", "fill", box(46.9010, 24.2010, 46.9045, 24.2060)),
    ("Zone B – borrow pit", "cut", box(46.9055, 24.2010, 46.9090, 24.2060)),
]


# (name, date, fraction of the design built, deliberate vertical offset in metres)
_EPOCHS = [
    ("Baseline survey", date(2026, 3, 1), 0.0, 0.0),
    ("Survey 2", date(2026, 5, 1), 0.3, 0.42),
    ("Survey 3", date(2026, 7, 1), 0.65, -0.27),
    ("Survey 4", date(2026, 9, 1), 0.9, 0.61),
]
_NOISE_M = 0.04
_RESOLUTION_M = 1.0


def _inset_box(zone_wgs84, crs, inset_m: float, height: float, ramp: float) -> Mound:
    xmin, ymin, xmax, ymax = (round(v) for v in reproject_geometry(zone_wgs84, WGS84, crs).bounds)
    return Mound(xmin + inset_m, ymin + inset_m, xmax - inset_m, ymax - inset_m, height, ramp)


def seed_surfaces(db, site: Site, user_id) -> None:
    """Design: a 4 m embankment in Zone A and a 6 m borrow pit in Zone B."""
    geom = to_shape(site.geom)
    crs = utm_crs_for_geometry(geom)
    xmin, ymin, xmax, ymax = (round(v) for v in reproject_geometry(geom, WGS84, crs).bounds)
    bounds = (xmin - 120.0, ymin - 120.0, xmax + 120.0, ymax + 120.0)
    zones = {z.zone_type: to_shape(z.geom) for z in site.zones}
    design = (
        _inset_box(zones["fill"], crs, 45.0, height=4.0, ramp=16.0),
        _inset_box(zones["cut"], crs, 45.0, height=-6.0, ramp=18.0),
    )

    def add(kind, name, survey_date, mounds, **dem):
        handle, path = tempfile.mkstemp(suffix=".tif")
        os.close(handle)
        write_synthetic_dem(
            path, epsg=crs.to_epsg(), bounds=bounds, resolution=_RESOLUTION_M, mounds=mounds, **dem
        )
        _, job = register_surface(
            db,
            site,
            src_path=path,
            filename=f"synthetic-{name.lower().replace(' ', '-')}.tif",
            kind=kind,
            name=name,
            survey_date=survey_date,
            vertical_datum="ellipsoidal_wgs84",
            stated_accuracy_m=0.05 if kind == "survey" else None,
            user_id=user_id,
            released=True,
        )
        dispatch(db, [job], eager=True)  # run inline so the demo is ready at first sign-in

    for index, (name, survey_date, fraction, offset) in enumerate(_EPOCHS):
        built = tuple(m.scaled(fraction) for m in design) if fraction else ()
        add("survey", name, survey_date, built, noise_sigma=_NOISE_M, seed=index + 1, vertical_offset=offset)
    add("design", "Design surface", None, design)


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
        print("Seed: demo project created; generating synthetic surveys...")
        seed_surfaces(db, site, project.created_by)
        print("Seed: synthetic surveys and analyses ready")


if __name__ == "__main__":
    main()

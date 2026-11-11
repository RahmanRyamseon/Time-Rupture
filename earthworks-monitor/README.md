# Earthworks Monitor

Construction-progress and earthworks-volume tracking from satellite / drone 3D data, for
project owners, contractors and quarry operators. ("Earthworks Monitor" is a working name:
change `APP_NAME` in `.env` to rename the product everywhere.)

> **Status: Phase 1 of 4 (skeleton).** Projects, sites, zones, auth and the map work.
> Surveys, volumes, the ASP pipeline and reports are not built yet — see *Roadmap*.

## Run it

Requires Docker with Compose v2.

```bash
cd earthworks-monitor
cp .env.example .env
```

Edit `.env` and replace every `CHANGE-ME` value (`SECRET_KEY` must be at least 32 characters;
the database password appears twice). Then:

```bash
docker compose up --build
```

Open http://localhost:8080 and sign in with `DEMO_ANALYST_EMAIL` / `DEMO_ANALYST_PASSWORD`
from your `.env`. A demo project (a fictional desert site with a fill zone and a cut zone) is
created on first start. The viewer account (`DEMO_VIEWER_*`) shows the read-only view.

Create further users in the UI (**Users**, analysts only) or from the command line:

```bash
docker compose exec api python -m app.cli create-user --email you@example.com --role analyst
```

For production set `SEED_DEMO_ON_START=false`, `COOKIE_SECURE=true`, and serve behind HTTPS.

## What works in Phase 1

- **Stack**: `db` (PostgreSQL 16 + PostGIS), `redis`, `api` (FastAPI), `worker` (RQ, idle until
  Phase 2), `frontend` (React build served by nginx, which also proxies `/api`).
- **Auth**: email + password (Argon2id), session in an httpOnly `SameSite=Strict` cookie or a
  Bearer token for scripts, login rate limiting. No public sign-up.
- **Roles**: analysts manage everything. Viewers are read-only and see only projects they
  have been given access to (project page → *Viewer access*).
- **Projects, sites, zones**: create, list, edit (API), delete. Outlines are drawn on the map
  or uploaded as GeoJSON, KML/KMZ or zipped Shapefile; uploads are reprojected to WGS84. A file
  with several polygons becomes one site outline, or one zone per polygon.
- **Validation with clear messages**: missing CRS (`.prj`), projected coordinates without a
  CRS, non-polygon data, zones outside their site, oversize or corrupt files.
- **Map**: MapLibre with site and zone outlines (blue = cut, red = fill), legend, scale bar.
  The basemap is optional (`BASEMAP_TILE_URL`); leave it empty to run with no external service.
- **Languages**: English and Arabic with a full right-to-left layout; all strings live in
  `frontend/src/i18n/`.

## Layout

```
earthworks-monitor/
  docker-compose.yml  .env.example
  backend/
    app/
      config.py          settings from environment variables only
      models.py          SQLAlchemy models (users, projects, members, sites, zones)
      routers/           auth, users, projects, sites + zones
      geo/vector_io.py   outline parsing and validation
      cli.py  seed.py  worker.py
    alembic/             database migrations
    tests/               pytest (needs PostGIS + Redis)
  frontend/
    src/pages/           Login, Projects, Project (map workspace), Users
    src/components/      MapView (layers, polygon drawing)
    src/i18n/            en.json, ar.json
```

## Development

Backend tests run against a real PostGIS database and Redis:

```bash
docker run -d --name em-test-db -e POSTGRES_PASSWORD=test -e POSTGRES_DB=em_test -p 55432:5432 postgis/postgis:16-3.4
```

```bash
docker run -d --name em-test-redis -p 56379:6379 redis:7-alpine
```

```bash
cd backend && python3.11 -m venv .venv && .venv/bin/pip install -e '.[dev]' && .venv/bin/pytest
```

`TEST_DATABASE_URL` and `TEST_REDIS_URL` override the defaults. After changing dependencies in
`pyproject.toml`, regenerate `requirements.lock` (the image installs from it) with `pip freeze`.

Frontend with hot reload (expects the API on `localhost:8000`, or set `VITE_API_PROXY`):

```bash
cd frontend && npm install && npm run dev
```

API documentation is served at `/api/docs`.

## Roadmap

1. **Skeleton** — done.
2. **DEM upload + volume engine**: GeoTIFF epochs and design surface, DEM of difference,
   cut/fill/net volumes with uncertainty, raster tiles (TiTiler), synthetic-data tests.
3. **ASP path**: worker image with a pinned NASA Ames Stereo Pipeline, stereo → DEM →
   alignment jobs with logs and retry, ASTER demo.
4. **Reports and polish**: progress charts, bilingual PDF report, `METHOD.md`, licence texts.

## Known limitations (Phase 1)

- Editing an existing outline is API-only (`PATCH`); the UI can add and delete.
- No password-reset flow; an analyst resets passwords via the API or `app.cli`.
- Sessions cannot be revoked individually before they expire (deactivating a user does cut
  them off immediately).
- Arabic uses system fonts for now; a bundled Arabic font arrives with the PDF report.

## Attribution

Phase 3 will use the NASA Ames Stereo Pipeline (Apache-2.0). The full attribution notice and
the licence texts of all bundled dependencies are added to `LICENSES/` when they are bundled.

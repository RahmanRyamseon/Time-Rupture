# Earthworks Monitor

Construction-progress and earthworks-volume tracking from satellite / drone 3D data, for
project owners, contractors and quarry operators. ("Earthworks Monitor" is a working name:
change `APP_NAME` in `.env` to rename the product everywhere.)

> **Status: Phase 2 of 4.** DEM upload, alignment, cut/fill volumes with uncertainty and the
> site dashboard work. The satellite-stereo (ASP) pipeline and PDF reports are not built
> yet — see *Roadmap*. The volume method is explained in [METHOD.md](METHOD.md).

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
from your `.env`. A demo project is created on first start: a fictional desert site with a
fill zone, a cut zone, a design surface and four synthetic surveys at 0 %, 30 %, 65 % and
90 % of the design (first start takes about half a minute while they are generated).
Open the project, then **Open dashboard** on the site. The viewer account
(`DEMO_VIEWER_*`) shows the read-only view of released results.

Create further users in the UI (**Users**, analysts only) or from the command line:

```bash
docker compose exec api python -m app.cli create-user --email you@example.com --role analyst
```

For production set `SEED_DEMO_ON_START=false`, `COOKIE_SECURE=true`, and serve behind HTTPS.

## What works

**Platform (Phase 1)**

- **Stack**: `db` (PostgreSQL 16 + PostGIS), `redis`, `api` (FastAPI), `worker` (RQ),
  `tiler` (map tiles), `frontend` (React build served by nginx, which proxies `/api`).
- **Auth**: email + password (Argon2id), session in an httpOnly `SameSite=Strict` cookie or a
  Bearer token for scripts, login rate limiting. No public sign-up.
- **Roles**: analysts manage everything. Viewers are read-only, see only projects they
  have been given access to (project page → *Viewer access*) and only released results.
- **Projects, sites, zones**: outlines drawn on the map or uploaded as GeoJSON, KML/KMZ or
  zipped Shapefile, reprojected to WGS84, with clear messages for bad input.
- **Languages**: English and Arabic with a full right-to-left layout; all strings live in
  `frontend/src/i18n/`.

**Surveys and volumes (Phase 2)**

- **Upload** a DEM/DSM GeoTIFF as a dated survey or as the design surface, with its height
  reference and stated accuracy. Bad files are refused immediately with the reason (no CRS,
  not a single-band raster, no overlap with the site, mixed height references).
- **Processing in the worker**: reprojection to the site's UTM grid as a Cloud-Optimized
  GeoTIFF, vertical alignment to the baseline survey on stable ground outside the zones,
  then the standard comparisons. Rasters are processed block by block, never loaded whole.
- **Volumes**: cut, fill and net per zone and for the site, always with a ± range; level of
  detection; progress % against the design. Any two surfaces can be compared on request.
- **Dashboard**: epoch slider, comparison modes (since baseline, since previous survey,
  remaining to design, planned, any two), hillshade and blue/red cut-fill layers with a
  legend, volume table, survey list with release, baseline and retry controls.
- **Jobs**: queued / running / failed / done with a log and retry (`/api/sites/{id}/jobs`,
  `/api/jobs/{id}`). A fuller job screen comes with Phase 3.
- **Provenance** on every surface and result: input file and SHA-256, CRS, parameters,
  alignment statistics, software versions, timestamps. Results are flagged *stale* when
  zones, alignment or settings change afterwards.

**Deviations from the original stack**

- Tiles are rendered by a small rio-tiler service (`app/tiler.py`) rather than stock
  TiTiler, so that tiles sit behind the same login and release rules as the data. Stock
  TiTiler would serve any raster to anyone who can reach it.
- Alignment in the upload path is a vertical shift computed in Python. ASP's `pc_align`
  (full 3-D alignment) is used by the stereo path in Phase 3.

## Layout

```
earthworks-monitor/
  docker-compose.yml  .env.example
  backend/
    app/
      config.py          settings from environment variables only
      models.py          SQLAlchemy models
      routers/           auth, users, projects, sites + zones, surfaces + analyses + jobs
      geo/vector_io.py   outline parsing and validation
      geo/raster_io.py   raster validation, reprojection to COG
      geo/volume.py      DEM of difference, volumes, uncertainty (pure library)
      geo/tiles.py       hillshade and cut/fill tile rendering
      geo/synthetic.py   synthetic terrain with known volumes (tests, demo seed)
      services/          surface ingest + alignment, analyses, progress
      jobs/runner.py     job execution, logs, retry
      tiler.py           tile server app
      cli.py  seed.py  worker.py  storage.py
    alembic/             database migrations
    tests/               pytest (needs PostGIS + Redis)
  frontend/
    src/pages/           Login, Projects, Project (outlines), Site (dashboard), Users
    src/components/      MapView, VolumeTable, SurfaceUpload
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
2. **DEM upload + volume engine** — done.
3. **ASP path**: worker image with a pinned NASA Ames Stereo Pipeline, stereo → DEM →
   alignment jobs with logs and retry, ASTER demo.
4. **Reports and polish**: progress charts, bilingual PDF report, licence texts.

## Known limitations

- Alignment corrects a vertical shift only. Tilt and horizontal offsets are measured and
  widen the ± range, but are not removed (Phase 3 adds `pc_align`).
- All surfaces of a site must share one height reference; there is no geoid conversion yet.
- One design surface per site. No orthoimage layer yet (it arrives with the stereo path).
- Heights are assumed to be in metres.
- A pixel counts towards a zone when its centre is inside; there is no partial-pixel weighting.
- Editing an existing outline is API-only (`PATCH`); the UI can add and delete.
- No password-reset flow; an analyst resets passwords via the API or `app.cli`.
- Sessions cannot be revoked individually before they expire (deactivating a user does cut
  them off immediately).
- Files are stored on a Docker volume; object storage is a later swap (`app/storage.py`).

## Attribution

Phase 3 will use the NASA Ames Stereo Pipeline (Apache-2.0). The full attribution notice and
the licence texts of all bundled dependencies are added to `LICENSES/` when they are bundled.

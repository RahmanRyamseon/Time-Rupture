# Earthworks Monitor

Construction-progress and earthworks-volume tracking from satellite / drone 3D data, for
project owners, contractors and quarry operators. ("Earthworks Monitor" is a working name:
change `APP_NAME` in `.env` to rename the product everywhere.)

> **Status: Phase 3 of 4.** DEM upload, satellite-stereo processing with NASA Ames Stereo
> Pipeline, alignment, cut/fill volumes with uncertainty and the site dashboard work. PDF
> reports and progress charts are not built yet — see *Roadmap*. The volume method is
> explained in [METHOD.md](METHOD.md). Uses NASA Ames Stereo Pipeline (Apache-2.0); see
> [NOTICE.md](NOTICE.md).

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

**Satellite stereo with Ames Stereo Pipeline (Phase 3)**

- **Worker image** with ASP 3.7.0 installed from its official conda package, version
  pinned (`backend/Dockerfile.worker`). Check it at any time with the smoke test below.
- **Stereo survey**: upload an image pair with cameras (RPC, Maxar/DigitalGlobe, Pléiades,
  PeruSat-1, CSM, frame camera) or a single ASTER Level 1A scene. The worker runs optional
  bundle adjustment → stereo → point cloud to DEM → orthoimage, then the normal path.
  An unsupported camera model or a missing file is refused with the reason.
- **3-D alignment** of stereo surveys to the baseline with `pc_align` (Nuth & Kääb
  co-registration), estimated on stable ground outside the zones. It is kept only if it
  improves agreement there; otherwise just the vertical shift is applied.
- **Height references**: WGS84-ellipsoid, EGM96 and EGM2008 heights are converted to the
  site's reference automatically (`dem_geoid`, geoid grids bundled with ASP, no download).
- **Job screen** (site dashboard → *Processing jobs*): status, attempts, duration, live
  log with the exact ASP commands, and retry.
- **Orthoimage layer** for stereo surveys, and a *demonstration resolution* notice
  wherever data coarser than 10 m per pixel is shown.
- **Engine interface** (`app/engines/base.py`): ASP sits behind `PhotogrammetryEngine`, so
  a drone photogrammetry engine can be added without touching the rest.

**Deviations from the original stack**

- Tiles are rendered by a small rio-tiler service (`app/tiler.py`) rather than stock
  TiTiler, so that tiles sit behind the same login and release rules as the data. Stock
  TiTiler would serve any raster to anyone who can reach it.
- ASP is installed from its conda package rather than the release tarball.
- Uploaded DEMs are aligned with a vertical shift by default (`ALIGNMENT_METHOD_UPLOAD`);
  set it to `pc_align` to use the 3-D alignment for them as well.

## ASP smoke test

```bash
docker compose run --rm worker python -m app.engines.asp.smoke
```

It checks that every ASP tool the product calls starts and reports the pinned version,
then shifts a synthetic DEM by a known amount and requires `pc_align` to recover the shift,
`point2dem` to grid the result and `dem_geoid` to apply the bundled EGM2008 geoid.

## Real-data demo (satellite stereo path)

The demo builds a project over Jebel Hafeet (UAE / Oman border): arid, with real relief.
The Copernicus GLO-30 DEM is downloaded from its public AWS bucket as the reference
surface (the only step that needs internet; pass `--reference file.tif` to avoid it).

**With an ASTER scene.** Download an `AST_L1A` scene covering 24.07° N, 55.77° E from
[NASA Earthdata Search](https://search.earthdata.nasa.gov/search) (free account; choose
*ASTER L1A Reconstructed Unprocessed Instrument Data V004*, a cloud-free scene that has
bands 3N and 3B). Put the `.hdf` in a folder and run:

```bash
docker compose run --rm -v /path/to/folder:/demo:ro worker python -m app.demo --scene /demo/AST_L1A_XXXX.hdf --date 2023-05-14
```

**Without any imagery.** ASP's own `sat_sim` renders a stereo pair from the reference
terrain with a quarry of known volume cut into it, and the whole stereo path then runs on
that pair. The imagery is synthetic; the processing is the real one.

```bash
docker compose run --rm worker python -m app.demo --simulate
```

Either way the project appears in the dashboard with the reference and the stereo survey,
both released. At 15–30 m per pixel this is for demonstration only, and the dashboard says
so: most real earthworks are below the level of detection at this resolution.

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
      engines/base.py    photogrammetry engine interface
      engines/asp/       ASP toolchain, typed command wrappers, engine, smoke test
      services/          surface ingest + alignment, stereo surveys, analyses, progress
      demo.py            real-data / simulated stereo demo
      jobs/runner.py     job execution, logs, retry
      tiler.py           tile server app
      cli.py  seed.py  worker.py  storage.py
    alembic/             database migrations
    tests/               pytest (needs PostGIS + Redis)
  frontend/
    src/pages/           Login, Projects, Project (outlines), Site (dashboard), Jobs, Users
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

`TEST_DATABASE_URL` and `TEST_REDIS_URL` override the defaults. Tests that drive the real
ASP tools are skipped unless `ASP_PREFIX` points at an ASP conda environment; inside the
worker image they all run. After changing dependencies in
`pyproject.toml`, regenerate `requirements.lock` (the image installs from it) with `pip freeze`.

Frontend with hot reload (expects the API on `localhost:8000`, or set `VITE_API_PROXY`):

```bash
cd frontend && npm install && npm run dev
```

API documentation is served at `/api/docs`.

## Roadmap

1. **Skeleton** — done.
2. **DEM upload + volume engine** — done.
3. **ASP path** — done.
4. **Reports and polish**: progress charts, bilingual PDF report, licence texts.

## Known limitations

- 3-D alignment is a translation (no rotation or tilt correction). Tilt is measured and
  widens the ± range. It needs terrain with relief; on flat sites it is rejected
  automatically and only the vertical shift is applied.
- The alignment estimate (`nuth`) loads both DEMs into memory; very large sub-metre
  rasters may need a bigger worker or `PC_ALIGN_METHOD=point-to-plane`.
- Only WGS84-ellipsoid, EGM96 and EGM2008 heights are converted; a local project datum
  must match the site's.
- One stereo pair per survey (no multi-pair mosaics); no ground control points.
- The worker image is large (about 7 GB) and x86-64 only, as ASP's conda package is.
- One design surface per site.
- Heights are assumed to be in metres.
- A pixel counts towards a zone when its centre is inside; there is no partial-pixel weighting.
- Editing an existing outline is API-only (`PATCH`); the UI can add and delete.
- No password-reset flow; an analyst resets passwords via the API or `app.cli`.
- Sessions cannot be revoked individually before they expire (deactivating a user does cut
  them off immediately).
- Files are stored on a Docker volume; object storage is a later swap (`app/storage.py`).

## Attribution

Uses NASA Ames Stereo Pipeline (Apache-2.0). See [NOTICE.md](NOTICE.md) and `LICENSES/`.
The licence texts of the remaining bundled dependencies are added in Phase 4.

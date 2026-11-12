"""Tests run against a real PostGIS database (TEST_DATABASE_URL), migrated with Alembic."""
import os

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://postgres:test@localhost:55432/em_test"
)
os.environ["REDIS_URL"] = os.environ.get("TEST_REDIS_URL", "redis://localhost:56379/15")
os.environ["SECRET_KEY"] = "test-secret-key-that-is-long-enough-0123456789"
os.environ["COOKIE_SECURE"] = "false"
os.environ["LOGIN_MAX_ATTEMPTS"] = "3"
os.environ["JOBS_EAGER"] = "true"
# Tests marked `asp` need Ames Stereo Pipeline; point ASP_PREFIX at its conda environment.
os.environ.setdefault("ASP_PREFIX", "/opt/asp")
os.environ["DATA_DIR"] = __import__("tempfile").mkdtemp(prefix="em-test-data-")

import pytest
import redis
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.cli import upsert_user
from app.config import get_settings
from app.db import get_engine, new_session
from app.main import app

HAS_ASP = os.path.exists(os.path.join(os.environ["ASP_PREFIX"], "bin", "pc_align"))
requires_asp = pytest.mark.skipif(not HAS_ASP, reason="Ames Stereo Pipeline is not installed (ASP_PREFIX)")

ANALYST = ("analyst@test.example", "analyst-password-1")
VIEWER = ("viewer@test.example", "viewer-password-1")

SITE_SQUARE = {
    "type": "Polygon",
    "coordinates": [[[46.90, 24.20], [46.91, 24.20], [46.91, 24.21], [46.90, 24.21], [46.90, 24.20]]],
}
ZONE_INSIDE = {
    "type": "Polygon",
    "coordinates": [[[46.902, 24.202], [46.905, 24.202], [46.905, 24.205], [46.902, 24.205], [46.902, 24.202]]],
}


@pytest.fixture(scope="session", autouse=True)
def _migrated_db():
    with get_engine().begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
    command.upgrade(Config("alembic.ini"), "head")
    yield


@pytest.fixture(autouse=True)
def _clean():
    with get_engine().begin() as conn:
        conn.execute(text("TRUNCATE users, projects CASCADE"))
    redis.Redis.from_url(get_settings().redis_url).flushdb()
    with new_session() as db:
        upsert_user(db, ANALYST[0], "analyst", ANALYST[1])
        upsert_user(db, VIEWER[0], "viewer", VIEWER[1])


def _login(credentials) -> TestClient:
    client = TestClient(app)
    response = client.post("/api/auth/login", json={"email": credentials[0], "password": credentials[1]})
    assert response.status_code == 200, response.text
    return client


@pytest.fixture
def anon() -> TestClient:
    return TestClient(app)


@pytest.fixture
def analyst() -> TestClient:
    return _login(ANALYST)


@pytest.fixture
def viewer() -> TestClient:
    return _login(VIEWER)


@pytest.fixture
def project(analyst) -> dict:
    return analyst.post("/api/projects", json={"name": "P1", "client_name": "C"}).json()


@pytest.fixture
def site(analyst, project) -> dict:
    response = analyst.post(
        f"/api/projects/{project['id']}/sites", json={"name": "S1", "geometry": SITE_SQUARE}
    )
    assert response.status_code == 201, response.text
    return response.json()

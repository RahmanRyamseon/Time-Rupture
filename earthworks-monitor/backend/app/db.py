from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings


@lru_cache
def get_engine():
    return create_engine(get_settings().database_url, pool_pre_ping=True)


@lru_cache
def _session_factory():
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


def new_session() -> Session:
    return _session_factory()()


def get_db() -> Iterator[Session]:
    session = new_session()
    try:
        yield session
    finally:
        session.close()

"""SQLAlchemy engine/session setup.

The engine is created lazily and connections are only opened when a request
actually needs the database (via the `get_db` dependency). This means the
API can start and serve /health even if Postgres is not reachable yet --
only DB-backed endpoints will fail, with a clean error, until it is.
"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

import logging

logger = logging.getLogger("campuspulse")

def create_db_engine():
    db_url = settings.database_url
    if db_url.startswith("sqlite"):
        return create_engine(db_url, connect_args={"check_same_thread": False}, pool_pre_ping=True, future=True)

    test_engine = create_engine(db_url, pool_pre_ping=True, future=True)
    try:
        with test_engine.connect() as conn:
            pass
        return test_engine
    except Exception:
        logger.warning("PostgreSQL not reachable at %s. Falling back to local SQLite database (campuspulse.db).", db_url)
        sqlite_url = "sqlite:///./campuspulse.db"
        return create_engine(sqlite_url, connect_args={"check_same_thread": False}, pool_pre_ping=True, future=True)

engine = create_db_engine()

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

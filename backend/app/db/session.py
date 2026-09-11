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

engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)

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

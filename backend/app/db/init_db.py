"""Dev-time schema + seed helper.

A full Alembic migration setup is unnecessary overhead for a mini project's
schema; this creates tables (and the pgvector extension) if missing, and
seeds departments + a single admin account. Worth revisiting with real
migrations if this ever needs a production rollout history.
"""
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.ai.taxonomy import DEPARTMENTS
from app.config import settings
from app.core.security import hash_password
from app.db.models import Admin, Department
from app.db.session import Base, SessionLocal, engine


def create_extensions() -> None:
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


def seed_departments(db: Session) -> None:
    existing = set(db.scalars(select(Department.name)).all())
    for name, description in DEPARTMENTS:
        if name not in existing:
            db.add(Department(name=name, description=description))
    db.commit()


def seed_admin(db: Session) -> None:
    existing = db.scalar(select(Admin).where(Admin.email == settings.admin_email))
    if existing is None:
        db.add(
            Admin(
                email=settings.admin_email,
                password_hash=hash_password(settings.admin_password),
                name="Campus Admin",
                department=None,
            )
        )
        db.commit()


def init_db() -> None:
    create_extensions()
    create_tables()
    db = SessionLocal()
    try:
        seed_departments(db)
        seed_admin(db)
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
    print("Database initialized, departments seeded, admin account ready.")

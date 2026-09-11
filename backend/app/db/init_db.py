"""Dev-time schema + seed helper.

For a mini project, a full Alembic migration setup is unnecessary overhead
while the schema is this small and still moving fast (Phase 1). This
creates tables if missing and seeds the fixed department list. Alembic is
worth introducing once the schema stabilizes (tracked for Phase 3, when
pgvector columns are added).
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Department
from app.db.session import Base, SessionLocal, engine

DEFAULT_DEPARTMENTS = [
    ("Facilities", "Building maintenance: plumbing, electrical, structural issues."),
    ("IT Services", "Network, Wi-Fi, computer labs, campus software systems."),
    ("Housekeeping", "Cleanliness, waste disposal, pest control."),
    ("Security", "Safety hazards, unauthorized access, lighting, theft."),
    ("Grounds", "Outdoor areas, landscaping, parking lots, signage."),
    ("Unassigned", "Default department until a report is triaged."),
]


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


def seed_departments(db: Session) -> None:
    existing = set(db.scalars(select(Department.name)).all())
    for name, description in DEFAULT_DEPARTMENTS:
        if name not in existing:
            db.add(Department(name=name, description=description))
    db.commit()


def init_db() -> None:
    create_tables()
    db = SessionLocal()
    try:
        seed_departments(db)
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
    print("Database initialized and departments seeded.")

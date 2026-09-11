"""CampusPulse API entrypoint (Phase 1: core CRUD, no AI pipeline yet)."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.errors import register_exception_handlers
from app.db.init_db import init_db
from app.routers import departments, health, reports

logging.basicConfig(level=logging.INFO if not settings.debug else logging.DEBUG)
logger = logging.getLogger("campuspulse")

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(health.router)
app.include_router(reports.router)
app.include_router(departments.router)


@app.on_event("startup")
def on_startup() -> None:
    # Best-effort: create tables/seed data if the DB is reachable, but never
    # block the API from starting -- /health must work even without a DB.
    try:
        init_db()
        logger.info("Database initialized successfully.")
    except Exception:  # noqa: BLE001 - deliberately broad, this is a best-effort hook
        logger.warning("Could not initialize database at startup. Is Postgres running?", exc_info=True)

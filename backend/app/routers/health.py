"""Health check endpoints.

/health never touches the database -- it just proves the API process is up.
/health/db additionally checks connectivity, and reports 'degraded' instead
of throwing, so a missing DB doesn't look like the whole API is down.
"""
from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from fastapi import Depends

from app.config import settings
from app.db.session import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": settings.app_name, "environment": settings.environment}


@router.get("/health/db")
def health_db(db: Session = Depends(get_db)) -> dict:
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except SQLAlchemyError:
        return {"status": "degraded", "database": "unreachable"}

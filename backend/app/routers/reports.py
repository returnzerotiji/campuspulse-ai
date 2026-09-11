import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.report import (
    ReportCreate,
    ReportDetailOut,
    ReportListOut,
    ReportOut,
    ReportStatus,
    ReportUpdate,
)
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportOut, status_code=201)
def create_report(payload: ReportCreate, db: Session = Depends(get_db)) -> ReportOut:
    report = report_service.create_report(db, payload)
    return report


@router.get("", response_model=ReportListOut)
def list_reports(
    db: Session = Depends(get_db),
    status: ReportStatus | None = None,
    department: str | None = None,
    category: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> ReportListOut:
    total, items = report_service.list_reports(
        db, status=status, department=department, category=category, limit=limit, offset=offset
    )
    return ReportListOut(total=total, items=items)


@router.get("/track/{tracking_code}", response_model=ReportDetailOut)
def track_report(tracking_code: str, db: Session = Depends(get_db)) -> ReportDetailOut:
    """Public, no-auth lookup a student uses with their tracking code."""
    return report_service.get_report_by_tracking_code(db, tracking_code)


@router.get("/{report_id}", response_model=ReportDetailOut)
def get_report(report_id: uuid.UUID, db: Session = Depends(get_db)) -> ReportDetailOut:
    return report_service.get_report_by_id(db, report_id)


@router.patch("/{report_id}", response_model=ReportDetailOut)
def update_report(
    report_id: uuid.UUID, payload: ReportUpdate, db: Session = Depends(get_db)
) -> ReportDetailOut:
    return report_service.update_report(db, report_id, payload)

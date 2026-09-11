import uuid

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.ai.taxonomy import CATEGORIES
from app.core.deps import get_current_admin
from app.db.models import Admin
from app.db.session import get_db
from app.schemas.report import (
    ReportCreate,
    ReportDetailOut,
    ReportListOut,
    ReportOut,
    ReportStatus,
    ReportUpdate,
    SimilarReportOut,
)
from app.services import report_service
from app.services.uploads import save_report_image

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/categories", response_model=list[str])
def list_categories() -> list[str]:
    return CATEGORIES


@router.post("", response_model=ReportOut, status_code=201)
async def create_report(
    description: str = Form(..., min_length=10, max_length=5000),
    location: str = Form(..., min_length=2, max_length=500),
    category: str | None = Form(default=None),
    severity: str | None = Form(default=None),
    reporter_email: str | None = Form(default=None),
    image: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
) -> ReportOut:
    payload = ReportCreate(
        description=description,
        location=location,
        category=category or None,
        severity=severity or None,  # type: ignore[arg-type]
        reporter_email=reporter_email or None,
    )
    image_url = await save_report_image(image)
    return report_service.create_report(db, payload, image_url=image_url)


@router.get("", response_model=ReportListOut)
def list_reports(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    status: ReportStatus | None = None,
    department: str | None = None,
    category: str | None = None,
    cluster_id: uuid.UUID | None = None,
    sort_by_priority: bool = True,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> ReportListOut:
    total, items = report_service.list_reports(
        db,
        status=status,
        department=department,
        category=category,
        cluster_id=cluster_id,
        sort_by_priority=sort_by_priority,
        limit=limit,
        offset=offset,
    )
    return ReportListOut(total=total, items=items)


@router.get("/track/{tracking_code}", response_model=ReportDetailOut)
def track_report(tracking_code: str, db: Session = Depends(get_db)) -> ReportDetailOut:
    """Public, no-auth lookup a student uses with their tracking code."""
    return report_service.get_report_by_tracking_code(db, tracking_code)


@router.get("/{report_id}", response_model=ReportDetailOut)
def get_report(
    report_id: uuid.UUID, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> ReportDetailOut:
    return report_service.get_report_by_id(db, report_id)


@router.get("/{report_id}/similar", response_model=list[SimilarReportOut])
def get_similar_reports(
    report_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    limit: int = Query(default=5, ge=1, le=20),
) -> list[SimilarReportOut]:
    matches = report_service.get_similar_reports(db, report_id, limit=limit)
    return [SimilarReportOut(report=r, similarity=round(s, 4)) for r, s in matches]


@router.patch("/{report_id}", response_model=ReportDetailOut)
def update_report(
    report_id: uuid.UUID,
    payload: ReportUpdate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> ReportDetailOut:
    return report_service.update_report(db, report_id, payload)

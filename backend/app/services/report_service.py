"""Business logic for reports, kept out of the routers so routers stay thin.

No AI here yet (Phase 1). Category/severity fall back to sensible defaults
when the student doesn't supply them; Phase 2 replaces those defaults with
an LLM classification step without changing this module's public interface.
"""
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.db.models import Report, ReportEvent
from app.schemas.report import ReportCreate, ReportUpdate
from app.services.tracking import generate_tracking_code

_MAX_TRACKING_CODE_ATTEMPTS = 5


def create_report(db: Session, payload: ReportCreate) -> Report:
    report = Report(
        description=payload.description,
        location=payload.location,
        image_url=payload.image_url,
        reporter_email=payload.reporter_email,
        category=payload.category or "Uncategorized",
        # "default" (not "ai") -- Phase 1 has no AI pipeline yet. This becomes
        # "ai" starting Phase 2, once an LLM actually infers a missing value.
        category_source="student" if payload.category else "default",
        severity=payload.severity or "medium",
        severity_source="student" if payload.severity else "default",
        priority_score=0.0,
        department="Unassigned",
        status="new",
    )

    # Tracking codes are randomly generated and unique; collisions are rare
    # but we retry a few times rather than letting the request fail on one.
    for attempt in range(_MAX_TRACKING_CODE_ATTEMPTS):
        report.tracking_code = generate_tracking_code()
        db.add(report)
        try:
            db.flush()
            break
        except IntegrityError:
            db.rollback()
            if attempt == _MAX_TRACKING_CODE_ATTEMPTS - 1:
                raise
    else:  # pragma: no cover - defensive, loop always breaks or raises above
        raise RuntimeError("Could not generate a unique tracking code")

    db.add(
        ReportEvent(
            report_id=report.id,
            event_type="created",
            new_value="new",
            actor="system",
        )
    )
    db.commit()
    db.refresh(report)
    return report


def get_report_by_id(db: Session, report_id) -> Report:
    report = db.get(Report, report_id)
    if report is None:
        raise NotFoundError(f"Report {report_id} not found")
    return report


def get_report_by_tracking_code(db: Session, tracking_code: str) -> Report:
    stmt = select(Report).where(Report.tracking_code == tracking_code.upper())
    report = db.scalar(stmt)
    if report is None:
        raise NotFoundError(f"No report found for tracking code '{tracking_code}'")
    return report


def list_reports(
    db: Session,
    *,
    status: str | None = None,
    department: str | None = None,
    category: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[int, list[Report]]:
    stmt = select(Report)
    count_stmt = select(func.count()).select_from(Report)

    if status:
        stmt = stmt.where(Report.status == status)
        count_stmt = count_stmt.where(Report.status == status)
    if department:
        stmt = stmt.where(Report.department == department)
        count_stmt = count_stmt.where(Report.department == department)
    if category:
        stmt = stmt.where(Report.category == category)
        count_stmt = count_stmt.where(Report.category == category)

    total = db.scalar(count_stmt) or 0
    stmt = stmt.order_by(Report.created_at.desc()).limit(limit).offset(offset)
    items = list(db.scalars(stmt).all())
    return total, items


def update_report(db: Session, report_id, payload: ReportUpdate) -> Report:
    report = get_report_by_id(db, report_id)

    if payload.status is not None and payload.status != report.status:
        db.add(
            ReportEvent(
                report_id=report.id,
                event_type="status_changed",
                old_value=report.status,
                new_value=payload.status,
                note=payload.note,
                actor=payload.actor,
            )
        )
        report.status = payload.status

    if payload.department is not None and payload.department != report.department:
        db.add(
            ReportEvent(
                report_id=report.id,
                event_type="department_changed",
                old_value=report.department,
                new_value=payload.department,
                note=payload.note,
                actor=payload.actor,
            )
        )
        report.department = payload.department
        report.department_overridden = True

    if payload.severity is not None and payload.severity != report.severity:
        db.add(
            ReportEvent(
                report_id=report.id,
                event_type="severity_changed",
                old_value=report.severity,
                new_value=payload.severity,
                note=payload.note,
                actor=payload.actor,
            )
        )
        report.severity = payload.severity
        report.severity_source = "admin"

    db.commit()
    db.refresh(report)
    return report

"""Business logic for reports: the full Understand -> Group -> Prioritize ->
Route -> Resolve loop. Kept out of the routers so routers stay thin.
"""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.ai import similarity
from app.ai.pipeline import analyze_report
from app.ai.priority import compute_priority_breakdown
from app.core.errors import NotFoundError
from app.db.models import Report, ReportEvent
from app.schemas.report import ReportCreate, ReportUpdate
from app.services.tracking import generate_tracking_code

_MAX_TRACKING_CODE_ATTEMPTS = 5


def recompute_cluster_priority(db: Session, cluster_id: uuid.UUID) -> None:
    """Recompute priority for every report in a cluster.

    Called whenever a report joins a cluster, since the cluster's size and
    persistence (how long it's been recurring) changed for every member,
    not just the new arrival -- this is the "systemic issue gets more
    urgent as more people report it" behavior.
    """
    members = list(db.scalars(select(Report).where(Report.cluster_id == cluster_id)).all())
    if not members:
        return
    size = len(members)
    first_seen_at = min(m.created_at for m in members)
    for member in members:
        breakdown = compute_priority_breakdown(
            severity=member.severity, category=member.category, cluster_size=size, first_seen_at=first_seen_at
        )
        member.priority_score = breakdown["total"]
        member.priority_breakdown = breakdown
    db.commit()


def create_report(db: Session, payload: ReportCreate, image_url: str | None = None) -> Report:
    analysis = analyze_report(
        db,
        description=payload.description,
        location=payload.location,
        student_category=payload.category,
        student_severity=payload.severity,
    )

    report = Report(
        description=payload.description,
        location=payload.location,
        image_url=image_url,
        reporter_email=payload.reporter_email,
        category=analysis.category,
        category_source=analysis.category_source,
        severity=analysis.severity,
        severity_source=analysis.severity_source,
        priority_score=0.0,  # set below via recompute_cluster_priority
        department=analysis.department,
        status="new",
        ai_summary=analysis.ai_summary,
        ai_raw_response=analysis.ai_raw_response,
        embedding=analysis.embedding,
        cluster_id=analysis.cluster_id,
        duplicate_of=analysis.duplicate_of,
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
    if analysis.duplicate_of is not None:
        db.add(
            ReportEvent(
                report_id=report.id,
                event_type="linked_duplicate",
                new_value=str(analysis.duplicate_of),
                note="Automatically linked to an existing similar report.",
                actor="ai",
            )
        )
    db.commit()

    recompute_cluster_priority(db, report.cluster_id)
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
    cluster_id: uuid.UUID | None = None,
    sort_by_priority: bool = True,
    limit: int = 50,
    offset: int = 0,
) -> tuple[int, list[Report]]:
    stmt = select(Report)
    count_stmt = select(func.count()).select_from(Report)

    for column, value in (
        (Report.status, status),
        (Report.department, department),
        (Report.category, category),
        (Report.cluster_id, cluster_id),
    ):
        if value:
            stmt = stmt.where(column == value)
            count_stmt = count_stmt.where(column == value)

    total = db.scalar(count_stmt) or 0
    order = Report.priority_score.desc() if sort_by_priority else Report.created_at.desc()
    stmt = stmt.order_by(order, Report.created_at.desc()).limit(limit).offset(offset)
    items = list(db.scalars(stmt).all())
    return total, items


def get_similar_reports(db: Session, report_id: uuid.UUID, limit: int = 5) -> list[tuple[Report, float]]:
    report = get_report_by_id(db, report_id)
    if report.embedding is None:
        return []
    return similarity.find_similar(db, report.embedding, exclude_id=report.id, limit=limit)


def update_report(db: Session, report_id: uuid.UUID, payload: ReportUpdate) -> Report:
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
        if payload.status == "resolved":
            report.resolved_at = datetime.now(timezone.utc)
        elif report.resolved_at is not None:
            report.resolved_at = None

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
    if report.cluster_id is not None:
        recompute_cluster_priority(db, report.cluster_id)
    db.refresh(report)
    return report


def get_hotspots(db: Session, min_cluster_size: int = 2, limit: int = 20) -> list[dict]:
    """Systemic issues: clusters with more than one report, ranked by priority."""
    stmt = (
        select(
            Report.cluster_id,
            func.count(Report.id).label("report_count"),
            func.max(Report.priority_score).label("max_priority"),
            func.min(Report.created_at).label("first_seen_at"),
            func.max(Report.created_at).label("last_seen_at"),
        )
        .where(Report.cluster_id.is_not(None))
        .group_by(Report.cluster_id)
        .having(func.count(Report.id) >= min_cluster_size)
        .order_by(func.max(Report.priority_score).desc())
        .limit(limit)
    )
    rows = db.execute(stmt).all()

    hotspots = []
    for cluster_id, report_count, max_priority, first_seen_at, last_seen_at in rows:
        members = list(
            db.scalars(select(Report).where(Report.cluster_id == cluster_id).order_by(Report.created_at)).all()
        )
        locations = sorted({m.location for m in members})
        categories = sorted({m.category for m in members})
        departments = sorted({m.department for m in members})
        open_count = sum(1 for m in members if m.status not in ("resolved", "closed"))
        hotspots.append(
            {
                "cluster_id": cluster_id,
                "report_count": report_count,
                "open_count": open_count,
                "max_priority": max_priority,
                "categories": categories,
                "departments": departments,
                "locations": locations,
                "representative_summary": members[0].ai_summary or members[0].description,
                "first_seen_at": first_seen_at,
                "last_seen_at": last_seen_at,
            }
        )
    return hotspots


def get_stats_overview(db: Session) -> dict:
    total = db.scalar(select(func.count()).select_from(Report)) or 0

    by_status = dict(db.execute(select(Report.status, func.count(Report.id)).group_by(Report.status)).all())
    by_department = dict(
        db.execute(select(Report.department, func.count(Report.id)).group_by(Report.department)).all()
    )
    by_category = dict(db.execute(select(Report.category, func.count(Report.id)).group_by(Report.category)).all())

    open_count = sum(v for k, v in by_status.items() if k not in ("resolved", "closed"))
    resolved_count = by_status.get("resolved", 0) + by_status.get("closed", 0)

    avg_resolution_hours = db.scalar(
        select(func.avg(func.extract("epoch", Report.resolved_at - Report.created_at) / 3600.0)).where(
            Report.resolved_at.is_not(None)
        )
    )

    systemic_clusters = db.scalar(
        select(func.count())
        .select_from(
            select(Report.cluster_id)
            .where(Report.cluster_id.is_not(None))
            .group_by(Report.cluster_id)
            .having(func.count(Report.id) >= 2)
            .subquery()
        )
    ) or 0

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    backlog_over_week = db.scalar(
        select(func.count())
        .select_from(Report)
        .where(Report.status.not_in(["resolved", "closed"]), Report.created_at < week_ago)
    ) or 0

    return {
        "total_reports": total,
        "open_reports": open_count,
        "resolved_reports": resolved_count,
        "avg_resolution_hours": round(avg_resolution_hours, 1) if avg_resolution_hours else None,
        "systemic_clusters": systemic_clusters,
        "backlog_over_week": backlog_over_week,
        "by_status": by_status,
        "by_department": by_department,
        "by_category": by_category,
    }


def get_trends(db: Session, days: int = 14) -> list[dict]:
    """Reports-per-day for the last `days` days (oldest first)."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    day_expr = func.date_trunc("day", Report.created_at)
    stmt = (
        select(day_expr.label("day"), func.count(Report.id))
        .where(Report.created_at >= since)
        .group_by(day_expr)
        .order_by(day_expr)
    )
    rows = db.execute(stmt).all()
    return [{"date": day.date().isoformat(), "count": count} for day, count in rows]

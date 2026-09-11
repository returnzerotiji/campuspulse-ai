from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.db.models import Admin
from app.db.session import get_db
from app.schemas.report import HotspotOut, StatsOverviewOut, TrendPoint
from app.services import report_service

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/overview", response_model=StatsOverviewOut)
def overview(db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)) -> StatsOverviewOut:
    return report_service.get_stats_overview(db)


@router.get("/hotspots", response_model=list[HotspotOut])
def hotspots(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    min_cluster_size: int = Query(default=2, ge=2, le=50),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[HotspotOut]:
    return report_service.get_hotspots(db, min_cluster_size=min_cluster_size, limit=limit)


@router.get("/trends", response_model=list[TrendPoint])
def trends(
    db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin), days: int = Query(default=14, ge=1, le=90)
) -> list[TrendPoint]:
    return report_service.get_trends(db, days=days)

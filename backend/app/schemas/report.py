"""Request/response models for the reports API."""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.ai.taxonomy import CATEGORIES

Severity = Literal["low", "medium", "high", "critical"]
ReportStatus = Literal["new", "acknowledged", "in_progress", "resolved", "closed"]


class ReportCreate(BaseModel):
    description: str = Field(min_length=10, max_length=5000)
    location: str = Field(min_length=2, max_length=500)
    category: str | None = Field(default=None, max_length=100)
    severity: Severity | None = None
    reporter_email: str | None = Field(default=None, max_length=255)

    @field_validator("category")
    @classmethod
    def category_must_be_known(cls, value: str | None) -> str | None:
        if value is not None and value not in CATEGORIES:
            raise ValueError(f"category must be one of {CATEGORIES}")
        return value


class ReportUpdate(BaseModel):
    status: ReportStatus | None = None
    department: str | None = Field(default=None, max_length=100)
    severity: Severity | None = None
    note: str | None = Field(default=None, max_length=2000)
    actor: str = Field(default="admin", max_length=255)


class ReportEventOut(BaseModel):
    id: uuid.UUID
    event_type: str
    old_value: str | None
    new_value: str | None
    note: str | None
    actor: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportOut(BaseModel):
    id: uuid.UUID
    tracking_code: str
    description: str
    location: str
    image_url: str | None
    reporter_email: str | None
    category: str
    category_source: str
    severity: str
    severity_source: str
    priority_score: float
    priority_breakdown: dict | None
    department: str
    department_overridden: bool
    status: str
    ai_summary: str | None
    cluster_id: uuid.UUID | None
    duplicate_of: uuid.UUID | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportDetailOut(ReportOut):
    events: list[ReportEventOut] = []


class ReportListOut(BaseModel):
    total: int
    items: list[ReportOut]


class SimilarReportOut(BaseModel):
    report: ReportOut
    similarity: float


class HotspotOut(BaseModel):
    cluster_id: uuid.UUID
    report_count: int
    open_count: int
    max_priority: float
    categories: list[str]
    departments: list[str]
    locations: list[str]
    representative_summary: str
    first_seen_at: datetime
    last_seen_at: datetime


class TrendPoint(BaseModel):
    date: str
    count: int


class StatsOverviewOut(BaseModel):
    total_reports: int
    open_reports: int
    resolved_reports: int
    avg_resolution_hours: float | None
    systemic_clusters: int
    backlog_over_week: int
    by_status: dict[str, int]
    by_department: dict[str, int]
    by_category: dict[str, int]

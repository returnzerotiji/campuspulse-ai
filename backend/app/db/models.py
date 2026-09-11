"""ORM models: reports, their timeline events, admins, and departments.

`embedding` backs semantic similarity/duplicate detection (pgvector cosine
distance, see app/ai/similarity.py); `cluster_id` groups a report with its
duplicates/related reports into one systemic issue; `duplicate_of` points at
the canonical report when this one was auto-linked as a duplicate.
"""
import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.ai.embeddings import EMBEDDING_DIM
from app.db.session import Base


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tracking_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)

    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    reporter_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Student-given or default; overwritten with AI inference starting Phase 2.
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="Uncategorized")
    category_source: Mapped[str] = mapped_column(String(20), nullable=False, default="student")

    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    severity_source: Mapped[str] = mapped_column(String(20), nullable=False, default="student")

    priority_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    # {severity_base, cluster_bonus, category_weight, persistence_bonus, total} --
    # lets the UI show *why* a report has this priority, not just the number.
    priority_breakdown: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    department: Mapped[str] = mapped_column(String(100), nullable=False, default="Unassigned")
    department_overridden: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="new")
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_raw_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Semantic grouping (see app/ai/similarity.py).
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM), nullable=True)
    cluster_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    duplicate_of: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reports.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    events: Mapped[list["ReportEvent"]] = relationship(
        back_populates="report", cascade="all, delete-orphan", order_by="ReportEvent.created_at"
    )


class ReportEvent(Base):
    __tablename__ = "report_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor: Mapped[str] = mapped_column(String(255), nullable=False, default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    report: Mapped["Report"] = relationship(back_populates="events")

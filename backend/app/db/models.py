"""ORM models for Phase 1 (no AI columns yet -- those land in Phase 3).

Schema matches the architecture doc, minus: embedding, cluster_id,
duplicate_of, ai_summary/ai_raw_response are kept as nullable placeholders
so Phase 2/3 can populate them without another migration touching this file.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

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

    # Placeholder scoring/routing until Phase 3/4 wire up the AI pipeline.
    priority_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    department: Mapped[str] = mapped_column(String(100), nullable=False, default="Unassigned")
    department_overridden: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="new")

    # Reserved for the AI pipeline (Phase 2+); unused and nullable for now.
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_raw_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

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

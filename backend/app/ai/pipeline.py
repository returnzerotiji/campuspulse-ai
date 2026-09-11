"""Orchestrates the Understand -> Group steps of the report pipeline.

Prioritize/Route/Resolve/Learn are handled by report_service.py (priority
scoring needs a DB-committed cluster size; department routing is a pure
taxonomy lookup, no need to route it through here).
"""
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.ai.classify import classify_report
from app.ai.embeddings import embed_text
from app.ai.similarity import assign_cluster, find_similar
from app.ai.taxonomy import department_for_category


@dataclass
class AnalyzedReport:
    category: str
    category_source: str
    severity: str
    severity_source: str
    department: str
    ai_summary: str
    ai_raw_response: dict[str, Any]
    embedding: list[float]
    cluster_id: Any
    duplicate_of: Any = None


def analyze_report(
    db: Session,
    *,
    description: str,
    location: str,
    student_category: str | None,
    student_severity: str | None,
) -> AnalyzedReport:
    classification = classify_report(description, location)

    category = student_category or classification.category
    category_source = "student" if student_category else classification.source

    severity = student_severity or classification.severity
    severity_source = "student" if student_severity else classification.source

    # Department is always derived from the final category via the fixed
    # taxonomy -- this guarantees routing is always one of the known
    # departments, regardless of what the LLM (or the student) said.
    department = department_for_category(category)

    embedding = embed_text(f"{description}\nLocation: {location}")
    cluster_id, duplicate_of = assign_cluster(db, embedding, category=category)

    top_matches = find_similar(db, embedding, limit=3)
    ai_raw_response = {
        "classification": classification.model_dump(),
        "top_matches": [
            {"report_id": str(r.id), "tracking_code": r.tracking_code, "similarity": round(s, 4)}
            for r, s in top_matches
        ],
    }

    return AnalyzedReport(
        category=category,
        category_source=category_source,
        severity=severity,
        severity_source=severity_source,
        department=department,
        ai_summary=classification.ai_summary,
        ai_raw_response=ai_raw_response,
        embedding=embedding,
        cluster_id=cluster_id,
        duplicate_of=duplicate_of,
    )

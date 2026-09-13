"""Semantic similarity, duplicate detection, and cluster (systemic issue)
assignment, backed by pgvector cosine distance over the local embeddings.

Two thresholds drive grouping:
- >= DUPLICATE_THRESHOLD: same issue, different words -- linked as a
  duplicate of an existing report and folded into its cluster.
- >= CLUSTER_THRESHOLD (same category) or CROSS_CATEGORY_CLUSTER_THRESHOLD
  (different category): related but not identical -- joins the same cluster
  (this is what lets "Wi-Fi is slow in Block A" and "internet keeps
  disconnecting near the lab" surface as one systemic issue) without being
  marked a duplicate of any single report.
- below that: a new cluster of its own.

The same-category bar is deliberately lower than the cross-category one:
two reports in the same category sharing vocabulary ("slow", "disconnecting")
are very likely the same recurring issue, but two reports in *different*
categories merely sharing tone ("dangerous", "unsafe") are not -- an exposed
live wire and a dead streetlight are both safety concerns in the abstract,
but they are not the same systemic issue, and grouping them would undermine
the one thing this feature is supposed to be trustworthy about.
"""
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Report

DUPLICATE_THRESHOLD = 0.90
CLUSTER_THRESHOLD = 0.72
CROSS_CATEGORY_CLUSTER_THRESHOLD = 0.88
DEFAULT_TOP_K = 5


def find_similar(
    db: Session, embedding: list[float], *, exclude_id: uuid.UUID | None = None, limit: int = DEFAULT_TOP_K
) -> list[tuple[Report, float]]:
    """Top-k most similar reports (by cosine similarity, highest first)."""
    if db.bind and db.bind.dialect.name == "postgresql":
        distance = Report.embedding.cosine_distance(embedding)
        stmt = select(Report, distance.label("distance")).where(Report.embedding.is_not(None))
        if exclude_id is not None:
            stmt = stmt.where(Report.id != exclude_id)
        stmt = stmt.order_by(distance).limit(limit)

        results = db.execute(stmt).all()
        # pgvector cosine_distance = 1 - cosine_similarity
        return [(report, 1.0 - float(dist)) for report, dist in results]
    else:
        # Fallback for non-Postgres (SQLite): calculate cosine similarity in Python
        stmt = select(Report).where(Report.embedding.is_not(None))
        if exclude_id is not None:
            stmt = stmt.where(Report.id != exclude_id)
        reports = list(db.scalars(stmt).all())
        if not reports:
            return []

        import json
        import math

        v1 = embedding
        norm1 = math.sqrt(sum(x * x for x in v1))
        if norm1 == 0:
            return []

        scored = []
        for r in reports:
            if r.embedding is None:
                continue
            v2 = r.embedding
            if isinstance(v2, str):
                v2 = json.loads(v2)
            elif hasattr(v2, "tolist"):
                v2 = v2.tolist()
            norm2 = math.sqrt(sum(x * x for x in v2))
            if norm2 > 0:
                dot = sum(a * b for a, b in zip(v1, v2))
                sim = dot / (norm1 * norm2)
                scored.append((r, sim))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:limit]


def assign_cluster(
    db: Session, embedding: list[float], *, category: str | None = None
) -> tuple[uuid.UUID, uuid.UUID | None]:
    """Decide this new report's cluster_id and, if it's a duplicate, of which report."""
    matches = find_similar(db, embedding, limit=1)
    if not matches:
        return uuid.uuid4(), None

    best_report, sim = matches[0]
    if sim >= DUPLICATE_THRESHOLD:
        return best_report.cluster_id, best_report.id

    same_category = category is not None and best_report.category == category
    cluster_bar = CLUSTER_THRESHOLD if same_category else CROSS_CATEGORY_CLUSTER_THRESHOLD
    if sim >= cluster_bar:
        return best_report.cluster_id, None

    return uuid.uuid4(), None


def cluster_size(db: Session, cluster_id: uuid.UUID) -> int:
    stmt = select(Report).where(Report.cluster_id == cluster_id)
    return len(list(db.scalars(stmt).all()))

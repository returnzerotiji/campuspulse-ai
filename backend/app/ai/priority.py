"""Dynamic, rule-based priority scoring.

Deliberately NOT another LLM call: priority needs to be explainable,
deterministic, and cheap to recompute for an entire cluster every time a
new report joins it. The LLM's job (upstream) is understanding language;
ranking is arithmetic.

score = severity_base + cluster_bonus + category_weight + persistence_bonus,
clamped to [0, 100].
"""
from datetime import datetime, timezone

SEVERITY_BASE = {"low": 20.0, "high": 70.0, "medium": 45.0, "critical": 95.0}

# Heavier weight for issues with a safety/continuity dimension.
CATEGORY_WEIGHT = {
    "Safety & Security": 12.0,
    "Structural": 10.0,
    "Electrical": 8.0,
    "Network & Wi-Fi": 6.0,
    "Plumbing": 6.0,
    "Transportation": 5.0,
    "Sanitation & Waste": 4.0,
    "Grounds & Landscaping": 2.0,
    "Furniture & Fixtures": 2.0,
    "Other": 0.0,
}

CLUSTER_BONUS_PER_REPORT = 5.0
CLUSTER_BONUS_CAP = 30.0
PERSISTENCE_BONUS_PER_DAY = 1.0
PERSISTENCE_BONUS_CAP = 10.0


def compute_priority(
    *, severity: str, category: str, cluster_size: int, first_seen_at: datetime
) -> float:
    """cluster_size includes this report itself. first_seen_at is the
    earliest created_at among all reports in the cluster (persistence
    signal -- how long this issue has been recurring, unresolved)."""
    base = SEVERITY_BASE.get(severity, SEVERITY_BASE["medium"])

    extra_reports = max(cluster_size - 1, 0)
    cluster_bonus = min(extra_reports * CLUSTER_BONUS_PER_REPORT, CLUSTER_BONUS_CAP)

    category_weight = CATEGORY_WEIGHT.get(category, 0.0)

    now = datetime.now(timezone.utc)
    if first_seen_at.tzinfo is None:
        first_seen_at = first_seen_at.replace(tzinfo=timezone.utc)
    age_days = max((now - first_seen_at).total_seconds() / 86400.0, 0.0)
    persistence_bonus = min(age_days * PERSISTENCE_BONUS_PER_DAY, PERSISTENCE_BONUS_CAP)

    score = base + cluster_bonus + category_weight + persistence_bonus
    return round(min(max(score, 0.0), 100.0), 1)

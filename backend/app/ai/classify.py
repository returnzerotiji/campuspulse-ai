"""LLM-based report classification, with a deterministic offline fallback.

Design goal: the pipeline must never crash a report submission because an
API key is missing, the network is down, or the provider is rate-limited.
When Claude is unavailable for any reason we fall back to a keyword-based
classifier so the app stays fully functional (this matters a lot at a demo).
"""
import logging
from typing import Literal

import anthropic
from pydantic import BaseModel

from app.ai.taxonomy import CATEGORIES, department_for_category, keyword_classify
from app.config import settings

logger = logging.getLogger("campuspulse.ai.classify")

Severity = Literal["low", "medium", "high", "critical"]


class ReportAnalysis(BaseModel):
    category: str
    severity: Severity
    department: str
    ai_summary: str
    keywords: list[str]


class ClassificationResult(BaseModel):
    category: str
    severity: Severity
    department: str
    ai_summary: str
    keywords: list[str]
    source: Literal["llm", "fallback"]


_SYSTEM_PROMPT = f"""You triage campus facility/IT/safety problem reports for a university.

Given a report's description and location, classify it precisely.

Valid categories (choose exactly one): {", ".join(CATEGORIES)}
Valid departments (choose exactly one): Facilities, IT Services, Housekeeping, Security, Transportation, Grounds, Unassigned

Guidance:
- severity: "critical" = immediate danger to people (fire, exposed live wires, gas leak); \
"high" = safety risk or blocks many people (no lighting at night, major leak, network down campus-wide); \
"medium" = inconvenient but not urgent (default); "low" = cosmetic/minor.
- ai_summary: one normalized sentence restating the issue clearly, as an admin would log it.
- keywords: 2-5 short lowercase keywords/phrases useful for grouping similar reports.
- department must be the correct responsible team for the category, not a guess."""


def _client() -> anthropic.Anthropic | None:
    if not settings.anthropic_api_key:
        return None
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _fallback(description: str, location: str) -> ClassificationResult:
    category, severity = keyword_classify(f"{description} {location}")
    department = department_for_category(category)
    return ClassificationResult(
        category=category,
        severity=severity,
        department=department,
        ai_summary=description.strip()[:200],
        keywords=[],
        source="fallback",
    )


def classify_report(description: str, location: str) -> ClassificationResult:
    """Classify a report. Falls back to keyword rules if Claude is unavailable."""
    client = _client()
    if client is None:
        logger.info("No ANTHROPIC_API_KEY configured; using keyword fallback classifier.")
        return _fallback(description, location)

    try:
        response = client.messages.parse(
            model=settings.claude_model,
            max_tokens=1024,
            system=_SYSTEM_PROMPT,
            output_config={"effort": "low"},
            messages=[
                {
                    "role": "user",
                    "content": f"Description: {description}\nLocation: {location}",
                }
            ],
            output_format=ReportAnalysis,
        )
        parsed = response.parsed_output
        category = parsed.category if parsed.category in CATEGORIES else "Other"
        return ClassificationResult(
            category=category,
            severity=parsed.severity,
            department=parsed.department or department_for_category(category),
            ai_summary=parsed.ai_summary,
            keywords=parsed.keywords,
            source="llm",
        )
    except anthropic.AuthenticationError:
        logger.warning("Anthropic API key invalid; falling back to keyword classifier.")
    except anthropic.RateLimitError:
        logger.warning("Anthropic rate limited; falling back to keyword classifier.")
    except anthropic.APIStatusError as exc:
        logger.warning("Anthropic API error (%s); falling back to keyword classifier.", exc.status_code)
    except anthropic.APIConnectionError:
        logger.warning("Could not reach Anthropic API; falling back to keyword classifier.")
    except Exception:  # noqa: BLE001 - never let classification break report submission
        logger.exception("Unexpected error calling Claude; falling back to keyword classifier.")

    return _fallback(description, location)

"""The fixed category/department taxonomy the whole AI pipeline agrees on.

Keeping this closed (rather than letting the LLM invent categories) is what
makes grouping, routing, and the hotspot dashboard reliable: every report's
category maps to exactly one department, whether it got there via the LLM,
the keyword fallback, or a student's own pick.
"""

CATEGORIES = [
    "Network & Wi-Fi",
    "Electrical",
    "Plumbing",
    "Structural",
    "Sanitation & Waste",
    "Safety & Security",
    "Transportation",
    "Grounds & Landscaping",
    "Furniture & Fixtures",
    "Other",
]

CATEGORY_TO_DEPARTMENT = {
    "Network & Wi-Fi": "IT Services",
    "Electrical": "Facilities",
    "Plumbing": "Facilities",
    "Structural": "Facilities",
    "Sanitation & Waste": "Housekeeping",
    "Safety & Security": "Security",
    "Transportation": "Transportation",
    "Grounds & Landscaping": "Grounds",
    "Furniture & Fixtures": "Facilities",
    "Other": "Unassigned",
}

DEPARTMENTS = [
    ("Facilities", "Building maintenance: electrical, plumbing, structural, furniture."),
    ("IT Services", "Network, Wi-Fi, computer labs, campus software systems."),
    ("Housekeeping", "Cleanliness, waste disposal, pest control, sanitation."),
    ("Security", "Safety hazards, unauthorized access, lighting, theft."),
    ("Transportation", "Campus shuttles, parking, transit failures."),
    ("Grounds", "Outdoor areas, landscaping, parking lots, signage."),
    ("Unassigned", "Default department until a report is triaged."),
]

# Fallback classifier keyword rules, used when no LLM is configured/reachable.
# Checked in order; first category whose keyword appears in the text wins.
KEYWORD_RULES: list[tuple[str, list[str]]] = [
    ("Network & Wi-Fi", ["wifi", "wi-fi", "internet", "network", "router", "online class", "connectivity"]),
    ("Electrical", ["electric", "socket", "outlet", "power outage", "wiring", "short circuit", "fuse"]),
    ("Plumbing", ["leak", "pipe", "faucet", "water fountain", "toilet", "drain", "plumbing", "flooding"]),
    ("Structural", ["ceiling", "wall crack", "ceiling", "ceiling tile", "collapsed", "structural", "roof", "ac unit", "air condition"]),
    ("Sanitation & Waste", ["trash", "garbage", "smell", "sanitation", "dirty", "pest", "cockroach", "unclean", "restroom"]),
    ("Safety & Security", ["unsafe", "hazard", "dark", "no lighting", "theft", "stolen", "unauthorized", "sharp edge", "fire exit"]),
    ("Transportation", ["shuttle", "bus", "parking", "transport", "vehicle"]),
    ("Grounds & Landscaping", ["garden", "lawn", "landscap", "tree", "outdoor", "sidewalk", "pathway"]),
    ("Furniture & Fixtures", ["chair", "desk", "table", "furniture", "broken chair", "bench"]),
]

SEVERITY_KEYWORDS = {
    "critical": ["fire", "collapse", "electrocut", "exposed wire", "gas leak", "emergency"],
    "high": ["safety", "hazard", "unsafe", "sharp edge", "no lighting", "flooding", "theft"],
    "low": ["minor", "cosmetic", "small"],
}


def keyword_classify(text: str) -> tuple[str, str]:
    """Deterministic fallback classifier: returns (category, severity)."""
    lowered = text.lower()

    category = "Other"
    for cat, keywords in KEYWORD_RULES:
        if any(kw in lowered for kw in keywords):
            category = cat
            break

    severity = "medium"
    for level, keywords in SEVERITY_KEYWORDS.items():
        if any(kw in lowered for kw in keywords):
            severity = level
            break

    return category, severity


def department_for_category(category: str) -> str:
    return CATEGORY_TO_DEPARTMENT.get(category, "Unassigned")

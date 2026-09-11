"""Tracking code generation, kept separate so the format can change in one place."""
import secrets
import string

_ALPHABET = string.ascii_uppercase + string.digits
_CODE_LENGTH = 6


def generate_tracking_code() -> str:
    """Human-shareable code like 'CP-7F3K2Q' (not cryptographically sensitive)."""
    suffix = "".join(secrets.choice(_ALPHABET) for _ in range(_CODE_LENGTH))
    return f"CP-{suffix}"

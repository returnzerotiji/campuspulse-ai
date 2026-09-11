"""Local disk image storage for report attachments.

Good enough for a mini project (no cloud bucket / key to manage); swapping
this for S3/GCS later only touches this file -- callers just get a URL back.
"""
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import settings

_ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}


def _upload_dir() -> Path:
    path = Path(settings.upload_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


async def save_report_image(image: UploadFile | None) -> str | None:
    """Validates and saves an uploaded image, returning its public URL path."""
    if image is None or not image.filename:
        return None

    if image.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type '{image.content_type}'. Allowed: {sorted(_ALLOWED_CONTENT_TYPES)}",
        )

    max_bytes = settings.max_upload_mb * 1024 * 1024
    contents = await image.read()
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image exceeds the {settings.max_upload_mb}MB limit.",
        )

    ext = Path(image.filename).suffix.lower() or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    dest = _upload_dir() / filename
    dest.write_bytes(contents)

    return f"/uploads/{filename}"

"""Centralized application configuration.

All environment-dependent values are read here, once, via pydantic-settings.
Nothing else in the app should call os.getenv() directly -- import `settings`
from this module instead, so there is a single source of truth for config.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CampusPulse API"
    environment: str = "development"
    debug: bool = True

    # Comma-separated origins in .env, parsed into a list below.
    cors_origins: str = "http://localhost:3000"

    database_url: str = (
        "postgresql+psycopg2://campuspulse:campuspulse@localhost:5432/campuspulse"
    )

    # --- AI ---
    # Optional: without it, classification falls back to a keyword-based
    # classifier so the app stays fully functional (see app/ai/classify.py).
    anthropic_api_key: str | None = None
    claude_model: str = "claude-opus-5"

    # --- Auth ---
    jwt_secret: str = "dev-only-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 12

    # Seed admin, created at startup if it doesn't already exist.
    admin_email: str = "admin@campuspulse.local"
    admin_password: str = "changeme123"

    # --- Uploads ---
    upload_dir: str = "uploads"
    max_upload_mb: int = 5

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance -- .env is only read once per process."""
    return Settings()


settings = get_settings()

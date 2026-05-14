from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
if os.getenv("VERCEL"):
    # Vercel functions can only write to the temporary filesystem.
    default_data_dir = "/tmp"
else:
    default_data_dir = "/data" if os.getenv("AMVERA") else DATA_DIR.as_posix()
PERSISTENT_DATA_DIR = Path(os.getenv("PERSISTENT_DATA_DIR", default_data_dir))
DEFAULT_DB_PATH = PERSISTENT_DATA_DIR / "crm.sqlite3"

load_dotenv(ROOT_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    app_name: str
    environment: str
    is_production: bool
    app_secret: str
    telegram_bot_token: str | None
    webapp_url: str | None
    telegram_delivery_mode: str
    sync_telegram_webhook: bool
    telegram_webhook_path: str
    cron_secret: str | None
    allow_demo_seed_data: bool
    run_embedded_bot: bool
    allow_insecure_client_auth: bool
    api_host: str
    api_port: int
    cors_origins: tuple[str, ...]
    database_url: str


def _parse_bool(raw: str | None, default: bool) -> bool:
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _parse_telegram_delivery_mode(raw: str | None) -> str:
    value = (raw or "polling").strip().lower()
    if value not in {"polling", "webhook"}:
        raise ValueError("TELEGRAM_DELIVERY_MODE must be either 'polling' or 'webhook'")
    return value


def _normalize_webhook_path(raw: str | None) -> str:
    value = (raw or "/api/telegram/webhook").strip() or "/api/telegram/webhook"
    if not value.startswith("/"):
        value = f"/{value}"
    return value


def _normalize_database_url(raw: str) -> str:
    if raw.startswith("postgres://"):
        return f"postgresql+psycopg://{raw.removeprefix('postgres://')}"
    if raw.startswith("postgresql://"):
        return f"postgresql+psycopg://{raw.removeprefix('postgresql://')}"
    return raw


def _normalize_environment() -> tuple[str, bool]:
    raw = (
        os.getenv("APP_ENV")
        or os.getenv("ENVIRONMENT")
        or os.getenv("VERCEL_ENV")
        or "development"
    ).strip().lower()
    aliases = {
        "prod": "production",
        "stage": "staging",
        "dev": "development",
        "test": "test",
    }
    environment = aliases.get(raw, raw or "development")
    return environment, environment == "production"


def get_settings() -> Settings:
    PERSISTENT_DATA_DIR.mkdir(parents=True, exist_ok=True)
    environment, is_production = _normalize_environment()
    raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    origins = tuple(origin.strip() for origin in raw_origins.split(",") if origin.strip())
    database_url = _normalize_database_url(
        os.getenv("BACKEND_DATABASE_URL")
        or os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL")
        or f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"
    )
    app_secret = (os.getenv("APP_SECRET") or "").strip()
    if not app_secret:
        app_secret = "change-me" if not is_production else ""
    if is_production and app_secret == "change-me":
        raise RuntimeError("APP_SECRET must be set to a strong value in production")
    return Settings(
        app_name=os.getenv("APP_NAME", "crm-miniapp-backend"),
        environment=environment,
        is_production=is_production,
        app_secret=app_secret,
        telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN") or None,
        webapp_url=os.getenv("WEBAPP_URL") or None,
        telegram_delivery_mode=_parse_telegram_delivery_mode(os.getenv("TELEGRAM_DELIVERY_MODE")),
        sync_telegram_webhook=_parse_bool(os.getenv("SYNC_TELEGRAM_WEBHOOK"), False),
        telegram_webhook_path=_normalize_webhook_path(os.getenv("TELEGRAM_WEBHOOK_PATH")),
        cron_secret=os.getenv("CRON_SECRET") or None,
        allow_demo_seed_data=_parse_bool(os.getenv("ALLOW_DEMO_SEED_DATA"), not is_production),
        run_embedded_bot=_parse_bool(os.getenv("RUN_EMBEDDED_BOT"), False),
        allow_insecure_client_auth=(
            _parse_bool(os.getenv("ALLOW_INSECURE_CLIENT_AUTH"), False)
            and not is_production
        ),
        api_host=os.getenv("API_HOST", "0.0.0.0"),
        api_port=int(os.getenv("API_PORT", "8000")),
        cors_origins=origins,
        database_url=database_url,
    )

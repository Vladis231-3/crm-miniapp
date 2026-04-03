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
    app_secret: str
    telegram_bot_token: str | None
    webapp_url: str | None
    telegram_delivery_mode: str
    sync_telegram_webhook: bool
    telegram_webhook_path: str
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


def get_settings() -> Settings:
    PERSISTENT_DATA_DIR.mkdir(parents=True, exist_ok=True)
    raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    origins = tuple(origin.strip() for origin in raw_origins.split(",") if origin.strip())
    database_url = (
        os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL")
        or f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"
    )
    return Settings(
        app_name=os.getenv("APP_NAME", "crm-miniapp-backend"),
        app_secret=os.getenv("APP_SECRET", "change-me"),
        telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN") or None,
        webapp_url=os.getenv("WEBAPP_URL") or None,
        telegram_delivery_mode=_parse_telegram_delivery_mode(os.getenv("TELEGRAM_DELIVERY_MODE")),
        sync_telegram_webhook=_parse_bool(os.getenv("SYNC_TELEGRAM_WEBHOOK"), False),
        telegram_webhook_path=_normalize_webhook_path(os.getenv("TELEGRAM_WEBHOOK_PATH")),
        run_embedded_bot=_parse_bool(os.getenv("RUN_EMBEDDED_BOT"), False),
        allow_insecure_client_auth=_parse_bool(os.getenv("ALLOW_INSECURE_CLIENT_AUTH"), False),
        api_host=os.getenv("API_HOST", "0.0.0.0"),
        api_port=int(os.getenv("API_PORT", "8000")),
        cors_origins=origins,
        database_url=database_url,
    )

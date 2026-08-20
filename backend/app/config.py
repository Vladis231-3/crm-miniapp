from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
if os.getenv("VERCEL"):
    default_data_dir = "/tmp"
else:
    default_data_dir = "/data" if os.getenv("AMVERA") else DATA_DIR.as_posix()
PERSISTENT_DATA_DIR = Path(os.getenv("PERSISTENT_DATA_DIR", default_data_dir))
DEFAULT_DB_PATH = PERSISTENT_DATA_DIR / "crm.sqlite3"

load_dotenv(ROOT_DIR / ".env")

_STRONG_ENVIRONMENTS = {"production", "staging"}
_WEAK_APP_SECRETS = {
    "change-me",
    "changeme",
    "default",
    "secret",
    "test-secret",
    "your-secret-here",
}


@dataclass(frozen=True)
class Settings:
    app_name: str
    environment: str
    is_production: bool
    app_secret: str
    telegram_bot_token: str | None
    webapp_url: str | None
    training_webapp_url: str | None
    telegram_delivery_mode: str
    sync_telegram_webhook: bool
    telegram_webhook_path: str
    telegram_init_data_max_age_seconds: int
    telegram_init_data_future_skew_seconds: int
    upload_max_bytes: int
    uploads_enabled: bool
    cron_secret: str | None
    allow_demo_seed_data: bool
    run_embedded_bot: bool
    allow_insecure_client_auth: bool
    api_host: str
    api_port: int
    cors_origins: tuple[str, ...]
    database_url: str
    database_sslmode: str | None
    permanent_telegram_owners: tuple[tuple[str, str, str, str], ...]
    google_calendar_client_id: str | None
    google_calendar_client_secret: str | None
    google_calendar_redirect_uri: str | None
    google_calendar_timezone: str


def _parse_bool(raw: str | None, default: bool) -> bool:
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _parse_positive_int(name: str, raw: str | None, default: int) -> int:
    try:
        value = int(raw) if raw is not None else default
    except ValueError as exc:
        raise RuntimeError(f"{name} must be an integer") from exc
    if value <= 0:
        raise RuntimeError(f"{name} must be greater than zero")
    return value


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


def _parse_cors_origins(raw: str, *, strong_environment: bool) -> tuple[str, ...]:
    origins = tuple(dict.fromkeys(origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()))
    if not origins:
        raise RuntimeError("CORS_ORIGINS must contain at least one origin")
    for origin in origins:
        if origin == "*":
            raise RuntimeError("CORS_ORIGINS wildcard is incompatible with credentialed requests")
        parsed = urlsplit(origin)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise RuntimeError(f"Invalid CORS origin: {origin!r}")
        if parsed.path or parsed.query or parsed.fragment or parsed.username or parsed.password:
            raise RuntimeError(f"CORS origin must not include credentials, path, query, or fragment: {origin!r}")
        if strong_environment and parsed.scheme != "https" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
            raise RuntimeError("Production/staging CORS origins must use https")
    return origins


def _parse_permanent_telegram_owners(raw: str | None) -> tuple[tuple[str, str, str, str], ...]:
    if not raw:
        return ()
    try:
        items = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError("PERMANENT_TELEGRAM_OWNERS must be valid JSON") from exc
    if not isinstance(items, list):
        raise RuntimeError(  # noqa: TRY004 - configuration errors share one public type
            "PERMANENT_TELEGRAM_OWNERS must be a JSON array"
        )
    parsed: list[tuple[str, str, str, str]] = []
    seen_ids: set[str] = set()
    seen_logins: set[str] = set()
    seen_telegram_ids: set[str] = set()
    for item in items:
        if not isinstance(item, dict):
            raise RuntimeError(  # noqa: TRY004 - configuration errors share one public type
                "Each permanent Telegram owner must be an object"
            )
        staff_id = str(item.get("id", "")).strip()
        login = str(item.get("login", "")).strip()
        telegram_id = str(item.get("telegram_id", "")).strip()
        name = str(item.get("name", "Владелец")).strip() or "Владелец"
        if not staff_id or not login or not telegram_id.isdigit() or int(telegram_id) <= 0:
            raise RuntimeError("Permanent Telegram owners require id, login, and a positive numeric telegram_id")
        if staff_id in seen_ids or login in seen_logins or telegram_id in seen_telegram_ids:
            raise RuntimeError("Permanent Telegram owner ids, logins, and telegram_ids must be unique")
        seen_ids.add(staff_id)
        seen_logins.add(login)
        seen_telegram_ids.add(telegram_id)
        parsed.append((staff_id, login, telegram_id, name))
    return tuple(parsed)


def get_settings() -> Settings:
    PERSISTENT_DATA_DIR.mkdir(parents=True, exist_ok=True)
    environment, is_production = _normalize_environment()
    strong_environment = environment in _STRONG_ENVIRONMENTS
    raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    origins = _parse_cors_origins(raw_origins, strong_environment=strong_environment)
    database_url = _normalize_database_url(
        os.getenv("BACKEND_DATABASE_URL")
        or os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL")
        or f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"
    )
    if strong_environment and os.getenv("VERCEL") and database_url.startswith("sqlite"):
        raise RuntimeError("Vercel production requires an external PostgreSQL DATABASE_URL")

    app_secret = (os.getenv("APP_SECRET") or "").strip()
    if not app_secret:
        app_secret = "change-me" if not strong_environment else ""
    if strong_environment and (
        len(app_secret) < 32 or app_secret.lower() in _WEAK_APP_SECRETS
    ):
        raise RuntimeError("APP_SECRET must be a non-default value of at least 32 characters in production/staging")

    allow_demo_seed_data = _parse_bool(os.getenv("ALLOW_DEMO_SEED_DATA"), not strong_environment)
    if strong_environment and allow_demo_seed_data:
        raise RuntimeError("ALLOW_DEMO_SEED_DATA=true is forbidden in production/staging")

    init_data_max_age = _parse_positive_int(
        "TELEGRAM_INIT_DATA_MAX_AGE_SECONDS",
        os.getenv("TELEGRAM_INIT_DATA_MAX_AGE_SECONDS"),
        900 if strong_environment else 24 * 60 * 60,
    )
    future_skew = _parse_positive_int(
        "TELEGRAM_INIT_DATA_FUTURE_SKEW_SECONDS",
        os.getenv("TELEGRAM_INIT_DATA_FUTURE_SKEW_SECONDS"),
        30,
    )
    if strong_environment and init_data_max_age > 900:
        raise RuntimeError("TELEGRAM_INIT_DATA_MAX_AGE_SECONDS cannot exceed 900 in production/staging")
    if strong_environment and future_skew > 60:
        raise RuntimeError("TELEGRAM_INIT_DATA_FUTURE_SKEW_SECONDS cannot exceed 60 in production/staging")

    database_sslmode: str | None = None
    if database_url.startswith("postgresql"):
        url_sslmodes = parse_qs(urlsplit(database_url).query).get("sslmode", [])
        url_sslmode = url_sslmodes[-1].strip().lower() if url_sslmodes else None
        database_sslmode = (
            url_sslmode
            or os.getenv("DATABASE_SSLMODE")
            or ("require" if strong_environment else None)
        )
        if database_sslmode:
            database_sslmode = database_sslmode.strip().lower()
        if database_sslmode not in {None, "disable", "allow", "prefer", "require", "verify-ca", "verify-full"}:
            raise RuntimeError("DATABASE_SSLMODE is invalid")
        if strong_environment and database_sslmode not in {"require", "verify-ca", "verify-full"}:
            raise RuntimeError("DATABASE_SSLMODE must enforce TLS in production/staging")

    return Settings(
        app_name=os.getenv("APP_NAME", "crm-miniapp-backend"),
        environment=environment,
        is_production=is_production,
        app_secret=app_secret,
        telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN") or None,
        webapp_url=os.getenv("WEBAPP_URL") or None,
        training_webapp_url=(os.getenv("TRAINING_WEBAPP_URL") or "").strip() or None,
        telegram_delivery_mode=_parse_telegram_delivery_mode(os.getenv("TELEGRAM_DELIVERY_MODE")),
        sync_telegram_webhook=_parse_bool(os.getenv("SYNC_TELEGRAM_WEBHOOK"), False),
        telegram_webhook_path=_normalize_webhook_path(os.getenv("TELEGRAM_WEBHOOK_PATH")),
        telegram_init_data_max_age_seconds=init_data_max_age,
        telegram_init_data_future_skew_seconds=future_skew,
        upload_max_bytes=_parse_positive_int(
            "UPLOAD_MAX_BYTES", os.getenv("UPLOAD_MAX_BYTES"), 10 * 1024 * 1024
        ),
        uploads_enabled=_parse_bool(os.getenv("UPLOADS_ENABLED"), not bool(os.getenv("VERCEL"))),
        cron_secret=os.getenv("CRON_SECRET") or None,
        allow_demo_seed_data=allow_demo_seed_data,
        run_embedded_bot=_parse_bool(os.getenv("RUN_EMBEDDED_BOT"), False),
        allow_insecure_client_auth=(
            _parse_bool(os.getenv("ALLOW_INSECURE_CLIENT_AUTH"), False)
            and not strong_environment
        ),
        api_host=os.getenv("API_HOST", "0.0.0.0"),
        api_port=int(os.getenv("API_PORT", "8000")),
        cors_origins=origins,
        database_url=database_url,
        database_sslmode=database_sslmode,
        permanent_telegram_owners=_parse_permanent_telegram_owners(
            os.getenv("PERMANENT_TELEGRAM_OWNERS")
        ),
        google_calendar_client_id=(os.getenv("GOOGLE_CALENDAR_CLIENT_ID") or "").strip() or None,
        google_calendar_client_secret=(
            os.getenv("GOOGLE_CALENDAR_CLIENT_SECRET") or ""
        ).strip()
        or None,
        google_calendar_redirect_uri=(
            os.getenv("GOOGLE_CALENDAR_REDIRECT_URI") or ""
        ).strip()
        or None,
        google_calendar_timezone=(os.getenv("GOOGLE_CALENDAR_TIMEZONE") or "Europe/Moscow").strip()
        or "Europe/Moscow",
    )

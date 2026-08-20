from __future__ import annotations

import json

import pytest
from app.config import _normalize_database_url, get_settings


def test_normalize_database_url_converts_legacy_postgres_scheme() -> None:
    raw_url = "postgres://user:pass@example.com:5432/appdb?sslmode=require&application_name=crm"

    assert _normalize_database_url(raw_url) == (
        "postgresql+psycopg://user:pass@example.com:5432/appdb"
        "?sslmode=require&application_name=crm"
    )


def test_normalize_database_url_uses_psycopg_for_postgresql_scheme() -> None:
    raw_url = "postgresql://user:pass@example.com:5432/appdb"

    assert _normalize_database_url(raw_url) == "postgresql+psycopg://user:pass@example.com:5432/appdb"


def test_normalize_database_url_keeps_explicit_driver_and_sqlite() -> None:
    assert _normalize_database_url("postgresql+psycopg://user:pass@example.com/appdb") == "postgresql+psycopg://user:pass@example.com/appdb"
    assert _normalize_database_url("sqlite:////tmp/crm.sqlite3") == "sqlite:////tmp/crm.sqlite3"


@pytest.mark.parametrize("environment", ["production", "staging"])
def test_strong_environments_reject_weak_secret(monkeypatch, environment: str) -> None:
    monkeypatch.setenv("APP_ENV", environment)
    monkeypatch.setenv("APP_SECRET", "change-me")
    monkeypatch.setenv("ALLOW_DEMO_SEED_DATA", "false")
    monkeypatch.setenv("CORS_ORIGINS", "https://example.com")

    with pytest.raises(RuntimeError, match="APP_SECRET"):
        get_settings()


def test_production_rejects_demo_seed(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("APP_SECRET", "a" * 32)
    monkeypatch.setenv("ALLOW_DEMO_SEED_DATA", "true")
    monkeypatch.setenv("CORS_ORIGINS", "https://example.com")

    with pytest.raises(RuntimeError, match="ALLOW_DEMO_SEED_DATA"):
        get_settings()


def test_production_caps_init_data_ttl(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("APP_SECRET", "a" * 32)
    monkeypatch.setenv("ALLOW_DEMO_SEED_DATA", "false")
    monkeypatch.setenv("CORS_ORIGINS", "https://example.com")
    monkeypatch.setenv("TELEGRAM_INIT_DATA_MAX_AGE_SECONDS", "901")

    with pytest.raises(RuntimeError, match="cannot exceed 900"):
        get_settings()


def test_cors_rejects_wildcard_with_credentials(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("CORS_ORIGINS", "*")

    with pytest.raises(RuntimeError, match="wildcard"):
        get_settings()


def test_production_postgres_defaults_to_required_tls(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("APP_SECRET", "a" * 32)
    monkeypatch.setenv("ALLOW_DEMO_SEED_DATA", "false")
    monkeypatch.setenv("CORS_ORIGINS", "https://example.com")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@example.com/app")
    monkeypatch.delenv("DATABASE_SSLMODE", raising=False)

    assert get_settings().database_sslmode == "require"


def test_production_rejects_disabled_tls_from_url(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("APP_SECRET", "a" * 32)
    monkeypatch.setenv("ALLOW_DEMO_SEED_DATA", "false")
    monkeypatch.setenv("CORS_ORIGINS", "https://example.com")
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql://user:pass@example.com/app?sslmode=disable"
    )

    with pytest.raises(RuntimeError, match="must enforce TLS"):
        get_settings()


def test_development_postgres_does_not_force_tls(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@example.com/app")
    monkeypatch.delenv("DATABASE_SSLMODE", raising=False)

    assert get_settings().database_sslmode is None


def test_vercel_production_rejects_sqlite(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("APP_SECRET", "a" * 32)
    monkeypatch.setenv("ALLOW_DEMO_SEED_DATA", "false")
    monkeypatch.setenv("CORS_ORIGINS", "https://example.com")
    monkeypatch.setenv("DATABASE_URL", "sqlite:////tmp/crm.sqlite3")

    with pytest.raises(RuntimeError, match="external PostgreSQL"):
        get_settings()


def test_permanent_owner_config_is_strict_and_contains_no_defaults(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("PERMANENT_TELEGRAM_OWNERS", json.dumps([
        {"id": "owner-config", "login": "owner_config", "telegram_id": "123456789", "name": "Owner"}
    ]))

    settings = get_settings()

    assert settings.permanent_telegram_owners == (
        ("owner-config", "owner_config", "123456789", "Owner"),
    )

from __future__ import annotations

from app.config import _normalize_database_url


def test_normalize_database_url_converts_legacy_postgres_scheme() -> None:
    raw_url = "postgres://user:pass@example.com:5432/appdb"

    assert _normalize_database_url(raw_url) == "postgresql+psycopg://user:pass@example.com:5432/appdb"


def test_normalize_database_url_uses_psycopg_for_postgresql_scheme() -> None:
    raw_url = "postgresql://user:pass@example.com:5432/appdb"

    assert _normalize_database_url(raw_url) == "postgresql+psycopg://user:pass@example.com:5432/appdb"


def test_normalize_database_url_keeps_explicit_driver_and_sqlite() -> None:
    assert _normalize_database_url("postgresql+psycopg://user:pass@example.com/appdb") == "postgresql+psycopg://user:pass@example.com/appdb"
    assert _normalize_database_url("sqlite:////tmp/crm.sqlite3") == "sqlite:////tmp/crm.sqlite3"

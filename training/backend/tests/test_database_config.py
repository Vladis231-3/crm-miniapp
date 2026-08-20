from __future__ import annotations

from sqlalchemy.engine import make_url

from app import database


def test_postgres_config_preserves_standard_query_parameters() -> None:
    raw = (
        "postgresql+psycopg://user:secret@example.com/app"
        "?application_name=crm&connect_timeout=7&options=-csearch_path%3Dpublic"
        "&sslrootcert=%2Fcerts%2Fca.pem&pgbouncer=true&supavisor=1"
    )

    normalized, connect_args = database._database_connection_config(
        raw, default_sslmode="require"
    )
    parsed = make_url(normalized)

    assert parsed.query == {
        "application_name": "crm",
        "connect_timeout": "7",
        "options": "-csearch_path=public",
        "sslrootcert": "/certs/ca.pem",
    }
    assert connect_args == {"prepare_threshold": None, "sslmode": "require"}
    assert "secret" in normalized  # Engine input remains usable; it is never logged.


def test_url_sslmode_wins_and_verify_full_ca_is_preserved() -> None:
    normalized, connect_args = database._database_connection_config(
        "postgresql+psycopg://user:secret@example.com/app"
        "?sslmode=verify-full&sslrootcert=%2Fcerts%2Fca.pem"
    )

    assert make_url(normalized).query == {"sslrootcert": "/certs/ca.pem"}
    assert connect_args["sslmode"] == "verify-full"


def test_sqlite_config_does_not_add_tls() -> None:
    normalized, connect_args = database._database_connection_config("sqlite:////tmp/test.sqlite3")

    assert normalized == "sqlite:////tmp/test.sqlite3"
    assert connect_args == {"check_same_thread": False}

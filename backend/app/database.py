from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings

settings = get_settings()

_PROVIDER_ONLY_QUERY_PARAMS = {"pgbouncer", "supavisor"}


class Base(DeclarativeBase):
    pass


def _database_connection_config(
    raw_url: str, *, default_sslmode: str | None = None
) -> tuple[str, dict[str, object]]:
    """Preserve URL options and apply explicit driver connection settings."""
    if raw_url.startswith("sqlite"):
        return raw_url, {"check_same_thread": False}

    url = make_url(raw_url)
    query = dict(url.query)
    for provider_param in _PROVIDER_ONLY_QUERY_PARAMS:
        query.pop(provider_param, None)
    connect_args: dict[str, object] = {"prepare_threshold": None}
    sslmode = query.get("sslmode") or default_sslmode
    if sslmode:
        connect_args["sslmode"] = sslmode
        query.pop("sslmode", None)
    normalized_url = url.set(query=query).render_as_string(hide_password=False)
    return normalized_url, connect_args


_db_url, _connect_args = _database_connection_config(
    settings.database_url, default_sslmode=settings.database_sslmode
)

engine = create_engine(_db_url, connect_args=_connect_args)

if _db_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _sqlite_set_pragmas(dbapi_connection, _connection_record) -> None:  # pragma: no cover
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA busy_timeout=5000")
            cursor.execute("PRAGMA foreign_keys=ON")
        finally:
            cursor.close()

SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

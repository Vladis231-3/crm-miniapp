from __future__ import annotations

import ssl
from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


settings = get_settings()


class Base(DeclarativeBase):
    pass


def _prepare_db_url(raw_url: str) -> str:
    """Нормализует DATABASE_URL для SQLAlchemy 2.x + pg8000.

    pg8000 не принимает sslmode и другие параметры в URL —
    SSL передаётся через ssl_context в connect_args.
    """
    if raw_url.startswith("sqlite"):
        return raw_url

    # pg8000 не принимает никаких query-параметров — убираем всё после ?
    if "?" in raw_url:
        url = raw_url.split("?", 1)[0]
    else:
        url = raw_url

    for prefix in (
        "postgres://",
        "postgresql://",
        "postgresql+psycopg2://",
        "postgresql+psycopg://",
        "postgresql+pg8000://",
    ):
        if url.startswith(prefix):
            rest = url[len(prefix):]
            return f"postgresql+pg8000://{rest}"

    return url


def _make_connect_args(db_url: str) -> dict:
    if db_url.startswith("sqlite"):
        return {"check_same_thread": False}
    if "pg8000" in db_url:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return {"ssl_context": ctx}
    return {}


_db_url = _prepare_db_url(settings.database_url)

engine = create_engine(
    _db_url,
    connect_args=_make_connect_args(_db_url),
)

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

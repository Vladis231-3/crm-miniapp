from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


settings = get_settings()


class Base(DeclarativeBase):
    pass


def _clean_db_url(raw_url: str) -> str:
    """Убирает query-параметры из DATABASE_URL.

    psycopg и psycopg2 не принимают нестандартные параметры
    (supavisor, pgbouncer и т.д.) которые Supabase добавляет в URL.
    SSL включён по умолчанию в psycopg при подключении к Supabase.
    """
    if raw_url.startswith("sqlite"):
        return raw_url
    # Убираем всё после ?
    return raw_url.split("?")[0]


_db_url = _clean_db_url(settings.database_url)

engine = create_engine(
    _db_url,
    connect_args={"check_same_thread": False} if _db_url.startswith("sqlite") else {},
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

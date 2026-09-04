"""Аудит идемпотентности миграций (Фаза 2.5 + Волна 3).

Режимы (DATABASE_URL обязан указывать на *scratch*.sqlite3):
  --prepare : схема create_all + strip целевых колонок
  --verify  : сверка колонок после upgrade() x2
  --indexes : сброс ix_-индексов -> upgrade() x2 -> сверка (add_performance_indexes)

Использование:
  set DATABASE_URL=sqlite:///C:/.../audit_scratchN.sqlite3
  python audit/scripts/migration_idempotency.py --prepare
  python -m backend.migrations.<name>   # из корня репо
  python audit/scripts/migration_idempotency.py --verify
"""

from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
REPO_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(REPO_DIR))


def scratch_path() -> Path:
    """Scratch-БД строго из DATABASE_URL текущего процесса (не мимо prod)."""
    from sqlalchemy.engine import make_url

    url = make_url(os.environ["DATABASE_URL"])
    assert url.drivername == "sqlite", f"только sqlite scratch: {url.drivername}"
    path = Path(url.database)
    assert "scratch" in path.name, f"отказ: имя не scratch: {path.name}"
    return path


STRIP_STATEMENTS = [
    "ALTER TABLE bookings DROP COLUMN plate_type",
    "ALTER TABLE clients DROP COLUMN plate_type",
    "ALTER TABLE bookings DROP COLUMN started_at",
    "ALTER TABLE bookings DROP COLUMN completed_at",
    "ALTER TABLE bookings DROP COLUMN materials_written_off",
    "DROP TABLE IF EXISTS stock_write_offs",
]

EXPECTED_AFTER_UPGRADE = {
    "bookings": {"plate_type", "started_at", "completed_at", "materials_written_off"},
    "clients": {"plate_type"},
    "stock_write_offs": {
        "booking_id",
        "booking_service",
        "note",
        "booking_client_name",
        "booking_date",
        "booking_worker_names",
    },
}


def prepare() -> None:
    scratch = scratch_path()
    if scratch.exists():
        scratch.unlink()
    from backend.app.database import Base, engine
    from backend.app import models as _models  # noqa: F401 — регистрация таблиц на Base

    Base.metadata.create_all(bind=engine)
    conn = sqlite3.connect(str(scratch))
    for stmt in STRIP_STATEMENTS:
        try:
            conn.execute(stmt)
        except Exception as exc:  # уже нет — зафиксировать и идти дальше
            print(f"strip-skip: {stmt} ({exc})")
    conn.commit()
    conn.close()
    print(f"prepared: {scratch}")


def verify() -> bool:
    scratch = scratch_path()
    conn = sqlite3.connect(str(scratch))
    ok = True
    for table, columns in EXPECTED_AFTER_UPGRADE.items():
        present = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
        if table == "stock_write_offs" and not present:
            print(f"MISSING TABLE: {table}")
            ok = False
            continue
        missing = columns - present
        if missing:
            print(f"MISSING COLUMNS {table}: {sorted(missing)}")
            ok = False
        else:
            print(f"ok: {table} complete")
    conn.close()
    print("VERIFY:", "PASS" if ok else "FAIL")
    return ok


def _index_names() -> set[str]:
    from sqlalchemy import inspect as sa_inspect

    from backend.app.database import engine

    names: set[str] = set()
    for table in sa_inspect(engine).get_table_names():
        names.update(idx["name"] for idx in sa_inspect(engine).get_indexes(table))
    return names


def indexes_roundtrip() -> bool:
    """Сброс ix_-индексов Волны 3 -> upgrade() x2 -> сверка."""
    from backend.migrations import add_performance_indexes as mig

    scratch = scratch_path()
    conn = sqlite3.connect(str(scratch))
    dropped = [n for n in _index_names() if n.startswith("ix_")]
    for name in dropped:
        conn.execute(f'DROP INDEX "{name}"')
    conn.commit()
    conn.close()
    print(f"dropped indexes: {len(dropped)}")
    first = mig.upgrade()
    print(f"run1: {sum(1 for line in first if line.startswith('ok:'))} ok")
    second = mig.upgrade()
    idle = all(line.startswith(("ok:", "skip:")) for line in second)
    print(f"run2 clean-rerun: {idle}")
    remaining = _index_names()
    expected = {name for name, _, _ in mig.INDEXES}
    missing = expected - remaining
    print(f"missing after upgrade: {sorted(missing) or 'none'}")
    drift = mig.check_models_in_sync()
    # чужие (pre-existing) индексы — не наша зона: фильтруем только наши 19
    drift = [d for d in drift if not d.startswith("model-only")]
    if drift:
        print("MODEL DRIFT:", drift)
    ok = not missing and idle and not drift
    print("INDEXES:", "PASS" if ok else "FAIL")
    return ok


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "--prepare"
    if mode == "--prepare":
        prepare()
    elif mode == "--verify":
        sys.exit(0 if verify() else 1)
    elif mode == "--indexes":
        sys.exit(0 if indexes_roundtrip() else 1)
    else:
        raise SystemExit(f"unknown mode: {mode}")

"""T2.1: версионированный runner поверх существующих рантайм-миграций.

Проблема: ``_apply_runtime_migrations()`` в ``app.main`` — монолит ~1250 строк
идемпотентных ``ALTER/CREATE INDEX`` без версий: каждый старт (включая каждый
serverless cold-start) гоняет сотни ``inspect()``, параллельные старты
конфликтуют на DDL (см. ``warning``-гарды и комментарий про DeadlockDetected
от 10.09.2026 внутри тела функции).

Решение (strangler, без переписывания тела):
- ``schema_migrations`` (см. ``models.SchemaMigration``): одна строка на
  применённую версию. Warm-старт видит ``legacy-runtime-baseline-001`` и
  пропускает тело целиком.
- Файловый кросс-процессный лок ``<PERSISTENT_DATA_DIR>/.schema-migration.lock``
  (``O_CREAT|O_EXCL`` + угон протухшего): параллельный старт ждёт, а не
  конфликтует на DDL. Таймаут ожидания — громкий ``TimeoutError`` (fail-fast).
- ``plan()`` — read-only preflight (что применено / что pending).
- ``downgrade()`` — честно отсутствует: DDL частично необратим, откат только
  restore из pre-migration dump.

``upgrade_fn`` передаётся аргументом (сейчас — ``_apply_runtime_migrations``
из ``app.main``), чтобы у модуля не было циклического импорта на ``app.main``.
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from pathlib import Path

logger = logging.getLogger(__name__)

BASELINE_ID = "legacy-runtime-baseline-001"
LOCK_FILENAME = ".schema-migration.lock"


@contextmanager
def migration_lock(
    lock_dir: Path,
    *,
    timeout_s: float = 900,
    stale_after_s: float = 600,
) -> Iterator[None]:
    """Кросс-процессный лок миграций. Таймаут — громкий TimeoutError."""
    lock_dir.mkdir(parents=True, exist_ok=True)
    path = lock_dir / LOCK_FILENAME
    deadline = time.monotonic() + timeout_s
    fh = None
    while True:
        try:
            fd = os.open(str(path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            fh = os.fdopen(fd, "w")
            fh.write(f"{os.getpid()}@{time.time()}")
            fh.flush()
            break
        except FileExistsError:
            try:
                age = time.time() - path.stat().st_mtime
            except FileNotFoundError:
                continue  # чужой холдер только что отпустил — пробуем снова
            if age > stale_after_s:
                logger.warning(
                    "SECURITY-MIGRATION stale lock %.0fs old, stealing: %s",
                    age,
                    path,
                )
                try:
                    path.unlink()
                except FileNotFoundError:
                    pass
                continue
            if time.monotonic() >= deadline:
                raise TimeoutError(
                    f"Timed out waiting for migration lock: {path}"
                )
            time.sleep(1)
    try:
        yield
    finally:
        try:
            if fh is not None:
                fh.close()
        finally:
            try:
                path.unlink()
            except FileNotFoundError:
                pass


def _ensure_versions_table(engine) -> None:
    from sqlalchemy.exc import OperationalError

    from .models import SchemaMigration

    try:
        SchemaMigration.__table__.create(bind=engine, checkfirst=True)
    except OperationalError as exc:
        # Benign race: параллельные старты одновременно прошли checkfirst.
        # Тот же класс гонок, что уже задокументирован внутри upgrade_fn
        # (CREATE INDEX IF NOT EXISTS + warning-гарды).
        if "already exists" not in str(exc).lower():
            raise
        logger.debug("schema_migrations create raced, ignoring: %s", exc)


def get_applied_versions(engine, *, create_if_missing: bool = True) -> set[str]:
    """Множество записанных версий.

    ``create_if_missing=False`` — строго read-only: таблицы нет → пустое
    множество без DDL-побочек (для ``plan()``/preflight).
    """
    from sqlalchemy import inspect as sa_inspect
    from sqlalchemy import select

    from .models import SchemaMigration

    if create_if_missing:
        _ensure_versions_table(engine)
    elif not sa_inspect(engine).has_table(SchemaMigration.__tablename__):
        return set()
    with engine.connect() as connection:
        rows = connection.execute(select(SchemaMigration.version)).all()
    return {row[0] for row in rows}


def plan(engine, *, extra_ids: list[str] | None = None) -> dict:
    """Строго read-only preflight: диалект, таблицы, применённые/pending версии."""
    from sqlalchemy import inspect as sa_inspect

    applied = get_applied_versions(engine, create_if_missing=False)
    pending = []
    if BASELINE_ID not in applied:
        pending.append(BASELINE_ID)
    for version in extra_ids or []:
        if version not in applied:
            pending.append(version)
    try:
        tables = sa_inspect(engine).get_table_names()
    except Exception:  # pragma: no cover - диагностика не должна ронять preflight
        tables = []
    return {
        "dialect": engine.dialect.name,
        "tables": len(tables),
        "applied": sorted(applied),
        "pending": pending,
    }


def _record_version(engine, version: str) -> None:
    from .models import SchemaMigration, utc_now

    with engine.begin() as connection:
        connection.execute(
            SchemaMigration.__table__.insert().values(
                version=version, applied_at=utc_now()
            )
        )


# Пост-baseline миграция: (id, upgrade_fn). upgrade_fn возвращает
# "applied" (или None), либо "deferred" — грязные данные, нужен ручной разбор;
# deferred НЕ записывается и ретраится на каждом старте с громким логом.
# Неожиданное исключение — fail-fast: старт падает, остаток не применяется.
ExtraMigration = tuple[str, Callable[[], "str | None"]]


def run_startup_migrations(
    baseline_fn: Callable[[], None],
    *,
    engine=None,
    lock_dir: Path | None = None,
    lock_timeout_s: float = 900,
    extra_migrations: list[ExtraMigration] | None = None,
) -> dict:
    """Точка входа стартапа: лок → пропуск/применение pending → запись версий.

    Ошибки ``baseline_fn``/``extra`` (кроме задокументированных гардов
    внутри них) пробрасываются наверх — старт падает громко, а не на полусхеме.
    Недоступная lock-директория — тоже громкая ошибка (fail-closed):
    перехватывается только ``TimeoutError`` ожидания лока.
    """
    from .config import PERSISTENT_DATA_DIR
    from .database import engine as default_engine

    eng = engine or default_engine
    extras = list(extra_migrations or [])
    _ensure_versions_table(eng)
    have = get_applied_versions(eng)
    want = [BASELINE_ID] + [version for version, _ in extras]
    if all(version in have for version in want):
        return {"status": "skipped", "applied": []}

    target = Path(lock_dir) if lock_dir is not None else PERSISTENT_DATA_DIR
    try:
        with migration_lock(target, timeout_s=lock_timeout_s):
            return _apply_all_under_lock(eng, baseline_fn, extras)
    except TimeoutError:
        logger.exception("SECURITY-MIGRATION lock timeout")
        raise


def _apply_all_under_lock(
    eng, baseline_fn: Callable[[], None], extras: list[ExtraMigration]
) -> dict:
    # Повторная проверка внутри лока: второй старт пропускает.
    applied: list[str] = []
    deferred: list[str] = []
    if BASELINE_ID not in get_applied_versions(eng):
        before = plan(eng)
        logger.info(
            "SECURITY-MIGRATION applying %s (dialect=%s tables=%s)",
            BASELINE_ID,
            before["dialect"],
            before["tables"],
        )
        baseline_fn()
        _record_version(eng, BASELINE_ID)
        applied.append(BASELINE_ID)
    for version, upgrade_fn in extras:
        if version in get_applied_versions(eng):
            continue
        logger.info("SECURITY-MIGRATION applying %s", version)
        status = upgrade_fn() or "applied"
        if status == "deferred":
            logger.error(
                "SECURITY-MIGRATION %s deferred: грязные данные, "
                "нужен ручной разбор. Retry на следующем старте.",
                version,
            )
            deferred.append(version)
            continue
        _record_version(eng, version)
        applied.append(version)
    after = plan(eng)
    logger.info(
        "SECURITY-MIGRATION done applied=%s deferred=%s (tables=%s)",
        applied,
        deferred,
        after["tables"],
    )
    if deferred and not applied:
        return {"status": "deferred", "applied": applied, "deferred": deferred}
    if deferred:
        return {"status": "partial", "applied": applied, "deferred": deferred}
    return {"status": "applied" if applied else "skipped", "applied": applied}


def downgrade(version: str) -> None:
    """Downgrade отдельных версий не поддерживается.

    Рантайм-DDL (ADD COLUMN / backfill / CREATE INDEX) частично необратим
    без потери данных. Откат — только restore из pre-migration dump
    (см. docs/BACKUP_RESTORE.md из T1.2+ и план Фазы 5).
    """
    raise RuntimeError(
        f"No downgrade path for schema migration {version!r}: "
        "restore from the pre-migration dump instead."
    )


def main(argv: list[str]) -> int:
    from .database import engine as default_engine

    command = argv[1] if len(argv) > 1 else "plan"
    if command == "plan":
        print(json.dumps(plan(default_engine), indent=2, ensure_ascii=False))
        return 0
    if command == "pending":
        pending = plan(default_engine)["pending"]
        print(json.dumps(pending, ensure_ascii=False))
        return 0 if not pending else 1
    print(f"unknown command: {command} (expected plan|pending)", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

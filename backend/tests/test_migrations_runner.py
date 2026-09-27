"""T2.1: версионированный runner миграций (тесты новой функциональности).

- baseline применяется один раз и записывается; повтор — пропуск;
- ошибка upgrade_fn пробрасывается и версия НЕ пишется (retry возможен);
- конкурентные старты сериализуются локом (второй пропускает);
- протухший лок угоняется, вечное ожидание — громкий TimeoutError;
- plan() read-only preflight; downgrade() честно отказывает;
- seed_database в production демо-персонал не создаёт;
- полный стартап через TestClient записывает baseline-версию.
"""

from __future__ import annotations

import os
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from uuid import uuid4


def reset_app_modules() -> None:
    for name in list(sys.modules):
        if (
            name == "app"
            or name.startswith("app.")
            or name == "backend.app"
            or name.startswith("backend.app.")
            or name == "bot"
        ):
            del sys.modules[name]


def make_engine(path: Path):
    from sqlalchemy import create_engine

    return create_engine(
        f"sqlite:///{path.as_posix()}",
        connect_args={"check_same_thread": False},
    )


class RunnerUnitTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="mgr_"))
        self.db_path = self.tmp / f"m_{uuid4().hex}.sqlite3"
        self.lock_dir = self.tmp / "locks"
        from app.runtime_migrations import BASELINE_ID

        self.baseline = BASELINE_ID

    def tearDown(self) -> None:
        reset_app_modules()
        for child in sorted(self.tmp.rglob("*"), reverse=True):
            try:
                if child.is_file() or child.is_symlink():
                    child.unlink()
                else:
                    child.rmdir()
            except FileNotFoundError:
                pass
        try:
            self.tmp.rmdir()
        except OSError:
            pass

    def test_baseline_applies_once_then_skips(self) -> None:
        from app.runtime_migrations import get_applied_versions, run_startup_migrations

        engine = make_engine(self.db_path)
        calls: list[str] = []
        first = run_startup_migrations(
            lambda: calls.append("run"), engine=engine, lock_dir=self.lock_dir
        )
        self.assertEqual(first["status"], "applied")
        self.assertEqual(calls, ["run"])
        self.assertIn(self.baseline, get_applied_versions(engine))
        second = run_startup_migrations(
            lambda: calls.append("run"), engine=engine, lock_dir=self.lock_dir
        )
        self.assertEqual(second["status"], "skipped")
        self.assertEqual(calls, ["run"])
        engine.dispose()

    def test_error_propagates_and_version_not_recorded(self) -> None:
        from app.runtime_migrations import get_applied_versions, run_startup_migrations

        engine = make_engine(self.db_path)
        calls: list[str] = []

        def boom() -> None:
            calls.append("run")
            raise ValueError("simulated DDL failure")

        with self.assertRaises(ValueError):
            run_startup_migrations(boom, engine=engine, lock_dir=self.lock_dir)
        self.assertNotIn(self.baseline, get_applied_versions(engine))
        # retry после исправления возможен
        run_startup_migrations(lambda: calls.append("ok"), engine=engine, lock_dir=self.lock_dir)
        self.assertEqual(calls, ["run", "ok"])
        engine.dispose()

    def test_concurrent_startups_serialized(self) -> None:
        from app.runtime_migrations import run_startup_migrations

        engine = make_engine(self.db_path)
        calls: list[str] = []
        errors: list[BaseException] = []

        def slow() -> None:
            time.sleep(2)
            calls.append("run")

        def target() -> None:
            try:
                run_startup_migrations(slow, engine=engine, lock_dir=self.lock_dir)
            except BaseException as exc:  # noqa: BLE001
                errors.append(exc)

        threads = [threading.Thread(target=target) for _ in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=60)
        self.assertEqual(errors, [])
        # второй старт внутри лока увидел записанную версию и пропустил тело
        self.assertEqual(calls, ["run"])
        engine.dispose()

    def test_stale_lock_is_stolen(self) -> None:
        from app.runtime_migrations import LOCK_FILENAME, migration_lock

        self.lock_dir.mkdir(parents=True, exist_ok=True)
        stale = self.lock_dir / LOCK_FILENAME
        stale.write_text("dead-process")
        old = time.time() - 3600
        os.utime(stale, (old, old))
        with migration_lock(self.lock_dir, timeout_s=10, stale_after_s=60):
            pass
        self.assertFalse(stale.exists())

    def test_lock_timeout_is_loud(self) -> None:
        from app.runtime_migrations import migration_lock

        with migration_lock(self.lock_dir, timeout_s=10):
            with self.assertRaises(TimeoutError):
                with migration_lock(self.lock_dir, timeout_s=2, stale_after_s=600):
                    pass

    def test_plan_is_read_only_preflight(self) -> None:
        from app.runtime_migrations import get_applied_versions, plan

        engine = make_engine(self.db_path)
        pre = plan(engine)
        self.assertEqual(pre["pending"], [self.baseline])
        self.assertEqual(pre["applied"], [])
        # plan не применяет baseline
        self.assertNotIn(self.baseline, get_applied_versions(engine))
        engine.dispose()

    def test_plan_creates_no_tables(self) -> None:
        # Оговорка T2.1 №1 закрыта: plan() строго read-only, DDL-побочек нет.
        from sqlalchemy import inspect as sa_inspect
        from sqlalchemy import text as sa_text

        from app.runtime_migrations import plan

        engine = make_engine(self.db_path)
        pre = plan(engine)
        self.assertEqual(pre["pending"], [self.baseline])
        with engine.connect() as connection:
            tables = connection.execute(
                sa_text("SELECT name FROM sqlite_master WHERE type='table'")
            ).all()
        self.assertEqual([row[0] for row in tables], [])
        self.assertFalse(sa_inspect(engine).has_table("schema_migrations"))
        engine.dispose()

    def test_lock_dir_failure_is_fail_closed(self) -> None:
        # Оговорка T2.1 №4 закрыта кодом: перехватывается только TimeoutError,
        # недоступная lock-директория роняет старт громко (fail-closed).
        from app.runtime_migrations import get_applied_versions, run_startup_migrations

        engine = make_engine(self.db_path)
        blocker = self.tmp / "not-a-dir"
        blocker.write_text("block")
        calls: list[str] = []
        with self.assertRaises(OSError):
            run_startup_migrations(
                lambda: calls.append("run"),
                engine=engine,
                lock_dir=blocker / "sub",
            )
        self.assertEqual(calls, [])
        self.assertNotIn(self.baseline, get_applied_versions(engine))
        engine.dispose()

    def test_downgrade_refuses_with_restore_pointer(self) -> None:
        from app.runtime_migrations import downgrade

        with self.assertRaises(RuntimeError) as ctx:
            downgrade(self.baseline)
        self.assertIn("dump", str(ctx.exception).lower())


class ConfigGateTests(unittest.TestCase):
    """Оговорка T2.1 №2 закрыта: seed-гейт трёхуровневый.

    config (fail-closed RuntimeError) + seed(is_production) + тест.
    """

    def test_strong_env_rejects_demo_seed_flag(self) -> None:
        from app.config import get_settings

        saved = {
            key: os.environ.get(key)
            for key in ("APP_ENV", "APP_SECRET", "ALLOW_DEMO_SEED_DATA")
        }
        os.environ["APP_ENV"] = "production"
        os.environ["APP_SECRET"] = "test-only-secret-32-chars-minimum-00"
        os.environ["ALLOW_DEMO_SEED_DATA"] = "true"
        try:
            with self.assertRaises(RuntimeError) as ctx:
                get_settings()
            self.assertIn("ALLOW_DEMO_SEED_DATA", str(ctx.exception))
        finally:
            for key, value in saved.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value


class SeedGateTests(unittest.TestCase):
    def test_production_seed_creates_no_demo_staff(self) -> None:
        from sqlalchemy.orm import sessionmaker

        from app.models import Base, StaffUser
        from app.seed import seed_database
        from sqlalchemy import func, select

        tmp = Path(tempfile.mkdtemp(prefix="seed_"))
        try:
            eng = make_engine(tmp / "seed.sqlite3")
            Base.metadata.create_all(bind=eng)
            session = sessionmaker(bind=eng)()
            try:
                seed_database(
                    session, include_demo_staff=True, is_production=True
                )
                count = session.scalar(
                    select(func.count()).select_from(StaffUser)
                )
            finally:
                session.close()
            self.assertEqual(count, 0)
            eng.dispose()
        finally:
            for child in sorted(tmp.rglob("*"), reverse=True):
                try:
                    child.unlink()
                except FileNotFoundError:
                    pass
            try:
                tmp.rmdir()
            except OSError:
                pass


class StartupIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        import os
        from pathlib import Path as _Path

        data_dir = _Path(__file__).resolve().parents[1] / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = data_dir / f"test_suite_{uuid4().hex}.sqlite3"
        os.environ["DATABASE_URL"] = f"sqlite:///{self.db_path.as_posix()}"
        os.environ["APP_ENV"] = "development"
        os.environ["APP_SECRET"] = "test-secret"
        os.environ["CRON_SECRET"] = "test-cron-secret"
        os.environ["ALLOW_DEMO_SEED_DATA"] = "true"
        os.environ["RUN_EMBEDDED_BOT"] = "false"
        os.environ["ALLOW_INSECURE_CLIENT_AUTH"] = "true"
        os.environ["TELEGRAM_BOT_TOKEN"] = "123456:test-bot-token"
        os.environ["TELEGRAM_DELIVERY_MODE"] = "polling"
        os.environ["SYNC_TELEGRAM_WEBHOOK"] = "false"
        os.environ["TELEGRAM_WEBHOOK_PATH"] = "/api/telegram/webhook"
        os.environ.pop("WEBAPP_URL", None)
        # T4: drop leaked GOOGLE_* env.
        for _key in ("GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET", "GOOGLE_CALENDAR_REDIRECT_URI", "GOOGLE_CALENDAR_TIMEZONE"):
            os.environ.pop(_key, None)

        reset_app_modules()
        from fastapi.testclient import TestClient

        from app.main import app

        self.client_manager = TestClient(app)
        self.client = self.client_manager.__enter__()

    def tearDown(self) -> None:
        if hasattr(self, "client_manager"):
            self.client_manager.__exit__(None, None, None)
        try:
            from app.database import engine as _eng

            _eng.dispose()
        except Exception:  # noqa: BLE001
            pass
        reset_app_modules()
        if self.db_path.exists():
            try:
                self.db_path.unlink()
            except OSError:
                # Windows/daemon может держать файл (см. Google-тесты) — мусор gitignored.
                pass

    def test_startup_records_baseline_version(self) -> None:
        from app.database import SessionLocal
        from app.models import SchemaMigration
        from app.runtime_migrations import BASELINE_ID, get_applied_versions
        from app.database import engine as _eng

        with SessionLocal() as db:
            row = db.get(SchemaMigration, BASELINE_ID)
            self.assertIsNotNone(row)
        self.assertIn(BASELINE_ID, get_applied_versions(_eng))


if __name__ == "__main__":
    unittest.main()

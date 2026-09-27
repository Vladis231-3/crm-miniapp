"""T1.3-хвост: lifespan + кооперативная остановка фоновых потоков.

- выход из TestClient выполняет lifespan-shutdown (stop-флаги выставлены);
- воркеры с выставленным stop_event завершаются быстро;
- без настроенных интеграций потоки вообще не стартуют.
"""

from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


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


class LifespanShutdownTests(unittest.TestCase):
    def setUp(self) -> None:
        data_dir = Path(__file__).resolve().parents[1] / "data"
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
        # T4: drop leaked GOOGLE_* env from neighbouring tests.
        for _key in ("GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET",
                     "GOOGLE_CALENDAR_REDIRECT_URI", "GOOGLE_CALENDAR_TIMEZONE"):
            os.environ.pop(_key, None)

        reset_app_modules()

    def tearDown(self) -> None:
        try:
            from app.database import engine
        except ModuleNotFoundError:
            pass
        else:
            engine.dispose()
        reset_app_modules()
        if self.db_path.exists():
            try:
                self.db_path.unlink()
            except OSError:
                # Windows/daemon может держать файл (см. Google-тесты) — мусор gitignored.
                pass

    def test_lifespan_shutdown_sets_stop_flags(self) -> None:
        import app.main as main

        with TestClient(main.app):
            self.assertFalse(main._shutdown_event.is_set())
            self.assertIsNone(main.bot_thread)
            self.assertIsNone(main.google_sync_thread)
        self.assertTrue(main._shutdown_event.is_set())

    def test_stop_outbox_worker_noop_when_not_running(self) -> None:
        from app.outbox import outbox_thread, stop_outbox_worker

        self.assertIsNone(outbox_thread)
        stop_outbox_worker()  # не должно кидать

    def test_outbox_worker_honours_stop_event(self) -> None:
        import threading as threading_mod

        from app.outbox import run_outbox_worker

        stop = threading_mod.Event()
        stop.set()
        worker = threading_mod.Thread(
            target=run_outbox_worker, kwargs={"stop_event": stop, "interval_s": 30}
        )
        worker.start()
        worker.join(timeout=10)
        self.assertFalse(worker.is_alive())

    def test_google_loop_honours_stop_event(self) -> None:
        import threading as threading_mod

        from app.main import _google_sync_loop

        stop = threading_mod.Event()
        stop.set()
        before = set(threading_mod.enumerate())
        worker = threading_mod.Thread(target=_google_sync_loop, kwargs={"stop_event": stop})
        worker.start()
        worker.join(timeout=10)
        self.assertFalse(worker.is_alive())
        # поток завершился и не остался висеть
        self.assertNotIn(worker, threading_mod.enumerate())
        self.assertLessEqual(len(set(threading_mod.enumerate()) - before), 0)


if __name__ == "__main__":
    unittest.main()

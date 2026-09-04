"""Фаза 6: бюджет SQL-запросов get_wallet (N+1-радар).

AUDIT-07: `.all()` ×155 против `.limit()` ×2 — wallet тянет всё.
Тест фиксирует текущее число как верхнюю границу: любой рост — регресс,
снижение (пагинация/индексы Волны 3) — обновить границу вниз.
"""

from __future__ import annotations

import json
import os
import sys
import unittest
import urllib.parse
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import event

WALLET_QUERY_BUDGET = 120


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


def build_init_data(telegram_id: str) -> str:
    return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})


class WalletQueryBudgetTests(unittest.TestCase):
    OWNER_TG_ID = "777091"

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

        self.restart_app()
        self._set_staff_telegram_ids()
        self.owner_token = build_init_data(self.OWNER_TG_ID)

    def tearDown(self) -> None:
        self.shutdown_app()
        reset_app_modules()
        if self.db_path.exists():
            self.db_path.unlink()

    def shutdown_app(self) -> None:
        if hasattr(self, "client_manager"):
            self.client_manager.__exit__(None, None, None)
        try:
            from app.database import engine
        except ModuleNotFoundError:
            return
        engine.dispose()

    def restart_app(self) -> None:
        if hasattr(self, "client_manager"):
            self.shutdown_app()
        reset_app_modules()
        from app.main import app

        self.client_manager = TestClient(app)
        self.client = self.client_manager.__enter__()

    def _set_staff_telegram_ids(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser
        from sqlalchemy import select

        with SessionLocal() as db:
            staff = db.scalars(select(StaffUser)).all()
            for item in staff:
                if item.login == "owner":
                    item.telegram_chat_id = self.OWNER_TG_ID
            db.commit()

    def test_wallet_query_count_within_budget(self) -> None:
        from app.database import engine

        counter = {"count": 0}

        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            counter["count"] += 1

        event.listen(engine, "before_cursor_execute", before_cursor_execute)
        try:
            response = self.client.get(
                "/api/owner/wallet",
                headers={"Authorization": self.owner_token},
            )
        finally:
            event.remove(engine, "before_cursor_execute", before_cursor_execute)
        self.assertEqual(response.status_code, 200, response.text)
        print(f"\nWALLET_QUERIES={counter['count']} (budget {WALLET_QUERY_BUDGET})")
        self.assertLessEqual(
            counter["count"],
            WALLET_QUERY_BUDGET,
            f"get_wallet выполняет {counter['count']} SQL-запросов — N+1 растёт",
        )


if __name__ == "__main__":
    unittest.main()

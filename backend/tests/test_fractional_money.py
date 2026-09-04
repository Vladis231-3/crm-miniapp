"""W4-002: дробные суммы (Numeric хранит копейки) в int-полях ответов.

PayrollEntryCreateRequest.amount — float: 100.50 валиден на входе.
Зонд: проходят ли дробные суммы через salary-detail/wallet без 500.
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


class FractionalMoneyTests(unittest.TestCase):
    ADMIN_TG_ID = "777131"
    OWNER_TG_ID = "777133"

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
        self.admin_token = build_init_data(self.ADMIN_TG_ID)
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

        mapping = {"admin": self.ADMIN_TG_ID, "owner": self.OWNER_TG_ID}
        with SessionLocal() as db:
            staff = db.scalars(select(StaffUser)).all()
            for item in staff:
                if item.login in mapping:
                    item.telegram_chat_id = mapping[item.login]
            db.commit()

    def test_fractional_bonus_rejected_with_422(self) -> None:
        created = self.client.post(
            "/api/payroll/entries",
            headers={"Authorization": self.owner_token},
            json={"workerId": "w1", "kind": "bonus", "amount": 100.50, "note": "копейки"},
        )
        self.assertEqual(created.status_code, 422, created.text)

    def test_whole_bonus_flows_through_salary_detail(self) -> None:
        created = self.client.post(
            "/api/payroll/entries",
            headers={"Authorization": self.owner_token},
            json={"workerId": "w1", "kind": "bonus", "amount": 101, "note": "целые"},
        )
        self.assertEqual(created.status_code, 200, created.text)
        detail = self.client.get(
            "/api/owner/workers/w1/salary-detail?period=all",
            headers={"Authorization": self.owner_token},
        )
        self.assertEqual(detail.status_code, 200, detail.text)
        body = detail.json()
        bonuses = [e for e in body["entries"] if e["kind"] == "bonus"]
        self.assertEqual(len(bonuses), 1, body)
        self.assertEqual(bonuses[0]["amount"], 101, body)

    def test_fractional_payout_rejected_with_422(self) -> None:
        created = self.client.post(
            "/api/payroll/entries",
            headers={"Authorization": self.owner_token},
            json={"workerId": "w1", "kind": "payout", "amount": 50.25, "note": "копейки"},
        )
        self.assertEqual(created.status_code, 422, created.text)


if __name__ == "__main__":
    unittest.main()

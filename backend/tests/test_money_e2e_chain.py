"""E2E-lite: сквозная цепочка денег одной записи.

create → complete → money-split: распил сходится в чек копейка в копейку,
записанные piggy-транзакции равны вычисленному депозиту (регрессия M-002
на счастливом пути), хозяева получают остаток, владелец видит долю.
"""

from __future__ import annotations

import json
import os
import sys
import unittest
import urllib.parse
from datetime import datetime, timedelta
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


class MoneyChainE2ETests(unittest.TestCase):
    ADMIN_TG_ID = "777141"
    OWNER_TG_ID = "777143"

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

    @staticmethod
    def next_active_date() -> str:
        candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        for offset in range(1, 8):
            next_date = candidate + timedelta(days=offset)
            if next_date.weekday() != 6:
                return next_date.strftime("%d.%m.%Y")
        raise AssertionError("Unable to find active schedule day")

    def test_full_money_chain_reconciles_to_check(self) -> None:
        price = 10000
        created = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json={
                "clientId": "",
                "clientName": "E2E Client",
                "clientPhone": "+7 (999) 777-11-22",
                "service": "Мойка базовая",
                "serviceId": "s1",
                "date": self.next_active_date(),
                "time": "16:00",
                "duration": 30,
                "price": price,
                "status": "scheduled",
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
                "box": "Бокс 1",
                "paymentType": "cash",
                "car": "Lada Vesta",
                "plate": "A123BC",
            },
        )
        self.assertEqual(created.status_code, 200, created.text)
        booking_id = created.json()["id"]

        completed = self.client.patch(
            f"/api/bookings/{booking_id}",
            headers={"Authorization": self.admin_token},
            json={"status": "completed", "paymentSettled": True},
        )
        self.assertEqual(completed.status_code, 200, completed.text)

        split = self.client.get(
            f"/api/owner/bookings/{booking_id}/money-split",
            headers={"Authorization": self.owner_token},
        )
        self.assertEqual(split.status_code, 200, split.text)
        detail = split.json()

        # 1. Распил сходится в чек ровно.
        total = detail["masterTotal"] + detail["piggyDeposit"] + detail["ownersTotal"]
        self.assertEqual(total, price, detail)
        # 2. Мастер получил свои 30%.
        self.assertEqual(detail["masterByWorker"], {"w1": 3000}, detail)
        # 3. Записанные piggy-транзакции равны вычисленному депозиту (M-002).
        stored_piggy = sum(t["amount"] for t in detail["piggyTransactions"])
        self.assertEqual(stored_piggy, detail["piggyDeposit"], detail)
        self.assertEqual(detail["piggyDeposit"], 2400, detail)
        # 4. Остаток — владельцам, доли покрывают ownersTotal.
        self.assertEqual(detail["ownersTotal"], price - 3000 - 2400, detail)


if __name__ == "__main__":
    unittest.main()

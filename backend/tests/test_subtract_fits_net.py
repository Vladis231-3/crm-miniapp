"""M-002: вычет (subtract) не может превышать базу.

Найдено fuzz'ом Фазы 2.1: subtract-asvc больше net парковал carve-out в копилку
сверх чека (price=0 + subtract=50 → piggyDeposit=50 из воздуха), а при complete
фантомный carve-out реально депозитился в копилку (цикл asvc-депозитов без капа).
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


class SubtractFitsNetTests(unittest.TestCase):
    ADMIN_TG_ID = "777051"
    OWNER_TG_ID = "777053"

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
    def auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": token}

    @staticmethod
    def next_active_date() -> str:
        candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        for offset in range(1, 8):
            next_date = candidate + timedelta(days=offset)
            if next_date.weekday() != 6:
                return next_date.strftime("%d.%m.%Y")
        raise AssertionError("Unable to find active schedule day")

    def create_booking(self, price: int) -> dict:
        response = self.client.post(
            "/api/bookings",
            headers=self.auth_headers(self.admin_token),
            json={
                "clientId": "",
                "clientName": "Subtract Cap",
                "clientPhone": "+7 (999) 555-66-77",
                "service": "Мойка базовая",
                "serviceId": "s1",
                "date": self.next_active_date(),
                "time": "12:00",
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
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def add_subtract(self, booking_id: str, price: int):
        return self.client.post(
            f"/api/bookings/{booking_id}/additional-services",
            headers=self.auth_headers(self.admin_token),
            json={
                "serviceId": "s1",
                "name": "Вычет",
                "price": price,
                "duration": 15,
                "priceMode": "subtract",
                "isOutsource": False,
                "outsourceAmount": 0,
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 0}],
            },
        )

    def test_add_subtract_bigger_than_net_returns_400(self) -> None:
        booking = self.create_booking(100)
        response = self.add_subtract(booking["id"], 900)
        self.assertEqual(response.status_code, 400, response.text)
        self.assertIn("превышает базу", response.json()["detail"])

    def test_add_subtract_within_net_works(self) -> None:
        booking = self.create_booking(5000)
        response = self.add_subtract(booking["id"], 900)
        self.assertEqual(response.status_code, 200, response.text)

    def test_update_subtract_beyond_net_returns_400(self) -> None:
        booking = self.create_booking(5000)
        response = self.add_subtract(booking["id"], 900)
        self.assertEqual(response.status_code, 200, response.text)
        asvc_id = response.json()["additionalServices"][-1]["id"]
        update_response = self.client.patch(
            f"/api/bookings/{booking['id']}/additional-services/{asvc_id}",
            headers=self.auth_headers(self.admin_token),
            json={"price": 6000},
        )
        self.assertEqual(update_response.status_code, 400, update_response.text)

    def test_piggy_deposits_never_exceed_check(self) -> None:
        booking = self.create_booking(5000)
        response = self.add_subtract(booking["id"], 900)
        self.assertEqual(response.status_code, 200, response.text)
        complete_response = self.client.patch(
            f"/api/bookings/{booking['id']}",
            headers=self.auth_headers(self.admin_token),
            json={"status": "completed", "paymentSettled": True},
        )
        self.assertEqual(complete_response.status_code, 200, complete_response.text)
        split_response = self.client.get(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(split_response.status_code, 200, split_response.text)
        split = split_response.json()
        stored_piggy = sum(t["amount"] for t in split["piggyTransactions"])
        self.assertLessEqual(stored_piggy, split["price"], split)


if __name__ == "__main__":
    unittest.main()

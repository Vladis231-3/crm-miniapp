"""M-001: суммарный процент бригады не может превышать 100.

Найдено fuzz'ом Фазы 2.1 (case=20: два мастера по 100% → masterTotal 2 при базе 1).
Фронт такие бригады блокирует (totalNewBookingPercent > 100), API принимал молча
и сплит переплачивал мастеров сверх базы.
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


class WorkerPercentCapTests(unittest.TestCase):
    ADMIN_TG_ID = "777041"

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
                if item.login == "admin":
                    item.telegram_chat_id = self.ADMIN_TG_ID
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

    def create_booking(self, workers: list[dict]):
        return self.client.post(
            "/api/bookings",
            headers=self.auth_headers(self.admin_token),
            json={
                "clientId": "",
                "clientName": "Percent Cap",
                "clientPhone": "+7 (999) 444-55-66",
                "service": "Мойка базовая",
                "serviceId": "s1",
                "date": self.next_active_date(),
                "time": "11:00",
                "duration": 30,
                "price": 5000,
                "status": "scheduled",
                "workers": workers,
                "box": "Бокс 1",
                "paymentType": "cash",
                "car": "Lada Vesta",
                "plate": "A123BC",
            },
        )

    def two_hundred_percent_crew(self) -> list[dict]:
        return [
            {"workerId": "w1", "workerName": "Иван", "percent": 100},
            {"workerId": "w2", "workerName": "Пётр", "percent": 100},
        ]

    def test_create_booking_with_percent_sum_over_100_returns_400(self) -> None:
        response = self.create_booking(self.two_hundred_percent_crew())
        self.assertEqual(response.status_code, 400, response.text)
        self.assertIn("100", response.json()["detail"])

    def test_create_booking_with_percent_sum_100_works(self) -> None:
        response = self.create_booking([
            {"workerId": "w1", "workerName": "Иван", "percent": 60},
            {"workerId": "w2", "workerName": "Пётр", "percent": 40},
        ])
        self.assertEqual(response.status_code, 200, response.text)

    def test_patch_booking_workers_over_100_returns_400(self) -> None:
        response = self.create_booking([
            {"workerId": "w1", "workerName": "Иван", "percent": 50},
        ])
        self.assertEqual(response.status_code, 200, response.text)
        booking_id = response.json()["id"]
        patch_response = self.client.patch(
            f"/api/bookings/{booking_id}",
            headers=self.auth_headers(self.admin_token),
            json={"workers": self.two_hundred_percent_crew()},
        )
        self.assertEqual(patch_response.status_code, 400, patch_response.text)

    def test_add_service_with_percent_sum_over_100_returns_400(self) -> None:
        response = self.create_booking([
            {"workerId": "w1", "workerName": "Иван", "percent": 50},
        ])
        self.assertEqual(response.status_code, 200, response.text)
        booking_id = response.json()["id"]
        asvc_response = self.client.post(
            f"/api/bookings/{booking_id}/additional-services",
            headers=self.auth_headers(self.admin_token),
            json={
                "serviceId": "s1",
                "name": "Жадная допуслуга",
                "price": 500,
                "duration": 15,
                "priceMode": "add",
                "isOutsource": False,
                "outsourceAmount": 0,
                "workers": self.two_hundred_percent_crew(),
            },
        )
        self.assertEqual(asvc_response.status_code, 400, asvc_response.text)

    def test_update_service_workers_over_100_returns_400(self) -> None:
        response = self.create_booking([
            {"workerId": "w1", "workerName": "Иван", "percent": 50},
        ])
        self.assertEqual(response.status_code, 200, response.text)
        booking_id = response.json()["id"]
        asvc_response = self.client.post(
            f"/api/bookings/{booking_id}/additional-services",
            headers=self.auth_headers(self.admin_token),
            json={
                "serviceId": "s1",
                "name": "Обычная допуслуга",
                "price": 500,
                "duration": 15,
                "priceMode": "add",
                "isOutsource": False,
                "outsourceAmount": 0,
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 10}],
            },
        )
        self.assertEqual(asvc_response.status_code, 200, asvc_response.text)
        asvc_id = asvc_response.json()["additionalServices"][-1]["id"]
        update_response = self.client.patch(
            f"/api/bookings/{booking_id}/additional-services/{asvc_id}",
            headers=self.auth_headers(self.admin_token),
            json={"workers": self.two_hundred_percent_crew()},
        )
        self.assertEqual(update_response.status_code, 400, update_response.text)


if __name__ == "__main__":
    unittest.main()

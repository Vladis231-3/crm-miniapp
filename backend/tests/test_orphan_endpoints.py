"""Фаза 4.1: первые тесты для endpoint'ов без клиентов и без тестов.

- GET /api/owner/outsource/payroll (денежный отчёт по аутсорсу)
- GET /api/admin/shift-inspections/{id}/photo (auth+маршрутизация)
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


class OrphanEndpointsTests(unittest.TestCase):
    ADMIN_TG_ID = "777081"
    OWNER_TG_ID = "777083"

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

    def test_outsource_payroll_sums_completed_outsource_services(self) -> None:
        create_response = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json={
                "clientId": "",
                "clientName": "Orphan Outsource",
                "clientPhone": "+7 (999) 888-99-00",
                "service": "Мойка базовая",
                "serviceId": "s1",
                "date": self.next_active_date(),
                "time": "15:00",
                "duration": 30,
                "price": 4000,
                "status": "scheduled",
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
                "box": "Бокс 1",
                "paymentType": "cash",
                "car": "Lada Vesta",
                "plate": "A123BC",
            },
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)
        booking_id = create_response.json()["id"]
        asvc_response = self.client.post(
            f"/api/bookings/{booking_id}/additional-services",
            headers={"Authorization": self.admin_token},
            json={
                "serviceId": "s1",
                "name": "Химчистка на стороне",
                "price": 1500,
                "duration": 60,
                "priceMode": "add",
                "isOutsource": True,
                "outsourceAmount": 900,
                "workers": [],
            },
        )
        self.assertEqual(asvc_response.status_code, 200, asvc_response.text)
        complete_response = self.client.patch(
            f"/api/bookings/{booking_id}",
            headers={"Authorization": self.admin_token},
            json={"status": "completed", "paymentSettled": True},
        )
        self.assertEqual(complete_response.status_code, 200, complete_response.text)
        report = self.client.get(
            "/api/owner/outsource/payroll?period=all",
            headers={"Authorization": self.owner_token},
        )
        self.assertEqual(report.status_code, 200, report.text)
        body = report.json()
        self.assertEqual(body["total"], 900, body)
        self.assertEqual(len(body["rows"]), 1, body)

    def test_inspection_photo_unknown_id_returns_404(self) -> None:
        response = self.client.get(
            "/api/admin/shift-inspections/does-not-exist/photo",
            headers={"Authorization": self.owner_token},
        )
        self.assertEqual(response.status_code, 404, response.text)


if __name__ == "__main__":
    unittest.main()

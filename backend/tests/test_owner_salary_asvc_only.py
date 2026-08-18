"""
Regression test: owner salary-detail must include workers who are ONLY on additional services.

This test verifies the fix for the bug where some additional services did not fall into
master salary because owner_worker_salary_detail only joined on BookingWorker, missing
workers who were assigned exclusively to additional services.
"""
from __future__ import annotations

import json
import os
import sys
import unittest
import urllib.parse
from datetime import datetime, timezone
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
    """Build Telegram init data that passes insecure validation (no HMAC)."""
    return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})


class OwnerSalaryAsvcOnlyTest(unittest.TestCase):
    """Test owner salary-detail with asvc-only workers."""

    WORKER_TG_ID = "777001"  # ivan (w1)
    OWNER_TG_ID = "777002"

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

        reset_app_modules()
        from app.main import app

        self.client_manager = TestClient(app)
        self.client = self.client_manager.__enter__()

        self._set_staff_telegram_ids()
        self.worker_token = build_init_data(self.WORKER_TG_ID)
        self.owner_token = build_init_data(self.OWNER_TG_ID)

    def tearDown(self) -> None:
        if hasattr(self, "client_manager"):
            self.client_manager.__exit__(None, None, None)
        try:
            from app.database import engine
        except ModuleNotFoundError:
            pass
        else:
            engine.dispose()
        reset_app_modules()
        if self.db_path.exists():
            self.db_path.unlink()

    def _set_staff_telegram_ids(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser
        from sqlalchemy import select

        with SessionLocal() as db:
            ivan = db.scalar(select(StaffUser).where(StaffUser.login == "ivan"))
            owner = db.scalar(select(StaffUser).where(StaffUser.login == "owner"))
            if ivan is not None:
                ivan.telegram_chat_id = self.WORKER_TG_ID
            if owner is not None:
                owner.telegram_chat_id = self.OWNER_TG_ID
            db.commit()

    @staticmethod
    def _auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": token}

    @staticmethod
    def _today() -> str:
        return datetime.now(timezone.utc).strftime("%d.%m.%Y")

    def _create_client(self) -> tuple[str, str]:
        from app.database import SessionLocal
        from app.models import Client

        client_id = f"c-{uuid4().hex[:12]}"
        phone = f"+7 (999) 000-{str(uuid4().int)[-4:]}"
        with SessionLocal() as db:
            db.add(
                Client(
                    id=client_id,
                    name="Тест Клиент",
                    phone=phone,
                    car="BMW",
                    plate="M001AA",
                )
            )
            db.commit()
        return client_id, phone

    def test_owner_salary_detail_includes_asvc_only_worker(self) -> None:
        """Owner should see earnings for worker assigned ONLY to additional service."""
        client_id, client_phone = self._create_client()
        
        # Create booking with w2 on main service
        response = self.client.post(
            "/api/bookings",
            headers=self._auth_headers(self.owner_token),
            json={
                "clientId": client_id,
                "clientName": "Тест Клиент",
                "clientPhone": client_phone,
                "service": "Мойка",
                "serviceId": "s1",
                "date": self._today(),
                "time": "10:00",
                "duration": 60,
                "price": 5000,
                "status": "completed",
                "workers": [{"workerId": "w2", "workerName": "Пётр", "percent": 30}],
                "box": "Бокс 1",
                "paymentType": "cash",
                "paymentSettled": True,
                "car": "BMW",
                "plate": "M001AA",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        booking_id = response.json()["id"]

        # Add additional service with w1 (ivan) - he's NOT on main service
        asvc_response = self.client.post(
            f"/api/bookings/{booking_id}/additional-services",
            headers=self._auth_headers(self.owner_token),
            json={
                "name": "Полировка",
                "price": 2000,
                "duration": 30,
                "priceMode": "add",
                "isOutsource": False,
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 50}],
            },
        )
        self.assertEqual(asvc_response.status_code, 200, asvc_response.text)

        # Owner should see ivan's earnings in salary-detail
        owner_salary_response = self.client.get(
            "/api/owner/workers/w1/salary-detail?period=all",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(owner_salary_response.status_code, 200, owner_salary_response.text)
        payload = owner_salary_response.json()

        # Ivan should have 1 booking (where he's only on additional service)
        self.assertEqual(payload["completedBookingsCount"], 1, "Ivan should have 1 completed booking")
        
        # Ivan should earn 50% of 2000 = 1000
        self.assertEqual(payload["totalEarned"], 1000, f"Ivan should earn 1000 from additional service, got {payload['totalEarned']}")
        
        # Check booking item
        my_items = [item for item in payload["bookings"] if item["id"] == booking_id]
        self.assertEqual(len(my_items), 1, "Ivan should see the booking in his salary detail")
        self.assertEqual(my_items[0]["earned"], 1000)


if __name__ == "__main__":
    unittest.main()

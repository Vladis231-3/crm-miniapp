"""Фаза 2.3: точечные IDOR/авторизационные проверки + S-001.

S-001: GET /api/debug/db был открыт всем (staff-логины/имена + трейсбеки).
IDOR-1: чужой мастер не может менять чужую запись (403).
IDOR-2: клиент изолирован от staff-роутов (403).
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


class IdorSpotTests(unittest.TestCase):
    ADMIN_TG_ID = "777071"
    IVAN_TG_ID = "777072"
    OLEG_TG_ID = "777073"
    OWNER_TG_ID = "777074"

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
        self.ivan_token = build_init_data(self.IVAN_TG_ID)
        self.oleg_token = build_init_data(self.OLEG_TG_ID)
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

        mapping = {
            "admin": self.ADMIN_TG_ID,
            "ivan": self.IVAN_TG_ID,
            "oleg": self.OLEG_TG_ID,
            "owner": self.OWNER_TG_ID,
        }
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

    def create_booking_for(self, worker_id: str, worker_name: str) -> dict:
        response = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json={
                "clientId": "",
                "clientName": "IDOR Client",
                "clientPhone": "+7 (999) 777-88-99",
                "service": "Мойка базовая",
                "serviceId": "s1",
                "date": self.next_active_date(),
                "time": "14:00",
                "duration": 30,
                "price": 1500,
                "status": "scheduled",
                "workers": [{"workerId": worker_id, "workerName": worker_name, "percent": 30}],
                "box": "Бокс 1",
                "paymentType": "cash",
                "car": "Lada Vesta",
                "plate": "A123BC",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_debug_db_requires_owner(self) -> None:
        anonymous = self.client.get("/api/debug/db")
        self.assertIn(anonymous.status_code, (401, 403), anonymous.text)
        worker = self.client.get("/api/debug/db", headers={"Authorization": self.ivan_token})
        self.assertEqual(worker.status_code, 403, worker.text)
        owner = self.client.get("/api/debug/db", headers={"Authorization": self.owner_token})
        self.assertEqual(owner.status_code, 200, owner.text)
        self.assertTrue(owner.json()["ok"])

    def test_stranger_worker_cannot_patch_booking(self) -> None:
        booking = self.create_booking_for("w2", "Олег")
        response = self.client.patch(
            f"/api/bookings/{booking['id']}",
            headers={"Authorization": self.ivan_token},
            json={"status": "in_progress"},
        )
        self.assertEqual(response.status_code, 403, response.text)

    def test_assigned_worker_can_patch_own_booking(self) -> None:
        booking = self.create_booking_for("w1", "Иван")
        response = self.client.patch(
            f"/api/bookings/{booking['id']}",
            headers={"Authorization": self.ivan_token},
            json={"status": "in_progress"},
        )
        self.assertEqual(response.status_code, 200, response.text)

    def test_client_isolated_from_staff_routes(self) -> None:
        client_auth = self.client.post(
            "/api/auth/client",
            json={"name": "IDOR", "phone": "+7 (999) 000-00-01", "car": "", "plate": ""},
        )
        self.assertEqual(client_auth.status_code, 200, client_auth.text)
        client_token = client_auth.json().get("initData") or build_init_data("999000001")
        probe = self.client.get(
            "/api/owner/bookings/some-id/money-split",
            headers={"Authorization": client_token},
        )
        self.assertIn(probe.status_code, (401, 403, 404), probe.text)


if __name__ == "__main__":
    unittest.main()

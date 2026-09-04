"""
Unit tests for the read-only worker calendar endpoint.

Covers:
- GET /api/worker/calendar by a worker → 200 with ONLY his bookings
  (main service OR additional service participation)
- Bookings of other workers are hidden
- Owner calling the endpoint → 403
- Cancelled bookings are excluded
- Payload does not expose clientPhone/price of bookings
"""
from __future__ import annotations

import json
import os
import sys
import unittest
import urllib.parse
from datetime import datetime, timedelta, timezone
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


class WorkerCalendarTests(unittest.TestCase):
    """Unit tests for GET /api/worker/calendar."""

    WORKER_TG_ID = "777001"
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

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

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
    def _next_active_date() -> str:
        candidate = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        for offset in range(1, 8):
            next_date = candidate + timedelta(days=offset)
            if next_date.weekday() != 6:
                return next_date.strftime("%d.%m.%Y")
        raise AssertionError("Unable to find active schedule day")

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

    def _create_booking(self, *, worker_id: str = "w2", status: str = "new", time: str = "10:00") -> str:
        client_id, client_phone = self._create_client()
        response = self.client.post(
            "/api/bookings",
            headers=self._auth_headers(self.owner_token),
            json={
                "clientId": client_id,
                "clientName": "Тест Клиент",
                "clientPhone": client_phone,
                "service": "Мойка",
                "serviceId": "s1",
                "date": self._next_active_date(),
                "time": time,
                "duration": 60,
                "price": 1000,
                "status": status,
                "workers": [{"workerId": worker_id, "workerName": "Олег", "percent": 10}],
                "box": "Бокс 1",
                "paymentType": "cash",
                "paymentSettled": True,
                "car": "BMW",
                "plate": "M001AA",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["id"]

    # ------------------------------------------------------------------
    # Tests
    # ------------------------------------------------------------------

    def test_worker_sees_own_bookings(self) -> None:
        # ivan (w1) видит свои записи (основная услуга)
        booking_id = self._create_booking(worker_id="w1")

        response = self.client.get(
            "/api/worker/calendar",
            headers=self._auth_headers(self.worker_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertIsInstance(payload, list)
        ids = {item["id"] for item in payload}
        self.assertIn(booking_id, ids)

    def test_worker_does_not_see_bookings_of_other_workers(self) -> None:
        # чужие записи (только w2, без участия w1) скрыты
        booking_id = self._create_booking(worker_id="w2")

        response = self.client.get(
            "/api/worker/calendar",
            headers=self._auth_headers(self.worker_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        ids = {item["id"] for item in response.json()}
        self.assertNotIn(booking_id, ids)

    def test_worker_sees_booking_with_only_additional_service(self) -> None:
        # запись, где мастер участвует ТОЛЬКО в доп. услуге, видна в календаре
        booking_id = self._create_booking(worker_id="w2")
        add_response = self.client.post(
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
        self.assertEqual(add_response.status_code, 200, add_response.text)

        response = self.client.get(
            "/api/worker/calendar",
            headers=self._auth_headers(self.worker_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        ids = {item["id"] for item in payload}
        self.assertIn(booking_id, ids)
        item = next(i for i in payload if i["id"] == booking_id)
        self.assertIn("additionalServices", item)
        my_asvc = [
            a
            for a in item["additionalServices"]
            if any(w["workerId"] == "w1" for w in a.get("workers", []))
        ]
        self.assertEqual(len(my_asvc), 1)
        self.assertEqual(my_asvc[0]["name"], "Полировка")

    def test_worker_calendar_omits_sensitive_fields(self) -> None:
        self._create_booking(worker_id="w1")

        response = self.client.get(
            "/api/worker/calendar",
            headers=self._auth_headers(self.worker_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        for item in response.json():
            self.assertNotIn("clientPhone", item)
            self.assertNotIn("price", item)
            self.assertNotIn("paymentType", item)

    def test_worker_calendar_excludes_cancelled_bookings(self) -> None:
        active_id = self._create_booking(worker_id="w1")
        cancel_response = self.client.patch(
            f"/api/bookings/{active_id}",
            headers=self._auth_headers(self.owner_token),
            json={"status": "cancelled"},
        )
        self.assertEqual(cancel_response.status_code, 200, cancel_response.text)
        fresh_id = self._create_booking(worker_id="w1", time="11:00")

        response = self.client.get(
            "/api/worker/calendar",
            headers=self._auth_headers(self.worker_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        ids = {item["id"] for item in response.json()}
        self.assertIn(fresh_id, ids)
        self.assertNotIn(active_id, ids)

    def test_worker_calendar_forbidden_for_owner(self) -> None:
        response = self.client.get(
            "/api/worker/calendar",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 403, response.text)

    def test_worker_calendar_forbidden_without_auth(self) -> None:
        response = self.client.get("/api/worker/calendar")
        self.assertEqual(response.status_code, 401, response.text)


if __name__ == "__main__":
    unittest.main()

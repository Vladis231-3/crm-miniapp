"""
Tests: worker sees bookings where he participates ONLY in additional services.

Covers:
- Bootstrap (/api/auth/session): worker sees a booking where he is assigned
  only to an additional service (AdditionalServiceWorker), not to the main service
- Worker without any link does not see the booking
- Salary detail: earnings from additional services (asvc.worker_links) are included
  even when the worker is not linked to the main service
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


class WorkerAdditionalServiceTests(unittest.TestCase):
    """Tests for worker visibility of additional services."""

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

    def _create_booking(
        self,
        *,
        main_worker_id: str = "w2",
        status: str = "new",
        date: str | None = None,
    ) -> str:
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
                "date": date or self._today(),
                "time": "10:00",
                "duration": 60,
                "price": 1000,
                "status": status,
                "workers": [{"workerId": main_worker_id, "workerName": "Олег", "percent": 10}],
                "box": "Бокс 1",
                "paymentType": "cash",
                "paymentSettled": True,
                "car": "BMW",
                "plate": "M001AA",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["id"]

    def _add_additional_service(
        self, booking_id: str, *, name: str = "Полировка", price: int = 2000, percent: int = 50
    ) -> dict:
        response = self.client.post(
            f"/api/bookings/{booking_id}/additional-services",
            headers=self._auth_headers(self.owner_token),
            json={
                "name": name,
                "price": price,
                "duration": 30,
                "priceMode": "add",
                "isOutsource": False,
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": percent}],
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _worker_bootstrap(self) -> dict:
        response = self.client.get(
            "/api/auth/session", headers=self._auth_headers(self.worker_token)
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    # ------------------------------------------------------------------
    # Tests
    # ------------------------------------------------------------------

    def test_worker_sees_booking_with_only_additional_service_in_bootstrap(self) -> None:
        booking_id = self._create_booking(main_worker_id="w2")
        payload = self._add_additional_service(booking_id)

        # Sanity: ivan (w1) is NOT in the main service workers
        self.assertTrue(all(w["workerId"] != "w1" for w in payload["workers"]))
        # ...but IS in the additional service workers
        asvc = next(a for a in payload["additionalServices"] if a["id"])
        self.assertTrue(any(w["workerId"] == "w1" for w in asvc["workers"]))

        bootstrap = self._worker_bootstrap()
        ids = {item["id"] for item in bootstrap["bookings"]}
        self.assertIn(booking_id, ids)

        booking = next(item for item in bootstrap["bookings"] if item["id"] == booking_id)
        my_asvc = [
            a
            for a in booking["additionalServices"]
            if any(w["workerId"] == "w1" for w in a["workers"])
        ]
        self.assertEqual(len(my_asvc), 1)
        self.assertEqual(my_asvc[0]["name"], "Полировка")

    def test_worker_without_links_does_not_see_booking(self) -> None:
        booking_id = self._create_booking(main_worker_id="w2")

        bootstrap = self._worker_bootstrap()
        ids = {item["id"] for item in bootstrap["bookings"]}
        self.assertNotIn(booking_id, ids)

    def test_worker_salary_detail_includes_additional_service_earnings(self) -> None:
        booking_id = self._create_booking(main_worker_id="w2", status="completed")
        self._add_additional_service(booking_id, name="Полировка", price=2000, percent=50)

        response = self.client.get(
            "/api/worker/salary-detail?period=all",
            headers=self._auth_headers(self.worker_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()

        my_items = [item for item in payload["bookings"] if item["id"] == booking_id]
        self.assertEqual(len(my_items), 1, payload)
        # 50% of the additional service price (2000) → 1000, main service is not his
        self.assertEqual(my_items[0]["earned"], 1000)
        self.assertGreaterEqual(payload["totalEarned"], 1000)

    def test_creating_additional_service_notifies_assigned_worker(self) -> None:
        """При создании доп. услуги назначенному мастеру приходит уведомление
        (in-app + Telegram), как при назначении обычной услуги."""
        from unittest.mock import patch

        booking_id = self._create_booking(main_worker_id="w2")

        telegram_calls: list[tuple[str | None, str]] = []

        def fake_send_telegram_message(chat_id: str | None, text: str) -> None:
            telegram_calls.append((chat_id, text))

        from app import main as app_main

        with patch.object(
            app_main, "send_telegram_message", side_effect=fake_send_telegram_message
        ):
            self._add_additional_service(booking_id, name="Полировка", price=2000, percent=50)

        # In-app notification for the assigned master (w1), not for the main worker
        bootstrap = self._worker_bootstrap()
        messages = [n["message"] for n in bootstrap.get("notifications", [])]
        matched = [m for m in messages if "Вам назначена доп. услуга" in m and "Полировка" in m]
        self.assertTrue(matched, messages)
        self.assertIn("Оплата: 50%", matched[0])
        self.assertIn("Тест Клиент", matched[0])

        # Telegram delivery attempted to the assigned master's chat id
        sent_to = {chat_id for chat_id, _text in telegram_calls}
        self.assertIn(self.WORKER_TG_ID, sent_to)
        self.assertTrue(
            any("Вам назначена доп. услуга" in text for _chat_id, text in telegram_calls)
        )


if __name__ == "__main__":
    unittest.main()

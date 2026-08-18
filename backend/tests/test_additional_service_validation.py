"""
Test: validation when adding/updating additional service with empty workers and not outsource.
"""
from __future__ import annotations

import os
import sys
import unittest
import urllib.parse
import json
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone

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


class AdditionalServiceValidationTest(unittest.TestCase):
    """Test validation: non-outsource additional service must have at least one worker."""

    OWNER_TG_ID = "777999"

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
        self._set_owner_telegram_id()
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

    def _set_owner_telegram_id(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser
        from sqlalchemy import select

        with SessionLocal() as db:
            owner = db.scalar(select(StaffUser).where(StaffUser.login == "owner"))
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
                    name="Валидация Клиент",
                    phone=phone,
                    car="Lada",
                    plate="T001AA",
                )
            )
            db.commit()
        return client_id, phone

    def test_add_additional_service_without_workers_and_not_outsource_fails(self) -> None:
        """Adding additional service with empty workers and isOutsource=false should fail."""
        client_id, client_phone = self._create_client()

        # Create booking
        response = self.client.post(
            "/api/bookings",
            headers=self._auth_headers(self.owner_token),
            json={
                "clientId": client_id,
                "clientName": "Валидация Клиент",
                "clientPhone": client_phone,
                "service": "Мойка",
                "serviceId": "s1",
                "date": self._today(),
                "time": "12:00",
                "duration": 60,
                "price": 3000,
                "status": "new",
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 40}],
                "box": "Бокс 2",
                "paymentType": "cash",
                "car": "Lada",
                "plate": "T001AA",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        booking_id = response.json()["id"]

        # Try to add additional service without workers and not outsource
        asvc_response = self.client.post(
            f"/api/bookings/{booking_id}/additional-services",
            headers=self._auth_headers(self.owner_token),
            json={
                "name": "Полировка фар",
                "price": 1000,
                "duration": 30,
                "priceMode": "add",
                "isOutsource": False,
                "workers": [],  # Empty workers but not outsource
            },
        )
        self.assertEqual(asvc_response.status_code, 400, "Should reject empty workers when not outsource")
        self.assertIn("выбрать хотя бы одного мастера", asvc_response.text.lower())

    def test_add_additional_service_with_outsource_and_empty_workers_succeeds(self) -> None:
        """Adding additional service with isOutsource=true and empty workers should succeed."""
        client_id, client_phone = self._create_client()

        response = self.client.post(
            "/api/bookings",
            headers=self._auth_headers(self.owner_token),
            json={
                "clientId": client_id,
                "clientName": "Валидация Клиент",
                "clientPhone": client_phone,
                "service": "Мойка",
                "serviceId": "s1",
                "date": self._today(),
                "time": "13:00",
                "duration": 60,
                "price": 3000,
                "status": "new",
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 40}],
                "box": "Бокс 3",
                "paymentType": "cash",
                "car": "Lada",
                "plate": "T001AA",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        booking_id = response.json()["id"]

        # Add outsource additional service with empty workers - should succeed
        asvc_response = self.client.post(
            f"/api/bookings/{booking_id}/additional-services",
            headers=self._auth_headers(self.owner_token),
            json={
                "name": "Химчистка салона (аутсорс)",
                "price": 2500,
                "duration": 120,
                "priceMode": "add",
                "isOutsource": True,
                "outsourceAmount": 2000,
                "workers": [],
            },
        )
        self.assertEqual(asvc_response.status_code, 200, asvc_response.text)
        payload = asvc_response.json()
        self.assertTrue(any(a["isOutsource"] for a in payload["additionalServices"]))

    def test_update_additional_service_removing_workers_without_outsource_fails(self) -> None:
        """Updating to remove all workers without setting outsource=true should fail."""
        client_id, client_phone = self._create_client()

        response = self.client.post(
            "/api/bookings",
            headers=self._auth_headers(self.owner_token),
            json={
                "clientId": client_id,
                "clientName": "Валидация Клиент",
                "clientPhone": client_phone,
                "service": "Мойка",
                "serviceId": "s1",
                "date": self._today(),
                "time": "14:00",
                "duration": 60,
                "price": 3000,
                "status": "new",
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 40}],
                "box": "Бокс 4",
                "paymentType": "cash",
                "car": "Lada",
                "plate": "T001AA",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        booking_id = response.json()["id"]

        # Add additional service with worker
        asvc_response = self.client.post(
            f"/api/bookings/{booking_id}/additional-services",
            headers=self._auth_headers(self.owner_token),
            json={
                "name": "Полировка",
                "price": 1500,
                "duration": 60,
                "priceMode": "add",
                "isOutsource": False,
                "workers": [{"workerId": "w2", "workerName": "Пётр", "percent": 50}],
            },
        )
        self.assertEqual(asvc_response.status_code, 200, asvc_response.text)
        asvc_id = asvc_response.json()["additionalServices"][0]["id"]

        # Try to update: remove workers but keep outsource=false
        update_response = self.client.patch(
            f"/api/bookings/{booking_id}/additional-services/{asvc_id}",
            headers=self._auth_headers(self.owner_token),
            json={
                "isOutsource": False,
                "workers": [],
            },
        )
        self.assertEqual(update_response.status_code, 400, "Should reject removing workers when not outsource")
        self.assertIn("выбрать хотя бы одного мастера", update_response.text.lower())


if __name__ == "__main__":
    unittest.main()

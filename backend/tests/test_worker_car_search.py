"""
Unit tests for the read-only worker car search endpoint.

Covers:
- GET /api/worker/cars/search by a worker → 200 with matching bookings (all workers)
- Case-insensitive plate search (spaces/dashes stripped)
- Car model and client name search
- Empty q → only today's bookings
- Cancelled bookings are excluded
- Owner calling the endpoint → 403, no auth → 401
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
            or name.startswith(("app.", "backend.app."))
            or name == "backend.app"
            or name == "bot"
        ):
            del sys.modules[name]


def build_init_data(telegram_id: str) -> str:
    """Build Telegram init data that passes insecure validation (no HMAC)."""
    return urllib.parse.urlencode({"user": json.dumps({"id": telegram_id})})


class WorkerCarSearchTests(unittest.TestCase):
    """Unit tests for GET /api/worker/cars/search."""

    WORKER_TG_ID = "777101"
    OWNER_TG_ID = "777102"

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

    @staticmethod
    def _today_label() -> str:
        return datetime.now().astimezone().strftime("%d.%m.%Y")

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

    def _create_booking_direct(
        self,
        *,
        date: str,
        plate: str = "M001AA",
        car: str = "BMW",
        client_name: str = "Тест Клиент",
        status: str = "new",
        worker_id: str = "w2",
    ) -> str:
        from app.database import SessionLocal
        from app.models import Booking, BookingWorker, Client

        client_id = f"c-{uuid4().hex[:12]}"
        booking_id = f"b-{uuid4().hex[:12]}"
        with SessionLocal() as db:
            db.add(
                Client(
                    id=client_id,
                    name=client_name,
                    phone=f"+7 (999) 000-{str(uuid4().int)[-4:]}",
                    car=car,
                    plate=plate,
                )
            )
            db.add(
                Booking(
                    id=booking_id,
                    client_id=client_id,
                    client_name=client_name,
                    client_phone="+7 (999) 000-0000",
                    service="Мойка",
                    service_id="s1",
                    date=date,
                    time="10:00",
                    duration=60,
                    price=1000,
                    status=status,
                    box="Бокс 1",
                    payment_type="cash",
                    payment_settled=True,
                    car=car,
                    plate=plate,
                )
            )
            db.flush()
            db.add(
                BookingWorker(
                    booking_id=booking_id,
                    worker_id=worker_id,
                    worker_name="Олег",
                    percent=10,
                )
            )
            db.commit()
        return booking_id

    # ------------------------------------------------------------------
    # Tests
    # ------------------------------------------------------------------

    def test_worker_searches_by_plate_case_insensitive(self) -> None:
        booking_id = self._create_booking(worker_id="w2")

        response = self.client.get(
            "/api/worker/cars/search",
            headers=self._auth_headers(self.worker_token),
            params={"q": "m001aa"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        ids = {item["id"] for item in response.json()}
        self.assertIn(booking_id, ids)

    def test_worker_searches_by_plate_with_spaces_and_dashes(self) -> None:
        booking_id = self._create_booking(worker_id="w2")

        response = self.client.get(
            "/api/worker/cars/search",
            headers=self._auth_headers(self.worker_token),
            params={"q": " M00-1 AA "},
        )
        self.assertEqual(response.status_code, 200, response.text)
        ids = {item["id"] for item in response.json()}
        self.assertIn(booking_id, ids)

    def test_worker_searches_by_car_model(self) -> None:
        booking_id = self._create_booking(worker_id="w2")

        response = self.client.get(
            "/api/worker/cars/search",
            headers=self._auth_headers(self.worker_token),
            params={"q": "bmw"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        ids = {item["id"] for item in response.json()}
        self.assertIn(booking_id, ids)

    def test_worker_searches_by_client_name(self) -> None:
        booking_id = self._create_booking(worker_id="w2")

        response = self.client.get(
            "/api/worker/cars/search",
            headers=self._auth_headers(self.worker_token),
            params={"q": "Тест Клиент"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        ids = {item["id"] for item in response.json()}
        self.assertIn(booking_id, ids)

    def test_worker_search_no_match_returns_empty_list(self) -> None:
        self._create_booking(worker_id="w2")

        response = self.client.get(
            "/api/worker/cars/search",
            headers=self._auth_headers(self.worker_token),
            params={"q": "НЕСУЩЕСТВУЮЩИЙНОМЕР999"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), [])

    def test_worker_search_empty_query_returns_today_only(self) -> None:
        today_id = self._create_booking_direct(date=self._today_label())
        tomorrow = (datetime.now().astimezone() + timedelta(days=1)).strftime("%d.%m.%Y")
        future_id = self._create_booking_direct(date=tomorrow, plate="M002BB")

        response = self.client.get(
            "/api/worker/cars/search",
            headers=self._auth_headers(self.worker_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        ids = {item["id"] for item in response.json()}
        self.assertIn(today_id, ids)
        self.assertNotIn(future_id, ids)

    def test_worker_search_respects_date_param(self) -> None:
        tomorrow = (datetime.now().astimezone() + timedelta(days=1)).strftime("%d.%m.%Y")
        future_id = self._create_booking_direct(date=tomorrow, plate="M002BB")

        response = self.client.get(
            "/api/worker/cars/search",
            headers=self._auth_headers(self.worker_token),
            params={"q": "M002BB", "date": tomorrow},
        )
        self.assertEqual(response.status_code, 200, response.text)
        ids = {item["id"] for item in response.json()}
        self.assertIn(future_id, ids)

    def test_worker_search_excludes_cancelled(self) -> None:
        active_id = self._create_booking(worker_id="w2")
        cancel_response = self.client.patch(
            f"/api/bookings/{active_id}",
            headers=self._auth_headers(self.owner_token),
            json={"status": "cancelled"},
        )
        self.assertEqual(cancel_response.status_code, 200, cancel_response.text)
        fresh_id = self._create_booking(worker_id="w2", time="11:00")

        response = self.client.get(
            "/api/worker/cars/search",
            headers=self._auth_headers(self.worker_token),
            params={"q": "M001AA"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        ids = {item["id"] for item in response.json()}
        self.assertIn(fresh_id, ids)
        self.assertNotIn(active_id, ids)

    def test_worker_search_reports_workers_on_booking(self) -> None:
        self._create_booking(worker_id="w2")

        response = self.client.get(
            "/api/worker/cars/search",
            headers=self._auth_headers(self.worker_token),
            params={"q": "M001AA"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        item = response.json()[0]
        self.assertIn("workers", item)
        self.assertTrue(any(link["workerId"] == "w2" for link in item["workers"]))

    def test_worker_search_forbidden_for_owner(self) -> None:
        response = self.client.get(
            "/api/worker/cars/search",
            headers=self._auth_headers(self.owner_token),
            params={"q": "M001AA"},
        )
        self.assertEqual(response.status_code, 403, response.text)

    def test_worker_search_forbidden_without_auth(self) -> None:
        response = self.client.get("/api/worker/cars/search", params={"q": "M001AA"})
        self.assertEqual(response.status_code, 401, response.text)


if __name__ == "__main__":
    unittest.main()

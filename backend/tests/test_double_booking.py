"""Фаза 6b: двойные записи — staff может занять один бокс/время дважды.

_ensure_booking_has_no_conflicts проверяет лишь парсинг даты/времени,
пересечения не ищет: два POST с тем же боксом и слотом дают 200 + 200.
"""

from __future__ import annotations

import json
import os
import sys
import threading
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


class DoubleBookingTests(unittest.TestCase):
    ADMIN_TG_ID = "777121"

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
    def next_active_date() -> str:
        candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        for offset in range(1, 8):
            next_date = candidate + timedelta(days=offset)
            if next_date.weekday() != 6:
                return next_date.strftime("%d.%m.%Y")
        raise AssertionError("Unable to find active schedule day")

    def booking_payload(self, phone: str, worker_id: str, worker_name: str) -> dict:
        return {
            "clientId": "",
            "clientName": "Double Slot",
            "clientPhone": phone,
            "service": "Мойка базовая",
            "serviceId": "s1",
            "date": self.next_active_date(),
            "time": "10:00",
            "duration": 30,
            "price": 1200,
            "status": "scheduled",
            "workers": [{"workerId": worker_id, "workerName": worker_name, "percent": 20}],
            "box": "Бокс 1",
            "paymentType": "cash",
            "car": "Lada Vesta",
            "plate": "A123BC",
        }

    def test_sequential_double_booking_same_box_rejected(self) -> None:
        first = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json=self.booking_payload("+7 (999) 111-11-11", "w1", "Иван"),
        )
        self.assertEqual(first.status_code, 200, first.text)
        second = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json=self.booking_payload("+7 (999) 222-22-22", "w2", "Пётр"),
        )
        self.assertIn(
            second.status_code,
            (400, 409),
            f"двойная запись в один бокс/слот принята: {second.text}",
        )

    def test_concurrent_double_booking_same_box_single_winner(self) -> None:
        barrier = threading.Barrier(2)
        statuses: list[int] = []
        lock = threading.Lock()

        def worker(phone: str, worker_id: str, worker_name: str) -> None:
            barrier.wait(timeout=30)
            response = self.client.post(
                "/api/bookings",
                headers={"Authorization": self.admin_token},
                json=self.booking_payload(phone, worker_id, worker_name),
            )
            with lock:
                statuses.append(response.status_code)

        threads = [
            threading.Thread(target=worker, args=("+7 (999) 333-33-33", "w1", "Иван")),
            threading.Thread(target=worker, args=("+7 (999) 444-44-44", "w2", "Пётр")),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=120)
        self.assertEqual(len(statuses), 2)
        self.assertEqual(
            sorted(statuses),
            [200, 400 if 400 in statuses else 409],
            f"гонка слота: {statuses}",
        )


if __name__ == "__main__":
    unittest.main()

"""Волна 3: индексы производительности + offset истории.

- test_performance_indexes_exist: свежая БД содержит все 19 ix_-индексов
  (зеркало __table_args__ <-> add_performance_indexes).
- test_bookings_history_offset_pages: limit/offset пагинация детерминирована.
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


EXPECTED_INDEXES = {
    "clients": ["ix_clients_phone"],
    "staff_users": ["ix_staff_users_telegram_chat_id"],
    "bookings": [
        "ix_bookings_status_deleted",
        "ix_bookings_date",
        "ix_bookings_client_id",
        "ix_bookings_box_date_time",
    ],
    "booking_workers": ["ix_booking_workers_booking_id", "ix_booking_workers_worker_id"],
    "booking_additional_services": ["ix_bas_booking_id"],
    "booking_materials": ["ix_booking_materials_booking_id"],
    "additional_service_workers": ["ix_asvc_workers_service_id"],
    "notifications": ["ix_notifications_recipient"],
    "expenses": ["ix_expenses_date", "ix_expenses_booking_id"],
    "incomes": ["ix_incomes_date"],
    "piggy_bank_transactions": ["ix_piggy_booking_id", "ix_piggy_date"],
    "payroll_entries": ["ix_payroll_entries_worker_id"],
    "owner_profit_shares": ["ix_owner_shares_booking_id"],
}


class PerformanceIndexesTests(unittest.TestCase):
    ADMIN_TG_ID = "777101"
    OWNER_TG_ID = "777103"

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

    def test_performance_indexes_exist(self) -> None:
        from app.database import engine
        from sqlalchemy import inspect

        inspector = inspect(engine)
        missing: list[str] = []
        for table, names in EXPECTED_INDEXES.items():
            present = {idx["name"] for idx in inspector.get_indexes(table)}
            for name in names:
                if name not in present:
                    missing.append(f"{table}.{name}")
        self.assertEqual(missing, [], f"нет индексов: {missing}")

    def test_status_deleted_index_is_used(self) -> None:
        from app.database import engine
        from sqlalchemy import text

        with engine.connect() as connection:
            plan = " ".join(
                str(row) for row in connection.execute(
                    text(
                        "EXPLAIN QUERY PLAN SELECT id FROM bookings "
                        "WHERE status='completed' AND deleted_at IS NULL"
                    )
                ).all()
            )
        self.assertIn("ix_bookings_status_deleted", plan, plan)

    @staticmethod
    def next_active_date(offset_days: int = 1) -> str:
        candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        found = 0
        day = candidate
        while True:
            day = day + timedelta(days=1)
            if day.weekday() == 6:
                continue
            found += 1
            if found >= offset_days:
                return day.strftime("%d.%m.%Y")
        raise AssertionError("unreachable")

    def create_booking(self, day_offset: int, hour: int) -> dict:
        response = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json={
                "clientId": "",
                "clientName": "Paging Client",
                "clientPhone": "+7 (999) 999-00-11",
                "service": "Мойка базовая",
                "serviceId": "s1",
                "date": self.next_active_date(day_offset),
                "time": f"{hour:02d}:00",
                "duration": 30,
                "price": 1000,
                "status": "scheduled",
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 10}],
                "box": "Бокс 1",
                "paymentType": "cash",
                "car": "Lada Vesta",
                "plate": "A123BC",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def history(self, **params: object) -> list:
        query = urllib.parse.urlencode({k: v for k, v in params.items()})
        response = self.client.get(
            f"/api/owner/bookings-history?{query}" if query else "/api/owner/bookings-history",
            headers={"Authorization": self.owner_token},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_bookings_history_offset_pages(self) -> None:
        for position in range(1, 4):
            self.create_booking(position, 9 + position)
        page_all = self.history(limit=10)
        self.assertEqual(len(page_all), 3, page_all)
        page_one = self.history(limit=1, offset=0)
        page_two = self.history(limit=1, offset=1)
        page_three = self.history(limit=1, offset=2)
        self.assertEqual(len(page_one), 1)
        self.assertEqual(len(page_two), 1)
        self.assertEqual(len(page_three), 1)
        self.assertEqual(
            [page_one[0]["id"], page_two[0]["id"], page_three[0]["id"]],
            [item["id"] for item in page_all],
        )
        self.assertEqual(self.history(limit=1, offset=99), [])


if __name__ == "__main__":
    unittest.main()

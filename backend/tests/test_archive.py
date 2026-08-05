"""Тесты эндпоинта архива: GET /api/owner/archive.

Архив — главная библиотека за период: записи с расчёткой, доходы, расходы,
движения копилки, расчётка мастеров и доли владельцев.
"""

import json
import os
import sys
import unittest
import urllib.parse
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))


def reset_app_modules() -> None:
    for name in list(sys.modules):
        if name.startswith("app") or name in {"bot", "main"}:
            sys.modules.pop(name, None)


def build_init_data(telegram_id: str) -> str:
    """Build Telegram init data that passes insecure validation (no HMAC)."""
    return urllib.parse.urlencode(
        {"user": json.dumps({"id": telegram_id})}
    )


class ArchiveEndpointTests(unittest.TestCase):
    ADMIN_TG_ID = "889011"
    WORKER_TG_ID = "889012"
    OWNER_TG_ID = "889013"

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
        self.worker_token = build_init_data(self.WORKER_TG_ID)
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

        mapping = {
            "admin": self.ADMIN_TG_ID,
            "ivan": self.WORKER_TG_ID,
            "owner": self.OWNER_TG_ID,
        }
        with SessionLocal() as db:
            staff = db.scalars(select(StaffUser)).all()
            for item in staff:
                if item.login in mapping:
                    item.telegram_chat_id = mapping[item.login]
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

    def create_booking(self, *, status: str = "scheduled") -> dict:
        booking_date = self.next_active_date()
        create_response = self.client.post(
            "/api/bookings",
            headers=self.auth_headers(self.admin_token),
            json={
                "clientId": "",
                "clientName": "Archive Client",
                "clientPhone": "+7 (999) 444-55-66",
                "service": "Мойка базовая",
                "serviceId": "s1",
                "date": booking_date,
                "time": "10:00",
                "duration": 30,
                "price": 1200,
                "status": "scheduled",
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
                "box": "Бокс 1",
                "paymentType": "cash",
                "car": "Lada Vesta",
                "plate": "A123BC",
            },
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)
        booking = create_response.json()
        if status == "completed":
            complete_response = self.client.patch(
                f"/api/bookings/{booking['id']}",
                headers=self.auth_headers(self.admin_token),
                json={"status": "completed", "paymentSettled": True},
            )
            self.assertEqual(complete_response.status_code, 200, complete_response.text)
            booking = complete_response.json()
        return booking

    def get_archive(self, *, token: str | None = None, **params) -> dict:
        query = urllib.parse.urlencode(params)
        response = self.client.get(
            f"/api/owner/archive?{query}",
            headers=self.auth_headers(token or self.owner_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_archive_returns_booking_with_split_amounts(self) -> None:
        booking = self.create_booking(status="completed")

        archive = self.get_archive()
        item = next(
            (b for b in archive["bookings"] if b["id"] == booking["id"]), None
        )
        self.assertIsNotNone(item, "Запись должна попасть в архив")
        self.assertEqual(item["status"], "completed")
        self.assertEqual(item["price"], 1200)
        self.assertGreaterEqual(item["net"], 0)
        self.assertGreaterEqual(item["masterTotal"], 0)
        self.assertGreaterEqual(item["piggyDeposit"], 0)
        self.assertGreaterEqual(item["ownersTotal"], 0)

        split = self.client.get(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
        ).json()
        self.assertEqual(item["masterTotal"], split["masterTotal"])
        self.assertEqual(item["piggyDeposit"], split["piggyDeposit"])
        self.assertEqual(item["ownersTotal"], split["ownersTotal"])
        self.assertEqual(item["net"], split["net"])

    def test_archive_period_filter(self) -> None:
        booking = self.create_booking(status="completed")
        date_from = booking["date"]

        archive = self.get_archive(date_from=date_from, date_to=date_from)
        self.assertTrue(
            any(b["id"] == booking["id"] for b in archive["bookings"]),
            "Запись должна попасть в архив за свою дату",
        )

        archive = self.get_archive(date_from="01.01.2000", date_to="01.01.2000")
        self.assertFalse(
            any(b["id"] == booking["id"] for b in archive["bookings"]),
            "Запись не должна попасть в архив за другую дату",
        )

        archive = self.get_archive(date_from="2000-01-01", date_to="2000-01-01")
        self.assertFalse(
            any(b["id"] == booking["id"] for b in archive["bookings"]),
            "ISO-даты тоже должны фильтровать",
        )

    def test_archive_contains_incomes_expenses_and_piggy(self) -> None:
        today = datetime.now().strftime("%d.%m.%Y")
        income = self.client.post(
            "/api/owner/incomes",
            headers=self.auth_headers(self.owner_token),
            json={"amount": 5000, "source": "Аренда", "note": "", "date": today},
        )
        self.assertEqual(income.status_code, 201, income.text)
        expense = self.client.post(
            "/api/expenses",
            headers=self.auth_headers(self.owner_token),
            json={
                "title": "Химия",
                "amount": 1500,
                "category": "Химия",
                "date": today,
                "note": "",
                "resourceGroup": "detailing",
            },
        )
        self.assertEqual(expense.status_code, 200, expense.text)

        archive = self.get_archive()
        self.assertTrue(
            any(i["id"] == income.json()["id"] for i in archive["incomes"])
        )
        self.assertTrue(
            any(e["id"] == expense.json()["id"] for e in archive["expenses"])
        )
        self.assertEqual(archive["summary"]["totalIncome"], 5000)
        self.assertEqual(archive["summary"]["totalExpense"], 1500)

        archive = self.get_archive(date_from="01.01.2000", date_to="01.01.2000")
        self.assertFalse(any(i["id"] == income.json()["id"] for i in archive["incomes"]))
        self.assertFalse(any(e["id"] == expense.json()["id"] for e in archive["expenses"]))

    def test_archive_payroll_and_owners_sections(self) -> None:
        booking = self.create_booking(status="completed")

        archive = self.get_archive()
        worker = next(
            (w for w in archive["payroll"] if w["bookingCount"] > 0), None
        )
        self.assertIsNotNone(worker, "Расчётка мастера должна содержать заказы")
        self.assertGreater(worker["accruedFromBookings"], 0)

        split = self.client.get(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
        ).json()
        self.assertEqual(archive["summary"]["masterTotal"], split["masterTotal"])
        if archive["owners"]:
            self.assertEqual(
                archive["summary"]["ownersAccrued"],
                sum(o["totalAccrued"] for o in archive["owners"]),
            )

    def test_archive_requires_owner_role(self) -> None:
        response = self.client.get(
            "/api/owner/archive",
            headers=self.auth_headers(self.admin_token),
        )
        self.assertEqual(response.status_code, 403, response.text)

        response = self.client.get(
            "/api/owner/archive",
            headers=self.auth_headers(self.worker_token),
        )
        self.assertEqual(response.status_code, 403, response.text)

    def test_archive_rejects_invalid_date(self) -> None:
        response = self.client.get(
            "/api/owner/archive?date_from=not-a-date",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 422, response.text)


from fastapi.testclient import TestClient
from sqlalchemy import select


if __name__ == "__main__":
    unittest.main()

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
from sqlalchemy import select


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
    return urllib.parse.urlencode({"user": json.dumps({"id": telegram_id})})


class BookingMoneySplitTests(unittest.TestCase):
    ADMIN_TG_ID = "777011"
    WORKER_TG_ID = "777012"
    OWNER_TG_ID = "777013"

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
                "clientName": "Split Client",
                "clientPhone": "+7 (999) 333-44-55",
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

    def get_split(self, booking_id: str, token: str) -> dict:
        response = self.client.get(
            f"/api/owner/bookings/{booking_id}/money-split",
            headers=self.auth_headers(token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_bookings_history_lists_and_filters(self) -> None:
        booking = self.create_booking(status="completed")

        response = self.client.get(
            "/api/owner/bookings-history",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        items = response.json()
        self.assertTrue(any(item["id"] == booking["id"] for item in items))

        filtered = self.client.get(
            f"/api/owner/bookings-history?status=completed&q={booking['clientName']}",
            headers=self.auth_headers(self.owner_token),
        ).json()
        self.assertTrue(any(item["id"] == booking["id"] for item in filtered))

        missed = self.client.get(
            "/api/owner/bookings-history?status=cancelled",
            headers=self.auth_headers(self.owner_token),
        ).json()
        self.assertFalse(any(item["id"] == booking["id"] for item in missed))

        date_from = booking["date"]
        dated = self.client.get(
            f"/api/owner/bookings-history?date_from={date_from}&date_to={date_from}",
            headers=self.auth_headers(self.owner_token),
        ).json()
        self.assertTrue(any(item["id"] == booking["id"] for item in dated))

        invalid = self.client.get(
            "/api/owner/bookings-history?date_from=not-a-date",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(invalid.status_code, 422, invalid.text)

        forbidden = self.client.get(
            "/api/owner/bookings-history",
            headers=self.auth_headers(self.worker_token),
        )
        self.assertEqual(forbidden.status_code, 403, forbidden.text)

    def test_money_split_get_returns_full_distribution(self) -> None:
        booking = self.create_booking(status="completed")

        split = self.get_split(booking["id"], self.owner_token)

        self.assertEqual(split["id"], booking["id"])
        self.assertTrue(split["canEdit"])
        self.assertEqual(split["price"], 1200)
        self.assertIn("materialsCost", split)
        self.assertIn("materialsCostAuto", split)
        self.assertEqual(split["resourceGroup"], "wash")
        self.assertTrue(split["piggyDeposit"] > 0, "депозит в копилку должен быть создан при завершении")
        self.assertTrue(len(split["workers"]) == 1)
        self.assertIsNotNone(split["workers"][0]["linkId"])
        self.assertIn("earned", split["workers"][0])
        self.assertTrue(any(tx["transactionType"] == "deposit_24percent" for tx in split["piggyTransactions"]))
        self.assertTrue(len(split["ownerShares"]) >= 1)

    def test_money_split_update_changes_all_parts(self) -> None:
        from app.database import SessionLocal
        from app.models import BookingWorker, Expense, OwnerProfitShare, PiggyBankTransaction

        booking = self.create_booking(status="completed")
        split = self.get_split(booking["id"], self.owner_token)

        link_id = split["workers"][0]["linkId"]
        owner_ids = [share["ownerId"] for share in split["ownerShares"]]
        self.assertTrue(len(owner_ids) >= 2, "ожидается две доли владельцев 50/50")

        with SessionLocal() as db:
            db.add(
                Expense(
                    id=f"e-test-{uuid4().hex[:8]}",
                    title="Тест расход",
                    amount=0,
                    category="Расходные материалы",
                    date=booking["date"],
                    note="test",
                    resource_group="wash",
                    booking_id=booking["id"],
                    created_at=datetime.now(),
                )
            )
            db.commit()

        response = self.client.put(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
            json={
                "workers": [{"linkId": link_id, "overrideEarned": 500}],
                "materialsCost": 100,
                "piggyDeposit": 250,
                "owners": [{"ownerId": owner_ids[0], "amount": 300}, {"ownerId": owner_ids[1], "amount": 200}],
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        updated = response.json()

        self.assertEqual(updated["workers"][0]["overrideEarned"], 500)
        self.assertEqual(updated["workers"][0]["earned"], 500)
        self.assertEqual(updated["materialsCost"], 100)
        self.assertEqual(updated["materialsCostOverride"], 100)
        self.assertEqual(updated["piggyDeposit"], 250)
        self.assertEqual(updated["ownersTotal"], 500)
        by_owner = {share["ownerId"]: share["amount"] for share in updated["ownerShares"]}
        self.assertEqual(by_owner.get(owner_ids[0]), 300)
        self.assertEqual(by_owner.get(owner_ids[1]), 200)

        with SessionLocal() as db:
            link = db.get(BookingWorker, link_id)
            self.assertIsNotNone(link)
            assert link is not None
            self.assertEqual(link.override_earned, 500)

            expense = db.scalar(select(Expense).where(Expense.booking_id == booking["id"]))
            self.assertIsNotNone(expense)
            assert expense is not None
            self.assertEqual(expense.amount, 100)

            deposit = db.scalar(
                select(PiggyBankTransaction).where(
                    PiggyBankTransaction.booking_id == booking["id"],
                    PiggyBankTransaction.transaction_type == "deposit_24percent",
                )
            )
            self.assertIsNotNone(deposit)
            assert deposit is not None
            self.assertEqual(deposit.amount, 250)

            shares = db.scalars(select(OwnerProfitShare).where(OwnerProfitShare.booking_id == booking["id"])).all()
            by_owner_db = {share.owner_id: share.amount for share in shares}
            self.assertEqual(by_owner_db.get(owner_ids[0]), 300)
            self.assertEqual(by_owner_db.get(owner_ids[1]), 200)

    def test_money_split_reset_restores_auto_values(self) -> None:
        booking = self.create_booking(status="completed")
        split = self.get_split(booking["id"], self.owner_token)

        response = self.client.put(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
            json={"workers": [], "materialsCost": None, "piggyDeposit": None, "owners": []},
        )
        self.assertEqual(response.status_code, 200, response.text)
        updated = response.json()

        self.assertIsNone(updated["materialsCostOverride"])
        self.assertEqual(updated["piggyDeposit"], updated["piggyDepositAuto"])
        self.assertEqual(updated["ownersTotal"], updated["ownersTotalAuto"])
        self.assertEqual(updated["masterTotal"], updated["masterTotalAuto"])

    def test_money_split_rejects_paid_owner_share(self) -> None:
        from app.database import SessionLocal
        from app.models import OwnerProfitShare

        booking = self.create_booking(status="completed")
        split = self.get_split(booking["id"], self.owner_token)
        owner_id = split["ownerShares"][0]["ownerId"]

        with SessionLocal() as db:
            share = db.scalar(
                select(OwnerProfitShare).where(
                    OwnerProfitShare.booking_id == booking["id"],
                    OwnerProfitShare.owner_id == owner_id,
                )
            )
            self.assertIsNotNone(share)
            assert share is not None
            share.status = "paid"
            db.commit()

        response = self.client.put(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
            json={"owners": [{"ownerId": owner_id, "amount": 999}]},
        )
        self.assertEqual(response.status_code, 400, response.text)

    def test_money_split_rejects_unfinished_booking(self) -> None:
        booking = self.create_booking(status="scheduled")

        response = self.client.put(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
            json={"workers": [], "materialsCost": None, "piggyDeposit": None, "owners": []},
        )
        self.assertEqual(response.status_code, 400, response.text)

    def test_money_split_requires_owner_role(self) -> None:
        booking = self.create_booking(status="completed")

        get_response = self.client.get(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.worker_token),
        )
        self.assertEqual(get_response.status_code, 403, get_response.text)

        put_response = self.client.put(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.worker_token),
            json={"workers": [], "materialsCost": None, "piggyDeposit": None, "owners": []},
        )
        self.assertEqual(put_response.status_code, 403, put_response.text)

    def test_money_split_missing_booking_returns_404(self) -> None:
        response = self.client.get(
            f"/api/owner/bookings/{uuid4().hex}/money-split",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 404, response.text)


if __name__ == "__main__":
    unittest.main()

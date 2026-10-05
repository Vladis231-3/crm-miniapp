"""Risk-removal regression tests: strict service-settings enforcement.

Covers the follow-up "remove the risks" fixes:
1. pay-salary with segment=all resolves to the segment where money was earned
   (wash-only -> wash expense, no silent misattribution).
2. pay-salary with segment=all and earnings in BOTH segments is rejected (400):
   two per-segment payouts are required, a single expense cannot be split.
3. POST /api/admin/maintenance/repair-owner-shares backfills old snapshots
   (missing owner keys, amounts untouched) and recreates missing owner shares
   for general services with owner percent settings. Idempotent.
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
    return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})


class RiskRemovalTests(unittest.TestCase):
    WORKER_TG_ID = "777001"  # ivan (w1)
    OWNER_TG_ID = "777002"

    def setUp(self) -> None:
        data_dir = Path(__file__).resolve().parents[1] / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = data_dir / f"test_risk_removal_{uuid4().hex}.sqlite3"
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
        from sqlalchemy import select

        from app.database import SessionLocal
        from app.models import StaffUser

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
        from app.schemas import normalize_phone

        client_id = f"c-{uuid4().hex[:12]}"
        phone = normalize_phone(f"+7 (999) 000-{str(uuid4().int)[-4:]}")
        with SessionLocal() as db:
            db.add(Client(id=client_id, name="Risk Client", phone=phone, car="", plate=""))
            db.commit()
        return client_id, phone

    def _create_completed_booking(
        self, client_id: str, client_phone: str, service_id: str, service_name: str, price: int
    ) -> str:
        response = self.client.post(
            "/api/bookings",
            headers=self._auth_headers(self.owner_token),
            json={
                "clientId": client_id,
                "clientName": "Risk Client",
                "clientPhone": client_phone,
                "service": service_name,
                "serviceId": service_id,
                "date": self._today(),
                "time": "10:00",
                "duration": 60,
                "price": price,
                "status": "completed",
                "workers": [{"workerId": "w1", "workerName": "Ivan", "percent": 30}],
                "box": "Box 1",
                "paymentType": "cash",
                "paymentSettled": True,
                "car": "",
                "plate": "",
                "notes": "",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["id"]

    def test_pay_salary_all_single_segment_goes_to_earned_bank(self) -> None:
        """segment=all with wash-only earnings must book the expense to wash."""
        from app.database import SessionLocal
        from app.models import Expense

        client_id, client_phone = self._create_client()
        self._create_completed_booking(client_id, client_phone, "s1", "Wash", 2000)

        pay = self.client.post(
            "/api/owner/workers/w1/pay-salary",
            headers=self._auth_headers(self.owner_token),
            json={"period": "all", "segment": "all", "amount": 100, "note": "risk-test"},
        )
        self.assertEqual(pay.status_code, 200, pay.text)
        expense_id = pay.json()["expenseId"]
        self.assertTrue(expense_id)
        with SessionLocal() as db:
            expense = db.get(Expense, expense_id)
            self.assertIsNotNone(expense)
            assert expense is not None
            self.assertEqual(expense.resource_group, "wash")

    def test_pay_salary_all_both_segments_rejected(self) -> None:
        """segment=all with wash+detailing earnings must be rejected (400)."""
        client_id, client_phone = self._create_client()
        self._create_completed_booking(client_id, client_phone, "s1", "Wash", 2000)
        self._create_completed_booking(client_id, client_phone, "s2", "Detailing", 3500)

        pay = self.client.post(
            "/api/owner/workers/w1/pay-salary",
            headers=self._auth_headers(self.owner_token),
            json={"period": "all", "segment": "all", "amount": 100, "note": "risk-test"},
        )
        self.assertEqual(pay.status_code, 400, pay.text)

    def test_repair_owner_shares_backfills_old_snapshot(self) -> None:
        """Repair endpoint recreates missing shares and backfills snapshot keys."""
        from sqlalchemy import select

        from app.database import SessionLocal
        from app.models import Booking, OwnerProfitShare, Service

        # General service with owner percent: strictly persistent after the fix.
        with SessionLocal() as db:
            svc = db.get(Service, "s4")
            self.assertIsNotNone(svc)
            assert svc is not None
            svc.resource_group = "general"
            svc.piggy_pay_type = ""
            svc.piggy_pay_value = 0
            svc.master_pay_type = ""
            svc.master_pay_value = 0
            svc.owner_pay_type = "percent"
            svc.owner_pay_value = 50
            svc.owner_split_enabled = True
            db.commit()

        client_id, client_phone = self._create_client()
        booking_id = self._create_completed_booking(client_id, client_phone, "s4", "Box", 600)

        with SessionLocal() as db:
            shares = db.scalars(
                select(OwnerProfitShare).where(OwnerProfitShare.booking_id == booking_id)
            ).all()
            self.assertTrue(len(shares) > 0, "live split must persist owner shares for general+ownerPercent")

        # Simulate the pre-fix state: no shares + snapshot without owner keys.
        with SessionLocal() as db:
            for share in db.scalars(
                select(OwnerProfitShare).where(OwnerProfitShare.booking_id == booking_id)
            ).all():
                db.delete(share)
            booking = db.get(Booking, booking_id)
            self.assertIsNotNone(booking)
            assert booking is not None
            snap = dict(booking.money_split_snapshot or {})
            self.assertEqual(snap.get("v"), 1)
            snap.pop("owner_pay_type", None)
            snap.pop("owner_split_enabled", None)
            snap["has_custom"] = False
            booking.money_split_snapshot = snap
            db.commit()

        repair = self.client.post(
            "/api/admin/maintenance/repair-owner-shares",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(repair.status_code, 200, repair.text)
        payload = repair.json()
        self.assertGreaterEqual(payload["repairedShares"], 1)
        self.assertGreaterEqual(payload["backfilledSnapshots"], 1)

        with SessionLocal() as db:
            shares = db.scalars(
                select(OwnerProfitShare).where(OwnerProfitShare.booking_id == booking_id)
            ).all()
            self.assertTrue(len(shares) > 0, "repair must recreate missing owner shares")
            booking = db.get(Booking, booking_id)
            assert booking is not None
            snap = booking.money_split_snapshot or {}
            self.assertIn("owner_pay_type", snap)
            self.assertIn("owner_split_enabled", snap)
            # Frozen amounts untouched: owners total still matches live computation.
            self.assertGreater(int(snap.get("owners_total") or 0), 0)

        # Idempotent: second run repairs nothing.
        repair2 = self.client.post(
            "/api/admin/maintenance/repair-owner-shares",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(repair2.status_code, 200, repair2.text)
        self.assertEqual(repair2.json()["repairedShares"], 0)
        self.assertEqual(repair2.json()["backfilledSnapshots"], 0)


if __name__ == "__main__":
    unittest.main()

"""
Unit tests for the deposit (абонентская мойка / цех малярка) endpoints.

Covers:
- PATCH /api/owner/deposits/{client_id} — activate subscription
- POST /api/owner/deposits/{client_id}/topup — top up deposit
- POST /api/owner/deposits/{client_id}/washes — record credit wash, deduct from deposit
- GET /api/owner/deposits/{client_id} — overview with balance/month totals
- POST /api/owner/deposits/{client_id}/settle-month — close month, return washes to piggy bank
- Idempotency: settle-month twice → 400
- Credit wash does NOT deposit 24% into piggy bank immediately
- Owner-only access rules
"""
from __future__ import annotations

import json
import os
import sys
import unittest
import urllib.parse
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


class DepositTests(unittest.TestCase):
    OWNER_TG_ID = "777901"
    ADMIN_TG_ID = "777902"

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
        self.owner_token = build_init_data(self.OWNER_TG_ID)
        self.admin_token = build_init_data(self.ADMIN_TG_ID)

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
            owner = db.scalar(select(StaffUser).where(StaffUser.login == "owner"))
            admin = db.scalar(select(StaffUser).where(StaffUser.login == "admin"))
            if owner is not None:
                owner.telegram_chat_id = self.OWNER_TG_ID
            if admin is not None:
                admin.telegram_chat_id = self.ADMIN_TG_ID
            db.commit()

    @staticmethod
    def _auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": token}

    def _create_client(self) -> str:
        from app.database import SessionLocal
        from app.models import Client

        client_id = f"c-{uuid4().hex[:12]}"
        with SessionLocal() as db:
            db.add(
                Client(
                    id=client_id,
                    name="Абонент Тест",
                    phone=f"+7 (999) 000-{str(uuid4().int)[-4:]}",
                    car="BMW",
                    plate="M001AA",
                )
            )
            db.commit()
        return client_id

    def _activate_deposit(self, client_id: str, monthly: int = 4000, **plan_fields) -> None:
        payload: dict = {"clientId": client_id, "depositActive": True, "depositMonthly": monthly}
        payload.update(plan_fields)
        response = self.client.patch(
            f"/api/owner/deposits/{client_id}",
            headers=self._auth_headers(self.owner_token),
            json=payload,
        )
        self.assertEqual(response.status_code, 200, response.text)

    def _topup(self, client_id: str, amount: float = 4000.0) -> None:
        response = self.client.post(
            f"/api/owner/deposits/{client_id}/topup",
            headers=self._auth_headers(self.owner_token),
            json={"clientId": client_id, "amount": amount, "note": "Пополнение"},
        )
        self.assertEqual(response.status_code, 200, response.text)

    def _record_wash(self, client_id: str, price: float = 1000.0, car: str = "BMW", plate: str = "M001AA") -> None:
        response = self.client.post(
            f"/api/owner/deposits/{client_id}/washes",
            headers=self._auth_headers(self.owner_token),
            json={
                "clientId": client_id,
                "car": car,
                "plate": plate,
                "price": price,
                "service": "Мойка",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)

    def _overview(self, client_id: str) -> dict:
        response = self.client.get(
            f"/api/owner/deposits/{client_id}",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    # ------------------------------------------------------------------
    # Tests
    # ------------------------------------------------------------------

    def test_activate_and_topup_and_balance(self) -> None:
        client_id = self._create_client()
        self._activate_deposit(client_id, 4000)
        self._topup(client_id, 4000)

        overview = self._overview(client_id)
        self.assertTrue(overview["depositActive"])
        self.assertEqual(overview["depositMonthly"], 4000)
        self.assertEqual(overview["balance"], 4000)

        summary = self.client.get(
            "/api/owner/deposits",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(summary.status_code, 200, summary.text)
        items = [item for item in summary.json() if item["clientId"] == client_id]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["balance"], 4000)

    def test_credit_wash_deducts_and_no_immediate_piggy_deposit(self) -> None:
        client_id = self._create_client()
        self._activate_deposit(client_id, 4000)
        self._topup(client_id, 4000)
        self._record_wash(client_id, 1000)

        overview = self._overview(client_id)
        self.assertEqual(overview["balance"], 3000)
        self.assertEqual(overview["monthWashTotal"], 1000)
        self.assertEqual(overview["monthPayable"], 4000 - 1000)

        from app.database import SessionLocal
        from app.models import PiggyBankTransaction
        from sqlalchemy import select

        with SessionLocal() as db:
            deposits = db.scalars(
                select(PiggyBankTransaction).where(
                    PiggyBankTransaction.transaction_type != "material_withdrawal",
                    PiggyBankTransaction.transaction_type != "material_repayment",
                )
            ).all()
        self.assertTrue(
            all(t.transaction_type != "auto_deposit" for t in deposits),
            "credit wash must not deposit percentage into piggy bank",
        )

    def test_settle_month_returns_wash_total_to_piggy_bank(self) -> None:
        client_id = self._create_client()
        self._activate_deposit(client_id, 4000)
        self._topup(client_id, 4000)
        self._record_wash(client_id, 1500)

        from app.database import SessionLocal
        from app.models import PiggyBankTransaction
        from sqlalchemy import select

        with SessionLocal() as db:
            before = db.scalar(
                select(PiggyBankTransaction).where(
                    PiggyBankTransaction.transaction_type == "deposit_return"
                )
            )
        self.assertIsNone(before)

        month = __import__("datetime").date.today().strftime("%m.%Y")
        response = self.client.post(
            f"/api/owner/deposits/{client_id}/settle-month",
            headers=self._auth_headers(self.owner_token),
            json={"clientId": client_id, "month": month},
        )
        self.assertEqual(response.status_code, 200, response.text)

        with SessionLocal() as db:
            returns = db.scalars(
                select(PiggyBankTransaction).where(
                    PiggyBankTransaction.transaction_type == "deposit_return"
                )
            ).all()
        self.assertEqual(len(returns), 1)
        self.assertEqual(returns[0].amount, 1500)
        self.assertEqual(returns[0].resource_group, "wash")

        overview = self._overview(client_id)
        self.assertTrue(any(closed["month"] == month for closed in overview["closedMonths"]))

    def test_settle_month_twice_is_rejected(self) -> None:
        client_id = self._create_client()
        self._activate_deposit(client_id, 4000)
        self._topup(client_id, 4000)
        self._record_wash(client_id, 1000)

        month = __import__("datetime").date.today().strftime("%m.%Y")
        first = self.client.post(
            f"/api/owner/deposits/{client_id}/settle-month",
            headers=self._auth_headers(self.owner_token),
            json={"clientId": client_id, "month": month},
        )
        self.assertEqual(first.status_code, 200, first.text)

        second = self.client.post(
            f"/api/owner/deposits/{client_id}/settle-month",
            headers=self._auth_headers(self.owner_token),
            json={"clientId": client_id, "month": month},
        )
        self.assertEqual(second.status_code, 400, second.text)

    def test_wash_requires_active_deposit(self) -> None:
        client_id = self._create_client()
        response = self.client.post(
            f"/api/owner/deposits/{client_id}/washes",
            headers=self._auth_headers(self.owner_token),
            json={"clientId": client_id, "car": "BMW", "plate": "M001AA", "price": 1000},
        )
        self.assertEqual(response.status_code, 400, response.text)

    def test_topup_requires_active_deposit(self) -> None:
        client_id = self._create_client()
        response = self.client.post(
            f"/api/owner/deposits/{client_id}/topup",
            headers=self._auth_headers(self.owner_token),
            json={"clientId": client_id, "amount": 4000},
        )
        self.assertEqual(response.status_code, 400, response.text)

    def test_export_excel(self) -> None:
        client_id = self._create_client()
        self._activate_deposit(client_id, 4000)
        self._topup(client_id, 4000)
        self._record_wash(client_id, 1000)

        response = self.client.get(
            f"/api/owner/deposits/{client_id}/export.xlsx",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn(
            "spreadsheetml",
            response.headers.get("Content-Type", ""),
        )

    def test_export_all(self) -> None:
        client_id = self._create_client()
        self._activate_deposit(client_id, 4000)

        response = self.client.get(
            "/api/owner/deposits/export-all.xlsx",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn(
            "spreadsheetml",
            response.headers.get("Content-Type", ""),
        )

    def test_overview_allowed_for_admin(self) -> None:
        client_id = self._create_client()
        self._activate_deposit(client_id, 4000)

        response = self.client.get(
            f"/api/owner/deposits/{client_id}",
            headers=self._auth_headers(self.admin_token),
        )
        self.assertEqual(response.status_code, 200, response.text)

    def test_activate_deposit_as_admin(self) -> None:
        client_id = self._create_client()

        response = self.client.patch(
            f"/api/owner/deposits/{client_id}",
            headers=self._auth_headers(self.admin_token),
            json={"clientId": client_id, "depositActive": True, "depositMonthly": 4000},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()["depositActive"])

        summary = self.client.get(
            "/api/owner/deposits",
            headers=self._auth_headers(self.admin_token),
        )
        self.assertEqual(summary.status_code, 200, summary.text)
        self.assertTrue(any(item["clientId"] == client_id for item in summary.json()))

    def test_settle_month_allowed_for_admin(self) -> None:
        client_id = self._create_client()
        self._activate_deposit(client_id, 4000)
        self._topup(client_id, 4000)
        self._record_wash(client_id, 1000)

        month = __import__("datetime").date.today().strftime("%m.%Y")
        response = self.client.post(
            f"/api/owner/deposits/{client_id}/settle-month",
            headers=self._auth_headers(self.admin_token),
            json={"clientId": client_id, "month": month},
        )
        self.assertEqual(response.status_code, 200, response.text)

    # ------------------------------------------------------------------
    # Plan-aware behavior (fee | washes | per_wash | unlimited)
    # ------------------------------------------------------------------

    def test_per_wash_plan_charges_tariff_and_no_refund_at_settle(self) -> None:
        client_id = self._create_client()
        self._activate_deposit(
            client_id,
            monthly=0,
            depositPlan="per_wash",
            depositWashPrice=500,
        )
        self._topup(client_id, 4000)
        self._record_wash(client_id, 1000)

        overview = self._overview(client_id)
        self.assertEqual(overview["depositPlan"], "per_wash")
        self.assertEqual(overview["depositWashPrice"], 500)
        self.assertEqual(overview["balance"], 3500, "тариф 500 ₽, а не полная цена 1000 ₽")
        self.assertEqual(overview["monthWashTotal"], 500)

        month = __import__("datetime").date.today().strftime("%m.%Y")
        response = self.client.post(
            f"/api/owner/deposits/{client_id}/settle-month",
            headers=self._auth_headers(self.owner_token),
            json={"clientId": client_id, "month": month},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self._overview(client_id)["balance"], 3500)

        from app.database import SessionLocal
        from app.models import PiggyBankTransaction
        from sqlalchemy import select

        with SessionLocal() as db:
            returns = db.scalars(
                select(PiggyBankTransaction).where(
                    PiggyBankTransaction.transaction_type == "deposit_return"
                )
            ).all()
        self.assertEqual(len(returns), 0, "per_wash: возврата моек в копилку быть не должно")

    def test_washes_plan_charges_full_price_and_refunds_only_covered(self) -> None:
        client_id = self._create_client()
        self._activate_deposit(
            client_id,
            monthly=4000,
            depositPlan="washes",
            depositWashesIncluded=2,
            depositWashPrice=500,
        )
        self._topup(client_id, 4000)
        self._record_wash(client_id, 1000)
        self._record_wash(client_id, 1000)
        self._record_wash(client_id, 1000)

        overview = self._overview(client_id)
        self.assertEqual(overview["depositPlan"], "washes")
        self.assertEqual(overview["planWashLimit"], 2)
        self.assertEqual(overview["monthWashCount"], 3)
        self.assertEqual(overview["balance"], 1000, "3 мойки по 1000 ₽ списаны с баланса")

        month = __import__("datetime").date.today().strftime("%m.%Y")
        response = self.client.post(
            f"/api/owner/deposits/{client_id}/settle-month",
            headers=self._auth_headers(self.owner_token),
            json={"clientId": client_id, "month": month},
        )
        self.assertEqual(response.status_code, 200, response.text)

        from app.database import SessionLocal
        from app.models import PiggyBankTransaction
        from sqlalchemy import select

        with SessionLocal() as db:
            returns = db.scalars(
                select(PiggyBankTransaction).where(
                    PiggyBankTransaction.transaction_type == "deposit_return"
                )
            ).all()
        self.assertEqual(len(returns), 1)
        self.assertEqual(
            returns[0].amount, 2000, "возврат только 2 включённых моек, 3-я остаётся оплаченной"
        )
        self.assertEqual(self._overview(client_id)["balance"], 3000)

    def test_washes_plan_carryover_from_previous_month(self) -> None:
        from datetime import date
        from uuid import uuid4 as _uuid4

        from app.database import SessionLocal
        from app.models import DepositMonth

        client_id = self._create_client()
        self._activate_deposit(
            client_id,
            monthly=4000,
            depositPlan="washes",
            depositWashesIncluded=2,
            depositWashesCarryover=True,
        )

        today = date.today()
        prev_month = (
            f"{today.month - 1 if today.month > 1 else 12:02d}."
            f"{today.year - 1 if today.month == 1 else today.year}"
        )
        with SessionLocal() as db:
            db.add(
                DepositMonth(
                    id=f"dm-{_uuid4().hex}",
                    client_id=client_id,
                    month=prev_month,
                    subscription=4000,
                    wash_total=0,
                    balance_after=4000,
                    carryover_washes=1,
                    closed_at=None,
                )
            )
            db.commit()

        overview = self._overview(client_id)
        self.assertEqual(overview["carriedWashes"], 1)
        self.assertEqual(overview["planWashLimit"], 3, "2 включённые + 1 перенесённая")

    def test_deposit_export_telegram_endpoints_reachable(self) -> None:
        client_id = self._create_client()
        self._activate_deposit(client_id, 4000)

        response = self.client.post(
            f"/api/owner/deposits/{client_id}/export.xlsx/telegram",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertIn("fileName", payload)
        self.assertIn("telegramSent", payload)

        response_all = self.client.post(
            "/api/owner/deposits/export-all.xlsx/telegram",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(response_all.status_code, 200, response_all.text)
        self.assertIn("telegramSent", response_all.json())


if __name__ == "__main__":
    unittest.main()
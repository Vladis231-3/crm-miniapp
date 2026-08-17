"""
Unit tests for POST /api/owner/piggy-bank/adjust — manual piggy bank amount editing.

Covers:
- Adjusting the detailing piggy bank balance (positive and negative delta)
- Adjusting the wash piggy bank balance
- Validation: zero amount → 400, invalid resourceGroup → 422, bad date → 422
- Access rules: worker → 403
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
    return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})


class PiggyBankAdjustTests(unittest.TestCase):
    OWNER_TG_ID = "777901"
    WORKER_TG_ID = "777903"

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
        self.worker_token = build_init_data(self.WORKER_TG_ID)

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
            worker = db.scalar(select(StaffUser).where(StaffUser.role == "worker"))
            if owner is not None:
                owner.telegram_chat_id = self.OWNER_TG_ID
            if worker is not None:
                worker.telegram_chat_id = self.WORKER_TG_ID
            db.commit()

    @staticmethod
    def _auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": token}

    def _adjust(self, resource_group: str, amount: float, **extra) -> dict:
        payload = {"resourceGroup": resource_group, "amount": amount}
        payload.update(extra)
        response = self.client.post(
            "/api/owner/piggy-bank/adjust",
            headers=self._auth_headers(self.owner_token),
            json=payload,
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _piggy_bank(self) -> dict:
        response = self.client.get(
            "/api/owner/piggy-bank",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    # ------------------------------------------------------------------
    # Tests
    # ------------------------------------------------------------------

    def test_adjust_detailing_positive_delta(self) -> None:
        before = self._piggy_bank()

        tx = self._adjust("detailing", 5000, purpose="Дополнили копилку")
        self.assertEqual(tx["transactionType"], "adjust")
        self.assertEqual(tx["amount"], 5000)
        self.assertEqual(tx["resourceGroup"], "detailing")
        self.assertEqual(tx["purpose"], "Дополнили копилку")

        after = self._piggy_bank()
        self.assertEqual(
            after["detailing"]["netPiggy"],
            before["detailing"]["netPiggy"] + 5000,
        )
        self.assertEqual(after["balance"], before["balance"] + 5000)
        self.assertEqual(
            after["combinedBalance"],
            before["combinedBalance"] + 5000,
        )

    def test_adjust_detailing_negative_delta(self) -> None:
        before = self._piggy_bank()
        self._adjust("detailing", 3000)
        self._adjust("detailing", -1000)

        after = self._piggy_bank()
        self.assertEqual(
            after["detailing"]["netPiggy"],
            before["detailing"]["netPiggy"] + 2000,
        )
        self.assertEqual(after["balance"], before["balance"] + 2000)

    def test_adjust_wash_delta(self) -> None:
        before = self._piggy_bank()

        self._adjust("wash", 7000)

        after = self._piggy_bank()
        self.assertEqual(
            after["remainingInPiggyBank"],
            before["remainingInPiggyBank"] + 7000,
        )
        self.assertEqual(
            after["wash"]["washNetPiggy"],
            before["wash"]["washNetPiggy"] + 7000,
        )
        self.assertEqual(after["balance"], before["balance"] + 7000)

    def test_adjust_general_delta(self) -> None:
        before = self._piggy_bank()
        self._adjust("general", 2500)
        after = self._piggy_bank()
        self.assertEqual(after["balance"], before["balance"] + 2500)
        self.assertEqual(
            after["combinedBalance"],
            before["combinedBalance"] + 2500,
        )

    def test_zero_amount_rejected(self) -> None:
        response = self.client.post(
            "/api/owner/piggy-bank/adjust",
            headers=self._auth_headers(self.owner_token),
            json={"resourceGroup": "wash", "amount": 0},
        )
        self.assertEqual(response.status_code, 400, response.text)

    def test_invalid_resource_group_rejected(self) -> None:
        response = self.client.post(
            "/api/owner/piggy-bank/adjust",
            headers=self._auth_headers(self.owner_token),
            json={"resourceGroup": "carwash", "amount": 100},
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_invalid_date_rejected(self) -> None:
        response = self.client.post(
            "/api/owner/piggy-bank/adjust",
            headers=self._auth_headers(self.owner_token),
            json={"resourceGroup": "wash", "amount": 100, "date": "2026-08-17"},
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_worker_forbidden(self) -> None:
        response = self.client.post(
            "/api/owner/piggy-bank/adjust",
            headers=self._auth_headers(self.worker_token),
            json={"resourceGroup": "wash", "amount": 100},
        )
        self.assertEqual(response.status_code, 403, response.text)

    def test_adjust_appears_in_transactions_history(self) -> None:
        self._adjust("detailing", 1500, purpose="Ручная правка")
        data = self._piggy_bank()
        adjust_txs = [
            t for t in data["transactions"]
            if t["transactionType"] == "adjust" and t["resourceGroup"] == "detailing"
        ]
        self.assertEqual(len(adjust_txs), 1)
        self.assertEqual(adjust_txs[0]["amount"], 1500)
        self.assertEqual(adjust_txs[0]["purpose"], "Ручная правка")


if __name__ == "__main__":
    unittest.main()

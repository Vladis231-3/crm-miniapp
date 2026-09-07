"""
Regression: double-click on piggy withdraw/adjust must not create duplicates
(clientRequestId idempotency), and adjust/withdraw can be deleted with real
balance restore (DELETE /api/owner/piggy-bank/transactions/{id}).
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
    return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})


class PiggyIdempotencyDeleteTests(unittest.TestCase):
    OWNER_TG_ID = "777961"
    WORKER_TG_ID = "777963"

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

    def _piggy_bank(self) -> dict:
        r = self.client.get("/api/owner/piggy-bank", headers=self._auth_headers(self.owner_token))
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()

    def test_adjust_idempotent_same_key(self) -> None:
        before = self._piggy_bank()
        key = f"adj-{uuid4().hex}"
        p1 = self.client.post(
            "/api/owner/piggy-bank/adjust",
            headers=self._auth_headers(self.owner_token),
            json={"resourceGroup": "detailing", "amount": 5000, "purpose": "double-click", "clientRequestId": key},
        )
        self.assertEqual(p1.status_code, 200, p1.text)
        p2 = self.client.post(
            "/api/owner/piggy-bank/adjust",
            headers=self._auth_headers(self.owner_token),
            json={"resourceGroup": "detailing", "amount": 5000, "purpose": "double-click", "clientRequestId": key},
        )
        self.assertEqual(p2.status_code, 200, p2.text)
        self.assertEqual(p1.json()["id"], p2.json()["id"])
        after = self._piggy_bank()
        self.assertEqual(after["balance"], before["balance"] + 5000)

    def test_withdraw_idempotent_same_key(self) -> None:
        before = self._piggy_bank()
        key = f"wd-{uuid4().hex}"
        body = {
            "resourceGroup": "detailing",
            "materialName": "Test material",
            "materialCost": 1000,
            "purpose": "double-click",
            "date": "07.09.2026",
            "clientRequestId": key,
        }
        r1 = self.client.post("/api/owner/piggy-bank/withdraw", headers=self._auth_headers(self.owner_token), json=body)
        self.assertEqual(r1.status_code, 200, r1.text)
        r2 = self.client.post("/api/owner/piggy-bank/withdraw", headers=self._auth_headers(self.owner_token), json=body)
        self.assertEqual(r2.status_code, 200, r2.text)
        self.assertEqual(r1.json()["id"], r2.json()["id"])
        after = self._piggy_bank()
        self.assertEqual(after["balance"], before["balance"] - 1000)

    def test_delete_adjust_restores_balance(self) -> None:
        before = self._piggy_bank()
        r = self.client.post(
            "/api/owner/piggy-bank/adjust",
            headers=self._auth_headers(self.owner_token),
            json={"resourceGroup": "wash", "amount": 3000, "purpose": "to-delete"},
        )
        self.assertEqual(r.status_code, 200, r.text)
        tx_id = r.json()["id"]
        mid = self._piggy_bank()
        self.assertEqual(mid["balance"], before["balance"] + 3000)
        d = self.client.delete(
            f"/api/owner/piggy-bank/transactions/{tx_id}",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(d.status_code, 200, d.text)
        after = self._piggy_bank()
        self.assertEqual(after["balance"], before["balance"])
        self.assertFalse(any(t["id"] == tx_id for t in after["transactions"]))

    def test_delete_withdraw_removes_expense_mirror(self) -> None:
        before = self._piggy_bank()
        r = self.client.post(
            "/api/owner/piggy-bank/withdraw",
            headers=self._auth_headers(self.owner_token),
            json={
                "resourceGroup": "wash",
                "materialName": "To delete",
                "materialCost": 1500,
                "purpose": "to-delete",
                "date": "07.09.2026",
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        tx_id = r.json()["id"]
        d = self.client.delete(
            f"/api/owner/piggy-bank/transactions/{tx_id}",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(d.status_code, 200, d.text)
        after = self._piggy_bank()
        self.assertEqual(after["balance"], before["balance"])

    def test_delete_system_deposit_forbidden(self) -> None:
        data = self._piggy_bank()
        system_tx = next((t for t in data["transactions"] if t["transactionType"] == "deposit_24percent"), None)
        if system_tx is None:
            self.skipTest("no system deposit in seed data")
        d = self.client.delete(
            f"/api/owner/piggy-bank/transactions/{system_tx['id']}",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(d.status_code, 400, d.text)


if __name__ == "__main__":
    unittest.main()

"""
Unit tests for POST /api/owner/piggy-bank/deposit — ручное внесение в копилку.

Кнопка «Внести в копилку» у владельца: деньги вносятся в копилку мойки или
детейлинга отдельной операцией (не корректировкой), с примечанием и датой.

Покрываем:
- детейлинг: баланс/netPiggy/combinedBalance растут, тип операции manual_deposit;
- мойка: растёт remainingInPiggyBank;
- примечание и дата сохраняются, пустое примечание получает дефолт;
- идемпотентность по clientRequestId (дабл-клик не задваивает);
- валидация: нулевая/отрицательная сумма, general, битая дата → 422;
- операция видна в истории и её можно удалить, баланс возвращается;
- воркеру нельзя (403).
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


class PiggyBankDepositTests(unittest.TestCase):
    OWNER_TG_ID = "777911"
    WORKER_TG_ID = "777913"

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
        from sqlalchemy import select

        from app.database import SessionLocal
        from app.models import StaffUser

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

    def _deposit(self, resource_group: str, amount: float, **extra) -> dict:
        payload = {"resourceGroup": resource_group, "amount": amount}
        payload.update(extra)
        response = self.client.post(
            "/api/owner/piggy-bank/deposit",
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

    def test_deposit_detailing_raises_balance(self) -> None:
        before = self._piggy_bank()

        tx = self._deposit(
            "detailing", 5000, purpose="Доложили наличные", date="18.11.2026"
        )
        self.assertEqual(tx["transactionType"], "manual_deposit")
        self.assertEqual(tx["amount"], 5000)
        self.assertEqual(tx["resourceGroup"], "detailing")
        self.assertEqual(tx["purpose"], "Доложили наличные")
        self.assertEqual(tx["date"], "18.11.2026")

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

    def test_deposit_wash_raises_balance(self) -> None:
        before = self._piggy_bank()

        self._deposit("wash", 7000)

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

    def test_deposit_wash_does_not_change_detailing(self) -> None:
        before = self._piggy_bank()

        self._deposit("wash", 1200)

        after = self._piggy_bank()
        self.assertEqual(
            after["detailing"]["netPiggy"],
            before["detailing"]["netPiggy"],
        )

    def test_deposit_default_purpose_and_date(self) -> None:
        tx = self._deposit("detailing", 1000)
        self.assertEqual(tx["purpose"], "Внесение в копилку")
        self.assertRegex(tx["date"], r"^\d{2}\.\d{2}\.\d{4}$")

    def test_deposit_idempotent_by_client_request_id(self) -> None:
        before = self._piggy_bank()
        key = "dep-test-key-1"

        first = self._deposit("detailing", 2500, clientRequestId=key)
        second = self._deposit("detailing", 2500, clientRequestId=key)

        self.assertEqual(first["id"], second["id"])
        after = self._piggy_bank()
        self.assertEqual(after["balance"], before["balance"] + 2500)
        self.assertEqual(
            len(
                [
                    t
                    for t in after["transactions"]
                    if t["transactionType"] == "manual_deposit"
                ]
            ),
            1,
        )

    def test_deposit_appears_in_history(self) -> None:
        self._deposit("detailing", 1500, purpose="Внесли из кассы", date="17.11.2026")
        data = self._piggy_bank()
        deposit_txs = [
            t for t in data["transactions"] if t["transactionType"] == "manual_deposit"
        ]
        self.assertEqual(len(deposit_txs), 1)
        self.assertEqual(deposit_txs[0]["amount"], 1500)
        self.assertEqual(deposit_txs[0]["purpose"], "Внесли из кассы")
        self.assertEqual(deposit_txs[0]["date"], "17.11.2026")

    def test_deposit_can_be_deleted_and_balance_restored(self) -> None:
        before = self._piggy_bank()
        tx = self._deposit("detailing", 3000)

        response = self.client.delete(
            f"/api/owner/piggy-bank/transactions/{tx['id']}",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 200, response.text)

        after = self._piggy_bank()
        self.assertEqual(after["balance"], before["balance"])
        self.assertEqual(
            after["detailing"]["netPiggy"],
            before["detailing"]["netPiggy"],
        )

    def test_zero_amount_rejected(self) -> None:
        response = self.client.post(
            "/api/owner/piggy-bank/deposit",
            headers=self._auth_headers(self.owner_token),
            json={"resourceGroup": "wash", "amount": 0},
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_negative_amount_rejected(self) -> None:
        response = self.client.post(
            "/api/owner/piggy-bank/deposit",
            headers=self._auth_headers(self.owner_token),
            json={"resourceGroup": "wash", "amount": -500},
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_general_resource_group_rejected(self) -> None:
        response = self.client.post(
            "/api/owner/piggy-bank/deposit",
            headers=self._auth_headers(self.owner_token),
            json={"resourceGroup": "general", "amount": 100},
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_invalid_date_rejected(self) -> None:
        response = self.client.post(
            "/api/owner/piggy-bank/deposit",
            headers=self._auth_headers(self.owner_token),
            json={"resourceGroup": "wash", "amount": 100, "date": "2026-08-17"},
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_worker_forbidden(self) -> None:
        response = self.client.post(
            "/api/owner/piggy-bank/deposit",
            headers=self._auth_headers(self.worker_token),
            json={"resourceGroup": "wash", "amount": 100},
        )
        self.assertEqual(response.status_code, 403, response.text)

    def test_deposit_is_not_a_reconciliation_adjustment(self) -> None:
        """Внесение не должно считаться корректировкой-сверкой с кассой."""
        self._deposit("wash", 4000)
        adjust_txs = [
            t for t in self._piggy_bank()["transactions"] if t["transactionType"] == "adjust"
        ]
        self.assertEqual(adjust_txs, [])


if __name__ == "__main__":
    unittest.main()
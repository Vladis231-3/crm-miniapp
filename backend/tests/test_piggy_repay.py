"""
Unit tests for POST /api/owner/piggy-bank/repay — возврат долга копилки человеку.

Покрывает баг: кнопка «Погасить» начисляла bonus (рост «К выплате»), но не
создавала piggy-транзакцию и не уменьшала долг/баланс — деньги «выдавались»,
но внешне никуда не уходили.

Проверяет:
- withdraw (piggy, spentBy=owner) создаёт долг в spenderDebts;
- repay создаёт debt_repayment (− из копилки) + Expense + payout (выплата наружу);
- долг уменьшается, combinedBalance уменьшается (деньги ушли внешне);
- повтор с тем же clientRequestId идемпотентен (без дубля);
- переплата (больше долга) → 400.
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


class PiggyBankRepayTests(unittest.TestCase):
    OWNER_TG_ID = "777951"
    WORKER_TG_ID = "777953"

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
                # В проде владелец из скриншота работает как мастер
                # (есть выручка/начисления за работу) — даём extra_roles.
                try:
                    owner.extra_roles = ["worker"]
                except Exception:
                    pass
            if worker is not None:
                worker.telegram_chat_id = self.WORKER_TG_ID
            db.commit()
            self.owner_id = owner.id if owner is not None else ""

    @staticmethod
    def _auth(token: str) -> dict[str, str]:
        return {"Authorization": token}

    def test_repay_reduces_debt_and_balance_with_payout(self) -> None:
        from app.database import SessionLocal
        from app.models import PayrollEntry
        from sqlalchemy import select

        # 1. Списание из копилки (долг 5000 на владельца, detailing)
        r = self.client.post(
            "/api/owner/piggy-bank/withdraw",
            headers=self._auth(self.owner_token),
            json={
                "resourceGroup": "detailing",
                "materialName": "Товар на свои",
                "materialCost": 5000,
                "purpose": "Купил на свои",
                "date": "10.09.2026",
                "source": "piggy",
                "spentById": self.owner_id,
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        before = self.client.get("/api/owner/piggy-bank", headers=self._auth(self.owner_token))
        self.assertEqual(before.status_code, 200, before.text)
        debts = [d for d in before.json().get("spenderDebts", []) if d.get("spentById") == self.owner_id]
        self.assertTrue(debts, "долг не появился после списания")
        self.assertEqual(int(debts[0]["totalSpent"]), 5000)
        combined_before = before.json()["combinedBalance"]

        # 2. Возврат 2000 — деньги уходят внешне (payout + debt_repayment)
        key = f"repay-{uuid4().hex}"
        r2 = self.client.post(
            "/api/owner/piggy-bank/repay",
            headers=self._auth(self.owner_token),
            json={"workerId": self.owner_id, "amount": 2000, "clientRequestId": key},
        )
        self.assertEqual(r2.status_code, 200, r2.text)
        body = r2.json()
        self.assertEqual(body["transactionType"], "debt_repayment")
        self.assertEqual(body["amount"], -2000)
        self.assertIsNotNone(body.get("payrollEntryId"), "выплата в ЗП не создана")

        after = self.client.get("/api/owner/piggy-bank", headers=self._auth(self.owner_token))
        debts2 = [d for d in after.json().get("spenderDebts", []) if d.get("spentById") == self.owner_id]
        self.assertTrue(debts2, "долг пропал полностью вместо уменьшения")
        self.assertEqual(int(debts2[0]["totalSpent"]), 3000, "долг не уменьшился на 2000")
        self.assertEqual(after.json()["combinedBalance"], combined_before - 2000, "баланс копилки не уменьшился — деньги не ушли внешне")

        with SessionLocal() as db:
            pay = db.get(PayrollEntry, body["payrollEntryId"])
            self.assertIsNotNone(pay)
            assert pay is not None
            self.assertEqual(pay.kind, "payout", "возврат должен быть выплатой (payout), а не начислением (bonus)")
            self.assertEqual(float(pay.amount), 2000)

        # 3. Идемпотентность: повтор с тем же ключом — без дубля
        r3 = self.client.post(
            "/api/owner/piggy-bank/repay",
            headers=self._auth(self.owner_token),
            json={"workerId": self.owner_id, "amount": 2000, "clientRequestId": key},
        )
        self.assertEqual(r3.status_code, 200, r3.text)
        self.assertEqual(r3.json()["id"], body["id"], "повтор создал дубликат")
        after2 = self.client.get("/api/owner/piggy-bank", headers=self._auth(self.owner_token))
        debts3 = [d for d in after2.json().get("spenderDebts", []) if d.get("spentById") == self.owner_id]
        self.assertEqual(int(debts3[0]["totalSpent"]), 3000, "повтор уменьшил долг дважды")

    def test_repay_over_debt_rejected(self) -> None:
        r = self.client.post(
            "/api/owner/piggy-bank/withdraw",
            headers=self._auth(self.owner_token),
            json={
                "resourceGroup": "wash",
                "materialName": "Мелочь",
                "materialCost": 1000,
                "date": "11.09.2026",
                "source": "piggy",
                "spentById": self.owner_id,
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        r2 = self.client.post(
            "/api/owner/piggy-bank/repay",
            headers=self._auth(self.owner_token),
            json={"workerId": self.owner_id, "amount": 999999, "clientRequestId": f"over-{uuid4().hex}"},
        )
        self.assertEqual(r2.status_code, 400, r2.text)


if __name__ == "__main__":
    unittest.main()

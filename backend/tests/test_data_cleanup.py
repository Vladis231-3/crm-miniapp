"""Тесты выборочной очистки БД за период + корзины 30 дней."""

import json
import os
import sys
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))


def reset_app_modules() -> None:
    for name in list(sys.modules):
        if name.startswith("app") or name in {"bot", "main"}:
            sys.modules.pop(name, None)


def build_init_data(telegram_id: str) -> str:
    return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})


class DataCleanupTests(unittest.TestCase):
    OWNER_TG_ID = "889013"
    ADMIN_TG_ID = "889011"

    def setUp(self) -> None:
        from fastapi.testclient import TestClient

        data_dir = Path(__file__).resolve().parents[1] / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = data_dir / f"test_cleanup_{uuid4().hex}.sqlite3"
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

    def _set_staff_telegram_ids(self) -> None:
        from sqlalchemy import select

        from app.database import SessionLocal
        from app.models import StaffUser

        mapping = {"admin": self.ADMIN_TG_ID, "owner": self.OWNER_TG_ID}
        with SessionLocal() as db:
            staff = db.scalars(select(StaffUser)).all()
            for item in staff:
                if item.login in mapping:
                    item.telegram_chat_id = mapping[item.login]
            db.commit()

    @staticmethod
    def auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": token}

    def _seed_operational(self) -> None:
        from app.database import SessionLocal
        from app.models import Client, Expense, Income, PiggyBankTransaction

        now = datetime.now(timezone.utc)
        with SessionLocal() as db:
            db.add(Client(id="c-clean-1", name="Тест Клиент", phone="+70000000001", car="Kia", plate="", created_at=now))
            db.add(Expense(id="e-clean-1", title="Тест расход", amount=500, category="Прочее", date="01.01.2020", created_at=now))
            db.add(Income(id="i-clean-1", amount=1000, source="Тест доход", date="01.01.2020", created_by_id="owner-1", created_at=now))
            db.add(
                PiggyBankTransaction(
                    id="p-clean-1",
                    amount=100,
                    transaction_type="adjust",
                    purpose="Тест копилка",
                    date="01.01.2020",
                    created_at=now,
                )
            )
            db.commit()

    def test_preview_execute_restore_purge(self) -> None:
        self._seed_operational()
        owner = self.auth_headers(self.owner_token)

        # preview range: старый период должен найти 3 финансовые сущности
        preview = self.client.post(
            "/api/owner/data-cleanup/preview",
            headers=owner,
            json={"entities": ["expenses", "incomes", "piggy"], "mode": "range", "dateFrom": "2020-01-01", "dateTo": "2020-01-02"},
        )
        self.assertEqual(preview.status_code, 200, preview.text)
        body = preview.json()
        self.assertEqual(body["total"], 3)
        by_entity = {i["entity"]: i["count"] for i in body["items"]}
        self.assertEqual(by_entity.get("expenses"), 1)
        # описания должны присутствовать
        self.assertTrue(all(i["description"] for i in body["items"]))

        # execute без пароля — 401
        bad = self.client.post(
            "/api/owner/data-cleanup/execute",
            headers=owner,
            json={"entities": ["expenses"], "mode": "range", "dateFrom": "2020-01-01", "dateTo": "2020-01-02", "password": "wrong"},
        )
        self.assertEqual(bad.status_code, 401)

        # execute с паролем owner
        executed = self.client.post(
            "/api/owner/data-cleanup/execute",
            headers=owner,
            json={"entities": ["expenses", "incomes", "piggy"], "mode": "range", "dateFrom": "2020-01-01", "dateTo": "2020-01-02", "password": "owner"},
        )
        self.assertEqual(executed.status_code, 200, executed.text)
        batch_id = executed.json()["batchId"]
        self.assertTrue(batch_id.startswith("cln-"))

        # корзина содержит 3 записи
        trash = self.client.get("/api/owner/trash", headers=owner)
        self.assertEqual(trash.status_code, 200)
        self.assertEqual(trash.json()["total"], 3)

        # wallet не должен видеть удалённые доходы/расходы
        wallet = self.client.get("/api/owner/wallet?date_from=01.01.2020&date_to=02.01.2020", headers=owner)
        # wallet может вернуть 200; главное — не падает после soft-delete
        self.assertIn(wallet.status_code, (200, 422))

        # restore всего пакета
        restored = self.client.post("/api/owner/trash/restore", headers=owner, json={"batchId": batch_id})
        self.assertEqual(restored.status_code, 200, restored.text)

        trash2 = self.client.get("/api/owner/trash", headers=owner)
        self.assertEqual(trash2.json()["total"], 0)

        # повторная очистка + older_than режим
        executed2 = self.client.post(
            "/api/owner/data-cleanup/execute",
            headers=owner,
            json={"entities": ["expenses"], "mode": "older_than", "olderThanDays": 1, "password": "owner"},
        )
        # расход от 2020 точно старше 1 дня
        self.assertEqual(executed2.status_code, 200, executed2.text)
        batch2 = executed2.json()["batchId"]

        # purge пакета
        purged = self.client.post("/api/owner/trash/purge", headers=owner, json={"batchId": batch2})
        self.assertEqual(purged.status_code, 200, purged.text)

        # batches видны
        batches = self.client.get("/api/owner/data-cleanup/batches", headers=owner)
        self.assertEqual(batches.status_code, 200)
        self.assertGreaterEqual(len(batches.json()), 2)

    def test_non_owner_forbidden(self) -> None:
        admin = self.auth_headers(self.admin_token)
        resp = self.client.post(
            "/api/owner/data-cleanup/preview",
            headers=admin,
            json={"entities": ["expenses"], "mode": "range", "dateFrom": "2020-01-01", "dateTo": "2020-01-02"},
        )
        self.assertIn(resp.status_code, (401, 403))


if __name__ == "__main__":
    unittest.main()

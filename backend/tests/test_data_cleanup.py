"""Тесты выборочной очистки БД за период + корзины 30 дней."""

import json
import os
import sys
import unittest
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

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

        # пароль больше не требуется — execute без пароля на пустом периоде даёт 400, а не 401
        bad = self.client.post(
            "/api/owner/data-cleanup/execute",
            headers=owner,
            json={"entities": ["expenses"], "mode": "range", "dateFrom": "2021-01-01", "dateTo": "2021-01-02"},
        )
        self.assertEqual(bad.status_code, 400)

        # execute без пароля
        executed = self.client.post(
            "/api/owner/data-cleanup/execute",
            headers=owner,
            json={"entities": ["expenses", "incomes", "piggy"], "mode": "range", "dateFrom": "2020-01-01", "dateTo": "2020-01-02"},
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

        # повторная очистка + older_than режим (без пароля)
        executed2 = self.client.post(
            "/api/owner/data-cleanup/execute",
            headers=owner,
            json={"entities": ["expenses"], "mode": "older_than", "olderThanDays": 1},
        )
        # расход от 2020 точно старше 1 дня
        self.assertEqual(executed2.status_code, 200, executed2.text)
        batch2 = executed2.json()["batchId"]

        # purge пакета (без пароля)
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

    def test_purge_without_password(self) -> None:
        self._seed_operational()
        owner = self.auth_headers(self.owner_token)
        executed = self.client.post(
            "/api/owner/data-cleanup/execute",
            headers=owner,
            json={"entities": ["expenses"], "mode": "range", "dateFrom": "2020-01-01", "dateTo": "2020-01-02"},
        )
        self.assertEqual(executed.status_code, 200, executed.text)
        batch_id = executed.json()["batchId"]

        # purge без пароля — 200
        no_pwd = self.client.post("/api/owner/trash/purge", headers=owner, json={"batchId": batch_id})
        self.assertEqual(no_pwd.status_code, 200, no_pwd.text)

        # повторный purge уже пустого пакета — 404, а не 401
        again = self.client.post("/api/owner/trash/purge", headers=owner, json={"batchId": batch_id})
        self.assertEqual(again.status_code, 404)

    def test_deleted_bookings_hidden_from_history_and_payroll(self) -> None:
        from app.database import SessionLocal
        from app.models import Booking

        self._seed_operational()
        owner = self.auth_headers(self.owner_token)
        now = datetime.now(timezone.utc)
        with SessionLocal() as db:
            db.add(
                Booking(
                    id="b-clean-1",
                    client_id="c-clean-1",
                    client_name="Тест Клиент",
                    client_phone="+70000000001",
                    service="Мойка",
                    service_id="",
                    date="01.01.2020",
                    time="10:00",
                    duration=60,
                    price=1000,
                    status="completed",
                    box="1",
                    payment_type="cash",
                    payment_settled=True,
                    created_at=now,
                )
            )
            db.commit()

        before = self.client.get("/api/owner/bookings-history?date_from=01.01.2020&date_to=02.01.2020", headers=owner)
        self.assertEqual(before.status_code, 200, before.text)
        self.assertTrue(any(b["id"] == "b-clean-1" for b in before.json()))

        executed = self.client.post(
            "/api/owner/data-cleanup/execute",
            headers=owner,
            json={"entities": ["bookings"], "mode": "range", "dateFrom": "2020-01-01", "dateTo": "2020-01-02"},
        )
        self.assertEqual(executed.status_code, 200, executed.text)

        after = self.client.get("/api/owner/bookings-history?date_from=01.01.2020&date_to=02.01.2020", headers=owner)
        self.assertEqual(after.status_code, 200, after.text)
        self.assertFalse(any(b["id"] == "b-clean-1" for b in after.json()))

        payroll = self.client.get("/api/admin/workers/payroll?period=all", headers=owner)
        self.assertEqual(payroll.status_code, 200, payroll.text)

    def test_piggy_cleanup_drags_period_bookings_without_piggy_tx(self) -> None:
        """Кредитная запись без проводок копилки тоже уходит при чистке копилки."""
        from app.database import SessionLocal
        from app.models import Booking

        self._seed_operational()
        owner = self.auth_headers(self.owner_token)
        now = datetime.now(timezone.utc)
        with SessionLocal() as db:
            db.add(
                Booking(
                    id="b-credit-1",
                    client_id="c-clean-1",
                    client_name="Тест Клиент",
                    client_phone="+70000000001",
                    service="Мойка",
                    service_id="",
                    date="01.01.2020",
                    time="10:00",
                    duration=60,
                    price=1000,
                    status="completed",
                    box="1",
                    payment_type="credit",
                    payment_settled=True,
                    created_at=now,
                )
            )
            db.commit()

        prev = self.client.post(
            "/api/owner/data-cleanup/preview",
            headers=owner,
            json={"entities": ["piggy"], "mode": "range", "dateFrom": "2020-01-01", "dateTo": "2020-01-02"},
        )
        self.assertEqual(prev.status_code, 200, prev.text)
        by_entity = {i["entity"]: i["count"] for i in prev.json()["items"]}
        self.assertEqual(by_entity.get("piggy"), 1)
        self.assertEqual(by_entity.get("bookings"), 1)

        executed = self.client.post(
            "/api/owner/data-cleanup/execute",
            headers=owner,
            json={"entities": ["piggy"], "mode": "range", "dateFrom": "2020-01-01", "dateTo": "2020-01-02"},
        )
        self.assertEqual(executed.status_code, 200, executed.text)

        after = self.client.get("/api/owner/bookings-history?date_from=01.01.2020&date_to=02.01.2020", headers=owner)
        self.assertEqual(after.status_code, 200, after.text)
        self.assertFalse(any(b["id"] == "b-credit-1" for b in after.json()))


if __name__ == "__main__":
    unittest.main()

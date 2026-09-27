"""T5: идемпотентность депозитов, закрытие месяца, Float->Numeric.

- topup/adjust с одним clientRequestId дважды: одна строка, баланс не двоится;
- повторное закрытие месяца подряд: 400, одна строка DepositMonth;
- значения закрытия квантованы до копеек (money HALF_UP);
- legacy FLOAT-таблица конвертируется (applied), NaN откладывает (deferred);
- реестр содержит обе депозитные миграции.
"""

from __future__ import annotations

import json
import os
import sys
import unittest
import urllib.parse
from decimal import Decimal
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


class DepositGuardTests(unittest.TestCase):
    OWNER_TG_ID = "777074"

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
        # T4: drop leaked GOOGLE_* env from neighbouring tests.
        for _key in ("GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET",
                     "GOOGLE_CALENDAR_REDIRECT_URI", "GOOGLE_CALENDAR_TIMEZONE"):
            os.environ.pop(_key, None)

        self.restart_app()
        self._set_owner_telegram_id()
        self.owner_token = build_init_data(self.OWNER_TG_ID)

    def tearDown(self) -> None:
        self.shutdown_app()
        reset_app_modules()
        if self.db_path.exists():
            try:
                self.db_path.unlink()
            except OSError:
                # Windows/daemon может держать файл (см. Google-тесты) — мусор gitignored.
                pass

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

    def _set_owner_telegram_id(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser
        from sqlalchemy import select

        with SessionLocal() as db:
            owner = db.scalar(select(StaffUser).where(StaffUser.login == "owner"))
            if owner is not None:
                owner.telegram_chat_id = self.OWNER_TG_ID
            db.commit()

    def _create_client(self) -> str:
        from app.database import SessionLocal
        from app.models import Client

        client_id = f"c-{uuid4().hex[:12]}"
        with SessionLocal() as db:
            db.add(
                Client(
                    id=client_id,
                    name="Абонент T5",
                    phone=f"+7 (999) 111-{str(uuid4().int)[-4:]}",
                    car="BMW",
                    plate="M001AA",
                )
            )
            db.commit()
        return client_id

    def _activate(self, client_id: str, monthly: int = 4000) -> None:
        response = self.client.patch(
            f"/api/owner/deposits/{client_id}",
            headers={"Authorization": self.owner_token},
            json={"clientId": client_id, "depositActive": True, "depositMonthly": monthly},
        )
        self.assertEqual(response.status_code, 200, response.text)

    def _txn_count(self, op_key: str) -> int:
        from app.database import SessionLocal
        from app.models import DepositTransaction
        from sqlalchemy import func, select

        with SessionLocal() as db:
            return (
                db.scalar(
                    select(func.count())
                    .select_from(DepositTransaction)
                    .where(DepositTransaction.op_key == op_key)
                )
                or 0
            )

    def test_topup_double_submit_single_txn(self) -> None:
        client_id = self._create_client()
        self._activate(client_id)
        key = f"op-{uuid4().hex}"
        body = {"clientId": client_id, "amount": 4000, "note": "T5", "clientRequestId": key}
        first = self.client.post(
            f"/api/owner/deposits/{client_id}/topup",
            headers={"Authorization": self.owner_token},
            json=body,
        )
        self.assertEqual(first.status_code, 200, first.text)
        second = self.client.post(
            f"/api/owner/deposits/{client_id}/topup",
            headers={"Authorization": self.owner_token},
            json=body,
        )
        self.assertEqual(second.status_code, 200, second.text)
        self.assertEqual(first.json()["id"], second.json()["id"])
        self.assertEqual(self._txn_count(key), 1)
        self.assertEqual(second.json()["balance_after"], 4000)

    def test_adjust_double_submit_single_txn(self) -> None:
        client_id = self._create_client()
        self._activate(client_id)
        key = f"op-{uuid4().hex}"
        body = {"clientId": client_id, "amount": 500, "note": "T5", "clientRequestId": key}
        for _ in range(2):
            response = self.client.post(
                f"/api/owner/deposits/{client_id}/adjust",
                headers={"Authorization": self.owner_token},
                json=body,
            )
            self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self._txn_count(key), 1)

    def test_settle_double_sequential_400_and_quantized(self) -> None:
        from datetime import datetime

        from app.database import SessionLocal
        from app.models import DepositMonth
        from sqlalchemy import select

        client_id = self._create_client()
        self._activate(client_id, monthly=3333)
        month = datetime.now().strftime("%m.%Y")
        first = self.client.post(
            f"/api/owner/deposits/{client_id}/settle-month",
            headers={"Authorization": self.owner_token},
            json={"clientId": client_id, "month": month},
        )
        self.assertEqual(first.status_code, 200, first.text)
        second = self.client.post(
            f"/api/owner/deposits/{client_id}/settle-month",
            headers={"Authorization": self.owner_token},
            json={"clientId": client_id, "month": month},
        )
        self.assertEqual(second.status_code, 400, second.text)
        with SessionLocal() as db:
            rows = db.scalars(
                select(DepositMonth).where(
                    DepositMonth.client_id == client_id,
                    DepositMonth.month == month,
                )
            ).all()
            self.assertEqual(len(rows), 1)
            for value in (rows[0].subscription, rows[0].wash_total, rows[0].balance_after):
                quantized = Decimal(value).quantize(Decimal("0.01"))
                self.assertEqual(Decimal(value), quantized)
            self.assertEqual(float(rows[0].subscription), 3333.0)

    def test_legacy_floats_convert_applied(self) -> None:
        from sqlalchemy import text

        from app.database import engine
        from app.migrations_extra import (
            upgrade_deposit_month_numeric,
            upgrade_deposit_op_key,
        )

        with engine.begin() as connection:
            connection.execute(text("DROP TABLE IF EXISTS deposit_months"))
            connection.execute(
                text(
                    "CREATE TABLE deposit_months (id VARCHAR(64) PRIMARY KEY, "
                    "client_id VARCHAR(64), month VARCHAR(16), "
                    "subscription FLOAT, wash_total FLOAT, balance_after FLOAT, "
                    "carryover_washes INTEGER, closed_at DATETIME, created_at DATETIME)"
                )
            )
            connection.execute(
                text(
                    "INSERT INTO deposit_months "
                    "(id, subscription, wash_total, balance_after, carryover_washes) "
                    "VALUES ('dm-1', 0.1, 0.2, 0.3, 0)"
                )
            )
        self.assertEqual(upgrade_deposit_op_key(), "applied")
        self.assertEqual(upgrade_deposit_month_numeric(), "applied")
        with engine.connect() as connection:
            indexes = connection.execute(
                text("SELECT name FROM sqlite_master WHERE type='index'")
            ).all()
        names = [tuple(row) for row in indexes]
        self.assertIn(("ux_deposit_month_client_month",), names)

    def test_nan_defers_numeric_migration(self) -> None:
        from sqlalchemy import text

        from app.database import engine
        from app.migrations_extra import upgrade_deposit_month_numeric

        with engine.begin() as connection:
            connection.execute(text("DROP TABLE IF EXISTS deposit_months"))
            connection.execute(
                text(
                    "CREATE TABLE deposit_months (id VARCHAR(64) PRIMARY KEY, "
                    "client_id VARCHAR(64), month VARCHAR(16), "
                    "subscription FLOAT, wash_total FLOAT, balance_after FLOAT, "
                    "carryover_washes INTEGER, closed_at DATETIME, created_at DATETIME)"
                )
            )
            connection.execute(
                text("INSERT INTO deposit_months (id, subscription) VALUES ('dm-nan', 1.0)")
            )
            connection.execute(text("UPDATE deposit_months SET subscription = 1e999 * 10"))
        self.assertEqual(upgrade_deposit_month_numeric(), "deferred")

    def test_registry_contains_deposit_migrations(self) -> None:
        from app.migrations_extra import EXTRA_MIGRATIONS

        ids = [version for version, _ in EXTRA_MIGRATIONS]
        self.assertIn("2026-10-01-deposit-op-key-003", ids)
        self.assertIn("2026-10-01-deposit-month-numeric-004", ids)


if __name__ == "__main__":
    unittest.main()

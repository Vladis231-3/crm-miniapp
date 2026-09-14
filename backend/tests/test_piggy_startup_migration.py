"""
Regression: startup piggy-bank migration must be safe to run on every cold start.

10.09.2026 prod incident: two concurrent serverless instances both executed the
unconditional full-table ``UPDATE piggy_bank_transactions`` inside
``_apply_runtime_migrations`` -> Postgres ``DeadlockDetected`` -> the exception
escaped ``on_startup`` -> "Application startup failed. Exiting.".

The backfill now runs only when unlinked legacy rows remain (cheap SELECT guard,
no RowExclusiveLock in steady state) and concurrent-execution conflicts are
logged instead of killing the instance. This test pins the re-runnable
behaviour: first run links exact 1-to-1 legacy rows, second run is a no-op that
must not raise.
"""
from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from uuid import uuid4


def reset_app_modules() -> None:
    for name in list(sys.modules):
        if (
            name == "app"
            or name.startswith(("app.", "backend.app."))
            or name == "backend.app"
            or name == "bot"
        ):
            del sys.modules[name]


class PiggyStartupMigrationTests(unittest.TestCase):
    def setUp(self) -> None:
        data_dir = Path(__file__).resolve().parents[1] / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = data_dir / f"test_suite_{uuid4().hex}.sqlite3"
        os.environ["DATABASE_URL"] = f"sqlite:///{self.db_path.as_posix()}"
        os.environ["APP_ENV"] = "development"
        os.environ["APP_SECRET"] = "test-secret"
        os.environ["CRON_SECRET"] = "test-cron-secret"
        os.environ["ALLOW_DEMO_SEED_DATA"] = "false"
        os.environ["RUN_EMBEDDED_BOT"] = "false"
        os.environ["ALLOW_INSECURE_CLIENT_AUTH"] = "true"
        os.environ["TELEGRAM_BOT_TOKEN"] = "123456:test-bot-token"
        os.environ["TELEGRAM_DELIVERY_MODE"] = "polling"
        os.environ["SYNC_TELEGRAM_WEBHOOK"] = "false"
        os.environ.pop("WEBAPP_URL", None)

        reset_app_modules()

    def tearDown(self) -> None:
        try:
            from app.database import engine
        except ModuleNotFoundError:
            pass
        else:
            engine.dispose()
        reset_app_modules()
        if self.db_path.exists():
            self.db_path.unlink()

    def test_backfill_links_one_to_one_and_rerun_is_noop(self) -> None:
        from decimal import Decimal

        from app.database import Base, SessionLocal, engine
        from app.models import Expense, PiggyBankTransaction

        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            db.add(
                Expense(
                    id="e-1",
                    title="Химия",
                    amount=Decimal("1250.50"),
                    category="Материалы",
                    date="10.01.2025",
                    resource_group="wash",
                )
            )
            db.add(
                PiggyBankTransaction(
                    id="legacy-1",
                    amount=Decimal("-1250.50"),
                    transaction_type="expense",
                    purpose="Расход: Химия",
                    date="10.01.2025",
                    resource_group="wash",
                )
            )
            db.commit()

        from app.main import _apply_runtime_migrations

        _apply_runtime_migrations()  # first cold start: backfills the link
        with SessionLocal() as db:
            self.assertEqual(
                db.get(PiggyBankTransaction, "legacy-1").expense_id, "e-1"
            )

        # second cold start: guard finds no work, must not raise (used to take
        # RowExclusiveLock via the unconditional UPDATE and deadlock in prod)
        _apply_runtime_migrations()
        with SessionLocal() as db:
            self.assertEqual(
                db.get(PiggyBankTransaction, "legacy-1").expense_id, "e-1"
            )

        from sqlalchemy import inspect as sa_inspect

        index_names = {
            index["name"]
            for index in sa_inspect(engine).get_indexes("piggy_bank_transactions")
        }
        self.assertIn("ux_piggy_bank_transactions_expense_id", index_names)
        self.assertIn("ux_piggy_bank_transactions_request_key", index_names)


if __name__ == "__main__":
    unittest.main()

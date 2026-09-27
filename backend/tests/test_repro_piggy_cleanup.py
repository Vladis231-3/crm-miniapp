"""REPRO: очистка сущности piggy — что остаётся в GET /api/owner/piggy-bank."""

from __future__ import annotations

import json
import os
import sys
import unittest
import urllib.parse
from datetime import datetime, timedelta
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


class ReproPiggyCleanup(unittest.TestCase):
    OWNER_TG_ID = "889013"
    ADMIN_TG_ID = "889011"

    def setUp(self) -> None:
        from fastapi.testclient import TestClient

        data_dir = Path(__file__).resolve().parents[1] / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = data_dir / f"test_repro_piggy_{uuid4().hex}.sqlite3"
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
            for item in db.scalars(select(StaffUser)).all():
                if item.login in mapping:
                    item.telegram_chat_id = mapping[item.login]
            db.commit()

    @staticmethod
    def auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": token}

    @staticmethod
    def next_active_date() -> str:
        candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        for offset in range(1, 8):
            d = candidate + timedelta(days=offset)
            if d.weekday() != 6:
                return d.strftime("%d.%m.%Y")
        raise AssertionError("no active date")

    def _seed(self) -> str:
        """Completed booking (→ piggy deposits) + income + expense."""
        from app.database import SessionLocal
        from app.models import Expense, Income

        booking_date = self.next_active_date()
        create = self.client.post(
            "/api/bookings",
            headers=self.auth_headers(self.admin_token),
            json={
                "clientId": "",
                "clientName": "Repro Client",
                "clientPhone": "+7 (999) 333-44-55",
                "service": "Мойка базовая",
                "serviceId": "s1",
                "date": booking_date,
                "time": "10:00",
                "duration": 30,
                "price": 1200,
                "status": "scheduled",
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
                "box": "Бокс 1",
                "paymentType": "cash",
                "car": "Lada Vesta",
                "plate": "A123BC",
            },
        )
        self.assertEqual(create.status_code, 200, create.text)
        booking = create.json()
        done = self.client.patch(
            f"/api/bookings/{booking['id']}",
            headers=self.auth_headers(self.admin_token),
            json={"status": "completed", "paymentSettled": True},
        )
        self.assertEqual(done.status_code, 200, done.text)

        now = datetime.now().astimezone()
        with SessionLocal() as db:
            db.add(Income(
                id="i-repro-1", amount=5000, source="Repro income", date=booking_date,
                created_by_id="owner-1", created_at=now, resource_group="wash",
            ))
            db.add(Expense(
                id="e-repro-1", title="Repro expense", amount=700, category="Прочее",
                date=booking_date, created_at=now, resource_group="wash",
            ))
            db.commit()
        return booking_date

    def test_repro(self) -> None:
        owner = self.auth_headers(self.owner_token)
        booking_date = self._seed()

        before = self.client.get("/api/owner/piggy-bank", headers=owner)
        self.assertEqual(before.status_code, 200, before.text)
        b = before.json()
        print("\n=== BEFORE cleanup ===")
        print(json.dumps({
            "balance": b["balance"],
            "txCount": len(b["transactions"]),
            "remainingInPiggyBank": b["remainingInPiggyBank"],
            "combinedBalance": b["combinedBalance"],
            "washTotalPiggy": b["wash"]["totalPiggy"],
            "washNetPiggy": b["wash"]["washNetPiggy"],
            "washIncomes": b.get("washIncomes"),
            "washExpenses": b.get("washExpenses"),
            "detailingNetPiggy": b["detailing"]["netPiggy"],
        }, ensure_ascii=False, indent=2))

        # preview: сколько piggy найдено
        prev = self.client.post(
            "/api/owner/data-cleanup/preview",
            headers=owner,
            json={
                "entities": ["piggy"],
                "mode": "range",
                "dateFrom": "01.01.2020",
                "dateTo": "31.12.2030",
            },
        )
        self.assertEqual(prev.status_code, 200, prev.text)
        print("preview:", json.dumps(prev.json(), ensure_ascii=False))

        ex = self.client.post(
            "/api/owner/data-cleanup/execute",
            headers=owner,
            json={
                "entities": ["piggy"],
                "mode": "range",
                "dateFrom": "01.01.2020",
                "dateTo": "31.12.2030",
            },
        )
        self.assertEqual(ex.status_code, 200, ex.text)
        print("execute:", json.dumps(ex.json(), ensure_ascii=False))

        after = self.client.get("/api/owner/piggy-bank", headers=owner)
        self.assertEqual(after.status_code, 200, after.text)
        a = after.json()
        print("\n=== AFTER cleanup ===")
        print(json.dumps({
            "balance": a["balance"],
            "txCount": len(a["transactions"]),
            "remainingInPiggyBank": a["remainingInPiggyBank"],
            "combinedBalance": a["combinedBalance"],
            "washTotalPiggy": a["wash"]["totalPiggy"],
            "washNetPiggy": a["wash"]["washNetPiggy"],
            "washIncomes": a.get("washIncomes"),
            "washExpenses": a.get("washExpenses"),
            "detailingNetPiggy": a["detailing"]["netPiggy"],
            "masterDailyOutputs": a.get("masterDailyOutputs"),
        }, ensure_ascii=False, indent=2))

        # Хард-проверки бага: после удаления ВСЕХ piggy-транзакций
        self.assertEqual(a["balance"], 0, "balance = сумма транзакций, должен быть 0")
        self.assertEqual(len(a["transactions"]), 0, "история должна быть пустой")
        print("\nBUG CHECK:")
        print(f"  combinedBalance after = {a['combinedBalance']} (ожидалось бы ~0)")
        print(f"  remainingInPiggyBank after = {a['remainingInPiggyBank']}")
        print(f"  wash.totalPiggy after = {a['wash']['totalPiggy']}")


if __name__ == "__main__":
    unittest.main(verbosity=2)

"""Сверка копилки по дням: расчётный остаток vs факт кассы.

Покрывает:
- GET /api/owner/piggy-bank/daily: дни с движением, остаток на конец дня,
  отметка «внесено задним числом», агрегаты по группам;
- PUT /api/owner/piggy-bank/cash-count: внесение/обновление факта (upsert),
  расчёт разницы «факт − расчёт»;
- DELETE /api/owner/piggy-bank/cash-count: удаление ошибочного факта;
- валидация дат/группы, доступ только владельцу/бухгалтеру.
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

DAY = "03.02.2026"


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


class PiggyDailyReconciliationTests(unittest.TestCase):
    OWNER_TG_ID = "778101"
    WORKER_TG_ID = "778103"

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

    def _adjust(self, resource_group: str, amount: float, day: str = DAY) -> dict:
        response = self.client.post(
            "/api/owner/piggy-bank/adjust",
            headers=self._auth_headers(self.owner_token),
            json={"resourceGroup": resource_group, "amount": amount, "date": day},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _daily(self, **params) -> dict:
        response = self.client.get(
            "/api/owner/piggy-bank/daily",
            headers=self._auth_headers(self.owner_token),
            params={"date_from": "01.02.2026", "date_to": "05.02.2026", **params},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    @staticmethod
    def _day(payload: dict, day: str = DAY) -> dict:
        for entry in payload["days"]:
            if entry["date"] == day:
                return entry
        raise AssertionError(f"день {day} отсутствует в ответе: {payload['days']}")

    def _set_fact(self, resource_group: str, amount: float, day: str = DAY, **extra):
        body = {"date": day, "resourceGroup": resource_group, "amount": amount, **extra}
        return self.client.put(
            "/api/owner/piggy-bank/cash-count",
            headers=self._auth_headers(self.owner_token),
            json=body,
        )

    # ------------------------------------------------------------------
    # Daily report
    # ------------------------------------------------------------------

    def test_adjust_creates_day_with_closing_and_backdated_flag(self) -> None:
        self._adjust("detailing", 5000)

        payload = self._daily()
        entry = self._day(payload)
        detailing = entry["groups"]["detailing"]

        self.assertEqual(detailing["adjust"], 5000)
        self.assertEqual(detailing["net"], 5000)
        self.assertEqual(detailing["count"], 1)
        # Корректировка внесена сегодня задним числом (03.02.2026).
        self.assertTrue(entry["hasBackdated"])
        # Остаток копилки на конец дня = остаток до отчёта + движение дня.
        self.assertEqual(
            detailing["closing"],
            round(payload["opening"]["detailing"] + 5000, 2),
        )
        self.assertEqual(entry["total"]["closing"], round(detailing["closing"], 2))

    def test_opening_of_next_range_equals_closing_of_previous(self) -> None:
        self._adjust("wash", 1200)
        first = self._daily()
        closing = self._day(first)["groups"]["wash"]["closing"]

        response = self.client.get(
            "/api/owner/piggy-bank/daily",
            headers=self._auth_headers(self.owner_token),
            params={"date_from": "04.02.2026", "date_to": "10.02.2026", "resource_group": "wash"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["opening"]["wash"], closing)

    def test_fact_and_diff_upsert(self) -> None:
        self._adjust("detailing", 5000)
        entry = self._day(self._daily())
        closing = entry["groups"]["detailing"]["closing"]

        first = self._set_fact("detailing", round(closing + 194, 2), note="Вечерний пересчёт")
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(first.json()["amount"], round(closing + 194, 2))

        payload = self._daily()
        day = self._day(payload)
        self.assertEqual(day["facts"]["detailing"], round(closing + 194, 2))
        self.assertEqual(day["diffs"]["detailing"], 194)
        self.assertEqual(day["note_detailing"], "Вечерний пересчёт")
        self.assertEqual(payload["recorded"]["detailing"], 1)
        self.assertEqual(payload["unexplained"]["detailing"], 194)

        # Повторное сохранение — обновление той же записи, без дублей.
        second = self._set_fact("detailing", closing)
        self.assertEqual(second.status_code, 200, second.text)
        day = self._day(self._daily())
        self.assertEqual(day["facts"]["detailing"], closing)
        self.assertEqual(day["diffs"]["detailing"], 0)

        from sqlalchemy import func, select

        from app.database import SessionLocal
        from app.models import PiggyCashCount

        with SessionLocal() as db:
            count = db.scalar(select(func.count()).select_from(PiggyCashCount))
        self.assertEqual(count, 1)

    def test_delete_fact(self) -> None:
        self._adjust("wash", 900)
        self.assertEqual(self._set_fact("wash", 1000).status_code, 200)
        self.assertIsNotNone(self._day(self._daily())["facts"]["wash"])

        response = self.client.delete(
            "/api/owner/piggy-bank/cash-count",
            headers=self._auth_headers(self.owner_token),
            params={"date": DAY, "resource_group": "wash"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIsNone(self._day(self._daily())["facts"]["wash"])

    # ------------------------------------------------------------------
    # Validation / access
    # ------------------------------------------------------------------

    def test_bad_group_and_bad_date(self) -> None:
        self.assertEqual(self._set_fact("general", 100).status_code, 400)
        self.assertEqual(self._set_fact("wash", 100, day="2026-02-03").status_code, 400)

    def test_future_date_rejected(self) -> None:
        response = self._set_fact("wash", 100, day="31.12.2099")
        self.assertEqual(response.status_code, 400, response.text)

    def test_range_validation(self) -> None:
        inverted = self.client.get(
            "/api/owner/piggy-bank/daily",
            headers=self._auth_headers(self.owner_token),
            params={"date_from": "05.02.2026", "date_to": "01.02.2026"},
        )
        self.assertEqual(inverted.status_code, 400, inverted.text)

        too_long = self.client.get(
            "/api/owner/piggy-bank/daily",
            headers=self._auth_headers(self.owner_token),
            params={"date_from": "01.01.2025", "date_to": "31.12.2026"},
        )
        self.assertEqual(too_long.status_code, 400, too_long.text)

    def test_worker_forbidden(self) -> None:
        response = self.client.get(
            "/api/owner/piggy-bank/daily",
            headers=self._auth_headers(self.worker_token),
        )
        self.assertEqual(response.status_code, 403, response.text)


if __name__ == "__main__":
    unittest.main()
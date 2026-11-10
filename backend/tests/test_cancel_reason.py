"""Причина отмены / неявки записи.

Записи не удаляются, а переводятся в cancelled / no_show; при этом хранится
причина (код из CANCEL_REASON_CODES) и комментарий — для статистики отказов.

Проверяет:
- причина и комментарий сохраняются и отдаются, ставится cancelledAt;
- «other» требует комментарий; неизвестный код — 422;
- отмена без причины проходит (старые клиенты), no_show получает причину сам;
- возврат в работу очищает причину; правка причины не двигает cancelledAt.
"""
from __future__ import annotations

import json
import os
import sys
import unittest
import urllib.parse
from datetime import date, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select


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


class CancelReasonTests(unittest.TestCase):
    OWNER_TG_ID = "778301"

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
        self._set_owner_telegram_id()
        self.owner = {"Authorization": build_init_data(self.OWNER_TG_ID)}
        self.service_id = self._make_service()
        self._slot = 8

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

    # ── helpers ──────────────────────────────────────────────────────────

    def _set_owner_telegram_id(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser

        with SessionLocal() as db:
            for item in db.scalars(select(StaffUser)).all():
                if item.login == "owner":
                    item.telegram_chat_id = self.OWNER_TG_ID
            db.commit()

    def _make_service(self) -> str:
        from app.database import SessionLocal
        from app.models import Service

        sid = f"svc-det-{uuid4().hex[:8]}"
        with SessionLocal() as db:
            db.add(
                Service(
                    id=sid,
                    name="Полировка (тест)",
                    category="Детейлинг",
                    price=1000,
                    duration=60,
                    resource_group="detailing",
                )
            )
            db.commit()
        return sid

    def _create(self, status: str = "completed") -> str:
        self._slot += 1
        # Завершённая — сегодня; активная — завтра (слот не в прошлом).
        day = date.today() + timedelta(days=0 if status == "completed" else 1)  # noqa: DTZ011
        response = self.client.post(
            "/api/bookings",
            headers=self.owner,
            json={
                "clientId": "",
                "clientName": "Клиент Отмена",
                "clientPhone": f"+7 (999) 557-{self._slot:02d}-{self._slot:02d}",
                "service": "Полировка (тест)",
                "serviceId": self.service_id,
                "date": day.strftime("%d.%m.%Y"),
                "time": f"{self._slot:02d}:00",
                "duration": 60,
                "price": 2000,
                "status": status,
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
                "box": "Детейлинг 1",
                "paymentType": "cash",
                "paymentSettled": status == "completed",
                "car": "Toyota LC200",
                "plate": "A002AA",
                "notes": "",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["id"]

    def _patch(self, booking_id: str, body: dict):
        return self.client.patch(f"/api/bookings/{booking_id}", headers=self.owner, json=body)

    def _ok(self, booking_id: str, body: dict) -> dict:
        response = self._patch(booking_id, body)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    # ── tests ────────────────────────────────────────────────────────────

    def test_cancel_with_reason_and_comment_saved(self) -> None:
        booking_id = self._create()
        data = self._ok(
            booking_id,
            {"status": "cancelled", "cancelReason": "found_cheaper", "cancelComment": " в соседнем сервисе "},
        )
        self.assertEqual(data["status"], "cancelled")
        self.assertEqual(data["cancelReason"], "found_cheaper")
        self.assertEqual(data["cancelComment"], "в соседнем сервисе")
        self.assertIsNotNone(data["cancelledAt"])

        history = self.client.get(
            "/api/owner/bookings-history", headers=self.owner, params={"status": "cancelled"}
        )
        self.assertEqual(history.status_code, 200, history.text)
        row = next(item for item in history.json() if item["id"] == booking_id)
        self.assertEqual(row["cancelReason"], "found_cheaper")
        self.assertEqual(row["cancelComment"], "в соседнем сервисе")

    def test_other_requires_comment(self) -> None:
        booking_id = self._create()
        response = self._patch(booking_id, {"status": "cancelled", "cancelReason": "other"})
        self.assertEqual(response.status_code, 400, response.text)
        # Отказ ничего не поменял.
        self.assertEqual(self._ok(booking_id, {"notes": "x"})["status"], "completed")
        data = self._ok(
            booking_id,
            {"status": "cancelled", "cancelReason": "other", "cancelComment": "машину продал"},
        )
        self.assertEqual(data["cancelReason"], "other")

    def test_unknown_reason_rejected(self) -> None:
        booking_id = self._create()
        response = self._patch(booking_id, {"status": "cancelled", "cancelReason": "zzz"})
        self.assertEqual(response.status_code, 422, response.text)

    def test_cancel_without_reason_still_works(self) -> None:
        booking_id = self._create()
        data = self._ok(booking_id, {"status": "cancelled"})
        self.assertEqual(data["cancelReason"], "")
        self.assertIsNotNone(data["cancelledAt"])

    def test_no_show_defaults_reason(self) -> None:
        booking_id = self._create("scheduled")
        data = self._ok(booking_id, {"status": "no_show"})
        self.assertEqual(data["cancelReason"], "no_show")

    def test_reactivation_clears_reason(self) -> None:
        booking_id = self._create("scheduled")
        self._ok(booking_id, {"status": "cancelled", "cancelReason": "changed_mind", "cancelComment": "к"})
        data = self._ok(booking_id, {"status": "scheduled"})
        self.assertEqual(data["cancelReason"], "")
        self.assertEqual(data["cancelComment"], "")
        self.assertIsNone(data["cancelledAt"])

    def test_edit_reason_keeps_cancelled_at(self) -> None:
        booking_id = self._create()
        first = self._ok(booking_id, {"status": "cancelled", "cancelReason": "changed_mind", "cancelComment": "к"})
        data = self._ok(booking_id, {"cancelReason": "price"})
        self.assertEqual(data["cancelReason"], "price")
        self.assertEqual(data["cancelComment"], "к", "комментарий без явной правки сохраняется")
        self.assertEqual(data["cancelledAt"], first["cancelledAt"])


if __name__ == "__main__":
    unittest.main()

"""V-001: точечные тесты крупнейших дыр покрытия (settings-write, penalties, contact, piggy)."""

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
            or name.startswith("app.")
            or name == "backend.app"
            or name.startswith("backend.app.")
            or name == "bot"
        ):
            del sys.modules[name]


def build_init_data(telegram_id: str) -> str:
    return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})


class CoverageGapsTests(unittest.TestCase):
    ADMIN_TG_ID = "777111"
    OWNER_TG_ID = "777113"
    WORKER_TG_ID = "777112"

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

        self.restart_app()
        self._set_staff_telegram_ids()
        self.admin_token = build_init_data(self.ADMIN_TG_ID)
        self.owner_token = build_init_data(self.OWNER_TG_ID)
        self.worker_token = build_init_data(self.WORKER_TG_ID)

    def tearDown(self) -> None:
        self.shutdown_app()
        reset_app_modules()
        if self.db_path.exists():
            self.db_path.unlink()

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

    def _set_staff_telegram_ids(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser
        from sqlalchemy import select

        mapping = {
            "admin": self.ADMIN_TG_ID,
            "ivan": self.WORKER_TG_ID,
            "owner": self.OWNER_TG_ID,
        }
        with SessionLocal() as db:
            staff = db.scalars(select(StaffUser)).all()
            for item in staff:
                if item.login in mapping:
                    item.telegram_chat_id = mapping[item.login]
            db.commit()

    def test_save_boxes_roundtrip_and_group_scoped_delete(self) -> None:
        first = self.client.put(
            "/api/settings/boxes",
            headers={"Authorization": self.admin_token},
            json=[
                {"id": "b1", "name": "Бокс 1", "resourceGroup": "wash",
                 "pricePerHour": 500, "active": True, "description": ""},
                {"id": "b9", "name": "Пост 9", "resourceGroup": "detailing",
                 "pricePerHour": 900, "active": True, "description": ""},
            ],
        )
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual({b["id"] for b in first.json()}, {"b1", "b9"})
        # Пересохранение только wash-группы: detailing-бокс обязан уцелеть.
        second = self.client.put(
            "/api/settings/boxes",
            headers={"Authorization": self.admin_token},
            json=[
                {"id": "b1", "name": "Бокс 1+", "resourceGroup": "wash",
                 "pricePerHour": 600, "active": True, "description": ""},
            ],
        )
        self.assertEqual(second.status_code, 200, second.text)
        ids = {b["id"] for b in second.json()}
        self.assertIn("b1", ids)
        self.assertIn("b9", ids)
        renamed = [b for b in second.json() if b["id"] == "b1"][0]
        self.assertEqual(renamed["name"], "Бокс 1+")

    def test_save_boxes_forbidden_for_worker(self) -> None:
        response = self.client.put(
            "/api/settings/boxes",
            headers={"Authorization": self.worker_token},
            json=[],
        )
        self.assertEqual(response.status_code, 403, response.text)

    def test_save_schedule_roundtrip(self) -> None:
        response = self.client.put(
            "/api/settings/schedule",
            headers={"Authorization": self.owner_token},
            json=[
                {"dayIndex": 0, "day": "Пн", "open": "09:00", "close": "21:00", "active": True},
                {"dayIndex": 6, "day": "Вс", "open": "10:00", "close": "20:00", "active": False},
            ],
        )
        self.assertEqual(response.status_code, 200, response.text)
        days = {entry["dayIndex"]: entry for entry in response.json()}
        self.assertTrue(days[0]["active"])
        self.assertFalse(days[6]["active"])

    def test_submit_contact_accepts_and_escapes(self) -> None:
        response = self.client.post(
            "/api/contact",
            json={
                "name": "<script>alert(1)</script>",
                "phone": "+7 (999) 123-45-67",
                "service": "Мойка",
                "message": "Позвоните",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn("отправлена", response.json()["message"])

    def test_penalty_revoke_lifecycle(self) -> None:
        created = self.client.post(
            "/api/penalties",
            headers={"Authorization": self.owner_token},
            json={"workerId": "w1", "title": "Опоздание", "reason": "На 20 минут"},
        )
        self.assertEqual(created.status_code, 200, created.text)
        penalty_id = created.json()["id"]
        # Не-владелец отозвать не может.
        forbidden = self.client.post(
            f"/api/penalties/{penalty_id}/revoke",
            headers={"Authorization": self.admin_token},
        )
        self.assertEqual(forbidden.status_code, 403, forbidden.text)
        revoked = self.client.post(
            f"/api/penalties/{penalty_id}/revoke",
            headers={"Authorization": self.owner_token},
        )
        self.assertEqual(revoked.status_code, 200, revoked.text)
        # Повторный отзыв — 400, несуществующий — 404.
        double = self.client.post(
            f"/api/penalties/{penalty_id}/revoke",
            headers={"Authorization": self.owner_token},
        )
        self.assertEqual(double.status_code, 400, double.text)
        missing = self.client.post(
            "/api/penalties/no-such-penalty/revoke",
            headers={"Authorization": self.owner_token},
        )
        self.assertEqual(missing.status_code, 404, missing.text)

    def test_piggy_bank_readable_by_owner(self) -> None:
        response = self.client.get(
            "/api/owner/piggy-bank",
            headers={"Authorization": self.owner_token},
        )
        self.assertEqual(response.status_code, 200, response.text)

    def test_telegram_link_code_generate_and_confirm(self) -> None:
        from app.database import SessionLocal

        generated = self.client.post(
            "/api/telegram/link-code",
            headers={"Authorization": self.worker_token},
        )
        self.assertEqual(generated.status_code, 200, generated.text)
        body = generated.json()
        self.assertTrue(body["linked"])
        self.assertRegex(body["code"], r"^\d{6}$")

        from app.telegram_linking import confirm_link_code

        with SessionLocal() as db:
            self.assertIsNone(confirm_link_code(db, "000000", 555666))
            staff = confirm_link_code(db, body["code"], 555666)
            db.commit()
        self.assertIsNotNone(staff)

        again = self.client.post(
            "/api/telegram/link-code",
            headers={"Authorization": self.admin_token},
        )
        self.assertEqual(again.status_code, 200, again.text)
        self.assertTrue(again.json()["linked"])

    def test_owner_salary_detail_readable_by_owner_only(self) -> None:
        forbidden = self.client.get(
            "/api/owner/owners/salary-detail?period=all",
            headers={"Authorization": self.worker_token},
        )
        self.assertEqual(forbidden.status_code, 403, forbidden.text)
        response = self.client.get(
            "/api/owner/owners/salary-detail?period=all",
            headers={"Authorization": self.owner_token},
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertIn("owners", body)
        self.assertGreaterEqual(len(body["owners"]), 1, body)


if __name__ == "__main__":
    unittest.main()

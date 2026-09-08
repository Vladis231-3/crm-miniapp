"""H-06: сквоттинг телефона — verified-reclaim.

Атака: чужой Telegram регистрирует номер жертвы первым (без верификации).
Жертва позже получает вечный 409. Фикс: доказавший номер через шаринг
собственного контакта (user_id == chat_id) возвращает его себе, но только
если текущий держатель номер никогда не подтверждал.
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
        if name in {"app", "backend.app", "bot"} or name.startswith(("app.", "backend.app.")):
            del sys.modules[name]


def build_init_data(telegram_id: str) -> str:
    return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})


SQUAT_PHONE = "+7 (999) 555-01-02"


class PhoneReclaimTests(unittest.TestCase):
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

    def register(self, name: str, phone: str, telegram_id: str):
        return self.client.post(
            "/api/auth/client",
            json={
                "profile": {"name": name, "phone": phone, "registered": True},
                "initData": build_init_data(telegram_id),
            },
        )

    def verify_phone(self, telegram_id: str, phone: str) -> None:
        from app.schemas import normalize_phone_digits
        from bot import _store_client_phone_verification

        _store_client_phone_verification(int(telegram_id), normalize_phone_digits(phone))

    def client_telegram(self, actor_id: str) -> str | None:
        from app.database import SessionLocal
        from app.models import Client

        with SessionLocal() as db:
            client = db.get(Client, actor_id)
            return client.telegram_id if client else None

    def count_clients(self) -> int:
        from sqlalchemy import select

        from app.database import SessionLocal
        from app.models import Client

        with SessionLocal() as db:
            return len(db.scalars(select(Client)).all())

    def test_verified_victim_reclaims_squatted_phone(self) -> None:
        squatter = self.register("Squatter", SQUAT_PHONE, "9001")
        self.assertEqual(squatter.status_code, 200, squatter.text)
        squat_id = squatter.json()["session"]["actorId"]

        self.verify_phone("9002", SQUAT_PHONE)
        victim = self.register("Victim", SQUAT_PHONE, "9002")
        self.assertEqual(victim.status_code, 200, victim.text)
        # Та же запись, привязка переехала к доказанному владельцу.
        self.assertEqual(victim.json()["session"]["actorId"], squat_id)
        self.assertEqual(self.client_telegram(squat_id), "9002")
        self.assertEqual(self.count_clients(), 1)

    def test_verified_holder_keeps_phone(self) -> None:
        self.verify_phone("9001", SQUAT_PHONE)
        first = self.register("Alice", SQUAT_PHONE, "9001")
        self.assertEqual(first.status_code, 200, first.text)

        self.verify_phone("9002", SQUAT_PHONE)
        second = self.register("Bob", SQUAT_PHONE, "9002")
        self.assertEqual(second.status_code, 409, second.text)
        self.assertEqual(self.count_clients(), 1)

    def test_unverified_requester_still_rejected(self) -> None:
        first = self.register("Squatter", SQUAT_PHONE, "9001")
        self.assertEqual(first.status_code, 200, first.text)

        second = self.register("Bob", SQUAT_PHONE, "9002")
        self.assertEqual(second.status_code, 409, second.text)
        self.assertEqual(self.count_clients(), 1)


if __name__ == "__main__":
    unittest.main()

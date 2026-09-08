"""H-02: публичная форма /api/contact — лимиты размера и rate-limit.

Без защиты: unbounded-схема + отсутствие rate-limit + синхронные
Telegram-ретраи 60s x3 на каждого владельца = спам и удержание воркера.
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


class ContactAbuseTests(unittest.TestCase):
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
        # Rate-limit общий на процесс и ключ — чистим, чтобы тесты не влияли друг на друга.
        from app.main import _login_attempts

        _login_attempts.clear()

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

    def post_contact(self, **overrides):
        payload = {
            "name": "Иван",
            "phone": "+7 (999) 123-45-67",
            "service": "Мойка",
            "message": "Позвоните",
        }
        payload.update(overrides)
        return self.client.post("/api/contact", json=payload)

    def test_legit_contact_still_accepted(self) -> None:
        response = self.post_contact()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn("отправлена", response.json()["message"])

    def test_oversized_message_rejected_with_422(self) -> None:
        response = self.post_contact(message="x" * 2001)
        self.assertEqual(response.status_code, 422, response.text)

    def test_oversized_name_rejected_with_422(self) -> None:
        response = self.post_contact(name="n" * 101)
        self.assertEqual(response.status_code, 422, response.text)

    def test_oversized_service_rejected_with_422(self) -> None:
        response = self.post_contact(service="s" * 121)
        self.assertEqual(response.status_code, 422, response.text)

    def test_contact_is_rate_limited(self) -> None:
        from app.main import _LOGIN_MAX_ATTEMPTS

        for _ in range(_LOGIN_MAX_ATTEMPTS):
            response = self.post_contact()
            self.assertEqual(response.status_code, 200, response.text)
        flooded = self.post_contact()
        self.assertEqual(flooded.status_code, 429, flooded.text)


if __name__ == "__main__":
    unittest.main()

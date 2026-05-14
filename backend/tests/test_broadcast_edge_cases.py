"""Unit tests for broadcast edge cases.

Validates: Requirements 2.3
"""
from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select


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


class BroadcastEdgeCaseTests(unittest.TestCase):
    """Tests for Telegram broadcast edge cases (Requirement 2.3)."""

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

    def login_staff(self, login: str, password: str) -> str:
        response = self.client.post(
            "/api/auth/staff/login",
            json={"login": login, "password": password},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["token"]

    def disable_owner_two_factor(self) -> None:
        from app.database import SessionLocal
        from app.models import AppSetting

        with SessionLocal() as db:
            setting = db.get(AppSetting, "owner_security")
            self.assertIsNotNone(setting)
            assert setting is not None
            setting.value = {"twoFactor": False}
            db.commit()

    def clear_all_owner_telegram_chat_ids(self) -> None:
        """Remove telegram_chat_id from all owners so no one is eligible for broadcast."""
        from app.database import SessionLocal
        from app.models import StaffUser

        with SessionLocal() as db:
            owners = db.scalars(
                select(StaffUser).where(StaffUser.role == "owner")
            ).all()
            for owner in owners:
                owner.telegram_chat_id = ""
            db.commit()

    @staticmethod
    def auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    # ------------------------------------------------------------------
    # Requirement 2.3: no owners with telegram_chat_id → HTTP 503
    # ------------------------------------------------------------------

    def test_export_broadcast_returns_503_when_no_owners_have_telegram_chat_id(
        self,
    ) -> None:
        """POST /api/owner/exports/{kind}/telegram returns 503 when no owner
        has a telegram_chat_id set.

        Validates: Requirements 2.3
        """
        self.disable_owner_two_factor()
        owner_token = self.login_staff("owner", "owner")
        self.clear_all_owner_telegram_chat_ids()

        with (
            patch("app.main.send_telegram_document") as mock_doc,
            patch("app.main.send_telegram_message") as mock_msg,
        ):
            response = self.client.post(
                "/api/owner/exports/report/telegram",
                headers=self.auth_headers(owner_token),
            )

        self.assertEqual(
            response.status_code,
            503,
            f"Expected 503 when no owners have telegram_chat_id, got {response.status_code}: {response.text}",
        )
        # Telegram helpers must NOT have been called
        mock_doc.assert_not_called()
        mock_msg.assert_not_called()

    def test_report_broadcast_returns_503_when_no_owners_have_telegram_chat_id(
        self,
    ) -> None:
        """POST /api/owner/reports/{period}/{segment}/telegram returns 503 when
        no owner has a telegram_chat_id set.

        Validates: Requirements 2.3
        """
        self.disable_owner_two_factor()
        owner_token = self.login_staff("owner", "owner")
        self.clear_all_owner_telegram_chat_ids()

        with (
            patch("app.main.send_telegram_document") as mock_doc,
            patch("app.main.send_telegram_message") as mock_msg,
        ):
            response = self.client.post(
                "/api/owner/reports/daily/wash/telegram",
                headers=self.auth_headers(owner_token),
            )

        self.assertEqual(
            response.status_code,
            503,
            f"Expected 503 when no owners have telegram_chat_id, got {response.status_code}: {response.text}",
        )
        # Telegram helpers must NOT have been called
        mock_doc.assert_not_called()
        mock_msg.assert_not_called()


if __name__ == "__main__":
    unittest.main()

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

    def set_owner_telegram_chat_ids(self, *, all_good: bool) -> int:
        """Привязывает уникальные telegram_chat_id всем владельцам.

        Число владельцев не фиксировано: в dev-сиде это creator_owner + owner,
        но утечка PERMANENT_TELEGRAM_OWNERS из других тест-файлов добавляет ещё.
        Владелец с login='owner' (под ним ходит тест) всегда получает
        доставляемый id; при all_good=False остальные получают 'падающий'
        префикс 66.. (доставка для них упадёт в тестовом send-моке).
        Возвращает число владельцев.
        """
        from app.database import SessionLocal
        from app.models import StaffUser

        with SessionLocal() as db:
            owners = db.scalars(
                select(StaffUser).where(StaffUser.role == "owner")
            ).all()
            self.assertGreaterEqual(
                len(owners), 2, f"expected at least 2 owners, found {len(owners)}"
            )
            for index, owner in enumerate(owners):
                if all_good or owner.login == "owner":
                    owner.telegram_chat_id = f"55{index:02d}"
                else:
                    owner.telegram_chat_id = f"66{index:02d}"
            db.commit()
            return len(owners)

    def count_owner_notifications(self) -> int:
        from app.database import SessionLocal
        from app.models import Notification

        with SessionLocal() as db:
            return len(
                db.scalars(
                    select(Notification).where(
                        Notification.recipient_role == "owner"
                    )
                ).all()
            )

    @staticmethod
    def auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": token}

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

        # ??? initData-?????????????? ?????? ???????? ?? telegram-????????,
        # ??????? "??? ???????????" ????????? ?????? ?????????? ???????????.
        with (
            patch("app.main._all_owner_telegram_recipients", return_value=[]),
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

        # ??? initData-?????????????? ?????? ???????? ?? telegram-????????,
        # ??????? "??? ???????????" ????????? ?????? ?????????? ???????????.
        with (
            patch("app.main._all_owner_telegram_recipients", return_value=[]),
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

    # ------------------------------------------------------------------
    # Partial broadcast: delivered > 0 and failed > 0 → HTTP 207 (не 500)
    # Регрессия: _PartialBroadcastError раньше не перехватывался ни одним
    # эндпоинтом и улетал в ASGI как необработанное исключение (HTTP 500).
    # ------------------------------------------------------------------

    def _login_owner(self) -> str:
        self.disable_owner_two_factor()
        return self.login_staff("owner", "owner")

    def test_export_broadcast_returns_207_on_partial_failure(self) -> None:
        """POST /api/owner/exports/report/telegram: часть доставок падает → 207."""
        # chat_id выставляем ДО логина: staff-login токен встраивает chat_id.
        owner_count = self.set_owner_telegram_chat_ids(all_good=False)
        owner_token = self._login_owner()
        notifications_before = self.count_owner_notifications()

        def _flaky_send(chat_id, *, file_name, content, caption=None, mime_type=None):
            if str(chat_id).startswith("66"):
                raise RuntimeError("blocked by user")

        with patch("app.main.send_telegram_document", side_effect=_flaky_send) as mock_doc:
            response = self.client.post(
                "/api/owner/exports/report/telegram",
                headers=self.auth_headers(owner_token),
            )

        self.assertEqual(
            response.status_code,
            207,
            f"Expected 207 on partial broadcast, got {response.status_code}: {response.text}",
        )
        payload = response.json()
        self.assertEqual(payload["delivered"], 1)
        self.assertEqual(payload["failed"], owner_count - 1)
        self.assertEqual(len(payload["results"]), owner_count)
        self.assertEqual(mock_doc.call_count, owner_count)
        # Notification для владельцев должны быть сохранены (db.commit в фоне)
        self.assertEqual(
            self.count_owner_notifications(),
            notifications_before + owner_count,
            "in-app notifications must be persisted even on partial delivery failure",
        )

    def test_piggy_bank_export_broadcast_returns_207_on_partial_failure(self) -> None:
        """POST /api/owner/exports/piggy-bank/telegram (эндпоинт из баг-репорта):
        частичная неудача доставки → 207, а не необработанное исключение."""
        owner_count = self.set_owner_telegram_chat_ids(all_good=False)
        owner_token = self._login_owner()

        def _flaky_send(chat_id, *, file_name, content, caption=None, mime_type=None):
            if str(chat_id).startswith("66"):
                raise RuntimeError("blocked by user")

        with patch("app.main.send_telegram_document", side_effect=_flaky_send):
            response = self.client.post(
                "/api/owner/exports/piggy-bank/telegram",
                headers=self.auth_headers(owner_token),
            )

        self.assertEqual(
            response.status_code,
            207,
            f"Expected 207 on partial broadcast, got {response.status_code}: {response.text}",
        )
        payload = response.json()
        self.assertEqual(payload["delivered"], 1)
        self.assertEqual(payload["failed"], owner_count - 1)

    def test_export_broadcast_returns_200_when_all_delivered(self) -> None:
        """POST /api/owner/exports/report/telegram: все доставки успешны → 200
        c legacy-телом OwnerExportDeliveryPayload (контракт не изменился)."""
        owner_count = self.set_owner_telegram_chat_ids(all_good=True)
        owner_token = self._login_owner()

        with patch("app.main.send_telegram_document") as mock_doc:
            response = self.client.post(
                "/api/owner/exports/report/telegram",
                headers=self.auth_headers(owner_token),
            )

        self.assertEqual(
            response.status_code,
            200,
            f"Expected 200 on full broadcast, got {response.status_code}: {response.text}",
        )
        payload = response.json()
        self.assertTrue(payload["telegramSent"])
        self.assertIn("fileName", payload)
        self.assertIn("message", payload)
        self.assertEqual(mock_doc.call_count, owner_count)


if __name__ == "__main__":
    unittest.main()

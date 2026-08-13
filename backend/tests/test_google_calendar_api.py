from __future__ import annotations

import hashlib
import hmac
import json
import os
import sys
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import select


def reset_app_modules() -> None:
    for name in list(sys.modules):
        if name in {"app", "bot", "backend.app"} or name.startswith(("app.", "backend.app.")):
            del sys.modules[name]


class GoogleCalendarApiTests(unittest.TestCase):
    def setUp(self) -> None:
        data_dir = Path(__file__).resolve().parents[1] / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = data_dir / f"test_gc_api_{os.urandom(4).hex()}.sqlite3"
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
        os.environ["GOOGLE_CALENDAR_CLIENT_ID"] = "test-client.apps.googleusercontent.com"
        os.environ["GOOGLE_CALENDAR_CLIENT_SECRET"] = "test-secret"
        os.environ["GOOGLE_CALENDAR_REDIRECT_URI"] = "https://example.com/callback"
        os.environ["GOOGLE_CALENDAR_TIMEZONE"] = "Europe/Moscow"
        os.environ.pop("WEBAPP_URL", None)
        os.environ.pop("PERMANENT_TELEGRAM_OWNERS", None)

        reset_app_modules()
        from app.main import app

        # Фоновый поток обратной синхронизации не должен вмешиваться в моки.
        self._sync_thread_patch = patch("app.main.start_google_sync_thread")
        self._sync_thread_patch.start()

        self.client_manager = TestClient(app)
        self.client = self.client_manager.__enter__()

    def tearDown(self) -> None:
        # Закрываем соединения ДВИЖКА, который реально использовал app (до
        # reset_app_modules — иначе импорт вернёт новый движок без соединений,
        # а старый держит файл открытым, и unlink падает с PermissionError).
        from app.database import engine

        engine.dispose()
        self.client_manager.__exit__(None, None, None)
        self._sync_thread_patch.stop()
        reset_app_modules()
        for suffix in ("", "-wal", "-shm"):
            path = Path(f"{self.db_path}{suffix}")
            try:
                path.unlink()
            except OSError:
                pass

    def login_owner(self) -> str:
        """Аутентификация владельца: возвращаем подписанный initData.

        В демо-сиде владелец не привязан к Telegram, поэтому предварительно
        проставляем telegram_chat_id в БД и подписываем initData бот-токеном.
        """
        from app.database import SessionLocal
        from app.models import StaffUser

        telegram_id = "777000001"
        with SessionLocal() as db:
            owner = db.scalar(
                select(StaffUser).where(
                    StaffUser.role == "owner",
                    StaffUser.is_primary_owner.is_(True),
                )
            )
            self.assertIsNotNone(owner)
            assert owner is not None
            owner.telegram_chat_id = telegram_id
            db.commit()

        token = self.telegram_bot_token()
        user = {"id": int(telegram_id), "first_name": "Owner"}
        pairs = {
            "auth_date": str(int(time.time())),
            "query_id": f"AAO{telegram_id}",
            "user": json.dumps(user, separators=(",", ":"), ensure_ascii=False),
        }
        data_check_string = "\n".join(f"{key}={pairs[key]}" for key in sorted(pairs))
        secret_key = hmac.new(b"WebAppData", token.encode("utf-8"), hashlib.sha256).digest()
        pairs["hash"] = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
        init_data = "&".join(f"{key}={value}" for key, value in pairs.items())

        # Проверяем, что initData валиден и резолвится в владельца.
        response = self.client.post(
            "/api/auth/telegram-owner",
            headers={"Authorization": init_data},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return init_data

    def auth_headers(self, init_data: str) -> dict[str, str]:
        return {"Authorization": init_data}

    def telegram_bot_token(self) -> str:
        return os.environ["TELEGRAM_BOT_TOKEN"]

    def test_auth_url_requires_owner(self) -> None:
        response = self.client.get("/api/owner/integrations/google/auth-url")
        self.assertEqual(response.status_code, 401)

    def test_auth_url_returns_consent_link(self) -> None:
        token = self.login_owner()
        with patch("app.main.build_auth_url", return_value="https://accounts.google.com/consent?state=abc") as mock_build:
            response = self.client.get(
                "/api/owner/integrations/google/auth-url",
                headers=self.auth_headers(token),
            )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["authUrl"], "https://accounts.google.com/consent?state=abc")
        mock_build.assert_called_once()

    def test_status_reports_env_source_when_configured(self) -> None:
        token = self.login_owner()
        response = self.client.get(
            "/api/owner/integrations/google/status",
            headers=self.auth_headers(token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertTrue(body["configured"])
        self.assertEqual(body["source"], "env")
        self.assertEqual(body["redirectUri"], "https://example.com/callback")

    def test_put_credentials_saves_and_auth_url_uses_db_creds(self) -> None:
        token = self.login_owner()
        response = self.client.put(
            "/api/owner/integrations/google/credentials",
            headers=self.auth_headers(token),
            json={
                "clientId": "db-client.apps.googleusercontent.com",
                "clientSecret": "db-secret",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertTrue(body["ok"])
        self.assertEqual(body["source"], "db")
        self.assertTrue(
            body["redirectUri"].endswith("/api/owner/integrations/google/callback"),
            body["redirectUri"],
        )

        status = self.client.get(
            "/api/owner/integrations/google/status",
            headers=self.auth_headers(token),
        ).json()
        self.assertEqual(status["source"], "db")
        self.assertEqual(status["configured"], True)
        self.assertEqual(status["redirectUri"], body["redirectUri"])

        # OAuth-URL строится с учётными данными из БД (без мока).
        auth_url = self.client.get(
            "/api/owner/integrations/google/auth-url",
            headers=self.auth_headers(token),
        )
        self.assertEqual(auth_url.status_code, 200, auth_url.text)
        self.assertIn("client_id=db-client.apps.googleusercontent.com", auth_url.json()["authUrl"])

    def test_delete_credentials_restores_env_source(self) -> None:
        token = self.login_owner()
        self.client.put(
            "/api/owner/integrations/google/credentials",
            headers=self.auth_headers(token),
            json={"clientId": "db-client.apps.googleusercontent.com", "clientSecret": "db-secret"},
        )
        response = self.client.delete(
            "/api/owner/integrations/google/credentials",
            headers=self.auth_headers(token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {"ok": True})
        status = self.client.get(
            "/api/owner/integrations/google/status",
            headers=self.auth_headers(token),
        ).json()
        self.assertEqual(status["source"], "env")

    def test_credentials_endpoints_require_owner(self) -> None:
        response = self.client.get("/api/owner/integrations/google/status")
        self.assertEqual(response.status_code, 401)
        response = self.client.put(
            "/api/owner/integrations/google/credentials",
            json={"clientId": "x", "clientSecret": "y"},
        )
        self.assertEqual(response.status_code, 401)
        response = self.client.delete("/api/owner/integrations/google/credentials")
        self.assertEqual(response.status_code, 401)

    def test_put_credentials_rejects_empty(self) -> None:
        token = self.login_owner()
        response = self.client.put(
            "/api/owner/integrations/google/credentials",
            headers=self.auth_headers(token),
            json={"clientId": "", "clientSecret": ""},
        )
        self.assertEqual(response.status_code, 400, response.text)
        self.assertIn("Client ID", response.json()["detail"])

    def test_callback_exchanges_code_and_enables_integration(self) -> None:
        token = self.login_owner()
        # Получаем state из AppSetting после запроса auth-url
        with patch("app.main.build_auth_url", return_value="https://accounts.google.com/consent"):
            self.client.get(
                "/api/owner/integrations/google/auth-url",
                headers=self.auth_headers(token),
            )
        from app.database import SessionLocal
        from app.models import AppSetting

        with SessionLocal() as db:
            state = db.get(AppSetting, "google_calendar_oauth_state").value["state"]

        with patch(
            "app.main.exchange_code",
            return_value={"token": "t", "refresh_token": "r", "client_id": "c"},
        ), patch(
            "app.main.pull_calendar_changes",
            return_value={"ok": True, "skipped": False, "created": 0, "updated": 0, "cancelled": 0, "error": None},
        ):
            response = self.client.get(
                "/api/owner/integrations/google/callback",
                params={"code": "auth-code", "state": state},
            )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {"ok": True})

        with SessionLocal() as db:
            tokens = db.get(AppSetting, "google_calendar_tokens").value
            self.assertEqual(tokens["refresh_token"], "r")
            integrations = db.get(AppSetting, "owner_integrations").value
            self.assertTrue(integrations["googleCalendar"])

    def test_callback_rejects_wrong_state(self) -> None:
        response = self.client.get(
            "/api/owner/integrations/google/callback",
            params={"code": "auth-code", "state": "wrong-state"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["error"], "state_mismatch")

    def test_disconnect_clears_tokens_and_flag(self) -> None:
        token = self.login_owner()
        with patch("app.main.exchange_code", return_value={"token": "t", "refresh_token": "r"}):
            with patch("app.main.build_auth_url", return_value="https://accounts.google.com/consent"):
                self.client.get(
                    "/api/owner/integrations/google/auth-url",
                    headers=self.auth_headers(token),
                )
            from app.database import SessionLocal
            from app.models import AppSetting

            with SessionLocal() as db:
                state = db.get(AppSetting, "google_calendar_oauth_state").value["state"]
            with patch(
                "app.main.pull_calendar_changes",
                return_value={"ok": True, "skipped": False, "created": 0, "updated": 0, "cancelled": 0, "error": None},
            ):
                self.client.get(
                    "/api/owner/integrations/google/callback",
                    params={"code": "auth-code", "state": state},
                )

        response = self.client.post(
            "/api/owner/integrations/google/disconnect",
            headers=self.auth_headers(token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {"ok": True})

        from app.database import SessionLocal
        from app.models import AppSetting

        with SessionLocal() as db:
            self.assertIsNone(db.get(AppSetting, "google_calendar_tokens"))
            integrations = db.get(AppSetting, "owner_integrations").value
            self.assertFalse(integrations["googleCalendar"])

    def test_create_booking_calls_google_sync(self) -> None:
        token = self.login_owner()
        from app.database import SessionLocal
        from app.models import AppSetting

        # Подключаем интеграцию как в тесте выше
        with patch("app.main.build_auth_url", return_value="https://accounts.google.com/consent"):
            self.client.get("/api/owner/integrations/google/auth-url", headers=self.auth_headers(token))
        with SessionLocal() as db:
            state = db.get(AppSetting, "google_calendar_oauth_state").value["state"]
        with patch("app.main.exchange_code", return_value={"token": "t", "refresh_token": "r"}):
            with patch(
                "app.main.pull_calendar_changes",
                return_value={"ok": True, "skipped": False, "created": 0, "updated": 0, "cancelled": 0, "error": None},
            ):
                self.client.get("/api/owner/integrations/google/callback", params={"code": "c", "state": state})

        with patch("app.main.sync_booking_to_calendar", return_value=("evt-1", True)) as mock_sync:
            response = self.client.post(
                "/api/bookings",
                headers=self.auth_headers(token),
                json={
                    "clientId": "",
                    "clientName": "Иван",
                    "clientPhone": "+7 (999) 123-45-67",
                    "service": "Мойка",
                    "serviceId": "",
                    "date": "13.08.2026",
                    "time": "10:00",
                    "duration": 30,
                    "price": 500,
                    "status": "scheduled",
                    "paymentType": "cash",
                    "box": "Бокс 1",
                },
            )
        self.assertEqual(response.status_code, 200, response.text)
        mock_sync.assert_called_once()
        args = mock_sync.call_args
        self.assertEqual(args.kwargs.get("action"), "upsert")

    def test_sync_endpoint_requires_owner(self) -> None:
        response = self.client.post("/api/owner/integrations/google/sync")
        self.assertEqual(response.status_code, 401)

    def test_sync_endpoint_returns_pull_stats(self) -> None:
        token = self.login_owner()
        from app.database import SessionLocal
        from app.models import AppSetting

        # Подключаем интеграцию как в тестах выше.
        with patch("app.main.build_auth_url", return_value="https://accounts.google.com/consent"):
            self.client.get("/api/owner/integrations/google/auth-url", headers=self.auth_headers(token))
        with SessionLocal() as db:
            state = db.get(AppSetting, "google_calendar_oauth_state").value["state"]
        with patch("app.main.exchange_code", return_value={"token": "t", "refresh_token": "r"}), patch(
            "app.main.pull_calendar_changes",
            return_value={"ok": True, "skipped": False, "created": 0, "updated": 0, "cancelled": 0, "error": None},
        ):
            self.client.get("/api/owner/integrations/google/callback", params={"code": "c", "state": state})

        with patch(
            "app.main.pull_calendar_changes",
            return_value={"ok": True, "skipped": False, "created": 2, "updated": 1, "cancelled": 1, "error": None},
        ) as mock_pull:
            response = self.client.post(
                "/api/owner/integrations/google/sync",
                headers=self.auth_headers(token),
            )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["created"], 2)
        self.assertEqual(body["updated"], 1)
        self.assertEqual(body["cancelled"], 1)
        self.assertTrue(body["ok"])
        mock_pull.assert_called_once()

    def test_create_booking_sets_source_for_client_role(self) -> None:
        token = self.login_owner()
        response = self.client.post(
            "/api/bookings",
            headers=self.auth_headers(token),
            json={
                "clientId": "",
                "clientName": "Иван",
                "clientPhone": "+7 (999) 123-45-67",
                "service": "Мойка",
                "serviceId": "",
                "date": "13.08.2026",
                "time": "10:00",
                "duration": 30,
                "price": 500,
                "status": "scheduled",
                "paymentType": "cash",
                "box": "Бокс 1",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        # Владелец создаёт запись вручную -> source="manual"
        self.assertEqual(response.json()["source"], "manual")


if __name__ == "__main__":
    unittest.main()
"""
Unit tests for Shift Attendance API endpoints.

Covers:
- GET /api/owner/shift-attendance?period=invalid  → 422
- Worker requesting another worker's attendance via owner endpoint → 403

Requirements: 3.4, 3.6
"""
from __future__ import annotations

import os
import sys
import unittest
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


class AttendanceEndpointTests(unittest.TestCase):
    """Unit tests for shift attendance endpoints."""

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

        self._disable_owner_two_factor()
        self.owner_token = self._login_staff("owner", "owner")
        self.worker_token = self._login_staff("ivan", "master")

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

    def _login_staff(self, login: str, password: str) -> str:
        response = self.client.post(
            "/api/auth/staff/login",
            json={"login": login, "password": password},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["token"]

    def _disable_owner_two_factor(self) -> None:
        from app.database import SessionLocal
        from app.models import AppSetting

        with SessionLocal() as db:
            setting = db.get(AppSetting, "owner_security")
            if setting is not None:
                setting.value = {"twoFactor": False}
                db.commit()

    def _get_worker_id(self, login: str) -> str:
        """Return the staff user id for the given login."""
        from app.database import SessionLocal
        from app.models import StaffUser
        from sqlalchemy import select

        with SessionLocal() as db:
            worker = db.scalar(
                select(StaffUser).where(StaffUser.login == login)
            )
            self.assertIsNotNone(worker, f"Worker with login '{login}' not found")
            assert worker is not None
            return worker.id

    @staticmethod
    def _auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    # ------------------------------------------------------------------
    # Tests
    # ------------------------------------------------------------------

    def test_get_all_workers_attendance_with_invalid_period_returns_422(self) -> None:
        """GET /api/owner/shift-attendance?period=invalid returns 422.

        Requirements: 3.4
        """
        response = self.client.get(
            "/api/owner/shift-attendance",
            params={"period": "invalid"},
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_worker_requesting_another_workers_attendance_via_owner_endpoint_returns_403(
        self,
    ) -> None:
        """A worker calling GET /api/owner/workers/{worker_id}/shift-attendance
        (which is restricted to owner/admin) receives 403.

        This verifies that a worker cannot access another worker's attendance data
        through the owner-only endpoint.

        Requirements: 3.6
        """
        # Use "oleg" as the target worker whose attendance the requester tries to view
        target_worker_id = self._get_worker_id("oleg")

        response = self.client.get(
            f"/api/owner/workers/{target_worker_id}/shift-attendance",
            params={"period": "week"},
            headers=self._auth_headers(self.worker_token),
        )
        self.assertEqual(response.status_code, 403, response.text)


if __name__ == "__main__":
    unittest.main()

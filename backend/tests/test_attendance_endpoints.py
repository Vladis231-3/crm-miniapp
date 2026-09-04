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
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient


def reset_app_modules() -> None:
    for name in list(sys.modules):
        if name in {"app", "backend.app", "bot"} or name.startswith(
            ("app.", "backend.app.")
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

        self._link_staff("owner", "1001")
        self._link_staff("ivan", "1002")
        self.owner_token = self._telegram_init_data("1001")
        self.worker_token = self._telegram_init_data("1002")

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

    def _link_staff(self, login: str, telegram_id: str) -> None:
        from sqlalchemy import select

        from app.database import SessionLocal
        from app.models import StaffUser

        with SessionLocal() as db:
            staff = db.scalar(select(StaffUser).where(StaffUser.login == login))
            self.assertIsNotNone(staff, f"Staff user '{login}' not found")
            assert staff is not None
            staff.telegram_chat_id = telegram_id
            db.commit()

    @staticmethod
    def _telegram_init_data(telegram_id: str) -> str:
        from urllib.parse import urlencode

        return urlencode({"user": f'{{"id":{telegram_id}}}'})

    def _get_worker_id(self, login: str) -> str:
        """Return the staff user id for the given login."""
        from sqlalchemy import select

        from app.database import SessionLocal
        from app.models import StaffUser

        with SessionLocal() as db:
            worker = db.scalar(
                select(StaffUser).where(StaffUser.login == login)
            )
            self.assertIsNotNone(worker, f"Worker with login '{login}' not found")
            assert worker is not None
            return worker.id

    @staticmethod
    def _auth_headers(init_data: str) -> dict[str, str]:
        return {"Authorization": init_data}

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

    def test_owner_can_open_shift_for_masters_immediately_approved(self) -> None:
        """Owner opens a shift for masters: immediately approved, visible in the
        shift list and counted in masters' attendance.
        """
        ivan_id = self._get_worker_id("ivan")
        oleg_id = self._get_worker_id("oleg")

        create_response = self.client.post(
            "/api/owner/shift-openings",
            headers=self._auth_headers(self.owner_token),
            json={"masterIds": [ivan_id, oleg_id], "note": "Смена открыта владельцем"},
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)
        payload = create_response.json()
        self.assertEqual(payload["status"], "approved")
        self.assertTrue(payload["reviewedAt"])
        self.assertEqual(payload["floorPhotoUrl"], "")
        checked_masters = {item["workerId"] for item in payload["masters"] if item["checked"]}
        self.assertEqual(checked_masters, {ivan_id, oleg_id})

        # Без выбранных мастеров — ошибка валидации
        empty_response = self.client.post(
            "/api/owner/shift-openings",
            headers=self._auth_headers(self.owner_token),
            json={"masterIds": [], "note": ""},
        )
        self.assertEqual(empty_response.status_code, 400, empty_response.text)

        # Только владелец может открывать смену через этот эндпоинт
        self._link_staff("admin", "1003")
        admin_token = self._telegram_init_data("1003")
        forbidden_response = self.client.post(
            "/api/owner/shift-openings",
            headers=self._auth_headers(admin_token),
            json={"masterIds": [ivan_id]},
        )
        self.assertEqual(forbidden_response.status_code, 403, forbidden_response.text)

        # Открытие видно в общем списке смен как подтверждённое
        owner_list = self.client.get(
            "/api/admin/shift-inspections",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(owner_list.status_code, 200, owner_list.text)
        self.assertTrue(any(item["id"] == payload["id"] and item["status"] == "approved" for item in owner_list.json()))

        # Открытие смены владельцем попадает в посещаемость мастеров
        attendance = self.client.get(
            "/api/owner/shift-attendance",
            params={"period": "month"},
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(attendance.status_code, 200, attendance.text)
        by_worker = {item["workerId"]: item for item in attendance.json()}
        self.assertEqual(by_worker[ivan_id]["shiftCount"], 1)
        self.assertEqual(by_worker[oleg_id]["shiftCount"], 1)

        # Выход на смену добавляет мастеру 1000 ₽ к ЗП за каждый выход
        salary = self.client.get(
            f"/api/owner/workers/{ivan_id}/salary-detail",
            params={"period": "month"},
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(salary.status_code, 200, salary.text)
        salary_payload = salary.json()
        self.assertEqual(salary_payload["shiftCount"], 1)
        self.assertEqual(salary_payload["salaryPerShift"], 1000)
        self.assertEqual(salary_payload["balanceToPay"], 1000)
        # В salary-detail тоже возвращаются даты выходов
        expected_date = datetime.strptime(payload["createdAt"][:10], "%Y-%m-%d").strftime("%d.%m.%Y")
        self.assertEqual(salary_payload["shiftDates"], [expected_date])

    def test_new_worker_gets_default_shift_pay_1000(self) -> None:
        """Новый сотрудник получает оклад за выход 1000 ₽ по умолчанию."""
        unique_login = f"newmaster-{uuid4().hex[:8]}"
        response = self.client.post(
            "/api/workers",
            headers=self._auth_headers(self.owner_token),
            json={
                "role": "worker",
                "name": "Новый мастер",
                "login": unique_login,
                "password": "password123",
                "percent": 50,
                "salaryBase": 0,
                "phone": "",
                "email": "",
                "telegramChatId": "",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["salaryPerShift"], 1000)

    def test_worker_reads_own_shift_attendance(self) -> None:
        """GET /api/worker/shift-attendance своим мастером → 200 со своей структурой."""
        ivan_id = self._get_worker_id("ivan")
        response = self.client.get(
            "/api/worker/shift-attendance",
            params={"period": "month"},
            headers=self._auth_headers(self.worker_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["workerId"], ivan_id)
        self.assertIn("shiftCount", body)
        self.assertIn("shiftDates", body)

    def test_non_worker_rejected_from_own_shift_attendance(self) -> None:
        """GET /api/worker/shift-attendance владельцем → 403."""
        response = self.client.get(
            "/api/worker/shift-attendance",
            params={"period": "month"},
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 403, response.text)

    def test_owner_reads_worker_shift_attendance(self) -> None:
        """GET /api/owner/workers/{id}/shift-attendance владельцем → 200."""
        ivan_id = self._get_worker_id("ivan")
        response = self.client.get(
            f"/api/owner/workers/{ivan_id}/shift-attendance",
            params={"period": "month"},
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["workerId"], ivan_id)

    def test_owner_shift_attendance_unknown_worker_returns_404(self) -> None:
        """GET /api/owner/workers/{id}/shift-attendance по несуществующему → 404."""
        response = self.client.get(
            "/api/owner/workers/no-such-worker/shift-attendance",
            params={"period": "month"},
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 404, response.text)


if __name__ == "__main__":
    unittest.main()

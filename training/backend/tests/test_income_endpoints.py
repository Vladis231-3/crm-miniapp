"""
Unit tests for Income API endpoints.

Covers:
- GET /api/owner/incomes  → 200 with empty list when no records exist
- POST /api/owner/incomes with valid data → 201
- POST /api/owner/incomes with amount=0  → 422
- POST /api/owner/incomes with empty source → 422

Requirements: 1.3, 1.4, 1.5, 1.6, 1.7
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


class IncomeEndpointTests(unittest.TestCase):
    """Unit tests for /api/owner/incomes endpoints."""

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

        # Disable 2FA and log in as owner
        self._disable_owner_two_factor()
        self.owner_token = self._login_staff("owner", "owner")

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

    @staticmethod
    def _auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    def _valid_income_payload(self, **overrides) -> dict:
        payload = {
            "amount": 5000,
            "source": "Аренда помещения",
            "note": "Январь 2025",
            "date": "15.01.2025",
        }
        payload.update(overrides)
        return payload

    # ------------------------------------------------------------------
    # Tests
    # ------------------------------------------------------------------

    def test_get_incomes_returns_200_with_empty_list_when_no_records(self) -> None:
        """GET /api/owner/incomes returns 200 and an empty list when no incomes exist.

        Requirements: 1.6
        """
        response = self.client.get(
            "/api/owner/incomes",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 0)

    def test_post_income_with_valid_data_returns_201(self) -> None:
        """POST /api/owner/incomes with valid data returns 201 and the created record.

        Requirements: 1.3, 1.7
        """
        payload = self._valid_income_payload()
        response = self.client.post(
            "/api/owner/incomes",
            headers=self._auth_headers(self.owner_token),
            json=payload,
        )
        self.assertEqual(response.status_code, 201, response.text)
        data = response.json()
        self.assertEqual(data["amount"], payload["amount"])
        self.assertEqual(data["source"], payload["source"])
        self.assertEqual(data["note"], payload["note"])
        self.assertEqual(data["date"], payload["date"])
        self.assertIn("id", data)
        self.assertIn("createdById", data)
        self.assertIn("createdAt", data)

    def test_post_income_with_amount_zero_returns_422(self) -> None:
        """POST /api/owner/incomes with amount=0 returns 422.

        Requirements: 1.4
        """
        payload = self._valid_income_payload(amount=0)
        response = self.client.post(
            "/api/owner/incomes",
            headers=self._auth_headers(self.owner_token),
            json=payload,
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_post_income_with_empty_source_returns_422(self) -> None:
        """POST /api/owner/incomes with source="" returns 422.

        Requirements: 1.5
        """
        payload = self._valid_income_payload(source="")
        response = self.client.post(
            "/api/owner/incomes",
            headers=self._auth_headers(self.owner_token),
            json=payload,
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_post_income_with_whitespace_only_source_returns_422(self) -> None:
        """POST /api/owner/incomes with source containing only spaces returns 422.

        Requirements: 1.5
        """
        payload = self._valid_income_payload(source="   ")
        response = self.client.post(
            "/api/owner/incomes",
            headers=self._auth_headers(self.owner_token),
            json=payload,
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_created_income_appears_in_list(self) -> None:
        """After POST, the new income record appears in GET /api/owner/incomes.

        Requirements: 1.6, 1.7
        """
        payload = self._valid_income_payload(amount=12000, source="Продажа товаров")
        create_response = self.client.post(
            "/api/owner/incomes",
            headers=self._auth_headers(self.owner_token),
            json=payload,
        )
        self.assertEqual(create_response.status_code, 201, create_response.text)
        created_id = create_response.json()["id"]

        list_response = self.client.get(
            "/api/owner/incomes",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(list_response.status_code, 200, list_response.text)
        ids = [item["id"] for item in list_response.json()]
        self.assertIn(created_id, ids)

    def test_post_income_with_negative_amount_returns_422(self) -> None:
        """POST /api/owner/incomes with a negative amount returns 422.

        Requirements: 1.4
        """
        payload = self._valid_income_payload(amount=-100)
        response = self.client.post(
            "/api/owner/incomes",
            headers=self._auth_headers(self.owner_token),
            json=payload,
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_post_income_with_amount_exceeding_max_returns_422(self) -> None:
        """POST /api/owner/incomes with amount > 10_000_000 returns 422.

        Requirements: 1.4
        """
        payload = self._valid_income_payload(amount=10_000_001)
        response = self.client.post(
            "/api/owner/incomes",
            headers=self._auth_headers(self.owner_token),
            json=payload,
        )
        self.assertEqual(response.status_code, 422, response.text)


if __name__ == "__main__":
    unittest.main()

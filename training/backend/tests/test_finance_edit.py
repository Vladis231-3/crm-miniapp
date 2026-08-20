"""
Unit tests for Finance Edit API endpoints.

Covers:
- PATCH /api/expenses/{id}
- PATCH /api/owner/incomes/{id}

Tasks: 8.1, 8.2
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


class FinanceEditTestBase(unittest.TestCase):
    """Base class with shared setUp/tearDown and helpers."""

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

    def _login_client(self, name: str = "Алиса Иванова", phone: str = "+7 (999) 111-22-33") -> str:
        response = self.client.post(
            "/api/auth/client",
            json={
                "profile": {
                    "name": name,
                    "phone": phone,
                    "car": "Toyota Camry",
                    "plate": "A123BC",
                },
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["token"]

    def _create_worker_and_login(
        self,
        login: str = "testworker",
        password: str = "workerpass",
        role: str = "worker",
    ) -> str:
        """Create a worker/accountant via owner API and return their token."""
        create_resp = self.client.post(
            "/api/workers",
            headers=self._auth_headers(self.owner_token),
            json={
                "role": role,
                "name": "Test Worker",
                "login": login,
                "password": password,
                "percent": 0,
                "salaryBase": 0,
            },
        )
        self.assertEqual(create_resp.status_code, 200, create_resp.text)
        return self._login_staff(login, password)

    def _valid_expense_payload(self, **overrides) -> dict:
        payload = {
            "title": "Аренда помещения",
            "amount": 15000,
            "category": "Аренда",
            "date": "10.01.2025",
            "note": "Январь 2025",
        }
        payload.update(overrides)
        return payload

    def _create_expense(self, **overrides) -> dict:
        """Create an expense via POST and return the created record."""
        payload = self._valid_expense_payload(**overrides)
        response = self.client.post(
            "/api/expenses",
            headers=self._auth_headers(self.owner_token),
            json=payload,
        )
        self.assertIn(response.status_code, (200, 201), response.text)
        return response.json()

    def _valid_income_payload(self, **overrides) -> dict:
        payload = {
            "amount": 5000,
            "source": "Аренда помещения",
            "note": "Январь 2025",
            "date": "15.01.2025",
        }
        payload.update(overrides)
        return payload

    def _create_income(self, **overrides) -> dict:
        """Create an income via POST and return the created record."""
        payload = self._valid_income_payload(**overrides)
        response = self.client.post(
            "/api/owner/incomes",
            headers=self._auth_headers(self.owner_token),
            json=payload,
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()


# ===========================================================================
# Task 8.1 — PATCH /api/expenses/{id}
# ===========================================================================

class PatchExpenseTests(FinanceEditTestBase):
    """Unit tests for PATCH /api/expenses/{id}."""

    def test_patch_expense_updates_only_provided_fields(self) -> None:
        """PATCH with only amount updates amount; title, category, date, note stay unchanged."""
        expense = self._create_expense()
        original_title = expense["title"]
        original_category = expense["category"]
        original_date = expense["date"]
        original_note = expense["note"]
        new_amount = 99999

        response = self.client.patch(
            f"/api/expenses/{expense['id']}",
            headers=self._auth_headers(self.owner_token),
            json={"amount": new_amount},
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertEqual(data["amount"], new_amount)
        self.assertEqual(data["title"], original_title)
        self.assertEqual(data["category"], original_category)
        self.assertEqual(data["date"], original_date)
        self.assertEqual(data["note"], original_note)

    def test_patch_expense_returns_404_for_unknown_id(self) -> None:
        """PATCH with a non-existent expense ID returns 404."""
        response = self.client.patch(
            "/api/expenses/nonexistent-id-12345",
            headers=self._auth_headers(self.owner_token),
            json={"amount": 1000},
        )
        self.assertEqual(response.status_code, 404, response.text)

    def test_patch_expense_returns_422_for_empty_body(self) -> None:
        """PATCH with an empty JSON body {} returns 422 (no fields to update)."""
        expense = self._create_expense()
        response = self.client.patch(
            f"/api/expenses/{expense['id']}",
            headers=self._auth_headers(self.owner_token),
            json={},
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_patch_expense_returns_422_for_negative_amount(self) -> None:
        """PATCH with a negative amount returns 422."""
        expense = self._create_expense()
        response = self.client.patch(
            f"/api/expenses/{expense['id']}",
            headers=self._auth_headers(self.owner_token),
            json={"amount": -500},
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_patch_expense_returns_422_for_invalid_date_format(self) -> None:
        """PATCH with a date not matching DD.MM.YYYY returns 422."""
        expense = self._create_expense()
        response = self.client.patch(
            f"/api/expenses/{expense['id']}",
            headers=self._auth_headers(self.owner_token),
            json={"date": "2025-01-10"},
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_patch_expense_returns_422_for_whitespace_title(self) -> None:
        """PATCH with a whitespace-only title returns 422."""
        expense = self._create_expense()
        response = self.client.patch(
            f"/api/expenses/{expense['id']}",
            headers=self._auth_headers(self.owner_token),
            json={"title": "   "},
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_patch_expense_returns_403_for_worker_role(self) -> None:
        """PATCH by a worker returns 403."""
        expense = self._create_expense()
        worker_token = self._create_worker_and_login(
            login="testworker1", password="workerpass1", role="worker"
        )
        response = self.client.patch(
            f"/api/expenses/{expense['id']}",
            headers=self._auth_headers(worker_token),
            json={"amount": 1000},
        )
        self.assertEqual(response.status_code, 403, response.text)

    def test_patch_expense_returns_403_for_client_role(self) -> None:
        """PATCH by a client returns 403."""
        expense = self._create_expense()
        client_token = self._login_client()
        response = self.client.patch(
            f"/api/expenses/{expense['id']}",
            headers=self._auth_headers(client_token),
            json={"amount": 1000},
        )
        self.assertEqual(response.status_code, 403, response.text)


# ===========================================================================
# Task 8.2 — PATCH /api/owner/incomes/{id}
# ===========================================================================

class PatchIncomeTests(FinanceEditTestBase):
    """Unit tests for PATCH /api/owner/incomes/{id}."""

    def test_patch_income_updates_only_provided_fields(self) -> None:
        """PATCH with only amount updates amount; source, note, date stay unchanged."""
        income = self._create_income()
        original_source = income["source"]
        original_note = income["note"]
        original_date = income["date"]
        new_amount = 77777

        response = self.client.patch(
            f"/api/owner/incomes/{income['id']}",
            headers=self._auth_headers(self.owner_token),
            json={"amount": new_amount},
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertEqual(data["amount"], new_amount)
        self.assertEqual(data["source"], original_source)
        self.assertEqual(data["note"], original_note)
        self.assertEqual(data["date"], original_date)

    def test_patch_income_returns_404_for_unknown_id(self) -> None:
        """PATCH with a non-existent income ID returns 404."""
        response = self.client.patch(
            "/api/owner/incomes/nonexistent-id-99999",
            headers=self._auth_headers(self.owner_token),
            json={"amount": 1000},
        )
        self.assertEqual(response.status_code, 404, response.text)

    def test_patch_income_returns_422_for_empty_body(self) -> None:
        """PATCH with an empty JSON body {} returns 422 (no fields to update)."""
        income = self._create_income()
        response = self.client.patch(
            f"/api/owner/incomes/{income['id']}",
            headers=self._auth_headers(self.owner_token),
            json={},
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_patch_income_returns_422_for_negative_amount(self) -> None:
        """PATCH with a negative amount returns 422."""
        income = self._create_income()
        response = self.client.patch(
            f"/api/owner/incomes/{income['id']}",
            headers=self._auth_headers(self.owner_token),
            json={"amount": -100},
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_patch_income_returns_422_for_whitespace_source(self) -> None:
        """PATCH with a whitespace-only source returns 422."""
        income = self._create_income()
        response = self.client.patch(
            f"/api/owner/incomes/{income['id']}",
            headers=self._auth_headers(self.owner_token),
            json={"source": "   "},
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_patch_income_clears_note_when_null_passed(self) -> None:
        """PATCH with note=null explicitly clears the note field."""
        income = self._create_income(note="Важная заметка")
        self.assertIsNotNone(income["note"])

        response = self.client.patch(
            f"/api/owner/incomes/{income['id']}",
            headers=self._auth_headers(self.owner_token),
            json={"note": None},
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertIsNone(data["note"])

    def test_patch_income_returns_403_for_accountant_role(self) -> None:
        """PATCH by an accountant returns 403 (only owner can edit incomes)."""
        income = self._create_income()
        accountant_token = self._create_worker_and_login(
            login="testaccountant1", password="accpass1", role="accountant"
        )
        response = self.client.patch(
            f"/api/owner/incomes/{income['id']}",
            headers=self._auth_headers(accountant_token),
            json={"amount": 1000},
        )
        self.assertEqual(response.status_code, 403, response.text)

    def test_patch_income_returns_403_for_worker_role(self) -> None:
        """PATCH by a worker returns 403."""
        income = self._create_income()
        worker_token = self._create_worker_and_login(
            login="testworker2", password="workerpass2", role="worker"
        )
        response = self.client.patch(
            f"/api/owner/incomes/{income['id']}",
            headers=self._auth_headers(worker_token),
            json={"amount": 1000},
        )
        self.assertEqual(response.status_code, 403, response.text)


if __name__ == "__main__":
    unittest.main()

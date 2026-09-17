from __future__ import annotations

import hashlib
import hmac
import json
import os
import sys
import time
import unittest
from datetime import datetime, timedelta
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


class ServiceResourceGroupValidationTests(unittest.TestCase):
    """PUT /api/settings/services: clamp resource_group/piggyTarget.

    Регресс к fix(money): произвольная строка в resourceGroup давала piggy=0
    и расхождение с фронтом; мусор в piggyTarget игнорился сплитом молча.
    """

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
        os.environ.pop("WEBAPP_URL", None)
        os.environ.pop("PERMANENT_TELEGRAM_OWNERS", None)
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

    @staticmethod
    def auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": token}

    @staticmethod
    def next_active_date() -> str:
        candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        for offset in range(1, 8):
            next_date = candidate + timedelta(days=offset)
            if next_date.weekday() != 6:
                return next_date.strftime("%d.%m.%Y")
        raise AssertionError("Unable to find active schedule day")

    def _bootstrap_services(self, owner_token: str) -> list[dict]:
        bootstrap = self.client.get(
            "/api/auth/session", headers=self.auth_headers(owner_token)
        ).json()
        return bootstrap["services"]

    def _save(self, owner_token: str, services: list[dict]):
        return self.client.put(
            "/api/settings/services",
            headers=self.auth_headers(owner_token),
            json=services,
        )

    def test_invalid_resource_group_falls_back_to_category(self) -> None:
        owner_token = self.login_staff("owner", "owner")
        services = self._bootstrap_services(owner_token)
        services[0]["category"] = "Детейлинг"
        services[0]["resourceGroup"] = "foo"
        response = self._save(owner_token, services)
        self.assertEqual(response.status_code, 200, response.text)
        saved = next(s for s in response.json() if s["id"] == services[0]["id"])
        self.assertEqual(saved["resourceGroup"], "detailing")

        services = self._bootstrap_services(owner_token)
        target = next(s for s in services if s["id"] == saved["id"])
        target["category"] = "Мойка"
        target["resourceGroup"] = "  GARBAGE  "
        response = self._save(owner_token, services)
        self.assertEqual(response.status_code, 200, response.text)
        saved = next(s for s in response.json() if s["id"] == target["id"])
        self.assertEqual(saved["resourceGroup"], "wash")

    def test_valid_resource_group_override_preserved(self) -> None:
        owner_token = self.login_staff("owner", "owner")
        services = self._bootstrap_services(owner_token)
        services[0]["category"] = "Детейлинг"
        services[0]["resourceGroup"] = "wash"
        response = self._save(owner_token, services)
        self.assertEqual(response.status_code, 200, response.text)
        saved = next(s for s in response.json() if s["id"] == services[0]["id"])
        self.assertEqual(saved["resourceGroup"], "wash")

    def test_invalid_piggy_target_cleared(self) -> None:
        owner_token = self.login_staff("owner", "owner")
        services = self._bootstrap_services(owner_token)
        services[0]["piggyTarget"] = "foo"
        response = self._save(owner_token, services)
        self.assertEqual(response.status_code, 200, response.text)
        saved = next(s for s in response.json() if s["id"] == services[0]["id"])
        self.assertEqual(saved["piggyTarget"], "")

    def test_valid_piggy_target_preserved(self) -> None:
        owner_token = self.login_staff("owner", "owner")
        services = self._bootstrap_services(owner_token)
        services[0]["piggyTarget"] = "detailing"
        response = self._save(owner_token, services)
        self.assertEqual(response.status_code, 200, response.text)
        saved = next(s for s in response.json() if s["id"] == services[0]["id"])
        self.assertEqual(saved["piggyTarget"], "detailing")

    def test_piggy_target_redirects_main_deposit(self) -> None:
        """piggy_target перебивает группу вклада основной услуги.

        s2 (Детейлинг) с piggy_target=wash: deposit_24percent должен лечь
        в копилку мойки, а не детейлинга.
        """
        from app.database import SessionLocal
        from app.models import Service

        admin_token = self.login_staff("admin", "admin")
        owner_token = self.login_staff("owner", "owner")
        with SessionLocal() as db:
            svc = db.get(Service, "s2")
            self.assertIsNotNone(svc)
            assert svc is not None
            svc.piggy_target = "wash"
            svc.piggy_pay_type = ""
            svc.piggy_pay_value = 0
            db.commit()

        create_response = self.client.post(
            "/api/bookings",
            headers=self.auth_headers(admin_token),
            json={
                "clientId": "",
                "clientName": "Piggy Target Client",
                "clientPhone": "+7 (999) 222-33-44",
                "service": "Полировка стекла",
                "serviceId": "s2",
                "date": self.next_active_date(),
                "time": "11:00",
                "duration": 60,
                "price": 10000,
                "status": "scheduled",
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
                "box": "Детейлинг зона",
                "paymentType": "cash",
                "car": "Lada Vesta",
                "plate": "A123BC",
            },
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)
        booking_id = create_response.json()["id"]
        complete_response = self.client.patch(
            f"/api/bookings/{booking_id}",
            headers=self.auth_headers(admin_token),
            json={"status": "completed", "paymentSettled": True},
        )
        self.assertEqual(complete_response.status_code, 200, complete_response.text)

        split_response = self.client.get(
            f"/api/owner/bookings/{booking_id}/money-split",
            headers=self.auth_headers(owner_token),
        )
        self.assertEqual(split_response.status_code, 200, split_response.text)
        split = split_response.json()
        deposits = [
            t
            for t in split["piggyTransactions"]
            if t["transactionType"] == "deposit_24percent"
        ]
        self.assertEqual(len(deposits), 1)
        self.assertEqual(deposits[0]["resourceGroup"], "wash")
        self.assertEqual(split["piggyTarget"], "wash")

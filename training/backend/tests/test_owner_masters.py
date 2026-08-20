"""Владельцы с дополнительной ролью мастера (extra_roles=["worker"]).

Сценарий desktop-режима (PERMANENT_TELEGRAM_OWNERS пуст):
- owner-мастер (extra_roles=["worker"]) попадает в список мастеров bootstrap,
  назначаем на записи, виден в зарплатной ведомости и настройках зарплаты;
- владелец без extra_roles в списки мастеров НЕ попадает и НЕ может
  получать зарплатные операции как мастер.
"""

from __future__ import annotations

import json
import os
import sys
import unittest
import urllib.parse
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models import StaffUser
from app.security import hash_password


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


def build_init_data(telegram_id: str) -> str:
    return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})


class OwnerMasterTests(unittest.TestCase):
    ADMIN_TG_ID = "777101"
    OWNER_TG_1 = "77710101"
    OWNER_TG_2 = "77710102"

    def setUp(self) -> None:
        data_dir = Path(__file__).resolve().parents[1] / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = data_dir / f"test_owner_masters_{uuid4().hex}.sqlite3"
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
        os.environ.pop("PERMANENT_TELEGRAM_OWNERS", None)

        self.restart_app()
        self._set_staff_telegram_ids()
        self._add_owner_rows()
        self.admin_token = build_init_data(self.ADMIN_TG_ID)

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

    def _set_staff_telegram_ids(self) -> None:
        from app.database import SessionLocal

        with SessionLocal() as db:
            staff = db.scalars(select(StaffUser)).all()
            for item in staff:
                if item.login == "admin":
                    item.telegram_chat_id = self.ADMIN_TG_ID
            db.commit()

    def _add_owner_rows(self) -> None:
        from app.database import SessionLocal

        with SessionLocal() as db:
            db.add_all(
                [
                    StaffUser(
                        id="owner-tg-1",
                        login="owner_tg_1",
                        password_hash=hash_password("owner-tg-1"),
                        role="owner",
                        name="Владелец ТГ 1",
                        phone="",
                        email="",
                        city="",
                        experience="",
                        specialty="",
                        about="",
                        telegram_chat_id=self.OWNER_TG_1,
                        is_primary_owner=False,
                        default_percent=0,
                        salary_base=0,
                        salary_per_shift=0,
                        available=True,
                        active=True,
                        extra_roles=["worker"],
                    ),
                    StaffUser(
                        id="owner-tg-2",
                        login="owner_tg_2",
                        password_hash=hash_password("owner-tg-2"),
                        role="owner",
                        name="Владелец ТГ 2",
                        phone="",
                        email="",
                        city="",
                        experience="",
                        specialty="",
                        about="",
                        telegram_chat_id=self.OWNER_TG_2,
                        is_primary_owner=False,
                        default_percent=0,
                        salary_base=0,
                        salary_per_shift=0,
                        available=True,
                        active=True,
                        extra_roles=[],
                    ),
                ]
            )
            db.commit()

    @staticmethod
    def auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": token}

    def test_owner_master_in_bootstrap_workers(self) -> None:
        response = self.client.get("/api/auth/session", headers=self.auth_headers(self.admin_token))
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        worker_ids = {worker["id"] for worker in payload["workers"]}
        self.assertIn("owner-tg-1", worker_ids, "owner-мастер должен попадать в список мастеров")
        self.assertNotIn("owner-tg-2", worker_ids, "владелец без extra_roles не должен быть в списке мастеров")
        self.assertNotIn("owner-1", worker_ids, "сидовый владелец не должен быть в списке мастеров")
        owner_1 = next(worker for worker in payload["workers"] if worker["id"] == "owner-tg-1")
        self.assertEqual(owner_1["role"], "owner")
        self.assertIsNotNone(owner_1.get("payrollSummary"), "у owner-мастера должна быть зарплатная сводка")

    def test_owner_master_assignable_to_booking(self) -> None:
        booking_date = self._next_active_date()
        response = self.client.post(
            "/api/bookings",
            headers=self.auth_headers(self.admin_token),
            json={
                "clientId": "",
                "clientName": "Owner Master Client",
                "clientPhone": "+7 (999) 111-22-33",
                "service": "Мойка базовая",
                "serviceId": "s1",
                "date": booking_date,
                "time": "10:00",
                "duration": 30,
                "price": 1200,
                "status": "scheduled",
                "workers": [{"workerId": "owner-tg-1", "workerName": "Владелец ТГ 1", "percent": 30}],
                "box": "Бокс 1",
                "paymentType": "cash",
                "car": "Lada Vesta",
                "plate": "A123BC",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)

    def test_payroll_entry_for_owner_master(self) -> None:
        response = self.client.post(
            "/api/payroll/entries",
            headers=self.auth_headers(self.admin_token),
            json={"workerId": "owner-tg-1", "kind": "bonus", "amount": 1000, "note": "Премия владельцу-мастеру"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["id"], "owner-tg-1")

    def test_payroll_entry_rejected_for_plain_owner(self) -> None:
        response = self.client.post(
            "/api/payroll/entries",
            headers=self.auth_headers(self.admin_token),
            json={"workerId": "owner-tg-2", "kind": "bonus", "amount": 1000, "note": "Премия"},
        )
        self.assertEqual(response.status_code, 404, response.text)

    def test_admin_payroll_settings_include_owner_master(self) -> None:
        response = self.client.get(
            "/api/admin/workers/payroll?period=all",
            headers=self.auth_headers(self.admin_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        worker_ids = {worker["id"] for worker in response.json()}
        self.assertIn("owner-tg-1", worker_ids)
        self.assertNotIn("owner-tg-2", worker_ids)

        save_response = self.client.put(
            "/api/admin/workers/payroll",
            headers=self.auth_headers(self.admin_token),
            json=[{"id": "owner-tg-1", "name": "Владелец ТГ 1", "percent": 40, "salaryBase": 0, "active": True}],
        )
        self.assertEqual(save_response.status_code, 200, save_response.text)
        saved = {worker["id"]: worker for worker in save_response.json()}
        self.assertIn("owner-tg-1", saved)
        self.assertEqual(saved["owner-tg-1"]["defaultPercent"], 40)

    def _next_active_date(self) -> str:
        candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        for offset in range(1, 8):
            next_date = candidate + timedelta(days=offset)
            if next_date.weekday() != 6:
                return next_date.strftime("%d.%m.%Y")
        raise AssertionError("Unable to find active schedule day")

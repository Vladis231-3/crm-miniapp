from __future__ import annotations

"""Regression: аренда бокса должна попадать в самообслуживание копилки.

Симптом: wash.selfService* были 0 при живых завершённых записях
аренды бокса — они ошибочно падали в классическую мойку.
"""

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
        if (
            name == "app"
            or name.startswith(("app.", "backend.app."))
            or name == "backend.app"
            or name == "bot"
        ):
            del sys.modules[name]


def build_init_data(telegram_id: str) -> str:
    return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})


class PiggySelfServiceBoxTests(unittest.TestCase):
    OWNER_TG_ID = "777971"
    WORKER_TG_ID = "777973"

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
        self._set_staff_telegram_ids()
        self.owner_token = build_init_data(self.OWNER_TG_ID)

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

    def _set_staff_telegram_ids(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser
        from sqlalchemy import select

        with SessionLocal() as db:
            owner = db.scalar(select(StaffUser).where(StaffUser.login == "owner"))
            worker = db.scalar(select(StaffUser).where(StaffUser.role == "worker"))
            if owner is not None:
                owner.telegram_chat_id = self.OWNER_TG_ID
            if worker is not None:
                worker.telegram_chat_id = self.WORKER_TG_ID
            db.commit()

    def _piggy_bank(self) -> dict:
        response = self.client.get(
            "/api/owner/piggy-bank",
            headers={"Authorization": self.owner_token},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_helper_classifies_all_cases(self) -> None:
        from app.main import _is_self_service_wash
        from app.models import Service

        classic = Service(
            id="s-c", name="Мойка базовая", category="Мойка", price=1000,
            duration=30, resource_group="wash", wash_type="classic",
        )
        self_service = Service(
            id="s-s", name="Мойка самообслуживания", category="Мойка", price=1000,
            duration=60, resource_group="wash", wash_type="self_service",
        )
        box_rental = Service(
            id="s-b", name="Аренда бокса", category="Аренда бокса", price=600,
            duration=60, resource_group="wash", wash_type="",
        )
        detailing = Service(
            id="s-d", name="Полировка", category="Детейлинг", price=3500,
            duration=60, resource_group="detailing", wash_type="",
        )
        self.assertFalse(_is_self_service_wash(classic))
        self.assertTrue(_is_self_service_wash(self_service))
        self.assertTrue(_is_self_service_wash(box_rental))
        self.assertFalse(_is_self_service_wash(detailing))
        self.assertFalse(_is_self_service_wash(None))

    def test_box_rental_revenue_in_self_service_bucket(self) -> None:
        from app.database import SessionLocal
        from app.models import Booking, Client, Service

        suffix = uuid4().hex[:10]
        with SessionLocal() as db:
            client = Client(
                id=f"c-{suffix}", name="Клиент Само",
                phone=f"+7999001{suffix[:4]}", car="Kia",
            )
            service = Service(
                id=f"s-{suffix}", name="Аренда бокса",
                category="Аренда бокса", price=2000, duration=60,
                resource_group="wash", wash_type="",
            )
            db.add_all([client, service])
            db.flush()
            booking = Booking(
                id=f"b-{suffix}", client_id=client.id,
                client_name=client.name, client_phone=client.phone,
                service=service.name, service_id=service.id,
                date="03.08.2026", time="11:00", duration=60,
                price=2000, status="completed", box="Бокс 1",
                payment_type="cash",
            )
            db.add(booking)
            db.commit()

        data = self._piggy_bank()
        wash = data["wash"]
        # Аренда бокса обязана попасть в самообслуживание, а не в классику.
        self.assertGreaterEqual(wash["selfServiceRevenue"], 2000)
        self.assertEqual(wash["classicRevenue"], 0)

    def test_box_rental_deposit_in_self_service_piggy(self) -> None:
        from app.database import SessionLocal
        from app.models import Booking, Client, PiggyBankTransaction, Service

        suffix = uuid4().hex[:10]
        with SessionLocal() as db:
            client = Client(
                id=f"c-{suffix}", name="Клиент Само",
                phone=f"+7999002{suffix[:4]}", car="Kia",
            )
            service = Service(
                id=f"s-{suffix}", name="Аренда бокса",
                category="Аренда бокса", price=2000, duration=60,
                resource_group="wash", wash_type="",
            )
            db.add_all([client, service])
            db.flush()
            booking = Booking(
                id=f"b-{suffix}", client_id=client.id,
                client_name=client.name, client_phone=client.phone,
                service=service.name, service_id=service.id,
                date="04.08.2026", time="12:00", duration=60,
                price=2000, status="completed", box="Бокс 1",
                payment_type="cash",
            )
            tx = PiggyBankTransaction(
                id=f"pb-{suffix}",
                booking_id=booking.id,
                amount=480,
                transaction_type="deposit_24percent",
                purpose="24% от заказа Аренда бокса",
                date="04.08.2026",
                resource_group="wash",
            )
            db.add_all([booking, tx])
            db.commit()

        data = self._piggy_bank()
        wash = data["wash"]
        self.assertEqual(wash["selfServicePiggy"], 480)
        self.assertEqual(wash["classicPiggy"], 0)


if __name__ == "__main__":
    unittest.main()

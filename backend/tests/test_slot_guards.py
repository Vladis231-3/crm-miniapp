"""T3: слот-бэкстоп, идемпотентность создания, атомарный склад.

- Двойная отправка одного слота (два потока, один payload без ключа):
  ровно один 200, второй 409, в БД одна запись.
- Один clientRequestId дважды: 200 + replay тем же id, одна запись
  (bookings, expenses, incomes).
- Разные ключи на один слот: второй 409.
- Перенос на занятый слот (PATCH): 409.
- Освобождённый слот (удаление/cancel) переиспользуется: 200.
- Грязные данные откладывают слот-миграцию (deferred), стартап не падает;
  после ручного разбора индекс встаёт.
- Списание склада сверх остатка: clamp в 0 сохранён (атомарный UPDATE).
- Реестр extra-миграций: порядок и идемпотентность.
"""

from __future__ import annotations

import json
import os
import sys
import threading
import unittest
import urllib.parse
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


def build_init_data(telegram_id: str) -> str:
    return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})


class SlotGuardTests(unittest.TestCase):
    ADMIN_TG_ID = "777071"
    OWNER_TG_ID = "777074"

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
        # T4: drop leaked GOOGLE_* env.
        for _key in ("GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET", "GOOGLE_CALENDAR_REDIRECT_URI", "GOOGLE_CALENDAR_TIMEZONE"):
            os.environ.pop(_key, None)

        self.restart_app()
        self._set_staff_telegram_ids()
        self.admin_token = build_init_data(self.ADMIN_TG_ID)
        self.owner_token = build_init_data(self.OWNER_TG_ID)

    def tearDown(self) -> None:
        self.shutdown_app()
        reset_app_modules()
        if self.db_path.exists():
            try:
                self.db_path.unlink()
            except OSError:
                # Windows/daemon может держать файл (см. Google-тесты) — мусор gitignored.
                pass

    def shutdown_app(self) -> None:
        for attr in ("client_manager", "client_manager_2"):
            manager = getattr(self, attr, None)
            if manager is not None:
                manager.__exit__(None, None, None)
        try:
            from app.database import engine
        except ModuleNotFoundError:
            return
        engine.dispose()

    def restart_app(self) -> None:
        self.shutdown_app()
        reset_app_modules()
        from app.main import app

        self.client_manager = TestClient(app)
        self.client = self.client_manager.__enter__()

    def _set_staff_telegram_ids(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser
        from sqlalchemy import select

        mapping = {"admin": self.ADMIN_TG_ID, "owner": self.OWNER_TG_ID}
        with SessionLocal() as db:
            staff = db.scalars(select(StaffUser)).all()
            for item in staff:
                if item.login in mapping:
                    item.telegram_chat_id = mapping[item.login]
            db.commit()

    @staticmethod
    def next_active_date() -> str:
        candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        for offset in range(1, 8):
            next_date = candidate + timedelta(days=offset)
            if next_date.weekday() != 6:
                return next_date.strftime("%d.%m.%Y")
        raise AssertionError("Unable to find active schedule day")

    def booking_payload(self, time: str, key: str | None = None) -> dict:
        body: dict = {
            "clientId": "",
            "clientName": "Slot Client",
            "clientPhone": "+7 (999) 222-33-44",
            "service": "Мойка базовая",
            "serviceId": "s1",
            "date": self.next_active_date(),
            "time": time,
            "duration": 30,
            "price": 1500,
            "status": "scheduled",
            "workers": [],
            "box": "Бокс 1",
            "paymentType": "cash",
            "car": "Lada Vesta",
            "plate": "A123BC",
        }
        if key is not None:
            body["clientRequestId"] = key
        return body

    def slot_count(self, time: str) -> int:
        from app.database import SessionLocal
        from app.models import Booking
        from sqlalchemy import func, select

        with SessionLocal() as db:
            return (
                db.scalar(
                    select(func.count())
                    .select_from(Booking)
                    .where(
                        Booking.box == "Бокс 1",
                        Booking.date == self.next_active_date(),
                        Booking.time == time,
                        Booking.deleted_at.is_(None),
                    )
                )
                or 0
            )

    def test_double_submit_same_slot_second_gets_409(self) -> None:
        from app.main import app

        manager_2 = TestClient(app)
        self.client_manager_2 = manager_2.__enter__()
        barrier = threading.Barrier(2)
        results: list[int] = []
        errors: list[BaseException] = []

        def target(client: TestClient) -> None:
            try:
                barrier.wait(timeout=30)
                response = client.post(
                    "/api/bookings",
                    headers={"Authorization": self.admin_token},
                    json=self.booking_payload("10:00"),
                )
                results.append(response.status_code)
            except BaseException as exc:  # noqa: BLE001
                errors.append(exc)

        threads = [
            threading.Thread(target=target, args=(self.client,)),
            threading.Thread(target=target, args=(manager_2,)),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=120)
        self.assertEqual(errors, [])
        self.assertEqual(sorted(results), [200, 409])
        self.assertEqual(self.slot_count("10:00"), 1)

    def test_same_op_key_replays_same_booking(self) -> None:
        key = f"op-{uuid4().hex}"
        first = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json=self.booking_payload("11:00", key=key),
        )
        self.assertEqual(first.status_code, 200, first.text)
        second = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json=self.booking_payload("11:00", key=key),
        )
        self.assertEqual(second.status_code, 200, second.text)
        self.assertEqual(first.json()["id"], second.json()["id"])
        self.assertEqual(self.slot_count("11:00"), 1)

    def test_different_keys_same_slot_second_gets_409(self) -> None:
        first = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json=self.booking_payload("12:00", key=f"op-{uuid4().hex}"),
        )
        self.assertEqual(first.status_code, 200, first.text)
        second = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json=self.booking_payload("12:00", key=f"op-{uuid4().hex}"),
        )
        self.assertEqual(second.status_code, 409, second.text)
        self.assertEqual(self.slot_count("12:00"), 1)

    def test_update_reschedule_to_busy_slot_gets_409(self) -> None:
        first = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json=self.booking_payload("13:00"),
        )
        self.assertEqual(first.status_code, 200, first.text)
        second = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json=self.booking_payload("14:00"),
        )
        self.assertEqual(second.status_code, 200, second.text)
        move = self.client.patch(
            f"/api/bookings/{second.json()['id']}",
            headers={"Authorization": self.admin_token},
            json={"time": "13:00"},
        )
        self.assertEqual(move.status_code, 409, move.text)

    def test_freed_slot_is_reusable(self) -> None:
        first = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json=self.booking_payload("15:00"),
        )
        self.assertEqual(first.status_code, 200, first.text)
        cancel = self.client.patch(
            f"/api/bookings/{first.json()['id']}",
            headers={"Authorization": self.admin_token},
            json={"status": "cancelled"},
        )
        self.assertEqual(cancel.status_code, 200, cancel.text)
        second = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json=self.booking_payload("15:00"),
        )
        self.assertEqual(second.status_code, 200, second.text)

    def test_completed_slot_does_not_block_new_booking(self) -> None:
        # Семантика предиката = app-проверке: история слот не блокирует
        # (денежная матрица строит сценарии поверх completed-строк).
        first = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json=self.booking_payload("18:00"),
        )
        self.assertEqual(first.status_code, 200, first.text)
        done = self.client.patch(
            f"/api/bookings/{first.json()['id']}",
            headers={"Authorization": self.admin_token},
            json={"status": "completed", "paymentSettled": True},
        )
        self.assertEqual(done.status_code, 200, done.text)
        second = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json=self.booking_payload("18:00"),
        )
        self.assertEqual(second.status_code, 200, second.text)

    def test_dirty_data_defers_slot_migration(self) -> None:
        from sqlalchemy import select, text

        from app.database import SessionLocal, engine
        from app.migrations_extra import upgrade_slot_unique_index
        from app.models import Booking

        # стартап уже создал слот-индекс на чистой БД — для инсценировки
        # грязных данных снимаем его, кладём дубли напрямую, зовём upgrade.
        with engine.begin() as connection:
            connection.execute(text("DROP INDEX IF EXISTS ux_bookings_slot_active"))
        seed = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json=self.booking_payload("16:00"),
        )
        self.assertEqual(seed.status_code, 200, seed.text)
        with SessionLocal() as db:
            client_id = db.scalar(
                select(Booking.client_id).where(Booking.id == seed.json()["id"])
            )
            self.assertIsNotNone(client_id)
            assert client_id is not None
            for idx in ("dup-a", "dup-b"):
                db.add(
                    Booking(
                        id=idx,
                        client_id=client_id,
                        client_name="Dup",
                        client_phone="+7 (999) 000-00-00",
                        service="Мойка",
                        service_id="s1",
                        date=self.next_active_date(),
                        time="16:30",
                        duration=30,
                        price=1000,
                        status="scheduled",
                        box="Бокс 1",
                        payment_type="cash",
                        created_at=datetime.now(),
                    )
                )
            db.commit()
        self.assertEqual(upgrade_slot_unique_index(), "deferred")
        with engine.connect() as connection:
            indexes = connection.execute(
                text("SELECT name FROM sqlite_master WHERE type='index'")
            ).all()
        self.assertNotIn(("ux_bookings_slot_active",), [tuple(row) for row in indexes])
        # ручной разбор: гасим дубль — индекс встаёт
        with SessionLocal() as db:
            victim = db.get(Booking, "dup-b")
            assert victim is not None
            db.delete(victim)
            db.commit()
        self.assertEqual(upgrade_slot_unique_index(), "applied")
        with SessionLocal() as db:
            clash = Booking(
                id="dup-c",
                client_id=client_id,
                client_name="Dup",
                client_phone="+7 (999) 000-00-00",
                service="Мойка",
                service_id="s1",
                date=self.next_active_date(),
                time="16:30",
                duration=30,
                price=1000,
                status="scheduled",
                box="Бокс 1",
                payment_type="cash",
                created_at=datetime.now(),
            )
            db.add(clash)
            from sqlalchemy.exc import IntegrityError

            with self.assertRaises(IntegrityError):
                db.flush()
            db.rollback()
        # индекс на месте и записан версией миграции
        from app.migrations_extra import SLOT_UNIQUE_ID
        from app.runtime_migrations import get_applied_versions

        self.assertIn(SLOT_UNIQUE_ID, get_applied_versions(engine))

    def test_expense_double_submit_single_row(self) -> None:
        from app.database import SessionLocal
        from app.models import Expense
        from sqlalchemy import func, select

        key = f"op-{uuid4().hex}"
        body = {
            "title": "Повторный расход",
            "amount": 500,
            "category": "Прочее",
            "date": self.next_active_date(),
            "resourceGroup": "general",
            "clientRequestId": key,
        }
        first = self.client.post(
            "/api/expenses", headers={"Authorization": self.owner_token}, json=body
        )
        self.assertEqual(first.status_code, 200, first.text)
        second = self.client.post(
            "/api/expenses", headers={"Authorization": self.owner_token}, json=body
        )
        self.assertEqual(second.status_code, 200, second.text)
        self.assertEqual(first.json()["id"], second.json()["id"])
        with SessionLocal() as db:
            count = (
                db.scalar(
                    select(func.count())
                    .select_from(Expense)
                    .where(Expense.op_key == key)
                )
                or 0
            )
        self.assertEqual(count, 1)

    def test_income_double_submit_single_row(self) -> None:
        from app.database import SessionLocal
        from app.models import Income
        from sqlalchemy import func, select

        key = f"op-{uuid4().hex}"
        body = {
            "amount": 700,
            "source": "Повторный доход",
            "date": self.next_active_date(),
            "resourceGroup": "general",
            "clientRequestId": key,
        }
        first = self.client.post(
            "/api/owner/incomes", headers={"Authorization": self.owner_token}, json=body
        )
        self.assertEqual(first.status_code, 201, first.text)
        second = self.client.post(
            "/api/owner/incomes", headers={"Authorization": self.owner_token}, json=body
        )
        self.assertEqual(second.status_code, 201, second.text)
        self.assertEqual(first.json()["id"], second.json()["id"])
        with SessionLocal() as db:
            count = (
                db.scalar(
                    select(func.count()).select_from(Income).where(Income.op_key == key)
                )
                or 0
            )
        self.assertEqual(count, 1)

    def test_stock_writeoff_clamp_preserved(self) -> None:
        from app.database import SessionLocal
        from app.models import StockItem
        from sqlalchemy import select

        item = self.client.post(
            "/api/stock-items",
            headers={"Authorization": self.admin_token},
            json={
                "name": "Шампунь T3",
                "qty": 3,
                "unit": "л",
                "unitPrice": 100,
                "category": "Химия",
            },
        )
        self.assertEqual(item.status_code, 200, item.text)
        item_id = item.json()["id"]
        body = self.booking_payload("17:00")
        body["materials"] = [
            {
                "id": "bm-t3-1",
                "stockItemId": item_id,
                "name": "Шампунь T3",
                "qty": 10,
                "unit": "л",
                "unitPrice": 100,
            }
        ]
        created = self.client.post(
            "/api/bookings", headers={"Authorization": self.admin_token}, json=body
        )
        self.assertEqual(created.status_code, 200, created.text)
        done = self.client.patch(
            f"/api/bookings/{created.json()['id']}",
            headers={"Authorization": self.admin_token},
            json={"status": "completed", "paymentSettled": True},
        )
        self.assertEqual(done.status_code, 200, done.text)
        with SessionLocal() as db:
            stock = db.scalar(select(StockItem).where(StockItem.id == item_id))
            assert stock is not None
            self.assertEqual(stock.qty, 0)

    def test_extra_migrations_registry_order(self) -> None:
        from app.database import engine as default_engine
        from app.runtime_migrations import get_applied_versions, run_startup_migrations

        order: list[str] = []

        def first() -> str:
            order.append("m1")
            return "applied"

        def second() -> str:
            order.append("m2")
            return "applied"

        result = run_startup_migrations(
            lambda: None,
            engine=default_engine,
            lock_dir=self.db_path.parent / f"locks_{uuid4().hex}",
            extra_migrations=[("t3-test-m1", first), ("t3-test-m2", second)],
        )
        self.assertEqual(order, ["m1", "m2"])
        self.assertIn("t3-test-m1", result["applied"])
        applied = get_applied_versions(default_engine)
        self.assertIn("t3-test-m1", applied)
        self.assertIn("t3-test-m2", applied)
        rerun = run_startup_migrations(
            lambda: None,
            engine=default_engine,
            lock_dir=self.db_path.parent / f"locks_{uuid4().hex}",
            extra_migrations=[("t3-test-m1", first), ("t3-test-m2", second)],
        )
        self.assertEqual(rerun["status"], "skipped")
        self.assertEqual(order, ["m1", "m2"])


if __name__ == "__main__":
    unittest.main()

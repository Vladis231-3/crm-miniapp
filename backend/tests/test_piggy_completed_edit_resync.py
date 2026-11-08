"""Копилка: правка уже завершённой записи пересчитывает вклады.

Баг (прод, ноябрь 2026): у услуг «от N ₽» цену ставят после завершения, а
вклад в копилку оставался по цене на момент завершения (скол 3000 ₽ → 480 ₽,
т.е. 24% от прежних 2000). Ветка сверки в PATCH /api/bookings была
недостижима, эндпоинты допов копилку не сверяли вообще.

Проверяет:
- PATCH цены завершённой оплаченной записи → вклад и pending-доли по новой цене,
  один основной вклад, повтор тем же значением ничего не меняет;
- правка без денежных полей (заметка) вклад не пересчитывает, даже если
  настройки услуги сменились после завершения;
- доп к завершённой записи → вклад допа; удаление допа → вклад уходит;
- неоплаченная завершённая запись: правка цены вклада не создаёт;
- завершили → отменили: вклад не виден ни в отчётах, ни в списке операций;
  снова завершили → вклад снова считается;
- recalc-money?dateFrom= трогает только записи с этой даты; dryRun откатывает.
"""
from __future__ import annotations

import json
import os
import sys
import unittest
import urllib.parse
from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select


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


class PiggyCompletedEditResyncTests(unittest.TestCase):
    OWNER_TG_ID = "778101"
    ADMIN_TG_ID = "778102"

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
        self.owner = {"Authorization": build_init_data(self.OWNER_TG_ID)}
        self.admin = {"Authorization": build_init_data(self.ADMIN_TG_ID)}
        self.service_id = self._make_detailing_service()
        self._slot = 8

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

    # ── helpers ──────────────────────────────────────────────────────────

    def _set_staff_telegram_ids(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser

        with SessionLocal() as db:
            for item in db.scalars(select(StaffUser)).all():
                if item.login == "owner":
                    item.telegram_chat_id = self.OWNER_TG_ID
                elif item.login == "admin":
                    item.telegram_chat_id = self.ADMIN_TG_ID
            db.commit()

    @staticmethod
    def _today() -> str:
        # Локальный день, как у записей CRM (date.today() в бэкенде).
        return date.today().strftime("%d.%m.%Y")  # noqa: DTZ011

    def _make_detailing_service(self) -> str:
        from app.database import SessionLocal
        from app.models import Service

        sid = f"svc-det-{uuid4().hex[:8]}"
        with SessionLocal() as db:
            db.add(
                Service(
                    id=sid,
                    name="Ремонт скола (тест)",
                    category="Детейлинг",
                    price=1000,
                    duration=60,
                    resource_group="detailing",
                )
            )
            db.commit()
        return sid

    def _create_completed(self, *, price: int, settled: bool = True) -> str:
        self._slot += 1
        response = self.client.post(
            "/api/bookings",
            headers=self.owner,
            json={
                "clientId": "",
                "clientName": "Клиент Скол",
                "clientPhone": f"+7 (999) 555-{self._slot:02d}-{self._slot:02d}",
                "service": "Ремонт скола (тест)",
                "serviceId": self.service_id,
                "date": self._today(),
                "time": f"{self._slot:02d}:00",
                "duration": 60,
                "price": price,
                "status": "completed",
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
                "box": "Детейлинг 1",
                "paymentType": "transfer",
                "paymentSettled": settled,
                "car": "Kia Rio",
                "plate": "A001AA",
                "notes": "",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["id"]

    def _patch(self, booking_id: str, body: dict) -> dict:
        response = self.client.patch(f"/api/bookings/{booking_id}", headers=self.owner, json=body)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _deposits(self, booking_id: str) -> list[tuple[str, str, int]]:
        """Живые вклады записи: (main|dop, банк, сумма)."""
        from app.database import SessionLocal
        from app.main import ASVC_PIGGY_PURPOSE_PREFIX
        from app.models import PiggyBankTransaction

        with SessionLocal() as db:
            rows = db.scalars(
                select(PiggyBankTransaction).where(
                    PiggyBankTransaction.booking_id == booking_id,
                    PiggyBankTransaction.transaction_type == "deposit_24percent",
                    PiggyBankTransaction.deleted_at.is_(None),
                )
            ).all()
            return sorted(
                (
                    "dop" if (t.purpose or "").startswith(ASVC_PIGGY_PURPOSE_PREFIX) else "main",
                    t.resource_group,
                    int(t.amount),
                )
                for t in rows
            )

    def _owner_shares_total(self, booking_id: str) -> int:
        from app.database import SessionLocal
        from app.models import OwnerProfitShare

        with SessionLocal() as db:
            return sum(
                int(s.amount or 0)
                for s in db.scalars(
                    select(OwnerProfitShare).where(OwnerProfitShare.booking_id == booking_id)
                ).all()
            )

    def _piggy(self) -> dict:
        response = self.client.get("/api/owner/piggy-bank", headers=self.owner)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _live_tx_ids(self) -> set[str]:
        from app.database import SessionLocal
        from app.main import _live_piggy_transactions

        with SessionLocal() as db:
            return {t.id for t in _live_piggy_transactions(db)}

    def _deposit_ids(self, booking_id: str) -> set[str]:
        from app.database import SessionLocal
        from app.models import PiggyBankTransaction

        with SessionLocal() as db:
            return set(
                db.scalars(
                    select(PiggyBankTransaction.id).where(
                        PiggyBankTransaction.booking_id == booking_id,
                        PiggyBankTransaction.transaction_type == "deposit_24percent",
                        PiggyBankTransaction.deleted_at.is_(None),
                    )
                ).all()
            )

    # ── tests ────────────────────────────────────────────────────────────

    def test_price_raised_after_completion_resyncs_deposit_and_owner_shares(self) -> None:
        booking_id = self._create_completed(price=2000)
        # База 2000, мастер 30% = 600, копилка 24% = 480, владельцам 920.
        self.assertEqual(self._deposits(booking_id), [("main", "detailing", 480)])
        self.assertEqual(self._owner_shares_total(booking_id), 920)

        self._patch(booking_id, {"price": 3000})
        # Мастер 900, копилка 720, владельцам 1380.
        self.assertEqual(self._deposits(booking_id), [("main", "detailing", 720)])
        self.assertEqual(self._owner_shares_total(booking_id), 1380)

        # Повтор тем же значением — без дублей и изменений.
        self._patch(booking_id, {"price": 3000})
        self.assertEqual(self._deposits(booking_id), [("main", "detailing", 720)])
        self.assertEqual(self._owner_shares_total(booking_id), 1380)

    def test_worker_percent_change_resyncs_owner_shares_same_workers_do_not(self) -> None:
        from app.database import SessionLocal
        from app.models import Service

        booking_id = self._create_completed(price=2000)
        self.assertEqual(self._owner_shares_total(booking_id), 920)
        # Настройки услуги сменились после завершения: лишний пересчёт сразу виден.
        with SessionLocal() as db:
            svc = db.get(Service, self.service_id)
            svc.piggy_pay_type = "fixed"
            svc.piggy_pay_value = 100
            db.commit()

        # Те же мастера (фронт шлёт их при каждой правке) — запись не пересчитывается.
        same = [{"workerId": "w1", "workerName": "Иван", "percent": 30}]
        self._patch(booking_id, {"workers": same, "notes": "без изменений"})
        self.assertEqual(self._deposits(booking_id), [("main", "detailing", 480)])
        self.assertEqual(self._owner_shares_total(booking_id), 920)

        # Мастер 50% = 1000, копилка — фикс 100 по текущим настройкам, владельцам 900.
        self._patch(booking_id, {"workers": [{"workerId": "w1", "workerName": "Иван", "percent": 50}]})
        self.assertEqual(self._deposits(booking_id), [("main", "detailing", 100)])
        self.assertEqual(self._owner_shares_total(booking_id), 900)

    def test_note_edit_keeps_frozen_deposit_after_service_settings_change(self) -> None:
        from app.database import SessionLocal
        from app.models import Service

        booking_id = self._create_completed(price=2000)
        self.assertEqual(self._deposits(booking_id), [("main", "detailing", 480)])

        with SessionLocal() as db:
            svc = db.get(Service, self.service_id)
            svc.piggy_pay_type = "fixed"
            svc.piggy_pay_value = 100
            db.commit()

        self._patch(booking_id, {"notes": "клиент доволен"})
        self.assertEqual(self._deposits(booking_id), [("main", "detailing", 480)])

    def test_additional_service_on_completed_booking_adds_and_removes_its_deposit(self) -> None:
        booking_id = self._create_completed(price=2000)
        response = self.client.post(
            f"/api/bookings/{booking_id}/additional-services",
            headers=self.owner,
            json={
                "name": "Полировка фары",
                "price": 1000,
                "duration": 30,
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        # Основная услуга та же (2000 → 480); доп: остаток 1000 − 300 = 700, 24% = 168.
        self.assertEqual(
            self._deposits(booking_id),
            [("dop", "detailing", 168), ("main", "detailing", 480)],
        )

        asvc_id = response.json()["additionalServices"][0]["id"]
        response = self.client.patch(
            f"/api/bookings/{booking_id}/additional-services/{asvc_id}",
            headers=self.owner,
            json={"price": 2000},
        )
        self.assertEqual(response.status_code, 200, response.text)
        # Остаток 2000 − 600 = 1400, 24% = 336.
        self.assertEqual(
            self._deposits(booking_id),
            [("dop", "detailing", 336), ("main", "detailing", 480)],
        )

        response = self.client.delete(
            f"/api/bookings/{booking_id}/additional-services/{asvc_id}", headers=self.owner
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self._deposits(booking_id), [("main", "detailing", 480)])

    def test_two_same_name_additional_services_keep_both_deposits(self) -> None:
        # Прод 03.11: два допа «Мойка днища на подъемнике» — сверка склеивала
        # их по purpose и теряла один вклад.
        booking_id = self._create_completed(price=2000)
        for price in (1000, 500):
            response = self.client.post(
                f"/api/bookings/{booking_id}/additional-services",
                headers=self.owner,
                json={
                    "name": "Мойка днища",
                    "price": price,
                    "duration": 30,
                    "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
                },
            )
            self.assertEqual(response.status_code, 200, response.text)
        # Допы: (1000 − 300) × 24% = 168, (500 − 150) × 24% = 84.
        expected_dops = [("dop", "detailing", 84), ("dop", "detailing", 168)]
        self.assertEqual(self._deposits(booking_id), expected_dops + [("main", "detailing", 480)])

        # Цена основной услуги 2000 → 3000 (итог записи 3500 → 4500).
        self._patch(booking_id, {"price": 4500})
        self.assertEqual(self._deposits(booking_id), expected_dops + [("main", "detailing", 720)])

    def test_unpaid_completed_booking_price_edit_creates_no_deposit(self) -> None:
        booking_id = self._create_completed(price=2000, settled=False)
        self.assertEqual(self._deposits(booking_id), [])
        self._patch(booking_id, {"price": 3000})
        self.assertEqual(self._deposits(booking_id), [])
        # Отметили оплату — вклад по актуальной цене.
        self._patch(booking_id, {"paymentSettled": True})
        self.assertEqual(self._deposits(booking_id), [("main", "detailing", 720)])

    def test_cancelled_after_completion_hidden_in_reports_and_list(self) -> None:
        booking_id = self._create_completed(price=2000)
        deposit_ids = self._deposit_ids(booking_id)
        self.assertEqual(len(deposit_ids), 1)
        net_before = float(self._piggy()["detailing"]["netPiggy"])

        self._patch(booking_id, {"status": "cancelled"})
        piggy = self._piggy()
        listed = {t["id"] for t in piggy["transactions"]}
        self.assertFalse(deposit_ids & listed, "вклад отменённой записи не в списке операций")
        self.assertFalse(deposit_ids & self._live_tx_ids(), "и не в отчётах")
        self.assertAlmostEqual(float(piggy["detailing"]["netPiggy"]), net_before - 480, places=2)

        self._patch(booking_id, {"status": "completed"})
        piggy = self._piggy()
        listed = {t["id"] for t in piggy["transactions"]}
        self.assertTrue(deposit_ids <= listed)
        self.assertTrue(deposit_ids <= self._live_tx_ids())
        self.assertAlmostEqual(float(piggy["detailing"]["netPiggy"]), net_before, places=2)

    def test_recalc_money_date_from_touches_only_newer_bookings(self) -> None:
        from app.database import SessionLocal
        from app.models import Booking, PiggyBankTransaction

        old_id = self._create_completed(price=2000)
        new_id = self._create_completed(price=2000)
        # Застрявшие вклады: портим суммы, старой записи ставим прошлую дату.
        with SessionLocal() as db:
            db.get(Booking, old_id).date = "01.01.2020"
            for tx in db.scalars(
                select(PiggyBankTransaction).where(
                    PiggyBankTransaction.booking_id.in_([old_id, new_id]),
                    PiggyBankTransaction.transaction_type == "deposit_24percent",
                )
            ).all():
                tx.amount = 1
            db.commit()

        url = f"/api/admin/maintenance/recalc-money?dateFrom={self._today()}"
        dry = self.client.post(url + "&dryRun=true", headers=self.owner)
        self.assertEqual(dry.status_code, 200, dry.text)
        self.assertEqual(self._deposits(new_id), [("main", "detailing", 1)], "dryRun откатывает")

        applied = self.client.post(url + "&dryRun=false", headers=self.owner)
        self.assertEqual(applied.status_code, 200, applied.text)
        self.assertEqual(self._deposits(new_id), [("main", "detailing", 480)])
        self.assertEqual(self._deposits(old_id), [("main", "detailing", 1)], "раньше dateFrom не трогаем")

        bad = self.client.post(
            "/api/admin/maintenance/recalc-money?dateFrom=31/10/2026", headers=self.owner
        )
        self.assertEqual(bad.status_code, 422, bad.text)


if __name__ == "__main__":
    unittest.main()

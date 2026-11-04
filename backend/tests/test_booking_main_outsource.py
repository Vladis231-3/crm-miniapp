"""Аутсорс основной услуги: остаток делится, начисления видны по исполнителям."""

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


class MainOutsourceTests(unittest.TestCase):
    ADMIN_TG_ID = "777031"
    WORKER_TG_ID = "777032"
    OWNER_TG_ID = "777033"

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
        os.environ["PERMANENT_TELEGRAM_OWNERS"] = json.dumps(
            [
                {"id": "owner-tg-1", "login": "owner-tg-1", "telegram_id": "77703301", "name": "Владелец 1"},
                {"id": "owner-tg-2", "login": "owner-tg-2", "telegram_id": "77703302", "name": "Владелец 2"},
            ]
        )
        reset_app_modules()
        from app.main import app

        self.client_manager = TestClient(app)
        self.client = self.client_manager.__enter__()

        from app.database import SessionLocal
        from app.models import Service, StaffUser

        mapping = {"admin": self.ADMIN_TG_ID, "ivan": self.WORKER_TG_ID, "owner": self.OWNER_TG_ID}
        with SessionLocal() as db:
            for item in db.scalars(select(StaffUser)).all():
                if item.login in mapping:
                    item.telegram_chat_id = mapping[item.login]
            svc = db.get(Service, "s1")
            assert svc is not None
            svc.master_pay_type = "percent"
            svc.master_pay_value = 40
            svc.piggy_pay_type = "percent"
            svc.piggy_pay_value = 24
            svc.split_order = []
            svc.material_consumption = 0
            svc.materials = []
            db.commit()
        self.admin = {"Authorization": build_init_data(self.ADMIN_TG_ID)}
        self.worker = {"Authorization": build_init_data(self.WORKER_TG_ID)}
        self.owner = {"Authorization": build_init_data(self.OWNER_TG_ID)}

    def tearDown(self) -> None:
        self.client_manager.__exit__(None, None, None)
        from app.database import engine

        engine.dispose()
        reset_app_modules()
        if self.db_path.exists():
            self.db_path.unlink()

    @staticmethod
    def active_date(offset: int = 1) -> str:
        day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=offset)
        if day.weekday() == 6:
            day += timedelta(days=1)
        return day.strftime("%d.%m.%Y")

    def create(self, price: int = 20000, *, outsource: int | None = 16000, outsourcer: str | None = None,
               time: str = "10:00", date: str | None = None, expect: int = 200) -> dict:
        body: dict = {
            "clientId": "",
            "clientName": "Стекло Клиент",
            "clientPhone": "+7 (999) 333-44-55",
            "service": "Мойка базовая",
            "serviceId": "s1",
            "date": date or self.active_date(),
            "time": time,
            "duration": 30,
            "price": price,
            "status": "scheduled",
            "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
            "box": "Бокс 1",
            "paymentType": "cash",
            "car": "Lada Vesta",
            "plate": "A123BC",
        }
        if outsource is not None:
            body.update({"isOutsource": True, "outsourceAmount": outsource, "outsourcerId": outsourcer})
        response = self.client.post("/api/bookings", headers=self.admin, json=body)
        self.assertEqual(response.status_code, expect, response.text)
        return response.json()

    def complete(self, booking_id: str) -> None:
        response = self.client.patch(
            f"/api/bookings/{booking_id}",
            headers=self.admin,
            json={"status": "completed", "paymentSettled": True},
        )
        self.assertEqual(response.status_code, 200, response.text)

    def split(self, booking_id: str) -> dict:
        from app.database import SessionLocal
        from app.main import _booking_money_split
        from app.models import Booking

        with SessionLocal() as db:
            return _booking_money_split(db, db.get(Booking, booking_id))

    def set_service(self, **fields) -> None:
        from app.database import SessionLocal
        from app.models import Service

        with SessionLocal() as db:
            svc = db.get(Service, "s1")
            for key, value in fields.items():
                setattr(svc, key, value)
            db.commit()

    def new_outsourcer(self, name: str = "СтеклоСервис") -> str:
        response = self.client.post("/api/outsourcers", headers=self.admin, json={"name": name})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["id"]

    # ── Расчёт ──

    def test_voice_message_example(self) -> None:
        """20 000 − 16 000 = 4 000: мастер 40 %, копилка 24 %, остальное владельцам."""
        split = self.split(self.create()["id"])
        self.assertEqual(split["main_price"], 20000)
        self.assertEqual(split["main_outsource"], 16000)
        self.assertEqual(split["split_base"], 4000)
        self.assertEqual(split["master_total"], 1600)
        self.assertEqual(split["piggy_deposit"], 960)
        self.assertEqual(split["owners_total"], 1440)

    def test_pipeline_order_sums_to_price(self) -> None:
        self.set_service(split_order=["piggy", "master", "owners", "materials"])
        split = self.split(self.create()["id"])
        self.assertEqual(split["split_base"], 4000)
        self.assertEqual(split["piggy_deposit"], 960)
        total = split["master_total"] + split["piggy_deposit"] + split["owners_total"] + split["main_outsource"]
        self.assertEqual(total, 20000)
        self.assertEqual([t["step"] for t in split["trace"]][:2], ["start", "outsource"])

    def test_matches_additional_service_scheme(self) -> None:
        """Прежняя верная схема «услуга 4 000 + доп 16 000 с аутсорсом» даёт те же суммы."""
        self.set_service(owner_pay_type="")
        direct = self.split(self.create()["id"])
        scheme = self.create(4000, outsource=None, time="12:00")
        response = self.client.post(
            f"/api/bookings/{scheme['id']}/additional-services",
            headers=self.admin,
            json={"name": "Замена стекла", "price": 16000, "duration": 30, "priceMode": "add",
                  "isOutsource": True, "outsourceAmount": 16000, "workers": []},
        )
        self.assertEqual(response.status_code, 200, response.text)
        other = self.split(scheme["id"])
        for key in ("master_total", "piggy_deposit", "owners_total"):
            self.assertEqual(direct[key], other[key], key)

    def test_without_outsource_unchanged(self) -> None:
        plain = self.split(self.create(outsource=None)["id"])
        self.assertEqual(plain["main_outsource"], 0)
        self.assertEqual(plain["split_base"], 20000)
        self.assertEqual(plain["master_total"], 8000)
        self.assertNotIn("outsource", [t["step"] for t in plain["trace"]])

    def test_materials_taken_after_outsource(self) -> None:
        self.set_service(material_consumption=1000)
        split = self.split(self.create()["id"])
        self.assertEqual(split["split_base"], 3000)
        self.assertEqual(split["master_total"], 1200)

    def test_fixed_master_capped_by_remainder(self) -> None:
        self.set_service(master_pay_type="fixed", master_pay_value=5000)
        split = self.split(self.create()["id"])
        self.assertEqual(split["master_total"], 4000)
        self.assertEqual(split["piggy_deposit"], 0)
        self.assertEqual(split["owners_total"], 0)

    def test_outsource_equal_to_price_leaves_nothing(self) -> None:
        split = self.split(self.create(outsource=20000)["id"])
        self.assertEqual(split["split_base"], 0)
        self.assertEqual(split["master_total"] + split["piggy_deposit"] + split["owners_total"], 0)

    def test_old_snapshot_without_key_reads_zero(self) -> None:
        from app.database import SessionLocal
        from app.main import _booking_split_auto
        from app.models import Booking

        booking = self.create(outsource=None)
        self.complete(booking["id"])
        with SessionLocal() as db:
            row = db.get(Booking, booking["id"])
            snap = dict(row.money_split_snapshot)
            snap.pop("main_outsource", None)
            row.money_split_snapshot = snap
            db.commit()
            self.assertEqual(_booking_split_auto(db, row)["main_outsource"], 0)

    # ── Проверки на входе ──

    def test_amount_above_price_rejected(self) -> None:
        self.create(outsource=20001, expect=400)

    def test_zero_amount_rejected(self) -> None:
        self.create(outsource=0, expect=400)

    def test_price_cannot_drop_below_amount(self) -> None:
        booking = self.create()
        response = self.client.patch(
            f"/api/bookings/{booking['id']}", headers=self.admin, json={"price": 15000}
        )
        self.assertEqual(response.status_code, 400, response.text)

    def test_subtract_must_fit_remainder(self) -> None:
        booking = self.create()
        response = self.client.post(
            f"/api/bookings/{booking['id']}/additional-services",
            headers=self.admin,
            json={"name": "Вычет", "price": 4001, "duration": 0, "priceMode": "subtract",
                  "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 10}]},
        )
        self.assertEqual(response.status_code, 400, response.text)

    def test_unknown_outsourcer_rejected(self) -> None:
        self.create(outsourcer="nope", expect=400)

    # ── Правка завершённой записи ──

    def test_edit_completed_reconciles_and_is_idempotent(self) -> None:
        from app.database import SessionLocal
        from app.main import _booking_split_auto
        from app.models import Booking, OwnerProfitShare, PiggyBankTransaction

        booking = self.create(outsource=None)
        self.complete(booking["id"])

        def state() -> tuple[int, int, int]:
            with SessionLocal() as db:
                piggy = sum(
                    int(t.amount) for t in db.scalars(
                        select(PiggyBankTransaction).where(
                            PiggyBankTransaction.booking_id == booking["id"],
                            PiggyBankTransaction.transaction_type == "deposit_24percent",
                        )
                    ).all()
                )
                owners = sum(
                    int(sh.amount) for sh in db.scalars(
                        select(OwnerProfitShare).where(OwnerProfitShare.booking_id == booking["id"])
                    ).all()
                )
                frozen = _booking_split_auto(db, db.get(Booking, booking["id"]))["main_outsource"]
                return piggy, owners, frozen

        self.assertEqual(state(), (4800, 7200, 0))
        body = {"isOutsource": True, "outsourceAmount": 16000}
        for _ in range(2):
            response = self.client.patch(f"/api/bookings/{booking['id']}", headers=self.owner, json=body)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(state(), (960, 1440, 16000))

    def test_paid_owner_share_not_rewritten(self) -> None:
        from app.database import SessionLocal
        from app.models import OwnerProfitShare

        booking = self.create(outsource=None)
        self.complete(booking["id"])
        with SessionLocal() as db:
            shares = db.scalars(
                select(OwnerProfitShare).where(OwnerProfitShare.booking_id == booking["id"])
            ).all()
            shares[0].status = "paid"
            paid_id, paid_amount = shares[0].id, int(shares[0].amount)
            db.commit()
        response = self.client.patch(
            f"/api/bookings/{booking['id']}",
            headers=self.owner,
            json={"isOutsource": True, "outsourceAmount": 16000},
        )
        self.assertEqual(response.status_code, 200, response.text)
        with SessionLocal() as db:
            self.assertEqual(int(db.get(OwnerProfitShare, paid_id).amount), paid_amount)

    # ── Отчёты ──

    def test_report_and_movements(self) -> None:
        first = self.new_outsourcer("СтеклоСервис")
        self.new_outsourcer("Пустой")
        done = self.create(outsourcer=first)
        self.complete(done["id"])
        # Не завершена: начисления нет.
        self.create(outsourcer=first, time="12:00")
        # Отменена после завершения: начисление исчезает.
        cancelled = self.create(outsourcer=first, time="14:00")
        self.complete(cancelled["id"])
        response = self.client.patch(
            f"/api/bookings/{cancelled['id']}", headers=self.owner, json={"status": "cancelled"}
        )
        self.assertEqual(response.status_code, 200, response.text)
        # Доп без исполнителя попадает в «Без исполнителя».
        legacy = self.create(outsource=None, time="16:00")
        self.client.post(
            f"/api/bookings/{legacy['id']}/additional-services",
            headers=self.admin,
            json={"name": "Полировка", "price": 5000, "duration": 30, "priceMode": "add",
                  "isOutsource": True, "outsourceAmount": 2000, "workers": []},
        )
        self.complete(legacy["id"])

        report = self.client.get("/api/owner/outsourcers/report?period=all", headers=self.owner).json()
        rows = {row["id"]: row for row in report["rows"]}
        self.assertEqual(
            (rows[first]["count"], rows[first]["price"], rows[first]["paid"], rows[first]["left"]),
            (1, 20000, 16000, 4000),
        )
        self.assertEqual(rows["none"]["paid"], 2000)
        self.assertEqual(report["totalPaid"], 18000)
        self.assertTrue(any(row["name"] == "Пустой" and row["count"] == 0 for row in report["rows"]))

        movements = self.client.get(
            f"/api/owner/outsourcers/{first}/movements?period=all", headers=self.owner
        ).json()
        self.assertEqual(len(movements["rows"]), 1)
        self.assertEqual(movements["rows"][0]["left"], 4000)
        self.assertEqual(movements["rows"][0]["clientName"], done["clientName"])

        payroll = self.client.get("/api/owner/outsource/payroll?period=all", headers=self.owner).json()
        self.assertEqual(payroll["total"], 18000)

    def test_report_respects_period(self) -> None:
        outsourcer = self.new_outsourcer()
        far = (datetime.now() + timedelta(days=60)).strftime("%d.%m.%Y")
        target = datetime.now() + timedelta(days=60)
        if target.weekday() == 6:
            far = (target + timedelta(days=1)).strftime("%d.%m.%Y")
        booking = self.create(outsourcer=outsourcer, date=far)
        self.complete(booking["id"])
        inside = self.client.get(
            f"/api/owner/outsourcers/report?period=custom&date_from={far}&date_to={far}", headers=self.owner
        ).json()
        self.assertEqual(inside["totalPaid"], 16000)
        today = datetime.now().strftime("%d.%m.%Y")
        outside = self.client.get(
            f"/api/owner/outsourcers/report?period=custom&date_from={today}&date_to={today}", headers=self.owner
        ).json()
        self.assertEqual(outside["totalPaid"], 0)

    def test_booking_outsource_total_counts_main_and_additional(self) -> None:
        from app.database import SessionLocal
        from app.main import _booking_outsource_total
        from app.models import Booking

        booking = self.create()
        self.client.post(
            f"/api/bookings/{booking['id']}/additional-services",
            headers=self.admin,
            json={"name": "Полировка", "price": 5000, "duration": 30, "priceMode": "add",
                  "isOutsource": True, "outsourceAmount": 2000, "workers": []},
        )
        with SessionLocal() as db:
            self.assertEqual(_booking_outsource_total(db.get(Booking, booking["id"])), 18000)

    def test_money_flow_counts_main_outsource(self) -> None:
        from app.database import SessionLocal
        from app.main import _booking_money_split_detail
        from app.models import Booking

        outsourcer = self.new_outsourcer()
        booking = self.create(outsourcer=outsourcer)
        self.complete(booking["id"])
        with SessionLocal() as db:
            detail = _booking_money_split_detail(db, db.get(Booking, booking["id"]))
        self.assertEqual(detail.mainOutsourceAmount, 16000)
        self.assertEqual(detail.mainOutsourcerName, "СтеклоСервис")
        self.assertEqual(detail.mainPrice, 20000)

    # ── Доступ ──

    def test_admin_fills_but_does_not_see_reports(self) -> None:
        outsourcer = self.new_outsourcer()
        for url in (
            "/api/owner/outsourcers/report?period=all",
            f"/api/owner/outsourcers/{outsourcer}/movements?period=all",
            "/api/owner/outsource/payroll?period=all",
        ):
            self.assertEqual(self.client.get(url, headers=self.admin).status_code, 403, url)
        self.assertEqual(
            self.client.patch(f"/api/outsourcers/{outsourcer}", headers=self.admin, json={"name": "X"}).status_code,
            403,
        )
        listed = self.client.get("/api/outsourcers", headers=self.admin).json()
        self.assertEqual(listed[0]["name"], "СтеклоСервис")

    def test_worker_gets_no_outsource_data(self) -> None:
        outsourcer = self.new_outsourcer()
        booking = self.create(outsourcer=outsourcer)
        response = self.client.post(
            f"/api/bookings/{booking['id']}/additional-services",
            headers=self.admin,
            json={"name": "Полировка", "price": 5000, "duration": 30, "priceMode": "add",
                  "isOutsource": True, "outsourceAmount": 2000, "outsourcerId": outsourcer, "workers": []},
        )
        self.assertEqual(response.status_code, 200, response.text)

        from app.database import SessionLocal
        from app.main import _booking_payload_for_response
        from app.models import Booking

        with SessionLocal() as db:
            row = db.get(Booking, booking["id"])
            for role in ("worker", "client"):
                seen = _booking_payload_for_response(db, row, role)
                self.assertFalse(seen.isOutsource)
                self.assertIsNone(seen.outsourceAmount)
                self.assertIsNone(seen.outsourcerId)
                self.assertIsNone(seen.additionalServices[0].outsourceAmount)
                self.assertIsNone(seen.additionalServices[0].outsourcerId)
                self.assertEqual(seen.mainBaseAmount, 4000, "база доли мастера без суммы аутсорса")
            staff = _booking_payload_for_response(db, row, "admin")
            self.assertEqual(staff.outsourceAmount, 16000)

        self.assertEqual(self.client.get("/api/outsourcers", headers=self.worker).status_code, 403)
        patched = self.client.patch(
            f"/api/bookings/{booking['id']}", headers=self.worker, json={"isOutsource": False}
        )
        self.assertIn(patched.status_code, {403, 404}, patched.text)


if __name__ == "__main__":
    unittest.main()

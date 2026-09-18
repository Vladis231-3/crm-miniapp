from __future__ import annotations

"""Матрица режимов сплита: master / piggy / доли / копилка / ЗП / услуги.

Покрывает комбинации, которых не было в других тестах:
piggy fixed/none, master fixed, piggy_target wash/general,
add-доп с нуля, outsource-доп с нуля, credit, связка split->salary-detail.
Инварианты: master+piggy+owners == price (outsource: price-outsourceAmount).
"""

import os
import sys
import unittest
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


S1 = ("s1", "Мойка базовая", "Бокс 1")
S2 = ("s2", "Полировка стекла", "Детейлинг зона")


class MoneyMatrixTests(unittest.TestCase):
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
        self.admin_token = self.login_staff("admin", "admin")
        self.owner_token = self.login_staff("owner", "owner")
        self.phone_n = 0

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
            "/api/auth/staff/login", json={"login": login, "password": password}
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

    # ---------- helpers ----------
    def reset_services(self) -> None:
        from app.database import SessionLocal
        from app.models import Service

        with SessionLocal() as db:
            for sid, rg in (("s1", "wash"), ("s2", "detailing")):
                svc = db.get(Service, sid)
                svc.resource_group = rg
                svc.master_pay_type = ""
                svc.master_pay_value = 0
                svc.piggy_pay_type = ""
                svc.piggy_pay_value = 0
                svc.owner_pay_type = ""
                svc.owner_pay_value = 0
                svc.owner_split_enabled = True
                svc.split_order = []
                svc.piggy_target = ""
                svc.is_fixed_master = False
            db.commit()

    def cfg(self, service_id: str, **kw) -> None:
        from app.database import SessionLocal
        from app.models import Service

        with SessionLocal() as db:
            svc = db.get(Service, service_id)
            for key, value in kw.items():
                setattr(svc, key, value)
            db.commit()

    def make_booking(self, service_id: str, service_name: str, box: str,
                     price: int, payment_type: str = "cash") -> dict:
        self.phone_n += 1
        response = self.client.post(
            "/api/bookings",
            headers=self.auth_headers(self.admin_token),
            json={
                "clientId": "", "clientName": f"Matrix {self.phone_n}",
                "clientPhone": f"+7 (999) 200-00-{self.phone_n:02d}",
                "service": service_name, "serviceId": service_id,
                "date": self.next_active_date(), "time": "11:00", "duration": 60,
                "price": price, "status": "scheduled",
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
                "box": box, "paymentType": payment_type,
                "car": "Lada Vesta", "plate": "A123BC",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def add_dop(self, booking_id: str, **kw) -> dict:
        payload: dict = {"serviceId": "s1", "name": "Доп", "price": 2000,
                         "duration": 30, "priceMode": "add", "workers": []}
        payload.update(kw)
        response = self.client.post(
            f"/api/bookings/{booking_id}/additional-services",
            headers=self.auth_headers(self.admin_token), json=payload)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def complete(self, booking_id: str) -> dict:
        response = self.client.patch(
            f"/api/bookings/{booking_id}", headers=self.auth_headers(self.admin_token),
            json={"status": "completed", "paymentSettled": True})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def split_of(self, booking_id: str) -> dict:
        response = self.client.get(
            f"/api/owner/bookings/{booking_id}/money-split",
            headers=self.auth_headers(self.owner_token))
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def deposits_of(self, booking_id: str) -> list[dict]:
        from app.database import SessionLocal
        from app.models import PiggyBankTransaction

        with SessionLocal() as db:
            txs = db.scalars(select(PiggyBankTransaction).where(
                PiggyBankTransaction.booking_id == booking_id)).all()
            return [{"type": t.transaction_type, "amount": float(t.amount),
                     "rg": t.resource_group} for t in txs]

    # ---------- matrix ----------
    def test_piggy_modes_wash(self) -> None:
        """R1-R5: default 24% / fixed / percent / rest / none на мойке."""
        self.reset_services()
        booking = self.complete(self.make_booking(*S1, 10000)["id"])
        split = self.split_of(booking["id"])
        self.assertEqual(split["masterTotal"], 3000)
        self.assertEqual(split["piggyDeposit"], 2400)
        self.assertEqual(split["ownersTotal"], 4600)
        self.assertEqual(split["masterTotal"] + split["piggyDeposit"] + split["ownersTotal"], 10000)
        deposits = [t for t in self.deposits_of(booking["id"]) if t["type"] == "deposit_24percent"]
        self.assertEqual(len(deposits), 1)
        self.assertEqual(deposits[0]["rg"], "wash")
        self.assertEqual(deposits[0]["amount"], 2400)

        self.cfg("s1", piggy_pay_type="fixed", piggy_pay_value=1000)
        split = self.split_of(self.complete(self.make_booking(*S1, 10000)["id"])["id"])
        self.assertEqual(split["piggyDeposit"], 1000)
        self.assertEqual(split["ownersTotal"], 6000)

        self.cfg("s1", piggy_pay_type="percent", piggy_pay_value=10)
        split = self.split_of(self.complete(self.make_booking(*S1, 10000)["id"])["id"])
        self.assertEqual(split["piggyDeposit"], 1000)
        self.assertEqual(split["ownersTotal"], 6000)

        self.cfg("s1", piggy_pay_type="rest", piggy_pay_value=0)
        split = self.split_of(self.complete(self.make_booking(*S1, 10000)["id"])["id"])
        self.assertEqual(split["piggyDeposit"], 7000)
        self.assertEqual(split["ownersTotal"], 0)

        self.cfg("s1", piggy_pay_type="none", piggy_pay_value=0)
        split = self.split_of(self.complete(self.make_booking(*S1, 10000)["id"])["id"])
        self.assertEqual(split["piggyDeposit"], 0)
        self.assertEqual(split["ownersTotal"], 7000)

    def test_master_fixed_pool(self) -> None:
        """R6: общий котёл мастера fixed 2000 делится по весам (один мастер -> 2000)."""
        self.reset_services()
        self.cfg("s1", master_pay_type="fixed", master_pay_value=2000)
        split = self.split_of(self.complete(self.make_booking(*S1, 10000)["id"])["id"])
        self.assertEqual(split["masterTotal"], 2000)
        self.assertEqual(split["piggyDeposit"], 2400)
        self.assertEqual(split["ownersTotal"], 5600)

    def test_detailing_and_piggy_targets(self) -> None:
        """R7-R9: detailing default + редирект вклада в wash/general."""
        self.reset_services()
        booking = self.complete(self.make_booking(*S2, 10000)["id"])
        split = self.split_of(booking["id"])
        self.assertEqual(split["masterTotal"], 3000)
        self.assertEqual(split["piggyDeposit"], 2400)
        self.assertEqual(split["ownersTotal"], 4600)
        deposits = [t for t in self.deposits_of(booking["id"]) if t["type"] == "deposit_24percent"]
        self.assertEqual(len(deposits), 1)
        self.assertEqual(deposits[0]["rg"], "detailing")

        self.cfg("s2", piggy_target="wash")
        booking = self.complete(self.make_booking(*S2, 10000)["id"])
        split = self.split_of(booking["id"])
        deposits = [t for t in self.deposits_of(booking["id"]) if t["type"] == "deposit_24percent"]
        self.assertEqual(len(deposits), 1)
        self.assertEqual(deposits[0]["rg"], "wash")
        self.assertEqual(deposits[0]["amount"], 2400)
        self.assertEqual(split["piggyTarget"], "wash")

        self.cfg("s2", piggy_target="general")
        booking = self.complete(self.make_booking(*S2, 10000)["id"])
        split = self.split_of(booking["id"])
        deposits = [t for t in self.deposits_of(booking["id"]) if t["type"] == "deposit_24percent"]
        self.assertEqual(len(deposits), 1)
        self.assertEqual(deposits[0]["rg"], "general")
        self.assertEqual(deposits[0]["amount"], 2400)

    def test_add_and_outsource_dops(self) -> None:
        """R10: add-доп 2000/50% -> мастеру 1000, в копилку 24% от 1000=240.
        R11: outsource-доп 2000/1500 -> копилка 24% от 500=120, владельцам 380."""
        self.reset_services()
        booking = self.make_booking(*S1, 10000)
        self.add_dop(booking["id"], name="Доп", price=2000, priceMode="add",
                     workers=[{"workerId": "w1", "workerName": "Иван", "percent": 50}])
        booking = self.complete(booking["id"])
        split = self.split_of(booking["id"])
        self.assertEqual(split["price"], 12000)
        self.assertEqual(split["masterTotal"], 4000)
        self.assertEqual(split["piggyDeposit"], 2640)
        self.assertEqual(split["ownersTotal"], 5360)
        self.assertEqual(split["masterTotal"] + split["piggyDeposit"] + split["ownersTotal"], 12000)
        dops = split["asvcPiggyDeposits"]
        self.assertEqual(len(dops), 1)
        self.assertEqual(dops[0]["amount"], 240)
        self.assertEqual(dops[0]["resourceGroup"], "wash")

        booking = self.make_booking(*S1, 10000)
        self.add_dop(booking["id"], name="Аутсорс", price=2000, priceMode="add",
                     isOutsource=True, outsourceAmount=1500, workers=[])
        booking = self.complete(booking["id"])
        split = self.split_of(booking["id"])
        self.assertEqual(split["price"], 12000)
        dops = split["asvcPiggyDeposits"]
        self.assertEqual(len(dops), 1)
        self.assertEqual(dops[0]["amount"], 120)
        self.assertEqual(split["asvcOwnerExtra"], 380)
        total = split["masterTotal"] + split["piggyDeposit"] + split["ownersTotal"]
        self.assertEqual(total, 12000 - 1500)

    def test_credit_skips_postings(self) -> None:
        """R12: кредит — нет проводок копилки и долей, мастеру авто-начисление есть."""
        from app.database import SessionLocal
        from app.models import OwnerProfitShare

        self.reset_services()
        booking = self.complete(self.make_booking(*S1, 1000, payment_type="credit")["id"])
        deposits = [t for t in self.deposits_of(booking["id"]) if t["type"] == "deposit_24percent"]
        self.assertEqual(deposits, [])
        with SessionLocal() as db:
            shares = db.scalars(select(OwnerProfitShare).where(
                OwnerProfitShare.booking_id == booking["id"])).all()
        self.assertEqual(list(shares), [])
        split = self.split_of(booking["id"])
        self.assertGreater(split["masterTotalAuto"], 0)

    def test_salary_linkage(self) -> None:
        """R13: salary-detail видит те же earned, что посчитал сплит (основа + допы)."""
        self.reset_services()
        plain = self.complete(self.make_booking(*S1, 10000)["id"])
        with_dop = self.make_booking(*S1, 10000)
        self.add_dop(with_dop["id"], name="Доп", price=2000, priceMode="add",
                     workers=[{"workerId": "w1", "workerName": "Иван", "percent": 50}])
        with_dop = self.complete(with_dop["id"])
        date = plain["date"]
        self.assertEqual(with_dop["date"], date)
        response = self.client.get(
            "/api/owner/workers/w1/salary-detail", headers=self.auth_headers(self.owner_token),
            params={"period": "custom", "date_from": date, "date_to": date})
        self.assertEqual(response.status_code, 200, response.text)
        items = {x["id"]: x for x in response.json()["bookings"]}
        self.assertIn(plain["id"], items)
        self.assertEqual(items[plain["id"]]["earned"], 3000)
        self.assertIn(with_dop["id"], items)
        self.assertEqual(items[with_dop["id"]]["earned"], 4000)

    def piggy_bank(self) -> dict:
        response = self.client.get(
            "/api/owner/piggy-bank", headers=self.auth_headers(self.owner_token))
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_piggy_breakdown_follows_custom_split(self) -> None:
        """R14: мини-карточки копилки считают реальным сплитом, а не 10/90 и 40/60."""
        self.reset_services()
        self.cfg("s1", piggy_pay_type="fixed", piggy_pay_value=1000)
        self.complete(self.make_booking(*S1, 10000)["id"])
        piggy = self.piggy_bank()
        self.assertEqual(piggy["wash"]["totalMaster"], 3000)
        self.assertEqual(piggy["wash"]["totalPiggy"], 1000)
        self.assertEqual(piggy["wash"]["classicMaster"], 3000)
        self.assertEqual(piggy["wash"]["classicPiggy"], 1000)
        self.assertEqual(piggy["remainingInPiggyBank"], 1000)

        self.cfg("s2", master_pay_type="percent", master_pay_value=50)
        self.complete(self.make_booking(*S2, 10000)["id"])
        piggy = self.piggy_bank()
        self.assertEqual(piggy["detailing"]["detailingMaster"], 5000)

    def test_wallet_ignores_soft_deleted(self) -> None:
        """F1: удалённые (cleanup) доходы/расходы не входят в итоги кошелька."""
        date = self.next_active_date()
        income = self.client.post(
            "/api/owner/incomes", headers=self.auth_headers(self.owner_token),
            json={"amount": 5000, "source": "Тест", "date": date, "resourceGroup": "wash"})
        self.assertEqual(income.status_code, 201, income.text)
        expense = self.client.post(
            "/api/expenses", headers=self.auth_headers(self.owner_token),
            json={"title": "Тест", "amount": 1000, "category": "Материалы",
                  "date": date, "resourceGroup": "wash"})
        self.assertEqual(expense.status_code, 200, expense.text)
        before = self.client.get(
            "/api/owner/wallet", headers=self.auth_headers(self.owner_token),
            params={"date_from": date, "date_to": date})
        self.assertEqual(before.status_code, 200, before.text)
        self.assertEqual(before.json()["totalIncome"], 5000)
        self.assertEqual(before.json()["totalExpense"], 1000)

        day_iso = f"{date[6:10]}-{date[3:5]}-{date[0:2]}"
        cleanup = self.client.post(
            "/api/owner/data-cleanup/execute", headers=self.auth_headers(self.owner_token),
            json={"entities": ["incomes", "expenses"], "mode": "range",
                  "dateFrom": day_iso, "dateTo": day_iso})
        self.assertEqual(cleanup.status_code, 200, cleanup.text)
        after = self.client.get(
            "/api/owner/wallet", headers=self.auth_headers(self.owner_token),
            params={"date_from": date, "date_to": date})
        self.assertEqual(after.status_code, 200, after.text)
        self.assertEqual(after.json()["totalIncome"], 0)
        self.assertEqual(after.json()["totalExpense"], 0)

    def test_piggy_breakdown_outsource_dop(self) -> None:
        """F2: аутсорс-доп в карточке копилки: 24% от (цена − аутсорс), а не от цены."""
        self.reset_services()
        booking = self.make_booking(*S1, 10000)
        self.add_dop(booking["id"], name="Аутсорс", price=2000, priceMode="add",
                     isOutsource=True, outsourceAmount=1500, workers=[])
        self.complete(booking["id"])
        piggy = self.piggy_bank()
        self.assertEqual(piggy["wash"]["additionalPiggy"], 120)

    def test_fractional_dop_rounding(self) -> None:
        """F3: доп 10₽/25%: мастеру 3 (HALF_UP), инвариант цена == мастер+копилка+владельцы."""
        self.reset_services()
        booking = self.make_booking(*S1, 10000)
        self.add_dop(booking["id"], name="Мелочь", price=10, priceMode="add",
                     workers=[{"workerId": "w1", "workerName": "Иван", "percent": 25}])
        booking = self.complete(booking["id"])
        split = self.split_of(booking["id"])
        self.assertEqual(split["price"], 10010)
        self.assertEqual(split["masterTotal"], 3003)
        self.assertEqual(split["masterTotal"] + split["piggyDeposit"] + split["ownersTotal"], 10010)

    def test_detail_override_keeps_own_dop(self) -> None:
        """F4: override основы + свой доп: детализация показывает override + доп."""
        self.reset_services()
        booking = self.make_booking(*S1, 10000)
        self.add_dop(booking["id"], name="Доп", price=2000, priceMode="add",
                     workers=[{"workerId": "w1", "workerName": "Иван", "percent": 50}])
        booking = self.complete(booking["id"])
        split = self.client.get(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token)).json()
        link_id = split["workers"][0]["linkId"]
        put = self.client.put(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
            json={"workers": [{"linkId": link_id, "overrideEarned": 777}],
                  "materialsCost": None, "piggyDeposit": None, "owners": []})
        self.assertEqual(put.status_code, 200, put.text)
        detail = put.json()
        self.assertEqual(detail["masterTotalAuto"], 1777)
        self.assertEqual(detail["masterTotal"], 1777)

    def test_cancelled_booking_drops_owner_accrual(self) -> None:
        """F5: отмена completed-записи убирает её pending-доли из ЗП владельцев."""
        self.reset_services()
        booking = self.complete(self.make_booking(*S1, 10000)["id"])
        date = booking["date"]

        def accrued() -> int:
            response = self.client.get(
                "/api/owner/owners/salary-detail",
                headers=self.auth_headers(self.owner_token),
                params={"period": "custom", "date_from": date, "date_to": date})
            self.assertEqual(response.status_code, 200, response.text)
            return sum(o["totalAccrued"] for o in response.json()["owners"])

        self.assertEqual(accrued(), 4600)
        cancel = self.client.patch(
            f"/api/bookings/{booking['id']}", headers=self.auth_headers(self.admin_token),
            json={"status": "cancelled"})
        self.assertEqual(cancel.status_code, 200, cancel.text)
        self.assertEqual(accrued(), 0)

    def test_owner_pay_salary_replay_after_full_payout(self) -> None:
        """F6: повтор выплаты тем же ключом после полного погашения — replay, а не 400."""
        from app.database import SessionLocal
        from app.models import OwnerProfitShare

        self.reset_services()
        booking = self.complete(self.make_booking(*S1, 10000)["id"])
        with SessionLocal() as db:
            share = db.scalar(select(OwnerProfitShare).where(
                OwnerProfitShare.booking_id == booking["id"],
                OwnerProfitShare.status == "pending"))
            self.assertIsNotNone(share)
            assert share is not None
            owner_id, pending = share.owner_id, int(share.amount)
        key = "f6-replay-key"
        first = self.client.post(
            "/api/owner/owners/pay-salary", headers=self.auth_headers(self.owner_token),
            json={"ownerId": owner_id, "amount": pending, "note": "", "clientRequestId": key})
        self.assertEqual(first.status_code, 200, first.text)
        second = self.client.post(
            "/api/owner/owners/pay-salary", headers=self.auth_headers(self.owner_token),
            json={"ownerId": owner_id, "amount": pending, "note": "", "clientRequestId": key})
        self.assertEqual(second.status_code, 200, second.text)
        self.assertEqual(second.json()["payoutId"], first.json()["payoutId"])
        self.assertEqual(second.json()["message"], "Выплата уже проведена ранее")

    def test_history_totals_match_archive_after_manual_piggy_edit(self) -> None:
        """D4: totals берут фактические проводки как архив, а не авто-расчёт."""
        self.reset_services()
        booking = self.complete(self.make_booking(*S1, 10000)["id"])
        date = booking["date"]
        put = self.client.put(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
            json={"workers": [], "materialsCost": None,
                  "piggyDeposit": 5000, "owners": []})
        self.assertEqual(put.status_code, 200, put.text)
        totals = self.client.get(
            "/api/owner/bookings-history/totals",
            headers=self.auth_headers(self.owner_token),
            params={"date_from": date, "date_to": date})
        self.assertEqual(totals.status_code, 200, totals.text)
        wash = [p for p in totals.json()["piggy"] if p["resourceGroup"] == "wash"]
        self.assertEqual(len(wash), 1)
        self.assertEqual(wash[0]["amount"], 5000)
        archive = self.client.get(
            "/api/owner/archive",
            headers=self.auth_headers(self.owner_token),
            params={"date_from": date, "date_to": date})
        self.assertEqual(archive.status_code, 200, archive.text)
        items = [b for b in archive.json()["bookings"] if b["id"] == booking["id"]]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["piggyDeposit"], 5000)

    def test_archive_profit_counts_booking_materials_once(self) -> None:
        """Архив: списание материалов сидит в net — Expense-строка не дублирует его в profit."""
        self.reset_services()
        stock = self.client.post(
            "/api/stock-items", headers=self.auth_headers(self.admin_token),
            json={"name": "Шампунь-тест", "qty": 100, "unit": "шт",
                  "unitPrice": 500, "category": "Химия"})
        self.assertEqual(stock.status_code, 200, stock.text)
        stock_id = stock.json()["id"]
        created = self.client.post(
            "/api/bookings", headers=self.auth_headers(self.admin_token),
            json={
                "clientId": "", "clientName": "Materials Client",
                "clientPhone": "+7 (999) 333-44-55",
                "service": "Мойка базовая", "serviceId": "s1",
                "date": self.next_active_date(), "time": "10:00", "duration": 30,
                "price": 10000, "status": "scheduled",
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
                "box": "Бокс 1", "paymentType": "cash",
                "car": "Lada Vesta", "plate": "A123BC",
                "materials": [{"id": "bm-1", "stockItemId": stock_id,
                               "name": "Шампунь-тест", "qty": 2,
                               "unit": "шт", "unitPrice": 500}],
            })
        self.assertEqual(created.status_code, 200, created.text)
        booking = self.complete(created.json()["id"])
        archive = self.client.get(
            "/api/owner/archive", headers=self.auth_headers(self.owner_token),
            params={"date_from": booking["date"], "date_to": booking["date"]})
        self.assertEqual(archive.status_code, 200, archive.text)
        summary = archive.json()["summary"]
        self.assertEqual(summary["revenue"], 10000)
        self.assertEqual(summary["net"], 9000)
        self.assertEqual(summary["totalExpense"], 0)
        self.assertEqual(summary["profit"], 9000)

    def test_money_flow_workers_include_override_dop(self) -> None:
        """money-flow: доп override-мастера входит в расшифровку workers."""
        self.reset_services()
        booking = self.make_booking(*S1, 10000)
        self.add_dop(booking["id"], name="Доп", price=2000, priceMode="add",
                     workers=[{"workerId": "w1", "workerName": "Иван", "percent": 50}])
        booking = self.complete(booking["id"])
        split = self.client.get(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token)).json()
        link_id = split["workers"][0]["linkId"]
        put = self.client.put(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
            json={"workers": [{"linkId": link_id, "overrideEarned": 777}],
                  "materialsCost": None, "piggyDeposit": None, "owners": []})
        self.assertEqual(put.status_code, 200, put.text)
        flow = self.client.get(
            "/api/owner/money-flow", headers=self.auth_headers(self.owner_token),
            params={"date_from": booking["date"], "date_to": booking["date"]})
        self.assertEqual(flow.status_code, 200, flow.text)
        entries = [e for e in flow.json()["entries"] if e["id"] == f"mf-b:{booking['id']}"]
        self.assertEqual(len(entries), 1)
        earned = sum(w["earned"] for w in entries[0]["distribution"]["workers"])
        self.assertEqual(earned, 1777)

    def test_credit_booking_zero_piggy_in_breakdown(self) -> None:
        """Кредит: в карточке копилки 0 (проводок нет), мастера/выручка как обычно."""
        self.reset_services()
        booking = self.complete(self.make_booking(*S1, 10000, payment_type="credit")["id"])
        piggy = self.piggy_bank()
        self.assertEqual(piggy["wash"]["totalMaster"], 3000)
        self.assertEqual(piggy["wash"]["totalPiggy"], 0)
        self.assertEqual(piggy["wash"]["totalRevenue"], 10000)
        self.assertEqual(piggy["remainingInPiggyBank"], 0)

    def test_settle_refund_visible_in_wash_piggy(self) -> None:
        """Возврат settle-month (deposit_return) входит в копилку мойки."""
        from app.database import SessionLocal
        from app.models import PiggyBankTransaction

        self.reset_services()
        date = self.next_active_date()
        with SessionLocal() as db:
            db.add(PiggyBankTransaction(
                id="pb-refund-1", booking_id=None, amount=7000,
                transaction_type="deposit_return",
                purpose="Депозит Тест: возврат моек",
                date=date, resource_group="wash"))
            db.commit()
        piggy = self.piggy_bank()
        self.assertEqual(piggy["wash"]["totalPiggy"], 7000)
        self.assertEqual(piggy["remainingInPiggyBank"], 7000)

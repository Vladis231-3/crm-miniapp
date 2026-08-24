"""Тесты эндпоинта движения денег: GET /api/owner/money-flow.

Единый журнал: приходы (брони, доходы, пополнения депозитов) →
распределения (мастера/копилка/владельцы/материалы) → выплаты (зарплаты,
владельцам, авансы, расходы) с защитой от двойного учёта.
"""

import json
import os
import sys
import unittest
import urllib.parse
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))


def reset_app_modules() -> None:
    for name in list(sys.modules):
        if name.startswith("app") or name in {"bot", "main"}:
            sys.modules.pop(name, None)


def build_init_data(telegram_id: str) -> str:
    """Build Telegram init data that passes insecure validation (no HMAC)."""
    return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})


class MoneyFlowEndpointTests(unittest.TestCase):
    ADMIN_TG_ID = "889011"
    WORKER_TG_ID = "889012"
    OWNER_TG_ID = "889013"

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

        self.restart_app()
        self._set_staff_telegram_ids()
        self.admin_token = build_init_data(self.ADMIN_TG_ID)
        self.worker_token = build_init_data(self.WORKER_TG_ID)
        self.owner_token = build_init_data(self.OWNER_TG_ID)

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

            engine.dispose()
        except ModuleNotFoundError:
            return

    def restart_app(self) -> None:
        if hasattr(self, "client_manager"):
            self.shutdown_app()
        reset_app_modules()
        from app.main import app

        self.client_manager = TestClient(app)
        self.client = self.client_manager.__enter__()

    def _set_staff_telegram_ids(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser

        mapping = {
            "admin": self.ADMIN_TG_ID,
            "ivan": self.WORKER_TG_ID,
            "owner": self.OWNER_TG_ID,
        }
        with SessionLocal() as db:
            staff = db.scalars(select(StaffUser)).all()
            for item in staff:
                if item.login in mapping:
                    item.telegram_chat_id = mapping[item.login]
            db.commit()

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

    def create_completed_booking(self, *, price: int = 1200, payment_type: str = "cash", settled: bool = True) -> dict:
        candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        times = ["08:00", "09:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "10:00"]
        create_response = None
        booking = None
        for day_offset in range(1, 15):
            next_date = candidate + timedelta(days=day_offset)
            if next_date.weekday() == 6:
                continue
            booking_date = next_date.strftime("%d.%m.%Y")
            for slot in times:
                payload = {
                    "clientId": "",
                    "clientName": "Flow Client",
                    "clientPhone": "+7 (999) 444-55-66",
                    "service": "Мойка базовая",
                    "serviceId": "s1",
                    "date": booking_date,
                    "time": slot,
                    "duration": 30,
                    "price": price,
                    "status": "scheduled",
                    "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
                    "box": "Бокс 1",
                    "paymentType": payment_type,
                    "car": "Lada Vesta",
                    "plate": "A123BC",
                }
                create_response = self.client.post(
                    "/api/bookings",
                    headers=self.auth_headers(self.admin_token),
                    json=payload,
                )
                if create_response.status_code == 200:
                    booking = create_response.json()
                    break
            if booking is not None:
                break
        self.assertIsNotNone(booking, f"Не удалось создать запись: {create_response.text if create_response else 'нет ответа'}")
        complete_response = self.client.patch(
            f"/api/bookings/{booking['id']}",
            headers=self.auth_headers(self.admin_token),
            json={"status": "completed", "paymentSettled": settled},
        )
        self.assertEqual(complete_response.status_code, 200, complete_response.text)
        return complete_response.json()

    def get_money_flow(self, *, token: str | None = None, **params) -> dict:
        query = urllib.parse.urlencode(params)
        response = self.client.get(
            f"/api/owner/money-flow?{query}",
            headers=self.auth_headers(token or self.owner_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    # ── Доступ и валидация ──

    def test_money_flow_requires_owner_role(self) -> None:
        response = self.client.get(
            "/api/owner/money-flow",
            headers=self.auth_headers(self.admin_token),
        )
        self.assertEqual(response.status_code, 403, response.text)

        response = self.client.get(
            "/api/owner/money-flow",
            headers=self.auth_headers(self.worker_token),
        )
        self.assertEqual(response.status_code, 403, response.text)

    def test_money_flow_rejects_invalid_date(self) -> None:
        response = self.client.get(
            "/api/owner/money-flow?date_from=not-a-date",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 422, response.text)

    # ── Приход выручки + распределение ──

    def test_booking_payment_entry_with_distribution(self) -> None:
        baseline = self.get_money_flow()
        booking = self.create_completed_booking(price=1200)

        data = self.get_money_flow()
        entry = next((e for e in data["entries"] if e["bookingId"] == booking["id"]), None)
        self.assertIsNotNone(entry, "Запись должна попасть в журнал")
        self.assertEqual(entry["kind"], "in")
        self.assertEqual(entry["type"], "booking_payment")
        self.assertEqual(entry["amount"], 1200)
        self.assertEqual(entry["method"], "cash")
        self.assertEqual(entry["counterparty"], "Flow Client")

        distribution = entry.get("distribution")
        self.assertIsNotNone(distribution)
        split = self.client.get(
            f"/api/owner/bookings/{booking['id']}/money-split",
            headers=self.auth_headers(self.owner_token),
        ).json()
        self.assertEqual(distribution["masterTotal"], split["masterTotal"])
        self.assertEqual(distribution["piggyDeposit"], split["piggyDeposit"])
        self.assertEqual(distribution["ownersTotal"], split["ownersTotal"])
        self.assertEqual(distribution["materialsCost"], split["materialsCost"])

        summary = data["summary"]
        self.assertEqual(
            summary["bookingRevenue"] - baseline["summary"]["bookingRevenue"], 1200
        )
        self.assertEqual(summary["allocatedWorkers"] - baseline["summary"]["allocatedWorkers"], split["masterTotal"])
        self.assertEqual(summary["allocatedPiggy"] - baseline["summary"]["allocatedPiggy"], split["piggyDeposit"])
        self.assertEqual(summary["allocatedOwners"] - baseline["summary"]["allocatedOwners"], split["ownersTotal"])
        self.assertEqual(summary["cashBalance"], summary["totalIn"] - summary["totalOut"])

    def test_credit_booking_is_not_cash_inflow(self) -> None:
        from app.database import SessionLocal
        from app.models import Booking

        baseline = self.get_money_flow()
        booking = self.create_completed_booking(price=900)
        with SessionLocal() as db:
            row = db.get(Booking, booking["id"])
            self.assertIsNotNone(row)
            row.payment_type = "credit"
            db.commit()

        data = self.get_money_flow()
        entry = next((e for e in data["entries"] if e["bookingId"] == booking["id"]), None)
        self.assertIsNotNone(entry)
        self.assertEqual(entry["kind"], "allocation")
        self.assertEqual(entry["type"], "booking_deposit_payment")
        self.assertEqual(data["summary"]["bookingRevenue"], baseline["summary"]["bookingRevenue"])

    def test_unpaid_booking_marked_as_allocation(self) -> None:
        baseline = self.get_money_flow()
        booking = self.create_completed_booking(price=700, settled=False)
        data = self.get_money_flow()
        entry = next((e for e in data["entries"] if e["bookingId"] == booking["id"]), None)
        self.assertIsNotNone(entry)
        self.assertEqual(entry["kind"], "allocation")
        self.assertEqual(entry["type"], "booking_unpaid")
        self.assertEqual(data["summary"]["bookingRevenue"], baseline["summary"]["bookingRevenue"])

    # ── Доходы / расходы ──

    def test_income_and_expense_entries(self) -> None:
        today = datetime.now().strftime("%d.%m.%Y")
        baseline = self.get_money_flow()
        income = self.client.post(
            "/api/owner/incomes",
            headers=self.auth_headers(self.owner_token),
            json={"amount": 5000, "source": "Аренда", "note": "", "date": today},
        )
        self.assertEqual(income.status_code, 201, income.text)
        expense = self.client.post(
            "/api/expenses",
            headers=self.auth_headers(self.owner_token),
            json={"title": "Химия", "amount": 1500, "category": "Химия", "date": today, "note": ""},
        )
        self.assertEqual(expense.status_code, 200, expense.text)

        data = self.get_money_flow()
        kinds = {(e["type"], e["amount"]) for e in data["entries"]}
        self.assertIn(("income", 5000), kinds)
        self.assertIn(("expense", 1500), kinds)
        self.assertEqual(
            data["summary"]["otherIncome"] - baseline["summary"]["otherIncome"], 5000
        )
        self.assertEqual(
            data["summary"]["expensesTotal"] - baseline["summary"]["expensesTotal"], 1500
        )
        self.assertEqual(data["summary"]["cashBalance"], data["summary"]["totalIn"] - data["summary"]["totalOut"])

    # ── Выплаты ──

    def test_worker_payout_counts_once(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser

        self.create_completed_booking(price=3000)
        with SessionLocal() as db:
            worker = db.scalars(select(StaffUser).where(StaffUser.login == "ivan")).one()
            worker_id = worker.id

        pay = self.client.post(
            f"/api/owner/workers/{worker_id}/pay-salary",
            headers=self.auth_headers(self.owner_token),
            json={"amount": 100, "period": "all", "segment": "all"},
        )
        self.assertEqual(pay.status_code, 200, pay.text)
        payout_id = pay.json()["payoutId"]
        linked_expense_id = pay.json()["expenseId"]

        data = self.get_money_flow()
        payouts = [e for e in data["entries"] if e["type"] == "payout_worker"]
        self.assertTrue(payouts, "Выплата должна попасть в журнал")
        self.assertTrue(any(e["id"] == f"mf-p:{payout_id}" for e in payouts))
        # Связанный Expense («Зарплата») не должен задваивать расходы
        self.assertFalse(
            any(e["id"] == f"mf-e:{linked_expense_id}" for e in data["entries"]),
            "Зеркальный расход выплаты не должен попадать в журнал",
        )
        self.assertGreaterEqual(data["summary"]["workerPayouts"], 100)

        person = next(
            (p for p in data["people"] if p["personId"] == worker_id), None
        )
        self.assertIsNotNone(person)
        self.assertEqual(person["role"], "worker")
        self.assertGreaterEqual(person["paid"], 100)

    def test_bonus_visible_as_allocation_not_expense(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser

        with SessionLocal() as db:
            worker = db.scalars(select(StaffUser).where(StaffUser.login == "ivan")).one()
            worker_id = worker.id

        bonus = self.client.post(
            "/api/payroll/entries",
            headers=self.auth_headers(self.owner_token),
            json={"workerId": worker_id, "kind": "bonus", "amount": 500, "note": "", "period": "all"},
        )
        self.assertEqual(bonus.status_code, 200, bonus.text)

        data = self.get_money_flow()
        bonus_entries = [e for e in data["entries"] if e["type"] == "salary_bonus"]
        self.assertTrue(bonus_entries, "Премия должна быть видна в журнале")
        self.assertEqual(bonus_entries[0]["kind"], "allocation")
        self.assertEqual(bonus_entries[0]["counterparty"], "Иван")
        # Зеркальный Expense премии исключён из расходов
        expenses_titles = [e["title"] for e in data["entries"] if e["type"] == "expense"]
        self.assertFalse(any("Премия" in t for t in expenses_titles))

    # ── Депозиты ──

    def test_deposit_topup_is_inflow(self) -> None:
        from app.database import SessionLocal
        from app.models import Client

        client_id = f"c-{uuid4().hex[:12]}"
        client_name = "Депозит Клиент"
        with SessionLocal() as db:
            db.add(
                Client(
                    id=client_id,
                    name=client_name,
                    phone="+7 (999) 555-00-11",
                    car="Lada",
                    plate="T002AA",
                    deposit_active=True,
                )
            )
            db.commit()

        baseline = self.get_money_flow()
        topup = self.client.post(
            f"/api/owner/deposits/{client_id}/topup",
            headers=self.auth_headers(self.owner_token),
            json={"clientId": client_id, "amount": 2500, "note": "Пополнение"},
        )
        self.assertEqual(topup.status_code, 200, topup.text)

        data = self.get_money_flow()
        entry = next((e for e in data["entries"] if e["type"] == "deposit_topup" and e["counterparty"] == client_name), None)
        self.assertIsNotNone(entry, "Пополнение депозита должно попасть в журнал")
        self.assertEqual(entry["kind"], "in")
        self.assertEqual(entry["amount"], 2500)
        self.assertIn("предоплата", entry["note"])
        self.assertEqual(
            data["summary"]["depositTopups"] - baseline["summary"]["depositTopups"], 2500
        )

    # ── Периоды ──

    def test_period_filtering_excludes_other_dates(self) -> None:
        booking = self.create_completed_booking(price=1200)
        old_date = (datetime.now() - timedelta(days=365)).strftime("%d.%m.%Y")

        data = self.get_money_flow(date_from=booking["date"], date_to=booking["date"])
        self.assertTrue(any(e["bookingId"] == booking["id"] for e in data["entries"]))
        revenue_in_range = sum(
            e["amount"] for e in data["entries"] if e["type"] == "booking_payment"
        )
        self.assertEqual(data["summary"]["bookingRevenue"], revenue_in_range)

        data = self.get_money_flow(date_from=old_date, date_to=old_date)
        self.assertFalse(any(e["bookingId"] == booking["id"] for e in data["entries"]))


from fastapi.testclient import TestClient
from sqlalchemy import select


if __name__ == "__main__":
    unittest.main()

"""
Regression tests for money-logic audit fixes:

- T1: NaN/Infinity rejected in payroll entry amounts; overrideEarned bounded (>= 0).
- T2: piggy-bank withdrawal links its mirror transaction to the budget expense
      (editing the expense must NOT duplicate the withdrawal);
      payroll expenses must never get piggy mirrors.
- T3: pay-salary response newBalance matches the salary screen balance
      (prorated salary base + additional-services-only workers).
- T4: clientRequestId makes pay-salary idempotent (no double payouts).
- T5: kind="payout" via /api/payroll/entries creates the budget Expense.
- T6: direct budget edits (PATCH expense/income) sync back to PayrollEntry.
- T7: actual postings (piggy deposit + owner profit shares) respect complaints,
      matching the displayed split (master + piggy + owners = base).
"""
from __future__ import annotations

import json
import os
import sys
import unittest
import urllib.parse
from datetime import datetime, timedelta, timezone
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
    """Build Telegram init data that passes insecure validation (no HMAC)."""
    return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})


class MoneyFixTestBase(unittest.TestCase):
    """Common env/db bootstrap for money-fix tests."""

    WORKER_TG_ID = "777001"  # ivan (w1)
    OWNER_TG_ID = "777002"

    def setUp(self) -> None:
        data_dir = Path(__file__).resolve().parents[1] / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = data_dir / f"test_money_{uuid4().hex}.sqlite3"
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
        # Постоянные владельцы: без них _allocate_owners не находит получателей
        # долей прибыли (owner_by_owner пуст при owners_total > 0).
        os.environ["PERMANENT_TELEGRAM_OWNERS"] = json.dumps(
            [
                {"id": "owner-tg-1", "login": "owner-tg-1", "telegram_id": "77701301", "name": "Владелец ТГ 1"},
                {"id": "owner-tg-2", "login": "owner-tg-2", "telegram_id": "77701302", "name": "Владелец ТГ 2"},
            ]
        )
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
            ivan = db.scalar(select(StaffUser).where(StaffUser.login == "ivan"))
            owner = db.scalar(select(StaffUser).where(StaffUser.login == "owner"))
            if ivan is not None:
                ivan.telegram_chat_id = self.WORKER_TG_ID
            if owner is not None:
                owner.telegram_chat_id = self.OWNER_TG_ID
            db.commit()

    @staticmethod
    def _auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": token}

    @staticmethod
    def _today() -> str:
        return datetime.now(timezone.utc).strftime("%d.%m.%Y")

    def _create_client(self) -> tuple[str, str]:
        from app.database import SessionLocal
        from app.models import Client
        from app.schemas import normalize_phone

        client_id = f"c-{uuid4().hex[:12]}"
        phone = normalize_phone(f"+7 (999) 000-{str(uuid4().int)[-4:]}")
        with SessionLocal() as db:
            db.add(
                Client(
                    id=client_id,
                    name="Тест Клиент",
                    phone=phone,
                    car="BMW",
                    plate="M001AA",
                )
            )
            db.commit()
        return client_id, phone

    def _create_completed_booking(
        self,
        *,
        price: int,
        workers: list[dict],
        payment_settled: bool = True,
    ) -> str:
        client_id, client_phone = self._create_client()
        response = self.client.post(
            "/api/bookings",
            headers=self._auth_headers(self.owner_token),
            json={
                "clientId": client_id,
                "clientName": "Тест Клиент",
                "clientPhone": client_phone,
                "service": "Мойка",
                "serviceId": "s1",
                "date": self._today(),
                "time": "10:00",
                "duration": 60,
                "price": price,
                "status": "completed",
                "workers": workers,
                "box": "Бокс 1",
                "paymentType": "cash",
                "paymentSettled": payment_settled,
                "car": "BMW",
                "plate": "M001AA",
                "notes": "",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["id"]


class PayrollAmountValidationTest(MoneyFixTestBase):
    """T1: NaN/Infinity и отрицательный overrideEarned отклоняются."""

    def test_nan_amount_rejected_with_422(self) -> None:
        # Starlette парсит NaN-литерал в float('nan'); pydantic должен отклонить.
        response = self.client.post(
            "/api/payroll/entries",
            headers=self._auth_headers(self.owner_token),
            data=json.dumps(
                {"workerId": "w1", "kind": "bonus", "amount": float("nan"), "note": ""}
            ),
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_infinite_amount_rejected_with_422(self) -> None:
        response = self.client.post(
            "/api/payroll/entries",
            headers=self._auth_headers(self.owner_token),
            data=json.dumps(
                {
                    "workerId": "w1",
                    "kind": "advance",
                    "amount": float("inf"),
                    "note": "",
                }
            ),
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_negative_override_earned_rejected_with_422(self) -> None:
        booking_id = self._create_completed_booking(
            price=5000,
            workers=[{"workerId": "w1", "workerName": "Иван", "percent": 30}],
        )

        from app.database import SessionLocal
        from app.models import BookingWorker
        from sqlalchemy import select

        with SessionLocal() as db:
            link_id = db.scalar(
                select(BookingWorker.id).where(BookingWorker.booking_id == booking_id)
            )
            self.assertIsNotNone(link_id)

        response = self.client.put(
            f"/api/payroll/booking-workers/{link_id}/override-earned",
            headers=self._auth_headers(self.owner_token),
            json={"overrideEarned": -5000},
        )
        self.assertEqual(response.status_code, 422, response.text)


class PiggyWithdrawLinkTest(MoneyFixTestBase):
    """T2: правка расхода, созданного снятием из копилки, не дублирует списание."""

    def test_editing_withdraw_expense_updates_single_mirror(self) -> None:
        # Снятие 1000 из копилки мойки без привязки к записи
        withdraw_response = self.client.post(
            "/api/owner/piggy-bank/withdraw",
            headers=self._auth_headers(self.owner_token),
            json={
                "resourceGroup": "wash",
                "materialName": "Полироль",
                "materialCost": 1000,
                "purpose": "закупка",
                "date": self._today(),
                "withdrawKind": "materials",
            },
        )
        self.assertEqual(withdraw_response.status_code, 200, withdraw_response.text)

        from app.database import SessionLocal
        from app.models import Expense, PiggyBankTransaction
        from sqlalchemy import func, select

        with SessionLocal() as db:
            expense = db.scalar(
                select(Expense).where(Expense.title.like("Материалы:%"))
            )
            self.assertIsNotNone(expense)
            assert expense is not None
            expense_id = expense.id
            # Пара связана сразу после создания
            linked_tx_count = db.scalar(
                select(func.count()).where(
                    PiggyBankTransaction.expense_id == expense_id
                )
            )
            self.assertEqual(linked_tx_count, 1)
            total_before = db.scalar(select(func.count(PiggyBankTransaction.id)))

        # Редактируем расход напрямую — зеркало должно обновиться, а не задвоиться
        patch_response = self.client.patch(
            f"/api/expenses/{expense_id}",
            headers=self._auth_headers(self.owner_token),
            json={"amount": 1200},
        )
        self.assertEqual(patch_response.status_code, 200, patch_response.text)

        with SessionLocal() as db:
            total_after = db.scalar(select(func.count(PiggyBankTransaction.id)))
            self.assertEqual(total_after, total_before, "зеркало задвоилось")

            tx = db.scalar(
                select(PiggyBankTransaction).where(
                    PiggyBankTransaction.expense_id == expense_id
                )
            )
            self.assertIsNotNone(tx)
            assert tx is not None
            self.assertEqual(int(tx.amount), -1200)

    def test_payroll_expense_never_gets_piggy_mirror(self) -> None:
        self._create_completed_booking(
            price=5000,
            workers=[{"workerId": "w1", "workerName": "Иван", "percent": 30}],
        )
        pay_response = self.client.post(
            "/api/owner/workers/w1/pay-salary",
            headers=self._auth_headers(self.owner_token),
            json={"period": "all", "segment": "all", "amount": 100, "note": ""},
        )
        self.assertEqual(pay_response.status_code, 200, pay_response.text)
        expense_id = pay_response.json()["expenseId"]

        patch_response = self.client.patch(
            f"/api/expenses/{expense_id}",
            headers=self._auth_headers(self.owner_token),
            json={"amount": 150},
        )
        self.assertEqual(patch_response.status_code, 200, patch_response.text)

        from app.database import SessionLocal
        from app.models import PiggyBankTransaction
        from sqlalchemy import select

        with SessionLocal() as db:
            mirror = db.scalar(
                select(PiggyBankTransaction).where(
                    PiggyBankTransaction.expense_id == expense_id
                )
            )
            self.assertIsNone(mirror, "зарплатный расход получил зеркало в копилке")


class PaySalaryBalanceConsistencyTest(MoneyFixTestBase):
    """T3: newBalance выплаты совпадает с балансом экрана ЗП."""

    def test_new_balance_matches_screen_after_payout(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser

        with SessionLocal() as db:
            ivan = db.get(StaffUser, "w1")
            assert ivan is not None
            ivan.salary_base = 31000
            db.commit()

        self._create_completed_booking(
            price=1000,
            workers=[{"workerId": "w1", "workerName": "Иван", "percent": 50}],
        )

        detail_before = self.client.get(
            "/api/owner/workers/w1/salary-detail?period=day",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(detail_before.status_code, 200, detail_before.text)
        balance_before = detail_before.json()["balanceToPay"]
        self.assertGreater(balance_before, 0)

        pay_response = self.client.post(
            "/api/owner/workers/w1/pay-salary",
            headers=self._auth_headers(self.owner_token),
            json={
                "period": "day",
                "segment": "all",
                "amount": balance_before,
                "note": "",
            },
        )
        self.assertEqual(pay_response.status_code, 200, pay_response.text)

        detail_after = self.client.get(
            "/api/owner/workers/w1/salary-detail?period=day",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(detail_after.status_code, 200, detail_after.text)
        self.assertEqual(
            pay_response.json()["newBalance"],
            detail_after.json()["balanceToPay"],
            "newBalance расходится с экраном ЗП",
        )

    def test_asvc_only_worker_balance_counts_additional_services(self) -> None:
        booking_id = self._create_completed_booking(
            price=5000,
            workers=[{"workerId": "w2", "workerName": "Олег", "percent": 30}],
        )
        asvc_response = self.client.post(
            f"/api/bookings/{booking_id}/additional-services",
            headers=self._auth_headers(self.owner_token),
            json={
                "name": "Полировка",
                "price": 2000,
                "duration": 30,
                "priceMode": "add",
                "isOutsource": False,
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 50}],
            },
        )
        self.assertEqual(asvc_response.status_code, 200, asvc_response.text)

        detail = self.client.get(
            "/api/owner/workers/w1/salary-detail?period=all",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(detail.status_code, 200, detail.text)
        self.assertEqual(detail.json()["balanceToPay"], 1000)

        pay_response = self.client.post(
            "/api/owner/workers/w1/pay-salary",
            headers=self._auth_headers(self.owner_token),
            json={"period": "all", "segment": "all", "amount": 1000, "note": ""},
        )
        self.assertEqual(pay_response.status_code, 200, pay_response.text)
        self.assertEqual(
            pay_response.json()["newBalance"],
            0,
            "заработок мастера «только на допуслугах» не учтён в newBalance",
        )


class PaySalaryIdempotencyTest(MoneyFixTestBase):
    """T4: повторная отправка с тем же clientRequestId не создаёт дубликат."""

    def _pay(self, request_key: str | None) -> dict:
        response = self.client.post(
            "/api/owner/workers/w1/pay-salary",
            headers=self._auth_headers(self.owner_token),
            json={
                "period": "month",
                "segment": "all",
                "amount": 500,
                "note": "",
                **({"clientRequestId": request_key} if request_key else {}),
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_duplicate_request_returns_same_payout(self) -> None:
        first = self._pay("req-key-123")
        second = self._pay("req-key-123")

        self.assertEqual(first["payoutId"], second["payoutId"])

        from app.database import SessionLocal
        from app.models import Expense, PayrollEntry
        from sqlalchemy import func, select

        with SessionLocal() as db:
            payouts = db.scalar(
                select(func.count()).where(
                    PayrollEntry.worker_id == "w1", PayrollEntry.kind == "payout"
                )
            )
            expenses = db.scalar(
                select(func.count()).where(Expense.title == "Зарплата: Иван")
            )
            self.assertEqual(payouts, 1, "дубль PayrollEntry создан")
            self.assertEqual(expenses, 1, "дубль Expense создан")

    def test_different_keys_create_separate_payouts(self) -> None:
        first = self._pay("req-key-a")
        second = self._pay("req-key-b")
        self.assertNotEqual(first["payoutId"], second["payoutId"])

        from app.database import SessionLocal
        from app.models import PayrollEntry
        from sqlalchemy import func, select

        with SessionLocal() as db:
            payouts = db.scalar(
                select(func.count()).where(
                    PayrollEntry.worker_id == "w1", PayrollEntry.kind == "payout"
                )
            )
            self.assertEqual(payouts, 2)


class PayoutViaEntriesCreatesExpenseTest(MoneyFixTestBase):
    """T5: выплата через /api/payroll/entries списывается из бюджета."""

    def test_payout_entry_creates_expense(self) -> None:
        response = self.client.post(
            "/api/payroll/entries",
            headers=self._auth_headers(self.owner_token),
            json={
                "workerId": "w1",
                "kind": "payout",
                "amount": 300,
                "note": "тестовая выплата",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)

        from app.database import SessionLocal
        from app.models import Expense, PayrollEntry
        from sqlalchemy import select

        with SessionLocal() as db:
            entry = db.scalar(
                select(PayrollEntry).where(
                    PayrollEntry.worker_id == "w1", PayrollEntry.kind == "payout"
                )
            )
            self.assertIsNotNone(entry)
            assert entry is not None
            self.assertIsNotNone(entry.expense_id, "выплата без Expense бюджета")

            expense = db.get(Expense, entry.expense_id)
            self.assertIsNotNone(expense)
            assert expense is not None
            self.assertEqual(int(expense.amount), 300)
            self.assertTrue(expense.title.startswith("Выплата:"))


class ReverseBudgetSyncTest(MoneyFixTestBase):
    """T6: прямая правка бюджета обновляет зарплатную операцию."""

    def test_editing_bonus_expense_updates_payroll_entry(self) -> None:
        create_response = self.client.post(
            "/api/payroll/entries",
            headers=self._auth_headers(self.owner_token),
            json={"workerId": "w1", "kind": "bonus", "amount": 200, "note": ""},
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)

        from app.database import SessionLocal
        from app.models import Expense
        from sqlalchemy import select

        with SessionLocal() as db:
            expense = db.scalar(
                select(Expense).where(Expense.title.like("Премия:%"))
            )
            self.assertIsNotNone(expense)
            assert expense is not None
            expense_id = expense.id

        patch_response = self.client.patch(
            f"/api/expenses/{expense_id}",
            headers=self._auth_headers(self.owner_token),
            json={"amount": 350},
        )
        self.assertEqual(patch_response.status_code, 200, patch_response.text)

        detail = self.client.get(
            "/api/owner/workers/w1/salary-detail?period=all",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(detail.status_code, 200, detail.text)
        bonus_entries = [
            e for e in detail.json()["entries"] if e["kind"] == "bonus"
        ]
        self.assertEqual(len(bonus_entries), 1)
        self.assertEqual(
            bonus_entries[0]["amount"],
            350,
            "правка расхода в бюджете не синхронизировалась с ведомостью",
        )

    def test_editing_deduction_income_updates_payroll_entry(self) -> None:
        create_response = self.client.post(
            "/api/payroll/entries",
            headers=self._auth_headers(self.owner_token),
            json={"workerId": "w1", "kind": "deduction", "amount": 100, "note": ""},
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)

        from app.database import SessionLocal
        from app.models import Income
        from sqlalchemy import select

        with SessionLocal() as db:
            income = db.scalar(
                select(Income).where(Income.source.like("Штраф:%"))
            )
            self.assertIsNotNone(income)
            assert income is not None
            income_id = income.id

        patch_response = self.client.patch(
            f"/api/owner/incomes/{income_id}",
            headers=self._auth_headers(self.owner_token),
            json={"amount": 250},
        )
        self.assertEqual(patch_response.status_code, 200, patch_response.text)

        detail = self.client.get(
            "/api/owner/workers/w1/salary-detail?period=all",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(detail.status_code, 200, detail.text)
        deduction_entries = [
            e for e in detail.json()["entries"] if e["kind"] == "deduction"
        ]
        self.assertEqual(len(deduction_entries), 1)
        self.assertEqual(deduction_entries[0]["amount"], 250)


class EditAdjustmentBudgetSyncTest(MoneyFixTestBase):
    """M2: редактирование корректировки с отрицательной суммой синхронизирует
    бюджетную запись (перевод между Expense/Income без дублей)."""

    def _create_adjustment(self, amount: int) -> str:
        create_response = self.client.post(
            "/api/payroll/entries",
            headers=self._auth_headers(self.owner_token),
            json={"workerId": "w1", "kind": "adjustment", "amount": amount, "note": ""},
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)

        from app.database import SessionLocal
        from app.models import PayrollEntry
        from sqlalchemy import select

        with SessionLocal() as db:
            entry = db.scalar(
                select(PayrollEntry).where(
                    PayrollEntry.worker_id == "w1", PayrollEntry.kind == "adjustment"
                )
            )
            self.assertIsNotNone(entry)
            assert entry is not None
            return entry.id

    def assert_budget(self, *, expenses: int, incomes: int) -> None:
        from app.database import SessionLocal
        from app.models import Expense, Income
        from sqlalchemy import func, select

        with SessionLocal() as db:
            exp_count = db.scalar(
                select(func.count()).where(Expense.title.like("Корректировка:%"))
            )
            inc_count = db.scalar(
                select(func.count()).where(Income.source.like("Корректировка:%"))
            )
            self.assertEqual(exp_count, expenses, "неверное число Expense (корректировка)")
            self.assertEqual(inc_count, incomes, "неверное число Income (корректировка)")

    def test_negative_adjustment_syncs_income(self) -> None:
        entry_id = self._create_adjustment(500)
        self.assert_budget(expenses=1, incomes=0)

        # Меняем знак: +500 → −300. Expense удаляется, создаётся Income.
        response = self.client.put(
            f"/api/payroll/entries/{entry_id}",
            headers=self._auth_headers(self.owner_token),
            json={"amount": -300, "note": "Минус"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assert_budget(expenses=0, incomes=1)

        # Правка без смены знака не дублирует запись.
        response = self.client.put(
            f"/api/payroll/entries/{entry_id}",
            headers=self._auth_headers(self.owner_token),
            json={"amount": -400, "note": "Минус больше"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assert_budget(expenses=0, incomes=1)

    def test_negative_to_positive_adjustment_undoes_income(self) -> None:
        entry_id = self._create_adjustment(-500)
        self.assert_budget(expenses=0, incomes=1)

        # Меняем знак: −500 → +700. Income удаляется, создаётся Expense.
        response = self.client.put(
            f"/api/payroll/entries/{entry_id}",
            headers=self._auth_headers(self.owner_token),
            json={"amount": 700, "note": "Плюс"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assert_budget(expenses=1, incomes=0)


class ComplaintPostingsConsistencyTest(MoneyFixTestBase):
    """T7: проводки копилки и долей владельцев учитывают жалобы так же, как расчётка."""

    def test_postings_match_complaint_adjusted_split(self) -> None:
        from app.database import SessionLocal
        from app.models import (
            OwnerProfitShare,
            Penalty,
            PiggyBankTransaction,
            Service,
            StaffUser,
        )
        from sqlalchemy import func, select

        # Сервисный режим: мастер 40%, копилка 24%
        with SessionLocal() as db:
            svc = db.get(Service, "s1")
            self.assertIsNotNone(svc)
            assert svc is not None
            svc.master_pay_type = "percent"
            svc.master_pay_value = 40
            svc.piggy_pay_type = "percent"
            svc.piggy_pay_value = 24
            svc.split_order = []
            owner = db.scalars(
                select(StaffUser).where(StaffUser.role == "owner")
            ).first()
            self.assertIsNotNone(owner)
            assert owner is not None
            # 3 активные жалобы на w1 → вес 30−10=20
            for i in range(3):
                db.add(
                    Penalty(
                        id=f"p-money-{i}",
                        worker_id="w1",
                        owner_id=owner.id,
                        title="Жалоба",
                        reason="тест",
                        amount=0,
                        score=5,
                        active_until=datetime.now(timezone.utc) + timedelta(days=7),
                        created_at=datetime.now(timezone.utc) - timedelta(hours=1),
                    )
                )
            db.commit()

        # Бронь создаётся запланированной: переход в completed триггерит
        # фактические проводки (копилка + доли владельцев).
        client_id, client_phone = self._create_client()
        create_response = self.client.post(
            "/api/bookings",
            headers=self._auth_headers(self.owner_token),
            json={
                "clientId": client_id,
                "clientName": "Тест Клиент",
                "clientPhone": client_phone,
                "service": "Мойка",
                "serviceId": "s1",
                "date": self._today(),
                "time": "10:00",
                "duration": 60,
                "price": 10000,
                "status": "scheduled",
                "workers": [
                    {"workerId": "w1", "workerName": "Иван", "percent": 30},
                    {"workerId": "w2", "workerName": "Олег", "percent": 20},
                ],
                "box": "Бокс 1",
                "paymentType": "cash",
                "paymentSettled": False,
                "car": "BMW",
                "plate": "M001AA",
                "notes": "",
            },
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)
        booking_id = create_response.json()["id"]

        complete_response = self.client.patch(
            f"/api/bookings/{booking_id}",
            headers=self._auth_headers(self.owner_token),
            json={"status": "completed", "paymentSettled": True},
        )
        self.assertEqual(complete_response.status_code, 200, complete_response.text)

        # Отображаемый сплит (с жалобами): мастер 4000, каждому по 2000
        split_response = self.client.get(
            f"/api/owner/bookings/{booking_id}/money-split",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(split_response.status_code, 200, split_response.text)
        split = split_response.json()
        self.assertEqual(split["masterTotal"], 4000)

        with SessionLocal() as db:
            deposit = db.scalar(
                select(func.coalesce(func.sum(PiggyBankTransaction.amount), 0)).where(
                    PiggyBankTransaction.booking_id == booking_id,
                    PiggyBankTransaction.transaction_type == "deposit_24percent",
                )
            )
            owners_accrued = db.scalar(
                select(func.coalesce(func.sum(OwnerProfitShare.amount), 0)).where(
                    OwnerProfitShare.booking_id == booking_id
                )
            )

        # Копилка: 24% от базы; владельцы: остальное от сплита С жалобами.
        self.assertEqual(int(deposit), 2400, "вклад копилки посчитан без учёта жалоб")
        self.assertEqual(
            int(owners_accrued),
            3600,
            "доли владельцев посчитаны без учёта жалоб (ожидалось 10000−4000−2400)",
        )
        # Сверка баланса: мастер + копилка + владельцы = выручка
        self.assertEqual(int(split["masterTotal"]) + int(deposit) + int(owners_accrued), 10000)


class PayrollEntriesIdempotencyTest(MoneyFixTestBase):
    """T7: /api/payroll/entries с тем же clientRequestId не создаёт дубликат."""

    def _create(self, request_key: str | None) -> dict:
        response = self.client.post(
            "/api/payroll/entries",
            headers=self._auth_headers(self.owner_token),
            json={
                "workerId": "w1",
                "kind": "bonus",
                "amount": 700,
                "note": "Премия",
                **({"clientRequestId": request_key} if request_key else {}),
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_duplicate_request_creates_single_entry(self) -> None:
        first = self._create("entry-key-123")
        second = self._create("entry-key-123")

        # Ответ — WorkerPayload одного и того же мастера.
        self.assertEqual(first["id"], second["id"])

        from app.database import SessionLocal
        from app.models import Expense, PayrollEntry
        from sqlalchemy import func, select

        with SessionLocal() as db:
            bonuses = db.scalar(
                select(func.count()).where(
                    PayrollEntry.worker_id == "w1", PayrollEntry.kind == "bonus"
                )
            )
            expenses = db.scalar(
                select(func.count()).where(Expense.title == "Премия: Иван")
            )
            self.assertEqual(bonuses, 1, "дубль PayrollEntry создан")
            self.assertEqual(expenses, 1, "дубль Expense создан")

    def test_different_keys_create_separate_entries(self) -> None:
        self._create("entry-key-a")
        self._create("entry-key-b")

        from app.database import SessionLocal
        from app.models import PayrollEntry
        from sqlalchemy import func, select

        with SessionLocal() as db:
            bonuses = db.scalar(
                select(func.count()).where(
                    PayrollEntry.worker_id == "w1", PayrollEntry.kind == "bonus"
                )
            )
            self.assertEqual(bonuses, 2)


class OwnerPaySalaryIdempotencyTest(MoneyFixTestBase):
    """T8: выплата владельцу с тем же clientRequestId не создаёт дубликат."""

    def _pending_owner_with_share(self) -> str:
        # Доли владельцев появляются при переходе записи в completed
        # (фактические проводки: копилка + доли владельцев).
        client_id, client_phone = self._create_client()
        create_response = self.client.post(
            "/api/bookings",
            headers=self._auth_headers(self.owner_token),
            json={
                "clientId": client_id,
                "clientName": "Тест Клиент",
                "clientPhone": client_phone,
                "service": "Мойка",
                "serviceId": "s1",
                "date": self._today(),
                "time": "10:00",
                "duration": 60,
                "price": 10000,
                "status": "scheduled",
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
                "box": "Бокс 1",
                "paymentType": "cash",
                "paymentSettled": False,
                "car": "BMW",
                "plate": "M001AA",
                "notes": "",
            },
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)
        booking_id = create_response.json()["id"]
        complete_response = self.client.patch(
            f"/api/bookings/{booking_id}",
            headers=self._auth_headers(self.owner_token),
            json={"status": "completed", "paymentSettled": True},
        )
        self.assertEqual(complete_response.status_code, 200, complete_response.text)

        from app.database import SessionLocal
        from app.models import OwnerProfitShare
        from sqlalchemy import select

        with SessionLocal() as db:
            share = db.scalar(
                select(OwnerProfitShare).where(OwnerProfitShare.status == "pending")
            )
            self.assertIsNotNone(share, "pending-доля владельца не создана")
            return share.owner_id

    def _pay(self, owner_db_id: str, request_key: str | None) -> dict:
        response = self.client.post(
            "/api/owner/owners/pay-salary",
            headers=self._auth_headers(self.owner_token),
            json={
                "ownerId": owner_db_id,
                "amount": 100,
                "note": "",
                **({"clientRequestId": request_key} if request_key else {}),
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_duplicate_request_creates_single_payout(self) -> None:
        owner_db_id = self._pending_owner_with_share()
        first = self._pay(owner_db_id, "owner-key-123")
        second = self._pay(owner_db_id, "owner-key-123")

        self.assertEqual(first["payoutId"], second["payoutId"])

        from app.database import SessionLocal
        from app.models import PayrollEntry
        from sqlalchemy import func, select

        with SessionLocal() as db:
            payouts = db.scalar(
                select(func.count()).where(
                    PayrollEntry.worker_id == owner_db_id,
                    PayrollEntry.kind == "payout",
                )
            )
            self.assertEqual(payouts, 1, "дубль выплаты владельцу создан")

    def test_different_keys_create_separate_payouts(self) -> None:
        owner_db_id = self._pending_owner_with_share()
        first = self._pay(owner_db_id, "owner-key-a")
        second = self._pay(owner_db_id, "owner-key-b")
        self.assertNotEqual(first["payoutId"], second["payoutId"])


if __name__ == "__main__":
    unittest.main()

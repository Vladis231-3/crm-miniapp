"""
Единая формула копилки: карточки мойки/детейлинга/общей, «Все», all-time
balance и недельные остатки считаются одинаково.

Правила владельца:
- ЗП (выплаты/авансы/премии/корректировки/штрафы, категория «Зарплата»,
  оплата смен) копилку не трогает;
- обычные расходы группы уменьшают её копилку, обычные доходы — увеличивают;
- списание материалов по записи (Expense с booking_id) не вычитается повторно;
- расход-пара снятия считается один раз (через транзакцию копилки).
"""
from __future__ import annotations

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


# Суббота 04.01.2020 и следующая неделя — далеко от демо-данных.
SAT1 = "04.01.2020"
MON1 = "06.01.2020"
SAT2 = "11.01.2020"


class PiggyUnifiedBalanceTests(unittest.TestCase):
    OWNER_TG_ID = "778901"

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

        from app.database import SessionLocal
        from app.models import StaffUser
        from sqlalchemy import select

        with SessionLocal() as db:
            owner = db.scalar(select(StaffUser).where(StaffUser.login == "owner"))
            owner.telegram_chat_id = self.OWNER_TG_ID
            self.owner_id = owner.id
            worker = db.scalar(select(StaffUser).where(StaffUser.role == "worker"))
            self.worker_id = worker.id
            db.commit()
        self.headers = {"Authorization": build_init_data(self.OWNER_TG_ID)}

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

    def _piggy(self, **params: str) -> dict:
        r = self.client.get("/api/owner/piggy-bank", headers=self.headers, params=params)
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()

    @staticmethod
    def _cards(pb: dict) -> dict[str, float]:
        return {
            "wash": float(pb["remainingInPiggyBank"]),
            "detailing": float(pb["detailing"]["netPiggy"]),
            "general": float(pb.get("generalNetPiggy") or 0),
            "combined": float(pb["combinedBalance"]),
            "balance": float(pb["balance"]),
        }

    def _tx(self, db, group: str, ttype: str, amount: float, date: str, expense_id: str | None = None) -> str:
        from app.models import PiggyBankTransaction

        tid = f"pb-{uuid4()}"
        db.add(PiggyBankTransaction(
            id=tid, booking_id=None, amount=amount, transaction_type=ttype,
            purpose=f"test {ttype}", material_name=None, material_cost=None,
            date=date, resource_group=group, expense_id=expense_id,
        ))
        return tid

    def _expense(self, db, group: str, amount: float, date: str, *, category: str = "Прочее",
                 booking_id: str | None = None) -> str:
        from app.models import Expense

        eid = f"e-{uuid4()}"
        db.add(Expense(id=eid, title="test", amount=amount, category=category, date=date,
                       resource_group=group, booking_id=booking_id))
        return eid

    def _income(self, db, group: str, amount: float, date: str) -> str:
        from app.models import Income

        iid = str(uuid4())
        db.add(Income(id=iid, amount=amount, source="test", created_by_id=self.owner_id,
                      date=date, resource_group=group))
        return iid

    def _payroll(self, db, kind: str, amount: float, *, expense_id: str | None = None,
                 income_id: str | None = None) -> None:
        from app.models import PayrollEntry

        db.add(PayrollEntry(id=str(uuid4()), worker_id=self.worker_id, actor_id=self.owner_id,
                            actor_role="owner", kind=kind, amount=amount, note="",
                            expense_id=expense_id, income_id=income_id))

    # ------------------------------------------------------------------

    def test_cards_follow_unified_formula(self) -> None:
        from app.database import SessionLocal

        before = self._cards(self._piggy())
        with SessionLocal() as db:
            # Учитываются: +1000 adjust, −200 обычный расход, +150 обычный доход,
            # снятие −300 (+ его расход-пара, не задваивается), возврат +100,
            # deposit_return +50, month_return +25.
            self._tx(db, "wash", "adjust", 1000, SAT1)
            self._expense(db, "wash", 200, MON1)
            self._income(db, "wash", 150, MON1)
            pair = self._expense(db, "wash", 300, MON1, category="Материалы")
            self._tx(db, "wash", "material_withdrawal", -300, MON1, expense_id=pair)
            self._tx(db, "wash", "material_repayment", 100, MON1)
            self._tx(db, "wash", "deposit_return", 50, MON1)
            self._tx(db, "wash", "month_return", 25, MON1)
            # Не учитываются: ЗП (payout/advance/bonus/adjustment), категория
            # «Зарплата», штраф/удержание, списание материалов по записи,
            # зеркало type "expense".
            for kind in ("payout", "advance", "bonus", "adjustment"):
                self._payroll(db, kind, 500, expense_id=self._expense(db, "wash", 500, MON1, category="Зарплата"))
            self._expense(db, "wash", 700, MON1, category="Зарплата")
            self._payroll(db, "fine", 80, income_id=self._income(db, "wash", 80, MON1))
            self._expense(db, "wash", 400, MON1, category="Расходные материалы", booking_id="b-test")
            self._tx(db, "wash", "expense", -200, MON1)
            # Детейлинг и общая — те же правила.
            self._tx(db, "detailing", "adjust", 600, SAT1)
            self._expense(db, "detailing", 120, MON1)
            self._income(db, "detailing", 30, MON1)
            self._expense(db, "detailing", 999, MON1, category="Зарплата")
            self._tx(db, "general", "adjust", 300, SAT1)
            self._expense(db, "general", 40, MON1)
            db.commit()

        after = self._cards(self._piggy())
        delta = {k: round(after[k] - before[k], 2) for k in after}
        self.assertEqual(delta["wash"], 1000 - 200 + 150 - 300 + 100 + 50 + 25)
        self.assertEqual(delta["detailing"], 600 - 120 + 30)
        self.assertEqual(delta["general"], 300 - 40)
        self.assertEqual(delta["combined"], delta["wash"] + delta["detailing"] + delta["general"])
        self.assertEqual(delta["balance"], delta["combined"])
        # Без фильтра дат «Все» совпадает с all-time balance.
        self.assertAlmostEqual(after["combined"], after["balance"], places=2)

        # С фильтром дат карточка = только операции периода.
        ranged = self._cards(self._piggy(date_from=SAT1, date_to="10.01.2020"))
        self.assertEqual(ranged["wash"], 825)
        self.assertEqual(ranged["detailing"], 510)
        self.assertEqual(ranged["general"], 260)
        self.assertEqual(ranged["combined"], 825 + 510 + 260)

    def test_payroll_does_not_change_piggy(self) -> None:
        from app.database import SessionLocal

        before = self._cards(self._piggy())
        with SessionLocal() as db:
            for kind in ("payout", "advance", "bonus", "adjustment"):
                self._payroll(db, kind, 1234, expense_id=self._expense(db, "wash", 1234, MON1, category="Зарплата"))
            self._payroll(db, "deduction", 50, income_id=self._income(db, "wash", 50, MON1))
            db.commit()
        after = self._cards(self._piggy())
        self.assertEqual(after, before)

    def test_weekly_balance_matches_card_on_saturday(self) -> None:
        from app.database import SessionLocal

        with SessionLocal() as db:
            self._tx(db, "wash", "adjust", 1000, "28.12.2019")
            self._expense(db, "wash", 100, "30.12.2019")
            self._income(db, "wash", 40, "31.12.2019")
            self._expense(db, "wash", 500, "30.12.2019", category="Зарплата")
            # Неделя SAT1: снятие −200 и обычный расход 70, затем запись SAT2.
            wd = self._tx(db, "wash", "other_withdrawal", -200, MON1)
            self._expense(db, "wash", 70, MON1)
            nxt = self._tx(db, "wash", "adjust", 5, SAT2)
            db.commit()

        pb = self._piggy()
        by_id = {t["id"]: t for t in pb["transactions"]}
        # Остаток на утро SAT1 = всё до субботы по формуле карточки: 1000 − 100 + 40.
        self.assertEqual(by_id[wd]["weekStart"], SAT1)
        self.assertEqual(by_id[wd]["weekStartBalance"], 940)
        # Внутри недели вычитаются снятие и обычный расход того же дня.
        self.assertEqual(by_id[wd]["weeklyWithdrawn"], 270)
        self.assertEqual(by_id[wd]["weeklyBalance"], 670)
        # Утро SAT2 = карточка на конец недели SAT1.
        card_to_week_end = self._cards(self._piggy(date_from="01.01.2000", date_to="10.01.2020"))["wash"]
        self.assertEqual(by_id[nxt]["weekStartBalance"], card_to_week_end)


if __name__ == "__main__":
    unittest.main()

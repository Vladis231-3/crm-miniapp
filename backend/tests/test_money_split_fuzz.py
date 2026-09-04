"""Фаза 2.1: property-fuzz денежных инвариантов сплита (stdlib random, seed фиксирован).

Инварианты (регрессия AUDIT-06/13 на уровне API):
  1. masterTotal, piggyDeposit, ownersTotal — int и >= 0 при любых входах
     (кламп: override/fixed мастера больше чека не уводят копилку в минус).
  2. masterTotal + piggyDeposit + ownersTotal <= price (консервация).
  3. sum(masterByWorker) == masterTotal (внутренняя сходимость).
  4. Детерминизм: два GET подряд дают одинаковый сплит.
"""

from __future__ import annotations

import json
import os
import random
import sys
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


class MoneySplitFuzzTests(unittest.TestCase):
    ADMIN_TG_ID = "777031"
    OWNER_TG_ID = "777033"
    SEED = 20260903
    CASES = 120

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
    def auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": token}

    @staticmethod
    def active_dates(count: int) -> list[str]:
        candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        found: list[str] = []
        offset = 1
        while len(found) < count:
            day = candidate + timedelta(days=offset)
            offset += 1
            if day.weekday() == 6:
                continue
            found.append(day.strftime("%d.%m.%Y"))
        return found

    def make_completed_booking(
        self, price: int, workers: list[dict], date: str, time: str
    ) -> dict:
        create_response = self.client.post(
            "/api/bookings",
            headers=self.auth_headers(self.admin_token),
            json={
                "clientId": "",
                "clientName": "Fuzz Client",
                "clientPhone": "+7 (999) 222-33-44",
                "service": "Мойка базовая",
                "serviceId": "s1",
                "date": date,
                "time": time,
                "duration": 30,
                "price": price,
                "status": "scheduled",
                "workers": workers,
                "box": "Бокс 1",
                "paymentType": "cash",
                "car": "Lada Vesta",
                "plate": "A123BC",
            },
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)
        booking = create_response.json()
        complete_response = self.client.patch(
            f"/api/bookings/{booking['id']}",
            headers=self.auth_headers(self.admin_token),
            json={"status": "completed", "paymentSettled": True},
        )
        self.assertEqual(complete_response.status_code, 200, complete_response.text)
        return complete_response.json()

    def add_service(
        self, booking_id: str, price: int, price_mode: str, outsource: bool
    ) -> None:
        payload: dict = {
            "serviceId": "s1",
            "name": "Fuzz доп",
            "price": price,
            "duration": 15,
            "priceMode": price_mode,
            "isOutsource": outsource,
            "outsourceAmount": price // 2 if outsource else 0,
            "workers": [],
        }
        if not outsource:
            payload["workers"] = [{"workerId": "w1", "workerName": "Иван", "percent": 0}]
        response = self.client.post(
            f"/api/bookings/{booking_id}/additional-services",
            headers=self.auth_headers(self.admin_token),
            json=payload,
        )
        self.assertEqual(response.status_code, 200, response.text)

    def get_split(self, booking_id: str) -> dict:
        response = self.client.get(
            f"/api/owner/bookings/{booking_id}/money-split",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def assert_invariants(
        self, split: dict, price: int, has_explicit_pay: bool, case: str
    ) -> None:
        for key in ("splitBase", "masterTotal", "piggyDeposit", "ownersTotal"):
            self.assertIsInstance(split[key], int, f"{case}: {key} не int: {split[key]!r}")
            self.assertGreaterEqual(split[key], 0, f"{case}: {key} отрицателен: {split[key]}")
        for wid, amount in split["masterByWorker"].items():
            self.assertIsInstance(amount, int, f"{case}: masterByWorker[{wid}] не int")
            self.assertGreaterEqual(amount, 0, f"{case}: masterByWorker[{wid}] отрицателен")
        self.assertEqual(
            sum(split["masterByWorker"].values()),
            split["masterTotal"],
            f"{case}: сумма по мастерам != masterTotal",
        )
        # База консервации — актуальный чек (растёт от add-допуслуг):
        # распил не может превышать деньги, поступившие от клиента.
        # M-001 (сумма процентов > 100) теперь отклоняется валидацией.
        if not has_explicit_pay:
            inflow = split["price"]
            total = split["masterTotal"] + split["piggyDeposit"] + split["ownersTotal"]
            self.assertLessEqual(
                total, inflow, f"{case}: распил {total} превысил чек {inflow}: {split}"
            )

    def test_money_split_invariants_hold_on_random_mixes(self) -> None:
        rng = random.Random(self.SEED)
        prices = [0, 1, 99, 100, 999, 1000, 3333, 9999, 25000, 100000]
        percents = [0, 1, 33, 50, 100]
        fixed_amounts = [0, 1, 500, 1200, 5000, 200000]
        dates = self.active_dates(12)
        for index in range(self.CASES):
            price = rng.choice(prices)
            date = dates[(index // 10) % len(dates)]
            time = f"{9 + (index % 10):02d}:00"
            worker_count = rng.choice([1, 1, 2])
            workers = []
            has_explicit_pay = False
            if worker_count == 2:
                first_percent = rng.choice(percents)
                second_percent = rng.choice(
                    [p for p in percents if first_percent + p <= 100]
                )
                pair_mode = rng.random() < 0.5
                workers = [
                    {
                        "workerId": "w1",
                        "workerName": "Иван",
                        "percent": first_percent,
                    },
                    {
                        "workerId": "w2",
                        "workerName": "Пётр",
                        "percent": second_percent,
                    },
                ]
                if pair_mode:
                    # Один из двоих на фиксе: сумма процентов всё равно <= 100.
                    fixed_side = rng.choice([0, 1])
                    has_explicit_pay = True
                    workers[fixed_side] = {
                        "workerId": workers[fixed_side]["workerId"],
                        "workerName": workers[fixed_side]["workerName"],
                        "percent": 0,
                        "payType": "fixed",
                        "fixedAmount": rng.choice(fixed_amounts),
                    }
                if rng.random() < 0.15:
                    # Оба на фиксированной оплате: кап процентов не действует.
                    has_explicit_pay = True
                    workers = [
                        {
                            "workerId": "w1",
                            "workerName": "Иван",
                            "percent": 0,
                            "payType": "fixed",
                            "fixedAmount": rng.choice(fixed_amounts),
                        },
                        {
                            "workerId": "w2",
                            "workerName": "Пётр",
                            "percent": 0,
                            "payType": "fixed",
                            "fixedAmount": rng.choice(fixed_amounts),
                        },
                    ]
            else:
                if rng.random() < 0.5:
                    workers.append({
                        "workerId": "w1",
                        "workerName": "Иван",
                        "percent": rng.choice(percents),
                    })
                else:
                    has_explicit_pay = True
                    workers.append({
                        "workerId": "w1",
                        "workerName": "Иван",
                        "percent": 0,
                        "payType": "fixed",
                        "fixedAmount": rng.choice(fixed_amounts),
                    })
            asvc_roll = rng.random()
            with self.subTest(case=index, price=price, workers=workers, asvc=asvc_roll):
                booking = self.make_completed_booking(price, workers, date, time)
                if asvc_roll < 0.25:
                    self.add_service(
                        booking["id"], rng.choice([100, 2500]), "add", outsource=False
                    )
                elif asvc_roll < 0.4 and price > 0:
                    # M-002: вычеты вне базы отклоняются валидацией.
                    self.add_service(
                        booking["id"],
                        min(rng.choice([50, 900]), price),
                        "subtract",
                        outsource=False,
                    )
                elif asvc_roll < 0.4:
                    self.add_service(
                        booking["id"], rng.choice([100, 2500]), "add", outsource=False
                    )
                elif asvc_roll < 0.5:
                    self.add_service(
                        booking["id"], rng.choice([200, 1500]), "add", outsource=True
                    )
                first = self.get_split(booking["id"])
                case = f"case={index} price={price}"
                self.assert_invariants(first, price, has_explicit_pay, case)
                second = self.get_split(booking["id"])
                self.assertEqual(first, second, f"{case}: сплит недетерминирован")


if __name__ == "__main__":
    unittest.main()

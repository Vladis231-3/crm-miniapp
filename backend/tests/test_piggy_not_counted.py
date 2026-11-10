"""Копилка: блок «Не в копилке» и доли владельцев отменённых записей.

Повод (прод, ноябрь 2026): при пятничной сверке детейлинга касса оказалась
на 16 680 ₽ больше приложения. Часть денег сидела в записях, которых баланс
не видит: завершены, но не отмечены «Оплачено», или оплачены, но потом
отменены. Блок notInPiggy в GET /api/owner/piggy-bank показывает их сразу.

Проверяет:
- unpaid: неоплаченная завершённая запись → строка с суммой будущего вклада;
  после «Оплачено» строка уходит, а баланс растёт ровно на эту сумму;
- cancelled: оплаченная → отменённая → строка на сумму вклада, баланс его
  не считает; после удаления записи строка уходит;
- after_adjust: запись, проведённая после корректировки датой не позже её;
- кредитная неоплаченная запись строку не даёт;
- доли владельцев отменённой записи: не в ownerProfitTotal, не идут в выплату
  владельцу и не помечаются выплаченными; после повторного завершения доступны.
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


class PiggyNotCountedTests(unittest.TestCase):
    OWNER_TG_ID = "778201"

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
        self._set_owner_telegram_id()
        self.owner = {"Authorization": build_init_data(self.OWNER_TG_ID)}
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

    def _set_owner_telegram_id(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser

        with SessionLocal() as db:
            for item in db.scalars(select(StaffUser)).all():
                if item.login == "owner":
                    item.telegram_chat_id = self.OWNER_TG_ID
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
                    name="Замена стекла (тест)",
                    category="Детейлинг",
                    price=1000,
                    duration=60,
                    resource_group="detailing",
                )
            )
            db.commit()
        return sid

    def _create_completed(
        self, *, price: int, settled: bool = True, payment_type: str = "cash"
    ) -> str:
        self._slot += 1
        response = self.client.post(
            "/api/bookings",
            headers=self.owner,
            json={
                "clientId": "",
                "clientName": "Клиент Стекло",
                "clientPhone": f"+7 (999) 556-{self._slot:02d}-{self._slot:02d}",
                "service": "Замена стекла (тест)",
                "serviceId": self.service_id,
                "date": self._today(),
                "time": f"{self._slot:02d}:00",
                "duration": 60,
                "price": price,
                "status": "completed",
                "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
                "box": "Детейлинг 1",
                "paymentType": payment_type,
                "paymentSettled": settled,
                "car": "Toyota LC200",
                "plate": "A002AA",
                "notes": "",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["id"]

    def _patch(self, booking_id: str, body: dict) -> dict:
        response = self.client.patch(f"/api/bookings/{booking_id}", headers=self.owner, json=body)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _piggy(self) -> dict:
        response = self.client.get("/api/owner/piggy-bank", headers=self.owner)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _items(self, booking_id: str | None = None, reason: str | None = None) -> list[dict]:
        return [
            item for item in self._piggy()["notInPiggy"]
            if (booking_id is None or item["bookingId"] == booking_id)
            and (reason is None or item["reason"] == reason)
        ]

    def _owner_pending(self) -> dict[str, dict[str, float]]:
        """owner_id → {"live": pending живых записей, "dead": pending остальных}."""
        from app.database import SessionLocal
        from app.models import Booking, OwnerProfitShare

        with SessionLocal() as db:
            live_ids = set(
                db.scalars(
                    select(Booking.id).where(
                        Booking.status == "completed", Booking.deleted_at.is_(None)
                    )
                ).all()
            )
            result: dict[str, dict[str, float]] = {}
            for share in db.scalars(
                select(OwnerProfitShare).where(OwnerProfitShare.status == "pending")
            ).all():
                row = result.setdefault(share.owner_id, {"live": 0.0, "dead": 0.0})
                key = "live" if share.booking_id is None or share.booking_id in live_ids else "dead"
                row[key] += float(share.amount or 0)
            return result

    def _pay_owner(self, owner_id: str, amount: float):
        return self.client.post(
            "/api/owner/owners/pay-salary",
            headers=self.owner,
            json={"ownerId": owner_id, "amount": amount, "note": "тест"},
        )

    # ── tests ────────────────────────────────────────────────────────────

    def test_unpaid_completed_booking_listed_until_paid(self) -> None:
        booking_id = self._create_completed(price=2000, settled=False)
        # База 2000, мастер 30% = 600, копилка 24% = 480.
        items = self._items(booking_id)
        self.assertEqual(len(items), 1, items)
        self.assertEqual(items[0]["reason"], "unpaid")
        self.assertEqual(items[0]["resourceGroup"], "detailing")
        self.assertAlmostEqual(items[0]["amount"], 480, places=2)
        self.assertAlmostEqual(items[0]["price"], 2000, places=2)
        net_before = float(self._piggy()["detailing"]["netPiggy"])

        self._patch(booking_id, {"paymentSettled": True})
        self.assertEqual(self._items(booking_id), [], "оплаченная запись из блока ушла")
        # Инвариант: баланс вырос ровно на показанную сумму.
        self.assertAlmostEqual(
            float(self._piggy()["detailing"]["netPiggy"]), net_before + 480, places=2
        )

    def test_unpaid_amount_follows_price_edit(self) -> None:
        booking_id = self._create_completed(price=2000, settled=False)
        self._patch(booking_id, {"price": 3000})
        items = self._items(booking_id, "unpaid")
        self.assertEqual(len(items), 1, items)
        self.assertAlmostEqual(items[0]["amount"], 720, places=2)

    def test_unpaid_before_first_adjust_not_listed(self) -> None:
        from app.database import SessionLocal
        from app.models import Booking

        old_id = self._create_completed(price=2000, settled=False)
        new_id = self._create_completed(price=2000, settled=False)
        with SessionLocal() as db:
            db.get(Booking, old_id).date = "01.01.2020"
            db.commit()
        # Первая сверка с кассой — сегодня: старая запись к нынешней кассе не относится.
        response = self.client.post(
            "/api/owner/piggy-bank/adjust",
            headers=self.owner,
            json={"resourceGroup": "detailing", "amount": 500, "date": self._today()},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self._items(old_id), [])
        self.assertEqual(len(self._items(new_id, "unpaid")), 1)

    def test_credit_unpaid_booking_not_listed(self) -> None:
        booking_id = self._create_completed(price=2000, settled=False, payment_type="credit")
        self.assertEqual(self._items(booking_id), [])

    def test_cancelled_after_payment_listed_until_deleted(self) -> None:
        booking_id = self._create_completed(price=2000)
        self.assertEqual(self._items(booking_id), [])
        net_before = float(self._piggy()["detailing"]["netPiggy"])

        self._patch(booking_id, {"status": "cancelled"})
        items = self._items(booking_id)
        self.assertEqual(len(items), 1, items)
        self.assertEqual(items[0]["reason"], "cancelled")
        self.assertEqual(items[0]["status"], "cancelled")
        self.assertAlmostEqual(items[0]["amount"], 480, places=2)
        # Баланс отменённую запись не считает — блок объясняет разницу.
        self.assertAlmostEqual(
            float(self._piggy()["detailing"]["netPiggy"]), net_before - 480, places=2
        )

        response = self.client.delete(f"/api/bookings/{booking_id}", headers=self.owner)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self._items(booking_id), [], "удалённая запись из блока ушла")

    def test_cancelled_booking_material_repayment_not_in_balance(self) -> None:
        """Авто-возврат за материалы — деньги клиента: отменили — их нет.

        Само снятие на материалы (реальная трата) остаётся в балансе всегда.
        """
        from app.database import SessionLocal
        from app.models import PiggyBankTransaction

        booking_id = self._create_completed(price=2000, settled=False)
        net0 = float(self._piggy()["detailing"]["netPiggy"])
        with SessionLocal() as db:
            db.add(
                PiggyBankTransaction(
                    id=f"pb-{uuid4()}",
                    booking_id=booking_id,
                    amount=-300,
                    transaction_type="material_withdrawal",
                    purpose="Плёнка под заказ (тест)",
                    date=self._today(),
                    resource_group="detailing",
                )
            )
            db.commit()
        self.assertAlmostEqual(float(self._piggy()["detailing"]["netPiggy"]), net0 - 300, places=2)

        # Оплата: вклад 480 + возврат 300 за материалы.
        self._patch(booking_id, {"paymentSettled": True})
        self.assertAlmostEqual(float(self._piggy()["detailing"]["netPiggy"]), net0 + 480, places=2)

        self._patch(booking_id, {"status": "cancelled", "cancelReason": "changed_mind"})
        piggy = self._piggy()
        # Ни вклада, ни возврата — только реальная трата на материалы.
        self.assertAlmostEqual(float(piggy["detailing"]["netPiggy"]), net0 - 300, places=2)
        items = self._items(booking_id, "cancelled")
        self.assertEqual(len(items), 1, items)
        self.assertAlmostEqual(items[0]["amount"], 780, places=2)
        types = {t["transactionType"] for t in piggy["transactions"] if t["bookingId"] == booking_id}
        self.assertEqual(types, {"material_withdrawal"}, "в списке — только снятие")

        # Вернули в завершённые — проводки снова живые, без дублей.
        self._patch(booking_id, {"status": "completed"})
        self.assertAlmostEqual(float(self._piggy()["detailing"]["netPiggy"]), net0 + 480, places=2)
        self.assertEqual(self._items(booking_id), [])

    def test_booking_closed_after_adjust_is_flagged(self) -> None:
        before_id = self._create_completed(price=2000)
        response = self.client.post(
            "/api/owner/piggy-bank/adjust",
            headers=self.owner,
            json={"resourceGroup": "detailing", "amount": 1000, "date": self._today()},
        )
        self.assertEqual(response.status_code, 200, response.text)
        after_id = self._create_completed(price=3000)

        self.assertEqual(self._items(before_id), [], "проведена до корректировки — не флаг")
        items = self._items(after_id)
        self.assertEqual(len(items), 1, items)
        self.assertEqual(items[0]["reason"], "after_adjust")
        self.assertEqual(items[0]["adjustDate"], self._today())
        self.assertAlmostEqual(items[0]["amount"], 720, places=2)
        self.assertTrue(items[0]["txId"])

    def test_cancelled_booking_owner_shares_not_paid_out(self) -> None:
        from app.database import SessionLocal
        from app.models import OwnerProfitShare

        booking_id = self._create_completed(price=2000)
        with SessionLocal() as db:
            shares = db.scalars(
                select(OwnerProfitShare).where(OwnerProfitShare.booking_id == booking_id)
            ).all()
            by_owner = {s.owner_id: float(s.amount) for s in shares}
        self.assertTrue(by_owner, "у записи есть доли владельцев")
        total_before = float(self._piggy()["ownerProfitTotal"])

        self._patch(booking_id, {"status": "cancelled"})
        self.assertAlmostEqual(
            float(self._piggy()["ownerProfitTotal"]),
            total_before - sum(by_owner.values()),
            places=2,
        )

        owner_id = next(iter(by_owner))
        pending = self._owner_pending()[owner_id]
        self.assertAlmostEqual(pending["dead"], by_owner[owner_id], places=2)
        # Больше живых pending выплатить нельзя: доли отменённой записи не в счёт.
        too_much = self._pay_owner(owner_id, pending["live"] + 1)
        self.assertEqual(too_much.status_code, 400, too_much.text)
        if pending["live"] >= 1:
            paid = self._pay_owner(owner_id, pending["live"])
            self.assertEqual(paid.status_code, 200, paid.text)
            self.assertAlmostEqual(paid.json()["newBalance"], 0, places=2)
        with SessionLocal() as db:
            statuses = {
                s.status
                for s in db.scalars(
                    select(OwnerProfitShare).where(
                        OwnerProfitShare.booking_id == booking_id,
                        OwnerProfitShare.owner_id == owner_id,
                    )
                ).all()
            }
        self.assertEqual(statuses, {"pending"}, "доли отменённой записи не выплачены")

        # Запись снова завершили — её доли снова доступны к выплате.
        self._patch(booking_id, {"status": "completed"})
        again = self._pay_owner(owner_id, by_owner[owner_id])
        self.assertEqual(again.status_code, 200, again.text)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

"""Регрессия по аудиту 2026-11-13 (audit/reports/security_money_audit_2026-11-13.md).

Покрывает:
- P0-1: `qty: 1e400`/NaN в материалах больше не коммитятся и не валят сессию;
- P0-2: клиент не задаёт цену, «оплачено», способ оплаты и материалы записи;
- P1-5: попытки ввода кода привязки живут в БД и гасят коды;
- P1-7: оплата до завершения пересчитывается при завершении (смена цены);
- P1-9: месяцы депозитов сравниваются как даты, а не как строки;
- P1-10: нет отрицательных денег и фикс мастера не превышает чек;
- P2-12: TTL предпросмотра роли не падает с TypeError.
"""

import unittest
from datetime import UTC, datetime

from tests import test_booking_logic as _booking


class _Helpers(unittest.TestCase):
    """Хелперы базового класса без его тестов (не гоняем матрицу второй раз)."""


for _name, _value in vars(_booking.BookingLogicTests).items():
    if not _name.startswith("test_") and not _name.startswith("__"):
        setattr(_Helpers, _name, _value)


class AuditMoneyTests(_Helpers):
    def setUp(self) -> None:
        super().setUp()
        self.admin_token = self.login_staff("admin", "admin")
        self.owner_token = self.login_staff("owner", "owner")

    # ---------- helpers ----------
    def booking_payload(self, **overrides) -> dict:
        payload: dict = {
            "clientId": "",
            "clientName": "Аудит Клиент",
            "clientPhone": "+7 (999) 400-00-01",
            "service": "Мойка базовая",
            "serviceId": "s1",
            "date": self.next_active_date(),
            "time": "11:00",
            "duration": 60,
            "price": 1000,
            "status": "scheduled",
            "workers": [{"workerId": "w1", "workerName": "Иван", "percent": 30}],
            "box": "Бокс 1",
            "paymentType": "cash",
            "car": "Lada Vesta",
            "plate": "A123BC",
        }
        payload.update(overrides)
        return payload

    def create_booking(self, token: str | None = None, **overrides):
        return self.client.post(
            "/api/bookings",
            headers=self.auth_headers(token or self.admin_token),
            json=self.booking_payload(**overrides),
        )

    def patch_booking(self, booking_id: str, **fields):
        return self.client.patch(
            f"/api/bookings/{booking_id}",
            headers=self.auth_headers(self.admin_token),
            json=fields,
        )

    def split_of(self, booking_id: str) -> dict:
        response = self.client.get(
            f"/api/owner/bookings/{booking_id}/money-split",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def catalog_price(self, service_id: str = "s1") -> int:
        response = self.client.get(
            "/api/auth/session", headers=self.auth_headers(self.owner_token)
        )
        self.assertEqual(response.status_code, 200, response.text)
        for service in response.json().get("services") or []:
            if service.get("id") == service_id:
                return int(service.get("price") or 0)
        self.fail(f"service {service_id} not found in bootstrap payload")

    def stock_item(self, qty: float = 50, unit_price: float = 500) -> str:
        response = self.client.post(
            "/api/stock-items",
            headers=self.auth_headers(self.admin_token),
            json={
                "name": "Шампунь аудит",
                "qty": qty,
                "unit": "л",
                "unitPrice": unit_price,
                "category": "Химия",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["id"]

    # ---------- P0-1 ----------
    def raw_booking(self, stock_id: str, qty_literal: str, token: str | None = None):
        """Сырой JSON: клиент шлёт числовой литерал, который json.loads читает как inf/NaN."""
        import json as _json

        payload = self.booking_payload()
        payload["materials"] = [
            {
                "id": "bm-raw",
                "stockItemId": stock_id,
                "name": "x",
                "qty": 1,
                "unit": "л",
                "unitPrice": 1,
            }
        ]
        body = _json.dumps(payload, ensure_ascii=False).replace('"qty": 1,', f'"qty": {qty_literal},')
        return self.client.post(
            "/api/bookings",
            headers={**self.auth_headers(token or self.admin_token), "Content-Type": "application/json"},
            content=body.encode("utf-8"),
        )

    def test_infinite_material_qty_rejected_without_poisoning_session(self) -> None:
        stock_id = self.stock_item()
        response = self.raw_booking(stock_id, "1e400")
        self.assertEqual(response.status_code, 422, response.text)
        # Ничего не закоммичено: сессия владельца и админа по-прежнему отвечает.
        for token in (self.admin_token, self.owner_token):
            session = self.client.get("/api/auth/session", headers=self.auth_headers(token))
            self.assertEqual(session.status_code, 200, session.text)

    def test_nan_material_qty_rejected(self) -> None:
        stock_id = self.stock_item()
        response = self.raw_booking(stock_id, "NaN")
        self.assertEqual(response.status_code, 422, response.text)

    # ---------- P0-2 ----------
    def test_client_cannot_set_price_paid_or_materials(self) -> None:
        stock_id = self.stock_item(qty=50, unit_price=500)
        client_token, _client_id = self.login_client(
            name="Клиент Аудит", phone="+7 (999) 400-00-02"
        )
        response = self.create_booking(
            token=client_token,
            price=1,
            paymentSettled=True,
            paymentType="cash",
            materials=[
                {
                    "id": "bm-1",
                    "stockItemId": stock_id,
                    "name": "Шампунь аудит",
                    "qty": 1_000_000,
                    "unit": "л",
                    "unitPrice": 999_999,
                }
            ],
        )
        self.assertEqual(response.status_code, 200, response.text)
        booking = response.json()
        self.assertEqual(booking["price"], self.catalog_price("s1"))
        self.assertFalse(booking["paymentSettled"])
        self.assertEqual(booking["materials"], [])

        # Завершение не списывает склад и не создаёт расход на 999 999 000 000 ₽.
        done = self.patch_booking(booking["id"], status="completed", paymentSettled=True)
        self.assertEqual(done.status_code, 200, done.text)
        from app.database import SessionLocal
        from app.models import StockItem

        with SessionLocal() as db:
            item = db.get(StockItem, stock_id)
            self.assertEqual(item.qty, 50)

    def test_client_cannot_use_unknown_service_price(self) -> None:
        client_token, _client_id = self.login_client(
            name="Клиент Аудит 3", phone="+7 (999) 400-00-03"
        )
        response = self.create_booking(
            token=client_token,
            service="Выдуманная услуга",
            serviceId="no-such-service",
            price=1,
            paymentSettled=True,
        )
        self.assertEqual(response.status_code, 200, response.text)
        booking = response.json()
        self.assertEqual(booking["price"], 0)
        self.assertFalse(booking["paymentSettled"])

    # ---------- P1-10 ----------
    def test_negative_money_rejected(self) -> None:
        negative_price = self.create_booking(price=-700)
        self.assertEqual(negative_price.status_code, 422, negative_price.text)
        negative_fixed = self.create_booking(
            workers=[
                {
                    "workerId": "w1",
                    "workerName": "Иван",
                    "percent": 0,
                    "payType": "fixed",
                    "fixedAmount": -5000,
                }
            ]
        )
        self.assertEqual(negative_fixed.status_code, 422, negative_fixed.text)

    def test_worker_fixed_cannot_exceed_check(self) -> None:
        response = self.create_booking(
            price=1000,
            workers=[
                {
                    "workerId": "w1",
                    "workerName": "Иван",
                    "percent": 0,
                    "payType": "fixed",
                    "fixedAmount": 50000,
                }
            ],
        )
        self.assertEqual(response.status_code, 200, response.text)
        booking = response.json()
        done = self.patch_booking(booking["id"], status="completed", paymentSettled=True)
        self.assertEqual(done.status_code, 200, done.text)
        split = self.split_of(booking["id"])
        self.assertEqual(split["masterTotal"], 1000)
        self.assertEqual(split["piggyDeposit"], 0)
        self.assertEqual(split["ownersTotal"], 0)
        total = split["masterTotal"] + split["piggyDeposit"] + split["ownersTotal"]
        self.assertEqual(total, 1000)

    # ---------- P1-7 ----------
    def test_early_payment_is_recalculated_on_completion(self) -> None:
        created = self.create_booking(price=1000, paymentType="cash")
        self.assertEqual(created.status_code, 200, created.text)
        booking_id = created.json()["id"]

        paid = self.patch_booking(booking_id, paymentSettled=True)
        self.assertEqual(paid.status_code, 200, paid.text)
        # Оплата до завершения уже создала вклад по цене 1000.
        self.assertEqual(
            sum(
                d["amount"] for d in self._piggy_deposits(booking_id)
            ),
            240,
        )

        repriced = self.patch_booking(booking_id, price=2000)
        self.assertEqual(repriced.status_code, 200, repriced.text)
        done = self.patch_booking(booking_id, status="completed")
        self.assertEqual(done.status_code, 200, done.text)

        split = self.split_of(booking_id)
        self.assertEqual(split["masterTotal"], 600)
        self.assertEqual(split["piggyDeposit"], 480)
        self.assertEqual(split["ownersTotal"], 920)
        total = split["masterTotal"] + split["piggyDeposit"] + split["ownersTotal"]
        self.assertEqual(total, 2000)
        self.assertEqual(sum(d["amount"] for d in self._piggy_deposits(booking_id)), 480)

    def _piggy_deposits(self, booking_id: str) -> list[dict]:
        from sqlalchemy import select

        from app.database import SessionLocal
        from app.models import PiggyBankTransaction

        with SessionLocal() as db:
            rows = db.scalars(
                select(PiggyBankTransaction).where(
                    PiggyBankTransaction.booking_id == booking_id,
                    PiggyBankTransaction.transaction_type == "deposit_24percent",
                )
            ).all()
            return [{"amount": float(row.amount)} for row in rows]

    # ---------- P1-9 ----------
    def test_deposit_months_are_ordered_by_date(self) -> None:
        from uuid import uuid4

        from app.database import SessionLocal
        from app.models import Client

        client_id = f"c-{uuid4().hex[:10]}"
        with SessionLocal() as db:
            db.add(
                Client(
                    id=client_id,
                    name="Депозит Аудит",
                    phone="+7 (999) 400-00-04",
                    car="BMW",
                    plate="M001AA",
                )
            )
            db.commit()
        activate = self.client.patch(
            f"/api/owner/deposits/{client_id}",
            headers=self.auth_headers(self.owner_token),
            json={"clientId": client_id, "depositActive": True, "depositMonthly": 4000},
        )
        self.assertEqual(activate.status_code, 200, activate.text)
        for date, amount in (
            ("15.11.2026", 1000),
            ("15.12.2026", 2000),
            ("15.01.2027", 4000),
        ):
            topup = self.client.post(
                f"/api/owner/deposits/{client_id}/topup",
                headers=self.auth_headers(self.owner_token),
                json={"clientId": client_id, "amount": amount, "note": "Пополнение", "date": date},
            )
            self.assertEqual(topup.status_code, 200, topup.text)

        overview = self.client.get(
            f"/api/owner/deposits/{client_id}",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(overview.status_code, 200, overview.text)
        months = overview.json()["monthRows"]
        self.assertEqual([row["month"] for row in months], ["01.2027", "12.2026", "11.2026"])
        starts = {row["month"]: row["balanceStart"] for row in months}
        self.assertEqual(starts["01.2027"], 3000)
        self.assertEqual(starts["12.2026"], 1000)
        self.assertEqual(starts["11.2026"], 0)

    # ---------- P1-5 ----------
    def test_link_code_attempts_are_persisted_and_burn_the_code(self) -> None:
        from app.database import SessionLocal
        from app.telegram_linking import confirm_link_code, create_link_code

        chat_id = 555777
        with SessionLocal() as db:
            code = create_link_code(db, "w1").code
            db.commit()

        with SessionLocal() as db:
            # 5 неверных попыток: лимит на чат.
            for _ in range(5):
                self.assertIsNone(confirm_link_code(db, "000000", chat_id))
            db.commit()
        with SessionLocal() as db:
            with self.assertRaises(ValueError):
                confirm_link_code(db, "000000", chat_id)
            db.commit()
        # Неверная серия погасила выданный код — верный код больше не срабатывает.
        with SessionLocal() as db:
            self.assertIsNone(confirm_link_code(db, code, 999111))
            db.commit()

    # ---------- P2-12 ----------
    def test_role_preview_ttl_handles_naive_timestamp(self) -> None:
        from unittest.mock import patch

        from app import main as app_main
        from app.database import SessionLocal
        from app.models import AppSetting

        with SessionLocal() as db:
            db.merge(
                AppSetting(
                    key="role_preview_424242",
                    value={
                        "role": "owner",
                        "actorId": "owner-primary",
                        "setAt": datetime.now(UTC).isoformat(),
                    },
                )
            )
            db.commit()
            with patch.object(app_main, "CREATOR_TELEGRAM_IDS", frozenset({"424242"})):
                self.assertEqual(
                    app_main._read_role_preview(db, "424242"),
                    {"role": "owner", "actorId": "owner-primary"},
                )
            # Просроченное состояние не отдаётся.
            db.merge(
                AppSetting(
                    key="role_preview_424242",
                    value={
                        "role": "owner",
                        "actorId": "owner-primary",
                        "setAt": "2020-01-01T00:00:00",
                    },
                )
            )
            db.commit()
            with patch.object(app_main, "CREATOR_TELEGRAM_IDS", frozenset({"424242"})):
                self.assertEqual(app_main._read_role_preview(db, "424242"), {})


if __name__ == "__main__":
    unittest.main()

"""
Карточка ЗП мастера по сегментам (Мойка / Детейлинг).

- Выплата относится к сегменту своего расхода (Expense.resource_group).
- Оклад, смены, премии, авансы, удержания, корректировки — мойка.
- Инвариант: all = wash + detailing для заработано / выплачено / к выплате.
"""
from __future__ import annotations

from tests.test_money_fixes import MoneyFixTestBase


class SalarySegmentSplitTest(MoneyFixTestBase):
    # _today() пропускает воскресенье, поэтому период — custom на эту дату,
    # а не "day" (иначе по воскресеньям записи выпадают из периода).
    def _detail(self, segment: str) -> dict:
        d = self._today()
        response = self.client.get(
            f"/api/owner/workers/w1/salary-detail?period=custom&segment={segment}"
            f"&date_from={d}&date_to={d}",
            headers=self._auth_headers(self.owner_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _pay(self, segment: str, amount: int) -> dict:
        d = self._today()
        response = self.client.post(
            "/api/owner/workers/w1/pay-salary",
            headers=self._auth_headers(self.owner_token),
            json={
                "period": "custom",
                "dateFrom": d,
                "dateTo": d,
                "segment": segment,
                "amount": amount,
                "note": "",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_payouts_and_shared_items_split_by_segment(self) -> None:
        from app.database import SessionLocal
        from app.models import Booking

        self._create_completed_booking(
            price=2000,
            workers=[{"workerId": "w1", "workerName": "Иван", "percent": 40}],
        )
        detailing_id = self._create_completed_booking(
            price=5000,
            workers=[{"workerId": "w1", "workerName": "Иван", "percent": 40}],
        )
        with SessionLocal() as db:
            booking = db.get(Booking, detailing_id)
            assert booking is not None
            booking.service_id = "s2"  # детейлинг-услуга из сида
            db.commit()

        bonus = self.client.post(
            "/api/payroll/entries",
            headers=self._auth_headers(self.owner_token),
            json={
                "workerId": "w1",
                "kind": "bonus",
                "amount": 300,
                "note": "",
                "period": "custom",
                "dateFrom": self._today(),
                "dateTo": self._today(),
            },
        )
        self.assertEqual(bonus.status_code, 200, bonus.text)

        detailing_before = self._detail("detailing")
        self.assertGreater(detailing_before["totalEarned"], 0)
        # Премия/оклад/смены не попадают в детейлинг.
        self.assertEqual(detailing_before["salaryBase"], 0)
        self.assertEqual(detailing_before["salaryPerShift"], 0)
        self.assertEqual(
            detailing_before["balanceToPay"], detailing_before["totalEarned"]
        )
        self.assertFalse(
            [e for e in detailing_before["entries"] if e["kind"] == "bonus"]
        )

        wash_pay = self._pay("wash", 500)
        detailing_pay = self._pay("detailing", 200)

        wash = self._detail("wash")
        detailing = self._detail("detailing")
        total = self._detail("all")

        self.assertEqual(wash["totalPaid"], 500)
        self.assertEqual(detailing["totalPaid"], 200)
        self.assertEqual(total["totalPaid"], 700)
        self.assertTrue([e for e in wash["entries"] if e["kind"] == "bonus"])

        # newBalance выплаты = баланс экрана своего сегмента.
        self.assertEqual(detailing_pay["newBalance"], detailing["balanceToPay"])
        self.assertEqual(
            detailing["balanceToPay"], detailing["totalEarned"] - 200
        )

        for key in ("totalEarned", "totalPaid", "balanceToPay"):
            self.assertEqual(
                total[key], wash[key] + detailing[key], f"all != wash + detailing: {key}"
            )
        self.assertIsNotNone(wash_pay["payoutId"])


if __name__ == "__main__":
    import unittest

    unittest.main()

from __future__ import annotations

"""Строгий расчёт по формулам услуг.

- формула с нераспределённым хвостом не сохраняется (400);
- владельцы без % забирают весь остаток в любой позиции (скрытых 50% нет);
- для валидных формул master + piggy + owners == цена;
- пересчёт истории: dry-run ничего не меняет, реальный приводит вклады и
  pending-доли к текущим формулам, выплаченные доли не трогает;
- итоги истории кладут вклад в банк, где он реально лежит.
"""

import unittest

from sqlalchemy import select

from tests.test_money_matrix import S1, S2, MoneyMatrixTests


class _Helpers(unittest.TestCase):
    """Хелперы матрицы денег без её тестов (не гоняем их второй раз)."""


for _name, _value in vars(MoneyMatrixTests).items():
    if not _name.startswith("test_") and not _name.startswith("__"):
        setattr(_Helpers, _name, _value)


class FormulaTailValidatorTests(unittest.TestCase):
    def check(self, **kw) -> str | None:
        from app.money_formula import formula_tail_error

        args = {
            "piggy_pay_type": "", "piggy_pay_value": 0,
            "owner_pay_type": "", "owner_pay_value": 0,
            "owner_split_enabled": True,
        }
        args.update(kw)
        return formula_tail_error(**args)

    def test_valid(self) -> None:
        self.assertIsNone(self.check())
        self.assertIsNone(self.check(piggy_pay_type="percent", piggy_pay_value=10))
        self.assertIsNone(self.check(owner_split_enabled=False, piggy_pay_type="rest"))
        self.assertIsNone(self.check(owner_pay_type="percent", owner_pay_value=50, piggy_pay_type="rest"))
        self.assertIsNone(self.check(owner_pay_type="percent", owner_pay_value=100))
        self.assertIsNone(self.check(owner_split_enabled=False, piggy_pay_type="percent", piggy_pay_value=100))

    def test_tail(self) -> None:
        self.assertIn("выключены", self.check(owner_split_enabled=False) or "")
        self.assertIn("выключены", self.check(owner_split_enabled=False, piggy_pay_type="fixed", piggy_pay_value=500) or "")
        reason = self.check(owner_pay_type="percent", owner_pay_value=50, piggy_pay_type="percent", piggy_pay_value=24)
        self.assertIsNotNone(reason)
        self.assertIn("50%", reason or "")

    def test_formula_signature_normalizes(self) -> None:
        from app.money_formula import formula_signature

        def sign(**kw):
            args = {
                "piggy_pay_type": None, "piggy_pay_value": None,
                "owner_pay_type": None, "owner_pay_value": None,
                "owner_split_enabled": None,
            }
            args.update(kw)
            return formula_signature(**args)

        self.assertEqual(sign(), sign(piggy_pay_type="", piggy_pay_value=0,
                                      owner_pay_type="", owner_pay_value=0,
                                      owner_split_enabled=True))
        self.assertEqual(sign(owner_split_enabled=None), sign(owner_split_enabled=True))
        self.assertNotEqual(sign(owner_split_enabled=False), sign(owner_split_enabled=True))


class FormulaStrictApiTests(_Helpers):
    def services_payload(self) -> list[dict]:
        from app.database import SessionLocal
        from app.main import _service_payload
        from app.models import Service

        with SessionLocal() as db:
            return [_service_payload(s).model_dump() for s in db.scalars(select(Service)).all()]

    def put_services(self, payload: list[dict]):
        return self.client.put(
            "/api/settings/services", headers=self.auth_headers(self.owner_token), json=payload)

    def test_save_blocks_tail_formula(self) -> None:
        self.reset_services()
        payload = self.services_payload()
        for item in payload:
            if item["id"] == "s2":
                item["ownerSplitEnabled"] = False
                item["piggyPayType"] = ""
        response = self.put_services(payload)
        self.assertEqual(response.status_code, 400, response.text)
        self.assertIn("Полировка стекла", response.json()["detail"])

        for item in payload:
            if item["id"] == "s2":
                item["piggyPayType"] = "rest"
        response = self.put_services(payload)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(all("formulaError" in item for item in response.json()))
        self.assertTrue(all(item["formulaError"] is None for item in response.json()))

    def test_legacy_tail_formula_does_not_block_other_services(self) -> None:
        from app.database import SessionLocal
        from app.models import Service

        self.reset_services()
        self.cfg("s1", owner_split_enabled=False, piggy_pay_type="")
        payload = self.services_payload()
        for item in payload:
            if item["id"] == "s2":
                item["name"] = "Полировка стекла обновлённая"
                item["price"] = 4321
        response = self.put_services(payload)
        self.assertEqual(response.status_code, 200, response.text)
        by_id = {item["id"]: item for item in response.json()}
        self.assertIsNotNone(by_id["s1"]["formulaError"])
        self.assertIsNone(by_id["s2"]["formulaError"])
        with SessionLocal() as db:
            s2 = db.get(Service, "s2")
            self.assertEqual(s2.name, "Полировка стекла обновлённая")
            self.assertEqual(s2.price, 4321)

    def test_legacy_tail_formula_cannot_be_changed_to_another_tail(self) -> None:
        from app.database import SessionLocal
        from app.models import Service

        self.reset_services()
        self.cfg("s1", owner_split_enabled=False, piggy_pay_type="")
        payload = self.services_payload()
        for item in payload:
            if item["id"] == "s1":
                item["piggyPayType"] = "fixed"
                item["piggyPayValue"] = 500
            if item["id"] == "s2":
                item["name"] = "Полировка стекла не должна сохраниться"
                item["price"] = 9876
        response = self.put_services(payload)
        self.assertEqual(response.status_code, 400, response.text)
        self.assertIn("Мойка базовая", response.json()["detail"])
        with SessionLocal() as db:
            s1 = db.get(Service, "s1")
            s2 = db.get(Service, "s2")
            self.assertEqual(s1.piggy_pay_type, "")
            self.assertEqual(s1.piggy_pay_value, 0)
            self.assertFalse(s1.owner_split_enabled)
            self.assertEqual(s2.name, "Полировка стекла")
            self.assertNotEqual(s2.price, 9876)

    def test_new_service_with_tail_formula_rejected(self) -> None:
        from app.database import SessionLocal
        from app.models import Service

        self.reset_services()
        payload = self.services_payload()
        new_service = dict(next(item for item in payload if item["id"] == "s2"))
        new_service["id"] = "s-new-tail"
        new_service["name"] = "Новая услуга с хвостом"
        new_service["piggyPayType"] = ""
        new_service["piggyPayValue"] = 0
        new_service["ownerPayType"] = ""
        new_service["ownerPayValue"] = 0
        new_service["ownerSplitEnabled"] = False
        payload.append(new_service)
        response = self.put_services(payload)
        self.assertEqual(response.status_code, 400, response.text)
        self.assertIn("Новая услуга с хвостом", response.json()["detail"])
        with SessionLocal() as db:
            self.assertIsNone(db.get(Service, "s-new-tail"))

    def test_legacy_tail_formula_can_be_fixed(self) -> None:
        from app.database import SessionLocal
        from app.models import Service

        self.reset_services()
        self.cfg("s1", owner_split_enabled=False, piggy_pay_type="")
        payload = self.services_payload()
        for item in payload:
            if item["id"] == "s1":
                item["piggyPayType"] = "rest"
                item["piggyPayValue"] = 0
        response = self.put_services(payload)
        self.assertEqual(response.status_code, 200, response.text)
        by_id = {item["id"]: item for item in response.json()}
        self.assertIsNone(by_id["s1"]["formulaError"])
        with SessionLocal() as db:
            self.assertEqual(db.get(Service, "s1").piggy_pay_type, "rest")

    def test_owners_before_piggy_take_whole_remainder(self) -> None:
        self.reset_services()
        self.cfg("s1", piggy_pay_type="percent", piggy_pay_value=10,
                 split_order=["materials", "master", "owners", "piggy"])
        split = self.split_of(self.complete(self.make_booking(*S1, 10000)["id"])["id"])
        self.assertEqual(split["masterTotal"], 3000)
        self.assertEqual(split["ownersTotal"], 7000)
        self.assertEqual(split["piggyDeposit"], 0)

    def test_valid_formulas_distribute_whole_price(self) -> None:
        orders = [[], ["materials", "piggy", "master", "owners"], ["materials", "master", "owners", "piggy"]]
        piggies = [("", 0), ("percent", 10), ("fixed", 1500), ("rest", 0), ("none", 0)]
        owners = [("", 0, True), ("percent", 50, True), ("", 0, False)]
        for order in orders:
            for piggy_type, piggy_value in piggies:
                for owner_type, owner_value, enabled in owners:
                    from app.money_formula import formula_tail_error

                    if formula_tail_error(
                        piggy_pay_type=piggy_type, piggy_pay_value=piggy_value,
                        owner_pay_type=owner_type, owner_pay_value=owner_value,
                        owner_split_enabled=enabled,
                    ):
                        continue
                    with self.subTest(order=order, piggy=piggy_type, owner=owner_type, enabled=enabled):
                        self.reset_services()
                        self.cfg("s2", piggy_pay_type=piggy_type, piggy_pay_value=piggy_value,
                                 owner_pay_type=owner_type, owner_pay_value=owner_value,
                                 owner_split_enabled=enabled, split_order=order)
                        booking = self.make_booking(*S2, 10000)
                        self.add_dop(booking["id"], serviceId="s2", name="Доп", price=2000,
                                     priceMode="add",
                                     workers=[{"workerId": "w1", "workerName": "Иван", "percent": 50}])
                        split = self.split_of(self.complete(booking["id"])["id"])
                        total = split["masterTotal"] + split["piggyDeposit"] + split["ownersTotal"]
                        self.assertEqual(total, 12000, split)

    def piggy_sum(self, booking_id: str) -> int:
        return int(sum(t["amount"] for t in self.deposits_of(booking_id) if t["type"] == "deposit_24percent"))

    def recalc(self, dry_run: bool):
        return self.client.post(
            f"/api/admin/maintenance/recalc-money?dryRun={'true' if dry_run else 'false'}",
            headers=self.auth_headers(self.owner_token))

    def test_recalc_history(self) -> None:
        from app.database import SessionLocal
        from app.models import OwnerProfitShare

        self.reset_services()
        booking = self.complete(self.make_booking(*S1, 10000)["id"])
        self.assertEqual(self.piggy_sum(booking["id"]), 2400)
        # Формулу поменяли после завершения: копилка 10%.
        self.cfg("s1", piggy_pay_type="percent", piggy_pay_value=10)

        dry = self.recalc(True)
        self.assertEqual(dry.status_code, 200, dry.text)
        wash = next(p for p in dry.json()["piggy"] if p["resourceGroup"] == "wash")
        self.assertEqual(wash["delta"], -1400)
        self.assertEqual(self.piggy_sum(booking["id"]), 2400)  # dry-run ничего не записал

        real = self.recalc(False)
        self.assertEqual(real.status_code, 200, real.text)
        self.assertEqual(self.piggy_sum(booking["id"]), 1000)
        with SessionLocal() as db:
            shares = db.scalars(select(OwnerProfitShare).where(
                OwnerProfitShare.booking_id == booking["id"])).all()
            self.assertEqual(sum(int(s.amount) for s in shares), 6000)
        split = self.split_of(booking["id"])
        self.assertEqual(split["piggyDeposit"], 1000)
        self.assertEqual(split["ownersTotal"], 6000)

    def test_recalc_keeps_paid_shares(self) -> None:
        from app.database import SessionLocal
        from app.models import OwnerProfitShare

        self.reset_services()
        booking = self.complete(self.make_booking(*S1, 10000)["id"])
        with SessionLocal() as db:
            for share in db.scalars(select(OwnerProfitShare).where(
                    OwnerProfitShare.booking_id == booking["id"])).all():
                share.status = "paid"
            db.commit()
        self.cfg("s1", piggy_pay_type="rest")
        real = self.recalc(False)
        self.assertEqual(real.status_code, 200, real.text)
        self.assertEqual(real.json()["paidMismatches"][0]["overpaid"], 4600)
        with SessionLocal() as db:
            shares = db.scalars(select(OwnerProfitShare).where(
                OwnerProfitShare.booking_id == booking["id"])).all()
            self.assertEqual(sum(int(s.amount) for s in shares), 4600)
            self.assertTrue(all(s.status == "paid" for s in shares))

    def test_recalc_refuses_with_tail_formula(self) -> None:
        self.reset_services()
        self.cfg("s2", owner_split_enabled=False)
        response = self.recalc(True)
        self.assertEqual(response.status_code, 409, response.text)
        self.assertIn("Полировка стекла", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()

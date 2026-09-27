from __future__ import annotations

"""H1: граница доверия настроек услуг.

PUT /api/settings/services раньше записывал мусор молча:
percent=500, отрицательный фикс, неизвестные типы выплат (вели себя как
дефолт), частичный splitOrder (терял шаги и деньги из распределения).
Теперь: строгие типы (422), клампы значений, полный порядок.
"""

import os
import sys
import unittest
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


class ServiceSettingsGuardsTests(unittest.TestCase):
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
        reset_app_modules()
        from app.main import app

        self.client_manager = TestClient(app)
        self.client = self.client_manager.__enter__()

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

    def login_staff(self, login: str, password: str) -> str:
        response = self.client.post(
            "/api/auth/staff/login", json={"login": login, "password": password}
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["token"]

    @staticmethod
    def auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": token}

    def _services(self, token: str) -> list[dict]:
        bootstrap = self.client.get(
            "/api/auth/session", headers=self.auth_headers(token)
        ).json()
        return bootstrap["services"]

    def _save(self, token: str, services: list[dict]):
        return self.client.put(
            "/api/settings/services",
            headers=self.auth_headers(token),
            json=services,
        )

    def test_invalid_pay_type_rejected_422(self) -> None:
        token = self.login_staff("owner", "owner")
        services = self._services(token)
        services[0]["piggyPayType"] = "banana"
        response = self._save(token, services)
        self.assertEqual(response.status_code, 422, response.text)

    def test_invalid_master_pay_type_rejected_422(self) -> None:
        token = self.login_staff("owner", "owner")
        services = self._services(token)
        services[0]["masterPayType"] = "rest"
        response = self._save(token, services)
        self.assertEqual(response.status_code, 422, response.text)

    def test_percent_clamped_to_100(self) -> None:
        token = self.login_staff("owner", "owner")
        services = self._services(token)
        services[0]["masterPayType"] = "percent"
        services[0]["masterPayValue"] = 150
        services[0]["piggyPayType"] = "percent"
        services[0]["piggyPayValue"] = 999
        response = self._save(token, services)
        self.assertEqual(response.status_code, 200, response.text)
        saved = {s["id"]: s for s in response.json()}
        self.assertEqual(saved[services[0]["id"]]["masterPayValue"], 100)
        self.assertEqual(saved[services[0]["id"]]["piggyPayValue"], 100)

    def test_negative_fixed_clamped_to_zero(self) -> None:
        token = self.login_staff("owner", "owner")
        services = self._services(token)
        services[0]["piggyPayType"] = "fixed"
        services[0]["piggyPayValue"] = -500
        response = self._save(token, services)
        self.assertEqual(response.status_code, 200, response.text)
        saved = {s["id"]: s for s in response.json()}
        self.assertEqual(saved[services[0]["id"]]["piggyPayValue"], 0)

    def test_negative_price_rejected_422(self) -> None:
        token = self.login_staff("owner", "owner")
        services = self._services(token)
        services[0]["price"] = -100
        response = self._save(token, services)
        self.assertEqual(response.status_code, 422, response.text)

    def test_partial_split_order_completed(self) -> None:
        token = self.login_staff("owner", "owner")
        services = self._services(token)
        services[0]["splitOrder"] = ["piggy", "master"]
        response = self._save(token, services)
        self.assertEqual(response.status_code, 200, response.text)
        saved = {s["id"]: s for s in response.json()}
        # Конвейерный замысел сохранён, недостающие шаги дописаны классическим хвостом.
        self.assertEqual(
            saved[services[0]["id"]]["splitOrder"],
            ["piggy", "master", "materials", "owners"],
        )

    def test_garbage_split_order_becomes_classic(self) -> None:
        token = self.login_staff("owner", "owner")
        services = self._services(token)
        services[0]["splitOrder"] = ["foo", "bar"]
        response = self._save(token, services)
        self.assertEqual(response.status_code, 200, response.text)
        saved = {s["id"]: s for s in response.json()}
        self.assertEqual(saved[services[0]["id"]]["splitOrder"], [])

    def test_lenient_piggy_target_still_cleared(self) -> None:
        # Совместимость: мусор в piggyTarget чистится, а не 422.
        token = self.login_staff("owner", "owner")
        services = self._services(token)
        services[0]["piggyTarget"] = "foo"
        response = self._save(token, services)
        self.assertEqual(response.status_code, 200, response.text)
        saved = {s["id"]: s for s in response.json()}
        self.assertEqual(saved[services[0]["id"]]["piggyTarget"], "")

    def _preview(self, token: str, service: dict, price: int, percent: float = 30.0) -> dict:
        response = self.client.post(
            "/api/settings/services/split-preview",
            headers=self.auth_headers(token),
            json={"service": service, "samplePrice": price, "samplePercent": percent},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_preview_matches_canonical_split(self) -> None:
        token = self.login_staff("owner", "owner")
        svc = dict(self._services(token)[0])
        svc.update({"masterPayType": "", "piggyPayType": "", "ownerPayType": "",
                    "ownerSplitEnabled": True, "splitOrder": [], "piggyTarget": "",
                    "resourceGroup": "wash", "materialConsumption": 0, "materials": []})
        preview = self._preview(token, svc, 10000, 30.0)
        self.assertEqual(preview["masterTotal"], 3000)
        self.assertEqual(preview["piggyDeposit"], 2400)
        self.assertEqual(preview["ownersTotal"], 4600)
        self.assertEqual(preview["piggyBank"], "wash")

    def test_preview_general_default_zero_and_target_routing(self) -> None:
        token = self.login_staff("owner", "owner")
        svc = dict(self._services(token)[0])
        svc.update({"masterPayType": "", "piggyPayType": "", "resourceGroup": "general",
                    "piggyTarget": "general", "materialConsumption": 0, "materials": [],
                    "splitOrder": []})
        preview = self._preview(token, svc, 10000, 30.0)
        self.assertEqual(preview["piggyDeposit"], 0)
        self.assertEqual(preview["piggyBank"], "general")
        self.assertEqual(preview["masterTotal"], 3000)

    def test_preview_clamps_fixed_master(self) -> None:
        token = self.login_staff("owner", "owner")
        svc = dict(self._services(token)[0])
        svc.update({"masterPayType": "fixed", "masterPayValue": 20000,
                    "resourceGroup": "wash", "materialConsumption": 0, "materials": [],
                    "splitOrder": []})
        preview = self._preview(token, svc, 10000, 30.0)
        self.assertEqual(preview["masterTotal"], 10000)
        self.assertEqual(preview["ownersTotal"], 0)

    def test_preview_rejects_invalid_service(self) -> None:
        token = self.login_staff("owner", "owner")
        svc = dict(self._services(token)[0])
        svc["piggyPayType"] = "banana"
        response = self.client.post(
            "/api/settings/services/split-preview",
            headers=self.auth_headers(token),
            json={"service": svc, "samplePrice": 10000, "samplePercent": 30.0},
        )
        self.assertEqual(response.status_code, 422, response.text)

    def _wash_draft(self, token: str) -> dict:
        svc = dict(self._services(token)[0])
        svc.update({"masterPayType": "", "piggyPayType": "", "ownerPayType": "",
                    "ownerSplitEnabled": True, "splitOrder": [], "piggyTarget": "",
                    "resourceGroup": "wash", "materialConsumption": 0, "materials": []})
        return svc

    def test_preview_with_add_dop(self) -> None:
        token = self.login_staff("owner", "owner")
        response = self.client.post(
            "/api/settings/services/split-preview",
            headers=self.auth_headers(token),
            json={"service": self._wash_draft(token), "samplePrice": 10000,
                  "samplePercent": 30.0,
                  "dops": [{"name": "Доп", "price": 2000, "priceMode": "add",
                            "workers": [{"percent": 50, "payType": "percent"}]}]},
        )
        self.assertEqual(response.status_code, 200, response.text)
        preview = response.json()
        self.assertEqual(preview["totalPrice"], 12000)
        self.assertEqual(preview["masterTotal"], 4000)
        self.assertEqual(preview["piggyDeposit"], 2640)
        self.assertEqual(preview["ownersTotal"], 5360)
        self.assertEqual(preview["asvcMaster"], 1000)
        self.assertEqual([d["amount"] for d in preview["asvcPiggy"]], [240])

    def test_preview_with_subtract_dop(self) -> None:
        token = self.login_staff("owner", "owner")
        response = self.client.post(
            "/api/settings/services/split-preview",
            headers=self.auth_headers(token),
            json={"service": self._wash_draft(token), "samplePrice": 10000,
                  "samplePercent": 30.0,
                  "dops": [{"name": "Вычет", "price": 1000, "priceMode": "subtract",
                            "workers": []}]},
        )
        self.assertEqual(response.status_code, 200, response.text)
        preview = response.json()
        self.assertEqual(preview["totalPrice"], 10000)
        self.assertEqual(preview["splitBase"], 9000)
        self.assertEqual(preview["masterTotal"], 2700)
        self.assertEqual(preview["piggyDeposit"], 3160)
        self.assertEqual(preview["ownersTotal"], 4140)

    def test_preview_with_outsource_dop(self) -> None:
        token = self.login_staff("owner", "owner")
        response = self.client.post(
            "/api/settings/services/split-preview",
            headers=self.auth_headers(token),
            json={"service": self._wash_draft(token), "samplePrice": 10000,
                  "samplePercent": 30.0,
                  "dops": [{"name": "Аутсорс", "price": 2000, "priceMode": "add",
                            "isOutsource": True, "outsourceAmount": 1500,
                            "workers": []}]},
        )
        self.assertEqual(response.status_code, 200, response.text)
        preview = response.json()
        self.assertEqual(preview["asvcMaster"], 0)
        self.assertEqual([d["amount"] for d in preview["asvcPiggy"]], [120])
        self.assertEqual(preview["asvcOwnerExtra"], 380)

    def test_preview_with_complaint_penalty(self) -> None:
        token = self.login_staff("owner", "owner")
        response = self.client.post(
            "/api/settings/services/split-preview",
            headers=self.auth_headers(token),
            json={"service": self._wash_draft(token), "samplePrice": 10000,
                  "samplePercent": 30.0, "complaintPenaltyPp": 10.0},
        )
        self.assertEqual(response.status_code, 200, response.text)
        preview = response.json()
        self.assertEqual(preview["masterTotal"], 2000)
        self.assertEqual(preview["piggyDeposit"], 2400)
        self.assertEqual(preview["ownersTotal"], 5600)

    def test_preview_rejects_bad_dop(self) -> None:
        token = self.login_staff("owner", "owner")
        response = self.client.post(
            "/api/settings/services/split-preview",
            headers=self.auth_headers(token),
            json={"service": self._wash_draft(token), "samplePrice": 10000,
                  "samplePercent": 30.0,
                  "dops": [{"name": "Доп", "price": 2000, "priceMode": "weird",
                            "workers": []}]},
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_preview_trace_classic(self) -> None:
        token = self.login_staff("owner", "owner")
        response = self.client.post(
            "/api/settings/services/split-preview",
            headers=self.auth_headers(token),
            json={"service": self._wash_draft(token), "samplePrice": 10000,
                  "samplePercent": 30.0},
        )
        self.assertEqual(response.status_code, 200, response.text)
        steps = response.json()["steps"]
        self.assertEqual([s["step"] for s in steps],
                         ["start", "materials", "master", "piggy", "owners"])
        self.assertEqual([s["amount"] for s in steps], [0, 0, 3000, 2400, 4600])
        self.assertEqual([s["poolAfter"] for s in steps], [10000, 10000, 7000, 4600, 0])

    def test_preview_trace_pipeline_piggy_first(self) -> None:
        token = self.login_staff("owner", "owner")
        svc = self._wash_draft(token)
        svc["splitOrder"] = ["materials", "piggy", "master", "owners"]
        response = self.client.post(
            "/api/settings/services/split-preview",
            headers=self.auth_headers(token),
            json={"service": svc, "samplePrice": 10000, "samplePercent": 30.0},
        )
        self.assertEqual(response.status_code, 200, response.text)
        steps = response.json()["steps"]
        self.assertEqual([s["step"] for s in steps],
                         ["start", "materials", "piggy", "master", "owners"])
        self.assertEqual([s["amount"] for s in steps], [0, 0, 2400, 2280, 5320])
        self.assertEqual([s["poolAfter"] for s in steps], [10000, 10000, 7600, 5320, 0])

    def test_preview_trace_with_dop(self) -> None:
        token = self.login_staff("owner", "owner")
        response = self.client.post(
            "/api/settings/services/split-preview",
            headers=self.auth_headers(token),
            json={"service": self._wash_draft(token), "samplePrice": 10000,
                  "samplePercent": 30.0,
                  "dops": [{"name": "Доп", "price": 2000, "priceMode": "add",
                            "workers": [{"percent": 50, "payType": "percent"}]}]},
        )
        self.assertEqual(response.status_code, 200, response.text)
        steps = response.json()["steps"]
        kinds = [s["step"] for s in steps]
        self.assertIn("dop", kinds)
        self.assertIn("dop_masters", kinds)
        dop = next(s for s in steps if s["step"] == "dop")
        self.assertEqual((dop["name"], dop["amount"], dop["bank"]), ("Доп", 240, "wash"))

    def test_preview_dop_uses_reference_service_settings(self) -> None:
        from app.database import SessionLocal
        from app.models import Service

        token = self.login_staff("owner", "owner")
        with SessionLocal() as db:
            svc = db.get(Service, "s1")
            svc.piggy_pay_type = "fixed"
            svc.piggy_pay_value = 1500
            db.commit()
        response = self.client.post(
            "/api/settings/services/split-preview",
            headers=self.auth_headers(token),
            json={"service": self._wash_draft(token), "samplePrice": 10000,
                  "samplePercent": 30.0,
                  "dops": [{"serviceId": "s1", "name": "Доп", "price": 2000,
                            "priceMode": "add",
                            "workers": [{"percent": 50, "payType": "percent"}]}]},
        )
        self.assertEqual(response.status_code, 200, response.text)
        preview = response.json()
        # Остаток 1000, фикс доп-услуги 1500 упирается в остаток → 1000.
        self.assertEqual([d["amount"] for d in preview["asvcPiggy"]], [1000])
        self.assertEqual(preview["asvcOwnerExtra"], 0)

    def test_snapshot_column_migration_adds_and_reruns(self) -> None:
        from sqlalchemy import inspect as sa_inspect

        from app.database import Base, engine
        from app.main import _apply_runtime_migrations

        Base.metadata.create_all(bind=engine)
        with engine.begin() as conn:
            conn.exec_driver_sql("ALTER TABLE bookings DROP COLUMN money_split_snapshot")
        before = {c["name"] for c in sa_inspect(engine).get_columns("bookings")}
        self.assertNotIn("money_split_snapshot", before)
        _apply_runtime_migrations()
        cols = {c["name"] for c in sa_inspect(engine).get_columns("bookings")}
        self.assertIn("money_split_snapshot", cols)
        _apply_runtime_migrations()
        cols = {c["name"] for c in sa_inspect(engine).get_columns("bookings")}
        self.assertIn("money_split_snapshot", cols)


if __name__ == "__main__":
    unittest.main()

"""Тесты строгого ремонта mojibake: _repair_text_value + debug-эндпоинты.

Стратегия: строка в БД — это UTF-8 байты, ошибочно декодированные как
cp1251/cp1252/latin-1. Ремонт детерминированный, без маркеров-слов;
корректный текст (кириллица, латиница, emoji) не изменяется.
"""

import json
import os
import sys
import unittest
import urllib.parse
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))


def reset_app_modules() -> None:
    for name in list(sys.modules):
        if name.startswith("app") or name in {"bot", "main"}:
            sys.modules.pop(name, None)


def build_init_data(telegram_id: str) -> str:
    """Build Telegram init data that passes insecure validation (no HMAC)."""
    return urllib.parse.urlencode(
        {"user": json.dumps({"id": int(telegram_id)})}
    )


def as_cp1251_mojibake(text: str) -> str:
    """Эмуляция типичной порчи: utf-8 байты, декодированные как cp1251."""
    return text.encode("utf-8").decode("cp1251")


def as_latin1_mojibake(text: str) -> str:
    return text.encode("utf-8").decode("cp1252")


class StrictRepairUnitTests(unittest.TestCase):
    def test_repairs_cp1251_mojibake(self) -> None:
        from app.main import _repair_text_value

        mojibake = as_cp1251_mojibake("Выручка")
        self.assertNotEqual(mojibake, "Выручка")
        self.assertEqual(_repair_text_value(mojibake), "Выручка")

    def test_repairs_cp1251_mojibake_with_broken_apostrophe(self) -> None:
        from app.main import _repair_text_value

        # Байт 0x92 (’) при порче часто превращался в обычный апостроф
        mojibake = as_cp1251_mojibake("Выручка").replace("\u2019", "'")
        self.assertEqual(_repair_text_value(mojibake), "Выручка")

    def test_repairs_latin1_mojibake(self) -> None:
        from app.main import _repair_text_value

        mojibake = as_latin1_mojibake("Привет")
        self.assertNotEqual(mojibake, "Привет")
        self.assertEqual(_repair_text_value(mojibake), "Привет")

    def test_repairs_double_mojibake(self) -> None:
        from app.main import _repair_text_value

        once = as_cp1251_mojibake("Выручка")
        twice = once.encode("utf-8").decode("cp1251")
        self.assertNotEqual(twice, "Выручка")
        self.assertEqual(_repair_text_value(twice), "Выручка")


class _TestClientContext:
    """Обёртка над TestClient с context manager семантикой."""

    def __init__(self, app) -> None:
        from fastapi.testclient import TestClient

        self._cm = TestClient(app)

    def __enter__(self):
        return self._cm.__enter__()

    def __exit__(self, *args) -> None:
        self._cm.__exit__(*args)


class MojibakeEndpointTests(unittest.TestCase):
    ADMIN_TG_ID = "889111"
    WORKER_TG_ID = "889112"
    OWNER_TG_ID = "889113"

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
        # consume one-time text repair (fires on first get_db request)
        self.client.get("/api/debug/db")
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
        except ModuleNotFoundError:
            return
        engine.dispose()

    def restart_app(self) -> None:
        if hasattr(self, "client_manager"):
            self.shutdown_app()
        reset_app_modules()
        from app.main import app

        self.client_manager = _TestClientContext(app)
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

    def _break_one_service(self) -> None:
        from app.database import SessionLocal
        from app.models import Service

        with SessionLocal() as db:
            service = db.scalars(select(Service)).first()
            assert service is not None
            service.name = as_cp1251_mojibake("Выручка за мойку")
            db.commit()

    def test_scan_and_repair_endpoints(self) -> None:
        self._break_one_service()

        scan = self.client.get(
            "/api/debug/mojibake-scan",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(scan.status_code, 200, scan.text)
        scan_data = scan.json()
        self.assertGreaterEqual(scan_data["count"], 1)
        target = next(
            (r for r in scan_data["rows"] if r["table"] == "services"),
            None,
        )
        self.assertIsNotNone(target)
        assert target is not None
        self.assertEqual(target["fixed"], "Выручка за мойку")

        # Dry-run по умолчанию — данные не меняются
        dry = self.client.post(
            "/api/debug/mojibake-repair",
            headers=self.auth_headers(self.owner_token),
            json={},
        )
        self.assertEqual(dry.status_code, 200, dry.text)
        self.assertTrue(dry.json()["dry_run"])

        from app.database import SessionLocal
        from app.models import Service

        with SessionLocal() as db:
            service = db.scalars(select(Service)).first()
            assert service is not None
            self.assertNotEqual(service.name, "Выручка за мойку")

        apply_resp = self.client.post(
            "/api/debug/mojibake-repair",
            headers=self.auth_headers(self.owner_token),
            json={"apply": True},
        )
        self.assertEqual(apply_resp.status_code, 200, apply_resp.text)
        self.assertGreaterEqual(apply_resp.json()["changed"], 1)

        with SessionLocal() as db:
            service = db.scalars(select(Service)).first()
            assert service is not None
            self.assertEqual(service.name, "Выручка за мойку")

        # После ремонта скан пуст
        scan_after = self.client.get(
            "/api/debug/mojibake-scan",
            headers=self.auth_headers(self.owner_token),
        )
        self.assertEqual(scan_after.json()["count"], 0)

    def test_repair_requires_owner(self) -> None:
        for token in (self.admin_token, self.worker_token):
            scan = self.client.get(
                "/api/debug/mojibake-scan",
                headers=self.auth_headers(token),
            )
            self.assertEqual(scan.status_code, 403)
            repair = self.client.post(
                "/api/debug/mojibake-repair",
                headers=self.auth_headers(token),
                json={"apply": True},
            )
            self.assertEqual(repair.status_code, 403)


if __name__ == "__main__":
    unittest.main()


    def test_repairs_ruble_mojibake(self) -> None:
        from app.main import _repair_text_value

        mojibake = as_cp1251_mojibake("₽")
        self.assertEqual(_repair_text_value(mojibake), "₽")

    def test_correct_text_untouched(self) -> None:
        from app.main import _repair_text_value

        samples = [
            "Выручка",
            "Привет мир",
            "АТМОСФЕРА",
            "Клиент Иван",
            "Revenue 2024",
            "don't stop",
            "₽ 1 200",
            "Мойка 👋 базовая",
            "AB-12/34",
            "",
        ]
        for sample in samples:
            self.assertEqual(_repair_text_value(sample), sample, sample)

    def test_idempotent(self) -> None:
        from app.main import _repair_text_value

        once = _repair_text_value(as_cp1251_mojibake("Выручка завершена ₽"))
        self.assertEqual(_repair_text_value(once), once)

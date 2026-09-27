"""T1.2: аудит owner-опасных действий + permissive authorize.

Проверяет новую функциональность (прод-поведение не меняется):
- log_action() персистит строку со всеми полями в той же транзакции;
- GET /api/debug/db от owner создаёт audit-строку debug.db.read;
- dry-run mojibake-repair строк НЕ создаёт;
- authorize_role в permissive-режиме (AUTHZ_ENFORCE=false) разрешает +
  пишет WARNING, в enforce-режиме — 403.
"""

from __future__ import annotations

import json
import logging
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
            or name.startswith("app.")
            or name == "backend.app"
            or name.startswith("backend.app.")
            or name == "bot"
        ):
            del sys.modules[name]


def build_init_data(telegram_id: str) -> str:
    return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})


class AuditLogTests(unittest.TestCase):
    OWNER_TG_ID = "777074"
    ADMIN_TG_ID = "777071"

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
        os.environ.pop("AUTHZ_ENFORCE", None)
        os.environ.pop("WEBAPP_URL", None)
        # T4: drop leaked GOOGLE_* env.
        for _key in ("GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET", "GOOGLE_CALENDAR_REDIRECT_URI", "GOOGLE_CALENDAR_TIMEZONE"):
            os.environ.pop(_key, None)

        self.restart_app()
        self._set_owner_telegram_id()
        self.owner_token = build_init_data(self.OWNER_TG_ID)
        self.admin_token = build_init_data(self.ADMIN_TG_ID)

    def tearDown(self) -> None:
        os.environ.pop("AUTHZ_ENFORCE", None)
        self.shutdown_app()
        reset_app_modules()
        if self.db_path.exists():
            try:
                self.db_path.unlink()
            except OSError:
                # Windows/daemon может держать файл (см. Google-тесты) — мусор gitignored.
                pass

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

    def _set_owner_telegram_id(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser
        from sqlalchemy import select

        with SessionLocal() as db:
            staff = db.scalars(select(StaffUser)).all()
            for item in staff:
                if item.login == "owner":
                    item.telegram_chat_id = self.OWNER_TG_ID
                elif item.login == "admin":
                    item.telegram_chat_id = self.ADMIN_TG_ID
            db.commit()

    def _audit_rows(self, action: str) -> list:
        from app.database import SessionLocal
        from app.models import AuditLog
        from sqlalchemy import select

        with SessionLocal() as db:
            return (
                db.scalars(select(AuditLog).where(AuditLog.action == action))
                .all()
            )

    def test_log_action_persists_with_fields(self) -> None:
        from app.audit_log import log_action
        from app.database import SessionLocal
        from app.models import AuditLog
        from sqlalchemy import select

        with SessionLocal() as db:
            entry = log_action(
                db,
                action="test.probe",
                actor_id="actor-1",
                actor_role="owner",
                object_type="probe",
                object_id="obj-1",
                detail="detail-1",
            )
            db.commit()
            entry_id = entry.id
        with SessionLocal() as db:
            loaded = db.get(AuditLog, entry_id)
            self.assertIsNotNone(loaded)
            assert loaded is not None
            self.assertEqual(loaded.action, "test.probe")
            self.assertEqual(loaded.actor_id, "actor-1")
            self.assertEqual(loaded.actor_role, "owner")
            self.assertEqual(loaded.object_type, "probe")
            self.assertEqual(loaded.object_id, "obj-1")
            self.assertEqual(loaded.detail, "detail-1")
            self.assertIsNotNone(loaded.created_at)

    def test_log_action_rolls_back_with_caller_transaction(self) -> None:
        from app.audit_log import log_action
        from app.database import SessionLocal
        from app.models import AuditLog
        from sqlalchemy import func, select

        with SessionLocal() as db:
            before = db.scalar(select(func.count()).select_from(AuditLog)) or 0
            log_action(db, action="test.rollback_probe")
            db.rollback()
            after = db.scalar(select(func.count()).select_from(AuditLog)) or 0
        self.assertEqual(before, after)

    def test_debug_db_read_creates_audit_row(self) -> None:
        response = self.client.get(
            "/api/debug/db", headers={"Authorization": self.owner_token}
        )
        self.assertEqual(response.status_code, 200, response.text)
        rows = self._audit_rows("debug.db.read")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].actor_role, "owner")

    def test_mojibake_dry_run_creates_no_audit_row(self) -> None:
        response = self.client.post(
            "/api/debug/mojibake-repair",
            headers={"Authorization": self.owner_token},
            json={},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json().get("dry_run"))
        self.assertEqual(self._audit_rows("debug.mojibake_repair.apply"), [])

    def test_audit_log_read_owner_only_with_filter(self) -> None:
        # что-то пишем: чтение debug_db оставляет след
        probe = self.client.get(
            "/api/debug/db", headers={"Authorization": self.owner_token}
        )
        self.assertEqual(probe.status_code, 200, probe.text)

        listing = self.client.get(
            "/api/owner/audit-log",
            headers={"Authorization": self.owner_token},
        )
        self.assertEqual(listing.status_code, 200, listing.text)
        body = listing.json()
        self.assertGreaterEqual(body["total"], 1)
        actions = [item["action"] for item in body["items"]]
        self.assertIn("debug.db.read", actions)
        first = body["items"][0]
        for field in ("id", "createdAt", "actorId", "actorRole", "action"):
            self.assertIn(field, first)

        filtered = self.client.get(
            "/api/owner/audit-log?action=debug.db.read",
            headers={"Authorization": self.owner_token},
        )
        self.assertEqual(filtered.status_code, 200, filtered.text)
        self.assertGreaterEqual(filtered.json()["total"], 1)
        for item in filtered.json()["items"]:
            self.assertEqual(item["action"], "debug.db.read")

        empty = self.client.get(
            "/api/owner/audit-log?action=no.such.action",
            headers={"Authorization": self.owner_token},
        )
        self.assertEqual(empty.json()["total"], 0)
        self.assertEqual(empty.json()["items"], [])

        denied = self.client.get(
            "/api/owner/audit-log", headers={"Authorization": self.admin_token}
        )
        self.assertEqual(denied.status_code, 403, denied.text)
        anon = self.client.get("/api/owner/audit-log")
        self.assertIn(anon.status_code, (401, 403), anon.text)

    def test_authorize_role_permissive_allows(self) -> None:
        from app.authz import authorize_role

        # permissive включается только явным флагом (дефолт — enforce)
        os.environ["AUTHZ_ENFORCE"] = "false"
        try:
            with self.assertLogs("app.authz", level="WARNING"):
                authorize_role(
                    {"role": "accountant", "actorId": "acc-1"},
                    {"admin", "owner"},
                    action="booking.delete",
                )
        finally:
            os.environ.pop("AUTHZ_ENFORCE", None)
        # разрешённая роль — тихо, без WARNING
        logger = logging.getLogger("app.authz")
        with self.assertNoLogs(logger, level="WARNING"):
            authorize_role(
                {"role": "owner", "actorId": "o1"},
                {"admin", "owner"},
                action="booking.delete",
            )

    def test_authorize_role_enforce_denies_by_default(self) -> None:
        # хвост T1.2: enforce — дефолт, флаг выставлять не нужно
        from fastapi import HTTPException

        from app.authz import authorize_role

        os.environ.pop("AUTHZ_ENFORCE", None)
        with self.assertRaises(HTTPException) as ctx:
            authorize_role(
                {"role": "accountant", "actorId": "acc-1"},
                {"admin", "owner"},
                action="booking.delete",
            )
        self.assertEqual(ctx.exception.status_code, 403)
        # owner проходит и в enforce-режиме
        authorize_role(
            {"role": "owner", "actorId": "o1"},
            {"admin", "owner"},
            action="booking.delete",
        )

    def test_authorize_role_enforce_denies(self) -> None:
        from fastapi import HTTPException

        from app.authz import authorize_role

        os.environ["AUTHZ_ENFORCE"] = "true"
        try:
            with self.assertRaises(HTTPException) as ctx:
                authorize_role(
                    {"role": "accountant", "actorId": "acc-1"},
                    {"admin", "owner"},
                    action="booking.delete",
                )
            self.assertEqual(ctx.exception.status_code, 403)
            # owner в enforce-режиме проходит
            authorize_role(
                {"role": "owner", "actorId": "o1"},
                {"admin", "owner"},
                action="booking.delete",
            )
        finally:
            os.environ.pop("AUTHZ_ENFORCE", None)


if __name__ == "__main__":
    unittest.main()

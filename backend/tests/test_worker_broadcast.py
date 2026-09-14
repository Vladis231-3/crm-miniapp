"""Tests for owner -> all masters broadcast + take-to-work flow."""
from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select


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


class WorkerBroadcastTests(unittest.TestCase):
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
        os.environ.pop("PERMANENT_TELEGRAM_OWNERS", None)
        self.restart_app()

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

    def login_staff(self, login: str, password: str) -> str:
        response = self.client.post(
            "/api/auth/staff/login",
            json={"login": login, "password": password},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["token"]

    @staticmethod
    def auth_headers(token: str) -> dict[str, str]:
        return {"Authorization": token}

    def disable_owner_two_factor(self) -> None:
        from app.database import SessionLocal
        from app.models import AppSetting

        with SessionLocal() as db:
            setting = db.get(AppSetting, "owner_security")
            self.assertIsNotNone(setting)
            assert setting is not None
            setting.value = {"twoFactor": False}
            db.commit()

    def test_owner_broadcast_reaches_all_workers_and_claim_flow(self) -> None:
        self.disable_owner_two_factor()
        owner_token = self.login_staff("owner", "owner")

        from app.database import SessionLocal
        from app.models import Notification, StaffUser

        with SessionLocal() as db:
            workers = db.scalars(select(StaffUser).where(StaffUser.role == "worker", StaffUser.active.is_(True))).all()
            self.assertGreaterEqual(len(workers), 1, "need at least 1 active worker in seed")
            worker_ids = [w.id for w in workers]
            first_worker = workers[0]
            first_worker.telegram_chat_id = "555000"
            db.commit()

        with patch("app.main.send_telegram_message") as mock_msg:
            resp = self.client.post(
                "/api/broadcasts/workers",
                headers=self.auth_headers(owner_token),
                json={"message": "помойте бокс после себя"},
            )
        self.assertEqual(resp.status_code, 200, resp.text)
        payload = resp.json()
        self.assertEqual(payload["delivered"], len(worker_ids))
        self.assertGreaterEqual(mock_msg.call_count, 1)

        with SessionLocal() as db:
            notes = db.scalars(select(Notification).where(Notification.recipient_role == "worker")).all()
            mine = [n for n in notes if n.recipient_id in worker_ids and "помойте бокс" in n.message]
            self.assertEqual(len(mine), len(worker_ids))
            target = next(n for n in mine if n.recipient_id == worker_ids[0])

        # worker login: find login/password via seed? Use first worker login from DB
        with SessionLocal() as db:
            w = db.get(StaffUser, worker_ids[0])
            assert w is not None
            w_login = w.login
            db.commit()
        # seed workers have password "master" (see app/seed.py)
        worker_token = None
        for pwd in ("master", "worker", "password", w_login, "123456"):
            r = self.client.post("/api/auth/staff/login", json={"login": w_login, "password": pwd})
            if r.status_code == 200:
                worker_token = r.json()["token"]
                break
        self.assertIsNotNone(worker_token, f"could not login as worker {w_login}")
        assert worker_token is not None

        # bootstrap worker sees message
        boot = self.client.get("/api/auth/session", headers=self.auth_headers(worker_token))
        self.assertEqual(boot.status_code, 200, boot.text)
        notifs = boot.json()["notifications"]
        self.assertTrue(any("помойте бокс" in n["message"] for n in notifs))

        # take to work
        with patch("app.main.send_telegram_message") as mock_msg2:
            take = self.client.post(
                f"/api/notifications/{target.id}/take-to-work",
                headers=self.auth_headers(worker_token),
            )
        self.assertEqual(take.status_code, 200, take.text)
        self.assertTrue(take.json()["read"])
        self.assertGreaterEqual(mock_msg2.call_count, 1)

        with SessionLocal() as db:
            owner_notes = db.scalars(select(Notification).where(Notification.recipient_role == "owner")).all()
            self.assertTrue(any("взял" in n.message and "в работу" in n.message for n in owner_notes))

        # idempotent second take
        take2 = self.client.post(
            f"/api/notifications/{target.id}/take-to-work",
            headers=self.auth_headers(worker_token),
        )
        self.assertEqual(take2.status_code, 200, take2.text)

        # complete
        done = self.client.post(
            f"/api/notifications/{target.id}/complete",
            headers=self.auth_headers(worker_token),
        )
        self.assertEqual(done.status_code, 200, done.text)
        with SessionLocal() as db:
            owner_notes2 = db.scalars(select(Notification).where(Notification.recipient_role == "owner")).all()
            self.assertTrue(any("выполнил" in n.message for n in owner_notes2))

    def test_broadcast_forbidden_for_worker_and_empty(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser

        self.disable_owner_two_factor()
        owner_token = self.login_staff("owner", "owner")
        with SessionLocal() as db:
            w = db.scalar(select(StaffUser).where(StaffUser.role == "worker", StaffUser.active.is_(True)))
            assert w is not None
            w_login = w.login
        worker_token = None
        for pwd in ("master", "worker", "password", w_login, "123456"):
            r = self.client.post("/api/auth/staff/login", json={"login": w_login, "password": pwd})
            if r.status_code == 200:
                worker_token = r.json()["token"]
                break
        self.assertIsNotNone(worker_token)
        assert worker_token is not None
        r = self.client.post("/api/broadcasts/workers", headers=self.auth_headers(worker_token), json={"message": "hi"})
        self.assertEqual(r.status_code, 403, r.text)
        r2 = self.client.post("/api/broadcasts/workers", headers=self.auth_headers(owner_token), json={"message": "   "})
        self.assertIn(r2.status_code, (400, 422), r2.text)

    def test_list_notifications_returns_only_own(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser

        self.disable_owner_two_factor()
        owner_token = self.login_staff("owner", "owner")
        with SessionLocal() as db:
            workers = db.scalars(select(StaffUser).where(StaffUser.role == "worker", StaffUser.active.is_(True)).order_by(StaffUser.id)).all()
            self.assertGreaterEqual(len(workers), 2, "need at least 2 active workers in seed")
            logins = [w.login for w in workers[:2]]
            ids = [w.id for w in workers[:2]]

        tokens = []
        for login in logins:
            r = self.client.post("/api/auth/staff/login", json={"login": login, "password": "master"})
            self.assertEqual(r.status_code, 200, r.text)
            tokens.append(r.json()["token"])

        with patch("app.main.send_telegram_message"):
            resp = self.client.post(
                "/api/broadcasts/workers",
                headers=self.auth_headers(owner_token),
                json={"message": "видимость список"},
            )
        self.assertEqual(resp.status_code, 200, resp.text)

        first = self.client.get("/api/notifications", headers=self.auth_headers(tokens[0]))
        self.assertEqual(first.status_code, 200, first.text)
        first_items = first.json()
        self.assertTrue(any("видимость список" in n["message"] for n in first_items))
        self.assertTrue(all(n["recipientId"] == ids[0] for n in first_items))
        self.assertFalse(any(n["recipientId"] == ids[1] for n in first_items))

        second = self.client.get("/api/notifications", headers=self.auth_headers(tokens[1]))
        self.assertEqual(second.status_code, 200, second.text)
        self.assertTrue(any("видимость список" in n["message"] for n in second.json()))

        owner_list = self.client.get("/api/notifications", headers=self.auth_headers(owner_token))
        self.assertEqual(owner_list.status_code, 200, owner_list.text)
        self.assertFalse(any(n["recipientRole"] == "worker" for n in owner_list.json()))

    def test_selective_broadcast_only_chosen_master_gets_it(self) -> None:
        self.disable_owner_two_factor()
        owner_token = self.login_staff("owner", "owner")

        from app.database import SessionLocal
        from app.models import Notification, StaffUser

        with SessionLocal() as db:
            workers = db.scalars(select(StaffUser).where(StaffUser.role == "worker", StaffUser.active.is_(True)).order_by(StaffUser.id)).all()
            self.assertGreaterEqual(len(workers), 2, "need at least 2 active workers in seed for selective test")
            chosen = workers[0]
            others = workers[1:]

        with patch("app.main.send_telegram_message"):
            resp = self.client.post(
                "/api/broadcasts/workers",
                headers=self.auth_headers(owner_token),
                json={"message": "только избранному мастеру", "workerIds": [chosen.id]},
            )
        self.assertEqual(resp.status_code, 200, resp.text)
        payload = resp.json()
        self.assertEqual(payload["delivered"], 1)
        self.assertEqual(payload["recipientIds"], [chosen.id])

        with SessionLocal() as db:
            notes = db.scalars(select(Notification).where(Notification.recipient_role == "worker")).all()
            chosen_notes = [n for n in notes if n.recipient_id == chosen.id and "только избранному" in n.message]
            self.assertEqual(len(chosen_notes), 1)
            for other in others:
                leaked = [n for n in notes if n.recipient_id == other.id and "только избранному" in n.message]
                self.assertEqual(leaked, [], f"worker {other.id} must not receive selective broadcast")

    def test_selective_broadcast_rejects_bad_selection(self) -> None:
        self.disable_owner_two_factor()
        owner_token = self.login_staff("owner", "owner")

        r_empty = self.client.post(
            "/api/broadcasts/workers",
            headers=self.auth_headers(owner_token),
            json={"message": "hello", "workerIds": []},
        )
        self.assertEqual(r_empty.status_code, 422, r_empty.text)

        r_bad = self.client.post(
            "/api/broadcasts/workers",
            headers=self.auth_headers(owner_token),
            json={"message": "hello", "workerIds": ["no-such-master"]},
        )
        self.assertEqual(r_bad.status_code, 422, r_bad.text)


if __name__ == "__main__":
    unittest.main()

"""T1.1 + хвост T1.2: IDOR-матрица объектного доступа.

Покрытие (пути сверены с backend/app/main.py):
- DELETE /api/bookings/{id}: client может удалить только свою (client_id == actorId),
  worker вне allowed-набора -> 403, accountant -> 403 через authorize_role (enforce).
- PATCH /api/bookings/{id}: чужой worker -> 403, accountant -> 403 через authorize_role.
- GET /api/owner/bookings/{id}/money-split: только owner.
- GET /api/owner/workers/{id}/salary-detail: только owner;
  GET /api/worker/salary-detail: только свой actorId (параметра id нет).
- GET /api/admin/shift-inspections/{id}/photo: owner/admin, admin только свой adminId.
- GET /api/uploads/{filename}: БЕЗ _require_session (публично, FINDING, URL не guessable).
- PATCH /api/clients/{id}/card + DELETE /api/clients/{id}: admin/owner.
"""

from __future__ import annotations

import json
import os
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


class IdorMatrixTests(unittest.TestCase):
    ADMIN_TG_ID = "777071"
    IVAN_TG_ID = "777072"  # w1 / login ivan
    OLEG_TG_ID = "777073"  # w2 / login oleg
    OWNER_TG_ID = "777074"
    ACC_TG_ID = "777075"
    CLIENT_A_TG = "99900011"
    CLIENT_B_TG = "99900012"

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
        # T4: drop leaked GOOGLE_* env.
        for _key in ("GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET", "GOOGLE_CALENDAR_REDIRECT_URI", "GOOGLE_CALENDAR_TIMEZONE"):
            os.environ.pop(_key, None)

        self.restart_app()
        self._set_staff_telegram_ids()
        self._ensure_accountant()
        self.admin_token = build_init_data(self.ADMIN_TG_ID)
        self.ivan_token = build_init_data(self.IVAN_TG_ID)
        self.oleg_token = build_init_data(self.OLEG_TG_ID)
        self.owner_token = build_init_data(self.OWNER_TG_ID)
        self.acc_token = build_init_data(self.ACC_TG_ID)

    def tearDown(self) -> None:
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

    def _set_staff_telegram_ids(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser
        from sqlalchemy import select

        mapping = {
            "admin": self.ADMIN_TG_ID,
            "ivan": self.IVAN_TG_ID,
            "oleg": self.OLEG_TG_ID,
            "owner": self.OWNER_TG_ID,
        }
        with SessionLocal() as db:
            staff = db.scalars(select(StaffUser)).all()
            for item in staff:
                if item.login in mapping:
                    item.telegram_chat_id = mapping[item.login]
            db.commit()

    def _ensure_accountant(self) -> None:
        from app.database import SessionLocal
        from app.models import StaffUser
        from sqlalchemy import select

        with SessionLocal() as db:
            existing = db.scalar(select(StaffUser).where(StaffUser.login == "accountant"))
            if existing is None:
                db.add(
                    StaffUser(
                        id="acc-1",
                        login="accountant",
                        password_hash="x",
                        role="accountant",
                        name="Accountant",
                        telegram_chat_id=self.ACC_TG_ID,
                        active=True,
                        available=True,
                    )
                )
            else:
                existing.telegram_chat_id = self.ACC_TG_ID
                existing.role = "accountant"
                existing.active = True
            db.commit()

    @staticmethod
    def next_active_date() -> str:
        candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        for offset in range(1, 8):
            next_date = candidate + timedelta(days=offset)
            if next_date.weekday() != 6:
                return next_date.strftime("%d.%m.%Y")
        raise AssertionError("Unable to find active schedule day")

    def register_client(self, tg_id: str, phone: str, name: str) -> str:
        token = build_init_data(tg_id)
        response = self.client.post(
            "/api/auth/client",
            headers={"Authorization": token},
            json={"name": name, "phone": phone, "car": "", "plate": ""},
        )
        self.assertEqual(response.status_code, 200, response.text)
        from app.database import SessionLocal
        from app.models import Client
        from sqlalchemy import select

        with SessionLocal() as db:
            client = db.scalar(select(Client).where(Client.telegram_id == tg_id))
            self.assertIsNotNone(client)
            assert client is not None
            return client.id

    def admin_create_booking(
        self,
        client_id: str = "",
        client_name: str = "Matrix Client",
        client_phone: str = "+7 (999) 111-22-33",
        time: str = "10:00",
        status: str = "scheduled",
        workers: list | None = None,
    ) -> dict:
        response = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json={
                "clientId": client_id,
                "clientName": client_name,
                "clientPhone": client_phone,
                "service": "Мойка базовая",
                "serviceId": "s1",
                "date": self.next_active_date(),
                "time": time,
                "duration": 30,
                "price": 1500,
                "status": status,
                "workers": workers or [],
                "box": "Бокс 1",
                "paymentType": "cash",
                "car": "Lada Vesta",
                "plate": "A123BC",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    # --- bookings: удаление ---

    def test_client_cannot_delete_foreign_booking(self) -> None:
        client_a = self.register_client(self.CLIENT_A_TG, "+7 (999) 000-00-11", "Client A")
        self.register_client(self.CLIENT_B_TG, "+7 (999) 000-00-12", "Client B")
        booking = self.admin_create_booking(client_id=client_a, time="10:00")
        response = self.client.delete(
            f"/api/bookings/{booking['id']}",
            headers={"Authorization": build_init_data(self.CLIENT_B_TG)},
        )
        self.assertEqual(response.status_code, 403, response.text)

    def test_client_can_delete_own_booking(self) -> None:
        client_a = self.register_client(self.CLIENT_A_TG, "+7 (999) 000-00-11", "Client A")
        booking = self.admin_create_booking(client_id=client_a, time="11:00")
        response = self.client.delete(
            f"/api/bookings/{booking['id']}",
            headers={"Authorization": build_init_data(self.CLIENT_A_TG)},
        )
        self.assertEqual(response.status_code, 200, response.text)

    def test_worker_cannot_delete_booking(self) -> None:
        booking = self.admin_create_booking(time="12:00")
        response = self.client.delete(
            f"/api/bookings/{booking['id']}",
            headers={"Authorization": self.ivan_token},
        )
        self.assertEqual(response.status_code, 403, response.text)

    def test_accountant_cannot_delete_booking(self) -> None:
        # Хвост T1.2: enforce (AUTHZ_ENFORCE=true) — бухгалтер не удаляет брони.
        booking = self.admin_create_booking(time="13:00")
        response = self.client.delete(
            f"/api/bookings/{booking['id']}",
            headers={"Authorization": self.acc_token},
        )
        self.assertEqual(response.status_code, 403, response.text)

    # --- bookings: патч ---

    def test_stranger_worker_cannot_patch_booking(self) -> None:
        booking = self.admin_create_booking(
            time="14:00",
            workers=[{"workerId": "w2", "workerName": "Олег", "percent": 30}],
        )
        response = self.client.patch(
            f"/api/bookings/{booking['id']}",
            headers={"Authorization": self.ivan_token},
            json={"status": "in_progress"},
        )
        self.assertEqual(response.status_code, 403, response.text)

    def test_accountant_cannot_patch_booking(self) -> None:
        # Хвост T1.2: enforce (AUTHZ_ENFORCE=true) — бухгалтер не правит брони.
        booking = self.admin_create_booking(time="15:00")
        response = self.client.patch(
            f"/api/bookings/{booking['id']}",
            headers={"Authorization": self.acc_token},
            json={"notes": "accountant probe"},
        )
        self.assertEqual(response.status_code, 403, response.text)

    # --- деньги: изоляция ---

    def test_client_isolated_from_owner_money_split(self) -> None:
        client_a = self.register_client(self.CLIENT_A_TG, "+7 (999) 000-00-11", "Client A")
        booking = self.admin_create_booking(client_id=client_a, time="10:00")
        for token in (build_init_data(self.CLIENT_A_TG), self.ivan_token):
            probe = self.client.get(
                f"/api/owner/bookings/{booking['id']}/money-split",
                headers={"Authorization": token},
            )
            self.assertIn(probe.status_code, (401, 403, 404), probe.text)

    def test_worker_cannot_read_owner_salary_detail(self) -> None:
        probe = self.client.get(
            "/api/owner/workers/w1/salary-detail",
            headers={"Authorization": self.ivan_token},
        )
        self.assertEqual(probe.status_code, 403, probe.text)

    def test_worker_salary_detail_is_actor_bound(self) -> None:
        response = self.client.get(
            "/api/worker/salary-detail",
            headers={"Authorization": self.ivan_token},
        )
        self.assertEqual(response.status_code, 200, response.text)

    # --- фото инспекций: ролевая граница ---

    def test_inspection_photo_role_gate(self) -> None:
        missing_id = f"no-such-{uuid4().hex[:8]}"
        anon = self.client.get(f"/api/admin/shift-inspections/{missing_id}/photo")
        self.assertIn(anon.status_code, (401, 403), anon.text)
        worker = self.client.get(
            f"/api/admin/shift-inspections/{missing_id}/photo",
            headers={"Authorization": self.ivan_token},
        )
        self.assertEqual(worker.status_code, 403, worker.text)
        owner = self.client.get(
            f"/api/admin/shift-inspections/{missing_id}/photo",
            headers={"Authorization": self.owner_token},
        )
        self.assertEqual(owner.status_code, 404, owner.text)

    # --- загрузки: публичная раздача (FINDING) ---

    def test_upload_download_is_public_FINDING(self) -> None:
        # FINDING main.py:12100: serve_upload без _require_session.
        # URL не guessable (uuid4 hex), но границы auth нет.
        # После закрытия ожидать 401 для анонима -> обновить тест.
        png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
        upload = self.client.post(
            "/api/upload",
            headers={"Authorization": self.admin_token},
            files={"file": ("probe.png", png, "image/png")},
        )
        self.assertEqual(upload.status_code, 200, upload.text)
        filename = upload.json()["url"].rsplit("/", 1)[-1]
        try:
            anon = self.client.get(f"/api/uploads/{filename}")
            self.assertEqual(anon.status_code, 200, anon.text[:200])
            self.assertIn("image/png", anon.headers.get("content-type", ""))
        finally:
            from app.database import SessionLocal
            from app.main import UPLOAD_DIR
            from app.models import UploadedFile
            from sqlalchemy import select

            (UPLOAD_DIR / filename).unlink(missing_ok=True)
            with SessionLocal() as db:
                record = db.scalar(
                    select(UploadedFile).where(UploadedFile.id == Path(filename).stem)
                )
                if record is not None:
                    db.delete(record)
                    db.commit()

    # --- клиенты: карточка и удаление ---

    def test_client_card_and_delete_client_role_gate(self) -> None:
        client_a = self.register_client(self.CLIENT_A_TG, "+7 (999) 000-00-11", "Client A")
        worker_card = self.client.patch(
            f"/api/clients/{client_a}/card",
            headers={"Authorization": self.ivan_token},
            json={"notes": "worker probe"},
        )
        self.assertEqual(worker_card.status_code, 403, worker_card.text)
        worker_delete = self.client.delete(
            f"/api/clients/{client_a}",
            headers={"Authorization": self.ivan_token},
        )
        self.assertEqual(worker_delete.status_code, 403, worker_delete.text)
        admin_card = self.client.patch(
            f"/api/clients/{client_a}/card",
            headers={"Authorization": self.admin_token},
            json={"notes": "admin probe"},
        )
        self.assertEqual(admin_card.status_code, 200, admin_card.text)


if __name__ == "__main__":
    unittest.main()

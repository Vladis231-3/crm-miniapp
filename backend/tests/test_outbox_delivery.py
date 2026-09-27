"""T4: transactional outbox доставки в Google Calendar.

- create/update/delete брони кладут задания в той же транзакции;
- повторные правки коалесцируются в одну pending-строку;
- откат бизнес-транзакции убивает и задание (атомарность);
- воркер доставляет (fake), считает попытки, backoff, dead-letter;
- пропавшая бронь (purge) → gone без сети;
- поток не стартует без настроенного Google.
"""

from __future__ import annotations

import json
import os
import sys
import unittest
import urllib.parse
from datetime import datetime, timedelta
from pathlib import Path
from unittest import mock
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


CONFIGURED = mock.patch(
    "app.google_calendar.is_configured", return_value=True
)


class OutboxDeliveryTests(unittest.TestCase):
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
        os.environ.pop("WEBAPP_URL", None)
        # T4: drop leaked GOOGLE_* env.
        for _key in ("GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET", "GOOGLE_CALENDAR_REDIRECT_URI", "GOOGLE_CALENDAR_TIMEZONE"):
            os.environ.pop(_key, None)

        self.restart_app()
        self._set_staff_telegram_ids()
        self.admin_token = build_init_data(self.ADMIN_TG_ID)

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

        with SessionLocal() as db:
            staff = db.scalars(select(StaffUser)).all()
            for item in staff:
                if item.login == "admin":
                    item.telegram_chat_id = self.ADMIN_TG_ID
            db.commit()

    @staticmethod
    def next_active_date() -> str:
        candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        for offset in range(1, 8):
            next_date = candidate + timedelta(days=offset)
            if next_date.weekday() != 6:
                return next_date.strftime("%d.%m.%Y")
        raise AssertionError("Unable to find active schedule day")

    def make_booking(self, time: str = "10:00") -> dict:
        response = self.client.post(
            "/api/bookings",
            headers={"Authorization": self.admin_token},
            json={
                "clientId": "",
                "clientName": "Outbox Client",
                "clientPhone": "+7 (999) 333-44-55",
                "service": "Мойка базовая",
                "serviceId": "s1",
                "date": self.next_active_date(),
                "time": time,
                "duration": 30,
                "price": 1500,
                "status": "scheduled",
                "workers": [],
                "box": "Бокс 1",
                "paymentType": "cash",
                "car": "Lada Vesta",
                "plate": "A123BC",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def outbox_rows(self):
        from app.database import SessionLocal
        from app.models import Outbox
        from sqlalchemy import select

        with SessionLocal() as db:
            return db.scalars(select(Outbox).order_by(Outbox.created_at)).all()

    def test_create_enqueues_upsert(self) -> None:
        booking = self.make_booking()
        rows = [
            row for row in self.outbox_rows() if row.kind == "google_upsert"
        ]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].status, "pending")
        self.assertEqual(rows[0].booking_id, booking["id"])
        self.assertEqual(rows[0].op_key, f"google:{booking['id']}:upsert")

    def test_delete_enqueues_delete(self) -> None:
        booking = self.make_booking()
        response = self.client.delete(
            f"/api/bookings/{booking['id']}",
            headers={"Authorization": self.admin_token},
        )
        self.assertEqual(response.status_code, 200, response.text)
        kinds = sorted(
            row.kind for row in self.outbox_rows() if row.kind.startswith("google_")
        )
        self.assertEqual(kinds, ["google_delete", "google_upsert"])

    def test_update_coalesces_single_row(self) -> None:
        booking = self.make_booking()
        for note in ("правка 1", "правка 2"):
            response = self.client.patch(
                f"/api/bookings/{booking['id']}",
                headers={"Authorization": self.admin_token},
                json={"notes": note},
            )
            self.assertEqual(response.status_code, 200, response.text)
        rows = [
            row for row in self.outbox_rows() if row.kind == "google_upsert"
        ]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].status, "pending")

    def test_rollback_kills_outbox_row(self) -> None:
        # Атомарность: задание живёт и умирает вместе с бизнес-транзакцией.
        from app.database import SessionLocal
        from app.models import Outbox
        from app.outbox import enqueue_google_sync
        from sqlalchemy import func, select

        booking = self.make_booking()
        with SessionLocal() as db:
            before = (
                db.scalar(select(func.count()).select_from(Outbox)) or 0
            )
            enqueue_google_sync(db, booking["id"], "upsert")
            db.rollback()
            after = db.scalar(select(func.count()).select_from(Outbox)) or 0
        self.assertEqual(before, after)

    def test_delivery_marks_sent(self) -> None:
        from app.outbox import process_outbox_batch

        booking = self.make_booking()
        seen: list[str] = []

        def fake_deliver(db, settings, row) -> bool:
            if row.kind == "google_upsert":
                seen.append(row.booking_id or "")
            return True

        with CONFIGURED:
            stats = process_outbox_batch(deliver=fake_deliver)
        self.assertEqual(seen, [booking["id"]])
        rows = self.outbox_rows()
        google = [row for row in rows if row.kind == "google_upsert"]
        self.assertEqual(len(google), 1)
        self.assertEqual(google[0].status, "sent")
        self.assertEqual(google[0].attempts, 1)
        self.assertGreaterEqual(stats["sent"], 1)

    def test_retry_then_sent(self) -> None:
        from app.database import SessionLocal
        from app.models import Outbox
        from app.outbox import process_outbox_batch
        from sqlalchemy import select

        self.make_booking()
        calls: list[int] = []

        def flaky(db, settings, row) -> bool:
            if row.kind != "google_upsert":
                return True
            calls.append(1)
            return len(calls) >= 3

        def reset_retry() -> None:
            from app.models import utc_now

            with SessionLocal() as db:
                row = db.scalar(
                    select(Outbox).where(Outbox.kind == "google_upsert").limit(1)
                )
                assert row is not None
                row.next_retry_at = utc_now()
                db.commit()

        with CONFIGURED:
            first = process_outbox_batch(deliver=flaky)
            self.assertEqual(first["retried"], 1)
            reset_retry()
            second = process_outbox_batch(deliver=flaky)
            self.assertEqual(second["retried"], 1)
            reset_retry()
            third = process_outbox_batch(deliver=flaky)
            self.assertGreaterEqual(third["sent"], 1)
        rows = [
            row for row in self.outbox_rows() if row.kind == "google_upsert"
        ]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].status, "sent")
        self.assertEqual(rows[0].attempts, 3)

    def test_missing_booking_goes_gone_without_network(self) -> None:
        # Реальный deliver-путь: booking нет → gone до какого-либо Google-вызова.
        from app.database import SessionLocal
        from app.models import Outbox, utc_now
        from app.outbox import process_outbox_batch

        with SessionLocal() as db:
            db.add(
                Outbox(
                    id=f"ob-{uuid4()}",
                    op_key="google:no-such-booking:upsert",
                    kind="google_upsert",
                    booking_id="no-such-booking",
                    payload={"action": "upsert"},
                    status="pending",
                    attempts=0,
                    next_retry_at=utc_now(),
                    created_at=utc_now(),
                )
            )
            db.commit()
        with CONFIGURED:
            stats = process_outbox_batch()
        self.assertEqual(
            stats, {"claimed": 1, "sent": 0, "retried": 0, "gone": 1, "failed": 0}
        )
        rows = self.outbox_rows()
        self.assertEqual(rows[0].status, "gone")

    def test_dead_letter_after_max_attempts(self) -> None:
        from app.database import SessionLocal
        from app.models import Outbox, utc_now
        from app.outbox import MAX_ATTEMPTS, process_outbox_batch

        self.make_booking()

        def always_fail(db, settings, row) -> bool:
            raise RuntimeError("google down")

        with SessionLocal() as db:
            from sqlalchemy import select

            row = db.scalar(
                select(Outbox).where(Outbox.kind == "google_upsert").limit(1)
            )
            assert row is not None
            row.attempts = MAX_ATTEMPTS - 1
            row.next_retry_at = utc_now()
            db.commit()
        with CONFIGURED:
            stats = process_outbox_batch(deliver=always_fail)
        self.assertGreaterEqual(stats["failed"], 1)
        rows = [
            row for row in self.outbox_rows() if row.kind == "google_upsert"
        ]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].status, "failed")
        self.assertEqual(rows[0].attempts, MAX_ATTEMPTS)

    def test_worker_thread_not_started_when_unconfigured(self) -> None:
        from app.outbox import start_outbox_worker_if_configured

        self.assertFalse(start_outbox_worker_if_configured())

    def test_booking_create_enqueues_tg_messages(self) -> None:
        # персоналу с chat_id — строки, остальным — пропуск как раньше.
        # admin уже привязан setUp'ом (777071), owner привязываем здесь.
        from app.database import SessionLocal
        from app.models import Outbox, StaffUser
        from sqlalchemy import select

        with SessionLocal() as db:
            owner = db.scalar(select(StaffUser).where(StaffUser.login == "owner"))
            if owner is not None:
                owner.telegram_chat_id = "555124"
            db.commit()
        self.make_booking()
        with SessionLocal() as db:
            rows = db.scalars(select(Outbox).where(Outbox.kind == "tg_message")).all()
            chats = sorted((row.payload or {}).get("chat_id", "") for row in rows)
            pending = [row for row in rows if row.status == "pending"]
        self.assertGreaterEqual(len(rows), 2)
        self.assertIn(self.ADMIN_TG_ID, chats)
        self.assertIn("555124", chats)
        self.assertEqual(len(pending), len(rows))

    def test_tg_delivery_sends_text(self) -> None:
        from app.outbox import KIND_TG_MESSAGE, process_outbox_batch

        self.test_booking_create_enqueues_tg_messages()
        sent: list[tuple[str, str]] = []

        def fake_deliver(db, settings, row) -> bool:
            if getattr(row, "kind", "") == KIND_TG_MESSAGE:
                payload = row.payload or {}
                sent.append((payload.get("chat_id", ""), payload.get("text", "")))
            return True

        stats = process_outbox_batch(deliver=fake_deliver)
        self.assertGreaterEqual(stats["sent"], 2)
        self.assertTrue(all(chat and text for chat, text in sent))
        self.assertTrue(any("Новая запись" in text for _, text in sent))

    def test_tg_disabled_sends_directly(self) -> None:
        import os
        from unittest.mock import patch

        from app.database import SessionLocal
        from app.models import Outbox, StaffUser
        from sqlalchemy import func, select

        with SessionLocal() as db:
            owner = db.scalar(select(StaffUser).where(StaffUser.login == "owner"))
            if owner is not None:
                owner.telegram_chat_id = "555124"
            db.commit()
        self.shutdown_app()
        os.environ["OUTBOX_TG_ENABLED"] = "false"
        try:
            self.restart_app()
            self._set_staff_telegram_ids()
            with SessionLocal() as db:
                owner = db.scalar(select(StaffUser).where(StaffUser.login == "owner"))
                if owner is not None:
                    owner.telegram_chat_id = "555124"
                db.commit()
            with patch("app.main._send_telegram_safe") as direct:
                self.make_booking()
                self.assertTrue(direct.called)
            with SessionLocal() as db:
                count = (
                    db.scalar(
                        select(func.count())
                        .select_from(Outbox)
                        .where(Outbox.kind == "tg_message")
                    )
                    or 0
                )
            self.assertEqual(count, 0)
        finally:
            os.environ.pop("OUTBOX_TG_ENABLED", None)

    def test_cron_outbox_guards(self) -> None:
        self.shutdown_app()
        os.environ.pop("CRON_SECRET", None)
        self.restart_app()
        try:
            denied = self.client.get("/api/cron/outbox")
            self.assertEqual(denied.status_code, 503, denied.text)
        finally:
            os.environ["CRON_SECRET"] = "test-cron-secret"
            self.restart_app()
            self._set_staff_telegram_ids()
            self.admin_token = build_init_data(self.ADMIN_TG_ID)

        wrong = self.client.get(
            "/api/cron/outbox", headers={"Authorization": "Bearer wrong"}
        )
        self.assertEqual(wrong.status_code, 401, wrong.text)

        self.make_booking()
        pumped = self.client.get(
            "/api/cron/outbox", headers={"Authorization": "Bearer test-cron-secret"}
        )
        self.assertEqual(pumped.status_code, 200, pumped.text)
        body = pumped.json()
        # Google не настроен: воркер пропускает, статистика честная.
        # claimed >= 1: google-строка + tg-строки персонала с chat_id.
        self.assertGreaterEqual(body["claimed"], 1)
        self.assertEqual(body["sent"], 0)

    def test_serverless_dual_write(self) -> None:
        # T4/Vercel: daemon мёртв — после коммита и строка outbox, и прямой
        # best-effort вызов (мгновенная доставка как раньше).
        from unittest.mock import patch

        self.shutdown_app()
        os.environ["VERCEL"] = "1"
        try:
            self.restart_app()
            self._set_staff_telegram_ids()
            admin_token = build_init_data(self.ADMIN_TG_ID)
            # Мокаем уровень выше: без настроенного Google внутренний sync
            # вышел бы раньше; проверяем сам факт dual-write ветки.
            with patch(
                "app.main._google_sync_booking", return_value=None
            ) as mock_sync:
                booking = self.client.post(
                    "/api/bookings",
                    headers={"Authorization": admin_token},
                    json={
                        "clientId": "",
                        "clientName": "Serverless Client",
                        "clientPhone": "+7 (999) 444-55-66",
                        "service": "Мойка базовая",
                        "serviceId": "s1",
                        "date": self.next_active_date(),
                        "time": "12:00",
                        "duration": 30,
                        "price": 1500,
                        "status": "scheduled",
                        "workers": [],
                        "box": "Бокс 1",
                        "paymentType": "cash",
                        "car": "Lada",
                        "plate": "B222BB",
                    },
                )
                self.assertEqual(booking.status_code, 200, booking.text)
                mock_sync.assert_called_once()
            rows = [
                row for row in self.outbox_rows() if row.kind == "google_upsert"
            ]
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0].status, "pending")
        finally:
            os.environ.pop("VERCEL", None)


if __name__ == "__main__":
    unittest.main()

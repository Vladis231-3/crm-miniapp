"""Тесты обратной синхронизации Google Calendar -> CRM (pull_calendar_changes)."""

from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from sqlalchemy import select


def reset_app_modules() -> None:
    for name in list(sys.modules):
        if name in {"app", "backend.app"} or name.startswith(("app.", "backend.app.")):
            del sys.modules[name]


def _event(
    event_id: str,
    *,
    start: str = "2026-08-13T10:30:00+03:00",
    end: str = "2026-08-13T11:15:00+03:00",
    summary: str = "Мойка",
    description: str | None = "Клиент: Иван\nТелефон: +7 999 123-45-67",
    crm_booking_id: str | None = None,
    cancelled: bool = False,
) -> dict:
    body: dict = {
        "id": event_id,
        "status": "cancelled" if cancelled else "confirmed",
        "summary": summary,
        "start": {"dateTime": start},
        "end": {"dateTime": end},
        "description": description,
    }
    if crm_booking_id:
        body["extendedProperties"] = {"private": {"crmBookingId": crm_booking_id}}
    return body


class GoogleCalendarPullTests(unittest.TestCase):
    def setUp(self) -> None:
        data_dir = Path(__file__).resolve().parents[1] / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = data_dir / f"test_gc_pull_{os.urandom(4).hex()}.sqlite3"
        os.environ["DATABASE_URL"] = f"sqlite:///{self.db_path.as_posix()}"
        os.environ["APP_ENV"] = "development"
        os.environ["APP_SECRET"] = "test-secret"
        os.environ["ALLOW_DEMO_SEED_DATA"] = "false"
        os.environ["RUN_EMBEDDED_BOT"] = "false"
        os.environ["ALLOW_INSECURE_CLIENT_AUTH"] = "true"
        os.environ["TELEGRAM_BOT_TOKEN"] = "123456:test-bot-token"
        os.environ["TELEGRAM_DELIVERY_MODE"] = "polling"
        os.environ["SYNC_TELEGRAM_WEBHOOK"] = "false"
        os.environ["GOOGLE_CALENDAR_CLIENT_ID"] = "test-client.apps.googleusercontent.com"
        os.environ["GOOGLE_CALENDAR_CLIENT_SECRET"] = "test-secret"
        os.environ["GOOGLE_CALENDAR_REDIRECT_URI"] = "https://example.com/callback"
        os.environ["GOOGLE_CALENDAR_TIMEZONE"] = "Europe/Moscow"

        reset_app_modules()
        from fastapi.testclient import TestClient

        from app.main import app

        # Фоновый поток обратной синхронизации не должен вмешиваться в моки.
        self._sync_thread_patch = patch("app.main.start_google_sync_thread")
        self._sync_thread_patch.start()

        self.client_manager = TestClient(app)
        self.client = self.client_manager.__enter__()

        from app.config import get_settings

        self.settings = get_settings()

    def tearDown(self) -> None:
        from app.database import engine

        engine.dispose()
        self.client_manager.__exit__(None, None, None)
        self._sync_thread_patch.stop()
        reset_app_modules()
        for suffix in ("", "-wal", "-shm"):
            path = Path(f"{self.db_path}{suffix}")
            try:
                path.unlink()
            except OSError:
                pass

    def session(self):
        from app.database import SessionLocal

        return SessionLocal()

    def _save_tokens(self) -> None:
        from app.google_calendar import save_tokens

        with self.session() as db:
            save_tokens(db, {"token": "t", "refresh_token": "r"})
            db.commit()

    def _patch_calendar_request(self, pages: list) -> patch:
        """Подменить _calendar_request: каждый вызов возвращает следующую страницу.

        Элемент может быть dict (страница) или исключением (поднимается).
        """
        consumed: list[dict | BaseException] = [p for p in pages]

        def fake_calendar_request(db, settings, method, path, *, params=None, body=None, _retried=False):
            next_item = consumed.pop(0)
            if isinstance(next_item, BaseException):
                raise next_item
            return next_item

        return patch("app.google_calendar._calendar_request", side_effect=fake_calendar_request)

    def test_pull_skipped_without_tokens(self) -> None:
        from app.google_calendar import pull_calendar_changes

        with self.session() as db:
            result = pull_calendar_changes(db, self.settings)
            db.commit()
        self.assertTrue(result["skipped"])
        self.assertTrue(result["ok"])

    def test_pull_creates_booking_and_client_from_new_event(self) -> None:
        from app.google_calendar import pull_calendar_changes

        self._save_tokens()
        pages = [
            {
                "items": [
                    _event(
                        "g-new-1",
                        summary="Полировка",
                        description="Клиент: Пётр\nТелефон: +7 (999) 555-44-33\nАвто: BMW\nКомментарий: приеду к 10:00",
                    )
                ],
                "nextSyncToken": "tok-1",
            }
        ]
        with self._patch_calendar_request(pages):
            with self.session() as db:
                result = pull_calendar_changes(db, self.settings)
                db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(result["created"], 1)
        self.assertEqual(result["updated"], 0)

        from app.models import Booking, Client

        with self.session() as db:
            booking = db.scalar(select(Booking).where(Booking.google_event_id == "g-new-1"))
            self.assertIsNotNone(booking)
            assert booking is not None
            self.assertEqual(booking.source, "google")
            self.assertEqual(booking.service, "Полировка")
            self.assertEqual(booking.date, "13.08.2026")
            self.assertEqual(booking.time, "10:30")
            self.assertEqual(booking.duration, 45)
            self.assertEqual(booking.status, "scheduled")
            self.assertEqual(booking.notes, "приеду к 10:00")
            client = db.get(Client, booking.client_id)
            self.assertIsNotNone(client)
            assert client is not None
            self.assertEqual(client.name, "Пётр")
            self.assertEqual(client.phone, "79995554433")
            # syncToken сохранён для инкрементальной синхронизации
            from app.models import AppSetting

            token_row = db.get(AppSetting, "google_calendar_sync_token")
            self.assertIsNotNone(token_row)
            self.assertEqual(token_row.value["sync_token"], "tok-1")

    def test_pull_updates_booking_time_by_crm_booking_id(self) -> None:
        from app.google_calendar import pull_calendar_changes

        from app.models import Booking, Client

        with self.session() as db:
            client = Client(id="c-1", name="Иван", phone="79990001122", registered=True)
            booking = Booking(
                id="b-1",
                client_id="c-1",
                client_name="Иван",
                client_phone="79990001122",
                service="Мойка",
                service_id="",
                date="13.08.2026",
                time="10:00",
                duration=30,
                price=500,
                status="scheduled",
                box="Бокс 1",
                payment_type="cash",
                source="bot",
                google_event_id="g-1",
            )
            db.add_all([client, booking])
            db.commit()

        self._save_tokens()
        pages = [
            {
                "items": [
                    {**_event("g-1", start="2026-08-14T15:45:00+03:00", end="2026-08-14T16:45:00+03:00"),
                     "extendedProperties": {"private": {"crmBookingId": "b-1"}}}
                ],
                "nextSyncToken": "tok-1",
            }
        ]
        with self._patch_calendar_request(pages):
            with self.session() as db:
                result = pull_calendar_changes(db, self.settings)
                db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(result["updated"], 1)
        with self.session() as db:
            booking = db.get(Booking, "b-1")
            assert booking is not None
            # Владелец перенёс событие в Google — запись перенесена следом.
            self.assertEqual(booking.date, "14.08.2026")
            self.assertEqual(booking.time, "15:45")
            self.assertEqual(booking.duration, 60)
            # Статус/клиент/оплата не тронуты обратной синхронизацией.
            self.assertEqual(booking.status, "scheduled")
            self.assertEqual(booking.source, "bot")
            self.assertEqual(booking.box, "Бокс 1")

    def test_pull_cancels_booking_when_event_deleted(self) -> None:
        from app.google_calendar import pull_calendar_changes

        from app.models import Booking, Client

        with self.session() as db:
            client = Client(id="c-2", name="Иван", phone="79990001122", registered=True)
            booking = Booking(
                id="b-2",
                client_id="c-2",
                client_name="Иван",
                client_phone="79990001122",
                service="Мойка",
                service_id="",
                date="13.08.2026",
                time="10:00",
                duration=30,
                price=500,
                status="scheduled",
                box="",
                payment_type="cash",
                source="bot",
                google_event_id="g-2",
            )
            db.add_all([client, booking])
            db.commit()

        self._save_tokens()
        pages = [{"items": [_event("g-2", cancelled=True)], "nextSyncToken": "tok-1"}]
        with self._patch_calendar_request(pages):
            with self.session() as db:
                result = pull_calendar_changes(db, self.settings)
                db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(result["cancelled"], 1)
        with self.session() as db:
            booking = db.get(Booking, "b-2")
            assert booking is not None
            self.assertEqual(booking.status, "cancelled")

    def test_pull_updates_existing_booking_without_crm_link(self) -> None:
        """События, созданные старым кодом (без extendedProperties), обновляются
        по google_event_id и не дублируются."""
        from app.google_calendar import pull_calendar_changes

        from app.models import Booking, Client

        with self.session() as db:
            client = Client(id="c-3", name="Иван", phone="79990001122", registered=True)
            booking = Booking(
                id="b-3",
                client_id="c-3",
                client_name="Иван",
                client_phone="79990001122",
                service="Мойка",
                service_id="",
                date="13.08.2026",
                time="10:00",
                duration=30,
                price=500,
                status="scheduled",
                box="",
                payment_type="cash",
                source="bot",
                google_event_id="g-3",
            )
            db.add_all([client, booking])
            db.commit()

        self._save_tokens()
        pages = [
            {"items": [_event("g-3", start="2026-08-13T11:00:00+03:00", end="2026-08-13T11:30:00+03:00")], "nextSyncToken": "tok-1"}
        ]
        with self._patch_calendar_request(pages):
            with self.session() as db:
                result = pull_calendar_changes(db, self.settings)
                db.commit()

        self.assertEqual(result["created"], 0)
        self.assertEqual(result["updated"], 1)
        with self.session() as db:
            booking = db.get(Booking, "b-3")
            assert booking is not None
            self.assertEqual(booking.time, "11:00")
            self.assertEqual(booking.source, "bot")

    def test_pull_passes_sync_token_on_next_run(self) -> None:
        from app.google_calendar import pull_calendar_changes

        self._save_tokens()
        pages = [{"items": [], "nextSyncToken": "tok-1"}]
        with self._patch_calendar_request(pages):
            with self.session() as db:
                pull_calendar_changes(db, self.settings)
                db.commit()

        # Второй запуск: запрос должен идти с syncToken и БЕЗ timeMin/timeMax.
        captured: list[dict] = []

        def fake_second(db, settings, method, path, *, params=None, body=None, _retried=False):
            captured.append(dict(params or {}))
            return {"items": [], "nextSyncToken": "tok-2"}

        with patch("app.google_calendar._calendar_request", side_effect=fake_second):
            with self.session() as db:
                pull_calendar_changes(db, self.settings)
                db.commit()

        kwargs = captured[0]
        self.assertEqual(kwargs.get("syncToken"), "tok-1")
        self.assertNotIn("timeMin", kwargs)
        self.assertNotIn("timeMax", kwargs)

    def test_pull_full_rescan_when_sync_token_expired(self) -> None:
        from app.google_calendar import _GoogleApiError, pull_calendar_changes

        self._save_tokens()
        captured: list[dict] = []
        pages: list = [
            _GoogleApiError(410, "sync token expired"),
            {"items": [], "nextSyncToken": "tok-fresh"},
        ]

        def fake_rescan(db, settings, method, path, *, params=None, body=None, _retried=False):
            captured.append(dict(params or {}))
            next_item = pages.pop(0)
            if isinstance(next_item, BaseException):
                raise next_item
            return next_item

        with patch("app.google_calendar._calendar_request", side_effect=fake_rescan):
            with self.session() as db:
                result = pull_calendar_changes(db, self.settings)
                db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(len(captured), 2)
        # Оба вызова идут полным сканом (без syncToken), свежий токен сохранён.
        for query in captured:
            self.assertNotIn("syncToken", query)
            self.assertIn("timeMin", query)
        from app.models import AppSetting

        with self.session() as db:
            token_row = db.get(AppSetting, "google_calendar_sync_token")
            self.assertIsNotNone(token_row)
            self.assertEqual(token_row.value["sync_token"], "tok-fresh")

    def test_pull_skips_foreign_event_with_wrong_crm_link(self) -> None:
        """Событие с чужим crmBookingId (подделанным или от другой записи)
        не должно перезаписывать чужую запись."""
        from app.google_calendar import pull_calendar_changes

        from app.models import Booking, Client

        with self.session() as db:
            client = Client(id="c-4", name="Иван", phone="79990001122", registered=True)
            booking = Booking(
                id="b-4",
                client_id="c-4",
                client_name="Иван",
                client_phone="79990001122",
                service="Мойка",
                service_id="",
                date="13.08.2026",
                time="10:00",
                duration=30,
                price=500,
                status="scheduled",
                box="",
                payment_type="cash",
                source="bot",
                google_event_id="g-other",  # событие g-4 не принадлежит записи
            )
            db.add_all([client, booking])
            db.commit()

        self._save_tokens()
        pages = [
            {
                "items": [
                    {
                        **_event("g-4", start="2026-08-14T09:00:00+03:00"),
                        "extendedProperties": {"private": {"crmBookingId": "b-4"}},
                    }
                ],
                "nextSyncToken": "tok-1",
            }
        ]
        with self._patch_calendar_request(pages):
            with self.session() as db:
                result = pull_calendar_changes(db, self.settings)
                db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(result["updated"], 0)
        with self.session() as db:
            booking = db.get(Booking, "b-4")
            assert booking is not None
            self.assertEqual(booking.date, "13.08.2026")  # не тронута


if __name__ == "__main__":
    unittest.main()
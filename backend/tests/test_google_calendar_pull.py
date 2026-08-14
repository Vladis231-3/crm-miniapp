"""Тесты обратной синхронизации Google Calendar -> CRM (pull_calendar_changes)."""

from __future__ import annotations

import os
import sys
import unittest
from datetime import datetime, timezone
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
    updated: str | None = None,
) -> dict:
    body: dict = {
        "id": event_id,
        "status": "cancelled" if cancelled else "confirmed",
        "summary": summary,
        "start": {"dateTime": start},
        "end": {"dateTime": end},
        "description": description,
    }
    if updated:
        body["updated"] = updated
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

    def test_pull_reports_auth_failed_with_google_details(self) -> None:
        """401/403 после попытки обновления токена -> error="auth_failed";

        детали из ответа Google пробрасываются в errorDetails, чтобы пользователь
        видел реальную причину (например, accessNotConfigured = API не включён).
        """
        from app.google_calendar import _GoogleApiError, pull_calendar_changes

        self._save_tokens()
        with self._patch_calendar_request(
            [
                _GoogleApiError(
                    403,
                    "Google Calendar API has not been used in project before or it is disabled.",
                    reason="accessNotConfigured",
                    details="Google Calendar API has not been used in project before or it is disabled.",
                )
            ]
        ), self.session() as db:
            result = pull_calendar_changes(db, self.settings)
            db.commit()

        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "auth_failed")
        details = result.get("errorDetails") or ""
        self.assertIn("console.cloud.google.com/apis/library/calendar.googleapis.com", details)

    def test_pull_reports_auth_failed_with_raw_details(self) -> None:
        """Прочие 401/403 (не accessNotConfigured) отдают исходный текст Google."""
        from app.google_calendar import _GoogleApiError, pull_calendar_changes

        self._save_tokens()
        with self._patch_calendar_request(
            [_GoogleApiError(403, "permission denied", reason="permissionDenied", details="permission denied")]
        ), self.session() as db:
            result = pull_calendar_changes(db, self.settings)
            db.commit()

        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "auth_failed")
        self.assertEqual(result.get("errorDetails"), "permission denied")

    def test_pull_parses_scrambled_description(self) -> None:
        """Свободный текст события: имя, телефон, авто, госномер, услуга в любом порядке."""
        from app.google_calendar import pull_calendar_changes
        from app.models import Booking, Client, Service

        with self.session() as db:
            db.add(
                Service(
                    id="s-wash",
                    name="Мойка",
                    category="Мойка",
                    price=500,
                    duration=30,
                    active=True,
                )
            )
            db.commit()

        self._save_tokens()
        pages = [
            {
                "items": [
                    _event(
                        "g-scramble-1",
                        summary="запись",
                        description="89001234567 тойота камри а123вс77 иван мойка",
                    )
                ],
                "nextSyncToken": "tok-s",
            }
        ]
        with self._patch_calendar_request(pages), self.session() as db:
            result = pull_calendar_changes(db, self.settings)
            db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(result["created"], 1)
        with self.session() as db:
            booking = db.scalar(select(Booking).where(Booking.google_event_id == "g-scramble-1"))
            self.assertIsNotNone(booking)
            assert booking is not None
            self.assertEqual(booking.service, "Мойка")
            client = db.get(Client, booking.client_id)
            self.assertIsNotNone(client)
            assert client is not None
            self.assertEqual(client.name, "Иван")
            self.assertEqual(client.phone, "79001234567")
            self.assertEqual(client.car, "Тойота Камри")
            self.assertEqual(client.plate, "а123вс77")

    def test_pull_parses_latin_brand_and_short_plate(self) -> None:
        """Латиница марки, телефон «+7 (…)», госномер на 777."""
        from app.google_calendar import pull_calendar_changes
        from app.models import Booking, Client

        self._save_tokens()
        pages = [
            {
                "items": [
                    _event(
                        "g-scramble-2",
                        summary="мойка экспресс",
                        description="BMW x5 +7 (900) 123-45-67 а777вс177",
                    )
                ],
                "nextSyncToken": "tok-s2",
            }
        ]
        with self._patch_calendar_request(pages), self.session() as db:
            result = pull_calendar_changes(db, self.settings)
            db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(result["created"], 1)
        with self.session() as db:
            booking = db.scalar(select(Booking).where(Booking.google_event_id == "g-scramble-2"))
            self.assertIsNotNone(booking)
            assert booking is not None
            # Услуги из каталога нет — берётся заголовок события.
            self.assertEqual(booking.service, "мойка экспресс")
            client = db.get(Client, booking.client_id)
            self.assertIsNotNone(client)
            assert client is not None
            self.assertEqual(client.phone, "79001234567")
            self.assertEqual(client.car, "BMW X5")
            self.assertEqual(client.plate, "а777вс177")

    def test_pull_keeps_strict_format_priority(self) -> None:
        """«Ключ: значение» имеет приоритет над свободным распознаванием."""
        from app.google_calendar import pull_calendar_changes
        from app.models import Booking, Client

        self._save_tokens()
        pages = [
            {
                "items": [
                    _event(
                        "g-strict-1",
                        summary="Мойка",
                        description=(
                            "Клиент: Пётр\nТелефон: +7 (999) 555-44-33\n"
                            "Авто: Audi\nНомер: в123вс77\nКомментарий: приеду к 10:00"
                        ),
                    )
                ],
                "nextSyncToken": "tok-st",
            }
        ]
        with self._patch_calendar_request(pages), self.session() as db:
            result = pull_calendar_changes(db, self.settings)
            db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(result["created"], 1)
        with self.session() as db:
            booking = db.scalar(select(Booking).where(Booking.google_event_id == "g-strict-1"))
            self.assertIsNotNone(booking)
            assert booking is not None
            self.assertEqual(booking.service, "Мойка")
            client = db.get(Client, booking.client_id)
            self.assertIsNotNone(client)
            assert client is not None
            self.assertEqual(client.name, "Пётр")
            self.assertEqual(client.phone, "79995554433")
            self.assertEqual(client.car, "Audi")
            self.assertEqual(client.plate, "в123вс77")

    def test_sync_creates_event_for_admin_review_booking(self) -> None:
        """Заявка клиента (admin_review) сразу синхронизируется в календарь."""
        from unittest.mock import patch as _patch

        from app.google_calendar import sync_booking_to_calendar
        from app.models import Booking, Client

        self._save_tokens()
        with self.session() as db:
            client = Client(id="c-sync-adm", name="Иван", phone="79001234567")
            db.add(client)
            booking = Booking(
                id="b-sync-adm",
                client_id=client.id,
                client_name="Иван",
                client_phone="+7 (900) 123-45-67",
                service="Мойка",
                service_id="s-wash",
                date="15.08.2026",
                time="10:30",
                duration=45,
                price=500,
                status="admin_review",
                box="Бокс 1",
                payment_type="cash",
                source="bot",
            )
            db.add(booking)
            db.commit()

            with _patch(
                "app.google_calendar._calendar_request",
                return_value={"id": "evt-adm-1"},
            ):
                event_id, ok = sync_booking_to_calendar(db, self.settings, booking)
            db.commit()

            self.assertTrue(ok)
            self.assertEqual(event_id, "evt-adm-1")
            self.assertEqual(booking.google_event_id, "evt-adm-1")

    def test_sync_skips_deleted_status(self) -> None:
        """Отменённая запись не создаёт событие в календаре."""
        from unittest.mock import patch as _patch

        from app.google_calendar import sync_booking_to_calendar
        from app.models import Booking, Client

        self._save_tokens()
        with self.session() as db:
            client = Client(id="c-sync-del", name="Пётр", phone="79995554433")
            db.add(client)
            booking = Booking(
                id="b-sync-del",
                client_id=client.id,
                client_name="Пётр",
                client_phone="+7 (999) 555-44-33",
                service="Мойка",
                service_id="s-wash",
                date="15.08.2026",
                time="11:00",
                duration=30,
                price=500,
                status="cancelled",
                box="Бокс 1",
                payment_type="cash",
                source="bot",
            )
            db.add(booking)
            db.commit()

            with _patch("app.google_calendar._calendar_request") as mock_req:
                event_id, ok = sync_booking_to_calendar(db, self.settings, booking)
            db.commit()

            self.assertTrue(ok)
            self.assertIsNone(event_id)
            self.assertIsNone(booking.google_event_id)
            mock_req.assert_not_called()

    def test_pull_parses_free_form_booking(self) -> None:
        """«миша ремонт скола мерседес 79872136194» разкладывается по полям."""
        from app.google_calendar import pull_calendar_changes
        from app.models import Booking, Client, Service

        with self.session() as db:
            db.add(
                Service(
                    id="s-skol",
                    name="Ремонт скола лобового стекла (от 1000 рублей)",
                    category="Стекло",
                    price=1000,
                    duration=60,
                    active=True,
                )
            )
            db.commit()

        self._save_tokens()
        pages = [
            {
                "items": [
                    _event(
                        "g-free-1",
                        summary="миша ремонт скола мерседес 79872136194",
                        description=None,
                    )
                ],
                "nextSyncToken": "tok-free",
            }
        ]
        with self._patch_calendar_request(pages), self.session() as db:
            result = pull_calendar_changes(db, self.settings)
            db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(result["created"], 1)
        with self.session() as db:
            booking = db.scalar(select(Booking).where(Booking.google_event_id == "g-free-1"))
            self.assertIsNotNone(booking)
            assert booking is not None
            self.assertEqual(booking.service, "Ремонт скола лобового стекла (от 1000 рублей)")
            client = db.get(Client, booking.client_id)
            self.assertIsNotNone(client)
            assert client is not None
            self.assertEqual(client.name, "Миша")
            self.assertEqual(client.phone, "79872136194")
            self.assertEqual(client.car, "Мерседес")

    def test_pull_falls_back_to_free_text_slice_for_service(self) -> None:
        """Без совпадения в каталоге услугой становится остаток текста."""
        from app.google_calendar import pull_calendar_changes
        from app.models import Booking, Client

        self._save_tokens()
        pages = [
            {
                "items": [
                    _event(
                        "g-free-2",
                        summary="маша полировка капота мерседес 89005551122",
                        description=None,
                    )
                ],
                "nextSyncToken": "tok-free2",
            }
        ]
        with self._patch_calendar_request(pages), self.session() as db:
            result = pull_calendar_changes(db, self.settings)
            db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(result["created"], 1)
        with self.session() as db:
            booking = db.scalar(select(Booking).where(Booking.google_event_id == "g-free-2"))
            self.assertIsNotNone(booking)
            assert booking is not None
            self.assertEqual(booking.service, "полировка капота")
            client = db.get(Client, booking.client_id)
            self.assertIsNotNone(client)
            assert client is not None
            self.assertEqual(client.name, "Маша")
            self.assertEqual(client.phone, "79005551122")
            self.assertEqual(client.car, "Мерседес")

    def test_pull_does_not_duplicate_existing_booking(self) -> None:
        """Запись из бота и то же событие из Google не дают дубля."""
        from app.google_calendar import pull_calendar_changes
        from app.models import Booking, Client

        with self.session() as db:
            client = Client(id="c-dup", name="Иван", phone="79001234567")
            db.add(client)
            db.add(
                Booking(
                    id="b-bot-dup",
                    client_id=client.id,
                    client_name="Иван",
                    client_phone="79001234567",
                    service="Мойка",
                    service_id="s-wash",
                    date="13.08.2026",
                    time="10:30",
                    duration=45,
                    price=500,
                    status="admin_review",
                    box="Бокс 1",
                    payment_type="cash",
                    source="bot",
                )
            )
            db.commit()

        self._save_tokens()
        pages = [
            {
                "items": [
                    _event("g-dup", description="Иван +7 (900) 123-45-67 мойка")
                ],
                "nextSyncToken": "tok-dup",
            }
        ]
        with self._patch_calendar_request(pages), self.session() as db:
            result = pull_calendar_changes(db, self.settings)
            db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(result["created"], 0)
        self.assertEqual(result["duplicates"], 1)
        with self.session() as db:
            bots = db.scalar(select(Booking).where(Booking.id == "b-bot-dup"))
            self.assertIsNotNone(bots)
            # Новой записи от события не создано — исходная единственная.
            self.assertIsNone(db.scalar(select(Booking).where(Booking.google_event_id == "g-dup")))

    def test_pull_links_booking_to_existing_client(self) -> None:
        """Запись из Google падает в карточку уже известного клиента."""
        from app.google_calendar import pull_calendar_changes
        from app.models import Booking, Client

        with self.session() as db:
            db.add(Client(id="c-petr", name="Пётр", phone="79001234567"))
            db.commit()

        self._save_tokens()
        pages = [
            {
                "items": [
                    _event(
                        "g-link",
                        start="2026-08-15T10:30:00+03:00",
                        end="2026-08-15T11:00:00+03:00",
                        description="Пётр 79001234567 полировка",
                    )
                ],
                "nextSyncToken": "tok-link",
            }
        ]
        with self._patch_calendar_request(pages), self.session() as db:
            result = pull_calendar_changes(db, self.settings)
            db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(result["created"], 1)
        with self.session() as db:
            client = db.get(Client, "c-petr")
            self.assertIsNotNone(client)
            booking = db.scalar(select(Booking).where(Booking.google_event_id == "g-link"))
            self.assertIsNotNone(booking)
            assert client is not None and booking is not None
            self.assertEqual(booking.client_id, client.id)
            # Клиентов не плодим — ровно один.
            count = len(db.scalars(select(Client)).all())
            self.assertEqual(count, 1)

    def test_pull_parses_rare_name_before_phone(self) -> None:
        """Имя, которого нет в словаре, определяется по соседству с телефоном.

        «Гарик» не входит в _COMMON_NAMES — эвристика «рядом с телефоном»
        должна отдать его в поле имени независимо от расположения в тексте.
        """
        from app.google_calendar import pull_calendar_changes
        from app.models import Booking, Client

        self._save_tokens()
        pages = [
            {
                "items": [
                    _event(
                        "g-rare-1",
                        start="2026-08-15T12:00:00+03:00",
                        end="2026-08-15T12:30:00+03:00",
                        summary="мойка",
                        description="Гарик 79001234567 мерседес",
                    )
                ],
                "nextSyncToken": "tok-rare1",
            }
        ]
        with self._patch_calendar_request(pages), self.session() as db:
            result = pull_calendar_changes(db, self.settings)
            db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(result["created"], 1)
        with self.session() as db:
            booking = db.scalar(select(Booking).where(Booking.google_event_id == "g-rare-1"))
            self.assertIsNotNone(booking)
            assert booking is not None
            client = db.get(Client, booking.client_id)
            self.assertIsNotNone(client)
            assert client is not None
            self.assertEqual(client.name, "Гарик")
            self.assertEqual(client.phone, "79001234567")
            self.assertEqual(client.car, "Мерседес")

    def test_pull_parses_rare_name_after_phone(self) -> None:
        """Имя после телефона в конце текста тоже определяется."""
        from app.google_calendar import pull_calendar_changes
        from app.models import Booking, Client

        self._save_tokens()
        pages = [
            {
                "items": [
                    _event(
                        "g-rare-2",
                        start="2026-08-15T13:00:00+03:00",
                        end="2026-08-15T13:30:00+03:00",
                        summary="мойка",
                        description="89005551122 Рустам экспресс мойка",
                    )
                ],
                "nextSyncToken": "tok-rare2",
            }
        ]
        with self._patch_calendar_request(pages), self.session() as db:
            result = pull_calendar_changes(db, self.settings)
            db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(result["created"], 1)
        with self.session() as db:
            booking = db.scalar(select(Booking).where(Booking.google_event_id == "g-rare-2"))
            self.assertIsNotNone(booking)
            assert booking is not None
            client = db.get(Client, booking.client_id)
            self.assertIsNotNone(client)
            assert client is not None
            self.assertEqual(client.name, "Рустам")
            self.assertEqual(client.phone, "79005551122")

    def test_pull_does_not_steal_service_word_as_name(self) -> None:
        """Служебное слово рядом с телефоном не выдаётся за имя клиента."""
        from app.google_calendar import pull_calendar_changes
        from app.models import Booking, Client

        self._save_tokens()
        pages = [
            {
                "items": [
                    _event(
                        "g-noname",
                        start="2026-08-15T14:00:00+03:00",
                        end="2026-08-15T14:30:00+03:00",
                        summary="запись",
                        description="мойка 79001234567 мерседес",
                    )
                ],
                "nextSyncToken": "tok-noname",
            }
        ]
        with self._patch_calendar_request(pages), self.session() as db:
            result = pull_calendar_changes(db, self.settings)
            db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(result["created"], 1)
        with self.session() as db:
            booking = db.scalar(select(Booking).where(Booking.google_event_id == "g-noname"))
            self.assertIsNotNone(booking)
            assert booking is not None
            client = db.get(Client, booking.client_id)
            self.assertIsNotNone(client)
            assert client is not None
            # «мойка» — не имя: клиент остался с заглушкой, а не «Мойка».
            self.assertNotEqual(client.name, "Мойка")
            self.assertEqual(client.phone, "79001234567")


    def test_pull_transfers_google_edits_to_booking(self) -> None:
        """Правки в Google (заголовок, клиент, бокс, комментарий) переносятся в CRM.

        Владелец отредактировал событие в Google: event.updated новее последней
        записи в Google — переносим услугу/клиента/бокс/комментарий/время.
        """
        from app.google_calendar import pull_calendar_changes
        from app.models import Booking, Client

        with self.session() as db:
            client = Client(id="c-edit", name="Иван", phone="79990001122", registered=True)
            db.add(client)
            db.add(
                Booking(
                    id="b-edit",
                    client_id=client.id,
                    client_name="Иван",
                    client_phone="79990001122",
                    service="Мойка",
                    service_id="",
                    date="15.08.2026",
                    time="10:30",
                    duration=30,
                    price=500,
                    status="scheduled",
                    box="Бокс 1",
                    payment_type="cash",
                    source="bot",
                    google_event_id="g-edit",
                    google_updated_at=datetime(2026, 8, 14, 10, 0, tzinfo=timezone.utc),
                )
            )
            db.commit()

        self._save_tokens()
        pages = [
            {
                "items": [
                    _event(
                        "g-edit",
                        start="2026-08-15T12:00:00+03:00",
                        end="2026-08-15T12:30:00+03:00",
                        summary="Химчистка салона",
                        description=(
                            "Клиент: Пётр\nТелефон: +7 (999) 555-44-33\n"
                            "Бокс: Бокс 2\nКомментарий: срочно к 12:00"
                        ),
                        crm_booking_id="b-edit",
                        updated="2026-08-15T08:00:00Z",
                    )
                ],
                "nextSyncToken": "tok-edit",
            }
        ]
        with self._patch_calendar_request(pages), self.session() as db:
            result = pull_calendar_changes(db, self.settings)
            db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(result["updated"], 1)
        with self.session() as db:
            booking = db.get(Booking, "b-edit")
            assert booking is not None
            self.assertEqual(booking.service, "Химчистка салона")
            self.assertEqual(booking.client_name, "Пётр")
            self.assertEqual(booking.client_phone, "79995554433")
            self.assertEqual(booking.box, "Бокс 2")
            self.assertEqual(booking.notes, "срочно к 12:00")
            self.assertEqual(booking.date, "15.08.2026")
            self.assertEqual(booking.time, "12:00")
            client = db.get(Client, "c-edit")
            assert client is not None
            # Правка в Google видна и в карточке клиента.
            self.assertEqual(client.name, "Пётр")

    def test_pull_does_not_overwrite_newer_crm_edit(self) -> None:
        """Событие не правилось после последней записи в Google — правки CRM не затираются.

        Если запись недавно правилась в CRM (google_updated_at свежее event.updated),
        обратная синхронизация не должна возвращать старые данные из Google.
        """
        from app.google_calendar import pull_calendar_changes
        from app.models import Booking, Client

        with self.session() as db:
            client = Client(id="c-edit2", name="Пётр", phone="79995554433", registered=True)
            db.add(client)
            db.add(
                Booking(
                    id="b-edit2",
                    client_id=client.id,
                    client_name="Пётр",
                    client_phone="79995554433",
                    service="Химчистка салона",
                    service_id="",
                    date="15.08.2026",
                    time="12:00",
                    duration=30,
                    price=500,
                    status="scheduled",
                    box="Бокс 2",
                    payment_type="cash",
                    source="bot",
                    google_event_id="g-edit2",
                    # Владелец правил запись в CRM ПОСЛЕ правки события в Google.
                    google_updated_at=datetime(2026, 8, 15, 9, 0, tzinfo=timezone.utc),
                )
            )
            db.commit()

        self._save_tokens()
        pages = [
            {
                "items": [
                    _event(
                        "g-edit2",
                        start="2026-08-15T12:00:00+03:00",
                        end="2026-08-15T12:30:00+03:00",
                        summary="Мойка",  # старая услуга из Google
                        description="Клиент: Пётр\nТелефон: +7 (999) 555-44-33",
                        crm_booking_id="b-edit2",
                        updated="2026-08-15T07:00:00Z",  # старее google_updated_at
                    )
                ],
                "nextSyncToken": "tok-edit2",
            }
        ]
        with self._patch_calendar_request(pages), self.session() as db:
            result = pull_calendar_changes(db, self.settings)
            db.commit()

        self.assertTrue(result["ok"])
        self.assertEqual(result["updated"], 1)  # событие обработано
        with self.session() as db:
            booking = db.get(Booking, "b-edit2")
            assert booking is not None
            # Правка CRM (Химчистка салона, 12:00) сохранена, старые данные из Google не вернулись.
            self.assertEqual(booking.service, "Химчистка салона")
            self.assertEqual(booking.time, "12:00")
            self.assertEqual(booking.box, "Бокс 2")


if __name__ == "__main__":
    unittest.main()
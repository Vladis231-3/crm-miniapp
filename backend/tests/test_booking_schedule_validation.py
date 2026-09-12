"""Регрессия сообщений валидации рабочего дня при переносе записи.

Раньше при переносе записи на 12:00 (при графике 09:00-19:00) ошибка
говорила только «Запись доступна только в часы работы: 09:00-19:00»,
не объясняя, что проверка учитывает конец слота (начало + длительность)
или время начала 00:00 у записей без фиксированного времени.
"""
from __future__ import annotations

import os
import unittest
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


class BookingScheduleValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        data_dir = Path(__file__).resolve().parents[1] / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = data_dir / f"test_schedule_{uuid4().hex}.sqlite3"
        os.environ["DATABASE_URL"] = f"sqlite:///{self.db_path.as_posix()}"
        os.environ["APP_ENV"] = "development"
        os.environ["APP_SECRET"] = "test-secret"
        os.environ["ALLOW_DEMO_SEED_DATA"] = "true"
        os.environ["RUN_EMBEDDED_BOT"] = "false"
        os.environ["ALLOW_INSECURE_CLIENT_AUTH"] = "true"
        os.environ["TELEGRAM_BOT_TOKEN"] = "123456:test-bot-token"
        os.environ["TELEGRAM_DELIVERY_MODE"] = "polling"
        os.environ["SYNC_TELEGRAM_WEBHOOK"] = "false"

        from app.main import _ensure_booking_within_schedule
        from app.models import Base, ScheduleEntry

        self.ensure_within_schedule = _ensure_booking_within_schedule
        self.schedule_entry_cls = ScheduleEntry

        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.session = sessionmaker(bind=self.engine)()

    def tearDown(self) -> None:
        self.session.close()
        self.engine.dispose()
        if self.db_path.exists():
            self.db_path.unlink()

    def _add_day(self, day_index: int, *, open_time: str, close_time: str, active: bool = True) -> None:
        self.session.add(
            self.schedule_entry_cls(
                day_index=day_index,
                day_label="Тест",
                active=active,
                open_time=open_time,
                close_time=close_time,
            )
        )
        self.session.commit()

    def test_slot_inside_working_hours_passes(self) -> None:
        self._add_day(0, open_time="09:00", close_time="19:00")
        # 12.09.2026 — суббота (day_index=0): 12:00 + 60 мин = 13:00 < 19:00
        self.ensure_within_schedule(self.session, "12.09.2026", "12:00", 60)

    def test_end_after_close_mentions_computed_end(self) -> None:
        self._add_day(0, open_time="09:00", close_time="19:00")
        with self.assertRaises(HTTPException) as ctx:
            self.ensure_within_schedule(self.session, "12.09.2026", "12:00", 480)
        self.assertEqual(ctx.exception.status_code, 400)
        detail = ctx.exception.detail
        self.assertIn("12:00", detail)
        self.assertIn("заканчивается в 20:00", detail)
        self.assertIn("480", detail)
        self.assertIn("закрытия 19:00", detail)

    def test_start_before_open_mentions_early_start(self) -> None:
        self._add_day(0, open_time="09:00", close_time="19:00")
        # Запись без времени (00:00): начало раньше открытия
        with self.assertRaises(HTTPException) as ctx:
            self.ensure_within_schedule(self.session, "12.09.2026", "00:00", 60)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("раньше открытия 09:00", ctx.exception.detail)

    def test_missing_day_row_reports_unavailable_day(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            self.ensure_within_schedule(self.session, "13.09.2026", "12:00", 60)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("В этот день запись недоступна", ctx.exception.detail)

    def test_end_crossing_midnight_labels_next_day(self) -> None:
        self._add_day(0, open_time="09:00", close_time="23:00")
        # 22:00 + 180 мин = 25:00 -> «01:00 (+1 дн.)»
        with self.assertRaises(HTTPException) as ctx:
            self.ensure_within_schedule(self.session, "12.09.2026", "22:00", 180)
        self.assertIn("заканчивается в 01:00 (+1 дн.)", ctx.exception.detail)


if __name__ == "__main__":
    unittest.main()

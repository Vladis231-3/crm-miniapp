"""Тесты миграции payroll_entry_dates: перенос entry_date на день проведения."""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

# ВАЖНО: до импорта app.* привязываем конфиг к временной БД,
# чтобы импорт app.database не создал соединение с реальным crm.sqlite3.
_TMP_DB = (
    Path(__file__).resolve().parents[1]
    / "data"
    / f"test_payroll_dates_{uuid.uuid4().hex}.sqlite3"
)
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB.as_posix()}"

from app.database import Base
from app.models import Expense, Income, PayrollEntry
from migrations.payroll_entry_dates import plan, upgrade


def _local_noon_utc(year: int, month: int, day: int) -> datetime:
    """Полдень указанного дня по локальному времени, в UTC.

    Полдень гарантирует, что локальная дата проведения не сместится
    ни при каком часовом поясе машины (|offset| <= 12).
    """
    local_tz = datetime.now().astimezone().tzinfo or timezone.utc
    return datetime(year, month, day, 12, 0, tzinfo=local_tz).astimezone(timezone.utc)


def _entry(
    entry_id: str,
    kind: str,
    created_at: datetime,
    entry_date: str | None,
    *,
    expense_id: str | None = None,
    income_id: str | None = None,
) -> PayrollEntry:
    return PayrollEntry(
        id=entry_id,
        worker_id="w1",
        actor_id="w1",
        actor_role="owner",
        kind=kind,
        amount=Decimal(100),
        note=f"тест {entry_id}",
        entry_date=entry_date,
        created_at=created_at,
        expense_id=expense_id,
        income_id=income_id,
    )


def _populate(engine) -> None:
    """Фикстуры: 2026-08-31 = понедельник, 04.09.2026 = пятница,
    14.08.2026 = пятница, 31.08.2026 = конец месяца."""
    with Session(engine) as db:
        # 1) Выплата за месяц, проведена 20.08 → падала на 31.08. Зеркало-расход.
        db.add(_entry("e-month-payout", "payout", _local_noon_utc(2026, 8, 20), "31.08.2026", expense_id="exp-1"))
        db.add(Expense(id="exp-1", title="Зарплата: w1", amount=Decimal(100), category="Зарплата", date="31.08.2026"))
        # 2) Премия за неделю, проведена в понедельник 31.08 → падала на пятницу 04.09.
        db.add(_entry("e-week-bonus", "bonus", _local_noon_utc(2026, 8, 31), "04.09.2026"))
        # 3) Проведена тем же днём, каким записана — не трогаем.
        db.add(_entry("e-same-day", "bonus", _local_noon_utc(2026, 8, 15), "15.08.2026"))
        # 4) Custom-период в прошлом (08.08–14.08), проведена 31.08 — не трогаем.
        db.add(_entry("e-custom-past", "deduction", _local_noon_utc(2026, 8, 31), "14.08.2026", income_id="inc-custom"))
        db.add(Income(id="inc-custom", amount=Decimal(100), source="Штраф", date="14.08.2026", created_by_id="w1"))
        # 5) Custom, проведена ВНУТРИ диапазона 08.08–14.08 (10.08) → перенос безопасен.
        db.add(_entry("e-custom-inside", "adjustment", _local_noon_utc(2026, 8, 10), "14.08.2026"))
        # 6) Проведена ПОСЛЕ конца месяца (05.09) — вне периода, не трогаем.
        db.add(_entry("e-month-past", "payout", _local_noon_utc(2026, 9, 5), "31.08.2026"))
        # 7) Зеркало-расход правили руками (дата не равна entry_date) — не трогаем.
        db.add(_entry("e-edited-mirror", "payout", _local_noon_utc(2026, 8, 20), "31.08.2026", expense_id="exp-2"))
        db.add(Expense(id="exp-2", title="Зарплата: w1", amount=Decimal(100), category="Зарплата", date="01.09.2026"))
        # 8) Штраф за неделю, проведён в воскресенье 30.08 → падал на пятницу 04.09. Зеркало-доход.
        db.add(_entry("e-week-deduction", "deduction", _local_noon_utc(2026, 8, 30), "04.09.2026", income_id="inc-1"))
        db.add(Income(id="inc-1", amount=Decimal(100), source="Штраф", date="04.09.2026", created_by_id="w1"))
        # 9) Legacy без entry_date — миграция вообще не смотрит.
        db.add(_entry("e-legacy", "advance", _local_noon_utc(2026, 8, 20), None))
        db.commit()


@pytest.fixture
def migration_engine():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    try:
        yield engine
    finally:
        engine.dispose()


def _get_entry(engine, entry_id: str) -> PayrollEntry:
    with Session(engine) as db:
        return db.scalar(select(PayrollEntry).where(PayrollEntry.id == entry_id))


def _get_expense(engine, expense_id: str) -> Expense:
    with Session(engine) as db:
        return db.get(Expense, expense_id)


def _get_income(engine, income_id: str) -> Income:
    with Session(engine) as db:
        return db.get(Income, income_id)


def test_dry_run_reports_plan_without_changes(migration_engine) -> None:
    _populate(migration_engine)

    report, moves, mirror_moves = plan(migration_engine)

    move_ids = {entry_id for entry_id, _new in moves}
    assert move_ids == {
        "e-month-payout",
        "e-week-bonus",
        "e-custom-inside",
        "e-edited-mirror",
        "e-week-deduction",
    }
    assert {table for table, _mid, _new in mirror_moves} == {"expenses", "incomes"}
    joined = "\n".join(report)
    assert "skip: e-custom-past" in joined
    assert "skip: e-month-past" in joined
    assert "mirror-skip: expenses exp-2" in joined
    assert "e-legacy" not in joined  # без entry_date — вне зоны миграции

    # dry-run ничего не меняет
    assert _get_entry(migration_engine, "e-month-payout").entry_date == "31.08.2026"
    assert _get_expense(migration_engine, "exp-1").date == "31.08.2026"


def test_apply_migrates_legacy_dates_and_mirrors(migration_engine) -> None:
    _populate(migration_engine)

    report = upgrade(dry_run=False, engine=migration_engine)

    assert report[0].startswith("APPLY")
    # Выплата за месяц: 31.08 → день проведения 20.08
    assert _get_entry(migration_engine, "e-month-payout").entry_date == "20.08.2026"
    assert _get_expense(migration_engine, "exp-1").date == "20.08.2026"
    # Премия за неделю: пятница 04.09 → понедельник 31.08
    assert _get_entry(migration_engine, "e-week-bonus").entry_date == "31.08.2026"
    # Проведена тем же днём — не изменилась
    assert _get_entry(migration_engine, "e-same-day").entry_date == "15.08.2026"
    # Custom-период в прошлом — не изменился
    assert _get_entry(migration_engine, "e-custom-past").entry_date == "14.08.2026"
    assert _get_income(migration_engine, "inc-custom").date == "14.08.2026"
    # Custom, проведённый внутри диапазона — перенесён на день проведения
    assert _get_entry(migration_engine, "e-custom-inside").entry_date == "10.08.2026"
    # Проведена после конца месяца — не изменилась
    assert _get_entry(migration_engine, "e-month-past").entry_date == "31.08.2026"
    # Зеркало правили руками — запись перенесена, зеркало нет
    assert _get_entry(migration_engine, "e-edited-mirror").entry_date == "20.08.2026"
    assert _get_expense(migration_engine, "exp-2").date == "01.09.2026"
    # Штраф за неделю + зеркало-доход
    assert _get_entry(migration_engine, "e-week-deduction").entry_date == "30.08.2026"
    assert _get_income(migration_engine, "inc-1").date == "30.08.2026"


def test_apply_is_idempotent(migration_engine) -> None:
    _populate(migration_engine)

    first = upgrade(dry_run=False, engine=migration_engine)
    second = upgrade(dry_run=False, engine=migration_engine)

    assert first[0].startswith("APPLY")
    assert second[0] == "APPLY: нечего менять"
    # Состояние не изменилось повторным запуском
    assert _get_entry(migration_engine, "e-week-bonus").entry_date == "31.08.2026"
    assert _get_income(migration_engine, "inc-1").date == "30.08.2026"

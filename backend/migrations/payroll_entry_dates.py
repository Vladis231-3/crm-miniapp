"""Перенос дат зарплатных операций на реальный день проведения.

Контекст: до фикса 31.08.2026 операции ЗП (выплата/премия/аванс/штраф/списание),
проведённые с периодом day/week/month, получали entry_date = КОНЕЦ выбранного
периода (пятница недели / последний день месяца). Все витрины показывают дату
операции по entry_date, поэтому выплата, проведённая, например, 20-го числа,
отображалась 31-го («не тем днём»).

После фикса такие операции падают днём проведения. Эта миграция переносит
исторические записи на реальный день проведения (локальная дата created_at).

Правила (безопасность балансов важнее косметики):
  1. entry_date == день проведения          — не трогаем (уже корректно);
  2. день проведения ПОЗЖЕ entry_date        — не трогаем (custom-период
     в прошлом или явно заданная дата: перенос сломал бы привязку к периоду);
  3. день проведения РАНЬШЕ entry_date и лежит внутри месяца/недели
     (Сб..Пт), заканчивающихся старым entry_date — переносим на день
     проведения (запись остаётся внутри того же периода, баланс не меняется);
  4. иначе (custom-диапазон, день проведения вне стандартного периода) —
     не трогаем.
Зеркала бюджета (Expense/Income) синхронизируются ТОЛЬКО если их дата в точности
равнялась старой entry_date (иначе зеркало правили руками — не трогаем).

Миграция идемпотентна: после применения повторный запуск не меняет ничего.

Usage:
  python -m backend.migrations.payroll_entry_dates            # dry-run
  python -m backend.migrations.payroll_entry_dates --apply    # применить
"""
from __future__ import annotations

import argparse
import calendar
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import Engine, select
from sqlalchemy.orm import Session, sessionmaker


def _default_engine() -> Engine:
    """Загружает конфигурацию приложения только при запуске миграции."""
    try:
        from backend.app.database import engine
    except ModuleNotFoundError:  # Запуск из каталога backend.
        from app.database import engine
    return engine


def _models():
    try:
        from backend.app import models
    except ModuleNotFoundError:  # Запуск из каталога backend.
        from app import models
    return models


def _local_tz():
    return datetime.now().astimezone().tzinfo or timezone.utc


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _parse_entry_date(value: str) -> date | None:
    try:
        return date(day=int(value[0:2]), month=int(value[3:5]), year=int(value[6:10]))
    except (TypeError, ValueError, IndexError):
        return None


def _fmt(value: date) -> str:
    return value.strftime("%d.%m.%Y")


def _is_month_end(value: date) -> bool:
    return value.day == calendar.monthrange(value.year, value.month)[1]


def _week_like(value: date) -> bool:
    """Старый период week падал на пятницу недели Сб..Пт."""
    return value.weekday() == 4


def _conduction_day(created_at: datetime | None) -> date | None:
    if created_at is None:
        return None
    return _as_utc(created_at).astimezone(_local_tz()).date()


def _rewrite_candidate(entry_date: date, conduction: date) -> bool:
    """Правило 3: день проведения внутри месяца/недели, заканчивающихся entry_date."""
    if _is_month_end(entry_date):
        return (
            conduction.year == entry_date.year
            and conduction.month == entry_date.month
            and conduction < entry_date
        )
    if _week_like(entry_date):
        return entry_date - timedelta(days=6) <= conduction < entry_date
    return False


def plan(engine: Engine) -> tuple[
    list[str],
    list[tuple[str, str]],
    list[tuple[str, str, str]],
]:
    """Возвращает (отчёт, переносы [(entry_id, new_date)], зеркала [(table, id, new_date)]).

    Читает БД, ничего не изменяет.
    """
    models = _models()
    moves: list[tuple[str, str]] = []
    mirror_moves: list[tuple[str, str, str]] = []
    report: list[str] = []

    with Session(engine) as db:
        entries = db.scalars(
            select(models.PayrollEntry).where(models.PayrollEntry.entry_date.is_not(None))
        ).all()
        for entry in entries:
            entry_date = _parse_entry_date(entry.entry_date or "")
            if entry_date is None:
                report.append(
                    f"skip: {entry.id} entry_date={entry.entry_date!r} не распознана"
                )
                continue
            conduction = _conduction_day(entry.created_at)
            if conduction is None:
                report.append(f"skip: {entry.id} нет created_at")
                continue
            if conduction == entry_date:
                continue  # уже день проведения — норма
            if conduction > entry_date:
                report.append(
                    f"skip: {entry.id} kind={entry.kind} entry_date={_fmt(entry_date)} "
                    f"проведено {_fmt(conduction)} (custom/явная дата — не трогаем)"
                )
                continue
            if not _rewrite_candidate(entry_date, conduction):
                report.append(
                    f"skip: {entry.id} kind={entry.kind} entry_date={_fmt(entry_date)} "
                    f"проведено {_fmt(conduction)} (вне стандартного периода — не трогаем)"
                )
                continue
            new_date = _fmt(conduction)
            moves.append((entry.id, new_date))
            report.append(
                f"migrate: {entry.id} kind={entry.kind} "
                f"{entry.entry_date} -> {new_date} (проведено {_fmt(conduction)})"
            )
            for mirror_attr, mirror_model in (("expense_id", models.Expense), ("income_id", models.Income)):
                mirror_id = getattr(entry, mirror_attr)
                if not mirror_id:
                    continue
                mirror = db.get(mirror_model, mirror_id)
                if mirror is None:
                    continue
                if mirror.date == entry.entry_date:
                    mirror_moves.append((mirror_model.__tablename__, mirror.id, new_date))
                    report.append(
                        f"mirror: {mirror_model.__tablename__} {mirror.id} "
                        f"{mirror.date} -> {new_date}"
                    )
                else:
                    report.append(
                        f"mirror-skip: {mirror_model.__tablename__} {mirror.id} "
                        f"date={mirror.date!r} != старой entry_date — правили руками, не трогаем"
                    )

        summary = (
            f"итого: записей с entry_date={len(entries)}, переносов={len(moves)}, "
            f"зеркал={len(mirror_moves)}"
        )
        report.append(summary)
    return report, moves, mirror_moves


def upgrade(*, dry_run: bool = True, engine: Engine | None = None) -> list[str]:
    target = engine or _default_engine()
    models = _models()
    report, moves, mirror_moves = plan(target)

    if dry_run:
        report.insert(0, "DRY-RUN: изменения не применены")
        return report
    if not moves and not mirror_moves:
        report.insert(0, "APPLY: нечего менять")
        return report

    model_by_table = {
        models.Expense.__tablename__: models.Expense,
        models.Income.__tablename__: models.Income,
    }
    factory = sessionmaker(bind=target, class_=Session, expire_on_commit=False)
    with factory() as db:
        for entry_id, new_date in moves:
            db_entry = db.get(models.PayrollEntry, entry_id)
            if db_entry is not None:
                db_entry.entry_date = new_date
        for table, mirror_id, new_date in mirror_moves:
            db_mirror = db.get(model_by_table[table], mirror_id)
            if db_mirror is not None:
                db_mirror.date = new_date
        db.commit()

    report.insert(0, f"APPLY: переносов={len(moves)}, зеркал={len(mirror_moves)}")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Перенос entry_date зарплатных операций на день проведения"
    )
    parser.add_argument("--apply", action="store_true", help="применить изменения (по умолчанию dry-run)")
    parser.add_argument("--dry-run", action="store_true", help="только показать план (по умолчанию)")
    args = parser.parse_args()
    for line in upgrade(dry_run=not args.apply):
        print(line)

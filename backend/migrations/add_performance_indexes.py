"""
Индексы производительности Волны 3 (AUDIT-16: у bookings было ноль индексов).

Идемпотентно, SQLite и PostgreSQL (plain CREATE INDEX IF NOT EXISTS —
короткая блокировка, приемлемо для масштаба; CONCURRENTLY сознательно
не используется: запрещён в транзакции, а выигрыш на этом объёме нулевой).

Зеркалит __table_args__ из backend/app/models.py — при расхождении чинить
оба места.

Usage: python -m backend.migrations.add_performance_indexes
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.migrations._common import table_exists  # noqa: E402
from backend.app.database import engine  # noqa: E402

INDEXES: list[tuple[str, str, list[str]]] = [
    ("ix_clients_phone", "clients", ["phone"]),
    ("ix_staff_users_telegram_chat_id", "staff_users", ["telegram_chat_id"]),
    ("ix_bookings_status_deleted", "bookings", ["status", "deleted_at"]),
    ("ix_bookings_date", "bookings", ["date"]),
    ("ix_bookings_client_id", "bookings", ["client_id"]),
    ("ix_bookings_box_date_time", "bookings", ["box", "date", "time"]),
    ("ix_booking_workers_booking_id", "booking_workers", ["booking_id"]),
    ("ix_booking_workers_worker_id", "booking_workers", ["worker_id"]),
    ("ix_bas_booking_id", "booking_additional_services", ["booking_id"]),
    ("ix_booking_materials_booking_id", "booking_materials", ["booking_id"]),
    ("ix_asvc_workers_service_id", "additional_service_workers", ["additional_service_id"]),
    ("ix_notifications_recipient", "notifications", ["recipient_role", "recipient_id"]),
    ("ix_expenses_date", "expenses", ["date"]),
    ("ix_expenses_booking_id", "expenses", ["booking_id"]),
    ("ix_incomes_date", "incomes", ["date"]),
    ("ix_piggy_booking_id", "piggy_bank_transactions", ["booking_id"]),
    ("ix_piggy_date", "piggy_bank_transactions", ["date"]),
    ("ix_payroll_entries_worker_id", "payroll_entries", ["worker_id"]),
    ("ix_owner_shares_booking_id", "owner_profit_shares", ["booking_id"]),
]

def upgrade() -> list[str]:
    from backend.migrations._common import _quote_ident, columns_of

    report: list[str] = []
    with engine.begin() as connection:
        for name, table, cols in INDEXES:
            if not table_exists(table):
                report.append(f"skip: table {table} does not exist")
                continue
            existing = columns_of(table)
            if any(col not in existing for col in cols):
                report.append(f"skip: {table} missing columns for {name}")
                continue
            quoted_cols = ", ".join(_quote_ident(col) for col in cols)
            connection.exec_driver_sql(
                f"CREATE INDEX IF NOT EXISTS {_quote_ident(name)} "
                f"ON {_quote_ident(table)} ({quoted_cols})"
            )
            report.append(f"ok: {name} on {table}({', '.join(cols)})")
    return report


def check_models_in_sync() -> list[str]:
    """Сверка: все 19 индексов миграции есть в __table_args__ с теми же колонками."""
    from backend.app import models as _models  # noqa: F401

    by_name: dict[str, tuple[str, tuple[str, ...]]] = {}
    for cls in _models.Base.__subclasses__():
        table = getattr(cls, "__table__", None)
        if table is None:
            continue
        for index in table.indexes:
            by_name[index.name] = (
                table.name,
                tuple(col.name for col in index.columns),
            )
    problems: list[str] = []
    for name, table, cols in INDEXES:
        actual = by_name.get(name)
        if actual is None:
            problems.append(f"нет в моделях: {name}")
        elif actual != (table, tuple(cols)):
            problems.append(f"рассинхрон {name}: модели={actual}, миграция=({table}, {cols})")
    return problems


if __name__ == "__main__":
    for line in upgrade():
        print(line)
    drift = check_models_in_sync()
    if drift:
        print("MODEL DRIFT:")
        for line in drift:
            print(f"  {line}")

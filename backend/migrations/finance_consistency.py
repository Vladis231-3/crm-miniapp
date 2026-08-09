"""Idempotent finance schema migration with dry-run and SQLite backup.

Usage:
  python -m backend.migrations.finance_consistency --dry-run
  python -m backend.migrations.finance_consistency --apply
"""
from __future__ import annotations

import argparse
from pathlib import Path

from sqlalchemy import Engine, inspect, text


def _default_engine() -> Engine:
    """Load application configuration only when the migration is executed."""
    try:
        from backend.app.database import engine
    except ModuleNotFoundError:  # Running from the backend directory.
        from app.database import engine
    return engine

MONEY_COLUMNS = {
    "expenses": ("amount",),
    "incomes": ("amount",),
    "payroll_entries": ("amount",),
    "piggy_bank_transactions": ("amount", "material_cost"),
    "owner_profit_shares": ("amount",),
    "stock_items": ("unit_price",),
    "booking_materials": ("unit_price",),
    "stock_write_offs": ("unit_price", "total_cost"),
}


def _sqlite_path(engine: Engine | None = None) -> Path | None:
    target = engine or _default_engine()
    if target.dialect.name != "sqlite":
        return None
    database = target.url.database
    return Path(database).resolve() if database and database != ":memory:" else None


def preflight(engine: Engine | None = None) -> list[str]:
    target = engine or _default_engine()
    inspector = inspect(target)
    report: list[str] = []
    for table, names in MONEY_COLUMNS.items():
        if not inspector.has_table(table):
            continue
        columns = {column["name"]: str(column["type"]) for column in inspector.get_columns(table)}
        for name in names:
            if name in columns:
                report.append(f"{table}.{name}: {columns[name]} -> NUMERIC(18,2)")
    report.append("piggy_bank_transactions.expense_id: nullable FK + unique index")
    return report


def upgrade(*, dry_run: bool = True, engine: Engine | None = None) -> list[str]:
    target = engine or _default_engine()
    report = preflight(target)
    if dry_run:
        return report
    if target.dialect.name == "sqlite":
        raise RuntimeError(
            "Refusing live SQLite migration; run dry-run against a fixture or copy"
        )
    if target.dialect.name != "postgresql":
        raise RuntimeError(f"Unsupported migration dialect: {target.dialect.name}")

    with target.begin() as connection:
        inspector = inspect(connection)
        columns = {
            c["name"] for c in inspector.get_columns("piggy_bank_transactions")
        }
        if "expense_id" not in columns:
            connection.execute(text(
                "ALTER TABLE piggy_bank_transactions "
                "ADD COLUMN expense_id VARCHAR(64)"
            ))
        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS "
            "ux_piggy_bank_transactions_expense_id "
            "ON piggy_bank_transactions (expense_id)"
        ))
        foreign_keys = {
            fk.get("name")
            for fk in inspect(connection).get_foreign_keys(
                "piggy_bank_transactions"
            )
        }
        if "fk_piggy_expense" not in foreign_keys:
            connection.execute(text(
                "ALTER TABLE piggy_bank_transactions "
                "ADD CONSTRAINT fk_piggy_expense "
                "FOREIGN KEY (expense_id) REFERENCES expenses(id) "
                "ON DELETE CASCADE NOT VALID"
            ))
        for table, names in MONEY_COLUMNS.items():
            existing = {
                c["name"] for c in inspect(connection).get_columns(table)
            }
            for name in names:
                if name in existing:
                    connection.execute(text(
                        f'ALTER TABLE {table} ALTER COLUMN {name} '
                        f'TYPE NUMERIC(18,2) USING ROUND({name}::numeric, 2)'
                    ))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    for line in upgrade(dry_run=not args.apply):
        print(line)

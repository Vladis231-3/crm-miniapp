"""Прод-базис перед денежными миграциями (хвост T1.2 / вход Фазы 5).

Строго read-only: только SELECT (плюс служебный SELECT sqlite_master /
information_schema). Ничего не создаёт, не меняет, не требует app-зависимостей —
только sqlalchemy (уже в backend/requirements.txt).

Использование:
    python audit/scripts/prod_baseline.py [--db URL] [--out baseline.json]

    URL по умолчанию: $DATABASE_URL, иначе backend/data/crm.sqlite3.
    Для прод-копии:  python audit/scripts/prod_baseline.py --db "postgresql://..." --out baseline-prod.json
    (пароль лучше передавать через $DATABASE_URL, а не в истории shell).

Что снимает:
- counts по денежным/крупным таблицам;
- SUM(amount) по expenses/piggy/payroll/income (сверка копеек до/после миграции);
- объём uploaded_files (байты) и counts notifications (решение S3/TTL);
- orphans deposit_transactions/deposit_months без клиента (вход FK-миграции);
- schema_hash (sha256 по DDL) + строки schema_migrations/audit_log (если есть).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect as sa_inspect, text

REPO = Path(__file__).resolve().parents[2]
DEFAULT_DB = REPO / "backend" / "data" / "crm.sqlite3"

COUNT_TABLES = [
    "bookings",
    "clients",
    "staff_users",
    "expenses",
    "incomes",
    "payroll_entries",
    "piggy_bank_transactions",
    "deposit_transactions",
    "deposit_months",
    "owner_profit_shares",
    "notifications",
    "uploaded_files",
    "trash_items",
    "data_cleanup_batches",
    "audit_log",
    "schema_migrations",
]
SUM_QUERIES = {
    "expenses": "SELECT SUM(amount) FROM expenses",
    "piggy_bank_transactions": "SELECT SUM(amount) FROM piggy_bank_transactions",
    "payroll_entries": "SELECT SUM(amount) FROM payroll_entries",
    "incomes": "SELECT SUM(amount) FROM incomes",
}


def _tables(connection, dialect: str) -> list[str]:
    if dialect == "sqlite":
        rows = connection.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        ).all()
        return [row[0] for row in rows]
    rows = connection.execute(
        text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1")
    ).all()
    return [row[0] for row in rows]


def collect(url: str) -> dict:
    engine = create_engine(url)
    try:
        with engine.connect() as connection:
            dialect = engine.dialect.name
            tables = _tables(connection, dialect)
            present = set(tables)
            out: dict = {
                "dialect": dialect,
                "tables_total": len(tables),
                "counts": {},
                "sums": {},
            }
            for table in COUNT_TABLES:
                if table not in present:
                    out["counts"][table] = None  # таблицы нет в этой БД
                    continue
                out["counts"][table] = connection.execute(
                    text(f"SELECT COUNT(*) FROM {table}")
                ).scalar()
            for key, query in SUM_QUERIES.items():
                if key not in present:
                    out["sums"][key] = None
                    continue
                value = connection.execute(text(query)).scalar()
                out["sums"][key] = str(value) if value is not None else None
            if "uploaded_files" in present:
                cols = [c["name"] for c in sa_inspect(engine).get_columns("uploaded_files")]
                if "data" in cols:
                    out["uploaded_files_bytes"] = connection.execute(
                        text("SELECT SUM(LENGTH(data)) FROM uploaded_files")
                    ).scalar()
            if {"deposit_transactions", "clients"} <= present:
                out["deposit_tx_orphans"] = connection.execute(
                    text(
                        "SELECT COUNT(*) FROM deposit_transactions d "
                        "WHERE NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = d.client_id)"
                    )
                ).scalar()
            if {"deposit_months", "clients"} <= present:
                out["deposit_month_orphans"] = connection.execute(
                    text(
                        "SELECT COUNT(*) FROM deposit_months d "
                        "WHERE NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = d.client_id)"
                    )
                ).scalar()
            if "schema_migrations" in present:
                out["schema_migrations"] = [
                    row[0]
                    for row in connection.execute(
                        text("SELECT version FROM schema_migrations ORDER BY 1")
                    ).all()
                ]
            if "bookings" in present:
                # T3-миграция отложится при активных дублях — чинить ДО деплоя.
                booking_cols = {
                    c["name"]
                    for c in sa_inspect(engine).get_columns("bookings")
                }
                if {"deleted_at", "status", "box", "date", "time"} <= booking_cols:
                    out["slot_dup_groups"] = [
                        list(row)
                        for row in connection.execute(
                            text(
                                "SELECT box, date, time, COUNT(*) AS n FROM bookings "
                                "WHERE deleted_at IS NULL "
                                "AND status IN ('new', 'confirmed', 'scheduled', 'in_progress') "
                                "AND box <> '' AND box <> 'По согласованию' "
                                "GROUP BY box, date, time HAVING COUNT(*) > 1 LIMIT 20"
                            )
                        ).all()
                    ]
                else:
                    out["slot_dup_groups"] = "skipped: legacy bookings schema"
            # schema_hash: стабильный слепок DDL (таблица:колонки:типы)
            inspector = sa_inspect(engine)
            parts = []
            for table in sorted(present):
                try:
                    cols = inspector.get_columns(table)
                except Exception:  # noqa: BLE001
                    continue
                parts.append(
                    table
                    + ":"
                    + ",".join(f"{c['name']}:{c['type']}" for c in cols)
                )
            out["schema_hash"] = hashlib.sha256(
                "\n".join(parts).encode("utf-8")
            ).hexdigest()
            return out
    finally:
        engine.dispose()


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Read-only прод-базис БД.")
    parser.add_argument("--db", default=os.getenv("DATABASE_URL") or f"sqlite:///{DEFAULT_DB.as_posix()}")
    parser.add_argument("--out", default=None)
    args = parser.parse_args(argv)
    result = collect(args.db)
    text = json.dumps(result, indent=2, ensure_ascii=False, default=str)
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
        print(f"wrote {args.out}")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

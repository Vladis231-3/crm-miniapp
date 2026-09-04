"""
Add pay_type / fixed_amount columns to booking_workers and
additional_service_workers (G-001: переписано на _common.ensure_column).

Идемпотентно, SQLite и PostgreSQL, без побочек на импорте,
без хардкода пути (движок — из конфигурации приложения).

Usage: python -m backend.migrations.add_pay_type_to_workers
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.migrations._common import ensure_column


def upgrade():
    ensure_column(
        "booking_workers",
        "pay_type",
        "VARCHAR(16)",
        not_null_default_sql="'percent'",
    )
    ensure_column(
        "booking_workers",
        "fixed_amount",
        "INTEGER",
    )
    ensure_column(
        "additional_service_workers",
        "pay_type",
        "VARCHAR(16)",
        not_null_default_sql="'percent'",
    )
    ensure_column(
        "additional_service_workers",
        "fixed_amount",
        "INTEGER",
    )
    print("Migration complete: pay_type/fixed_amount ensured")


def downgrade():
    from backend.migrations._common import drop_column_if_exists

    for table in ("booking_workers", "additional_service_workers"):
        drop_column_if_exists(table, "pay_type")
        drop_column_if_exists(table, "fixed_amount")
    print("Downgrade complete")


if __name__ == "__main__":
    upgrade()

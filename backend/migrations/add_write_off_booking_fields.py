"""
Add booking fields to stock_write_offs table.

Идемпотентно, работает на SQLite и PostgreSQL.

Usage: python -m backend.migrations.add_write_off_booking_fields
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.migrations._common import ensure_column


def upgrade():
    ensure_column("stock_write_offs", "booking_client_name", "VARCHAR(120)")
    ensure_column("stock_write_offs", "booking_date", "VARCHAR(16)")
    ensure_column("stock_write_offs", "booking_worker_names", "VARCHAR(300)")
    print("Migration complete: booking fields ensured on stock_write_offs")


def downgrade():
    from backend.migrations._common import drop_column_if_exists

    drop_column_if_exists("stock_write_offs", "booking_client_name")
    drop_column_if_exists("stock_write_offs", "booking_date")
    drop_column_if_exists("stock_write_offs", "booking_worker_names")
    print("Downgrade complete")

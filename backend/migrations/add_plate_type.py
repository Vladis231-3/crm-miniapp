"""
Add plate_type column to clients and bookings tables.

Идемпотентно, работает на SQLite и PostgreSQL.

Usage: python -m backend.migrations.add_plate_type
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.migrations._common import ensure_column


def upgrade():
    ensure_column(
        "clients",
        "plate_type",
        "VARCHAR(16)",
        not_null_default_sql="'russian'",
    )
    ensure_column("bookings", "plate_type", "VARCHAR(16)")
    print("Migration complete: plate_type ensured on clients and bookings")


def downgrade():
    from backend.migrations._common import drop_column_if_exists

    drop_column_if_exists("clients", "plate_type")
    drop_column_if_exists("bookings", "plate_type")
    print("Downgrade complete")


if __name__ == "__main__":
    upgrade()

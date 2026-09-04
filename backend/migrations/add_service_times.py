"""
Add started_at and completed_at columns to bookings table.

Идемпотентно, работает на SQLite и PostgreSQL.

Usage: python -m backend.migrations.add_service_times
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.migrations._common import ensure_column


def upgrade():
    ensure_column("bookings", "started_at", "TIMESTAMP")
    ensure_column("bookings", "completed_at", "TIMESTAMP")
    print("Migration complete: service times ensured on bookings")


def downgrade():
    from backend.migrations._common import drop_column_if_exists

    drop_column_if_exists("bookings", "started_at")
    drop_column_if_exists("bookings", "completed_at")
    print("Downgrade complete")


if __name__ == "__main__":
    upgrade()

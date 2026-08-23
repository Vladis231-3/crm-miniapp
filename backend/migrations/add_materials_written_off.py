"""
Add materials_written_off column to bookings table.

Идемпотентно, работает на SQLite и PostgreSQL.

Usage: python -m backend.migrations.add_materials_written_off
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.migrations._common import ensure_column


def upgrade():
    ensure_column(
        "bookings",
        "materials_written_off",
        "BOOLEAN",
        not_null_default_sql="FALSE",
    )
    print("Migration complete: materials_written_off ensured on bookings")


def downgrade():
    from backend.migrations._common import drop_column_if_exists

    drop_column_if_exists("bookings", "materials_written_off")
    print("Downgrade complete")


if __name__ == "__main__":
    upgrade()

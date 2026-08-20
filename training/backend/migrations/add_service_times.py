"""
Add started_at and completed_at columns to bookings table.

Usage: python -m backend.migrations.add_service_times
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.app.database import engine
from sqlalchemy import text


def upgrade():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS started_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP"))
        conn.commit()
        print("Migration complete: added started_at and completed_at to bookings")


def downgrade():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE bookings DROP COLUMN IF EXISTS started_at"))
        conn.execute(text("ALTER TABLE bookings DROP COLUMN IF EXISTS completed_at"))
        conn.commit()
        print("Downgrade complete: removed started_at and completed_at from bookings")


if __name__ == "__main__":
    upgrade()

"""
Add materials_written_off column to bookings table.

Usage: python -m backend.migrations.add_materials_written_off
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.app.database import engine
from sqlalchemy import text


def upgrade():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS materials_written_off BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.commit()
        print("Migration complete: added materials_written_off to bookings")


def downgrade():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE bookings DROP COLUMN IF EXISTS materials_written_off"))
        conn.commit()
        print("Downgrade complete: removed materials_written_off from bookings")


if __name__ == "__main__":
    upgrade()

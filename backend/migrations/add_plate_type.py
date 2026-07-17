"""
Add plate_type column to clients and bookings tables.

Usage: python -m backend.migrations.add_plate_type
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.app.database import engine
from sqlalchemy import text


def upgrade():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS plate_type VARCHAR(16) NOT NULL DEFAULT 'russian'"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS plate_type VARCHAR(16) DEFAULT NULL"))
        conn.commit()
        print("Migration complete: added plate_type to clients and bookings")


def downgrade():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE clients DROP COLUMN IF EXISTS plate_type"))
        conn.execute(text("ALTER TABLE bookings DROP COLUMN IF EXISTS plate_type"))
        conn.commit()
        print("Downgrade complete: removed plate_type from clients and bookings")


if __name__ == "__main__":
    upgrade()

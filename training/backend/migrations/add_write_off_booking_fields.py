"""
Add booking_client_name, booking_date, booking_worker_names columns to stock_write_offs table.

Usage: python -m backend.migrations.add_write_off_booking_fields
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.app.database import engine
from sqlalchemy import text


def upgrade():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE stock_write_offs ADD COLUMN IF NOT EXISTS booking_client_name VARCHAR(120)"))
        conn.execute(text("ALTER TABLE stock_write_offs ADD COLUMN IF NOT EXISTS booking_date VARCHAR(16)"))
        conn.execute(text("ALTER TABLE stock_write_offs ADD COLUMN IF NOT EXISTS booking_worker_names VARCHAR(300)"))
        conn.commit()
        print("Migration complete: added booking fields to stock_write_offs")


def downgrade():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE stock_write_offs DROP COLUMN IF EXISTS booking_client_name"))
        conn.execute(text("ALTER TABLE stock_write_offs DROP COLUMN IF EXISTS booking_date"))
        conn.execute(text("ALTER TABLE stock_write_offs DROP COLUMN IF EXISTS booking_worker_names"))
        conn.commit()
        print("Downgrade complete: removed booking fields from stock_write_offs")


if __name__ == "__main__":
    upgrade()

"""
Create stock_write_offs table.

Usage: python -m backend.migrations.add_stock_write_offs
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.app.database import engine
from sqlalchemy import text


def upgrade():
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS stock_write_offs (
                id VARCHAR(64) PRIMARY KEY,
                stock_item_id VARCHAR(64) REFERENCES stock_items(id) ON DELETE SET NULL,
                stock_item_name VARCHAR(120) NOT NULL,
                qty FLOAT NOT NULL,
                unit VARCHAR(16) NOT NULL,
                unit_price FLOAT NOT NULL,
                total_cost FLOAT NOT NULL,
                source VARCHAR(32) NOT NULL DEFAULT 'manual',
                booking_id VARCHAR(64),
                booking_service VARCHAR(120),
                note TEXT,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            )
        """))
        conn.commit()
        print("Migration complete: created stock_write_offs table")


def downgrade():
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS stock_write_offs"))
        conn.commit()
        print("Downgrade complete: dropped stock_write_offs table")


if __name__ == "__main__":
    upgrade()

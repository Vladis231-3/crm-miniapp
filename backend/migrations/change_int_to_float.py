"""
SUPERSEDED (G-002): не запускать.

Тянет денежные колонки в DOUBLE PRECISION, тогда как каноническое
направление — finance_consistency.py (NUMERIC(18,2)): float-деньги дают
ошибки округления. Файл оставлен как исторический артефакт; upgrade()
явно отказывает вместо полу-молчаливого ALTER.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.app.database import engine
from sqlalchemy import text


def upgrade():
    raise RuntimeError(
        "change_int_to_float superseded: денежные колонки ведёт "
        "finance_consistency.py (NUMERIC(18,2)), не DOUBLE PRECISION"
    )


def downgrade():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE stock_items ALTER COLUMN qty TYPE INTEGER"))
        conn.execute(text("ALTER TABLE stock_items ALTER COLUMN unit_price TYPE INTEGER"))
        conn.execute(text("ALTER TABLE booking_materials ALTER COLUMN qty TYPE INTEGER"))
        conn.execute(text("ALTER TABLE booking_materials ALTER COLUMN unit_price TYPE INTEGER"))
        conn.execute(text("ALTER TABLE piggy_bank_transactions ALTER COLUMN amount TYPE INTEGER"))
        conn.execute(text("ALTER TABLE piggy_bank_transactions ALTER COLUMN material_cost TYPE INTEGER"))
        conn.execute(text("ALTER TABLE expenses ALTER COLUMN amount TYPE INTEGER"))
        conn.execute(text("ALTER TABLE incomes ALTER COLUMN amount TYPE INTEGER"))
        conn.execute(text("ALTER TABLE payroll_entries ALTER COLUMN amount TYPE INTEGER"))
        conn.execute(text("ALTER TABLE owner_profit_shares ALTER COLUMN amount TYPE INTEGER"))
        conn.commit()
        print("Downgrade complete: Float → Integer for qty, price, amount columns")


if __name__ == "__main__":
    upgrade()

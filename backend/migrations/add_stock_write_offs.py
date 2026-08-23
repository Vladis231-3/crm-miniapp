"""
Create stock_write_offs table if absent.

Идемпотентно, работает на SQLite и PostgreSQL.

Usage: python -m backend.migrations.add_stock_write_offs
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.migrations._common import ensure_column, table_exists


def upgrade():
    if not table_exists("stock_write_offs"):
        # Схему создаём через ORM-метаданные: диалект-нейтрально.
        from backend.app.database import Base, engine
        from backend.app.models import StockWriteOff  # noqa: F401 — регистрация таблицы

        Base.metadata.create_all(bind=engine, tables=[StockWriteOff.__table__])
        print("Migration complete: stock_write_offs created")
        return
    # Таблица есть — убеждаемся в наличии необязательных колонок (эволюция схемы).
    ensure_column("stock_write_offs", "booking_id", "VARCHAR(64)")
    ensure_column("stock_write_offs", "booking_service", "VARCHAR(120)")
    ensure_column("stock_write_offs", "note", "TEXT")
    print("Migration complete: stock_write_offs present and up to date")


def downgrade():
    from backend.migrations._common import _quote_ident

    from backend.app.database import engine

    with engine.begin() as connection:
        connection.exec_driver_sql(f"DROP TABLE IF EXISTS {_quote_ident('stock_write_offs')}")
    print("Downgrade complete")


if __name__ == "__main__":
    upgrade()

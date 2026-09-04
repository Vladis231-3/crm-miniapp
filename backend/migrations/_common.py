"""Общие хелперы миграций: кросс-диалектные и идемпотентные.

Использование:
    from migrations._common import ensure_column, ensure_table_from_model
"""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import inspect, text

from backend.app.database import engine


def _quote_ident(name: str) -> str:
    """Безопасное экранирование идентификатора."""
    if '"' in name:
        raise ValueError(f"Подозрительный идентификатор: {name!r}")
    return f'"{name}"'


def columns_of(table_name: str) -> set[str]:
    return {col["name"] for col in inspect(engine).get_columns(table_name)}


def table_exists(table_name: str) -> bool:
    return inspect(engine).has_table(table_name)


def ensure_column(
    table_name: str,
    column_name: str,
    column_type_sqlite: str,
    column_type_postgres: str | None = None,
    *,
    not_null_default_sql: str | None = None,
) -> bool:
    """Добавляет колонку, если её нет. Идемпотентно, работает на SQLite и PostgreSQL.

    not_null_default_sql — литерал дефолта для NOT NULL колонок
    (например "FALSE", "'russian'"); подставляется только как литерал.
    """
    if table_exists(table_name) is False:
        print(f"skip: table {table_name} does not exist")
        return False
    existing = columns_of(table_name)
    if column_name in existing:
        print(f"ok: {table_name}.{column_name} already exists")
        return False
    if engine.dialect.name == "postgresql" and column_type_postgres:
        col_type = column_type_postgres
    else:
        col_type = column_type_sqlite
    suffix = f" NOT NULL DEFAULT {not_null_default_sql}" if not_null_default_sql else ""
    with engine.begin() as connection:
        connection.exec_driver_sql(
            f"ALTER TABLE {_quote_ident(table_name)} "
            f"ADD COLUMN {_quote_ident(column_name)} {col_type}{suffix}"
        )
    print(f"added: {table_name}.{column_name} {col_type}")
    return True


def drop_column_if_exists(table_name: str, column_name: str) -> None:
    if not table_exists(table_name):
        return
    if column_name not in columns_of(table_name):
        print(f"ok: {table_name}.{column_name} already absent")
        return
    with engine.begin() as connection:
        connection.exec_driver_sql(
            f"ALTER TABLE {_quote_ident(table_name)} DROP COLUMN {_quote_ident(column_name)}"
        )
    print(f"dropped: {table_name}.{column_name}")

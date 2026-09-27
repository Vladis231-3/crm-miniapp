"""T3: пост-baseline миграции — слот-бэкстоп и ключи идемпотентности.

Реестр ``EXTRA_MIGRATIONS`` подключается в ``app.main.on_startup`` через
``run_startup_migrations(..., extra_migrations=EXTRA_MIGRATIONS)``.
Каждая upgrade_fn возвращает "applied" (или None) либо "deferred".

- 2026-09-23-slot-unique-001: частичный UNIQUE(box, date, time) как DB-бэкстоп
  гонки check-then-act в _ensure_booking_has_no_conflicts (двойной клик шлёт
  идентичный payload → идентичный старт слота). Предикат повторяет семантику
  app-проверки (только BOOKING_ACTIVE_STATUSES): история (completed/cancelled/
  no_show/admin_review), удалённые, пустой бокс и бокс «По согласованию»
  (не резервирует место) не конфликтуют.
  Грязные данные (существующие дубли) → "deferred" + ERROR-лог со списком,
  стартап НЕ падает, retry на следующем старте.
- 2026-09-23-op-key-001: колонки op_key + UNIQUE-индексы для replay-повторов
  (bookings/expenses/incomes). NULL не конфликтуют.
"""

from __future__ import annotations

import logging
from collections.abc import Callable

logger = logging.getLogger(__name__)

SLOT_UNIQUE_ID = "2026-09-23-slot-unique-001"
SLOT_UNIQUE_INDEX = "ux_bookings_slot_active"
SLOT_FREE_STATUSES = ("cancelled", "no_show")

OPKEY_ID = "2026-09-23-op-key-001"
OPKEY_TABLES = (
    ("bookings", "ux_bookings_op_key"),
    ("expenses", "ux_expenses_op_key"),
    ("incomes", "ux_incomes_op_key"),
)


def _detailing_box() -> str:
    from .main import DETAILING_REQUEST_BOX  # lazy: нет цикла на импорте

    return DETAILING_REQUEST_BOX


def _quote_literal(value: str) -> str:
    """Безопасный SQL-литерал: значение только из внутренних констант."""
    if "\x00" in value:
        raise ValueError("NUL byte in SQL literal")
    return "'" + value.replace("'", "''") + "'"


def _slot_active_predicate_sql() -> str:
    """Предикат слота = семантика app-проверки (BOOKING_ACTIVE_STATUSES).

    Completed/cancelled/no_show/admin_review слот не блокируют: так требуют
    и _ensure_booking_has_no_conflicts, и денежные тесты (история переиспользует
    слоты). Гонка двух АКТИВНЫХ записей закрывается индексом.
    """
    from .main import BOOKING_ACTIVE_STATUSES  # lazy: нет цикла на импорте

    statuses = ", ".join(_quote_literal(s) for s in sorted(BOOKING_ACTIVE_STATUSES))
    return f"deleted_at IS NULL AND status IN ({statuses})"


def upgrade_slot_unique_index() -> str:
    from sqlalchemy import inspect as sa_inspect
    from sqlalchemy import text
    from sqlalchemy.exc import OperationalError

    from .database import engine

    detail = _detailing_box()
    predicate = _slot_active_predicate_sql()
    insp = sa_inspect(engine)
    if "bookings" not in insp.get_table_names():
        return "applied"
    with engine.connect() as connection:
        dups = connection.execute(
            text(
                "SELECT box, date, time, COUNT(*) AS n FROM bookings "
                f"WHERE {predicate} "
                "AND box <> '' AND box <> :detail "
                "GROUP BY box, date, time HAVING COUNT(*) > 1 LIMIT 20"
            ),
            {"detail": detail},
        ).all()
    if dups:
        logger.error(
            "SECURITY-MIGRATION %s deferred: %s активных дублей слота "
            "(box/date/time): %s. Разберите вручную (отмена/перенос лишнего), "
            "индекс создастся на следующем старте.",
            SLOT_UNIQUE_ID,
            len(dups),
            [(row[0], row[1], row[2], row[3]) for row in dups],
        )
        return "deferred"
    statement = (
        f"CREATE UNIQUE INDEX IF NOT EXISTS {SLOT_UNIQUE_INDEX} "
        "ON bookings (box, date, time) "
        f"WHERE {_slot_active_predicate_sql()} "
        f"AND box <> '' AND box <> {_quote_literal(detail)}"
    )
    with engine.begin() as connection:
        try:
            # Литерал инлайнится осознанно: SQLite и Postgres запрещают
            # bound-параметры в WHERE частичного индекса.
            connection.execute(text(statement))
        except OperationalError as exc:
            if "already exists" not in str(exc).lower():
                raise
            logger.debug("slot index create raced, ignoring: %s", exc)
    return "applied"


def upgrade_op_keys() -> str:
    from sqlalchemy import inspect as sa_inspect
    from sqlalchemy import text
    from sqlalchemy.exc import OperationalError

    from .database import engine

    insp = sa_inspect(engine)
    present = set(insp.get_table_names())
    for table, _index in OPKEY_TABLES:
        if table not in present:
            continue
        columns = {col["name"] for col in insp.get_columns(table)}
        if "op_key" in columns:
            continue
        with engine.begin() as connection:
            connection.execute(text(f"ALTER TABLE {table} ADD COLUMN op_key VARCHAR(64)"))
    for table, index in OPKEY_TABLES:
        if table not in present:
            continue
        with engine.begin() as connection:
            try:
                connection.execute(
                    text(f"CREATE UNIQUE INDEX IF NOT EXISTS {index} ON {table} (op_key)")
                )
            except OperationalError as exc:
                if "already exists" not in str(exc).lower():
                    raise
                logger.debug("op_key index create raced, ignoring: %s", exc)
    return "applied"


def upgrade_deposit_op_key() -> str:
    """003: DepositTransaction.op_key + UNIQUE (replay пополнений/корректировок)."""
    from sqlalchemy import inspect as sa_inspect
    from sqlalchemy import text
    from sqlalchemy.exc import OperationalError

    from .database import engine

    insp = sa_inspect(engine)
    if "deposit_transactions" not in insp.get_table_names():
        return "applied"
    columns = {col["name"] for col in insp.get_columns("deposit_transactions")}
    if "op_key" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE deposit_transactions ADD COLUMN op_key VARCHAR(64)")
            )
    with engine.begin() as connection:
        try:
            connection.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_deposit_tx_op_key "
                    "ON deposit_transactions (op_key)"
                )
            )
        except OperationalError as exc:
            if "already exists" not in str(exc).lower():
                raise
            logger.debug("deposit op_key index create raced, ignoring: %s", exc)
    return "applied"


_NUMERIC_MONEY_COLUMNS = ("subscription", "wash_total", "balance_after")


def _deposit_month_rows(engine):
    from sqlalchemy import text

    with engine.connect() as connection:
        return connection.execute(
            text(
                "SELECT id, subscription, wash_total, balance_after "
                "FROM deposit_months"
            )
        ).all()


def upgrade_deposit_month_numeric() -> str:
    """004: DepositMonth Float -> NUMERIC(18,2) + UNIQUE(client_id, month).

    - Preflight: все значения обязаны быть конечными (NaN/Inf -> deferred
      с перечнем id, стартап НЕ падает).
    - Postgres: ALTER COLUMN TYPE ... USING ROUND(col::numeric, 2) в одной
      транзакции + сверка сумм (расхождение > копейки на строку -> raise,
      транзакция откатывается).
    - SQLite: rebuild не даёт выигрыша (NUMERIC-affinity хранит REAL так же),
      поэтому меняем только схему для новых БД через create_all, а значения
      доводит приложение (money() на записи). Индекс month-unique создаём
      на обеих СУБД.
    """
    import math
    from decimal import Decimal

    from sqlalchemy import inspect as sa_inspect
    from sqlalchemy import text
    from sqlalchemy.exc import OperationalError

    from .database import engine

    insp = sa_inspect(engine)
    if "deposit_months" not in insp.get_table_names():
        return "applied"
    rows = _deposit_month_rows(engine)
    bad = [
        row[0]
        for row in rows
        if not all(math.isfinite(float(value or 0)) for value in row[1:])
    ]
    if bad:
        logger.error(
            "SECURITY-MIGRATION deposit-month-numeric deferred: неконечные "
            "значения в строках %s. Исправьте вручную, retry на следующем старте.",
            bad[:20],
        )
        return "deferred"
    pre_sums = [
        sum(float(row[index] or 0) for row in rows) for index in (1, 2, 3)
    ]
    dialect = engine.dialect.name
    # Всё ниже — одна транзакция: breach сверки откатывает и конвертацию.
    with engine.begin() as connection:
        if dialect == "postgresql":
            for column in _NUMERIC_MONEY_COLUMNS:
                connection.execute(
                    text(
                        "ALTER TABLE deposit_months ALTER COLUMN "
                        f"{column} TYPE NUMERIC(18,2) "
                        f"USING ROUND({column}::numeric, 2)"
                    )
                )
        try:
            connection.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_deposit_month_client_month "
                    "ON deposit_months (client_id, month)"
                )
            )
        except OperationalError as exc:
            if "already exists" not in str(exc).lower():
                raise
            logger.debug("deposit month index create raced, ignoring: %s", exc)
        # Пост-сверка тем же соединением: суммарное расхождение — не больше
        # копейки на строку, иначе raise (откат конвертации).
        post = connection.execute(
            text("SELECT id, subscription, wash_total, balance_after FROM deposit_months")
        ).all()
        tolerance = 0.01 * max(1, len(post)) + 0.001
        for index in (1, 2, 3):
            post_sum = sum(float(Decimal(str(row[index] or 0))) for row in post)
            if abs(post_sum - pre_sums[index - 1]) > tolerance:
                raise RuntimeError(
                    "deposit-month-numeric: сверка сумм не сошлась "
                    f"(колонка {index}: было {pre_sums[index - 1]!r}, "
                    f"стало {post_sum!r})"
                )
    return "applied"


def upgrade_booking_money_split_snapshot() -> str:
    """005: Booking.money_split_snapshot (заморозка авто-сплита).

    Урок прод-инцидента 27.09.2026: колонка была добавлена только в тело
    baseline (_apply_runtime_migrations), а версионный раннер выполняет
    baseline ОДИН раз и дальше возвращает skipped. На проде baseline уже был
    записан старым деплоем → колонка не появилась → старт упал с
    UndefinedColumn в _repair_text_data. Новую DDL — только версионным
    extra-путем (блок в baseline оставлен для первичных БД).
    """
    from sqlalchemy import inspect as sa_inspect
    from sqlalchemy import text

    from .database import engine

    insp = sa_inspect(engine)
    if "bookings" not in insp.get_table_names():
        return "applied"
    columns = {col["name"] for col in insp.get_columns("bookings")}
    if "money_split_snapshot" in columns:
        return "applied"
    dialect = engine.dialect.name
    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE bookings ADD COLUMN money_split_snapshot "
                + ("JSONB DEFAULT NULL" if dialect == "postgresql" else "TEXT DEFAULT NULL")
            )
        )
    return "applied"


EXTRA_MIGRATIONS: list[tuple[str, Callable[[], str | None]]] = [
    (SLOT_UNIQUE_ID, upgrade_slot_unique_index),
    (OPKEY_ID, upgrade_op_keys),
    ("2026-10-01-deposit-op-key-003", upgrade_deposit_op_key),
    ("2026-10-01-deposit-month-numeric-004", upgrade_deposit_month_numeric),
    ("2026-09-27-booking-split-snapshot-005", upgrade_booking_money_split_snapshot),
]

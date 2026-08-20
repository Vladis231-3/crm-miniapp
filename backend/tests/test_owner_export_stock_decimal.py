"""
Regression test: owner export must not crash when stock unit_price is Decimal.

The owner report multiplies float `qty` by `unit_price`. On Vercel (Postgres)
SQLAlchemy returns `Decimal` for `Numeric(18, 2)` columns, and `float * Decimal`
raises `TypeError`. Local SQLite returns float, which is why this only surfaced
in production.

See commit 0e511420 (unit_price changed from Float to Numeric(18, 2)).
"""
from __future__ import annotations

import os
import sys
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

import pytest


def reset_app_modules() -> None:
    for name in list(sys.modules):
        if (
            name == "app"
            or name.startswith("app.")
            or name == "backend.app"
            or name.startswith("backend.app.")
            or name == "bot"
        ):
            del sys.modules[name]


@pytest.fixture()
def app_env() -> None:
    data_dir = Path(__file__).resolve().parents[1] / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    os.environ["DATABASE_URL"] = (
        f"sqlite:///{(data_dir / f'test_export_{uuid4().hex}.sqlite3').as_posix()}"
    )
    os.environ["APP_ENV"] = "development"
    os.environ["APP_SECRET"] = "test-secret"
    os.environ["CRON_SECRET"] = "test-cron-secret"
    os.environ["ALLOW_DEMO_SEED_DATA"] = "true"
    os.environ["RUN_EMBEDDED_BOT"] = "false"
    os.environ["ALLOW_INSECURE_CLIENT_AUTH"] = "true"
    os.environ["TELEGRAM_BOT_TOKEN"] = "123456:test-bot-token"
    os.environ["TELEGRAM_DELIVERY_MODE"] = "polling"
    os.environ["SYNC_TELEGRAM_WEBHOOK"] = "false"
    os.environ["TELEGRAM_WEBHOOK_PATH"] = "/api/telegram/webhook"
    os.environ.pop("WEBAPP_URL", None)
    reset_app_modules()
    yield
    reset_app_modules()


def test_build_export_data_handles_decimal_stock_price(app_env: None) -> None:
    from app.exports import _build_export_data
    from app.models import StaffUser, StockItem

    owner = StaffUser(
        id="owner-1",
        login="owner",
        password_hash="x",
        role="owner",
        name="Владелец",
    )
    stock_items = [
        StockItem(
            id="s1",
            name="Шампунь",
            qty=2.5,
            unit="шт",
            unit_price=Decimal("100.50"),
            category="Химия",
        ),
        StockItem(
            id="s2",
            name="Губка",
            qty=10,
            unit="шт",
            unit_price=Decimal("49.90"),
            category="Инвентарь",
        ),
    ]

    data = _build_export_data(
        owner=owner,
        company_name="Мойка",
        bookings=[],
        expenses=[],
        penalties=[],
        workers=[],
        stock_items=stock_items,
        services=[],
        incomes=[],
    )

    metrics = {metric.label: metric.value for metric in data.metrics}
    assert metrics["Склад на сумму"] == "750 руб."

    rows_by_name = {row[1]: row for row in data.stock_rows}
    assert rows_by_name["Шампунь"][5] == pytest.approx(251.25)
    assert rows_by_name["Губка"][5] == pytest.approx(499.0)
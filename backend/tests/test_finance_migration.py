import pytest
from migrations.finance_consistency import preflight, upgrade
from sqlalchemy import create_engine


@pytest.fixture
def migration_engine():
    engine = create_engine("sqlite:///:memory:")
    try:
        yield engine
    finally:
        engine.dispose()


def test_finance_migration_preflight_is_non_destructive(migration_engine) -> None:
    report = preflight(migration_engine)
    assert any("expense_id" in line for line in report)


def test_finance_migration_refuses_live_sqlite_apply(migration_engine) -> None:
    with pytest.raises(RuntimeError, match="Refusing live SQLite migration"):
        upgrade(dry_run=False, engine=migration_engine)


def test_finance_migration_dry_run_is_repeatable(migration_engine) -> None:
    assert upgrade(dry_run=True, engine=migration_engine) == upgrade(
        dry_run=True, engine=migration_engine
    )

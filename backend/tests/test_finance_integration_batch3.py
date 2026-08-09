from datetime import date
from decimal import Decimal

import pytest
from app.database import Base
from app.finance import salary_base_for_period
from app.finance_sync import sync_expense_piggy_transaction
from app.models import Expense, PiggyBankTransaction
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session


def _expense(**overrides) -> Expense:
    values = {
        "id": "expense-1",
        "title": "Химия",
        "amount": Decimal("1250.50"),
        "category": "Материалы",
        "date": "10.01.2025",
        "note": None,
        "resource_group": "wash",
    }
    values.update(overrides)
    return Expense(**values)


@pytest.fixture
def db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


def _linked(db: Session, expense_id: str = "expense-1") -> PiggyBankTransaction | None:
    return db.scalar(
        select(PiggyBankTransaction).where(
            PiggyBankTransaction.expense_id == expense_id
        )
    )


def test_expense_create_and_updates_stay_linked_to_piggy(db: Session) -> None:
    expense = _expense()
    db.add(expense)
    sync_expense_piggy_transaction(db, expense)
    db.commit()

    transaction = _linked(db)
    assert transaction is not None
    assert transaction.amount == Decimal("-1250.50")
    assert transaction.purpose == "Расход: Химия"
    assert transaction.date == "10.01.2025"
    assert transaction.resource_group == "wash"

    expense.amount = Decimal("999.99")
    expense.title = "Новая химия"
    expense.date = "11.01.2025"
    expense.resource_group = "detailing"
    sync_expense_piggy_transaction(db, expense)
    db.commit()

    transaction = _linked(db)
    assert transaction is not None
    assert transaction.amount == Decimal("-999.99")
    assert transaction.purpose == "Расход: Новая химия"
    assert transaction.date == "11.01.2025"
    assert transaction.resource_group == "detailing"


def test_resource_group_out_deletes_and_back_in_recreates_link(db: Session) -> None:
    expense = _expense()
    db.add(expense)
    sync_expense_piggy_transaction(db, expense)
    db.commit()

    expense.resource_group = "general"
    sync_expense_piggy_transaction(db, expense)
    db.commit()
    assert _linked(db) is None

    expense.resource_group = "wash"
    sync_expense_piggy_transaction(db, expense)
    db.commit()
    assert _linked(db) is not None


def test_expense_and_piggy_changes_roll_back_atomically(db: Session) -> None:
    expense = _expense()
    db.add(expense)
    sync_expense_piggy_transaction(db, expense)
    db.rollback()

    assert db.get(Expense, expense.id) is None
    assert _linked(db) is None


def test_ambiguous_legacy_backfill_remains_unlinked(db: Session) -> None:
    db.add_all([_expense(id="e-1"), _expense(id="e-2")])
    db.add(
        PiggyBankTransaction(
            id="legacy-1",
            amount=Decimal("-1250.50"),
            transaction_type="expense",
            purpose="Расход: Химия",
            date="10.01.2025",
            resource_group="wash",
        )
    )
    db.commit()

    db.execute(text("""
        UPDATE piggy_bank_transactions AS p
        SET expense_id = (
            SELECT e.id FROM expenses AS e
            WHERE p.date = e.date
              AND p.resource_group = e.resource_group
              AND p.purpose = 'Расход: ' || e.title
              AND p.amount = -e.amount
        )
        WHERE p.transaction_type = 'expense'
          AND p.expense_id IS NULL
          AND 1 = (
              SELECT COUNT(*) FROM expenses AS e
              WHERE p.date = e.date
                AND p.resource_group = e.resource_group
                AND p.purpose = 'Расход: ' || e.title
                AND p.amount = -e.amount
          )
    """))
    db.commit()

    assert db.get(PiggyBankTransaction, "legacy-1").expense_id is None


def test_owner_and_worker_salary_base_use_identical_period_calculation() -> None:
    owner_value = salary_base_for_period(
        3100, date(2025, 1, 10), date(2025, 1, 20), period="custom"
    )
    worker_value = salary_base_for_period(
        3100, date(2025, 1, 10), date(2025, 1, 20), period="custom"
    )
    assert owner_value == worker_value == Decimal("1100.00")


def test_duplicate_attendance_same_business_day_counts_once() -> None:
    from app.main import _compute_shift_attendance

    inspections = [
        {"createdAt": "2025-01-10T08:00:00Z", "masters": [{"workerId": "w-1", "checked": True}]},
        {"createdAt": "2025-01-10T21:00:00Z", "masters": [{"workerId": "w-1", "checked": True}]},
    ]
    count, dates = _compute_shift_attendance(
        inspections, "w-1", date(2025, 1, 10), date(2025, 1, 10)
    )
    assert count == 1
    assert dates == ["10.01.2025"]

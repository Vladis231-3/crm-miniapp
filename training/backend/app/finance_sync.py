from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from .finance import money
from .models import Expense, PiggyBankTransaction, utc_now

PIGGY_RESOURCE_GROUPS = {"wash", "detailing"}


def sync_expense_piggy_transaction(db: Session, expense: Expense) -> None:
    """Keep the single piggy transaction linked to an expense in sync."""
    transaction = db.scalar(
        select(PiggyBankTransaction).where(
            PiggyBankTransaction.expense_id == expense.id
        )
    )
    if expense.resource_group not in PIGGY_RESOURCE_GROUPS:
        if transaction is not None:
            db.delete(transaction)
        return
    if transaction is None:
        transaction = PiggyBankTransaction(
            id=f"pb-{uuid4()}",
            booking_id=None,
            expense_id=expense.id,
            amount=-money(expense.amount),
            transaction_type="expense",
            purpose=f"Расход: {expense.title}",
            material_name=None,
            material_cost=None,
            date=expense.date,
            resource_group=expense.resource_group,
            created_at=utc_now(),
        )
        db.add(transaction)
        return
    transaction.amount = -money(expense.amount)
    transaction.purpose = f"Расход: {expense.title}"
    transaction.date = expense.date
    transaction.resource_group = expense.resource_group

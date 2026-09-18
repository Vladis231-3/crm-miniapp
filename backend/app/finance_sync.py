from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from .finance import money
from .models import Expense, PayrollEntry, PiggyBankTransaction, utc_now

# Группы, для которых бюджетный расход имеет зеркало в копилке (type "expense").
# general осознанно excluded: карточка общей копилки считает только явные
# движения (депозиты/снятия/возвраты/правки), зеркало там невидимо и дало бы
# дрейф all-time баланса относительно карточек.
MIRROR_RESOURCE_GROUPS = {"wash", "detailing"}
# Группы копилки, между которыми может переезжать связанная пара
# (withdraw/repay + расход) без потери истории.
PAIR_RESOURCE_GROUPS = {"wash", "detailing", "general"}


def sync_expense_piggy_transaction(db: Session, expense: Expense) -> None:
    """Keep the single piggy transaction linked to an expense in sync.

    Два вида связанных транзакций:
    - mirror (type "expense"): создаётся/обновляется/удаляется этим синком
      только для групп wash/detailing. Пусто/general = бюджетного зеркала нет.
    - pair (material_withdrawal/other_withdrawal/debt_repayment): создана вместе
      с расходом во withdraw/repay и описывает движение копилки. Синк её
      НИКОГДА не удаляет и не трогает тип/назначение — сумма и дата следуют
      за расходом, а группа — за переездами внутри групп копилки
      (уход расхода из групп историю копилки не стирает).
    """
    # Зарплатные расходы (премии/авансы/выплаты/корректировки) не являются
    # расходами копилки: их зеркало создавать нельзя, иначе списание из
    # копилки задваивается при каждом редактировании такого расхода.
    linked_payroll = db.scalar(
        select(PayrollEntry).where(PayrollEntry.expense_id == expense.id).limit(1)
    )
    if linked_payroll is not None:
        return
    transaction = db.scalar(
        select(PiggyBankTransaction).where(
            PiggyBankTransaction.expense_id == expense.id
        )
    )
    group = (expense.resource_group or "").strip()
    if transaction is not None and transaction.transaction_type != "expense":
        sign = -1 if transaction.amount < 0 else 1
        transaction.amount = sign * money(expense.amount)
        transaction.date = expense.date
        if group in PAIR_RESOURCE_GROUPS:
            transaction.resource_group = group
        return
    if group not in MIRROR_RESOURCE_GROUPS:
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
            resource_group=group,
            created_at=utc_now(),
        )
        db.add(transaction)
        return
    transaction.amount = -money(expense.amount)
    transaction.purpose = f"Расход: {expense.title}"
    transaction.date = expense.date
    transaction.resource_group = group

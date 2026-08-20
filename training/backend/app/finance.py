from __future__ import annotations

from calendar import monthrange
from datetime import UTC, date, datetime
from decimal import ROUND_HALF_UP, Decimal

MONEY_QUANTUM = Decimal("0.01")


def money(value: object) -> Decimal:
    """Convert through text and round monetary values consistently."""
    return Decimal(str(value or 0)).quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)


def money_int(value: object) -> int:
    return int(money(value).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def prorated_monthly_salary(monthly_salary: object, date_from: date, date_to: date) -> Decimal:
    """Prorate a monthly salary over inclusive calendar dates, month by month."""
    if date_from > date_to:
        raise ValueError("date_from must not be after date_to")
    salary = money(monthly_salary)
    total = Decimal(0)
    cursor = date_from
    while cursor <= date_to:
        days_in_month = monthrange(cursor.year, cursor.month)[1]
        month_end = date(cursor.year, cursor.month, days_in_month)
        segment_end = min(month_end, date_to)
        covered_days = (segment_end - cursor).days + 1
        total += salary * Decimal(covered_days) / Decimal(days_in_month)
        cursor = segment_end.fromordinal(segment_end.toordinal() + 1)
    return total.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)


def salary_base_for_period(
    monthly_salary: object,
    date_from: date,
    date_to: date,
    *,
    period: str,
    today: date | None = None,
) -> Decimal:
    """Return period base salary; ``all`` is limited to the current month.

    Staff records have no employment dates, so applying the historical lower
    bound would over-accrue decades of salary. Other periods use inclusive
    calendar-day proration.
    """
    if period == "all":
        reference = today or datetime.now(UTC).date()
        date_from = reference.replace(day=1)
        date_to = reference.replace(
            day=monthrange(reference.year, reference.month)[1]
        )
    return prorated_monthly_salary(monthly_salary, date_from, date_to)

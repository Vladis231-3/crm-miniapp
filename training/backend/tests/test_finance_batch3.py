from datetime import date
from decimal import Decimal

import pytest
from app.date_utils import parse_date_param
from app.finance import prorated_monthly_salary, salary_base_for_period


def test_salary_proration_day_month_leap_and_cross_month() -> None:
    assert prorated_monthly_salary(3100, date(2025, 1, 1), date(2025, 1, 1)) == Decimal("100.00")
    assert prorated_monthly_salary(3100, date(2025, 1, 1), date(2025, 1, 31)) == Decimal("3100.00")
    assert prorated_monthly_salary(2900, date(2024, 2, 1), date(2024, 2, 29)) == Decimal("2900.00")
    assert prorated_monthly_salary(3100, date(2024, 1, 31), date(2024, 2, 1)) == Decimal("206.90")


def test_all_salary_base_is_only_current_calendar_month() -> None:
    assert salary_base_for_period(
        3100,
        date(2000, 1, 1),
        date(2099, 12, 31),
        period="all",
        today=date(2025, 1, 15),
    ) == Decimal("3100.00")


@pytest.mark.parametrize("value", ["31.02.2025", "1.01.2025", "2025-1-01", "bad"])
def test_invalid_query_dates_are_rejected(value: str) -> None:
    with pytest.raises((TypeError, ValueError)):
        parse_date_param(value)

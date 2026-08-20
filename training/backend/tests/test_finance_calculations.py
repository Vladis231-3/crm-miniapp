from datetime import date
from decimal import Decimal

import pytest
from app.date_utils import parse_dmy, validate_range
from app.finance import money, money_int, prorated_monthly_salary


def test_money_rounds_half_up_without_binary_float_error() -> None:
    assert money("1.005") == Decimal("1.01")
    assert money_int("2.5") == 3


def test_prorating_handles_leap_year_and_cross_month() -> None:
    assert prorated_monthly_salary(2900, date(2024, 2, 1), date(2024, 2, 29)) == Decimal("2900.00")
    assert prorated_monthly_salary(3100, date(2024, 1, 31), date(2024, 2, 1)) == Decimal("206.90")


def test_strict_dates_and_range() -> None:
    assert parse_dmy("29.02.2024") == date(2024, 2, 29)
    with pytest.raises(ValueError):
        parse_dmy("31.02.2024")
    with pytest.raises(ValueError):
        validate_range(date(2025, 2, 2), date(2025, 2, 1))

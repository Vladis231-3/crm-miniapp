from __future__ import annotations

from datetime import date


def parse_dmy(value: str) -> date:
    """Strictly parse a real DD.MM.YYYY calendar date."""
    if not isinstance(value, str):
        raise TypeError("date must be DD.MM.YYYY")
    stripped = value.strip()
    parts = stripped.split(".")
    if len(parts) != 3 or any(not part.isdigit() for part in parts):
        raise ValueError("date must be DD.MM.YYYY")
    day, month, year = parts
    if len(day) != 2 or len(month) != 2 or len(year) != 4:
        raise ValueError("date must be DD.MM.YYYY")
    parsed = date(int(year), int(month), int(day))
    if parsed.strftime("%d.%m.%Y") != stripped:
        raise ValueError("date must be DD.MM.YYYY")
    return parsed


def parse_date_param(value: str) -> date:
    """Accept strict DD.MM.YYYY or ISO YYYY-MM-DD query dates."""
    try:
        return parse_dmy(value)
    except ValueError:
        parsed = date.fromisoformat(value)
        if parsed.isoformat() != value:
            raise ValueError("date must be DD.MM.YYYY or YYYY-MM-DD")
        return parsed


def validate_range(date_from: date, date_to: date) -> None:
    if date_from > date_to:
        raise ValueError("date_from must not be after date_to")

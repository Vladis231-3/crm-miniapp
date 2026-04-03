from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable


WORKER_MAX_PERCENT = 40
COMPLAINT_THRESHOLD = 3
COMPLAINT_PERCENT_DEDUCTION = 10
COMPLAINT_DURATION_DAYS = 7
LOCAL_TIMEZONE = datetime.now().astimezone().tzinfo or timezone.utc


@dataclass(frozen=True)
class ComplaintStatus:
    active_count: int
    reduction_active: bool
    reduction_until: datetime | None
    effective_percent: int


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def clamp_worker_percent(value: int) -> int:
    return max(0, min(int(value), WORKER_MAX_PERCENT))


def complaint_active_until(created_at: datetime) -> datetime:
    return as_utc(created_at) + timedelta(days=COMPLAINT_DURATION_DAYS)


def complaint_end_at(complaint: Any) -> datetime:
    revoked_at = getattr(complaint, "revoked_at", None)
    if revoked_at is not None:
        return as_utc(revoked_at)
    active_until = getattr(complaint, "active_until", None)
    if active_until is not None:
        return as_utc(active_until)
    return complaint_active_until(getattr(complaint, "created_at"))


def complaint_is_active_at(complaint: Any, at: datetime | None = None) -> bool:
    current = as_utc(at or datetime.now(timezone.utc))
    starts_at = as_utc(getattr(complaint, "created_at"))
    ends_at = complaint_end_at(complaint)
    return starts_at <= current < ends_at


def complaint_status_for_percent(
    base_percent: int,
    complaints: Iterable[Any],
    *,
    at: datetime | None = None,
) -> ComplaintStatus:
    current = as_utc(at or datetime.now(timezone.utc))
    active_end_times = sorted(
        complaint_end_at(item)
        for item in complaints
        if complaint_is_active_at(item, current)
    )
    active_count = len(active_end_times)
    reduction_active = active_count >= COMPLAINT_THRESHOLD
    reduction_until = active_end_times[active_count - COMPLAINT_THRESHOLD] if reduction_active else None
    effective_percent = clamp_worker_percent(base_percent)
    if reduction_active:
        effective_percent = max(0, effective_percent - COMPLAINT_PERCENT_DEDUCTION)
    return ComplaintStatus(
        active_count=active_count,
        reduction_active=reduction_active,
        reduction_until=reduction_until,
        effective_percent=effective_percent,
    )


def parse_booking_datetime(date_value: str, time_value: str) -> datetime | None:
    try:
        parsed = datetime.strptime(f"{date_value} {time_value}", "%d.%m.%Y %H:%M")
    except ValueError:
        return None
    return parsed.replace(tzinfo=LOCAL_TIMEZONE).astimezone(timezone.utc)


def adjusted_booking_percent(
    assigned_percent: int,
    complaints: Iterable[Any],
    *,
    date_value: str,
    time_value: str,
    fallback: datetime | None = None,
) -> int:
    booking_at = parse_booking_datetime(date_value, time_value)
    effective_at = booking_at or as_utc(fallback or datetime.now(timezone.utc))
    return complaint_status_for_percent(assigned_percent, complaints, at=effective_at).effective_percent

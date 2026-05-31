from __future__ import annotations

import secrets
import time as time_module
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .models import StaffUser, TelegramLinkCode


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


# Rate limiting for link code confirmation attempts
_link_code_attempts: dict[str, list[float]] = {}
_LINK_CODE_RATE_LIMIT_WINDOW = 600  # 10 minutes
_LINK_CODE_MAX_ATTEMPTS = 5  # max attempts per window per chat_id


def _check_link_code_rate_limit(chat_id: str) -> None:
    now = time_module.time()
    window_start = now - _LINK_CODE_RATE_LIMIT_WINDOW
    key = str(chat_id)
    if key in _link_code_attempts:
        _link_code_attempts[key] = [t for t in _link_code_attempts[key] if t > window_start]
    if key not in _link_code_attempts:
        _link_code_attempts[key] = []
    if len(_link_code_attempts[key]) >= _LINK_CODE_MAX_ATTEMPTS:
        raise ValueError("Слишком много попыток. Попробуйте позже.")
    _link_code_attempts[key].append(now)


def create_link_code(db: Session, staff_id: str, lifetime_minutes: int = 10) -> TelegramLinkCode:
    db.execute(delete(TelegramLinkCode).where(TelegramLinkCode.staff_id == staff_id))
    expires_at = _now() + timedelta(minutes=lifetime_minutes)
    code = ""
    while True:
        code = f"{secrets.randbelow(1_000_000):06d}"
        exists = db.scalar(select(TelegramLinkCode).where(TelegramLinkCode.code == code))
        if exists is None:
            break
    item = TelegramLinkCode(
        code=code,
        staff_id=staff_id,
        expires_at=expires_at,
        created_at=_now(),
    )
    db.add(item)
    db.flush()
    return item


def ensure_staff_chat_id_available(
    db: Session,
    chat_id: str | int,
    *,
    exclude_staff_id: str | None = None,
) -> str:
    normalized = str(chat_id).strip()
    if not normalized:
        return ""
    query = select(StaffUser).where(StaffUser.telegram_chat_id == normalized)
    if exclude_staff_id is not None:
        query = query.where(StaffUser.id != exclude_staff_id)
    conflict = db.scalar(query)
    if conflict is not None:
        raise ValueError("This Telegram account is already linked to another employee")
    return normalized


def confirm_link_code(db: Session, code: str, chat_id: int) -> StaffUser | None:
    _check_link_code_rate_limit(str(chat_id))
    item = db.scalar(select(TelegramLinkCode).where(TelegramLinkCode.code == code.strip()))
    if item is None or item.used_at is not None or _as_utc(item.expires_at) < _now():
        return None
    staff = db.get(StaffUser, item.staff_id)
    if staff is None:
        return None
    # Notify previous owner if re-linking
    previous_chat_id = staff.telegram_chat_id.strip() if staff.telegram_chat_id else ""
    staff.telegram_chat_id = ensure_staff_chat_id_available(db, chat_id, exclude_staff_id=staff.id)
    staff.updated_at = _now()
    item.used_at = _now()
    db.flush()
    return staff

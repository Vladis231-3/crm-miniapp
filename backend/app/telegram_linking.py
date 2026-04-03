from __future__ import annotations

import secrets
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
    item = db.scalar(select(TelegramLinkCode).where(TelegramLinkCode.code == code.strip()))
    if item is None or item.used_at is not None or _as_utc(item.expires_at) < _now():
        return None
    staff = db.get(StaffUser, item.staff_id)
    if staff is None:
        return None
    staff.telegram_chat_id = ensure_staff_chat_id_available(db, chat_id, exclude_staff_id=staff.id)
    staff.updated_at = _now()
    item.used_at = _now()
    db.flush()
    return staff

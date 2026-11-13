from __future__ import annotations

import secrets
import time as time_module
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from .models import AppSetting, StaffUser, TelegramLinkCode

# P1-5: счётчики попыток живут в app_settings, а не в памяти процесса —
# рестарт или второй воркер больше не обнуляют лимит.
LINK_ATTEMPTS_SETTING_KEY = "telegram_link_code_attempts"


def _now() -> datetime:
    return datetime.now(UTC)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


# Rate limiting for link code confirmation attempts
_LINK_CODE_RATE_LIMIT_WINDOW = 600  # 10 minutes
_LINK_CODE_MAX_ATTEMPTS = 5  # max attempts per window per chat_id
_LINK_CODE_GLOBAL_FAILURES = 20  # все неверные попытки суммарно за окно


def _load_attempt_state(db: Session) -> dict:
    row = db.get(AppSetting, LINK_ATTEMPTS_SETTING_KEY)
    return dict(row.value) if row is not None and isinstance(row.value, dict) else {}


def _save_attempt_state(db: Session, state: dict) -> None:
    row = db.get(AppSetting, LINK_ATTEMPTS_SETTING_KEY)
    if row is None:
        db.add(AppSetting(key=LINK_ATTEMPTS_SETTING_KEY, value=state))
    else:
        row.value = state
    db.flush()


def _prune_attempt_state(state: dict, window_start: float) -> dict:
    cleaned: dict = {}
    for key, values in state.items():
        if key == "failures":
            continue
        if not isinstance(values, list):
            continue
        fresh = [float(t) for t in values if isinstance(t, (int, float)) and float(t) > window_start]
        if fresh:
            cleaned[key] = fresh
    failures = [
        float(t)
        for t in state.get("failures", [])
        if isinstance(t, (int, float)) and float(t) > window_start
    ]
    if failures:
        cleaned["failures"] = failures
    return cleaned


def _burn_outstanding_codes(db: Session) -> None:
    """Гасим все невыданные коды: серия неверных попыток = попытка подбора."""
    db.execute(
        update(TelegramLinkCode)
        .where(TelegramLinkCode.used_at.is_(None))
        .values(used_at=_now())
    )
    db.flush()


def _check_link_code_rate_limit(db: Session, chat_id: str) -> None:
    now = time_module.time()
    window_start = now - _LINK_CODE_RATE_LIMIT_WINDOW
    state = _prune_attempt_state(_load_attempt_state(db), window_start)
    key = str(chat_id)
    attempts = state.get(key, [])
    if len(attempts) >= _LINK_CODE_MAX_ATTEMPTS:
        # Неудачная серия по конкретному чату — код(ы) больше не действуют.
        _burn_outstanding_codes(db)
        _save_attempt_state(db, state)
        raise ValueError("Слишком много попыток. Попробуйте позже.")
    state[key] = [*attempts, now]
    _save_attempt_state(db, state)


def _register_failed_attempt(db: Session, chat_id: str) -> None:
    now = time_module.time()
    window_start = now - _LINK_CODE_RATE_LIMIT_WINDOW
    state = _prune_attempt_state(_load_attempt_state(db), window_start)
    failures = [*state.get("failures", []), now]
    state["failures"] = failures
    if len(failures) >= _LINK_CODE_GLOBAL_FAILURES:
        # Распределённый перебор с разных аккаунтов: гасим все коды и
        # обнуляем счётчик, чтобы серия не блокировала работу персонала.
        _burn_outstanding_codes(db)
        state.pop("failures", None)
    _save_attempt_state(db, state)


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


_ROLE_LABELS = {
    "admin": "администратор",
    "worker": "мастер",
    "owner": "владелец",
    "accountant": "бухгалтер",
}


def _notify_previous_holder(staff: StaffUser, previous_chat_id: str) -> None:
    """P1-5: сообщаем прежнему держателю аккаунта, что Telegram перепривязан.

    Импорт бота ленивый: bot импортирует этот модуль, и на верхнем уровне
    получился бы цикл. Ошибка отправки не должна ломать привязку.
    """
    text = (
        f"Telegram отвязан от профиля «{staff.name}» "
        f"({_ROLE_LABELS.get(staff.role, staff.role)}): аккаунт привязали к другому "
        "Telegram. Если это не вы — сообщите администратору."
    )
    try:
        try:
            from backend.bot import send_telegram_message
        except ImportError:
            from bot import send_telegram_message
        send_telegram_message(previous_chat_id, text)
    except Exception:  # noqa: BLE001 — уведомление best-effort
        return


def confirm_link_code(db: Session, code: str, chat_id: int) -> StaffUser | None:
    _check_link_code_rate_limit(db, str(chat_id))
    item = db.scalar(select(TelegramLinkCode).where(TelegramLinkCode.code == code.strip()))
    if item is None or item.used_at is not None or _as_utc(item.expires_at) < _now():
        _register_failed_attempt(db, str(chat_id))
        return None
    staff = db.get(StaffUser, item.staff_id)
    if staff is None:
        _register_failed_attempt(db, str(chat_id))
        return None
    previous_chat_id = (staff.telegram_chat_id or "").strip()
    staff.telegram_chat_id = ensure_staff_chat_id_available(db, chat_id, exclude_staff_id=staff.id)
    staff.updated_at = _now()
    item.used_at = _now()
    db.flush()
    if previous_chat_id and previous_chat_id != str(staff.telegram_chat_id):
        _notify_previous_holder(staff, previous_chat_id)
    return staff

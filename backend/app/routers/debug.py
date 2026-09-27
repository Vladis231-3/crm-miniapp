"""T7: debug-роутер (диагностика БД/mojibake, только owner). Вынесен из app.main.

Контракты не меняются; гейт — route_matrix + api_drift.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..audit_log import log_action
from ..database import get_db
from ..models import AppSetting, Notification, Service, StaffUser
from ..main import (
    _TEXT_REPAIR_TARGETS,
    _debug_owner_session,
    _repair_nested_text,
    _repair_text_value,
    _sanitize_notification_message,
)

router = APIRouter()

@router.get("/api/debug/db")
def debug_db(
    session_data: dict = Depends(_debug_owner_session),
    db: Session = Depends(get_db),
) -> dict:
    """Диагностика БД — первые 3 staff/service с hex. S-001: только владелец."""
    try:
        from sqlalchemy import select

        staff = []
        for s in db.scalars(select(StaffUser).limit(3)).all():
            staff.append(
                {
                    "id": s.id,
                    "login": s.login,
                    "name": s.name,
                    "name_hex": (s.name or "").encode("utf-8").hex(),
                    "city": s.city,
                    "city_hex": (s.city or "").encode("utf-8").hex() if s.city else "",
                }
            )
        services = []
        for svc in db.scalars(select(Service).limit(3)).all():
            services.append({"id": svc.id, "name": svc.name, "hex": (svc.name or "").encode("utf-8").hex()})
        log_action(db, action="debug.db.read", session_data=session_data)
        db.commit()
        return {"ok": True, "staff": staff, "services": services}
    except Exception as e:
        import traceback

        return {"ok": False, "error": str(e), "trace": traceback.format_exc()[:3000]}


def _mojibake_scan_rows(db: Session) -> list[dict]:
    """Найти строки-кандидаты mojibake: строгий ремонт меняет значение."""
    rows: list[dict] = []
    for model, fields in _TEXT_REPAIR_TARGETS:
        table = getattr(model, "__tablename__", getattr(model, "__name__", "?"))
        for item in db.scalars(select(model)).all():
            for field in fields:
                value = getattr(item, field, None)
                if not isinstance(value, str) or not value:
                    continue
                fixed = _repair_text_value(value)
                if fixed == value:
                    continue
                rows.append(
                    {
                        "table": table,
                        "id": getattr(item, "id", None),
                        "field": field,
                        "value": value[:200],
                        "value_hex": value.encode("utf-8").hex()[:400],
                        "fixed": fixed[:200],
                    }
                )
    for setting in db.scalars(select(AppSetting)).all():
        fixed_value = _repair_nested_text(setting.value)
        if fixed_value != setting.value:
            rows.append(
                {
                    "table": "app_settings",
                    "id": getattr(setting, "key", None),
                    "field": "value",
                    "value": repr(setting.value)[:200],
                    "fixed": repr(fixed_value)[:200],
                }
            )
    for notification in db.scalars(select(Notification)).all():
        fixed_message = _sanitize_notification_message(notification.message)
        if fixed_message != notification.message:
            rows.append(
                {
                    "table": "notifications",
                    "id": getattr(notification, "id", None),
                    "field": "message",
                    "value": notification.message[:200],
                    "fixed": fixed_message[:200],
                }
            )
    return rows


@router.get("/api/debug/mojibake-scan")
def debug_mojibake_scan(
    session_data: dict = Depends(_debug_owner_session),
    db: Session = Depends(get_db),
) -> dict:
    """Диагностика: какие строки в БД выглядят как mojibake и чем их починит строгий ремонт."""
    rows = _mojibake_scan_rows(db)
    return {"ok": True, "count": len(rows), "rows": rows[:200]}


@router.post("/api/debug/mojibake-repair")
def debug_mojibake_repair(
    payload: dict | None = None,
    session_data: dict = Depends(_debug_owner_session),
    db: Session = Depends(get_db),
) -> dict:
    """Строгий ремонт mojibake в БД. По умолчанию dry-run; {"apply": true} — применить."""
    apply_fix = bool((payload or {}).get("apply"))
    rows = _mojibake_scan_rows(db)
    if not apply_fix:
        return {"ok": True, "dry_run": True, "would_change": len(rows)}
    changed = 0
    for model, fields in _TEXT_REPAIR_TARGETS:
        for item in db.scalars(select(model)).all():
            for field in fields:
                value = getattr(item, field, None)
                if not isinstance(value, str) or not value:
                    continue
                fixed = _repair_text_value(value)
                if fixed != value:
                    setattr(item, field, fixed)
                    changed += 1
    for setting in db.scalars(select(AppSetting)).all():
        fixed_value = _repair_nested_text(setting.value)
        if fixed_value != setting.value:
            setting.value = fixed_value
            changed += 1
    for notification in db.scalars(select(Notification)).all():
        fixed_message = _sanitize_notification_message(notification.message)
        if not fixed_message:
            db.delete(notification)
            changed += 1
            continue
        if fixed_message != notification.message:
            notification.message = fixed_message
            changed += 1
    log_action(
        db,
        action="debug.mojibake_repair.apply",
        session_data=session_data,
        detail=f"changed={changed}",
    )
    db.commit()
    return {"ok": True, "dry_run": False, "changed": changed}

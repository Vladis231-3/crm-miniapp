"""T1.2: персистентный аудит owner-опасных действий.

``log_action`` добавляет строку ``AuditLog`` в текущую сессию и делает
``flush`` (без commit — коммитит вызывающий хендлер в той же транзакции,
поэтому откат действия откатывает и запись аудита).
"""

from __future__ import annotations

from uuid import uuid4

from sqlalchemy.orm import Session

from .models import AuditLog, utc_now


def log_action(
    db: Session,
    *,
    action: str,
    session_data: dict | None = None,
    actor_id: str = "",
    actor_role: str = "",
    object_type: str | None = None,
    object_id: str | None = None,
    detail: str = "",
) -> AuditLog:
    """Добавить запись аудита в текущую транзакцию."""
    if session_data:
        actor_id = session_data.get("actorId") or actor_id
        actor_role = session_data.get("role") or actor_role
    entry = AuditLog(
        id=f"al-{uuid4()}",
        actor_id=str(actor_id or ""),
        actor_role=str(actor_role or ""),
        action=action,
        object_type=object_type,
        object_id=str(object_id) if object_id is not None else None,
        detail=str(detail or "")[:500],
        created_at=utc_now(),
    )
    db.add(entry)
    db.flush()
    return entry

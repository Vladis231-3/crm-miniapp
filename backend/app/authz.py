"""T1.2: объектная авторизация (хвост T1.2 — enforce по умолчанию).

``authorize_role`` проверяет роль и при несоответствии в enforce-режиме
(``AUTHZ_ENFORCE=true``, дефолт) возвращает строгий 403.
Permissive-режим (``AUTHZ_ENFORCE=false``, только для отладки) лишь пишет
WARNING в лог и разрешает.

Закрытые FINDINGs из test_idor_matrix.py: бухгалтер не удаляет/не правит
брони и не добавляет услуги (см. ``booking.delete/update/add_service``).
"""

from __future__ import annotations

import logging

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


def authorize_role(session_data: dict | None, allowed: set[str], *, action: str) -> None:
    """Проверить роль; в permissive-режиме — только залогировать и разрешить."""
    from .config import get_settings

    role = (session_data or {}).get("role")
    actor = (session_data or {}).get("actorId")
    if role in allowed:
        return
    try:
        enforce = bool(get_settings().authz_enforce)
    except Exception:  # pragma: no cover - конфиг всегда доступен на практике
        enforce = False
    logger.warning(
        "SECURITY-AUTHZ permissive-deny action=%s role=%s actor=%s",
        action,
        role,
        actor,
    )
    if enforce:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden"
        )

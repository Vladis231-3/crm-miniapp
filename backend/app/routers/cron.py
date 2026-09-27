"""T7: cron-роутер (Vercel crons + outbox-памп). Вынесен из app.main.

Контракты не меняются; гейт — route_matrix + api_drift.
Импорт снизу app.main (подключается в конце main.py): имена уже определены.
"""

from __future__ import annotations

import hmac as hmac_mod

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..google_calendar import pull_calendar_changes
from ..outbox import process_outbox_batch
from ..schemas import OwnerReminderDispatchPayload
from ..main import (
    _all_owner_telegram_recipients,
    _dispatch_booking_reminders,
    _dispatch_return_visit_reminders,
    _owner_summary_export_file,
    _owner_summary_report,
    _send_owner_summary_report,
    logger,
    settings,
)

router = APIRouter()

@router.get("/api/cron/google-sync")
def run_google_calendar_sync_cron(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Cron-эндпоинт Vercel: обратная синхронизация Google Calendar -> CRM.

    Вызывается каждые 5 минут (vercel.json -> crons). Защищён CRON_SECRET:
    запрос без секрета получает 503/401, как и остальные cron-эндпоинты.
    """
    if not settings.cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRON_SECRET is not configured",
        )
    if not authorization or not hmac_mod.compare_digest(authorization, f"Bearer {settings.cron_secret}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid cron secret",
        )
    result = pull_calendar_changes(db, settings)
    db.commit()
    return result


@router.get("/api/cron/outbox")
def run_outbox_cron(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Cron-памп outbox доставки (T4): для serverless, где daemon-воркер
    не переживает вызов. Ограничен лимитом пачки, чтобы уложиться в
    maxDuration функции. Тот же CRON_SECRET-гейт, что у остальных кронов.
    """
    if not settings.cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRON_SECRET is not configured",
        )
    if not authorization or not hmac_mod.compare_digest(authorization, f"Bearer {settings.cron_secret}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid cron secret",
        )
    return process_outbox_batch(limit=20)


@router.get("/api/cron/reminders", response_model=OwnerReminderDispatchPayload)
def run_reminders_cron(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> OwnerReminderDispatchPayload:
    """Cron-роут Vercel: напоминания о ближайших записях и повторных визитах.

    Требует CRON_SECRET (см. vercel.json -> crons). Без настроенного секрета
    возвращает 503/401, чтобы не обрабатывать посторонние cron-запросы.
    """
    if not settings.cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRON_SECRET is not configured",
        )
    if not authorization or not hmac_mod.compare_digest(authorization, f"Bearer {settings.cron_secret}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid cron secret",
        )
    dispatch = _dispatch_booking_reminders(db)
    return_visits = _dispatch_return_visit_reminders(db)
    db.commit()
    return OwnerReminderDispatchPayload(
        message=dispatch.message,
        targetDate=dispatch.targetDate,
        clientReminders=dispatch.clientReminders + return_visits,
        workerReminders=dispatch.workerReminders,
        telegramDelivered=dispatch.telegramDelivered + return_visits,
    )


@router.get("/api/cron/reports")
def run_reports_cron(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Cron-роут Vercel: ежедневные сводные отчёты владельцам с Telegram.

    Требует CRON_SECRET. Для каждого владельца с привязанным Telegram
    отправляет daily-отчёт по сегментам wash и detailing; сбой одного
    получателя не прерывает рассылку остальным.
    """
    if not settings.cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRON_SECRET is not configured",
        )
    if not authorization or not hmac_mod.compare_digest(authorization, f"Bearer {settings.cron_secret}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid cron secret",
        )
    recipients = _all_owner_telegram_recipients(db)
    sent = 0
    failed = 0
    seen_owner_ids: set[str] = set()
    for recipient in recipients:
        if recipient.id in seen_owner_ids:
            continue
        seen_owner_ids.add(recipient.id)
        for segment in ("wash", "detailing"):
            try:
                report = _owner_summary_report(db, recipient.id, "daily", segment)
                export_file = _owner_summary_export_file(db, recipient.id, "daily", segment)
                _send_owner_summary_report(db, recipient.id, report, export_file)
                sent += 1
            except Exception:
                logger.exception(
                    "Daily report delivery failed for owner %s segment %s",
                    recipient.id,
                    segment,
                )
                failed += 1
    db.commit()
    return {"owners": len(seen_owner_ids), "reportsSent": sent, "reportsFailed": failed}

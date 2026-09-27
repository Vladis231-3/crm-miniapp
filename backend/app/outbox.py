"""T4: transactional outbox доставки в Google Calendar.

Проблема: ``_google_sync_booking`` вызывался ПОСЛЕ commit (сеть после фиксации —
рассинхрон при отказе Google) и делал ``db.flush()`` без следующего commit
(``google_event_id`` терялся). Теперь:

- продюсеры (create/update/delete брони) кладут строку ``Outbox`` в ТУ ЖЕ
  транзакцию (коалесцирование по ``op_key = google:{booking_id}:{action}``);
- daemon-воркер ``outbox-worker`` забирает pending пачками (lease через
  ``locked_by/locked_until``), доставляет через ``sync_booking_to_calendar``
  и коммитит ``google_event_id`` вместе со статусом (баг потери закрыт);
- retry с backoff, dead-letter после ``MAX_ATTEMPTS`` (строка остаётся для
  ручного разбора, молчаливой потери нет);
- доставка at-least-once: Google upsert идемпотентен (события ищутся по
  stored ``google_event_ids``), дубли безвредны;
- флаг ``OUTBOX_GOOGLE_ENABLED=false`` возвращает старый прямой вызов
  (мгновенный откат без редеплоя логики);
- serverless (Vercel, ``IS_SERVERLESS``): daemon мёртв — после коммита идёт
  И строка outbox (ретраи/аудит), И прямой best-effort вызов (мгновенно как
  раньше); добирает cron-памп ``GET /api/cron/outbox`` (тот же CRON_SECRET).

TG-уведомления оставлены как есть (синхронные best-effort) — их outbox
отдельной задачей: там десятки точек отправки с разным текстом.
"""

from __future__ import annotations

import logging
import os
import time
from collections.abc import Callable
from datetime import timedelta
from uuid import uuid4

logger = logging.getLogger(__name__)

outbox_thread = None

_outbox_stop_event = None


def _get_stop_event():
    import threading

    global _outbox_stop_event

    if _outbox_stop_event is None:
        _outbox_stop_event = threading.Event()
    return _outbox_stop_event


def stop_outbox_worker(*, timeout: float = 10.0) -> None:
    """Кооперативная остановка воркера (lifespan shutdown). No-op если не запущен."""
    global outbox_thread

    event = _outbox_stop_event
    if outbox_thread is None:
        return
    if event is not None:
        event.set()
    outbox_thread.join(timeout=timeout)
    if outbox_thread.is_alive():
        logger.warning("shutdown: outbox-worker не остановился за %ss", timeout)
    outbox_thread = None

KIND_GOOGLE_UPSERT = "google_upsert"
KIND_GOOGLE_DELETE = "google_delete"
KIND_TG_MESSAGE = "tg_message"

STATUS_PENDING = "pending"
STATUS_SENT = "sent"
STATUS_FAILED = "failed"
STATUS_GONE = "gone"

MAX_ATTEMPTS = 25
# Backoff по номеру попытки (индекс = attempts после инкремента).
BACKOFF_SECONDS = (30, 300, 1800, 7200)
CLAIM_TTL_SECONDS = 300
BATCH_LIMIT = 20


def google_op_key(booking_id: str, action: str) -> str:
    return f"google:{booking_id}:{action}"


def enqueue_google_sync(db, booking_id: str, action: str):
    """Положить задание в outbox в текущей транзакции (коалесцирование).

    Повторная постановка той же (booking, action) обновляет существующую
    pending-строку вместо дубликата. Конфликт гасится savepoint'ом, чтобы не
    ронять внешнюю бизнес-транзакцию. Коммитит вызывающий хендлер.
    """
    from sqlalchemy.exc import IntegrityError

    from .models import Outbox, utc_now

    op_key = google_op_key(booking_id, action)
    kind = KIND_GOOGLE_DELETE if action == "delete" else KIND_GOOGLE_UPSERT
    try:
        with db.begin_nested():
            row = Outbox(
                id=f"ob-{uuid4()}",
                op_key=op_key,
                kind=kind,
                booking_id=booking_id,
                payload={"action": action},
                status=STATUS_PENDING,
                attempts=0,
                next_retry_at=utc_now(),
                created_at=utc_now(),
            )
            db.add(row)
            db.flush()
        return row
    except IntegrityError:
        # Гонка постановок: обновляем существующую строку тем же ключом.
        existing = (
            db.query(Outbox).filter(Outbox.op_key == op_key).one_or_none()
        )
        if existing is None:  # pragma: no cover - ключ исчез между flush и select
            raise
        existing.kind = kind
        existing.booking_id = booking_id
        existing.payload = {"action": action}
        if existing.status != STATUS_PENDING:
            existing.status = STATUS_PENDING
            existing.attempts = 0
        existing.next_retry_at = utc_now()
        db.flush()
        return existing


def _backoff_seconds(attempts: int) -> int:
    if attempts <= 0:
        return 0
    if attempts <= len(BACKOFF_SECONDS):
        return BACKOFF_SECONDS[attempts - 1]
    return BACKOFF_SECONDS[-1]


def _claim_batch(db, *, limit: int, worker_id: str):
    """Забрать пачку due-строк под свой lease (at-least-once, без RETURNING)."""
    from sqlalchemy import or_, select, update

    from .models import Outbox, utc_now

    now = utc_now()
    ids = db.scalars(
        select(Outbox.id)
        .where(
            Outbox.status == STATUS_PENDING,
            or_(Outbox.next_retry_at.is_(None), Outbox.next_retry_at <= now),
            or_(Outbox.locked_until.is_(None), Outbox.locked_until < now),
        )
        .order_by(Outbox.created_at)
        .limit(limit)
    ).all()
    if not ids:
        return []
    db.execute(
        update(Outbox)
        .where(
            Outbox.id.in_(ids),
            Outbox.status == STATUS_PENDING,
            or_(Outbox.locked_until.is_(None), Outbox.locked_until < now),
        )
        .values(
            locked_by=worker_id,
            locked_until=now + timedelta(seconds=CLAIM_TTL_SECONDS),
        )
    )
    db.commit()
    return db.scalars(select(Outbox).where(Outbox.locked_by == worker_id)).all()


def deliver_google_row(db, settings, row) -> bool:
    """Доставить одну строку (возвращает ok). Мутации — в сессии, коммит снаружи."""
    from .google_calendar import sync_booking_to_calendar
    from .models import Booking

    booking = db.get(Booking, row.booking_id) if row.booking_id else None
    if booking is None:
        row.status = STATUS_GONE
        row.last_error = "booking row missing (purged?)"
        return True
    action = (row.payload or {}).get("action", "upsert")
    _, ok = sync_booking_to_calendar(db, settings, booking, action=action)
    return bool(ok)


def enqueue_tg_message(db, chat_id: str | None, text: str):
    """TG-уведомление жизненного цикла брони — строкой в текущей транзакции.

    Каждое событие отдельно (коалесцирования нет — это разные события).
    Пустой получатель/текст пропускается как и раньше (guard _send_telegram_safe).
    """
    from .models import Outbox, utc_now

    chat_id = (chat_id or "").strip()
    text = text or ""
    if not chat_id or not text:
        logger.debug("outbox tg skipped: empty recipient/text")
        return None
    row = Outbox(
        id=f"ob-{uuid4()}",
        op_key=f"tg:{uuid4().hex}",
        kind=KIND_TG_MESSAGE,
        booking_id=None,
        payload={"chat_id": chat_id, "text": text},
        status=STATUS_PENDING,
        attempts=0,
        next_retry_at=utc_now(),
        created_at=utc_now(),
    )
    db.add(row)
    db.flush()
    return row


def deliver_tg_row(db, settings, row) -> bool | str:
    """Доставить TG-строку. Возвращает True / "gone" для отравленных."""
    try:
        from backend.bot import send_telegram_message
    except ImportError:  # pragma: no cover - запуск из backend/
        from bot import send_telegram_message

    payload = row.payload or {}
    chat_id = str(payload.get("chat_id") or "").strip()
    text = str(payload.get("text") or "")
    if not chat_id or not text:
        row.status = STATUS_GONE
        row.last_error = "empty recipient/text"
        return "gone"
    send_telegram_message(chat_id, text)
    return True


def process_outbox_batch(
    *,
    limit: int = BATCH_LIMIT,
    worker_id: str | None = None,
    deliver: Callable | None = None,
) -> dict:
    """Одна итерация воркера: claim + доставка + статусы. Возвращает статистику."""
    from .config import get_settings
    from .database import SessionLocal
    from .models import utc_now

    wid = worker_id or f"{os.getpid()}-{uuid4().hex[:8]}"
    settings = get_settings()
    stats = {"claimed": 0, "sent": 0, "retried": 0, "gone": 0, "failed": 0}
    db = SessionLocal()
    try:
        rows = _claim_batch(db, limit=limit, worker_id=wid)
    except Exception:  # noqa: BLE001
        logger.exception("outbox claim failed")
        db.close()
        return stats
    stats["claimed"] = len(rows)
    db.close()

    from .google_calendar import is_configured

    google_configured: bool | None = None

    for row in rows:
        db = SessionLocal()
        try:
            current = db.get(row.__class__, row.id)
            if current is None or current.status != STATUS_PENDING:
                continue
            if current.kind == KIND_TG_MESSAGE:
                dispatcher = deliver_tg_row
            elif current.kind in (KIND_GOOGLE_UPSERT, KIND_GOOGLE_DELETE):
                if google_configured is None:
                    google_configured = bool(is_configured(settings, db))
                if not google_configured:
                    # Интеграция не настроена (или отвалилась): отпускаем lease,
                    # строка останется pending для поздней привязки OAuth.
                    current.locked_by = None
                    current.locked_until = None
                    db.commit()
                    continue
                dispatcher = deliver_google_row
            else:
                current.status = STATUS_FAILED
                current.last_error = f"unknown kind: {current.kind}"[:500]
                current.locked_by = None
                current.locked_until = None
                db.commit()
                stats["failed"] += 1
                continue
            try:
                ok = (
                    deliver(db, settings, current)
                    if deliver is not None
                    else dispatcher(db, settings, current)
                )
            except Exception as exc:  # noqa: BLE001
                ok = False
                current.last_error = str(exc)[:500]
                logger.warning(
                    "outbox delivery raised (op=%s attempt=%s): %s",
                    current.op_key,
                    current.attempts + 1,
                    exc,
                )
            current.attempts = (current.attempts or 0) + 1
            current.locked_by = None
            current.locked_until = None
            if current.status == STATUS_GONE:
                # deliver пометил строку терминальной (бронь вычищена purge).
                stats["gone"] += 1
            elif ok:
                current.status = STATUS_SENT
                current.last_error = ""
                stats["sent"] += 1
            elif current.attempts >= MAX_ATTEMPTS:
                current.status = STATUS_FAILED
                stats["failed"] += 1
            else:
                current.next_retry_at = utc_now() + timedelta(
                    seconds=_backoff_seconds(current.attempts)
                )
                stats["retried"] += 1
            db.commit()
        except Exception:  # noqa: BLE001
            logger.exception("outbox item failed (op=%s)", getattr(row, "op_key", "?"))
            try:
                db.rollback()
            except Exception:  # noqa: BLE001
                pass
        finally:
            db.close()
    return stats


def run_outbox_worker(
    stop_event=None,
    *,
    interval_s: float = 30,
) -> None:
    """Бесконечный цикл daemon-потока outbox-worker."""
    while stop_event is None or not stop_event.is_set():
        try:
            process_outbox_batch()
        except Exception:  # noqa: BLE001
            logger.exception("outbox worker iteration failed")
        if stop_event is not None and stop_event.is_set():
            break
        if stop_event is None:
            time.sleep(interval_s)
        else:
            stop_event.wait(interval_s)


def start_outbox_worker_if_configured() -> bool:
    """Стартовать outbox-поток только при настроенном Google (как pull-loop).

    Возвращает True, если поток запущен. В тестах/без OAuth — False.
    """
    from .config import get_settings
    from .database import SessionLocal
    from .google_calendar import is_configured

    global outbox_thread

    try:
        settings = get_settings()
        db = SessionLocal()
        try:
            configured = bool(is_configured(settings, db))
        finally:
            db.close()
    except Exception:  # noqa: BLE001
        return False
    if not configured:
        return False
    import threading

    if outbox_thread is None:
        outbox_thread = threading.Thread(
            target=run_outbox_worker,
            kwargs={"stop_event": _get_stop_event(), "interval_s": 30},
            name="outbox-worker",
            daemon=True,
        )
        outbox_thread.start()
        return True
    return False

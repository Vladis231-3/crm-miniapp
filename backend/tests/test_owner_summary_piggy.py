from __future__ import annotations

"""D1: строки копилки в Telegram-сводке не должны двоить прочие расходы.

Снято на материалы = только material_withdrawal,
Снято на прочие = только other_withdrawal (раньше прочие входили в обе строки).
"""

from datetime import datetime

from app.exports import build_owner_summary_report
from app.models import Booking, PiggyBankTransaction, Service


def _booking_today() -> Booking:
    today = datetime.now().strftime("%d.%m.%Y")
    return Booking(
        id="b-tg-1",
        service_id="s1",
        service="Мойка базовая",
        date=today,
        time="11:00",
        price=10000,
        status="completed",
        client_name="Проверка",
    )


def _service() -> Service:
    return Service(id="s1", name="Мойка базовая", category="Мойка", price=10000)


def _tx(tx_id: str, kind: str, amount: float) -> PiggyBankTransaction:
    today = datetime.now().strftime("%d.%m.%Y")
    return PiggyBankTransaction(
        id=tx_id,
        amount=amount,
        transaction_type=kind,
        purpose="Проверка",
        date=today,
        resource_group="wash",
    )


def test_other_withdrawal_not_doubled_in_materials_line() -> None:
    report = build_owner_summary_report(
        company_name="Тест",
        bookings=[_booking_today()],
        services=[_service()],
        piggy_transactions=[
            _tx("pb-1", "material_withdrawal", -1000),
            _tx("pb-2", "other_withdrawal", -500),
        ],
        period="daily",
        segment="wash",
        now=datetime.now().astimezone(),
    )
    lines = report.message.splitlines()
    materials = next(line for line in lines if "Снято на материалы" in line)
    other = next(line for line in lines if "Снято на прочие" in line)
    assert "1 000" in materials, materials
    assert "500" not in materials, materials
    assert "500" in other, other

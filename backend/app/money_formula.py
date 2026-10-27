"""Проверка формулы раздела денег услуги.

Формула валидна, если в ней есть «поглощающий» шаг — тот, что забирает
весь текущий остаток: владельцы без % (или 100%) либо копилка «весь
остаток» (или 100%). Иначе после последнего шага остаётся хвост, который
никому не уходит, — такую формулу сохранять нельзя.
"""

from __future__ import annotations


def formula_tail_error(
    *,
    piggy_pay_type: str | None,
    piggy_pay_value: int | None,
    owner_pay_type: str | None,
    owner_pay_value: int | None,
    owner_split_enabled: bool | None,
) -> str | None:
    """None — формула распределяет чек целиком; иначе причина по-русски."""
    piggy_type = piggy_pay_type or ""
    owner_type = owner_pay_type or ""
    owners_enabled = owner_split_enabled is not False
    owner_value = int(owner_pay_value or 0)

    if owners_enabled and (owner_type == "" or (owner_type == "percent" and owner_value >= 100)):
        return None
    if piggy_type == "rest" or (piggy_type == "percent" and int(piggy_pay_value or 0) >= 100):
        return None

    if not owners_enabled:
        return (
            "владельцы выключены, а копилка не забирает остаток — часть денег никому не уйдёт. "
            "Включите владельцев или поставьте копилке «Весь остаток»."
        )
    return (
        f"владельцам {owner_value}% остатка, а копилка не забирает остаток — "
        f"{100 - owner_value}% остатка никому не уйдёт. "
        "Поставьте владельцам «Весь остаток» или копилке «Весь остаток»."
    )

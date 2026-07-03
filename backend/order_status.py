from typing import Literal

OrderStatus = Literal["pending", "processing", "shipped", "delivered", "cancelled"]

VALID_ORDER_STATUSES: frozenset[str] = frozenset({"pending", "processing", "shipped", "delivered", "cancelled"})

_ALLOWED: dict[str, frozenset[str]] = {
    "pending": frozenset({"processing", "cancelled"}),
    "processing": frozenset({"shipped", "cancelled"}),
    "shipped": frozenset({"delivered", "cancelled"}),
    "delivered": frozenset(),
    "cancelled": frozenset(),
}


def can_transition(current: str, new: str) -> bool:
    if new not in VALID_ORDER_STATUSES:
        return False
    allowed = _ALLOWED.get(current)
    if allowed is None:
        return False
    return new in allowed

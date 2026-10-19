from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime
from enum import StrEnum
from typing import Callable, Iterable

from .domain import require_aware


class DeliveryStatus(StrEnum):
    PENDING = "pending"
    DELIVERED = "delivered"
    QUARANTINED = "quarantined"


@dataclass(frozen=True, slots=True)
class Delivery:
    message_id: str
    payload_sha256: str
    attempts: int = 0
    status: DeliveryStatus = DeliveryStatus.PENDING
    last_error: str | None = None


@dataclass(frozen=True, slots=True)
class RetryPolicy:
    max_attempts: int

    def __post_init__(self) -> None:
        if self.max_attempts < 1:
            raise ValueError("max_attempts must be positive")


def dispatch_once(
    delivery: Delivery,
    *,
    send: Callable[[], None],
    policy: RetryPolicy,
) -> Delivery:
    if delivery.status != DeliveryStatus.PENDING:
        return delivery
    try:
        send()
    except Exception as exc:
        attempts = delivery.attempts + 1
        status = (
            DeliveryStatus.QUARANTINED
            if attempts >= policy.max_attempts
            else DeliveryStatus.PENDING
        )
        return replace(
            delivery,
            attempts=attempts,
            status=status,
            last_error=type(exc).__name__,
        )
    return replace(
        delivery,
        attempts=delivery.attempts + 1,
        status=DeliveryStatus.DELIVERED,
        last_error=None,
    )


@dataclass(frozen=True, slots=True)
class RestoreReceipt:
    receipt_id: str
    started_at: datetime
    completed_at: datetime
    expected_artifact_sha256: str
    restored_artifact_sha256: str
    expected_record_count: int
    restored_record_count: int
    reviewer_id: str

    def __post_init__(self) -> None:
        require_aware(self.started_at, "started_at")
        require_aware(self.completed_at, "completed_at")

    @property
    def accepted(self) -> bool:
        return (
            self.completed_at >= self.started_at
            and self.expected_artifact_sha256
            == self.restored_artifact_sha256
            and self.expected_record_count == self.restored_record_count
            and bool(self.reviewer_id)
        )


@dataclass(frozen=True, slots=True)
class OperationalScorecard:
    attempted: int
    delivered: int
    quarantined: int

    @property
    def delivery_rate(self) -> float:
        return self.delivered / self.attempted if self.attempted else 1.0


def score(deliveries: Iterable[Delivery]) -> OperationalScorecard:
    items = tuple(deliveries)
    return OperationalScorecard(
        attempted=len(items),
        delivered=sum(
            delivery.status == DeliveryStatus.DELIVERED for delivery in items
        ),
        quarantined=sum(
            delivery.status == DeliveryStatus.QUARANTINED
            for delivery in items
        ),
    )


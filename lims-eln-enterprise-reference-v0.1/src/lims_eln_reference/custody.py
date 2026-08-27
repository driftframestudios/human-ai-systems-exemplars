from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime
from typing import Protocol

from .domain import Actor, CommandId, SpecimenId, canonical_sha256, require_aware


class CustodyError(RuntimeError):
    pass


class CustodyConcurrencyConflict(CustodyError):
    pass


@dataclass(frozen=True, slots=True)
class LocationPath:
    site_id: str
    room: str
    unit: str
    position: str

    def canonical(self) -> str:
        return "/".join((self.site_id, self.room, self.unit, self.position))


@dataclass(frozen=True, slots=True)
class CustodyEvent:
    command_id: CommandId
    command_fingerprint: str
    specimen_id: SpecimenId
    source: LocationPath
    destination: LocationPath
    actor_id: str
    occurred_at: datetime
    reason_code: str
    aggregate_version: int


@dataclass(frozen=True, slots=True)
class OutboxMessage:
    message_id: str
    topic: str
    key: str
    payload: dict[str, str | int]


@dataclass(frozen=True, slots=True)
class CustodyAggregate:
    specimen_id: SpecimenId
    tenant_id: str
    current: LocationPath
    version: int = 0
    history: tuple[CustodyEvent, ...] = ()

    def processed(self, command_id: CommandId) -> CustodyEvent | None:
        return next(
            (event for event in self.history if event.command_id == command_id),
            None,
        )


@dataclass(frozen=True, slots=True)
class TransferCommand:
    command_id: CommandId
    expected_version: int
    source: LocationPath
    destination: LocationPath
    actor: Actor
    occurred_at: datetime
    reason_code: str

    def fingerprint(self, specimen_id: str) -> str:
        return canonical_sha256(
            {
                "command_id": str(self.command_id),
                "specimen_id": specimen_id,
                "expected_version": self.expected_version,
                "source": self.source.canonical(),
                "destination": self.destination.canonical(),
                "actor_id": self.actor.subject_id,
                "tenant_id": self.actor.tenant_id,
                "occurred_at": self.occurred_at,
                "reason_code": self.reason_code,
            }
        )


@dataclass(frozen=True, slots=True)
class TransferCommit:
    aggregate: CustodyAggregate
    event: CustodyEvent
    outbox: OutboxMessage


def plan_transfer(
    custody: CustodyAggregate,
    command: TransferCommand,
) -> TransferCommit | None:
    fingerprint = command.fingerprint(str(custody.specimen_id))
    prior = custody.processed(command.command_id)
    if prior is not None:
        if prior.command_fingerprint != fingerprint:
            raise CustodyConcurrencyConflict(
                "command identifier was reused with different transfer content"
            )
        return None

    if command.actor.tenant_id != custody.tenant_id:
        raise CustodyError("actor and specimen tenants must match")
    if custody.version != command.expected_version:
        raise CustodyConcurrencyConflict(
            f"expected version {command.expected_version}; "
            f"observed {custody.version}"
        )
    if custody.current != command.source:
        raise CustodyConcurrencyConflict("source is no longer current")
    if command.source == command.destination:
        raise CustodyError("destination must represent a new location")
    if not command.reason_code:
        raise CustodyError("transfer requires a reason code")
    if not command.actor.has_any_role(
        "lab_technologist", "sample_manager", "automation_service"
    ):
        raise CustodyError("actor lacks a custody-transfer role")
    require_aware(command.occurred_at, "occurred_at")

    event = CustodyEvent(
        command_id=command.command_id,
        command_fingerprint=fingerprint,
        specimen_id=custody.specimen_id,
        source=command.source,
        destination=command.destination,
        actor_id=command.actor.subject_id,
        occurred_at=command.occurred_at,
        reason_code=command.reason_code,
        aggregate_version=custody.version + 1,
    )
    aggregate = replace(
        custody,
        current=command.destination,
        version=custody.version + 1,
        history=(*custody.history, event),
    )
    outbox = OutboxMessage(
        message_id=f"custody:{command.command_id}",
        topic="lims.specimen.custody-transferred.v1",
        key=f"{custody.tenant_id}:{custody.specimen_id}",
        payload={
            "tenant_id": custody.tenant_id,
            "specimen_id": str(custody.specimen_id),
            "source": command.source.canonical(),
            "destination": command.destination.canonical(),
            "aggregate_version": aggregate.version,
        },
    )
    return TransferCommit(aggregate=aggregate, event=event, outbox=outbox)


class CustodyUnitOfWork(Protocol):
    def load(self, specimen_id: SpecimenId) -> CustodyAggregate: ...

    def commit(self, transfer: TransferCommit) -> None: ...


class InMemoryCustodyUnitOfWork:
    def __init__(self, initial: CustodyAggregate) -> None:
        self.aggregate = initial
        self.events: list[CustodyEvent] = []
        self.outbox: list[OutboxMessage] = []

    def load(self, specimen_id: SpecimenId) -> CustodyAggregate:
        if specimen_id != self.aggregate.specimen_id:
            raise KeyError(specimen_id)
        return self.aggregate

    def commit(self, transfer: TransferCommit) -> None:
        if transfer.aggregate.version != self.aggregate.version + 1:
            raise CustodyConcurrencyConflict("commit version is not contiguous")
        self.aggregate = transfer.aggregate
        self.events.append(transfer.event)
        self.outbox.append(transfer.outbox)


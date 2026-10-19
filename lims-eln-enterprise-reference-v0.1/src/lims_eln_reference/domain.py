from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import NewType

SpecimenId = NewType("SpecimenId", str)
CommandId = NewType("CommandId", str)


class SpecimenState(StrEnum):
    RECEIVED = "received"
    EXTRACTED = "extracted"
    LIBRARIED = "libraried"
    SEQUENCED = "sequenced"
    REVIEW_PENDING = "review_pending"
    RELEASED = "released"
    SKIPPED = "skipped"
    VOIDED = "voided"


class ApprovalState(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


@dataclass(frozen=True, slots=True)
class Actor:
    subject_id: str
    tenant_id: str
    roles: frozenset[str]

    def has_any_role(self, *roles: str) -> bool:
        return bool(self.roles.intersection(roles))


@dataclass(frozen=True, slots=True)
class ContainerPosition:
    container_id: str
    position: str
    site_id: str


@dataclass(frozen=True, slots=True)
class SpecimenEvent:
    command_id: CommandId
    command_fingerprint: str
    specimen_id: SpecimenId
    tenant_id: str
    before: SpecimenState
    after: SpecimenState
    actor_id: str
    occurred_at: datetime
    reason_code: str | None
    signature_meaning: str | None
    aggregate_version: int

    def __post_init__(self) -> None:
        require_aware(self.occurred_at, "occurred_at")


@dataclass(frozen=True, slots=True)
class Specimen:
    specimen_id: SpecimenId
    tenant_id: str
    state: SpecimenState
    version: int = 0
    container: ContainerPosition | None = None
    parent_specimen_id: SpecimenId | None = None
    qc_approval: ApprovalState = ApprovalState.PENDING
    scientific_approval: ApprovalState = ApprovalState.PENDING
    events: tuple[SpecimenEvent, ...] = field(default_factory=tuple)

    def processed(self, command_id: CommandId) -> SpecimenEvent | None:
        return next(
            (event for event in self.events if event.command_id == command_id),
            None,
        )

    def canonical_fingerprint(self) -> str:
        payload = {
            "specimen_id": str(self.specimen_id),
            "tenant_id": self.tenant_id,
            "state": self.state.value,
            "version": self.version,
            "container": asdict(self.container) if self.container else None,
            "parent_specimen_id": (
                str(self.parent_specimen_id) if self.parent_specimen_id else None
            ),
            "qc_approval": self.qc_approval.value,
            "scientific_approval": self.scientific_approval.value,
        }
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(encoded.encode()).hexdigest()


def canonical_sha256(payload: dict[str, object]) -> str:
    encoded = json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        default=lambda value: value.isoformat()
        if isinstance(value, datetime)
        else sorted(value)
        if isinstance(value, frozenset)
        else str(value),
    )
    return hashlib.sha256(encoded.encode()).hexdigest()


def require_aware(value: datetime, field_name: str) -> None:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError(f"{field_name} must carry an explicit timezone")


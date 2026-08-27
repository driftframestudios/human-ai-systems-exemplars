from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime

from .domain import (
    Actor,
    ApprovalState,
    CommandId,
    Specimen,
    SpecimenEvent,
    SpecimenState,
    canonical_sha256,
    require_aware,
)


class LifecycleError(RuntimeError):
    code = "lifecycle_error"


class ConcurrencyConflict(LifecycleError):
    code = "concurrency_conflict"


class IllegalTransition(LifecycleError):
    code = "illegal_transition"


class AuthorizationDenied(LifecycleError):
    code = "authorization_denied"


class RequiredEvidenceMissing(LifecycleError):
    code = "required_evidence_missing"


ALLOWED: dict[SpecimenState, frozenset[SpecimenState]] = {
    SpecimenState.RECEIVED: frozenset(
        {SpecimenState.EXTRACTED, SpecimenState.VOIDED}
    ),
    SpecimenState.EXTRACTED: frozenset(
        {SpecimenState.LIBRARIED, SpecimenState.SKIPPED, SpecimenState.VOIDED}
    ),
    SpecimenState.LIBRARIED: frozenset(
        {SpecimenState.SEQUENCED, SpecimenState.SKIPPED, SpecimenState.VOIDED}
    ),
    SpecimenState.SEQUENCED: frozenset(
        {SpecimenState.REVIEW_PENDING, SpecimenState.VOIDED}
    ),
    SpecimenState.REVIEW_PENDING: frozenset(
        {SpecimenState.RELEASED, SpecimenState.VOIDED}
    ),
    SpecimenState.RELEASED: frozenset(),
    SpecimenState.SKIPPED: frozenset({SpecimenState.VOIDED}),
    SpecimenState.VOIDED: frozenset(),
}


@dataclass(frozen=True, slots=True)
class TransitionCommand:
    command_id: CommandId
    expected_version: int
    target: SpecimenState
    actor: Actor
    occurred_at: datetime
    reason_code: str | None = None
    signature_meaning: str | None = None

    def fingerprint(self, specimen_id: str) -> str:
        return canonical_sha256(
            {
                "command_id": str(self.command_id),
                "specimen_id": specimen_id,
                "expected_version": self.expected_version,
                "target": self.target.value,
                "actor_id": self.actor.subject_id,
                "tenant_id": self.actor.tenant_id,
                "roles": self.actor.roles,
                "occurred_at": self.occurred_at,
                "reason_code": self.reason_code,
                "signature_meaning": self.signature_meaning,
            }
        )


def transition(specimen: Specimen, command: TransitionCommand) -> Specimen:
    """Return a new aggregate with exact replay and audit invariants."""
    fingerprint = command.fingerprint(str(specimen.specimen_id))
    prior = specimen.processed(command.command_id)
    if prior is not None:
        if prior.command_fingerprint != fingerprint:
            raise ConcurrencyConflict(
                "command identifier was reused with different content"
            )
        return specimen

    if command.actor.tenant_id != specimen.tenant_id:
        raise AuthorizationDenied("actor and specimen tenants must match")
    if command.expected_version != specimen.version:
        raise ConcurrencyConflict(
            f"expected version {command.expected_version}; "
            f"observed {specimen.version}"
        )
    require_aware(command.occurred_at, "occurred_at")
    if command.target not in ALLOWED[specimen.state]:
        raise IllegalTransition(f"{specimen.state} -> {command.target}")

    _authorize(command)
    _require_decision_evidence(specimen, command)

    event = SpecimenEvent(
        command_id=command.command_id,
        command_fingerprint=fingerprint,
        specimen_id=specimen.specimen_id,
        tenant_id=specimen.tenant_id,
        before=specimen.state,
        after=command.target,
        actor_id=command.actor.subject_id,
        occurred_at=command.occurred_at,
        reason_code=command.reason_code,
        signature_meaning=command.signature_meaning,
        aggregate_version=specimen.version + 1,
    )
    return replace(
        specimen,
        state=command.target,
        version=specimen.version + 1,
        events=(*specimen.events, event),
    )


def _authorize(command: TransitionCommand) -> None:
    if command.target == SpecimenState.RELEASED:
        if not command.actor.has_any_role("scientific_reviewer", "pathologist"):
            raise AuthorizationDenied("release requires an accountable reviewer")
    elif not command.actor.has_any_role(
        "lab_technologist",
        "automation_service",
        "scientific_reviewer",
        "pathologist",
    ):
        raise AuthorizationDenied("actor lacks a lifecycle role")


def _require_decision_evidence(
    specimen: Specimen,
    command: TransitionCommand,
) -> None:
    if command.target in {SpecimenState.SKIPPED, SpecimenState.VOIDED}:
        if not command.reason_code:
            raise RequiredEvidenceMissing(
                f"{command.target} requires a reason code"
            )
    if command.target == SpecimenState.RELEASED:
        if specimen.qc_approval != ApprovalState.APPROVED:
            raise RequiredEvidenceMissing("release requires approved QC")
        if specimen.scientific_approval != ApprovalState.APPROVED:
            raise RequiredEvidenceMissing(
                "release requires scientific approval"
            )
        if not command.signature_meaning:
            raise RequiredEvidenceMissing(
                "release requires the signer's recorded meaning"
            )


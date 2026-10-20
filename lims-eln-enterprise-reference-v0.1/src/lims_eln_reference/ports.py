from __future__ import annotations

import hashlib
from dataclasses import dataclass
from enum import StrEnum
from typing import BinaryIO, Protocol, runtime_checkable

from .domain import Specimen, SpecimenId, canonical_sha256


class AdapterError(RuntimeError):
    pass


class IdempotencyConflict(AdapterError):
    pass


class StaleSourceRevision(AdapterError):
    pass


class RevisionConflict(AdapterError):
    pass


class DuplicateExternalIdentity(AdapterError):
    pass


class MutationDisposition(StrEnum):
    CREATED = "created"
    UPDATED = "updated"
    UNCHANGED = "unchanged"
    REPLAYED = "replayed"


class ProjectionStatus(StrEnum):
    PRESENT = "present"
    ABSENT = "absent"


@dataclass(frozen=True, slots=True)
class UpsertSpecimenCommand:
    tenant_id: str
    site_id: str
    external_identity: str
    source_revision: int
    idempotency_key: str
    specimen: Specimen

    def request_fingerprint(self) -> str:
        return canonical_sha256(
            {
                "tenant_id": self.tenant_id,
                "site_id": self.site_id,
                "external_identity": self.external_identity,
                "source_revision": self.source_revision,
                "idempotency_key": self.idempotency_key,
                "projection_sha256": self.specimen.canonical_fingerprint(),
            }
        )


@dataclass(frozen=True, slots=True)
class MutationReceipt:
    disposition: MutationDisposition
    external_identity: str
    source_revision: int
    projection_sha256: str
    operation_id: str


@dataclass(frozen=True, slots=True)
class ProjectionResult:
    status: ProjectionStatus
    specimen: Specimen | None
    source_revision: int | None
    projection_sha256: str | None


@dataclass(frozen=True, slots=True)
class ArtifactReceipt:
    artifact_id: str
    sha256: str
    byte_count: int


@runtime_checkable
class CanonicalLimsPort(Protocol):
    def upsert_specimen(
        self,
        command: UpsertSpecimenCommand,
    ) -> MutationReceipt: ...

    def read_specimen(
        self,
        *,
        tenant_id: str,
        external_identity: str,
    ) -> ProjectionResult: ...

    def link_lineage(
        self,
        *,
        tenant_id: str,
        child_identity: str,
        parent_identity: str,
        idempotency_key: str,
    ) -> MutationReceipt: ...

    def attach_artifact(
        self,
        *,
        tenant_id: str,
        external_identity: str,
        stream: BinaryIO,
        expected_sha256: str,
        idempotency_key: str,
    ) -> ArtifactReceipt: ...


@dataclass(slots=True)
class _StoredProjection:
    specimen: Specimen
    source_revision: int
    fingerprint: str


class InMemoryLimsAdapter:
    """Executable contract adapter with explicit revision and replay behavior."""

    def __init__(self) -> None:
        self._records: dict[tuple[str, str], _StoredProjection] = {}
        self._requests: dict[tuple[str, str], tuple[str, MutationReceipt]] = {}
        self._lineage_requests: dict[
            tuple[str, str], tuple[str, MutationReceipt]
        ] = {}
        self._lineage: set[tuple[str, str, str]] = set()
        self._artifacts: dict[tuple[str, str], ArtifactReceipt] = {}

    def upsert_specimen(
        self,
        command: UpsertSpecimenCommand,
    ) -> MutationReceipt:
        if command.specimen.tenant_id != command.tenant_id:
            raise AdapterError("specimen and command tenants must match")
        request_key = (command.tenant_id, command.idempotency_key)
        request_digest = command.request_fingerprint()
        prior_request = self._requests.get(request_key)
        if prior_request is not None:
            prior_digest, prior_receipt = prior_request
            if prior_digest != request_digest:
                raise IdempotencyConflict(
                    "idempotency key was reused with changed content"
                )
            return MutationReceipt(
                disposition=MutationDisposition.REPLAYED,
                external_identity=prior_receipt.external_identity,
                source_revision=prior_receipt.source_revision,
                projection_sha256=prior_receipt.projection_sha256,
                operation_id=prior_receipt.operation_id,
            )

        record_key = (command.tenant_id, command.external_identity)
        fingerprint = command.specimen.canonical_fingerprint()
        current = self._records.get(record_key)
        if current is None:
            disposition = MutationDisposition.CREATED
        elif command.source_revision < current.source_revision:
            raise StaleSourceRevision("source revision is older than projection")
        elif command.source_revision == current.source_revision:
            if fingerprint != current.fingerprint:
                raise RevisionConflict(
                    "equal source revision carries changed canonical content"
                )
            disposition = MutationDisposition.UNCHANGED
        else:
            disposition = MutationDisposition.UPDATED

        receipt = MutationReceipt(
            disposition=disposition,
            external_identity=command.external_identity,
            source_revision=command.source_revision,
            projection_sha256=fingerprint,
            operation_id=(
                f"specimen:{command.tenant_id}:{command.idempotency_key}"
            ),
        )
        if disposition != MutationDisposition.UNCHANGED:
            self._records[record_key] = _StoredProjection(
                specimen=command.specimen,
                source_revision=command.source_revision,
                fingerprint=fingerprint,
            )
        self._requests[request_key] = (request_digest, receipt)
        return receipt

    def read_specimen(
        self,
        *,
        tenant_id: str,
        external_identity: str,
    ) -> ProjectionResult:
        current = self._records.get((tenant_id, external_identity))
        if current is None:
            return ProjectionResult(
                status=ProjectionStatus.ABSENT,
                specimen=None,
                source_revision=None,
                projection_sha256=None,
            )
        return ProjectionResult(
            status=ProjectionStatus.PRESENT,
            specimen=current.specimen,
            source_revision=current.source_revision,
            projection_sha256=current.fingerprint,
        )

    def link_lineage(
        self,
        *,
        tenant_id: str,
        child_identity: str,
        parent_identity: str,
        idempotency_key: str,
    ) -> MutationReceipt:
        digest = canonical_sha256(
            {
                "tenant_id": tenant_id,
                "child": child_identity,
                "parent": parent_identity,
                "idempotency_key": idempotency_key,
            }
        )
        request_key = (tenant_id, idempotency_key)
        prior = self._lineage_requests.get(request_key)
        if prior is not None:
            prior_digest, receipt = prior
            if prior_digest != digest:
                raise IdempotencyConflict(
                    "lineage key was reused with changed endpoints"
                )
            return MutationReceipt(
                disposition=MutationDisposition.REPLAYED,
                external_identity=receipt.external_identity,
                source_revision=receipt.source_revision,
                projection_sha256=receipt.projection_sha256,
                operation_id=receipt.operation_id,
            )
        for identity in (child_identity, parent_identity):
            if (tenant_id, identity) not in self._records:
                raise KeyError(f"lineage endpoint is absent: {identity}")
        edge = (tenant_id, child_identity, parent_identity)
        disposition = (
            MutationDisposition.UNCHANGED
            if edge in self._lineage
            else MutationDisposition.CREATED
        )
        self._lineage.add(edge)
        receipt = MutationReceipt(
            disposition=disposition,
            external_identity=child_identity,
            source_revision=0,
            projection_sha256=digest,
            operation_id=f"lineage:{tenant_id}:{idempotency_key}",
        )
        self._lineage_requests[request_key] = (digest, receipt)
        return receipt

    def attach_artifact(
        self,
        *,
        tenant_id: str,
        external_identity: str,
        stream: BinaryIO,
        expected_sha256: str,
        idempotency_key: str,
    ) -> ArtifactReceipt:
        if (tenant_id, external_identity) not in self._records:
            raise KeyError(external_identity)
        content = stream.read()
        digest = hashlib.sha256(content).hexdigest()
        if digest != expected_sha256:
            raise AdapterError("artifact checksum differs from expectation")
        request_key = (tenant_id, idempotency_key)
        prior = self._artifacts.get(request_key)
        if prior is not None:
            if prior.sha256 != digest:
                raise IdempotencyConflict(
                    "artifact key was reused with changed content"
                )
            return prior
        receipt = ArtifactReceipt(
            artifact_id=f"artifact:{tenant_id}:{idempotency_key}",
            sha256=digest,
            byte_count=len(content),
        )
        self._artifacts[request_key] = receipt
        return receipt


from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Protocol

from ..domain import canonical_sha256
from .base import (
    AmbiguousVendorOutcome,
    CompatibilityGateClosed,
    VendorMutationReceipt,
    VendorReconciliationConflict,
)


@dataclass(frozen=True, slots=True)
class SapioCompatibilityManifest:
    tenant_release: str
    sdk_version: str
    schema_sha256: str
    approved_pairs: frozenset[tuple[str, str]]

    def assert_compatible(self) -> None:
        if (self.tenant_release, self.sdk_version) not in self.approved_pairs:
            raise CompatibilityGateClosed(
                "Sapio tenant release and SDK version lack approval"
            )
        if len(self.schema_sha256) != 64:
            raise CompatibilityGateClosed(
                "Sapio schema fingerprint must be a SHA-256 digest"
            )


class SapioGateway(Protocol):
    def commit_record_graph(
        self,
        *,
        request_id: str,
        records: tuple[Mapping[str, object], ...],
    ) -> str: ...

    def read_by_request_id(
        self,
        request_id: str,
    ) -> tuple[str, str] | None: ...

    def ensure_eln_protocol(
        self,
        *,
        managed_key: str,
        version: int,
        specification_sha256: str,
    ) -> str: ...


class SapioAdapter:
    def __init__(
        self,
        manifest: SapioCompatibilityManifest,
        gateway: SapioGateway,
    ) -> None:
        manifest.assert_compatible()
        self._gateway = gateway
        self._requests: dict[str, str] = {}

    def upsert_accession_graph(
        self,
        *,
        request_id: str,
        external_identity: str,
        records: tuple[Mapping[str, object], ...],
    ) -> VendorMutationReceipt:
        request_sha = canonical_sha256(
            {
                "request_id": request_id,
                "external_identity": external_identity,
                "records": records,
            }
        )
        prior_sha = self._requests.get(request_id)
        if prior_sha is not None and prior_sha != request_sha:
            raise VendorReconciliationConflict(
                "Sapio request ID was reused with changed graph content"
            )
        self._requests.setdefault(request_id, request_sha)
        try:
            operation_id = self._gateway.commit_record_graph(
                request_id=request_id,
                records=records,
            )
        except TimeoutError:
            observed = self._gateway.read_by_request_id(request_id)
            if observed is None:
                raise AmbiguousVendorOutcome(
                    operation_id=f"sapio:{request_id}",
                    request_sha256=request_sha,
                    external_identity=external_identity,
                )
            observed_identity, observed_sha = observed
            if (observed_identity, observed_sha) != (
                external_identity,
                request_sha,
            ):
                raise VendorReconciliationConflict(
                    "Sapio read-back differs from canonical request"
                )
            operation_id = f"sapio:{request_id}:reconciled"
            reconciled = True
        else:
            reconciled = False

        observed = self._gateway.read_by_request_id(request_id)
        if observed != (external_identity, request_sha):
            raise VendorReconciliationConflict(
                "Sapio mutation lacks matching read-back evidence"
            )
        return VendorMutationReceipt(
            platform="sapio",
            operation_id=operation_id,
            external_identity=external_identity,
            canonical_sha256=request_sha,
            reconciled=reconciled,
        )

    def ensure_managed_eln(
        self,
        *,
        managed_key: str,
        version: int,
        specification: Mapping[str, object],
    ) -> str:
        specification_sha = canonical_sha256(dict(specification))
        return self._gateway.ensure_eln_protocol(
            managed_key=managed_key,
            version=version,
            specification_sha256=specification_sha,
        )


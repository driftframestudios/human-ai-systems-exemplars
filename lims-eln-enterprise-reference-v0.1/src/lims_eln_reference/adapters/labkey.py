from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Mapping, Protocol, Sequence

from ..domain import canonical_sha256
from .base import VendorReconciliationConflict


class LabKeyGateway(Protocol):
    def validate_rows(
        self,
        *,
        schema: str,
        query: str,
        rows: Sequence[Mapping[str, object]],
    ) -> tuple[str, ...]: ...

    def save_rows(
        self,
        *,
        schema: str,
        query: str,
        rows: Sequence[Mapping[str, object]],
        audit_reason: str,
    ) -> str: ...

    def read_rows(
        self,
        *,
        schema: str,
        query: str,
        external_ids: Sequence[str],
    ) -> Sequence[Mapping[str, object]]: ...

    def upload_artifact(self, *, path: str, content: bytes) -> str: ...

    def download_artifact(self, *, path: str) -> bytes: ...


@dataclass(frozen=True, slots=True)
class LabKeyBatchReceipt:
    operation_id: str
    row_count: int
    canonical_sha256: str
    audit_reason: str


class LabKeyMigrationAdapter:
    def __init__(self, gateway: LabKeyGateway) -> None:
        self._gateway = gateway

    def write_batch(
        self,
        *,
        schema: str,
        query: str,
        rows: Sequence[Mapping[str, object]],
        audit_reason: str,
    ) -> LabKeyBatchReceipt:
        if not audit_reason:
            raise ValueError("LabKey batch requires an audit reason")
        errors = self._gateway.validate_rows(
            schema=schema,
            query=query,
            rows=rows,
        )
        if errors:
            raise ValueError(f"LabKey validation failed: {'; '.join(errors)}")
        operation_id = self._gateway.save_rows(
            schema=schema,
            query=query,
            rows=rows,
            audit_reason=audit_reason,
        )
        external_ids = [str(row["externalId"]) for row in rows]
        observed = self._gateway.read_rows(
            schema=schema,
            query=query,
            external_ids=external_ids,
        )
        expected_sha = canonical_sha256({"rows": list(rows)})
        observed_sha = canonical_sha256({"rows": list(observed)})
        if expected_sha != observed_sha:
            raise VendorReconciliationConflict(
                "LabKey read-back differs from migration batch"
            )
        return LabKeyBatchReceipt(
            operation_id=operation_id,
            row_count=len(rows),
            canonical_sha256=expected_sha,
            audit_reason=audit_reason,
        )

    def upload_with_parity(self, *, path: str, content: bytes) -> str:
        expected = hashlib.sha256(content).hexdigest()
        self._gateway.upload_artifact(path=path, content=content)
        observed = hashlib.sha256(
            self._gateway.download_artifact(path=path)
        ).hexdigest()
        if observed != expected:
            raise VendorReconciliationConflict(
                "LabKey artifact download checksum differs from upload"
            )
        return expected


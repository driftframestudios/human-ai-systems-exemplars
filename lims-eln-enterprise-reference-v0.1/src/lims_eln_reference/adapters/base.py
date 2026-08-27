from __future__ import annotations

from dataclasses import dataclass


class CompatibilityGateClosed(RuntimeError):
    pass


class AmbiguousVendorOutcome(RuntimeError):
    def __init__(
        self,
        *,
        operation_id: str,
        request_sha256: str,
        external_identity: str,
    ) -> None:
        self.operation_id = operation_id
        self.request_sha256 = request_sha256
        self.external_identity = external_identity
        super().__init__(
            f"operation {operation_id} requires read-back reconciliation"
        )


class VendorReconciliationConflict(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class VendorMutationReceipt:
    platform: str
    operation_id: str
    external_identity: str
    canonical_sha256: str
    reconciled: bool


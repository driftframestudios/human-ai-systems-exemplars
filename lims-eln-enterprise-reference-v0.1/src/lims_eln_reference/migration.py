from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from enum import StrEnum
from typing import Iterable, Mapping


class MigrationDisposition(StrEnum):
    READY = "ready"
    EXCEPTION = "exception"


class DuplicateMigrationIdentity(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class CanonicalRecord:
    source_id: str
    canonical_id: str
    source_version: int
    tenant_id: str
    payload: Mapping[str, object]
    disposition: MigrationDisposition = MigrationDisposition.READY
    exception_reason: str | None = None

    def checksum(self) -> str:
        encoded = json.dumps(
            {
                "source_id": self.source_id,
                "canonical_id": self.canonical_id,
                "source_version": self.source_version,
                "tenant_id": self.tenant_id,
                "payload": dict(self.payload),
                "disposition": self.disposition.value,
                "exception_reason": self.exception_reason,
            },
            sort_keys=True,
            separators=(",", ":"),
        ).encode()
        return hashlib.sha256(encoded).hexdigest()


@dataclass(frozen=True, slots=True)
class MigrationBatch:
    batch_id: str
    after_source_id: str | None
    records: tuple[CanonicalRecord, ...]
    high_water_source_id: str | None


@dataclass(frozen=True, slots=True)
class ReconciliationResult:
    batch_id: str
    expected_count: int
    observed_count: int
    missing_ids: tuple[str, ...]
    unexpected_ids: tuple[str, ...]
    checksum_mismatches: tuple[str, ...]
    source_exceptions: tuple[str, ...]

    @property
    def ready_for_cutover(self) -> bool:
        return (
            self.expected_count == self.observed_count
            and not self.missing_ids
            and not self.unexpected_ids
            and not self.checksum_mismatches
            and not self.source_exceptions
        )


class CutoverGateClosed(RuntimeError):
    pass


def plan_batch(
    records: Iterable[CanonicalRecord],
    *,
    batch_id: str,
    after_source_id: str | None,
    limit: int,
) -> MigrationBatch:
    if limit < 1:
        raise ValueError("limit must be positive")
    ordered = sorted(records, key=lambda record: record.source_id)
    _require_unique(ordered, "source_id")
    _require_unique(ordered, "canonical_id")
    selected = [
        record
        for record in ordered
        if after_source_id is None or record.source_id > after_source_id
    ][:limit]
    high_water = selected[-1].source_id if selected else after_source_id
    return MigrationBatch(
        batch_id=batch_id,
        after_source_id=after_source_id,
        records=tuple(selected),
        high_water_source_id=high_water,
    )


def reconcile(
    batch: MigrationBatch,
    observed_checksums: Mapping[str, str],
) -> ReconciliationResult:
    expected = {
        record.canonical_id: record.checksum()
        for record in batch.records
        if record.disposition == MigrationDisposition.READY
    }
    expected_ids = set(expected)
    observed_ids = set(observed_checksums)
    missing = tuple(sorted(expected_ids - observed_ids))
    unexpected = tuple(sorted(observed_ids - expected_ids))
    mismatches = tuple(
        sorted(
            record_id
            for record_id in expected_ids & observed_ids
            if expected[record_id] != observed_checksums[record_id]
        )
    )
    source_exceptions = tuple(
        sorted(
            record.source_id
            for record in batch.records
            if record.disposition == MigrationDisposition.EXCEPTION
        )
    )
    return ReconciliationResult(
        batch_id=batch.batch_id,
        expected_count=len(expected),
        observed_count=len(observed_checksums),
        missing_ids=missing,
        unexpected_ids=unexpected,
        checksum_mismatches=mismatches,
        source_exceptions=source_exceptions,
    )


def authorize_cutover(
    result: ReconciliationResult,
    *,
    quality_approver_id: str,
    operations_approver_id: str,
    restore_receipt_id: str,
) -> str:
    if not all(
        (quality_approver_id, operations_approver_id, restore_receipt_id)
    ):
        raise ValueError("quality, operations, and restore evidence are required")
    if not result.ready_for_cutover:
        raise CutoverGateClosed("reconciliation exceptions remain open")
    return (
        f"cutover:{result.batch_id}:quality:{quality_approver_id}:"
        f"operations:{operations_approver_id}:restore:{restore_receipt_id}"
    )


def _require_unique(records: list[CanonicalRecord], field: str) -> None:
    values = [getattr(record, field) for record in records]
    duplicates = sorted({value for value in values if values.count(value) > 1})
    if duplicates:
        raise DuplicateMigrationIdentity(
            f"duplicate {field}: {','.join(duplicates)}"
        )


from __future__ import annotations

import csv
import hashlib
import io
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation
from enum import StrEnum


class Disposition(StrEnum):
    ACCEPTED = "accepted"
    QUARANTINED = "quarantined"


@dataclass(frozen=True, slots=True)
class InstrumentObservation:
    tenant_id: str
    message_id: str
    specimen_id: str
    instrument_id: str
    assay_id: str
    assay_revision: str
    analyte: str
    value: Decimal
    unit: str
    instrument_time: datetime
    received_at: datetime
    qc_status: str
    raw_sha256: str


@dataclass(frozen=True, slots=True)
class IngestionReceipt:
    tenant_id: str
    message_id: str
    disposition: Disposition
    raw_sha256: str
    reason: str | None
    observation: InstrumentObservation | None


class MessageIdentityConflict(RuntimeError):
    pass


class InstrumentInbox:
    def __init__(self) -> None:
        self._receipts: dict[tuple[str, str], IngestionReceipt] = {}

    def ingest(
        self,
        tenant_id: str,
        raw: bytes,
        received_at: datetime,
    ) -> IngestionReceipt:
        if not tenant_id:
            raise ValueError("tenant_id is required")
        parsed = parse_csv_message(tenant_id, raw, received_at)
        key = (tenant_id, parsed.message_id)
        prior = self._receipts.get(key)
        if prior is not None:
            if prior.raw_sha256 != parsed.raw_sha256:
                raise MessageIdentityConflict(
                    "message identifier maps to a different raw checksum"
                )
            return prior
        self._receipts[key] = parsed
        return parsed


def parse_csv_message(
    tenant_id: str,
    raw: bytes,
    received_at: datetime,
) -> IngestionReceipt:
    digest = hashlib.sha256(raw).hexdigest()
    if received_at.tzinfo is None:
        raise ValueError("received_at must carry an explicit timezone")
    try:
        text = raw.decode("utf-8")
        rows = list(csv.DictReader(io.StringIO(text)))
    except (UnicodeDecodeError, csv.Error) as exc:
        return _quarantine(
            tenant_id, "unknown", digest, f"parse_error:{type(exc).__name__}"
        )
    if len(rows) != 1:
        return _quarantine(
            tenant_id, "unknown", digest, "expected_exactly_one_observation"
        )

    row = rows[0]
    message_id = row.get("message_id") or "unknown"
    required = {
        "message_id",
        "specimen_id",
        "instrument_id",
        "assay_id",
        "assay_revision",
        "analyte",
        "value",
        "unit",
        "instrument_time",
        "qc_status",
    }
    missing = sorted(key for key in required if not row.get(key))
    if missing:
        return _quarantine(
            tenant_id,
            message_id,
            digest,
            f"missing_fields:{','.join(missing)}",
        )
    try:
        instrument_time = datetime.fromisoformat(row["instrument_time"])
        value = Decimal(row["value"])
    except (ValueError, InvalidOperation):
        return _quarantine(
            tenant_id, message_id, digest, "invalid_value_or_time"
        )
    if instrument_time.tzinfo is None:
        return _quarantine(
            tenant_id,
            message_id,
            digest,
            "instrument_time_requires_timezone",
        )
    if row["unit"] not in {"ng/uL", "copies/mL", "percent"}:
        return _quarantine(tenant_id, message_id, digest, "unit_requires_mapping")
    if row["qc_status"] not in {"pass", "fail", "review"}:
        return _quarantine(
            tenant_id, message_id, digest, "qc_status_requires_mapping"
        )

    observation = InstrumentObservation(
        tenant_id=tenant_id,
        message_id=message_id,
        specimen_id=row["specimen_id"],
        instrument_id=row["instrument_id"],
        assay_id=row["assay_id"],
        assay_revision=row["assay_revision"],
        analyte=row["analyte"],
        value=value,
        unit=row["unit"],
        instrument_time=instrument_time,
        received_at=received_at,
        qc_status=row["qc_status"],
        raw_sha256=digest,
    )
    return IngestionReceipt(
        tenant_id=tenant_id,
        message_id=message_id,
        disposition=Disposition.ACCEPTED,
        raw_sha256=digest,
        reason=None,
        observation=observation,
    )


def _quarantine(
    tenant_id: str,
    message_id: str,
    digest: str,
    reason: str,
) -> IngestionReceipt:
    return IngestionReceipt(
        tenant_id=tenant_id,
        message_id=message_id,
        disposition=Disposition.QUARANTINED,
        raw_sha256=digest,
        reason=reason,
        observation=None,
    )


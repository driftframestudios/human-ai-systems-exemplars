from __future__ import annotations

import hashlib
import io
import unittest
from dataclasses import replace
from datetime import UTC, datetime

from lims_eln_reference.domain import Specimen, SpecimenId, SpecimenState
from lims_eln_reference.instrument import (
    Disposition,
    InstrumentInbox,
    MessageIdentityConflict,
)
from lims_eln_reference.ports import (
    AdapterError,
    CanonicalLimsPort,
    IdempotencyConflict,
    InMemoryLimsAdapter,
    MutationDisposition,
    ProjectionStatus,
    RevisionConflict,
    StaleSourceRevision,
    UpsertSpecimenCommand,
)


HEADER = (
    b"message_id,specimen_id,instrument_id,assay_id,assay_revision,"
    b"analyte,value,unit,instrument_time,qc_status\n"
)
NOW = datetime(2026, 7, 28, 13, 0, 3, tzinfo=UTC)


def payload(
    message_id: str = "msg-001",
    unit: str = "ng/uL",
    timestamp: str = "2026-07-28T13:00:00+00:00",
) -> bytes:
    return HEADER + (
        f"{message_id},SYN-001,INST-7,ASSAY-X,4.2,"
        f"yield,42.1,{unit},{timestamp},pass\n"
    ).encode()


def specimen(
    state: SpecimenState = SpecimenState.RECEIVED,
    version: int = 0,
) -> Specimen:
    return Specimen(
        SpecimenId("SYN-CONTRACT"),
        "tenant-a",
        state,
        version=version,
    )


def upsert(
    item: Specimen,
    *,
    revision: int,
    key: str,
) -> UpsertSpecimenCommand:
    return UpsertSpecimenCommand(
        tenant_id="tenant-a",
        site_id="site-1",
        external_identity=str(item.specimen_id),
        source_revision=revision,
        idempotency_key=key,
        specimen=item,
    )


class InstrumentTests(unittest.TestCase):
    def test_valid_observation_retains_clocks_and_checksum(self) -> None:
        receipt = InstrumentInbox().ingest("tenant-a", payload(), NOW)
        self.assertEqual(receipt.disposition, Disposition.ACCEPTED)
        assert receipt.observation is not None
        self.assertEqual(receipt.observation.received_at, NOW)
        self.assertEqual(receipt.raw_sha256, hashlib.sha256(payload()).hexdigest())

    def test_duplicate_delivery_returns_original_receipt(self) -> None:
        inbox = InstrumentInbox()
        first = inbox.ingest("tenant-a", payload(), NOW)
        replay = inbox.ingest("tenant-a", payload(), NOW)
        self.assertIs(first, replay)

    def test_conflicting_message_identity_is_rejected(self) -> None:
        inbox = InstrumentInbox()
        inbox.ingest("tenant-a", payload(), NOW)
        with self.assertRaises(MessageIdentityConflict):
            inbox.ingest("tenant-a", payload(unit="copies/mL"), NOW)

    def test_same_message_id_is_tenant_scoped(self) -> None:
        inbox = InstrumentInbox()
        first = inbox.ingest("tenant-a", payload(), NOW)
        second = inbox.ingest("tenant-b", payload(), NOW)
        self.assertNotEqual(first.tenant_id, second.tenant_id)

    def test_unmapped_unit_is_quarantined(self) -> None:
        receipt = InstrumentInbox().ingest(
            "tenant-a",
            payload(unit="arbitrary-unit"),
            NOW,
        )
        self.assertEqual(receipt.disposition, Disposition.QUARANTINED)
        self.assertEqual(receipt.reason, "unit_requires_mapping")

    def test_timezone_free_instrument_time_is_quarantined(self) -> None:
        receipt = InstrumentInbox().ingest(
            "tenant-a",
            payload(timestamp="2026-07-28T13:00:00"),
            NOW,
        )
        self.assertEqual(
            receipt.reason,
            "instrument_time_requires_timezone",
        )

    def test_empty_tenant_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            InstrumentInbox().ingest("", payload(), NOW)


class PortConformanceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.adapter = InMemoryLimsAdapter()

    def test_adapter_satisfies_runtime_protocol(self) -> None:
        self.assertIsInstance(self.adapter, CanonicalLimsPort)

    def test_create_and_round_trip_preserve_fingerprint(self) -> None:
        item = specimen()
        receipt = self.adapter.upsert_specimen(
            upsert(item, revision=1, key="accession-1")
        )
        observed = self.adapter.read_specimen(
            tenant_id="tenant-a",
            external_identity=str(item.specimen_id),
        )
        self.assertEqual(receipt.disposition, MutationDisposition.CREATED)
        self.assertEqual(observed.status, ProjectionStatus.PRESENT)
        self.assertEqual(
            observed.projection_sha256,
            item.canonical_fingerprint(),
        )

    def test_identical_replay_converges(self) -> None:
        command = upsert(specimen(), revision=1, key="accession-1")
        first = self.adapter.upsert_specimen(command)
        replay = self.adapter.upsert_specimen(command)
        self.assertEqual(replay.disposition, MutationDisposition.REPLAYED)
        self.assertEqual(first.operation_id, replay.operation_id)

    def test_changed_content_key_reuse_conflicts(self) -> None:
        first = specimen()
        changed = replace(first, state=SpecimenState.EXTRACTED, version=1)
        self.adapter.upsert_specimen(
            upsert(first, revision=1, key="accession-1")
        )
        with self.assertRaises(IdempotencyConflict):
            self.adapter.upsert_specimen(
                upsert(changed, revision=2, key="accession-1")
            )

    def test_equal_revision_changed_fingerprint_conflicts(self) -> None:
        first = specimen()
        changed = replace(first, state=SpecimenState.EXTRACTED, version=1)
        self.adapter.upsert_specimen(upsert(first, revision=1, key="key-1"))
        with self.assertRaises(RevisionConflict):
            self.adapter.upsert_specimen(
                upsert(changed, revision=1, key="key-2")
            )

    def test_lower_revision_is_stale(self) -> None:
        current = replace(
            specimen(),
            state=SpecimenState.EXTRACTED,
            version=2,
        )
        self.adapter.upsert_specimen(
            upsert(current, revision=2, key="key-2")
        )
        with self.assertRaises(StaleSourceRevision):
            self.adapter.upsert_specimen(
                upsert(specimen(), revision=1, key="key-1")
            )

    def test_higher_revision_replaces_projection(self) -> None:
        first = specimen()
        changed = replace(first, state=SpecimenState.EXTRACTED, version=1)
        self.adapter.upsert_specimen(upsert(first, revision=1, key="key-1"))
        receipt = self.adapter.upsert_specimen(
            upsert(changed, revision=2, key="key-2")
        )
        self.assertEqual(receipt.disposition, MutationDisposition.UPDATED)
        observed = self.adapter.read_specimen(
            tenant_id="tenant-a",
            external_identity=str(first.specimen_id),
        )
        self.assertEqual(observed.specimen, changed)

    def test_absence_is_explicit(self) -> None:
        result = self.adapter.read_specimen(
            tenant_id="tenant-a",
            external_identity="missing",
        )
        self.assertEqual(result.status, ProjectionStatus.ABSENT)
        self.assertIsNone(result.specimen)

    def test_lineage_requires_visible_endpoints(self) -> None:
        child = specimen()
        self.adapter.upsert_specimen(
            upsert(child, revision=1, key="child")
        )
        with self.assertRaises(KeyError):
            self.adapter.link_lineage(
                tenant_id="tenant-a",
                child_identity=str(child.specimen_id),
                parent_identity="SYN-PARENT",
                idempotency_key="lineage-1",
            )

    def test_artifact_round_trip_preserves_sha(self) -> None:
        item = specimen()
        self.adapter.upsert_specimen(upsert(item, revision=1, key="item"))
        content = b"synthetic artifact"
        digest = hashlib.sha256(content).hexdigest()
        receipt = self.adapter.attach_artifact(
            tenant_id="tenant-a",
            external_identity=str(item.specimen_id),
            stream=io.BytesIO(content),
            expected_sha256=digest,
            idempotency_key="artifact-1",
        )
        self.assertEqual(receipt.sha256, digest)

    def test_artifact_checksum_mismatch_is_rejected(self) -> None:
        item = specimen()
        self.adapter.upsert_specimen(upsert(item, revision=1, key="item"))
        with self.assertRaises(AdapterError):
            self.adapter.attach_artifact(
                tenant_id="tenant-a",
                external_identity=str(item.specimen_id),
                stream=io.BytesIO(b"content"),
                expected_sha256="0" * 64,
                idempotency_key="artifact-1",
            )


if __name__ == "__main__":
    unittest.main()


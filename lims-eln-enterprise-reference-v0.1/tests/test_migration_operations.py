from __future__ import annotations

import unittest
from dataclasses import replace
from datetime import UTC, datetime, timedelta

from lims_eln_reference.migration import (
    CanonicalRecord,
    CutoverGateClosed,
    DuplicateMigrationIdentity,
    MigrationDisposition,
    authorize_cutover,
    plan_batch,
    reconcile,
)
from lims_eln_reference.operations import (
    Delivery,
    DeliveryStatus,
    RestoreReceipt,
    RetryPolicy,
    dispatch_once,
    score,
)


def records():
    return [
        CanonicalRecord(
            source_id=f"SRC-{index:03}",
            canonical_id=f"SPEC-{index:03}",
            source_version=1,
            tenant_id="tenant-a",
            payload={"state": "received", "index": index},
        )
        for index in range(1, 6)
    ]


class MigrationTests(unittest.TestCase):
    def test_checkpoint_advances_to_last_selected_record(self) -> None:
        batch = plan_batch(
            records(),
            batch_id="batch-001",
            after_source_id="SRC-001",
            limit=2,
        )
        self.assertEqual(
            [record.source_id for record in batch.records],
            ["SRC-002", "SRC-003"],
        )
        self.assertEqual(batch.high_water_source_id, "SRC-003")

    def test_empty_restart_preserves_checkpoint(self) -> None:
        batch = plan_batch(
            records(),
            batch_id="batch-finished",
            after_source_id="SRC-999",
            limit=100,
        )
        self.assertEqual(batch.records, ())
        self.assertEqual(batch.high_water_source_id, "SRC-999")

    def test_duplicate_canonical_identity_is_rejected(self) -> None:
        source = records()
        source[1] = replace(source[1], canonical_id="SPEC-001")
        with self.assertRaises(DuplicateMigrationIdentity):
            plan_batch(
                source,
                batch_id="batch-001",
                after_source_id=None,
                limit=5,
            )

    def test_checksum_binds_revision_and_identity(self) -> None:
        first = records()[0]
        changed = replace(first, source_version=2)
        self.assertNotEqual(first.checksum(), changed.checksum())

    def test_full_parity_opens_reconciliation(self) -> None:
        batch = plan_batch(
            records(),
            batch_id="batch-001",
            after_source_id=None,
            limit=5,
        )
        observed = {
            record.canonical_id: record.checksum()
            for record in batch.records
        }
        self.assertTrue(reconcile(batch, observed).ready_for_cutover)

    def test_checksum_mismatch_closes_cutover(self) -> None:
        batch = plan_batch(
            records(),
            batch_id="batch-001",
            after_source_id=None,
            limit=5,
        )
        observed = {
            record.canonical_id: record.checksum()
            for record in batch.records
        }
        observed["SPEC-003"] = "0" * 64
        result = reconcile(batch, observed)
        with self.assertRaises(CutoverGateClosed):
            authorize_cutover(
                result,
                quality_approver_id="quality-1",
                operations_approver_id="ops-1",
                restore_receipt_id="restore-1",
            )

    def test_source_exception_remains_visible(self) -> None:
        source = records()
        source[1] = replace(
            source[1],
            disposition=MigrationDisposition.EXCEPTION,
            exception_reason="unmapped historical state",
        )
        batch = plan_batch(
            source,
            batch_id="batch-001",
            after_source_id=None,
            limit=5,
        )
        observed = {
            record.canonical_id: record.checksum()
            for record in batch.records
            if record.disposition == MigrationDisposition.READY
        }
        result = reconcile(batch, observed)
        self.assertEqual(result.source_exceptions, ("SRC-002",))

    def test_cutover_requires_two_approvals_and_restore(self) -> None:
        batch = plan_batch(
            records(),
            batch_id="batch-001",
            after_source_id=None,
            limit=5,
        )
        observed = {
            record.canonical_id: record.checksum()
            for record in batch.records
        }
        result = reconcile(batch, observed)
        with self.assertRaises(ValueError):
            authorize_cutover(
                result,
                quality_approver_id="quality-1",
                operations_approver_id="",
                restore_receipt_id="restore-1",
            )
        decision = authorize_cutover(
            result,
            quality_approver_id="quality-1",
            operations_approver_id="ops-1",
            restore_receipt_id="restore-1",
        )
        self.assertIn("quality:quality-1", decision)


class OperationsTests(unittest.TestCase):
    def test_delivery_succeeds_once(self) -> None:
        delivery = Delivery("message-1", "a" * 64)
        sent = dispatch_once(
            delivery,
            send=lambda: None,
            policy=RetryPolicy(3),
        )
        self.assertEqual(sent.status, DeliveryStatus.DELIVERED)
        self.assertEqual(sent.attempts, 1)

    def test_failure_remains_pending_with_budget(self) -> None:
        def fail():
            raise TimeoutError

        attempted = dispatch_once(
            Delivery("message-1", "a" * 64),
            send=fail,
            policy=RetryPolicy(2),
        )
        self.assertEqual(attempted.status, DeliveryStatus.PENDING)
        self.assertEqual(attempted.last_error, "TimeoutError")

    def test_exhausted_delivery_enters_quarantine(self) -> None:
        def fail():
            raise ConnectionError

        first = dispatch_once(
            Delivery("message-1", "a" * 64),
            send=fail,
            policy=RetryPolicy(2),
        )
        second = dispatch_once(
            first,
            send=fail,
            policy=RetryPolicy(2),
        )
        self.assertEqual(second.status, DeliveryStatus.QUARANTINED)

    def test_terminal_delivery_is_stable(self) -> None:
        terminal = Delivery(
            "message-1",
            "a" * 64,
            attempts=1,
            status=DeliveryStatus.DELIVERED,
        )
        self.assertIs(
            dispatch_once(
                terminal,
                send=lambda: None,
                policy=RetryPolicy(3),
            ),
            terminal,
        )

    def test_restore_acceptance_requires_parity_and_reviewer(self) -> None:
        start = datetime(2026, 7, 28, 10, tzinfo=UTC)
        receipt = RestoreReceipt(
            receipt_id="restore-1",
            started_at=start,
            completed_at=start + timedelta(minutes=4),
            expected_artifact_sha256="a" * 64,
            restored_artifact_sha256="a" * 64,
            expected_record_count=100,
            restored_record_count=100,
            reviewer_id="ops-reviewer-1",
        )
        self.assertTrue(receipt.accepted)
        self.assertFalse(replace(receipt, restored_record_count=99).accepted)

    def test_scorecard_keeps_denominator_visible(self) -> None:
        report = score(
            [
                Delivery(
                    "m1",
                    "a" * 64,
                    status=DeliveryStatus.DELIVERED,
                ),
                Delivery(
                    "m2",
                    "b" * 64,
                    status=DeliveryStatus.QUARANTINED,
                ),
            ]
        )
        self.assertEqual(report.attempted, 2)
        self.assertEqual(report.delivery_rate, 0.5)


if __name__ == "__main__":
    unittest.main()


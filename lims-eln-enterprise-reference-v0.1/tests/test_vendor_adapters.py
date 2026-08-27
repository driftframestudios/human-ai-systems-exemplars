from __future__ import annotations

import json
import unittest

from lims_eln_reference.adapters.base import (
    AmbiguousVendorOutcome,
    CompatibilityGateClosed,
    VendorReconciliationConflict,
)
from lims_eln_reference.adapters.benchling import (
    BenchlingWebhookIngress,
    WebhookRejected,
)
from lims_eln_reference.adapters.labkey import LabKeyMigrationAdapter
from lims_eln_reference.adapters.sapio import (
    SapioAdapter,
    SapioCompatibilityManifest,
)
from lims_eln_reference.domain import canonical_sha256


class FakeSapioGateway:
    def __init__(self) -> None:
        self.rows: dict[str, tuple[str, str]] = {}
        self.timeout = False
        self.commit_before_timeout = False
        self.eln: dict[str, tuple[int, str]] = {}

    def commit_record_graph(self, *, request_id, records):
        external_identity = str(records[0]["external_identity"])
        request_sha = canonical_sha256(
            {
                "request_id": request_id,
                "external_identity": external_identity,
                "records": records,
            }
        )
        if self.timeout:
            if self.commit_before_timeout:
                self.rows[request_id] = (external_identity, request_sha)
            raise TimeoutError
        self.rows[request_id] = (external_identity, request_sha)
        return f"sapio-op:{request_id}"

    def read_by_request_id(self, request_id):
        return self.rows.get(request_id)

    def ensure_eln_protocol(
        self, *, managed_key, version, specification_sha256
    ):
        prior = self.eln.get(managed_key)
        if prior is not None and prior[0] == version and prior[1] != specification_sha256:
            raise VendorReconciliationConflict("ELN shape drift")
        self.eln[managed_key] = (version, specification_sha256)
        return f"eln:{managed_key}:{version}"


def compatible_manifest() -> SapioCompatibilityManifest:
    return SapioCompatibilityManifest(
        tenant_release="2026.6",
        sdk_version="2026.6.3.307",
        schema_sha256="a" * 64,
        approved_pairs=frozenset({("2026.6", "2026.6.3.307")}),
    )


class SapioTests(unittest.TestCase):
    def test_compatibility_mismatch_closes_gate(self) -> None:
        gateway = FakeSapioGateway()
        manifest = SapioCompatibilityManifest(
            tenant_release="2025.9",
            sdk_version="2026.6.3.307",
            schema_sha256="a" * 64,
            approved_pairs=frozenset({("2026.6", "2026.6.3.307")}),
        )
        with self.assertRaises(CompatibilityGateClosed):
            SapioAdapter(manifest, gateway)

    def test_record_graph_has_matching_readback(self) -> None:
        adapter = SapioAdapter(compatible_manifest(), FakeSapioGateway())
        receipt = adapter.upsert_accession_graph(
            request_id="request-1",
            external_identity="SYN-001",
            records=({"external_identity": "SYN-001", "type": "Sample"},),
        )
        self.assertEqual(receipt.platform, "sapio")
        self.assertFalse(receipt.reconciled)

    def test_timeout_reads_back_before_resubmission(self) -> None:
        gateway = FakeSapioGateway()
        gateway.timeout = True
        gateway.commit_before_timeout = True
        receipt = SapioAdapter(
            compatible_manifest(), gateway
        ).upsert_accession_graph(
            request_id="request-1",
            external_identity="SYN-001",
            records=({"external_identity": "SYN-001", "type": "Sample"},),
        )
        self.assertTrue(receipt.reconciled)

    def test_absent_timeout_stays_ambiguous(self) -> None:
        gateway = FakeSapioGateway()
        gateway.timeout = True
        with self.assertRaises(AmbiguousVendorOutcome):
            SapioAdapter(
                compatible_manifest(), gateway
            ).upsert_accession_graph(
                request_id="request-1",
                external_identity="SYN-001",
                records=(
                    {"external_identity": "SYN-001", "type": "Sample"},
                ),
            )

    def test_managed_eln_shape_drift_closes_rollout(self) -> None:
        gateway = FakeSapioGateway()
        adapter = SapioAdapter(compatible_manifest(), gateway)
        adapter.ensure_managed_eln(
            managed_key="protocol-a",
            version=1,
            specification={"steps": ["accession"]},
        )
        with self.assertRaises(VendorReconciliationConflict):
            adapter.ensure_managed_eln(
                managed_key="protocol-a",
                version=1,
                specification={"steps": ["changed"]},
            )


class ExactVerifier:
    def __init__(self, expected: bytes) -> None:
        self.expected = expected
        self.seen: bytes | None = None

    def verify(self, *, raw_body, headers):
        self.seen = raw_body
        return raw_body == self.expected and headers.get("signature") == "ok"


class BenchlingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.raw = json.dumps(
            {
                "id": "evt-1",
                "type": "v2.entity.updated",
                "resourceId": "ent-1",
            },
            separators=(",", ":"),
        ).encode()

    def test_signature_uses_exact_raw_body(self) -> None:
        verifier = ExactVerifier(self.raw)
        ingress = BenchlingWebhookIngress(verifier)
        ingress.accept(
            tenant_id="tenant-a",
            raw_body=self.raw,
            headers={"signature": "ok"},
        )
        self.assertEqual(verifier.seen, self.raw)

    def test_invalid_signature_is_rejected(self) -> None:
        ingress = BenchlingWebhookIngress(ExactVerifier(self.raw))
        with self.assertRaises(WebhookRejected):
            ingress.accept(
                tenant_id="tenant-a",
                raw_body=self.raw,
                headers={"signature": "wrong"},
            )

    def test_inbox_and_refresh_job_exist_before_ack(self) -> None:
        ingress = BenchlingWebhookIngress(ExactVerifier(self.raw))
        record, job = ingress.accept(
            tenant_id="tenant-a",
            raw_body=self.raw,
            headers={"signature": "ok"},
        )
        self.assertIn(("tenant-a", "evt-1"), ingress.inbox)
        self.assertIn(job.job_id, ingress.jobs)
        self.assertEqual(job.action, "fetch_current_resource_and_reconcile")
        self.assertEqual(record.status, "accepted")

    def test_duplicate_event_replays_original_job(self) -> None:
        ingress = BenchlingWebhookIngress(ExactVerifier(self.raw))
        first = ingress.accept(
            tenant_id="tenant-a",
            raw_body=self.raw,
            headers={"signature": "ok"},
        )
        second = ingress.accept(
            tenant_id="tenant-a",
            raw_body=self.raw,
            headers={"signature": "ok"},
        )
        self.assertEqual(first, second)


class FakeLabKeyGateway:
    def __init__(self) -> None:
        self.calls: list[str] = []
        self.rows = []
        self.validation_errors: tuple[str, ...] = ()
        self.artifacts: dict[str, bytes] = {}
        self.corrupt_download = False

    def validate_rows(self, *, schema, query, rows):
        self.calls.append("validate")
        return self.validation_errors

    def save_rows(self, *, schema, query, rows, audit_reason):
        self.calls.append(f"save:{audit_reason}")
        self.rows = list(rows)
        return "labkey-op-1"

    def read_rows(self, *, schema, query, external_ids):
        self.calls.append("read")
        return self.rows

    def upload_artifact(self, *, path, content):
        self.artifacts[path] = content
        return path

    def download_artifact(self, *, path):
        content = self.artifacts[path]
        return content + b"corrupt" if self.corrupt_download else content


class LabKeyTests(unittest.TestCase):
    def test_validate_only_precedes_commit_and_readback(self) -> None:
        gateway = FakeLabKeyGateway()
        receipt = LabKeyMigrationAdapter(gateway).write_batch(
            schema="study",
            query="SampleSet",
            rows=[{"externalId": "SYN-001", "state": "received"}],
            audit_reason="migration rehearsal batch 1",
        )
        self.assertEqual(gateway.calls, [
            "validate",
            "save:migration rehearsal batch 1",
            "read",
        ])
        self.assertEqual(receipt.row_count, 1)

    def test_validation_errors_close_write_gate(self) -> None:
        gateway = FakeLabKeyGateway()
        gateway.validation_errors = ("state is invalid",)
        with self.assertRaises(ValueError):
            LabKeyMigrationAdapter(gateway).write_batch(
                schema="study",
                query="SampleSet",
                rows=[{"externalId": "SYN-001"}],
                audit_reason="rehearsal",
            )
        self.assertEqual(gateway.calls, ["validate"])

    def test_batch_requires_audit_reason(self) -> None:
        with self.assertRaises(ValueError):
            LabKeyMigrationAdapter(FakeLabKeyGateway()).write_batch(
                schema="study",
                query="SampleSet",
                rows=[{"externalId": "SYN-001"}],
                audit_reason="",
            )

    def test_artifact_download_sha_must_match(self) -> None:
        gateway = FakeLabKeyGateway()
        adapter = LabKeyMigrationAdapter(gateway)
        self.assertEqual(
            len(adapter.upload_with_parity(path="/SYN-001.csv", content=b"x")),
            64,
        )
        gateway.corrupt_download = True
        with self.assertRaises(VendorReconciliationConflict):
            adapter.upload_with_parity(
                path="/SYN-002.csv",
                content=b"x",
            )


if __name__ == "__main__":
    unittest.main()


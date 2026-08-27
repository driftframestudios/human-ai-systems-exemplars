from __future__ import annotations

import unittest
from datetime import UTC, datetime

from lims_eln_reference.domain import (
    Specimen,
    SpecimenId,
    SpecimenState,
    canonical_sha256,
)
from lims_eln_reference.evidence import (
    ExecutionReceipt,
    TraceLink,
    VerificationResult,
)
from lims_eln_reference.instrument import Disposition, InstrumentInbox
from lims_eln_reference.ports import InMemoryLimsAdapter, MutationDisposition
from lims_eln_reference.security import (
    RequestContext,
    TenantBoundaryViolation,
    redact,
    require_same_tenant,
)
from lims_eln_reference.workflow import LaboratoryWorkflow


class EvidenceSecurityWorkflowTests(unittest.TestCase):
    def test_canonical_hash_is_stable_for_mapping_order(self) -> None:
        self.assertEqual(
            canonical_sha256({"a": 1, "b": 2}),
            canonical_sha256({"b": 2, "a": 1}),
        )

    def test_execution_receipt_is_deterministic_and_traceable(self) -> None:
        receipt = ExecutionReceipt(
            receipt_id="receipt-001",
            source_revision="synthetic-revision-abc123",
            generated_at=datetime(2026, 7, 28, 15, tzinfo=UTC),
            execution_class="verified_running",
            execution_scope="local_offline_synthetic",
            python_version="3.12.13",
            dependency_locks=(),
            trace_links=(
                TraceLink(
                    requirement_id="REQ-LIFECYCLE-01",
                    risk_id="RISK-SILENT-SKIP",
                    control_id="CTRL-EXPLICIT-STATE",
                    test_ids=("test_skip_requires_reason",),
                ),
            ),
            test_results=(
                VerificationResult(
                    test_id="test_skip_requires_reason",
                    outcome="passed",
                    duration_ms=2,
                ),
            ),
            synthetic_data=True,
            limitations=("No configured vendor tenant was exercised.",),
        )
        self.assertEqual(receipt.sha256(), receipt.sha256())
        self.assertIn("REQ-LIFECYCLE-01", receipt.canonical_json())

    def test_request_context_requires_role(self) -> None:
        context = RequestContext(
            tenant_id="tenant-a",
            actor_id="actor-1",
            correlation_id="correlation-1",
            roles=frozenset({"scientist"}),
        )
        context.require_any_role("scientist", "pathologist")
        with self.assertRaises(PermissionError):
            context.require_any_role("administrator")

    def test_tenant_boundary_is_explicit(self) -> None:
        context = RequestContext(
            "tenant-a",
            "actor-1",
            "correlation-1",
            frozenset({"scientist"}),
        )
        require_same_tenant(context, "tenant-a")
        with self.assertRaises(TenantBoundaryViolation):
            require_same_tenant(context, "tenant-b")

    def test_redaction_uses_allowlist_and_sensitive_key_guard(self) -> None:
        safe = redact(
            {
                "specimen_id": "SYN-001",
                "patient_id": "PATIENT-1",
                "api_key": "secret",
                "unapproved": "value",
            },
            allowlist=frozenset(
                {"specimen_id", "patient_id", "api_key"}
            ),
        )
        self.assertEqual(safe["specimen_id"], "SYN-001")
        self.assertEqual(safe["patient_id"], "[REDACTED]")
        self.assertEqual(safe["api_key"], "[REDACTED]")
        self.assertNotIn("unapproved", safe)

    def test_end_to_end_accession_and_instrument_ingress(self) -> None:
        workflow = LaboratoryWorkflow(
            lims=InMemoryLimsAdapter(),
            instrument_inbox=InstrumentInbox(),
        )
        specimen = Specimen(
            SpecimenId("SYN-E2E-001"),
            "tenant-a",
            SpecimenState.RECEIVED,
        )
        accession = workflow.accession(
            specimen=specimen,
            site_id="site-1",
            source_revision=1,
            idempotency_key="accession-e2e-1",
        )
        self.assertEqual(
            accession.mutation.disposition,
            MutationDisposition.CREATED,
        )
        raw = (
            b"message_id,specimen_id,instrument_id,assay_id,"
            b"assay_revision,analyte,value,unit,instrument_time,qc_status\n"
            b"msg-e2e-1,SYN-E2E-001,INST-1,ASSAY-1,1.0,"
            b"yield,41.2,ng/uL,2026-07-28T15:00:00+00:00,pass\n"
        )
        instrument = workflow.ingest_instrument(
            tenant_id="tenant-a",
            raw=raw,
            received_at=datetime(2026, 7, 28, 15, 0, 2, tzinfo=UTC),
        )
        self.assertEqual(instrument.disposition, Disposition.ACCEPTED)
        assert instrument.observation is not None
        self.assertEqual(instrument.observation.specimen_id, "SYN-E2E-001")


if __name__ == "__main__":
    unittest.main()


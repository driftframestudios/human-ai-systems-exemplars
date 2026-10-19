from __future__ import annotations

import json
import importlib.util
import tempfile
import unittest
from pathlib import Path


VALIDATOR_PATH = Path(__file__).resolve().parents[1] / "scripts" / "validate_pack.py"
VALIDATOR_SPEC = importlib.util.spec_from_file_location(
    "lims_eln_validate_pack",
    VALIDATOR_PATH,
)
assert VALIDATOR_SPEC is not None and VALIDATOR_SPEC.loader is not None
validate_pack = importlib.util.module_from_spec(VALIDATOR_SPEC)
VALIDATOR_SPEC.loader.exec_module(validate_pack)


class StrictJsonContractTests(unittest.TestCase):
    def test_duplicate_keys_are_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "duplicate JSON key"):
            json.loads(
                '{"schemaVersion":"1.0","schemaVersion":"2.0"}',
                object_pairs_hook=validate_pack.reject_duplicate_keys,
                parse_constant=validate_pack.reject_nonfinite_constant,
            )

    def test_nonfinite_numbers_are_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "non-finite JSON number"):
            json.loads(
                '{"value":NaN}',
                object_pairs_hook=validate_pack.reject_duplicate_keys,
                parse_constant=validate_pack.reject_nonfinite_constant,
            )

    def test_repository_paths_retain_pack_scope(self) -> None:
        self.assertIsNone(validate_pack.safe_repository_path("../outside.sql"))
        self.assertIsNone(validate_pack.safe_repository_path("/tmp/outside.sql"))
        self.assertIsNotNone(
            validate_pack.safe_repository_path(
                "database/migrations/V001__foundation.sql"
            )
        )


class DatabaseReleaseContractTests(unittest.TestCase):
    def test_flyway_provenance_checksums_and_sequence_pass(self) -> None:
        failures, count = validate_pack.validate_flyway_release()
        self.assertEqual([], failures)
        self.assertEqual(8, count)

    def test_changed_migration_digest_is_detected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            outside = Path(directory) / "V999__changed.sql"
            outside.write_text("select 1;", encoding="utf-8")
            failures: list[str] = []
            value = validate_pack.validate_digest_file(
                {
                    "path": outside.as_posix(),
                    "sha256": "0" * 64,
                },
                "mutation",
                failures,
            )
        self.assertIsNone(value)
        self.assertIn("mutation.path is outside the published pack", failures)

    def test_canonical_sql_uses_native_primitives(self) -> None:
        migration_root = validate_pack.ROOT / "database" / "migrations"
        canonical_sql = "\n".join(
            path.read_text(encoding="utf-8")
            for path in sorted(migration_root.glob("*.sql"))
        ).lower()
        self.assertIn("timestamptz", canonical_sql)
        self.assertIn("control.finite_instant", canonical_sql)
        self.assertIn("is_canonical_rfc3339_instant", canonical_sql)
        self.assertIn("finite_instant_preflight", canonical_sql)
        self.assertIn("finite_instant_conversion", canonical_sql)
        self.assertIn("claimed.lease_expires_at::timestamptz", canonical_sql)
        self.assertIn("numeric(38, 12)", canonical_sql)
        self.assertIn("control.sha256_digest", canonical_sql)
        self.assertIn("jsonb", canonical_sql)
        self.assertIn("boolean not null", canonical_sql)
        self.assertIn("force row level security", canonical_sql)
        self.assertIn("for update skip locked", canonical_sql)
        self.assertNotRegex(
            canonical_sql,
            r"\b[a-z_]*(?:_at|_time|_timestamp)(?:_utc)?\s+text\b",
        )
        self.assertNotRegex(canonical_sql, r"\bsynthetic_data\s+integer\b")

    def test_temporal_boundary_has_static_and_runtime_proofs(self) -> None:
        root = validate_pack.ROOT
        schema_contract = (
            root / "database" / "verify" / "schema_contract.sql"
        ).read_text(encoding="utf-8")
        runtime_contract = (
            root / "database" / "verify" / "tenant_and_immutability_contract.sql"
        ).read_text(encoding="utf-8")
        rehearsal = (root / "scripts" / "run_database_rehearsal.sh").read_text(
            encoding="utf-8"
        )
        flyway_config = (root / "database" / "flyway" / "flyway.conf").read_text(
            encoding="utf-8"
        )
        self.assertIn("persistent control or laboratory columns retain bare timestamptz", schema_contract)
        self.assertIn("'infinity'::control.finite_instant", runtime_contract)
        self.assertIn("'-infinity'::control.finite_instant", runtime_contract)
        self.assertIn("SQL, MDY", runtime_contract)
        self.assertIn("SQL, DMY", runtime_contract)
        self.assertIn("legacyDateStyleIndependence", rehearsal)
        self.assertIn("flyway.baselineOnMigrate=false", flyway_config)
        self.assertIn("flyway.validateOnMigrate=true", flyway_config)

    def test_historical_text_instants_stay_inside_baseline(self) -> None:
        occurrences = []
        for path in (validate_pack.ROOT / "database").rglob("*.sql"):
            content = path.read_text(encoding="utf-8").lower()
            if "updated_at_utc text" in content or "occurred_at_utc text" in content:
                occurrences.append(path.relative_to(validate_pack.ROOT).as_posix())
        self.assertTrue(occurrences)
        self.assertTrue(
            all(value.startswith("database/legacy/v0.1/") for value in occurrences)
        )


class DataPrimitiveLedgerContractTests(unittest.TestCase):
    def test_ledger_has_stable_contiguous_identifiers(self) -> None:
        failures, count = validate_pack.validate_data_primitive_ledger()
        self.assertEqual([], failures)
        self.assertEqual(53, count)

    def test_digest_and_privileged_routine_boundaries_remain_explicit(self) -> None:
        ledger = validate_pack.load_json(validate_pack.DATA_PRIMITIVE_LEDGER)
        findings = {finding["id"]: finding for finding in ledger["findings"]}
        self.assertEqual(
            "open_cross_runtime_canonical_bytes_and_signature_verification_boundary",
            findings["DB-051"]["disposition"],
        )
        self.assertEqual(
            "exact_security_definer_allowlist_and_live_shadow_proof_added",
            findings["DB-052"]["disposition"],
        )
        self.assertEqual(
            "successor_upgrade_head_attestation_added",
            findings["DB-053"]["disposition"],
        )
        self.assertNotIn(
            "payload digest binding",
            findings["DB-006"]["verification"],
        )

    def test_critical_and_high_findings_have_dispositions(self) -> None:
        ledger = validate_pack.load_json(validate_pack.DATA_PRIMITIVE_LEDGER)
        findings = ledger["findings"]
        governed = [
            finding
            for finding in findings
            if finding["severity"] in {"critical", "high"}
        ]
        self.assertGreater(len(governed), 25)
        self.assertTrue(all(finding["disposition"] for finding in governed))
        self.assertTrue(all(finding["verification"] for finding in governed))


class PublicationReceiptContractTests(unittest.TestCase):
    def test_generated_packaging_trees_leave_source_scope_unchanged(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            authored = root / "src" / "laboratory.py"
            authored.parent.mkdir(parents=True)
            authored.write_text("SCHEMA_VERSION = 2\n", encoding="utf-8")

            before = validate_pack.published_files(root)
            before_digest = validate_pack.source_digest(before, root)

            generated = (
                root
                / "build"
                / "lib"
                / "lims_eln_reference"
                / "laboratory.py"
            )
            generated.parent.mkdir(parents=True)
            generated.write_text("SCHEMA_VERSION = 2\n", encoding="utf-8")
            metadata = root / "src" / "reference.egg-info" / "generated.py"
            metadata.parent.mkdir(parents=True)
            metadata.write_text("BUILD = 'generated'\n", encoding="utf-8")

            after = validate_pack.published_files(root)
            after_digest = validate_pack.source_digest(after, root)

        self.assertEqual([authored], before)
        self.assertEqual(before, after)
        self.assertEqual(before_digest, after_digest)

    def test_checked_receipt_matches_current_published_source(self) -> None:
        self.assertEqual([], validate_pack.validate_checked_execution_receipt())


if __name__ == "__main__":
    unittest.main()

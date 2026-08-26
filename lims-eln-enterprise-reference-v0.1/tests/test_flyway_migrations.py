from __future__ import annotations

import re
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VALIDATOR_PATH = ROOT / "scripts" / "validate_pack.py"
VALIDATOR_SPEC = importlib.util.spec_from_file_location(
    "lims_eln_flyway_validate_pack",
    VALIDATOR_PATH,
)
assert VALIDATOR_SPEC is not None and VALIDATOR_SPEC.loader is not None
validate_pack = importlib.util.module_from_spec(VALIDATOR_SPEC)
VALIDATOR_SPEC.loader.exec_module(validate_pack)
FLYWAY_IMAGE = (
    "flyway/flyway:13.0.0-alpine@sha256:"
    "f3c8433401abf859ef9022584c8e6111684363ec490f737e749e9a4705ea32d0"
)


class FlywayReleaseContractTests(unittest.TestCase):
    def test_release_provenance_and_sql_surface_validate(self) -> None:
        failures, count = validate_pack.validate_flyway_release()
        self.assertEqual([], failures)
        self.assertEqual(8, count)

    def test_configuration_uses_safe_enterprise_defaults(self) -> None:
        configuration = "\n".join(
            path.read_text(encoding="utf-8")
            for path in sorted((ROOT / "database" / "flyway").glob("*.conf"))
        )
        for required in (
            "flyway.baselineOnMigrate=false",
            "flyway.cleanDisabled=true",
            "flyway.validateOnMigrate=true",
            "flyway.outOfOrder=false",
            "flyway.validateMigrationNaming=true",
            "flyway.placeholderReplacement=false",
            "filesystem:/workspace/database/flyway/callbacks",
            "filesystem:/workspace/database/flyway/legacy-callbacks",
        ):
            self.assertIn(required, configuration)
        self.assertNotRegex(
            configuration,
            r"(?im)^\s*flyway\.(?:url|user|password)\s*=",
        )
        self.assertNotIn("flyway.initSql", configuration)

    def test_pinned_community_image_is_the_only_execution_coordinate(self) -> None:
        rehearsal = (ROOT / "scripts" / "run_database_rehearsal.sh").read_text(
            encoding="utf-8"
        )
        provenance = validate_pack.load_json(
            ROOT / "database" / "release-provenance.json"
        )
        self.assertIn(f'FLYWAY_IMAGE="{FLYWAY_IMAGE}"', rehearsal)
        self.assertEqual("Flyway Community", provenance["migrationEngine"]["name"])
        self.assertEqual("13.0.0", provenance["migrationEngine"]["version"])
        self.assertEqual(
            FLYWAY_IMAGE.split("@", 1)[1],
            provenance["migrationEngine"]["imageDigest"],
        )
        self.assertNotIn("LIMS_FLYWAY_IMAGE", rehearsal)

    def test_clean_and_upgrade_histories_are_contiguous_and_distinct(self) -> None:
        canonical = sorted((ROOT / "database" / "migrations").glob("V*.sql"))
        upgrade = sorted(
            (ROOT / "database" / "upgrades" / "v0_1_to_v0_2").glob("V*.sql")
        )
        self.assertEqual(
            list(range(1, 9)),
            [int(path.name[1:4]) for path in canonical],
        )
        self.assertEqual(
            list(range(1, 7)),
            [int(path.name[1:4]) for path in upgrade],
        )
        configs = {
            path.name: path.read_text(encoding="utf-8")
            for path in (ROOT / "database" / "flyway").glob("*.conf")
        }
        self.assertIn("flyway_schema_history", configs["canonical.conf"])
        self.assertIn(
            "flyway_legacy_upgrade_history", configs["legacy-upgrade.conf"]
        )

    def test_attestation_precedes_each_explicit_baseline(self) -> None:
        rehearsal = (ROOT / "scripts" / "run_database_rehearsal.sh").read_text(
            encoding="utf-8"
        )
        function_body = rehearsal.split(
            "attest_and_register_legacy_v0_1() {", 1
        )[1].split("\n}", 1)[0]
        attestation = function_body.index("legacy_v0_1_baseline_contract.sql")
        canonical_baseline = function_body.index(
            '"${FLYWAY_CANONICAL_CONFIG}" \\\n    baseline -baselineVersion=0'
        )
        upgrade_baseline = function_body.index(
            '"${FLYWAY_UPGRADE_CONFIG}" \\\n    baseline -baselineVersion=0'
        )
        self.assertLess(attestation, canonical_baseline)
        self.assertLess(canonical_baseline, upgrade_baseline)

    def test_data_movement_group_and_contract_boundary_remain_explicit(self) -> None:
        rehearsal = (ROOT / "scripts" / "run_database_rehearsal.sh").read_text(
            encoding="utf-8"
        )
        self.assertIn("migrate -target=1", rehearsal)
        self.assertIn("migrate -target=4 -group=true", rehearsal)
        fixture = rehearsal.index("legacy_v0_1_contract_authorization.sql")
        security_head = rehearsal.rindex("migrate -target=5", 0, fixture)
        contract = rehearsal.index("migrate -target=6", fixture)
        self.assertLess(security_head, fixture)
        self.assertLess(fixture, contract)
        self.assertIn("count(distinct installed_on)", rehearsal)
        self.assertIn("version::numeric between 2 and 4", rehearsal)
        self.assertIn(
            'run_flyway "${UPGRADE_DATABASE}" "${FLYWAY_UPGRADE_CONFIG}" \\\n'
            "  validate -target=5",
            rehearsal,
        )
        self.assertIn(
            'run_flyway "${CONTRACT_DATABASE}" "${FLYWAY_UPGRADE_CONFIG}" validate',
            rehearsal,
        )
        self.assertNotIn("ignoreMigrationPatterns", rehearsal)

    def test_provenance_authenticates_every_executed_sql_artifact(self) -> None:
        provenance = validate_pack.load_json(
            ROOT / "database" / "release-provenance.json"
        )
        registered = {
            record["path"]: record["sha256"]
            for record in provenance["artifacts"]
        }
        executed = {
            path.relative_to(ROOT).as_posix()
            for directory in (
                ROOT / "database" / "migrations",
                ROOT / "database" / "upgrades" / "v0_1_to_v0_2",
            )
            for path in directory.glob("V*.sql")
        }
        self.assertTrue(executed.issubset(registered))
        self.assertTrue(
            {
                "database/bootstrap/rehearsal_migration_login.sql",
                "database/bootstrap/rehearsal_runtime_logins.sql",
                "database/flyway/callbacks/afterConnect__bounded_owner_delegation.sql",
                "database/flyway/legacy-callbacks/afterConnect__legacy_repeatable_read.sql",
            }.issubset(registered)
        )
        for relative in executed:
            self.assertEqual(
                validate_pack.file_sha256(ROOT / relative),
                registered[relative],
            )

    def test_custom_migration_engine_is_retired(self) -> None:
        for path in (
            ROOT / "scripts" / "run_manifest_migrations.py",
            ROOT / "database" / "migration-manifest.json",
            ROOT / "schema" / "database-migration-manifest.schema.json",
        ):
            self.assertFalse(path.exists())
        security = (
            ROOT / "database" / "verify" / "security_contract.sql"
        ).read_text(encoding="utf-8")
        self.assertIn("public.flyway_schema_history", security)
        self.assertNotIn("migration_control.applied_artifact_history", security)
        callback = (
            ROOT
            / "database"
            / "flyway"
            / "callbacks"
            / "afterConnect__bounded_owner_delegation.sql"
        ).read_text(encoding="utf-8")
        for required in (
            "set role laboratory_owner",
            "not membership.admin_option",
            "not membership.inherit_option",
            "membership.set_option",
            "role=laboratory_owner",
            "direct target-database privileges differ from CONNECT",
            "single reviewed owner edge",
        ):
            self.assertIn(required, callback)


class RuntimeProofStaticTests(unittest.TestCase):
    def test_psql_proof_uses_planner_safe_assertions_and_per_run_roles(self) -> None:
        proof = (
            ROOT / "database" / "verify" / "tenant_and_immutability_contract.sql"
        ).read_text(encoding="utf-8")
        self.assertNotIn("1 / 0", proof)
        self.assertNotIn("create role", proof.lower())
        self.assertNotIn("drop role", proof.lower())
        self.assertIn("\\getenv migration_login FLYWAY_USER", proof)
        self.assertIn(":'tenant_alpha_role'", proof)
        self.assertIn(":'tenant_beta_role'", proof)
        self.assertIn("raise exception using", proof.lower())
        self.assertIn("adversarial_temp_authority_ok", proof)
        verification_sql = "\n".join(
            path.read_text(encoding="utf-8")
            for path in sorted((ROOT / "database" / "verify").glob("*.sql"))
        )
        self.assertNotRegex(verification_sql, r"\b1\s*/\s*0\b")

    def test_security_contract_covers_authority_and_flyway_history(self) -> None:
        contract = (
            ROOT / "database" / "verify" / "security_contract.sql"
        ).read_text(encoding="utf-8").lower()
        for required in (
            "pg_roles",
            "pg_auth_members",
            "pg_policies",
            "relforcerowsecurity",
            "prosecdef",
            "security-definer allowlist requires each released routine exactly once",
            "search_path=pg_catalog, pg_temp",
            "to_regprocedure(allowed.signature)",
            "laboratory.claim_outbox_message(control.nonblank_text,uuid,integer)",
            "has_function_privilege",
            "public.flyway_schema_history",
            "'laboratory_tenant_runtime', current_database(), 'temporary'",
        ):
            self.assertIn(required, contract)

    def test_runtime_proof_exercises_temporary_name_shadowing(self) -> None:
        proof = (
            ROOT / "database" / "verify" / "tenant_and_immutability_contract.sql"
        ).read_text(encoding="utf-8").lower()
        for required in (
            "create temporary table tenant_principal_grant",
            "create temporary table specimen as",
            "create temporary table specimen_event as",
            "create temporary table integration_outbox as",
            "security_definer_temp_identity_proof",
            "security_definer_temp_write_proof",
            "from pg_temp.specimen_event",
            "from pg_temp.integration_outbox",
            "adversarial_temp_authority_ok",
        ):
            self.assertIn(required, proof)

        runtime_bootstrap = (
            ROOT / "database" / "bootstrap" / "rehearsal_runtime_logins.sql"
        ).read_text(encoding="utf-8").lower()
        self.assertIn("grant temporary on database %i to %i", runtime_bootstrap)
        temporary_grant = runtime_bootstrap.split(
            "grant temporary on database %i to %i", 1
        )[1].split(") \\gexec", 1)[0]
        self.assertIn(":'tenant_alpha_role'", temporary_grant)
        self.assertNotIn(":'tenant_beta_role'", temporary_grant)

        rehearsal = (ROOT / "scripts" / "run_database_rehearsal.sh").read_text(
            encoding="utf-8"
        ).lower()
        self.assertIn("revoke connect, temporary on database", rehearsal)

    def test_transient_legacy_digest_uses_migration_executor_authority(self) -> None:
        validation = (
            ROOT
            / "database"
            / "upgrades"
            / "v0_1_to_v0_2"
            / "V003__validate.sql"
        ).read_text(encoding="utf-8").lower()
        function_contract = validation.split(
            "create function control.legacy_v0_1_source_rows_sha256()", 1
        )[1].split(
            "revoke all on function control.legacy_v0_1_source_rows_sha256()", 1
        )[0]
        self.assertIn("security invoker", function_contract)
        self.assertNotIn("security definer", function_contract)
        self.assertNotIn("owner to laboratory_owner", function_contract)

        cutover = (
            ROOT
            / "database"
            / "upgrades"
            / "v0_1_to_v0_2"
            / "V004__cutover.sql"
        ).read_text(encoding="utf-8").lower()
        archive_contract = cutover.split(
            "create function control.legacy_v0_1_archived_rows_sha256()", 1
        )[1].split(
            "revoke all on function control.legacy_v0_1_archived_rows_sha256()", 1
        )[0]
        self.assertIn("security invoker", archive_contract)
        self.assertNotIn("security definer", archive_contract)
        self.assertIn("owner to laboratory_owner", archive_contract)

    def test_contract_sql_uses_an_unambiguous_authorization_alias(self) -> None:
        contract = (
            ROOT
            / "database"
            / "upgrades"
            / "v0_1_to_v0_2"
            / "V006__contract.sql"
        ).read_text(encoding="utf-8").lower()
        self.assertNotRegex(contract, r"\bas\s+authorization\b")
        self.assertIn("legacy_contract_authorization as contract_auth", contract)
        self.assertIn(
            "restore_receipt.restored_migration_head\n"
            "          <> head_record.effective_migration_head",
            contract,
        )
        self.assertIn(
            "evidence.migration_head = head_record.effective_migration_head",
            contract,
        )

    def test_runtime_transition_states_belong_to_the_schema_vocabulary(self) -> None:
        domain = (
            ROOT / "database" / "migrations" / "V002__laboratory_domain.sql"
        ).read_text(encoding="utf-8")
        state_contract = domain.split(
            "constraint specimen_lifecycle_state_ck check (", 1
        )[1].split("),", 1)[0]
        allowed_states = set(re.findall(r"'([^']+)'", state_contract))
        proof = (
            ROOT / "database" / "verify" / "tenant_and_immutability_contract.sql"
        ).read_text(encoding="utf-8")
        exercised_states = set(
            re.findall(
                r"record_specimen_transition\(\s*'[^']+',\s*\d+,\s*'([^']+)'",
                proof,
            )
        )
        self.assertTrue(exercised_states)
        self.assertEqual(set(), exercised_states - allowed_states)

    def test_database_receipt_query_uses_psql_variable_interpolation_input(self) -> None:
        rehearsal = (ROOT / "scripts" / "run_database_rehearsal.sh").read_text(
            encoding="utf-8"
        )
        self.assertIn("<<'SQL'", rehearsal)
        self.assertIn("'databaseVersion', :'postgres_version'", rehearsal)
        self.assertNotIn('--command "select jsonb_pretty', rehearsal)

    def test_observation_write_boundary_guards_numeric_casts(self) -> None:
        migration = (
            ROOT
            / "database"
            / "migrations"
            / "V006__semantic_integrity_and_runtime_boundaries.sql"
        ).read_text(encoding="utf-8")
        function_body = migration.split(
            "create function laboratory.record_result_observation(", 1
        )[1].split(
            "alter function laboratory.record_result_observation(", 1
        )[0]
        for parameter in (
            "p_raw_value",
            "p_lower_detection_limit",
            "p_upper_quantitation_limit",
        ):
            self.assertIn(f"min_scale({parameter}) > 12", function_body)
            self.assertIn(f"abs({parameter})", function_body)
        self.assertIn("abs(derived_canonical_value)", function_body)
        self.assertIn(
            "p_raw_value::text in ('NaN', 'Infinity', '-Infinity')",
            function_body,
        )

    def test_human_cued_workflow_rehearses_supported_postgresql_with_pinned_flyway(
        self,
    ) -> None:
        workflow = (
            ROOT.parent / ".github" / "workflows" / "lims-eln-enterprise-reference.yml"
        ).read_text(encoding="utf-8")
        self.assertIn("workflow_dispatch:", workflow)
        self.assertIn("proof:", workflow)
        self.assertIn("confirm_run:", workflow)
        self.assertIn("vars.ENABLE_GITHUB_ACTIONS == 'true'", workflow)
        self.assertIn("inputs.confirm_run", workflow)
        self.assertIn("retain_database_receipt:", workflow)
        self.assertIn("retention-days: 1", workflow)
        self.assertNotRegex(
            workflow,
            r"(?m)^  (?:pull_request_target|pull_request|push|schedule):",
        )
        self.assertIn('postgresql-major: "16"', workflow)
        self.assertIn('postgresql-major: "18"', workflow)
        self.assertIn("postgres:16-bookworm@sha256:", workflow)
        self.assertIn("postgres:18-bookworm@sha256:", workflow)
        self.assertNotIn("ubuntu-latest", workflow)
        rehearsal = (ROOT / "scripts" / "run_database_rehearsal.sh").read_text(
            encoding="utf-8"
        )
        self.assertIn(FLYWAY_IMAGE, rehearsal)
        self.assertIn('FLYWAY_USER="laboratory_flyway_${RUN_TOKEN}"', rehearsal)
        self.assertNotIn('export FLYWAY_USER="${DB_ADMIN}"', rehearsal)
        docker_block = rehearsal.split("run_flyway() {", 1)[1].split("\n}", 1)[0]
        self.assertNotIn("DB_ADMIN", docker_block)
        self.assertNotIn("LIMS_DB_PASSWORD", docker_block)
        self.assertIn("--env FLYWAY_PASSWORD", docker_block)

    def test_rehearsal_runs_clean_upgrade_and_contract_runtime_proofs(self) -> None:
        rehearsal = (ROOT / "scripts" / "run_database_rehearsal.sh").read_text(
            encoding="utf-8"
        )
        self.assertEqual(3, rehearsal.count("verify_runtime_contracts \\\n"))
        self.assertIn('"${CLEAN_DATABASE}" "${CLEAN_ALPHA_ROLE}"', rehearsal)
        self.assertIn('"${UPGRADE_DATABASE}" "${UPGRADE_ALPHA_ROLE}"', rehearsal)
        self.assertIn(
            '"${CONTRACT_DATABASE}" "${CONTRACT_ALPHA_ROLE}"', rehearsal
        )
        self.assertIn("legacy_v0_1_contract_authorization.sql", rehearsal)
        self.assertIn("baseline -baselineVersion=0", rehearsal)
        self.assertIn("control.schema_semantic_catalog", rehearsal)
        self.assertIn("encode(control.schema_fingerprint(), 'hex')", rehearsal)
        canonical_upgrade = rehearsal.index(
            'run_flyway "${UPGRADE_DATABASE}" "${FLYWAY_CANONICAL_CONFIG}" migrate'
        )
        legacy_upgrade = rehearsal.index(
            'apply_legacy_upgrade_through_cutover "${UPGRADE_DATABASE}"'
        )
        self.assertLess(canonical_upgrade, legacy_upgrade)

    def test_bounded_cross_tenant_migration_keeps_login_and_runtime_separate(self) -> None:
        migration = (
            ROOT
            / "database"
            / "migrations"
            / "V008__bounded_migration_row_security.sql"
        ).read_text(encoding="utf-8").lower()
        for required in (
            "current_session_is_bounded_migration_owner",
            "not login_role.rolsuper",
            "not login_role.rolbypassrls",
            "login_role.rolconnlimit = 8",
            "not membership.inherit_option",
            "membership.set_option",
            "unexpected_membership",
            "role=laboratory_owner",
            "array['connect']::text[]",
            "create policy bounded_migration_scope",
            "for all to laboratory_owner",
        ):
            self.assertIn(required, migration)

        proof = (
            ROOT / "database" / "verify" / "tenant_and_immutability_contract.sql"
        ).read_text(encoding="utf-8").lower()
        self.assertIn("set role none", proof)
        self.assertIn("bounded_migration_login_only_proof", proof)
        self.assertIn("set role laboratory_owner", proof)


if __name__ == "__main__":
    unittest.main()

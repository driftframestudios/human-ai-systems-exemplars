#!/usr/bin/env bash
set -euo pipefail

# TARGET: Flyway applies the immutable SQL history while repository-owned
# attestations prove legacy eligibility, semantic convergence, security, and
# receipt-bound contraction on PostgreSQL 16 and 18.
# VERIFY: clean installation, populated v0.1 adoption, grouped data movement,
# contract authorization, Flyway validation, and post-migrate SQL proofs pass.

PACK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_HOST="${LIMS_DB_HOST:-127.0.0.1}"
DB_PORT="${LIMS_DB_PORT:-5432}"
DB_ADMIN="${LIMS_DB_ADMIN:-postgres}"
DB_PREFIX="${LIMS_DB_PREFIX:-lims_reference}"
RECEIPT_DIR="${LIMS_DB_RECEIPT_DIR:-${TMPDIR:-/tmp}/lims-database-receipts}"
FLYWAY_IMAGE="flyway/flyway:13.0.0-alpine@sha256:f3c8433401abf859ef9022584c8e6111684363ec490f737e749e9a4705ea32d0"
FLYWAY_BASE_CONFIG="/workspace/database/flyway/flyway.conf"
FLYWAY_CANONICAL_CONFIG="/workspace/database/flyway/canonical.conf"
FLYWAY_UPGRADE_CONFIG="/workspace/database/flyway/legacy-upgrade.conf"

if [[ ! "${DB_PREFIX}" =~ ^[a-z][a-z0-9_]{2,40}$ ]]; then
  echo "Database prefix should use a bounded lowercase identifier." >&2
  exit 2
fi

command -v docker >/dev/null 2>&1 || {
  echo "Docker is required to execute the pinned Flyway image." >&2
  exit 2
}

mkdir -p "${RECEIPT_DIR}"

export PGHOST="${DB_HOST}"
export PGPORT="${DB_PORT}"
DB_ADMIN_PASSWORD="${LIMS_DB_PASSWORD:?LIMS_DB_PASSWORD supplies the ephemeral rehearsal administrator credential}"
RUN_TOKEN="$(python3 -c 'import uuid; print(uuid.uuid4().hex[:12])')"
export FLYWAY_USER="laboratory_flyway_${RUN_TOKEN}"
export FLYWAY_PASSWORD="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
export LIMS_TEST_RUNTIME_PASSWORD="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"

CLEAN_DATABASE="${DB_PREFIX}_clean"
UPGRADE_DATABASE="${DB_PREFIX}_upgrade"
CONTRACT_DATABASE="${DB_PREFIX}_contract"
CLEAN_ALPHA_ROLE="laboratory_test_${RUN_TOKEN}_ca"
CLEAN_BETA_ROLE="laboratory_test_${RUN_TOKEN}_cb"
UPGRADE_ALPHA_ROLE="laboratory_test_${RUN_TOKEN}_ua"
UPGRADE_BETA_ROLE="laboratory_test_${RUN_TOKEN}_ub"
CONTRACT_ALPHA_ROLE="laboratory_test_${RUN_TOKEN}_xa"
CONTRACT_BETA_ROLE="laboratory_test_${RUN_TOKEN}_xb"

run_flyway() {
  local database_name="$1"
  local profile_path="$2"
  shift 2
  export FLYWAY_URL="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${database_name}"
  docker run --rm --network host \
    --env FLYWAY_URL \
    --env FLYWAY_USER \
    --env FLYWAY_PASSWORD \
    --volume "${PACK_ROOT}:/workspace:ro" \
    "${FLYWAY_IMAGE}" \
    "-configFiles=${FLYWAY_BASE_CONFIG},${profile_path}" \
    "$@"
}

run_admin_psql() {
  PGUSER="${DB_ADMIN}" PGPASSWORD="${DB_ADMIN_PASSWORD}" \
    psql -X "$@"
}

run_admin_psql_file() {
  local database_name="$1"
  local file_path="$2"
  run_admin_psql --dbname "${database_name}" --set ON_ERROR_STOP=1 \
    --single-transaction --file "${file_path}"
}

run_migration_psql() {
  PGUSER="${FLYWAY_USER}" PGPASSWORD="${FLYWAY_PASSWORD}" \
    psql -X "$@"
}

run_migration_psql_file() {
  local database_name="$1"
  local file_path="$2"
  run_migration_psql --dbname "${database_name}" --set ON_ERROR_STOP=1 \
    --single-transaction \
    --command 'set role laboratory_owner' \
    --file "${file_path}"
}

cleanup_ephemeral_roles() {
  local role_name
  set +e
  revoke_ephemeral_database_access \
    "${CLEAN_DATABASE}" "${CLEAN_ALPHA_ROLE}" "${CLEAN_BETA_ROLE}"
  revoke_ephemeral_database_access \
    "${UPGRADE_DATABASE}" "${UPGRADE_ALPHA_ROLE}" "${UPGRADE_BETA_ROLE}"
  revoke_ephemeral_database_access \
    "${CONTRACT_DATABASE}" "${CONTRACT_ALPHA_ROLE}" "${CONTRACT_BETA_ROLE}"
  for role_name in \
    "${CLEAN_ALPHA_ROLE}" \
    "${CLEAN_BETA_ROLE}" \
    "${UPGRADE_ALPHA_ROLE}" \
    "${UPGRADE_BETA_ROLE}" \
    "${CONTRACT_ALPHA_ROLE}" \
    "${CONTRACT_BETA_ROLE}" \
    "${FLYWAY_USER}"; do
    run_admin_psql --dbname postgres --set ON_ERROR_STOP=1 \
      --set role_name="${role_name}" <<'SQL'
select format('drop role if exists %I', :'role_name') \gexec
SQL
  done
  set -e
}

revoke_ephemeral_database_access() {
  local database_name="$1"
  local alpha_role="$2"
  local beta_role="$3"
  run_admin_psql --dbname postgres --set ON_ERROR_STOP=1 \
    --set database_name="${database_name}" \
    --set migration_login="${FLYWAY_USER}" \
    --set alpha_role="${alpha_role}" \
    --set beta_role="${beta_role}" <<'SQL'
select format(
  'revoke connect, temporary on database %I from %I, %I, %I',
  :'database_name',
  :'migration_login',
  :'alpha_role',
  :'beta_role'
)
where exists (
  select 1 from pg_catalog.pg_database where datname = :'database_name'
) \gexec
SQL
}

trap cleanup_ephemeral_roles EXIT

# Cluster roles remain an explicit infrastructure prerequisite outside Flyway's
# per-database schema history.
run_admin_psql_file postgres "${PACK_ROOT}/database/bootstrap/roles.sql"

PGUSER="${DB_ADMIN}" PGPASSWORD="${DB_ADMIN_PASSWORD}" \
  dropdb --if-exists "${CLEAN_DATABASE}"
PGUSER="${DB_ADMIN}" PGPASSWORD="${DB_ADMIN_PASSWORD}" \
  dropdb --if-exists "${UPGRADE_DATABASE}"
PGUSER="${DB_ADMIN}" PGPASSWORD="${DB_ADMIN_PASSWORD}" \
  dropdb --if-exists "${CONTRACT_DATABASE}"
PGUSER="${DB_ADMIN}" PGPASSWORD="${DB_ADMIN_PASSWORD}" \
  createdb --encoding UTF8 --template template0 "${CLEAN_DATABASE}"
PGUSER="${DB_ADMIN}" PGPASSWORD="${DB_ADMIN_PASSWORD}" \
  createdb --encoding UTF8 --template template0 "${UPGRADE_DATABASE}"
PGUSER="${DB_ADMIN}" PGPASSWORD="${DB_ADMIN_PASSWORD}" \
  createdb --encoding UTF8 --template template0 "${CONTRACT_DATABASE}"

provision_migration_boundary() {
  local database_name="$1"
  run_admin_psql --dbname "${database_name}" --set ON_ERROR_STOP=1 \
    --set database_name="${database_name}" \
    --set migration_login="${FLYWAY_USER}" \
    --single-transaction \
    --file "${PACK_ROOT}/database/bootstrap/rehearsal_migration_login.sql"
}

provision_runtime_logins() {
  local database_name="$1"
  local alpha_role="$2"
  local beta_role="$3"
  run_admin_psql --dbname "${database_name}" --set ON_ERROR_STOP=1 \
    --set database_name="${database_name}" \
    --set tenant_alpha_role="${alpha_role}" \
    --set tenant_beta_role="${beta_role}" \
    --single-transaction \
    --file "${PACK_ROOT}/database/bootstrap/rehearsal_runtime_logins.sql"
}

provision_migration_boundary "${CLEAN_DATABASE}"
provision_migration_boundary "${UPGRADE_DATABASE}"
provision_migration_boundary "${CONTRACT_DATABASE}"
provision_runtime_logins \
  "${CLEAN_DATABASE}" "${CLEAN_ALPHA_ROLE}" "${CLEAN_BETA_ROLE}"
provision_runtime_logins \
  "${UPGRADE_DATABASE}" "${UPGRADE_ALPHA_ROLE}" "${UPGRADE_BETA_ROLE}"
provision_runtime_logins \
  "${CONTRACT_DATABASE}" "${CONTRACT_ALPHA_ROLE}" "${CONTRACT_BETA_ROLE}"

set_database_datestyle() {
  local database_name="$1"
  local date_style="$2"
  run_admin_psql --dbname postgres --set ON_ERROR_STOP=1 \
    --set database_name="${database_name}" \
    --set date_style="${date_style}" <<'SQL'
select format(
  'alter database %I set DateStyle to %L',
  :'database_name',
  :'date_style'
) \gexec
SQL
}

# Opposing ambiguous-date preferences prove that the strict source grammar
# projects the same canonical instants.
set_database_datestyle "${UPGRADE_DATABASE}" 'SQL, DMY'
set_database_datestyle "${CONTRACT_DATABASE}" 'SQL, MDY'

provision_legacy_v0_1() {
  local database_name="$1"
  local source_file
  for source_file in \
    "${PACK_ROOT}/database/legacy/v0.1/001_laboratory_core.sql" \
    "${PACK_ROOT}/database/legacy/v0.1/002_inbox_outbox.sql" \
    "${PACK_ROOT}/database/legacy/v0.1/003_evidence_ledger.sql" \
    "${PACK_ROOT}/database/fixtures/legacy_v0_1_representative.sql"; do
    run_migration_psql_file "${database_name}" "${source_file}"
  done
}

attest_and_register_legacy_v0_1() {
  local database_name="$1"
  run_migration_psql_file \
    "${database_name}" \
    "${PACK_ROOT}/database/verify/legacy_v0_1_baseline_contract.sql"

  # Explicit baseline follows a successful catalog attestation. The disabled
  # baseline-on-migrate setting preserves wrong-target protection.
  run_flyway "${database_name}" "${FLYWAY_CANONICAL_CONFIG}" \
    baseline -baselineVersion=0 \
    -baselineDescription="Attested legacy v0.1 canonical adoption"
  run_flyway "${database_name}" "${FLYWAY_UPGRADE_CONFIG}" \
    baseline -baselineVersion=0 \
    -baselineDescription="Attested legacy v0.1 data upgrade"
}

provision_legacy_v0_1 "${UPGRADE_DATABASE}"
provision_legacy_v0_1 "${CONTRACT_DATABASE}"
attest_and_register_legacy_v0_1 "${UPGRADE_DATABASE}"
attest_and_register_legacy_v0_1 "${CONTRACT_DATABASE}"

# Clean installation and both adopted baselines use the same immutable
# canonical V001..V008 files.
run_flyway "${CLEAN_DATABASE}" "${FLYWAY_CANONICAL_CONFIG}" migrate
run_flyway "${UPGRADE_DATABASE}" "${FLYWAY_CANONICAL_CONFIG}" migrate
run_flyway "${CONTRACT_DATABASE}" "${FLYWAY_CANONICAL_CONFIG}" migrate

apply_legacy_upgrade_through_cutover() {
  local database_name="$1"
  run_flyway "${database_name}" "${FLYWAY_UPGRADE_CONFIG}" \
    migrate -target=1
  # Flyway's group transaction makes backfill, validation, and cutover one
  # atomic release boundary while retaining individual history rows.
  run_flyway "${database_name}" "${FLYWAY_UPGRADE_CONFIG}" \
    migrate -target=4 -group=true
}

apply_legacy_upgrade_through_cutover "${UPGRADE_DATABASE}"
apply_legacy_upgrade_through_cutover "${CONTRACT_DATABASE}"

run_flyway "${UPGRADE_DATABASE}" "${FLYWAY_UPGRADE_CONFIG}" \
  migrate -target=5

# V005 persists the successor head attestation before the contract review binds
# its authorization and restore evidence to the current migration semantics.
run_flyway "${CONTRACT_DATABASE}" "${FLYWAY_UPGRADE_CONFIG}" \
  migrate -target=5
run_migration_psql_file \
  "${CONTRACT_DATABASE}" \
  "${PACK_ROOT}/database/fixtures/legacy_v0_1_contract_authorization.sql"
run_flyway "${CONTRACT_DATABASE}" "${FLYWAY_UPGRADE_CONFIG}" \
  migrate -target=6

for database_name in \
  "${CLEAN_DATABASE}" \
  "${UPGRADE_DATABASE}" \
  "${CONTRACT_DATABASE}"; do
  run_flyway "${database_name}" "${FLYWAY_CANONICAL_CONFIG}" validate
done
# The upgrade rehearsal deliberately retains the separately authorized
# contract migration. An exact Flyway target validates its applied V001–V005
# history, while the contract rehearsal below validates the complete sequence.
run_flyway "${UPGRADE_DATABASE}" "${FLYWAY_UPGRADE_CONFIG}" \
  validate -target=5
run_flyway "${CONTRACT_DATABASE}" "${FLYWAY_UPGRADE_CONFIG}" validate

run_flyway "${CLEAN_DATABASE}" "${FLYWAY_CANONICAL_CONFIG}" \
  info -outputType=json > "${RECEIPT_DIR}/clean-flyway-info.json"
run_flyway "${UPGRADE_DATABASE}" "${FLYWAY_CANONICAL_CONFIG}" \
  info -outputType=json > "${RECEIPT_DIR}/upgrade-canonical-flyway-info.json"
run_flyway "${UPGRADE_DATABASE}" "${FLYWAY_UPGRADE_CONFIG}" \
  info -outputType=json > "${RECEIPT_DIR}/upgrade-data-flyway-info.json"
run_flyway "${CONTRACT_DATABASE}" "${FLYWAY_UPGRADE_CONFIG}" \
  info -outputType=json > "${RECEIPT_DIR}/contract-data-flyway-info.json"

verify_populated_v0_1_adoption() {
  local database_name="$1"
  local expected_upgrade_head="$2"
  run_migration_psql --dbname "${database_name}" --set ON_ERROR_STOP=1 \
    --set expected_upgrade_head="${expected_upgrade_head}" \
    --command 'set role laboratory_owner' --file - <<'SQL'
select
  exists (
    select 1
    from laboratory.specimen
    where external_specimen_id = 'legacy-specimen-001'
      and updated_at = '2026-07-28T14:30:00Z'::timestamptz
  )
  and exists (
    select 1
    from laboratory.specimen_event as event_record
    join laboratory.specimen as specimen
      on specimen.tenant_id = event_record.tenant_id
     and specimen.specimen_id = event_record.specimen_id
    where specimen.external_specimen_id = 'legacy-specimen-001'
      and event_record.occurred_at = '2026-07-28T14:29:00Z'::timestamptz
  ) as legacy_projection_ok
\gset
\if :legacy_projection_ok
  \echo 'Verified populated v0.1 projection and canonical instants'
\else
  \echo 'Populated v0.1 projection differs from the canonical contract'
  \quit 3
\endif

select
  (select count(*) from public.flyway_schema_history
   where type = 'BASELINE' and version::numeric = 0 and success)
  = 1
  and
  (select count(*) from public.flyway_schema_history
   where type = 'SQL' and version::numeric between 1 and 8 and success)
  = 8
  and
  (select count(*) from public.flyway_legacy_upgrade_history
   where type = 'BASELINE' and version::numeric = 0 and success)
  = 1
  and
  (select max(version::numeric) from public.flyway_legacy_upgrade_history
   where type = 'SQL' and success)
  = :'expected_upgrade_head'::numeric
  and
  (select count(distinct installed_on)
   from public.flyway_legacy_upgrade_history
   where type = 'SQL' and version::numeric between 2 and 4 and success)
  = 1 as flyway_history_ok
\gset
\if :flyway_history_ok
  \echo 'Verified explicit baselines, canonical head, grouped upgrade, and expected contract state'
\else
  \echo 'Flyway history differs from the released adoption sequence'
  \quit 3
\endif
SQL
}

verify_populated_v0_1_adoption "${UPGRADE_DATABASE}" 5
verify_populated_v0_1_adoption "${CONTRACT_DATABASE}" 6

verify_runtime_contracts() {
  local database_name="$1"
  local alpha_role="$2"
  local beta_role="$3"

  run_migration_psql_file \
    "${database_name}" "${PACK_ROOT}/database/verify/schema_contract.sql"
  run_migration_psql_file \
    "${database_name}" "${PACK_ROOT}/database/verify/security_contract.sql"
  run_migration_psql --dbname "${database_name}" --set ON_ERROR_STOP=1 \
    --command 'set role laboratory_owner' \
    --set database_name="${database_name}" \
    --set tenant_alpha_role="${alpha_role}" \
    --set tenant_beta_role="${beta_role}" \
    --file "${PACK_ROOT}/database/verify/tenant_and_immutability_contract.sql"
}

verify_runtime_contracts \
  "${CLEAN_DATABASE}" "${CLEAN_ALPHA_ROLE}" "${CLEAN_BETA_ROLE}"
verify_runtime_contracts \
  "${UPGRADE_DATABASE}" "${UPGRADE_ALPHA_ROLE}" "${UPGRADE_BETA_ROLE}"
verify_runtime_contracts \
  "${CONTRACT_DATABASE}" "${CONTRACT_ALPHA_ROLE}" "${CONTRACT_BETA_ROLE}"

semantic_catalog_query="copy (
  select row_to_json(catalog_record)::text
  from control.schema_semantic_catalog as catalog_record
  order by catalog_record.object_kind, catalog_record.object_identity
) to stdout"

run_migration_psql --quiet --dbname "${CLEAN_DATABASE}" --no-align \
  --command 'set role laboratory_owner' \
  --command "${semantic_catalog_query}" \
  > "${RECEIPT_DIR}/clean-schema-semantic-catalog.jsonl"
run_migration_psql --quiet --dbname "${UPGRADE_DATABASE}" --no-align \
  --command 'set role laboratory_owner' \
  --command "${semantic_catalog_query}" \
  > "${RECEIPT_DIR}/upgrade-schema-semantic-catalog.jsonl"
run_migration_psql --quiet --dbname "${CONTRACT_DATABASE}" --no-align \
  --command 'set role laboratory_owner' \
  --command "${semantic_catalog_query}" \
  > "${RECEIPT_DIR}/contract-schema-semantic-catalog.jsonl"

diff --unified \
  "${RECEIPT_DIR}/clean-schema-semantic-catalog.jsonl" \
  "${RECEIPT_DIR}/upgrade-schema-semantic-catalog.jsonl"
diff --unified \
  "${RECEIPT_DIR}/clean-schema-semantic-catalog.jsonl" \
  "${RECEIPT_DIR}/contract-schema-semantic-catalog.jsonl"

CLEAN_FINGERPRINT="$(
  run_migration_psql --quiet --dbname "${CLEAN_DATABASE}" \
    --tuples-only --no-align --command 'set role laboratory_owner' \
    --command "select encode(control.schema_fingerprint(), 'hex')"
)"
UPGRADE_FINGERPRINT="$(
  run_migration_psql --quiet --dbname "${UPGRADE_DATABASE}" \
    --tuples-only --no-align --command 'set role laboratory_owner' \
    --command "select encode(control.schema_fingerprint(), 'hex')"
)"
CONTRACT_FINGERPRINT="$(
  run_migration_psql --quiet --dbname "${CONTRACT_DATABASE}" \
    --tuples-only --no-align --command 'set role laboratory_owner' \
    --command "select encode(control.schema_fingerprint(), 'hex')"
)"
POSTGRES_VERSION="$(
  run_migration_psql --quiet --dbname "${CLEAN_DATABASE}" \
    --tuples-only --no-align --command 'set role laboratory_owner' \
    --command 'show server_version'
)"
CLEAN_CORE_HISTORY_COUNT="$(
  run_migration_psql --quiet --dbname "${CLEAN_DATABASE}" \
    --tuples-only --no-align --command 'set role laboratory_owner' \
    --command 'select count(*) from public.flyway_schema_history where success'
)"
UPGRADE_CORE_HISTORY_COUNT="$(
  run_migration_psql --quiet --dbname "${UPGRADE_DATABASE}" \
    --tuples-only --no-align --command 'set role laboratory_owner' \
    --command 'select count(*) from public.flyway_schema_history where success'
)"
UPGRADE_DATA_HISTORY_COUNT="$(
  run_migration_psql --quiet --dbname "${UPGRADE_DATABASE}" \
    --tuples-only --no-align --command 'set role laboratory_owner' \
    --command 'select count(*) from public.flyway_legacy_upgrade_history where success'
)"
CONTRACT_DATA_HISTORY_COUNT="$(
  run_migration_psql --quiet --dbname "${CONTRACT_DATABASE}" \
    --tuples-only --no-align --command 'set role laboratory_owner' \
    --command 'select count(*) from public.flyway_legacy_upgrade_history where success'
)"
FLYWAY_BOUNDED_CALLER_PROOF="$(
  run_migration_psql --quiet --dbname "${UPGRADE_DATABASE}" \
    --tuples-only --no-align --command 'set role laboratory_owner' \
    --command "
      select jsonb_build_object(
        'sessionUser', session_user,
        'currentUser', current_user,
        'canLogin', login_role.rolcanlogin,
        'superuser', login_role.rolsuper,
        'createDatabase', login_role.rolcreatedb,
        'createRole', login_role.rolcreaterole,
        'inheritOwnerPrivileges', login_role.rolinherit,
        'replication', login_role.rolreplication,
        'bypassRowSecurity', login_role.rolbypassrls,
        'ownerMembership', jsonb_build_object(
          'admin', membership.admin_option,
          'inherit', membership.inherit_option,
          'set', membership.set_option
        ),
        'directTargetDatabasePrivileges', (
          select jsonb_agg(
            privilege_record.privilege_type
            order by privilege_record.privilege_type
          )
          from pg_catalog.pg_database as database_record
          cross join lateral pg_catalog.aclexplode(database_record.datacl)
            as privilege_record
          where database_record.datname = current_database()
            and privilege_record.grantee = login_role.oid
        )
      )::text
      from pg_catalog.pg_roles as login_role
      join pg_catalog.pg_auth_members as membership
        on membership.member = login_role.oid
      join pg_catalog.pg_roles as owner_role
        on owner_role.oid = membership.roleid
      where login_role.rolname = session_user
        and owner_role.rolname = 'laboratory_owner'
    "
)"
BASELINE_CONTRACT_SHA256="$(
  shasum -a 256 "${PACK_ROOT}/database/verify/legacy_v0_1_baseline_contract.sql" \
    | awk '{print $1}'
)"
RELEASE_PROVENANCE_SHA256="$(
  shasum -a 256 "${PACK_ROOT}/database/release-provenance.json" \
    | awk '{print $1}'
)"

if [[ ! "${CLEAN_FINGERPRINT}" =~ ^[0-9a-f]{64}$ ]]; then
  echo "Clean semantic fingerprint should be a lowercase SHA-256 value." >&2
  exit 3
fi
if [[ "${CLEAN_FINGERPRINT}" != "${UPGRADE_FINGERPRINT}" ]] \
   || [[ "${CLEAN_FINGERPRINT}" != "${CONTRACT_FINGERPRINT}" ]]; then
  echo "Clean, upgrade, and contract semantic fingerprints should converge." >&2
  exit 3
fi

run_migration_psql --quiet --dbname "${UPGRADE_DATABASE}" \
  --tuples-only --no-align --command 'set role laboratory_owner' \
  --set clean_fingerprint="${CLEAN_FINGERPRINT}" \
  --set upgrade_fingerprint="${UPGRADE_FINGERPRINT}" \
  --set contract_fingerprint="${CONTRACT_FINGERPRINT}" \
  --set postgres_version="${POSTGRES_VERSION}" \
  --set clean_core_history_count="${CLEAN_CORE_HISTORY_COUNT}" \
  --set upgrade_core_history_count="${UPGRADE_CORE_HISTORY_COUNT}" \
  --set upgrade_data_history_count="${UPGRADE_DATA_HISTORY_COUNT}" \
  --set contract_data_history_count="${CONTRACT_DATA_HISTORY_COUNT}" \
  --set flyway_bounded_caller_proof="${FLYWAY_BOUNDED_CALLER_PROOF}" \
  --set baseline_contract_sha256="${BASELINE_CONTRACT_SHA256}" \
  --set release_provenance_sha256="${RELEASE_PROVENANCE_SHA256}" \
  --file - > "${RECEIPT_DIR}/database-rehearsal-receipt.json" <<'SQL'
select jsonb_pretty(jsonb_build_object(
    'receiptSchemaVersion', '2.0.0',
    'receiptId', 'lims-eln-database-rehearsal-v0.3',
    'observedAt', transaction_timestamp(),
    'databaseEngine', 'PostgreSQL',
    'databaseVersion', :'postgres_version',
    'migrationEngine', 'Flyway Community 13.0.0',
    'migrationEngineImageDigest',
      'sha256:f3c8433401abf859ef9022584c8e6111684363ec490f737e749e9a4705ea32d0',
    'migrationSession', :'flyway_bounded_caller_proof'::jsonb,
    'flywayContainerEnvironmentAllowlist',
      jsonb_build_array('FLYWAY_URL', 'FLYWAY_USER', 'FLYWAY_PASSWORD'),
    'clusterAdministratorScope', 'database_and_role_provisioning_only',
    'ownerDelegationCallback', 'passed_on_every_flyway_connection',
    'canonicalMigrationHead', 8,
    'legacyUpgradeHead', 5,
    'contractUpgradeHead', 6,
    'supportedBaselines', jsonb_build_array('empty', 'v0.1'),
    'cleanSchemaFingerprint', :'clean_fingerprint',
    'upgradeSchemaFingerprint', :'upgrade_fingerprint',
    'contractSchemaFingerprint', :'contract_fingerprint',
    'schemaConvergence',
      :'clean_fingerprint' = :'upgrade_fingerprint'
      and :'clean_fingerprint' = :'contract_fingerprint',
    'cleanCanonicalHistoryCount', :'clean_core_history_count'::integer,
    'upgradeCanonicalHistoryCount', :'upgrade_core_history_count'::integer,
    'upgradeDataHistoryCount', :'upgrade_data_history_count'::integer,
    'contractDataHistoryCount', :'contract_data_history_count'::integer,
    'legacyBaselineContractSha256', :'baseline_contract_sha256',
    'releaseProvenanceSha256', :'release_provenance_sha256',
    'baselineOnMigrate', false,
    'explicitBaselineAfterCatalogAttestation', 'passed',
    'flywayValidation', 'passed_on_all_histories',
    'artifactTransactions', 'flyway_per_migration_with_grouped_v002_to_v004',
    'deploymentSerialization', 'flyway_postgresql_advisory_lock',
    'legacyDateStyleIndependence', 'passed_on_sql_dmy_and_sql_mdy',
    'finiteInstantBoundary', 'passed_on_clean_upgrade_and_contract',
    'tenantIsolation', 'passed_on_clean_upgrade_and_contract',
    'appendOnlyEvidence', 'passed_on_clean_upgrade_and_contract',
    'securityCatalog', 'passed_on_clean_upgrade_and_contract',
    'contractPhase', 'passed_with_persisted_synthetic_authorization_evidence'
  ));
SQL

echo "Database rehearsal passed with semantic fingerprint ${CLEAN_FINGERPRINT}."

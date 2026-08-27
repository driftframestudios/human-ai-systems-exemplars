-- TARGET: a synthetic, fully linked evidence set exercises the separately
-- approved contract phase after the representative v0.1 cutover and V005
-- migration-evidence head attestation.
-- VERIFY: migration, restore, five-domain acceptance, archive, compatibility,
-- and actor coordinates resolve before historical relations are removed.

set search_path = pg_catalog, control, laboratory, public;

do $contract_fixture$
declare
  tenant_coordinate uuid;
  migration_actor uuid;
  review_actor uuid;
  migration_plan_coordinate uuid := control.stable_migration_uuid(
    'lims-eln/contract-fixture', 'migration-plan'
  );
  migration_run_coordinate uuid := control.stable_migration_uuid(
    'lims-eln/contract-fixture', 'migration-run'
  );
  restore_coordinate uuid := control.stable_migration_uuid(
    'lims-eln/contract-fixture', 'restore-receipt'
  );
  evidence_receipt_coordinate uuid := control.stable_migration_uuid(
    'lims-eln/contract-fixture', 'reconciliation-execution-receipt'
  );
  evidence_bundle_digest bytea := sha256(convert_to(
    'synthetic-v0.1-contract-evidence-bundle', 'UTF8'
  ));
  acceptance_domain_name text;
  upgrade_coordinate uuid;
  head_attestation_coordinate uuid;
  source_rows_digest bytea;
  canonical_schema_digest bytea;
  migration_evidence_digest bytea;
  source_row_total bigint;
  target_row_total bigint;
  exception_row_total bigint;
  reconciliation_criterion text;
begin
  select target_id into strict tenant_coordinate
  from control.legacy_identity_map
  where baseline_version = 'v0.1'
    and entity_kind = 'tenant'
    and source_tenant = 'legacy-lab';

  select target_id into strict migration_actor
  from control.legacy_identity_map
  where baseline_version = 'v0.1'
    and entity_kind = 'actor'
    and source_tenant = 'legacy-lab'
    and source_identity = 'legacy-migration-operator';

  select target_id into strict review_actor
  from control.legacy_identity_map
  where baseline_version = 'v0.1'
    and entity_kind = 'actor'
    and source_tenant = 'legacy-lab'
    and source_identity = 'legacy-operator-001';

  select
    receipt_id,
    source_rows_sha256,
    canonical_schema_sha256,
    (
      select sum((population.value ->> 'count')::bigint)
      from jsonb_each(source_population) as population
    ),
    (exception_summary ->> 'total')::bigint
  into strict
    upgrade_coordinate,
    source_rows_digest,
    canonical_schema_digest,
    source_row_total,
    exception_row_total
  from control.legacy_upgrade_receipt
  where baseline_version = 'v0.1';

  select
    attestation_id,
    migration_evidence_sha256
  into strict
    head_attestation_coordinate,
    migration_evidence_digest
  from control.legacy_upgrade_head_attestation
  where upgrade_receipt_id = upgrade_coordinate
    and prior_migration_head = 'V006'
    and effective_migration_head = 'V008'
    and canonical_schema_sha256 = canonical_schema_digest
    and migration_evidence_sha256 = control.migration_evidence_fingerprint();

  target_row_total := source_row_total - exception_row_total;

  insert into laboratory.database_migration_plan (
    tenant_id,
    migration_plan_id,
    plan_version,
    source_schema_fingerprint,
    target_schema_fingerprint,
    source_snapshot_contract,
    transformation_version,
    migration_tool,
    engine_compatibility,
    compatibility_window,
    lock_budget_ms,
    statement_budget_ms,
    recovery_strategy,
    plan_sha256,
    approved_at
  ) values (
    tenant_coordinate,
    migration_plan_coordinate,
    1,
    sha256(convert_to('legacy-v0.1-schema', 'UTF8')),
    canonical_schema_digest,
    'synthetic-source-snapshot-v0.1',
    'v0.2.0',
    'manifest_authenticated_psql_v1',
    'PostgreSQL 16-18',
    jsonb_build_object(
      'openedAt', transaction_timestamp() - interval '2 days',
      'endsAt', transaction_timestamp() - interval '1 minute'
    ),
    5000,
    90000,
    'verified_restore_and_forward_fix',
    sha256(convert_to('synthetic-migration-plan-v0.1-to-v0.2', 'UTF8')),
    transaction_timestamp() - interval '2 days'
  );

  insert into laboratory.database_migration_run (
    tenant_id,
    migration_run_id,
    migration_plan_id,
    plan_version,
    source_snapshot_id,
    run_mode,
    run_state,
    started_at,
    completed_at,
    last_checkpoint
  ) values (
    tenant_coordinate,
    migration_run_coordinate,
    migration_plan_coordinate,
    1,
    'synthetic-v0.1-source-snapshot',
    'cutover',
    'accepted',
    transaction_timestamp() - interval '2 days',
    transaction_timestamp() - interval '1 day',
    jsonb_build_object('phase', 'accepted', 'batch', 1)
  );

  insert into laboratory.database_migration_batch (
    tenant_id,
    migration_run_id,
    batch_number,
    cursor_start,
    cursor_end,
    source_rows,
    target_rows,
    exception_rows,
    batch_sha256,
    started_at,
    completed_at
  ) values (
    tenant_coordinate,
    migration_run_coordinate,
    1,
    null,
    jsonb_build_object('sourcePopulation', 'complete'),
    source_row_total,
    target_row_total,
    exception_row_total,
    sha256(convert_to(
      jsonb_build_object(
        'sourceRows', source_row_total,
        'targetRows', target_row_total,
        'exceptionRows', exception_row_total
      )::text,
      'UTF8'
    )),
    transaction_timestamp() - interval '47 hours',
    transaction_timestamp() - interval '46 hours'
  );

  insert into laboratory.execution_receipt (
    tenant_id,
    receipt_id,
    external_receipt_id,
    receipt_schema_version,
    source_revision,
    source_sha256,
    execution_class,
    execution_scope,
    qualification_stage,
    environment_document,
    database_engine,
    database_version,
    migration_head,
    schema_fingerprint,
    artifact_bindings,
    limitations,
    synthetic_data,
    performed_by,
    reviewed_by,
    observed_at
  ) values (
    tenant_coordinate,
    evidence_receipt_coordinate,
    'synthetic-v0.1-contract-reconciliation',
    '1.0.0',
    'v0.2.2-post-head-contract-review',
    source_rows_digest,
    'verified_running',
    'v0.1-to-v0.2-contract-rehearsal',
    'migration_rehearsal_open',
    jsonb_build_object(
      'evidenceClass', 'disposable_rehearsal',
      'sourceBaseline', 'v0.1',
      'synthetic', true
    ),
    'PostgreSQL',
    current_setting('server_version'),
    'V008',
    canonical_schema_digest,
    jsonb_build_array(
      jsonb_build_object(
        'upgradeReceiptId', upgrade_coordinate,
        'headAttestationId', head_attestation_coordinate,
        'effectiveMigrationHead', 'V008',
        'migrationRunId', migration_run_coordinate,
        'sourceRowsSha256', encode(source_rows_digest, 'hex'),
        'migrationEvidenceSha256', encode(migration_evidence_digest, 'hex')
      )
    ),
    jsonb_build_array(
      'The fixture demonstrates post-V005 contract review mechanics with synthetic identities.',
      'Environment-bound accountable acceptance remains an adoption responsibility.'
    ),
    true,
    migration_actor,
    review_actor,
    transaction_timestamp() - interval '45 hours'
  );

  foreach reconciliation_criterion in array array[
    'source_row_count',
    'target_projection_count',
    'source_row_manifest',
    'restore_row_manifest',
    'exception_closure'
  ]
  loop
    insert into laboratory.data_reconciliation_result (
      tenant_id,
      reconciliation_result_id,
      migration_run_id,
      criterion_code,
      criterion_version,
      cohort_query_sha256,
      value_kind,
      expected_value,
      observed_value,
      tolerance_value,
      unit_code,
      result_state,
      exception_count,
      evidence_receipt_id,
      observed_at
    ) values (
      tenant_coordinate,
      control.stable_migration_uuid(
        'lims-eln/contract-fixture/reconciliation',
        reconciliation_criterion
      ),
      migration_run_coordinate,
      reconciliation_criterion,
      '1.0.0',
      sha256(convert_to(reconciliation_criterion || ':v1', 'UTF8')),
      case
        when reconciliation_criterion in (
          'source_row_count', 'target_projection_count', 'exception_closure'
        ) then 'exact_count'
        else 'checksum_count'
      end,
      case reconciliation_criterion
        when 'source_row_count' then source_row_total
        when 'target_projection_count' then target_row_total
        when 'exception_closure' then exception_row_total
        else 1
      end,
      case reconciliation_criterion
        when 'source_row_count' then source_row_total
        when 'target_projection_count' then target_row_total
        when 'exception_closure' then exception_row_total
        else 1
      end,
      0,
      case
        when reconciliation_criterion in (
          'source_row_manifest', 'restore_row_manifest'
        ) then 'sha256_manifest'
        else 'row'
      end,
      'passed',
      0,
      evidence_receipt_coordinate,
      transaction_timestamp() - interval '44 hours'
    );
  end loop;

  insert into laboratory.restore_receipt (
    tenant_id,
    restore_receipt_id,
    migration_run_id,
    backup_coordinate,
    backup_sha256,
    restored_schema_fingerprint,
    restored_migration_head,
    row_manifest_sha256,
    rpo_seconds,
    rto_milliseconds,
    restore_state,
    performed_by,
    reviewed_by,
    started_at,
    completed_at
  ) values (
    tenant_coordinate,
    restore_coordinate,
    migration_run_coordinate,
    's3://synthetic-rehearsal/legacy-v0.1/source-archive',
    source_rows_digest,
    canonical_schema_digest,
    'V008',
    source_rows_digest,
    0,
    45000,
    'passed',
    migration_actor,
    review_actor,
    transaction_timestamp() - interval '36 hours',
    transaction_timestamp() - interval '35 hours'
  );

  foreach acceptance_domain_name in array array[
    'scientific', 'quality', 'regulatory', 'security', 'operations'
  ]
  loop
    insert into laboratory.acceptance_decision (
      tenant_id,
      decision_id,
      acceptance_domain,
      intended_use_id,
      release_claim_id,
      evidence_bundle_sha256,
      migration_run_id,
      restore_receipt_id,
      approver_id,
      decision,
      rationale,
      policy_version,
      decided_at
    ) values (
      tenant_coordinate,
      control.stable_migration_uuid(
        'lims-eln/contract-fixture/acceptance',
        acceptance_domain_name
      ),
      acceptance_domain_name,
      'legacy-v0.1-contract-rehearsal',
      'release-v0.2.0',
      evidence_bundle_digest,
      migration_run_coordinate,
      restore_coordinate,
      case
        when acceptance_domain_name in ('scientific', 'quality', 'regulatory')
          then review_actor
        else migration_actor
      end,
      'accepted',
      'synthetic evidence satisfies the declared contract-phase gate',
      'contract-policy-v2-head-attested',
      transaction_timestamp() - interval '1 day'
    );
  end loop;

  insert into control.legacy_contract_authorization (
    authorization_id,
    baseline_version,
    source_tenant,
    tenant_id,
    upgrade_receipt_id,
    migration_run_id,
    restore_receipt_id,
    evidence_bundle_sha256,
    source_archive_coordinate,
    source_archive_sha256,
    authorized_by,
    policy_version,
    authorized_at,
    compatibility_ends_at
  ) values (
    control.stable_migration_uuid(
      'lims-eln/contract-fixture', 'legacy-lab-authorization'
    ),
    'v0.1',
    'legacy-lab',
    tenant_coordinate,
    upgrade_coordinate,
    migration_run_coordinate,
    restore_coordinate,
    evidence_bundle_digest,
    's3://synthetic-rehearsal/legacy-v0.1/source-archive',
    source_rows_digest,
    review_actor,
    'contract-policy-v2-head-attested',
    transaction_timestamp() - interval '2 days',
    transaction_timestamp() - interval '1 minute'
  );
end
$contract_fixture$;

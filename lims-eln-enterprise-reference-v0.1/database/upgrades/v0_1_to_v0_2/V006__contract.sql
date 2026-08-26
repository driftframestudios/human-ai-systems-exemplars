-- TARGET: contract cleanup removes the read-only compatibility surface after
-- every source tenant carries restore and five-domain acceptance evidence.
-- GUARD: persisted evidence, elapsed compatibility windows, closed conditions,
-- source archiving, and the unchanged canonical fingerprint authorize cleanup.

set lock_timeout = '5s';
set statement_timeout = '90s';
set search_path = pg_catalog, control, laboratory, public;

select pg_advisory_xact_lock(hashtextextended('lims-eln-v0.1-to-v0.2', 0));

lock table
  public.legacy_v0_1_specimen,
  public.legacy_v0_1_specimen_event,
  public.legacy_v0_1_custody_position,
  public.legacy_v0_1_idempotency_reservation,
  public.legacy_v0_1_integration_inbox,
  public.legacy_v0_1_integration_outbox,
  public.legacy_v0_1_execution_receipt,
  public.legacy_v0_1_trace_link,
  public.legacy_v0_1_open_receipt
in access exclusive mode;

do $contract_guard$
declare
  upgrade_record control.legacy_upgrade_receipt%rowtype;
  head_record control.legacy_upgrade_head_attestation%rowtype;
begin
  select * into upgrade_record
  from control.legacy_upgrade_receipt
  where baseline_version = 'v0.1';

  if not found then
    raise exception using
      errcode = '55000',
      message = 'contract cleanup requires the immutable cutover receipt';
  end if;
  if upgrade_record.migration_head <> 'V006'
     or upgrade_record.canonical_schema_sha256 <> control.schema_fingerprint() then
    raise exception using
      errcode = '55000',
      message = 'canonical schema semantics advanced after cutover; repeat compatibility review';
  end if;

  select * into head_record
  from control.legacy_upgrade_head_attestation
  where upgrade_receipt_id = upgrade_record.receipt_id;

  if not found
     or head_record.prior_migration_head <> upgrade_record.migration_head
     or head_record.effective_migration_head <> 'V008'
     or head_record.canonical_schema_sha256 <> control.schema_fingerprint()
     or head_record.migration_evidence_sha256
       <> control.migration_evidence_fingerprint() then
    raise exception using
      errcode = '55000',
      message = 'post-V005 migration evidence review differs; repeat compatibility review';
  end if;
  if upgrade_record.source_rows_sha256
      <> control.legacy_v0_1_archived_rows_sha256() then
    raise exception using
      errcode = '40001',
      message = 'the archived v0.1 source population differs from the cutover receipt';
  end if;
  if exists (
    select 1
    from control.legacy_upgrade_exception
    where baseline_version = 'v0.1'
      and disposition = 'open'
  ) then
    raise exception using
      errcode = '55000',
      message = 'contract cleanup awaits an accountable disposition for every exception';
  end if;

  if exists (
    select 1
    from control.legacy_identity_map as source_tenant
    left join control.legacy_contract_authorization as contract_auth
      on contract_auth.baseline_version = source_tenant.baseline_version
     and contract_auth.source_tenant = source_tenant.source_tenant
     and contract_auth.tenant_id = source_tenant.target_id
     and contract_auth.upgrade_receipt_id = upgrade_record.receipt_id
    where source_tenant.baseline_version = 'v0.1'
      and source_tenant.entity_kind = 'tenant'
      and (
        contract_auth.authorization_id is null
        or contract_auth.compatibility_ends_at > transaction_timestamp()
        or contract_auth.recorded_at < upgrade_record.cutover_at
        or contract_auth.source_archive_sha256
          <> upgrade_record.source_rows_sha256
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'each source tenant requires an elapsed, receipt-bound contract authorization';
  end if;

  if exists (
    select 1
    from control.legacy_contract_authorization as contract_auth
    left join laboratory.database_migration_run as migration_run
     on migration_run.tenant_id = contract_auth.tenant_id
     and migration_run.migration_run_id = contract_auth.migration_run_id
    left join laboratory.database_migration_plan as migration_plan
      on migration_plan.tenant_id = migration_run.tenant_id
     and migration_plan.migration_plan_id = migration_run.migration_plan_id
     and migration_plan.plan_version = migration_run.plan_version
    left join laboratory.restore_receipt as restore_receipt
      on restore_receipt.tenant_id = contract_auth.tenant_id
     and restore_receipt.migration_run_id = contract_auth.migration_run_id
     and restore_receipt.restore_receipt_id = contract_auth.restore_receipt_id
    where contract_auth.baseline_version = 'v0.1'
      and (
        migration_run.run_state <> 'accepted'
        or restore_receipt.restore_state <> 'passed'
        or migration_plan.target_schema_fingerprint
          <> upgrade_record.canonical_schema_sha256
        or restore_receipt.restored_schema_fingerprint
          <> upgrade_record.canonical_schema_sha256
        or restore_receipt.restored_migration_head
          <> head_record.effective_migration_head
        or restore_receipt.row_manifest_sha256
          <> upgrade_record.source_rows_sha256
        or contract_auth.source_archive_sha256
          <> control.legacy_v0_1_archived_rows_sha256()
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'contract authorization requires an accepted migration run and passed restore receipt';
  end if;

  if exists (
    select 1
    from control.legacy_contract_authorization as contract_auth
    where contract_auth.baseline_version = 'v0.1'
      and (
        select count(*) = 0
          or sum(migration_batch.source_rows) < 0
          or sum(migration_batch.source_rows)
            <> sum(migration_batch.target_rows)
              + sum(migration_batch.exception_rows)
        from laboratory.database_migration_batch as migration_batch
        where migration_batch.tenant_id = contract_auth.tenant_id
          and migration_batch.migration_run_id = contract_auth.migration_run_id
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'contract authorization requires at least one immutable migration batch receipt';
  end if;

  if exists (
    select 1
    from control.legacy_contract_authorization as contract_auth
    where contract_auth.baseline_version = 'v0.1'
      and (
        select count(distinct reconciliation.criterion_code)
        from laboratory.data_reconciliation_result as reconciliation
        join laboratory.execution_receipt as evidence
          on evidence.tenant_id = reconciliation.tenant_id
         and evidence.receipt_id = reconciliation.evidence_receipt_id
        where reconciliation.tenant_id = contract_auth.tenant_id
          and reconciliation.migration_run_id = contract_auth.migration_run_id
          and reconciliation.criterion_code in (
            'source_row_count',
            'target_projection_count',
            'source_row_manifest',
            'restore_row_manifest',
            'exception_closure'
          )
          and reconciliation.result_state = 'passed'
          and abs(
            reconciliation.expected_value - reconciliation.observed_value
          ) <= reconciliation.tolerance_value
          and reconciliation.exception_count = 0
          and evidence.schema_fingerprint = upgrade_record.canonical_schema_sha256
          and evidence.migration_head = head_record.effective_migration_head
          and evidence.source_sha256 = upgrade_record.source_rows_sha256
      ) <> 5
  ) then
    raise exception using
      errcode = '55000',
      message = 'contract authorization requires five receipt-bound reconciliation criteria';
  end if;

  if exists (
    select 1
    from control.legacy_contract_authorization as contract_auth
    where contract_auth.baseline_version = 'v0.1'
      and (
        select count(distinct acceptance.acceptance_domain)
        from laboratory.acceptance_decision as acceptance
        where acceptance.tenant_id = contract_auth.tenant_id
          and acceptance.migration_run_id = contract_auth.migration_run_id
          and acceptance.restore_receipt_id = contract_auth.restore_receipt_id
          and acceptance.evidence_bundle_sha256 = contract_auth.evidence_bundle_sha256
          and acceptance.acceptance_domain in (
            'scientific', 'quality', 'regulatory', 'security', 'operations'
          )
          and acceptance.decision in ('accepted', 'accepted_with_conditions')
          and not exists (
            select 1
            from laboratory.acceptance_decision as superseding
            where superseding.tenant_id = acceptance.tenant_id
              and superseding.supersedes_decision_id = acceptance.decision_id
          )
      ) <> 5
  ) then
    raise exception using
      errcode = '55000',
      message = 'contract authorization requires current acceptance across five accountable domains';
  end if;

  if exists (
    select 1
    from control.legacy_contract_authorization as contract_auth
    join laboratory.acceptance_decision as acceptance
      on acceptance.tenant_id = contract_auth.tenant_id
     and acceptance.migration_run_id = contract_auth.migration_run_id
     and acceptance.restore_receipt_id = contract_auth.restore_receipt_id
     and acceptance.evidence_bundle_sha256 = contract_auth.evidence_bundle_sha256
    join laboratory.acceptance_condition_current as condition
      on condition.tenant_id = acceptance.tenant_id
     and condition.decision_id = acceptance.decision_id
    where contract_auth.baseline_version = 'v0.1'
      and condition.current_condition_state = 'open'
      and not exists (
        select 1
        from laboratory.acceptance_decision as superseding
        where superseding.tenant_id = acceptance.tenant_id
          and superseding.supersedes_decision_id = acceptance.decision_id
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'contract authorization awaits closure of every acceptance condition';
  end if;

  if exists (
    select 1
    from control.legacy_contract_authorization as contract_auth
    join laboratory.acceptance_decision as acceptance
      on acceptance.tenant_id = contract_auth.tenant_id
     and acceptance.migration_run_id = contract_auth.migration_run_id
     and acceptance.restore_receipt_id = contract_auth.restore_receipt_id
     and acceptance.evidence_bundle_sha256 = contract_auth.evidence_bundle_sha256
    where contract_auth.baseline_version = 'v0.1'
      and acceptance.decision = 'accepted_with_conditions'
      and not exists (
        select 1
        from laboratory.acceptance_decision as superseding
        where superseding.tenant_id = acceptance.tenant_id
          and superseding.supersedes_decision_id = acceptance.decision_id
      )
      and not exists (
        select 1
        from laboratory.acceptance_condition_current as condition
        where condition.tenant_id = acceptance.tenant_id
          and condition.decision_id = acceptance.decision_id
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'conditional acceptance requires at least one governed condition';
  end if;
end
$contract_guard$;

insert into control.legacy_contract_receipt (
  contract_receipt_id,
  upgrade_receipt_id,
  authorization_set_sha256,
  dropped_relation_manifest
)
select
  control.stable_migration_uuid('lims-eln/contract-receipt', 'v0.1-to-v0.2'),
  upgrade_receipt.receipt_id,
  sha256(convert_to(coalesce((
    select string_agg(to_jsonb(authorization_record)::text, E'\n'
      order by authorization_record.source_tenant)
    from control.legacy_contract_authorization as authorization_record
    where authorization_record.baseline_version = 'v0.1'
  ), ''), 'UTF8')),
  jsonb_build_array(
    jsonb_build_object(
      'relation', 'public.legacy_v0_1_specimen',
      'rows', (select count(*) from public.legacy_v0_1_specimen)
    ),
    jsonb_build_object(
      'relation', 'public.legacy_v0_1_specimen_event',
      'rows', (select count(*) from public.legacy_v0_1_specimen_event)
    ),
    jsonb_build_object(
      'relation', 'public.legacy_v0_1_custody_position',
      'rows', (select count(*) from public.legacy_v0_1_custody_position)
    ),
    jsonb_build_object(
      'relation', 'public.legacy_v0_1_idempotency_reservation',
      'rows', (select count(*) from public.legacy_v0_1_idempotency_reservation)
    ),
    jsonb_build_object(
      'relation', 'public.legacy_v0_1_integration_inbox',
      'rows', (select count(*) from public.legacy_v0_1_integration_inbox)
    ),
    jsonb_build_object(
      'relation', 'public.legacy_v0_1_integration_outbox',
      'rows', (select count(*) from public.legacy_v0_1_integration_outbox)
    ),
    jsonb_build_object(
      'relation', 'public.legacy_v0_1_execution_receipt',
      'rows', (select count(*) from public.legacy_v0_1_execution_receipt)
    ),
    jsonb_build_object(
      'relation', 'public.legacy_v0_1_trace_link',
      'rows', (select count(*) from public.legacy_v0_1_trace_link)
    ),
    jsonb_build_object(
      'relation', 'public.legacy_v0_1_open_receipt',
      'rows', (select count(*) from public.legacy_v0_1_open_receipt)
    )
  )
from control.legacy_upgrade_receipt as upgrade_receipt
where upgrade_receipt.baseline_version = 'v0.1';

drop table public.legacy_v0_1_trace_link;
drop table public.legacy_v0_1_open_receipt;
drop table public.legacy_v0_1_execution_receipt;
drop table public.legacy_v0_1_integration_outbox;
drop table public.legacy_v0_1_integration_inbox;
drop table public.legacy_v0_1_idempotency_reservation;
drop table public.legacy_v0_1_custody_position;
drop table public.legacy_v0_1_specimen_event;
drop table public.legacy_v0_1_specimen;

drop function control.legacy_compatibility_read_only();
drop function control.legacy_v0_1_archived_rows_sha256();
drop function control.legacy_v0_1_representation_manifest();

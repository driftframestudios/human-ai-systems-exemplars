-- TARGET: cutover advances after complete representation and freezes the exact
-- validated source population behind a read-only compatibility surface.
-- VERIFY: an immutable receipt binds row digests, exception closure, canonical
-- schema semantics, and the separately governed contract-authorization model.

set lock_timeout = '5s';
set statement_timeout = '90s';
set search_path = pg_catalog, control, laboratory, public;

select pg_advisory_xact_lock(hashtextextended('lims-eln-v0.1-to-v0.2', 0));

lock table
  public.specimen,
  public.specimen_event,
  public.custody_position,
  public.idempotency_reservation,
  public.integration_inbox,
  public.integration_outbox,
  public.execution_receipt,
  public.trace_link,
  public.open_receipt
in access exclusive mode;

do $cutover_preflight$
declare
  validation_record control.legacy_upgrade_validation%rowtype;
  current_representation_manifest jsonb;
begin
  select * into validation_record
  from control.legacy_upgrade_validation
  where baseline_version = 'v0.1';

  if not found then
    raise exception using
      errcode = '55000',
      message = 'cutover requires the immutable v0.1 validation receipt';
  end if;
  if validation_record.migration_head <> 'V006' then
    raise exception using
      errcode = '55000',
      message = 'cutover validation belongs to another canonical migration head';
  end if;
  if validation_record.source_rows_sha256
      <> control.legacy_v0_1_source_rows_sha256() then
    raise exception using
      errcode = '40001',
      message = 'legacy source rows advanced after validation; repeat backfill and validation';
  end if;
  current_representation_manifest :=
    control.legacy_v0_1_representation_manifest();
  if validation_record.representation_manifest_sha256
      <> sha256(convert_to(current_representation_manifest::text, 'UTF8')) then
    raise exception using
      errcode = '40001',
      message = 'source-to-target representation advanced after validation; repeat backfill and validation';
  end if;
  if exists (
    select 1
    from control.legacy_upgrade_exception
    where baseline_version = 'v0.1'
      and disposition = 'open'
  ) then
    raise exception using
      errcode = '55000',
      message = 'cutover awaits an accountable disposition for every legacy exception';
  end if;
end
$cutover_preflight$;

create table control.legacy_upgrade_receipt (
  receipt_id uuid not null,
  validation_id uuid not null,
  baseline_version text not null,
  migration_head text not null,
  source_manifest_sha256 bytea not null,
  source_rows_sha256 bytea not null,
  representation_manifest_sha256 bytea not null,
  canonical_schema_sha256 bytea not null,
  migration_evidence_sha256 bytea not null,
  source_population jsonb not null,
  target_population jsonb not null,
  exception_summary jsonb not null,
  cutover_at control.finite_instant not null default transaction_timestamp(),
  constraint legacy_upgrade_receipt_pk primary key (receipt_id),
  constraint legacy_upgrade_receipt_validation_fk foreign key (validation_id)
    references control.legacy_upgrade_validation (validation_id)
    on update restrict on delete restrict,
  constraint legacy_upgrade_receipt_baseline_uq unique (baseline_version),
  constraint legacy_upgrade_receipt_digest_ck check (
    octet_length(source_manifest_sha256) = 32
    and octet_length(source_rows_sha256) = 32
    and octet_length(representation_manifest_sha256) = 32
    and octet_length(canonical_schema_sha256) = 32
    and octet_length(migration_evidence_sha256) = 32
  ),
  constraint legacy_upgrade_receipt_document_ck check (
    jsonb_typeof(source_population) = 'object'
    and jsonb_typeof(target_population) = 'object'
    and jsonb_typeof(exception_summary) = 'object'
  )
);

create table control.legacy_contract_authorization (
  authorization_id uuid not null,
  baseline_version text not null,
  source_tenant text not null,
  tenant_id uuid not null,
  upgrade_receipt_id uuid not null,
  migration_run_id uuid not null,
  restore_receipt_id uuid not null,
  evidence_bundle_sha256 bytea not null,
  source_archive_coordinate text not null,
  source_archive_sha256 bytea not null,
  authorized_by uuid not null,
  policy_version text not null,
  authorized_at control.finite_instant not null,
  minimum_compatibility_interval interval not null default interval '24 hours',
  compatibility_ends_at control.finite_instant not null,
  recorded_at control.finite_instant not null default transaction_timestamp(),
  constraint legacy_contract_authorization_pk primary key (authorization_id),
  constraint legacy_contract_authorization_source_uq unique (
    baseline_version,
    source_tenant
  ),
  constraint legacy_contract_authorization_tenant_fk foreign key (tenant_id)
    references laboratory.tenant (tenant_id)
    on update restrict on delete restrict,
  constraint legacy_contract_authorization_upgrade_fk foreign key (
    upgrade_receipt_id
  ) references control.legacy_upgrade_receipt (receipt_id)
    on update restrict on delete restrict,
  constraint legacy_contract_authorization_run_fk foreign key (
    tenant_id,
    migration_run_id
  ) references laboratory.database_migration_run (
    tenant_id,
    migration_run_id
  ) on update restrict on delete restrict,
  constraint legacy_contract_authorization_restore_fk foreign key (
    tenant_id,
    migration_run_id,
    restore_receipt_id
  ) references laboratory.restore_receipt (
    tenant_id,
    migration_run_id,
    restore_receipt_id
  ) on update restrict on delete restrict,
  constraint legacy_contract_authorization_actor_fk foreign key (
    tenant_id,
    authorized_by
  ) references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint legacy_contract_authorization_digest_ck check (
    octet_length(evidence_bundle_sha256) = 32
    and octet_length(source_archive_sha256) = 32
  ),
  constraint legacy_contract_authorization_archive_coordinate_ck check (
    source_archive_coordinate = btrim(source_archive_coordinate)
    and char_length(source_archive_coordinate) between 1 and 512
  ),
  constraint legacy_contract_authorization_window_ck check (
    minimum_compatibility_interval >= interval '0 seconds'
    and compatibility_ends_at
      >= authorized_at + minimum_compatibility_interval
    and recorded_at >= authorized_at
  )
);

create table control.legacy_contract_receipt (
  contract_receipt_id uuid not null,
  upgrade_receipt_id uuid not null,
  authorization_set_sha256 bytea not null,
  dropped_relation_manifest jsonb not null,
  completed_at control.finite_instant not null default transaction_timestamp(),
  constraint legacy_contract_receipt_pk primary key (contract_receipt_id),
  constraint legacy_contract_receipt_upgrade_fk foreign key (upgrade_receipt_id)
    references control.legacy_upgrade_receipt (receipt_id)
    on update restrict on delete restrict,
  constraint legacy_contract_receipt_digest_ck check (
    octet_length(authorization_set_sha256) = 32
  ),
  constraint legacy_contract_receipt_manifest_ck check (
    jsonb_typeof(dropped_relation_manifest) = 'array'
  )
);

alter table control.legacy_upgrade_receipt owner to laboratory_owner;
alter table control.legacy_contract_authorization owner to laboratory_owner;
alter table control.legacy_contract_receipt owner to laboratory_owner;
revoke all on control.legacy_upgrade_receipt from public;
revoke all on control.legacy_contract_authorization from public;
revoke all on control.legacy_contract_receipt from public;

create trigger legacy_upgrade_receipt_append_only
before update or delete on control.legacy_upgrade_receipt
for each row execute function control.preserve_append_only_record();
create trigger legacy_contract_authorization_append_only
before update or delete on control.legacy_contract_authorization
for each row execute function control.preserve_append_only_record();
create trigger legacy_contract_receipt_append_only
before update or delete on control.legacy_contract_receipt
for each row execute function control.preserve_append_only_record();

create function control.legacy_compatibility_read_only()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  raise exception using
    errcode = '55000',
    message = format(
      '%I.%I is the read-only v0.1 compatibility surface; write through the canonical laboratory contract',
      tg_table_schema,
      tg_table_name
    );
end
$function$;

alter function control.legacy_compatibility_read_only()
  owner to laboratory_owner;
revoke all on function control.legacy_compatibility_read_only() from public;

alter table public.specimen rename to legacy_v0_1_specimen;
alter table public.specimen_event rename to legacy_v0_1_specimen_event;
alter table public.custody_position rename to legacy_v0_1_custody_position;
alter table public.idempotency_reservation rename to legacy_v0_1_idempotency_reservation;
alter table public.integration_inbox rename to legacy_v0_1_integration_inbox;
alter table public.integration_outbox rename to legacy_v0_1_integration_outbox;
alter table public.execution_receipt rename to legacy_v0_1_execution_receipt;
alter table public.trace_link rename to legacy_v0_1_trace_link;
alter table public.open_receipt rename to legacy_v0_1_open_receipt;

do $compatibility_surface$
declare
  relation_name text;
  grant_record record;
  column_grant_record record;
begin
  foreach relation_name in array array[
    'legacy_v0_1_specimen',
    'legacy_v0_1_specimen_event',
    'legacy_v0_1_custody_position',
    'legacy_v0_1_idempotency_reservation',
    'legacy_v0_1_integration_inbox',
    'legacy_v0_1_integration_outbox',
    'legacy_v0_1_execution_receipt',
    'legacy_v0_1_trace_link',
    'legacy_v0_1_open_receipt'
  ]
  loop
    for grant_record in
      select distinct table_grant.grantee
      from information_schema.role_table_grants as table_grant
      where table_grant.table_schema = 'public'
        and table_grant.table_name = relation_name
        and table_grant.grantee not in ('laboratory_owner', 'PUBLIC')
    loop
      execute format(
        'revoke all privileges on table public.%I from %I',
        relation_name,
        grant_record.grantee
      );
    end loop;

    for column_grant_record in
      select
        column_grant.grantee,
        column_grant.column_name,
        column_grant.privilege_type
      from information_schema.column_privileges as column_grant
      where column_grant.table_schema = 'public'
        and column_grant.table_name = relation_name
        and column_grant.grantee not in ('laboratory_owner', 'PUBLIC')
        and column_grant.privilege_type in (
          'SELECT', 'INSERT', 'UPDATE', 'REFERENCES'
        )
    loop
      execute format(
        'revoke %s (%I) on table public.%I from %I',
        column_grant_record.privilege_type,
        column_grant_record.column_name,
        relation_name,
        column_grant_record.grantee
      );
    end loop;

    execute format(
      'revoke all privileges on table public.%I from public',
      relation_name
    );
    execute format(
      'alter table public.%I owner to laboratory_owner',
      relation_name
    );
    execute format(
      'create trigger %I before insert or update or delete on public.%I '
      || 'for each row execute function control.legacy_compatibility_read_only()',
      relation_name || '_read_only',
      relation_name
    );
    execute format(
      'create trigger %I before truncate on public.%I '
      || 'for each statement execute function control.legacy_compatibility_read_only()',
      relation_name || '_truncate_guard',
      relation_name
    );
    execute format(
      'grant select on table public.%I to laboratory_auditor',
      relation_name
    );
  end loop;
end
$compatibility_surface$;

create function control.legacy_v0_1_archived_rows_sha256()
returns bytea
language sql
stable
security invoker
set search_path = pg_catalog, public
as $function$
  select sha256(convert_to(coalesce(string_agg(
    jsonb_build_object(
      'table', source_record.source_table,
      'key', source_record.source_key,
      'row', source_record.source_row
    )::text,
    E'\n' order by source_record.source_table, source_record.source_key
  ), ''), 'UTF8'))
  from (
    select
      'specimen'::text as source_table,
      jsonb_build_array(source_row.tenant_id, source_row.specimen_id)::text
        as source_key,
      to_jsonb(source_row) as source_row
    from public.legacy_v0_1_specimen as source_row
    union all
    select
      'specimen_event',
      jsonb_build_array(
        source_row.tenant_id,
        source_row.specimen_id,
        source_row.aggregate_version
      )::text,
      to_jsonb(source_row)
    from public.legacy_v0_1_specimen_event as source_row
    union all
    select
      'custody_position',
      jsonb_build_array(source_row.tenant_id, source_row.specimen_id)::text,
      to_jsonb(source_row)
    from public.legacy_v0_1_custody_position as source_row
    union all
    select
      'idempotency_reservation',
      jsonb_build_array(
        source_row.tenant_id,
        source_row.scope,
        source_row.request_key
      )::text,
      to_jsonb(source_row)
    from public.legacy_v0_1_idempotency_reservation as source_row
    union all
    select
      'integration_inbox',
      jsonb_build_array(
        source_row.tenant_id,
        source_row.source,
        source_row.message_id
      )::text,
      to_jsonb(source_row)
    from public.legacy_v0_1_integration_inbox as source_row
    union all
    select
      'integration_outbox',
      jsonb_build_array(source_row.tenant_id, source_row.message_id)::text,
      to_jsonb(source_row)
    from public.legacy_v0_1_integration_outbox as source_row
    union all
    select
      'execution_receipt',
      jsonb_build_array(source_row.receipt_id)::text,
      to_jsonb(source_row)
    from public.legacy_v0_1_execution_receipt as source_row
    union all
    select
      'trace_link',
      jsonb_build_array(
        source_row.receipt_id,
        source_row.requirement_id,
        source_row.risk_id,
        source_row.control_id,
        source_row.test_id
      )::text,
      to_jsonb(source_row)
    from public.legacy_v0_1_trace_link as source_row
    union all
    select
      'open_receipt',
      jsonb_build_array(source_row.open_receipt_id)::text,
      to_jsonb(source_row)
    from public.legacy_v0_1_open_receipt as source_row
  ) as source_record
$function$;

-- Laboratory ownership keeps the compatibility-window routine inside the
-- governed catalog. SECURITY INVOKER makes the migration caller's bounded
-- read authority effective while the contract receipt is evaluated.
alter function control.legacy_v0_1_archived_rows_sha256()
  owner to laboratory_owner;
revoke all on function control.legacy_v0_1_archived_rows_sha256()
  from public;
drop function control.legacy_v0_1_source_rows_sha256();

insert into control.legacy_upgrade_receipt (
  receipt_id,
  validation_id,
  baseline_version,
  migration_head,
  source_manifest_sha256,
  source_rows_sha256,
  representation_manifest_sha256,
  canonical_schema_sha256,
  migration_evidence_sha256,
  source_population,
  target_population,
  exception_summary
)
select
  control.stable_migration_uuid('lims-eln/upgrade-receipt', 'v0.1-to-v0.2'),
  validation.validation_id,
  'v0.1',
  'V006',
  validation.source_manifest_sha256,
  validation.source_rows_sha256,
  validation.representation_manifest_sha256,
  control.schema_fingerprint(),
  control.migration_evidence_fingerprint(),
  validation.source_manifest,
  jsonb_build_object(
    'tenant', (select count(*) from laboratory.tenant),
    'specimen', (select count(*) from laboratory.specimen),
    'specimenEvent', (select count(*) from laboratory.specimen_event),
    'custodyPosition', (select count(*) from laboratory.custody_position),
    'semanticManifest', validation.representation_manifest -> 'targetProjection'
  ),
  jsonb_build_object(
    'total', (
      select count(*)
      from control.legacy_upgrade_exception
      where baseline_version = 'v0.1'
    ),
    'open', (
      select count(*)
      from control.legacy_upgrade_exception
      where baseline_version = 'v0.1'
        and disposition = 'open'
    ),
    'accepted', (
      select count(*)
      from control.legacy_upgrade_exception
      where baseline_version = 'v0.1'
        and disposition = 'accepted_exception'
    )
  )
from control.legacy_upgrade_validation as validation
where validation.baseline_version = 'v0.1';

-- TARGET: a forward-only correction binds scientific and evidence coordinates,
-- makes lifecycle progression explicit, and gives runtime proofs one complete
-- semantic catalog rather than a column-shape proxy.
-- VERIFY: security, relationship, queue-recovery, scientific-conversion, and
-- semantic-fingerprint contracts run through provisioned workload identities.

set lock_timeout = '5s';
set statement_timeout = '90s';
set idle_in_transaction_session_timeout = '60s';
set search_path = pg_catalog, control, laboratory;

select pg_advisory_xact_lock(hashtextextended('lims-eln-schema-v0.2', 0));

-- Object ownership follows the declared schema owner across domains as well as
-- relations and routines. Type privileges remain explicit for future grants.
alter domain control.nonblank_text owner to laboratory_owner;
alter domain control.external_identity owner to laboratory_owner;
alter domain control.sha256_digest owner to laboratory_owner;
alter domain control.ucum_code owner to laboratory_owner;
alter domain control.finite_instant owner to laboratory_owner;

revoke all on type control.nonblank_text from public;
revoke all on type control.external_identity from public;
revoke all on type control.sha256_digest from public;
revoke all on type control.ucum_code from public;
revoke all on type control.finite_instant from public;
grant usage on type
  control.nonblank_text,
  control.external_identity,
  control.sha256_digest,
  control.ucum_code,
  control.finite_instant
to
  laboratory_tenant_runtime,
  laboratory_outbox_worker,
  laboratory_evidence_writer,
  laboratory_migrator,
  laboratory_auditor;

-- Every durable canonical instant shares one finite storage primitive. Parent
-- relations cover their partitions, and deterministic catalog order makes a
-- failed adoption identify the same first disposition on every rehearsal.
do $finite_instant_preflight$
declare
  column_record record;
  offending_count bigint;
begin
  for column_record in
    select
      namespace.nspname as schema_name,
      relation.relname as relation_name,
      attribute.attname as column_name,
      attribute.attnum as column_order
    from pg_catalog.pg_attribute as attribute
    join pg_catalog.pg_class as relation
      on relation.oid = attribute.attrelid
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname in ('control', 'laboratory')
      and relation.relkind in ('r', 'p')
      and not relation.relispartition
      and attribute.attnum > 0
      and not attribute.attisdropped
      and attribute.atttypid = 'timestamptz'::regtype
    order by namespace.nspname, relation.relname, attribute.attnum
  loop
    execute format(
      'select count(*) from %I.%I where %I is not null and not isfinite(%I)',
      column_record.schema_name,
      column_record.relation_name,
      column_record.column_name,
      column_record.column_name
    ) into offending_count;
    if offending_count > 0 then
      raise exception using
        errcode = '22008',
        message = format(
          '%I.%I.%I has %s instant values requiring a finite-time disposition',
          column_record.schema_name,
          column_record.relation_name,
          column_record.column_name,
          offending_count
        );
    end if;
  end loop;
end
$finite_instant_preflight$;

do $finite_instant_conversion$
declare
  column_record record;
begin
  for column_record in
    select
      namespace.nspname as schema_name,
      relation.relname as relation_name,
      attribute.attname as column_name,
      attribute.attnum as column_order
    from pg_catalog.pg_attribute as attribute
    join pg_catalog.pg_class as relation
      on relation.oid = attribute.attrelid
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname in ('control', 'laboratory')
      and relation.relkind in ('r', 'p')
      and not relation.relispartition
      and attribute.attnum > 0
      and not attribute.attisdropped
      and attribute.atttypid = 'timestamptz'::regtype
    order by namespace.nspname, relation.relname, attribute.attnum
  loop
    execute format(
      'alter table %I.%I alter column %I type control.finite_instant using %I::control.finite_instant',
      column_record.schema_name,
      column_record.relation_name,
      column_record.column_name,
      column_record.column_name
    );
  end loop;
end
$finite_instant_conversion$;

create function control.stable_migration_uuid(
  p_namespace text,
  p_identity text
)
returns uuid
language sql
immutable
strict
parallel safe
set search_path = pg_catalog
as $function$
  select (
    substr(hashed.digest_hex, 1, 8) || '-' ||
    substr(hashed.digest_hex, 9, 4) || '-' ||
    substr(hashed.digest_hex, 13, 4) || '-' ||
    substr(hashed.digest_hex, 17, 4) || '-' ||
    substr(hashed.digest_hex, 21, 12)
  )::uuid
  from (
    select encode(
      sha256(convert_to(
        octet_length(convert_to(p_namespace, 'UTF8'))::text || ':'
          || p_namespace
          || octet_length(convert_to(p_identity, 'UTF8'))::text || ':'
          || p_identity,
        'UTF8'
      )),
      'hex'
    ) as digest_hex
  ) as hashed
$function$;

alter function control.stable_migration_uuid(text, text)
  owner to laboratory_owner;
revoke all on function control.stable_migration_uuid(text, text) from public;

-- A run/specimen membership makes the scientific execution boundary explicit.
-- Conversion meaning carries its own immutable digest into each observation.
create table laboratory.assay_run_specimen (
  tenant_id uuid not null,
  assay_run_id uuid not null,
  specimen_id uuid not null,
  sample_role control.nonblank_text not null,
  run_position control.external_identity,
  recorded_at control.finite_instant not null default transaction_timestamp(),
  constraint assay_run_specimen_pk
    primary key (tenant_id, assay_run_id, specimen_id),
  constraint assay_run_specimen_run_fk
    foreign key (tenant_id, assay_run_id)
    references laboratory.assay_run (tenant_id, assay_run_id)
    on update restrict on delete restrict,
  constraint assay_run_specimen_specimen_fk
    foreign key (tenant_id, specimen_id)
    references laboratory.specimen (tenant_id, specimen_id)
    on update restrict on delete restrict,
  constraint assay_run_specimen_position_uq
    unique (tenant_id, assay_run_id, run_position)
);

alter table laboratory.assay_run_specimen owner to laboratory_owner;
create trigger assay_run_specimen_append_only
before update or delete on laboratory.assay_run_specimen
for each row execute function control.preserve_append_only_record();
alter table laboratory.assay_run_specimen enable row level security;
alter table laboratory.assay_run_specimen force row level security;
create policy tenant_scope on laboratory.assay_run_specimen
using (tenant_id = control.current_tenant_id())
with check (tenant_id = control.current_tenant_id());

alter table laboratory.assay_unit_conversion
  add column conversion_contract_sha256 control.sha256_digest;

update laboratory.assay_unit_conversion as conversion
set conversion_contract_sha256 = sha256(convert_to(jsonb_build_object(
  'tenantId', conversion.tenant_id,
  'assaySpecificationId', conversion.assay_specification_id,
  'specificationVersion', conversion.specification_version,
  'sourceUnit', conversion.source_unit,
  'canonicalUnit', conversion.canonical_unit,
  'multiplier', conversion.multiplier::text,
  'offsetValue', conversion.offset_value::text,
  'conversionRuleVersion', conversion.conversion_rule_version
)::text, 'UTF8'));

alter table laboratory.assay_unit_conversion
  alter column conversion_contract_sha256 set not null;

alter table laboratory.result_observation
  add column conversion_contract_sha256 control.sha256_digest;

-- The migration owner opens a transaction-bounded maintenance lane for this
-- derived-column backfill. Atomic rollback restores the established guard if
-- any subsequent preflight or constraint step raises an exception.
do $observation_append_only_trigger_preflight$
begin
  if not exists (
    select 1
    from pg_catalog.pg_trigger as trigger
    join pg_catalog.pg_class as relation
      on relation.oid = trigger.tgrelid
    join pg_catalog.pg_namespace as relation_namespace
      on relation_namespace.oid = relation.relnamespace
    join pg_catalog.pg_proc as procedure
      on procedure.oid = trigger.tgfoid
    join pg_catalog.pg_namespace as procedure_namespace
      on procedure_namespace.oid = procedure.pronamespace
    where relation_namespace.nspname = 'laboratory'
      and relation.relname = 'result_observation'
      and trigger.tgname = 'result_observation_append_only'
      and trigger.tgenabled = 'O'
      and not trigger.tgisinternal
      and procedure_namespace.nspname = 'control'
      and procedure.proname = 'preserve_append_only_record'
  ) then
    raise exception using
      errcode = '55000',
      message = 'result_observation append-only guard must be active before the conversion-contract backfill';
  end if;
end
$observation_append_only_trigger_preflight$;

alter table laboratory.result_observation
  disable trigger result_observation_append_only;

update laboratory.result_observation as observation
set conversion_contract_sha256 = conversion.conversion_contract_sha256
from laboratory.assay_unit_conversion as conversion
where conversion.tenant_id = observation.tenant_id
  and conversion.assay_specification_id = observation.assay_specification_id
  and conversion.specification_version = observation.specification_version
  and conversion.source_unit = observation.raw_unit
  and conversion.canonical_unit = observation.canonical_unit
  and conversion.conversion_rule_version = observation.conversion_rule_version;

alter table laboratory.result_observation
  enable trigger result_observation_append_only;

do $observation_conversion_preflight$
begin
  if exists (
    select 1
    from laboratory.result_observation
    where conversion_contract_sha256 is null
  ) then
    raise exception using
      errcode = '23514',
      message = 'existing observations require an owned conversion-contract disposition';
  end if;
end
$observation_conversion_preflight$;

alter table laboratory.result_observation
  alter column conversion_contract_sha256 set not null;

-- Append-only guards begin after all owned, deterministic backfills complete.
create trigger assay_specification_append_only
before update or delete on laboratory.assay_specification
for each row execute function control.preserve_append_only_record();
create trigger assay_unit_conversion_append_only
before update or delete on laboratory.assay_unit_conversion
for each row execute function control.preserve_append_only_record();

insert into laboratory.assay_run_specimen (
  tenant_id,
  assay_run_id,
  specimen_id,
  sample_role,
  recorded_at
)
select distinct
  observation.tenant_id,
  observation.assay_run_id,
  observation.specimen_id,
  'legacy_observation_subject',
  observation.recorded_at
from laboratory.result_observation as observation
on conflict (tenant_id, assay_run_id, specimen_id) do nothing;

-- Composite relationships carry every shared semantic coordinate. The earlier
-- narrow foreign keys remain useful lookup constraints; these additions prove
-- that the linked records describe the same aggregate, method, and release.
alter table laboratory.specimen_event
  add constraint specimen_event_specimen_event_uq
  unique (tenant_id, specimen_id, event_id);

alter table laboratory.specimen_event
  add constraint specimen_event_authorization_receipt_fk
  foreign key (tenant_id, authorization_receipt_id)
  references laboratory.execution_receipt (tenant_id, receipt_id)
  on update restrict on delete restrict;

alter table laboratory.specimen_event
  add constraint specimen_event_causation_scope_fk
  foreign key (tenant_id, specimen_id, causation_event_id)
  references laboratory.specimen_event (tenant_id, specimen_id, event_id)
  on update restrict on delete restrict,
  add constraint specimen_event_supersession_scope_fk
  foreign key (tenant_id, specimen_id, supersedes_event_id)
  references laboratory.specimen_event (tenant_id, specimen_id, event_id)
  on update restrict on delete restrict;

alter table laboratory.approval_decision
  add constraint approval_decision_specimen_event_fk
  foreign key (tenant_id, specimen_id, target_event_id)
  references laboratory.specimen_event (tenant_id, specimen_id, event_id)
  on update restrict on delete restrict;

alter table laboratory.approval_decision
  add constraint approval_decision_scope_uq
  unique (tenant_id, specimen_id, decision_id),
  add constraint approval_decision_supersession_scope_fk
  foreign key (tenant_id, specimen_id, supersedes_decision_id)
  references laboratory.approval_decision (tenant_id, specimen_id, decision_id)
  on update restrict on delete restrict;

alter table laboratory.custody_event
  add constraint custody_event_position_binding_uq
  unique (
    tenant_id,
    specimen_id,
    custody_event_id,
    custody_version,
    to_location_id
  ),
  add constraint custody_event_scope_uq
  unique (tenant_id, specimen_id, custody_event_id),
  add constraint custody_event_supersession_scope_fk
  foreign key (tenant_id, specimen_id, supersedes_custody_event_id)
  references laboratory.custody_event (
    tenant_id,
    specimen_id,
    custody_event_id
  ) on update restrict on delete restrict;

alter table laboratory.custody_position
  add constraint custody_position_event_binding_fk
  foreign key (
    tenant_id,
    specimen_id,
    last_custody_event_id,
    custody_version,
    location_id
  ) references laboratory.custody_event (
    tenant_id,
    specimen_id,
    custody_event_id,
    custody_version,
    to_location_id
  ) on update restrict on delete restrict;

alter table laboratory.assay_specification
  add constraint assay_specification_canonical_unit_uq
  unique (
    tenant_id,
    assay_specification_id,
    specification_version,
    canonical_unit
  );

alter table laboratory.assay_unit_conversion
  add constraint assay_unit_conversion_canonical_unit_fk
  foreign key (
    tenant_id,
    assay_specification_id,
    specification_version,
    canonical_unit
  ) references laboratory.assay_specification (
    tenant_id,
    assay_specification_id,
    specification_version,
    canonical_unit
  ) on update restrict on delete restrict;

alter table laboratory.assay_unit_conversion
  add constraint assay_unit_conversion_contract_uq
  unique (
    tenant_id,
    assay_specification_id,
    specification_version,
    source_unit,
    canonical_unit,
    conversion_rule_version,
    conversion_contract_sha256
  );

alter table laboratory.assay_run
  add constraint assay_run_specification_binding_uq
  unique (
    tenant_id,
    assay_run_id,
    assay_specification_id,
    specification_version
  );

alter table laboratory.result_observation
  add constraint result_observation_run_specification_fk
  foreign key (
    tenant_id,
    assay_run_id,
    assay_specification_id,
    specification_version
  ) references laboratory.assay_run (
    tenant_id,
    assay_run_id,
    assay_specification_id,
    specification_version
  ) on update restrict on delete restrict;

alter table laboratory.result_observation
  add constraint result_observation_scope_uq
  unique (tenant_id, specimen_id, observation_id),
  add constraint result_observation_supersession_scope_fk
  foreign key (tenant_id, specimen_id, supersedes_observation_id)
  references laboratory.result_observation (
    tenant_id,
    specimen_id,
    observation_id
  ) on update restrict on delete restrict;

alter table laboratory.result_observation
  add constraint result_observation_run_specimen_fk
  foreign key (tenant_id, assay_run_id, specimen_id)
  references laboratory.assay_run_specimen (
    tenant_id,
    assay_run_id,
    specimen_id
  ) on update restrict on delete restrict;

alter table laboratory.result_observation
  add constraint result_observation_conversion_contract_fk
  foreign key (
    tenant_id,
    assay_specification_id,
    specification_version,
    raw_unit,
    canonical_unit,
    conversion_rule_version,
    conversion_contract_sha256
  ) references laboratory.assay_unit_conversion (
    tenant_id,
    assay_specification_id,
    specification_version,
    source_unit,
    canonical_unit,
    conversion_rule_version,
    conversion_contract_sha256
  ) on update restrict on delete restrict;

alter table laboratory.restore_receipt
  add constraint restore_receipt_run_binding_uq
  unique (tenant_id, migration_run_id, restore_receipt_id);

alter table laboratory.acceptance_decision
  add constraint acceptance_decision_run_restore_fk
  foreign key (tenant_id, migration_run_id, restore_receipt_id)
  references laboratory.restore_receipt (
    tenant_id,
    migration_run_id,
    restore_receipt_id
  ) on update restrict on delete restrict;

alter table laboratory.acceptance_decision
  add constraint acceptance_decision_run_scope_uq
  unique (
    tenant_id,
    migration_run_id,
    restore_receipt_id,
    decision_id
  ),
  add constraint acceptance_decision_supersession_scope_fk
  foreign key (
    tenant_id,
    migration_run_id,
    restore_receipt_id,
    supersedes_decision_id
  ) references laboratory.acceptance_decision (
    tenant_id,
    migration_run_id,
    restore_receipt_id,
    decision_id
  ) on update restrict on delete restrict;

alter table laboratory.open_receipt_status_event
  add constraint open_receipt_status_event_scope_uq
  unique (tenant_id, open_receipt_id, status_event_id),
  add constraint open_receipt_status_event_supersession_scope_fk
  foreign key (tenant_id, open_receipt_id, supersedes_status_event_id)
  references laboratory.open_receipt_status_event (
    tenant_id,
    open_receipt_id,
    status_event_id
  ) on update restrict on delete restrict;

-- Mutable meanings progress through immutable status events. Root exception and
-- condition records retain their initial statement; current-state views expose
-- the latest governed event without rewriting history.
create table laboratory.database_migration_exception_status_event (
  tenant_id uuid not null,
  status_event_id uuid not null,
  exception_id uuid not null,
  status_version bigint not null,
  disposition control.nonblank_text not null,
  evidence_receipt_id uuid,
  decided_by uuid not null,
  decision_reason control.nonblank_text not null,
  decided_at control.finite_instant not null,
  recorded_at control.finite_instant not null default transaction_timestamp(),
  supersedes_status_event_id uuid,
  constraint database_migration_exception_status_event_pk
    primary key (tenant_id, status_event_id),
  constraint database_migration_exception_status_event_exception_fk
    foreign key (tenant_id, exception_id)
    references laboratory.database_migration_exception (tenant_id, exception_id)
    on update restrict on delete restrict,
  constraint database_migration_exception_status_event_receipt_fk
    foreign key (tenant_id, evidence_receipt_id)
    references laboratory.execution_receipt (tenant_id, receipt_id)
    on update restrict on delete restrict,
  constraint database_migration_exception_status_event_actor_fk
    foreign key (tenant_id, decided_by)
    references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint database_migration_exception_status_event_identity_uq
    unique (tenant_id, exception_id, status_event_id),
  constraint database_migration_exception_status_event_supersedes_fk
    foreign key (tenant_id, exception_id, supersedes_status_event_id)
    references laboratory.database_migration_exception_status_event (
      tenant_id,
      exception_id,
      status_event_id
    ) on update restrict on delete restrict,
  constraint database_migration_exception_status_event_version_uq
    unique (tenant_id, exception_id, status_version),
  constraint database_migration_exception_status_event_version_ck
    check (status_version >= 1),
  constraint database_migration_exception_status_event_value_ck check (
    disposition in (
      'source_corrected',
      'target_corrected',
      'accepted_exception',
      'superseded'
    )
  ),
  constraint database_migration_exception_status_event_evidence_ck check (
    evidence_receipt_id is not null
  ),
  constraint database_migration_exception_status_event_time_ck
    check (recorded_at >= decided_at)
);

create table laboratory.acceptance_condition_status_event (
  tenant_id uuid not null,
  status_event_id uuid not null,
  condition_id uuid not null,
  status_version bigint not null,
  condition_state control.nonblank_text not null,
  closure_receipt_id uuid,
  decided_by uuid not null,
  decision_reason control.nonblank_text not null,
  decided_at control.finite_instant not null,
  recorded_at control.finite_instant not null default transaction_timestamp(),
  supersedes_status_event_id uuid,
  constraint acceptance_condition_status_event_pk
    primary key (tenant_id, status_event_id),
  constraint acceptance_condition_status_event_condition_fk
    foreign key (tenant_id, condition_id)
    references laboratory.acceptance_condition (tenant_id, condition_id)
    on update restrict on delete restrict,
  constraint acceptance_condition_status_event_receipt_fk
    foreign key (tenant_id, closure_receipt_id)
    references laboratory.execution_receipt (tenant_id, receipt_id)
    on update restrict on delete restrict,
  constraint acceptance_condition_status_event_actor_fk
    foreign key (tenant_id, decided_by)
    references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint acceptance_condition_status_event_identity_uq
    unique (tenant_id, condition_id, status_event_id),
  constraint acceptance_condition_status_event_supersedes_fk
    foreign key (tenant_id, condition_id, supersedes_status_event_id)
    references laboratory.acceptance_condition_status_event (
      tenant_id,
      condition_id,
      status_event_id
    ) on update restrict on delete restrict,
  constraint acceptance_condition_status_event_version_uq
    unique (tenant_id, condition_id, status_version),
  constraint acceptance_condition_status_event_version_ck
    check (status_version >= 1),
  constraint acceptance_condition_status_event_value_ck check (
    condition_state in ('satisfied', 'superseded')
  ),
  constraint acceptance_condition_status_event_evidence_ck check (
    closure_receipt_id is not null
  ),
  constraint acceptance_condition_status_event_time_ck
    check (recorded_at >= decided_at)
);

alter table laboratory.database_migration_exception_status_event
  owner to laboratory_owner;
alter table laboratory.acceptance_condition_status_event
  owner to laboratory_owner;

create trigger database_migration_exception_status_event_append_only
before update or delete
on laboratory.database_migration_exception_status_event
for each row execute function control.preserve_append_only_record();

create trigger acceptance_condition_status_event_append_only
before update or delete
on laboratory.acceptance_condition_status_event
for each row execute function control.preserve_append_only_record();

alter table laboratory.database_migration_exception_status_event
  enable row level security;
alter table laboratory.database_migration_exception_status_event
  force row level security;
create policy tenant_scope
on laboratory.database_migration_exception_status_event
using (tenant_id = control.current_tenant_id())
with check (tenant_id = control.current_tenant_id());

alter table laboratory.acceptance_condition_status_event
  enable row level security;
alter table laboratory.acceptance_condition_status_event
  force row level security;
create policy tenant_scope
on laboratory.acceptance_condition_status_event
using (tenant_id = control.current_tenant_id())
with check (tenant_id = control.current_tenant_id());

create function laboratory.record_migration_exception_status(
  p_exception_id uuid,
  p_expected_status_version bigint,
  p_disposition control.nonblank_text,
  p_evidence_receipt_id uuid,
  p_decided_by uuid,
  p_decision_reason control.nonblank_text,
  p_decided_at timestamptz,
  p_status_event_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, control, laboratory
as $function$
declare
  tenant_context uuid := control.current_tenant_id();
  current_status_version bigint;
  prior_status_event_id uuid;
  current_disposition control.nonblank_text;
  prior_decided_at timestamptz;
  latest_disposition control.nonblank_text;
  latest_decided_at timestamptz;
begin
  if tenant_context is null then
    raise exception using
      errcode = '42501',
      message = 'a current tenant principal grant is required';
  end if;
  select disposition, coalesce(resolved_at, opened_at)
  into current_disposition, prior_decided_at
  from laboratory.database_migration_exception
  where tenant_id = tenant_context
    and exception_id = p_exception_id
  for update;
  if not found then
    raise exception using
      errcode = '23503',
      message = 'the migration exception is available within another scope or is absent';
  end if;

  select status_version, status_event_id, disposition, decided_at
  into
    current_status_version,
    prior_status_event_id,
    latest_disposition,
    latest_decided_at
  from laboratory.database_migration_exception_status_event
  where tenant_id = tenant_context
    and exception_id = p_exception_id
  order by status_version desc
  limit 1;

  if current_status_version is null then
    current_status_version := 0;
  else
    current_disposition := latest_disposition;
    prior_decided_at := latest_decided_at;
  end if;
  if current_status_version <> p_expected_status_version then
    raise exception using
      errcode = '40001',
      message = 'migration exception status advanced; reload and apply the next decision';
  end if;
  if not (
    (current_disposition = 'open' and p_disposition in (
      'source_corrected',
      'target_corrected',
      'accepted_exception',
      'superseded'
    ))
    or (
      current_disposition in (
        'source_corrected',
        'target_corrected',
        'accepted_exception'
      )
      and p_disposition = 'superseded'
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'migration exception decisions follow the released transition matrix';
  end if;
  if p_decided_at < prior_decided_at then
    raise exception using
      errcode = '22008',
      message = 'migration exception decision time advances monotonically';
  end if;
  if not isfinite(p_decided_at) then
    raise exception using
      errcode = '22008',
      message = 'migration exception decision time belongs to the finite instant domain';
  end if;

  insert into laboratory.database_migration_exception_status_event (
    tenant_id,
    status_event_id,
    exception_id,
    status_version,
    disposition,
    evidence_receipt_id,
    decided_by,
    decision_reason,
    decided_at,
    supersedes_status_event_id
  ) values (
    tenant_context,
    p_status_event_id,
    p_exception_id,
    current_status_version + 1,
    p_disposition,
    p_evidence_receipt_id,
    p_decided_by,
    p_decision_reason,
    p_decided_at,
    prior_status_event_id
  );

  return current_status_version + 1;
end
$function$;

create function laboratory.record_acceptance_condition_status(
  p_condition_id uuid,
  p_expected_status_version bigint,
  p_condition_state control.nonblank_text,
  p_closure_receipt_id uuid,
  p_decided_by uuid,
  p_decision_reason control.nonblank_text,
  p_decided_at timestamptz,
  p_status_event_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, control, laboratory
as $function$
declare
  tenant_context uuid := control.current_tenant_id();
  current_status_version bigint;
  prior_status_event_id uuid;
  current_condition_state control.nonblank_text;
  prior_decided_at timestamptz;
  latest_condition_state control.nonblank_text;
  latest_decided_at timestamptz;
begin
  if tenant_context is null then
    raise exception using
      errcode = '42501',
      message = 'a current tenant principal grant is required';
  end if;

  select condition_state, coalesce(closed_at, recorded_at)
  into current_condition_state, prior_decided_at
  from laboratory.acceptance_condition
  where tenant_id = tenant_context
    and condition_id = p_condition_id
  for update;
  if not found then
    raise exception using
      errcode = '23503',
      message = 'the acceptance condition is available within another scope or is absent';
  end if;

  select status_version, status_event_id, condition_state, decided_at
  into
    current_status_version,
    prior_status_event_id,
    latest_condition_state,
    latest_decided_at
  from laboratory.acceptance_condition_status_event
  where tenant_id = tenant_context
    and condition_id = p_condition_id
  order by status_version desc
  limit 1;

  if current_status_version is null then
    current_status_version := 0;
  else
    current_condition_state := latest_condition_state;
    prior_decided_at := latest_decided_at;
  end if;
  if current_status_version <> p_expected_status_version then
    raise exception using
      errcode = '40001',
      message = 'acceptance condition status advanced; reload and apply the next decision';
  end if;
  if not (
    (current_condition_state = 'open' and p_condition_state in (
      'satisfied',
      'superseded'
    ))
    or (
      current_condition_state = 'satisfied'
      and p_condition_state = 'superseded'
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'acceptance condition decisions follow the released transition matrix';
  end if;
  if p_decided_at < prior_decided_at then
    raise exception using
      errcode = '22008',
      message = 'acceptance condition decision time advances monotonically';
  end if;
  if not isfinite(p_decided_at) then
    raise exception using
      errcode = '22008',
      message = 'acceptance condition decision time belongs to the finite instant domain';
  end if;

  insert into laboratory.acceptance_condition_status_event (
    tenant_id,
    status_event_id,
    condition_id,
    status_version,
    condition_state,
    closure_receipt_id,
    decided_by,
    decision_reason,
    decided_at,
    supersedes_status_event_id
  ) values (
    tenant_context,
    p_status_event_id,
    p_condition_id,
    current_status_version + 1,
    p_condition_state,
    p_closure_receipt_id,
    p_decided_by,
    p_decision_reason,
    p_decided_at,
    prior_status_event_id
  );

  return current_status_version + 1;
end
$function$;

alter function laboratory.record_migration_exception_status(
  uuid, bigint, control.nonblank_text, uuid, uuid,
  control.nonblank_text, timestamptz, uuid
) owner to laboratory_owner;
alter function laboratory.record_acceptance_condition_status(
  uuid, bigint, control.nonblank_text, uuid, uuid,
  control.nonblank_text, timestamptz, uuid
) owner to laboratory_owner;

create view laboratory.database_migration_exception_current as
select
  root.*,
  coalesce(latest.disposition, root.disposition) as current_disposition,
  latest.status_version as current_status_version,
  latest.evidence_receipt_id as current_evidence_receipt_id,
  latest.decided_by as current_decided_by,
  latest.decided_at as current_decided_at
from laboratory.database_migration_exception as root
left join lateral (
  select status_event.*
  from laboratory.database_migration_exception_status_event as status_event
  where status_event.tenant_id = root.tenant_id
    and status_event.exception_id = root.exception_id
  order by status_event.status_version desc
  limit 1
) as latest on true;

create view laboratory.acceptance_condition_current as
select
  root.*,
  coalesce(latest.condition_state, root.condition_state) as current_condition_state,
  latest.status_version as current_status_version,
  latest.closure_receipt_id as current_closure_receipt_id,
  latest.decided_by as current_decided_by,
  latest.decided_at as current_decided_at
from laboratory.acceptance_condition as root
left join lateral (
  select status_event.*
  from laboratory.acceptance_condition_status_event as status_event
  where status_event.tenant_id = root.tenant_id
    and status_event.condition_id = root.condition_id
  order by status_event.status_version desc
  limit 1
) as latest on true;

alter view laboratory.database_migration_exception_current
  owner to laboratory_owner;
alter view laboratory.acceptance_condition_current
  owner to laboratory_owner;

-- Queue state contains a complete field matrix. Expired leases become explicit
-- attempts before a new worker receives a higher fencing token.
alter table laboratory.integration_outbox
  add column lease_started_at control.finite_instant,
  add column max_delivery_attempts integer not null default 10;

do $outbox_forward_fix_preflight$
begin
  if exists (
    select 1
    from laboratory.integration_outbox
    where delivery_attempts > 100
       or (delivery_state = 'leased' and delivery_attempts < 1)
       or fencing_token <> delivery_attempts
  ) then
    raise exception using
      errcode = '23514',
      message = 'outbox attempt history requires an owned disposition before the bounded state contract advances';
  end if;

  if exists (
    select 1
    from laboratory.integration_outbox
    where (
        delivery_state = 'ready'
        and (
          lease_owner is not null
          or lease_token is not null
          or lease_expires_at is not null
          or delivered_at is not null
          or confirmed_at is not null
        )
      )
      or (
        delivery_state = 'delivered'
        and (
          delivery_attempts < 1
          or fencing_token < 1
          or lease_owner is not null
          or lease_token is not null
          or lease_expires_at is not null
          or delivered_at is null
          or confirmed_at is null
          or last_error_code is not null
        )
      )
      or (
        delivery_state = 'recovery_required'
        and (
          delivery_attempts < 1
          or fencing_token < 1
          or lease_owner is not null
          or lease_token is not null
          or lease_expires_at is not null
          or delivered_at is not null
          or confirmed_at is not null
          or last_error_code is null
        )
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'outbox state evidence requires an owned repair before exhaustive state constraints advance';
  end if;
end
$outbox_forward_fix_preflight$;

update laboratory.integration_outbox
set lease_started_at = least(
      recorded_at,
      lease_expires_at - interval '1 microsecond'
    )
where delivery_state = 'leased';

update laboratory.integration_outbox
set max_delivery_attempts = greatest(10, delivery_attempts);

update laboratory.integration_outbox
set delivery_state = 'recovery_required',
    last_error_code = 'legacy_attempt_budget_exhausted'
where delivery_state = 'ready'
  and delivery_attempts >= max_delivery_attempts;

alter table laboratory.integration_outbox
  drop constraint integration_outbox_lease_shape_ck,
  drop constraint integration_outbox_delivered_shape_ck,
  drop constraint integration_outbox_recovery_shape_ck,
  drop constraint integration_outbox_time_order_ck;

alter table laboratory.integration_outbox
  add constraint integration_outbox_attempt_budget_ck check (
    max_delivery_attempts between 1 and 100
    and delivery_attempts between 0 and max_delivery_attempts
    and fencing_token = delivery_attempts
  ),
  add constraint integration_outbox_state_shape_ck check (
    (
      delivery_state = 'ready'
      and lease_owner is null
      and lease_token is null
      and lease_started_at is null
      and lease_expires_at is null
      and delivered_at is null
      and confirmed_at is null
    )
    or (
      delivery_state = 'leased'
      and delivery_attempts >= 1
      and lease_owner is not null
      and lease_token is not null
      and lease_started_at is not null
      and lease_expires_at is not null
      and lease_expires_at > lease_started_at
      and delivered_at is null
      and confirmed_at is null
    )
    or (
      delivery_state = 'delivered'
      and delivery_attempts >= 1
      and lease_owner is null
      and lease_token is null
      and lease_started_at is null
      and lease_expires_at is null
      and delivered_at is not null
      and confirmed_at is not null
      and last_error_code is null
    )
    or (
      delivery_state = 'recovery_required'
      and delivery_attempts >= 1
      and lease_owner is null
      and lease_token is null
      and lease_started_at is null
      and lease_expires_at is null
      and delivered_at is null
      and confirmed_at is null
      and last_error_code is not null
    )
  ),
  add constraint integration_outbox_time_order_v2_ck check (
    next_attempt_at >= available_at
    and (delivered_at is null or delivered_at >= available_at)
    and (
      confirmed_at is null
      or (delivered_at is not null and confirmed_at >= delivered_at)
    )
  );

create function laboratory.reclaim_expired_outbox_messages(
  p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, control, laboratory
as $function$
declare
  tenant_context uuid := control.current_tenant_id();
  recovered_count integer;
begin
  if tenant_context is null then
    raise exception using
      errcode = '42501',
      message = 'a current tenant principal grant is required';
  end if;
  if p_limit is null or p_limit not between 1 and 1000 then
    raise exception using
      errcode = '22023',
      message = 'recovery batch size belongs within 1 and 1000';
  end if;

  with candidate as (
    select
      queued.tenant_id,
      queued.message_id,
      queued.delivery_attempts,
      queued.max_delivery_attempts,
      queued.lease_owner,
      queued.fencing_token,
      queued.lease_started_at
    from laboratory.integration_outbox as queued
    where queued.tenant_id = tenant_context
      and queued.delivery_state = 'leased'
      and queued.lease_expires_at <= transaction_timestamp()
    order by queued.lease_expires_at, queued.message_id
    for update skip locked
    limit p_limit
  ),
  recovered as (
    update laboratory.integration_outbox as queued
    set delivery_state = case
          when candidate.delivery_attempts >= candidate.max_delivery_attempts
            then 'recovery_required'
          else 'ready'
        end,
        next_attempt_at = greatest(transaction_timestamp(), queued.available_at),
        lease_owner = null,
        lease_token = null,
        lease_started_at = null,
        lease_expires_at = null,
        last_error_code = case
          when candidate.delivery_attempts >= candidate.max_delivery_attempts
            then 'lease_expired_attempt_budget'
          else 'lease_expired_retry_ready'
        end
    from candidate
    where queued.tenant_id = candidate.tenant_id
      and queued.message_id = candidate.message_id
    returning
      queued.tenant_id,
      queued.message_id,
      queued.delivery_state,
      candidate.delivery_attempts,
      candidate.lease_owner,
      candidate.fencing_token,
      candidate.lease_started_at
  ),
  recorded_attempt as (
    insert into laboratory.outbox_delivery_attempt (
      tenant_id,
      message_id,
      attempt_number,
      worker_identity,
      fencing_token,
      attempt_state,
      error_code,
      started_at,
      completed_at
    )
    select
      recovered.tenant_id,
      recovered.message_id,
      recovered.delivery_attempts,
      recovered.lease_owner,
      recovered.fencing_token,
      case recovered.delivery_state
        when 'recovery_required' then 'recovery_required'
        else 'retry_scheduled'
      end,
      case recovered.delivery_state
        when 'recovery_required' then 'lease_expired_attempt_budget'
        else 'lease_expired_retry_ready'
      end,
      recovered.lease_started_at,
      transaction_timestamp()
    from recovered
    returning 1
  )
  select count(*) into recovered_count from recorded_attempt;

  return recovered_count;
end
$function$;

create or replace function laboratory.claim_outbox_message(
  p_worker_identity control.nonblank_text,
  p_lease_token uuid,
  p_lease_seconds integer
)
returns table (
  message_id uuid,
  topic text,
  partition_key text,
  payload jsonb,
  payload_sha256 bytea,
  fencing_token bigint,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, control, laboratory
as $function$
declare
  tenant_context uuid := control.current_tenant_id();
begin
  if tenant_context is null then
    raise exception using
      errcode = '42501',
      message = 'a current tenant principal grant is required';
  end if;
  if p_lease_token is null then
    raise exception using
      errcode = '22023',
      message = 'a lease token is required';
  end if;
  if p_lease_seconds is null or p_lease_seconds not between 1 and 900 then
    raise exception using
      errcode = '22023',
      message = 'lease duration belongs within 1 and 900 seconds';
  end if;

  perform laboratory.reclaim_expired_outbox_messages(100);

  return query
  with candidate as (
    select queued.tenant_id, queued.message_id
    from laboratory.integration_outbox as queued
    where queued.tenant_id = tenant_context
      and queued.delivery_state = 'ready'
      and queued.delivery_attempts < queued.max_delivery_attempts
      and queued.next_attempt_at <= transaction_timestamp()
    order by queued.next_attempt_at, queued.message_id
    for update skip locked
    limit 1
  )
  update laboratory.integration_outbox as claimed
  set delivery_state = 'leased',
      delivery_attempts = claimed.delivery_attempts + 1,
      lease_owner = p_worker_identity,
      lease_token = p_lease_token,
      fencing_token = claimed.fencing_token + 1,
      lease_started_at = transaction_timestamp(),
      lease_expires_at = transaction_timestamp()
        + make_interval(secs => p_lease_seconds),
      last_error_code = null
  from candidate
  where claimed.tenant_id = candidate.tenant_id
    and claimed.message_id = candidate.message_id
  returning
    claimed.message_id,
    claimed.topic::text,
    claimed.partition_key::text,
    claimed.payload,
    claimed.payload_sha256::bytea,
    claimed.fencing_token,
    claimed.lease_expires_at::timestamptz;
end
$function$;

create or replace function laboratory.confirm_outbox_delivery(
  p_message_id uuid,
  p_worker_identity control.nonblank_text,
  p_lease_token uuid,
  p_fencing_token bigint,
  p_transport_receipt control.nonblank_text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, control, laboratory
as $function$
declare
  tenant_context uuid := control.current_tenant_id();
  attempt_number integer;
  attempt_started_at timestamptz;
begin
  if tenant_context is null then
    raise exception using
      errcode = '42501',
      message = 'a current tenant principal grant is required';
  end if;

  select delivery_attempts, lease_started_at
  into attempt_number, attempt_started_at
  from laboratory.integration_outbox
  where tenant_id = tenant_context
    and message_id = p_message_id
    and delivery_state = 'leased'
    and lease_owner = p_worker_identity
    and lease_token = p_lease_token
    and fencing_token = p_fencing_token
    and lease_expires_at > transaction_timestamp()
  for update;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'outbox lease advanced; reconcile the message before another effect';
  end if;

  update laboratory.integration_outbox
  set delivery_state = 'delivered',
      delivered_at = transaction_timestamp(),
      confirmed_at = transaction_timestamp(),
      lease_owner = null,
      lease_token = null,
      lease_started_at = null,
      lease_expires_at = null,
      last_error_code = null
  where tenant_id = tenant_context
    and message_id = p_message_id
    and delivery_state = 'leased'
    and lease_owner = p_worker_identity
    and lease_token = p_lease_token
    and fencing_token = p_fencing_token
    and lease_expires_at > transaction_timestamp();

  insert into laboratory.outbox_delivery_attempt (
    tenant_id,
    message_id,
    attempt_number,
    worker_identity,
    fencing_token,
    attempt_state,
    transport_receipt,
    started_at,
    completed_at
  ) values (
    tenant_context,
    p_message_id,
    attempt_number,
    p_worker_identity,
    p_fencing_token,
    'confirmed',
    p_transport_receipt,
    attempt_started_at,
    transaction_timestamp()
  );
end
$function$;

alter function laboratory.reclaim_expired_outbox_messages(integer)
  owner to laboratory_owner;
alter function laboratory.claim_outbox_message(
  control.nonblank_text, uuid, integer
) owner to laboratory_owner;
alter function laboratory.confirm_outbox_delivery(
  uuid, control.nonblank_text, uuid, bigint, control.nonblank_text
) owner to laboratory_owner;

-- Canonical observations derive method, unit, conversion revision, and rounded
-- value from the assay run. Callers contribute raw evidence and its context.
create function laboratory.record_result_observation(
  p_observation_id uuid,
  p_specimen_id uuid,
  p_assay_run_id uuid,
  p_raw_value numeric,
  p_raw_unit control.ucum_code,
  p_qualifier control.nonblank_text,
  p_lower_detection_limit numeric,
  p_upper_quantitation_limit numeric,
  p_source_text control.external_identity,
  p_observation_state control.nonblank_text,
  p_observed_at timestamptz,
  p_supersedes_observation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, control, laboratory
as $function$
declare
  tenant_context uuid := control.current_tenant_id();
  selected_specification_id uuid;
  selected_specification_version integer;
  selected_scale smallint;
  selected_canonical_unit control.ucum_code;
  selected_multiplier numeric(38, 18);
  selected_offset numeric(38, 18);
  selected_rule_version control.nonblank_text;
  selected_conversion_digest control.sha256_digest;
  selected_run_state control.nonblank_text;
  selected_effective_at timestamptz;
  selected_retired_at timestamptz;
  derived_canonical_value numeric;
begin
  if tenant_context is null then
    raise exception using
      errcode = '42501',
      message = 'a current tenant principal grant is required';
  end if;
  if p_raw_value is null then
    raise exception using
      errcode = '22004',
      message = 'raw observation value is required by the scientific contract';
  end if;
  if p_raw_value::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception using
      errcode = '22003',
      message = 'raw observation value belongs to the finite numeric domain';
  end if;
  if min_scale(p_raw_value) > 12
     or abs(p_raw_value) >= 100000000000000000000000000::numeric then
    raise exception using
      errcode = '22003',
      message = 'raw observation value belongs within 26 integer and 12 fractional digits';
  end if;
  if p_lower_detection_limit is not null and (
       p_lower_detection_limit::text in ('NaN', 'Infinity', '-Infinity')
       or min_scale(p_lower_detection_limit) > 12
       or abs(p_lower_detection_limit)
         >= 100000000000000000000000000::numeric
     ) then
    raise exception using
      errcode = '22003',
      message = 'lower detection limit belongs within the released numeric profile';
  end if;
  if p_upper_quantitation_limit is not null and (
       p_upper_quantitation_limit::text in ('NaN', 'Infinity', '-Infinity')
       or min_scale(p_upper_quantitation_limit) > 12
       or abs(p_upper_quantitation_limit)
         >= 100000000000000000000000000::numeric
     ) then
    raise exception using
      errcode = '22003',
      message = 'upper quantitation limit belongs within the released numeric profile';
  end if;
  if p_lower_detection_limit is not null
     and p_upper_quantitation_limit is not null
     and p_lower_detection_limit > p_upper_quantitation_limit then
    raise exception using
      errcode = '22003',
      message = 'detection and quantitation limits follow ascending numeric order';
  end if;
  if p_observed_at is null or not isfinite(p_observed_at) then
    raise exception using
      errcode = '22008',
      message = 'observation time belongs to the finite instant domain';
  end if;

  select
    assay_run.assay_specification_id,
    assay_run.specification_version,
    assay_specification.decimal_scale,
    conversion.canonical_unit,
    conversion.multiplier,
    conversion.offset_value,
    conversion.conversion_rule_version,
    conversion.conversion_contract_sha256,
    assay_run.run_state,
    assay_specification.effective_at,
    assay_specification.retired_at
  into
    selected_specification_id,
    selected_specification_version,
    selected_scale,
    selected_canonical_unit,
    selected_multiplier,
    selected_offset,
    selected_rule_version,
    selected_conversion_digest,
    selected_run_state,
    selected_effective_at,
    selected_retired_at
  from laboratory.assay_run as assay_run
  join laboratory.assay_specification as assay_specification
    on assay_specification.tenant_id = assay_run.tenant_id
   and assay_specification.assay_specification_id = assay_run.assay_specification_id
   and assay_specification.specification_version = assay_run.specification_version
  join laboratory.assay_unit_conversion as conversion
    on conversion.tenant_id = assay_run.tenant_id
   and conversion.assay_specification_id = assay_run.assay_specification_id
   and conversion.specification_version = assay_run.specification_version
   and conversion.source_unit = p_raw_unit
   and conversion.canonical_unit = assay_specification.canonical_unit
  join laboratory.assay_run_specimen as run_specimen
    on run_specimen.tenant_id = assay_run.tenant_id
   and run_specimen.assay_run_id = assay_run.assay_run_id
   and run_specimen.specimen_id = p_specimen_id
  where assay_run.tenant_id = tenant_context
    and assay_run.assay_run_id = p_assay_run_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'the assay run and unit conversion require one tenant-bound contract';
  end if;
  if p_observed_at < selected_effective_at
     or (
       selected_retired_at is not null
       and p_observed_at >= selected_retired_at
     ) then
    raise exception using
      errcode = '22008',
      message = 'observation time belongs to the assay specification validity window';
  end if;
  if p_observation_state = 'accepted' and selected_run_state <> 'completed' then
    raise exception using
      errcode = '23514',
      message = 'accepted observations belong to completed assay runs';
  end if;

  derived_canonical_value := round(
    p_raw_value * selected_multiplier + selected_offset,
    selected_scale::integer
  );

  if derived_canonical_value::text in ('NaN', 'Infinity', '-Infinity')
     or abs(derived_canonical_value)
       >= 100000000000000000000000000::numeric then
    raise exception using
      errcode = '22003',
      message = 'canonical observation value belongs within the released numeric profile';
  end if;

  insert into laboratory.result_observation (
    tenant_id,
    observation_id,
    specimen_id,
    assay_run_id,
    assay_specification_id,
    specification_version,
    raw_value,
    raw_unit,
    qualifier,
    lower_detection_limit,
    upper_quantitation_limit,
    canonical_value,
    canonical_unit,
    conversion_rule_version,
    conversion_contract_sha256,
    source_text,
    observation_state,
    observed_at,
    supersedes_observation_id
  ) values (
    tenant_context,
    p_observation_id,
    p_specimen_id,
    p_assay_run_id,
    selected_specification_id,
    selected_specification_version,
    p_raw_value::numeric(38, 12),
    p_raw_unit,
    p_qualifier,
    p_lower_detection_limit::numeric(38, 12),
    p_upper_quantitation_limit::numeric(38, 12),
    derived_canonical_value::numeric(38, 12),
    selected_canonical_unit,
    selected_rule_version,
    selected_conversion_digest,
    p_source_text,
    p_observation_state,
    p_observed_at,
    p_supersedes_observation_id
  );

  return p_observation_id;
end
$function$;

alter function laboratory.record_result_observation(
  uuid, uuid, uuid, numeric, control.ucum_code, control.nonblank_text,
  numeric, numeric, control.external_identity, control.nonblank_text,
  timestamptz, uuid
) owner to laboratory_owner;

-- Runtime grants express workload duties inside a tenant. Worker and evidence
-- identities receive the narrow surfaces needed for their bounded calls.
revoke select on all tables in schema laboratory from
  laboratory_tenant_runtime,
  laboratory_outbox_worker,
  laboratory_evidence_writer,
  laboratory_migrator;

grant select on
  laboratory.tenant,
  laboratory.actor_principal,
  laboratory.source_system,
  laboratory.location,
  laboratory.assay_specification,
  laboratory.assay_unit_conversion,
  laboratory.specimen,
  laboratory.specimen_lineage,
  laboratory.specimen_event,
  laboratory.approval_decision,
  laboratory.custody_event,
  laboratory.custody_position,
  laboratory.assay_run,
  laboratory.assay_run_specimen,
  laboratory.result_observation,
  laboratory.artifact
to laboratory_tenant_runtime;

grant select on
  laboratory.execution_receipt,
  laboratory.trace_node,
  laboratory.trace_edge,
  laboratory.open_receipt,
  laboratory.open_receipt_status_event,
  laboratory.database_migration_plan,
  laboratory.database_migration_run,
  laboratory.database_migration_batch,
  laboratory.database_migration_record_map,
  laboratory.database_migration_exception,
  laboratory.database_migration_exception_status_event,
  laboratory.database_migration_exception_current,
  laboratory.data_reconciliation_result,
  laboratory.restore_receipt,
  laboratory.acceptance_decision,
  laboratory.acceptance_condition,
  laboratory.acceptance_condition_status_event,
  laboratory.acceptance_condition_current
to laboratory_evidence_writer;

grant select on all tables in schema laboratory to laboratory_migrator;
grant select on all tables in schema laboratory to laboratory_auditor;

grant insert on laboratory.assay_run_specimen to laboratory_migrator;

revoke insert on laboratory.result_observation from laboratory_migrator;

revoke all on all functions in schema laboratory from public;
grant execute on function laboratory.record_migration_exception_status(
  uuid, bigint, control.nonblank_text, uuid, uuid,
  control.nonblank_text, timestamptz, uuid
) to laboratory_migrator, laboratory_evidence_writer;
grant execute on function laboratory.record_acceptance_condition_status(
  uuid, bigint, control.nonblank_text, uuid, uuid,
  control.nonblank_text, timestamptz, uuid
) to laboratory_evidence_writer;
grant execute on function laboratory.reclaim_expired_outbox_messages(integer)
  to laboratory_outbox_worker;
grant execute on function laboratory.claim_outbox_message(
  control.nonblank_text, uuid, integer
) to laboratory_outbox_worker;
grant execute on function laboratory.confirm_outbox_delivery(
  uuid, control.nonblank_text, uuid, bigint, control.nonblank_text
) to laboratory_outbox_worker;
grant execute on function laboratory.record_result_observation(
  uuid, uuid, uuid, numeric, control.ucum_code, control.nonblank_text,
  numeric, numeric, control.external_identity, control.nonblank_text,
  timestamptz, uuid
) to laboratory_tenant_runtime, laboratory_migrator;
grant execute on function control.current_tenant_id()
  to laboratory_migrator;

-- The semantic catalog covers definitions that alter runtime behavior. Each row
-- is a canonical JSON document with one stable identity and escaped values.
create view control.schema_semantic_catalog as
select
  'schema'::text as object_kind,
  namespace.nspname::text as object_identity,
  jsonb_build_object(
    'owner', pg_get_userbyid(namespace.nspowner),
    'acl', coalesce(namespace.nspacl::text, '<default>')
  ) as canonical_definition
from pg_namespace as namespace
where namespace.nspname in ('control', 'laboratory')

union all

select
  'relation',
  format('%I.%I', namespace.nspname, relation.relname),
  jsonb_build_object(
    'kind', relation.relkind,
    'owner', pg_get_userbyid(relation.relowner),
    'rowSecurity', relation.relrowsecurity,
    'forceRowSecurity', relation.relforcerowsecurity,
    'persistence', relation.relpersistence,
    'acl', coalesce(relation.relacl::text, '<default>')
  )
from pg_class as relation
join pg_namespace as namespace on namespace.oid = relation.relnamespace
where namespace.nspname in ('control', 'laboratory')
  and relation.relkind in ('r', 'p', 'v', 'm', 'S')
  and not (
    namespace.nspname = 'control'
    and relation.relname like 'legacy\_%' escape '\'
  )

union all

select
  'view',
  format('%I.%I', namespace.nspname, relation.relname),
  jsonb_build_object(
    'definition', pg_get_viewdef(relation.oid, true),
    'options', coalesce(to_jsonb(relation.reloptions), '[]'::jsonb)
  )
from pg_class as relation
join pg_namespace as namespace on namespace.oid = relation.relnamespace
where namespace.nspname in ('control', 'laboratory')
  and relation.relkind in ('v', 'm')
  and not (
    namespace.nspname = 'control'
    and relation.relname like 'legacy\_%' escape '\'
  )

union all

select
  'column',
  format('%I.%I.%I', namespace.nspname, relation.relname, attribute.attname),
  jsonb_build_object(
    'ordinal', attribute.attnum,
    'type', format_type(attribute.atttypid, attribute.atttypmod),
    'required', attribute.attnotnull,
    'identity', attribute.attidentity,
    'generated', attribute.attgenerated,
    'collation', coalesce(collation_record.collname, ''),
    'default', coalesce(pg_get_expr(default_value.adbin, default_value.adrelid), ''),
    'acl', coalesce(attribute.attacl::text, '<default>')
  )
from pg_class as relation
join pg_namespace as namespace on namespace.oid = relation.relnamespace
join pg_attribute as attribute on attribute.attrelid = relation.oid
left join pg_attrdef as default_value
  on default_value.adrelid = relation.oid
 and default_value.adnum = attribute.attnum
left join pg_collation as collation_record
  on collation_record.oid = attribute.attcollation
where namespace.nspname in ('control', 'laboratory')
  and relation.relkind in ('r', 'p', 'v', 'm')
  and attribute.attnum > 0
  and not attribute.attisdropped
  and not (
    namespace.nspname = 'control'
    and relation.relname like 'legacy\_%' escape '\'
  )

union all

select
  'constraint',
  format(
    '%I.%I.%I',
    namespace.nspname,
    coalesce(relation.relname, type_record.typname),
    constraint_record.conname
  ),
  jsonb_build_object(
    'type', constraint_record.contype,
    'validated', constraint_record.convalidated,
    'deferrable', constraint_record.condeferrable,
    'initiallyDeferred', constraint_record.condeferred,
    'definition', pg_get_constraintdef(constraint_record.oid, true)
  )
from pg_constraint as constraint_record
left join pg_class as relation on relation.oid = constraint_record.conrelid
left join pg_type as type_record on type_record.oid = constraint_record.contypid
join pg_namespace as namespace on namespace.oid = constraint_record.connamespace
where namespace.nspname in ('control', 'laboratory')
  and not (
    namespace.nspname = 'control'
    and coalesce(relation.relname, type_record.typname) like 'legacy\_%' escape '\'
  )

union all

select
  'index',
  format('%I.%I', namespace.nspname, index_relation.relname),
  jsonb_build_object(
    'table', table_relation.relname,
    'definition', pg_get_indexdef(index_relation.oid)
  )
from pg_index as index_record
join pg_class as index_relation on index_relation.oid = index_record.indexrelid
join pg_class as table_relation on table_relation.oid = index_record.indrelid
join pg_namespace as namespace on namespace.oid = table_relation.relnamespace
where namespace.nspname in ('control', 'laboratory')
  and not (
    namespace.nspname = 'control'
    and table_relation.relname like 'legacy\_%' escape '\'
  )

union all

select
  'policy',
  format('%I.%I.%I', namespace.nspname, relation.relname, policy.polname),
  jsonb_build_object(
    'permissive', policy.polpermissive,
    'command', policy.polcmd,
    'roles', coalesce((
      select jsonb_agg(coalesce(role_record.rolname, 'public') order by role_oid)
      from unnest(policy.polroles) as role_oid
      left join pg_roles as role_record on role_record.oid = role_oid
    ), '[]'::jsonb),
    'using', coalesce(pg_get_expr(policy.polqual, policy.polrelid), ''),
    'withCheck', coalesce(pg_get_expr(policy.polwithcheck, policy.polrelid), '')
  )
from pg_policy as policy
join pg_class as relation on relation.oid = policy.polrelid
join pg_namespace as namespace on namespace.oid = relation.relnamespace
where namespace.nspname in ('control', 'laboratory')
  and not (
    namespace.nspname = 'control'
    and relation.relname like 'legacy\_%' escape '\'
  )

union all

select
  'trigger',
  format('%I.%I.%I', namespace.nspname, relation.relname, trigger_record.tgname),
  jsonb_build_object(
    'enabled', trigger_record.tgenabled,
    'definition', pg_get_triggerdef(trigger_record.oid, true)
  )
from pg_trigger as trigger_record
join pg_class as relation on relation.oid = trigger_record.tgrelid
join pg_namespace as namespace on namespace.oid = relation.relnamespace
where namespace.nspname in ('control', 'laboratory')
  and not trigger_record.tgisinternal
  and not (
    namespace.nspname = 'control'
    and relation.relname like 'legacy\_%' escape '\'
  )

union all

select
  'function',
  format(
    '%I.%I(%s)',
    namespace.nspname,
    procedure.proname,
    pg_get_function_identity_arguments(procedure.oid)
  ),
  jsonb_build_object(
    'owner', pg_get_userbyid(procedure.proowner),
    'securityDefiner', procedure.prosecdef,
    'volatility', procedure.provolatile,
    'parallel', procedure.proparallel,
    'configuration', coalesce(to_jsonb(procedure.proconfig), '[]'::jsonb),
    'acl', coalesce(procedure.proacl::text, '<default>'),
    'definition', pg_get_functiondef(procedure.oid)
  )
from pg_proc as procedure
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname in ('control', 'laboratory')
  and procedure.prokind in ('f', 'p')
  and not (
    namespace.nspname = 'control'
    and procedure.proname like 'legacy\_%' escape '\'
  )

union all

select
  'type',
  format('%I.%I', namespace.nspname, type_record.typname),
  jsonb_build_object(
    'kind', type_record.typtype,
    'owner', pg_get_userbyid(type_record.typowner),
    'baseType', case
      when type_record.typbasetype = 0 then ''
      else format_type(type_record.typbasetype, type_record.typtypmod)
    end,
    'required', type_record.typnotnull,
    'default', coalesce(type_record.typdefault, ''),
    'acl', coalesce(type_record.typacl::text, '<default>')
  )
from pg_type as type_record
join pg_namespace as namespace on namespace.oid = type_record.typnamespace
where namespace.nspname in ('control', 'laboratory')
  and type_record.typtype in ('d', 'e')
  and type_record.typname not like 'legacy\_%' escape '\';

alter view control.schema_semantic_catalog owner to laboratory_owner;
revoke all on control.schema_semantic_catalog from public;
grant select on control.schema_semantic_catalog to laboratory_auditor;

create function control.schema_fingerprint()
returns bytea
language sql
stable
security definer
set search_path = pg_catalog, control
as $function$
  select sha256(convert_to(coalesce(string_agg(
    jsonb_build_object(
      'kind', catalog.object_kind,
      'identity', catalog.object_identity,
      'definition', catalog.canonical_definition
    )::text,
    E'\n' order by catalog.object_kind, catalog.object_identity
  ), ''), 'UTF8'))
  from control.schema_semantic_catalog as catalog
$function$;

alter function control.schema_fingerprint() owner to laboratory_owner;
revoke all on function control.schema_fingerprint() from public;
grant execute on function control.schema_fingerprint() to laboratory_auditor;

-- Migration-only evidence has an independent fingerprint. The canonical
-- application fingerprint remains stable while legacy receipts, archive
-- relations, and compatibility controls continue through their own lifecycle.
create view control.migration_evidence_semantic_catalog as
select
  'relation'::text as object_kind,
  format('%I.%I', namespace.nspname, relation.relname) as object_identity,
  jsonb_build_object(
    'kind', relation.relkind,
    'owner', pg_get_userbyid(relation.relowner),
    'rowSecurity', relation.relrowsecurity,
    'forceRowSecurity', relation.relforcerowsecurity,
    'acl', coalesce(relation.relacl::text, '<default>')
  ) as canonical_definition
from pg_class as relation
join pg_namespace as namespace on namespace.oid = relation.relnamespace
where relation.relkind in ('r', 'p', 'v', 'm', 'S')
  and (
    (namespace.nspname = 'control' and relation.relname like 'legacy\_%' escape '\')
    or (
      namespace.nspname = 'public'
      and relation.relname like 'legacy\_v0\_1\_%' escape '\'
    )
  )

union all

select
  'column',
  format('%I.%I.%I', namespace.nspname, relation.relname, attribute.attname),
  jsonb_build_object(
    'ordinal', attribute.attnum,
    'type', format_type(attribute.atttypid, attribute.atttypmod),
    'required', attribute.attnotnull,
    'identity', attribute.attidentity,
    'generated', attribute.attgenerated,
    'default', coalesce(pg_get_expr(default_value.adbin, default_value.adrelid), ''),
    'acl', coalesce(attribute.attacl::text, '<default>')
  )
from pg_class as relation
join pg_namespace as namespace on namespace.oid = relation.relnamespace
join pg_attribute as attribute on attribute.attrelid = relation.oid
left join pg_attrdef as default_value
  on default_value.adrelid = relation.oid
 and default_value.adnum = attribute.attnum
where relation.relkind in ('r', 'p', 'v', 'm')
  and attribute.attnum > 0
  and not attribute.attisdropped
  and (
    (namespace.nspname = 'control' and relation.relname like 'legacy\_%' escape '\')
    or (
      namespace.nspname = 'public'
      and relation.relname like 'legacy\_v0\_1\_%' escape '\'
    )
  )

union all

select
  'constraint',
  format('%I.%I.%I', namespace.nspname, relation.relname, constraint_record.conname),
  jsonb_build_object(
    'type', constraint_record.contype,
    'validated', constraint_record.convalidated,
    'definition', pg_get_constraintdef(constraint_record.oid, true)
  )
from pg_constraint as constraint_record
join pg_class as relation on relation.oid = constraint_record.conrelid
join pg_namespace as namespace on namespace.oid = relation.relnamespace
where (
    (namespace.nspname = 'control' and relation.relname like 'legacy\_%' escape '\')
    or (
      namespace.nspname = 'public'
      and relation.relname like 'legacy\_v0\_1\_%' escape '\'
    )
  )

union all

select
  'trigger',
  format('%I.%I.%I', namespace.nspname, relation.relname, trigger_record.tgname),
  jsonb_build_object(
    'enabled', trigger_record.tgenabled,
    'definition', pg_get_triggerdef(trigger_record.oid, true)
  )
from pg_trigger as trigger_record
join pg_class as relation on relation.oid = trigger_record.tgrelid
join pg_namespace as namespace on namespace.oid = relation.relnamespace
where not trigger_record.tgisinternal
  and (
    (namespace.nspname = 'control' and relation.relname like 'legacy\_%' escape '\')
    or (
      namespace.nspname = 'public'
      and relation.relname like 'legacy\_v0\_1\_%' escape '\'
    )
  )

union all

select
  'function',
  format(
    '%I.%I(%s)',
    namespace.nspname,
    procedure.proname,
    pg_get_function_identity_arguments(procedure.oid)
  ),
  jsonb_build_object(
    'owner', pg_get_userbyid(procedure.proowner),
    'securityDefiner', procedure.prosecdef,
    'volatility', procedure.provolatile,
    'configuration', coalesce(to_jsonb(procedure.proconfig), '[]'::jsonb),
    'acl', coalesce(procedure.proacl::text, '<default>'),
    'definition', pg_get_functiondef(procedure.oid)
  )
from pg_proc as procedure
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'control'
  and procedure.prokind in ('f', 'p')
  and procedure.proname like 'legacy\_%' escape '\';

alter view control.migration_evidence_semantic_catalog
  owner to laboratory_owner;
revoke all on control.migration_evidence_semantic_catalog from public;
grant select on control.migration_evidence_semantic_catalog
  to laboratory_auditor;

create function control.migration_evidence_fingerprint()
returns bytea
language sql
stable
security definer
set search_path = pg_catalog, control
as $function$
  select sha256(convert_to(coalesce(string_agg(
    jsonb_build_object(
      'kind', catalog.object_kind,
      'identity', catalog.object_identity,
      'definition', catalog.canonical_definition
    )::text,
    E'\n' order by catalog.object_kind, catalog.object_identity
  ), ''), 'UTF8'))
  from control.migration_evidence_semantic_catalog as catalog
$function$;

alter function control.migration_evidence_fingerprint()
  owner to laboratory_owner;
revoke all on function control.migration_evidence_fingerprint() from public;
grant execute on function control.migration_evidence_fingerprint()
  to laboratory_auditor;

alter default privileges for role laboratory_owner in schema control
  revoke all on tables from public;
alter default privileges for role laboratory_owner in schema control
  revoke all on functions from public;
alter default privileges for role laboratory_owner in schema control
  revoke all on types from public;
alter default privileges for role laboratory_owner in schema laboratory
  revoke all on tables from public;
alter default privileges for role laboratory_owner in schema laboratory
  revoke all on functions from public;
alter default privileges for role laboratory_owner in schema laboratory
  revoke all on types from public;

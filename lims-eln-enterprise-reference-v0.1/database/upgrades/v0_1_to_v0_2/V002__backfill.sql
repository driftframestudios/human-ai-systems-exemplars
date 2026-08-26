-- TARGET: deterministic, idempotent mappings preserve valid v0.1 laboratory
-- meaning while ambiguous rows enter an owned exception route.
-- VERIFY: source population equals target population plus exception population.

set timezone = 'UTC';
set lock_timeout = '5s';
set statement_timeout = '5min';
set idle_in_transaction_session_timeout = '5min';
set search_path = pg_catalog, control, laboratory, public;

select pg_advisory_xact_lock(hashtextextended('lims-eln-v0.1-to-v0.2', 0));

-- Flyway keeps this lock through the grouped backfill,
-- validation, and cutover transaction, yielding one stable source population.
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
in share mode;

create temporary table migration_legacy_specimen_stage
on commit drop
as
select
  classified.*,
  case
    when classified.timestamp_is_valid
      then classified.updated_at_utc::control.finite_instant
    else null
  end as parsed_updated_at,
  case
    when classified.version_is_valid
      then classified.aggregate_version + 1
    else null
  end as target_aggregate_version,
  (
    classified.tenant_is_valid
    and classified.identity_is_valid
    and classified.digest_is_valid
    and classified.state_is_valid
    and classified.timestamp_is_valid
    and classified.version_is_valid
  ) as valid_for_mapping
from (
  select
    legacy_specimen.*,
    (
      legacy_specimen.tenant_id = btrim(legacy_specimen.tenant_id)
      and char_length(legacy_specimen.tenant_id) between 1 and 255
      and legacy_specimen.tenant_id !~ '[[:cntrl:]]'
    ) as tenant_is_valid,
    (
      legacy_specimen.specimen_id = btrim(legacy_specimen.specimen_id)
      and char_length(legacy_specimen.specimen_id) between 1 and 512
      and legacy_specimen.specimen_id !~ '[[:cntrl:]]'
    ) as identity_is_valid,
    (legacy_specimen.canonical_sha256 ~ '^[0-9a-fA-F]{64}$')
      as digest_is_valid,
    (
      legacy_specimen.state in (
        'received', 'accessioned', 'processing', 'review', 'released', 'voided'
      )
    ) as state_is_valid,
    (
      control.is_canonical_rfc3339_instant(legacy_specimen.updated_at_utc)
    ) as timestamp_is_valid,
    (
      legacy_specimen.aggregate_version between 0 and 9223372036854775806
    ) as version_is_valid,
    case legacy_specimen.state
      when 'received' then 'registered'
      when 'accessioned' then 'accessioned'
      when 'processing' then 'in_process'
      when 'review' then 'under_review'
      when 'released' then 'released'
      when 'voided' then 'voided'
    end as target_lifecycle_state
  from public.specimen as legacy_specimen
) as classified;

create temporary table migration_legacy_event_stage
on commit drop
as
select
  classified.*,
  case
    when classified.timestamp_is_valid
      then classified.occurred_at_utc::control.finite_instant
    else null
  end as parsed_occurred_at,
  case
    when classified.version_is_valid
      then classified.aggregate_version + 1
    else null
  end as target_aggregate_version,
  (
    classified.tenant_is_valid
    and classified.specimen_identity_is_valid
    and classified.command_identity_is_valid
    and classified.actor_identity_is_valid
    and classified.event_type_is_valid
    and classified.reason_is_valid
    and classified.digest_is_valid
    and classified.timestamp_is_valid
    and classified.version_is_valid
  ) as valid_for_mapping
from (
  select
    legacy_event.*,
    (
      legacy_event.tenant_id = btrim(legacy_event.tenant_id)
      and char_length(legacy_event.tenant_id) between 1 and 255
      and legacy_event.tenant_id !~ '[[:cntrl:]]'
    ) as tenant_is_valid,
    (
      legacy_event.specimen_id = btrim(legacy_event.specimen_id)
      and char_length(legacy_event.specimen_id) between 1 and 512
      and legacy_event.specimen_id !~ '[[:cntrl:]]'
    ) as specimen_identity_is_valid,
    (
      legacy_event.command_id = btrim(legacy_event.command_id)
      and char_length(legacy_event.command_id) between 1 and 512
      and legacy_event.command_id !~ '[[:cntrl:]]'
    ) as command_identity_is_valid,
    (
      legacy_event.actor_id = btrim(legacy_event.actor_id)
      and char_length(legacy_event.actor_id) between 1 and 512
      and legacy_event.actor_id !~ '[[:cntrl:]]'
    ) as actor_identity_is_valid,
    (
      legacy_event.event_type = btrim(legacy_event.event_type)
      and char_length(legacy_event.event_type) between 1 and 255
      and legacy_event.event_type !~ '[[:cntrl:]]'
    ) as event_type_is_valid,
    (
      legacy_event.reason_code is null
      or (
        legacy_event.reason_code = btrim(legacy_event.reason_code)
        and char_length(legacy_event.reason_code) between 1 and 255
        and legacy_event.reason_code !~ '[[:cntrl:]]'
      )
    ) as reason_is_valid,
    (legacy_event.command_sha256 ~ '^[0-9a-fA-F]{64}$')
      as digest_is_valid,
    (
      control.is_canonical_rfc3339_instant(legacy_event.occurred_at_utc)
    ) as timestamp_is_valid,
    (
      legacy_event.aggregate_version between 0 and 9223372036854775806
    ) as version_is_valid
  from public.specimen_event as legacy_event
) as classified;

create temporary table migration_legacy_custody_stage
on commit drop
as
select
  legacy_position.*,
  case
    when legacy_position.aggregate_version between 0 and 9223372036854775806
      then legacy_position.aggregate_version + 1
    else null
  end as target_aggregate_version,
  (
    legacy_position.tenant_id = btrim(legacy_position.tenant_id)
    and char_length(legacy_position.tenant_id) between 1 and 255
    and legacy_position.tenant_id !~ '[[:cntrl:]]'
    and legacy_position.specimen_id = btrim(legacy_position.specimen_id)
    and char_length(legacy_position.specimen_id) between 1 and 512
    and legacy_position.specimen_id !~ '[[:cntrl:]]'
    and legacy_position.location_path = btrim(legacy_position.location_path)
    and char_length(legacy_position.location_path) between 1 and 255
    and legacy_position.location_path !~ '[[:cntrl:]]'
    and legacy_position.aggregate_version between 0 and 9223372036854775806
  ) as valid_for_mapping
from public.custody_position as legacy_position;

analyze migration_legacy_specimen_stage;
analyze migration_legacy_event_stage;
analyze migration_legacy_custody_stage;

insert into laboratory.tenant (
  tenant_id, tenant_code, display_name, created_at
)
select
  identity_map.target_id,
  identity_map.source_identity::control.nonblank_text,
  identity_map.source_identity::control.nonblank_text,
  transaction_timestamp()
from control.legacy_identity_map as identity_map
where identity_map.baseline_version = 'v0.1'
  and identity_map.entity_kind = 'tenant'
on conflict (tenant_id) do nothing;

insert into control.legacy_identity_map (
  baseline_version, entity_kind, source_tenant, source_identity
)
select 'v0.1', 'source_system', tenant.source_identity, 'legacy-v0.1'
from control.legacy_identity_map as tenant
where tenant.baseline_version = 'v0.1'
  and tenant.entity_kind = 'tenant'
on conflict do nothing;

insert into laboratory.source_system (
  tenant_id,
  source_system_id,
  system_code,
  system_kind,
  contract_version,
  effective_at
)
select
  tenant.target_id,
  source_system.target_id,
  'legacy-v0.1',
  'migration_source',
  '0.1.0',
  transaction_timestamp()
from control.legacy_identity_map as source_system
join control.legacy_identity_map as tenant
  on tenant.baseline_version = source_system.baseline_version
 and tenant.entity_kind = 'tenant'
 and tenant.source_tenant = source_system.source_tenant
where source_system.baseline_version = 'v0.1'
  and source_system.entity_kind = 'source_system'
on conflict (tenant_id, source_system_id) do nothing;

insert into control.legacy_identity_map (
  baseline_version, entity_kind, source_tenant, source_identity
)
select distinct 'v0.1', 'actor', legacy_event.tenant_id, legacy_event.actor_id
from migration_legacy_event_stage as legacy_event
join control.legacy_identity_map as tenant
  on tenant.baseline_version = 'v0.1'
 and tenant.entity_kind = 'tenant'
 and tenant.source_tenant = legacy_event.tenant_id
where legacy_event.actor_identity_is_valid
on conflict do nothing;

insert into laboratory.actor_principal (
  tenant_id,
  actor_id,
  identity_issuer,
  subject_identifier,
  display_label,
  principal_kind,
  effective_at
)
select
  tenant.target_id,
  actor.target_id,
  'legacy-v0.1',
  actor.source_identity,
  actor.source_identity,
  'migration_operator',
  transaction_timestamp()
from control.legacy_identity_map as actor
join control.legacy_identity_map as tenant
  on tenant.baseline_version = actor.baseline_version
 and tenant.entity_kind = 'tenant'
 and tenant.source_tenant = actor.source_tenant
where actor.baseline_version = 'v0.1'
  and actor.entity_kind = 'actor'
on conflict (tenant_id, actor_id) do nothing;

insert into control.legacy_identity_map (
  baseline_version, entity_kind, source_tenant, source_identity
)
select 'v0.1', 'specimen', legacy_specimen.tenant_id, legacy_specimen.specimen_id
from migration_legacy_specimen_stage as legacy_specimen
join control.legacy_identity_map as tenant
  on tenant.baseline_version = 'v0.1'
 and tenant.entity_kind = 'tenant'
 and tenant.source_tenant = legacy_specimen.tenant_id
where legacy_specimen.valid_for_mapping
on conflict do nothing;

insert into control.legacy_upgrade_exception (
  baseline_version,
  entity_kind,
  source_tenant,
  source_identity,
  source_sha256,
  exception_class,
  accountable_role
)
select
  'v0.1',
  'specimen',
  legacy_specimen.tenant_id,
  legacy_specimen.specimen_id,
  sha256(convert_to((
    to_jsonb(legacy_specimen) - array[
      'tenant_is_valid',
      'identity_is_valid',
      'digest_is_valid',
      'state_is_valid',
      'timestamp_is_valid',
      'version_is_valid',
      'target_lifecycle_state',
      'parsed_updated_at',
      'target_aggregate_version',
      'valid_for_mapping'
    ]
  )::text, 'UTF8')),
  'invalid_specimen_contract',
  'scientific_data_steward'
from migration_legacy_specimen_stage as legacy_specimen
where not legacy_specimen.valid_for_mapping
on conflict do nothing;

insert into laboratory.specimen (
  tenant_id,
  specimen_id,
  source_system_id,
  external_specimen_id,
  lifecycle_state,
  aggregate_version,
  canonical_document,
  canonical_sha256,
  canonicalization_version,
  created_at,
  updated_at
)
select
  tenant.target_id,
  specimen_map.target_id,
  source_system.target_id,
  legacy_specimen.specimen_id,
  legacy_specimen.target_lifecycle_state,
  legacy_specimen.target_aggregate_version,
  canonical_document.value,
  sha256(convert_to(canonical_document.value::text, 'UTF8')),
  'postgresql-jsonb-text-v1',
  legacy_specimen.parsed_updated_at,
  legacy_specimen.parsed_updated_at
from migration_legacy_specimen_stage as legacy_specimen
join control.legacy_identity_map as specimen_map
  on specimen_map.baseline_version = 'v0.1'
 and specimen_map.entity_kind = 'specimen'
 and specimen_map.source_tenant = legacy_specimen.tenant_id
 and specimen_map.source_identity = legacy_specimen.specimen_id
join control.legacy_identity_map as tenant
  on tenant.baseline_version = 'v0.1'
 and tenant.entity_kind = 'tenant'
 and tenant.source_tenant = legacy_specimen.tenant_id
join control.legacy_identity_map as source_system
  on source_system.baseline_version = 'v0.1'
 and source_system.entity_kind = 'source_system'
 and source_system.source_tenant = legacy_specimen.tenant_id
cross join lateral (
  select jsonb_build_object(
    'schemaVersion', '0.2.0',
    'legacyBaseline', 'v0.1',
    'externalSpecimenId', legacy_specimen.specimen_id,
    'legacyState', legacy_specimen.state,
    'legacyCanonicalSha256', lower(legacy_specimen.canonical_sha256)
  ) as value
) as canonical_document
on conflict (tenant_id, specimen_id) do nothing;

insert into control.legacy_upgrade_exception (
  baseline_version,
  entity_kind,
  source_tenant,
  source_identity,
  source_sha256,
  exception_class,
  accountable_role
)
select
  'v0.1',
  'specimen_event',
  legacy_event.tenant_id,
  control.legacy_compound_identity(
    'specimen-event',
    jsonb_build_array(legacy_event.specimen_id, legacy_event.aggregate_version)
  ),
  sha256(convert_to((
    to_jsonb(legacy_event) - array[
      'tenant_is_valid',
      'specimen_identity_is_valid',
      'command_identity_is_valid',
      'actor_identity_is_valid',
      'event_type_is_valid',
      'reason_is_valid',
      'digest_is_valid',
      'timestamp_is_valid',
      'version_is_valid',
      'parsed_occurred_at',
      'target_aggregate_version',
      'valid_for_mapping'
    ]
  )::text, 'UTF8')),
  case
    when not legacy_event.valid_for_mapping then 'invalid_event_contract'
    else 'parent_specimen_requires_resolution'
  end,
  'scientific_data_steward'
from migration_legacy_event_stage as legacy_event
left join control.legacy_identity_map as specimen_map
  on specimen_map.baseline_version = 'v0.1'
 and specimen_map.entity_kind = 'specimen'
 and specimen_map.source_tenant = legacy_event.tenant_id
 and specimen_map.source_identity = legacy_event.specimen_id
where not legacy_event.valid_for_mapping
   or specimen_map.target_id is null
on conflict do nothing;

insert into control.legacy_identity_map (
  baseline_version, entity_kind, source_tenant, source_identity
)
select
  'v0.1',
  'specimen_event',
  legacy_event.tenant_id,
  control.legacy_compound_identity(
    'specimen-event',
    jsonb_build_array(legacy_event.specimen_id, legacy_event.aggregate_version)
  )
from migration_legacy_event_stage as legacy_event
join control.legacy_identity_map as specimen_map
  on specimen_map.baseline_version = 'v0.1'
 and specimen_map.entity_kind = 'specimen'
 and specimen_map.source_tenant = legacy_event.tenant_id
 and specimen_map.source_identity = legacy_event.specimen_id
where legacy_event.valid_for_mapping
on conflict do nothing;

insert into control.legacy_identity_map (
  baseline_version, entity_kind, source_tenant, source_identity
)
select
  'v0.1',
  'command',
  legacy_event.tenant_id,
  legacy_event.command_id
from migration_legacy_event_stage as legacy_event
join control.legacy_identity_map as specimen_map
  on specimen_map.baseline_version = 'v0.1'
 and specimen_map.entity_kind = 'specimen'
 and specimen_map.source_tenant = legacy_event.tenant_id
 and specimen_map.source_identity = legacy_event.specimen_id
where legacy_event.valid_for_mapping
on conflict do nothing;

insert into laboratory.specimen_event (
  tenant_id,
  event_id,
  specimen_id,
  aggregate_version,
  command_id,
  command_sha256,
  event_type,
  actor_id,
  correlation_id,
  reason_code,
  payload,
  payload_sha256,
  payload_schema_version,
  canonicalization_version,
  occurred_at,
  recorded_at
)
select
  tenant.target_id,
  event_map.target_id,
  specimen_map.target_id,
  legacy_event.target_aggregate_version,
  command_map.target_id,
  decode(lower(legacy_event.command_sha256), 'hex'),
  legacy_event.event_type,
  actor_map.target_id,
  command_map.target_id,
  nullif(btrim(legacy_event.reason_code), ''),
  event_payload.value,
  sha256(convert_to(event_payload.value::text, 'UTF8')),
  '0.2.0',
  'legacy-command-sha256+postgresql-jsonb-text-v1',
  legacy_event.parsed_occurred_at,
  greatest(
    legacy_event.parsed_occurred_at,
    transaction_timestamp()
  )
from migration_legacy_event_stage as legacy_event
join control.legacy_identity_map as tenant
  on tenant.baseline_version = 'v0.1'
 and tenant.entity_kind = 'tenant'
 and tenant.source_tenant = legacy_event.tenant_id
join control.legacy_identity_map as specimen_map
  on specimen_map.baseline_version = 'v0.1'
 and specimen_map.entity_kind = 'specimen'
 and specimen_map.source_tenant = legacy_event.tenant_id
 and specimen_map.source_identity = legacy_event.specimen_id
join control.legacy_identity_map as event_map
  on event_map.baseline_version = 'v0.1'
 and event_map.entity_kind = 'specimen_event'
 and event_map.source_tenant = legacy_event.tenant_id
 and event_map.source_identity = control.legacy_compound_identity(
   'specimen-event',
   jsonb_build_array(legacy_event.specimen_id, legacy_event.aggregate_version)
 )
join control.legacy_identity_map as command_map
  on command_map.baseline_version = 'v0.1'
 and command_map.entity_kind = 'command'
 and command_map.source_tenant = legacy_event.tenant_id
 and command_map.source_identity = legacy_event.command_id
join control.legacy_identity_map as actor_map
  on actor_map.baseline_version = 'v0.1'
 and actor_map.entity_kind = 'actor'
 and actor_map.source_tenant = legacy_event.tenant_id
 and actor_map.source_identity = legacy_event.actor_id
cross join lateral (
  select jsonb_build_object(
    'schemaVersion', '0.2.0',
    'legacyBaseline', 'v0.1',
    'legacyCommandSha256', lower(legacy_event.command_sha256),
    'legacySignatureMeaning', legacy_event.signature_meaning
  ) as value
) as event_payload
on conflict (tenant_id, event_id) do nothing;

insert into control.legacy_upgrade_exception (
  baseline_version,
  entity_kind,
  source_tenant,
  source_identity,
  source_sha256,
  exception_class,
  accountable_role
)
select
  'v0.1',
  'custody_position',
  legacy_position.tenant_id,
  legacy_position.specimen_id,
  sha256(convert_to((
    to_jsonb(legacy_position) - array[
      'target_aggregate_version',
      'valid_for_mapping'
    ]
  )::text, 'UTF8')),
  case
    when not legacy_position.valid_for_mapping then 'invalid_custody_contract'
    else 'parent_specimen_requires_resolution'
  end,
  'laboratory_operations'
from migration_legacy_custody_stage as legacy_position
left join control.legacy_identity_map as specimen_map
  on specimen_map.baseline_version = 'v0.1'
 and specimen_map.entity_kind = 'specimen'
 and specimen_map.source_tenant = legacy_position.tenant_id
 and specimen_map.source_identity = legacy_position.specimen_id
where not legacy_position.valid_for_mapping
   or specimen_map.target_id is null
on conflict do nothing;

insert into control.legacy_identity_map (
  baseline_version, entity_kind, source_tenant, source_identity
)
select distinct 'v0.1', 'location', legacy_position.tenant_id,
  legacy_position.location_path
from migration_legacy_custody_stage as legacy_position
join control.legacy_identity_map as tenant
  on tenant.baseline_version = 'v0.1'
 and tenant.entity_kind = 'tenant'
 and tenant.source_tenant = legacy_position.tenant_id
where legacy_position.valid_for_mapping
on conflict do nothing;

insert into laboratory.location (
  tenant_id,
  location_id,
  location_kind,
  location_code,
  display_label,
  effective_at
)
select
  tenant.target_id,
  location_map.target_id,
  'position',
  left(location_map.source_identity, 255),
  left(location_map.source_identity, 255),
  transaction_timestamp()
from control.legacy_identity_map as location_map
join control.legacy_identity_map as tenant
  on tenant.baseline_version = location_map.baseline_version
 and tenant.entity_kind = 'tenant'
 and tenant.source_tenant = location_map.source_tenant
where location_map.baseline_version = 'v0.1'
  and location_map.entity_kind = 'location'
on conflict (tenant_id, location_id) do nothing;

insert into control.legacy_identity_map (
  baseline_version, entity_kind, source_tenant, source_identity
)
select
  'v0.1',
  'custody_event',
  legacy_position.tenant_id,
  control.legacy_compound_identity(
    'custody-event',
    jsonb_build_array(
      legacy_position.specimen_id,
      legacy_position.aggregate_version
    )
  )
from migration_legacy_custody_stage as legacy_position
join control.legacy_identity_map as specimen_map
  on specimen_map.baseline_version = 'v0.1'
 and specimen_map.entity_kind = 'specimen'
 and specimen_map.source_tenant = legacy_position.tenant_id
 and specimen_map.source_identity = legacy_position.specimen_id
join control.legacy_identity_map as location_map
  on location_map.baseline_version = 'v0.1'
 and location_map.entity_kind = 'location'
 and location_map.source_tenant = legacy_position.tenant_id
 and location_map.source_identity = legacy_position.location_path
on conflict do nothing;

insert into control.legacy_identity_map (
  baseline_version, entity_kind, source_tenant, source_identity
)
select 'v0.1', 'actor', tenant.source_tenant, 'legacy-migration-operator'
from control.legacy_identity_map as tenant
where tenant.baseline_version = 'v0.1'
  and tenant.entity_kind = 'tenant'
on conflict do nothing;

insert into laboratory.actor_principal (
  tenant_id,
  actor_id,
  identity_issuer,
  subject_identifier,
  display_label,
  principal_kind,
  effective_at
)
select
  tenant.target_id,
  actor.target_id,
  'legacy-v0.1',
  actor.source_identity,
  'Legacy migration operator',
  'migration_operator',
  transaction_timestamp()
from control.legacy_identity_map as actor
join control.legacy_identity_map as tenant
  on tenant.baseline_version = actor.baseline_version
 and tenant.entity_kind = 'tenant'
 and tenant.source_tenant = actor.source_tenant
where actor.baseline_version = 'v0.1'
  and actor.entity_kind = 'actor'
  and actor.source_identity = 'legacy-migration-operator'
on conflict (tenant_id, actor_id) do nothing;

insert into laboratory.custody_event (
  tenant_id,
  custody_event_id,
  specimen_id,
  custody_version,
  to_location_id,
  transferred_by,
  reason_code,
  occurred_at,
  recorded_at
)
select
  tenant.target_id,
  event_map.target_id,
  specimen_map.target_id,
  legacy_position.target_aggregate_version,
  location_map.target_id,
  migration_actor.target_id,
  'legacy_position_import',
  canonical_specimen.updated_at,
  greatest(canonical_specimen.updated_at, transaction_timestamp())
from migration_legacy_custody_stage as legacy_position
join control.legacy_identity_map as tenant
  on tenant.baseline_version = 'v0.1'
 and tenant.entity_kind = 'tenant'
 and tenant.source_tenant = legacy_position.tenant_id
join control.legacy_identity_map as specimen_map
  on specimen_map.baseline_version = 'v0.1'
 and specimen_map.entity_kind = 'specimen'
 and specimen_map.source_tenant = legacy_position.tenant_id
 and specimen_map.source_identity = legacy_position.specimen_id
join laboratory.specimen as canonical_specimen
  on canonical_specimen.tenant_id = tenant.target_id
 and canonical_specimen.specimen_id = specimen_map.target_id
join control.legacy_identity_map as location_map
  on location_map.baseline_version = 'v0.1'
 and location_map.entity_kind = 'location'
 and location_map.source_tenant = legacy_position.tenant_id
 and location_map.source_identity = legacy_position.location_path
join control.legacy_identity_map as event_map
  on event_map.baseline_version = 'v0.1'
 and event_map.entity_kind = 'custody_event'
 and event_map.source_tenant = legacy_position.tenant_id
 and event_map.source_identity = control.legacy_compound_identity(
   'custody-event',
   jsonb_build_array(
     legacy_position.specimen_id,
     legacy_position.aggregate_version
   )
 )
join control.legacy_identity_map as migration_actor
  on migration_actor.baseline_version = 'v0.1'
 and migration_actor.entity_kind = 'actor'
 and migration_actor.source_tenant = legacy_position.tenant_id
 and migration_actor.source_identity = 'legacy-migration-operator'
on conflict (tenant_id, custody_event_id) do nothing;

insert into laboratory.custody_position (
  tenant_id,
  specimen_id,
  custody_version,
  location_id,
  last_custody_event_id,
  updated_at
)
select
  tenant.target_id,
  specimen_map.target_id,
  legacy_position.target_aggregate_version,
  location_map.target_id,
  event_map.target_id,
  canonical_specimen.updated_at
from migration_legacy_custody_stage as legacy_position
join control.legacy_identity_map as tenant
  on tenant.baseline_version = 'v0.1'
 and tenant.entity_kind = 'tenant'
 and tenant.source_tenant = legacy_position.tenant_id
join control.legacy_identity_map as specimen_map
  on specimen_map.baseline_version = 'v0.1'
 and specimen_map.entity_kind = 'specimen'
 and specimen_map.source_tenant = legacy_position.tenant_id
 and specimen_map.source_identity = legacy_position.specimen_id
join laboratory.specimen as canonical_specimen
  on canonical_specimen.tenant_id = tenant.target_id
 and canonical_specimen.specimen_id = specimen_map.target_id
join control.legacy_identity_map as location_map
  on location_map.baseline_version = 'v0.1'
 and location_map.entity_kind = 'location'
 and location_map.source_tenant = legacy_position.tenant_id
 and location_map.source_identity = legacy_position.location_path
join control.legacy_identity_map as event_map
  on event_map.baseline_version = 'v0.1'
 and event_map.entity_kind = 'custody_event'
 and event_map.source_tenant = legacy_position.tenant_id
 and event_map.source_identity = control.legacy_compound_identity(
   'custody-event',
   jsonb_build_array(
     legacy_position.specimen_id,
     legacy_position.aggregate_version
   )
 )
on conflict (tenant_id, specimen_id) do update
set custody_version = excluded.custody_version,
    location_id = excluded.location_id,
    last_custody_event_id = excluded.last_custody_event_id,
    updated_at = excluded.updated_at
where laboratory.custody_position.custody_version < excluded.custody_version;

-- Historical global evidence has no tenant coordinate. Its digest and source
-- identity enter an accountable scope-resolution route before promotion.
insert into control.legacy_upgrade_exception (
  baseline_version,
  entity_kind,
  source_tenant,
  source_identity,
  source_sha256,
  exception_class,
  accountable_role
)
select
  'v0.1',
  'execution_receipt',
  '<global-scope>',
  legacy_receipt.receipt_id,
  sha256(convert_to(row_to_json(legacy_receipt)::text, 'UTF8')),
  'tenant_scope_requires_accountable_mapping',
  'quality_and_regulatory'
from public.execution_receipt as legacy_receipt
on conflict do nothing;

-- Every remaining source population receives an explicit disposition surface.
-- A later bounded mapping can promote these rows; cutover remains closed while
-- any resulting exception retains the open disposition.
insert into control.legacy_upgrade_exception (
  baseline_version,
  entity_kind,
  source_tenant,
  source_identity,
  source_sha256,
  exception_class,
  accountable_role
)
select
  'v0.1',
  'idempotency_reservation',
  legacy_reservation.tenant_id,
  jsonb_build_array(
    legacy_reservation.scope,
    legacy_reservation.request_key
  )::text,
  sha256(convert_to(row_to_json(legacy_reservation)::text, 'UTF8')),
  'contract_specific_mapping_required',
  'integration_operations'
from public.idempotency_reservation as legacy_reservation
on conflict do nothing;

insert into control.legacy_upgrade_exception (
  baseline_version,
  entity_kind,
  source_tenant,
  source_identity,
  source_sha256,
  exception_class,
  accountable_role
)
select
  'v0.1',
  'integration_inbox',
  legacy_inbox.tenant_id,
  jsonb_build_array(
    legacy_inbox.source,
    legacy_inbox.message_id
  )::text,
  sha256(convert_to(row_to_json(legacy_inbox)::text, 'UTF8')),
  'contract_specific_mapping_required',
  'integration_operations'
from public.integration_inbox as legacy_inbox
on conflict do nothing;

insert into control.legacy_upgrade_exception (
  baseline_version,
  entity_kind,
  source_tenant,
  source_identity,
  source_sha256,
  exception_class,
  accountable_role
)
select
  'v0.1',
  'integration_outbox',
  legacy_outbox.tenant_id,
  legacy_outbox.message_id,
  sha256(convert_to(row_to_json(legacy_outbox)::text, 'UTF8')),
  'contract_specific_mapping_required',
  'integration_operations'
from public.integration_outbox as legacy_outbox
on conflict do nothing;

insert into control.legacy_upgrade_exception (
  baseline_version,
  entity_kind,
  source_tenant,
  source_identity,
  source_sha256,
  exception_class,
  accountable_role
)
select
  'v0.1',
  'trace_link',
  '<global-scope>',
  jsonb_build_array(
    legacy_trace.receipt_id,
    legacy_trace.requirement_id,
    legacy_trace.risk_id,
    legacy_trace.control_id,
    legacy_trace.test_id
  )::text,
  sha256(convert_to(row_to_json(legacy_trace)::text, 'UTF8')),
  'tenant_scope_requires_accountable_mapping',
  'quality_and_regulatory'
from public.trace_link as legacy_trace
on conflict do nothing;

insert into control.legacy_upgrade_exception (
  baseline_version,
  entity_kind,
  source_tenant,
  source_identity,
  source_sha256,
  exception_class,
  accountable_role
)
select
  'v0.1',
  'open_receipt',
  '<global-scope>',
  legacy_open_receipt.open_receipt_id,
  sha256(convert_to(row_to_json(legacy_open_receipt)::text, 'UTF8')),
  'tenant_scope_requires_accountable_mapping',
  'quality_and_regulatory'
from public.open_receipt as legacy_open_receipt
on conflict do nothing;

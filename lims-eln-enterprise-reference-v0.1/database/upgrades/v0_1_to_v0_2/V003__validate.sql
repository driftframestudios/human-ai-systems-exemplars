-- TARGET: validation proves that every row in every supported v0.1 source
-- population has one canonical target or one accountable exception.
-- VERIFY: counts, stable identities, typed transformations, source digests, and
-- representation digests bind one immutable validation receipt.

set lock_timeout = '5s';
set statement_timeout = '5min';
set search_path = pg_catalog, control, laboratory, public;

select pg_advisory_xact_lock(hashtextextended('lims-eln-v0.1-to-v0.2', 0));

create table control.legacy_upgrade_validation (
  validation_id uuid not null,
  baseline_version text not null,
  migration_head text not null,
  source_manifest jsonb not null,
  source_manifest_sha256 bytea not null,
  source_rows_sha256 bytea not null,
  representation_manifest jsonb not null,
  representation_manifest_sha256 bytea not null,
  open_exception_count bigint not null,
  validated_at control.finite_instant not null default transaction_timestamp(),
  constraint legacy_upgrade_validation_pk primary key (validation_id),
  constraint legacy_upgrade_validation_baseline_uq unique (baseline_version),
  constraint legacy_upgrade_validation_source_shape_ck check (
    jsonb_typeof(source_manifest) = 'object'
    and octet_length(source_manifest_sha256) = 32
    and octet_length(source_rows_sha256) = 32
  ),
  constraint legacy_upgrade_validation_representation_shape_ck check (
    jsonb_typeof(representation_manifest) = 'object'
    and octet_length(representation_manifest_sha256) = 32
  ),
  constraint legacy_upgrade_validation_exception_count_ck check (
    open_exception_count >= 0
  )
);

alter table control.legacy_upgrade_validation owner to laboratory_owner;
revoke all on control.legacy_upgrade_validation from public;
create trigger legacy_upgrade_validation_append_only
before update or delete on control.legacy_upgrade_validation
for each row execute function control.preserve_append_only_record();

create function control.legacy_v0_1_representation_manifest()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, control, laboratory
as $function$
  select jsonb_build_object(
    'identityMapCount', (
      select count(*) from control.legacy_identity_map
      where baseline_version = 'v0.1'
    ),
    'identityMapSha256', encode(sha256(convert_to(coalesce((
      select string_agg((
        to_jsonb(identity_map) - 'recorded_at'
      )::text, E'\n' order by
        identity_map.entity_kind,
        identity_map.source_tenant,
        identity_map.source_identity)
      from control.legacy_identity_map as identity_map
      where identity_map.baseline_version = 'v0.1'
    ), ''), 'UTF8')), 'hex'),
    'exceptionCount', (
      select count(*) from control.legacy_upgrade_exception
      where baseline_version = 'v0.1'
    ),
    'exceptionSha256', encode(sha256(convert_to(coalesce((
      select string_agg((
        to_jsonb(exception_record) - array['opened_at', 'resolved_at']
      )::text, E'\n' order by
        exception_record.entity_kind,
        exception_record.source_tenant,
        exception_record.source_identity,
        exception_record.exception_class)
      from control.legacy_upgrade_exception as exception_record
      where exception_record.baseline_version = 'v0.1'
    ), ''), 'UTF8')), 'hex'),
    'targetProjection', jsonb_build_object(
      'specimen', jsonb_build_object(
        'count', (
          select count(*)
          from laboratory.specimen as target_row
          join control.legacy_identity_map as identity_map
            on identity_map.baseline_version = 'v0.1'
           and identity_map.entity_kind = 'specimen'
           and identity_map.target_id = target_row.specimen_id
        ),
        'sha256', encode(sha256(convert_to(coalesce((
          select string_agg(to_jsonb(target_row)::text, E'\n'
            order by target_row.tenant_id, target_row.specimen_id)
          from laboratory.specimen as target_row
          join control.legacy_identity_map as identity_map
            on identity_map.baseline_version = 'v0.1'
           and identity_map.entity_kind = 'specimen'
           and identity_map.target_id = target_row.specimen_id
        ), ''), 'UTF8')), 'hex')
      ),
      'specimenEvent', jsonb_build_object(
        'count', (
          select count(*)
          from laboratory.specimen_event as target_row
          join control.legacy_identity_map as identity_map
            on identity_map.baseline_version = 'v0.1'
           and identity_map.entity_kind = 'specimen_event'
           and identity_map.target_id = target_row.event_id
        ),
        'sha256', encode(sha256(convert_to(coalesce((
          select string_agg(to_jsonb(target_row)::text, E'\n'
            order by target_row.tenant_id, target_row.specimen_id,
              target_row.aggregate_version)
          from laboratory.specimen_event as target_row
          join control.legacy_identity_map as identity_map
            on identity_map.baseline_version = 'v0.1'
           and identity_map.entity_kind = 'specimen_event'
           and identity_map.target_id = target_row.event_id
        ), ''), 'UTF8')), 'hex')
      ),
      'custodyPosition', jsonb_build_object(
        'count', (
          select count(*)
          from laboratory.custody_position as target_row
          join control.legacy_identity_map as identity_map
            on identity_map.baseline_version = 'v0.1'
           and identity_map.entity_kind = 'specimen'
           and identity_map.target_id = target_row.specimen_id
        ),
        'sha256', encode(sha256(convert_to(coalesce((
          select string_agg(to_jsonb(target_row)::text, E'\n'
            order by target_row.tenant_id, target_row.specimen_id)
          from laboratory.custody_position as target_row
          join control.legacy_identity_map as identity_map
            on identity_map.baseline_version = 'v0.1'
           and identity_map.entity_kind = 'specimen'
           and identity_map.target_id = target_row.specimen_id
        ), ''), 'UTF8')), 'hex')
      )
    )
  )
$function$;

alter function control.legacy_v0_1_representation_manifest()
  owner to laboratory_owner;
revoke all on function control.legacy_v0_1_representation_manifest()
  from public;

create function control.legacy_v0_1_source_rows_sha256()
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
    from public.specimen as source_row
    union all
    select
      'specimen_event',
      jsonb_build_array(
        source_row.tenant_id,
        source_row.specimen_id,
        source_row.aggregate_version
      )::text,
      to_jsonb(source_row)
    from public.specimen_event as source_row
    union all
    select
      'custody_position',
      jsonb_build_array(source_row.tenant_id, source_row.specimen_id)::text,
      to_jsonb(source_row)
    from public.custody_position as source_row
    union all
    select
      'idempotency_reservation',
      jsonb_build_array(
        source_row.tenant_id,
        source_row.scope,
        source_row.request_key
      )::text,
      to_jsonb(source_row)
    from public.idempotency_reservation as source_row
    union all
    select
      'integration_inbox',
      jsonb_build_array(
        source_row.tenant_id,
        source_row.source,
        source_row.message_id
      )::text,
      to_jsonb(source_row)
    from public.integration_inbox as source_row
    union all
    select
      'integration_outbox',
      jsonb_build_array(source_row.tenant_id, source_row.message_id)::text,
      to_jsonb(source_row)
    from public.integration_outbox as source_row
    union all
    select
      'execution_receipt',
      jsonb_build_array(source_row.receipt_id)::text,
      to_jsonb(source_row)
    from public.execution_receipt as source_row
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
    from public.trace_link as source_row
    union all
    select
      'open_receipt',
      jsonb_build_array(source_row.open_receipt_id)::text,
      to_jsonb(source_row)
    from public.open_receipt as source_row
  ) as source_record
$function$;

-- The migration executor retains ownership and supplies the bounded read
-- authority required to attest the source. Cutover removes this transient
-- helper after preserving the digest in the upgrade receipt.
revoke all on function control.legacy_v0_1_source_rows_sha256() from public;

do $validation$
declare
  source_count bigint;
  mapped_count bigint;
  exception_count bigint;
  source_manifest_document jsonb;
  representation_manifest_document jsonb;
begin
  select count(*) into source_count from public.specimen;
  select count(*) into mapped_count
  from control.legacy_identity_map as identity_map
  join control.legacy_identity_map as tenant_map
    on tenant_map.baseline_version = identity_map.baseline_version
   and tenant_map.entity_kind = 'tenant'
   and tenant_map.source_tenant = identity_map.source_tenant
  join laboratory.specimen as target_specimen
    on target_specimen.tenant_id = tenant_map.target_id
   and target_specimen.specimen_id = identity_map.target_id
  where identity_map.baseline_version = 'v0.1'
    and identity_map.entity_kind = 'specimen';
  select count(distinct (source_tenant, source_identity)) into exception_count
  from control.legacy_upgrade_exception
  where baseline_version = 'v0.1'
    and entity_kind = 'specimen';
  if source_count <> mapped_count + exception_count then
    raise exception 'specimen representation differs: source %, mapped %, exception %',
      source_count, mapped_count, exception_count;
  end if;

  if exists (
    select 1
    from control.legacy_identity_map as identity_map
    join control.legacy_upgrade_exception as exception_record
      on exception_record.baseline_version = identity_map.baseline_version
     and exception_record.entity_kind = identity_map.entity_kind
     and exception_record.source_tenant = identity_map.source_tenant
     and exception_record.source_identity = identity_map.source_identity
    where identity_map.baseline_version = 'v0.1'
  ) then
    raise exception 'a legacy identity has both a canonical mapping and an exception';
  end if;

  select count(*) into source_count from public.specimen_event;
  select count(*) into mapped_count
  from control.legacy_identity_map as identity_map
  join control.legacy_identity_map as tenant_map
    on tenant_map.baseline_version = identity_map.baseline_version
   and tenant_map.entity_kind = 'tenant'
   and tenant_map.source_tenant = identity_map.source_tenant
  join laboratory.specimen_event as target_event
    on target_event.tenant_id = tenant_map.target_id
   and target_event.event_id = identity_map.target_id
  where identity_map.baseline_version = 'v0.1'
    and identity_map.entity_kind = 'specimen_event';
  select count(distinct (source_tenant, source_identity)) into exception_count
  from control.legacy_upgrade_exception
  where baseline_version = 'v0.1'
    and entity_kind = 'specimen_event';
  if source_count <> mapped_count + exception_count then
    raise exception 'event representation differs: source %, mapped %, exception %',
      source_count, mapped_count, exception_count;
  end if;

  select count(*) into source_count from public.custody_position;
  select count(*) into mapped_count
  from control.legacy_identity_map as identity_map
  join control.legacy_identity_map as tenant_map
    on tenant_map.baseline_version = identity_map.baseline_version
   and tenant_map.entity_kind = 'tenant'
   and tenant_map.source_tenant = identity_map.source_tenant
  join laboratory.custody_event as target_event
    on target_event.tenant_id = tenant_map.target_id
   and target_event.custody_event_id = identity_map.target_id
  where identity_map.baseline_version = 'v0.1'
    and identity_map.entity_kind = 'custody_event';
  select count(distinct (source_tenant, source_identity)) into exception_count
  from control.legacy_upgrade_exception
  where baseline_version = 'v0.1'
    and entity_kind = 'custody_position';
  if source_count <> mapped_count + exception_count then
    raise exception 'custody representation differs: source %, mapped %, exception %',
      source_count, mapped_count, exception_count;
  end if;

  select count(*) into source_count from public.idempotency_reservation;
  select count(distinct (source_tenant, source_identity)) into exception_count
  from control.legacy_upgrade_exception
  where baseline_version = 'v0.1'
    and entity_kind = 'idempotency_reservation';
  if source_count <> exception_count then
    raise exception 'idempotency representation differs: source %, exception %',
      source_count, exception_count;
  end if;

  select count(*) into source_count from public.integration_inbox;
  select count(distinct (source_tenant, source_identity)) into exception_count
  from control.legacy_upgrade_exception
  where baseline_version = 'v0.1'
    and entity_kind = 'integration_inbox';
  if source_count <> exception_count then
    raise exception 'inbox representation differs: source %, exception %',
      source_count, exception_count;
  end if;

  select count(*) into source_count from public.integration_outbox;
  select count(distinct (source_tenant, source_identity)) into exception_count
  from control.legacy_upgrade_exception
  where baseline_version = 'v0.1'
    and entity_kind = 'integration_outbox';
  if source_count <> exception_count then
    raise exception 'outbox representation differs: source %, exception %',
      source_count, exception_count;
  end if;

  select count(*) into source_count from public.execution_receipt;
  select count(distinct (source_tenant, source_identity)) into exception_count
  from control.legacy_upgrade_exception
  where baseline_version = 'v0.1'
    and entity_kind = 'execution_receipt';
  if source_count <> exception_count then
    raise exception 'execution-receipt representation differs: source %, exception %',
      source_count, exception_count;
  end if;

  select count(*) into source_count from public.trace_link;
  select count(distinct (source_tenant, source_identity)) into exception_count
  from control.legacy_upgrade_exception
  where baseline_version = 'v0.1'
    and entity_kind = 'trace_link';
  if source_count <> exception_count then
    raise exception 'trace representation differs: source %, exception %',
      source_count, exception_count;
  end if;

  select count(*) into source_count from public.open_receipt;
  select count(distinct (source_tenant, source_identity)) into exception_count
  from control.legacy_upgrade_exception
  where baseline_version = 'v0.1'
    and entity_kind = 'open_receipt';
  if source_count <> exception_count then
    raise exception 'open-receipt representation differs: source %, exception %',
      source_count, exception_count;
  end if;

  if exists (
    select 1
    from control.legacy_identity_map as identity_map
    where identity_map.target_id <> control.stable_migration_uuid(
      'lims-eln/' || identity_map.baseline_version || '/' || identity_map.entity_kind
        || '/source-tenant/'
        || octet_length(convert_to(identity_map.source_tenant, 'UTF8'))::text
        || ':' || identity_map.source_tenant,
      identity_map.source_identity
    )
  ) then
    raise exception 'legacy identity mapping differs from the stable namespace contract';
  end if;

  if exists (
    select 1
    from public.specimen as source_specimen
    join control.legacy_identity_map as identity_map
      on identity_map.baseline_version = 'v0.1'
     and identity_map.entity_kind = 'specimen'
     and identity_map.source_tenant = source_specimen.tenant_id
     and identity_map.source_identity = source_specimen.specimen_id
    join laboratory.specimen as target_specimen
      on target_specimen.specimen_id = identity_map.target_id
    where target_specimen.aggregate_version <> case
            when source_specimen.aggregate_version
              between 0 and 9223372036854775806
              then source_specimen.aggregate_version + 1
            else null
          end
       or target_specimen.updated_at <> case
            when control.is_canonical_rfc3339_instant(
              source_specimen.updated_at_utc
            ) then source_specimen.updated_at_utc::control.finite_instant
            else null
          end
  ) then
    raise exception 'specimen typed transformation differs from the declared contract';
  end if;

  if exists (
    select 1
    from public.specimen_event as source_event
    join control.legacy_identity_map as identity_map
      on identity_map.baseline_version = 'v0.1'
     and identity_map.entity_kind = 'specimen_event'
     and identity_map.source_tenant = source_event.tenant_id
     and identity_map.source_identity = control.legacy_compound_identity(
       'specimen-event',
       jsonb_build_array(source_event.specimen_id, source_event.aggregate_version)
     )
    join laboratory.specimen_event as target_event
      on target_event.event_id = identity_map.target_id
    where target_event.aggregate_version <> case
            when source_event.aggregate_version
              between 0 and 9223372036854775806
              then source_event.aggregate_version + 1
            else null
          end
       or target_event.occurred_at <> case
            when control.is_canonical_rfc3339_instant(
              source_event.occurred_at_utc
            ) then source_event.occurred_at_utc::control.finite_instant
            else null
          end
  ) then
    raise exception 'event typed transformation differs from the declared contract';
  end if;

  if exists (
    select 1
    from laboratory.specimen as target_specimen
    left join laboratory.tenant as target_tenant
      on target_tenant.tenant_id = target_specimen.tenant_id
    where target_tenant.tenant_id is null
  ) then
    raise exception 'target specimen tenant integrity differs';
  end if;

  if exists (
    select 1
    from public.specimen as source_specimen
    join control.legacy_identity_map as tenant_map
      on tenant_map.baseline_version = 'v0.1'
     and tenant_map.entity_kind = 'tenant'
     and tenant_map.source_tenant = source_specimen.tenant_id
    join control.legacy_identity_map as source_system_map
      on source_system_map.baseline_version = 'v0.1'
     and source_system_map.entity_kind = 'source_system'
     and source_system_map.source_tenant = source_specimen.tenant_id
    join control.legacy_identity_map as specimen_map
      on specimen_map.baseline_version = 'v0.1'
     and specimen_map.entity_kind = 'specimen'
     and specimen_map.source_tenant = source_specimen.tenant_id
     and specimen_map.source_identity = source_specimen.specimen_id
    join laboratory.specimen as target_specimen
      on target_specimen.tenant_id = tenant_map.target_id
     and target_specimen.specimen_id = specimen_map.target_id
    cross join lateral (
      select jsonb_build_object(
        'schemaVersion', '0.2.0',
        'legacyBaseline', 'v0.1',
        'externalSpecimenId', source_specimen.specimen_id,
        'legacyState', source_specimen.state,
        'legacyCanonicalSha256', lower(source_specimen.canonical_sha256)
      ) as value
    ) as expected_document
    where target_specimen.source_system_id
        is distinct from source_system_map.target_id
       or target_specimen.external_specimen_id
        is distinct from source_specimen.specimen_id
       or target_specimen.lifecycle_state is distinct from case source_specimen.state
            when 'received' then 'registered'
            when 'accessioned' then 'accessioned'
            when 'processing' then 'in_process'
            when 'review' then 'under_review'
            when 'released' then 'released'
            when 'voided' then 'voided'
          end
       or target_specimen.canonical_document is distinct from expected_document.value
       or target_specimen.canonical_sha256 is distinct from
          sha256(convert_to(expected_document.value::text, 'UTF8'))
       or target_specimen.canonicalization_version
          is distinct from 'postgresql-jsonb-text-v1'
  ) then
    raise exception 'specimen target projection differs from the declared transformation';
  end if;

  if exists (
    select 1
    from public.specimen_event as source_event
    join control.legacy_identity_map as tenant_map
      on tenant_map.baseline_version = 'v0.1'
     and tenant_map.entity_kind = 'tenant'
     and tenant_map.source_tenant = source_event.tenant_id
    join control.legacy_identity_map as specimen_map
      on specimen_map.baseline_version = 'v0.1'
     and specimen_map.entity_kind = 'specimen'
     and specimen_map.source_tenant = source_event.tenant_id
     and specimen_map.source_identity = source_event.specimen_id
    join control.legacy_identity_map as event_map
      on event_map.baseline_version = 'v0.1'
     and event_map.entity_kind = 'specimen_event'
     and event_map.source_tenant = source_event.tenant_id
     and event_map.source_identity = control.legacy_compound_identity(
       'specimen-event',
       jsonb_build_array(source_event.specimen_id, source_event.aggregate_version)
     )
    join control.legacy_identity_map as command_map
      on command_map.baseline_version = 'v0.1'
     and command_map.entity_kind = 'command'
     and command_map.source_tenant = source_event.tenant_id
     and command_map.source_identity = source_event.command_id
    join control.legacy_identity_map as actor_map
      on actor_map.baseline_version = 'v0.1'
     and actor_map.entity_kind = 'actor'
     and actor_map.source_tenant = source_event.tenant_id
     and actor_map.source_identity = source_event.actor_id
    join laboratory.specimen_event as target_event
      on target_event.tenant_id = tenant_map.target_id
     and target_event.event_id = event_map.target_id
    cross join lateral (
      select jsonb_build_object(
        'schemaVersion', '0.2.0',
        'legacyBaseline', 'v0.1',
        'legacyCommandSha256', lower(source_event.command_sha256),
        'legacySignatureMeaning', source_event.signature_meaning
      ) as value
    ) as expected_payload
    where target_event.specimen_id is distinct from specimen_map.target_id
       or target_event.command_id is distinct from command_map.target_id
       or target_event.command_sha256 is distinct from
          decode(lower(source_event.command_sha256), 'hex')
       or target_event.event_type is distinct from source_event.event_type
       or target_event.actor_id is distinct from actor_map.target_id
       or target_event.correlation_id is distinct from command_map.target_id
       or target_event.reason_code
          is distinct from nullif(btrim(source_event.reason_code), '')
       or target_event.payload is distinct from expected_payload.value
       or target_event.payload_sha256 is distinct from
          sha256(convert_to(expected_payload.value::text, 'UTF8'))
       or target_event.payload_schema_version is distinct from '0.2.0'
       or target_event.canonicalization_version is distinct from
          'legacy-command-sha256+postgresql-jsonb-text-v1'
  ) then
    raise exception 'event target projection differs from the declared transformation';
  end if;

  if exists (
    select 1
    from public.custody_position as source_position
    join control.legacy_identity_map as tenant_map
      on tenant_map.baseline_version = 'v0.1'
     and tenant_map.entity_kind = 'tenant'
     and tenant_map.source_tenant = source_position.tenant_id
    join control.legacy_identity_map as specimen_map
      on specimen_map.baseline_version = 'v0.1'
     and specimen_map.entity_kind = 'specimen'
     and specimen_map.source_tenant = source_position.tenant_id
     and specimen_map.source_identity = source_position.specimen_id
    join control.legacy_identity_map as location_map
      on location_map.baseline_version = 'v0.1'
     and location_map.entity_kind = 'location'
     and location_map.source_tenant = source_position.tenant_id
     and location_map.source_identity = source_position.location_path
    join control.legacy_identity_map as event_map
      on event_map.baseline_version = 'v0.1'
     and event_map.entity_kind = 'custody_event'
     and event_map.source_tenant = source_position.tenant_id
     and event_map.source_identity = control.legacy_compound_identity(
       'custody-event',
       jsonb_build_array(source_position.specimen_id, source_position.aggregate_version)
     )
    join laboratory.custody_position as target_position
      on target_position.tenant_id = tenant_map.target_id
     and target_position.specimen_id = specimen_map.target_id
    where target_position.custody_version is distinct from case
            when source_position.aggregate_version
              between 0 and 9223372036854775806
              then source_position.aggregate_version + 1
            else null
          end
       or target_position.location_id is distinct from location_map.target_id
       or target_position.last_custody_event_id is distinct from event_map.target_id
  ) then
    raise exception 'custody target projection differs from the declared transformation';
  end if;

  source_manifest_document := jsonb_build_object(
    'specimen', jsonb_build_object(
      'count', (select count(*) from public.specimen),
      'sha256', encode(sha256(convert_to(coalesce((
        select string_agg(row_to_json(source_row)::text, E'\n'
          order by source_row.tenant_id, source_row.specimen_id)
        from public.specimen as source_row
      ), ''), 'UTF8')), 'hex')
    ),
    'specimenEvent', jsonb_build_object(
      'count', (select count(*) from public.specimen_event),
      'sha256', encode(sha256(convert_to(coalesce((
        select string_agg(row_to_json(source_row)::text, E'\n'
          order by source_row.tenant_id, source_row.specimen_id,
            source_row.aggregate_version)
        from public.specimen_event as source_row
      ), ''), 'UTF8')), 'hex')
    ),
    'custodyPosition', jsonb_build_object(
      'count', (select count(*) from public.custody_position),
      'sha256', encode(sha256(convert_to(coalesce((
        select string_agg(row_to_json(source_row)::text, E'\n'
          order by source_row.tenant_id, source_row.specimen_id)
        from public.custody_position as source_row
      ), ''), 'UTF8')), 'hex')
    ),
    'idempotencyReservation', jsonb_build_object(
      'count', (select count(*) from public.idempotency_reservation),
      'sha256', encode(sha256(convert_to(coalesce((
        select string_agg(row_to_json(source_row)::text, E'\n'
          order by source_row.tenant_id, source_row.scope, source_row.request_key)
        from public.idempotency_reservation as source_row
      ), ''), 'UTF8')), 'hex')
    ),
    'integrationInbox', jsonb_build_object(
      'count', (select count(*) from public.integration_inbox),
      'sha256', encode(sha256(convert_to(coalesce((
        select string_agg(row_to_json(source_row)::text, E'\n'
          order by source_row.tenant_id, source_row.source, source_row.message_id)
        from public.integration_inbox as source_row
      ), ''), 'UTF8')), 'hex')
    ),
    'integrationOutbox', jsonb_build_object(
      'count', (select count(*) from public.integration_outbox),
      'sha256', encode(sha256(convert_to(coalesce((
        select string_agg(row_to_json(source_row)::text, E'\n'
          order by source_row.tenant_id, source_row.message_id)
        from public.integration_outbox as source_row
      ), ''), 'UTF8')), 'hex')
    ),
    'executionReceipt', jsonb_build_object(
      'count', (select count(*) from public.execution_receipt),
      'sha256', encode(sha256(convert_to(coalesce((
        select string_agg(row_to_json(source_row)::text, E'\n'
          order by source_row.receipt_id)
        from public.execution_receipt as source_row
      ), ''), 'UTF8')), 'hex')
    ),
    'traceLink', jsonb_build_object(
      'count', (select count(*) from public.trace_link),
      'sha256', encode(sha256(convert_to(coalesce((
        select string_agg(row_to_json(source_row)::text, E'\n'
          order by source_row.receipt_id, source_row.requirement_id,
            source_row.risk_id, source_row.control_id, source_row.test_id)
        from public.trace_link as source_row
      ), ''), 'UTF8')), 'hex')
    ),
    'openReceipt', jsonb_build_object(
      'count', (select count(*) from public.open_receipt),
      'sha256', encode(sha256(convert_to(coalesce((
        select string_agg(row_to_json(source_row)::text, E'\n'
          order by source_row.open_receipt_id)
        from public.open_receipt as source_row
      ), ''), 'UTF8')), 'hex')
    )
  );

  representation_manifest_document :=
    control.legacy_v0_1_representation_manifest();

  insert into control.legacy_upgrade_validation (
    validation_id,
    baseline_version,
    migration_head,
    source_manifest,
    source_manifest_sha256,
    source_rows_sha256,
    representation_manifest,
    representation_manifest_sha256,
    open_exception_count
  ) values (
    control.stable_migration_uuid('lims-eln/upgrade-validation', 'v0.1'),
    'v0.1',
    'V006',
    source_manifest_document,
    sha256(convert_to(source_manifest_document::text, 'UTF8')),
    control.legacy_v0_1_source_rows_sha256(),
    representation_manifest_document,
    sha256(convert_to(representation_manifest_document::text, 'UTF8')),
    (
      select count(*)
      from control.legacy_upgrade_exception
      where baseline_version = 'v0.1'
        and disposition = 'open'
    )
  );
end
$validation$;

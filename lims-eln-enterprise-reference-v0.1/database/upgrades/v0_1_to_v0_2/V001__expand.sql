-- TARGET: a durable mapping and exception surface makes every v0.1 identity
-- representable before source rows move.
-- VERIFY: each source identity resolves to one stable target UUID or one owned
-- exception record.

set lock_timeout = '5s';
set statement_timeout = '90s';
set idle_in_transaction_session_timeout = '60s';
set search_path = pg_catalog, control, laboratory, public;

select pg_advisory_xact_lock(hashtextextended('lims-eln-v0.1-to-v0.2', 0));

create table control.legacy_identity_map (
  baseline_version text not null,
  entity_kind text not null,
  source_tenant text not null,
  source_identity text not null,
  target_id uuid not null,
  recorded_at control.finite_instant not null default transaction_timestamp(),
  constraint legacy_identity_map_pk primary key (
    baseline_version, entity_kind, source_tenant, source_identity
  ),
  constraint legacy_identity_map_target_uq unique (entity_kind, target_id),
  constraint legacy_identity_map_source_shape_ck check (
    source_tenant = btrim(source_tenant)
    and source_identity = btrim(source_identity)
    and char_length(source_tenant) between 1 and 255
    and char_length(source_identity) between 1 and 512
    and source_tenant !~ '[[:cntrl:]]'
    and source_identity !~ '[[:cntrl:]]'
  )
);

create function control.legacy_assign_identity_map_target()
returns trigger
language plpgsql
set search_path = pg_catalog, control
as $function$
begin
  if new.target_id is null then
    new.target_id := control.stable_migration_uuid(
      'lims-eln/' || new.baseline_version || '/' || new.entity_kind
        || '/source-tenant/'
        || octet_length(convert_to(new.source_tenant, 'UTF8'))::text || ':'
        || new.source_tenant,
      new.source_identity
    );
  end if;
  return new;
end
$function$;

create trigger legacy_identity_map_assign_target
before insert on control.legacy_identity_map
for each row execute function control.legacy_assign_identity_map_target();

create table control.legacy_upgrade_exception (
  exception_id uuid not null,
  baseline_version text not null,
  entity_kind text not null,
  source_tenant text not null,
  source_identity text not null,
  source_sha256 bytea not null,
  exception_class text not null,
  disposition text not null default 'open',
  accountable_role text not null,
  evidence_reference text,
  opened_at control.finite_instant not null default transaction_timestamp(),
  resolved_at control.finite_instant,
  constraint legacy_upgrade_exception_pk primary key (exception_id),
  constraint legacy_upgrade_exception_source_uq unique (
    baseline_version, entity_kind, source_tenant, source_identity, exception_class
  ),
  constraint legacy_upgrade_exception_digest_ck check (
    octet_length(source_sha256) = 32
  ),
  constraint legacy_upgrade_exception_disposition_ck check (
    disposition in ('open', 'mapped', 'source_corrected', 'accepted_exception')
  ),
  constraint legacy_upgrade_exception_resolution_ck check (
    (disposition = 'open' and resolved_at is null)
    or (disposition <> 'open' and resolved_at is not null and evidence_reference is not null)
  )
);

create function control.legacy_assign_upgrade_exception_id()
returns trigger
language plpgsql
set search_path = pg_catalog, control
as $function$
begin
  if new.exception_id is null then
    new.exception_id := control.stable_migration_uuid(
      'lims-eln/' || new.baseline_version || '/upgrade-exception/'
        || new.entity_kind || '/' || new.exception_class
        || '/source-tenant/'
        || octet_length(convert_to(new.source_tenant, 'UTF8'))::text || ':'
        || new.source_tenant,
      new.source_identity
    );
  end if;
  return new;
end
$function$;

create trigger legacy_upgrade_exception_assign_id
before insert on control.legacy_upgrade_exception
for each row execute function control.legacy_assign_upgrade_exception_id();

create function control.legacy_compound_identity(
  p_entity_kind text,
  p_components jsonb
)
returns text
language sql
immutable
strict
parallel safe
set search_path = pg_catalog
as $function$
  select p_entity_kind || ':' || encode(
    sha256(convert_to(p_components::text, 'UTF8')),
    'hex'
  )
$function$;

revoke all on control.legacy_identity_map from public;
revoke all on control.legacy_upgrade_exception from public;
alter table control.legacy_identity_map owner to laboratory_owner;
alter table control.legacy_upgrade_exception owner to laboratory_owner;
alter function control.legacy_assign_identity_map_target()
  owner to laboratory_owner;
revoke all on function control.legacy_assign_identity_map_target() from public;
alter function control.legacy_assign_upgrade_exception_id()
  owner to laboratory_owner;
revoke all on function control.legacy_assign_upgrade_exception_id() from public;
alter function control.legacy_compound_identity(text, jsonb)
  owner to laboratory_owner;
revoke all on function control.legacy_compound_identity(text, jsonb) from public;

insert into control.legacy_identity_map (
  baseline_version, entity_kind, source_tenant, source_identity
)
select distinct 'v0.1', 'tenant', source_tenant, source_tenant
from (
  select tenant_id as source_tenant from public.specimen
  union select tenant_id from public.specimen_event
  union select tenant_id from public.custody_position
  union select tenant_id from public.idempotency_reservation
  union select tenant_id from public.integration_inbox
  union select tenant_id from public.integration_outbox
) as tenant_source
where source_tenant = btrim(source_tenant)
  and char_length(source_tenant) between 1 and 255
  and source_tenant !~ '[[:cntrl:]]'
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
  'tenant',
  coalesce(tenant_source.source_tenant, '<null>'),
  coalesce(tenant_source.source_tenant, '<null>'),
  sha256(convert_to(
    'tenant' || chr(31) || coalesce(tenant_source.source_tenant, '<null>'),
    'UTF8'
  )),
  'invalid_external_identity',
  'data_steward'
from (
  select tenant_id as source_tenant from public.specimen
  union select tenant_id from public.specimen_event
  union select tenant_id from public.custody_position
  union select tenant_id from public.idempotency_reservation
  union select tenant_id from public.integration_inbox
  union select tenant_id from public.integration_outbox
) as tenant_source
where tenant_source.source_tenant is null
   or tenant_source.source_tenant <> btrim(tenant_source.source_tenant)
   or char_length(tenant_source.source_tenant) not between 1 and 255
   or tenant_source.source_tenant ~ '[[:cntrl:]]'
on conflict do nothing;

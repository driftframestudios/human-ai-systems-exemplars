-- TARGET: PostgreSQL schemas and native domains establish one canonical data
-- contract before laboratory records are introduced.
-- VERIFY: catalog assertions confirm exact physical types and named checks.

set lock_timeout = '5s';
set statement_timeout = '60s';
set idle_in_transaction_session_timeout = '60s';
set search_path = pg_catalog;

select pg_advisory_xact_lock(hashtextextended('lims-eln-schema-v0.2', 0));

create schema control authorization laboratory_owner;
create schema laboratory authorization laboratory_owner;

create domain control.nonblank_text as text
  constraint nonblank_text_shape_ck
  check (
    value = btrim(value)
    and char_length(value) between 1 and 255
  );

create domain control.external_identity as text
  constraint external_identity_shape_ck
  check (
    value = btrim(value)
    and char_length(value) between 1 and 512
    and value !~ '[[:cntrl:]]'
  );

create domain control.sha256_digest as bytea
  constraint sha256_digest_length_ck
  check (octet_length(value) = 32);

create domain control.ucum_code as text
  constraint ucum_code_shape_ck
  check (
    value = btrim(value)
    and char_length(value) between 1 and 64
    and value ~ '^[A-Za-z0-9%./*(){}\[\]+-]+$'
  );

create domain control.finite_instant as timestamptz
  constraint finite_instant_value_ck
  check (isfinite(value));

-- The migration profile retains microsecond precision and one explicit offset.
-- A single validator keeps legacy classification independent of DateStyle.
create function control.is_canonical_rfc3339_instant(p_value text)
returns boolean
language plpgsql
stable
strict
parallel safe
set search_path = pg_catalog
as $function$
begin
  if p_value !~ '^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,6})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$' then
    return false;
  end if;
  if not pg_input_is_valid(p_value, 'timestamptz') then
    return false;
  end if;
  return isfinite(p_value::timestamptz);
end
$function$;

create table laboratory.tenant (
  tenant_id uuid not null,
  tenant_code control.nonblank_text not null,
  display_name control.nonblank_text not null,
  data_classification control.nonblank_text not null default 'regulated_laboratory',
  created_at timestamptz not null default transaction_timestamp(),
  retired_at timestamptz,
  constraint tenant_pk primary key (tenant_id),
  constraint tenant_code_uq unique (tenant_code),
  constraint tenant_retirement_order_ck check (
    retired_at is null or retired_at >= created_at
  )
);

create table control.tenant_principal_grant (
  database_principal name not null,
  tenant_id uuid not null,
  authorized_by control.nonblank_text not null,
  evidence_reference control.nonblank_text not null,
  effective_at timestamptz not null,
  expires_at timestamptz,
  recorded_at timestamptz not null default transaction_timestamp(),
  constraint tenant_principal_grant_pk primary key (database_principal),
  constraint tenant_principal_grant_tenant_fk foreign key (tenant_id)
    references laboratory.tenant (tenant_id) on update restrict on delete restrict,
  constraint tenant_principal_grant_window_ck check (
    expires_at is null or expires_at > effective_at
  )
);

create function control.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, control, laboratory
as $function$
  select grant_record.tenant_id
  from control.tenant_principal_grant as grant_record
  where grant_record.database_principal = session_user::name
    and grant_record.effective_at <= transaction_timestamp()
    and (
      grant_record.expires_at is null
      or grant_record.expires_at > transaction_timestamp()
    )
$function$;

revoke all on function control.current_tenant_id() from public;
grant execute on function control.current_tenant_id()
  to laboratory_tenant_runtime, laboratory_outbox_worker,
     laboratory_evidence_writer, laboratory_auditor;

create table laboratory.actor_principal (
  tenant_id uuid not null,
  actor_id uuid not null,
  identity_issuer control.nonblank_text not null,
  subject_identifier control.external_identity not null,
  display_label control.nonblank_text not null,
  principal_kind control.nonblank_text not null,
  effective_at timestamptz not null,
  retired_at timestamptz,
  recorded_at timestamptz not null default transaction_timestamp(),
  constraint actor_principal_pk primary key (tenant_id, actor_id),
  constraint actor_principal_tenant_fk foreign key (tenant_id)
    references laboratory.tenant (tenant_id) on update restrict on delete restrict,
  constraint actor_principal_subject_uq unique (
    tenant_id, identity_issuer, subject_identifier
  ),
  constraint actor_principal_kind_ck check (
    principal_kind in ('person', 'instrument', 'service', 'migration_operator')
  ),
  constraint actor_principal_window_ck check (
    retired_at is null or retired_at >= effective_at
  )
);

create table laboratory.source_system (
  tenant_id uuid not null,
  source_system_id uuid not null,
  system_code control.nonblank_text not null,
  system_kind control.nonblank_text not null,
  contract_version control.nonblank_text not null,
  effective_at timestamptz not null,
  retired_at timestamptz,
  constraint source_system_pk primary key (tenant_id, source_system_id),
  constraint source_system_tenant_fk foreign key (tenant_id)
    references laboratory.tenant (tenant_id) on update restrict on delete restrict,
  constraint source_system_code_uq unique (tenant_id, system_code),
  constraint source_system_kind_ck check (
    system_kind in ('lims', 'eln', 'instrument', 'erp', 'migration_source', 'object_store')
  ),
  constraint source_system_window_ck check (
    retired_at is null or retired_at >= effective_at
  )
);

alter table laboratory.tenant owner to laboratory_owner;
alter table control.tenant_principal_grant owner to laboratory_owner;
alter function control.current_tenant_id() owner to laboratory_owner;
alter domain control.finite_instant owner to laboratory_owner;
alter function control.is_canonical_rfc3339_instant(text)
  owner to laboratory_owner;
revoke all on function control.is_canonical_rfc3339_instant(text) from public;
alter table laboratory.actor_principal owner to laboratory_owner;
alter table laboratory.source_system owner to laboratory_owner;

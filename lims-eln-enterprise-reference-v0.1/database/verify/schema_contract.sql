-- TARGET: the catalog itself proves the native primitive, migration, tenancy,
-- immutability, and operational-index contract.

set search_path = pg_catalog, control, laboratory;

do $schema_contract$
declare
  relation_count integer;
  rls_count integer;
  forced_rls_count integer;
  append_only_trigger_count integer;
begin
  if to_regtype('timestamp with time zone') is null then
    raise exception 'PostgreSQL temporal type catalog is unavailable';
  end if;

  if to_regtype('control.finite_instant') is null
     or (
       select domain_type.typbasetype
       from pg_catalog.pg_type as domain_type
       where domain_type.oid = 'control.finite_instant'::regtype
     ) <> 'timestamptz'::regtype then
    raise exception 'control.finite_instant differs from a timestamptz domain';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint as domain_constraint
    where domain_constraint.contypid = 'control.finite_instant'::regtype
      and domain_constraint.contype = 'c'
      and pg_catalog.pg_get_constraintdef(domain_constraint.oid)
        like '%isfinite%'
  ) then
    raise exception 'control.finite_instant finite-value constraint differs';
  end if;

  if (
    select attribute.atttypid
    from pg_catalog.pg_attribute as attribute
    where attribute.attrelid = 'laboratory.specimen'::regclass
      and attribute.attname = 'updated_at'
      and attribute.attnum > 0
      and not attribute.attisdropped
  ) <> 'control.finite_instant'::regtype then
    raise exception 'specimen.updated_at differs from control.finite_instant';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_attribute as attribute
    join pg_catalog.pg_class as relation
      on relation.oid = attribute.attrelid
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname in ('control', 'laboratory')
      and relation.relkind in ('r', 'p')
      and attribute.attnum > 0
      and not attribute.attisdropped
      and attribute.atttypid = 'timestamptz'::regtype
  ) then
    raise exception 'persistent control or laboratory columns retain bare timestamptz';
  end if;

  if (
    select data_type
    from control.schema_contract_catalog
    where schema_name = 'laboratory'
      and relation_name = 'result_observation'
      and column_name = 'raw_value'
  ) <> 'numeric(38,12)' then
    raise exception 'result_observation.raw_value differs from numeric(38,12)';
  end if;

  if (
    select data_type
    from control.schema_contract_catalog
    where schema_name = 'laboratory'
      and relation_name = 'execution_receipt'
      and column_name = 'synthetic_data'
  ) <> 'boolean' then
    raise exception 'execution_receipt.synthetic_data differs from boolean';
  end if;

  if exists (
    select 1
    from control.schema_contract_catalog
    where schema_name = 'laboratory'
      and column_name ~ '(_at|_time|_timestamp)(_utc)?$'
      and data_type = 'text'
  ) then
    raise exception 'laboratory temporal columns include a text primitive';
  end if;

  select count(*) into relation_count
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'laboratory'
    and relation.relkind = 'r';

  select count(*) into rls_count
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'laboratory'
    and relation.relkind = 'r'
    and relation.relrowsecurity;

  select count(*) into forced_rls_count
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'laboratory'
    and relation.relkind = 'r'
    and relation.relforcerowsecurity;

  if rls_count <> relation_count or forced_rls_count <> relation_count then
    raise exception 'row-security coverage differs: relations %, enabled %, forced %',
      relation_count, rls_count, forced_rls_count;
  end if;

  select count(*) into append_only_trigger_count
  from pg_catalog.pg_trigger as trigger_record
  join pg_catalog.pg_class as relation
    on relation.oid = trigger_record.tgrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'laboratory'
    and trigger_record.tgname like '%_append_only'
    and not trigger_record.tgisinternal;

  if append_only_trigger_count < 18 then
    raise exception 'append-only trigger coverage differs: observed %',
      append_only_trigger_count;
  end if;

  if to_regclass('laboratory.outbox_ready_queue_idx') is null
     or to_regclass('laboratory.inbox_ready_queue_idx') is null
     or to_regclass('laboratory.migration_exception_open_idx') is null then
    raise exception 'operational index catalog differs';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_roles
    where rolname in (
      'laboratory_owner', 'laboratory_migrator', 'laboratory_tenant_runtime',
      'laboratory_outbox_worker', 'laboratory_evidence_writer',
      'laboratory_auditor'
    )
      and (rolsuper or rolbypassrls)
  ) then
    raise exception 'laboratory role authority differs from least privilege';
  end if;
end
$schema_contract$;

-- TARGET: cluster roles separate schema ownership, tenant workloads, workers,
-- evidence writing, migration, and read-only review.
-- VERIFY: database/verify/security_contract.sql inspects every role attribute.

do $bootstrap$
begin
  if not exists (select 1 from pg_roles where rolname = 'laboratory_owner') then
    create role laboratory_owner
      nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'laboratory_migrator') then
    create role laboratory_migrator
      nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'laboratory_tenant_runtime') then
    create role laboratory_tenant_runtime
      nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'laboratory_outbox_worker') then
    create role laboratory_outbox_worker
      nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'laboratory_evidence_writer') then
    create role laboratory_evidence_writer
      nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'laboratory_auditor') then
    create role laboratory_auditor
      nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
end
$bootstrap$;

revoke create on schema public from public;

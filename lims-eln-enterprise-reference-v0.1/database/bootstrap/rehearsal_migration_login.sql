-- TARGET: one ephemeral login authenticates the migration session while the
-- NOLOGIN owner role retains database object identity.
-- VERIFY: Flyway's afterConnect callback confirms the login attributes,
-- membership options, and target-database ACL from inside every connection.

\getenv migration_password FLYWAY_PASSWORD

select format(
  'create role %I login noinherit nosuperuser nocreatedb nocreaterole '
  || 'noreplication nobypassrls connection limit 8 password %L',
  :'migration_login',
  :'migration_password'
)
where not exists (
  select 1
  from pg_catalog.pg_roles
  where rolname = :'migration_login'
) \gexec

-- PostgreSQL 16+ stores SET, INHERIT, and ADMIN as independent membership
-- options. Repeated GRANT statements make every edge explicit and auditable.
select format(
  'grant laboratory_owner to %I with set true',
  :'migration_login'
) \gexec
select format(
  'grant laboratory_owner to %I with inherit false',
  :'migration_login'
) \gexec
select format(
  'grant laboratory_owner to %I with admin false',
  :'migration_login'
) \gexec

-- Flyway can create or lock its history through additional connections after
-- callback execution. A database-scoped connection default makes every such
-- connection start as the reviewed owner; RESET ROLE returns to this default.
select format(
  'alter role %I in database %I set role to laboratory_owner',
  :'migration_login',
  :'database_name'
) \gexec

select format(
  'revoke all privileges on database %I from public',
  :'database_name'
) \gexec
select format(
  'grant connect on database %I to %I',
  :'database_name',
  :'migration_login'
) \gexec
select format(
  'grant create, temporary on database %I to laboratory_owner',
  :'database_name'
) \gexec

revoke all on schema public from public;
grant usage, create on schema public to laboratory_owner;

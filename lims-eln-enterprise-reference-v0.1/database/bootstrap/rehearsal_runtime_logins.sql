-- TARGET: disposable workload logins exercise row-security and routine grants
-- without granting role administration to the migration session.
-- VERIFY: the runtime proof authenticates as the alpha login and observes one
-- tenant while the cluster administrator performs role provisioning only.

\getenv runtime_password LIMS_TEST_RUNTIME_PASSWORD

select format(
  'create role %I login inherit nosuperuser nocreatedb nocreaterole '
  || 'noreplication nobypassrls connection limit 4 password %L',
  :'tenant_alpha_role',
  :'runtime_password'
) \gexec
select format(
  'create role %I login inherit nosuperuser nocreatedb nocreaterole '
  || 'noreplication nobypassrls connection limit 4 password %L',
  :'tenant_beta_role',
  :'runtime_password'
) \gexec

select format(
  'grant laboratory_tenant_runtime to %I with set false',
  :'tenant_alpha_role'
) \gexec
select format(
  'grant laboratory_outbox_worker to %I with set false',
  :'tenant_alpha_role'
) \gexec
select format(
  'grant laboratory_tenant_runtime to %I with set false',
  :'tenant_beta_role'
) \gexec
select format(
  'grant laboratory_outbox_worker to %I with set false',
  :'tenant_beta_role'
) \gexec

select format(
  'grant connect on database %I to %I, %I',
  :'database_name',
  :'tenant_alpha_role',
  :'tenant_beta_role'
) \gexec

-- The alpha login receives database-local TEMPORARY solely to construct
-- same-named relations for the privileged-routine resolution proof. The
-- stable runtime role and beta control login retain the production contract.
select format(
  'grant temporary on database %I to %I',
  :'database_name',
  :'tenant_alpha_role'
) \gexec

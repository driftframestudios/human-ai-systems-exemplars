-- TARGET: forced row security admits cross-tenant data movement only through
-- the exact bounded deployment-login to NOLOGIN-owner session established by
-- cluster provisioning.
-- VERIFY: catalog proofs bind login attributes, membership options, database
-- defaults, direct ACLs, policy shape, and adversarial login-only denial.

set lock_timeout = '5s';
set statement_timeout = '90s';
set idle_in_transaction_session_timeout = '60s';
set search_path = pg_catalog;

select pg_advisory_xact_lock(hashtextextended('lims-eln-schema-v0.2', 0));

create function control.current_session_is_bounded_migration_owner()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $function$
  select
    login_role.rolcanlogin
    and not login_role.rolsuper
    and not login_role.rolcreatedb
    and not login_role.rolcreaterole
    and not login_role.rolinherit
    and not login_role.rolreplication
    and not login_role.rolbypassrls
    and login_role.rolconnlimit = 8
    and not membership.admin_option
    and not membership.inherit_option
    and membership.set_option
    and not exists (
      select 1
      from pg_catalog.pg_auth_members as unexpected_membership
      where unexpected_membership.member = login_role.oid
        and unexpected_membership.roleid <> owner_role.oid
    )
    and role_setting.setconfig = array['role=laboratory_owner']::text[]
    and coalesce(direct_acl.privileges, array[]::text[])
      = array['CONNECT']::text[]
  from pg_catalog.pg_roles as login_role
  join pg_catalog.pg_auth_members as membership
    on membership.member = login_role.oid
  join pg_catalog.pg_roles as owner_role
    on owner_role.oid = membership.roleid
   and owner_role.rolname = 'laboratory_owner'
  join pg_catalog.pg_database as database_record
    on database_record.datname = current_database()
  join pg_catalog.pg_db_role_setting as role_setting
    on role_setting.setrole = login_role.oid
   and role_setting.setdatabase = database_record.oid
  left join lateral (
    select array_agg(
      privilege_record.privilege_type
      order by privilege_record.privilege_type
    ) as privileges
    from pg_catalog.aclexplode(database_record.datacl) as privilege_record
    where privilege_record.grantee = login_role.oid
  ) as direct_acl on true
  where login_role.rolname = session_user
$function$;

alter function control.current_session_is_bounded_migration_owner()
  owner to laboratory_owner;
revoke all on function control.current_session_is_bounded_migration_owner()
  from public;

do $bounded_migration_policies$
declare
  relation_name text;
begin
  for relation_name in
    select relation.relname
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'laboratory'
      and relation.relkind in ('r', 'p')
      and relation.relrowsecurity
      and relation.relforcerowsecurity
    order by relation.relname
  loop
    execute format(
      'create policy bounded_migration_scope on laboratory.%I '
      || 'as permissive for all to laboratory_owner '
      || 'using (control.current_session_is_bounded_migration_owner()) '
      || 'with check (control.current_session_is_bounded_migration_owner())',
      relation_name
    );
  end loop;
end
$bounded_migration_policies$;

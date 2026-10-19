-- TARGET: Flyway authenticates as a bounded LOGIN role and deliberately adopts
-- the stable NOLOGIN object owner for DDL.
-- VERIFY: every Flyway connection rejects elevated login attributes, implicit
-- owner inheritance, broader direct database grants, or an unexpected role.

set role laboratory_owner;

do $bounded_flyway_caller$
declare
  login_record pg_catalog.pg_roles%rowtype;
  direct_privileges text[];
begin
  select * into strict login_record
  from pg_catalog.pg_roles
  where rolname = session_user;

  if session_user = current_user
     or current_user <> 'laboratory_owner' then
    raise exception using
      errcode = '42501',
      message = 'Flyway requires an explicit bounded-login to NOLOGIN-owner transition';
  end if;

  if not login_record.rolcanlogin
     or login_record.rolsuper
     or login_record.rolcreatedb
     or login_record.rolcreaterole
     or login_record.rolinherit
     or login_record.rolreplication
     or login_record.rolbypassrls
     or login_record.rolconnlimit <> 8 then
    raise exception using
      errcode = '42501',
      message = 'Flyway login attributes differ from the bounded-caller contract';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_auth_members as membership
    join pg_catalog.pg_roles as member_role
      on member_role.oid = membership.member
    join pg_catalog.pg_roles as granted_role
      on granted_role.oid = membership.roleid
    where member_role.rolname = session_user
      and granted_role.rolname = 'laboratory_owner'
      and not membership.admin_option
      and not membership.inherit_option
      and membership.set_option
  ) then
    raise exception using
      errcode = '42501',
      message = 'Flyway login membership requires SET TRUE, INHERIT FALSE, and ADMIN FALSE';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_auth_members as membership
    where membership.member = login_record.oid
  ) <> 1 then
    raise exception using
      errcode = '42501',
      message = 'Flyway login role membership inventory differs from the single reviewed owner edge';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_db_role_setting as role_setting
    join pg_catalog.pg_database as database_record
      on database_record.oid = role_setting.setdatabase
    where role_setting.setrole = login_record.oid
      and database_record.datname = current_database()
      and role_setting.setconfig = array['role=laboratory_owner']::text[]
  ) then
    raise exception using
      errcode = '42501',
      message = 'Flyway login lacks the target-scoped owner connection default';
  end if;

  select array_agg(privilege_record.privilege_type order by privilege_record.privilege_type)
  into direct_privileges
  from pg_catalog.pg_database as database_record
  cross join lateral pg_catalog.aclexplode(database_record.datacl)
    as privilege_record
  where database_record.datname = current_database()
    and privilege_record.grantee = login_record.oid;

  if direct_privileges is distinct from array['CONNECT']::text[] then
    raise exception using
      errcode = '42501',
      message = 'Flyway login direct target-database privileges differ from CONNECT';
  end if;

  if not has_database_privilege(
    'laboratory_owner', current_database(), 'CREATE,TEMPORARY'
  ) or not has_schema_privilege(
    'laboratory_owner', 'public', 'USAGE,CREATE'
  ) then
    raise exception using
      errcode = '42501',
      message = 'NOLOGIN owner lacks the reviewed target database or schema authority';
  end if;
end
$bounded_flyway_caller$;

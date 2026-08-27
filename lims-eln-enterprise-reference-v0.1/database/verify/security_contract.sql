-- TARGET: cluster roles, object ownership, row security, routine authority,
-- and Flyway history converge on the published least-authority contract.
-- VERIFY: catalog assertions cover every governed role and executable surface.

set search_path = pg_catalog;

do $security_contract$
declare
  expected_roles constant text[] := array[
    'laboratory_owner',
    'laboratory_migrator',
    'laboratory_tenant_runtime',
    'laboratory_outbox_worker',
    'laboratory_evidence_writer',
    'laboratory_auditor'
  ];
  required_security_definers constant text[] := array[
    'control.current_tenant_id()',
    'control.current_session_is_bounded_migration_owner()',
    'control.schema_fingerprint()',
    'control.migration_evidence_fingerprint()',
    'laboratory.record_specimen_transition(uuid,bigint,control.nonblank_text,jsonb,control.sha256_digest,uuid,uuid,control.sha256_digest,control.nonblank_text,uuid,uuid,uuid,uuid,control.nonblank_text,jsonb,control.sha256_digest,timestamptz,uuid,control.nonblank_text,control.external_identity,jsonb,control.sha256_digest)',
    'laboratory.claim_outbox_message(control.nonblank_text,uuid,integer)',
    'laboratory.confirm_outbox_delivery(uuid,control.nonblank_text,uuid,bigint,control.nonblank_text)',
    'laboratory.record_migration_exception_status(uuid,bigint,control.nonblank_text,uuid,uuid,control.nonblank_text,timestamptz,uuid)',
    'laboratory.record_acceptance_condition_status(uuid,bigint,control.nonblank_text,uuid,uuid,control.nonblank_text,timestamptz,uuid)',
    'laboratory.reclaim_expired_outbox_messages(integer)',
    'laboratory.record_result_observation(uuid,uuid,uuid,numeric,control.ucum_code,control.nonblank_text,numeric,numeric,control.external_identity,control.nonblank_text,timestamptz,uuid)'
  ];
  optional_security_definers constant text[] := array[
    'control.legacy_v0_1_representation_manifest()'
  ];
  observed_count integer;
  ownership_mismatch text;
  security_definer_mismatch text;
begin
  select count(*) into observed_count
  from pg_catalog.pg_roles
  where rolname = any (expected_roles);

  if observed_count <> cardinality(expected_roles) then
    raise exception using
      errcode = '55000',
      message = format(
        'governed database roles differ: expected %s, observed %s',
        cardinality(expected_roles),
        observed_count
      );
  end if;

  if exists (
    select 1
    from pg_catalog.pg_roles
    where rolname = any (expected_roles)
      and (
        rolcanlogin
        or rolsuper
        or rolcreatedb
        or rolcreaterole
        or rolinherit
        or rolreplication
        or rolbypassrls
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'governed role attributes differ from the NOLOGIN least-authority contract';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_auth_members as membership
    join pg_catalog.pg_roles as member_role
      on member_role.oid = membership.member
    join pg_catalog.pg_roles as granted_role
      on granted_role.oid = membership.roleid
    where member_role.rolname = any (expected_roles)
      or (
        granted_role.rolname = 'laboratory_owner'
        and not (
          member_role.rolname = session_user
          and not membership.admin_option
          and not membership.inherit_option
          and membership.set_option
        )
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'governed role membership graph differs from the published contract';
  end if;

  if session_user = current_user
     or current_user <> 'laboratory_owner'
     or control.current_session_is_bounded_migration_owner() is distinct from true
     or not exists (
       select 1
       from pg_catalog.pg_roles as migration_login
       where migration_login.rolname = session_user
         and migration_login.rolcanlogin
         and not migration_login.rolsuper
         and not migration_login.rolcreatedb
         and not migration_login.rolcreaterole
         and not migration_login.rolinherit
         and not migration_login.rolreplication
         and not migration_login.rolbypassrls
     ) then
    raise exception using
      errcode = '55000',
      message = 'verification session differs from the bounded migration caller';
  end if;

  if has_database_privilege(
    'laboratory_tenant_runtime', current_database(), 'TEMPORARY'
  ) then
    raise exception using
      errcode = '55000',
      message = 'stable tenant runtime database authority differs from the production contract';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_namespace as namespace
    join pg_catalog.pg_roles as owner_role
      on owner_role.oid = namespace.nspowner
    where namespace.nspname in ('control', 'laboratory')
      and owner_role.rolname <> 'laboratory_owner'
  ) then
    raise exception using
      errcode = '55000',
      message = 'governed schema ownership differs from laboratory_owner';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    join pg_catalog.pg_roles as owner_role
      on owner_role.oid = relation.relowner
    where namespace.nspname in ('control', 'laboratory')
      and relation.relkind in ('r', 'p', 'S', 'v', 'm')
      and owner_role.rolname <> 'laboratory_owner'
  ) then
    raise exception using
      errcode = '55000',
      message = 'governed relation ownership differs from laboratory_owner';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_type as type_record
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = type_record.typnamespace
    join pg_catalog.pg_roles as owner_role
      on owner_role.oid = type_record.typowner
    where namespace.nspname = 'control'
      and type_record.typtype = 'd'
      and owner_role.rolname <> 'laboratory_owner'
  ) then
    raise exception using
      errcode = '55000',
      message = 'control domain ownership differs from laboratory_owner';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'laboratory'
      and relation.relkind in ('r', 'p')
      and (not relation.relrowsecurity or not relation.relforcerowsecurity)
  ) then
    raise exception using
      errcode = '55000',
      message = 'laboratory row-security coverage differs from ENABLED and FORCED';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policies as policy
    where policy.schemaname = 'laboratory'
      and policy.policyname = 'tenant_scope'
      and (
        policy.permissive <> 'PERMISSIVE'
        or policy.roles <> array['public']::name[]
        or policy.cmd <> 'ALL'
        or policy.qual is distinct from
          '(tenant_id = control.current_tenant_id())'
        or policy.with_check is distinct from
          '(tenant_id = control.current_tenant_id())'
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'laboratory policy semantics differ from the tenant principal grant';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policies as policy
    where policy.schemaname = 'laboratory'
      and policy.policyname = 'bounded_migration_scope'
      and (
        policy.permissive <> 'PERMISSIVE'
        or policy.roles <> array['laboratory_owner']::name[]
        or policy.cmd <> 'ALL'
        or policy.qual is distinct from
          'control.current_session_is_bounded_migration_owner()'
        or policy.with_check is distinct from
          'control.current_session_is_bounded_migration_owner()'
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'bounded migration policy semantics differ from the reviewed caller';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policies as policy
    where policy.schemaname = 'laboratory'
      and policy.policyname not in (
        'tenant_scope', 'bounded_migration_scope'
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'laboratory policy inventory contains an unreviewed identity';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_policies
    where schemaname = 'laboratory'
      and policyname = 'tenant_scope'
  ) <> (
    select count(*)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'laboratory'
      and relation.relkind in ('r', 'p')
  ) then
    raise exception using
      errcode = '55000',
      message = 'laboratory tenant policy coverage differs from relation coverage';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_policies
    where schemaname = 'laboratory'
      and policyname = 'bounded_migration_scope'
  ) <> (
    select count(*)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'laboratory'
      and relation.relkind in ('r', 'p')
  ) then
    raise exception using
      errcode = '55000',
      message = 'bounded migration policy coverage differs from relation coverage';
  end if;

  select string_agg(
    format(
      '%I.%I(%s) owned by %I',
      namespace.nspname,
      routine.proname,
      pg_catalog.pg_get_function_identity_arguments(routine.oid),
      owner_role.rolname
    ),
    ', ' order by namespace.nspname, routine.proname, routine.oid
  ) into ownership_mismatch
  from pg_catalog.pg_proc as routine
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = routine.pronamespace
  join pg_catalog.pg_roles as owner_role
    on owner_role.oid = routine.proowner
  where namespace.nspname in ('control', 'laboratory')
    and owner_role.rolname <> 'laboratory_owner';

  if ownership_mismatch is not null then
    raise exception using
      errcode = '55000',
      message = format(
        'governed routine ownership differs: %s',
        ownership_mismatch
      );
  end if;

  -- Each privileged routine belongs to a closed, release-attested set.
  -- Its exact signature and fixed path remain catalog-verifiable. Every
  -- application relation in these reviewed bodies carries an explicit schema
  -- identity, while the runtime contract exercises temporary-name shadowing.
  select string_agg(
    format(
      '%I.%I(%s) path=%s',
      namespace.nspname,
      routine.proname,
      pg_catalog.pg_get_function_identity_arguments(routine.oid),
      coalesce(array_to_string(routine.proconfig, ';'), '<unset>')
    ),
    ', ' order by namespace.nspname, routine.proname, routine.oid
  ) into security_definer_mismatch
  from pg_catalog.pg_proc as routine
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = routine.pronamespace
  left join unnest(
    required_security_definers || optional_security_definers
  ) as allowed(signature)
    on pg_catalog.to_regprocedure(allowed.signature) = routine.oid
  where namespace.nspname in ('control', 'laboratory')
    and routine.prosecdef
    and (
      routine.proconfig is distinct from
        array['search_path=pg_catalog, pg_temp']::text[]
      or allowed.signature is null
    );

  if security_definer_mismatch is not null then
    raise exception using
      errcode = '55000',
      message = format(
        'security-definer identity or fixed path differs: %s',
        security_definer_mismatch
      );
  end if;

  if exists (
    select 1
    from unnest(required_security_definers) as expected(signature)
    where not exists (
      select 1
      from pg_catalog.pg_proc as routine
      where routine.oid = pg_catalog.to_regprocedure(expected.signature)
        and routine.prosecdef
        and routine.proconfig is not distinct from
          array['search_path=pg_catalog, pg_temp']::text[]
    )
  ) then
    raise exception using
      errcode = '55000',
      message = 'security-definer allowlist requires each released routine exactly once';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = routine.pronamespace
    cross join lateral pg_catalog.aclexplode(
      coalesce(
        routine.proacl,
        pg_catalog.acldefault('f'::"char", routine.proowner)
      )
    ) as routine_acl
    where namespace.nspname in ('control', 'laboratory')
      and routine_acl.grantee = 0
      and routine_acl.privilege_type = 'EXECUTE'
  ) then
    raise exception using
      errcode = '55000',
      message = 'PUBLIC routine execution authority differs from the explicit grant contract';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_namespace as namespace
    cross join lateral pg_catalog.aclexplode(
      coalesce(
        namespace.nspacl,
        pg_catalog.acldefault('n'::"char", namespace.nspowner)
      )
    ) as schema_acl
    where namespace.nspname in ('control', 'laboratory')
      and schema_acl.grantee = 0
      and schema_acl.privilege_type in ('USAGE', 'CREATE')
  ) then
    raise exception using
      errcode = '55000',
      message = 'PUBLIC governed-schema authority differs from the closed schema contract';
  end if;

  if exists (
    select 1
    from unnest(expected_roles) as governed_role(role_name)
    where governed_role.role_name <> 'laboratory_owner'
      and (
        not has_schema_privilege(
          governed_role.role_name::name, 'control', 'USAGE'
        )
        or not has_schema_privilege(
          governed_role.role_name::name, 'laboratory', 'USAGE'
        )
        or has_schema_privilege(
          governed_role.role_name::name, 'control', 'CREATE'
        )
        or has_schema_privilege(
          governed_role.role_name::name, 'laboratory', 'CREATE'
        )
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'governed workload schema authority differs from explicit USAGE';
  end if;

  if has_table_privilege(
    'laboratory_tenant_runtime',
    'laboratory.specimen',
    'UPDATE'
  ) or has_table_privilege(
    'laboratory_tenant_runtime',
    'laboratory.specimen_event',
    'INSERT'
  ) or has_table_privilege(
    'laboratory_outbox_worker',
    'laboratory.integration_outbox',
    'UPDATE'
  ) then
    raise exception using
      errcode = '55000',
      message = 'runtime roles received direct DML outside governed routines';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = routine.pronamespace
    where namespace.nspname = 'laboratory'
      and routine.proname = 'record_specimen_transition'
      and has_function_privilege(
        'laboratory_tenant_runtime',
        routine.oid,
        'EXECUTE'
      )
  ) or not exists (
    select 1
    from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = routine.pronamespace
    where namespace.nspname = 'laboratory'
      and routine.proname in (
        'claim_outbox_message',
        'confirm_outbox_delivery',
        'reclaim_expired_outbox_messages'
      )
      and has_function_privilege(
        'laboratory_outbox_worker',
        routine.oid,
        'EXECUTE'
      )
    group by namespace.nspname
    having count(distinct routine.proname) = 3
  ) then
    raise exception using
      errcode = '55000',
      message = 'governed runtime routine grants differ';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = routine.pronamespace
    where namespace.nspname = 'control'
      and routine.proname = 'current_tenant_id'
      and has_function_privilege(
        'laboratory_migrator',
        routine.oid,
        'EXECUTE'
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'migrator tenant-context execution authority differs';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    cross join lateral pg_catalog.aclexplode(
      coalesce(
        relation.relacl,
        pg_catalog.acldefault(
          (
            case when relation.relkind = 'S' then 's' else 'r' end
          )::"char",
          relation.relowner
        )
      )
    ) as relation_acl
    where namespace.nspname in ('control', 'laboratory')
      and relation.relkind in ('r', 'p', 'S', 'v', 'm')
      and relation_acl.grantee = 0
      and relation_acl.privilege_type in (
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'USAGE'
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'PUBLIC governed-relation authority differs from the closed contract';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_type as type_record
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = type_record.typnamespace
    cross join lateral pg_catalog.aclexplode(
      coalesce(
        type_record.typacl,
        pg_catalog.acldefault('T'::"char", type_record.typowner)
      )
    ) as type_acl
    where namespace.nspname = 'control'
      and type_record.typtype = 'd'
      and type_acl.grantee = 0
      and type_acl.privilege_type = 'USAGE'
  ) then
    raise exception using
      errcode = '55000',
      message = 'PUBLIC control-domain authority differs from explicit type grants';
  end if;

  if to_regclass('public.flyway_schema_history') is null then
    raise exception using
      errcode = '55000',
      message = 'Flyway canonical history relation is unavailable';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_class as relation
    cross join lateral pg_catalog.aclexplode(
      coalesce(
        relation.relacl,
        pg_catalog.acldefault('r'::"char", relation.relowner)
      )
    ) as relation_acl
    where relation.oid = 'public.flyway_schema_history'::regclass
      and relation_acl.grantee = 0
      and relation_acl.privilege_type in (
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES'
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'PUBLIC Flyway history authority differs from the closed contract';
  end if;

  if exists (
    select 1
    from public.flyway_schema_history
    where not success
  ) or (
    select count(*)
    from public.flyway_schema_history
    where type = 'SQL'
      and version::numeric between 1 and 8
      and success
  ) <> 8 then
    raise exception using
      errcode = '55000',
      message = 'Flyway canonical history differs from the released V001 through V008 sequence';
  end if;

  if to_regclass('public.flyway_legacy_upgrade_history') is not null then
    if exists (
      select 1
      from public.flyway_legacy_upgrade_history
      where not success
    ) or (
      select max(version::numeric)
      from public.flyway_legacy_upgrade_history
      where type = 'SQL' and success
    ) not in (5, 6) then
      raise exception using
        errcode = '55000',
        message = 'Flyway legacy history differs from the upgrade or contract head';
    end if;
  end if;
end
$security_contract$;

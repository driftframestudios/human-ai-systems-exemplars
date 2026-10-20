-- TARGET: provisioned login identity determines one tenant boundary, governed
-- functions preserve writes, and append-only history retains prior meaning.

set search_path = pg_catalog, control, laboratory;

-- TARGET: one strict textual boundary produces the same finite instant under
-- every supported DateStyle, while the storage primitive rejects both
-- unbounded sentinel values before they reach durable evidence.
do $temporal_primitive_contract$
declare
  sql_mdy_results boolean[];
  sql_dmy_results boolean[];
  contract_authorization_exists boolean := false;
  expected_results constant boolean[] := array[
    true, true, false, false, false, false, false, false
  ];
begin
  perform pg_catalog.set_config('DateStyle', 'SQL, MDY', true);
  select array[
    control.is_canonical_rfc3339_instant('2026-08-04T16:05:06.123456Z'),
    control.is_canonical_rfc3339_instant('2026-08-04T16:05:06-04:00'),
    control.is_canonical_rfc3339_instant('08/04/2026 16:05:06'),
    control.is_canonical_rfc3339_instant('2026-08-04 16:05:06Z'),
    control.is_canonical_rfc3339_instant('2026-08-04T16:05:06.1234567Z'),
    control.is_canonical_rfc3339_instant('2026-08-04T16:05:06z'),
    control.is_canonical_rfc3339_instant('2026-02-30T16:05:06Z'),
    control.is_canonical_rfc3339_instant('infinity')
  ] into sql_mdy_results;

  perform pg_catalog.set_config('DateStyle', 'SQL, DMY', true);
  select array[
    control.is_canonical_rfc3339_instant('2026-08-04T16:05:06.123456Z'),
    control.is_canonical_rfc3339_instant('2026-08-04T16:05:06-04:00'),
    control.is_canonical_rfc3339_instant('08/04/2026 16:05:06'),
    control.is_canonical_rfc3339_instant('2026-08-04 16:05:06Z'),
    control.is_canonical_rfc3339_instant('2026-08-04T16:05:06.1234567Z'),
    control.is_canonical_rfc3339_instant('2026-08-04T16:05:06z'),
    control.is_canonical_rfc3339_instant('2026-02-30T16:05:06Z'),
    control.is_canonical_rfc3339_instant('infinity')
  ] into sql_dmy_results;

  if sql_mdy_results is distinct from expected_results
     or sql_dmy_results is distinct from expected_results
     or sql_mdy_results is distinct from sql_dmy_results then
    raise exception 'canonical RFC 3339 recognition differs across DateStyle';
  end if;

  begin
    perform 'infinity'::control.finite_instant;
    raise exception '+infinity entered control.finite_instant';
  exception
    when check_violation then
      null;
  end;

  begin
    perform '-infinity'::control.finite_instant;
    raise exception '-infinity entered control.finite_instant';
  exception
    when check_violation then
      null;
  end;

  if to_regclass('control.legacy_contract_authorization') is not null then
    execute 'select exists (select 1 from control.legacy_contract_authorization)'
      into contract_authorization_exists;
  end if;

  if contract_authorization_exists then
    begin
      insert into control.legacy_contract_authorization (
        authorization_id,
        baseline_version,
        source_tenant,
        tenant_id,
        upgrade_receipt_id,
        migration_run_id,
        restore_receipt_id,
        evidence_bundle_sha256,
        source_archive_coordinate,
        source_archive_sha256,
        authorized_by,
        policy_version,
        authorized_at,
        minimum_compatibility_interval,
        compatibility_ends_at,
        recorded_at
      )
      select
        control.stable_migration_uuid(
          'finite-instant-contract', 'negative-infinity-authorization'
        ),
        baseline_version,
        source_tenant || '-negative-infinity-probe',
        tenant_id,
        upgrade_receipt_id,
        migration_run_id,
        restore_receipt_id,
        evidence_bundle_sha256,
        source_archive_coordinate,
        source_archive_sha256,
        authorized_by,
        policy_version,
        '-infinity'::timestamptz,
        minimum_compatibility_interval,
        compatibility_ends_at,
        recorded_at
      from control.legacy_contract_authorization
      order by authorization_id
      limit 1;
      raise exception '-infinity entered contract authorization time';
    exception
      when check_violation then
        null;
    end;

    begin
      insert into control.legacy_contract_authorization (
        authorization_id,
        baseline_version,
        source_tenant,
        tenant_id,
        upgrade_receipt_id,
        migration_run_id,
        restore_receipt_id,
        evidence_bundle_sha256,
        source_archive_coordinate,
        source_archive_sha256,
        authorized_by,
        policy_version,
        authorized_at,
        minimum_compatibility_interval,
        compatibility_ends_at,
        recorded_at
      )
      select
        control.stable_migration_uuid(
          'finite-instant-contract', 'positive-infinity-compatibility-end'
        ),
        baseline_version,
        source_tenant || '-positive-infinity-probe',
        tenant_id,
        upgrade_receipt_id,
        migration_run_id,
        restore_receipt_id,
        evidence_bundle_sha256,
        source_archive_coordinate,
        source_archive_sha256,
        authorized_by,
        policy_version,
        authorized_at,
        minimum_compatibility_interval,
        'infinity'::timestamptz,
        recorded_at
      from control.legacy_contract_authorization
      order by authorization_id
      limit 1;
      raise exception '+infinity entered contract compatibility end';
    exception
      when check_violation then
        null;
    end;
  end if;
end
$temporal_primitive_contract$;

\getenv tenant_password LIMS_TEST_RUNTIME_PASSWORD
\getenv migration_password FLYWAY_PASSWORD
\getenv migration_login FLYWAY_USER
\getenv database_host PGHOST
\getenv database_port PGPORT

-- TARGET: authenticating as the deployment LOGIN grants connection authority;
-- governed data access begins only after the reviewed owner transition.
-- VERIFY: the same session loses schema visibility when it returns to the
-- LOGIN identity, then deliberately resumes the bounded migration role.

set role none;

do $bounded_migration_login_only_proof$
begin
  if has_schema_privilege(session_user, 'laboratory', 'USAGE') then
    raise exception using
      errcode = '55000',
      message = 'bounded migration LOGIN acquired laboratory schema usage directly';
  end if;

  begin
    execute 'select count(*) from laboratory.tenant';
    raise exception using
      errcode = '55000',
      message = 'bounded migration LOGIN reached a governed relation directly';
  exception
    when insufficient_privilege then
      null;
  end;
end
$bounded_migration_login_only_proof$;

set role laboratory_owner;

-- TARGET: cluster-provisioned per-run identities preserve collision-free
-- concurrent proofs while the migration session retains NOCREATEROLE.

insert into laboratory.tenant (
  tenant_id, tenant_code, display_name
) values
  ('10000000-0000-4000-8000-000000000001', 'alpha', 'Alpha Laboratory'),
  ('20000000-0000-4000-8000-000000000002', 'beta', 'Beta Laboratory');

insert into control.tenant_principal_grant (
  database_principal,
  tenant_id,
  authorized_by,
  evidence_reference,
  effective_at
) values
  (
    :'tenant_alpha_role',
    '10000000-0000-4000-8000-000000000001',
    'ci-identity-provisioner',
    'synthetic-ci-grant-alpha',
    transaction_timestamp() - interval '1 minute'
  ),
  (
    :'tenant_beta_role',
    '20000000-0000-4000-8000-000000000002',
    'ci-identity-provisioner',
    'synthetic-ci-grant-beta',
    transaction_timestamp() - interval '1 minute'
  );

insert into laboratory.source_system (
  tenant_id,
  source_system_id,
  system_code,
  system_kind,
  contract_version,
  effective_at
) values
  (
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000010',
    'synthetic-alpha',
    'lims',
    '1.0.0',
    transaction_timestamp()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000020',
    'synthetic-beta',
    'lims',
    '1.0.0',
    transaction_timestamp()
  );

insert into laboratory.actor_principal (
  tenant_id,
  actor_id,
  identity_issuer,
  subject_identifier,
  display_label,
  principal_kind,
  effective_at
) values
  (
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000011',
    'synthetic-ci',
    'alpha-operator',
    'Alpha operator',
    'person',
    transaction_timestamp()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000021',
    'synthetic-ci',
    'beta-operator',
    'Beta operator',
    'person',
    transaction_timestamp()
  );

insert into laboratory.specimen (
  tenant_id,
  specimen_id,
  source_system_id,
  external_specimen_id,
  lifecycle_state,
  aggregate_version,
  canonical_document,
  canonical_sha256,
  canonicalization_version,
  created_at,
  updated_at
) values
  (
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000012',
    '10000000-0000-4000-8000-000000000010',
    'SYN-ALPHA-001',
    'registered',
    1,
    '{"schemaVersion":"1.0.0","state":"registered"}',
    decode(repeat('11', 32), 'hex'),
    'jcs-1.0',
    transaction_timestamp(),
    transaction_timestamp()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000022',
    '20000000-0000-4000-8000-000000000020',
    'SYN-BETA-001',
    'registered',
    1,
    '{"schemaVersion":"1.0.0","state":"registered"}',
    decode(repeat('22', 32), 'hex'),
    'jcs-1.0',
    transaction_timestamp(),
    transaction_timestamp()
  );

insert into laboratory.assay_specification (
  tenant_id,
  assay_specification_id,
  specification_version,
  assay_code,
  analyte_code,
  canonical_unit,
  decimal_scale,
  effective_at,
  specification_sha256,
  canonicalization_version
) values (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000030',
  1,
  'NUMERIC-BOUNDARY',
  'SYNTHETIC-ANALYTE',
  'mg/dL',
  12,
  transaction_timestamp() - interval '1 day',
  sha256(convert_to('synthetic-numeric-boundary-specification-v1', 'UTF8')),
  'jcs-1.0'
);

with conversion_contract as (
  select
    '10000000-0000-4000-8000-000000000001'::uuid as tenant_id,
    '10000000-0000-4000-8000-000000000030'::uuid
      as assay_specification_id,
    1::integer as specification_version,
    'mg/dL'::control.ucum_code as source_unit,
    'mg/dL'::control.ucum_code as canonical_unit,
    1::numeric(38, 18) as multiplier,
    0::numeric(38, 18) as offset_value,
    'identity-v1'::control.nonblank_text as conversion_rule_version
)
insert into laboratory.assay_unit_conversion (
  tenant_id,
  assay_specification_id,
  specification_version,
  source_unit,
  canonical_unit,
  multiplier,
  offset_value,
  conversion_rule_version,
  conversion_contract_sha256
)
select
  conversion_contract.tenant_id,
  conversion_contract.assay_specification_id,
  conversion_contract.specification_version,
  conversion_contract.source_unit,
  conversion_contract.canonical_unit,
  conversion_contract.multiplier,
  conversion_contract.offset_value,
  conversion_contract.conversion_rule_version,
  sha256(convert_to(jsonb_build_object(
    'tenantId', conversion_contract.tenant_id,
    'assaySpecificationId', conversion_contract.assay_specification_id,
    'specificationVersion', conversion_contract.specification_version,
    'sourceUnit', conversion_contract.source_unit,
    'canonicalUnit', conversion_contract.canonical_unit,
    'multiplier', conversion_contract.multiplier::text,
    'offsetValue', conversion_contract.offset_value::text,
    'conversionRuleVersion', conversion_contract.conversion_rule_version
  )::text, 'UTF8'))
from conversion_contract;

insert into laboratory.assay_run (
  tenant_id,
  assay_run_id,
  assay_specification_id,
  specification_version,
  source_system_id,
  external_run_id,
  instrument_actor_id,
  run_state,
  started_at,
  completed_at
) values (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000031',
  '10000000-0000-4000-8000-000000000030',
  1,
  '10000000-0000-4000-8000-000000000010',
  'SYNTHETIC-NUMERIC-BOUNDARY-RUN',
  '10000000-0000-4000-8000-000000000011',
  'completed',
  transaction_timestamp() - interval '2 hours',
  transaction_timestamp() - interval '1 hour'
);

insert into laboratory.assay_run_specimen (
  tenant_id,
  assay_run_id,
  specimen_id,
  sample_role,
  run_position
) values (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000031',
  '10000000-0000-4000-8000-000000000012',
  'primary',
  'A01'
);

-- TARGET: exercise the tenant boundary through a fresh login session, matching
-- the production identity boundary used by control.current_tenant_id().
select
  has_database_privilege(
    :'tenant_alpha_role', current_database(), 'TEMPORARY'
  )
  and not has_database_privilege(
    :'tenant_beta_role', current_database(), 'TEMPORARY'
  ) as adversarial_temp_authority_ok
\gset
\if :adversarial_temp_authority_ok
  \echo 'Verified disposable alpha-only temporary-relation authority'
\else
  \echo 'Disposable temporary-relation authority differs from the proof contract'
  \quit 3
\endif

\setenv PGPASSWORD :tenant_password
\connect :database_name :tenant_alpha_role :database_host :database_port

-- TARGET: privileged routines continue to resolve release-attested
-- control and laboratory objects when a caller owns same-named temporary
-- relations. This exercises the fixed-path and explicit-qualification contract.
create temporary table tenant_principal_grant (
  database_principal name not null,
  tenant_id uuid not null,
  effective_at timestamptz not null,
  expires_at timestamptz
);
insert into pg_temp.tenant_principal_grant (
  database_principal,
  tenant_id,
  effective_at
) values (
  session_user,
  '20000000-0000-4000-8000-000000000002',
  transaction_timestamp() - interval '1 minute'
);

create temporary table specimen as
select * from laboratory.specimen with no data;
create temporary table specimen_event as
select * from laboratory.specimen_event with no data;
create temporary table integration_outbox as
select * from laboratory.integration_outbox with no data;

insert into pg_temp.specimen
select *
from laboratory.specimen
where specimen_id = '10000000-0000-4000-8000-000000000012';

do $security_definer_temp_identity_proof$
declare
  observed_tenant uuid;
begin
  observed_tenant := control.current_tenant_id();
  if observed_tenant is distinct from
      '10000000-0000-4000-8000-000000000001'::uuid then
    raise exception using
      errcode = '55000',
      message = format(
        'privileged tenant resolution reached %s through a temporary name',
        observed_tenant
      );
  end if;
end
$security_definer_temp_identity_proof$;

do $tenant_visible_row_proof$
declare
  observed integer;
begin
  select count(*) into observed
  from laboratory.specimen;
  if observed <> 1 then
    raise exception using
      errcode = '55000',
      message = format(
        'tenant-visible specimen count differs: expected 1, observed %s',
        observed
      );
  end if;
end
$tenant_visible_row_proof$;

do $numeric_boundary_proof$
declare
  accepted_value numeric :=
    99999999999999999999999999.999999999999::numeric;
  observed_raw numeric;
  observed_canonical numeric;
  observed_conversion_digest bytea;
  expected_conversion_digest bytea;
  persisted_count integer;
begin
  perform laboratory.record_result_observation(
    '10000000-0000-4000-8000-000000000032',
    '10000000-0000-4000-8000-000000000012',
    '10000000-0000-4000-8000-000000000031',
    accepted_value,
    'mg/dL',
    null,
    null,
    null,
    'synthetic-exact-26-plus-12-boundary',
    'accepted',
    transaction_timestamp() - interval '30 minutes',
    null
  );

  select
    observation.raw_value,
    observation.canonical_value,
    observation.conversion_contract_sha256,
    sha256(convert_to(jsonb_build_object(
      'tenantId', conversion.tenant_id,
      'assaySpecificationId', conversion.assay_specification_id,
      'specificationVersion', conversion.specification_version,
      'sourceUnit', conversion.source_unit,
      'canonicalUnit', conversion.canonical_unit,
      'multiplier', conversion.multiplier::text,
      'offsetValue', conversion.offset_value::text,
      'conversionRuleVersion', conversion.conversion_rule_version
    )::text, 'UTF8'))
  into strict
    observed_raw,
    observed_canonical,
    observed_conversion_digest,
    expected_conversion_digest
  from laboratory.result_observation as observation
  join laboratory.assay_unit_conversion as conversion
    on conversion.tenant_id = observation.tenant_id
   and conversion.assay_specification_id = observation.assay_specification_id
   and conversion.specification_version = observation.specification_version
   and conversion.source_unit = observation.raw_unit
  where observation.observation_id =
    '10000000-0000-4000-8000-000000000032';

  if observed_raw <> accepted_value
     or observed_canonical <> accepted_value
     or observed_conversion_digest <> expected_conversion_digest then
    raise exception using
      errcode = '55000',
      message = 'exact numeric and conversion semantics differ at the released boundary';
  end if;

  begin
    perform laboratory.record_result_observation(
      '10000000-0000-4000-8000-000000000033',
      '10000000-0000-4000-8000-000000000012',
      '10000000-0000-4000-8000-000000000031',
      1.0000000000001::numeric,
      'mg/dL', null, null, null,
      'synthetic-thirteen-fractional-digits', 'accepted',
      transaction_timestamp() - interval '29 minutes', null
    );
    raise exception using
      errcode = '55000',
      message = 'thirteen fractional digits reached storage';
  exception
    when numeric_value_out_of_range then null;
  end;

  begin
    perform laboratory.record_result_observation(
      '10000000-0000-4000-8000-000000000034',
      '10000000-0000-4000-8000-000000000012',
      '10000000-0000-4000-8000-000000000031',
      100000000000000000000000000::numeric,
      'mg/dL', null, null, null,
      'synthetic-twenty-seven-integer-digits', 'accepted',
      transaction_timestamp() - interval '28 minutes', null
    );
    raise exception using
      errcode = '55000',
      message = 'twenty-seven integer digits reached storage';
  exception
    when numeric_value_out_of_range then null;
  end;

  begin
    perform laboratory.record_result_observation(
      '10000000-0000-4000-8000-000000000035',
      '10000000-0000-4000-8000-000000000012',
      '10000000-0000-4000-8000-000000000031',
      'NaN'::numeric,
      'mg/dL', null, null, null,
      'synthetic-nan', 'accepted',
      transaction_timestamp() - interval '27 minutes', null
    );
    raise exception using
      errcode = '55000',
      message = 'NaN reached storage';
  exception
    when numeric_value_out_of_range then null;
  end;

  begin
    perform laboratory.record_result_observation(
      '10000000-0000-4000-8000-000000000036',
      '10000000-0000-4000-8000-000000000012',
      '10000000-0000-4000-8000-000000000031',
      'Infinity'::numeric,
      'mg/dL', null, null, null,
      'synthetic-infinity', 'accepted',
      transaction_timestamp() - interval '26 minutes', null
    );
    raise exception using
      errcode = '55000',
      message = 'Infinity reached storage';
  exception
    when numeric_value_out_of_range then null;
  end;

  select count(*) into persisted_count
  from laboratory.result_observation
  where observation_id in (
    '10000000-0000-4000-8000-000000000032',
    '10000000-0000-4000-8000-000000000033',
    '10000000-0000-4000-8000-000000000034',
    '10000000-0000-4000-8000-000000000035',
    '10000000-0000-4000-8000-000000000036'
  );
  if persisted_count <> 1 then
    raise exception using
      errcode = '55000',
      message = format(
        'numeric boundary proof persisted %s rows; expected one exact value',
        persisted_count
      );
  end if;
end
$numeric_boundary_proof$;

select set_config('app.tenant_id', '20000000-0000-4000-8000-000000000002', false);

do $tenant_switch_resistance_proof$
declare
  observed integer;
begin
  select count(*) into observed
  from laboratory.specimen
  where tenant_id = '20000000-0000-4000-8000-000000000002';
  if observed <> 0 then
    raise exception using
      errcode = '55000',
      message = format(
        'session setting changed tenant visibility: observed %s rows',
        observed
      );
  end if;
end
$tenant_switch_resistance_proof$;

do $direct_dml_authority_proof$
begin
  if has_table_privilege(
    session_user,
    'laboratory.specimen_event',
    'UPDATE'
  ) then
    raise exception using
      errcode = '55000',
      message = 'tenant runtime received direct specimen-event update authority';
  end if;

  begin
    update laboratory.specimen
    set lifecycle_state = 'accessioned'
    where specimen_id = '10000000-0000-4000-8000-000000000012';
    raise exception using
      errcode = '55000',
      message = 'tenant runtime direct specimen update reached a writable state';
  exception
    when insufficient_privilege then
      null;
  end;
end
$direct_dml_authority_proof$;

select laboratory.record_specimen_transition(
  '10000000-0000-4000-8000-000000000012',
  1,
  'accessioned',
  '{"schemaVersion":"1.0.0","state":"accessioned"}',
  decode(repeat('33', 32), 'hex'),
  '10000000-0000-4000-8000-000000000013',
  '10000000-0000-4000-8000-000000000014',
  decode(repeat('44', 32), 'hex'),
  'specimen_accessioned',
  '10000000-0000-4000-8000-000000000011',
  null,
  '10000000-0000-4000-8000-000000000015',
  null,
  'accession_complete',
  '{"schemaVersion":"1.0.0","state":"accessioned"}',
  decode(repeat('55', 32), 'hex'),
  transaction_timestamp(),
  '10000000-0000-4000-8000-000000000016',
  'laboratory.specimen.lifecycle',
  'SYN-ALPHA-001',
  '{"schemaVersion":"1.0.0","state":"accessioned"}',
  decode(repeat('66', 32), 'hex')
);

do $security_definer_temp_write_proof$
declare
  shadow_version bigint;
  shadow_event_count integer;
  shadow_outbox_count integer;
begin
  select aggregate_version into shadow_version
  from pg_temp.specimen
  where specimen_id = '10000000-0000-4000-8000-000000000012';
  select count(*) into shadow_event_count from pg_temp.specimen_event;
  select count(*) into shadow_outbox_count from pg_temp.integration_outbox;

  if shadow_version is distinct from 1
     or shadow_event_count <> 0
     or shadow_outbox_count <> 0 then
    raise exception using
      errcode = '55000',
      message = format(
        'privileged transition reached temporary state: version=%s events=%s outbox=%s',
        shadow_version,
        shadow_event_count,
        shadow_outbox_count
      );
  end if;
end
$security_definer_temp_write_proof$;

do $transition_event_proof$
declare
  observed integer;
begin
  select count(*) into observed
  from laboratory.specimen_event
  where specimen_id = '10000000-0000-4000-8000-000000000012'
    and aggregate_version = 2;
  if observed <> 1 then
    raise exception using
      errcode = '55000',
      message = format(
        'governed transition event count differs: expected 1, observed %s',
        observed
      );
  end if;
end
$transition_event_proof$;

-- TARGET: a specimen transition binds authorization evidence inside the same
-- tenant, and a rejected reference preserves the prior aggregate revision.
do $authorization_receipt_binding_proof$
declare
  observed_version bigint;
begin
  begin
    perform laboratory.record_specimen_transition(
      '10000000-0000-4000-8000-000000000012',
      2,
      'in_process',
      '{"schemaVersion":"1.0.0","state":"in_process"}',
      decode(repeat('77', 32), 'hex'),
      '10000000-0000-4000-8000-000000000018',
      '10000000-0000-4000-8000-000000000019',
      decode(repeat('88', 32), 'hex'),
      'processing_started',
      '10000000-0000-4000-8000-000000000011',
      '10000000-0000-4000-8000-00000000001a',
      '10000000-0000-4000-8000-00000000001b',
      null,
      'processing_start_requested',
      '{"schemaVersion":"1.0.0","state":"in_process"}',
      decode(repeat('99', 32), 'hex'),
      transaction_timestamp(),
      null,
      null,
      null,
      null,
      null
    );
    raise exception using
      errcode = '55000',
      message = 'orphan authorization receipt reached a committed transition';
  exception
    when foreign_key_violation then
      null;
  end;

  select aggregate_version into observed_version
  from laboratory.specimen
  where specimen_id = '10000000-0000-4000-8000-000000000012';

  if observed_version <> 2 then
    raise exception using
      errcode = '55000',
      message = format(
        'rejected authorization transition changed aggregate version to %s',
        observed_version
      );
  end if;
end
$authorization_receipt_binding_proof$;

select * from laboratory.claim_outbox_message(
  'synthetic-alpha-worker',
  '10000000-0000-4000-8000-000000000017',
  60
) \gset claimed_

select laboratory.confirm_outbox_delivery(
  :'claimed_message_id',
  'synthetic-alpha-worker',
  '10000000-0000-4000-8000-000000000017',
  :'claimed_fencing_token',
  'synthetic-transport-receipt'
);

\setenv PGPASSWORD :migration_password
\connect :database_name :migration_login :database_host :database_port
set role laboratory_owner;

do $append_only_proof$
begin
  begin
    update laboratory.specimen_event
    set event_type = 'rewritten'
    where tenant_id = '10000000-0000-4000-8000-000000000001';
    raise exception 'append-only update reached a writable state';
  exception
    when sqlstate '55000' then
      null;
  end;
end
$append_only_proof$;

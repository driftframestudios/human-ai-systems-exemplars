-- TARGET: a populated v0.1 database earns an explicit adoption receipt before
-- canonical schemas or data transformations begin.
-- VERIFY: required source tables, columns, defaults, keys, references, and
-- checks match the registered legacy contract and yield one stable fingerprint.

create temporary table legacy_v0_1_expected_column (
  table_name text not null,
  ordinal_position smallint not null,
  column_name text not null,
  formatted_type text not null,
  is_not_null boolean not null,
  default_expression text not null,
  primary key (table_name, ordinal_position),
  unique (table_name, column_name)
) on commit drop;

insert into legacy_v0_1_expected_column values
  ('custody_position', 1, 'tenant_id', 'text', true, ''),
  ('custody_position', 2, 'specimen_id', 'text', true, ''),
  ('custody_position', 3, 'location_path', 'text', true, ''),
  ('custody_position', 4, 'aggregate_version', 'bigint', true, ''),
  ('execution_receipt', 1, 'receipt_id', 'text', true, ''),
  ('execution_receipt', 2, 'source_revision', 'text', true, ''),
  ('execution_receipt', 3, 'source_sha256', 'text', true, ''),
  ('execution_receipt', 4, 'execution_class', 'text', true, ''),
  ('execution_receipt', 5, 'execution_scope', 'text', true, ''),
  ('execution_receipt', 6, 'qualification_stage', 'text', true, ''),
  ('execution_receipt', 7, 'generated_at_utc', 'text', true, ''),
  ('execution_receipt', 8, 'synthetic_data', 'integer', true, ''),
  ('execution_receipt', 9, 'limitations_json', 'text', true, ''),
  ('idempotency_reservation', 1, 'tenant_id', 'text', true, ''),
  ('idempotency_reservation', 2, 'scope', 'text', true, ''),
  ('idempotency_reservation', 3, 'request_key', 'text', true, ''),
  ('idempotency_reservation', 4, 'request_sha256', 'text', true, ''),
  ('idempotency_reservation', 5, 'status', 'text', true, ''),
  ('idempotency_reservation', 6, 'receipt_json', 'text', false, ''),
  ('idempotency_reservation', 7, 'updated_at_utc', 'text', true, ''),
  ('integration_inbox', 1, 'tenant_id', 'text', true, ''),
  ('integration_inbox', 2, 'source', 'text', true, ''),
  ('integration_inbox', 3, 'message_id', 'text', true, ''),
  ('integration_inbox', 4, 'raw_sha256', 'text', true, ''),
  ('integration_inbox', 5, 'status', 'text', true, ''),
  ('integration_inbox', 6, 'received_at_utc', 'text', true, ''),
  ('integration_outbox', 1, 'tenant_id', 'text', true, ''),
  ('integration_outbox', 2, 'message_id', 'text', true, ''),
  ('integration_outbox', 3, 'topic', 'text', true, ''),
  ('integration_outbox', 4, 'partition_key', 'text', true, ''),
  ('integration_outbox', 5, 'payload_json', 'text', true, ''),
  ('integration_outbox', 6, 'attempts', 'integer', true, '0'),
  ('integration_outbox', 7, 'status', 'text', true, ''),
  ('integration_outbox', 8, 'last_error_code', 'text', false, ''),
  ('integration_outbox', 9, 'available_at_utc', 'text', true, ''),
  ('open_receipt', 1, 'open_receipt_id', 'text', true, ''),
  ('open_receipt', 2, 'component', 'text', true, ''),
  ('open_receipt', 3, 'qualification_stage', 'text', true, ''),
  ('open_receipt', 4, 'evidence_event', 'text', true, ''),
  ('open_receipt', 5, 'accountable_owner', 'text', true, ''),
  ('open_receipt', 6, 'review_trigger', 'text', true, ''),
  ('open_receipt', 7, 'status', 'text', true, ''),
  ('specimen', 1, 'tenant_id', 'text', true, ''),
  ('specimen', 2, 'specimen_id', 'text', true, ''),
  ('specimen', 3, 'state', 'text', true, ''),
  ('specimen', 4, 'aggregate_version', 'bigint', true, ''),
  ('specimen', 5, 'canonical_sha256', 'text', true, ''),
  ('specimen', 6, 'updated_at_utc', 'text', true, ''),
  ('specimen_event', 1, 'tenant_id', 'text', true, ''),
  ('specimen_event', 2, 'specimen_id', 'text', true, ''),
  ('specimen_event', 3, 'aggregate_version', 'bigint', true, ''),
  ('specimen_event', 4, 'command_id', 'text', true, ''),
  ('specimen_event', 5, 'command_sha256', 'text', true, ''),
  ('specimen_event', 6, 'actor_id', 'text', true, ''),
  ('specimen_event', 7, 'event_type', 'text', true, ''),
  ('specimen_event', 8, 'occurred_at_utc', 'text', true, ''),
  ('specimen_event', 9, 'reason_code', 'text', false, ''),
  ('specimen_event', 10, 'signature_meaning', 'text', false, ''),
  ('trace_link', 1, 'receipt_id', 'text', true, ''),
  ('trace_link', 2, 'requirement_id', 'text', true, ''),
  ('trace_link', 3, 'risk_id', 'text', true, ''),
  ('trace_link', 4, 'control_id', 'text', true, ''),
  ('trace_link', 5, 'test_id', 'text', true, '');

create temporary table legacy_v0_1_expected_key (
  table_name text not null,
  constraint_type text not null,
  key_columns text[] not null,
  referenced_table text,
  referenced_columns text[]
) on commit drop;

insert into legacy_v0_1_expected_key values
  ('custody_position', 'p', array['tenant_id', 'specimen_id'], null, null),
  ('custody_position', 'f', array['tenant_id', 'specimen_id'],
    'specimen', array['tenant_id', 'specimen_id']),
  ('execution_receipt', 'p', array['receipt_id'], null, null),
  ('idempotency_reservation', 'p',
    array['tenant_id', 'scope', 'request_key'], null, null),
  ('integration_inbox', 'p',
    array['tenant_id', 'source', 'message_id'], null, null),
  ('integration_outbox', 'p', array['tenant_id', 'message_id'], null, null),
  ('open_receipt', 'p', array['open_receipt_id'], null, null),
  ('specimen', 'p', array['tenant_id', 'specimen_id'], null, null),
  ('specimen_event', 'p',
    array['tenant_id', 'specimen_id', 'aggregate_version'], null, null),
  ('specimen_event', 'u',
    array['tenant_id', 'specimen_id', 'command_id'], null, null),
  ('specimen_event', 'f', array['tenant_id', 'specimen_id'],
    'specimen', array['tenant_id', 'specimen_id']),
  ('trace_link', 'p',
    array['receipt_id', 'requirement_id', 'risk_id', 'control_id', 'test_id'],
    null, null),
  ('trace_link', 'f', array['receipt_id'],
    'execution_receipt', array['receipt_id']);

create temporary table legacy_v0_1_expected_check (
  table_name text not null,
  constraint_name text not null,
  normalized_expression text not null,
  primary key (table_name, constraint_name)
) on commit drop;

insert into legacy_v0_1_expected_check values
  ('execution_receipt', 'execution_receipt_source_sha256_check',
    '(length(source_sha256)=64)'),
  ('execution_receipt', 'execution_receipt_synthetic_data_check',
    '(synthetic_data=ANY(ARRAY[0,1]))'),
  ('idempotency_reservation', 'idempotency_reservation_request_sha256_check',
    '(length(request_sha256)=64)'),
  ('idempotency_reservation', 'idempotency_reservation_status_check',
    '(status=ANY(ARRAY[''reserved''::text,''committed''::text,''unknown''::text]))'),
  ('integration_inbox', 'integration_inbox_raw_sha256_check',
    '(length(raw_sha256)=64)'),
  ('integration_outbox', 'integration_outbox_status_check',
    '(status=ANY(ARRAY[''pending''::text,''delivered''::text,''quarantined''::text]))'),
  ('open_receipt', 'open_receipt_status_check',
    '(status=ANY(ARRAY[''open''::text,''satisfied''::text,''superseded''::text]))'),
  ('specimen', 'specimen_aggregate_version_check',
    '(aggregate_version>=0)'),
  ('specimen', 'specimen_canonical_sha256_check',
    '(length(canonical_sha256)=64)'),
  ('specimen_event', 'specimen_event_command_sha256_check',
    '(length(command_sha256)=64)');

do $legacy_v0_1_baseline_contract$
begin
  if pg_catalog.to_regnamespace('control') is not null
     or pg_catalog.to_regnamespace('laboratory') is not null then
    raise exception using
      errcode = '55000',
      message = 'v0.1 adoption begins before canonical schemas are installed';
  end if;

  if exists (
    with actual as (
      select
        relation.relname::text as table_name,
        attribute.attnum::smallint as ordinal_position,
        attribute.attname::text as column_name,
        pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
          as formatted_type,
        attribute.attnotnull as is_not_null,
        coalesce(pg_catalog.regexp_replace(
          pg_catalog.pg_get_expr(default_value.adbin, default_value.adrelid),
          '\s+', '', 'g'
        ), '') as default_expression
      from pg_catalog.pg_class as relation
      join pg_catalog.pg_namespace as namespace
        on namespace.oid = relation.relnamespace
      join pg_catalog.pg_attribute as attribute
        on attribute.attrelid = relation.oid
       and attribute.attnum > 0
       and not attribute.attisdropped
      left join pg_catalog.pg_attrdef as default_value
        on default_value.adrelid = relation.oid
       and default_value.adnum = attribute.attnum
      where namespace.nspname = 'public'
        and relation.relname in (
          select distinct expected.table_name
          from pg_temp.legacy_v0_1_expected_column as expected
        )
        and relation.relkind = 'r'
    ), difference as (
      (select * from pg_temp.legacy_v0_1_expected_column except select * from actual)
      union all
      (select * from actual except select * from pg_temp.legacy_v0_1_expected_column)
    )
    select 1 from difference
  ) then
    raise exception using
      errcode = '55000',
      message = 'v0.1 source column contract differs from the registered baseline';
  end if;

  if exists (
    with actual as (
      select
        source_relation.relname::text as table_name,
        constraint_record.contype::text as constraint_type,
        array(
          select source_attribute.attname::text
          from unnest(constraint_record.conkey) with ordinality
            as key_attribute(attnum, position)
          join pg_catalog.pg_attribute as source_attribute
            on source_attribute.attrelid = source_relation.oid
           and source_attribute.attnum = key_attribute.attnum
          order by key_attribute.position
        ) as key_columns,
        target_relation.relname::text as referenced_table,
        case when constraint_record.contype = 'f' then array(
          select target_attribute.attname::text
          from unnest(constraint_record.confkey) with ordinality
            as reference_attribute(attnum, position)
          join pg_catalog.pg_attribute as target_attribute
            on target_attribute.attrelid = target_relation.oid
           and target_attribute.attnum = reference_attribute.attnum
          order by reference_attribute.position
        ) else null::text[] end as referenced_columns
      from pg_catalog.pg_constraint as constraint_record
      join pg_catalog.pg_class as source_relation
        on source_relation.oid = constraint_record.conrelid
      join pg_catalog.pg_namespace as namespace
        on namespace.oid = source_relation.relnamespace
      left join pg_catalog.pg_class as target_relation
        on target_relation.oid = constraint_record.confrelid
      where namespace.nspname = 'public'
        and source_relation.relname in (
          select distinct expected.table_name
          from pg_temp.legacy_v0_1_expected_column as expected
        )
        and constraint_record.contype in ('p', 'u', 'f')
    ), difference as (
      (select * from pg_temp.legacy_v0_1_expected_key except select * from actual)
      union all
      (select * from actual except select * from pg_temp.legacy_v0_1_expected_key)
    )
    select 1 from difference
  ) then
    raise exception using
      errcode = '55000',
      message = 'v0.1 key and reference contract differs from the registered baseline';
  end if;

  if exists (
    with actual as (
      select
        relation.relname::text as table_name,
        constraint_record.conname::text as constraint_name,
        pg_catalog.regexp_replace(
          pg_catalog.pg_get_expr(
            constraint_record.conbin,
            constraint_record.conrelid
          ),
          '\s+', '', 'g'
        ) as normalized_expression
      from pg_catalog.pg_constraint as constraint_record
      join pg_catalog.pg_class as relation
        on relation.oid = constraint_record.conrelid
      join pg_catalog.pg_namespace as namespace
        on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname in (
          select distinct expected.table_name
          from pg_temp.legacy_v0_1_expected_column as expected
        )
        and constraint_record.contype = 'c'
    ), difference as (
      (select * from pg_temp.legacy_v0_1_expected_check except select * from actual)
      union all
      (select * from actual except select * from pg_temp.legacy_v0_1_expected_check)
    )
    select 1 from difference
  ) then
    raise exception using
      errcode = '55000',
      message = 'v0.1 check contract differs from the registered baseline';
  end if;
end
$legacy_v0_1_baseline_contract$;

create temporary table legacy_v0_1_baseline_attestation_result (
  schema_sha256 text not null check (
    schema_sha256 ~ '^[0-9a-f]{64}$'
  )
) on commit drop;

insert into legacy_v0_1_baseline_attestation_result (schema_sha256)
select encode(pg_catalog.sha256(pg_catalog.convert_to(
  pg_catalog.string_agg(
    pg_catalog.concat_ws(
      chr(31),
      expected.table_name,
      expected.ordinal_position::text,
      expected.column_name,
      expected.formatted_type,
      case when expected.is_not_null then '1' else '0' end,
      expected.default_expression
    ),
    chr(30) order by expected.table_name, expected.ordinal_position
  ),
  'UTF8'
)), 'hex')
from pg_temp.legacy_v0_1_expected_column as expected;

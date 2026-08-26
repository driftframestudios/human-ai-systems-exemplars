-- TARGET: database authority derives from a provisioned login-to-tenant grant,
-- while governed routines preserve aggregate, event, and queue invariants.
-- VERIFY: adversarial sessions exercise tenant switching, direct DML, event
-- continuity, worker races, lease fencing, and append-only evidence.

set lock_timeout = '5s';
set statement_timeout = '90s';
set idle_in_transaction_session_timeout = '60s';
set search_path = pg_catalog, control, laboratory;

select pg_advisory_xact_lock(hashtextextended('lims-eln-schema-v0.2', 0));

create function control.preserve_append_only_record()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  raise exception using
    errcode = '55000',
    message = format(
      '%I.%I is append-only; record a superseding statement to preserve lineage',
      tg_table_schema,
      tg_table_name
    );
end
$function$;

alter function control.preserve_append_only_record() owner to laboratory_owner;
revoke all on function control.preserve_append_only_record() from public;

do $append_only$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'specimen_event',
    'specimen_lineage',
    'approval_decision',
    'custody_event',
    'result_observation',
    'artifact',
    'outbox_delivery_attempt',
    'execution_receipt',
    'trace_edge',
    'open_receipt_status_event',
    'database_migration_plan',
    'database_migration_batch',
    'database_migration_record_map',
    'database_migration_exception',
    'data_reconciliation_result',
    'restore_receipt',
    'acceptance_decision',
    'acceptance_condition'
  ]
  loop
    execute format(
      'create trigger %I before update or delete on laboratory.%I '
      || 'for each row execute function control.preserve_append_only_record()',
      relation_name || '_append_only',
      relation_name
    );
  end loop;
end
$append_only$;

do $row_security$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'tenant',
    'actor_principal',
    'source_system',
    'location',
    'assay_specification',
    'assay_unit_conversion',
    'specimen',
    'specimen_lineage',
    'specimen_event',
    'approval_decision',
    'custody_event',
    'custody_position',
    'assay_run',
    'result_observation',
    'artifact',
    'idempotency_reservation',
    'integration_inbox',
    'integration_outbox',
    'outbox_delivery_attempt',
    'execution_receipt',
    'trace_node',
    'trace_edge',
    'open_receipt',
    'open_receipt_status_event',
    'database_migration_plan',
    'database_migration_run',
    'database_migration_batch',
    'database_migration_record_map',
    'database_migration_exception',
    'data_reconciliation_result',
    'restore_receipt',
    'acceptance_decision',
    'acceptance_condition'
  ]
  loop
    execute format('alter table laboratory.%I enable row level security', relation_name);
    execute format('alter table laboratory.%I force row level security', relation_name);
    execute format(
      'create policy tenant_scope on laboratory.%I '
      || 'using (tenant_id = control.current_tenant_id()) '
      || 'with check (tenant_id = control.current_tenant_id())',
      relation_name
    );
  end loop;
end
$row_security$;

create function laboratory.record_specimen_transition(
  p_specimen_id uuid,
  p_expected_version bigint,
  p_next_state control.nonblank_text,
  p_canonical_document jsonb,
  p_canonical_sha256 control.sha256_digest,
  p_event_id uuid,
  p_command_id uuid,
  p_command_sha256 control.sha256_digest,
  p_event_type control.nonblank_text,
  p_actor_id uuid,
  p_authorization_receipt_id uuid,
  p_correlation_id uuid,
  p_causation_event_id uuid,
  p_reason_code control.nonblank_text,
  p_event_payload jsonb,
  p_event_payload_sha256 control.sha256_digest,
  p_occurred_at timestamptz,
  p_outbox_message_id uuid,
  p_outbox_topic control.nonblank_text,
  p_outbox_partition_key control.external_identity,
  p_outbox_payload jsonb,
  p_outbox_payload_sha256 control.sha256_digest
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, control, laboratory
as $function$
declare
  tenant_context uuid := control.current_tenant_id();
  next_version bigint := p_expected_version + 1;
begin
  if tenant_context is null then
    raise exception using
      errcode = '42501',
      message = 'a current tenant principal grant is required';
  end if;

  update laboratory.specimen
  set lifecycle_state = p_next_state,
      aggregate_version = next_version,
      canonical_document = p_canonical_document,
      canonical_sha256 = p_canonical_sha256,
      updated_at = transaction_timestamp()
  where tenant_id = tenant_context
    and specimen_id = p_specimen_id
    and aggregate_version = p_expected_version;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'specimen revision advanced; reload the aggregate and replay the command';
  end if;

  insert into laboratory.specimen_event (
    tenant_id,
    event_id,
    specimen_id,
    aggregate_version,
    command_id,
    command_sha256,
    event_type,
    actor_id,
    authorization_receipt_id,
    correlation_id,
    causation_event_id,
    reason_code,
    payload,
    payload_sha256,
    payload_schema_version,
    canonicalization_version,
    occurred_at
  ) values (
    tenant_context,
    p_event_id,
    p_specimen_id,
    next_version,
    p_command_id,
    p_command_sha256,
    p_event_type,
    p_actor_id,
    p_authorization_receipt_id,
    p_correlation_id,
    p_causation_event_id,
    p_reason_code,
    p_event_payload,
    p_event_payload_sha256,
    '1.0.0',
    'jcs-1.0',
    p_occurred_at
  );

  if p_outbox_message_id is not null then
    insert into laboratory.integration_outbox (
      tenant_id,
      message_id,
      source_event_id,
      topic,
      partition_key,
      payload,
      payload_sha256,
      payload_schema_version,
      correlation_id
    ) values (
      tenant_context,
      p_outbox_message_id,
      p_event_id,
      p_outbox_topic,
      p_outbox_partition_key,
      p_outbox_payload,
      p_outbox_payload_sha256,
      '1.0.0',
      p_correlation_id
    );
  end if;

  return next_version;
end
$function$;

create function laboratory.claim_outbox_message(
  p_worker_identity control.nonblank_text,
  p_lease_token uuid,
  p_lease_seconds integer
)
returns table (
  message_id uuid,
  topic text,
  partition_key text,
  payload jsonb,
  payload_sha256 bytea,
  fencing_token bigint,
  lease_expires_at timestamptz
)
language sql
security definer
set search_path = pg_catalog, control, laboratory
as $function$
  with candidate as (
    select queued.tenant_id, queued.message_id
    from laboratory.integration_outbox as queued
    where queued.tenant_id = control.current_tenant_id()
      and queued.delivery_state = 'ready'
      and queued.next_attempt_at <= transaction_timestamp()
    order by queued.next_attempt_at, queued.message_id
    for update skip locked
    limit 1
  )
  update laboratory.integration_outbox as claimed
  set delivery_state = 'leased',
      delivery_attempts = claimed.delivery_attempts + 1,
      lease_owner = p_worker_identity,
      lease_token = p_lease_token,
      fencing_token = claimed.fencing_token + 1,
      lease_expires_at = transaction_timestamp()
        + make_interval(secs => greatest(1, least(p_lease_seconds, 900)))
  from candidate
  where claimed.tenant_id = candidate.tenant_id
    and claimed.message_id = candidate.message_id
  returning
    claimed.message_id,
    claimed.topic::text,
    claimed.partition_key::text,
    claimed.payload,
    claimed.payload_sha256::bytea,
    claimed.fencing_token,
    claimed.lease_expires_at
$function$;

create function laboratory.confirm_outbox_delivery(
  p_message_id uuid,
  p_worker_identity control.nonblank_text,
  p_lease_token uuid,
  p_fencing_token bigint,
  p_transport_receipt control.nonblank_text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, control, laboratory
as $function$
declare
  tenant_context uuid := control.current_tenant_id();
  attempt_number integer;
begin
  update laboratory.integration_outbox
  set delivery_state = 'delivered',
      delivered_at = transaction_timestamp(),
      confirmed_at = transaction_timestamp(),
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      last_error_code = null
  where tenant_id = tenant_context
    and message_id = p_message_id
    and delivery_state = 'leased'
    and lease_owner = p_worker_identity
    and lease_token = p_lease_token
    and fencing_token = p_fencing_token
    and lease_expires_at > transaction_timestamp()
  returning delivery_attempts into attempt_number;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'outbox lease advanced; reconcile the message before another effect';
  end if;

  insert into laboratory.outbox_delivery_attempt (
    tenant_id,
    message_id,
    attempt_number,
    worker_identity,
    fencing_token,
    attempt_state,
    transport_receipt,
    started_at,
    completed_at
  ) values (
    tenant_context,
    p_message_id,
    attempt_number,
    p_worker_identity,
    p_fencing_token,
    'confirmed',
    p_transport_receipt,
    transaction_timestamp(),
    transaction_timestamp()
  );
end
$function$;

alter function laboratory.record_specimen_transition(
  uuid, bigint, control.nonblank_text, jsonb, control.sha256_digest,
  uuid, uuid, control.sha256_digest, control.nonblank_text, uuid, uuid,
  uuid, uuid, control.nonblank_text, jsonb, control.sha256_digest,
  timestamptz, uuid, control.nonblank_text, control.external_identity,
  jsonb, control.sha256_digest
) owner to laboratory_owner;
alter function laboratory.claim_outbox_message(
  control.nonblank_text, uuid, integer
) owner to laboratory_owner;
alter function laboratory.confirm_outbox_delivery(
  uuid, control.nonblank_text, uuid, bigint, control.nonblank_text
) owner to laboratory_owner;

revoke all on all tables in schema control from public;
revoke all on all tables in schema laboratory from public;
revoke all on all sequences in schema laboratory from public;
revoke all on all functions in schema laboratory from public;

grant usage on schema control, laboratory to
  laboratory_tenant_runtime,
  laboratory_outbox_worker,
  laboratory_evidence_writer,
  laboratory_migrator,
  laboratory_auditor;

grant select on all tables in schema laboratory to
  laboratory_tenant_runtime,
  laboratory_outbox_worker,
  laboratory_evidence_writer,
  laboratory_migrator,
  laboratory_auditor;

grant insert, update on
  laboratory.specimen,
  laboratory.custody_position,
  laboratory.idempotency_reservation,
  laboratory.integration_inbox,
  laboratory.database_migration_run
to laboratory_migrator;

grant insert on
  laboratory.specimen_event,
  laboratory.specimen_lineage,
  laboratory.approval_decision,
  laboratory.custody_event,
  laboratory.result_observation,
  laboratory.artifact,
  laboratory.execution_receipt,
  laboratory.trace_node,
  laboratory.trace_edge,
  laboratory.open_receipt,
  laboratory.open_receipt_status_event,
  laboratory.database_migration_plan,
  laboratory.database_migration_batch,
  laboratory.database_migration_record_map,
  laboratory.database_migration_exception,
  laboratory.data_reconciliation_result,
  laboratory.restore_receipt,
  laboratory.acceptance_decision,
  laboratory.acceptance_condition
to laboratory_migrator;

grant insert on
  laboratory.execution_receipt,
  laboratory.trace_node,
  laboratory.trace_edge,
  laboratory.open_receipt,
  laboratory.open_receipt_status_event,
  laboratory.data_reconciliation_result,
  laboratory.restore_receipt,
  laboratory.acceptance_decision,
  laboratory.acceptance_condition
to laboratory_evidence_writer;

grant execute on function laboratory.record_specimen_transition(
  uuid, bigint, control.nonblank_text, jsonb, control.sha256_digest,
  uuid, uuid, control.sha256_digest, control.nonblank_text, uuid, uuid,
  uuid, uuid, control.nonblank_text, jsonb, control.sha256_digest,
  timestamptz, uuid, control.nonblank_text, control.external_identity,
  jsonb, control.sha256_digest
) to laboratory_tenant_runtime;
grant execute on function laboratory.claim_outbox_message(
  control.nonblank_text, uuid, integer
) to laboratory_outbox_worker;
grant execute on function laboratory.confirm_outbox_delivery(
  uuid, control.nonblank_text, uuid, bigint, control.nonblank_text
) to laboratory_outbox_worker;

alter default privileges for role laboratory_owner in schema laboratory
  revoke all on tables from public;
alter default privileges for role laboratory_owner in schema laboratory
  revoke all on functions from public;

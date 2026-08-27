-- TARGET: integration, evidence, traceability, migration, recovery, and
-- acceptance records form one durable, tenant-scoped control plane.
-- VERIFY: state matrices, replay tests, and evidence-bundle joins prove the
-- declared operational and accountable boundaries.

set lock_timeout = '5s';
set statement_timeout = '90s';
set idle_in_transaction_session_timeout = '60s';
set search_path = pg_catalog, control, laboratory;

select pg_advisory_xact_lock(hashtextextended('lims-eln-schema-v0.2', 0));

create table laboratory.idempotency_reservation (
  tenant_id uuid not null,
  reservation_id uuid not null,
  scope control.nonblank_text not null,
  request_key control.external_identity not null,
  request_sha256 control.sha256_digest not null,
  request_schema_version control.nonblank_text not null,
  reservation_state control.nonblank_text not null,
  lease_token uuid,
  fencing_token bigint not null default 0,
  lease_expires_at timestamptz,
  outcome_document jsonb,
  outcome_sha256 control.sha256_digest,
  reserved_at timestamptz not null default transaction_timestamp(),
  completed_at timestamptz,
  recovery_reason control.nonblank_text,
  constraint idempotency_reservation_pk primary key (tenant_id, reservation_id),
  constraint idempotency_reservation_tenant_fk foreign key (tenant_id)
    references laboratory.tenant (tenant_id) on update restrict on delete restrict,
  constraint idempotency_reservation_key_uq unique (
    tenant_id, scope, request_key
  ),
  constraint idempotency_reservation_state_ck check (
    reservation_state in ('reserved', 'committed', 'recovery_required')
  ),
  constraint idempotency_reservation_fencing_ck check (fencing_token >= 0),
  constraint idempotency_reservation_state_shape_ck check (
    (
      reservation_state = 'reserved'
      and lease_token is not null
      and fencing_token >= 1
      and lease_expires_at is not null
      and outcome_document is null
      and outcome_sha256 is null
      and completed_at is null
      and recovery_reason is null
    )
    or (
      reservation_state = 'committed'
      and outcome_document is not null
      and jsonb_typeof(outcome_document) = 'object'
      and outcome_sha256 is not null
      and completed_at is not null
      and recovery_reason is null
    )
    or (
      reservation_state = 'recovery_required'
      and recovery_reason is not null
      and completed_at is not null
    )
  ),
  constraint idempotency_reservation_time_order_ck check (
    completed_at is null or completed_at >= reserved_at
  )
);

create table laboratory.integration_inbox (
  tenant_id uuid not null,
  ingress_id uuid not null,
  source_system_id uuid not null,
  source_message_id control.external_identity,
  raw_artifact_id uuid not null,
  raw_sha256 control.sha256_digest not null,
  message_schema_version control.nonblank_text not null,
  ingress_state control.nonblank_text not null,
  disposition_reason control.nonblank_text,
  correlation_id uuid not null,
  first_observed_at timestamptz not null,
  last_observed_at timestamptz not null,
  processing_attempts integer not null default 0,
  next_attempt_at timestamptz,
  lease_owner control.nonblank_text,
  lease_token uuid,
  fencing_token bigint not null default 0,
  lease_expires_at timestamptz,
  normalized_document jsonb,
  normalized_sha256 control.sha256_digest,
  accepted_specimen_id uuid,
  recorded_at timestamptz not null default transaction_timestamp(),
  constraint integration_inbox_pk primary key (tenant_id, ingress_id),
  constraint integration_inbox_source_fk foreign key (tenant_id, source_system_id)
    references laboratory.source_system (tenant_id, source_system_id)
    on update restrict on delete restrict,
  constraint integration_inbox_artifact_fk foreign key (tenant_id, raw_artifact_id)
    references laboratory.artifact (tenant_id, artifact_id)
    on update restrict on delete restrict,
  constraint integration_inbox_specimen_fk foreign key (tenant_id, accepted_specimen_id)
    references laboratory.specimen (tenant_id, specimen_id)
    on update restrict on delete restrict,
  constraint integration_inbox_source_message_uq unique (
    tenant_id, source_system_id, source_message_id
  ),
  constraint integration_inbox_state_ck check (
    ingress_state in ('received', 'leased', 'accepted', 'quarantined', 'superseded')
  ),
  constraint integration_inbox_attempts_ck check (processing_attempts >= 0),
  constraint integration_inbox_fencing_ck check (fencing_token >= 0),
  constraint integration_inbox_observation_order_ck check (
    last_observed_at >= first_observed_at
    and recorded_at >= first_observed_at
  ),
  constraint integration_inbox_lease_shape_ck check (
    ingress_state <> 'leased'
    or (
      lease_owner is not null
      and lease_token is not null
      and fencing_token >= 1
      and lease_expires_at is not null
    )
  ),
  constraint integration_inbox_acceptance_shape_ck check (
    ingress_state <> 'accepted'
    or (
      normalized_document is not null
      and jsonb_typeof(normalized_document) = 'object'
      and normalized_sha256 is not null
      and accepted_specimen_id is not null
    )
  ),
  constraint integration_inbox_quarantine_shape_ck check (
    ingress_state <> 'quarantined' or disposition_reason is not null
  )
);

create table laboratory.integration_outbox (
  tenant_id uuid not null,
  message_id uuid not null,
  source_event_id uuid,
  topic control.nonblank_text not null,
  partition_key control.external_identity not null,
  payload jsonb not null,
  payload_sha256 control.sha256_digest not null,
  payload_schema_version control.nonblank_text not null,
  correlation_id uuid not null,
  delivery_state control.nonblank_text not null default 'ready',
  delivery_attempts integer not null default 0,
  available_at timestamptz not null default transaction_timestamp(),
  next_attempt_at timestamptz not null default transaction_timestamp(),
  lease_owner control.nonblank_text,
  lease_token uuid,
  fencing_token bigint not null default 0,
  lease_expires_at timestamptz,
  last_error_code control.nonblank_text,
  delivered_at timestamptz,
  confirmed_at timestamptz,
  recorded_at timestamptz not null default transaction_timestamp(),
  constraint integration_outbox_pk primary key (tenant_id, message_id),
  constraint integration_outbox_tenant_fk foreign key (tenant_id)
    references laboratory.tenant (tenant_id) on update restrict on delete restrict,
  constraint integration_outbox_source_event_fk foreign key (
    tenant_id, source_event_id
  ) references laboratory.specimen_event (tenant_id, event_id)
    on update restrict on delete restrict,
  constraint integration_outbox_payload_shape_ck check (
    jsonb_typeof(payload) = 'object' and payload ? 'schemaVersion'
  ),
  constraint integration_outbox_state_ck check (
    delivery_state in ('ready', 'leased', 'delivered', 'recovery_required')
  ),
  constraint integration_outbox_attempts_ck check (delivery_attempts >= 0),
  constraint integration_outbox_fencing_ck check (fencing_token >= 0),
  constraint integration_outbox_lease_shape_ck check (
    delivery_state <> 'leased'
    or (
      lease_owner is not null
      and lease_token is not null
      and fencing_token >= 1
      and lease_expires_at is not null
    )
  ),
  constraint integration_outbox_delivered_shape_ck check (
    delivery_state <> 'delivered'
    or (delivered_at is not null and confirmed_at is not null)
  ),
  constraint integration_outbox_recovery_shape_ck check (
    delivery_state <> 'recovery_required' or last_error_code is not null
  ),
  constraint integration_outbox_time_order_ck check (
    next_attempt_at >= available_at
    and (delivered_at is null or delivered_at >= available_at)
    and (confirmed_at is null or confirmed_at >= delivered_at)
  )
);

create table laboratory.outbox_delivery_attempt (
  tenant_id uuid not null,
  message_id uuid not null,
  attempt_number integer not null,
  worker_identity control.nonblank_text not null,
  fencing_token bigint not null,
  attempt_state control.nonblank_text not null,
  transport_receipt control.nonblank_text,
  error_code control.nonblank_text,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  recorded_at timestamptz not null default transaction_timestamp(),
  constraint outbox_delivery_attempt_pk primary key (
    tenant_id, message_id, attempt_number
  ),
  constraint outbox_delivery_attempt_message_fk foreign key (
    tenant_id, message_id
  ) references laboratory.integration_outbox (tenant_id, message_id)
    on update restrict on delete restrict,
  constraint outbox_delivery_attempt_number_ck check (attempt_number >= 1),
  constraint outbox_delivery_attempt_fencing_ck check (fencing_token >= 1),
  constraint outbox_delivery_attempt_state_ck check (
    attempt_state in ('confirmed', 'retry_scheduled', 'recovery_required')
  ),
  constraint outbox_delivery_attempt_evidence_ck check (
    (attempt_state = 'confirmed' and transport_receipt is not null and error_code is null)
    or (attempt_state <> 'confirmed' and error_code is not null)
  ),
  constraint outbox_delivery_attempt_time_order_ck check (
    completed_at >= started_at and recorded_at >= started_at
  )
);

create table laboratory.execution_receipt (
  tenant_id uuid not null,
  receipt_id uuid not null,
  external_receipt_id control.external_identity not null,
  receipt_schema_version control.nonblank_text not null,
  source_revision control.nonblank_text not null,
  source_sha256 control.sha256_digest not null,
  execution_class control.nonblank_text not null,
  execution_scope control.nonblank_text not null,
  qualification_stage control.nonblank_text not null,
  environment_document jsonb not null,
  database_engine control.nonblank_text not null,
  database_version control.nonblank_text not null,
  migration_head control.nonblank_text not null,
  schema_fingerprint control.sha256_digest not null,
  artifact_bindings jsonb not null,
  limitations jsonb not null,
  synthetic_data boolean not null,
  performed_by uuid not null,
  reviewed_by uuid not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default transaction_timestamp(),
  supersedes_receipt_id uuid,
  constraint execution_receipt_pk primary key (tenant_id, receipt_id),
  constraint execution_receipt_external_uq unique (
    tenant_id, external_receipt_id
  ),
  constraint execution_receipt_performer_fk foreign key (tenant_id, performed_by)
    references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint execution_receipt_reviewer_fk foreign key (tenant_id, reviewed_by)
    references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint execution_receipt_supersedes_fk foreign key (
    tenant_id, supersedes_receipt_id
  ) references laboratory.execution_receipt (tenant_id, receipt_id)
    on update restrict on delete restrict,
  constraint execution_receipt_execution_class_ck check (
    execution_class in (
      'illustrative_compilable', 'tested_excerpt', 'verified_running',
      'sandbox_qualified', 'production_qualified'
    )
  ),
  constraint execution_receipt_qualification_stage_ck check (
    qualification_stage in (
      'executable_offline', 'tenant_open', 'sandbox_open',
      'migration_rehearsal_open', 'production_open', 'accepted'
    )
  ),
  constraint execution_receipt_environment_shape_ck check (
    jsonb_typeof(environment_document) = 'object'
  ),
  constraint execution_receipt_artifact_shape_ck check (
    jsonb_typeof(artifact_bindings) = 'array'
  ),
  constraint execution_receipt_limitations_shape_ck check (
    jsonb_typeof(limitations) = 'array'
  ),
  constraint execution_receipt_separation_ck check (performed_by <> reviewed_by),
  constraint execution_receipt_recording_order_ck check (recorded_at >= observed_at)
);

create table laboratory.trace_node (
  tenant_id uuid not null,
  trace_node_id uuid not null,
  node_type control.nonblank_text not null,
  external_node_id control.external_identity not null,
  source_revision control.nonblank_text not null,
  content_sha256 control.sha256_digest not null,
  effective_at timestamptz not null,
  retired_at timestamptz,
  constraint trace_node_pk primary key (tenant_id, trace_node_id),
  constraint trace_node_tenant_fk foreign key (tenant_id)
    references laboratory.tenant (tenant_id) on update restrict on delete restrict,
  constraint trace_node_external_uq unique (
    tenant_id, node_type, external_node_id, source_revision
  ),
  constraint trace_node_type_ck check (
    node_type in (
      'requirement', 'risk', 'control', 'test', 'receipt',
      'decision', 'release', 'data_contract', 'migration_plan'
    )
  ),
  constraint trace_node_window_ck check (
    retired_at is null or retired_at >= effective_at
  )
);

create table laboratory.trace_edge (
  tenant_id uuid not null,
  trace_edge_id uuid not null,
  from_node_id uuid not null,
  to_node_id uuid not null,
  edge_type control.nonblank_text not null,
  evidence_receipt_id uuid,
  recorded_at timestamptz not null default transaction_timestamp(),
  constraint trace_edge_pk primary key (tenant_id, trace_edge_id),
  constraint trace_edge_from_fk foreign key (tenant_id, from_node_id)
    references laboratory.trace_node (tenant_id, trace_node_id)
    on update restrict on delete restrict,
  constraint trace_edge_to_fk foreign key (tenant_id, to_node_id)
    references laboratory.trace_node (tenant_id, trace_node_id)
    on update restrict on delete restrict,
  constraint trace_edge_receipt_fk foreign key (tenant_id, evidence_receipt_id)
    references laboratory.execution_receipt (tenant_id, receipt_id)
    on update restrict on delete restrict,
  constraint trace_edge_uq unique (
    tenant_id, from_node_id, to_node_id, edge_type
  ),
  constraint trace_edge_type_ck check (
    edge_type in (
      'verifies', 'mitigates', 'implements', 'evidences',
      'authorizes', 'supersedes', 'depends_on'
    )
  ),
  constraint trace_edge_distinct_ck check (from_node_id <> to_node_id)
);

create table laboratory.open_receipt (
  tenant_id uuid not null,
  open_receipt_id uuid not null,
  external_receipt_id control.external_identity not null,
  component control.nonblank_text not null,
  qualification_stage control.nonblank_text not null,
  required_evidence_event control.nonblank_text not null,
  accountable_actor_id uuid not null,
  due_at timestamptz,
  review_trigger control.nonblank_text not null,
  created_at timestamptz not null default transaction_timestamp(),
  constraint open_receipt_pk primary key (tenant_id, open_receipt_id),
  constraint open_receipt_external_uq unique (
    tenant_id, external_receipt_id
  ),
  constraint open_receipt_owner_fk foreign key (tenant_id, accountable_actor_id)
    references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint open_receipt_due_order_ck check (
    due_at is null or due_at > created_at
  )
);

create table laboratory.open_receipt_status_event (
  tenant_id uuid not null,
  status_event_id uuid not null,
  open_receipt_id uuid not null,
  receipt_version bigint not null,
  receipt_status control.nonblank_text not null,
  evidence_receipt_id uuid,
  decided_by uuid not null,
  decision_reason control.nonblank_text not null,
  decided_at timestamptz not null,
  recorded_at timestamptz not null default transaction_timestamp(),
  supersedes_status_event_id uuid,
  constraint open_receipt_status_event_pk primary key (
    tenant_id, status_event_id
  ),
  constraint open_receipt_status_event_receipt_fk foreign key (
    tenant_id, open_receipt_id
  ) references laboratory.open_receipt (tenant_id, open_receipt_id)
    on update restrict on delete restrict,
  constraint open_receipt_status_event_evidence_fk foreign key (
    tenant_id, evidence_receipt_id
  ) references laboratory.execution_receipt (tenant_id, receipt_id)
    on update restrict on delete restrict,
  constraint open_receipt_status_event_actor_fk foreign key (tenant_id, decided_by)
    references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint open_receipt_status_event_supersedes_fk foreign key (
    tenant_id, supersedes_status_event_id
  ) references laboratory.open_receipt_status_event (
    tenant_id, status_event_id
  ) on update restrict on delete restrict,
  constraint open_receipt_status_event_version_uq unique (
    tenant_id, open_receipt_id, receipt_version
  ),
  constraint open_receipt_status_event_version_ck check (receipt_version >= 1),
  constraint open_receipt_status_event_state_ck check (
    receipt_status in ('open', 'evidence_ready', 'satisfied', 'superseded')
  ),
  constraint open_receipt_status_event_closure_ck check (
    receipt_status not in ('evidence_ready', 'satisfied')
    or evidence_receipt_id is not null
  ),
  constraint open_receipt_status_event_recording_order_ck check (
    recorded_at >= decided_at
  )
);

create table laboratory.database_migration_plan (
  tenant_id uuid not null,
  migration_plan_id uuid not null,
  plan_version integer not null,
  source_schema_fingerprint control.sha256_digest not null,
  target_schema_fingerprint control.sha256_digest not null,
  source_snapshot_contract control.nonblank_text not null,
  transformation_version control.nonblank_text not null,
  migration_tool control.nonblank_text not null,
  engine_compatibility control.nonblank_text not null,
  compatibility_window jsonb not null,
  lock_budget_ms integer not null,
  statement_budget_ms integer not null,
  recovery_strategy control.nonblank_text not null,
  plan_sha256 control.sha256_digest not null,
  approved_at timestamptz not null,
  recorded_at timestamptz not null default transaction_timestamp(),
  constraint database_migration_plan_pk primary key (
    tenant_id, migration_plan_id, plan_version
  ),
  constraint database_migration_plan_tenant_fk foreign key (tenant_id)
    references laboratory.tenant (tenant_id) on update restrict on delete restrict,
  constraint database_migration_plan_version_ck check (plan_version >= 1),
  constraint database_migration_plan_fingerprint_ck check (
    source_schema_fingerprint <> target_schema_fingerprint
  ),
  constraint database_migration_plan_window_shape_ck check (
    jsonb_typeof(compatibility_window) = 'object'
  ),
  constraint database_migration_plan_budget_ck check (
    lock_budget_ms between 1 and 60000
    and statement_budget_ms >= lock_budget_ms
  ),
  constraint database_migration_plan_recording_order_ck check (
    recorded_at >= approved_at
  )
);

create table laboratory.database_migration_run (
  tenant_id uuid not null,
  migration_run_id uuid not null,
  migration_plan_id uuid not null,
  plan_version integer not null,
  source_snapshot_id control.external_identity not null,
  run_mode control.nonblank_text not null,
  run_state control.nonblank_text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  last_checkpoint jsonb,
  recorded_at timestamptz not null default transaction_timestamp(),
  constraint database_migration_run_pk primary key (tenant_id, migration_run_id),
  constraint database_migration_run_plan_fk foreign key (
    tenant_id, migration_plan_id, plan_version
  ) references laboratory.database_migration_plan (
    tenant_id, migration_plan_id, plan_version
  ) on update restrict on delete restrict,
  constraint database_migration_run_snapshot_uq unique (
    tenant_id, migration_plan_id, plan_version, source_snapshot_id, run_mode
  ),
  constraint database_migration_run_mode_ck check (
    run_mode in ('rehearsal', 'cutover', 'restore', 'forward_repair')
  ),
  constraint database_migration_run_state_ck check (
    run_state in ('planned', 'running', 'paused', 'reconciled', 'accepted', 'recovery_required')
  ),
  constraint database_migration_run_completion_ck check (
    run_state in ('planned', 'running', 'paused')
    or completed_at is not null
  ),
  constraint database_migration_run_time_order_ck check (
    completed_at is null or completed_at >= started_at
  ),
  constraint database_migration_run_checkpoint_shape_ck check (
    last_checkpoint is null or jsonb_typeof(last_checkpoint) = 'object'
  )
);

create table laboratory.database_migration_batch (
  tenant_id uuid not null,
  migration_run_id uuid not null,
  batch_number integer not null,
  cursor_start jsonb,
  cursor_end jsonb not null,
  source_rows bigint not null,
  target_rows bigint not null,
  exception_rows bigint not null,
  batch_sha256 control.sha256_digest not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  constraint database_migration_batch_pk primary key (
    tenant_id, migration_run_id, batch_number
  ),
  constraint database_migration_batch_run_fk foreign key (
    tenant_id, migration_run_id
  ) references laboratory.database_migration_run (tenant_id, migration_run_id)
    on update restrict on delete restrict,
  constraint database_migration_batch_number_ck check (batch_number >= 1),
  constraint database_migration_batch_counts_ck check (
    source_rows >= 0
    and target_rows >= 0
    and exception_rows >= 0
    and source_rows = target_rows + exception_rows
  ),
  constraint database_migration_batch_cursor_shape_ck check (
    (cursor_start is null or jsonb_typeof(cursor_start) = 'object')
    and jsonb_typeof(cursor_end) = 'object'
  ),
  constraint database_migration_batch_time_order_ck check (
    completed_at >= started_at
  )
);

create table laboratory.database_migration_record_map (
  tenant_id uuid not null,
  migration_run_id uuid not null,
  source_namespace control.nonblank_text not null,
  source_identity control.external_identity not null,
  source_revision control.external_identity not null,
  target_table control.nonblank_text not null,
  target_identity uuid not null,
  semantic_sha256 control.sha256_digest not null,
  disposition control.nonblank_text not null,
  recorded_at timestamptz not null default transaction_timestamp(),
  constraint database_migration_record_map_pk primary key (
    tenant_id, migration_run_id, source_namespace, source_identity, source_revision
  ),
  constraint database_migration_record_map_run_fk foreign key (
    tenant_id, migration_run_id
  ) references laboratory.database_migration_run (tenant_id, migration_run_id)
    on update restrict on delete restrict,
  constraint database_migration_record_map_target_uq unique (
    tenant_id, migration_run_id, target_table, target_identity
  ),
  constraint database_migration_record_map_disposition_ck check (
    disposition in ('loaded', 'replayed', 'reconciled', 'exception')
  )
);

create table laboratory.database_migration_exception (
  tenant_id uuid not null,
  exception_id uuid not null,
  migration_run_id uuid not null,
  source_namespace control.nonblank_text not null,
  source_identity control.external_identity not null,
  exception_class control.nonblank_text not null,
  source_evidence_sha256 control.sha256_digest not null,
  disposition control.nonblank_text not null,
  accountable_actor_id uuid not null,
  disposition_evidence_receipt_id uuid,
  opened_at timestamptz not null,
  resolved_at timestamptz,
  recorded_at timestamptz not null default transaction_timestamp(),
  constraint database_migration_exception_pk primary key (tenant_id, exception_id),
  constraint database_migration_exception_run_fk foreign key (
    tenant_id, migration_run_id
  ) references laboratory.database_migration_run (tenant_id, migration_run_id)
    on update restrict on delete restrict,
  constraint database_migration_exception_actor_fk foreign key (
    tenant_id, accountable_actor_id
  ) references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint database_migration_exception_receipt_fk foreign key (
    tenant_id, disposition_evidence_receipt_id
  ) references laboratory.execution_receipt (tenant_id, receipt_id)
    on update restrict on delete restrict,
  constraint database_migration_exception_disposition_ck check (
    disposition in ('open', 'source_corrected', 'target_corrected', 'accepted_exception', 'superseded')
  ),
  constraint database_migration_exception_resolution_ck check (
    (disposition = 'open' and resolved_at is null)
    or (
      disposition <> 'open'
      and resolved_at is not null
      and disposition_evidence_receipt_id is not null
    )
  ),
  constraint database_migration_exception_time_order_ck check (
    resolved_at is null or resolved_at >= opened_at
  )
);

create table laboratory.data_reconciliation_result (
  tenant_id uuid not null,
  reconciliation_result_id uuid not null,
  migration_run_id uuid not null,
  criterion_code control.nonblank_text not null,
  criterion_version control.nonblank_text not null,
  cohort_query_sha256 control.sha256_digest not null,
  value_kind control.nonblank_text not null,
  expected_value numeric(38, 12) not null,
  observed_value numeric(38, 12) not null,
  tolerance_value numeric(38, 12) not null default 0,
  unit_code control.nonblank_text not null,
  result_state control.nonblank_text not null,
  exception_count bigint not null default 0,
  evidence_receipt_id uuid not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default transaction_timestamp(),
  constraint data_reconciliation_result_pk primary key (
    tenant_id, reconciliation_result_id
  ),
  constraint data_reconciliation_result_run_fk foreign key (
    tenant_id, migration_run_id
  ) references laboratory.database_migration_run (tenant_id, migration_run_id)
    on update restrict on delete restrict,
  constraint data_reconciliation_result_receipt_fk foreign key (
    tenant_id, evidence_receipt_id
  ) references laboratory.execution_receipt (tenant_id, receipt_id)
    on update restrict on delete restrict,
  constraint data_reconciliation_result_value_kind_ck check (
    value_kind in ('exact_count', 'exact_decimal', 'checksum_count', 'exception_count')
  ),
  constraint data_reconciliation_result_state_ck check (
    result_state in ('passed', 'exception_accepted', 'returned_for_correction')
  ),
  constraint data_reconciliation_result_finite_ck check (
    expected_value::text not in ('NaN', 'Infinity', '-Infinity')
    and observed_value::text not in ('NaN', 'Infinity', '-Infinity')
    and tolerance_value::text not in ('NaN', 'Infinity', '-Infinity')
  ),
  constraint data_reconciliation_result_tolerance_ck check (tolerance_value >= 0),
  constraint data_reconciliation_result_exception_count_ck check (
    exception_count >= 0
  ),
  constraint data_reconciliation_result_recording_order_ck check (
    recorded_at >= observed_at
  )
);

create table laboratory.restore_receipt (
  tenant_id uuid not null,
  restore_receipt_id uuid not null,
  migration_run_id uuid not null,
  backup_coordinate control.external_identity not null,
  backup_sha256 control.sha256_digest not null,
  restored_schema_fingerprint control.sha256_digest not null,
  restored_migration_head control.nonblank_text not null,
  row_manifest_sha256 control.sha256_digest not null,
  rpo_seconds bigint not null,
  rto_milliseconds bigint not null,
  restore_state control.nonblank_text not null,
  performed_by uuid not null,
  reviewed_by uuid not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  recorded_at timestamptz not null default transaction_timestamp(),
  constraint restore_receipt_pk primary key (tenant_id, restore_receipt_id),
  constraint restore_receipt_run_fk foreign key (tenant_id, migration_run_id)
    references laboratory.database_migration_run (tenant_id, migration_run_id)
    on update restrict on delete restrict,
  constraint restore_receipt_performer_fk foreign key (tenant_id, performed_by)
    references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint restore_receipt_reviewer_fk foreign key (tenant_id, reviewed_by)
    references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint restore_receipt_objective_ck check (
    rpo_seconds >= 0 and rto_milliseconds >= 0
  ),
  constraint restore_receipt_state_ck check (
    restore_state in ('passed', 'returned_for_correction')
  ),
  constraint restore_receipt_separation_ck check (performed_by <> reviewed_by),
  constraint restore_receipt_time_order_ck check (
    completed_at >= started_at and recorded_at >= started_at
  )
);

create table laboratory.acceptance_decision (
  tenant_id uuid not null,
  decision_id uuid not null,
  acceptance_domain control.nonblank_text not null,
  intended_use_id control.external_identity not null,
  release_claim_id control.external_identity not null,
  evidence_bundle_sha256 control.sha256_digest not null,
  migration_run_id uuid not null,
  restore_receipt_id uuid not null,
  approver_id uuid not null,
  decision control.nonblank_text not null,
  rationale control.nonblank_text not null,
  policy_version control.nonblank_text not null,
  decided_at timestamptz not null,
  recorded_at timestamptz not null default transaction_timestamp(),
  supersedes_decision_id uuid,
  constraint acceptance_decision_pk primary key (tenant_id, decision_id),
  constraint acceptance_decision_scope_uq unique (
    tenant_id, acceptance_domain, intended_use_id, release_claim_id,
    evidence_bundle_sha256
  ),
  constraint acceptance_decision_run_fk foreign key (tenant_id, migration_run_id)
    references laboratory.database_migration_run (tenant_id, migration_run_id)
    on update restrict on delete restrict,
  constraint acceptance_decision_restore_fk foreign key (
    tenant_id, restore_receipt_id
  ) references laboratory.restore_receipt (tenant_id, restore_receipt_id)
    on update restrict on delete restrict,
  constraint acceptance_decision_approver_fk foreign key (tenant_id, approver_id)
    references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint acceptance_decision_supersedes_fk foreign key (
    tenant_id, supersedes_decision_id
  ) references laboratory.acceptance_decision (tenant_id, decision_id)
    on update restrict on delete restrict,
  constraint acceptance_decision_domain_ck check (
    acceptance_domain in ('scientific', 'quality', 'regulatory', 'security', 'operations')
  ),
  constraint acceptance_decision_value_ck check (
    decision in ('accepted', 'accepted_with_conditions', 'returned_for_evidence', 'superseded')
  ),
  constraint acceptance_decision_recording_order_ck check (
    recorded_at >= decided_at
  )
);

create table laboratory.acceptance_condition (
  tenant_id uuid not null,
  condition_id uuid not null,
  decision_id uuid not null,
  condition_text control.nonblank_text not null,
  accountable_actor_id uuid not null,
  due_at timestamptz not null,
  condition_state control.nonblank_text not null,
  closure_receipt_id uuid,
  closed_at timestamptz,
  recorded_at timestamptz not null default transaction_timestamp(),
  constraint acceptance_condition_pk primary key (tenant_id, condition_id),
  constraint acceptance_condition_decision_fk foreign key (tenant_id, decision_id)
    references laboratory.acceptance_decision (tenant_id, decision_id)
    on update restrict on delete restrict,
  constraint acceptance_condition_actor_fk foreign key (
    tenant_id, accountable_actor_id
  ) references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint acceptance_condition_receipt_fk foreign key (
    tenant_id, closure_receipt_id
  ) references laboratory.execution_receipt (tenant_id, receipt_id)
    on update restrict on delete restrict,
  constraint acceptance_condition_state_ck check (
    condition_state in ('open', 'satisfied', 'superseded')
  ),
  constraint acceptance_condition_closure_ck check (
    (condition_state = 'open' and closure_receipt_id is null and closed_at is null)
    or (
      condition_state <> 'open'
      and closure_receipt_id is not null
      and closed_at is not null
    )
  ),
  constraint acceptance_condition_time_order_ck check (
    closed_at is null or closed_at >= recorded_at
  )
);

alter table laboratory.idempotency_reservation owner to laboratory_owner;
alter table laboratory.integration_inbox owner to laboratory_owner;
alter table laboratory.integration_outbox owner to laboratory_owner;
alter table laboratory.outbox_delivery_attempt owner to laboratory_owner;
alter table laboratory.execution_receipt owner to laboratory_owner;
alter table laboratory.trace_node owner to laboratory_owner;
alter table laboratory.trace_edge owner to laboratory_owner;
alter table laboratory.open_receipt owner to laboratory_owner;
alter table laboratory.open_receipt_status_event owner to laboratory_owner;
alter table laboratory.database_migration_plan owner to laboratory_owner;
alter table laboratory.database_migration_run owner to laboratory_owner;
alter table laboratory.database_migration_batch owner to laboratory_owner;
alter table laboratory.database_migration_record_map owner to laboratory_owner;
alter table laboratory.database_migration_exception owner to laboratory_owner;
alter table laboratory.data_reconciliation_result owner to laboratory_owner;
alter table laboratory.restore_receipt owner to laboratory_owner;
alter table laboratory.acceptance_decision owner to laboratory_owner;
alter table laboratory.acceptance_condition owner to laboratory_owner;

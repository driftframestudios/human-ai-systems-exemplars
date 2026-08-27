-- TARGET: laboratory identity, lineage, custody, assays, quantities, artifacts,
-- events, and approvals retain their complete durable meaning.
-- VERIFY: round-trip and constraint fixtures cover each scientific invariant.

set lock_timeout = '5s';
set statement_timeout = '90s';
set idle_in_transaction_session_timeout = '60s';
set search_path = pg_catalog, control, laboratory;

select pg_advisory_xact_lock(hashtextextended('lims-eln-schema-v0.2', 0));

create table laboratory.location (
  tenant_id uuid not null,
  location_id uuid not null,
  parent_location_id uuid,
  location_kind control.nonblank_text not null,
  location_code control.nonblank_text not null,
  display_label control.nonblank_text not null,
  effective_at timestamptz not null,
  retired_at timestamptz,
  constraint location_pk primary key (tenant_id, location_id),
  constraint location_tenant_fk foreign key (tenant_id)
    references laboratory.tenant (tenant_id) on update restrict on delete restrict,
  constraint location_parent_fk foreign key (tenant_id, parent_location_id)
    references laboratory.location (tenant_id, location_id)
    on update restrict on delete restrict,
  constraint location_code_uq unique (tenant_id, location_code),
  constraint location_kind_ck check (
    location_kind in ('site', 'building', 'room', 'unit', 'position', 'transit')
  ),
  constraint location_parent_identity_ck check (
    parent_location_id is null or parent_location_id <> location_id
  ),
  constraint location_window_ck check (
    retired_at is null or retired_at >= effective_at
  )
);

create table laboratory.assay_specification (
  tenant_id uuid not null,
  assay_specification_id uuid not null,
  specification_version integer not null,
  assay_code control.nonblank_text not null,
  analyte_code control.nonblank_text not null,
  canonical_unit control.ucum_code not null,
  minimum_value numeric(38, 12),
  maximum_value numeric(38, 12),
  decimal_scale smallint not null,
  effective_at timestamptz not null,
  retired_at timestamptz,
  specification_sha256 control.sha256_digest not null,
  canonicalization_version control.nonblank_text not null,
  constraint assay_specification_pk primary key (
    tenant_id, assay_specification_id, specification_version
  ),
  constraint assay_specification_tenant_fk foreign key (tenant_id)
    references laboratory.tenant (tenant_id) on update restrict on delete restrict,
  constraint assay_specification_code_uq unique (
    tenant_id, assay_code, specification_version
  ),
  constraint assay_specification_version_ck check (specification_version >= 1),
  constraint assay_specification_scale_ck check (decimal_scale between 0 and 12),
  constraint assay_specification_range_ck check (
    minimum_value is null
    or maximum_value is null
    or minimum_value <= maximum_value
  ),
  constraint assay_specification_finite_ck check (
    coalesce(minimum_value::text, '0') not in ('NaN', 'Infinity', '-Infinity')
    and coalesce(maximum_value::text, '0') not in ('NaN', 'Infinity', '-Infinity')
  ),
  constraint assay_specification_window_ck check (
    retired_at is null or retired_at >= effective_at
  )
);

create table laboratory.assay_unit_conversion (
  tenant_id uuid not null,
  assay_specification_id uuid not null,
  specification_version integer not null,
  source_unit control.ucum_code not null,
  canonical_unit control.ucum_code not null,
  multiplier numeric(38, 18) not null,
  offset_value numeric(38, 18) not null default 0,
  conversion_rule_version control.nonblank_text not null,
  constraint assay_unit_conversion_pk primary key (
    tenant_id, assay_specification_id, specification_version, source_unit
  ),
  constraint assay_unit_conversion_specification_fk foreign key (
    tenant_id, assay_specification_id, specification_version
  ) references laboratory.assay_specification (
    tenant_id, assay_specification_id, specification_version
  ) on update restrict on delete restrict,
  constraint assay_unit_conversion_multiplier_ck check (
    multiplier > 0 and multiplier::text not in ('NaN', 'Infinity', '-Infinity')
  ),
  constraint assay_unit_conversion_offset_ck check (
    offset_value::text not in ('NaN', 'Infinity', '-Infinity')
  )
);

create table laboratory.specimen (
  tenant_id uuid not null,
  specimen_id uuid not null,
  source_system_id uuid not null,
  external_specimen_id control.external_identity not null,
  lifecycle_state control.nonblank_text not null,
  aggregate_version bigint not null,
  collection_date date,
  canonical_document jsonb not null,
  canonical_sha256 control.sha256_digest not null,
  canonicalization_version control.nonblank_text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint specimen_pk primary key (tenant_id, specimen_id),
  constraint specimen_tenant_fk foreign key (tenant_id)
    references laboratory.tenant (tenant_id) on update restrict on delete restrict,
  constraint specimen_source_system_fk foreign key (tenant_id, source_system_id)
    references laboratory.source_system (tenant_id, source_system_id)
    on update restrict on delete restrict,
  constraint specimen_external_identity_uq unique (
    tenant_id, source_system_id, external_specimen_id
  ),
  constraint specimen_lifecycle_state_ck check (
    lifecycle_state in (
      'registered', 'accessioned', 'in_process', 'under_review',
      'released', 'corrected', 'voided'
    )
  ),
  constraint specimen_aggregate_version_ck check (aggregate_version >= 1),
  constraint specimen_document_shape_ck check (
    jsonb_typeof(canonical_document) = 'object'
    and canonical_document ? 'schemaVersion'
  ),
  constraint specimen_time_order_ck check (updated_at >= created_at)
);

create table laboratory.specimen_lineage (
  tenant_id uuid not null,
  child_specimen_id uuid not null,
  parent_specimen_id uuid not null,
  relationship_type control.nonblank_text not null,
  source_event_id uuid not null,
  recorded_at timestamptz not null default transaction_timestamp(),
  constraint specimen_lineage_pk primary key (
    tenant_id, child_specimen_id, parent_specimen_id, relationship_type
  ),
  constraint specimen_lineage_child_fk foreign key (tenant_id, child_specimen_id)
    references laboratory.specimen (tenant_id, specimen_id)
    on update restrict on delete restrict,
  constraint specimen_lineage_parent_fk foreign key (tenant_id, parent_specimen_id)
    references laboratory.specimen (tenant_id, specimen_id)
    on update restrict on delete restrict,
  constraint specimen_lineage_distinct_ck check (
    child_specimen_id <> parent_specimen_id
  ),
  constraint specimen_lineage_relationship_ck check (
    relationship_type in ('aliquot_of', 'derived_from', 'pooled_from', 'split_from')
  )
);

create table laboratory.specimen_event (
  tenant_id uuid not null,
  event_id uuid not null,
  specimen_id uuid not null,
  aggregate_version bigint not null,
  command_id uuid not null,
  command_sha256 control.sha256_digest not null,
  event_type control.nonblank_text not null,
  actor_id uuid not null,
  authorization_receipt_id uuid,
  correlation_id uuid not null,
  causation_event_id uuid,
  reason_code control.nonblank_text,
  payload jsonb not null,
  payload_sha256 control.sha256_digest not null,
  payload_schema_version control.nonblank_text not null,
  canonicalization_version control.nonblank_text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default transaction_timestamp(),
  supersedes_event_id uuid,
  constraint specimen_event_pk primary key (tenant_id, event_id),
  constraint specimen_event_specimen_fk foreign key (tenant_id, specimen_id)
    references laboratory.specimen (tenant_id, specimen_id)
    on update restrict on delete restrict,
  constraint specimen_event_actor_fk foreign key (tenant_id, actor_id)
    references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint specimen_event_causation_fk foreign key (tenant_id, causation_event_id)
    references laboratory.specimen_event (tenant_id, event_id)
    on update restrict on delete restrict,
  constraint specimen_event_supersedes_fk foreign key (tenant_id, supersedes_event_id)
    references laboratory.specimen_event (tenant_id, event_id)
    on update restrict on delete restrict,
  constraint specimen_event_version_uq unique (
    tenant_id, specimen_id, aggregate_version
  ),
  constraint specimen_event_command_uq unique (tenant_id, command_id),
  constraint specimen_event_version_ck check (aggregate_version >= 1),
  constraint specimen_event_payload_shape_ck check (
    jsonb_typeof(payload) = 'object' and payload ? 'schemaVersion'
  ),
  constraint specimen_event_recording_order_ck check (recorded_at >= occurred_at),
  constraint specimen_event_links_ck check (
    causation_event_id is null or causation_event_id <> event_id
  ),
  constraint specimen_event_supersession_ck check (
    supersedes_event_id is null or supersedes_event_id <> event_id
  )
);

alter table laboratory.specimen_lineage
  add constraint specimen_lineage_source_event_fk
  foreign key (tenant_id, source_event_id)
  references laboratory.specimen_event (tenant_id, event_id)
  on update restrict on delete restrict;

create table laboratory.approval_decision (
  tenant_id uuid not null,
  decision_id uuid not null,
  specimen_id uuid not null,
  target_event_id uuid not null,
  decision control.nonblank_text not null,
  meaning_code control.nonblank_text not null,
  signer_id uuid not null,
  reviewer_id uuid,
  identity_assurance control.nonblank_text not null,
  policy_version control.nonblank_text not null,
  signed_payload_sha256 control.sha256_digest not null,
  evidence_bundle_sha256 control.sha256_digest not null,
  decided_at timestamptz not null,
  recorded_at timestamptz not null default transaction_timestamp(),
  supersedes_decision_id uuid,
  constraint approval_decision_pk primary key (tenant_id, decision_id),
  constraint approval_decision_specimen_fk foreign key (tenant_id, specimen_id)
    references laboratory.specimen (tenant_id, specimen_id)
    on update restrict on delete restrict,
  constraint approval_decision_event_fk foreign key (tenant_id, target_event_id)
    references laboratory.specimen_event (tenant_id, event_id)
    on update restrict on delete restrict,
  constraint approval_decision_signer_fk foreign key (tenant_id, signer_id)
    references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint approval_decision_reviewer_fk foreign key (tenant_id, reviewer_id)
    references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint approval_decision_supersedes_fk foreign key (
    tenant_id, supersedes_decision_id
  ) references laboratory.approval_decision (tenant_id, decision_id)
    on update restrict on delete restrict,
  constraint approval_decision_value_ck check (
    decision in ('approved', 'returned_for_evidence', 'revoked', 'superseded')
  ),
  constraint approval_decision_meaning_ck check (
    meaning_code in ('reviewed', 'authored', 'verified', 'released', 'corrected')
  ),
  constraint approval_decision_separation_ck check (
    reviewer_id is null or reviewer_id <> signer_id
  ),
  constraint approval_decision_recording_order_ck check (
    recorded_at >= decided_at
  )
);

create table laboratory.custody_event (
  tenant_id uuid not null,
  custody_event_id uuid not null,
  specimen_id uuid not null,
  custody_version bigint not null,
  from_location_id uuid,
  to_location_id uuid not null,
  transferred_by uuid not null,
  accepted_by uuid,
  reason_code control.nonblank_text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default transaction_timestamp(),
  supersedes_custody_event_id uuid,
  constraint custody_event_pk primary key (tenant_id, custody_event_id),
  constraint custody_event_specimen_fk foreign key (tenant_id, specimen_id)
    references laboratory.specimen (tenant_id, specimen_id)
    on update restrict on delete restrict,
  constraint custody_event_from_location_fk foreign key (tenant_id, from_location_id)
    references laboratory.location (tenant_id, location_id)
    on update restrict on delete restrict,
  constraint custody_event_to_location_fk foreign key (tenant_id, to_location_id)
    references laboratory.location (tenant_id, location_id)
    on update restrict on delete restrict,
  constraint custody_event_transfer_actor_fk foreign key (tenant_id, transferred_by)
    references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint custody_event_accept_actor_fk foreign key (tenant_id, accepted_by)
    references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint custody_event_supersedes_fk foreign key (
    tenant_id, supersedes_custody_event_id
  ) references laboratory.custody_event (tenant_id, custody_event_id)
    on update restrict on delete restrict,
  constraint custody_event_version_uq unique (
    tenant_id, specimen_id, custody_version
  ),
  constraint custody_event_version_ck check (custody_version >= 1),
  constraint custody_event_location_change_ck check (
    from_location_id is null or from_location_id <> to_location_id
  ),
  constraint custody_event_recording_order_ck check (recorded_at >= occurred_at)
);

create table laboratory.custody_position (
  tenant_id uuid not null,
  specimen_id uuid not null,
  custody_version bigint not null,
  location_id uuid not null,
  last_custody_event_id uuid not null,
  updated_at timestamptz not null,
  constraint custody_position_pk primary key (tenant_id, specimen_id),
  constraint custody_position_specimen_fk foreign key (tenant_id, specimen_id)
    references laboratory.specimen (tenant_id, specimen_id)
    on update restrict on delete restrict,
  constraint custody_position_location_fk foreign key (tenant_id, location_id)
    references laboratory.location (tenant_id, location_id)
    on update restrict on delete restrict,
  constraint custody_position_event_fk foreign key (
    tenant_id, last_custody_event_id
  ) references laboratory.custody_event (tenant_id, custody_event_id)
    on update restrict on delete restrict,
  constraint custody_position_version_ck check (custody_version >= 1)
);

create table laboratory.assay_run (
  tenant_id uuid not null,
  assay_run_id uuid not null,
  assay_specification_id uuid not null,
  specification_version integer not null,
  source_system_id uuid not null,
  external_run_id control.external_identity not null,
  instrument_actor_id uuid not null,
  run_state control.nonblank_text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  recorded_at timestamptz not null default transaction_timestamp(),
  constraint assay_run_pk primary key (tenant_id, assay_run_id),
  constraint assay_run_specification_fk foreign key (
    tenant_id, assay_specification_id, specification_version
  ) references laboratory.assay_specification (
    tenant_id, assay_specification_id, specification_version
  ) on update restrict on delete restrict,
  constraint assay_run_source_fk foreign key (tenant_id, source_system_id)
    references laboratory.source_system (tenant_id, source_system_id)
    on update restrict on delete restrict,
  constraint assay_run_instrument_fk foreign key (tenant_id, instrument_actor_id)
    references laboratory.actor_principal (tenant_id, actor_id)
    on update restrict on delete restrict,
  constraint assay_run_external_uq unique (
    tenant_id, source_system_id, external_run_id
  ),
  constraint assay_run_state_ck check (
    run_state in ('planned', 'running', 'completed', 'quarantined', 'invalidated')
  ),
  constraint assay_run_time_order_ck check (
    completed_at is null or completed_at >= started_at
  )
);

create table laboratory.result_observation (
  tenant_id uuid not null,
  observation_id uuid not null,
  specimen_id uuid not null,
  assay_run_id uuid not null,
  assay_specification_id uuid not null,
  specification_version integer not null,
  raw_value numeric(38, 12) not null,
  raw_unit control.ucum_code not null,
  qualifier control.nonblank_text,
  lower_detection_limit numeric(38, 12),
  upper_quantitation_limit numeric(38, 12),
  canonical_value numeric(38, 12) not null,
  canonical_unit control.ucum_code not null,
  conversion_rule_version control.nonblank_text not null,
  source_text control.external_identity,
  observation_state control.nonblank_text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default transaction_timestamp(),
  supersedes_observation_id uuid,
  constraint result_observation_pk primary key (tenant_id, observation_id),
  constraint result_observation_specimen_fk foreign key (tenant_id, specimen_id)
    references laboratory.specimen (tenant_id, specimen_id)
    on update restrict on delete restrict,
  constraint result_observation_run_fk foreign key (tenant_id, assay_run_id)
    references laboratory.assay_run (tenant_id, assay_run_id)
    on update restrict on delete restrict,
  constraint result_observation_unit_fk foreign key (
    tenant_id, assay_specification_id, specification_version, raw_unit
  ) references laboratory.assay_unit_conversion (
    tenant_id, assay_specification_id, specification_version, source_unit
  ) on update restrict on delete restrict,
  constraint result_observation_supersedes_fk foreign key (
    tenant_id, supersedes_observation_id
  ) references laboratory.result_observation (tenant_id, observation_id)
    on update restrict on delete restrict,
  constraint result_observation_state_ck check (
    observation_state in ('accepted', 'quarantined', 'superseded', 'invalidated')
  ),
  constraint result_observation_qualifier_ck check (
    qualifier is null or qualifier in ('less_than', 'greater_than', 'estimated')
  ),
  constraint result_observation_finite_ck check (
    raw_value::text not in ('NaN', 'Infinity', '-Infinity')
    and canonical_value::text not in ('NaN', 'Infinity', '-Infinity')
    and coalesce(lower_detection_limit::text, '0') not in ('NaN', 'Infinity', '-Infinity')
    and coalesce(upper_quantitation_limit::text, '0') not in ('NaN', 'Infinity', '-Infinity')
  ),
  constraint result_observation_limit_order_ck check (
    lower_detection_limit is null
    or upper_quantitation_limit is null
    or lower_detection_limit <= upper_quantitation_limit
  ),
  constraint result_observation_recording_order_ck check (
    recorded_at >= observed_at
  )
);

create table laboratory.artifact (
  tenant_id uuid not null,
  artifact_id uuid not null,
  specimen_id uuid,
  source_system_id uuid not null,
  artifact_purpose control.nonblank_text not null,
  bucket_name control.nonblank_text not null,
  object_key control.external_identity not null,
  object_version_id control.external_identity not null,
  byte_length bigint not null,
  media_type control.nonblank_text not null,
  content_sha256 control.sha256_digest not null,
  encryption_key_reference control.nonblank_text not null,
  retention_class control.nonblank_text not null,
  captured_at timestamptz not null,
  recorded_at timestamptz not null default transaction_timestamp(),
  constraint artifact_pk primary key (tenant_id, artifact_id),
  constraint artifact_specimen_fk foreign key (tenant_id, specimen_id)
    references laboratory.specimen (tenant_id, specimen_id)
    on update restrict on delete restrict,
  constraint artifact_source_fk foreign key (tenant_id, source_system_id)
    references laboratory.source_system (tenant_id, source_system_id)
    on update restrict on delete restrict,
  constraint artifact_object_uq unique (
    tenant_id, bucket_name, object_key, object_version_id
  ),
  constraint artifact_byte_length_ck check (byte_length >= 0),
  constraint artifact_recording_order_ck check (recorded_at >= captured_at)
);

alter table laboratory.location owner to laboratory_owner;
alter table laboratory.assay_specification owner to laboratory_owner;
alter table laboratory.assay_unit_conversion owner to laboratory_owner;
alter table laboratory.specimen owner to laboratory_owner;
alter table laboratory.specimen_lineage owner to laboratory_owner;
alter table laboratory.specimen_event owner to laboratory_owner;
alter table laboratory.approval_decision owner to laboratory_owner;
alter table laboratory.custody_event owner to laboratory_owner;
alter table laboratory.custody_position owner to laboratory_owner;
alter table laboratory.assay_run owner to laboratory_owner;
alter table laboratory.result_observation owner to laboratory_owner;
alter table laboratory.artifact owner to laboratory_owner;

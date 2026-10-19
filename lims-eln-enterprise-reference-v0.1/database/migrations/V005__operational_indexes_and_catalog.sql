-- TARGET: representative lifecycle, custody, integration, evidence, and
-- migration paths remain bounded as tenant histories grow.
-- VERIFY: representative EXPLAIN fixtures record index selection and row
-- estimates before each promotion.

set lock_timeout = '5s';
set statement_timeout = '90s';
set idle_in_transaction_session_timeout = '60s';
set search_path = pg_catalog, control, laboratory;

select pg_advisory_xact_lock(hashtextextended('lims-eln-schema-v0.2', 0));

create index specimen_state_worklist_idx
  on laboratory.specimen (tenant_id, lifecycle_state, updated_at, specimen_id);

create index specimen_event_timeline_idx
  on laboratory.specimen_event (
    tenant_id, specimen_id, occurred_at, aggregate_version
  );

create index specimen_event_causation_idx
  on laboratory.specimen_event (tenant_id, causation_event_id)
  where causation_event_id is not null;

create index specimen_lineage_parent_idx
  on laboratory.specimen_lineage (
    tenant_id, parent_specimen_id, relationship_type, child_specimen_id
  );

create index location_parent_idx
  on laboratory.location (tenant_id, parent_location_id, location_id)
  where parent_location_id is not null;

create index approval_specimen_timeline_idx
  on laboratory.approval_decision (
    tenant_id, specimen_id, decided_at, decision_id
  );

create index custody_specimen_timeline_idx
  on laboratory.custody_event (
    tenant_id, specimen_id, occurred_at, custody_version
  );

create index custody_location_timeline_idx
  on laboratory.custody_event (
    tenant_id, to_location_id, occurred_at, custody_event_id
  );

create index assay_run_state_idx
  on laboratory.assay_run (
    tenant_id, run_state, started_at, assay_run_id
  );

create index result_specimen_timeline_idx
  on laboratory.result_observation (
    tenant_id, specimen_id, observed_at, observation_id
  );

create index artifact_specimen_idx
  on laboratory.artifact (
    tenant_id, specimen_id, captured_at, artifact_id
  ) where specimen_id is not null;

create index idempotency_recovery_idx
  on laboratory.idempotency_reservation (
    tenant_id, lease_expires_at, reservation_id
  ) where reservation_state = 'reserved';

create index inbox_ready_queue_idx
  on laboratory.integration_inbox (
    tenant_id, next_attempt_at, recorded_at, ingress_id
  ) where ingress_state = 'received';

create index inbox_expired_lease_idx
  on laboratory.integration_inbox (
    tenant_id, lease_expires_at, ingress_id
  ) where ingress_state = 'leased';

create index inbox_quarantine_idx
  on laboratory.integration_inbox (
    tenant_id, recorded_at, ingress_id
  ) where ingress_state = 'quarantined';

create index outbox_ready_queue_idx
  on laboratory.integration_outbox (
    tenant_id, next_attempt_at, message_id
  ) where delivery_state = 'ready';

create index outbox_expired_lease_idx
  on laboratory.integration_outbox (
    tenant_id, lease_expires_at, message_id
  ) where delivery_state = 'leased';

create index execution_receipt_claim_idx
  on laboratory.execution_receipt (
    tenant_id, qualification_stage, observed_at, receipt_id
  );

create index trace_edge_reverse_idx
  on laboratory.trace_edge (
    tenant_id, to_node_id, edge_type, from_node_id
  );

create index open_receipt_owner_idx
  on laboratory.open_receipt (
    tenant_id, accountable_actor_id, due_at, open_receipt_id
  );

create index migration_run_state_idx
  on laboratory.database_migration_run (
    tenant_id, run_state, started_at, migration_run_id
  );

create index migration_exception_open_idx
  on laboratory.database_migration_exception (
    tenant_id, migration_run_id, opened_at, exception_id
  ) where disposition = 'open';

create index reconciliation_run_idx
  on laboratory.data_reconciliation_result (
    tenant_id, migration_run_id, criterion_code, reconciliation_result_id
  );

create index acceptance_release_idx
  on laboratory.acceptance_decision (
    tenant_id, intended_use_id, release_claim_id,
    acceptance_domain, decided_at
  );

create view control.schema_contract_catalog as
select
  namespace.nspname as schema_name,
  relation.relname as relation_name,
  attribute.attnum as ordinal_position,
  attribute.attname as column_name,
  pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) as data_type,
  attribute.attnotnull as is_required,
  coalesce(pg_catalog.pg_get_expr(default_value.adbin, default_value.adrelid), '')
    as default_expression
from pg_catalog.pg_class as relation
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation.relnamespace
join pg_catalog.pg_attribute as attribute
  on attribute.attrelid = relation.oid
left join pg_catalog.pg_attrdef as default_value
  on default_value.adrelid = relation.oid
 and default_value.adnum = attribute.attnum
where namespace.nspname in ('control', 'laboratory')
  and not (
    namespace.nspname = 'control'
    and relation.relname like 'legacy\_%' escape '\'
  )
  and relation.relkind in ('r', 'p')
  and attribute.attnum > 0
  and not attribute.attisdropped
order by namespace.nspname, relation.relname, attribute.attnum;

alter view control.schema_contract_catalog owner to laboratory_owner;
revoke all on control.schema_contract_catalog from public;
grant select on control.schema_contract_catalog to laboratory_auditor;

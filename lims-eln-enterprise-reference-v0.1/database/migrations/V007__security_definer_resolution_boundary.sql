-- TARGET: every released SECURITY DEFINER routine resolves built-ins first and
-- places the caller-writable temporary schema last.
-- VERIFY: the catalog binds the closed routine set to this exact path, and a
-- workload session exercises same-named temporary relations.

set lock_timeout = '5s';
set statement_timeout = '90s';
set idle_in_transaction_session_timeout = '60s';
set search_path = pg_catalog;

select pg_advisory_xact_lock(hashtextextended('lims-eln-schema-v0.2', 0));

alter function control.current_tenant_id()
  set search_path to pg_catalog, pg_temp;

alter function laboratory.record_specimen_transition(
  uuid, bigint, control.nonblank_text, jsonb, control.sha256_digest,
  uuid, uuid, control.sha256_digest, control.nonblank_text, uuid, uuid,
  uuid, uuid, control.nonblank_text, jsonb, control.sha256_digest,
  timestamptz, uuid, control.nonblank_text, control.external_identity,
  jsonb, control.sha256_digest
) set search_path to pg_catalog, pg_temp;

alter function laboratory.claim_outbox_message(
  control.nonblank_text, uuid, integer
) set search_path to pg_catalog, pg_temp;

alter function laboratory.confirm_outbox_delivery(
  uuid, control.nonblank_text, uuid, bigint, control.nonblank_text
) set search_path to pg_catalog, pg_temp;

alter function laboratory.record_migration_exception_status(
  uuid, bigint, control.nonblank_text, uuid, uuid,
  control.nonblank_text, timestamptz, uuid
) set search_path to pg_catalog, pg_temp;

alter function laboratory.record_acceptance_condition_status(
  uuid, bigint, control.nonblank_text, uuid, uuid,
  control.nonblank_text, timestamptz, uuid
) set search_path to pg_catalog, pg_temp;

alter function laboratory.reclaim_expired_outbox_messages(integer)
  set search_path to pg_catalog, pg_temp;

alter function laboratory.record_result_observation(
  uuid, uuid, uuid, numeric, control.ucum_code, control.nonblank_text,
  numeric, numeric, control.external_identity, control.nonblank_text,
  timestamptz, uuid
) set search_path to pg_catalog, pg_temp;

alter function control.schema_fingerprint()
  set search_path to pg_catalog, pg_temp;

alter function control.migration_evidence_fingerprint()
  set search_path to pg_catalog, pg_temp;

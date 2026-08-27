-- HISTORICAL BASELINE: this DDL reproduces v0.1 for upgrade rehearsals.
-- TARGET: database/migrations carries the authoritative v0.2 contract.

create table execution_receipt (
  receipt_id text primary key,
  source_revision text not null,
  source_sha256 text not null check (length(source_sha256) = 64),
  execution_class text not null,
  execution_scope text not null,
  qualification_stage text not null,
  generated_at_utc text not null,
  synthetic_data integer not null check (synthetic_data in (0, 1)),
  limitations_json text not null
);

create table trace_link (
  receipt_id text not null,
  requirement_id text not null,
  risk_id text not null,
  control_id text not null,
  test_id text not null,
  primary key (
    receipt_id,
    requirement_id,
    risk_id,
    control_id,
    test_id
  ),
  foreign key (receipt_id) references execution_receipt (receipt_id)
);

create table open_receipt (
  open_receipt_id text primary key,
  component text not null,
  qualification_stage text not null,
  evidence_event text not null,
  accountable_owner text not null,
  review_trigger text not null,
  status text not null check (status in ('open', 'satisfied', 'superseded'))
);

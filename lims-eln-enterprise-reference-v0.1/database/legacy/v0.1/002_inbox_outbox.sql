-- HISTORICAL BASELINE: this DDL reproduces v0.1 for upgrade rehearsals.
-- TARGET: database/migrations carries the authoritative v0.2 contract.

create table idempotency_reservation (
  tenant_id text not null,
  scope text not null,
  request_key text not null,
  request_sha256 text not null check (length(request_sha256) = 64),
  status text not null check (status in ('reserved', 'committed', 'unknown')),
  receipt_json text,
  updated_at_utc text not null,
  primary key (tenant_id, scope, request_key)
);

create table integration_inbox (
  tenant_id text not null,
  source text not null,
  message_id text not null,
  raw_sha256 text not null check (length(raw_sha256) = 64),
  status text not null,
  received_at_utc text not null,
  primary key (tenant_id, source, message_id)
);

create table integration_outbox (
  tenant_id text not null,
  message_id text not null,
  topic text not null,
  partition_key text not null,
  payload_json text not null,
  attempts integer not null default 0,
  status text not null check (status in ('pending', 'delivered', 'quarantined')),
  last_error_code text,
  available_at_utc text not null,
  primary key (tenant_id, message_id)
);

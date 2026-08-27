-- HISTORICAL BASELINE: this DDL reproduces v0.1 for upgrade rehearsals.
-- TARGET: database/migrations carries the authoritative v0.2 contract.

create table specimen (
  tenant_id text not null,
  specimen_id text not null,
  state text not null,
  aggregate_version bigint not null check (aggregate_version >= 0),
  canonical_sha256 text not null check (length(canonical_sha256) = 64),
  updated_at_utc text not null,
  primary key (tenant_id, specimen_id)
);

create table specimen_event (
  tenant_id text not null,
  specimen_id text not null,
  aggregate_version bigint not null,
  command_id text not null,
  command_sha256 text not null check (length(command_sha256) = 64),
  actor_id text not null,
  event_type text not null,
  occurred_at_utc text not null,
  reason_code text,
  signature_meaning text,
  primary key (tenant_id, specimen_id, aggregate_version),
  unique (tenant_id, specimen_id, command_id),
  foreign key (tenant_id, specimen_id)
    references specimen (tenant_id, specimen_id)
);

create table custody_position (
  tenant_id text not null,
  specimen_id text not null,
  location_path text not null,
  aggregate_version bigint not null,
  primary key (tenant_id, specimen_id),
  foreign key (tenant_id, specimen_id)
    references specimen (tenant_id, specimen_id)
);

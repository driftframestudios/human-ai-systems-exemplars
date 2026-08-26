-- TARGET: one representative historical specimen, event, and custody position
-- exercise temporal, digest, identity, state, and location conversion.

insert into public.specimen (
  tenant_id,
  specimen_id,
  state,
  aggregate_version,
  canonical_sha256,
  updated_at_utc
) values (
  'legacy-lab',
  'legacy-specimen-001',
  'accessioned',
  1,
  repeat('a', 64),
  '2026-07-28T14:30:00Z'
);

insert into public.specimen_event (
  tenant_id,
  specimen_id,
  aggregate_version,
  command_id,
  command_sha256,
  actor_id,
  event_type,
  occurred_at_utc,
  reason_code
) values (
  'legacy-lab',
  'legacy-specimen-001',
  1,
  'legacy-command-001',
  repeat('b', 64),
  'legacy-operator-001',
  'specimen_accessioned',
  '2026-07-28T14:29:00Z',
  'accession_complete'
);

insert into public.custody_position (
  tenant_id,
  specimen_id,
  location_path,
  aggregate_version
) values (
  'legacy-lab',
  'legacy-specimen-001',
  'Boston/Receiving/Freezer-02/Rack-07',
  1
);

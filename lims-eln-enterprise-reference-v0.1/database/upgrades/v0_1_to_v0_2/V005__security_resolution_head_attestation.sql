-- TARGET: the populated v0.1 path carries the V006 cutover receipt forward to
-- the V008 bounded-migration head while preserving historical evidence bytes.
-- VERIFY: the successor attestation binds both schema fingerprints and the
-- exact predecessor receipt before the separately authorized contract phase.

set lock_timeout = '5s';
set statement_timeout = '90s';
set search_path = pg_catalog;

select pg_advisory_xact_lock(hashtextextended('lims-eln-v0.1-to-v0.2', 0));

do $legacy_security_definer_forward_fix$
begin
  if to_regprocedure(
    'control.legacy_v0_1_representation_manifest()'
  ) is not null then
    alter function control.legacy_v0_1_representation_manifest()
      set search_path to pg_catalog, pg_temp;
  end if;
end
$legacy_security_definer_forward_fix$;

create table control.legacy_upgrade_head_attestation (
  attestation_id uuid not null,
  upgrade_receipt_id uuid not null,
  prior_migration_head control.nonblank_text not null,
  effective_migration_head control.nonblank_text not null,
  canonical_schema_sha256 control.sha256_digest not null,
  migration_evidence_sha256 control.sha256_digest not null,
  recorded_at control.finite_instant not null default transaction_timestamp(),
  constraint legacy_upgrade_head_attestation_pk primary key (attestation_id),
  constraint legacy_upgrade_head_attestation_receipt_uq
    unique (upgrade_receipt_id),
  constraint legacy_upgrade_head_attestation_receipt_fk
    foreign key (upgrade_receipt_id)
    references control.legacy_upgrade_receipt (receipt_id)
    on update restrict on delete restrict,
  constraint legacy_upgrade_head_attestation_transition_ck check (
    prior_migration_head = 'V006'
    and effective_migration_head = 'V008'
  )
);

alter table control.legacy_upgrade_head_attestation owner to laboratory_owner;
revoke all on control.legacy_upgrade_head_attestation from public;

create trigger legacy_upgrade_head_attestation_append_only
before update or delete on control.legacy_upgrade_head_attestation
for each row execute function control.preserve_append_only_record();

insert into control.legacy_upgrade_head_attestation (
  attestation_id,
  upgrade_receipt_id,
  prior_migration_head,
  effective_migration_head,
  canonical_schema_sha256,
  migration_evidence_sha256
)
select
  control.stable_migration_uuid(
    'lims-eln/upgrade-head-attestation',
    'v0.1-to-v0.2/V006-to-V008'
  ),
  upgrade_receipt.receipt_id,
  upgrade_receipt.migration_head,
  'V008',
  control.schema_fingerprint(),
  control.migration_evidence_fingerprint()
from control.legacy_upgrade_receipt as upgrade_receipt
where upgrade_receipt.baseline_version = 'v0.1'
  and upgrade_receipt.migration_head = 'V006'
  and upgrade_receipt.canonical_schema_sha256 = control.schema_fingerprint();

do $head_attestation_proof$
begin
  if (
    select count(*)
    from control.legacy_upgrade_head_attestation
    where prior_migration_head = 'V006'
      and effective_migration_head = 'V008'
      and canonical_schema_sha256 = control.schema_fingerprint()
      and migration_evidence_sha256 = control.migration_evidence_fingerprint()
  ) <> 1 then
    raise exception using
      errcode = '55000',
      message = 'the populated upgrade requires one V006-to-V008 head attestation';
  end if;
end
$head_attestation_proof$;

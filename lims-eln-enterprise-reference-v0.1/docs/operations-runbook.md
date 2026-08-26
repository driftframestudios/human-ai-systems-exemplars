# Operations and recovery runbook

## Before accepting traffic

- Confirm tenant, SDK, schema, and service-identity compatibility manifests.
- Confirm secrets originate from the managed runtime and stay outside logs.
- Confirm inbox, outbox, quarantine, audit, and reconciliation stores are
  durable and monitored.
- Exercise backup restore and record artifact hashes, row counts, timestamps,
  and reviewer identity.
- Confirm on-call ownership and escalation paths for scientific, quality,
  security, platform, and vendor concerns.
- Confirm the pinned Flyway coordinate, release-provenance SHA-256 values,
  PostgreSQL compatibility band, applied histories, canonical semantic fingerprint, migration-evidence
  fingerprint, and application compatibility window.
- Confirm each workload login resolves to one current tenant-principal grant
  and carries workload privileges through the intended group role.

## Ambiguous external write

1. Preserve request identity, canonical fingerprint, timestamp, and transport
   evidence.
2. Place the operation in `ambiguous_outcome`.
3. Read by stable request or external identity.
4. Compare the canonical fingerprint.
5. Mark convergence, conflict, or confirmed absence.
6. Permit a new mutation only after confirmed absence and policy approval.

## Quarantine

Quarantine records preserve the input identity, digest, classification, first
and last observation time, attempt count, and recovery owner. Sensitive payload
content follows the organization’s retention and access policy.

## Cutover

Cutover requires count, identity, relationship, checksum, and exact-value
parity; accountable dispositions for every source exception; completed restore
evidence; an approved recovery route; and current Scientific, Quality,
Regulatory, Security, and Operations decisions.

## Database migration

1. Resolve runtime connection values from the approved secret provider and run
   the pinned Flyway image. Keep URL, user, and password outside checked config.
   Authenticate through a dedicated `NOINHERIT` deployment LOGIN with no
   cluster-administration attributes. Grant direct target-database `CONNECT`
   only and `SET TRUE`/`INHERIT FALSE`/`ADMIN FALSE` membership in the stable
   `NOLOGIN` owner. Configure a database-scoped connection default for that
   owner so Flyway history connections receive the same role. Let the
   release-attested `afterConnect` callback adopt and verify the owner role and
   catalog setting. Reserve the cluster administrator for database and
   role provisioning.
2. For authentic v0.1 adoption, attest the already populated legacy catalog,
   then issue explicit Flyway baselines for the canonical and upgrade histories.
   Keep `baselineOnMigrate=false`. Classify reconstructed provisioning as
   disposable setup evidence in the release receipt.
3. Capture the source semantic manifest and source schema fingerprint.
4. Apply the canonical and expand migrations under Flyway's PostgreSQL lock and
   the migration's statement budgets.
5. Execute v0.1 backfill, validation, and cutover V002–V004 with Flyway
   `group=true`. The source relation locks, target
   projection manifest, validation receipt, cutover, and migration history
   commit together.
6. Reconcile complete population, identity, referential integrity, checksums,
   exact quantities, units, null distributions, vocabularies, artifacts, and
   accountable exception dispositions.
7. Compare the canonical semantic fingerprint with the clean-install reference
   and preserve the migration-evidence fingerprint for upgrade lineage.
8. Run old and new application versions through the read-only compatibility
   window. Exercise the exact numeric boundary proof and tenant, privilege,
   immutability, and queue proofs on PostgreSQL 16 and 18.
9. After the successor head attestation binds the effective migration head and
   current migration-evidence fingerprint, persist a completed migration batch;
   successful source-row count,
   target-projection count, source-row manifest, restore-row manifest, and
   exception-closure reconciliation; a restore whose schema and row manifests
   equal the cutover archive; and current acceptance decisions for all five
   domains.
10. Run Flyway `validate`, observe production telemetry, and target the contract
    migration separately after the database guard validates the receipt bundle.

Applied migration content stays immutable. A changed determination advances
through a new forward revision and preserves the earlier checksum evidence.

## Adoption and simulation receipts

The representative legacy fixture and contract-authorization fixture support a
repeatable disposable simulation. Their receipts demonstrate Flyway behavior,
atomicity, reconciliation, and contract enforcement. An adoption receipt begins
from an attested pre-populated environment and binds organization-owned source
records, recovery evidence, and accountable decisions. Operators preserve the
execution classification in the release receipt while Flyway history records
operational migration state.

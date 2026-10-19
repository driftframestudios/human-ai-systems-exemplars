# Changelog

## Unreleased

- Replaced the repository-specific migration engine, manifest schema, and
  duplicate engine tests with pinned Flyway Community 13.0.0 configuration,
  explicit baseline attestation, native schema histories, and validation.
- Preserved canonical V001 through V007 byte-for-byte, added forward-only
  V008, converted the six v0.1 phases to Flyway naming, and retained the atomic
  backfill–validation–cutover rehearsal with `group=true` and `REPEATABLE READ`.
- Added a secret-free Flyway launcher contract and SHA-256 release provenance
  outside Flyway's operational history.
- Replaced the Flyway administrator session and removed Flyway 13 `initSql`.
  A pinned multi-architecture OSS image now authenticates through an ephemeral
  `NOINHERIT` LOGIN, and an `afterConnect` callback proves bounded attributes,
  target-database authority, a database-scoped connection default, and explicit
  transition to the `NOLOGIN` owner across Flyway history connections.
- Moved synthetic contract review after the V005 successor attestation and
  strengthened V006 to verify that append-only successor before contraction.
- Expanded the data-primitive ledger to 53 stable findings and made the
  cross-runtime canonical-byte, digest, and approval-signature qualification
  boundary explicit.
- Added forward-only V007 for privileged name resolution and V008 for bounded
  cross-tenant migration under forced row security. The populated-upgrade
  successor attestation binds the V008 head, and every privileged routine
  resolves through `pg_catalog` first and `pg_temp` last.
- Replaced the broad privileged-function path assertion with an exact reviewed
  identity/path allowlist and workload-session temporary-name shadow proofs.
- Scoped database `TEMPORARY` to the disposable alpha shadow-proof login;
  stable runtime roles and the beta control login retain the production
  database-authority contract, and teardown revokes the proof grant.

## 0.2.0 — 2026-08-04

- Replaced illustrative bootstrap SQL with six PostgreSQL-native, ordered,
  checksummed canonical migrations and an executable v0.1 upgrade path.
- Added a 50-finding data-primitive ledger, semantic data contract, five-plan
  probability assessment, synthesized chain of action, and six reevaluation
  interstitials.
- Added UUID internal identities, binary digests, timezone-aware instants,
  finite exact scientific quantities, UCUM-coded units, JSONB envelopes,
  structured custody, assay/result lineage, and native booleans.
- Added provisioned login-to-tenant authority, forced row security,
  tenant-preserving foreign keys, append-only evidence, governed specimen
  transitions, and fenced outbox claims.
- Added live PostgreSQL clean-install and upgrade rehearsals, catalog proofs,
  tenant and immutability tests, schema-fingerprint convergence, and retained
  execution receipts.
- Bound the checked execution receipt to the exact authored source digest and
  file count while keeping generated packaging trees outside that stable scope.
- Added a primary-source and field-evidence register for database decisions.

## 0.1.0 — 2026-07-28

- Added the vendor-neutral laboratory domain and exact replay contracts.
- Added tenant-scoped custody, instrument ingress, migration, operations, and
  evidence examples.
- Added executable vendor-shaped Sapio, Benchling, and LabKey boundaries.
- Added nine registered samples, three schemas, public-source provenance,
  durable SQL companions, and a one-command offline validation surface.
- Recorded LabKey stable PyPI `4.2.0` separately from upstream `develop`
  declaration `4.3.0`.

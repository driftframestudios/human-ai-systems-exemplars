# Architecture and decision rights

## System boundary

The canonical laboratory domain owns specimen identity, lifecycle state,
custody, assay-result provenance, review meaning, and release evidence. Vendor
adapters translate that domain into platform-specific record graphs, events,
bulk jobs, and migration APIs.

The adapter boundary keeps vendor behavior visible:

1. A caller presents a tenant-bound request identity and source revision.
2. The producing boundary emits canonical bytes and a deterministic fingerprint;
   the receiving boundary records which runtime derived or independently verified
   that coordinate.
3. The adapter reserves the request identity before an external mutation.
4. A platform mutation runs through a bounded gateway.
5. Read-back reconciliation completes the receipt.
6. An unknown external outcome enters an explicit ambiguity state.
7. A retry begins only after reconciliation establishes absence or convergence.

## Primary consistency boundaries

- Specimen state, event, and version advance together.
- Custody state, custody event, and outbox message commit together.
- Instrument raw bytes, checksum, parsed observation, and disposition remain
  linked by one receipt.
- Durable webhook inbox state and pending processing work commit before an
  acknowledgement.
- Migration checkpoints advance only to the last fully represented source
  record.
- Cutover opens only after count, identity, checksum, exception, restore, and
  accountable approval gates pass.
- Internal UUIDs remain distinct from tenant/source-scoped external identities.
- Recorded instants use native timezone-aware storage; civil dates and local
  schedules retain their separate meanings.
- Exact scientific values bind assay revision, finite decimal precision, raw
  and canonical UCUM units, qualifier, detection limits, and conversion rule.
- Workload login identity resolves to one provisioned tenant grant. Row policy
  authority therefore follows the database identity boundary; callers submit
  requests within that verified grant.
- Privileged database routines belong to a closed identity and fixed-path
  allowlist. Their release-attested bodies use explicit schema identities,
  and workload proofs place same-named relations in the temporary schema before
  exercising tenant resolution and governed writes.
- Database-native digests derive from database-owned bytes. Cross-runtime JCS
  documents and approval signatures advance through a separate canonical-byte,
  key, algorithm, policy, and target-object qualification receipt.
- Applied Flyway migration bytes remain immutable. Forward revisions carry new
  determinations, and clean plus supported upgrade paths converge to one
  canonical semantic fingerprint. A separate migration-evidence fingerprint
  preserves validation, cutover, and contract controls while Flyway maintains
  operational version history.

## Decision rights

- Laboratory and scientific owners define lifecycle and signature meaning.
- Quality and Regulatory determine applicable controls and validation posture.
- Security and Privacy approve identities, secrets, logging, retention, and
  data movement.
- Platform Engineering owns runtime boundaries, resilience, and observability.
- Operations owns recovery rehearsal, escalation, and service acceptance.
- Product and executive evaluators judge material effect, cost, and adoption
  risk using bounded evidence rather than implementation volume.

## Failure posture

The reference favors explicit states over silent convergence. Duplicate
identity, stale revision, conflicting replay, unsupported unit, invalid
signature, unknown external outcome, schema drift, checksum mismatch, and
exhausted delivery each leave a named recovery route and an auditable receipt.

## Database change topology

Cluster roles are provisioned separately from application schemas. Flyway
Community 13.0.0 applies eight canonical migrations in version order under
bounded timeouts, PostgreSQL serialization, transactional execution, checksum
validation, and forward-fix history. A separate SHA-256 release attestation
binds the exact SQL, baseline, and fixture artifacts without extending Flyway's
operational schema history.

The supported v0.1 path begins with a catalog attestation against an already
populated legacy environment. A reconstructed legacy fixture supplies a
disposable test baseline and carries a distinct receipt classification.
The adoption path establishes stable identity maps, moves deterministic
cohorts, routes ambiguous global evidence to accountable scope resolution, and
builds source-to-target semantic manifests. Backfill, validation, and cutover
phases 002–004 share one `REPEATABLE READ` transaction group and source lock;
their evidence and cutover become visible as one atomic boundary.

The final contract phase is a separately targeted Flyway migration. The
immutable V006 cutover receipt remains the historical predecessor; V005 adds a
unique successor attestation that binds the effective V008 head, canonical
schema fingerprint, and current migration-evidence fingerprint. Contract review
is recorded after that successor exists. Its receipt-bound
authorization requires at least one completed migration batch, successful
source-row count, target-projection count, source-row manifest, restore-row
manifest, and exception-closure reconciliation; restore/archive equivalence;
and current acceptance across Scientific, Quality, Regulatory, Security, and
Operations. A disposable contract fixture exercises that guard. An adopting
organization binds the same contract to its accountable reviewers, evidence
bundle, schema head, archive, and restore proof.

Flyway authenticates as an ephemeral, bounded LOGIN role. The role has
`NOINHERIT`, no superuser, database-creation, role-creation, replication, or
row-security-bypass attributes, and direct `CONNECT` only on each rehearsal
target. PostgreSQL membership grants `SET TRUE`, `INHERIT FALSE`, and `ADMIN
FALSE` to the stable `NOLOGIN` owner. An `afterConnect` callback changes to that
owner and verifies the complete boundary on every Flyway connection. A
database-scoped role default establishes the same owner before Flyway creates
or locks schema history through an additional connection. The
cluster administrator is reserved for database and role provisioning. Forced
row security remains enabled for every laboratory relation. A policy granted
only to the owner admits migration data movement when a fixed-path catalog
predicate proves the exact ephemeral LOGIN attributes, sole owner membership,
database-scoped role default, and direct `CONNECT` ACL. Returning to the LOGIN
identity removes laboratory schema visibility; tenant runtime identities remain
governed by their tenant policy.

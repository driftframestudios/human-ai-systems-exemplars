# Database engineering evidence basis

The refactor applies current primary documentation together with field reports
that expose operational failure modes.

## Primary sources

- [PostgreSQL date and time types](https://www.postgresql.org/docs/current/datatype-datetime.html)
  establish the distinction between instants, civil timestamps, and timezone
  conversion behavior. [Date/time functions](https://www.postgresql.org/docs/current/functions-datetime.html)
  define finite-value inspection and support the explicit boundary around
  PostgreSQL infinity sentinels.
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html),
  [row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html),
  [privileges](https://www.postgresql.org/docs/current/ddl-priv.html),
  [JSON types](https://www.postgresql.org/docs/current/datatype-json.html), and
  [numeric types](https://www.postgresql.org/docs/current/datatype-numeric.html)
  ground native constraint, tenancy, structured-document, and exact-number
  choices.
- [PostgreSQL function security](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
  grounds fixed `search_path` handling for privileged routines and the placement
  of caller-writable schemas outside trusted name resolution.
- [RFC 8785: JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
  defines a cross-runtime canonical JSON representation and its required sorting
  and primitive serialization behavior. It supplies the candidate profile and
  golden-vector scope for document-to-byte-to-digest qualification.
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
  and [explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)
  ground the `REPEATABLE READ` source snapshot, relation-lock duration, and
  session-scoped migration serialization boundaries.
- [PostgreSQL advisory lock functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS)
  distinguish session-level ownership from transaction-level ownership and
  support one lock spanning the complete authenticated plan.
- [PostgreSQL `ALTER TABLE`](https://www.postgresql.org/docs/current/sql-altertable.html)
  documents deferred constraint validation and lock behavior used by the
  expand/validate sequence.
- [Flyway versioned migrations](https://documentation.red-gate.com/flyway/flyway-concepts/migrations/versioned-migrations),
  [schema history](https://documentation.red-gate.com/flyway/flyway-concepts/migrations/flyway-schema-history-table),
  [validation](https://documentation.red-gate.com/flyway/reference/commands/validate),
  and [transaction handling](https://documentation.red-gate.com/fd/migration-transaction-handling-273973399.html)
  establish ordered, checksummed, serialized, transactional, apply-once history
  and forward correction.
- [Flyway baselines](https://documentation.red-gate.com/flyway/flyway-concepts/baselines)
  support explicit adoption of an established database. The companion
  `baselineOnMigrate` guidance explains why keeping automatic baseline disabled
  preserves wrong-target protection.
- [Flyway callbacks](https://documentation.red-gate.com/flyway/flyway-concepts/callbacks)
  and the [V13 transition guidance](https://documentation.red-gate.com/flyway/flyway-blog/looking-forward-to-flyway-v13)
  establish `afterConnect.sql` as the supported connection-initialization
  boundary after removal of `initSql`.
- [PostgreSQL 16 role grants](https://www.postgresql.org/docs/16/sql-grant.html)
  and [`SET ROLE`](https://www.postgresql.org/docs/16/sql-set-role.html)
  distinguish `SET`, `INHERIT`, and `ADMIN` membership options and support an
  explicit bounded-login to stable-owner transition.
- [FDA Data Integrity and Compliance With Drug CGMP](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/data-integrity-and-compliance-drug-cgmp-questions-and-answers)
  informs attributable, contemporaneous, complete, consistent, accurate, and
  life-cycle-controlled evidence.
- [FDA laboratory controls questions and answers](https://www.fda.gov/drugs/guidances-drugs/questions-and-answers-current-good-manufacturing-practice-requirements-laboratory-controls)
  informs retention and review of complete laboratory data, including suspect
  or failing results.

## Field evidence

- [Strong Migrations](https://github.com/ankane/strong_migrations) captures
  recurring production patterns for additive change, concurrent indexing,
  deferred validation, batching, throttling, and compatibility windows.
- [Npgsql EF Core pull request 1214](https://github.com/npgsql/efcore.pg/pull/1214)
  shows a real tooling correction for PostgreSQL concurrent index creation and
  transaction suppression.
- [Prefect issue 18263](https://github.com/PrefectHQ/prefect/issues/18263)
  records the practical consequences of a large concurrent index build,
  timeout, and migration-history reconciliation.
- [Database Administrators discussion of timestamp without time zone](https://dba.stackexchange.com/questions/59006/what-is-a-valid-use-case-for-using-timestamp-without-time-zone)
  reinforces a useful distinction: civil wall-clock values can be legitimate,
  while observed instants need timezone-aware semantics.

These sources guide the reference design. Adopting teams still measure their
own table sizes, transaction patterns, query plans, replication lag, recovery
objectives, scientific tolerances, and accountable acceptance criteria.

## Evidence applied in this tranche

The repository turns those sources into eight canonical migrations and one
attested v0.1 upgrade route. The hosted proof covers PostgreSQL 16 and 18. A
pinned Flyway Community image owns checksums, locking, transactions, validation,
and operational history; a separate SHA-256 release attestation binds the exact
SQL and setup artifacts. Catalog attestation precedes each explicit established
database baseline. Flyway groups v0.1 backfill, validation, and cutover into one
PostgreSQL transaction that produces source and target semantic manifests.

Every Flyway connection runs a release-attested `afterConnect` callback. It
proves the session login is non-administrative and `NOINHERIT`, proves its sole
direct target-database privilege is `CONNECT`, and changes explicitly to the
`NOLOGIN` schema owner. A database-scoped login default applies the owner role
to every connection, including Flyway's independent history connection; the
callback verifies that catalog setting. The hosted PostgreSQL 16 and 18 receipts capture that
role and membership evidence while the container environment remains limited
to Flyway URL, login, and password variables. V008 preserves forced row
security and supplies a policy only for the reviewed owner session. Its catalog
predicate checks the exact ephemeral login, one owner-membership edge, the
database-scoped role default, and direct `CONNECT` authority. The runtime proof
returns to the LOGIN identity and demonstrates that schema and row access begin
only after the explicit owner transition.

The proof compares canonical semantic fingerprints independently from
migration-evidence fingerprints, exercises exact numeric and conversion
boundaries at runtime, and evaluates the receipt-bound contract guard. The
disposable contract fixture runs after the V005 successor-head attestation and
supplies a completed batch, five reconciliation
criteria, archive/restore equivalence, and five-domain acceptance. These
synthetic receipts establish executable contract behavior; accountable
organization-owned execution supplies adoption authority.

The security proof also binds every `SECURITY DEFINER` identity to one reviewed
fixed-path profile and exercises malicious same-named temporary relations from a
workload login. Digest evidence distinguishes database-derived bytes from
application-produced JCS claims. The latter remains a visible promotion boundary
until canonical bytes and approval signatures pass shared-vector and configured
runtime verification.

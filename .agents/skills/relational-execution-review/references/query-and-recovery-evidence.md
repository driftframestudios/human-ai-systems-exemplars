# Query and recovery evidence

Load this reference for an actual relational execution observation. The engine
manual for the selected major version remains authoritative; examples below
frame PostgreSQL review and require adaptation for other engines.

## Select a discriminating observation

| Question | Smallest useful observation | Separate adjacent claim |
| --- | --- | --- |
| Does the relation enforce its declared invariant? | Ordinary-role counterexample after the actual migration | Application error presentation |
| Does the ERD match executed source? | Named keys/FKs/nullability from the migrated catalog against the diagram | Domain completeness and scientific meaning |
| Does the query repeat avoidable work? | Equal-result baseline/candidate plans with rows, loops, buffers, and distribution | All-workload latency or capacity |
| Does an object retain owned meaning? | Nested caller/returned-reference mutation followed by read/replay | Cross-process persistence |
| Does restart preserve state? | Actual component stop/start plus reconstructed read and exact retry | Restore, failover, and power-loss durability |
| Does migration history govern upgrade? | Runner clean install, predecessor upgrade, status/validation and replay | Direct-SQL-only application |

## Query protocol

1. Resolve the exact statement and parameter types issued by the application,
   including views/functions, role, RLS, tenant predicates, and session settings.
2. Build a synthetic fixture that distinguishes mechanisms: small/large tenants,
   empty and dense relationships, skew, retained terminal rows, and selective or
   broad parameters. Name each dimension; a single convenient size is a sample.
3. Apply source-owned migrations, establish current statistics, and record the
   controlled preparation. Keep cold/warm and maintenance state explicit.
4. Compare results independently, including ordering only where the contract
   promises it. Then observe `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` when the
   authorized statement is safe to execute. `ANALYZE` executes the statement;
   rollback alone may leave sequence or external effects outside its scope.
5. Read node estimates against actual rows and repetitions. PostgreSQL reports
   per-loop averages for actual rows and node times; multiplication answers total
   repeated work. Buffer counts have their own cumulative meaning. Preserve the
   plan tree when interpreting inclusive parent metrics.
6. Compare the implicated mechanism alongside client fetch/construction/encoding.
   Report repeated work, allocation, transfer, index size/write overhead, and
   retained uncertainty. Avoid a universal latency threshold from one host run.

PostgreSQL's [EXPLAIN guide](https://www.postgresql.org/docs/17/using-explain.html)
describes estimates, loop interpretation, buffers, and execution overhead. Its
[partial-index guide](https://www.postgresql.org/docs/17/indexes-partial.html)
requires predicate compatibility; the exact statement and parameters matter.
Its [multicolumn-index guide](https://www.postgresql.org/docs/18/indexes-multicolumn.html)
also makes version-dependent access methods visible. Confirm the selected major
instead of turning a leading-column heuristic into an absolute rule.

## Relationship and migration protocol

Name PK/UNIQUE/FK columns as ordered groups, the tenant identity they carry,
optional cardinalities, referential actions, and relevant checks. Inspect actual
catalog definitions and validating/deferrable state. An ERD edge can conceal a
missing tenant component or a nonunique referenced projection. Preserve units,
scale, offsets, null meaning, schema version, and payload bounds in round trips.
The [PostgreSQL17 constraints manual](https://www.postgresql.org/docs/17/ddl-constraints.html)
anchors relational rules; application code supplies humane boundary errors.

For a correction, bind observed definition → desired invariant → forward
migration → preservation rule → confirming tests. Use one released migration
owner. Direct SQL probes can isolate a defect; runner acceptance also observes
ordered history, checksums, coordination and replay. Lock budgets and partial
failure cleanup belong to the actual deployment route. Compare index creation
and concurrent-index tradeoffs against that route's transaction model.

## Restart and crash protocol

Record the exact interrupted component, initial data coordinate, process
identity, driver/application instances, migration path and engine version. Seed
committed laboratory state plus an independently visible uncommitted operation.
Capture complete semantic invariants and counts, rather than just row existence.

For PostgreSQL, a fast shutdown terminates sessions while performing a clean
shutdown. Immediate shutdown requires crash recovery at the next start. Use the
selected version's [shutdown contract](https://www.postgresql.org/docs/17/server-shutdown.html)
to name which event occurred. Confirm a new server process/start observation;
closing and reopening a client connection alone establishes a different event.

After recovery, reconstruct the application adapter, obtain a fresh tenant
assertion where required, and inspect committed state, interrupted-state absence,
replay identity, event/ledger/outbox alignment, and a corrected retry. An ordinary
read succeeds before a performance or availability claim is considered.

Capture relevant [WAL/durability settings](https://www.postgresql.org/docs/17/runtime-config-wal.html),
including `fsync`, `synchronous_commit`, and `full_page_writes`, when interpreting
acknowledged-commit survival. State whether storage/power failure, backup restore,
PITR, replication, or external side effects entered the experiment. Each remains
a separate failure model when its mechanism was outside the observed event.

## Ownership and handback

The rehearsal creates its own private data/socket/log paths, generated synthetic
credentials, and bounded child processes. Teardown validates that ownership and
waits for stop before removing storage. On cleanup failure, retain the private
coordinate and recovery action rather than claiming successful removal.

Public-safe return: reviewed source, engine/driver and migration route, fixture
dimensions, normalized invariant results, cost observations, tested failure event,
coverage boundary, and next owner. Raw plans and logs can carry literal values,
object names, topology, and operational timing; keep their full fidelity with the
authorized observation owner. A summary should still let another collaborator
reproduce the synthetic experiment from source.

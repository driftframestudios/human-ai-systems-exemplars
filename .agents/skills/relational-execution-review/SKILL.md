---
name: relational-execution-review
description: Reviews relational integrity, query execution cost, object ownership, and recovery against exact source and engine observations. Applies when SQL, an ERD, persistence adapters, ordinary database roles, migration evidence, or restart claims should change a bounded implementation decision.
---

# Relational execution review

## Contract

- **What:** A source-grounded review that binds domain meaning and relationships to executable constraints, actual query behavior, application ownership, and the recovery event observed.
- **When:** A database or data-layer change crosses declarations, SQL, objects, roles, migrations, or retained state, and a plausible implementation needs discriminating evidence.
- **Boundaries:** The current task governs observation and implementation. Repository source owns behavior; an exact engine, migrated schema, role, fixture, and invocation own runtime evidence. A declared diagram, passing schema validator, or process-local model establishes its own scope. Production, scientific, privacy, release, and operational acceptance retain their named owners.
- **Result:** Verified localized findings or a bounded clean review, a comparison of fitting repair mechanisms, executable acceptance evidence, and a clear receiving Issue or PR with remaining evidence owners.

## Fit and inputs

**Smallest useful dose:** One consequential invariant, its complete source path,
one baseline observation, one counterexample, and a selected repair or explicit
evidence gap. A cross-repository review adds an owner map before expanding tests.

**Poor fit:** A prose-only schema description with no execution claim may need
`schema-contract-authoring`. A standalone object-alias concern may finish with
`cost-and-ownership-analysis`. Live incident response follows the environment's
operational runbook and current authority.

Minimum inputs are the reviewed revision, intended invariant, behavior owner,
existing Issue/PR, and the available observation route. For runtime work, also
resolve engine and driver versions, migration mechanism, schema history, role,
tenant context, fixture ownership, and cleanup boundary. Missing coordinates
become explicit evidence gaps; source review continues where it remains useful.

The default receiver is the existing PR or Issue. Keep raw plans, private
identifiers, connection strings, verifier material, and logs with their
access-controlled owner. Return synthetic cardinalities, normalized results,
sanitized command shapes, exact source coordinates, and technical limitations.

## Rules

### Rule: Each layer keeps its evidence owner

Map domain contract → declared relationship → migration → catalog → query →
application object → serialized result. Label a diagram as declared,
source-derived, or catalog-observed. A missing SQL file in a specification or
evidence repository can be an intentional handoff; follow its runtime receiver.
Compare current source with live work before treating an open Issue as unfinished
implementation. Preserve unrelated checkouts and form isolated repair branches.

### Rule: Relationship meaning survives every writer

Review identity and tenant scope, key order and arity, uniqueness, nullability,
foreign-key actions, precision/scale, finite temporal meaning, document versions,
and absence states. Match API/domain representations to database constraints and
retrieved values. Ordinary direct-SQL writers provide a useful invariant probe.
Keep engine-specific type equivalence and catalog facts tied to that engine.

### Rule: The runtime role is part of the implementation

Exercise the actual ordinary-role path with its signed or authenticated context.
Trace grants, ownership, row policies, privileged routines, transaction state,
and relation resolution. Administrator fixture setup supplies preparation;
ordinary-role execution supplies application evidence. Fixed service-owned SQL
resolves its intended relations explicitly. Connection reuse includes session
state, temporary objects, error cleanup, and tenant-context reset.

### Rule: One operation binds meaning, effects, and publication

Name every meaning-bearing request field, scoped replay identity, accepted
prestate, concurrency guard, aligned domain/event/ledger/outbox effects, commit
point, and returned outcome. Exact retry resolves to its recorded meaning;
changed meaning has an explicit reconciliation result. Distinguish preparation
failure from response loss after commit. Force overlap when concurrency is the
claim and seed populated prior state before testing recovery.

### Rule: Plans observe a workload, not a universal speed property

Bind an actual plan to exact SQL/parameters, schema/indexes, role/RLS, engine,
statistics, cardinality, skew, state mix, and relevant settings. Compare result
semantics before comparing work. Inspect estimated versus actual rows, loops,
filtered rows, buffers, heap fetches, sorts/spills, and total work. Parent metrics
can include children; use engine-defined aggregation instead of double counting.
An index-only node still requires its observed heap-fetch interpretation.

Compare three to five plausible mechanisms when the design choice is material:
predicate/index changes, grouped computation, bounded retrieval, or maintained
state may trade different read, write, storage, consistency, and recovery costs.
Choose the smallest mechanism that satisfies the actual workload and invariant.
Planner choices and elapsed times remain observations rather than brittle gates.

### Rule: Query cost continues through application ownership

Include round trips, fetch strategy, DTO/domain construction, freezing, copying,
sorting, encoding, and output bytes. State variables and caps. Separate retained
objects, allocation volume, and peak live memory; separate cold import/setup
from warmed operation when that distinction changes the decision. Immutable
attributes require immutable owned contents when callers can retain aliases.
An improved database plan can leave O(returned rows) client space and transfer.

### Rule: Recovery names the interrupted component and retained invariant

Application reconstruction, graceful database restart, crash recovery, ambiguous
commit acknowledgement, backup restore, point-in-time recovery, and replica
failover receive separate observations. Bind durability settings and persisted
state to the event tested. Prove retained committed effects, absence of the
interrupted uncommitted effect, and a useful retry. Copy equality establishes
preservation; lifecycle/relationship coherence establishes the meaning preserved.

### Rule: Experiments own their operational footprint

Use invocation-owned disposable resources for destructive probes, with bounded
startup/stop, narrow endpoints, private generated credentials, and explicit
cleanup. Before stopping a process, verify its owned data directory and lifetime.
Existing retained clusters remain under their existing owner. A failed teardown
returns an exact private recovery route; preserve evidence needed to identify it.
An alternate engine can establish a mechanism while the supported target keeps
its separate acceptance observation.

### Rule: Migration evidence follows historical ownership

Preserve applied migrations and correct forward. Exercise clean install and
predecessor upgrade when both are supported; include existing populated rows,
constraint/grant state, contention or time budget, and recovery after failure.
Directly executing SQL establishes that execution path. Migration-runner history,
checksum, locking, and replay claims require that runner's own observation.

## Operating sequence

1. **Reconstruct:** Confirm source, live work, nearest README, existing evidence,
   role boundaries, and the smallest runnable owner in each participating repo.
2. **Map:** Trace the selected invariant across relationships, SQL, objects,
   effects, and its receiving artifact. Record adjacent evidence owners.
3. **Probe:** Run the baseline plus a counterexample that could falsify the
   claimed invariant. Select ordinary-role, forced-overlap, scale, or restart
   evidence according to the mechanism rather than a fixed test quota.
4. **Converge:** Compare fitting remedies, including whole-path cost and migration
   implications. Open or refine one bounded Issue before implementing its slice.
5. **Repair:** Reuse existing semantic owners, preserve accepted history, and
   carry tests at the actual failing boundary into a focused PR.
6. **Challenge:** Have an independent reviewer examine mechanism, role, object
   ownership, assertion strength, and evidence reach. Resolve material findings
   and rerun the affected observations.
7. **Return:** State change, source, normalized result, what it establishes,
   remaining owner, and exact continuation. Release the review once its bounded
   acceptance is met; broader operational ambitions retain their own Issues.

## Conditional context

Load [query and recovery evidence](references/query-and-recovery-evidence.md)
when executing or interpreting plan, migration, restart, or crash observations.

Compose with `cost-and-ownership-analysis` for complete function/allocation cost,
`stateful-artifact-behavior-contracts` for stored output, and
`source-authority-mapping` for cross-repository lineage. The gist-registry skills
`transaction-boundary-evidence-mapping` and `architecture-convergence-vantages`
can supply operation/publication and mechanism-selection detail when available;
their source and implementation remain in gist-registry.

## Scenarios

### Scenario: The query becomes cheaper while the response remains large

- Given a tenant summary repeats an outbox scan for every specimen
- When a matching partial index reduces observed scan work with equal results
- Then the review accepts that bounded query improvement
- And records full-result materialization with its existing bounded-retrieval
  owner, carrying measured rows/bytes rather than implying bounded response size.

### Scenario: The available database major differs from the supported target

- Given an owned local cluster can reproduce a role/constraint failure
- When the supported target is unavailable in the current environment
- Then the review records the observed engine and mechanism
- And retains target-version and migration-runner acceptance as distinct work,
  with a reproducible test and its next configured receiver.

These scenarios describe intended behavior. Executable tests and natural use
supply their own evidence.

## Maturity, recovery, and completion

This is a provisional instruction-only contract formed under HASE Issue #486.
The LIMS/ELN data/object review supplies first-use evidence; broader effectiveness
and public packaging retain separate standing. Registry semantic context includes
`@driftframe/probes/sql-orm`, data-contract-integrity-and-primitive-selection,
AI-as-Bounded-Caller, and leakage-modeling. The exact resolver keeps private
source coordinates; versioned manuals and executable source own technical facts.

Unavailable execution yields a source-grounded finding with an exact next
observation. A changed base, schema, engine, workload, role, or ownership boundary
reopens the relevant step. Complete when the scoped invariants have fitting
evidence or an explicit unresolved receiver, independently reviewed repairs are
available, and the user can continue from one source coordinate. Fold or narrow
this skill if later natural use finds that an existing owner carries the same
receiving job with less routing.

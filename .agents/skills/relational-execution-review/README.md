# Relational execution review

Connect a database rule to the schema, ordinary application role, actual query
plan, application objects, and recovery event that together establish its real
behavior.

## Start here

- Read [`SKILL.md`](SKILL.md) for the authoritative integrity, execution,
  ownership, migration, recovery, and evidence contract.
- Return to the [repository skill catalog](../README.md) when schema authoring,
  source authority, or stored-artifact behavior owns the primary result.

## What this skill returns

- one consequential invariant traced across its complete source path;
- a baseline and counterexample capable of falsifying the claim;
- engine, driver, schema, migration, role, tenant, fixture, and cleanup scope;
- fitting repair mechanisms compared across read, write, storage, consistency,
  migration, and recovery cost;
- normalized evidence and a receiving Issue or pull request; and
- an exact observation owner for any remaining production or target-version claim.

## Concrete example

**Situation:** A tenant summary repeatedly scans pending outbox rows and becomes
expensive as completed history grows.

**Use:** Bind the exact SQL, parameters, ordinary role, row policies, indexes,
statistics, cardinality, and state mix. Confirm equal result semantics, compare
the observed plan before and after a fitting partial index, and carry returned
row count and response construction through the application boundary.

**Observable return:** The review records reduced scan work for the stated
engine and fixture, preserves full-result materialization as a separate bounded
cost, and supplies a focused repair with reproducible ordinary-role evidence.

## Working path

1. Reconstruct source, live work, role boundaries, and runnable owners.
2. Map the invariant through relationships, SQL, objects, effects, and output.
3. Run the baseline and one discriminating counterexample.
4. Compare plausible remedies and whole-path costs.
5. Repair the smallest owner while preserving accepted migration history.
6. Invite independent review of mechanism, role, ownership, and evidence reach.
7. Return the normalized result, limits, next receiver, and continuation.

## Execution reference

[`references/query-and-recovery-evidence.md`](references/query-and-recovery-evidence.md)
provides protocols for query plans, relationships and migrations, restart and
crash observations, operational footprint, and handback.

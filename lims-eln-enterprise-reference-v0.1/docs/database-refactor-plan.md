# Database primitive and migration refactor plan

## Migration-system scope correction

Flyway Community 13.0.0 now owns migration discovery, ordering, checksums,
PostgreSQL deployment serialization, transaction application, validation, and
operational schema history. The repository owns the opportunity-specific work:
scientific data contracts, baseline eligibility, deterministic transformation,
semantic reconciliation, tenant and security boundaries, restore evidence, and
accountable release receipts. A SHA-256 release attestation supplements
Flyway's checksums without implementing a second migration engine.

## Probability frame

The probability estimates answer one defined question:

> What is the probability that one implementation tranche reaches a
> promotion-ready database-definition state in which every critical and high
> primitive finding has an accepted disposition, clean installation and every
> supported upgrade path converge to one canonical semantic fingerprint,
> migration evidence retains its independently computed fingerprint,
> representative migration and restore rehearsals pass, and accountable
> reviewers bind their decisions to the same evidence bundle?

These bounded engineering forecasts derive from the present code audit,
dependency count, lock risk, data-volume uncertainty, and the amount of
executable evidence each plan would produce. Each interstitial checkpoint
updates the estimate from observed receipts.

| Plan | Working shape | Probability | Principal benefit | Material gap |
|---|---|---:|---|---|
| A. Ledger and guidance | Publish the complete finding ledger and type policy while leaving the bootstrap DDL in place. | 0.46 | Rapid shared vocabulary and review surface. | Runtime invariants and upgrade behavior remain illustrative. |
| B. Additive expand-contract | Introduce immutable, ordered migrations; native types; compatibility views; resumable backfill; reconciliation; and representative restore evidence. | 0.84 | Highest evidence yield for controlled change and rollback-aware delivery. | Requires disciplined compatibility windows and operational rehearsal. |
| C. Selective domain rebuild | Rebuild scientifically consequential aggregates behind stable ports, then migrate bounded cohorts. | 0.69 | Repairs structural drift where column-by-column conversion would preserve weak meaning. | Dual ownership and reconciliation increase temporarily. |
| D. Shadow database comparison | Replicate bounded traffic into the target model and compare semantic outputs before cutover. | 0.74 | Strong evidence for high-volume or high-consequence paths. | CDC operations, privacy review, and comparison triage add cost. |
| E. Greenfield replacement | Load a newly designed database, freeze source writes briefly, reconcile, and redirect all traffic. | 0.57 | Cleanest final model and shortest compatibility tail. | Cutover concentration raises recovery and organizational coordination risk. |

## Recommended synthesis

Plan B supplies the control spine. Plan C applies only where the ledger marks a
semantic discontinuity, such as approval evidence, measured quantities, or
trace relationships. Plan D becomes a promotion condition for pathways whose
volume or scientific consequence makes sampled rehearsal insufficient. Plan E
remains an exit route for a small, fully enumerable source population.

The resulting chain of action is:

1. Inventory every SQL, Python, JSON, and wire primitive and assign a stable
   finding identifier, owner, material effect, target contract, and receipt.
2. Freeze the semantic data contract: instants, civil time, identity, exact
   quantities, units, digests, structured documents, tenant scope, and evidence
   lineage.
3. Configure pinned Flyway histories, validation, deployment serialization,
   explicit supported baselines, an independently computed canonical semantic
   fingerprint, and a distinct migration-evidence fingerprint.
4. Apply an additive expand migration with bounded lock and statement budgets.
5. Attest an authentic, pre-populated source catalog. Backfill deterministic
   cohorts, produce source and target-projection semantic manifests, and
   reconcile counts, identities, relationships, exact values, units, artifacts,
   and exception dispositions. For v0.1, phases 002–004 form one
   `REPEATABLE READ` transaction group under a stable source lock.
6. Run old and new application contracts through the declared compatibility
   window. Add shadow comparison for consequential paths.
7. Cut reads and then writes to the target contract after evidence-backed
   approval. Preserve a tested roll-forward and restore route.
8. Observe the compatibility window, then execute the separately approved
   contract migration that removes superseded structures.
9. Bind the release manifest, completed migration batch, successful source-row
   count, target-projection count, source-row manifest, restore-row manifest,
   and exception-closure reconciliations, restore/archive equivalence, and
   Scientific, Quality, Regulatory, Security, and Operations acceptance into
   one immutable evidence bundle.

## Reevaluation interstitials

| Interstitial | Evidence read | Decision |
|---|---|---|
| I1 · Ledger closure | Critical/high coverage, disputed meanings, affected populations | Confirm the target contract and revise plan probabilities. |
| I2 · Contract freeze | Type mappings, compatibility matrix, retention and classification | Authorize migration construction or return semantic gaps to domain owners. |
| I3 · First expand rehearsal | Lock duration, query plans, application compatibility, canonical and migration-evidence fingerprints | Tune batches, indexes, and deployment budgets. |
| I4 · Upgrade and restore rehearsal | Baseline attestation, source/target manifests, transaction-group atomicity, reconciliation, exact resume, backup identity, measured RTO/RPO | Confirm recovery posture and the cutover evidence threshold. |
| I5 · Contract boundary | Compatibility telemetry, exception closure, rollback horizon | Authorize superseded-column removal as a distinct change. |
| I6 · Promotion | Exact digests, receipts, limitations, Scientific/Quality/Regulatory/Operations decisions | Promote the evidence bundle or schedule the next bounded tranche. |

## Promotion gates

- The machine-readable 53-finding ledger represents every primitive and records
  an accepted disposition for each critical and high finding.
- Native PostgreSQL types preserve semantic distinctions: recorded instants,
  civil dates, local schedules, internal identities, exact quantities, units,
  binary digests, booleans, and structured documents.
- Migration scripts are Flyway-ordered, checksummed, forward-fix oriented, and
  serialized through Flyway's PostgreSQL locking. Release provenance binds
  their SHA-256 values independently.
- Eight canonical migrations execute on PostgreSQL 16 and 18. Clean install and
  every attested supported baseline converge to one canonical semantic
  fingerprint while their migration-evidence fingerprints retain path lineage.
- Backfills are deterministic, observable, and reconciled. The v0.1 grouped
  path resumes at its complete atomic transaction boundary.
- The pre-populated adoption path and disposable reconstructed baseline retain
  distinct execution-history classifications.
- Exact numeric runtime proof exercises accepted and out-of-contract values at
  the released storage boundary.
- Tenant-preserving foreign keys, forced row security, append-only evidence,
  least-privilege roles, and direct-DML tests establish the security boundary.
- Representative restore and point-in-time recovery receipts identify the same
  schema head and evidence bundle as promotion.
- Contract authorization binds a completed batch; successful source-row count,
  target-projection count, source-row manifest, restore-row manifest, and
  exception-closure reconciliation; archive/restore equivalence; and current
  five-domain acceptance.

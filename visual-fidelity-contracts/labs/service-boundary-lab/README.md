# Service Boundary Lab

This deterministic lab shows whether one synthetic task remains eligible as a
service starts work, resumes after interruption, recovers from failure, and
returns a result for human review. The deeper model distinguishes the authorized
view, repeat-safe command, transaction, durable receipt, bounded generated work,
human decision, and publication authority. The cards, table, event timeline,
and machine-readable view all derive from the same state.

Open [`index.html`](./index.html) through a local HTTP server to exercise the
lab. The static document also carries the core reading when JavaScript is
unavailable.

## What a visitor can inspect

| Scenario | Material distinction | Observable result |
| --- | --- | --- |
| Commit and replay | Candidate work versus a durable effect | One accepted revision and one receipt serve the original call and replay |
| Interrupt and resume | Candidate lifetime versus accepted state | The connection returns to its owner; the checkpoint can reopen an eligible candidate |
| Roll back safely | Transaction failure versus prior accepted work | The candidate rolls back while accepted revision 7 remains available |
| Run bounded caller | Generated output versus a human decision | Budget, source authority, partial standing, and human-held decision travel together |
| Test a late result | Completed work versus revision eligibility | A result for revision 7 stays outside accepted revision 8 |
| Apply a policy hold | Full projection versus role-bounded projection | Held fields leave the projection and the cache is invalidated |

## Source map

| Owner | Path | Job |
| --- | --- | --- |
| State and transition authority | [`service-boundary-model.js`](./service-boundary-model.js) | Validates bounded inputs, owns accepted state, applies transitions, and derives semantic rows |
| Browser controller | [`service-boundary-lab.js`](./service-boundary-lab.js) | Runs cancellable scenarios, renders safe text, maintains focusable controls, and releases listeners |
| Presentation | [`styles.css`](./styles.css) | Implements responsive, reduced-motion, print, and forced-colors behavior |
| Contracts | [`schemas/`](./schemas/) | Defines command, checkpoint, receipt, projection, issue, response, continuation, and bounded-call shapes |
| Examples | [`fixtures/`](./fixtures/) | Supplies accepted, held, and rejected responses plus current and stale-revision commands |
| Focused evidence | [`tests/visual-fidelity-contracts/`](../../../tests/visual-fidelity-contracts/) | Exercises state, schemas, recovery, idempotency, and browser behavior |

## Ownership model

The model keeps request, authorization, transaction, receipt, cache, bounded
call, disclosure, and decision state independent. Each dimension identifies a
release event. A successful transaction returns its connection, writes one
receipt, and creates an outbox record. A failed or interrupted candidate
releases the same resources while the prior accepted revision remains usable.

The bounded caller receives an explicit task, source authority, one through six
distinct allowlisted tools, projected input, step budget, checkpoint, stopping
event, named human receiver, and publication authority. Generated claims retain
an evidence standing. Human acceptance preserves partial or complete standing,
and the publication steward owns a separate approval event.

The model binds each idempotency key to an exact admitted request snapshot and
keeps a compact fingerprint for tracing. Replay eligibility compares the closed
request fields rather than treating the display fingerprint as an authority.
Cache identity includes actor, role, tenant, policy scope, policy revision, and
representation. Snapshot-bounded pagination requires unique record IDs and
cursor identities; declared v1/v2 reader adapters make concurrent inserts and
mixed-version reads exercisable. Each continuation carries its own snapshot
revision. Outbox failure and retry preserve the committed receipt, and pending
delivery settles before another durable effect can replace the active handoff
record.

Recovery state uses four independent channels: outbox delivery, request or
transaction work, bounded generated work, and late-result eligibility. Each
successful recovery clears its own channel and preserves the other active
routes. The compact primary issue is a derived reading aid; the machine view
retains every concurrently active route.

Authorization changes also govern generated work. A hold or denial cancels an
active bounded call, returns disclosure to its compact state, and keeps
publication behind a renewed allowed projection. The inspectable machine view
uses the same authorized projection: candidate data, receipt internals, outbox
identity, generated content, and detailed transition summaries stay with their
declared owners while access is held. Detailed accepted-record ownership and
next-action fields appear when the current grant matches the accepted source
and revision, or when its exact command produced the current committed receipt.
Admission rejects common secret-shaped values before those values can enter an
issue or transition log.

The document provides a useful static reading before enhancement. Once the
module initializes, it enables the controls, records the exact lab and model
versions with the browser-reported user-agent observation, and renders compact
or expanded disclosure from the same state. [`sandbox-specimen.html`](./sandbox-specimen.html)
demonstrates unique-origin isolation for an embedded synthetic receipt. The CSP
meta policy applies to this standalone specimen; deployment response headers
remain the receiving carrier's responsibility.

One controller owns each enhanced root. A repeated enhancement validates its
successor first, then releases the previous run and listeners. Page departure
and explicit teardown act through the current owner, leave controls inert, and
retain an inspectable rollback when interruption occurs before a checkpoint.

## Evidence boundary

The fixtures and tests establish the behavior of this deterministic browser
lab, including cross-engine transitions, release ownership, re-entry, static
fallback, 200% text, alternate media, and sandbox isolation. Production middleware,
identity policy, transaction isolation, database drivers, model quality, and
distributed delivery require observations in their receiving systems.
Framework-specific guidance records its target version and review date in the
accompanying probes. Those documentation receipts guide implementation; they
are separate from an installed framework-adapter runtime receipt.

## Public continuations

- [Client Middleware, BFFs & Service Contracts](https://kindlight.systems/visual-fidelity-contracts/visual-fidelity-practitioner-probes-layered-judgment-evidence/visual-fidelity-probes-client-middleware-bffs-service-contracts)
- [Back-End Runtime, Transactions & Framework Boundaries](https://kindlight.systems/visual-fidelity-contracts/visual-fidelity-practitioner-probes-layered-judgment-evidence/visual-fidelity-probes-back-end-runtime-transactions-framework-boundaries)
- [Visual Fidelity with AI](https://kindlight.systems/visual-fidelity-contracts/visual-fidelity-practitioner-probes-layered-judgment-evidence/visual-fidelity-with-ai-bounded-callers-disclosure-recovery-probes)

## Re-entry

Revisit this lab when a schema version, source-eligibility rule, resource owner,
browser baseline, framework target, or public continuation changes. Extend the
smallest fitting transition and pair it with a failure observation before
expanding the visual layer.

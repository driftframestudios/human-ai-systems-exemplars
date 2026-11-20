# Developer docs for the Native Investment Studio

The Studio is a browser-local planning engine with a DOM adapter. Reuse the
engine when you want a bounded plan, exact investment arithmetic, and reversible
commands. Start with the [Studio quickstart](../../README.md) for the example,
or use the [implementation reference](../../implementation-reference.md) for
the full catalog of commands, limits, and host obligations.

## The data contract

[config.mjs](../../config.mjs) declares the
`native-investment-plan` envelope, schema version `0.11.0`, model version
`0.1.0`, USD, and admission limits. [contract.mjs](../../contract.mjs) is the
executable schema. It admits records and references, upgrades supported older
versions, serializes canonical state, and derives the readings. The serialized
plan contains these authored fields. It can travel as a file independently of
the page that renders it.

| Layer | Authored shape | Invariant to preserve |
| --- | --- | --- |
| Identity and context | `kind`, `schemaVersion`, `modelVersion`, `planId`, `revision`, `currency`, `horizonWeeks`, `purpose` | The format version selects the admitted shape. The document revision travels with the plan. The active Studio tracks acceptance separately. |
| People and teams | Ordered `people` and `teams`, keyed by record IDs. A person has funded minutes, a nullable hourly rate in cents, role, lifecycle, and nullable availability intervals. A team has ordered `personIds`. | A person has one capacity account across teams. A null rate means unknown. Zero is a known rate. Labels can change while IDs continue to identify the record. |
| Work and schedule | Ordered `work` rows carry host, ordered participant IDs, duration, repeat count, funding, status and nullable timing. A sparse `sessionOverrides` array carries complete session settings for selected occurrences. `scoreSettings` holds the planning horizon, placements and other coordination records. | A scheduled occurrence is addressed by `workId` and zero-based `occurrenceIndex` within a captured plan. Its board position comes from the placement's period and subdivision. Removing an occurrence shifts later indices and their placements. |
| Responsibility and support | `abilities`, `practices`, `capabilityEvidence`, `contributions`, `connections`, `arrangements` | Keep definition IDs and versions, support bindings, and the actual receiver and decision owner explicit. Many views can refer to one work record without creating duplicate work. |
| Chapter settings | `changeSettings`, `assuranceSettings`, `investmentSettings` | Store selections and assumptions that carry across visits. The accepted plan and its model own staffing and work costs. Investment comparisons can vary assumptions independently of those costs. |

[Portable state and field details](../../implementation-reference.md#portable-state)

### Admission, identity, and money

- **Own the input before publishing.** Admission checks the selected version's
  record shape, bounded collections, safe integers, unique record IDs, and
  references resolved through ID indexes. File import checks the UTF-8 byte
  budget and integer token spelling. It first admits a legacy plan under its
  own version and byte ceiling, supplies migration defaults, then prepares the
  current version. The admitted projection owns a frozen state, derived
  results, and its serialized text. Preparation builds canonical JSON in its
  chosen field order and preserves meaningful collection order. For migrations,
  compare field meaning and exercise export → reimport as well as input shape.
  [Import and preparation source](../../contract.mjs) · [Contract tests](../../../../tests/native-investment-studio/contract.test.mjs)
- **Separate plan revision from acceptance.** The store compares the caller's
  captured projection by object identity before preparing an operation and
  again before publishing it. Direct JavaScript admission can invoke caller
  code through reflection, so even synchronous preparation can be reentrant.
  A material edit publishes a successor. Undo, Redo, replacement and import
  can bring back the same revision or bytes with a fresh accepted envelope.
  Valid no-op edits preserve identity. A baseline captures a separate
  comparison point, and the bounded history keeps accepted projections.
  [State source](../../state.mjs) · [State tests](../../../../tests/native-investment-studio/state.test.mjs)
- **Settle at the right unit.** Work records supply participant-minutes.
  The model multiplies minutes by integer cents per hour using `BigInt`,
  rounds half up to cents, then returns safe integers. It settles attributed
  and additional work once per person and funding pool, so splitting one
  person's work across more rows preserves the settled cost. Rounded ledger
  lines can differ from settled totals by cents. Reconciliation fields carry
  that difference. Known commitment adds funded staffing and additional work.
  Allocated work uses funded time, and the model reports an over-allocation
  obligation when it exceeds it. Paused work keeps its planned price and
  capacity pressure. A positive amount of time at an unknown rate leaves the
  full commitment unknown while the known subtotal remains available.
  [Calculation source](../../contract.mjs) · [Investment and capacity meaning](../../implementation-reference.md#investment-and-capacity-meaning)

### Commands, drafts, and asynchronous work

[commands.mjs](../../commands.mjs) gives each edit a finite meaning. For
example, `work.session.update` changes one occurrence using complete session
settings. Omitting `placement` retains the current slot, `null` clears it,
and an object sets the slot. Whole-plan preparation checks the successor's
references and amounts before acceptance. This is a useful boundary to
preserve when adding an adapter. The same kind of presence distinction has
a standalone executable example in Gist Registry.
[Typed absence and wire shape 0.1.0](https://github.com/driftframestudios/gist-registry/blob/b1b9542c3c72325ac0384c975b90534f03e614d3/snippets/typed-absence-and-wire-shape/0.1.0/README.md)

[editing.mjs](../../editing.mjs) keeps one active typed editor and bounded
saved drafts, with eight total slots by default. The form adapter keeps raw
input and binds the proposal to a target and the captured base. **Close**
parks changed input for recovery. **Apply** follows the command or direct
adapter's admission path. If a selected occurrence becomes stale, recovery
checks its target before reusing raw entries. Share the coordinator across
editors that borrow the same forms. That preserves typed text through chapter
changes and keeps a retired form from applying to a different session.
[Shared editing contract](../../implementation-reference.md#shared-editing-and-saved-drafts)

[exchange.mjs](../../exchange.mjs) pairs cancellation with freshness checks.
Starting a new read aborts the prior reader and retires its exchange epoch.
Even a reader that settles after abort has to match the current epoch, accepted
plan token and draft intent before it can publish a preview. Applying the
preview is a separate token-checked operation. This distinction lets a host
release I/O resources promptly and still give publication authority to the
current owner. [Exchange tests](../../../../tests/native-investment-studio/exchange.test.mjs)

### Reuse one calculation across views

Full preparation gives every chapter a coherent accepted plan and recomputes
whole-plan invariants. The cost is bounded work per meaningful command.
[Work session summaries](../../work-sessions.mjs) group default occurrences
by count and visit sparse overrides individually for pricing, avoiding a
fully expanded array for that calculation. A caller that needs repeated reads
of exact sessions can build one override lookup for the work record.
[The cadence index](../../cadence-occurrences.mjs) groups supplied occurrences
once per invocation by work and period so each board cell can select its
bucket. [The investment reader](../../investment-projection.mjs) retains one
context per exact accepted projection and computes deck analyses on demand.
Use reference identity for these caches. Undo and import can reuse an older
document revision while carrying a new acceptance. Measure preparation and
rendering separately before narrowing recomputation.

## Run a session command from Node

From the repository root, use the [repository Node runtime](../../../../NODE-RUNTIME.md).
This example exercises the same session and investment change as the browser
quickstart. It checks the preview, exact cents, sibling occurrence, and
rejection of a stale capture after Undo.

```sh
node --input-type=module <<'EOF_NODE'
import assert from 'node:assert/strict';
import { createStudio } from './collaboration/native-investment-studio/state.mjs';
import { createShowcasePlan } from './collaboration/native-investment-studio/presets.mjs';
import { copyWorkSession, resolveWorkSession } from './collaboration/native-investment-studio/work-sessions.mjs';

const studio = createStudio(createShowcasePlan({ pausedExample: true, peopleExamples: true }));
const before = studio.read();
const work = before.state.work.find(row => row.id === 'rehearsal');
const session = copyWorkSession(resolveWorkSession(work, 0));
const edit = {
  type: 'work.session.update',
  workId: work.id,
  occurrenceIndex: 0,
  session: { ...session, minutesPerOccurrence: 75 },
};

const preview = studio.previewCommand(edit, before);
assert.equal(preview.ok, true);
assert.equal(preview.projection.result.knownCommitmentCents, 403000);
assert.equal(studio.read(), before);
assert.equal(before.result.knownCommitmentCents, 398000);

const applied = studio.applyCommand(edit, before);
assert.equal(applied.ok, true);
assert.equal(studio.read(), applied.projection);
const updated = applied.projection.state.work.find(row => row.id === work.id);
assert.equal(resolveWorkSession(updated, 0).minutesPerOccurrence, 75);
assert.equal(resolveWorkSession(updated, 1).minutesPerOccurrence, 60);

const undone = studio.undo(applied.projection);
assert.equal(undone.ok, true);
assert.equal(studio.exportText(), before.serialized);
assert.notEqual(studio.read(), before);
assert.equal(studio.applyCommand(edit, before).error.code, 'stale-edit');
EOF_NODE
```

## What a GraphQL service would own

The current application loads one bounded document into a browser tab and can
run its local example, previews and Undo without a remote service. GraphQL
would earn its place if multiple authorized clients needed selective reads or
shared accepted plans. There are two separate choices. A read-only API could
expose subsets of accepted plans while keeping local editing and file export.
A shared write API moves acceptance, access decisions, and durability to the
server. Both approaches can reuse the admitted model and pricing rules. The transport
choice is independent of the UI framework.

For shared writes, expose a finite mutation for a session edit and return
typed applied, conflict, or rejected outcomes. Use a server-issued opaque
`PlanVersion` for compare-and-swap. A restored document revision can repeat.
Carry a separate idempotency key so a retry after a lost response can recover
the original outcome. This abbreviated SDL is a design sketch for that one
command and a corresponding read.

```graphql
scalar PlanVersion
scalar Cents

enum SessionFunding { ALLOCATED ADDITIONAL }
enum SessionStatus { PLANNED PAUSED }

input PlacementInput {
  periodId: ID!
  subdivision: Int!
}

input UpdateSessionInput {
  planId: ID!
  expectedVersion: PlanVersion!
  idempotencyKey: ID!
  workId: ID!
  occurrenceIndex: Int!
  label: String!
  teamId: ID!
  personIds: [ID!]!
  minutesPerOccurrence: Int!
  funding: SessionFunding!
  status: SessionStatus!
  placement: PlacementInput
}

type Plan {
  id: ID!
  version: PlanVersion!
  knownCommitmentCents: Cents!
  plannedCommitmentCents: Cents
}

type SessionEditApplied { plan: Plan! }
type SessionEditConflict { currentVersion: PlanVersion! }
type SessionEditRejected { code: String!, path: String!, message: String! }
union UpdateSessionResult = SessionEditApplied | SessionEditConflict | SessionEditRejected

type Query { plan(id: ID!): Plan }
type Mutation { updateSession(input: UpdateSessionInput!): UpdateSessionResult! }
```

1. **Coerce at the API, admit in the domain.** Map the GraphQL enum values to
   the stored vocabulary. Preserve omission versus explicit null for the
   optional placement by keeping the input field free of a default and testing
   for own-property presence after coercion. The API types describe field and
   list shape. Domain admission still decides whether participants exist,
   placement is valid, and a list meets its size and membership bounds. Use
   GraphQL `Int` for bounded counts and minutes. GraphQL `Int` is signed
   32-bit, while the model admits larger safe integer cent totals. The proposed
   `Cents` scalar would serialize safe integer cents as decimal strings with
   a documented coercion contract. Preserve the JSON-plan format separately
   for round-trip import, including its source-version and token checks.
   [GraphQL type system](https://spec.graphql.org/September2025/#sec-Type-System)
2. **Accept once across clients.** Authorize actor, tenant if applicable,
   plan, and command. Inside the transaction, resolve a matching retry before
   checking the current version, so a retry can recover an already committed
   receipt. Bind that receipt to the scoped key and a canonical fingerprint of
   the command. A changed request with the same key needs an explicit conflict.
   Then check the expected version and validate the target against that
   version's snapshot. Commit the admitted successor and receipt atomically and
   return the committed plan. GraphQL serializes top-level mutation fields
   within one operation. Concurrent requests still require a storage
   transaction and a version predicate or lock. Shared Undo would be a new
   authorized command against current state. Its scope and conflicts need their
   own contract. The outbox exemplar demonstrates retry identity and a single
   process-local publish step. A storage adapter needs its own durability and
   transaction checks.
   [GraphQL mutation execution](https://spec.graphql.org/September2025/#sec-Mutation) · [Specimen custody and transactional outbox 0.1.0](https://github.com/driftframestudios/gist-registry/blob/b1b9542c3c72325ac0384c975b90534f03e614d3/snippets/specimen-custody-outbox/0.1.0/README.md)
3. **Read a coherent version.** Project related investments and people from
   one pinned accepted version per read. Load or batch related records within
   the request's authorization context, and bound list sizes and query cost.
   Include plan and version in any cache key for version-scoped occurrence
   identities. Evict or reconcile affected entries when an occurrence removal
   shifts ordinals. File export still needs a complete admitted snapshot even
   when clients request small field sets in ordinary queries.
   [GraphQL performance and batching](https://graphql.org/learn/performance/) · [GraphQL operation limits](https://graphql.org/learn/security/)

Keep speculative edits local when the client holds the complete accepted plan.
A service that owns restricted data can expose a side-effect-free preview
query. Return the version it priced, and have Apply submit that same version
for admission in the write transaction. Keep the accepted version and draft
preview visibly distinct. A refetch after a conflict can show the newer plan
while preserving the visitor's proposed fields for deliberate review.

Use two distinct read clients to evaluate the benefit of the query surface.
Compare how each client reads a useful view, then exercise competing writes
and a lost-response retry. A simple versioned document endpoint remains
a lower-cost option if clients mostly read and replace complete plans.

## How a React receiver would work

React can own rendering while the framework-neutral engine owns commands and
the accepted plan. Start with one Coordination slice, for example the sprint
board, one session editor and the investment reading. Give React ownership of
its rendered subtree and keep the native controller out of that subtree. Keep
the existing static About reading available outside the interactive mount.
[React guidance on effects and render-derived data](https://react.dev/learn/you-might-not-need-an-effect)

| State | React composition |
| --- | --- |
| Accepted plan | Create one Studio per mounted workspace. Put a small subscription adapter in front of the engine and route all writes through it. Subscribe to the cached immutable accepted projection with `useSyncExternalStore`. Derive views from that snapshot. Subscribe to targeted slices if profiling shows costly updates. |
| Unfinished input | Let controlled inputs read the draft coordinator's raw fields and use its ports for events. Publish a separately cached draft snapshot when the edit or recovery state changes. Keep it above chapter routes so unmounting an editor doesn't discard saved text. Apply uses the captured base and token. |
| Presentation | Keep selection, expanded sections and focus-return intent with their receiving components. Key record rows by stable IDs and keep each occurrence editor scoped to its captured target. The ordinal alone can take on new meaning after a removal. React reconciliation keeps UI identity, while the domain guard decides whether a draft may apply. |
| Resource lifetime | Keep commands in user event handlers. Use effects for browser subscriptions or actual external resources. Release subscriptions, timers, and owned file reads on cleanup. Pair cancellation with generation checks for late results. Exercise setup → cleanup → setup with Strict Mode enabled. |

[React on external stores](https://react.dev/reference/react/useSyncExternalStore) · [React on state and keys](https://react.dev/learn/preserving-and-resetting-state) · [React on Strict Mode](https://react.dev/reference/react/StrictMode)

The sample below is a client-side adapter sketch with imports relative to the
repository root. It subscribes to **accepted projection changes**. A real host should also route Undo, file import, and all
other writes through its owner. Draft, baseline, error and history readings
need their own snapshots or a cached composite snapshot when displayed.

```jsx
import { useState, useSyncExternalStore } from 'react';
import { money } from './collaboration/native-investment-studio/display.mjs';

export function createStudioStore(engine) {
  const listeners = new Set();
  return {
    getSnapshot: engine.read,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    apply(command, expected) {
      const before = engine.read();
      const result = engine.applyCommand(command, expected);
      if (engine.read() !== before) {
        for (const listener of [...listeners]) listener();
      }
      return result;
    },
  };
}

export function ApplySession({ store, command, expected }) {
  const accepted = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [error, setError] = useState(null);

  return (
    <>
      <p>Known commitment: {money(accepted.result.knownCommitmentCents)}</p>
      <button type="button" onClick={() => {
        const result = store.apply(command, expected);
        setError(result.ok ? null : result.error.message);
      }}>Apply changes</button>
      <p role="status">{error}</p>
    </>
  );
}
```

Here `expected` comes from when the editor prepared its command. Reading the
latest snapshot at click time would silently rebase that old command. The
adapter uses `engine.read` directly because it returns the same accepted
object until publication. Getters like `editing.read()` build fresh wrappers,
so a React adapter should cache their outputs at transitions before using
them as snapshot getters. For server-rendered React, a matching initial
server snapshot and client hydration state would be an additional contract.
Gist Registry's React Aria example demonstrates a working subscription adapter,
generation-gated settlement, and keyboard and focus behavior in separate
native and React receivers. Its tests apply to that example.
[React Aria visual-contract receiver 0.1.0](https://github.com/driftframestudios/gist-registry/blob/b1b9542c3c72325ac0384c975b90534f03e614d3/snippets/react-aria-visual-contract-receiver/0.1.0/README.md)

## Questions to ask of a change

The Practitioner Probes on JavaScript cancellation, React reconciliation and
effect cleanup, and data-contract integrity inform the questions below. Start
with a plausible fault and look for an observation that changes what the
receiving code must do.

| Question | Mechanism and useful observation |
| --- | --- |
| Can a prior editor apply after the plan returns to its earlier values? | Exercise Apply → Undo → Apply from the original capture. The stale attempt should preserve accepted bytes and the later acceptance identity. For a service, run the same experiment with two clients and the server's opaque version. [State test owner](../../../../tests/native-investment-studio/state.test.mjs) |
| Can file A publish after the visitor chooses B or changes a draft? | Resolve A late even after abort. Check the preview shown to the visitor, current acceptance, and draft intent together. A canceled browser request alone only establishes the resource signal. [Exchange test owner](../../../../tests/native-investment-studio/exchange.test.mjs) |
| Who owns the typed input, selected session, and focus when views change? | Type into a session editor, close and reopen it, and exercise an occurrence removal while a draft is parked. Verify that the draft returns to its target or enters explicit review. In React, repeat through list reordering and Strict Mode effect setup and cleanup, then check focus on the actual control. [Session editing tests](../../../../tests/native-investment-studio/session-editing.test.mjs) · [Browser journey](../../../../tests/native-investment-studio/session.browser.mjs) |

[JavaScript Practitioner Probes](https://kindlight.systems/practitioner-probes/practitioner-probes-front-end-vanilla/javascript-enterprise-front-end-practitioner-probes) · [React Practitioner Probes](https://kindlight.systems/practitioner-probes/practitioner-probes-front-end-frameworks/react-enterprise-front-end-frameworks-practitioner-probes) · [Data Contract Integrity & Primitive Selection](https://kindlight.systems/practitioner-probes/data-contract-integrity-primitive-selection-start-here)

From the repository root, `npm run test:native-investment-studio:source`
exercises the existing engine and adapters. The Node command above supplies a
small expected result for reuse. The GraphQL and React sections describe
alternative hosts. A service would need concurrent-request and persistence
tests, and a React port would need its own mounted interaction and focus
checks.

[Return to the Studio README](../../README.md) · [Continue into the implementation reference](../../implementation-reference.md)

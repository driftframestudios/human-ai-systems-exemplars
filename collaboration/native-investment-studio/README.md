# Native Investment Studio: coordination, capability, and state

This package gives About one native working session, an inspectable
investment calculation, and a recoverable edit boundary. Visitors change
hours, remaining minutes, and working sessions, inspect the draft investment,
apply the change, and trace the accepted participant
effort and funding. The ordinary About section preserves vertical reading
while the complete Studio retains its richer planning capabilities.

[Issue #637](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/637)
holds the approved design and implementation sequence. The capability and state
foundation supports the draft adapter and
[Issue #643's native receiver](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/643).
About's existing Studio chapters and the complete original Studio retain their
source and routes. Each receiving pull request records its review
and integration authority; publication remains held.

## Source map

- `config.mjs` owns the immutable units, input limits, contract vocabulary,
  six practice definitions, and bounded history defaults.
- `contract.mjs` owns `preparePlan`, `preparePerson`, `prepareTeam`, `prepareWork`,
  `preparePurpose`, `prepareAssemblyCommand`, `prepareImport`, `parsePlan`, `createExamplePlan`, and
  `PlanError`. Its synthetic scenario factory is the example's single source.
- `commands.mjs` owns finite assembly transitions and their removal references.
  Each transition receives an immutable projection from the state owner.
- `state.mjs` owns the `createStudio` facade, each instance's accepted
  chronology, bounded Undo/Redo and independent baseline capture.
- `draft.mjs` owns `createWorkDraftAdapter`, its single work-row draft, and
  the optional one-request scheduling boundary.
- `person-draft.mjs` owns `createPersonDraftAdapter`, exact rate/time entry,
  one target-bound person draft, its cached proposal, and the pure numeric codec
  reused by person creation.
- `command-draft.mjs` owns five finite assembly forms, ordered raw selections,
  stable target keys and explicit command preview/Apply.
- `purpose-draft.mjs` owns six raw purpose fields, their canonical text proposal,
  and one explicit Apply/Cancel transaction.
- `editing.mjs` owns one active typed editor and eight bounded draft slots
  shared by working sessions, people, purpose, and assembly forms.
- `controller.mjs` owns `mountCoordinationPanel`, one root-scoped DOM receiver,
  explicit Apply/Cancel, accepted-state rendering, and listener cleanup.
- About's `index.html` owns the semantic panel and its scriptless example;
  `styles/routes/about.css` owns its scoped composition and palette mapping.
- `tests/native-investment-studio/contract.test.mjs` and
  `tests/native-investment-studio/state.test.mjs`, relative to the repository
  root, own focused contract and state-transition observations.
- `tests/native-investment-studio/commands.test.mjs` owns assembly accounting,
  ordered membership, dependency-held removal, and command admission observations.
- `tests/native-investment-studio/draft.test.mjs` owns draft recovery,
  coalescing, exact-target identity, and scheduling lifecycle observations.
- `tests/native-investment-studio/person-state.test.mjs` and
  `person-draft.test.mjs` own person accounting, admission, no-op, exact-target
  recovery, and bounded rate/time draft observations.
- `tests/native-investment-studio/controller.test.mjs` owns the local module
  delivery and semantic receiving checks; `controller.browser.mjs` owns the
  actual control, reading, and lifecycle observations across three engines.

## Existing owners and the receiving boundary

- The [full Studio](../initiative-costing-calculator/index.html) owns its
  existing planning controls, scenarios, change frameworks, interpretive lenses,
  staffing, activities, quality, recovery, and learning.
- [Investment analysis](../investment-analysis/README.md) owns the shared
  analytical state, formulas, exchange, and captured references used by the
  existing instruments.
- [About Studio chapters](../about-investment-studio-chapters/README.md) owns
  the derived chapter presentation. Its materializer preserves the complete
  original document and adds presentation and layout adapters.
- This package owns the new native planning envelope and its exact accepted
  revisions. A future adapter may carry compatible records between these
  owners through a declared transformation.

The existing analytical `prepare` boundary is a useful ownership precedent:
admit a candidate, calculate it, and expose one immutable revision. Its schema
describes a different analytical state. The legacy staffing formula also has
its own authored time units, sigma attention, reserve coefficients, and
additional-share rules. The native contract below prices its declared minutes
and funding treatment directly; a later adapter will identify any economic
meaning it transforms.

## Capability transfer map

The original instruments retain each capability while the native receiver
grows. This map connects the planned modules to source that a collaborator can
inspect today.

| Module | Current source capability | First-tranche contract and next receiver |
| --- | --- | --- |
| Coordination | Full Studio coordination horizon, human-received AI contributions, and collaboration routes | Named work, teams, and participants establish effort and ownership. Explicit connections, decision gates, and schedule behavior follow in later tranches. |
| Teams and capacity | Role quantities, rates, allocation, function, posture, ability enablers, and decision boundaries | Stable person and team identities, funded minutes, rates, membership, and explicit capacity consequences. Richer role descriptions and responsibility changes retain separate contracts. |
| Abilities and work | Activities, framework-related suggestions, and stated desired abilities | Stable work records and practice assignments reference one work owner. Customer abilities and decision authority remain distinct from team practices. |
| Change and interpretation | Six change frameworks, eight interpretive lenses, and eight relative attention weights | The capability inventory preserves their separate jobs. Framework mappings and interpretation enter a later native module; attention weights retain their meaning as emphasis. |
| Quality, recovery, and learning | Quality concepts and effort, disruption/recovery rows, learning disclosures, and scenario-specific questions | Work can carry its declared effort and funding basis. Richer quality, recovery, and observed-practice records follow through named extensions to the model. |
| Horizon and commitments | Editable duration and units with an illustrative coordination drawing | `horizonWeeks` names the scenario context. `timing: null` explicitly carries unscheduled work; recurrence counts determine effort. A scheduler requires an additional timing contract. |
| Investment and comparison | Staffing breakdown, heuristic planning range, commercial/service/capital analysis, and comparison capsules | Known monetary subtotal, completeness, funding distinction, capacity diagnostics, and immutable captures. Analytical domains continue with their existing owner until a compatible adapter is accepted. |
| Keep and carry | Accepted analytical import/export, captured reports, and leave-behind snapshots | Native 0.2.0 round-trip, admitted 0.1.0 migration, revision-bound edits, and exact captures. Existing full-Studio exports remain usable in their original instrument. |

The original horizon draws approximate spans from selected role, activity, and
recovery rows. Its geometry supplies a visual precedent; actual native timing,
capacity scheduling, and priority policy require their own declared inputs.

## Portable state

The envelope uses kind `native-investment-plan`, schema version `0.2.0`, and
model version `0.1.0`. It carries `planId`, `revision`, `currency: "USD"`,
`horizonWeeks`, one closed `purpose` record, and the ordered collections below. Stable IDs carry identity;
labels and array positions carry presentation.

| Collection | Fields | Meaning |
| --- | --- | --- |
| `people` | `id`, `label`, `fundedMinutes`, `rateCentsPerHour` | One participant's funded effort and loaded hourly rate. A null rate preserves an explicit pricing gap. |
| `teams` | `id`, `label`, `personIds` | Named grouping with explicit participant membership. Shared participants retain one funded-capacity account. |
| `work` | `id`, `label`, `teamId`, `personIds`, `minutesPerOccurrence`, `occurrences`, `funding`, `status`, `timing` | The named participants each contribute the stated minutes for each occurrence. `funding` is `allocated` or `additional`; `status` is `planned` or `paused`; this version's `timing` is null. |
| `practices` | `id`, `practiceId`, `teamId`, `workIds` | Assignment of a catalogue practice to a team, supported by existing work identities. Multiple references to one work item retain one calculation. |

Numeric fields use admitted finite integers within source-owned limits. Rates
are integer cents per hour; effort is integer minutes. Closed field projections
keep accepted state limited to the declared contract. A future schema revision
can introduce a new field with its admission, meaning, and exchange behavior.

### Purpose and schema migration

Purpose has exactly six nullable fields: `changedAbility`, `affectedPopulation`,
`observationSignal`, `accountableOwner`, `reviewBoundary`, and `openConditions`.
Each string admits at most 600 raw UTF-16 units before trimming surrounding
whitespace. Canonical output retains the trimmed, nonblank value; explicit
`null` carries an unspecified field. Direct admission requires nonblank strings
or explicit null. The purpose draft adapter converts blank input into null at
Apply. Purpose text describes the initiative independently of monetary inputs.

`preparePlan` selects schema `0.1.0` or `0.2.0` from the root's own enumerable
schema-version data descriptor. It fully admits a genuine closed 0.1 root,
every row and reference, its numeric meaning, and the owned byte budget before
constructing a current record with all six purpose fields null. The migrated
record then passes current admission. Surplus fields remain outside both closed
schemas; migration never copies an unadmitted graph.

`SCHEMA_BYTE_LIMITS` preserves the 524,288-byte source and owned-plan ceiling for
0.1.0. The 0.2.0 ceiling is 546,029 bytes: the former budget plus 141 bytes for
the inserted purpose member with six empty quoted values, and 21,600 bytes for
six 600-unit strings at the maximum six JSON bytes per UTF-16 unit. This allows
a full-size legacy plan to migrate and carry every bounded purpose field.
Both original transport and canonical output use their schema's budget; a
migrated export passes the current import boundary. The parser first bounds
allocation with the current maximum, then applies the admitted source version's
limit. The boundary tests exercise exact legacy and current limits, maximum
escaped text, and one extra source byte.

`prepareImport(text)` performs the existing bounded JSON and integer-token
checks once and returns frozen `{ projection, sourceSchemaVersion }`.
`parsePlan(text)` returns that same path's projection. Import previews can use
the source version while exports always describe the actual current 0.2 state.
Caller-owned legacy records and external captures retain their original version
and contents. Construction, replacement, import, history and baseline retention
inside a current Studio receive current-schema projections.

`previewPurpose(candidate, expectedProjection)` validates and prepares a proposed
purpose while preserving accepted state. `updatePurpose` publishes a material
change through ordinary revision, acceptance and history rules. A normalized,
validated no-op preserves exact accepted identity and Redo, including at the
document revision ceiling. Purpose changes leave calculated monetary results
unchanged. Stale and reentrant admission retains the newer accepted owner.

The six bounded fields add O(6 × 600) normalization work. Current admission keeps
the existing complete preparation path. A legacy import performs old admission
and current admission once each; this finite migration has the same asymptotic
bound with two owned preparation passes. The literal 0.1 fixture and focused
contract/state cases cover migration, descriptor ownership, Unicode limits,
unknown versus zero rates, deterministic round-trip, no-op history and recovery.

`createPurposeDraftAdapter(studio)` owns one fixed `purpose` target. Call
`begin('purpose', expectedProjection)` to receive a transaction token, then use
`setText`, `validate`, `preview`, `apply`, or `cancel` with that token. Each raw
field admits at most 600 UTF-16 units before normalization. Preview and Apply
replace all six fields together; surrounding whitespace trims and blank text
becomes null. Raw strings remain intact beside the accepted plan until Apply
or Cancel. Text remains data through serialization and needs text-only DOM
receivers when displayed.

The adapter retains one complete preview keyed by the six canonical values.
Equivalent whitespace edits reuse that preview while retaining their exact raw
strings. A different accepted projection makes the draft stale; a different
token belongs to a different edit. Reentrant preview work checks the transaction,
accepted identity, and raw edit revision before caching its result. Disposal
releases the transaction synchronously. The adapter owns no scheduler and adds
O(6 × 600) bounded text work per read or edit; complete proposal preparation
retains the state owner's ordinary cost. Its pure tests cover raw admission,
semantic caching, exact ownership, history, recovery, and reentrant callbacks.

### Supported inputs

| Receiver | Supported form | Ownership and recovery |
| --- | --- | --- |
| Direct JavaScript records | Ordinary records from the module's JavaScript realm, or null-prototype records, with exactly the declared own enumerable data fields | Preparation copies admitted fields into its owned projection. Frozen input records remain usable. Accessors and custom prototypes receive a shape diagnostic. |
| Direct JavaScript collections | Dense arrays with that realm's ordinary `Array.prototype`, consecutive own enumerable data entries, and an admitted own length | Preparation reads each admitted entry into its own array. Frozen input arrays remain usable. |
| Serialized exchange | UTF-8-budgeted JSON carrying the supported native envelope | `parsePlan` owns syntax and numeric spelling admission. Serialized exchange is the receiving route for data carried across JavaScript realms or transformed from custom application objects. |

JSON exchange uses whole-number tokens, with an optional minus sign followed
by integer digits. Domain bounds then admit the nonnegative values; negative
zero normalizes to zero. Fraction and exponent spellings receive an
`integer-token` diagnostic, including mathematically integral spellings such as
`1.0` and `3e1`. This keeps an underflowing negative quantity or an excessively
precise fraction from becoming an accepted integer through JSON Number
rounding. Native exports already use this spelling. The byte-bounded import
first checks JSON syntax, then examines number tokens in one linear pass while
skipping quoted strings. Labels retain their exact text. Direct JavaScript
calls receive already-evaluated Numbers; exact source-spelling checks belong
to the text import boundary.

The reference budget counts owned relationships:
`sum(teams[].personIds.length) + sum(work[].personIds.length) + sum(practices[].workIds.length)`.
The current ceiling is 4,096. One person participating in several teams carries
one membership edge per team; each work participation and practice support
edge has its own owner as well. Scalar `teamId` references remain bounded by
the work and practice collection limits. Duplicate entries within one reference
list receive a separate diagnostic.

Each preparation creates a fresh budget. Its early size guard checks a list's
contribution before validating that list's individual references. A candidate
that exceeds the budget therefore receives `reference-budget` first, even when
one of those entries would also fail a reference check. Rejection discards the
invocation-local budget and leaves the accepted projection available; a later
candidate starts with the full budget.

Preparation verifies unique IDs, reference resolution, membership, collection
and text limits, supported vocabulary, and numeric bounds. Duplicate references
and ambiguous ownership receive explicit diagnostics. A negative time input,
unsupported version, or invalid field leaves the current accepted revision
available for reading and export.

A future schema that admits fractional numeric spellings must version their
units, exact-value semantics, token admission, and round-trip observations
together. Nested work or dependency edges similarly need a declared cycle
policy and fitting traversal checks in their introducing schema revision.
The current typed references resolve IDs through fixed collection layers;
preparation constructs the fixed-depth projection before recursively freezing it.

## Investment and capacity meaning

Each staffing-person line prices funded minutes at that person's rate. Work
prices `minutesPerOccurrence × occurrences` for each participant. The model
settles total minutes once per person and funding pool, using half-up cent
rounding, so dividing the same effort across work records preserves its price.
Work-line display amounts also round to cents. `lineRoundingAdjustments` makes
their difference from the settled pool explicit: displayed line cents plus
the signed adjustment equals that pool's known subtotal. For example, sixty
one-minute records at $100/hour display 167 cents each; a -20-cent adjustment
reconciles those displays to the $100 settled hour. BigInt intermediate products
preserve exact integer arithmetic before the rounded amount returns to the
admitted safe Number range. Aggregate addition checks the same monetary range.
Display-line sums use BigInt as well: rounding can put their sum temporarily
above the safe-Number ceiling even when the actual settled commitment is
within it. The signed reconciliation is calculated exactly; its Number
representation passes a safe-integer check before entering the projection.
It explains display rounding within its funding pool.

The rounding adjustment depends on the number of priced display lines. For
one person/funding pool with n lines, its absolute adjustment is at most
floor(n / 2) cents under this nonnegative half-up rule. Each line consumes a
work-participant reference, so the current 4,096-reference budget gives a
conservative 2,048-cent bound across a funding pool. Higher rates change the
settled amount while retaining that rounding-error bound. Per-person minutes
are also bounded: 256 work records × 1,440 minutes × 10,000 occurrences gives
at most 3,686,400,000 minutes. Changes to these limits, time units, or rounding
policy receive a fresh arithmetic-bound review with their schema/model change.

Allocated work attributes effort and cost inside funded staffing. Additional
work contributes its own purchased amount. The total therefore joins funded
staffing and additional purchases, while allocated-work attribution remains an
inspectable breakdown. A practice assignment references its supporting work;
the assignment itself introduces neither a second charge nor an inferred
productivity benefit.

An accepted over-capacity plan can have allocated attribution greater than its
funded staffing. Its capacity obligation and incomplete standing preserve the
need to revise capacity or funding; the calculation continues to show the
declared allocation. Allocation is therefore a funding treatment, rather than
a guarantee that every accepted plan fits its funded capacity.

A null rate leaves positive-effort pricing unavailable; zero effort remains
zero cost. The result retains the
known subtotal and identifies its incomplete standing. Paused work remains a
modeled obligation with incomplete standing, allowing a later owner to restore,
revise, or explicitly retire it. Capacity overruns remain visible even where
money is otherwise calculable. The model reports the plan's declared work;
qualified people establish rates, acceptable capacity, and investment decisions.

The first hand-checkable scenarios include a six-week coordination arrangement
costing $1,200, a doubled-cadence arrangement costing $2,400, and an allocated
practice inside $16,000 of funded effort with a separate $150 review purchase.
The last scenario's commitment is $16,150; its allocated practice cost remains
part of the existing $16,000.

## Accepted state and commands

`createStudio` creates an independent state owner with `read`, `replace`,
`updateWork`, `previewWork`, `updatePerson`, `previewPerson`, `importText`,
`applyCommand`, `previewCommand`, `exportText`, and `capture` operations. An accepted material edit produces a
newly prepared immutable revision. Mutations receive the
exact immutable projection returned by `read()` as their expected-state token:

- `replace(candidatePlan, expectedProjection)`
- `updateWork(workId, fullReplacementRow, expectedProjection)`
- `updatePerson(personId, fullReplacementRow, expectedProjection)`
- `importText(jsonText, expectedProjection)`

Projection identity binds both the model instance and its accepted revision.
An import or replacement can supply a historical numeric revision; its newly
prepared projection still makes earlier edit tokens stale. A numeric revision
comparison alone would miss that return to an earlier-looking state. The caller
keeps a rejected draft available while the newer accepted plan remains intact.
The command checks that identity again immediately before commit. If a direct
JavaScript descriptor callback admits another edit during preparation, the
newer snapshot and its identity index remain accepted and the outer command
returns `stale-edit`. Serialized JSON contains data rather than executable
descriptor callbacks.

`updateWork` retains the target work ID and collection order, then increments
the native plan revision. Replacement and import preserve the supplied native
revision and replace the accepted projection identity. The work-position index
and person-position index are rebuilt for replacement, import and restoration;
targeted edits reuse them while preserving identity and order.

`previewWork(workId, fullReplacementRow, expectedProjection)` shares the same
target checks and complete preparation with `updateWork`. It returns a proposed
next-revision projection while `read`, `capture`, and `exportText` retain the
accepted projection. The exact-state check runs before and after preparation.
Apply prepares again against the accepted owner; a displayed proposal carries
the estimate, while Apply retains commit authority.

### Assembly command contract

[Issue #648](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/648)
adds creation, membership, order and removal through one finite command facade.
`applyCommand(command, expectedProjection)` and
`previewCommand(command, expectedProjection)` use the same exact-state checks,
accepted chronology and history owner as the existing update methods. Preview
returns a complete proposed projection; Apply prepares the command against its
current accepted receiver. A material command advances the document revision
once. A validated no-op preserves accepted identity, chronology, Redo and the
revision, including at the revision ceiling.

Each command is a plain closed record with these exact fields:

| `type` | Additional fields | Effect |
| --- | --- | --- |
| `person.create` | `person` | Append a complete person row with a distinct ID. |
| `team.create` | `team` | Append a complete team row with ordered, existing person IDs. |
| `work.create` | `work` | Append a complete work row with its existing team and participating members. |
| `team.update` | `teamId`, `team` | Replace the complete team row while retaining its target ID and position. |
| `team.members.replace` | `teamId`, `personIds` | Replace the ordered membership list while preserving participating work relationships. |
| `work.participants.replace` | `workId`, `personIds` | Replace the ordered, nonempty participating-person list. |
| `work.funding.set` | `workId`, `funding` | Select `allocated` or `additional` through the existing accounting rules. |
| `work.status.set` | `workId`, `status` | Select `planned` or `paused`; paused work retains its modeled effort and obligation. |
| `collection.reorder` | `collection`, `ids` | Put every current row exactly once in the supplied order; the collection is `people`, `teams`, `work` or `practices`. |
| `person.remove` | `personId` | Remove a person after team and work references have been reassigned. |
| `team.remove` | `teamId` | Remove a team after work and practice ownership have been reassigned. |
| `work.remove` | `workId` | Remove work after practice references have been reassigned. |

For example, this preview prices a smaller participating group:

```js
const expected = studio.read();
const command = {
  type: 'work.participants.replace', workId: 'review', personIds: ['product-one'],
};
const proposal = studio.previewCommand(command, expected);
// The receiver presents the proposal, then submits the same intended change.
const result = studio.applyCommand(command, expected);
```

Contract admission snapshots enumerable data descriptors, bounded dense lists,
canonical IDs and supported choices before the transition reads a target.
The discriminant is checked again after reflection. The complete person, team
and work validators remain shared with their plan contract. Changed plans
receive the complete reference, membership, cardinality, byte-budget and exact
accounting preparation used by other native edits. Command construction leaves
the current schema at 0.2 and the pricing model at 0.1.

A referenced removal returns `ok: false` with `error.code: 'dependencies'` and
an immutable `error.references` array. Each entry has `{collection, id, field}`;
entries follow accepted collection order. The receiver can show the precise
teams, work or practices that still use the target. State, export, baseline,
chronology and history remain intact. A receiver can submit an explicitly
reviewed, atomic reassignment through the existing whole-plan `replace` method,
then retry the removal. Person records survive removal of their team; team and
person records survive removal of their work. Retirement, role metadata and
richer lifecycle states retain their planned schema-transition owner.

Three API shapes were considered: separate public methods for every operation,
an unrestricted path patcher, and the selected finite command facade. The finite
facade keeps one closed admission route and one publication boundary while
existing focused update methods retain their compatibility. The command module
owns pure transition preparation; `state.mjs` owns accepted publication and
rebuilds person/work position indexes after material assembly changes.

For P people, T teams, W work records, A practices, R reference edges and B
serialized bytes, a material command retains full O(P + T + W + A + R + B)
preparation and space. Target scans and path copies occur once per command;
reordering builds one temporary ID map. Removal scans each relevant reference
list once and returns at most T + W references for a person, W + A for a team,
or A for work. Command admission and validated no-op checks scale with their
bounded input. These source bounds retain Issue #641's complete-preparation
decision; runtime responsiveness remains a measurement question for its receiver.

### Accepted chronology, history and baseline

[Issue #649](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/649)
places chronology in the accepted state owner so direct commands and future
editing/exchange receivers share the same history. Existing commands keep their
exact-projection argument and result shape. A second optional constructor
argument selects retention: `createStudio(plan, { historyLimit: 2 })`.
`HISTORY` in `config.mjs` names the default of 20 predecessor plans and the
configurable ceiling of 100. Zero retains accepted chronology and explicit
baseline support while keeping Undo/Redo empty.

| Receiver | Meaning |
| --- | --- |
| `readAcceptance()` | One frozen `{ instance, token, sequence }` record. Opaque Symbols identify this instance and its current accepted event; sequence begins at zero and increases once per publication. This tiny record retains no projection. |
| `readHistory()` | Frozen `{ undoCount, redoCount, limit }` counts. The combined retained Undo/Redo entries fit the configured limit. |
| `undo(expected)` / `redo(expected)` | Restore the nearest retained plan using a fresh accepted envelope and acceptance token. Empty history returns `history-empty`; an outdated expected projection receives `stale-edit` first. |
| `setBaseline(expected)` | Capture the current projection and acceptance in a separate frozen `{ projection, acceptance, token }` record. Capture leaves accepted identity, sequence, Undo and Redo unchanged. |
| `readBaseline()` | Return that capture record, or null before the first capture. Each capture has its own fresh token. |
| `restoreBaseline(expected)` | Restore the captured payload as a new accepted event; an absent baseline returns `baseline-empty`. Restoration joins Undo and clears Redo like a material edit. |

A complete admitted replacement or import creates an accepted event even when
its payload and imported numeric revision match the current plan. Undo, Redo
and baseline restoration likewise mint fresh envelopes. Earlier expected
projections therefore remain stale after A → B → A. Imported document revision
and local acceptance sequence answer separate questions; traversal restores
the document's recorded revision while advancing local chronology. The safe
integer sequence boundary returns `acceptance-limit` before any publication.

Every material publication prepares its projection and applicable indexes,
then checks exact freshness again. History, projection, indexes and acceptance
change together through owned assignments after that check. A descriptor
callback that publishes a newer plan retires the outer attempt. Baseline
capture has its own record and survives an older reentrant attempt's return.
Neither history entries nor acceptance records point back into a Studio or
prior history container.

Read, capture, export, previews, baseline capture and validated no-op row
commands preserve accepted chronology. Invalid commands preserve their prior
history as well. Material edits, complete replacement/import and baseline
restoration clear Redo; Undo/Redo transfer one entry between their bounded
stacks. Baseline restoration remains a deliberate accepted event even when
the captured payload already matches the current one.

`prepareWork` admits the complete closed work row, including its bounded dense
participant list, before the no-op comparison. The shared `workFields` helper
owns scalar vocabulary and bounds for both row and full-plan preparation.
Admitted row equality includes participant order. An unchanged row reuses the
exact accepted projection, including at the document revision limit; a changed
row re-enters complete-plan preparation for reference resolution, team
membership, aggregate edge budget, accounting and serialization. The ordinary
full-plan path retains its early reference-budget check.

The literal source fixture starts at $1,200, changes one rate to $101 for
$1,203, then funds one hour for $1,304. Undo/Redo restore those values with
fresh accepted identities. Adjacent cases cover partial pricing, baseline
restoration, imported equal revisions, closed-row no-ops, retained order,
reentrant publication and restored identity indexes. Existing draft fixtures
continue to exercise their exact-projection stale boundary.

History uses bounded arrays of immutable projection references. Let H be the
configured entry limit and S a retained projection's state, result and serialized
size. Retention is O(H × S), plus accepted state, one baseline and caller-owned
captures. The serialized-byte limit bounds exchange bytes; heap use also
includes records, arrays, indexes, strings and engine overhead. A ceiling of
100 near-limit projections can therefore retain materially more memory than
100 serialized files. The default of 20 is the ordinary receiving policy;
a larger limit deserves a concrete local workload and memory observation.

A row no-op admits and compares its row in O(R) for that row's participant
count. A material edit keeps the existing full preparation path. Publication
copies O(H) stack references; traversal and baseline restoration create an
O(1) envelope, rebuild person/work position indexes in O(P + W), and share
already frozen payloads. Reading acceptance, baseline and history counts costs
O(1). Eviction releases the owner's reference; an explicit external capture
can continue to retain that immutable projection.

### Person command contract

| Command | Target, fields, and base identity | Success and recovery |
| --- | --- | --- |
| `previewPerson(personId, fullReplacementRow, expectedProjection)` | Existing person ID, complete `id`/`label`/`fundedMinutes`/`rateCentsPerHour` row, and the exact current projection | Return a fully prepared proposal while accepted reads, captures, and export retain their current values. |
| `updatePerson(personId, fullReplacementRow, expectedProjection)` | The same target and canonical fields; rate is integer cents or null and funded time is integer minutes | Admit the complete row, preserve its ID and authored position, then publish one coherent revision. A rejected candidate retains accepted state. |
| Either command with an unchanged admitted row | Every canonical field agrees with the current person; shared admission still checks shape, descriptors, and bounds | Return the exact accepted projection with the same revision, including at the revision limit. Surplus fields still receive their admission diagnostic. |

`preparePerson` is the same canonical person admission used by complete-plan
preparation. Its owned row allows a no-op check before the complete preparation
path. A changed person re-enters that full path, including every shared work
reference, funding-pool rounding, capacity, and serialization. Preview and Apply
check exact projection identity both before and after candidate preparation.
An equal-numbered import or a foreign Studio projection earns `stale-edit`.
An old capture keeps its original data after the person changes.

`read` returns the prepared immutable snapshot. The owner calculates and retains
the result once for that accepted revision; reading a snapshot performs constant
work. `capture` retains the exact plan and model version for a comparison. Later
edits operate on a different revision. Separate Studio instances own separate
accepted state.

For example, from the repository root:

```js
import { createStudio } from './collaboration/native-investment-studio/state.mjs';

const studio = createStudio();
const before = studio.read();
const review = before.state.work[0];
const changed = studio.updateWork(review.id, { ...review, occurrences: 12 }, before);
if (changed.ok) {
  console.log(changed.projection.result.knownCommitmentCents); // 240000 cents
}
console.log(before.result.knownCommitmentCents); // Captured prior value: 120000 cents
```

`preparePlan` returns a deeply frozen projection with `state`, `result`, and
`serialized`, or throws `PlanError` carrying a diagnostic code, path, and
message. Facade mutations return either `{ ok: true, projection }` or
`{ ok: false, error: { code, path, message }, projection }`. The rejected result
still carries the existing accepted projection, giving a future UI a stable
amount and a precise recovery message together.

`replace` and `importText` pass through the same admission boundary as a work
edit. Rejection preserves the prior snapshot. Native 0.2.0 export/import retains
the supported state, and genuine native 0.1.0 plans migrate through their complete
original admission. Full-Studio exports and unknown schema versions receive an
explicit compatibility result; their original instruments retain those records
while a future adapter establishes a tested transformation.

UI drafts, open menus, reversed-card faces, focus targets, and reading position
belong to their presentation adapters. A draft can remain editable while
the accepted amount and export continue to describe the last valid revision.

## Coordination-work draft adapter

[Issue #640](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/640)
introduces a source-only adapter for `minutesPerOccurrence` and `occurrences`.
It owns one open editor with at most 32 UTF-16 code units per raw field. Labels,
membership, funding, and all other work fields retain the captured row's values.
The native controller receives this adapter; the complete Studio and its About
chapters continue through their existing owners.

The pre-existing `collaboration/investment-analysis/studio.js` preserves
invalid control drafts, applies grouped records, and checks request identity
against intervening interaction. Those responsibilities guide this adapter.
Its DOM-dependent handlers, analytical schema, and numeric revision context
have different receivers, so this small module owns the native work-row and
exact-projection boundary directly.

```js
import { createWorkDraftAdapter } from './collaboration/native-investment-studio/draft.mjs';

const editor = createWorkDraftAdapter(studio);
const opened = editor.begin('review', studio.read());
const token = opened.view.draft.token;
editor.setText(token, 'minutesPerOccurrence', '45');
editor.setText(token, 'occurrences', '12');
const applied = editor.apply(token);
// With the four-person example, applied.view.projection carries 360000 cents.
```

The example assumes the `studio` instance created above and checks a complete
successful path. Receiving controls inspect each command's `ok` and `error`
before using its result.

| Operation | Owned transition |
| --- | --- |
| `begin(workId, expectedProjection)` | From idle, capture an existing work row and the exact current projection; create an opaque session token. |
| `setText(token, field, rawText)` | Retain bounded raw text for one declared field, including a temporarily invalid value. |
| `step(token, field, direction)` | Add one admitted `+1` or `-1` step to the current valid draft value; preserve raw text at a range boundary. |
| `validate(token)` | Check the current base projection and all draft quantities while preserving the draft and accepted state. |
| `preview(token)` | Validate the current draft and return a cached proposed projection through `studio.previewWork`, preserving accepted state. |
| `apply(token)` | Invalidate pending callbacks, validate the quantities, and pass one complete replacement to `studio.updateWork`. Success settles the draft. |
| `queueApply(token)` | Request at most one deferred Apply using the injected scheduler; subsequent draft changes feed that same pending Apply. |
| `cancel(token)` | Settle the draft and invalidate its pending callback while preserving accepted state. |
| `dispose()` | End the adapter's lifetime and release its pending request. Repeated disposal retains any cleanup diagnostic. |
| `read()` | Return a frozen view with current accepted projection, draft text/errors, pending state, and last command error. |

Commands return `{ ok, view }` or `{ ok: false, error, view }`. A successful
`setText` means that editable text was retained; `draft.errors` establishes its
current field validity. Empty text, an unfinished token such as `-` or `1e`, a
negative quantity, and zero retain distinct outcomes. The numeric grammar uses
unsigned decimal digits, with leading zeroes accepted and normalized on commit.
Whitespace, fractions, and exponent forms receive field diagnostics. Lexical
admission precedes Number conversion. Oversized or non-string input receives a
text diagnostic while the prior bounded raw value remains available.

The optional third factory argument `{ durationFormat: 'hours-minutes' }`
selects the native panel's duration entry. The same draft owner then retains
`hoursPerSession`, `minutesPerSession`, and `occurrences`. Whole hours (0–24)
and remaining minutes (0–59) combine into canonical integer minutes, bounded
at 24 hours total. A minute step carries across the hour boundary; an hour step
adds 60 minutes. Invalid or unfinished parts retain their raw text and precise
diagnostics. The default `minutes` format preserves the original two-field API.
`draft.changed` compares admitted quantities with the captured row; alternate
leading-zero spellings retain the same meaning, while invalid input remains
a changed draft requiring attention.

Preview keeps one cached result per unchanged active draft. Changed raw text
invalidates that result; stale, foreign, disposed, or reentrant sessions receive
their fitting diagnostics. A rejected preview shows its reason while accepted
state remains available. The preview shares funding-pool rounding, capacity,
missing-rate standing, and admission with Apply. Each funding pool settles once,
so changing a rounded work line alone does not establish the new total.

Each session command requires the opaque `draft.token` returned by Begin.
This identity keeps late control callbacks attached to their original editor.
An old session's command receives its own error while the current editor keeps
its draft and diagnostic.
An open draft makes another Begin return `draft-open`; Apply or Cancel settles
the original before a receiver switches targets. The view is `stale` when its
base projection differs from the current accepted plan, including an import or
replacement with the same numeric revision. Stale text remains inspectable;
Cancel then Begin is this tranche's explicit recovery route. The adapter keeps
the core's exact projection check and adds its own distinct editor identity.

### Deferred Apply and resource ownership

The optional scheduler supplies synchronous `request(callback)` and
`cancel(handle)` host operations, with deferred callback delivery.
It returns an opaque handle before invoking the callback. The adapter has no
default timer, frame loop, listener registry, or DOM dependency. A future browser
wrapper can invoke the callback and then render `editor.read()`; its choice of
frame or task scheduling receives browser evidence with the actual controls.

Repeated absolute samples replace the same raw field. Step commands add their
individual steps immediately to the draft. All draft quantities therefore reach one
coherent candidate when the callback applies. An explicit Apply serves as the
final flush, including when a browser has suspended its frame callbacks.
An invalid final draft remains editable beside the accepted amount and export.

Every scheduled request has its own identity. Apply, Cancel, and Dispose clear
that identity before calling scheduler cancellation; a late callback stays
inert even if cancellation throws. A synchronous callback receives a scheduler
diagnostic and its returned handle is cancelled. If cancellation or disposal
occurs during request acquisition, the adapter releases the returned handle
when it arrives. The callback must be one-shot; repeated invocation is inert
after its first delivery.

While the scheduler releases a request, Apply and Queue Apply for that request's
draft return a `settling` diagnostic to the reentrant caller. The draft's own
diagnostic remains available. This session-scoped guard covers explicit Apply,
inline-callback rejection, and release of a handle acquired after cancellation.
A cancellation hook can settle that draft and open a new one; the new session
owns its own pending request. The returning older command checks its original
session again before it can commit.

A scheduler exception returns a fixed `scheduler` or `cleanup` diagnostic.
Accepted state remains intact. If a scheduler registers a resource and throws
before returning its handle, that scheduler owns the release route. A cleanup
diagnostic records an invalidated callback with physical release still due.
The scheduler owns that remaining release; later adapter disposal cannot retry
a handle whose failed cancellation has already relinquished logical ownership.
If disposal occurs during acquisition and the eventual handle fails cleanup,
the disposed view immediately retains the same cleanup diagnostic as the
returning command. Repeated reads and disposal preserve that evidence.
Explicit Apply can recover a retained draft after a failed scheduling attempt.
Direct scheduler functions and Studio ownership are cooperative host APIs;
this adapter supplies lifecycle guards rather than an execution sandbox.

### Cost and next measurement

Begin locates one work row in O(W). Read, text edits, field validation, and steps
operate on two or three bounded strings, according to the duration format.
Scheduling retains one ticket. Successful Apply
retains the complete O(P + T + W + A + R + B) preparation and serialization path;
it introduces no incremental calculator. One active draft retains one base
projection, which may differ from the Studio's current projection after an
external change. Caller-retained views and scheduler-retained callbacks have
their own lifetimes; the future receiver bounds any history it keeps.

A new valid preview uses the same complete preparation cost and retains one
proposed projection. Repeated preview reads of unchanged raw quantities reuse
that projection. The current UI computes synchronously; #641 measures preview
preparations separately from raw edits and accepted commits before introducing
coalescing or a second accounting strategy.

[Issue #641](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/641)
receives the implemented edit/apply boundary for measurement. Its first slice
compares direct accepted edits, explicit draft Apply, and deferred Apply through
identical operation traces. Raw edits, steps, pending requests, accepted commits,
and complete synchronous Apply cost retain separate metrics. Fake scheduling
establishes ordering and counts; browser latency begins with native controls.

## Person draft adapter

`createPersonDraftAdapter(studio)` gives one person editor an explicit
Apply/Cancel boundary. Its API matches the work adapter's session shape while
keeping this editor's resource lifetime synchronous.

| Operation | Result |
| --- | --- |
| `begin(personId, expectedProjection)` | Capture one existing person and the exact accepted projection; return an opaque `draft.token`. An open draft is settled before opening another. |
| `setText(token, field, raw)` | Retain up to 32 characters for `ratePerHour`, `fundedHours`, or `fundedMinutes`; expose field diagnostics alongside the editable text. |
| `step(token, field, direction)` | Add or subtract one dollar, hour, or minute. Dollar steps preserve cents; minute steps carry across hour boundaries. |
| `validate(token)` / `preview(token)` | Validate the current values; preview returns the complete proposed projection while accepted state stays available. |
| `apply(token)` | Publish one canonical person row and settle the draft. A canonical no-op also settles the draft while preserving accepted identity/revision. |
| `cancel(token)` / `dispose()` | Release this draft and its cached proposal. Cancel leaves the adapter ready for another person; disposal ends its lifetime. |
| `read()` | Return an immutable view with current accepted projection, `draft.personId`, token/base identity, raw values, field errors, changed status, and any command error. |

Rates display USD with two decimal places. Entry admits unsigned whole dollars
or one/two decimal places and converts the integer dollar/cents parts directly
to integer cents. An empty rate means unavailable; explicit `0` means a zero
rate. An unfinished decimal such as `100.` remains editable. Exponents,
whitespace, negative amounts, excess precision, and out-of-bound quantities
receive field diagnostics. The rate step requires a supplied rate; entering a
rate supplies the recovery route from unknown.

Funded hours and remaining minutes combine into canonical minutes. Remaining
minutes run from zero through 59, and total funded time stays within the
contract's 10,000,000-minute bound: 166,666 hours and 40 minutes. Funded time
is total available effort in this plan. A calendar or sprint allocation keeps
its separate future timing contract.

The adapter retains one proposal keyed by canonical cents/minutes under its
active token and base projection. Equivalent spellings such as `101` and
`0101.00` reuse the same proposal; changed canonical values replace it. Invalid
text retains its field diagnostic and accepted amount. Exact projection checks
precede cache reuse, so an equal-numbered replacement makes the draft stale.
Cancel followed by Begin opens the current person settings. A late foreign
token receives its own diagnostic while the current draft stays intact.
The editor creates no scheduler, timer, listener, or asynchronous resource.

Begin locates its person in O(P). Read, validation, direct text edits, and steps
operate on three bounded strings. A cache hit returns its prepared proposal in
O(1); a changed valid preview or material Apply performs complete
O(P + T + W + A + R + B) preparation, including serialization. The facade's
person-position map adds O(P) retained entries and expected O(1) target lookup.
A valid unchanged row performs bounded person admission before returning the
accepted projection. Surplus direct-object keys retain their O(K) enumeration
cost at the shared admission boundary. One editor retains its base projection,
bounded text, and at most one proposal; caller-retained views have their own
lifetimes.

The focused person suites establish the literal $3/$24/$75 rate changes,
shared-person funding, unknown/zero pricing, pool rounding, exact cents,
duration bounds, order preservation, semantic preview reuse, stale recovery,
and immutable captures. They extend the source contract while the roster's
browser receiver owns actual input, layout, focus, and reading observations.

## Shared editing and saved drafts

`createDraftCoordinator(studio, { limit })` returns one coordinator for that
Studio instance. Its `work`, `person`, `purpose`, and `assembly` ports reuse the typed adapters
for validation, exact input conversion, preview and Apply. The parent receiver
owns coordinator disposal; child receivers borrow their port and own their DOM
listeners. A coordinator has at most one active adapter.
Repeated factory calls return the same coordinator and retain its lifetime owner.
The supported composition has one root receiver per Studio; a child receives
the shared coordinator explicitly and leaves disposal to that root.

The default limit is eight total draft slots. An active editor reserves one slot,
so changing chapter can always park its text and dispose its adapter. Opening a
ninth target asks the visitor to review or discard an existing edit. The original
active target and selection remain available when that capacity check fails.
Clean edits release their slot; changed raw spelling, unfinished text and invalid
quantities retain their exact strings.

Saved records contain a kind, target ID, fresh record token, bounded raw fields,
and the tiny accepted-instance marker. Work and person edits have three fields
of at most 32 UTF-16 units each; purpose has six fields of at most 600 units each.
Assembly adds the finite text and ordered-ID fields described below. They retain each
field's original meaning, including an unknown hourly rate represented by an
empty string. Saved records carry neither prepared projections nor scheduled
resources. A resumed edit receives a fresh lease; earlier tokens retain their
original, closed ownership.

When the accepted plan changes, saved text remains readable and becomes stale.
`review(token, expectedProjection)` reopens the complete set of saved fields against the
displayed current plan for inspection before Apply. It performs an explicit
whole-edit review; it leaves field-by-field merging to a future declared policy.
`useCurrent` deliberately replaces the saved fields with current values.
`cancel` discards exactly the named edit. A removed target retains readable saved
text and its discard route until a separate state owner restores that target.
The coordinator's `discard(savedToken)` addresses any saved record, including an
unselected or removed target, while preserving the current active lease. The
Saved edits disclosure uses this bounded token route to release capacity.
Person selection immediately refreshes that list. Recovery compares the saved
text with the accepted projection actually rendered beside it. An intervening
accepted change refreshes those values and the amp amount while keeping the
saved edit available for a new review choice.

The coordinator's `intent` marker changes with raw edits, accepted application,
review, current-value replacement and discard. Parking, resuming, validating and
previewing preserve it. A later exchange receiver can bind a replacement request
to both this marker and the accepted-state token while allowing ordinary chapter
navigation. The current receiver uses explicit Apply and introduces no scheduled
commit path.

With D held edits and bounded raw payload size S, saved storage is O(D × S), with
D ≤ 8. Work/person fields retain their 32-unit bounds; purpose has six fields
of at most 600 units; assembly has the separate text/ordered-ID bounds below.
Target indexes rebuild once per accepted projection in O(people + teams + work + 1);
subsequent target lookups use Map lookup. A summary visits at most eight records.
Typed preview retains the complete
preparation route measured by #641 and computes only for the active editor.
The accepted state's history and baseline remain with the state owner. Their
full visitor controls belong to the later Keep/Carry and exchange receiver.

`tests/native-investment-studio/editing.test.mjs` owns literal monetary changes,
capacity reservations, raw-text recovery, exact lease and accepted identities,
removed targets, disposal, reentry and draft-intent behavior.

### Assembly drafts and creation recovery

`editing.assembly` borrows the same active lease and eight-slot reservation.
Its first finite forms are `person.create`, `team.create`, `team.update`,
`person.remove` and `team.remove`. `ASSEMBLY_FORMS` declares their text and
ordered-selection fields. `makeAssemblyTarget(form, id)` creates a bounded
scalar key; `describeAssemblyTarget(key)` returns its form, record ID,
collection, mode and field metadata. The form and target remain fixed within
each typed transaction.

Use `editing.assembly.create(form, expectedProjection)` to allocate a new person
or team ID and open the form. Existing records use
`begin(makeAssemblyTarget(form, id), expectedProjection)`. The port supplies
`setText`, `setIds`, person-numeric `step`, `validate`, `preview`, `apply`,
`cancel`, `review` and `useCurrent`. The generated ID stays in the target key
through preview, parking and resume. Creation Apply releases its lease, allowing
the receiving UI to open the new person's rate/time editor or the accepted
team's settings.

Person creation has a label plus the existing hourly-rate/funded-time text
codec. A blank rate means unknown; explicit zero retains its distinct meaning.
Team forms have a label and a dense ordered `personIds` array of at most 128
distinct bounded IDs. Raw labels retain up to 120 UTF-16 units and normalize
surrounding whitespace only when preparing the command. Numeric fields retain
their 32-unit cap. ID-selection admission snapshots data descriptors, rejects
duplicate or malformed entries, and copies the ordered values before mutation.
The post-admission guard keeps a synchronous reflection callback from replacing
newer raw values or another session's diagnostic.

Saved assembly selections are frozen arrays with their original order. The
coordinator copies, compares and restores them through their finite field
metadata. It preserves one active adapter and keeps the parked payload inert.
An unchanged removal confirmation has no raw input to retain and releases its
transient slot on navigation. A blocked removal carries the command owner's
immutable dependency references; the accepted plan and its history stay intact.

An imported plan can claim the ID of a saved creation. The draft remains visible
with `creationConflict: true`. `freshId(token, displayedProjection)` explicitly
allocates another ID, retains every raw field, and binds a new lease to the
displayed current plan. It replaces the old slot, so recovery still works when
all eight slots are occupied. The visitor receiver describes this action as
using the entries for a new person or team. Earlier tokens stay retired.
Saved removed targets remain selectable for inspection and discard; their
review and Apply retain the current-target requirement.

Creation allocation builds one bounded occupied-ID set from the current
collection and held drafts, then searches at most its collection cap plus nine
candidate IDs. Ordered selection admission costs O(K + I × L), where K is the
supplied array's own-key enumeration, I ≤ 128 admitted entries and L ≤ 64 ID
units. Extra-property values remain unread. Copy/equality/restore operate only
on owned raw records, with O(I × L) storage and linear ordered comparison.
The largest team raw payload holds 8,312 UTF-16 units and 128 array slots; eight
such saved payloads hold at most 66,496 units and 1,024 slots, plus bounded keys,
markers and field containers. Complete previews cache by raw revision and exact
base; changed proposals keep #641's full preparation route. The adapter creates
no scheduled resources.

`command-draft.test.mjs` and `assembly-editing.test.mjs` cover literal $1,200 to
$1,440 creation, ordered selection ownership, numeric codec reuse, no-op and
preview behavior, dependencies, eight-slot recovery, imported collisions,
removed targets, scalar admission, synchronous reentry and disposal.

## Native coordination receiver

About loads `controller.mjs` as a module. Its parsed transitive graph retains
the canonical package geometry in local and production delivery.
`deployment/cpanel/primary-route-manifest.json` declares every reachable module
and its JavaScript media type; the shared closure check compares that ownership
with the runtime inventory in both directions. The production closure test builds an isolated
artifact with the real builder and follows its parsed import graph; removing
one dependency earns a failing closure observation. The shared local browser
server, focused visual-check server, and Canvas visual-reference server each
prove JavaScript media and exact module bytes. This module
group leaves the existing iframe package inputs with their current owners.

`mountCoordinationPanel(root, { studio, workId })` binds one cooperative Studio
owner and working session to one root. Calling it again returns the mounted receiver.
Its `read`, `refresh`, and `dispose` methods support controlled integration and
testing. A host that replaces accepted state calls `refresh`; the controller
then shows the new amount alongside any retained stale draft. Adjacent recovery
controls offer Review saved edits, Use current values, and Discard saved edits;
stale fields remain readable while Apply awaits a current editing lease.

The receiver validates its required elements before installing its listener group.
Initialization failure releases installed resources. Disposal removes those
listeners, ends the draft, and exposes the accepted static reading. A repaired
root can mount again. A persisted page transition retains the owner for browser
history restoration; an actual departure disposes it.

Mounting opens Session settings with a fresh draft. Its native summary handles
later opening and closing; Cancel returns focus to that summary.
Raw text and circular step buttons update one three-field draft. The in-card
draft investment updates from complete preparation while the amp head retains
the accepted amount. Explicit Apply commits one complete row, keeps Session settings
open, begins a fresh draft, and preserves focus on Apply. Applying valid
unchanged quantities preserves the accepted revision. Cancel retains the
accepted investment and closes Session settings. Composition input settles before
preview or Apply. Closing the native configuration disclosure retains the
draft, and responsive changes reuse the same elements and focus. This
receiver uses explicit Apply and creates no deferred request or periodic timer.
The adapter's deferred mode remains available to separately measured receivers.

The accepted amount, effort equation, person traces, and funding distinction all
read one immutable projection. Funded staffing plus additional purchases forms
the commitment; attributed allocation remains inside staffing. Incomplete
pricing carries its standing beside the known subtotal. The horizon is context:
the working-session count carries repeated participant effort while sprint
length, calendar placement, and per-sprint allocation need a later timing
contract. Integer-cent formatting retains exact cents through the admitted
monetary range.

One new accepted projection costs O(W + T + P) for receiver lookups and person
trace construction, in addition to the model's complete preparation. Raw edits
render three bounded fields in O(1), plus complete preparation for a changed
valid preview; the accepted trace is retained until its projection changes.
The receiver retains one rendered projection, one shared draft owner with one cached
preview, and one listener group. Issue #641 owns runtime cost observations and
any later optimization decision.

Industrial Ink supplies the dark amount plane and hard down-right shadows;
About's Soft Color Blocking palette supplies paper controls and trace cards.
The 52rem viewport seam pairs the session summary and settings. The form’s
20rem and 31rem container seams arrange its three quantity controls into two
rows and then one row. Each input sits above its circular minus/plus buttons at
every width. Below 12rem of available form width, the duration display stacks
its hours and minutes. All three
inputs display five digits with padding, including an accidental excess zero
that the visitor needs to correct. A combined hours/minutes display projects
the same draft into a compact radio-style reading. The duration group owns its
short explanation; the session-count hint sits beside its count. Variable
validation feedback and the investment preview follow all inputs, so their
wrapping can grow the card while preserving each input’s document position. The native panel uses document scrolling,
keyboard controls, visible focus, and system colors in forced-color mode.

## People and Teams receiver

`assembly-controller.mjs` adds creation, ordered memberships, list order and
removal confirmation to the existing People chapter. `team-controller.mjs`
continues to own the selected person's rate and funded time. Both borrow the
same draft coordinator. Their separate forms and action attributes keep input
and submission with the selected editor. The root resumes the selected editor
after Purpose or another chapter; saved entries also have their existing tray.

A person creation previews funded cost before Apply. A team creation or update
changes membership and its order; session participants remain their own work
records. Referenced removals display the accepted team, work or practice labels
that still use the record. The visitor can change those relationships first.
An imported creation collision offers a fresh identity while retaining all
entered text and ordered selections. Undo restores accepted identities and order.

Accepted projection identity controls list rebuilding. People and reference
indexes are rebuilt once per accepted projection. Membership rendering prepares
one position map and selection set, then visits selected and available people
once: O(P + M) time and retained DOM, where P is people and M is selected members.
The raw coordinator carries bounded arrays; whole-plan preparation still owns
validation and accounting. Each valid changed draft earns one cached preview.
The receiver retains its displayed projection, bounded maps, selected target
and listener group. Callback epochs protect a newer editor or disposed receiver
from late focus and announcement writes.

The About route stylesheet owns the shared palette and form geometry. Circular
step buttons stay below numeric inputs; feedback follows all input rows. The
focused assembly browser route observes literal monetary outcomes, membership
order, removal references, stale and collision recovery, callback ownership,
compact controls, and document scrolling. The existing person browser route
continues to own rate/funded-time interactions.

## Purpose and Investment receivers

`purpose-controller.mjs` lends the amp head a compact Purpose disclosure.
Six labelled text fields receive the shared `editing.purpose` port. Apply keeps
the editor open; Cancel restores accepted text. Closing the disclosure parks
unfinished text and resumes the selected chapter. A stale edit presents all six
current fields beside its saved text before Review grants a new lease. The
root owns the coordinator lifetime; the disclosure owns its DOM and listeners.
Purpose text uses `textContent` and contributes no implicit price adjustment.

`investment-controller.mjs` owns the Investment chapter: Undo/Redo, one baseline,
native starting-plan previews, file input and captured downloads. Commands bind
the displayed accepted projection; Restore also binds the displayed baseline.
A state change parks active text before history moves, preserving its recovery
route. Known-amount comparisons retain their incomplete pricing labels.

`exchange.mjs` owns one pending file request or prepared replacement preview.
A request binds accepted chronology and the coordinator's draft-intent marker.
A later selection, raw edit or acceptance retires the earlier intent. File size
is checked before acquisition and again against actual bytes; fatal UTF-8
conversion precedes the schema-owned parser. Every FileReader acquisition and
settlement route releases its listener group, including synchronous cancellation.
A readable file produces a preview; Use this plan explicitly replaces accepted
state. An active changed draft receives an Apply-or-discard response. Parked
raw survives replacement under its original target and requires review.

`presets.mjs` supplies two versioned, fresh-plan factories for current native
fields. Shared working sessions price twelve person-hours as $1,200 of extra
work. Sessions within funded time allocate the same effort inside $1,200 of
staffing. The preview names affected fields, record counts and a legacy format
conversion when one occurred. Later capability owners add the full Studio's six
scenarios through this same catalogue and migration boundary.

Download captures one accepted serialized string. The controller retains one
object URL after the browser receives the click, then releases it on replacement
or disposal. Rejected input leaves accepted state usable; its bounded diagnostic
and source text stay local to the exchange owner. The original full Studio and
its static counterpart retain their current carriers until Issue #638 places
the native Studio and collapsed table together. Issue #656 owns a later table
content refresh.

File preflight takes O(1); decoding, admission and canonical preparation take
O(B + N + R), where B is bounded bytes, N records and R references. Preview
summaries use stable-ID maps and sets in O(N + R) time and transient space.
They run once per prepared preview. Comparison DOM updates follow accepted
projection or baseline changes; raw keystrokes retain those nodes. Exchange
retains one pending controller, one preview or bounded rejected text, and tiny
identity markers. Caller-retained immutable captures retain their own payloads.
Apply re-admits the prepared plan through the existing state owner, preserving
Issue #641's measured complete-preparation policy.

The focused Investment browser receiver exercises purpose ownership, baseline
and history, actual file selection, version rejection/recovery, captured download
bytes, delayed-read identity, disposal/remount, and narrow scrolling across
Chromium, Firefox and Playwright WebKit. Source tests own byte limits, hostile
records, exact arithmetic and callback-acquisition faults. Native-device input
and a visitor's comprehension remain separate observations.

## Native Studio chapters

`shell.mjs` owns the amp head's manually activated Coordination, People and Investment
tabs. About authors each button, panel and stable ID; `controller.mjs` mounts
the shell after mounting the receivers against the same Studio instance. The
shell changes presentation and calls the parent receiver's selection callback.
The parent parks the outgoing edit and resumes the incoming target through the
shared coordinator. The amp head
continues to display the shared accepted amount.

`mountChapterShell(root, { onSelect })` returns `read()`, `select(chapterKey)` and `dispose()`.
Read reports the selected chapter and admitted chapter keys. Select reveals
one chapter, focuses its tab and records its owned fragment. Disposal cancels
motion, removes listeners and restores authored attributes without replacing
editor descendants. A subsequent mount reconciles the current fragment and
receives its owner's callback again. The complete Studio controller owns this
integration lifetime; disposing and remounting that controller retires drafts
and reuses the supplied accepted Studio. The callback receives one initial
chapter and each later selection. Reentrant disposal retires the transition
before a new animation is acquired.

An authored, labelled `[data-native-chapter-list]` begins hidden. Its named
buttons use `data-native-chapter` and `aria-controls`; corresponding sections
use `data-native-chapter-panel` and `native-studio-<key>` IDs. All working sections
begin visible for the static reading. The shell validates their complete
one-to-one relationship before adding tab semantics or hiding a panel. Future
chapters enter with their working content and finite icon geometry.

Arrow keys move tab focus. Enter or Space selects; Home and End reach the
ends. Tab continues into the active panel. The horizontal strip can reveal a
focused tab locally while About retains vertical scrolling. A chapter change
preserves mounted input elements, raw text and disclosure state. A later edit
in another chapter can make saved text stale through the accepted-instance
marker; explicit review binds a fresh edit to the current projection.

Owned fragments include the chapter panel IDs and existing descendants such
as `#native-team-title`. Direct entry and Back/Forward reveal the corresponding
panel while retaining that exact destination. A previously hidden descendant
or panel receives its scroll after the panel enters document flow. The shell
records its chapter in one versioned history-state field while retaining
other owners' fields. Back can therefore restore the initial Coordination
chapter when its entry has an empty fragment. Scalar and array history states
retain their representation and use fragment recovery. Unrelated About
fragments retain their existing scroll owner.

The shell retains one cancellable entrance animation, honours reduced motion,
and releases animation on a hidden document or disposal. A newer selection
settles its semantic state immediately and cancels the preceding visual.
An operation generation stops a superseded selection when a synchronous
focus callback disposes or re-enters the shell.
DOM discovery occurs once; the chapter map retains O(C) entries, and ordinary
selection updates the previous and next pair in O(1). Preparing entry metadata
copies H existing top-level history fields in O(H); the browser owns the
structured clone of that entry. Fragment recovery follows the target's ancestor
chain. Browser layout and paint retain their own costs.

`icons.mjs` creates fresh decorative SVGs for the three implemented chapters.
It carries the selected Lucide geometry and ISC notice in delivered bytes.
The [upstream receipt](vendor/lucide/README.md) records the exact pin and
complete licence. Visible button text supplies the accessible names. Each
controller mount inserts its icons once and removes those owned nodes at
disposal. The existing primary-module and source-closure owners carry delivery.

`styles/routes/about.css` owns the tactile buttons, fixed top-left lighting,
selected/focused states, wrapping introduction and narrow horizontal strip.
`tests/native-investment-studio/shell.test.mjs` observes admission, retained
nodes, history dispatch, cleanup, interrupted motion and fixed SVG construction
through a bounded DOM protocol fixture. Native focus, scrolling, paint and
accessibility remain with the shell's three-engine browser receiver.

## Data structures and pattern decisions

Ordered arrays preserve authored order in portable state. Preparation builds
private `Map` indexes once for each admitted revision and uses `Set` membership
for identity and reference checks. Those indexes support direct lookup during
calculation. Each person and work item has one accounting identity even when
several teams or practices reference it.

Immutable configuration and catalogue definitions are shared module values.
The accepted plan, revision, and mutation owner belong to each Studio instance.
Only immutable vocabulary has singleton lifetime. Configuration names units,
limits, supported versions, and discrete choices at one source owner.

| Pattern | Current use or activation condition |
| --- | --- |
| Factory | `createStudio` establishes an independent owner; scenario construction returns fresh candidate state. |
| Facade | The small command API concentrates admission, expected-revision checks, calculation, and exchange. |
| Flyweight | Frozen practice definitions and contract vocabulary share immutable meaning across assignments and instances. |
| Observer | Add instance-local subscriptions when native controls need accepted-revision notifications; expose an unsubscribe operation at that boundary. |
| Builder | Introduce when scenario assembly gains dependent construction steps that explicit records can no longer express clearly. |
| Composite | Introduce when the model admits genuinely nested work packages with declared aggregation and identity. |
| Visitor | Introduce when several independent operations traverse that same established heterogeneous structure. |
| Priority queue | Introduce a real heap when an accepted scheduler must repeatedly select a next item by an explicit priority policy. Current recurrence arithmetic needs ordinary bounded iteration. |

Public reads expose immutable prepared data. Getters that recalculate ledgers
would repeat work for every view, so the facade supplies the retained projection.
Setters enter the explicit command boundary rather than silently changing one
part of an accepted plan.

## Cost and input-frequency contract

Let P be people, T teams, W work items, R all participant/support reference
edges, A practice assignments, and B the bounded text and serialized payload. Admission, index
construction, reference validation, calculation, and field-owned projection
take O(P + T + W + A + R + B) time under ordinary expected Map/Set lookup. Prepared
state, indexes, results, and serialization take proportional memory. A complete
accepted edit prepares the admitted revision; the contract describes that
linear work explicitly.

Every accepted revision currently carries its complete serialized state.
Producing that string costs at least its output length, even if a later
calculator updates selected aggregates incrementally. Read, capture, and export
reuse the existing projection or string. Future optimization starts with a
measured receiving task: separate draft-input frequency, accepted commits,
calculation, serialization, rendering, and paint. A row-count threshold alone
leaves dependency fan-out unspecified; one rate edit can affect many work
records and both funding pools.

Array admission reads its own length data descriptor once, validates that
count, and uses the same count for key checks and iteration. A changing direct
JavaScript array view therefore retains one bounded traversal. Rejection of
direct object candidates also includes O(K) time and temporary key-array
space for K caller-supplied own keys enumerated before shape rejection.
`importText` supplies the byte-bounded external-data route. Direct object APIs
assume ordinary cooperative JavaScript receivers; arbitrary Proxy trap runtime
or callback exceptions remain caller code rather than an isolated data parser.

`read` and `capture` take O(1) work. The owner retains one current projection;
a caller retaining H historical captures retains the sum of those H revision
sizes. The [accepted chronology owner](#accepted-chronology-history-and-baseline)
retains 20 history entries by default, with a maximum of 100 and one baseline.

Static catalogue lookup and numeric rules are prepared outside the per-work
loops. The work pass resolves participants through its existing index; it
avoids a full people/team scan for each reference. Monetary and capacity
accumulators visit each relevant reference once. Serialization follows explicit
field order, retaining the authored order of collections.

Transport and collection limits bound one operation. The first tranche runs
locally and has no network request stream to throttle. A native control adapter
can later coalesce display work to one animation-frame update while retaining
the latest valid edit and an explicit final commit. Imports receive bounded
byte admission before parsing. Any asynchronous adapter also needs a request
identity so a late result respects intervening edits.

These are source-derived bounds. Browser rendering cost, responsiveness,
garbage collection, and measured workload limits require their fitting runtime
observations when the native receiver is introduced.

## Focused regression route

### Module delivery

`tools/native-studio-module-closure.mjs` parses the static ESM graph from
`controller.mjs`. It compares reachable modules with two independent owners:
the primary route manifest's path-identical JavaScript entries and the explicit
browser/shared inventory. Each owner covers the complete graph in both directions.
Local server tests check media type and exact bytes; the production test parses
the final projected bytes again and checks the About entry path.
After syntax admission, the existing esbuild dependency checks import/export
linkage using that exact in-memory source map.

The helper uses development-only Acorn 8.19.0 (MIT) to inspect authored syntax,
including dynamic imports inside branches a bundler can remove. Relative static
`.mjs` imports and re-exports stay within this package. Dynamic imports,
CommonJS loader references, and attributed imports receive typed diagnostics.
Runtime assets such as fetched data and constructed URLs retain a separate
asset observation when introduced. Parsing visits each module once; traversal
cost follows total source size and import edges, with a final sorted path list.
The parser and helper stay in the Node test/tool closure.

From the repository root:

```sh
npm run test:native-investment-studio:source
npm run test:native-investment-studio:coordination-browser
npm run test:native-investment-studio:team-browser
npm run test:native-investment-studio:chapters-browser
npm run test:native-investment-studio:investment-browser
npm run test:native-investment-studio:assembly-browser
node --test tests/context-canvas/about-studio-chapters.test.mjs
node --test tests/prod-deployment/primary-closure.test.mjs
```

The native tests establish independent monetary expectations, allocation versus
additional purchase, missing-rate completeness, paused obligations, capacity
overruns, invalid input recovery, stable reference identity, detached ownership,
revision conflicts, and native round-trip. The existing chapter test establishes
that its materialized receiver preserves the full Studio source.

The draft cases additionally protect raw-input retention, explicit target
settlement, latest-value and additive-step behavior, coherent field commits,
stale/foreign session recovery, deferred final flush, cancellation/disposal,
same-session cleanup reentry, and replacement-session request ownership.

The native control group adds independently priced edits, invalid-input recovery,
keyboard actions, retained drafts across disclosure and reflow, document wheel
scrolling, enlarged text, forced colors, reduced motion, stale-owner recovery,
failed-mount cleanup, remount, and a scriptless reading. These browser tests use
local placeholders for separately owned remote iframe and media requests. They
establish the native panel's behavior; the existing Studio and delivery tests
retain their own evidence. The receiving PR carries actual
commands and normalized results, independent review, and current human authority.

The chapter browser route owns manual tab focus and explicit activation,
retained work and person edits, stale commits across chapters, original fragment
destinations, history, shell disposal and remount, reduced motion, narrow local
scrolling, and the authored scriptless reading. Its state cases retain the exact
native About section and style closure; the WebKit reading case uses the complete
About document with the separately owned closed diagram's object navigation
isolated. Select this route for chapter behavior, and retain the coordination
and person routes for changes to their controls or state receivers.

## Continuing the native instrument

The coordination panel establishes the amp-head amount, funding distinctions,
explicit draft boundary, and trace. Team shaping, practices, change models,
comparison, and richer instrumentation can receive focused tranches through
Issue #637 after their capability and accounting contracts are settled.

About remains the leading home for the native showpiece.
[Issue #638](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/638)
owns the complete legacy Studio's later AI Systems reading route while
preserving its existing URL and capabilities. That move is distinct
from the capability/state tranche and from publication.

Re-entry begins at Issue #643's receiving observations, Issue #641's measurement
plan, and this package's focused tests. Issue #637 retains the wider sequence.

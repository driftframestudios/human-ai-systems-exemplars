# Native Investment Studio: capability and state foundation

This package gives the future About-page Studio one accepted planning state,
an inspectable investment calculation, and a recoverable edit boundary. Its
first tranche establishes those contracts before native controls receive them.
The intended receiver is an ordinary section of About: visitors keep the page's
vertical reading flow while they explore coordination, teams, practices, and
investment consequences.

[Issue #637](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/637)
holds the approved design and implementation sequence. The first tranche adds
the capability inventory, portable state, calculation, and state-owner APIs.
Visitor HTML, About's current Studio chapters, and the complete original Studio
retain their present behavior. The receiving pull request remains available for
human review; merging and publication remain held.

## Source map

- `config.mjs` owns the immutable units, input limits, contract vocabulary,
  and six practice definitions.
- `contract.mjs` owns `preparePlan`, `parsePlan`, `createExamplePlan`, and
  `PlanError`. Its synthetic scenario factory is the example's single source.
- `state.mjs` owns the `createStudio` facade and each instance's accepted
  revision.
- `tests/native-investment-studio/contract.test.mjs` and
  `tests/native-investment-studio/state.test.mjs`, relative to the repository
  root, own focused contract and state-transition observations.

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
| Keep and carry | Accepted analytical import/export, captured reports, and leave-behind snapshots | Native 0.1.0 round-trip, revision-bound edits, and exact captures. Existing exports remain usable in their original instruments. |

The original horizon draws approximate spans from selected role, activity, and
recovery rows. Its geometry supplies a visual precedent; actual native timing,
capacity scheduling, and priority policy require their own declared inputs.

## Portable state

The envelope uses kind `native-investment-plan`, schema version `0.1.0`, and
model version `0.1.0`. It carries `planId`, `revision`, `currency: "USD"`,
`horizonWeeks`, and the ordered collections below. Stable IDs carry identity;
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
`updateWork`, `importText`, `exportText`, and `capture` operations. Each accepted
mutation produces a newly prepared immutable revision. Mutations receive the
exact immutable projection returned by `read()` as their expected-state token:

- `replace(candidatePlan, expectedProjection)`
- `updateWork(workId, fullReplacementRow, expectedProjection)`
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
is rebuilt for replacement/import and reused for an ordinary work edit.

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
edit. Rejection preserves the prior snapshot. Native 0.1.0 export/import retains
the supported state. Legacy Studio exports and unknown schema versions receive
an explicit compatibility result; their original instruments remain the fitting
receivers while a future adapter establishes a tested transformation.

UI drafts, open menus, reversed-card faces, focus targets, and reading position
belong to the future presentation adapter. A draft can remain editable while
the accepted amount and export continue to describe the last valid revision.

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
sizes. The future baseline/undo owner must choose its history retention bound.

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

From the repository root:

```sh
node --test tests/native-investment-studio/contract.test.mjs tests/native-investment-studio/state.test.mjs
node --test tests/context-canvas/about-studio-chapters.test.mjs
```

The native tests establish independent monetary expectations, allocation versus
additional purchase, missing-rate completeness, paused obligations, capacity
overruns, invalid input recovery, stable reference identity, detached ownership,
revision conflicts, and native round-trip. The existing chapter test establishes
that its materialized receiver preserves the full Studio source.

The first tranche's source and state contracts need focused model observations.
A later native control group earns its own keyboard, focus, scroll, reduced
motion, narrow-width, and cross-browser checks. The receiving PR carries actual
commands and normalized results, independent review, and the human review hold.

## Next native receiver

The approved amp-head composition places the primary total at the top right as
an LED-like number and its subordinate amounts at the lower left. Every amount
keeps a visible unit and completeness label. A future trace panel consumes the
same accepted revision. Controls continue to use native keyboard and direct
numeric-entry behavior beneath their tactile visual treatment.

About remains the leading home for the native showpiece.
[Issue #638](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/638)
owns the complete legacy Studio's later AI Systems reading route while
preserving its existing URL and capabilities. That move is distinct
from the capability/state tranche and from publication.

Re-entry begins at Issue #637 and this package's focused tests. The next bounded
tranche can bind a coherent native coordination control group to this accepted
state owner after the human reviews the foundation.

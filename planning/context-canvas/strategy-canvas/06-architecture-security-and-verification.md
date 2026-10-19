# Strategy Canvas — architecture, security, and verification payload

```yaml
research_payload:
  id: "prototype-exemplars.strategy-canvas-architecture-verification.v0.1"
  question: "Which small web-platform architecture preserves semantic parity, collaboration integrity, portability, and extension seams?"
  completion_condition: "One deterministic state model drives HTML, SVG, table, export, report, and test fixtures across canonical and Context expressions."
```

The [machine-readable evidence registry](../../../core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-evidence.v0.1.json) connects the diagram, structured table, and text-alternative route to `complex-image-equivalent`. The guidance shapes the implemented relationship; relevant people and technologies establish practical access.

## Architecture decision

Use semantic HTML, layered CSS, accessible inline SVG, and dependency-free JavaScript. The working set of 5–12 dimensions and a small number of visible series fits the browser platform directly. A framework or visualization library may be reconsidered when measured complexity exceeds the current reducer, renderer, and test contracts.

## Source and distribution topology

- One schema v2 contract.
- One pure state normalizer and reducer vocabulary.
- One aggregate/selectors module.
- One shared state spine with expression-specific SVG renderers; each renderer derives action bands, guides, labels, paths, handles, and pointer restoration from one local column-center geometry.
- Expression-specific controllers for canonical and Context experiences.
- One source build that can emit self-contained portable HTML distributions.
- Explicit adapters for v0.1 and Narrative `now/next/later` dialects.
- Manifest and registry entries identify semantic and presentation versions separately.
- A deterministic consumer-bundle builder produces the Narrative Composer, Semantic Sampling, Technology Fit, and Threadkeeping Ledger archives. It fixes file modes and timestamps, checks embedded byte/SHA receipts, and preserves the current canonical worksheet, schema, validator, and evidence registry as the portable Strategy Canvas companion.

The canonical core stays compact and closed around shared Strategy Canvas objects. Consumer state enters through namespaced extensions:

- `extensions.narrativeProjection` carries the Narrative Capsule adapter identity, mapping, and migration receipt;
- `extensions.contextCanvas` contains the strictly typed workbench `collaboration` and `aiCollaboration` objects. The outer `strategy-canvas/2.0` identity governs this first extension shape; the extension adds no competing nested version field.

Core normalization preserves extension namespaces. Each consumer validates the namespace it owns.

Generated copies carry a source marker and parity check. Consumer routes depend on declared schema identity rather than filename similarity.

## Reducer vocabulary

- `ARTIFACT_IMPORTED`
- `DIMENSION_DEFINED`
- `DIMENSION_REORDERED`
- `SERIES_VALUE_SET`
- `ROUND_OPENED`
- `BALLOT_DRAFTED`
- `BALLOT_SUBMITTED`
- `ROUND_SEALED`
- `ROUND_REVEALED`
- `BALLOT_AMENDED`
- `SCENARIO_CREATED`
- `PROPOSAL_POINT_MOVED`
- `PROPOSAL_RETURNED_TO_AGGREGATE`
- `NOTE_ADDED`
- `EVIDENCE_ATTACHED`
- `DECISION_RECORDED`
- `SNAPSHOT_REVIEWED`
- `REVISION_RESTORED`
- `AI_PACKET_SCOPED`
- `AI_SHADOW_ROUND_OPENED`
- `AI_PROPOSAL_IMPORTED`
- `AI_PROPOSAL_ADOPTED`

Derived aggregates are selectors. They remain outside editable source state or carry a clear cache/derivation marker.

### Channel invariants

- `HumanBallot` is an authored observation accepted by one human round.
- `SystemAggregate` contains a derivation recipe and references accepted human ballot revisions.
- `AIProposal` contains attribution, prompt/packet reference, scope receipt, and adoption state.
- Aggregate selectors accept human ballots only.
- The AI shadow round is enabled after reveal and reads a reviewed, consented projection.
- The prototype assembles, copies, downloads, pastes, and imports packets locally; it performs no network request.

The v0.2 Context namespace serializes the current shadow-round interaction as a single `aiCollaboration` record. Its dimension-keyed proposals, note, standing, consent scope, reviewed revision, preparation time, posture, and local network policy preserve the boundary without adding a `shadowRounds[]` array.

## CSS contract

```css
@layer reset, tokens, base, layout, components, states, modes, utilities;
```

Public custom properties cover:

- paper, ink, muted, grid, focus, and state colors;
- type families and scale;
- spacing and content measures;
- point body, hit halo, and path sizes;
- border, corner, and shadow treatment;
- plot density and presentation scaling.

Canonical selectors remain namespaced and low-specificity. Context overrides use the public token/state contract. State meaning also travels through text and geometry.

## SVG contract

- Stable shared `viewBox` coordinate model.
- Factor centers use half-column offsets, keeping the first and last oversized hit halos clear of the plot axes while action-band bounds occupy the corresponding full columns.
- Local `<title>` and `<desc>` for meaningful groups.
- Semantic group IDs for axes, series, dimensions, distributions, and annotations.
- Geometry and accessible table derive from the same normalized state.
- User-authored text enters through DOM text APIs.
- Decorative grid and interaction halos stay outside the accessibility tree.
- Focus targets remain bounded; native controls provide the complete editing route.
- Named local scrollers and intrinsic SVG view boxes preserve access to the full field when the surrounding layout narrows.

## Persistence levels

| Level | Capability | Boundary |
| --- | --- | --- |
| page session | complete interaction in memory | default |
| explicit local draft | opt-in local storage/IndexedDB | labelled device-local state |
| JSON import/export | portable durable artifact | user-controlled file |
| same-origin tab demo | `BroadcastChannel` | one browser profile/origin |
| authenticated sync | persistence adapter + service | separately designed service horizon |

Static GitHub Pages can host the complete single-device experience, schema, fixtures, and downloads. Authenticated simultaneous multi-device voting enters through the persistence adapter after identity, privacy, retention, conflict, and authorization decisions are reviewed.

## Import and migration contract

An import reports:

- detected dialect/version;
- fields mapped directly;
- fields translated by declared adapter;
- values clamped or rejected;
- preserved extension fields;
- open semantic ambiguities;
- resulting schema identity;
- whether the artifact is ready, provisional, or requires review.

Narrative `now/next/later` maps explicitly to current/good-enough/desired only when the adapter is selected and the import receipt states that interpretation. Unknown values remain in an extension envelope or open field.

## Security and privacy posture

- Treat imported JSON and all participant text as untrusted data.
- Parse data without executing it.
- Render text through `textContent` or equivalent DOM APIs.
- Validate type, range, length, IDs, uniqueness, and reference integrity.
- Preflight canonical imports before normalization: UTF-8 payloads are limited to 512 KiB, object/array nesting to 32 levels, and the parsed value graph to 20,000 values.
- Validate the complete published schema—including closed object shapes and nested Context collaboration records—through the generated schema validator before domain reference checks run.
- Keep exports local until the participant initiates download or a separately authorized service transfer.
- Keep private ballot views out of aggregate-only reports.
- Include reviewed fields in AI packets only when the packet consent/scope record selects them.
- Keep AI proposals outside human ballot collections and aggregate selectors.
- Avoid durable personal identifiers by default.
- Apply iframe sandbox and permission policy according to the operations the embedded workbench actually needs. The current receiving contract grants scripts and downloads through the sandbox plus `clipboard-write` through Permissions Policy; same-origin, top-navigation, popups, and fullscreen remain outside the granted set.
- Use a restrictive CSP when distribution topology permits it.

## No-script and failure posture

The initial HTML contains:

- orientation and method posture;
- complete example chart or meaningful SVG;
- semantic dimension/series table;
- instructions and input implications;
- evidence boundary;
- print-ready leave-behind specimen.

JavaScript enriches editing, direct manipulation, rounds, scenarios, and export. A runtime failure leaves the reading intact. Import errors preserve the current artifact and present a review receipt.

## Verification matrix

### Static and schema

- JSON/JSON-LD/schema parse.
- schema fixture validation.
- unique IDs and resolved references.
- HTML and SVG ID/ARIA integrity.
- local links and fragments resolve.
- generated distribution parity.
- deterministic archive parity and embedded manifest byte/SHA receipts.
- diff whitespace and syntax.

### State and calculation

- reducer determinism.
- undo/redo and revision restoration.
- mean/median/range/IQR fixtures.
- missing/abstained/amended readings.
- aggregate immutability under scenario edits.
- authored/view order separation.
- v0.1 and Narrative migration receipts.
- three-channel type separation and aggregate input guard.
- consent/scope projection fixture.
- post-reveal AI shadow round and local copy/paste path.

### Interaction

- complete keyboard route.
- mouse, touch, and pen-equivalent pointer routes.
- tap, buttons, number input, and drag parity.
- escape/cancel behavior.
- overlap resolution.
- sealed round and privacy curtain.
- reveal, amendment, review, and report flow.
- browser Back/Forward for native route state where applicable.

### Visual and accessibility

- 390, 1440, 1920, and 2560 CSS-pixel widths.
- Reciprocal viewport reflow profiles model the geometry pressure of 200% and 400% zoom; an actual browser/assistive-technology zoom receipt remains a manual gate.
- forced colors and high contrast.
- reduced motion.
- print/PDF.
- text alternatives and meaningful source order.
- focus visibility and target size.
- no document-level horizontal overflow; named local scrollers remain usable.

### Security and lifecycle

- literal markup-like text remains literal.
- malformed, oversized, duplicate-ID, and deep import fixtures fail safely.
- high-node-count imports fail before migration, cloning, or rendering.
- unauthorized and authorized AI packets recursively omit participant aliases and IDs, per-person ballots, local events, and raw aggregate arrays; note inclusion follows the reviewed-record consent scope.
- object URLs are revoked.
- listeners and observers are released.
- local draft disclosure and clearing work.
- iframe embedding follows the declared sandbox/permission contract.
- local prototype completes with network requests blocked.

## Coverage ledger

| Contract | Canonical | Context | Consumer/adapter | Automated evidence |
| --- | --- | --- | --- | --- |
| schema v2 | imports/exports | extended state | Narrative adapter | schema fixtures |
| pure reducer | score/setup actions | rounds/scenarios/notes | migration action | deterministic tests |
| SVG renderer | reference worksheet | facilitation field | mini-canvas subset | geometry parity |
| semantic table | complete | complete | compact | table/state check |
| progressive enhancement | full reading | full reading | full reading | JavaScript-disabled check |
| input safety | exact schema + bounded import | exact schema + literal text | normalized unique IDs + bounded strings | negative-schema and adversarial-ID fixtures |
| reports | print specimen | reviewed leave-behind | projection receipt | report parity |

## Completion gate

- Canonical, Context, and Narrative fixtures normalize to schema v2 with explicit receipts.
- The same normalized state produces matching table, SVG, JSON, and report values.
- All calculation and aggregate-immutability fixtures pass.
- Human ballot, system aggregate, and AI proposal channel-invariant fixtures pass.
- The AI shadow round follows reveal, honors consent/scope, makes no network request, and leaves aggregate output stable.
- Browser-level interaction and visual matrices pass at the four declared CSS viewports, reciprocal zoom-reflow profiles, and media modes; actual hardware touch and browser zoom receipts remain explicit review inputs.
- No-script, runtime-failure, invalid-import, and privacy-boundary paths preserve a useful artifact.
- The source/distribution parity check prevents hand-edited copy drift.
- Remaining cross-device service work is represented by a stable adapter interface and an explicit open condition.

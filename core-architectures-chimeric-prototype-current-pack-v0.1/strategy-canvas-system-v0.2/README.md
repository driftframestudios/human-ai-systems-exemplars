# Strategy Canvas system v0.2

This directory provides the authoritative source boundary for the neutral canonical Strategy Canvas and its compatible collaboration variants.

## Source roles

- `strategy-canvas.schema.json` defines the canonical state’s accepted fields and the explicit `extensions` namespace for compatible additions.
- `strategy-canvas-validator.template.js` provides the self-contained Draft 2020-12 subset runtime used by this schema; the build embeds the exact published schema in generated `strategy-canvas-validator.js`.
- `strategy-canvas-core.js` provides portable shared state, validation, migration, aggregation, history, JSON-LD, and prompt-capsule logic.
- `strategy-canvas.css` is the neutral, low-specificity canonical visual contract.
- `strategy-canvas-canonical.js` renders and progressively enhances the canonical HTML surface.
- `canonical.template.html` contains the authored document structure and the semantic static baseline.
- `strategy-canvas-evidence.v0.1.json` records the method origin, research-to-implementation decisions, counterevidence, and transfer limits shared by each current representation.
- `build.mjs` assembles the self-contained v0.2.2 distribution one directory above and keeps the v0.1.1 compatibility route available.

The canonical template owns Strategy Canvas authorship metadata, its license
relation, and the semantic attribution footer. `strategy-canvas.css` owns the
footer's in-flow visual treatment. The generated current distribution inherits
those source-owned declarations. Edit the template or stylesheet, rebuild the
distribution, and run the parity check. The current visitor set covers v0.2.2;
the v0.1.1 compatibility route keeps its stable route identity while its
redirect target advances to the current distribution. The adapted Context
Canvas workbench keeps the current declarations
in its local document and stylesheet.

Generate the distribution:

```sh
node core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/build.mjs
```

Confirm source-to-distribution parity:

```sh
node core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/build.mjs --check
```

Exercise the DOM-independent state, migration, history, aggregation, and
serialization cases from the repository root:

```sh
npm run test:core-architectures
```

## Shared runtime boundary

`window.StrategyCanvasCore` exposes:

- `createStore(initialState)` with `getState`, `dispatch`, `subscribe`, `undo`, `redo`, `canUndo`, and `canRedo`.
- Pure `reducer`, action creators, and selectors.
- `normalizeState`, `validateState`, and `migrateV1`.
- `aggregate`, `serialize`, `toJSONLD`, and `promptCapsule`.

The store publishes detached state observations. `getState`, `dispatch`, `undo`,
and `redo` return structured clones, and each subscriber receives its own clone.
Callers can shape those local values while dispatch remains the mutation route
that records history and notifies listeners.

Score normalization and reducer updates align values to steps measured from the
declared scale minimum. Aggregation includes finite numbers and finite numeric
strings; null, blank, and non-numeric readings remain absent from the result.

The canonical renderer is exposed separately as `window.StrategyCanvasCanonical`. Context-specific surfaces consume the core while retaining their own DOM and art-direction layer.

After mounting, the canonical page publishes frozen `window.strategyCanvasCanonical` inspection methods: `getState`, `getValidation`, `serialize`, `toJSONLD`, and `promptCapsule`. Each structured result is a clone, so inspection remains stable while the controller retains sole access to the mutable store.

The semantic static baseline is the dependable initial reading surface. A successful controller mount renders the interactive field, moves the skip link to that field, marks the root `data-sc-enhancement-state="mounted"`, and then replaces the baseline with the enhanced experience. Until every core, controller, and mount step completes, the baseline stays visible and controls remain in their pre-mount state. The `data-sc-enhancement-state="mounted"` marker makes the transition observable. The build confirms these boundary markers and reports the generated distribution’s byte count and SHA-256 digest as parity receipts.

Canonical objects accept the published schema fields. The validator rejects undeclared canonical fields, while compatible additions have a supported home under `state.extensions.<publishedNamespace>`. The Context Canvas contract is:

```text
state.extensions.contextCanvas = {
  collaboration: {
    session, participants, rounds, ballots, scenarios,
    acceptedScenario, notes, reviewedSnapshots, events
  },
  aiCollaboration: {
    promptPreparedAt, posture, proposals, proposalNote, standing,
    networkPolicy?, consentScope?, reviewedRevision?, shadowRounds?
  }
}
```

Human ballot records use `channel: "human-ballot"`, and the human aggregate selects that channel as its sole source. Computed summaries occupy reviewed snapshots; the ballot ledger remains reserved for authored human-ballot records, preserving ballot provenance. AI suggestions use `standing: "AI-attributed proposal"`. An optional post-reveal AI shadow round carries `includedInHumanAggregate: false`, keeping the human result attributable while allowing a visibly separate comparison. Facilitated scenario acceptance occupies its own reversible state, so participants can compare a scenario, accept it, or return to the prior field. Canonical reducer actions preserve the full extension namespace.

The local prototype operates entirely on-device with a zero-request network posture. A connector-enabled surface can assemble an external packet after it presents an explicit network policy, consent scope, reviewed revision, and receiving service. Those four declarations provide the observable authorization boundary for transport.

## Method and evidence basis

The Strategy Canvas was developed by INSEAD strategy scholars W. Chan Kim and
Renée Mauborgne as a diagnostic and action framework for Blue Ocean Strategy.
The [authors' method description](https://www.blueoceanstrategy.com/tools/strategy-canvas/)
and [INSEAD book record](https://www.insead.edu/faculty-research/publications/books/blue-ocean-strategy-expanded-edition-how-create-uncontested)
are the primary origin sources. This repository adapts the comparison form for
internal collaboration. Good-enough thresholds, consequence weights,
lifecycle, evidence, participant input, and AI collaboration fields are local
extensions.

The machine-readable [evidence ledger](strategy-canvas-evidence.v0.1.json)
connects each included source to an implementation decision, its transfer
limit, and the representations that receive it. The canonical build reads its
copy directly from this ledger; focused contract checks keep the Context,
Narrative, Genomic, and initiative-costing notes aligned with their named
registry entries. The principal routes are:

| Decision in this system | Evidence basis | Limit carried with the decision |
| --- | --- | --- |
| Keep direct manipulation, labelled native controls, immediate feedback, and undo/redo together. | Shneiderman (1983); Heer and Shneiderman (2012) | These works motivate the interaction pattern and do not evaluate this implementation. |
| Keep the profile and exact-value table as adjacent semantic twins. | Larkin and Simon (1987); W3C complex-image guidance | A diagram can support different lookup work; it is not universally easier to understand. |
| Use aligned position for the curve and repeat exact values in text. | Cleveland and McGill (1984) | Elementary graphical-judgment results do not validate this local scale. |
| Keep independent readings available before an explicit reveal in the Context adaptation. | Lorenz et al. (2011), read with Farrell (2011) | The evidence is task- and context-dependent; social information can also help individual estimates. |
| Name the current dimension through text, border, and color. | Treisman and Gelade (1980), applied cautiously | Redundant cues still require accessibility and comprehension testing. |
| Pair local scores with observable anchors, evidence, and participant spread. | Tversky and Kahneman (1974) | Inspectable context does not remove anchoring effects or other judgment biases. |
| Let teams define readiness-related dimensions while keeping readiness measurement separate. | Weiner (2009) | The canvas is not a validated measure of organizational readiness. |

The local 0–10 scales remain authored comparison coordinates rather than
psychometric measures. The canvas makes definitions, evidence, uncertainty, and
differences inspectable; it leaves claims about strategy success, change
readiness, comprehension, and decision improvement to evidence designed to
answer those questions.

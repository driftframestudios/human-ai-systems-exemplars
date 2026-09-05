# Implementation coverage ledger

This ledger connects the Strategy Canvas collaboration claims to concrete receiving artifacts and review evidence. It is a durable route map for future iteration; visitor-facing surfaces remain centered on the work participants can perform.

Status language:

- **present** — the artifact or contract exists in the branch;
- **verified** — an automated or manual check has supplied the named evidence;
- **review-ready** — all release-blocking gates have evidence and the human review packet can be assembled; named field-validation and optional-adapter work remains visible as follow-on collaboration.

## Contract-to-surface coverage

| Contract | Canonical expression | Context Canvas expression | Portable consumer | Evidence route | Status |
| --- | --- | --- | --- | --- | --- |
| Shared `strategy-canvas/2.0` state | schema, core reducer, import/export, semantic table | schema-preserving workbench state | Narrative adapter emits v2 | schema validation + contract harness | verified |
| Dimension meaning precedes scoring | definition, evidence basis, low/middle/high anchors | dimension setup and inspector | dimension-labelled NOW/NEXT/LATER controls | label, length, and fixture assertions | verified |
| Current, good-enough, desired remain separate | three series and table columns | current baseline and scenario layers | explicit NOW→current, NEXT→goodEnough, LATER→desired mapping | round-trip adapter receipt | verified |
| Consequence weight guides attention | distinct field outside profile coordinates | distinct field in setup/inspection | retained by adapter | mutation and serialization checks | verified |
| Human ballot channel | explicit participant/round/ballot entities | sealed turn-taking before reveal | preserved inside Context extension when supplied | ballot-only aggregate contract | verified |
| System-derived aggregate channel | aggregate readings include count, center, spread, missingness | revealed group layer | carried as reviewed state rather than authored score | aggregate fixture assertions | verified |
| AI-attributed proposal channel | typed extension contract | optional post-reveal proposal surface | consent-scoped prompt packet | standing, timing, and exclusion assertions | verified |
| AIShadowRound interaction | documented as a post-reveal interaction | one local post-reveal AI collaboration step | one `aiCollaboration` record plus attributed `proposals` in v0.2 | shape assertion; aggregate exclusion | verified |
| Consent-scoped AI packet | reviewed revision and selected scope | explicit review-state inclusion choice | portable packet | recursive redaction, note scope, and provenance assertions | verified |
| Reversible scenario | baseline stays recoverable | manual move creates or updates a scenario | scenario remains distinct in v2 export | scenario/revert browser contract | verified |
| Direct manipulation equivalence | large SVG point, native range, step buttons, table | large-screen drag plus explicit controls | larger preview points and labelled inputs | pointer, keyboard, reciprocal zoom-reflow checks | verified for keyboard, pointer, focus, and reflow; touch hardware and actual browser zoom receipts open |
| Reviewed leave-behind | JSON, JSON-LD, print/table reading | decision receipt and reviewed report | adapter receipt and v2 seed | one-snapshot report source, revision, value, and receipt assertions | verified |
| Local execution boundary | dependency-free generated artifact | local CSS/JS workbench | local adapter | local static-server telemetry and declared `local-only` policy | verified for this prototype boundary; service adapter remains outside scope |
| Compatibility | v0.1.1 route leads to canonical v0.2.4 | v0.1.1 route leads to Context v0.2.2 | registries name each current owner and compatibility route | route and anchor checks | verified |
| Versioned Prompt Capsule | plain and skill-assisted GitHub Flavored Markdown share one state fingerprint; both views and the native Related loops disclosure share one loop-metadata owner | Context v0.2.2 keeps its independently maintained capsule | portable Markdown names source, contract, scope, evidence, recovery, and conditional public loops | checked example + pure and browser semantic-twin contracts | verified |
| Downloadable consumer snapshots | canonical v2 and schema travel as the portable companion | Context-resolved source variants retain their route standing | root + Context Narrative, Semantic, and Technology archives | deterministic rebuild, embedded receipt, and archive-link checks | verified |

## Three-channel invariant

The interaction model keeps three authorities visible:

1. `HumanBallot` records what a named participant submitted during an elicitation round.
2. `SystemAggregate` is a derived reading computed only from eligible human ballots.
3. `AIProposal` is an attributed suggestion with its own standing and consent scope.

An AIShadowRound is the optional post-reveal interaction that prepares a portable prompt and receives proposals. In the v0.2 state shape, this interaction serializes as the single `extensions.contextCanvas.aiCollaboration` record and its `proposals` map. The aggregate input set remains the submitted human ballots.

## Consumer and route inventory

| Consumer | Current route or contract | Compatibility posture |
| --- | --- | --- |
| Canonical pack index and manifest | `strategy-canvas-chimeric-prototype-v0.2.4.html` | v0.1.1 remains an accessible compatibility route; v0.2.0 through v0.2.3 remain recorded predecessors |
| Context pack index and manifest | `strategy-canvas-chimeric-prototype-v0.2.2.html` | this independently maintained workbench and its v0.1.1 compatibility route keep their accepted current standing |
| Shared artifact-model registry | `strategy-canvas/2.0`; `extensions.contextCanvas` | recommended entities include migration and review concepts |
| Narrative Capsule Composer | `strategy-canvas-v2-adapter.js` | NOW/NEXT/LATER mapping is named and receipted |
| Grammar Family | public Core v0.2.4 embed | the opaque iframe supports the implemented Markdown download; its adjacent local full view remains the Context v0.2.2 workbench |
| FMI / LIMS / ELN receiving page | public Core v0.2.4 embed | working-example values keep an explicit replace-with-participant-data standing; the adjacent local full view remains the Context v0.2.2 workbench |
| Cross-Functional Investment Studio | Four Actions planning-lens adaptation | the existing route-specific popup profile carries its official method source; local suggestions retain their planning standing |

## Completion gates

### Semantic integrity

- [x] Schema version and canonical state shape are declared.
- [x] Context state is namespaced under `extensions.contextCanvas`.
- [x] Narrative projection state is namespaced under `extensions.narrativeProjection`.
- [x] Human, derived, and AI channels carry distinct entity identities and standing.
- [x] The v0.2 AI collaboration serialization is one record with attributed proposals.
- [x] Canonical default state, Context default state, and reviewed fixture validate against the same schema.
- [x] Contract tests demonstrate that AI proposals and derived readings stay outside aggregate inputs.
- [x] Adapter round-trip preserves score identity and supplies a deterministic receipt.
- [x] The generated browser validator enforces the exact published schema before domain invariants, including closed nested Context records and string bounds.
- [x] Negative schema fixtures cover closed shapes, required fields, constants, bounds, references, and lifecycle snapshot structure.

### Interaction and accessibility

- [x] Large point targets and explicit control equivalents are implemented.
- [x] Every compact consumer score control has a dimension-specific accessible label.
- [x] Keyboard, pointer, focus, reveal, scenario, and revert paths pass browser checks.
- [x] Action bands, guides, factor labels, paths, and point handles share one half-column geometry; outer hit halos clear both plot edges.
- [x] 390, 1440, 1920, and 2560 CSS-pixel checks preserve legibility and reachability.
- [x] Reciprocal viewport profiles preserve reachability under the layout pressure modeled for 200% and 400% zoom.
- [ ] Field validation: touch-hardware and actual browser/assistive-technology 200%/400% zoom checks receive manual receipts. This extends the verified code contract and does not block repository review.
- [x] Reduced-motion, forced-colors, accessible naming, and print checks pass.
- [x] The Markdown view selector is a native labelled radio group; view changes retain focus and announce their result.
- [x] The native Related loops disclosure remains keyboard-focusable, touch-sized, activatable, and available without JavaScript; its exact two-loop set derives from the same metadata as both Markdown views.
- [x] Plain Markdown remains readable and manually copyable without JavaScript; the mounted surface copies and downloads the exact active-view bytes.

### Collaboration and handoff

- [x] A human-first sealed elicitation path precedes group reveal.
- [x] Count, missingness, center, and spread have receiving fields.
- [x] AI packet inclusion is governed by reviewed state and explicit consent scope.
- [x] Both unauthorized and authorized AI packets recursively redact participant identity, ballot records, local events, and raw aggregate arrays; reviewed-note inclusion follows consent scope.
- [x] Current routes and compatibility routes are named in registries and manifests.
- [x] Four maintained Narrative consumer archives rebuild deterministically; packaged manifests, hashes, and portable routes match their declared members. The Narrative Capsule archive also verifies the local link closure of its included Strategy Canvas companion.
- [x] Reviewed report, exported JSON, semantic table, and visible diagram derive from one reviewed snapshot; reopening advances exactly one working revision while retaining reviewed provenance.
- [x] The local-only prototype completes from the repository static server without external requests.
- [ ] Optional adapter: durable storage and recovery receive a separately designed service boundary and fresh-session receipt. The current local, session-scoped instrument keeps this work outside its release contract.
- [x] Grammar Family and FMI embeds expose only the permissions earned by their implemented actions.
- [x] Both Prompt Capsule views preserve one state fingerprint, exact public skill paths carry an immutable revision, and malformed import recovery retains the accepted Markdown and state.

### Review-ready threshold

Review-ready means every release-blocking gate has evidence, canonical registries resolve to v0.2.4, the independently maintained Context registry remains on v0.2.2, compatibility routes resolve through their own owners, and the final change inventory identifies generated artifacts separately from source files. Unchecked gates explicitly labelled **Field validation** or **Optional adapter** remain nominated follow-on work outside the current repository release contract.

## Current v0.2.4 verification route

- `npm run test:strategy-canvas` — **43/43 checks passed** on 2026-09-04. The focused contract covers both maintained expressions and their compatibility routes, the native Prompt Capsule view control, exact active-view byte agreement, and a source-generated Related loops disclosure with keyboard, focus, target-size, activation, and no-JavaScript observations.
- Canonical generated distribution — **165,571 bytes**, SHA-256 `c1996b735dd71c030f98a57e5e20dadf44e75fdccfda0c2378b34f285e946c23`; the builder checked the default Markdown example and generated the native disclosure from the same core metadata before source/build parity passed.
- `npm run test:iframe-routes` — **29/29 checks passed**. `npm run check:iframe-routes` verified the two-family package at 38 routes, 68 files, and 3,379,525 bytes without live delivery mutation.
- `npm run test:core-architectures` — **15/15 checks passed** with current manifest, historical artifact, public-anchor, and fingerprint boundaries intact.

## Historical verification receipt · v0.2.3

- `npm run test:strategy-canvas` — **42/42 checks passed** on 2026-09-04. The focused contract covered both maintained expressions and their compatibility routes, plus the native Prompt Capsule view control, checked plain default, one view-independent fingerprint, exact active-view copy and download bytes, public skill routes paired with exact path/revision/SHA-256 coordinates, no-JavaScript reading, state roundtrip, and retained-state recovery.
- Final preserved canonical distribution — **161,641 bytes**, SHA-256 `3bd973a204d148a593569610308f92e92f0541d34ab4aa569f21ae904ed39938`; the file remains available at its versioned path for exact recovery.
- `npm run test:iframe-carriers` — **3/3 inventory checks and 60/60 browser paths passed**. Both real Strategy Canvas host pages retained an opaque origin with only `allow-downloads allow-scripts` and `clipboard-write`; each framed download matched the visible active-view Markdown bytes.
- `npm run test:iframe-routes` — **29/29 checks passed**. `npm run check:iframe-routes` verified the two-family package at 38 routes, 68 files, and 3,375,473 bytes without live delivery mutation.
- `npm run test:public-reference-materializer` — **101/101 checks passed**, including exact preservation of the route-owned download and script sandbox profile.
- `npm run test:core-architectures` — **15/15 checks passed**; `npm run test:context-canvas` — **77/77 checks passed**.
- `npm run test:canvas-iframe-routes` exercised the Cross-Functional Investment Studio’s Four Actions source through its existing route-specific popup profile.

## Historical verification receipt · v0.2.2

- `npm run test:strategy-canvas` — **41/41 checks passed** on 2026-09-04. The focused contract covered registry-to-representation copy, desktop and narrow initial/focus/selected states, meaningful chart-control visibility after actual Tab and Enter input at 390px, forced-colors focus and selection, direct method-source navigation, state round trips, both maintained expressions, and compatibility routes.
- Final preserved canonical distribution — **142,235 bytes**, SHA-256 `93f5e2b138461f85b4980b849550f7c86cc51d7eaf16bf8429d1ea632034372a`; the file remains available at its versioned path for exact recovery.

## Historical verification receipt · v0.2.0 and v0.2.1 foundation

The following receipt records the earlier implementation baseline. Current v0.2.4 commands and generated-distribution identities belong to the accepting change return so this history remains useful without presenting an earlier digest as current.

- `npm run test:strategy-canvas` — **36/36 checks passed** at `.visual-runs/2026-08-22T05-05-16-708Z-strategy-canvas-contract`, covering both expressions, four viewport bands, reciprocal zoom-reflow profiles, unified column geometry, keyboard SVG routing, sealed reveal, aggregate-preserving scenario work, AI-channel separation, recursive packet redaction, reviewed-report source parity, historical review preservation across a new starter field, literal text rendering, reduced motion, forced colors, print, no-script and forced-mount-failure readings, bounded import failure, three compatibility routes, and both Narrative consumers.
- Final selector visual receipts — canonical `.visual-runs/2026-08-22T05-10-38-512Z-strategy-canvas-canonical`; Context `.visual-runs/2026-08-22T05-10-41-452Z-strategy-canvas-context`.
- Canonical generated distribution — **129,962 bytes**, SHA-256 `f3492e97812bb0e4baaeef17adc7ce2015da9b5de53b40105b713f2662b5296d`; source/build parity passed.
- Reviewed three-channel fixture — valid under the final shared core validator.
- Published schema negative suite — every malformed nested case is rejected at the generated schema/core boundary.
- Narrative adapter — both copies parse, match, normalize malicious and duplicate IDs, bound strings and numeric values, emit valid v2 state, and preserve safe stable IDs.
- Narrative inline snapshots — both `TARGET_REGISTRY` and `SEED` constants match their adjacent JSON sources exactly.
- Manifests, registries, examples, and fixtures — JSON parse checks passed.
- Consumer bundles — `npm run check:strategy-canvas-consumer-bundles` verified all six archive byte snapshots and every Semantic/Technology per-file byte/SHA receipt; the Context prototype-manifest validator passed all six collections.

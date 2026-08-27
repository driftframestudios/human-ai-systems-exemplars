# Core and Narrative unit-test collaboration

This planning surface gives the Core Architecture and Narrative Architecture
prototype families a direct route to useful unit tests. It combines current
repository evidence, Practitioner Registry orientation, contemporary testing
research, and the live GitHub work route. Runnable source remains behavior
authority.

Status: **accepted baseline and strengthening route; milestones 14–18 complete**

Accepted source: `main@87db858`, 2026-08-26

Research branch reading: `research@ad8c97f`, 2026-08-25

## Desired state

A collaborator can change a consequential Core or Narrative behavior and run a
small local test that states what should remain true. The expectation leads the
implementation, the artifact that owns the behavior supplies its meaning, and
the test fails clearly when that behavior changes.

The first useful baseline has four qualities:

- direct `node:test` commands protect the two existing DOM-independent modules;
- adjacent schemas and material examples agree with the objects the pages
  actually produce;
- a small Playwright tranche observes exchange and recovery through
  visitor-visible controls; and
- the nearest README makes each command and ownership boundary easy to find.

Local execution creates the working baseline. An approved, configurable Actions
receiver runs the same family commands through explicit dispatch; matching pull
requests become active when `PROTOTYPE_UNIT_TESTS_AUTOMATIC=true`.

### Writing and evidence posture

This plan uses the Supportive Change Writing register: the desired runnable
state leads, evidence keeps its stated scope, and each boundary points to the
observation that can establish the adjacent claim.

A passing check names the behavior or contract it exercised. Constitutive
silence carries an unspecified state: an absent assertion, uncalled schema, or
quiet runner leaves the adjacent claim open. The fitting example, assertion,
review, or visitor observation supplies that claim's next evidence.

## Practitioner Registry orientation

The Enterprise Human-AI Practitioner Registry positions itself upstream of
tooling: a feedstock layer that supplies worthwhile structures to whichever
harness or transport format is current. That distinction changes the testing
plan. Durable behavior statements and source relationships feed the current
Node, Ajv, and Playwright routes. A broader operating layer becomes useful when
repeated maintenance exposes a shared receiving job.

Several Registry surfaces were especially decision-changing:

- **Unit-test-first Design** treats the expectation as an interface decision
  made before the implementation can influence it. Its evidence claim is
  calibrated: a small positive external-quality effect overall, little or no
  productivity gain, and larger costs in industrial settings.
- **Specification-by-Example** places concrete cases ahead of abstract test
  inventories. Shared agreement is part of the value even before a scenario is
  automated.
- **Recovery Routing** sends strain to the smallest adequate owning surface.
  A schema mismatch returns to the schema owner; a visitor interaction defect
  returns to the page; a test-layout problem returns to the shared test route.
- **The Layer Before the Harness** treats flat, self-contained source as durable
  feedstock. A harness may change while the behavior source, example, and
  ownership relation remain readable.
- **Enterprise Testing-as-Specification** favors observable behavior, semantic
  controls, condition-based waiting, deterministic inputs, failing-first bug
  examples, and coverage aimed at consequential rules.

The Registry metadata reinforces these distinctions. Expectation,
Focalization, and Opportunity Architecture are all in working stabilization;
Recovery Routing, Temporal Coordination, Relational Grammar, and Indeterminacy
Field remain separate cross-cutting systems. Affordances such as
`nameSourceOfTruth`, `setExpectations`, `returnObservation`, `reentry`, and
`indeterminateSlot` keep authority, continuation, and open questions explicit.
Several recovery affordances carry a research-needed standing and supply useful
possibilities for later test instructions.

The repository consequence is compact: write the expected behavior from an
independent source, choose the smallest observation layer, return findings to
the owner, and let a useful unknown remain open with a re-entry condition.

## Current repository truth

### Branches, environments, and Actions

- `main` is the broad collaboration trunk and current private operational
  source.
- `research` is the future-state and AI research-integration receiver.
  At this reading it carries seven research-only commits and is 45 accepted
  `main` commits behind. A consequential experiment begins after an additive
  synchronization from `main`.
- `res/<feature-slug>` is the bounded research-feature namespace. `dev`, `stg`,
  `release`, `docs`, and `prod` retain their named integration or delivery
  roles.
- GitHub environments exist for `main`, `research`, `dev`, `stg`, `release`,
  `docs`, `prod`, and `github-pages`. The long-lived delivery environments use
  matching custom branch policies; `res/*` carries no deployment environment.
- `main` is the sole current metered evidence receiver. `research`, `res/*`, and
  the delivery receivers rest at the repository-level Actions budget gate.
  `DEPLOYMENT_ACTIVE_RECEIVERS=[]` keeps deployment independently at rest.
- The epic adds one configurable Core and Narrative unit workflow beside schema
  Pages publication, the main projection receipt, and the existing manual proof
  paths. GitHub-owned actions are pinned to full commit SHAs. Local commands
  remain the immediate edit loop; explicit dispatch or the automatic receiver
  supplies the matching hosted observation.
- The new unit-test issues are automatically added to the repository Project
  and receive a Project status event. The current token lacks `read:project`, so
  the Project title, fields, and views remain an explicit access-limited gap;
  issue bodies and milestones carry the readable work route.

Recent accepted work consolidated Narrative Architecture into Context-owned
projections, formed locator-boundary stewardship, documented research topology,
activated the bounded `main` evidence receiver, settled interaction and planning
source relationships, and refreshed Visual Fidelity source lineage. These are
substantive principal-level foundations: authority, delivery, branch role, and
public projection are treated as related but independent concerns.

### Current strengthening route

The accepted route closed milestones 14–18. Its behavior portfolio is organized
by the state each epic establishes:

1. milestone 17 carries Core decision canvases (work:core-decision-canvas-state), planning and routing
   instruments (work:core-planning-routing-state), and hierarchy, matrix, and reference instruments (work:core-reference-instruments);
2. milestone 18 carries Semantic and Technology Fit sampling decisions (work:semantic-technology-fit-sampling)
   and Narrative composition and Threadkeeping lifecycle state (work:narrative-lifecycle); and
3. milestone 15 carries the cross-prototype exchange receiver (work:cross-prototype-exchange).

Milestones 17 and 18 are accepted. Issues work:core-decision-canvas-state, work:core-planning-routing-state, and work:core-reference-instruments protect the Core
portfolio across both declared projections. Issues work:semantic-technology-fit-sampling and work:narrative-lifecycle protect the
Narrative sampling, composition, and continuity portfolio; PRs work:narrative-sampling-protection and work:narrative-composition-lifecycle
carry their accepted receipts. Issue work:cross-prototype-exchange and PR work:core-to-narrative-exchange-protection complete milestone 15:
one real canonical Core Strategy Canvas v2 export moves through the Narrative
adapter and into a governed Composer export. The case repaired its distinct
claimed-dialect, declared-order, and payload-lineage defects. A future exchange
returns through work:optional-ci-tranche or a new issue when a materially different receiver
boundary appears.

Each accepted epic returned `PROTOTYPE_UNIT_TESTS_AUTOMATIC` to `false` after
its reviewed hosted result. Manual family dispatch remains available.

### Existing executable evidence

The root package already requires Node 22 and includes Playwright and Ajv.
Useful checks exist for:

- the current public schema surface;
- Strategy Canvas browser behavior and consumer bundles;
- Open Lesson Field behavior;
- Context prototype-manifest paths and hashes;
- focused and family-wide local visual comparison; and
- the nested LIMS/ELN Python packages.

These checks answer real questions within their named slices. A direct Node
unit-test command is the next Core and Narrative receiver.

### Decision-changing findings and settled interventions

The audit exposed concrete source work, and the epic now carries its smallest
fitting interventions:

1. **Narrative Capsule Composer contract alignment.** The live
   `buildExport().composition` object now supplies `gapRefs`,
   `aiContextProjectionRef`, and binding `reviewState`. Adjacent valid and
   invalid examples make the governed shape directly executable while the
   page's ready-state checks retain their distinct interaction job.
2. **Narrative schemas compile under a named strict posture.** Semantic
   Sampling declares the fields required by its conditional branch, Technology
   Fit releases a redundant conditional, and the local-manifest alternatives
   declare their inspected properties. All current Narrative and local-manifest
   schemas compile under the selected Ajv `strict: true` posture.
3. **Narrative family inventory agreement.** The prototype index now presents
   the four current projections described by the Narrative manifest and local
   validator.
4. **Core manifest identity agreement.** Core filenames, versions, byte counts,
   and meaningful digests now resolve to the current root and Context copies.
5. **Two pure seams are ready for direct tests.** Strategy Canvas core exposes
   normalization, migration, reducer/store, aggregation, serialization,
   JSON-LD, prompt, and selection behavior. The Narrative Capsule Strategy v2
   adapter exposes dialect recognition, Unicode and control-character
   normalization, safe IDs, clamping, step rounding, bidirectional mappings,
   migration receipts, and input-preservation behavior.
6. **Browser-first observation fits the inline logic.** A browser can observe
   those active paths immediately. Extraction into modules becomes valuable
   when a repeated rule or defect demonstrates a stable pure-logic boundary.
7. **Strategy store mutation authority is explicit.** `getState`, `dispatch`,
   `undo`, `redo`, and subscriber calls publish detached observations. Dispatch
   remains the mutation route that records history and notifies listeners.

The central determination follows from this evidence: existing validators
establish their exercised slices. Family-wide consistency becomes established
when current identities, governed exports, material examples, and fitting
cross-family observations agree.

## Evidence-grounded testing decisions

| Evidence | Bounded finding | Repository consequence |
| --- | --- | --- |
| [Node test runner](https://nodejs.org/api/test.html) | `node:test` is stable and already supports ordinary assertions, isolation options, selection, mocking, and coverage. | The built-in runner supplies the complete framework for the two pure JavaScript seams and keeps the dependency set unchanged. |
| [Playwright best practices](https://playwright.dev/docs/best-practices) and [browser isolation](https://playwright.dev/docs/browser-contexts) | Browser tests are strongest when they observe user-visible behavior through resilient controls and clean contexts. | Reuse Playwright for import, edit, export, persistence, and recovery paths that genuinely require a page. |
| [JSON Schema 2020-12](https://json-schema.org/draft/2020-12) and its [official test-suite form](https://github.com/json-schema-org/JSON-Schema-Test-Suite) | Schema compilation, instance acceptance, annotations, and application behavior are distinct claims. Positive and negative material examples make a contract legible. | Repair the governed instance first, then keep a small valid/invalid example set beside the owning schema. |
| [Ajv options](https://ajv.js.org/options) | Strict mode exposes ambiguous or ignored schema constructs while leaving instance-validation semantics conceptually separate. | Make the strictness choice explicit per schema family and repair accidental strict failures before expanding checks. |
| [TDD meta-analysis](https://doi.org/10.1109/TSE.2012.28) | Across 27 studies, TDD shows a small positive external-quality effect overall and little or no discernible productivity effect; context changes the trade. | Concentrate test-first work on consequential behavior and known contract defects. Source-owned expectations and observed failures carry the decision meaning. |
| [TestPilot research repository](https://github.com/githubnext/testpilot) | Iterative generated-test repair is an exploratory technique, and its original implementation is archived. Functionally independent expectations remain the oracle; generated output supplies candidates. | Keep AI-generated test-loop work in the later milestone until direct local tests demonstrate a useful receiving problem. |

## Selected implementation shape

The implementation uses the selected plain shape:

```text
tests/
  README.md
  core-architectures/
    strategy-canvas-core.test.mjs
  narrative-architectures/
    strategy-canvas-v2-adapter.test.mjs
    schema-contracts.test.mjs
```

The root package can expose three direct commands:

```text
npm run test:core-architectures
npm run test:narrative-architectures
npm run test:prototype-units
```

Each command runs selected behavior. Standard runner output fully serves the
first baseline. A second receipt format, profile registry, or assessment schema
returns when material use demonstrates a shared receiving job. The approved
Actions workflow offers `core`, `narrative`, and `all`; manual confirmation and
the automatic-run variable keep runner acquisition independently configurable.

Artifact-owned schemas, examples, adapters, and semantic fixtures stay beside
their source. The central `tests/` directory carries only executable assertions
and a short ownership map. A future family may choose adjacent test files when
that is the clearest self-contained distribution form.

### Implemented Core cases

- normalize malformed, legacy, and bounded state into the v2 contract;
- preserve input objects across normalization, reducer, and serialization;
- preserve view order and extension data during representative v1 migration;
- exercise reducer add, update, remove, move, score, review, reopen, and replace
  transitions at their stated boundaries;
- verify aggregation and selection behavior through small named examples;
- verify detached store observations and explicit timestamps in lifecycle
  cases; and
- lock the corrected Core manifest identities with direct filename/version
  examples owned by the Core manifest.

### Implemented Narrative cases

- detect supported and unknown adapter dialects;
- normalize Unicode, line endings, control characters, length, IDs, collisions,
  action values, scale bounds, and steps;
- map Composer → Strategy v2 → Composer while preserving declared identity and
  recording intentional synthesis;
- keep source inputs unchanged;
- exercise the corrected Composer export through adjacent valid and invalid
  examples;
- compile all four current Narrative schemas under the selected strict posture;
- validate one material valid instance and one meaningful invalid instance per
  governed export shape;
- keep Semantic Sampling prompt semantics aligned with the active run and
  preserve exact exclusive totals across larger candidate sets;
- preserve Semantic and Technology Fit minimum comparison sets, successor
  lineage, and self-importable exports;
- allocate stable identities across rapid Technology Fit compositions;
- synchronize Technology Fit decision changes across cards, comparison,
  governed JSON, and the live embedded JSON-LD twin;
- distinguish included Composer sources from required held-open context, close
  its internal reference graph, identify the actual content fingerprint, and
  synchronize authored and runtime JSON-LD;
- keep Threadkeeping literal text operable through semantic controls, select
  continuity by declared chronology, and detach exported state;
- synchronize Threadkeeping status, review, horizon, candidate, continuity,
  hydration, export, and JSON-LD views through accepted and retained exchange;
- validate claimed Strategy Canvas v2 inputs before translation, follow the
  producer's declared dimension order, state the current 0–10 mapping boundary,
  and retain source identity plus a payload fingerprint as lineage; and
- preserve the original adapter receipt through governed Composer export and
  receiver-owned Strategy v2 re-export.

### Focused browser tranche

The existing Playwright layer now receives one load-bearing exchange path per
family:

- Core: working state → score edit → visible JSON export → malformed-import
  recovery with the edited state retained; and
- Narrative: a fresh-storage import, useful edit or composition, export, and
  rejected-import recovery path for each current projection, plus six deeper
  decision and lifecycle journeys across issues work:semantic-technology-fit-sampling and work:narrative-lifecycle; and
- Cross-prototype: one canonical Core score edit → valid serialized export →
  Narrative import → governed composition and Strategy v2 re-export, followed
  by one claimed-v2 mismatch with the accepted composition retained.

The remaining pages keep their visual and interaction variation. Additional
browser cases form around a demonstrated collaboration behavior or a material
source defect.

## Milestones and issue route

Five milestones express outcomes at different horizons:

1. **Stable Core and Narrative Test Grounding** (milestone 14) — current
   contract defects, first behavior examples, source authority, and repair
   decisions become explicit.
2. **Stable Core and Narrative Unit-Test Baseline** (milestone 16) — direct
   Node tests, selected schema contracts, focused browser behavior, and concise
   README routes become runnable.
3. **Proportional Prototype Test Expansion** (milestone 15, complete) — the
   first cross-prototype exchange supplied the distinct integration evidence;
   later expansion follows a new receiver boundary.
4. **Core Architecture Behavior Resilience** (milestone 17, complete) — twenty
   tranche-owned Core instruments carry focused material journeys across both
   projections.
5. **Narrative Architecture Decision and Lifecycle Resilience** (milestone 18,
   complete) — issues work:semantic-technology-fit-sampling and work:narrative-lifecycle protect sampling, composition, and
   Threadkeeping lifecycle decisions.

The lean issue route is:

| Issue | Current job | Handoff |
| --- | --- | --- |
| work:core-narrative-test-grounding | Settle this evidence-grounded plan and current source reading. | Prepares work:narrative-contract-reconciliation and work:core-identity-reconciliation. |
| work:narrative-contract-reconciliation | Reconcile the four current Narrative contracts, the absent fifth-pack reference, and the first accepted Narrative examples. | Prepares work:direct-node-ajv-baseline. |
| work:core-identity-reconciliation | Reconcile Core identity/manifest drift and the first accepted Core examples. | Prepares work:direct-node-ajv-baseline. |
| work:direct-node-ajv-baseline | Add the direct `node:test`/Ajv baseline and its root, family, test, and selected artifact README routes. | Prepares work:core-browser-exchange and work:narrative-browser-paths. |
| work:core-browser-exchange | Protect one representative Core exchange and recovery path through the existing browser layer. | Runs after work:core-identity-reconciliation and work:direct-node-ajv-baseline. |
| work:narrative-browser-paths | Protect one load-bearing path for each current Narrative projection, beginning with the repaired contracts. | Runs after work:narrative-contract-reconciliation and work:direct-node-ajv-baseline. |
| work:cross-prototype-exchange | Exercise the first material Core Strategy Canvas v2 → Narrative Composer exchange, then add another only for a distinct unanswered boundary. | Accepted through PR work:core-to-narrative-exchange-protection; later hosted expansion returns to work:optional-ci-tranche. |

Issues work:direct-test-layout, work:test-documentation-adoption, work:proportional-test-expansion, and work:ai-test-design share work already owned elsewhere or await
receiving evidence. Their owners can close them with a concise folded-into
route: execution design and README adoption return to work:direct-node-ajv-baseline, later expansion
returns to work:cross-prototype-exchange and work:optional-ci-tranche, and an AI test-design loop returns through work:repository-skill-tranche after
material test use. The baseline and strengthening route is now accepted; later
practice retains its named owners.

## Principal-level standing

This source reading supports a principal-level systems-posture assessment
because:

- source, semantic, publication, delivery, and receiver authority are separated;
- branch and environment roles express different collaboration and delivery
  jobs;
- Actions have explicit cost, permission, pinning, and activation boundaries;
- schemas, examples, contexts, visitor pages, and threadkeeping form a
  discoverable multi-surface system;
- Context Canvas treats pages as design inputs and preserves controlled visual
  variation; and
- skills are declarative collaboration affordances that remain portable across
  collaborators and runtimes, with progressive context and explicit lifecycle
  humility.

The observed next edge is **behavioral closure through a focused strengthening
wave**. The Core and Narrative families contain sophisticated, meaningful
prototypes. Direct unit tests and material schema examples bring the named seams
under observation through the existing execution layer.

### Adjacent legibility alignments

The following repository-wide alignments have existing owners:

- Align the portable-skill count across the current catalog, repository plan,
  and visitor-facing Collaboration Skills surface.
- Bring Actions records and older planning language into agreement with the
  enabled, budget-gated posture.
- State directly that `docs` is the source/projection receiver and
  `github-pages` is GitHub's platform deployment environment.
- Keep collaborative review guidance legible beside the deletion and
  non-fast-forward protections enforced on `main`.
- Review merged branches through a small, human-approved retention practice.
- Add the nearest Core family README so source ownership and test entry begin at
  the family boundary.

These alignments return through the existing repository-legibility, skills,
Actions-budget, and family-envelope terrain. The unit baseline remains their
current neighbor and proceeds through its own named owners.

## Purposeful holds

The following terrain remains available with an explicit return condition:

- **Automatic hosted unit cadence:** activate matching pull-request runs with
  `PROTOTYPE_UNIT_TESTS_AUTOMATIC=true`; the resting value preserves deliberate
  dispatch while the team observes actual cadence and cost.
- **Coverage target:** return when a consequential rule needs added observation;
  coverage serves rule discovery, while behavior evidence supplies the
  acceptance decision.
- **General assessment schema or test manifest:** return only after several
  families need the same data exchange and a plain README/table becomes costly.
- **AI-generated test harness:** return through work:repository-skill-tranche after trusted baseline
  cases can judge candidate usefulness independently.
- **All-page browser matrix:** return after the first family contracts reveal a
  stable shared behavior or a repeated regression.
- **Visual and focused-state expansion:** return when a named visitor behavior
  changes; existing cycle-scoped visual tooling remains the owner.
- **Additional test framework:** return when a material capability demand
  exceeds the current `node:test` and Playwright toolchain.

## Next collaboration move

1. Use the direct family command or focused browser route for the artifact being
   changed.
2. Activate the hosted receiver for a named review use, then return it to its
   resting value after the receipt.
3. Route another cross-prototype exchange through work:optional-ci-tranche or a new issue when a
   materially distinct receiver boundary appears.

The accepted implementation wave supplies clear local tests for the two pure
modules, owners and dispositions for the observed Narrative and Core contract
mismatches, and a one-reading command route from the nearest README.

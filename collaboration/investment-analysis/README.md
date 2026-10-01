# Investment analysis contracts

Source owner for the shared analysis in the Initiative Costing Calculator and Cross-Functional Investment Model Studio. Both original instruments retain their interface, framework, and selected-method roles. This package adds a dependency-free calculation and exchange layer.

## Files and authority

- `core.js`: pure formulas, input validation, state migration, canonical serialization, and the validation-input schema generator.
- `studio.js`: local progressive-enhancement controls, semantic tables, recovery, and a plain-text comparison capsule.
- `studio.css`: scoped shared component, projected after each host's existing skin.
- `../../tools/project-investment-analysis.mjs`: deterministic readable inline projection into both HTML hosts. The three files above remain editable authority; marker comments identify each generated copy. Styles and core load in the head, and UI initializes after the host script. The Model Studio retains its inline-only CSP.
- `state.schema.json`: generated, self-contained JSON Schema 2020-12 projection of `core.schema()`, version 0.2.0. Its canonical identifier describes identity; hosted retrieval follows an explicit publication step.
- `example.json`: synthetic material instance with hand-checkable numbers for calculation and exchange review. Company economics and service-outcome findings require their own source evidence.

The source-reading baseline is the accepted main tree at `a2b6f4355b87115e078f9f94760fedcfa3734ad0`. The calculator offered six change frameworks, a distinct eight-part attention lens, six editable presets, inline calculations, and a generated leave-behind. Discovery & Alignment supplied the three-quarter default. The Model Studio supplied eight method descriptions, fixed illustrative context, selected-method state, and a Prompt Capsule. About supplied a prose equivalent. This change adds the shared analysis and an actual About table while preserving the original roles.

## Two axes

Domains are internal investment, customer implementation, commercial cohort, service/operational value, and capital allocation. Record types are input, assumption, calculation, evidence, and decision. `calculate(state).records` derives the applicable combinations. Each metric carries status, unit, currency where applicable, period, formula version, and evidence standing. A domain's missing record leaves its claim open.

## Numeric and economic meaning

Blank/null means unavailable; explicit zero stays zero. Invalid, inapplicable, ambiguous, and unreached results carry reasons. Independent outputs remain available when another input is incomplete. Calculations retain precision; presentation formats independently.

GRR and NRR describe the opening revenue cohort. New customers and reactivations outside that cohort enter the closing totals separately. CAC uses new customers; acquisition spend divided by new recurring revenue has a time dimension. Acquisition payback uses the matching contribution margin. All recurring amounts use the entered period.

Cash flows are complete incremental, equally spaced, end-period amounts with an explicit t=0 value. NPV leads comparison. IRR supports a conventional initial outlay followed by nonnegative cash flows; other patterns keep an explanatory state. Payback is undiscounted with linear interpolation within a period. Expected NPV requires an explicitly confirmed, mutually exclusive and collectively exhaustive outcome tree whose probabilities sum to one. The implementation preserves supplied probabilities. Percentiles and empirical distributions remain distinct models.

Staffing uses source-owned 80-hour sprints and 520-hour quarters, the existing unknown/complexity reserve heuristics, and sigma as an illustrative attention multiplier. Additional-share controls identify the portions of activity, recovery, and quality work outside allocated staffing. These cost components enter the base once; spread expresses the planning range. Shared-analysis cash flows contain the explicitly entered amounts. Staffing references, implementation costs, and budget-impact outputs remain separate views; the collaborator owns their reconciliation into cash-flow inputs.

Service budget impact is eligible population times adoption times the difference in per-person resource cost. The nine cost-consequence dimensions retain their own units and evidence. Cost per incremental outcome requires a named measure, reviewer, source, perspective, valid date, and an explicitly reviewed transformation. The planning interface records these declarations; qualified people establish their substantive validity.

## Exchange and recovery

Accepted state changes through one candidate-admission boundary. Field edits, matrix application, import, reset, method selection, and staffing references prepare a valid portable candidate and its calculation before committing. A rejected draft stays editable with a recovery message; results and exports continue to describe the last accepted state. Controls mount once, preserving focused controls and open disclosures. Whole-state import and reset explicitly replace drafts; a later interaction takes priority over an earlier asynchronous file read.

`serialize()` sorts keys deterministically and excludes generated timestamps. The FNV-1a fingerprint is a comparison aid, with authenticity established separately. Import, clone, migration, and export share admission for finite ordinary JSON values: enumerable data properties, dense arrays, acyclic structure, and ordinary property names. Reserved keys, accessors, custom object types, functions, and other values requiring lossy conversion receive a recovery message before cloning. Numeric zero uses JSON's canonical zero representation. The UTF-8 input and canonical output limits are 1 MB, with 64 levels and 100,000 visited values. These transport limits complement the domain schema. Supported namespaced extension values survive both directions.

The Model Studio admits its eight source-defined methods. An analysis import updates the host selection and comparison together; an unsupported method leaves both accepted owners available and the source JSON revisable. Calculator analysis may retain another method identifier as context. Command names, field definitions, fixed staffing units, and staffing currency are immutable vocabulary; the visitor's selected currency remains editable state. Staffing explicitly reports USD, while every NPV view, including sensitivity, shares the selected-currency and comparison-horizon policy. Dimensionless and independent outputs keep their own availability.

The existing Model Studio 1.0.0 selection migrates with its method and exact selection snapshot retained. A legacy calculator leave-behind retains its display snapshot as lineage, and numeric analytical fields remain unavailable until exact inputs are supplied. Rounded display amounts are context rather than recovered calculation precision. Future schema versions receive an explicit adapter or a supported-version message.

## Semantic provenance

Method records use `urn:source-key:investment-method:<method-name>`; the eight method IDs supply the stable suffix. Public labels describe the method. Renaming or moving a source leaves its semantic key intact. Any future key replacement retains an explicit public alias at the receiving source. Private workspace coordinates remain with the authorized resolver; detached use needs only the public method description, contract, and semantic key. The semantic key identifies the source concept; decision authority stays with the named human and source owner.

## Decision structure and maintenance

The core uses a decision structure fitted to each receiving job. Schema types dispatch to focused validators; common constraints and independent domain diagnostics accumulate in their established order. Each `anyOf` candidate owns a temporary diagnostic list. A failed candidate leaves the next candidate's evidence independent.

Calculation stages name their inputs and returned results. Metric guards preserve input, currency, and formula precedence. Service consequences preserve evidence, baseline, and candidate precedence. The decision gate gives an explicit stop its established priority, then checks human review and capacity. Static domain maps hold literal classifications; the public calculation API and record order remain stable.

The smallest useful abstraction localizes a real change: a guard for early recovery, a switch for one discriminant, a map for static classification, and ordered accumulation for independent diagnostics. Short loops and direct conditions remain appropriate. New plugin machinery enters when an actual extension boundary needs it.

The focused unit suite checks schema/example agreement, diagnostic accumulation and order, guard precedence, service-outcome zero/absence meaning, decision gates, domain mappings, and detached results alongside the formula and exchange fixtures. Browser checks own focus, rendered agreement, and recovery. These observations establish named behavior; maintainability and broader applicability remain review questions.

## Local evidence and delivery

```sh
node tools/project-investment-analysis.mjs
node tools/project-investment-analysis.mjs --check
node --test tests/investment-analysis/core.test.mjs tests/investment-analysis/projection.test.mjs
node --test tests/investment-analysis/browser.test.mjs
npm run build:iframe-routes
npm run check:iframe-routes
```

The two route entries in `iframe-route-families/canvas/public-iframe-route-manifest-v1.json` deliver the readable inline copies as self-contained HTML. Packaging checks source parity before creating either route; shared JavaScript and CSS require zero additional requests. The ordinary package boundary continues to keep external executable files outside these closures. Local screenshots stay in ignored `.visual-runs/`. The source guide and About page retain semantic HTML and existing CSS. The human-controlled upload receives a successor package; live child and real-parent observations retain their separate release owners.

## Cost, ownership, and resource boundaries

Numeric text uses one decimal grammar with a 128-character admission limit, including surrounding whitespace. Blank or whitespace-only text remains unavailable; scientific notation carries scale compactly. The generated schema and runtime share this language. Ordinary finite JSON numbers retain their existing precision policy. The immutable internal schema owns a finite compiled-pattern map; public schema callers receive detached copies. Closed object properties use own-key lookup, while namespaced extension values keep their ordinary JSON keys.

The schema walk yields ordered diagnostics. Leaf validators return their observation and each invocation owns its graph indexes and numeric accumulators. Each validator owns its diagnostics, and composition preserves their independent evidence. JSON admission counts text before canonical output allocation, then enforces the exact UTF-8 budget.

`prepare(candidate)` admits and canonicalizes once, derives results through a private accepted-state calculation route, and returns an owned immutable revision with state, result, serialized text, and fingerprint. Public `calculate` retains its input gate and returns detached flow/event arrays. The UI's `readProjection()` exposes a stable, deeply immutable revision for reading; `getState`, `getResult`, and `getProjection` retain detached editable copies. Field and method edits use explicit shallow path copies before preparation. Every public method-selection command reaches the same accepted-state owner, and the host derives its selection from that owner.

Prompt Capsule projection, fingerprint, and each view reuse the accepted projection identity. Its embedded selection schema is parsed once. Staffing defaults are applied by an explicit normalization transition; rendering retains row indexes and projects the resulting state. Learning disclosure retention belongs to a separate UI-state set. Snapshot projection omits an absent activity/recovery allocation field before strict JSON cloning.

Let B be JSON bytes, N nodes, D depth, K each object's key count, Lkey key comparison length, V/E event vertices/edges, A alternatives, O outcomes, and T periods. These are source-derived bounds, with ordinary Number arithmetic and expected Map/Set operations:

| Owner | Time and allocation contract |
| --- | --- |
| `jsonText`, `stable`, `prepare` admission | Conservative O(N + B D + sum K log K Lkey); preparation performs this canonical admission once |
| Numeric text and schema patterns | Length gate before bounded decimal matching; the non-overlapping decimal grammar is linear in lexeme length |
| Schema diagnostics | Visited schema/data nodes plus emitted diagnostic text; generator composition retains traversal order |
| Event dependencies | O(V + E), with bounded numeric admission per period reference |
| `npv`, `payback` | O(T) for admitted numbers; O(T) parsing workspace at public boundaries |
| `irr` | O(I T), I = 160; one parsed flow array, O(T) peak workspace, O(1) per-iteration arithmetic workspace |
| Alternatives and outcome tree | O(A I T + O T), plus input admission and derived records |
| Staffing normalization/render indexes | O(S + F) for S rows and F framework components, plus generated text and DOM work |
| Package closure and inventory | O(P + Epackage) graph bookkeeping and O(P log P) sorted inventory; resource parsing and byte I/O remain separate costs |

Input limits bound workloads; responsiveness, native regex compilation, garbage collection, and layout cost remain runtime observations. The isolated near-miss check establishes completion within its declared budget. General latency and asymptotic claims require measured workloads and fitting runtime evidence. Package writers require a locally owned output tree and inspect each output directory component; concurrent hostile replacement of filesystem paths remains outside that local-ownership contract.

The reusable method is [cost-and-ownership-analysis](../../.agents/skills/cost-and-ownership-analysis/SKILL.md). The PR assessment supplied the formation evidence: allocation was distinct from native recompilation, inherited lookup was distinct from prototype mutation, and pure state transitions were distinct from necessary UI/filesystem effects. The skill has public-ready source standing and enters the public catalog through PR #291. The publication build carries its readable page, machine projection, exact source, and supporting references; hosted availability follows the reviewed main-branch release. This first application supplies bounded evidence, with broader transfer remaining open to subsequent use.

## Cohesive reading and captured reports

Each host now offers two working chapters: its original instrument and a
full-width layered comparison. A visible accepted-state brief precedes four
native analytical disclosures. The calculator's single Comparison rail entry
and top chapter link provide global navigation; analytical Direct Receipts
pair current measures with focused routes that reveal the receiving section.
Native fragments retain browser history, and disclosure choices survive edits.

Shared table descriptors carry captions, row/column scope, field roles, and
supplementary `data-label` values. Accepted occurrence and alternative IDs remain
available as row keys. Ordinary words wrap at their boundaries; formatted
amounts remain intact and broad comparisons use named local scroll regions.
Print presents labeled records vertically so each field retains its row context.

The calculator summary and analytical report consume the same immutable
accepted projection. Opening a report captures its rendered analytical account,
contract, fingerprint, exact input state, and source-owned styles once alongside
the planning snapshot. New-tab and downloadable reports share that capture;
later edits affect the next report. Staffing stays in USD while the selected
analysis currency and period remain explicit. Formula and schema versions
are 0.1.0 and 0.2.0, respectively. Pending drafts retain their editable UI role.

The focused presentation contract is:

```sh
node --test tests/investment-analysis/presentation.browser.test.mjs
```

Its Range observations distinguish broken words/numbers from legitimate
multiline phrases. Its two detached-row fixtures establish the declared DOM
serializer's context retention. Its local About-carrier observation exercises
the actual sandbox with locally generated child bytes; live hosting retains its
separate observation. The [presentation plan](../../planning/layered-investment-presentation.md)
records composition, the deferred timing visual, and release boundaries.

## Portable investment Prompt Capsules

The pure `capsule.js` owner groups accepted inputs, assumptions, results,
evidence, and decisions into five domains and one exact fenced JSON block.
`studio.js` caches Markdown by immutable accepted projection and view.
The Model Studio composes its selected method and fixed reference scenario
with that account in one six-section document; its main capsule panel remains
the complete handoff. The calculator supplies plain and skill-assisted views,
Copy Prompt Capsule, and Download Markdown alongside the separate JSON exchange.

Captured staffing references retain their snapshot and USD calculation. The
live staffing instrument retains its own state. Pending drafts remain at their
controls while capsules and exports describe accepted state.

`tools/project-investment-analysis.mjs` projects four inline owners and both
source-readable defaults. Its bounded VM evaluates trusted repository owners
and the Studio's marked pure method blocks in a fresh build realm. Runtime
source never evaluates imported text. Both defaults share their live formatter.

The current capsule adoption inventory is
[Prompt Capsule inventory](../../prompt-capsules/prompt-capsule-inventory.v0.1.0.md).
Focused transfer evidence lives in `tests/investment-analysis/capsule.test.mjs`
and `capsule.browser.test.mjs`, alongside existing state, presentation, and package
contracts. Hosted iframe upload remains human-controlled.

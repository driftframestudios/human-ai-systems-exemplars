# Context Canvas — CSS modularization and visual reference plan

```yaml
planning_surface:
  id: "prototype-exemplars.context-canvas.css-and-visual-reference.v0.1"
  as_of: "2026-10-18"
  status: "active implementation; the visual cutoff is retained, About has a complete consumer-owned first-paint path, and expanded.css remains a named legacy remainder for adjacent routes"
  visual_reference_receiver: "all-page visual reference utility"
  css_modularization_receiver: "readable core and route-family source"
  debrief_badge_receiver: "Debriefs catalog component owner"
  source_authority: "Context Canvas HTML, CSS, visual contracts, and Git revision"
  governing_move: "make ownership easy to find while keeping expression generative"
```

## Settled direction

The Context Canvas will use readable plain-CSS source modules, a small shared core, and route-family bundles. Every top-level page receives a full-page visual reference before the first extraction. The same inventory produces the after-comparison, while family metadata makes the images easy to browse.

This combines the strongest parts of two planning routes:

- modular authored source creates first-paint and maintenance value;
- visual-contract mapping makes the source legible to a new human or AI collaborator;
- route modules preserve composition, rhythm, density, asymmetry, and experimentation;
- focused browser checks retain their role for interaction states and known regressions.

The receiving outcomes are:

- a full-page Context Canvas visual-reference set;
- readable core, component, contract, and route-family CSS source; and
- normalized Debriefs Reading types badge height inside the catalog component owner.

## Implementation return — visual cutoff and About

The visual-reference runner return completed Wave 0. The local `before` collection binds 117 of 117 captures to source commit `7cfbdf4`, whose tree is identical to the landed merge commit `4923a23`; the set occupies 322.20 MiB and reports zero capture or browser observations.

The first Wave 1 extraction gives About one AI-legible route bundle and keeps its static fallback beside it. `expanded.css` moves from 145,667 bytes and 6,373 lines to 116,360 bytes and 5,035 lines, so the other 36 consumers avoid 29,307 bytes of unrelated About source. About retains the same stylesheet request count. Its complete authored CSS path gains less than one kilobyte from the module header and explicit shared at-rule seam.

The entry/catalog comparison completed 9 of 9 captures and the adjacent Prompt Conditions seam completed 6 of 6, both with zero browser observations. Shared-consumer images are byte-identical. About retains the baseline dimensions and composition; a small desktop and wide raster delta belongs to the embedded Interactive AI and ML method gallery rather than the page-owned CSS. The no-script route loads the relocated fallback and presents the complete static reading.

That return is complete. The About extraction landed next, followed by the independently useful Shared Machinery and AI Systems family map.

## Implementation return — About first-paint ownership

About now loads an explicit, shallow source graph: `tokens.css → foundation.css → site-navigation.css → tables.css → route-card-grid.css → about.css → about-noscript.css → canvas-shell.css`. The static fallback remains media-gated beside the route owner. `expanded.css` is absent from the About document and retains the unresolved legacy terrain used by 39 adjacent routes.

The extraction gives shared responsibilities one authored source rather than copying declarations into a route bundle:

| Source | Responsibility | Direct consumers |
| --- | --- | ---: |
| `styles/core/tokens.css` | shared custom-property vocabulary | 40 |
| `styles/core/foundation.css` | reset, base typography, reading primitives, responsive type scale | 40 |
| `styles/components/site-navigation.css` | three-destination navigation, sticky placement, route state, anchor clearance | 40 |
| `styles/components/tables.css` | complete semantic-table family with responsive, print, and forced-color states | 38 |
| `styles/components/route-card-grid.css` | route-card layout and its responsive/reduced-motion states | 2 |
| `expanded.css` | named legacy remainder | 39 |

At source `2d8e708`, the ordinary About path carries 78,460 raw bytes, 18,215 gzip-9 bytes, and 15,243 Brotli-11 bytes across seven authored first-paint files. The immediately preceding `expanded.css + about.css + canvas-shell.css` path carried 122,737 raw bytes, 24,514 gzip bytes, and 20,937 Brotli bytes. The route therefore removes 44,277 raw bytes (36.1%), 6,299 gzip bytes (25.7%), and 5,694 Brotli bytes (27.2%) while increasing the ordinary authored request boundary from three files to seven. A later deterministic production bundle can recover that request boundary after source ownership stabilizes; runtime imports and a second source tree remain outside the design.

Computed-style and geometry comparison covers enhanced and no-script About at narrow (`390 × 844`), desktop (`1440 × 1000`), and wide (`2560 × 1440`) viewports, plus print, forced-colors, and reduced-motion states. All compared elements and document metrics match the pre-extraction source. Focused source checks keep the exact load order, the single-owner families, the canonical `5rem` in-page anchor clearance, and every legacy consumer's direct dependency graph visible.

This tranche intentionally preserves the legacy deep-blue selector and other route behavior byte-for-byte. Selector repair belongs with an observed defect and its affected-family proof, rather than entering a first-paint ownership move implicitly.

## Implementation return — AI Systems family

The family tranche gives thirteen pages one shared route owner and narrows the three distinctive consumers without proliferating a file for every page:

| Source | Consumers | Authored size |
| --- | --- | ---: |
| `expanded.css` | shared foundation and unresolved legacy terrain | 87,440 bytes · 4,003 lines |
| `styles/routes/ai-systems.css` | all thirteen `.ai-systems-page` routes | 9,881 bytes · 361 lines |
| `styles/components/instrument-atlas.css` | AI Systems and Shared Machinery | 7,830 bytes · 268 lines |
| `styles/routes/ai-systems-entry.css` | AI Systems entry only | 5,130 bytes · 180 lines |
| `styles/routes/hiring-surfaces.css` | Hiring Surfaces only | 10,721 bytes · 379 lines |

`expanded.css` falls from 116,360 to 87,440 bytes, removing 28,920 raw bytes of unrelated AI-family source from every non-family route. Ten common family routes now load `expanded.css → ai-systems.css → canvas-shell.css`. AI Systems adds the atlas component and entry route, Shared Machinery adds the atlas component, and Hiring adds its dedicated route bundle. A separate Shared Machinery file remains deferred: its roughly 0.2–0.3 KiB Brotli saving would introduce another render-blocking request for one small seam.

The exact pre-extraction reference came from commit `19caa1e`. The final family run produced 39 of 39 narrow, desktop, and wide captures at 94.51 MiB with zero browser observations. All 39 image pairs are pixel-identical. An independent computed-style comparison also matched all thirteen routes at `1440`, `390`, and print, including pseudo-elements and document dimensions; FMI, Initiative Costing, and Prompt Side Conditions matched as the three retained unscoped outliers.

The first-paint boundary remains explicit. Relative to the monolithic `expanded.css` plus `canvas-shell.css`, linked CSS changes as follows under separate gzip-9 and Brotli-11 compression:

| Consumer class | Raw delta | Gzip delta | Brotli delta |
| --- | ---: | ---: | ---: |
| Non-family | −28,920 | −3,941 | −2,779 |
| Ten common family routes | −19,039 | −1,670 | −861 |
| AI Systems entry | −6,079 | +1,576 | +1,819 |
| Shared Machinery | −11,209 | +247 | +710 |
| Hiring Surfaces | −8,318 | +77 | +605 |

The three specialized routes parse materially less authored CSS while paying a small cross-file compression and request-boundary cost. This is source-architecture evidence for Wave 5: stable consumer bundles can later recover cross-file compression without collapsing the readable ownership model. The next source tranche established Debriefs catalog, reading-component, and three-movement ownership.

## Implementation return — Debriefs ownership and Reading types repair

The first Debriefs tranche gives three responsibilities direct owners:

| Source | Consumers | Authored size |
| --- | --- | ---: |
| `expanded.css` | shared foundation and unresolved legacy terrain | 83,785 bytes · 3,850 lines |
| `styles/components/debrief-reading.css` | thirteen routes with reading indexes or source bases | 1,713 bytes · 57 lines |
| `styles/routes/debriefs.css` | `debriefs.html`, including Debrief-card components | 16,243 bytes · 696 lines |
| `styles/routes/three-movement-debrief.css` | `choose-your-player-humatics.html` | 2,910 bytes · 104 lines |

The catalog loads `expanded.css → debrief-reading.css → debriefs.css → canvas-shell.css`. The three-movement route loads `expanded.css → debrief-reading.css → three-movement-debrief.css → canvas-shell.css → styles/contracts/debrief-composition.css`. Eleven adjacent component consumers add `debrief-reading.css` immediately after the foundation and preserve their established later route order.

The namespace migration is complete at the CSS boundary: the route scope, hero selector, two referenced custom properties, comment, and filename now use neutral structural names; four unreferenced custom properties are gone; visible content identity remains in the page and its references. The catalog companion becomes `styles/routes/debriefs.css`. Shared reading-route and source-basis rules move together, while route-only posture and contract-transition rules move with the three-movement page.

The local affected-family comparison captured 60 of 60 narrow, desktop, and wide images with zero browser observations. Fifty-five image pairs are byte-identical, including every composed Debrief and every shared-component consumer outside the catalog. The three catalog images carry the intended Reading types repair. The remaining two deltas are confined to the previously observed animated gallery region on the About route at desktop and wide widths. Restoring the former inherited `16px` list-item margin in a temporary browser reading reproduces the exact catalog baseline heights; the retained reset gives all 63 badges a `24.828px` natural height and no horizontal overflow at all three viewports.

The source split exposes one current distribution limit. Under the same Node zlib Brotli-11 comparison, non-consumers remove 3,655 raw bytes and 415 Brotli bytes, while the catalog removes 1,442 raw bytes but adds 359 Brotli bytes. A common shared-reading route removes 1,942 raw bytes and adds 194 Brotli bytes; the three-movement route adds 968 raw bytes and 1,031 Brotli bytes. These are measured request and cross-file compression costs, not a final delivery result. The remaining Debrief base, EHR, and enterprise anchors should gain owners before Wave 5 decides which stable sources merit combined consumer outputs.

## Implementation return — Genomic Viewer route

The first enterprise-reading extraction gives the maximal paired Genomic Viewer Debrief one direct route owner. Sixty-four existing rule groups move together: 54 paired-field, responsive, forced-color, and print groups plus ten late route anchors. This removes 9,700 bytes and 367 lines from `expanded.css`, which now carries 74,085 bytes and 3,483 lines. The receiving `styles/routes/genomic-viewer.css` carries 11,214 bytes and 402 lines, including its ownership header and five explicit shared-component seams. The shared `.debrief-sequence` stays in `expanded.css` because FMI LIMS/ELN remains its second consumer.

The page loads `expanded.css → debrief-reading.css → genomic-viewer.css → canvas-shell.css`. Computed comparison across all 683 body elements matched the pre-extraction source at narrow, desktop, wide, print, and forced-color states with zero property or document-metric differences. The five focused screenshots are byte-identical. The final enterprise-reading pass captured 24 of 24 images with zero browser observations, and every before/after image pair is byte-identical.

The route boundary makes the current distribution tradeoff concrete. Every non-consumer removes 9,700 raw bytes, 1,671 gzip bytes, and 1,241 Brotli bytes. The Genomic Viewer route adds 1,514 raw bytes, 739 gzip bytes, and 790 Brotli bytes across its separate authored sources. Stable consumer outputs remain the later route for recovering cross-file compression while preserving the readable ownership boundary.

## Implementation return — career and regulatory slide component

The next bounded multi-consumer seam gives three exemplar routes one component owner. The complete `.career-slide*`, `.regulatory-slide__accent*`, `.accent-card*`, `.career-roles*`, and `.career-section*` families move with their viewport fallback, container response, entrance keyframes, and reduced-motion response into `styles/components/career-regulatory-slide.css`.

Each consumer loads `expanded.css → career-regulatory-slide.css → canvas-shell.css`. The component carries 8,123 bytes and 373 lines including its ownership header. Its 362-line rule body preserves every selector, declaration, comment, and conditional container. Releasing the surrounding separators reduces `expanded.css` by 7,446 bytes and 365 lines, leaving 66,639 bytes and 3,118 lines on source base `51016ee`. The independent shared-reading extension carries an orthogonal 485-byte, 16-line release; the combined landing leaves 66,154 bytes and 3,102 lines.

The ownership map keeps two demonstrated seams in place. The mixed `.prose-flow` rules remain shared because career slides participate in the broader reading composition, and the global `abbr` treatment remains the abbreviation owner. Focused source and cascade proof confirms selector, declaration, comment, and conditional-container parity; three direct consumers; explicit load order; retained shared seams; and clean diff hygiene. Visual observation remains available when a human review question calls for it.

## Implementation return — Debrief reading orientation and composition contract

The shared-reading extension originally brought the component to fifteen direct consumers and gave orientation-reading placement the same component owner. At source `2d8e708`, the component serves twenty-three Debrief and enterprise-reading routes. The thirteen-consumer figures in the first Debriefs return above remain the historical receipt for that earlier tranche.

Twelve composed Debriefs now load `styles/contracts/debrief-composition.css` from a contract-specific source path. The rule body, selector scope, and established position after route and shell sources remain intact. Its header names the composed movement and evidence surfaces it owns, the opt-in consumer posture, and the related Dual-Track Debrief Composition contract. This move establishes `styles/contracts/` while routes continue to own palette, rhythm, density, source basis, and local composition.

The remaining `.debrief-sequence` rules stay in `expanded.css`. They form a two-rule seam shared by Genomic Viewer and FMI LIMS/ELN, whose current bundle graphs differ. Moving them into the reading component would widen that component beyond demonstrated ownership; creating a dedicated source would add a request for too little independent responsibility. A larger shared sequence or composition boundary can invite that move later.

## Present CSS terrain

The table retains historical cutoffs and binds each current observation to source `2d8e708` so earlier receipts remain interpretable:

| Measure | Observation |
| --- | ---: |
| Top-level Context Canvas HTML pages, current | 42 |
| Pages that load `canvas-shell.css`, current | 41 |
| Pages that load the shared core, current | 40 |
| Pages that load `expanded.css`, current legacy remainder | 39 |
| `expanded.css` baseline | 145,667 bytes · 6,373 lines |
| `expanded.css` after the Genomic Viewer extraction | 74,085 bytes · 3,483 lines |
| `expanded.css` after the career/regulatory component extraction on `51016ee` | 66,639 bytes · 3,118 lines |
| `expanded.css` after the component and shared-reading extension | 66,154 bytes · 3,102 lines |
| `expanded.css` after the About first-paint extraction, current | 46,854 bytes · 2,030 lines |
| shared core and extracted About components, current | 24,476 bytes · 1,156 lines |
| `styles/routes/about.css` | 36,568 bytes · 1,601 lines |
| `styles/routes/about.css`, current | 41,722 bytes · 1,837 lines |
| AI Systems family route, component, entry, and Hiring modules, current | 34,590 bytes · 1,208 lines |
| Debriefs reading component, catalog route, and three-movement route, current | 44,664 bytes · 1,685 lines |
| `styles/routes/genomic-viewer.css`, current | 12,818 bytes · 453 lines |
| `styles/components/career-regulatory-slide.css`, current | 8,238 bytes · 375 lines |
| `styles/contracts/debrief-composition.css`, current | 16,830 bytes · 549 lines |
| `expanded.css` baseline over gzip | 25,957 bytes |
| `expanded.css` baseline over Brotli | 21,015 bytes |
| `field-inspection.css`, current | 13,457 bytes · 431 lines |
| `canvas-shell.css`, current | 12,770 bytes · 479 lines |

The transfer size is modest. The larger cost is architectural: most pages parse unrelated route-family rules, source order carries an implicit API, and collaborators search one long file whose name understates its responsibilities. File movement produces a first-paint gain only when HTML loads a small core and its relevant route bundle directly. A runtime `@import` chain retains the blocking dependency path and therefore sits outside the target.

The pre-extraction authored regions showed coherent seams: foundation and layout, tables, genomic pairs, About, shared machinery, Hiring, AI Systems, prospective inspection, three-movement Debrief composition, shared reading-route components, career and regulatory slides, and Debrief base and anchors. About, shared machinery, Hiring, AI Systems, the Debriefs catalog, shared Debrief reading components, three-movement composition, Genomic Viewer, and the career/regulatory slide component now have explicit owners. The remaining Debrief base and anchor regions continue as starting coordinates for a consumer-grounded move.

## Five planning routes and judgment priors

The modeled success outcome, `S`, is:

> Six months after restructuring, representative routes retain their intended wide, narrow, print, and forced-color expression; utilities remain intact or are deliberately retired; ordinary changes land in the expected module; a new AI collaborator can find the relevant CSS and understand its relationships; and route-level first-paint CSS is materially smaller.

The percentages below are structured judgment priors derived from the current source shape, selector use, existing route extraction, and collaboration posture. They are decision aids rather than measurements from repeated independent refactors.

| Plan | P(S) | Style preserved | Utilities preserved | Six-month maintainability | AI findability | First-paint fit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Distribution compression only | 30% | 98% | 98% | 40% | 30% | 45% |
| Continue ad hoc route extraction | 65% | 90% | 90% | 70% | 70% | 70% |
| **Modular source → core + route bundles** | **82%** | **88%** | **90%** | **90%** | **92%** | **88%** |
| Contract-centric modules | 74% | 82% | 85% | 85% | 93% | 80% |
| Atomic cascade layers and utility redesign | 45% | 60% | 65% | 85% | 82% | 90% |

The selected route is modular source with contract discoverability. It keeps the contract-centric route's orientation value while allowing each page family to carry its own visual intelligence.

This is change-modeling terrain rather than a mechanical file split. Consumer tracing and selector migration are bounded mechanics; useful module boundaries, creative range, first-paint shape, and long-horizon findability evolve together through each extraction. The stopping state is an architecture that is materially better for current collaborators, with legacy and deferred terrain still visible, rather than a claim of one perfect CSS decomposition.

## Visual reference surface

### Capture every top-level page

The general utility discovers every top-level `context-canvas/*.html` page. This is simpler and more durable than maintaining a representative allowlist. At source `2d8e708`, the sitemap has 40 entries and therefore remains a publication surface rather than capture authority. Family metadata organizes capture, review, and the ignored local family index; every route follows the same execution path. Discovery now requires exactly one family assignment, so a new or duplicate route classification fails visibly instead of entering an ambiguous group.

| Review family | Routes |
| --- | --- |
| Entry and catalog | `404.html`, `index.html`, `debriefs.html` |
| AI Systems and instruments | `ai-systems.html`, `benchmark-orientation.html`, `collaboration-skills.html`, `concept-nursery.html`, `core-architectures-orientation-index.html`, `cross-platform-collaboration-cycle.html`, `grammar-family.html`, `hiring-surfaces-talent-agent-intake.html`, `maps-evaluations.html`, `metadata-blocks.html`, `planning-surface.html`, `poda.html`, `readable-tables-reusable-evidence.html`, `registry-goal-fidelity-routing.html`, `resting-concepts.html`, `shared-machinery.html`, `visualization-fidelity-atlas.html` |
| Prompt conditions | `conditioning-field.html`, `prompt-side-conditions-practice.html` |
| Composed Debriefs | `choose-your-player-humatics.html`, `ehr-discrete-genomic-result.html`, `ehr-interface-engine-replatform.html`, `ehr-pgx-alert-failure.html`, `ehr-three-front-doors.html`, `ehr-two-charts-one-result.html`, `fmi-clinical-trial-coordination.html`, `multilingual-clinical-vocabulary-practice.html`, `recoverable-enterprise-forms.html`, `spatial-capture-collaborative-memory.html` |
| Enterprise readings | `distributed-inspection-harness.html`, `field-inspection-harness-replatform.html`, `fmi-lims-eln-replatforming.html`, `genomic-viewer-replatforming.html`, `initiative-costing.html`, `narrative-execution-gap-research-atlas.html`, `one-figure-several-readings.html`, `three-way-comparative-return.html`, `who-to-believe-reviews-platform.html` |
| Historical exemplars | `exemplar-index-landing.html` |

Issue #88 retired four duplicate source-era exemplar documents and their legacy
Occipital preview from the current source tree. Git history retains the earlier
surfaces; current visual-reference runs exercise the single anonymous-composite
landing that still carries an active maintenance contract.

The route catalog also names standing—primary, instrument, Debrief, exemplar, or recovery—so a collaborator can understand why a page exists without teaching the capture runner separate logic.

### Capture posture

- Narrow `390 × 844`, desktop `1440 × 1000`, and wide `2560 × 1440` full-page images cover every route. The uniform pass is simpler than a viewport exception list and reaches the existing `120rem` composition rules that desktop width misses.
- Loopback HTTP preserves repository-relative assets and iframe behavior.
- Reduced motion, a fixed light color scheme, font settling, local iframe settling, and the initial visitor state make runs easier to compare. Focus, hover, disclosure, and other interaction permutations remain outside the all-page pass.
- Lazy images and frames become eager for the run; a bounded page traversal activates them before the viewport returns to the top for capture.
- Stable names carry route, viewport, phase, and source commit.
- One ignored local family index makes the set easy to browse during this collaboration cycle.

The existing `tools/visual-check.mjs` captures full pages and records browser errors. The collection runner reuses those primitives and adds a route catalog, all/family selection, revision-aware naming, and a local browseable index. Here, *focused checks* means checks aimed at named regressions or affected behaviors; it does not mean a focus-state screenshot matrix. Existing scripts continue to cover known rail, control, iframe, Strategy Canvas, and Open Lesson Field behavior when those exact questions recur.

### Before and after

The `before` set was captured at source commit `7cfbdf4`, immediately before the About extraction. Its source commit is part of the artifact identity. When another visitor change lands after that cutoff, only its affected family needs a new named baseline.

Working PNGs remain under ignored `.visual-runs/`. The complete 117-image baseline occupies 322.20 MiB, and the 39-image AI Systems-family phase occupies 94.51 MiB. That local volume is manageable for the current comparison cycle. The runner reports aggregate volume as operating context while screenshots remain local rather than entering repository, release, CDN, or portable storage.

A durable image surface returns only after the human calculates the likely number of unique Cloudflare transformations and separately reopens the storage question. The current runner and family catalog remain useful repository affordances even when every generated image is local and disposable.

The images support human and AI inspection. They are not pixel-approval gates: system fonts and browser rasterization introduce ordinary differences. Review centers on composition, hierarchy, missing content, overflow, responsive movement, and visually material change.

## CSS source and distribution shape

Begin with a shallow structure that a cold collaborator can scan quickly:

```text
context-canvas/
  styles/
    core/
    components/
    contracts/
    routes/
    legacy/
```

- `core/` carries shared tokens, foundation, reading measure, accessibility modes, and layout primitives.
- `components/` carries reusable shell, rail, table, embed, folio, and Debrief components.
- `contracts/` carries semantic tokens and reusable grammar tied to the visual-fidelity contracts.
- `routes/` carries family composition and distinctive expression.
- `legacy/` carries still-supported rules whose consumers or ownership remain uncertain.

Tokens, foundation, layout, and modes can become child directories inside `core/` when repeated files make that refinement easier to navigate. This preserves the value of the earlier detailed architecture without asking the first wave to create empty categories.

A small deterministic build may emit:

```text
canvas-core.css
routes/about.css
routes/ai-systems.css
routes/debriefs.css
routes/inspection.css
```

Authored source remains the collaboration surface. Generated bundles remain distribution artifacts.

## Visual contracts and creative range

Visual contracts work best as composition grammars. They stabilize semantic roles, state expression, reading measure, evidence boundaries, alternate modes, and canonical references. Route modules retain authority over arrangement, scale, texture, density, asymmetry, pacing, and new experiments.

Discoverability should require only three small moves:

1. Link `visual-fidelity-contracts/` from the root and Context Canvas READMEs.
2. Add a compact contract map: `contract → module or namespace → page family → canonical pages`.
3. Place a short header in each CSS module naming ownership, load order, contract references, neutral consumer scopes or families, and the intended room for variation. Keep actual route filenames and content identity in the compact ownership map beside the source so neutral CSS headers remain structurally legible.

A useful experiment can remain route-local. Repeated usefulness creates a reason to enrich a contract. This keeps standards clear and the field creatively alive.

An initial discoverability map can begin here and sharpen as rule ownership moves:

| Contract | Likely receiving source | Canonical page or surface |
| --- | --- | --- |
| Tiffany Ledger Field | `contracts/tiffany-ledger.css` + `routes/about.css` | `index.html` |
| Tiffany Conditions & Routing Field | `contracts/tiffany-conditions-routing.css` + About/prompt route composition | `index.html`, `conditioning-field.html`, `prompt-side-conditions-practice.html` |
| Cobalt Operating Field | `styles/routes/genomic-viewer.css` + operating-field components | Registry × Goal Fidelity, genomic viewer, inspection readings |
| Cobalt Temporal Field | `contracts/cobalt-temporal.css` + temporal-rail component | `three-way-comparative-return.html` and source-native Debrief intervals |
| Rose Quartz Editorial Field | `styles/routes/genomic-viewer.css` + Debrief route composition | Genomic viewer and other source-earned narrative movements |
| Cobalt Constellation Field | `contracts/cobalt-constellation.css` + program-reading composition | `fmi-lims-eln-replatforming.html` and its constellation companion |
| Dual-Track Debrief Composition | Debrief components + `routes/debriefs.css` + `routes/three-movement-debrief.css` + `routes/genomic-viewer.css` | Genomic viewer, EHR series, FMI Clinical Trial Coordination, `choose-your-player-humatics.html` |

This table is a locator. Contract adoption follows the page's source and decision surface, keeping the grammar earned and specific.

### Workspace context

The repository remains implementation authority and can diverge usefully from adjacent planning surfaces. Three sources inform the balance:

- **Continued Iteration Through Context Canvas** is carried here as a complete local explanation: the pages are design input and iterative collaboration surfaces.
- **Soft Color Blocking** is carried here as a complete local explanation: composition-led variation can remain recognizable as one system.
- [Source-Native Timeline Rail](../../visual-fidelity-contracts/cobalt-temporal-field.md) supplies the stable temporal grammar carried by Cobalt Temporal Field.

`grammar-family.html` contributes the wider Cloudflare design field: portable assets, contextual delivery, coordinated rooms, durable undertakings, and visitor-owned surfaces. The superseded Field Inspection Static Assets pilot supplied the first bounded implementation proof; the accepted production carrier and About CSS projection now carry that learning into the active delivery path. The CSS wave keeps those roles connected while additional generated consumers wait for stable source ownership and measured value.

## Extraction waves

### Wave 0 — visual cutoff and way-finding

- Implement the visual-reference outcome as one all-page inventory runner.
- Capture the pre-extraction source revision.
- Link visual contracts and add the compact contract-to-source map.
- Add module headers to the first receiving files.

### Wave 1 — About

- Move About-owned rule blocks to `routes/about.css` without selector renaming.
- Preserve the established load order, narrow behavior, print, reduced motion, forced colors, and embedded-instrument boundaries.
- Compare About at desktop, narrow, and wide; use the full catalog as the source-level reference for unexpected shared effects.

About was selected as the first move after Field Inspection because it is large, visually distinctive, canonically tied to Tiffany contracts, and sufficiently scoped to produce meaningful first-paint relief. Its completed return now supplies the shared-core pattern described above.

### Wave 2 — Shared Machinery and AI Systems

- Separate the shared instrument grammar from AI Systems route composition.
- Keep common components in `components/`; keep page-family composition in `routes/`.
- Preserve current class names and explicit cascade order.

### Wave 3 — Hiring and Debriefs

- Move Hiring as a coherent late cascade anchor.
- Extract Debrief base, composition variants, EHR anchors, enterprise anchors, and catalog-specific styles with their current relationships visible.
- Keep the completed Genomic Viewer route as the maximal paired reference: its direct bundle owns all route modes and the five named shared-component seams, while `.debrief-sequence` remains shared.
- Rename the source-specific three-movement Debrief CSS scope, hero selector, custom properties, comments, and receiving filenames to neutral structural owners. Visible content identity, route names, metadata, and reference material retain their source meaning; the CSS tranche carries no compatibility alias.
- Apply this working migration map as one coherent HTML-and-CSS move:

  | Current identifier or region | Receiving identifier or owner |
  | --- | --- |
  | `.humatics-three-movement-page` | `.three-movement-debrief-page` |
  | `.humatics-hero` | remove; use `.three-movement-debrief-page .debrief-hero` |
  | `--humatics-paper` | `--debrief-rose-paper` |
  | `--humatics-lime` | `--debrief-acid` |
  | `--humatics-blush`, `--humatics-cobalt`, `--humatics-coral`, `--humatics-sand` | remove after confirming zero `var()` references or other consumers |
  | source-specific region comment | `Three-movement Debrief composition` |
  | source-specific rule region | `styles/routes/three-movement-debrief.css` |
  | compatibility alias | none |

- Removing those four unreferenced tokens completes this explicit namespace migration; the broader dead-code and selector redesign wave remains deferred.
- Separate reading-route, source-basis, working-posture, and contract-transition rules by demonstrated reusable role while retaining their current generic selectors. Broader selector redesign remains later terrain.
- Normalize `ul.debrief-card__types.clean-list[aria-label="Reading types"]` item height through one Debrief-card-owned end-margin reset. Apply the repair once, retain the corrected state, and use it as a known-answer cascade probe for the extraction.
- Keep `styles/contracts/debrief-composition.css` and `fmi-lims-eln-replatforming.css` focused on their demonstrated consumers. The catalog companion lives at `styles/routes/debriefs.css`; later consolidation follows consumer evidence.

### Wave 4 — shared core, utilities, and legacy remainder

- Promote only demonstrated shared rules into `core/` or `components/`.
- Place page-local helpers beside their route.
- Keep uncertain, historical, and absent-selector candidates in `legacy/` while consumer evidence develops.
- Retire exact duplicates and unused rules only when a named consumer finding supports the move.

### Wave 5 — stable distribution and CDN

- Emit core and route bundles directly from readable source.
- Apply conservative minification with restructuring and forced media merging disabled.
- Use content-hashed CSS with immutable caching; let HTML carry the updated reference and a shorter cache horizon.
- Record raw, gzip, and Brotli route sizes because they answer the first-paint question directly.

Critical CSS follows actual LCP evidence. Aggressive restructuring follows repeated visual equivalence. Compression serves the source architecture rather than substituting for it.

## Purposeful omissions and return conditions

| Terrain resting outside the current wave | Why it rests | Re-entry condition |
| --- | --- | --- |
| Focus, hover, disclosure, and other interaction-state combinations | The general sweep records the initial visitor state; existing named checks carry consequential interactions | A moved rule owns that state or a reproduced regression lacks a relevant observation |
| Nested `prototypes/` and `site-readings/` inventory | Their self-contained systems have separate source and focused checks | Shared CSS begins affecting them or a public route makes their complete reference set useful |
| Exact cross-platform pixels | System fonts and raster engines preserve character while changing pixels | A deployed brand asset or layout question requires a named cross-browser comparison |
| Full print and forced-color matrix for every page | Representative and focused checks already preserve these modes | A moved family owns mode-specific rules or a visitor condition appears there |
| Tall-page segmentation | Chromium full-page capture is already available | Browser image limits or fixed-layer stitching make a route misleading; then add a segmented fallback with stable overlap |
| Repository, release, CDN, or other portable screenshot storage | Current screenshots serve cycle-scoped local comparison, and Cloudflare transformation count remains uncalculated | The human calculates likely unique transformations and separately requests a durable cross-platform reference surface |
| Git LFS or a new artifact platform | Ignored local images already support the current work | A later authorized durable surface remains materially too large after its storage model is chosen |
| Cascade layers | Mixed layered and unlayered normal rules invert expected authority | Every authored input can enter one declared order in the same change |
| Broad selector and utility redesign | Stable ownership should precede broad naming change; the source-specific three-movement Debrief namespace is the explicit first-tranche exception | Route modules have held through ordinary collaboration and another naming change clearly improves use |
| Automated dead-code purge | Dynamic, legacy, prototype, and future consumers make absence ambiguous | A consumer map and affected-family reading establish safe retirement |
| Inline-style extraction | It is a distinct CSP and cacheability decision | A named public route or policy makes the change consequential |
| Critical CSS | The actual LCP path remains unmeasured | Representative or deployed traces identify the critical route and element |
| Aggressive CSSO restructuring | Semantic grouping matters more than compression in this wave | Conservative output repeatedly preserves the affected families |
| Broader browser automation | Current Chrome, Safari, Firefox, and Edge remain the human observation horizon | A standards edge or visitor report identifies a browser-specific question |
| Stable CDN CSS | Bundle ownership is still moving | Core and route outputs have stabilized through the first extraction waves |
| Older LIMS/ELN pull-request reassessment | The constellation already has a dedicated re-entry issue | The Context Canvas workflow and CSS collaboration wave settle |

## Missing or dangling edges to keep visible

- The ignored `.visual-runs/` path is purposefully cycle-local. Cross-platform image hydration rests until the Cloudflare transformation calculation and a later explicit storage decision.
- Full-page capture can freeze an arbitrary animation frame or duplicate fixed layers on very long pages; reduced motion and a conditional segmented fallback keep the reference truthful.
- Local iframes and external assets need a settled initial state. A route error belongs in the summary rather than disappearing from the reference index.
- `404.html` is part of the all-page set even though it is a recovery route. Its standing should remain visible in the catalog.
- The six pages with inline style blocks belong in the visual baseline while their extraction remains a later CSP/cache wave.
- Active visitor issues can change the baseline. The cutoff commit and family-specific recapture keep CSS comparison distinct from concurrent content movement.
- The Cloudflare Field Inspection pilot remains a valid historical direct-view proof. The accepted production carrier owns current delivery, and Issue #428 coordinates complete pilot retirement. Additional hashed CSS consumers and broader CDN policy follow stable bundle boundaries and measured value.
- Repository naming remains an independent identity decision.
- Local tools and ordinary review remain the standing visual-reference and CSS loop. Path-bound pull-request checks and confirmation-gated manual proofs add hosted evidence when a receiving decision benefits from it.

## Re-entry

The career/regulatory component, fifteen-consumer reading component, and composed-Debrief contract owner are now settled within the modular CSS program. Re-enter through a larger demonstrated shared-reading or composition family rather than splitting the two-rule `.debrief-sequence` seam on its own. The [threadkeeping settlement](../../threadkeeping/context-canvas-css-and-visual-reference-settlement.md) preserves the observed load order, proof boundary, distribution limits, and intentional deferrals.

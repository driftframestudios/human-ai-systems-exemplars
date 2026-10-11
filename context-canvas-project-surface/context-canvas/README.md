# Context Canvas

Context Canvas is a static, progressively enhanced enterprise reading system. HTML, CSS, SVG, and semantic state carry the complete reading; small JavaScript modules add shared navigation and bounded instruments. The pages themselves are the primary design inputs: preserve their evidence boundaries, visual contracts, reading order, and role-specific agency as the system develops.

## Start with the reading surface

- [`index.html`](index.html) introduces the technology leadership portfolio and the Context Canvas method.
- [`ai-systems.html`](ai-systems.html) gathers the AI-legible architecture and related instrument routes.
- [`benchmark-orientation.html`](benchmark-orientation.html) connects benchmark revision, model and harness conditions, scoring, aggregation, uncertainty, and receiving use in one result coordinate.
- [`maps-evaluations.html`](maps-evaluations.html) begins with Alignment Research Center's canonical MAPS canary record and keeps adjacent public ARA evaluation work source-bounded.
- [`debriefs.html`](debriefs.html) provides the catalog of completed and prospective readings.
- [`grammar-family.html`](grammar-family.html) compares composable site readings and debriefs across portable assets, embedded instruments, and contextual delivery.
- [`collaboration-skills.html`](collaboration-skills.html) explains portable skill contracts, bounded projections, candidacy, release, and cross-platform adoption.
- [`field-inspection-harness-replatform.html`](field-inspection-harness-replatform.html) demonstrates a prospective, implementation-gated enterprise reading.
- [`prototypes/index.html`](prototypes/index.html) exposes the local prototype library and its source-aware manifests.

Each public page remains useful when enhancement is unavailable. Embedded prototypes pair their interactive surface with a semantic orientation or static equivalent in the parent page.

The repository's [Visual Fidelity Contracts](../../visual-fidelity-contracts/README.md) describe stable semantic and composition contracts with canonical examples. The contracts support orientation while each route retains authority over color, rhythm, density, layout, and source-earned experimentation. The [Context Canvas surface-reading](../../.agents/skills/context-canvas-surface-reading/SKILL.md), [CSS-ownership](../../.agents/skills/context-canvas-css-ownership/SKILL.md), [visual-verification](../../.agents/skills/context-canvas-visual-verification/SKILL.md), and [anthropomorphic-cue audit](../../.agents/skills/audit-anthropomorphic-cues/SKILL.md) skills provide compact collaboration routes into this terrain.

The [Context Canvas schema v1](../../schemas/context-canvas/1.0.0/README.md) supplies collection, visitor-surface, prototype-surface, and reference-artifact profiles. [Collaboration Skills 0.1.0](../../schemas/collaboration-skills/0.1.0/README.md) carries one portable contract, one retired projection, and one route-changing account into a cross-platform adoption kit. Human-readable page, skill, and account sources remain semantic authorities for their meaning. The GitHub-backed exact-version projection is observed at `schemas.radiantnull.com`; [Issue #406](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/406), under the [Issue #18](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/18) delivery family, owns the successor `schemas.vik.guru` parity and activation cycle.

## Source and public route map

| Role | Current route and standing |
| --- | --- |
| Authored source | This directory owns the tracked visitor pages, shared assets, and local prototype projections. |
| Local development | Serve the repository root, then open `/context-canvas-project-surface/context-canvas/`. |
| Primary production | The production assembler maps this visitor root into generated `primary-public/`, where this directory's `index.html` becomes `/index.html` at the intended `https://vik.guru/` origin. |
| Hosted iframes | Manifest-selected instruments use the separate `https://iframes.vik.guru/v1/core/.../` and `/v1/canvas/.../` families. Current live acceptance remains with Issues [#72](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/72) and [#102](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/102). |
| Progressive video | Selected native-video carriers resolve through the same-origin `https://vik.guru/v1-cdn/video/` Worker route. The [bounded video-publication manifest](../../planning/media-publication/video-publication-manifest.v0.1.json) records accepted public identities and open page-release states while R2 retains the media bytes. |
| Full-view and collaboration routes | The generated primary file tree carries selected `/prototypes/.../` and `/collaboration/.../` files. Adjacent full-view links use those primary-site routes rather than opening the primary site inside an iframe. |
| Schemas | A schema's `$id` remains its semantic identity. `schemas.radiantnull.com` is observed retrieval; Issue #406 owns the gated successor publication and exact-version live check at `schemas.vik.guru`. |

The project-level [`asset-inventory.json`](../asset-inventory.json) supplies the
semantic family, visitor job, accessibility owner, provenance, and recovery
facts used when the production assembler resolves selected images. The primary
and iframe manifests continue to select membership; the generated deployment
manifest joins each selected public projection back to one canonical source
asset and exact source digest.

The five Debrief working-system and visual-comparison families retain their accepted,
unsuffixed WebPs as full-size inspection targets. Run
`npm run build:debrief-image-derivatives` after replacing an accepted source;
the repository-owned generator uses `cwebp` to produce the `960w` and `1920w`
responsive candidates declared in the pages and inventory. It skips a
candidate at or above the accepted source width, removes a previously generated
candidate that has become ineligible, writes through a verified same-directory
temporary file, and reports the active `cwebp` version without
treating encoded bytes as stable across encoder releases. Run
`npm run check:debrief-image-derivatives` to check candidate eligibility, exact
dimensions, and preserved source aspect ratios without rewriting the tracked
files. Source replacement becomes current by running the build command; the
check avoids inferring content freshness from checkout timestamps or partial
Git history. Review interface text and geometry in regenerated candidates
before rebuilding the production projection. The extracted table component
and remaining legacy rules keep dense landscape interfaces on a
keyboard-scrollable `56rem` inspection canvas with a `78rem` wide cap, while
portrait views use the narrower `42rem` cap.

The first native Debrief video appears in
[`choose-your-player-humatics.html`](choose-your-player-humatics.html) after
At-a-Glance and before the architecture navigation. Its accepted R2 MP4 and
poster remain external to the image-only asset inventory. The page owns the
media's semantic standing, accessible name, visible video-only sequence
description, fallback link, and responsive frame; the media-publication
manifest owns the compact carrier and release-state descriptor. The
[`accessible-video-publication` candidate](../../planning/media-publication/draft-skills/accessible-video-publication/SKILL.md)
and its [first receiver exercise](../../planning/media-publication/exercises/choose-your-player-native-video-receiver.v0.1.md)
preserve the reusable preparation and placement decisions.

The accepted Registry visual masters remain the source-level reference for
dependency-free visitor SVGs: the
[`question route map`](../img/plot/registry_question_route_map.svg),
[`narrative relationship map`](../img/plot/registry_narrative_relationship_map.svg),
and
[`narrative-to-execution sequence`](../img/plot/registry_narrative_to_execution_method_sequence.svg).
Each one carries a useful title and description, semantic groups, direct text,
and visual relationships that remain legible without color alone. The later
[`goal-fidelity operating field`](../img/plot/registry_goal_fidelity_operating_field.svg)
extends the same selected `img/plot/` family.

## Runtime contract

- Plain HTML owns document meaning, reading order, links, fallback content, and structured metadata.
- CSS owns the visual contract, reflow, print behavior, forced-color behavior, and reduced-motion response.
- `visitor-boundary-contract.js` carries the ordinary-language context and exact ordered canary definition used to verify each source-authored visitor boundary.
- `canvas-shell.js` progressively installs the route shelf, section rail, and shared footer, then preserves the verified visitor boundary immediately before attribution. Ordinary links and authored page content remain the durable path.
- `about-media.js` keeps the About visual sequence on its authored poster until a visitor requests motion, returns after one complete cycle, and keeps the still reading active for reduced-motion and print presentations.
- `who-to-believe-system-graph.js` admits one finite, page-local graph contract, then coordinates architecture comparison, concern emphasis, direct node selection, and incoming or outgoing neighbor traversal. Its frozen classic-script/CommonJS API keeps the same controller available to direct local inspection and focused tests. Native controls own input semantics; the adjacent HTML reading carries every node and connection through scriptless, print, and recovery states.
- Native Debrief video uses visitor controls, metadata preload, intrinsic geometry, a reviewed poster, and a visible transcript or video-only visual sequence. The selected page owns its reading coordinate and final release; the same-origin R2 Worker owns passive carrier delivery.
- Prototype scripts own local interaction state. Sandboxed iframes declare the capabilities each instrument actually uses. Their Core and Canvas route families remain separate inside the aggregate `/v1/` delivery package.
- Human stewards retain authority over identity, source use, sensitive material, publication, and consequential decisions. Automated checks report observable behavior and leave those decisions visible.

The visitor-boundary rule applies across top-level pages, self-contained
prototypes, and canonical generator templates: ordinary-language benchmark
context precedes the exact MAPS and BIG-bench markers, and attribution closes
the footer. Maintained projections and iframe package digests are rebuilt from
their owners after a source change. Exact marker text remains centralized in
the shared contract and its tests.

Every top-level visitor route carries one source-authored ownership and
Apache-2.0 notice in its static HTML, preserving the notice in the baseline
reading. `AUTHORS` is the copyright-holder authority, and the repository-root
`LICENSE` remains the complete license text.

## Document head order

Top-level routes usually present charset and viewport, compact page metadata, first-paint stylesheets in their established cascade order, deferred `visitor-boundary-contract.js`, deferred `canvas-shell.js`, and then inline JSON-LD. The boundary contract loads before shell enhancement so the authored context and marker stack can be verified in place. This sequence gives visitor resources an early discovery path while structured data remains a descriptive projection of the visible document. Route-local material can occupy an earlier position when embedding, cascade, or execution behavior depends on it; the affected page carries that reason beside the dependency.

## Stylesheet ownership

The shared core now has direct token and foundation owners. Site navigation,
tables, and the demonstrated route-card grid have direct component owners.
Routes that still need unresolved reading, editorial, or route terrain load
`expanded.css` afterward as an explicit legacy remainder. Route-specific
styles follow those shared owners and precede `canvas-shell.css` when their
cascade depends on the shared layer. About is the first route whose complete
first-paint graph leaves `expanded.css` behind.

Current high-signal ownership:

| Source | Direct consumer | Visual authority and seam |
| --- | --- | --- |
| [`styles/core/tokens.css`](styles/core/tokens.css) | 44 top-level routes | Stable palette and link roles, measures, spacing, and shared table dimensions; first source in the shared core graph. |
| [`styles/core/foundation.css`](styles/core/foundation.css) | 44 top-level routes | Box sizing, document type, semantic normalization, links, lists, images, figures, the established type scale, and shared reading-container and prose-flow composition. |
| [`styles/components/site-navigation.css`](styles/components/site-navigation.css) | 44 top-level routes | Shared three-destination navigation, page offset, route state, and canonical `5rem` in-page anchor clearance. |
| [`styles/components/tables.css`](styles/components/tables.css) | 39 routes with semantic tables or shared table wrappers | Table structure, responsive containment, focus, state, forced-color, and print behavior. |
| [`styles/components/route-card-grid.css`](styles/components/route-card-grid.css) | [`index.html`](index.html), [`prompt-side-conditions-practice.html`](prompt-side-conditions-practice.html) | Shared two-column route collection and its narrow and reduced-motion behavior. |
| [`expanded.css`](expanded.css) | 43 top-level routes | Explicit legacy remainder for reading, editorial, and route terrain whose clearer owner is still being established through Issue #51. |
| [`canvas-shell.css`](canvas-shell.css) | 45 top-level routes; [`debriefs.html`](debriefs.html) currently demonstrates source-derived rail mode | Shared generated footer and page rail, loaded after core, legacy where consumed, component, and route CSS. `data-canvas-page-rail-source` exposes direct identified children as destinations while major-section discovery remains the fallback; route bundles retain palette, rhythm, density, and composition. |
| [`styles/routes/about.css`](styles/routes/about.css) | [`index.html`](index.html) | About tokens and composition under the [paired-evidence ledger contract](../../visual-fidelity-contracts/tiffany-ledger-field.md) and [prompt-condition routing contract](../../visual-fidelity-contracts/tiffany-conditions-routing-field.md); core, navigation, table, and route-card owners precede this route directly. |
| [`styles/routes/about-noscript.css`](styles/routes/about-noscript.css) | [`index.html`](index.html) without scripting | Complete static folio and Prompt Conditions reading after the About route bundle. |
| [`styles/routes/ai-systems.css`](styles/routes/ai-systems.css) | Sixteen pages carrying `.ai-systems-page` | Shared scan, content-region, card, reading-path, instrument, and orchestration styles. The [operating-map visual contract](../../visual-fidelity-contracts/cobalt-operating-field.md) keeps actors, decision context, service movement, recovery, and authority legible. |
| [`styles/components/instrument-atlas.css`](styles/components/instrument-atlas.css) | [`ai-systems.html`](ai-systems.html), [`shared-machinery.html`](shared-machinery.html) | Reusable atlas table and prototype-card structure, loaded before the AI Systems route bundle. |
| [`styles/routes/ai-systems-entry.css`](styles/routes/ai-systems-entry.css) | [`ai-systems.html`](ai-systems.html) | Entry bridges, live-lab summaries, Goal Fidelity tables, and late route anchors after the shared AI Systems route bundle. |
| [`styles/routes/hiring-surfaces.css`](styles/routes/hiring-surfaces.css) | [`hiring-surfaces-talent-agent-intake.html`](hiring-surfaces-talent-agent-intake.html) | Two-reader palette, Hiring content regions and tables, responsive treatment, and late route anchors after the shared AI Systems route bundle. |
| [`styles/components/career-regulatory-slide.css`](styles/components/career-regulatory-slide.css) | [`exemplar-ideal-debrief.html`](exemplar-ideal-debrief.html), [`exemplar-index-landing.html`](exemplar-index-landing.html), [`exemplar-maximal-debrief.html`](exemplar-maximal-debrief.html) | Reusable split-to-stack career and regulatory slides, accent cards, content sections, responsive and container behavior, entrance motion, and reduced-motion response; loaded after `expanded.css` and before the shell. |
| [`styles/components/debrief-reading.css`](styles/components/debrief-reading.css) | Twenty Debrief and enterprise-reading routes | Shared reading-route navigation, source-basis lists, and orientation-reading placement, loaded directly after `expanded.css`. |
| [`styles/routes/benchmark-readings.css`](styles/routes/benchmark-readings.css) | [`benchmark-orientation.html`](benchmark-orientation.html), [`maps-evaluations.html`](maps-evaluations.html) | Result-coordinate flow, reusable result profile, source-lane distinction, and canary orientation after the shared AI Systems family bundle. |
| [`styles/routes/debriefs.css`](styles/routes/debriefs.css) | [`debriefs.html`](debriefs.html) | Catalog layout, filters, Debrief-card badges and metadata, browse/preview composition, and alternate modes after the shared Debrief-reading component. |
| [`styles/routes/three-movement-debrief.css`](styles/routes/three-movement-debrief.css) | [`choose-your-player-humatics.html`](choose-your-player-humatics.html) | Three-movement hero, working-posture, and contract-transition composition under the [Dual-Track Debrief Composition](../../visual-fidelity-contracts/dual-track-debrief-composition.md) contract. |
| [`styles/routes/genomic-viewer.css`](styles/routes/genomic-viewer.css) | [`genomic-viewer-replatforming.html`](genomic-viewer-replatforming.html) | Paired solution and implementation tracks, route visuals, alternate modes, and named shared-component seams under the [paired-debrief composition contract](../../visual-fidelity-contracts/dual-track-debrief-composition.md); loaded after the Debrief-reading component and before the shell. |
| [`styles/contracts/debrief-composition.css`](styles/contracts/debrief-composition.css) | Ten composed Debriefs, including [`The Photographs Were a Proxy`](spatial-capture-collaborative-memory.html), [`Language Control Belongs with the Learner`](multilingual-clinical-vocabulary-practice.html), and [`The Form Is a Contract`](recoverable-enterprise-forms.html) | Contract layer for movement labels, outcome blocks, handoffs, and Evidence Boundaries; loaded after foundation, component, route, and shell styles where a composition opts in. The three current Debriefs use the shared lean-paired grammar without adding route-specific CSS. |
| [`field-inspection.css`](field-inspection.css) | [`field-inspection-harness-replatform.html`](field-inspection-harness-replatform.html) | Field Inspection route treatment, loaded after the shared foundation. |

Existing companions such as `fmi-lims-eln-replatforming.css` remain focused on their named surfaces.

Shared visitor links use four immutable light/dark unvisited/visited palette
roles in `styles/core/tokens.css` and consume their two inherited active roles
through `styles/core/foundation.css`. A painted surface declares its background
plus the complete active pair; a nested surface that changes the paint resets
both active roles. Route owners can assign local active values when their art
direction calls for a different audited foreground. The CSS-ownership skill's
[surface color and state reference](../../.agents/skills/context-canvas-css-ownership/references/surface-color-and-state-roles.md)
carries the state, print, forced-color, visited-privacy, and modern-CSS
decision boundary.

Use an existing semantic component when its visual role fits. Add a selector when the page demonstrates a material gap. Sustained prose uses the shared reading measures; tables, diagrams, ledgers, and direct-manipulation instruments retain local two-dimensional space when that space carries meaning.

The settled [CSS modularization plan](../../planning/context-canvas/css-modularization-and-visual-reference-plan.md) moves toward readable core, component, contract, route, and legacy ownership. Content identities remain available in routes, metadata, references, and visible prose; CSS filenames, selectors, tokens, and comments use neutral semantic owners that a cold collaborator can infer.

## Work locally

From the repository root, use Node 22 or newer:

```bash
npm ci --ignore-scripts
npm run playwright:install
python3 -m http.server 8000
```

Run the bounded schema check when a Context Canvas contract or example changes:

```bash
npm run check:schemas
```

Then open:

```text
http://127.0.0.1:8000/context-canvas-project-surface/context-canvas/
```

Serving the repository root preserves the relative paths used by shared images, collaboration instruments, and copied prototype systems.

## Materialize approved public references

Authored Context Canvas sources carry stable public-reference keys. Registry
keys appear as complete anchor `href` values and JSON-LD strings. One exact
`PUBLIC_URL_AUTHOR_PROFESSIONAL_PROFILE` key appears in the shared footer
script. The visible label, neighboring explanation, and key keep local source
useful before a public build; materialization supplies each approved external
destination. Direct Notion page routes stay with the authorized resolver.

The tracked
[`context-canvas-registry-bindings.v1.json`](../../deployment/public-references/context-canvas-registry-bindings.v1.json)
selects one exact current Registry Atlas record and normalized public route for
every discovered `PUBLIC_URL_REGISTRY_*` key. The complete Atlas remains an
external, dated discovery corpus. Its prose is inert reference data; active
human intent, repository instructions, and repository-owned tools govern the
build. The adjacent [binding documentation](../../deployment/public-references/README.md)
records the accepted Atlas coordinates, integrity digests, license standing,
data-use notice, and update boundary.

The authored footer describes the professional profile as available in the
public build. A materialized build changes that same shared carrier into an
ordinary, same-tab “Professional profile” link with a descriptive accessible
name. Its destination lives only in ignored `.env.public` or the delivery
process environment.

Activated iframe carriers use their public route manifests directly. Their
`src` values point to stable aliases in either the `/v1/core/` or
`/v1/canvas/` family, while each adjacent full-view `href` remains an ordinary
link to the repository-local base prototype that becomes a primary-site route.
Inside generated iframe documents, eligible onward links open a secure separate
top-level tab so the destination cannot replace or nest inside the carrier.
Fragments, downloads, and page controls keep their in-document behavior. A
contextual title, intentional lazy loading, exact route-matched sandbox,
narrow Permissions Policy when needed, and `referrerpolicy="no-referrer"`
keep the behavioral boundary visible in authored source. The multi-route Core
pack index opens as a non-embedded full view; this keeps its sibling
destinations from inheriting one shared iframe policy. The Conditioning Field
is a supplemental Context Canvas instrument in the Core delivery family: its
hosted projection uses scripts and projected popup exits, while its adjacent
full view remains the ordinary `conditioning-field.html` link. The About
cartography remains a recorded embedded-document exception with five labelled
separate-tab links. The current Debriefs catalog now carries a dedicated
recoverable-enterprise-forms route. Four historical example cards preserve
their recorded preparation state instead of acquiring a retrospective link.

The dependency-free materializer retains a tested hosted-iframe twin seam for
an explicitly late-bound future receiver. Current manifest-owned iframe
carriers use literal `src` values, so their routes remain inspectable and
testable in tracked HTML before publication.

The accepted Notion boundary is concise: only the Enterprise Human-AI
Practitioner Registry root and its descendants are public-possible. A key name
expresses that scope but cannot prove ancestry, content standing, or anonymous
availability. The authorized resolver and human review establish those facts
before a destination enters the tracked binding.

From the repository root:

```bash
cp .env.public.example .env.public
# Add the approved professional-profile destination.
npm run build:public-references
npm run test:public-references
```

An explicit process-environment value can override the professional-profile
entry, which keeps the same build seam available to a later delivery receiver.
Registry settings in either external receiver are rejected while the tracked
binding is active. The materializer never prints destination values. It
requires exact source-discovered Registry-token coverage and rejects malformed,
non-HTTPS, userinfo-bearing, credential-shaped, ambiguous, duplicate, or
unsupported settings before replacing an accepted generation. Authored source
continues to define the required key set; the reviewed binding supplies its
Registry destinations.

The ignored output is
`.public-reference-build/context-canvas-project-surface/`. The builder copies
the complete `context-canvas-project-surface/` subtree, transforms approved
Context Canvas HTML carriers and the one shared footer-script carrier, and
preserves every other regular file byte-for-byte. It validates token-bearing
JSON-LD, scans every copied regular file for direct Notion routes, and replaces
the prior generation only after the complete result succeeds. Configuration
and the Registry coordination directory stay outside the copied tree. Symbolic links and special filesystem entries
stay outside this build boundary. Tracked input remains byte-unchanged. An
operational restore failure preserves the ignored recovery directory for an
explicit local recovery.

This output is a materialized subtree, not an audience decision or a complete
delivery closure. Some Context Canvas routes intentionally reference schemas,
collaboration instruments, and other repository-owned resources above this
subtree. The production assembler owns that explicit dependency closure and
calls the same materialization logic while creating the disjoint primary and
iframe outputs described in [`deployment/cpanel/`](../../deployment/cpanel/README.md).
The Field Inspection pilot retains its separate authored-byte parity and
no-index proving role.

Before a generated subtree enters that publication-assembler handoff, give the
exact ignored artifact its named secret-material observation:

```bash
npm run security:secrets:public-references
```

The first use installs the pinned external scanner with
`npm run security:secrets:install`. This observation is complementary to the
dependency-free materializer tests; the
[repository secret-material boundary](../../threadkeeping/repository-secret-material-boundary.md)
states what its generated canary and clean artifact receipt establish, and the
[secret-boundary inspection skill](../../.agents/skills/secret-boundary-inspection/SKILL.md)
carries that observation into a receiving repository.

## Verify a visitor-facing change

Choose the existing check that answers the page question under review:

```bash
npm run test:context-canvas
npm run check:debrief-image-derivatives
npm run test:debrief-catalog-preview-browser
npm run test:who-to-believe-system-graph-browser
npm run test:video-receivers-browser
npm run test:context-canvas-narrow-rails
npm run test:prototype-control-labels
npm run visual:check -- path/to/page.html --selector "main"
npm run visual:rail-labels
npm run test:open-lesson-field
npm run test:strategy-canvas
```

The Context Canvas source suite protects source-authored visitor metadata,
shared rail ownership, and the About-page identity seam. The narrow-rail
contract is the lightweight all-route check for generated rail disclosure,
clipping, scroll reachability, the 56rem seam, forced colors, and print. The
native-video receiver contract observes the selected Debrief and AI Systems
frames at narrow, medium, and wide widths with passive local carrier fixtures;
live delivery and deployed playback remain separate release observations. The
prototype-control-label contract checks the Cross-Functional Investment
Studio at 1280, 701, 700, 390, and 320 CSS pixels, including generated rows and
rerenders; the Canvas and Core iframe browser contracts apply the corresponding
label-retention observation across their form-bearing route families. The
generic visual check records the requested surface at desktop and mobile
widths, document containment, and browser errors; `visual:rail-labels` adds
screenshot-bearing ordinary-rail interaction evidence. The other interaction
contracts cover their named collaboration systems in depth. Choose the fitting
check for each page behavior.

A useful verification note names the command, viewport-relevant result, and ignored `.visual-runs/` artifact directory. A new check joins the shared harness when a reproduced visitor-facing defect gives it a stable purpose.

Before a CSS extraction, capture the complete initial-state reference or one affected route group from the repository root:

```bash
npm run visual:context-canvas-reference -- --phase before
npm run visual:context-canvas-reference -- --phase after-about --family entry-and-catalog
```

Each run requires all 46 current routes to have exactly one family, then records
138 narrow, desktop, and wide full-page images, the source revision, route
standing, browser observations, and a local route-group index under ignored
`.visual-runs/context-canvas-reference/`. When the loopback runner requests a
declared `iframes.vik.guru/v1/` carrier, one exact Chromium
`ERR_BLOCKED_BY_RESPONSE` navigation plus its matching `frame-ancestors
https://vik.guru` console message is recorded as an expected iframe refusal.
Missing, unpaired, malformed-route, wrong-host, and differently caused failures
remain observations. Capture success and observation review remain separate:
inspect the generated `summary.json` before interpreting a passing exit status.

## Cloudflare proving surface

[`cloudflare/context-canvas-field-pilot`](../../cloudflare/context-canvas-field-pilot/README.md) owns the bounded Field Inspection Static Assets pilot. Its deterministic builder copies an explicit public dependency closure into ignored `dist/`; `--check` confirms byte parity and rejects extra files. The pilot keeps ordinary assets on Cloudflare's asset-first path and reserves Worker execution, storage, and contextual composition for a demonstrated runtime need.

The pilot measures delivery behavior. The broader Cloudflare delivery architecture in `grammar-family.html` remains design terrain for later composed readings, coordinated rooms, durable undertakings, and visitor-owned surfaces.

## Public evidence boundary

Public routes name identity, prospective estimates, source authority, and unresolved implementation questions directly. Internal planning, historical logs, credentials, and sensitive source material remain outside the published asset closure. A named human steward approves any change that expands audience, identity, data handling, embedding authority, or deployment scope.

The next move stays bounded and revisable: improve one visible reading or runtime boundary, observe it with the narrowest useful evidence, and carry the result into the next design decision.

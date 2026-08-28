# Context Canvas

Context Canvas is a static, progressively enhanced enterprise reading system. HTML, CSS, SVG, and semantic state carry the complete reading; small JavaScript modules add shared navigation and bounded instruments. The pages themselves are the primary design inputs: preserve their evidence boundaries, visual contracts, reading order, and role-specific agency as the system develops.

## Start with the reading surface

- [`index.html`](index.html) introduces the illustrative portfolio and the Context Canvas method.
- [`ai-systems.html`](ai-systems.html) gathers the AI-legible architecture and related instrument routes.
- [`debriefs.html`](debriefs.html) provides the catalog of completed and prospective readings.
- [`grammar-family.html`](grammar-family.html) compares composable site readings and debriefs across portable assets, embedded instruments, and contextual delivery.
- [`collaboration-skills.html`](collaboration-skills.html) explains portable skill contracts, bounded projections, candidacy, release, and cross-platform adoption.
- [`field-inspection-harness-replatform.html`](field-inspection-harness-replatform.html) demonstrates a prospective, implementation-gated enterprise reading.
- [`prototypes/index.html`](prototypes/index.html) exposes the local prototype library and its source-aware manifests.

Each public page remains useful when enhancement is unavailable. Embedded prototypes pair their interactive surface with a semantic orientation or static equivalent in the parent page.

The repository's [Visual Fidelity Contracts](../../visual-fidelity-contracts/README.md) describe stable semantic and composition contracts with canonical examples. The contracts support orientation while each route retains authority over color, rhythm, density, layout, and source-earned experimentation. The [Context Canvas surface-reading](../../.agents/skills/context-canvas-surface-reading/SKILL.md) and [CSS-ownership](../../.agents/skills/context-canvas-css-ownership/SKILL.md) skills provide compact collaboration routes into this terrain.

The [Context Canvas schema v1](../../schemas/context-canvas/1.0.0/README.md) supplies collection, visitor-surface, prototype-surface, and reference-artifact profiles. [Collaboration Skills 0.1.0](../../schemas/collaboration-skills/0.1.0/README.md) carries one portable contract, one retired projection, and one route-changing account into a cross-platform adoption kit. Human-readable page, skill, and account sources remain semantic authorities for their meaning. The GitHub-backed exact-version projection is active at `schemas.radiantnull.com`; issue work:schema-retrieval-and-page-migration carries renewed operator-host observation and final dual-route parity.

## Runtime contract

- Plain HTML owns document meaning, reading order, links, fallback content, and structured metadata.
- CSS owns the visual contract, reflow, print behavior, forced-color behavior, and reduced-motion response.
- `canvas-shell.js` progressively installs the route shelf, section rail, and shared footer. Ordinary links and authored page content remain the durable path.
- Prototype scripts own local interaction state. Sandboxed iframes declare the capabilities each instrument actually uses.
- Human stewards retain authority over identity, source use, sensitive material, publication, and consequential decisions. Automated checks report observable behavior and leave those decisions visible.

Every top-level visitor route carries one source-authored ownership and
Apache-2.0 notice in its static HTML, preserving the notice in the baseline
reading. `AUTHORS` is the copyright-holder authority, and the repository-root
`LICENSE` remains the complete license text.

## Document head order

Top-level routes usually present charset and viewport, compact page metadata, first-paint stylesheets in their established cascade order, deferred `canvas-shell.js`, and then inline JSON-LD. This sequence gives visitor resources an early discovery path while structured data remains a descriptive projection of the visible document. Route-local material can occupy an earlier position when embedding, cascade, or execution behavior depends on it; the affected page carries that reason beside the dependency.

## Stylesheet ownership

`expanded.css` carries the shared foundation, reading layout, tables, reusable editorial components, and established route groups that still await a clearer source owner. Route-specific styles load after that foundation and before `canvas-shell.css` when their cascade depends on the shared layer.

Current high-signal ownership:

| Source | Direct consumer | Visual authority and seam |
| --- | --- | --- |
| [`expanded.css`](expanded.css) | Broad Context Canvas foundation | Shared reading, table, editorial, and route-card rules; named route extractions progressively reduce this surface. |
| [`canvas-shell.css`](canvas-shell.css) | 39 direct consumers across 40 top-level routes; [`debriefs.html`](debriefs.html) currently demonstrates source-derived rail mode | Shared generated footer and page rail, loaded after foundation, component, and route CSS. `data-canvas-page-rail-source` exposes direct identified children as destinations while major-section discovery remains the fallback; route bundles retain palette, rhythm, density, and composition. |
| [`styles/routes/about.css`](styles/routes/about.css) | [`index.html`](index.html) | About tokens and composition under the [paired-evidence ledger contract](../../visual-fidelity-contracts/tiffany-ledger-field.md) and [prompt-condition routing contract](../../visual-fidelity-contracts/tiffany-conditions-routing-field.md); shared route-card and table rules remain in `expanded.css`. |
| [`styles/routes/about-noscript.css`](styles/routes/about-noscript.css) | [`index.html`](index.html) without scripting | Complete static folio and Prompt Conditions reading after the About route bundle. |
| [`styles/routes/ai-systems.css`](styles/routes/ai-systems.css) | Fourteen pages carrying `.ai-systems-page` | Shared scan, content-region, card, reading-path, instrument, and orchestration styles. The [operating-map visual contract](../../visual-fidelity-contracts/cobalt-operating-field.md) keeps actors, decision context, service movement, recovery, and authority legible. |
| [`styles/components/instrument-atlas.css`](styles/components/instrument-atlas.css) | [`ai-systems.html`](ai-systems.html), [`shared-machinery.html`](shared-machinery.html) | Reusable atlas table and prototype-card structure, loaded before the AI Systems route bundle. |
| [`styles/routes/ai-systems-entry.css`](styles/routes/ai-systems-entry.css) | [`ai-systems.html`](ai-systems.html) | Entry bridges, live-lab summaries, Goal Fidelity tables, and late route anchors after the shared AI Systems route bundle. |
| [`styles/routes/hiring-surfaces.css`](styles/routes/hiring-surfaces.css) | [`hiring-surfaces-talent-agent-intake.html`](hiring-surfaces-talent-agent-intake.html) | Two-reader palette, Hiring content regions and tables, responsive treatment, and late route anchors after the shared AI Systems route bundle. |
| [`styles/components/career-regulatory-slide.css`](styles/components/career-regulatory-slide.css) | [`exemplar-ideal-debrief.html`](exemplar-ideal-debrief.html), [`exemplar-index-landing.html`](exemplar-index-landing.html), [`exemplar-maximal-debrief.html`](exemplar-maximal-debrief.html) | Reusable split-to-stack career and regulatory slides, accent cards, content sections, responsive and container behavior, entrance motion, and reduced-motion response; loaded after `expanded.css` and before the shell. |
| [`styles/components/debrief-reading.css`](styles/components/debrief-reading.css) | Fifteen Debrief and enterprise-reading routes | Shared reading-route navigation, source-basis lists, and orientation-reading placement, loaded directly after `expanded.css`. |
| [`styles/routes/debriefs.css`](styles/routes/debriefs.css) | [`debriefs.html`](debriefs.html) | Catalog layout, filters, Debrief-card badges and metadata, browse/preview composition, and alternate modes after the shared Debrief-reading component. |
| [`styles/routes/three-movement-debrief.css`](styles/routes/three-movement-debrief.css) | [`choose-your-player-humatics.html`](choose-your-player-humatics.html) | Three-movement hero, working-posture, and contract-transition composition under the [Dual-Track Debrief Composition](../../visual-fidelity-contracts/dual-track-debrief-composition.md) contract. |
| [`styles/routes/genomic-viewer.css`](styles/routes/genomic-viewer.css) | [`genomic-viewer-replatforming.html`](genomic-viewer-replatforming.html) | Paired solution and implementation tracks, route visuals, alternate modes, and named shared-component seams under the [paired-debrief composition contract](../../visual-fidelity-contracts/dual-track-debrief-composition.md); loaded after the Debrief-reading component and before the shell. |
| [`styles/contracts/debrief-composition.css`](styles/contracts/debrief-composition.css) | Seven composed Debriefs | Contract layer for movement labels, outcome blocks, handoffs, and Evidence Boundaries; loaded after foundation, component, route, and shell styles where a composition opts in. |
| [`field-inspection.css`](field-inspection.css) | [`field-inspection-harness-replatform.html`](field-inspection-harness-replatform.html) | Field Inspection route treatment, loaded after the shared foundation. |

Existing companions such as `fmi-lims-eln-replatforming.css` remain focused on their named surfaces.

Use an existing semantic component when its visual role fits. Add a selector when the page demonstrates a material gap. Sustained prose uses the shared reading measures; tables, diagrams, ledgers, and direct-manipulation instruments retain local two-dimensional space when that space carries meaning.

The settled [CSS modularization plan](../../planning/context-canvas/css-modularization-and-visual-reference-plan.md) moves toward readable core, component, contract, route, and legacy ownership. Content identities remain available in routes, metadata, references, and visible prose; CSS filenames, selectors, tokens, and comments use neutral semantic owners that a cold collaborator can infer.

## Work locally

From the repository root, use Node 22 or newer:

```bash
npm install
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

Authored Context Canvas HTML carries stable `PUBLIC_URL_REGISTRY_*` semantic
keys as complete anchor `href` values and JSON-LD strings. The visible label,
neighboring explanation, and semantic key keep the source legible before a
public build; materialization supplies the ordinary external link. Direct
Notion page routes stay outside this authored visitor tree.

Hosted iframe carriers use `PUBLIC_URL_IFRAME_*` keys in explicit
`data-public-src` and `data-public-href` attributes. Their ordinary `src` and
`href` attributes remain complete repository-local fallbacks, so the authored
page and its full-view route continue to work without hosted configuration.
The generated page resolves both carrier twins to one approved
`https://iframes.vik.guru/v1/.../` destination.

The authored iframe keeps the behavioral boundary visible: a contextual
title, intentional lazy loading, an explicit sandbox, a route-matched narrow
Permissions Policy when needed, and `referrerpolicy="no-referrer"`. The
materializer validates those attributes and changes only the paired URL
values. This leaves a cold-start collaborator able to inspect the source and
see the same carrier policy that reaches the generated visitor surface.

The accepted Notion boundary is concise: only the Enterprise Human-AI
Practitioner Registry root and its descendants are public-possible. A key name
expresses that scope but cannot prove ancestry, content standing, or anonymous
availability. The authorized resolver and human review establish those facts
before a destination enters configuration.

From the repository root:

```bash
cp .env.public.example .env.public
# Add one approved HTTPS destination for each required key.
npm run build:public-references
npm run test:public-reference-materializer
```

An explicit process-environment value overrides the matching `.env.public`
entry, which keeps the same build seam available to a later delivery receiver.
The materializer never prints configured values. It rejects incomplete,
malformed, non-HTTPS, userinfo-bearing, recognized credential-parameter,
duplicate, or out-of-namespace public settings before replacing an accepted
generation. Hosted iframe routes additionally carry their approved host,
versioned path, trailing slash, and matching semantic key without an explicit
port, query, or fragment. Unused scoped settings remain additive; authored
HTML continues to define the required set. Human review keeps path-shaped
access coordinates and unfamiliar signing conventions outside approved
Registry destinations.

The ignored output is
`.public-reference-build/context-canvas-project-surface/`. The builder copies
the complete `context-canvas-project-surface/` subtree, transforms only
Context Canvas HTML, preserves other regular files byte-for-byte, validates
the token-bearing JSON-LD, scans every copied regular file for direct Notion
routes, and replaces the prior generation only after the complete result
succeeds. Configuration stays outside the copied tree. Symbolic links and
special filesystem entries stay outside this build boundary. Tracked input
remains byte-unchanged. An operational restore failure preserves the ignored
recovery directory for an explicit local recovery.

This output is a materialized subtree, not an audience decision or a complete
delivery closure. Some Context Canvas routes intentionally reference schemas,
collaboration instruments, and other repository-owned resources above this
subtree. A future named publication assembler owns that dependency closure and
can call the same materializer immediately before upload. The existing Field
Inspection pilot retains its separate authored-byte parity until that receiver
selects an explicit composition seam.

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
npm run visual:check -- path/to/page.html --selector "main"
npm run visual:rail-labels
npm run test:open-lesson-field
npm run test:strategy-canvas
```

The Context Canvas test protects source-authored visitor metadata and the
About-page identity seam. The generic visual check records the requested
surface at desktop and mobile widths, document containment, and browser
errors. The interaction contracts cover their named collaboration systems in
depth. Choose the fitting check for each other page behavior.

A useful verification note names the command, viewport-relevant result, and ignored `.visual-runs/` artifact directory. A new check joins the shared harness when a reproduced visitor-facing defect gives it a stable purpose.

Before a CSS extraction, capture the complete initial-state reference or one affected route group from the repository root:

```bash
npm run visual:context-canvas-reference -- --phase before
npm run visual:context-canvas-reference -- --phase after-about --family entry-and-catalog
```

Each run records narrow, desktop, and wide full-page images, the source revision, route standing, browser observations, and a local route-group index under ignored `.visual-runs/context-canvas-reference/`.

## Cloudflare proving surface

[`cloudflare/context-canvas-field-pilot`](../../cloudflare/context-canvas-field-pilot/README.md) owns the bounded Field Inspection Static Assets pilot. Its deterministic builder copies an explicit public dependency closure into ignored `dist/`; `--check` confirms byte parity and rejects extra files. The pilot keeps ordinary assets on Cloudflare's asset-first path and reserves Worker execution, storage, and contextual composition for a demonstrated runtime need.

The pilot measures delivery behavior. The broader Cloudflare delivery architecture in `grammar-family.html` remains design terrain for later composed readings, coordinated rooms, durable undertakings, and visitor-owned surfaces.

## Public evidence boundary

Public routes name illustrative identity, prospective estimates, source authority, and unresolved implementation questions directly. Internal planning, historical logs, credentials, and sensitive source material remain outside the published asset closure. A named human steward approves any change that expands audience, identity, data handling, embedding authority, or deployment scope.

The next move stays bounded and revisable: improve one visible reading or runtime boundary, observe it with the narrowest useful evidence, and carry the result into the next design decision.

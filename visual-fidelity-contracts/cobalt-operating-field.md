# Cobalt Operating Field

## Purpose and fit

Cobalt Operating Field is a light-field visual language for enterprise and scientific work where the reader needs to see several things together:

- the work or decision in front of a person;
- the actor, profile, assignment, or sign-off boundary that shapes action;
- the operational state and concrete systems carrying the work;
- the event or handoff path that makes movement recoverable; and
- the changed work and investment required to sustain the ability.

Use it for case-review workbenches, population-aware operating maps, service and data flows, implementation narratives, and replacement-system views. Cobalt Evidence remains the leaner treatment for a relationship diagram whose primary job is inspection. Cobalt Operating Field earns its larger frame when action, state, infrastructure, and organizational consequence must share one surface.

The canonical static implementation is the [genomic viewer case-review workbench](../context-canvas-project-surface/img/plot/genomic_viewer_case_review_workbench.svg). The [operating-surface map](../context-canvas-project-surface/img/plot/genomic_viewer_operating_surface_map.svg) and [boundary-contract map](../context-canvas-project-surface/img/plot/genomic_viewer_boundary_contract_map.svg) show useful reductions of the same language. The canonical interactive reference is the [Registry × Goal Fidelity routing instrument](../collaboration/registry-goal-fidelity-routing/index.html); later interactive prototypes use its exact token values, structural signatures, state discipline, and alternate-mode floor.

## Interactive reference floor

An interactive Cobalt Operating Field retains the visual grammar above and adds a legible operating contract. The Registry × Goal Fidelity reference establishes the minimum:

- one explicit state object with stable IDs and deterministic derived rendering;
- current state shown as readable JSON beside a closed JSON Schema;
- native controls with pressed, selected, and controlled-region relationships exposed semantically;
- focus restored to the equivalent control after a rendered region is replaced;
- polite status and atomic selection announcements;
- a captioned semantic-table equivalent driven by the same state as every interactive view;
- a substantive `noscript` route that carries the instrument rather than merely requesting JavaScript;
- constructive zero-result states;
- keyboard-focusable, named overflow regions; and
- dedicated reduced-motion, forced-colors, and print treatments.

The reference uses a `28px` graph-paper grid at `rgba(40, 85, 243, 0.07)`, `8px 8px 0 var(--cof-ink)` primary shadows, `5px 5px 0 var(--cof-ink)` card shadows, and the `28px / 17px / 12px` radius sequence. Active state combines acid fill, a deeper shadow, an ink frame, semantic state, and a two-pixel lift. These values are a reproducible floor, not an invitation to turn every instrument into the same composition.

### Evidence Boundary

Methods presented as propositions close with a coral-railed Evidence Boundary. It names the comparison or local evaluation still required, distinguishes observed behavior from the proposed transfer, and tells the visitor what evidence can settle the boundary. This is the artifact-level replacement for confidence, readiness, or fidelity scoring.

## Semantic frame

A Cobalt Operating Field reads from human work to dependable substrate:

1. **Scope** — population, product, assay, geography, lifecycle, or other useful filters.
2. **Work** — the case, object, queue, decision, or exception being handled.
3. **Context** — identity, provenance, applicable knowledge, history, or comparison at the decision.
4. **Contract** — current profile, assignment, permitted action, sign-off, and retained human judgment.
5. **Substrate** — named services, stores, artifacts, and event paths with their responsibilities.
6. **Investment** — the populations and capability lines that keep the work dependable.

Every region should answer at least one visitor-useful question: *What is this? Who can act? What state is current? What context changes the decision? What carries the state? What happens next? Who must keep this dependable?*

## Palette

The palette is role-based. Use the shared values in [the token file](./cobalt-operating-field.tokens.css).

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Field | `--cof-field` | `#fffaf2` | page and SVG field |
| Panel | `--cof-panel` | `#fffdf8` | primary cards and readable surfaces |
| Cobalt | `--cof-cobalt` | `#2855f3` | primary header, active route, integrated arrows |
| Deep cobalt | `--cof-cobalt-deep` | `#153fbe` | dense headers and selected states |
| Ink | `--cof-ink` | `#17345f` | primary text, outlines, hard shadows |
| Body | `--cof-body` | `#304a71` | explanatory text |
| Muted | `--cof-muted` | `#5d6f8b` | eyebrows and secondary technical labels |
| Pale cobalt | `--cof-cobalt-pale` | `#e7efff` | relational state and architecture cards |
| Powder | `--cof-powder` | `#cfe7f7` | case or service header |
| Sea | `--cof-sea` | `#d9efea` | allowed action, current relational state |
| Cream | `--cof-cream` | `#fff5de` | work queue and contextual neutral |
| Blush | `--cof-blush` | `#ffd3d0` | evidence drawer or unresolved context |
| Coral | `--cof-coral` | `#fa7065` | consequential boundary or exception |
| Acid | `--cof-acid` | `#f2ff67` | current selection, review-needed state, key handoff |

Ink belongs on light accents. Warm accents carry semantic distinction while cobalt maintains the shared system spine. Color joins a written state label, shape, or border; it never carries meaning alone.

## Typography

- Use a system sans stack for titles, body copy, component names, and consequences.
- Use a system monospace stack for eyebrows, state labels, identifiers, system names, and compact technical qualifiers.
- Titles are declarative: “Case review keeps judgment, context, and handoff together.”
- Panel headings name the operating object or boundary: “Profile-scoped work,” “Evidence at the decision,” “Decision contract.”
- Body copy states a mechanism and consequence in one or two short lines.
- Sentence case carries explanatory copy. Uppercase monospace labels provide wayfinding rather than paragraphs.

At a 1600 × 1120 SVG canvas, useful starting sizes are 35px for the primary title, 19px for section titles, 16–17px for card titles, 13–14px for body copy, and 10–13px for monospace labels. When the composition becomes narrower, preserve readable type and reflow regions before reducing text below a comfortable reading size.

## Reading measure

Sustained prose follows the [shared reading measure](./README.md#shared-reading-measure), targeting approximately 50–66 characters per line and usually remaining within 75. Large leads use a shorter measure, and ordinary standalone headings aim for about 32 characters before wrapping.

The operating field earns width through relationships among work, context, contract, substrate, and investment. Body copy inside panels, drawers, cards, captions, and evidence boundaries returns to the reading measure. Workbenches, tables, system maps, and direct-manipulation regions retain their decision-useful geometry and carry local overflow when the relationship requires two dimensions.

## Geometry

The frame is spacious and architectural rather than dashboard-dense:

- outer frame radius: 28px;
- primary panel radius: 17px;
- nested card radius: 10–12px;
- chip radius: pill or 6–8px, according to density;
- primary panel outline: 2px ink;
- softer nested outline: 1.2–1.5px;
- panel gap: at least 24px, plus the hard-shadow offset;
- inner panel padding: 18–24px; and
- technical rail cards: equal height with a shared reading baseline.

Use a fine cobalt grid or sparse speckle texture as a quiet field cue. Texture should disappear behind the reading hierarchy rather than compete with it.

### Hard-shadow card grammar

The Actor Context Board supplies the characteristic card grammar:

1. Draw the shadow as a second solid shape in `--cof-ink`.
2. Offset it 8px right and 8px down.
3. Use no blur and no translucency.
4. Place the bordered surface directly above it.
5. Keep neighboring cards far enough apart that the shadow reads as depth rather than overlap.

Hard shadows identify primary working regions. Nested evidence rows, table cells, chips, and quiet metadata use outlines without a shadow. A selected nested card may use acid fill, a 1.7–2px ink border, and its written state.

### Integrated arrows

Arrow bodies and heads are one filled path. This keeps the head on-axis and prevents the visible seams that arise when a stroke and marker render separately.

For a horizontal handoff, use a compact shape such as:

```svg
<path class="cof-arrow" aria-hidden="true"
  d="M0 12H22V0L44 29L22 58V46H0Z"/>
```

Scale the full path as a unit. Curved routes use a filled ribbon or a closed path whose final segment establishes the direction of the head. Connectors terminate at the card boundary. Whispy relationship lines may remain stroked when they carry no directional claim; directional relationships receive an integrated head.

## Concrete system and event modeling

Name a technology when the Debrief or the operating model supports that specificity. Pair the name with its responsibility:

- **React / Next.js and Java services** — interaction and server-evaluated work contracts;
- **Amazon Aurora PostgreSQL-Compatible** — relational operational state such as cases, profiles, assignments, status, and sign-off references;
- **private Amazon S3 buckets** — versioned genomic or evidence objects such as BAM, CRAM, VCF, and evidence packages; and
- **Amazon SQS, EventBridge, or another named delivery service** — durable delivery, routing, or fan-out where that behavior is actually required.

Show identities and boundaries that change the architecture: event identity, object version, profile revision, source version, assignment revision, permitted action, signatory, and recovery state. A box names what the system carries; an arrow names the contract or event moving between systems.

Show a forward operating surface directly. Use realistic example values only to make the interaction legible, and keep them subordinate to the operating relationship. When source qualification materially changes a visitor's decision, place it in the adjacent Debrief prose rather than turning the visual into process documentation.

### Transactional outbox → queue is context-dependent

Select a transactional outbox when one business transaction must persist relational state and make a durable event available without a split commit. The useful visual sequence is:

1. domain state and an outbox record commit together;
2. a relay publishes a stable event identity to the selected queue or router;
3. a consumer applies the event idempotently; and
4. quarantine, dead-letter handling, and replay preserve recovery when processing cannot complete.

When those conditions are absent, show the simpler fitting path. A synchronous service call fits an immediate request/response boundary. Change-data capture fits an authoritative existing write stream when its schema and ownership support downstream use. EventBridge fits rule-based routing to multiple consumers. SQS fits durable work delivery and back-pressure. The diagram should reveal why a pattern is present rather than turning one implementation pattern into a universal fixture.

## Investment band

End a full operating field with a band that joins technical choices to the populations that keep them dependable. The band completes the story rather than adding a score.

Useful categories include:

- product and clinical informatics shaping review context;
- platform engineering binding identity, permissions, and state;
- data engineering preserving artifacts, schemas, lineage, and events;
- quality and domain experts maintaining scenarios and sign-off meaning; and
- operations carrying observability, quarantine, replay, support, and recovery.

Name changed work and sustained capability. Use attributed time or cost figures only when a source supports them; otherwise describe the investment line and the ability it purchases.

## Visitor-useful copy

Visible copy earns space by helping a reader decide, interpret, or act. Prefer:

- “Visible work follows current sign-off.”
- “Assay, pipeline version, and threshold travel together.”
- “Issued state → current state.”
- “Report consequence stays with a qualified human.”
- “Stable event identity supports idempotent apply.”

Use real systems, stores, events, objects, and actor contracts when they are known. Replace generic labels such as “source registry,” “data platform,” or “AI layer” with the specific thing and responsibility. Explanatory copy should reveal a mechanism, boundary, changed ability, or consequence; decorative commentary stays outside the artifact.

## Responsive and accessible expression

### HTML and CSS surfaces

- Above roughly 72rem, a workbench may use work / case / contract columns.
- At intermediate widths, move the contract beneath the case while keeping the work queue visible.
- On narrow screens, use document order: scope → work → context → contract → substrate → investment.
- Preserve card padding and readable type. Allow the page to lengthen instead of shrinking an entire workbench into an illegible thumbnail.
- Keep wide tables in a labeled scroll region and retain row headers.
- Use `:focus-visible` with a strong ink/cobalt outline and offset.
- Respect reduced-motion preferences; color, label, and geometry carry every state without motion.

### SVG surfaces

- Provide one `<title>` and one decision-useful `<desc>` referenced by `aria-labelledby`.
- Give major semantic regions a `<g role="group" aria-labelledby="…">` and a local `<title>`.
- Mark purely visual arrows, grids, and shadows `aria-hidden="true"`.
- Keep titles, descriptions, labels, and captions focused on the operating object, consequential relationship, and next useful action.
- Pair the visual with nearby prose, a table, or a caption when the relationships are essential to the page argument.
- Use a viewBox for proportional display and preserve a readable full-size opening path for dense presentations.

## Generative variation and adaptation

Preserve the semantic grammar while adapting the composition:

- **Operating workbench** — scope chips, work queue, central decision, context drawer, contract panel, service rail, investment band.
- **Boundary map** — inputs, server-evaluated rule, visible work, routing, retained human decision.
- **Operating-surface map** — prior reconstruction work, implementation moves, receiving surfaces, changed work.
- **Population map** — actor groups, responsibilities, shared objects, residual work, and investment.

Variation may change panel count, orientation, accent distribution, texture density, and domain vocabulary. Keep cobalt as the connective system color, ink as outline and hard shadow, warm accents as semantic differentiation, integrated arrows for directional flow, and explicit written states wherever current, pending, recovery, or sign-off status changes action.

Domain adaptation starts from the actual operating object. A genomics surface may center a case, assay, variant, and evidence object. A laboratory surface may center a sample, plate, run, reagent, and sign-off. A distributed inspection surface may center an asset, observation, grade, transfer, and accepted record. The art direction remains recognizable because the relationship grammar persists while the subject becomes concrete.

When time is the primary decision dimension, use the [Cobalt Temporal Field](./cobalt-temporal-field.md) extension. It preserves this visual language while adding source-native precision, intervals, local magnification, returns, and distinct later references without turning every Debrief into the same timeline shape.

When a paired Debrief first needs a spacious, source-led account of people, disagreement, and reframing, use [Rose Quartz Editorial Field](./rose-quartz-editorial-field.md) for the Solution movement and return to a dark Cobalt field for the implementation substrate. When one shared object coordinates several capabilities, scenarios, repository references, and investment lines, use [Cobalt Constellation Field](./cobalt-constellation-field.md). Both extensions inherit the semantic, accessibility, directional-geometry, and Evidence Boundary rules above.

## Reusable tokens

Import [cobalt-operating-field.tokens.css](./cobalt-operating-field.tokens.css) or copy its `:root` block into a self-contained artifact. SVGs may mirror the same values in an internal `<style>` so they remain portable.

# SVG and coordinated views

Load for inline/image delivery, shared selection, dense matrices, or portable
SVG output. The [web skill](../SKILL.md) owns the delivered surface, and the
[foundation](../../data-visualization-foundations/SKILL.md) owns meaning. This is
an implementation reference rather than a requirement to build a new framework.

## Resolve existing ownership first

Locate the source data, pure transformation, page or instrument state, renderer,
CSS load order, semantic table owner, export, and relevant tests. Reuse the
existing page's figure wrappers, captions, reading measure, full-size links,
native disclosures, form controls, and tables. For the Atlas, distinguish its
visitor page, qualitative selector, full self-contained instrument, and separate
dataset derivations. Changing a gallery leaves unrelated instrument import,
recovery, reset, and Prompt Capsule contracts with their existing owners.

## One state, several readings

A compact state can distinguish `population`, `measure`, `cognitiveMove`,
`presentation`, and `selectedRecord`. This describes responsibilities, not a
mandatory new JSON schema. Reuse the instrument's accepted state shape where
it already fits.

| Transition | Meaning that persists | Meaning that updates |
| --- | --- | --- |
| Population filter | Dataset identity and measure definition | Eligible records, exposure, values, title and status. |
| Count to rate | Record eligibility and event rule | Unit, denominator presentation, scale and explanatory text. |
| Comparison to reconciliation | Compatible selected population | Form, cell meanings, summary and exact-value arrangement. |
| Sort change | Identity, values and selected record | Order and its visible description. |
| Dataset change | Only explicitly compatible selections | Source, standing, definitions, view availability and reset defaults. |
| Export | Current accepted state | A detached portable representation with its source/context. |

Derive visible and exported values from the same admitted data. A renderer owns
display changes rather than mutating the source model. Keyed identity helps
retain focus and selection. Update meaningful text as part of the same state
commit; an old caption beside new marks is a semantic defect even when geometry
is correct. Pending drafts retain their own status when an instrument supports
an accept/apply boundary.

## SVG Probe map

The public **SVG - Enterprise Front-End Practitioner Probes** was consulted for
the mechanisms below. Its technical-veracity notes distinguish source-supported
mechanisms from draft proposals and locally measured behavior.

| Probe | Production decision | Evidence boundary |
| --- | --- | --- |
| Q1 Coordinate System and ViewBox | Use one coordinate model for marks, labels, anchors and leaders; CSS owns rendered dimensions. | Coordinate mapping is source-supported; collision strategy needs local geometry observation. |
| Q11 SVG Text for Labels | Keep native text, deliberate `tspan` lines, fitted anchors, and batched measurements. | Text mechanisms are supported; optical centering, font metrics, and wrapping need the actual render. |
| Q10 SVG as an AI Generation Target | Carry descriptive groups, stable identity, labels, title/description, and a meaningful preserve list. | Structural inspectability is supported; prompt effects and receiving-model interpretation remain task-specific observations. |
| Q3 Rendering and currentColor | Make paint order and semantic color roles intentional. | Check theme and overlapping-mark effects in the actual delivery mode. |
| Q4 defs, symbol, use | Reuse repeated geometry with instance identity and namespaced references. | Repeated primitives still need distinct relationships and accessible naming. |
| Q6 Accessibility | Distinguish decorative, informative, and interactive carriers; provide a durable value/text route. | Source patterns support implementation; assistive behavior and complete conformance require fitting observations. |
| Q7 Delivery | Choose static image, inline SVG, or separately governed interactive delivery. | The tradeoff is contextual; embedding as an image changes available behavior. |
| Q8 Performance | Batch layout reads/writes, bound preparation and marks, reuse derived data. | A numeric renderer-switch threshold is a local hypothesis, not a universal browser limit. |
| Q9 Filters and compositing | Use meaningful clipping and explicit layers; retain the accepted flat Atlas treatment. | Effects and clip boundaries need observation with the actual host and export. |

## Label geometry and readable output

Start with regular aligned layout and sufficient space. Wrap long headings
deliberately, preserve units, and keep annotations near their marks. Measure text
after the relevant fonts are available, and keep measurements in the same SVG
coordinate system as placement. Batch reads before writes; a full pairwise
collision pass has quadratic comparison cost and needs a demonstrated reason.
Regular grids, reserved label columns, or fewer simultaneous annotations may
solve the problem more clearly.

A static informative SVG can have `role="img"` and a title/description while
native HTML controls remain outside. A genuinely interactive SVG needs a
semantics design that preserves its controls in the accessibility tree. Each
inline gallery asset uses unique IDs for titles, descriptions, clips, and any
references. Standalone exports carry their own coherent identity and context.

A static image gets a concise external alternative plus an adjacent fuller
reading/value route. Full-size links are native anchors with a useful label.
Place necessary quantitative meaning in the rendered content; metadata adds
descriptive structure rather than a hidden instruction channel.

## Dense heatmap and detail access

Before rendering, settle the foundation's bin/scale/absence contract. Keep
row/column labels readable and exact values available through persistent detail
or a native table. The ordinary Tab sequence reaches meaningful controls and
scroll/detail routes rather than every painted cell. Touch, keyboard, and pointer
can reach the same decisive value. Hover may supplement that access.

A nested table is appropriate only for a genuine subordinate record. Evaluate
an adjacent detail panel first when it preserves simpler cross-row comparison.
If nesting is chosen, captions and native header associations belong to each
table, and the owning projector needs evidence that inner headers stay out of
outer associations. The table skill and existing inventory own that admission.

## Export and source-readable delivery

Preserve `viewBox`, useful native text, namespaced IDs, title/description,
meaningful groups, units, source reference, and selected population/measure.
Inline required styles or provide a documented self-contained style route for
a standalone artifact. Optimizer settings follow a purpose-built preserve list
and the changed output gets a fitting observation. Sanitize/escape external data
for text and attributes before serialization. Private URLs, raw workspace IDs,
and unauthorized small-group details remain outside public exports; approved
public source identifiers retain their citation role.

SVG source may be inspectable by one receiving system while another sees only
rasterized pixels. Pair it with exact values and a human-readable caption.
Maintain a modest claim: the artifact offers recoverable structure, while actual
interpretation depends on the receiver, delivery mode, and task.

## Proportionate acceptance

Start with independent fixtures for one normal state and the boundary that can
change this artifact's meaning. Include empty/zero, unequal exposure, overlap,
or incompatible state only as the selected contract requires. Assert meaningful
records independently of visual/table equality; matching empty outputs can
otherwise look consistent.

After source and state review settle, use the existing focused browser harness
for the changed surface, actual embedded width where relevant, keyboard/focus,
full-size access, scriptless reading, and fitting alternate-media states. Check
long labels and meaningful values, not only bounding boxes. An admission-only
data change begins with data checks; a later visible view earns its own rendered
evidence. Preserve completed cases with their real scope and renew only the
affected observations after a repair.

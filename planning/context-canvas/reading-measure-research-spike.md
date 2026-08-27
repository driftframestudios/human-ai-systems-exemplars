# Context Canvas reading measure — research spike

**Research date:** 22 August 2026  
**Decision surface:** long-form Context Canvas prose, wide editorial fields, visual fidelity contracts, and the consolidation path for `expanded.css`

## Decision

Context Canvas uses one shared fluid reading measure for sustained prose:

- preferred continuous-prose range: approximately 50–66 characters per line;
- ordinary upper reading boundary: approximately 75 characters per line;
- shared CSS proxy: `--canvas-reading-measure: 66ch`;
- leads and large introductory copy: `--canvas-lead-measure: 58ch`;
- ordinary standalone headings: `--canvas-heading-measure: 32ch`.

The `ch` unit is a font-relative approximation based on the advance width of the `0` glyph. A `66ch` box therefore expresses a portable typographic intention rather than a literal character count. Rendered typeface, language, font size, spacing, and padding determine the final line.

Wide canvases remain available for relationships. Tables, diagrams, prototypes, ledgers, card grids, and other two-dimensional artifacts may use editorial or wide containers. Paragraphs, list items, definitions, captions, quotations, instructions, and follow-on prose inside those canvases return to the shared reading measure.

## Why this range

The source guidance forms a compatible range while carrying different normative weight.

| Source | Material guidance | How Context Canvas uses it |
| --- | --- | --- |
| W3C, WCAG 2.2 Understanding 1.4.8 Visual Presentation | Level AAA describes a mechanism that can present blocks of text at 80 characters or fewer, alongside adjustable color, spacing, alignment, and enlargement. | Treat 80 as an adaptable outer boundary rather than an authored-default mandate. |
| W3C Technique C20 | Relative column measurements can let a reader achieve an average of 80 characters or fewer as the browser is resized. | Use font-relative measure and fluid maximum inline size. |
| W3C Cognitive Accessibility User Research | Lines of 60–70 characters are presented as a readable layout practice for cognitive accessibility. | Place the long-form target near the center of that band. |
| U.S. Web Design System typography | Most text may sit within 45–90 characters; 66 characters is a strong target for long text. | Use 66ch as the shared sustained-reading proxy. |
| GOV.UK Design System layout | A two-thirds main column generally keeps desktop lines within 75 characters. | Keep wide page fields while limiting the prose-bearing region inside them. |
| W3C, WCAG 2.2 Understanding 1.4.10 Reflow | Ordinary narrative content reflows at the equivalent of 320 CSS pixels; maps, diagrams, data tables, and operational interfaces can retain two-dimensional presentation. | Keep the page in the reading direction and give each genuinely two-dimensional artifact its own labelled overflow region. |
| CSS Values and Units | `ch` represents the advance measure of the `0` glyph and approximates an expected glyph count in proportional type. | Document the token as a proxy and assess the rendered result in its actual typeface and language. |

## Repository finding

The repository already carried the intended mechanism:

- `--canvas-reading-measure` in the foundation tokens;
- `.content` and `.content--reading` for sustained reading;
- `.content--editorial` and `.content--wide` for comparative and collaborative surfaces;
- `.table-figure--wide`, `.story-visual`, `.prototype-embed`, and `.table-scroll` for locally wide artifacts; and
- shared Debrief and AI Systems components for cards, ledgers, steps, disclosures, evidence boundaries, and reading paths.

Two cascade paths allowed prose to escape the measure:

1. The former cross-Canvas rule reached only direct children of `.prose-flow`, `.about-reading`, and `.content--editorial`.
2. Nested prose inside `section`, `article`, `aside`, and `details` within `.content--wide` inherited the entire wide canvas. Several Grammar Family selectors then extended paragraphs to `68rem`, `70rem`, `72rem`, and `78rem`.

The receiving rule now belongs to `.content` itself. It limits prose-bearing descendants while leaving tables, figures, embeds, grids, and their containing components free to express the visual contract.

Three companion stylesheets now receive the same foundation tokens instead of carrying nearby fixed values: About orientation copy uses the reading token in place of `72ch`; the Debriefs catalog summary and introduction use it in place of `75ch`; and the FMI LIMS/ELN track promise uses the lead token in place of `52rem`. Structural grids, tables, and workbench dimensions keep their own geometry.

## Shared implementation contract

```css
:root {
  --canvas-reading-measure: 66ch;
  --canvas-lead-measure: 58ch;
  --canvas-heading-measure: 32ch;
}

.content :where(p, li, dd, figcaption, blockquote, summary) {
  max-inline-size: min(100%, var(--canvas-reading-measure));
}

.content :where(h1, h2, h3, h4):not(.architecture-track-title) {
  max-inline-size: min(100%, var(--canvas-heading-measure));
  text-wrap: balance;
}
```

The shared `.debrief-lead`, About reading, hero lead, and quoted-reading selectors consume the same tokens. This keeps later cascade anchors aligned with the foundation rather than restoring fixed `rem` widths.

### Role-specific expression

| Content role | Measure posture |
| --- | --- |
| Sustained body copy | Aim for 50–66 characters and usually remain within 75. |
| Lead or introductory copy | Use the shorter lead token because larger type reaches visual width sooner. |
| Headings | Use a shorter measure and balanced wrapping; full-width track rules may remain structural. |
| Card copy | Let the card establish the available width; the shared prose ceiling still applies. |
| Lists and definitions | Keep each item or definition within the prose measure while the list or definition grid retains its layout. |
| Captions, annotations, and evidence notes | Return to the reading measure even when the figure or table spans the editorial field. |
| Tables | Preserve comparison geometry in a labelled local overflow region; captions and notes remain readable prose. |
| Diagrams and SVG | Preserve decision-useful spatial relationships, provide a full-size route where useful, and pair consequential relationships with semantic text. |
| Code and structured payloads | Preserve meaningful indentation in a local overflow region; explanatory copy around the payload uses the reading measure. |
| Embedded prototypes | Let the instrument use its own viewport; surrounding orientation and fallback prose use the reading measure. |

## Grammar Family consolidation result

The Cloudflare field originally added a dedicated 785-line Grammar Family block to `expanded.css`. Every visual responsibility in that block already had a shared receiving component:

| Grammar responsibility | Existing shared component |
| --- | --- |
| Request-to-reading sequence | `numbered-moves` |
| Six delivery jump links | `debrief-reading-path ai-systems-reading-path` |
| Delivery posture explanations | `architecture-pair blueprint-pop-cards` |
| Four facts within each posture | `debrief-at-glance` |
| Capability placement | shared wide table figure and comparison table |
| Addressable semantics | `implementation-companion` and `debrief-at-glance` |
| Practitioner questions | native `details` with `conditioning-static-equivalent` |
| Portable request example | `implementation-moves` and shared code treatment |
| Initiative Costing proving cards | `architecture-pair blueprint-pop-cards` |
| Delivery evidence boundary | `interpretive-aside` |
| Sources | `conditioning-static-equivalent` and `source-list` |

The page now composes these shared components directly. The page-specific block can leave the bundle as one unit, and the remaining CSS change strengthens shared foundations.

## Visual fidelity contract yield

Every visual fidelity contract carries the same reading principle:

1. Wide space expresses relationships, comparison, operation, and orientation.
2. Sustained prose returns to the shared fluid reading column.
3. Local cards and panels keep their own available width up to the shared ceiling.
4. Captions, instructions, annotations, and evidence boundaries remain comfortable to read beside wide artifacts.
5. Narrative content reflows in the reading direction; a two-dimensional artifact owns its local overflow.

Individual contracts can still set a more compact measure when their type scale, language, viewing distance, or content role benefits from it. A larger default prose measure requires a written decision tied to the reading context.

## Focused visual checks

The research spike included a deliberately small rendered sample at three materially different surfaces and two reading widths. The sample keeps the reading decision lightweight, rendered, and contextual.

| Surface and viewport | What the rendered surface showed | Decision carried forward |
| --- | --- | --- |
| Grammar Family, 1280 × 720 | The 32ch heading, 58ch lead, and 66ch sustained-reading measures produced a clear centered hierarchy. The wide comparison field retained its full relationship-bearing width, and the page introduced no horizontal document scroll. | Keep prose constrained inside the wide field while allowing the table and diagram regions to remain wide. |
| Grammar Family, 390 × 844 | Heading, lead, jump links, cards, and the family diagram reflowed into the reading direction with no horizontal document scroll. | Keep shared semantic components as the page's responsive system; a page-local layout layer would duplicate behavior already present. |
| AI Systems, 1280 × 720 | The same tokens produced an equivalent reading cadence on a different information radiator. Grid items retained local card widths below the shared ceiling. | Treat the tokens as a cross-Canvas foundation rather than a Grammar Family treatment. |
| Prompt-Side Conditions, 390 × 844 | Long introductory copy and Quick Use cards filled the available 350px content width and remained in one reading direction with no horizontal document scroll. | Preserve the fluid `min(100%, token)` form; fixed pixel columns would weaken narrow reflow. |
| Grammar Family family view, 1920 × 1080 | The legacy `.prose-flow` container query activated two columns. The initial render split the short lead after “multi-” and resumed at the top of the right column. The targeted `break-inside` treatment kept the complete lead in the first column on recheck. | Keep short direct leads intact while preserving the established two-column option for genuinely longer editorial flow. |

The sample also confirmed why the measurement tokens remain role-aware. A 66ch ceiling resolves to different pixel widths as type size and font metrics change; the rendered Grammar Family body measure was about 704px at 19.2px type, while its larger 58ch lead resolved to about 779px. The visual result, content role, and viewing distance remain more meaningful than a fixed pixel substitute.

The large-screen sample also motivated a narrow continuity repair: a direct `.debrief-lead` inside `.prose-flow` receives `break-inside: avoid`. This keeps the compact opening thought together while preserving the established multi-column treatment for longer, multi-paragraph editorial material. The selector activates when the container enters multi-column flow.

## `expanded.css` consolidation seam

This change established a low-coupling extraction route for the broader CSS program described in the planning matrix. The Field Inspection family has since carried that route into a physical file: `field-inspection.css` now loads immediately after `expanded.css` and owns 421 lines of route-specific layout, palette, components, responsive behavior, print, reduced-motion, and forced-color treatment.

The remaining sequence stays useful:

1. Keep tokens, reset, typography, reading layout, and tables together as the foundation source.
2. Move shared editorial components—Debrief leads, numbered moves, cards, companions, disclosures, embeds, and evidence boundaries—into a component section.
3. Keep visual-contract palettes and geometry in contract sections.
4. Keep route-family themes such as About and AI Systems in page-family sections.
5. Reserve exceptions for source-native legacy behavior with a named receiving page.

The source remains plain CSS with explicit authored loading order. Field Inspection demonstrates that a route family can leave `expanded.css` without a compression pass, framework, or all-source layer migration. The Grammar Family consolidation provides the complementary pattern for the next move: reuse shared components first, then create a new route file only for responsibilities that remain genuinely local.

## Re-entry guidance

When a new section appears on an editorial or wide field:

1. Choose an existing semantic component whose visual role already matches the material.
2. Keep ordinary prose inside the shared measure.
3. Give full width to an artifact only when comparison, spatial relationship, or direct operation benefits.
4. Keep surrounding explanation, captions, and receipts within the reading column.
5. Add a new selector after the existing components demonstrate a materially meaningful gap.

## Sources

- [W3C — Understanding WCAG 2.2 Success Criterion 1.4.8: Visual Presentation](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation)
- [W3C — Technique C20: relative measurements for lines averaging 80 characters or fewer](https://www.w3.org/WAI/WCAG22/Techniques/css/C20)
- [W3C — Cognitive Accessibility User Research](https://www.w3.org/TR/coga-user-research/)
- [W3C — Understanding WCAG 2.2 Success Criterion 1.4.10: Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow)
- [U.S. Web Design System — Typography and measure](https://designsystem.digital.gov/components/typography/)
- [GOV.UK Design System — Layout](https://design-system.service.gov.uk/styles/layout/)
- [W3C — CSS Values and Units, font-relative lengths](https://www.w3.org/TR/css-values-4/#font-relative-lengths)

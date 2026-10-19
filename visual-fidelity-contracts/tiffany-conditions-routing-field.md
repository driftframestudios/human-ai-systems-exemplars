# Tiffany Conditions & Routing Field

## Purpose and fit

Tiffany Conditions & Routing Field is a selectable orientation surface for situations where several preconditions shape one consequential handoff. It lets a visitor rotate across the conditions without turning their order into a rank, then keeps the selected condition, changed work, evidence boundary, named human receiver, and route onward in one inspectable field.

Use it for prompt conditioning, intake preparation, collaboration readiness, quality gates, and other compact operating situations where the useful question is: **what condition is in view, what does it change, who receives it, and where can the visitor inspect the practice more deeply?**

The [Prompt Conditions Routing Explorer](../collaboration/about-prompt-conditions-explorer/index.html) is the canonical interactive implementation. The [About-page prompt conditions cartography](../context-canvas-project-surface/img/plot/about_prompt_conditions_cartography.svg) is the canonical static reference. The contract extends [Tiffany Ledger Field](./tiffany-ledger-field.md) and borrows the explicit state, semantic-equivalent, and recovery posture of [Cobalt Operating Field](./cobalt-operating-field.md) and the [Registry × Goal Fidelity routing instrument](../collaboration/registry-goal-fidelity-routing/index.html).

## Decision grammar

Every implementation exposes the following anatomy:

1. **Condition selector** — the named set remains visible enough to compare; the current condition is written and visually marked.
2. **Information radiator** — one stable region updates to show the condition's purpose, input, and practical effect.
3. **Changed work** — a concrete description of what becomes inspectable, resumable, reviewable, or possible.
4. **Named receiver** — a person or accountable role who can review or authorize the next move.
5. **Evidence boundary** — direct language about what the condition supports and what remains dependent on local evidence or authority.
6. **Working fragment** — a usable prompt, question, intake fragment, or handoff statement rather than a decorative explanation.
7. **Route cards** — real destinations whose titles describe what a visitor can inspect there.
8. **Semantic equivalent** — the complete selection space in structured text, normally a table.

The selector may be horizontal, radial, or compactly stacked. The information radiator remains the visual and semantic center. Route cards sit downstream of the current reading; they do not compete with the selectors for primary attention.

## Palette and roles

| Role | Value | Use |
| --- | --- | --- |
| Warm canvas | `#f1e9d2` | outer field and static reference ground |
| Paper | `#fffaf2` / `#fffdf8` | readable cards, tables, and current-condition content |
| Cobalt ink | `#17345f` | structural frames, persistent receiver field, hard shadow |
| Cobalt action | `#2855f3` | focus, durable routes, and active connective structure |
| Pale cobalt | `#e7efff` | comparison and prompt-input cells |
| Tiffany | `#56d8c9` | selection, invitation, and current-condition emphasis |
| Sea glass | `#d9efea` | changed-work and route-deck fields |
| Information blue | `#d3e4f2` | semantic headers and secondary explanation |
| Coral | `#fa7065` | written evidence boundary or consequential caveat |
| Acid yellow | `#f2ff67` | sparse confirmation mark on a dark field |

Tiffany indicates selection only when the interface also writes `Selected`, `Current condition`, or an equivalent state. Coral accompanies boundary copy. Neither color carries meaning alone.

## Geometry and art direction

- Use `2px` cobalt-ink frames, small radii, and unblurred geometric shadows.
- Graph paper belongs behind relationship diagrams and operating fields, not behind long prose.
- A selector is button-like because it is a button. Static facts and descriptions remain definition cells or plain cards.
- The central route may be radial when conditions rotate around one receiver. A horizontal or stacked composition is equally valid when space or reading order benefits.
- Connective lines sit below labels and cards. Dashed lines mean available relationship or route, not uncertainty unless the copy says so.
- A current node gains at least two non-color signals: stronger outline, written state, check mark, scale, or position.
- Use Lucide-like line icons for quick semantic differentiation. Icons remain supplementary; the condition name is always written.
- The field stays professionally playful: tiffany invites exploration, cobalt carries consequence, and the paper ledger makes the result usable.

## Reading measure

Explanatory content follows the [shared reading measure](./README.md#shared-reading-measure), targeting approximately 50–66 characters per line and usually remaining within 75. Condition descriptions, changed-work statements, receiver guidance, working fragments, route explanations, and evidence boundaries retain that measure.

The selector and routing cartography may use a wider field for comparison and orientation. Each information-radiator region stays locally readable, and narrow layouts place those semantic regions into a deliberate source order while preserving the same prose measure.

## Content and language posture

- Lead with the positive working condition: `Describe what should become true`, `Choose what enters the field`, or `Carry the smallest complete packet`.
- Use negation where it preserves a material boundary: a simulated role does not inherit authority; source content does not silently become instruction; compactness does not erase provenance.
- Pair every boundary with what remains dependable and the person who can decide what follows.
- Avoid scores, rankings, maturity grades, artificial confidence, and language that suggests the visitor must install a system.
- Order is a navigational convenience and experimental variable. Write that it does not assign priority when the arrangement could otherwise imply hierarchy.
- Routes state the changed ability or practice at the destination, not `learn more` or a repeated collection label.

## Interaction contract

The canonical selector uses real buttons in a labelled group. `aria-pressed` or a complete tab pattern expresses the current condition; do not mix partial tab semantics with generic buttons.

Minimum behavior:

- The current selection remains explicit without relying on animation.
- Keyboard interaction includes ordinary tab access; horizontal selector rows also support arrow keys, Home, and End.
- A concise live region announces the changed condition and the content zones that updated.
- Focus stays on the selector the visitor activated.
- Full-view state may be addressable by URL fragment.
- State is compact and serializable. The interactive reference exposes its current state and Draft 2020-12 JSON Schema.
- Destination cards use real links. When embedded, their navigation posture is explicit in the iframe sandbox and surrounding copy.
- Motion is limited to confirmation or orientation and freezes under `prefers-reduced-motion`.

## Static, no-script, narrow, and print postures

The interactive view is progressive enhancement around a complete semantic equivalent.

- **Static:** preserve the full condition set, relationship to the receiver, and written destinations in an SVG or structured table.
- **No script:** retain the initial information-radiator reading and expose the complete routing matrix. On a receiving page, replace the embed with its static cartography and structured table. Controls whose behavior depends on script are removed or identified as inactive.
- **Narrow:** selectors may form a locally scrollable row; the radiator becomes source-ordered; route cards stack. Text size and touch targets remain usable before visual density is reduced.
- **Forced colors:** replace fills and shadows with system colors; selected state retains an outline and written state.
- **Print:** omit controls and redundant live diagrams; print the current reading and the complete semantic matrix. Any collapsed static equivalent is forced open.

## Evidence and authority boundary

The field is an orientation and collaboration instrument. It can preserve provenance, separate instructions, expose an intended state, or make a receiving route explicit. It does not confer professional authority, establish regulatory applicability, validate a model response, or prove that a desired condition was reached. Those decisions stay with the named people and local evidence identified in the field.

## Release checks

- Current state is written, geometrically marked, and colored.
- Every condition has distinct input, changed work, receiver, evidence boundary, and route.
- Selector order is not presented as rank.
- Controls are native elements with complete keyboard behavior.
- Links resolve from both full-view and embedded contexts.
- The complete field exists as structured text and remains available without scripting.
- State and schema agree with the implemented selector values.
- Iframe title, sandbox, orientation, full-view link, and static fallback are present on the receiving page.
- Reduced motion, forced colors, print, narrow viewports, and long content are verified.
- The surface uses no framework or external runtime dependency.

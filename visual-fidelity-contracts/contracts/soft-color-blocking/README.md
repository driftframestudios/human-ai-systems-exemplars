# Soft Color Blocking

Soft Color Blocking gives operational applications, guided workflows, and
technical diagrams an approachable structure. Large flat fields group related
work; square geometry creates rhythm; strong labels name state and action; a
small set of high-contrast accents directs attention.

| Contract field | Value |
| --- | --- |
| Stable ID | `vfc:soft-color-blocking` |
| Version | `1.0.0` |
| Standing | Review candidate |
| Last repository review | 2026-10-20 |
| Contract record | [`contract.v1.json`](./contract.v1.json) |
| Token authority | [`tokens.css`](./tokens.css) is a reference mapping; established examples retain their local CSS ownership |
| Public continuation | [Soft Color Blocking — Visual Fidelity Contract](https://kindlight.systems/visual-fidelity-contracts/soft-color-blocking-visual-fidelity-contract) |

## Purpose and populations

Use Soft Color Blocking when a visitor needs to understand a workflow, compare
operating groups, or inspect a technical relationship through broad cues before
entering specialist detail. It supports product teams, operations teams,
reviewers, and cross-functional groups who point at a shared artifact and
explain what fits, what changed, and what requires another decision.

### Fits

- guided operational and review workflows;
- architecture or system diagrams that share a product's visual grammar;
- context trees, impact maps, role boards, and route comparisons;
- approachable data or state views with written labels and recovery.

### A stronger neighboring fit

Industrial Ink serves dense scientific and engineering instruments. Cobalt
Operating Field serves relationship-heavy system cartography. Rose Quartz serves
long-form narrative. Soft Color Blocking can contribute a compact orientation
or interactive technical region inside those families when the broad field
grouping helps a visitor make a decision.

### Smallest useful dose

Use one large semantic field, one strong label, square geometry, and one explicit
state relationship. A small dose should make a group or handoff easier to name.

## Composition and hierarchy

1. **Orientation block** — names the task, person, object, or question.
2. **Primary color fields** — group the main workflow steps or system regions.
3. **Action and state labels** — write selected, pending, held, accepted, error,
   and recovery conditions directly.
4. **Connection grammar** — uses aligned edges, integrated arrows, and short
   relationship labels.
5. **Detail region** — gives the selected item enough explanation to support a
   decision.
6. **Evidence boundary** — states what the example demonstrates and which
   operational, scientific, or authorization decision stays with its owner.

Fields remain broad and flat. Solid offset layers provide depth. Whitespace and
field size establish hierarchy before an additional accent appears. Square
corners and deliberate misalignment can add energy while labels and focus order
keep the operating sequence clear.

## Palette and tokens

The palette is closed for interface chrome. Authentic source imagery retains its
documentary colors inside a labeled figure.

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Blush field | `--scb-blush` | `#f8cbc7` | page field and orientation region |
| Paper | `--scb-paper` | `#f9e8e5` | primary panel and calm working field |
| Cobalt | `--scb-cobalt` | `#3157ed` | structure, active action, and major label |
| Deep ink | `--scb-ink` | `#14245b` | body text across warm fields |
| Chartreuse | `--scb-chartreuse` | `#ebff4f` | selected, ready, or next-action field |
| Coral | `--scb-coral` | `#ff6b63` | error, interrupted route, or consequential caveat |
| Dusty yellow | `--scb-dusty-yellow` | `#ded575` | pending, provisional, or supporting context |
| Warm white | `--scb-warm-white` | `#fff7f4` | text on cobalt and printable light field |

### Tested foreground/background pairs

| Foreground | Background | Ratio | Named use |
| --- | --- | ---: | --- |
| `#3157ed` | `#fff7f4` | 5.34:1 | cobalt text on warm white |
| `#fff7f4` | `#3157ed` | 5.34:1 | warm-white text on cobalt |
| `#14245b` | `#f8cbc7` | 10.02:1 | body text on blush |
| `#14245b` | `#f9e8e5` | 12.35:1 | body text on paper |
| `#14245b` | `#ebff4f` | 13.22:1 | selected-state text |
| `#14245b` | `#ff6b63` | 5.26:1 | error and caveat text |
| `#14245b` | `#ded575` | 9.69:1 | pending-state text |

These ratios establish ordinary-text contrast for their named uses. Written
labels and geometry preserve state when colors are replaced by the user agent.

## Typography, geometry, and density

- A rounded geometric system sans carries display headings and major action
  labels. The system fallback remains fully usable.
- A familiar system sans carries body copy and controls.
- System monospace carries compact status, identifier, and route labels.
- Body text begins at `1rem`. Compact metadata begins at `0.75rem` in short,
  high-contrast uses.
- Sustained explanation targets 50–66 characters per line and stays within 75.
- Corners stay square or near-square. Pills remain reserved for compact status
  or filters whose grouped shape contributes meaning.
- Interactive targets provide at least 44 by 44 CSS pixels.
- Solid offsets create depth; blur and translucent overlays stay outside the
  reference grammar so field relationships remain inspectable.

## State, interaction, failure, and recovery

Every interactive example supplies a stable ID, explicit selected state, native
control semantics, a polite status region, focus continuity, and a semantic
table or ordered companion.

The reference specimen uses `:has()` to project native checked and focus state
onto each full-block label. A receiving application with a different selector
baseline can project the same radio state through an adjacent element or a
state class while retaining the native control, written state, and focus cue.

- **Loading:** retain accepted content and label the pending region.
- **Empty:** name the input or action that forms the first useful state.
- **Partial:** show the available region and name each pending dependency.
- **Stale:** display the accepted revision and the route to refresh it.
- **Invalid:** preserve the draft and attach the message to its field.
- **Error:** name the affected operation and offer the fitting retry or restore
  route.
- **Recovering:** preserve orientation while the recovery action runs.
- **Recovered:** state which selection or accepted revision returned.
- **Held:** name the responsible person or role and the evidence that can move
  the work forward.

Motion can emphasize a changed block or route. Reduced-motion mode presents the
final arrangement directly. The base document keeps the main sequence, state
labels, and semantic companion useful when scripting is disabled.

## Responsive, alternate-media, and visual guidance

- At 320 CSS pixels, broad fields stack in an intentional source order. A
  genuinely two-dimensional graph receives a named local inspection region.
- At 200% text resize, block height grows with content and labels wrap inside
  their owner.
- Print uses white paper, black text, retained borders, written states, and the
  complete evidence boundary.
- Forced-colors mode maps field boundaries and selected state to system colors.
- Reduced-motion mode removes travel while retaining the final state and focus.
- SVGs receive a useful `<title>` and `<desc>`, semantic groups, written edge
  labels, stable IDs, and a nearby table or ordered explanation.
- Images receive a figure number, concise caption, source standing, and a
  full-size route when detail matters.

## Source-owned examples

The contract routes examples to their existing owners:

- [Context Tree visual variants](../../../collaboration/context-tree-visual-variants/index.html)
  show the broad field, role, and handoff grammar.
- [Impact Map visual variants](../../../collaboration/impact-map-visual-variants/index.html)
  show supplied-image fidelity and contract-level token aliases.
- [Who To Believe](../../../context-canvas-project-surface/context-canvas/who-to-believe-reviews-platform.html)
  uses the same product grammar in an inspectable system graph.
- [Visualization Fidelity Atlas](../../../context-canvas-project-surface/context-canvas/visualization-fidelity-atlas.html)
  presents the art direction as a technical-diagram example.
- The local [contract specimen](./specimen.html) is a compact adaptation for
  inspecting tokens, states, responsive order, print, and forced colors. The
  examples above retain ownership of their established implementations.

## Source, evidence, and receiving authority

This README owns the Soft Color Blocking contract meaning. `contract.v1.json`
projects that meaning into a validated machine-readable record. Existing
examples own their local behavior and CSS.
`tokens.css` records a reference mapping; each receiving implementation owns its
mapped dependency.

The source checks establish schema shape, declared-path closure, reference-token
presence, and named contrast pairs. Receiving applications own scientific
validity, authorization, durable transactions, operational receipts, and local
fitness for use.

## Verification

Run the focused source checks from the repository root:

```sh
node --test tests/visual-fidelity-contracts/foundation-contracts.test.mjs \
  tests/visual-fidelity-contracts/contract-art-directions.test.mjs
```

Run the focused browser checks from the repository root:

```sh
node --test tests/visual-fidelity-contracts/contract-art-directions.browser.mjs
```

The browser checks cover Chromium, Firefox, and WebKit at 320, 1024, and 1600
CSS pixels, plus 200% text resize, print, forced colors, reduced motion, focus
continuity, and scripting-disabled use.

## Re-entry

A changed palette value, state meaning, browser behavior, accessibility
requirement, maintained example, or receiving-system authority reopens this
contract and its focused observations.

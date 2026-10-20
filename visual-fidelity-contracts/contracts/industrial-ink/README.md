# Industrial Ink

Industrial Ink gives technical workbenches a precise, material, and calm visual
language. Dense controls and measurements sit on ink planes; ash text and rules
hold the structure; signal yellow marks the next consequential action; oxide
marks material identity and a named hold.

| Contract field | Value |
| --- | --- |
| Stable ID | `vfc:industrial-ink` |
| Version | `1.0.0` |
| Standing | Review candidate |
| Last repository review | 2026-10-20 |
| Contract record | [`contract.v1.json`](./contract.v1.json) |
| Token authority | [`tokens.css`](./tokens.css) is a reference mapping; the receiving component owns its mapped values |
| Public continuation | [Industrial Ink — Visual Fidelity Contract](https://kindlight.systems/visual-fidelity-contracts/industrial-ink-visual-fidelity-contract) |

## Purpose and populations

Use Industrial Ink when engineers, scientists, quality reviewers, field teams,
or operators need to compare several states, inspect material evidence, and act
inside an explicit authority boundary. The interface should feel like a durable
instrument whose labels remain useful during a handoff or recovery.

### Fits

- scientific or material qualification;
- inspection and commissioning benches;
- engineering tools with dense controls and tabular values;
- operational ledgers where accepted, held, stale, and recovery states matter;
- locally synthetic technical demonstrations with named evidence boundaries.

### A stronger neighboring fit

Editorial narratives usually benefit from Rose Quartz. Broad guided workflows
often benefit from Soft Color Blocking. Relationship-heavy architecture maps
often benefit from Cobalt Operating Field. Industrial Ink remains useful inside
those families as a localized instrument when the technical bench is the object
a visitor needs to inspect.

### Smallest useful dose

Use one ink work region, one ash hierarchy, one localized signal, and direct
state labels. That compact dose can clarify a technical panel while the
surrounding page retains its own visual language.

## Composition and hierarchy

1. **Instrument header** — names the object, accepted revision, operating
   environment, and current decision.
2. **Selection rail** — exposes filters or material families through native
   controls with a visible selected state.
3. **Primary bench** — joins the sixteen-state matrix, chosen object, and
   evidence summary.
4. **Material stack** — shows swatches or composited layers with written names,
   thicknesses, and source standing.
5. **Decision register** — distinguishes accepted work, draft work, a named
   hold, and the available recovery action.
6. **Evidence boundary** — says what the synthetic specimen establishes and
   which scientific, authorization, or release decision belongs to the
   receiving system.

Ink planes carry major regions. One-pixel ash rules organize dense material.
Square corners and small stepped offsets make the interface feel fabricated.
Spacing creates the first layer of hierarchy; signals remain local enough to
retain meaning.

## Palette and tokens

The palette is closed for interface chrome. Authentic scientific or documentary
imagery keeps its source colors, and a written legend explains the relationship
between the image and the interface.

The [design-token pipeline foundation](../../foundations/design-token-pipeline.md)
shows how this primitive, semantic, and component-state vocabulary can enter a
reviewed DTCG subset, generated artifacts, and a receiving UI while semantic
owners retain meaning authority.

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Deep ink | `--ii-ink-950` | `#0b0f12` | page and primary structural plane |
| Instrument ink | `--ii-ink-900` | `#13191d` | panels and controls |
| Raised ink | `--ii-ink-800` | `#1c2429` | selected technical region |
| Ash text | `--ii-ash-50` | `#f5f2e9` | primary text on ink |
| Ash rule | `--ii-ash-300` | `#aaa79f` | structural boundaries and quiet metadata |
| Signal yellow | `--ii-signal` | `#f3d348` | attention, selected comparison, commitment |
| Oxide | `--ii-oxide` | `#7f2f1f` | material identity and named hold |
| Oxide field | `--ii-oxide-pale` | `#f2b9a0` | hold explanation on a light field |
| Instrument green | `--ii-instrument` | `#9ccabb` | accepted measurement or available route |

### Tested foreground/background pairs

The contract record carries the machine-readable list. The focused tests
recalculate each ratio from the declared hex values.

| Foreground | Background | Ratio | Named use |
| --- | --- | ---: | --- |
| `#f5f2e9` | `#0b0f12` | 17.19:1 | body and instrument text |
| `#0b0f12` | `#f3d348` | 13.03:1 | signal labels and selected cells |
| `#0b0f12` | `#f2b9a0` | 11.20:1 | hold explanation |
| `#f5f2e9` | `#7f2f1f` | 8.06:1 | hold badge |
| `#0b0f12` | `#9ccabb` | 10.61:1 | accepted-state label |

These pairs establish ordinary-text contrast for the named uses. Focus rings,
icons, charts, images, and adjacent-state differentiation retain their own
observations.

## Typography, geometry, and density

- System sans carries narrative and control labels.
- System monospace carries specimen IDs, units, revision IDs, timestamps, and
  compact tabular values.
- Body text begins at `1rem`. Compact metadata begins at `0.75rem` and stays in
  short, high-contrast uses that receive 200% text-resize review.
- Sustained explanation targets 50–66 characters per line and stays within 75.
- Corners stay square or within two CSS pixels of square.
- Interactive targets provide at least 44 by 44 CSS pixels.
- Grid density comes from alignment and restrained rules. Persistent striping
  gives way to explicit selected, held, stale, and accepted states.

## Sixteen-state matrix

The [technical-workbench specimen](./specimen.html) crosses four material
families with four decision states. Each cell has an independent written name:

| Material family | Reference | Selected | Hold | Accepted |
| --- | --- | --- | --- | --- |
| Substrate | Source specimen | Comparison target | Thickness review | Baseline accepted |
| Binder | Source ratio | Ratio selected | Cure evidence hold | Ratio accepted |
| Finish | Source finish | Finish selected | Abrasion hold | Finish accepted |
| Assembly | Source joint | Joint selected | Fit review | Assembly accepted |

The matrix is a selection instrument. Labels, position, border treatment, and
status text carry each state; the restrained colors reinforce those
distinctions.

## Interaction, failure, and recovery

Native radio controls make the matrix keyboard-operable. The selected cell
updates a polite status region and a bounded detail panel. The complete table
stays available as the semantic companion.

The reference specimen uses `:has()` to project native checked and focus state
onto each full-cell label. A receiving application with a different selector
baseline can project the same radio state through an adjacent element or a
state class while retaining the native control, written state, and focus cue.

- **Loading:** keep the last accepted values visible and label the pending
  request.
- **Empty:** state which selection or source input will populate the bench.
- **Partial:** show available measurements and identify each pending source.
- **Stale:** keep the last accepted revision visible with its timestamp and a
  refresh action.
- **Invalid:** attach the message to the responsible field and preserve the
  draft.
- **Error:** retain accepted work and offer retry, restore accepted, or contact
  owner according to local authority.
- **Recovering:** announce the action in progress once.
- **Recovered:** state which accepted revision is restored.
- **Held:** name the hold owner, reason, and evidence that can release it.

Focus uses a high-contrast double-ring treatment. Motion is brief and supports
state continuity; reduced-motion mode presents the final state directly. The
HTML table, source labels, and evidence boundary remain useful when scripting is
unavailable.

## Responsive, alternate-media, and visual guidance

- At 320 CSS pixels, major regions follow source order. The matrix receives a
  named local horizontal inspection region while the page itself reflows.
- At 200% text resize, controls grow with their labels and status copy wraps
  inside its owner.
- Print uses white paper, black text, retained rules, full state labels, and the
  complete evidence boundary.
- Forced-colors mode maps structural regions to `Canvas`, `CanvasText`,
  `ButtonText`, `Highlight`, and `HighlightText`.
- Reduced-motion mode removes transition time while preserving selected and
  recovery state.
- SVG diagrams use a useful `<title>` and `<desc>`, semantic groups, integrated
  labels, and a nearby table or ordered explanation.
- Technical imagery receives a figure number, concise caption, source standing,
  and a full-size route when detail drives the decision.

## Source, evidence, and receiving authority

This README owns the Industrial Ink contract meaning. `contract.v1.json`
projects that meaning into a validated machine-readable record, and
`tokens.css` provides an inspectable reference mapping. A receiving
application owns its implementation, state store, scientific validity,
authorization, durable transaction, and operational receipt.

The specimen uses synthetic local material data. It establishes the visual and
interaction grammar represented in its source. It leaves material qualification,
production readiness, and release approval to the people and evidence named by
the receiving system.

## Verification

Run the focused source checks from the repository root:

```sh
node --test tests/visual-fidelity-contracts/foundation-contracts.test.mjs \
  tests/visual-fidelity-contracts/contract-art-directions.test.mjs
```

The source checks establish schema validity, catalog integrity, declared-path
closure, sixteen-state completeness, token presence, and tested contrast pairs.
Run the focused browser checks from the repository root:

```sh
node --test tests/visual-fidelity-contracts/contract-art-directions.browser.mjs
```

The browser checks cover Chromium, Firefox, and WebKit at 320, 1024, and 1600
CSS pixels, plus 200% text resize, print, forced colors, reduced motion, focus
continuity, and scripting-disabled use.

## Re-entry

A changed palette value, state meaning, browser behavior, accessibility
requirement, canonical specimen, or receiving-system authority reopens this
contract and its focused observations.

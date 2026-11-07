# Period Kanban & Session Sequencer

Give visitors two coordinated readings of enterprise work: named periods show
the plan's shape, while session tracks reveal the work inside those periods.
Opening a sprint or quarter makes its weeks or months available without losing
the **Plan overview** return. Use the [Coordination view](../../context-canvas-project-surface/context-canvas/index.html#native-studio-coordination)
as the current example.

**Standing:** review candidate `0.1.0`; ID
`vfc:period-kanban-session-sequencer`; reviewed 7 November 2026. This operation
inherits the palette, control families and motion modes of
[Studio Rack Composition](README.md).

## Fit and smallest useful dose

Use a compact period board with its aligned session tracks when visitors need
to see work, sequence and planned participation together. A simple list remains
a fitting neighbor for a task with no useful period relationship. One populated
plan, one scope return and direct session inspection are a sufficient dose.
Session duration and participant effort keep their own units; period position
expresses the authored working arrangement.

## Invariants and permitted variation

| Stable meaning | Visible composition |
| --- | --- |
| A named sprint or quarter | A lane with its own heading and creation entry |
| A working session | Corresponding board clip and track reading with the same record identity |
| Plan overview versus period scope | Current period name and a visible Plan overview return inside the rack header |
| Work awaiting placement | An explicit Choose a period reading that retains the session |
| A decision, handoff or delay | A named marker or relation with its actual receiver and context |
| Funded, extra or paused work | Text or accessible wording plus distinct shape, border or color |

Changing view scope preserves accepted records, money and effort. Changing
period basis or a horizon is a plan operation with its existing acceptance and
Undo behavior. The view keeps that distinction visible. Period counts, stage
labels and authored presets may vary; their order and labels remain source-owned.
Overview clips can summarize occurrences while a period view exposes each one.

The default reading stays compact. Stages, handoffs and availability open when
useful. Complete chronological details belong to portable reports. A concise
hover or focus preview helps a visitor decide which clip to inspect; activation
still provides the useful reading on touch and keyboard paths.

## Interaction and state ownership

The current view keeps the selected sprint or quarter and **Plan overview**
return in the rack header, outside the board and tracks' horizontal scroll
regions. The return names its destination. One scope owner supplies this cue,
the board and the tracks. Returning restores the originating period control and
local scroll, whether the visitor entered from a lane heading or a track heading.
Changing scope preserves pending edits as well as accepted work. Add session
starts an editor draft in the selected period; confirmation accepts that item.
Hours and Minutes change the length of each occurrence; Working sessions changes
how many occurrences need placement. People may participate across team bounds.

The board uses headed sections and buttons. Session tracks use a captioned native
table with row and column headers. A named keyboard-reachable scroll region
preserves their two-dimensional relationship on ordinary mobile widths.
Selection, markers and labels remain readable with motion off. Responsive
stacking may change geometry while preserving reading order and record identity.

## Source and evidence

| Owner or observation | What it establishes |
| --- | --- |
| [Cadence view](../../collaboration/native-investment-studio/cadence-view.mjs) | Board, breadcrumb, tracks, focus return, details and actions |
| [Cadence model](../../collaboration/native-investment-studio/cadence.mjs) and [score controller](../../collaboration/native-investment-studio/score-controller.mjs) | Authored periods and the accepted/proposed arrangement boundary |
| [Work controller](../../collaboration/native-investment-studio/work-controller.mjs) | The selected session's people, duration, count and placement draft |
| [Arrangement CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-arrangements.css) and cadence rules in [About CSS](../../context-canvas-project-surface/context-canvas/styles/routes/about.css) | Receiving lane and track geometry; shared rack tokens stay inherited |
| [Score browser checks](../../tests/native-investment-studio/score.browser.mjs) | Period drill-down, in-rack scope cues, return focus and local scroll, retained plan/draft state, placement, horizon recovery and in-place example replacement |
| [Session browser checks](../../tests/native-investment-studio/session.browser.mjs) | Placement with its draft, duration/occurrence distinction and cross-team participation |

The [instrument research](../../collaboration/native-investment-studio/usability-research.md#digital-instrument-composition--5-november-2026)
uses Arrangement View's overview and locators as a design precedent. Its dated
elapsed-minute and agenda proposals are superseded by the current period model.
This contract adapts the overview/detail relationship; it claims no visitor
comprehension result from a music-production manual.

## Re-entry and future scope

Revisit this contract when scope, period meaning, record identity or the editor
return changes. The [in-rack scope increment](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/756)
is bounded to Coordination's Plan overview screen. It supersedes the earlier
Whole plan label and return placed outside the rack. Future contextual editing
panels retain their own scope decisions and existing editor owners meanwhile.
A focused mobile/desktop journey should observe
the chosen period, session, return focus and retained accepted plan; exact calendar
or performance expansion needs its own consequential question.

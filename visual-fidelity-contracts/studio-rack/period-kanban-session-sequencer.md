# Period Kanban & Session Sequencer

Give visitors two coordinated readings of enterprise work: named periods show
the plan's shape, while session tracks reveal the work inside those periods.
Opening a sprint or quarter makes its weeks or months available without losing
the **Plan overview** return. Use the [Coordination view](../../context-canvas-project-surface/context-canvas/index.html#native-studio-coordination)
as the current example. Team planning adapts this overview/detail pattern into
an editorial delivery-phase board; its lanes describe work and responsibility,
while the horizon's lanes retain period placement.

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
| An illustrative delivery phase | An editorial lane grouping teams, sessions and handoffs; temporal placement stays with the horizon |
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
Changing scope preserves pending edits as well as accepted work. A Coordination
rack Add session accepts one planned 30-minute session with extra-investment
funding, using the selected period and known team/person context. It opens the
canonical editor afterward. Cancel reverts later edits while retaining the added
record; local Undo reverses creation while it remains the latest accepted change.
Plans needing a team or person use the existing guided creation route.
Hours and Minutes change the length of each occurrence; Working sessions changes
how many occurrences need placement. People may participate across team bounds.

Session inspection opens one detail deck between Plan overview's board and
tracks. A stable receiving slot preserves its canonical form during surrounding
refreshes. The selected sprint/quarter and Plan overview return remain visible.
The exact initiating control toggles the deck; another occurrence selects its
placement. Close returns focus to the origin and retains the proposal. Team
planning opens that same form in its adjacent receiver, preserving both the
draft and its distinct phase/participation reading.

Numbered occurrence pads select a repetition. Native radio pads choose its
sprint/quarter and week/month; Add occurrence changes this work's count through
the current draft. Shared duration and ordered participant switches govern every
occurrence. Add occurrence edits that session's draft count; the rack's Add session
accepts a distinct work record. Apply accepts later field edits; Cancel reverts them.

The board uses headed sections and buttons. Session tracks use a captioned native
table with row and column headers. A named keyboard-reachable scroll region
preserves their two-dimensional relationship on ordinary mobile widths.
Selection, markers and labels remain readable with motion off. Responsive
stacking may change geometry while preserving reading order and record identity.

## Source and evidence

| Owner or observation | What it establishes |
| --- | --- |
| [Cadence view](../../collaboration/native-investment-studio/cadence-view.mjs) | Period board, breadcrumb, tracks, stable session-deck slot, focus return, details and actions |
| [Delivery board](../../collaboration/native-investment-studio/delivery-board.mjs) | Authored phase projection, distinct editorial cards, local phase scope and overview return |
| [Cadence model](../../collaboration/native-investment-studio/cadence.mjs) and [score controller](../../collaboration/native-investment-studio/score-controller.mjs) | Authored periods and the accepted/proposed arrangement boundary |
| [Work controller](../../collaboration/native-investment-studio/work-controller.mjs) and [rack controls](../../collaboration/native-investment-studio/rack-controls.mjs) | The selected session's draft and receiver state; synchronized selected/open cues across both Coordination readings |
| [Occurrence controls](../../collaboration/native-investment-studio/session-occurrence-controls.mjs) | Local repetition selection and native period/subdivision choices presented through the session owner's setters |
| [Arrangement CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-arrangements.css) and cadence rules in [About CSS](../../context-canvas-project-surface/context-canvas/styles/routes/about.css) | Receiving lane and track geometry; shared rack tokens stay inherited |
| [Score browser checks](../../tests/native-investment-studio/score.browser.mjs) | Period drill-down, in-rack scope cues, return focus and local scroll, retained plan/draft state, placement, horizon recovery and in-place example replacement |
| [Session browser checks](../../tests/native-investment-studio/session.browser.mjs) | Placement with its draft, duration/occurrence distinction and cross-team participation |
| [Rack browser checks](../../tests/native-investment-studio/rack-controls.browser.mjs) | Shared receiver state, phase scope, reel-driven proposal routes and phone/laptop containment |

The [instrument research](../../collaboration/native-investment-studio/usability-research.md#digital-instrument-composition--5-november-2026)
uses Arrangement View's overview and locators as a design precedent. Its dated
elapsed-minute and agenda proposals are superseded by the current period model.
This contract adapts the overview/detail relationship; it claims no visitor
comprehension result from a music-production manual.

## Re-entry and future scope

Revisit this contract when scope, period meaning, record identity or the editor
return changes. The [in-rack scope increment](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/756)
is bounded to Coordination's Plan overview screen. It supersedes the earlier
Whole plan label and return placed outside the rack.

The [Coordination consolidation](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/765)
shares session controls between this screen and Team planning's Shared sessions.
The two readings retain distinct axes and inspection scopes:

| Reading | Columns and pads | Meaning of a session selection |
| --- | --- | --- |
| Coordination horizon | Periods or subdivisions; pads locate occurrences in the plan | A session, with its occurrence context when selected from an occurrence pad |
| Team planning: Shared sessions | People; pads show participation in a working session | The shared session and its participating people |

Both use `studio-track-key` for a quieter inactive face, persistent selection and
a caret tied to the session editor's visible open state. The controls identify
that actual receiver through `aria-controls`; a selected record can remain
pressed while its closed receiver restores the right-facing caret. A shared
`studio-rack-add` treatment carries the useful local context into the current
creation flow. Chapter styles continue to own column geometry.

Team planning is permanent, with subtly darker secondary housing that follows
the horizon's enclosure and header alignment. The reel and editorial topology
remain above it. The [delivery board](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/779)
combines team/member, session and handoff cards under Planning, Design,
Implementation, Testing, Deployment and Maintenance. A phase key opens that
phase locally, with a visible Delivery overview return restoring its originating
key and overview position. Phase scope changes presentation only.

Explicit template/slot mappings give reel selections a visible change in roles
and handoffs. Stage labels remain source-owned session context; custom-stage
and supporting work retain routes. These lanes express an illustrative delivery
pattern. Dates, period placement, completion and readiness retain their separate
owners. People and accepted-team cards open their adjacent editors; illustrative
teams retain customization. Handoff cards open connection customization;
accepted sessions reach their adjacent canonical editor through stable IDs.

The board supersedes the proposed-team strip, duplicated connection-button strip
and Delivery lifecycle disclosure in this receiver. Shared sessions follows with
its visible heading and Add control above a named participation-table scroller.
The phase scope and investment reading stay outside local scrolling. The table's
people columns retain their relationship meaning beside the horizon's period
columns. Team arrangement choices use their direct replacement and Undo owner;
ordinary session editors retain their existing proposal/Apply boundary. Other attached
summaries preserve the existing spring reveal.

The [empty-space creation increment](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/770)
makes unused rack space actionable. A dedicated
new-session row places `native-cadence__pads` creation zones under each visible
period or subdivision. At laptop and wide widths, each zone reveals an outlined
ghost pad with a plus on hover; keyboard focus reveals the same cue, and touch
has a visible Add entry. The control owns a real hit target and activation, so
moving across or scrolling through blank space simply previews the affordance.
Creation retains the chosen sprint/quarter and any explicit subdivision.

Current session-row cells sit at an existing session/period intersection. An
entry within that row names an additional occurrence of the existing work; the
new-session row names a new record. Shared sessions has a different empty-cell
meaning: the named person is outside that session. Its dedicated new-session
row/gutter carries a written Add session label, while a future action at a
person/session intersection names participation or editing. Both new-record
routes will reuse the immediate-creation owner in
[#758](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/758)
and the [contextual return contract](contextual-inspection-recovery.md).

People and available time and Stages & handoffs remain useful
[editorial companions](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/772).
Their planned attachment to the rack's lower edge preserves compact
disclosure, spring movement and contextual scope. The corresponding people and
relationship pads offer the same operations inside the instrument; both paths
continue to address the same records and editors.

The [session receiver](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/768)
supplies both readings with one existing session owner. The
[detail-deck increment](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/789)
places that form between Plan overview's board and tracks while preserving Team
planning's adjacent route. Its focused phone/laptop observation must distinguish
the same retained form from a replacement during refresh, exact-trigger closure
from another occurrence's selection, and draft placement from accepted work.
The receiving PR also records cross-rack retention, Apply/Cancel, return focus
and period/phase context. The duration module and exact repetition input remain
available. #758 adds direct accepted creation and its exact-creation Undo;
#770's empty-space entry follows as a separate authorized increment. Exact
calendar or performance expansion needs its own consequential question.

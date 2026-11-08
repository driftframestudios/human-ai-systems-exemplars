# Period Kanban & Session Sequencer

Give visitors two coordinated readings of enterprise work: named periods show
the plan's shape, while session tracks reveal the work inside those periods.
Opening a sprint or quarter makes its weeks or months available without losing
the **Plan overview** return. Use the [Coordination view](../../context-canvas-project-surface/context-canvas/index.html#native-studio-coordination)
as the current example. Team planning adapts this overview/detail pattern into
an editorial delivery-phase board; its lanes describe work and responsibility,
while the horizon's lanes retain period placement.

**Standing:** review candidate `0.1.0`; ID
`vfc:period-kanban-session-sequencer`; dev integration revised 8 November 2026. This operation
inherits the palette, control families and motion modes of
[Studio Rack Composition](README.md).

## Dev receiving refinement

Under #820/#821, a cassette filters the current board and tracks without opening
an editor. Plan and period filters have distinct visible returns. The shelf stays
attached to the rack; a selected session's compact working area sits between board
and tracks. Add sprint/quarter accepts immediately through the current cadence
owner. Amp Undo recovers it.

The lane's empty remainder is a native named creation button. Fine-pointer hover
and keyboard focus expose its outline, plus and short label; touch keeps the
invitation visible. It uses the same new-session command as the dedicated track
row. Existing populated cells preserve inspection/participation. Selected-session
pads own repetition through Add session and Remove session while canonical fields
remain synchronized. Custom teams distribute through delivery phases using their
known stage relationships; template-specific placement retains its meaning.

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

The dev Coordination composition uses open section boundaries: the horizon and
Team planning wrappers group headings and related work while the dark racks carry
their own enclosure. Their inherited inner surfaces, inset borders and editorial
companions remain visible. This gives the board, tracks and detail slots the
available width on ordinary phones and laptops. Main retains the earlier outer
wrappers as the comparison anchor until a human-cued promotion.

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
planning on dev opens that same form in the stable slot between its delivery
board and Shared sessions, preserving both the draft and its distinct
phase/participation reading. Person, team and handoff cards share that slot with
their own canonical controls.

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
| [Work controller](../../collaboration/native-investment-studio/work-controller.mjs) and [rack controls](../../collaboration/native-investment-studio/rack-controls.mjs) | Canonical controls lent to stable detail slots; synchronized selected/open cues across both Coordination readings |
| [Rack record creation](../../collaboration/native-investment-studio/rack-record-creation.mjs), [connection controller](../../collaboration/native-investment-studio/connection-controller.mjs) and [Studio controller](../../collaboration/native-investment-studio/controller.mjs) | Direct team/handoff defaults through existing acceptance owners; canonical handoff edits, scoped addition Undo and return focus |
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

Team planning is permanent. Its subtly darker secondary rack follows the
horizon's header alignment, while its section wrapper leaves that enclosure
visible directly on the Studio field. The reel and editorial topology remain
above it. The [delivery board](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/779)
combines team/member, session and handoff cards under Planning, Design,
Implementation, Testing, Deployment and Maintenance. A phase key opens that
phase locally, with a visible Delivery overview return restoring its originating
key and overview position. Phase scope changes presentation only.

Explicit template/slot mappings give reel selections a visible change in roles
and handoffs. Stage labels remain source-owned session context; custom-stage
and supporting work retain routes. These lanes express an illustrative delivery
pattern. Dates, period placement, completion and readiness retain their separate
owners. On dev, people, teams, handoffs and sessions open their canonical controls in
the stable slot between delivery board and participation tracks. Deliberate
selection of a starter team, handoff or session first accepts that preset and
then opens its real record. The preset's Undo remains available. Add team and
Add handoff create useful accepted defaults and open the same slot, with local
Undo tied to that addition. Later field changes use their existing Apply/Cancel
owners. The detached Customize teams and handoffs form is superseded by these
record entries; independent response cards remain scoped in #816.

The board supersedes the proposed-team strip, duplicated connection-button strip
and Delivery lifecycle disclosure in this receiver. Shared sessions follows with
its visible heading and Add control above a named participation-table scroller.
The phase scope and investment reading stay outside local scrolling. The table's
people columns retain their relationship meaning beside the horizon's period
columns. Team arrangement choices use their direct replacement and Undo owner;
ordinary session editors retain their existing proposal/Apply boundary. Other attached
summaries preserve the existing spring reveal.

The dev #811 receiving skin fills each Shared sessions cell with its existing
participation pad, preserving the legend and person/session meaning. A deliberate
Team arrangement selection loads the changed Teams and shared work rack with a
short downward unfurl: opacity .3 and translateY(-6px) settle to full opacity and
the resting position over 200ms ease-out at full speed. The shared speed setting
scales that duration; Off and system reduced motion settle directly. This
receiver-specific motion adopts the preserved workbench's load effect while
attached editorial drawers retain their spring treatment.

The [empty-space creation increment](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/770)
makes creation available inside each sequencer through a named **New session**
row. In the horizon, native buttons sit under every visible period/subdivision
and identify that destination. Shared sessions places them under accepted-person
columns, using that person as context while the creation owner resolves a team
from the accepted plan. Proposed team identities stay with the arrangement owner.

Both readings share `studio-rack-create-zone`: an outlined button with a visible
plus and Add session label. Fine-pointer hover adds ghost-pad emphasis; keyboard
focus and touch keep a visible direct entry. The button owns activation, so
moving across or scrolling through unused space leaves the plan intact.

Current session-row cells retain their existing session/period or person/session
meaning. Temporal gaps and participation dots stay descriptive; the separate
New session row creates a new record. The People chapter's read-only session
table keeps its current scope. Both creation routes reuse the owner in
[#758](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/758)
and the [contextual return contract](contextual-inspection-recovery.md).

People and available time and Stages & handoffs are attached
[editorial companions](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/772)
at the horizon's lower edge. Their shared `studio-rack-companions` housing carries
pale native disclosures, initially closed, with a Plan overview or selected-period
caption. Opening keeps normal page flow and the existing spring movement.

Compact People and Stages key rails inside the screen address the same inspectors
as the drawers. Existing relation pads reach handoffs, decisions and delays;
Handoffs/To place keys retain outgoing or unplaced relationships. Stage and handoff
inspection keep their Add decision and Add delay operations. Add stage and
Connect work also appear in the compact rail. Person settings remains a marked
onward route to People beside local availability. Expanded state follows the
actual inspector; Apply/Cancel returns to the originating key when present.
Scope, drafts and acceptance keep their current owners across both readings.

The [session receiver](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/768)
supplies both readings with one existing session owner. The
[detail-deck increment](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/789)
places that form between Plan overview's board and tracks. #812 on dev places
Team planning's canonical detail slot between its delivery board and Shared
sessions. Its focused phone/laptop observation must distinguish
the same retained form from a replacement during refresh, exact-trigger closure
from another occurrence's selection, and draft placement from accepted work.
The receiving PR also records cross-rack retention, Apply/Cancel, return focus
and period/phase context. The duration module and exact repetition input remain
available. #758 adds direct accepted creation and its exact-creation Undo;
PR #797 delivered #770's contextual creation rows with their exercised context,
return and ordinary phone/laptop geometry. The #771/#772 receiving PR owns the
shared movement and attached-companion observations. Future percentage-based
participation (#798) and broader removal (#773) retain separate contracts.
Exact calendar or performance expansion needs its own consequential question.

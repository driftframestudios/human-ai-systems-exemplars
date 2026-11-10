# Period Kanban & Session Sequencer

Give visitors coordinated readings of enterprise work: named periods show the
plan's shape, while tracks reveal its working sessions. Opening a sprint or
quarter shows its weeks or months with a visible Plan overview return. Team
planning uses the same overview/detail relationship for delivery phases and
participation.

**Standing:** review candidate `0.1.1`; ID
`vfc:period-kanban-session-sequencer`; dev receiving contract revised
9 November 2026 for [#906](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/906).
It inherits [Studio Rack Composition](README.md). Main retains its approved
Showcase reference until the human cues promotion.

## Read the composition

The [Coordination view](../../context-canvas-project-surface/context-canvas/index.html#native-studio-coordination)
begins with the Plans shelf attached to the period rack. The board, optional
session detail deck and Session tracks share that rack. One cassette is one
repeatable activity plan; its sessions are occurrences. Initially, the first
available cassette loads with detail closed: Pilot decision review in the
showcase. An empty library starts unselected. Loading filters work and related
stages, handoffs, decisions and delays. All plans explicitly clears that filter;
Plan overview returns from the selected period. These are independent scopes.

The selected sprint/quarter and its return stay above the board and track scroll
areas. Returning restores the originating period control and local scroll.
Changing scope retains accepted work and unfinished drafts. Add sprint/quarter
changes the accepted horizon and enters amp Undo history.

| Reading | Columns and pads | Selection meaning |
| --- | --- | --- |
| Period board | Sprint/quarter lanes; grouped work clips or individual sessions at detail scope | Work and its occurrence context |
| Session tracks | Periods or weeks/months; each plan's occurrence pads | A particular working session, with a separate plus target for another |
| Delivery overview | Planning, Design, Implementation, Testing, Deployment, Maintenance | An authored phase grouping of people, work and handoffs |
| Shared sessions | People or handoff columns against shared work rows | Direct participation/support links, separate from temporal placement |
| People teams | Parallel editorial team lanes with full-width parent keys and bottom operation rails | Group membership and local team settings; lane order expresses arrangement |
| People in working sessions | Person rows against named working-session columns | Direct participation with per-person rates, available time and local settings |

Period position expresses an authored arrangement; duration and participant
effort keep their own units. Funding, paused state and relationship markers
have text or accessible wording alongside their color and shape.

## Add, place and inspect

| Entry | Result |
| --- | --- |
| Plus inside an existing plan's track cell | Appends one accepted occurrence to that plan in the named period/week/month, retaining every earlier placement |
| Add session in a loaded period lane | Appends an occurrence to the loaded plan and retains its cassette selection; editing stays closed |
| New plan in an All plans period lane | Creates a distinct, uniquely named work record with one initial placed session; editing stays closed |
| New plan row in Session tracks | Creates a distinct, uniquely named work record in that column's period; editing stays closed |
| New plan on the cassette shelf | Creates a distinct work record and deliberately loads its cassette with detail closed |
| Existing occurrence pad | Opens its canonical session editor at that occurrence |
| Working sessions Add/Remove | Changes the selected session draft's occurrence collection; Apply accepts the proposal |
| Working sessions period choice | Moves the selected occurrence while leaving the others in their existing periods |

The visible scope gives creation its meaning: loaded Add session repeats that
plan; All plans New plan creates separate work. All plans lane and track New plan
additions retain the overview, so earlier clips stay visible. Loaded creation
retains its cassette and earlier placements, including when adding to an empty
period. The New plan row belongs to the All plans view.

Existing-plan appends use one canonical `work.update` command containing the
new count and complete placements. It is one accepted history entry, reversible
through amp Undo. A fresh work record uses the existing creation adapter, with
useful people/team defaults, a 30-minute session and extra-investment funding.
A plan needing people or a team uses the existing guided route. Later field
edits retain their Apply/Cancel boundary.

Remove plan sits at the transport's right edge and opens a compact confirmation
naming the loaded cassette. Canonical removal and its dependent links form one
accepted edit; amp Undo restores the complete arrangement.

When the library is empty, a cobalt shared reel and adjacent diagram preview
replace the board, tracks and attached readings in one full-width composition.
Plan, Design, Test, Build and Deploy select starter sets. Reel selection previews;
Load explicitly accepts a detached set as one recoverable replacement while
preserving people, teams, horizon and other chapter state. Create a plan retains
the canonical creation route, including guided missing-person/team setup. Its
local session receiver remains available while the empty composition is visible.

An empty lane is a named native button: fine-pointer hover and keyboard focus
reveal its ghosted plus; touch keeps the invitation visible. Each week/month
provides its own target across the track cell, including space to its right.
The shared [rack creation control](../../collaboration/native-investment-studio/rack-creation-controls.mjs)
owns the native target and decorative plus. Its controller retains the operation
and canonical history. Delivery lanes use its persistent labeled variant: full-width
Add team and Add handoff ghost actions stack at the bottom. Both stay visible
across pointer, keyboard and touch; empty session slots retain hover/focus reveal.
This supersedes the small side-by-side delivery additions.

The accessible name identifies the plan and exact destination. Newly created
records use the first available **New {item} N** name. Creation keeps editing
closed; the named representation opens its receiver when selected. Existing pads keep their
inspection meaning; Shared sessions cells keep their participation meaning.

A selected period offers a short caption override while its Sprint/Quarter
heading stays stable. A compact underlined Edit sits beside the actual caption
and opens one local field with Save label and ghost Cancel. Its expanded state
and focus follow that field. Successful save updates the visible caption and
returns focus to Edit; refusal retains the typed text and a local retry message.
This supersedes the large Edit label disclosure. The caption travels with
accepted state, download and Undo. Clearing it restores the derived stage summary;
saving an unchanged summary keeps its derivation. The live showcase includes a
paused follow-up so the board and cassette shelf demonstrate that state.

## Session working area

One stable slot between the board and tracks receives the canonical session
form. Refreshing the surrounding projection retains its DOM, draft and dial
ownership. The exact initiating control toggles that detail; another occurrence
selects its placement. Close retains unfinished entries and returns focus to the
origin. A first opening uses the short downward unfurl.

Duration and Working sessions occupy neighboring modules at wider widths.
Duration fills its slot and preserves the [exact duration specimen](loaded-tape-duration-panel.md).
Working sessions has Add top-right, Remove bottom-right and numbered occurrence
pads. Hours/Minutes and ordered participants apply to every occurrence of the
same work record. Native period/subdivision pads select placement. Funding and
Status are named large-pad groups beside Participants where width allows.

A raised Apply beside Close delegates to the canonical bottom submit action,
including validation, disabled state and return focus. The bottom Apply/Cancel
row remains available. Inclusion keeps person cards in place; explicit Move
up/down controls change their order with the shared keyed movement.

## Team planning and relationships

Team planning is a permanent sibling with a subtly darker secondary rack.
Its arrangement reel directly changes the accepted arrangement and shared Undo
history. Editorial cards group teams, sessions and handoffs through delivery
phases; the horizon retains sprint/quarter placement. Phase selection changes
presentation and keeps its Delivery overview return in view.

Selecting a team opens its name, stable membership pads and reorder controls
inside the delivery working area. Person and handoff forms use that local area.
Shared sessions stays visible as an independent module with People/Handoffs
checkbox matrices. Row selection opens compact host and participant-order
controls locally. Handoff headings open their canonical form inside this module.
Owner/current headers keep the return route visible; direct edits show Saved. A handoff
can create a team there and return to the retained handoff at the requested field.
Shared-session Add entries carry accepted-person context into the same creation
owner. Ordinary field proposals retain Apply; Coordination team name, membership
and order accept directly.

The horizon adds a default handoff between available work records with details
closed. Selecting it opens From work, To work and an optional Team connection.
An accepted stage/handoff can carry decisions or delays. Existing
relationship removal sits in the bottom-right action position. The handoff
omits a cost preview that does not help choose its endpoints.

## Supporting detail, geometry and motion

People and available time and Stages & handoffs attach to the bottom of the rack
as pale editorial companions. They start closed, display current scope and keep
their spring reveal. Compact record rails inside the screen address the same
inspectors. Sessions to place keeps unplaced work reachable with dark text on
its pale tray. Long chronological readings belong to reports.

Boards use headed sections and native buttons. Tracks use a captioned native
table with scoped row and column headers. Named local scroll regions preserve
their two-dimensional relationship on ordinary phones. Headings, returns and
the current included-work amount stay outside local scrolling. Open section
wrappers leave more width for the enclosed racks; main keeps its earlier outer
wrappers as the reference anchor.

Both Coordination readings use `studio-track-key`: a quiet resting face,
persistent selected state and a caret reflecting the actual visible receiver.
`aria-controls` identifies that receiver. A closed receiver restores the
right-facing caret while the record may remain selected. Off, Half-speed,
Full-speed and system reduced-motion preserve the same readable state.

## Source and evidence routes

| Owner or check | Responsibility |
| --- | --- |
| [Cadence view](../../collaboration/native-investment-studio/cadence-view.mjs) | Cassette/period scope, board, native tracks, append targets and stable detail slot |
| [Starter recipes](../../collaboration/native-investment-studio/coordination-starters.mjs), [empty library](../../collaboration/native-investment-studio/plan-library-empty.mjs) | Detached starter preparation, shared-reel preview and explicit load/create callbacks |
| [Cadence model](../../collaboration/native-investment-studio/cadence.mjs), [score controller](../../collaboration/native-investment-studio/score-controller.mjs) | Period projection, direct occurrence append and arrangement proposals |
| [Studio controller](../../collaboration/native-investment-studio/controller.mjs), [work controller](../../collaboration/native-investment-studio/work-controller.mjs) | Distinct record creation, deliberate cassette filtering and canonical session editing |
| [Occurrence controls](../../collaboration/native-investment-studio/session-occurrence-controls.mjs), [rack controls](../../collaboration/native-investment-studio/rack-controls.mjs) | Repetition/placement pads, shared selected/open cues and Apply delegation |
| [Delivery board](../../collaboration/native-investment-studio/delivery-board.mjs), [Team planning controller](../../collaboration/native-investment-studio/connection-template-controller.mjs), [arrangement surfaces](../../collaboration/native-investment-studio/arrangement-surfaces.mjs) | Phase projection, direct team controls and independent participation matrix |
| [About CSS](../../context-canvas-project-surface/context-canvas/styles/routes/about.css), [arrangement CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-arrangements.css), [session CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-session.css) | Board/track geometry and receiving module layouts |
| [Starter source checks](../../tests/native-investment-studio/coordination-starters.test.mjs), [tape library browser checks](../../tests/native-investment-studio/tape-library.browser.mjs) | Starter preservation and Undo, loaded occurrence creation, plan removal and empty-library recovery |
| [Score browser checks](../../tests/native-investment-studio/score.browser.mjs) | Append versus distinct creation, retained placements and visibility, period scope, Undo and relationship proposals |
| [Session checks](../../tests/native-investment-studio/session.browser.mjs), [rack checks](../../tests/native-investment-studio/rack-controls.browser.mjs) | Shared controls, occurrence selection, receiver identity, return and phone/laptop geometry |

The [instrument research](../../collaboration/native-investment-studio/usability-research.md#digital-instrument-composition--5-november-2026)
uses Arrangement View overview and locators as interaction precedents. Native
semantics and canonical commands establish this implementation's behavior.
The receiving PR records the observations actually obtained; human walkthrough
evaluates whether the resulting composition is clear.

## Supersession and next boundary

This current contract replaces the accumulated implementation chronology.
#906 supersedes the unqualified rule that period-lane creation always makes a
new record: the loaded plan receives another occurrence, while All plans offers
explicit New plan. Scoped relationship markers and the empty-library starter
composition keep that distinction visible.
#831 supersedes add-then-open with creation in place and deliberate inspection,
and the single period-cell plus with week/month targets spanning the cell.
#828 supersedes passive blanks in existing-plan tracks with explicit session
append targets, and supersedes automatic new-cassette filtering after period
creation with the visible All plans arrangement. It also supersedes #825's
bottom-left Working sessions removal with the requested bottom-right placement.

Named periods continue to supersede elapsed-minute navigation. Local session
receivers supersede detached primary settings; amp Undo supersedes a cassette-local
Undo. The standalone workbench's exact artwork remains preserved.

Independent response records (#816), percentage participation (#798), broader
removal (#773) and performance (#679) retain separate outcomes. Performance
implementation, including #902, stays queued for a later cue. Revisit this contract
when scope, record identity, acceptance, placement or return changes.

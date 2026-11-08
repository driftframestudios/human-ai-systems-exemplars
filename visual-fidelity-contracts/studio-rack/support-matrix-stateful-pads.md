# Support Matrix & Stateful Pads

Make the work behind a plan visible through comparable rows, useful empty cells
and pads that open the corresponding detail. A visitor can distinguish assigned
people, linked sessions, planned support and recorded observations before deciding
what to inspect. The Abilities tables and Quality session tracks are current
examples within the [Studio](../../context-canvas-project-surface/context-canvas/index.html#native-studio-work).

**Standing:** review candidate `0.1.0`; ID `vfc:support-matrix-stateful-pads`;
reviewed 7 November 2026. Palette and shared controls inherit
[Studio Rack Composition](README.md).

## Fit and smallest useful dose

Use a matrix when the same questions apply to several abilities, practices or
sessions. Use a pad rail when the main task is selecting one record or toggling
independent options. One named row, meaningful column headings and one adjacent
inspector form a useful starting point. A kanban lane groups work by a named
period, team, phase or attention area; its position retains that meaning when
pads move.

## Distinguish the states

| Meaning | Control and visual reading |
| --- | --- |
| Selected for inspection | Pressed choice or expanded receiver, with a visible selected target |
| Included in a proposal | Native checkbox or toggle button with `aria-pressed`, accompanied by written or accessible inclusion state |
| Included in the accepted plan | Accepted projection supplied by the plan owner |
| Supporting work linked | Named session or meaningful pad whose accessible name identifies it |
| Person participating in a session | Participation pad at the named person/session intersection |
| Support still to choose | Useful empty-state wording and an actionable route |
| Requirement outside a card's definition | Explicit Not specified reading rather than an invented gap |
| Recorded observation | Its reviewer, context and revision, distinct from an authored example |

The pad's operation determines its semantics. Selection and inclusion may each
use a toggle button with `aria-pressed`; the label and surrounding context
identify which operation it performs. Existing independent-membership controls
also use native checkboxes. A disclosure uses `aria-expanded`, and a pad that
navigates carries a destination cue. Color and depth support the state already
expressed by the semantic control and its written state. Decorative meter
segments never create an additional readiness claim.

The current Abilities chapter retains both full support tables. Their
responsibility, preparation, review and observation columns support comparison;
one editing rack follows the selected table. Change and Quality can use denser
track pads because their neighboring work lanes supply the selected component's
context. These are permitted variants of the same operation, not interchangeable
labels for different evidence states.

## Reading, motion and recovery

Native tables retain captions and scoped row/column headers. Every meaningful
cell remains readable with its row and column. Two-dimensional inspection uses
a named local scroll region at phone widths. Long labels wrap; headers retain
contrast against their actual background. Ordinary text, border and shape keep
selected and available states legible in alternate color presentations.

Reels and faders may rearrange keyed pads to illustrate an authored configuration.
The movement follows stable identity and honors the shared motion preference.
The written result appears independently of the effect. Inspection retains the
owning draft, and shared sessions retain one cost account even when several pads
refer to them. Apply, Cancel and Undo keep their existing acceptance boundaries.

## Source and evidence

| Owner or observation | Responsibility |
| --- | --- |
| [Capability controller](../../collaboration/native-investment-studio/capability-controller.mjs) and [capabilities](../../collaboration/native-investment-studio/capabilities.mjs) | Table meaning, selected card and adjacent retained editor |
| [Change controller](../../collaboration/native-investment-studio/change-controller.mjs) and [Assurance controller](../../collaboration/native-investment-studio/assurance-controller.mjs) | Component support, quality inclusion and their existing draft owners |
| [Arrangement surfaces](../../collaboration/native-investment-studio/arrangement-surfaces.mjs) and [connection view](../../collaboration/native-investment-studio/connection-view.mjs) | Native people/session relationship table, fixed heading/Add control, local participant scroller and shared team/member-lane rendering |
| [Rack controls](../../collaboration/native-investment-studio/rack-controls.mjs) and [work controller](../../collaboration/native-investment-studio/work-controller.mjs) | Shared session keys and participation pads reflect the selected session and its actual receiver visibility |
| [Rack controls](../../collaboration/native-investment-studio/rack-controls.mjs), [team controller](../../collaboration/native-investment-studio/team-controller.mjs) and [assembly controller](../../collaboration/native-investment-studio/assembly-controller.mjs) | Person/team record keys open one adjacent canonical editor; inclusion remains with its existing draft owner |
| [Abilities CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-abilities.css), [Change CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-change.css), [Assurance CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-assurance.css) | Scoped table, rail, pad and adjacent-rack variants |
| [Capability browser checks](../../tests/native-investment-studio/capability.browser.mjs) | Support states, retained selected drafts, shared work and readable table controls |
| [Change](../../tests/native-investment-studio/change.browser.mjs) and [Assurance browser checks](../../tests/native-investment-studio/assurance.browser.mjs) | Component selection, linked work, pressure-driven pad movement and recovery |

The [recorded instrument research](../../collaboration/native-investment-studio/usability-research.md#digital-instrument-composition--5-november-2026)
adapts the pad/device distinction in the [Push manual](https://www.ableton.com/en/push/manual/).
That precedent supports separating selection from parameter editing. Native
table meaning and the Studio's source model establish the actual relationships.
Focused browser observations establish the exercised controls; the visitor's
interpretation remains a human walkthrough question.

## Re-entry and future scope

Revisit when a cell changes meaning, a pad changes operation, a source record
gains a new state, or an inspector moves. The
[Coordination consolidation](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/765)
uses Shared sessions as a participation reading: each column names a person and
each row names shared work. A populated pad means that person participates;
selection identifies the session being inspected. Accepted-session keys and
participation pads now mirror the same selected record and visible receiver.
Participation remains the pad's relationship meaning; selected/open cues describe
inspection. The initial arrangement illustration precedes acceptance; after a
choice, its session keys use accepted IDs and the shared receiver state. Team planning's permanent
secondary rack groups an editorial delivery board and Shared sessions. The
board's phase lanes combine team/member, session and handoff cards; a team can
appear in several phases as an illustrative role while keeping one identity.
The editorial topology above retains its relationship routes. Shared sessions
keeps its separate participation meaning, and its heading and Add control stay
visible while participant columns scroll locally.

The [delivery board](../../collaboration/native-investment-studio/delivery-board.mjs)
uses explicit template/slot mappings to vary the selected picture with the reel.
Every session and handoff retains its own card and receiver; source stage labels
remain session context. This replaces the separate team strip and lifecycle
disclosure in Team planning. The [Period Kanban variant](period-kanban-session-sequencer.md)
owns phase scope and return. Team arrangement selection updates one accepted
instance with local Undo; ordinary session editors retain their Apply boundary.
Remaining attached disclosures keep their spring reveal.

The existing `native-quality-tracks` is the preferred aesthetic precedent for
future in-rack selection matrices: compact named rows, dark table housing,
clearly available pads, and solid pressed inclusion states. Its Quality support
and inclusion meanings remain specific to that receiver. A Coordination panel
names whether its pads choose people, select a session or reveal settings. A
short option set can use a pad rail; a matrix earns its space when named row and
column relationships help the visitor compare.

The [person/team receiver](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/757)
opens the canonical editor directly below Team planning's initiating rack.
People and accepted-team keys select an object; membership controls continue to
edit its proposal. `studio-record-key` reports selected and expanded states
separately, and closing retains the draft while restoring the originating key's
focus. The existing control groups remain useful; a larger matrix is a
composition option when the relationships benefit from comparison. The
[session receiver](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/768)
uses the same contextual opening and return grammar while retaining its own
participation and duration owners. A participation pad opens that session's
canonical editor below its originating Team planning rack; it keeps its meaning
as a person/session intersection. Horizon entries and shared-session row keys toggle their
receiver; another entry supplies its own inspection context. Close preserves the
draft and returns to that control. Moving to the same work in the temporal rack
places the canonical form in #789's stable Session detail deck between the
period board and tracks, retaining the proposal and existing scope owners.

The deck uses named participant tracks with native inclusion switches and the
existing explicit reorder controls. One ordered participant collection applies
to every occurrence of that session, as does its duration. Numbered occurrence
pads select the repetition whose placement is being edited; native radio pads
choose its sprint/quarter and week/month. Add occurrence delegates a count change
to the current session draft. These controls use Quality's compact track skin
while preserving their distinct inclusion, ordering and placement meanings.
The exact repetition field stays available. Apply accepts these changes together;
Cancel reverts them, and Close retains their unfinished draft.

An unused participation cell keeps its person/session meaning. #758's Coordination
rack Add session accepts useful defaults, then opens the canonical editor with
its known team/person context. Cancel reverts later edits and preserves the new
session; local Undo reverses its creation while that change remains latest.
Plans needing a team or person retain guided creation. The next authorized
[empty-space creation route](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/770)
uses a named new-session row or gutter in the surrounding rack; a ghost
plus indicates that action on hover and focus, with a visible touch equivalent.
An eventual participation action in the cell names the person and the session.
This separates creating work, adding participation and inspecting an existing
record even when they share a pad-shaped control.

The [participant-control increment](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/771)
is to reuse the keyed movement of Change's component
keys through `animateRackChange` in
[`reel-control.mjs`](../../collaboration/native-investment-studio/reel-control.mjs).
Consistent Move earlier/later or up/down controls describe the rendered order;
the receiving layout chooses the directional words that match its geometry.
Stable person identity, retained focus and the motion preference govern the
movement. Membership toggles keep the available cards mounted; an explicit
reorder changes their order. Its later **Time in this session** fader receives
the quantity decision in [Precision Dials & Faders](precision-dials-faders.md)
before a pad starts implying a person's share of session time.

The future [removal pattern](../../collaboration/native-investment-studio/removal-recovery-research.md)
keeps the affected relationship explicit: removing a person from a session,
removing one occurrence and removing the shared session have distinct scopes.
Routine removal from accepted work offers named Undo through the existing
history owner. Draft participation remains an inclusion choice with its existing
Apply/Cancel boundary. A pad's selection or empty state never silently enlarges
the operation to related records.

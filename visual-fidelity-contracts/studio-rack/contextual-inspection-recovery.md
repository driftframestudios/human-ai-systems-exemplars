# Contextual Inspection & Recovery

Open the work behind a pad, change it in its rack, and return with the selected
record and unfinished entries intact. One canonical editor owns each proposal;
its placement follows the visitor's current working area.

**Standing:** review candidate `0.1.0`; ID `vfc:contextual-inspection-recovery`;
dev receiving contract revised 8 November 2026 for
[#828](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/828).
It inherits [Studio Rack Composition](README.md). `main` remains the approved
comparison anchor; a human cue authorizes promotion from `dev`.

## Current receiving pattern

| Working area | Local editing and return |
| --- | --- |
| Plan overview | A cassette loads scope with detail closed. A session clip or track opens the Session detail deck between the period board and tracks. The selected period and Plan overview return remain visible. |
| Team planning | Selecting a team replaces Delivery overview with its name, membership and order controls. A person opens the canonical person form in that working area. Shared sessions remains visible as an independent module throughout person, team and handoff editing. |
| Handoff settings | Create a team accepts a useful new team and opens its controls in Team planning. Handoff settings returns to the saved handoff and its requested team field. The existing recovery control reviews saved entries against the updated plan. |
| Horizon handoff | From work, To work and optional Team connection define the relation. Its fresh draft offers creation, Cancel and Close; decisions, delays and removal become available after acceptance. |
| People | Add person and Add team accept useful starting records and open their local editors within the corresponding roster or team rack. Name, rate and funded time share the person owner; team membership keeps its own owner. |
| Abilities | Both support tables remain available. A cell opens one selected module at its relevant section. Adding a person, team or session keeps this module open and selects the new record in its support proposal. |

The Delivery working area and Shared sessions have separate visibility roles.
Changing the selected person or team affects the first area; the participation
matrix remains available below it. Person controls retain their readable peach
surface inside the dark rack, with a compact Back to Delivery overview action.
Team membership uses the sequencer's clear selected face and available state.

## Recognizable controls

| Operation | Cue and consequence |
| --- | --- |
| Inspect nearby detail | Caret and `aria-expanded` follow the visible receiver; pressed state identifies the selected object. |
| Change destination | Arrow and destination wording identify the move. |
| Create a record | Plus and Add wording identify a new accepted starting point; local controls then edit it. |
| Accept a prepared proposal | Raised Apply beside Close delegates to the canonical bottom action. A final confirmation carries acceptance meaning and its matching label. |
| Close or return | Ghost action retains unfinished entries and restores the initiating control or named working area. |
| Cancel edits | Ghost action restores accepted values. A record added earlier remains accepted. |
| Remove | Muted rose action names the object or relationship and uses its current reference-aware recovery route. |
| Undo | The stable native amp control reverses the latest accepted change through shared history. Its disabled state remains in place at zero. |

The [WAI Disclosure Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
is the semantic precedent for native activation, expanded state and right/down
cues. The [recorded control research](../../collaboration/native-investment-studio/rack-control-research.md)
explains the local distinction between selection, creation and acceptance.

## Acceptance and recovery

Creation and later editing are separate accepted-state decisions. A new person,
team, handoff or session enters shared history once. Apply accepts subsequent
form changes; Cancel restores that accepted record; Close retains the proposal.
Direct Team planning name, membership and reorder changes accept immediately.
People's team editor and the session, person and handoff forms retain Apply.
The shared top Apply mirrors its canonical submitter's label, disabled state
and validation. It invokes that submitter's existing operation and preserves
canonical validation and return-focus behavior. An editor that stays open can
retain header focus; a completed score edit closes its inspector and returns to
the originating marker. The bottom action row remains available. A canonical
Remove confirmation stays with its own bottom control.

Adding through an existing plan's track appends one accepted occurrence with
all earlier placements retained. Period-lane and track New plan creation add
distinct records while keeping All plans visible. Shelf New plan deliberately
loads the new cassette. Amp Undo reverses the accepted operation; ordinary
session draft additions and placement changes still accept through Apply.

Abilities also separates record creation from support assignment. Adding a person,
team or session accepts that record, then selects it within the current support
proposal. Apply accepts the relationship. Cancel restores the prior support
selection while retaining the added record; amp Undo can recover its creation.

An editor switch parks unfinished work. A saved draft returns to a visible
receiver before focus enters its review control or requested field. Record,
rack and phase identity recover the initiating control after a board refresh.
A refused switch keeps the admitted record and visible editor aligned. The
canonical configure/status nodes move between their chapter home and the local
Coordination slot; their event listeners and draft ownership move with them.

Session duration and ordered participants apply to all occurrences of that
session. Working sessions pads select the occurrence whose sprint/quarter and
week/month are being edited. The enclosed duration module retains its separate
[layout contract](loaded-tape-duration-panel.md). Membership keeps cards in place;
explicit movement changes their order and retains focus on the same person.

## Layout and motion

The selected name, Apply and Close/Return sit above local controls. Desktop uses the
available rack width; ordinary mobile widths reflow controls while tables and
cassette shelves scroll locally. A short downward unfurl marks loaded detail.
Reduced motion settles the same state directly. Attached People and available
time and Stages & handoffs disclosures retain their editorial skin and spring
reveal; their compact rack entries reach the same records. Working sessions
Remove and existing relationship removal occupy the bottom-right action position.
The horizon handoff shows concise relationship controls without a repeated cost
preview.

[Ableton's Clip View](https://www.ableton.com/en/live-manual/12/clip-view/)
provides the selected-record/detail precedent. The Studio adapts it as a
nonmodal working area with native form controls. A future blocking overlay
would need the separate focus and inert-background contract in the
[WAI modal-dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

## Ownership and evidence

| Route | What it establishes or owns |
| --- | --- |
| [Controller](../../collaboration/native-investment-studio/controller.mjs), [editing coordinator](../../collaboration/native-investment-studio/editing.mjs), [rack controls](../../collaboration/native-investment-studio/rack-controls.mjs) | Receiver placement, active identity, saved drafts, shared Apply delegation, local returns and amp Undo |
| [Rack creation](../../collaboration/native-investment-studio/rack-record-creation.mjs), [team](../../collaboration/native-investment-studio/team-controller.mjs), [assembly](../../collaboration/native-investment-studio/assembly-controller.mjs), [capability](../../collaboration/native-investment-studio/capability-controller.mjs) controllers | Accepted creation and the existing person, team and support proposal owners |
| [Team planning controller](../../collaboration/native-investment-studio/connection-template-controller.mjs), [arrangement CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-arrangements.css), [Abilities/People CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-abilities.css) | Independent rack modules, direct team controls and local chapter skins |
| [Rack browser checks](../../tests/native-investment-studio/rack-controls.browser.mjs), [People checks](../../tests/native-investment-studio/assembly.browser.mjs), [Abilities checks](../../tests/native-investment-studio/capability.browser.mjs), [score checks](../../tests/native-investment-studio/score.browser.mjs) | Exercised creation, visibility, top Apply, draft retention, return, Undo and ordinary phone/desktop geometry |

The receiving PR records the checks actually run. Browser evidence establishes
those operations and dimensions; human walkthrough establishes whether the
composition and return cues feel clear.

## Supersession and next boundary

This dev contract supersedes the accumulated below-rack inspector placements,
the separate Customize teams and handoffs form, and a cassette-local Undo.
Current local receivers, direct creation and amp history are the receiving
pattern. #828 also supersedes bottom-only Apply access, automatic cassette
filtering after period creation, and follow-on actions in a fresh handoff draft.
Working sessions Remove moves from #825's bottom-left to bottom-right; its
duration artwork remains preserved. `main` keeps its earlier approved runtime until promotion; Git
history retains the earlier contract narrative.

The [removal research](../../collaboration/native-investment-studio/removal-recovery-research.md)
continues to inform future removal refinements. Direct acceptance for every
removal, independent response cards and per-person allocation percentages retain
their own implementation decisions. Revisit this contract when an operation,
acceptance boundary, receiver placement or recovery route changes.

# Coordination rack consolidation

Give a visitor two coherent views of the same work: **Coordination horizon**
shows when sessions happen; **Team planning** shows who works together. Shared
instrument controls make both views familiar while their labels preserve those
different questions.

**Standing — 7 November 2026:** this is the approved consolidation route for
[#765](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/765).
Current behavior remains in the [Studio source](../../collaboration/native-investment-studio/README.md).
PR #769 recorded the initial distinction and preparation route, refined in
PR #774. PR #775 delivered shared session controls; PR #778 completed the permanent
Team planning section and secondary rack. PR #781 delivered
[#779](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/779)
by combining teams, sessions and handoffs into an editorial delivery board.
[#766](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/766)
adds direct arrangement replacement and local Undo; its focused PR owns the
transaction and receiver evidence.
PR #785 supplies duration/rate enclosures, PR #786 supplies the adjacent person/team
receiver and PR #787 extends it to sessions from either rack. PR #790 delivered
#788's duration skin and shared dial artwork. PR #793 repaired the current-entry
browser routes (#777), enlarged-text readout (#791) and editor restoration (#792).
#789 places the canonical Session detail deck inside Plan overview; Team planning
retains the adjacent receiver. PR #794 delivered that increment after independent
review. PR #795 delivered immediate creation (#758) after independent review
and passing hosted checks. Contextual creation rows (#770) complete
this sequence through that same acceptance owner. Participant refinements,
attached companions and broader removal/recovery retain their prospective issues.
The current aesthetic, compact landing and existing operations remain the reference.

## Same work, distinct readings

| Meaning | Coordination horizon | Team planning |
| --- | --- | --- |
| Visitor question | When does this work happen? | Who works together? |
| Board | Sprints/quarters, then weeks/months | Delivery phases containing teams, people, sessions and handoffs |
| Track columns | Periods or their subdivisions | People |
| A populated pad | A session occurrence | A person's participation in a session |
| Record identity | Existing work ID, plus occurrence/period where relevant | The same work ID, plus person where relevant |
| Visual emphasis | Primary instrument rack | Subtly darker secondary instrument rack, with editorial surroundings |
| Amount | Current plan’s included work | Included work in this arrangement, with shared sessions priced once; the amp retains the whole-plan amount |

Both readings address the same session editor. Duration, repetitions, people
and funding retain their existing owners. A participation pad expresses who is
involved; it does not introduce another occurrence. A selected row, an included
person and an open editor remain separately observable states.

## Common controls and enclosure

The shared `studio-track-key` role adopts the horizon's Session tracks art
direction and the handoff key's selected-state precedent. Inactive keys have a
quieter face; selection has a persistent border/pressed treatment. Keyboard focus
remains independently visible. The caret points down while that record's actual
session-settings receiver is visible and open; a closed receiver keeps a
right-facing cue even when its record stays selected.

The session editor supplies record identity, open visibility and the controlled
element ID through `readReceiver()`. `rack-controls.mjs` mirrors that state into
the controls in both readings, in place, preserving focus and horizontal scroll.
Accepted-session keys and populated pads receive the same selected-record and
expanded state. The starter arrangement illustration keeps its initial route;
a deliberate choice accepts the arrangement and its rack uses accepted IDs.
The global last-click effect remains transient motion feedback. Session settings
opens inside Plan overview or beside its originating Team planning rack.
Repeating the initiating horizon control or a shared-session row key closes the
receiver. Delivery cards and participation pads inspect their session; choosing another
entry supplies that entry's occurrence or participation context.

`studio-rack-add` supplies the shared Add session treatment in the existing
instrument stylesheet; receiving styles retain column geometry. A plus identifies
creation. #758 makes Coordination rack Add session accept a useful starting
record directly. Horizon entry supplies its period/subdivision; Team planning
supplies its known team/person context. The canonical editor then opens for
adjustment through its existing Apply owner. Guided creation still uses ordinary
final Add confirmation when a team or person must first be supplied.

The darker Team planning rack adopts the horizon's bezel, compact header and
readout alignment. Its heading, amount and Add session sit outside the named
participation-table scroll region, extending #756's scope treatment. Existing
team/member, session and handoff affordances share an editorial delivery board,
followed by Shared sessions. The board's phase scope and Delivery overview return
stay above its own local scroller. Each control keeps its participation,
selection or editing meaning.

### Reuse across chapters, with meaningful differences

The whole Studio supplies composition examples. Quality tracks provide the
preferred matrix treatment for adjacent editors: inspect a row, include an
item, link supporting work, or create work through visibly distinct controls.
Abilities supplies an adjacent inspector; Change and Quality supply keyed pad
movement; the native disclosures supply the spring reveal. An opened panel can
contain its own rack when this makes the controls easier to understand.

Keep Change and Quality's intentionally different fader skins. Shared controls
gain generic names when their extraction creates an actual shared owner: track
key, participation pad, duration module, reorder controls or editorial drawer.
Update consumers, source references and relevant checks together. Chapter
geometry, domain state attributes and deliberate skins remain with their
receiving owners. Existing shared modules and `studio-instrument.css` are the
first extension points; broad renaming is a separate change with its own value
to establish.

### Empty space that creates work

[#770](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/770)
adds a native **New session** row to each Coordination sequencer. The horizon
places an Add session button under each visible period or week/month column.
Its accessible name identifies the destination, such as **Add a session in
Sprint 2, Week 1**. Shared sessions places buttons under accepted-person columns
with names such as **Add a session with Researcher**. The creation owner resolves
their team from the accepted plan; proposed team structures retain their own
arrangement owner.

Both use `studio-rack-create-row` and `studio-rack-create-zone`: an outlined
native button with a visible plus and Add session label. Fine-pointer hover adds
ghost-pad emphasis. Keyboard focus and touch retain visible entries, and the
ordinary Add action remains in each rack heading. These are actual buttons,
so scrolling through unused space preserves the view.

Existing work rows retain their current occurrence or participation reading.
Temporal gaps and participation dots remain descriptive; the distinct New session
row creates work. The People chapter's read-only session table stays unchanged.
`cadence-view.mjs` supplies period/subdivision context;
`arrangement-surfaces.mjs` receives accepted person IDs from the Team planning
controller. Shared instrument CSS owns both creation zones' visual treatment.

[#758](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/758)
supplies the immediate-creation owner reused by these entry points.
Coordination rack Add session accepts **Review the next step** with one planned
30-minute occurrence and extra-investment funding. Known period/subdivision and
team/person context inform its placement and participants; the existing adapter
allocates the record identity. The canonical deck or adjacent editor opens to
adjust this accepted session. Plans needing a team or person retain guided creation.

Creation Undo and later edit Cancel have distinct meanings. Cancel reverts the
editing proposal and preserves the added record. **Undo session addition** is
available only while creation remains the latest accepted change. It parks
unfinished edits, reverses that creation through shared history and closes the
removed record's editor. A later accepted change retires the local shortcut;
Investment retains complete Undo history.

`session-creation.mjs` prepares useful values and validates initiating references.
`work-controller.mjs` uses the existing adapter and acceptance path;
`controller.mjs` opens the receiver and binds local Undo to the returned accepted
state. #770 reuses this owner and preserves existing cell meanings.

### Participants: movement first, a named quantity later

[#771](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/771)
reuses `animateRackChange` for explicit participant reordering, keyed by person
identity. Move controls share their labels, spacing and edge states. Inclusion
toggles keep the cards in place. Motion preferences retain their current owner.

A future **Time in this session** fader is the recommended first percentage
interpretation: a person's share of one occurrence, with percentage and duration
shown together. Current membership gives each participant the full duration;
availability and funded time have separate owners. The new share therefore
needs an explicit stored/projection contract before an operative control is
added. #771 records that focused decision and a separate project/period
availability option. This model exploration can run alongside the composition
work and does not block editor placement.

## Team planning flow

Team planning is a permanent semantic section with the following order:

1. **Team planning** heading, parallel to Coordination horizon.
2. Zoetrope beside the editorial team structure.
3. The short arrangement hint below the zoetrope/structure deck.
4. Secondary rack header and investment readout, followed by the delivery-phase
   board and Shared sessions participation tracks.
5. Local Undo, customization and accepted connection details. A selected person,
   accepted team or session opens its canonical editor below the initiating rack.

The About composition uses an ordinary section and exposed template container.
The template controller settles direct choices through the accepted plan and
keeps other unfinished editors with the shared coordinator. Its legacy disclosure
receiver stays supported. `delivery-board.mjs` composes team/member, session and
handoff controls inside the secondary rack. The editorial structure retains the topology above;
the accepted-arrangement reader retains its existing team and connection routes.
`createSessionTracks` keeps a visible heading and Add session above its named
local scroll region. The broader arrangement owner keeps existing connection
and session operations available.

The readout names Included work in this arrangement. Its distinct linked
sessions are priced once through the existing cost projection; missing rates
retain a known-amount label. The amp retains the whole-plan amount. A local Undo
returns the preceding accepted plan while the current arrangement remains the
latest accepted change.

### Editorial delivery board

The #779 synthesis selects six one-word phases: Planning, Design, Implementation,
Testing, Deployment and Maintenance. Compact editorial cards give team/member,
session and handoff controls distinct readings against the darker rack face.
The phase keys open a local scope with a visible Delivery overview return. These
are illustrative delivery relationships; the horizon owns actual period placement.

Three shapes were compared: phase columns with mixed cards, team columns with
phase ribbons, and a team-by-phase matrix. Phase columns bring the existing
parallel readings together while giving reel selections an immediate visible
consequence. The people-by-session matrix remains useful below for participation.

A pure presentation projection uses stable template/slot identities and explicit
phase mappings. Source-owned stage labels remain context for their sessions;
custom stages and supporting work retain routes. People and accepted-team cards
address their adjacent canonical editors; illustrative teams keep template
customization. Handoffs address connection customization. Accepted
sessions use their accepted record IDs after arrangement selection. The board
owns presentation; the arrangement transaction and existing history own plan
changes and recovery.

The proposed-team strip, duplicated connection-button strip and Delivery lifecycle
disclosure are superseded in this receiver. Remaining attached summaries retain
the spring reveal. Session keys retain receiver-driven selected/open state, and
#768 supplies their adjacent open/close interaction.

### Adjacent record editing

#757 supplies the first adjacent Coordination receiver. One `studio-rack-editor`
follows the stable Team planning template or accepted-connections root, outside
the template form and rebuilt board. `mountRackEditor` in
`rack-controls.mjs` borrows the canonical configure/status nodes; the existing
person and assembly controllers continue to own drafts and acceptance. Chapter
changes return those nodes to their People homes.

The dark title enclosure and peach editorial body reuse the shared instrument
skin and enclosed rate module. `studio-record-key` keeps selected and expanded
states distinct. The selected trigger toggles its local receiver; Close retains
raw entries and the draft token. Cancel discards the proposal and restores its
logical origin after a rerender. Apply accepts through the current owner and
keeps the editor open. Record switching uses saved proposals and a fresh resume
lease. The parent cards retain their geometry as the panel opens in page flow.

PR #786 owns the person/team opening, switching, acceptance and return evidence.
PR #787 delivered #768 through the same placement owner and canonical session editor. A horizon
entry retains the period/subdivision and occurrence when supplied; Team planning
retains its selected delivery phase and participation context. The heading names
the session and originating rack. This supplied the placement and return owner
that #789 now uses inside Plan overview.

Cross-entry moves the same session receiver and retains its current proposal.
Close restores the initiating control with its local context; Cancel discards
the proposal, and Apply accepts through the session owner. The duration enclosure
and exact Working sessions input remain intact. #758/#770, #771, #772 and #773
keep creation, participant changes, attached companions and removal/recovery as
separate increments.

### Session detail deck inside Plan overview

[#789](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/789)
implements one compact, nonmodal **Session detail deck** between the period board
and Session tracks, within the existing instrument housing. It extends the Studio
Rack, Period Kanban, Support Matrix and Contextual Inspection contracts. This
supersedes #768's below-rack placement for the horizon. Team planning retains its
adjacent receiver and borrows the same canonical form.

The selected clip can read like a loaded tape. Its name, team and visible
selection connect the board to the deck; the selected sprint/quarter and Plan
overview return remain above both. Repeating the exact triggering control or
choosing Close hides the deck and restores that origin. Close retains the raw
proposal and edit lease, Cancel reverts it and Apply accepts through the current
owner. A different occurrence selects its placement while the deck stays open.
Selecting different work uses the existing saved-draft coordinator. The deck
opens only while an item is being inspected, keeping
the initial overview compact.

| Deck area | Direct operation and retained meaning |
| --- | --- |
| Session identity | Rename the selected work and choose its team in a compact tape-like header |
| Duration | Reuse the enclosed Hours/Minutes module; duration applies to every occurrence of this session |
| Working sessions | Numbered occurrence pads choose one repetition; the exact count and Add occurrence change this work's repetition count |
| Placement | Select one occurrence, then its sprint/quarter and Week 1/2 or Month 1/2/3 through native radio pads; Unplaced keeps a repetition available for later placement |
| People | Independent inclusion switches on named participant tracks; explicit Move up/down changes their order |
| Acceptance | Retain the existing proposed amount, Apply, ghost Cancel and Close meanings |

One ordered `personIds` collection and one duration currently apply to all
occurrences. People controls therefore describe participation in the session;
per-occurrence placement pads describe where each repetition happens. Native
checkboxes own independent inclusion; native radios own exclusive period and
subdivision choices. A people-by-occurrence matrix would require a separate
membership model. #771 retains its broader movement and percentage work; the
deck uses the current ordered participant collection and reorder operations.

`cadence-view.mjs` preserves a stable deck slot while refreshing the board and
tracks around it. `mountRackEditor` in `rack-controls.mjs` lends canonical nodes
to this slot or an adjacent host. `work-controller.mjs` remains the one form,
draft and acceptance owner. `session-occurrence-controls.mjs` presents a bounded
page of numbered pads and native placement choices through that owner's setters.
The view keeps occurrence selection local; Add occurrence edits the existing
count through the draft. Mobile stacking preserves reading order, exact fields
and visible Close. A redraw preserves the live controls and their input state.

The evidence supports this composition choice within a bounded transfer:

- [Ableton Clip View](https://www.ableton.com/en/live-manual/12/clip-view/) keeps
  properties and content tied to the selected clip while arrangement context
  remains available. The Studio adopts this selection/detail relationship and
  tape treatment; visitor comprehension still needs a focused walkthrough.
- [WAI disclosure guidance](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
  supports the trigger's open/closed cue and keyboard activation. Native controls
  retain their ordinary semantics inside the deck.
- [WAI modal-dialog guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
  requires an inert background and contained keyboard focus for a modal overlay.
  Existing draft switching already protects unfinished work, so the first deck
  stays nonmodal. A later compact variant may replace the sequence presentation
  within the rack, with covered controls genuinely hidden from interaction.

The approved delivery sequence is #789's existing-session deck, #758's useful
creation defaults and Undo, then #770's contextual empty-space entries. #777's
repair in PR #793 supplies current People/Investment browser entry points;
runnable source remains the behavior authority. #758 supersedes the rack's
draft/confirmation entry with direct accepted creation and contextual editing.
Add occurrence continues to change only the selected session's draft count.
#773 supplies the separate shared recovery surface.
The deck's receiving PR records focused retained-draft, placement, participant,
return and stable-slot observations at phone/laptop widths; this design decision
alone establishes no browser result.

### Direct arrangement selection

[#766](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/766)
replaces the separate Apply arrangement step. A deliberate reel selection
updates one current arrangement instance and supports Undo. Re-selecting the
same configuration changes nothing; A → B → A revises that instance rather than
accumulating generated teams and sessions. Unrelated and shared records retain
their identities and references.

The focused replacement owner prepares one complete change before acceptance.
It updates records owned by this arrangement and preserves unrelated and shared
records with their references. When a changed record is shared, a compact local
choice can keep that record and use separate replacement records within the same
arrangement instance. The earlier append-oriented template API keeps its own
compatibility boundary.

Text customization settles on field exit or Enter; bounded selections settle
immediately. Invalid entries remain locally correctable. Repeated unchanged
choices leave history intact. Local Undo is bound to its accepted change and
retires after another edit; Investment retains full Undo/Redo recovery.

The rack's amount comes from the existing projection of its distinct linked
sessions. The amp retains the whole-plan amount. After direct acceptance, use
current structure and Included work wording. The initial illustration precedes
the first deliberate selection and leaves accepted state intact. Preserve the
editorial card styling and use proposed wording for an actual pending proposal.
Existing raw edits remain recoverable through the coordinator. This exception concerns arrangement choices; ordinary session and
person field editing retains its acceptance boundary.

## Duration and rate modules before editor placement

[#767](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/767)
groups **Time per person, per session**, the combined Hours/Minutes output and
both dial–field–step groups in one instrument enclosure. The larger readout sits
above both dials. Hours retains its larger primary dial; Minutes has a smaller
dial. #788 makes Hours peach and Minutes paper, removes their inner borders,
and shares the monetary coarse/fine dial sizes, face inset and pointer. This
supersedes the earlier peach Minutes treatment. Each exact field and circular step
pair sits toward its dial's lower right. The gap between circles and their
start/end alignment beneath the input remain recognizable.

The two units share a row when space permits and reflow within the same enclosure
at phone widths. **Working sessions** stays nearby as a separate repetition
control. #789 adds numbered occurrence selection and an Add occurrence action
inside the detail deck while keeping the exact count available. Duration changes
every occurrence's length; adding an occurrence and adding a different session
retain their distinct operations.

`studio-quantity-module` supplies the shared housing grammar. `studio-duration`
contains the duration composition; existing rate hosts use the same skin around
one named exact amount, $10/$5 dials and $1 steps. The shared instrument stylesheet
owns enclosure geometry, with the former About duration layout reconciled into
that owner. The main About session markup and dynamic `time-controls.mjs` factory
use the same grouping. Their output associations, dial artwork, fixed light,
gesture handling and Apply/Cancel behavior retain their existing owners.

The in-rack deck and adjacent receivers use this enclosure intact. The retained-value
repair from #761 remains the gesture contract, and the receiving #767 PR carries
focused layout and value agreement evidence.

## Attached editorial companions

[#772](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/772)
preserves **People and available time** and **Stages & handoffs** as compact
editorial sub-racks attached to the instrument's lower edge. Their pale skin,
short summaries and existing spring reveal provide a useful visual counterpoint.
The initial view stays collapsed; an open companion can host its own rack.

Map each useful operation to both an in-rack entry and the existing editorial
route: people/availability, stages, handoffs, decisions and delays. Both entries
select the same record and editor. Keep clear onward routes to People alongside
local operations, with the current destination cue and recoverable return.
Preserve `cadence-view.mjs` content, `score-controller.mjs`'s retained flow
disclosure/inspector and `motion.mjs`'s disclosure owner during composition.

## Scoped removal with nearby recovery

The [removal research](../../collaboration/native-investment-studio/removal-recovery-research.md)
compares five patterns and recommends a quiet rose Remove control with an
explicit object/scope. The first #765 increment moves the existing
`native-control--remove` skin into the shared instrument stylesheet unchanged.
The proposed visual refinement and recovery behavior remain with #773.
Routine recoverable accepted removal
can have a concise rack-local result and named Undo; meaningful linked effects
receive a compact adjacent consequence choice. Existing membership and
cadence/stage/handoff drafts retain Apply/Cancel. Direct Team arrangement
selection keeps the separate immediate-acceptance route in #766.

[#773](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/773)
owns the Coordination example and its later approval-based spread. A compact
amp **Undo (n)** control exposes the existing global history across chapters;
its count is recoverable accepted changes, distinct from Saved edits. It acts
on the latest accepted change and identifies that target. Local Undo identifies
the exact removal; an intervening change retires that shortcut rather than
reversing an unrelated edit under its label. Reuse current history, reference
guards and edit-parking owners. Existing reference checks remain until an
explicit relationship-preserving transaction earns their replacement. Human
review of the Coordination example releases adaptation of removal controls to
other chapters. This adds recovery to shared Add/remove controls without
expanding the first style PR into a deletion-model rewrite.

## Focused delivery route

| Issue | Owns | Receives / prepares |
| --- | --- | --- |
| [#765](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/765) | Shared session controls (#775), permanent Team planning and secondary rack (#778) | Complete; supplies shared control and enclosure ownership |
| [#779](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/779) | Editorial delivery board combining teams, sessions and handoffs | Delivered in #781; supplies phase scope and the combined reading |
| [#766](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/766) | Direct arrangement update, included-work reading and Undo | Delivered in #783; supplies stable accepted identity before adjacent editors |
| [#767](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/767) | Shared duration/rate enclosures | Delivered in #785; supplies the quantity hierarchy and shared housing |
| [#757](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/757) | Adjacent person/team editor in Coordination | Delivered in #786; supplies canonical placement, retained drafts and local close/return |
| [#768](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/768) | Adjacent session editor from either Coordination rack | Delivered in #787; supplies origin, occurrence and session-draft context |
| [#788](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/788) | Duration skin and shared dial artwork | Delivered in #790; borderless peach Hours and paper Minutes with reusable coarse/fine geometry |
| [#777](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/777) | Current-entry observations for two legacy browser journeys | Delivered in #793 with readout (#791) and editor-restoration (#792) repairs |
| [#789](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/789) | Session detail deck inside Plan overview | PR #794 delivered the stable slot, canonical editor and occurrence/participant controls after independent review |
| [#758](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/758) | Immediate session addition and exact-creation Undo | PR #795 delivered useful accepted defaults, canonical editing and scoped creation Undo after independent review and passing checks |
| [#770](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/770) | Contextual New session rows | Final increment in this sequence: period/subdivision and accepted-person entries reuse #758's owner; its receiving PR owns focused verification and delivery |
| [#771](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/771) | Shared participant movement; separately, scoped percentage semantics | Movement can accompany shared controls; the percentage model remains independent future work |
| [#772](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/772) | Attached editorial companions and equivalent rack entries | Receives the shared shell; prepares contextual editors without changing their draft ownership |
| [#773](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/773) | Scoped removal, amp Undo, then a Coordination local-recovery example | Receives shared controls/history; human review releases cross-chapter removal adoption |

The reviewed #757/#768 implementations supply shared panel placement and session
editing ownership. #789 composes that owner inside Plan overview.
#758 supplies the acceptance/Undo owner and #770 supplies contextual new-record
entries. This completes the current sequence from inspecting a session to
creating one. #771's movement and percentage work, #772's companion shell and
#773's broader removal/recovery remain prospective. Existing-session editing
keeps its draft boundaries. Publication, sticky amp work and general performance
retain their own routes.

The chain review preserves completed #755 (contracts) and #756 (scope navigation)
as accepted foundations. #765’s reviewed composition, #779’s delivery board and
#766’s direct replacement prepare the next receivers. #766 preserves sessions
created through the new entry when arrangements change; #767 supplies the shared
duration hierarchy; #757 supplies the shared placement/return owner used by
#768. A matrix is a permitted receiving composition where
relationships benefit from comparison. #758 creates sessions with useful defaults;
#770 supplies their contextual empty-space entry.
The underlying issue acceptance remains with each receiver.

[#717](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/717)
is a parallel test-quality repair for a standalone zine specimen. Its
viewport/document-position ambiguity remains present, but it has no Studio
runtime dependency and #764's hosted checks passed. If that intermittent
observation blocks this delivery, repair it before continuing the affected
check. Its bounded geometry proof is already specified in the issue.

## Contract and evidence ownership

Extend the existing [six-contract family](../../visual-fidelity-contracts/studio-rack/README.md):
Studio Rack owns shared housing; Period Kanban distinguishes temporal lanes from
the delivery-phase variant; Support Matrix owns participation; Contextual
Inspection owns selected/open/return
behavior; Zoetrope owns arrangement selection; Precision Dials owns quantity
modules. Mark proposed changes as prospective until their receiving PR lands.

Existing instrument manuals and WAI guidance in the
[research record](../../collaboration/native-investment-studio/usability-research.md)
support physical control precedents, exact-entry alternatives, explicit receiver
state and stable geometry. They establish those precedents and access concerns;
visitor comprehension remains a separate observation.

Keep verification tied to the changed operation: one session selected through
both readings, one arrangement replacement/Undo path with a shared-record case,
and one duration-module comparison at phone/laptop widths. Adjacent person/team
editing adds a focused open, switch, retain, accept and return journey through
the canonical controls. Session editing adds occurrence/participation entries,
cross-rack draft retention and the active row's close/reopen operation. Existing source and
gesture checks retain their boundary. Each focused PR receives independent
review, updates current README/journal guidance, and passes its evidence to the
next issue. #789's observations must distinguish retained live form nodes from
replacement controls, exact-trigger closure from another occurrence's selection,
and shared session participation from per-occurrence placement. Team planning's
adjacent entry remains part of the cross-rack draft and return observation.

PR #795 records #758's useful accepted session, its contextual receiver, Cancel
preserving that record, local Undo reversing only the latest creation, and the
guided fallback when people or teams need to be supplied. A later accepted edit
retires the local creation shortcut while preserving global history. #770's
receiving PR observes period/subdivision and accepted-person entry, canonical
editing and Undo, ordinary phone/laptop containment and keyboard/touch access.
Existing gap/dot readings and the People chapter's read-only table remain part
of its scope boundary. The receipt records actual checked behavior.

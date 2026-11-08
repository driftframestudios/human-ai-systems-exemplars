# Contextual Inspection & Recovery

Let a visitor open the work behind a pad, make a small change and return with
their context intact. The selected object remains identifiable while the existing
editor owns its proposal. This contract connects compact disclosures, destination
cues, creation entry, Apply/Cancel and saved work across the Studio.

**Standing:** review candidate `0.1.0`; ID `vfc:contextual-inspection-recovery`;
reviewed 7 November 2026. It inherits [Studio Rack Composition](README.md).
The Abilities rack, Coordination record receiver and Quality workbench are
current examples.

## Fit and smallest useful dose

Use an adjacent inspector when the visual object remains useful context for its
settings. A short disclosure is sufficient for supporting facts. One selected
object, one clearly titled receiver and one return or close action form the
smallest useful reading. Longer manuals and complete ledgers retain their deeper
documentation or report routes.

## Indicate the operation before activation

| Operation | Stable cue and consequence |
| --- | --- |
| Open nearby detail | Caret follows the receiver's open state; expanded semantics agree |
| Inspect another object or view | Arrow and destination wording identify the move |
| Select a persistent view | Pressed state remains visible while selected |
| Add an item or enter guided creation | Plus and Add wording identify the entry |
| Confirm the prepared item | Final Add or Apply completes that draft |
| Close the adjacent editor | Hide its controls, retain its draft and restore the initiating card's focus |
| Cancel edits | Ghost action returns to accepted values, preserving a previously added record |
| Remove a relationship or record | Rose action names its scope and keeps the recovery route clear |

Native `details`/`summary` can own a simple reveal. Enhanced disclosure buttons
use their controlled receiver and expanded state. A caret points toward opened
content only for the active receiver; inactive labels keep the closed cue.
When several controls refer to one inspector, switching its record updates every
related cue. A selected item and an expanded panel retain their separate states.

The [WAI Disclosure Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
describes Enter/Space activation, expanded state and the familiar right/down cue.
The local contract applies that relationship to existing Studio panels while
preserving their compact rack styling.

## Preserve the visitor's work

Ordinary editor proposals retain raw entries until Apply. The accepted amount
stays separate from its proposal. Chapter changes can retain work in Saved edits;
a later accepted change may require review before that saved proposal applies.
Cancel preserves accepted records. Undo/Redo and baseline comparison keep their
own accepted-state meaning.

A creation detour retains its origin and a visible return. Focus returns to a
useful current control. Discarding or superseding the origin retires its return
route. Participant toggles preserve their mounted rows; explicit reorder owns
movement. Nearby reveals keep their context visible, while longer movement yields
to visitor input and settles directly when motion is off or system-reduced.

Long questions and evidence are readable before editing. Empty details offer a
useful next action; accepted previews follow Apply and retain their prior values
after Cancel. The selected object's title stays visible with the form, including
at ordinary phone widths and enlarged text.

## Source and evidence

| Owner or observation | Responsibility |
| --- | --- |
| [Editing coordinator](../../collaboration/native-investment-studio/editing.mjs) and [controller](../../collaboration/native-investment-studio/controller.mjs) | Active editor, saved drafts, chapter routes and creation returns |
| [Session creation](../../collaboration/native-investment-studio/session-creation.mjs), [work controller](../../collaboration/native-investment-studio/work-controller.mjs) and [controller](../../collaboration/native-investment-studio/controller.mjs) | Useful Coordination session defaults, existing acceptance owner, contextual opening and local Undo bound to the accepted creation state |
| [Work controller](../../collaboration/native-investment-studio/work-controller.mjs), [cadence view](../../collaboration/native-investment-studio/cadence-view.mjs) and [rack controls](../../collaboration/native-investment-studio/rack-controls.mjs) | Canonical session form in Plan overview's stable deck or Team planning's adjacent receiver, with identity and visibility mirrored into both readings |
| [Rack controls](../../collaboration/native-investment-studio/rack-controls.mjs), [team controller](../../collaboration/native-investment-studio/team-controller.mjs) and [assembly controller](../../collaboration/native-investment-studio/assembly-controller.mjs) | Canonical person/team controls move to one adjacent receiver; existing owners retain draft and acceptance state |
| [Motion](../../collaboration/native-investment-studio/motion.mjs) | Local indication, disclosure settling and interruptible destination reveal |
| [Capability](../../collaboration/native-investment-studio/capability-controller.mjs), [Change](../../collaboration/native-investment-studio/change-controller.mjs), [Assurance](../../collaboration/native-investment-studio/assurance-controller.mjs) | Selected records and their local receivers |
| [Abilities CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-abilities.css), [Change CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-change.css), [Assurance CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-assurance.css) | Adjacent rack, track controls and workbench composition |
| [Shared instrument CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-instrument.css) | Named adjacent editor enclosure, record-key states and contained phone layout |
| [Editing source checks](../../tests/native-investment-studio/editing.test.mjs) and [shell browser checks](../../tests/native-investment-studio/shell.browser.mjs) | Draft identity, saved work and chapter transitions |
| [Capability](../../tests/native-investment-studio/capability.browser.mjs), [Change](../../tests/native-investment-studio/change.browser.mjs), [session](../../tests/native-investment-studio/session.browser.mjs) browser checks | Selected receivers, caret state, creation returns and retained input |

The [research record](../../collaboration/native-investment-studio/usability-research.md#12-make-a-stages-creation-entry-a-complete-task)
connects observed creation ambiguity to named new-record status, confirmation
and return focus. Its earlier broad layout proposals remain historical; the
[current journal](../../collaboration/native-investment-studio/experience-journal.md#current-working-contract)
defines the accepted compact experience. Browser checks establish specific
operation and geometry; human walkthrough establishes whether the cue is clear.

## Re-entry and future scope

The first [Coordination control increment](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/765)
makes session keys in both racks agree about the selected record and open
receiver. `readReceiver()` supplies the editor's identity, visible open state and
element ID; the shared synchronizer updates the controls in place. The transient
last-click effect retains its presentation role. Closing or hiding the receiver
restores its closed caret while preserving any separately retained selection or
draft. Session-settings wording and `aria-controls` identify the canonical
receiver supplied by #768 and placed inside Plan overview by #789.

Team planning is a permanent section. Its arrangement reel and secondary rack
remain available while selection opens the existing template, connection or
session receiver. Arrangement selection accepts directly through its own
transaction and local Undo. The shared coordinator keeps other unfinished
editors recoverable; persistent visibility remains separate from editor activity. The delivery board's phase keys select a local
presentation scope; Delivery overview restores the originating phase key and
scroll position. The controller preserves that phase while its view rerenders.
People and accepted-team cards open their canonical adjacent editor;
illustrative teams awaiting acceptance retain template customization. Handoff
cards retain their connection receiver; session cards use the adjacent session
receiver. Remaining attached
disclosures keep the spring reveal.

The selected session key's downward caret reports actual visibility; its pressed
face retains the selected record after closure. The exact initiating horizon
control or Team planning row key toggles the receiver; Team planning delivery
cards and participation pads inspect their context. A different occurrence or participation entry selects its
own context. The same session owner receives each entry and keeps its draft
identity across the horizon deck and Team planning's adjacent receiver.

The adjacent [person/team receiver](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/757)
places one `studio-rack-editor` after the stable Team planning template or
accepted-connections root, outside the template form and rebuilt board.
`mountRackEditor` moves the canonical configure/status nodes into that
host. The same controls return to People when the chapter changes. Their
existing controllers continue to own validation, drafts and acceptance.

The selected `studio-record-key` stays pressed while its caret reports visible
open state. Selecting that trigger again or choosing Close hides the receiver,
retains raw entries and the same draft token, and returns focus. Cancel discards
the proposal and closes the receiver. Logical object, rack and phase identity
recover the originating focus target when a board rebuild replaced its element.
Apply accepts through the current owner and keeps the editor open. Switching
records parks the unfinished proposal; resuming it acquires a fresh edit lease.
Inclusion and reorder controls retain their existing meanings.

The dark heading, named object and Close sit above a peach editorial body.
The person's rate enclosure retains the shared quantity skin and exact controls.
The [session receiver](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/768)
established this return grammar with the enclosed duration module: larger
readout above peach Hours and secondary paper Minutes, with repetition separate
nearby. #789 extends its placement owner into the horizon while Team planning
continues to use the adjacent host. Each route preserves its period/occurrence or
participation context. A failed switch keeps the admitted record and its panel
identity aligned.

### Session detail deck inside Plan overview

[#789](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/789)
places a **Session detail deck** inside Plan overview, between its period board
and Session tracks. This supersedes #768's below-rack horizon placement while
preserving Team planning's adjacent receiver. The
[composition decision](../../planning/context-canvas/studio-coordination-rack-consolidation.md#session-detail-deck-inside-plan-overview)
defines the stable receiving slot and issue order.

A tape-like selected clip identifies the record loaded into the deck. The session
name, current period and Plan overview return remain identifiable. The exact
initiating control toggles its deck; Close returns focus to that control and
retains raw entries and the edit lease. Another occurrence changes the inspected
repetition while the form stays open. Apply accepts through the current owner;
Cancel reverts its proposal. One canonical form, one session owner and one edit
lease receive all entry points. The stable deck slot preserves live controls
through board/track refreshes and cross-rack navigation.

The deck uses the enclosed duration module, numbered occurrence pads and named
participant tracks. Native period and week/month radio pads place the selected
occurrence. Add occurrence changes this session's count through its draft owner;
the exact count remains available. Unplaced retains the repetition for later placement.
Participant switches independently include people for the session as a whole;
Move up/down alone changes their order. The current shared duration and ordered
membership apply to every occurrence. Quality's track-selection matrix supplies
the preferred compact skin, while each control retains this receiving meaning.

[Ableton's Clip View](https://www.ableton.com/en/live-manual/12/clip-view/)
provides a selected-record detail precedent. The Studio deck applies
that relationship through enterprise session labels and native controls. The
first deck remains a nonmodal disclosure: the existing coordinator retains
unfinished edits during selection changes. A blocking overlay would require
the inert background and contained focus described by the
[WAI modal-dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
This recommendation preserves context and existing switching behavior; a visitor
walkthrough determines how clearly the tape/deck metaphor reads.

#758 accepts a useful session directly from Coordination rack Add controls and
opens this same canonical editor. The new record survives cancellation of later
draft edits; the local creation Undo has its own accepted-state boundary.
#770 composes that owner into contextual New session rows. The repaired #777 browser routes supply
current cross-chapter entry points. #771 retains broader participant movement
and percentage semantics; the deck uses the existing inclusion and order owner.
Phone reflow retains the title, exact fields, independent inclusion and visible
Close. The receiving PR records the actual retention, placement, return and
geometry observations; the contract describes their intended meaning.

### Other contextual receivers

An adjacent receiver remains useful where the parent reading should stay intact.
Use Quality's selection matrix when people or support relationships benefit from
comparable rows and pads; use a simpler pad group for a short independent choice
set. Keep the selected object's name and Close/Return above its local controls.

The planned [editorial sub-racks](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/772)
are another permitted receiver. People and available time
and Stages & handoffs are to attach visually beneath the main instrument while
keeping their readable card skin and existing spring disclosure. Their actions
also have meaningful in-rack entries: a person, session or relationship remains
the identifiable object before its editor opens. Review availability stays a
local inspection; Person settings keeps its explicit destination when it opens
the People chapter. Both paths use the existing owners and preserve return
context, instead of maintaining separate copies of a form.

The [direct Team arrangement selection](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/766)
has its own immediate acceptance and local Undo boundary. Its stable arrangement
identity keeps accepted record routes useful across choices. Bounded customization
choices settle immediately; text settles on blur or Enter, with invalid entries
retained for correction. Local Undo is bound to the arrangement change that
created it; a later accepted edit retires the shortcut. Investment continues to
own the complete history controls. Existing person, session and other editor
proposals retain their current Apply and recovery owners.

[Immediate addition followed by editing](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/758)
gives Coordination rack Add session a useful accepted starting point: one planned
30-minute occurrence with extra-investment funding. The initiating period and
team/person context inform the record. The canonical deck or adjacent editor
then receives that accepted identity. Cancel reverts its later editing proposal;
Close retains it. A plan needing a team or person uses guided creation.

**Undo session addition** is available while creation remains the latest accepted
change. It parks unfinished edits before reversing the addition through shared
history and closing the removed record's editor. A later accepted change retires
that local shortcut. Investment retains complete Undo history. This preserves
the distinction between recovering creation and discarding an editing proposal.

The [contextual creation rows](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/770)
reuse that owner with a native New session row in both Coordination sequencers.
Horizon buttons retain their named period/subdivision; Shared sessions buttons
retain an accepted person's identity. Proposed team structures remain with the
arrangement owner. The outlined button, plus and Add session label are visible
before interaction; fine-pointer hover adds ghost-pad emphasis, and keyboard
focus/touch retain a direct entry. Existing occurrence gaps, participation dots
and the People chapter's read-only table keep their current behavior. Each
receiving PR owns the scoped focus, retention and recovery observations for its
actual controls.
Revisit this contract when a control changes operation, its receiver moves or
recovery changes.

### Planned removal and Undo

The [removal and recovery research](../../collaboration/native-investment-studio/removal-recovery-research.md)
defines the Coordination-first prototype in
[#773](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/773).
A routine recoverable removal of an
accepted item takes effect directly and returns a concise local status with a
named Undo action. The removed object and scope remain clear. That action is
bound to the removal's history identity; a later edit retires the local shortcut
instead of letting stale Undo reverse unrelated work. The existing history
remains the recovery owner, with recovery available beyond a timed message.

When removal affects related records or is irreversible, a compact
adjacent consequence choice explains the effect before acceptance and uses the
current relationship owners. The ordinary route preserves shared records and
their independent meaning. Closing a panel, cancelling a proposal and toggling
draft participation retain their own behaviors. The proposed rose-outline
control and local Undo receive human review in Coordination before reuse across
the other chapters.

The same proposed recovery route adds a compact `native-amp-control` **Undo (n)**
when accepted changes can be undone. The count describes available history,
distinct from Saved edits. One activation undoes the latest accepted change
through the shared history action and its draft-retention behavior; Investment
and local Undo use that same owner. A short cue names the latest change when
owned action metadata supplies it, otherwise **Latest plan change** is the
truthful fallback. After its first appearance the control keeps a stable place
and shows its unavailable state at zero; a compact Redo neighbor may appear when
available. The amp retains its concise control row rather than exposing a ledger.
This is prospective scope in #773; the current amp remains unchanged until its
reviewed implementation lands.

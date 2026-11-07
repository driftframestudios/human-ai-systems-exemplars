# Contextual Inspection & Recovery

Let a visitor open the work behind a pad, make a small change and return with
their context intact. The selected object remains identifiable while the existing
editor owns its proposal. This contract connects compact disclosures, destination
cues, creation entry, Apply/Cancel and saved work across the Studio.

**Standing:** review candidate `0.1.0`; ID `vfc:contextual-inspection-recovery`;
reviewed 7 November 2026. It inherits [Studio Rack Composition](README.md).
The Abilities adjacent rack and Quality workbench are current examples.

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
| Begin creating an item | Plus and Add wording identify the entry |
| Confirm the prepared item | Final Add or Apply completes that draft |
| Cancel edits | Ghost action returns to accepted values |
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

Raw entries remain with the selected editor until Apply. The accepted amount
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
| [Work controller](../../collaboration/native-investment-studio/work-controller.mjs) and [rack controls](../../collaboration/native-investment-studio/rack-controls.mjs) | Session editor identity and visibility mirrored into the mounted controls in both Coordination readings |
| [Motion](../../collaboration/native-investment-studio/motion.mjs) | Local indication, disclosure settling and interruptible destination reveal |
| [Capability](../../collaboration/native-investment-studio/capability-controller.mjs), [Change](../../collaboration/native-investment-studio/change-controller.mjs), [Assurance](../../collaboration/native-investment-studio/assurance-controller.mjs) | Selected records and their local receivers |
| [Abilities CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-abilities.css), [Change CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-change.css), [Assurance CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-assurance.css) | Adjacent rack, track controls and workbench composition |
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
draft. Session-settings wording and `aria-controls` identify the existing remote
editor. Adjacent-panel wording begins when the adjacent panel is mounted.

Team planning is a permanent section. Its arrangement reel and secondary rack
remain available while selection opens the existing template, connection or
session receiver. The template controller retains its preview, Apply, Cancel
and edit-retention ownership; the section's persistent visibility is separate
from which editor is active. The delivery board's phase keys select a local
presentation scope; Delivery overview restores the originating phase key and
scroll position. The controller preserves that phase while its proposal view
rerenders. Team/member, handoff and session cards route to the existing editors
for those records. Remaining attached disclosures keep the spring reveal.

The selected session key currently opens or travels to the remote receiver.
Its downward caret reports actual visibility; it does not yet imply a second
click closes an adjacent panel. #768 owns that future open/close behavior when
the session editor moves into the rack. This composition prepares those later
receivers while current editors continue to own their drafts.

Adjacent [person/team panels](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/757)
and [session panels](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/768)
are future Coordination-first receivers. Both follow the shared
[duration and rate enclosures](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/767).
A session opened from a period occurrence carries that occurrence context; a
session opened from Shared sessions carries its people context. Each path is to
reveal one existing session editor and retain an origin for close and return.

The receiver may swing open as its own rack directly beneath the parent. Use
Quality's track-selection matrix when the selected object's people or support
relationships benefit from comparable rows and pads; use a simpler pad group
for a short independent choice set. Keep the selected object's name and a
clearly named Close/Return above the local controls. A visitor can add a session,
open its adjacent duration module, adjust it, then close or return to the same
period/people context. Closing and Cancel retain their distinct proposal rules.

The planned [editorial sub-racks](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/772)
are another permitted receiver. People and available time
and Stages & handoffs are to attach visually beneath the main instrument while
keeping their readable card skin and existing spring disclosure. Their actions
also have meaningful in-rack entries: a person, session or relationship remains
the identifiable object before its editor opens. Review availability stays a
local inspection; Person settings keeps its explicit destination when it opens
the People chapter. Both paths use the existing owners and preserve return
context, instead of maintaining separate copies of a form.

The planned [direct Team arrangement selection](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/766)
has its own immediate acceptance and Undo boundary. The existing person, session
and other editor proposals continue to use their current Apply and recovery
owners. [Immediate addition followed by editing](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/758)
remains a separate future creation decision. The
[blank-space entry](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/770) reveals
the same named Add control on pointer hover or keyboard focus and retains a
visible touch route. The created item becomes identifiable in its parent rack;
an optional adjacent edit keeps that origin available. These planned panels need
their scoped receiver and focus/recovery observations before their delivery is claimed.
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

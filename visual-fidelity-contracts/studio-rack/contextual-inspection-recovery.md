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

A [common panel that swings open inside or below the rack](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/757)
remains a future design decision. [Immediate addition followed by editing](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/758)
is also a future change to the current draft/confirmation boundary. Each needs a
scoped receiver, explicit default record and recovery decision before
implementation. Preserve current editors and acceptance while those alternatives
are defined. Revisit this contract when a control changes operation, its receiver
moves or recovery changes.

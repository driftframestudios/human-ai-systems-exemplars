# Native Studio: usable controls, clear pathways, and calm recovery

Visitors should be able to assemble an investment plan, understand what each
control does, and return from a correction with their work intact. This record
turns five bounded research questions into decisions for the native Studio and
keeps the remaining showcase work visible.

The source observation checkpoint is `cf16539`, the native patch-bay candidate.
The observations below come from its controllers, About markup, and package
README. They establish implementation mechanisms and available routes. Visitor
research and a receiving-browser observation are separate evidence. **Current
repair** names the receiving change's scope; its completion belongs to that
change's review and verification return.

Read the [package README](README.md) for the practical entry and local preview,
the [experience journal](experience-journal.md) for state, role, styling, and
experiential decisions, the [implementation reference](implementation-reference.md)
for accepted-state and draft ownership,
the [About source](../../context-canvas-project-surface/context-canvas/index.html)
for the visitor composition, and the
[ASCII Zine Field](../../visual-fidelity-contracts/ascii-zine-field.md) for the
new visual family. The repair keeps semantic HTML, CSS, and vanilla JavaScript
as the receiving architecture.

## Decisions and evidence

The sources were consulted on 2026-11-05. W3C specifications and guidance
establish semantic and accessibility boundaries. Official design-system
guidance supplies practiced design patterns. A **source observation** names
what the repository does at the checkpoint; a **supported inference** connects
evidence to this Studio; a **local decision** states the chosen behavior. The
observations under each decision are proposed checks, not recorded passes.

### 1. Make an action look and read like an action

**Decision.** Establish a small control family whose shape, wording, and state
make the next operation understandable before activation.

**Evidence and limits.** The
[WAI Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)
distinguishes ordinary, toggle, and menu buttons and recommends matching a
control's appearance to its function. The
[Disclosure Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
describes a separate reveal operation and its expanded state. These support
distinct visual treatments with truthful native semantics. They leave the
Studio's palette and exact dimensions to local design. GOV.UK's
[button guidance](https://design-system.service.gov.uk/components/button/)
reserves strong warning treatment for serious, hard-to-reverse actions and
requires consequence-bearing text alongside color. This qualifies the use of
destructive styling for the Studio's reversible changes.

**Source observation.** Selectors such as the contribution category, disclosure
headings, list selection buttons, movement controls, and commitment buttons
share close visual neighbors. `assembly-controller.mjs` labels plan deletion
“Remove person”; `responsibility-controller.mjs` labels removal of an output
record “Remove contribution.” These operations have different human meanings.

**Implementation decision.** Use inset native field controls, a recognizable
disclosure row, raised action buttons, compact movement controls, and a rose
removal treatment with explicit scope. Buttons within an action group share a
practical height and minimum width; long labels wrap. “Remove from plan” names
the person's modeled relationship. Team or session membership uses its own
relationship wording. “Dequeue” fits an actual queue; this plan has people,
teams, and sessions. Keep the existing confirmation and dependency information
useful, with Undo available after an accepted reversible change.

**Focused observation.** At narrow and desktop widths, identify each control's
job from its label and appearance, operate it by keyboard, and inspect its
accessible name. Check forced colors and a long label. A selector that looks
like the adjacent Apply button, an icon-only removal, or a name that conceals
the affected relationship challenges this decision. Global identical button
widths remain an optional composition choice rather than a claimed standard.

### 2. Keep people in place while membership changes

**Decision.** A membership toggle changes participation and state styling while
the person's row stays in its current place. Deliberate reorder actions own
ordering changes.

**Evidence and limits.** WAI's
[On Input guidance](https://www.w3.org/WAI/WCAG22/Understanding/on-input)
supports predictable effects from form input and distinguishes content updates
from changes of context. Its
[Focus Order guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)
supports meaningful, operable keyboard sequences. Preserving spatial context
is a supported inference from this guidance. **Exact row stability is the
human's explicit requirement; WCAG does not prescribe pixel-stable cards.**

**Source observation.** `work-controller.mjs` and `assembly-controller.mjs`
construct selected people first, followed by available people. They add
movement controls only to selected rows. A checkbox toggle therefore changes
order and may change row height. Supporting-session choices in
`responsibility-controller.mjs` and `connection-controller.mjs` use the same
selected-first pattern and need the same interaction review.

**Implementation decision.** Keep membership separate from display order.
Retain a readable row and checkbox for every available person, reserve the
necessary control space, and use a written participation state plus subdued
decoration. Reuse mounted rows while updating their membership state; this also
keeps the operated checkbox available for focus. Explicit Move up/down can
change order and should make that consequence visible. The accepted plan and
the draft coordinator retain their existing ownership.

**Focused observation.** Record row order and rectangles, deselect and reselect
a middle person, then compare at the same viewport. Keep focus on that person's
checkbox and Apply only the intended membership change. A row shift, lost
focus, or changed neighboring membership falsifies the behavior. Repeat once
in the team editor and once in a session. Responsive reflow, new people, and
explicit reordering are separate causes of legitimate geometry changes.

### 3. Create a missing prerequisite and return to the unfinished task

**Decision.** Keep Coordination's visual entry while offering a concrete route
to create the people or teams needed by the current task.

**Evidence and limits.** Carbon's
[empty-state guidance](https://www.carbondesignsystem.com/building-blocks/core/patterns/empty-states)
supports contextual explanations and an actionable next step where data is
missing. It also recognizes the cognitive cost of excessive guidance. GOV.UK's
[checkbox guidance](https://design-system.service.gov.uk/components/checkboxes/)
reports that complex conditional questions confused participants in its
screen-reader research; this bounds the appeal of nesting a complete creation
workflow inside a field. Neither source selects a modal, page, or inline editor
for this Studio. Reusing its existing owner is a local architecture decision.

**Source observation.** Session and connection team selectors list existing
teams. Contribution human selectors list existing people and an Unassigned
option. Template proposals already create teams atomically: the “Create a
team” choice exposes a team name and member selection, and Preview followed by
Apply publishes the arrangement. The choice itself performs no creation.
Template people and selected supporting sessions come from existing records.
The template can also create an optional review session within its atomic
proposal, with its own team, participants, duration, count, funding, and status.

**Implementation decision.** Put “Create a team” beside the dependent chooser,
“Add a person” beside a participant or human assignment field, and “Add a
session” beside supporting work. Open the existing creation
editor, keep the source draft recoverable, and supply a visible return action.
After acceptance, the newly created record becomes available to that source
task. The return explains that the visitor reviews the saved entries and chooses
the added record. It preserves that explicit assignment decision and names
when the draft needs review against the updated plan. For template proposals,
explain the name → people → preview →
apply sequence beside the chooser. Creating a team there remains part of one
atomic arrangement, with its proposed status visible until Apply.

Restore focus to the exact originating chooser after any required stale-draft
review. A connection's new receiving person has a separate route to its
receiving-team editor, with ordinary Apply before that person becomes eligible
for selection. Discarding the source draft or replacing it with a state that
loses the source retires its return route. Created-record messages resolve the
current accepted label and existence so Undo leaves the message truthful.

**Focused observation.** Begin a session, enter a name and duration, create its
missing team, and return with those entries retained. Complete the session
using the keyboard. Repeat the return from each connection endpoint, including
cancellation. The route fails if the original draft disappears, the created
record is unavailable, or the visitor must infer where to continue. Template
creation gets its own observation: choosing “Create a team” must make the next
required entry and later acceptance step understandable.

### 4. Give collapsed details a useful preview

**Decision.** Show the few accepted facts that help a visitor choose whether to
open a section, with a clear invitation when those facts are still unspecified.

**Evidence and limits.** GOV.UK's
[details guidance](https://design-system.service.gov.uk/components/details/)
supports descriptive disclosure labels and keeps essential information visible.
Its [summary-list guidance](https://design-system.service.gov.uk/components/summary-list/)
supports concise key facts, scoped actions, and a route to enter missing
information. These patterns support factual previews; they do not establish
which facts this Studio's visitors will find most useful. That selection is a
local hypothesis to revisit after use.

**Source observation.** Person settings and role details have compact headings,
while their accepted values appear deeper in the editor. Purpose already
previews the changed ability. Session and connection editors provide selected
context, making them useful precedents for the People chapter.

**Implementation decision.** Use previews such as “$120/hour · 8 funded hours”
and “Research · Reviews evidence.” Empty summaries offer “Add rate and funded
time” or “Add role details.” Keep the person or object name stable. Accepted
facts remain distinct from saved edits and unfinished input; a draft marker
can explain why reopening matters. The summary stays one disclosure control,
with editing actions inside its expanded content. Long previews wrap within
their panel.

**Focused observation.** Inspect populated and empty collapsed sections, then
edit, Apply, Cancel, and reopen. Accepted previews should follow Apply and keep
their previous values after Cancel. A preview that silently promotes a draft,
hides the identity, or requires opening solely to discover that it is empty
challenges this implementation. Recheck with a long person name and narrow
layout.

### 5. Give ASCII styling an accessible semantic foundation

**Decision.** Add zine character through authored texture, typography, and
annotation while ordinary HTML continues to carry meaning and interaction.

**Evidence and limits.** W3C's
[Technique H86](https://www.w3.org/WAI/WCAG22/Techniques/html/H86)
explains that ASCII art can be confusing when read as punctuation and supplies
ways to give meaningful art an equivalent text alternative. Techniques are
examples of satisfying accessibility requirements, rather than mandatory
implementations. H86 establishes an accessibility boundary; it supplies no
evidence that a particular visual style is more attractive or usable.

**Source observation.** The amp-head composition already has meaningful
headings, native controls, and a diagram/list relationship. It can receive a
small ornamental layer without taking over those jobs.

**Implementation decision.** Use the
[ASCII Zine Field family](../../visual-fidelity-contracts/ascii-zine-field.md)
for mastheads, amp labels, section rules, field-note cards, patch annotations,
recovery slips, stamps, and restrained weaves. Decorative punctuation is hidden
from assistive technology. Meaningful art has an equivalent ordinary-text
description or appropriate named image role. A real quantity retains its
values, units, and semantic companion. “Saved,” “ready,” and similar stamps
come from actual application state. Decoration may crop or disappear on narrow
screens while labels, controls, and evidence remain available.

**Focused observation.** Read the Studio with its decorative layer removed,
inspect the accessible tree, and check narrow width, forced colors, and reduced
motion. The task remains complete and the art contributes no punctuation noise
or fabricated state. Then compare the rendered composition for useful texture,
legible hierarchy, and breathing room. A visual comparison can assess the
composition; visitor preference remains an open observation.

## Task-focused audit and receiving work

This map follows a visitor's work. **Implemented at checkpoint** means that the
named source provides the capability. **Current repair** means the capability's
usability is receiving attention in this change. **Carry forward** names a
specific further receiver; it remains visible even when the current repair
provides a useful first route.

| Visitor task | Checkpoint capability and source | Current repair or carry-forward effect |
| --- | --- | --- |
| Enter the Studio and choose a chapter | **Implemented:** `controller.mjs` gives Coordination, People, and Investment one shared accepted plan and editor coordinator. | **Current repair:** distinguish chapter/field/disclosure/action controls and retain the visual Coordination entry. **Carry forward:** complete the remaining amp composition in [#647](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/647). |
| Explain the intended change | **Implemented:** `purpose-controller.mjs` edits six purpose fields with Apply/Cancel, accepted preview, and stale review. | Preserve the compact preview and meaning independent of money. Include Purpose when checking that shared button styles and chapter return keep focus and unfinished text usable. |
| Add a person and set funding | **Implemented:** `assembly-controller.mjs` creates a person; `team-controller.mjs` edits rate and funded time. | **Current repair:** contextual Add person route, useful settings preview, distinct action styles, and scope-aware plan-removal wording. A visitor can see why opening settings matters. |
| Create a team and choose members | **Implemented:** assembly commands create teams, preserve ordered membership, and identify references that hold removal. | **Current repair:** stable mounted member rows and an explicit create-and-return route from session and connection fields. **Carry forward:** [#647](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/647) receives direct correction routes from static removal-dependency labels, with retained source context. |
| Describe a working session | **Implemented:** `work-controller.mjs` edits name, team, people, duration, count, funding, and status in one draft. | **Current repair:** create the missing team/person near the field and keep participant geometry stable. Preserve the distinction between draft cost and accepted investment. |
| Describe a person's role | **Implemented:** `responsibility-controller.mjs` edits role and decision fields for the selected person. | **Current repair:** collapsed facts or a specific invitation to add details. **Carry forward:** revisit catalogue wording in actual visitor use; generic simplification could erase useful distinctions. |
| Name human review of a contribution | **Implemented:** contribution records select category, receiving person, deciding person, supporting sessions, and review/decision boundaries. | **Current repair:** distinguish the category selector from Remove contribution, preserve artifact-removal scope, add person/session creation routes with explicit return, and keep supporting-session rows mounted. After any stale review, focus returns to the originating receiving-person or deciding-person chooser. |
| Connect two teams | **Implemented:** `connection-view.mjs` joins diagram, list, and detail; `connection-controller.mjs` edits endpoints, receiver, object, response, work, and status. | **Current repair:** Create team at either endpoint, Add person for the receiver, Add session for supporting work, and stable mounted supporting-session rows. A new receiver can be added to the receiving team through its existing team draft and normal Apply. Return preserves the connection draft and restores its originating chooser after review. |
| Try a coordination arrangement | **Implemented:** `connection-template-controller.mjs` prepares new/existing teams, connections, and optional new review sessions; Preview/Apply publishes atomically. | **Current repair:** explain that new-team choice opens proposed fields, preview team names and members in collapsed groups, and add a missing-person route preserving the arrangement configuration for fresh preview. The existing Add a review session option already supplies an in-context session creation route. Native multiselect instructions remain a focused visitor-use question. |
| Switch chapters with unfinished work | **Implemented:** `editing.mjs` owns one active editor and bounded retained drafts; the saved-edits tray restores the relevant owner. | **Current repair:** explicit returns for session, team, contribution, connection, and arrangement work preserve the owning editor's review/preview boundary. Lost or discarded origins retire their return route; current accepted records determine created-record messages after Undo or replacement. |
| Correct invalid or stale input | **Implemented:** controllers show field diagnostics and current values; review/use-current actions restore an eligible editing lease. | Preserve entered values, local correction messages, and focus. **Carry forward:** [#647](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/647) receives direct corrective routes from static dependency labels. A failed Apply should reveal a next action at the affected field. |
| Undo, Redo, or compare a baseline | **Implemented:** `state.mjs` and `investment-controller.mjs` retain bounded accepted history and one independent baseline. | Preserve these existing recovery routes while restyling. Observe that a prerequisite creation and a later session Apply remain understandable accepted steps; confirm Undo and baseline restore leave saved edits reachable. |
| Load, preview, and download a plan | **Implemented:** `exchange.mjs` previews admitted input and requires explicit replacement; downloads capture accepted state. | Preserve preview versus acceptance, current-plan retention on rejected input, and the explicit Use this plan action. **Carry forward:** broader scenario and export presentation follows the capability owner as native chapters grow. |
| Read with JavaScript unavailable or on a narrow screen | **Implemented:** About owns semantic markup, ordinary vertical reading, and a static counterpart route. | **Current repair:** decoration and control composition preserve the existing reading. **Carry forward:** [#656](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/656) owns static content refresh as the native model expands. |

## Finish the experience, then refine measured pressure

The current repair is complete when the affected task routes, controls, stable
rows, summaries, and zine composition have a fitting source and browser return.
That return should name the observed behavior and remaining scope. It should
keep new implementation claims separate from this checkpoint audit.

The remaining showcase sequence continues through the approved
[design route, #637](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/637):

- [#647](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/647)
  completes native amp controls and visual composition. The zine family supports
  that work while the remaining capability chapters keep their own acceptance.
- [#652](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/652)
  owns quality, recovery, learning, and an explicit professional-play loop.
  Playful progress must describe an actual visitor action or outcome; decorative
  stamps alone establish no achievement.
- [#653](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/653)
  owns the native coordination score, capacity, and decision gates. Scheduling
  requires declared timing and policy inputs beyond today's null timing field.
- [#679](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/679)
  receives relationship-rendering refinements after showcase completion.
  General maximum-population performance work follows measured visitor pressure;
  a reproducible current interaction blockage warrants an earlier focused repair.

Direct correction routes from static removal-dependency labels remain explicit
follow-up work in [#647](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/647).
Their receiver needs
the same complete promise: creation, retained draft, named return, and a usable
next action. A generic navigation link alone establishes only the navigation.

Research stops here because additional examples would repeat the chosen
patterns. The next evidence comes from the implemented visitor tasks and the
smallest browser observation capable of challenging each decision.

## Working rotary control and contextual editor

**Question.** How can the first amp knob make a real session adjustment while
keeping precise entry, ordinary scrolling, and recoverable draft ownership?

**Evidence.** The [WAI slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
describes named values and keyboard operation, and calls for device-specific
attention to touch assistive technology. [WAI technique G216](https://www.w3.org/WAI/WCAG22/Techniques/general/G216)
describes single-point alternatives for slider operation. The
[Pointer Events specification](https://www.w3.org/TR/pointerevents3/)
defines capture, cancellation, and the `touch-action` boundary for direct
manipulation. These sources guide the adapter; they leave its particular rotary
geometry and receiving-device behavior to implementation evidence.

**Decision.** Use a native range for Minutes, bounded to the existing 0–59
field. A pointer adapter maps a 270-degree arc to the same raw session draft.
Keyboard operation stays native; the visible precision field and step buttons
remain ordinary alternatives. The dial owns capture only during its gesture.
Escape or pointer cancellation restores the exact starting raw value; a change
of editor retires the gesture while retaining the draft under its existing
owner. Apply owns acceptance and Undo owns accepted history.

The housing and light remain fixed while the pointer turns. Forced colors
shows an ordinary native range, with the rotary pointer adapter yielding to its
native gesture. Invalid typed values remain visible in the precision field and
temporarily rest the dial. The explanation sits after the quantity inputs so
it preserves their position. The dial leaves wheel behavior with the page.

**Composition.** The shared duration readout, dial, and short help form one
control group above the aligned precision fields. The selected-session editor
uses the same DOM beside the session at wide widths and inline at narrow widths.
Its heading preserves the session's literal name. An Operating manual disclosure
explains the first useful actions and existing funding meanings without opening
a second editor or adding a modal task.

**Fitting observation.** Exercise native keyboard input, precision agreement,
rotary pointer movement and cancellation, invalid-value recovery, editor changes,
Apply/Undo, forced colors, and disposal. Observe reflow and retained focus after
resizing the same editor. The authored pilot supplies an independent $370
consequence for four additional quarter-hours across its three reviewers.
These observations establish those local operations. Touch assistive-technology
acceptance retains a fitting device observation before a public conformance
claim; visible precision and step controls remain part of the shipped task.

## 2026-11-05 — Read the showcase before editing it

**Receiving decision.** #694 receives the annotated laptop review after #693.
Visitors should first understand the people and shared work, then inspect a
compact set of controls. The observed session layout changed its column model
when Settings opened; the whole-plan ledger then occupied a narrow column.
The lens's pressed transform also replaced its centering transform, moving the
target between pointer-down and pointer-up. These are source observations with
specific receiving repairs.

**Evidence and design bridge.**

| Source and standing | Consequence for this surface |
| --- | --- |
| [Shneiderman's original visual-information taxonomy](https://www.cs.umd.edu/~ben/papers/Shneiderman1996eyes.pdf) treats overview, relationships and details as distinct useful operations. | Show the accepted session's people and actual support relations before editing. Keep the exact accounting available below. This is a local adaptation of the taxonomy. |
| [Hornbæk, Bederson and Plaisant's controlled overview study](https://courses.ischool.berkeley.edu/i247/s04/resources/p362-hornbaek.pdf) reports mixed task effects and overhead from switching views in map navigation. | A permanent side-by-side overview is an option, with task-dependent value. The human's observed layout favors a full-width diagram followed by optional details. Map-study results do not establish Studio comprehension. |
| [Nielsen's progressive-disclosure guidance](https://www.nngroup.com/articles/progressive-disclosure/) is practiced design guidance for keeping common work available while deferring secondary features. | Keep accepted investment, named participants and the selected session visible. Put manuals and complete accounting behind clear controls. Readable purpose text precedes its explicit Edit action. |
| [Bringhurst's primary-text excerpt](https://teachinginter.net/reader/typographic-style.html), particularly section 1.2.2, gives textual levels distinct but harmonious forms. | Headings, relation labels, quantities, descriptions and actions receive consistent weight, scale and spacing. Reduce oversized framing and repetition before reducing readable text. |
| [WAI disclosure semantics](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) and [reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) establish operation and reading boundaries. | The amp's buttons synchronize their expanded state with their existing native receivers. Enhanced controls replace the fallback summary's focus stop. Expanded text uses ordinary page scrolling and remains readable with enlarged type. |

**Chosen composition.** Coordination starts with its connection diagram. A
full-width session diagram names the selected participants separately from its
owning team and shows the work records that explicitly reference the session.
The connector words describe participation and planned support. Accepted values
remain visible while a separate editor previews a proposal. Settings and
whole-plan costs expand below without changing the diagram's column model.
Normal vertical expansion remains intentional; pixel-stable page height would
require clipping or another scrolling region.

The amp has a compact Purpose, Saved edits and Operating manual row. Purpose
opens as complete text; Edit begins a draft. Saved edits retain their current
recovery owner. Small exclusive choices use direct native radios. Repeated
quality concepts and rehearsals use a selection rail with one inspected record,
while stable record identity preserves each unfinished entry. The proposed
relationship diagram and rails remain HTML readings when decoration is absent.

**Observation and limit.** The initial pilot's Engineering session includes the
Product lead, Engineering lead and Quality reviewer. Engineer belongs to the
team but is outside that session. Four 30-minute sessions imply six
participant-hours; the whole-plan commitment remains $3,980. A duration draft
keeps that accepted diagram intact until Apply. Browser checks distinguish
that state contract and confirm unchanged diagram geometry across disclosure
operations. Cross-engine screenshots establish the exercised composition;
the human's next walkthrough supplies the receiving usability observation.
Further research did not change this bounded repair. The authored score and
broader visual analysis retain #653 and #654 as their receivers.

## Digital instrument composition — 5 November 2026

**Decision:** carry a shared musical-instrument vocabulary across the native
Studio while keeping selected record, editable parameter, proposed consequence
and accepted investment easy to distinguish. #696 receives composition, #653
receives the horizon, #697 receives arrangement topology, and #698 receives
quality preparation/recovery consequences.

Official manuals describe established interface mechanisms. Their transfer to
enterprise planning is a local design inference; the CRT and restrained retro-game
character are the human's art direction. The following mechanisms change this
implementation, rather than serving as a style inventory.

| Evidence and source class | Receiving design decision | Observable consequence and limit |
| --- | --- | --- |
| [Ableton Push manual: working with racks](https://www.ableton.com/en/push/manual/) distinguishes selecting a pad/device and adjusting its displayed parameters. Official product documentation. | Change component keys and quality pads select one stable inspector. Selected-for-inspection and included-in-plan remain separate states. | Inspect A, edit it, inspect B, return to A: raw entries remain. Plain buttons fit record selection; a tab implementation would carry the complete [WAI tab pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). |
| [VCV parameter commands](https://vcvrack.com/manual/KeyCommands) combine knob adjustment and numerical entry. Official product documentation. | Pair dials with exact inputs and step buttons. Give Hours the larger dial and Minutes the smaller adjacent dial; this size hierarchy is a local choice. | Pointer, keyboard, step and exact entry agree. Invalid text remains available for repair; 23:30 retains its minutes when the Hours control reaches its available maximum. Native ranges and click alternatives retain the [slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) and [dragging alternative](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) boundaries. |
| [Live Arrangement View](https://www.ableton.com/en/manual/arrangement-view/) uses a whole-arrangement overview, visible-region focus and locators. Official product documentation. | Make the coordination horizon an overview navigator, with view scale, named decisions and direct routes to sessions, people and chapters. | View changes preserve accepted serialization and money. A narrow agenda and exact table retain the same authored relative-minute records. |
| [VCV Getting Started](https://vcvrack.com/manual/GettingStarted) exposes connected modules and endpoints. Official product documentation. | Draw named relationships, grouped arrangements and selected paths. | Participates, supports, hands off and depends on remain distinct relations. Signal-flow styling supplies legibility; source-owned planning edges supply their actual meaning. |
| [WAI complex-image guidance](https://www.w3.org/WAI/tutorials/images/complex/) calls for recoverable values, relationships and interpretation. Standards guidance. | Frame the quality reference in a dark CRT-like bezel with crisp trace, thresholds and adjacent exact reading. | Sigma changes update the trace and its reference values. Glow and scanlines remain decorative and restrained; the display continues to name a mathematical reference. |
| [Non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), and [reduced-motion technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html) define relevant access conditions. Standards guidance. | Use inset faces, borders, text and persistent selection marks; brief feedback preserves the hitbox. Keep a quiet resting display and a complete reduced-motion reading. | Focus, selected, disabled and pressed states remain distinguishable in forced colors. Controls and text fit 320 CSS pixels and enlarged text. |
| [VCV Menu Bar](https://vcvrack.com/manual/MenuBar) documents Undo/Redo and saved patches; the Push manual documents Undo after macro randomization. Official product documentation. | Keep the Studio's explicit preview, Apply, Cancel, saved edits and Undo through the instrument treatment. | A 30→45-minute review proposal shows $4,350 while accepted investment stays $3,980. Apply accepts once; Undo restores the preceding plan. |

The main transfer risk is that immediate visual feedback can look like an accepted
commitment. The horizon therefore labels proposed versus accepted readings, and
optional work keeps an explicit funding action. Another risk is that a badge looks
like proof of competence: each support badge must point to planned work, rehearsal
or a scoped observation and retain that evidence standing.

These sources support a bounded implementation and human walkthrough. They do not
establish that the aesthetic improves learning or decision quality for this visitor
population. The next useful observation is whether visitors can identify the
selected record, the parameter they can adjust, the connected work, and the accepted
result without an explanation from the collaborator.

### 11. Make navigation distance and control purpose visible

**Decision.** Express three kinds of movement with different destination cues:
amp chapter selection, a contextual jump to another chapter, and inspection
within the current section. Start with lower motion across the Studio; let the
visitor explicitly request fuller motion beside the lens.

**Evidence and transfer.** The original
[Codrops page-transition source](https://github.com/codrops/PageTransitions/blob/master/css/animations.css)
demonstrates bounded combinations of fade, translation and reveal. It supplies
creative techniques, rather than evidence that a particular animation improves
this Studio's usability. The local interpretation uses a short chapter fade,
a slightly longer contextual reveal and a local inspector emphasis. Destination
labels, focus and static cues carry meaning in the lower-motion presentation.
The W3C's [Animation from interactions guidance](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
supports visitor control over nonessential movement. Its
[Pause, Stop, Hide guidance](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
also applies to automatically scrolling information. A lower-motion preference
and a pause control have distinct jobs.

The [Ableton Push manual](https://www.ableton.com/en/push/manual/) places
parameter displays beside encoders and uses pads with persistent selected
states. This is official product behavior used as composition inspiration.
Our local controls retain ordinary HTML semantics: checkboxes for independent
membership, radios for small exclusive sets, pressed buttons for view choices,
and labeled actions for creation or inspection. A recessed selected key and
an adjacent reading make the parameter relationship visible. A plus mark
belongs to the entry that starts adding an item. The final confirmation uses
the ordinary commit treatment, so it reads as completing the current task.
This distinction comes from the human’s observed ambiguity in the session form.

**Implementation bridge.** The presentation owner cancels active effects when
lower motion, an operating-system preference, a hidden page or disposal requires
it. Motion changes stay outside accepted plan, draft, export and Undo state.
The Abilities matrix exposes responsibility, preparation, review and recorded
observation as separate support questions. CRT styling preserves the exact
normal-reference curve and threshold geometry. Its finite glow acknowledges
a sigma change; the mathematical illustration retains its own evidence scope.

**Focused observation.** Exercise keyboard choice, rapid chapter jumps, local
inspection and a mid-animation switch to lower motion. Inspect a support gap,
retain its raw draft across another selection, and verify accepted bytes remain
unchanged until Apply. At narrow and laptop widths, inspect role labels, matrix
header contrast, selected-state shapes and the complete gate question/evidence.
These observations establish the exercised behavior; visitor interpretation
of the art direction remains a receiving human judgment.


### 12. Make a stage's creation entry a complete task

**Decision.** A stage's **Add a decision** opens an explicitly named new-decision
form. The stage is preselected; question and evidence fields are immediately
editable. **Add decision to plan** accepts the retained arrangement, and
**Discard this decision** removes that new draft while keeping other entries.
Confirmation returns to the accepted decision's stage; discard returns to the
originating stage's Add entry. Each has a meaningful focus target. The
confirmation carries the ordinary commit treatment.

**Observed problem.** The human could not distinguish the new record from an
existing decision. A receiving-browser inspection confirmed that the controller
created and selected a fresh ID, while the generic inspector title, existing-record
picker, collapsed empty fields and distant Apply action concealed that result.
Scrolling the tall inspector with nearest-edge alignment also left its heading
above the visible area. The prior test established record creation and focus,
while leaving the visitor's complete landing view unspecified.

**Evidence and transfer.** HMRC's official
[Add to a list pattern](https://design.tax.service.gov.uk/hmrc-design-patterns/add-to-a-list/)
separates adding, checking, changing and removing entries and gives visitors a
summary of what they have added. GOV.UK's
[Check answers guidance](https://design-system.service.gov.uk/patterns/check-answers/)
calls for a submission label that describes the actual action, retained answers
when editing, and a direct return after an edit. W3C's
[Focus Order explanation](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)
connects logical focus order with understandable operation, including dynamically
changed content. These are official practiced patterns and accessibility guidance;
they support the task structure without prescribing this Studio's exact layout.

**Implementation bridge.** Derive new-record status from draft identity versus
the accepted plan. Show **New decision**, keep the full proposed
name readable, move the heading below the fixed navigation, focus the name, and
explain that confirmation accepts other arrangement edits together. Empty context
is editable at once; existing decision prose retains its read/edit pattern.
After acceptance, focus the decision in its lane. After discarding, focus that
lane's creation entry. Optional fields retain their actual unknown standing.

**Challenge and observation.** A modal could make the creation boundary stronger,
but it would split an already retained arrangement into a second transaction.
The local design keeps one owner and makes that boundary visible. Exercise each
stage, multiple sequential additions, an unfinished timing edit, discard, Apply,
Undo and keyboard entry at laptop and narrow widths. The test must observe the
new heading, selected stage, visible fields, confirmation and return focus as
well as serialized state. Human walkthrough remains the evidence for whether
these cues resolve the reported confusion.

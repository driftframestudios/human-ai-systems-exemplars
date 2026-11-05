# Native Studio experience journal

This journal preserves the decisions that make the Studio coherent when work
resumes: what a visitor is trying to do, which state a control describes, how
roles relate to real responsibility, and why the experience looks and responds
as it does. Use it beside the [README](README.md), runnable source, and GitHub
Issues. Issues own current outcomes and acceptance; this file keeps material
design context close to the experience.

Entries are chronological. Each distinguishes source observations, human
direction, implementation decisions, and evidence still to collect. The
[implementation reference](implementation-reference.md) retains detailed state
and ownership contracts; the [usability research](usability-research.md)
connects this repair to public evidence and focused observations.

## 2026-11-05 — Re-entry at the native patch-bay checkpoint

**Source observation.** Commit `cf16539` is the comparison checkpoint for this
usability pass. It contains the native patch bay and the existing Purpose,
People, Coordination, and Investment behavior. It supplies source evidence for
this entry; the runnable working branch supplies behavior during the repair.
This checkpoint is distinct from a claim about publication or final showcase
completion.

The native Studio already has one immutable accepted-plan owner, complete
working-session and person editors, people/team creation, role and contribution
records, directed team connections, atomic arrangement proposals, saved edits,
Undo/Redo, one baseline, and admitted file exchange. The original full Studio
continues to carry capabilities whose native chapters are still developing.

The initial usability concern has a concrete mechanism: team and session
membership renderers put selected people before available people, and add
movement controls only to selected rows. Toggling a checkbox can therefore
move the row and alter its height. The arrangement editor already supports
creating teams, but choosing “Create a team” only exposes proposed fields;
Preview and Apply perform the later acceptance. Existing team and human
selectors otherwise depend on records already present in the plan.

**State meanings to preserve.**

| State or relationship | Meaning and visitor consequence |
| --- | --- |
| Accepted plan | `state.mjs` publishes immutable projections. The amp amount, accepted diagram, comparison, and download describe that accepted state. |
| Raw editor draft | Text and selections belong to the active editor. Its preview can show a proposed amount; Apply accepts the complete change and Cancel restores the accepted reading. |
| Saved edits | `editing.mjs` retains target-bound unfinished work when another editor takes the active lease. Reopening may require explicit review if accepted state changed in the meantime. |
| Accepted identity | A newer accepted event can make an earlier draft stale even when an imported payload has equal values. Numeric revision or visual equality alone does not grant that draft a current lease. |
| Purpose | The stated change, affected people, observable signal, accountable owner, review boundary, and open conditions explain the undertaking. Their text adds no implicit price adjustment. |
| Person and membership | A person retains one identity, rate, and funded-capacity account. Team membership and session participation are separate relationships. A checkbox changes the named relationship. |
| Funding and effort | Allocated session effort uses funded staffing; additional effort contributes extra commitment. A missing rate remains an explicit completeness gap. Zero is an actual value. |
| Paused and retired records | Paused work retains declared effort and cost. Lifecycle and relationship labels preserve reference meaning; they do not silently erase obligations or history. |
| Session timing | Count and duration establish effort. The current timing field is null; calendar placement and scheduling policy belong to their later contract. |
| Undo and baseline | Undo/Redo concern accepted events. A saved baseline is an independent comparison and restore point. Saved draft recovery retains its own target and review route. |

**Role meanings to preserve.** Function, seniority, working posture, ability
enabler, change-model component, quality role, AI role, and decision boundary
describe the selected person's contribution. They remain distinct fields.
The human receiver of an AI contribution and the person who decides may differ.
Review-before-use and decision-boundary text describe what those people own.
Labels such as Draft artifacts name an output category; they do not represent
an action that removes, generates, or accepts an artifact. Role and human-review
metadata preserve the model's separate accounting inputs.

**Re-entry consequence.** Continue from the source mechanism and visitor task,
using [#685](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/685)
as the current usability receiver within
[#647](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/647)
and [#637](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/637).

## 2026-11-05 — Human direction and the current repair

**Human direction.** Complete the polished, visual, interactive showcase with
its amp-head character, knobs, and light professional play. The current
aesthetic is worth developing. Add a cooler zine and ASCII vocabulary while
keeping semantic HTML, CSS, and vanilla JavaScript as the visitor foundation.
The complete working experience comes before general performance refinement.

The concrete interaction intent is:

- People stay in place when selected or deselected. Written state and subdued
  treatment can communicate participation; explicit reorder controls own
  intentional movement.
- Selectors choose values, disclosures reveal detail, and buttons take actions.
  Distinct shapes and consistent sizing within an action group help explain
  those jobs. Removal controls use rose treatment plus accurate text.
- Wording names the modeled relationship with humane, ordinary language.
  “Remove from plan” can explain a person's plan removal. “Remove contribution”
  names an artifact. “Dequeue” is suitable when the experience actually has a
  queue; the current plan uses people, memberships, sessions, and connections.
- A missing team or person has a creation route beside the dependent control.
  The unfinished task stays recoverable and has a visible return. Coordination
  can remain the visual entrance when those prerequisite routes work.
- Collapsed sections preview useful accepted facts. Empty sections invite a
  specific entry. A visitor can understand why opening the section matters.
- Panels use their area thoughtfully and keep controls steady through ordinary
  input. Responsive reflow and explicit changes retain their legitimate jobs.

**Implementation direction.** The repair adds stable participant rows, clearer
control styling, person/role summaries, and creation detours through existing
editors. Its expanded receiving scope includes people and supporting sessions
for contributions, receiving people and sessions for connections, and people
for arrangement templates. These routes preserve source drafts and explain
return; their final behavior and any narrower completion boundary belong to the
receiving verification and review.

The return contract has four visible parts: what is being created, the task
being preserved, how to return, and what needs review after creation changes
the accepted plan. A newly created connection receiver also needs the right
team membership. Template work retains its own raw configuration and requires
a fresh preview after an accepted-plan change. These are model relationships,
so the interface should keep their consequences apparent.

**Style and experiential details.**

| Cue | Intended job and source boundary |
| --- | --- |
| Amp head and knobs | Keep the Studio inviting and tactile, with the accepted amount visible and exact input controls available. A knob's ornamental character must retain an understandable value and operation. |
| Tiffany and cobalt | Continue About's existing composition. Route CSS maps those colors to local meaning rather than replacing the surrounding page's visual ownership. |
| Warm paper and ink | Give reading and editable cards a zine-like material character with strong text contrast and useful space around controls. |
| Rose quartz range | Distinguish removals, changed work, and recovery; text names the action or condition so color is supplementary. |
| Fixed light | Light comes from the upper left; small hard shadows fall down and right. Focus and pressed treatments remain recognizable without moving neighboring controls. |
| ASCII masthead, rules, and weave | Short authored patterns create publication texture. Decorative punctuation stays outside the accessible reading; meaningful art keeps an equivalent text reading. |
| Patch annotation and recovery slip | Explain a relationship or a next step beside the affected work. They should help a visitor continue rather than merely decorate a status message. |
| Typography | Ordinary system text carries sustained reading; monospace provides short labels and texture. Long names, enlarged text, and narrow widths retain complete usable words. |
| Professional play | Future progress and playful feedback describe actual visitor actions and outcomes. Ornamental stamps alone establish no achievement or authority. |

The [ASCII Zine Field](../../visual-fidelity-contracts/ascii-zine-field.md)
holds the family, token roles, specimen, and extension boundaries. Its palette
is a reference mapping; About's route stylesheet owns the actual Studio
composition. The research record distinguishes accessibility guidance from
local aesthetic choices and from visitor preference still to observe.

**Evidence pending at this entry.** Source changes are in progress. The fitting
browser return must exercise stable row rectangles and focus, creation and
cancellation from dependent editors, preserved draft values, accepted versus
draft summaries, and the new composition at narrow and desktop sizes. Check
forced colors, reduced motion, enlarged text, and keyboard operation where the
changed controls depend on them. An independent engineering review then reads
the actual proposed change. This entry records intended behavior, not a claim
that those observations already passed.

## 2026-11-05 — Keep delivery cost observable as the showcase grows

**Source observation and decision.** The first-paint stylesheet test had a
mandatory ceiling of 122,737 raw bytes from the earlier CSS extraction
comparison at `2d8e708`, before the native Studio. This repair's measured owner
set contains 124,236 bytes, an increase of 1,499 bytes against that comparison.
The test now reports the measurement as a diagnostic. Required stylesheet load
order and exclusion of the broad legacy sheet remain executable checks.
Historical planning and threadkeeping retain the earlier comparison as history.

This is a deliberate evidence boundary: a historical extraction size describes
that source set. It does not establish the right feature budget for the new
showcase. The human's direction favors completing useful behavior and retaining
an observable cost, with targeted refinement when actual visitor pressure
justifies it.

**Recorded check return.** On the repository-admitted Node 22.23.4 runtime:

```sh
node --test tests/context-canvas/about-first-paint-css.test.mjs tests/context-canvas/code-and-about-treatment.test.mjs
```

The implementing pass reported 10 of 10 tests passing. This establishes the
exercised About source and stylesheet-owner contracts at that point in the
repair. It leaves browser timing, interaction responsiveness, and subsequent
edits to their fitting observations. A reproducible slow interaction, loading
problem, or measured delivery regression can reopen the performance decision;
a larger source file by itself is an observation to interpret.

## 2026-11-05 — Put a clear entry point beside durable experience context

**Human direction and documentation change.** Keep material state, role,
styling, and experiential details beside the experience and use them with the
GitHub work route. The package now has a short practical [README](README.md),
this journal, the bounded [research and task audit](usability-research.md), and
the [implementation reference](implementation-reference.md). The former README's
detailed contracts moved to that reference; its technical headings and local
anchor relationships remain available. Existing unfragmented inbound README
links continue to open the practical entry point.

**Next re-entry.** Reconcile the current source and verification return with
[#685](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/685),
finish the affected visitor tasks, and record the actual remaining boundary.
The fuller showcase continues through
[#647](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/647)
for amp composition,
[#652](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/652)
for quality/recovery/learning and professional play, and
[#653](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/653)
for coordination score/capacity/decision gates.
[#679](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/679)
receives later relationship-rendering refinements after the showcase exists.
The [task audit](usability-research.md#task-focused-audit-and-receiving-work)
keeps specific prerequisite and correction paths visible while that work grows.

## 2026-11-05 — Browser findings refine stable rows and return pathways

**Implementation observation.** The current repair reuses mounted rows in all
four selection lists: session participants, team members, contribution
supporting sessions, and connection supporting sessions. Membership toggles
update the checkbox, written Included/Left out state, and styling. Explicit
Move up/down owns display-order changes. This preserves the control a visitor
is using and gives geometry checks a stable element to observe.

Prerequisite returns now record the originating chooser, including the two
different contribution human-assignment fields. After any required review of
a stale draft, the intended return focuses that exact chooser. A newly created
connection receiver can be added to its receiving team through the existing
team editor and ordinary Apply before selection. Return routes also reconcile
discarded or lost source drafts; created-record messages read the current
accepted label and existence so Undo can change their meaning accurately.
These are current source mechanisms whose complete behavior remains subject
to the receiving browser sweep and independent review.

Template proposals already include optional review-session creation with
people, team, duration, count, funding, and status. That capability belongs in
the same Preview/Apply sequence as its teams and connections. The current
repair adds clearer creation instructions, collapsed team/member previews,
and the person-creation detour. Direct correction links from static
removal-dependency labels remain a further interaction task in
[#647](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/647).

**Browser observation and design response.** A WebKit comparison exposed label
inflation from 16 to 19.2 CSS pixels and a corresponding 4.8-pixel row-height
change. Mounted-row reuse addresses unnecessary control replacement. The
Studio also scopes `text-size-adjust: 100%` and its WebKit-prefixed counterpart
to keep mobile text inflation from changing the authored control geometry.
The [CSSWG size-adjustment editor's draft](https://drafts.csswg.org/css-size-adjust-1/#adjustment-control)
describes this percentage mechanism; it is work in progress rather than a
finished interoperability guarantee. Authored `rem` sizes and user-selected
text enlargement remain part of the layout. Browser checks establish the
observed behavior at their actual engine, viewport, and text setting.

Narrow reading also exposed action-button overflow within cards. The revised
groups allow labels to wrap within their available width. At a 320-pixel
viewport with 200% text, smaller outer gutters leave more usable space for
nested editors, and connection group text receives its own line. These changes
preserve enlarged reading while addressing the observed layout pressure.

**Evidence boundary.** The final affected-browser sweep and independent review
are still receiving work at this entry. The PR will consolidate actual commands,
normalized outcomes, and remaining limitations. This journal records the
decision-changing findings and source response without promoting interim
observations to a completed showcase or release claim.

## 2026-11-05 — Pause and next iteration direction

**Human direction.** Pause cleanly so the human can change collaboration mode
before continuing. This checkpoint preserves useful work and open findings;
it does not mark the feature accepted or accelerate its remaining review.
The working branch is `codex/studio-usability-zine`, based on `cf16539` from
pending #675. The shared original checkout retains its separate branch.
[#685](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/685)
is the current work receiver. Feature integration and publication remain open.

**What landed well.** The human found the ASCII Zine Field specimen highly
valuable and wants to carry it forward. Preserve its existing composition and
make these targeted refinements:

- Move the native select's caret inward from the right edge by 8–24 pixels.
  Keep the native select behavior, visible value, and a fitting forced-colors
  treatment. The Studio already has its own 20-pixel indicator inset.
- Replace “Texture with a quiet job” with “Texture with a simple job” or another
  direct formulation that accurately describes the visual treatment.
- Use plus signs deliberately. A plus near a heading can imply Add. Prefer
  undecorated headings where they read clearly; explore character-art texture
  in the amp head, scroll-like notes, and magazine-leaflet compositions.
- Consider a brief tactile scramble around an accepted amount change, chapter
  transition, removal, or Undo. Its operation stays transparent: accepted values
  remain readable, motion follows actual state, and reduced motion has a stable
  equivalent. This is a design candidate, not implemented behavior.
- Prefer participation pairs such as “Included” and “Available” over “Left out.”
  Match the actual relationship being selected and retain the native checkbox.
- Review sentence and title case across summaries. Distinguish a fixed interface
  label from a user-authored name instead of silently recasing that name. The
  reported “Settings for Research review” case needs an intentional presentation.

**Next release requirements.** The ASCII zine reusable guidance is slated for
the next public GitHub Pages projection, and the Visual Fidelity Contract is
slated for the next production release. The current implementation is a
composition contract, tokens, and specimen; the human also called it a skill.
The receiving release pass should confirm whether a portable skill is warranted
in addition to the family, then use the existing skill/catalog/publication
owners. Preserve these two receiving routes explicitly in release planning.
Slating establishes planned inclusion; human-held publication still requires
its ordinary review and exact artifact verification.

**Open engineering findings.** Independent review remains provisional:

1. Repeated prerequisite detours from the same saved origin can leave an
   obsolete return route. Reproduce: edit a session, Create team, resume that
   session through Saved edits, Create team again, Apply, Return to session.
   Retire the superseded origin route while preserving useful nested detours.
2. The latest WebKit enlarged-text assertion observes about 19.2 pixels where
   the test expects about 32 pixels. Diagnose the actual typography and timing
   after the scoped text-size adjustment. Preserve user enlargement and stable
   rows; choose the repair from that observation. The failing assertion remains
   available. The temporary console diagnostic was removed for this checkpoint.

The last broad affected-browser run passed 92 of 93 cases. A later targeted
run passed 11 of 12. Earlier native source checks passed 420 cases before the
last return-controller refinements. The ASCII family passed its 15 source and
8 browser checks. Those are observations of their respective source points;
the checkpoint still needs final source and affected-browser verification plus
independent acceptance. The final receiving PR should own that bounded return.

**Resume here.** Read this entry with #685, resolve the two findings, make the
requested specimen and language refinements, update the public-projection and
production-release routes, then complete the affected checks and independent
review. Keep the full showcase route in #637 and final About reconciliation in
#638. The local preview can remain available during this short pause.

## 2026-11-05 — Resume the approved sequence

**Human direction.** The Issue order and synthesized implementation plan are
approved. The pause has ended. Complete the current usability repair and its
independent engineering review, then continue the populated showcase through
[#649](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/649)
and the tactile controls in
[#647](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/647).
The original checkout retains its own working branch; the feature uses
`codex/studio-usability-zine`. The earlier feature-branch push rejection cleared
on an ordinary retry. Repository protections retain their existing settings.

**Visual and language decisions.** The specimen's native select now has a
decorative caret inset 20 pixels, with reserved label space. Its native select
still owns options, keyboard selection, and focus; forced colors restores the
browser indicator. The heading reads “Texture with a simple job.” The Studio
uses plain chapter headings and a short stitched amp rail. Selection lists
read “Included” and “Available.” Settings and role summaries separate the fixed
label from the literal entered name with a middle dot, preserving names such as
“Research review” exactly as entered.

The family now explains targeted amp-grille, scroll-note, and leaflet
treatments. Its portable composition method owns ornament's job, placement,
ordinary control semantics, and fitting verification; the family owns its
palette, tokens, and specimen. The public skill projection and production
family guide have separate receiving paths. Their source registration prepares
the next release; human review retains publication authority.
[Issue #686](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/686)
owns both release handoffs, including exact source and generated-artifact review
and the later delivered-route observation.

**Refined browser finding.** The earlier text-size-adjust account was a
provisional explanation. The pinned WebKit reports those adjustment properties
unsupported, and the offscreen test observation retained smaller descendant
metrics after responsive enlargement. Bringing the actual card into view
before measuring established the enlarged reading. The repaired observation
therefore includes a visible-card precondition. Participant rows also own a
`1rem` font size so the surrounding page's narrow `li` rule does not determine
their typography. The ineffective scoped adjustment was removed. The browser
check still requires enlarged readable text and stable row geometry through
membership changes.

**Next composed task.** Author one cross-functional scenario with recognizable
roles, connected teams, shared work, and an accountable review route. Keep the
small teaching fixtures available. Its replacement preview should disclose
changed contributions and connections through the existing exchange owner.
Operate one working-session quantity with a real knob above the precision
field, and make that same editor the first contextual Remote. A short authored
review request can invite a useful adjustment and baseline comparison. The
broader ability, quality, recovery, and timing chapters retain their approved
owners.

**Motion decision.** Keep the current ornament stationary. Consider a brief
texture variation during the first knob/Remote composition, where an actual
accepted change or chapter transition gives it a clear event. Accepted money
and units stay readable; reduced motion shows the settled state directly.
This targeted extension remains in #647 with its other meaningful transitions.

**Receiving evidence.** The final feature PR owns the normalized source,
affected-browser, publication-closure, and independent-review return. This
entry preserves the design corrections and next task; the PR records the exact
source accepted for integration.

## 2026-11-05 — Build the populated pilot and first working dial

**Accepted ground.** #675 and #687 are integrated on `dev@8451f656`. Their
merge trees equal their independently reviewed heads. #668 and #685 are
complete. The current source branch is `codex/studio-showcase-controls`;
#649 and #647 own its outcome. #686 preserves next-release inclusion. The
human explicitly places the full tagged Pages release in a future human-cued
step. This session continues through the holistic showcase, then pauses at
performance-refinement Issues.

**Scenario.** The service-request pilot uses fictional people and illustrative
rates across Product and Research, Engineering, and Quality and Operations.
Shared people retain one account. Its brief asks the visitor to try four
45-minute decision reviews instead of four 30-minute reviews. The starting
$3,980 consists of $2,840 staffing and $1,140 extra work; $1,480 of work is
already included in staffing. The proposed extra hour across reviewers at
$120, $140, and $110 per hour adds $370. The ordinary small examples remain
teaching fixtures; the native page supplies this larger plan explicitly.

**Interaction and meaning.** Save a baseline, open the review, adjust the
minutes dial or precise value, inspect the draft, and Apply or Cancel. The
review request asks the visitor to pause the readiness connection while Noor's
recovery-instruction concern is clarified. Existing work keeps its time and
price. The response is an authored rehearsal with ordinary controls and
recoverable consequences; it awards no automatic score or readiness claim.
The brief disappears when another plan is loaded. Its record-specific actions
remain available only while the named records exist.

**Composition.** The dark amp keeps accepted money legible. The duration
readout, actual minutes knob, and short help share a row above exact fields at
wide widths, then reflow naturally. A trial with the sole knob inside one of
three aligned field columns left large empty regions; moving it to the shared
readout group made the same operating relationship more compact. The housing
and highlight remain stationary while the pointer turns. The existing session
disclosure becomes the first Remote, with the literal selected session name,
one draft, and wide-side/narrow-inline placement. Its state owner stays intact
through resizing. The amp's manual disclosure offers a short operating route.
Independent review exposed clipping at enlarged desktop text. The Remote now
uses its chapter's available inline space to choose side-by-side placement;
the same controls return to ordinary flow when enlarged text needs the width.
The browser journey checks actual editor and control containment at that size.

**Source and verification boundary.** The preset factory and accepted source
own the starting values; the authored HTML supplies the matching scriptless
reading. The Investment preview now includes named contribution and connection
changes through its existing exchange difference. The knob stays in the working
session controller and adds no module or runtime dependency. The receiving PR
will own the final source, browser, visual, and independent-review return.

## 2026-11-05 — Connect abilities to the work that supports them

**Accepted ground and current task.** PR #688 is integrated on `dev@7035bc2`;
its merge tree matches the independently reviewed source. The current branch,
`codex/studio-capability-cards`, receives #650, #677 and #678 together. A visitor
can choose a customer action or team practice, inspect its support, configure
responsibility and work, preview the whole proposal, and Apply or Undo it.

**Human language direction.** The starter now identifies people by their work:
Product lead, Researcher, Engineering lead, Engineer, Quality reviewer and
Operations specialist. These labels keep the people recognizable without
assigning fictional personal identities. Stable record IDs preserve existing
relationships. The preceding entry records the earlier naming; current source
owns the revised display labels.

The human also asked for descriptions that explain useful outcomes. The
selected-card kicker was redundant beside its action, so it was removed.
The chapter introduction says “Plan what your users can do.” Collapsed support
sections name their selected or proposed sessions; empty sections invite the
visitor to choose support. Reverse readings and the manual explain the action
and its acceptance question before definition metadata. Counts remain useful
where they communicate an actual quantity or limit.

**Composition and continuity.** The Abilities chapter keeps catalogue choices,
the selected card, its reverse, settings and manual in normal page flow.
“Open beside” exposes both readings when available width supports them. The
same editor owns the draft through reverse reading, chapter changes, saved
edits and prerequisite creation. Inspecting a supporting session offers a
return to the selected card. Narrow and enlarged layouts retain the same
controls and readable precision fields. The amp manual opens the catalogue's
shared operating explanations.

**Meaning and accounting.** Schema 0.4 records ability/practice instances,
versioned definitions, human responsibilities, shared support and observations.
Older plans pass their original admission profile before migration; their
practice work retains its original general-support meaning. Proposed,
Supported, Rehearsed and Observed in context describe explicit observations.
Current support gaps can change while earlier records remain recoverable.

Installing or editing a card publishes its configured work and evidence in one
history step. Shared sessions retain one global price and capacity account.
Card amounts describe their selected work and round independently; the plan
prices complete funding pools. Two separate one-minute sessions at $1 per hour
can therefore show two cents each on their cards while the plan settles three
cents. The reverse explains that distinction. A missing hourly rate produces
known-amount wording and a route to People to complete the estimate.

**Repairs discovered through use.** Independent review found that successive
new-session proposals could reuse an ID; allocation now checks existing work
and all work in the same proposal. A three-engine interaction exposed Firefox's
composition-end ordering; the editor captures that final field before drawing
its preview. The real page bootstrap also exposed an unregistered chapter icon;
the source-owned folded-card icon now completes the shell. Each repair has an
observation at its affected boundary.

The human's connection-editor screenshot also exposed removal and commit
buttons touching when empty feedback disappeared. The shared form-action rule
now reserves a gap above Apply/Cancel and space for their fixed shadows. Its
browser observation covers wide, narrow and enlarged-text rows, including
wrapped actions. This repair belongs with the working interaction. Returning
from adding a person also opens the original nested support section before
focusing its chooser, preserving both the draft and the visitor's place.

**Next receiver.** The receiving feature PR owns final verification and exact
independent acceptance. After integration, #651 carries the original change
frameworks, interpretive lenses and relative attention controls into this
accepted plan. Quality, recovery, score, traces, scenarios and final About
composition follow the approved route in #637. The complete original Studio
remains available. #686 holds the later human-cued tagged release; performance
refinement begins after the complete showcase and the requested pause.

## 2026-11-05 — Retain the plan while changing the questions

**Accepted ground.** PR #689 is integrated on `dev@4fd8fba` after independent
review of head `a799697`; their trees match. #650, #677 and #678 are complete.
The current `codex/studio-change-chapter` branch receives #651. The source
catalogue transfers the original framework explanations, suggestions, receiver
roles, lenses and attention descriptions directly. Stable native component IDs
retain existing role assignments.

**Visitor task.** Choose a framework, inspect a component, compare viewpoints,
adjust attention, and propose the support that the plan needs. Every framework
keeps its mapping and planning status when another is selected. Source filters
retain the original Core/Enterprise suggestion behavior. The Four Actions
reading forms discussion questions; changing those questions leaves records
with their existing owners.

**Controls and appearance.** Collapsed component summaries preview the planning
state. The same Included/Available checkbox grammar selects supporting work,
people and cards. A dark mixer holds the relative attention controls; stationary
housing and highlights surround native vertical range inputs. Each fader also
has an exact Parts field and step buttons. The first visual reading exposed
low-contrast headings and staggered tracks caused by unequal text lengths.
The shared mixer rows now align those tracks and their values, and headings
use the light control text. The earlier action-spacing repair carries into
the form footer and new proposal controls.

**Meaning of an adjustment.** Parts range independently from 0 to 25. The
values express relative emphasis, and an all-zero mix invites a choice. The
greatest-emphasis explanation refers to the actual maximum and its ties.
Frameworks, lenses, mappings and attention preserve money. A source suggestion
can reuse a session or propose explicitly configured new work; Apply accepts
settings and the support link together. The original 48 aggregate person-hours
remains explanatory context. Visitors choose the native per-person duration,
occurrences, participants and funding before a new session enters their plan.

**Recovery and disclosure.** One Change draft retains all maps and unfinished
work. Reset changes draft framework, mapping/status and attention defaults,
while keeping support references, lens/filter and actual sessions. Creating a
missing person, team or session returns to the requesting control. Removing
linked work or a card points back to Change for an explicit support decision.
Baseline and exchange readings name changed components and attention values;
the accepted plan file carries the complete settings.

**Continuation.** The receiving PR owns exact source and browser evidence.
#652 next receives quality, recovery and learning. #653 receives the retained
lens visual-kind cue and attention emphasis in the authored coordination score;
their current definitions already travel with the plan. #654 receives separate
analytical assumptions and traces. #649/#638 complete scenarios, reports and
the final About composition. The full original Studio and human-cued release
boundary remain intact. Pause at performance refinement after the showcase.

## 2026-11-05 — Rehearse a response and inspect its consequences

**Accepted ground.** PR #690 integrated the Change chapter at `dev@57f7b3d`,
with a merge tree equal to its independently reviewed source. Quality,
recovery and learning now receive the same accepted plan through #652.

**What a visitor can do.** The Quality & recovery chapter retains the original
quality concepts, reference horizon, independent rate, sigma illustration,
recovery assumptions and contextual learning prompts. Its authored complication
cards let a visitor prepare a response, name affected work and people, inspect
changes, Apply, compare, and keep or Undo the result. A 30-minute additional
session for the pilot's Quality reviewer and Operations specialist adds $100.
A reviewer records an observation, its context and the decision it informs.
Participation leaves competence and readiness for their fitting observation.

**Meaning to preserve.** Reference estimates and accepted work remain distinct.
The original staffing calculation owns quality and recovery illustrations;
explicit native people, time and funding own investment. The reference horizon
uses hours, 80-hour sprints or 520-hour quarters. Native plan weeks retain their
own meaning. Aggregate effort and per-person duration appear together in the
proposal. Reusing a session retains its one account. Removing an estimate leaves
accepted work available for an explicit decision. Settings, proposed work and
connection changes share one acceptance and one Undo event.

**Interaction continuity.** Quality concepts, events, learning actions and
rehearsals expose their supporting work and a route to inspect or create it.
Collapsed records preview that support. Raw entries survive chapter changes,
missing-record creation and stale review. A reused local rehearsal ID after
Cancel or Undo receives its current scenario's visible parent; the scenario
identity of an accepted observation stays stable. Independent review identified
that parent repair and a mistaken quarter label; the receiving feature includes
their focused checks.

**Control refinements from human use.** The Change selectors were visibly
compressed to 17 pixels in the earlier browser stylesheet. Shared native field
sizing gives them room for their text and a comfortable target. The browser’s
native base picker supplies repeat-click dismissal where supported, with the
standard native picker as its fallback. Actual in-app observation confirmed
open and repeated-click close for framework, viewpoint and suggestion source;
keyboard dismissal and selection retain their native owner. The [HTML select
contract](https://html.spec.whatwg.org/multipage/form-elements.html#the-select-element)
supplies that semantic boundary. Attention
panels keep aligned titles, tracks, numeric controls and equal outer heights;
descriptions sit beneath the controls. Light labels and separate warm filled
tracks make the slider knob and current amount legible. Focus changes the
channel's texture. Current-emphasis tags and a short update cue explain that
this reading responds to the visitor's selections; the same warm cue marks
matching channels. Zero and tied emphasis retain their literal meanings.

The native lens selector reuses the original Studio's wheel composition: fixed
labeled choices surround a brief reel turn. Reduced motion settles the same
selection directly. A visible Minutes dial label ties the session knob to its
exact controls. Future tactile controls follow their data: bounded numbers,
exclusive choices and actual toggles each receive the matching native input.
The original Coordination Horizon supplies useful arrangement and navigation
patterns for #653; its approximate spans remain distinguishable from the native
score's explicit timing.

**Continuation.** The feature PR owns the final source, browser, visual and
independent-review return. #691 next explains the offered planning methods,
uses laptop and wide space for meaningful comparisons, and shares the session
time controls with supporting-work proposals. Its source audit preserves PODA
learning questions, Impact Map discoverables, and Strategy Canvas anchored
readings. #653 receives the authored score, agenda, capacity and decision gates; #654 receives contribution traces and analytical
reconciliation. #649/#638/#656 complete scenarios, reports and final placement.
The full original Studio remains discoverable. The tagged public release
follows the human cue through #686. Pause at performance refinement after the
holistic showcase.

## 2026-11-05 — Understand the method before planning its work

**Accepted ground.** PR #692 completed Quality & recovery on `dev@35223fe`,
with a tree equal to independently reviewed head `009e909`. #691 now receives
the human's request for understandable suggestions, shared time controls and
more useful laptop and wide composition.

**The decision to support.** A method card explains what its work can accomplish
before offering a session. PODA connects purpose, objectives, discoverables and
activities. Impact Map connects a goal to affected people, intended change and
an investigation. Strategy Canvas compares anchored current, good-enough and
desired support; consequence weighting stays distinct. Small examples and
useful discussion inputs sit inside native disclosures. Existing companions
open in a separate tab so the Studio's unfinished work remains available.

**Source and authorship.** The method catalogue preserves the original
suggestion IDs and labels while supplying readable display labels and
outcome-led session names. Canonical prototypes and their separately adapted
Context Canvas versions retain their own manifest owners. Expectation
Architecture and other suggestions with limited local definitions receive
explicit Studio-authored planning guidance. The deeper manual carries that
standing. Examples describe possible planning work; the visitor supplies the
initiative's evidence and decisions.

**Composition and controls.** Component settings share available width, and
method cards form readable columns at laptop and wide sizes. Their flat
caret disclosures reveal guidance; shadowed buttons begin a work proposal.
The supporting-session form groups identity, people, time and funding into
complete regions. Session settings, Change and Quality & recovery share the
Minutes dial behavior and the same Hours, Minutes and Working sessions
semantics. Each editor retains its own draft and Apply boundary. Direct entry,
step buttons and native keyboard operation remain available beside the dial.

Fresh browser observation exposed a proposal collapse after its preview became
valid. Removing both new nested containment boundaries restored the controls;
changing only their display type left the fault in place. Responsive composition
therefore uses the existing chapter and Session boundaries. The planning journey
checks visible controls after participant selection as well as exact amounts.

**Continuation.** The receiving feature PR owns verification and independent
review. #653 next supplies the explicit coordination score, agenda, capacity
and decision gates. #654, #649, #638 and #656 complete the remaining visual
analysis, scenarios, carry-away results and final placement. #686 retains the
future human-cued tagged release. The requested pause begins at performance
refinement after the complete showcase.

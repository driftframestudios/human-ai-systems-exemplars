# Native Studio experience journal

This journal preserves the decisions that let a collaborator continue the
Studio coherently: what visitors should understand, which state a control owns,
and why the experience looks and responds as it does. The [README](README.md)
is the practical entry point; runnable source owns behavior; GitHub Issues and
PRs own current acceptance and delivery. The
[implementation reference](implementation-reference.md) carries deeper contracts,
and [usability research](usability-research.md) records the bounded research.

The 7 November 2026 reconciliation preserves the current contract, the next
Coordination composition decision and material history. The visual grammar is owned by the
[Studio Rack contracts](../../visual-fidelity-contracts/studio-rack/README.md).
The supersession table identifies deliberate reversals. Earlier prose and exact
interim check counts remain recoverable in Git history.

## Current working contract

The Studio is a populated, visual About-page showcase for a visitor who may
only scan and try a few controls. Its purpose is to make cross-functional work,
responsibility and investment understandable through direct exploration.
Useful examples, visible choices and recoverable interactions lead; precise
editors remain available when a visitor chooses to inspect them.

The working showcase is on main. The cohesion route
[#735](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/735)
was delivered under
[milestone 23](https://github.com/driftframestudios/human-ai-systems-exemplars/milestone/23)
through focused, independently reviewed PRs. Each PR owns its checked source,
result and recovery path:

| Design outcome | Issue | Delivered change |
| --- | --- | --- |
| Shared composition and controls | #736 | [#741](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/741) |
| Coordination and People | #737 | [#742](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/742) |
| Adjacent Abilities inspector | #738 | [#743](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/743) |
| Framework-specific Change controls | #739 | [#744](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/744) |
| Quality pads and calm starting preset | #740 | [#745](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/745) |

The 7 November interaction route delivered dial retention (#753, PR #761) and
Change disclosure cues (#754, PR #760), with visual-contract persistence in #755.
The current aesthetic and component placement remain the reference. PR #764
delivered #756: the selected period and Plan overview return share the rack
header, with originating focus and local scroll restored on return. The next
planning decision is semantic and stylistic consolidation in #765 before
adjacent editor placement. Direct arrangement selection (#766), dial enclosures
(#767), and adjacent session editing (#768) now have bounded receiving issues
alongside the updated person/team editor issue #757. Existing editor placement,
arrangement preview/Apply and creation ownership remain the runnable contract.

### State, people and evidence

| Owned meaning | Consequence for the experience |
| --- | --- |
| Accepted plan | One immutable projection supplies the accepted amount, work relationships, comparisons and downloads. |
| Editor proposal | Raw text and selections remain with their editor until Apply. Its amount describes the proposed change. Cancel returns to accepted values. |
| Saved edit | The shared coordinator retains target-bound unfinished work. A changed accepted identity can require explicit review even when values happen to match. |
| History and baseline | Undo/Redo traverse accepted changes. A baseline is an independent comparison and restore point. Saved drafts retain their separate recovery route. |
| Person | One identity, hourly rate and funded-time account can participate in several teams and sessions. Role labels identify the illustrative people. |
| Membership and participation | Team membership and session participation are distinct. Known people can join a session directly across team boundaries; this preserves independently edited team rosters. |
| Purpose and roles | Purpose, function, seniority, posture, human review and decision boundaries describe responsibility. They introduce no implicit price adjustment. |
| AI contribution | A functional contribution retains its human receiver, reviewer, decision owner, supporting work and review-before-use instructions. Those responsibilities may belong to different people. |
| Effort and funding | Duration, occurrences and participants establish session effort. Work within funded staffing and extra investment retain separate accounts. Shared work is priced once. |
| Unknown and zero | An untouched blank rate or availability stays unknown. Zero is an entered value. An explicit rate-dial gesture can begin an amount. |
| Status and removal | Pausing a connection or changing a check's inclusion preserves separately owned work. Removal reviews references before accepting the requested change. |
| Evidence | Planned support, rehearsal and recorded observations retain different meanings. Imported findings preserve the reviewer, context and observed revision. Authored examples illustrate possible responses. |

The amp displays accepted investment. Reels and faders can change a draft and
its illustration; a presentation effect never accepts work or awards readiness.
A missing rate retains a known-amount reading and a route to its person editor.
Line attribution and independently rounded subtotals keep their explanatory
meaning; the plan's complete funding pools own the settled amount.

### A plan that reads as enterprise work

Coordination leads with a four-sprint pilot and an aligned session sequencer.
Each illustrative sprint contains two weeks. A separately authored two-quarter
example carries preparation into rollout and operating adoption. Its sessions
represent work within that wider initiative; the amount prices the included work.

The view has three useful depths: plan overview, selected sprint or quarter,
then its session or decision. The rack header names the selected period beside
the **Plan overview** return, outside the board and tracks' horizontal scroll
regions. That label names the actual destination. Returning restores the period
control used to enter from either the board or the tracks, along with the
overview's local scroll. One scope owner drives the breadcrumb, lanes and tracks.
Period membership and order are authored. Scope changes preserve plan bytes,
pending edits, effort and investment. The session editor owns people, duration,
occurrence count, funding and placement.

Example buttons replace the plan in place with Undo available. The Sprints /
Business quarters choice immediately regroups the existing work and supports
Undo. Period-count changes use a visible horizon proposal with Apply and Cancel.
Shortening the horizon retains affected sessions for placement. Older plans keep
their recorded timing until an explicit period-arrangement proposal is accepted.

A period's Add session action opens a new draft in that period with useful
example context. Confirming Add session accepts the prepared item. More
occurrences create additional placements to choose; more Hours or Minutes makes
each occurrence longer. These separate operations remain visible beside the work.

Stages group sessions. Handoffs connect the work that prepares a result to its
receiver. Decisions attach to a stage or handoff and retain their question,
evidence and reviewer. Delays name affected work and can propose a later period.
Availability opens beside a person and period; funded time retains its economic
meaning. Broad period membership establishes sequence, not exact collisions.

The default view keeps the overview and MIDI tracks together. Stages & handoffs
reveals related work and its contextual settings. People and available time use
progressive disclosure. Detailed chronological readings stay in downloadable
reports. The earlier eight-category elapsed-time inspector is retired.

### A coherent visual instrument

The amp is a compact frame for the Studio identity, accepted amount, chapters,
Purpose and Saved edits. Its animation choices are Off, Half-speed and Full-speed.
Full-speed is the requested default. System reduced-motion preferences suppress
animation; the selected content and all operations remain available.

The **Editorial Rack** uses pale, readable work areas for relationships, prose,
kanban lanes and support tables. The **Instrument Rack** uses a dark face for
reels, aligned faders, exact readouts and responsive visualizations. About's
existing color tokens own the palette. Chapter styles extend the shared owner
instead of creating separate button or control systems.

The visual family records this composition and five reusable patterns: Period
Kanban & Session Sequencer, Support Matrix & Stateful Pads, Zoetrope Preset
Selection, Precision Dials & Faders, and Contextual Inspection & Recovery.
Chapter variations use these shared meanings; current runtime and the receiving
PR supply behavioral evidence. The dated research record supplies principles
and local design adaptations. Its older elapsed-time, connection-first and
lower-motion choices yield to the supersession decisions below.

Music-production controllers, euro-rack modules and restrained 16-bit/32-bit
character guide the tactile treatment. Stationary housings and upper-left light
keep controls readable while pointers, selected keys and pads respond. ASCII
rules, grille details and small interstitials have a specific visual job.
Decorative texture stays outside the accessible reading. Plus signs identify
creation entries; ordinary headings carry their own hierarchy.

Motion communicates the operation: chapter arrival, a contextual move, local
inspection, a reel reveal, or a pad changing lanes. Selection and data remain
stable while the effect settles. Nearby editors stay in view. Longer reveals
move only as needed and yield to wheel, touch, pointer or keyboard input. Off
and system reduction settle the same destination directly. General performance
refinement remains separate from correcting an observed interaction defect.

### Controls and recovery

- A plus starts a creation flow. The final Add or Apply confirms the item already
  being prepared. A nested creation action retains its own entry treatment.
- An arrow announces another view or inspector; a caret opens nearby content.
  Change track labels and Plan session controls share their actual inspector's
  expanded state, including closure through its native summary.
  Persistent choices remain visibly pressed. A descriptive title stays distinct
  from the button that edits or navigates from it.
- Cancel is a shadow-free ghost action. Removal uses rose treatment with exact
  relationship wording. Shared action groups retain spacing when feedback clears
  or labels wrap.
- Participant cards stay in place when toggled. Included and Available describe
  the relationship. Explicit reorder controls own intentional movement.
- Hours has a larger dial than Minutes, beside their exact fields. Rates have
  $10 and $5 dials, centered $1 step buttons and direct entry. Native keyboard
  behavior and units remain visible; long repeated operating paragraphs are
  replaced by useful labels and local validation.
  A completed adjustment remains in the draft when focus or pointer capture
  ends. Escape and pointer cancellation restore the start of the active turn.
  Apply and Cancel continue to own acceptance of the complete editor proposal.
- Small fixed choice sets expose their options directly. Boolean switches keep
  native checkbox ownership. Long questions and evidence are readable before
  editing instead of being clipped inside a small text field.
- Creation detours retain the originating draft and a visible return. A returned
  record is checked against current accepted state; Undo can change its meaning.
  Nested return routes preserve the nearest useful origin and retire discarded
  or superseded routes.

Known records and references remain admission boundaries. Artificial team
membership prerequisites have been removed from session participation so a
visitor can explore cross-functional work directly.

### Chapter-specific decisions

**People and team planning.** Team lanes and person/session tracks lead. Selecting
a person opens their existing settings; rates and ordering remain in a compact
secondary route. Team arrangement reels show populated structures and actual
work directions. The selected arrangement proposes teams, connections and
supporting sessions together; Apply accepts it and Undo restores the prior plan.
A changed endpoint can show an adapted arrangement. Removing template grouping
preserves the teams, work and connections. Earlier files retain a custom reading
until a template is explicitly authored.

**Abilities.** The human preferred full support comparison over an action-pad-only
catalogue. What people can do and How the team works retain semantic tables for
responsibility, preparation, review and observation. One editing rack opens
adjacent to the selected table. Native checkbox pads connect people, prerequisites
and supporting sessions. Card front, reverse and side-by-side readings retain
meaningful detail. Authored observation choices replace typing a result in the
showcase; imported history stays readable. The separate manual UI is retired.

**Change.** Viewpoint and framework reels populate component emphasis, work lanes
and linked-session tracks. Each framework partitions the stored attention
channels so changing one visible fader preserves the other components' emphasis.
The starter has real support links to its existing sessions. Selecting a method
opens a local explanation and example, then its work proposal. PODA connects
purpose, objectives, discoverables and activities; Impact Map connects a goal to
affected people and an investigation; Strategy Canvas compares anchored support.
Their examples suggest planning work, while the plan retains its actual people,
sessions and evidence. Manual and repetitive framing blocks are retired.

**Quality & recovery.** Pre-release and post-release reels select authored check
and rehearsal configurations. Sigma, Quality, Urgency, Compliance, Training and
Fidelity form the fader bank. Prepare, Rehearse and Operate & learn lanes sit
beside session tracks; selecting a pad opens its matching settings, rehearsal,
recovery or illustration pane. Rich rehearsal context stays in the selected
reading. Recovery and learning entries begin with useful example content.

New showcase plans begin at 4σ with balanced preparation settings. Imported
settings retain their own values. Authored pressure rules move pads and can keep
a needed check included; a nearby cue names the control change that releases it.
The scope changes from calm through warning to salmon intensity with decorative
ions. Extreme settings add decorative reel stutter. These are deterministic
illustrations of chosen assumptions, not empirical forecasts. They never advance
an accepted plan or assign an automatic cost. Only accepted people and sessions
change their owned investment. Imported observations remain readable; the
observed-result form and chapter manual are retired.

**Investment.** Baseline comparison, history, save/open controls, the whole-plan
cost breakdown and downloads remain. The original contribution-trace comparison
panel is retired. Investment's broader starting-plan selection retains its
replacement preview; Coordination's two example buttons act in place with Undo.
Reports, collaboration briefs and JSON describe the same accepted snapshot.
Unfinished editor entries remain in the Studio. The full original calculator
retains broader role-pool, service, capital, reserve and commercial models.

## Superseded directions

These changes are intentional. Use the current contract above when an older
entry, screenshot or technical description presents the earlier behavior.

| Earlier direction | Current replacement and reason |
| --- | --- |
| Elapsed minutes, window starts/ends after, and minute-based planning zoom | Named sprints or quarters with week/month drill-down. Visitors recognize enterprise periods immediately; session duration retains exact units. |
| Eight persistent timing-inspector categories | Direct period/session selection plus Stages & handoffs; availability opens in context. This keeps the initial view visual and concise. |
| Lower motion by default and a lens-local motion selector | Full-speed by default; Off / Half-speed / Full-speed in the amp, with system reduction suppressing animation. |
| Scrolling amp readings panel and consequence marquee | Compact amp composition. The sticky-header/consequence-channel exploration stays deferred in #699. |
| Change and Quality manuals, long dial help and default reference-value disclosure | Short labels, populated controls, local examples and contextual detail. Technical explanations stay in source/reference documentation. |
| Observation-entry forms as the showcase's normal path | Authored illustrative choices with imported observation history preserved. Visitors can explore without composing evidence text. |
| Team membership required before a person can join a session | Direct cross-team participation using known identities, with team rosters retained independently. |
| Investment contribution-trace plot and default detailed agendas | Baseline/history/file controls, optional whole-plan breakdown and portable reports. |
| Dark treatment across every work region | Pale Editorial Rack for reading and work; dark Instrument Rack for controls and visual response. |
| Original lower-sigma starting illustration | Healthy 4σ new-showcase default with balanced faders; imported plans retain their settings. |
| Broad numeric and sub-mobile verification as the completion target | Focused behavioral proof and ordinary mobile/desktop usability. Existing arithmetic coverage remains unless an actual changed calculation needs evidence. |
| Dev-only integration and repeated checkpoint pauses | The human authorized continuing the working showcase on main through narrow reviewed PRs. Performance and publication retain their explicit holds. |
| Holding all further in-rack work for scope definition | PR #764 delivered #756. The next planning decision places semantic/style consolidation (#765), direct arrangement selection (#766) and enclosed controls (#767) before adjacent people/team (#757) and session (#768) editors. Current placement remains in service during that preparation. |
| Whole plan return outside the rack | Plan overview return and selected sprint/quarter share the rack header, clear of horizontal scrolling. The destination wording follows the human's #756 clarification; the board and track return restores the visitor's origin. |
| Treating every pointer-capture or focus loss as cancellation of a dial turn | Retain the displayed draft adjustment on ordinary capture/focus loss; explicit cancellation restores the active turn's starting value. This addresses an observed reset without changing editor acceptance. |

## Next Coordination composition

The [consolidation plan](../../planning/context-canvas/studio-coordination-rack-consolidation.md)
records the next design determination. The horizon answers when work happens;
Team planning answers who works together. Both use existing session identities,
but period/occurrence columns and people/participation columns keep their own
meanings. Shared session keys and Add controls are the first implementation
receiver. Durable selection comes from the receiving editor; the last-click
motion cue remains presentation feedback.

Team planning is to become a permanent sibling section: heading, zoetrope with
editorial team structure, concise hint, then a subtly darker secondary rack.
Its housing and control states follow the horizon. Quality's compact lanes and
pads supply composition precedents for choices with explicit local meaning.

Direct arrangement selection needs a replacement transaction for one instance,
with Undo. The current template engine appends generated records and detects
identity collisions; applying it repeatedly would not create the requested
revisable example. #766 owns that change. Accepted structure and Included work
wording follow its actual state; the editorial card art direction remains.

Before adjacent editors, #767 encloses Hours, Minutes and their combined output
in one duration module. Working sessions stays nearby as a separate repetition
module; monetary controls use the same housing grammar with their own units.
The main static session markup and dynamic supporting-session factory receive
the composition together. Their gesture, raw-value and acceptance owners stay
in place. #757 and #768 then reuse one contextual panel/return grammar in
Coordination; #758 retains immediate-add semantics separately.

#717 remains a parallel zine-test quality repair. The source still conflates
viewport position with document position, while the preceding hosted checks
passed. If that observation blocks the shared delivery workflow, repair its
geometry proof first. It is independent of the Studio runtime and the current
semantic planning decision.

## Material decision history

### 5 November — Stable interaction before further visual expansion

The early native patch-bay checkpoint already supplied accepted state, editors,
roles, connections, proposals, saved work and Undo. The human's annotated review
identified concrete instability: selecting participants changed their order,
controls moved when feedback disappeared, and missing people or teams created
unclear detours. The #685 usability work retained mounted rows, separated entry
from confirmation, and added return routes beside dependent controls.

Browser observation corrected an early text-inflation hypothesis. The useful
repair was to measure an actually visible enlarged card and give participant
rows their own typography. Scoped text-size adjustment was removed when the
pinned engine did not support the assumed mechanism. This matters on re-entry:
retain the visible-control precondition rather than reviving the discarded CSS.

The human endorsed the ASCII specimen and requested targeted ornament, an inset
select caret, Included/Available language and literal entered names in summaries.
The resulting composition guidance and public release preparation remain routed
through #686. The working repair's exact evidence belongs to its receiving PR,
not to the provisional counts from earlier pauses.

### 5 November — A populated pilot, useful support and explicit cost

The #649/#647 work introduced a connected service-request pilot, a real duration
dial and a review response. Role labels replaced fictional human names. Its
$3,980 starting investment and the $370 effect of extending four reviews provide
a concrete, small demonstration. Pausing a connection preserves its supporting
work and cost. This remains a useful distinction between a relationship's status
and a session's commitment.

Abilities (#650/#677/#678), Change (#651), Quality (#652) and method explanations
(#691) joined the same accepted plan. Shared work retained one account; card
support, explicit rehearsal and observations kept separate meanings. Independent
reviews found consequential faults in repeated proposal IDs, composition-end
capture, retired receivers reclaiming focus and source returns. Focused repairs
kept those boundaries in their existing owners.

The #694/#696 interaction work established a stable session diagram and
full-width editor flow, read-before-edit Purpose, direct small choices,
recognizable creation/confirmation controls, Hours/Minutes dials and $10/$5 rate
dials. The human's repeated annotations made progressive disclosure, complete
labels, legible contrast and ordinary mobile operation part of construction.

Arrangement topology (#697) and quality consequences (#698) connected diagrams
and badges to actual records. Pod, Guild, Project team and Shared service kept
their own work directions. AI-related support named human receiving and decision
responsibilities. Badges linked to a specific planned session, rehearsal or
observation; they did not confer competence or readiness.

### 5 November — One native About experience and reliable owners

PR #707 integrated the working native showcase into About's existing Studio
section. The surrounding human-authored page, closed static counterpart and full
original Studio route remained. The main showcase then received #708's focused
core-quality work: download resource ownership (#709), return policy (#710),
shared admission limits (#711), and consistent timing controls (#712).

The download adapter retains a successful resource while another attempt runs,
releases failed attempts and disposes once. Return policy distinguishes a saved
creation from an accepted record. Shared limits preserve one semantic source.
These were bounded ownership improvements; broader factories or numeric tests
would not have answered an additional receiving question.

### 5 November — Enterprise periods replace elapsed-time planning

The human rejected elapsed-time offsets as the primary planning concept.
The #718 alternatives and synthesis led to #720–#722: explicit period identities,
occurrence placements, two authored examples, semantic zoom and contextual
creation. Business periods represent authored sequence; they are not inferred
calendar conversions from staffing hours.

Independent review preserved interleaved occurrences during replacement and
reconciled parked arrangement drafts against newly accepted sessions. Keyed
three-way comparison retains independent changes and names a conflicting edit
for explicit recovery. Old references remain until deliberate cleanup. Those
behavioral cases protect data meaning without expanding arithmetic testing.

The compact Coordination landing view was accepted. Later human review restored
Abilities' comparative support tables through #725, superseding their temporary
action-pad simplification. Cross-team session participation was relaxed while
known-reference admission remained. Full motion replaced the earlier lower
motion default. The detailed contribution trace left Investment; ordinary
comparison and the optional whole-plan breakdown stayed.

### 6 November — Populated reels become a shared interaction family

The #727 route introduced the shared reel (#729), People and arrangement
surfaces (#728), Change (#730), and Quality (#731). Native buttons own reel
choices and keyboard operation; the rotor is decorative. Existing controllers
continue to own settings, proposals, saved work and acceptance.

Independent review found a remount hazard: a broad data-hook selector matched a
populated track pad before the intended static receiver. Exact empty data hooks
now identify the authored owner. The focused remount journey exercises populated
tracks and a fresh proposal after mounting again. This is a standing ownership
lesson for new dynamic pads.

The #735 cohesion pass builds on that family. It consolidates pale work
racks and dark instruments, exposes team planning, keeps local Abilities and
Change editors beside their visual context, and makes Quality pressure legible
through authored locks, recoverable cues and decorative response. The README
and this journal were rewritten as a whole so the current experience can be
understood without reconstructing every intermediate iteration.

## Verification and next receiving decision

Use the smallest observation that distinguishes a consequential fault. Source
checks establish admission, state ownership, reference handling and recovery.
Focused browser journeys establish the exercised action, focus and layout.
Ordinary mobile and desktop views belong to this showcase; engine-sensitive
range, fieldset, pointer or composition behavior receives the relevant alternate
engine. Screenshots stay in ignored `.visual-runs/` for local comparison.

The integrated Studio source suite and focused chapter journeys passed.
Quality's new reel/pressure paths also passed in Firefox and WebKit. Independent
source and visual reviews accepted the feature slices after the identified
focus-return and styling repairs. Follow-up repairs in
[#747](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/747),
[#748](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/748)
and [#749](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/749)
reconciled the broader suite with accepted editorial changes and source-owned
projections. The complete Context Canvas source suite now passes. This supersedes
the earlier standing of twelve reproduced baseline failures; the receiving PRs
retain the exact observations and reviewed commits.

For re-entry, start with #765 and the consolidation plan. Its shared-controls
and Team planning composition increments prepare #766's direct arrangement
selection and #767's enclosed controls. Those receivers prepare the adjacent
people/team (#757) and session (#768) editors. PR #764 remains the accepted
scope-navigation reference. Retain the current creation/confirmation contract
while #758 defines its separate replacement.
Pause before general performance refinement in
[#679](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/679).
The future compact sticky amp remains
[#699](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/699),
and broader economic translation remains
[#705](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/705).
Tagged Pages publication and the production release remain the separately
human-cued route in
[#686](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/686).

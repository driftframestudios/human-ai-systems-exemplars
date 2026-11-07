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
Direct empty-space creation, participant movement, attached editorial companions,
duration enclosures and scoped removal/recovery retain their separate receivers
below. The current aesthetic, compact landing and existing operations remain the
reference.

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
The global last-click effect remains transient motion feedback. Existing session-settings
destination wording remains accurate until an adjacent editor is mounted.

`studio-rack-add` supplies the shared Add session treatment in the existing
instrument stylesheet; receiving styles retain column geometry. A plus begins
creation. The final Add confirms the item being prepared. Horizon entry supplies
its period/subdivision; Team planning supplies its known context. Both continue
through the current creation owner, including cross-team participants.

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
adds a **New session** row inside the temporal rack, with an empty pad region
for each visible period/subdivision. Its contextual label names the destination,
such as **New session in Sprint 2**. Shared sessions gets its own empty creation
row or strip. Fine-pointer hover reveals an outlined ghost pad and plus; keyboard
focus reveals the same target, and touch presents it directly. A named native
button and the ordinary Add entry keep creation discoverable.

An existing work row still means that work: its temporal blanks can receive
another occurrence; its person intersections express participation. The new-row
region creates a distinct session. This keeps a click's result understandable
before activation and preserves scrolling and existing-pad operations.

[#758](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/758)
now identifies sessions as the recommended first immediate-add record. One
deliberate action creates a useful example in the known context, then selects
its editor. The visitor adjusts duration and returns; creation Undo and later
edit Cancel remain distinct. #768 supplies the adjacent receiver. This is a
future acceptance change; current draft/confirmation flows continue to work.

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
5. Local Undo, customization and accepted connection details; adjacent
   selected-object editing remains a later issue.

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
custom stages and supporting work retain routes. Team/member cards address
existing team customization; handoffs address connection customization. Accepted
sessions use their accepted record IDs after arrangement selection. The board
owns presentation; the arrangement transaction and existing history own plan
changes and recovery.

The proposed-team strip, duplicated connection-button strip and Delivery lifecycle
disclosure are superseded in this receiver. Remaining attached summaries retain
the spring reveal. Session keys retain current destination behavior and actual
receiver-driven caret state; the later adjacent session panel in #768 will own
its corresponding open/close interaction.

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
prepares the dials for adjacent racks. Enclose **Time per person, per session**,
the existing combined Hours/Minutes output, and both dial–field–step groups in
one instrument module. Hours remains the larger dial; Minutes remains smaller.
Keep **Working sessions** nearby as a separate repetition module.

Place the larger readout above the dials within the module face.
At laptop width the groups can sit side by side; at phone width they reflow
inside the same enclosure. Give Minutes a secondary rose/peach inner face or a
simple reel-like outline. Place each dial above-left of its exact field/stepper
group, so the driver and its value read together. Preserve the input above the
circular minus/plus pair, the gap between circles and their start/end alignment
under the input. Skin and size can vary while that layout stays recognizable.
Preserve output associations, fixed light and the current pointer artwork.
Apply the same housing grammar to the existing $10/$5 rate dials and their one
exact amount/$1 controls.

Working sessions keeps its repetition meaning, with the existing input retained
for this enclosure pass. #768 may later express occurrences as pads or a compact
lane with a clear count and placement. Duration changes one occurrence's length;
adding an occurrence and adding a different session stay distinct operations.

The main session markup in About HTML and the dynamic supporting-session
factory in `time-controls.mjs` must receive the duration composition together.
Their controllers retain value ownership. Reconcile the current wide-screen
overview column with the enclosure rather than adding another competing rule.
The retained-value repair from #761 remains the gesture contract.

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
| [#766](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/766) | Direct arrangement update, included-work reading and Undo | Supplies stable accepted identity before adjacent editors; its PR carries transaction and recovery evidence |
| [#767](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/767) | Duration/rate enclosures | Receives shared grammar; can proceed alongside #766; precedes both adjacent editor issues |
| [#757](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/757) | Adjacent person/team editor in Coordination | Receives consolidated composition, accepted arrangement identity and enclosed controls |
| [#768](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/768) | Adjacent session editor from either Coordination rack | Shares #757's contextual panel contract and existing editor owners |
| [#758](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/758) → [#770](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/770) | Immediate session acceptance, then empty-space entry | Receives common creation controls and an adjacent edit/return route; retains existing creation until ready |
| [#771](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/771) | Shared participant movement; separately, scoped percentage semantics | Movement can accompany shared controls; the percentage model remains independent future work |
| [#772](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/772) | Attached editorial companions and equivalent rack entries | Receives the shared shell; prepares contextual editors without changing their draft ownership |
| [#773](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/773) | Scoped removal, amp Undo, then a Coordination local-recovery example | Receives shared controls/history; human review releases cross-chapter removal adoption |

Either adjacent editor can supply the first reviewed panel example after its
preparation is accepted. #771's movement and #772's companion shell can develop
alongside the enclosure work. Percentage modeling and immediate-add acceptance
retain separate increments; neither expands the first common-control PR.
Publication, sticky amp work and general performance retain their own routes.

The chain review preserves completed #755 (contracts) and #756 (scope navigation)
as accepted foundations. #765’s reviewed composition, #779’s delivery board and
#766’s direct replacement prepare the next receivers. #766 preserves sessions
created through the new entry when arrangements change; #767 receives the exact
duration hierarchy; #757/#768 receive nested matrices, shared names and companion
routes. #758 now has a recommended first record and #770 its contextual entry.
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
and one duration-module comparison at phone/laptop widths. Existing source and
gesture checks retain their boundary. Each focused PR receives independent
review, updates current README/journal guidance, and passes its evidence to the
next issue. A reviewed adjacent panel completes this preparation route.

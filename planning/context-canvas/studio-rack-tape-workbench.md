# A tape workbench inside the Studio rack

Let visitors define a session, place its occurrences in a sprint or quarter,
choose who takes part, and route the resulting work while keeping the arrangement
in view. The rack becomes the working surface for these operations, with compact
modules attached to the selected item.

**Standing — 7 November 2026:** active design exploration on `dev`, coordinated in
[#804](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/804). The
[interactive study](studio-rack-tape-study.html) uses illustrative local state to
make the composition reviewable. It is not a production model migration.
The [running Studio source](../../collaboration/native-investment-studio/README.md)
continues to define accepted behavior. This proposal develops the
[Coordination consolidation](studio-coordination-rack-consolidation.md); its
prospective reductions replace earlier layout recommendations only when a
focused implementation receives review.

## Four viable compositions

| Composition | Visitor experience | Useful contribution | Main consideration |
| --- | --- | --- | --- |
| **Loaded tape** | Select a session card; its duration, occurrences and participants occupy a short work surface within the rack. | Strong object identity and a direct relationship between controls and the selected work. | The module needs a stable home so adjusting a dial keeps the selected tape and focus intact. |
| **Arrangement matrix** | Sessions form rows; people form columns. Native checkbox pads assign participation. Selecting a row loads its controls. | Makes shared work and the effect of including someone immediately visible. | Inclusion, selection and occurrence placement require distinct controls and states. |
| **Rack scenes** | A visible breadcrumb leads from Plan overview to Sprint 2, then to the selected session or relationship. The same enclosure carries each scene. | Conserves vertical space and makes the current scope understandable. | A deeper selection must retain the overview return, pending values and the originating control. |
| **Tape library and routing** | A compact shelf holds sessions; visitors place their occurrences in the arrangement and route separate response cards to receiving work. | Gives creation, repetition and feedback a clear visual sequence. | Truly unassigned sessions and independently routable responses need small, explicit model extensions. |

The recommended synthesis uses **Loaded tape** as the organizing pattern,
**Arrangement matrix** for participation, and **Rack scenes** for deeper scope.
The tape shelf and response routing supply the next model increment once their
illustrated behavior has been reviewed. A compact Event list supplies an optional
precise reading of the current selection.

## The proposed working sequence

1. **Define the session.** Add a tape with a useful name and the existing duration
   module. In the target design, people and placement can follow. The tape is the
   visual face of a session definition.
2. **Place an occurrence.** Choose a sprint or quarter, then its week or month.
   The arrangement displays a clip for this occurrence of the session.
3. **Choose people.** Session rows and named person columns expose native checkbox
   pads. A selected row loads the same session's controls; checking a person
   changes participation.
4. **Repeat when useful.** Add occurrence creates another placement of the same
   session. Numbered pads show and select its repetitions.
5. **Connect the result.** A handoff identifies receiving work. A response is a
   separately named card that can be routed into the next sequence.

Three Add operations keep different meanings. **Add session** creates an identity;
**Add occurrence** repeats that session; **Add sprint** or **Add quarter** creates
a planning container. Duration describes time per person for each occurrence.
Sprint and quarter placement describes where an occurrence belongs in the plan.

Occurrence pads become the sole visible repetition control in this proposed
composition. They show the count and supply Add occurrence and a scoped Remove
occurrence action. This supersedes the duplicate numeric **Working sessions**
field in the proposed rack layout. The existing compact Hours/Minutes module,
larger readout and circular steppers remain intact. An occurrence is never
silently treated as a sprint, week or additional session definition.

## A compact rack with persistent modules

The first view remains the period board and sequencer. A small tape shelf,
selected-tape strip and scope breadcrumb create the working context. Selecting
a tape unfurls a compact module in normal flow between the board and tracks.
Its heading, duration and occurrence pads remain visible while the visitor
switches among People, Placement and Routing controls inside that module.

The scope trail reads **Plan overview › Sprint 2**; the loaded module separately
names **Prototype pairing · Occurrence 2**. The overview control returns to that
scope. A session can span several periods, so the selected occurrence supplies
context while the session retains its identity. Choosing another occurrence
retains the session's shared duration and people. Closing the module returns to
its exact source and preserves unfinished values through the current draft owner.

Task navigation uses pads, object selection and the breadcrumb. Show/hide controls
express display preferences, such as whether the Event list or capacity reading
is visible. Optional modules occupy a stable attached position when shown.
Small unfurl and pad movement effects use the existing motion settings; the
selected item, scope and values remain readable with motion off.

The two rack readings keep their useful distinction: **Plan overview** places
work across periods; **Team planning** shows teams, people and shared work.
They address the same session identity. A session's people matrix may be shown
inside either composition without creating a second session or acceptance path.

## Evidence informing the composition

Official references were reviewed on 7 November 2026. They establish useful
existing interface patterns; the following adaptations are local design
inferences for this showcase. The study still needs human review for clarity.

| Reference and observed pattern | Proposed adaptation and transfer boundary |
| --- | --- |
| [Ableton Live concepts](https://www.ableton.com/en/live-manual/12/live-concepts/) distinguishes Session and Arrangement readings and a browser of reusable material. | Give the tape shelf and placed arrangement different jobs. Preserve the Studio's canonical record identity rather than importing separate musical clip collections or playback priority. |
| [Ableton Clip View](https://www.ableton.com/en/live-manual/12/clip-view/) follows the selected clip, names it and arranges its parameter panels around the available space. | Keep one selected-record module in a stable position, with compact controls and a phone reflow. The showcase can use ordinary selection without floating windows or draggable panel machinery. |
| [Logic Pro Event List](https://support.apple.com/guide/logicpro/event-list-interface-lgcp31f1a05a/mac) offers a columnar reading, event filtering and a return to its containing level. | Give the current period a bounded optional table that selects the same objects as the visual. Its role is quick orientation; comprehensive detail stays in existing reports. |
| [WAI keyboard interface guidance](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/) distinguishes focus and selection and explains native controls and authored composite behavior. | Retain native buttons, checkboxes, radios and semantic tables. Persistent selection and keyboard focus need separate visible treatments; Close restores a logical originating control. Musical styling alone supplies no reason to introduce a custom ARIA grid. |
| [WAI breadcrumb guidance](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/) describes hierarchical location and the current page. | Keep plan/period scope distinct from the selected session or person. In-page scope operations retain native buttons under a named Plan scope group; actual destinations use links. Shared people and sessions keep their identity across periods. |

The sources support selection/detail coherence and an alternate precise reading.
They do not establish visitor comprehension or require the full interaction
complexity of a digital audio workstation. The compact study is the receiving
surface for deciding which adaptations serve this About-page experience.

## Consolidate the controls outside the rack

The exploration covers the full Coordination surface, including the contents of
**Customize teams and handoffs**. Each operation gains one visible home. The
table describes prospective homes; existing controllers retain ownership until
a focused change explicitly replaces a route.

| Current area | Proposed rack home | Operation owner and distinction |
| --- | --- | --- |
| Example plan buttons, sprint/quarter choice and period count | Compact plan strip above the period board | Score/plan owners retain example replacement, regrouping and period creation. These controls change the horizon, not session repetition. |
| Session selector, name, host team, status and funding | Loaded-tape heading and compact property pads | `work-controller.mjs` retains the session draft and acceptance. A team is a host; person inclusion remains a separate operation. |
| Hours, Minutes, readout and numeric Working sessions | One duration module beside occurrence pads | `time-controls.mjs` retains duration; `session-occurrence-controls.mjs` becomes the sole visible repetition surface. |
| Session participant cards and order controls | People matrix with a selected-person strip | The session owner retains ordered participant IDs. Explicit movement reuses the shared reorder helper and motion. |
| Session relationship diagram, effort summary and support descriptions | Selected tape's concise relationship/readout strip | Existing projections supply the values; the strip keeps only the current session's useful consequence. |
| People and available time | Attached capacity module selected by person and period | `score-controller.mjs` retains period availability. Person settings retains its marked onward route and canonical person owner. |
| Stages, handoffs, decisions and delays | Relationship pads plus a compact routing module | The score owner retains stage membership, endpoint selection, decision anchors and delay placement. Each item keeps its type and identity. |
| Team arrangement reel, proposed structure and included-work amount | Team planning's preset strip and editorial board inside the darker housing | The arrangement owner retains direct selection, replacement and Undo. The editorial topology remains distinct from the participation matrix. |
| Customize teams: use/create team, team name, members and Add person | Selected-team module opened from a board card or named team pad | Accepted teams use their canonical editor. Template slots use the arrangement owner until accepted; slot identity stays distinct from accepted team identity. |
| Customize handoffs: shared object, receiving person, supporting sessions and connection status | Selected-handoff routing strip with source, receiver and supporting tape pads | The existing connection or arrangement owner receives the operation according to the selected record's identity. |
| Expected response text | Separate response card and route destination in the study | Production needs an explicit response record before this becomes durable routing. Existing text remains recoverable during any later migration. |
| Customize handoffs: Add a review session and its nested name, team, people, time, funding and status form | Create or select a supporting tape, then use the same compact session modules | Template-created work currently belongs to the arrangement transaction. A receiving adapter must preserve that owner while presenting the shared controls. |
| Connection settings and accepted-connection details | The same selected-handoff module | Existing connection identity and draft routes stay authoritative; another settings form would duplicate the operation. |
| Apply, Cancel, Close, local Undo and removal | Compact action strip attached to the selected module | Current acceptance and history owners retain their meanings. Add starts creation; final confirmation keeps the ordinary commit treatment. |
| Whole-plan cost detail and long chronological readings | Existing Investment/report routes | The amp and rack retain concise amounts. The Event list provides a bounded local reading rather than a second full-plan ledger. |

The same consolidation method can guide the remaining chapters: map the existing
operation to a selected pad and its compact module before moving its controls.
Each chapter keeps the distinctions that its values require. Change and Quality
retain their deliberate fader differences; rates retain their monetary units.

## A bounded Event list

The Event list is a small alternate reading of the selected period or tape.
Use a native table with **When**, **Item** and **Connection** columns. A row might
read **Sprint 2 · Week 1 / Prototype pairing / Receives research synthesis**.
Decisions and delays retain their named kinds. Selecting a row selects the same
record in the visual and loads its existing module.

Start with six visible rows and ordinary Previous/Next controls when needed.
The selected scope supplies the limit; the list never expands into the complete
history by default. Its visibility is a display preference. Period/subdivision
labels supply the useful order, while precise session duration stays with the
tape. This is a projection of known work and relationships, separate from an
audit log or an elapsed-minute planner.

## What the current model supports

The source already provides a strong first bridge. The
[cadence projection](../../collaboration/native-investment-studio/cadence.mjs)
derives occurrences, periods, stages, handoffs, decisions, delays and availability.
The [session owner](../../collaboration/native-investment-studio/work-controller.mjs)
already edits duration, ordered people and occurrence placement. The
[rack receiver](../../collaboration/native-investment-studio/rack-controls.mjs)
keeps one canonical form while changing its placement. The
[participation table](../../collaboration/native-investment-studio/arrangement-surfaces.mjs)
already projects session rows and person columns.

| Proposal | Current boundary | Smallest production bridge |
| --- | --- | --- |
| Compact loaded tape, persistent modules, breadcrumb and bounded Event list | Presentation and routing can use current IDs and projections. | Recompose the existing receiver, retaining stable dial nodes, draft and focus. |
| Session-by-person checkbox matrix | One ordered `personIds` list applies to every occurrence. Existing participation pads inspect their session. | Send checkbox changes to the same session owner through a small explicit adapter. Selected-row drafts can retain Apply; direct accepted changes need the existing transaction/Undo route. |
| Tape defined before people are chosen | `prepareWork` and participant replacement require at least one person; work also requires a team. | Add an explicit unassigned definition state and its investment standing. A session awaiting people should visibly say so; its price remains incomplete until its required inputs are known. |
| Different people in different occurrences | Placement has work ID, occurrence index, period and subdivision; participation belongs to the work record. | A separate membership contract is needed before a per-occurrence matrix changes effort. The first bridge keeps people shared across occurrences. |
| Independent feedback or response cards | A connection currently stores `responseExpectation` text and linked work IDs. | Introduce a small response identity with source, receiving target and state. A response can link to a session without becoming paid work itself. |
| Participation percentage | Current selected people each receive the full session duration. | Keep the separately scoped percentage contract in #798; this study can show the intended location without asserting operative costing. |

The study can demonstrate all of these interactions through its own illustrative
state. Production work should separate presentation changes from the two clear
contract additions: unassigned session definitions and routable responses.
Per-occurrence participation remains a later decision if the reviewed experience
needs it.

## Visual Fidelity Contract implications

The existing [Studio Rack family](../../visual-fidelity-contracts/studio-rack/README.md)
supplies the visual authority. The study explores a receiving composition within
that family; accepted contracts remain the runtime reference during review.

| Contract | Proposed refinement |
| --- | --- |
| [Period Kanban & Session Sequencer](../../visual-fidelity-contracts/studio-rack/period-kanban-session-sequencer.md) | Name the tape/session and clip/occurrence distinction; keep overview/period/session scope visible; give placement and repetition separate controls. |
| [Support Matrix & Stateful Pads](../../visual-fidelity-contracts/studio-rack/support-matrix-stateful-pads.md) | Distinguish checked participation, selected row and selected occurrence. Quality's matrix remains the visual reference for native checkbox pads. |
| [Precision Dials & Faders](../../visual-fidelity-contracts/studio-rack/precision-dials-faders.md) | Preserve the enclosed duration module and its peach Hours/paper Minutes hierarchy; compose occurrence pads alongside it and remove the duplicate visible count editor. |
| [Contextual Inspection & Recovery](../../visual-fidelity-contracts/studio-rack/contextual-inspection-recovery.md) | Extend the stable deck into persistent compact modules; task selection opens the relevant work surface, while show/hide expresses display preference. Preserve draft, exact return focus and the actual open-state cue. |
| [Zoetrope Preset Selection](../../visual-fidelity-contracts/studio-rack/zoetrope-preset-selection.md) | Presets visibly change the board, tape choices and routing through their existing arrangement transaction and recovery. |

The dark rack keeps its bezel, light labels and pressed selection. Editorial
cards remain a useful contrast within Team planning. A newly shared component
receives a role-based name when it has real shared consumers, such as participation
matrix or tape module; chapter-specific geometry stays with its receiver.
Ordinary phone widths retain usable controls and a named local matrix scroller.

## A bounded route to the working Studio

1. Review the isolated study for the complete visitor sequence: define a tape,
   place an occurrence, choose people, inspect a response and return to the
   overview. Record which compositions make the relationship immediately clear.
2. Deliver the view-only consolidation in a focused PR: stable loaded-tape
   module, compact duration and occurrence pads, scoped selection, and a bounded
   optional Event list. Preserve current acceptance and one canonical editor.
3. Consolidate Team planning's outside controls, including Customize teams and
   handoffs, into selected-object modules. Reuse current arrangement, team and
   connection owners through explicit adapters.
4. Add the session definition boundary in a separate PR if the reviewed flow
   confirms defining work before assigning people. Cover a useful unassigned
   example, assigning its first person, recovery and portable-plan agreement.
5. Add independent response identity/routing in its own PR. Demonstrate creating
   one response, changing its receiver and recovering the change. Reconcile
   existing expected-response text with the new representation explicitly.

Verification stays tied to the changed behavior: one populated phone/laptop
journey through selection, adjustment and return; a focused observation that
checkboxes update the intended session; and boundary checks for each new stored
contract. Existing unit and owner checks remain the regression route. Independent
review precedes merging each production increment. Public release and performance
refinement retain their separate human-cued scope.

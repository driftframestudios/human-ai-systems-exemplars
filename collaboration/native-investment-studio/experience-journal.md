# Native Studio experience journal

This record keeps the current design, state ownership and deliberate supersessions
available for re-entry. Runnable source owns behavior; the [README](README.md)
provides the practical route; GitHub owns current delivery. Historical detail
remains in Git and the linked reviewed changes. The
[implementation reference](implementation-reference.md) carries deeper contracts.

## Current working contract

The Studio is a populated About-page showcase for a busy visitor who may scan and
try a few controls. It makes cross-functional people, work, support and investment
understandable through direct exploration. Useful examples and visible changes
lead. An accepted plan supplies all six chapters; edits use existing canonical
commands and recovery owners.

`main` retains the approved reference. The living integration is `dev`, currently
receiving #820 and #821. Promotion to main and a tagged public release each await
the human's cue. Performance refinement belongs to #679. Ordinary mobile and
laptop/wide layouts are the supported visual comparison points.

### Coordination: load, arrange, inspect

The Plans cassette shelf attaches directly to the full height of the period rack.
Its blocky angled artwork and size stay intact while the surrounding controls are
more compact. At phone width the shelf becomes a horizontal strip. A cassette
selects its plan and filters the board/tracks; it closes the detail receiver.
All plans returns from this filter. Period selection remains independent, with a
visible selected sprint/quarter and Whole plan return inside the rack.

The composition reads in this order: period board, optional compact working area,
session tracks, then small People and Stages routes. An existing clip opens the
canonical session controls between board and tracks. Close restores the originating
scope. A first opening uses the downward reveal; changing the selected record
keeps the same receiver and its position. The detail border stays flush with its
rack. Duration and Working sessions sit beside one another on a wide rack;
participants and funding use neighboring space.

Empty period-lane space and the sequencer's new-session row provide named native
creation targets. Fine-pointer hover and keyboard focus expose the plus and short
label; touch keeps them visible. A click creates one accepted session in that
period, then opens editing. Existing session/participant cells retain their own
inspection or membership meaning. New plan and Add sprint/quarter remain explicit
because they create different objects. Period additions accept immediately.

Session pads own repetition in the rack, with Add session and selected-session
removal; the synchronized numeric field remains an implementation detail. The
selected pad retains its subtle movement. A stage or handoff opens its existing
relationship owner in the rack. These operations preserve the accepted model,
reference checks, proposals and shared history.

Team planning follows the horizon with its arrangement reel and concise preview,
then the delivery-phase board and shared-session matrix. A selected team replaces
the board contents with its name, stable membership pads and reorder controls.
The Delivery overview breadcrumb returns locally. Name, membership and ordering
changes accept directly. Custom teams follow their authored work stage where
available, otherwise spread across phases; their handoffs follow the receiving
team. Template-authored placements retain their meaning.

Session, person and handoff forms remain canonical and can be borrowed into the
Team planning receiver. The separate connection diagram and detached Working
sessions panel are retired from the visible composition. Their retained source
owners continue to supply shared state and forms where needed.

### People, Abilities and the other chapters

People presents its existing roster and rate/time controls directly. Roles use
one compact facet rail instead of showing every dimension at once. Contributions
appear as rows against supporting sessions; accepted links light their cells.
Receiver choice and linked work remain meaningful. Removed free-text review and
decision-boundary editors leave previously stored values intact.

Abilities retains both native support tables: What people can do and How the
team works, with responsibility, preparation, review and observation columns.
One selected compact module follows the tables. People, Prepare, Review and
Example pads select the relevant controls. The reverse-card and side-by-side
modes are retired. Existing proposals, shared work identity and pricing remain.

Change keeps its framework/viewpoint reels, piano-like keys and distinct faders.
Quality & recovery keeps its contrasting controller pads, quality/recovery reels
and dark attention display. Both retain connected support and concise explanations.
Selected signals describe plan choices; authored examples remain distinct from
observed evidence. Quantity, emphasis and motion changes have visible effects.

Investment's current VHS-C decks organize Plan investment, Compare a change and
Keep a plan. Deck navigation changes the view while canonical pricing, baseline,
history and saved-plan previews retain their owners. The richer independently
editable comparison decks remain with #818. The chocolate companion surface,
chunky tape depth, internal grip texture and static monetary readout positions
remain preserved references.

### State, people and recovery

| Owned meaning | Current behavior |
| --- | --- |
| Accepted plan | One immutable projection supplies accepted amounts, relationships, comparisons and downloads. |
| Ordinary editor proposal | Raw values and selections remain in the coordinator until Apply. Cancel restores accepted values; Close can preserve a saved edit. |
| Direct rack operation | Arrangement selection, team membership/name/order, period creation and new-session creation use canonical accepted commands. |
| Global Undo | A stable native amp control describes accepted history and remains disabled at zero. Cassette selection adds no local Undo. |
| Saved edit | Target-bound unfinished work remains distinct from accepted history. A changed accepted identity may require explicit review in the visible rack before an edit lease resumes. |
| Baseline | An independent comparison and restore point, separate from Undo and unfinished edits. |
| Person | A stable identity with role-based example name, rate and funded-time account; may join several teams and sessions. |
| Membership and participation | Independent relationships. Known people can participate across team boundaries. |
| Contribution | Functional work linked to people and sessions, with retained responsibility fields; membership alone grants no decision authority. |
| Effort and funding | Duration, session count and participants establish effort. Shared work is priced once; funded staffing and extra investment stay separate. |
| Unknown and zero | A blank value remains unknown. Zero is an entered value. An explicit dial gesture can establish a value. |
| Removal | A named object and reference-aware canonical command determine scope. Reversible Remove has quiet rose treatment. |
| Evidence | Planned support, authored rehearsal and recorded observation have distinct meanings. |

The amp's Undo uses the same history as Investment. It parks unfinished edits
before returning to the prior accepted projection. New-session creation can be
undone independently of later unaccepted field changes. Canonical reference checks
remain useful when a record is shared; future atomic unlink/reassign routes need
their own model boundary.

Creating a prerequisite returns to the same visible session receiver and focuses
its review or requested field. Empty-plan creation uses that receiver directly;
completion clears the finished detour. Team name changes keep a stable Team
settings heading so accepting text preserves the next membership click's position.
The focused repairs are tracked by #822 and #823.

### Visual and interaction contract

The [Studio Rack family](../../visual-fidelity-contracts/studio-rack/README.md)
separates pale editorial reading from dark instrument controls. The workbench's
compact panel scale is the receiving direction. Reduce repeated headings,
wrappers and control bulk before reducing legibility. The Plans shelf retains
its approved size. Local tables scroll within their rack at phone widths.

Ordinary local controls have light borders and restrained depth. A selected pad
has a clear pressed state; a disclosure caret reflects the receiver's actual
visibility. Apply retains a raised primary treatment. Cancel is ghost. Reversible
Remove is muted rose with a named object. A plus means starting creation, never
confirming an already-created proposal. Empty creation slots progressively replace
standalone Add buttons when their object and scope are unambiguous. The
[research synthesis](rack-control-research.md) gives the evidence and transfer limits.

Duration receivers adopt the exact preserved workbench geometry: equal 64px dials,
8px face inset, stationary gradient/rim/shadow, rotating 4×12px pointer, peach
Hours and paper Minutes. The shared dark readout sits above them. Exact fields
and 30px circular steps sit below/right with the preserved gap; the two columns
wrap internally at phone widths. These smaller controls remain native and named.
Money dials retain their separate coarse/fine quantity contract.

Full Studio motion is the authored preference; visitors may lower it and system
reduced-motion is honored. Selected occurrence pads keep their small bounce.
Editorial attachments retain their spring reveal. Keyboard focus, written state,
contrast and forced-color behavior carry meaning independently of motion.

## Preserved workbench

The standalone [workbench](../../planning/context-canvas/studio-rack-tape-study.html)
remains in planning. PR #814 preserved it on main/dev. Its page-local model is a
reference for interaction and artwork; production commands remain in the Showcase.

- The cassette art baseline is `cedafc3f17c417cf5c90cacb5b1a696acf9cc3c1`.
- Duration geometry is preserved from `be8ec7f8ebfafa6aaef9958d088411e45df80f8a`,
  with the later fixed-face lighting correction.
- Investment artwork and connected-reel reference is `93bc69a`.

The dedicated [cassette](../../visual-fidelity-contracts/studio-rack/cassette-plan-shelf.md),
[duration](../../visual-fidelity-contracts/studio-rack/loaded-tape-duration-panel.md)
and [Investment](../../visual-fidelity-contracts/studio-rack/investment-master-reels.md)
contracts preserve exact styling and motion. Main keeps its Showcase reference
while dev receives selected portions. Independent response cards remain with #816;
participant time shares remain with #798; production Reset remains with #808.

## Superseded directions

| Earlier direction | Current receiving decision |
| --- | --- |
| #813 cassette selection opens editing and offers Undo beside the shelf | #820 loads plan scope with detail closed; Undo belongs to native amp controls. |
| Team name/membership changes require Apply and a proposed total | Direct canonical team changes update the board and shared accepted history. |
| All custom teams fall into Planning | Existing stage relationships or distributed phase placement keep the delivery board balanced. |
| Separate connection diagram and detached session settings | In-rack board/track routes use the canonical owners locally. |
| Reverse/beside Abilities views and nested detail groups | Comparable support tables plus one selected compact module. |
| Rates disclosure and long contribution note editors | Direct roster/rate controls, role facets and a contribution/session matrix; stored note data is retained. |
| Large raised buttons for most actions | Quiet local controls, preserved selected-state artwork and stronger Apply emphasis. |
| Standalone Add controls in every lane | Named empty creation areas reuse the existing accepted creation command where scope is clear. |
| Showcase-specific duration faces and duplicate repetition stepper | Exact workbench duration specimen plus session pads in the rack. |
| Elapsed minutes as enterprise plan navigation | Named sprints/quarters, with weeks/months inside each period. |
| Every detail visible on the About landing surface | Visual overview first; concise local inspection carries detail. |

This reconciliation replaces the accumulated chronological journal with a current
working contract. The earlier record, including interim counts and rejected
approaches, remains recoverable in Git. It does not change the preserved specimen.

## Evidence and next receiver

Each receiving PR owns its normalized source/browser observations and independent
review. Checks should distinguish a consequential state or interaction fault:
creation and Undo, selected scope, direct membership, parked drafts, support-cell
routing, ordinary mobile containment and readable focus. Arithmetic inventories
and repeated all-page screenshots are unnecessary for these changes.

Use the README to run the current proof, the Visual Fidelity Contracts for
composition, and #820/#821 for the present delivery. Broader financial models,
response records, performance and public release retain their separate issues.

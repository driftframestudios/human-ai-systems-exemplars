# Studio Rack Composition

Make people, shared work and investment easy to explore through a compact,
tactile planning instrument. A visitor can scan a populated example, select a
period or pad, adjust a useful quantity and see the related work change. The
[running About Studio](../../context-canvas-project-surface/context-canvas/index.html#native-studio-coordination)
is the implementation reference.

**Standing:** review candidate `0.1.0`; ID `vfc:studio-rack-composition`;
dev receiving contract revised 8 November 2026 for
[#828](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/828).
`main` retains the approved Showcase reference. Promotion from `dev` and a
tagged public release each require a human cue. The receiving PR records actual
verification and independent review.

## Current composition

Coordination starts with the Plans cassette shelf, sprint/quarter board and
Session tracks. A cassette filters the work with detail closed. All plans clears
that filter; Plan overview returns from a selected sprint or quarter. These
scope controls remain inside the rack above its local scroll areas.

A selected session opens its canonical controls between board and tracks.
Duration and Working sessions fill neighboring dark modules. Duration preserves
the approved 64px fixed-light dials, peach Hours, paper Minutes and shared readout.
Working sessions places Add at the top right and Remove at the bottom right.
Funding and Status use large named radio pads, with the radio at the top left
and a short explanation beside it. Participants remain a separate module.

Team planning follows with its arrangement reel, editorial delivery-phase board
and darker Shared sessions matrix. Direct team name, membership and ordering
updates keep the matrix visible. Person and handoff editors use the delivery
working area while Shared sessions remains independent. Creating a team from
a handoff returns to that retained handoff and its requested team field.

People contains local person/team editors in its roster racks. Abilities retains
both support tables and one selected module for responsibility, preparation,
review or observation. Useful record additions accept immediately; later field
and support-assignment proposals keep their own Apply boundary. Investment's
VHS-C decks organize Plan investment, Compare a change and Keep a plan using the
existing pricing, baseline and saved-plan owners.

## Choose the operation contract

| Visitor operation | Contract |
| --- | --- |
| Move between an overview, period or delivery phase and its work | [Period Kanban & Session Sequencer](period-kanban-session-sequencer.md) |
| Compare support and select the work behind a cell | [Support Matrix & Stateful Pads](support-matrix-stateful-pads.md) |
| Explore a populated configuration | [Zoetrope Preset Selection](zoetrope-preset-selection.md) |
| Adjust time, money or emphasis | [Precision Dials & Faders](precision-dials-faders.md) |
| Open detail, retain an edit and return | [Contextual Inspection & Recovery](contextual-inspection-recovery.md) |

Pale editorial areas support reading and relationship context. Dark instrument
areas support selection, quantities and their responses. Use each where its
contrast helps the visitor. Chapter-specific rhythm, density and palette remain
available; Quality's track matrix is the preferred precedent for new selection
racks, while Change and Quality retain their different fader treatments.

The [Tiffany Ledger Field](../tiffany-ledger-field.md) owns the About composition.
[ASCII Zine Field](../ascii-zine-field.md) supplies restrained print character;
[Cobalt Operating Field](../cobalt-operating-field.md) supplies related guidance
for named work relationships. Decorative texture stays clear of labels, focus
and hit targets.

## Control meaning and recovery

| Operation | Cue and acceptance |
| --- | --- |
| Add a working session to an existing plan | Plus target in that plan's track cell; appends one accepted occurrence in the chosen period and retains earlier placements |
| Create a separate plan | Period-lane creation or the New plan track row adds a distinct record and keeps All plans visible; shelf New plan deliberately loads its new cassette |
| Inspect work or a relationship | Named pad or key; pressed state identifies the record and its caret follows the visible receiver |
| Include a person or choose a setting | Native checkbox/radio pad with persistent selected state |
| Accept a proposal | Raised Apply beside Close, delegated to the canonical bottom action; both carry the same label, validation and disabled state |
| Close or return | Ghost control retains unfinished entries and restores the named source |
| Cancel edits | Ghost control restores accepted values; an earlier accepted addition remains available |
| Remove an object | Named muted-rose action, with the existing reference-aware recovery route |
| Undo accepted changes | Stable native amp control backed by shared history |

The top Apply control is a second entry to the same operation. It preserves
canonical validation and return-focus behavior: an editor that remains open can
retain its header focus; a completed score edit returns to its originating marker.
Canonical removal
confirmation remains with the bottom action rather than acquiring an Apply
alias. A final Add-to-plan confirmation describes acceptance and carries no
creation plus.

A fresh handoff asks for From work, To work and an optional Team connection.
Its initial actions complete, cancel or close that proposal. After acceptance,
decisions, delays and removal become meaningful neighboring operations. A
handoff's fields explain the relationship; a repeated cost preview is unnecessary.

One immutable accepted projection supplies money, relationships and downloads.
Drafts, saved edits, Undo and baseline each retain their existing owner.
Selection, inclusion, authored examples and recorded evidence keep distinct
meanings. The [control research](../../collaboration/native-investment-studio/rack-control-research.md)
and [removal research](../../collaboration/native-investment-studio/removal-recovery-research.md)
record the evidence and limits behind these choices.

## Artwork, geometry and motion

Upper-left light, modest corners and restrained lower-right or inset depth keep
the tactile character. Housing and shadows stay fixed while pointers and
selected pads respond. Text, borders and written state supplement color.

Full-speed is the authored motion default; Half-speed and Off remain available.
System reduced-motion settles the same readable state directly. Chapter arrival,
contextual movement, local inspection and keyed pad movement retain different
treatments. Loaded detail has the short downward unfurl; attached editorial
drawers keep their spring reveal. Motion remains outside serialized plan state.

Ordinary phone and laptop/wide layouts are the receiving range. Controls reflow;
two-dimensional tables and cassette shelves use named local scroll regions.
Headers contrast against their actual background. The pale Sessions to place
tray uses dark text, while dark rack captions retain light text. Forced colors
keeps native controls and selection available.

The preserved [chapter workbench](../../planning/context-canvas/studio-rack-tape-study.html)
stays in planning as a separate illustrative reference. Its exact component
contracts are:

- [Cassette Plan Shelf](cassette-plan-shelf.md): angled blocky tape faces, selected
  outline, hover movement and horizontal shelf at narrow widths.
- [Loaded Tape Duration Panel](loaded-tape-duration-panel.md): compact geometry,
  palette, fixed dial lighting and readout relationship.
- [Investment Master Shelf & Financial Reels](investment-master-reels.md):
  chunky VHS-C bodies, internal grip texture, chocolate companions and fixed
  monetary readout layouts.
- [Chapter Workbench Study](chapter-workbench-study.md): relationships among the
  independent illustrative chapter layouts and state.

## Source and extension ownership

The About HTML loads `about.css`, shared `studio-instrument.css`, then chapter
extensions. About maps `--native-*`; the shared instrument owner maps
`--studio-*`. Shared classes describe actual roles such as track key, quantity
module, creation zone and companion drawer. Extract a generic owner when several
receivers need the same behavior; retain chapter-specific geometry and art.

| Owner | Responsibility |
| --- | --- |
| [Shared instrument CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-instrument.css) | Shared palette, keys, creation zones, editors, Apply and recovery treatment |
| [Session CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-session.css) | Duration/Working sessions placement, participant layout, Funding and Status pads |
| [Arrangement CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-arrangements.css) | Editorial delivery board, local team controls and darker participation rack |
| [Abilities](../../context-canvas-project-surface/context-canvas/styles/routes/studio-abilities.css), [Change](../../context-canvas-project-surface/context-canvas/styles/routes/studio-change.css), [Assurance](../../context-canvas-project-surface/context-canvas/styles/routes/studio-assurance.css) CSS | Chapter-specific compositions |
| [Controller](../../collaboration/native-investment-studio/controller.mjs), [editing](../../collaboration/native-investment-studio/editing.mjs), [rack controls](../../collaboration/native-investment-studio/rack-controls.mjs) | Live receivers, retained drafts, shared Apply delegation and return focus |
| [Cadence view](../../collaboration/native-investment-studio/cadence-view.mjs), [score controller](../../collaboration/native-investment-studio/score-controller.mjs) | Period scope, session append/new-plan distinction and relationship inspection |
| [Work controller](../../collaboration/native-investment-studio/work-controller.mjs), [occurrence controls](../../collaboration/native-investment-studio/session-occurrence-controls.mjs) | Canonical session fields, repetition and placement |
| [Team planning controller](../../collaboration/native-investment-studio/connection-template-controller.mjs), [delivery board](../../collaboration/native-investment-studio/delivery-board.mjs), [arrangement surfaces](../../collaboration/native-investment-studio/arrangement-surfaces.mjs) | Direct arrangement acceptance, phase scope and participation reading |

## Evidence, supersession and re-entry

The [instrument research](../../collaboration/native-investment-studio/usability-research.md#digital-instrument-composition--5-november-2026)
connects official manuals, WAI guidance and local decisions. Manuals supply
interaction precedents; a human walkthrough evaluates this visitor experience.
The narrower operation contracts route to browser checks. The
[shell route](../../tests/native-investment-studio/shell.browser.mjs) observes
chapter, motion, focus and host behavior; [foundation checks](../../tests/visual-fidelity-contracts/foundation-contracts.test.mjs)
establish catalog validity and source-path closure.

This current contract replaces the accumulated implementation chronology.
Meaningful supersessions are explicit:

| Earlier direction | Current receiving contract |
| --- | --- |
| A blank existing-plan track cell is descriptive only | It can append a working session to that plan; earlier placements remain visible |
| Every creation auto-loads the newest cassette | Period/track creation retains All plans; the shelf alone loads its new cassette |
| #825 Working sessions Remove sits bottom-left | #828 places it bottom-right; Add remains top-right |
| Apply appears only at the end of an editor | Shared top Apply delegates to that same canonical action; the bottom action remains |
| A new handoff shows every follow-on action | Its creation fields and acceptance lead; decisions/delays/removal follow acceptance |
| Local cassette Undo or detached primary editors | Amp Undo and local canonical receivers retain their current roles |

[The current journal](../../collaboration/native-investment-studio/experience-journal.md)
records the broader current rationale. #828 is the receiving increment on dev.
Participant shares (#798), independent response records (#816), deeper financial
decks (#818), performance (#679), production Reset (#808) and public release
(#686) keep their own outcomes and authority. Revisit a contract when its data
meaning, receiver, acceptance boundary or visual relationship changes.

# Precision Dials & Faders

Make time, money and emphasis tangible while keeping exact values easy to read
and enter. A dial or fader sits beside its named quantity, unit and native field;
each route changes the same editor proposal. Session time, hourly rates and the
Change/Quality fader banks are current receivers.

**Standing:** review candidate `0.1.0`; ID `vfc:precision-dials-faders`;
reviewed 8 November 2026 for shared circular steps in
[#865](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/865), following the compact Person receiver in
[#836](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/836). It inherits the shared control and motion treatment in
[Studio Rack Composition](README.md).
The separately approved [Loaded Tape Duration Panel](loaded-tape-duration-panel.md)
preserves an exact `dev` study reference. Its smaller equal-sized dials and
neighboring occurrence panel have their own scope. Main retains the established
geometry below; dev duration receivers adopt the complete preserved module in
#820 while keeping the same acceptance owners.

## Fit and smallest useful dose

Use a dial for deliberate coarse/fine adjustment and a fader for a bounded value
whose relation to neighboring channels is useful. Exact entry remains the direct
route for a known amount. One labeled quantity, one tactile control and its exact
field form a complete dose. Brief labels replace repeated operating paragraphs.

## Quantity and visual invariants

| Current quantity | Receiving treatment |
| --- | --- |
| Hours and Minutes | One enclosed duration module; larger combined readout above peach Hours and paper Minutes, with borderless inner groups |
| Hourly rate | One named enclosure for relative $10/$5 dials, the exact amount and centered $1 steps |
| Framework component emphasis | Aligned fader channels with names, values and distinct active fill |
| Quality assumptions | Named faders beside the reference visualization and authored result |

The dial's housing and light stay fixed while its pointer turns. The pointer
stays in the outer half of the face toward the indicated endpoint, keeping its outward
direction legible at both coarse and fine sizes. Step buttons
form a compact centered pair beneath the matching field. Fader channels align
their labels, tracks and readouts; descriptive text has its own reading area.
The thumb stays visually distinct from the active fill. A selected channel uses
more than color alone.

Shared instrument CSS owns each step button's circular geometry: equal fixed
width and height, centered glyph, zero padding and a size that survives flex
compression. Ordinary quantities use 2.75rem steps (44px at the base text size). The preserved duration and
Investment money modules use 30px steps. Each chapter retains its existing
field width, pair placement, visible gap and color treatment; the pair sits below
its input. Duration retains its 68px field and two 30px columns with an 8px gap;
Investment money places the pair at the exact field's ends. Change and Abilities
use a 7rem input-and-step measure so the circles align beneath the field ends.
Generic action-button
padding applies to actions, while these precision controls retain their shared
geometry. This ownership supersedes competing circular sizing in chapter rules.

Change and Quality intentionally retain different fader skins. The shared
contract is named quantity, readable endpoints, exact value and visible response;
their channel geometry, palette and texture express their own chapter. Reusing a
Quality selection matrix in another rack leaves this distinction intact.

Absolute time ranges and relative monetary increments retain different meanings.
The rate adapter preserves cents while stepping whole dollars. An untouched
blank remains unknown; an explicit rate gesture may begin an amount. Invalid
typed text stays visible for correction while the tactile adapter rests. The
receiving editor owns its bounds, raw spelling, parsing and acceptance.

## Gesture and recovery boundary

A gesture changes one current editor identity. Pointer capture lasts only for
that gesture. Release completes its adjustment. If capture or focus ends during
the gesture, the editor retains the displayed adjustment. A later focus change
also keeps the completed amount. Explicit Escape or `pointercancel` restores the
starting raw value while that same draft still owns it. Retiring or parking an
editor releases the gesture so later events cannot write into its successor.
A duration turn captures its angular origin at pointerdown and keeps that origin
through movement and pointerup. Focused-control scrolling therefore preserves
the intended adjustment; release discards the origin for the next turn.

Native keyboard input, exact entry and single-point step alternatives remain
available. Forced colors may expose the native range directly. Page scrolling
keeps its ordinary owner. Apply accepts a proposal, Cancel restores accepted
values, and Undo operates on accepted history.

## Source and evidence

| Owner or observation | Responsibility |
| --- | --- |
| [Rate controls](../../collaboration/native-investment-studio/rate-controls.mjs) | Relative coarse/fine gestures and current-editor checks |
| [Time controls](../../collaboration/native-investment-studio/time-controls.mjs) | Shared Hours/Minutes control and exact field agreement |
| [About session markup](../../context-canvas-project-surface/context-canvas/index.html) and [work controller](../../collaboration/native-investment-studio/work-controller.mjs) | Static duration controls, field identities and session readout projection |
| [Change](../../collaboration/native-investment-studio/change-controller.mjs) and [Assurance controllers](../../collaboration/native-investment-studio/assurance-controller.mjs) | Fader meaning and result projection |
| [Shared instrument CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-instrument.css) | Circular step geometry across numeric, rate, duration and Investment money controls; quantity-module enclosures, duration hierarchy and responsive grouping |
| [People CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-people.css) | Compact canonical Person form, 64px coarse and 56px fine rate dials, exact fields and steps; same owner when Coordination borrows the form |
| [About CSS](../../context-canvas-project-surface/context-canvas/styles/routes/about.css), [Change CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-change.css), [Assurance CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-assurance.css) | Retained dial artwork, stepper placement and chapter-specific faders |
| [Investment CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-investment.css) | Money enclosure, exact-field and below-field pair placement; shared step geometry stays separate from general action padding |
| [Team browser checks](../../tests/native-investment-studio/team-controller.browser.mjs) and [session browser checks](../../tests/native-investment-studio/session.browser.mjs) | Exact value agreement, gesture/cancellation, retained drafts and Apply/Undo |
| [Change](../../tests/native-investment-studio/change.browser.mjs) and [Assurance browser checks](../../tests/native-investment-studio/assurance.browser.mjs) | Framework-specific values and visible consequences |
| [Investment browser checks](../../tests/native-investment-studio/investment.browser.mjs) and [Assurance browser checks](../../tests/native-investment-studio/assurance.browser.mjs) | Square circular steps, below-input placement and contextual action legibility at laptop and phone widths |

[VCV parameter commands](https://vcvrack.com/manual/KeyCommands) pair tactile
adjustment with exact entry. The Studio adapts that principle through its own
units and draft model. The [WAI slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
guides naming, values and keyboard behavior; it also calls for device-specific
touch-assistive-technology testing. These are implementation boundaries, not a
claim of complete device conformance. The
[rotary research record](../../collaboration/native-investment-studio/usability-research.md#working-rotary-control-and-contextual-editor)
preserves the pointer/cancellation rationale.

## Enclosed quantities and re-entry

The [control enclosure increment](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/767)
uses `studio-quantity-module` as the shared housing for duration and rates.
`studio-duration` contains **Time per person, per session**, the combined output
and both Hours/Minutes dial–field–step groups. Its readout sits above both dials
and is larger than the individual field values. This supersedes the earlier
beside-readout wide layout.

The [dial refinement](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/788)
gives Hours a peach inner face and Minutes a paper face. These groups have no
visible border; the outer duration enclosure carries the boundary. Hours uses
the monetary coarse dial's 6rem size and Minutes the fine dial's 4.75rem size.
Both use the same .7rem face inset and pointer treatment as rate controls: at
most 1rem long, shortened proportionately to stay outside the face's center.
This supersedes the earlier peach Minutes enclosure and smaller duration-only
dial sizes. Labels and size carry the distinction alongside color. Each
dial sits above-left of its exact field and stepper. The input remains above the
circular minus/plus pair, with the visible gap and the pair aligned to the
field's start and end. The fixed housing, light and pointer artwork retain their
existing treatment.

Hours and Minutes share a row when the receiving space permits it and reflow
inside the enclosure at ordinary phone widths. The output remains above the
controls. At enlarged text, its quantity columns reflow while each numeric
reading stays on one line; valid, blank and corrected values preserve the
control positions below it. In the current production composition,
**Working sessions** stays nearby as a separate repetition control:
duration changes the length of each occurrence, while the count determines how
many occur. The static About session markup and dynamic `createTimeControls`
factory use the same composition and retain their output/input associations.

The rate enclosure groups one named hourly rate with the $10/$5 dials, shared
exact field and centered $1 steps. Duration and money retain their distinct
units and value owners. Shared enclosure geometry lives in
`studio-instrument.css`; the former competing About duration layouts are
reconciled into that owner. Current raw-entry, gesture, editor identity and
Apply/Cancel owners continue to govern values.

The adjacent [person/team receiver](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/757)
borrows the canonical controls, including the person's enclosed rate module.
#836 gives that same form its compact `studio-people.css` geometry in both
People and Coordination. The 64px coarse and 56px fine faces preserve distinct
$10/$5 gesture roles beside exact entry and $1 steps; Apply still accepts the
person proposal. Its local close retains the current proposal; returning to People restores the
same controls and value owner. [Session editing](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/768)
places the canonical duration module in its Coordination receiver. Plan overview's
Session detail deck (#789) holds that module between its period board and Session
tracks; Team planning retains the adjacent editor. The larger readout, peach
Hours and secondary paper Minutes remain one enclosure; exact fields and circular
steps preserve their layout. Close retains incomplete exact entry. Numbered
occurrence pads select placement; the nearby exact count and circular steps
retain repetition meaning. One duration and participant set apply to every
occurrence.

### Approved development composition

The [tape workbench study](../../planning/context-canvas/studio-rack-tape-study.html)
has a human-approved duration and Working sessions layout, preserved exactly in
its own [Loaded Tape Duration Panel contract](loaded-tape-duration-panel.md) at
revision `be8ec7f8ebfafa6aaef9958d088411e45df80f8a`. The complete panel retains its
compact title/readout row, peach Hours and paper Minutes, equal `64px` dials,
exact fields and circular steppers. These dimensions define the preserved study
specimen. The receiving dev duration module below adopts its exact face and step geometry.

The two neighboring modules use `minmax(230px,1fr) minmax(240px,1fr)` columns,
with `.7rem` gap and padding, above `1000px`. They stack at `1000px` and below.
Occurrence pads and Add/Remove occurrence supply the visible repetition controls;
the duplicate numeric Working sessions editor is hidden in this illustration.
This approved development reference replaces open sizing exploration for those
panels. Its standalone contract records the full cascade, source owner and recall
route while cassette artwork continues to evolve. Production adoption remains a
separate reviewed change on dev; Showcase promotion to main remains human-cued.
The planning specimen itself is authorized for main/dev preservation in #810.

### Receiving dev session composition

#820 supersedes #811's partial adaptation with the preserved workbench duration
module throughout the dev Showcase. Shared instrument CSS owns the dark enclosure,
title/readout row, equal 64px dials, 8px face inset and 30px circular steps. The
stationary gradient, rim and shadow surround a rotating 4×12px pointer. Hours
keeps peach and Minutes paper; the 68px exact field and two circular buttons sit
below-right with the preserved .5rem horizontal gap. This is the adopted duration
skin; monetary dials retain their distinct coarse/fine contract.

Duration and placement share equal columns in a wide session rack, then stack.
The title/readout row and readout segments wrap when enlarged text requires it;
the complete readout remains within its housing (#846). Normal-size geometry
continues to follow the preserved specimen.
Session pads select and place repetitions, with Add session and Remove session
using the canonical draft owner. The duplicate numeric count stays synchronized
and hidden in rack mode. Main retains its accepted reference until promotion is
human-cued. The planning specimen itself remains unchanged.

### Participant time shares

The future [participant fader contract](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/798)
is separate from #771's shared movement controls. **Time in this session** would
mean one person's share of one occurrence, with percentage and corresponding
duration visible together. Default 100% preserves existing examples. Shares are
independent, so several people may each use 100%. A 0% share would retain selected
identity with a zero-time reading; inclusion remains its own operation.

This is future model work. The stored contract and projection must establish how
a share changes that person's effort, cost and funded-time consumption before an
operative fader appears. Session duration, repetitions, placement and other
people retain their separate values. Exact input, Apply/Cancel, Undo and portable
reports must describe the same share; legacy plans retain 100% semantics. A
project/period availability fader needs its own named period and available-time
denominator. Current participants receive the full session duration, and the
enclosed Hours/Minutes controls retain their existing quantity and art direction.

Use real pointer gestures when investigating an engine-specific reset: brief
inside/outside movements, release, focus transfer and deliberate cancellation
distinguish completion from rollback. The enclosure's focused observation should
also establish readable labels, contained controls and visible feedback at phone
and laptop widths. Revisit when value meaning, bounds, native event handling or
editor identity changes. Its receiving PR supplies actual implementation and
browser evidence; this contract records the shared composition.

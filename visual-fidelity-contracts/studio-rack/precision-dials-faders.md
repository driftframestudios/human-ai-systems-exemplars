# Precision Dials & Faders

Make time, money and emphasis tangible while keeping exact values easy to read
and enter. A dial or fader sits beside its named quantity, unit and native field;
each route changes the same editor proposal. Session time, hourly rates and the
Change/Quality fader banks are current receivers.

**Standing:** review candidate `0.1.0`; ID `vfc:precision-dials-faders`;
reviewed 7 November 2026. It inherits the shared control and motion treatment in
[Studio Rack Composition](README.md).

## Fit and smallest useful dose

Use a dial for deliberate coarse/fine adjustment and a fader for a bounded value
whose relation to neighboring channels is useful. Exact entry remains the direct
route for a known amount. One labeled quantity, one tactile control and its exact
field form a complete dose. Brief labels replace repeated operating paragraphs.

## Quantity and visual invariants

| Current quantity | Receiving treatment |
| --- | --- |
| Hours and Minutes | Larger Hours dial, smaller Minutes dial, each beside its own exact field |
| Hourly rate | Relative $10 and $5 dials, exact amount, centered $1 step buttons |
| Framework component emphasis | Aligned fader channels with names, values and distinct active fill |
| Quality assumptions | Named faders beside the reference visualization and authored result |

The dial's housing and light stay fixed while its pointer turns. Step buttons
form a compact centered pair beneath the matching field. Fader channels align
their labels, tracks and readouts; descriptive text has its own reading area.
The thumb stays visually distinct from the active fill. A selected channel uses
more than color alone.

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

Native keyboard input, exact entry and single-point step alternatives remain
available. Forced colors may expose the native range directly. Page scrolling
keeps its ordinary owner. Apply accepts a proposal, Cancel restores accepted
values, and Undo operates on accepted history.

## Source and evidence

| Owner or observation | Responsibility |
| --- | --- |
| [Rate controls](../../collaboration/native-investment-studio/rate-controls.mjs) | Relative coarse/fine gestures and current-editor checks |
| [Time controls](../../collaboration/native-investment-studio/time-controls.mjs) | Shared Hours/Minutes control and exact field agreement |
| [Change](../../collaboration/native-investment-studio/change-controller.mjs) and [Assurance controllers](../../collaboration/native-investment-studio/assurance-controller.mjs) | Fader meaning and result projection |
| [About CSS](../../context-canvas-project-surface/context-canvas/styles/routes/about.css), [shared instrument CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-instrument.css), [Change CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-change.css), [Assurance CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-assurance.css) | Existing dial, stepper and fader geometry |
| [Team browser checks](../../tests/native-investment-studio/team-controller.browser.mjs) and [session browser checks](../../tests/native-investment-studio/session.browser.mjs) | Exact value agreement, gesture/cancellation, retained drafts and Apply/Undo |
| [Change](../../tests/native-investment-studio/change.browser.mjs) and [Assurance browser checks](../../tests/native-investment-studio/assurance.browser.mjs) | Framework-specific values and visible consequences |

[VCV parameter commands](https://vcvrack.com/manual/KeyCommands) pair tactile
adjustment with exact entry. The Studio adapts that principle through its own
units and draft model. The [WAI slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
guides naming, values and keyboard behavior; it also calls for device-specific
touch-assistive-technology testing. These are implementation boundaries, not a
claim of complete device conformance. The
[rotary research record](../../collaboration/native-investment-studio/usability-research.md#working-rotary-control-and-contextual-editor)
preserves the pointer/cancellation rationale.

## Re-entry and future scope

Use real pointer gestures when investigating an engine-specific reset: brief
inside/outside movements, release, focus transfer and deliberate cancellation
distinguish completion from rollback. Revisit when value meaning, bounds, native
event handling or editor identity changes. Additional controls or rearranged
racks remain separately scoped; preserve the current tactile styling while
repairing a demonstrated interaction fault.

# Strategy Canvas — direct manipulation and room ergonomics payload

```yaml
research_payload:
  id: "prototype-exemplars.strategy-canvas-room-ergonomics.v0.1"
  question: "How can a plotted point become a precise, accessible, room-scale collaboration control?"
  completion_condition: "Every point operation works by drag, tap, buttons, and labelled input at desk, touch, zoom, and presentation sizes."
```

## Handle anatomy

An interactive point contains four related geometries:

1. **Exact-value center** — a small tick or dot on the true coordinate.
2. **Visible state body** — approximately 48–56px at desk size and 64–80px in presentation mode.
3. **Pointer target halo** — approximately 64–96px, allowed to overlap when hit testing resolves the nearest active series.
4. **Focus and status ring** — high-contrast outline plus written value and series name.

The oversized body supports touch, reduced dexterity, projection distance, and facilitator confidence. The center preserves analytic precision. Shape, fill, line pattern, and direct labels carry series identity alongside color.

## Direct-manipulation semantics

| Session context | Handle movement changes | State preserved beside it |
| --- | --- | --- |
| authored setup | source series draft | prior fixture/source value through undo |
| open private ballot | current participant draft | submitted ballots and concealed aggregate |
| revealed discussion | working scenario | group aggregate and all ballots |
| reviewed state | new scenario or amendment request | reviewed snapshot |

Post-reveal movement always acts on a proposal series. “Return this point to group reading” and “Return entire proposal” remain visible.

## Input routes

- Vertical pointer drag.
- Tap or click at a scale position.
- Large decrement/increment buttons.
- Native number or range input with written label and anchor help.
- Keyboard arrows; larger steps with Page Up/Page Down; endpoints with Home/End.
- Optional direct anchor buttons for named scale states.

All routes dispatch the same semantic action. The activity history records the committed value rather than every pointer frame.

## Pointer implementation contract

- Pointer Events unify mouse, touch, and pen.
- Pointer capture begins only after a handle is activated.
- `touch-action` is scoped to the handle/plot interaction; the surrounding page retains ordinary scrolling.
- SVG screen coordinates convert through the current transformation matrix.
- Values clamp to dimension scale and snap to declared step.
- Visual movement is scheduled with `requestAnimationFrame`.
- Pointer cancellation and Escape restore the starting value.
- Release commits one reducer event and one assistive announcement.
- Event listeners use delegated handling or an `AbortController` lifecycle.

## Presentation mode

Presentation mode is a deliberate view choice. Browser viewport alone cannot infer projector distance, room size, or touch hardware.

It provides:

- 64–80px visible handles and stronger path strokes;
- 20–24px minimum supporting text;
- simplified minor grid;
- direct series labels;
- selected-dimension magnifier and anchor text;
- large Undo, Return to group, End round, Reveal, and Review controls;
- participant/round state in writing;
- optional Fullscreen API enhancement;
- a complete layout when fullscreen permission is unavailable.

Target environments:

- laptop at 1280×720;
- room display at 1920×1080;
- high-density display at 2560×1440 and 3840×2160;
- touch display and trackpad/pointer presentation;
- browser zoom at 200% and 400%.

## Overlap and collision

When several series share a value:

- preserve the exact shared coordinate;
- use concentric rings, small deterministic offsets, or a combined multi-series marker;
- expose all series in the selected-dimension inspector;
- choose the nearest or currently selected series for pointer input;
- provide a series selector before ambiguous manipulation;
- announce the chosen series and value.

Distribution marks sit behind primary handles and become detailed only on selection.

## Narrow viewport strategy

The document remains contained. The chart may use a named local horizontal scroller with:

- a stable working width;
- a sticky y-axis when browser evidence confirms clean behavior;
- a visible “scroll dimensions” instruction;
- Previous/Next dimension controls;
- direct fragment links or a compact dimension rail;
- a focused-dimension inspector below the plot;
- complete semantic table access outside the scroller.

The embedded surface uses a compact local tool strip. The full-view route exposes the complete phase rail and says that it opens in a new tab.

## Motion and feedback

Short transitions may connect an input change to its point. Reduced-motion mode changes immediately. Motion carries no unique meaning.

During drag:

- show a value tag and nearest anchor;
- keep the live region quiet;
- announce the committed value at release;
- show the state consequence, such as “Working proposal changed; group reading remains 6.”

## Falsifiers

- The visible circle is large while the actual pointer target stays small.
- Dragging the chart prevents ordinary page scrolling outside the active handle.
- Two overlapping handles make one series unreachable.
- Focus styling is removed without an equivalent.
- A point can move by pointer while its native input remains stale.
- Presentation mode depends on hover or color alone.
- A drag after reveal changes the aggregate.

## Coverage ledger

| Concern | CSS/SVG contract | JavaScript contract | Receipt |
| --- | --- | --- | --- |
| target size | visible body + transparent hit halo | nearest eligible target | target overlay inspection |
| exact value | center tick + value tag | shared coordinate conversion | input/SVG parity |
| series identity | shape/fill/pattern/text | selected series state | forced-colors check |
| touch | scoped `touch-action` | Pointer Events/capture | real/emulated touch route |
| keyboard | focus-visible native control/handle | semantic step actions | full keyboard exercise |
| cancellation | origin ghost | Escape/cancel rollback | rollback test |
| room mode | view-mode tokens | explicit toggle/fullscreen enhancement | 1080p/4K screenshot |
| narrow mode | contained local scroller | dimension navigation | 390px receipt |

## Completion gate

- Handles meet the selected desk and presentation size contracts.
- Pointer, touch, keyboard, button, tap, and native-input routes produce the same committed state.
- Escape and pointer cancellation restore the starting state.
- Overlapping values remain individually operable.
- Group aggregate immutability passes during scenario manipulation.
- 390, 1280, 1440, 1920, 2560, and 3840 treatments preserve label and control readability.
- Forced-colors, reduced-motion, 200%/400% zoom, print, and no-script equivalents remain useful.

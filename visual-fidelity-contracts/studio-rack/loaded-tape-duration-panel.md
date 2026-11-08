# Loaded Tape Duration Panel

Keep the loaded session's duration immediately readable and easy to adjust in
one compact panel. Hours and Minutes share a readout, neighboring dial groups
and exact fields, while the adjacent Working sessions panel owns repetitions
and their placement.

**Standing:** human-approved visual reference, version `0.1.1`, ID
`vfc:loaded-tape-duration-panel`; updated 8 November 2026. The panel preserves
its approved scale, geometry and palette with one deliberate lighting correction:
the dial face stays still while its pointer turns. The original recall baseline is
`be8ec7f8ebfafa6aaef9958d088411e45df80f8a` at
`planning/context-canvas/studio-rack-tape-study.html`, including the shared control
factory at that revision. The approved correction below supersedes that baseline's
rotating face in [#806](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/806).
This contract preserves the development illustration and its explicit revision;
the [production quantity contract](precision-dials-faders.md) retains its current
receivers and separate implementation authority. The planning reference is authorized for main/dev preservation in #810.
Showcase integration continues on dev, with promotion to main human-cued.

## The approved object

The [study](../../planning/context-canvas/studio-rack-tape-study.html) mounts the
duration controls inside `div#duration.module`, the first child of `.modules`
in the loaded-session deck. This complete panel is the reference: its enclosing
surface, spacing, label, readout, Hours/Minutes groups, dial artwork, exact fields
and circular step buttons. Its fixed light direction makes the dial's movement
read as a physical control. The separate
[Cassette Plan Shelf](cassette-plan-shelf.md) now preserves the neighboring artwork.

The default reference loads **Prototype pairing**, showing **01 hours · 30
minutes**. Values change through the real shared controls; the panel geometry
stays recognizable through adjustment. The title reads **Time per person, per
session**. The output retains its explicit Hours and Minutes labels and native
association with both exact fields.

```text
.deck
  .deck-head                    Loaded session · name · Close
  .modules
    #duration.module            Approved duration panel
      .native-time-controls
        .studio-duration
          .native-time__overview
            title               Time per person, per session
            output              01 hours · 30 minutes
          .native-time__quantities
            Hours               dial + exact field + circular − / +
            Minutes             dial + exact field + circular − / +
    .module                     Working sessions
      session pads              selected repetition + Session
      placement                 Sprint / Week
      host / removal            Hosted by / Remove session
```

## Exact appearance and scale

The source revision above is the byte-level recall authority for the original
appearance. Apply the fixed-lighting correction below to recover the current
reference. The following values name the material relationships so a later
collaborator can preserve the panel without rediscovering its cascade.

| Element or inherited rule | Approved baseline |
| --- | --- |
| Root type and sizing | `16px/1.4 system-ui,sans-serif`; `box-sizing: border-box` throughout; controls inherit the font |
| Panel palette | Ink `#172724`, edge `#668b73`, mint `#66dcc2`, paper `#f7f0d6`, peach `#f2d0b6`; duration colors remain local to this reference when surrounding palette experiments change |
| `#duration.module` | Ink background; `1px` edge border; `.7rem` padding; `4px` corners; `min-width:0` |
| `.native-time-controls` | `display:block`; the generated duration wrapper adds no separate painted enclosure in this study |
| `.native-time__overview` | Flex row; centered alignment; `space-between`; `.5rem` gap; `.55rem` bottom margin |
| Title | Maximum width `9rem`; `.8rem` font; paragraph margins reset to zero |
| Duration output | Flex row; `.8rem` gap; mint foreground; `#0e211d` background; `1px` edge border; `.3rem .8rem` padding; `4px` corners |
| Output columns | Centered grid; `.65rem ui-monospace,monospace`; each number `1.65rem`, weight `500` |
| `.native-time__quantities` | Two equal columns, `1fr 1fr`; `.5rem` gap |
| Hours/Minutes inner groups | `.5rem` padding; `4px` corners; ink text; borderless; Hours peach and Minutes paper; labels bold at inherited `.83rem` |
| `.native-time__adjustment` | Wrapping flex; centered cross-axis; `space-between`; `.25rem` gap; dial before the field/step group |
| Both `.native-knob` housings | Equal `64px × 64px`; `.4rem 0` margin; `flex:0 0 auto`; `1px` ink border; circular silhouette |
| Tick ring | `repeating-conic-gradient(from -135deg,#586d5a 0 1deg,transparent 1deg 27deg)` |
| Fixed dial face | Absolute `8px` inset; circular; `2px solid #bccdc0`; `linear-gradient(135deg,#71938b,#213934 60%,#0d1d19)`; `2px 3px 2px #243b37` shadow; face has no transform |
| Rotating pointer carrier | `.native-knob__pointer` is absolute with `inset:0`; `transform:rotate(var(--native-knob-angle,-135deg))`; its face-sized box turns around the center |
| Pointer mark | Carrier's `::before`; top `5px`; left `calc(50% - 2px)`; `4px × 12px`; `3px` corners; paper fill |
| Exact field | `68px` wide; minimum height `2rem`; `.2rem` padding; centered `700 .9rem ui-monospace,monospace`; paper background, ink text, `1px` edge border and `3px` corners |
| Stepper layout | Two `30px` columns; `.35rem .5rem` row/column gaps; `1.6rem` top margin; field spans both columns in row one; minus and plus occupy row two |
| Circular steps | `30px × 30px`; minimum height `30px`; zero padding; paper background, ink text/border; inherited `0 3px 0 #0d1916` button shadow |
| Focus | General visible focus: `3px solid #ffd06f`, offset `4px`; dial focus-within: `3px solid #7251b4`, offset `3px` |

The study's shared button hover keeps its mint border; step buttons retain their
more specific paper background and ink border. Disabled controls use the
inherited `.5` opacity. The transparent range input fills the dial with
`touch-action:none`; native exact fields and step buttons remain independent
ways to adjust the same value. Face artwork has `pointer-events:none`.

The fixed face owns simulated light: its gradient, rim and lower-right shadow
retain the same orientation at every value. The transparent pointer carrier
owns rotation. This supersedes rotating the complete face, which turned the
shadow and light source with the knob. The correction changes neither the dial
footprint nor the quantity, focus, exact-field or gesture owners.

The current study hides `.native-time__part > p`, `.native-time__feedback` and
`.studio-repetition`. The visible quantity module therefore stays concise.
The numeric Working sessions editor supplied by the factory remains hidden;
numbered session pads in the neighboring panel are the visible repetition owner.
This is the study's composition, with production validation and recovery still
governed by their existing owners.

## Neighboring module and responsive context

The approved Working sessions panel remains beside the duration panel at wider
viewports. It has the same `.module` enclosure. Its heading and **+ Session**
action share a wrapping `.bar` with centered alignment, `space-between` and an
`.8rem` gap. Numbered pads wrap with a `.4rem` gap and `.5rem 0` margin; each has
a minimum width of `2.3rem`. Sprint/Week selectors occupy two equal columns with
a `.5rem` gap and `.65rem 0` margin. Hosted by and Remove session retain the
following compact action row.

The layout reference is exact and intentionally local:

```css
.modules {
  display: grid;
  grid-template-columns: minmax(230px, 1fr) minmax(240px, 1fr);
  gap: .7rem;
  padding: .7rem;
}

@media (max-width: 1000px) {
  .modules { grid-template-columns: 1fr; }
}

@media (max-width: 650px) {
  .native-time__adjustment { justify-content: center; }
}
```

Above `1000px`, duration and Working sessions are two neighboring columns. At
`1000px` and below, Working sessions follows duration in a single column. The
Hours/Minutes groups retain their two-column relationship within duration; their
internal flex groups wrap as space requires. At `650px` and below, each dial and
step group centers inside its colored field. The surrounding workspace uses a
`210px` tape shelf above `1000px`, `170px` at `1000px` and below, and a block layout
at `650px` and below. These parent constraints are part of accurate comparison.

The original hosting deck used a `2px solid #9ab29c` border and `#35483d`
background. The current study keeps its `5px` corners and `.8rem 0` margin while
the surrounding art uses a `#668b73` edge and `#2b3e34` face. The `.modules`
background remains `#35483d` behind the duration panel's rounded corners, and
`#duration` retains its own palette. The compact dark heading provides the
loaded session name and Close. The duration panel's height follows its contents
and the shared row; a fixed-height replacement requires a new visual comparison.

## Behavior, recall and revision

The [shared time control factory](../../collaboration/native-investment-studio/time-controls.mjs)
owns semantic markup, dial handling and readout formatting. The study imports
`createTimeControls`, `mountDurationDials` and `renderTimeReadout`; its local
illustrative state supplies values. One selected tape uses the same mounted
controls while its people and placement change. The module has no independent
production acceptance or pricing owner.

System reduced motion removes animation and transition. Forced colors hides the
decorated dials in this study while exact fields and circular steps remain
available. Its `.2s` deck unfurl is a receiving-context effect, separate from the
duration controls themselves.

For original recall, read the study and its shared module from the same revision:

```sh
git show be8ec7f8ebfafa6aaef9958d088411e45df80f8a:planning/context-canvas/studio-rack-tape-study.html
git show be8ec7f8ebfafa6aaef9958d088411e45df80f8a:collaboration/native-investment-studio/time-controls.mjs
```

For current recall, keep those geometry/color rules and replace face rotation
with the carrier and pointer mark defined above. The neighboring repetition
labels now use Session; the source still stores `occurrences` internally.

Compare the complete loaded panel at an ordinary phone width and a laptop width,
including the neighboring repetition panel and the breakpoint change. Inspect
the initial `01 / 30` readout, a changed value, exact-field focus and a dial turn.
During that turn, verify a changing pointer angle with a fixed face gradient,
border and shadow. These observations establish fidelity to the revised
reference. A proposed production adoption receives its own review for placement,
state ownership and responsive integration.

This reference supersedes the earlier open-ended sizing exploration for the
development study's duration and Working sessions panels. The approved production
coarse/fine duration sizes remain in [Precision Dials & Faders](precision-dials-faders.md).
The 8 November lighting correction supersedes only the original face-rotation
mechanism. The plan cassette's separate preserved treatment and any new VHS-C
comparison art leave the duration geometry and colors intact.

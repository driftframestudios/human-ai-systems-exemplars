# Color, contrast, and forced colors

A contract names tested foreground/background pairs for specific uses. This
keeps visual character expressive while text, controls, focus, and state remain
legible across ordinary color, user-selected color, and print.

## Pair-level contract

A palette is a set of available roles. A tested pair is an evidence-bearing
claim. Each pair records the foreground, background, minimum calculated ratio,
and named use. The focused tests recompute the ratio from the declared hex
values.

For WCAG 2.x contrast use:

- ordinary text targets at least `4.5:1`;
- large text targets at least `3:1` when it is at least 24 CSS pixels in regular
  weight or 18.66 CSS pixels in bold weight; and
- component boundaries, essential graphical objects, and visible focus cues
  target at least `3:1` against adjacent colors when the criterion applies.

These thresholds establish their named contrast questions. Typography,
anti-aliasing, background images, opacity, state differentiation, and actual
browser rendering keep their own observations.

## Meaning travels through several channels

Written labels, native semantics, geometry, position, and border treatment carry
the state. Color reinforces the distinction. A chart or diagram supplies labels,
a legend, and a semantic companion that preserve relationships when the palette
changes.

Focus remains visible on every field it can cross. Test the complete focus cue,
including inner and outer rings, against both the component and adjacent page.

## Forced colors

Allow the user agent to map ordinary content into system colors. Use
`forced-color-adjust: none` only for a small control whose system-color mapping
has been explicitly authored and tested. Useful roles include:

- `Canvas` and `CanvasText` for fields and text;
- `ButtonFace` and `ButtonText` for native-style controls;
- `Highlight` and `HighlightText` for selected state; and
- `LinkText` for links.

Borders, labels, and selected-state semantics remain visible after shadows,
background fields, and decorative textures disappear.

## Print

Print uses white paper, black text, retained boundaries, written states, captions,
and evidence notes. A color swatch becomes a labeled sample with its token or
material name. The printed record preserves source order and opens disclosure
content that completes the reading.

## Review probe

1. **Question:** Does each consequential text, focus, control, and state pair
   meet its declared contrast and meaning route?
2. **Mechanism:** Calculate source values, render the state in each browser, and
   activate forced colors and print.
3. **Observable evidence:** Declared ratios pass; state remains identifiable by
   text and geometry; focus remains visible; print retains the full decision.
4. **Instruction yield:** Repair the semantic pair or alternate-media mapping
   that owns the failed state.

## Re-entry

A token value, text size or weight, opacity, background image, system-color
mapping, focus treatment, or browser rendering change reopens the fitting pair.

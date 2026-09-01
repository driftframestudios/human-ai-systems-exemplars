# Surface color and state roles

## Purpose

This reference supports the branch where a Context Canvas painted surface, nested inset, interactive foreground, or alternate presentation changes the contrast and cascade answer. It preserves the first exercised role architecture without turning one palette into a universal visual system.

## Painted-owner contract

The painted surface is the foreground-role owner. It declares:

1. the effective background treatment;
2. the active unvisited foreground role; and
3. the active visited foreground role.

A nested owner that changes the effective background resets the complete active pair. The immutable palette and inherited active roles remain distinct:

```css
:root {
  --canvas-link-on-light: #003f5a;
  --canvas-link-visited-on-light: #6c0051;
  --canvas-link-on-dark: #f2ff67;
  --canvas-link-visited-on-dark: #feeae9;

  --canvas-link-color: var(--canvas-link-on-light);
  --canvas-link-visited-color: var(--canvas-link-visited-on-light);
}

.dark-surface {
  --canvas-link-color: var(--canvas-link-on-dark);
  --canvas-link-visited-color: var(--canvas-link-visited-on-dark);
}

.dark-surface .light-inset {
  --canvas-link-color: var(--canvas-link-on-light);
  --canvas-link-visited-color: var(--canvas-link-visited-on-light);
}
```

An override of an immutable palette token inside a nested inset cannot repair an active value already inherited from an ancestor. The inset redeclares the active pair. A route can preserve its own art direction by assigning different values to the active roles at the painted owner.

## Effective paint and state matrix

Contrast is evaluated against the paint that reaches the text, not a nearby token name. Solid colors use the resolved foreground and background. Alpha, gradients, images, translucency, and filters require their consequential extrema or a rendered observation. Fallbacks remain part of the contract when blur, gradients, or color functions can be unavailable.

| Dimension | Source question | Fitting evidence |
| --- | --- | --- |
| Unvisited and visited | Does the painted owner carry a complete role pair? | Static owner inventory and ratio calculation |
| Hover and active | Does the state retain a readable foreground and a non-color cue? | Computed style plus focused browser observation |
| Focus | Is focus visible without depending on color alone? | Keyboard observation on the representative route |
| Print | Does a light print background reset inherited dark roles? | At-rule-aware source assertion and print emulation |
| Forced colors | Does the platform retain native link and focus behavior? | Source posture plus emulation; real-system observation when consequential |
| Narrow geometry | Do labels, captions, and targets remain visible and reachable? | Focused 320–390px and short-landscape observation |
| Engine variation | Could the mechanism differ across engines? | The smallest fitting Chromium, Firefox, and WebKit comparison |

Visited-link privacy restricts computed-style and history inspection. Static source checks establish that permitted color properties, ratios, and owner pairs exist. An isolated paint observation can supplement that evidence while retaining its browser and environment boundary. It does not establish universal visited rendering. See [MDN `:visited`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:visited).

Underlines, focus outlines, shape, labels, or another fitting cue preserve meaning beyond color. WCAG's [Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) and [Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) explanations supply the normative accessibility interpretation; route source still owns the specific palette and composition.

## Emerging CSS disposition

An emerging feature enters when it improves the actual ownership problem. The decision records:

- the problem the feature solves;
- cascade and inheritance consequences;
- current official support and fallback behavior;
- the affected owner and consumer set;
- the smallest fitting test;
- reversibility; and
- the condition that would reopen adoption.

The first contrast convergence established these local dispositions:

- ordinary inherited custom properties fit surface-owned active roles;
- a partial `@layer` migration is unsafe because unlayered normal rules outrank layered normal rules;
- `@scope` and native nesting can improve source organization, while neither establishes semantic foreground ownership;
- `@property` does not help roles whose inheritance is intentional;
- `light-dark()` answers user color-scheme selection rather than nested local paint;
- `contrast-color()` cannot currently preserve the authored acid, teal, plum, and warm-white palette; and
- `color-mix()` remains useful for decorative or fallback-tolerant paint while critical text uses audited deterministic values.

These are problem-fit conclusions rather than frozen compatibility claims. `evidence-grounded-research-spike` supplies current official platform evidence when a later task could change one of them.

## Regression posture

The smallest durable contract protects the mechanism and one failure case:

1. parse complete rules and their containing at-rules;
2. assert owner pairs and contrast against named effective backgrounds;
3. add a negative mutation that would pass a spelling-only check while breaking the owner contract;
4. observe changed interaction or alternate-media behavior in a browser; and
5. use the affected-family or all-page visual reference to inspect composition without making pixels the authority.

Automated accessibility scans can support discovery. Gradients, pseudo-elements, inherited paint, visited privacy, and clipped semantics can require direct source or rendered evidence. The return states what each observation establishes and where its coverage ends.

## Completion

The color/state branch completes when each changed painted owner carries a traceable complete role pair, consequential states and presentation modes have fitting evidence, route art direction remains legible, the regression rejects the smallest demonstrated failure, and current platform facts remain refreshable rather than embedded as timeless support claims.

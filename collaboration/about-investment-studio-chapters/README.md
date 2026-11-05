# About Studio chapters

This retained chapter presentation exposes the full Cross-Functional Investment
Studio through selected chapters. About now receives the
[native showcase](../native-investment-studio/README.md). The original Studio
and this derived artifact keep their independent routes and source owners.

## Source and receiving roles

- [`../initiative-costing-calculator/index.html`](../initiative-costing-calculator/index.html)
  remains the original full Studio and owns its controls, scenarios, editing
  controller, and planning state. Its original bytes remain intact.
- [`../investment-analysis/README.md`](../investment-analysis/README.md) names
  the shared calculation and analytical state owners, including staffing.
- [`chapters.js`](chapters.js) groups existing mounted nodes, owns chapter
  selection, routes cross-chapter destinations, and lets editable text grow.
- [`chapters.css`](chapters.css) supplies this derived presentation’s geometry
  and reuses the original Studio palette and panel treatment.
- [`../../tools/materialize-about-studio-chapters.mjs`](../../tools/materialize-about-studio-chapters.mjs)
  derives [`index.html`](index.html) from the full Studio, these two presentation
  sources, and the shared child height adapter. Edit the named sources and
  regenerate; the derived HTML remains a self-contained receiver.
- [`../../iframe-route-families/canvas/public-iframe-route-manifest-v1.json`](../../iframe-route-families/canvas/public-iframe-route-manifest-v1.json)
  owns the `investment-studio-chapters` hosted projection and checks derivation
  during packaging. The original full Studio route stays available separately.

The presentation keeps one mounted document and one planning state.
Coordination opens first, followed by Plan, People, Work & recovery, Change
Modeling, and Comparison. The six chapters expose the original controls;
chapter changes select presentation rather than recreate data.
Native buttons expose the current chapter. Inputs, assumptions, calculations,
and provisional standing retain their original meaning.

Cross-chapter jumps first expose the receiving panel and focus its target. The
shared layout channel can carry bounded target geometry to a receiving host,
which positions that target using its own viewport and navigation. This parent-owned
reveal handles WebKit's observed cross-frame scrolling difference; the ordinary
full Studio retains native document navigation.

The chapter controller handles an ordinary same-document fragment link when
its target belongs to a chapter. It adds one history entry when the fragment
changes and schedules the receiving focus and reveal once. This preserves the
current sizing channel: WebKit's native fragment navigation can emit an iframe
load for the same child document and reset that channel. Back and Forward use
`hashchange` to expose their receiving chapter. Modified clicks, downloads,
other browsing targets, unknown fragments and other documents keep their native
link behavior.

## Local verification and delivery

From the repository root:

```sh
npm run build:about-studio-chapters
npm run check:about-studio-chapters
node --test tests/context-canvas/about-studio-chapters.test.mjs
npm run test:about-studio-chapters-browser
```

The [About owner](../../context-canvas-project-surface/context-canvas/README.md)
now uses the native instrument. Local browser checks preserve a separate host
for this derived child under its declared sandbox. Issue #625 and its reviewed
feature retain the earlier About integration record; #638 owns the native
replacement. Tagged public delivery remains separately human-cued.

The derived carrier remains available for a deliberate rollback or another
receiver. The original instrument’s source, state contracts, calculations and
other consumers retain their existing owners.

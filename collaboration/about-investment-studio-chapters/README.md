# About Studio chapters

Visitors operate the existing Cross-Functional Investment Studio inside About
through selected chapters. The live investment reading stays above the chapter
controls, while the active content participates in About’s vertical reading.

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

The presentation keeps one mounted document and one planning state. Plan,
People, Work & recovery, Coordination, and Comparison expose the original
controls; chapter changes select presentation rather than recreate data.
Native buttons expose the current chapter. Inputs, assumptions, calculations,
and provisional standing retain their original meaning.

Cross-chapter jumps first expose the receiving panel and focus its target. The
shared layout channel then carries only bounded target geometry to About, which
positions that target using its own viewport and navigation. This parent-owned
reveal handles WebKit's observed cross-frame scrolling difference; the ordinary
full Studio retains native document navigation.

## Local verification and delivery

From the repository root:

```sh
npm run build:about-studio-chapters
npm run check:about-studio-chapters
node --test tests/context-canvas/about-studio-chapters.test.mjs
npm run test:about-studio-chapters-browser
```

The [About owner](../../context-canvas-project-surface/context-canvas/README.md)
receives this artifact. Local browser checks substitute the freshly packaged
child under the declared sandbox, preserving the distinction between source
behavior and hosted delivery. The focused PR for Issue #625 carries accepted
execution and independent review. Publication remains held.

Recovery returns About to its original full-Studio carrier. The original
instrument’s source, state contracts, calculations, and other consumers retain
their existing owners throughout this presentation experiment.

# PDF data visualization

Produce a figure that remains legible, interpretable, and reproducible at its
actual size in a report, paper, handout, or print-oriented export.

## Start here

- Read [`SKILL.md`](SKILL.md) for the authoritative physical-layout, export,
  placement, and evidence contract.
- Use [data visualization foundations](../data-visualization-foundations/README.md)
  to establish the source and comparison meaning first.
- Return to the [repository skill catalog](../README.md) to choose another
  destination when the primary result belongs in conversation or on the web.

## What this skill returns

| Input | Decision | Observable return |
| --- | --- | --- |
| Admitted data, reader question, final page or column width, and document pipeline | Physical dimensions, typography, vector/raster roles, caption, value companion, and reproduction route | A placed figure read at actual size, or a figure-ready handoff naming the exact placement check that remains |

## Concrete example

**Situation:** A figure designed for a full-width page will occupy one narrow
report column. Shrinking the original would also shrink labels and strokes.

**Use:** Recompose panels for the final column width, set type and line weights
for physical reading, keep axes and labels as vectors, and retain a dense point
layer as a measured raster when that improves file size and rendering.

**Observable return:** The rendered PDF preserves readable labels, complete
marks, caption context, extractable values, and page boundaries at the placed
size. The exact-value companion matches the figure’s admitted state.

## Working path

1. Establish the reading task, source contract, page role, and final dimensions.
2. Separate calculations, display rounding, and rendering.
3. Compose labels, marks, non-color distinctions, caption, and companion.
4. Export with deliberate vector/raster and font settings.
5. Inspect the changed PDF page at actual size and check text/value recovery.
6. Hand back the artifact, reproducible owner, observed conditions, and any
   separately held document-accessibility decision.

## Production reference

[`references/production-and-handoff.md`](references/production-and-handoff.md)
covers physical sizing, existing Python pipelines, mixed vector/raster export,
figure-to-document handoff, and acceptance at the fitting layer.

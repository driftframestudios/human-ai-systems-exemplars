# Embedded prototype layout

Repair the actual space available to an embedded prototype so a compact preview
supports a meaningful first interaction and a clear route to the full view.

## Start here

- Read [`SKILL.md`](SKILL.md) for the authoritative parent/child measurement,
  ownership, interaction, and evidence contract.
- Return to the [repository skill catalog](../README.md) when table semantics,
  delivery, or broader visual verification owns the next result.

## What this skill returns

| The parent owns | The child owns | The return records |
| --- | --- | --- |
| Placement, reserved dimensions, iframe policy, title, and full-view route | Internal document, controls, breakpoints, focus, and local scrolling | Parent viewport, content box, frame/client width, child viewport, affected behavior, responsible owner, fitting repair, and observation boundary |

## Concrete example

**Situation:** A prototype is legible at 390 pixels when opened directly. Inside
a 390-pixel parent, gutters and borders leave the child 279 pixels wide, and its
action labels split into fragments.

**Use:** Measure the parent content box, frame client width, and child viewport;
compare the same child at controlled standalone widths; then adjust the child’s
content-driven rule at the measured constraint.

**Observable return:** Labels remain readable at the embedded width, focus stays
visible, the intended control works, and the full-view link remains discoverable.
The record states that this observation covers the measured local parent/child
pair.

## Working path

1. Name the preview operation and what the full view supplies.
2. Resolve the current parent, canonical child, and maintained projection.
3. Measure outer, parent, frame, and child dimensions separately.
4. Change the smallest responsible source owner while preserving useful scroll.
5. Observe the affected breakpoint seam, focus path, state, and onward route.
6. Return the measurements, repair, evidence reach, and any owner-held question.

This skill is self-contained. Compose it with semantic table design when native
table relationships change, and with visual verification when rendered behavior
needs a broader browser or viewport observation.

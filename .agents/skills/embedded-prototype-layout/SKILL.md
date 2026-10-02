---
name: embedded-prototype-layout
description: Resolves prototype layout pressure at the actual parent and iframe boundary. Applies when a self-contained instrument works standalone but its embedded controls, tables, focus, shadows or onward route become difficult to use.
---

# Embedded prototype layout

## What

A measured parent/child layout contract that keeps a compact preview useful for deciding whether to continue in a full view, while preserving the prototype's meaningful interactions and comparisons.

## When

An iframe, preview panel or constrained artifact shows different behavior from its standalone document, or a parent layout change alters available child space.

## Boundaries

The parent owns placement, reserved dimensions, title, policy and full-view route. The child owns its internal document and controls. Packaging owns declared projection changes. Local canonical-child evidence and live hosted delivery remain separate observations.

## Result

A source-owned repair or decision-ready Issue naming parent viewport, content box, frame/client width, child viewport, affected behavior, smallest fitting layout change, and coverage boundary.

## Rules

1. Resolve the current parent, canonical child, declared projection and public alias through their actual owners. Match display names to route identities explicitly.
2. Measure outer viewport, parent content width, frame border/client width and child viewport separately. A nominal mobile width is a comparison case, not a substitute for the embedded measurement.
3. Preserve the preview's reader job. Prioritize readable controls and tables, a clear orientation and a discoverable full-view route; visitors may scroll to continue.
4. Let headings and controls reflow at word boundaries. Reserve target size, focus indication and shadow/paint clearance. Use local scroll ownership for material that needs two dimensions.
5. Start with existing child viewport rules and layout primitives. Add a content-driven breakpoint when measured pressure warrants it; use a container query only when an internal container is the relevant independent constraint.
6. Inspect immediately below, at and above a changed seam, then the measured parent-derived width. Preserve standalone narrow and wide behavior as controls.
7. Observe relevant open/closed disclosures, keyboard entry/exit, final-column reach and retained state. A visible frame or document containment alone leaves these behaviors unspecified.
8. Preserve sandbox, permissions, full-view links and canonical/projection agreements through the existing packaging owner. A layout observation alone leaves deployment unchanged.
9. In browser harnesses, bind frame identity independently of a URL that the harness replaces. Record local substitutions and retain completed cases incrementally.
10. Return normalized findings and scope. Keep raw browser state and user-specific coordinates with the local evidence owner.

## Examples

Given a 390px parent whose child viewport is 279px after composition, when controls are assessed, then the measured 279px child behavior accompanies the ordinary standalone comparison.

Given a wide comparison inside a compact preview, when the layout is repaired, then a readable locally scrollable table and clear full-view route serve the visitor without squeezing every column into the preview.

## Completion

The affected controls and comparison are legible in the intended parent and standalone contexts, or a bounded Issue identifies the exact remaining observation and implementation owner. The evidence states whether it covers local composition or live delivery.

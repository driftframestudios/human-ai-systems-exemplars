# Context Canvas visual verification

Use this skill to select the smallest browser or source observation that can answer one visible-behavior question, then state what the result establishes and what it leaves open.

## Start here

- Read the authoritative [skill contract](SKILL.md).
- Name the visitor task, affected route or family, expected fingerprint, consequential state, and accepted source coordinate.
- Choose source inspection, a focused element check, a family reference, or a targeted browser script according to the behavior under review.
- Keep cycle-scoped screenshots, traces, and raw logs in the local ignored evidence area.

## Concrete example

**Situation:** A caption becomes disconnected from its figure when a responsive rule begins at `701px`. The same route looks correct at a familiar desktop width.

**Use:** Observe the route at `700px` and `701px`, then at one representative width inside the affected interval. Measure the outer figure, caption, visible paint, and any fixed neighbor. Confirm the intended state and reproduce the material fault through the observed baseline or a controlled perturbation before restoring source state.

**Observable return:** The focused check identifies whether the threshold introduces overflow or a changed containing block, records the passing and failing widths, and states the browser and geometry limits. A repair can target the actual owner instead of relying on a desktop screenshot.

## Available observations

- `npm run visual:context-canvas-reference -- --phase <name>` captures the complete initial page set at standing widths.
- `npm run visual:check -- <route> --selector <selector> --name <name>` focuses one route or element.
- `npm run test:context-canvas-medium-containment` checks wide-frame containment and rail clearance around responsive seams.
- `npm run test:context-canvas` exercises source-level Context Canvas contracts.

Use [behavior oracles and verification scope](references/behavior-oracles-and-verification-scope.md) when modalities diverge, paint and text disagree, a plausible fault escapes an existing check, or late findings reopen coverage.

## Boundaries

Screenshots support comparison rather than pixel approval. A resting capture leaves hover, focus, visited history, print, forced colors, and other interaction states open. Parent carriers and embedded documents retain separate source owners.

[Return to the repository skill collection](../README.md).

# Context Canvas CSS ownership

Use this skill to make a style rule’s owner, consumers, load position, visual-contract relationship, and extension point easy to find before changing the cascade.

## Start here

- Read the authoritative [skill contract](SKILL.md).
- Trace definitions, duplicates, source-order neighbors, HTML and JavaScript consumers, media conditions, print, reduced motion, and forced colors before moving a rule.
- Classify the owner as `core`, `component`, `contract`, `route`, or `legacy`.
- Move complete selector blocks with their containing conditions and verify the winning declaration at every changed file seam.

## Concrete example

**Situation:** A story-named selector in a broad stylesheet styles the same figure-and-caption composition on several pages. Moving it into a component file would change its position relative to route rules.

**Use:** Map every consumer and cascade neighbor, confirm that the visual structure is genuinely shared, choose a neutral component name, and load the extracted file in an explicit order. Compare declarations and computed winners at the moved-versus-shared seams.

**Observable return:** The reusable composition has one findable owner and neutral selector; route identity remains in content and metadata; each affected page keeps its intended computed styles and visual fingerprint; unrelated pages can load less CSS when reduction is part of the task.

## Supporting material

- [Context Canvas CSS ownership scenarios](references/scenarios.md) covers Debrief namespace migration and equal-height Reading types badges.
- [Surface color and state roles](references/surface-color-and-state-roles.md) supports painted backgrounds, interaction states, contrast, print, forced colors, and emerging CSS features.
- [Context Canvas visual verification](../context-canvas-visual-verification/SKILL.md) selects fitting rendered evidence.

## Boundaries

Readable authored CSS remains the collaboration source. Generated bundles can serve distribution after ownership stabilizes. A file move is a cascade change even when declarations remain byte-for-byte identical.

[Return to the repository skill collection](../README.md).

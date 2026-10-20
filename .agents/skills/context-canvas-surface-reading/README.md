# Context Canvas surface reading

Use this skill to understand a page as a working visitor experience before assessing or changing it. The reading connects meaning, runtime ownership, visual composition, evidence, and family relationships.

## Start here

- Read the authoritative [skill contract](SKILL.md).
- Begin with the [Context Canvas orientation README](../../../context-canvas-project-surface/context-canvas/README.md), then read every stylesheet, script, iframe, SVG, image, manifest, and data source that materially shapes the target.
- Record route standing, visitor ability, evidence boundary, runtime owners, visual fingerprint, affected family, and human-held decision authority.

## Concrete example

**Situation:** A Debrief embeds an interactive prototype and uses shared composition styles plus a route-specific palette. A proposed layout change could alter both the parent page and the embedded instrument.

**Use:** Read the complete parent source, its CSS and JavaScript, the iframe carrier, the embedded source owner, the relevant [Visual Fidelity Contract](../../../visual-fidelity-contracts/README.md), and one canonical sibling. Keep parent sizing and caption behavior separate from prototype behavior.

**Observable return:** The surface map names what the visitor can do, which source owns each behavior, which visual qualities are shared or route-specific, what evidence supports the page’s claims, and which page family needs comparison if the change proceeds.

## Runtime ownership

| Owner | Responsibility |
| --- | --- |
| HTML | Meaning and reading order |
| CSS | Presentation and alternate modes |
| Progressive JavaScript | Bounded enhancement |
| Embedded system | Its internal behavior and state |
| Delivery layer | Route and response behavior |

## Boundaries

Document meaning, DOM or accessibility representation, rendered visibility, geometry, and screenshots are separate observation channels. Agreement in one channel leaves the others available for a fitting check.

[Return to the repository skill collection](../README.md).

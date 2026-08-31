---
name: context-canvas-visual-verification
description: Selects proportionate visual and browser evidence for Context Canvas visitor-surface changes. Applies when layout, CSS, responsive behavior, interaction state, print, forced colors, or a visible regression needs review.
---

# Context Canvas visual verification

## Contract

- **What:** A source-bound visual and browser observation that answers one Context Canvas visitor-surface question.
- **When:** A change can alter composition, responsive behavior, interaction state, alternate presentation, or a route's visible fingerprint.
- **Boundaries:** Authored source and accepted contracts own intended behavior. Screenshots support comparison rather than pixel approval. Initial-state sweeps leave interaction behavior open. Prototype and iframe-document interiors retain their separate owners.
- **Result:** The smallest fitting reference or focused check, an interpreted result, coverage and environment limits, and one next receiver.

## Fit and attention

- **Useful when:** A CSS or visitor change needs narrow/desktop/wide comparison, a reproduced visual defect needs a focused check, or print, forced colors, focus, hover, geometry, or engine behavior could change the answer.
- **Poor fit when:** Direct source reading already answers a behavior-neutral question, or a stateful prototype exchange requires import/edit/export/recovery coverage.
- **Smallest useful dose:** One accepted source coordinate, one representative surface, one consequential state, and one observable pass or difference.
- **Foregrounds:** Visitor-visible composition, route fingerprint, state observability, viewport reachability, and the distinction between source proof and browser evidence.
- **Interactions:** `context-canvas-surface-reading` identifies the visitor task and affected family; `context-canvas-css-ownership` identifies the style owner; `stateful-artifact-behavior-contracts` owns stateful exchanges.
- **Rest or release when:** The named question has a fitting observation and another browser, viewport, or capture would leave the decision unchanged.

## Rules

### Rule: Evidence follows the behavior

Use the source or browser state that can establish the claim. Static rules can prove token values, owner pairs, and media placement. Browser checks can prove computed cascade, focus visibility, target geometry, clipping, and printed presentation. A screenshot of a resting page leaves hover, focus, visited history, and alternate media unspecified.

### Rule: Coverage expands with consequence

One affected route and one standing viewport often suffice for a localized repair. Use the affected family when shared ownership changes. Use the complete route reference when a broadly loaded source or system-wide role changes. Add Firefox or WebKit when the mechanism, prior evidence, or acceptance boundary makes engine variation plausible.

### Rule: Breakpoint evidence brackets the source seam

When a media query, container query, or responsive owner changes geometry, observe the last practical width before the threshold and the first width at or after it. Add a representative width inside the affected interval when the condition can persist beyond the seam. Named device categories support review; source-adjacent widths establish whether the responsive transition itself is continuous and contained.

Measure the outer frame and any fixed or sticky neighbor that can cover it. A wide table may remain larger than its local scroll region, while the scroll region and its outer figure stay inside the available visitor field. Page-level `scrollWidth` establishes one useful boundary and leaves negative-positioned content under `overflow: clip` open for direct geometry observation.

### Rule: Fingerprint and regression remain distinct

A route's palette, rhythm, density, asymmetry, negative space, and art direction can vary while its semantic and interaction contracts hold. Compare hierarchy, containment, content presence, ordering, reachability, and intended state before treating raster difference as regression.

### Rule: State evidence retains its limits

Browser privacy can conceal `:visited` state from script. Forced-color emulation does not reproduce every real Windows High Contrast behavior. Headless rendering, system fonts, and rasterization can vary. The return names the mechanism actually observed and preserves a real-system or human-review receiver when that distinction matters.

### Rule: Local artifacts stay local

Cycle-scoped images, browser traces, and raw logs remain under ignored `.visual-runs/`. A public-safe receipt carries the source coordinate, command shape, normalized result, what it establishes, its coverage boundary, environment risk, and next receiver.

### Rule: Embedded boundaries retain their owners

The parent page can receive carrier, sizing, caption, fallback, and full-view observations. A defect inside an embedded prototype or iframe document returns to its source or delivery owner through a bounded issue unless the current task explicitly grants that source change.

## Operating sequence

1. **Re-enter:** Confirm branch, source coordinate, worktree, current issue, nearest README, and existing local reference.
2. **Read the surface:** Name the visitor task, affected route or family, runtime owners, expected fingerprint, and consequential state.
3. **Select evidence:** Choose direct source inspection, a focused `visual:check`, the affected-family/all-page reference, a targeted browser script, or the smallest useful combination. When a responsive source seam owns the question, bracket its exact threshold before adding familiar device widths.
4. **Bind comparison:** Record the accepted baseline or known-good state and keep generated artifacts cycle-scoped.
5. **Exercise the state:** Use the viewport, interaction, media mode, and browser engine that can reveal the named mechanism.
6. **Interpret:** Separate pass, intended difference, regression, incomplete observation, and environment-specific behavior.
7. **Return:** Give the exact command and normalized result, changed surface, coverage boundary, risk note, and next receiver. Route an out-of-scope embedded defect to its owner.

## Available repository observations

- `npm run visual:context-canvas-reference -- --phase <name>` captures the complete initial visitor surface at the standing narrow, desktop, and wide dimensions.
- `npm run visual:check -- <route> --selector <selector> --name <name>` focuses a route or element when one visible behavior owns the question.
- `npm run test:context-canvas-medium-containment` checks top-level Context Canvas wide-frame containment and rail clearance at source-adjacent and representative medium widths.
- `npm run test:context-canvas` exercises the repository's source-level Context Canvas contracts.

Existing commands are starting points rather than required ceremony. A new helper earns persistence after repeated mechanics demonstrate real turn savings or protect a consequential boundary.

## Representative scenarios

### Scenario: A shared color role changes

Given one inherited active role can affect several light and dark surfaces<br>
When the role or its owner changes<br>
Then source assertions establish the role and owner contract<br>
And focused state checks exercise consequential hover, print, or forced-color behavior<br>
And the complete visual reference checks system-wide composition without becoming a pixel gate

### Scenario: An iframe carrier appears blank

Given an all-page reference reveals a blank embedded field<br>
And the embedded document lies outside the current change boundary<br>
When the parent and direct route observations identify a reproducible carrier condition<br>
Then the current work preserves its source boundary<br>
And a focused issue returns the condition to the carrier, projection, or embedded-document owner

### Scenario: A rail changes sides or reserves width

Given a fixed reading rail changes geometry at a named responsive threshold<br>
And a wide evidence frame uses viewport-relative sizing inside the affected content field<br>
When the route is observed immediately before and after that threshold<br>
Then the outer frame remains inside the viewport and clear of the rail<br>
And any wider table content remains available through its named local scroll region<br>
And one representative width inside the affected interval establishes whether the condition persists beyond the seam

## Completion

Visual verification completes when the named visitor question has a source-bound observation, its result and failure meaning are explicit, route variation remains available, local artifacts retain their cycle boundary, and one receiver can continue any remaining material condition.

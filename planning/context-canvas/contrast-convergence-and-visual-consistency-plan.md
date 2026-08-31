# Context Canvas contrast convergence and visual consistency plan

```yaml
planning_surface:
  id: "context-canvas.contrast-and-visual-consistency.v0.1"
  as_of: "2026-08-31"
  current_front: "Issue #51 — Modularize Context Canvas CSS into core and route-family bundles"
  branch: "codex/51-context-canvas-contrast"
  source_coordinate: "main@a03325ff29bcc2028304131862e65f6957bd4bdb"
  receiving_milestone: "22 Visual Consistency and Semantic-Visual Agreement"
  status: "contrast convergence approved; review-ready pull request is the next transition"
```

## Hydrate — approved direction and boundary

The Context Canvas visitor surface now has an approved contrast architecture. The implementation preserves the established route styles while giving links, nested surfaces, print, forced-color behavior, compact rails, and narrow table captions more reliable ownership and evidence.

The human has confirmed two implementation judgments:

1. The production line increase is small relative to the operational benefit and is not a reduction target.
2. The two-level custom-property system is the accepted direction.

The change remains within `context-canvas-project-surface/context-canvas/` and its Context Canvas tests. Prototype and iframe-document interiors retain their existing owners. Carrier defects found during parent-surface review receive bounded Issues rather than opportunistic prototype edits.

## Explore — questions the convergence cycle examined

The cycle combined source reading, an architectural debate and rebuttal pass, current official standards, design-system practice, maintainer discussions, cognitive-scanning research, and three-engine browser checks. It asked:

1. Which element should own a foreground role when painted backgrounds nest?
2. Should route selectors, component modifiers, or inherited semantic roles carry links?
3. How should visited colors be evidenced under browser history privacy?
4. Which prior rules duplicate, bypass, or undermine the new roles?
5. Which hover, focus, print, forced-color, gradient, alpha, and fallback states change the contrast answer?
6. Which small viewport behaviors affect reachability or visible meaning rather than composition alone?
7. Do cascade layers, scoping, native nesting, registered properties, or newer color functions solve the present ownership problem?
8. How should reading fatigue and scanning evidence inform the aesthetic layer without prescribing an F-shaped layout?
9. Which semantics and visible geometry need to agree for humans, accessibility-tree or DOM agents, and screenshot-oriented agents?
10. What can a static source contract establish that a screenshot or automated scanner cannot, and vice versa?

## Rest — source and browser observations

### Two-level role architecture

Four immutable palette roles hold audited values:

| Role | Value | Current job |
| --- | --- | --- |
| `--canvas-link-on-light` | `#003f5a` | Unvisited link on light paint |
| `--canvas-link-visited-on-light` | `#6c0051` | Visited link on light paint |
| `--canvas-link-on-dark` | `#f2ff67` | Unvisited link on dark paint |
| `--canvas-link-visited-on-dark` | `#feeae9` | Visited link on dark paint |

Two inherited active roles carry the current surface decision:

- `--canvas-link-color`
- `--canvas-link-visited-color`

The settled invariant is:

> A painted surface declares its background and both active link roles. A nested surface that changes the background redeclares the complete active pair.

This makes the foreground choice a surface contract rather than an anchor inventory. A route can preserve its own art direction by assigning a local active value: Who To Believe uses warm white in its orientation field and teal in its implementation field while retaining a traceable visited role.

### Known contrast minima

| Pair | Approximate ratio | Interpretation |
| --- | ---: | --- |
| Acid unvisited role on cobalt | 5.232:1 | Meets the 4.5:1 normal-text floor |
| Pale visited role on cobalt | 4.930:1 | Meets the 4.5:1 normal-text floor |
| Plum visited role on Tiffany | 5.023:1 | Retains margin on a consequential shared field |
| Dark teal hover on salmon | 5.598:1 | Replaces the prior 2.018:1 white hover |

WCAG 2.2 [Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) supplies the normal-text floor. Ordinary inline and text links retain underlines; specialized navigation, card, and rail links retain shape, labels, focus, or another non-color cue in accordance with [Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html). Compact rail targets now meet the 24 CSS-pixel minimum described by [Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### Consequential repairs found during convergence

1. Print rules changed dark surfaces to white while allowing their dark-screen foreground roles to inherit. Print owners now reset the complete pair.
2. A legacy salmon hover changed links to white at approximately 2.018:1. Hover now strengthens the underline while retaining the audited foreground.
3. Shared and FMI compact rails exposed authored targets below 24 × 24 CSS pixels. Transparent target geometry now reaches the minimum while visible ticks retain the quiet treatment.
4. A Distributed Inspection table caption remained as wide as its 52rem table and clipped inside a narrow horizontal scrollport. The caption now fits the scrollport while the wide table remains scrollable. This also restores agreement between the complete native caption and its rendered presentation; WAI's [table caption guidance](https://www.w3.org/WAI/tutorials/tables/caption-summary/) describes the semantic relationship.

### Redundancy and ownership disposition

The production patch has 175 additions and 74 deletions across fourteen tracked visitor/style files, a net increase of 101 lines. The new 492-line regression file carries a dependency-free CSS-rule parser, at-rule awareness, contrast math, owner inventory, and negative mutations. Its size protects the mechanism rather than memorizing selector spelling.

The convergence removed or consolidated:

- direct dark-surface anchor colors where the painted owner can carry the active role;
- the broad Genomic `color: inherit` seam;
- global brightness/filter hover behavior and redundant filter resets;
- the salmon hover-to-white rule;
- one dead Distributed selector with no consumers;
- one duplicated FMI evidence-plane role assignment; and
- a mixed selector that treated a dark caption like a light table cell.

Behavior-neutral legacy visited-selector arms outside the changed path remain available for a future owner-led cleanup. This cycle does not claim a repository-wide redundancy proof.

### Viewport and engine result

The final all-page reference captured 42 routes at 390 × 844, 1440 × 1000, and 2560 × 1440: 126 of 126 captures, no capture errors, no suite observations, and no document-width overflow.

Focused Chromium, Firefox, and WebKit observations added 320 × 568 and 667 × 375:

- shared/source rail targets measured at least 28 × 24 CSS pixels;
- FMI rail targets measured 24 × 24;
- the final rail item remained reachable in short landscape;
- keyboard focus produced visible 2–3px outlines;
- the Distributed caption exactly fit 280px and 350px scrollports while its 832px table remained horizontally scrollable; and
- the audited role and hover cases agreed at 390 and 1440.

Debriefs at 2560 retains a narrow catalog column and substantial negative space. That state is a research opportunity rather than a demonstrated defect. Page length alone also does not establish fatigue on the longer FMI and Who To Believe readings.

## Settle — architecture and evidence decisions

### Modern CSS disposition

| Candidate | Current disposition | Decision reason |
| --- | --- | --- |
| Inherited custom-property roles | Adopted | Directly models local painted ownership and passes the three-engine check. |
| Logical properties and sizing | Retained | Fits the vanilla system and supports future writing directions. |
| `@layer` | Deferred | A partial migration would let unlayered normal rules outrank the new layer. Value begins with a complete authored-input order. |
| `@scope` | Deferred | Expressive for subtree bounds, while the current problem is semantic role ownership rather than selector reach. |
| Native nesting | Deferred | May improve grouping but does not establish ownership; readability and specificity need their own source decision. |
| `@property` | Rejected for active roles | Active foreground roles intentionally inherit. Registration does not repair the demonstrated failure. |
| `light-dark()` | Rejected here | Selects by user color scheme rather than by local nested paint inside one scheme. |
| `contrast-color()` | Deferred for critical text | Current output cannot preserve the authored acid, teal, plum, and warm-white palette. |
| `color-mix()` | Retained for decoration | Useful for borders and fields whose fallback is tolerant; critical text remains deterministic. |
| `prefers-contrast` | Future enhancement | A new user mode should follow text-spacing, reflow, and real forced-color evidence. |

Current platform support is refreshed when adoption becomes material; [MDN cascade layers](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer), [`@scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@scope), [nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Nesting), [`contrast-color()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/contrast-color), and [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-contrast) remain current reference points rather than frozen skill facts.

### Visited and scanner evidence boundary

Browsers deliberately restrict `:visited` inspection. Static tests establish the permitted color values, ratios, owner pairing, and print placement. An isolated browser observation can supplement that proof while remaining bound to its engine and environment. [MDN documents the visited-link privacy restrictions](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:visited).

Automated accessibility scanners support broad discovery. Maintainer discussions show that pseudo-elements, gradients, inherited backgrounds, and generated content can produce incomplete or indeterminate contrast results; [axe-core issue #2680](https://github.com/dequelabs/axe-core/issues/2680) is one practical example. This cycle therefore combines direct palette math, owner assertions, computed cascades, focused browsers, and visual inspection.

### Human scanning and fatigue

F-shaped scanning remains a possible response to weak formatting, low commitment, and efficiency pressure—not a target layout. Nielsen Norman Group's [scanning-pattern synthesis](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/) describes layer-cake, spotted, marking, commitment, and F-shaped patterns and supports informative headings, visible grouping, and useful link text. Peer-reviewed [eye-movement work on web-page complexity](https://pmc.ncbi.nlm.nih.gov/articles/PMC6722069/) supports treating typography, spacing, content amount, and visual crowding as consequential while preserving study-context limits.

The aesthetic layer should support several reading commitments:

- informative headings and front-loaded distinctions for layer-cake scanning;
- visible categories and information-bearing links for spotted and marking patterns;
- comfortable measure, rhythm, contrast, and recovery space for committed reading; and
- source-native art direction that gives sections memorable identity without obscuring order.

### Human and AI semantic-visual agreement

Semantic HTML remains the shared authority. BrowserGym exposes accessibility-tree and DOM/geometry observations in its [browser observation implementation](https://github.com/ServiceNow/BrowserGym/blob/main/browsergym/core/src/browsergym/core/observation.py). WebArena similarly constructs DOM and accessibility observations in its [browser processors](https://github.com/web-arena-x/webarena/blob/main/browser_env/processors.py). [VisualWebArena](https://arxiv.org/abs/2401.13649) represents screenshot-dependent agents.

The design implication is agreement rather than AI-specific ornament:

- headings, captions, link names, regions, and document order support humans and semantic/AX readers;
- contrast, target size, grouping, unclipped labels, and visible state support humans and screenshot/coordinate readers; and
- benchmark architecture supplies hypotheses about observation channels, while a local task is needed before claiming a local performance effect.

## Future-state vignettes

### 1. Catalog growth

New dark bands and pale insets declare complete active role pairs at their painted owners. Link coherence grows without a descendant-selector ledger, and a route can still choose a distinctive foreground family.

### 2. Long-form mobile growth

Dense section rails keep quiet visual ticks while transparent 24px targets and safe overflow preserve reachability at narrow and short-landscape dimensions. Layer-cake headings and information-bearing links reduce rediscovery on long pages.

### 3. Localization and RTL

Logical properties, semantic order, and information-bearing headings remain useful as direction and wrapping change. A literal F-layout mandate would fail this future state; the current grammar can adapt without one.

### 4. Personalized contrast

A future visitor preference can remap four palette roles after text-spacing, 400% reflow, and real forced-color observations exist. Route composition stays intact because painted owners consume active roles rather than fixed anchor selectors.

### 5. Mixed AI visitors

AX/DOM agents and screenshot/coordinate agents receive matching names, order, bounds, and visible content for representative tasks. A divergence routes to the smallest semantic or visual owner instead of producing AI-specific markup without evidence.

### 6. Cascade modularization

Issue #51 eventually establishes the complete authored CSS input graph and its intended order. Only then can cascade layers provide stable precedence without unlayered legacy rules silently outranking the new architecture.

## Issue chain and milestone 22

Milestone [22 Visual Consistency and Semantic-Visual Agreement](https://github.com/driftframestudios/human-ai-systems-exemplars/milestone/22) carries three bounded continuations after the contrast tranche associated with #51 merges:

| Receiver | Relation | Owns | Passes when |
| --- | --- | --- | --- |
| [#51 — Modularize Context Canvas CSS](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/51) | Current source owner; this contrast tranche prepares the milestone | Contrast convergence and two-level role implementation | This tranche's review-ready pull request merges with a validation receipt; #51 retains its broader modularization acceptance |
| [#151 — Evolve the visual-state contract](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/151) | Receives #51 | Role/state/mode/geometry verification | Named representative states and coverage limits are rerunnable |
| [#150 — Probe reading comfort and scan support](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/150) | Runs alongside #151 | Hierarchy, information scent, fatigue and commitment evidence | Findings route to change, experiment, observation, study, or no change |
| [#149 — Establish semantic-visual agreement](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/149) | Runs alongside #151 and #150 | Human, semantic-agent, and screenshot-agent observation agreement | Representative tasks produce a bounded repair, adapter, skill, or rest decision |
| [#147](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/147) and [#148](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/148) | Parallel milestone-4 terrain | Existing iframe carrier failures | Their own route and carrier acceptance criteria pass |
| [#58 — Steward repository skill candidates](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/58) | Receives decision-changing skill evidence | Formation, iteration, candidacy, folding, and release | Each candidate has an explicit disposition and return trigger |

The milestone releases when #151, #150, and #149 have durable returns. It does not wait for iframe delivery or portable-skill promotion.

## Validation receipt

| Observation | Result | What it establishes | Coverage boundary |
| --- | --- | --- | --- |
| `node --test tests/context-canvas/contrast-treatment.test.mjs` | 5/5 passed | Palette ratios, owner pairs, print resets, translucent-card foregrounds, route roles, rails, and caption contracts | Static source and negative-mutation contract |
| `npm run test:context-canvas` | 56/56 passed | Existing Context Canvas source contracts remain intact | Repository test inventory, not complete browser behavior |
| `git diff --check` | Clean | Patch whitespace and conflict-marker hygiene | Current worktree diff |
| `npm run visual:context-canvas-reference -- --phase contrast-final` | 42 routes; 126/126 captures; zero errors and observations | Resting composition at narrow, desktop, and wide viewports | Chromium initial state; ignored local artifacts |
| Focused caption check | Passed | Caption matches narrow scrollport while the table remains scrollable | Named Distributed Inspection caption |
| Focused Debriefs rail check | Passed | Rail labels and target behavior remain available | Named rail behavior |
| Focused cross-engine script | Passed in Chromium, Firefox, and WebKit | Audited role, hover, rail, caption, print, and forced-color cases | Named routes and emulated modes |

## Risk and evidence limits

- Firefox 153 and WebKit 26.5 browser binaries were installed only in the local test environment.
- `.visual-runs/` remains ignored and cycle-scoped.
- Headless history behavior limits cross-engine visited-paint claims.
- Chromium forced-color emulation is evidence for the named mechanism rather than a real Windows High Contrast receipt.
- Resting-state screenshots leave hover, focus, print, and forced-color behavior to their focused observations.
- Prototype and iframe-document internals remained outside the edit boundary.

## Hand forward

The current receiver is the review-ready pull request for #51. After merge, #151 becomes the visual-state front while #150 and #149 can run independently. Skill disposition, registry projection, and forge conditions live in [Visual consistency skill cultivation](visual-consistency-skill-cultivation.md). The next re-entry starts from the merged source, this issue chain, and the smallest representative route whose visitor condition can change a decision.

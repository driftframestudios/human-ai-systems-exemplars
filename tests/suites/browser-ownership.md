# Browser ownership: one investment-family pilot

Issue #372 shares browser mechanics where the receiving case has the same
needs. The first pilot is the costing capsule case; its assertions continue
to own accepted revisions, scriptless defaults, focus, clipboard recovery,
and exact transfer bytes. Other browser families retain their existing routes.

This is a source-based disposition, not an executed browser-parity claim.
The inspected baseline has nine HTTP-server implementations and 28 browser
entry files, of which 16 directly consume the Core helper. These are source
owners and entry files, not runtime test-case totals. The pilot removes one
local server implementation and adds an indirect Core consumer through a
family adapter; inventory counts are not its acceptance oracle.

## Pilot boundary and receiving evidence

`tests/investment-analysis/browser-helper.mjs` exports
`withInvestmentBrowser(chromium, run, {serve} = {})`. Its default `serve`
is Core's `startStaticServer`; every acquired page uses Core's `monitor`
and `assertTelemetry`. `run({origin, openPage})` owns navigation and domain
assertions. `openPage(contextOptions)` returns `{page, close}` and keeps
each context's telemetry independent. The optional server dependency lets
Node fixtures observe acquisition failures without opening a socket.

The adapter registers a context before page creation, checks final telemetry
immediately before context teardown, closes outstanding contexts in reverse
acquisition order, and attempts browser and server cleanup even after an
earlier failure. Explicit context close is idempotent. One failure keeps its
identity; multiple failures retain their order in an `AggregateError`, with
the first failure as its cause. The callback result returns only after
cleanup. Callers await page acquisition and close operations; runner
cancellation and process termination remain harness-owned.

The capsule case retains its existing Node test title and 120-second timeout,
the initiative-costing calculator followed by the cross-functional investment
model studio, the 1239-by-800 initial viewport, scriptless contexts, 390/1440
width checks, and all existing state, focus, clipboard, and download-byte
assertions. Downloads are read before their context closes. It adds no
screenshot or durable artifact path; other investment artifact identities
remain unchanged.

Two intentional mechanics changes need the receiving browser observation:
Core serves source-appropriate MIME types with no-store rather than labeling
every file HTML, and final telemetry now includes console errors, failed
requests, and HTTP errors as well as page errors, for both scripted and
scriptless pages. The helper does not filter these signals or replace the
case's independent assertions. It uses Core's lexical repository containment;
that boundary is not a symlink-containment guarantee.

The focused Node fixtures use literal expected cleanup sequences, original
error identities, and late signals from all four telemetry channels. They
cover setup failure, callback failure, cleanup failure, repeat close,
invocation isolation, and a retained opener after settlement. They establish
lifecycle behavior with fakes, not HTTP delivery or rendered behavior.

```sh
node --test tests/investment-analysis/browser-helper.test.mjs
```

The actual Chromium pilot remains held for independent source/fixture review.
After that gate, its exact existing case is the receiving observation:

```sh
node --test tests/investment-analysis/capsule.browser.test.mjs
```

There is no wildcard browser dispatch, command migration, CI change, or
repository-wide helper mandate. Catalog and environment guidance retain
their separate owners.

## HTTP-server owners

| Owner | Disposition and reason |
| --- | --- |
| `tools/core-architecture-browser-helper.mjs` | Retain as the shared server, four-channel telemetry, and bounded launch-policy primitive. Existing consumers select bundled Playwright browsers by default; the media CI lane explicitly selects hosted Chrome. |
| `tools/open-lesson-field-contract.mjs` | Retain this wave. Its static server is a plausible later reuse candidate, but direct/embedded route policy and timestamped screenshot/summary identity belong to its campaign. |
| `tools/narrative-architecture-contract.mjs` | Retain. Its 14 verification journeys and projection semantics remain family-owned; a future lifecycle migration needs its own parity observation. |
| `tools/strategy-canvas-contract.mjs` | Retain. Attribution, projection, story phases, and screenshot/summary production are a larger receiving boundary than this pilot. |
| `tools/visual-check.mjs` | Retain its optional HTTP adapter. File and remote inputs, viewport/rail/iframe capture, and summary behavior remain explicit modes. |
| `tools/context-canvas-visual-reference.mjs` | Retain. Its broader image/font MIME support, lazy-load settlement, and full-family screenshot identities are not interchangeable with the smaller Core MIME set. |
| `tests/investment-analysis/browser.test.mjs` | Retain its bespoke server. `/sandbox/` uses package-plan sandbox tokens and `/packaged/` serves package-plan bytes; these are carrier assertions, not ordinary static routing. Existing instrument screenshots stay owned here. |
| `tests/investment-analysis/presentation.browser.test.mjs` | Retain. Its additional image MIME types, package-controlled iframe, 13-width campaign, print/forced-color/scriptless states, and investment-cohesion artifacts require separate evidence. |
| `tests/investment-analysis/capsule.browser.test.mjs` | Reuse Core through the new family adapter. It needs ordinary repository-static delivery and has a small, exact state/transfer case with no custom carrier routes. |

## About fitted-instrument mechanics

`tests/context-canvas/about-content-fit-helper.mjs` serves the Gallery and Prompt
Conditions Explorer cases. It reuses Core's static server and four-channel
telemetry, packages both canonical children into a temporary second origin, and
preserves their authored opaque sandbox. It owns session cleanup and the actual
parent, child-document, and targeted-local-region geometry observations. Each
browser file owns its independent content, selection, keyboard, failure, and
static/print expectations. This bounded helper adds a direct Core consumer;
the entry-point inventory below counts the two executable case files separately.

## Existing direct Core consumers

These 45 current direct browser entry points retain their imports and case
ownership. The executable selections remain owned by
`tests/suites/catalog.json`; this table records the broader source inventory
and does not claim a new execution of every assertion.

| Entry | Retained receiving responsibility |
| --- | --- |
| `tests/context-canvas/about-heatmap.browser.mjs` | Native About comparison state, exact figure identity, scriptless and print reading, enlarged-text containment, keyboard focus, page wheel movement, and controlled state/layout faults in three engines. |
| `tests/context-canvas/about-gallery-fit.browser.mjs` | About Gallery natural body/footer height, disclosure growth/shrinkage, retained selections, per-document channel and fallback, parent wheel movement, local package substitution, and restored bounded-height fault in three engines. |
| `tests/context-canvas/about-prompt-fit.browser.mjs` | Five-condition Explorer state, parent/document/local-region scroll ownership, natural height, narrow/enlarged text, keyboard, two-frame isolation, fallback, and static/print readings in three engines. |
| `tests/context-canvas/about-disclosure-readings.browser.mjs` | About folio native disclosure reach, fixed thirteen-record and five-prompt-row print population, scripting enabled/disabled, keyboard focus and screen-state preservation, actual text containment, and restored hidden-summary/content faults in three engines. |
| `tools/about-media-browser-contract.mjs` | About-media behavior and its own observations. |
| `tests/context-canvas/visitor-image-delivery.browser.mjs` | Loopback delivery of every About, AI Systems, and Debriefs `img[src]` receiver in Chromium and Playwright WebKit, including browser-selected sources, image media types, route-appropriate eager or lazy loading, and intrinsic dimensions. The focused About media contract owns its native-video poster. |
| `tests/context-canvas/video-receivers.browser.mjs` | Native-video receiver containment, passive poster requests, and accessible relationships across the selected Debrief and AI Systems pages. |
| `tests/context-canvas/who-to-believe-system-graph.browser.mjs` | Who To Believe source-authentic graph admission, malformed-data fallback and repaired remount, mount-local identity, direct local-file initialization, architecture comparison, concern emphasis, direct node and incoming/outgoing-neighbor traversal, focus and status, the 75rem reading-container seam observed at the current 1280-pixel viewport boundary, viewport containment, forced colors, reduced motion, print, and scriptless recovery. |
| `tools/canvas-iframe-route-browser-contract.mjs` | Iframe route and carrier behavior. |
| `tools/iframe-visual-media-browser-contract.mjs` | Generated iframe visual-media delivery, media geometry, alternative text, and route-owned browser observations. |
| `tools/core-decision-canvas-contract.mjs` | Decision-canvas family assertions and artifacts. |
| `tools/core-iframe-carrier-contract.mjs` | Core carrier assertions and delivery roots. |
| `tools/core-planning-instrument-contract.mjs` | Planning-instrument family assertions and artifacts. |
| `tools/core-reference-instrument-contract.mjs` | Reference-instrument family assertions and artifacts. |
| `tools/cross-prototype-exchange-contract.mjs` | Producer, adapter, and receiver exchange assertions. |
| `tools/initiative-costing-label-contract.mjs` | Costing-label behavior and scope. |
| `tools/table-reading-contract.mjs` | Table scenarios and shared-observer checkpoints. |
| `tests/core-architectures/jobs-text.browser.mjs` | Jobs/text state and case identity. |
| `tests/core-architectures/recovery-import.browser.mjs` | Recovery/import state and case identity. |
| `tests/tables/conditioning.browser.mjs` | Conditioning table behavior and checkpoints. |
| `tests/tables/core-followthrough/browser.mjs` | Core follow-through table behavior and checkpoints. |
| `tests/tables/hiring-schema-print.browser.mjs` | Hiring/schema table and print behavior. |
| `tests/context-canvas/fmi-reading-room.browser.mjs` | FMI companion text distribution, rail-aware column seams, compact notes, canonical six-beat borders, alternate media, and prototype-link closure; restored layout faults distinguish the repaired behavior. |
| `tests/context-canvas/debrief-catalog-preview.browser.mjs` | Catalog preview replacement plus sixteen Case Brief projections, thirty-two independent collapsed track disclosures, state-aware labels, responsive geometry, atomic fallback, forced colors, print, and HTTP/direct-file behavior in Chromium and Playwright WebKit. |
| `tests/context-canvas/debrief-reading-layout.browser.mjs` | Movement-header completeness, headings above column prose, wide evidence between prose runs, direct principle-to-heading ownership, and state-based container settlement across seventeen reading consumers and six independent catalog controls in Chromium, Firefox, and Playwright WebKit, including alternate modes and controlled layout regressions. |
| `tests/context-canvas/debrief-caption-colors.browser.mjs` | Caption foreground inheritance across dark fields and light insets; catalog inventory, link and alternate-media paint, bounded texture observation, and fault recovery. |
| `tests/context-canvas/debrief-hero-wrapping.browser.mjs` | Twenty-three catalog title and introductory text regions, including the independent NEG lead: narrow ordinary and enlarged containment, desktop and wide composition parity, print and forced colors, scriptless named controls, and restored oversized-word faults across three engines. |
| `tests/context-canvas/debrief-link-cues.browser.mjs` | Twenty-three Debriefs and their catalog: complete outgoing-link inventory, visible and accessible destination cues, preserved native tab choice, SVG sizing and first-load columns, Registry materialization, alternate media, and restored cue or initialization faults. |
| `tests/context-canvas/debrief-hero-colors.browser.mjs` | Twenty-three catalog headers for solid paint; three opt-in route palettes for contrast, viewport and text containment, link states, and alternate media; held FMI LIMS hero and restored gradient or foreground faults. |
| `tests/context-canvas/debrief-card-measure.browser.mjs` | Nineteen catalog card titles: actual available width beside floated media, laptop line endings, responsive seams, enlarged text, filter and reading modes, alternate media, and restored-measure faults across three engines. |
| `tests/context-canvas/site-navigation.browser.mjs` | Shared primary navigation: complete labels, intrinsic wrapping, flow height, touch and keyboard targets, sticky fragments, focus paint, text enlargement, print, and forced colors across the existing consumer population. |
| `tests/context-canvas/debrief-companion-spacing.browser.mjs` | Thirty-eight opted-in companion frames across fifteen routes: useful narrow reading width, restored-padding comparisons, native multi-digit markers, focused long links, fluid-padding seams, retained wide and print geometry, and three browser engines. |
| `tests/context-canvas/debrief-ordered-room.browser.mjs` | Nine visual-description and procedure panels: actual ordered-item geometry, marker and source sequence, retained media description relationships, compact menu note, responsive seams, enlarged text, alternate media, and restored ordering or distribution faults. |
| `tests/context-canvas/debrief-evidence-room.browser.mjs` | Seventeen compact evidence and operating notes across nine routes: frame and text geometry, painted rail clearance, source order and links, sampling disclosure, enlarged text, alternate media, positive ledger control, and restored frame faults. |
| `tests/context-canvas/debrief-prose-code-room.browser.mjs` | Nine sustained prose/evidence companions and three code examples: content-derived columns or regions, code-line reachability, heading-first source order, disclosure states, enlarged text, alternate media, three browser engines, and restored layout faults. |
| `tests/context-canvas/fmi-reading-rail.browser.mjs` | Authored FMI rail current versus selected state, native navigation/history, compact label reachability, reflow, scriptless recovery, and restored state/clipping faults across three engines. |
| `tests/context-canvas/debrief-reference-figures.browser.mjs` | Thirty-five-figure cascade, local keyboard scrolling, portrait fit, scriptless width boundary, two opt-in bounded captions, painted-owner and text-fragment containment, unchanged media geometry, alternate media, and restored faults across three engines. |
| `tests/context-canvas/ai-entry-cascade.browser.mjs` | Five entry bridges, accepted cascade, 30rem shadow seam, print and forced-color treatment, controlled faults and restoration across three engines. |
| `tests/context-canvas/ai-systems-reading-layout.browser.mjs` | Twenty-six AI Systems and Shared Machinery readings plus the Debriefs parent across three engines and narrow, desktop, and wide dimensions; repaired reading owners, container seams, text containment, local overflow, alternate presentations, controlled faults, and restoration. |
| `tests/context-canvas/debrief-architecture-cards.browser.mjs` | Eight comparison grids across seven Debriefs retain contiguous card fragments, local text, shadows, source order and useful full-width distribution across Chromium, Firefox and Playwright WebKit; grid/prose seams, alternate modes and a before-parse restoration of the original nesting. |
| `tests/context-canvas/card-rail-clearance.browser.mjs` | Thirty generated-rail routes keep card text and hard-shadow paint inside the shared available frame and clear of persistent rail markers and focus outlines; exact consumers, responsive seams, enlarged text, narrow touch, alternate modes, control owners, and restored intersection are observed in three engines. |
| `tests/context-canvas/ai-narrow-reading.browser.mjs` | AI Systems family reading at narrow widths with enlarged text: complete heading and navigation-card content, local scroll ownership, normal-size controls and fault restoration across Chromium, Firefox and Playwright WebKit. |
| `tests/context-canvas/linked-reading-containment.browser.mjs` | Eight independently styled AI example readings preserve complete text at narrow widths with enlarged type; the independent control, ordinary desktop geometry, local evidence scrolling, keyboard access, alternate modes, and restored wrapping faults remain explicit across Chromium, Firefox, and Playwright WebKit. |
| `tests/context-canvas/technology-fit-layout.browser.mjs` | Technology Fit Sampling Tableau header and comparison-toolbar layout across three engines and source-adjacent dimensions, including complete controls, local overflow, comparison state, enlarged text, and controlled historical faults. |
| `tests/context-canvas/prompt-side-figure.browser.mjs` | The Prompt-Side article's linked SVG overview, keyboard and pointer journey, static reading, and print at narrow and desktop widths. |
| `tests/visualization-fidelity-atlas/atlas-cascade.browser.mjs` | Atlas CSS cascade, local table/SVG canvases, hidden states, closed print disclosures, forced colors, static reading, and restored faults across three engines. |
| `tests/visualization-fidelity-atlas/atlas-essay.browser.mjs` | Essay figure/table checks and context modes. |
| `tests/visualization-fidelity-atlas/atlas-gallery.browser.mjs` | Gallery selection, recovery, export, and context modes. |
| `tests/visualization-fidelity-atlas/atlas-research.browser.mjs` | The research example's native table, linked SVG, source disclosure, keyboard scrolling, and print reading at narrow and desktop widths. |

## Remaining non-HTTP or external-receiver routes

| Entry | Disposition and reason |
| --- | --- |
| `tests/visualization-fidelity-atlas/atlas-reference.browser.mjs` | Retain file-URL SVG observation, its independent positive-gap and negative-mutation assertions, and the atlas-reference screenshot identity. HTTP reuse would not improve this case. |
| `tools/context-canvas-medium-containment-contract.mjs` | Retain file/source geometry campaign, discovered frames, and width boundaries. Its receiving question is containment, not static delivery. |
| `tools/context-canvas-narrow-rail-contract.mjs` | Retain file-URL rail observation and its narrow/seam viewports. Existing observer reuse remains the meaningful shared boundary. |
| `cloudflare/schemas-worker/test/catalog-browser.mjs` | Retain the HTTPS receiver. It observes scriptless catalog behavior at 390 and 1280 pixels, blocks cross-origin requests, and owns schema-worker screenshots. A repository HTTP server would change its subject. |

## Worker dependency route

The Worker browser entry imports `playwright`. The root's `@playwright/test`
installation supplies that package; the Worker package retains its own
Wrangler dependency. A bounded resolution-only observation from the Worker
directory established that Worker and root resolve the same installed
Playwright package:

```sh
node --import ../../tools/node-runtime-admission.mjs --input-type=module -e 'import assert from "node:assert/strict"; import {createRequire} from "node:module"; import {resolve} from "node:path"; const worker=createRequire(resolve("package.json")); const root=createRequire(resolve("../../package.json")); assert.equal(worker.resolve("playwright"),root.resolve("playwright")); console.log("Worker and root resolve the same Playwright package; no browser launched.");'
```

That observation establishes local dependency resolution, not Chromium
installation or Worker receiver behavior. The existing command, invoked
from the repository root with an approved HTTPS root origin, remains:

```sh
npm --prefix cloudflare/schemas-worker run test:browser -- 'https://<approved-host>/'
```

The existing `--local-tls` exception applies only to an explicitly chosen
loopback HTTPS origin. Provisioning, origin authorization, and an actual
Worker browser run remain separate gates; this pilot neither installs
dependencies nor dispatches that receiver.

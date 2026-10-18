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
| `tools/core-architecture-browser-helper.mjs` | Retain unchanged as the shared server and four-channel telemetry primitive. Its existing consumers remain in place. |
| `tools/open-lesson-field-contract.mjs` | Retain this wave. Its static server is a plausible later reuse candidate, but direct/embedded route policy and timestamped screenshot/summary identity belong to its campaign. |
| `tools/narrative-architecture-contract.mjs` | Retain. Its 14 verification journeys and projection semantics remain family-owned; a future lifecycle migration needs its own parity observation. |
| `tools/strategy-canvas-contract.mjs` | Retain. Attribution, projection, story phases, and screenshot/summary production are a larger receiving boundary than this pilot. |
| `tools/visual-check.mjs` | Retain its optional HTTP adapter. File and remote inputs, viewport/rail/iframe capture, and summary behavior remain explicit modes. |
| `tools/context-canvas-visual-reference.mjs` | Retain. Its broader image/font MIME support, lazy-load settlement, and full-family screenshot identities are not interchangeable with the smaller Core MIME set. |
| `tests/investment-analysis/browser.test.mjs` | Retain its bespoke server. `/sandbox/` uses package-plan sandbox tokens and `/packaged/` serves package-plan bytes; these are carrier assertions, not ordinary static routing. Existing instrument screenshots stay owned here. |
| `tests/investment-analysis/presentation.browser.test.mjs` | Retain. Its additional image MIME types, package-controlled iframe, 13-width campaign, print/forced-color/scriptless states, and investment-cohesion artifacts require separate evidence. |
| `tests/investment-analysis/capsule.browser.test.mjs` | Reuse Core through the new family adapter. It needs ordinary repository-static delivery and has a small, exact state/transfer case with no custom carrier routes. |

## Existing direct Core consumers

These 18 entries retain their imports and case ownership. This disposition
does not claim a new audit or execution of all their assertions.

| Entry | Retained receiving responsibility |
| --- | --- |
| `tools/about-media-browser-contract.mjs` | About-media behavior and its own observations. |
| `tests/context-canvas/visitor-image-delivery.browser.mjs` | Loopback delivery of every About, AI Systems, and Debriefs `img[src]` receiver in Chromium and Playwright WebKit, including browser-selected sources, image media types, route-appropriate eager or lazy loading, and intrinsic dimensions. The focused About media contract owns its native-video poster. |
| `tests/context-canvas/video-receivers.browser.mjs` | Native-video receiver containment, passive poster requests, and accessible relationships across the selected Debrief and AI Systems pages. |
| `tests/context-canvas/who-to-believe-system-graph.browser.mjs` | Who To Believe source-authentic graph admission, malformed-data fallback and repaired remount, mount-local identity, direct local-file initialization, architecture comparison, concern emphasis, direct node and incoming/outgoing-neighbor traversal, focus and status, the 75rem reading-container seam observed at the current 1280-pixel viewport boundary, viewport containment, forced colors, reduced motion, print, and scriptless recovery. |
| `tools/canvas-iframe-route-browser-contract.mjs` | Iframe route and carrier behavior. |
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
| `tests/context-canvas/debrief-ordered-room.browser.mjs` | Nine visual-description and procedure panels: actual ordered-item geometry, marker and source sequence, retained media description relationships, compact menu note, responsive seams, enlarged text, alternate media, and restored ordering or distribution faults. |
| `tests/context-canvas/debrief-evidence-room.browser.mjs` | Seventeen compact evidence and operating notes across nine routes: frame and text geometry, painted rail clearance, source order and links, sampling disclosure, enlarged text, alternate media, positive ledger control, and restored frame faults. |
| `tests/context-canvas/debrief-prose-code-room.browser.mjs` | Nine sustained prose/evidence companions and three code examples: content-derived columns or regions, code-line reachability, heading-first source order, disclosure states, enlarged text, alternate media, three browser engines, and restored layout faults. |
| `tests/context-canvas/fmi-reading-rail.browser.mjs` | Authored FMI rail current versus selected state, native navigation/history, compact label reachability, reflow, scriptless recovery, and restored state/clipping faults across three engines. |
| `tests/context-canvas/debrief-reference-figures.browser.mjs` | Dense figure cascade, local keyboard scrolling, portrait fit, scriptless width boundary, alternate media, and restored extraction faults across three engines. |
| `tests/context-canvas/ai-entry-cascade.browser.mjs` | Five entry bridges, accepted cascade, 30rem shadow seam, print and forced-color treatment, controlled faults and restoration across three engines. |
| `tests/visualization-fidelity-atlas/atlas-cascade.browser.mjs` | Atlas CSS cascade, local table/SVG canvases, hidden states, closed print disclosures, forced colors, static reading, and restored faults across three engines. |
| `tests/visualization-fidelity-atlas/atlas-essay.browser.mjs` | Essay figure/table checks and context modes. |
| `tests/visualization-fidelity-atlas/atlas-gallery.browser.mjs` | Gallery selection, recovery, export, and context modes. |

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
node --input-type=module -e 'import assert from "node:assert/strict"; import {createRequire} from "node:module"; import {resolve} from "node:path"; const worker=createRequire(resolve("package.json")); const root=createRequire(resolve("../../package.json")); assert.equal(worker.resolve("playwright"),root.resolve("playwright")); console.log("Worker and root resolve the same Playwright package; no browser launched.");'
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

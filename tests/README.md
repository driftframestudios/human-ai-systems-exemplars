# Repository checks

## Repository-wide discovery

Start with the [owned suite catalog and plan-only commands](suites/README.md).
It maps Node source/unit and browser modules, Python table checks, nested
projects, visual tools, carrier checks, live receivers and opt-in research.
Existing commands and assertions remain with their source owners.

```sh
npm run test:suites:list
node tools/test-suite-plan.mjs --suite node.visualization-fidelity-atlas --json
node tools/test-suite-plan.mjs --suite python.tables.table-context --json
```

These invocations list metadata and prerequisites. Execution is a separate
receiving action. Source-file counts remain distinct from runtime test cases.

## Existing family check guide


This directory exercises behavior owned by the Core Architecture and Narrative
Architecture prototype families. The source artifact, its adjacent schema or
manifest, and its nearest README remain the meaning authority; these tests make
selected expectations executable.

## Choose the smallest fitting observation

Begin with the source owner's focused command. The sections below separate
build boundaries, deployment assembly, source contracts, and rendered browser
behavior so one passing result keeps a clear evidence scope.

The documentation route contract checks the repository's current Markdown
forms: inline and used reference links in ordinary, quoted, and list prose;
ATX headings and explicit HTML identifiers; and fenced or inline code kept at
rest. It rejects repository and symlink escapes, checks local targets and
fragments, follows directory-to-README routes, and requires exact live-link
membership for every active skill in the skill catalog. A publication-template
README can also resolve through an exact declared receiver and its checked-in
runtime manifest; the target must remain a contained, present publication
asset, and an undeclared, stale, or incomplete receiver still fails:

```sh
npm run check:readme-routes
```

It establishes navigability for the checked-in README graph. It leaves prose
quality, external URLs, release standing, and human interpretation to their
own sources and reviewers. A materially new Markdown form enters with its own
focused fixture or a maintained parser boundary before the contract claims it.

## Repository handoff foundation

The portable foundation validator, local installer, and GitHub Issue-route
materializer stay dependency-free. Their focused source contract pairs
isolated Node-only checks with Ajv 2020 validation of the manifest, profile,
technology-profile, local-receipt, Issue-seed, binding, and Issue-route receipt
schemas:

```sh
npm run test:repository-handoff-foundation
npm run check:repository-handoff-foundation
```

The suite copies the bundle into temporary directories and exercises clean,
matching, owner-edited, missing, tampered, symbolic-link, special-file,
resource-bound, mutated-manifest, concurrent projection, clean local and Issue
route apply, plan-drift, collision, receipt, and rollback states. The Issue
route fixtures also exercise bounded pagination, pull-request filtering,
case-folded and archived-label identity, two-pass links, dropped metadata,
owner-edited live Issues, rendered-request admission, explicit apply
confirmation, stale-plan refusal, failed-verification signaling, and
create-only receipt targets. A passing result
establishes digest-bound schema identity, schema conformance, deterministic
planning and verification, plan-confirmed create-only installation, bounded
source admission, portable target admission, fixed Issue-relation semantics,
ownership-stable receipt re-entry, two-pass Issue-route behavior against an
in-memory GitHub adapter, source-digest procedure identity, technology-profile
evidence, fact-area and base-selection closure, and exact JSON/YAML projection
bytes for the checked-in working bundle. A separately authorized live GitHub
exercise can establish current platform behavior; received application
behavior and owner acceptance retain their named evidence routes.

## Public-reference materialization

Public-reference materialization has a separate dependency-free contract
because it protects a build boundary rather than Core or Narrative prototype
behavior:

```sh
npm run test:public-reference-materializer
```

That suite uses synthetic destinations and temporary directories. It exercises
context-aware anchor and JSON-LD substitution, configuration failures,
source/output separation, retained-generation recovery, and the current
Context Canvas source without retaining or reporting configured destinations.
The repository case discovers its keys and occurrences from source; migration
counts remain a historical observation rather than a release threshold.

## Public iframe route packaging

Public iframe route packaging has a separate dependency-free boundary:

```sh
npm run test:iframe-routes
npm run check:iframe-routes
npm run test:iframe-carriers
npm run test:canvas-iframe-routes
npm run test:iframe-visual-media-browser
npm run test:iframe-ancestry-browser
npm run test:iframe-browser
```

The focused suite verifies exact agreement across the 23-route Core family,
the 15-route Canvas family, and their aggregate `/v1/` receipt. It covers
normalized and collision-free aliases, bounded regular-file inputs, explicit
package-local media, static runtime-resource observation, byte-identical and
generated projections, deterministic receipts, unresolved local navigation,
observed carrier-capability agreement, and exclusion of undeclared routes. The
check forms the complete package in a temporary directory and leaves live
delivery unchanged. The static carrier inventory accounts for all 28 iframe
occurrences and 23 distinct hosted aliases while preserving adjacent local
full-view links.

The Core carrier contract exercises its cross-origin route inside the declared
sandbox. The Canvas route contract exercises all 15 generated documents inside
their exact sandbox and Permissions Policy profiles, including package media,
popup, clipboard, download, modal, print, scriptless, keyboard, request-closure,
telemetry, and 320-pixel containment observations. The standalone
visual-media contract forms a temporary 38-route package and reads each route
under reduced motion, print, forced colors, and 200% fixed/sticky-focus stress.
It also checks computed SVG names, view boxes, rendered bounds, instance IDs,
and text equivalents; the source suite compares authored and projected SVG
semantic markers and exact package-local SVG bytes. The standalone
`test:iframe-ancestry-browser` fixture proves Chromium allows the exact
`https://vik.guru` parent and refuses a loopback parent when the same child
response carries the production-shaped `frame-ancestors` directive; it does
not claim that production served that header. `test:iframe-browser` composes
the Core carrier, Canvas route, and complete visual-media contracts. Live
activation pairs the complete response verifier with one focused parent/child
observation:

```sh
npm run verify:iframe-routes:live
npm run verify:iframe-routes:policy
npm run verify:iframe-ancestry:live
```

The first two commands retain all-route byte and header coverage. The ancestry
check uses the fixed PODA carrier for a representative HTTP 200 and exact-policy
preflight, a loopback-parent refusal, and an approved-production-parent positive
control. Cache behavior and the remaining deployed-parent observations stay
with delivery activation.

## Context Canvas source, media, and visual reference

The Context Canvas keeps source assertions, responsive-media integrity,
focused interaction checks, and the complete resting-state reference
separable:

```sh
npm run test:context-canvas
npm run check:debrief-image-derivatives
npm run test:debrief-catalog-preview-browser
npm run test:about-media-browser
npm run test:context-canvas-medium-containment
npm run test:context-canvas-narrow-rails
npm run visual:context-canvas-reference -- --phase <name>
```

The derivative check requires no encoder and leaves bytes unchanged; it
verifies eligible widths, exact dimensions, and accepted-source aspect ratios.
The build route requires `cwebp` and remains separately invoked after an
accepted source replacement. The catalog-preview browser contract proves that
responsive WebP metadata, SVG fallback metadata, captions, alternatives, and
intrinsic geometry replace one another without stale attributes or horizontal
overflow.

The complete visual runner discovers every top-level route and requires each
route to belong to exactly one family. Its standing three-viewport campaign is
46 routes and 138 captures. Exit success establishes capture completion only;
review `summary.json` for console, HTTP, page, request, and traversal
observations before interpreting the run.

## Media preparation and R2 video delivery

The media-publication suite keeps source preparation, Worker behavior, and a
live edge observation as three distinct receivers:

```sh
npm run test:media-publication
npm run dry-run:r2-video-delivery
npm run media:video:inspect -- --source <source.mp4>
npm run media:video:prepare -- --source <source.mp4> --output <master.mp4>
npm run media:video:verify -- --source <master.mp4>
```

The local tests exercise preparation routing, strict decode, Fast Start,
copy-remux packet identity, selected scaling geometry, sanitized metadata
reporting, atomic promotion and cleanup disposition, the finite public path
grammar, exact R2 key mapping, typed response failures, stream ownership,
bounded reads, and both head-first and cold-range-first live verification.
The required CI receiver proves both real FFmpeg preparation branches and the
synthetic failure contracts. The Wrangler dry run establishes
that the selected source bundles against the declared R2 binding and route; it
does not create a bucket, upload bytes, attach the route, or observe the edge.

After human-owned R2 upload and route activation, use the explicitly admitted
live check:

```sh
npm run verify:r2-video:live -- \
  --video https://vik.guru/v1-cdn/video/<id>/<version>/movie.mp4 \
  --captions https://vik.guru/v1-cdn/video/<id>/<version>/captions.en.vtt \
  --captions-sha256 <accepted-caption-sha256> \
  --captions-size <accepted-caption-bytes> \
  --descriptions https://vik.guru/v1-cdn/video/<id>/<version>/descriptions.en.vtt \
  --descriptions-sha256 <accepted-description-sha256> \
  --descriptions-size <accepted-description-bytes> \
  --poster https://vik.guru/v1-cdn/video/<id>/<version>/poster.webp \
  --poster-sha256 <accepted-poster-sha256> \
  --poster-size <accepted-poster-bytes> \
  --sha256 <accepted-video-sha256> \
  --size <accepted-video-bytes>
```

Add `--cold-range-first` only for the second fresh-version canary. That command
requires `Cf-Cache-Status: MISS` on the initial `bytes=0-1` response before it
continues, then observes one named public receiver: complete metadata, strong
validator, immutable policy, hardening, cached range behavior, bounded full
digest, and optional companion transport and byte identity. Companion content
validity remains a separately named review. Its sanitized JSON omits URLs,
validator values, response bodies, exception details, and protected platform
coordinates. Signed-out browser playback, captions, transcript, rights, and
human release acceptance retain their separate owners.

## Production assembly and cPanel carrier

Production assembly and the cPanel carrier have their own repository-level
contract:

```sh
npm run check:debrief-image-derivatives
npm run test:prod-deployment
npm run check:prod-projection
npm run build:prod-projection
npm run stage:prod-carrier
npm run check:prod-carrier
```

The test suite covers explicit primary membership, Core and Canvas package
composition, URL materialization, exact digests, separate document roots,
transactional replacement, deployment-bundle ancestry, and the fail-closed
installer.
The projection check composes and verifies a temporary result; the build
replaces only ignored `.prod-projection-build/`. Staging replaces only the
tracked cPanel deployment bundle, and the bundle check requires its committed
files to match the accepted first-parent source. Host selection, live
installation, and public-response observation begin in their named deployment
steps.

## Visitor attribution

The attribution suite applies one visitor-boundary rule to every governed
HTML carrier. Top-level Context Canvas pages use the shared contract and shell;
self-contained prototypes and canonical generator templates carry the same
ordered marker content with local narrow, print, and forced-color treatment.
When an owning source or template changes, its maintained projections and
iframe package digests are rebuilt together. The exact marker strings remain
centralized in `visitor-boundary-contract.js` and its focused tests.

## Secret-material inspection

Secret-material inspection has its own focused behavior contract:

```sh
npm run test:secret-material
```

The structural cases cover immutable release-asset mapping, install receipt and
binary integrity, generated-canary behavior, finding-versus-operation exits,
sensitive scanner-metadata containment, one reviewed suppression surface,
filesystem and cross-platform artifact boundaries, Git target overrides, and
exact raw-index materialization without checkout filters. With the verified
local Betterleaks binary present, integration cases also prove skip-worktree
coverage, canary-bearing filenames and commit metadata, and merge-resolution
history. These are mechanism observations rather than a detector score or a
universal secret-absence claim.

## Prototype unit baseline

Run the complete unit baseline from the repository root:

```sh
npm run test:prototype-units
```

Run one family while working at its source boundary:

```sh
npm run test:core-architectures
npm run test:narrative-architectures
```

The Core suite loads the dependency-free Strategy Canvas runtime in an isolated
JavaScript context and checks state, history, migration, and current manifest
identity. The Narrative suite checks the dependency-free Strategy Canvas
adapter and compiles the governed Narrative schemas with the repository's
installed Ajv 2020-12 implementation. Material valid and invalid cases stay
close to the contracts they exercise.

## Rendered and exchange behavior

Standard `node:test` output is the complete local observation. Focused browser
contracts remain available for behavior that requires a rendered page:

```sh
npm run test:core-browser
npm run test:canvas-iframe-routes
npm run test:iframe-browser
npm run test:iframe-ancestry-browser
npm run test:core-decision-canvases
npm run test:core-planning-instruments
npm run test:core-reference-instruments
npm run test:strategy-canvas
npm run test:narrative-browser
npm run test:prototype-exchanges
```

A durable public handback names the selected repository script, public revision
when needed, normalized result, and scope boundary without copying runner output
or local diagnostic coordinates.

The Core aggregate opens both declared projections of twenty tranche-owned
artifacts in fresh browser contexts. Strategy Canvas keeps its dedicated
browser contract. The three focused aggregate commands separate the four
decision canvases, nine planning instruments, and seven hierarchy, matrix, and
reference instruments so a change can use the nearest meaningful observation.
Each page demonstrates its owned relationship, one material edit, a derived
and serialized twin, compatible exchange, retained-state recovery, and clear
browser telemetry. The Strategy Canvas route protects its broader
collaboration state and accessibility contract.

The focused Core namespace contract checks the semantic identifiers declared
by each manifest-current canonical artifact and its Context projection. It
also confirms that prior versioned artifacts retain their historical identity
and that semantic-only successors preserve the established static request and
runtime-capability closure.

The Narrative route carries ten fresh-context journeys. Four keep one material
exchange path available for every projection. Six additional decision and
lifecycle journeys protect active-run prompt semantics, exact exclusive
normalization, minimum usable sets, variant lineage, rapid composition
identity, decision synchronization, held-open readiness, reference closure,
declared chronology, literal-text controls, live JSON-LD, detached exchange,
and compatible or retained recovery.

The cross-prototype route carries one serialized boundary journey from the
canonical Core Strategy Canvas v2 producer through the Narrative adapter and
into the Composer. Producer and receiver schemas remain separate assertions;
the adapter preserves source identity and payload fingerprint as lineage while
the Composer retains its own identity. One claimed-v2 mismatch confirms that
the accepted composition and its first editable control remain available.

## Hand back the result

Name the exact repository command, normalized result, behavior it establishes,
coverage boundary, and next receiver. Raw logs, browser state, credentials,
private routes, and user-specific paths remain with their existing local or
access-controlled owner. Return to the [repository root](../README.md) for the
standing evidence and automation posture.

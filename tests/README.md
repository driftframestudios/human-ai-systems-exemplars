# Prototype unit tests

This directory exercises behavior owned by the Core Architecture and Narrative
Architecture prototype families. The source artifact, its adjacent schema or
manifest, and its nearest README remain the meaning authority; these tests make
selected expectations executable.

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

Public iframe route packaging has a separate dependency-free boundary:

```sh
npm run test:iframe-routes
npm run check:iframe-routes
npm run test:iframe-carriers
npm run test:canvas-iframe-routes
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
telemetry, and 320-pixel containment observations. `test:iframe-browser` runs
both rendered delivery contracts. Live response headers, cache behavior, and
deployed-parent behavior remain delivery activation checks.

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

Standard `node:test` output is the complete local observation. Focused browser
contracts remain available for behavior that requires a rendered page:

```sh
npm run test:core-browser
npm run test:canvas-iframe-routes
npm run test:iframe-browser
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

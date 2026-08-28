# Core Architectures chimeric prototype pack

This directory is the repository source for the current self-contained Core
Architecture prototype pack. Each HTML artifact carries its own document,
styles, SVG or table surface, structured state, and vanilla JavaScript
interaction. The pack manifest supplies current identity and file discovery;
the artifact itself supplies runtime behavior.

## Source relationships

- `core-architectures-chimeric-prototype-manifest-v0.1.json` names the current
  pack entries, versions, paths, and material byte or digest receipts.
- `core-architectures-chimeric-prototype-pack-index-v0.1.1.html` provides the
  human-facing pack route.
- `strategy-canvas-system-v0.2/` owns the shared Strategy Canvas schema,
  validator, state engine, canonical source, and build contract.
- `context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/`
  is the Context Canvas projection. Its local manifest names the copied and
  adapted paths, including the Context-specific Strategy Canvas workbench.

Artifact variation is part of the family: route-specific layout, color,
density, interaction, and evidence posture remain available while stable IDs,
current versions, and declared source relationships keep the pack legible.

## Visitor-visible authorship and license

The pack hub and each of the 21 current prototype documents carry their own
authorship and licensing context: one `author` metadata value, one Apache-2.0
license relation, and one semantic `footer.artifact-attribution` with the full
visitor-visible notice. The same contract is present in each Context Canvas
projection, including its four intentional adaptations. The notice therefore
travels directly with each self-contained HTML carrier across projections and
publication.

Strategy Canvas is maintained through its canonical template and stylesheet;
the generated current distribution inherits the contract. The current visitor
set covers Strategy Canvas v0.2.0. The resting v0.1.1 compatibility route is
generated from its system-local source, including a location-correct link and
the same attribution contract. Its Context Canvas workbench retains its
adapted document and style owners. The repository-root `LICENSE` remains the
complete license text.

## Public iframe route projection

`public-iframe-route-manifest-v1.json` binds the pack hub and 21 current
prototypes to 22 exact aliases beneath `https://iframes.vik.guru/v1/core/`.
It keeps four relations separate: authored source identity, transferable route
projection, per-route activation standing, and live delivery. Forming the
package does not activate a route.

The same manifest carries each route's minimal carrier policy. The scriptless
pack hub uses an empty sandbox. A prototype with executable behavior grants
`allow-scripts`, and a route that writes clipboard text delegates only the
`clipboard-write` Permissions Policy feature. Every current route now uses an
ordinary inline notice, input, or two-step confirmation instead of native
browser dialogs, so no route retains a held capability. An `eligible` route is
invalid when any hold remains. The policy vocabulary stays intentionally
narrow: a newly observed capability returns to source review and an explicit
contract revision before activation.

Build the ignored, dependency-free projection:

```sh
npm run build:iframe-routes
```

The build writes `.iframe-route-build/iframes.vik.guru/v1/core/`. Each
prototype becomes its route-local `index.html` without changing its bytes. The
hub alone receives projection-local links to its 21 sibling routes and
`manifest.json`. A deterministic `route-manifest.json` records source and
projection digests, static-resource evidence, activation standing, and
unresolved user-activated local navigation. It also records the observed
runtime capabilities beside the exact carrier policy, making policy drift
visible in the upload-ready receipt. The Strategy Canvas route also carries its
explicitly linked JSON Schema as one route-local, content-typed companion.

Verify the complete package in a temporary directory without retaining output:

```sh
npm run check:iframe-routes
npm run test:iframe-routes
```

Runtime resources remain inline unless a route declares an exact
`package_files` source-to-target allowlist with an explicit content type. The
packager copies those regular files byte-for-byte beneath that route and
rejects statically observable ambient or network references, path escape,
symbolic links, missing files, and unused declarations. Ordinary citations and
user-activated links are observed separately from runtime resources; an exact
route-local companion named in `package_files` is also retained when an anchor
reaches it. This lets
parity and navigation decisions stay visible without silently rewriting an
adapted receiver.

The source scan covers resource-bearing markup, CSS and SVG dependency graphs,
and selected JavaScript network primitives. It does not claim to prove every
dynamic browser request. A browser request graph and the intended delivery
policy remain required activation evidence for every selected route.

The optional Strategy Canvas v0.1.1 compatibility alias remains resting and is
not generated. Upload, Cloudflare configuration, neighboring-path behavior,
receiver repointing, and public activation remain later review steps.

## Direct checks

Run the DOM-independent Core cases and current identity examples:

```sh
npm run test:core-architectures
```

Confirm Strategy Canvas source-to-distribution parity:

```sh
node core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/build.mjs --check
```

Exercise behavior that requires the canonical page and Context workbench:

```sh
npm run test:strategy-canvas
npm run test:core-browser
```

The direct suite establishes the named state, migration, store-observation,
aggregation, and manifest-identity cases. The browser contract establishes its
rendered interaction, recovery, accessibility, and collaboration-channel
slices. `test:core-browser` exercises all three current Core tranches across
the root and Context projections. The focused commands remain available during
a named change:

```sh
npm run test:core-decision-canvases
npm run test:core-planning-instruments
npm run test:core-reference-instruments
```

The decision-canvas tranche covers Impact Map, Service-design Blueprint, HEART
Chart, and Specification-by-Example. The planning-instrument tranche covers
PODA, Alignment Worksheet, First Responsible Version Matrix, Shared Surface
Priority Map, AI Systems Service Blueprint, Software Architecture Views,
Participatory Design Kit, Plus / Delta, and Upstream Revision Loop. Each page
demonstrates one owned edit, its derived and serialized state, focus or order,
compatible exchange, retained-state recovery, and clear browser telemetry. The
reference tranche covers Context Tree, Jobs-to-be-Done Treemap, Practitioner
Judgment Probes, Pattern–Problem Surface Matrix, Unit-test-first Design,
Recovery Routing Atlas, and the Core Architecture Family Index. It also
confirms that the pack index directly routes to the twenty cards and root index
declared by the manifest. A change selects the smallest command that observes
its behavior.

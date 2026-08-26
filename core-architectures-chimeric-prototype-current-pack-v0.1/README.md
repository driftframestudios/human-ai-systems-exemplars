# Core Architectures chimeric prototype pack

This directory is the repository source for the current self-contained Core
Architecture prototype pack. Each HTML artifact carries its own document,
styles, SVG or table surface, structured state, and vanilla JavaScript
interaction. The pack manifest supplies current identity and file discovery;
the artifact itself supplies runtime behavior.

## Source relationships

- `core-architectures-chimeric-prototype-manifest-v0.1.json` names the current
  pack entries, versions, paths, and material byte or digest receipts.
- `core-architectures-chimeric-prototype-pack-index-v0.1.html` provides the
  human-facing pack route.
- `strategy-canvas-system-v0.2/` owns the shared Strategy Canvas schema,
  validator, state engine, canonical source, and build contract.
- `context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/`
  is the Context Canvas projection. Its local manifest names the copied and
  adapted paths, including the Context-specific Strategy Canvas workbench.

Artifact variation is part of the family: route-specific layout, color,
density, interaction, and evidence posture remain available while stable IDs,
current versions, and declared source relationships keep the pack legible.

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

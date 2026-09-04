# Schema registry

This directory is the human orientation and source home for the repository's shared machine-readable contracts. Start with the family that matches the work in front of you. Each family then leads to an exact schema, an example where one is available, and an explanation of who owns its meaning.

The [static discovery page](index.html) presents the same first-contact route when this directory is built for the public schema site.

## Start here

| Family | What it describes | Contract and examples |
|---|---|---|
| Repository collection 1.0.0 | Repository entry points, related families, source and delivery roles, and lived use | [Schema](prototype-exemplars/1.0.0/prototype-exemplars.schema.json) · [Example](prototype-exemplars/1.0.0/prototype-exemplars.example.json) |
| Context Canvas 1.0.0 | Collections, visitor surfaces, prototypes, reference artifacts, and intended experience | [Orientation](context-canvas/1.0.0/README.md) · [Schema](context-canvas/1.0.0/context-canvas.schema.json) · [JSON-LD context](context-canvas/1.0.0/context-canvas.context.jsonld) · examples under [`examples/`](context-canvas/1.0.0/examples/) |
| Collaboration Skills 0.1.0 | Portable collaboration instructions and decision-changing observations about their use | [Orientation](collaboration-skills/0.1.0/README.md) · [Skill schema](collaboration-skills/0.1.0/collaboration-skill.schema.json) · [Collaboration-account schema](collaboration-skills/0.1.0/collaboration-account.schema.json) · examples under [`examples/`](collaboration-skills/0.1.0/examples/) |
| A3 Expanded 0.2 | Change records, rendered views, source registration, and coverage for the expanded atlas | [Change record](a3-stacked-cube-atlas-expanded/0.2/expanded-delta.schema.json) · [View model](a3-stacked-cube-atlas-expanded/0.2/expanded-view-model.schema.json) · [Source registry](a3-stacked-cube-atlas-expanded/0.2/source-registry.schema.json) · [Coverage record](a3-stacked-cube-atlas-expanded/0.2/coverage-ledger.schema.json) |
| A3 state 0.1 | Saved state for an A3 stacked-cube decision instrument | [State schema](schemas/a3-stacked-cube-state-v0.1.json) |
| Visualization Fidelity Atlas 0.1 | Visual treatments and the evidence used to compare or select them | [Atlas schema](visualization/visualization-fidelity-atlas.schema.v0.1.json) |
| Strategy Canvas 0.2 | Factors, plotted offerings, weighting, comparison state, and exchange behavior | [Strategy Canvas schema](core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas.schema.json) |
| Local prototype manifest | Files and relationships needed to open a self-contained prototype locally | [Manifest schema](context-canvas-project-surface/context-canvas/prototypes/prototype-local-manifest.schema.json) |

The public build copies these contracts to their declared receiver paths. It also includes the authorship, citation, license, attribution, and data-use files needed to understand the public artifact on its own. Its repository-local Skills route is derived from the reviewed publication selection: each public-ready contract has a readable page, one schema-valid JSON projection, and byte-identical source and dependency copies. A later public-possible entry stays with the repository until its complete source package is ready for the same audience.

## Authority

- The Repository Collection schema describes repository orientation, family relationships, sources, served copies, and lived use. Each contained schema keeps its own meaning and version.
- The Context Canvas schema owns the shared artifact structure for the Canvas. Page HTML, CSS, JavaScript, prototype state, and Visual Fidelity Contracts remain the behavior authority for their own surfaces.
- The Collaboration Skills schemas describe exchangeable records. A skill's `SKILL.md` remains its semantic source, while current user intent and granted tool authority govern each activation.
- Supportive Change Writing and LIMS/ELN keep their package and repository owners. The root schema check exercises one representative use from each without folding them into this public route family.
- Human collaborators retain authority for meaning, public identity, publication timing, and consequential adoption. Automation validates, compares, and proposes within a named scope.

A served copy keeps several relationships separate: the source defines meaning and exact bytes; the publisher decides what may be published; the delivery operator serves the files; and the environment decides which route to prefer. These relationships preserve the contract's declared `$id`.

## Identity and delivery

Each contract keeps the `$id` declared inside its exact-version file. Most current family contracts use `https://schemas.vik.guru/`; earlier contracts preserve their established identifiers under other project domains. A delivery route may change while the identifier, schema vocabulary, and reference behavior remain stable.

| Route | Current role | Source branch |
|---|---|---|
| `https://schemas.radiantnull.com/` | Current GitHub Pages mirror | reviewed `docs` projection; Actions delivery |
| `https://schemas.vik.guru/` | Canonical identity base for most current families and intended first-party route | future `prod` delivery |
| Repository source | Authored review and local collaboration | accepted working branch |

As observed on 2026-09-04, the Radiant Null mirror serves the registry over HTTPS through the repository's verified GitHub Actions route. The Vik Guru hostname resolves and currently returns a service response rather than the registry homepage and contract routes. The mirror is therefore the dependable public retrieval route for this delivery phase.

The active Pages workflow names an accepted `main` commit and a reviewed `docs` commit, rebuilds with the source toolchain, and requires complete path-and-byte agreement. Its default dispatch stops after verification; a deliberate deployment selection uploads and serves the verified artifact. The generated `docs` branch remains the reviewed projection and legacy recovery coordinate rather than an independent publication trigger.

## Version and compatibility

- Exact-version bytes remain stable after publication. A byte change receives another exact-version path.
- The stable core closes at concrete object boundaries. Namespaced `extensions` hold additive local or experimental material.
- Enums represent deliberately closed routing choices. Descriptive vocabularies remain open where use is still growing.
- The four strict root schemas compiled by the local checker are self-contained. A family with external dependencies declares its closure; the LIMS/ELN representative use resolves `common.schema.json` through its own package.
- JSON Schema constrains structure. JSON-LD describes terms and relationships. Human-readable source explains meaning and authority.

## Local validation and build

Install the locked root development dependencies, then run:

```bash
npm run check:schemas
```

The command compiles four strict schemas, validates seven representative instances, exercises one Supportive Change Writing instance and one LIMS/ELN instance, checks nine consequential boundaries, and confirms every declared receiver identity.

Build the public artifact with its observed deployment base:

```bash
PAGES_BASE_URL=https://schemas.radiantnull.com npm run build:schema-pages
```

The builder creates `.schema-pages/`, preserves every declared schema byte, adds the public orientation and attribution carriers, and resolves canonical and social metadata for the receiving origin.

Compare that build with a separately checked-out, reviewed `docs` coordinate:

```bash
npm run check:schema-pages-receiver -- \
  --source-revision <accepted-full-source-sha> \
  --source-branch main \
  --projection-root ../reviewed-docs \
  --projection-revision <reviewed-full-docs-sha> \
  --projection-branch docs
```

The receiver check accepts regular files only and requires exact source and
projection coordinates that belong to their named receiving branches, an
unchanged projection worktree including its ignored paths, identical sorted
membership, and byte-for-byte agreement. It reports one deterministic closure
digest for the pair.

## Extension shape

Extension keys use a scheme-qualified namespace so ownership remains visible:

```json
{
  "extensions": {
    "urn:example:context-canvas:surface-profile": {
      "value": "public_design_input"
    }
  }
}
```

The local check establishes the namespace-key shape. A receiving semantic context can define stronger meaning for its own namespace. Repeated use can support a later core version, while family-specific material can remain namespaced when that keeps its owner easy to find.

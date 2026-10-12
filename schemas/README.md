# Schema registry

This directory is the human orientation and source home for the repository's shared machine-readable contracts. Start with the family that matches the work in front of you. Each family then leads to an exact schema, an example where one is available, and an explanation of who owns its meaning.

The [static discovery page](index.html) presents the same first-contact route when this directory is built for the public schema site.

## Start here

| Family | What it describes | Contract and examples |
|---|---|---|
| Repository collection 1.0.0 | Repository entry points, related families, source and delivery roles, and lived use | [Schema](prototype-exemplars/1.0.0/prototype-exemplars.schema.json) · [Example](prototype-exemplars/1.0.0/prototype-exemplars.example.json) |
| Context Canvas 1.0.0 | Collections, visitor surfaces, prototypes, reference artifacts, and intended experience | [Orientation](context-canvas/1.0.0/README.md) · [Schema](context-canvas/1.0.0/context-canvas.schema.json) · [JSON-LD context](context-canvas/1.0.0/context-canvas.context.jsonld) · examples under [`examples/`](context-canvas/1.0.0/examples/) |
| Collaboration Skills 0.1.0 | Portable collaboration instructions and decision-changing observations about their use | [Orientation](collaboration-skills/0.1.0/README.md) · [Skill schema](collaboration-skills/0.1.0/collaboration-skill.schema.json) · [Collaboration-account schema](collaboration-skills/0.1.0/collaboration-account.schema.json) · examples under [`examples/`](collaboration-skills/0.1.0/examples/) |
| Evidence-Guided Capability Transfer Atlas 0.2 | Change records, rendered views, source registration, and coverage for the expanded atlas | [Change record](../a3-stacked-cube-atlas-expanded-bundle-v0.2/schema/expanded-delta.schema.json) · [View model](../a3-stacked-cube-atlas-expanded-bundle-v0.2/schema/expanded-view-model.schema.json) · [Source registry](../a3-stacked-cube-atlas-expanded-bundle-v0.2/schema/source-registry.schema.json) · [Coverage record](../a3-stacked-cube-atlas-expanded-bundle-v0.2/schema/coverage-ledger.schema.json) · [JSON-LD context](../a3-stacked-cube-atlas-expanded-bundle-v0.2/schema/a3-stacked-cube.context.jsonld) |
| Capability Transfer Model state 0.1 | Saved state for the Evidence-Guided Capability Transfer Model | [State schema](../a3-stacked-cube-visual-system-bundle-v0.1/schema/a3-stacked-cube-state-schema-v0.1.json) · [JSON-LD context](../a3-stacked-cube-visual-system-bundle-v0.1/schema/a3-stacked-cube-visual-system.context.v0.1.jsonld) |
| Visualization Fidelity Atlas 0.1 | Visual treatments and the evidence used to compare or select them | [Atlas schema](../visualization-fidelity-atlas-bundle-v0.1/visualization-fidelity-atlas.schema.v0.1.json) · [JSON-LD context](../visualization-fidelity-atlas-bundle-v0.1/visualization-fidelity-atlas.context.v0.1.jsonld) |
| Strategy Canvas 0.2 | Factors, plotted offerings, weighting, comparison state, and exchange behavior | [Strategy Canvas schema](../core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas.schema.json) |
| Local prototype manifest | Files and relationships needed to open a self-contained prototype locally | [Manifest schema](../context-canvas-project-surface/context-canvas/prototypes/prototype-local-manifest.schema.json) |
| Narrative Architecture and Threadkeeping 0.1 | Capsule composition, semantic and technology-fit sampling state, and durable continuity records | [Cohort orientation](narrative-threadkeeping/0.1/README.md) · schemas, contexts, and material examples retain their named Context Canvas source coordinates |

The public build copies these contracts to their declared receiver paths. It also includes the authorship, citation, license, attribution, and data-use files needed to understand the public artifact on its own. Its repository-local Skills route is derived from the reviewed publication selection: each public-ready contract has a readable page, one schema-valid JSON projection, and byte-identical source and dependency copies. A later public-possible entry stays with the repository until its complete source package is ready for the same audience.

The registry, Skills collection, individual skill pages, and collaboration guide share one static primary navigation route. The Skills collection derives **Use when** and **Produces** language from each selected `SKILL.md`; each individual page repeats the exact Contract Result before its revision and source coordinates. A small featured set supports first contact while the complete catalog remains the inventory authority. The [readable-table and embedded-layout worked reference](examples/readable-table-embedded-layout/index.html) demonstrates one source-owned result inside the same release closure.

## Authority

- The Repository Collection schema describes repository orientation, family relationships, sources, served copies, and lived use. Each contained schema keeps its own meaning and version.
- The Context Canvas schema owns the shared artifact structure for the Canvas. Page HTML, CSS, JavaScript, prototype state, and Visual Fidelity Contracts remain the behavior authority for their own surfaces.
- The Collaboration Skills schemas describe exchangeable records. A skill's `SKILL.md` remains its semantic source, while current user intent and granted tool authority govern each activation.
- The Narrative Architecture package owns reusable capsule and sampling meaning. The Field Guide package owns reusable Threadkeeping meaning. Context Canvas owns the runnable implementations and the checked-in projections selected for public retrieval.
- Supportive Change Writing and LIMS/ELN keep their package and repository owners. The root schema check exercises one representative use from each without folding them into this public route family.
- Human collaborators retain authority for meaning, public identity, publication timing, and consequential adoption. Automation validates, compares, and proposes within a named scope.

A served copy keeps several relationships separate: the source defines meaning and exact bytes; the publisher decides what may be published; the delivery operator serves the files; and the environment decides which route to prefer. These relationships preserve the contract's declared `$id`.

## Identity and delivery

Each contract keeps the `$id` declared inside its exact-version file. Most current family contracts use `https://schemas.vik.guru/`; earlier contracts preserve their established identifiers under other project domains. A delivery route may change while the identifier, schema vocabulary, and reference behavior remain stable.

| Route | Current role | Source branch |
|---|---|---|
| `https://schemas.radiantnull.com/` | Current GitHub Pages mirror | reviewed `docs` projection; Actions delivery |
| `https://schemas.vik.guru/` | Canonical identity base for most current families and active author-controlled schema receiver | reviewed `main` Worker; manifest-pinned schema source |
| Repository source | Authored review and local collaboration | accepted working branch |

The 2026-10-01 delivery observations recorded both hosts serving the then-selected
13-contract publication over HTTPS with accepted bytes and identities. The
Radiant Null mirror uses the reviewed GitHub Pages release; the Vik Guru receiver
uses `cloudflare/schemas-worker/`. The earlier 2026-09-04 inactive-author-host
observation remains historical lineage in Issue #18.

The `pages-v0.2.0` selection adds four exact-version Narrative Architecture and
Threadkeeping contracts, bringing the released Pages cohort and prepared
successor Worker cohort to 17 contracts. Seven JSON-LD contexts, four examples,
and one cohort orientation travel as revalidating companions and stay outside
the contract count. The Worker cohort receives a production observation after
its independently gated activation.

Pages retains its observed `max-age=600` policy. The Worker's manifest names
31 immutable paths for 16 frozen contracts; the unversioned local-manifest
schema and discovery resources revalidate. Each receiver keeps its own cache
policy while preserving the same selected schema bytes. These are dated
delivery observations rather than a continuous-availability guarantee.

The active Pages workflow names an accepted `main` commit and a reviewed `docs` commit, rebuilds with the source toolchain, and requires complete path-and-byte agreement. Its default dispatch stops after verification; a deliberate deployment selection uploads and serves the verified artifact. The generated `docs` branch remains the reviewed projection and legacy recovery coordinate rather than an independent publication trigger.

## Version and compatibility

- Exact-version bytes remain stable after publication. A byte change receives another exact-version path.
- The stable core closes at concrete object boundaries. Namespaced `extensions` hold additive local or experimental material.
- Enums represent deliberately closed routing choices. Descriptive vocabularies remain open where use is still growing.
- The eight strict root schemas compiled by the local checker are self-contained. A family with external dependencies declares its closure; the LIMS/ELN representative use resolves `common.schema.json` through its own package.
- JSON Schema constrains structure. JSON-LD describes terms and relationships. Human-readable source explains meaning and authority.

## Local validation and build

Install the locked root development dependencies, then run:

```bash
npm run check:schemas
```

The command compiles eight strict schemas, validates fifteen representative instances, exercises one Supportive Change Writing instance and one LIMS/ELN instance, checks seventeen consequential boundaries, validates the selected JSON-LD term targets, and confirms every declared receiver identity.

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

## Site releases and retrieval

The GitHub Pages site publishes reviewed source as a versioned site release.
Its download links and page metadata use `schemas.radiantnull.com`; schema
identifiers retain their established values. The generated `schema-catalog.json`
names each identity, host-local retrieval URL, source path, revision, dependency
identities, and digest. `release.json` identifies the site release and source.
Skill catalog `schemaRef` remains the canonical identity; `schemaRetrievalUrl`
provides this site's download. The source selection includes Investment
Analysis 0.2.0: [orientation](investment-analysis/0.2.0/README.md),
[schema](../collaboration/investment-analysis/state.schema.json), and
[example](../collaboration/investment-analysis/example.json).

### Release and recovery contract

1. Accept the source PR on main, including source-owned public material checks.
2. Build with `PAGES_BASE_URL=https://schemas.radiantnull.com`,
   `PAGES_SOURCE_REVISION=<accepted full SHA>`, and
   `PAGES_RELEASE_TAG=<selected pages-vMAJOR.MINOR.PATCH tag>`. Run the schema,
   Pages, and focused browser checks.
3. Review the complete generated artifact in a PR targeting docs. Compare exact
   file membership and bytes with the source build using the receiver verifier.
4. Create an annotated `pages-vMAJOR.MINOR.PATCH` tag on the accepted docs commit.
   Its annotation includes exact `Source-Revision: <SHA>` and
   `Closure-SHA256: <digest>` lines from the receiver comparison. Preserve tags as
   permanent release coordinates; a changed artifact receives a new tag.
5. Dispatch the main Pages workflow with the source SHA, projection SHA, and
   release tag. The default observation leaves activation at rest. Activate the
   same reviewed pair through the explicit deployment input after acceptance.
6. Observe public release metadata, selected schemas, skill sources, media types,
   and missing routes. Publish release notes after deployment succeeds.

Site versions describe catalog, presentation, and delivery changes. Schema
versions describe individual contracts. New capabilities advance the site minor
version; compatible corrections advance its patch version; changed site-level
consumer contracts earn a major version. The accepted current site tag is
`pages-v0.2.0`; `pages-v0.1.0` and earlier deployments retain their own
source/docs receipts.

The published-byte lock lives in `tools/schema-publication-lock.json`. Existing
entries preserve exact-version bytes, including annotations. New identities and
paths receive reviewed additions. Updated visitor display names belong in the
catalog. Recovery keeps every promised schema route; after adding contracts,
prefer a forward repair over an older artifact that omits those routes.

The accepted author-host Worker uses the same selected contract payload. Its
approved deployment and cache/CORS observations remain a separate receipt in
Issue #18 and PRs #311-#313. The catalog's observed edge addition is classified
separately from exact schema-byte parity; the Worker README describes that
source-preservation boundary and its focused check. Selected
reviewed skill source copies are deliberate public artifacts; the complete
operational directories retain their repository-only role. Both builders bind
publication provenance to committed selected inputs. The workflow-owned verifier
checks release metadata and the annotated tag independently of the selected
historical source, so an earlier builder retains the current acceptance boundary.

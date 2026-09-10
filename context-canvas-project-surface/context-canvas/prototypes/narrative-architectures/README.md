# Narrative Architectures in Context Canvas

Context Canvas owns the runnable Narrative Architecture projections in this
directory. The `@driftframe/narrative-architecture` source package remains the
semantic authority for reusable Narrative Architecture contracts. Exact
external lineage stays in the authorized private resolver; the public tree
carries stable package identities and explicit source relationships.

## Ownership map

| Surface | Owner | Role |
| --- | --- | --- |
| Reusable Narrative Architecture contracts | `@driftframe/narrative-architecture` | Stable meanings, schemas, and package-level vocabulary. |
| [Context Canvas projections](./) | Context Canvas | Local implementations, interaction choices, routes, and portable bundles. |
| [Context Canvas receiving pages](../../) | Context Canvas | Visitor context for deciding when and how to use each projection. |
| Threadkeeping contract | `@driftframe/field-guide` | Reusable continuity and collaboration-memory meaning used by the local ledger. |

Stable identities and manifest relationships let these surfaces evolve at
their fitting pace while each ownership boundary remains visible.

## Current projection family

- [Narrative Capsule Composer](narrative-capsule-composer/) — a visitor-linked
  capsule assembly surface used by the AI Systems page.
- [Semantic Sampling Tableau](semantic-sampling-tableau/) — an experimental
  public-baseline projection for terminology exploration.
- [Technology Fit Sampling Tableau](technology-fit-sampling-tableau/) — a
  visitor-linked decision surface used by the Planning Surface.
- [Threadkeeping Ledger](threadkeeping-ledger/) — a visitor-linked continuity
  surface used by Metadata Blocks.

## Contract examples and evidence

Each projection keeps its governed shape beside the page that produces or
consumes it. A page-local readiness panel establishes the interaction checks it
names. Strict schema compilation and a material instance establish the adjacent
structural contract.

- Narrative Capsule Composer exposes its governed `composition` record through
  [`narrative-capsule-composition.schema.v0.1.json`](narrative-capsule-composer/narrative-capsule-composition.schema.v0.1.json).
  The adjacent [valid composition](narrative-capsule-composer/narrative-capsule-composition.example.valid.v0.1.json)
  and [missing binding-review boundary](narrative-capsule-composer/narrative-capsule-composition.example.invalid.v0.1.json)
  make the accepted shape and one consequential rejection directly reusable.
- Semantic Sampling validates
  [`conation-motion-naming-sampling.example.v0.1.json`](semantic-sampling-tableau/terminology-exploration/conation-motion-naming-sampling.example.v0.1.json)
  against its adjacent state schema.
- Technology Fit validates
  [`front-end-stack-selection.example.v0.1.json`](technology-fit-sampling-tableau/front-end-stack-selection.example.v0.1.json)
  while retaining its additive compatibility posture.
- Threadkeeping's page-local initial ledger and exported document validate
  against the adjacent
  [`threadkeeping-ledger.schema.v0.1.json`](threadkeeping-ledger/threadkeeping-ledger-chimeric-prototype-bundle-v0.1/threadkeeping-ledger.schema.v0.1.json).

Each current Narrative source also implements the shared
[`prompt-capsule/0.1.0`](../../../../prompt-capsules/0.1.0/prompt-capsule-contract.md)
exchange contract. Its plain and skill-assisted GitHub Flavored Markdown views
come from the source's accepted state and share one represented-state
fingerprint. Native controls expose the selected view for exact copy and
download, a complete plain view remains available without JavaScript, and
related loops describe when an adjacent collaboration route fits. The
composition, sampling, or continuity state beside each page remains the
semantic authority.

The direct checks keep structural and visitor evidence distinct:

```bash
npm run test:narrative-architectures
npm run test:narrative-browser
```

The Node suite compiles the governed schemas and exercises their material
instances and adapter seams. The focused browser contract opens fresh storage
for each current projection, then observes one import, edit, persistence or
round-trip export, and visible recovery path owned by that page. Semantic
Sampling and Technology Fit add direct journeys for active-run prompt meaning,
exclusive normalization, minimum comparison sets, successor lineage,
collision-safe composition, synchronized decisions, and atomic accepted or
retained exchange. Composer and Threadkeeping add held-open readiness, closed
internal references, truthful fingerprints, literal-text controls, declared
chronology, detached exports, and synchronized authored/runtime JSON-LD. The
browser contract also checks each source's complete no-JavaScript Markdown,
state-only fingerprint, additive skill view, exact copy/download bytes, and
recovery after a rejected import.

## Relationship contract

- Source packages own reusable meanings and package-level vocabulary.
- Context Canvas owns local interaction behavior, page routing, companion
  assets, and visitor-facing adaptations.
- Local manifests name the contract owner, implementation owner, and current
  publication posture.
- Public machine references use stable repository IDs and role labels that
  remain portable across collaborators and runtimes. Private working notation
  remains available through its authorized resolver.
- A Context learning that changes a reusable meaning returns through an
  explicit source-package handoff.

## Consolidation receipt

The imported package and planning shells completed their transfer role.
Meaningful prototype implementations now live here, and Strategy Canvas
consumers resolve through these Context-owned paths. The private original's
Git history retains the removed copies for provenance review. The locator-free
baseline begins from the settled Context projection tree.

Revisit this boundary when a package revision changes a reusable meaning or a
Context-owned interaction is ready to become a package-level contract.

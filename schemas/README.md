# Schemas

This directory is the repository's progressive disclosure route for shared machine contracts. The first layer names families and authority. Each version directory then carries the exact schema, semantic context where useful, and representative examples.

## Start here

| Family | Human orientation | Contract | Example standing |
|---|---|---|---|
| Prototype Exemplars | This page and the root [README](../README.md) | [Repository collection v1](prototype-exemplars/1.0.0/prototype-exemplars.schema.json) | [Repository-truthful collection example](prototype-exemplars/1.0.0/prototype-exemplars.example.json) |
| Context Canvas | [Context Canvas v1](context-canvas/1.0.0/README.md) | [Artifact schema](context-canvas/1.0.0/context-canvas.schema.json) and [JSON-LD context](context-canvas/1.0.0/context-canvas.context.jsonld) | Synthetic collection, visitor-surface, and prototype profiles under `examples/` |
| Collaboration Skills | [Collaboration Skills 0.1.0](collaboration-skills/0.1.0/README.md) | [Skill projection](collaboration-skills/0.1.0/collaboration-skill.schema.json) and [collaboration account](collaboration-skills/0.1.0/collaboration-account.schema.json) | One live portable contract, one retired projection, and one route-changing account |
| Supportive Change Writing | [Bundle orientation](../supportive-change-writing-exemplars-bundle-v0.1/README.md) | [Existing collection-manifest schema](../supportive-change-writing-exemplars-bundle-v0.1/schema/collection-manifest.schema.v0.1.json) | Provisional projection exercised by the existing `manifest.json` |
| LIMS/ELN | [Functional nucleus orientation](../lims-eln-functional-nucleus/README.md) | [Existing Site Reading machine-node schema](../lims-eln-functional-nucleus/site-reading-governance/schemas/machine-node.schema.json) | Provisional cross-owner projection exercised by the Program Specification machine node |

The [static discovery page](index.html) carries the same first-contact route for a served schema origin.

## Authority

- The Prototype Exemplars schema describes repository orientation, family relationships, sources, served projections, and lived use. It does not become a union of contained schemas.
- The Context Canvas schema owns the shared artifact contract for the Canvas. Page HTML, CSS, JavaScript, prototype state, and Visual Fidelity Contracts retain their own source and behavior authority.
- The Collaboration Skills family carries typed exchange projections. Its referenced `SKILL.md` and collaboration-account sources retain semantic authority, and current user intent and granted tool authority govern activation.
- Supportive Change Writing and LIMS/ELN remain governed by their existing package and standalone-repository authorities. Their root entries are provisional projections that make current use discoverable.
- Human collaborators retain meaning, public identity, publication timing, and consequential adoption decisions. Automation can validate, compare, and propose within the named scope.

Each network `servedProjection` names four distinct relationships: `authoritativeSourceRef` identifies the repository source that defines meaning and exact bytes; `publicationAuthorityRef` identifies the actor or system allowed to publish it; `deliveryAuthorityRef` identifies the route operator; and `environment` identifies where discovery prefers that route. `branch` names the source branch that publishes or prepares the projection. These relationships leave the canonical `$id` unchanged.

## Identity and retrieval

Each settled exact version has one canonical `$id` under `https://schemas.vik.guru/`. The identifier names the contract; it remains unchanged when another route returns the same bytes.

| Route | Role | Branch preference | Current standing |
|---|---|---|---|
| `https://schemas.vik.guru/` | Canonical identity and intended first-party runtime route | `prod` | Canonical identity retained; DNS and origin require renewed operator observation |
| `https://schemas.radiantnull.com/` | GitHub-backed public mirror | `docs` publication; `main` discovery preference | Active, HTTPS-enforced, and observed |
| Repository `schemas/` source | Authored review and local collaboration | all branches | Active |

The Radiant Null mirror currently serves the exact v1 schemas, Context Canvas JSON-LD context, examples, and discovery page from `docs`. Authoritative DNS observation currently finds no `schemas.vik.guru` record, so issue work:schema-retrieval-and-page-migration retains operator-host restoration and byte-parity observation as an external delivery handoff. The intended routes carry identical schema bytes, `$id` values, vocabulary, and reference behavior. `main` discovery can prefer Radiant Null, and `prod` discovery can prefer Vik Guru after the operator route is observable. Branch and environment remain publication and discovery projections; instances and schema meaning stay invariant.

Served projections keep network `href` values distinct from repository `repositoryPath` values. This preserves the difference between retrieving a representation and locating its authored source.

GitHub Pages publication uses one connected standard-runner job on `docs`: schema check, static build, artifact upload, and deployment. GitHub-owned actions are pinned to full commit SHAs. The private repository consumes included Actions allowance and retains a $0 paid-overage boundary; general CI and Dependabot schedules remain at rest. Local source remains the direct validation and review path.

## Version and compatibility posture

- `1.0.0` is published and reviewed through the GitHub-backed exact-version mirror; operator-route parity remains an issue work:schema-retrieval-and-page-migration delivery boundary.
- Exact-version bytes become immutable after publication. Any byte change receives another exact-version path.
- The stable core closes at concrete object boundaries. Namespaced `extensions` carry additive local or experimental material.
- Enums represent intentionally closed routing concepts. Evidence classes, cognitive moves, and authority roles remain descriptive where vocabulary is still growing.
- Both v1 schemas are self-contained. A family with external dependencies declares its closure; the LIMS/ELN projection currently requires `common.schema.json`.
- JSON Schema constrains structure. JSON-LD describes semantic terms and relations. Human-readable source explains contested meaning and authority.

The [schema contract research and implementation plan](../planning/schema-contract-research-and-implementation-plan.md) records the supporting evidence, issues work:schema-authority–work:schema-retrieval-and-page-migration waves, compatibility direction, and purposeful deferrals.

## Local use

Install the root development dependencies and run:

```bash
npm run check:schemas
```

The command compiles the two v1 schemas, validates their external examples, checks one existing Supportive Change Writing instance, invokes the native bounded LIMS/ELN use, and exercises seven consequential boundaries across serving authority, S/I/R range, currentness, focalization, core closure, extensions, and identity. Local output remains terminal-only. The same command runs immediately before the schema documentation build in the connected Pages publication job.

## Alternate projections

JSON remains the authored v1 contract and example format. A YAML example can enter after repeated JSON authoring creates observable friction; it would remain an alternate syntax or generated projection of the same authority. GraphQL begins with a real query or API consumer whose selection, resolver, and nullability requirements can define the receiving boundary.

## Extension shape

Extension keys use a scheme-qualified namespace convention so ownership remains visible:

```json
{
  "extensions": {
    "urn:example:context-canvas:surface-profile": {
      "value": "public_design_input"
    }
  }
}
```

The local check establishes the namespace-key shape rather than full IRI conformance. A receiving semantic context can define stronger meaning for its own namespace.

An extension can mature into a later core version after repeated use shows shared meaning across profiles. A family-specific payload can remain namespaced indefinitely when that keeps its owner easier to find.

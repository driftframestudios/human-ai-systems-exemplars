# Schema contract research and implementation plan

## Settled direction

The first schema wave creates two small authored contracts:

- a Prototype Exemplars collection map for entry points, schema families, divided authority, source location, retrieval projections, and lived use;
- a Context Canvas artifact contract for collections, visitor surfaces, prototype surfaces, and reference artifacts.

The repository contract orients across families. Each family retains its own entities and source authority. Supportive Change Writing and LIMS/ELN enter as provisional repository projections with one real validated use apiece; their source schemas remain in place.

The Context Canvas contract records designed experience rather than only page inventory. Its stable core carries experience intent, standing, authority, representations, relations, contract references, and recovery. A namespaced `extensions` object gives experiments a clear place to flex while the shared fields remain dependable.

## Research-informed design changes

The deep-research spike compared the Draft 2020-12 specification and maintained documentation with validator behavior, empirical defect research, named maintainer guidance, schema-evolution practice, and production case studies.

Specification and validator sources establish mechanics. Maintainer and practitioner sources guide evolution risk. The choices below are repository policy, and AI findability remains a hypothesis for material use to test.

| Pitfall or tension | V1 response |
|---|---|
| Schema identity becomes confused with the URL that happened to return it. | One absolute fragment-free `$id` remains invariant across source, Vik Guru, and the Radiant Null mirror. Retrieval preference stays in discovery and deployment metadata. [JSON Schema Core](https://json-schema.org/draft/2020-12/json-schema-core) |
| A published URI later returns different bytes. | Exact-version bytes become immutable after publication. Any byte change receives another exact-version path. Mutable routes serve discovery rather than version identity. |
| External references work locally and fail in another validator or mirror. | Both v1 schemas are self-contained. Private `#/$defs/...` pointers carry internal reuse; adjacent family dependencies remain linked and explicit. [2020-12 release notes](https://json-schema.org/draft/2020-12/release-notes) |
| Closed reusable bases reject properties introduced through composition. | The schemas use flat named definitions and close each concrete object with `unevaluatedProperties: false`. [Understanding JSON Schema: objects](https://json-schema.org/understanding-json-schema/reference/object) |
| Arbitrary open content is treated as extensibility. | The shared core closes and one documented, namespaced `extensions` object stays open. This makes extension handling explicit. [RFC 9413](https://www.rfc-editor.org/rfc/rfc9413) |
| A current vocabulary becomes a permanent compatibility promise through `enum`. | Enums remain for intentionally closed routing concepts. Evidence classes, cognitive moves, authority roles, and local vocabulary remain descriptive strings. [Zalando API Guidelines](https://opensource.zalando.com/restful-api-guidelines/#112), [Google AIP-126](https://google.aip.dev/126) |
| `format`, `default`, or `examples` appear to enforce behavior they do not guarantee. | Ajv runs without data mutation and with an explicit annotation-only format posture. Standalone example documents are validated directly. [JSON Schema Validation](https://json-schema.org/draft/2020-12/json-schema-validation), [Ajv strict mode](https://ajv.js.org/strict-mode.html) |
| Schema keyword, type, and placement mistakes remain silently permissive. | The one local command compiles the new v1 schemas under Ajv strict mode with explicit types. Existing adjacent-family contracts retain compatible or native validators. This catches the selected defect classes relevant to the current contracts while keeping the check small. [Analysis of Defects in Public JSON Schemas](https://www.cri.minesparis.psl.eu/classement/doc/A-794.pdf) |
| Compatibility machinery appears before a real version relationship or consumer exists. | V1 states its direction in prose: old v1 consumers receive additive material through `extensions`; any core-byte change receives another exact version. A registry or cross-version checker waits for another published version or consumer. [Google AIP-180](https://google.aip.dev/180), [Confluent schema evolution](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html), [Evolving JSON Schemas, Part II](https://www.creekservice.org/articles/2024/01/09/json-schema-evolution-part-2.html) |
| Generated schemas are assumed to carry the full meaning of their source model. | Context Canvas schemas remain authored. A later generated LIMS projection names its generator, validation-or-serialization mode, and real receiving instance. [Pydantic JSON Schema](https://docs.pydantic.dev/2.12/concepts/json_schema/), [Zod JSON Schema conversion](https://zod.dev/json-schema) |
| A semantic context sits beside examples without a machine association. | Each Context Canvas example carries a relative `@context` that resolves within the exact-version directory on either host. Graph identifiers and repository-path provenance remain distinct, and opaque extension payloads expand as JSON values. [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/#the-context) |
| Machine structure displaces the human explanation. | Family READMEs remain the meaning and authority route. JSON Schema constrains structure; JSON-LD carries semantic relations; visible page content and nearby source remain the design authority. |

The research supports human discoverability through descriptive definitions, adjacent examples, and nearby documentation. Evidence for AI-specific schema findability remains thin. AI legibility is therefore an active repository hypothesis: natural collaboration use will show whether names, layers, examples, and routes reduce search and inference effort.

## Publication contract

The schema body has one canonical identity host:

```text
https://schemas.vik.guru/
```

The GitHub-backed mirror is:

```text
https://schemas.radiantnull.com/
```

The `prod` branch can prefer Vik Guru retrieval. The `main` branch can prefer Radiant Null retrieval. Both routes serve identical identity-bearing exact-version artifacts with the same `$id`, vocabulary, and reference behavior. Loading both schema copies into one validator would create duplicate canonical identities, so validation selects one source copy.

The Vik Guru host is active and DNS-resolved. Exact v1 artifact publication and route observation remain in issue work:schema-retrieval-and-page-migration. The human publication cue has also activated a GitHub Pages projection from `docs` while retaining the repository source as the authored review surface. The private repository's standard-runner work consumes included Actions allowance; the paid-overage budget remains $0. General CI and Dependabot scheduling stay outside this publication exception.

## Collaboration waves

### Wave A — authority and functional nucleus · issues work:schema-authority and work:prototype-exemplars-schema-root

1. Add `schemas/` discovery for human and AI collaborators.
2. Add the versioned Prototype Exemplars schema and repository-truthful collection example.
3. Add the versioned Context Canvas schema, JSON-LD context, and collection, visitor-surface, and prototype examples.
4. Record Supportive Change Writing as a provisional projection using its collection-manifest schema and real manifest.
5. Record LIMS/ELN as a provisional cross-owner projection using the Site Reading machine-node schema, its `common.schema.json` dependency, and the downstream Program Specification instance.
6. Run one local command over the two new schemas, the repository example, three Context Canvas examples, and the two adjacent-family uses.
7. Retain three in-memory boundary observations: an unknown core property fails, a namespaced extension succeeds, and a required identity omission fails.
8. Update repository and Context Canvas orientation. Return a portable skill rule only when material use changes the contract; preserve one situated collaboration account even when it concludes that no durable rule changed.

Completion is a usable schema surface and one pull request. This wave closes with source, examples, documentation, and a compact local result; hosted validation remains available when budget or a receiving use calls for it.

### Wave A2 — final v1 semantic settlement · issue work:schema-semantic-settlement

1. Distinguish authoritative source, publication authority, delivery operator, and environment-specific discovery preference on served projections.
2. Record `docs` as the reviewed Pages projection and legacy recovery source, `main` as the Actions workflow source for the Radiant Null discovery environment, and `prod` as the Vik Guru discovery environment while preserving one canonical identity and invariant exact-version bytes.
3. Add the optional Solution / Implementation / Recovery first-use prior as an elicited routing distribution with a basis and review trigger.
4. Add currentness as a freshness dimension beside evidence, review, visibility, lifecycle, and authority.
5. Extend focalization as a declared lens with an explicit vantage, foreground, held-aside material, use condition, and handoff while surrounding identity and standing remain intact.
6. Keep alternate YAML and GraphQL projections tied to concrete authoring friction or a receiving query/API consumer.

Completion is a revised unpublished v1 contract, semantic context, three examples, human orientation, and one consequential boundary observation for each new shape through the existing local command.

### Wave B — retrieval activation and page migration · issue work:schema-retrieval-and-page-migration

1. Publish the GitHub-backed projection from `docs` through one connected Pages job and publish the same exact-version artifacts through the active operator-controlled host.
2. Serve exact-version schema, context, examples, and discovery pages from both hosts.
3. Observe content type, TLS, cache behavior, CORS where needed, missing-route behavior, and byte identity for each identity-bearing exact-version artifact once per route.
4. Update the seven selected Context Canvas pages to declare the v1 profile, standing, authority, and schema relationship while preserving Schema.org page metadata.
5. Use organization or explicitly anonymous role identities in public machine metadata; reserve a named-person identity for a reviewed public profile.
6. Reconcile Debriefs item counts, dangling fragment targets, and custom terms as page metadata enters the v1 vocabulary.
7. Record the active retrieval routes and retire the task-bound schema projection at its named exit event. A later additive version receives a fresh projection when local binding remains useful.

This wave begins after active routes exist. It carries the smallest observation of the served system and leaves broader deployment architecture to the Cloudflare program.

Branch-preference discovery can differ between `main` and `prod`; equivalence applies to the exact-version contract artifacts rather than every discovery page or deployment asset.

### Wave C — earned additive work

A later collaboration can open a new exact version when lived use identifies a shared core field. An extension moves into the core only when multiple profiles use the same meaning and the change improves receiving work. A schema registry, compatibility analyzer, compound distribution bundle, alternate validator, or generated client earns consideration after multiple versions or consumers make the relationship concrete.

## Proportional validation boundary

The root command uses the Draft 2020-12 Ajv entry point with strict schema compilation, all errors available on failure, format annotations left non-asserting, and mutation options disabled. It loads local source only and emits a compact terminal result.

The command checks:

- both new schemas compile against the Draft 2020-12 meta-schema;
- the repository example and three Context Canvas examples validate;
- the existing Supportive Change Writing manifest validates against its existing schema;
- the native LIMS/ELN validator confirms the selected cross-owner instance and dependency closure;
- three consequential boundary probes behave as intended.

This command remains local and direct. The next validator feature requires a reproduced failure or a repeated collaboration cost. CI gates, compatibility matrices, fixture catalogs, hash manifests, validation receipts, and cross-validator suites remain outside the present wave.

## Purposeful deferrals

- exact-route observation and the seven-page migration until issue work:schema-retrieval-and-page-migration publishes the settled v1 bytes;
- a mutable `latest` schema alias until movement and cache semantics are settled;
- a universal evidence, authority, attention, or artifact ontology;
- copied Supportive Change Writing or LIMS/ELN schema trees;
- public LIMS/ELN serving until its dependency closure and standalone authorities settle;
- a YAML authoring projection until repeated JSON authoring creates observable friction;
- GraphQL SDL until a real query or API consumer supplies selection, resolver, and nullability needs;
- custom JSON Schema dialects, meta-schemas, and code generation;
- schema compatibility automation before a second version or receiving consumer exists;
- AI-legibility claims beyond observed repository use;
- portable screenshot storage and Cloudflare transformation planning from the separate visual-reference wave.

## Re-entry

Return to settled v1 source at `schemas/README.md` and `npm run check:schemas`. Return to Wave A2 through issue work:schema-semantic-settlement while exact-version bytes remain unpublished. Return to Wave B through issue work:schema-retrieval-and-page-migration for exact-route publication and page migration. Return to schema design through this plan when a real instance exposes a missing shared field, a vocabulary collision, a retrieval ambiguity, or an extension that has earned core standing.

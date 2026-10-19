# Context Canvas schema v1

Context Canvas pages are visitor surfaces and design inputs. This contract makes their shared experience, standing, authority, representations, relationships, fidelity references, and recovery routes machine-readable while each route keeps its own visual and editorial fingerprint.

## Profiles

| `kind` | Intended use |
|---|---|
| `collection` | A related collection of pages, artifacts, or instruments with a navigable entry surface |
| `visitor_surface` | A page whose primary role is a reader-facing decision, explanation, comparison, or design input |
| `prototype_surface` | An interactive or inspectable instrument, including a Context projection of canonical source |
| `reference_artifact` | A contract, atlas, glossary, source reading, or other material that supports another surface |

The four profiles share one compact core. Profile-specific detail belongs in descriptive fields, relations, contract references, or a namespaced extension. The schema avoids an inheritance hierarchy and keeps evidence classes, cognitive moves, and authority roles open to accurate local language.

## Files

- [context-canvas.schema.json](context-canvas.schema.json) — self-contained Draft 2020-12 structure contract.
- [context-canvas.context.jsonld](context-canvas.context.jsonld) — protected JSON-LD term mapping for semantic expansion.
- [collection.example.json](examples/collection.example.json) — illustrative collection orientation.
- [visitor-surface.example.json](examples/visitor-surface.example.json) — illustrative Composable Site Readings and Debriefs profile.
- [prototype.example.json](examples/prototype.example.json) — illustrative Strategy Canvas canonical/projection relationship.

The examples use reserved identities and locators. Their `sourceRefs` point to repository material that informed the modeled intent, standing, authority, and recovery routes. This keeps the example useful without declaring a public identity before publication review.

Each external example carries a relative `@context` reference. After exact-route publication, the reference resolves to this context on either host while expanding shared terms into the canonical Vik Guru namespace.

## Core reading order

1. `experienceIntent` states the desired reader state, use conditions, primary cognitive move, intended readers, recognition signals, and boundaries. Expectation, focalization, and opportunity are optional compact facets.
2. `firstUsePrior` optionally records where first useful work is most likely to begin across Solution, Implementation, and Recovery.
3. `standing` separates claim status, evidence class, source references, currentness, review state, visibility, and lifecycle. Repository-path references remain literal provenance values in JSON-LD; absolute identifiers carry graph identity where the contract declares it.
4. `authority` separates human meaning, schema, content, decision, and automation roles.
5. `representations` distinguishes canonical HTML, machine representation, static fallback, embedded prototype, and served projection.
6. `relations`, `contractRefs`, and `recoveryRoutes` make neighboring surfaces, design contracts, strain cues, and revisable return paths reachable.
7. `extensions` carries namespaced variation while the core stays dependable. JSON-LD preserves each extension payload as an opaque JSON value until its owning namespace supplies a semantic context.

## First-use routing prior

The optional `firstUsePrior` is an elicited routing prior. Its `probabilityOf` declaration asks where the artifact's first useful work usually begins; `solution`, `implementation`, and `recovery` each carry a value from 0 through 1. `basis` names the editorial, observed, or source-supported reason for the distribution, and `reviewTrigger` names the evidence that should revise it.

- `solution` covers understanding, shaping, or choosing the desired answer or condition.
- `implementation` covers applying, building, or operationalizing a known solution.
- `recovery` covers restoring legibility, resolving strain, or locating a useful return route.

The examples sum their three components to 1 as a clear authoring practice. The schema constrains each component independently, leaving arithmetic normalization to the authoring context and later revision to natural use. Measured effectiveness remains a separate evidence question.

## Currentness and declared lenses

`standing.currentness` makes freshness visible beside its basis and return condition. Its small state vocabulary—`current`, `current_with_caveats`, `review_due`, `stale`, and `unknown`—comes from current repository artifacts. Evidence class, review state, visibility, lifecycle, and authority retain their own fields, so each dimension can change without collapsing the others into a maturity score.

`experienceIntent.focalization` declares a reading. An optional `lensRef` can name that reading; `vantage`, `foregrounds`, `holdsAside`, `useCondition`, and `handoffRef` show how it operates. Held-aside material remains part of the artifact. Artifact identity, participant identity, authority, evidence, currentness, visibility, and lifecycle remain governed by their own fields.

## Representation and authority boundary

Schema.org JSON-LD on a page can continue to describe a WebPage, Article, collection, breadcrumb, or public person. This Context Canvas contract carries Canvas-specific standing, designed experience, authority, recovery, and projection relationships. The two contexts can appear together when one published graph serves both roles. The visible page and canonical prototype state schema retain their source authority.

The human-readable page and nearest README remain the interpretation route. The schema constrains exchange. The JSON-LD context supplies terms. Visual Fidelity Contracts guide composition with room for route-specific color, rhythm, density, layout, and further experiment.

## Version and retrieval

The canonical schema identifier is:

```text
https://schemas.vik.guru/context-canvas/1.0.0/context-canvas.schema.json
```

The GitHub-backed retrieval mirror is:

```text
https://schemas.radiantnull.com/context-canvas/1.0.0/context-canvas.schema.json
```

The Radiant Null mirror and Vik Guru Worker are active, HTTPS-enforced, and
observed against the accepted repository bytes. Completed [Issue #406](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/406) preserves the v0.3 delivery lineage; completed [Issue #531](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/531), under the [Issue #18](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/18) delivery family, records the accepted v0.3.1 Worker publication and signed-out byte comparison for its registry and exact-version schema routes. The canonical Vik Guru identifier remains stable across both retrieval observations.

Both exact-version routes return the accepted identical bytes with the canonical
`$id` unchanged. `main` discovery currently prefers Radiant Null as an explicit
product choice; signed-out parity also supports Vik Guru retrieval. Branch and
environment describe publication and discovery projections; instance data and
schema meaning remain invariant.

The schema and examples are active repository source and published contracts.
The seven selected pages use the released relationship; completed Issue #406
preserves the v0.3 lineage, and completed Issue #531 retains the accepted
v0.3.1 signed-out comparison for the Vik Guru routes within Issue #18's
delivery family.

## Alternate projections

JSON remains the authored v1 contract and example format. A YAML authoring example becomes useful after repeated manual JSON work produces concrete friction; it would remain an alternate syntax or generated projection of this contract. GraphQL follows a receiving query or API whose selection, resolver, and nullability behavior can shape an honest SDL boundary.

## Local validation

From the repository root:

```bash
npm run check:schemas
```

The check uses strict Draft 2020-12 compilation, keeps data unchanged, validates the three external examples, and observes seven consequential boundaries: serving authority, S/I/R range, independent currentness, declared focalization, core closure, namespaced extension acceptance, and required identity.

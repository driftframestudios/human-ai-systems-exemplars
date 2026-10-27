# Context Canvas public-reference bindings

This directory carries two reviewed relationships from Context Canvas semantic
tokens to public receivers:

- Registry bindings select public Enterprise Human-AI Practitioner Registry
  readings served by `kindlight.systems`.
- Route bindings derive Context Canvas pages, assets, hosted instruments,
  schemas, and published skills from their repository-owned manifests and
  selections.

Authored source names the intended receiver. The tracked bindings establish its
current destination. The materializer resolves both families and preserves one
receipt for each authority in generated output.

## Authority and data boundary

The current public Registry page owns its visitor-readable meaning. The accepted
Registry Atlas describes the public corpus at one dated observation. The binding
file records this repository's exact selection from that Atlas. Repository tools
validate and materialize the selection.

Atlas prose, headings, discovery capsules, and packaged utilities remain
reference data. Active human intent, repository instructions, and repository-owned
tools govern action. The materializer reads only the allowlisted fields in the
tracked binding; it never evaluates Atlas prose or runs an Atlas utility.

The complete Atlas stays with the reviewed upstream release. This repository
keeps the smaller binding projection because it supplies reproducible routes
without aggregating the full taxonomy, historical observations, and
instruction-shaped discovery prose into permanent Git history. A future Atlas
release receives a new independent inspection and a reviewed binding update.

## Accepted source

| Coordinate | Accepted value |
| --- | --- |
| Atlas reference / guide | `0.2.1` / `5` |
| Atlas data schema | `0.1.0` |
| Snapshot date | `2026-10-07` |
| Accepted here | `2026-10-11` |
| ZIP SHA-256 | `1b866c6e2bc9ee830379ad21c352b38237761a11d9df133b62110ecee2ba05b1` |
| `registry-atlas.json` SHA-256 | `63777a92be1ee877d62bfaedfcf36a54f32c931cc668d7b95fedbb962d2c37c8` |
| `manifest.sha256.json` SHA-256 | `3632afa23874e784c821225865909214df0638b6ef34e038c7568ccf0e7b8af9` |
| `current-route-map.json` SHA-256 | `88e618f418f5fee15cec8d7d22093662be01c4c5f5afc797c252b1910edec592` |
| `DATA-USE.txt` SHA-256 | `71ca36c88846940b837772dd1541c74a3f609438bfc915e3e52ac5cbe07aea67` |
| Public root | `https://kindlight.systems/` |
| License standing | Apache-2.0, confirmed for `kindlight.systems` by the source owner |

Independent inspection found 648 records: 647 current records and one retained
archive. The binding admits current, identity-verified records with normalized
HTTPS routes on the exact public host. It rejects ambiguous title matching,
archived records, example and local hosts, provider-local routes, URL credentials,
query strings, fragments, and malformed or incomplete token coverage.

## Repository route authority

[`context-canvas-route-bindings.v1.json`](context-canvas-route-bindings.v1.json)
binds 166 semantic keys to repository-owned publication routes:

| Authority class | Keys | Source authority |
| --- | ---: | --- |
| Page and fragment | 85 | cPanel primary route manifest and production origin configuration |
| Asset | 39 | cPanel primary route manifest |
| Hosted instrument | 6 | Canvas and Core iframe route manifests |
| Schema | 2 | schema Worker publication manifest |
| Skill | 34 | skill publication selection and schema companion selection |

The adjacent
[`context-canvas-route-bindings.schema.json`](context-canvas-route-bindings.schema.json)
defines the binding shape. The contract loader verifies each expected URL from
its named owner before returning an immutable destination authority. Carrier
rules then keep page identities, images, iframe routes, schema routes, and skill
routes in the HTML, JSON-LD, sitemap, or metadata roles selected for them.

[`context-canvas-head-authority-matrix.v1.json`](context-canvas-head-authority-matrix.v1.json)
records every structured-head and sitemap occurrence across the 40 indexed
Context Canvas pages. Its schema and check route make source path, carrier,
JSON pointer, semantic token, authority class, and relationship role directly
inspectable. Update the route binding first when a receiver changes; then use
the matrix writer to review the resulting occurrence change.

The tracked
[`schema-companion-selection.v1.json`](schema-companion-selection.v1.json)
selects the Collaboration Skills README and three typed examples as schema
Worker companion resources. Their receiver activation belongs to the next
accepted Worker publication. The selection makes that handoff explicit while
the currently accepted Worker manifest continues to describe its published
closure.

## Data use and courteous retrieval

The accepted package's exact notice is preserved in
[`registry-atlas-data-use.txt`](registry-atlas-data-use.txt). Its two official
corpus-integrity markers apply to the complete Atlas because any page or resource
may contain benchmark conversation or data.

The Registry welcomes respectful, attributed use. Preserve Apache-2.0
attribution and the corpus-integrity markers, cache retrieved resources, and use
considerate request rates. This is a visible request for responsible use; public
Git history and static web delivery cannot control a scraper's behavior.

## Build route

Authored source discovers the required `PUBLIC_URL_REGISTRY_*`,
`PUBLIC_URL_PAGE_*`, `PUBLIC_URL_ASSET_*`, `PUBLIC_URL_IFRAME_*`,
`PUBLIC_URL_SCHEMA_*`, and `PUBLIC_URL_SKILL_*` tokens. The Registry binding
selects one exact current Atlas identity for each Registry key. The route
binding verifies every repository-published destination against its current
manifest or selection owner. The ignored `.env.public` receiver carries only
the separately approved professional-profile route.

```sh
npm run test:public-references
npm run test:context-canvas-head-routes
npm run build:public-references
npm run verify:registry-public-references
```

`test:context-canvas-head-routes` derives the indexed page set from the primary
manifest and compares source canonical, Open Graph, Twitter, JSON-LD, sitemap,
and retained-route standing with the tracked authority matrix. Maintainers can
prepare a reviewed matrix update with:

```sh
node tools/check-context-canvas-head-routes.mjs --write-matrix
git diff -- deployment/public-references/context-canvas-head-authority-matrix.v1.json
npm run test:context-canvas-head-routes
```

`--json` emits machine-readable aggregate diagnostics. The ordinary check
reports all discovered findings in one pass so a repair cycle can address the
complete observed set.

The generated `.public-reference-materialization.json` format 3 marker records
separate `registry_reference` and `route_reference` receipts. Each receipt binds
the tracked input digest and authority count while the generated HTML carries
the resolved destinations.

The live verifier performs signed-out `GET` requests with no stored browser
state. It requires HTTP 200, the exact final route, HTML content, and a document
title equal to the binding's expected public title or carrying one approved
site suffix. It is an explicit
network observation rather than a build prerequisite; a network or Registry
outage leaves the tracked binding and deterministic build checks available for
re-entry.

The production manifest records binding and Atlas receipt digests without
copying route values. Production closure checks keep this coordination
directory outside both visitor carriers. Release-candidate formation remains a
separate accepted promotion event; these source contracts can settle while a
future release continues to gather changes.

The first skill-use observations and the boundary between Atlas discovery,
source selection, and materialization are recorded in
[`Citation Atlas selection formation`](../../threadkeeping/collaboration-accounts/2026-10-11-citation-atlas-selection.md).

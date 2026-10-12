# Context Canvas Registry bindings

This directory carries the reviewed relationship between Context Canvas semantic
tokens and the public Enterprise Human-AI Practitioner Registry routes served by
`kindlight.systems`.

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

Authored source discovers the required `PUBLIC_URL_REGISTRY_*` tokens. The
binding selects one exact current Atlas identity for each token. The materializer
uses those routes for HTML and JSON-LD while the ignored `.env.public` receiver
continues to carry only the separately approved professional-profile route.

```sh
npm run test:public-references
npm run build:public-references
npm run verify:registry-public-references
```

The live verifier performs signed-out `GET` requests with no stored browser
state. It requires HTTP 200, the exact final route, HTML content, and a document
title equal to the binding's expected public title or carrying one approved
site suffix. It is an explicit
network observation rather than a build prerequisite; a network or Registry
outage leaves the tracked binding and deterministic build checks available for
re-entry.

The production manifest records the binding and Atlas receipt digests without
copying their route values. Production closure checks keep this coordination
directory outside both the primary visitor carrier and the iframe carrier.

The first skill-use observations and the boundary between Atlas discovery,
source selection, and materialization are recorded in
[`Citation Atlas selection formation`](../../threadkeeping/collaboration-accounts/2026-10-11-citation-atlas-selection.md).

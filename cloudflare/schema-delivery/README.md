# Portable static schema adapter

This earlier asset-only adapter prepares the schema subset of the selected
GitHub Pages contracts for local dry-runs and portable static delivery.
`tools/schema-receiver-routes.mjs` owns contract selection;
`tools/schema-publication-lock.json` binds frozen bytes. The shared publication
module owns identities, dependency selection, digests, and host-local retrieval
metadata. Source schemas retain their established `$id` values.

The artifact contains selected schemas and companions, a host-specific catalog,
index and recovery page, approved attribution carriers, and generated headers.
The exact inventory and every output byte are checked against the selected source.
Operational repository trees and skill candidates retain their own publication
boundaries. The Pages projection publishes readable skill pages, and
[`../schemas-worker/`](../schemas-worker/) owns the complete production schema
and public-ready skill closure for `schemas.vik.guru`.

```sh
npm run build:schema-delivery
npm run check:schema-delivery
npm run dry-run:schema-delivery
npm run dry-run:schema-delivery:release
```

`workers_dev: false` and the release environment's empty routes keep this
adapter unbound. Its build and dry-run commands support static portability and
historical comparison. Production domain binding, credentials, budget
activation, and recovery belong to `cloudflare/schemas-worker/` and its gated
workflow. The schema release is independent of the primary site and iframe
upload.

## Response contract

The root `/` serves the catalog with HTTP 200 and revalidation. Built-in
`auto-trailing-slash` HTML handling resolves the root to `index.html`; exact JSON
paths retain direct retrieval, and unknown schema paths use the genuine 404
response. Include the root, an exact schema URL, and a missing file inside a
versioned directory in every receiver observation. The platform behavior is
described in [Cloudflare's HTML handling reference](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/).

Each selected exact-version schema has an exact-path immutable cache rule.
Catalogs, orientation, examples, unversioned contracts, and attribution carriers
revalidate. The default `no-store` rule covers missing paths, including missing
files inside versioned directories. Specific rules detach that default before
adding their policy. Observe the effective response on the preview receiver
before activation; header-source inspection alone leaves platform behavior open.

The existing permissive public-schema CORS policy, content hardening, and
frame-ancestor boundary remain in place. Direct retrieval on either schema host
returns its selected bytes. An HTTPS redirect belongs to the host's edge policy,
with path and query preserved; schema paths keep their exact-version identity.

## Portable observation and recovery

Accept and pin one source revision. Build and inspect the un-routed release
artifact, then observe an explicitly approved preview host for byte identity,
media types, CORS, conditional retrieval, cache policy, and genuine 404
responses. Production activation proceeds through the schema Worker owner,
which preserves all promised routes and records its own Worker-version recovery
coordinate.

The generated static payload remains portable to cPanel. A cPanel receiver
requires its own response-header adapter and activation receipt before use.
Public returns carry source/artifact coordinates and normalized outcomes;
credentials, account details, and raw infrastructure diagnostics stay with the
protected operator.

# Schema Worker receiver

This Worker serves the repository's selected schema contracts through
`schemas.vik.guru`. The fetch handler runs before its `ASSETS` binding and owns
HTTPS redirects, exact-route lookup, response caching, CORS, and recovery.
The approved production deployment and both schema-host observations were
recorded on 2026-10-01. Later production changes retain their operator decision.

## Established source and receiving files

`tools/schema-receiver-routes.mjs` owns the same 13-contract selection used by
GitHub Pages. `tools/schema-publication-lock.json` freezes those contract bytes;
`tools/schema-publication.mjs` owns canonical identity, digest, and dependency
metadata. `cloudflare/schema-delivery/source/` supplies the existing registry
template and public response policy. Repository attribution carriers retain
their established ownership.

`prepare-publication.mjs` copies the 13 schemas and four companions into
`public/schemas/`, carries the five attribution files, and prepares the catalog,
root page, and publication manifest. `public/` is the complete 25-file static
delivery boundary. The older asset-only adapter and this fetch-handler adapter
share source owners while retaining their distinct delivery behavior.

The manifest records an accepted schema-source revision. That pin stays stable
across commits to the receiving Worker. Preparation requires the selected inputs
to match that revision on `origin/main`. Existing frozen paths and bytes remain
available when a later accepted source revision is selected.

## Prepare and check

Run these commands from this directory in the repository, with Node.js 22 or newer:

```sh
npm install
npm run prepare:publication -- --source-revision <accepted-main-commit>
npm run check:publication
npm test
```

After the first selection, `npm run prepare:publication` retains the recorded
source pin. The preparation check compares every output file and byte, including
the catalog, manifest, source-copy boundaries, and attribution. The focused tests
exercise the handler and selected schema payload; a Wrangler preview separately
establishes the platform's routing and response behavior.

## Routes and response policy

| Request | Response |
| --- | --- |
| HTTP | 308 to HTTPS, preserving hostname, path, and query |
| `GET /` | 200 with the established registry page |
| Established schema URL | Direct retrieval through a manifest-owned internal asset mapping |
| `/schemas/` asset URL | Direct retrieval of the same bytes and identity |
| Missing resource | JSON 404 naming the requested path, with `no-store` |
| Asset error response or binding failure | Error response with `no-store`; binding failures expose a bounded recovery message |
| `HEAD` | Matching status and headers with an empty body |
| `OPTIONS` | Public read-only CORS preflight |

The asset binding uses `html_handling: "none"` because the handler explicitly
maps `/` to `/index.html`. This keeps the catalog response direct. The established
JSON paths retain their exact spelling. Canonical `$id` values remain unchanged;
`schema-catalog.json` describes each host-local download and its source.

Cache eligibility comes from `publication-manifest.json`'s explicit `frozen`
array. The 12 frozen exact-version contracts include both their established route
and asset route. The unversioned `prototype-local-manifest.schema.json`, catalogs,
examples, context companion, and attribution files revalidate. A new immutable
context earns its own frozen-byte contract before entering this array.

| Response class | `Cache-Control` |
| --- | --- |
| Successful frozen resource or its conditional 304 | `public, max-age=31536000, immutable` |
| Other successful resource or its conditional 304 | `public, max-age=0, must-revalidate` |
| Missing resource, error, redirect, or unsupported method | `no-store` |

The manifest is bundled with the Worker. Route and frozen-path lookups use maps
and sets prepared once per isolate; response bodies stream from `ASSETS`. ETags
and conditional request headers retain their asset-binding behavior. Public CORS
and security headers derive from the existing schema-delivery policy.

## Local preview and deployment

```sh
npm run dev -- --local --local-protocol https
```

Use the preview's locally trusted certificate for HTTPS checks. Exercise all
selected schema routes and digests, both retrieval paths, root discovery, cache
headers, ETags/304, CORS, HEAD, and missing paths inside versioned directories.
The unit tests cover the HTTP-to-HTTPS redirect separately. The protected remote
preview supplies production edge, certificate, and recovery evidence.

After the operator accepts that evidence and the intended Custom Domain binding:

```sh
npm run deploy
```

The deploy script first checks the selected public artifact. The existing Custom
Domain configuration targets `schemas.vik.guru`; preserve the operator's current
DNS preparation. `workers_dev` stays disabled. GitHub Pages remains a separate
receiver and site-release path. Preserve all promised versioned routes during
recovery and record the accepted source and Worker deployment coordinates.

## Secret boundary

Keep tokens and secret values in Cloudflare's secret store through
`wrangler secret put`. Local `.dev.vars` and `.env.*` files remain ignored, as does
Wrangler runtime state. Public files, the publication manifest, and
`wrangler.jsonc` carry public configuration only. Inspect the selected `public/`
artifact before publication; repository credentials and operator diagnostics
remain outside that boundary.

Platform references: [asset-binding behavior](https://developers.cloudflare.com/workers/static-assets/binding/),
[Worker-first routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/),
and [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/).

## Repeatable receiver checks

The checked-in tests divide the evidence by the behavior they observe:

- `test/receiver.test.mjs` exercises the production handler with an asset binding fixture: root routing, exact contract bytes and identities, canonical and asset routes, guide-relative catalog links, headers, conditional requests, missing resources, and supported methods.
- `test/manifest-transition.test.mjs` loads the same handler in two isolated bundles. `/schemas/test.json` starts revalidatable, then becomes immutable when the next bundle lists it in `frozen`. Another JSON resource stays revalidatable. Production files retain their published bytes throughout this test.
- `test/live-receiver.mjs` checks a running Worker against the prepared publication. It exercises every contract route, cache policy, ETag/304, HEAD, discovery alias, root, missing-route JSON response, and CORS policy.
- `test/catalog-source-preservation.test.mjs` distinguishes exact catalog bytes from the narrowly observed edge addition, with counterexamples for authored-content changes, misplaced additions, altered edge code, and malformed metadata.
- `test/catalog-browser.mjs` uses the repository's Playwright installation to check catalog links and horizontal containment at narrow and desktop widths with JavaScript unavailable. Screenshots stay in the ignored `.visual-runs/schema-worker/` directory.

Run from this directory:

```sh
npm test
npm run check:publication
npm run test:receiver -- https://schemas.vik.guru --http-origin http://schemas.vik.guru
npm run test:browser -- https://schemas.vik.guru
```

For a local HTTPS preview, pass its origin instead. Trust the preview certificate through `NODE_EXTRA_CA_CERTS` for the Node receiver check. The browser check accepts `--local-tls` exclusively for loopback previews. The local unit test covers HTTP-to-HTTPS redirection; the live command's optional `--http-origin` checks it on an HTTP listener.

The handler redirects HTTP requests with status 308, including local HTTP requests. Use HTTPS to observe successful asset responses. Add a new frozen path through the publication preparation route and load a fresh Worker bundle to activate that cache policy. Frozen routes retain their published bytes; revised contracts receive a new versioned path.

### Catalog source and edge observation

The single root capture on 2026-10-04 UTC returned HTTP 200 HTML. All 8,116
authored bytes remained in their original order, with one 938-byte script
inserted immediately before the unique authored `</body>` boundary. The capture
stays in ignored local evidence. Its observed script references the platform's
challenge-detection route; that observation establishes a transformation shape
rather than independent script provenance or runtime security.

`test/catalog-source-preservation.mjs` accepts exact byte parity or that recorded
addition. The entire added program is fingerprinted after replacing only its
quoted 16-character lowercase-hex request value and canonical-base64 timestamp
containing ten decimal digits. Every other added byte, the insertion position,
and every authored byte remain exact. Authored text, links, styles, scripts,
structured data, and whitespace therefore retain the same comparison boundary.

The live check reports `exact-byte-parity` and `observed-edge-addition` separately.
An unclassified addition or unexplained difference keeps the overall check
unsuccessful while allowing the schema observations to execute first. A changed
edge shape receives another bounded observation and review. Exact schema
digests, canonical identities, conditional validators, and security settings
retain their existing contracts.

Conditional live checks use HTTP-standard weak ETag comparison: the quoted
opaque value stays identical while either header may carry the `W/` marker.
Malformed or missing validators fail the check. Every schema response still
passes its exact SHA-256 and canonical-identity assertions. The pure comparison
helper scans each header once; focused tests cover RFC examples, literal
backslashes, case sensitivity, empty opaque values, and malformed fields.
See [RFC 9110 sections 8.8.3 and 13.1.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.8.3).

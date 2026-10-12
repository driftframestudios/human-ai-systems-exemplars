# R2 video delivery Worker

This package maps the same-origin public route
`/v1-cdn/video/<semantic-id>/v<major>.<minor>.<patch>/<carrier>` to the R2 key
`v1/video/...`. Semantic IDs are lowercase ASCII slugs, versions are canonical
three-part numeric versions, and language tokens start with 2–8 lowercase ASCII
letters followed by optional lowercase alphanumeric subtags.
The only carriers are `movie.mp4`, raster `poster` files, and language-specific
`captions` or `descriptions` WebVTT files.

The uncached default entrypoint validates the raw target, method, host, scheme,
port, and finite carrier grammar on every request. It then constructs one
canonical request containing only the accepted method, URL, `Range`,
`If-Range`, and `If-None-Match` and forwards it to the named `CachedMediaObject`
entrypoint.
[Workers Caching][cache] applies only to that named entrypoint, so a cached
response cannot bypass gateway validation even though the Workers Cache key
omits the request host. This follows Cloudflare's documented [gateway
pattern][cache-gateway].

The cached entrypoint returns complete `200` responses and pipes each R2 body
through a Workers `FixedLengthStream` so the stored object size remains the
response's exact `Content-Length`. Workers Caching owns edge storage and range
slicing; partial-response assembly stays outside the handler. Stored R2
`Content-Type` metadata must exactly match the carrier before bytes are served.
The publication policy treats every accepted key as immutable, so changed
bytes or metadata require a new versioned key.

## Behavior boundary

- `GET` and `HEAD` are the complete read interface.
- Wrangler disables caching on the default gateway and enables it on the named
  media-object entrypoint. The gateway strips caller-specific and cache-bypass
  headers while preserving `Range`, `If-Range`, and `If-None-Match`.
- An otherwise valid HTTP request on the canonical host redirects to canonical
  HTTPS before object access. Foreign hosts and alternate HTTPS ports stop
  before object access.
- The path parser rejects queries, encoded paths, ambiguous separators, dot
  paths, and oversized request paths before R2 lookup.
- Stored content type must match the finite carrier grammar, and stored content
  encoding must be absent.
- `If-None-Match` evaluates against the strong stored R2 ETag on a cold handler
  read and can return `304`. Workers Caching owns warm-hit validators and
  `If-Range` alongside its range handling. `If-Match` and
  `If-Unmodified-Since` stop before cache dispatch and object access because
  Cloudflare's documented warm-hit condition handling does not include them.
- Configuration faults return bounded `500`, invalid stored metadata returns
  bounded `502`, and documented retryable R2 service faults return bounded
  `503`; every failure remains `no-store` and omits object, route, and provider
  detail.
- Objects above the current 512 MB (512,000,000-byte) cacheable-object boundary
  stop before body transfer.
- Poster and WebVTT companions use a narrower 32 MiB (33,554,432-byte)
  admission boundary shared by the Worker and live verifier.
- Successful and error responses carry `nosniff`, same-origin CORP, and a
  no-referrer policy.
- `workers.dev` and Worker Version URLs remain disabled. Browser
  traffic enters through the exact production route after human activation.
- `cache.cross_version_cache` is explicitly `false`; every Worker version
  receives an isolated cache while object bytes remain governed by semantic
  key versions.

Run the focused contract locally with:

```sh
node --test tests/media-publication/r2-video-worker.test.mjs
npx wrangler deploy --dry-run --config cloudflare/r2-video-delivery/wrangler.jsonc
```

## Activation boundary

Repository source and a dry run do not create the bucket, upload media, attach
the route, or make a public release. The human Cloudflare operator confirms R2
subscription and billing ownership, creates or selects the configured bucket,
uploads reviewed versioned objects with exact HTTP metadata, verifies size and
digest, and activates only `vik.guru/v1-cdn/video/*`. The route uses **Fail
closed** so an exhausted Worker allowance returns Error 1027 instead of
bypassing the media contract to cPanel. The operator also confirms Worker-route,
Transform Rule, Cache Rule, and origin-rewrite precedence at `/v1-cdn/`.
Those neighboring rules can affect routing and response processing; they do
not configure or purge Workers Caching.

The configured bucket name is a source-visible routing coordinate and grants
no authority. Account identifiers, credentials, raw upload receipts, and
provider diagnostics remain protected. The bucket keeps CORS absent and has no
custom domain. A temporary development URL, when purposefully selected, is
disabled before production activation.

Cloudflare's managed `r2.dev` endpoint is an optional, short-lived
direct-object observation. Enabling it makes the bucket's addressed objects
public through a rate-limited development hostname without the selected
Worker, cache, WAF, or access-control behavior. Production pages use the
same-origin Worker route; the operator disables the development URL after any
use and leaves that hostname unaliased.

Before first visitor-page activation, exercise withdrawal with a disposable
object family. Remove its visitor reference, remove or quarantine the R2
object, deploy a fresh Worker version to 100 percent traffic, keep
`workers.dev` and Version URLs disabled, and confirm that the old public route
fails. With `cross_version_cache: false`, the new deployment starts from an
isolated cold cache. The recovery owner retains the withdrawn Worker version
without routing traffic back to it. Cloudflare's [zone-level dashboard and API
purge do not clear Workers Caching][cache-purge]; a future `ctx.cache.purge()`
route enters only with a human-authorized private invocation design. This
package exposes no public administrative endpoint.

## Transport-only checkpoint

The operator may pause the publication workflow at a resumable transport-only
checkpoint after:

- canonical stored metadata and a fresh downloaded digest match the accepted
  master;
- the bucket and route retain the selected private-bucket, same-origin, and
  Fail-closed state;
- `HEAD`, complete `GET`, byte-range `206`, a `304` with no Fetch-exposed body,
  absent `Content-Encoding`, and absent or `HEAD`-matching `Content-Length` and
  `Content-Type`, unsatisfiable `416`, exact representation headers, hardening,
  bounded route failures, and edge-cache observations pass;
- a signed-out standalone native player loads, seeks, and plays in the selected
  automated browser engines; and
- the disposable withdrawal and recovery exercise passes.

The versioned Worker object URL is publicly reachable at this checkpoint.
Complete visitor-page publication additionally requires the selected poster,
caption or silent-source standing, transcript or visual description,
visitor-page markup, CSP, page-level accessibility, physical Safari/iOS
observation, and human release.

The project-level preparation, upload, activation, live-observation, and
recovery sequence lives in the [R2 progressive-video runbook][runbook].

Official references: [R2 bindings and object metadata][r2], [R2 failure
codes][r2-errors], [R2 S3 conditional operations][r2-s3], [Workers Caching
configuration and range behavior][cache], [fixed-length Worker responses][response],
[R2 public development URLs][public], [Worker limits and fail mode][limits],
[Worker Version URLs][previews], and [Worker route configuration][routes].

[cache]: https://developers.cloudflare.com/workers/cache/configuration/
[cache-gateway]: https://developers.cloudflare.com/workers/cache/examples/
[cache-purge]: https://developers.cloudflare.com/workers/cache/purge/
[limits]: https://developers.cloudflare.com/workers/platform/limits/
[public]: https://developers.cloudflare.com/r2/buckets/public-buckets/
[previews]: https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/
[r2]: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
[r2-errors]: https://developers.cloudflare.com/r2/api/error-codes/
[r2-s3]: https://developers.cloudflare.com/r2/api/s3/api/
[response]: https://developers.cloudflare.com/workers/runtime-apis/response/#set-the-content-length-header
[routes]: https://developers.cloudflare.com/workers/configuration/routing/routes/
[runbook]: ../../planning/media-publication/runbooks/r2-progressive-video-publication.v0.1.md

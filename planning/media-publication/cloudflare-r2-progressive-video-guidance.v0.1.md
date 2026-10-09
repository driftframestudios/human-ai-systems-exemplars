---
title: Accessible progressive video through R2 and Cloudflare CDN
version: 0.1.0
status: working-draft
audience: ai_collaborators
source_band: public_possible
task_type: media_publication_guidance
---

# Accessible progressive video through R2 and Cloudflare CDN

## Intended result

One reviewed source produces one accepted MP4 master and a source-owned
accessibility companion set. R2 Standard stores versioned objects; the
publication route treats each accepted key as immutable. A narrowly
routed Worker exposes those bytes at
`https://vik.guru/v1-cdn/video/<semantic-id>/<asset-version>/...` and
Cloudflare Workers Caching distributes the complete response. The browser
receives a native, visitor-controlled video with captions, a descriptive
transcript, a meaningful poster, stable geometry, and a direct recovery path.

This is progressive download through a CDN. Cloudflare Stream remains the
later adaptive-bitrate receiver.

## Why R2 owns the first route

Cloudflare's current Service-Specific Terms for Free, Pro, and Business CDN
service direct video and other large-file delivery to designated Cloudflare
services. Current Cloudflare guidance explicitly identifies R2 as a hosted
Developer Platform route. An ordinary orange-cloud cPanel origin therefore
stays outside this production video design; cPanel may retain source or
recovery material.

R2 Standard currently includes 10 GB-month of storage, one million Class A
operations, ten million Class B operations, and Internet egress without a data
transfer charge each month. Workers Free currently includes 100,000 requests
per day. These figures describe an observed planning boundary, not a permanent
price promise. Activation rechecks subscription standing, current limits,
billing ownership, and expected traffic.

Workers Caching charges every cache hit, miss, and bypass at the standard
Workers request rate, including cached `ctx.exports` loopback invocations. In
this gateway topology, each public request runs the uncached gateway and then
consults the named cached entrypoint. A hit skips the named entrypoint's code
and R2 read; the gateway has already run. Capacity and cost planning therefore
budget both the public gateway invocation and the cached loopback invocation.
R2 currently charges no data-transfer egress for direct delivery, including
delivery through a Worker, while a connected metered service can still charge.
An invoice-free small publication depends on aggregate account usage remaining
inside both Workers and R2 included allowances.

The established public alias remains on the primary domain. A direct R2 custom
domain would remove Worker code, while introducing a second browser origin and
reopening the settled `/v1-cdn/` decision. The current implementation instead
uses one R2 binding and one exact Worker route. Protected account identifiers
and credentials stay in the platform store.

### Optional `r2.dev` development observation

Cloudflare can expose a bucket through a managed `r2.dev` URL for
non-production testing. Enabling that URL makes every addressable object in
the bucket publicly retrievable through a second, unauthenticated endpoint.
The endpoint carries a variable request and throughput limit and supplies no
Cloudflare Cache, WAF, access-control, bot-management, rewrite, or Worker
response behavior.

For this project, an `r2.dev` observation is optional and short-lived. The
bucket stays private by default. A selected development observation may
confirm an exact uploaded key, media type, byte count, and digest after the
dedicated bucket contains only reviewed public candidates. The human operator
enables and disables the development URL; the public receipt records the
observation class and outcome while leaving its generated hostname and
protected platform details with the operator. Production pages continue to
use the same-origin Worker route. Production activation confirms the
development URL is disabled, the bucket has no custom domain, and CORS remains
absent. The managed development hostname remains
unaliased: Cloudflare documents a CNAME to `r2.dev` as an unsupported route.

The repository-pinned Wrangler can observe and control the development URL:

```sh
npx wrangler whoami
npx wrangler r2 bucket dev-url get vik-guru-video-carriers
npx wrangler r2 bucket dev-url enable vik-guru-video-carriers
npx wrangler r2 bucket dev-url disable vik-guru-video-carriers
npx wrangler r2 bucket dev-url get vik-guru-video-carriers
```

Keep command output inside the authorized operator boundary. The second `get`
confirms the disabled state; a public receipt records only that normalized
outcome.

## Public and storage grammar

The first grammar is intentionally finite:

```text
public:  /v1-cdn/video/<semantic-id>/v<major>.<minor>.<patch>/<carrier>
storage: v1/video/<semantic-id>/v<major>.<minor>.<patch>/<carrier>
```

Accepted carriers are:

- `movie.mp4`;
- `poster.webp`, `poster.avif`, `poster.jpg`, or `poster.png`;
- `captions.<language>.vtt`; and
- `descriptions.<language>.vtt` when a timed description track is selected.

The visitor page carries the descriptive transcript in readable HTML. The
media Worker serves passive media carriers only; executable HTML, SVG,
JavaScript, arbitrary object keys, query variants, and neighboring paths remain
outside its route grammar. A new byte set receives a new asset version instead
of overwriting an accepted immutable key.

## Preparation decision

Inspection selects one of two ordinary branches:

1. **Copy remux.** Existing H.264 High-profile `yuv420p` progressive video,
   even source-or-smaller geometry, suitable cadence, and optional AAC-LC
   mono/stereo audio at 44.1 or 48 kHz keep their elementary streams. FFmpeg
   selects the intended streams, applies the metadata policy, writes Fast
   Start, and preserves packet hashes.
2. **Encode.** A compatible source that needs codec, pixel-format, geometry,
or audio normalization receives one deliberate H.264/AAC encode. Source
cadence and aspect ratio lead; output stays source-or-smaller.

The preparation helper writes a temporary sibling and atomically promotes it
only to an unused destination. An existing accepted master keeps its bytes;
changed output receives a new versioned path.

HDR, interlacing, rotation-dependent display, variable cadence with
consequential timing, multiple audio programs, multichannel audio, embedded
subtitles, data streams, and attachments return to a source-specific decision.
Unobservable duration, cadence, or geometry also returns for explicit source
inspection because every actionable strategy must satisfy the later semantic
comparison. That return preserves meaning that an automatic normalization
could erase.

The two current Impact Map candidates already fit the copy-remux branch. Both
strict-decode successfully; both use H.264 High, `yuv420p`, 1920×1080 at 30
fps, AAC-LC stereo at 48 kHz; and both currently place `moov` after `mdat`.
Fast Start and reviewed metadata disposition are the remaining byte-level jobs.

## Metadata and secret-shaped material

Three independent observations lead publication:

- the repository's canary-proven secret scanner receives extracted metadata
  values through standard input inside the authorized local process boundary
  and returns only a redacted report;
- `ffprobe` and a format-aware reader inspect QuickTime/container tags, XMP,
  location, author, device, dates, comments, artwork, chapters, attachments,
  subtitles, timed metadata, and source-path residue; and
- the human publication owner decides visible-content suitability, rights,
  attribution, named organizations, likeness, and consent.

Public receipts record inspected classes, allowlisted structural keys, hashed
custom-key identities, tool coverage, counts, disposition, and digests. Raw
metadata keys and values remain inside the authorized local review.
FFmpeg may add a structural muxer `encoder` tag during a copy remux. The receipt
therefore distinguishes reviewed authored tags from documented structural
container tags instead of claiming an empty metadata set.

Hashing and the bounded FFmpeg/FFprobe children honor the helper's interruption
signal directly. The canary-proven metadata scanner owns its 180-second process
timeout; an interruption observed while that scanner runs takes effect at the
next checkpoint, before semantic validation or atomic promotion. The selected
output cannot be promoted after the helper observes an interruption.

## Worker and CDN behavior

The default entrypoint is an uncached gateway. It validates the raw request
target, method, canonical host, scheme, port, and carrier grammar on every
request, then forwards one canonical request to a named cached entrypoint.
This placement matters because Workers Caching runs before an entrypoint and
its key includes the entrypoint and path while omitting the request host. The
gateway therefore carries all host- and protocol-sensitive decisions before
the cache. Its canonical request retains only the accepted method, URL,
`Range`, `If-Range`, and `If-None-Match`. This keeps caller-specific,
cache-bypass, and unsupported condition headers away from the shared public
media cache. On a cold handler read, `If-None-Match` evaluates against the
strong stored R2 ETag and can return `304`. Workers Caching owns warm-hit
validators, `If-Range`, and range slicing. `If-Match` and
`If-Unmodified-Since` stop before cache dispatch and object access because
Cloudflare's documented warm-hit condition handling does not include them.

The named cached entrypoint reads a dedicated R2 binding and returns a complete
`200` response with exact `Content-Type`, `Content-Length`, quoted R2 `ETag`,
`Accept-Ranges`, and immutable cache policy. Current Workers Caching removes a
valid incoming `Range` header before invoking the named entrypoint, stores the
complete response, and returns the requested slice as `206`. This route
collapses concurrent cold requests and lets later range requests bypass the R2
read.

The Worker code therefore keeps partial-response assembly outside its path. A
live canary must establish this platform behavior because local Worker unit
tests exercise the gateway and handler without the surrounding cache layer.

At a cold edge, Workers Caching converts `HEAD` to an internal `GET` and can
fill the complete asset. The first public `HEAD` can therefore incur a full R2
read. The direct Worker unit test for `MEDIA_BUCKET.head()` remains useful for
handler behavior outside that edge conversion.

`cache.cross_version_cache` is explicitly `false`. Each deployment
starts with an isolated cache, so a new handler or header contract cannot
inherit a response produced by its predecessor. Semantic object-key versions
continue to govern media bytes.

Both `workers.dev` and Worker Version URLs are explicitly disabled.
The exact primary-domain route remains the only public Worker ingress carrying
the R2 binding and response contract.

Self-serve Cloudflare plans currently cache files up to 512 MB. This contract
interprets that published decimal unit as 512,000,000 bytes. Preparation,
Worker admission, and live verification apply that complete-object ceiling; a
small range request does not raise it. Versioned objects use
`Cache-Control: public, max-age=31536000, immutable`; missing paths, invalid
paths, method errors, unsupported preconditions, and binding failures use `no-store`.
R2, Wrangler, and
the S3-compatible API remain upload mechanisms; the browser route is read-only.
Poster and WebVTT companions use the narrower 32 MiB (33,554,432-byte)
admission boundary implemented by both the Worker and live verifier.

Activation sets the exact route to **Fail closed**. If the Free-plan daily
allowance is exhausted, Cloudflare then returns Error 1027 instead of bypassing
the Worker to cPanel. Before activation, inventory Worker routes, Transform
Rules, Cache Rules, and origin rewrites that can affect `/v1-cdn/`; the video
route must stay authoritative while neighboring media behavior stays stable.
These rules can affect routing and response processing; Workers Caching itself
follows the Wrangler cache configuration, Worker response metadata, and
Worker-owned invalidation interface.

Cloudflare documents Workers Caching as separate from zone cache purges. A
dashboard, API, or Terraform zone purge does not clear these entries. The
ordinary emergency withdrawal path uses the existing version isolation:

1. remove the visitor reference;
2. remove or quarantine the affected R2 object family;
3. deploy a fresh Worker version to 100 percent traffic;
4. keep `workers.dev` and Version URLs disabled and withhold rollback to the
   version that cached the withdrawn bytes; and
5. verify the former public family fails through the production route.

Quarantine moves the object family outside the served `v1/video/` prefix or
into a separate private bucket. A label or metadata change on an object that
remains under the served prefix does not change reachability.

With `cross_version_cache: false`, the fresh deployment starts from an
isolated cold cache. Exercise that path with a disposable object family before
first activation. A future `ctx.cache.purge()` integration enters only with a
human-authorized private invocation design; the public media grammar contains
no administrative endpoint.

## Native visitor contract

The first page uses native HTML and keeps the dependency-free runtime:

```html
<video
  controls
  playsinline
  preload="metadata"
  width="1920"
  height="1080"
  poster="/v1-cdn/video/example/v0.1.0/poster.webp"
>
  <source
    src="/v1-cdn/video/example/v0.1.0/movie.mp4"
    type="video/mp4"
  >
  <track
    kind="captions"
    srclang="en"
    label="English"
    src="/v1-cdn/video/example/v0.1.0/captions.en.vtt"
    default
  >
  <p><a href="/v1-cdn/video/example/v0.1.0/movie.mp4" download>Download the video</a>.</p>
</video>
```

Nearby prose explains the video and links to a descriptive transcript.
Visitor-initiated playback, visible controls, `preload="metadata"`, and stable
dimensions lead. Captions carry speech and meaningful sound. The transcript
carries meaningful sound and visual information. Audio description or a
conforming media alternative receives an explicit decision when visuals carry
meaning unavailable through the soundtrack.

Multiple MP4 `<source>` elements with the same media type do not form adaptive
bitrate delivery. The first supported source wins. HLS/DASH and a script player
enter with Cloudflare Stream or a separately selected adaptive receiver.

The route accepts a bounded lowercase language token in a VTT filename. The
publication packet and page integration bind that token to a reviewed BCP 47
language value in `srclang`.

## Exact remote upload shapes

The R2 S3-compatible API supports conditional `PutObject`. Use
`If-None-Match: *` so the first accepted write commits the versioned key and a
later write receives `412 Precondition Failed`. The selected carrier determines
the exact stored media type; stored content encoding stays unset because the
Worker rejects an encoded object. Keep the endpoint and credential profile in
the authorized operator boundary.

```sh
aws s3api put-object \
  --endpoint-url "https://<account-id>.r2.cloudflarestorage.com" \
  --profile <protected-r2-profile> \
  --bucket "vik-guru-video-carriers" \
  --key "v1/video/<id>/<version>/<carrier>" \
  --body "<accepted-file>" \
  --content-type "<exact-media-type>" \
  --cache-control "public, max-age=31536000, immutable" \
  --if-none-match "*"
```

Download each remote object to a fresh local path with `npx wrangler r2 object get
<bucket>/<key> --remote --file <path>`, then compare byte count and SHA-256
against the accepted packet. An unknown outcome first retrieves the target:
matching bytes complete the operation, a missing key permits the same
conditional write, and different bytes block replacement and move the candidate
to a new version after review.

## Upload packet

Each selected family carries:

- semantic ID and asset version;
- source revision, repository-relative source, source digest, and public role;
- accepted MP4 digest, bytes, duration, streams, geometry, cadence, audio, and
  copy-remux packet hashes or encode rationale;
- metadata-tool coverage and reviewed disposition;
- poster, captions, description track when selected, and transcript
  coordinates with digests;
- exact R2 keys, media types, cache policy, and retained source; and
- activation owner, recovery pointer, and future Stream migration trigger.

The packet omits account IDs, access keys, API tokens, private paths, raw
metadata values, and raw diagnostics. A dedicated video descriptor remains
separate from the current image-only asset inventory.

## Acceptance

### Local

- strict source and output decode completes;
- `moov` precedes `mdat`;
- selected streams, geometry, cadence, color, audio, duration, and
  synchronization match the preparation decision;
- copy-remux packet hashes match;
- authored metadata matches the allowlist and structural tags are documented;
- output remains below the selected receiver limit;
- captions parse in cue order and transcript coverage receives human review;
  and
- the accepted digest and byte count bind the upload packet.

### Live HTTP

- the production bucket has no custom domain or CORS policy, and any temporary
  `r2.dev` development URL is disabled;
- `workers.dev` and Worker Version URLs are disabled;
- the `/v1-cdn/video/*` route is Fail closed and wins the reviewed route/rule
  precedence;
- a newly versioned uncached URL receives `HEAD`, complete `GET`, and exact
  digest comparison before repeated cache observations;
- a cold range request uses a second fresh version, then receives a
  complete-object verification;
- `HEAD` and complete `GET` return the declared size, type, validator, cache
  policy, and hardening headers;
- `Range: bytes=0-1` returns `206`, `Content-Length: 2`, and the exact
  `Content-Range` without response content encoding;
- an unsatisfiable range returns `416` with `Content-Range: bytes */<size>`;
- the downloaded object digest matches the accepted packet;
- repeated requests record observed `CF-Cache-Status` without treating one
  edge `HIT` as a global invariant;
- a separate bounded `HEAD` observation confirms missing, neighboring,
  query-bearing, and unsupported paths receive the documented `400` or `404`
  response with `no-store` and hardening headers; and
- a disposable withdrawal exercise confirms that a removed object plus a
  fully deployed new Worker version makes the preceding public family
  unavailable without a zone-cache purge.

### Browser and accessibility

- signed-out Chromium, Firefox, and consequential Safari/iOS observations
  cover poster, controls, play/pause, keyboard seek, volume, captions,
  transcript, audio, focus, narrow/wide containment, interruption, and
  recovery;
- page CSP admits the same-origin media route;
- meaningful playback begins through visitor action; and
- the prior page pointer can be restored independently from retained R2
  objects.

Cloudflare currently documents an iOS/Safari MP4 cache interaction involving
weak ETags. The Worker returns the strong quoted R2 ETag, while a physical
Safari/iOS observation remains a release gate.

## Recovery and Stream migration

Versioned objects make page activation reversible. Recovery restores the prior
page pointer; uploaded objects governed by the accepted no-overwrite policy
may remain unreferenced until the retention decision settles. A later Stream
migration preserves semantic ID,
accepted ingest master, poster, captions, transcript, accessibility decisions,
and R2 rollback while replacing only the delivery adapter and player.

## Primary references

- [Cloudflare Service-Specific Terms — CDN](https://www.cloudflare.com/service-specific-terms-application-services/)
- [Cloudflare policy: delivering videos](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/delivering-videos-with-cloudflare/)
- [Cloudflare explanation of CDN-hosted R2 video](https://blog.cloudflare.com/updated-tos/)
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [R2 S3 API compatibility and conditional operations](https://developers.cloudflare.com/r2/api/s3/api/)
- [R2 error codes](https://developers.cloudflare.com/r2/api/error-codes/)
- [R2 public buckets and development URLs](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [R2 platform limits](https://developers.cloudflare.com/r2/platform/limits/)
- [R2 upload routes](https://developers.cloudflare.com/r2/objects/upload-objects/)
- [R2 Wrangler commands](https://developers.cloudflare.com/r2/reference/wrangler-commands/)
- [Workers Caching and range behavior](https://developers.cloudflare.com/workers/cache/configuration/)
- [Workers Caching gateway pattern](https://developers.cloudflare.com/workers/cache/examples/)
- [Workers Cache key composition](https://developers.cloudflare.com/workers/cache/cache-keys/)
- [Workers Cache request accounting](https://developers.cloudflare.com/workers/cache/)
- [Workers Cache purge and invalidation](https://developers.cloudflare.com/workers/cache/purge/)
- [Workers Cache keys across deployments](https://developers.cloudflare.com/workers/cache/cache-keys/#invalidating-cache-across-deployments)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Worker Version URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/)
- [Cloudflare cache range requests](https://developers.cloudflare.com/cache/reference/range-requests/)
- [Cloudflare MP4 on iOS and Safari](https://developers.cloudflare.com/cache/troubleshooting/mp4-videos-on-ios-and-safari/)
- [MDN: `<video>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video)
- [MDN: `<track>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/track)
- [W3C WAI: making audio and video accessible](https://www.w3.org/WAI/media/av/)
- [FFmpeg formats and Fast Start](https://ffmpeg.org/ffmpeg-formats.html)

## Re-entry

Re-enter this guidance when a selected asset changes source streams,
accessibility classification, object grammar, public host, cache mechanism,
Worker route, receiver limit, rights standing, or delivery provider. A
successful small-video exercise informs the draft; it does not turn current
Cloudflare pricing or platform behavior into timeless repository law.

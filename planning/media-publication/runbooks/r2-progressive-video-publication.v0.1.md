---
title: R2 progressive-video publication runbook
version: 0.1.0
status: working
audience: ai_collaborators
source_band: public_possible
task_type: operational_collaboration
---

# R2 progressive-video publication runbook

## Use

Use this runbook after a human selects a public visitor video and the current
receiver is R2-backed progressive delivery through
`https://vik.guru/v1-cdn/video/`. The runbook starts from exact source bytes
and ends at an observed native player or a clearly bounded handoff.

## Entry packet

- source revision and repository-relative source path;
- semantic ID, asset version, visitor page, and media role;
- rights, attribution, visible-content, consent, and release owner;
- synchronized-media, video-only, decorative, or media-alternative standing;
- language, caption, transcript, poster, and description standing;
- current R2/Workers subscription, allowance, and billing owner;
- expected traffic, access posture, retention, and recovery source; and
- receiving GitHub Issue and human activation owner.

## Source preparation

1. Run `ffprobe` and strict decode through the repository preparation helper.
2. Inspect embedded metadata with `ffprobe` and a fitting format-aware reader.
   Feed extracted values to the repository's canary-proven secret scanner;
   retain raw values inside the authorized local boundary.
3. Select copy remux when streams already fit. Select one encode when a named
   compatibility or size requirement earns it. Route HDR, interlacing,
   consequential variable cadence, multiple audio programs, multichannel
   audio, meaningful embedded subtitles, data, and attachments through an
   explicit source-specific branch.
4. Select an unused versioned destination. The helper writes a temporary
   sibling, completes strict decode, Fast Start, stream, observable duration and
   cadence, selected scaling geometry, audio, metadata, digest, and
   cacheable-size checks, and then promotes those verified local bytes
   atomically while preserving an existing target. A copy remux also compares
   video and audio packet hashes before promotion.
5. Review the promoted local master perceptually against the source. Accept it
   for the upload packet after the intended motion, sound, language, timing,
   and visual meaning are confirmed.

Hashing and the bounded FFmpeg/FFprobe children honor the helper's interruption
signal directly. The metadata scanner owns its 180-second process timeout; an
interruption observed during that bounded scan takes effect at the next
checkpoint, before semantic validation or atomic promotion. Resume by
inspecting the exact selected output and any named temporary sibling according
to **Calm recovery**.

Illustrative commands use the repository helper rather than a hand-maintained
FFmpeg loop:

```sh
npm run media:video:inspect -- --source <source.mp4>
npm run media:video:prepare -- \
  --source <source.mp4> \
  --output <accepted-master.mp4> \
  --semantic-id <semantic-id> \
  --asset-version v0.1.0
npm run media:video:verify -- --source <accepted-master.mp4>
npm run media:video:verify -- \
  --source <accepted-master.mp4> \
  --against <source.mp4>
```

## Accessibility companions

1. Derive poster candidates from the digest-bound accepted master through
   `accessible-video-publication`. Responsive-raster tooling may encode and
   inspect the selected still while the video packet retains its master,
   timestamp, settings, geometry, and digest lineage.
2. For audio-bearing media, review WebVTT cue timing, order, language, speech,
   and meaningful sound, then place a descriptive transcript in readable
   visitor-page HTML.
3. For verified silent video, record the silent-source standing, keep an empty
   captions carrier outside the family, and write a visible ordered sequence
   of meaningful visual changes.
4. Decide whether audio description, a timed descriptions track, or a
   conforming media alternative carries remaining visual meaning.
5. Review the page's accessible name, concise description relationships,
   separately navigable transcript or visual sequence, explanatory prose,
   intrinsic geometry, keyboard route, visitor-controlled playback, and
   fallback download.

## Object plan

Form a finite packet before upload:

```text
v1/video/<semantic-id>/<asset-version>/movie.mp4
v1/video/<semantic-id>/<asset-version>/poster.webp
v1/video/<semantic-id>/<asset-version>/captions.en.vtt      # when selected
v1/video/<semantic-id>/<asset-version>/descriptions.en.vtt  # when selected
```

Record exact media type, `Cache-Control: public, max-age=31536000, immutable`,
byte count, SHA-256, and source coordinate for every selected object. A changed
byte or metadata set receives a new asset version. The current image-only
asset inventory remains separate from this poster lineage; the video packet is
its own compact descriptor. Keep the video at or below 512 MB (512,000,000
bytes) and each poster or WebVTT companion at or below 32 MiB (33,554,432
bytes), matching Worker admission and live verification.

An object written beneath the active `v1/video/` prefix becomes publicly
reachable through the Worker route. Before that write, the human activation
owner confirms the media's rights, consent, visible-content review, attribution,
public-candidate role, public access posture, release owner, and authority to
publish the bytes. Companion, receiving-page, and browser-acceptance fields may
remain explicitly open for the transport-only checkpoint below.

Choose one write mode for the publication window. The R2 S3-compatible API's
conditional `PutObject` operation is the enforced create-only route. Its
`If-None-Match: *` precondition makes the unused versioned key a commit
boundary rather than a naming convention. Keep the endpoint and credential
profile inside the authorized operator boundary, set exact HTTP metadata, and
leave content encoding unset:

```sh
aws s3api put-object \
  --endpoint-url "https://<account-id>.r2.cloudflarestorage.com" \
  --profile <protected-r2-profile> \
  --bucket "<bucket>" \
  --key "v1/video/<id>/<version>/movie.mp4" \
  --body "<accepted-master.mp4>" \
  --content-type "video/mp4" \
  --cache-control "public, max-age=31536000, immutable" \
  --if-none-match "*"
```

Use the same shape with `image/webp`, `image/avif`, `image/jpeg`, `image/png`, or
`text/vtt; charset=utf-8` for the finite companion carriers. A `412` means the
key already exists; inspect those existing bytes instead of replacing them.
Download each accepted key with `npx wrangler r2 object get
<bucket>/<key> --remote --file <fresh-path>` and compare its byte count and
SHA-256 with the packet.

The repository-pinned Wrangler `r2 object put` command currently exposes exact
content metadata and remote upload while omitting an absent-key precondition.
For a human-approved single-writer window, confirm each versioned key through
an authenticated remote read, serialize writes, and retrieve each object into
a fresh target for digest comparison:

```sh
env WRANGLER_WRITE_LOGS=false npx wrangler r2 object get \
  "<bucket>/v1/video/<id>/<version>/movie.mp4" \
  --remote \
  --file <fresh-preflight-path>

env WRANGLER_WRITE_LOGS=false npx wrangler r2 object put \
  "<bucket>/v1/video/<id>/<version>/movie.mp4" \
  --remote \
  --file <accepted-master.mp4> \
  --content-type "video/mp4" \
  --cache-control "public, max-age=31536000, immutable" \
  --storage-class Standard

env WRANGLER_WRITE_LOGS=false npx wrangler r2 object get \
  "<bucket>/v1/video/<id>/<version>/movie.mp4" \
  --remote \
  --file <fresh-verification-path>
```

An authenticated object-absence result permits the upload. Any authentication,
network, or provider error holds the write for diagnosis. An existing object
receives size, digest, and metadata comparison; matching bytes complete the
member, while different bytes preserve the key and move the candidate to a new
reviewed version. The remote read and Wrangler upload are separate operations,
so this route depends on the named single-writer boundary. A window with
concurrent publishers uses conditional S3-compatible writes.

An interrupted or unknown upload outcome enters through observation: retrieve
the exact key first. Matching size and digest establish that the conditional
or coordinated write committed. A missing key permits the selected create
route to run again. Different bytes preserve the existing key, block
activation, and route the candidate to a new semantic version after review.
This sequence keeps an accepted object stable while making interruption
recovery explicit.

### Multi-family publication window

A batch begins with completed per-family packets from
`accessible-video-publication`; the batch coordinates delivery rather than
reclassifying source, rights, accessibility, poster, or visitor-page standing.
Record a finite roster of semantic IDs, versions, carrier roles, media types,
sizes, digests, and activation owners before the first write.

Local preparation can run concurrently. Remote mutation follows the selected
write mode: the Wrangler route uses one serial writer, while conditional
S3-compatible writes may use bounded concurrency after packet review. Each
object is one atomic R2 write. A family and batch contain multiple objects and
therefore settle member by member. Keep the preceding visitor pointer active
until all required members of a family pass fresh retrieval and receiver
checks.

Use the member states `prepared`, `absent`, `stored_unverified`, `verified`, and
`conflict` in the receiving Issue or existing publication manifest. After an
interruption, retrieve the exact key before replaying a command. Matching bytes
advance the member to `verified`; absence returns to the selected create route;
a mismatch enters `conflict` and receives a new reviewed version. This compact
progress view supports resume without creating another authority record.

Public returns carry semantic IDs and versions, carrier types, byte counts,
digests, normalized member counts, selected write mode, public routes, and
normalized receiver outcomes. Private source paths, storage and account
coordinates, raw metadata, command transcripts, request IDs, and provider
diagnostics stay with the authorized operator.

### Optional direct-object observation

The human operator may temporarily enable the bucket's managed `r2.dev`
development URL after the bucket contains only reviewed public candidates.
Use that second public endpoint to compare an exact object key, media type,
size, and digest before Worker activation. Record the bounded outcome rather
than the generated hostname, then disable the development URL. Production
markup, cache acceptance, security controls, and route recovery continue to
use `vik.guru/v1-cdn/video/*`; the development hostname stays unaliased.

Use the repository-pinned Wrangler and keep command output inside the
authorized operator boundary:

```sh
npx wrangler whoami
npx wrangler r2 bucket dev-url get "<bucket>"
npx wrangler r2 bucket dev-url enable "<bucket>"
npx wrangler r2 bucket dev-url disable "<bucket>"
npx wrangler r2 bucket dev-url get "<bucket>"
```

The final status observation confirms the development URL is disabled. Public
receipts record that normalized outcome and omit account identifiers and the
generated hostname.

## Human activation handoff

The human Cloudflare operator:

1. confirms current Cloudflare terms, R2 Standard subscription, included and
   expected usage, Workers allowance, and billing notification posture;
2. creates or selects the dedicated private media bucket, keeps CORS absent,
   leaves custom domains unconfigured, and retains credentials in the platform
   store;
3. uploads the exact accepted objects with declared HTTP metadata;
4. compares object size and downloaded SHA-256 with the packet, optionally
   using a temporary `r2.dev` observation when direct public retrieval helps;
5. disables the development URL after that optional observation;
6. inventories Worker routes, Transform Rules, Cache Rules, and origin rewrites
   that can affect `/v1-cdn/`, while treating them as neighboring route and
   response controls rather than Workers Cache controls;
7. reviews the Worker dry run, confirms `workers.dev` and Worker Version URLs
   are disabled, activates only the exact
   `vik.guru/v1-cdn/video/*` route, and sets the route to Fail closed; and
8. preserves the preceding Worker version and page pointer as recovery
   coordinates.

The route package lives in `cloudflare/r2-video-delivery/`. Wrangler configures
the default gateway entrypoint as uncached and the named media-object entrypoint
as cached. The gateway validates and canonicalizes every public request before
the named entrypoint can consult its shared path cache. The canonical request
preserves `Range`, `If-Range`, and `If-None-Match` while leaving caller-specific
and cache-bypass headers outside the shared cache. The cold handler evaluates
`If-None-Match`; Workers Caching owns warm-hit validators, `If-Range`, and range
slicing. `If-Match` and `If-Unmodified-Since` stop before cache dispatch and
object access. Wrangler dry-run and unit tests
establish that source topology. Live cache and range behavior begins after the
route is attached to the Cloudflare zone.

After the human authorizes activation, use the repository-pinned Wrangler:

```sh
npx wrangler whoami
npm run dry-run:r2-video-delivery
npx wrangler deploy --config cloudflare/r2-video-delivery/wrangler.jsonc
```

Keep command output inside the authorized operator boundary. In the Cloudflare
dashboard, set the exact route to Fail closed, read back the route and Version
URL state, and begin the fresh-version observations below.

## Live receiver observation

Begin the transport-only observation with the canonical MP4:

```sh
npm run verify:r2-video:live -- \
  --video https://vik.guru/v1-cdn/video/<id>/<version>/movie.mp4 \
  --sha256 <accepted-video-sha256> \
  --size <accepted-video-bytes>
```

After the companion carriers are accepted, extend the same observation with
their exact identities:

```sh
npm run verify:r2-video:live -- \
  --video https://vik.guru/v1-cdn/video/<id>/<version>/movie.mp4 \
  --captions https://vik.guru/v1-cdn/video/<id>/<version>/captions.en.vtt \
  --captions-sha256 <accepted-caption-sha256> \
  --captions-size <accepted-caption-bytes> \
  --descriptions https://vik.guru/v1-cdn/video/<id>/<version>/descriptions.en.vtt \
  --descriptions-sha256 <accepted-description-sha256> \
  --descriptions-size <accepted-description-bytes> \
  --poster https://vik.guru/v1-cdn/video/<id>/<version>/poster.webp \
  --poster-sha256 <accepted-poster-sha256> \
  --poster-size <accepted-poster-bytes> \
  --sha256 <accepted-video-sha256> \
  --size <accepted-video-bytes>
```

For the second fresh version, make the byte-range request the first public
video request:

```sh
npm run verify:r2-video:live -- \
  --video https://vik.guru/v1-cdn/video/<id>/<fresh-version>/movie.mp4 \
  --cold-range-first \
  --sha256 <accepted-video-sha256> \
  --size <accepted-video-bytes>
```

The verifier owns the positive object, range, conditional revalidation, cache,
and any supplied companion contract. It sends the strong validator observed
from `HEAD` through `If-None-Match` and requires a `304` with no
Fetch-exposed body, the matching validator, exact immutable cache policy, and
public hardening headers. It also requires an absent `Content-Encoding` header and an
absent or `HEAD`-matching `Content-Length` and `Content-Type` on the `304`.
`Accept-Ranges` remains a `HEAD` and complete `GET` contract; the cache-generated
`206` and `304` may omit it. Observe the production route boundary separately
with `HEAD` so the expected failure remains body-free and inspectable:

```sh
curl --silent --show-error --head \
  'https://vik.guru/v1-cdn/video/<id>/<version>/movie.mp4?route-probe=1'
curl --silent --show-error --head \
  'https://vik.guru/v1-cdn/video/<id>/<version>/movie.webm'
curl --silent --show-error --head \
  'https://vik.guru/v1-cdn/video/<id>/<version>/'
curl --silent --show-error --head \
  'https://vik.guru/v1-cdn/video/<confirmed-unused-id>/<confirmed-unused-version>/movie.mp4'
```

The query-bearing request returns bounded `400`; the unsupported carrier,
neighboring path, and confirmed-absent valid object return bounded `404`.
Each response carries `Cache-Control: no-store`, `X-Content-Type-Options:
nosniff`, `Referrer-Policy: no-referrer`, and
`Cross-Origin-Resource-Policy: same-origin`. Record normalized status and
header results. Keep generated request identifiers, provider diagnostics, and
account coordinates inside the authorized operator boundary.

Accept:

- one fresh version receives `HEAD`, complete `GET`, digest comparison, and
  repeated cache observations;
- a second fresh version establishes the cold-range path with an initial
  `Cf-Cache-Status: MISS`, followed by complete-object verification;
- exact types, size, strong validator, immutable policy, `nosniff`, and
  `Accept-Ranges` on `HEAD` and complete `GET`;
- a matching `If-None-Match` request returns `304` with no Fetch-exposed body,
  the strong validator, immutable cache policy, absent `Content-Encoding`,
  absent or `HEAD`-matching `Content-Length` and `Content-Type`, and hardening
  headers;
- matching complete-object digest;
- exact `bytes=0-1` partial response and correct unsatisfiable-range behavior;
- cache observations whose meaning stays limited to the observed edge;
- exact positive routes from the verifier and bounded route failures from the
  separate boundary observation.

At a cold Workers Cache edge, Cloudflare converts `HEAD` to an internal `GET`
and can fill the complete asset. Treat the first `HEAD` as a potential full R2
read. The direct Worker unit test of `MEDIA_BUCKET.head()` establishes handler
behavior outside that edge-cache conversion rather than predicting the cold
production request path.

Before taking the transport-only checkpoint, load the canonical MP4 directly
in a signed-out native player in the selected automated browser engines.
Confirm that metadata loads and that play and seek behavior preserve the
accepted duration and geometry. Keep this standalone transport observation
distinct from the later receiving-page accessibility and layout exercise.

Exercise withdrawal with a disposable family before first visitor-page
activation. Remove its visitor reference, remove or quarantine its R2 object,
deploy a new Worker version to 100 percent traffic, keep `workers.dev` and
Version URLs disabled, and verify that the former public route fails. Retain
the preceding version for diagnosis without routing traffic back to it.
Quarantine moves the family outside the served `v1/video/` prefix or into a
separate private bucket; an in-place label inside the served prefix does not
change public reachability.

Workers Caching is separate from the zone cache: dashboard, zone API, and
Terraform purges do not remove its entries. The configured
`cross_version_cache: false` gives each full deployment an isolated cold cache.
A future `ctx.cache.purge()` route requires a human-authorized private
invocation design. The public media route exposes read behavior only.

### Transport-only checkpoint

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
visitor-page placement, CSP, page-level accessibility, physical Safari/iOS
observation, and human release. Record those boundaries and any incomplete
companion, receiving-page, or browser-acceptance fields in the receiving Issue,
then resume with the companions and selected visitor page.

Resume companion and visitor-page acceptance with the selected poster,
captions or explicit silent-source standing, transcript or visual description,
public retrieval, page placement, and page-level accessibility contract.

For full visitor-page acceptance, exercise signed-out native playback in
Chromium, Firefox, and a consequential Safari/iOS receiver at representative
narrow, tablet, desktop, and wide viewports. Observe controls, keyboard use,
poster, seek, focus, interruption, orientation, layout stability, recovery,
and the source's selected accessibility branch: caption selection, transcript,
volume, and audio for audio-bearing media; or explicit silent standing and the
visible ordered sequence for verified silent video.

## Calm recovery

- A local preparation failure leaves the source and preceding accepted master
  unchanged. When an output is present after an interrupted or unknown prior
  outcome, verify it against the source. An exact valid output is the durable
  checkpoint; a mismatch remains in place for diagnosis and moves repaired
  bytes to a new version. A stale hidden temporary sibling receives inspection
  and exact-path removal before a fresh preparation run.
- A completed atomic promotion remains a successful commit when temporary-link
  cleanup needs attention; the receipt names that cleanup disposition without
  recasting the accepted output as a failed preparation.
- An upload mismatch leaves page markup on the preceding family and sends the
  candidate to a new versioned key after repair.
- A batch interruption leaves verified members accepted and starts remaining
  members from exact remote observation. An independently held family leaves
  other accepted families available for their own release decisions.
- An ordinary Worker-code or live-route regression with still-approved media
  restores the preceding Worker version.
- A page-level playback problem restores the preceding page pointer while the
  accepted R2 family remains available for focused diagnosis.
- A usage, billing, or service-fit change preserves the package for direct
  Stream migration or another explicitly selected receiver.

After an interrupted deployment, read the active Worker deployment and exact
route before choosing deploy, rollback, or no action. After an interrupted
`r2.dev` observation, read its current state first and disable an enabled
development URL. These state reads keep repeated operator actions idempotent.

## Return

Return only public-safe material:

- source revision and repository-relative identity;
- semantic ID and asset version;
- accepted digests, sizes, stream summary, and metadata-coverage statement;
- companion standing;
- public routes and normalized HTTP/browser outcomes;
- exact unresolved boundary, if present; and
- the public recovery standing when useful. Storage and account coordinates,
  credentials, raw upload receipts, private paths, metadata values, and
  provider diagnostics stay with the authorized operator.

## Completion

The run completes when accepted source and companion packets, R2 objects,
Worker route, CDN/range behavior, native player, accessibility carriers,
signed-out browsers, and recovery all agree. A local-only run completes as a
bounded preparation handoff when platform or human activation authority is the
remaining step. A live transport-only run pauses as the bounded checkpoint
named above; it resumes before visitor-page activation.

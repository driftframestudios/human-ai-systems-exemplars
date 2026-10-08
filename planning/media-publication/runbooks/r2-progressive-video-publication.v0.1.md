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
4. Select an unused versioned destination and write a temporary sibling
   output. Accept the output after strict decode, Fast Start, stream, duration,
   geometry, cadence, audio, metadata, digest, and perceptual checks pass. The
   helper promotes verified bytes atomically and preserves an existing target.
5. For a copy remux, compare video and audio packet hashes before atomic
   promotion.

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
```

## Accessibility companions

1. Select or generate a meaningful poster through the responsive-raster
   owner.
2. Review WebVTT cue timing, order, language, speech, and meaningful sound.
3. Place a descriptive transcript in readable visitor-page HTML and include
   meaningful visual information.
4. Decide whether audio description, a timed descriptions track, or a
   conforming media alternative carries remaining visual meaning.
5. Review the page's accessible name, explanatory prose, intrinsic geometry,
   keyboard route, visitor-controlled playback, and fallback download.

## Object plan

Form a finite packet before upload:

```text
v1/video/<semantic-id>/<asset-version>/movie.mp4
v1/video/<semantic-id>/<asset-version>/poster.webp
v1/video/<semantic-id>/<asset-version>/captions.en.vtt
v1/video/<semantic-id>/<asset-version>/descriptions.en.vtt  # when selected
```

Record exact media type, `Cache-Control: public, max-age=31536000, immutable`,
byte count, SHA-256, and source coordinate for every selected object. A changed
byte or metadata set receives a new asset version. The current image-only
asset inventory continues to own raster selection; the video packet remains a
separate, compact descriptor.

Wrangler v4 remote writes use an explicit target, storage class, type, and
file. Leave content encoding unset:

```sh
npx wrangler r2 object put \
  "vik-guru-video-carriers/v1/video/<id>/<version>/movie.mp4" \
  --remote --storage-class Standard --content-type "video/mp4" \
  --file "<accepted-master.mp4>"
```

Use the same shape with `image/webp`, `image/jpeg`, `image/png`, or
`text/vtt; charset=utf-8` for the finite companion carriers. Download each
accepted key with `npx wrangler r2 object get <bucket>/<key> --remote --file
<fresh-path>` and compare its byte count and SHA-256 with the packet.

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
npx wrangler r2 bucket dev-url get vik-guru-video-carriers
npx wrangler r2 bucket dev-url enable vik-guru-video-carriers
npx wrangler r2 bucket dev-url disable vik-guru-video-carriers
npx wrangler r2 bucket dev-url get vik-guru-video-carriers
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

The route package lives in `cloudflare/r2-video-delivery/`. Wrangler dry-run
and unit tests establish source behavior. Live cache and range behavior begins
only after the route is attached to the Cloudflare zone.

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

```sh
npm run verify:r2-video:live -- \
  --video https://vik.guru/v1-cdn/video/<id>/<version>/movie.mp4 \
  --captions https://vik.guru/v1-cdn/video/<id>/<version>/captions.en.vtt \
  --poster https://vik.guru/v1-cdn/video/<id>/<version>/poster.webp \
  --sha256 <accepted-video-sha256> \
  --size <accepted-video-bytes>
```

Accept:

- one fresh version receives `HEAD`, complete `GET`, digest comparison, and
  repeated cache observations;
- a second fresh version establishes the cold-range path, followed by
  complete-object verification;
- exact types, size, strong validator, immutable policy, `nosniff`, and
  `Accept-Ranges`;
- matching complete-object digest;
- exact `bytes=0-1` partial response and correct unsatisfiable-range behavior;
- cache observations whose meaning stays limited to the observed edge;
- exact positive routes and bounded neighboring-path failures; and
- companion types and public retrieval.

At a cold Workers Cache edge, Cloudflare converts `HEAD` to an internal `GET`
and can fill the complete asset. Treat the first `HEAD` as a potential full R2
read. The direct Worker unit test of `MEDIA_BUCKET.head()` establishes handler
behavior outside that edge-cache conversion rather than predicting the cold
production request path.

Then exercise signed-out native playback in Chromium, Firefox, and a
consequential Safari/iOS receiver at representative narrow, tablet, desktop,
and wide viewports. Observe controls, keyboard use, poster, caption selection,
transcript access, seek, volume, audio, focus, interruption, orientation,
layout stability, and recovery.

## Calm recovery

- A local preparation failure leaves the source and preceding accepted master
  unchanged.
- An upload mismatch leaves page markup on the preceding family and sends the
  candidate to a new versioned key after repair.
- An ordinary Worker-code or live-route regression with still-approved media
  restores the preceding Worker version.
- A page-level playback problem restores the preceding page pointer while the
  accepted R2 family remains available for focused diagnosis.
- A usage, billing, or service-fit change preserves the package for direct
  Stream migration or another explicitly selected receiver.

Before first activation, exercise an emergency withdrawal with a disposable
family. Remove its visitor reference, remove or quarantine its R2 object,
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

## Return

Return only public-safe material:

- source revision and repository-relative identity;
- semantic ID and asset version;
- accepted digests, sizes, stream summary, and metadata-coverage statement;
- companion standing;
- public routes and normalized HTTP/browser outcomes;
- exact unresolved boundary, if present; and
- source-visible bucket name and recovery coordinate when useful. Account
  identifiers, credentials, raw upload receipts, metadata values, and provider
  diagnostics stay with the authorized operator.

## Completion

The run completes when accepted source and companion packets, R2 objects,
Worker route, CDN/range behavior, native player, accessibility carriers,
signed-out browsers, and recovery all agree. A local-only run completes as a
bounded preparation handoff when platform or human activation authority is the
remaining step.

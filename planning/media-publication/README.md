# Media publication planning

The media-publication planning area prepares repeatable image and video publication work for
the Context Canvas while the current runtime and release owners remain authoritative.
Current source, asset inventories, production manifests, GitHub Issues, and
the selected delivery service retain existing ownership.

## Current decision

- Browser-selected raster delivery remains source-owned through accurate
  `srcset`, `sizes`, intrinsic dimensions, and reproducible derivatives when
  repository markup owns the image slot.
- Cloudflare image transformation remains a bounded comparison route for an
  unchanged-URL job with a measured benefit.
- R2 Standard stores the first selected public videos. A narrowly routed
  Worker serves versioned objects governed by a no-overwrite publication
  policy through `https://vik.guru/v1-cdn/video/`
  with Cloudflare Workers Caching, while native HTML supplies accessible,
  visitor-initiated progressive playback.
- Cloudflare Stream remains the future adaptive receiver. The accepted R2
  master, semantic identity, poster, captions, transcript, and recovery
  coordinate form the migration packet.
- Credential-shaped material, embedded metadata, visible content, rights, and
  consent remain distinct publication decisions with fitting observations.

## Working surfaces

- [FFmpeg and Cloudflare Stream guidance](ffmpeg-cloudflare-stream-guidance.v0.1.md)
  — retained adaptive-delivery guidance for a later Stream migration.
- [R2 progressive-video guidance](cloudflare-r2-progressive-video-guidance.v0.1.md)
  — the current same-origin CDN route, source preparation, accessible native
  playback, Workers Caching, R2 storage, and live acceptance contract.
- [Media publication preflight](runbooks/media-publication-preflight.v0.1.md)
  — a draft re-entrant route for image and video handoffs.
- [Responsive raster publication draft skill](draft-skills/responsive-raster-publication/SKILL.md)
  — a candidate contract distilled from Issue #286.
- [Cloudflare Stream video publication draft skill](draft-skills/cloudflare-stream-video-publication/SKILL.md)
  — a candidate adapter for the later adaptive-delivery migration.
- [Accessible video publication draft skill](draft-skills/accessible-video-publication/SKILL.md)
  — the provider-neutral source, accessibility, and page contract.
- [Cloudflare R2 progressive-video delivery draft skill](draft-skills/cloudflare-r2-progressive-video-delivery/SKILL.md)
  — the current storage, route, cache, and receiver adapter.
- [R2 progressive-video publication runbook](runbooks/r2-progressive-video-publication.v0.1.md)
  — the re-entrant preparation, activation, observation, and recovery route.
- [Impact Map progressive-video preparation exercise](exercises/impact-map-r2-progressive-preflight.v0.1.md)
  — the first two-file exercise of the local preparation, metadata, Fast
  Start, semantic-preservation, and packet-preservation contracts.

## Cultivation path

The skills remain planning candidates while real asset families exercise the
complete paths. The first image exercise can use a bounded Issue #286 tranche.
The first video exercise used the two selected Impact Map files and accepted a
lossless Fast Start remux for both. The exercise record returns one useful
refinement to the helper and names the remaining publication decisions.
Material friction continues to return to the drafts; stable, repeated
decisions can then move into the public repository skill and runbook catalogs
through the existing selection process.

## Language posture

The media-publication planning area follows the repository's
[supportive-change-writing collection](../../supportive-change-writing-exemplars-bundle-v0.1/README.md),
[agency-and-action writing collection](../../agency-and-action-writing-exemplars-bundle-v0.1/README.md),
and [Semantic Attractor Design guidance](../../supportive-change-writing-exemplars-bundle-v0.1/guidance/semantic-attractor-design.v0.1.md).
Desired states, direct actors, observable completion, and a calm recovery route
lead each contract. Precise security, privacy, rights, and evidence boundaries
retain load-bearing polarity and name the authorized destination beside
the boundary.

## Boundary

The planning area contains guidance and candidate contracts. Named Issues own
implementation; the human author selects public activation; production assets,
media uploads, publication rights, and protected Cloudflare coordinates remain
with established source and platform owners.

Cloudflare's current self-serve CDN terms distinguish video hosted by a
Cloudflare service from video fetched from an ordinary external origin. R2
therefore owns the production video bytes for this route. Current R2 and
Workers included allowances can make a small publication invoice-free, while
aggregate account use remains inside both allowances. The uncached gateway
runs for each public request, then a cached `ctx.exports` invocation consults
the media entrypoint. Cloudflare charges cached loopback hits and misses at the
standard Workers request rate; a hit skips the named entrypoint's code and R2
read while preserving gateway validation. R2 currently charges no
data-transfer egress for direct or Worker-mediated delivery. Subscription,
usage, pricing, and limits remain activation-time observations rather than
durable promises.

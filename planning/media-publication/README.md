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
- Cloudflare Stream is the preferred receiver for selected public video.
  FFmpeg prepares one inspected upload master; Stream performs transcoding,
  adaptive-bitrate packaging, storage, and delivery.
- Credential-shaped material, embedded metadata, visible content, rights, and
  consent remain distinct publication decisions with fitting observations.

## Working surfaces

- [FFmpeg and Cloudflare Stream guidance](ffmpeg-cloudflare-stream-guidance.v0.1.md)
  — corrected source preparation, audio, metadata, accessibility, upload, and
  playback guidance for the first two candidate videos.
- [Media publication preflight](runbooks/media-publication-preflight.v0.1.md)
  — a draft re-entrant route for image and video handoffs.
- [Responsive raster publication draft skill](draft-skills/responsive-raster-publication/SKILL.md)
  — a candidate contract distilled from Issue #286.
- [Cloudflare Stream video publication draft skill](draft-skills/cloudflare-stream-video-publication/SKILL.md)
  — a candidate contract for the video analog to Issue #286.

## Cultivation path

Both skills remain planning candidates until a real asset family exercises
the complete path. The first image exercise can use a bounded Issue #286
tranche. The first video exercise can use the two human-selected source files
after source inspection and encoding. Material friction returns to the draft;
stable, repeated decisions can then move into the public repository skill and
runbook catalogs through the existing selection process.

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

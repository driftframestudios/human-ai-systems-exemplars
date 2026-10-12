---
title: R2 multi-family progressive-video batch exercise
version: 0.1.0
status: transport-accepted
audience: ai_collaborators
source_band: public_possible
task_type: skill_exercise
---

# R2 multi-family progressive-video batch exercise

## Purpose

This exercise extends the first accepted native-video receiver from one family
to eleven independently resumable families. It tests semantic naming, bounded
media preparation, accepted-byte poster derivation, serialized Wrangler
publication, exact remote comparison, live same-origin route verification, and
visitor-placement handoff without turning the batch into another authority
system.

Each family remains the unit of acceptance and recovery. A held member can
return to preparation while accepted siblings continue toward their named
receivers.

## Accepted carrier families

Every family uses `v0.1.0`, a video-only H.264 High-profile `yuv420p` movie with
square pixels and MP4 Fast Start, and a WebP poster derived from the accepted
movie bytes. All carrier routes share this shape:

```text
/v1-cdn/video/<semantic-id>/v0.1.0/movie.mp4
/v1-cdn/video/<semantic-id>/v0.1.0/poster.webp
```

| Semantic ID | Movie geometry · duration | Movie bytes · SHA-256 | Poster timestamp | Poster bytes · SHA-256 |
| --- | --- | --- | ---: | --- |
| `clinical-trial-boolean-builder` | 1920 × 976 · 121.666667 s | 3,939,940 · `036d11825b740b99be2430e26a6dbd010d56b7348d2c6f91fa41853aa754ad3b` | 5.0 s | 82,238 · `0d8473867e3fc4ff39e0028bf2c465328a06f4601bd6523eb2d55d079932c955` |
| `cpg-pharma-conversational-ai` | 1154 × 1080 · 161.700000 s | 6,948,331 · `a9c4ace8addd1fff373200cbe64a1fc23906c32842ec14ab6822b7242a177507` | 5.0 s | 58,422 · `bad24c58c207cb277dfcc1497e48a72581c24ae8157cea9ca56931178b1662f6` |
| `cpg-pharma-menu-bottleneck` | 1472 × 1080 · 17.833333 s | 471,054 · `9f592b9ef0497212152260924a30e400db0fcdd791f7bc17419ae5d5fec0883c` | 1.0 s | 79,712 · `bf486187d3827c7ee59b398eb97c55f55181ee3d9dc25b71ddf897160a61c1b3` |
| `cross-channel-integration` | 1796 × 1080 · 188.166667 s | 44,290,953 · `dfd7ff4dd1b8a2ab37b5c34b9e3edbba1fb25b0f5fa51ea1a9243d462366e9f4` | 5.0 s | 129,570 · `c7503f66fb6281f6be47d1cb216a68c25ad578ad3ad20b2be33cc213bfaeaee1` |
| `genomics-permissions` | 1920 × 1010 · 83.133333 s | 1,530,666 · `9daec3f9e7981b4c15d33f40cba1fd6551520317e4380d221c62f82ffc34eb80` | 5.0 s | 37,156 · `3ed70c753deaffbcf5be05c61c9e33cabd3f5293f4a51275276ab79537a4bb85` |
| `genomics-responsive-interface` | 1920 × 980 · 68.533333 s | 9,435,056 · `9b82cb12f06556c50889b98f3a4d05bb9f295e6a8adab7bc3e01f02653df6111` | 5.0 s | 73,268 · `c32a11494cd1de3a59db36959aa77dd3d32ac09211714113e632d241d211b765` |
| `genomics-sequencing-process` | 1920 × 1010 · 121.666667 s | 22,976,172 · `53e63e3f8c2d91002f863fca155303ad3fa6ea540507784b04b93d8a2a663ddf` | 5.0 s | 162,086 · `4109270c75d784c7680a9cd19f7de1b8ec535fce2aeb8643ac75a06a65038133` |
| `genomics-specimen-qa-biomarker` | 1920 × 1010 · 65.966667 s | 2,944,214 · `4c6c223ceb21bec494e3621fc94141fd06925b2a97d621b905807c9b837da4bc` | 33.0 s | 47,182 · `e7faa4f86f29f2a04c0fb83b5188bd049af5bcfcde3726abf4e140dab1ca7b87` |
| `poda-cpg-pharma` | 1796 × 1080 · 425.300000 s | 39,779,005 · `d0e95e77bf85f6c8f4fb6c54bc60d37f209a2e88ae91bbf24d2180896e7cca43` | 5.0 s | 81,298 · `b2044a5541b8a36f3c3b2b14ff3dd046998f6ef294de7b3fa3a4f7030fb5554b` |
| `strategy-canvas-product-leadership` | 1796 × 1080 · 354.566667 s | 26,054,108 · `fbc7dc14713f998fef06da8b12626a03196ba3d0abc110f22ddc213d2146ae7e` | 177.0 s | 137,392 · `3d3482edca79da39a419ea549b9051dc77dce769ea5a6d87b3ff9886d178bb9e` |
| `threadkeeping-cpg-pharma` | 1796 × 1080 · 239.400000 s | 22,039,412 · `3227648cf675aa6bfb345b23c676babf3229df53088bcf704366e653ceb94aae` | 5.0 s | 116,440 · `e828e1b15d6aa827f03e6af0ea567348c3d0a595a7d4daee84b446f1b9ca1940` |

FFmpeg 9.0.2 decoded each selected frame. `cwebp` 1.6.0 encoded every
poster at quality 82 with metadata omitted. `webpinfo` reports one lossy VP8
payload per poster, with alpha and animation absent.

## Preparation decision

Ten sources entered the ordinary encode branch because their source geometry
exceeded the 1920 × 1080 delivery boundary. The conversational-assistant source
carried an edit list, negative leading packet timestamps, and one longer
terminal packet. Its visible sequence decoded to 4,849 frames over 161.644987
seconds.

That member received an explicit 30-fps normalization rather than a silent
exception in the general preparer. The accepted movie contains 4,851 frames
over 161.700000 seconds: the extra frames preserve the source's longer terminal
hold. Source and accepted end-state inspection show the same interface state,
and the duration delta is 0.055013 seconds. This source-specific decision keeps
the general variable-frame-rate hold intact for future media whose timing may
carry different meaning.

## Publication and transport acceptance

The operator first proved all 22 versioned keys absent. Wrangler then published
one movie and one poster per family with the declared media type, Standard
storage, and `public, max-age=31536000, immutable` cache policy. Wrangler's
object command supplies no create-only precondition, so this exercise used one
serialized writer and an unused version family.

Immediately after publication, every object was downloaded to a fresh temporary
coordinate and compared byte for byte with its accepted local carrier. All 22
comparisons matched.

The public same-origin verifier then exercised every family. Each movie passed
HEAD, full GET, exact size and SHA-256, cold byte range, ordinary range,
unsatisfiable range, conditional request, immutable-cache, ETag, content type,
content-encoding, and hardening checks. Each poster passed exact size, digest,
media type, cache, ETag, and hardening checks. The public receipts omit URLs,
raw headers, response bodies, account details, and local coordinates.

## Visitor handoff

Every source has zero audio streams, so each receiving page owns a visible ordered sequence
instead of an empty captions file. The receiving page also owns the media's
plain-language standing, semantic placement, caption, accessible name, native
controls, responsive containment, and direct-open fallback.

A deterministic Playwright contract exercises all eleven receivers at 390,
1024, and 1440 CSS pixels. A passive poster fixture keeps the check independent
of public-network state while it observes the requested poster route, native
controls, intrinsic geometry, accessible relationships, visible sequence, and
page-level containment. The first run found one demonstration nested inside a
two-column reading flow; making that complete demonstration span the reading
columns restored containment. Exact accepted-byte playback remains a separate
deployed-page and physical-device receiver.

The historical menu-bottleneck capture remains distinct from the 2026 proxy
families. Its page-level standing identifies it as a historical public-website
capture used to make the navigation bottleneck visible. The sequence stays on
public pages and ends when the Member Sign In page appears.

## Decision-changing observations

- A batch adds cardinality and resume behavior while each movie remains the
  unit of semantic, accessibility, and publication acceptance.
- Two source files can share a basename while carrying different architectural
  meaning. Human-reviewed semantic identities prevent key collisions.
- A poster is a visitor-orientation decision derived from accepted movie bytes,
  rather than an arbitrary first frame.
- Wrangler supports the requested bounded single-writer route. Concurrent
  publication should use an atomic conditional-write API.
- Variable-rate timing remains a hold until one explicit source-specific
  decision explains what the accepted cadence preserves.
- Transport acceptance and visitor acceptance answer different questions. The
  route can be correct while page meaning, reading order, or responsive behavior
  still awaits review.

## Remaining release receivers

The versioned R2 carriers and live Worker transport are accepted. Visitor-source
integration is a review candidate, and the deterministic local browser receiver
is observed across narrow, medium, and wide viewports. Deployed-page playback,
physical Safari/iOS observation, print reading, and human page release remain
separate receivers recorded in the video-publication manifest.

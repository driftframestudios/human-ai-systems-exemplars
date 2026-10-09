---
name: cloudflare-r2-progressive-video-delivery
description: Publishes reviewed progressive video packages from R2 through a narrowly routed same-origin Cloudflare Worker and CDN cache. Applies when a versioned public video needs R2 object metadata, exact route grammar, immutable caching, range verification, native playback, and a later Stream migration seam.
---

# Cloudflare R2 progressive-video delivery

## Contract

- **What:** A reviewed video package receives versioned R2 keys, an exact
  same-origin Worker route, immutable Workers Caching, native playback, and
  live receiver observations.
- **When:** A selected public video needs progressive delivery through a
  human-approved same-origin host and versioned route namespace while adaptive
  Stream delivery remains a later option.
- **Boundaries:** R2 owns stored production bytes. The Worker owns read-only
  path translation and response metadata. Cloudflare's cache owns distributed
  copies. The repository owns preparation, semantics, companions, code, and
  tests. The human operator owns subscription, billing, credentials, upload,
  route activation, rights, and public release.
- **Result:** Versioned R2 objects treated as immutable by the publication
  policy, a tested public route, verified complete and byte-range responses,
  accessible native playback, a public-safe return, and an R2 rollback
  coordinate for later Stream migration.

## Rules

### Rule: Cloudflare-hosted bytes enter the CDN

Use R2 Standard for production video bytes. The orange-cloud cPanel origin
retains source or recovery standing rather than CDN video ownership. Recheck
current Cloudflare terms, plan limits, R2 subscription, Workers allowance, and
billing authority at activation.

### Rule: One exact grammar exposes passive carriers

Select one public prefix and publish only:

```text
/<versioned-media-prefix>/<semantic-id>/v<major>.<minor>.<patch>/<accepted-carrier>
```

Map that route to one versioned object prefix in a dedicated bucket. Accepted
carriers are the MP4 master, raster poster, and the WebVTT captions or timed
descriptions selected for that source. Readable transcript or silent visual
sequence HTML stays with the visitor page. Query variants, ambiguous encoding,
neighboring paths, and active media types remain outside the route. A bounded
lowercase filename token maps to a human-reviewed BCP 47 language value in the
page's `srclang`.

### Rule: Complete Worker responses enable cached ranges

Place an uncached default gateway before a named cached media entrypoint. The
gateway validates host, scheme, port, method, raw path, query standing, and
carrier grammar on every request, then forwards a canonical public request with
only `Range`, `If-Range`, and `If-None-Match`. Caller-specific and cache-bypass
headers stay outside the shared cache. Evaluate `If-None-Match` against the
strong stored R2 ETag on a cold handler read; let Workers Caching own warm-hit
validators, `If-Range`, and range slicing. Stop `If-Match` and
`If-Unmodified-Since` before cache dispatch and object access because Workers
Caching documents a narrower warm-hit condition set.
This preserves request-sensitive decisions because Workers Cache keys omit the
host. Return one complete `200` object from the named entrypoint with exact
type, length, strong quoted R2 ETag, `Accept-Ranges`, immutable cache policy,
and public hardening headers. Workers Caching owns edge storage and range
slicing. Partial-response assembly stays outside the Worker code path.

### Rule: Versioned objects move forward

Write a new versioned key for changed bytes or HTTP metadata. Use a conditional
write whose absent-key precondition makes replacement impossible. Retain the
prior page pointer and accepted object family through the observation window.
Deletes require an explicit cache and recovery decision.

### Rule: Same-origin native playback minimizes capabilities

Use native HTML controls, a same-origin MP4 and any selected VTT carriers,
visitor-initiated playback, stable geometry, poster, the applicable accessible
companions, and a fallback download. Audio-bearing media carries reviewed
captions for speech and meaningful sound plus a nearby transcript. Verified
silent video carries explicit silent standing and a visible ordered visual
sequence while leaving an empty captions carrier outside the family. Player
libraries, iframe capabilities, cross-origin grants, autoplay, and adaptive
manifests enter with a selected behavior.

### Rule: Development exposure stays temporary and distinct

Use an `r2.dev` public development URL only when a direct-object observation
materially helps before route activation. Enable it after the dedicated bucket
contains only reviewed public candidates; compare the exact key, type, size,
and digest; then disable it. Production markup retains the selected same-origin
route, and the development hostname stays unaliased. This observation
establishes direct-object retrieval only; the selected route separately
establishes Worker grammar, hardening, cache, range-slicing, WAF, and
access-control behavior.

## Operating sequence

1. Receive the completed `accessible-video-publication` packet.
2. Confirm R2 Standard, Workers, billing, route, and bucket activation
   authority with the human operator.
3. Reserve a unique semantic ID and asset version; verify object keys and
   media types before upload.
4. Upload accepted master and companions with exact HTTP metadata and an
   absent-key precondition. Compare uploaded size and digest with the packet.
5. Build and dry-run the narrow Worker; keep account IDs and credentials in
   the protected platform store.
6. Confirm the bucket has no custom domain or CORS policy, any temporary
   `r2.dev` URL is disabled, and both `workers.dev` and Worker Version URLs are
   disabled. Review Worker route, Transform Rule, Cache Rule, and
   origin-rewrite precedence for the selected namespace; treat those as
   neighboring controls rather than Workers Cache purge controls.
7. Activate the exact selected route through the human-owned Cloudflare
   workflow and set its route mode to Fail closed.
8. Use one fresh version for `HEAD`, complete `GET`, validators, and digest.
   Use a second fresh version whose first public video request is the valid
   range canary, then observe the complete object and unsatisfiable range.
   Bind every selected companion to its expected size and digest.
9. Activate native visitor markup independently from object upload.
10. Observe signed-out Chromium, Firefox, and consequential Safari/iOS
   playback, keyboard operation, the applicable caption-and-transcript or
   silent-sequence branch, interruption, layout, and recovery.
11. Return public-safe coordinates and retain protected platform diagnostics
    with the operator.

Before the first release, exercise withdrawal with a disposable family:
remove its visitor reference, remove or quarantine the R2 object, deploy a new
Worker version to full traffic, withhold rollback to the version that cached
the withdrawn bytes, and verify the former public route fails. Zone-cache
purges do not clear Workers Caching. A future `ctx.cache.purge()` integration
requires a human-authorized private invocation route; the public media grammar
remains read-only.

## Held and redirected routes

- Missing subscription or billing authority completes local preparation and
  holds upload and activation.
- An object above the current self-serve 512 MB (512,000,000-byte) cache
  ceiling returns to size reduction, Stream, or an explicitly selected higher
  service tier.
- A poster or WebVTT companion above the selected 32 MiB (33,554,432-byte)
  boundary returns to companion preparation before upload.
- Gated media returns to a named authorization design; CORS does not provide
  access control.
- A digest, type, cache, or range mismatch receives a new versioned object
  after repair.
- An interrupted or unknown write first reads the exact key. Matching bytes
  complete the operation, a missing key permits the same conditional write,
  and different bytes preserve the key while a new version is selected.
- A useful direct-object check may use a short-lived human-enabled `r2.dev`
  endpoint; rate limits and missing edge controls keep it outside production
  standing.
- Incomplete poster or accessibility-companion standing holds page activation
  while the accepted master remains recoverable. The applicable branch is
  captions plus transcript for audio-bearing media, or explicit silent-source
  standing plus a visible visual sequence for verified silent video.

## Conditional context

Load
[`cloudflare-r2-progressive-video-guidance.v0.1.md`](../../cloudflare-r2-progressive-video-guidance.v0.1.md)
and
[`r2-progressive-video-publication.v0.1.md`](../../runbooks/r2-progressive-video-publication.v0.1.md)
for the first exercise and whenever route, cache, source, accessibility, or
receiver behavior changes.

## Completion

The candidate settles after repeated source-to-public exercises confirm the
same route grammar, preparation handoff, range/cache behavior, accessibility
companions selected for each source, browser acceptance, human activation
boundary, and recovery path.
Only then does the existing public skill-selection process receive a promotion
candidate.

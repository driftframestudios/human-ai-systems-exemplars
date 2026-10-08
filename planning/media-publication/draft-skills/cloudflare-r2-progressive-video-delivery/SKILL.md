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
carriers are the MP4 master, raster poster, captions, and optional timed descriptions.
Readable transcript HTML stays with the visitor page. Query variants,
ambiguous encoding, neighboring paths, and active media types remain outside
the route. A bounded lowercase filename token maps to a human-reviewed BCP 47
language value in the page's `srclang`.

### Rule: Complete Worker responses enable cached ranges

Return one complete `200` object with exact type, length, strong quoted R2
ETag, `Accept-Ranges`, immutable cache policy, and public hardening headers.
Workers Caching owns edge storage and range slicing. The Worker keeps partial
response assembly outside its code path.

### Rule: Versioned objects move forward

Write a new versioned key for changed bytes or HTTP metadata. Retain the prior
page pointer and accepted object family through the observation window.
Overwrites and deletes require an explicit cache and recovery decision.

### Rule: Same-origin native playback minimizes capabilities

Use native HTML controls, a same-origin MP4 and VTT route, visitor-initiated
playback, stable geometry, poster, captions, nearby transcript, and fallback
download. This branch uses the browser's native player and keeps the capability
set to same-origin MP4/VTT, controls, poster, transcript, and fallback download.
Player libraries, iframe capabilities, cross-origin grants, autoplay, and
adaptive manifests enter with a selected behavior.

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
4. Upload accepted master and companions with exact HTTP metadata and compare
   uploaded size and digest with the packet.
5. Build and dry-run the narrow Worker; keep account IDs and credentials in
   the protected platform store.
6. Confirm the bucket has no custom domain or CORS policy, any temporary
   `r2.dev` URL is disabled, and both `workers.dev` and Worker Version URLs are
   disabled. Review Worker route, Transform Rule, Cache Rule, and
   origin-rewrite precedence for the selected namespace; treat those as
   neighboring controls rather than Workers Cache purge controls.
7. Activate the exact selected route through the human-owned Cloudflare
   workflow and set its route mode to Fail closed.
8. Use fresh versioned objects to observe cold `HEAD`, complete `GET`, valid
   and unsatisfiable ranges, validators,
   types, cache policy, hardening, missing paths, and neighboring paths.
9. Activate native visitor markup independently from object upload.
10. Observe signed-out Chromium, Firefox, and consequential Safari/iOS
   playback, keyboard operation, captions, transcript, interruption, layout,
   and recovery.
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
- An object above the current self-serve 512 MB cache ceiling returns to size
  reduction, Stream, or an explicitly selected higher service tier.
- Gated media returns to a named authorization design; CORS does not provide
  access control.
- A digest, type, cache, or range mismatch receives a new versioned object
  after repair.
- A useful direct-object check may use a short-lived human-enabled `r2.dev`
  endpoint; rate limits and missing edge controls keep it outside production
  standing.
- Incomplete captions, transcript, poster, or visual-description standing
  holds page activation while the accepted master remains recoverable.

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
companions, browser acceptance, human activation boundary, and recovery path.
Only then does the existing public skill-selection process receive a promotion
candidate.

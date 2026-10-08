---
name: accessible-video-publication
description: Prepares source-owned, accessible public video packages before a delivery provider takes ownership. Applies when a selected visitor video needs remux-or-encode routing, metadata and rights boundaries, captions, transcript, poster, a page-integration contract, and browser acceptance.
---

# Accessible video publication

## Contract

- **What:** One exact source becomes one reviewed master, companion set, page
  contract, and recoverable publication packet.
- **When:** A public visitor route selects synchronized video, video-only media,
  or a media alternative and needs a delivery-ready source package.
- **Boundaries:** The human publication owner selects visible content, rights,
  consent, attribution, accessibility standing, and activation. Provider
  adapters own storage, delivery, access, and live-route observations.
- **Result:** A revision-bound master and digest; explicit remux or encode
  rationale; bounded metadata and secret-material results; reviewed poster,
  captions, transcript, and description decision; a page-integration contract;
  and a delivery-neutral recovery packet.

## Rules

### Rule: Inspect before transforming

Read container, streams, duration, geometry, cadence, color, rotation, audio,
subtitles, chapters, data, attachments, metadata, and strict decode health.
Bind the source revision, public role, audience, language, page placement, and
receiving Issue before creating a derivative.

### Rule: Remux before re-encoding a fitting source

Copy-remux an already compatible H.264/AAC source when Fast Start, explicit
stream selection, or metadata disposition is the remaining job. Compare
elementary-stream packet hashes after remux. Encode once when codec, pixel
format, geometry, cadence, color, or audio creates a demonstrated delivery
need. Preserve source cadence, aspect ratio, source-or-smaller dimensions, and
meaningful audio.

HDR, interlacing, multiple audio programs, multichannel audio, meaningful
embedded subtitles, data tracks, attachments, and consequential variable
cadence return to a named source-specific branch.

### Rule: Publication boundaries stay distinct

Run the canary-proven credential scanner on the exact candidate. Inspect
format-specific metadata with `ffprobe` and a fitting additional reader. Route
visible people, organizations, third-party content, rights, and consent to the
human owner. Public receipts carry classes, counts, disposition, and limits;
authorized local review retains raw values.

### Rule: Accessibility companions travel with the meaning

Use reviewed WebVTT captions for speech and meaningful sound. Place a
descriptive transcript near playback so meaningful audio and visuals remain
readable. Select audio description or a conforming media alternative when
visual information requires it. Use a meaningful poster and reserve intrinsic
geometry.

### Rule: Page integration follows the selected adapter

The progressive adapter uses `<video controls playsinline
preload="metadata">`, a typed source, labeled tracks, a useful fallback link,
and nearby explanatory prose. An adaptive provider selects and validates its
applicable player. Every adapter preserves visitor control, captions,
transcript access, fallback and recovery behavior, and one stable receiver
contract. Visitor action starts meaningful playback.

## Operating sequence

1. Bind source, revision, semantic ID, visitor job, audience, Issue, and human
   activation owner.
2. Establish rights, attribution, visible-content, consent, and accessibility
   standing.
3. Inspect streams, metadata classes, and strict decode health.
4. Select copy remux, ordinary encode, or an explicit source-specific branch.
5. Write to a temporary sibling path and promote to an unused versioned
   destination only after local acceptance. Preserve an existing target.
6. Verify decode, Fast Start, streams, duration, synchronization, geometry,
   cadence, color, audio, metadata disposition, digest, and perceptual quality.
7. Review poster, captions, transcript, description standing, page
   integration, and text alternative.
8. Form the delivery-neutral packet and hand it to one selected provider
   adapter.
9. Observe the final signed-out page and preserve the preceding page pointer
   as the independent recovery coordinate.

## Conditional context

Load
[`cloudflare-r2-progressive-video-guidance.v0.1.md`](../../cloudflare-r2-progressive-video-guidance.v0.1.md)
for the current R2-backed route. Load
[`ffmpeg-cloudflare-stream-guidance.v0.1.md`](../../ffmpeg-cloudflare-stream-guidance.v0.1.md)
when the selected receiver is Cloudflare Stream.

Compose with the repository's `secret-boundary-inspection` skill whenever a
selected media closure approaches public release.

## Completion

The source package completes when the accepted master and companions preserve
the selected meaning, all distinct publication decisions have owners, local
technical and accessibility observations pass, the provider handoff is
unambiguous, and recovery remains available.

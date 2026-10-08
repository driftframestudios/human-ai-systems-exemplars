---
name: cloudflare-stream-video-publication
description: Prepares and verifies accessible on-demand video for human-authorized publication through Cloudflare Stream. Applies when a public visitor route selects video and needs FFmpeg source preparation, metadata boundaries, captions, playback policy, and signed-out verification.
---

# Cloudflare Stream video publication

## Contract

- **What:** One inspected upload master, accessible companion set, Stream
  receiver configuration, minimal embed capability posture, and public playback
  observation.
- **When:** A Context Canvas or related public visitor route selects an
  on-demand video for Cloudflare Stream delivery.
- **Boundaries:** The human author selects visible content, rights, activation,
  access policy, and protected Cloudflare operations. Cloudflare Stream owns
  adaptive transcoding and manifests. The repository owns source preparation,
  semantic asset identity, accessibility companions, visitor markup, and
  public-route checks.
- **Result:** A source-revision-bound MP4 master with a digest; a scope-bound
  credential result and named format/tool metadata disposition; reviewed
  captions, transcript, and poster;
  an accepted Stream identity and origin policy; and signed-out playback and
  recovery evidence.

## Rules

### Rule: One upload master enters Stream

FFmpeg produces one high-quality H.264/AAC MP4 upload master. Stream produces
adaptive HLS and DASH delivery. Local multivariant packaging enters only under
a separately selected self-hosted receiver.

### Rule: Recorded cadence and source geometry lead

The encode preserves source frame rate, display aspect ratio, and
source-or-smaller dimensions. Even output dimensions, square pixels,
progressive scan, `yuv420p`, and Fast Start support broad ingest behavior.

### Rule: Audio receives an explicit branch

Audio-bearing sources retain reviewed mono or stereo AAC and a fitting 44.1 or
48 kHz rate. Video-only sources select the explicit video-only branch. Loudness,
language, multiple tracks, and synchronization receive source-specific checks.

### Rule: Public bytes carry reviewed metadata

Explicit stream maps select the intended video and optional audio. Automatic
metadata and chapter copying stay disabled while the reviewed public metadata
allowlist leads. Format-aware preflight and
post-encode inspection observe location, device, author, date, title, comment,
timecode, artwork, attachments, subtitles, and container residue.

### Rule: Accessibility companions belong to the source

Reviewed WebVTT captions and a nearby descriptive transcript carry speech,
meaningful sound, and meaningful visual information. A poster and stable
intrinsic geometry support comprehension before playback.

### Rule: Browser capability follows selected behavior

Controls and visitor-initiated playback form the default. Permissions Policy and iframe
sandbox tokens enter only after a focused Stream-player check establishes a
selected behavior. Dynamic manifests remain direct Stream resources.

## Operating sequence

1. Bind exact source, public role, visitor page, Issue, rights standing, and
   human activation owner.
2. Inspect source streams, geometry, cadence, color, audio, subtitles,
   chapters, metadata, decode health, and accessibility needs.
3. Run the repository secret-material check and distinct embedded-metadata
   observation.
4. Select the smallest fitting FFmpeg profile and encode to a temporary path.
   HDR-to-SDR delivery, frame rates above Stream's 90 fps ceiling, variable
   cadence, and multichannel audio receive explicit public-output branches.
5. Verify strict zero-error decode, duration, synchronization, geometry, frame rate,
   video/audio profile, metadata disposition, visual quality, audio clarity,
   and digest.
6. Add the accepted master, reviewed primary poster, captions, transcript,
   semantic inventory record, and production selection through the source
   owners.
7. The human Cloudflare operator selects the access/origin policy, uploads the
   accepted master, and adds reviewed captions.
8. Stream processes the upload. The collaboration accepts the full adaptive set
   at `readyToStream: true`, `status.state: ready`, and
   `status.pctComplete: 100`, then inspects playback and poster behavior.
9. Embed with a title, stable geometry, controls, fitting lazy loading, direct
   manifests, and the smallest tested capability set.
10. Observe signed-out playback, keyboard operation, captions, transcript,
    seeking, audio, narrow/wide containment, interruption, and recovery.
11. Return a public-safe coordinate and retain private diagnostics, tokens,
    source paths, and metadata values with authorized owners.

## Conditional context

Load
[`ffmpeg-cloudflare-stream-guidance.v0.1.md`](../../ffmpeg-cloudflare-stream-guidance.v0.1.md)
for the first exercise and whenever source cadence, multiple tracks, audio,
metadata, or player capability changes the encode or publication route.

## Completion

The skill candidate settles after at least one source-to-public exercise
reduces repeated decisions, preserves the human activation boundary, and
produces accessible Stream playback with recoverable source and bounded public
evidence.

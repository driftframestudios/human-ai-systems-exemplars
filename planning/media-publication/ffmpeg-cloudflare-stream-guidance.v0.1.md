---
title: FFmpeg source preparation and Cloudflare Stream publication
version: 0.1.0
status: working-draft
audience: ai_collaborators
source_band: public_possible
task_type: media_publication_guidance
---

# FFmpeg source preparation and Cloudflare Stream publication

## Sequence standing

The selected first public route uses an accepted progressive MP4 from R2 behind
the same-origin `/v1-cdn/video/` Worker. This document remains the adaptive
delivery guide for a later Cloudflare Stream migration. The accepted semantic
identity, ingest master, poster, selected accessibility companions, and R2
rollback family enter that migration together.

## Intended result

One exact source produces one inspected, metadata-bounded MP4 upload master.
Cloudflare Stream receives the upload master and produces adaptive HLS and DASH
delivery. The visitor route supplies controls, a poster, a stable layout box,
the source-fitting caption-and-transcript or silent-sequence branch, and the
smallest tested browser capability set.

## Delivery decision

Cloudflare Stream already uploads, transcodes, stores, and delivers multiple
adaptive-bitrate representations. A local four-rendition HLS/DASH ladder would
duplicate Stream's work, enlarge the review surface, and introduce another
packaging and cache owner. Local FFmpeg work therefore prepares one high-quality
upload master for the selected Stream route.

A self-hosted HLS/CMAF branch remains available for a future receiver with a
demonstrated need. The self-hosted branch brings a dedicated ladder, aligned random-access
points, segment and manifest validation, MIME configuration, cache policy,
atomic publication, and player observations. The later Stream migration uses
the smaller Stream-owned adaptive route after a measured playback, traffic,
device, or access need earns it.

## Copy-remux branch

An already compatible H.264/AAC source keeps its elementary streams. The copy
remux selects the intended first video and optional first audio stream, applies
the reviewed metadata and chapter policy, and writes Fast Start:

```sh
ffmpeg -hide_banner -nostdin \
  -i "<SOURCE_MEDIA>" \
  -map 0:v:0 \
  -map '0:a:0?' \
  -map_metadata -1 \
  -map_metadata:s -1 \
  -map_chapters -1 \
  -c copy \
  -movflags +faststart \
  "<TEMPORARY_OUTPUT>.mp4"
```

Verify strict decode, duration, selected streams, `moov` before `mdat`, and
matching video/audio packet hashes before promotion. FFmpeg may write a
structural muxer `encoder` tag even when authored metadata is cleared. Record
that structural tag separately from the reviewed authored-metadata allowlist.

## Current Cloudflare Stream ingest profile

| Property | Working profile | Reason |
| --- | --- | --- |
| Container | MP4 with `moov` atom at the front | Current Cloudflare upload recommendation and progressive start behavior |
| Video | H.264 High profile, progressive, `yuv420p` | Broad Stream ingest and playback compatibility |
| Frame rate | Preserve the recorded frame rate | Current Stream guidance requests source-rate upload; forced 24 fps can add cadence defects |
| Geometry | Preserve display aspect ratio, square pixels, even output dimensions, and source-or-smaller resolution | Stable geometry, encoder compatibility, and source-derived detail |
| Audio | AAC-LC, mono or stereo; preserve a suitable 44.1 kHz or 48 kHz source, with 48 kHz as the new-master default when resampling is required | The repository working profile accepts both common source rates; predictable channel and sample-rate handling aids validation |
| Random access | Preserve source-appropriate on-demand keyframe structure and verify seeking | Current Stream pages differ: the FAQ recommends closed GOP for newly produced uploads, while the upload overview marks closed GOP as required only for live. Fixed `-g 96` only matches four seconds at 24 fps. |
| Metadata | Explicit stream selection, reviewed public metadata allowlist, selected chapters only, and post-encode format-aware inspection | Public bytes carry intended media and reviewed public metadata |
| Accessibility | A meaningful poster, visitor controls, stable dimensions, and either reviewed WebVTT captions plus a nearby descriptive transcript or explicit silent standing plus a visible ordered visual sequence | Audio, speech, meaningful sound, and meaningful visuals remain available across access needs |

Cloudflare currently recommends H.264 video, AAC audio, an MP4 container,
progressive scan, Fast Start, mono or stereo audio, and source-rate upload for
new on-demand files. Current bitrate examples are initial targets rather than a
universal ladder: 8 Mbps at 1080p, 4.8 Mbps at 720p, 2.4 Mbps at 480p, and
1 Mbps at 360p. Source complexity, frame rate, visual fidelity, and output
geometry still determine the fitting master profile.

## Source inspection

The exact private source path, intended public role, visible-content decision,
rights standing, and receiving Issue form the publication boundary before an
encode begins.

```sh
ffprobe -v error \
  -show_format \
  -show_streams \
  -show_chapters \
  -of json \
  "<SOURCE_MEDIA>"

ffmpeg -hide_banner -nostdin \
  -v error \
  -xerror \
  -max_error_rate 0 \
  -i "<SOURCE_MEDIA>" \
  -map 0:v:0 \
  -map '0:a:0?' \
  -f null -
```

The inspection records aggregate standing in public receipts while raw
sensitive values remain with the authorized source owner:

- container, duration, start time, bitrate, and stream count;
- video codec, profile, pixel format, color fields, coded and display geometry,
  sample aspect ratio, frame rate, rotation, and time base;
- audio codec, channel layout, sample rate, bitrate, duration, and language;
- subtitle, data, attachment, chapter, timecode, title, comment, encoder,
  location, author, device, and date fields; and
- decode warnings or source corruption.

`ffprobe` supplies a useful container and stream reading. ExifTool or another
format-aware reader adds coverage for QuickTime atoms, GPS families, embedded
artwork, and vendor-specific metadata when available. A scope-bound credential
result and a named format/tool metadata disposition establish separate claims.

## Encoding template

Source inspection selects the final width ceiling, video rate or quality
target, buffer, audio branch, and temporary output. The template preserves
source frame rate and keeps output at source-or-smaller dimensions.

```sh
ffmpeg -hide_banner -nostdin \
  -i "<SOURCE_MEDIA>" \
  -map 0:v:0 \
  -map '0:a:0?' \
  -map_metadata -1 \
  -map_chapters -1 \
  -vf "scale=w='max(2,trunc(min(min(<MAX_WIDTH>,iw),min(<MAX_HEIGHT>,ih)*dar)/2)*2)':h='max(2,trunc(min(min(<MAX_HEIGHT>,ih),min(<MAX_WIDTH>,iw)/dar)/2)*2)',setsar=1" \
  -c:v libx264 \
  -profile:v high \
  -pix_fmt yuv420p \
  -preset slow \
  -crf <CRF> \
  -maxrate <MAX_VIDEO_RATE> \
  -bufsize <VIDEO_BUFFER> \
  -c:a aac \
  -b:a <AUDIO_RATE> \
  -ar <AUDIO_SAMPLE_RATE> \
  -ac:a <AUDIO_CHANNELS_1_OR_2> \
  -movflags +faststart \
  "<TEMPORARY_OUTPUT>.mp4"
```

A video-only source uses `-an` and selects the video settings only. A mono
source can remain mono. A reviewed stereo master can
remain stereo. A multichannel source receives an explicit mono/stereo fold-down
matrix and listening check. Upmixing and loudness normalization likewise
require a source-specific reason, measured target, and listening check.

The template preserves the recorded cadence. A source with variable frame
rate, interlacing, rotation metadata, multiple audio tracks, or meaningful
embedded captions receives a source-specific branch before the first encode.
Stream delivers HDR uploads as SDR and caps encoded playback at 90 fps. HDR,
frame rates above 90 fps, and variable-frame-rate sources therefore receive an
explicit public-output expectation and visual review before upload.

## Output verification

The temporary output enters the same inspection path as the source.

```sh
ffprobe -v error \
  -show_format \
  -show_streams \
  -show_chapters \
  -of json \
  "<TEMPORARY_OUTPUT>.mp4"

ffmpeg -hide_banner -nostdin \
  -v error \
  -xerror \
  -max_error_rate 0 \
  -i "<TEMPORARY_OUTPUT>.mp4" \
  -map 0:v:0 \
  -map '0:a:0?' \
  -f null -
```

Acceptance compares source intent with output behavior:

- complete decode with a zero exit status;
- preserved duration and audible/visible synchronization within a named
  tolerance;
- source-rate frame cadence or a separately justified conversion;
- source-or-smaller geometry, preserved display aspect ratio, even dimensions,
  and square pixels;
- expected H.264/AAC profile, pixel format, audio layout, and sample rate;
- intended first video and optional first audio stream only;
- reviewed disposition or allowlisting of chapters, attachments, data tracks,
  subtitles, title, author, device, location, source path, and timestamps;
- retained color behavior, text legibility, motion quality, and audio clarity;
  and
- a digest bound to the accepted upload master.

Duration, timestamps, switching boundaries, decode integrity, and perceptual
synchronization establish synchronization for a locally packaged ladder.
Equal decoded frame counts remain a narrower diagnostic rather than the
acceptance claim.

## Publication sequence

1. Bind the exact source, intended visitor page, public role, receiving Issue,
   and human activation owner.
2. Run the repository secret-material inspection and the distinct format-aware
   metadata observation on the source candidate.
3. Inspect streams and select a copy remux when existing streams fit; otherwise
   select the smallest fitting encode profile.
4. Remux or encode to a temporary path. The authorized source owner retains the private
   original; the public repository receives the reviewed master selected for
   the visitor job.
5. Verify decoding, geometry, frame rate, audio, synchronization, metadata,
   visual quality, and digest.
6. Add the accepted master, poster, and selected accessibility companions
   through the repository's semantic asset and production-selection owners.
7. Upload the accepted master to Cloudflare Stream through an authorized human
   operator. API tokens remain in the protected platform store.
8. The authorized human operator sets the selected access posture and exact
   allowed playback origins.
9. Wait for `readyToStream: true`, `status.state: ready`, and
   `status.pctComplete: 100` before accepting the complete adaptive set. The
   authorized human operator uploads reviewed WebVTT captions when selected.
   The collaboration inspects the Stream-generated thumbnail, HLS, and DASH
   results. Bind the reviewed repository poster through the Stream player's
   `poster` option and verify the exact public URL; the generated thumbnail
   remains the platform fallback.
10. Embed the Stream player with a descriptive title, stable aspect ratio,
    visitor controls, `loading="lazy"` for a below-fold placement, and the
    smallest tested Permissions Policy and sandbox capability set.
11. Read Stream manifests directly from Stream. Stream remains the live owner
    of dynamic manifests; repository artifacts carry the stable semantic and
    recovery coordinates.
12. Observe signed-out playback at representative narrow, tablet, desktop, and
    wide viewports; include keyboard operation, poster behavior, seeking,
    fullscreen when selected, reduced-motion posture, network interruption,
    recovery, and the applicable audio-bearing or verified-silent
    accessibility branch.
13. Record a public-safe receipt with source revision, public asset identity,
    accepted digest, accessibility carriers, route result, and evidence limits.

## Player capability posture

The built-in Stream player is the smallest engineering path for adaptive HLS
and DASH in the current dependency-free visitor system. The first canary begins
with controls, a title, fixed intrinsic geometry, and visitor-initiated playback. Gyroscope,
accelerometer, autoplay, and encrypted-media permissions enter only when a
selected visitor behavior requires and verifies each capability. Fullscreen
and picture-in-picture remain separately selectable. A restrictive iframe
sandbox starts from the smallest Stream-compatible set established by a focused
browser check rather than from a generic embed snippet. The source-owned CSP
admits the exact Stream account host through `frame-src` for the built-in
player; an own-player branch admits only the selected manifest, media, and
image hosts through the matching `connect-src`, `media-src`, and `img-src`
directives.

## Assessment of the task-context FFmpeg draft

The assessed source remains authorized task-context material. Each row names
the distinctive claim or pattern so a cold-start collaborator can understand
the resulting disposition from the public-possible guidance alone.

| Draft claim or pattern | Current disposition |
| --- | --- |
| HLS with CMAF is the universal 2026 default | Receiver-specific. Cloudflare Stream performs HLS/DASH encoding and delivery for the selected route; local CMAF packaging adds a duplicate owner. |
| CMAF cuts storage by 50 percent | Unsupported as a general figure. Shared segments can reduce duplication in some dual-manifest architectures; actual storage depends on codecs, rendition sets, audio, subtitles, packaging, and receiver behavior. |
| H.264 plus AAC is the broad baseline | Retained for the Stream upload master. |
| Fixed 1080/720/480/360 ladder and fixed bitrates | Replaced by one inspected upload master for Stream. Cloudflare's published rates remain initial encode targets for newly produced media. |
| Every source should become 24 fps | Replaced by recorded-frame-rate preservation. |
| Every source should become 44.1 kHz stereo | Replaced by reviewed mono/stereo handling and suitable 44.1/48 kHz source preservation or deliberate resampling. |
| Four-second aligned keyframes with `-g 96` fit every source | Replaced by time- and source-aware random-access decisions. Frame count 96 represents four seconds only at 24 fps. |
| Explicit width and height scaling is sufficient | Replaced by aspect-preserving, even-dimension, source-or-smaller scaling. |
| Multiple mappings create multiple ABR representations | Correct for local packaging, while irrelevant to the one-master Stream ingest path. |
| Equal decoded frame counts prove valid AAC/video alignment | Replaced by timestamp, duration, decode, switching-boundary, and perceptual synchronization checks. |
| The supplied Bash loop is production-ready | Replaced. The loop distorts aspect ratio, enlarges small sources, forces cadence, contains invalid `maxrate`/`bufsize` values, obscures FFmpeg exit status behind `grep`, lacks deterministic stream selection, and exposes partial outputs. |
| Local multivariant HLS example is ready for publication | Replaced. A publishable local branch preserves source geometry, assigns one audio owner, supplies a complete CMAF contract, writes transactionally, and validates the whole ladder. |

## Primary references

- [Cloudflare Stream upload guidance](https://developers.cloudflare.com/stream/uploading-videos/)
- [Cloudflare Stream upload recommendations](https://developers.cloudflare.com/stream/faq/#what-are-the-recommended-upload-settings-for-video-uploads)
- [Cloudflare Stream HLS and DASH playback](https://developers.cloudflare.com/stream/viewing-videos/using-own-player/)
- [Cloudflare Stream player](https://developers.cloudflare.com/stream/viewing-videos/using-the-stream-player/)
- [Cloudflare Stream captions](https://developers.cloudflare.com/stream/edit-videos/adding-captions/)
- [Cloudflare Stream processing webhooks](https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/)
- [FFmpeg command documentation](https://ffmpeg.org/ffmpeg.html)
- [FFmpeg format and HLS muxer documentation](https://ffmpeg.org/ffmpeg-formats.html)
- [FFmpeg scale filter documentation](https://ffmpeg.org/ffmpeg-filters.html#scale)
- [ffprobe documentation](https://ffmpeg.org/ffprobe.html)
- [Apple HLS authoring specification](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html)
- [W3C WAI: Making audio and video media accessible](https://www.w3.org/WAI/media/av/)
- [ExifTool metadata removal boundary](https://exiftool.org/faq.html#Q32)

## Re-entry

The first two candidate videos reopen the guidance with exact source probes,
selected visitor placements, source-fitting accessibility standing, and actual
output observations. The first exercise remains command-guided;
decision-changing friction observed across repeated use can earn a public
helper.

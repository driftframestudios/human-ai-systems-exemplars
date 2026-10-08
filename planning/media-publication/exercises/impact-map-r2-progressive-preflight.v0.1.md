---
title: Impact Map R2 progressive-video preparation exercise
version: 0.1.0
status: local-preparation-accepted
audience: ai_collaborators
source_band: public_possible
task_type: skill_exercise
---

# Impact Map R2 progressive-video preparation exercise

## Purpose

This exercise applies the candidate accessible-video and R2 progressive-video
contracts to two repository-owned source carriers. It tests the local byte
preparation path before posters, captions, transcript placement, R2 upload,
Worker activation, and signed-out browser observation receive their own
decisions.

## Coordinate

- source revision: `main@9c1605b10bd19e282fcf7678e89ab6bfced33005`;
- preparation route: `tools/prepare-r2-progressive-video.mjs` on the candidate
  R2 publication branch;
- FFmpeg/FFprobe: local 9.0.2 toolchain;
- secret-shaped metadata scan: Betterleaks 1.8.1 with synthetic-canary proof;
  and
- output boundary: temporary local carriers, excluded from the repository.

## Accepted observations

| Semantic ID | Source coordinate | Source SHA-256 | Source bytes | Duration | Output SHA-256 | Output bytes |
| --- | --- | --- | ---: | ---: | --- | ---: |
| `impact-map-narrative` | `collaboration/impact-map-visual-variants/movie/impact-map-narrative-movie.mp4` | `184a72266d9559e6f119a6e5e827c5778d7c679f327c207bc8df6eb6abb73a30` | 2,949,075 | 40 s | `4dff4f2b0526d764835039c4615283bcb16dc961167256cd9cb71e2f6212af67` | 2,948,902 |
| `impact-map-style-cycle` | `collaboration/impact-map-visual-variants/movie/impact-map-style-cycle-movie.mp4` | `d839f2872c5bb88ddfb9483b1c58e484d4c4db374a918bfec217031453eba0dd` | 19,008,737 | 70 s | `78c7a3280fdca1e113acd0101b1d6f8a1669d48b5cf6a39faafb2facef29619f` | 19,008,617 |

Both sources and outputs strictly decoded. Each output retained one 1920×1080
H.264 High-profile `yuv420p` progressive stream at 30 fps and one AAC-LC
stereo stream at 48 kHz. Duration, cadence, display aspect, geometry, audio,
and synchronization checks passed. The remux placed `moov` before `mdat` and
removed reviewed authored container tags while retaining documented structural
container tags.

The copy-remux packet comparison passed for all selected streams:

- narrative: 1,200 video packets and 1,876 audio packets; and
- style cycle: 2,100 video packets and 3,283 audio packets.

Ordered packet payload hashes and timing matched source. The preparation route
therefore changed container organization and metadata disposition while
preserving the selected encoded video and audio payloads.

## Metadata boundary

The public receipt records metadata keys, classes, tool coverage, and counts.
Source values stayed inside the local scanner boundary. Betterleaks reported a
clean, canary-proven result for the extracted standard metadata values.
FFprobe covered container, stream, chapter, and standard-tag fields.

A separate format-aware reader for vendor atoms, location families, and
embedded artwork remained `not-run` in this environment. Publication preflight
routes that named coverage to a fitting reader before public activation. The
human publication owner retains visible-content, rights, attribution, consent,
poster, captions, transcript, and release decisions.

## Refinement returned to the candidate

The source MP4 files omit an explicit sample-aspect declaration. An initial
conservative branch selected an encode solely because that optional declaration
was absent. The helper now recognizes an omitted declaration as the ordinary
square-pixel container default while continuing to route declared anamorphic
pixels through conversion. A regression test holds both decisions. This keeps
already compatible streams lossless and makes the smallest change that earns
Fast Start and the selected metadata policy.

The exercise also tightened local output authority. The helper now refuses an
existing target and uses an atomic no-clobber promotion after verification, so
a rerun directs changed bytes to a new versioned destination while preserving
an accepted local master.

## Remaining receiver work

The local source-preparation exercise is complete. The publication family
still needs:

1. selected semantic versions and visitor roles;
2. reviewed posters, WebVTT captions, descriptive transcripts, and any timed
   descriptions earned by the content;
3. the format-aware metadata observation named above;
4. exact R2 object uploads and downloaded digest comparisons;
5. optional, short-lived `r2.dev` direct-object observation when useful;
6. same-origin Worker activation with the documented private-bucket, route,
   rule-precedence, cache-isolation, and Fail-closed settings; and
7. fresh-cache HTTP, signed-out browser, accessibility, and recovery
   observations.

The accepted temporary outputs remain local preparation artifacts. Public
activation begins only after the complete carrier packet and human release
decision agree.

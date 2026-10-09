# Native-video poster, visitor frame, and visual sequence

Load this reference after an accepted master has an exact digest and a native
visitor page has been selected. It carries the provider-neutral steps between
accepted bytes and an accessible page receiver. Storage, upload, cache, and
route activation remain with the chosen delivery adapter.

## Inputs and result

The branch receives:

- one digest-bound accepted video master;
- its inspected stream, duration, geometry, and audio standing;
- the intended visitor job and exact receiving page;
- the public carrier grammar selected by the delivery adapter; and
- the human owners of visible-content review and page activation.

The branch returns one reviewed poster derived from that master, one concise
accessible name, one visible transcript or visual sequence, one semantic page
coordinate, and one focused source-and-browser acceptance result. Exact
timestamp, tool, dimensions, media type, byte count, and digest preserve the
poster relationship in a compact lineage coordinate; established source and
human authorities retain ownership decisions.

## Select a meaningful poster from accepted bytes

Begin with a small candidate set whose timestamps sample complete, stable
states. The opening meaningful state, one or two interior task states, and the
closing state usually reveal enough choice. A shot transition, loading field,
blank frame, cursor-obscured label, transient overlay, or motion-blurred state
returns to another timestamp. The selected frame should communicate the
visitor job before playback and remain accurate for the sequence as a whole.

Decode each candidate from the accepted master rather than from an earlier
source, screen capture, browser thumbnail, or cached derivative. This keeps
the poster tied to the exact public sequence. One reproducible command shape
is:

```sh
ffmpeg -i accepted-master.mp4 \
  -ss <seconds> \
  -frames:v 1 \
  -map_metadata -1 \
  -an -sn -dn \
  candidate.png

cwebp -quiet -q 82 -metadata none candidate.png -o poster.webp
```

Quality `82` is a starting point rather than a universal target. Inspect text,
fine lines, gradients, edge ringing, and file size at the intended page width.
Keep source display aspect ratio, use source-or-smaller dimensions, and record
any crop as an explicit composition decision. A WebP poster normally exposes
only the image payload and essential container structure after metadata
removal; inspect the actual output chunks and run the publication metadata and
secret-material checks before acceptance.

The poster record includes:

- accepted-master SHA-256;
- extraction timestamp;
- FFmpeg and image-encoder versions plus selected settings;
- poster width, height, media type, byte count, and SHA-256;
- the visible reason this frame represents the sequence; and
- human visible-content, rights, and publication standing.

## Write a concise visual sequence

Classify the streams first. A zero-audio probe plus human review establishes a
silent source. Record that standing directly. The page then carries a visible
ordered sequence of meaningful changes and leaves the captions track absent.
An audio-bearing source instead receives reviewed captions for speech and
meaningful sound plus a descriptive transcript that carries consequential
visual information.

For a silent sequence, write three to seven ordered steps. Each step names the
actor or object, the action or state change, and the consequence a visitor
needs to understand. Include interface text only when it changes meaning.
Preserve the distinction among a contemporary proxy, source-era interface,
reconstruction, demonstration, and production record. The sequence describes
the useful progression rather than every cursor move, animation, or frame.

A compact pattern is:

1. The sequence opens on the initial roles, objects, or decision state.
2. A visitor or system action selects the working path.
3. The central interface exposes the primary task and its state.
4. A shared or downstream view carries the handoff or consequence.
5. The closing state shows the resulting boundary, decision, or recovery path.

Use a visible heading such as **Visual description · silent walkthrough** and
place the sequence in a stable, separately navigable element. Keep the video's
`aria-describedby` relationship concise by pointing it to standing or caption
text. The structured sequence may be associated through `aria-details`, while
ordinary nearby section semantics keep it useful when that relationship is
unsupported. Audio description becomes the selected companion when a visitor
needs synchronized access to essential time-based meaning during playback.

## Compose the visitor frame

Name the exact insertion coordinate before editing—for example, after an
At-a-Glance section and before architecture navigation. Read the complete page
and inspect generated headings, rails, catalogs, and figure numbering. A video
walkthrough can carry an unnumbered identity when joining an established
numbered figure series would otherwise shift every later reference.

The native progressive receiver ordinarily includes:

```html
<video
  controls
  playsinline
  preload="metadata"
  width="1920"
  height="1080"
  poster="/v1-cdn/video/example/v0.1.0/poster.webp"
  aria-label="Example working-proxy walkthrough"
  aria-describedby="video-standing video-caption"
  aria-details="video-sequence"
>
  <source
    src="/v1-cdn/video/example/v0.1.0/movie.mp4"
    type="video/mp4"
  >
  <p><a href="/v1-cdn/video/example/v0.1.0/movie.mp4">Open the MP4 directly</a>.</p>
</video>
```

The deployment model decides whether source markup uses an origin-relative or
absolute canonical route. The resolved production URL stays same-origin for
the current R2 adapter. A cross-origin attribute enters only when the selected
server and page policy support that request mode. Native controls,
visitor-initiated playback, and `preload="metadata"` form the ordinary state;
autoplay or a script player enters with a demonstrated visitor need.

Nearby prose identifies what the media is, who made it when authorship matters,
why the sequence appears on this page, and how its standing relates to the
historical case. The figure caption explains the sequence rather than repeating
delivery metadata. The fallback link gives visitors a direct alternate route
to the accepted media bytes.

## Observe the receiving page

Source checks establish exact route strings, media type, poster, intrinsic
geometry, accessible name, description linkage, fallback, insertion order,
and local numbering. Browser checks establish the additional rendered and
interactive behavior:

- the poster and metadata load through the selected CSP and origin posture;
- controls remain focusable and contained at narrow, landscape, and desktop
  widths;
- visitor action plays, pauses, and seeks;
- orientation changes preserve reachability and page reading order;
- the transcript or visual sequence remains visible without playback; and
- the prior page pointer restores independently from retained versioned media.

Route fulfillment can isolate source-layout tests while the current carrier's
same-origin policy keeps loopback outside its request boundary. Final
acceptance exercises the signed-out deployed page. Physical Safari/iOS remains
a named receiver when the selected MP4/cache behavior makes that environment
consequential.

## Completion and recovery

This branch completes when the poster is traceable to accepted bytes and has
human visual standing; the accessible name and nearby sequence carry the
meaning; source checks preserve local page contracts; signed-out browser
observations establish responsive play, seek, focus, CSP, and origin behavior;
and human activation approves the page. The transport can remain accepted
while this branch is open. Recovery restores the preceding page pointer while
the versioned media family remains available to its delivery owner.

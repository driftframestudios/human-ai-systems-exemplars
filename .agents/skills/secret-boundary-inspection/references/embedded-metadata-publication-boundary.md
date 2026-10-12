# Embedded metadata at a publication boundary

Load this reference when a snapshot, repository, generated site, release bundle,
or receiving handoff includes binary carriers. It augments the credential-shaped
material observation with a separate publication reading; a clean result from
either check leaves the other claim open until it receives its own evidence.

## Desired result

The exact publication closure has a format-aware metadata inventory, each
unwanted field has a source-owned cleanup route, and the rebuilt carrier has a
small sanitized receipt. The receipt states the formats and generated forms
observed, the classes of metadata allowed or removed, and the coverage boundary.

## Keep three decisions distinct

1. **Credential-shaped material:** Use the repository's canary-proven secret
   scanner and its named tree, index, history, or artifact scope.
2. **Embedded metadata:** Inspect the carrier with a format-aware reader for
   location, device identity, authorship, timestamps, production-tool residue,
   and packaged path information.
3. **Audience, rights, and consent:** A human receiver decides whether the
   visible content, named people or organizations, likenesses, third-party
   material, and license posture are suitable for the intended public.

One result can inform the others while each retains its own acceptance claim.

## Metadata classes worth observing

| Carrier | Commonly useful fields to inspect |
| --- | --- |
| JPEG, TIFF, PNG, WebP, and other raster images | EXIF, IPTC, and XMP location fields; camera owner, body and lens serials; make and model; creator and copyright; original and modification timestamps; software, host, document, and source-path fields; embedded thumbnails and previews |
| PDF and office documents | author, last editor, company, title, subject, keywords, creation and modification times, producer and template paths, comments, attachments, hidden layers, and revision residue |
| Audio and video containers | location coordinates or place names, device and author fields, recording time, encoder, title and comments, embedded artwork, and timed metadata |
| ZIP and other archives | entry names, absolute or parent-relative paths, copied dotfiles, operating-system residue, timestamps and permissions, and the metadata inside every packaged file |
| SVG and other text-based media | metadata elements, comments, editor namespaces, generator details, source paths, identifiers, and linked rather than embedded dependencies |

The list guides attention rather than asserting that every format or tool uses
the same fields. Tool output and raw metadata can itself be personal or
sensitive, so durable receipts summarize classes and dispositions instead of
repeating values.

## Observation route

1. Bind the exact source revision and publication closure. Enumerate regular
   files by format, including generated derivatives and the contents of
   archives rather than only their outer container.
2. Select format-aware readers that expose the relevant metadata without
   rewriting the input. Record tool versions or stable host commands when that
   detail changes interpretation.
3. Inspect for the intended classes. Treat explicit absence of GPS coordinates
   as an observed release property: device settings reduce capture risk, while
   imported assets, editing tools, generated variants, and later contributors
   can reintroduce location fields.
4. Keep raw values local. Return a private finding to the source owner when a
   precise location, device serial, personal author field, workstation path,
   or comparable identifier exceeds the publication intent.
5. Normalize through the source-owned asset or reproducible generator. Preserve
   intentional color profiles, orientation, accessibility, visual quality,
   attribution, and provenance while removing only metadata outside the
   accepted public contract. A private original can remain with its authorized
   owner rather than inside the public repository.
6. Rebuild every derivative and archive that can preserve or duplicate the
   metadata, then repeat the format-aware observation on the actual release
   candidate.
7. Pair the sanitized metadata receipt with the credential scan and the human
   audience, rights, and consent decision. State the formats, closure, and any
   historical binaries outside the observation.

## Evidence boundary

A current-carrier reading establishes only the fields exposed by the selected
readers in the named files. It does not establish historical binary-object
absence, removed-file absence, steganographic-content absence, visual-content
suitability, ownership, license sufficiency, or consent. Those questions retain
their fitting tools and human decision owners.

## Re-entry

Repeat the observation when an asset source, export tool, metadata-preservation
setting, generator, derivative profile, archive, or publication closure changes.
A newly contributed camera or phone image is enough to reopen the GPS and device
identity check even when the contributor reports location capture as disabled.

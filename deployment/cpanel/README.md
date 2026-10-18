# cPanel production projection

The production projection gives one accepted repository coordinate two
disjoint, reviewable, production-shaped document-root closures:

- `primary-public/` carries the explicitly selected `vik.guru` visitor files,
  with the selected Context Canvas `index.html` at its root; and
- `iframe-public/v1/` carries the exact aggregate Core and Canvas package from
  the repository's iframe-route builders.

The generated local preview is `.prod-projection-build/`, an ignored delivery
artifact. Authored files keep their existing repository locations, and the
assembler reads iframe bytes from `createAggregatePackagePlan()` instead of
walking the ignored `.iframe-route-build/` directory.

cPanel receives the same projection through the tracked, generated
`deployment/cpanel/carrier/` closure. A shell-capable account can receive it
through cPanel's managed Git deployment; a shell-free account can receive a
verified archive through the artifact-delivery route. The deployment manifest
binds an accepted source commit `S`; a following carrier-only release commit
`R` transports those bytes. Verification requires `R^1 = S`, an `S..R` diff
confined to the carrier root, and exact agreement among the manifest, the
Bash-readable index, and every carried file. This two-coordinate form avoids
asking a commit to contain its own identifier.

## Quick entry: prepare a shell-free cPanel carrier

Start with the receiving job and one approved production coordinate. An AI
collaborator can prepare the local transfer envelope; the authorized host
operator owns staging, root placement, and recovery.

| Receiving job | Source of payload bytes | Route |
| --- | --- | --- |
| Package an existing release | The selected annotated `production-v*` tag | Use a clean checkout of an explicitly selected, reviewed packaging-tool commit, then form and verify the envelope below. |
| Publish newer source | A newly accepted source and carrier pair | Follow [the accepted release sequence](#accepted-release-sequence), establish `R^1 = S` and a carrier-only diff, then select a new annotated production tag and package it. |

The operator selects `PRODUCTION_TAG`; example tags elsewhere in this directory
identify historical releases. Preserve existing tags when source or payload
changes. The packager reads committed carrier blobs from the selected tag and
records the packaging-tool revision separately. Packaging an existing carrier
uses its committed public bytes; private `.env.public` configuration belongs to
the new-projection build route.

With the repository's declared Node runtime and dependencies available:

```sh
: "${PRODUCTION_TAG:?Set the approved annotated production-v* tag}"
git fetch --tags origin
git rev-parse "${PRODUCTION_TAG}^{commit}"
npm run build:prod-carrier-transfer -- --tag "$PRODUCTION_TAG"
npm run verify:prod-carrier-transfer -- \
  --tag "$PRODUCTION_TAG" \
  --receipt ".cpanel-transfer/$PRODUCTION_TAG/hase-$PRODUCTION_TAG.receipt.json"
```

Keep the locally generated receipt as the trust anchor. The
[shell-free artifact guide](SHELL-FREE-ARTIFACT-DELIVERY.md) owns the complete
formation, fresh-output retry, upload/download comparison, root-relationship,
and recovery instructions. It also explains verification of the downloaded ZIP
against the local receipt and explicit tag before extraction. The host receives
the verified artifact through authenticated File Manager; repository history
and packaging tools remain in the trusted release environment.

Return the selected tag, resolved carrier and source commits, reviewed tool
commit, archive and receipt locations, and normalized verification result.
Archive verification establishes payload identity. The operator's protected
record and signed-out receiver checks establish activation and recovery.
Issue #118 preserves the completed `production-v0.2.0` transport and recovery
handoff as historical release evidence; #251 owns that release's remaining live
assessment. Publishing newer source requires a new accepted source/carrier pair,
tag, and authorized handoff rather than reopening the immutable release.
Issue
[#464](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/464)
owns the current `stable-core-v0.3.0` and `production-v0.3.0` formation,
activation, acceptance, and recovery sequence.

The tagged GitHub Pages projection followed the cPanel release as a separate
receiver. The visitor carrier has no runtime dependency on that Pages artifact.
`pages-v0.3.1` supplies the accepted schema and skill publication coordinate.
Completed Issue #531 records that closure's independently gated Worker review,
promotion, activation, and signed-out receipt. Completed Issue #406
preserves the v0.3.0 activation lineage, whose accepted Worker now supplies the
immediate platform recovery coordinate.

## Current entry condition

The tracked production configuration selects the accepted 40-route Context
Canvas collection, its non-indexed `404.html`, and the complete local file
closure those documents need. The retained anonymous-composite landing stays
outside this initial visitor collection. `primary-route-manifest.json` records every
selected source and its document-root destination explicitly.

`production-projection.config.json` has this shape:

```json
{
  "id": "prod-projection.configuration.v1",
  "version": "1",
  "primary_manifest": "deployment/cpanel/primary-route-manifest.json",
  "asset_inventory": "context-canvas-project-surface/asset-inventory.json",
  "iframe_origin_robots": "deployment/cpanel/iframe-origin-robots.txt",
  "css_projection": {
    "id": "prod-projection.css-profile.v1",
    "profile": "about-conservative-v1",
    "consumer": "context-canvas-project-surface/context-canvas/index.html",
    "output_directory": "assets/css",
    "tool": {
      "name": "csso",
      "version": "5.0.5",
      "options": {
        "restructure": false,
        "forceMediaMerge": false,
        "comments": false
      }
    }
  },
  "publication": {
    "base_url": "https://vik.guru/",
    "source_root": "context-canvas-project-surface/context-canvas",
    "public_reference_config": ".env.public"
  }
}
```

`css_projection` is one bounded production distribution profile. It discovers
About's stylesheet order from the tracked consumer rather than restating that
order in configuration. Six contiguous enhanced owners become one file, the
stylesheet inside `<noscript>` remains its own execution context, and the later
`canvas-shell.css` link remains a separate file. Each generated filename carries
its full SHA-256 digest beneath `assets/css/`; generated files never replace the
readable repository owners.

Before CSSO runs, repository-local CSS references resolve from each original
source location to the generated output location. Query strings and fragments
remain attached. Root-relative references stay root-relative after resolving
inside `publication.source_root`; like relative references, they must be part
of the selected carrier closure. External, `data:`, and fragment-only
references remain in their authored reference class. Missing or escaping local
references, runtime `@import`, composed `@charset` or `@namespace`, invalid CSS,
string-form `image-set()` sources, ambiguous encoded local paths, a changed or
ambiguous stylesheet loading graph, a tool or profile mismatch, and a
portable-path collision stop projection formation. The loading-graph parser
uses source spans and HTML data-state boundaries; comments and raw or inert
regions cannot supply stylesheet owners.

For the current source graph, an enhanced screen moves from seven stylesheet
requests and 77,081 raw bytes to two requests and 55,814 raw bytes; the
independently compressed sums move from 17,674 to 11,914 gzip-9 bytes and from
14,823 to 10,536 Brotli-11 bytes. The scriptless path moves from eight requests
and 77,489 raw bytes to three requests and 56,111 raw bytes; gzip-9 moves from
17,877 to 12,059 bytes and Brotli-11 from 14,984 to 10,643 bytes. These are
repository-side distribution observations. The final carrier manifest binds
the generated filenames and digests; deployed transfer claims begin with the
signed-out receiver observation.

The primary manifest alone selects primary files and public paths.
`asset-inventory.json` describes the images already selected by the primary and
iframe builders: family rules name the owner, visitor job, accessibility-text
owner, build consumers, source relationship, and recovery condition. The
inventory stops a build when a selected image has no single semantic family;
it cannot add an output.

The generated deployment manifest resolves those rules into one record per
selected image. Each resolved record carries a stable semantic key, canonical
source, media kind, dimensions read from exact source bytes, byte count,
SHA-256, authored consumers observed through the existing reference resolver,
build consumers, public-path standing, selected closure, derivative or variant
relationship, and every primary or iframe projection. The output rows carry
the same semantic key, so an iframe alias and a primary path remain traceable
to one source asset.

Each family declares whether its primary path preserves the complete repository
source path or its path beneath a named source root. The assembler verifies the
primary manifest against that declaration and records iframe route projections
separately, so `public_path_standing` describes observed geometry rather than a
general policy claim.

Semantic provenance and transport standing answer different questions. A GIF
or poster generated from a named film and profile retains that relationship in
the inventory while the production projection can still carry its committed
bytes unchanged. Authored raster variant sets record their relationship and
the current absence of a generation profile without treating filename suffixes
as dimensions.

`iframe_origin_robots` gives the iframe host its own reviewed root
`robots.txt`. The file carries the same search, person-directed retrieval, and
training-use posture as the primary source while remaining independent of the
versioned `/v1/` iframe package. The primary `robots.txt` keeps the primary
sitemap; the iframe-origin file omits a sitemap because this projection does
not publish one for that host.

The referenced manifest uses one explicit entry for every primary output:

```json
{
  "id": "prod-projection.primary-route-manifest.v1",
  "version": "1",
  "files": [
    {
      "source_path": "context-canvas-project-surface/context-canvas/index.html",
      "projected_path": "index.html",
      "media_type": "text/html"
    }
  ]
}
```

The assembler reads selected files from regular Git blobs at the accepted
source coordinate. It resolves Registry tokens through the tracked, reviewed
binding in [`deployment/public-references/`](../public-references/README.md)
and resolves the professional-profile token from ignored `.env.public` in
memory. The plan records the tracked binding and accepted Atlas receipt plus
the external receiver's digest and non-Registry key set, then rechecks both
inputs before returning. It uses an empty process environment for this step,
so `.env.public` is the complete external receiver for a production
projection. Registry overrides in that receiver fail closed.

For the About CSS projection, the deployment manifest also records the exact
profile, CSSO package/version/options, consumer and execution context, ordered
source paths and source digests, full output digest, bytes, media type, and the
readable-graph recovery route. The production HTML references only generated
files present in the same output closure. Readable CSS files remain selected
while adjacent routes consume them and provide immediate rollback: remove the
`css_projection` property from tracked configuration and rebuild. Public source
maps remain absent because repository source plus manifest lineage supplies the
inspection path.

Publication transforms then map the nested Context Canvas root to
`https://vik.guru/`. Canonical, social, JSON-LD, sitemap, and local relative
references follow their projected locations. Markdown links resolve through
their complete selected-file closure, including fragments and directory
README targets; repository-only continuations use their accepted public owner
or remain ordinary prose. Schema identities and literal
`https://iframes.vik.guru/v1/` routes retain their authored values. Generated
rows record their source digest and projected digest; unchanged files retain
byte-preserved standing. The ignored `.public-reference-build/` directory is
not an input.

When a selected primary HTML file is also owned by the Canvas iframe route
manifest, the assembler applies that manifest's shared public metadata at the
publication boundary. The full view and its iframe projection therefore carry
one author declaration, one Apache-2.0 relation, one visitor-boundary context
and canary stack, and one copy-local attribution notice. Sources that already
carry the complete bundle, such as Threadkeeping Ledger, retain their authored
copy without a duplicate. The Canvas route manifest remains the selection
authority; the production configuration adds no parallel decoration list.

The assembler also keeps the Core vocabulary decision at its current owner.
If a selected primary file or the accepted iframe package still carries the
placeholder Core authority, assembly stops at Issue #110. Continue after that
Issue supplies an accepted namespace and the source-owned projections and
complete iframe package have been regenerated together.

## Commands

```sh
npm run test:prod-deployment
npm run test:prod-css-projection-browser
npm run check:prod-projection
npm run build:prod-projection
npm run stage:prod-carrier
npm run check:prod-carrier
: "${PRODUCTION_TAG:?Set the approved annotated production-v* tag}"
npm run build:prod-carrier-transfer -- --tag "$PRODUCTION_TAG"
npm run verify:prod-carrier-transfer -- --tag "$PRODUCTION_TAG" --receipt ".cpanel-transfer/$PRODUCTION_TAG/hase-$PRODUCTION_TAG.receipt.json"
```

`check:prod-projection` writes and verifies the newly composed plan in
temporary storage; it does not attest an existing carried artifact.
`test:prod-css-projection-browser` compares the tracked readable graph with the
generated graph across narrow, desktop, and wide enhanced, scriptless, print,
forced-color, and reduced-motion states. It also exercises interaction,
request-closure, and the expected CSP iframe-refusal boundary. The focused
browser contract uses tracked bytes and does not require `.env.public`.
`build:prod-projection` is the explicit mutation boundary and transactionally
replaces only `.prod-projection-build/`. Both commands require the ignored
`.env.public` receiver for the professional-profile destination; Registry
routes come from tracked input. A custom repository-owned fixture can be named with
`-- --config path/to/config.json`.

`stage:prod-carrier` transactionally replaces only the tracked carrier root.
It may be repeated while that root is the worktree's only open change.
`check:prod-carrier` runs after the carrier is committed and proves the source,
release, diff, manifest, index, and file closure without activating a host.
The transfer builder reads that closure from an annotated production tag and,
by default, writes a deterministic ZIP plus external receipt beneath ignored
`.cpanel-transfer/`. The verifier reopens the archive, enforces portable regular
files and explicit size/count bounds, and compares every carried byte with the
tag before any host activation.

## Accepted release sequence

1. Promote the reviewed source through `main`, `stg`, and `release` into
   `prod`. When the protected destination requires a current-base head, create
   a temporary branch at exact destination `D`, merge exact accepted upstream
   `U`, and review candidate `C` with parents `[D, U]`. For
   `release → prod`, verify that source paths outside
   `deployment/cpanel/carrier/**` equal `U` and that the complete carrier
   subtree equals `D`. Merge the reviewed candidate with a merge commit and
   verify accepted `prod` source `S` has parents `[D, C]`; squash, rebase, and
   fast-forward results do not satisfy this receipt. Recheck both path
   relationships on `S`. Its retained carrier is historical downstream state
   rather than a fresh cPanel delivery candidate. The
   [protected destination promotion adapter](../../BRANCHING.md#protected-destination-promotion-adapter)
   and [Issue #469](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/469)
   record this procedure and its focused checks. Run the checker with full
   commit IDs before carrier formation:

   ```sh
   npm run check:promotion-topology -- \
     --upstream "$U" --destination "$D" --candidate "$C" --result "$S" \
     --retained-root deployment/cpanel/carrier
   ```

   PR #470 supplies its first worked `release → prod` receipt; the
   [publication stabilization
   runbook](../../.agents/runbooks/core-iframe-publication-stabilization.v0.1.md#worked-destination-based-production-promotion--2026-10-12)
   records the exact result.
2. Start one carrier branch from exact `S`, run `npm run stage:prod-carrier`,
   and commit only `deployment/cpanel/carrier/**`.
3. Run `npm run check:prod-carrier` on that branch and review the generated
   manifest, index, and projection changes.
4. Merge the carrier pull request only while `prod` still names `S`. The
   repository's ordinary reviewed merge form is valid because the resulting
   `R` keeps `S` as its first parent and changes only the carrier root.
5. Check the exact merged `R`, then select the host-supported receiver:
   - a shell-capable cPanel account performs **Update from Remote** followed by
     **Deploy HEAD Commit**; or
   - a shell-free cPanel account runs the repository-owned transfer-envelope
     builder and verifier, stages both outputs privately, and follows the
     ordered cutover and recovery contract.

If `prod` advances before step 4, begin again from the new accepted source and
regenerate the carrier. Updating the older carrier branch would weaken the
`R^1 = S` relationship that makes the handoff inspectable.

If a protected destination advances before its source-promotion review,
record the new exact destination and form a fresh temporary candidate. Preserve
the superseded pull request as its observation receipt. A conflict or path
relationship outside the expected source and carrier boundaries returns to the
owning source lane before production acceptance.

An equal-tree promotion changes Git ancestry and review receipts while the
accepted source tree stays byte-identical. Existing iframe packages,
production projections, media families, tag refs, carriers, and live
deployments remain at their recorded coordinates. A separately authorized
artifact contract starts any rebuild, tag, carrier staging, or activation.
Production carrier staging begins after exact `S` acceptance and may update
commit-bound metadata even when authored source stayed equal.

The human-operated [pull-model enrollment and first cutover](FIRST-CUTOVER.md)
owns a shell-capable managed clone. [Shell-free cPanel artifact
delivery](SHELL-FREE-ARTIFACT-DELIVERY.md) owns File Manager staging, the first
manual pilot, later manual Actions packaging, conditional FTPS, and the PHP
finalizer boundary. An accepted production tag supplies immutable payload
identity in both routes; only the pull route keeps a managed checkout attached
to `prod`.

An authorized iframe-only upload can use the complete generated
`.iframe-route-build/iframes.vik.guru/v1/` directory as the interim `/v1/`
unit. The accepted full iframe-origin closure at `R` is
`deployment/cpanel/carrier/iframe-public/`; it also carries the root
`robots.txt`. The first-cutover guide keeps the manual upload, host response
policy, and later two-root cPanel acceptance distinct.

The top-level `.cpanel.yml` delegates to one repository-relative Bash script.
Real document roots, state paths, and first-cutover allowances live in a
data-only private configuration beside the managed clone; the tracked
`host-config.example` supplies its keys. The first legacy-site backup or
quarantine remains a separate human host action. The installer then accepts an
empty receiving surface plus explicitly named host-owned paths, deploys from
verified Git blobs, and records only bounded current/pending release state
outside the clone.

Each generated deployment manifest binds the Git source SHA; the tracked
configuration, primary manifest, and semantic asset inventory paths, Git blob
IDs, and SHA-256 digests; and every projected file's surface, source path,
output path, media type, byte count, digest, and byte-preserved standing.
Selection and primary payload bytes come from regular Git blobs at that
accepted SHA. A clean checkout may apply a line-ending or content filter, so
checkout bytes are required to remain regular files while the projection uses
the immutable Git-blob bytes.

The aggregate iframe plan is a separately composed input. Its root receipt
digest and deterministic closure digest bind its sorted output paths and bytes;
the deployment manifest calls this an `independent_plan_bound_input` instead
of implying that the primary repository `source_sha` establishes its lineage.
The assembler also checks the aggregate receipt's family routes, counts, byte
totals, and receipt files against the supplied plan. Schema identities and
literal `https://iframes.vik.guru/v1/...` carrier URLs retain their authored
semantic values. Primary files transformed for the production route carry
their source and projected digests; exact copies retain byte-preserved
standing.

Publication-owned URL transformations carry both source and projection digests
with generated standing. Byte-preserved standing remains reserved for exact
copies.
After an explicit build installs the new closure, transaction cleanup reports
either `complete` or `incomplete`. An incomplete cleanup result still reports
the installed closure as successful and leaves transaction cleanup as a
visible local follow-up.

This repository contract establishes deterministic membership, carried bytes,
and a fail-closed host installer for the two closures. Exact cPanel paths,
credentials, the first legacy-site backup, activation, cache behavior, and live
route observations remain with their separately authorized receiver.

## cPanel references

- [First pull-model enrollment and cutover](FIRST-CUTOVER.md)
- [Shell-free artifact delivery and first cutover](SHELL-FREE-ARTIFACT-DELIVERY.md)
- [Set up access to private repositories](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-set-up-access-to-private-repositories/)
- [Set up Git deployment](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-set-up-deployment/)
- [Guide to Git Deployment](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-deployment/)
- [Git Version Control](https://docs.cpanel.net/cpanel/files/git-version-control/)
- [Git advanced configuration and troubleshooting](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-advanced-configuration-and-troubleshooting/)
- [Git UI timeout advisory](https://support.cpanel.net/hc/en-us/articles/4418071248791-Git-Repositories-may-timeout-when-cloned-or-updated-via-cPanel-s-Git-Version-Control-Feature)
- [GitHub deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)

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
`deployment/cpanel/carrier/` closure. The deployment manifest binds an accepted
source commit `S`; a following carrier-only release commit `R` transports those
bytes. Verification requires `R^1 = S`, an `S..R` diff confined to the carrier
root, and exact agreement among the manifest, the Bash-readable index, and
every carried file. This two-coordinate form avoids asking a commit to contain
its own identifier.

## Current entry condition

The tracked production configuration selects the accepted 37-page Context
Canvas collection, its non-indexed `404.html`, and the complete local file
closure those documents need. The four resting no-index exemplars stay outside
this initial visitor collection. `primary-route-manifest.json` records every
selected source and its document-root destination explicitly.

`production-projection.config.json` has this shape:

```json
{
  "id": "prod-projection.configuration.v1",
  "version": "1",
  "primary_manifest": "deployment/cpanel/primary-route-manifest.json",
  "asset_inventory": "context-canvas-project-surface/asset-inventory.json",
  "iframe_origin_robots": "deployment/cpanel/iframe-origin-robots.txt",
  "publication": {
    "base_url": "https://vik.guru/",
    "source_root": "context-canvas-project-surface/context-canvas",
    "public_reference_config": ".env.public"
  }
}
```

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
source coordinate. It resolves Registry and professional-profile tokens from
the ignored `.env.public` receiver in memory, records that receiver's digest
and semantic key set, and rechecks the digest before returning the plan. It
uses an empty process environment for this step, so the file is the complete
receiver for a production projection.

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

The assembler also keeps the Core vocabulary decision at its current owner.
If a selected primary file or the accepted iframe package still carries the
placeholder Core authority, assembly stops at Issue #110. Continue after that
Issue supplies an accepted namespace and the source-owned projections and
complete iframe package have been regenerated together.

## Commands

```sh
npm run test:prod-deployment
npm run check:prod-projection
npm run build:prod-projection
npm run stage:prod-carrier
npm run check:prod-carrier
```

`check:prod-projection` writes and verifies the newly composed plan in
temporary storage; it does not attest an existing carried artifact.
`build:prod-projection` is the explicit mutation boundary and transactionally
replaces only `.prod-projection-build/`. Both commands require the ignored
`.env.public` receiver. A custom repository-owned fixture can be named with
`-- --config path/to/config.json`.

`stage:prod-carrier` transactionally replaces only the tracked carrier root.
It may be repeated while that root is the worktree's only open change.
`check:prod-carrier` runs after the carrier is committed and proves the source,
release, diff, manifest, index, and file closure without activating a host.

## Accepted release sequence

1. Promote the reviewed source through `main`, `stg`, and `release` into
   `prod`. The resulting accepted `prod` commit is `S`; it is not yet a fresh
   cPanel delivery candidate.
2. Start one carrier branch from exact `S`, run `npm run stage:prod-carrier`,
   and commit only `deployment/cpanel/carrier/**`.
3. Run `npm run check:prod-carrier` on that branch and review the generated
   manifest, index, and projection changes.
4. Merge the carrier pull request only while `prod` still names `S`. The
   repository's ordinary reviewed merge form is valid because the resulting
   `R` keeps `S` as its first parent and changes only the carrier root.
5. Check the exact merged `R`, then let cPanel perform **Update from Remote**
   followed by **Deploy HEAD Commit**.

If `prod` advances before step 4, begin again from the new accepted source and
regenerate the carrier. Updating the older carrier branch would weaken the
`R^1 = S` relationship that makes the handoff inspectable.

The human-operated first enrollment, SSH key, managed-clone, private-config,
backup, canary, cutover, recovery, response-policy, and signed-out observation
route is in [cPanel pull-model enrollment and first
cutover](FIRST-CUTOVER.md). An accepted production tag supplies immutable
identity while the managed checkout remains attached to `prod`.

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
- [Set up access to private repositories](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-set-up-access-to-private-repositories/)
- [Set up Git deployment](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-set-up-deployment/)
- [Guide to Git Deployment](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-deployment/)
- [Git Version Control](https://docs.cpanel.net/cpanel/files/git-version-control/)
- [Git advanced configuration and troubleshooting](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-advanced-configuration-and-troubleshooting/)
- [Git UI timeout advisory](https://support.cpanel.net/hc/en-us/articles/4418071248791-Git-Repositories-may-timeout-when-cloned-or-updated-via-cPanel-s-Git-Version-Control-Feature)
- [GitHub deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)

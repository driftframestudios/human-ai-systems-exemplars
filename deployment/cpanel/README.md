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

The assembler and its fixture-driven contract are active. The initial primary
route selection remains with Issue #116, so this directory currently carries
no production route manifest and no production configuration. That boundary
keeps provisional membership outside the delivery artifact.

Once the selected collection is accepted, add a repository-owned
`production-projection.config.json` with this shape:

```json
{
  "id": "prod-projection.configuration.v1",
  "version": "1",
  "primary_manifest": "deployment/cpanel/primary-route-manifest.json"
}
```

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

That example describes the manifest grammar. The accepted manifest will add
the complete primary dependency closure before a production build is treated
as a deployment candidate.

The authored Context Canvas root currently contains Registry publication
tokens. The complete assembler will call `materializePublicReferences()` with
approved values inside the same build transaction, then select primary files
from that exact result. It will provide no fallback value and will not walk an
ambient `.public-reference-build/` directory. The current baseline keeps that
future seam visible by stopping when a selected source still contains an
unresolved token.

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
replaces only `.prod-projection-build/`. Both commands stop with a clear
missing-configuration result while the primary route selection is open. A
custom repository-owned fixture or future accepted configuration can be named
with `-- --config path/to/config.json`.

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

The top-level `.cpanel.yml` delegates to one repository-relative Bash script.
Real document roots, state paths, and first-cutover allowances live in a
data-only private configuration beside the managed clone; the tracked
`host-config.example` supplies its keys. The first legacy-site backup or
quarantine remains a separate human host action. The installer then accepts an
empty receiving surface plus explicitly named host-owned paths, deploys from
verified Git blobs, and records only bounded current/pending release state
outside the clone.

Each generated deployment manifest binds the Git source SHA; the tracked
configuration and primary manifest paths, Git blob IDs, and SHA-256 digests;
and every projected file's surface, source path, output path, media type, byte
count, digest, and byte-preserved standing. Selection and primary payload bytes
come from regular Git blobs at that accepted SHA. A clean checkout may apply a
line-ending or content filter, so checkout bytes are required to remain regular
files while the projection uses the immutable Git-blob bytes.

The aggregate iframe plan is a separately composed input. Its root receipt
digest and deterministic closure digest bind its sorted output paths and bytes;
the deployment manifest calls this an `independent_plan_bound_input` instead
of implying that the primary repository `source_sha` establishes its lineage.
The assembler also checks the aggregate receipt's family routes, counts, byte
totals, and receipt files against the supplied plan. Schema identities and
literal `https://iframes.vik.guru/v1/...` carrier URLs travel unchanged in this
baseline because selected primary and iframe files retain their exact bytes.

When publication-owned URL transformations join the assembler, their manifest
rows will carry both source and projection digests with generated standing.
The byte-preserved standing in this baseline remains reserved for exact copies.
After an explicit build installs the new closure, transaction cleanup reports
either `complete` or `incomplete`. An incomplete cleanup result still reports
the installed closure as successful and leaves transaction cleanup as a
visible local follow-up.

This repository contract establishes deterministic membership, carried bytes,
and a fail-closed host installer for the two closures. Exact cPanel paths,
credentials, the first legacy-site backup, activation, cache behavior, and live
route observations remain with their separately authorized receiver.

## cPanel references

- [Guide to Git Deployment](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-deployment/)
- [Git Version Control](https://docs.cpanel.net/cpanel/files/git-version-control/)
- [Git advanced configuration and troubleshooting](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-advanced-configuration-and-troubleshooting/)

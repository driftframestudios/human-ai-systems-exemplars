# cPanel production projection

The production projection gives one accepted repository coordinate two
disjoint, reviewable, production-shaped document-root closures:

- `primary-public/` carries the explicitly selected `vik.guru` visitor files,
  with the selected Context Canvas `index.html` at its root; and
- `iframe-public/v1/` carries the exact aggregate Core and Canvas package from
  the repository's iframe-route builders.

The generated root is `.prod-projection-build/`. It is an ignored delivery
artifact. Authored files keep their existing repository locations, and the
assembler reads iframe bytes from `createAggregatePackagePlan()` instead of
walking the ignored `.iframe-route-build/` directory.

An ignored local artifact is outside cPanel's Git pull. A later accepted
release receiver must carry the verified projection through a tracked release
projection or another protected handoff before cPanel can install it. This
baseline supplies the deterministic assembly seam; it does not select that
release carrier.

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
```

`check:prod-projection` writes and verifies the newly composed plan in
temporary storage; it does not attest an existing carried artifact.
`build:prod-projection` is the explicit mutation boundary and transactionally
replaces only `.prod-projection-build/`. Both commands stop with a clear
missing-configuration result while the primary route selection is open. A
custom repository-owned fixture or future accepted configuration can be named
with `-- --config path/to/config.json`.

Each generated deployment manifest binds the Git source SHA, the aggregate
iframe receipt, and every projected file's surface, source path, output path,
media type, byte count, digest, and byte-preserved standing. Schema identities
and literal `https://iframes.vik.guru/v1/...` carrier URLs travel unchanged in
this baseline because selected primary and iframe files retain their exact
bytes.

When publication-owned URL transformations join the assembler, their manifest
rows will carry both source and projection digests with generated standing.
The byte-preserved standing in this baseline remains reserved for exact copies.

This local contract establishes deterministic membership and bytes for the
two closures. cPanel document roots, credentials, legacy-site takeover,
deployment activation, cache behavior, and live route observations remain
with their separately authorized receiver.

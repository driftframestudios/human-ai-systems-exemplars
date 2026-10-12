# Public iframe route families

This directory holds delivery-owned contracts for iframe families whose
semantic sources live elsewhere in the repository. A family manifest defines
finite aliases, source files, generated adaptations, package-local
dependencies, and exact carrier capabilities. It does not create a new
semantic architecture family or replace the named source owners.

## Use this route when

Use this directory when a source-owned artifact needs a finite public iframe
alias, package-local dependency closure, or exact carrier capability. Return to
the artifact's nearest README for semantic changes.

## Build the accepted families

The repository-root command builds all accepted families together:

```sh
npm run build:iframe-routes
```

Generated output rests beneath
`.iframe-route-build/iframes.vik.guru/v1/`. Treat that directory as
replaceable, ignored build material: change a tracked source or manifest and
run the command again instead of editing a generated route.

The focused route tests also compare authored and projected SVG semantics. The
browser media contract forms a temporary aggregate package and reads every
route under reduced motion, print, forced colors, and a 200% fixed/sticky-focus
stress:

```sh
npm run test:iframe-routes
npm run test:iframe-visual-media-browser
```

These checks inspect computed SVG names, view boxes, bounds, instance IDs, and
text equivalents. They leave the persistent upload directory unchanged.

## Compare a hosted closure

After an authorized receiver uploads the complete closure, compare the live
host with a fresh in-memory build:

```sh
npm run verify:iframe-routes:live
npm run verify:iframe-routes:policy
```

The first command fails on a missing route, redirect, byte mismatch, or media
type mismatch while reporting the current response-policy standing. The second
also requires the bounded hosted policy owned by Issue #102: UTF-8 HTML,
nosniff, no-referrer, the approved `vik.guru` frame ancestor, no conflicting
X-Frame-Options value, deliberate revalidation, and no CORS header without a
named fetch reader. The verifier is fixed to `https://iframes.vik.guru/v1/`
and returns one public-safe summary; it does not write a receipt or become an
upload authority.

## Owned delivery families

Current delivery families are:

- `core` — the Core pack, its hub, and the explicitly supplemental
  Conditioning Field, declared by the current Core pack;
- `canvas` — non-Core companions embedded by Context Canvas receivers,
  declared by [`canvas/public-iframe-route-manifest-v1.json`](canvas/public-iframe-route-manifest-v1.json).

## Projected navigation behavior

Authored source keeps ordinary links ordinary. During packaging, each generated
iframe document gives user-activated exits a secure separate-tab destination;
fragment navigation, downloads, buttons, and other in-document actions retain
their source behavior. A projected activation adapter applies the same rule to
eligible links created at runtime. The route receipt records the observed exits,
and the matching parent carrier grants `allow-popups` with
`allow-popups-to-escape-sandbox` so the requested destination opens as a
top-level page rather than inside the embedded document.

## Return path

The family manifests own delivery membership. The [test map](../tests/README.md)
names the focused packaging and browser checks, and the
[repository root](../README.md) carries publication and authority posture.

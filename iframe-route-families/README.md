# Public iframe route families

This directory holds delivery-owned contracts for iframe families whose
semantic sources live elsewhere in the repository. A family manifest defines
finite aliases, source files, generated adaptations, package-local
dependencies, and exact carrier capabilities. It does not create a new
semantic architecture family or replace the named source owners.

The repository-root command builds all accepted families together:

```sh
npm run build:iframe-routes
```

Generated output rests beneath
`.iframe-route-build/iframes.vik.guru/v1/`. Treat that directory as
replaceable, ignored build material: change a tracked source or manifest and
run the command again instead of editing a generated route.

Current delivery families are:

- `core` — the Core pack, its hub, and the explicitly supplemental
  Conditioning Field, declared by the current Core pack;
- `canvas` — non-Core companions embedded by Context Canvas receivers,
  declared by [`canvas/public-iframe-route-manifest-v1.json`](canvas/public-iframe-route-manifest-v1.json).

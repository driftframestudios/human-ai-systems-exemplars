# schemas-worker

Asset-only Worker that serves static schemas from `schemas.vik.guru`.

## Behavior

| Request | Response |
|---|---|
| HTTP (any path) | 308 → HTTPS (preserves hostname, path, query string) |
| `GET /` | 200 — serves `public/index.html` |
| `GET /schemas/...` (exists) | 200 — served from static assets |
| `GET /schemas/...` (missing) | 404 — JSON body naming the missing resource, `Cache-Control: no-store` |
| Any error (5xx) | passthrough with `Cache-Control: no-store` |

## Cache-Control policy

Eligibility is determined by `public/publication-manifest.json`, not by file extension.

| Category | Cache-Control |
|---|---|
| Frozen exact-version schema/context (listed in manifest `frozen[]`) | `public, max-age=31536000, immutable` |
| Catalogs, indexes, discovery manifests, mutable/unversioned schemas | `public, max-age=0, must-revalidate` |
| Missing resources and error responses | `no-store` |

ETag support is retained from the assets binding for efficient conditional requests.

## Publication manifest

`public/publication-manifest.json` lists which schema paths are frozen (published exact versions):

```json
{
  "frozen": [
    "/schemas/example/v1.0.0/schema.json"
  ]
}
```

Any path not listed in `frozen[]` gets `must-revalidate`. For example, an unversioned `prototype-local-manifest.schema.json` stays revalidatable until it has an explicit frozen-version publication contract (i.e., until its path is added to `frozen[]`).

## Deploy

```bash
npm install
npx wrangler deploy
```

## Project structure

```
schemas-worker/
├── src/
│   └── index.js                  # Worker fetch handler (redirects, 404s, cache headers)
├── public/
│   ├── index.html                # Registry root page
│   ├── publication-manifest.json # Lists frozen (immutable) schema paths
│   └── schemas/                  # Place schema files here
├── wrangler.jsonc               # Wrangler config (assets binding, custom domain)
└── package.json
```


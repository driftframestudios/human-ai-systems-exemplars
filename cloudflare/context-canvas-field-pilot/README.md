# Context Canvas Field Inspection pilot

This pilot prepares one bounded public reading for Cloudflare Workers Static Assets. It preserves the repository's path topology and gives the team a small, observable delivery surface before it chooses a broader runtime.

The public closure contains 14 files: 12 allowlisted Context Canvas assets and two delivery-owned files in `source/`. The builder copies only those files into ignored `dist/`; `--check` rejects missing, changed, symlinked, or extra public files.

## Build and inspect

Run these commands from the repository root:

```bash
npm run build:context-canvas-field-pilot
npm run check:context-canvas-field-pilot
npm run dry-run:context-canvas-field-pilot
```

The reading remains at its canonical path inside the generated surface:

```text
/context-canvas-project-surface/context-canvas/field-inspection-harness-replatform.html
```

`wrangler deploy --dry-run` validates the asset-only package without publishing it. A named steward authorizes deployment and the resulting audience separately.

## Delivery contract

- `wrangler.jsonc` declares Static Assets only. The pilot has no Worker entry point, bindings, storage, or server-side state.
- Cloudflare's asset-first path serves the allowlisted HTML, CSS, JavaScript, icons, and diagrams directly.
- `html_handling: "none"` preserves explicit `.html` routes. `not_found_handling: "404-page"` returns the nearest authored `404.html` for every other path.
- Adjacent Context Canvas links resolve through the authored pilot 404, which carries visitors to the canonical complete surface while this allowlist stays focused on one reading.
- Mutable filenames use Cloudflare's default revalidation and ETag behavior. Content fingerprints become useful when observed cache behavior warrants a versioned asset contract.
- `_headers` establishes a no-index proving surface, a narrow browser capability posture, and a closed framing boundary. A named receiving origin can replace `frame-ancestors 'none'` when an authorized embed becomes part of the design.
- Public assets contain the authored reading and its visual dependencies. Internal planning, credentials, private source material, and visitor data stay outside this closure.

The complete Cloudflare field described in `grammar-family.html` remains design input for later contextual composition, coordinated rooms, durable undertakings, and visitor-owned state. Worker execution and platform storage enter this pilot when a measured user journey requires them.

Current platform references:

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Static Assets headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Static-site generation and 404 handling](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

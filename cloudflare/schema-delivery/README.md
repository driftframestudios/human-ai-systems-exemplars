# Static schema delivery receiver

This package forms the first reviewable source closure for delivering a production schema through Cloudflare Workers Static Assets. It prepares one accepted schema family from an explicit allowlist. A later protected receiver holds the deployment and domain decisions.

## Public closure

The generated, ignored `dist/` directory contains four files:

| Route or delivery file | Source | Receiving job |
| --- | --- | --- |
| `/` | `source/index.html` | Human-readable list of exact-version routes and receipts |
| `/404.html` | `source/404.html` | Calm route recovery toward the current index |
| `/_headers` | `source/_headers` | CORS, content hardening, framing, and versioned-cache posture |
| `/prototype-exemplars/1.0.0/prototype-exemplars.schema.json` | `schemas/prototype-exemplars/1.0.0/prototype-exemplars.schema.json` | Byte-identical first-family schema |

The builder accepts regular files only, rejects extra output, compares every generated file byte-for-byte with its source, and confirms this first-family receipt:

- size: `12309` bytes;
- SHA-256: `42910b5238a62c666cf5fcdbdc5a364b64d7c5301d959ac9bdaea11c8743ccf2`; and
- established schema identity: `https://schemas.vik.guru/prototype-exemplars/1.0.0/prototype-exemplars.schema.json`.

## Build and inspect

Run from the repository root:

```bash
npm run build:schema-delivery
npm run check:schema-delivery
npm run dry-run:schema-delivery
npm run dry-run:schema-delivery:release
```

The first two commands use Node.js only. The dry run uses the repository's locked Wrangler dependency after `npm ci` has prepared the local toolchain.

## Delivery posture

`wrangler.jsonc` declares an asset-only package. Its authored surface contains the distribution directory and delivery behavior; application logic, bindings, storage resources, routes, and runtime secrets each retain their own receiving work. `workers_dev: false` leaves public routing to a separately reviewed receiver. The named `release` environment carries an explicit empty route set and uploads an independently versioned, un-routed integration Worker. The top-level configuration remains the production receiver and can add the accepted Custom Domain after its branch, credential, budget, and rollback decisions are ready.

Cloudflare recommends a Custom Domain when a Worker is the origin. That route can serve the exact Vik Guru paths directly and preserve Worker-version rollback. A Bulk Redirect remains a contingency for specific paths; it redirects rather than serving Vik Guru bytes and executes after the WAF.

The static runtime reads public assets only. A connected GitHub deployment token belongs to the narrow protected environment that performs the deployment. Cloudflare Secrets Store becomes useful when later Worker behavior needs a runtime credential for another service.

## Connected release path

`.github/workflows/schema-delivery.yml` checks every eligible `release` and `prod` candidate against the same schema, asset, Wrangler, and secret-material contracts. A successful push can deploy only when the corresponding repository budget is active and `DEPLOYMENT_ACTIVE_RECEIVERS` names that receiver. The `release` job targets the un-routed Wrangler environment automatically. The `prod` job passes through its exact-branch GitHub environment and the human handoff accepted before connected production activation.

The connected jobs use the repository's locked Wrangler version and strict deployment mode. Release and production credentials remain environment-scoped: `CLOUDFLARE_ACCOUNT_ID` is a non-sensitive variable and `CLOUDFLARE_API_TOKEN` is a least-privilege secret. Credential values live exclusively in matching GitHub environment settings and briefly enter process memory for confirmation and deployment. Repository content and retained receipts carry the binding names, repository coordinate, and redacted state only.

## Evidence boundary

A passing build and check establish the named allowlist, regular-file boundary, byte agreement, size, and digest in the local generated closure. A Wrangler dry run establishes that the locked CLI can package the asset-only configuration. Deployment, custom-domain ownership, signed-out production behavior, cache observation, and rollback remain open until their receiving packet is granted and observed.

Current platform references:

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Static Asset headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Workers routes and domains](https://developers.cloudflare.com/workers/configuration/routing/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

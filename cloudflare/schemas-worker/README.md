# Schema and skill projection Worker

This Worker is the production owner for `https://schemas.vik.guru/`. It serves
the schema cohort and public-ready skill closure accepted for `pages-v0.3.0`
from one reviewed source revision while GitHub Pages provides the richer visitor
and skill-reading surface.

The fetch handler runs before its `ASSETS` binding and owns HTTPS redirects,
exact-route lookup, media types, cache classes, conditional retrieval, CORS,
and bounded recovery responses. The earlier `cloudflare/schema-delivery/`
package remains a portable static adapter and supplies shared source templates
and response policy. Production delivery of `schemas.vik.guru` flows through
this Worker and the repository-owned GitHub Actions receiver.

## Accepted peer-release coordinate

The selected publication is bound to the reviewed Pages release:

| Role | Coordinate |
| --- | --- |
| Exact Worker publication | `8dd501d20ff6fb8c58b955ea920c703d9f702c03` |
| Semantic and schema source | `cfaa53f5b7500e3901d8470e1e471cd0230ff2a5` |
| Pages release | `pages-v0.3.0` |
| Annotated tag object | `a25f224cc9496c1e951dbb07ca45d8cfc415d46b` |
| Reviewed Pages projection | `2819c8564acfe5623288670ecef09639685a1db7` |
| Complete Pages closure | `9e4e9827a0fac3b42b4630ce0ce5a4ccdbc60c082c9efb607f65442160675288` |

`accepted-publication-lock.json` records the exact Worker-tree coordinate.
`publication-manifest.json` records the selected source and annotated Pages
coordinate. Preparation verifies the tag binding before it receives shared
files. The source revision remains the meaning and schema coordinate; the Pages
projection remains the reviewed peer artifact used for exact cross-receiver
comparison.

## Active production observation

The accepted Worker closure became active at `https://schemas.vik.guru/` on
2026-10-13 from accepted `prod@369b61b79dfe3d245c1193567d9f715263927670`.
The signed-out receiver check observed all 17 contracts, 33 schema routes, 27
public-ready skills, 86 skill artifacts, and 160 allowlisted routes. It also
established the declared redirect, byte, media-type, cache, CORS, validator,
conditional-request, `HEAD`, method, and bounded JSON `404` behavior. The
JavaScript-disabled browser check passed at 390 px and 1280 px. Issue
[#406](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/406)
carries the activation, Worker-version, and recovery receipt.

| Production role | Accepted coordinate |
| --- | --- |
| Production source | `prod@369b61b79dfe3d245c1193567d9f715263927670` |
| GitHub Actions run | `38411427064`, attempt 2 |
| GitHub deployment | `7040992633` |
| Active Worker version | `a21e8ecf-01c2-4bac-9c2c-db2a8371b817` |
| Active Cloudflare deployment | `3fc0be95-d114-43f7-bdea-470ab3b4d6b7` |
| Immediate recovery version | `4d258fa1-a350-4f8c-b0a9-fad20dcd0034` |
| Immediate recovery deployment | `5e904e29-d7af-4c96-8b51-7c16570b6c90` |

## Publication boundary

`tools/schema-receiver-routes.mjs` selects 17 schema contracts.
`tools/schema-publication.mjs` selects their 16 examples, contexts, and guide
companions. `tools/schema-publication-lock.json` binds every schema contract to
its accepted digest. The Worker publishes each contract through its established
route and its `/schemas/` asset route while preserving its canonical `$id`.

The accepted skill boundary contains 86 shared files under `/skills/`:

- `/skills/catalog.json` is the exact reviewed public-ready catalog.
- `/skills/<name>/projection.json` carries each of the 27 machine-readable
  projections at its declared `https://schemas.vik.guru/skills/<name>/projection.json`
  identity.
- `/skills/source/` carries 58 unique source files: all 27 exact `SKILL.md`
  semantic authorities, their declared public dependencies, and the catalog's
  supporting source.

GitHub Pages owns the 28 skill HTML discovery files: one Skills index and 27
readable skill pages. This Worker carries the shared catalog, projections, and
source closure, so `/skills/index.html` and `/skills/<name>/index.html` stay with
the Pages receiver. The six `public_possible` packages retain their
repository-only standing and remain outside every Worker route and artifact
manifest.

The complete checked-in Worker publication contains 127 regular files:

- 17 schemas and 16 companions;
- 86 skill catalog, projection, semantic-source, and dependency files;
- five attribution and data-use carriers; and
- the root registry, schema catalog, and publication manifest.

## Identity, retrieval, and exact bytes

Canonical schema and skill-projection identifiers express stable identity.
Host-local URLs express retrieval. A mirrored exact-version schema keeps its
original `$id` and bytes even when that identifier names another canonical
host. Each skill projection keeps its `schemas.vik.guru` identity and relative
references to the mirrored `/skills/catalog.json` and `/skills/source/`
closure.

The shared skill catalog is a byte-exact peer of the tagged Pages artifact. Its
Pages retrieval fields therefore continue to identify the reviewed Pages copy;
the projection `id` fields provide the canonical Worker routes. A future need
for a Worker-specific skill catalog would require its own named projection
rather than an in-place rewrite of this shared receipt.

Preparation compares every retained frozen resource with the existing
publication before writing. Earlier exact-version routes keep their published
bytes. A revised immutable contract receives a new versioned route.

## Media and cache policy

The publication manifest assigns each `/skills/` resource an explicit media
type and cache class:

| Resource | Media type | Cache class |
| --- | --- | --- |
| Skill catalog and projections | `application/json; charset=utf-8` | Revalidate |
| `SKILL.md`, references, and threadkeeping sources | `text/markdown; charset=utf-8` | Revalidate |
| Included workflow source | `application/yaml; charset=utf-8` | Revalidate |
| Included JavaScript and module sources | `text/javascript; charset=utf-8` | Revalidate |

Versionless skill resources can receive a later accepted source revision, so
successful responses use `public, max-age=0, must-revalidate`. The same policy
applies to catalogs, examples, contexts, guides, orientation, attribution, and
the publication manifest.

Sixteen exact-version schemas use `public, max-age=31536000, immutable` through
both their established and `/schemas/` routes. One route is already its own
`/schemas/` asset path, producing 31 unique immutable request paths. The
unversioned `prototype-local-manifest.schema.json` remains revalidatable.

Missing resources, asset failures, redirects, preflight responses, and
unsupported methods use `no-store`. Successful `HEAD` and conditional `304`
responses retain the selected resource's media, cache, CORS, and validator
policy.

## Prepare and check

Use Node.js 22 or newer. The initial selection names both accepted coordinates:

```sh
cd cloudflare/schemas-worker
npm ci --ignore-scripts --no-audit --no-fund
npm run prepare:publication -- \
  --source-revision cfaa53f5b7500e3901d8470e1e471cd0230ff2a5 \
  --pages-release-tag pages-v0.3.0
```

Validate the checked-in accepted release without consulting current source
selection or current source bytes:

```sh
npm run check:accepted-publication
npm test
```

The accepted-release check uses `accepted-publication-lock.json` to compare the
entire checked-in Worker tree with the exact commit that formed the publication.
It also validates the annotated Pages tag and complete closure digest, reads
skill selection from the manifest's accepted source revision, and confirms the
17-schema, 16-companion, and 86-file skill closure. The unit suite exercises the
same manifest through the production handler.

`npm run check:publication` retains a distinct job: it compares the prepared
artifact with current source and reports when a new publication release needs
to be formed. That check can report expected source drift while the pinned
accepted release remains internally complete and deployable. Use
`prepare:publication` with newly human-accepted source and Pages coordinates to
form a later release; preserve the accepted artifact until that decision.

A later accepted release uses two reviewed commits. First, merge the newly
prepared `public/` tree to `main`. Then update `accepted-publication-lock.json`
in a follow-up review to name that already formed publication commit. The
verifier requires the locked commit to precede `origin/main` and the receiving
candidate. Acceptance therefore begins on reviewed `main`; release and
production branches receive that coordinate.

Run the repository-owned boundary checks from the repository root:

```sh
npm run check:schemas
npm run check:readme-routes
npm run test:dependency-security
npm run security:secrets:artifact -- cloudflare/schemas-worker/public
```

The artifact secret-material check establishes the named generated boundary. It
does not inspect Cloudflare credentials or protected operator diagnostics;
those values stay in the platform secret store.

## Routes and response behavior

| Request | Response |
| --- | --- |
| HTTP | `308` to HTTPS with hostname, encoded path, and query preserved |
| `GET /` | Revalidating registry orientation with schema and skill-catalog discovery |
| Established schema URL | Manifest-owned retrieval of the selected schema bytes |
| `/schemas/` asset URL | Direct retrieval of the same schema bytes and identity |
| `/skills/catalog.json` | Exact accepted public-ready skill catalog |
| `/skills/<name>/projection.json` | The named projection at its canonical identity |
| `/skills/source/...` | Exact semantic source or declared public dependency |
| Missing resource | JSON `404` naming the requested path with `no-store` |
| Asset error or binding failure | Bounded error response with `no-store` |
| `HEAD` | Matching status and headers with an empty body |
| `OPTIONS` | Public read-only CORS preflight |

The asset binding uses `html_handling: "none"` because the handler maps `/`
explicitly to `/index.html`. ETags and conditional request handling continue to
come from `ASSETS`; the Worker applies the reviewed public headers, media type,
and cache class to the resulting response.

## Local and live observations

Start a local HTTPS preview from this directory:

```sh
npm run dev -- --local --local-protocol https
```

Use the preview's locally trusted certificate for HTTPS checks. Exercise every
schema contract, the complete skill catalog/projection/source closure, both
schema retrieval forms, explicit media types, cache classes, ETag/304, `HEAD`,
CORS, root discovery, and missing routes. The unit suite owns the HTTP-to-HTTPS
redirect case.

The checked-in checks divide the evidence by behavior:

- `test/receiver.test.mjs` exercises the handler against the prepared artifact,
  including all selected schemas and skill resources, their bytes, identities,
  media types, cache classes, conditional requests, `HEAD`, CORS, and failures.
- `test/manifest-transition.test.mjs` confirms that a fresh bundle activates a
  declared mutable-to-immutable schema transition while versionless skill
  resources continue to revalidate.
- `test/live-receiver.mjs` observes the running Worker and compares shared bytes
  with the accepted Pages peer coordinate.
- `test/catalog-source-preservation.test.mjs` distinguishes exact root bytes
  from the narrowly recorded Cloudflare edge addition.
- `test/catalog-browser.mjs` checks root discovery and horizontal containment at
  390 px and 1280 px with JavaScript unavailable.

Run the live and browser checks against an explicitly selected preview or
production origin:

```sh
npm run test:receiver -- https://schemas.vik.guru --http-origin http://schemas.vik.guru
npm run test:browser -- https://schemas.vik.guru
```

Local, dry-run, and live results establish only the environments they exercise.
The production observation supplies the edge, certificate, Custom Domain, and
signed-out response evidence.

## Production owner and activation gate

`.github/workflows/schema-delivery.yml` is the normal production route for
`schemas.vik.guru`, and it builds, checks, dry-runs, and deploys
`cloudflare/schemas-worker/`. The legacy static adapter retains its historical
and portability role under `cloudflare/schema-delivery/`; production Custom
Domain authority belongs to the schema Worker.

Issue #402 owns the Wrangler dependency gate. Both reviewed locks now resolve
Wrangler `4.149.0` through Miniflare `5.20261006.1-alpha` to stable Sharp
`0.35.5`. The repository dependency test proves that exact lock topology and
floor; schema-delivery CI also observes both installed trees. Human-controlled
receiver and dependency gates hold production activation until an explicitly
selected release reaches its production boundary.

The GitHub `prod` environment carries the non-sensitive
`CLOUDFLARE_ACCOUNT_ID` variable and the least-privilege
`CLOUDFLARE_API_TOKEN` secret. The exact-`prod` branch policy, accepted source,
disabled administrator bypass, active-receiver selection, and dependency gate
bound that credential to the production job. Repository variables return to
`DEPLOYMENT_ACTIVE_RECEIVERS=[]` and a held or absent dependency gate as soon as
the selected deployment job is admitted. The admitted job then completes its
bounded deployment.

The first connected activation preserved the accepted production coordinate:
its initial push ran the contract while the deployment stayed held, then a
full rerun of that same push opened the bounded deployment path at the same
`GITHUB_SHA` and `GITHUB_REF`. The contract passed and the deployment job was
admitted; both repository gates returned to rest before the admitted deployment
passed and the signed-out checks observed the live route.
[Environment guidance](../../.github/ENVIRONMENTS.md) records the current
private-repository reviewer boundary and Issue
[#481](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/481)
owns its public-transition follow-up.

`npm run deploy` remains an operator command for a separately authorized local
or recovery route. It checks the pinned accepted publication before invoking
Wrangler. The normal GitHub production receiver remains authoritative. A local
operator supplies the account coordinate and API token through the process
environment; `.dev.vars`, `.env.*`, and Wrangler runtime state remain ignored.
`wrangler secret put` manages Worker runtime secrets; deployment API tokens
enter through the process environment.

## Recovery

Worker version `4d258fa1-a350-4f8c-b0a9-fad20dcd0034` remains the immediate
platform recovery coordinate for this release. A later accepted deployment
advances that predecessor coordinate through its own durable receipt. The
repository retains reproducible source, the annotated Pages
peer coordinate, and every promised versioned schema byte. A forward repair
restores the complete accepted route set when an activation observation finds
friction; recovery preserves all previously published immutable routes.

Platform references: [asset-binding behavior](https://developers.cloudflare.com/workers/static-assets/binding/),
[Worker-first routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/),
and [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/).

### Catalog source and edge observation

The single root capture on 2026-10-04 UTC returned HTTP 200 HTML. All 8,116
authored bytes remained in their original order, with one 938-byte script
inserted immediately before the unique authored `</body>` boundary. The capture
stays in ignored local evidence. Its observed script references the platform's
challenge-detection route; that observation establishes a transformation shape
rather than independent script provenance or runtime security.

`test/catalog-source-preservation.mjs` accepts exact byte parity or that recorded
addition. The entire added program is fingerprinted after replacing only its
quoted 16-character lowercase-hex request value and canonical-base64 timestamp
containing ten decimal digits. Every other added byte, the insertion position,
and every authored byte remain exact. A changed edge shape receives another
bounded observation and review.

The 2026-10-13 production acceptance matched this recorded 938-byte addition at
both `/` and `/index.html`; every authored byte remained in order. That dated
match records current delivery evidence, while subsequent deliveries receive
fresh checks.

Conditional live checks use HTTP-standard weak ETag comparison: the quoted
opaque value stays identical while either header may carry the `W/` marker.
Malformed or missing validators fail the check. Exact schema and skill digests,
canonical identities, media types, and security settings retain their own
assertions. See [RFC 9110 sections 8.8.3 and 13.1.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.8.3).

# Dependency security floors for fast-uri and Worker tooling

## Desired state and current owner

The repository root resolves every `fast-uri` instance to exact version
`4.2.3`. The root and schema Worker resolve one reviewed toolchain:
Wrangler `4.155.0`, Miniflare `5.20261023.2-beta`, Undici `7.30.1`,
Workerd `1.20261023.1`, and Sharp `0.35.5`.

[Issue #659](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/659)
owns this successor decision and its acceptance evidence. Issue #292 and PR #291
established the earlier fast-uri floor. Issue #402 established the preceding
Wrangler and Sharp path. Those completed records retain their historical
coordinates.

After a root or schema-Worker dependency update, run the dependency-security
check and every affected schema, Worker, and Wrangler consumer before proposing
acceptance.

## Reviewed resolution

| Package or edge | Reviewed coordinate | Purpose in this repository |
| --- | --- | --- |
| `Ajv -> fast-uri` | `fast-uri 4.2.3` | Local schema parsing and validation |
| root and schema Worker | `wrangler 4.155.0` | Worker build, local emulation, dry run, and deployment tooling |
| `Wrangler -> Miniflare` | `5.20261023.2-beta` | Wrangler-owned Worker emulation |
| `Miniflare -> Undici` | `7.30.1` | HTTP behavior used by the development toolchain |
| `Miniflare -> Sharp` | `0.35.5` | Image support in the Wrangler toolchain |
| `Wrangler -> Workerd` | `1.20261023.1` | Local Worker runtime selected by Wrangler |

The root manifest pins `fast-uri 4.2.3` through npm's root-only override
mechanism. Ajv 8.20.0 declares `fast-uri ^3.0.1`; the exact override
intentionally crosses that range. Draft-07, 2020-12, schema-consumer, and URI
regressions therefore remain part of acceptance.

Both package authorities pin Wrangler `4.155.0`. Wrangler `4.153.0` is the
first release beyond the npm advisory range observed during this review;
`4.155.0` is the selected current-stable coordinate. Repository Worker tests,
all maintained Wrangler dry runs, and generated-byte checks establish its fit
for this codebase.

## Advisory observation

The fast-uri `4.2.3` floor covers four successor mechanisms:

- [GHSA-w74x-v6f9-j3xg](https://github.com/advisories/GHSA-w74x-v6f9-j3xg)
  — percent-encoded scheme handling;
- [GHSA-xhq7-xmqj-769h](https://github.com/advisories/GHSA-xhq7-xmqj-769h)
  — relative-reference normalization;
- [GHSA-wjr9-j795-jxcr](https://github.com/advisories/GHSA-wjr9-j795-jxcr)
  — domain-host delimiter handling before WHATWG canonicalization; and
- [GHSA-333x-w4r6-6crp](https://github.com/advisories/GHSA-333x-w4r6-6crp)
  — first-segment colon handling in suffix references.

The same floor retains the earlier corrections for
[CVE-2026-86472](https://github.com/fastify/fast-uri/security/advisories/GHSA-hrr3-gc8f-f4qj)
and
[CVE-2026-86818](https://github.com/fastify/fast-uri/security/advisories/GHSA-jvvf-x445-j334).

Undici `7.30.1` is the selected reviewed coordinate for the advisory set observed through
Wrangler and Miniflare: EventSource memory growth, Subresource Integrity
algorithm-token handling, excessive content-encoding failure, cross-origin
redirect cache handling, Agent TLS-option propagation, TLS 1.2
certificate-changing renegotiation, WebSocket PONG buffering, and
decompression-interceptor exception handling. Issue #659 links each advisory
record and preserves the pre-change audit receipt. The EventSource advisory
also covers Undici `>=8.0.0 <8.12.2`; the executable contract therefore admits
the exact selected `7.30.1` coordinate rather than treating every later major
as accepted.

Before this update, npm reported five affected package nodes in the root
development tree and three in the schema-Worker development tree. These counts
describe dependency-graph nodes rather than distinct vulnerability mechanisms.
Both production-only audits were clear because these packages belong to local
and CI build, validation, emulation, and deployment tooling. Static carriers
and deployed workerd receivers retain their separate runtime owners.

## Source-owned enforcement

The root `package.json` declares:

```json
"overrides": {
  "fast-uri": "4.2.3"
}
```

The root and `cloudflare/schemas-worker/package.json` each declare exact
Wrangler `4.155.0`. Their generated locks record the complete selected
resolution and integrity. The reviewed locks were regenerated with npm 10.9.9
under Node 22.23.4 and retain the accepted Sharp and libvips platform metadata.

The dependency-security test verifies the two manifest and lock authorities,
each installed package, the shared Wrangler closure, stable version floors,
Ajv's actual fast-uri resolution, the six fast-uri mechanisms, and both Ajv
schema dialect consumers.

## Fitting observations

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm --prefix cloudflare/schemas-worker ci --ignore-scripts --no-audit --no-fund
npm ls fast-uri --all
npm ls wrangler miniflare undici sharp workerd --all
npm --prefix cloudflare/schemas-worker ls wrangler miniflare undici sharp workerd --all
npm run test:dependency-security
node --test tests/investment-analysis/core.test.mjs tests/schema-pages/builder.test.mjs tests/narrative-architectures/schema-contracts.test.mjs
npm run check:schemas
npm --prefix cloudflare/schemas-worker run check:accepted-publication
npm --prefix cloudflare/schemas-worker test
npm --prefix cloudflare/schemas-worker run test:browser -- https://schemas.vik.guru
npm run build:schema-delivery
npm run check:schema-delivery
npm run dry-run:schema-delivery
npm run dry-run:schema-delivery:release
npm run dry-run:r2-video-delivery
npm run dry-run:context-canvas-field-pilot
npm run test:node-runtime
npm run check:node-routes
npm run check:readme-routes
npm run security:secrets:staged
npm audit --json
npm --prefix cloudflare/schemas-worker audit --json
npm audit --omit=dev --json
npm --prefix cloudflare/schemas-worker audit --omit=dev --json
```

A clean install establishes reproducibility. Dependency identity checks
establish the reviewed resolution. URI and Ajv regressions establish their
named parser behavior. Worker tests and dry runs establish repository consumer
compatibility. Audit output supplies the advisory inventory available at
observation time. Each signal retains its own evidence boundary.

The browser command observes continuity at the live accepted receiver. Local
Worker tests and Wrangler dry runs establish candidate compatibility. During a
selected publication cycle, `npm --prefix cloudflare/schemas-worker run
check:publication` compares the candidate source with the accepted publication;
source drift remains expected while publication is held.

## Scope, recovery, and retirement

This record covers the repository-root and schema-Worker npm installations.
Other dependency trees retain their own lockfiles and observations. The
accepted pre-change manifests and locks remain the recovery coordinate if a
consumer exposes a compatibility gap.

Retire or narrow the fast-uri override when each direct owner naturally resolves
a reviewed secure version, a clean install confirms the resulting graph, and
the focused compatibility checks pass. A later advisory, direct-dependency
upgrade, or changed Worker consumer reopens the version decision through
Issue #659 or a linked successor.

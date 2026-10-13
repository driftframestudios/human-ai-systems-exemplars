import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { weakETagMatches } from "./http-validators.mjs";
import { compareCatalogSource } from "./catalog-source-preservation.mjs";
import manifest from "../public/publication-manifest.json" with { type: "json" };
import schemaCatalog from "../public/schema-catalog.json" with { type: "json" };
import skillCatalog from "../public/skills/catalog.json" with { type: "json" };
import { cacheHeader, expectedContentType, skillArtifactPaths } from "./publication-contract.mjs";

const [origin, flag, httpOrigin, ...extra] = process.argv.slice(2);
assert(
  origin && extra.length === 0 && (flag === undefined || (flag === "--http-origin" && httpOrigin)),
  "Use: npm run test:receiver -- https://host [--http-origin http://host]",
);
const base = new URL(origin);
assert.equal(base.protocol, "https:");
assert.equal(base.href, `${base.origin}/`, "Supply an origin with an optional trailing slash");
const get = (path, options = {}) => fetch(new URL(path, base), {
  ...options,
  redirect: "manual",
  signal: AbortSignal.timeout(15000),
});
const publicAsset = (asset) => readFile(new URL(`../public${asset}`, import.meta.url));

function assertPublicHeaders(response, label) {
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*", label);
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff", label);
}

if (httpOrigin) {
  const insecure = new URL(httpOrigin);
  assert.equal(insecure.protocol, "http:");
  assert.equal(insecure.href, `${insecure.origin}/`);
  assert.equal(insecure.hostname, base.hostname);
  const response = await fetch(new URL("/a%20b?version=1", insecure), {
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 308, "HTTP redirect");
  const target = new URL("/a%20b?version=1", insecure);
  target.protocol = "https:";
  assert.equal(response.headers.get("Location"), target.href);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assertPublicHeaders(response, "HTTP redirect");
  await response.arrayBuffer();
}

const observations = new Map();
const catalogObservations = [];
for (const [path, resource] of Object.entries(manifest.resources)) {
  const response = await get(path);
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get("Content-Type"), resource.contentType, path);
  assert.equal(response.headers.get("Cache-Control"), cacheHeader(resource.cache), path);
  assertPublicHeaders(response, path);
  const received = Buffer.from(await response.arrayBuffer());
  const expected = await publicAsset(resource.asset);
  if (resource.contentType === "text/html; charset=utf-8") {
    const observation = compareCatalogSource(expected, received);
    assert(
      observation.classification === "exact-byte-parity" || observation.classification === "observed-edge-addition",
      `Catalog HTML requires exact source bytes or the recorded bounded edge addition: ${path}: ${observation.classification}`,
    );
    catalogObservations.push({ path, ...observation });
  } else {
    assert.deepEqual(received, expected, path);
    assert.ok(response.headers.get("ETag"), path);
  }
  observations.set(path, { bytes: received, etag: response.headers.get("ETag"), resource });
}
console.log(`Catalog source observations: ${JSON.stringify(catalogObservations)}`);

const liveManifest = JSON.parse(observations.get("/publication-manifest.json").bytes);
assert.deepEqual(liveManifest.peerRelease, {
  releaseTag: "pages-v0.3.0",
  tagObject: "a25f224cc9496c1e951dbb07ca45d8cfc415d46b",
  projectionRevision: "2819c8564acfe5623288670ecef09639685a1db7",
  closureSha256: "9e4e9827a0fac3b42b4630ce0ce5a4ccdbc60c082c9efb607f65442160675288",
});
assert.equal(liveManifest.sourceRevision, "cfaa53f5b7500e3901d8470e1e471cd0230ff2a5");

let schemaRoutes = 0;
for (const contract of schemaCatalog.contracts) {
  const canonical = `/${contract.path}`;
  const asset = manifest.routes[canonical];
  assert.ok(asset, canonical);
  for (const path of new Set([canonical, asset])) {
    const response = await get(path);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(response.status, 200, path);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), contract.sha256, path);
    assert.equal(JSON.parse(bytes).$id, contract.canonicalId, path);
    schemaRoutes += 1;
  }
}

const skillPaths = skillArtifactPaths(skillCatalog);
assert.equal(skillCatalog.skills.length, 27);
assert.equal(skillPaths.length, 86);
for (const [index, skill] of skillCatalog.skills.entries()) {
  const path = `/skills/${skill.projectionPath}`;
  const projection = JSON.parse(await publicAsset(path));
  assert.equal(projection.id, `https://schemas.vik.guru${path}`, skill.name);
  assert.equal(projection.semanticAuthorityRef, `../${skill.sourceRoute}`, skill.name);
  assert.equal(projection.sourceRef, `../catalog.json#/skills/${index}`, skill.name);
}

const validatorRepresentatives = [
  "/investment-analysis/0.2.0/state.schema.json",
  "/context-canvas-project-surface/context-canvas/prototypes/prototype-local-manifest.schema.json",
  "/schemas/context-canvas/1.0.0/context-canvas.context.jsonld",
  "/skills/catalog.json",
  "/skills/source/.agents/skills/audit-anthropomorphic-cues/SKILL.md",
  "/skills/source/context-canvas-project-surface/context-canvas/atlas-gallery.js",
  "/skills/source/tests/visualization-fidelity-atlas/atlas-gallery.browser.mjs",
  "/attribution.yml",
  "/CITATION.cff",
  "/AUTHORS",
];
for (const path of validatorRepresentatives) {
  const { etag, resource } = observations.get(path) ?? {};
  assert.ok(resource, `validator representative is listed: ${path}`);
  assert.ok(etag, `validator representative has ETag: ${path}`);
  const conditional = await get(path, { headers: { "If-None-Match": etag } });
  assert.equal(conditional.status, 304, path);
  assert(weakETagMatches(conditional.headers.get("ETag"), etag), `conditional validator: ${path}`);
  assert.equal(conditional.headers.get("Content-Type"), resource.contentType, path);
  assert.equal(conditional.headers.get("Cache-Control"), cacheHeader(resource.cache), path);
  assertPublicHeaders(conditional, path);
  assert.equal(await conditional.text(), "", path);

  const head = await get(path, { method: "HEAD" });
  assert.equal(head.status, 200, path);
  assert(weakETagMatches(head.headers.get("ETag"), etag), `HEAD validator: ${path}`);
  assert.equal(head.headers.get("Content-Type"), resource.contentType, path);
  assert.equal(head.headers.get("Cache-Control"), cacheHeader(resource.cache), path);
  assertPublicHeaders(head, path);
  assert.equal(await head.text(), "", path);
}

const unavailablePaths = [
  "/schemas/missing.json",
  "/investment-analysis/0.2.0/missing.schema.json",
  "/skills/missing/projection.json",
];
for (const path of unavailablePaths) {
  const response = await get(path);
  assert.equal(response.status, 404, path);
  assert.equal(response.headers.get("Cache-Control"), "no-store", path);
  assert.equal(response.headers.get("Content-Type"), "application/json; charset=utf-8", path);
  assertPublicHeaders(response, path);
  assert.equal((await response.json()).resource, path);
}

const options = await get("/skills/catalog.json", {
  method: "OPTIONS",
  headers: {
    Origin: "https://receiver.example",
    "Access-Control-Request-Method": "GET",
    "Access-Control-Request-Headers": "If-None-Match",
  },
});
assert.equal(options.status, 204);
assert.equal(options.headers.get("Access-Control-Allow-Origin"), "*");
assert.equal(options.headers.get("Access-Control-Allow-Methods"), "GET, HEAD, OPTIONS");
assert.equal(options.headers.get("Access-Control-Allow-Headers"), "If-None-Match, If-Modified-Since");
assert.equal(options.headers.get("Access-Control-Expose-Headers"), "ETag");
assert.equal(options.headers.get("Cache-Control"), "no-store");
assert.equal(await options.text(), "");

const post = await get("/skills/catalog.json", { method: "POST" });
assert.equal(post.status, 405);
assert.equal(post.headers.get("Allow"), "GET, HEAD, OPTIONS");
assert.equal(post.headers.get("Cache-Control"), "no-store");
assert.equal((await post.json()).resource, "/skills/catalog.json");

for (const [path, resource] of Object.entries(manifest.resources)) {
  assert.equal(resource.contentType, expectedContentType(resource.asset), path);
}
console.log(
  `PASS: ${schemaCatalog.contracts.length} contracts, ${schemaRoutes} schema routes, ${skillCatalog.skills.length} skills, ` +
  `${skillPaths.length} skill artifacts, ${Object.keys(manifest.resources).length} allowlisted routes, exact bytes/media/cache/CORS, ` +
  `representative ETag/304/HEAD, fail-closed JSON 404, method policy and peer coordinate; HTTP redirect ${httpOrigin ? "checked" : "covered by unit test"}.`,
);

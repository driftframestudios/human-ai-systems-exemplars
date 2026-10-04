import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { weakETagMatches } from "./http-validators.mjs";
import { compareCatalogSource } from "./catalog-source-preservation.mjs";
import manifest from "../public/publication-manifest.json" with { type: "json" };
import catalog from "../public/schema-catalog.json" with { type: "json" };

const [origin, flag, httpOrigin, ...extra] = process.argv.slice(2);
assert(origin && extra.length === 0 && (flag === undefined || (flag === "--http-origin" && httpOrigin)), "Use: npm run test:receiver -- https://host [--http-origin http://host]");
const base = new URL(origin);
assert.equal(base.protocol, "https:");
assert.equal(base.href, `${base.origin}/`, "Supply an origin with an optional trailing slash");
const frozen = new Set(manifest.frozen);
const policy = (path) => frozen.has(path) ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate";
const get = (path, options = {}) => fetch(new URL(path, base), { ...options, redirect: "manual", signal: AbortSignal.timeout(15000) });

if (httpOrigin) {
  const insecure = new URL(httpOrigin);
  assert.equal(insecure.protocol, "http:");
  assert.equal(insecure.href, `${insecure.origin}/`);
  assert.equal(insecure.hostname, base.hostname);
  const response = await fetch(new URL("/a%20b?version=1", insecure), { redirect: "manual", signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 308, "HTTP redirect");
  const target = new URL("/a%20b?version=1", insecure);
  target.protocol = "https:";
  assert.equal(response.headers.get("Location"), target.href);
  await response.arrayBuffer();
}

const root = await get("/");
assert.equal(root.status, 200, "direct catalog root");
assert.equal(root.headers.get("Cache-Control"), policy("/"));
const catalogObservation = compareCatalogSource(
  await readFile(new URL("../public/index.html", import.meta.url)),
  Buffer.from(await root.arrayBuffer()),
);
console.log(`Catalog source observation: ${JSON.stringify(catalogObservation)}`);
let routes = 0;
for (const contract of catalog.contracts) {
  const canonical = `/${contract.path}`;
  for (const path of new Set([canonical, manifest.routes[canonical]])) {
    assert.ok(path, "contract asset route");
    const response = await get(path);
    assert.equal(response.status, 200, path);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(createHash("sha256").update(bytes).digest("hex"), contract.sha256, path);
    assert.equal(JSON.parse(bytes).$id, contract.canonicalId, path);
    assert.equal(response.headers.get("Cache-Control"), policy(path), path);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*", path);
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff", path);
    const etag = response.headers.get("ETag");
    assert.ok(etag, path);
    const conditional = await get(path, { headers: { "If-None-Match": etag } });
    assert.equal(conditional.status, 304, path);
    assert(weakETagMatches(conditional.headers.get("ETag"), etag), `conditional validator: ${path}`);
    assert.equal(conditional.headers.get("Cache-Control"), policy(path), path);
    assert.equal(await conditional.text(), "", path);
    const head = await get(path, { method: "HEAD" });
    assert.equal(head.status, 200, path);
    assert(weakETagMatches(head.headers.get("ETag"), etag), `HEAD validator: ${path}`);
    assert.equal(head.headers.get("Cache-Control"), policy(path), path);
    assert.equal(await head.text(), "", path);
    routes += 1;
  }
}
for (const path of ["/publication-manifest.json", "/schema-catalog.json", "/schemas/schema-catalog.json", "/investment-analysis/0.2.0/example.json", "/context-canvas/1.0.0/context-canvas.context.jsonld"]) {
  const response = await get(path);
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get("Cache-Control"), policy(path), path);
  const asset = manifest.routes[path] ?? path;
  assert.equal(await response.text(), await readFile(new URL(`../public${asset}`, import.meta.url), "utf8"));
}
for (const path of ["/schemas/missing.json", "/investment-analysis/0.2.0/missing.schema.json", "/schemas/investment-analysis/0.2.0/missing.schema.json"]) {
  const response = await get(path);
  assert.equal(response.status, 404, path);
  assert.equal(response.headers.get("Cache-Control"), "no-store", path);
  assert.match(response.headers.get("Content-Type"), /^application\/json\b/);
  assert.equal((await response.json()).resource, path);
}
const options = await get("/", { method: "OPTIONS" });
assert.equal(options.status, 204);
assert.equal(options.headers.get("Access-Control-Allow-Methods"), "GET, HEAD, OPTIONS");
assert.equal(options.headers.get("Cache-Control"), "no-store");
assert(
  catalogObservation.classification === "exact-byte-parity" || catalogObservation.classification === "observed-edge-addition",
  `Catalog HTML requires exact source bytes or the recorded bounded edge addition: ${catalogObservation.classification}`,
);
console.log(`PASS: ${catalog.contracts.length} contracts, ${routes} schema routes, digests, identities, cache, ETag/304, HEAD, root, discovery, JSON 404 and CORS; HTTP redirect ${httpOrigin ? "checked" : "covered by unit test"}.`);

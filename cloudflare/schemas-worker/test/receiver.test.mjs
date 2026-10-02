import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import worker from "../src/index.js";
import manifest from "../public/publication-manifest.json" with { type: "json" };
import catalog from "../public/schema-catalog.json" with { type: "json" };

const base = "https://schemas.vik.guru";
const immutable = "public, max-age=31536000, immutable";
const revalidate = "public, max-age=0, must-revalidate";
const mutable = "/context-canvas-project-surface/context-canvas/prototypes/prototype-local-manifest.schema.json";
const publicRoot = new URL("../public/", import.meta.url);
const calls = [];
const env = { ASSETS: { async fetch(request) {
  const url = new URL(request.url);
  calls.push({ pathname: url.pathname, search: url.search, method: request.method });
  let bytes;
  try {
    bytes = await readFile(fileURLToPath(new URL(`.${url.pathname}`, publicRoot)));
  } catch (error) {
    if (error.code === "ENOENT") return new Response("Asset missing", { status: 404 });
    throw error;
  }
  const etag = `"${createHash("sha256").update(bytes).digest("hex")}"`;
  const headers = { ETag: etag, "Content-Type": url.pathname.endsWith(".json") ? "application/json" : "text/html" };
  if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : bytes, { headers });
} } };
const request = (path, options) => new Request(base + path, options);

test("configuration keeps Worker-owned root routing and the production binding explicit", async () => {
  const config = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  assert.equal(config.assets.run_worker_first, true);
  assert.equal(config.assets.html_handling, "none");
  assert.equal(config.assets.not_found_handling, "none");
  assert.equal(config.workers_dev, false);
  assert.deepEqual(config.routes, [{ pattern: "schemas.vik.guru", custom_domain: true }]);
});

test("HTTPS redirect retains the hostname, encoded path and query", async () => {
  const response = await worker.fetch(new Request("http://schemas.vik.guru/a%20b?version=1&mode=read"), env);
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("Location"), "https://schemas.vik.guru/a%20b?version=1&mode=read");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("root serves the accepted HTML directly through an explicit index request", async () => {
  const response = await worker.fetch(request("/?view=registry"), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), revalidate);
  assert.equal(await response.text(), await readFile(new URL("index.html", publicRoot), "utf8"));
  assert.deepEqual(calls.at(-1), { pathname: "/index.html", search: "?view=registry", method: "GET" });
});

test("all 13 contracts preserve bytes, identities, both routes, cache policies and ETags", async () => {
  assert.equal(catalog.contracts.length, 13);
  assert.equal(new Set(manifest.frozen).size, 23);
  assert.equal(manifest.frozen.length, 23);
  for (const contract of catalog.contracts) {
    const canonicalPath = `/${contract.path}`;
    const expectedPolicy = canonicalPath === mutable ? revalidate : immutable;
    for (const path of new Set([canonicalPath, manifest.routes[canonicalPath]])) {
      assert.ok(path);
      const response = await worker.fetch(request(path), env);
      assert.equal(response.status, 200, path);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(createHash("sha256").update(bytes).digest("hex"), contract.sha256, path);
      assert.equal(JSON.parse(bytes).$id, contract.canonicalId, path);
      assert.equal(response.headers.get("Cache-Control"), expectedPolicy, path);
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*", path);
      assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff", path);
      const etag = response.headers.get("ETag");
      assert.ok(etag);
      const conditional = await worker.fetch(request(path, { headers: { "If-None-Match": etag } }), env);
      assert.equal(conditional.status, 304, path);
      assert.equal(conditional.headers.get("ETag"), etag, path);
      assert.equal(conditional.headers.get("Cache-Control"), expectedPolicy, path);
      assert.equal(await conditional.text(), "", path);
      const head = await worker.fetch(request(path, { method: "HEAD" }), env);
      assert.equal(head.status, 200, path);
      assert.equal(head.headers.get("ETag"), etag, path);
      assert.equal(await head.text(), "", path);
    }
  }
});

test("examples, context companion, discovery and attribution remain revalidatable", async () => {
  for (const path of ["/publication-manifest.json", "/schema-catalog.json", "/AUTHORS", "/investment-analysis/0.2.0/example.json", "/context-canvas/1.0.0/context-canvas.context.jsonld"]) {
    const response = await worker.fetch(request(path), env);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("Cache-Control"), revalidate, path);
  }
});

test("missing resources preserve the requested path and remain uncached", async () => {
  for (const path of ["/missing.schema.json", "/investment-analysis/0.2.0/missing.schema.json", "/schemas/investment-analysis/0.2.0/missing.schema.json", "/constructor", "/__proto__"]) {
    const response = await worker.fetch(request(path), env);
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get("Cache-Control"), "no-store", path);
    assert.equal((await response.json()).resource, path);
    const head = await worker.fetch(request(path, { method: "HEAD" }), env);
    assert.equal(head.status, 404, path);
    assert.equal(await head.text(), "", path);
  }
});

test("both guide routes resolve their relative catalog link to the same mutable receipt", async () => {
  const expected = await readFile(new URL("schema-catalog.json", publicRoot), "utf8");
  for (const guide of ["/investment-analysis/0.2.0/README.md", "/schemas/investment-analysis/0.2.0/README.md"]) {
    const guideResponse = await worker.fetch(request(guide), env);
    assert.equal(guideResponse.status, 200);
    const markdown = await guideResponse.text();
    assert.ok(markdown.includes("../../schema-catalog.json"));
    const target = new URL("../../schema-catalog.json", base + guide).pathname;
    const response = await worker.fetch(request(target), env);
    assert.equal(response.status, 200, target);
    assert.equal(response.headers.get("Cache-Control"), revalidate, target);
    assert.equal(await response.text(), expected, target);
    const conditional = await worker.fetch(request(target, { headers: { "If-None-Match": response.headers.get("ETag") } }), env);
    assert.equal(conditional.status, 304, target);
    assert.equal(conditional.headers.get("Cache-Control"), revalidate, target);
  }
});

test("asset failures keep bounded no-store responses", async () => {
  const upstream = await worker.fetch(request("/schema.json"), { ASSETS: { fetch: async () => new Response("Temporarily unavailable", { status: 503 }) } });
  assert.equal(upstream.status, 503);
  assert.equal(upstream.headers.get("Cache-Control"), "no-store");
  const thrown = await worker.fetch(request("/schema.json"), { ASSETS: { fetch: async () => { throw new Error("private diagnostic"); } } });
  assert.equal(thrown.status, 503);
  assert.equal(thrown.headers.get("Cache-Control"), "no-store");
  assert.equal((await thrown.json()).error, "Schema delivery temporarily unavailable");
});

test("preflight and unsupported methods retain the read-only boundary", async () => {
  const options = await worker.fetch(request("/schema.json", { method: "OPTIONS" }), env);
  assert.equal(options.status, 204);
  assert.equal(options.headers.get("Access-Control-Allow-Methods"), "GET, HEAD, OPTIONS");
  assert.equal(options.headers.get("Access-Control-Expose-Headers"), "ETag");
  const post = await worker.fetch(request("/schema.json", { method: "POST", body: "proposed change" }), env);
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("Allow"), "GET, HEAD, OPTIONS");
  assert.equal(post.headers.get("Cache-Control"), "no-store");
});

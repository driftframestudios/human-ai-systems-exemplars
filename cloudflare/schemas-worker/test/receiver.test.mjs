import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import worker from "../src/index.js";
import manifest from "../public/publication-manifest.json" with { type: "json" };
import schemaCatalog from "../public/schema-catalog.json" with { type: "json" };
import skillCatalog from "../public/skills/catalog.json" with { type: "json" };
import {
  cacheHeader,
  expectedContentType,
  regularFilePaths,
  sha256,
  skillArtifactPaths,
} from "./publication-contract.mjs";

const workerOrigin = "https://schemas.example";
const publicRoot = fileURLToPath(new URL("../public/", import.meta.url));
const publicRootUrl = new URL("../public/", import.meta.url);
const mutableSchema = "/context-canvas-project-surface/context-canvas/prototypes/prototype-local-manifest.schema.json";

function publicationBytes(asset) {
  assert.match(asset, /^\/(?!.*(?:^|\/)\.\.(?:\/|$)).+/u);
  return readFile(new URL(`.${asset}`, publicRootUrl));
}

function etagFor(bytes) {
  return `"${createHash("sha256").update(bytes).digest("hex")}"`;
}

function publicationEnvironment(observation = {}) {
  return {
    ASSETS: {
      async fetch(request) {
        observation.calls = (observation.calls ?? 0) + 1;
        observation.requests ??= [];
        observation.requests.push(request);
        const bytes = await publicationBytes(new URL(request.url).pathname);
        const etag = etagFor(bytes);
        const headers = { ETag: etag, "Content-Type": "application/octet-stream" };
        if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
        return new Response(request.method === "HEAD" ? null : bytes, { headers });
      },
    },
  };
}

async function fetchWorker(path, options, env = publicationEnvironment()) {
  return worker.fetch(new Request(new URL(path, workerOrigin), options), env);
}

function assertPublicHeaders(response, label) {
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*", label);
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff", label);
}

test("Wrangler keeps the Worker authoritative for every custom-domain path", async () => {
  const config = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  assert.equal(config.assets.binding, "ASSETS");
  assert.equal(config.assets.run_worker_first, true);
  assert.equal(config.assets.html_handling, "none");
  assert.equal(config.assets.not_found_handling, "none");
  assert.equal(config.workers_dev, false);
  assert.deepEqual(config.routes, [{ pattern: "schemas.vik.guru", custom_domain: true }]);
});

test("the publication media-type table uses the exact receiver literals", () => {
  for (const [path, contentType] of [
    ["contract.json", "application/json; charset=utf-8"],
    ["context.jsonld", "application/ld+json; charset=utf-8"],
    ["source.md", "text/markdown; charset=utf-8"],
    ["source.js", "text/javascript; charset=utf-8"],
    ["source.mjs", "text/javascript; charset=utf-8"],
    ["attribution.yml", "application/yaml; charset=utf-8"],
    ["attribution.yaml", "application/yaml; charset=utf-8"],
    ["CITATION.cff", "application/yaml; charset=utf-8"],
    ["index.html", "text/html; charset=utf-8"],
    ["AUTHORS", "text/plain; charset=utf-8"],
    ["LICENSE", "text/plain; charset=utf-8"],
  ]) assert.equal(expectedContentType(path), contentType, path);
  assert.throws(() => expectedContentType("unknown.bin"), /No declared publication media type/u);
});

test("the v2 manifest is the exact 17-contract and 27-skill publication allowlist", async () => {
  assert.equal(manifest.schemaVersion, "2");
  assert.equal(manifest.sourceRevision, "c1e35fdd57c2193812c2b183955aca15a5020be8");
  assert.deepEqual(manifest.peerRelease, {
    releaseTag: "pages-v0.3.1",
    tagObject: "15c9a0ced1a49f3f20797682282526a95afbef88",
    projectionRevision: "fbf568496b90cf26cb0de5993189801d8a8c2be9",
    closureSha256: "b20fe3e1932566dae2508aa8e4c994945ebdc5bb011a0476c00b1c80dfb59ed0",
  });
  assert.equal(schemaCatalog.sourceRevision, manifest.sourceRevision);
  assert.equal(skillCatalog.sourceRevision, manifest.sourceRevision);
  assert.equal(schemaCatalog.contracts.length, 17);
  assert.equal(skillCatalog.skills.length, 27);
  assert.equal(new Set(skillCatalog.skills.map(({ name }) => name)).size, 27);

  const skillPaths = skillArtifactPaths(skillCatalog);
  assert.equal(skillPaths.length, 86);
  assert.equal(manifest.inventory.length, 127);
  assert.deepEqual(manifest.inventory, [...manifest.inventory].sort((left, right) => left.localeCompare(right)));
  assert.equal(new Set(manifest.inventory).size, manifest.inventory.length);
  assert.deepEqual(
    (await regularFilePaths(publicRoot)).sort((left, right) => left.localeCompare(right)),
    manifest.inventory,
  );
  assert.deepEqual(manifest.inventory.filter((path) => path.startsWith("skills/")), skillPaths);

  assert.deepEqual(manifest.resources["/"], {
    asset: "/index.html",
    contentType: "text/html; charset=utf-8",
    cache: "revalidate",
  });
  for (const path of manifest.inventory) {
    assert.deepEqual(manifest.resources[`/${path}`], {
      asset: `/${path}`,
      contentType: expectedContentType(path),
      cache: manifest.frozen.includes(`/${path}`) ? "immutable" : "revalidate",
    }, path);
  }
  for (const [requestPath, asset] of Object.entries(manifest.routes)) {
    assert.equal(manifest.resources[requestPath]?.asset, asset, requestPath);
  }

  assert.equal(Object.keys(manifest.resources).length, 160);
  assert.equal(manifest.frozen.length, 31);
  assert.deepEqual(manifest.frozen, [...manifest.frozen].sort());
  assert.equal(new Set(manifest.frozen).size, manifest.frozen.length);
  const inventory = new Set(manifest.inventory.map((path) => `/${path}`));
  for (const [requestPath, resource] of Object.entries(manifest.resources)) {
    assert.deepEqual(Object.keys(resource).sort(), ["asset", "cache", "contentType"]);
    assert(inventory.has(resource.asset), `${requestPath} maps inside the selected inventory`);
    assert.equal(resource.contentType, expectedContentType(resource.asset), requestPath);
    assert.equal(resource.cache, manifest.frozen.includes(requestPath) ? "immutable" : "revalidate", requestPath);
  }
});

test("HTTP redirects preserve encoded paths and queries with public no-store headers", async () => {
  const response = await worker.fetch(
    new Request("http://schemas.example/a%20b?version=1"),
    { ASSETS: { fetch() { throw new Error("redirects never reach assets"); } } },
  );
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("Location"), "https://schemas.example/a%20b?version=1");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assertPublicHeaders(response, "HTTP redirect");
});

test("root requests select index.html without losing their query", async () => {
  const observation = {};
  const response = await fetchWorker("/?view=catalog", undefined, publicationEnvironment(observation));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("Cache-Control"), cacheHeader("revalidate"));
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), await publicationBytes("/index.html"));
  assert.equal(observation.requests.length, 1);
  assert.equal(new URL(observation.requests[0].url).pathname, "/index.html");
  assert.equal(new URL(observation.requests[0].url).search, "?view=catalog");
});

test("every listed route has exact bytes, media type, cache policy, validators, HEAD, and CORS", async () => {
  const env = publicationEnvironment();
  for (const [path, resource] of Object.entries(manifest.resources)) {
    const expected = await publicationBytes(resource.asset);
    const response = await fetchWorker(`${path}?contract=1`, undefined, env);
    assert.equal(response.status, 200, path);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected, path);
    assert.equal(response.headers.get("Content-Type"), resource.contentType, path);
    assert.equal(response.headers.get("Cache-Control"), cacheHeader(resource.cache), path);
    assertPublicHeaders(response, path);
    const etag = response.headers.get("ETag");
    assert.equal(etag, etagFor(expected), path);

    const conditional = await fetchWorker(path, { headers: { "If-None-Match": etag } }, env);
    assert.equal(conditional.status, 304, path);
    assert.equal(conditional.headers.get("ETag"), etag, path);
    assert.equal(conditional.headers.get("Content-Type"), resource.contentType, path);
    assert.equal(conditional.headers.get("Cache-Control"), cacheHeader(resource.cache), path);
    assertPublicHeaders(conditional, path);
    assert.equal(await conditional.text(), "", path);

    const head = await fetchWorker(path, { method: "HEAD" }, env);
    assert.equal(head.status, 200, path);
    assert.equal(head.headers.get("ETag"), etag, path);
    assert.equal(head.headers.get("Content-Type"), resource.contentType, path);
    assert.equal(head.headers.get("Cache-Control"), cacheHeader(resource.cache), path);
    assertPublicHeaders(head, path);
    assert.equal(await head.text(), "", path);
  }
});

test("all 17 schema contracts retain canonical and direct-asset identities", async () => {
  for (const contract of schemaCatalog.contracts) {
    const canonical = `/${contract.path}`;
    const asset = manifest.routes[canonical];
    assert.ok(asset, canonical);
    assert.equal(manifest.resources[canonical].asset, asset, canonical);
    for (const path of new Set([canonical, asset])) {
      const response = await fetchWorker(path);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(response.status, 200, path);
      assert.equal(sha256(bytes), contract.sha256, path);
      assert.equal(JSON.parse(bytes).$id, contract.canonicalId, path);
      const expectedCache = canonical === mutableSchema ? "revalidate" : "immutable";
      assert.equal(manifest.resources[path].cache, expectedCache, path);
    }
  }
});

test("the 27-skill machine/source closure is complete, linked, and revalidating", async () => {
  const paths = skillArtifactPaths(skillCatalog);
  assert.equal(paths.length, 86);
  assert(paths.every((path) => !path.endsWith("/index.html")));
  assert(skillCatalog.skills.every(({ publicationStanding }) => publicationStanding === "public_ready"));
  assert.equal(skillCatalog.skills.length, 27);

  const sourceRecords = new Map();
  const addSource = (path, digest) => {
    const prior = sourceRecords.get(path);
    if (prior) assert.equal(prior, digest, path);
    else sourceRecords.set(path, digest);
  };
  for (const [index, skill] of skillCatalog.skills.entries()) {
    addSource(skill.sourceRoute, skill.sourceSha256);
    for (const dependency of skill.dependencies) addSource(dependency.path, dependency.sha256);
    const projectionPath = `/skills/${skill.projectionPath}`;
    const projection = JSON.parse(await publicationBytes(projectionPath));
    assert.equal(projection.name, skill.name, skill.name);
    assert.equal(projection.id, `https://schemas.vik.guru${projectionPath}`, skill.name);
    const authority = new URL(projection.semanticAuthorityRef, `https://schemas.vik.guru${projectionPath}`);
    assert.equal(authority.pathname, `/skills/${skill.sourceRoute}`, skill.name);
    const sourceRef = new URL(projection.sourceRef, `https://schemas.vik.guru${projectionPath}`);
    assert.equal(sourceRef.pathname, "/skills/catalog.json", skill.name);
    assert.equal(sourceRef.hash, `#/skills/${index}`, skill.name);
  }
  for (const source of skillCatalog.supportingSources) addSource(source.path, source.sha256);
  assert.equal(sourceRecords.size, 58);
  for (const [path, digest] of sourceRecords) {
    assert.equal(sha256(await publicationBytes(`/skills/${path}`)), digest, path);
  }
  for (const path of paths) {
    const route = `/${path}`;
    assert.deepEqual(manifest.resources[route], {
      asset: route,
      contentType: expectedContentType(path),
      cache: "revalidate",
    }, route);
  }
});

test("guide aliases resolve relative to the schema catalog with explicit Markdown media types", () => {
  for (const guide of schemaCatalog.contracts.flatMap(({ guidePaths = [] }) => guidePaths)) {
    const route = new URL(guide, "https://schemas.vik.guru/schema-catalog.json").pathname;
    assert.equal(manifest.resources[route]?.contentType, "text/markdown; charset=utf-8", route);
    assert.equal(manifest.resources[route]?.cache, "revalidate", route);
  }
});

test("unlisted paths fail closed before even a successful asset binding", async () => {
  for (const path of [
    "/schemas/missing.json",
    "/skills/missing/projection.json",
    "/skills/source/.agents/skills/missing/SKILL.md",
    "/constructor",
    "/__proto__",
  ]) {
    const observation = { calls: 0 };
    const env = { ASSETS: { async fetch() { observation.calls += 1; return new Response("should not escape", { status: 200 }); } } };
    const response = await fetchWorker(path, undefined, env);
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get("Cache-Control"), "no-store", path);
    assert.equal(response.headers.get("Content-Type"), "application/json; charset=utf-8", path);
    assert.equal((await response.json()).resource, path, path);
    assert.equal(observation.calls, 0, path);

    const head = await fetchWorker(path, { method: "HEAD" }, env);
    assert.equal(head.status, 404, path);
    assert.equal(head.headers.get("Cache-Control"), "no-store", path);
    assert.equal(await head.text(), "", path);
    assert.equal(observation.calls, 0, path);
  }
});

test("listed binding failures are bounded and never cacheable", async () => {
  const path = "/skills/catalog.json";
  const missing = await fetchWorker(path, undefined, { ASSETS: { async fetch() { return new Response("binding detail", { status: 404 }); } } });
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get("Cache-Control"), "no-store");
  assert.equal((await missing.json()).resource, path);

  const unavailable = await fetchWorker(path, undefined, { ASSETS: { async fetch() { return new Response("temporary", { status: 503 }); } } });
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get("Cache-Control"), "no-store");
  assert.equal(unavailable.headers.get("Content-Type"), "application/json; charset=utf-8");
  assert.deepEqual(await unavailable.json(), {
    error: "Schema delivery temporarily unavailable",
    resource: path,
  });

  const thrown = await fetchWorker(path, undefined, { ASSETS: { async fetch() { throw new Error("private diagnostic"); } } });
  assert.equal(thrown.status, 503);
  assert.equal(thrown.headers.get("Cache-Control"), "no-store");
  assert.equal((await thrown.json()).resource, path);
});

test("OPTIONS and method rejection expose the public CORS contract without caching", async () => {
  const env = { ASSETS: { fetch() { throw new Error("non-read methods never reach assets"); } } };
  const options = await fetchWorker("/skills/catalog.json", {
    method: "OPTIONS",
    headers: {
      Origin: "https://receiver.example",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "If-None-Match",
    },
  }, env);
  assert.equal(options.status, 204);
  assert.equal(options.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(options.headers.get("Access-Control-Allow-Methods"), "GET, HEAD, OPTIONS");
  assert.equal(options.headers.get("Access-Control-Allow-Headers"), "If-None-Match, If-Modified-Since");
  assert.equal(options.headers.get("Access-Control-Expose-Headers"), "ETag");
  assert.equal(options.headers.get("Cache-Control"), "no-store");
  assert.equal(await options.text(), "");

  const post = await fetchWorker("/skills/catalog.json", { method: "POST" }, env);
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("Allow"), "GET, HEAD, OPTIONS");
  assert.equal(post.headers.get("Cache-Control"), "no-store");
  assert.equal((await post.json()).resource, "/skills/catalog.json");
});

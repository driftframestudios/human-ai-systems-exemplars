import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

test("a fresh Worker bundle applies the manifest's mutable-to-frozen transition", async () => {
  const directory = await mkdtemp(join(tmpdir(), "schema-cache-transition-"));
  const source = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  const body = '{"fixture":"cache-policy"}';
  const etag = '"fixture-v1"';
  try {
    for (const [name, frozen, policy] of [
      ["mutable", [], "public, max-age=0, must-revalidate"],
      ["frozen", ["/schemas/test.json"], "public, max-age=31536000, immutable"],
    ]) {
      let calls = 0;
      const env = { ASSETS: { async fetch(request) {
        calls += 1;
        const headers = { ETag: etag, "Content-Type": "application/octet-stream" };
        return request.headers.get("If-None-Match") === etag
          ? new Response(null, { status: 304, headers })
          : new Response(body, { headers });
      } } };
      const root = join(directory, name);
      await mkdir(join(root, "src"), { recursive: true });
      await mkdir(join(root, "public"));
      await writeFile(join(root, "package.json"), '{"type":"module"}');
      await writeFile(join(root, "src/index.js"), source);
      await writeFile(join(root, "public/publication-manifest.json"), JSON.stringify({
        schemaVersion: "2",
        frozen,
        routes: {},
        resources: {
          "/schemas/test.json": {
            asset: "/schemas/test.json",
            contentType: "application/json; charset=utf-8",
            cache: frozen.length === 0 ? "revalidate" : "immutable",
          },
          "/schemas/still-mutable.json": {
            asset: "/schemas/still-mutable.json",
            contentType: "application/json; charset=utf-8",
            cache: "revalidate",
          },
        },
        headers: { "Access-Control-Allow-Origin": "*" },
      }));
      const { default: worker } = await import(pathToFileURL(join(root, "src/index.js")).href);
      const url = "https://schemas.example/schemas/test.json";
      const response = await worker.fetch(new Request(url), env);
      assert.equal(response.status, 200, name);
      assert.equal(await response.text(), body, name);
      assert.equal(response.headers.get("Content-Type"), "application/json; charset=utf-8", name);
      assert.equal(response.headers.get("Cache-Control"), policy, name);
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*", name);
      assert.equal(response.headers.get("ETag"), etag, name);
      const conditional = await worker.fetch(new Request(url, { headers: { "If-None-Match": etag } }), env);
      assert.equal(conditional.status, 304, name);
      assert.equal(conditional.headers.get("Content-Type"), "application/json; charset=utf-8", name);
      assert.equal(conditional.headers.get("Cache-Control"), policy, name);
      assert.equal(await conditional.text(), "", name);

      const stillMutable = await worker.fetch(new Request("https://schemas.example/schemas/still-mutable.json"), env);
      assert.equal(stillMutable.status, 200, name);
      assert.equal(stillMutable.headers.get("Cache-Control"), "public, max-age=0, must-revalidate", name);

      const callsBeforeUnlisted = calls;
      const unlisted = await worker.fetch(new Request("https://schemas.example/schemas/unlisted.json"), env);
      assert.equal(unlisted.status, 404, name);
      assert.equal(unlisted.headers.get("Content-Type"), "application/json; charset=utf-8", name);
      assert.equal(unlisted.headers.get("Cache-Control"), "no-store", name);
      assert.equal((await unlisted.json()).resource, "/schemas/unlisted.json", name);
      assert.equal(calls, callsBeforeUnlisted, name);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  RegistryRouteVerificationError,
  verifyRegistryPublicReferences,
} from "../../tools/verify-registry-public-references.mjs";

function binding() {
  return {
    $schema: "./context-canvas-registry-bindings.schema.json",
    id: "context-canvas.registry-public-reference-bindings.v1",
    version: "1",
    atlas: {
      reference_version: "0.2.1",
      guide_version: 5,
      data_schema_version: "0.1.0",
      snapshot_date: "2026-10-07",
      accepted_at: "2026-10-11",
      archive_sha256: "1".repeat(64),
      registry_atlas_sha256: "2".repeat(64),
      manifest_sha256: "3".repeat(64),
      current_route_map_sha256: "4".repeat(64),
      public_root: "https://kindlight.systems/",
      license: "Apache-2.0",
      content_role: "reference_data",
      action_authority: "current_human_request_and_repository_owned_tools",
      data_use_notice: "deployment/public-references/registry-atlas-data-use.txt",
      data_use_sha256: "71ca36c88846940b837772dd1541c74a3f609438bfc915e3e52ac5cbe07aea67",
      benchmark_scope: "all_atlas_records_and_resources",
    },
    bindings: [
      {
        token: "PUBLIC_URL_REGISTRY_ALPHA",
        atlas_record_key: "registry:orientation/alpha",
        expected_public_title: "Alpha & Orientation",
        expected_family: "Orientation",
        expected_resource_role: "Practice guide",
        expected_reader_job: "Orient",
        expected_source_lifecycle: "Current",
        expected_route_state: "Identity verified",
        url: "https://kindlight.systems/alpha",
        selection_basis: "Exact current Atlas record selected for the reader job.",
      },
    ],
  };
}

async function withBinding(t) {
  const directory = await mkdtemp(join(tmpdir(), "registry-live-routes-"));
  const path = join(directory, "binding.json");
  await writeFile(path, `${JSON.stringify(binding(), null, 2)}\n`);
  t.after(() => rm(directory, { recursive: true, force: true }));
  return path;
}

function responseAt(body, init = {}, url = "https://kindlight.systems/alpha") {
  const response = new Response(body, init);
  Object.defineProperty(response, "url", { value: url });
  return response;
}

test("verifies status, exact final route, HTML type, and expected page identity", async (t) => {
  const bindingPath = await withBinding(t);
  const seen = [];
  const result = await verifyRegistryPublicReferences({
    bindingPath,
    fetchImpl: async (url, options) => {
      seen.push([url, options]);
      return responseAt("<!doctype html><title>Alpha &amp; Orientation · Registry</title>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    },
  });

  assert.equal(result.bindingCount, 1);
  assert.equal(result.routeCount, 1);
  assert.equal(result.routes[0].observedTitle, "Alpha & Orientation · Registry");
  assert.equal(seen[0][0], "https://kindlight.systems/alpha");
  assert.equal(seen[0][1].method, "GET");
  assert.equal(seen[0][1].redirect, "manual");
});

test("keeps malformed numeric title references inert while reading the expected identity", async (t) => {
  const bindingPath = await withBinding(t);
  const result = await verifyRegistryPublicReferences({
    bindingPath,
    fetchImpl: async () =>
      responseAt(
        "<title>Alpha &amp; Orientation &#999999999999;</title>",
        { status: 200, headers: { "content-type": "text/html" } },
      ),
  });

  assert.equal(
    result.routes[0].observedTitle,
    "Alpha & Orientation &#999999999999;",
  );
});

for (const [name, responseFactory, code] of [
  ["HTTP failure", () => responseAt("missing", { status: 404 }), "status"],
  [
    "HTTP redirect before following its target",
    () => responseAt("", {
      status: 302,
      headers: { location: "https://other.example.test/private" },
    }),
    "redirect",
  ],
  [
    "redirected identity",
    () => {
      return responseAt("<title>Alpha &amp; Orientation</title>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }, "https://kindlight.systems/other");
    },
    "redirect",
  ],
  [
    "non-HTML response",
    () => responseAt("{}", { status: 200, headers: { "content-type": "application/json" } }),
    "content_type",
  ],
  [
    "wrong document title",
    () => responseAt("<title>Different page</title>", { status: 200, headers: { "content-type": "text/html" } }),
    "identity",
  ],
]) {
  test(`rejects ${name}`, async (t) => {
    const bindingPath = await withBinding(t);
    await assert.rejects(
      verifyRegistryPublicReferences({ bindingPath, fetchImpl: async () => responseFactory() }),
      (error) => {
        assert.equal(error instanceof RegistryRouteVerificationError, true);
        assert.equal(error.code, code);
        return true;
      },
    );
  });
}

test("rejects oversized bodies and request failures with bounded diagnostics", async (t) => {
  const bindingPath = await withBinding(t);
  await assert.rejects(
    verifyRegistryPublicReferences({
      bindingPath,
      maximumResponseBytes: 16,
      fetchImpl: async () =>
        responseAt("<title>Alpha &amp; Orientation</title>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
    }),
    (error) => error.code === "response_size",
  );

  await assert.rejects(
    verifyRegistryPublicReferences({
      bindingPath,
      fetchImpl: async () => {
        throw new Error("offline");
      },
    }),
    (error) => error.code === "request" && /request failed/.test(error.message),
  );
});

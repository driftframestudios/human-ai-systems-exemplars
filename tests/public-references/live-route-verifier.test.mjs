import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  RegistryRouteAggregateVerificationError,
  RegistryRouteVerificationError,
  verifyRegistryPublicReferences,
} from "../../tools/verify-registry-public-references.mjs";

function row(token = "PUBLIC_URL_REGISTRY_ALPHA", suffix = "alpha") {
  const name = `${suffix[0].toUpperCase()}${suffix.slice(1)}`;
  return {
    token,
    atlas_record_key: `registry:orientation/${suffix}`,
    expected_public_title: `${name} & Orientation`,
    expected_family: "Orientation",
    expected_resource_role: "Practice guide",
    expected_reader_job: "Orient",
    expected_source_lifecycle: "Current",
    expected_route_state: "Identity verified",
    url: `https://kindlight.systems/${suffix}`,
    selection_basis: "Exact current Atlas record selected for the reader job.",
  };
}

function binding(bindings = [row()]) {
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
    bindings,
  };
}

async function withBinding(t, document = binding()) {
  const directory = await mkdtemp(join(tmpdir(), "registry-live-routes-"));
  const path = join(directory, "binding.json");
  await writeFile(path, `${JSON.stringify(document, null, 2)}\n`);
  t.after(() => rm(directory, { recursive: true, force: true }));
  return path;
}

function responseAt(body, init = {}, url = "https://kindlight.systems/alpha") {
  const response = new Response(body, init);
  Object.defineProperty(response, "url", { value: url });
  return response;
}

function cancellableResponseAt({
  body = "pending",
  init = {},
  url = "https://kindlight.systems/alpha",
  close = false,
} = {}) {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      if (close) controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
  return {
    response: responseAt(stream, init, url),
    wasCancelled: () => cancelled,
  };
}

async function expectRouteFailure(promise, expectedCode) {
  await assert.rejects(promise, (error) => {
    assert.equal(error instanceof RegistryRouteAggregateVerificationError, true);
    assert.equal(error instanceof RegistryRouteVerificationError, true);
    assert.equal(error.code, "route_failures");
    assert.equal(error.failures.length, 1);
    assert.equal(error.failures[0].code, expectedCode);
    assert.equal(error.result.routeCount, 1);
    assert.equal(error.result.verifiedRouteCount, 0);
    return true;
  });
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
  assert.equal(result.verifiedRouteCount, 1);
  assert.deepEqual(result.failures, []);
  assert.equal(result.routes[0].observedTitle, "Alpha & Orientation · Registry");
  assert.equal(result.routes[0].contentType, "text/html");
  assert.equal(seen[0][0], "https://kindlight.systems/alpha");
  assert.equal(seen[0][1].method, "GET");
  assert.equal(seen[0][1].redirect, "manual");
});

test("accepts exact titles and a finite set of site suffixes", async (t) => {
  const bindingPath = await withBinding(t);
  for (const title of [
    "Alpha & Orientation",
    "Alpha & Orientation | Kindlight Systems",
    "Alpha & Orientation — Enterprise Human-AI Practitioner Registry",
  ]) {
    const result = await verifyRegistryPublicReferences({
      bindingPath,
      fetchImpl: async () => responseAt(
        `<title>${title}</title>`,
        { status: 200, headers: { "content-type": "text/html" } },
      ),
    });
    assert.equal(result.routes[0].observedTitle, title);
  }
});

test("rejects prefix, arbitrary suffix, and malformed-reference title matches", async (t) => {
  const bindingPath = await withBinding(t);
  for (const title of [
    "Alpha & Orientation unavailable",
    "Alpha & Orientation · Missing",
    "Unavailable · Alpha & Orientation",
    "Alpha &amp; Orientation &#999999999999;",
  ]) {
    await expectRouteFailure(
      verifyRegistryPublicReferences({
        bindingPath,
        fetchImpl: async () => responseAt(
          `<title>${title}</title>`,
          { status: 200, headers: { "content-type": "text/html" } },
        ),
      }),
      "identity",
    );
  }
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
    () => responseAt("<title>Alpha &amp; Orientation</title>", {
      status: 200,
      headers: { "content-type": "text/html" },
    }, "https://kindlight.systems/other"),
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
  test(`rejects ${name} through the deterministic aggregate`, async (t) => {
    const bindingPath = await withBinding(t);
    await expectRouteFailure(
      verifyRegistryPublicReferences({
        bindingPath,
        fetchImpl: async () => responseFactory(),
      }),
      code,
    );
  });
}

test("cancels unused response bodies on early and declared-size failures", async (t) => {
  const bindingPath = await withBinding(t);
  const earlyCases = [
    ["redirect", { init: { status: 302 } }, "redirect"],
    ["status", { init: { status: 404 } }, "status"],
    [
      "final route",
      {
        init: { status: 200, headers: { "content-type": "text/html" } },
        url: "https://kindlight.systems/other",
      },
      "redirect",
    ],
    [
      "content type",
      { init: { status: 200, headers: { "content-type": "application/json" } } },
      "content_type",
    ],
  ];
  for (const [name, responseOptions, code] of earlyCases) {
    await t.test(name, async () => {
      const early = cancellableResponseAt(responseOptions);
      await expectRouteFailure(
        verifyRegistryPublicReferences({
          bindingPath,
          fetchImpl: async () => early.response,
        }),
        code,
      );
      assert.equal(early.wasCancelled(), true);
    });
  }

  const oversized = cancellableResponseAt({
    init: {
      status: 200,
      headers: {
        "content-type": "text/html",
        "content-length": "100",
      },
    },
  });
  await expectRouteFailure(
    verifyRegistryPublicReferences({
      bindingPath,
      maximumResponseBytes: 16,
      fetchImpl: async () => oversized.response,
    }),
    "response_size",
  );
  assert.equal(oversized.wasCancelled(), true);
});

test("cancels a streaming response when received bytes cross the bound", async (t) => {
  const bindingPath = await withBinding(t);
  const oversized = cancellableResponseAt({
    body: "x".repeat(17),
    init: { status: 200, headers: { "content-type": "text/html" } },
  });
  await expectRouteFailure(
    verifyRegistryPublicReferences({
      bindingPath,
      maximumResponseBytes: 16,
      fetchImpl: async () => oversized.response,
    }),
    "response_size",
  );
  assert.equal(oversized.wasCancelled(), true);
});

test("sanitizes request and body failures into a finite taxonomy", async (t) => {
  const bindingPath = await withBinding(t);
  const secret = "/Users/private/operator-token";
  await assert.rejects(
    verifyRegistryPublicReferences({
      bindingPath,
      fetchImpl: async () => {
        throw new Error(`offline at ${secret}`);
      },
    }),
    (error) => {
      assert.equal(error.failures[0].code, "request_transport");
      assert.equal(error.message.includes(secret), false);
      assert.equal(error.failures[0].message.includes(secret), false);
      return true;
    },
  );

  await assert.rejects(
    verifyRegistryPublicReferences({
      bindingPath,
      fetchImpl: async () => {
        const error = new Error(`timeout at ${secret}`);
        error.name = "TimeoutError";
        throw error;
      },
    }),
    (error) => error.failures[0].code === "request_timeout" &&
      !error.failures[0].message.includes(secret),
  );

  const stream = new ReadableStream({
    start(controller) {
      controller.error(new Error(`stream failed at ${secret}`));
    },
  });
  await expectRouteFailure(
    verifyRegistryPublicReferences({
      bindingPath,
      fetchImpl: async () => responseAt(stream, {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    }),
    "response_body",
  );
});

test("attempts every distinct route and reports failures in route order", async (t) => {
  const document = binding([
    row("PUBLIC_URL_REGISTRY_ALPHA", "alpha"),
    row("PUBLIC_URL_REGISTRY_BETA", "beta"),
    row("PUBLIC_URL_REGISTRY_GAMMA", "gamma"),
  ]);
  const bindingPath = await withBinding(t, document);
  const attempts = [];
  await assert.rejects(
    verifyRegistryPublicReferences({
      bindingPath,
      concurrency: 3,
      fetchImpl: async (url) => {
        attempts.push(url);
        const suffix = new URL(url).pathname.slice(1);
        const delay = { alpha: 15, beta: 1, gamma: 5 }[suffix];
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (suffix === "alpha") return responseAt("missing", { status: 404 }, url);
        if (suffix === "gamma") {
          return responseAt("<title>Different page</title>", {
            status: 200,
            headers: { "content-type": "text/html" },
          }, url);
        }
        return responseAt("<title>Beta &amp; Orientation</title>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }, url);
      },
    }),
    (error) => {
      assert.equal(error.code, "route_failures");
      assert.deepEqual(error.failures.map(({ url, code }) => [url, code]), [
        ["https://kindlight.systems/alpha", "status"],
        ["https://kindlight.systems/gamma", "identity"],
      ]);
      assert.equal(error.result.routeCount, 3);
      assert.equal(error.result.verifiedRouteCount, 1);
      assert.equal(error.result.routes[0].url, "https://kindlight.systems/beta");
      return true;
    },
  );
  assert.deepEqual(new Set(attempts), new Set([
    "https://kindlight.systems/alpha",
    "https://kindlight.systems/beta",
    "https://kindlight.systems/gamma",
  ]));
});

test("keeps local binding paths out of read-failure diagnostics", async () => {
  const privatePath = join(tmpdir(), "private-registry-path", "missing.json");
  await assert.rejects(
    verifyRegistryPublicReferences({
      bindingPath: privatePath,
      fetchImpl: async () => {
        throw new Error("fetch remains unreachable");
      },
    }),
    (error) => {
      assert.equal(error.code, "binding_read");
      assert.equal(error.message.includes(privatePath), false);
      return true;
    },
  );
});

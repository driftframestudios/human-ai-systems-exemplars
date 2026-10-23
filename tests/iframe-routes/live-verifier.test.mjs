import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import test from "node:test";

import {
  expectedMediaTypeForPath,
  formatLiveIframeSummary,
  verifyLiveIframeRoutes,
} from "../../tools/verify-live-iframe-routes.mjs";

const html = Buffer.from("<!doctype html><title>Fixture</title>\n", "utf8");
const schema = Buffer.from('{"$schema":"https://json-schema.org/draft/2020-12/schema"}\n', "utf8");
const htmlPath = "core/fixture/index.html";
const schemaPath =
  "core/strategy-canvas/strategy-canvas-system-v0.2/strategy-canvas.schema.json";

function fixturePlan() {
  return {
    outputFiles: new Map([
      [htmlPath, html],
      [schemaPath, schema],
    ]),
  };
}

function response(bytes, contentType, headers = {}) {
  return new Response(bytes, {
    status: 200,
    headers: { "content-type": contentType, ...headers },
  });
}

function strictHeaders(extra = {}) {
  return {
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "cache-control": "public, max-age=0, must-revalidate",
    ...extra,
  };
}

test("maps every current iframe package file type to its declared media type", () => {
  assert.equal(expectedMediaTypeForPath("core/example/index.html"), "text/html");
  assert.equal(expectedMediaTypeForPath("canvas/example/asset.svg"), "image/svg+xml");
  assert.equal(expectedMediaTypeForPath("canvas/route-manifest.json"), "application/json");
  assert.equal(expectedMediaTypeForPath(schemaPath), "application/schema+json");
  assert.throws(() => expectedMediaTypeForPath("core/example/unknown.bin"), /No live iframe media-type contract/);
});

test("accepts exact bytes and the complete hosted response policy", async () => {
  const requestedPaths = [];
  const result = await verifyLiveIframeRoutes({
    plan: fixturePlan(),
    requirePolicy: true,
    fetchImplementation: async (url) => {
      requestedPaths.push(url.pathname);
      if (url.pathname.endsWith("/")) {
        return response(html, "text/html; charset=utf-8", strictHeaders({
          "content-security-policy": "default-src 'none'; frame-ancestors https://vik.guru",
        }));
      }
      return response(schema, "application/schema+json; charset=utf-8", strictHeaders());
    },
  });

  assert.equal(result.disposition, "pass");
  assert.equal(result.ok, true);
  assert.equal(result.deliveryPass, true);
  assert.equal(result.policyPass, true);
  assert.equal(result.counts.exactBytes, 2);
  assert.deepEqual(result.mismatches, []);
  assert.deepEqual(requestedPaths.sort(), [
    "/v1/core/fixture/",
    "/v1/core/strategy-canvas/strategy-canvas-system-v0.2/strategy-canvas.schema.json",
  ]);
});

test("keeps policy friction distinct from an exact delivery pass", async () => {
  const result = await verifyLiveIframeRoutes({
    plan: fixturePlan(),
    fetchImplementation: async (url) =>
      url.pathname.endsWith("/")
        ? response(html, "text/html", { "access-control-allow-origin": "https://vik.guru" })
        : response(schema, "application/schema+json"),
  });

  assert.equal(result.disposition, "friction");
  assert.equal(result.deliveryPass, true);
  assert.equal(result.policyPass, false);
  assert.equal(result.ok, true);
  assert.deepEqual(result.policy.htmlCharsetUtf8, { passed: 0, total: 1 });
  assert.deepEqual(result.policy.corsAbsent, { passed: 1, total: 2 });

  const strict = await verifyLiveIframeRoutes({
    plan: fixturePlan(),
    requirePolicy: true,
    fetchImplementation: async (url) =>
      url.pathname.endsWith("/")
        ? response(html, "text/html")
        : response(schema, "application/schema+json"),
  });
  assert.equal(strict.ok, false);

  const extraAncestor = await verifyLiveIframeRoutes({
    plan: fixturePlan(),
    requirePolicy: true,
    fetchImplementation: async (url) =>
      url.pathname.endsWith("/")
        ? response(html, "text/html; charset=utf-8", strictHeaders({
            "content-security-policy":
              "frame-ancestors https://vik.guru https://attacker.example",
          }))
        : response(schema, "application/schema+json", strictHeaders()),
  });
  assert.equal(extraAncestor.policy.approvedFrameAncestor.passed, 0);
  assert.equal(extraAncestor.ok, false);

  for (const ambiguousContentType of [
    "text/html; charset=windows-1252; charset=utf-8",
    'text/html; note="; charset=utf-8"',
  ]) {
    const ambiguousCharset = await verifyLiveIframeRoutes({
      plan: fixturePlan(),
      requirePolicy: true,
      fetchImplementation: async (url) =>
        url.pathname.endsWith("/")
          ? response(html, ambiguousContentType, strictHeaders({
              "content-security-policy": "frame-ancestors https://vik.guru",
            }))
          : response(schema, "application/schema+json", strictHeaders()),
    });
    assert.equal(ambiguousCharset.policy.htmlCharsetUtf8.passed, 0);
    assert.equal(ambiguousCharset.ok, false);
  }
});

test("reports byte, status, media, and request failures without response payloads", async () => {
  const plan = {
    outputFiles: new Map([
      [htmlPath, html],
      [schemaPath, schema],
      ["canvas/unreachable/index.html", html],
      ["canvas/oversized/index.html", html],
    ]),
  };
  const result = await verifyLiveIframeRoutes({
    plan,
    fetchImplementation: async (url) => {
      if (url.pathname.includes("unreachable")) throw new Error("protected raw detail");
      if (url.pathname.includes("oversized")) return response(Buffer.alloc(html.length + 4096), "text/html");
      if (url.pathname.endsWith("/")) {
        return response(Buffer.from("predecessor", "utf8"), "text/plain");
      }
      return new Response(schema, { status: 404, headers: { "content-type": "application/json" } });
    },
  });

  assert.equal(result.disposition, "blocker");
  assert.equal(result.ok, false);
  assert.equal(result.counts.requestErrors, 1);
  assert.equal(result.mismatches.length, 4);
  assert.equal(
    result.mismatches.find(({ path }) => path === "canvas/oversized/index.html").bodyTooLarge,
    true,
  );
  const summary = formatLiveIframeSummary(result);
  assert.match(summary, /core\/fixture\/index\.html/);
  assert.match(summary, /HTTP 404/);
  assert.match(summary, /request failed/);
  assert.match(summary, /bytes >38\/38/);
  assert.doesNotMatch(summary, /protected raw detail/);
  assert.doesNotMatch(summary, /<!doctype html>/);
});

test("rejects alternate receivers and unbounded concurrency", async () => {
  await assert.rejects(
    verifyLiveIframeRoutes({ plan: fixturePlan(), baseUrl: "https://example.invalid/v1/" }),
    /fixed to https:\/\/iframes\.vik\.guru\/v1\//,
  );
  await assert.rejects(
    verifyLiveIframeRoutes({ plan: fixturePlan(), concurrency: 9 }),
    /integer from 1 through 8/,
  );
  await assert.rejects(
    verifyLiveIframeRoutes({
      plan: { outputFiles: new Map([["//example.invalid/escaped.html", html]]) },
    }),
    /must stay relative and normalized/,
  );
  for (const escapedPath of [
    "http:evil.example/index.html",
    "core/%2e%2e/escaped/index.html",
  ]) {
    await assert.rejects(
      verifyLiveIframeRoutes({
        plan: { outputFiles: new Map([[escapedPath, html]]) },
      }),
      /must stay relative and normalized/,
    );
  }
  await assert.rejects(
    verifyLiveIframeRoutes({
      plan: { outputFiles: new Map([[htmlPath, "not bytes"]]) },
    }),
    /must contain Buffer bytes/,
  );
});

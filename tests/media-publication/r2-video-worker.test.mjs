import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";
import worker from "../../cloudflare/r2-video-delivery/src/index.js";

const ORIGIN = "https://media.example";
const IMMUTABLE = "public, max-age=31536000, immutable";
const SAMPLE_PATH = "/v1-cdn/video/impact-map-narrative/v1.2.3/movie.mp4";
const originalFixedLengthStream = globalThis.FixedLengthStream;
const fixedLengthSizes = [];

globalThis.FixedLengthStream = class {
  constructor(size) {
    fixedLengthSizes.push(size);
    let bytesWritten = 0;
    const stream = new TransformStream({
      flush() {
        if (bytesWritten !== size) throw new Error("fixed-length body mismatch");
      },
      transform(chunk, controller) {
        bytesWritten += chunk.byteLength;
        if (bytesWritten > size) throw new Error("fixed-length body overflow");
        controller.enqueue(chunk);
      },
    });
    this.readable = stream.readable;
    this.writable = stream.writable;
  }
};

after(() => {
  if (originalFixedLengthStream === undefined) delete globalThis.FixedLengthStream;
  else globalThis.FixedLengthStream = originalFixedLengthStream;
});

function bodyStream(bytes) {
  return new Response(bytes).body;
}

function r2Object(contentType, bytes = new TextEncoder().encode("media"), overrides = {}) {
  return {
    body: bodyStream(bytes),
    httpEtag: '"8e0a1b2c3d4e5f"',
    httpMetadata: { contentType },
    size: bytes.byteLength,
    ...overrides,
  };
}

function environment({ contentType = "video/mp4", object, throwError = false } = {}) {
  const calls = [];
  const makeObject = () => object === undefined ? r2Object(contentType) : object;
  return {
    calls,
    env: {
      MEDIA_BUCKET: {
        async get(...args) {
          calls.push({ args, operation: "get" });
          if (throwError) throw new Error("private R2 diagnostic");
          return makeObject();
        },
        async head(...args) {
          calls.push({ args, operation: "head" });
          if (throwError) throw new Error("private R2 diagnostic");
          const value = makeObject();
          if (!value) return value;
          const { body: _body, ...metadata } = value;
          return metadata;
        },
      },
    },
  };
}

function request(path = SAMPLE_PATH, options = {}) {
  return new Request(new URL(path, ORIGIN), options);
}

async function invoke(path = SAMPLE_PATH, options = {}, setup = environment()) {
  const response = await worker.fetch(request(path, options), setup.env);
  return { response, setup };
}

function assertHardened(response, label) {
  assert.equal(response.headers.get("Cross-Origin-Resource-Policy"), "same-origin", label);
  assert.equal(response.headers.get("Referrer-Policy"), "no-referrer", label);
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff", label);
}

async function assertNoStoreError(response, status) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("Content-Type"), "text/plain; charset=utf-8");
  assertHardened(response, `error ${status}`);
  const body = await response.text();
  assert.equal(Number(response.headers.get("Content-Length")), Buffer.byteLength(body));
  assert(body.length > 0 && body.length <= 64);
  assert(!body.includes("private R2 diagnostic"));
  assert(!body.includes(SAMPLE_PATH));
}

test("Wrangler binds one private R2 bucket to the exact cached production route", async () => {
  const source = await readFile(
    new URL("../../cloudflare/r2-video-delivery/wrangler.jsonc", import.meta.url),
    "utf8",
  );
  const config = JSON.parse(source);
  assert.equal(config.main, "src/index.js");
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.deepEqual(config.cache, { enabled: true, cross_version_cache: false });
  assert.deepEqual(config.routes, [{ pattern: "vik.guru/v1-cdn/video/*", zone_name: "vik.guru" }]);
  assert.deepEqual(config.r2_buckets, [{
    binding: "MEDIA_BUCKET",
    bucket_name: "vik-guru-video-carriers",
  }]);
  assert.match(config.r2_buckets[0].bucket_name, /^(?=.{3,63}$)[a-z0-9]+(?:-[a-z0-9]+)*$/u);
  assert(!source.match(/account[_-]?id|access[_-]?key|api[_-]?token/iu));
});

test("every finite carrier maps to its exact R2 key and inert response media type", async () => {
  const cases = [
    ["movie.mp4", "video/mp4"],
    ["poster.webp", "image/webp"],
    ["poster.avif", "image/avif"],
    ["poster.jpg", "image/jpeg"],
    ["poster.png", "image/png"],
    ["captions.en.vtt", "text/vtt; charset=utf-8"],
    ["descriptions.en-us.vtt", "text/vtt; charset=utf-8"],
  ];

  for (const [carrier, contentType] of cases) {
    const bytes = new TextEncoder().encode(`accepted ${carrier}`);
    const setup = environment({ object: r2Object(contentType, bytes) });
    const path = `/v1-cdn/video/impact-map-narrative/v1.2.3/${carrier}`;
    const { response } = await invoke(path, {}, setup);

    assert.equal(response.status, 200, carrier);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(bytes), carrier);
    assert.deepEqual(setup.calls, [{
      args: [`v1/video/impact-map-narrative/v1.2.3/${carrier}`],
      operation: "get",
    }], carrier);
    assert.equal(response.headers.get("Content-Type"), contentType, carrier);
    assert.equal(response.headers.get("Content-Length"), String(bytes.byteLength), carrier);
    assert.equal(response.headers.get("ETag"), '"8e0a1b2c3d4e5f"', carrier);
    assert.equal(response.headers.get("Accept-Ranges"), "bytes", carrier);
    assert.equal(response.headers.get("Cache-Control"), IMMUTABLE, carrier);
    assertHardened(response, carrier);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), null, carrier);
  }
});

test("HEAD reads only R2 metadata and preserves the full-representation headers", async () => {
  const bytes = new Uint8Array(23);
  const setup = environment({ object: r2Object("video/mp4", bytes) });
  const { response } = await invoke(SAMPLE_PATH, { method: "HEAD" }, setup);

  assert.equal(response.status, 200);
  assert.deepEqual(setup.calls, [{
    args: ["v1/video/impact-map-narrative/v1.2.3/movie.mp4"],
    operation: "head",
  }]);
  assert.equal(response.headers.get("Content-Length"), "23");
  assert.equal(response.headers.get("Content-Type"), "video/mp4");
  assert.equal(response.headers.get("Accept-Ranges"), "bytes");
  assert.equal(await response.text(), "");
});

test("the Worker returns a complete 200 when invoked with Range and leaves slicing to Workers Caching", async () => {
  const bytes = new TextEncoder().encode("complete-media-body");
  const setup = environment({ object: r2Object("video/mp4", bytes) });
  const observationStart = fixedLengthSizes.length;
  const { response } = await invoke(SAMPLE_PATH, {
    headers: { Range: "bytes=0-3" },
  }, setup);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Range"), null);
  assert.equal(response.headers.get("Content-Length"), String(bytes.byteLength));
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(bytes));
  assert.deepEqual(fixedLengthSizes.slice(observationStart), [bytes.byteLength]);
  assert.deepEqual(setup.calls[0], {
    args: ["v1/video/impact-map-narrative/v1.2.3/movie.mp4"],
    operation: "get",
  });
});

test("HTTP redirects only an otherwise valid read route and never reaches R2", async () => {
  const setup = environment();
  const response = await worker.fetch(
    new Request(`http://vik.guru${SAMPLE_PATH}`, { method: "GET" }),
    setup.env,
  );

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("Location"), `https://vik.guru${SAMPLE_PATH}`);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("Content-Length"), "0");
  assertHardened(response, "HTTPS redirect");
  assert.deepEqual(setup.calls, []);
});

test("non-read methods are bounded 405 responses and never reach R2", async () => {
  for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) {
    const setup = environment();
    const { response } = await invoke(SAMPLE_PATH, { method }, setup);
    await assertNoStoreError(response, 405);
    assert.equal(response.headers.get("Allow"), "GET, HEAD");
    assert.deepEqual(setup.calls, []);
  }
});

test("queries, encodings, and ambiguous request targets are rejected before R2", async () => {
  const cases = [
    `${SAMPLE_PATH}?download=1`,
    `${SAMPLE_PATH}?`,
    "/v1-cdn/video/impact%2dmap/v1.2.3/movie.mp4",
    "/v1-cdn/video/impact-map/v1.2.3/movie%2emp4",
    "/v1-cdn/video/impact-map/v1.2.3%2fmovie.mp4",
    "/v1-cdn/video/impáct-map/v1.2.3/movie.mp4",
    "/v1-cdn/video//impact-map/v1.2.3/movie.mp4",
    "/v1-cdn/video/impact-map/v1.2.3//movie.mp4",
  ];

  for (const path of cases) {
    const setup = environment();
    const { response } = await invoke(path, {}, setup);
    await assertNoStoreError(response, 400);
    assert.deepEqual(setup.calls, [], path);
  }

  for (const rawPath of [
    "/v1-cdn/video/impact-map/v1.2.3/./movie.mp4",
    "/v1-cdn/video/other/../impact-map/v1.2.3/movie.mp4",
    "/v1-cdn\\video/impact-map/v1.2.3/movie.mp4",
  ]) {
    const setup = environment();
    const response = await worker.fetch({
      method: "GET",
      url: `${ORIGIN}${rawPath}`,
    }, setup.env);
    await assertNoStoreError(response, 400);
    assert.deepEqual(setup.calls, [], rawPath);
  }

  const oversizedPath = `${SAMPLE_PATH}${"a".repeat(512)}`;
  const oversizedSetup = environment();
  const oversizedResponse = await worker.fetch({
    method: "GET",
    url: `${ORIGIN}${oversizedPath}`,
  }, oversizedSetup.env);
  await assertNoStoreError(oversizedResponse, 400);
  assert.deepEqual(oversizedSetup.calls, []);
});

test("nearby but non-grammar paths are bounded 404 responses without an object lookup", async () => {
  const cases = [
    "/v1-cdn/video/Impact-Map/v1.2.3/movie.mp4",
    "/v1-cdn/video/impact.map/v1.2.3/movie.mp4",
    "/v1-cdn/video/impact_map/v1.2.3/movie.mp4",
    "/v1-cdn/video/impact-map/v01.2.3/movie.mp4",
    "/v1-cdn/video/impact-map/v1.2/movie.mp4",
    "/v1-cdn/video/impact-map/v1.2.3-beta/movie.mp4",
    "/v1-cdn/video/impact-map/v1.2.3/movie.webm",
    "/v1-cdn/video/impact-map/v1.2.3/poster.svg",
    "/v1-cdn/video/impact-map/v1.2.3/transcript.html",
    "/v1-cdn/video/impact-map/v1.2.3/captions.vtt",
    "/v1-cdn/video/impact-map/v1.2.3/captions.en-US.vtt",
    "/v1-cdn/video/impact-map/v1.2.3/movie.mp4/",
    "/v1-cdn/video/impact-map/v1.2.3",
    "/v1-cdn/image/impact-map/v1.2.3/movie.mp4",
  ];

  for (const path of cases) {
    const setup = environment();
    const { response } = await invoke(path, {}, setup);
    await assertNoStoreError(response, 404);
    assert.deepEqual(setup.calls, [], path);
  }
});

test("missing objects, R2 failures, and invalid stored metadata stay bounded and no-store", async () => {
  for (const [setup, status] of [
    [environment({ object: null }), 404],
    [environment({ throwError: true }), 503],
    [environment({ object: r2Object("application/octet-stream") }), 502],
    [environment({ object: r2Object("video/mp4", undefined, { httpMetadata: {} }) }), 502],
    [environment({ object: r2Object("video/mp4", undefined, { httpEtag: 'W/"weak"' }) }), 502],
    [environment({ object: r2Object("video/mp4", undefined, { httpEtag: "unquoted" }) }), 502],
    [environment({ object: r2Object("video/mp4", undefined, { size: -1 }) }), 502],
    [environment({ object: r2Object("video/mp4", undefined, { size: 0 }) }), 502],
    [environment({ object: r2Object("video/mp4", undefined, { body: null }) }), 502],
    [environment({ object: r2Object("video/mp4", undefined, {
      httpMetadata: { contentEncoding: "gzip", contentType: "video/mp4" },
    }) }), 502],
  ]) {
    const { response } = await invoke(SAMPLE_PATH, {}, setup);
    await assertNoStoreError(response, status);
    assert.equal(setup.calls.length, 1);
  }
});

test("stored HTTP metadata outside the validated media type is never forwarded", async () => {
  const object = r2Object("video/mp4", undefined, {
    httpMetadata: {
      cacheControl: "private, max-age=0",
      contentDisposition: "attachment; filename=untrusted.html",
      contentLanguage: "x-private",
      contentType: "video/mp4",
    },
  });
  const { response } = await invoke(SAMPLE_PATH, {}, environment({ object }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), IMMUTABLE);
  assert.equal(response.headers.get("Content-Disposition"), null);
  assert.equal(response.headers.get("Content-Language"), null);
  await response.arrayBuffer();
});

test("a HEAD metadata mismatch has no response body while retaining bounded error length", async () => {
  const setup = environment({ object: r2Object("application/octet-stream") });
  const { response } = await invoke(SAMPLE_PATH, { method: "HEAD" }, setup);
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("Content-Length"), String("Media metadata invalid\n".length));
  assert.equal(await response.text(), "");
});

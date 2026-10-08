import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  isStrongQuotedEtag,
  normalizedCacheStatus,
  observeCachePolicy,
  parseR2RouteCliArguments,
  verifyR2VideoRoute,
} from "../../tools/verify-r2-video-route.mjs";

const videoUrl = "https://media.example.test/assets/public-video.mp4";
const captionsUrl = "https://media.example.test/assets/public-video.en.vtt";
const posterUrl = "https://media.example.test/assets/public-video.webp";
const videoBytes = Buffer.from("synthetic public MP4 bytes for route verification", "utf8");
const expectedSha256 = createHash("sha256").update(videoBytes).digest("hex");
const etag = '"strong-r2-etag"';

function immutableHeaders({
  contentType,
  contentLength,
  extra = {},
} = {}) {
  return {
    "content-type": contentType,
    "content-length": String(contentLength),
    "cache-control": "public, max-age=31536000, immutable",
    etag,
    "cf-cache-status": "HIT",
    "cross-origin-resource-policy": "same-origin",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    ...extra,
  };
}

function passingFetch({ mutateRangeHeaders, captionsType = "text/vtt", throwFor = null } = {}) {
  return async (url, options = {}) => {
    if (throwFor && url.pathname.includes(throwFor)) {
      throw new Error("private-token-must-not-cross-json");
    }
    const method = options.method ?? "GET";
    const requestHeaders = new Headers(options.headers);
    if (url.pathname.endsWith(".vtt")) {
      return new Response(method === "HEAD" ? null : Buffer.alloc(42, 0x56), {
        status: 200,
        headers: immutableHeaders({ contentType: captionsType, contentLength: 42 }),
      });
    }
    if (url.pathname.endsWith(".webp")) {
      return new Response(method === "HEAD" ? null : Buffer.alloc(88, 0x52), {
        status: 200,
        headers: immutableHeaders({ contentType: "image/webp", contentLength: 88 }),
      });
    }
    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: immutableHeaders({
          contentType: "video/mp4",
          contentLength: videoBytes.length,
          extra: { "accept-ranges": "bytes" },
        }),
      });
    }
    if (requestHeaders.get("range") === "bytes=0-1") {
      const headers = immutableHeaders({
        contentType: "video/mp4",
        contentLength: 2,
        extra: {
          "accept-ranges": "bytes",
          "content-range": `bytes 0-1/${videoBytes.length}`,
        },
      });
      mutateRangeHeaders?.(headers);
      return new Response(videoBytes.subarray(0, 2), { status: 206, headers });
    }
    if (requestHeaders.get("range") === `bytes=${videoBytes.length}-`) {
      return new Response(null, {
        status: 416,
        headers: immutableHeaders({
          contentType: "video/mp4",
          contentLength: 0,
          extra: {
            "accept-ranges": "bytes",
            "content-range": `bytes */${videoBytes.length}`,
          },
        }),
      });
    }
    return new Response(videoBytes, {
      status: 200,
      headers: immutableHeaders({
        contentType: "video/mp4",
        contentLength: videoBytes.length,
        extra: { "accept-ranges": "bytes" },
      }),
    });
  };
}

test("accepts exact HEAD, edge range, bounded digest, captions, and poster contracts", async () => {
  const result = await verifyR2VideoRoute({
    videoUrl,
    expectedSha256,
    expectedSizeBytes: videoBytes.length,
    maxDownloadBytes: 1_024,
    captionsUrl,
    posterUrl,
    fetchImplementation: passingFetch(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.disposition, "full-video-object-acceptance");
  assert.equal(result.fullVideoObjectAcceptance, true);
  assert.equal(result.videoPass, true);
  assert.equal(result.companionsPass, true);
  assert.equal(result.video.head.status, 200);
  assert.equal(result.video.head.mediaType, "video/mp4");
  assert.equal(result.video.head.etag.strongQuoted, true);
  assert.equal(result.video.head.cache.public, true);
  assert.equal(result.video.head.cache.immutable, true);
  assert.equal(result.video.head.cacheStatus, "HIT");
  assert.equal(result.video.head.hardeningPass, true);
  assert.equal(result.video.range.status, 206);
  assert.equal(result.video.range.contentRangeExact, true);
  assert.equal(result.video.range.contentLengthExact, true);
  assert.equal(result.video.range.contentEncodingAbsent, true);
  assert.equal(result.video.unsatisfiableRange.status, 416);
  assert.equal(result.video.unsatisfiableRange.contentRangeExact, true);
  assert.equal(result.video.digest.observedSha256, expectedSha256);
  assert.equal(result.companions.captions.mediaTypeMatches, true);
  assert.equal(result.companions.poster.mediaTypeMatches, true);
  assert.equal(result.companions.captions.retrieval.ok, true);
  assert.equal(result.companions.poster.retrieval.ok, true);
  assert.deepEqual(result.failures, []);

  const json = JSON.stringify(result);
  assert.doesNotMatch(json, /media\.example\.test/u);
  assert.doesNotMatch(json, /public-video/u);
  assert.doesNotMatch(json, /strong-r2-etag/u);
  assert.doesNotMatch(json, /synthetic public MP4/u);
});

test("requires an exact unencoded bytes=0-1 edge response", async () => {
  const result = await verifyR2VideoRoute({
    videoUrl,
    fetchImplementation: passingFetch({
      mutateRangeHeaders: (headers) => {
        headers["content-range"] = `bytes 0-1/${videoBytes.length + 1}`;
        headers["content-encoding"] = "br";
      },
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.videoPass, false);
  assert.equal(result.video.head.ok, true);
  assert.equal(result.video.range.statusPass, true);
  assert.equal(result.video.range.contentRangeExact, false);
  assert.equal(result.video.range.contentEncodingAbsent, false);
  assert.deepEqual(result.failures, [{ resource: "video", check: "range-contract" }]);
});

test("labels a route without an accepted digest as a partial observation", async () => {
  const result = await verifyR2VideoRoute({
    videoUrl,
    fetchImplementation: passingFetch(),
  });
  assert.equal(result.ok, true);
  assert.equal(result.videoPass, true);
  assert.equal(result.disposition, "partial-observation");
  assert.equal(result.fullVideoObjectAcceptance, false);
});

test("requires an exact unencoded unsatisfiable range response", async () => {
  const fetchImplementation = async (url, options) => {
    const range = new Headers(options.headers).get("range");
    if (range === `bytes=${videoBytes.length}-`) {
      return new Response(null, {
        status: 416,
        headers: {
          "content-range": `bytes */${videoBytes.length + 1}`,
          "content-encoding": "gzip",
        },
      });
    }
    return passingFetch()(url, options);
  };
  const result = await verifyR2VideoRoute({ videoUrl, fetchImplementation });

  assert.equal(result.video.head.ok, true);
  assert.equal(result.video.range.ok, true);
  assert.equal(result.video.unsatisfiableRange.statusPass, true);
  assert.equal(result.video.unsatisfiableRange.contentRangeExact, false);
  assert.equal(result.video.unsatisfiableRange.contentEncodingAbsent, false);
  assert.deepEqual(result.failures, [
    { resource: "video", check: "unsatisfiable-range-contract" },
  ]);
});

test("requires the Worker's public hardening headers while treating cache status as observation", async () => {
  const fetchImplementation = async (url, options) => {
    const response = await passingFetch()(url, options);
    const headers = new Headers(response.headers);
    headers.delete("referrer-policy");
    headers.set("cf-cache-status", "edge-private-state");
    return new Response(options.method === "HEAD" ? null : response.body, {
      status: response.status,
      headers,
    });
  };
  const result = await verifyR2VideoRoute({ videoUrl, fetchImplementation });

  assert.equal(result.ok, false);
  assert.equal(result.video.head.hardening.noReferrer, false);
  assert.equal(result.video.head.hardeningPass, false);
  assert.equal(result.video.head.cacheStatus, "UNRECOGNIZED");
  assert.equal(result.video.range.cacheStatus, "UNRECOGNIZED");
});

test("enforces the optional full-download byte boundary before issuing the download", async () => {
  const requests = [];
  const fetchImplementation = async (url, options) => {
    requests.push({
      method: options.method ?? "GET",
      range: new Headers(options.headers).get("range"),
    });
    return passingFetch()(url, options);
  };
  const result = await verifyR2VideoRoute({
    videoUrl,
    downloadDigest: true,
    maxDownloadBytes: 8,
    fetchImplementation,
  });

  assert.equal(result.ok, false);
  assert.equal(result.video.head.ok, true);
  assert.equal(result.video.range.ok, true);
  assert.equal(result.video.digest.status, "size-boundary");
  assert.equal(result.video.digest.withinBoundary, false);
  assert.deepEqual(requests, [
    { method: "HEAD", range: null },
    { method: "GET", range: "bytes=0-1" },
    { method: "GET", range: `bytes=${videoBytes.length}-` },
  ]);
});

test("keeps optional companion failure distinct from a passing video", async () => {
  const result = await verifyR2VideoRoute({
    videoUrl,
    captionsUrl,
    posterUrl,
    fetchImplementation: passingFetch({ captionsType: "application/octet-stream" }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.videoPass, true);
  assert.equal(result.companionsPass, false);
  assert.equal(result.companions.captions.status, 200);
  assert.equal(result.companions.captions.mediaType, "unrecognized");
  assert.equal(result.companions.captions.mediaTypeMatches, false);
  assert.equal(result.companions.poster.ok, true);
  assert.deepEqual(result.failures, [
    { resource: "captions", check: "companion-head-contract" },
  ]);
});

test("sanitizes request failures and never returns URLs or exception details", async () => {
  const result = await verifyR2VideoRoute({
    videoUrl,
    captionsUrl,
    fetchImplementation: passingFetch({ throwFor: ".vtt" }),
  });

  assert.equal(result.videoPass, true);
  assert.equal(result.companionsPass, false);
  assert.equal(result.companions.captions.requestError, true);
  const json = JSON.stringify(result);
  assert.doesNotMatch(json, /private-token/u);
  assert.doesNotMatch(json, /media\.example\.test/u);
  assert.doesNotMatch(json, /\.vtt/u);
});

test("observes immutable public cache policy and strong quoted ETags without retaining values", () => {
  assert.deepEqual(observeCachePolicy("public, max-age=86400, immutable"), {
    present: true,
    public: true,
    immutable: true,
    maxAgeSeconds: 86_400,
    exactPolicy: false,
  });
  assert.equal(observeCachePolicy("private, no-store").public, false);
  assert.equal(
    observeCachePolicy("public, max-age=31536000, immutable").exactPolicy,
    true,
  );
  assert.equal(
    observeCachePolicy("public, private, max-age=31536000, immutable").exactPolicy,
    false,
  );
  assert.equal(isStrongQuotedEtag('"abc123"'), true);
  assert.equal(isStrongQuotedEtag('W/"abc123"'), false);
  assert.equal(isStrongQuotedEtag("abc123"), false);
  assert.equal(isStrongQuotedEtag('"contains space"'), false);
  assert.equal(normalizedCacheStatus("hit"), "HIT");
  assert.equal(normalizedCacheStatus("private-cache-token"), "UNRECOGNIZED");
});

test("parses explicit CLI options and rejects unsafe or incomplete input", async () => {
  assert.deepEqual(
    parseR2RouteCliArguments([
      "--video",
      videoUrl,
      "--sha256",
      expectedSha256,
      "--size",
      String(videoBytes.length),
      "--vtt",
      captionsUrl,
      "--poster",
      posterUrl,
    ]),
    {
      videoUrl,
      expectedSha256,
      expectedSizeBytes: videoBytes.length,
      downloadDigest: true,
      maxDownloadBytes: 512 * 1024 * 1024,
      captionsUrl,
      posterUrl,
      posterExpectedMediaType: null,
      timeoutMs: 15_000,
    },
  );
  assert.throws(() => parseR2RouteCliArguments(["--video"]), /R2_ARGUMENTS/u);
  assert.throws(() => parseR2RouteCliArguments(["--unknown", "value"]), /R2_ARGUMENTS/u);
  assert.throws(
    () => parseR2RouteCliArguments(["--video", videoUrl, "--timeout-ms", "1", "--timeout-ms", "2"]),
    /duplicate option/u,
  );
  assert.throws(
    () => parseR2RouteCliArguments(["--video", videoUrl, "--captions", captionsUrl, "--vtt", captionsUrl]),
    /duplicate option/u,
  );
  assert.throws(
    () => parseR2RouteCliArguments(["--video", videoUrl, "--poster-type", "image/webp"]),
    /requires --poster/u,
  );
  assert.equal(
    parseR2RouteCliArguments(["--video", videoUrl, "--captions", captionsUrl]).captionsUrl,
    captionsUrl,
  );
  await assert.rejects(
    verifyR2VideoRoute({
      videoUrl: "http://media.example.test/video.mp4",
      fetchImplementation: passingFetch(),
    }),
    /R2_ROUTE_URL/u,
  );
  await assert.rejects(
    verifyR2VideoRoute({
      videoUrl: `https://${["user", "placeholder"].join(":")}@media.example.test/video.mp4`,
      fetchImplementation: passingFetch(),
    }),
    /R2_ROUTE_URL/u,
  );
  await assert.rejects(
    verifyR2VideoRoute({
      videoUrl: "https://media.example.test/video.mp4?private=token",
      fetchImplementation: passingFetch(),
    }),
    /R2_ROUTE_URL/u,
  );
});

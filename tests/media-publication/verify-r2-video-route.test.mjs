import '../../tools/node-runtime-admission.mjs';
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
const descriptionsUrl = "https://media.example.test/assets/public-video.descriptions.en.vtt";
const posterUrl = "https://media.example.test/assets/public-video.webp";
const videoBytes = Buffer.from("synthetic public MP4 bytes for route verification", "utf8");
const vttBytes = Buffer.from("WEBVTT\n\n00:00.000 --> 00:01.000\nVisible cue\n", "utf8");
const posterBytes = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(12), Buffer.from("WEBP")]);
const expectedSha256 = createHash("sha256").update(videoBytes).digest("hex");
const expectedVttSha256 = createHash("sha256").update(vttBytes).digest("hex");
const expectedPosterSha256 = createHash("sha256").update(posterBytes).digest("hex");
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

function notModifiedHeaders({ extra = {} } = {}) {
  return {
    "cache-control": "public, max-age=31536000, immutable",
    etag,
    "cf-cache-status": "HIT",
    "cross-origin-resource-policy": "same-origin",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    ...extra,
  };
}

function passingFetch({
  mutateRangeHeaders,
  mutateNotModifiedHeaders,
  captionsType = "text/vtt; charset=utf-8",
  throwFor = null,
} = {}) {
  return async (url, options = {}) => {
    if (throwFor && url.pathname.includes(throwFor)) {
      throw new Error("private-token-must-not-cross-json");
    }
    const method = options.method ?? "GET";
    const requestHeaders = new Headers(options.headers);
    if (url.pathname.endsWith(".vtt")) {
      return new Response(method === "HEAD" ? null : vttBytes, {
        status: 200,
        headers: immutableHeaders({ contentType: captionsType, contentLength: vttBytes.length }),
      });
    }
    if (url.pathname.endsWith(".webp")) {
      return new Response(method === "HEAD" ? null : posterBytes, {
        status: 200,
        headers: immutableHeaders({ contentType: "image/webp", contentLength: posterBytes.length }),
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
    if (requestHeaders.get("if-none-match") === etag) {
      const headers = notModifiedHeaders();
      mutateNotModifiedHeaders?.(headers);
      return new Response(null, { status: 304, headers });
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

test("accepts exact video, captions, descriptions, and poster byte contracts", async () => {
  const result = await verifyR2VideoRoute({
    videoUrl,
    expectedSha256,
    expectedSizeBytes: videoBytes.length,
    maxDownloadBytes: 1_024,
    captionsUrl,
    captionsExpectedSha256: expectedVttSha256,
    captionsExpectedSizeBytes: vttBytes.length,
    descriptionsUrl,
    descriptionsExpectedSha256: expectedVttSha256,
    descriptionsExpectedSizeBytes: vttBytes.length,
    posterUrl,
    posterExpectedSha256: expectedPosterSha256,
    posterExpectedSizeBytes: posterBytes.length,
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
  assert.equal(result.video.notModified.status, 304);
  assert.equal(result.video.notModified.bodyNotExposed, true);
  assert.equal(result.video.notModified.contentEncodingAbsent, true);
  assert.equal(result.video.notModified.contentLengthAbsentOrMatchesHead, true);
  assert.equal(result.video.notModified.contentTypeAbsentOrMatchesHead, true);
  assert.equal(result.video.notModified.etagMatchesHead, true);
  assert.equal(result.video.notModified.cachePolicyPass, true);
  assert.equal(result.video.notModified.hardeningPass, true);
  assert.equal(result.video.notModified.acceptRangesBytes, false);
  assert.equal(result.video.notModified.ok, true);
  assert.equal(result.video.digest.observedSha256, expectedSha256);
  assert.equal(result.companions.captions.mediaTypeMatches, true);
  assert.equal(result.companions.poster.mediaTypeMatches, true);
  assert.equal(result.companions.captions.retrieval.ok, true);
  assert.equal(result.companions.descriptions.retrieval.digestExpectationApplied, true);
  assert.equal(result.companions.descriptions.retrieval.digestMatches, true);
  assert.equal(result.companions.descriptions.retrieval.sizeExpectationApplied, true);
  assert.equal(result.companions.descriptions.retrieval.expectedSizeMatches, true);
  assert.equal(result.companions.poster.retrieval.ok, true);
  assert.equal(result.companions.poster.retrieval.contentValidity, "not-assessed");
  assert.deepEqual(result.failures, []);

  const json = JSON.stringify(result);
  assert.doesNotMatch(json, /media\.example\.test/u);
  assert.doesNotMatch(json, /public-video/u);
  assert.doesNotMatch(json, /strong-r2-etag/u);
  assert.doesNotMatch(json, /synthetic public MP4/u);
});

test("sends the verified strong ETag and observes a bodyless Fetch response", async () => {
  const conditionalValidators = [];
  const fetchImplementation = async (url, options) => {
    const requestHeaders = new Headers(options.headers);
    if (requestHeaders.has("if-none-match")) {
      conditionalValidators.push(requestHeaders.get("if-none-match"));
    }
    return passingFetch()(url, options);
  };

  const result = await verifyR2VideoRoute({ videoUrl, fetchImplementation });

  assert.equal(result.ok, true);
  assert.deepEqual(conditionalValidators, [etag]);
  assert.equal(result.video.notModified.statusPass, true);
  assert.equal(result.video.notModified.bodyNotExposed, true);
  assert.equal(result.video.notModified.contentEncodingAbsent, true);
  assert.equal(result.video.notModified.contentLengthAbsentOrMatchesHead, true);
  assert.equal(result.video.notModified.contentTypeAbsentOrMatchesHead, true);
  assert.equal(result.video.notModified.etagStrongQuoted, true);
  assert.equal(result.video.notModified.etagMatchesHead, true);
  assert.equal(result.video.notModified.cache.exactPolicy, true);
  assert.equal(result.video.notModified.hardening.nosniff, true);
  assert.equal(result.video.notModified.hardening.noReferrer, true);
  assert.equal(result.video.notModified.hardening.sameOriginResourcePolicy, true);
});

test("does not require Accept-Ranges on a Fetch-observable 304", async () => {
  const result = await verifyR2VideoRoute({
    videoUrl,
    fetchImplementation: passingFetch(),
  });

  assert.equal(result.video.notModified.acceptRangesBytes, false);
  assert.equal(result.video.notModified.ok, true);
  assert.equal(result.ok, true);
});

test("accepts matching representation metadata when a 304 supplies it", async () => {
  const result = await verifyR2VideoRoute({
    videoUrl,
    fetchImplementation: passingFetch({
      mutateNotModifiedHeaders: (headers) => {
        headers["content-length"] = String(videoBytes.length);
        headers["content-type"] = "video/mp4";
      },
    }),
  });

  assert.equal(result.video.notModified.contentLength, videoBytes.length);
  assert.equal(result.video.notModified.contentLengthAbsentOrMatchesHead, true);
  assert.equal(result.video.notModified.contentType, "video/mp4");
  assert.equal(result.video.notModified.contentTypeAbsentOrMatchesHead, true);
  assert.equal(result.video.notModified.ok, true);
  assert.equal(result.ok, true);
});

test("requires a 304 whose response adapter exposes no body", async (context) => {
  await context.test("complete response", async () => {
    const fetchImplementation = async (url, options) => {
      if (new Headers(options.headers).has("if-none-match")) {
        return new Response(videoBytes, {
          status: 200,
          headers: notModifiedHeaders(),
        });
      }
      return passingFetch()(url, options);
    };
    const result = await verifyR2VideoRoute({ videoUrl, fetchImplementation });

    assert.equal(result.video.notModified.statusPass, false);
    assert.equal(result.video.notModified.bodyNotExposed, false);
    assert.deepEqual(result.failures, [
      { resource: "video", check: "not-modified-contract" },
    ]);
  });

  await context.test("custom response adapter that exposes a 304 body", async () => {
    let cancellationCount = 0;
    const fetchImplementation = async (url, options) => {
      if (new Headers(options.headers).has("if-none-match")) {
        return {
          status: 304,
          headers: new Headers(notModifiedHeaders()),
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(videoBytes);
            },
            cancel() {
              cancellationCount += 1;
            },
          }),
        };
      }
      return passingFetch()(url, options);
    };
    const result = await verifyR2VideoRoute({ videoUrl, fetchImplementation });

    assert.equal(result.video.notModified.statusPass, true);
    assert.equal(result.video.notModified.bodyNotExposed, false);
    assert.equal(cancellationCount, 1);
    assert.deepEqual(result.failures, [
      { resource: "video", check: "not-modified-contract" },
    ]);
  });
});

test("requires the 304 validator, exact cache policy, and selected hardening headers", async (context) => {
  const cases = [
    {
      name: "matching ETag",
      mutate(headers) { headers.etag = '"different-private-etag"'; },
      assertFailure(observation) { assert.equal(observation.etagMatchesHead, false); },
    },
    {
      name: "exact immutable cache policy",
      mutate(headers) { headers["cache-control"] = "public, max-age=31536000"; },
      assertFailure(observation) { assert.equal(observation.cachePolicyPass, false); },
    },
    {
      name: "absent Content-Encoding",
      mutate(headers) { headers["content-encoding"] = "gzip"; },
      assertFailure(observation) { assert.equal(observation.contentEncodingAbsent, false); },
    },
    {
      name: "absent or HEAD-matching Content-Length",
      mutate(headers) { headers["content-length"] = String(videoBytes.length + 1); },
      assertFailure(observation) {
        assert.equal(observation.contentLengthAbsentOrMatchesHead, false);
      },
    },
    {
      name: "absent or HEAD-matching Content-Type",
      mutate(headers) { headers["content-type"] = "image/webp"; },
      assertFailure(observation) {
        assert.equal(observation.contentTypeAbsentOrMatchesHead, false);
      },
    },
    ...[
      ["nosniff", "x-content-type-options"],
      ["no-referrer", "referrer-policy"],
      ["same-origin resource policy", "cross-origin-resource-policy"],
    ].map(([name, header]) => ({
      name,
      mutate(headers) { delete headers[header]; },
      assertFailure(observation) { assert.equal(observation.hardeningPass, false); },
    })),
  ];

  for (const testCase of cases) {
    await context.test(testCase.name, async () => {
      const result = await verifyR2VideoRoute({
        videoUrl,
        fetchImplementation: passingFetch({
          mutateNotModifiedHeaders: testCase.mutate,
        }),
      });

      assert.equal(result.video.notModified.statusPass, true);
      testCase.assertFailure(result.video.notModified);
      assert.equal(result.video.notModified.ok, false);
      assert.deepEqual(result.failures, [
        { resource: "video", check: "not-modified-contract" },
      ]);
      const json = JSON.stringify(result);
      assert.doesNotMatch(json, /strong-r2-etag/u);
      assert.doesNotMatch(json, /different-private-etag/u);
    });
  }
});

test("sanitizes a conditional request failure without exposing its ETag", async () => {
  const fetchImplementation = async (url, options) => {
    if (new Headers(options.headers).has("if-none-match")) {
      throw new Error("strong-r2-etag private conditional diagnostic");
    }
    return passingFetch()(url, options);
  };
  const result = await verifyR2VideoRoute({ videoUrl, fetchImplementation });

  assert.equal(result.video.notModified.requestAttempted, true);
  assert.equal(result.video.notModified.requestError, true);
  assert.equal(result.video.notModified.failureKind, "transport");
  assert.deepEqual(result.failures, [
    { resource: "video", check: "not-modified-contract" },
  ]);
  assert.doesNotMatch(JSON.stringify(result), /strong-r2-etag/u);
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
  assert.equal(result.video.range.requestAttempted, false);
  assert.equal(result.video.range.failureKind, "head-prerequisite");
});

test("a cold-range-first observation makes the range request first and then binds HEAD", async () => {
  const requests = [];
  const fetchImplementation = async (url, options) => {
    requests.push({
      method: options.method ?? "GET",
      range: new Headers(options.headers).get("range"),
    });
    return passingFetch({
      mutateRangeHeaders: (headers) => {
        headers["cf-cache-status"] = "MISS";
      },
    })(url, options);
  };
  const result = await verifyR2VideoRoute({
    videoUrl,
    expectedSha256,
    expectedSizeBytes: videoBytes.length,
    observationOrder: "cold-range-first",
    fetchImplementation,
  });

  assert.equal(result.ok, true);
  assert.equal(result.observationOrder, "cold-range-first");
  assert.deepEqual(requests.slice(0, 2), [
    { method: "GET", range: "bytes=0-1" },
    { method: "HEAD", range: null },
  ]);
  assert.equal(result.video.range.etagMatchesHead, true);
  assert.equal(result.video.range.cacheStatusExpected, "MISS");
  assert.equal(result.video.range.cacheStatusMatches, true);
});

test("a cold-range-first observation rejects an already warm range response", async () => {
  const requests = [];
  const fetchImplementation = async (url, options) => {
    requests.push(options.method ?? "GET");
    return passingFetch()(url, options);
  };
  const result = await verifyR2VideoRoute({
    videoUrl,
    observationOrder: "cold-range-first",
    fetchImplementation,
  });

  assert.deepEqual(requests, ["GET"]);
  assert.equal(result.video.range.cacheStatus, "HIT");
  assert.equal(result.video.range.cacheStatusExpected, "MISS");
  assert.equal(result.video.range.cacheStatusMatches, false);
  assert.equal(result.video.head.requestAttempted, false);
  assert.deepEqual(result.failures, [{ resource: "video", check: "range-contract" }]);
});

test("a failed cold range remains the causal failure and leaves HEAD unrequested", async () => {
  const requests = [];
  const fetchImplementation = async (_url, options) => {
    requests.push(options.method ?? "GET");
    return new Response(null, { status: 503 });
  };
  const result = await verifyR2VideoRoute({
    videoUrl,
    observationOrder: "cold-range-first",
    fetchImplementation,
  });
  assert.deepEqual(requests, ["GET"]);
  assert.equal(result.video.head.requestAttempted, false);
  assert.deepEqual(result.failures, [{ resource: "video", check: "range-contract" }]);
});

test("an unaccepted HEAD gates dependent video requests and returns one causal failure", async () => {
  const requests = [];
  const fetchImplementation = async (url, options) => {
    requests.push(options.method ?? "GET");
    return new Response(null, { status: 503 });
  };
  const result = await verifyR2VideoRoute({
    videoUrl,
    downloadDigest: true,
    fetchImplementation,
  });

  assert.deepEqual(requests, ["HEAD"]);
  assert.equal(result.video.range.requestAttempted, false);
  assert.equal(result.video.unsatisfiableRange.requestAttempted, false);
  assert.equal(result.video.notModified.requestAttempted, false);
  assert.equal(result.video.digest.requestAttempted, false);
  assert.deepEqual(result.failures, [{ resource: "video", check: "head-contract" }]);
});

test("the exact-body reader cancels an oversized first transport chunk", async () => {
  let cancellationCount = 0;
  const fetchImplementation = async (url, options) => {
    const method = options.method ?? "GET";
    const range = new Headers(options.headers).get("range");
    if (method === "HEAD") return passingFetch()(url, options);
    if (range === "bytes=0-1") {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(100 * 1024));
        },
        cancel() {
          cancellationCount += 1;
        },
      });
      return new Response(body, {
        status: 206,
        headers: immutableHeaders({
          contentType: "video/mp4",
          contentLength: 2,
          extra: {
            "accept-ranges": "bytes",
            "content-range": `bytes 0-1/${videoBytes.length}`,
          },
        }),
      });
    }
    return passingFetch()(url, options);
  };
  const result = await verifyR2VideoRoute({ videoUrl, fetchImplementation });
  assert.equal(result.video.range.bodyTooLarge, true);
  assert.equal(result.video.range.bodyCancelled, true);
  assert.equal(cancellationCount, 1);
});

test("a video above the cacheable-object boundary stops after HEAD", async () => {
  const requests = [];
  const fetchImplementation = async (_url, options) => {
    requests.push(options.method ?? "GET");
    return new Response(null, {
      status: 200,
      headers: immutableHeaders({
        contentType: "video/mp4",
        contentLength: 512_000_001,
        extra: { "accept-ranges": "bytes" },
      }),
    });
  };
  const result = await verifyR2VideoRoute({ videoUrl, fetchImplementation });
  assert.equal(result.video.head.sizeWithinBoundary, false);
  assert.deepEqual(requests, ["HEAD"]);
});

test("an observed companion above 32 MiB receives the explicit size-boundary receipt", async () => {
  const companionRequests = [];
  const fetchImplementation = async (url, options) => {
    if (url.pathname.endsWith(".vtt")) {
      companionRequests.push(options.method ?? "GET");
      return new Response(null, {
        status: 200,
        headers: immutableHeaders({
          contentType: "text/vtt; charset=utf-8",
          contentLength: 32 * 1024 * 1024 + 1,
        }),
      });
    }
    return passingFetch()(url, options);
  };
  const result = await verifyR2VideoRoute({
    videoUrl,
    captionsUrl,
    fetchImplementation,
  });

  assert.equal(result.companions.captions.sizeWithinBoundary, false);
  assert.equal(result.companions.captions.retrieval.status, "size-boundary");
  assert.equal(result.companions.captions.retrieval.failureKind, "size-boundary");
  assert.deepEqual(companionRequests, ["HEAD"]);
});

test("rejects declared identities outside the route boundary before making a request", async () => {
  let requestCount = 0;
  const fetchImplementation = async () => {
    requestCount += 1;
    throw new Error("request should remain unattempted");
  };

  await assert.rejects(
    verifyR2VideoRoute({
      videoUrl,
      expectedSizeBytes: 512_000_001,
      fetchImplementation,
    }),
    /R2_EXPECTED_SIZE/u,
  );
  await assert.rejects(
    verifyR2VideoRoute({
      videoUrl,
      captionsUrl,
      captionsExpectedSizeBytes: 32 * 1024 * 1024 + 1,
      fetchImplementation,
    }),
    /R2_EXPECTED_SIZE/u,
  );
  await assert.rejects(
    verifyR2VideoRoute({
      videoUrl,
      maxDownloadBytes: 512_000_001,
      fetchImplementation,
    }),
    /R2_DOWNLOAD_BOUNDARY/u,
  );
  assert.equal(requestCount, 0);
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
    { method: "GET", range: null },
  ]);
  assert.deepEqual(result.failures, [{ resource: "video", check: "download-digest" }]);
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
  assert.equal(result.companions.poster.retrieval.digestExpectationApplied, false);
  assert.equal(result.companions.poster.retrieval.digestMatches, null);
  assert.equal(result.companions.poster.retrieval.sizeExpectationApplied, false);
  assert.equal(result.companions.poster.retrieval.expectedSizeMatches, null);
  assert.deepEqual(result.failures, [
    { resource: "captions", check: "companion-head-contract" },
  ]);
});

test("requires the UTF-8 charset contract for caption and description carriers", async () => {
  const result = await verifyR2VideoRoute({
    videoUrl,
    captionsUrl,
    fetchImplementation: passingFetch({ captionsType: "text/vtt" }),
  });

  assert.equal(result.videoPass, true);
  assert.equal(result.companions.captions.mediaType, "text/vtt");
  assert.equal(result.companions.captions.contentType, "text/vtt");
  assert.equal(result.companions.captions.expectedContentType, "text/vtt; charset=utf-8");
  assert.equal(result.companions.captions.mediaTypeMatches, false);
  assert.deepEqual(result.failures, [
    { resource: "captions", check: "companion-head-contract" },
  ]);
});

test("labels companion retrieval failure after an accepted HEAD", async () => {
  const fetchImplementation = async (url, options) => {
    if (url.pathname.endsWith(".vtt") && (options.method ?? "GET") === "GET") {
      throw new Error("private retrieval diagnostic");
    }
    return passingFetch()(url, options);
  };
  const result = await verifyR2VideoRoute({
    videoUrl,
    captionsUrl,
    fetchImplementation,
  });
  assert.equal(result.companions.captions.statusPass, true);
  assert.equal(result.companions.captions.retrieval.failureStage, "request");
  assert.deepEqual(result.failures, [
    { resource: "captions", check: "companion-retrieval-contract" },
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
  assert.equal(result.companions.captions.retrieval.status, "not-run");
  assert.equal(result.companions.captions.retrieval.failureKind, "head-prerequisite");
  const json = JSON.stringify(result);
  assert.doesNotMatch(json, /private-token/u);
  assert.doesNotMatch(json, /media\.example\.test/u);
  assert.doesNotMatch(json, /\.vtt/u);
});

test("video observations retain one complete schema across outcomes", async () => {
  const accepted = await verifyR2VideoRoute({ videoUrl, fetchImplementation: passingFetch() });
  const failed = await verifyR2VideoRoute({
    videoUrl,
    fetchImplementation: async () => { throw new Error("private diagnostic"); },
  });
  for (const key of ["head", "range", "notModified", "digest"]) {
    assert.deepEqual(
      Object.keys(failed.video[key]).sort(),
      Object.keys(accepted.video[key]).sort(),
      key,
    );
  }
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
      maxDownloadBytes: 512_000_000,
      observationOrder: "head-first",
      captionsUrl,
      captionsExpectedSha256: null,
      captionsExpectedSizeBytes: null,
      descriptionsUrl: null,
      descriptionsExpectedSha256: null,
      descriptionsExpectedSizeBytes: null,
      posterUrl,
      posterExpectedMediaType: null,
      posterExpectedSha256: null,
      posterExpectedSizeBytes: null,
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
  assert.equal(
    parseR2RouteCliArguments([
      "--video",
      videoUrl,
      "--cold-range-first",
      "--descriptions",
      descriptionsUrl,
    ]).observationOrder,
    "cold-range-first",
  );
  assert.throws(
    () => parseR2RouteCliArguments([
      "--video",
      videoUrl,
      "--descriptions-sha256",
      expectedVttSha256,
    ]),
    /matching URL option/u,
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

#!/usr/bin/env node
import './node-runtime-admission.mjs';
import { isDirectExecution } from './check-node-runtime.mjs';

import { createHash } from "node:crypto";
import { resolve } from "node:path";

const MAX_CACHEABLE_OBJECT_BYTES = 512_000_000;
const MAX_COMPANION_DOWNLOAD_BYTES = 32 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_DOWNLOAD_BYTES = MAX_CACHEABLE_OBJECT_BYTES;
const POSTER_MEDIA_TYPES = new Map([
  [".avif", "image/avif"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);
const RECOGNIZED_MEDIA_TYPES = new Set([
  "video/mp4",
  "text/vtt",
  ...POSTER_MEDIA_TYPES.values(),
]);
const RECOGNIZED_CACHE_STATUSES = new Set([
  "BYPASS",
  "DYNAMIC",
  "EXPIRED",
  "HIT",
  "MISS",
  "REVALIDATED",
  "STALE",
  "UPDATING",
]);

export class R2RouteVerificationError extends Error {
  constructor(code, message, options) {
    super(`${code}: ${message}`, options);
    this.name = "R2RouteVerificationError";
    this.code = code;
  }
}

function routeError(code, message, cause) {
  return new R2RouteVerificationError(code, message, cause ? { cause } : undefined);
}

function hasEmbeddedUrlCredentials(parsed) {
  const authorityStart = parsed.protocol.length + 2;
  const authorityEnd = parsed.href.indexOf("/", authorityStart);
  return parsed.href.slice(authorityStart, authorityEnd).includes("@");
}

function parsedHttpsUrl(value, role) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    throw routeError("R2_ROUTE_URL", `${role} must be an absolute HTTPS URL`, error);
  }
  if (
    parsed.protocol !== "https:"
    || hasEmbeddedUrlCredentials(parsed)
    || parsed.search !== ""
    || parsed.hash !== ""
  ) {
    throw routeError(
      "R2_ROUTE_URL",
      `${role} must be an absolute HTTPS URL without credentials, a query, or a fragment`,
    );
  }
  return parsed;
}

function normalizedMediaType(value) {
  const type = value?.split(";", 1)[0]?.trim().toLowerCase() ?? null;
  return RECOGNIZED_MEDIA_TYPES.has(type) ? type : type === null ? null : "unrecognized";
}

function normalizedContentType(value) {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  return value
    .trim()
    .toLowerCase()
    .replace(/\s*;\s*/gu, "; ")
    .replace(/\s*=\s*/gu, "=");
}

function integerHeader(value) {
  if (!/^(?:0|[1-9]\d*)$/u.test(value ?? "")) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function observeCachePolicy(value) {
  const directives = new Map();
  const parts = String(value ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    const [name, ...rawValue] = part.trim().toLowerCase().split("=");
    if (name.length === 0) continue;
    directives.set(name, rawValue.length > 0 ? rawValue.join("=").replace(/^"|"$/gu, "") : true);
  }
  const maxAge = directives.get("max-age");
  const maxAgeSeconds = /^(?:0|[1-9]\d*)$/u.test(String(maxAge)) ? Number(maxAge) : null;
  const exactPolicy = (
    parts.length === 3
    && directives.size === 3
    && directives.get("public") === true
    && directives.get("immutable") === true
    && maxAgeSeconds === 31_536_000
  );
  return {
    present: typeof value === "string" && value.trim().length > 0,
    public: directives.has("public"),
    immutable: directives.has("immutable"),
    maxAgeSeconds: Number.isSafeInteger(maxAgeSeconds) ? maxAgeSeconds : null,
    exactPolicy,
  };
}

export function isStrongQuotedEtag(value) {
  return (
    typeof value === "string"
    && value.length >= 2
    && value.length <= 256
    && !/^W\//iu.test(value)
    && /^"[!#-~\x80-\xff]*"$/u.test(value)
  );
}

function cachePolicyPass(cache) {
  return (
    cache.exactPolicy
  );
}

export function normalizedCacheStatus(value) {
  if (value === null) return null;
  const normalized = String(value).trim().toUpperCase();
  return RECOGNIZED_CACHE_STATUSES.has(normalized) ? normalized : "UNRECOGNIZED";
}

function hardeningHeaderObservation(headers) {
  return {
    nosniff: headers.get("x-content-type-options")?.trim().toLowerCase() === "nosniff",
    noReferrer: headers.get("referrer-policy")?.trim().toLowerCase() === "no-referrer",
    sameOriginResourcePolicy:
      headers.get("cross-origin-resource-policy")?.trim().toLowerCase() === "same-origin",
  };
}

function commonHeaderObservation(headers, expectedMediaType) {
  const contentType = normalizedContentType(headers.get("content-type"));
  const expectedContentType = normalizedContentType(expectedMediaType);
  const mediaType = normalizedMediaType(contentType);
  const cache = observeCachePolicy(headers.get("cache-control"));
  const hardening = hardeningHeaderObservation(headers);
  return {
    mediaType,
    contentType,
    expectedContentType,
    mediaTypeMatches: (
      mediaType === normalizedMediaType(expectedMediaType)
      && contentType === expectedContentType
    ),
    contentLength: integerHeader(headers.get("content-length")),
    contentEncodingAbsent: headers.get("content-encoding") === null,
    acceptRangesBytes: headers.get("accept-ranges")?.trim().toLowerCase() === "bytes",
    etag: {
      present: headers.get("etag") !== null,
      strongQuoted: isStrongQuotedEtag(headers.get("etag")),
    },
    cache,
    cachePolicyPass: cachePolicyPass(cache),
    cacheStatus: normalizedCacheStatus(headers.get("cf-cache-status")),
    hardening,
    hardeningPass: Object.values(hardening).every(Boolean),
  };
}

async function cancelBody(response) {
  try {
    await response.body?.cancel();
  } catch {
    // Headers and status remain usable when an unused body cannot be cancelled.
  }
}

async function request(fetchImplementation, url, options, timeoutMs) {
  try {
    return {
      response: await fetchImplementation(url, {
        ...options,
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      }),
      requestError: false,
      requestFailureKind: null,
    };
  } catch (error) {
    const name = String(error?.name ?? "").toLowerCase();
    const requestFailureKind = name.includes("timeout") || name.includes("abort")
      ? "timeout-or-abort"
      : "transport";
    return { response: null, requestError: true, requestFailureKind };
  }
}

function safeStatus(response) {
  return Number.isSafeInteger(response?.status) ? response.status : null;
}

function failedHeadObservation(expectedMediaType, overrides = {}) {
  return {
    requestAttempted: true,
    status: null,
    statusPass: false,
    requestError: true,
    failureStage: "request",
    failureKind: "transport",
    expectedMediaType,
    mediaType: null,
    contentType: null,
    expectedContentType: normalizedContentType(expectedMediaType),
    mediaTypeMatches: false,
    contentLength: null,
    positiveContentLength: false,
    sizeMatches: false,
    sizeWithinBoundary: false,
    contentEncodingAbsent: false,
    acceptRangesBytes: false,
    etag: { present: false, strongQuoted: false },
    cache: {
      present: false,
      public: false,
      immutable: false,
      maxAgeSeconds: null,
      exactPolicy: false,
    },
    cachePolicyPass: false,
    cacheStatus: null,
    hardening: {
      nosniff: false,
      noReferrer: false,
      sameOriginResourcePolicy: false,
    },
    hardeningPass: false,
    ok: false,
    ...overrides,
  };
}

function skippedHeadObservation(expectedMediaType, failureKind = "range-prerequisite") {
  return failedHeadObservation(expectedMediaType, {
    requestAttempted: false,
    requestError: false,
    failureStage: "prerequisite",
    failureKind,
  });
}

async function inspectHead({
  url,
  expectedMediaType,
  fetchImplementation,
  timeoutMs,
  requireRanges,
  expectedSizeBytes,
  maximumSizeBytes = MAX_CACHEABLE_OBJECT_BYTES,
}) {
  const { response, requestError, requestFailureKind } = await request(
    fetchImplementation,
    url,
    {
      method: "HEAD",
      headers: {
        "accept-encoding": "identity",
        "user-agent": "human-ai-systems-exemplars-r2-video-verifier/1",
      },
    },
    timeoutMs,
  );
  if (requestError) {
    return {
      observation: failedHeadObservation(expectedMediaType, {
        failureKind: requestFailureKind,
      }),
      etag: null,
    };
  }

  const headers = commonHeaderObservation(response.headers, expectedMediaType);
  const status = safeStatus(response);
  const positiveContentLength = headers.contentLength !== null && headers.contentLength > 0;
  const sizeMatches = expectedSizeBytes === null || headers.contentLength === expectedSizeBytes;
  const sizeWithinBoundary = (
    positiveContentLength
    && headers.contentLength <= maximumSizeBytes
  );
  const observation = {
    requestAttempted: true,
    status,
    statusPass: status === 200,
    requestError: false,
    failureStage: null,
    failureKind: null,
    expectedMediaType,
    ...headers,
    positiveContentLength,
    sizeMatches,
    sizeWithinBoundary,
  };
  observation.ok = (
    observation.statusPass
    && observation.mediaTypeMatches
    && observation.positiveContentLength
    && observation.sizeMatches
    && observation.sizeWithinBoundary
    && observation.contentEncodingAbsent
    && observation.etag.strongQuoted
    && observation.cachePolicyPass
    && observation.hardeningPass
    && (!requireRanges || observation.acceptRangesBytes)
  );
  await cancelBody(response);
  return { observation, etag: response.headers.get("etag") };
}

async function consumeBoundedBody(response, maximumBytes, { collectBytes = false, digest = false } = {}) {
  if (!response.body) {
    return {
      bytes: collectBytes ? Buffer.alloc(0) : null,
      cancelled: false,
      sha256: digest ? createHash("sha256").digest("hex") : null,
      sizeBytes: 0,
      tooLarge: false,
    };
  }
  const reader = response.body.getReader();
  const chunks = collectBytes ? [] : null;
  const hash = digest ? createHash("sha256") : null;
  let sizeBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkLength = value?.byteLength ?? 0;
      if (sizeBytes + chunkLength > maximumBytes) {
        sizeBytes += chunkLength;
        await reader.cancel();
        return {
          bytes: null,
          cancelled: true,
          sha256: null,
          sizeBytes,
          tooLarge: true,
        };
      }
      sizeBytes += chunkLength;
      if (collectBytes) {
        chunks.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
      }
      if (digest) hash.update(value);
    }
  } finally {
    reader.releaseLock();
  }
  return {
    bytes: collectBytes ? Buffer.concat(chunks, sizeBytes) : null,
    cancelled: false,
    sha256: digest ? hash.digest("hex") : null,
    sizeBytes,
    tooLarge: false,
  };
}

async function readExactBoundedBody(response, maximumBytes) {
  return consumeBoundedBody(response, maximumBytes, { collectBytes: true });
}

function failedRangeObservation(overrides = {}) {
  return {
    requestAttempted: true,
    status: null,
    statusPass: false,
    requestError: true,
    failureStage: "request",
    failureKind: "transport",
    contentRangeExact: false,
    observedTotalBytes: null,
    sizeWithinBoundary: false,
    contentLengthExact: false,
    bodyLengthExact: false,
    bodyTooLarge: false,
    bodyCancelled: false,
    contentEncodingAbsent: false,
    mediaTypeMatches: false,
    acceptRangesBytes: false,
    etagStrongQuoted: false,
    etagMatchesHead: false,
    etagAnchorPass: false,
    cachePolicyPass: false,
    cacheStatus: null,
    cacheStatusExpected: null,
    cacheStatusMatches: false,
    hardeningPass: false,
    ok: false,
    ...overrides,
  };
}

function skippedRangeObservation(failureKind = "head-prerequisite") {
  return failedRangeObservation({
    requestAttempted: false,
    requestError: false,
    failureStage: "prerequisite",
    failureKind,
  });
}

function failedUnsatisfiableRangeObservation(overrides = {}) {
  return {
    requestAttempted: true,
    status: null,
    statusPass: false,
    requestError: true,
    failureStage: "request",
    failureKind: "transport",
    contentRangeExact: false,
    contentEncodingAbsent: false,
    ok: false,
    ...overrides,
  };
}

function skippedUnsatisfiableRangeObservation() {
  return failedUnsatisfiableRangeObservation({
    requestAttempted: false,
    requestError: false,
    failureStage: "prerequisite",
    failureKind: "head-prerequisite",
  });
}

function rangeObservationPass(observation) {
  return (
    observation.statusPass
    && observation.contentRangeExact
    && observation.sizeWithinBoundary
    && observation.contentLengthExact
    && observation.bodyLengthExact
    && observation.contentEncodingAbsent
    && observation.mediaTypeMatches
    && observation.etagAnchorPass
    && observation.cachePolicyPass
    && observation.cacheStatusMatches
    && observation.hardeningPass
  );
}

async function inspectRange({
  url,
  totalBytes,
  headEtag,
  fetchImplementation,
  timeoutMs,
  permitIndependentAnchor = false,
  expectedCacheStatus = null,
}) {
  const { response, requestError, requestFailureKind } = await request(
    fetchImplementation,
    url,
    {
      method: "GET",
      headers: {
        range: "bytes=0-1",
        "accept-encoding": "identity",
        "user-agent": "human-ai-systems-exemplars-r2-video-verifier/1",
      },
    },
    timeoutMs,
  );
  if (requestError) {
    return {
      observation: failedRangeObservation({ failureKind: requestFailureKind }),
      etag: null,
      totalBytes: null,
    };
  }
  const status = safeStatus(response);
  const headers = commonHeaderObservation(response.headers, "video/mp4");
  let body;
  try {
    body = await readExactBoundedBody(response, 2);
  } catch {
    await cancelBody(response);
    return {
      observation: failedRangeObservation({
        status,
        statusPass: status === 206,
        requestError: false,
        failureStage: "body-read",
        failureKind: "body-read-failed",
      }),
      etag: null,
      totalBytes: null,
    };
  }
  const contentRange = /^bytes 0-1\/([1-9]\d*)$/u.exec(
    response.headers.get("content-range") ?? "",
  );
  const observedTotalBytes = contentRange ? integerHeader(contentRange[1]) : null;
  const responseEtag = response.headers.get("etag");
  const etagStrongQuoted = isStrongQuotedEtag(responseEtag);
  const etagMatchesHead = headEtag === null ? null : responseEtag === headEtag;
  const observation = {
    requestAttempted: true,
    status,
    statusPass: status === 206,
    requestError: false,
    failureStage: null,
    failureKind: null,
    contentRangeExact: (
      observedTotalBytes !== null
      && (totalBytes === null || observedTotalBytes === totalBytes)
    ),
    observedTotalBytes,
    sizeWithinBoundary: (
      observedTotalBytes !== null
      && observedTotalBytes <= MAX_CACHEABLE_OBJECT_BYTES
    ),
    contentLengthExact: response.headers.get("content-length") === "2",
    bodyLengthExact: !body.tooLarge && body.bytes?.byteLength === 2,
    bodyTooLarge: body.tooLarge,
    bodyCancelled: body.cancelled,
    contentEncodingAbsent: headers.contentEncodingAbsent,
    mediaTypeMatches: headers.mediaTypeMatches,
    acceptRangesBytes: headers.acceptRangesBytes,
    etagStrongQuoted,
    etagMatchesHead,
    etagAnchorPass: headEtag === null ? permitIndependentAnchor && etagStrongQuoted : etagMatchesHead,
    cachePolicyPass: headers.cachePolicyPass,
    cacheStatus: headers.cacheStatus,
    cacheStatusExpected: expectedCacheStatus,
    cacheStatusMatches: (
      expectedCacheStatus === null
      || headers.cacheStatus === expectedCacheStatus
    ),
    hardeningPass: headers.hardeningPass,
  };
  observation.ok = rangeObservationPass(observation);
  return { observation, etag: responseEtag, totalBytes: observedTotalBytes };
}

async function inspectUnsatisfiableRange({
  url,
  totalBytes,
  fetchImplementation,
  timeoutMs,
}) {
  if (totalBytes === null) return skippedUnsatisfiableRangeObservation();
  const { response, requestError, requestFailureKind } = await request(
    fetchImplementation,
    url,
    {
      method: "GET",
      headers: {
        range: `bytes=${totalBytes}-`,
        "accept-encoding": "identity",
        "user-agent": "human-ai-systems-exemplars-r2-video-verifier/1",
      },
    },
    timeoutMs,
  );
  if (requestError) {
    return failedUnsatisfiableRangeObservation({ failureKind: requestFailureKind });
  }
  const status = safeStatus(response);
  const observation = {
    requestAttempted: true,
    status,
    statusPass: status === 416,
    requestError: false,
    failureStage: null,
    failureKind: null,
    contentRangeExact: response.headers.get("content-range") === `bytes */${totalBytes}`,
    contentEncodingAbsent: response.headers.get("content-encoding") === null,
  };
  observation.ok = (
    observation.statusPass
    && observation.contentRangeExact
    && observation.contentEncodingAbsent
  );
  await cancelBody(response);
  return observation;
}

function failedNotModifiedObservation(overrides = {}) {
  return {
    requestAttempted: true,
    status: null,
    statusPass: false,
    requestError: true,
    failureStage: "request",
    failureKind: "transport",
    bodyNotExposed: false,
    contentEncodingAbsent: false,
    contentLength: null,
    contentLengthAbsentOrMatchesHead: false,
    contentType: null,
    contentTypeAbsentOrMatchesHead: false,
    acceptRangesBytes: false,
    etagPresent: false,
    etagStrongQuoted: false,
    etagMatchesHead: false,
    cache: {
      present: false,
      public: false,
      immutable: false,
      maxAgeSeconds: null,
      exactPolicy: false,
    },
    cachePolicyPass: false,
    cacheStatus: null,
    hardening: {
      nosniff: false,
      noReferrer: false,
      sameOriginResourcePolicy: false,
    },
    hardeningPass: false,
    ok: false,
    ...overrides,
  };
}

function skippedNotModifiedObservation(failureKind = "head-or-range-prerequisite") {
  return failedNotModifiedObservation({
    requestAttempted: false,
    requestError: false,
    failureStage: "prerequisite",
    failureKind,
  });
}

async function inspectNotModified({
  url,
  headEtag,
  headContentLength,
  headContentType,
  fetchImplementation,
  timeoutMs,
}) {
  if (!isStrongQuotedEtag(headEtag)) {
    return skippedNotModifiedObservation("strong-etag-prerequisite");
  }
  const { response, requestError, requestFailureKind } = await request(
    fetchImplementation,
    url,
    {
      method: "GET",
      headers: {
        "if-none-match": headEtag,
        "accept-encoding": "identity",
        "user-agent": "human-ai-systems-exemplars-r2-video-verifier/1",
      },
    },
    timeoutMs,
  );
  if (requestError) {
    return failedNotModifiedObservation({ failureKind: requestFailureKind });
  }

  const status = safeStatus(response);
  const responseEtag = response.headers.get("etag");
  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader === null
    ? null
    : integerHeader(contentLengthHeader);
  const contentTypeHeader = response.headers.get("content-type");
  const contentType = normalizedContentType(contentTypeHeader);
  const cache = observeCachePolicy(response.headers.get("cache-control"));
  const hardening = hardeningHeaderObservation(response.headers);
  const observation = {
    requestAttempted: true,
    status,
    statusPass: status === 304,
    requestError: false,
    failureStage: null,
    failureKind: null,
    // Fetch normalizes 304 responses. This records its observable body state,
    // rather than claiming inspection of raw response octets on the wire.
    bodyNotExposed: response.body === null,
    contentEncodingAbsent: !response.headers.has("content-encoding"),
    contentLength,
    contentLengthAbsentOrMatchesHead: (
      contentLengthHeader === null
      || contentLength === headContentLength
    ),
    contentType,
    contentTypeAbsentOrMatchesHead: (
      contentTypeHeader === null
      || contentType === headContentType
    ),
    // Warm-cache 304s may omit Accept-Ranges, which the 304 contract does not require.
    acceptRangesBytes:
      response.headers.get("accept-ranges")?.trim().toLowerCase() === "bytes",
    etagPresent: responseEtag !== null,
    etagStrongQuoted: isStrongQuotedEtag(responseEtag),
    etagMatchesHead: responseEtag === headEtag,
    cache,
    cachePolicyPass: cachePolicyPass(cache),
    cacheStatus: normalizedCacheStatus(response.headers.get("cf-cache-status")),
    hardening,
    hardeningPass: Object.values(hardening).every(Boolean),
  };
  observation.ok = (
    observation.statusPass
    && observation.bodyNotExposed
    && observation.contentEncodingAbsent
    && observation.contentLengthAbsentOrMatchesHead
    && observation.contentTypeAbsentOrMatchesHead
    && observation.etagStrongQuoted
    && observation.etagMatchesHead
    && observation.cachePolicyPass
    && observation.hardeningPass
  );
  await cancelBody(response);
  return observation;
}

async function digestBody(response, maximumBytes) {
  return consumeBoundedBody(response, maximumBytes, { digest: true });
}

function digestObservation(requested, overrides = {}) {
  return {
    requested,
    requestAttempted: false,
    status: requested ? "not-run" : "not-requested",
    httpStatus: null,
    statusPass: requested ? false : null,
    requestError: false,
    failureStage: requested ? "prerequisite" : null,
    failureKind: requested ? "not-run" : null,
    observedSha256: null,
    sizeBytes: null,
    digestMatches: requested ? false : null,
    sizeMatchesHead: requested ? false : null,
    declaredSizeMatchesHead: requested ? false : null,
    withinBoundary: requested ? false : null,
    mediaTypeMatches: requested ? false : null,
    contentEncodingAbsent: requested ? false : null,
    acceptRangesBytes: requested ? false : null,
    etagMatchesHead: requested ? false : null,
    cachePolicyPass: requested ? false : null,
    cacheStatus: null,
    hardeningPass: requested ? false : null,
    ok: !requested,
    ...overrides,
  };
}

function skippedDigestObservation(requested, failureKind = "not-run") {
  return digestObservation(requested, {
    failureKind: requested ? failureKind : null,
  });
}

async function inspectDigest({
  url,
  requested,
  expectedSha256,
  totalBytes,
  headEtag,
  maximumBytes,
  fetchImplementation,
  timeoutMs,
}) {
  if (requested === false) return skippedDigestObservation(false);
  if (totalBytes === null || totalBytes > maximumBytes) {
    return digestObservation(true, {
      status: "size-boundary",
      failureStage: "boundary",
      failureKind: "size-boundary",
      withinBoundary: false,
    });
  }
  const { response, requestError, requestFailureKind } = await request(
    fetchImplementation,
    url,
    {
      method: "GET",
      headers: {
        "accept-encoding": "identity",
        "user-agent": "human-ai-systems-exemplars-r2-video-verifier/1",
      },
    },
    timeoutMs,
  );
  if (requestError) {
    return digestObservation(true, {
      requestAttempted: true,
      status: "request-failed",
      requestError: true,
      failureStage: "request",
      failureKind: requestFailureKind,
    });
  }
  const headers = commonHeaderObservation(response.headers, "video/mp4");
  let body;
  try {
    body = await digestBody(response, maximumBytes);
  } catch {
    await cancelBody(response);
    return digestObservation(true, {
      requestAttempted: true,
      status: "body-read-failed",
      httpStatus: safeStatus(response),
      requestError: true,
      failureStage: "body-read",
      failureKind: "body-read-failed",
    });
  }
  const statusPass = response.status === 200;
  const digestMatches = expectedSha256 === null || body.sha256 === expectedSha256;
  const sizeMatchesHead = !body.tooLarge && body.sizeBytes === totalBytes;
  const declaredSizeMatchesHead = headers.contentLength === totalBytes;
  const etagMatchesHead = headEtag !== null && response.headers.get("etag") === headEtag;
  const ok = (
    statusPass
    && !body.tooLarge
    && digestMatches
    && sizeMatchesHead
    && declaredSizeMatchesHead
    && headers.mediaTypeMatches
    && headers.contentEncodingAbsent
    && headers.acceptRangesBytes
    && etagMatchesHead
    && headers.cachePolicyPass
    && headers.hardeningPass
  );
  return {
    requested: true,
    requestAttempted: true,
    status: ok ? "verified" : "mismatch",
    httpStatus: response.status,
    statusPass,
    requestError: false,
    failureStage: ok ? null : "response-contract",
    failureKind: ok ? null : "mismatch",
    observedSha256: body.sha256,
    sizeBytes: body.sizeBytes,
    digestMatches,
    sizeMatchesHead,
    declaredSizeMatchesHead,
    withinBoundary: !body.tooLarge,
    mediaTypeMatches: headers.mediaTypeMatches,
    contentEncodingAbsent: headers.contentEncodingAbsent,
    acceptRangesBytes: headers.acceptRangesBytes,
    etagMatchesHead,
    cachePolicyPass: headers.cachePolicyPass,
    cacheStatus: headers.cacheStatus,
    hardeningPass: headers.hardeningPass,
    ok,
  };
}

function posterMediaType(url, explicitMediaType) {
  if (explicitMediaType !== null) {
    const normalized = normalizedMediaType(explicitMediaType);
    if (!normalized?.startsWith("image/") || normalized === "unrecognized") {
      throw routeError("R2_POSTER_MEDIA_TYPE", "poster media type must be a supported image type");
    }
    return normalized;
  }
  const pathname = url.pathname.toLowerCase();
  const extension = [...POSTER_MEDIA_TYPES.keys()].find((candidate) => pathname.endsWith(candidate));
  if (extension === undefined) {
    throw routeError(
      "R2_POSTER_MEDIA_TYPE",
      "poster URL needs a supported image extension or an explicit poster media type",
    );
  }
  return POSTER_MEDIA_TYPES.get(extension);
}

function companionRetrievalObservation(overrides = {}) {
  return {
    requestAttempted: false,
    status: "not-run",
    statusPass: false,
    requestError: false,
    failureStage: "prerequisite",
    failureKind: "head-prerequisite",
    mediaTypeMatches: false,
    contentLengthMatchesHead: false,
    bodyLengthMatchesHead: false,
    sizeExpectationApplied: false,
    expectedSizeMatches: null,
    contentEncodingAbsent: false,
    etagMatchesHead: false,
    cachePolicyPass: false,
    cacheStatus: null,
    hardeningPass: false,
    observedSha256: null,
    digestExpectationApplied: false,
    digestMatches: null,
    withinBoundary: false,
    contentValidity: "not-assessed",
    ok: false,
    ...overrides,
  };
}

async function inspectCompanion({
  role,
  url,
  expectedMediaType,
  expectedSha256,
  expectedSizeBytes,
  fetchImplementation,
  timeoutMs,
}) {
  const { observation, etag: headEtag } = await inspectHead({
    url,
    expectedMediaType,
    fetchImplementation,
    timeoutMs,
    requireRanges: false,
    expectedSizeBytes,
    maximumSizeBytes: MAX_COMPANION_DOWNLOAD_BYTES,
  });
  if (!observation.ok) {
    const sizeBoundaryExceeded = (
      observation.contentLength !== null
      && observation.contentLength > MAX_COMPANION_DOWNLOAD_BYTES
    );
    return {
      role,
      ...observation,
      retrieval: companionRetrievalObservation({
        status: sizeBoundaryExceeded ? "size-boundary" : "not-run",
        failureKind: sizeBoundaryExceeded ? "size-boundary" : "head-prerequisite",
      }),
      ok: false,
    };
  }
  const { response, requestError, requestFailureKind } = await request(
    fetchImplementation,
    url,
    {
      method: "GET",
      headers: {
        "accept-encoding": "identity",
        "user-agent": "human-ai-systems-exemplars-r2-video-verifier/1",
      },
    },
    timeoutMs,
  );
  if (requestError) {
    return {
      role,
      ...observation,
      retrieval: companionRetrievalObservation({
        requestAttempted: true,
        status: "request-failed",
        requestError: true,
        failureStage: "request",
        failureKind: requestFailureKind,
      }),
      ok: false,
    };
  }
  const headers = commonHeaderObservation(response.headers, expectedMediaType);
  let body;
  try {
    body = await digestBody(response, MAX_COMPANION_DOWNLOAD_BYTES);
  } catch {
    await cancelBody(response);
    return {
      role,
      ...observation,
      retrieval: companionRetrievalObservation({
        requestAttempted: true,
        status: "body-read-failed",
        requestError: true,
        failureStage: "body-read",
        failureKind: "body-read-failed",
      }),
      ok: false,
    };
  }
  const digestExpectationApplied = expectedSha256 !== null;
  const sizeExpectationApplied = expectedSizeBytes !== null;
  const digestMatches = digestExpectationApplied ? body.sha256 === expectedSha256 : null;
  const expectedSizeMatches = sizeExpectationApplied ? body.sizeBytes === expectedSizeBytes : null;
  const retrieval = {
    requestAttempted: true,
    status: response.status,
    statusPass: response.status === 200,
    requestError: false,
    failureStage: null,
    failureKind: null,
    mediaTypeMatches: headers.mediaTypeMatches,
    contentLengthMatchesHead: headers.contentLength === observation.contentLength,
    bodyLengthMatchesHead: !body.tooLarge && body.sizeBytes === observation.contentLength,
    sizeExpectationApplied,
    expectedSizeMatches,
    contentEncodingAbsent: headers.contentEncodingAbsent,
    etagMatchesHead: headEtag !== null && response.headers.get("etag") === headEtag,
    cachePolicyPass: headers.cachePolicyPass,
    cacheStatus: headers.cacheStatus,
    hardeningPass: headers.hardeningPass,
    observedSha256: body.sha256,
    digestExpectationApplied,
    digestMatches,
    withinBoundary: !body.tooLarge,
    contentValidity: "not-assessed",
  };
  retrieval.ok = (
    retrieval.statusPass
    && retrieval.mediaTypeMatches
    && retrieval.contentLengthMatchesHead
    && retrieval.bodyLengthMatchesHead
    && retrieval.contentEncodingAbsent
    && retrieval.etagMatchesHead
    && retrieval.cachePolicyPass
    && retrieval.hardeningPass
    && retrieval.withinBoundary
    && retrieval.digestMatches !== false
    && retrieval.expectedSizeMatches !== false
  );
  return {
    role,
    ...observation,
    retrieval,
    ok: observation.ok && retrieval.ok,
  };
}

function failureCodes(video, companions) {
  const failures = [];
  if (!video.head.ok && video.head.requestAttempted) {
    failures.push({ resource: "video", check: "head-contract" });
  }
  if (
    !video.range.ok
    && video.range.requestAttempted
    && (video.head.ok || !video.head.requestAttempted)
  ) {
    failures.push({ resource: "video", check: "range-contract" });
  }
  if (!video.unsatisfiableRange.ok && video.unsatisfiableRange.requestAttempted) {
    failures.push({ resource: "video", check: "unsatisfiable-range-contract" });
  }
  if (!video.notModified.ok && video.notModified.requestAttempted) {
    failures.push({ resource: "video", check: "not-modified-contract" });
  }
  if (
    !video.digest.ok
    && video.digest.requested
    && video.digest.failureStage !== "prerequisite"
  ) {
    failures.push({ resource: "video", check: "download-digest" });
  }
  for (const [role, result] of Object.entries(companions)) {
    if (!result || result.ok) continue;
    failures.push({
      resource: role,
      check: result.retrieval.requestAttempted
        ? "companion-retrieval-contract"
        : "companion-head-contract",
    });
  }
  return failures;
}

function normalizedExpectedDigest(value, role) {
  if (value === null) return null;
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/iu.test(value)) {
    throw routeError(
      "R2_EXPECTED_DIGEST",
      `${role} SHA-256 must contain exactly 64 hexadecimal characters`,
    );
  }
  return value.toLowerCase();
}

function normalizedExpectedSize(value, role, maximumBytes) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 1 || value > maximumBytes) {
    throw routeError(
      "R2_EXPECTED_SIZE",
      `${role} size must be a positive integer within the ${maximumBytes}-byte route boundary`,
    );
  }
  return value;
}

export async function verifyR2VideoRoute({
  videoUrl,
  expectedSha256 = null,
  expectedSizeBytes = null,
  downloadDigest = expectedSha256 !== null,
  maxDownloadBytes = DEFAULT_MAX_DOWNLOAD_BYTES,
  observationOrder = "head-first",
  captionsUrl = null,
  captionsExpectedSha256 = null,
  captionsExpectedSizeBytes = null,
  descriptionsUrl = null,
  descriptionsExpectedSha256 = null,
  descriptionsExpectedSizeBytes = null,
  posterUrl = null,
  posterExpectedMediaType = null,
  posterExpectedSha256 = null,
  posterExpectedSizeBytes = null,
  fetchImplementation = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (typeof fetchImplementation !== "function") {
    throw routeError("R2_FETCH", "route verification requires a fetch implementation");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    throw routeError("R2_TIMEOUT", "timeout must be an integer from 1 through 120000 milliseconds");
  }
  if (
    !Number.isSafeInteger(maxDownloadBytes)
    || maxDownloadBytes < 2
    || maxDownloadBytes > MAX_CACHEABLE_OBJECT_BYTES
  ) {
    throw routeError(
      "R2_DOWNLOAD_BOUNDARY",
      `maximum download bytes must be an integer from 2 through ${MAX_CACHEABLE_OBJECT_BYTES}`,
    );
  }
  if (!new Set(["head-first", "cold-range-first"]).has(observationOrder)) {
    throw routeError(
      "R2_OBSERVATION_ORDER",
      "observation order must be head-first or cold-range-first",
    );
  }
  expectedSizeBytes = normalizedExpectedSize(
    expectedSizeBytes,
    "video",
    MAX_CACHEABLE_OBJECT_BYTES,
  );
  expectedSha256 = normalizedExpectedDigest(expectedSha256, "video");
  captionsExpectedSizeBytes = normalizedExpectedSize(
    captionsExpectedSizeBytes,
    "captions",
    MAX_COMPANION_DOWNLOAD_BYTES,
  );
  captionsExpectedSha256 = normalizedExpectedDigest(captionsExpectedSha256, "captions");
  descriptionsExpectedSizeBytes = normalizedExpectedSize(
    descriptionsExpectedSizeBytes,
    "descriptions",
    MAX_COMPANION_DOWNLOAD_BYTES,
  );
  descriptionsExpectedSha256 = normalizedExpectedDigest(
    descriptionsExpectedSha256,
    "descriptions",
  );
  posterExpectedSizeBytes = normalizedExpectedSize(
    posterExpectedSizeBytes,
    "poster",
    MAX_COMPANION_DOWNLOAD_BYTES,
  );
  posterExpectedSha256 = normalizedExpectedDigest(posterExpectedSha256, "poster");
  for (const [role, url, digestValue, sizeValue] of [
    ["captions", captionsUrl, captionsExpectedSha256, captionsExpectedSizeBytes],
    ["descriptions", descriptionsUrl, descriptionsExpectedSha256, descriptionsExpectedSizeBytes],
    ["poster", posterUrl, posterExpectedSha256, posterExpectedSizeBytes],
  ]) {
    if (url === null && (digestValue !== null || sizeValue !== null)) {
      throw routeError(
        "R2_COMPANION_IDENTITY",
        `${role} byte expectations require the matching URL`,
      );
    }
  }
  if (posterUrl === null && posterExpectedMediaType !== null) {
    throw routeError("R2_POSTER_MEDIA_TYPE", "poster media type requires a poster URL");
  }

  const video = parsedHttpsUrl(videoUrl, "video URL");
  const captions = captionsUrl === null ? null : parsedHttpsUrl(captionsUrl, "captions URL");
  const descriptions = descriptionsUrl === null
    ? null
    : parsedHttpsUrl(descriptionsUrl, "descriptions URL");
  const poster = posterUrl === null ? null : parsedHttpsUrl(posterUrl, "poster URL");
  const expectedPosterType = poster === null
    ? null
    : posterMediaType(poster, posterExpectedMediaType);

  const digestRequested = Boolean(downloadDigest || expectedSha256 !== null);
  let headResult;
  let range;
  let unsatisfiableRange;
  let notModified;
  let digest;

  if (observationOrder === "cold-range-first") {
    const coldRange = await inspectRange({
      url: video,
      totalBytes: expectedSizeBytes,
      headEtag: null,
      fetchImplementation,
      timeoutMs,
      permitIndependentAnchor: true,
      expectedCacheStatus: "MISS",
    });
    range = coldRange.observation;
    if (range.ok) {
      headResult = await inspectHead({
        url: video,
        expectedMediaType: "video/mp4",
        fetchImplementation,
        timeoutMs,
        requireRanges: true,
        expectedSizeBytes: coldRange.totalBytes,
      });
      if (headResult.observation.ok) {
        range.etagMatchesHead = (
          coldRange.etag !== null
          && headResult.etag !== null
          && coldRange.etag === headResult.etag
        );
        range.etagAnchorPass = range.etagMatchesHead;
        range.ok = rangeObservationPass(range);
      }
    } else {
      headResult = {
        observation: skippedHeadObservation("video/mp4"),
        etag: null,
      };
    }
  } else {
    headResult = await inspectHead({
      url: video,
      expectedMediaType: "video/mp4",
      fetchImplementation,
      timeoutMs,
      requireRanges: true,
      expectedSizeBytes,
    });
    if (headResult.observation.ok) {
      const rangeResult = await inspectRange({
        url: video,
        totalBytes: headResult.observation.contentLength,
        headEtag: headResult.etag,
        fetchImplementation,
        timeoutMs,
      });
      range = rangeResult.observation;
    } else {
      range = skippedRangeObservation();
    }
  }

  const canInspectRemainingVideo = headResult.observation.ok && range.ok;
  if (canInspectRemainingVideo) {
    [unsatisfiableRange, notModified, digest] = await Promise.all([
      inspectUnsatisfiableRange({
        url: video,
        totalBytes: headResult.observation.contentLength,
        fetchImplementation,
        timeoutMs,
      }),
      inspectNotModified({
        url: video,
        headEtag: headResult.etag,
        headContentLength: headResult.observation.contentLength,
        headContentType: headResult.observation.contentType,
        fetchImplementation,
        timeoutMs,
      }),
      inspectDigest({
        url: video,
        requested: digestRequested,
        expectedSha256,
        totalBytes: headResult.observation.contentLength,
        headEtag: headResult.etag,
        maximumBytes: maxDownloadBytes,
        fetchImplementation,
        timeoutMs,
      }),
    ]);
  } else {
    unsatisfiableRange = skippedUnsatisfiableRangeObservation();
    notModified = skippedNotModifiedObservation();
    digest = skippedDigestObservation(digestRequested, "head-or-range-prerequisite");
  }

  const companionDescriptors = [
    {
      role: "captions",
      url: captions,
      expectedMediaType: "text/vtt; charset=utf-8",
      expectedSha256: captionsExpectedSha256,
      expectedSizeBytes: captionsExpectedSizeBytes,
    },
    {
      role: "descriptions",
      url: descriptions,
      expectedMediaType: "text/vtt; charset=utf-8",
      expectedSha256: descriptionsExpectedSha256,
      expectedSizeBytes: descriptionsExpectedSizeBytes,
    },
    {
      role: "poster",
      url: poster,
      expectedMediaType: expectedPosterType,
      expectedSha256: posterExpectedSha256,
      expectedSizeBytes: posterExpectedSizeBytes,
    },
  ];
  const companionResults = await Promise.all(companionDescriptors.map(async (descriptor) => (
    descriptor.url === null ? null : inspectCompanion({
      ...descriptor,
      fetchImplementation,
      timeoutMs,
    })
  )));
  const companions = Object.fromEntries(
    companionDescriptors.map(({ role }, index) => [role, companionResults[index]]),
  );
  const videoResult = {
    head: headResult.observation,
    range,
    unsatisfiableRange,
    notModified,
    digest,
  };
  const videoPass = Object.values(videoResult).every(({ ok }) => ok);
  const providedCompanions = Object.values(companions).filter(Boolean);
  const companionsPass = providedCompanions.every(({ ok }) => ok);
  const failures = failureCodes(videoResult, companions);
  const ok = videoPass && companionsPass;
  const fullVideoObjectAcceptance = (
    ok
    && expectedSha256 !== null
    && digest.digestMatches === true
  );
  return {
    schema: "r2-video-route-verification/v1",
    observationOrder,
    ok,
    disposition: !ok
      ? "blocker"
      : fullVideoObjectAcceptance
        ? "full-video-object-acceptance"
        : "partial-observation",
    fullVideoObjectAcceptance,
    videoPass,
    companionsPass,
    video: videoResult,
    companions,
    failures,
  };
}

function integerOption(value, label) {
  if (!/^(?:0|[1-9]\d*)$/u.test(value ?? "")) {
    throw routeError("R2_ARGUMENTS", `${label} must be an integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw routeError("R2_ARGUMENTS", `${label} exceeds the safe integer boundary`);
  }
  return parsed;
}

export function parseR2RouteCliArguments(argumentsList) {
  if (argumentsList.length === 1 && ["--help", "-h"].includes(argumentsList[0])) {
    return { help: true };
  }
  const parsed = {
    videoUrl: null,
    expectedSha256: null,
    expectedSizeBytes: null,
    downloadDigest: false,
    maxDownloadBytes: DEFAULT_MAX_DOWNLOAD_BYTES,
    observationOrder: "head-first",
    captionsUrl: null,
    captionsExpectedSha256: null,
    captionsExpectedSizeBytes: null,
    descriptionsUrl: null,
    descriptionsExpectedSha256: null,
    descriptionsExpectedSizeBytes: null,
    posterUrl: null,
    posterExpectedMediaType: null,
    posterExpectedSha256: null,
    posterExpectedSizeBytes: null,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
  const valuedOptions = new Map([
    ["--video", "videoUrl"],
    ["--sha256", "expectedSha256"],
    ["--size", "expectedSizeBytes"],
    ["--max-download-bytes", "maxDownloadBytes"],
    ["--captions", "captionsUrl"],
    ["--vtt", "captionsUrl"],
    ["--captions-sha256", "captionsExpectedSha256"],
    ["--captions-size", "captionsExpectedSizeBytes"],
    ["--descriptions", "descriptionsUrl"],
    ["--descriptions-sha256", "descriptionsExpectedSha256"],
    ["--descriptions-size", "descriptionsExpectedSizeBytes"],
    ["--poster", "posterUrl"],
    ["--poster-type", "posterExpectedMediaType"],
    ["--poster-sha256", "posterExpectedSha256"],
    ["--poster-size", "posterExpectedSizeBytes"],
    ["--timeout-ms", "timeoutMs"],
  ]);
  const seenFields = new Set();
  let sawDownloadDigest = false;
  let sawColdRangeFirst = false;
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--download-digest") {
      if (sawDownloadDigest) {
        throw routeError("R2_ARGUMENTS", "route verifier received a duplicate option");
      }
      sawDownloadDigest = true;
      parsed.downloadDigest = true;
      continue;
    }
    if (argument === "--cold-range-first") {
      if (sawColdRangeFirst) {
        throw routeError("R2_ARGUMENTS", "route verifier received a duplicate option");
      }
      sawColdRangeFirst = true;
      parsed.observationOrder = "cold-range-first";
      continue;
    }
    if (
      !valuedOptions.has(argument)
      || index + 1 >= argumentsList.length
      || argumentsList[index + 1].startsWith("--")
    ) {
      throw routeError("R2_ARGUMENTS", "route verifier received an unknown or incomplete option");
    }
    const field = valuedOptions.get(argument);
    if (seenFields.has(field)) {
      throw routeError("R2_ARGUMENTS", "route verifier received a duplicate option");
    }
    seenFields.add(field);
    const value = argumentsList[index + 1];
    index += 1;
    parsed[field] = [
      "expectedSizeBytes",
      "maxDownloadBytes",
      "timeoutMs",
      "captionsExpectedSizeBytes",
      "descriptionsExpectedSizeBytes",
      "posterExpectedSizeBytes",
    ].includes(field)
      ? integerOption(value, argument)
      : value;
  }
  if (parsed.videoUrl === null) {
    throw routeError("R2_ARGUMENTS", "route verifier requires --video <HTTPS URL>");
  }
  if (parsed.posterExpectedMediaType !== null && parsed.posterUrl === null) {
    throw routeError("R2_ARGUMENTS", "--poster-type requires --poster");
  }
  for (const [role, url, digest, size] of [
    ["captions", parsed.captionsUrl, parsed.captionsExpectedSha256, parsed.captionsExpectedSizeBytes],
    ["descriptions", parsed.descriptionsUrl, parsed.descriptionsExpectedSha256, parsed.descriptionsExpectedSizeBytes],
    ["poster", parsed.posterUrl, parsed.posterExpectedSha256, parsed.posterExpectedSizeBytes],
  ]) {
    if (url === null && (digest !== null || size !== null)) {
      throw routeError("R2_ARGUMENTS", `${role} byte expectations require the matching URL option`);
    }
  }
  if (parsed.expectedSha256 !== null) parsed.downloadDigest = true;
  return parsed;
}

function usage() {
  return [
    "Usage:",
    "  node tools/verify-r2-video-route.mjs --video <https-url> [options]",
    "",
    "Options:",
    "  --sha256 <digest>            Download within the byte bound and verify SHA-256.",
    "  --download-digest            Download within the byte bound and report SHA-256.",
    "  --size <bytes>                Require an exact HEAD Content-Length.",
    "  --max-download-bytes <bytes> Bound an optional full download.",
    "  --cold-range-first           Make the first video request the cold bytes=0-1 canary.",
    "  --captions <https-url>        Verify a WebVTT companion route.",
    "  --captions-sha256 <digest>    Bind captions to accepted bytes.",
    "  --captions-size <bytes>       Bind captions to an accepted byte count.",
    "  --descriptions <https-url>    Verify a timed-description WebVTT route.",
    "  --descriptions-sha256 <digest> Bind descriptions to accepted bytes.",
    "  --descriptions-size <bytes>   Bind descriptions to an accepted byte count.",
    "  --poster <https-url>          Verify a poster companion route.",
    "  --poster-type <image/type>    Supply poster MIME when the URL lacks an extension.",
    "  --poster-sha256 <digest>      Bind the poster to accepted bytes.",
    "  --poster-size <bytes>         Bind the poster to an accepted byte count.",
    "  --timeout-ms <milliseconds>   Bound each request (maximum 120000).",
    "",
    "The JSON receipt omits URLs, raw headers, response bodies, and request diagnostics.",
    "",
  ].join("\n");
}

async function main() {
  const options = parseR2RouteCliArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const result = await verifyR2VideoRoute(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (isDirectExecution(import.meta.url)) {
  main().catch((error) => {
    if (error instanceof R2RouteVerificationError) {
      process.stderr.write(`${error.message}\n`);
    } else {
      process.stderr.write("R2_ROUTE_UNEXPECTED: live route verification did not complete\n");
    }
    process.exitCode = 1;
  });
}

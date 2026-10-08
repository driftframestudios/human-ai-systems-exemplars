#!/usr/bin/env node

import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_DOWNLOAD_BYTES = 512 * 1024 * 1024;
const MAX_COMPANION_DOWNLOAD_BYTES = 32 * 1024 * 1024;
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
    if (!name) continue;
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

function commonHeaderObservation(headers, expectedMediaType) {
  const mediaType = normalizedMediaType(headers.get("content-type"));
  const cache = observeCachePolicy(headers.get("cache-control"));
  const hardening = {
    nosniff: headers.get("x-content-type-options")?.trim().toLowerCase() === "nosniff",
    noReferrer: headers.get("referrer-policy")?.trim().toLowerCase() === "no-referrer",
    sameOriginResourcePolicy:
      headers.get("cross-origin-resource-policy")?.trim().toLowerCase() === "same-origin",
  };
  return {
    mediaType,
    mediaTypeMatches: mediaType === expectedMediaType,
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
    };
  } catch {
    return { response: null, requestError: true };
  }
}

function safeStatus(response) {
  return Number.isSafeInteger(response?.status) ? response.status : null;
}

function failedHeadObservation(expectedMediaType) {
  return {
    status: null,
    statusPass: false,
    requestError: true,
    expectedMediaType,
    mediaType: null,
    mediaTypeMatches: false,
    contentLength: null,
    positiveContentLength: false,
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
  };
}

async function inspectHead({
  url,
  expectedMediaType,
  fetchImplementation,
  timeoutMs,
  requireRanges,
  expectedSizeBytes,
}) {
  const { response, requestError } = await request(
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
  if (requestError) return { observation: failedHeadObservation(expectedMediaType), etag: null };

  const headers = commonHeaderObservation(response.headers, expectedMediaType);
  const status = safeStatus(response);
  const positiveContentLength = headers.contentLength !== null && headers.contentLength > 0;
  const sizeMatches = expectedSizeBytes === null || headers.contentLength === expectedSizeBytes;
  const observation = {
    status,
    statusPass: status === 200,
    requestError: false,
    expectedMediaType,
    ...headers,
    positiveContentLength,
    sizeMatches,
  };
  observation.ok = (
    observation.statusPass
    && observation.mediaTypeMatches
    && observation.positiveContentLength
    && observation.sizeMatches
    && observation.contentEncodingAbsent
    && observation.etag.strongQuoted
    && observation.cachePolicyPass
    && observation.hardeningPass
    && (!requireRanges || observation.acceptRangesBytes)
  );
  await cancelBody(response);
  return { observation, etag: response.headers.get("etag") };
}

async function readExactBoundedBody(response, maximumBytes) {
  if (!response.body) return { bytes: Buffer.alloc(0), tooLarge: false };
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      length += chunk.byteLength;
      if (length > maximumBytes) {
        await reader.cancel();
        return { bytes: null, tooLarge: true };
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  return { bytes: Buffer.concat(chunks, length), tooLarge: false };
}

function failedRangeObservation() {
  return {
    status: null,
    statusPass: false,
    requestError: true,
    contentRangeExact: false,
    contentLengthExact: false,
    bodyLengthExact: false,
    contentEncodingAbsent: false,
    mediaTypeMatches: false,
    etagMatchesHead: false,
    cachePolicyPass: false,
    cacheStatus: null,
    hardeningPass: false,
    ok: false,
  };
}

function failedUnsatisfiableRangeObservation() {
  return {
    status: null,
    statusPass: false,
    requestError: true,
    contentRangeExact: false,
    contentEncodingAbsent: false,
    ok: false,
  };
}

async function inspectRange({
  url,
  totalBytes,
  headEtag,
  fetchImplementation,
  timeoutMs,
}) {
  const { response, requestError } = await request(
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
  if (requestError) return failedRangeObservation();
  const status = safeStatus(response);
  const headers = commonHeaderObservation(response.headers, "video/mp4");
  let body;
  try {
    body = await readExactBoundedBody(response, 2);
  } catch {
    return {
      ...failedRangeObservation(),
      status,
      statusPass: status === 206,
    };
  }
  const observation = {
    status,
    statusPass: status === 206,
    requestError: false,
    contentRangeExact: (
      totalBytes !== null
      && response.headers.get("content-range") === `bytes 0-1/${totalBytes}`
    ),
    contentLengthExact: response.headers.get("content-length") === "2",
    bodyLengthExact: !body.tooLarge && body.bytes?.byteLength === 2,
    bodyTooLarge: body.tooLarge,
    contentEncodingAbsent: headers.contentEncodingAbsent,
    mediaTypeMatches: headers.mediaTypeMatches,
    acceptRangesBytes: headers.acceptRangesBytes,
    etagMatchesHead: headEtag !== null && response.headers.get("etag") === headEtag,
    cachePolicyPass: headers.cachePolicyPass,
    cacheStatus: headers.cacheStatus,
    hardeningPass: headers.hardeningPass,
  };
  observation.ok = (
    observation.statusPass
    && observation.contentRangeExact
    && observation.contentLengthExact
    && observation.bodyLengthExact
    && observation.contentEncodingAbsent
    && observation.mediaTypeMatches
    && observation.etagMatchesHead
    && observation.cachePolicyPass
    && observation.hardeningPass
  );
  return observation;
}

async function inspectUnsatisfiableRange({
  url,
  totalBytes,
  fetchImplementation,
  timeoutMs,
}) {
  if (totalBytes === null) return failedUnsatisfiableRangeObservation();
  const { response, requestError } = await request(
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
  if (requestError) return failedUnsatisfiableRangeObservation();
  const status = safeStatus(response);
  const observation = {
    status,
    statusPass: status === 416,
    requestError: false,
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

async function digestBody(response, maximumBytes) {
  if (!response.body) {
    return { sha256: createHash("sha256").digest("hex"), sizeBytes: 0, tooLarge: false };
  }
  const reader = response.body.getReader();
  const hash = createHash("sha256");
  let sizeBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      sizeBytes += chunk.byteLength;
      if (sizeBytes > maximumBytes) {
        await reader.cancel();
        return { sha256: null, sizeBytes, tooLarge: true };
      }
      hash.update(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  return { sha256: hash.digest("hex"), sizeBytes, tooLarge: false };
}

function skippedDigestObservation(requested) {
  return {
    requested,
    status: requested ? "not-run" : "not-requested",
    observedSha256: null,
    sizeBytes: null,
    digestMatches: requested ? false : null,
    sizeMatchesHead: requested ? false : null,
    withinBoundary: requested ? false : null,
    ok: !requested,
  };
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
  if (!requested) return skippedDigestObservation(false);
  if (totalBytes === null || totalBytes > maximumBytes) {
    return {
      ...skippedDigestObservation(true),
      status: "size-boundary",
      withinBoundary: false,
    };
  }
  const { response, requestError } = await request(
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
      ...skippedDigestObservation(true),
      status: "request-failed",
      requestError: true,
    };
  }
  const headers = commonHeaderObservation(response.headers, "video/mp4");
  let body;
  try {
    body = await digestBody(response, maximumBytes);
  } catch {
    return {
      ...skippedDigestObservation(true),
      status: "body-read-failed",
      httpStatus: safeStatus(response),
      requestError: true,
    };
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
    status: ok ? "verified" : "mismatch",
    httpStatus: response.status,
    statusPass,
    requestError: false,
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
  if (!extension) {
    throw routeError(
      "R2_POSTER_MEDIA_TYPE",
      "poster URL needs a supported image extension or an explicit poster media type",
    );
  }
  return POSTER_MEDIA_TYPES.get(extension);
}

async function inspectCompanion({
  role,
  url,
  expectedMediaType,
  fetchImplementation,
  timeoutMs,
}) {
  const { observation, etag: headEtag } = await inspectHead({
    url,
    expectedMediaType,
    fetchImplementation,
    timeoutMs,
    requireRanges: false,
    expectedSizeBytes: null,
  });
  if (!observation.ok || observation.contentLength > MAX_COMPANION_DOWNLOAD_BYTES) {
    return {
      role,
      ...observation,
      retrieval: {
        status: observation.contentLength > MAX_COMPANION_DOWNLOAD_BYTES
          ? "size-boundary"
          : "not-run",
        ok: false,
      },
      ok: false,
    };
  }
  const { response, requestError } = await request(
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
      retrieval: { status: "request-failed", requestError: true, ok: false },
      ok: false,
    };
  }
  const headers = commonHeaderObservation(response.headers, expectedMediaType);
  let body;
  try {
    body = await digestBody(response, MAX_COMPANION_DOWNLOAD_BYTES);
  } catch {
    return {
      role,
      ...observation,
      retrieval: { status: "body-read-failed", requestError: true, ok: false },
      ok: false,
    };
  }
  const retrieval = {
    status: response.status,
    statusPass: response.status === 200,
    requestError: false,
    mediaTypeMatches: headers.mediaTypeMatches,
    contentLengthMatchesHead: headers.contentLength === observation.contentLength,
    bodyLengthMatchesHead: !body.tooLarge && body.sizeBytes === observation.contentLength,
    contentEncodingAbsent: headers.contentEncodingAbsent,
    etagMatchesHead: headEtag !== null && response.headers.get("etag") === headEtag,
    cachePolicyPass: headers.cachePolicyPass,
    cacheStatus: headers.cacheStatus,
    hardeningPass: headers.hardeningPass,
    observedSha256: body.sha256,
    withinBoundary: !body.tooLarge,
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
  if (!video.head.ok) failures.push({ resource: "video", check: "head-contract" });
  if (!video.range.ok) failures.push({ resource: "video", check: "range-contract" });
  if (!video.unsatisfiableRange.ok) {
    failures.push({ resource: "video", check: "unsatisfiable-range-contract" });
  }
  if (!video.digest.ok) failures.push({ resource: "video", check: "download-digest" });
  for (const [role, result] of Object.entries(companions)) {
    if (result && !result.ok) failures.push({ resource: role, check: "companion-head-contract" });
  }
  return failures;
}

export async function verifyR2VideoRoute({
  videoUrl,
  expectedSha256 = null,
  expectedSizeBytes = null,
  downloadDigest = expectedSha256 !== null,
  maxDownloadBytes = DEFAULT_MAX_DOWNLOAD_BYTES,
  captionsUrl = null,
  posterUrl = null,
  posterExpectedMediaType = null,
  fetchImplementation = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (typeof fetchImplementation !== "function") {
    throw routeError("R2_FETCH", "route verification requires a fetch implementation");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    throw routeError("R2_TIMEOUT", "timeout must be an integer from 1 through 120000 milliseconds");
  }
  if (!Number.isSafeInteger(maxDownloadBytes) || maxDownloadBytes < 2) {
    throw routeError("R2_DOWNLOAD_BOUNDARY", "maximum download bytes must be an integer of at least 2");
  }
  if (expectedSizeBytes !== null && (!Number.isSafeInteger(expectedSizeBytes) || expectedSizeBytes < 1)) {
    throw routeError("R2_EXPECTED_SIZE", "expected size must be a positive integer");
  }
  if (expectedSha256 !== null) {
    if (typeof expectedSha256 !== "string" || !/^[a-f0-9]{64}$/iu.test(expectedSha256)) {
      throw routeError("R2_EXPECTED_DIGEST", "expected SHA-256 must contain exactly 64 hexadecimal characters");
    }
    expectedSha256 = expectedSha256.toLowerCase();
  }

  const video = parsedHttpsUrl(videoUrl, "video URL");
  const captions = captionsUrl === null ? null : parsedHttpsUrl(captionsUrl, "captions URL");
  const poster = posterUrl === null ? null : parsedHttpsUrl(posterUrl, "poster URL");
  const expectedPosterType = poster === null
    ? null
    : posterMediaType(poster, posterExpectedMediaType);

  const headResult = await inspectHead({
    url: video,
    expectedMediaType: "video/mp4",
    fetchImplementation,
    timeoutMs,
    requireRanges: true,
    expectedSizeBytes,
  });
  const totalBytes = headResult.observation.contentLength;
  const [range, unsatisfiableRange, digest, captionsResult, posterResult] = await Promise.all([
    inspectRange({
      url: video,
      totalBytes,
      headEtag: headResult.etag,
      fetchImplementation,
      timeoutMs,
    }),
    inspectUnsatisfiableRange({
      url: video,
      totalBytes,
      fetchImplementation,
      timeoutMs,
    }),
    inspectDigest({
      url: video,
      requested: Boolean(downloadDigest || expectedSha256 !== null),
      expectedSha256,
      totalBytes,
      headEtag: headResult.etag,
      maximumBytes: maxDownloadBytes,
      fetchImplementation,
      timeoutMs,
    }),
    captions === null ? null : inspectCompanion({
      role: "captions",
      url: captions,
      expectedMediaType: "text/vtt",
      fetchImplementation,
      timeoutMs,
    }),
    poster === null ? null : inspectCompanion({
      role: "poster",
      url: poster,
      expectedMediaType: expectedPosterType,
      fetchImplementation,
      timeoutMs,
    }),
  ]);
  const companions = { captions: captionsResult, poster: posterResult };
  const videoResult = {
    head: headResult.observation,
    range,
    unsatisfiableRange,
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
    captionsUrl: null,
    posterUrl: null,
    posterExpectedMediaType: null,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
  const valuedOptions = new Map([
    ["--video", "videoUrl"],
    ["--sha256", "expectedSha256"],
    ["--size", "expectedSizeBytes"],
    ["--max-download-bytes", "maxDownloadBytes"],
    ["--captions", "captionsUrl"],
    ["--vtt", "captionsUrl"],
    ["--poster", "posterUrl"],
    ["--poster-type", "posterExpectedMediaType"],
    ["--timeout-ms", "timeoutMs"],
  ]);
  const seenFields = new Set();
  let sawDownloadDigest = false;
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
    parsed[field] = ["expectedSizeBytes", "maxDownloadBytes", "timeoutMs"].includes(field)
      ? integerOption(value, argument)
      : value;
  }
  if (parsed.videoUrl === null) {
    throw routeError("R2_ARGUMENTS", "route verifier requires --video <HTTPS URL>");
  }
  if (parsed.posterExpectedMediaType !== null && parsed.posterUrl === null) {
    throw routeError("R2_ARGUMENTS", "--poster-type requires --poster");
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
    "  --captions <https-url>        Verify a WebVTT companion route.",
    "  --poster <https-url>          Verify a poster companion route.",
    "  --poster-type <image/type>    Supply poster MIME when the URL lacks an extension.",
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

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    if (error instanceof R2RouteVerificationError) {
      process.stderr.write(`${error.message}\n`);
    } else {
      process.stderr.write("R2_ROUTE_UNEXPECTED: live route verification did not complete\n");
    }
    process.exitCode = 1;
  });
}

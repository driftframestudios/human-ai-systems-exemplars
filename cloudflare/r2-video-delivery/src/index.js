const CACHE_CONTROL = "public, max-age=31536000, immutable";
const MAX_CACHEABLE_OBJECT_BYTES = 512_000_000;
const MAX_COMPANION_OBJECT_BYTES = 32 * 1024 * 1024;
const MAX_PUBLIC_PATH_LENGTH = 512;
const PUBLIC_PREFIX = "/v1-cdn/video/";
const PUBLIC_HOSTNAME = "vik.guru";
const STORAGE_PREFIX = "v1/video/";

const SEMANTIC_ID = "[a-z0-9]+(?:-[a-z0-9]+)*";
const VERSION = "v(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)";
const LANGUAGE = "[a-z]{2,8}(?:-[a-z0-9]{1,8})*";
const CARRIER = `(?:movie\\.mp4|poster\\.(?:webp|avif|jpg|png)|(?:captions|descriptions)\\.${LANGUAGE}\\.vtt)`;
const PUBLIC_PATH = new RegExp(`^${PUBLIC_PREFIX}(${SEMANTIC_ID})/(${VERSION})/(${CARRIER})$`, "u");
const STRONG_ETAG = /^"[!#-~\x80-\xff]*"$/u;

const CONTENT_TYPES = new Map([
  ["movie.mp4", "video/mp4"],
  ["poster.webp", "image/webp"],
  ["poster.avif", "image/avif"],
  ["poster.jpg", "image/jpeg"],
  ["poster.png", "image/png"],
]);

const FAILURE_RESPONSES = Object.freeze({
  invalidRequest: { status: 400, body: "Invalid request\n" },
  notFound: { status: 404, body: "Media not found\n" },
  methodNotAllowed: { status: 405, body: "Method not allowed\n", allow: "GET, HEAD" },
  routeConfiguration: { status: 500, body: "Media route configuration invalid\n" },
  responseConstruction: { status: 500, body: "Media response unavailable\n" },
  metadataInvalid: { status: 502, body: "Media metadata invalid\n" },
  dependencyUnavailable: {
    status: 503,
    body: "Media storage temporarily unavailable\n",
    retryAfter: "5",
  },
});
const FORWARDED_READ_HEADERS = Object.freeze([
  "If-None-Match",
  "If-Range",
  "Range",
]);
const UNSUPPORTED_READ_PRECONDITIONS = Object.freeze([
  "If-Match",
  "If-Unmodified-Since",
]);
const RETRYABLE_R2_CODES = new Set([10001, 10043, 10054, 10058]);

function hardenedHeaders(initial) {
  const headers = new Headers(initial);
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}

function errorResponse(method, kind) {
  const failure = FAILURE_RESPONSES[kind];
  if (failure === undefined) throw new TypeError("unknown media failure response kind");
  const { status, body } = failure;
  const headers = hardenedHeaders({
    "Cache-Control": "no-store",
    "Content-Length": String(body.length),
    "Content-Type": "text/plain; charset=utf-8",
  });
  if (failure.allow) headers.set("Allow", failure.allow);
  if (failure.retryAfter) headers.set("Retry-After", failure.retryAfter);
  return new Response(method === "HEAD" ? null : body, { status, headers });
}

function redirectResponse(url) {
  url.protocol = "https:";
  return new Response(null, {
    status: 308,
    headers: hardenedHeaders({
      "Cache-Control": "no-store",
      "Content-Length": "0",
      Location: url.href,
    }),
  });
}

function canonicalCachedRequest(request, url) {
  const headers = new Headers();
  for (const name of FORWARDED_READ_HEADERS) {
    const value = request.headers?.get?.(name);
    if (value !== null && value !== undefined) headers.set(name, value);
  }
  return new Request(url.href, { method: request.method, headers });
}

function acceptedReadConditions(request) {
  const supportedPreconditions = UNSUPPORTED_READ_PRECONDITIONS.every((name) => (
    request.headers?.has?.(name) !== true
  ));
  const ifNoneMatch = request.headers?.get?.("If-None-Match") ?? null;
  const validValidator = ifNoneMatch === null
    || parseEntityTagCondition(ifNoneMatch) !== null;
  return supportedPreconditions && validValidator;
}

function rawRequestTarget(urlText) {
  const scheme = urlText.indexOf("://");
  if (scheme < 0) return null;

  const authorityStart = scheme + 3;
  const slash = urlText.indexOf("/", authorityStart);
  const query = urlText.indexOf("?", authorityStart);
  const fragment = urlText.indexOf("#", authorityStart);
  const delimiters = [query, fragment].filter((index) => index >= 0);
  const targetEnd = delimiters.length > 0 ? Math.min(...delimiters) : urlText.length;
  const path = slash < 0 || slash > targetEnd ? "/" : urlText.slice(slash, targetEnd);

  return {
    hasFragment: fragment >= 0,
    hasQuery: query >= 0,
    path,
  };
}

function hasAmbiguousPath(rawPath, normalizedPath) {
  if (rawPath.length > MAX_PUBLIC_PATH_LENGTH) return true;
  if (rawPath !== normalizedPath) return true;
  if (rawPath.includes("%") || rawPath.includes("\\") || rawPath.includes("//")) return true;
  return rawPath.split("/").some((segment) => segment === "." || segment === "..");
}

function mediaRoute(pathname) {
  const match = PUBLIC_PATH.exec(pathname);
  if (match === null) return null;

  const [, semanticId, version, carrier] = match;
  const contentType = CONTENT_TYPES.get(carrier) ?? "text/vtt; charset=utf-8";
  return {
    contentType,
    key: `${STORAGE_PREFIX}${semanticId}/${version}/${carrier}`,
    maximumBytes: carrier === "movie.mp4"
      ? MAX_CACHEABLE_OBJECT_BYTES
      : MAX_COMPANION_OBJECT_BYTES,
  };
}

function validObjectMetadata(object, expectedContentType, maximumBytes, requireBody) {
  if (
    !object
    || !Number.isSafeInteger(object.size)
    || object.size <= 0
    || object.size > maximumBytes
  ) return false;
  if (typeof object.httpEtag !== "string" || object.httpEtag.length > 256) return false;
  if (!STRONG_ETAG.test(object.httpEtag)) return false;
  if (object.httpMetadata?.contentType !== expectedContentType) return false;
  if (object.httpMetadata?.contentEncoding != null) return false;
  return !requireBody || typeof object.body?.pipeTo === "function";
}

function parseEntityTagCondition(value) {
  const source = value.trim();
  if (source === "*") return { any: true, tags: [] };
  const tags = [];
  let index = 0;
  const skipWhitespace = () => {
    while (source[index] === " " || source[index] === "\t") index += 1;
  };
  while (index < source.length) {
    skipWhitespace();
    if (index === source.length) break;
    if (source[index] === ",") {
      index += 1;
      continue;
    }
    let weak = false;
    if (source.slice(index, index + 2) === "W/") {
      weak = true;
      index += 2;
    }
    if (source[index] !== '"') return null;
    index += 1;
    const opaqueStart = index;
    while (index < source.length && source[index] !== '"') {
      const code = source.charCodeAt(index);
      if (code < 0x21 || code === 0x7f) return null;
      index += 1;
    }
    if (source[index] !== '"') return null;
    tags.push({ opaque: source.slice(opaqueStart, index), weak });
    index += 1;
    skipWhitespace();
    if (index === source.length) break;
    if (source[index] !== ",") return null;
    index += 1;
  }
  return tags.length > 0 ? { any: false, tags } : null;
}

function conditionalDisposition(request, etag) {
  const opaque = etag.slice(1, -1);
  const ifNoneMatchValue = request.headers.get("if-none-match");
  if (ifNoneMatchValue !== null) {
    const condition = parseEntityTagCondition(ifNoneMatchValue);
    if (condition === null) return "invalidRequest";
    const matches = condition.any
      || condition.tags.some((candidate) => candidate.opaque === opaque);
    if (matches) return "notModified";
  }
  return null;
}

function r2FailureKind(error) {
  const match = /\((\d{5,6})\)\s*$/u.exec(String(error?.message ?? ""));
  const code = match ? Number(match[1]) : null;
  return RETRYABLE_R2_CODES.has(code) ? "dependencyUnavailable" : "routeConfiguration";
}

async function discardBody(object) {
  if (typeof object?.body?.cancel !== "function") return;
  try {
    await object.body.cancel();
  } catch {
    // The selected bounded failure remains the public result.
  }
}

function objectResponse(method, object, contentType) {
  const headers = hardenedHeaders({
    "Accept-Ranges": "bytes",
    "Cache-Control": CACHE_CONTROL,
    "Content-Length": String(object.size),
    "Content-Type": contentType,
    ETag: object.httpEtag,
  });
  if (method === "HEAD") return new Response(null, { status: 200, headers });

  if (typeof globalThis.FixedLengthStream === "function") {
    const fixed = new globalThis.FixedLengthStream(object.size);
    const response = new Response(fixed.readable, { status: 200, headers });
    object.body.pipeTo(fixed.writable).catch(() => {
      // Aborting the fixed-length stream also aborts the response body.
    });
    return response;
  }
  return new Response(object.body, { status: 200, headers });
}

function notModifiedResponse(object) {
  return new Response(null, {
    status: 304,
    headers: hardenedHeaders({
      "Accept-Ranges": "bytes",
      "Cache-Control": CACHE_CONTROL,
      ETag: object.httpEtag,
    }),
  });
}

export async function fetchCachedMediaObject(request, env) {
  const method = request.method;
  if (method !== "GET" && method !== "HEAD") {
    return errorResponse(method, "methodNotAllowed");
  }
  if (!acceptedReadConditions(request)) {
    return errorResponse(method, "invalidRequest");
  }
  const url = new URL(request.url);
  const route = mediaRoute(url.pathname);
  if (route === null) return errorResponse(method, "routeConfiguration");

  const bucket = env?.MEDIA_BUCKET;
  const operation = method === "HEAD" ? "head" : "get";
  if (typeof bucket?.[operation] !== "function") {
    return errorResponse(method, "routeConfiguration");
  }

  let object;
  try {
    object = await bucket[operation](route.key);
  } catch (error) {
    return errorResponse(method, r2FailureKind(error));
  }

  if (object === null) return errorResponse(method, "notFound");
  if (!validObjectMetadata(
    object,
    route.contentType,
    route.maximumBytes,
    method === "GET",
  )) {
    await discardBody(object);
    return errorResponse(method, "metadataInvalid");
  }
  const disposition = conditionalDisposition(request, object.httpEtag);
  if (disposition !== null) {
    await discardBody(object);
    return disposition === "notModified"
      ? notModifiedResponse(object)
      : errorResponse(method, disposition);
  }
  try {
    return objectResponse(method, object, route.contentType);
  } catch {
    await discardBody(object);
    return errorResponse(method, "responseConstruction");
  }
}

export default {
  async fetch(request, _env, ctx) {
    const method = request.method;
    const target = rawRequestTarget(request.url);
    let url;
    try {
      url = new URL(request.url);
    } catch {
      return errorResponse(method, "invalidRequest");
    }

    if (
      target === null
      || target.hasQuery
      || target.hasFragment
      || hasAmbiguousPath(target.path, url.pathname)
    ) {
      return errorResponse(method, "invalidRequest");
    }
    if (method !== "GET" && method !== "HEAD") {
      return errorResponse(method, "methodNotAllowed");
    }
    if (!acceptedReadConditions(request)) {
      return errorResponse(method, "invalidRequest");
    }

    const acceptedRoute = mediaRoute(url.pathname);
    if (acceptedRoute === null) return errorResponse(method, "notFound");
    if (url.hostname !== PUBLIC_HOSTNAME) return errorResponse(method, "invalidRequest");
    if (url.protocol === "http:") {
      url.port = "";
      return redirectResponse(url);
    }
    if (url.protocol !== "https:" || url.port !== "") {
      return errorResponse(method, "invalidRequest");
    }

    const cachedEntrypoint = ctx?.exports?.CachedMediaObject;
    if (typeof cachedEntrypoint?.fetch !== "function") {
      return errorResponse(method, "routeConfiguration");
    }
    try {
      const response = await cachedEntrypoint.fetch(canonicalCachedRequest(request, url));
      return response instanceof Response
        ? response
        : errorResponse(method, "routeConfiguration");
    } catch {
      return errorResponse(method, "routeConfiguration");
    }
  },
};

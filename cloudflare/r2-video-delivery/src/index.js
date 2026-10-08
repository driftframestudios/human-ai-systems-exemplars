const CACHE_CONTROL = "public, max-age=31536000, immutable";
const MAX_PUBLIC_PATH_LENGTH = 512;
const PUBLIC_PREFIX = "/v1-cdn/video/";
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

const ERRORS = new Map([
  [400, "Invalid request\n"],
  [404, "Media not found\n"],
  [405, "Method not allowed\n"],
  [502, "Media metadata invalid\n"],
  [503, "Media unavailable\n"],
]);

function hardenedHeaders(initial) {
  const headers = new Headers(initial);
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}

function errorResponse(method, status) {
  const body = ERRORS.get(status) ?? ERRORS.get(503);
  const headers = hardenedHeaders({
    "Cache-Control": "no-store",
    "Content-Length": String(body.length),
    "Content-Type": "text/plain; charset=utf-8",
  });
  if (status === 405) headers.set("Allow", "GET, HEAD");
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
  if (!match) return null;

  const [, semanticId, version, carrier] = match;
  const contentType = CONTENT_TYPES.get(carrier) ?? "text/vtt; charset=utf-8";
  return {
    contentType,
    key: `${STORAGE_PREFIX}${semanticId}/${version}/${carrier}`,
  };
}

function validObjectMetadata(object, expectedContentType, requireBody) {
  if (!object || !Number.isSafeInteger(object.size) || object.size <= 0) return false;
  if (typeof object.httpEtag !== "string" || object.httpEtag.length > 256) return false;
  if (!STRONG_ETAG.test(object.httpEtag)) return false;
  if (object.httpMetadata?.contentType !== expectedContentType) return false;
  if (object.httpMetadata?.contentEncoding != null) return false;
  return !requireBody || typeof object.body?.pipeTo === "function";
}

async function discardBody(object) {
  if (typeof object?.body?.cancel !== "function") return;
  try {
    await object.body.cancel();
  } catch {
    // The bounded metadata error remains the public result.
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

  let body = object.body;
  if (typeof globalThis.FixedLengthStream === "function") {
    const fixed = new globalThis.FixedLengthStream(object.size);
    object.body.pipeTo(fixed.writable).catch(() => {
      // Aborting the fixed-length stream also aborts the response body.
    });
    body = fixed.readable;
  }
  return new Response(body, { status: 200, headers });
}

export default {
  async fetch(request, env) {
    const method = request.method;
    const target = rawRequestTarget(request.url);
    let url;
    try {
      url = new URL(request.url);
    } catch {
      return errorResponse(method, 400);
    }

    if (!target || target.hasQuery || target.hasFragment || hasAmbiguousPath(target.path, url.pathname)) {
      return errorResponse(method, 400);
    }
    if (method !== "GET" && method !== "HEAD") return errorResponse(method, 405);

    const route = mediaRoute(url.pathname);
    if (!route) return errorResponse(method, 404);
    if (url.protocol === "http:") return redirectResponse(url);
    if (url.protocol !== "https:") return errorResponse(method, 400);

    let object;
    try {
      object = method === "HEAD"
        ? await env.MEDIA_BUCKET.head(route.key)
        : await env.MEDIA_BUCKET.get(route.key);
    } catch {
      return errorResponse(method, 503);
    }

    if (!object) return errorResponse(method, 404);
    if (!validObjectMetadata(object, route.contentType, method === "GET")) {
      await discardBody(object);
      return errorResponse(method, 502);
    }
    return objectResponse(method, object, route.contentType);
  },
};

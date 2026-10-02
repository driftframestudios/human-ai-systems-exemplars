import publication from "../public/publication-manifest.json" with { type: "json" };

// Deployment-owned configuration, prepared from the repository's schema owners.
// Lookups are average O(1); response bodies remain streams owned by ASSETS.
const frozenPaths = new Set(publication.frozen);
const assetRoutes = new Map(Object.entries(publication.routes));
const publicHeaders = Object.entries(publication.headers);
const readMethods = new Set(["GET", "HEAD"]);
const IMMUTABLE = "public, max-age=31536000, immutable";
const REVALIDATE = "public, max-age=0, must-revalidate";

function responseHeaders(original, policy) {
  const headers = new Headers(original);
  for (const [name, value] of publicHeaders) headers.set(name, value);
  headers.set("Cache-Control", policy);
  return headers;
}

function jsonResponse(request, status, payload) {
  const headers = responseHeaders({ "Content-Type": "application/json; charset=utf-8" }, "no-store");
  if (status === 405) headers.set("Allow", "GET, HEAD, OPTIONS");
  return new Response(request.method === "HEAD" ? null : JSON.stringify(payload), { status, headers });
}

function requestForAsset(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname === "/" ? "/index.html" : (assetRoutes.get(pathname) ?? pathname);
  return new Request(url, request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.protocol === "http:") {
      url.protocol = "https:";
      return new Response(null, {
        status: 308,
        headers: responseHeaders({ Location: url.href }, "no-store"),
      });
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders(undefined, "no-store") });
    }
    if (!readMethods.has(request.method)) {
      return jsonResponse(request, 405, { error: "Use GET, HEAD, or OPTIONS", resource: url.pathname });
    }
    let assetResponse;
    try {
      assetResponse = await env.ASSETS.fetch(requestForAsset(request, url.pathname));
    } catch {
      return jsonResponse(request, 503, { error: "Schema delivery temporarily unavailable", resource: url.pathname });
    }
    if (assetResponse.status === 404) {
      return jsonResponse(request, 404, { error: "Resource unavailable", resource: url.pathname });
    }
    const successful = assetResponse.ok || assetResponse.status === 304;
    const policy = successful ? (frozenPaths.has(url.pathname) ? IMMUTABLE : REVALIDATE) : "no-store";
    return new Response(request.method === "HEAD" ? null : assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers: responseHeaders(assetResponse.headers, policy),
    });
  },
};

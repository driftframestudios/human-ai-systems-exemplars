// schemas-worker — asset-only Worker with publication-manifest-driven caching
//
// Behavior:
//   HTTP          → 308 → HTTPS (preserves hostname, path, query string)
//   /             → serves public/index.html
//   200 (asset)   → Cache-Control from publication-manifest.json
//   404 (missing) → JSON 404 naming the missing resource, Cache-Control: no-store
//   5xx (error)   → passthrough with Cache-Control: no-store
//
// Cache-Control policy (eligibility from publication-manifest.json, not file extension):
//   Frozen exact-version schema/context  → public, max-age=31536000, immutable
//   Everything else (catalogs, indexes,
//     mutable/unversioned schemas)        → public, max-age=0, must-revalidate
//   Missing resources / error responses   → no-store
//
// ETag support is retained from the assets binding (preserved via Response copy).

let manifestCache = null;

async function getManifest(env) {
  if (manifestCache) return manifestCache;
  try {
    const res = await env.ASSETS.fetch("https://assets.local/publication-manifest.json");
    manifestCache = res.ok ? await res.json() : { frozen: [] };
  } catch {
    manifestCache = { frozen: [] };
  }
  return manifestCache;
}

function getCacheControl(pathname, manifest) {
  if (manifest.frozen && manifest.frozen.includes(pathname)) {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=0, must-revalidate";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. HTTP → HTTPS 308 redirect (preserves hostname, path, query string)
    if (url.protocol === "http:") {
      url.protocol = "https:";
      return new Response(null, {
        status: 308,
        headers: { Location: url.toString() },
      });
    }

    // 2. Registry root → index.html
    const requestedPath = url.pathname;
    if (url.pathname === "/") {
      url.pathname = "/index.html";
      request = new Request(url, request);
    }

    // 3. Fetch the asset via the assets binding
    const assetResponse = await env.ASSETS.fetch(request);

    // 4. Missing resource → 404 with no-store, naming the missing resource
    if (assetResponse.status === 404) {
      return new Response(
        JSON.stringify({ error: "Not Found", resource: requestedPath }, null, 2),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // 5. Error responses → passthrough with no-store
    if (!assetResponse.ok && assetResponse.status !== 304) {
      const response = new Response(assetResponse.body, assetResponse);
      response.headers.set("Cache-Control", "no-store");
      return response;
    }

    // 6. Published schema or mutable resource → manifest-based Cache-Control
    const manifest = await getManifest(env);
    const cacheControl = getCacheControl(requestedPath, manifest);

    // Preserve ETag and all other headers from the asset response
    const response = new Response(assetResponse.body, assetResponse);
    response.headers.set("Cache-Control", cacheControl);
    return response;
  },
};


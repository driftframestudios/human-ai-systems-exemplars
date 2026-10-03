import fs from "node:fs/promises";
import path from "node:path";

export async function withCampaignLock(output, work, filesystem = fs) {
  const lockPath = path.join(output, "campaign.lock");
  const resources = { browser: null };
  let lock;
  let ownsLock = false;
  try {
    await filesystem.mkdir(output, { recursive: true });
    lock = await filesystem.open(lockPath, "wx");
    ownsLock = true;
    await lock.close();
    lock = null;
    return await work(resources);
  } finally {
    try {
      await resources.browser?.close();
    } finally {
      try {
        await lock?.close();
      } finally {
        if (ownsLock) await filesystem.rm(lockPath, { force: true });
      }
    }
  }
}

export async function fulfillCampaignRequest(route, {
  variant, snapshot, dependencies, metrics, errors, externalSubstitutions,
}) {
  const request = route.request();
  const url = new URL(request.url());
  let key;
  if (url.hostname === "followthrough.test") key = decodeURIComponent(url.pathname).slice(1);
  else if (url.hostname === "iframes.vik.guru" && ["package", "parent"].includes(variant))
    key = "package:" + decodeURIComponent(url.pathname).replace(/^\/v1\//u, "");
  else {
    const iframeDocument = request.isNavigationRequest() && request.resourceType() === "document"
      && request.frame().parentFrame() !== null;
    if (iframeDocument) {
      externalSubstitutions.push({ method: request.method(), url: request.url(), status: 200,
        disposition: "intentional foreign iframe document placeholder; external content unobserved" });
      return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8",
        body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>External iframe not observed</title></head><body><p>External iframe content is not observed in this local campaign.</p></body></html>' });
    }
    externalSubstitutions.push({ method: request.method(), url: request.url(), status: 204,
      disposition: "intentional external substitution; live delivery unobserved" });
    return route.fulfill({ status: 204, body: "" });
  }
  if (key.endsWith("/")) key += "index.html";
  const bytes = await snapshot.bytes(key);
  if (bytes === null) {
    errors.push("Missing local resource: " + key);
    return route.fulfill({ status: 404, body: "" });
  }
  dependencies[key] = await snapshot.hash(key);
  if (request.isNavigationRequest()) metrics.navigationRequests++;
  const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
    ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
  return route.fulfill({ status: 200, body: bytes, contentType: types[path.extname(key)] || "application/octet-stream" });
}

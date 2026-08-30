import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const contextRoot = join(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);
const routeManifestPath = join(
  repositoryRoot,
  "core-architectures-chimeric-prototype-current-pack-v0.1/public-iframe-route-manifest-v1.json",
);

function attributeValue(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(
    new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function escapeExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("manifest-owned prototype carriers keep a minimal explicit iframe boundary", async () => {
  const manifest = JSON.parse(await readFile(routeManifestPath, "utf8"));
  const routeByPublicUrl = new Map(
    manifest.routes.map((route) => [
      `https://${manifest.host}${route.public_alias}`,
      route,
    ]),
  );
  const pages = (await readdir(contextRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => entry.name)
    .sort();

  const carriers = [];
  for (const page of pages) {
    const html = await readFile(join(contextRoot, page), "utf8");
    for (const match of html.matchAll(/<iframe\b[^>]*>/gi)) {
      const tag = match[0];
      const src = attributeValue(tag, "src");
      if (!src?.startsWith(`https://${manifest.host}${manifest.base_path}`)) continue;
      const figureStart = html.lastIndexOf("<figure", match.index);
      const figureEnd = html.indexOf("</figure>", match.index);
      const figure =
        figureStart >= 0 && figureEnd >= match.index
          ? html.slice(figureStart, figureEnd + "</figure>".length)
          : "";
      carriers.push({ page, figure, tag, src });
    }
  }

  assert.equal(carriers.length, 9, "the current Context Canvas owns nine hosted iframe carriers");
  assert.equal(
    new Set(carriers.map(({ src }) => src)).size,
    8,
    "the nine carriers use eight manifest-owned public routes",
  );

  for (const carrier of carriers) {
    const route = routeByPublicUrl.get(carrier.src);
    const label = `${carrier.page} → ${route?.id ?? carrier.src}`;
    const title = attributeValue(carrier.tag, "title");
    const sandbox = attributeValue(carrier.tag, "sandbox");
    const allow = attributeValue(carrier.tag, "allow");
    const sandboxTokens = sandbox?.split(/\s+/).filter(Boolean) ?? [];
    const allowFeatures = allow?.split(";").map((value) => value.trim()).filter(Boolean) ?? [];

    assert.ok(route, `${label} resolves to the public route manifest`);
    assert.ok(title?.trim(), `${label} has a contextual title`);
    assert.equal(attributeValue(carrier.tag, "loading"), "lazy", `${label} loads intentionally`);
    assert.notEqual(sandbox, null, `${label} declares a sandbox even when its token list is empty`);
    assert.equal(attributeValue(carrier.tag, "referrerpolicy"), "no-referrer", `${label} sends no referrer`);
    assert.equal(attributeValue(carrier.tag, "data-public-src"), null, `${label} uses its active stable route directly`);
    assert.doesNotMatch(
      sandbox,
      /allow-(?:same-origin|forms|popups|top-navigation|storage-access)/,
      `${label} avoids unrelated sandbox capabilities`,
    );
    assert.deepEqual(
      sandboxTokens,
      route.carrier_policy.sandbox_tokens,
      `${label} uses its exact public-route sandbox profile`,
    );
    assert.deepEqual(
      allowFeatures,
      route.carrier_policy.permissions_policy,
      `${label} uses the exact route Permissions Policy profile`,
    );
    const localFullView = route.id === "conditioning-field"
      ? "conditioning-field.html"
      : `prototypes/core-architectures/chimeric-pack-v0.1/${route.source_file}`;
    assert.match(
      carrier.figure,
      new RegExp(`href=["']${escapeExpression(localFullView)}["']`, "i"),
      `${label} keeps its repository-local full-view route in the owning figure`,
    );
    assert.doesNotMatch(
      carrier.figure,
      /data-public-(?:src|href)=/i,
      `${label} does not retain a superseded late-binding carrier`,
    );
  }

  const conditioningRoute = "https://iframes.vik.guru/v1/core/conditioning-field/";
  const conditioningCarrier = carriers.find(({ src }) => src === conditioningRoute);
  assert.ok(conditioningCarrier, "AI Systems embeds the hosted Conditioning Field route");
  assert.equal(conditioningCarrier.page, "ai-systems.html");
  assert.equal(attributeValue(conditioningCarrier.tag, "sandbox"), "allow-scripts");
  assert.equal(attributeValue(conditioningCarrier.tag, "allow"), null);
  assert.equal(attributeValue(conditioningCarrier.tag, "referrerpolicy"), "no-referrer");
  assert.match(
    conditioningCarrier.figure,
    /href=["']conditioning-field\.html["']/i,
    "the hosted Conditioning Field keeps its local standalone full view",
  );
  const aiSystemsHtml = await readFile(join(contextRoot, "ai-systems.html"), "utf8");
  assert.doesNotMatch(
    aiSystemsHtml,
    /<link\b[^>]*rel=["']prefetch["'][^>]*href=["']conditioning-field\.html["']/i,
    "AI Systems does not prefetch the local fallback ahead of its lazy hosted carrier",
  );
  const conditioningParentRuntime = [
    aiSystemsHtml,
    await readFile(join(contextRoot, "visitor-boundary-contract.js"), "utf8"),
    await readFile(join(contextRoot, "canvas-shell.js"), "utf8"),
  ].join("\n");
  assert.doesNotMatch(
    conditioningParentRuntime,
    /(?:addEventListener\s*\(\s*["']message["']|\bonmessage\s*=|\b(?:BroadcastChannel|MessageChannel)\s*\()/u,
    "the Conditioning Field parent and its shared runtime install no cross-document message receiver",
  );

  const hubRoute = manifest.routes.find(({ id }) => id === "core-architectures-pack");
  assert.ok(hubRoute, "the pack hub route remains in the public route manifest");
  assert.equal(
    carriers.some(({ src }) => src === `https://${manifest.host}${hubRoute.public_alias}`),
    false,
    "the multi-route pack index is presented as a full view rather than one union-capability iframe",
  );
  const orientationHtml = await readFile(
    join(contextRoot, "core-architectures-orientation-index.html"),
    "utf8",
  );
  assert.match(
    orientationHtml,
    new RegExp(
      `href=["']prototypes/core-architectures/chimeric-pack-v0\\.1/${escapeExpression(hubRoute.source_file)}["']`,
      "i",
    ),
    "the pack index keeps a direct repository-local full-view route",
  );

  const downloadCarriers = carriers.filter(({ tag }) =>
    (attributeValue(tag, "sandbox") ?? "").split(/\s+/).includes("allow-downloads"),
  );
  assert.equal(downloadCarriers.length, 0, "hosted iframe carriers do not retain local-only download permission");
});

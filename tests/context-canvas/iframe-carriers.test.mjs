import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
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

test("Core prototype carriers keep a minimal explicit iframe boundary", async () => {
  const manifest = JSON.parse(await readFile(routeManifestPath, "utf8"));
  const routeBySource = new Map(
    manifest.routes.map((route) => [route.source_file, route]),
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
      if (!src?.includes("prototypes/core-architectures/chimeric-pack-v0.1/")) continue;
      const figureStart = html.lastIndexOf("<figure", match.index);
      const figureEnd = html.indexOf("</figure>", match.index);
      const figure =
        figureStart >= 0 && figureEnd >= match.index
          ? html.slice(figureStart, figureEnd + "</figure>".length)
          : "";
      carriers.push({ page, figure, tag, src });
    }
  }

  assert.equal(carriers.length, 9, "the current Context Canvas owns nine Core carriers");

  for (const carrier of carriers) {
    const label = `${carrier.page} → ${basename(carrier.src)}`;
    const route = routeBySource.get(basename(carrier.src));
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
    assert.doesNotMatch(
      sandbox,
      /allow-(?:same-origin|forms|popups|top-navigation|storage-access)/,
      `${label} avoids unrelated sandbox capabilities`,
    );
    const expectedSandbox = [...route.carrier_policy.sandbox_tokens];
    if (route.id === "strategy-canvas") expectedSandbox.push("allow-downloads");
    assert.deepEqual(
      sandboxTokens,
      expectedSandbox,
      `${label} uses its route profile and only its adapted local capability`,
    );
    assert.deepEqual(
      allowFeatures,
      route.carrier_policy.permissions_policy,
      `${label} uses the exact route Permissions Policy profile`,
    );
    assert.match(
      carrier.figure,
      new RegExp(`href=["']${escapeExpression(carrier.src)}["']`, "i"),
      `${label} keeps its local full-view route in the owning figure`,
    );

    const hostedKey = attributeValue(carrier.tag, "data-public-src");
    if (hostedKey === null) continue;
    assert.equal(hostedKey, "{{PUBLIC_URL_IFRAME_CORE_HEART_CHART}}");
    assert.equal(route.id, "heart-chart");
  }

  const hub = carriers.find(({ src }) => basename(src) === "core-architectures-chimeric-prototype-pack-index-v0.1.1.html");
  assert.ok(hub, "the pack hub carrier is present");
  assert.equal(attributeValue(hub.tag, "sandbox"), "", "the scriptless hub receives an empty sandbox");
  assert.doesNotMatch(attributeValue(hub.tag, "title"), /interactive/i, "the hub title does not promise interaction");

  const downloadCarriers = carriers.filter(({ tag }) =>
    (attributeValue(tag, "sandbox") ?? "").split(/\s+/).includes("allow-downloads"),
  );
  assert.equal(downloadCarriers.length, 2, "only the two adapted Strategy carriers allow downloads");
  assert.ok(
    downloadCarriers.every(({ src }) => basename(src) === "strategy-canvas-chimeric-prototype-v0.2.0.html"),
  );
  const strategyRuntime = await readFile(
    join(
      contextRoot,
      "prototypes/core-architectures/chimeric-pack-v0.1/strategy-canvas-context-workbench-v0.2.js",
    ),
    "utf8",
  );
  assert.match(strategyRuntime, /new Blob\s*\(/, "the adapted Strategy runtime forms a local download");
  assert.match(strategyRuntime, /\.download\s*=/, "the adapted Strategy runtime names its local download");
});

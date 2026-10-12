import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);
const aiSystemsRoute = "ai-systems.html";
const sharedMachineryRoute = "shared-machinery.html";
const aiSystemsTitle = "AI Systems — Accountable Decisions and Recoverable Work";
const sharedMachineryName = "Shared Machinery";
const sharedMachineryTitle =
  "Shared Machinery — Instruments for Work Across Tools and Teams";
const publicSourceRoot =
  "https://schemas.radiantnull.com/context-canvas-project-surface/context-canvas/";
const currentSitemapSources = [
  "index.html",
  aiSystemsRoute,
  "benchmark-orientation.html",
  "collaboration-skills.html",
  "concept-nursery.html",
  "core-architectures-orientation-index.html",
  "cross-platform-collaboration-cycle.html",
  "grammar-family.html",
  "hiring-surfaces-talent-agent-intake.html",
  "maps-evaluations.html",
  "metadata-blocks.html",
  "planning-surface.html",
  "poda.html",
  "readable-tables-reusable-evidence.html",
  "registry-goal-fidelity-routing.html",
  "resting-concepts.html",
  sharedMachineryRoute,
  "visualization-fidelity-atlas.html",
];

async function source(relativePath) {
  return readFile(resolve(repositoryRoot, relativePath), "utf8");
}

function jsonLd(html) {
  const block = html.match(
    /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/u,
  );
  assert.ok(block, "page carries JSON-LD");
  return JSON.parse(block[1]);
}

function metadataContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return html.match(
    new RegExp(`<meta\\s+(?:property|name)=["']${escaped}["']\\s+content=["']([^"']+)["']`, "u"),
  )?.[1] ?? "";
}

function allObjects(value) {
  if (Array.isArray(value)) return value.flatMap(allObjects);
  if (!value || typeof value !== "object") return [];
  return [value, ...Object.values(value).flatMap(allObjects)];
}

function hrefs(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gu)]
    .map((match) => match[1]);
}

function fragmentExists(html, fragment, label) {
  if (!fragment) return;
  const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  assert.match(
    html,
    new RegExp(`\\bid=["']${escaped}["']`, "u"),
    `${label}: fragment #${fragment}`,
  );
}

test("AI Systems and Shared Machinery publish one current title at every self-metadata coordinate", async () => {
  for (const [route, expectedTitle] of [
    [aiSystemsRoute, aiSystemsTitle],
    [sharedMachineryRoute, sharedMachineryTitle],
  ]) {
    const html = await source(
      `context-canvas-project-surface/context-canvas/${route}`,
    );
    const record = jsonLd(html);

    assert.equal(
      html.match(/<title>([^<]+) \| Context Canvas<\/title>/u)?.[1],
      expectedTitle,
      `${route}: document title`,
    );
    assert.equal(metadataContent(html, "og:title"), expectedTitle, `${route}: Open Graph title`);
    assert.equal(metadataContent(html, "twitter:title"), expectedTitle, `${route}: Twitter title`);
    assert.equal(record.headline, expectedTitle, `${route}: structured headline`);
    assert.equal(record.url, `${publicSourceRoot}${route}`, `${route}: stable structured URL`);
  }
});

test("the About and AI Systems structured references use the receiving pages' current identities", async () => {
  const [aboutHtml, aiHtml, sharedHtml] = await Promise.all([
    source("context-canvas-project-surface/context-canvas/index.html"),
    source(`context-canvas-project-surface/context-canvas/${aiSystemsRoute}`),
    source(`context-canvas-project-surface/context-canvas/${sharedMachineryRoute}`),
  ]);
  const about = jsonLd(aboutHtml);
  const aiSystems = jsonLd(aiHtml);
  const sharedMachinery = jsonLd(sharedHtml);

  const aboutReferences = new Map(
    allObjects(about.hasPart)
      .filter((entry) => [aiSystemsRoute, sharedMachineryRoute]
        .some((route) => entry.url === `${publicSourceRoot}${route}`))
      .map((entry) => [entry.url, entry]),
  );
  assert.equal(
    aboutReferences.get(`${publicSourceRoot}${aiSystemsRoute}`)?.name,
    aiSystemsTitle,
    "About identifies the current AI Systems collection",
  );
  assert.equal(
    aboutReferences.get(`${publicSourceRoot}${sharedMachineryRoute}`)?.name,
    sharedMachineryTitle,
    "About identifies the current Shared Machinery collection",
  );

  const sharedReference = allObjects(aiSystems.hasPart).find(
    (entry) => entry.url === `${publicSourceRoot}${sharedMachineryRoute}`,
  );
  assert.ok(sharedReference, "AI Systems names Shared Machinery as a collection member");
  assert.equal(sharedReference.name, sharedMachineryName);
  assert.equal(sharedReference.headline, sharedMachinery.headline);
  assert.equal(sharedReference.dateModified, sharedMachinery.dateModified);
});

test("current production HTML links resolve to the stable AI Systems and Shared Machinery routes", async () => {
  const manifest = JSON.parse(await source("deployment/cpanel/primary-route-manifest.json"));
  const selectedHtml = manifest.files.filter((entry) => entry.media_type === "text/html");
  const selectedPaths = new Map(
    selectedHtml.map((entry) => [entry.source_path, entry.projected_path]),
  );
  assert.equal(
    selectedPaths.get(`context-canvas-project-surface/context-canvas/${aiSystemsRoute}`),
    aiSystemsRoute,
  );
  assert.equal(
    selectedPaths.get(`context-canvas-project-surface/context-canvas/${sharedMachineryRoute}`),
    sharedMachineryRoute,
  );

  const targetHtml = new Map([
    [aiSystemsRoute, await source(`context-canvas-project-surface/context-canvas/${aiSystemsRoute}`)],
    [sharedMachineryRoute, await source(`context-canvas-project-surface/context-canvas/${sharedMachineryRoute}`)],
  ]);
  let referenceCount = 0;

  for (const entry of selectedHtml) {
    const html = await source(entry.source_path);
    for (const href of hrefs(html)) {
      const matchedRoute = [aiSystemsRoute, sharedMachineryRoute]
        .find((route) => href.includes(route));
      if (!matchedRoute) continue;
      referenceCount += 1;

      const [pathPart, fragment = ""] = href.split("#", 2);
      if (/^https:\/\//u.test(pathPart)) {
        const url = new URL(pathPart);
        assert.equal(
          basename(url.pathname),
          matchedRoute,
          `${entry.source_path}: public route`,
        );
      } else {
        assert.equal(
          resolve(repositoryRoot, dirname(entry.source_path), pathPart),
          resolve(canvasRoot, matchedRoute),
          `${entry.source_path}: source-relative route`,
        );
      }
      fragmentExists(targetHtml.get(matchedRoute), fragment, entry.source_path);
    }
  }

  assert.ok(referenceCount > 50, "the production selection exposes the expected route family");
});

test("current route documentation, sitemap dates, and iframe continuation mappings retain stable public coordinates", async () => {
  const [readme, iframeManifestText, sitemap] = await Promise.all([
    source("context-canvas-project-surface/context-canvas/README.md"),
    source("iframe-route-families/canvas/public-iframe-route-manifest-v1.json"),
    source("context-canvas-project-surface/context-canvas/sitemap.xml"),
  ]);
  const iframeManifest = JSON.parse(iframeManifestText);

  assert.match(readme, /\[`ai-systems\.html`\]\(ai-systems\.html\).*accountable decisions, explicit human authority, and recoverable work/u);
  assert.match(readme, /\[`shared-machinery\.html`\]\(shared-machinery\.html\).*ten instruments/u);

  const serialized = JSON.stringify(iframeManifest);
  assert.match(serialized, /https:\/\/vik\.guru\/ai-systems\.html#conditioning-field-entry/u);
  assert.match(serialized, /https:\/\/vik\.guru\/shared-machinery\.html/u);

  for (const route of currentSitemapSources) {
    const html = await source(`context-canvas-project-surface/context-canvas/${route}`);
    const dateModified = jsonLd(html).dateModified;
    const publishedRoute = route === "index.html" ? "" : route;
    const routePattern = publishedRoute.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    assert.match(
      sitemap,
      new RegExp(`<loc>${publicSourceRoot}${routePattern}<\\/loc>\\s*<lastmod>${dateModified}<\\/lastmod>`, "u"),
      `${route}: sitemap currentness`,
    );
  }
});

test("retired page titles stay outside the current production selection", async () => {
  const manifest = JSON.parse(await source("deployment/cpanel/primary-route-manifest.json"));
  const currentHtml = await Promise.all(
    manifest.files
      .filter((entry) => entry.media_type === "text/html")
      .map((entry) => source(entry.source_path)),
  );
  const joined = currentHtml.join("\n");

  for (const retiredTitle of [
    "AI Systems — Goal-Faithful Collaboration",
    "Shared Machinery — Instruments for Work That Must Travel",
    "Shared Machinery · Grammar, Contracts, and Planning Surfaces",
    "Explore the AI Systems atlas",
  ]) {
    assert.doesNotMatch(joined, new RegExp(retiredTitle, "u"), retiredTitle);
  }
});

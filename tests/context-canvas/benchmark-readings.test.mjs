import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);

async function readCanvasFile(path) {
  return readFile(resolve(canvasRoot, path), "utf8");
}

function countMatches(source, pattern) {
  return Array.from(source.matchAll(pattern)).length;
}

function firstJsonLd(source) {
  const match = source.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/u);
  assert.ok(match, "Expected an application/ld+json block");
  return JSON.parse(match[1]);
}

test("benchmark readings expose source-grounded coordinates and shared visitor conventions", async () => {
  const [benchmark, maps] = await Promise.all([
    readCanvasFile("benchmark-orientation.html"),
    readCanvasFile("maps-evaluations.html"),
  ]);

  for (const [route, html] of [
    ["benchmark-orientation.html", benchmark],
    ["maps-evaluations.html", maps],
  ]) {
    assert.match(html, /<meta name="author" content="Vikrant Varun Kudesia">/u, route);
    assert.match(html, /<link rel="license" href="https:\/\/www\.apache\.org\/licenses\/LICENSE-2\.0">/u, route);
    assert.match(html, /styles\/routes\/benchmark-readings\.css/u, route);
    assert.match(html, /<script src="canvas-shell\.js" defer><\/script>/u, route);
    assert.match(html, /© 2003–2026 Vikrant Varun Kudesia · Driftframe Studios, Limited Liability Company/u, route);
    assert.doesNotThrow(() => firstJsonLd(html), `${route} JSON-LD should parse`);
  }

  assert.equal(countMatches(benchmark, /<li><strong>[^<]+<\/strong><p>/gu), 6);
  assert.equal(countMatches(benchmark.match(/<dl class="benchmark-result-profile[\s\S]*?<\/dl>/u)[0], /<div>/gu), 8);
  assert.match(benchmark, /Benchmark accuracy stays attached to the sampled items/u);
  assert.match(benchmark, /Generalized accuracy names a target population/u);
  assert.match(benchmark, /code-based, model-based, and human graders/u);
  assert.match(benchmark, /signals, not access controls, licenses, certificates, or guarantees/u);
  assert.match(benchmark, /https:\/\/doi\.org\/10\.6028\/NIST\.AI\.800-3/u);
  assert.match(benchmark, /NIST\.AI\.800-2\.ipd\.pdf/u);
  assert.match(benchmark, /training_on_test_set\/README\.md/u);

  assert.equal(countMatches(maps, /class="benchmark-source-lane"/gu), 2);
  assert.equal(countMatches(maps.match(/<dl class="benchmark-result-profile[\s\S]*?<\/dl>/u)[0], /<div>/gu), 6);
  assert.match(maps, /Misaligned Powerseeking Evaluations\s*\(MAPS\)/u);
  assert.match(maps, /does not publish a MAPS task catalog, scorer, classifier, result set, or probe definition/u);
  assert.match(maps, /it does not describe present model capability/u);
  assert.match(maps, /https:\/\/www\.alignment\.org\/canary\//u);
  assert.match(maps, /Evaluating_LMAs_Realistic_Tasks\.pdf/u);
  assert.doesNotMatch(maps, /MAPS suite/iu);
});

test("shared navigation and neighboring readings carry the two-route continuation", async () => {
  const [shell, aiSystems, promptPractice] = await Promise.all([
    readCanvasFile("canvas-shell.js"),
    readCanvasFile("ai-systems.html"),
    readCanvasFile("prompt-side-conditions-practice.html"),
  ]);

  const orderedRoutes = /\["Prompt-Side (?:Practice|Conditions Practice)", "prompt-side-conditions-practice\.html"\],\s*\["Benchmark Orientation", "benchmark-orientation\.html"\],\s*\["MAPS Evaluations", "maps-evaluations\.html"\]/gu;
  assert.equal(countMatches(shell, orderedRoutes), 2);

  const pair = aiSystems.match(/<section id="benchmark-reading-entry"[\s\S]*?<\/section>/u);
  assert.ok(pair, "AI Systems should contain one benchmark reading pair");
  assert.equal(countMatches(pair[0], /<article>/gu), 2);
  assert.match(pair[0], /href="benchmark-orientation\.html"/u);
  assert.match(pair[0], /href="maps-evaluations\.html"/u);

  assert.match(promptPractice, /href="benchmark-orientation\.html"/u);
  assert.match(promptPractice, /href="maps-evaluations\.html"/u);
});

test("Debriefs visible cards, preview counts, type counts, and JSON-LD stay synchronized", async () => {
  const html = await readCanvasFile("debriefs.html");
  const jsonLd = firstJsonLd(html);
  const itemList = jsonLd["@graph"].find(item => item["@type"] === "ItemList");
  assert.ok(itemList);
  assert.equal(itemList.numberOfItems, 20);
  assert.equal(itemList.itemListElement.length, 20);
  assert.deepEqual(
    itemList.itemListElement.map(item => item.position),
    Array.from({ length: 20 }, (_, index) => index + 1),
  );

  const itemUrls = itemList.itemListElement.map(item => item.url);
  assert.ok(itemUrls.some(url => url.endsWith("/benchmark-orientation.html")));
  assert.ok(itemUrls.some(url => url.endsWith("/maps-evaluations.html")));

  const cards = Array.from(html.matchAll(/<li id="catalog-[^"]+"[^>]*data-types="([^"]+)"/gu));
  assert.equal(cards.length, 17);
  assert.match(html, /Showing all 17 catalog entries\./u);
  assert.match(html, /All 17 catalog entries are in view\./u);
  assert.match(html, /id="catalog-benchmark-orientation"/u);
  assert.match(html, /id="catalog-maps-evaluations"/u);

  const observedCounts = new Map();
  for (const card of cards) {
    for (const type of card[1].split(/\s+/u)) {
      observedCounts.set(type, (observedCounts.get(type) ?? 0) + 1);
    }
  }

  const tagCloud = html.match(/<ul class="debrief-tag-cloud[\s\S]*?<\/ul>/u);
  assert.ok(tagCloud);
  const displayLabels = new Map([
    ["Debrief", "debrief"],
    ["Article", "article"],
    ["Executive Summary", "executive-summary"],
    ["Practice", "practice"],
    ["Data Visualization", "data-visualization"],
    ["Research", "research"],
    ["AI Systems Entry", "ai-systems-entry"],
    ["Instrument", "instrument"],
  ]);
  const displayedCounts = new Map(
    Array.from(tagCloud[0].matchAll(/<li><span>([^<]+)<\/span><strong>(\d+)<\/strong><\/li>/gu))
      .map(match => [displayLabels.get(match[1]), Number.parseInt(match[2], 10)]),
  );
  assert.deepEqual(displayedCounts, observedCounts);
});

test("sitemap and local route inventory expose both readings", async () => {
  const [sitemap, readme] = await Promise.all([
    readCanvasFile("sitemap.xml"),
    readCanvasFile("README.md"),
  ]);

  for (const route of ["benchmark-orientation.html", "maps-evaluations.html"]) {
    assert.equal(countMatches(sitemap, new RegExp(route.replace(".", "\\."), "gu")), 1);
    assert.ok(readme.includes(`[\`${route}\`]`));
  }
});

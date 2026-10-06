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

function labelledSection(source, id) {
  const pattern = new RegExp(
    `<section class="benchmark-boundary" aria-labelledby="${id}">[\\s\\S]*?<\\/section>`,
    "u",
  );
  const match = source.match(pattern);
  assert.ok(match, `Expected a benchmark-boundary section labelled by ${id}`);
  return match[0];
}

test("benchmark readings expose source-grounded coordinates and shared visitor conventions", async () => {
  const [benchmark, maps] = await Promise.all([
    readCanvasFile("benchmark-orientation.html"),
    readCanvasFile("maps-evaluations.html"),
  ]);
  const benchmarkWhy = labelledSection(benchmark, "benchmark-why-title");
  const mapsWhy = labelledSection(maps, "maps-why-title");

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
  assert.equal(countMatches(benchmarkWhy, />Why this matters</gu), 1);
  assert.match(benchmarkWhy, /Initial Public Draft benchmark-practice guidance/u);
  assert.match(benchmarkWhy, /NIST\.AI\.800-2\.ipd\.pdf/u);
  assert.match(benchmarkWhy, /https:\/\/doi\.org\/10\.6028\/NIST\.AI\.800-3/u);
  assert.match(benchmarkWhy, /supports reproduction, like-for-like comparison, and error finding/u);
  assert.match(benchmarkWhy, /What did this score actually test\?/u);
  assert.match(benchmark, /the producing conditions travel with the benchmark result/u);
  assert.match(benchmark, /Benchmark accuracy stays attached to the sampled items/u);
  assert.match(benchmark, /Generalized accuracy names a target population/u);
  assert.match(benchmark, /code-based, model-based, and human graders/u);
  assert.match(benchmark, /Access controls enforce access; applicable license terms define permissions; corpus-composition evidence supports exclusion claims; and the full validity assessment supports result interpretation/u);
  assert.match(benchmark, /https:\/\/doi\.org\/10\.6028\/NIST\.AI\.800-3/u);
  assert.match(benchmark, /NIST\.AI\.800-2\.ipd\.pdf/u);
  assert.match(benchmark, /training_on_test_set\/README\.md/u);

  assert.equal(countMatches(maps, /class="benchmark-source-lane"/gu), 2);
  assert.equal(countMatches(maps.match(/<dl class="benchmark-result-profile[\s\S]*?<\/dl>/u)[0], /<div>/gu), 6);
  assert.equal(countMatches(mapsWhy, />Why this matters</gu), 1);
  assert.match(mapsWhy, /Evaluation material remains useful when its provenance is traceable/u);
  assert.match(mapsWhy, /https:\/\/www\.alignment\.org\/canary\//u);
  assert.match(mapsWhy, /training_on_test_set\/README\.md/u);
  assert.match(mapsWhy, /Prior exposure can change the interpretation of a score/u);
  assert.match(mapsWhy, /contribute complementary exposure evidence/u);
  assert.match(maps, /Collection controls constrain collection; exclusion records document intended removals; corpus-composition evidence supports claims about included material; access controls enforce access; applicable license terms define permissions; and the full validity assessment supports result interpretation/u);
  assert.match(maps, /Misaligned Powerseeking Evaluations\s*\(MAPS\)/u);
  assert.match(maps, /Task, scorer, classifier, result, and probe specifications remain unspecified there/u);
  assert.match(maps, /present capability requires current evaluation evidence/u);
  assert.match(maps, /Each record retains the\s+evaluation identity it publishes/u);
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

test("Debriefs catalog and JSON-LD retain both benchmark readings", async () => {
  const html = await readCanvasFile("debriefs.html");
  const jsonLd = firstJsonLd(html);
  const itemList = jsonLd["@graph"].find(item => item["@type"] === "ItemList");
  assert.ok(itemList);
  assert.equal(itemList.numberOfItems, 24);
  assert.equal(itemList.itemListElement.length, 24);
  assert.deepEqual(
    itemList.itemListElement.map(item => item.position),
    Array.from({ length: 24 }, (_, index) => index + 1),
  );

  const itemUrls = itemList.itemListElement.map(item => item.url);
  assert.ok(itemUrls.some(url => url.endsWith("/benchmark-orientation.html")));
  assert.ok(itemUrls.some(url => url.endsWith("/maps-evaluations.html")));

  const cards = Array.from(html.matchAll(/<li id="catalog-[^"]+"[^>]*data-formats="[^"]+"[^>]*data-topics="[^"]+"/gu));
  assert.equal(cards.length, 19);
  assert.match(html, /Showing all 19 catalog entries\./u);
  assert.match(html, /All 19 catalog entries are in view\./u);
  assert.match(html, /id="catalog-benchmark-orientation"/u);
  assert.match(html, /id="catalog-maps-evaluations"/u);
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

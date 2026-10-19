import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);

const definitions = {
  expectation: "Expectation — Constraints on future inputs that define acceptable outputs.",
  focalization: "Focalization — Directing attention toward what can change the named decision while keeping the wider context recoverable.",
  opportunity: "Opportunity — Elements arranged in context so that positive change becomes reachable.",
  speculation: "Speculation — How a market carries what it cannot yet price with confidence.",
};

const placements = new Map([
  ["ai-systems.html", ["focalization"]],
  ["distributed-inspection-harness.html", ["opportunity"]],
  ["field-inspection-harness-replatform.html", ["speculation"]],
  ["fmi-clinical-trial-coordination.html", ["opportunity"]],
  ["initiative-costing.html", ["speculation"]],
  ["poda.html", ["expectation"]],
  ["prompt-side-conditions-practice.html", ["focalization"]],
  ["who-to-believe-reviews-platform.html", ["focalization"]],
]);

async function readCanvasFile(path) {
  return readFile(resolve(canvasRoot, path), "utf8");
}

function normalizeText(value) {
  return value
    .replace(/<[^>]+>/gu, "")
    .replace(/&amp;/gu, "&")
    .replace(/\s+/gu, " ")
    .trim();
}

function carriers(source) {
  return [...source.matchAll(
    /<blockquote class="debrief-quote cornerstone-definition" data-term-id="([^"]+)">([\s\S]*?)<\/blockquote>/gu,
  )];
}

async function htmlFilesUnder(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFilesUnder(path));
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

test("eight earned routes carry the exact working definitions", async () => {
  let total = 0;
  for (const [route, expectedTerms] of placements) {
    const found = carriers(await readCanvasFile(route));
    assert.deepEqual(found.map(match => match[1]), expectedTerms, route);
    for (const match of found) {
      const definitionText = normalizeText(
        match[2].match(/<p>([\s\S]*?)<\/p>/u)?.[1] ?? "",
      );
      assert.equal(definitionText, definitions[match[1]], route);
      assert.match(match[2], /<footer>Working definition ·/u, route);
    }
    total += found.length;
  }
  assert.equal(total, 8);
});

test("other top-level routes contain no cornerstone definition carrier", async () => {
  const topLevelRoutes = (await readdir(canvasRoot, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith(".html"))
    .map(entry => entry.name);

  for (const route of topLevelRoutes) {
    if (placements.has(route)) continue;
    assert.equal(carriers(await readCanvasFile(route)).length, 0, route);
  }
});

test("About and general prototypes remain definition-free", async () => {
  assert.equal(carriers(await readCanvasFile("index.html")).length, 0);
  const prototypes = await htmlFilesUnder(resolve(canvasRoot, "prototypes"));
  for (const path of prototypes) {
    assert.doesNotMatch(await readFile(path, "utf8"), /cornerstone-definition/u, path);
  }
});

test("the shared carrier provides semantic emphasis and forced-color edges", async () => {
  const css = await readCanvasFile("expanded.css");
  assert.match(css, /\.cornerstone-definition\s*\{/u);
  assert.match(css, /\.cornerstone-definition dfn\s*\{[\s\S]*?font-style:\s*normal;/u);
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*?\.cornerstone-definition/u);
});

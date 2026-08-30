import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);

async function readCanvasFile(path) {
  return readFile(resolve(canvasRoot, path), "utf8");
}

async function topLevelHtmlFilesContaining(pattern) {
  const routes = (await readdir(canvasRoot, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith(".html"))
    .map(entry => entry.name)
    .sort();

  const matches = [];
  for (const route of routes) {
    if (pattern.test(await readCanvasFile(route))) matches.push(route);
  }
  return matches;
}

test("About uses visitor-facing setting, role, and handoff language", async () => {
  const html = await readCanvasFile("index.html");

  assert.match(html, /settings where a software decision/u);
  assert.match(html, /Participants across roles gained/u);
  assert.match(html, /people across roles gain/u);
  assert.match(html, /work, memory, and judgment held together/u);
  assert.match(html, /evidence notes and decision handoffs carry the source/u);
  assert.doesNotMatch(html, /\brooms?\b|\bviewlets?\b/iu);
});

test("remaining room language names a runtime, classroom, or cited-title sense", async () => {
  assert.deepEqual(
    await topLevelHtmlFilesContaining(/\brooms?\b/iu),
    [
      "grammar-family.html",
      "hiring-surfaces-talent-agent-intake.html",
      "prompt-side-conditions-practice.html",
    ],
  );

  const [runtime, citation, classroom] = await Promise.all([
    readCanvasFile("grammar-family.html"),
    readCanvasFile("hiring-surfaces-talent-agent-intake.html"),
    readCanvasFile("prompt-side-conditions-practice.html"),
  ]);
  assert.match(runtime, /collaboration room or document/u);
  assert.match(runtime, /per-room coordination/u);
  assert.match(citation, /Pink Elephant[^<]+LLM’s Room/u);
  assert.match(classroom, /Room configuration:/u);
});

test("viewlet remains specialist vocabulary outside the About route", async () => {
  assert.deepEqual(
    await topLevelHtmlFilesContaining(/\bviewlets?\b/iu),
    ["who-to-believe-reviews-platform.html"],
  );

  const gallery = await readFile(
    join(repositoryRoot, "collaboration/about-ai-method-gallery/index.html"),
    "utf8",
  );
  assert.match(gallery, /AI-Legible Viewlet Atlas/u);
  assert.match(gallery, /class="viewlet-rack"/u);
});

test("curated visitor prose states findings directly while citations carry provenance", async () => {
  const routes = (await readdir(canvasRoot, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith(".html"))
    .map(entry => entry.name)
    .sort();
  const genericSourceNarrator = /\b(?:the|this) source (?:says|states|reports|describes|frames|positions|treats|names|shows|asks|requires|compares|assigns|supports|keeps|establishes)\b/iu;

  for (const route of routes) {
    assert.doesNotMatch(await readCanvasFile(route), genericSourceNarrator, route);
  }

  const [about, fieldInspection, hiring] = await Promise.all([
    readCanvasFile("index.html"),
    readCanvasFile("field-inspection-harness-replatform.html"),
    readCanvasFile("hiring-surfaces-talent-agent-intake.html"),
  ]);
  assert.match(about, /<title>Technology leadership portfolio \| Context Canvas<\/title>/u);
  assert.match(about, /<th scope="col">Reported consequence<\/th>/u);
  assert.match(fieldInspection, /Global invariants and candidate performance targets become testable against a bounded corpus/u);
  assert.match(hiring, /Vendor descriptions reviewed in public material from 2025–2026/u);
});

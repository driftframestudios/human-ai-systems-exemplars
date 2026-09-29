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
  assert.match(html, /href="hiring-surfaces-talent-agent-intake\.html#amplified-hiring-reach"/u);
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

test("Debrief role fields distinguish autobiographical work from teaching reconstruction", async () => {
  assert.deepEqual(
    await topLevelHtmlFilesContaining(/\b(?:Narrator(?: role| posture)?|[Tt]he author)\b/u),
    [
      "exemplar-ideal-debrief.html",
      "exemplar-maximal-debrief.html",
    ],
    "Only the explicitly labeled legacy example text retains a generic author",
  );

  const routes = [
    "choose-your-player-humatics.html",
    "fmi-clinical-trial-coordination.html",
    "fmi-lims-eln-replatforming.html",
    "genomic-viewer-replatforming.html",
    "three-way-comparative-return.html",
    "who-to-believe-reviews-platform.html",
  ];
  for (const route of routes) {
    const html = await readCanvasFile(route);
    assert.match(
      html,
      /<dt>Scope and role<\/dt>\s*<dd>[\s\S]*?\bI (?:worked|served)\b[\s\S]*?<\/dd>/u,
      route,
    );
  }

  const scenarioRoutes = [
    "ehr-discrete-genomic-result.html",
    "ehr-interface-engine-replatform.html",
    "ehr-pgx-alert-failure.html",
    "ehr-three-front-doors.html",
    "ehr-two-charts-one-result.html",
  ];
  for (const route of scenarioRoutes) {
    const html = await readCanvasFile(route);
    assert.match(
      html,
      /<dt>Scope and role<\/dt><dd>This principal-level teaching reconstruction reads/u,
      route,
    );
  }

  const [aiSystems, hiring, threeWay] = await Promise.all([
    readCanvasFile("ai-systems.html"),
    readCanvasFile("hiring-surfaces-talent-agent-intake.html"),
    readCanvasFile("three-way-comparative-return.html"),
  ]);
  assert.match(aiSystems, /I design, build, test, and publish the open-source methods, software, and multi-agent collaboration environments shown here/u);
  assert.match(hiring, /hiring research with inspectable work in open-source software, multi-agent orchestration environments, and decision-making surfaces/u);
  assert.match(threeWay, /I worked across design, product strategy, and engineering/u);

  for (const html of [aiSystems, hiring, threeWay, ...await Promise.all(scenarioRoutes.map(readCanvasFile))]) {
    assert.doesNotMatch(html, /Registry steward|systems practitioner|substrate builder|principal product designer and engineer/u);
  }

  const debriefs = await readCanvasFile("debriefs.html");
  assert.match(debriefs, /These Debriefs turn lived work in regulated, high-consequence, and commercially constrained systems into\s+reusable cases/u);
  assert.match(debriefs, /Each remains an example to\s+interpret in context/u);
  assert.doesNotMatch(debriefs, /AI collaboration supported a bounded public-source\s+search/u);
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

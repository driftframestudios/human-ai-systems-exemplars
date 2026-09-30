import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);
const primaryManifestPath = resolve(
  repositoryRoot,
  "deployment/cpanel/primary-route-manifest.json",
);
const coreIframeManifestPath = resolve(
  repositoryRoot,
  "core-architectures-chimeric-prototype-current-pack-v0.1/public-iframe-route-manifest-v1.json",
);
const canvasIframeManifestPath = resolve(
  repositoryRoot,
  "iframe-route-families/canvas/public-iframe-route-manifest-v1.json",
);
const contextCoreRoot = "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1";
const contextCoreManifestPath = resolve(
  repositoryRoot,
  contextCoreRoot,
  "core-architectures-chimeric-prototype-manifest-v0.1.json",
);

const genericPersonLikeSystemRole = /\b(?:AI|artificial intelligence)[\s-]+(?:assistant|collaborator|companion|coworker|partner|teammate)s?\b/giu;

// Exceptions bind to exact dated evidence fragments, rather than exempting an
// entire file or phrase. A new generic occurrence elsewhere in the same source
// must therefore fail this contract.
const threadkeepingSourcePath =
  "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/threadkeeping-ledger/threadkeeping-ledger-chimeric-prototype-bundle-v0.1/threadkeeping-ledger-chimeric-prototype-v0.1.html";
const sourceBearingRoleLanguageAllowlist = [
  {
    path: threadkeepingSourcePath,
    fragment: "Recorded by: human collaborator + AI collaborator; recorded at `2026-06-20T12:00:00Z`;",
  },
  {
    path: threadkeepingSourcePath,
    fragment: "Recorded by: human collaborator + AI collaborator; recorded at `2026-06-20T12:05:00Z`;",
  },
  {
    path: threadkeepingSourcePath,
    fragment: "Recorded by: human collaborator + AI collaborator; recorded at `2026-06-20T12:15:00Z`;",
  },
  {
    path: threadkeepingSourcePath,
    fragment: "Recorded by: AI collaborator; recorded at `2026-06-20T12:20:00Z`;",
  },
  {
    path: threadkeepingSourcePath,
    fragment: "Recorded by: human collaborator + AI collaborator; recorded at `2026-06-20T12:25:00Z`;",
  },
  {
    path: threadkeepingSourcePath,
    fragment: '\"recordedBy\": \"human collaborator + AI collaborator\", \"recordedAt\": \"2026-06-20T12:00:00Z\"',
  },
  {
    path: threadkeepingSourcePath,
    fragment: '\"recordedBy\": \"human collaborator + AI collaborator\", \"recordedAt\": \"2026-06-20T12:05:00Z\"',
  },
  {
    path: threadkeepingSourcePath,
    fragment: '\"recordedBy\": \"human collaborator + AI collaborator\", \"recordedAt\": \"2026-06-20T12:15:00Z\"',
  },
  {
    path: threadkeepingSourcePath,
    fragment: '\"recordedBy\": \"AI collaborator\", \"recordedAt\": \"2026-06-20T12:20:00Z\"',
  },
  {
    path: threadkeepingSourcePath,
    fragment: '\"recordedBy\": \"human collaborator + AI collaborator\", \"recordedAt\": \"2026-06-20T12:25:00Z\"',
  },
];

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

function packageSources(route) {
  return [
    route.source_file,
    ...(route.package_files ?? []).map(file => file.source_file),
    ...(route.navigation_files ?? []).map(file => file.source_file),
  ].filter(Boolean);
}

async function currentPublicRoleLanguageSources() {
  const [primaryManifest, coreManifest, canvasManifest, contextCoreManifest] = await Promise.all([
    readFile(primaryManifestPath, "utf8").then(JSON.parse),
    readFile(coreIframeManifestPath, "utf8").then(JSON.parse),
    readFile(canvasIframeManifestPath, "utf8").then(JSON.parse),
    readFile(contextCoreManifestPath, "utf8").then(JSON.parse),
  ]);
  const directCanvasPrefix = "context-canvas-project-surface/context-canvas/";
  const selectedVisitorSources = primaryManifest.files
    .filter(file => {
      const path = file.source_path;
      const selectedCanvasSource =
        path.startsWith(directCanvasPrefix) &&
        /\.(?:html|js|json|jsonld|svg)$/u.test(path);
      const selectedVisualSource =
        (path.startsWith("context-canvas-project-surface/img/") ||
          path.startsWith("context-canvas-project-surface/site-readings/")) &&
        /\.(?:html|js|json|jsonld|svg)$/u.test(path);
      return selectedCanvasSource || selectedVisualSource;
    })
    .map(file => file.source_path);
  const coreSources = coreManifest.routes.flatMap(route => {
    const sourceRoot =
      route.source_root ??
      "core-architectures-chimeric-prototype-current-pack-v0.1";
    return packageSources(route).map(path =>
      path.startsWith(`${sourceRoot}/`) ? path : `${sourceRoot}/${path}`,
    );
  });
  const canvasSources = canvasManifest.routes.flatMap(packageSources);
  const contextCoreSources = contextCoreManifest.prototypes.flatMap(prototype => [
    `${contextCoreRoot}/${prototype.file}`,
    prototype.compatibility_route
      ? `${contextCoreRoot}/${prototype.compatibility_route}`
      : null,
  ]).filter(Boolean);
  contextCoreSources.push(`${contextCoreRoot}/strategy-canvas-context-workbench-v0.2.js`);

  return [...new Set([
    ...selectedVisitorSources,
    ...coreSources,
    ...canvasSources,
    ...contextCoreSources,
  ])].sort();
}

function sourceBearingRoleException(path, source, match) {
  return sourceBearingRoleLanguageAllowlist.find(entry => {
    if (entry.path !== path) return false;
    const fragmentStart = source.indexOf(entry.fragment);
    if (fragmentStart < 0) return false;
    const fragmentEnd = fragmentStart + entry.fragment.length;
    return match.index >= fragmentStart && match.index + match[0].length <= fragmentEnd;
  });
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

test("current public source owners name generative-system roles precisely", async () => {
  const findings = [];
  const exceptionUses = new Map(
    sourceBearingRoleLanguageAllowlist.map(entry => [entry.fragment, 0]),
  );

  for (const sourcePath of await currentPublicRoleLanguageSources()) {
    const source = await readFile(resolve(repositoryRoot, sourcePath), "utf8");
    for (const match of source.matchAll(genericPersonLikeSystemRole)) {
      const exception = sourceBearingRoleException(sourcePath, source, match);
      if (exception) {
        exceptionUses.set(exception.fragment, exceptionUses.get(exception.fragment) + 1);
        continue;
      }
      const line = source.slice(0, match.index).split("\n").length;
      findings.push(`${sourcePath}:${line}: ${match[0]}`);
    }
  }

  assert.deepEqual(
    findings,
    [],
    "Generic person-like system roles need a contextual technical referent or one exact source-fidelity exception",
  );
  assert.deepEqual(
    [...exceptionUses.values()],
    sourceBearingRoleLanguageAllowlist.map(() => 1),
    "Every source-fidelity exception must identify exactly one dated evidence occurrence",
  );
});

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);
const compactCaseBriefSourcePath = resolve(
  repositoryRoot,
  "context-canvas-project-surface/data/debrief-case-briefs.source.html",
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

const tableReadingRoute = "readable-tables-reusable-evidence.html";
// Complete title carriers bind the exception to reviewed HTML and metadata
// boundaries. Prose fragments independently name the space or latitude in view.
const tableReadingRoomContexts = [
  ...[
    "<title>Give the Comparison Room</title>",
    "<title>Give the Comparison Room | Context Canvas</title>",
    '<meta property="og:title" content="Give the Comparison Room">',
    '<meta name="twitter:title" content="Give the Comparison Room">',
    '"headline": "Give the Comparison Room"',
    '<a class="skip-link" href="#main-content">Skip to Give the Comparison Room</a>',
    "<h1>Give the Comparison Room</h1>",
    '<h1 class="txt-h1 h1-spaced h1-hero">Give the Comparison Room</h1>',
    "<p>Context Canvas / Give the Comparison Room</p>",
  ].map(fragment => ["comparison space", fragment]),
  ["display space", "That relationship deserves room, whether the table appears on a wide display"],
  ["embedding space", "the child document could receive substantially less room than the surrounding browser window suggested"],
  ["latitude", "review capacity and room to report a partial result"],
].map(([sense, fragment]) => ({
  sense,
  fragment: fragment.toLowerCase(),
  roomOffset: fragment.search(/\brooms?\b/iu),
}));

const catalogRoomContexts = [
  ...[
    "<h2>Give the Comparison Room</h2>",
    '<h2 class="txt-h2">Give the Comparison Room</h2>',
    '"name": "Give the Comparison Room"',
  ].map(fragment => ["article title", fragment]),
  ["comparison space", "a useful comparison needs room"],
].map(([sense, fragment]) => ({
  sense,
  fragment: fragment.toLowerCase(),
  roomOffset: fragment.search(/\brooms?\b/iu),
}));

const aiSystemsRoomContexts = [
  ...[
    '"name": "Give the Comparison Room"',
    '"headline": "Give the Comparison Room"',
    '<h2 id="table-reading-title" class="txt-h2">Give the Comparison Room</h2>',
  ].map(fragment => ["linked article title", fragment]),
].map(([sense, fragment]) => ({
  sense,
  fragment: fragment.toLowerCase(),
  roomOffset: fragment.search(/\brooms?\b/iu),
}));

const reportedConsequenceColumnHeader =
  /<th scope="col"(?: data-label="Reported consequence")?>Reported consequence<\/th>/u;

// The Review Routing graph retains this exact source node label across its
// machine-readable contract and equivalent semantic reading. Each bounded
// carrier earns an independent occurrence so new generic role language still
// receives the corpus-wide review below.
const sourceBearingRoleLanguageAllowlist = [
  {
    path: "context-canvas-project-surface/context-canvas/who-to-believe-reviews-platform.html",
    fragment: "<strong>AI assistant.</strong> Symfony PHP monolith",
  },
  {
    path: "context-canvas-project-surface/context-canvas/who-to-believe-reviews-platform.html",
    fragment: "Member web front end → AI assistant. Symfony PHP monolith",
  },
  {
    path: "context-canvas-project-surface/context-canvas/who-to-believe-reviews-platform.html",
    fragment: "Eligibility rules → AI assistant. Symfony PHP monolith",
  },
  {
    path: "context-canvas-project-surface/context-canvas/who-to-believe-reviews-platform.html",
    fragment: '\"id\":\"assistant\",\"label\":\"AI assistant\",\"col\":3',
  },
];

async function readCanvasFile(path) {
  return readFile(resolve(canvasRoot, path), "utf8");
}

function compactAccountByRoute(source, route) {
  const startToken = `<article data-case-brief-source="${route}">`;
  const start = source.indexOf(startToken);
  if (start === -1) return "";
  const next = source.indexOf("<article data-case-brief-source=", start + startToken.length);
  return source.slice(start, next === -1 ? source.length : next);
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

function classifyRoomUses(source, contexts = tableReadingRoomContexts) {
  const text = source.replace(/\s+/gu, " ").toLowerCase();
  return [...text.matchAll(/\brooms?\b/gu)].map(match => {
    const context = contexts.find(({ fragment, roomOffset }) => {
      const start = match.index - roomOffset;
      return start >= 0 && text.startsWith(fragment, start);
    });
    return context?.sense ?? null;
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

test("room language retains reviewed runtime, classroom, citation, space, and latitude contexts", async () => {
  assert.deepEqual(
    await topLevelHtmlFilesContaining(/\brooms?\b/iu),
    [
      "ai-systems.html",
      "debriefs.html",
      "grammar-family.html",
      "hiring-surfaces-talent-agent-intake.html",
      "prompt-side-conditions-practice.html",
      tableReadingRoute,
    ],
  );

  const [runtime, citation, classroom, tableReading, catalog, aiSystems] = await Promise.all([
    readCanvasFile("grammar-family.html"),
    readCanvasFile("hiring-surfaces-talent-agent-intake.html"),
    readCanvasFile("prompt-side-conditions-practice.html"),
    readCanvasFile(tableReadingRoute),
    readCanvasFile("debriefs.html"),
    readCanvasFile("ai-systems.html"),
  ]);
  assert.match(runtime, /shared room or document/u);
  assert.match(runtime, /per-room coordination/u);
  assert.match(citation, /Pink Elephant[^<]+LLM’s Room/u);
  assert.match(classroom, /Room configuration:/u);

  const senses = classifyRoomUses(tableReading);
  assert.equal(senses.includes(null), false, "Each table-reading room use has a reviewed context");
  assert.deepEqual(
    [...new Set(senses)].sort(),
    ["comparison space", "embedding space", "latitude"],
    "The article retains the independently reviewed space and latitude meanings",
  );

  const catalogSenses = classifyRoomUses(catalog, catalogRoomContexts);
  assert.equal(catalogSenses.includes(null), false, "Each catalog room use belongs to its reviewed article context");
  assert.deepEqual(
    [...new Set(catalogSenses)].sort(),
    ["article title", "comparison space"],
    "The catalog retains the accepted article title and its comparison-space description",
  );

  const aiSystemsSenses = classifyRoomUses(aiSystems, aiSystemsRoomContexts);
  assert.equal(aiSystemsSenses.includes(null), false, "Each AI Systems room use is an exact canonical-title carrier");
  assert.deepEqual(
    aiSystemsSenses,
    ["linked article title", "linked article title", "linked article title"],
    "AI Systems retains the linked article name, headline, and visible heading",
  );
});

for (const { name, source, expected, contexts } of [
  {
    name: "repeated title and whitespace retain the reviewed comparison context",
    source: "<title>Give the Comparison Room</title><h1>Give the\nComparison Room</h1>",
    expected: ["comparison space", "comparison space"],
  },
  {
    name: "reviewed space remains distinct from an added organizational shorthand",
    source: "<p>That relationship deserves room, whether the table appears on a wide display.</p><p>The room decides the release.</p>",
    expected: ["display space", null],
  },
  {
    name: "a same-count wording replacement requires its own context review",
    source: "<p>The room decides what the table should display.</p>",
    expected: [null],
  },
  {
    name: "an accepted latitude fragment covers only its own occurrence",
    source: "<p>Review capacity and room to report a partial result matters. The room approves.</p>",
    expected: ["latitude", null],
  },
  {
    name: "word boundaries preserve unrelated vocabulary",
    source: "<p>A classroom keeps a broom nearby.</p>",
    expected: [],
  },
  {
    name: "catalog title and space description retain occurrence-specific boundaries",
    source: "<h2>Give the Comparison Room</h2><p>A useful comparison needs room.</p><p>The room decides the release.</p>",
    expected: ["article title", "comparison space", null],
    contexts: catalogRoomContexts,
  },
  {
    name: "all reviewed article senses remain distinct from an added title-prefix authority claim",
    source: [
      "<h1>Give the Comparison Room</h1>",
      "<p>That relationship deserves room, whether the table appears on a wide display.</p>",
      "<p>The child document could receive substantially less room than the surrounding browser window suggested.</p>",
      "<p>Review capacity and room to report a partial result.</p>",
      "<p>Give the Comparison Room authority to approve the release.</p>",
    ].join("\n"),
    expected: ["comparison space", "display space", "embedding space", "latitude", null],
  },
  {
    name: "all reviewed catalog senses remain distinct from an added title-prefix authority claim",
    source: "<h2>Give the Comparison Room</h2><p>A useful comparison needs room.</p><p>Give the Comparison Room authority to approve the release.</p>",
    expected: ["article title", "comparison space", null],
    contexts: catalogRoomContexts,
  },
  {
    name: "complete article metadata values retain the reviewed title across whitespace",
    source: [
      "<title>Give the Comparison Room | Context Canvas</title>",
      '<meta property="og:title" content="Give the\nComparison Room">',
      '<meta name="twitter:title" content="Give the Comparison\tRoom">',
      '<script type="application/ld+json">{"headline":\n"Give the Comparison Room"}</script>',
    ].join("\n"),
    expected: ["comparison space", "comparison space", "comparison space", "comparison space"],
  },
  {
    name: "title and metadata extensions receive their own context review",
    source: [
      "<title>Give the Comparison Room authority to approve the release.</title>",
      "<h1>Give the Comparison Room authority to approve the release.</h1>",
      '<meta property="og:title" content="Give the Comparison Room authority to approve the release.">',
      '<meta name="twitter:title" content="Give the Comparison Room authority to approve the release.">',
      '<script type="application/ld+json">{"headline": "Give the Comparison Room authority to approve the release."}</script>',
    ].join("\n"),
    expected: [null, null, null, null, null],
  },
  {
    name: "complete catalog metadata retains the reviewed title across whitespace",
    source: '<script type="application/ld+json">{"name":\n"Give the\tComparison Room"}</script>',
    expected: ["article title"],
    contexts: catalogRoomContexts,
  },
  {
    name: "catalog heading and metadata extensions receive their own context review",
    source: '<h2>Give the Comparison Room authority to approve the release.</h2><script type="application/ld+json">{"name": "Give the Comparison Room authority to approve the release."}</script>',
    expected: [null, null],
    contexts: catalogRoomContexts,
  },
  {
    name: "AI Systems linked-article carriers retain the exact canonical title",
    source: [
      '"name": "Give the Comparison Room"',
      '"headline": "Give the Comparison Room"',
      '<h2 id="table-reading-title" class="txt-h2">Give the Comparison Room</h2>',
    ].join("\n"),
    expected: ["linked article title", "linked article title", "linked article title"],
    contexts: aiSystemsRoomContexts,
  },
  {
    name: "AI Systems title extensions require their own context review",
    source: [
      '"name": "Give the Comparison Room authority to approve the release."',
      '"headline": "Give the Comparison Room authority to approve the release."',
      '<h2 id="table-reading-title" class="txt-h2">Give the Comparison Room authority to approve the release.</h2>',
    ].join("\n"),
    expected: [null, null, null],
    contexts: aiSystemsRoomContexts,
  },
]) {
  test(`table-reading room classification: ${name}`, () => {
    assert.deepEqual(classifyRoomUses(source, contexts), expected);
  });
}

for (const { name, source, expected } of [
  { name: "native column header", source: '<th scope="col">Reported consequence</th>', expected: true },
  { name: "labeled native column header", source: '<th scope="col" data-label="Reported consequence">Reported consequence</th>', expected: true },
  { name: "row header retains its different role", source: '<th scope="row" data-label="Reported consequence">Reported consequence</th>', expected: false },
  { name: "data cell retains its different role", source: '<td scope="col" data-label="Reported consequence">Reported consequence</td>', expected: false },
  { name: "supplemental label leaves native scope unspecified", source: '<th data-label="Reported consequence">Reported consequence</th>', expected: false },
  { name: "heading text carries the intended meaning", source: '<th scope="col" data-label="Reported consequence">Guaranteed outcome</th>', expected: false },
]) {
  test(`reported-consequence header contract: ${name}`, () => {
    assert.equal(reportedConsequenceColumnHeader.test(source), expected);
  });
}

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

  const compactSource = await readFile(compactCaseBriefSourcePath, "utf8");
  const routes = [
    "choose-your-player-humatics.html",
    "fmi-clinical-trial-coordination.html",
    "fmi-lims-eln-replatforming.html",
    "genomic-viewer-replatforming.html",
    "three-way-comparative-return.html",
    "who-to-believe-reviews-platform.html",
  ];
  for (const route of routes) {
    const html = compactAccountByRoute(compactSource, route);
    assert.ok(html, `${route} should have one compact account`);
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
    const html = compactAccountByRoute(compactSource, route);
    assert.ok(html, `${route} should have one compact account`);
    assert.match(
      html,
      /<dt>Scope and role<\/dt>\s*<dd>This principal-level teaching reconstruction reads/u,
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
  assert.match(
    compactAccountByRoute(compactSource, "three-way-comparative-return.html"),
    /I worked across design, product strategy, and engineering/u,
  );

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
  assert.match(about, reportedConsequenceColumnHeader);
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

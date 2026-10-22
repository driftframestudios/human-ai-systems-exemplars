import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { assertImmutableSkillCoordinate } from "../prompt-capsule-skill-coordinate.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const coreRoot = resolve(repositoryRoot, "core-architectures-chimeric-prototype-current-pack-v0.1");
const contextRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1",
);
const narrativeRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/narrative-capsule-composer",
);
const manifestName = "core-architectures-chimeric-prototype-manifest-v0.1.json";
const currentFile = "core-architecture-family-index-chimeric-prototype-v0.1.6.html";
const historicalFile = "core-architecture-family-index-chimeric-prototype-v0.1.5.html";
const currentDigests = {
  canonical: "27e88170074498e609e01dfd2c240ad3eedc96d126ea01bcd58e058c690c1264",
  context: "7b963ce14f42a91fb5d664b432b24c3447da58c1ed3114106d5b1abdb562f214",
  narrative: "16fb306df3c7f72c77003755aa2e3a9019e6157fa6afa5d50001133883d0a994",
};
const historicalDigests = {
  canonical: "8796c2818aff5a5b2f18d4d4682a09b114419b259f0e83564d8773655ab07950",
  context: "0ddb68d1e0b343d75b121a67133b7dc6428d8de778c3b7fef8c5c0e7a5c023f9",
  narrative: "48257f53e593cd7fcd57ec5c1e5dcd6ae0b889c6fb0170b3920851cd6a3e8ee5",
};
const skillRevision = "17560183cc066196233173aa8cc030ee25fbd517";
const skillCoordinates = [
  [".agents/skills/repository-reentry/SKILL.md", "211cdbd293c260e95e62d3bc7ed5cb4d6d9ca3debd560a28a74b52364a1bfa90"],
  [".agents/skills/source-authority-mapping/SKILL.md", "706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5"],
  [".agents/skills/practitioner-probe/SKILL.md", "348ea113a75af3487a420e2075aa199297673aca0ba0a69e5a19d6c5a463776c"],
];
const loopCoordinates = [
  ["repository-reentry", "https://schemas.radiantnull.com/collaboration/#repository-reentry"],
  ["skill-from-receiving-use", "https://schemas.radiantnull.com/collaboration/#skill-from-receiving-use"],
];
const contextReplacements = [
  [
    'href="../context-canvas-project-surface/context-canvas/core-architectures-orientation-index.html"',
    'href="../../../core-architectures-orientation-index.html"',
    1,
  ],
  [
    "Anchored dimension matrix / editable profile field",
    "Anchored dimension matrix / collaborative profile field",
    2,
  ],
  [
    "The group needs interpretable dimensions, human readings, good-enough thresholds, desired support, and a reviewable handoff.",
    "The group needs interpretable dimensions, sealed readings, visible spread, reversible scenarios, and a reviewable handoff.",
    2,
  ],
  [
    "strategy-canvas-chimeric-prototype-v0.2.5.html",
    "strategy-canvas-chimeric-prototype-v0.2.3.html",
    2,
  ],
  [
    "fnv1a32-utf8:cb6ac5b4",
    "fnv1a32-utf8:a7d1a2b2",
    1,
  ],
];

const sha256 = value => createHash("sha256").update(value).digest("hex");

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function staticPrompt(html) {
  const match = html.match(/<pre[^>]*id="aiPrompt"[^>]*>([\s\S]*?)<\/pre>/u);
  assert.ok(match, "the source carries an authored plain Prompt Capsule baseline");
  return match[1]
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#039;", "'")
    .replaceAll("&amp;", "&");
}

function seedFrom(html) {
  const match = html.match(/const seed = (\{[\s\S]*?\n\});\nlet state =/u);
  assert.ok(match, "the Family Index publishes its authored source state");
  return JSON.parse(match[1]);
}

function applyExactReplacements(source, replacements) {
  let result = source;
  for (const [from, to, expectedCount] of replacements) {
    assert.equal(result.split(from).length - 1, expectedCount, `expected ${expectedCount} owned replacements for ${from}`);
    result = result.replaceAll(from, to);
  }
  return result;
}

function authoredFingerprint(markdown) {
  const match = markdown.match(/^- Fingerprint: `(fnv1a32-utf8:[0-9a-f]{8})`$/mu);
  assert.ok(match, "the authored handoff carries a represented-state fingerprint");
  return match[1];
}

test("Family Index v0.1.6 retains its three declared projections and immutable v0.1.5 history", async () => {
  const paths = {
    canonical: resolve(coreRoot, currentFile),
    context: resolve(contextRoot, currentFile),
    narrative: resolve(narrativeRoot, "companions", currentFile),
  };
  const historicalPaths = {
    canonical: resolve(coreRoot, historicalFile),
    context: resolve(contextRoot, historicalFile),
    narrative: resolve(narrativeRoot, "companions", historicalFile),
  };
  const [current, historical, coreManifest, contextManifest, narrativeManifest, localManifest] = await Promise.all([
    Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await readFile(path)])),
    Promise.all(Object.entries(historicalPaths).map(async ([key, path]) => [key, await readFile(path)])),
    json(resolve(coreRoot, manifestName)),
    json(resolve(contextRoot, manifestName)),
    json(resolve(narrativeRoot, "narrative-capsules-chimeric-prototype-manifest-v0.1.json")),
    json(resolve(contextRoot, "context-canvas-local-manifest-v0.1.json")),
  ]);
  const currentByKind = Object.fromEntries(current);
  const historicalByKind = Object.fromEntries(historical);
  const coreEntry = coreManifest.prototypes.find(({ id }) => id === "core-architecture-family-index");
  const contextEntry = contextManifest.prototypes.find(({ id }) => id === "core-architecture-family-index");

  assert.deepEqual([coreEntry.file, coreEntry.version], [currentFile, "0.1.6"]);
  assert.deepEqual([contextEntry.file, contextEntry.version], [currentFile, "0.1.6"]);
  assert.equal(coreEntry.previous.at(-1), historicalFile);
  assert.equal(contextEntry.previous.at(-1), historicalFile);
  assert.equal(coreEntry.size_bytes, currentByKind.canonical.byteLength);
  assert.equal(contextEntry.size_bytes, currentByKind.context.byteLength);
  for (const [kind, source] of Object.entries(currentByKind)) assert.equal(sha256(source), currentDigests[kind]);
  for (const [kind, source] of Object.entries(historicalByKind)) assert.equal(sha256(source), historicalDigests[kind]);
  assert.equal(new Set(Object.values(currentDigests)).size, 3, "each path-owned adaptation has its own immutable digest");
  assert.equal(new Set(Object.values(historicalDigests)).size, 3, "the three accepted historical projections remain independently bound");

  const canonical = currentByKind.canonical.toString("utf8");
  const context = currentByKind.context.toString("utf8");
  const narrative = currentByKind.narrative.toString("utf8");
  assert.equal(
    applyExactReplacements(canonical, contextReplacements),
    context,
    "the Context projection differs only by its four owned adaptations and their derived fingerprint",
  );
  assert.equal(
    context.replace(
      'href="../../../core-architectures-orientation-index.html"',
      'href="../../../../core-architectures-orientation-index.html"',
    ),
    narrative,
    "the Narrative companion differs only by its deeper owned orientation route",
  );
  assert.ok(localManifest.divergence.changedPaths.includes(currentFile));
  assert.ok(narrativeManifest.files.companions.includes(`companions/${currentFile}`));
  assert.ok(!narrativeManifest.files.companions.includes(`companions/${historicalFile}`));
});

test("Family Index publishes one complete no-JavaScript handoff and frozen source API", async () => {
  const [canonical, context, narrative, coreManifest, loopRegistry] = await Promise.all([
    readFile(resolve(coreRoot, currentFile), "utf8"),
    readFile(resolve(contextRoot, currentFile), "utf8"),
    readFile(resolve(narrativeRoot, "companions", currentFile), "utf8"),
    json(resolve(coreRoot, manifestName)),
    readFile(resolve(repositoryRoot, "schemas/collaboration/index.html"), "utf8"),
  ]);
  const plain = staticPrompt(canonical);
  const contextPlain = staticPrompt(context);
  const narrativePlain = staticPrompt(narrative);
  const state = seedFrom(canonical);
  const contextState = seedFrom(context);

  assert.notEqual(contextPlain, plain, "the Context handoff represents its accepted Strategy Canvas adaptation");
  assert.equal(narrativePlain, contextPlain, "the Narrative route adaptation sits outside the authored handoff");
  assert.equal(authoredFingerprint(plain), "fnv1a32-utf8:cb6ac5b4");
  assert.equal(authoredFingerprint(contextPlain), "fnv1a32-utf8:a7d1a2b2");
  assert.equal(authoredFingerprint(narrativePlain), authoredFingerprint(contextPlain));
  assert.match(canonical, /<noscript><p class="notice">The complete default plain Markdown remains available below\./u);
  assert.match(canonical, /<fieldset[^>]+data-prompt-view-control[^>]+hidden>/u);
  assert.match(canonical, /data-prompt-actions[^>]+hidden/u);
  assert.match(canonical, /PROMPT_CAPSULE_CONTRACT\s*=\s*'prompt-capsule\/0\.1\.0'/u);
  assert.match(canonical, /PROMPT_CAPSULE_STATE_CONTRACT\s*=\s*'core-architecture-family-index-state\.v0\.1'/u);
  assert.match(canonical, /PROMPT_CAPSULE_SOURCE_VERSION\s*=\s*'0\.1\.6'/u);
  assert.match(canonical, /window\.coreArchitectureFamilyIndex\s*=\s*Object\.freeze\(\{/u);
  for (const member of [
    "getState",
    "importState",
    "promptCapsuleStateProjection",
    "promptCapsuleFingerprint",
    "promptCapsule",
    "promptCapsuleMarkdown",
    "getPromptCapsuleView",
  ]) assert.match(canonical, new RegExp(`(?:^|,)\\s*${member}\\s*(?::|(?=,|$))`, "mu"));

  const sections = [
    "## Purpose and target",
    "## Relevant context and inputs",
    "## Working state",
    "## Boundaries and human-held decisions",
    "## Requested return",
    "## Related loops",
    "## Evidence and recovery",
  ];
  let preceding = -1;
  for (const section of sections) {
    const position = plain.indexOf(section);
    assert.ok(position > preceding, `${section} follows the preceding capsule section`);
    preceding = position;
  }
  assert.match(plain, /^# Prompt Capsule: Core Architecture Family Index\n/u);
  assert.match(plain, /- Source: `core-architecture-family-index@0\.1\.6`/u);
  assert.match(plain, /- View: `plain`/u);
  assert.doesNotMatch(plain, /## Skill assistance/u);
  assert.deepEqual(
    [state.families.length, state.cards.length, state.entry_routes.length, state.recovery_routes.length],
    [7, 20, 20, 19],
  );
  assert.deepEqual(
    [contextState.families.length, contextState.cards.length, contextState.entry_routes.length, contextState.recovery_routes.length],
    [7, 20, 20, 19],
  );
  assert.match(plain, /Registry summary: `7` families, `20` cards, `20` entry routes, `19` recovery routes/u);
  for (const family of state.families) assert.ok(plain.includes(`(\`${family.id}\`)`), `plain Markdown represents family ${family.id}`);
  for (const card of state.cards) {
    assert.ok(plain.includes(`(\`${card.id}\`)`), `plain Markdown represents card ${card.id}`);
    assert.ok(plain.includes(`\`${card.file}\``), `plain Markdown represents ${card.file}`);
  }
  for (const route of state.entry_routes) assert.ok(plain.includes(`\`${route.id}\``), `plain Markdown represents entry route ${route.id}`);
  for (const route of state.recovery_routes) assert.ok(plain.includes(`${route.geometry} ·`), `plain Markdown represents recovery route ${route.geometry}`);
  for (const view of state.view_state.views) assert.ok(plain.includes(`(\`${view.id}\`)`), `plain Markdown represents focus arrangement ${view.id}`);

  const currentCoordinates = new Map(coreManifest.prototypes.map(({ id, file }) => [id, file]));
  currentCoordinates.delete("core-architecture-family-index");
  assert.deepEqual(new Map(state.cards.map(({ id, file }) => [id, file])), currentCoordinates);
  const contextStrategy = contextState.cards.find(({ id }) => id === "strategy-canvas");
  assert.deepEqual(
    [contextStrategy.shape, contextStrategy.use, contextStrategy.file],
    [
      "Anchored dimension matrix / collaborative profile field",
      "The group needs interpretable dimensions, sealed readings, visible spread, reversible scenarios, and a reviewable handoff.",
      "strategy-canvas-chimeric-prototype-v0.2.3.html",
    ],
  );
  assert.ok(canonical.includes(skillRevision));
  for (const [path, digest] of skillCoordinates) {
    assertImmutableSkillCoordinate(skillRevision, path, digest);
    assert.ok(canonical.includes(path));
    assert.ok(canonical.includes(digest));
  }
  for (const [id, url] of loopCoordinates) {
    assert.match(canonical, new RegExp(`data-related-loop-id="${id}"`, "u"));
    assert.ok(canonical.includes(url));
    assert.match(loopRegistry, new RegExp(`id="${id}"`, "u"));
  }
});

test("Family Index current route provides exact Markdown download capability", async () => {
  const routeManifest = await json(resolve(coreRoot, "public-iframe-route-manifest-v1.json"));
  const route = routeManifest.routes.find(({ id }) => id === "core-architecture-family-index");

  assert.deepEqual([route.source_file, route.source_version], [currentFile, "0.1.6"]);
  assert.deepEqual(route.carrier_policy, {
    sandbox_tokens: [
      "allow-downloads",
      "allow-popups",
      "allow-popups-to-escape-sandbox",
      "allow-scripts",
    ],
    permissions_policy: ["clipboard-write"],
    held_capabilities: [],
  });
  assert.equal(route.receiver_standing, "context_adapted");
  assert.equal(route.activation_standing, "eligible");
});

test("Prompt Capsule inventory recognizes the complete current adoption set", async () => {
  const [readme, inventory] = await Promise.all([
    readFile(resolve(repositoryRoot, "prompt-capsules/README.md"), "utf8"),
    readFile(resolve(repositoryRoot, "prompt-capsules/prompt-capsule-inventory.v0.1.0.md"), "utf8"),
  ]);
  const inventoryBoundary = "\n## Projections, receivers, and recovery inputs\n";
  const boundaryIndex = inventory.indexOf(inventoryBoundary);
  assert.notEqual(boundaryIndex, -1, "the inventory keeps its current/projection boundary");
  const currentInventory = inventory.slice(0, boundaryIndex);
  const projectionInventory = inventory.slice(boundaryIndex);

  for (const document of [readme, currentInventory]) {
    assert.match(document, /Core Architecture Family Index\s+v0\.1\.6/u);
  }
  assert.match(currentInventory, /Visualization Fidelity Atlas[\s\S]*?implements `prompt-capsule\/0\.1\.0`/u);
  const declared = currentInventory.match(/current population contains (\d+) source artifacts/u);
  const adopted = currentInventory.match(/(\d+) current\s+adoptions\. This completes the observed population/u);
  const heading = currentInventory.match(/## Current source artifacts[^\n\d]*(\d+)/u);
  assert.ok(declared && adopted && heading, "the current population has a summary, heading and adoption statement");
  const tableCount = [...currentInventory.matchAll(/^\|[^|]+\|\s*(\d+)\s*\|/gmu)]
    .reduce((sum, match) => sum + Number(match[1]), 0);
  assert.ok(tableCount > 0, "the current-artifact table supplies the counted population");
  assert.deepEqual([Number(declared[1]), Number(adopted[1]), Number(heading[1])],
    [tableCount, tableCount, tableCount], "current inventory counts agree with its source classes");
  const readmePopulation = readme.match(/all (\d+) source artifacts implement `prompt-capsule\/0\.1\.0`/u);
  assert.ok(readmePopulation, "the README names its current adoption total");
  assert.equal(Number(readmePopulation[1]), tableCount, "the README agrees with the current inventory");
  for (const name of ["Open Lesson Field", "Cross-Functional Investment Model Studio", "Initiative Costing Calculator", "Visualization Fidelity Atlas"]) {
    assert.ok(currentInventory.includes(`| ${name} | 1 |`), `${name} retains its standalone source membership`);
    assert.ok(readme.includes(name), `${name} remains discoverable in the README`);
  }
  assert.match(projectionInventory, /Core Architecture Family Index v0\.1\.5 and earlier[\s\S]*?remain comparison/u);
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const atlasRoot = resolve(repositoryRoot, "visualization-fidelity-atlas-bundle-v0.1");
const atlasFile = "visualization-fidelity-atlas-chimeric-prototype-v0.1.html";
const skillRevision = "eaaf4d2d6419aca726568c169db5009d9ce7dce4";
const skillCoordinates = [
  [
    ".agents/skills/evidence-grounded-research-spike/SKILL.md",
    "844fc0c6b0b956b81984a2c2d47d9252abadeb0a6554c5ef4734d0f1e5f4b531",
  ],
  [
    ".agents/skills/source-authority-mapping/SKILL.md",
    "706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5",
  ],
  [
    ".agents/skills/stateful-artifact-behavior-contracts/SKILL.md",
    "596f139100a448139c7c4ceb2dc6d1b470dc86ff19df4ed68a9ac765005f576a",
  ],
];
const loopCoordinates = [
  ["visitor-surface-change", "https://schemas.radiantnull.com/collaboration/#visitor-surface-change"],
  ["repository-reentry", "https://schemas.radiantnull.com/collaboration/#repository-reentry"],
];

const sha256 = value => createHash("sha256").update(value).digest("hex");

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function authoredPlainPrompt(source) {
  const match = source.match(/<(textarea|pre)\b[^>]*id="aiPrompt"[^>]*>([\s\S]*?)<\/\1>/u);
  assert.ok(match, "the Atlas source carries its complete authored plain Markdown");
  return match[2]
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#039;", "'")
    .replaceAll("&amp;", "&");
}

function assertSectionsInOrder(markdown) {
  const sections = [
    "## Purpose and target",
    "## Relevant context and inputs",
    "## Working state",
    "## Boundaries and human-held decisions",
    "## Requested return",
    "## Related loops",
    "## Evidence and recovery",
  ];
  let previous = -1;
  for (const section of sections) {
    const position = markdown.indexOf(section);
    assert.ok(position > previous, `${section} follows the preceding Prompt Capsule section`);
    previous = position;
  }
}

function stringArrayConstant(source, name) {
  const match = source.match(new RegExp(`const ${name} = Object\\.freeze\\(\\[([\\s\\S]*?)\\]\\);`, "u"));
  assert.ok(match, `${name} remains an inspectable frozen list`);
  return [...match[1].matchAll(/"([^"]+)"/gu)].map(([, value]) => value);
}

test("Visualization Fidelity Atlas publishes one source-bound Prompt Capsule contract", async () => {
  const [source, manifest, collaborationRegistry] = await Promise.all([
    readFile(resolve(atlasRoot, atlasFile), "utf8"),
    json(resolve(atlasRoot, "visualization-fidelity-atlas-manifest-v0.1.json")),
    readFile(resolve(repositoryRoot, "schemas/collaboration/index.html"), "utf8"),
  ]);
  const plain = authoredPlainPrompt(source);

  assert.equal(manifest.files.prototype, atlasFile);
  assert.match(
    manifest.interaction_contract.selection,
    /Every exemplar action names its exact example and position, and pressed state identifies the current example\./u,
  );
  for (const identity of [
    "visualization-fidelity-atlas@0.1",
    "visualization-fidelity-atlas-state.v0.1",
    "prompt-capsule/0.1.0",
    "visualization-fidelity-atlas/current-selection",
  ]) assert.ok(source.includes(identity), `the Atlas source carries ${identity}`);

  assert.match(source, /id="promptCapsuleHeading"/u);
  assert.match(source, /id="promptViewDescription"/u);
  assert.match(source, /id="downloadPromptBtn"/u);
  assert.match(source, /data-prompt-actions/u);
  assert.match(source, /data-prompt-view-control/u);
  assert.match(source, /<input\b(?=[^>]*\bvalue="plain")(?=[^>]*\bdata-prompt-view(?:\s|=|>))[^>]*>/u);
  assert.match(source, /<input\b(?=[^>]*\bvalue="skill-assisted")(?=[^>]*\bdata-prompt-view(?:\s|=|>))[^>]*>/u);
  assert.match(source, /data-prompt-related-loops/u);
  assert.match(source, /text\/markdown;charset=utf-8/u);
  assert.match(
    source,
    /link\.download = `\$\{PROMPT_CAPSULE_SOURCE_ID\}\.prompt-capsule\.r\$\{PROMPT_CAPSULE_SOURCE_VERSION\}\.\$\{promptCapsuleView\}\.md`/u,
  );
  assert.match(source, /<noscript>[\s\S]*complete default plain Markdown remains available below/iu);

  assert.match(source, /window\.visualizationFidelityAtlas\s*=\s*Object\.freeze\(\{/u);
  for (const member of [
    "version",
    "stateContract",
    "contract",
    "views",
    "skillRevision",
    "skills",
    "relatedLoops",
    "getState",
    "exportState",
    "importState",
    "promptCapsuleStateProjection",
    "promptCapsuleFingerprint",
    "promptCapsule",
    "promptCapsuleMarkdown",
    "getPromptCapsuleView",
  ]) assert.match(source, new RegExp(`(?:^|,)\\s*${member}\\s*(?::|(?=,|$))`, "mu"));

  assert.match(source, /fnv1a32-utf8:/u);
  const materialViewFields = [
    "selectedMoveId",
    "selectedShapeId",
    "selectedExemplarId",
    "selectedVisualFormId",
    "showReserved",
    "audience",
    "uncertaintyRequired",
    "aiIngestion",
  ];
  assert.deepEqual(
    stringArrayConstant(source, "PROMPT_CAPSULE_VIEW_FIELDS"),
    materialViewFields,
    "the fingerprint represents exactly the eight material Atlas view fields",
  );

  assertSectionsInOrder(plain);
  assert.match(plain, /^# Prompt Capsule: Visualization Fidelity Atlas$/mu);
  assert.match(plain, /- Source: `visualization-fidelity-atlas@0\.1`/u);
  assert.match(plain, /- State: `visualization-fidelity-atlas-state\.v0\.1`/u);
  assert.match(plain, /- Capsule: `visualization-fidelity-atlas\/current-selection`/u);
  assert.match(plain, /- View: `plain`/u);
  assert.doesNotMatch(plain, /## Skill assistance/u);

  assert.ok(source.includes(skillRevision));
  for (const [path, digest] of skillCoordinates) {
    assert.equal(sha256(await readFile(resolve(repositoryRoot, path))), digest);
    assert.ok(source.includes(path), `the Atlas source names ${path}`);
    assert.ok(source.includes(digest), `the Atlas source pins ${path}`);
  }
  for (const [id, url] of loopCoordinates) {
    assert.match(source, new RegExp(`data-related-loop-id="${id}"`, "u"));
    assert.ok(source.includes(url), `the Atlas source links ${id}`);
    assert.match(collaborationRegistry, new RegExp(`id="${id}"`, "u"));
  }
});

test("Atlas download capability and the current inventory agree across receivers", async () => {
  const [routeManifest, carrier, readme, inventory, qualitativeSelector] = await Promise.all([
    json(resolve(repositoryRoot, "iframe-route-families/canvas/public-iframe-route-manifest-v1.json")),
    readFile(resolve(repositoryRoot, "context-canvas-project-surface/context-canvas/visualization-fidelity-atlas.html"), "utf8"),
    readFile(resolve(repositoryRoot, "prompt-capsules/README.md"), "utf8"),
    readFile(resolve(repositoryRoot, "prompt-capsules/prompt-capsule-inventory.v0.1.0.md"), "utf8"),
    readFile(resolve(repositoryRoot, "collaboration/shared-machinery/visualization-fidelity-selector/index.html"), "utf8"),
  ]);
  const route = routeManifest.routes.find(({ id }) => id === "visualization-fidelity-atlas");
  assert.ok(route, "the Canvas route manifest carries the Atlas receiver");
  assert.equal(route.source_file, `visualization-fidelity-atlas-bundle-v0.1/${atlasFile}`);
  assert.deepEqual(route.carrier_policy, {
    sandbox_tokens: [
      "allow-downloads",
      "allow-popups",
      "allow-popups-to-escape-sandbox",
      "allow-scripts",
    ],
    permissions_policy: ["clipboard-write"],
  });

  const iframe = carrier.match(/<iframe\b[^>]*src="https:\/\/iframes\.vik\.guru\/v1\/canvas\/visualization-fidelity-atlas\/"[^>]*>/u)?.[0];
  assert.ok(iframe, "the Context Canvas reading carries the stable Atlas iframe route");
  assert.match(
    iframe,
    /sandbox="allow-downloads allow-popups allow-popups-to-escape-sandbox allow-scripts"/u,
  );
  assert.match(iframe, /allow="clipboard-write"/u);

  const currentInventory = inventory.split("\n## Projections, receivers, and recovery inputs\n", 1)[0];
  assert.notEqual(currentInventory, inventory, "the inventory keeps its current/projection boundary");
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
  assert.ok(currentInventory.includes("| Visualization Fidelity Atlas | 1 |"), "the Atlas retains its standalone source membership");
  assert.match(inventory, /\| Visualization Fidelity Atlas \| 1 \|[\s\S]*?implements `prompt-capsule\/0\.1\.0`/u);
  assert.doesNotMatch(`${readme}\n${inventory}`, /27 of 28|27 current adoptions|The remaining source/u);

  assert.match(qualitativeSelector, /<title>Visual Fidelity Atlas · Qualitative Selector<\/title>/u);
  assert.match(qualitativeSelector, /The parent reading carries the complete static mapping/u);
  assert.doesNotMatch(qualitativeSelector, /prompt-capsule\/0\.1\.0/u);
  assert.match(inventory, /\| Adjacent qualitative selector \|/u);
  assert.match(inventory, new RegExp(`sits beside the ${tableCount}-source population without becoming another capsule source`, "u"));
});

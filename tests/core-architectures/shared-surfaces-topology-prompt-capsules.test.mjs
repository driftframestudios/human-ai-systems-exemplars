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
const skillRevision = "34a0047c4d6400aaa9f44e16e52640555f6a3129";

const skills = new Map([
  ["bounded-support-routing", [".agents/skills/bounded-support-routing/SKILL.md", "80dff2f88bc919500d9557a0ff67210e68cbdf1c69bbe63ac29b93662f9bd402"]],
  ["context-canvas-surface-reading", [".agents/skills/context-canvas-surface-reading/SKILL.md", "b0861479adc855a26c4c2d7a62d49a436f44a803e3c28a406da28c26b83d7188"]],
  ["schema-contract-authoring", [".agents/skills/schema-contract-authoring/SKILL.md", "46f58b788bd8c04c60fc71ae0dc33e108f9392e98a18e88ef131917500e8dfe9"]],
  ["source-authority-mapping", [".agents/skills/source-authority-mapping/SKILL.md", "706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5"]],
  ["stateful-artifact-behavior-contracts", [".agents/skills/stateful-artifact-behavior-contracts/SKILL.md", "596f139100a448139c7c4ceb2dc6d1b470dc86ff19df4ed68a9ac765005f576a"]],
]);

const artifacts = [
  {
    id: "cross-channel-blueprint",
    sourceId: "shared-surface-priority-map",
    name: "Shared Surface Priority Map",
    version: "0.1.4",
    currentFile: "shared-surface-priority-map-chimeric-prototype-v0.1.4.html",
    historicalFile: "shared-surface-priority-map-chimeric-prototype-v0.1.3.html",
    currentDigest: "1b9b716fdc04fae93194219a890bb82ff96fe9b922ada75d887607eddff91d2f",
    historicalDigest: "eaabb4b4fdd0e8950f83b819b085a8f2e2f30c07020336cb2d35bc11c3ac844f",
    stateContract: "shared-surface-priority-map-state.v0.1",
    apiName: "sharedSurfacePriorityMap",
    promptId: "aiPrompt",
    loops: ["visitor-surface-change", "repository-reentry"],
    skills: ["source-authority-mapping", "context-canvas-surface-reading", "stateful-artifact-behavior-contracts"],
    directCarriers: ["context-canvas-project-surface/context-canvas/concept-nursery.html"],
    receiverStanding: "context_adapted",
    activationStanding: "eligible",
    materialPhrases: ["Every accepted stage, surface, priority cell, shared asset, and focus view", "asset-claim-source-map"],
  },
  {
    id: "service-design-blueprint",
    sourceId: "service-design-blueprint",
    name: "Service-design Blueprint",
    version: "0.2.6",
    currentFile: "service-design-blueprint-chimeric-prototype-v0.2.6.html",
    historicalFile: "service-design-blueprint-chimeric-prototype-v0.2.5.html",
    currentDigest: "bdb1a46d62917e3ad217a273df492e378a96465c1f99dafd977b776af8fc6012",
    historicalDigest: "55ca3885f661c5a69258d8b82fc72f07b7274cfd94a970f11c5ce387daff1268",
    stateContract: "service-design-blueprint-state.v0.2",
    apiName: "serviceDesignBlueprint",
    promptId: "promptOut",
    loops: ["visitor-surface-change", "repository-reentry"],
    skills: ["source-authority-mapping", "bounded-support-routing", "stateful-artifact-behavior-contracts"],
    directCarriers: [
      "context-canvas-project-surface/context-canvas/planning-surface.html",
      "context-canvas-project-surface/context-canvas/ai-systems.html",
    ],
    receiverStanding: "context_adapted",
    activationStanding: "eligible",
    materialPhrases: ["Every accepted stage, lane, cell, shared asset, and focus view", "asset-claim-source-map"],
  },
  {
    id: "ai-systems-service-blueprint",
    sourceId: "ai-systems-service-blueprint",
    name: "AI Systems Service Blueprint",
    version: "0.1.5",
    currentFile: "ai-systems-service-blueprint-chimeric-prototype-v0.1.5.html",
    historicalFile: "ai-systems-service-blueprint-chimeric-prototype-v0.1.4.html",
    currentDigest: "938433bc7167ecd83bf92836f84ab7683163f01908397fe0ddcfdf11aa37eeb0",
    historicalDigest: "f7918b9f31de120dbfc1031cd80df874e71a0d2a3b767e2972cc2c6c722e072a",
    stateContract: "ai-systems-service-blueprint-state.v0.1",
    apiName: "aiSystemsServiceBlueprint",
    promptId: "promptOut",
    loops: ["repository-reentry", "visitor-surface-change"],
    skills: ["source-authority-mapping", "stateful-artifact-behavior-contracts", "schema-contract-authoring"],
    directCarriers: ["context-canvas-project-surface/context-canvas/ai-systems.html"],
    receiverStanding: "reserve",
    activationStanding: "eligible",
    materialPhrases: ["Every accepted stage, layer, cell, component, and focus view", "component-evidence-summary-orchestrator"],
  },
  {
    id: "software-architecture-views",
    sourceId: "software-architecture-views",
    name: "Software Architecture Views",
    version: "0.1.4",
    currentFile: "software-architecture-views-chimeric-prototype-v0.1.4.html",
    historicalFile: "software-architecture-views-chimeric-prototype-v0.1.3.html",
    currentDigest: "ae639340af83d5522352854d1133ce1dace48934ba38e474b9c38bfd0120fb38",
    historicalDigest: "c1fdce7212aa0995cd5e862b9cee00baad5ddfd1b199ca4f3f063488c81ebe0c",
    stateContract: "software-architecture-views-state.v0.1",
    apiName: "softwareArchitectureViews",
    promptId: "aiPrompt",
    loops: ["repository-reentry", "visitor-surface-change"],
    skills: ["source-authority-mapping", "stateful-artifact-behavior-contracts", "schema-contract-authoring"],
    directCarriers: [],
    receiverStanding: "reserve",
    activationStanding: "eligible",
    materialPhrases: ["Every accepted architecture view, attachment, and focus view", "att-review-state-service"],
  },
];

const sha256 = value => createHash("sha256").update(value).digest("hex");

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function staticPrompt(html, id) {
  const match = html.match(new RegExp(`<pre[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/pre>`, "u"));
  assert.ok(match, `${id} carries an authored plain Prompt Capsule baseline`);
  return match[1]
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#039;", "'")
    .replaceAll("&amp;", "&");
}

for (const artifact of artifacts) {
  test(`${artifact.name} ${artifact.version} retains one immutable source identity across its Context projection`, async () => {
    const [source, projection, historical, historicalProjection, coreManifest, contextManifest] = await Promise.all([
      readFile(resolve(coreRoot, artifact.currentFile)),
      readFile(resolve(contextRoot, artifact.currentFile)),
      readFile(resolve(coreRoot, artifact.historicalFile)),
      readFile(resolve(contextRoot, artifact.historicalFile)),
      json(resolve(coreRoot, manifestName)),
      json(resolve(contextRoot, manifestName)),
    ]);
    const current = coreManifest.prototypes.find(({ id }) => id === artifact.id);
    const contextCurrent = contextManifest.prototypes.find(({ id }) => id === artifact.id);

    assert.deepEqual([current.file, current.version], [artifact.currentFile, artifact.version]);
    assert.deepEqual([contextCurrent.file, contextCurrent.version], [artifact.currentFile, artifact.version]);
    assert.equal(current.previous.at(-1), artifact.historicalFile);
    assert.equal(contextCurrent.previous.at(-1), artifact.historicalFile);
    assert.equal(current.size_bytes, source.byteLength);
    assert.equal(contextCurrent.size_bytes, projection.byteLength);
    assert.equal(sha256(source), artifact.currentDigest);
    assert.equal(sha256(projection), artifact.currentDigest);
    assert.equal(sha256(historical), artifact.historicalDigest);
    assert.equal(sha256(historicalProjection), artifact.historicalDigest);
    assert.ok(source.equals(projection), "current source and Context projection agree byte for byte");
    assert.ok(historical.equals(historicalProjection), "accepted history remains byte-identical across projections");
  });

  test(`${artifact.name} carries a complete static handoff, exact skill coordinates, and route policy`, async () => {
    const [html, projectionHtml, loopRegistry, routeManifest] = await Promise.all([
      readFile(resolve(coreRoot, artifact.currentFile), "utf8"),
      readFile(resolve(contextRoot, artifact.currentFile), "utf8"),
      readFile(resolve(repositoryRoot, "schemas/collaboration/index.html"), "utf8"),
      json(resolve(coreRoot, "public-iframe-route-manifest-v1.json")),
    ]);
    const plain = staticPrompt(html, artifact.promptId);
    const route = routeManifest.routes.find(({ id }) => id === artifact.id);
    const api = html.match(new RegExp(`window\\.${artifact.apiName}\\s*=\\s*Object\\.freeze\\(\\{([\\s\\S]*?)\\}\\);`, "u"));

    assert.equal(staticPrompt(projectionHtml, artifact.promptId), plain);
    assert.match(html, /Prompt Capsule · Markdown/u);
    assert.match(html, /PROMPT_CAPSULE_CONTRACT\s*=\s*['"]prompt-capsule\/0\.1\.0['"]/u);
    assert.ok(html.includes(artifact.stateContract));
    assert.ok(html.includes(skillRevision));
    assert.match(html, /function canonicalValue\(/u);
    assert.match(html, /JSON\.stringify\(canonicalValue\(/u);
    assert.match(html, /data-prompt-view-control[^>]+hidden/u);
    assert.match(html, /data-prompt-actions[^>]+hidden/u);
    assert.match(html, /data-prompt-related-loops/u);
    assert.ok(api, `${artifact.apiName} exposes a frozen public API`);
    for (const member of ["getState", "importState", "promptCapsuleStateProjection", "promptCapsuleFingerprint", "promptCapsule", "promptCapsuleMarkdown", "getPromptCapsuleView"]) {
      assert.match(api[1], new RegExp(`(?:^|,)\\s*${member}\\s*(?::|(?=,|$))`, "u"));
    }

    const orderedSections = [
      "## Purpose and target",
      "## Relevant context and inputs",
      "## Working state",
      "## Boundaries and human-held decisions",
      "## Requested return",
      "## Related loops",
      "## Evidence and recovery",
    ];
    assert.ok(plain.startsWith(`# Prompt Capsule: ${artifact.name}\n`));
    assert.ok(plain.includes(`- Source: \`${artifact.sourceId}@${artifact.version}\``));
    assert.match(plain, /- View: `plain`/u);
    assert.doesNotMatch(plain, /## Skill assistance/u);
    let previousSectionIndex = -1;
    for (const section of orderedSections) {
      const sectionIndex = plain.indexOf(section);
      assert.ok(sectionIndex > previousSectionIndex, `${section} follows the preceding contract section`);
      previousSectionIndex = sectionIndex;
    }
    for (const phrase of artifact.materialPhrases) assert.ok(plain.includes(phrase), `the plain handoff carries ${phrase}`);

    for (const loopId of artifact.loops) {
      assert.match(html, new RegExp(`data-related-loop-id="${loopId}"`, "u"));
      assert.match(loopRegistry, new RegExp(`id="${loopId}"`, "u"));
    }
    for (const skillId of artifact.skills) {
      const [path, expectedDigest] = skills.get(skillId);
      assertImmutableSkillCoordinate(skillRevision, path, expectedDigest);
      assert.ok(html.includes(path));
      assert.ok(html.includes(expectedDigest));
    }

    assert.deepEqual([route.source_file, route.source_version], [artifact.currentFile, artifact.version]);
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
    assert.equal(route.receiver_standing, artifact.receiverStanding);
    assert.equal(route.activation_standing, artifact.activationStanding);
  });

  test(`${artifact.name} current identity reaches its direct, family-index, and Narrative carriers`, async () => {
    const [targetRegistry, narrativeComposer, coreFamilyIndex, contextFamilyIndex, familyCompanion, ...directCarriers] = await Promise.all([
      json(resolve(narrativeRoot, "core-architecture-target-pair-registry.v0.1.json")),
      readFile(resolve(narrativeRoot, "narrative-capsules-chimeric-prototype-v0.1.html"), "utf8"),
      readFile(resolve(coreRoot, "core-architecture-family-index-chimeric-prototype-v0.1.6.html"), "utf8"),
      readFile(resolve(contextRoot, "core-architecture-family-index-chimeric-prototype-v0.1.6.html"), "utf8"),
      readFile(resolve(narrativeRoot, "companions/core-architecture-family-index-chimeric-prototype-v0.1.6.html"), "utf8"),
      ...artifact.directCarriers.map(path => readFile(resolve(repositoryRoot, path), "utf8")),
    ]);
    const card = targetRegistry.cards.find(({ id }) => id === artifact.id);

    assert.ok(card, `${artifact.id} remains represented in the Narrative target registry`);
    assert.equal(card.prototypeRef, artifact.currentFile);
    assert.ok(narrativeComposer.includes(`"prototypeRef":"${artifact.currentFile}"`));
    for (const familyIndex of [coreFamilyIndex, contextFamilyIndex, familyCompanion]) assert.ok(familyIndex.includes(artifact.currentFile));
    for (const carrier of directCarriers) assert.ok(carrier.includes(artifact.currentFile));
  });
}

test("Shared Surface Priority Map history carries aligned Tyler Tate provenance", async () => {
  const articleUrl = "http://tylertate.com/blog/ux/2012/02/21/cross-channel-ia-blueprint.html";
  const diagramUrl = "http://tylertate.com/resources/images/2012-02-21/cross-channel-blueprint.png";
  const licenseUrl = "https://creativecommons.org/licenses/by/3.0/";

  for (const version of ["0.1.1", "0.1.2", "0.1.3", "0.1.4"]) {
    const file = `shared-surface-priority-map-chimeric-prototype-v${version}.html`;
    const [source, projection] = await Promise.all([
      readFile(resolve(coreRoot, file), "utf8"),
      readFile(resolve(contextRoot, file), "utf8"),
    ]);

    assert.equal(projection, source, `${file} keeps one provenance-bearing source across both owners`);
    for (const coordinate of [articleUrl, diagramUrl, licenseUrl]) assert.ok(source.includes(coordinate));
    for (const field of ["article_title", "diagram_url", "isBasedOn", "creditText", "schema:Article", "schema:ImageObject"]) {
      assert.ok(source.includes(field), `${file} carries ${field} in its model or JSON-LD mapping`);
    }
    assert.doesNotMatch(source, /not verified in this session|uploaded in-session reference image/u);
    assert.match(source, /Creative Commons Attribution 3\.0 Unported License/u);
    assert.match(source, /adapts that visual grammar/u);
  }
});

test("Shared Surfaces and Topology advances the current inventory as one complete family", async () => {
  const inventory = await readFile(resolve(repositoryRoot, "prompt-capsules/prompt-capsule-inventory.v0.1.0.md"), "utf8");
  const currentInventory = inventory.split("\n## Projections, receivers, and recovery inputs\n", 1)[0];
  assert.notEqual(currentInventory, inventory, "the inventory keeps its current/projection boundary");
  for (const phrase of [
    "Shared Surface Priority Map v0.1.4",
    "Service-design Blueprint v0.2.6",
    "AI Systems Service Blueprint v0.1.5",
    "Software Architecture Views v0.1.4",
  ]) assert.ok(currentInventory.includes(phrase));
  const declared = currentInventory.match(/current population contains (\d+) source artifacts/u);
  const adopted = currentInventory.match(/(\d+) current\s+adoptions\. This completes the observed population/u);
  const heading = currentInventory.match(/## Current source artifacts[^\n\d]*(\d+)/u);
  assert.ok(declared && adopted && heading, "the current population has a summary, heading and adoption statement");
  const tableCount = [...currentInventory.matchAll(/^\|[^|]+\|\s*(\d+)\s*\|/gmu)]
    .reduce((sum, match) => sum + Number(match[1]), 0);
  assert.ok(tableCount > 0, "the current-artifact table supplies the counted population");
  assert.deepEqual([Number(declared[1]), Number(adopted[1]), Number(heading[1])],
    [tableCount, tableCount, tableCount], "current inventory counts agree with its source classes");
  assert.match(currentInventory, /family members, which complete the current[\s\S]*?Shared Surfaces and Topology[\s\S]*?famil(?:y|ies)/u);
});

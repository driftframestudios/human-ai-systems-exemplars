import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

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
    currentDigest: "a631352d54d8cd736932e8045001718c1872ca2be99ceef4fcf820781231ad3e",
    historicalDigest: "06817b6fc7312c32f6c303b1ea562c43c2bf8436a6214b73e03e9b6cb14ec08a",
    stateContract: "shared-surface-priority-map-state.v0.1",
    apiName: "sharedSurfacePriorityMap",
    promptId: "aiPrompt",
    loops: ["visitor-surface-change", "repository-reentry"],
    skills: ["source-authority-mapping", "context-canvas-surface-reading", "stateful-artifact-behavior-contracts"],
    directCarriers: ["context-canvas-project-surface/context-canvas/concept-nursery.html"],
    receiverStanding: "byte_identical",
    activationStanding: "provenance_review",
    materialPhrases: ["Every accepted stage, surface, priority cell, shared asset, and focus view", "asset-claim-source-map"],
  },
  {
    id: "service-design-blueprint",
    sourceId: "service-design-blueprint",
    name: "Service-design Blueprint",
    version: "0.2.5",
    currentFile: "service-design-blueprint-chimeric-prototype-v0.2.5.html",
    historicalFile: "service-design-blueprint-chimeric-prototype-v0.2.4.html",
    currentDigest: "55ca3885f661c5a69258d8b82fc72f07b7274cfd94a970f11c5ce387daff1268",
    historicalDigest: "2641264f0e3471fe24d4e26482229646e80ed26c1ede1a5f804dd1e53bb5bdfd",
    stateContract: "service-design-blueprint-state.v0.2",
    apiName: "serviceDesignBlueprint",
    promptId: "promptOut",
    loops: ["visitor-surface-change", "repository-reentry"],
    skills: ["source-authority-mapping", "bounded-support-routing", "stateful-artifact-behavior-contracts"],
    directCarriers: [
      "context-canvas-project-surface/context-canvas/planning-surface.html",
      "context-canvas-project-surface/context-canvas/ai-systems.html",
    ],
    receiverStanding: "byte_identical",
    activationStanding: "visitor_copy_review",
    materialPhrases: ["Every accepted stage, lane, cell, shared asset, and focus view", "asset-claim-source-map"],
  },
  {
    id: "ai-systems-service-blueprint",
    sourceId: "ai-systems-service-blueprint",
    name: "AI Systems Service Blueprint",
    version: "0.1.4",
    currentFile: "ai-systems-service-blueprint-chimeric-prototype-v0.1.4.html",
    historicalFile: "ai-systems-service-blueprint-chimeric-prototype-v0.1.3.html",
    currentDigest: "f7918b9f31de120dbfc1031cd80df874e71a0d2a3b767e2972cc2c6c722e072a",
    historicalDigest: "4acdc3d83532449f30decc5685c98061a982905b61e4e550d5731ba2d1b43706",
    stateContract: "ai-systems-service-blueprint-state.v0.1",
    apiName: "aiSystemsServiceBlueprint",
    promptId: "promptOut",
    loops: ["repository-reentry", "visitor-surface-change"],
    skills: ["source-authority-mapping", "stateful-artifact-behavior-contracts", "schema-contract-authoring"],
    directCarriers: ["context-canvas-project-surface/context-canvas/ai-systems.html"],
    receiverStanding: "reserve",
    activationStanding: "navigation_observation",
    materialPhrases: ["Every accepted stage, layer, cell, component, and focus view", "component-evidence-summary-orchestrator"],
  },
  {
    id: "software-architecture-views",
    sourceId: "software-architecture-views",
    name: "Software Architecture Views",
    version: "0.1.4",
    currentFile: "software-architecture-views-chimeric-prototype-v0.1.4.html",
    historicalFile: "software-architecture-views-chimeric-prototype-v0.1.3.html",
    currentDigest: "13ee65ff0602260847bd8375d9ea264067e6ca117c64f37acaba333653aa6da1",
    historicalDigest: "c1fdce7212aa0995cd5e862b9cee00baad5ddfd1b199ca4f3f063488c81ebe0c",
    stateContract: "software-architecture-views-state.v0.1",
    apiName: "softwareArchitectureViews",
    promptId: "aiPrompt",
    loops: ["repository-reentry", "visitor-surface-change"],
    skills: ["source-authority-mapping", "stateful-artifact-behavior-contracts", "schema-contract-authoring"],
    directCarriers: [],
    receiverStanding: "reserve",
    activationStanding: "reader_job_required",
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
      assert.equal(sha256(await readFile(resolve(repositoryRoot, path))), expectedDigest);
      assert.ok(html.includes(path));
      assert.ok(html.includes(expectedDigest));
    }

    assert.deepEqual([route.source_file, route.source_version], [artifact.currentFile, artifact.version]);
    assert.deepEqual(route.carrier_policy, {
      sandbox_tokens: ["allow-downloads", "allow-scripts"],
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
      readFile(resolve(coreRoot, "core-architecture-family-index-chimeric-prototype-v0.1.4.html"), "utf8"),
      readFile(resolve(contextRoot, "core-architecture-family-index-chimeric-prototype-v0.1.4.html"), "utf8"),
      readFile(resolve(narrativeRoot, "companions/core-architecture-family-index-chimeric-prototype-v0.1.4.html"), "utf8"),
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

test("Shared Surfaces and Topology advances the current inventory as one complete family", async () => {
  const inventory = await readFile(resolve(repositoryRoot, "prompt-capsules/prompt-capsule-inventory.v0.1.0.md"), "utf8");
  for (const phrase of [
    "Shared Surface Priority Map v0.1.4",
    "Service-design Blueprint v0.2.5",
    "AI Systems Service Blueprint v0.1.4",
    "Software Architecture Views v0.1.4",
  ]) assert.ok(inventory.includes(phrase));
  assert.match(inventory, /26 current[\s\S]*?adoptions\. The remaining two/u);
  assert.match(inventory, /accepted sources complete the current[\s\S]*?Shared Surfaces and Topology[\s\S]*?famil(?:y|ies)/u);
});

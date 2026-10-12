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
const skillRevision = "2efdf98ccc2f2478cf1a833eb1e29d898566e725";

const skills = new Map([
  ["context-canvas-surface-reading", [".agents/skills/context-canvas-surface-reading/SKILL.md", "b0861479adc855a26c4c2d7a62d49a436f44a803e3c28a406da28c26b83d7188"]],
  ["practitioner-probe", [".agents/skills/practitioner-probe/SKILL.md", "348ea113a75af3487a420e2075aa199297673aca0ba0a69e5a19d6c5a463776c"]],
  ["repository-reentry", [".agents/skills/repository-reentry/SKILL.md", "211cdbd293c260e95e62d3bc7ed5cb4d6d9ca3debd560a28a74b52364a1bfa90"]],
  ["source-authority-mapping", [".agents/skills/source-authority-mapping/SKILL.md", "706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5"]],
  ["stateful-artifact-behavior-contracts", [".agents/skills/stateful-artifact-behavior-contracts/SKILL.md", "596f139100a448139c7c4ceb2dc6d1b470dc86ff19df4ed68a9ac765005f576a"]],
  ["supportive-change-writing", [".agents/skills/supportive-change-writing/SKILL.md", "fca40001b28ba6e07c0b122da39a054eae723b4f0df514c805684c94001d2e2c"]],
]);

const artifacts = [
  {
    id: "poda",
    name: "PODA",
    version: "0.1.5",
    currentFile: "poda-chimeric-prototype-v0.1.5.html",
    historicalFile: "poda-chimeric-prototype-v0.1.4.html",
    currentDigest: "2f7e09dbf18059644b10c77f31b167b2c85ea0716afc897d6c7429525512e261",
    contextDigest: "cb97e9b5e7c05d5cca0ce339b754a7bb4a6c66652c8b201199f5841af0e0252e",
    historicalDigest: "adf425f5e7b0f22fe03c9df58c874b2f995457de933e9dc777fb8ef5bfd46704",
    historicalContextDigest: "cffd9df254680e13de1d6609c518926f6b8fc80dff56c972ea796fa896b4fe26",
    stateContract: "poda-state.v0.1",
    apiName: "poda",
    promptId: "aiPrompt",
    loops: ["repository-reentry", "skill-from-receiving-use"],
    skills: ["supportive-change-writing", "source-authority-mapping", "stateful-artifact-behavior-contracts"],
    directCarriers: ["context-canvas-project-surface/context-canvas/poda.html"],
    receiverStanding: "context_adapted",
    activationStanding: "eligible",
    adaptation: {
      canonical: "../context-canvas-project-surface/context-canvas/poda.html",
      context: "../../../poda.html",
    },
    completeness(plain) {
      assert.equal([...plain.matchAll(/^### Objective:/gmu)].length, 4);
      assert.equal([...plain.matchAll(/^### Discoverable:/gmu)].length, 6);
      assert.equal([...plain.matchAll(/^### Activity:/gmu)].length, 6);
      assert.match(plain, /4 objectives \(4 visible\); 6 discoverables \(6 visible\); 6 activities \(6 visible\)/u);
    },
  },
  {
    id: "alignment-worksheet",
    name: "Alignment Worksheet",
    version: "0.1.4",
    currentFile: "alignment-worksheet-chimeric-prototype-v0.1.4.html",
    historicalFile: "alignment-worksheet-chimeric-prototype-v0.1.3.html",
    currentDigest: "6c9ae958983899a288c0fbf2eaa869688f29b74fbf7b44364ebc1c76bd1d9805",
    historicalDigest: "d95b9dea95e92ab24baf3c286e8ac15d3166056d06b9ee4293b34a99f0400c23",
    stateContract: "alignment-worksheet-state.v0.1",
    apiName: "alignmentWorksheet",
    promptId: "promptBox",
    loops: ["repository-reentry", "skill-from-receiving-use"],
    skills: ["supportive-change-writing", "practitioner-probe", "stateful-artifact-behavior-contracts"],
    directCarriers: ["context-canvas-project-surface/context-canvas/ai-systems.html"],
    receiverStanding: "reserve",
    activationStanding: "eligible",
    completeness(plain) {
      assert.equal([...plain.matchAll(/^### \d\. /gmu)].length, 6);
      assert.equal([...plain.matchAll(/^### Option:/gmu)].length, 4);
      assert.equal([...plain.matchAll(/^- Probability of what:/gmu)].length, 4);
      assert.equal([...plain.matchAll(/^- Most uncertain blank:/gmu)].length, 4);
      assert.match(plain, /6 premise blanks, 4 options, and 1 focus arrangement/u);
    },
  },
  {
    id: "impact-map",
    name: "Impact Map",
    version: "0.1.5",
    currentFile: "impact-map-chimeric-prototype-v0.1.5.html",
    historicalFile: "impact-map-chimeric-prototype-v0.1.4.html",
    currentDigest: "5841ac539623bba1a9688ba036bf9aca11f154b1ab8e9fc11da38412cf0f61d8",
    historicalDigest: "f4d87c54b4113c15076c0dd2e7516859beccf225d354a1723f16c1c4abd31797",
    stateContract: "impact-map-state.v0.1",
    apiName: "impactMap",
    promptId: "promptOut",
    loops: ["visitor-surface-change", "repository-reentry"],
    skills: ["source-authority-mapping", "context-canvas-surface-reading", "stateful-artifact-behavior-contracts"],
    directCarriers: [],
    receiverStanding: "reserve",
    activationStanding: "eligible",
    completeness(plain) {
      assert.equal([...plain.matchAll(/^## Actor:/gmu)].length, 4);
      assert.equal([...plain.matchAll(/^### Impact /gmu)].length, 4);
      assert.equal([...plain.matchAll(/^#### .+ \(`disc-/gmu)].length, 7);
      assert.match(plain, /Every accepted actor, impact, and discoverable appears below in represented order/u);
      assert.match(plain, /- ID: `goal-001`/u);
    },
  },
  {
    id: "context-tree",
    name: "Context Tree",
    version: "0.1.7",
    currentFile: "context-tree-chimeric-prototype-v0.1.7.html",
    historicalFile: "context-tree-chimeric-prototype-v0.1.6.html",
    currentDigest: "5bde5711a902673686104681b9852447a78431b45f75c1ae58109943a48a2fc1",
    historicalDigest: "c9b4474b0f8b514fd73363e5b5133cf4222e39973b1e7cf32ff640ed9603d7f7",
    stateContract: "context-tree-state.v0.1",
    apiName: "contextTree",
    promptId: "promptOut",
    loops: ["repository-reentry", "skill-from-receiving-use"],
    skills: ["source-authority-mapping", "repository-reentry", "stateful-artifact-behavior-contracts"],
    directCarriers: [
      "context-canvas-project-surface/context-canvas/fmi-lims-eln-replatforming.html",
      "context-canvas-project-surface/context-canvas/who-to-believe-reviews-platform.html",
    ],
    receiverStanding: "reserve",
    activationStanding: "eligible",
    completeness(plain) {
      assert.equal([...plain.matchAll(/^- `group-/gmu)].length, 5);
      assert.equal([...plain.matchAll(/^- `row-/gmu)].length, 5);
      assert.equal([...plain.matchAll(/^### .+ \(`cell-/gmu)].length, 25);
      assert.equal([...plain.matchAll(/^- Status:/gmu)].length, 25);
      assert.equal([...plain.matchAll(/^- Handoff:/gmu)].length, 25);
      assert.match(plain, /every group, row, and context cell remains available/u);
    },
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

function occurrences(value, needle) {
  return value.split(needle).length - 1;
}

for (const artifact of artifacts) {
  test(`${artifact.name} ${artifact.version} retains its declared source relationship and immutable identity`, async () => {
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
    assert.equal(sha256(projection), artifact.contextDigest ?? artifact.currentDigest);
    assert.equal(sha256(historical), artifact.historicalDigest);
    assert.equal(sha256(historicalProjection), artifact.historicalContextDigest ?? artifact.historicalDigest);

    if (artifact.adaptation) {
      const canonical = source.toString("utf8");
      const adapted = projection.toString("utf8");
      assert.equal(occurrences(canonical, artifact.adaptation.canonical), 1);
      assert.equal(occurrences(adapted, artifact.adaptation.context), 1);
      assert.equal(
        canonical.replace(artifact.adaptation.canonical, artifact.adaptation.context),
        adapted,
        "PODA differs only by its declared local companion route",
      );
    } else {
      assert.ok(source.equals(projection), "current source and Context projection agree byte for byte");
      assert.ok(historical.equals(historicalProjection), "accepted history remains byte-identical across projections");
    }
  });

  test(`${artifact.name} carries a complete static plain capsule and runtime projection contract`, async () => {
    const [html, projectionHtml, loopRegistry, routeManifest] = await Promise.all([
      readFile(resolve(coreRoot, artifact.currentFile), "utf8"),
      readFile(resolve(contextRoot, artifact.currentFile), "utf8"),
      readFile(resolve(repositoryRoot, "schemas/collaboration/index.html"), "utf8"),
      json(resolve(coreRoot, "public-iframe-route-manifest-v1.json")),
    ]);
    const plain = staticPrompt(html, artifact.promptId);
    const projectedPlain = staticPrompt(projectionHtml, artifact.promptId);
    const route = routeManifest.routes.find(({ id }) => id === artifact.id);
    const api = html.match(new RegExp(`window\\.${artifact.apiName}\\s*=\\s*Object\\.freeze\\(\\{([\\s\\S]*?)\\}\\);`, "u"));

    assert.equal(projectedPlain, plain, "the static no-JavaScript fallback agrees across receiving copies");
    assert.match(html, /PROMPT_CAPSULE_CONTRACT\s*=\s*'prompt-capsule\/0\.1\.0'/u);
    assert.ok(html.includes(`PROMPT_CAPSULE_STATE_CONTRACT = '${artifact.stateContract}'`) || html.includes(`PROMPT_CAPSULE_STATE_CONTRACT='${artifact.stateContract}'`));
    assert.ok(html.includes(`PROMPT_CAPSULE_SOURCE_VERSION = '${artifact.version}'`) || html.includes(`PROMPT_CAPSULE_SOURCE_VERSION='${artifact.version}'`));
    assert.match(html, /<fieldset[^>]+data-prompt-view-control[^>]+hidden>/u);
    assert.match(html, /type="radio"[^>]+value="plain"[^>]+checked/u);
    assert.match(html, /type="radio"[^>]+value="skill-assisted"/u);
    assert.match(html, /data-prompt-actions[^>]+hidden/u);
    assert.match(html, /\.textContent\s*=\s*promptCapsuleMarkdown\(promptCapsuleView\)/u);
    assert.ok(api, `${artifact.apiName} exposes a frozen public API`);
    assert.ok(
      api[1].includes(`version:'${artifact.version}'`)
        || api[1].includes(`version: '${artifact.version}'`)
        || /version:\s*PROMPT_CAPSULE_SOURCE_VERSION/u.test(api[1]),
      "the public API reports the accepted source version",
    );
    assert.match(api[1], /stateContract:\s*PROMPT_CAPSULE_STATE_CONTRACT/u);
    assert.match(api[1], /contract:\s*PROMPT_CAPSULE_CONTRACT/u);
    assert.match(api[1], /views:\s*PROMPT_CAPSULE_VIEWS/u);
    assert.match(api[1], /skillRevision:\s*PROMPT_CAPSULE_SKILL_REVISION/u);
    assert.match(api[1], /skills:\s*PROMPT_CAPSULE_SKILLS/u);
    assert.match(api[1], /relatedLoops:\s*PROMPT_CAPSULE_RELATED_LOOPS/u);
    assert.match(api[1], /promptCapsule:\s*\(\)\s*=>\s*promptCapsuleMarkdown\('plain'\)/u);
    assert.ok(html.includes(skillRevision));

    const orderedSections = [
      "## Purpose and target",
      "## Relevant context and inputs",
      "## Working state",
      "## Boundaries and human-held decisions",
      "## Requested return",
      "## Related loops",
      "## Evidence and recovery",
    ];
    assert.match(plain, new RegExp(`^# Prompt Capsule: ${artifact.name}\\n`, "u"));
    assert.match(plain, /- Contract: `prompt-capsule\/0\.1\.0`/u);
    assert.ok(plain.includes(`- Source: \`${artifact.id}@${artifact.version}\``));
    assert.match(plain, /- View: `plain`/u);
    assert.doesNotMatch(plain, /## Skill assistance/u);
    let previousSectionIndex = -1;
    for (const section of orderedSections) {
      const sectionIndex = plain.indexOf(section);
      assert.ok(sectionIndex >= 0, `the authored fallback includes ${section}`);
      assert.ok(sectionIndex > previousSectionIndex, `${section} follows the preceding contract section`);
      previousSectionIndex = sectionIndex;
    }
    artifact.completeness(plain);

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

  test(`${artifact.name} current identity reaches its direct and Narrative carriers`, async () => {
    const [targetRegistry, narrativeComposer, familyCompanion, ...directCarriers] = await Promise.all([
      json(resolve(narrativeRoot, "core-architecture-target-pair-registry.v0.1.json")),
      readFile(resolve(narrativeRoot, "narrative-capsules-chimeric-prototype-v0.1.html"), "utf8"),
      readFile(resolve(narrativeRoot, "companions/core-architecture-family-index-chimeric-prototype-v0.1.6.html"), "utf8"),
      ...artifact.directCarriers.map(path => readFile(resolve(repositoryRoot, path), "utf8")),
    ]);
    const card = targetRegistry.cards.find(({ id }) => id === artifact.id);

    assert.ok(card, `${artifact.id} remains represented in the Narrative target registry`);
    assert.equal(card.prototypeRef, artifact.currentFile);
    assert.ok(narrativeComposer.includes(`\"prototypeRef\":\"${artifact.currentFile}\"`));
    assert.ok(familyCompanion.includes(artifact.currentFile));
    for (const carrier of directCarriers) assert.ok(carrier.includes(artifact.currentFile));
  });
}

test("Orientation and Tracing advances the current inventory as one complete family", async () => {
  const inventory = await readFile(resolve(repositoryRoot, "prompt-capsules/prompt-capsule-inventory.v0.1.0.md"), "utf8");
  const currentInventory = inventory.split("\n## Projections, receivers, and recovery inputs\n", 1)[0];
  assert.notEqual(currentInventory, inventory, "the inventory keeps its current/projection boundary");
  for (const phrase of ["PODA v0.1.5", "Alignment Worksheet v0.1.4", "Impact Map v0.1.5", "Context Tree v0.1.7"]) {
    assert.match(currentInventory, new RegExp(phrase.replaceAll(".", "\\."), "u"));
  }
  const declared = currentInventory.match(/current population contains (\d+) source artifacts/u);
  const adopted = currentInventory.match(/(\d+) current\s+adoptions\. This completes the observed population/u);
  const heading = currentInventory.match(/## Current source artifacts[^\n\d]*(\d+)/u);
  assert.ok(declared && adopted && heading, "the current population has a summary, heading and adoption statement");
  const tableCount = [...currentInventory.matchAll(/^\|[^|]+\|\s*(\d+)\s*\|/gmu)]
    .reduce((sum, match) => sum + Number(match[1]), 0);
  assert.ok(tableCount > 0, "the current-artifact table supplies the counted population");
  assert.deepEqual([Number(declared[1]), Number(adopted[1]), Number(heading[1])],
    [tableCount, tableCount, tableCount], "current inventory counts agree with its source classes");
  assert.match(currentInventory, /family members, which complete the current Orientation and Tracing[\s\S]*?famil(?:y|ies)/u);
});

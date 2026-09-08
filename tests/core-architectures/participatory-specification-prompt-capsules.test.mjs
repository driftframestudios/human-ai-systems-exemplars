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
const manifestName = "core-architectures-chimeric-prototype-manifest-v0.1.json";
const skillRevision = "303067bad4b7da100844979c0e6fe847edde5122";

const sharedSkills = [
  [".agents/skills/source-authority-mapping/SKILL.md", "706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5"],
  [".agents/skills/bounded-support-routing/SKILL.md", "80dff2f88bc919500d9557a0ff67210e68cbdf1c69bbe63ac29b93662f9bd402"],
  [".agents/skills/stateful-artifact-behavior-contracts/SKILL.md", "596f139100a448139c7c4ceb2dc6d1b470dc86ff19df4ed68a9ac765005f576a"],
];

const artifacts = [
  {
    id: "participatory-design-kit",
    name: "Participatory Design Kit",
    version: "0.1.4",
    currentFile: "participatory-design-kit-chimeric-prototype-v0.1.4.html",
    historicalFile: "participatory-design-kit-chimeric-prototype-v0.1.3.html",
    currentDigest: "e86619691afe4a687bb22c6c474b3da38c55afec6a18de8a6ef1254fec3a7867",
    historicalDigest: "d8e9cc9d3e8c354000a48bd62e0b0a023f654596ea223f8acf860b0cd5e75e64",
    stateContract: "participatory-design-kit-state.v0.1",
    apiName: "participatoryDesignKit",
    promptId: "ai-prompt",
    loops: ["skill-from-receiving-use", "repository-reentry"],
  },
  {
    id: "specification-by-example",
    name: "Specification-by-Example",
    version: "0.1.6",
    currentFile: "specification-by-example-chimeric-prototype-v0.1.6.html",
    historicalFile: "specification-by-example-chimeric-prototype-v0.1.5.html",
    currentDigest: "a548c7336ff93bd6b5d8030e99271798297c45078610fb4cb78363c0606d59ce",
    historicalDigest: "0bea8fabc2d06a05117b8289e01d3931e928262c8db6af01fd9c5563d0a9359f",
    stateContract: "specification-by-example-state.v0.1",
    apiName: "specificationByExample",
    promptId: "aiPrompt",
    loops: ["repository-reentry", "skill-from-receiving-use"],
  },
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function staticPrompt(html, id) {
  const match = html.match(new RegExp(`<pre id="${id}"[^>]*>([\\s\\S]*?)<\\/pre>`, "u"));
  assert.ok(match, `${id} carries an authored plain Prompt Capsule baseline`);
  return match[1]
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

for (const artifact of artifacts) {
  test(`${artifact.name} ${artifact.version} is one byte-identical current source`, async () => {
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
    assert.ok(source.equals(projection), "current source and Context projection agree byte for byte");
    assert.ok(historical.equals(historicalProjection), "accepted history remains byte-identical across projections");
    assert.equal(sha256(source), artifact.currentDigest);
    assert.equal(sha256(historical), artifact.historicalDigest);
  });

  test(`${artifact.name} carries the complete Prompt Capsule source contract`, async () => {
    const [html, loopRegistry, routeManifest] = await Promise.all([
      readFile(resolve(coreRoot, artifact.currentFile), "utf8"),
      readFile(resolve(repositoryRoot, "schemas/collaboration/index.html"), "utf8"),
      json(resolve(coreRoot, "public-iframe-route-manifest-v1.json")),
    ]);
    const plain = staticPrompt(html, artifact.promptId);
    const route = routeManifest.routes.find(({ id }) => id === artifact.id);

    assert.match(html, /const PROMPT_CAPSULE_CONTRACT = 'prompt-capsule\/0\.1\.0';/u);
    assert.ok(html.includes(`const PROMPT_CAPSULE_STATE_CONTRACT = '${artifact.stateContract}';`));
    assert.match(html, /<fieldset[^>]+data-prompt-view-control[^>]+hidden>/u);
    assert.match(html, /type="radio"[^>]+value="plain"[^>]+checked/u);
    assert.match(html, /type="radio"[^>]+value="skill-assisted"/u);
    assert.match(html, /<noscript>[\s\S]*?complete default plain Markdown remains available/u);
    assert.match(html, new RegExp(`window\\.${artifact.apiName}\\s*=\\s*Object\\.freeze\\(`, "u"));
    assert.ok(html.includes(`const PROMPT_CAPSULE_SKILL_REVISION = '${skillRevision}';`));

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
    assert.match(plain, /- View: `plain`/u);
    assert.doesNotMatch(plain, /## Skill assistance/u);
    assert.ok(
      orderedSections.every((section, index) => index === 0 || plain.indexOf(orderedSections[index - 1]) < plain.indexOf(section)),
      "the authored baseline keeps the contract-defined section order",
    );

    if (artifact.id === "participatory-design-kit") {
      assert.equal([...plain.matchAll(/^#### .+ \(`(?:bar|card|frag)-[^)]+`\)$/gmu)].length, 13);
      assert.match(plain, /5 of 5 phases, 5 of 5 lanes, 5 of 5 timeline items, 5 of 5 support cards, and 3 of 3 example fragments/u);
    } else {
      assert.equal([...plain.matchAll(/^### Rule: .+ \(`rule-[^)]+`\)$/gmu)].length, 3);
      assert.equal([...plain.matchAll(/^#### .+ \(`scenario-[^)]+`\)$/gmu)].length, 5);
    }

    for (const loopId of artifact.loops) {
      assert.match(html, new RegExp(`data-related-loop-id="${loopId}"`, "u"));
      assert.match(loopRegistry, new RegExp(`id="${loopId}"`, "u"));
    }
    for (const [path, expectedDigest] of sharedSkills) {
      const source = await readFile(resolve(repositoryRoot, path));
      assert.equal(sha256(source), expectedDigest);
      assert.ok(html.includes(`path:'${path}'`) || html.includes(`path: '${path}'`));
      assert.ok(html.includes(`sha256:'${expectedDigest}'`) || html.includes(`sha256: '${expectedDigest}'`));
    }

    assert.deepEqual([route.source_file, route.source_version], [artifact.currentFile, artifact.version]);
    assert.deepEqual(route.carrier_policy, {
      sandbox_tokens: ["allow-downloads", "allow-scripts"],
      permissions_policy: ["clipboard-write"],
      held_capabilities: [],
    });
  });
}

test("Participatory Elicitation and Specification advances the current inventory as one family", async () => {
  const inventory = await readFile(resolve(repositoryRoot, "prompt-capsules/prompt-capsule-inventory.v0.1.0.md"), "utf8");
  assert.match(inventory, /Participatory Design Kit v0\.1\.4/u);
  assert.match(inventory, /Specification-by-Example v0\.1\.6/u);
  assert.match(inventory, /fifteen current[\s\S]*?adoptions\. The remaining 13/u);
});

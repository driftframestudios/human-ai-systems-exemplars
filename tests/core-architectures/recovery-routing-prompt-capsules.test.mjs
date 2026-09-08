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

const artifacts = [
  {
    id: "upstream-revision-loop",
    name: "Upstream Revision Loop",
    currentFile: "upstream-revision-loop-chimeric-prototype-v0.1.4.html",
    historicalFile: "upstream-revision-loop-chimeric-prototype-v0.1.3.html",
    historicalDigest: "b1250002cfd30faa1d9d3cfe6cd43567aef0f60444f7e21d6280ec396af16fa7",
    currentDigest: "1392f82acdcc98b5fbdbbede46e50365b0750d1a5fb60eefd8b09e2b4335bb7a",
    stateContract: "upstream-revision-loop-state.v0.1",
    apiName: "upstreamRevisionLoop",
    promptId: "aiPromptOut",
    loops: ["repository-reentry", "public-release"],
    skills: [
      [".agents/skills/repository-reentry/SKILL.md", "211cdbd293c260e95e62d3bc7ed5cb4d6d9ca3debd560a28a74b52364a1bfa90"],
      [".agents/skills/source-authority-mapping/SKILL.md", "706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5"],
      [".agents/skills/stateful-artifact-behavior-contracts/SKILL.md", "596f139100a448139c7c4ceb2dc6d1b470dc86ff19df4ed68a9ac765005f576a"],
    ],
  },
  {
    id: "recovery-routing-atlas",
    name: "Recovery Routing Atlas",
    currentFile: "recovery-routing-atlas-chimeric-prototype-v0.1.4.html",
    historicalFile: "recovery-routing-atlas-chimeric-prototype-v0.1.3.html",
    historicalDigest: "9f1d469773ff03f048d2a9c67f3dd19845ed90a4148bd447ad072dbeecbaf453",
    currentDigest: "48633e6a5884800e66645d40c15b15b5991385188b9e39993f0f9bf11fe1b1d8",
    stateContract: "recovery-routing-atlas-state.v0.1",
    apiName: "recoveryRoutingAtlas",
    promptId: "promptBox",
    loops: ["repository-reentry", "skill-from-receiving-use"],
    skills: [
      [".agents/skills/practitioner-probe/SKILL.md", "348ea113a75af3487a420e2075aa199297673aca0ba0a69e5a19d6c5a463776c"],
      [".agents/skills/bounded-support-routing/SKILL.md", "80dff2f88bc919500d9557a0ff67210e68cbdf1c69bbe63ac29b93662f9bd402"],
      [".agents/skills/stateful-artifact-behavior-contracts/SKILL.md", "596f139100a448139c7c4ceb2dc6d1b470dc86ff19df4ed68a9ac765005f576a"],
    ],
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
  test(`${artifact.name} v0.1.4 is one byte-identical current source`, async () => {
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

    assert.deepEqual([current.file, current.version], [artifact.currentFile, "0.1.4"]);
    assert.deepEqual([contextCurrent.file, contextCurrent.version], [artifact.currentFile, "0.1.4"]);
    assert.equal(current.previous.at(-1), artifact.historicalFile);
    assert.equal(contextCurrent.previous.at(-1), artifact.historicalFile);
    assert.equal(current.size_bytes, source.byteLength);
    assert.equal(contextCurrent.size_bytes, projection.byteLength);
    assert.ok(source.equals(projection), "current source and Context projection agree byte for byte");
    assert.ok(historical.equals(historicalProjection), "v0.1.3 remains the byte-identical historical pair");
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
    assert.ok(html.includes(`window.${artifact.apiName} = Object.freeze(`));

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
    if (artifact.id === "upstream-revision-loop") {
      assert.match(
        plain,
        /When options use probabilities, name the outcome or condition each probability describes before assigning a value\./u,
      );
    }
    if (artifact.id === "recovery-routing-atlas") {
      assert.equal(
        [...plain.matchAll(/^### .+ \(`geom-[^)]+`\)$/gmu)].length,
        19,
        "the script-free Recovery Routing capsule carries all 19 geometries",
      );
    }
    assert.ok(
      orderedSections.every((section, index) => index === 0 || plain.indexOf(orderedSections[index - 1]) < plain.indexOf(section)),
      "the authored baseline keeps the contract-defined section order",
    );
    for (const loopId of artifact.loops) {
      assert.match(html, new RegExp(`data-related-loop-id="${loopId}"`, "u"));
      assert.match(loopRegistry, new RegExp(`id="${loopId}"`, "u"));
    }

    assert.deepEqual([route.source_file, route.source_version], [artifact.currentFile, "0.1.4"]);
    assert.deepEqual(route.carrier_policy, {
      sandbox_tokens: ["allow-downloads", "allow-scripts"],
      permissions_policy: ["clipboard-write"],
      held_capabilities: [],
    });
  });

  test(`${artifact.name} pins the exact public skills it offers`, async () => {
    const html = await readFile(resolve(coreRoot, artifact.currentFile), "utf8");
    const skillRevision = "efb94fcf70a80630d8edd289697341699b966f00";

    assert.match(html, new RegExp(`const PROMPT_CAPSULE_SKILL_REVISION = '${skillRevision}';`, "u"));
    for (const [path, expectedDigest] of artifact.skills) {
      const source = await readFile(resolve(repositoryRoot, path));
      assert.equal(sha256(source), expectedDigest);
      assert.ok(html.includes(`path: '${path}'`));
      assert.ok(html.includes(`sha256: '${expectedDigest}'`));
    }
  });
}

test("Recovery Routing and Revision advances the current inventory as one family", async () => {
  const inventory = await readFile(resolve(repositoryRoot, "prompt-capsules/prompt-capsule-inventory.v0.1.0.md"), "utf8");
  assert.match(inventory, /Upstream Revision Loop v0\.1\.4/u);
  assert.match(inventory, /Recovery Routing Atlas v0\.1\.4/u);
  assert.match(inventory, /26 current[\s\S]*?adoptions\. The remaining two/u);
});

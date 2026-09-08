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
const skillRevision = "22ff10cb2f6a122f89a905da695ebb18a0b0ec77";

const skills = new Map([
  ["source-authority-mapping", [".agents/skills/source-authority-mapping/SKILL.md", "706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5"]],
  ["bounded-support-routing", [".agents/skills/bounded-support-routing/SKILL.md", "80dff2f88bc919500d9557a0ff67210e68cbdf1c69bbe63ac29b93662f9bd402"]],
  ["stateful-artifact-behavior-contracts", [".agents/skills/stateful-artifact-behavior-contracts/SKILL.md", "596f139100a448139c7c4ceb2dc6d1b470dc86ff19df4ed68a9ac765005f576a"]],
  ["practitioner-probe", [".agents/skills/practitioner-probe/SKILL.md", "348ea113a75af3487a420e2075aa199297673aca0ba0a69e5a19d6c5a463776c"]],
]);

const artifacts = [
  {
    id: "pattern-problem-surface-matrix",
    name: "Pattern–Problem Surface Matrix",
    version: "0.1.4",
    currentFile: "pattern-problem-surface-matrix-chimeric-prototype-v0.1.4.html",
    historicalFile: "pattern-problem-surface-matrix-chimeric-prototype-v0.1.3.html",
    currentDigest: "cafc74ff0d7d921fa91865c42ea03417970287483fe96842cf266e8860d7f64b",
    historicalDigest: "25efaa307a2eead01e5779569e79d6c59eae0fd0a094cc256a4ae7dff386ed94",
    stateContract: "pattern-problem-surface-matrix-state.v0.1",
    apiName: "patternProblemSurfaceMatrix",
    promptId: "aiPrompt",
    skills: ["practitioner-probe", "stateful-artifact-behavior-contracts", "source-authority-mapping"],
    completeness: plain => {
      assert.equal([...plain.matchAll(/^### .+ \(`pattern-[^)]+`\)$/gmu)].length, 8);
      assert.equal([...plain.matchAll(/^  - Relationship: pattern `pattern-[^`]+` → population `pop-[^`]+`\.$/gmu)].length, 48);
      assert.match(plain, /8 patterns, 6 population readings, and 48 pattern-to-population relationships/u);
    },
  },
  {
    id: "jobs-to-be-done-treemap",
    name: "Jobs-to-be-Done Treemap",
    version: "0.1.4",
    currentFile: "jobs-to-be-done-treemap-chimeric-prototype-v0.1.4.html",
    historicalFile: "jobs-to-be-done-treemap-chimeric-prototype-v0.1.3.html",
    currentDigest: "f72a7449433f550145aa2c58f1a7a97ae9634f6bdabac7ddfd487623d525bdd3",
    historicalDigest: "74f75b9040a7f1bfadd5a52b401f4b364d2c689829b93a147ee6e18c8277b5ab",
    stateContract: "jobs-to-be-done-treemap-state.v0.1",
    apiName: "jobsToBeDoneTreemap",
    promptId: "ai-prompt",
    skills: ["source-authority-mapping", "practitioner-probe", "stateful-artifact-behavior-contracts"],
    completeness: plain => {
      assert.equal([...plain.matchAll(/^### .+ \(`job-[^)]+`\)$/gmu)].length, 8);
      assert.match(plain, /8 of 8 jobs are visible/u);
    },
  },
  {
    id: "unit-test-first-design",
    name: "Unit-test-first Design",
    version: "0.1.4",
    currentFile: "unit-test-first-design-chimeric-prototype-v0.1.4.html",
    historicalFile: "unit-test-first-design-chimeric-prototype-v0.1.3.html",
    currentDigest: "814a84723bfa87dd19f0800c86523d269e913abad5ca3b34fe2837996c658e60",
    historicalDigest: "4ef1a9f21f3890468869f306abcd2f13c40572da57ce61edd68c89448abb695d",
    stateContract: "unit-test-first-design-state.v0.1",
    apiName: "unitTestFirstDesign",
    promptId: "promptOut",
    skills: ["stateful-artifact-behavior-contracts", "source-authority-mapping", "bounded-support-routing"],
    completeness: plain => {
      assert.equal([...plain.matchAll(/^### .+ \(`target-[^)]+`\)$/gmu)].length, 5);
      assert.match(plain, /5 behavior targets \(5 visible; 0 hidden\)/u);
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

    assert.match(html, /PROMPT_CAPSULE_CONTRACT\s*=\s*'prompt-capsule\/0\.1\.0'/u);
    assert.ok(html.includes(`PROMPT_CAPSULE_STATE_CONTRACT = '${artifact.stateContract}'`));
    assert.match(html, /<fieldset[^>]+data-prompt-view-control[^>]+hidden>/u);
    assert.match(html, /type="radio"[^>]+value="plain"[^>]+checked/u);
    assert.match(html, /type="radio"[^>]+value="skill-assisted"/u);
    assert.match(html, /<noscript>[\s\S]*?complete default plain Markdown remains available/u);
    assert.match(html, new RegExp(`window\\.${artifact.apiName}\\s*=\\s*Object\\.freeze\\(`, "u"));
    assert.ok(html.includes(`PROMPT_CAPSULE_SKILL_REVISION = '${skillRevision}'`));

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
    artifact.completeness(plain);

    for (const loopId of ["repository-reentry", "skill-from-receiving-use"]) {
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
  });
}

test("Pattern Fit and Behavior Protection advances the current inventory as one family", async () => {
  const inventory = await readFile(resolve(repositoryRoot, "prompt-capsules/prompt-capsule-inventory.v0.1.0.md"), "utf8");
  assert.match(inventory, /Pattern–Problem Surface Matrix v0\.1\.4/u);
  assert.match(inventory, /Jobs-to-be-Done Treemap v0\.1\.4/u);
  assert.match(inventory, /Unit-test-first Design v0\.1\.4/u);
  assert.match(inventory, /27 current[\s\S]*?adoptions\. The remaining source/u);
});

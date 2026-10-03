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
const skillRevision = "b43d51853c8625935d091dd781be7bba917d3040";

const skills = new Map([
  ["evidence-grounded-research-spike", [".agents/skills/evidence-grounded-research-spike/SKILL.md", "844fc0c6b0b956b81984a2c2d47d9252abadeb0a6554c5ef4734d0f1e5f4b531"]],
  ["practitioner-probe", [".agents/skills/practitioner-probe/SKILL.md", "348ea113a75af3487a420e2075aa199297673aca0ba0a69e5a19d6c5a463776c"]],
  ["source-authority-mapping", [".agents/skills/source-authority-mapping/SKILL.md", "706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5"]],
  ["stateful-artifact-behavior-contracts", [".agents/skills/stateful-artifact-behavior-contracts/SKILL.md", "596f139100a448139c7c4ceb2dc6d1b470dc86ff19df4ed68a9ac765005f576a"]],
  ["supportive-change-writing", [".agents/skills/supportive-change-writing/SKILL.md", "fca40001b28ba6e07c0b122da39a054eae723b4f0df514c805684c94001d2e2c"]],
]);

const artifacts = [
  {
    id: "heart-chart",
    name: "HEART Chart",
    version: "0.1.6",
    currentFile: "heart-chart-chimeric-prototype-v0.1.6.html",
    historicalFile: "heart-chart-chimeric-prototype-v0.1.5.html",
    currentDigest: "4288e163b6af28f88689de41157ca97fabaf503652eb12cf7458b18ab90f648a",
    historicalDigest: "a4fecf35cb271d4b36ffd5a6eb22f9c3a6569b4e8551954cad0ffb47a7b87aba",
    stateContract: "heart-chart-state.v0.1",
    apiName: "heartChart",
    promptId: "aiPrompt",
    loops: ["visitor-surface-change", "skill-from-receiving-use"],
    skills: ["evidence-grounded-research-spike", "source-authority-mapping", "stateful-artifact-behavior-contracts"],
    completeness(plain) {
      assert.equal([...plain.matchAll(/^### .+ \(`heart-[^)]+`\)$/gmu)].length, 5);
      for (const field of ["Goal", "Signal", "Metric", "Interpretation", "Tolerance", "Counter-signal", "Qualitative companion", "Evidence status"]) {
        assert.equal([...plain.matchAll(new RegExp(`^- ${field}:`, "gmu"))].length, 5);
      }
    },
  },
  {
    id: "plus-delta",
    name: "Plus / Delta",
    version: "0.1.5",
    currentFile: "plus-delta-chimeric-prototype-v0.1.5.html",
    historicalFile: "plus-delta-chimeric-prototype-v0.1.4.html",
    currentDigest: "7b1944959ef57e466914af2659862ba79141f083e6e6c98a824765fa93b10532",
    historicalDigest: "b1f828166d5fe62b122f5f3bb5eeca36759c5b4b4887875fab9d935520d2d5b6",
    stateContract: "plus-delta-state.v0.1",
    apiName: "plusDelta",
    promptId: "aiPrompt",
    loops: ["repository-reentry", "skill-from-receiving-use"],
    skills: ["supportive-change-writing", "practitioner-probe", "stateful-artifact-behavior-contracts"],
    completeness(plain) {
      assert.equal([...plain.matchAll(/^### .+ — obs-[^\n]+$/gmu)].length, 5);
      for (const field of ["Type", "Goal affected", "Actor or role", "Evidence or example", "Status", "Instruction for the next collaboration", "Review trigger"]) {
        assert.equal([...plain.matchAll(new RegExp(`^- ${field}:`, "gmu"))].length, 5);
      }
    },
  },
  {
    id: "practitioner-judgment-probes",
    name: "Practitioner Judgment Probes",
    version: "0.1.5",
    currentFile: "practitioner-judgment-probes-chimeric-prototype-v0.1.5.html",
    historicalFile: "practitioner-judgment-probes-chimeric-prototype-v0.1.4.html",
    currentDigest: "623db5de42ce4c28def93062593f68ee55ac7f4e3c9806daef9b9c818f7308a7",
    historicalDigest: "a15c72f198dacb942d3ca4553204afac69df326df9c70bb6c00f32cd3242fd0c",
    stateContract: "practitioner-judgment-probes-state.v0.1",
    apiName: "practitionerJudgmentProbes",
    promptId: "ai-prompt",
    loops: ["repository-reentry", "skill-from-receiving-use"],
    skills: ["practitioner-probe", "source-authority-mapping", "stateful-artifact-behavior-contracts"],
    completeness(plain) {
      assert.equal([...plain.matchAll(/^### .+ \(`probe-[^)]+`\)$/gmu)].length, 5);
      assert.equal([...plain.matchAll(/^- Probability of what:/gmu)].length, 5);
      assert.equal([...plain.matchAll(/^- Technical-veracity status:/gmu)].length, 5);
      assert.equal([...plain.matchAll(/^- AI instruction yield:/gmu)].length, 5);
      for (const status of ["draft_probe", "correction_needed", "hold_for_resilience_pass"]) {
        assert.match(plain, new RegExp("`" + status + "`", "u"));
      }
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
    assert.ok(html.includes(`PROMPT_CAPSULE_STATE_CONTRACT = '${artifact.stateContract}'`) || html.includes(`PROMPT_CAPSULE_STATE_CONTRACT='${artifact.stateContract}'`));
    assert.match(html, /<fieldset[^>]+data-prompt-view-control[^>]+hidden>/u);
    assert.match(html, /type="radio"[^>]+value="plain"[^>]+checked/u);
    assert.match(html, /type="radio"[^>]+value="skill-assisted"/u);
    assert.match(html, /<noscript>[\s\S]*?complete (?:default )?[Pp]lain Markdown remains available/u);
    assert.match(html, new RegExp(`window\\.${artifact.apiName}\\s*=\\s*Object\\.freeze\\(`, "u"));
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
    assert.match(plain, new RegExp(`^# Prompt Capsule: ${artifact.name.replace("/", "\\/")}\\n`, "u"));
    assert.match(plain, /- Contract: `prompt-capsule\/0\.1\.0`/u);
    assert.match(plain, /- View: `plain`/u);
    assert.doesNotMatch(plain, /## Skill assistance/u);
    assert.ok(orderedSections.every((section, index) => index === 0 || plain.indexOf(orderedSections[index - 1]) < plain.indexOf(section)));
    artifact.completeness(plain);

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
      sandbox_tokens: [
        "allow-downloads",
        "allow-popups",
        "allow-popups-to-escape-sandbox",
        "allow-scripts",
      ],
      permissions_policy: ["clipboard-write"],
      held_capabilities: [],
    });
  });
}

test("Measurement, Reflection, and Judgment advances the current inventory as one family", async () => {
  const inventory = await readFile(resolve(repositoryRoot, "prompt-capsules/prompt-capsule-inventory.v0.1.0.md"), "utf8");
  const currentInventory = inventory.split("\n## Projections, receivers, and recovery inputs\n", 1)[0];
  assert.notEqual(currentInventory, inventory, "the inventory keeps its current/projection boundary");
  assert.match(currentInventory, /HEART Chart v0\.1\.6/u);
  assert.match(currentInventory, /Plus \/ Delta v0\.1\.5/u);
  assert.match(currentInventory, /Practitioner Judgment Probes v0\.1\.5/u);
  const declared = currentInventory.match(/current population contains (\d+) source artifacts/u);
  const adopted = currentInventory.match(/(\d+) current\s+adoptions\. This completes the observed population/u);
  const heading = currentInventory.match(/## Current source artifacts[^\n\d]*(\d+)/u);
  assert.ok(declared && adopted && heading, "the current population has a summary, heading and adoption statement");
  const tableCount = [...currentInventory.matchAll(/^\|[^|]+\|\s*(\d+)\s*\|/gmu)]
    .reduce((sum, match) => sum + Number(match[1]), 0);
  assert.ok(tableCount > 0, "the current-artifact table supplies the counted population");
  assert.deepEqual([Number(declared[1]), Number(adopted[1]), Number(heading[1])],
    [tableCount, tableCount, tableCount], "current inventory counts agree with its source classes");
});

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
const currentFile = "first-responsible-version-matrix-chimeric-prototype-v0.1.4.html";
const historicalFile = "first-responsible-version-matrix-chimeric-prototype-v0.1.3.html";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function staticPrompt(html) {
  const match = html.match(/<pre id="aiPrompt"[\s\S]*?>([\s\S]*?)<\/pre>/u);
  assert.ok(match, "current source carries an authored plain Prompt Capsule baseline");
  return match[1]
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

test("First Responsible Version Matrix v0.1.4 is one byte-identical current source", async () => {
  const [source, projection, historical, historicalProjection, coreManifest, contextManifest] = await Promise.all([
    readFile(resolve(coreRoot, currentFile)),
    readFile(resolve(contextRoot, currentFile)),
    readFile(resolve(coreRoot, historicalFile)),
    readFile(resolve(contextRoot, historicalFile)),
    json(resolve(coreRoot, "core-architectures-chimeric-prototype-manifest-v0.1.json")),
    json(resolve(contextRoot, "core-architectures-chimeric-prototype-manifest-v0.1.json")),
  ]);
  const current = coreManifest.prototypes.find(({ id }) => id === "first-responsible-version-matrix");
  const contextCurrent = contextManifest.prototypes.find(({ id }) => id === current.id);

  assert.deepEqual([current.file, current.version], [currentFile, "0.1.4"]);
  assert.deepEqual([contextCurrent.file, contextCurrent.version], [currentFile, "0.1.4"]);
  assert.equal(current.previous.at(-1), historicalFile);
  assert.equal(contextCurrent.previous.at(-1), historicalFile);
  assert.equal(current.size_bytes, source.byteLength);
  assert.equal(contextCurrent.size_bytes, projection.byteLength);
  assert.ok(source.equals(projection), "current source and Context projection agree byte for byte");
  assert.ok(historical.equals(historicalProjection), "v0.1.3 remains the byte-identical historical pair");
  assert.equal(sha256(historical), "92471bc975e471371023e4ebba6be4a9a0974753e471865f8237c884ff219266");
});

test("First Responsible Version Matrix carries the complete Prompt Capsule source contract", async () => {
  const [html, loopRegistry, routeManifest, inventory] = await Promise.all([
    readFile(resolve(coreRoot, currentFile), "utf8"),
    readFile(resolve(repositoryRoot, "schemas/collaboration/index.html"), "utf8"),
    json(resolve(coreRoot, "public-iframe-route-manifest-v1.json")),
    readFile(resolve(repositoryRoot, "prompt-capsules/prompt-capsule-inventory.v0.1.0.md"), "utf8"),
  ]);
  const plain = staticPrompt(html);
  const route = routeManifest.routes.find(({ id }) => id === "first-responsible-version-matrix");

  assert.doesNotMatch(html, /PROMPT_CAPSULE_STATIC_BASELINE/u);
  assert.match(html, /const PROMPT_CAPSULE_CONTRACT = 'prompt-capsule\/0\.1\.0';/u);
  assert.match(html, /const PROMPT_CAPSULE_STATE_CONTRACT = 'first-responsible-version-matrix-state\.v0\.1';/u);
  assert.match(html, /<fieldset[^>]+data-prompt-view-control[^>]+hidden>/u);
  assert.match(html, /type="radio"[^>]+value="plain"[^>]+checked/u);
  assert.match(html, /type="radio"[^>]+value="skill-assisted"/u);
  assert.match(html, /<noscript>[\s\S]*?complete default plain Markdown remains available/u);
  assert.match(html, /window\.firstResponsibleVersionMatrix = Object\.freeze\(/u);

  const orderedSections = [
    "## Purpose and target",
    "## Relevant context and inputs",
    "## Working state",
    "## Boundaries and human-held decisions",
    "## Requested return",
    "## Related loops",
    "## Evidence and recovery",
  ];
  assert.match(plain, /^# Prompt Capsule: First Responsible Version Matrix\n/u);
  assert.match(plain, /- Contract: `prompt-capsule\/0\.1\.0`/u);
  assert.match(plain, /- View: `plain`/u);
  assert.doesNotMatch(plain, /## Skill assistance/u);
  assert.ok(
    orderedSections.every((section, index) => index === 0 || plain.indexOf(orderedSections[index - 1]) < plain.indexOf(section)),
    "the authored baseline keeps the contract-defined section order",
  );
  for (const loopId of ["repository-reentry", "skill-from-receiving-use"]) {
    assert.match(html, new RegExp(`data-related-loop-id="${loopId}"`, "u"));
    assert.match(loopRegistry, new RegExp(`id="${loopId}"`, "u"));
  }

  assert.deepEqual(
    [route.source_file, route.source_version],
    [currentFile, "0.1.4"],
  );
  assert.deepEqual(route.carrier_policy, {
    sandbox_tokens: ["allow-downloads", "allow-scripts"],
    permissions_policy: ["clipboard-write"],
    held_capabilities: [],
  });
  assert.match(inventory, /First Responsible Version Matrix v0\.1\.4/u);
  assert.match(inventory, /fifteen current[\s\S]*?adoptions\. The remaining 13/u);
});

test("First Responsible Version Matrix pins the exact public skills it offers", async () => {
  const html = await readFile(resolve(coreRoot, currentFile), "utf8");
  const skillRevision = "cdfe58ef15cf65cce98cc4fdc7da0b166aea0c56";
  const skills = [
    [".agents/skills/stateful-artifact-behavior-contracts/SKILL.md", "596f139100a448139c7c4ceb2dc6d1b470dc86ff19df4ed68a9ac765005f576a"],
    [".agents/skills/source-authority-mapping/SKILL.md", "706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5"],
    [".agents/skills/bounded-support-routing/SKILL.md", "80dff2f88bc919500d9557a0ff67210e68cbdf1c69bbe63ac29b93662f9bd402"],
  ];

  assert.match(html, new RegExp(`const PROMPT_CAPSULE_SKILL_REVISION = '${skillRevision}';`, "u"));
  for (const [path, expectedDigest] of skills) {
    const source = await readFile(resolve(repositoryRoot, path));
    assert.equal(sha256(source), expectedDigest);
    assert.ok(html.includes(`path: '${path}'`));
    assert.ok(html.includes(`sha256: '${expectedDigest}'`));
  }
});

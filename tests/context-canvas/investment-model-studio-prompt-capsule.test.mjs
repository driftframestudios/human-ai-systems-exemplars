import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { assertImmutableSkillCoordinate } from "../prompt-capsule-skill-coordinate.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const studioPath = resolve(
  repositoryRoot,
  "collaboration/cross-functional-investment-model-studio/index.html",
);

test("the Investment Model Studio publishes one complete selected-model Prompt Capsule", async () => {
  const html = await readFile(studioPath, "utf8");

  assert.match(html, /const PROMPT_CAPSULE_CONTRACT = "prompt-capsule\/0\.1\.0";/u);
  assert.match(html, /const PROMPT_CAPSULE_STATE_CONTRACT = "investment-model-studio-state\.v0\.1";/u);
  assert.match(html, /<fieldset[^>]+data-prompt-view-control[^>]+hidden>/u);
  assert.match(html, /<legend>Markdown view<\/legend>/u);
  assert.match(html, /type="radio"[^>]+value="plain"[^>]+checked/u);
  assert.match(html, /type="radio"[^>]+value="skill-assisted"/u);
  assert.match(html, /<noscript>[\s\S]*?complete Activity-Based plain Markdown remains available/u);
  assert.doesNotMatch(html, /PROMPT_CAPSULE_STATIC_BASELINE/u);
  assert.match(html, /window\.crossFunctionalInvestmentModelStudio = Object\.freeze\(/u);
  assert.match(html, /https:\/\/schemas\.radiantnull\.com\/collaboration\/#repository-reentry/u);
  assert.match(html, /https:\/\/schemas\.radiantnull\.com\/collaboration\/#skill-from-receiving-use/u);

  const revision = "0b8c0463cc5e5fe107b894e2f6f204e3b746a99b";
  assert.match(html, new RegExp(`const PROMPT_CAPSULE_SKILL_REVISION = "${revision}";`, "u"));
  const skills = [
    [".agents/skills/source-authority-mapping/SKILL.md", "706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5"],
    [".agents/skills/practitioner-probe/SKILL.md", "348ea113a75af3487a420e2075aa199297673aca0ba0a69e5a19d6c5a463776c"],
    [".agents/skills/bounded-support-routing/SKILL.md", "80dff2f88bc919500d9557a0ff67210e68cbdf1c69bbe63ac29b93662f9bd402"],
  ];
  for (const [path, expectedDigest] of skills) {
    assertImmutableSkillCoordinate(revision, path, expectedDigest);
    assert.ok(html.includes(`path: "${path}"`));
    assert.ok(html.includes(`sha256: "${expectedDigest}"`));
  }
});

test("the Investment Model Studio points to current public loop owners", async () => {
  const [html, loopRegistry, inventory] = await Promise.all([
    readFile(studioPath, "utf8"),
    readFile(resolve(repositoryRoot, "schemas/collaboration/index.html"), "utf8"),
    readFile(resolve(repositoryRoot, "prompt-capsules/prompt-capsule-inventory.v0.1.0.md"), "utf8"),
  ]);

  for (const loopId of ["repository-reentry", "skill-from-receiving-use"]) {
    assert.match(html, new RegExp(`data-related-loop-id="${loopId}"`, "u"));
    assert.match(loopRegistry, new RegExp(`id="${loopId}"`, "u"));
  }
  assert.match(inventory, /\| Cross-Functional Investment Model Studio \| 1 \|/u);
  assert.match(inventory, /selected method, fixed scenario, and model-selection recovery behavior/u);
});

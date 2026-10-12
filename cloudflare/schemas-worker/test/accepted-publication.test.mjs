import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertAcceptedSkillSelection,
  verifyAcceptedPublication,
} from "../verify-accepted-publication.mjs";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const publicRoot = fileURLToPath(new URL("../public/", import.meta.url));

test("the checked-in Worker is the exact accepted Pages and source closure", async () => {
  assert.deepEqual(await verifyAcceptedPublication({ repositoryRoot, publicRoot }), {
    publicationRevision: "382620d8626a87b6d96f4039ebc87f01ad94687e",
    sourceRevision: "dc6b62c6e3f1e8748237fc767def75b32527140a",
    releaseTag: "pages-v0.2.0",
    schemas: 17,
    publicReadySkills: 23,
    publicPossibleSkills: 8,
    files: 111,
    routes: 144,
    closureSha256: "f25cf5b3b6681c67fddc81a82f5c0ba3bb49c3766d0a79df92fa3b1bbe26cf61",
  });
});

test("accepted selection standing is checked independently of current source", () => {
  const selection = {
    skills: [
      { name: "ready-skill", publicationStanding: "public_ready", sourcePath: ".agents/skills/ready-skill/SKILL.md" },
      { name: "held-skill", publicationStanding: "public_possible", sourcePath: ".agents/skills/held-skill/SKILL.md" },
    ],
  };
  const catalog = { skills: [{ name: "ready-skill" }] };
  const inventory = ["skills/ready-skill/projection.json"];

  assert.deepEqual(assertAcceptedSkillSelection(selection, catalog, inventory), {
    ready: ["ready-skill"],
    possible: ["held-skill"],
  });
  assert.throws(
    () => assertAcceptedSkillSelection(selection, { skills: [{ name: "held-skill" }] }, inventory),
    /exactly the accepted source revision's public-ready skills/u,
  );
});

test("accepted verification detects a changed checked-in carrier byte", async (context) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "accepted-schema-publication-"));
  context.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  await cp(publicRoot, temporaryRoot, { recursive: true });
  const licensePath = join(temporaryRoot, "LICENSE");
  await writeFile(licensePath, Buffer.concat([await readFile(licensePath), Buffer.from("\nchanged\n")]));

  await assert.rejects(
    verifyAcceptedPublication({ repositoryRoot, publicRoot: temporaryRoot }),
    /LICENSE matches the accepted publication revision/u,
  );
});

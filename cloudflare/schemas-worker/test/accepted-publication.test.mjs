import '../../../tools/node-runtime-admission.mjs';
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
    publicationRevision: "a8f9c75244f72e9ec9bec195e6fc0c324ccf8424",
    sourceRevision: "a5ed640bb0982044d46e6e874867eb8f0e760169",
    releaseTag: "pages-v0.4.0",
    schemas: 33,
    publicReadySkills: 31,
    publicPossibleSkills: 8,
    files: 163,
    routes: 216,
    closureSha256: "80cb2f1100adaedcda8179abbd4e1c84bcc8fbc5af60ce6eab4ec37cf587d2cb",
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

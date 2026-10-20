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
    publicationRevision: "554a2074327fb51a40255066d0c9b9ed5401a6f6",
    sourceRevision: "c1e35fdd57c2193812c2b183955aca15a5020be8",
    releaseTag: "pages-v0.3.1",
    schemas: 17,
    publicReadySkills: 27,
    publicPossibleSkills: 6,
    files: 127,
    routes: 160,
    closureSha256: "b20fe3e1932566dae2508aa8e4c994945ebdc5bb011a0476c00b1c80dfb59ed0",
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

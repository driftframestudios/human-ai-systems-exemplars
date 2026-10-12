import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { readAdmittedCaseBriefSource } from "../../tools/materialize-debrief-case-briefs.mjs";

test("Case Brief source admission accepts regular direct children", async t => {
  const root = await mkdtemp(join(tmpdir(), "case-brief-source-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, "accepted.html");
  await writeFile(source, "<main>accepted</main>", "utf8");

  assert.equal(
    await readAdmittedCaseBriefSource(source, { baseDirectory: root, fileLabel: "accepted.html" }),
    "<main>accepted</main>",
  );
});

test("Case Brief source admission rejects symlinks, directories, and resolved paths outside its owner", async t => {
  const root = await mkdtemp(join(tmpdir(), "case-brief-boundary-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const admitted = join(root, "admitted");
  const outside = join(root, "outside.html");
  const linked = join(admitted, "linked.html");
  const directory = join(admitted, "directory.html");
  await mkdir(admitted);
  await writeFile(outside, "outside", "utf8");
  await symlink(outside, linked);
  await mkdir(directory);

  await assert.rejects(
    readAdmittedCaseBriefSource(linked, { baseDirectory: admitted, fileLabel: "linked.html" }),
    /regular source file rather than a symlink or special entry/u,
  );
  await assert.rejects(
    readAdmittedCaseBriefSource(directory, { baseDirectory: admitted, fileLabel: "directory.html" }),
    /regular source file rather than a symlink or special entry/u,
  );
  await assert.rejects(
    readAdmittedCaseBriefSource(outside, { baseDirectory: admitted, fileLabel: "outside.html" }),
    /resolves outside its admitted source directory/u,
  );
});

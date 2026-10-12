import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";
import { pagesReleaseTag, verifyPagesReleaseTag } from "../../tools/schema-site-release.mjs";

test("site tag names have an independent exact version", () => {
  assert.equal(pagesReleaseTag("pages-v0.1.0"), "pages-v0.1.0");
  for (const value of ["v0.1.0", "pages-v01.0.0", "pages-v0.1.0/other", "--all", null]) {
    assert.throws(() => pagesReleaseTag(value));
  }
});

test("an annotated site tag binds source, exact projection, and closure", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "pages-release-test-"));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  try {
    git("init"); git("config", "user.name", "Release fixture"); git("config", "user.email", "fixture@example.invalid");
    await writeFile(resolve(root, "index.html"), "release fixture\n");
    git("add", "."); git("commit", "-m", "Fixture");
    const projectionRevision = git("rev-parse", "HEAD");
    const sourceRevision = "a".repeat(40), closureDigest = "b".repeat(64);
    git("tag", "-a", "pages-v0.1.0", "-m", `Pages fixture\n\nSource-Revision: ${sourceRevision}\nClosure-SHA256: ${closureDigest}`);
    const options = { root, releaseTag: "pages-v0.1.0", sourceRevision, projectionRevision, closureDigest };
    await verifyPagesReleaseTag(options);
    await assert.rejects(verifyPagesReleaseTag({ ...options, sourceRevision: "c".repeat(40) }), /Source-Revision/u);
    await assert.rejects(verifyPagesReleaseTag({ ...options, closureDigest: "c".repeat(64) }), /Closure-SHA256/u);
    await assert.rejects(verifyPagesReleaseTag({ ...options, projectionRevision: "c".repeat(40) }), /exact reviewed projection/u);
    git("tag", "pages-v0.1.1");
    await assert.rejects(verifyPagesReleaseTag({ ...options, releaseTag: "pages-v0.1.1" }), /annotated/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});

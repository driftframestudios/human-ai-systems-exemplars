import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { verifySchemaPagesReceiver, verifySchemaSiteRelease } from "../../tools/verify-schema-pages-receiver.mjs";
import { assertPublicationRevision } from "../../tools/schema-publication.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, "../..");

async function git(root, ...args) {
  const { stdout } = await execFileAsync("git", args, { cwd: root, encoding: "utf8" });
  return stdout.trim();
}

async function initializeRepository(root, files, message) {
  await mkdir(root, { recursive: true });
  await git(root, "init", "--quiet");
  await git(root, "config", "user.name", "Schema Pages receiver test");
  await git(root, "config", "user.email", "schema-pages-receiver@example.invalid");
  for (const [path, source] of Object.entries(files)) {
    const filePath = resolve(root, path);
    await mkdir(resolve(filePath, ".."), { recursive: true });
    await writeFile(filePath, source);
  }
  await git(root, "add", ".");
  await git(root, "commit", "--quiet", "-m", message);
  await git(root, "branch", "-M", root.endsWith("projection") ? "docs" : "main");
  return git(root, "rev-parse", "HEAD");
}

async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "schema-pages-receiver-"));
  const sourceRoot = resolve(root, "source");
  const artifactRoot = resolve(sourceRoot, ".schema-pages");
  const projectionRoot = resolve(root, "projection");
  const sourceRevision = await initializeRepository(
    sourceRoot,
    { "README.md": "Accepted source\n" },
    "Create accepted source",
  );
  const files = {
    ".gitignore": "ignored-extra.txt\n",
    ".nojekyll": "",
    "index.html": "<!doctype html><title>Schema registry</title>\n",
    "skills/example/index.html": "<!doctype html><title>Example skill</title>\n",
  };
  for (const [path, source] of Object.entries(files)) {
    const filePath = resolve(artifactRoot, path);
    await mkdir(resolve(filePath, ".."), { recursive: true });
    await writeFile(filePath, source);
  }
  const projectionRevision = await initializeRepository(
    projectionRoot,
    files,
    "Create accepted docs projection",
  );
  return {
    root,
    sourceRoot,
    sourceRevision,
    sourceBranch: "main",
    artifactRoot,
    projectionRoot,
    projectionRevision,
    projectionBranch: "docs",
  };
}

test("an exact source and docs pair verifies file membership and bytes", async () => {
  const state = await fixture();
  try {
    const result = await verifySchemaPagesReceiver(state);
    assert.equal(result.fileCount, 4);
    assert.match(result.closureDigest, /^[a-f0-9]{64}$/u);
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test("the current release gate requires metadata even for an exact historical artifact", async () => {
  const state = await fixture();
  try {
    await assert.rejects(verifySchemaSiteRelease({ ...state, releaseTag: "pages-v0.1.0" }), /ENOENT/u);
    const manifest = { releaseTag: "pages-v0.1.0", sourceRevision: state.sourceRevision };
    const bytes = `${JSON.stringify(manifest)}\n`;
    await writeFile(resolve(state.artifactRoot, "release.json"), bytes);
    await writeFile(resolve(state.projectionRoot, "release.json"), bytes);
    await git(state.projectionRoot, "add", "release.json");
    await git(state.projectionRoot, "commit", "--quiet", "-m", "Bind release");
    state.projectionRevision = await git(state.projectionRoot, "rev-parse", "HEAD");
    await assert.rejects(verifySchemaSiteRelease({ ...state, releaseTag: "pages-v0.1.0" }));
    const result = await verifySchemaPagesReceiver(state);
    await git(state.projectionRoot, "tag", "-a", "pages-v0.1.0", "-m",
      `Site release\n\nSource-Revision: ${state.sourceRevision}\nClosure-SHA256: ${result.closureDigest}`);
    await verifySchemaSiteRelease({ ...state, releaseTag: "pages-v0.1.0" });
  } finally { await rm(state.root, { recursive: true, force: true }); }
});

test("publication provenance follows committed selected inputs", async () => {
  const state = await fixture();
  try {
    await assertPublicationRevision(state.sourceRoot, state.sourceRevision, ["README.md"]);
    await writeFile(resolve(state.sourceRoot, "README.md"), "Edited source\n");
    await assert.rejects(assertPublicationRevision(state.sourceRoot, state.sourceRevision, ["README.md"]), /Commit the selected/u);
    await writeFile(resolve(state.sourceRoot, "README.md"), "Accepted source\n");
    await writeFile(resolve(state.sourceRoot, "new.md"), "Uncommitted input\n");
    await assert.rejects(assertPublicationRevision(state.sourceRoot, state.sourceRevision, ["README.md", "new.md"]), /belong to the named commit/u);
  } finally { await rm(state.root, { recursive: true, force: true }); }
});

test("receiver verification rejects matching ignored additions", async () => {
  const state = await fixture();
  try {
    await writeFile(resolve(state.artifactRoot, "ignored-extra.txt"), "same bytes\n");
    await writeFile(resolve(state.projectionRoot, "ignored-extra.txt"), "same bytes\n");
    await assert.rejects(
      verifySchemaPagesReceiver(state),
      /projection checkout must remain an unchanged rendering/,
    );
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test("receiver verification rejects byte drift and additional receiver files", async () => {
  const state = await fixture();
  try {
    await writeFile(resolve(state.projectionRoot, "index.html"), "changed\n");
    await assert.rejects(
      verifySchemaPagesReceiver(state),
      /projection checkout must remain an unchanged rendering/,
    );

    await writeFile(
      resolve(state.projectionRoot, "index.html"),
      "<!doctype html><title>Schema registry</title>\n",
    );
    await writeFile(resolve(state.projectionRoot, "unexpected.txt"), "extra\n");
    await assert.rejects(
      verifySchemaPagesReceiver(state),
      /projection checkout must remain an unchanged rendering/,
    );
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test("receiver verification rejects symbolic links and a moved source checkout", async () => {
  const state = await fixture();
  try {
    await symlink("index.html", resolve(state.projectionRoot, "linked.html"));
    await assert.rejects(
      verifySchemaPagesReceiver(state),
      /linked\.html must not be a symbolic link/,
    );
    await rm(resolve(state.projectionRoot, "linked.html"));

    await writeFile(resolve(state.sourceRoot, "README.md"), "Next source\n");
    await git(state.sourceRoot, "add", "README.md");
    await git(state.sourceRoot, "commit", "--quiet", "-m", "Advance source");
    await assert.rejects(
      verifySchemaPagesReceiver(state),
      /source checkout must equal --source-revision/,
    );
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test("receiver verification requires revisions to belong to their receiving branches", async () => {
  const state = await fixture();
  try {
    await git(state.sourceRoot, "checkout", "--quiet", "--orphan", "unreviewed");
    await git(state.sourceRoot, "rm", "--quiet", "-rf", ".");
    await writeFile(resolve(state.sourceRoot, "README.md"), "Unreviewed source\n");
    await git(state.sourceRoot, "add", "README.md");
    await git(state.sourceRoot, "commit", "--quiet", "-m", "Create unreviewed source");
    const unreviewedRevision = await git(state.sourceRoot, "rev-parse", "HEAD");

    await assert.rejects(
      verifySchemaPagesReceiver({
        ...state,
        sourceRevision: unreviewedRevision,
      }),
      /--source-revision must belong to main/,
    );
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test("the Pages workflow connects trusted release verification to explicit deployment", async () => {
  const workflow = await readFile(resolve(repositoryRoot, ".github/workflows/schema-pages.yml"), "utf8");
  assert.match(workflow, /workflow_dispatch:/u);
  assert.doesNotMatch(workflow, /\n\s+push:/u);
  assert.match(workflow, /WORKFLOW_REF[^]*refs\/heads\/main/u);
  assert.match(workflow, /source_revision:[^]*projection_revision:[^]*release_tag:[^]*activate_deployment:/u);
  assert.equal((workflow.match(/uses: actions\/checkout@/gu) ?? []).length, 3);
  assert.equal((workflow.match(/persist-credentials: false/gu) ?? []).length, 3);
  assert.equal((workflow.match(/fetch-depth: 0/gu) ?? []).length, 2);
  assert.ok(workflow.includes('ref: $' + '{{ github.sha }}'));
  assert.ok(workflow.includes('path: release-tools'));
  assert.ok(workflow.includes('working-directory: release-tools'));
  assert.ok(workflow.includes('node tools/verify-schema-pages-receiver.mjs --source-root ../source'));
  assert.match(workflow, /--release-tag "\$RELEASE_TAG"/u);
  assert.match(workflow, /--source-branch origin\/main/u);
  assert.match(workflow, /--projection-branch origin\/docs/u);
  assert.match(workflow, /include-hidden-files: true/u);
  assert.equal((workflow.match(/^  [a-z]+:$/gmu) ?? []).filter(line => line === '  publish:').length, 1);
  assert.doesNotMatch(workflow, /^  verify:/mu);
  assert.equal((workflow.match(/if: inputs\.activate_deployment/gu) ?? []).length, 2);
  assert.match(workflow, /publish:[^]*pages: write[^]*id-token: write/u);
  const membership = workflow.indexOf('- name: Confirm accepted branch ancestry');
  const configure = workflow.indexOf('uses: actions/configure-pages@');
  const install = workflow.indexOf('- name: Prepare locked dependencies');
  const verify = workflow.indexOf('- name: Compare the exact reviewed artifact and tag');
  const upload = workflow.indexOf('uses: actions/upload-pages-artifact@');
  const deploy = workflow.indexOf('uses: actions/deploy-pages@');
  assert.ok(membership > 0 && membership < configure && configure < install);
  assert.ok(verify > install && verify < upload && upload < deploy);
  assert.match(workflow.slice(membership, configure), /source merge-base --is-ancestor[^]*origin\/main[^]*projection merge-base --is-ancestor[^]*origin\/docs/u);
});

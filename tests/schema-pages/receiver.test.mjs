import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { verifySchemaPagesReceiver } from "../../tools/verify-schema-pages-receiver.mjs";

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

test("the Pages workflow separates immutable verification from selected deployment", async () => {
  const workflow = await readFile(
    resolve(repositoryRoot, ".github/workflows/schema-pages.yml"),
    "utf8",
  );

  assert.match(workflow, /workflow_dispatch:\n\s+inputs:/u);
  assert.doesNotMatch(workflow, /\n\s+push:/u);
  assert.match(workflow, /WORKFLOW_REF: \$\{\{ github\.ref \}\}/u);
  assert.match(workflow, /WORKFLOW_REF[^]*refs\/heads\/main/u);
  assert.match(workflow, /source_revision:[\s\S]*projection_revision:[\s\S]*activate_deployment:/u);
  assert.equal((workflow.match(/uses: actions\/checkout@/gu) ?? []).length, 2);
  assert.equal((workflow.match(/persist-credentials: false/gu) ?? []).length, 2);
  assert.equal((workflow.match(/fetch-depth: 0/gu) ?? []).length, 2);
  assert.match(workflow, /ref: \$\{\{ inputs\.source_revision \}\}[\s\S]*path: source/u);
  assert.match(workflow, /ref: \$\{\{ inputs\.projection_revision \}\}[\s\S]*path: projection/u);
  assert.match(workflow, /verify:[\s\S]*permissions:\n\s+contents: read/u);
  assert.match(workflow, /verify:[\s\S]*pages: read/u);
  assert.match(workflow, /steps\.pages\.outputs\.base_url/u);
  assert.match(workflow, /steps\.pages\.outputs\.host/u);
  assert.match(workflow, /--source-branch origin\/main/u);
  assert.match(workflow, /--projection-branch origin\/docs/u);
  assert.match(workflow, /include-hidden-files: true/u);
  assert.match(workflow, /publish:[\s\S]*needs: verify/u);
  assert.equal((workflow.match(/if: \$\{\{ inputs\.activate_deployment \}\}/gu) ?? []).length, 2);
  assert.match(workflow, /publish:[\s\S]*pages: write[\s\S]*id-token: write/u);

  const membershipIndex = workflow.indexOf("- name: Confirm receiving branch membership");
  const configureIndex = workflow.indexOf("- name: Observe active GitHub Pages settings");
  const installIndex = workflow.indexOf("- name: Install the locked source toolchain");
  assert.ok(membershipIndex > 0);
  assert.ok(membershipIndex < configureIndex);
  assert.ok(membershipIndex < installIndex);
  assert.match(
    workflow.slice(membershipIndex, configureIndex),
    /source merge-base --is-ancestor[^]*origin\/main[^]*projection merge-base --is-ancestor[^]*origin\/docs/u,
  );
});

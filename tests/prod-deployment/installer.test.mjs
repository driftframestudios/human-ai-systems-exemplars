import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, "../..");
const installerSource = path.join(
  repositoryRoot,
  "deployment/cpanel/deploy.sh",
);
const carrierRelativeRoot = "deployment/cpanel/carrier";
const indexHeader = [
  "deployment_manifest_sha256",
  "source_sha",
  "surface",
  "projected_path",
  "bytes",
  "sha256",
  "media_type",
].join("\t");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function rootBinding(fixture) {
  return sha256(Buffer.concat([
    Buffer.from("primary\0", "utf8"),
    Buffer.from(fixture.primary, "utf8"),
    Buffer.from("\0iframe\0", "utf8"),
    Buffer.from(fixture.iframe, "utf8"),
    Buffer.from("\0", "utf8"),
  ]));
}

function pendingPointer(fixture, releaseSha = fixture.releaseSha) {
  return `${releaseSha}\t${rootBinding(fixture)}\n`;
}

async function successfulPointer(fixture, releaseSha, sourceSha) {
  const manifestDigest = sha256(
    await readFile(path.join(
      fixture.repository,
      carrierRelativeRoot,
      "deployment-manifest.json",
    )),
  );
  return `${releaseSha}\t${sourceSha}\t${manifestDigest}\t${rootBinding(fixture)}\n`;
}

async function git(root, args) {
  const { stdout = "" } = await execFileAsync("git", args, {
    cwd: root,
    encoding: "utf8",
  });
  return stdout.trim();
}

async function commit(root, message) {
  await git(root, ["add", "-A"]);
  await git(root, ["commit", "--quiet", "-m", message]);
  return git(root, ["rev-parse", "HEAD"]);
}

function mediaType(projectedPath) {
  if (projectedPath.endsWith(".html")) return "text/html";
  if (projectedPath.endsWith(".css")) return "text/css";
  if (projectedPath.endsWith(".xml")) return "application/xml";
  if (projectedPath.endsWith(".json")) return "application/json";
  return "text/plain";
}

async function writeCarrier(fixture, files, sourceSha, options = {}) {
  const carrierRoot = path.join(fixture.repository, carrierRelativeRoot);
  await rm(carrierRoot, { recursive: true, force: true });
  await mkdir(carrierRoot, { recursive: true });
  const normalized = Object.entries(files)
    .map(([projectedPath, value]) => [
      projectedPath,
      Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8"),
    ])
    .sort(([left], [right]) => left.localeCompare(right));
  const manifestSourceSha = options.manifestSourceSha ?? sourceSha;
  const manifest = Buffer.from(
    `${JSON.stringify({
      id: "prod-projection.deployment-manifest.v1",
      version: "1",
      source_sha: manifestSourceSha,
      outputs: normalized.map(([projectedPath, bytes]) => ({
        projected_path: projectedPath,
        bytes: bytes.byteLength,
        sha256: sha256(bytes),
      })),
    }, null, 2)}\n`,
    "utf8",
  );
  const manifestDigest = sha256(manifest);
  await writeFile(path.join(carrierRoot, "deployment-manifest.json"), manifest);
  const rows = [];
  for (const [projectedPath, bytes] of normalized) {
    assert.match(projectedPath, /^(primary|iframe)-public\//);
    const target = path.join(carrierRoot, ...projectedPath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    rows.push([
      options.rowManifestDigest ?? manifestDigest,
      manifestSourceSha,
      projectedPath.startsWith("primary-public/") ? "primary" : "iframe",
      projectedPath,
      String(bytes.byteLength),
      options.payloadDigest?.[projectedPath] ?? sha256(bytes),
      mediaType(projectedPath),
    ].join("\t"));
  }
  await writeFile(
    path.join(carrierRoot, "deployment-files.tsv"),
    `${indexHeader}\n${rows.join("\n")}\n`,
    "utf8",
  );
}

async function createFixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "cpanel-installer-test-"));
  const repositoryInput = path.join(root, "repository");
  const primaryInput = path.join(root, "primary-public");
  const stateInput = path.join(root, "private-state");
  await mkdir(repositoryInput);
  await mkdir(primaryInput);
  await mkdir(stateInput);
  const repository = await realpath(repositoryInput);
  const primary = await realpath(primaryInput);
  const state = await realpath(stateInput);
  const iframeInput = options.nestedIframe
    ? path.join(primary, "iframe-document-root")
    : path.join(root, "iframe-public");
  await mkdir(iframeInput);
  const iframe = await realpath(iframeInput);
  await git(repository, ["init", "--quiet"]);
  await git(repository, ["config", "user.name", "Installer Test"]);
  await git(repository, ["config", "user.email", "installer@example.test"]);
  await git(repository, ["checkout", "--quiet", "-b", "prod"]);
  const installerTarget = path.join(repository, "deployment/cpanel/deploy.sh");
  await mkdir(path.dirname(installerTarget), { recursive: true });
  await copyFile(installerSource, installerTarget);
  await writeFile(path.join(repository, "accepted-source.txt"), "source one\n");
  const sourceSha = await commit(repository, "Accept source one");
  const files = options.files ?? {
    "iframe-public/v1/core/demo/index.html": "<!doctype html><title>Frame one</title>\n",
    "primary-public/404.html": "<!doctype html><title>Missing</title>\n",
    "primary-public/about.html": "<!doctype html><title>About one</title>\n",
    "primary-public/assets/site.css": "body { color: #123; }\n",
    "primary-public/index.html": "<!doctype html><title>Primary one</title>\n",
    "primary-public/sitemap.xml": "<urlset></urlset>\n",
  };
  let releaseSha;
  if (options.mergeRelease) {
    await git(repository, ["checkout", "--quiet", "-b", "carrier-release"]);
    await writeCarrier(
      { repository },
      files,
      sourceSha,
      options.carrierOptions,
    );
    await commit(repository, "Prepare production projection one");
    await git(repository, ["checkout", "--quiet", "prod"]);
    await git(repository, [
      "merge",
      "--quiet",
      "--no-ff",
      "-m",
      "Carry production projection one",
      "carrier-release",
    ]);
    releaseSha = await git(repository, ["rev-parse", "HEAD"]);
  } else {
    await writeCarrier(
      { repository },
      files,
      sourceSha,
      options.carrierOptions,
    );
    releaseSha = await commit(repository, "Carry production projection one");
  }
  const configuration = path.join(root, "private-host.conf");
  await writeConfiguration({
    configuration,
    primary,
    iframe,
    state,
    primaryAllowlist: options.primaryAllowlist ?? "",
    iframeAllowlist: options.iframeAllowlist ?? "",
  });
  return {
    root,
    repository,
    primary,
    iframe,
    state,
    configuration,
    sourceSha,
    releaseSha,
    files,
  };
}

async function writeConfiguration({
  configuration,
  primary,
  iframe,
  state,
  expectedBranch = "prod",
  primaryAllowlist = "",
  iframeAllowlist = "",
}) {
  await writeFile(
    configuration,
    [
      `EXPECTED_BRANCH=${expectedBranch}`,
      `PRIMARY_DOCUMENT_ROOT=${primary}`,
      `IFRAME_DOCUMENT_ROOT=${iframe}`,
      `STATE_ROOT=${state}`,
      `PRIMARY_FIRST_CUTOVER_ALLOWLIST=${primaryAllowlist}`,
      `IFRAME_FIRST_CUTOVER_ALLOWLIST=${iframeAllowlist}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

async function runInstaller(fixture) {
  let outcome;
  try {
    const result = await execFileAsync(
      "bash",
      ["deployment/cpanel/deploy.sh", "--config", fixture.configuration],
      {
        cwd: fixture.repository,
        encoding: "utf8",
        timeout: 30_000,
      },
    );
    outcome = { ok: true, code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    outcome = {
      ok: false,
      code: error.code,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
    };
  }
  assert.equal(
    await git(fixture.repository, ["status", "--porcelain=v1", "--untracked-files=all"]),
    "",
    "the installer leaves its managed clone clean",
  );
  return outcome;
}

async function fileExists(target) {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function assertProjectedFiles(fixture, files) {
  for (const [projectedPath, expected] of Object.entries(files)) {
    const [surface, ...parts] = projectedPath.split("/");
    const root = surface === "primary-public" ? fixture.primary : fixture.iframe;
    const actual = await readFile(path.join(root, ...parts));
    assert.deepEqual(actual, Buffer.from(expected));
  }
}

test("the thin installer verifies and installs both roots, preserves the private allowlist, and records success last", async () => {
  const fixture = await createFixture({
    primaryAllowlist: ".well-known/",
  });
  try {
    const allowed = path.join(fixture.primary, ".well-known/acme-challenge/token");
    await mkdir(path.dirname(allowed), { recursive: true });
    await writeFile(allowed, "host-owned\n");

    const first = await runInstaller(fixture);
    assert.equal(first.ok, true, first.stderr);
    assert.match(first.stdout, /cPanel deployment complete\./, first.stderr);
    assert.match(first.stdout, /Public files verified: 6\./);
    assert.doesNotMatch(first.stdout + first.stderr, new RegExp(fixture.root));
    await assertProjectedFiles(fixture, fixture.files);
    assert.equal(await readFile(allowed, "utf8"), "host-owned\n");
    assert.equal(
      await readFile(path.join(fixture.state, "current-release"), "utf8"),
      await successfulPointer(fixture, fixture.releaseSha, fixture.sourceSha),
    );
    assert.equal(
      await fileExists(path.join(fixture.state, "deployment-files.tsv")),
      false,
      "Git supplies the prior carrier index instead of a copied state file",
    );
    assert.equal(
      await fileExists(path.join(fixture.state, "deployment-manifest.json")),
      false,
      "the bounded pointer carries the manifest digest without copying the manifest",
    );

    const replay = await runInstaller(fixture);
    assert.equal(replay.ok, true, replay.stderr);
    await assertProjectedFiles(fixture, fixture.files);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("first cutover keeps unknown root contents outside installer authority", async () => {
  const fixture = await createFixture();
  try {
    const legacy = path.join(fixture.primary, "legacy.html");
    await writeFile(legacy, "legacy\n");
    const result = await runInstaller(fixture);
    assert.equal(result.ok, false);
    assert.match(result.stderr, /first-cutover document root contains a non-allowlisted file/);
    assert.match(result.stderr, /Public state: unchanged by this run\./);
    assert.equal(await readFile(legacy, "utf8"), "legacy\n");
    assert.equal(await fileExists(path.join(fixture.state, "current-release")), false);
    assert.equal(await fileExists(path.join(fixture.iframe, "v1/core/demo/index.html")), false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a crash-left installer transaction name stops before deployment", async () => {
  const fixture = await createFixture();
  try {
    const staleTemporary = path.join(fixture.primary, ".cpanel-deploy.crash");
    await writeFile(staleTemporary, "incomplete bytes\n");
    const result = await runInstaller(fixture);
    assert.equal(result.ok, false);
    assert.match(result.stderr, /stale installer transaction file requires host review/);
    assert.match(result.stderr, /Public state: unchanged by this run\./);
    assert.equal(await readFile(staleTemporary, "utf8"), "incomplete bytes\n");
    assert.equal(await fileExists(path.join(fixture.iframe, "v1/core/demo/index.html")), false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("carrier manifest binding and payload digests fail before either public root changes", async () => {
  const fixture = await createFixture({
    carrierOptions: { rowManifestDigest: "0".repeat(64) },
  });
  try {
    const result = await runInstaller(fixture);
    assert.equal(result.ok, false);
    assert.match(result.stderr, /deployment index differs from its manifest digest/);
    assert.match(result.stderr, /Public state: unchanged by this run\./);
    assert.equal(await fileExists(path.join(fixture.primary, "index.html")), false);
    assert.equal(await fileExists(path.join(fixture.iframe, "v1/core/demo/index.html")), false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("the Bash-readable carrier source must equal the release first parent", async () => {
  const fixture = await createFixture({
    carrierOptions: { manifestSourceSha: "0".repeat(40) },
  });
  try {
    const result = await runInstaller(fixture);
    assert.equal(result.ok, false);
    assert.match(result.stderr, /deployment index differs from its accepted source coordinate/);
    assert.match(result.stderr, /Public state: unchanged by this run\./);
    assert.equal(await fileExists(path.join(fixture.primary, "index.html")), false);
    assert.equal(await fileExists(path.join(fixture.iframe, "v1/core/demo/index.html")), false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("carrier bytes are materialized from release Git blobs rather than mutable worktree files", async () => {
  const fixture = await createFixture({
    files: {
      "iframe-public/v1/core/demo/index.html": "committed iframe bytes\n",
      "primary-public/index.html": "committed primary bytes\n",
    },
  });
  try {
    const projectedPath = "primary-public/index.html";
    const worktreePayload = path.join(
      fixture.repository,
      carrierRelativeRoot,
      projectedPath,
    );
    await git(fixture.repository, [
      "update-index",
      "--assume-unchanged",
      `${carrierRelativeRoot}/${projectedPath}`,
    ]);
    await writeFile(worktreePayload, "hidden worktree substitution\n");
    assert.equal(
      await git(fixture.repository, ["status", "--porcelain=v1", "--untracked-files=all"]),
      "",
      "the fixture exercises a mutation hidden from the clean-worktree check",
    );

    const result = await runInstaller(fixture);
    assert.equal(result.ok, true, result.stderr);
    assert.equal(
      await readFile(path.join(fixture.primary, "index.html"), "utf8"),
      fixture.files[projectedPath],
    );
    assert.equal(await readFile(worktreePayload, "utf8"), "hidden worktree substitution\n");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("one pending-release marker resumes the same release and refuses a different release", async (t) => {
  await t.test("the same release resumes and clears the bounded marker after success", async () => {
    const fixture = await createFixture();
    try {
      const pending = path.join(fixture.state, "pending-release");
      await writeFile(pending, pendingPointer(fixture), { mode: 0o600 });
      const result = await runInstaller(fixture);
      assert.equal(result.ok, true, result.stderr);
      await assertProjectedFiles(fixture, fixture.files);
      assert.equal(await fileExists(pending), false);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  await t.test("a different release stops before public mutation", async () => {
    const fixture = await createFixture();
    try {
      const pending = path.join(fixture.state, "pending-release");
      await writeFile(pending, pendingPointer(fixture), { mode: 0o600 });
      await writeFile(path.join(fixture.repository, "accepted-source.txt"), "source two\n");
      const secondSourceSha = await commit(fixture.repository, "Accept source two");
      const secondFiles = {
        "iframe-public/v1/core/demo/index.html": "second iframe bytes\n",
        "primary-public/index.html": "second primary bytes\n",
      };
      await writeCarrier(fixture, secondFiles, secondSourceSha);
      await commit(fixture.repository, "Carry production projection two");

      const result = await runInstaller(fixture);
      assert.equal(result.ok, false);
      assert.match(result.stderr, /a different release is pending/);
      assert.match(result.stderr, /Public state: unchanged by this run\./);
      assert.equal(await fileExists(path.join(fixture.primary, "index.html")), false);
      assert.equal(await fileExists(path.join(fixture.iframe, "v1/core/demo/index.html")), false);
      assert.equal(await readFile(pending, "utf8"), pendingPointer(fixture));
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  await t.test("the same release cannot resume into different document roots", async () => {
    const fixture = await createFixture();
    try {
      const pending = path.join(fixture.state, "pending-release");
      await writeFile(pending, pendingPointer(fixture), { mode: 0o600 });
      const replacementPrimaryInput = path.join(fixture.root, "replacement-primary");
      await mkdir(replacementPrimaryInput);
      const replacementPrimary = await realpath(replacementPrimaryInput);
      await writeConfiguration({
        configuration: fixture.configuration,
        primary: replacementPrimary,
        iframe: fixture.iframe,
        state: fixture.state,
      });

      const result = await runInstaller(fixture);
      assert.equal(result.ok, false);
      assert.match(result.stderr, /pending release remains bound to its original document roots/);
      assert.match(result.stderr, /Public state: unchanged by this run\./);
      assert.equal(await fileExists(path.join(replacementPrimary, "index.html")), false);
      assert.equal(await readFile(pending, "utf8"), pendingPointer(fixture));
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
});

test("a normal two-parent carrier merge binds accepted source to release first parent", async () => {
  const fixture = await createFixture({ mergeRelease: true });
  try {
    const parents = (
      await git(fixture.repository, ["rev-list", "--parents", "-n", "1", "HEAD"])
    ).split(" ");
    assert.equal(parents.length, 3, "the fixture release has two parents");
    assert.equal(parents[1], fixture.sourceSha, "release first parent is accepted source S");

    const result = await runInstaller(fixture);
    assert.equal(result.ok, true, result.stderr);
    await assertProjectedFiles(fixture, fixture.files);
    assert.equal(
      await readFile(path.join(fixture.state, "current-release"), "utf8"),
      await successfulPointer(fixture, fixture.releaseSha, fixture.sourceSha),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("recognized old-or-new bytes support transition recovery while stale ownership stays bounded", async () => {
  const fixture = await createFixture({
    files: {
      "iframe-public/v1/core/demo/index.html": "frame one\n",
      "primary-public/index.html": "primary one\n",
      "primary-public/stale.txt": "owned stale\n",
    },
  });
  try {
    const first = await runInstaller(fixture);
    assert.equal(first.ok, true, first.stderr);
    const unmanaged = path.join(fixture.primary, "host-owned.txt");
    await writeFile(unmanaged, "preserve me\n");

    await writeFile(
      path.join(fixture.repository, "accepted-source.txt"),
      "source two\n",
    );
    const secondSourceSha = await commit(fixture.repository, "Accept source two");
    const secondFiles = {
      "iframe-public/v1/core/demo/index.html": "frame two\n",
      "primary-public/assets/new.css": "body { color: #456; }\n",
      "primary-public/index.html": "primary two\n",
    };
    await writeCarrier(fixture, secondFiles, secondSourceSha);
    const secondReleaseSha = await commit(
      fixture.repository,
      "Carry production projection two",
    );

    const alreadyRequested = path.join(fixture.iframe, "v1/core/demo/index.html");
    await writeFile(alreadyRequested, secondFiles["iframe-public/v1/core/demo/index.html"]);
    const newRequested = path.join(fixture.primary, "assets/new.css");
    await mkdir(path.dirname(newRequested), { recursive: true });
    await writeFile(newRequested, secondFiles["primary-public/assets/new.css"]);

    const second = await runInstaller(fixture);
    assert.equal(second.ok, true, second.stderr);
    await assertProjectedFiles(fixture, secondFiles);
    assert.equal(await fileExists(path.join(fixture.primary, "stale.txt")), false);
    assert.equal(await readFile(unmanaged, "utf8"), "preserve me\n");
    assert.equal(
      await readFile(path.join(fixture.state, "current-release"), "utf8"),
      await successfulPointer(fixture, secondReleaseSha, secondSourceSha),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("owned-file drift stops before a later surface can mutate", async () => {
  const fixture = await createFixture();
  try {
    const first = await runInstaller(fixture);
    assert.equal(first.ok, true, first.stderr);
    const iframeBefore = await readFile(
      path.join(fixture.iframe, "v1/core/demo/index.html"),
    );
    await writeFile(path.join(fixture.primary, "index.html"), "unrecognized drift\n");

    const drift = await runInstaller(fixture);
    assert.equal(drift.ok, false);
    assert.match(drift.stderr, /owned or requested public file contains unrecognized bytes/);
    assert.match(drift.stderr, /Public state: unchanged by this run\./);
    assert.deepEqual(
      await readFile(path.join(fixture.iframe, "v1/core/demo/index.html")),
      iframeBefore,
    );
    assert.equal(
      await readFile(path.join(fixture.state, "current-release"), "utf8"),
      await successfulPointer(fixture, fixture.releaseSha, fixture.sourceSha),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("the supported nested iframe root stays outside primary ownership and scanning", async () => {
  const fixture = await createFixture({ nestedIframe: true });
  try {
    const result = await runInstaller(fixture);
    assert.equal(result.ok, true, result.stderr);
    await assertProjectedFiles(fixture, fixture.files);
    assert.equal(
      await readFile(path.join(fixture.iframe, "v1/core/demo/index.html"), "utf8"),
      fixture.files["iframe-public/v1/core/demo/index.html"],
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("private root and lock bindings remain explicit across deployments", async (t) => {
  await t.test("a successful state stays bound to its document roots", async () => {
    const fixture = await createFixture();
    try {
      const first = await runInstaller(fixture);
      assert.equal(first.ok, true, first.stderr);
      const replacementPrimary = path.join(fixture.root, "replacement-primary");
      await mkdir(replacementPrimary);
      await writeConfiguration({
        configuration: fixture.configuration,
        primary: replacementPrimary,
        iframe: fixture.iframe,
        state: fixture.state,
      });
      const changed = await runInstaller(fixture);
      assert.equal(changed.ok, false);
      assert.match(changed.stderr, /document-root binding changed after the prior successful release/);
      assert.match(changed.stderr, /Public state: unchanged by this run\./);
      assert.equal(await fileExists(path.join(replacementPrimary, "index.html")), false);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  await t.test("a stale lock remains a human-resolved boundary", async () => {
    const fixture = await createFixture();
    try {
      const lock = path.join(fixture.state, "install.lock");
      await mkdir(lock);
      const result = await runInstaller(fixture);
      assert.equal(result.ok, false);
      assert.match(result.stderr, /another deployment lock is present/);
      assert.equal(await fileExists(lock), true);
      assert.equal(await fileExists(path.join(fixture.primary, "index.html")), false);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
});

test("configuration grammar rejects unknown keys, relative roots, and clone overlap", async (t) => {
  await t.test("unknown keys remain data rather than executable input", async () => {
    const fixture = await createFixture();
    try {
      const current = await readFile(fixture.configuration, "utf8");
      await writeFile(fixture.configuration, `${current}UNKNOWN_KEY=value\n`);
      const result = await runInstaller(fixture);
      assert.equal(result.ok, false);
      assert.match(result.stderr, /private configuration contains an unknown key/);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  await t.test("relative roots remain outside the host contract", async () => {
    const fixture = await createFixture();
    try {
      await writeConfiguration({
        configuration: fixture.configuration,
        primary: "relative-primary",
        iframe: fixture.iframe,
        state: fixture.state,
      });
      const result = await runInstaller(fixture);
      assert.equal(result.ok, false);
      assert.match(result.stderr, /roots must use absolute paths/);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  await t.test("the repository cannot become a document root", async () => {
    const fixture = await createFixture();
    try {
      await writeConfiguration({
        configuration: fixture.configuration,
        primary: fixture.repository,
        iframe: fixture.iframe,
        state: fixture.state,
      });
      const result = await runInstaller(fixture);
      assert.equal(result.ok, false);
      assert.match(result.stderr, /repository, state, and public roots must have separate ownership boundaries/);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  await t.test("the repository cannot become the private state root", async () => {
    const fixture = await createFixture();
    try {
      await writeConfiguration({
        configuration: fixture.configuration,
        primary: fixture.primary,
        iframe: fixture.iframe,
        state: fixture.repository,
      });
      const result = await runInstaller(fixture);
      assert.equal(result.ok, false);
      assert.match(result.stderr, /repository and private state root require separate ownership boundaries/);
      assert.equal(await fileExists(path.join(fixture.primary, "index.html")), false);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
});

test("symlinked public entries and non-release branch state remain fail-closed", async (t) => {
  await t.test("a public symlink is refused", async () => {
    const fixture = await createFixture();
    try {
      await symlink("outside", path.join(fixture.primary, "linked"));
      const result = await runInstaller(fixture);
      assert.equal(result.ok, false);
      assert.match(result.stderr, /public document root contains a symbolic link/);
      assert.match(result.stderr, /Public state: unchanged by this run\./);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  await t.test("a different attached branch is refused", async () => {
    const fixture = await createFixture();
    try {
      await git(fixture.repository, ["branch", "-m", "other"]);
      const result = await runInstaller(fixture);
      assert.equal(result.ok, false);
      assert.match(result.stderr, /attached branch differs from EXPECTED_BRANCH/);
      assert.equal(await fileExists(path.join(fixture.primary, "index.html")), false);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
});

test("the source keeps public activation order and successful-state persistence explicit", async () => {
  const source = await readFile(installerSource, "utf8");
  const cpanel = await readFile(path.join(repositoryRoot, ".cpanel.yml"), "utf8");
  assert.equal(
    cpanel,
    "---\ndeployment:\n  tasks:\n    - /bin/bash deployment/cpanel/deploy.sh\n",
    "cPanel delegates through one host-neutral Bash task",
  );
  const phases = [
    'PHASE="two-root preflight"',
    'PHASE="iframe surface"',
    'PHASE="primary assets"',
    'PHASE="primary HTML"',
    'PHASE="primary root entries"',
    'PHASE="post-install verification"',
    'PHASE="successful-state update"',
  ];
  let previous = -1;
  for (const phase of phases) {
    const current = source.indexOf(phase);
    assert.ok(current > previous, `${phase} follows its predecessor`);
    previous = current;
  }
  assert.ok(
    source.indexOf('mv -f -- "$STATE_RELEASE_TEMP" "$CURRENT_RELEASE_FILE"') >
      source.indexOf('PHASE="post-install verification"'),
    "the successful release pointer changes after public verification",
  );
  assert.match(source, /local source="\$STAGED_CARRIER_ROOT\/\$projected"/);
  assert.match(source, /git -C "\$REPOSITORY_ROOT" cat-file blob "\$carrier_object"/);
  assert.match(
    source,
    /PATH=\/usr\/local\/cpanel\/3rdparty\/bin:\/usr\/bin:\/bin/,
    "the sanitized path retains cPanel's supported Git directory",
  );
  assert.match(
    source,
    /mktemp -d "\$STATE_ROOT\/\.deployment-scratch\.XXXXXX"/,
    "private scratch storage stays inside the validated state root",
  );
  assert.ok(
    source.indexOf('PHASE="pending release binding"') >
      source.indexOf('PHASE="two-root preflight"'),
    "the pending marker follows the complete public preflight",
  );
  assert.ok(
    source.indexOf('rm -f -- "$PENDING_RELEASE_FILE"') >
      source.indexOf('mv -f -- "$STATE_RELEASE_TEMP" "$CURRENT_RELEASE_FILE"'),
    "the bounded pending marker clears only after successful state advances",
  );
});

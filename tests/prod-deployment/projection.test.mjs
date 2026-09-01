import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  checkProductionProjection,
  createProductionProjectionPlan,
  loadProductionProjectionInputs,
  persistProductionProjection,
  readRepositorySourceSha,
  validatePrimaryManifest,
} from "../../tools/build-prod-projection.mjs";
import { sha256 } from "../../tools/iframe-route-package-engine.mjs";

const execFileAsync = promisify(execFile);
const configurationRelativePath =
  "deployment/cpanel/production-projection.config.json";
const primaryManifestRelativePath =
  "deployment/cpanel/primary-route-manifest.json";

async function git(root, args) {
  const { stdout = "" } = await execFileAsync("git", args, {
    cwd: root,
    encoding: "utf8",
  });
  return stdout.trim();
}

async function commitFixture(root, message) {
  await git(root, ["add", "-A"]);
  await git(root, ["commit", "--quiet", "-m", message]);
  return await git(root, ["rev-parse", "HEAD"]);
}

function primaryManifest(files) {
  return {
    id: "prod-projection.primary-route-manifest.v1",
    version: "1",
    files,
  };
}

function aggregateFixture(options = {}) {
  const coreReceipt = Buffer.from('{"family":"core"}\n', "utf8");
  const canvasReceipt = Buffer.from('{"family":"canvas"}\n', "utf8");
  const strategyHtml = Buffer.from(
    '<!doctype html><title>Strategy</title><script type="application/json">{"$id":"https://example.test/inside"}</script>',
    "utf8",
  );
  const strategySchema = Buffer.from(
    '{"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://schemas.example.test/strategy","$ref":"#/$defs/item","$defs":{"item":{"type":"string"}}}\n',
    "utf8",
  );
  const canvasHtml = Buffer.from(
    options.canvasHtml ?? "<!doctype html><title>Canvas</title>",
    "utf8",
  );
  const outputFiles = new Map([
    ["canvas/demo/index.html", canvasHtml],
    ["core/strategy-canvas/strategy-canvas-system-v0.2/strategy-canvas.schema.json", strategySchema],
    ["core/strategy-canvas/index.html", strategyHtml],
    ["canvas/route-manifest.json", canvasReceipt],
    ["core/route-manifest.json", coreReceipt],
  ]);
  const familySummary = (family, routeReceipt) => {
    const files = [...outputFiles.entries()].filter(
      ([relativePath]) => relativePath.startsWith(`${family}/`),
    );
    return {
      id: family,
      base_path: `/v1/${family}/`,
      family_manifest_sha256: family === "core" ? "1".repeat(64) : "2".repeat(64),
      route_receipt_file: `${family}/route-manifest.json`,
      route_receipt_sha256: sha256(routeReceipt),
      routes: 1,
      files: files.length,
      bytes: files.reduce((total, [, bytes]) => total + bytes.byteLength, 0),
    };
  };
  const receipt = {
    id: "iframe-routes.aggregate-package-receipt.v1",
    version: "1",
    host: "iframes.vik.guru",
    base_path: "/v1/",
    package_contract: {
      family_directories: ["core", "canvas"],
      primary_routes: 2,
      generated_files: outputFiles.size + 1,
      generated_bytes: 0,
      live_cloudflare_mutation: false,
    },
    families: [
      familySummary("core", coreReceipt),
      familySummary("canvas", canvasReceipt),
    ],
  };
  const familyBytes = [...outputFiles.values()].reduce(
    (total, bytes) => total + bytes.byteLength,
    0,
  );
  let rootReceipt;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    rootReceipt = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    const generatedBytes = familyBytes + rootReceipt.byteLength;
    if (receipt.package_contract.generated_bytes === generatedBytes) break;
    receipt.package_contract.generated_bytes = generatedBytes;
  }
  outputFiles.set("route-manifest.json", rootReceipt);
  return {
    receipt,
    outputFiles,
    familyPlans: new Map([
      [
        "core",
        {
          receipt: {
            package_contract: { primary_routes: 1 },
            routes: [
              {
                projection_file: "strategy-canvas/index.html",
                static_resource_closure: {
                  package_files: [
                    {
                      target_file: "strategy-canvas-system-v0.2/strategy-canvas.schema.json",
                      content_type: "application/schema+json",
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
      [
        "canvas",
        {
          receipt: {
            package_contract: { primary_routes: 1 },
            routes: [
              {
                projection_file: "demo/index.html",
                static_resource_closure: {},
              },
            ],
          },
        },
      ],
    ]),
  };
}

async function createFixtureRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "prod-projection-fixture-"));
  await git(root, ["init", "--quiet"]);
  await git(root, ["config", "user.name", "Projection Test"]);
  await git(root, ["config", "user.email", "projection@example.test"]);
  await mkdir(path.join(root, "visitor"), { recursive: true });
  await mkdir(path.join(root, "deployment/cpanel"), { recursive: true });
  const index = [
    "<!doctype html>",
    '<link rel="canonical" href="https://vik.guru/">',
    '<iframe src="https://iframes.vik.guru/v1/core/strategy-canvas/"></iframe>',
  ].join("\n");
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://schemas.vik.guru/example/v1/schema.json",
    $ref: "#/$defs/value",
    $defs: { value: { type: "string" } },
  };
  await writeFile(path.join(root, "visitor/index.html"), index, "utf8");
  await writeFile(
    path.join(root, "visitor/schema.json"),
    `${JSON.stringify(schema)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(root, primaryManifestRelativePath),
    `${JSON.stringify(primaryManifest([
      {
        source_path: "visitor/schema.json",
        projected_path: "schemas/example.json",
        media_type: "application/schema+json",
      },
      {
        source_path: "visitor/index.html",
        projected_path: "index.html",
        media_type: "text/html",
      },
    ]))}\n`,
    "utf8",
  );
  await writeFile(
    path.join(root, configurationRelativePath),
    `${JSON.stringify({
      id: "prod-projection.configuration.v1",
      version: "1",
      primary_manifest: primaryManifestRelativePath,
    })}\n`,
    "utf8",
  );
  const sourceSha = await commitFixture(root, "Accept fixture");
  return {
    root,
    index,
    schema,
    sourceSha,
    configurationPath: path.join(root, configurationRelativePath),
    primaryManifestPath: path.join(root, primaryManifestRelativePath),
  };
}

async function commitPrimaryManifest(fixture, files, message) {
  await writeFile(
    fixture.primaryManifestPath,
    `${JSON.stringify(primaryManifest(files))}\n`,
    "utf8",
  );
  fixture.sourceSha = await commitFixture(fixture.root, message);
  return fixture.sourceSha;
}

test("the production plan deterministically combines an explicit primary closure with the aggregate iframe plan", async () => {
  const fixture = await createFixtureRoot();
  try {
    const aggregatePlan = aggregateFixture();
    const first = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan,
    });
    const second = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan,
    });

    assert.deepEqual([...first.outputFiles.keys()], [...second.outputFiles.keys()]);
    for (const [file, bytes] of first.outputFiles) {
      assert.ok(bytes.equals(second.outputFiles.get(file)), `${file} remains deterministic`);
    }
    assert.equal(
      first.outputFiles.get("primary-public/index.html").toString("utf8"),
      fixture.index,
    );
    assert.match(
      first.outputFiles.get("primary-public/index.html").toString("utf8"),
      /https:\/\/iframes\.vik\.guru\/v1\/core\/strategy-canvas\//,
    );
    assert.deepEqual(
      JSON.parse(first.outputFiles.get("primary-public/schemas/example.json")),
      fixture.schema,
    );
    assert.ok(
      first.outputFiles
        .get("iframe-public/v1/core/strategy-canvas/strategy-canvas-system-v0.2/strategy-canvas.schema.json")
        .equals(
          aggregatePlan.outputFiles.get(
            "core/strategy-canvas/strategy-canvas-system-v0.2/strategy-canvas.schema.json",
          ),
        ),
    );
    assert.equal(first.manifest.source_sha, fixture.sourceSha);
    assert.equal(
      first.manifest.inputs.iframe_package.receipt_sha256,
      sha256(aggregatePlan.outputFiles.get("route-manifest.json")),
    );
    assert.equal(
      first.manifest.inputs.iframe_package.source_relationship,
      "independent_plan_bound_input",
    );
    assert.match(
      first.manifest.inputs.iframe_package.closure_sha256,
      /^[a-f0-9]{64}$/,
    );
    assert.deepEqual(first.manifest.inputs.configuration, {
      source_path: configurationRelativePath,
      git_blob_id: await git(
        fixture.root,
        ["rev-parse", `HEAD:${configurationRelativePath}`],
      ),
      sha256: sha256(await readFile(fixture.configurationPath)),
    });
    assert.equal(
      first.manifest.inputs.primary_manifest.source_path,
      primaryManifestRelativePath,
    );
    assert.deepEqual(first.manifest.surfaces, {
      primary: {
        root: "primary-public/",
        files: 2,
        bytes: Buffer.byteLength(fixture.index) + Buffer.byteLength(`${JSON.stringify(fixture.schema)}\n`),
      },
      iframe: {
        root: "iframe-public/",
        files: aggregatePlan.outputFiles.size,
        bytes: [...aggregatePlan.outputFiles.values()].reduce(
          (total, bytes) => total + bytes.byteLength,
          0,
        ),
      },
    });
    assert.deepEqual(
      first.manifest.outputs.map(({ projected_path }) => projected_path),
      [...first.manifest.outputs.map(({ projected_path }) => projected_path)].sort(),
    );
    assert.equal(
      first.manifest.outputs.find(({ projected_path }) =>
        projected_path.endsWith("strategy-canvas.schema.json"),
      ).media_type,
      "application/schema+json",
    );
    assert.ok(
      [...first.outputFiles.keys()].every((file) =>
        !file.includes(".iframe-route-build") && !file.includes("context-canvas-project-surface/context-canvas"),
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("the independent iframe-plan binding changes for a same-length payload mutation", async () => {
  const fixture = await createFixtureRoot();
  try {
    const accepted = aggregateFixture();
    const changed = aggregateFixture({
      canvasHtml: "<!doctype html><title>Canoes</title>",
    });
    assert.equal(
      sha256(accepted.outputFiles.get("route-manifest.json")),
      sha256(changed.outputFiles.get("route-manifest.json")),
      "the fixture holds its receipt constant when only equal-length payload bytes change",
    );

    const first = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: accepted,
    });
    const second = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: changed,
    });
    assert.notEqual(
      first.manifest.inputs.iframe_package.closure_sha256,
      second.manifest.inputs.iframe_package.closure_sha256,
    );

    const inconsistent = aggregateFixture();
    inconsistent.outputFiles.set(
      "canvas/demo/index.html",
      Buffer.from("longer aggregate fixture bytes", "utf8"),
    );
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: inconsistent,
      }),
      /receipt totals differ|canvas receipt differs/,
    );

    const routeDrift = aggregateFixture();
    routeDrift.familyPlans.get("core").receipt.package_contract.primary_routes = 2;
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: routeDrift,
      }),
      /core receipt differs from its output plan/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("fixture configuration and primary manifest load through the repository-owned seam", async () => {
  const fixture = await createFixtureRoot();
  try {
    const loaded = await loadProductionProjectionInputs(fixture.configurationPath, {
      repositoryRoot: fixture.root,
    });
    assert.equal(loaded.primaryManifest.files[0].projected_path, "index.html");
    assert.equal(loaded.configuration.primary_manifest, primaryManifestRelativePath);
    assert.deepEqual(
      Object.keys(loaded.binding.configuration).sort(),
      ["git_blob_id", "sha256", "source_path"],
    );
    assert.equal(
      loaded.binding.configuration.source_path,
      configurationRelativePath,
    );
    assert.equal(
      loaded.binding.primary_manifest.source_path,
      primaryManifestRelativePath,
    );
    assert.match(loaded.binding.configuration.git_blob_id, /^[a-f0-9]{40}$/);
    assert.match(loaded.binding.configuration.sha256, /^[a-f0-9]{64}$/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("ignored configuration and primary-manifest files cannot select production membership", async () => {
  const ignoredConfiguration = await createFixtureRoot();
  const ignoredManifest = await createFixtureRoot();
  try {
    await writeFile(
      path.join(ignoredConfiguration.root, ".gitignore"),
      "private/\n",
      "utf8",
    );
    ignoredConfiguration.sourceSha = await commitFixture(
      ignoredConfiguration.root,
      "Ignore private selection files",
    );
    const ignoredConfigurationPath = path.join(
      ignoredConfiguration.root,
      "private/config.json",
    );
    await mkdir(path.dirname(ignoredConfigurationPath), { recursive: true });
    await writeFile(
      ignoredConfigurationPath,
      `${JSON.stringify({
        id: "prod-projection.configuration.v1",
        version: "1",
        primary_manifest: primaryManifestRelativePath,
      })}\n`,
      "utf8",
    );
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: ignoredConfiguration.root,
        sourceSha: ignoredConfiguration.sourceSha,
        configurationPath: ignoredConfigurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /configuration must be a regular tracked blob/,
    );

    await writeFile(
      path.join(ignoredManifest.root, ".gitignore"),
      "private/\n",
      "utf8",
    );
    await writeFile(
      ignoredManifest.configurationPath,
      `${JSON.stringify({
        id: "prod-projection.configuration.v1",
        version: "1",
        primary_manifest: "private/primary.json",
      })}\n`,
      "utf8",
    );
    ignoredManifest.sourceSha = await commitFixture(
      ignoredManifest.root,
      "Select ignored primary manifest",
    );
    await mkdir(path.join(ignoredManifest.root, "private"), { recursive: true });
    await writeFile(
      path.join(ignoredManifest.root, "private/primary.json"),
      `${JSON.stringify(primaryManifest([
        {
          source_path: "visitor/index.html",
          projected_path: "index.html",
          media_type: "text/html",
        },
      ]))}\n`,
      "utf8",
    );
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: ignoredManifest.root,
        sourceSha: ignoredManifest.sourceSha,
        configurationPath: ignoredManifest.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /manifest must be a regular tracked blob/,
    );
  } finally {
    await rm(ignoredConfiguration.root, { recursive: true, force: true });
    await rm(ignoredManifest.root, { recursive: true, force: true });
  }
});

test("clean CRLF worktree filters preserve immutable Git-blob output bytes", async () => {
  const fixture = await createFixtureRoot();
  try {
    await writeFile(
      path.join(fixture.root, ".gitattributes"),
      "*.html text eol=crlf\n",
      "utf8",
    );
    fixture.sourceSha = await commitFixture(fixture.root, "Use a CRLF checkout filter");
    await rm(path.join(fixture.root, "visitor/index.html"));
    await git(
      fixture.root,
      ["checkout", "--force", "HEAD", "--", "visitor/index.html"],
    );
    assert.equal(await git(fixture.root, ["status", "--porcelain=v1"]), "");
    const { stdout: trackedBytes } = await execFileAsync(
      "git",
      ["show", "HEAD:visitor/index.html"],
      { cwd: fixture.root, encoding: "buffer" },
    );
    const worktreeBytes = await readFile(
      path.join(fixture.root, "visitor/index.html"),
    );
    assert.ok(worktreeBytes.includes(Buffer.from("\r\n")));
    assert.ok(!trackedBytes.includes(Buffer.from("\r\n")));

    const plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: aggregateFixture(),
    });
    assert.ok(
      plan.outputFiles.get("primary-public/index.html").equals(trackedBytes),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("the automatic source coordinate is a clean full Git SHA", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "prod-projection-git-"));
  try {
    await execFileAsync("git", ["init", "--quiet"], { cwd: root });
    await execFileAsync("git", ["config", "user.name", "Projection Test"], { cwd: root });
    await execFileAsync("git", ["config", "user.email", "projection@example.test"], { cwd: root });
    await writeFile(path.join(root, "source.txt"), "accepted\n", "utf8");
    await execFileAsync("git", ["add", "source.txt"], { cwd: root });
    await execFileAsync("git", ["commit", "--quiet", "-m", "Accept fixture"], { cwd: root });

    assert.match(await readRepositorySourceSha(root), /^[a-f0-9]{40}$/);
    await writeFile(path.join(root, "source.txt"), "changed\n", "utf8");
    await assert.rejects(
      readRepositorySourceSha(root),
      (error) => {
        assert.match(error.message, /requires a clean Git worktree/);
        assert.doesNotMatch(error.message, /source\.txt/);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an ignored primary file remains outside the captured tracked source", async () => {
  const fixture = await createFixtureRoot();
  try {
    await mkdir(path.join(fixture.root, "private"));
    await writeFile(path.join(fixture.root, ".gitignore"), "private/\n", "utf8");
    await writeFile(path.join(fixture.root, "private/index.html"), "private", "utf8");
    const ignoredSourceSha = await commitPrimaryManifest(
      fixture,
      [
        {
          source_path: "private/index.html",
          projected_path: "index.html",
          media_type: "text/html",
        },
      ],
      "Ignore private fixture",
    );

    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: ignoredSourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /must be a regular tracked blob/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("an untracked primary file keeps the source coordinate open", async () => {
  const fixture = await createFixtureRoot();
  try {
    await commitPrimaryManifest(
      fixture,
      [
        {
          source_path: "visitor/untracked.html",
          projected_path: "index.html",
          media_type: "text/html",
        },
      ],
      "Select absent fixture",
    );
    await writeFile(
      path.join(fixture.root, "visitor/untracked.html"),
      "untracked",
      "utf8",
    );
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /requires a clean Git worktree/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("an alternate repository root requires its aggregate plan to be injected", async () => {
  const fixture = await createFixtureRoot();
  try {
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
      }),
      /alternate repository root requires an injected aggregate iframe plan/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("source revalidation catches a tracked-file mutation during composition", async () => {
  const fixture = await createFixtureRoot();
  try {
    const aggregatePlan = aggregateFixture();
    const originalFiles = aggregatePlan.outputFiles;
    aggregatePlan.outputFiles = new class extends Map {
      *entries() {
        let mutated = false;
        for (const entry of super.entries()) {
          if (!mutated) {
            writeFileSync(
              path.join(fixture.root, "visitor/index.html"),
              "changed during composition",
              "utf8",
            );
            mutated = true;
          }
          yield entry;
        }
      }
    }(originalFiles);

    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan,
      }),
      /requires a clean Git worktree|changed during composition/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("conflicting iframe media declarations stay outside the production manifest", async () => {
  const fixture = await createFixtureRoot();
  try {
    const aggregatePlan = aggregateFixture();
    aggregatePlan.familyPlans.get("core").receipt.routes.push({
      projection_file: "strategy-canvas/index.html",
      static_resource_closure: {
        package_files: [
          {
            target_file: "strategy-canvas-system-v0.2/strategy-canvas.schema.json",
            content_type: "application/json",
          },
        ],
      },
    });
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan,
      }),
      /media type declarations conflict/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("primary selection rejects path escape, repository-only roots, nonportable paths, collisions, and missing root index", () => {
  const file = {
    source_path: "visitor/index.html",
    projected_path: "index.html",
    media_type: "text/html",
  };
  assert.throws(
    () => validatePrimaryManifest(primaryManifest([{ ...file, source_path: "../index.html" }])),
    /must stay relative and normalized/,
  );
  assert.throws(
    () => validatePrimaryManifest(primaryManifest([{ ...file, source_path: "tools/index.html" }])),
    /repository-only root tools/,
  );
  for (const sourcePath of [".ENV/private.html", ".GIT/config.html", ".AgEnTs/guide.html"]) {
    assert.throws(
      () => validatePrimaryManifest(primaryManifest([{ ...file, source_path: sourcePath }])),
      /environment files|repository-only root/,
      sourcePath,
    );
  }
  for (const projectedPath of [
    "line\nbreak.html",
    "caf\u0065\u0301.html",
    "CON.html",
    "trailing-dot.",
    "drive:C.html",
    "bad<name.html",
    "bad>name.html",
    "bad\"name.html",
    "bad|name.html",
    "bad?name.html",
    "bad*name.html",
  ]) {
    assert.throws(
      () => validatePrimaryManifest(primaryManifest([
        { ...file, projected_path: projectedPath },
      ])),
      /Unicode NFC|must remain portable/,
      projectedPath,
    );
  }
  assert.throws(
    () => validatePrimaryManifest(primaryManifest([
      { ...file, projected_path: "bad\\name.html" },
    ])),
    /must stay relative and normalized/,
  );
  assert.throws(
    () => validatePrimaryManifest(primaryManifest([
      file,
      { ...file, source_path: "visitor/second.html", projected_path: "INDEX.HTML" },
    ])),
    /output collides/,
  );
  assert.throws(
    () => validatePrimaryManifest(primaryManifest([
      { ...file, projected_path: "about.html" },
    ])),
    /project index.html at the primary root/,
  );
});

test("primary source traversal through a symbolic link stays outside the projection", async () => {
  const fixture = await createFixtureRoot();
  const outside = await mkdtemp(path.join(os.tmpdir(), "prod-projection-outside-"));
  try {
    await writeFile(path.join(outside, "index.html"), "outside", "utf8");
    await symlink(path.join(outside, "index.html"), path.join(fixture.root, "visitor/link.html"));
    const linkedSourceSha = await commitPrimaryManifest(
      fixture,
      [
        {
          source_path: "visitor/link.html",
          projected_path: "index.html",
          media_type: "text/html",
        },
      ],
      "Track symbolic fixture",
    );
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: linkedSourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /must be a regular tracked blob/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("check uses temporary storage while explicit build transactionally replaces its owned output", async () => {
  const fixture = await createFixtureRoot();
  try {
    const plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: aggregateFixture(),
    });

    const check = await checkProductionProjection(plan);
    assert.equal(check.files, plan.outputFiles.size);
    await assert.rejects(readFile(path.join(plan.outputRoot, "deployment-manifest.json")), {
      code: "ENOENT",
    });

    const built = await persistProductionProjection(plan);
    assert.equal(built.files, plan.outputFiles.size);
    assert.deepEqual(
      { installation: built.installation, cleanup: built.cleanup },
      { installation: "installed", cleanup: "complete" },
    );
    assert.deepEqual(
      JSON.parse(await readFile(path.join(plan.outputRoot, "deployment-manifest.json"), "utf8")),
      plan.manifest,
    );
    await writeFile(path.join(plan.outputRoot, "stale.txt"), "stale", "utf8");
    await persistProductionProjection(plan);
    await assert.rejects(readFile(path.join(plan.outputRoot, "stale.txt")), {
      code: "ENOENT",
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a post-install cleanup failure returns installed with cleanup incomplete", async () => {
  const fixture = await createFixtureRoot();
  try {
    const plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: aggregateFixture(),
    });
    const result = await persistProductionProjection(
      plan,
      plan.outputRoot,
      {
        remove: async () => {
          throw new Error("fixture cleanup interruption");
        },
      },
    );

    assert.equal(result.installation, "installed");
    assert.equal(result.cleanup, "incomplete");
    assert.deepEqual(
      JSON.parse(await readFile(path.join(plan.outputRoot, "deployment-manifest.json"), "utf8")),
      plan.manifest,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("explicit build preserves a pre-existing output outside the assembler's ownership", async () => {
  const fixture = await createFixtureRoot();
  try {
    const plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: aggregateFixture(),
    });
    await mkdir(plan.outputRoot);
    await writeFile(path.join(plan.outputRoot, "owner.txt"), "external owner", "utf8");

    await assert.rejects(
      persistProductionProjection(plan),
      /no owned deployment manifest|outside this builder's ownership/,
    );
    assert.equal(
      await readFile(path.join(plan.outputRoot, "owner.txt"), "utf8"),
      "external owner",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("an unresolved public-reference token keeps the primary closure at its configuration boundary", async () => {
  const fixture = await createFixtureRoot();
  try {
    await writeFile(
      path.join(fixture.root, "visitor/index.html"),
      '<a href="{{PUBLIC_URL_REGISTRY_WELCOME_MAT}}">Registry</a>',
      "utf8",
    );
    const tokenSourceSha = await commitFixture(fixture.root, "Add unresolved token fixture");
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: tokenSourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /retains an unresolved public URL token/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("an unresolved professional-profile token keeps the primary closure at its configuration boundary", async () => {
  const fixture = await createFixtureRoot();
  try {
    await writeFile(
      path.join(fixture.root, "visitor/index.html"),
      '<script>var professionalProfileRoute = "{{PUBLIC_URL_AUTHOR_PROFESSIONAL_PROFILE}}";</script>\n',
      "utf8",
    );
    const tokenSourceSha = await commitFixture(fixture.root, "Add unresolved profile token fixture");
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: tokenSourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /retains an unresolved public URL token/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

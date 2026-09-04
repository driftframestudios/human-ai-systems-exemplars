import assert from "node:assert/strict";
import { execFile } from "node:child_process";
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
  assertCarrierOnlyDirtyStatus,
  checkProductionCarrier,
  compareUtf8Paths,
  createProductionCarrierPlan,
  createProductionProjectionPlan,
  stageProductionCarrier,
  stageProductionCarrierFromRepository,
  validatePrimaryManifest,
} from "../../tools/build-prod-projection.mjs";
import { sha256 } from "../../tools/iframe-route-package-engine.mjs";

const execFileAsync = promisify(execFile);
const configurationRelativePath =
  "deployment/cpanel/production-projection.config.json";
const primaryManifestRelativePath =
  "deployment/cpanel/primary-route-manifest.json";
const carrierRelativeRoot = "deployment/cpanel/carrier";

test("carrier row ordering matches the installer's UTF-8 byte ordering", () => {
  const paths = ["primary-public/\u{10000}.html", "primary-public/\ue000.html"];
  assert.deepEqual(
    [...paths].sort(compareUtf8Paths),
    [...paths].sort((left, right) => Buffer.compare(
      Buffer.from(left, "utf8"),
      Buffer.from(right, "utf8"),
    )),
  );
  assert.notDeepEqual([...paths].sort(compareUtf8Paths), [...paths].sort());
});

async function git(root, args) {
  const { stdout = "" } = await execFileAsync("git", args, {
    cwd: root,
    encoding: "utf8",
  });
  return stdout.trim();
}

async function commitFixture(root, message, options = {}) {
  await git(root, ["add", "-A"]);
  await git(root, [
    "commit",
    "--quiet",
    ...(options.allowEmpty ? ["--allow-empty"] : []),
    "-m",
    message,
  ]);
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
  const coreHtml = Buffer.from(
    options.coreHtml ?? "<!doctype html><title>Core</title>",
    "utf8",
  );
  const canvasHtml = Buffer.from("<!doctype html><title>Canvas</title>", "utf8");
  const outputFiles = new Map([
    ["canvas/demo/index.html", canvasHtml],
    ["canvas/route-manifest.json", canvasReceipt],
    ["core/demo/index.html", coreHtml],
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
            routes: [{ projection_file: "demo/index.html", static_resource_closure: {} }],
          },
        },
      ],
      [
        "canvas",
        {
          receipt: {
            package_contract: { primary_routes: 1 },
            routes: [{ projection_file: "demo/index.html", static_resource_closure: {} }],
          },
        },
      ],
    ]),
  };
}

async function createFixtureRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "prod-carrier-fixture-"));
  await git(root, ["init", "--quiet"]);
  await git(root, ["config", "user.name", "Carrier Test"]);
  await git(root, ["config", "user.email", "carrier@example.test"]);
  await mkdir(path.join(root, "visitor"), { recursive: true });
  await mkdir(path.join(root, "deployment/cpanel"), { recursive: true });
  const index = [
    "<!doctype html>",
    '<link rel="canonical" href="https://vik.guru/">',
    '<iframe src="https://iframes.vik.guru/v1/core/demo/"></iframe>',
  ].join("\n");
  await writeFile(path.join(root, "visitor/index.html"), index, "utf8");
  await writeFile(
    path.join(root, primaryManifestRelativePath),
    `${JSON.stringify(primaryManifest([
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
  const sourceSha = await commitFixture(root, "Accept source fixture");
  return {
    root,
    index,
    sourceSha,
    configurationPath: path.join(root, configurationRelativePath),
    carrierRoot: path.join(root, carrierRelativeRoot),
  };
}

async function createProjection(fixture, aggregatePlan = aggregateFixture()) {
  return await createProductionProjectionPlan({
    repositoryRoot: fixture.root,
    sourceSha: fixture.sourceSha,
    configurationPath: fixture.configurationPath,
    aggregatePlan,
  });
}

async function stageAndCommit(fixture, aggregatePlan = aggregateFixture()) {
  const projectionPlan = await createProjection(fixture, aggregatePlan);
  await stageProductionCarrier(projectionPlan);
  const releaseSha = await commitFixture(fixture.root, "Carry production projection");
  return { aggregatePlan, projectionPlan, releaseSha };
}

test("the tracked carrier index is deterministic, exact, and byte-bound to public outputs", async () => {
  const fixture = await createFixtureRoot();
  try {
    const projectionPlan = await createProjection(fixture);
    const first = createProductionCarrierPlan(projectionPlan);
    const second = createProductionCarrierPlan(projectionPlan);
    assert.ok(
      first.outputFiles.get("deployment-files.tsv")
        .equals(second.outputFiles.get("deployment-files.tsv")),
    );

    const lines = first.outputFiles
      .get("deployment-files.tsv")
      .toString("utf8")
      .trimEnd()
      .split("\n");
    assert.equal(
      lines.shift(),
      "deployment_manifest_sha256\tsource_sha\tsurface\tprojected_path\tbytes\tsha256\tmedia_type",
    );
    assert.equal(lines.length, projectionPlan.manifest.outputs.length);
    const indexedPaths = lines.map((line) => line.split("\t")[3]);
    assert.deepEqual(indexedPaths, [...indexedPaths].sort(compareUtf8Paths));
    assert.equal(indexedPaths.includes("deployment-manifest.json"), false);
    const expectedManifestSha = sha256(
      projectionPlan.outputFiles.get("deployment-manifest.json"),
    );
    for (const line of lines) {
      const [
        manifestSha,
        sourceSha,
        surface,
        projectedPath,
        bytes,
        digest,
        mediaType,
      ] = line.split("\t");
      const output = projectionPlan.manifest.outputs.find(
        (candidate) => candidate.projected_path === projectedPath,
      );
      assert.equal(manifestSha, expectedManifestSha);
      assert.equal(sourceSha, fixture.sourceSha);
      assert.equal(surface, output.surface);
      assert.equal(Number(bytes), output.bytes);
      assert.equal(digest, output.sha256);
      assert.equal(mediaType, output.media_type);
    }

    const staged = await stageProductionCarrier(projectionPlan);
    assert.equal(staged.installation, "staged");
    assert.equal(staged.source_sha, fixture.sourceSha);
    assert.ok(
      (await readFile(path.join(fixture.carrierRoot, "primary-public/index.html")))
        .equals(projectionPlan.outputFiles.get("primary-public/index.html")),
    );
    await writeFile(path.join(fixture.carrierRoot, "stale.txt"), "stale", "utf8");
    await stageProductionCarrier(projectionPlan);
    await assert.rejects(readFile(path.join(fixture.carrierRoot, "stale.txt")), {
      code: "ENOENT",
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("carrier-owned files cannot become production source inputs", () => {
  assert.throws(
    () => validatePrimaryManifest(primaryManifest([
      {
        source_path: "deployment/cpanel/carrier/primary-public/index.html",
        projected_path: "index.html",
        media_type: "text/html",
      },
    ])),
    /stays outside generated carrier root/,
  );
});

test("the CLI staging entrypoint deterministically reruns across carrier-only dirty state", async () => {
  const fixture = await createFixtureRoot();
  try {
    const aggregatePlan = aggregateFixture();
    const options = {
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan,
    };
    const first = await stageProductionCarrierFromRepository(options);
    const firstIndex = await readFile(
      path.join(fixture.carrierRoot, "deployment-files.tsv"),
    );
    await assert.rejects(
      createProjection(fixture, aggregatePlan),
      /requires a clean Git worktree/,
    );

    const second = await stageProductionCarrierFromRepository(options);
    const secondIndex = await readFile(
      path.join(fixture.carrierRoot, "deployment-files.tsv"),
    );
    assert.equal(first.projectionPlan.manifest.source_sha, fixture.sourceSha);
    assert.equal(second.projectionPlan.manifest.source_sha, fixture.sourceSha);
    assert.ok(firstIndex.equals(secondIndex));
    assert.equal(second.verification.installation, "staged");

    await writeFile(path.join(fixture.root, "outside.txt"), "outside", "utf8");
    await assert.rejects(
      stageProductionCarrierFromRepository(options),
      /open path outside its owned root: outside\.txt/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("carrier-only dirty inspection rejects a NUL-delimited path that is not valid UTF-8", () => {
  const statusBytes = Buffer.concat([
    Buffer.from(`?? ${carrierRelativeRoot}/`, "utf8"),
    Buffer.from([0xff, 0]),
  ]);
  assert.throws(
    () => assertCarrierOnlyDirtyStatus(statusBytes),
    /path that is not valid UTF-8/,
  );
});

test("carrier-only dirty inspection checks both sides of a NUL-delimited rename", () => {
  const statusBytes = Buffer.from(
    `R  ${carrierRelativeRoot}/moved.txt\0outside.txt\0`,
    "utf8",
  );
  assert.throws(
    () => assertCarrierOnlyDirtyStatus(statusBytes),
    /open path outside its owned root: outside\.txt/,
  );
});

test("a clean carrier-only release regenerates exactly from its first-parent source", async () => {
  const fixture = await createFixtureRoot();
  try {
    const { aggregatePlan, projectionPlan, releaseSha } = await stageAndCommit(fixture);
    const result = await checkProductionCarrier({
      repositoryRoot: fixture.root,
      configurationPath: fixture.configurationPath,
      aggregatePlan,
    });
    const carrierPlan = createProductionCarrierPlan(projectionPlan);
    assert.deepEqual(result, {
      files: carrierPlan.outputFiles.size,
      bytes: [...carrierPlan.outputFiles.values()].reduce(
        (total, bytes) => total + bytes.byteLength,
        0,
      ),
      source_sha: fixture.sourceSha,
      release_sha: releaseSha,
      relationship: "source_first_parent_carrier_only",
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("carrier verification rejects a release that changes any source-side path", async () => {
  const fixture = await createFixtureRoot();
  try {
    const aggregatePlan = aggregateFixture();
    const projectionPlan = await createProjection(fixture, aggregatePlan);
    await stageProductionCarrier(projectionPlan);
    await writeFile(path.join(fixture.root, "visitor/extra.txt"), "extra", "utf8");
    await commitFixture(fixture.root, "Mix source and carrier changes");
    await assert.rejects(
      checkProductionCarrier({
        repositoryRoot: fixture.root,
        configurationPath: fixture.configurationPath,
        aggregatePlan,
      }),
      /changes a path outside its owned root: visitor\/extra\.txt/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("carrier verification rejects changed bytes and undeclared tracked files", async (t) => {
  await t.test("changed carried bytes", async () => {
    const fixture = await createFixtureRoot();
    try {
      const aggregatePlan = aggregateFixture();
      const projectionPlan = await createProjection(fixture, aggregatePlan);
      await stageProductionCarrier(projectionPlan);
      await writeFile(
        path.join(fixture.carrierRoot, "primary-public/index.html"),
        "tampered",
        "utf8",
      );
      await commitFixture(fixture.root, "Carry altered bytes");
      await assert.rejects(
        checkProductionCarrier({
          repositoryRoot: fixture.root,
          configurationPath: fixture.configurationPath,
          aggregatePlan,
        }),
        /differs from its source plan/,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  await t.test("extra tracked carrier file", async () => {
    const fixture = await createFixtureRoot();
    try {
      const aggregatePlan = aggregateFixture();
      const projectionPlan = await createProjection(fixture, aggregatePlan);
      await stageProductionCarrier(projectionPlan);
      await writeFile(path.join(fixture.carrierRoot, "extra.txt"), "extra", "utf8");
      await commitFixture(fixture.root, "Carry extra bytes");
      await assert.rejects(
        checkProductionCarrier({
          repositoryRoot: fixture.root,
          configurationPath: fixture.configurationPath,
          aggregatePlan,
        }),
        /Tracked production carrier differs from its exact allowlist/,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
});

test("carrier verification rejects a later commit, dirty state, and non-regular output", async (t) => {
  await t.test("source is no longer the release first parent", async () => {
    const fixture = await createFixtureRoot();
    try {
      const { aggregatePlan } = await stageAndCommit(fixture);
      await commitFixture(fixture.root, "Later commit", { allowEmpty: true });
      await assert.rejects(
        checkProductionCarrier({
          repositoryRoot: fixture.root,
          configurationPath: fixture.configurationPath,
          aggregatePlan,
        }),
        /bound source as a first parent/,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  await t.test("worktree is dirty", async () => {
    const fixture = await createFixtureRoot();
    try {
      const { aggregatePlan } = await stageAndCommit(fixture);
      await writeFile(path.join(fixture.root, "untracked.txt"), "open", "utf8");
      await assert.rejects(
        checkProductionCarrier({
          repositoryRoot: fixture.root,
          configurationPath: fixture.configurationPath,
          aggregatePlan,
        }),
        /requires a clean Git worktree/,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  await t.test("tracked output is a symbolic link", async () => {
    const fixture = await createFixtureRoot();
    try {
      const aggregatePlan = aggregateFixture();
      const projectionPlan = await createProjection(fixture, aggregatePlan);
      await stageProductionCarrier(projectionPlan);
      const target = path.join(fixture.carrierRoot, "primary-public/index.html");
      await rm(target);
      await symlink("../deployment-manifest.json", target);
      await commitFixture(fixture.root, "Carry symbolic output");
      await assert.rejects(
        checkProductionCarrier({
          repositoryRoot: fixture.root,
          configurationPath: fixture.configurationPath,
          aggregatePlan,
        }),
        /regular non-executable blob/,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
});

test("staging preserves a pre-existing carrier outside the builder's ownership", async () => {
  const fixture = await createFixtureRoot();
  try {
    const projectionPlan = await createProjection(fixture);
    await mkdir(fixture.carrierRoot, { recursive: true });
    await writeFile(path.join(fixture.carrierRoot, "owner.txt"), "external", "utf8");
    await assert.rejects(
      stageProductionCarrier(projectionPlan),
      /no owned deployment manifest|outside this builder's ownership/,
    );
    assert.equal(
      await readFile(path.join(fixture.carrierRoot, "owner.txt"), "utf8"),
      "external",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

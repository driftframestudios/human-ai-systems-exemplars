import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  createCarrierTransferEnvelope,
  createDeterministicZip,
  inspectCarrierZip,
  loadTaggedProductionCarrier,
  verifyCarrierTransferEnvelope,
  writeCarrierTransferEnvelope,
  withGitBlobReader,
} from "../../tools/package-prod-carrier-transfer.mjs";

import { createTaggedIframePlan, verifyLiveIframeRoutes } from "../../tools/verify-live-iframe-routes.mjs";

const execFileAsync = promisify(execFile);
const carrierRoot = "deployment/cpanel/carrier";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
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
  return await git(root, ["rev-parse", "HEAD"]);
}

async function createTaggedCarrier(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "carrier-transfer-"));
  await git(root, ["init", "--quiet"]);
  await git(root, ["config", "user.name", "Carrier Transfer Test"]);
  await git(root, ["config", "user.email", "carrier-transfer@example.test"]);
  const iframeBytes = Buffer.from("<!doctype html><title>Iframe</title>\n");
  await writeFile(path.join(root, "README.md"), "source\n", "utf8");
  if (options.renameIntoCarrier) {
    await writeFile(path.join(root, "source-payload.html"), iframeBytes);
  }
  const sourceSha = await commit(root, "Accept source");

  const outputs = new Map([
    ...(options.iframeRootPaths ?? []).map(name => ["iframe-public/" + name, Buffer.from("User-agent: *\n")]),
    ["iframe-public/v1/core/demo/index.html", iframeBytes],
    ["primary-public/index.html", Buffer.from("<!doctype html><title>Primary</title>\n")],
  ]);
  const records = [...outputs].map(([projectedPath, bytes]) => ({
    surface: options.surfaceOverrides?.[projectedPath] ??
      (projectedPath.startsWith("iframe-public/") ? "iframe" : "primary"),
    projected_path: projectedPath,
    bytes: bytes.byteLength,
    sha256: sha256(bytes),
    media_type: projectedPath.endsWith(".txt") ? "text/plain" : "text/html",
  }));
  const totals = (surface) => {
    const selected = records.filter((record) => record.surface === surface);
    return {
      files: selected.length,
      bytes: selected.reduce((sum, record) => sum + record.bytes, 0),
    };
  };
  const manifest = {
    id: "prod-projection.deployment-manifest.v1",
    version: "1",
    source_sha: sourceSha,
    surfaces: {
      primary: totals("primary"),
      iframe: totals("iframe"),
    },
    outputs: records,
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const manifestDigest = sha256(manifestBytes);
  const indexHeader =
    "deployment_manifest_sha256\tsource_sha\tsurface\tprojected_path\tbytes\tsha256\tmedia_type";
  const indexBytes = Buffer.from(`${[
    indexHeader,
    ...records.map((record) => [
      manifestDigest,
      sourceSha,
      record.surface,
      record.projected_path,
      record.bytes,
      record.sha256,
      record.media_type,
    ].join("\t")),
  ].join("\n")}\n`);

  for (const [relativePath, bytes] of outputs) {
    const target = path.join(root, carrierRoot, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    if (options.renameIntoCarrier && relativePath.startsWith("iframe-public/")) {
      await rename(path.join(root, "source-payload.html"), target);
    } else {
      await writeFile(target, bytes);
    }
  }
  await writeFile(path.join(root, carrierRoot, "deployment-manifest.json"), manifestBytes);
  await writeFile(path.join(root, carrierRoot, "deployment-files.tsv"), indexBytes);
  if (options.sourceDrift) {
    await writeFile(path.join(root, "source-drift.txt"), "drift\n", "utf8");
  }
  const executablePath = path.join(root, carrierRoot, "primary-public/index.html");
  if (options.executable) await chmod(executablePath, 0o755);
  const releaseSha = await commit(root, "Carry production projection");
  const tag = options.tag ?? "production-v9.8.7";
  if (options.lightweight) {
    await git(root, ["tag", tag]);
  } else {
    await git(root, ["tag", "-a", tag, "-m", "Production fixture"]);
  }
  return { root, sourceSha, releaseSha, tag, outputs };
}

async function withFixture(options, callback) {
  const fixture = await createTaggedCarrier(options);
  try {
    return await callback(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

function clone(bytes) {
  return Buffer.from(bytes);
}

function endOffset(archive) {
  return archive.byteLength - 22;
}

function centralOffset(archive) {
  return archive.readUInt32LE(endOffset(archive) + 16);
}

function replaceArchivePath(archive, currentPath, replacementPath) {
  assert.equal(Buffer.byteLength(currentPath), Buffer.byteLength(replacementPath));
  const changed = clone(archive);
  const current = Buffer.from(currentPath);
  const replacement = Buffer.from(replacementPath);
  const localNameOffset = 30;
  assert.ok(changed.subarray(localNameOffset, localNameOffset + current.length).equals(current));
  replacement.copy(changed, localNameOffset);
  const centralNameOffset = centralOffset(changed) + 46;
  assert.ok(changed.subarray(centralNameOffset, centralNameOffset + current.length).equals(current));
  replacement.copy(changed, centralNameOffset);
  return changed;
}

function appendMemberData(archive, extra) {
  const oldCentralOffset = centralOffset(archive);
  const changed = Buffer.concat([
    archive.subarray(0, oldCentralOffset),
    extra,
    archive.subarray(oldCentralOffset),
  ]);
  const newCentralOffset = oldCentralOffset + extra.byteLength;
  const oldCompressedSize = archive.readUInt32LE(18);
  changed.writeUInt32LE(oldCompressedSize + extra.byteLength, 18);
  changed.writeUInt32LE(oldCompressedSize + extra.byteLength, newCentralOffset + 20);
  changed.writeUInt32LE(newCentralOffset, endOffset(changed) + 16);
  return changed;
}

test("live iframe verification uses the selected carrier’s v1 bytes and leaves root robots to cutover", async () => {
  await withFixture({ iframeRootPaths: ["robots.txt"] }, async (fixture) => {
    const path = "core/demo/index.html";
    const plan = await createTaggedIframePlan({ repository: fixture.root, productionTag: fixture.tag });
    assert.deepEqual([...plan.outputFiles.keys()], [path]);
    const fetchImplementation = async (url) => {
      assert.equal(url.pathname, "/v1/core/demo/");
      return new Response(fixture.outputs.get("iframe-public/v1/" + path), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    };
    const tagged = await verifyLiveIframeRoutes({ plan, fetchImplementation });
    assert.equal(tagged.ok, true);
    assert.equal(tagged.counts.exactBytes, 1);
    assert.equal(tagged.carrier.releaseSha, fixture.releaseSha);
    assert.equal(tagged.carrier.sourceSha, fixture.sourceSha);

    const standalone = { outputFiles: new Map([[path, Buffer.from("<!doctype html>\n<title>Iframe</title>\n")]]) };
    const other = await verifyLiveIframeRoutes({ plan: standalone, fetchImplementation });
    assert.equal(other.ok, false);
    assert.equal(other.counts.status200, 1);
    assert.equal(other.counts.exactBytes, 0);
  });
});

test("the tagged iframe selector accounts for every indexed surface before live requests", async t => {
  const robots = { iframeRootPaths: ["robots.txt"] };
  for (const [label, options, expected] of [
    ["additional iframe root", { iframeRootPaths: ["robots.txt", "undeclared.txt"] }, /outside v1: iframe-public\/undeclared\.txt/],
    ["missing root robots file", {}, /missing iframe-public\/robots\.txt/],
    [
      "iframe entry classified as primary",
      { ...robots, surfaceOverrides: { "iframe-public/v1/core/demo/index.html": "primary" } },
      /disagrees with its primary surface/,
    ],
    [
      "primary entry classified as iframe",
      { ...robots, surfaceOverrides: { "primary-public/index.html": "iframe" } },
      /disagrees with its iframe surface/,
    ],
  ]) {
    await t.test(label, () => withFixture(options, fixture => assert.rejects(
      createTaggedIframePlan({ repository: fixture.root, productionTag: fixture.tag }), expected,
    )));
  }
});

test("a tagged carrier forms a deterministic, self-verifying transfer envelope", async () => {
  await withFixture({}, async (fixture) => {
    const createdAt = "2026-09-24T12:00:00.000Z";
    const first = await createCarrierTransferEnvelope({
      repository: fixture.root,
      productionTag: fixture.tag,
      createdAt,
    });
    const second = await createCarrierTransferEnvelope({
      repository: fixture.root,
      productionTag: fixture.tag,
      createdAt,
    });
    assert.ok(first.archive.equals(second.archive));
    assert.ok(first.receiptBytes.equals(second.receiptBytes));
    assert.equal(first.receipt.payload.release_sha, fixture.releaseSha);
    assert.equal(first.receipt.payload.source_sha, fixture.sourceSha);
    assert.equal(first.receipt.payload.files, 4);
    assert.equal(first.receipt.payload.primary.files, 1);
    assert.equal(first.receipt.payload.iframe.files, 1);

    const outputDirectory = path.join(fixture.root, "transfer-output");
    const written = await writeCarrierTransferEnvelope({
      repository: fixture.root,
      productionTag: fixture.tag,
      outputDirectory,
      createdAt,
    });
    const verified = await verifyCarrierTransferEnvelope({
      repository: fixture.root,
      receiptPath: written.receiptPath,
      expectedProductionTag: fixture.tag,
    });
    assert.equal(verified.inspection.archiveSha256, first.receipt.archive.sha256);
    await assert.rejects(
      verifyCarrierTransferEnvelope({
        repository: fixture.root,
        receiptPath: written.receiptPath,
        expectedProductionTag: "production-v1.2.3",
      }),
      /operator-selected production tag/,
    );
    await assert.rejects(
      writeCarrierTransferEnvelope({
        repository: fixture.root,
        productionTag: fixture.tag,
        outputDirectory,
      }),
      /output directory must be empty/,
    );
  });
});

test("tag and carrier relationship checks reject ambiguous production inputs", async (t) => {
  await t.test("lightweight tag", async () => {
    await withFixture({ lightweight: true }, async (fixture) => {
      await assert.rejects(
        loadTaggedProductionCarrier({ repository: fixture.root, productionTag: fixture.tag }),
        /must be annotated/,
      );
    });
  });
  await t.test("source-side change", async () => {
    await withFixture({ sourceDrift: true }, async (fixture) => {
      await assert.rejects(
        loadTaggedProductionCarrier({ repository: fixture.root, productionTag: fixture.tag }),
        /only inside the carrier root/,
      );
    });
  });
  await t.test("source path renamed into the carrier", async () => {
    await withFixture({ renameIntoCarrier: true }, async (fixture) => {
      await assert.rejects(
        loadTaggedProductionCarrier({ repository: fixture.root, productionTag: fixture.tag }),
        /only inside the carrier root/,
      );
    });
  });
  await t.test("executable carrier blob", async () => {
    await withFixture({ executable: true }, async (fixture) => {
      await assert.rejects(
        loadTaggedProductionCarrier({ repository: fixture.root, productionTag: fixture.tag }),
        /regular non-executable blob/,
      );
    });
  });
  await t.test("unexpected tag form", async () => {
    await withFixture({ tag: "release-v9.8.7" }, async (fixture) => {
      await assert.rejects(
        loadTaggedProductionCarrier({ repository: fixture.root, productionTag: fixture.tag }),
        /production-vMAJOR\.MINOR\.PATCH/,
      );
    });
  });
});

test("the ZIP boundary rejects traversal, special modes, metadata drift, and excess", () => {
  const originalPath = "root/okay.txt";
  const expectedFiles = new Map([[originalPath, Buffer.from("okay")]]);
  const archive = createDeterministicZip([{
    path: originalPath,
    bytes: expectedFiles.get(originalPath),
  }]);
  assert.equal(inspectCarrierZip(archive, { expectedFiles, rootDirectory: "root" }).entries, 1);

  assert.throws(
    () => inspectCarrierZip(replaceArchivePath(archive, originalPath, "root/../x.txt")),
    /relative, normalized, and portable/,
  );
  assert.throws(
    () => inspectCarrierZip(replaceArchivePath(archive, originalPath, "/oot/okay.txt")),
    /relative, normalized, and portable/,
  );

  const specialMode = clone(archive);
  specialMode.writeUInt32LE((0o120777 << 16) >>> 0, centralOffset(specialMode) + 38);
  assert.throws(() => inspectCarrierZip(specialMode), /bounded regular UTF-8 file/);

  const metadataDrift = clone(archive);
  metadataDrift.writeUInt32LE(
    (metadataDrift.readUInt32LE(14) + 1) >>> 0,
    14,
  );
  assert.throws(() => inspectCarrierZip(metadataDrift), /local and central metadata differ/);

  assert.throws(
    () => inspectCarrierZip(appendMemberData(archive, Buffer.from("SECRET")), {
      expectedFiles,
      rootDirectory: "root",
    }),
    /trailing compressed data/,
  );

  assert.throws(
    () => inspectCarrierZip(archive, { limits: { maxEntries: 1, maxExpandedBytes: 3 } }),
    /expanded-byte boundary/,
  );
  assert.throws(
    () => inspectCarrierZip(archive, {
      expectedFiles: new Map([[originalPath, Buffer.from("different")]]),
    }),
    /bytes differ from the tagged carrier/,
  );
  assert.throws(
    () => createDeterministicZip([
      { path: "root/A.txt", bytes: Buffer.from("a") },
      { path: "root/a.txt", bytes: Buffer.from("b") },
    ]),
    /repeats a normalized path/,
  );
  assert.throws(
    () => createDeterministicZip([{ path: "../escape.txt", bytes: Buffer.from("x") }]),
    /relative, normalized, and portable/,
  );
  assert.throws(
    () => createDeterministicZip([{
      path: `root/${"x".repeat(256)}`,
      bytes: Buffer.from("x"),
    }]),
    /portable path-length boundary/,
  );
  assert.throws(
    () => createDeterministicZip([{ path: originalPath, bytes: Buffer.from("x"), mode: 0o100755 }]),
    /non-executable regular file/,
  );
});

test("archive mutation fails the external receipt before activation", async () => {
  await withFixture({}, async (fixture) => {
    const outputDirectory = path.join(fixture.root, "transfer-output");
    const written = await writeCarrierTransferEnvelope({
      repository: fixture.root,
      productionTag: fixture.tag,
      outputDirectory,
      createdAt: "2026-09-24T12:00:00.000Z",
    });
    const archive = await readFile(written.archivePath);
    archive[Math.floor(archive.length / 2)] ^= 0x01;
    await writeFile(written.archivePath, archive);
    await assert.rejects(
      verifyCarrierTransferEnvelope({
        repository: fixture.root,
        receiptPath: written.receiptPath,
        expectedProductionTag: fixture.tag,
      }),
      /digest or byte count differs from its receipt/,
    );
  });
});

test("the Git batch reader returns binary and empty blobs and rejects missing objects", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "carrier-git-blobs-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ["init", "-q"]);
  const binary = Buffer.alloc(256 * 1024 + 3);
  for (let index = 0; index < binary.length; index++) binary[index] = index % 256;
  await writeFile(path.join(root, "binary"), binary);
  await writeFile(path.join(root, "empty"), "");
  const binaryId = await git(root, ["hash-object", "-w", "binary"]);
  const emptyId = await git(root, ["hash-object", "-w", "empty"]);
  const bounds = { maxBlobBytes: binary.length };
  await withGitBlobReader(root, bounds, async readBlob => {
    assert.deepEqual(await readBlob(binaryId), binary);
    assert.equal((await readBlob(emptyId, 0)).length, 0);
    assert.deepEqual(await readBlob(binaryId), binary);
  });
  await assert.rejects(withGitBlobReader(root, bounds, readBlob => readBlob(binaryId, 3)), /Git batch blob size/);
  await assert.rejects(withGitBlobReader(root, bounds, readBlob => readBlob("0".repeat(40))), /requested object as a blob/);
});

test("malformed Git batch replies release the owned child", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "carrier-git-protocol-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const oid = "a".repeat(40);
  const pidFile = path.join(root, "pid");
  const command = `#!${process.execPath}
const fs = require("node:fs");
fs.writeFileSync("pid", String(process.pid));
process.stdin.once("data", () => {
  process.stdout.write(Buffer.from(process.env.REPLY, "base64"), () => {
    if (process.env.TRUNCATED === "yes") process.exit(0);
  });
});
`;
  await writeFile(path.join(root, "git"), command, { mode: 0o755 });
  for (const [reply, error, truncated] of [
    [`${"b".repeat(40)} blob 1\nx\n`, /requested object as a blob/],
    [`${oid} tree 1\nx\n`, /requested object as a blob/],
    [`${oid} blob -1\n`, /requested object as a blob/],
    [`${oid} blob 50\n`, /Git batch blob size/],
    ["x".repeat(101), /header exceeds/],
    [`${oid} blob 4\na`, /complete blob frame/, true],
    [`${oid} blob 1\nx!`, /payload terminator/],
    [`${oid} blob 1\nx\ny`, /trailing bytes/],
  ]) {
    const env = {
      PATH: root,
      REPLY: Buffer.from(reply).toString("base64"),
      TRUNCATED: truncated ? "yes" : "no",
    };
    await assert.rejects(withGitBlobReader(root, { maxBlobBytes: 4, env }, readBlob => readBlob(oid)), error);
    const pid = Number(await readFile(pidFile, "utf8"));
    assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
  }
});

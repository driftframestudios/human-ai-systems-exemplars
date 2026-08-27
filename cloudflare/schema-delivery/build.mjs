import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const deliveryDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(deliveryDirectory, "../..");
const distributionDirectory = path.join(deliveryDirectory, "dist");

const schemaReceipt = {
  target: "prototype-exemplars/1.0.0/prototype-exemplars.schema.json",
  sizeBytes: 12309,
  sha256: "42910b5238a62c666cf5fcdbdc5a364b64d7c5301d959ac9bdaea11c8743ccf2",
};

const publicFiles = [
  {
    source: "cloudflare/schema-delivery/source/_headers",
    target: "_headers",
  },
  {
    source: "cloudflare/schema-delivery/source/404.html",
    target: "404.html",
  },
  {
    source: "cloudflare/schema-delivery/source/index.html",
    target: "index.html",
  },
  {
    source: "schemas/prototype-exemplars/1.0.0/prototype-exemplars.schema.json",
    target: schemaReceipt.target,
  },
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertBoundedPaths() {
  const expectedDistribution = path.resolve(deliveryDirectory, "dist");
  if (path.resolve(distributionDirectory) !== expectedDistribution) {
    throw new Error(`Refusing an unexpected distribution path: ${distributionDirectory}`);
  }

  const targets = new Set();
  for (const entry of publicFiles) {
    if (
      path.isAbsolute(entry.source) ||
      path.isAbsolute(entry.target) ||
      path.posix.normalize(entry.source) !== entry.source ||
      path.posix.normalize(entry.target) !== entry.target ||
      entry.source.startsWith("../") ||
      entry.target.startsWith("../")
    ) {
      throw new Error(`Public allowlist paths must be normalized repository-relative paths: ${entry.target}`);
    }
    if (targets.has(entry.target)) {
      throw new Error(`Duplicate public target: ${entry.target}`);
    }
    targets.add(entry.target);
  }
}

async function assertRegularFile(filePath, label) {
  const status = await lstat(filePath);
  if (status.isSymbolicLink() || !status.isFile()) {
    throw new Error(`${label} must resolve to a regular file: ${filePath}`);
  }
}

async function listFiles(directory, relativeDirectory = "") {
  const entries = await readdir(path.join(directory, relativeDirectory), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Generated public output contains a symbolic link: ${relativePath}`);
    }
    if (entry.isDirectory()) {
      files.push(...await listFiles(directory, relativePath));
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`Generated public output contains a non-file entry: ${relativePath}`);
    }
    files.push(relativePath);
  }

  return files.sort();
}

function assertSchemaReceipt(bytes, label) {
  if (bytes.byteLength !== schemaReceipt.sizeBytes) {
    throw new Error(`${label} has ${bytes.byteLength} bytes; expected ${schemaReceipt.sizeBytes}.`);
  }
  const digest = sha256(bytes);
  if (digest !== schemaReceipt.sha256) {
    throw new Error(`${label} has SHA-256 ${digest}; expected ${schemaReceipt.sha256}.`);
  }
}

async function checkDistribution() {
  const actualFiles = await listFiles(distributionDirectory);
  const expectedFiles = publicFiles.map(({ target }) => target).sort();

  const missing = expectedFiles.filter((file) => !actualFiles.includes(file));
  const extra = actualFiles.filter((file) => !expectedFiles.includes(file));
  if (missing.length || extra.length) {
    throw new Error([
      "Generated schema delivery differs from the explicit allowlist.",
      missing.length ? `Missing: ${missing.join(", ")}` : "",
      extra.length ? `Extra: ${extra.join(", ")}` : "",
    ].filter(Boolean).join("\n"));
  }

  let totalBytes = 0;
  for (const entry of publicFiles) {
    const sourcePath = path.join(repositoryRoot, entry.source);
    const targetPath = path.join(distributionDirectory, entry.target);
    await assertRegularFile(sourcePath, "Allowlisted source");
    await assertRegularFile(targetPath, "Generated output");
    const [sourceBytes, targetBytes] = await Promise.all([
      readFile(sourcePath),
      readFile(targetPath),
    ]);
    if (!sourceBytes.equals(targetBytes)) {
      throw new Error(`Generated output differs byte-for-byte from its source: ${entry.target}`);
    }
    if (entry.target === schemaReceipt.target) {
      assertSchemaReceipt(sourceBytes, "Schema source");
      assertSchemaReceipt(targetBytes, "Generated schema");
    }
    totalBytes += targetBytes.byteLength;
  }

  console.log([
    `Schema delivery verified: ${publicFiles.length} allowlisted files, ${totalBytes} bytes.`,
    `Prototype Exemplars 1.0.0: ${schemaReceipt.sizeBytes} bytes, SHA-256 ${schemaReceipt.sha256}.`,
  ].join("\n"));
}

async function buildDistribution() {
  await rm(distributionDirectory, { recursive: true, force: true });

  for (const entry of publicFiles) {
    const sourcePath = path.join(repositoryRoot, entry.source);
    const targetPath = path.join(distributionDirectory, entry.target);
    await assertRegularFile(sourcePath, "Allowlisted source");
    await mkdir(path.dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
  }

  await checkDistribution();
}

async function main() {
  assertBoundedPaths();
  const arguments_ = process.argv.slice(2);
  if (arguments_.length === 0) {
    await buildDistribution();
    return;
  }
  if (arguments_.length === 1 && arguments_[0] === "--check") {
    await checkDistribution();
    return;
  }
  throw new Error(`Usage: node ${path.relative(repositoryRoot, fileURLToPath(import.meta.url))} [--check]`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

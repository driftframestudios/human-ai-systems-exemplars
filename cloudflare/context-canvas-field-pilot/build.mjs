import '../../tools/node-runtime-admission.mjs';
import { copyFile, lstat, mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pilotDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(pilotDirectory, "../..");
const distributionDirectory = path.join(pilotDirectory, "dist");

const publicFiles = [
  {
    source: "cloudflare/context-canvas-field-pilot/source/_headers",
    target: "_headers",
  },
  {
    source: "cloudflare/context-canvas-field-pilot/source/404.html",
    target: "404.html",
  },
  {
    source: "context-canvas-project-surface/context-canvas/apple-touch-icon.png",
    target: "context-canvas-project-surface/context-canvas/apple-touch-icon.png",
  },
  {
    source: "context-canvas-project-surface/context-canvas/canvas-shell.css",
    target: "context-canvas-project-surface/context-canvas/canvas-shell.css",
  },
  {
    source: "context-canvas-project-surface/context-canvas/canvas-shell.js",
    target: "context-canvas-project-surface/context-canvas/canvas-shell.js",
  },
  {
    source: "context-canvas-project-surface/context-canvas/expanded.css",
    target: "context-canvas-project-surface/context-canvas/expanded.css",
  },
  {
    source: "context-canvas-project-surface/context-canvas/favicon-32x32.png",
    target: "context-canvas-project-surface/context-canvas/favicon-32x32.png",
  },
  {
    source: "context-canvas-project-surface/context-canvas/favicon.ico",
    target: "context-canvas-project-surface/context-canvas/favicon.ico",
  },
  {
    source: "context-canvas-project-surface/context-canvas/field-inspection-harness-replatform.html",
    target: "context-canvas-project-surface/context-canvas/field-inspection-harness-replatform.html",
  },
  {
    source: "context-canvas-project-surface/context-canvas/field-inspection.css",
    target: "context-canvas-project-surface/context-canvas/field-inspection.css",
  },
  {
    source: "context-canvas-project-surface/context-canvas/safari-pinned-tab.svg",
    target: "context-canvas-project-surface/context-canvas/safari-pinned-tab.svg",
  },
  {
    source: "context-canvas-project-surface/img/plot/field_inspection_authority_validation_map.svg",
    target: "context-canvas-project-surface/img/plot/field_inspection_authority_validation_map.svg",
  },
  {
    source: "context-canvas-project-surface/img/plot/inspection_platform_operating_map.svg",
    target: "context-canvas-project-surface/img/plot/inspection_platform_operating_map.svg",
  },
  {
    source: "context-canvas-project-surface/img/plot/inspection_staged_capital_map.svg",
    target: "context-canvas-project-surface/img/plot/inspection_staged_capital_map.svg",
  },
];

function assertBoundedPaths() {
  const expectedDistribution = path.resolve(pilotDirectory, "dist");
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

async function checkDistribution() {
  const actualFiles = await listFiles(distributionDirectory);
  const expectedFiles = publicFiles.map(({ target }) => target).sort();

  const missing = expectedFiles.filter((file) => !actualFiles.includes(file));
  const extra = actualFiles.filter((file) => !expectedFiles.includes(file));
  if (missing.length || extra.length) {
    throw new Error([
      "Generated public output differs from the explicit allowlist.",
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
    totalBytes += targetBytes.byteLength;
  }

  console.log(`Context Canvas Field pilot verified: ${publicFiles.length} allowlisted files, ${totalBytes} bytes.`);
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

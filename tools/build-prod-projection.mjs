import { execFile } from "node:child_process";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  assertPackageOutputPath,
  assertRegularFileWithin,
  sha256,
  verifyPackagePlan,
  writePackagePlan,
} from "./iframe-route-package-engine.mjs";
import { createAggregatePackagePlan } from "./package-v1-iframe-routes.mjs";

const execFileAsync = promisify(execFile);
const toolPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(toolPath), "..");

const configurationId = "prod-projection.configuration.v1";
const primaryManifestId = "prod-projection.primary-route-manifest.v1";
const deploymentManifestId = "prod-projection.deployment-manifest.v1";
const aggregateReceiptId = "iframe-routes.aggregate-package-receipt.v1";

const excludedPrimaryRoots = new Set([
  ".agents",
  ".git",
  ".github",
  ".iframe-route-build",
  ".prod-projection-build",
  ".public-reference-build",
  ".visual-runs",
  "gist-registry",
  "node_modules",
  "planning",
  "tests",
  "threadkeeping",
  "tools",
]);

const mediaTypesByExtension = new Map([
  [".avif", new Set(["image/avif"])],
  [".css", new Set(["text/css"])],
  [".gif", new Set(["image/gif"])],
  [".html", new Set(["text/html"])],
  [".ico", new Set(["image/x-icon"])],
  [".jpeg", new Set(["image/jpeg"])],
  [".jpg", new Set(["image/jpeg"])],
  [
    ".json",
    new Set([
      "application/json",
      "application/ld+json",
      "application/manifest+json",
      "application/schema+json",
    ]),
  ],
  [".jsonld", new Set(["application/ld+json"])],
  [".js", new Set(["text/javascript"])],
  [".mjs", new Set(["text/javascript"])],
  [".png", new Set(["image/png"])],
  [".svg", new Set(["image/svg+xml"])],
  [".txt", new Set(["text/plain"])],
  [".webmanifest", new Set(["application/manifest+json"])],
  [".webp", new Set(["image/webp"])],
  [".woff", new Set(["font/woff"])],
  [".woff2", new Set(["font/woff2"])],
  [".xml", new Set(["application/xml", "image/svg+xml"])],
]);

export const productionProjectionDefaults = Object.freeze({
  repositoryRoot,
  configurationPath: path.join(
    repositoryRoot,
    "deployment/cpanel/production-projection.config.json",
  ),
  outputRoot: path.join(repositoryRoot, ".prod-projection-build"),
});

function fail(message) {
  throw new Error(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, expectedKeys, label) {
  if (!isPlainObject(value)) fail(`${label} must be an object.`);
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(`${label} must contain exactly: ${expected.join(", ")}.`);
  }
}

function portablePathKey(relativePath) {
  return relativePath.normalize("NFC").toLowerCase();
}

function assertPortableProjectionPath(relativePath, label) {
  const safePath = assertPackageOutputPath(relativePath);
  if (safePath !== safePath.normalize("NFC")) {
    fail(`${label} must use Unicode NFC.`);
  }
  for (const component of safePath.split(path.posix.sep)) {
    if (
      /[\u0000-\u001f\u007f<>:"/\\|?*]/.test(component) ||
      /[. ]$/.test(component) ||
      /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(component)
    ) {
      fail(`${label} must remain portable across cPanel and common local filesystems: ${safePath}.`);
    }
  }
  return safePath;
}

function assertPrimarySourcePath(sourcePath) {
  const safePath = assertPortableProjectionPath(
    sourcePath,
    "Primary projection source path",
  );
  const components = safePath.split(path.posix.sep);
  const rootKey = components[0].normalize("NFC").toLowerCase();
  if (excludedPrimaryRoots.has(rootKey)) {
    fail(`Primary projection source stays outside repository-only root ${components[0]}.`);
  }
  if (components.some((component) => {
    const key = component.normalize("NFC").toLowerCase();
    return key === ".env" || key.startsWith(".env.");
  })) {
    fail(`Primary projection source stays outside environment files: ${sourcePath}.`);
  }
  return safePath;
}

function assertMediaType(relativePath, mediaType, label) {
  if (typeof mediaType !== "string" || mediaType.length === 0) {
    fail(`${label} requires a media_type.`);
  }
  const allowed = mediaTypesByExtension.get(path.posix.extname(relativePath).toLowerCase());
  if (!allowed?.has(mediaType)) {
    fail(`${label} media type ${mediaType} does not match ${relativePath}.`);
  }
  return mediaType;
}

function validateConfiguration(configuration) {
  assertExactKeys(
    configuration,
    ["id", "version", "primary_manifest"],
    "Production projection configuration",
  );
  if (configuration.id !== configurationId || configuration.version !== "1") {
    fail(`Production projection configuration must use ${configurationId} version 1.`);
  }
  configuration.primary_manifest = assertPortableProjectionPath(
    configuration.primary_manifest,
    "Primary manifest path",
  );
  return configuration;
}

export function validatePrimaryManifest(primaryManifest) {
  assertExactKeys(
    primaryManifest,
    ["id", "version", "files"],
    "Primary route manifest",
  );
  if (primaryManifest.id !== primaryManifestId || primaryManifest.version !== "1") {
    fail(`Primary route manifest must use ${primaryManifestId} version 1.`);
  }
  if (!Array.isArray(primaryManifest.files) || primaryManifest.files.length === 0) {
    fail("Primary route manifest must declare at least one file.");
  }

  const sourcePaths = new Set();
  const projectedPaths = new Set();
  const portableProjectedPaths = new Set();
  const files = primaryManifest.files.map((entry, index) => {
    const label = `Primary route manifest file ${index + 1}`;
    assertExactKeys(
      entry,
      ["source_path", "projected_path", "media_type"],
      label,
    );
    const sourcePath = assertPrimarySourcePath(entry.source_path);
    const projectedPath = assertPortableProjectionPath(
      entry.projected_path,
      `${label} projected path`,
    );
    const portableProjectedPath = portablePathKey(projectedPath);
    if (sourcePaths.has(sourcePath)) {
      fail(`Primary route manifest repeats source ${sourcePath}.`);
    }
    if (
      projectedPaths.has(projectedPath) ||
      portableProjectedPaths.has(portableProjectedPath)
    ) {
      fail(`Primary route manifest output collides at ${projectedPath}.`);
    }
    sourcePaths.add(sourcePath);
    projectedPaths.add(projectedPath);
    portableProjectedPaths.add(portableProjectedPath);
    return {
      source_path: sourcePath,
      projected_path: projectedPath,
      media_type: assertMediaType(projectedPath, entry.media_type, label),
    };
  });

  if (!projectedPaths.has("index.html")) {
    fail("Primary route manifest must project index.html at the primary root.");
  }

  return {
    id: primaryManifest.id,
    version: primaryManifest.version,
    files: files.sort((left, right) =>
      left.projected_path < right.projected_path
        ? -1
        : left.projected_path > right.projected_path
          ? 1
          : 0,
    ),
  };
}

async function readJsonWithin(root, relativePath, label) {
  const filePath = path.resolve(root, ...relativePath.split(path.posix.sep));
  try {
    await assertRegularFileWithin(root, filePath, label);
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail(`${label} is unavailable at ${relativePath}.`);
    }
    throw error;
  }
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    fail(
      `${label} must contain valid JSON: ${error instanceof Error ? error.message : error}`,
    );
  }
}

export async function loadProductionProjectionInputs(
  configurationPath,
  options = {},
) {
  const root = path.resolve(options.repositoryRoot ?? repositoryRoot);
  const resolvedConfiguration = path.resolve(configurationPath);
  const relativeConfiguration = path.relative(root, resolvedConfiguration);
  if (
    relativeConfiguration === "" ||
    relativeConfiguration === ".." ||
    relativeConfiguration.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeConfiguration)
  ) {
    fail("Production projection configuration must remain inside the repository.");
  }
  const portableConfiguration = relativeConfiguration.split(path.sep).join(path.posix.sep);
  const configuration = validateConfiguration(
    await readJsonWithin(root, portableConfiguration, "Production projection configuration"),
  );
  const primaryManifest = validatePrimaryManifest(
    await readJsonWithin(root, configuration.primary_manifest, "Primary route manifest"),
  );
  return { configuration, primaryManifest };
}

export async function readRepositorySourceSha(root = repositoryRoot) {
  const { stdout: status } = await execFileAsync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=normal"],
    { cwd: root, encoding: "utf8" },
  );
  if (status.length > 0) {
    fail("Production projection requires a clean Git worktree for its source coordinate.");
  }
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  const sourceSha = stdout.trim().toLowerCase();
  if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(sourceSha)) {
    fail("Production projection requires one full Git source SHA.");
  }
  return sourceSha;
}

async function readTrackedBlobIndex(root, sourceSha) {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-tree", "-r", "-z", "--full-tree", sourceSha],
    { cwd: root, encoding: "buffer", maxBuffer: 128 * 1024 * 1024 },
  );
  const entries = new Map();
  for (const record of stdout.toString("utf8").split("\0")) {
    if (record.length === 0) continue;
    const separator = record.indexOf("\t");
    const metadata = record.slice(0, separator).split(" ");
    const sourcePath = record.slice(separator + 1);
    if (separator < 0 || metadata.length !== 3 || entries.has(sourcePath)) {
      fail("Git source tree returned an ambiguous tracked-file record.");
    }
    entries.set(sourcePath, {
      mode: metadata[0],
      type: metadata[1],
      object: metadata[2],
    });
  }
  return entries;
}

async function readTrackedPrimaryInput(root, sourceSha, trackedBlobs, sourcePath) {
  const entry = trackedBlobs.get(sourcePath);
  if (
    !entry ||
    entry.type !== "blob" ||
    !["100644", "100755"].includes(entry.mode) ||
    !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(entry.object)
  ) {
    fail(`Primary projection source must be a regular tracked blob: ${sourcePath}.`);
  }
  const sourceFile = path.resolve(root, ...sourcePath.split(path.posix.sep));
  await assertRegularFileWithin(root, sourceFile, "Primary projection source");
  const [{ stdout: trackedBytes }, worktreeBytes] = await Promise.all([
    execFileAsync("git", ["cat-file", "blob", entry.object], {
      cwd: root,
      encoding: "buffer",
      maxBuffer: 128 * 1024 * 1024,
    }),
    readFile(sourceFile),
  ]);
  if (!Buffer.isBuffer(trackedBytes) || !worktreeBytes.equals(trackedBytes)) {
    fail(`Primary projection source differs from its tracked blob: ${sourcePath}.`);
  }
  return { bytes: trackedBytes, object: entry.object };
}

async function verifyRepositorySourceState(
  root,
  sourceSha,
  trackedInputs,
) {
  const currentSha = await readRepositorySourceSha(root);
  if (currentSha !== sourceSha) {
    fail("Production projection source coordinate changed during composition.");
  }
  const currentBlobs = await readTrackedBlobIndex(root, currentSha);
  for (const [sourcePath, input] of trackedInputs) {
    if (currentBlobs.get(sourcePath)?.object !== input.object) {
      fail("Production projection tracked blob changed during composition.");
    }
    const sourceFile = path.resolve(root, ...sourcePath.split(path.posix.sep));
    await assertRegularFileWithin(root, sourceFile, "Primary projection source revalidation");
    const currentBytes = await readFile(sourceFile);
    if (!currentBytes.equals(input.bytes)) {
      fail("Production projection source bytes changed during composition.");
    }
  }
}

function assertAggregatePlan(aggregatePlan) {
  if (
    !aggregatePlan ||
    !(aggregatePlan.outputFiles instanceof Map) ||
    !isPlainObject(aggregatePlan.receipt)
  ) {
    fail("Production projection requires an aggregate iframe package plan.");
  }
  const receipt = aggregatePlan.receipt;
  if (
    receipt.id !== aggregateReceiptId ||
    receipt.host !== "iframes.vik.guru" ||
    receipt.base_path !== "/v1/" ||
    !Array.isArray(receipt.package_contract?.family_directories) ||
    receipt.package_contract.family_directories.join(",") !== "core,canvas"
  ) {
    fail("Production projection requires the accepted Core and Canvas aggregate package.");
  }
  const expectedPaths = new Set(["route-manifest.json"]);
  for (const family of ["core", "canvas"]) {
    if (!aggregatePlan.outputFiles.has(`${family}/route-manifest.json`)) {
      fail(`Aggregate iframe package must include ${family}/route-manifest.json.`);
    }
  }
  if (!Buffer.isBuffer(aggregatePlan.outputFiles.get("route-manifest.json"))) {
    fail("Aggregate iframe package must include root route-manifest.json bytes.");
  }
  for (const relativePath of aggregatePlan.outputFiles.keys()) {
    const safePath = assertPortableProjectionPath(
      relativePath,
      "Aggregate iframe package output path",
    );
    if (
      !expectedPaths.has(safePath) &&
      !safePath.startsWith("core/") &&
      !safePath.startsWith("canvas/")
    ) {
      fail(`Aggregate iframe package contains an undeclared family path: ${safePath}.`);
    }
  }
  return aggregatePlan;
}

function aggregateMediaTypes(aggregatePlan) {
  const mediaTypes = new Map();
  const declare = (relativePath, mediaType, label) => {
    assertPortableProjectionPath(relativePath, `${label} path`);
    assertMediaType(relativePath, mediaType, label);
    const existing = mediaTypes.get(relativePath);
    if (existing !== undefined && existing !== mediaType) {
      fail(`Iframe package media type declarations conflict at ${relativePath}.`);
    }
    mediaTypes.set(relativePath, mediaType);
  };
  declare("route-manifest.json", "application/json", "Aggregate route manifest");
  declare("core/manifest.json", "application/json", "Core source manifest");
  declare("core/route-manifest.json", "application/json", "Core route manifest");
  declare("canvas/route-manifest.json", "application/json", "Canvas route manifest");
  for (const [family, familyPlan] of aggregatePlan.familyPlans ?? []) {
    for (const route of familyPlan.receipt?.routes ?? []) {
      declare(
        `${family}/${route.projection_file}`,
        "text/html",
        `Iframe route ${family}/${route.projection_file}`,
      );
      for (const group of ["package_files", "navigation_files"]) {
        for (const file of route.static_resource_closure?.[group] ?? []) {
          declare(
            `${family}/${path.posix.join(path.posix.dirname(route.projection_file), file.target_file)}`,
            file.content_type,
            `Iframe package file ${family}/${file.target_file}`,
          );
        }
      }
    }
  }
  return mediaTypes;
}

function inferredMediaType(relativePath) {
  const allowed = mediaTypesByExtension.get(path.posix.extname(relativePath).toLowerCase());
  if (!allowed || allowed.size !== 1) {
    fail(`Iframe package output requires an explicit media type: ${relativePath}.`);
  }
  return [...allowed][0];
}

function assertPortableOutputCollision(relativePath, outputFiles, portablePaths) {
  const portablePath = portablePathKey(relativePath);
  if (outputFiles.has(relativePath) || portablePaths.has(portablePath)) {
    fail(`Production projection output collides at ${relativePath}.`);
  }
  portablePaths.add(portablePath);
}

function assertResolvedPrimaryBytes(bytes, sourcePath) {
  if (
    /\{\{PUBLIC_URL_(?:REGISTRY|IFRAME)_[A-Z0-9_]+\}\}/.test(
      bytes.toString("utf8"),
    )
  ) {
    fail(`Primary projection source retains an unresolved public URL token: ${sourcePath}.`);
  }
}

function serializeManifest(manifest) {
  return Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export async function createProductionProjectionPlan(options = {}) {
  const root = path.resolve(options.repositoryRoot ?? repositoryRoot);
  if (options.aggregatePlan === undefined && root !== repositoryRoot) {
    fail("An alternate repository root requires an injected aggregate iframe plan.");
  }
  const sourceSha = await readRepositorySourceSha(root);
  if (
    options.sourceSha !== undefined &&
    (typeof options.sourceSha !== "string" ||
      options.sourceSha.toLowerCase() !== sourceSha)
  ) {
    fail("Production projection expected source SHA differs from the clean repository HEAD.");
  }
  if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(sourceSha)) {
    fail("Production projection requires one full Git source SHA.");
  }
  const trackedBlobs = await readTrackedBlobIndex(root, sourceSha);
  const primaryManifest = validatePrimaryManifest(structuredClone(options.primaryManifest));
  const aggregatePlan = assertAggregatePlan(
    options.aggregatePlan ?? await createAggregatePackagePlan(),
  );
  const outputFiles = new Map();
  const portablePaths = new Set();
  const outputs = [];
  const trackedInputs = new Map();
  let primaryBytes = 0;
  let iframeBytes = 0;

  for (const file of primaryManifest.files) {
    const trackedInput = await readTrackedPrimaryInput(
      root,
      sourceSha,
      trackedBlobs,
      file.source_path,
    );
    const bytes = trackedInput.bytes;
    trackedInputs.set(file.source_path, trackedInput);
    assertResolvedPrimaryBytes(bytes, file.source_path);
    const projectedPath = `primary-public/${file.projected_path}`;
    assertPortableOutputCollision(projectedPath, outputFiles, portablePaths);
    outputFiles.set(projectedPath, bytes);
    primaryBytes += bytes.byteLength;
    outputs.push({
      surface: "primary",
      source_path: file.source_path,
      projected_path: projectedPath,
      media_type: file.media_type,
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
      standing: "byte_preserved",
    });
  }

  const iframeMediaTypes = aggregateMediaTypes(aggregatePlan);
  for (const [relativePath, bytes] of [...aggregatePlan.outputFiles.entries()].sort(
    ([left], [right]) => left < right ? -1 : left > right ? 1 : 0,
  )) {
    if (!Buffer.isBuffer(bytes)) {
      fail(`Aggregate iframe package output must be bytes: ${relativePath}.`);
    }
    const projectedPath = `iframe-public/v1/${relativePath}`;
    assertPortableOutputCollision(projectedPath, outputFiles, portablePaths);
    outputFiles.set(projectedPath, bytes);
    iframeBytes += bytes.byteLength;
    const mediaType = iframeMediaTypes.get(relativePath) ?? inferredMediaType(relativePath);
    assertMediaType(relativePath, mediaType, "Iframe package output");
    outputs.push({
      surface: "iframe",
      source_path: `iframe-package:v1/${relativePath}`,
      projected_path: projectedPath,
      media_type: mediaType,
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
      standing: "byte_preserved",
    });
  }

  outputs.sort((left, right) =>
    left.projected_path < right.projected_path
      ? -1
      : left.projected_path > right.projected_path
        ? 1
        : 0,
  );
  await verifyRepositorySourceState(root, sourceSha, trackedInputs);
  const aggregateReceiptBytes = aggregatePlan.outputFiles.get("route-manifest.json");
  const manifest = {
    id: deploymentManifestId,
    version: "1",
    source_sha: sourceSha,
    inputs: {
      primary_manifest: {
        id: primaryManifest.id,
        version: primaryManifest.version,
      },
      iframe_package: {
        id: aggregatePlan.receipt.id,
        host: aggregatePlan.receipt.host,
        base_path: aggregatePlan.receipt.base_path,
        receipt_sha256: sha256(aggregateReceiptBytes),
      },
    },
    surfaces: {
      primary: {
        root: "primary-public/",
        files: primaryManifest.files.length,
        bytes: primaryBytes,
      },
      iframe: {
        root: "iframe-public/",
        files: aggregatePlan.outputFiles.size,
        bytes: iframeBytes,
      },
    },
    outputs,
  };
  outputFiles.set("deployment-manifest.json", serializeManifest(manifest));

  return {
    manifest,
    outputFiles,
    outputRoot: path.join(root, ".prod-projection-build"),
  };
}

async function ensureRegularDirectory(directory) {
  try {
    const status = await lstat(directory);
    if (status.isSymbolicLink() || !status.isDirectory()) {
      fail(`Production projection path must be a regular directory: ${directory}.`);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await mkdir(directory);
  }
}

async function assertOwnedProjection(directory) {
  const status = await lstat(directory);
  if (status.isSymbolicLink() || !status.isDirectory()) {
    fail(`Existing production projection must be a regular directory: ${directory}.`);
  }
  const manifestPath = path.join(directory, "deployment-manifest.json");
  try {
    await assertRegularFileWithin(directory, manifestPath, "Existing deployment manifest");
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail("Existing production projection has no owned deployment manifest.");
    }
    throw error;
  }
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    fail(
      `Existing deployment manifest must contain valid JSON: ` +
      `${error instanceof Error ? error.message : error}`,
    );
  }
  if (manifest.id !== deploymentManifestId || manifest.version !== "1") {
    fail(`Existing production projection is outside this builder's ownership.`);
  }
}

export async function persistProductionProjection(
  plan,
  destination = plan.outputRoot,
  options = {},
) {
  const remove = options.remove ?? rm;
  const root = path.resolve(destination, "..");
  if (
    destination !== plan.outputRoot ||
    path.basename(destination) !== ".prod-projection-build"
  ) {
    fail(`Refusing an unexpected production projection destination: ${destination}.`);
  }
  await ensureRegularDirectory(root);
  const transaction = await mkdtemp(
    path.join(root, ".prod-projection-transaction-"),
  );
  const stage = path.join(transaction, "next");
  const previous = path.join(transaction, "previous");
  let movedPrevious = false;
  let preserveTransaction = false;

  try {
    await mkdir(stage);
    await writePackagePlan(plan, stage);
    const verification = await verifyPackagePlan(plan, stage);
    let destinationStatus = null;
    try {
      destinationStatus = await lstat(destination);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    if (destinationStatus !== null) {
      await assertOwnedProjection(destination);
      await rename(destination, previous);
      movedPrevious = true;
    }
    try {
      await rename(stage, destination);
    } catch (error) {
      if (movedPrevious) {
        try {
          await rename(previous, destination);
        } catch (restoreError) {
          preserveTransaction = true;
          fail(
            `Production projection replacement failed and its prior generation could not be restored. ` +
            `Recovery directory: ${transaction}. Restore error: ` +
            `${restoreError instanceof Error ? restoreError.message : restoreError}.`,
          );
        }
      }
      throw error;
    }
    let cleanup = "complete";
    try {
      await remove(transaction, { recursive: true, force: true });
    } catch {
      cleanup = "incomplete";
    }
    return { ...verification, installation: "installed", cleanup };
  } catch (error) {
    if (!preserveTransaction) {
      try {
        await remove(transaction, { recursive: true, force: true });
      } catch {
        // The original pre-installation failure retains precedence.
      }
    }
    throw error;
  }
}

export async function checkProductionProjection(plan) {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "prod-projection-check-"),
  );
  try {
    await writePackagePlan(plan, temporaryRoot);
    return await verifyPackagePlan(plan, temporaryRoot);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

function parseArguments(args) {
  let mode = null;
  let configurationPath = productionProjectionDefaults.configurationPath;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--build" || argument === "--check") {
      if (mode !== null) fail("Choose exactly one production projection mode.");
      mode = argument.slice(2);
      continue;
    }
    if (argument === "--config") {
      const value = args[index + 1];
      if (!value) fail("--config requires a repository-relative JSON file.");
      configurationPath = path.resolve(repositoryRoot, value);
      index += 1;
      continue;
    }
    fail(`Unknown production projection argument: ${argument}.`);
  }
  if (mode === null) {
    fail(`Usage: node ${path.relative(repositoryRoot, toolPath)} (--build|--check) [--config file]`);
  }
  return { mode, configurationPath };
}

async function main() {
  const { mode, configurationPath } = parseArguments(process.argv.slice(2));
  const { primaryManifest } = await loadProductionProjectionInputs(
    configurationPath,
  );
  const plan = await createProductionProjectionPlan({ primaryManifest });
  const verification = mode === "check"
    ? await checkProductionProjection(plan)
    : await persistProductionProjection(plan);
  console.log([
    `Production projection ${mode === "check" ? "verified" : "built"}: ${verification.files} files, ${verification.bytes} bytes.`,
    `Source: ${plan.manifest.source_sha}.`,
    `Primary files: ${plan.manifest.surfaces.primary.files}.`,
    `Iframe files: ${plan.manifest.surfaces.iframe.files}.`,
    mode === "check"
      ? "Destination: temporary verification directory (not persisted)."
      : `Destination: ${path.relative(repositoryRoot, plan.outputRoot)}.`,
    mode === "build"
      ? `Installation: ${verification.installation}; transaction cleanup: ${verification.cleanup}.`
      : "Plan verification: complete.",
    "Deployment activation: none.",
  ].join("\n"));
}

if (process.argv[1] && path.resolve(process.argv[1]) === toolPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

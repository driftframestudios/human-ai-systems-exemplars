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
import { promisify, TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";

import {
  assertPackageOutputPath,
  assertRegularFileWithin,
  sha256,
  verifyPackagePlan,
  writePackagePlan,
} from "./iframe-route-package-engine.mjs";
import { createAggregatePackagePlan } from "./package-v1-iframe-routes.mjs";
import {
  inspectProfessionalProfileScript,
  inspectPublicReferenceHtml,
  materializeProfessionalProfileScript,
  materializePublicReferenceHtml,
  resolvePublicReferenceDestinations,
} from "./materialize-public-references.mjs";

const execFileAsync = promisify(execFile);
const toolPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(toolPath), "..");

const configurationId = "prod-projection.configuration.v1";
const primaryManifestId = "prod-projection.primary-route-manifest.v1";
const deploymentManifestId = "prod-projection.deployment-manifest.v1";
const aggregateReceiptId = "iframe-routes.aggregate-package-receipt.v1";
const carrierRelativeRoot = "deployment/cpanel/carrier";
const carrierManifestRelativePath = `${carrierRelativeRoot}/deployment-manifest.json`;
const carrierIndexRelativePath = `${carrierRelativeRoot}/deployment-files.tsv`;
const deploymentFileIndexHeader =
  "deployment_manifest_sha256\tsource_sha\tsurface\tprojected_path\tbytes\tsha256\tmedia_type\n";
const productionPublicReferenceConfig = ".env.public";
const legacyContextCanvasPublicationBase =
  "https://schemas.radiantnull.com/context-canvas-project-surface/context-canvas/";

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

const excludedRepositoryPrefixes = [carrierRelativeRoot];

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
  [".md", new Set(["text/markdown"])],
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
  carrierRoot: path.join(repositoryRoot, ...carrierRelativeRoot.split("/")),
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

export function compareUtf8Paths(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
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

function assertRepositoryInputPath(sourcePath, label) {
  const safePath = assertPortableProjectionPath(
    sourcePath,
    `${label} path`,
  );
  const components = safePath.split(path.posix.sep);
  const rootKey = components[0].normalize("NFC").toLowerCase();
  if (excludedPrimaryRoots.has(rootKey)) {
    fail(`${label} stays outside repository-only root ${components[0]}.`);
  }
  if (components.some((component) => {
    const key = component.normalize("NFC").toLowerCase();
    return key === ".env" || key.startsWith(".env.");
  })) {
    fail(`${label} stays outside environment files: ${sourcePath}.`);
  }
  const portableKey = portablePathKey(safePath);
  for (const excludedPrefix of excludedRepositoryPrefixes) {
    const prefixKey = portablePathKey(excludedPrefix);
    if (portableKey === prefixKey || portableKey.startsWith(`${prefixKey}/`)) {
      fail(`${label} stays outside generated carrier root ${excludedPrefix}.`);
    }
  }
  return safePath;
}

function assertPrimarySourcePath(sourcePath) {
  return assertRepositoryInputPath(sourcePath, "Primary projection source");
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

function validatePublicationConfiguration(publication) {
  assertExactKeys(
    publication,
    ["base_url", "source_root", "public_reference_config"],
    "Production publication configuration",
  );
  let baseUrl;
  try {
    baseUrl = new URL(publication.base_url);
  } catch {
    fail("Production publication base_url must be one absolute HTTPS origin URL.");
  }
  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.username !== "" ||
    baseUrl.password !== "" ||
    baseUrl.pathname !== "/" ||
    baseUrl.search !== "" ||
    baseUrl.hash !== "" ||
    baseUrl.href !== publication.base_url
  ) {
    fail("Production publication base_url must be one normalized HTTPS origin ending in /.");
  }
  const sourceRoot = assertRepositoryInputPath(
    publication.source_root,
    "Production publication source root",
  );
  if (publication.public_reference_config !== productionPublicReferenceConfig) {
    fail(`Production publication public_reference_config must be ${productionPublicReferenceConfig}.`);
  }
  return {
    base_url: baseUrl.href,
    source_root: sourceRoot,
    public_reference_config: productionPublicReferenceConfig,
  };
}

function validateConfiguration(configuration) {
  const keys = ["id", "version", "primary_manifest"];
  if (Object.hasOwn(configuration ?? {}, "publication")) keys.push("publication");
  assertExactKeys(
    configuration,
    keys,
    "Production projection configuration",
  );
  if (configuration.id !== configurationId || configuration.version !== "1") {
    fail(`Production projection configuration must use ${configurationId} version 1.`);
  }
  configuration.primary_manifest = assertRepositoryInputPath(
    configuration.primary_manifest,
    "Primary manifest",
  );
  if (configuration.publication !== undefined) {
    configuration.publication = validatePublicationConfiguration(
      configuration.publication,
    );
  }
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

function parseJsonBytes(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
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
  const currentSha = await readRepositorySourceSha(root, {
    allowCarrierOnlyDirty: options.allowCarrierOnlyDirty === true,
  });
  if (
    options.sourceSha !== undefined &&
    typeof options.sourceSha !== "string"
  ) {
    fail("Production projection selection requires one full Git source SHA.");
  }
  const sourceSha = options.sourceSha?.toLowerCase() ?? currentSha;
  if (
    typeof sourceSha !== "string" ||
    !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(sourceSha)
  ) {
    fail("Production projection selection requires one full Git source SHA.");
  }
  if (sourceSha !== currentSha && options.allowHistoricalSource !== true) {
    fail("Production projection selection SHA differs from the clean repository HEAD.");
  }
  const trackedBlobs = options.trackedBlobs ??
    await readTrackedBlobIndex(root, sourceSha);
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
  const portableConfiguration = assertRepositoryInputPath(
    relativeConfiguration.split(path.sep).join(path.posix.sep),
    "Production projection configuration",
  );
  const configurationInput = await readTrackedRepositoryInput(
    root,
    trackedBlobs,
    portableConfiguration,
    "Production projection configuration",
  );
  const configuration = validateConfiguration(
    parseJsonBytes(configurationInput.bytes, "Production projection configuration"),
  );
  const primaryManifestInput = await readTrackedRepositoryInput(
    root,
    trackedBlobs,
    configuration.primary_manifest,
    "Primary route manifest",
  );
  const primaryManifest = validatePrimaryManifest(
    parseJsonBytes(primaryManifestInput.bytes, "Primary route manifest"),
  );
  return {
    sourceSha,
    configuration,
    primaryManifest,
    binding: {
      configuration: {
        source_path: portableConfiguration,
        git_blob_id: configurationInput.object,
        sha256: sha256(configurationInput.bytes),
      },
      primary_manifest: {
        source_path: configuration.primary_manifest,
        git_blob_id: primaryManifestInput.object,
        sha256: sha256(primaryManifestInput.bytes),
      },
    },
    trackedInputs: new Map([
      [portableConfiguration, configurationInput],
      [configuration.primary_manifest, primaryManifestInput],
    ]),
  };
}

function decodeGitPath(pathBytes) {
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(pathBytes);
    if (decoded.length === 0) fail("Git status returned an empty path.");
    return decoded;
  } catch (error) {
    if (error instanceof TypeError) {
      fail("Git status returned a path that is not valid UTF-8.");
    }
    throw error;
  }
}

function splitNulTerminatedGitRecords(bytes, label) {
  if (!Buffer.isBuffer(bytes)) fail(`${label} must return raw bytes.`);
  if (bytes.byteLength === 0) return [];
  if (bytes.at(-1) !== 0) fail(`${label} returned an unterminated path record.`);
  const records = [];
  let start = 0;
  for (let index = 0; index < bytes.byteLength; index += 1) {
    if (bytes[index] !== 0) continue;
    records.push(bytes.subarray(start, index));
    start = index + 1;
  }
  return records;
}

function parseGitStatusPaths(statusBytes) {
  const records = splitNulTerminatedGitRecords(statusBytes, "Git status");

  const paths = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (
      record.byteLength < 4 ||
      record[2] !== 0x20 ||
      !" MADRCUT?!".includes(String.fromCharCode(record[0])) ||
      !" MADRCUT?!".includes(String.fromCharCode(record[1]))
    ) {
      fail("Git status returned an unsupported porcelain record.");
    }
    const state = String.fromCharCode(record[0], record[1]);
    paths.push(decodeGitPath(record.subarray(3)));
    if (/[RC]/.test(state)) {
      index += 1;
      if (index >= records.length || records[index].byteLength === 0) {
        fail("Git status returned an incomplete rename or copy record.");
      }
      paths.push(decodeGitPath(records[index]));
    }
  }
  return paths;
}

export function assertCarrierOnlyDirtyStatus(statusBytes) {
  for (const dirtyPath of parseGitStatusPaths(statusBytes)) {
    if (
      dirtyPath !== carrierRelativeRoot &&
      !dirtyPath.startsWith(`${carrierRelativeRoot}/`)
    ) {
      fail(`Production carrier staging found an open path outside its owned root: ${dirtyPath}.`);
    }
  }
}

export async function readRepositorySourceSha(
  root = repositoryRoot,
  options = {},
) {
  const { stdout: status } = await execFileAsync(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    {
      cwd: root,
      encoding: "buffer",
      maxBuffer: 128 * 1024 * 1024,
    },
  );
  if (status.byteLength > 0) {
    if (options.allowCarrierOnlyDirty !== true) {
      fail("Production projection requires a clean Git worktree for its source coordinate.");
    }
    assertCarrierOnlyDirtyStatus(status);
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
  for (const record of splitNulTerminatedGitRecords(stdout, "Git source tree")) {
    const separator = record.indexOf(0x09);
    const metadata = separator < 0
      ? []
      : record.subarray(0, separator).toString("ascii").split(" ");
    const sourcePath = separator < 0
      ? ""
      : decodeGitPath(record.subarray(separator + 1));
    if (
      separator < 0 ||
      metadata.length !== 3 ||
      !/^[0-7]{6}$/.test(metadata[0]) ||
      !/^(?:blob|commit|tree)$/.test(metadata[1]) ||
      !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(metadata[2]) ||
      entries.has(sourcePath)
    ) {
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

async function readTrackedRepositoryInput(
  root,
  trackedBlobs,
  sourcePath,
  label,
) {
  const entry = trackedBlobs.get(sourcePath);
  if (
    !entry ||
    entry.type !== "blob" ||
    !["100644", "100755"].includes(entry.mode) ||
    !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(entry.object)
  ) {
    fail(`${label} must be a regular tracked blob: ${sourcePath}.`);
  }
  const sourceFile = path.resolve(root, ...sourcePath.split(path.posix.sep));
  await assertRegularFileWithin(root, sourceFile, label);
  const { stdout: trackedBytes } = await execFileAsync(
    "git",
    ["cat-file", "blob", entry.object],
    {
      cwd: root,
      encoding: "buffer",
      maxBuffer: 128 * 1024 * 1024,
    },
  );
  if (!Buffer.isBuffer(trackedBytes)) {
    fail(`${label} could not be read from its tracked blob: ${sourcePath}.`);
  }
  return { bytes: trackedBytes, object: entry.object };
}

async function verifyRepositorySourceState(
  root,
  sourceSha,
  trackedInputs,
  options = {},
) {
  const currentSha = await readRepositorySourceSha(root, {
    allowCarrierOnlyDirty: options.allowCarrierOnlyDirty === true,
  });
  const expectedCurrentSha = options.currentSha ?? sourceSha;
  if (currentSha !== expectedCurrentSha) {
    fail("Production projection source coordinate changed during composition.");
  }
  if (currentSha !== sourceSha && options.allowHistoricalSource !== true) {
    fail("Production projection source coordinate changed during composition.");
  }
  const currentBlobs = await readTrackedBlobIndex(root, sourceSha);
  for (const [sourcePath, input] of trackedInputs) {
    if (currentBlobs.get(sourcePath)?.object !== input.object) {
      fail("Production projection tracked blob changed during composition.");
    }
    const sourceFile = path.resolve(root, ...sourcePath.split(path.posix.sep));
    await assertRegularFileWithin(root, sourceFile, "Primary projection source revalidation");
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalJson(value[key])]),
  );
}

function assertAggregatePlan(aggregatePlan) {
  if (
    !aggregatePlan ||
    !(aggregatePlan.outputFiles instanceof Map) ||
    !(aggregatePlan.familyPlans instanceof Map) ||
    !isPlainObject(aggregatePlan.receipt)
  ) {
    fail("Production projection requires an aggregate iframe package plan.");
  }
  const receipt = aggregatePlan.receipt;
  if (
    receipt.id !== aggregateReceiptId ||
    receipt.version !== "1" ||
    receipt.host !== "iframes.vik.guru" ||
    receipt.base_path !== "/v1/" ||
    !Array.isArray(receipt.package_contract?.family_directories) ||
    receipt.package_contract.family_directories.length !== 2 ||
    receipt.package_contract.family_directories.some(
      (family, index) => family !== ["core", "canvas"][index],
    )
  ) {
    fail("Production projection requires the accepted Core and Canvas aggregate package.");
  }
  const expectedPaths = new Set(["route-manifest.json"]);
  for (const family of ["core", "canvas"]) {
    if (!aggregatePlan.outputFiles.has(`${family}/route-manifest.json`)) {
      fail(`Aggregate iframe package must include ${family}/route-manifest.json.`);
    }
  }
  const aggregateReceiptBytes = aggregatePlan.outputFiles.get("route-manifest.json");
  if (!Buffer.isBuffer(aggregateReceiptBytes)) {
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
    if (!Buffer.isBuffer(aggregatePlan.outputFiles.get(relativePath))) {
      fail(`Aggregate iframe package output must be bytes: ${relativePath}.`);
    }
  }
  let serializedReceipt;
  try {
    serializedReceipt = JSON.parse(aggregateReceiptBytes.toString("utf8"));
  } catch {
    fail("Aggregate iframe package root receipt must contain valid JSON.");
  }
  if (
    JSON.stringify(canonicalJson(serializedReceipt)) !==
    JSON.stringify(canonicalJson(receipt))
  ) {
    fail("Aggregate iframe package receipt bytes differ from its plan receipt.");
  }
  const generatedBytes = [...aggregatePlan.outputFiles.values()].reduce(
    (total, bytes) => total + (Buffer.isBuffer(bytes) ? bytes.byteLength : 0),
    0,
  );
  if (
    receipt.package_contract.generated_files !== aggregatePlan.outputFiles.size ||
    receipt.package_contract.generated_bytes !== generatedBytes ||
    !Array.isArray(receipt.families) ||
    receipt.families.length !== 2
  ) {
    fail("Aggregate iframe package receipt totals differ from its output plan.");
  }
  for (const family of ["core", "canvas"]) {
    const familyReceipt = receipt.families.find(({ id }) => id === family);
    const familyPlan = aggregatePlan.familyPlans.get(family);
    const files = [...aggregatePlan.outputFiles.entries()].filter(
      ([relativePath]) => relativePath.startsWith(`${family}/`),
    );
    const routeReceipt = aggregatePlan.outputFiles.get(`${family}/route-manifest.json`);
    const bytes = files.reduce((total, [, fileBytes]) => total + fileBytes.byteLength, 0);
    const routes = familyPlan?.receipt?.package_contract?.primary_routes;
    if (
      !familyReceipt ||
      !Number.isSafeInteger(routes) ||
      routes < 1 ||
      familyReceipt.base_path !== `/v1/${family}/` ||
      familyReceipt.route_receipt_file !== `${family}/route-manifest.json` ||
      familyReceipt.route_receipt_sha256 !== sha256(routeReceipt) ||
      familyReceipt.routes !== routes ||
      familyReceipt.files !== files.length ||
      familyReceipt.bytes !== bytes
    ) {
      fail(`Aggregate iframe package ${family} receipt differs from its output plan.`);
    }
  }
  if (
    receipt.package_contract.primary_routes !==
    receipt.families.reduce((total, family) => total + family.routes, 0)
  ) {
    fail("Aggregate iframe package route total differs from its family plans.");
  }
  return aggregatePlan;
}

function aggregateClosureSha256(outputFiles) {
  const closure = [...outputFiles.entries()]
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([relativePath, bytes]) => ({
      path: relativePath,
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
    }));
  return sha256(Buffer.from(JSON.stringify(closure), "utf8"));
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
    /\{\{PUBLIC_URL_[A-Z0-9_]+\}\}/.test(
      bytes.toString("utf8"),
    )
  ) {
    fail(`Primary projection source retains an unresolved public URL token: ${sourcePath}.`);
  }
}

function splitReferenceSuffix(reference) {
  const suffixIndex = reference.search(/[?#]/);
  return suffixIndex < 0
    ? { pathname: reference, suffix: "" }
    : {
        pathname: reference.slice(0, suffixIndex),
        suffix: reference.slice(suffixIndex),
      };
}

function isLocalReference(reference) {
  return (
    reference !== "" &&
    !reference.startsWith("#") &&
    !reference.startsWith("{{") &&
    !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference)
  );
}

function sourceReferenceTarget(
  reference,
  sourcePath,
  sourceRoot,
  trackedBlobs,
) {
  if (!isLocalReference(reference)) return null;
  const { pathname } = splitReferenceSuffix(reference);
  if (pathname === "") return null;
  const candidate = pathname.startsWith("/")
    ? path.posix.normalize(path.posix.join(sourceRoot, pathname.replace(/^\/+/, "")))
    : path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), pathname));
  if (candidate === ".." || candidate.startsWith("../")) return null;
  const candidates = pathname.endsWith("/")
    ? [path.posix.join(candidate, "index.html")]
    : [candidate, path.posix.join(candidate, "index.html")];
  for (const target of candidates) {
    const entry = trackedBlobs.get(target);
    if (entry?.type === "blob" && ["100644", "100755"].includes(entry.mode)) {
      return target;
    }
  }
  return null;
}

function projectedReference(
  reference,
  sourcePath,
  sourceRoot,
  trackedBlobs,
  projectedPaths,
) {
  const target = sourceReferenceTarget(
    reference,
    sourcePath,
    sourceRoot,
    trackedBlobs,
  );
  if (target === null) return reference;
  const projectedTarget = projectedPaths.get(target);
  if (projectedTarget === undefined) {
    fail(`Primary projection dependency is absent from its explicit closure: ${sourcePath} -> ${target}.`);
  }
  const { pathname, suffix } = splitReferenceSuffix(reference);
  const directoryRoute = pathname.endsWith("/") && projectedTarget.endsWith("/index.html");
  const targetPath = directoryRoute
    ? projectedTarget.slice(0, -"index.html".length)
    : projectedTarget;
  if (pathname.startsWith("/")) return `/${targetPath}${suffix}`;
  const projectedSource = projectedPaths.get(sourcePath);
  const relativeTarget = path.posix.relative(
    path.posix.dirname(projectedSource),
    targetPath,
  );
  const normalizedTarget = relativeTarget === "" ? "./" : relativeTarget;
  return `${normalizedTarget}${suffix}`;
}

function rewriteSrcset(
  value,
  sourcePath,
  sourceRoot,
  trackedBlobs,
  projectedPaths,
) {
  return value.replace(/(^|,\s*)([^\s,]+)(?=\s|,|$)/g, (
    carrier,
    prefix,
    reference,
  ) => `${prefix}${projectedReference(
    reference,
    sourcePath,
    sourceRoot,
    trackedBlobs,
    projectedPaths,
  )}`);
}

function rewritePrimaryLocalReferences(
  text,
  sourcePath,
  sourceRoot,
  trackedBlobs,
  projectedPaths,
) {
  const rewrite = (reference) => projectedReference(
    reference,
    sourcePath,
    sourceRoot,
    trackedBlobs,
    projectedPaths,
  );
  let rewritten = text.replace(
    /(\b(?:href|src|poster|data|action|formaction|xlink:href)\s*=\s*)(["'])([\s\S]*?)\2/gi,
    (carrier, prefix, quote, reference) =>
      `${prefix}${quote}${rewrite(reference)}${quote}`,
  );
  rewritten = rewritten.replace(
    /(\b(?:srcset|imagesrcset)\s*=\s*)(["'])([\s\S]*?)\2/gi,
    (carrier, prefix, quote, value) =>
      `${prefix}${quote}${rewriteSrcset(
        value,
        sourcePath,
        sourceRoot,
        trackedBlobs,
        projectedPaths,
      )}${quote}`,
  );
  rewritten = rewritten.replace(
    /(url\(\s*)(["']?)([^"')]+)\2(\s*\))/gi,
    (carrier, prefix, quote, reference, suffix) =>
      `${prefix}${quote}${rewrite(reference.trim())}${quote}${suffix}`,
  );
  rewritten = rewritten.replace(
    /(@import\s+)(["'])([^"']+)\2/gi,
    (carrier, prefix, quote, reference) =>
      `${prefix}${quote}${rewrite(reference)}${quote}`,
  );
  rewritten = rewritten.replace(
    /(\b(?:href|src|poster|url)\s*:\s*)(["'])([^"']+)\2/gi,
    (carrier, prefix, quote, reference) =>
      `${prefix}${quote}${rewrite(reference)}${quote}`,
  );
  return rewritten;
}

function rewriteJsonStringReferences(
  text,
  sourcePath,
  sourceRoot,
  trackedBlobs,
  projectedPaths,
) {
  return text.replace(/"(?:\\.|[^"\\])*"/g, (token) => {
    let value;
    try {
      value = JSON.parse(token);
    } catch {
      return token;
    }
    const rewritten = projectedReference(
      value,
      sourcePath,
      sourceRoot,
      trackedBlobs,
      projectedPaths,
    );
    return rewritten === value ? token : JSON.stringify(rewritten);
  });
}

function transformPrimaryBytes(
  bytes,
  file,
  publication,
  trackedBlobs,
  projectedPaths,
  destinations,
) {
  const extension = path.posix.extname(file.source_path).toLowerCase();
  const textExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".svg", ".txt", ".xml"]);
  if (!textExtensions.has(extension)) return bytes;
  let text = bytes.toString("utf8");
  if (file.source_path.startsWith(`${publication.source_root}/`)) {
    const materializerPath = path.posix.relative(
      path.posix.dirname(publication.source_root),
      file.source_path,
    );
    if (extension === ".html") {
      const inspection = inspectPublicReferenceHtml(text, materializerPath);
      if (inspection.occurrenceCount > 0) {
        text = materializePublicReferenceHtml(
          text,
          destinations,
          materializerPath,
        );
      }
    } else if (extension === ".js" && text.includes("{{PUBLIC_URL")) {
      const inspection = inspectProfessionalProfileScript(text, materializerPath);
      if (inspection.occurrenceCount > 0) {
        text = materializeProfessionalProfileScript(
          text,
          destinations,
          materializerPath,
        );
      }
    }
    if (extension === ".json") {
      text = rewriteJsonStringReferences(
        text,
        file.source_path,
        publication.source_root,
        trackedBlobs,
        projectedPaths,
      );
    }
    text = text.replaceAll(
      legacyContextCanvasPublicationBase,
      publication.base_url,
    );
  }
  text = rewritePrimaryLocalReferences(
    text,
    file.source_path,
    publication.source_root,
    trackedBlobs,
    projectedPaths,
  );
  const transformed = Buffer.from(text, "utf8");
  assertResolvedPrimaryBytes(transformed, file.source_path);
  return transformed;
}

function publicReferenceMaterializerPath(sourcePath, sourceRoot) {
  return path.posix.relative(path.posix.dirname(sourceRoot), sourcePath);
}

async function loadPublicationInput(
  root,
  publication,
  primaryInputs,
  trackedBlobs,
) {
  const configPath = path.resolve(root, productionPublicReferenceConfig);
  if (trackedBlobs.has(productionPublicReferenceConfig)) {
    fail("Production public-reference configuration must remain an ignored external input.");
  }
  try {
    await assertRegularFileWithin(
      root,
      configPath,
      "Production public-reference configuration",
    );
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail(`Production publication requires the ignored ${productionPublicReferenceConfig} receiver.`);
    }
    throw error;
  }
  const configurationBytes = await readFile(configPath);
  const keys = new Set();
  for (const [sourcePath, input] of primaryInputs) {
    if (!sourcePath.startsWith(`${publication.source_root}/`)) continue;
    const extension = path.posix.extname(sourcePath).toLowerCase();
    const source = input.bytes.toString("utf8");
    const safePath = publicReferenceMaterializerPath(
      sourcePath,
      publication.source_root,
    );
    let inspection = null;
    if (extension === ".html") {
      inspection = inspectPublicReferenceHtml(source, safePath);
    } else if (extension === ".js" && source.includes("{{PUBLIC_URL")) {
      inspection = inspectProfessionalProfileScript(source, safePath);
    }
    for (const key of inspection?.keys ?? []) keys.add(key);
  }
  const destinations = await resolvePublicReferenceDestinations(keys, {
    configurationSource: configurationBytes.toString("utf8"),
    environment: {},
  });
  return {
    destinations,
    input: {
      source_relationship: "external_digest_bound_input",
      configuration_path: productionPublicReferenceConfig,
      configuration_sha256: sha256(configurationBytes),
      keys: [...keys].sort(),
    },
    state: {
      path: configPath,
      sha256: sha256(configurationBytes),
    },
  };
}

async function verifyPublicationInputState(state) {
  if (state === null) return;
  await assertRegularFileWithin(
    path.dirname(state.path),
    state.path,
    "Production public-reference configuration revalidation",
  );
  if (sha256(await readFile(state.path)) !== state.sha256) {
    fail("Production public-reference configuration changed during composition.");
  }
}

function serializeManifest(manifest) {
  return Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function assertCarrierReleaseRelationship(root, sourceSha, releaseSha) {
  if (
    typeof sourceSha !== "string" ||
    typeof releaseSha !== "string" ||
    !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(sourceSha) ||
    !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(releaseSha) ||
    sourceSha === releaseSha
  ) {
    fail("Production carrier requires distinct full source and release Git SHAs.");
  }

  let firstParent;
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["rev-parse", "--verify", `${releaseSha}^1`],
      { cwd: root, encoding: "utf8" },
    );
    firstParent = stdout.trim().toLowerCase();
  } catch {
    fail("Production carrier release must have its bound source as a first parent.");
  }
  if (firstParent !== sourceSha) {
    fail("Production carrier release must have its bound source as a first parent.");
  }

  const { stdout: changedBytes } = await execFileAsync(
    "git",
    ["diff", "--name-only", "--no-renames", "-z", sourceSha, releaseSha, "--"],
    { cwd: root, encoding: "buffer", maxBuffer: 128 * 1024 * 1024 },
  );
  const changedPaths = splitNulTerminatedGitRecords(
    changedBytes,
    "Production carrier release diff",
  ).map(decodeGitPath);
  if (changedPaths.length === 0) {
    fail("Production carrier release must change its owned carrier root.");
  }
  for (const changedPath of changedPaths) {
    if (
      changedPath !== carrierRelativeRoot &&
      !changedPath.startsWith(`${carrierRelativeRoot}/`)
    ) {
      fail(`Production carrier release changes a path outside its owned root: ${changedPath}.`);
    }
  }
  for (const requiredPath of [carrierManifestRelativePath, carrierIndexRelativePath]) {
    if (!changedPaths.includes(requiredPath)) {
      fail(`Production carrier release must change ${requiredPath}.`);
    }
  }
  return { sourceSha, releaseSha, changedPaths };
}

export async function createProductionProjectionPlan(options = {}) {
  const root = path.resolve(options.repositoryRoot ?? repositoryRoot);
  if (Object.hasOwn(options, "primaryManifest")) {
    fail("Production projection membership must come from its tracked configuration and manifest.");
  }
  if (options.aggregatePlan === undefined && root !== repositoryRoot) {
    fail("An alternate repository root requires an injected aggregate iframe plan.");
  }
  const allowCarrierOnlyDirty = options.allowCarrierOnlyDirty === true;
  const currentSha = await readRepositorySourceSha(root, {
    allowCarrierOnlyDirty,
  });
  if (
    options.sourceSha !== undefined &&
    typeof options.sourceSha !== "string"
  ) {
    fail("Production projection requires one full Git source SHA.");
  }
  if (
    options.carrierReleaseSha !== undefined &&
    typeof options.carrierReleaseSha !== "string"
  ) {
    fail("Production projection carrier release requires one full Git SHA.");
  }
  const sourceSha = options.sourceSha?.toLowerCase() ?? currentSha;
  if (
    sourceSha !== currentSha &&
    options.carrierReleaseSha?.toLowerCase() !== currentSha
  ) {
    fail("Production projection expected source SHA differs from the clean repository HEAD.");
  }
  if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(sourceSha)) {
    fail("Production projection requires one full Git source SHA.");
  }
  const carrierRelationship = sourceSha === currentSha
    ? null
    : await assertCarrierReleaseRelationship(root, sourceSha, currentSha);
  const trackedBlobs = await readTrackedBlobIndex(root, sourceSha);
  const configurationPath = options.configurationPath ?? path.join(
    root,
    "deployment/cpanel/production-projection.config.json",
  );
  const selection = await loadProductionProjectionInputs(configurationPath, {
    repositoryRoot: root,
    sourceSha,
    trackedBlobs,
    allowHistoricalSource: carrierRelationship !== null,
    allowCarrierOnlyDirty,
  });
  const primaryManifest = selection.primaryManifest;
  const trackedInputs = new Map(selection.trackedInputs);
  const primaryInputs = new Map();
  const projectedPaths = new Map(
    primaryManifest.files.map((file) => [file.source_path, file.projected_path]),
  );
  for (const file of primaryManifest.files) {
    const trackedInput = await readTrackedRepositoryInput(
      root,
      trackedBlobs,
      file.source_path,
      "Primary projection source",
    );
    primaryInputs.set(file.source_path, trackedInput);
    trackedInputs.set(file.source_path, trackedInput);
  }
  const publicationInput = selection.configuration.publication === undefined
    ? null
    : await loadPublicationInput(
        root,
        selection.configuration.publication,
        primaryInputs,
        trackedBlobs,
      );
  const aggregatePlan = assertAggregatePlan(
    options.aggregatePlan ?? await createAggregatePackagePlan(),
  );
  for (const [key, destination] of publicationInput?.destinations ?? []) {
    if (!key.startsWith("PUBLIC_URL_IFRAME_")) continue;
    const url = new URL(destination);
    const aggregatePath = url.pathname.replace(/^\/v1\//, "");
    if (!aggregatePlan.outputFiles.has(`${aggregatePath}index.html`)) {
      fail(`${key} does not identify a route in the accepted aggregate iframe plan.`);
    }
  }
  const aggregateClosure = aggregateClosureSha256(aggregatePlan.outputFiles);
  const outputFiles = new Map();
  const portablePaths = new Set();
  const outputs = [];
  let primaryBytes = 0;
  let iframeBytes = 0;

  for (const file of primaryManifest.files) {
    const sourceBytes = primaryInputs.get(file.source_path).bytes;
    const bytes = publicationInput === null
      ? sourceBytes
      : transformPrimaryBytes(
          sourceBytes,
          file,
          selection.configuration.publication,
          trackedBlobs,
          projectedPaths,
          publicationInput.destinations,
        );
    assertResolvedPrimaryBytes(bytes, file.source_path);
    const projectedPath = `primary-public/${file.projected_path}`;
    assertPortableOutputCollision(projectedPath, outputFiles, portablePaths);
    outputFiles.set(projectedPath, bytes);
    primaryBytes += bytes.byteLength;
    const output = {
      surface: "primary",
      source_path: file.source_path,
      projected_path: projectedPath,
      media_type: file.media_type,
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
      standing: bytes.equals(sourceBytes) ? "byte_preserved" : "generated",
    };
    if (!bytes.equals(sourceBytes)) output.source_sha256 = sha256(sourceBytes);
    outputs.push(output);
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
  await verifyRepositorySourceState(root, sourceSha, trackedInputs, {
    currentSha,
    allowHistoricalSource: carrierRelationship !== null,
    allowCarrierOnlyDirty,
  });
  await verifyPublicationInputState(publicationInput?.state ?? null);
  const aggregateReceiptBytes = aggregatePlan.outputFiles.get("route-manifest.json");
  const manifest = {
    id: deploymentManifestId,
    version: "1",
    source_sha: sourceSha,
    inputs: {
      configuration: selection.binding.configuration,
      primary_manifest: {
        id: primaryManifest.id,
        version: primaryManifest.version,
        ...selection.binding.primary_manifest,
      },
      ...(publicationInput === null
        ? {}
        : { public_references: publicationInput.input }),
      iframe_package: {
        id: aggregatePlan.receipt.id,
        host: aggregatePlan.receipt.host,
        base_path: aggregatePlan.receipt.base_path,
        source_relationship: "independent_plan_bound_input",
        receipt_sha256: sha256(aggregateReceiptBytes),
        closure_sha256: aggregateClosure,
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

async function replaceOwnedProjection(
  plan,
  destination,
  { installation, transactionPrefix, remove = rm },
) {
  const parent = path.resolve(destination, "..");
  await ensureRegularDirectory(parent);
  const transaction = await mkdtemp(path.join(parent, transactionPrefix));
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
    return { ...verification, installation, cleanup };
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

export async function persistProductionProjection(
  plan,
  destination = plan.outputRoot,
  options = {},
) {
  if (
    destination !== plan.outputRoot ||
    path.basename(destination) !== ".prod-projection-build"
  ) {
    fail(`Refusing an unexpected production projection destination: ${destination}.`);
  }
  return await replaceOwnedProjection(plan, destination, {
    installation: "installed",
    transactionPrefix: ".prod-projection-transaction-",
    remove: options.remove,
  });
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

function serializeDeploymentFileIndex(plan) {
  if (
    !isPlainObject(plan?.manifest) ||
    plan.manifest.id !== deploymentManifestId ||
    plan.manifest.version !== "1" ||
    !Array.isArray(plan.manifest.outputs) ||
    !(plan.outputFiles instanceof Map)
  ) {
    fail("Production carrier requires one validated production projection plan.");
  }
  const manifestBytes = plan.outputFiles.get("deployment-manifest.json");
  if (
    !Buffer.isBuffer(manifestBytes) ||
    !manifestBytes.equals(serializeManifest(plan.manifest))
  ) {
    fail("Production carrier index requires exact deployment manifest bytes.");
  }
  const manifestSha256 = sha256(manifestBytes);
  const sourceSha = plan.manifest.source_sha;
  if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(sourceSha)) {
    fail("Production carrier index requires the deployment manifest source SHA.");
  }
  const rows = [];
  const indexedPaths = new Set();
  for (const output of [...plan.manifest.outputs].sort((left, right) =>
    compareUtf8Paths(left.projected_path, right.projected_path),
  )) {
    const projectedPath = assertPortableProjectionPath(
      output.projected_path,
      "Production carrier indexed path",
    );
    if (
      !["primary", "iframe"].includes(output.surface) ||
      (output.surface === "primary" && !projectedPath.startsWith("primary-public/")) ||
      (output.surface === "iframe" && !projectedPath.startsWith("iframe-public/")) ||
      indexedPaths.has(projectedPath)
    ) {
      fail(`Production carrier has an invalid indexed output: ${projectedPath}.`);
    }
    const bytes = plan.outputFiles.get(projectedPath);
    if (
      !Buffer.isBuffer(bytes) ||
      !Number.isSafeInteger(output.bytes) ||
      output.bytes < 0 ||
      output.bytes !== bytes.byteLength ||
      !/^[a-f0-9]{64}$/.test(output.sha256) ||
      output.sha256 !== sha256(bytes) ||
      typeof output.media_type !== "string" ||
      /[\t\r\n]/.test(output.media_type)
    ) {
      fail(`Production carrier indexed metadata differs from ${projectedPath}.`);
    }
    assertMediaType(projectedPath, output.media_type, "Production carrier output");
    indexedPaths.add(projectedPath);
    rows.push([
      manifestSha256,
      sourceSha,
      output.surface,
      projectedPath,
      String(output.bytes),
      output.sha256,
      output.media_type,
    ].join("\t"));
  }
  const publicPaths = [...plan.outputFiles.keys()]
    .filter((relativePath) => relativePath !== "deployment-manifest.json")
    .sort();
  if (
    publicPaths.length !== indexedPaths.size ||
    publicPaths.some((relativePath) => !indexedPaths.has(relativePath))
  ) {
    fail("Production carrier index differs from the production projection outputs.");
  }
  return Buffer.from(
    `${deploymentFileIndexHeader}${rows.length ? `${rows.join("\n")}\n` : ""}`,
    "utf8",
  );
}

export function createProductionCarrierPlan(projectionPlan) {
  if (
    typeof projectionPlan?.outputRoot !== "string" ||
    path.basename(projectionPlan.outputRoot) !== ".prod-projection-build"
  ) {
    fail("Production carrier requires the repository-owned projection output root.");
  }
  const manifestBytes = projectionPlan.outputFiles?.get("deployment-manifest.json");
  if (
    !Buffer.isBuffer(manifestBytes) ||
    !manifestBytes.equals(serializeManifest(projectionPlan.manifest))
  ) {
    fail("Production carrier requires exact deployment manifest bytes.");
  }
  const outputFiles = new Map(projectionPlan.outputFiles);
  outputFiles.set("deployment-files.tsv", serializeDeploymentFileIndex(projectionPlan));
  return {
    manifest: projectionPlan.manifest,
    outputFiles,
    outputRoot: path.join(
      path.dirname(projectionPlan.outputRoot),
      ...carrierRelativeRoot.split("/"),
    ),
  };
}

export async function stageProductionCarrier(
  projectionPlan,
  destination,
  options = {},
) {
  const carrierPlan = createProductionCarrierPlan(projectionPlan);
  const target = destination ?? carrierPlan.outputRoot;
  if (path.resolve(target) !== path.resolve(carrierPlan.outputRoot)) {
    fail(`Refusing an unexpected production carrier destination: ${target}.`);
  }
  const result = await replaceOwnedProjection(carrierPlan, target, {
    installation: "staged",
    transactionPrefix: ".carrier-transaction-",
    remove: options.remove,
  });
  return { ...result, source_sha: projectionPlan.manifest.source_sha };
}

export async function stageProductionCarrierFromRepository(options = {}) {
  const {
    destination,
    stageOptions,
    ...projectionOptions
  } = options;
  const projectionPlan = await createProductionProjectionPlan({
    ...projectionOptions,
    allowCarrierOnlyDirty: true,
  });
  const verification = await stageProductionCarrier(
    projectionPlan,
    destination,
    stageOptions,
  );
  return { projectionPlan, verification };
}

async function verifyTrackedCarrierPlan(root, releaseSha, carrierPlan) {
  const trackedBlobs = await readTrackedBlobIndex(root, releaseSha);
  const expectedPaths = [...carrierPlan.outputFiles.keys()]
    .map((relativePath) => `${carrierRelativeRoot}/${relativePath}`)
    .sort();
  const actualPaths = [...trackedBlobs.keys()]
    .filter((sourcePath) => sourcePath.startsWith(`${carrierRelativeRoot}/`))
    .sort();
  const missing = expectedPaths.filter((sourcePath) => !actualPaths.includes(sourcePath));
  const extra = actualPaths.filter((sourcePath) => !expectedPaths.includes(sourcePath));
  if (missing.length || extra.length) {
    fail([
      "Tracked production carrier differs from its exact allowlist.",
      missing.length ? `Missing: ${missing.join(", ")}` : "",
      extra.length ? `Extra: ${extra.join(", ")}` : "",
    ].filter(Boolean).join("\n"));
  }

  let totalBytes = 0;
  for (const [relativePath, expectedBytes] of carrierPlan.outputFiles) {
    const sourcePath = `${carrierRelativeRoot}/${relativePath}`;
    const entry = trackedBlobs.get(sourcePath);
    if (entry?.mode !== "100644" || entry.type !== "blob") {
      fail(`Tracked production carrier output must be a regular non-executable blob: ${sourcePath}.`);
    }
    const trackedInput = await readTrackedRepositoryInput(
      root,
      trackedBlobs,
      sourcePath,
      "Tracked production carrier output",
    );
    if (!trackedInput.bytes.equals(expectedBytes)) {
      fail(`Tracked production carrier output differs from its source plan: ${sourcePath}.`);
    }
    totalBytes += trackedInput.bytes.byteLength;
  }
  return { files: actualPaths.length, bytes: totalBytes };
}

export async function checkProductionCarrier(options = {}) {
  const root = path.resolve(options.repositoryRoot ?? repositoryRoot);
  const releaseSha = await readRepositorySourceSha(root);
  const releaseBlobs = await readTrackedBlobIndex(root, releaseSha);
  const manifestInput = await readTrackedRepositoryInput(
    root,
    releaseBlobs,
    carrierManifestRelativePath,
    "Tracked production carrier manifest",
  );
  const carriedManifest = parseJsonBytes(
    manifestInput.bytes,
    "Tracked production carrier manifest",
  );
  if (
    carriedManifest.id !== deploymentManifestId ||
    carriedManifest.version !== "1" ||
    typeof carriedManifest.source_sha !== "string" ||
    !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(carriedManifest.source_sha)
  ) {
    fail("Tracked production carrier manifest requires its exact v1 identity and source SHA.");
  }
  const sourceSha = carriedManifest.source_sha;
  await assertCarrierReleaseRelationship(root, sourceSha, releaseSha);
  const projectionPlan = await createProductionProjectionPlan({
    repositoryRoot: root,
    sourceSha,
    carrierReleaseSha: releaseSha,
    configurationPath: options.configurationPath ?? path.join(
      root,
      "deployment/cpanel/production-projection.config.json",
    ),
    aggregatePlan: options.aggregatePlan,
  });
  const carrierPlan = createProductionCarrierPlan(projectionPlan);
  const verification = await verifyTrackedCarrierPlan(
    root,
    releaseSha,
    carrierPlan,
  );
  return {
    ...verification,
    source_sha: sourceSha,
    release_sha: releaseSha,
    relationship: "source_first_parent_carrier_only",
  };
}

function parseArguments(args) {
  let mode = null;
  let configurationPath = productionProjectionDefaults.configurationPath;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (
      argument === "--build" ||
      argument === "--check" ||
      argument === "--stage-carrier" ||
      argument === "--check-carrier"
    ) {
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
    fail(
      `Usage: node ${path.relative(repositoryRoot, toolPath)} ` +
      `(--build|--check|--stage-carrier|--check-carrier) [--config file]`,
    );
  }
  return { mode, configurationPath };
}

async function main() {
  const { mode, configurationPath } = parseArguments(process.argv.slice(2));
  if (mode === "check-carrier") {
    const verification = await checkProductionCarrier({ configurationPath });
    console.log([
      `Production carrier verified: ${verification.files} files, ${verification.bytes} bytes.`,
      `Source: ${verification.source_sha}.`,
      `Release: ${verification.release_sha}.`,
      `Relationship: ${verification.relationship}.`,
      "Deployment activation: none.",
    ].join("\n"));
    return;
  }
  const carrierMode = mode === "stage-carrier";
  let plan;
  let verification;
  if (carrierMode) {
    ({ projectionPlan: plan, verification } =
      await stageProductionCarrierFromRepository({ configurationPath }));
  } else {
    plan = await createProductionProjectionPlan({ configurationPath });
    verification = mode === "check"
      ? await checkProductionProjection(plan)
      : await persistProductionProjection(plan);
  }
  console.log([
    carrierMode
      ? `Production carrier staged: ${verification.files} files, ${verification.bytes} bytes.`
      : `Production projection ${mode === "check" ? "verified" : "built"}: ${verification.files} files, ${verification.bytes} bytes.`,
    `Source: ${plan.manifest.source_sha}.`,
    `Primary files: ${plan.manifest.surfaces.primary.files}.`,
    `Iframe files: ${plan.manifest.surfaces.iframe.files}.`,
    mode === "check"
      ? "Destination: temporary verification directory (not persisted)."
      : carrierMode
        ? `Destination: ${carrierRelativeRoot}.`
        : `Destination: ${path.relative(repositoryRoot, plan.outputRoot)}.`,
    mode === "build"
      ? `Installation: ${verification.installation}; transaction cleanup: ${verification.cleanup}.`
      : carrierMode
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

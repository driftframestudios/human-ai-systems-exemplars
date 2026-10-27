import './node-runtime-admission.mjs';
import { isDirectExecution } from './check-node-runtime.mjs';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertRegularFile,
  sha256,
  verifyPackagePlan,
  writePackagePlan,
} from "./iframe-route-package-engine.mjs";
import {
  assertOwnedPackageDirectory as assertOwnedCorePackageDirectory,
  createPackagePlan as createCorePackagePlan,
} from "./package-iframe-routes.mjs";
import { createCanvasPackagePlan } from "./package-canvas-iframe-routes.mjs";

const toolPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(toolPath), "..");
const familyOrder = Object.freeze(["core", "canvas"]);
const aggregateReceiptId = "iframe-routes.aggregate-package-receipt.v1";

export const aggregateDefaultPaths = Object.freeze({
  repositoryRoot,
  outputV1Root: path.join(
    repositoryRoot,
    ".iframe-route-build/iframes.vik.guru/v1",
  ),
});

function fail(message) {
  throw new Error(message);
}

function assertFamilyPlan(family, plan) {
  if (!plan || !(plan.outputFiles instanceof Map) || !plan.receipt) {
    fail(`Iframe route family ${family} did not return a package plan.`);
  }
  const expectedBasePath = `/v1/${family}/`;
  if (
    plan.receipt.host !== "iframes.vik.guru" ||
    plan.receipt.base_path !== expectedBasePath
  ) {
    fail(
      `Iframe route family ${family} must own iframes.vik.guru${expectedBasePath}.`,
    );
  }
  const receiptBytes = plan.outputFiles.get("route-manifest.json");
  if (!Buffer.isBuffer(receiptBytes)) {
    fail(`Iframe route family ${family} must emit route-manifest.json bytes.`);
  }
  return receiptBytes;
}

function routeCountFor(plan) {
  const count = plan.receipt.package_contract?.primary_routes;
  if (!Number.isSafeInteger(count) || count < 1) {
    fail("An iframe route family receipt must report a positive primary route count.");
  }
  return count;
}

function packageBytesFor(plan) {
  return [...plan.outputFiles.values()].reduce(
    (total, bytes) => total + bytes.byteLength,
    0,
  );
}

function serializeAggregateReceipt(receipt, familyBytes) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const bytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    const generatedBytes = familyBytes + bytes.byteLength;
    if (receipt.package_contract.generated_bytes === generatedBytes) return bytes;
    receipt.package_contract.generated_bytes = generatedBytes;
  }
  fail("Aggregate iframe route byte total did not stabilize.");
}

export async function createAggregatePackagePlan(options = {}) {
  const paths = { ...aggregateDefaultPaths, ...options };
  const [corePlan, canvasPlan] = await Promise.all([
    createCorePackagePlan(options.core ?? {}),
    createCanvasPackagePlan(options.canvas ?? {}),
  ]);
  const familyPlans = new Map([
    ["core", corePlan],
    ["canvas", canvasPlan],
  ]);
  const outputFiles = new Map();
  const portableOutputPaths = new Set();
  const families = [];
  let aggregateRoutes = 0;
  let aggregateFamilyBytes = 0;

  for (const family of familyOrder) {
    const plan = familyPlans.get(family);
    const receiptBytes = assertFamilyPlan(family, plan);
    for (const [relativePath, bytes] of plan.outputFiles) {
      const aggregatePath = path.posix.join(family, relativePath);
      const portablePath = aggregatePath.normalize("NFC").toLowerCase();
      if (outputFiles.has(aggregatePath) || portableOutputPaths.has(portablePath)) {
        fail(`Aggregate iframe route output collision at ${aggregatePath}.`);
      }
      outputFiles.set(aggregatePath, bytes);
      portableOutputPaths.add(portablePath);
    }
    const familyManifestSha256 = plan.receipt.route_contract?.sha256;
    if (!/^[a-f0-9]{64}$/.test(familyManifestSha256 ?? "")) {
      fail(`Iframe route family ${family} must bind its authored manifest hash.`);
    }
    const routes = routeCountFor(plan);
    const bytes = packageBytesFor(plan);
    aggregateRoutes += routes;
    aggregateFamilyBytes += bytes;
    families.push({
      id: family,
      base_path: `/v1/${family}/`,
      family_manifest_sha256: familyManifestSha256,
      route_receipt_file: `${family}/route-manifest.json`,
      route_receipt_sha256: sha256(receiptBytes),
      routes,
      files: plan.outputFiles.size,
      bytes,
    });
  }

  const receipt = {
    id: aggregateReceiptId,
    version: "1",
    host: "iframes.vik.guru",
    base_path: "/v1/",
    package_contract: {
      family_directories: [...familyOrder],
      primary_routes: aggregateRoutes,
      generated_files: outputFiles.size + 1,
      generated_bytes: 0,
      live_cloudflare_mutation: false,
    },
    families,
  };
  outputFiles.set("route-manifest.json", serializeAggregateReceipt(receipt, aggregateFamilyBytes));

  return {
    receipt,
    outputFiles,
    familyPlans,
    outputV1Root: paths.outputV1Root,
  };
}

async function ensureRegularDirectory(directory) {
  try {
    const status = await lstat(directory);
    if (status.isSymbolicLink() || !status.isDirectory()) {
      fail(`Iframe package path must be a regular directory: ${directory}.`);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await mkdir(directory);
  }
}

async function ensureBoundedDirectories(root, relativeDirectory) {
  await ensureRegularDirectory(root);
  let cursor = root;
  for (const component of relativeDirectory.split(path.posix.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    await ensureRegularDirectory(cursor);
  }
}

export async function assertOwnedAggregatePackageDirectory(directory) {
  const status = await lstat(directory);
  if (status.isSymbolicLink() || !status.isDirectory()) {
    fail(`Existing aggregate iframe package is not a regular directory: ${directory}.`);
  }
  const receiptPath = path.join(directory, "route-manifest.json");
  await assertRegularFile(receiptPath, "Existing aggregate iframe package receipt");
  let receipt;
  try {
    receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  } catch (error) {
    fail(
      `Existing aggregate iframe package receipt is invalid: ` +
      `${error instanceof Error ? error.message : error}`,
    );
  }
  if (
    receipt.id !== aggregateReceiptId ||
    receipt.host !== "iframes.vik.guru" ||
    receipt.base_path !== "/v1/" ||
    !Array.isArray(receipt.package_contract?.family_directories) ||
    receipt.package_contract.family_directories.length !== familyOrder.length ||
    receipt.package_contract.family_directories.some(
      (family, index) => family !== familyOrder[index],
    )
  ) {
    fail(`Existing aggregate iframe package is not owned by this builder: ${directory}.`);
  }
  return receipt;
}

async function assertOwnedLegacyCoreLayout(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  if (
    entries.length !== 1 ||
    entries[0].name !== "core" ||
    entries[0].isSymbolicLink() ||
    !entries[0].isDirectory()
  ) {
    fail(`Existing iframe v1 directory is not an owned legacy Core layout: ${directory}.`);
  }
  return await assertOwnedCorePackageDirectory(path.join(directory, "core"));
}

async function assertReplaceablePackageDirectory(directory) {
  try {
    return await assertOwnedAggregatePackageDirectory(directory);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return await assertOwnedLegacyCoreLayout(directory);
  }
}

export async function persistAggregatePackage(plan, destination = plan.outputV1Root) {
  const buildRoot = path.resolve(destination, "../..");
  const expectedBuildRoot = path.join(repositoryRoot, ".iframe-route-build");
  if (
    buildRoot !== expectedBuildRoot ||
    destination !== aggregateDefaultPaths.outputV1Root
  ) {
    fail(`Refusing an unexpected persistent iframe package destination: ${destination}.`);
  }
  await ensureBoundedDirectories(
    repositoryRoot,
    ".iframe-route-build/iframes.vik.guru",
  );
  const transaction = await mkdtemp(path.join(buildRoot, ".v1-transaction-"));
  const stage = path.join(transaction, "next");
  const previous = path.join(transaction, "previous");
  let movedPrevious = false;
  let preserveTransaction = false;

  try {
    await mkdir(stage);
    await writePackagePlan(plan, stage);
    const verification = await verifyPackagePlan(plan, stage);
    try {
      await assertReplaceablePackageDirectory(destination);
      await rename(destination, previous);
      movedPrevious = true;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
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
            `Iframe v1 package replacement failed and its prior generation could not be restored. ` +
            `Recovery directory: ${transaction}. Restore error: ` +
            `${restoreError instanceof Error ? restoreError.message : restoreError}.`,
          );
        }
      }
      throw error;
    }
    await rm(transaction, { recursive: true, force: true });
    return verification;
  } catch (error) {
    if (!preserveTransaction) {
      await rm(transaction, { recursive: true, force: true });
    }
    throw error;
  }
}

export async function checkAggregatePackage(plan) {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "iframe-route-v1-check-"));
  try {
    await writePackagePlan(plan, temporaryRoot);
    return await verifyPackagePlan(plan, temporaryRoot);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--check")) {
    fail(`Usage: node ${path.relative(repositoryRoot, toolPath)} [--check]`);
  }
  const plan = await createAggregatePackagePlan();
  const checkOnly = args[0] === "--check";
  const verification = checkOnly
    ? await checkAggregatePackage(plan)
    : await persistAggregatePackage(plan);
  const routeCount = [...plan.familyPlans.values()]
    .map(routeCountFor)
    .reduce((total, count) => total + count, 0);
  const destination = checkOnly
    ? "temporary verification directory (not persisted)"
    : path.relative(repositoryRoot, plan.outputV1Root);
  console.log([
    `Iframe route v1 package ${checkOnly ? "verified" : "built"}: ${familyOrder.length} families, ${routeCount} routes, ${verification.files} files, ${verification.bytes} bytes.`,
    `Destination: ${destination}.`,
    "Live Cloudflare mutation: none.",
  ].join("\n"));
}

if (isDirectExecution(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

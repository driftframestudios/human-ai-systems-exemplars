#!/usr/bin/env node
import './node-runtime-admission.mjs';

import { randomUUID } from "node:crypto";
import {
  access,
  readFile,
  readdir,
  rename,
  rm,
} from "node:fs/promises";
import { dirname, extname, join, parse, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const imageRoot = join(repositoryRoot, "context-canvas-project-surface/img/debriefs");
export const derivativeProfiles = Object.freeze({
  families: Object.freeze([
    Object.freeze({
      id: "full-debrief",
      directories: Object.freeze([
        "boolean-building-blocks",
        "choose-your-player",
        "queue-secretly-status-machine",
        "sample-noone-could-find",
        "who-to-believe",
      ]),
      widths: Object.freeze([960, 1920]),
    }),
  ]),
  sources: Object.freeze([
    Object.freeze({
      id: "catalog-card",
      paths: Object.freeze([
        "choose-your-player/robotics-upfront.webp",
        "spatial-capture/3d-modeling-scan.webp",
      ]),
      widths: Object.freeze([480, 960, 1920]),
    }),
    Object.freeze({
      id: "catalog-preview",
      paths: Object.freeze([
        "sample-noone-could-find/clinical-trial-coordination-upfront.webp",
      ]),
      widths: Object.freeze([480, 960, 1920]),
    }),
  ]),
});

export function configuredDerivativeWidths(profiles = derivativeProfiles) {
  return [...new Set(
    [...profiles.families, ...profiles.sources].flatMap((profile) => profile.widths),
  )].sort((left, right) => left - right);
}

function uint24le(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

export function webpDimensions(buffer, label = "WebP image") {
  if (
    buffer.length < 20
    || buffer.toString("ascii", 0, 4) !== "RIFF"
    || buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error(`${label} is not a valid RIFF WebP image.`);
  }

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (dataOffset + chunkSize > buffer.length) {
      throw new Error(`${label} has a truncated ${chunkType} chunk.`);
    }

    if (chunkType === "VP8X" && chunkSize >= 10) {
      return {
        width: uint24le(buffer, dataOffset + 4) + 1,
        height: uint24le(buffer, dataOffset + 7) + 1,
      };
    }

    if (chunkType === "VP8 " && chunkSize >= 10) {
      if (
        buffer[dataOffset + 3] !== 0x9d
        || buffer[dataOffset + 4] !== 0x01
        || buffer[dataOffset + 5] !== 0x2a
      ) {
        throw new Error(`${label} has an invalid VP8 frame header.`);
      }
      return {
        width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
      };
    }

    if (chunkType === "VP8L" && chunkSize >= 5) {
      if (buffer[dataOffset] !== 0x2f) {
        throw new Error(`${label} has an invalid VP8L signature.`);
      }
      return {
        width: 1 + buffer[dataOffset + 1] + ((buffer[dataOffset + 2] & 0x3f) << 8),
        height: 1
          + ((buffer[dataOffset + 2] & 0xc0) >> 6)
          + (buffer[dataOffset + 3] << 2)
          + ((buffer[dataOffset + 4] & 0x0f) << 10),
      };
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  throw new Error(`${label} does not contain a supported WebP image chunk.`);
}

export async function readWebpDimensions(path) {
  return webpDimensions(await readFile(path), path);
}

export function derivativePlan(sourceDimensions, requestedWidths = [960, 1920]) {
  return requestedWidths
    .filter((width) => width < sourceDimensions.width)
    .map((width) => ({
      width,
      height: Math.ceil(sourceDimensions.height * width / sourceDimensions.width),
    }));
}

export async function verifyDerivative({
  sourcePath,
  targetPath,
  expectedWidth,
}) {
  let sourceDimensions;
  let targetDimensions;
  try {
    [sourceDimensions, targetDimensions] = await Promise.all([
      readWebpDimensions(sourcePath),
      readWebpDimensions(targetPath),
    ]);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        `${targetPath} is missing. Run npm run build:debrief-image-derivatives to create it.`,
        { cause: error },
      );
    }
    throw error;
  }
  const expectedHeight = Math.ceil(
    sourceDimensions.height * expectedWidth / sourceDimensions.width,
  );

  if (
    targetDimensions.width !== expectedWidth
    || targetDimensions.height !== expectedHeight
  ) {
    throw new Error(
      `${targetPath} is ${targetDimensions.width}x${targetDimensions.height}; expected ${expectedWidth}x${expectedHeight} from its accepted source aspect ratio.`,
    );
  }

  return targetDimensions;
}

export function cwebpVersion() {
  const result = spawnSync("cwebp", ["-version"], { encoding: "utf8" });
  if (result.error?.code === "ENOENT") {
    throw new Error(
      "cwebp is required to build the Debrief image derivatives. Install libwebp and rerun npm run build:debrief-image-derivatives.",
    );
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || "Unable to read the installed cwebp version.");
  }

  const version = `${result.stdout}\n${result.stderr}`
    .match(/\b(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)\b/u)?.[1];
  if (!version) {
    throw new Error("The installed cwebp returned an unrecognized version string.");
  }
  return version;
}

export function runCwebp(sourcePath, targetPath, width) {
  const result = spawnSync(
    "cwebp",
    [
      "-quiet",
      "-q",
      "82",
      "-m",
      "6",
      "-sharp_yuv",
      "-metadata",
      "none",
      "-resize",
      String(width),
      "0",
      sourcePath,
      "-o",
      targetPath,
    ],
    { encoding: "utf8" },
  );

  if (result.error?.code === "ENOENT") {
    throw new Error(
      "cwebp is required to build the Debrief image derivatives. Install libwebp and rerun npm run build:debrief-image-derivatives.",
    );
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || `cwebp failed for ${sourcePath}.`);
  }
}

export async function generateDerivative({
  sourcePath,
  targetPath,
  expectedWidth,
  encode = runCwebp,
}) {
  const target = parse(targetPath);
  const temporaryPath = join(
    target.dir,
    `.${target.name}.${process.pid}.${randomUUID()}.tmp${target.ext || ".webp"}`,
  );

  try {
    await encode(sourcePath, temporaryPath, expectedWidth);
    await verifyDerivative({ sourcePath, targetPath: temporaryPath, expectedWidth });
    await rename(temporaryPath, targetPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

function parseArguments(argumentsList) {
  const unknown = argumentsList.filter((argument) => argument !== "--check");
  if (unknown.length > 0) {
    throw new Error(
      `Unknown argument${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}`,
    );
  }
  return { check: argumentsList.includes("--check") };
}

async function familyEntries(directory, configuredWidths) {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && extname(entry.name) === ".webp")
    .sort((left, right) => left.name.localeCompare(right.name));
  const names = new Set(entries.map((entry) => entry.name));
  const sources = [];
  const orphanDerivatives = [];

  for (const entry of entries) {
    const match = /-(\d+)\.webp$/u.exec(entry.name);
    if (!match) {
      sources.push(entry);
      continue;
    }

    const possibleSource = `${entry.name.slice(0, match.index)}.webp`;
    if (names.has(possibleSource)) continue;

    const width = Number(match[1]);
    if (configuredWidths.includes(width)) {
      orphanDerivatives.push({
        canonicalSourcePath: join(directory, possibleSource),
        path: join(directory, entry.name),
      });
      continue;
    }

    sources.push(entry);
  }

  return { orphanDerivatives, sources };
}

async function compileDerivativeTopology({
  root = imageRoot,
  profiles = derivativeProfiles,
} = {}) {
  const jobs = new Map();
  const orphanDerivatives = [];
  const configuredWidths = configuredDerivativeWidths(profiles);

  for (const profile of profiles.families) {
    for (const directoryName of profile.directories) {
      const directory = join(root, directoryName);
      const entries = await familyEntries(directory, configuredWidths);
      orphanDerivatives.push(...entries.orphanDerivatives);
      for (const entry of entries.sources) {
        const sourcePath = join(directory, entry.name);
        jobs.set(sourcePath, {
          profileId: profile.id,
          sourcePath,
          widths: [...profile.widths],
        });
      }
    }
  }

  // A source-specific profile intentionally replaces its family default. This
  // keeps card and preview delivery geometry explicit without making every
  // sibling in that directory inherit the same candidate widths.
  for (const profile of profiles.sources) {
    for (const relativePath of profile.paths) {
      const sourcePath = join(root, relativePath);
      await access(sourcePath);
      jobs.set(sourcePath, {
        profileId: profile.id,
        sourcePath,
        widths: [...profile.widths],
      });
    }
  }

  return {
    jobs: [...jobs.values()].sort((left, right) =>
      left.sourcePath.localeCompare(right.sourcePath)),
    orphanDerivatives: orphanDerivatives.sort((left, right) =>
      left.path.localeCompare(right.path)),
  };
}

export async function compileDerivativeJobs(options = {}) {
  return (await compileDerivativeTopology(options)).jobs;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function assertConfiguredDerivativeWidths(sourcePath, configuredWidths) {
  const source = parse(sourcePath);
  const candidatePattern = new RegExp(
    `^${escapeRegExp(source.name)}-(\\d+)\\.webp$`,
    "u",
  );
  for (const entry of await readdir(dirname(sourcePath), { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const match = candidatePattern.exec(entry.name);
    if (!match) continue;
    const width = Number(match[1]);
    if (!configuredWidths.includes(width)) {
      throw new Error(
        `${join(dirname(sourcePath), entry.name)} is an unexpected derivative for ${sourcePath}; configured widths are ${configuredWidths.join(", ")}.`,
      );
    }
  }
}

async function settleStaleDerivatives({
  sourcePath,
  expectedWidths,
  configuredWidths,
  check,
}) {
  const source = parse(sourcePath);
  const candidatePattern = new RegExp(
    `^${escapeRegExp(source.name)}-(\\d+)\\.webp$`,
    "u",
  );
  let removed = 0;

  for (const entry of await readdir(dirname(sourcePath), { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const match = candidatePattern.exec(entry.name);
    if (!match) continue;
    const width = Number(match[1]);
    const targetPath = join(dirname(sourcePath), entry.name);
    if (!configuredWidths.includes(width)) {
      throw new Error(
        `${targetPath} is an unexpected derivative for ${sourcePath}; configured widths are ${configuredWidths.join(", ")}.`,
      );
    }
    if (expectedWidths.includes(width)) continue;
    if (check) {
      throw new Error(
        `${targetPath} is a stale derivative for ${sourcePath}. `
          + "Run npm run build:debrief-image-derivatives to remove it.",
      );
    }
    await rm(targetPath, { force: true });
    removed += 1;
  }

  return removed;
}

export async function processDerivativeFamilies({
  check = false,
  root = imageRoot,
  profiles = derivativeProfiles,
} = {}) {
  let processed = 0;
  let skipped = 0;
  let removed = 0;
  const configuredWidths = configuredDerivativeWidths(profiles);
  const { jobs, orphanDerivatives } = await compileDerivativeTopology({ root, profiles });

  // Complete the naming preflight before a build writes or removes any bytes.
  // An unrecognized responsive width therefore fails as one coherent unit.
  for (const job of jobs) {
    await assertConfiguredDerivativeWidths(job.sourcePath, configuredWidths);
  }

  if (check && orphanDerivatives.length > 0) {
    const orphan = orphanDerivatives[0];
    throw new Error(
      `${orphan.path} is an orphan derivative because its accepted source `
        + `${orphan.canonicalSourcePath} is missing. `
        + "Run npm run build:debrief-image-derivatives to remove it.",
    );
  }

  // Read every accepted source before the build removes or replaces bytes.
  // A malformed source therefore leaves the complete derivative set unchanged.
  const preparedJobs = [];
  for (const job of jobs) {
    const sourceDimensions = await readWebpDimensions(job.sourcePath);
    const plan = derivativePlan(sourceDimensions, job.widths);
    const expectedWidths = plan.map(({ width }) => width);
    skipped += job.widths.length - expectedWidths.length;
    preparedJobs.push({ ...job, expectedWidths, plan });
  }

  for (const orphan of orphanDerivatives) {
    await rm(orphan.path, { force: true });
    removed += 1;
  }

  for (const job of preparedJobs) {
    removed += await settleStaleDerivatives({
      sourcePath: job.sourcePath,
      expectedWidths: job.expectedWidths,
      configuredWidths,
      check,
    });

    for (const { width } of job.plan) {
      const source = parse(job.sourcePath);
      const targetPath = join(source.dir, `${source.name}-${width}.webp`);
      if (check) {
        await verifyDerivative({
          sourcePath: job.sourcePath,
          targetPath,
          expectedWidth: width,
        });
      } else {
        await generateDerivative({
          sourcePath: job.sourcePath,
          targetPath,
          expectedWidth: width,
        });
      }
      processed += 1;
    }
  }

  return { processed, skipped, removed };
}

async function main() {
  const { check } = parseArguments(process.argv.slice(2));
  const encoderVersion = check ? null : cwebpVersion();
  const { processed, skipped, removed } = await processDerivativeFamilies({ check });
  const skippedMessage = skipped === 0
    ? ""
    : `; skipped ${skipped} candidate${skipped === 1 ? "" : "s"} at or above source width`;
  const removedMessage = removed === 0
    ? ""
    : `; removed ${removed} obsolete derivative${removed === 1 ? "" : "s"}`;

  if (check) {
    console.log(
      `Checked ${processed} Debrief WebP derivatives for eligibility, exact dimensions, and source aspect ratio${skippedMessage}.`,
    );
    return;
  }

  console.log(
    `Generated ${processed} Debrief WebP derivatives with cwebp ${encoderVersion}${skippedMessage}${removedMessage}.`,
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import {
  access,
  readFile,
  readdir,
  rename,
  rm,
} from "node:fs/promises";
import { extname, join, parse, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const imageRoot = join(repositoryRoot, "context-canvas-project-surface/img/debriefs");
const families = [
  "boolean-building-blocks",
  "choose-your-player",
  "queue-secretly-status-machine",
  "sample-noone-could-find",
];
const widths = [960, 1920];

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

export function derivativePlan(sourceDimensions, requestedWidths = widths) {
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
  const [sourceDimensions, targetDimensions] = await Promise.all([
    readWebpDimensions(sourcePath),
    readWebpDimensions(targetPath),
  ]);
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

export async function settleIneligibleDerivative({ targetPath, check }) {
  try {
    await access(targetPath);
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }

  if (check) {
    throw new Error(
      `${targetPath} is an obsolete derivative at or above its accepted source width. `
        + "Run npm run build:debrief-image-derivatives to remove it.",
    );
  }

  await rm(targetPath, { force: true });
  return true;
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

async function sourceEntries(directory) {
  const derivativePattern = new RegExp(`-(?:${widths.join("|")})\\.webp$`, "u");
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && extname(entry.name) === ".webp")
    .filter((entry) => !derivativePattern.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function processDerivativeFamilies({ check = false } = {}) {
  let processed = 0;
  let skipped = 0;
  let removed = 0;

  for (const family of families) {
    const directory = join(imageRoot, family);
    for (const entry of await sourceEntries(directory)) {
      const sourcePath = join(directory, entry.name);
      const sourceDimensions = await readWebpDimensions(sourcePath);
      for (const width of widths) {
        const basename = parse(entry.name).name;
        const targetPath = join(directory, `${basename}-${width}.webp`);
        if (width >= sourceDimensions.width) {
          skipped += 1;
          if (await settleIneligibleDerivative({ targetPath, check })) removed += 1;
          continue;
        }
        if (check) {
          await verifyDerivative({ sourcePath, targetPath, expectedWidth: width });
        } else {
          await generateDerivative({ sourcePath, targetPath, expectedWidth: width });
        }
        processed += 1;
      }
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

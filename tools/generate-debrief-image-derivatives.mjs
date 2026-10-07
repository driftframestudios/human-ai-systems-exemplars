#!/usr/bin/env node

import { readdir } from "node:fs/promises";
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

function runCwebp(sourcePath, targetPath, width) {
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

let generated = 0;
for (const family of families) {
  const directory = join(imageRoot, family);
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && extname(entry.name) === ".webp")
    .filter((entry) => !/-(?:960|1920)\.webp$/u.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const sourcePath = join(directory, entry.name);
    const basename = parse(entry.name).name;
    for (const width of widths) {
      runCwebp(sourcePath, join(directory, `${basename}-${width}.webp`), width);
      generated += 1;
    }
  }
}

console.log(`Generated ${generated} Debrief WebP derivatives at 960 px and 1920 px widths.`);

#!/usr/bin/env node

/**
 * Refresh the accepted repository-rendered inputs for the About visual sequence.
 *
 * Static product screenshots remain in their existing asset families. This
 * capture step renders the six problem-shaping views whose accepted pixels
 * come from live HTML, CSS, and SVG source in the repository. It captures the
 * complete set into a temporary sibling directory, validates every PNG and
 * page session, then promotes the accepted sources before atomically replacing
 * the manifest with their matching digests.
 */

import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

import { chromium } from "@playwright/test";

import {
  assertTelemetry,
  monitor,
  repositoryRoot,
  startStaticServer,
} from "../../../tools/core-architecture-browser-helper.mjs";

const movieRoot = import.meta.dirname;
const manifestPath = resolve(movieRoot, "about-style-cycle-sequence.json");
const acceptedRoot = resolve(movieRoot, "about-style-cycle-source-frames");
const acceptedSourcePrefix =
  "collaboration/impact-map-visual-variants/movie/about-style-cycle-source-frames";

const captureDescriptors = [
  { id: "poda-investment-flow", filename: "poda-investment-flow.png" },
  {
    id: "impact-branch-cobalt-drafting",
    filename: "impact-branch-cobalt-drafting.png",
  },
  {
    id: "impact-narrative-pop-quintile",
    filename: "impact-narrative-pop-quintile.png",
  },
  {
    id: "context-board-pop-drafting",
    filename: "context-board-pop-drafting.png",
  },
  {
    id: "context-assembly-ledger-quintile",
    filename: "context-assembly-ledger-quintile.png",
  },
  {
    id: "context-shared-cobalt-drafting",
    filename: "context-shared-cobalt-drafting.png",
  },
];

function repositoryRelative(path) {
  return relative(repositoryRoot, path).split(sep).join("/");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function waitForDocumentAssets(page) {
  await page.evaluate(async () => {
    await document.fonts?.ready;

    const pendingImages = [...document.images].map(image => {
      if (image.complete) {
        if (image.naturalWidth > 0) return Promise.resolve();
        return Promise.reject(new Error(`Image failed to load: ${image.currentSrc || image.src}`));
      }

      return new Promise((resolveImage, rejectImage) => {
        image.addEventListener("load", resolveImage, { once: true });
        image.addEventListener(
          "error",
          () => rejectImage(new Error(`Image failed to load: ${image.currentSrc || image.src}`)),
          { once: true },
        );
      });
    });

    await Promise.all(pendingImages);
  });
}

async function waitForStablePaint(locator) {
  await locator.waitFor({ state: "visible" });
  await waitForDocumentAssets(locator.page());
  await locator.evaluate(() => new Promise(resolvePaint => {
    requestAnimationFrame(() => requestAnimationFrame(resolvePaint));
  }));
}

async function capture(locator, filename, stageRoot) {
  await waitForStablePaint(locator);
  await locator.screenshot({
    animations: "disabled",
    path: resolve(stageRoot, filename),
  });
}

async function openPage(context, origin, route) {
  const page = await context.newPage();
  const telemetry = monitor(page);
  await page.goto(`${origin}/${route}`, { waitUntil: "domcontentloaded" });
  await waitForDocumentAssets(page);
  return { page, telemetry };
}

async function closePage(session) {
  try {
    assertTelemetry(session.telemetry);
  } finally {
    await session.page.close();
  }
}

function validatePng(bytes, descriptor) {
  const signature = "89504e470d0a1a0a";
  if (bytes.length < 4096) {
    throw new Error(`${descriptor.filename} is too small to be an accepted capture`);
  }
  if (bytes.subarray(0, 8).toString("hex") !== signature) {
    throw new Error(`${descriptor.filename} does not carry a PNG signature`);
  }
  if (bytes.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error(`${descriptor.filename} does not carry a PNG IHDR chunk`);
  }
  if (bytes.readUInt32BE(16) < 1 || bytes.readUInt32BE(20) < 1) {
    throw new Error(`${descriptor.filename} has invalid PNG dimensions`);
  }
}

async function validateCaptures(stageRoot) {
  const digests = new Map();
  for (const descriptor of captureDescriptors) {
    const bytes = await readFile(resolve(stageRoot, descriptor.filename));
    validatePng(bytes, descriptor);
    digests.set(descriptor.id, sha256(bytes));
  }
  return digests;
}

async function stageManifest(stageRoot, digests) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest.frames)) {
    throw new Error("About sequence manifest must provide a frames array");
  }

  for (const descriptor of captureDescriptors) {
    const matchingFrames = manifest.frames.filter(frame => frame.id === descriptor.id);
    if (matchingFrames.length !== 1) {
      throw new Error(
        `About sequence manifest must contain exactly one ${descriptor.id} frame`,
      );
    }

    const [frame] = matchingFrames;
    const expectedSourcePath = `${acceptedSourcePrefix}/${descriptor.filename}`;
    if (frame.source_path !== expectedSourcePath) {
      throw new Error(
        `${descriptor.id} must use the tracked source ${expectedSourcePath}`,
      );
    }
    frame.sha256 = digests.get(descriptor.id);
  }

  const stagedManifestPath = resolve(stageRoot, "about-style-cycle-sequence.json");
  await writeFile(stagedManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return stagedManifestPath;
}

async function promoteCaptures(stageRoot, stagedManifestPath) {
  await mkdir(acceptedRoot, { recursive: true });
  for (const descriptor of captureDescriptors) {
    await rename(
      resolve(stageRoot, descriptor.filename),
      resolve(acceptedRoot, descriptor.filename),
    );
  }
  await rename(stagedManifestPath, manifestPath);
}

async function captureSources(context, origin, stageRoot) {
  let session = await openPage(
    context,
    origin,
    "context-canvas-project-surface/img/plot/poda_investment_flow.svg",
  );
  try {
    await capture(session.page.locator("svg"), "poda-investment-flow.png", stageRoot);
  } finally {
    await closePage(session);
  }

  session = await openPage(
    context,
    origin,
    "collaboration/impact-map-visual-variants/index.html",
  );
  try {
    await session.page.locator('[data-variant="cobalt"]').click();
    await session.page.locator('[data-pattern="drafting"]').click();
    await session.page.locator('button[data-view="branch"]').click();
    await capture(
      session.page.locator("#impact-map"),
      "impact-branch-cobalt-drafting.png",
      stageRoot,
    );

    await session.page.locator('[data-variant="pop"]').click();
    await session.page.locator('[data-pattern="quintile"]').click();
    await session.page.locator('button[data-view="narrative"]').click();
    await session.page.locator('[data-narrative-frame="7"]').click();
    await capture(
      session.page.locator(".narrative-stage"),
      "impact-narrative-pop-quintile.png",
      stageRoot,
    );
  } finally {
    await closePage(session);
  }

  const contextTreeFrames = [
    ["board", "pop", "drafting", "context-board-pop-drafting.png"],
    ["assembly", "ledger", "quintile", "context-assembly-ledger-quintile.png"],
    ["shared", "cobalt", "drafting", "context-shared-cobalt-drafting.png"],
  ];

  for (const [view, treatment, pattern, filename] of contextTreeFrames) {
    const query = new URLSearchParams({ view, treatment, pattern });
    session = await openPage(
      context,
      origin,
      `collaboration/context-tree-visual-variants/index.html?${query}`,
    );
    try {
      // Keep sticky authoring controls outside the captured visual field.
      await session.page.addStyleTag({
        content: ".control-deck { position: static !important; }",
      });
      await capture(session.page.locator("#visual-surface"), filename, stageRoot);
    } finally {
      await closePage(session);
    }
  }
}

async function main() {
  const stageRoot = await mkdtemp(resolve(movieRoot, ".about-style-cycle-stage-"));
  let server;
  let browser;
  let context;

  try {
    server = await startStaticServer();
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      deviceScaleFactor: 1,
      viewport: { width: 1600, height: 1200 },
    });
    await captureSources(context, server.origin, stageRoot);
    const digests = await validateCaptures(stageRoot);
    const stagedManifestPath = await stageManifest(stageRoot, digests);
    await promoteCaptures(stageRoot, stagedManifestPath);
  } finally {
    await context?.close();
    await browser?.close();
    await server?.close();
    await rm(stageRoot, { recursive: true, force: true });
  }

  process.stdout.write(
    `Accepted six About sequence sources in ${repositoryRelative(acceptedRoot)}\n`,
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

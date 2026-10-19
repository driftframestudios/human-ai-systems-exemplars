#!/usr/bin/env node

import { chromium } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CANVAS_ROOT = resolve("context-canvas-project-surface/context-canvas");
const MEDIUM_WIDTHS = Object.freeze([895, 896, 897, 1024, 1025, 1199, 1200, 1201, 1366, 1440, 1536, 1728, 1920]);
const FMI_EDGE_WIDTHS = Object.freeze([1280, 1776, 1777]);
const FMI_ROUTE = "fmi-lims-eln-replatforming.html";
const FRAME_SELECTOR = ".table-figure--wide, .story-visual";
const TOLERANCE = 1;
const ANCHOR_ROUTES = Object.freeze([
  FMI_ROUTE,
  "genomic-viewer-replatforming.html",
  "prompt-side-conditions-practice.html"
]);

// Chromium is the fast, repeatable geometry gate for this repository. The
// visual-verification skill routes engine-specific evidence to a focused
// Firefox or WebKit observation when the mechanism or acceptance boundary
// makes that variation decision-bearing.
const ENGINE_LABEL = "Playwright Chromium";

function widthsForRoute(route) {
  return route === FMI_ROUTE
    ? Array.from(new Set([...MEDIUM_WIDTHS, ...FMI_EDGE_WIDTHS])).sort((a, b) => a - b)
    : MEDIUM_WIDTHS;
}

async function discoverWideFieldRoutes() {
  const entries = await readdir(CANVAS_ROOT, { withFileTypes: true });
  const routes = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
    const source = await readFile(resolve(CANVAS_ROOT, entry.name), "utf8");
    const hasOwnedClass = Array.from(source.matchAll(/class\s*=\s*["']([^"']*)["']/g)).some((match) => {
      const classTokens = match[1].trim().split(/\s+/);
      return classTokens.includes("table-figure--wide") || classTokens.includes("story-visual");
    });
    if (hasOwnedClass) routes.push(entry.name);
  }
  return routes.sort();
}

async function settleLayout(page) {
  await page.evaluate(() => new Promise((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
}

async function observeGeometry(page) {
  return page.evaluate(({ frameSelector }) => {
    function rectObject(rect) {
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height
      };
    }

    function isVisible(element, rect) {
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    }

    const viewportWidth = document.documentElement.clientWidth;
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const matchedFrames = Array.from(document.querySelectorAll(frameSelector));
    const frames = matchedFrames.flatMap((element, index) => {
      const rect = element.getBoundingClientRect();
      if (!isVisible(element, rect)) return [];
      return [{
        index,
        tagName: element.tagName.toLowerCase(),
        className: element.className,
        rect: rectObject(rect)
      }];
    });
    const railElement = document.querySelector(".fmi-reading-rail, .page-section-rail");
    const railRect = railElement?.getBoundingClientRect() ?? null;
    const rail = railElement && railRect && isVisible(railElement, railRect)
      ? {
          className: railElement.className,
          rect: rectObject(railRect),
          side: railRect.left + (railRect.width / 2) >= viewportWidth / 2 ? "right" : "left"
        }
      : null;
    const localScrollRegions = Array.from(document.querySelectorAll(".table-figure--wide .table-scroll")).map((element, index) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const frameRect = element.closest(".table-figure--wide")?.getBoundingClientRect() ?? null;
      return {
        index,
        overflowX: style.overflowX,
        rect: rectObject(rect),
        frameRect: frameRect ? rectObject(frameRect) : null,
        visible: isVisible(element, rect)
      };
    });
    const populationTitle = document.querySelector("#population-cartography-title");
    const populationFrame = populationTitle?.parentElement?.querySelector(".table-figure--wide") ?? null;
    const populationScrollRegion = populationFrame?.querySelector(".table-scroll") ?? null;
    const populationScrollRect = populationScrollRegion?.getBoundingClientRect() ?? null;
    const populationLabelId = populationScrollRegion?.getAttribute("aria-labelledby") ?? "";
    const populationAriaLabel = populationScrollRegion?.getAttribute("aria-label")?.trim() ?? "";

    return {
      viewportWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      // Shared Cobalt and Debrief evidence owners paint a .5rem inline-end
      // hard shadow beyond DOMRect. Keep that owned paint clear of the rail.
      inlineEndPaintReserve: rootFontSize * 0.5,
      matchedFrameCount: matchedFrames.length,
      frames,
      rail,
      localScrollRegions,
      populationFramePresent: Boolean(populationFrame),
      populationFrameVisible: Boolean(
        populationFrame && isVisible(populationFrame, populationFrame.getBoundingClientRect())
      ),
      populationScrollRegion: populationScrollRegion && populationScrollRect
        ? {
            present: true,
            visible: isVisible(populationScrollRegion, populationScrollRect),
            tabIndex: populationScrollRegion.tabIndex,
            role: populationScrollRegion.getAttribute("role") ?? "",
            labelId: populationLabelId,
            labelPresent: Boolean(
              populationAriaLabel || (populationLabelId && document.getElementById(populationLabelId))
            )
          }
        : { present: false }
    };
  }, { frameSelector: FRAME_SELECTOR });
}

function collectFailures(route, width, observation) {
  const failures = [];
  const prefix = `${route} at ${width}px`;
  const viewportEscapes = [];
  const rightRailPaintEntries = [];
  const leftRailEntries = [];
  const expectedRailClass = route === FMI_ROUTE
    ? "fmi-reading-rail"
    : "page-section-rail";

  if (!observation.matchedFrameCount) {
    failures.push(`${prefix}: the source-discovered route contains no wide-field frame in the rendered document.`);
  } else if (!observation.frames.length) {
    failures.push(`${prefix}: the source-discovered wide-field route exposes no visible wide frame.`);
  } else if (observation.frames.length !== observation.matchedFrameCount) {
    failures.push(
      `${prefix}: ${observation.frames.length} of ${observation.matchedFrameCount} matched wide frames are visible.`
    );
  }

  if (
    expectedRailClass &&
    (!observation.rail || !String(observation.rail.className).includes(expectedRailClass))
  ) {
    failures.push(`${prefix}: the expected visible ${expectedRailClass} is missing.`);
  }

  if (observation.documentScrollWidth > observation.viewportWidth + TOLERANCE) {
    failures.push(`${prefix}: page width is ${observation.documentScrollWidth}px for a ${observation.viewportWidth}px viewport.`);
  }

  for (const frame of observation.frames) {
    const label = `${frame.tagName}.${String(frame.className).trim().replace(/\s+/g, ".")}[${frame.index}]`;
    if (frame.rect.left < -TOLERANCE || frame.rect.right > observation.viewportWidth + TOLERANCE) {
      viewportEscapes.push(`${label} (${frame.rect.left.toFixed(2)}px to ${frame.rect.right.toFixed(2)}px)`);
    }
    const paintedRight = frame.rect.right + observation.inlineEndPaintReserve;
    if (observation.rail?.side === "right" && paintedRight > observation.rail.rect.left + TOLERANCE) {
      rightRailPaintEntries.push(
        `${label} (${paintedRight.toFixed(2)}px painted / ${observation.rail.rect.left.toFixed(2)}px rail)`
      );
    }
    if (
      observation.rail?.side === "left" &&
      // The generated compact-left rail is an interaction overlay. The FMI
      // rail instead owns a static clearance field in its compact mode.
      String(observation.rail.className).includes("fmi-reading-rail") &&
      frame.rect.left < observation.rail.rect.right - TOLERANCE
    ) {
      leftRailEntries.push(`${label} (${frame.rect.left.toFixed(2)}px / ${observation.rail.rect.right.toFixed(2)}px)`);
    }
  }

  if (viewportEscapes.length) {
    failures.push(`${prefix}: ${viewportEscapes.length} wide frame(s) escape the viewport; first: ${viewportEscapes[0]}.`);
  }
  if (rightRailPaintEntries.length) {
    failures.push(
      `${prefix}: ${rightRailPaintEntries.length} wide frame paint reserve(s) enter the right rail field; ` +
      `first painted frame/rail edges: ${rightRailPaintEntries[0]}.`
    );
  }
  if (leftRailEntries.length) {
    failures.push(`${prefix}: ${leftRailEntries.length} wide frame(s) enter the left rail field; first frame/rail edges: ${leftRailEntries[0]}.`);
  }

  for (const region of observation.localScrollRegions) {
    if (region.visible && !/(auto|scroll)/.test(region.overflowX)) {
      failures.push(`${prefix}: local table scroll region ${region.index} uses overflow-x: ${region.overflowX}.`);
    }
    if (
      region.visible &&
      region.frameRect &&
      (region.rect.left < region.frameRect.left - TOLERANCE || region.rect.right > region.frameRect.right + TOLERANCE)
    ) {
      failures.push(
        `${prefix}: local table scroll region ${region.index} leaves its outer frame ` +
        `(${region.rect.left.toFixed(2)}px to ${region.rect.right.toFixed(2)}px / ` +
        `${region.frameRect.left.toFixed(2)}px to ${region.frameRect.right.toFixed(2)}px).`
      );
    }
  }

  if (route === FMI_ROUTE && !observation.populationFramePresent) {
    failures.push(`${prefix}: the population-cartography frame is missing.`);
  } else if (route === FMI_ROUTE && !observation.populationFrameVisible) {
    failures.push(`${prefix}: the population-cartography frame is outside the visible layout.`);
  }

  if (route === FMI_ROUTE && !observation.populationScrollRegion.present) {
    failures.push(`${prefix}: the population-cartography local scroll region is missing.`);
  } else if (
    route === FMI_ROUTE &&
    (
      !observation.populationScrollRegion.visible ||
      observation.populationScrollRegion.tabIndex < 0 ||
      observation.populationScrollRegion.role !== "region" ||
      !observation.populationScrollRegion.labelPresent
    )
  ) {
    failures.push(`${prefix}: the population-cartography local scroll region lacks its visible, named keyboard boundary.`);
  }

  return failures;
}

async function main() {
  const surfaceRoutes = await discoverWideFieldRoutes();
  if (!surfaceRoutes.length) {
    throw new Error("Context Canvas medium containment contract discovered zero wide-field routes.");
  }
  const missingAnchors = ANCHOR_ROUTES.filter((route) => !surfaceRoutes.includes(route));
  if (missingAnchors.length) {
    throw new Error(`Context Canvas medium containment anchors are missing: ${missingAnchors.join(", ")}.`);
  }
  const browser = await chromium.launch();
  const failures = [];
  let observations = 0;
  let framesObserved = 0;
  let framesMatched = 0;
  let minimumRightRailPaintGap = Number.POSITIVE_INFINITY;

  try {
    for (const route of surfaceRoutes) {
      const context = await browser.newContext({ viewport: { width: MEDIUM_WIDTHS[0], height: 1000 } });
      const page = await context.newPage();
      await page.goto(pathToFileURL(resolve(CANVAS_ROOT, route)).href, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts?.ready).catch(() => {});

      for (const width of widthsForRoute(route)) {
        await page.setViewportSize({ width, height: 1000 });
        await settleLayout(page);
        const observation = await observeGeometry(page);
        observations += 1;
        framesObserved += observation.frames.length;
        framesMatched += observation.matchedFrameCount;
        if (observation.rail?.side === "right") {
          for (const frame of observation.frames) {
            minimumRightRailPaintGap = Math.min(
              minimumRightRailPaintGap,
              observation.rail.rect.left - (frame.rect.right + observation.inlineEndPaintReserve)
            );
          }
        }
        failures.push(...collectFailures(route, width, observation));
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error(`Context Canvas medium containment contract failed with ${failures.length} finding(s).`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Context Canvas medium containment contract passed in ${ENGINE_LABEL}: ${surfaceRoutes.length} wide-field routes, ` +
    `${observations} route/viewport observations, ${framesObserved}/${framesMatched} visible/matched wide-frame observations, ` +
    `${minimumRightRailPaintGap.toFixed(2)}px minimum painted rail gap.`
  );
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

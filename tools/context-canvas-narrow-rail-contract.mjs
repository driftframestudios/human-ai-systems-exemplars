#!/usr/bin/env node

import { chromium } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { collectRailRevealFailures } from "./rail-label-failures.mjs";
import { measureRailReveal } from "./rail-reveal-observer.mjs";

const CANVAS_ROOT = resolve("context-canvas-project-surface/context-canvas");
const FAMILY_VIEWPORT = Object.freeze({ width: 390, height: 844 });
const SHORT_VIEWPORT = Object.freeze({ width: 390, height: 360 });
const SEAM_WIDTHS = Object.freeze([640, 896, 897]);
const STANDARD_ANCHOR = "conditioning-field.html";
const LONG_STANDARD_ANCHOR = "ai-systems.html";
const SOURCE_ANCHOR = "debriefs.html";
const CUSTOM_ANCHOR = "fmi-lims-eln-replatforming.html";
const RESTING_ANCHOR = "exemplar-maximal-information-radiator.html";
const SHELL_OPTIONAL_ROUTES = new Map([
  ["404.html", "The standalone not-found document keeps its authored recovery surface without generated site chrome."]
]);
const MINIMUM_VISIBLE_RATIO = 0.99;
const VISIBLE_STATES = Object.freeze([
  "hover",
  "pointerBridge",
  "readoutHover",
  "focus",
  "pointerDepartureWithFocus"
]);
const ENGINE_LABEL = "Playwright Chromium";

function routeUrl(route) {
  return pathToFileURL(resolve(CANVAS_ROOT, route)).href;
}

async function discoverShellRoutes() {
  const entries = await readdir(CANVAS_ROOT, { withFileTypes: true });
  const routes = [];
  const failures = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
    const source = await readFile(resolve(CANVAS_ROOT, entry.name), "utf8");
    const loadsCss = /<link\b[^>]*href=["'](?:\.\/)?canvas-shell\.css["'][^>]*>/iu.test(source);
    const loadsJs = /<script\b[^>]*src=["'](?:\.\/)?canvas-shell\.js["'][^>]*>/iu.test(source);

    if (loadsCss !== loadsJs) {
      failures.push(`${entry.name}: canvas-shell.css and canvas-shell.js should load as one shared component.`);
      continue;
    }
    if (!loadsCss) {
      if (!SHELL_OPTIONAL_ROUTES.has(entry.name)) {
        failures.push(`${entry.name}: top-level Context Canvas route is outside the generated shell without a named exception.`);
      }
      continue;
    }
    routes.push(entry.name);
  }
  routes.sort();
  if (!routes.length) failures.push("No top-level Context Canvas shell consumers were discovered.");
  for (const optionalRoute of SHELL_OPTIONAL_ROUTES.keys()) {
    if (!entries.some((entry) => entry.isFile() && entry.name === optionalRoute)) {
      failures.push(`${optionalRoute}: named shell-optional route is missing.`);
    }
  }
  return { routes, failures };
}

async function settleShell(page) {
  await page.evaluate(() => new Promise((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
}

async function renderedShape(page) {
  return page.evaluate(() => {
    function sectionDestination(section) {
      if (section.id) return section.id;
      const labelledBy = section.getAttribute("aria-labelledby");
      if (labelledBy && document.getElementById(labelledBy)) return labelledBy;
      return section.querySelector("h1[id], h2[id], h3[id]")?.id || "";
    }

    function uniqueMajorSections(main) {
      return Array.from(main.querySelectorAll("section[aria-labelledby], article[aria-labelledby]")).filter((candidate) => {
        const parent = candidate.parentElement?.closest("section[aria-labelledby], article[aria-labelledby]");
        return !parent || parent === candidate;
      });
    }

    function authoredDestinationLabel(destination, index) {
      const labelledBy = destination.getAttribute("aria-labelledby");
      const heading = labelledBy && document.getElementById(labelledBy)
        ? document.getElementById(labelledBy)
        : destination.querySelector("h1, h2, h3");
      return heading?.textContent?.trim().replace(/\s+/gu, " ") || `Section ${index + 1}`;
    }

    function generatedDestination(link) {
      const hash = link.getAttribute("href") || "";
      if (!hash.startsWith("#")) return "";
      try {
        return decodeURIComponent(hash.slice(1));
      } catch {
        return hash.slice(1);
      }
    }

    const main = document.querySelector("main");
    const customRail = document.querySelector("[data-canvas-page-rail]");
    const source = main?.querySelector("[data-canvas-page-rail-source]") || null;
    const destinationCandidates = !main
      ? []
      : source
        ? Array.from(source.children).filter((candidate) => Boolean(candidate.id))
        : uniqueMajorSections(main);
    const expectedLinks = destinationCandidates.map((destination, index) => ({
      destination: sectionDestination(destination),
      label: authoredDestinationLabel(destination, index)
    })).filter((entry) => Boolean(entry.destination));
    const expectedCategory = customRail
      ? "custom"
      : expectedLinks.length >= 2
        ? source ? "source" : "standard"
        : "none";
    const rail = document.querySelector(".page-section-rail");
    const links = rail ? Array.from(rail.querySelectorAll(".page-section-rail__link")) : [];
    const actualLinks = links.map((link) => ({
      accessibleName: link.getAttribute("aria-label") || "",
      destination: generatedDestination(link)
    }));
    const availableIndexes = links.flatMap((link, index) => link.parentElement?.hidden ? [] : [index]);
    const longestIndex = availableIndexes.reduce((current, index) => {
      const currentLength = links[current]?.dataset.sectionSlug?.length || 0;
      const candidateLength = links[index]?.dataset.sectionSlug?.length || 0;
      return candidateLength > currentLength ? index : current;
    }, availableIndexes[0] ?? -1);

    return {
      expectedCategory,
      expectedLinkCount: expectedLinks.length,
      hasMain: Boolean(main),
      hasGeneratedRail: Boolean(rail),
      generatedMode: !rail ? null : rail.classList.contains("page-section-rail--source") ? "source" : "standard",
      actualLinkCount: links.length,
      actualLinks,
      availableIndexes,
      expectedLinks,
      longestIndex,
      customLinkCount: customRail?.querySelectorAll("a[href]").length || 0
    };
  });
}

function shapeFailures(route, shape) {
  const failures = [];
  if (!shape.hasMain) failures.push(`${route}: shell consumer has no main element.`);
  if (shape.expectedCategory === "standard" || shape.expectedCategory === "source") {
    if (!shape.hasGeneratedRail) {
      failures.push(`${route}: ${shape.expectedCategory} rail destinations exist but no generated rail rendered.`);
    }
    if (shape.generatedMode !== shape.expectedCategory) {
      failures.push(`${route}: expected ${shape.expectedCategory} rail mode; observed ${shape.generatedMode || "none"}.`);
    }
    if (shape.actualLinkCount !== shape.expectedLinkCount) {
      failures.push(`${route}: expected ${shape.expectedLinkCount} generated links; observed ${shape.actualLinkCount}.`);
    }
    for (let index = 0; index < Math.min(shape.expectedLinks.length, shape.actualLinks.length); index += 1) {
      const expected = shape.expectedLinks[index];
      const actual = shape.actualLinks[index];
      if (actual.destination !== expected.destination) {
        failures.push(
          `${route}: rail link ${index + 1} targets "${actual.destination || "missing"}"; ` +
          `expected "${expected.destination || "missing"}".`
        );
      }
      if (actual.accessibleName !== expected.label) {
        failures.push(
          `${route}: rail link ${index + 1} accessible name "${actual.accessibleName || "missing"}" ` +
          `does not match complete destination label "${expected.label}".`
        );
      }
    }
    if (!shape.availableIndexes.length) failures.push(`${route}: generated rail has no available links to exercise.`);
  } else if (shape.hasGeneratedRail) {
    failures.push(`${route}: ${shape.expectedCategory} route unexpectedly rendered a shared generated rail.`);
  }
  if (shape.expectedCategory === "custom" && !shape.customLinkCount) {
    failures.push(`${route}: custom rail marker has no authored links.`);
  }
  return failures;
}

function uniqueIndexes(shape, includeEdges = false) {
  const indexes = includeEdges
    ? [shape.availableIndexes[0], shape.longestIndex, shape.availableIndexes.at(-1)]
    : [shape.longestIndex];
  return Array.from(new Set(indexes.filter((index) => Number.isInteger(index) && index >= 0)));
}

function revealFailures(route, width, railReveal) {
  const failures = collectRailRevealFailures(railReveal).map((failure) => `${route}@${width}px: ${failure}`);
  for (const reveal of railReveal.results) {
    for (const stateName of VISIBLE_STATES) {
      const state = reveal.states[stateName];
      if (state.linkVisibleRatio < MINIMUM_VISIBLE_RATIO) {
        failures.push(
          `${route}@${width}px: rail tick "${reveal.slug}" is only ${(state.linkVisibleRatio * 100).toFixed(0)}% ` +
          `reachable during ${stateName}.`
        );
      }
    }
  }
  return failures;
}

function directionFailures(route, width, railReveal) {
  const failures = [];
  for (const reveal of railReveal.results) {
    const state = reveal.states.hover;
    if (!state.railRect || !state.targetRect) continue;
    if (width <= 896) {
      if (!state.compact) failures.push(`${route}@${width}px: expected compact rail mode.`);
      if (state.railRect.left > 1) failures.push(`${route}@${width}px: compact rail is not at the inline-start edge.`);
      if (state.targetRect.left < state.railRect.right - 1) {
        failures.push(`${route}@${width}px: compact readout does not open toward the inline end.`);
      }
    } else {
      if (state.compact) failures.push(`${route}@${width}px: compact rail mode persisted above the 56rem seam.`);
      if (state.railRect.right < width - 20) failures.push(`${route}@${width}px: desktop rail is not at the inline-end edge.`);
      if (state.targetRect.right > state.railRect.left + 1) {
        failures.push(`${route}@${width}px: desktop readout does not open toward the inline start.`);
      }
    }
  }
  return failures;
}

function updateMinimums(accounting, railReveal) {
  for (const reveal of railReveal.results) {
    for (const stateName of VISIBLE_STATES) {
      const state = reveal.states[stateName];
      accounting.minimumReadoutRatio = Math.min(accounting.minimumReadoutRatio, state.clippedRatio);
      accounting.minimumPaintedRatio = Math.min(accounting.minimumPaintedRatio, state.paintedClippedRatio);
      accounting.minimumFocusRatio = Math.min(
        accounting.minimumFocusRatio,
        reveal.states.focus.focusIndicator.visibleRatio
      );
    }
  }
}

async function visit(page, route) {
  await page.goto(routeUrl(route), { waitUntil: "domcontentloaded", timeout: 10000 });
  await settleShell(page);
}

async function runFamilySweep(browser, routes, failures, accounting) {
  const context = await browser.newContext({ viewport: FAMILY_VIEWPORT, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);
  try {
    for (const route of routes) {
      try {
        await visit(page, route);
        const shape = await renderedShape(page);
        accounting.categories[shape.expectedCategory] += 1;
        accounting.categoryByRoute.set(route, shape.expectedCategory);
        failures.push(...shapeFailures(route, shape));
        if (shape.expectedCategory !== "standard" && shape.expectedCategory !== "source") continue;

        const railReveal = await measureRailReveal(page, {
          linkIndexes: uniqueIndexes(shape),
          settleMs: 0,
          departureSettleMs: 140,
          leaveHover: false
        });
        accounting.familyRails += 1;
        accounting.familyLinks += shape.actualLinkCount;
        accounting.interactions += railReveal.testedCount;
        failures.push(...revealFailures(route, FAMILY_VIEWPORT.width, railReveal));
        failures.push(...directionFailures(route, FAMILY_VIEWPORT.width, railReveal));
        updateMinimums(accounting, railReveal);
      } catch (error) {
        failures.push(`${route}@${FAMILY_VIEWPORT.width}px: ${error.message}`);
      }
    }
  } finally {
    await context.close();
  }
}

function requireCategoryAnchors(accounting, failures) {
  const anchors = [
    [STANDARD_ANCHOR, "standard"],
    [LONG_STANDARD_ANCHOR, "standard"],
    [SOURCE_ANCHOR, "source"],
    [CUSTOM_ANCHOR, "custom"],
    [RESTING_ANCHOR, "none"]
  ];
  for (const [route, category] of anchors) {
    if (accounting.categoryByRoute.get(route) !== category) {
      failures.push(`${route}: required ${category} category anchor was not observed.`);
    }
  }
  if (!accounting.categories.standard) failures.push("No standard generated rails were discovered.");
  if (!accounting.categories.source) failures.push("No source-derived generated rail was discovered.");
}

async function runSeamSweep(browser, failures, accounting) {
  const context = await browser.newContext({
    viewport: { width: SEAM_WIDTHS[0], height: 720 },
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);
  try {
    for (const width of SEAM_WIDTHS) {
      await page.setViewportSize({ width, height: 720 });
      for (const route of [STANDARD_ANCHOR, SOURCE_ANCHOR]) {
        try {
          await visit(page, route);
          const shape = await renderedShape(page);
          failures.push(...shapeFailures(route, shape));
          const railReveal = await measureRailReveal(page, {
            linkIndexes: uniqueIndexes(shape, true),
            settleMs: 0,
            departureSettleMs: 140,
            leaveHover: false
          });
          accounting.seamObservations += 1;
          accounting.interactions += railReveal.testedCount;
          failures.push(...revealFailures(route, width, railReveal));
          failures.push(...directionFailures(route, width, railReveal));
          updateMinimums(accounting, railReveal);
        } catch (error) {
          failures.push(`${route}@${width}px seam: ${error.message}`);
        }
      }
    }
  } finally {
    await context.close();
  }
}

async function runShortRailSweep(browser, failures, accounting) {
  const context = await browser.newContext({ viewport: SHORT_VIEWPORT, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);
  try {
    for (const route of [LONG_STANDARD_ANCHOR, SOURCE_ANCHOR]) {
      try {
        await visit(page, route);
        const shape = await renderedShape(page);
        failures.push(...shapeFailures(route, shape));
        const railReveal = await measureRailReveal(page, {
          linkIndexes: uniqueIndexes(shape, true),
          settleMs: 0,
          departureSettleMs: 140,
          leaveHover: false
        });
        accounting.shortRailObservations += 1;
        accounting.interactions += railReveal.testedCount;
        failures.push(...revealFailures(route, SHORT_VIEWPORT.width, railReveal));
        updateMinimums(accounting, railReveal);

        const overflowed = railReveal.results.some((reveal) => reveal.list?.scrollHeight > reveal.list?.clientHeight);
        if (!overflowed) failures.push(`${route}@390x360: short-height rail did not exercise vertical overflow.`);
        const lastIndex = shape.availableIndexes.at(-1);
        const lastReveal = railReveal.results.find((reveal) => reveal.index === lastIndex);
        if (!lastReveal || lastReveal.states.hover.list.scrollTop <= 0) {
          failures.push(`${route}@390x360: last rail link did not produce observable list scrolling.`);
        }

        await page.locator(".page-section-rail__link").nth(shape.availableIndexes[0]).focus();
        const firstReachability = await page.evaluate((firstIndex) => {
          const link = document.querySelectorAll(".page-section-rail__link")[firstIndex];
          const list = link?.closest("ol");
          if (!link || !list) return null;
          const linkRect = link.getBoundingClientRect();
          const listRect = list.getBoundingClientRect();
          return {
            scrollTop: list.scrollTop,
            reachable: linkRect.top >= Math.max(0, listRect.top) - 1 &&
              linkRect.bottom <= Math.min(window.innerHeight, listRect.bottom) + 1
          };
        }, shape.availableIndexes[0]);
        if (!firstReachability?.reachable) {
          failures.push(`${route}@390x360: first rail link was not reachable after returning from the last link.`);
        }
      } catch (error) {
        failures.push(`${route}@390x360 short rail: ${error.message}`);
      }
    }
  } finally {
    await context.close();
  }
}

async function runForcedColorsSweep(browser, failures, accounting) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 640 },
    reducedMotion: "reduce",
    forcedColors: "active"
  });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);
  try {
    for (const route of [STANDARD_ANCHOR, SOURCE_ANCHOR]) {
      try {
        await visit(page, route);
        const shape = await renderedShape(page);
        const railReveal = await measureRailReveal(page, {
          linkIndexes: uniqueIndexes(shape),
          settleMs: 0,
          departureSettleMs: 140,
          leaveHover: false
        });
        accounting.forcedColorObservations += 1;
        accounting.interactions += railReveal.testedCount;
        failures.push(...revealFailures(`${route} forced-colors`, 390, railReveal));
        updateMinimums(accounting, railReveal);
      } catch (error) {
        failures.push(`${route}@390px forced-colors: ${error.message}`);
      }
    }
  } finally {
    await context.close();
  }
}

async function runPrintSweep(browser, failures, accounting) {
  const context = await browser.newContext({ viewport: { width: 390, height: 640 } });
  const page = await context.newPage();
  try {
    await page.emulateMedia({ media: "print" });
    for (const route of [STANDARD_ANCHOR, SOURCE_ANCHOR]) {
      try {
        await visit(page, route);
        const display = await page.locator(".page-section-rail").evaluate((rail) => getComputedStyle(rail).display);
        accounting.printObservations += 1;
        if (display !== "none") failures.push(`${route} print: generated rail remains visibly rendered.`);
      } catch (error) {
        failures.push(`${route} print: ${error.message}`);
      }
    }
  } finally {
    await context.close();
  }
}

async function main() {
  const discovery = await discoverShellRoutes();
  const failures = [...discovery.failures];
  const accounting = {
    categories: { standard: 0, source: 0, custom: 0, none: 0 },
    categoryByRoute: new Map(),
    familyRails: 0,
    familyLinks: 0,
    interactions: 0,
    seamObservations: 0,
    shortRailObservations: 0,
    forcedColorObservations: 0,
    printObservations: 0,
    minimumReadoutRatio: 1,
    minimumPaintedRatio: 1,
    minimumFocusRatio: 1
  };
  const browser = await chromium.launch();
  try {
    await runFamilySweep(browser, discovery.routes, failures, accounting);
    requireCategoryAnchors(accounting, failures);
    await runSeamSweep(browser, failures, accounting);
    await runShortRailSweep(browser, failures, accounting);
    await runForcedColorsSweep(browser, failures, accounting);
    await runPrintSweep(browser, failures, accounting);
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error(`Context Canvas narrow rail contract failed with ${failures.length} finding(s).`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Context Canvas narrow rail contract passed in ${ENGINE_LABEL}: ${discovery.routes.length} shell routes; ` +
    `${accounting.categories.standard} standard, ${accounting.categories.source} source, ` +
    `${accounting.categories.custom} custom, and ${accounting.categories.none} resting rail surfaces; ` +
    `${accounting.familyLinks} generated links; ${accounting.interactions} focused interactions; ` +
    `${accounting.seamObservations} seam, ${accounting.shortRailObservations} short-height, ` +
    `${accounting.forcedColorObservations} forced-color, and ${accounting.printObservations} print observations; ` +
    `${(accounting.minimumReadoutRatio * 100).toFixed(1)}% minimum readout, ` +
    `${(accounting.minimumPaintedRatio * 100).toFixed(1)}% minimum painted, and ` +
    `${(accounting.minimumFocusRatio * 100).toFixed(1)}% minimum focus-indicator visibility.`
  );
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

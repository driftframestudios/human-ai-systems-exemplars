#!/usr/bin/env node

import assert from "node:assert/strict";

import { chromium } from "@playwright/test";

import {
  assertTelemetry,
  monitor,
  startStaticServer,
} from "./core-architecture-browser-helper.mjs";

const route = "context-canvas-project-surface/context-canvas/index.html";
const stillName = "impact-map-style-cycle-poster.jpg";
const motionName = "impact-map-style-cycle-calm.gif";

async function mediaState(page) {
  return page.evaluate(() => {
    const image = document.querySelector("[data-about-media-image]");
    const button = document.querySelector("[data-about-media-toggle]");
    return {
      source: image?.getAttribute("src") || "",
      label: button?.textContent?.trim() || "",
      pressed: button?.getAttribute("aria-pressed") || "",
      hidden: Boolean(button?.hidden),
    };
  });
}

async function waitForSource(page, filename, timeout = 5000) {
  await page.waitForFunction(
    expected => document
      .querySelector("[data-about-media-image]")
      ?.getAttribute("src")
      ?.endsWith(expected),
    filename,
    { timeout },
  );
}

async function authoredMotionDuration(page) {
  const duration = await page.locator("[data-about-media-image]").evaluate(image => (
    Number.parseInt(image.dataset.motionDurationMs || "", 10)
  ));
  assert.ok(Number.isInteger(duration) && duration > 0, "motion duration stays a positive integer");
  return duration;
}

async function captionLayout(page) {
  return page.evaluate(() => {
    const caption = document.querySelector("[data-about-media] figcaption");
    const copy = caption?.querySelector("span");
    const button = caption?.querySelector("[data-about-media-toggle]");
    const serialize = element => {
      const rect = element?.getBoundingClientRect();
      return rect ? {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      } : null;
    };
    return {
      caption: serialize(caption),
      copy: serialize(copy),
      button: serialize(button),
    };
  });
}

function assertWideCaptionLayout(layout) {
  const { caption, copy, button } = layout;
  const tolerance = 1;

  assert.ok(caption && copy && button, "wide media exposes its caption, copy, and control");
  assert.ok(copy.width > 0 && copy.height > 0, "wide caption copy has a rendered box");
  assert.ok(button.width > 0 && button.height > 0, "wide caption control has a rendered box");

  for (const [label, box] of [["copy", copy], ["control", button]]) {
    assert.ok(box.left >= caption.left - tolerance, `wide caption ${label} stays inside the left edge`);
    assert.ok(box.right <= caption.right + tolerance, `wide caption ${label} stays inside the right edge`);
    assert.ok(box.top >= caption.top - tolerance, `wide caption ${label} stays inside the top edge`);
    assert.ok(box.bottom <= caption.bottom + tolerance, `wide caption ${label} stays inside the bottom edge`);
  }

  assert.ok(
    copy.right + tolerance < button.left,
    "wide caption copy and control preserve a visible, non-overlapping gap",
  );
}

async function openPage(browser, origin, contextOptions = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    ...contextOptions,
  });
  await context.route("https://iframes.vik.guru/**", route => route.fulfill({
    status: 200,
    contentType: "text/html",
    body: "<!doctype html><title>Unobserved iframe carrier</title>",
  }));
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const telemetry = monitor(page);
  const motionRequests = [];
  page.on("request", request => {
    if (request.url().endsWith(motionName)) motionRequests.push(request.url());
  });
  await page.goto(`${origin}/${route}`, { waitUntil: "domcontentloaded" });
  return { context, page, telemetry, motionRequests };
}

const server = await startStaticServer();
const browser = await chromium.launch({ headless: true });

try {
  const normal = await openPage(browser, server.origin);
  const button = normal.page.locator("[data-about-media-toggle]");

  assert.deepEqual(await mediaState(normal.page), {
    source: `../img/media/${stillName}`,
    label: "Play visual sequence",
    pressed: "false",
    hidden: false,
  });
  assertWideCaptionLayout(await captionLayout(normal.page));
  assert.equal(normal.motionRequests.length, 0, "motion stays outside the initial load");

  await button.focus();
  await normal.page.keyboard.press("Enter");
  await waitForSource(normal.page, motionName);
  assert.equal((await mediaState(normal.page)).pressed, "true");

  await normal.page.emulateMedia({ media: "print" });
  await waitForSource(normal.page, stillName);
  assert.equal((await mediaState(normal.page)).hidden, true);

  await normal.page.emulateMedia({ media: "screen" });
  await normal.page.waitForFunction(() => !document.querySelector("[data-about-media-toggle]")?.hidden);
  await button.click();
  await waitForSource(normal.page, motionName);
  const motionDuration = await authoredMotionDuration(normal.page);
  await waitForSource(normal.page, stillName, motionDuration + 2_000);
  assert.deepEqual(await mediaState(normal.page), {
    source: `../img/media/${stillName}`,
    label: "Play visual sequence",
    pressed: "false",
    hidden: false,
  });

  assertTelemetry(normal.telemetry);
  await normal.context.close();

  const reduced = await openPage(browser, server.origin, { reducedMotion: "reduce" });
  assert.deepEqual(await mediaState(reduced.page), {
    source: `../img/media/${stillName}`,
    label: "Play visual sequence",
    pressed: "false",
    hidden: true,
  });

  await reduced.page.evaluate(() => {
    document.querySelector("[data-about-media-toggle]")?.click();
  });
  assert.equal((await mediaState(reduced.page)).source, `../img/media/${stillName}`);
  assert.equal(reduced.motionRequests.length, 0, "reduced-motion reading never requests the GIF");

  assertTelemetry(reduced.telemetry);
  await reduced.context.close();

  const narrow = await openPage(browser, server.origin, {
    viewport: { width: 390, height: 844 },
  });
  const narrowBounds = await narrow.page.evaluate(() => {
    const media = document.querySelector("[data-about-media]");
    const rect = media?.getBoundingClientRect();
    return {
      left: rect?.left ?? -1,
      right: rect?.right ?? Number.POSITIVE_INFINITY,
      viewportWidth: window.innerWidth,
      pageClientWidth: document.documentElement.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
    };
  });
  assert.ok(narrowBounds.left >= 0, "narrow media stays inside the left viewport edge");
  assert.ok(
    narrowBounds.right <= narrowBounds.viewportWidth,
    "narrow media stays inside the right viewport edge",
  );
  assert.ok(
    narrowBounds.pageScrollWidth <= narrowBounds.pageClientWidth,
    "the narrow page has no horizontal overflow",
  );
  assert.equal(narrow.motionRequests.length, 0, "narrow initial reading stays still");
  assertTelemetry(narrow.telemetry);
  await narrow.context.close();

  const forced = await openPage(browser, server.origin, { forcedColors: "active" });
  const forcedPresentation = await forced.page.evaluate(() => {
    const media = document.querySelector("[data-about-media]");
    const style = media ? window.getComputedStyle(media) : null;
    return {
      borderStyle: style?.borderTopStyle || "",
      borderWidth: Number.parseFloat(style?.borderTopWidth || "0"),
      boxShadow: style?.boxShadow || "",
    };
  });
  assert.notEqual(forcedPresentation.borderStyle, "none");
  assert.ok(forcedPresentation.borderWidth > 0);
  assert.equal(forcedPresentation.boxShadow, "none");
  assert.equal(forced.motionRequests.length, 0, "forced-color initial reading stays still");
  assertTelemetry(forced.telemetry);
  await forced.context.close();

  console.log(
    "About media browser contract passed: initial still, keyboard activation, "
    + "wide caption containment, print reset, one-cycle reset, reduced-motion still, narrow containment, "
    + "and forced-color presentation.",
  );
} finally {
  await browser.close();
  await server.close();
}

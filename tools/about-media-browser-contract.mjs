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

async function openPage(browser, origin, contextOptions = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    ...contextOptions,
  });
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
  await waitForSource(normal.page, stillName, 12_000);
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

  console.log(
    "About media browser contract passed: initial still, keyboard activation, "
    + "print reset, one-cycle reset, and reduced-motion still.",
  );
} finally {
  await browser.close();
  await server.close();
}

import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { chromium, webkit } from "@playwright/test";

import { startStaticServer } from "../../tools/core-architecture-browser-helper.mjs";

const visitorRoot = "/context-canvas-project-surface/context-canvas/";
const routes = [
  { label: "About", path: "index.html", imageCount: 1, expectsLazyImage: false },
  { label: "AI Systems", path: "ai-systems.html", imageCount: 15, expectsLazyImage: true },
  { label: "Debriefs", path: "debriefs.html", imageCount: 20, expectsLazyImage: true },
];
const engines = [
  { label: "Chromium", browserType: chromium },
  { label: "WebKit", browserType: webkit },
];

let server;

before(async () => {
  server = await startStaticServer();
});

after(async () => {
  await server?.close();
});

async function observeRoute(browser, route) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);

  const imageResponses = new Map();
  const imageRequestFailures = [];
  page.on("response", response => {
    if (!response.url().startsWith(server.origin)) return;
    const contentType = response.headers()["content-type"] || "";
    if (response.request().resourceType() !== "image" && !contentType.startsWith("image/")) return;
    imageResponses.set(response.url(), {
      status: response.status(),
      contentType,
    });
  });
  page.on("requestfailed", request => {
    if (request.resourceType() !== "image" || !request.url().startsWith(server.origin)) return;
    imageRequestFailures.push(
      `${request.method()} ${request.url()} · ${request.failure()?.errorText || "request failed"}`,
    );
  });

  try {
    await page.goto(`${server.origin}${visitorRoot}${route.path}`, {
      waitUntil: "domcontentloaded",
    });

    if (route.path === "debriefs.html") {
      await page.locator(".debrief-catalog__card a[href]").first().focus();
      await page.locator("[data-preview-entry]").waitFor({ state: "visible" });
    }

    const images = page.locator("img[src]");
    assert.equal(await images.count(), route.imageCount, `${route.label} authored image count`);

    const observations = [];
    for (let index = 0; index < route.imageCount; index += 1) {
      const image = images.nth(index);
      await image.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        imageIndex => {
          const candidate = document.querySelectorAll("img[src]")[imageIndex];
          return Boolean(
            candidate &&
            candidate.complete &&
            candidate.naturalWidth > 0 &&
            candidate.naturalHeight > 0,
          );
        },
        index,
      );
      observations.push(await image.evaluate(candidate => ({
        alt: candidate.getAttribute("alt") || "",
        currentSrc: candidate.currentSrc,
        height: candidate.naturalHeight,
        loading: candidate.loading,
        width: candidate.naturalWidth,
      })));
    }

    assert.deepEqual(imageRequestFailures, [], imageRequestFailures.join(" | "));
    for (const observation of observations) {
      const resolved = new URL(observation.currentSrc);
      assert.equal(resolved.origin, server.origin, `${route.label} image remains on the loopback origin`);
      assert.ok(observation.width > 0, `${route.label} image ${resolved.pathname} has natural width`);
      assert.ok(observation.height > 0, `${route.label} image ${resolved.pathname} has natural height`);

      const response = imageResponses.get(observation.currentSrc);
      assert.ok(response, `${route.label} records the response for ${resolved.pathname}`);
      assert.ok(
        response.status >= 200 && response.status < 300,
        `${route.label} ${resolved.pathname} returns ${response.status}`,
      );
      assert.match(
        response.contentType,
        /^image\//u,
        `${route.label} ${resolved.pathname} returns an image media type`,
      );
    }
    const lazyImageCount = observations.filter(observation => observation.loading === "lazy").length;
    if (route.expectsLazyImage) {
      assert.ok(
        lazyImageCount > 0,
        `${route.label} retains a lazy image that resolves after entering range`,
      );
    } else {
      assert.equal(
        lazyImageCount,
        0,
        `${route.label} keeps its sole above-the-fold image eager; the native-video poster has a focused contract`,
      );
    }

    return observations;
  } finally {
    await context.close();
  }
}

for (const engine of engines) {
  test(`${engine.label} loads the reported About, AI Systems, and Debriefs image population through loopback HTTP`, async t => {
    let browser;
    try {
      browser = await engine.browserType.launch({ headless: true });
    } catch (error) {
      throw new Error(
        `${engine.label} is required for the Context Canvas image-delivery contract. ` +
          "Run `npm run playwright:install:visitor-images` before this check. " +
          `${error instanceof Error ? error.message : error}`,
      );
    }

    try {
      const observations = [];
      for (const route of routes) {
        await t.test(`${route.label} resolves every authored image`, async () => {
          observations.push(...await observeRoute(browser, route));
        });
      }

      const extensions = new Set(
        observations.map(observation => new URL(observation.currentSrc).pathname.split(".").pop()?.toLowerCase()),
      );
      assert.ok(extensions.has("jpg") || extensions.has("jpeg"), `${engine.label} receives JPEG`);
      assert.ok(extensions.has("svg"), `${engine.label} receives SVG`);
      assert.ok(extensions.has("webp"), `${engine.label} receives WebP`);

      t.diagnostic(
        `${engine.label} ${browser.version()} received ${observations.length} images ` +
          "across About, AI Systems, and Debriefs.",
      );
    } finally {
      await browser.close();
    }
  });
}

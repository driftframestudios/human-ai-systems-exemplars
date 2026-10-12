#!/usr/bin/env node

import assert from "node:assert/strict";

import { chromium, webkit } from "@playwright/test";

import {
  assertTelemetry,
  monitor,
  startStaticServer,
} from "./core-architecture-browser-helper.mjs";

const route = "context-canvas-project-surface/context-canvas/index.html";
const stillName = "impact-map-style-cycle-poster.jpg";
const gifName = "impact-map-style-cycle-calm.gif";
const videoUrl = "https://vik.guru/v1-cdn/video/about-problem-to-system-sequence/v0.1.0/movie.mp4";
const videoPosterUrl = "https://vik.guru/v1-cdn/video/about-problem-to-system-sequence/v0.1.0/poster.webp";

async function mediaState(page) {
  return page.evaluate(() => {
    const root = document.querySelector("[data-about-media]");
    const video = root?.querySelector("[data-about-media-video]");
    const source = video?.querySelector("source");
    const fallback = root?.querySelector(".about-media__fallback a");
    const status = root?.querySelector("[data-about-media-status]");
    const sequence = document.querySelector("#about-media-sequence");
    return {
      videoSource: source?.getAttribute("src") || "",
      videoPoster: video?.getAttribute("poster") || "",
      deliveryPoster: video?.dataset.videoPoster || "",
      preload: video?.getAttribute("preload") || "",
      controls: Boolean(video?.controls),
      playsInline: Boolean(video?.playsInline),
      paused: Boolean(video?.paused),
      fallback: fallback?.getAttribute("href") || "",
      statusHidden: Boolean(status?.hidden),
      motionPreference: root?.dataset.motionPreference || "",
      visualDescriptionItems: sequence?.querySelectorAll("li").length || 0,
      visualDescriptionText: sequence?.textContent?.trim() || "",
    };
  });
}

async function mediaLayout(page) {
  return page.evaluate(() => {
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
      media: serialize(document.querySelector("[data-about-media]")),
      video: serialize(document.querySelector("[data-about-media-video]")),
      caption: serialize(document.querySelector("[data-about-media] figcaption")),
      sequence: serialize(document.querySelector("#about-media-sequence")),
    };
  });
}

function assertContained(layout, viewportWidth, label) {
  const tolerance = 1;
  const { media, video, caption, sequence } = layout;
  assert.ok(media && video && caption && sequence, `${label}: media regions render`);
  for (const [region, box] of Object.entries({ media, video, caption, sequence })) {
    assert.ok(box.width > 0 && box.height > 0, `${label}: ${region} has geometry`);
    assert.ok(box.left >= -tolerance, `${label}: ${region} stays inside the left edge`);
    assert.ok(box.right <= viewportWidth + tolerance, `${label}: ${region} stays inside the right edge`);
  }
  assert.ok(video.top >= media.top - tolerance, `${label}: video starts inside the media frame`);
  assert.ok(caption.bottom <= media.bottom + tolerance, `${label}: caption ends inside the media frame`);
}

async function openPage(
  browser,
  origin,
  { contextOptions = {}, failVideoRequest = false } = {},
) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    ...contextOptions,
  });
  await context.route("https://iframes.vik.guru/**", request => request.fulfill({
    status: 200,
    contentType: "text/html",
    body: "<!doctype html><title>Unobserved iframe carrier</title>",
  }));
  if (failVideoRequest) {
    await context.route(videoUrl, request => request.abort("failed"));
  }
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const telemetry = monitor(page);
  const videoRequests = [];
  const gifRequests = [];
  page.on("request", request => {
    if (request.url() === videoUrl) videoRequests.push(request.url());
    if (request.url().endsWith(gifName)) gifRequests.push(request.url());
  });
  await page.goto(`${origin}/${route}`, { waitUntil: "domcontentloaded" });
  return { context, page, telemetry, videoRequests, gifRequests };
}

async function assertSourceFailureRecovery(browser, origin, engineLabel) {
  const failed = await openPage(browser, origin, { failVideoRequest: true });
  try {
    const status = failed.page.locator("[data-about-media-status]");
    await failed.page.locator("[data-about-media-video]").evaluate(video => video.load());
    await status.waitFor({ state: "visible" });
    assert.ok(
      failed.videoRequests.length >= 1,
      `${engineLabel}: a real source-selection attempt reaches the failed route`,
    );
    assert.equal(
      await status.isHidden(),
      false,
      `${engineLabel}: a child-source failure reveals the recovery route`,
    );
    await failed.page.locator("[data-about-media-video]").dispatchEvent("loadedmetadata");
    assert.equal(
      await status.isHidden(),
      true,
      `${engineLabel}: successful metadata clears the recovery message`,
    );
  } finally {
    await failed.context.close();
  }
}

const server = await startStaticServer();
const browser = await chromium.launch({ headless: true });
const webkitBrowser = await webkit.launch({ headless: true });

try {
  const normal = await openPage(browser, server.origin);
  const normalState = await mediaState(normal.page);
  assert.deepEqual(normalState, {
    videoSource: videoUrl,
    videoPoster: `../img/media/${stillName}`,
    deliveryPoster: videoPosterUrl,
    preload: "none",
    controls: true,
    playsInline: true,
    paused: true,
    fallback: `../img/media/${gifName}`,
    statusHidden: true,
    motionPreference: "visitor-controlled",
    visualDescriptionItems: 5,
    visualDescriptionText: normalState.visualDescriptionText,
  });
  assert.match(normalState.visualDescriptionText, /Visual description/u);
  assert.match(normalState.visualDescriptionText, /genomics plate view/u);
  assert.match(normalState.visualDescriptionText, /decision space/u);
  assertContained(await mediaLayout(normal.page), 1440, "desktop");
  assert.equal(normal.videoRequests.length, 0, "the initial reading leaves high-quality motion unloaded");
  assert.equal(normal.gifRequests.length, 0, "the initial reading leaves fallback motion unloaded");

  assertTelemetry(normal.telemetry);
  await normal.context.close();

  await assertSourceFailureRecovery(browser, server.origin, "Chromium");

  const reduced = await openPage(browser, server.origin, {
    contextOptions: { reducedMotion: "reduce" },
  });
  const reducedState = await mediaState(reduced.page);
  assert.equal(reducedState.motionPreference, "reduced");
  assert.equal(reducedState.paused, true);
  assert.equal(reduced.videoRequests.length, 0, "reduced-motion initial reading leaves MP4 bytes unloaded");
  assert.equal(reduced.gifRequests.length, 0, "reduced-motion initial reading leaves GIF bytes unloaded");
  assertTelemetry(reduced.telemetry);
  await reduced.context.close();

  const narrow = await openPage(browser, server.origin, {
    contextOptions: { viewport: { width: 390, height: 844 } },
  });
  assertContained(await mediaLayout(narrow.page), 390, "narrow");
  const narrowBounds = await narrow.page.evaluate(() => ({
    pageClientWidth: document.documentElement.clientWidth,
    pageScrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(
    narrowBounds.pageScrollWidth <= narrowBounds.pageClientWidth,
    "the narrow page has no horizontal overflow",
  );
  assert.equal(narrow.videoRequests.length, 0, "narrow initial reading stays on the poster");
  assert.equal(narrow.gifRequests.length, 0, "narrow initial reading leaves fallback motion unloaded");
  assertTelemetry(narrow.telemetry);
  await narrow.context.close();

  const forced = await openPage(browser, server.origin, {
    contextOptions: { forcedColors: "active" },
  });
  const forcedPresentation = await forced.page.evaluate(() => {
    const media = document.querySelector("[data-about-media]");
    const sequence = document.querySelector("#about-media-sequence");
    const mediaStyle = media ? window.getComputedStyle(media) : null;
    const sequenceStyle = sequence ? window.getComputedStyle(sequence) : null;
    return {
      borderStyle: mediaStyle?.borderTopStyle || "",
      borderWidth: Number.parseFloat(mediaStyle?.borderTopWidth || "0"),
      boxShadow: mediaStyle?.boxShadow || "",
      sequenceBorderStyle: sequenceStyle?.borderLeftStyle || "",
      sequenceBorderWidth: Number.parseFloat(sequenceStyle?.borderLeftWidth || "0"),
    };
  });
  assert.notEqual(forcedPresentation.borderStyle, "none");
  assert.ok(forcedPresentation.borderWidth > 0);
  assert.equal(forcedPresentation.boxShadow, "none");
  assert.notEqual(forcedPresentation.sequenceBorderStyle, "none");
  assert.ok(forcedPresentation.sequenceBorderWidth > 0);
  assert.equal(forced.videoRequests.length, 0, "forced-color initial reading stays on the poster");
  assertTelemetry(forced.telemetry);
  await forced.context.close();

  const webkitNormal = await openPage(webkitBrowser, server.origin);
  const webkitState = await mediaState(webkitNormal.page);
  assert.equal(webkitState.controls, true, "WebKit exposes native controls");
  assert.equal(webkitState.playsInline, true, "WebKit keeps playback inline");
  assert.equal(webkitState.paused, true, "WebKit begins on the passive poster");
  assertContained(await mediaLayout(webkitNormal.page), 1440, "WebKit desktop");
  assert.equal(
    webkitNormal.videoRequests.length,
    0,
    "WebKit honors the preload hint during the observed initial reading",
  );
  assertTelemetry(webkitNormal.telemetry);
  await webkitNormal.context.close();

  await assertSourceFailureRecovery(webkitBrowser, server.origin, "WebKit");

  console.log(
    "About media browser contract passed: native controls, local poster, unloaded motion, "
    + "explicit GIF recovery, visible sequence, reduced-motion pause, narrow containment, "
    + "real source-failure recovery, forced-color presentation, and WebKit coverage.",
  );
} finally {
  await browser.close();
  await webkitBrowser.close();
  await server.close();
}

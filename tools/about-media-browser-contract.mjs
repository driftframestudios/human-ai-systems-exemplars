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
      autoplay: Boolean(video?.autoplay),
      controls: Boolean(video?.controls),
      playsInline: Boolean(video?.playsInline),
      paused: Boolean(video?.paused),
      fallback: fallback?.getAttribute("href") || "",
      statusHidden: Boolean(status?.hidden),
      motionPreference: root?.dataset.motionPreference || "",
      visualDescriptionElement: sequence?.tagName || "",
      visualDescriptionOpen: Boolean(sequence?.open),
      visualDescriptionSummary: sequence?.querySelector("summary")?.textContent?.trim() || "",
      visualDescriptionItems: sequence?.querySelectorAll("li").length || 0,
      visualDescriptionText: sequence?.textContent?.trim() || "",
    };
  });
}

async function assertDescriptionDisclosure(page, engineLabel) {
  const details = page.locator("details#about-media-sequence");
  const summary = details.locator("summary");
  assert.equal(await details.evaluate(element => element.open), false, `${engineLabel}: visual description begins closed`);
  await summary.focus();
  await summary.press("Enter");
  assert.equal(await details.evaluate(element => element.open), true, `${engineLabel}: keyboard opens the visual description`);
  assert.equal(await summary.evaluate(element => element === document.activeElement), true, `${engineLabel}: summary retains focus`);
  await summary.press("Enter");
  assert.equal(await details.evaluate(element => element.open), false, `${engineLabel}: keyboard closes the visual description`);
}

async function assertDescriptionPrint(page, engineLabel) {
  const details = page.locator("details#about-media-sequence");
  await details.evaluate(element => {
    element.open = false;
  });
  await page.emulateMedia({ media: "print" });
  try {
    const presentation = await details.evaluate(element => {
      const summary = element.querySelector("summary");
      const list = element.querySelector("ol");
      const firstItem = list?.querySelector("li");
      const serialize = target => {
        const style = target ? window.getComputedStyle(target) : null;
        const rect = target?.getBoundingClientRect();
        return {
          display: style?.display || "",
          visibility: style?.visibility || "",
          width: rect?.width || 0,
          height: rect?.height || 0,
        };
      };
      return {
        open: element.open,
        summary: serialize(summary),
        list: serialize(list),
        firstItem: serialize(firstItem),
      };
    });

    assert.equal(presentation.open, false, `${engineLabel}: print keeps the disclosure state collapsed`);
    assert.notEqual(presentation.summary.display, "none", `${engineLabel}: print labels the visual-description list`);
    assert.notEqual(presentation.summary.visibility, "hidden", `${engineLabel}: print keeps the visual-description label visible`);
    assert.ok(presentation.summary.width > 0 && presentation.summary.height > 0, `${engineLabel}: print gives the visual-description label geometry`);
    assert.notEqual(presentation.list.display, "none", `${engineLabel}: print renders the visual-description list`);
    assert.notEqual(presentation.list.visibility, "hidden", `${engineLabel}: print keeps the visual-description list visible`);
    assert.ok(presentation.list.width > 0 && presentation.list.height > 0, `${engineLabel}: print gives the visual-description list geometry`);
    assert.notEqual(presentation.firstItem.display, "none", `${engineLabel}: print renders visual-description items`);
    assert.ok(presentation.firstItem.height > 0, `${engineLabel}: print gives visual-description items geometry`);
  } finally {
    await page.emulateMedia({ media: "screen" });
  }
}

async function assertFooterContact(page, engineLabel) {
  const contactState = await page.evaluate(() => {
    const contacts = [...document.querySelectorAll("[data-context-canvas-contact]")];
    return {
      count: contacts.length,
      text: contacts.map(contact => contact.textContent?.trim() || ""),
      linkedCount: contacts.filter(contact => contact.matches("a") || contact.closest("a")).length,
      mailtoCount: document.querySelectorAll('a[href^="mailto:" i]').length,
    };
  });

  assert.equal(contactState.count, 1, `${engineLabel}: the enhanced footer contains one contact address`);
  assert.deepEqual(contactState.text, ["contact@vik.guru"], `${engineLabel}: the footer retains the exact contact address`);
  assert.equal(contactState.linkedCount, 0, `${engineLabel}: the footer contact remains plain text`);
  assert.equal(contactState.mailtoCount, 0, `${engineLabel}: the page contains no mailto link`);
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
    autoplay: false,
    controls: true,
    playsInline: true,
    paused: true,
    fallback: `../img/media/${gifName}`,
    statusHidden: true,
    motionPreference: "visitor-controlled",
    visualDescriptionElement: "DETAILS",
    visualDescriptionOpen: false,
    visualDescriptionSummary: "Visual description",
    visualDescriptionItems: 5,
    visualDescriptionText: normalState.visualDescriptionText,
  });
  assert.match(normalState.visualDescriptionText, /Visual description/u);
  assert.match(normalState.visualDescriptionText, /genomics plate view/u);
  assert.match(normalState.visualDescriptionText, /decision space/u);
  await assertFooterContact(normal.page, "Chromium");
  await assertDescriptionDisclosure(normal.page, "Chromium");
  await assertDescriptionPrint(normal.page, "Chromium");
  assertContained(await mediaLayout(normal.page), 1440, "desktop");
  assert.equal(normal.gifRequests.length, 0, "the initial reading leaves fallback motion unloaded");

  assertTelemetry(normal.telemetry);
  await normal.context.close();

  await assertSourceFailureRecovery(browser, server.origin, "Chromium");

  const reduced = await openPage(browser, server.origin, {
    contextOptions: { reducedMotion: "reduce" },
  });
  const reducedState = await mediaState(reduced.page);
  assert.equal(reducedState.motionPreference, "reduced");
  assert.equal(reducedState.preload, "none");
  assert.equal(reducedState.autoplay, false);
  assert.equal(reducedState.paused, true);
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
  assertTelemetry(forced.telemetry);
  await forced.context.close();

  const webkitNormal = await openPage(webkitBrowser, server.origin);
  const webkitState = await mediaState(webkitNormal.page);
  assert.equal(webkitState.preload, "none", "WebKit receives the authored preload hint");
  assert.equal(webkitState.autoplay, false, "WebKit leaves playback under visitor control");
  assert.equal(webkitState.controls, true, "WebKit exposes native controls");
  assert.equal(webkitState.playsInline, true, "WebKit keeps playback inline");
  assert.equal(webkitState.paused, true, "WebKit begins on the passive poster");
  await assertFooterContact(webkitNormal.page, "WebKit");
  await assertDescriptionDisclosure(webkitNormal.page, "WebKit");
  await assertDescriptionPrint(webkitNormal.page, "WebKit");
  assertContained(await mediaLayout(webkitNormal.page), 1440, "WebKit desktop");
  // The HTML preload value is an author hint that a user agent may ignore.
  // Playback state and controls own the cross-browser visitor-control contract.
  assertTelemetry(webkitNormal.telemetry);
  await webkitNormal.context.close();

  await assertSourceFailureRecovery(webkitBrowser, server.origin, "WebKit");

  console.log(
    "About media browser contract passed: native controls, local poster, visitor-controlled motion, "
    + "explicit GIF recovery, keyboard-operable and print-complete visual description, reduced-motion pause, "
    + "narrow containment, one plain-text footer contact, real source-failure recovery, forced-color presentation, "
    + "and WebKit coverage.",
  );
} finally {
  await browser.close();
  await webkitBrowser.close();
  await server.close();
}

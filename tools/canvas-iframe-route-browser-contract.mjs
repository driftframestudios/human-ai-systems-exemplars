#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import visitorBoundaryContract from "../context-canvas-project-surface/context-canvas/visitor-boundary-contract.js";
import {
  artifactAttribution,
  artifactAuthor,
  artifactLicense,
} from "./attribution-contract.mjs";
import {
  assertTelemetry,
  monitor,
  startStaticServer,
} from "./core-architecture-browser-helper.mjs";

const toolPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(toolPath), "..");
const routeManifestPath = path.join(
  repositoryRoot,
  "iframe-route-families/canvas/public-iframe-route-manifest-v1.json",
);
const iframeHostRoot = path.join(
  repositoryRoot,
  ".iframe-route-build/iframes.vik.guru",
);
const canvasOutputRoot = path.join(iframeHostRoot, "v1/canvas");
const routeReceiptPath = path.join(canvasOutputRoot, "route-manifest.json");
const viewports = Object.freeze([
  { id: "desktop", width: 1280, height: 1000 },
  { id: "narrow", width: 320, height: 900 },
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function htmlAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function readRegularFile(filePath, label) {
  let status;
  try {
    status = await lstat(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        `${label} is missing at ${path.relative(repositoryRoot, filePath)}. ` +
          "Run `npm run build:iframe-routes` before the browser contract.",
      );
    }
    throw error;
  }
  assert.equal(status.isSymbolicLink(), false, `${label} must not be a symbolic link`);
  assert.equal(status.isFile(), true, `${label} must be a regular file`);
  return await readFile(filePath);
}

async function readJson(filePath, label) {
  const bytes = await readRegularFile(filePath, label);
  try {
    return { bytes, value: JSON.parse(bytes.toString("utf8")) };
  } catch (error) {
    throw new Error(
      `${label} is not valid JSON: ${error instanceof Error ? error.message : error}`,
    );
  }
}

async function regularFileTree(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.join(current, entry.name);
    const relativePath = path.relative(root, entryPath).split(path.sep).join(path.posix.sep);
    if (entry.isSymbolicLink()) {
      assert.fail(`Generated route closure must not contain a symbolic link: ${relativePath}`);
    }
    if (entry.isDirectory()) {
      files.push(...await regularFileTree(root, entryPath));
      continue;
    }
    assert.equal(
      entry.isFile(),
      true,
      `Generated route closure must contain only regular files: ${relativePath}`,
    );
    files.push(relativePath);
  }
  return files;
}

function routeFileEntries(route, field) {
  return route[field] ?? [];
}

function expectedRouteFiles(route) {
  return sorted([
    "index.html",
    ...routeFileEntries(route, "package_files").map(({ target_file }) => target_file),
    ...routeFileEntries(route, "navigation_files").map(({ target_file }) => target_file),
  ]);
}

function receiptFileEntries(receiptRoute, field) {
  return receiptRoute.static_resource_closure?.[field] ?? [];
}

async function assertGeneratedClosure(contract, receipt) {
  assert.equal(receipt.id, "context-canvas.iframe-route-package-receipt.v1");
  assert.equal(receipt.version, "1");
  assert.equal(receipt.host, contract.host);
  assert.equal(receipt.base_path, contract.base_path);
  assert.equal(receipt.package_contract?.primary_routes, 15);
  assert.equal(receipt.package_contract?.browser_request_observation_required, true);
  assert.equal(receipt.routes?.length, 15);

  const topLevelEntries = await readdir(canvasOutputRoot, { withFileTypes: true });
  const expectedTopLevel = sorted([
    "route-manifest.json",
    ...contract.routes.map(({ id }) => id),
  ]);
  assert.deepEqual(
    sorted(topLevelEntries.map(({ name }) => name)),
    expectedTopLevel,
    "the Canvas package contains only manifest-owned route directories and its receipt",
  );

  const receiptById = new Map(receipt.routes.map((route) => [route.id, route]));
  for (const route of contract.routes) {
    const receiptRoute = receiptById.get(route.id);
    assert.ok(receiptRoute, `generated receipt includes ${route.id}`);
    assert.equal(receiptRoute.public_alias, route.public_alias);
    assert.equal(receiptRoute.projection_file, `${route.id}/index.html`);
    assert.deepEqual(receiptRoute.carrier_policy, route.carrier_policy);
    assert.equal(receiptRoute.activation_eligible, true);
    assert.deepEqual(receiptRoute.navigation?.unresolved_local_links, []);

    const routeRoot = path.join(canvasOutputRoot, route.id);
    assert.deepEqual(
      sorted(await regularFileTree(routeRoot)),
      expectedRouteFiles(route),
      `${route.id} generated file closure`,
    );

    const indexBytes = await readRegularFile(
      path.join(routeRoot, "index.html"),
      `${route.id} generated index`,
    );
    assert.equal(indexBytes.byteLength, receiptRoute.projection_bytes);
    assert.equal(sha256(indexBytes), receiptRoute.projection_sha256);

    for (const field of ["package_files", "navigation_files"]) {
      const expectedEntries = routeFileEntries(route, field);
      const receiptEntries = receiptFileEntries(receiptRoute, field);
      assert.deepEqual(
        receiptEntries.map(({ target_file }) => target_file),
        expectedEntries.map(({ target_file }) => target_file),
        `${route.id} ${field} receipt order`,
      );
      for (const fileReceipt of receiptEntries) {
        const bytes = await readRegularFile(
          path.join(routeRoot, fileReceipt.target_file),
          `${route.id} ${fileReceipt.target_file}`,
        );
        assert.equal(bytes.byteLength, fileReceipt.bytes);
        assert.equal(sha256(bytes), fileReceipt.sha256);
      }
    }
  }
}

function routeUrl(origin, route) {
  return new URL(route.public_alias, `${origin}/`).href;
}

function expectedRequestPaths(origin, route) {
  const entryUrl = routeUrl(origin, route);
  return new Set([
    new URL(entryUrl).pathname,
    ...routeFileEntries(route, "package_files").map(
      ({ target_file }) => new URL(`./${target_file}`, entryUrl).pathname,
    ),
    ...routeFileEntries(route, "navigation_files").map(
      ({ target_file }) => new URL(`./${target_file}`, entryUrl).pathname,
    ),
  ]);
}

async function openRoute(browser, origin, route) {
  const context = await browser.newContext({
    acceptDownloads: true,
    reducedMotion: "reduce",
    viewport: { width: viewports[0].width, height: viewports[0].height },
  });
  await context.addInitScript(() => {
    globalThis.__canvasClipboardWrites = [];
    globalThis.__canvasPrintCalls = 0;
    Object.defineProperty(Navigator.prototype, "clipboard", {
      configurable: true,
      get: () => ({
        writeText: async (value) => {
          globalThis.__canvasClipboardWrites.push(String(value));
        },
      }),
    });
    Object.defineProperty(globalThis, "print", {
      configurable: true,
      value: () => {
        globalThis.__canvasPrintCalls += 1;
      },
    });
  });

  const expectedPaths = expectedRequestPaths(origin, route);
  const localRequests = [];
  const localResponses = [];
  const unexpectedRequests = [];
  const permittedExternalUrls = new Set();
  const observedExternalUrls = new Set();

  context.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (["about:", "blob:", "data:"].includes(requestUrl.protocol)) return;
    if (requestUrl.origin === origin) {
      localRequests.push({
        method: request.method(),
        pathname: requestUrl.pathname,
        resourceType: request.resourceType(),
      });
      if (request.method() !== "GET" || !expectedPaths.has(requestUrl.pathname)) {
        unexpectedRequests.push(`${request.method()} ${requestUrl.href}`);
      }
      return;
    }
    observedExternalUrls.add(requestUrl.href);
    if (!permittedExternalUrls.has(requestUrl.href)) {
      unexpectedRequests.push(`${request.method()} ${requestUrl.href}`);
    }
  });
  context.on("response", (response) => {
    const responseUrl = new URL(response.url());
    if (responseUrl.origin !== origin) return;
    localResponses.push({
      contentType: response.headers()["content-type"] ?? "",
      pathname: responseUrl.pathname,
      status: response.status(),
    });
  });
  await context.route("**/*", async (routeHandle) => {
    const requestUrl = new URL(routeHandle.request().url());
    if (
      ["http:", "https:"].includes(requestUrl.protocol) &&
      requestUrl.origin !== origin
    ) {
      await routeHandle.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: "<!doctype html><title>Controlled external navigation</title><p>Navigation observed.</p>",
      });
      return;
    }
    await routeHandle.continue();
  });

  const carrierPage = await context.newPage();
  carrierPage.setDefaultTimeout(7000);
  const telemetry = monitor(carrierPage);
  const sandbox = route.carrier_policy.sandbox_tokens.join(" ");
  const permissions = route.carrier_policy.permissions_policy.join("; ");
  await carrierPage.setContent(
    `<!doctype html><meta charset="utf-8"><title>Canvas route carrier</title>` +
      `<style>html,body{margin:0;min-width:0}iframe{display:block;width:100%;height:900px;border:0}</style>` +
      `<iframe title="${htmlAttribute(route.display_name)}" ` +
      `sandbox="${htmlAttribute(sandbox)}"${
        permissions ? ` allow="${htmlAttribute(permissions)}"` : ""
      } referrerpolicy="no-referrer" src="${htmlAttribute(routeUrl(origin, route))}"></iframe>`,
    { waitUntil: "domcontentloaded" },
  );
  const carrier = carrierPage.locator("iframe");
  assert.equal(await carrier.count(), 1, `${route.id} has one generated test carrier`);
  const carrierHandle = await carrier.elementHandle();
  assert.ok(carrierHandle, `${route.id} exposes its generated carrier element`);
  const page = await carrierHandle.contentFrame();
  assert.ok(page, `${route.id} exposes its framed route document`);
  await page.locator("body").waitFor();
  assert.equal(await carrier.getAttribute("sandbox"), sandbox, `${route.id} exact sandbox`);
  assert.equal(
    await carrier.getAttribute("allow") ?? "",
    permissions,
    `${route.id} exact Permissions Policy allowlist`,
  );
  assert.equal(
    await carrier.getAttribute("referrerpolicy"),
    "no-referrer",
    `${route.id} carrier suppresses referrers`,
  );
  const expectedRouteUrl = new URL(routeUrl(origin, route));
  const loadedRouteUrl = new URL(page.url());
  assert.equal(
    loadedRouteUrl.origin,
    expectedRouteUrl.origin,
    `${route.id} loads from the generated route origin`,
  );
  assert.equal(
    loadedRouteUrl.pathname,
    expectedRouteUrl.pathname,
    `${route.id} loads the generated route pathname`,
  );
  assert.equal(
    await page.locator("html").evaluate(() => globalThis.origin),
    "null",
    `${route.id} keeps an opaque sandbox origin`,
  );
  assert.equal(
    await page.locator("iframe").count(),
    0,
    `${route.id} does not introduce a nested frame`,
  );
  await carrierPage.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

  return {
    carrier,
    carrierPage,
    context,
    expectedPaths,
    localRequests,
    localResponses,
    observedExternalUrls,
    page,
    permittedExternalUrls,
    route,
    telemetry,
    unexpectedRequests,
  };
}

async function assertAttribution(page, route) {
  const observed = await page.evaluate(() => {
    const normalize = (value) => (value ?? "").replace(/\s+/g, " ").trim();
    const boundaries = [...document.querySelectorAll("[data-visitor-boundary]")];
    const footers = [...document.querySelectorAll("footer.artifact-attribution")];
    const notices = [...document.querySelectorAll(".artifact-attribution__notice")];
    const boundary = boundaries[0] ?? null;
    const footer = footers[0] ?? null;
    const notice = notices[0] ?? null;
    const markers = boundary
      ? [...boundary.querySelectorAll("[data-visitor-boundary-marker]")]
      : [];
    const style = footer ? getComputedStyle(footer) : null;
    return {
      authorValues: [...document.querySelectorAll('meta[name="author"]')]
        .map((element) => element.content),
      boundaryBeforeNotice: Boolean(
        boundary &&
          notice &&
          (boundary.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING),
      ),
      boundaryCount: boundaries.length,
      footerCount: footers.length,
      footerLastElementIsNotice: footer?.lastElementChild === notice,
      footerPosition: style?.position ?? "",
      footerVisible: Boolean(
        footer &&
          style?.display !== "none" &&
          style?.visibility !== "hidden" &&
          footer.getBoundingClientRect().height > 0,
      ),
      licenseTargets: [...document.querySelectorAll('link[rel="license"]')]
        .map((element) => element.href),
      markerBreakCounts: markers.map((element) => element.querySelectorAll("br").length),
      markerIds: markers.map((element) => element.dataset.visitorBoundaryMarker),
      markerTexts: markers.map((element) => normalize(element.textContent)),
      noticeCount: notices.length,
      noticeText: normalize(notice?.textContent),
    };
  });

  assert.deepEqual(observed.authorValues, [artifactAuthor], `${route.id} author metadata`);
  assert.deepEqual(observed.licenseTargets, [artifactLicense], `${route.id} license relation`);
  assert.equal(observed.boundaryCount, 1, `${route.id} visitor-boundary count`);
  assert.equal(observed.footerCount, 1, `${route.id} attribution-footer count`);
  assert.equal(observed.noticeCount, 1, `${route.id} attribution-notice count`);
  assert.equal(observed.noticeText, artifactAttribution, `${route.id} attribution text`);
  assert.deepEqual(
    observed.markerIds,
    visitorBoundaryContract.markers.map(({ id }) => id),
    `${route.id} ordered visitor-boundary markers`,
  );
  assert.deepEqual(
    observed.markerTexts,
    visitorBoundaryContract.markers.map(({ lines }) => lines.join(" ")),
    `${route.id} exact visitor-boundary marker text`,
  );
  assert.deepEqual(observed.markerBreakCounts, [1, 1], `${route.id} marker line breaks`);
  assert.equal(observed.boundaryBeforeNotice, true, `${route.id} boundary precedes attribution`);
  assert.equal(
    observed.footerLastElementIsNotice,
    true,
    `${route.id} attribution is the final footer element`,
  );
  assert.equal(observed.footerPosition, "static", `${route.id} attribution stays in flow`);
  assert.equal(observed.footerVisible, true, `${route.id} attribution is visible`);
}

async function assertContained(session, stateLabel) {
  const { carrier, carrierPage, page, route } = session;
  for (const viewport of viewports) {
    await carrierPage.setViewportSize({ width: viewport.width, height: viewport.height });
    await carrierPage.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
    const carrierObserved = await carrierPage.evaluate(() => {
      const root = document.documentElement;
      const iframe = document.querySelector("iframe");
      return {
        clientWidth: root.clientWidth,
        iframeWidth: iframe?.getBoundingClientRect().width ?? 0,
        scrollWidth: root.scrollWidth,
      };
    });
    const observed = await page.evaluate(() => {
      const root = document.documentElement;
      const footer = document.querySelector("footer.artifact-attribution");
      return {
        clientWidth: root.clientWidth,
        footerClientWidth: footer?.clientWidth ?? 0,
        footerScrollWidth: footer?.scrollWidth ?? 0,
        scrollWidth: root.scrollWidth,
      };
    });
    assert.ok(
      carrierObserved.scrollWidth <= carrierObserved.clientWidth + 2,
      `${route.id} ${stateLabel} keeps its ${viewport.id} carrier contained ` +
        `(${carrierObserved.scrollWidth}/${carrierObserved.clientWidth})`,
    );
    assert.ok(
      carrierObserved.iframeWidth <= carrierObserved.clientWidth + 2,
      `${route.id} ${stateLabel} keeps its ${viewport.id} iframe contained ` +
        `(${carrierObserved.iframeWidth}/${carrierObserved.clientWidth})`,
    );
    assert.ok(
      observed.scrollWidth <= observed.clientWidth + 2,
      `${route.id} ${stateLabel} has no ${viewport.id} viewport leak ` +
        `(${observed.scrollWidth}/${observed.clientWidth})`,
    );
    assert.ok(
      observed.footerScrollWidth <= observed.footerClientWidth + 2,
      `${route.id} ${stateLabel} attribution contains its ${viewport.id} width ` +
        `(${observed.footerScrollWidth}/${observed.footerClientWidth})`,
    );
  }
  await carrierPage.setViewportSize({
    width: viewports[0].width,
    height: viewports[0].height,
  });
}

function jsonText(page, selector) {
  return page.locator(selector).textContent().then((value) => {
    assert.ok(value?.trim(), `${selector} exposes JSON`);
    return JSON.parse(value);
  });
}

async function exerciseRegistry({ page }) {
  await page.locator('[data-filter-name="activeView"][data-filter-value="routes"]').click();
  const state = await jsonText(page, "#stateContract");
  assert.equal(state.activeView, "routes");
  assert.equal(await page.locator("#routeSection").isVisible(), true);
  assert.equal(await page.locator("#pathSection").isVisible(), false);
}

async function exerciseCollaborationCycle({ page }) {
  await page.locator('[data-step="3"]').click();
  await page.locator("#population").selectOption("owner");
  assert.equal(await page.locator('[data-step="3"]').getAttribute("aria-pressed"), "true");
  assert.equal((await page.locator("#active-step-title").textContent())?.trim(), "Resolve");
  assert.match(await page.locator("#active-population").textContent(), /decision owner/i);
}

async function exerciseLims({ page }) {
  const observed = await page.evaluate(() => ({
    executableScripts: [...document.scripts].filter((script) =>
      !["application/json", "application/ld+json"].includes(script.type),
    ).length,
    headings: [...document.querySelectorAll("h1, h2")]
      .map((heading) => heading.textContent.trim())
      .filter(Boolean),
    tables: document.querySelectorAll("table").length,
  }));
  assert.equal(observed.executableScripts, 0, "LIMS remains a static route");
  assert.ok(observed.headings.length >= 3, "LIMS exposes its static reading hierarchy");
  assert.ok(observed.tables >= 1, "LIMS exposes a static semantic table");
}

async function exerciseGenomic({ carrierPage, page }) {
  const carrier = carrierPage.locator("iframe");
  const deck = page.locator(".control-deck");
  const wayfinding = page.locator(".actor-board__wayfinding");
  const board = page.locator(".actor-board");
  assert.equal(await wayfinding.isVisible(), false, "desktop board keeps the narrow cue quiet");
  assert.equal(await wayfinding.getAttribute("id"), "actor-board-wayfinding");
  assert.equal(await board.getAttribute("role"), "region");
  assert.equal(await board.getAttribute("aria-label"), "Population groups");
  assert.equal(await board.getAttribute("aria-describedby"), "actor-board-wayfinding");
  assert.equal(await board.getAttribute("tabindex"), "0");

  await carrierPage.setViewportSize({ width: viewports[1].width, height: viewports[1].height });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  assert.equal(await wayfinding.isVisible(), true, "narrow board exposes horizontal wayfinding");
  assert.match(await wayfinding.textContent(), /scroll sideways to compare groups/i);
  const boardWidth = await board.evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  assert.ok(boardWidth.scroll > boardWidth.client, "narrow board has groups available sideways");
  await board.focus();
  assert.equal(
    await board.evaluate((element) => document.activeElement === element),
    true,
    "horizontal group region accepts keyboard focus",
  );

  await carrierPage.setViewportSize({ width: 844, height: 390 });
  await carrier.evaluate((element) => {
    element.style.height = "390px";
  });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  assert.equal(await wayfinding.isVisible(), true, "landscape board exposes horizontal wayfinding");
  assert.equal(
    await deck.evaluate((element) => getComputedStyle(element).position),
    "static",
    "landscape controls remain in document flow",
  );
  await page.locator(".context-card").first().scrollIntoViewIfNeeded();
  const landscapeGeometry = await page.evaluate(() => {
    const deckRect = document.querySelector(".control-deck").getBoundingClientRect();
    const cardRect = document.querySelector(".context-card").getBoundingClientRect();
    return {
      cardTop: cardRect.top,
      visibleDeckBottom: Math.max(0, deckRect.bottom),
    };
  });
  assert.ok(
    landscapeGeometry.cardTop >= landscapeGeometry.visibleDeckBottom,
    "landscape controls leave the first context card unobscured",
  );

  await carrier.evaluate((element) => {
    element.style.height = "900px";
  });
  await carrierPage.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
  await page.locator('[data-view="shared"]').click();
  assert.equal(await page.locator('[data-view="shared"]').getAttribute("aria-checked"), "true");
  assert.equal(new URL(page.url()).searchParams.get("view"), "shared");
  assert.match(
    await page.locator("#visual-surface").textContent(),
    /Qualification and authorization/i,
  );
}

async function exerciseTalent({ page }) {
  await page.locator("#view-button-evidence").click();
  const state = await jsonText(page, "#state-output");
  assert.equal(state.activeView, "evidence");
  assert.equal(await page.locator("#view-evidence a[target='_blank']").count(), 4);
}

async function exerciseInvestmentStudio({ carrierPage, page }) {
  const before = (await page.locator("#band").textContent())?.trim();
  await page.locator("#horizon").fill("7");
  await page.locator("#horizon").dispatchEvent("change");
  const after = (await page.locator("#band").textContent())?.trim();
  assert.notEqual(after, before, "investment band responds to the planning horizon");

  const [popup] = await Promise.all([
    carrierPage.waitForEvent("popup"),
    page.locator("#open-leavebehind").click(),
  ]);
  try {
    await popup.waitForLoadState("domcontentloaded");
    assert.match(await popup.locator("h1").textContent(), /.+/);
    assert.equal(
      await popup.locator('a[download="initiative-investment-leave-behind.html"]').count(),
      1,
      "leave-behind popup retains its explicit download",
    );
  } finally {
    await popup.close();
  }
}

async function observeExternalPopup(session, locator) {
  const href = await locator.evaluate((anchor) => anchor.href);
  session.permittedExternalUrls.add(href);
  try {
    const [popup] = await Promise.all([
      session.carrierPage.waitForEvent("popup"),
      locator.click(),
    ]);
    try {
      await popup.waitForLoadState("domcontentloaded");
      assert.equal(popup.url(), href);
      assert.match(await popup.locator("body").textContent(), /Navigation observed/);
    } finally {
      await popup.close();
    }
    assert.equal(
      session.observedExternalUrls.has(href),
      true,
      `controlled popup navigation observed for ${href}`,
    );
  } finally {
    session.permittedExternalUrls.delete(href);
  }
}

async function exercisePromptConditions(session) {
  const { page } = session;
  await page.locator('[data-condition="desired"]').click();
  const state = await jsonText(page, "#state-view");
  assert.equal(state.activeCondition, "desired");
  assert.equal(new URL(page.url()).hash, "#desired");
  await observeExternalPopup(session, page.locator("#primary-route"));
}

async function exerciseHeatmap({ page }) {
  const images = page.locator(".view img");
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".view img")]
      .every((image) => image.complete && image.naturalWidth > 0),
  );
  assert.equal(await images.count(), 2);
  await page.locator('button[data-mode="before"]').click();
  assert.equal(await page.locator("#comparison").getAttribute("data-mode"), "before");
  assert.equal(await page.locator('[data-view="before"]').isVisible(), true);
  assert.equal(await page.locator('[data-view="after"]').isVisible(), false);
}

async function observeLocalPopup(session, locator, expectedPathname) {
  const [popup] = await Promise.all([
    session.carrierPage.waitForEvent("popup"),
    locator.click(),
  ]);
  try {
    await popup.waitForLoadState("domcontentloaded");
    assert.equal(new URL(popup.url()).pathname, expectedPathname);
  } finally {
    await popup.close();
  }
}

async function exerciseAiGallery(session) {
  const { page } = session;
  const tabs = page.locator('[role="tab"]');
  const tabCount = await tabs.count();
  assert.equal(tabCount, 6);
  for (let index = 0; index < tabCount; index += 1) {
    const tab = tabs.nth(index);
    await tab.click();
    const panelId = await tab.getAttribute("aria-controls");
    assert.ok(panelId);
    const panel = page.locator(`#${panelId}`);
    assert.equal(await panel.isVisible(), true);
    await panel.scrollIntoViewIfNeeded();
    await page.waitForFunction((id) =>
      [...document.querySelectorAll(`#${CSS.escape(id)} img`)]
        .every((image) => image.complete && image.naturalWidth > 0), panelId);
  }
  await page.locator('[data-prompt="evaluation"]').click();
  const state = await jsonText(page, "#gallery-state");
  assert.equal(state.activeMethod, "ai-legible-handoff");
  assert.equal(state.activePrompt, "evaluation");

  await observeLocalPopup(
    session,
    page.locator('a[href$="sources/ai_legible_viewlet_atlas.svg"]'),
    "/v1/canvas/ai-method-gallery/sources/ai_legible_viewlet_atlas.svg",
  );
  await observeLocalPopup(
    session,
    page.locator('a[href$="sources/viewlet_manifest.json"]'),
    "/v1/canvas/ai-method-gallery/sources/viewlet_manifest.json",
  );
}

async function exerciseInvestmentModelStudio({ page }) {
  const tabs = page.locator('#modelTabs [role="tab"]');
  assert.equal(await tabs.count(), 8);
  const last = tabs.last();
  const selectedId = await last.getAttribute("data-model-id");
  await last.click();
  const state = await jsonText(page, "#stateContract");
  assert.equal(state.activeModelId, selectedId);
  assert.equal(await last.getAttribute("aria-selected"), "true");
}

async function exerciseThreadkeeping({ carrierPage, page }) {
  await page.locator("#copyJsonBtn").click();
  await page.waitForFunction(() => globalThis.__canvasClipboardWrites.length > 0);
  const copied = await page.evaluate(() => globalThis.__canvasClipboardWrites.at(-1));
  assert.ok(JSON.parse(copied).threadkeeper, "Threadkeeping copy exposes the ledger document");

  const [download] = await Promise.all([
    carrierPage.waitForEvent("download"),
    page.locator("#downloadJsonBtn").click(),
  ]);
  assert.equal(download.suggestedFilename(), "threadkeeping-ledger.json");
  assert.equal(await download.failure(), null);
  const downloadPath = await download.path();
  assert.ok(downloadPath, "Threadkeeping download has a browser-owned temporary path");
  assert.ok(
    JSON.parse(await readFile(downloadPath, "utf8")).threadkeeper,
    "Threadkeeping download contains the ledger document",
  );

  await page.locator("#ledgerBody [data-select-entry]").first().click();
  let modalObserved = false;
  carrierPage.once("dialog", async (dialog) => {
    modalObserved = true;
    assert.equal(dialog.type(), "confirm");
    await dialog.dismiss();
  });
  await page.locator("#deleteEntryBtn").click();
  assert.equal(modalObserved, true, "Threadkeeping exposes its deliberate-delete modal");
}

async function exerciseOpenLesson({ page }) {
  await page.locator('[data-route="Plot and annotate"]').click();
  assert.equal(
    await page.locator('[data-route="Plot and annotate"]').getAttribute("aria-pressed"),
    "true",
  );
  await page.locator("#assemble").click();
  assert.equal(await page.locator("#print").isEnabled(), true);
  await page.locator("#print").click();
  assert.equal(await page.evaluate(() => globalThis.__canvasPrintCalls), 1);
}

function replaceExactStrings(value, replacements) {
  if (typeof value === "string") return replacements.get(value) ?? value;
  if (Array.isArray(value)) {
    return value.map((item) => replaceExactStrings(item, replacements));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceExactStrings(item, replacements),
      ]),
    );
  }
  return value;
}

async function importAtlasFixture(page, name, value) {
  await page.locator("#importStatus").evaluate((element) => {
    element.textContent = "";
  });
  await page.locator("#jsonFileInput").setInputFiles({
    name,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(value)),
  });
  await page.locator("#importStatus").filter({ hasText: "accepted" }).waitFor();
}

async function exerciseAtlas({ page }) {
  assert.match(
    await page.locator("noscript").textContent(),
    /complete static selector/i,
    "Atlas retains a no-script route to the static reading",
  );
  const initialExemplarId = await page
    .locator("#exemplarDetail")
    .getAttribute("data-selected-exemplar-id");
  const formChoices = page.locator("[data-select-form]");
  assert.ok(await formChoices.count() >= 5, "Atlas exposes recommendation forms as controls");
  for (const control of await formChoices.all()) {
    assert.equal(await control.evaluate((element) => element.tagName), "BUTTON");
    assert.equal(await control.getAttribute("type"), "button");
    assert.equal(await control.getAttribute("aria-controls"), "selectedFormDetail");
  }

  const lollipop = page.locator('[data-form-id="form-lollipop"]');
  await lollipop.press("Space");
  assert.equal(await lollipop.getAttribute("aria-pressed"), "true");
  assert.match(await page.locator("#selectedFormDetail").textContent(), /lollipop chart/i);
  assert.match(await page.locator("#selectedFormDetail").textContent(), /aligned scale/i);
  assert.match(await page.locator("#selectedFormDetail").textContent(), /stands on its own/i);
  assert.equal(
    await page.locator("#exemplarDetail").getAttribute("data-selected-exemplar-id"),
    initialExemplarId,
    "form selection leaves exemplar selection independent",
  );
  assert.match(await page.locator("#selectionStatus").textContent(), /lollipop chart selected/i);
  assert.notEqual(
    await lollipop.evaluate((element) => getComputedStyle(element).outlineStyle),
    "none",
    "keyboard selection retains visible focus",
  );

  const secondExemplar = page
    .locator("[data-select-exemplar]")
    .filter({ hasText: "Open exemplar" })
    .first();
  const secondExemplarId = await secondExemplar.getAttribute("data-select-exemplar");
  await secondExemplar.click();
  assert.equal(
    await page.locator("#exemplarDetail").getAttribute("data-selected-exemplar-id"),
    secondExemplarId,
  );
  assert.equal(
    await page.locator('[data-form-id="form-lollipop"]').getAttribute("aria-pressed"),
    "true",
    "exemplar selection preserves the independently selected visual form",
  );
  assert.equal(
    await page
      .locator(`[data-select-exemplar="${secondExemplarId}"]`)
      .last()
      .getAttribute("aria-pressed"),
    "true",
  );

  const before = await page.locator("#aiPrompt").inputValue();
  await page.locator("#moveSelect").selectOption({ index: 1 });
  const after = await page.locator("#aiPrompt").inputValue();
  assert.notEqual(after, before, "Atlas selector changes its AI-readable prompt");
  await page.locator("#copyPromptBtn").click();
  await page.waitForFunction(() => globalThis.__canvasClipboardWrites.length > 0);
  assert.equal(
    await page.evaluate(() => globalThis.__canvasClipboardWrites.at(-1)),
    after,
    "Atlas copies its current prompt",
  );
  assert.match(await page.locator("#actionStatus").textContent(), /clipboard/i);
  assert.equal(await page.locator("#copyOutput").inputValue(), after);

  await page.locator("#audienceSelect").selectOption("executive");
  await page.locator('[data-form-id="form-lollipop"]').press("Enter");
  await page.locator("#resetViewBtn").click();
  assert.equal(await page.locator("#audienceSelect").inputValue(), "mixed");
  assert.equal(
    await page.locator('[data-form-id="form-sorted-bar"]').getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(await page.locator("#uncertaintyToggle").isChecked(), false);
  assert.equal(await page.locator("#aiToggle").isChecked(), true);
  assert.match(await page.locator("#selectionStatus").textContent(), /complete default view/i);

  await page.locator("#exportJsonBtn").click();
  const exportedText = await page.evaluate(() => globalThis.__canvasClipboardWrites.at(-1));
  const exported = JSON.parse(exportedText);
  assert.equal(exported.view_state.audience, "mixed");
  assert.equal(exported.view_state.selectedVisualFormId, "form-sorted-bar");
  assert.equal(await page.locator("#copyOutput").inputValue(), exportedText);
  const jsonLd = JSON.parse(await page.locator("#jsonld-data").textContent());
  const jsonLdView = jsonLd["@graph"].find((node) => node["@type"] === "viz:ViewState");
  assert.equal(jsonLdView["viz:selectedVisualForm"]["@id"], "viz:form-sorted-bar");
  assert.equal(
    jsonLdView["viz:selectedExemplar"]["@id"],
    `viz:${exported.view_state.selectedExemplarId}`,
  );
  assert.equal(jsonLdView["viz:audienceContext"], "mixed");

  const hostileMoveId = 'move-compare" data-atlas-injected="true';
  const hostileMoveLabel =
    '<img src="x" onerror="globalThis.__atlasHostileExecutions += 1">';
  const hostileColumn =
    '</text><image href="x" onerror="globalThis.__atlasHostileExecutions += 1"></image><text>';
  const hostileAtlas = replaceExactStrings(
    structuredClone(exported),
    new Map([["move-compare", hostileMoveId]]),
  );
  hostileAtlas.cognitive_moves.find((item) => item.id === hostileMoveId).label =
    hostileMoveLabel;
  hostileAtlas.exemplars.find(
    (item) => item.id === "ex-outcome-composition",
  ).dataset.columns[1] = hostileColumn;
  hostileAtlas.view_state = {
    ...hostileAtlas.view_state,
    selectedMoveId: "move-composition-groups",
    selectedShapeId: "shape-composition-groups",
    selectedVisualFormId: "form-stacked100",
    selectedExemplarId: "ex-outcome-composition",
  };
  await page.evaluate(() => {
    globalThis.__atlasHostileExecutions = 0;
  });
  await importAtlasFixture(page, "atlas-hostile.json", hostileAtlas);
  await page.waitForTimeout(100);
  const hostileOption = await page.locator("#moveSelect option").evaluateAll(
    (options, label) => {
      const option = options.find((candidate) => candidate.textContent === label);
      return option
        ? {
            injectedAttribute: option.hasAttribute("data-atlas-injected"),
            value: option.value,
          }
        : null;
    },
    hostileMoveLabel,
  );
  assert.deepEqual(hostileOption, {
    injectedAttribute: false,
    value: hostileMoveId,
  });
  assert.equal(
    await page.evaluate(() => globalThis.__atlasHostileExecutions),
    0,
  );
  assert.equal(await page.locator("#exemplarDetail [onerror]").count(), 0);
  assert.match(await page.locator("#exemplarDetail svg").textContent(), /<\/text><image/);

  await importAtlasFixture(page, "atlas-baseline.json", exported);

  const scorelessAtlas = structuredClone(exported);
  for (const recommendation of scorelessAtlas.recommendations) {
    delete recommendation.fidelity_score;
    delete recommendation.accessibility_score;
    delete recommendation.ai_readiness_score;
  }
  await importAtlasFixture(page, "atlas-scoreless.json", scorelessAtlas);
  assert.deepEqual(
    await page.locator("#scoreGrid strong").allTextContents(),
    ["Not scored", "Not scored", "Not scored"],
    "schema-optional recommendation scores retain a legible runtime state",
  );

  await importAtlasFixture(page, "atlas-baseline.json", exported);
  const reservedToggle = page.locator("#reservedToggle");
  assert.equal(await reservedToggle.isChecked(), true);
  const promptWithReserved = await page.locator("#aiPrompt").inputValue();
  await reservedToggle.uncheck();
  const promptWithReservedOutOfView = await page.locator("#aiPrompt").inputValue();
  assert.notEqual(promptWithReservedOutOfView, promptWithReserved);
  assert.match(
    promptWithReservedOutOfView,
    /Reserved recommendations: available through the selector; current view focuses on Recommended and Conditional forms/,
  );
  assert.equal(await page.locator(".rec-card.reserved").count(), 0);
  await page.locator("#exportJsonBtn").click();
  assert.equal(
    JSON.parse(await page.locator("#copyOutput").inputValue()).view_state.showReserved,
    false,
  );
  const reservedJsonLd = JSON.parse(
    await page.locator("#jsonld-data").textContent(),
  );
  assert.equal(
    reservedJsonLd["@graph"].find((node) => node["@type"] === "viz:ViewState")[
      "viz:showReserved"
    ],
    false,
  );
  await reservedToggle.check();
  assert.equal(await page.locator(".rec-card.reserved").count(), 1);

  const renamedIds = new Map([
    ["move-compare", "move-imported"],
    ["shape-category-quantity", "shape-imported"],
    ["form-sorted-bar", "form-imported"],
    ["ex-metadata-corrections-bar", "ex-imported"],
  ]);
  const renamedAtlas = replaceExactStrings(structuredClone(exported), renamedIds);
  renamedAtlas.artifact_identity.display_name = "Imported Atlas fixture";
  renamedAtlas.cognitive_moves[0].label = "Imported comparison move";
  renamedAtlas.data_shapes[0].label = "Imported category and quantity";
  renamedAtlas.visual_forms[0].label = "Imported aligned bar";
  renamedAtlas.exemplars[0].title = "Imported comparison exemplar";
  renamedAtlas.view_state = {
    ...renamedAtlas.view_state,
    audience: "executive",
    showReserved: false,
  };
  await importAtlasFixture(page, "atlas-renamed.json", renamedAtlas);
  assert.equal(await page.locator("#moveSelect").inputValue(), "move-imported");
  assert.equal(await page.locator("#shapeSelect").inputValue(), "shape-imported");
  assert.equal(
    await page.locator('[data-form-id="form-imported"]').getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await page.locator("#exemplarDetail").getAttribute("data-selected-exemplar-id"),
    "ex-imported",
  );
  assert.equal(await page.locator(".rec-card.reserved").count(), 0);
  let importedJsonLd = JSON.parse(
    await page.locator("#jsonld-data").textContent(),
  );
  assert.equal(
    importedJsonLd["@graph"].find((node) => node["@id"] === "viz:viz-atlas-001")[
      "schema:name"
    ],
    "Imported Atlas fixture",
  );
  assert.equal(
    importedJsonLd["@graph"].find((node) => node["@id"] === "viz:form-imported")[
      "schema:name"
    ],
    "Imported aligned bar",
  );
  assert.equal(
    importedJsonLd["@graph"].some((node) => node["@id"] === "viz:form-sorted-bar"),
    false,
  );

  await page.locator("#moveSelect").selectOption({ index: 1 });
  await page.locator("#audienceSelect").selectOption("research");
  await page.locator("#reservedToggle").check();
  await page.locator("#resetViewBtn").click();
  assert.equal(await page.locator("#moveSelect").inputValue(), "move-imported");
  assert.equal(await page.locator("#shapeSelect").inputValue(), "shape-imported");
  assert.equal(await page.locator("#audienceSelect").inputValue(), "mixed");
  assert.equal(await page.locator("#reservedToggle").isChecked(), true);
  assert.equal(
    await page.locator('[data-form-id="form-imported"]').getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await page.locator("#exemplarDetail").getAttribute("data-selected-exemplar-id"),
    "ex-imported",
  );
  importedJsonLd = JSON.parse(
    await page.locator("#jsonld-data").textContent(),
  );
  assert.equal(
    importedJsonLd["@graph"].find((node) => node["@type"] === "viz:ViewState")[
      "viz:selectedVisualForm"
    ]["@id"],
    "viz:form-imported",
  );

  await importAtlasFixture(page, "atlas-baseline.json", exported);

  await page.locator("#audienceSelect").selectOption("research");
  await page.locator('[data-form-id="form-lollipop"]').click();
  await page.locator("#jsonFileInput").setInputFiles({
    name: "atlas-export.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportedText),
  });
  await page.locator("#importStatus").filter({ hasText: "accepted" }).waitFor();
  assert.equal(await page.locator("#audienceSelect").inputValue(), "mixed");
  assert.equal(
    await page.locator('[data-form-id="form-sorted-bar"]').getAttribute("aria-pressed"),
    "true",
  );

  await page
    .locator("#jsonImport")
    .fill(JSON.stringify({ selectedVisualFormId: "form-lollipop" }));
  await page.locator("#importJsonBtn").click();
  assert.match(await page.locator("#importStatus").textContent(), /accepted/i);
  assert.equal(
    await page.locator('[data-form-id="form-lollipop"]').getAttribute("aria-pressed"),
    "true",
  );

  await page.locator("#jsonImport").fill("{");
  await page.locator("#importJsonBtn").click();
  assert.match(await page.locator("#importStatus").textContent(), /needs revision/i);
  assert.equal(
    await page.locator('[data-form-id="form-lollipop"]').getAttribute("aria-pressed"),
    "true",
  );

  const structurallyInvalid = JSON.stringify({ ...exported, data_shapes: [] });
  await page.locator("#jsonFileInput").setInputFiles({
    name: "atlas-invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(structurallyInvalid),
  });
  await page.locator("#importStatus").filter({ hasText: "needs revision" }).waitFor();
  assert.equal(
    await page.locator('[data-form-id="form-lollipop"]').getAttribute("aria-pressed"),
    "true",
  );

  await page.locator("#jsonFileInput").setInputFiles({
    name: "atlas-too-large.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(1024 * 1024 + 1, 32),
  });
  await page.locator("#importStatus").filter({ hasText: "no larger than" }).waitFor();
  assert.equal(
    await page.locator('[data-form-id="form-lollipop"]').getAttribute("aria-pressed"),
    "true",
  );

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException("Permission denied", "NotAllowedError");
        },
      },
    });
  });
  await page.locator("#exportJsonLdBtn").click();
  assert.match(await page.locator("#actionStatus").textContent(), /copy field/i);
  const fallback = await page.locator("#copyOutput").evaluate((element) => ({
    end: element.selectionEnd,
    length: element.value.length,
    start: element.selectionStart,
  }));
  assert.equal(fallback.start, 0);
  assert.equal(fallback.end, fallback.length);
}

async function exerciseSelector({ page }) {
  const resultCards = page.locator(".cards .card");
  assert.equal(await resultCards.count(), 3);
  assert.equal(
    await resultCards.locator('button, a, [role="button"]').count(),
    0,
    "qualitative result labels remain static reading content",
  );
  assert.match(await page.locator("noscript").textContent(), /complete static mapping/i);
  await page.locator("#move").selectOption("uncertainty");
  await page.locator("#shape").selectOption("ranges");
  assert.equal(
    await page.locator("#route-visual").getAttribute("type"),
    "button",
    "Selector retains a sandbox-safe routing affordance",
  );
  await page.locator("#route-visual").click();
  assert.match(await page.locator("#reason-title").textContent(), /range/i);
  assert.match(await page.locator("#selection-status").textContent(), /updated/i);
}

async function exerciseWhoToBelieve({ page }) {
  await page.locator("#tab-blueprint").click();
  assert.equal(await page.locator("#tab-blueprint").getAttribute("aria-selected"), "true");
  assert.equal(await page.locator("#panel").getAttribute("aria-labelledby"), "tab-blueprint");
  assert.equal(new URL(page.url()).searchParams.get("view"), "blueprint");
}

const behaviorProfiles = new Map([
  ["registry-goal-fidelity", {
    policy: { sandbox_tokens: ["allow-scripts"], permissions_policy: [] },
    exercise: exerciseRegistry,
  }],
  ["cross-platform-collaboration-cycle", {
    policy: { sandbox_tokens: ["allow-scripts"], permissions_policy: [] },
    exercise: exerciseCollaborationCycle,
  }],
  ["lims-eln-program-constellation", {
    policy: { sandbox_tokens: [], permissions_policy: [] },
    exercise: exerciseLims,
  }],
  ["genomic-viewer-context-tree", {
    policy: { sandbox_tokens: ["allow-scripts"], permissions_policy: [] },
    exercise: exerciseGenomic,
  }],
  ["talent-agent-intake", {
    policy: {
      sandbox_tokens: ["allow-popups", "allow-popups-to-escape-sandbox", "allow-scripts"],
      permissions_policy: [],
    },
    exercise: exerciseTalent,
  }],
  ["cross-functional-investment-studio", {
    policy: {
      sandbox_tokens: ["allow-popups", "allow-popups-to-escape-sandbox", "allow-scripts"],
      permissions_policy: [],
    },
    exercise: exerciseInvestmentStudio,
  }],
  ["prompt-conditions-explorer", {
    policy: {
      sandbox_tokens: ["allow-popups", "allow-popups-to-escape-sandbox", "allow-scripts"],
      permissions_policy: [],
    },
    exercise: exercisePromptConditions,
  }],
  ["heatmap-comparison", {
    policy: { sandbox_tokens: ["allow-scripts"], permissions_policy: [] },
    exercise: exerciseHeatmap,
  }],
  ["ai-method-gallery", {
    policy: {
      sandbox_tokens: ["allow-popups", "allow-popups-to-escape-sandbox", "allow-scripts"],
      permissions_policy: [],
    },
    exercise: exerciseAiGallery,
  }],
  ["cross-functional-investment-model-studio", {
    policy: { sandbox_tokens: ["allow-scripts"], permissions_policy: [] },
    exercise: exerciseInvestmentModelStudio,
  }],
  ["threadkeeping-ledger", {
    policy: {
      sandbox_tokens: ["allow-downloads", "allow-modals", "allow-scripts"],
      permissions_policy: ["clipboard-write"],
    },
    exercise: exerciseThreadkeeping,
  }],
  ["open-lesson-field", {
    policy: { sandbox_tokens: ["allow-modals", "allow-scripts"], permissions_policy: [] },
    exercise: exerciseOpenLesson,
  }],
  ["visualization-fidelity-atlas", {
    policy: { sandbox_tokens: ["allow-scripts"], permissions_policy: ["clipboard-write"] },
    exercise: exerciseAtlas,
  }],
  ["visualization-fidelity-selector", {
    policy: { sandbox_tokens: ["allow-scripts"], permissions_policy: [] },
    exercise: exerciseSelector,
  }],
  ["who-to-believe-context-tree", {
    policy: { sandbox_tokens: ["allow-scripts"], permissions_policy: [] },
    exercise: exerciseWhoToBelieve,
  }],
]);

function assertInitialRequestClosure(session) {
  const entryPath = new URL(routeUrl("http://route.invalid", session.route)).pathname;
  const documentRequests = session.localRequests.filter(
    ({ pathname, resourceType }) => pathname === entryPath && resourceType === "document",
  );
  assert.equal(documentRequests.length, 1, `${session.route.id} loads its entry document once`);
  assert.deepEqual(
    session.unexpectedRequests,
    [],
    `${session.route.id} stays inside its declared browser request closure`,
  );
}

function assertRuntimeFilesObserved(session) {
  const requestedPaths = new Set(session.localRequests.map(({ pathname }) => pathname));
  const entryUrl = routeUrl("http://route.invalid", session.route);
  for (const entry of routeFileEntries(session.route, "package_files")) {
    const pathname = new URL(`./${entry.target_file}`, entryUrl).pathname;
    assert.equal(
      requestedPaths.has(pathname),
      true,
      `${session.route.id} requests runtime package file ${entry.target_file}`,
    );
  }
  for (const response of session.localResponses) {
    assert.equal(response.status, 200, `${session.route.id} ${response.pathname} returns 200`);
  }
  for (const field of ["package_files", "navigation_files"]) {
    for (const entry of routeFileEntries(session.route, field)) {
      const pathname = new URL(`./${entry.target_file}`, entryUrl).pathname;
      const responses = session.localResponses.filter((response) => response.pathname === pathname);
      if (field === "package_files" || session.route.id === "ai-method-gallery") {
        assert.ok(responses.length > 0, `${session.route.id} observes ${entry.target_file}`);
        assert.ok(
          responses.some(({ contentType }) => contentType.startsWith(entry.content_type)),
          `${session.route.id} serves ${entry.target_file} as ${entry.content_type}`,
        );
      }
    }
  }
}

async function exerciseRoute(browser, origin, route) {
  const profile = behaviorProfiles.get(route.id);
  assert.ok(profile, `browser behavior profile exists for ${route.id}`);
  assert.deepEqual(route.carrier_policy, profile.policy, `${route.id} exact carrier policy`);
  assert.equal(route.carrier_policy.sandbox_tokens.includes("allow-same-origin"), false);

  const session = await openRoute(browser, origin, route);
  try {
    assertInitialRequestClosure(session);
    await assertAttribution(session.page, route);
    await assertContained(session, "initial state");
    await profile.exercise(session);
    await assertContained(session, "exercised state");
    assertRuntimeFilesObserved(session);
    assert.deepEqual(
      session.unexpectedRequests,
      [],
      `${route.id} interactions stay within declared or explicitly observed navigation`,
    );
    assertTelemetry(session.telemetry);
    return {
      id: route.id,
      localRequests: session.localRequests.length,
      localResponses: session.localResponses.length,
    };
  } finally {
    await session.context.close();
  }
}

export async function runCanvasIframeRouteBrowserContract(options = {}) {
  const manifestReading = await readJson(
    options.routeManifestPath ?? routeManifestPath,
    "Canvas public iframe route manifest",
  );
  const receiptReading = await readJson(
    options.routeReceiptPath ?? routeReceiptPath,
    "generated Canvas iframe route receipt",
  );
  const contract = manifestReading.value;
  const receipt = receiptReading.value;

  assert.equal(contract.id, "context-canvas.public-iframe-routes.v1");
  assert.equal(contract.base_path, "/v1/canvas/");
  assert.equal(contract.routes?.length, 15);
  assert.deepEqual(
    sorted(contract.routes.map(({ id }) => id)),
    sorted(behaviorProfiles.keys()),
    "the browser contract covers every and only Canvas route",
  );
  assert.equal(receipt.route_contract?.sha256, sha256(manifestReading.bytes));
  await assertGeneratedClosure(contract, receipt);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    throw new Error(
      "Canvas iframe route browser contract requires Playwright Chromium; " +
        "install it with `npm run playwright:install`. " +
        `${error instanceof Error ? error.message : error}`,
    );
  }

  const server = await startStaticServer(options.iframeHostRoot ?? iframeHostRoot);
  const routeResults = [];
  const routeFailures = [];
  try {
    for (const route of contract.routes) {
      try {
        routeResults.push(await exerciseRoute(browser, server.origin, route));
      } catch (error) {
        routeFailures.push(new Error(
          `${route.id}: ${error instanceof Error ? error.message : error}`,
          { cause: error },
        ));
      }
    }
  } finally {
    try {
      await browser.close();
    } finally {
      await server.close();
    }
  }

  if (routeFailures.length > 0) {
    throw new AggregateError(
      routeFailures,
      `Canvas iframe route browser contract failed for ${routeFailures.length} route(s).`,
    );
  }

  return {
    generatedFiles: receipt.package_contract.generated_files,
    routeResults,
    routes: contract.routes.length,
    viewports,
  };
}

export async function main(args = process.argv.slice(2)) {
  if (args.length > 0) {
    throw new Error(
      `Usage: node ${path.relative(repositoryRoot, toolPath)}`,
    );
  }
  const result = await runCanvasIframeRouteBrowserContract();
  console.log(
    `Canvas iframe route browser contract passed: ${result.routes} routes, ` +
      `${result.generatedFiles} generated files, ${result.viewports.length} viewports.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === toolPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    if (error instanceof AggregateError) {
      for (const routeError of error.errors) {
        console.error(`- ${routeError.message}`);
      }
    }
    process.exitCode = 1;
  });
}

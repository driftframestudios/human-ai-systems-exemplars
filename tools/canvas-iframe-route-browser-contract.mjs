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
import {
  assertFormControlLabelRetention,
  assertInvestmentStudioRowLabels,
  observeFormControlLabels,
  observeInvestmentStudioRowLabels,
} from "./form-control-label-contract.mjs";

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
  { id: "compact", width: 800, height: 900 },
  { id: "small", width: 480, height: 900 },
  { id: "mobile", width: 390, height: 900 },
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
    browser,
    carrier,
    carrierPage,
    context,
    expectedPaths,
    localRequests,
    localResponses,
    observedExternalUrls,
    origin,
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
  const labelObservations = [];
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
    labelObservations.push(
      await observeFormControlLabels(page.locator("html"), viewport.width),
    );
  }
  assertFormControlLabelRetention(
    labelObservations,
    `${route.id} ${stateLabel}`,
  );
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

async function exerciseTalent(session) {
  const { page } = session;
  await page.locator("#view-button-evidence").click();
  const state = await jsonText(page, "#state-output");
  assert.equal(state.activeView, "evidence");
  const links = page.locator("#view-evidence a[href]");
  assert.equal(await links.count(), 4);
  for (const link of await links.all()) {
    assert.equal(await link.getAttribute("target"), "_blank", "Talent evidence exits use a top-level tab");
    const rel = new Set((await link.getAttribute("rel") ?? "").split(/\s+/u).filter(Boolean));
    assert.equal(rel.has("noopener") && rel.has("noreferrer"), true, "Talent evidence exits sever opener access");
  }
  await observeExternalPopup(session, links.first());
}

async function exerciseInvestmentStudio(session) {
  const { carrierPage, page } = session;
  for (const width of [1280, 701, 700, 390, 320]) {
    await carrierPage.setViewportSize({ width, height: 900 });
    await carrierPage.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
    assertInvestmentStudioRowLabels(
      await observeInvestmentStudioRowLabels(page),
      width,
      "generated Cross-Functional Investment Studio",
    );
  }

  await carrierPage.setViewportSize({ width: 390, height: 900 });
  await page.locator('[data-add="activity"]').click();
  assertInvestmentStudioRowLabels(
    await observeInvestmentStudioRowLabels(page),
    390,
    "generated Cross-Functional Investment Studio after adding an activity",
  );
  await page.locator('[data-preset="1"]').click();
  assertInvestmentStudioRowLabels(
    await observeInvestmentStudioRowLabels(page),
    390,
    "generated Cross-Functional Investment Studio after changing the plan",
  );
  const activityName = page.locator('.activity-row input[data-field="name"]').first();
  await activityName.fill("Accessible planning activity");
  assert.match(
    await page.locator('.activity-row input[data-field="a"]').first().getAttribute("aria-label"),
    /Accessible planning activity/u,
    "generated activity controls retain contextual programmatic labels after renaming",
  );

  await carrierPage.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
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
  await observeExternalPopup(
    session,
    page.locator('a[href="https://www.blueoceanstrategy.com/tools/four-actions-framework/"]'),
  );
}

async function observeExternalPopup(session, locator) {
  const href = await locator.evaluate((anchor) => anchor.href);
  const requestUrl = new URL(href);
  requestUrl.hash = "";
  const requestHref = requestUrl.href;
  const parentUrl = session.carrierPage.url();
  session.permittedExternalUrls.add(href);
  session.permittedExternalUrls.add(requestHref);
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
      session.carrierPage.url(),
      parentUrl,
      "opening an iframe exit preserves the parent page state",
    );
    assert.equal(
      session.observedExternalUrls.has(href) || session.observedExternalUrls.has(requestHref),
      true,
      `controlled popup navigation observed for ${href}`,
    );
  } finally {
    session.permittedExternalUrls.delete(href);
    session.permittedExternalUrls.delete(requestHref);
  }
}

async function assertProjectedExitLinks(session, label) {
  const links = await session.page.locator("a[href]").evaluateAll((anchors) =>
    anchors.map((anchor) => ({
      download: anchor.hasAttribute("download"),
      href: anchor.getAttribute("href")?.trim() ?? "",
      rel: anchor.getAttribute("rel"),
      target: anchor.getAttribute("target"),
    })),
  );
  const exits = links.filter(({ download, href }) => {
    const raw = href.trim();
    return raw.length > 0 &&
      !raw.startsWith("#") &&
      !download &&
      !/^javascript:/iu.test(raw);
  });
  assert.equal(
    exits.every(({ rel, target }) => {
      const relTokens = new Set((rel ?? "").toLowerCase().split(/\s+/u).filter(Boolean));
      return target === "_blank" && relTokens.has("noopener") && relTokens.has("noreferrer");
    }),
    true,
    `${label} projected exits open in secure top-level tabs`,
  );
  assert.equal(
    links.filter(({ href }) => href.startsWith("#")).every(({ target }) => target !== "_blank"),
    true,
    `${label} fragment navigation remains within the framed document`,
  );
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

function promptCapsuleFingerprintFrom(markdown) {
  const match = String(markdown).match(/^- Fingerprint: `([^`]+)`$/mu);
  assert.ok(match, "Prompt Capsule Markdown carries one readable fingerprint");
  return match[1];
}

function assertInvestmentPromptCapsuleSections(markdown, label) {
  const headings = [
    "# Prompt Capsule: Cross-Functional Investment Model Studio",
    "## Purpose and target",
    "## Relevant context and inputs",
    "## Working state",
    "## Boundaries and human-held decisions",
    "## Requested return",
    "## Related loops",
    "## Evidence and recovery",
  ];
  let previous = -1;
  for (const heading of headings) {
    const position = markdown.indexOf(heading);
    assert.ok(position > previous, `${label} carries ${heading} in contract order`);
    previous = position;
  }
}

function assertAtlasPromptCapsuleSections(markdown, label) {
  const headings = [
    "# Prompt Capsule: Visualization Fidelity Atlas",
    "## Purpose and target",
    "## Relevant context and inputs",
    "## Working state",
    "## Boundaries and human-held decisions",
    "## Requested return",
    "## Related loops",
    "## Evidence and recovery",
  ];
  let previous = -1;
  for (const heading of headings) {
    const position = markdown.indexOf(heading);
    assert.ok(position > previous, `${label} carries ${heading} in contract order`);
    previous = position;
  }
}

async function exerciseInvestmentModelStudio(session) {
  const { browser, carrierPage, expectedPaths, origin, page, route } = session;
  const tabs = page.locator('#modelTabs [role="tab"]');
  assert.equal(await tabs.count(), 8);

  const initial = await page.evaluate(() => ({
    apiFrozen: Object.isFrozen(globalThis.crossFunctionalInvestmentModelStudio),
    viewsFrozen: Object.isFrozen(globalThis.crossFunctionalInvestmentModelStudio.promptCapsuleViews),
    version: globalThis.crossFunctionalInvestmentModelStudio.version,
    stateSchemaVersion: globalThis.crossFunctionalInvestmentModelStudio.stateSchemaVersion,
    contract: globalThis.crossFunctionalInvestmentModelStudio.promptCapsuleContract,
    views: globalThis.crossFunctionalInvestmentModelStudio.promptCapsuleViews.slice(),
    view: globalThis.crossFunctionalInvestmentModelStudio.getPromptCapsuleView(),
    state: globalThis.crossFunctionalInvestmentModelStudio.getState(),
    projection: globalThis.crossFunctionalInvestmentModelStudio.promptCapsuleStateProjection(),
    fingerprint: globalThis.crossFunctionalInvestmentModelStudio.promptCapsuleFingerprint(),
    plain: globalThis.crossFunctionalInvestmentModelStudio.promptCapsule(),
    explicitPlain: globalThis.crossFunctionalInvestmentModelStudio.promptCapsuleMarkdown("plain"),
  }));
  const visiblePlain = await page.locator("#promptCapsuleMarkdown").textContent();
  assert.equal(initial.apiFrozen, true);
  assert.equal(initial.viewsFrozen, true);
  assert.equal(initial.version, "0.3.0");
  assert.equal(initial.stateSchemaVersion, "1.0.0");
  assert.equal(initial.contract, "prompt-capsule/0.1.0");
  assert.deepEqual(initial.views, ["plain", "skill-assisted"]);
  assert.equal(initial.view, "plain");
  assert.equal(initial.state.activeModelId, "model/activity-based.v0.1");
  assert.equal(initial.projection.state.activeModelId, initial.state.activeModelId);
  assert.equal(initial.plain, initial.explicitPlain);
  assert.equal(initial.plain, visiblePlain);
  assert.ok(initial.plain.endsWith("\n"));
  assertInvestmentPromptCapsuleSections(initial.plain, "Initial plain Prompt Capsule");
  assert.equal(promptCapsuleFingerprintFrom(initial.plain), initial.fingerprint);
  assert.match(initial.plain, /Keep unavailable economics, rates, volumes, and savings as &lt;reserved&gt;/u);
  assert.doesNotMatch(
    initial.plain.split("## Requested return")[1].split("## Related loops")[0],
    /<reserved>/u,
    "Source-authored instruction text keeps markup-shaped values escaped",
  );
  assert.match(initial.plain, /Keep an unavailable input as `<reserved>`/u);

  const source = await readFile(path.join(repositoryRoot, route.source_file), "utf8");
  const staticMatch = source.match(/<pre\s+id="promptCapsuleMarkdown"[^>]*>([\s\S]*?)<\/pre>/u);
  assert.ok(staticMatch, "Investment Model Studio source carries an authored plain Prompt Capsule baseline");
  const staticPlain = await page.evaluate((encoded) => {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = encoded;
    return textarea.value;
  }, staticMatch[1]);
  assert.equal(staticPlain, initial.plain, "Authored no-JavaScript baseline equals the runtime plain Markdown exactly");

  const noScriptContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 900 },
  });
  try {
    const noScriptLocalRequests = [];
    const noScriptUnexpectedRequests = [];
    noScriptContext.on("request", (request) => {
      const requestUrl = new URL(request.url());
      if (["about:", "blob:", "data:"].includes(requestUrl.protocol)) return;
      if (requestUrl.origin === origin) {
        noScriptLocalRequests.push({
          method: request.method(),
          pathname: requestUrl.pathname,
          resourceType: request.resourceType(),
        });
        if (request.method() !== "GET" || !expectedPaths.has(requestUrl.pathname)) {
          noScriptUnexpectedRequests.push(`${request.method()} ${requestUrl.href}`);
        }
        return;
      }
      noScriptUnexpectedRequests.push(`${request.method()} ${requestUrl.href}`);
    });
    await noScriptContext.route("**/*", async (routeHandle) => {
      const requestUrl = new URL(routeHandle.request().url());
      if (
        ["http:", "https:"].includes(requestUrl.protocol) &&
        requestUrl.origin !== origin
      ) {
        await routeHandle.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: "<!doctype html><title>Contained external request</title>",
        });
        return;
      }
      await routeHandle.continue();
    });
    const noScriptPage = await noScriptContext.newPage();
    const noScriptTelemetry = monitor(noScriptPage);
    await noScriptPage.goto(routeUrl(origin, route), { waitUntil: "domcontentloaded" });
    await noScriptPage.waitForLoadState("networkidle", { timeout: 5000 });
    assert.equal(
      await noScriptPage.locator("#promptCapsuleMarkdown").textContent(),
      initial.plain,
      "JavaScript-disabled reading exposes the exact initial plain Markdown",
    );
    assert.equal(await noScriptPage.locator("#promptCapsuleMarkdown").isVisible(), true);
    assert.equal(await noScriptPage.locator("[data-prompt-actions]").isVisible(), false);
    assert.equal(await noScriptPage.locator("[data-prompt-view-control]").isVisible(), false);
    assert.equal(await noScriptPage.locator("[data-prompt-related-loops]").isVisible(), true);
    const noScriptEntryPath = new URL(routeUrl(origin, route)).pathname;
    assert.equal(
      noScriptLocalRequests.filter(
        ({ pathname, resourceType }) =>
          pathname === noScriptEntryPath && resourceType === "document",
      ).length,
      1,
      "JavaScript-disabled reading loads its entry document once",
    );
    assert.deepEqual(
      noScriptUnexpectedRequests,
      [],
      "JavaScript-disabled reading stays inside its declared request closure",
    );
    assertTelemetry(noScriptTelemetry);
  } finally {
    await noScriptContext.close();
  }

  const detached = await page.evaluate(() => {
    const returnedState = globalThis.crossFunctionalInvestmentModelStudio.getState();
    const returnedProjection = globalThis.crossFunctionalInvestmentModelStudio.promptCapsuleStateProjection();
    returnedState.activeModelId = "changed-outside-api";
    returnedProjection.state.activeModelId = "changed-outside-api";
    return {
      state: globalThis.crossFunctionalInvestmentModelStudio.getState().activeModelId,
      projection: globalThis.crossFunctionalInvestmentModelStudio.promptCapsuleStateProjection().state.activeModelId,
      fingerprint: globalThis.crossFunctionalInvestmentModelStudio.promptCapsuleFingerprint(),
    };
  });
  assert.equal(detached.state, initial.state.activeModelId);
  assert.equal(detached.projection, initial.projection.state.activeModelId);
  assert.equal(detached.fingerprint, initial.fingerprint);

  const loops = page.locator("[data-prompt-related-loops]");
  await loops.locator("summary").focus();
  await carrierPage.keyboard.press("Enter");
  assert.equal(await loops.evaluate((element) => element.open), true);
  const loopRecords = await loops.locator("[data-related-loop-id]").evaluateAll((items) => items.map((item) => {
    const link = item.querySelector("[data-related-loop-link]");
    return {
      id: item.dataset.relatedLoopId,
      href: link?.getAttribute("href"),
      target: link?.getAttribute("target"),
      rel: link?.getAttribute("rel"),
      targetHeight: link?.getBoundingClientRect().height,
      fit: item.querySelector("[data-related-loop-fit]")?.textContent.trim(),
    };
  }));
  assert.deepEqual(loopRecords.map(({ id }) => id), ["repository-reentry", "skill-from-receiving-use"]);
  assert.equal(loopRecords[0].href, "https://schemas.radiantnull.com/collaboration/#repository-reentry");
  assert.equal(loopRecords[1].href, "https://schemas.radiantnull.com/collaboration/#skill-from-receiving-use");
  assert.equal(loopRecords.every(({ target, rel, targetHeight, fit }) =>
    target === "_blank" && rel === "noopener noreferrer" && targetHeight >= 43.5 && Boolean(fit)), true);
  await observeExternalPopup(session, loops.locator("[data-related-loop-link]").first());

  const first = tabs.first();
  await first.click();
  const sameModel = await page.evaluate(() => ({
    reason: globalThis.crossFunctionalInvestmentModelStudio.getState().selectionReason,
    fingerprint: globalThis.crossFunctionalInvestmentModelStudio.promptCapsuleFingerprint(),
  }));
  assert.equal(sameModel.reason, "initial", "Selecting the active model preserves the accepted state reason");
  assert.equal(sameModel.fingerprint, initial.fingerprint, "Selection modality stays outside the represented-state fingerprint");

  await page.locator('input[name="investment-model-prompt-view"][value="plain"]').focus();
  await carrierPage.keyboard.press("ArrowRight");
  const assistedControl = page.locator('input[name="investment-model-prompt-view"][value="skill-assisted"]');
  assert.equal(await assistedControl.isChecked(), true);
  assert.equal(await assistedControl.evaluate((element) => document.activeElement === element), true);
  const assisted = await page.locator("#promptCapsuleMarkdown").textContent();
  const explicitAssisted = await page.evaluate(() =>
    globalThis.crossFunctionalInvestmentModelStudio.promptCapsuleMarkdown("skill-assisted"));
  assert.equal(assisted, explicitAssisted);
  assert.equal(promptCapsuleFingerprintFrom(assisted), initial.fingerprint);
  assert.match(assisted, /^## Skill assistance$/mu);
  assert.match(assisted, /https:\/\/schemas\.radiantnull\.com\/skills\/source-authority-mapping\//u);
  assert.match(assisted, /https:\/\/schemas\.radiantnull\.com\/skills\/practitioner-probe\//u);
  assert.match(assisted, /https:\/\/schemas\.radiantnull\.com\/skills\/bounded-support-routing\//u);
  assert.match(assisted, /0b8c0463cc5e5fe107b894e2f6f204e3b746a99b/u);
  assert.match(assisted, /706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5/u);
  assert.match(assisted, /348ea113a75af3487a420e2075aa199297673aca0ba0a69e5a19d6c5a463776c/u);
  assert.match(assisted, /80dff2f88bc919500d9557a0ff67210e68cbdf1c69bbe63ac29b93662f9bd402/u);
  assert.equal(
    assisted.split("\n## Skill assistance")[0].replace("- View: `skill-assisted`", "- View: `plain`"),
    initial.plain,
    "Skill assistance extends the complete plain view without changing shared content",
  );
  assert.match(await page.locator("#promptViewStatus").textContent(), /Skill-assisted Markdown view selected/u);

  await page.locator("#copyPromptCapsule").click();
  await page.waitForFunction(() => globalThis.__canvasClipboardWrites.length > 0);
  assert.equal(
    await page.evaluate(() => globalThis.__canvasClipboardWrites.at(-1)),
    assisted,
    "Investment Model Studio copies the exact active Prompt Capsule",
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => { throw new Error("Clipboard unavailable"); } },
    });
    document.execCommand = () => false;
  });
  await page.locator("#copyPromptCapsule").click();
  assert.match(
    await page.locator("#promptViewStatus").textContent(),
    /Markdown remains visible for manual copy/u,
    "A declined clipboard write returns an accurate manual-copy route",
  );

  const last = tabs.last();
  const selectedId = await last.getAttribute("data-model-id");
  await last.click();
  const changed = await page.evaluate(() => ({
    state: globalThis.crossFunctionalInvestmentModelStudio.getState(),
    projection: globalThis.crossFunctionalInvestmentModelStudio.promptCapsuleStateProjection(),
    fingerprint: globalThis.crossFunctionalInvestmentModelStudio.promptCapsuleFingerprint(),
    assisted: globalThis.crossFunctionalInvestmentModelStudio.promptCapsuleMarkdown("skill-assisted"),
  }));
  assert.equal(changed.state.activeModelId, selectedId);
  assert.equal(changed.projection.state.activeModelId, selectedId);
  assert.notEqual(changed.fingerprint, initial.fingerprint);
  assert.equal(promptCapsuleFingerprintFrom(changed.assisted), changed.fingerprint);
  assert.match(changed.assisted, /Whole-Life TCO with OpEx &amp; Scaling/u);
  assert.match(changed.assisted, /Keep rates and economic assumptions as &lt;reserved&gt;/u);
  assert.equal(await page.locator("#promptCapsuleMarkdown").textContent(), changed.assisted);
  assert.equal(await last.getAttribute("aria-selected"), "true");

  const stateBeforeInvalid = changed.state;
  await page.evaluate(() => {
    const invalid = document.createElement("button");
    invalid.type = "button";
    invalid.setAttribute("role", "tab");
    invalid.dataset.modelId = "model/unrecognized";
    invalid.textContent = "Unrecognized model";
    document.getElementById("modelTabs").appendChild(invalid);
    invalid.click();
    invalid.remove();
  });
  assert.deepEqual(
    await page.evaluate(() => globalThis.crossFunctionalInvestmentModelStudio.getState()),
    stateBeforeInvalid,
    "An unrecognized selection leaves the accepted model state available",
  );
  assert.equal(
    await page.evaluate(() => globalThis.crossFunctionalInvestmentModelStudio.promptCapsuleFingerprint()),
    changed.fingerprint,
  );

  const downloadExpected = await page.locator("#promptCapsuleMarkdown").textContent();
  await page.evaluate(() => {
    const createObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      globalThis.__investmentPromptDownloadType = blob.type;
      return createObjectURL(blob);
    };
  });
  const [download] = await Promise.all([
    carrierPage.waitForEvent("download"),
    page.locator("#downloadPromptCapsule").click(),
  ]);
  assert.equal(
    download.suggestedFilename(),
    "cross-functional-investment-model-studio.whole-life-tco.prompt-capsule.r0.3.0.skill-assisted.md",
  );
  assert.equal(await download.failure(), null);
  assert.equal(await page.evaluate(() => globalThis.__investmentPromptDownloadType), "text/markdown;charset=utf-8");
  const downloadPath = await download.path();
  assert.ok(downloadPath, "Investment Model Studio Prompt Capsule download has a browser-owned path");
  assert.equal(await readFile(downloadPath, "utf8"), downloadExpected);
}

async function exerciseThreadkeeping({ carrierPage, page }) {
  const plainMarkdown = await page.locator("#hydrationPacket").inputValue();
  const initialFingerprint = await page.evaluate(() => globalThis.threadkeepingLedger.promptCapsuleFingerprint());
  assert.equal(
    plainMarkdown,
    await page.evaluate(() => globalThis.threadkeepingLedger.promptCapsule()),
    "Threadkeeping exposes the visible plain Prompt Capsule byte stream",
  );
  await page.locator("#copyHydrationBtn").click();
  await page.waitForFunction(() => globalThis.__canvasClipboardWrites.length > 0);
  assert.equal(
    await page.evaluate(() => globalThis.__canvasClipboardWrites.at(-1)),
    plainMarkdown,
    "Threadkeeping copies its exact active Prompt Capsule",
  );
  const [promptDownload] = await Promise.all([
    carrierPage.waitForEvent("download"),
    page.locator("#downloadHydrationBtn").click(),
  ]);
  assert.equal(promptDownload.suggestedFilename(), "threadkeeping-ledger.prompt-capsule.r0.1.plain.md");
  assert.equal(await promptDownload.failure(), null);
  const promptDownloadPath = await promptDownload.path();
  assert.ok(promptDownloadPath, "Threadkeeping Prompt Capsule download has a browser-owned temporary path");
  assert.equal(
    await readFile(promptDownloadPath, "utf8"),
    plainMarkdown,
    "Threadkeeping Prompt Capsule download contains the exact active Markdown",
  );

  await page.locator('[data-prompt-view][value="skill-assisted"]').check();
  const assistedMarkdown = await page.locator("#hydrationPacket").inputValue();
  assert.match(assistedMarkdown, /^## Skill assistance$/mu);
  assert.equal(
    assistedMarkdown,
    await page.evaluate(() => globalThis.threadkeepingLedger.promptCapsuleMarkdown("skill-assisted")),
  );
  assert.equal(
    await page.evaluate(() => globalThis.threadkeepingLedger.promptCapsuleFingerprint()),
    initialFingerprint,
    "Threadkeeping keeps one represented-state fingerprint across Markdown views",
  );

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

  let nativeModalObserved = false;
  const nativeModalListener = async (dialog) => {
    nativeModalObserved = true;
    await dialog.dismiss();
  };
  carrierPage.on("dialog", nativeModalListener);

  const candidateBefore = await page.evaluate(() => {
    const state = globalThis.threadkeepingLedger.getState();
    const candidate = state.threadkeeper.nextCandidates[0];
    return {
      count: state.threadkeeper.nextCandidates.length,
      id: candidate.id,
      title: candidate.title,
      referencedBy: state.threadkeeper.entries.filter((entry) =>
        entry.nextCandidateRefs.includes(candidate.id)).length,
    };
  });
  assert.ok(
    candidateBefore.referencedBy > 0,
    "Threadkeeping deletion coverage begins with a referenced next candidate",
  );
  await page.locator(`[data-edit-candidate="${candidateBefore.id}"]`).first().click();
  await page.locator("#deleteCandidateBtn").click();
  assert.equal(await page.locator("#candidateDeleteConfirmation").isVisible(), true);
  assert.equal(await page.locator("#deleteCandidateBtn").getAttribute("aria-expanded"), "true");
  assert.equal(
    await page.locator("#cancelDeleteCandidateBtn").evaluate((element) => document.activeElement === element),
    true,
    "Threadkeeping places keyboard focus on the safe candidate-deletion action",
  );
  await page.locator("#cancelDeleteCandidateBtn").click();
  assert.equal(await page.locator("#candidateDeleteConfirmation").isHidden(), true);
  assert.equal(
    await page.locator("#deleteCandidateBtn").evaluate((element) => document.activeElement === element),
    true,
    "Cancelling candidate deletion restores focus to its trigger",
  );
  assert.equal(
    await page.evaluate(() => globalThis.threadkeepingLedger.getState().threadkeeper.nextCandidates.length),
    candidateBefore.count,
    "Cancelling keeps the next candidate",
  );
  await page.locator("#deleteCandidateBtn").click();
  await page.locator("#confirmDeleteCandidateBtn").click();
  await page.locator("#candidateDialog").waitFor({ state: "hidden" });
  const candidateAfter = await page.evaluate((deletedId) => {
    const state = globalThis.threadkeepingLedger.getState();
    return {
      count: state.threadkeeper.nextCandidates.length,
      retainedDeletedId: state.threadkeeper.nextCandidates.some((item) => item.id === deletedId),
      retainedReferences: state.threadkeeper.entries.some((entry) => entry.nextCandidateRefs.includes(deletedId)),
    };
  }, candidateBefore.id);
  assert.equal(candidateAfter.count, candidateBefore.count - 1);
  assert.equal(candidateAfter.retainedDeletedId, false);
  assert.equal(candidateAfter.retainedReferences, false);
  // The live region clears and repopulates on the next animation frame so
  // assistive technology can announce repeated action shapes. Observe that
  // settled frame instead of coupling this contract to runner timing.
  const ledgerActionStatus = page.locator("#ledgerActionStatus");
  await ledgerActionStatus.filter({ hasText: /Next candidate .* deleted/u }).waitFor();
  assert.match(await ledgerActionStatus.textContent(), /Next candidate .* deleted/u);
  await page.waitForFunction(() =>
    Boolean(document.activeElement?.matches('[data-edit-candidate], #addCandidateBtn')));
  assert.equal(
    await page.evaluate(() => Boolean(document.activeElement?.matches('[data-edit-candidate], #addCandidateBtn'))),
    true,
    "Candidate deletion restores focus to the next recoverable action",
  );

  const referencedEntryId = await page.evaluate(() => {
    const state = globalThis.threadkeepingLedger.getState();
    return state.threadkeeper.entries.find((candidate) =>
      state.threadkeeper.entries.some((entry) =>
        entry.supersedes === candidate.id || entry.supersededBy === candidate.id) ||
      state.threadkeeper.nextCandidates.some((nextCandidate) =>
        nextCandidate.inheritsFrom.includes(candidate.id)))?.id ?? "";
  });
  assert.ok(referencedEntryId, "Threadkeeping retains a referenced entry after candidate deletion");
  await page.locator(`#ledgerBody [data-select-entry="${referencedEntryId}"]`).click();
  const entryBefore = await page.evaluate(() => {
    const state = globalThis.threadkeepingLedger.getState();
    const id = state.viewState.selectedEntryId;
    return {
      count: state.threadkeeper.entries.length,
      id,
      referenceCount:
        state.threadkeeper.entries.filter((entry) =>
          entry.supersedes === id || entry.supersededBy === id).length +
        state.threadkeeper.nextCandidates.filter((candidate) =>
          candidate.inheritsFrom.includes(id)).length,
      title: state.threadkeeper.entries.find((entry) => entry.id === id).title,
    };
  });
  assert.ok(
    entryBefore.referenceCount > 0,
    "Threadkeeping entry-deletion coverage begins with a referenced entry",
  );
  await page.locator("#deleteEntryBtn").click();
  assert.equal(await page.locator("#entryDeleteConfirmation").isVisible(), true);
  assert.equal(await page.locator("#deleteEntryBtn").getAttribute("aria-expanded"), "true");
  assert.equal(
    await page.locator("#cancelDeleteEntryBtn").evaluate((element) => document.activeElement === element),
    true,
    "Threadkeeping places keyboard focus on the safe entry-deletion action",
  );
  await page.locator("#cancelDeleteEntryBtn").click();
  assert.equal(await page.locator("#entryDeleteConfirmation").isHidden(), true);
  assert.equal(
    await page.locator("#deleteEntryBtn").evaluate((element) => document.activeElement === element),
    true,
    "Cancelling entry deletion restores focus to its trigger",
  );
  assert.equal(
    await page.evaluate(() => globalThis.threadkeepingLedger.getState().threadkeeper.entries.length),
    entryBefore.count,
    "Cancelling keeps the selected entry",
  );
  await page.locator("#deleteEntryBtn").click();
  await page.locator("#confirmDeleteEntryBtn").click();
  const entryAfter = await page.evaluate((deletedId) => {
    const state = globalThis.threadkeepingLedger.getState();
    return {
      count: state.threadkeeper.entries.length,
      retainedDeletedId: state.threadkeeper.entries.some((entry) => entry.id === deletedId),
      retainedReferences:
        state.threadkeeper.entries.some((entry) =>
          entry.supersedes === deletedId || entry.supersededBy === deletedId) ||
        state.threadkeeper.nextCandidates.some((candidate) =>
          candidate.inheritsFrom.includes(deletedId)),
    };
  }, entryBefore.id);
  assert.equal(entryAfter.count, entryBefore.count - 1);
  assert.equal(entryAfter.retainedDeletedId, false);
  assert.equal(entryAfter.retainedReferences, false);
  await ledgerActionStatus.filter({ hasText: /Entry .* deleted/u }).waitFor();
  assert.match(await ledgerActionStatus.textContent(), /Entry .* deleted/u);
  await page.waitForFunction(() =>
    Boolean(document.activeElement?.matches('#selectedInspector [data-entry-field]')));
  assert.equal(
    await page.locator("#selectedInspector [data-entry-field]").first().evaluate((element) => document.activeElement === element),
    true,
    "Entry deletion restores focus inside the next selected record",
  );
  assert.equal(nativeModalObserved, false, "Threadkeeping completes deletion recovery without a native confirm dialog");
  carrierPage.off("dialog", nativeModalListener);
}

async function exerciseOpenLesson({ carrierPage, page }) {
  const plainMarkdown = await page.locator("#packet").textContent();
  assert.equal(
    plainMarkdown,
    await page.evaluate(() => globalThis.openLessonField.promptCapsule()),
    "Open Lesson Field exposes the visible plain Prompt Capsule byte stream",
  );
  await page.locator("#copy-prompt").click();
  await page.waitForFunction(() => globalThis.__canvasClipboardWrites.length > 0);
  assert.equal(
    await page.evaluate(() => globalThis.__canvasClipboardWrites.at(-1)),
    plainMarkdown,
    "Open Lesson Field copies its exact active Prompt Capsule",
  );
  const [download] = await Promise.all([
    carrierPage.waitForEvent("download"),
    page.locator("#download-prompt").click(),
  ]);
  assert.equal(download.suggestedFilename(), "open-lesson-field.prompt-capsule.r0.plain.md");
  assert.equal(await download.failure(), null);
  const downloadPath = await download.path();
  assert.ok(downloadPath, "Open Lesson Field download has a browser-owned temporary path");
  assert.equal(
    await readFile(downloadPath, "utf8"),
    plainMarkdown,
    "Open Lesson Field download contains the exact active Prompt Capsule",
  );
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

async function exerciseAtlas(session) {
  const { browser, carrierPage, expectedPaths, origin, page, route } = session;
  assert.match(
    await page.locator("noscript").first().textContent(),
    /complete static selector/i,
    "Atlas retains a no-script route to the static reading",
  );

  const initialPrompt = await page.evaluate(() => {
    const api = globalThis.visualizationFidelityAtlas;
    return {
      apiFrozen: Object.isFrozen(api),
      viewsFrozen: Object.isFrozen(api.views),
      version: api.version,
      stateContract: api.stateContract,
      contract: api.contract,
      views: api.views.slice(),
      skillRevision: api.skillRevision,
      skillPaths: api.skills.map((skill) => skill.path),
      relatedLoopIds: api.relatedLoops.map((loop) => loop.id),
      view: api.getPromptCapsuleView(),
      state: api.getState(),
      exported: api.exportState(),
      projection: api.promptCapsuleStateProjection(),
      fingerprint: api.promptCapsuleFingerprint(),
      plain: api.promptCapsule(),
      explicitPlain: api.promptCapsuleMarkdown("plain"),
    };
  });
  assert.equal(initialPrompt.apiFrozen, true);
  assert.equal(initialPrompt.viewsFrozen, true);
  assert.equal(initialPrompt.version, "0.1");
  assert.equal(
    initialPrompt.stateContract,
    "visualization-fidelity-atlas-state.v0.1",
  );
  assert.equal(initialPrompt.contract, "prompt-capsule/0.1.0");
  assert.deepEqual(initialPrompt.views, ["plain", "skill-assisted"]);
  assert.match(initialPrompt.skillRevision, /^[0-9a-f]{40}$/u);
  assert.deepEqual(initialPrompt.skillPaths, [
    ".agents/skills/evidence-grounded-research-spike/SKILL.md",
    ".agents/skills/source-authority-mapping/SKILL.md",
    ".agents/skills/stateful-artifact-behavior-contracts/SKILL.md",
  ]);
  assert.deepEqual(initialPrompt.relatedLoopIds, [
    "visitor-surface-change",
    "repository-reentry",
  ]);
  assert.equal(initialPrompt.view, "plain");
  assert.deepEqual(initialPrompt.state, initialPrompt.exported);
  assert.deepEqual(
    Object.keys(initialPrompt.state.view_state).sort(),
    [
      "aiIngestion",
      "audience",
      "selectedExemplarId",
      "selectedMoveId",
      "selectedShapeId",
      "selectedVisualFormId",
      "showReserved",
      "uncertaintyRequired",
    ],
  );
  assert.deepEqual(
    Object.keys(initialPrompt.projection).sort(),
    ["atlas", "capsule", "contract", "source", "stateContract", "viewState"],
  );
  assert.deepEqual(
    Object.keys(initialPrompt.projection.viewState).sort(),
    Object.keys(initialPrompt.state.view_state).sort(),
  );
  assert.equal(
    initialPrompt.projection.capsule,
    "visualization-fidelity-atlas/current-selection",
  );
  assert.equal(initialPrompt.projection.source, "visualization-fidelity-atlas@0.1");
  assert.equal(initialPrompt.projection.contract, "prompt-capsule/0.1.0");
  assert.equal(
    initialPrompt.projection.stateContract,
    "visualization-fidelity-atlas-state.v0.1",
  );
  assert.equal(
    initialPrompt.projection.atlas.artifact_identity.id,
    initialPrompt.state.artifact_identity.id,
  );
  assert.equal(Object.hasOwn(initialPrompt.projection.atlas, "view_state"), false);
  assert.equal(Object.hasOwn(initialPrompt.projection.atlas, "extensions"), false);
  assert.equal(initialPrompt.plain, initialPrompt.explicitPlain);
  assert.equal(initialPrompt.plain, await page.locator("#aiPrompt").inputValue());
  assert.ok(initialPrompt.plain.endsWith("\n"));
  assertAtlasPromptCapsuleSections(initialPrompt.plain, "Initial Atlas plain Prompt Capsule");
  assert.equal(promptCapsuleFingerprintFrom(initialPrompt.plain), initialPrompt.fingerprint);
  assert.match(initialPrompt.plain, /- Contract: `prompt-capsule\/0\.1\.0`/u);
  assert.match(
    initialPrompt.plain,
    /- Capsule: `visualization-fidelity-atlas\/current-selection`/u,
  );
  assert.match(initialPrompt.plain, /- Source: `visualization-fidelity-atlas@0\.1`/u);
  assert.match(
    initialPrompt.plain,
    /- State: `visualization-fidelity-atlas-state\.v0\.1`/u,
  );

  const source = await readFile(path.join(repositoryRoot, route.source_file), "utf8");
  const staticMatch = source.match(
    /<textarea(?=[^>]*\bid="aiPrompt")[^>]*>([\s\S]*?)<\/textarea>/u,
  );
  assert.ok(staticMatch, "Atlas source carries an authored plain Prompt Capsule baseline");
  const staticPlain = await page.evaluate((encoded) => {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = encoded;
    return textarea.value;
  }, staticMatch[1]);
  assert.equal(
    staticPlain,
    initialPrompt.plain,
    "Authored Atlas baseline equals the runtime plain Markdown exactly",
  );

  const noScriptContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 900 },
  });
  try {
    const noScriptLocalRequests = [];
    const noScriptUnexpectedRequests = [];
    noScriptContext.on("request", (request) => {
      const requestUrl = new URL(request.url());
      if (["about:", "blob:", "data:"].includes(requestUrl.protocol)) return;
      if (requestUrl.origin === origin) {
        noScriptLocalRequests.push({
          method: request.method(),
          pathname: requestUrl.pathname,
          resourceType: request.resourceType(),
        });
        if (request.method() !== "GET" || !expectedPaths.has(requestUrl.pathname)) {
          noScriptUnexpectedRequests.push(`${request.method()} ${requestUrl.href}`);
        }
        return;
      }
      noScriptUnexpectedRequests.push(`${request.method()} ${requestUrl.href}`);
    });
    await noScriptContext.route("**/*", async (routeHandle) => {
      const requestUrl = new URL(routeHandle.request().url());
      if (
        ["http:", "https:"].includes(requestUrl.protocol) &&
        requestUrl.origin !== origin
      ) {
        await routeHandle.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: "<!doctype html><title>Contained external request</title>",
        });
        return;
      }
      await routeHandle.continue();
    });
    const noScriptPage = await noScriptContext.newPage();
    const noScriptTelemetry = monitor(noScriptPage);
    await noScriptPage.goto(routeUrl(origin, route), { waitUntil: "domcontentloaded" });
    await noScriptPage.waitForLoadState("networkidle", { timeout: 5000 });
    assert.equal(
      await noScriptPage.locator("#aiPrompt").inputValue(),
      initialPrompt.plain,
      "JavaScript-disabled Atlas exposes the exact initial plain Markdown",
    );
    assert.equal(await noScriptPage.locator("#aiPrompt").isVisible(), true);
    assert.equal(await noScriptPage.locator("[data-prompt-actions]").isVisible(), false);
    assert.equal(
      await noScriptPage.locator("[data-prompt-view-control]").isVisible(),
      false,
    );
    assert.equal(
      await noScriptPage.locator("[data-prompt-related-loops]").isVisible(),
      true,
    );
    const promptBounds = await noScriptPage.locator("#aiPrompt").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, viewport: innerWidth };
    });
    assert.ok(promptBounds.left >= -0.5, "no-script Prompt Capsule stays inside the narrow left edge");
    assert.ok(
      promptBounds.right <= promptBounds.viewport + 0.5,
      "no-script Prompt Capsule stays inside the 320px viewport",
    );
    const noScriptEntryPath = new URL(routeUrl(origin, route)).pathname;
    assert.equal(
      noScriptLocalRequests.filter(
        ({ pathname, resourceType }) =>
          pathname === noScriptEntryPath && resourceType === "document",
      ).length,
      1,
      "JavaScript-disabled Atlas loads its entry document once",
    );
    assert.deepEqual(noScriptUnexpectedRequests, []);
    assertTelemetry(noScriptTelemetry);
  } finally {
    await noScriptContext.close();
  }

  const detachedPromptState = await page.evaluate(() => {
    const api = globalThis.visualizationFidelityAtlas;
    const state = api.getState();
    const exported = api.exportState();
    const projection = api.promptCapsuleStateProjection();
    state.artifact_identity.display_name = "Changed outside API";
    exported.view_state.audience = "research";
    projection.atlas.artifact_identity.display_name = "Changed outside API";
    projection.viewState.audience = "research";
    return {
      state: api.getState(),
      exported: api.exportState(),
      projection: api.promptCapsuleStateProjection(),
      fingerprint: api.promptCapsuleFingerprint(),
      plain: api.promptCapsule(),
    };
  });
  assert.deepEqual(detachedPromptState.state, initialPrompt.state);
  assert.deepEqual(detachedPromptState.exported, initialPrompt.exported);
  assert.deepEqual(detachedPromptState.projection, initialPrompt.projection);
  assert.equal(detachedPromptState.fingerprint, initialPrompt.fingerprint);
  assert.equal(detachedPromptState.plain, initialPrompt.plain);

  const privateExtension = await page.evaluate((baseline) => {
    const api = globalThis.visualizationFidelityAtlas;
    const candidate = structuredClone(baseline);
    candidate.extensions = {
      private_workspace_note: "available to its private receiver",
      nested: { marker: "retained" },
    };
    candidate.quick_use.private_workspace_note = {
      marker: "retained beside an authored field",
    };
    api.importState(candidate);
    const exported = api.exportState();
    const projection = api.promptCapsuleStateProjection();
    return {
      exported,
      projection,
      fingerprint: api.promptCapsuleFingerprint(),
      plain: api.promptCapsule(),
    };
  }, initialPrompt.state);
  assert.equal(
    privateExtension.exported.extensions.private_workspace_note,
    "available to its private receiver",
  );
  assert.equal(privateExtension.exported.extensions.nested.marker, "retained");
  assert.equal(
    privateExtension.exported.quick_use.private_workspace_note.marker,
    "retained beside an authored field",
  );
  assert.equal(Object.hasOwn(privateExtension.projection.atlas, "extensions"), false);
  assert.equal(
    Object.hasOwn(privateExtension.projection.atlas.quick_use, "private_workspace_note"),
    false,
  );
  assert.equal(privateExtension.fingerprint, initialPrompt.fingerprint);
  assert.equal(privateExtension.plain, initialPrompt.plain);
  assert.doesNotMatch(privateExtension.plain, /private_workspace_note/u);

  const representedChange = await page.evaluate((baseline) => {
    const api = globalThis.visualizationFidelityAtlas;
    const candidate = structuredClone(baseline);
    candidate.quick_use.good_next_question =
      `${candidate.quick_use.good_next_question} Name the decision this visual supports.`;
    candidate.view_state.audience = "research";
    api.importState(candidate);
    return {
      state: api.getState(),
      projection: api.promptCapsuleStateProjection(),
      fingerprint: api.promptCapsuleFingerprint(),
      plain: api.promptCapsule(),
    };
  }, initialPrompt.state);
  assert.notEqual(representedChange.fingerprint, initialPrompt.fingerprint);
  assert.equal(representedChange.projection.viewState.audience, "research");
  assert.match(representedChange.plain, /Name the decision this visual supports\./u);
  assert.match(
    representedChange.plain,
    /^- Audience or review context: `research`\.$/mu,
  );
  assert.equal(promptCapsuleFingerprintFrom(representedChange.plain), representedChange.fingerprint);

  const rejectedApiImport = await page.evaluate((baseline) => {
    const api = globalThis.visualizationFidelityAtlas;
    api.importState(structuredClone(baseline));
    const before = {
      state: api.getState(),
      fingerprint: api.promptCapsuleFingerprint(),
      plain: api.promptCapsule(),
    };
    const invalid = api.exportState();
    invalid.data_shapes = [];
    let rejected = false;
    try {
      api.importState(invalid);
    } catch {
      rejected = true;
    }
    return {
      before,
      rejected,
      state: api.getState(),
      fingerprint: api.promptCapsuleFingerprint(),
      plain: api.promptCapsule(),
    };
  }, initialPrompt.state);
  assert.equal(rejectedApiImport.rejected, true);
  assert.deepEqual(rejectedApiImport.state, rejectedApiImport.before.state);
  assert.equal(rejectedApiImport.fingerprint, rejectedApiImport.before.fingerprint);
  assert.equal(rejectedApiImport.plain, rejectedApiImport.before.plain);

  for (const field of ["display_name", "version"]) {
    const rejectedIdentityImport = await page.evaluate(({ baseline, field }) => {
      const api = globalThis.visualizationFidelityAtlas;
      api.importState(structuredClone(baseline));
      const before = {
        state: api.getState(),
        fingerprint: api.promptCapsuleFingerprint(),
        plain: api.promptCapsule(),
      };
      const invalid = api.exportState();
      delete invalid.artifact_identity[field];
      let rejected = false;
      try {
        api.importState(invalid);
      } catch {
        rejected = true;
      }
      return {
        before,
        rejected,
        state: api.getState(),
        fingerprint: api.promptCapsuleFingerprint(),
        plain: api.promptCapsule(),
      };
    }, { baseline: initialPrompt.state, field });
    assert.equal(rejectedIdentityImport.rejected, true);
    assert.deepEqual(rejectedIdentityImport.state, rejectedIdentityImport.before.state);
    assert.equal(
      rejectedIdentityImport.fingerprint,
      rejectedIdentityImport.before.fingerprint,
    );
    assert.equal(rejectedIdentityImport.plain, rejectedIdentityImport.before.plain);
  }

  const assistedControl = page.locator('[data-prompt-view][value="skill-assisted"]');
  assert.equal(await assistedControl.evaluate((element) => element.tagName), "INPUT");
  assert.equal(await assistedControl.getAttribute("type"), "radio");
  await assistedControl.check();
  assert.equal(await assistedControl.isChecked(), true);
  assert.equal(
    await assistedControl.evaluate((element) => document.activeElement === element),
    true,
  );
  const assistedPrompt = await page.locator("#aiPrompt").inputValue();
  assert.equal(
    assistedPrompt,
    await page.evaluate(() =>
      globalThis.visualizationFidelityAtlas.promptCapsuleMarkdown("skill-assisted")),
  );
  assert.equal(
    await page.evaluate(() => globalThis.visualizationFidelityAtlas.getPromptCapsuleView()),
    "skill-assisted",
  );
  assert.equal(promptCapsuleFingerprintFrom(assistedPrompt), initialPrompt.fingerprint);
  assert.match(assistedPrompt, /^## Skill assistance$/mu);
  assert.match(
    assistedPrompt,
    /https:\/\/schemas\.radiantnull\.com\/skills\/evidence-grounded-research-spike\//u,
  );
  assert.match(
    assistedPrompt,
    /https:\/\/schemas\.radiantnull\.com\/skills\/source-authority-mapping\//u,
  );
  assert.match(
    assistedPrompt,
    /https:\/\/schemas\.radiantnull\.com\/skills\/stateful-artifact-behavior-contracts\//u,
  );
  assert.equal(
    assistedPrompt
      .split("\n## Skill assistance")[0]
      .replace("- View: `skill-assisted`", "- View: `plain`"),
    initialPrompt.plain,
    "Atlas skill assistance extends the complete plain view without changing shared content",
  );
  assert.match(
    await page.locator("#actionStatus").textContent(),
    /Skill-assisted Markdown view selected/u,
  );

  const loopRecords = await page.locator("[data-prompt-related-loops] [data-related-loop-id]").evaluateAll(
    (items) => items.map((item) => {
      const link = item.querySelector("a");
      return {
        id: item.dataset.relatedLoopId,
        href: link?.getAttribute("href"),
        target: link?.getAttribute("target"),
        rel: link?.getAttribute("rel"),
        fit: item.textContent.trim(),
      };
    }),
  );
  assert.deepEqual(loopRecords.map(({ id }) => id), [
    "visitor-surface-change",
    "repository-reentry",
  ]);
  assert.equal(
    loopRecords.every(({ href, target, rel, fit }) =>
      href?.startsWith("https://schemas.radiantnull.com/collaboration/#") &&
      target === "_blank" && rel === "noopener noreferrer" && Boolean(fit)),
    true,
  );
  await page.locator("[data-prompt-related-loops] summary").click();
  await observeExternalPopup(
    session,
    page.locator("[data-prompt-related-loops] a").first(),
  );

  await page.locator("#copyPromptBtn").click();
  await page.waitForFunction(() => globalThis.__canvasClipboardWrites.length > 0);
  assert.equal(
    await page.evaluate(() => globalThis.__canvasClipboardWrites.at(-1)),
    assistedPrompt,
    "Atlas copies the exact active Prompt Capsule",
  );
  assert.equal(await page.locator("#copyOutput").inputValue(), assistedPrompt);

  await page.evaluate(() => {
    const createObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      globalThis.__atlasPromptDownloadType = blob.type;
      return createObjectURL(blob);
    };
  });
  const [promptDownload] = await Promise.all([
    carrierPage.waitForEvent("download"),
    page.locator("#downloadPromptBtn").click(),
  ]);
  assert.equal(
    promptDownload.suggestedFilename(),
    "visualization-fidelity-atlas.prompt-capsule.r0.1.skill-assisted.md",
  );
  assert.equal(await promptDownload.failure(), null);
  assert.equal(
    await page.evaluate(() => globalThis.__atlasPromptDownloadType),
    "text/markdown;charset=utf-8",
  );
  const promptDownloadPath = await promptDownload.path();
  assert.ok(promptDownloadPath, "Atlas Prompt Capsule download has a browser-owned path");
  assert.equal(await readFile(promptDownloadPath, "utf8"), assistedPrompt);

  await page.locator('[data-prompt-view][value="plain"]').check();
  assert.equal(await page.locator("#aiPrompt").inputValue(), initialPrompt.plain);

  const initialExemplarId = await page
    .locator("#exemplarDetail")
    .getAttribute("data-selected-exemplar-id");
  const galleryExemplarControls = page.locator("#gallery [data-select-exemplar]");
  const galleryExemplarNames = await galleryExemplarControls.evaluateAll((controls) =>
    controls.map((control) => control.getAttribute("aria-label")),
  );
  assert.equal(
    galleryExemplarNames.every((name) => /^(?:Open exemplar \d+ of \d+|Exemplar \d+ of \d+ open): .+/u.test(name || "")),
    true,
    "every Atlas gallery action names the exemplar and its stable position",
  );
  assert.equal(
    new Set(galleryExemplarNames).size,
    galleryExemplarNames.length,
    "Atlas gallery actions remain distinguishable outside their visual cards",
  );
  const duplicateTitleAtlas = structuredClone(initialPrompt.exported);
  duplicateTitleAtlas.exemplars[2].title = duplicateTitleAtlas.exemplars[1].title;
  await importAtlasFixture(page, "atlas-duplicate-titles.json", duplicateTitleAtlas);
  const duplicateTitleNames = await galleryExemplarControls.evaluateAll((controls) =>
    controls.map((control) => control.getAttribute("aria-label")),
  );
  assert.equal(
    new Set(duplicateTitleNames).size,
    duplicateTitleNames.length,
    "accepted exemplars with repeated titles retain distinct position-bearing actions",
  );
  await importAtlasFixture(page, "atlas-baseline.json", initialPrompt.exported);
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

  const secondExemplar = page.getByRole("button", {
    name: /^Open exemplar \d+ of \d+: Which review delay drivers should be triaged first\?$/u,
  });
  const secondExemplarPosition = await secondExemplar.evaluate((element) => {
    const controls = [...document.querySelectorAll("#gallery [data-select-exemplar]")];
    return `${controls.indexOf(element) + 1} of ${controls.length}`;
  });
  const secondExemplarId = await secondExemplar.getAttribute("data-select-exemplar");
  await secondExemplar.press("Enter");
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
  assert.equal(
    await page
      .locator(`[data-select-exemplar="${secondExemplarId}"]`)
      .last()
      .getAttribute("aria-label"),
    `Exemplar ${secondExemplarPosition} open: Which review delay drivers should be triaged first?`,
  );
  const selectedExemplarTitle = page.locator("#selected-exemplar-title");
  assert.equal(await selectedExemplarTitle.evaluate((element) => element.tagName), "H4");
  assert.equal(
    (await selectedExemplarTitle.textContent())?.trim(),
    "Which review delay drivers should be triaged first?",
  );
  assert.equal(
    await selectedExemplarTitle.evaluate((element) => document.activeElement === element),
    true,
    "exemplar activation moves focus to its concise semantic title",
  );
  assert.notEqual(
    await selectedExemplarTitle.evaluate((element) => getComputedStyle(element).outlineStyle),
    "none",
    "the selected exemplar title preserves a visible keyboard arrival",
  );

  await carrierPage.setViewportSize({ width: 320, height: 900 });
  const textSpacingStyle = await page.addStyleTag({
    content: `
      * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }
      p { margin-block-end: 2em !important; }
    `,
  });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  const spacedAtlas = await page.evaluate(() => {
    const root = document.documentElement;
    const evidenceGrid = document.querySelector(".exemplar-evidence-grid");
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      evidenceColumns: evidenceGrid ? getComputedStyle(evidenceGrid).gridTemplateColumns : "",
    };
  });
  assert.ok(
    spacedAtlas.scrollWidth <= spacedAtlas.clientWidth + 2,
    `Atlas text spacing remains contained at the 400% reflow model (${spacedAtlas.scrollWidth}/${spacedAtlas.clientWidth})`,
  );
  assert.equal(
    spacedAtlas.evidenceColumns.trim().split(/\s+/u).length,
    1,
    "Atlas evidence follows one readable column at the 400% reflow model",
  );
  await textSpacingStyle.evaluate((element) => element.remove());
  await carrierPage.setViewportSize({ width: viewports[0].width, height: viewports[0].height });

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
  assert.match(
    await page.locator("#aiPrompt").inputValue(),
    /^- Audience or review context: `mixed`\.$/mu,
    "reset keeps the visible Prompt Capsule audience aligned with the selector",
  );
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
    /Reserved recommendations: represented in the state while Recommended and Conditional forms hold the current visual focus/,
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

  const beforeRejectedUiImport = await page.evaluate(() => ({
    state: globalThis.visualizationFidelityAtlas.getState(),
    fingerprint: globalThis.visualizationFidelityAtlas.promptCapsuleFingerprint(),
    markdown: globalThis.visualizationFidelityAtlas.promptCapsule(),
  }));
  await page.locator("#jsonImport").fill("{");
  await page.locator("#importJsonBtn").click();
  assert.match(await page.locator("#importStatus").textContent(), /needs revision/i);
  assert.equal(
    await page.locator('[data-form-id="form-lollipop"]').getAttribute("aria-pressed"),
    "true",
  );
  assert.deepEqual(
    await page.evaluate(() => ({
      state: globalThis.visualizationFidelityAtlas.getState(),
      fingerprint: globalThis.visualizationFidelityAtlas.promptCapsuleFingerprint(),
      markdown: globalThis.visualizationFidelityAtlas.promptCapsule(),
    })),
    beforeRejectedUiImport,
    "Malformed pasted JSON leaves the accepted Atlas and Prompt Capsule available",
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
  assert.deepEqual(
    await page.evaluate(() => ({
      state: globalThis.visualizationFidelityAtlas.getState(),
      fingerprint: globalThis.visualizationFidelityAtlas.promptCapsuleFingerprint(),
      markdown: globalThis.visualizationFidelityAtlas.promptCapsule(),
    })),
    beforeRejectedUiImport,
    "Structurally invalid file input leaves the accepted Atlas and Prompt Capsule available",
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
      sandbox_tokens: ["allow-downloads", "allow-popups", "allow-popups-to-escape-sandbox", "allow-scripts"],
      permissions_policy: ["clipboard-write"],
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
    policy: {
      sandbox_tokens: ["allow-downloads", "allow-popups", "allow-popups-to-escape-sandbox", "allow-scripts"],
      permissions_policy: ["clipboard-write"],
    },
    exercise: exerciseInvestmentModelStudio,
  }],
  ["threadkeeping-ledger", {
    policy: {
      sandbox_tokens: ["allow-downloads", "allow-popups", "allow-popups-to-escape-sandbox", "allow-scripts"],
      permissions_policy: ["clipboard-write"],
    },
    exercise: exerciseThreadkeeping,
  }],
  ["open-lesson-field", {
    policy: { sandbox_tokens: ["allow-downloads", "allow-modals", "allow-popups", "allow-popups-to-escape-sandbox", "allow-scripts"], permissions_policy: ["clipboard-write"] },
    exercise: exerciseOpenLesson,
  }],
  ["visualization-fidelity-atlas", {
    policy: {
      sandbox_tokens: [
        "allow-downloads",
        "allow-popups",
        "allow-popups-to-escape-sandbox",
        "allow-scripts",
      ],
      permissions_policy: ["clipboard-write"],
    },
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
    await assertProjectedExitLinks(session, `${route.id} exercised state`);
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

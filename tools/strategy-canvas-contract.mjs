#!/usr/bin/env node

import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

import {
  artifactAuthor,
  artifactAttribution,
  artifactLicense,
} from "./attribution-contract.mjs";

const CANONICAL = "core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-chimeric-prototype-v0.2.1.html";
const CONTEXT = "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/strategy-canvas-chimeric-prototype-v0.2.1.html";
const NARRATIVE_COMPOSERS = [
  {
    name: "Context",
    route: "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/narrative-capsule-composer/narrative-capsules-chimeric-prototype-v0.1.html"
  }
];
const SCHEMA_NEGATIVE_FIXTURE = "planning/context-canvas/strategy-canvas/fixtures/schema-validator-negative-cases.v2.json";
const SHARED_STRATEGY_CORE = "core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-core.js";
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
  { name: "room", width: 1920, height: 1080 },
  { name: "wide", width: 2560, height: 1440 }
];
// Full-page browser zoom reduces the available CSS viewport by the reciprocal
// of the zoom level. These profiles use a 1280px reference viewport so the
// resulting layout geometry matches 200% and 400% zoom without relying on a
// browser-specific UI command that headless Chromium does not expose.
const ZOOM_PROFILES = [
  { name: "200%", width: 640, height: 900 },
  { name: "400%", width: 320, height: 800 }
];

const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = resolve(".visual-runs", `${runId}-strategy-canvas-contract`);
const checks = [];
const failures = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function inlineJsonConstant(html, name) {
  const prefix = `const ${name}=`;
  const line = html.split("\n").find((candidate) => candidate.startsWith(prefix));
  assert(line?.endsWith(";"), `Inline ${name} snapshot should be a single terminated JSON assignment.`);
  return JSON.parse(line.slice(prefix.length, -1));
}

async function verify(label, callback) {
  try {
    await callback();
    checks.push({ label, status: "passed" });
  } catch (error) {
    const message = error?.message || String(error);
    checks.push({ label, status: "failed", message });
    failures.push(`${label}: ${message}`);
  }
}

async function startStaticServer(rootDirectory) {
  const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8"
  };
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const absolutePath = resolve(rootDirectory, `.${pathname}`);
      const repositoryPath = relative(rootDirectory, absolutePath);
      if (repositoryPath.startsWith("..") || repositoryPath === "") {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const body = await readFile(absolutePath);
      response.writeHead(200, {
        "Content-Type": contentTypes[extname(absolutePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      response.end(body);
    } catch (error) {
      response.writeHead(error?.code === "ENOENT" ? 404 : 500).end("Unavailable");
    }
  });
  await new Promise((resolveListening, rejectListening) => {
    server.once("error", rejectListening);
    server.listen(0, "127.0.0.1", resolveListening);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
    })
  };
}

function monitor(page) {
  const telemetry = { consoleErrors: [], pageErrors: [], requestFailures: [], responseErrors: [] };
  page.on("console", (message) => {
    if (message.type() === "error") telemetry.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => telemetry.pageErrors.push(error.message));
  page.on("requestfailed", (request) => telemetry.requestFailures.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText || "request failed"}`));
  page.on("response", (response) => {
    if (response.status() >= 400) telemetry.responseErrors.push(`${response.status()} ${response.url()}`);
  });
  return telemetry;
}

function assertTelemetry(telemetry) {
  const entries = [
    ...telemetry.consoleErrors.map((value) => `console: ${value}`),
    ...telemetry.pageErrors.map((value) => `page: ${value}`),
    ...telemetry.requestFailures.map((value) => `request: ${value}`),
    ...telemetry.responseErrors.map((value) => `response: ${value}`)
  ];
  assert(entries.length === 0, `Browser telemetry should stay clear. ${entries.join(" | ")}`);
}

async function openPage(browser, url, viewport, options = {}) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, ...options });
  const page = await context.newPage();
  const telemetry = monitor(page);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  return { context, page, telemetry };
}

async function layoutReceipt(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const footer = document.querySelector("footer.artifact-attribution");
    const footerStyle = footer ? getComputedStyle(footer) : null;
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const smallTargets = [];
    for (const control of document.querySelectorAll("button, input, select, textarea, [role=slider]")) {
      if (!visible(control) || control.disabled) continue;
      const nativeType = control.getAttribute("type") || "";
      const target = /^(checkbox|radio)$/.test(nativeType) ? control.closest("label") : control;
      const rect = target?.getBoundingClientRect();
      if (rect && (rect.width < 43.5 || rect.height < 43.5)) {
        smallTargets.push(`${control.tagName.toLowerCase()}${control.id ? `#${control.id}` : ""} ${rect.width.toFixed(1)}×${rect.height.toFixed(1)}`);
      }
    }
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      smallTargets,
      authorValues: [...document.querySelectorAll('meta[name="author"]')].map(element => element.content),
      licenseTargets: [...document.querySelectorAll('link[rel="license"]')].map(element => element.href),
      footerCount: document.querySelectorAll("footer.artifact-attribution").length,
      noticeCount: document.querySelectorAll("footer.artifact-attribution .artifact-attribution__notice").length,
      noticeText: footer?.querySelector(".artifact-attribution__notice")?.textContent.trim() || "",
      footerPosition: footerStyle?.position || "",
      footerVisible: Boolean(footer && visible(footer)),
      footerClientWidth: footer?.clientWidth || 0,
      footerScrollWidth: footer?.scrollWidth || 0
    };
  });
}

async function assertLayout(page, label) {
  const receipt = await layoutReceipt(page);
  assert(receipt.scrollWidth <= receipt.clientWidth + 2, `${label} should contain document width (${receipt.scrollWidth}/${receipt.clientWidth}).`);
  assert(receipt.smallTargets.length === 0, `${label} interactive targets should be at least 44×44. ${receipt.smallTargets.join("; ")}`);
  assert(same(receipt.authorValues, [artifactAuthor]), `${label} should expose one exact author metadata value.`);
  assert(same(receipt.licenseTargets, [artifactLicense]), `${label} should expose one exact license relation.`);
  assert(receipt.footerCount === 1 && receipt.noticeCount === 1, `${label} should expose one attribution footer and notice.`);
  assert(receipt.noticeText === artifactAttribution, `${label} should preserve the exact visible attribution notice.`);
  assert(receipt.footerPosition === "static", `${label} attribution should stay in document flow.`);
  assert(receipt.footerVisible, `${label} attribution should remain visible.`);
  assert(receipt.footerScrollWidth <= receipt.footerClientWidth + 1, `${label} attribution should contain its content.`);
}

async function zoomReceipt(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const clippedControls = [];
    for (const control of document.querySelectorAll("button, summary")) {
      if (!visible(control)) continue;
      if (control.scrollWidth > control.clientWidth + 2 || control.scrollHeight > control.clientHeight + 2) {
        clippedControls.push(`${control.tagName.toLowerCase()}${control.id ? `#${control.id}` : ""} ${control.clientWidth}×${control.clientHeight} contains ${control.scrollWidth}×${control.scrollHeight}`);
      }
    }
    const crampedSingleLineControls = [];
    for (const control of document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), select')) {
      if (!visible(control) || control.disabled) continue;
      const style = getComputedStyle(control);
      const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;
      const availableHeight = control.clientHeight - Number.parseFloat(style.paddingTop) - Number.parseFloat(style.paddingBottom);
      if (availableHeight + 1 < lineHeight) {
        crampedSingleLineControls.push(`${control.tagName.toLowerCase()}${control.id ? `#${control.id}` : ""} ${availableHeight.toFixed(1)}px available for ${lineHeight.toFixed(1)}px line`);
      }
    }
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      clippedControls,
      crampedSingleLineControls
    };
  });
}

async function assertZoomContainment(page, label) {
  const receipt = await zoomReceipt(page);
  assert(receipt.scrollWidth <= receipt.clientWidth + 2, `${label} should reflow without page-level horizontal scrolling (${receipt.scrollWidth}/${receipt.clientWidth}).`);
  assert(receipt.clippedControls.length === 0, `${label} button and disclosure text should remain available. ${receipt.clippedControls.join("; ")}`);
  assert(receipt.crampedSingleLineControls.length === 0, `${label} single-line controls should retain a readable text line. ${receipt.crampedSingleLineControls.join("; ")}`);
}

async function assertFocusable(page, selectors, label) {
  for (const selector of selectors) {
    const control = page.locator(selector).first();
    assert(await control.count() === 1, `${label} should expose ${selector}.`);
    assert(await control.isVisible(), `${label} should keep ${selector} visible.`);
    await control.focus();
    assert(await control.evaluate((element) => document.activeElement === element), `${label} should keep ${selector} keyboard-focusable.`);
  }
}

async function assertLocalScroller(page, selector, contentSelector, label) {
  const receipt = await page.locator(selector).evaluate((scroller, innerSelector) => {
    const content = innerSelector ? scroller.querySelector(innerSelector) : scroller.firstElementChild;
    const style = getComputedStyle(scroller);
    const start = scroller.scrollLeft;
    scroller.scrollLeft = scroller.scrollWidth;
    const end = scroller.scrollLeft;
    scroller.scrollLeft = start;
    return {
      overflowX: style.overflowX,
      clientWidth: scroller.clientWidth,
      scrollWidth: scroller.scrollWidth,
      contentWidth: content?.getBoundingClientRect().width || 0,
      end
    };
  }, contentSelector);
  assert(["auto", "scroll"].includes(receipt.overflowX), `${label} should own horizontal overflow locally.`);
  assert(receipt.contentWidth > 0, `${label} should retain chart content.`);
  if (receipt.scrollWidth > receipt.clientWidth + 2) {
    assert(receipt.end > 0, `${label} should permit access to the chart's far edge.`);
  } else {
    assert(receipt.contentWidth <= receipt.clientWidth + 2, `${label} should contain the chart when no local scroll range is needed.`);
  }
}

async function assertSkipLinkLifecycle(page, label) {
  const link = page.locator(".sc-skip-link");
  const read = () => link.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      active: document.activeElement === element,
      transform: getComputedStyle(element).transform,
      top: rect.top,
      bottom: rect.bottom
    };
  });
  const unfocused = await read();
  assert(unfocused.active === false && unfocused.bottom <= 0, `${label} skip link should stay fully offscreen while unfocused. ${JSON.stringify(unfocused)}`);
  await link.focus();
  const focused = await read();
  assert(focused.active === true && focused.top >= -1 && focused.bottom > 0, `${label} skip link should enter the viewport on keyboard focus. ${JSON.stringify(focused)}`);
  await link.evaluate((element) => element.blur());
  const blurred = await read();
  assert(blurred.active === false && blurred.bottom <= 0, `${label} skip link should return fully offscreen after blur. ${JSON.stringify(blurred)}`);
}

async function canonicalState(page) {
  return page.evaluate(() => window.strategyCanvasCanonical.getState());
}

async function contextState(page) {
  return page.evaluate(() => window.StrategyCanvasWorkbench.getState());
}

async function assertContextIdIntegrity(page, standing) {
  const receipt = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const chart = document.querySelector("#strategy-chart");
    const labelledBy = (chart?.getAttribute("aria-labelledby") || "").trim().split(/\s+/).filter(Boolean);
    const labelResolution = labelledBy.map((id) => ({ id, count: document.querySelectorAll(`[id="${CSS.escape(id)}"]`).length }));
    const printChart = document.querySelector("#print-report svg");
    return {
      duplicates,
      labelledBy,
      labelResolution,
      printReusesLiveChartIds: Boolean(printChart?.querySelector('[id="chart-title"], [id="chart-description"]'))
    };
  });
  assert(receipt.duplicates.length === 0, `${standing} Context document IDs should be unique. ${receipt.duplicates.join(", ")}`);
  assert(same(receipt.labelledBy, ["chart-title", "chart-description"]), `${standing} live chart should retain its exact accessible-name references.`);
  assert(receipt.labelResolution.every((reference) => reference.count === 1), `${standing} live chart references should each resolve exactly once. ${JSON.stringify(receipt.labelResolution)}`);
  assert(receipt.printReusesLiveChartIds === false, `${standing} print SVG should generate an independent ID namespace.`);
}

function packetPrivacyFindings(value, path = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (!Array.isArray(value)) {
    if (Object.hasOwn(value, "alias")) findings.push(`${path}.alias`);
    if (Object.hasOwn(value, "participantId")) findings.push(`${path}.participantId`);
    if (Array.isArray(value.participants) && value.participants.length) findings.push(`${path}.participants`);
    if (value.ballots && typeof value.ballots === "object" && Object.keys(value.ballots).length) findings.push(`${path}.ballots`);
    if (Array.isArray(value.participantIds) && value.participantIds.length) findings.push(`${path}.participantIds`);
    if (Array.isArray(value.events) && value.events.length) findings.push(`${path}.events`);
    const isAggregate = ["count", "mean", "median", "min", "max", "range", "missing", "values"].every((key) => Object.hasOwn(value, key));
    if (isAggregate && Array.isArray(value.values) && value.values.length) findings.push(`${path}.values`);
    if (value.channel === "human-ballot") findings.push(`${path}.channel`);
  }
  for (const [key, child] of Object.entries(value)) packetPrivacyFindings(child, Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`, findings);
  return findings;
}

function assertPacketRedaction(packet, { authorized, included, reviewedRevision, expectedNoteCount, privateMarkers }) {
  const receipt = packet.scopeReceipt;
  assert(receipt.policy === "local-redaction/v1", "AI packet should name its local redaction policy.");
  assert(receipt.reviewedStateAuthorized === authorized, "AI packet receipt should distinguish reviewed-state authorization.");
  assert(receipt.reviewedStateIncluded === included, "AI packet receipt should distinguish authorization from actual reviewed-state inclusion.");
  assert(receipt.reviewedRevision === reviewedRevision, "AI packet receipt should name only the included reviewed revision.");
  for (const label of [
    "participant aliases and roles",
    "participant stable identifiers",
    "per-participant ballot records",
    "individual ballot values",
    "raw aggregate value arrays",
    "local collaboration event ledger"
  ]) assert(receipt.heldLocal.includes(label), `AI packet should hold ${label} locally.`);
  assert(receipt.included.includes("dimension context and authored seed scores"), "AI packet should name retained dimension context.");
  assert(receipt.included.includes("aggregate count, missingness, and summary statistics"), "AI packet should name retained aggregate summaries.");
  const findings = packetPrivacyFindings(packet);
  assert(findings.length === 0, `AI packet should recursively hold private elicitation records locally. ${findings.join(", ")}`);
  for (const marker of privateMarkers) assert(!packet.handoff.includes(marker), `AI handoff should omit private participant marker ${marker}.`);
  const outerCollaboration = packet.state.extensions.contextCanvas.collaboration;
  const nestedCollaboration = packet.state.lifecycle.reviewedSnapshot?.extensions?.contextCanvas?.collaboration;
  assert(outerCollaboration.notes.length === expectedNoteCount, `AI packet should include exactly ${expectedNoteCount} consent-scoped outer note records.`);
  if (included) {
    assert(nestedCollaboration?.notes.length === expectedNoteCount, `Included reviewed snapshot should carry exactly ${expectedNoteCount} consent-scoped note records.`);
    assert(receipt.included.includes("notes attached to the authorized reviewed record") === (expectedNoteCount > 0), "Included note scope should be explicit in the receipt.");
    assert(receipt.heldLocal.includes("notes outside the authorized reviewed record and their authors") === (expectedNoteCount > 0), "Held-local note scope should identify notes outside the reviewed record.");
  } else {
    assert(packet.state.lifecycle.reviewedSnapshot === null, "Reserved reviewed state should stay outside an unauthorized packet.");
    assert(outerCollaboration.reviewedSnapshots.length === 0, "Reserved collaboration snapshots should stay outside an unauthorized packet.");
    assert(receipt.heldLocal.includes("all collaboration notes and their authors"), "Unauthorized packet should keep all collaboration notes local.");
  }
}

async function canonicalColumnGeometryContract(browser, url) {
  await verify("canonical · action bands, guides, factors, and handles share one column geometry", async () => {
    const { context, page, telemetry } = await openPage(browser, url, VIEWPORTS[1]);
    try {
      await page.locator('[data-sc-role="chart"] svg').waitFor({ state: "visible" });
      const receipt = await page.evaluate(() => {
        const svg = document.querySelector('[data-sc-role="chart"] svg');
        const dimensions = window.strategyCanvasCanonical.getState().view.dimensionOrder;
        const transformX = (element) => Number(element?.getAttribute("transform")?.match(/translate\(([-+\d.]+)/)?.[1]);
        const intersects = (left, right) => left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
        const numericTicks = [...svg.querySelectorAll(".sc-axis-label:not([data-scale-anchor])")].filter((element) => /^\d+(?:\.\d+)?$/.test(element.textContent.trim()));
        const firstHandles = [...svg.querySelectorAll(`[data-handle="true"][data-dimension-id="${CSS.escape(dimensions[0])}"]`)];
        const axisTitle = [...svg.querySelectorAll(".sc-axis-label")].find((element) => element.textContent.trim() === "Relative level of support");
        const anchorConflicts = [...svg.querySelectorAll("[data-scale-anchor]")].flatMap((anchor) => {
          const anchorRect = anchor.getBoundingClientRect();
          return [
            ...numericTicks.filter((tick) => intersects(anchorRect, tick.getBoundingClientRect())).map(() => `${anchor.dataset.scaleAnchor}:numeric-tick`),
            ...firstHandles.filter((handle) => intersects(anchorRect, handle.getBoundingClientRect())).map(() => `${anchor.dataset.scaleAnchor}:first-handle`),
            ...(axisTitle && intersects(anchorRect, axisTitle.getBoundingClientRect()) ? [`${anchor.dataset.scaleAnchor}:axis-title`] : [])
          ];
        });
        const records = dimensions.map((id) => {
          const action = svg.querySelector(`[data-action-band="${CSS.escape(id)}"]`);
          const rect = action.querySelector("rect");
          const actionLabel = action.querySelector(`[data-action-label="${CSS.escape(id)}"]`);
          const guide = svg.querySelector(`[data-dimension-guide="${CSS.escape(id)}"]`);
          const factor = svg.querySelector(`[data-factor-label="${CSS.escape(id)}"]`);
          const handles = [...svg.querySelectorAll(`[data-handle="true"][data-dimension-id="${CSS.escape(id)}"]`)];
          return {
            id,
            rectLeft: Number(rect.getAttribute("x")),
            rectRight: Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")),
            actionBottom: Number(rect.getAttribute("y")) + Number(rect.getAttribute("height")),
            actionX: Number(actionLabel.getAttribute("x")),
            guideX: Number(guide.getAttribute("x1")),
            plotTop: Number(guide.getAttribute("y1")),
            factorX: Number(factor.getAttribute("x")),
            handleXs: handles.map(transformX),
            hitRadius: Number(handles[0]?.querySelector(".sc-hit")?.getAttribute("r"))
          };
        });
        return { records, anchorConflicts };
      });
      const tolerance = 0.01;
      receipt.records.forEach((record, index) => {
        const center = (record.rectLeft + record.rectRight) / 2;
        for (const [name, value] of [["action", record.actionX], ["guide", record.guideX], ["factor", record.factorX], ...record.handleXs.map((value) => ["handle", value])]) {
          assert(Math.abs(value - center) <= tolerance, `${record.id} ${name} x should align to the shared column center (${value}/${center}).`);
        }
        assert(record.plotTop - record.actionBottom >= record.hitRadius + 12, `${record.id} plot should leave a readable vertical gutter between the action band and the largest handle halo.`);
        if (index) assert(Math.abs(record.rectLeft - receipt.records[index - 1].rectRight) <= tolerance, `${record.id} action band should meet the preceding column without drift.`);
      });
      const first = receipt.records[0];
      const last = receipt.records.at(-1);
      assert(first.handleXs[0] - first.hitRadius > first.rectLeft, "First canonical handle hit halo should clear the y-axis.");
      assert(last.handleXs[0] + last.hitRadius < last.rectRight, "Last canonical handle hit halo should clear the right plot edge.");
      assert(receipt.anchorConflicts.length === 0, `Qualitative scale anchors should stay in their own left gutter. ${receipt.anchorConflicts.join(", ")}`);
      assertTelemetry(telemetry);
    } finally {
      await context.close();
    }
  });
}

async function assertContextColumnGeometry(page) {
  const receipt = await page.evaluate(() => {
    const svg = document.querySelector("#strategy-chart");
    const dimensions = window.StrategyCanvasWorkbench.getState().view.dimensionOrder;
    const transformX = (element) => Number(element?.getAttribute("transform")?.match(/translate\(([-+\d.]+)/)?.[1]);
    return dimensions.map((id) => {
      const action = svg.querySelector(`[data-action-band="${CSS.escape(id)}"]`);
      const rect = action.querySelector("rect");
      const actionLabel = action.querySelector("text");
      const guide = svg.querySelector(`[data-dimension-guide="${CSS.escape(id)}"]`);
      const factor = svg.querySelector(`[data-factor-label="${CSS.escape(id)}"] .factor-label`);
      const handle = svg.querySelector(`[data-scenario-handle="${CSS.escape(id)}"]`);
      return {
        id,
        rectLeft: Number(rect.getAttribute("x")),
        rectRight: Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")),
        actionX: Number(actionLabel.getAttribute("x")),
        guideX: Number(guide.getAttribute("x1")),
        factorX: Number(factor.getAttribute("x")),
        handleX: transformX(handle),
        hitRadius: Number(handle?.querySelector(".point-hit")?.getAttribute("r"))
      };
    });
  });
  const tolerance = 0.01;
  receipt.forEach((record, index) => {
    const center = (record.rectLeft + record.rectRight) / 2;
    for (const [name, value] of [["action", record.actionX], ["guide", record.guideX], ["factor", record.factorX], ["scenario", record.handleX]]) {
      assert(Math.abs(value - center) <= tolerance, `${record.id} Context ${name} x should align to the shared column center (${value}/${center}).`);
    }
    if (index) assert(Math.abs(record.rectLeft - receipt[index - 1].rectRight) <= tolerance, `${record.id} Context action band should meet the preceding column without drift.`);
  });
  const first = receipt[0];
  const last = receipt.at(-1);
  assert(first.handleX - first.hitRadius > first.rectLeft, "First Context scenario hit halo should clear the y-axis.");
  assert(last.handleX + last.hitRadius < last.rectRight, "Last Context scenario hit halo should clear the right plot edge.");
}

async function canonicalViewportContract(browser, url) {
  for (const viewport of VIEWPORTS) {
    await verify(`canonical ${viewport.name} · layout, semantics, and telemetry`, async () => {
      const { context, page, telemetry } = await openPage(browser, url, viewport);
      try {
        await page.locator('[data-sc-role="chart"] svg').waitFor({ state: "visible" });
        await assertLayout(page, `Canonical ${viewport.name}`);
        const state = await canonicalState(page);
        const validation = await page.evaluate(() => window.strategyCanvasCanonical.getValidation());
        assert(await page.evaluate(() => Object.isFrozen(window.strategyCanvasCanonical)), "Canonical inspection boundary should be frozen.");
        assert(state.schemaVersion === "strategy-canvas/2.0", "Canonical state should use schema 2.0.");
        assert(validation.valid === true, `Canonical state should validate. ${(validation.errors || []).join(" ")}`);
        assert(state.dimensions.length === 6, "Canonical seed should provide six dimensions.");
        assert(await page.locator('[data-handle="true"][role="slider"]').count() === 18, "Canonical chart should expose three accessible handles per dimension.");
        assert(await page.locator('[data-score-input="true"]').count() === 18, "Canonical table should expose labelled native score controls.");
        assert(await page.locator('[data-dimension-field="consequenceWeight"]').count() === 6, "Canonical table should keep consequence weight separate.");
        assert(await page.locator('[data-sc-role="live"][aria-live="polite"]').count() === 1, "Canonical surface should use one settled live route.");
        await assertSkipLinkLifecycle(page, `Canonical ${viewport.name}`);
        await page.screenshot({ path: resolve(runDir, `canonical-${viewport.name}.png`), fullPage: true });
        assertTelemetry(telemetry);
      } finally {
        await context.close();
      }
    });
  }
}

async function canonicalInteractionContract(browser, url) {
  const { context, page, telemetry } = await openPage(browser, url, VIEWPORTS[1]);
  try {
    await page.locator('[data-sc-role="chart"] svg').waitFor({ state: "visible" });
    await verify("canonical · score, weight, keyboard, undo, and clone boundaries", async () => {
      const dimensionId = (await canonicalState(page)).dimensions[0].id;
      const score = page.locator(`[data-score-input][data-dimension-id="${dimensionId}"][data-series="current"]`);
      const weight = page.locator(`[data-dimension-field="consequenceWeight"][data-dimension-id="${dimensionId}"]`).first();
      await score.fill("6");
      await score.press("Tab");
      let state = await canonicalState(page);
      assert(state.dimensions[0].scores.current === 6, "Labelled score control should update the current value.");
      const handle = page.locator(`[data-handle][data-dimension-id="${dimensionId}"][data-series="current"]`);
      assert(await handle.getAttribute("aria-valuenow") === "6", "SVG handle should reflect the native score control.");
      const transformBeforeWeight = await handle.getAttribute("transform");
      await weight.fill("1");
      await weight.press("Tab");
      state = await canonicalState(page);
      assert(state.dimensions[0].consequenceWeight === 1, "Consequence weight should update its own field.");
      assert(state.dimensions[0].scores.current === 6, "Consequence weight should preserve the plotted score.");
      assert(await handle.getAttribute("transform") === transformBeforeWeight, "Consequence weight should preserve marker position.");
      await handle.focus();
      await handle.press("ArrowUp");
      state = await canonicalState(page);
      assert(state.dimensions[0].scores.current === 7, "Focused SVG handle should support arrow-key adjustment.");
      await page.locator('[data-action="undo"]').click();
      assert((await canonicalState(page)).dimensions[0].scores.current === 6, "Undo should restore the prior score.");
      const external = await page.evaluate(() => {
        const copy = window.strategyCanvasCanonical.getState();
        copy.meta.title = "mutated outside";
        return window.strategyCanvasCanonical.getState().meta.title;
      });
      assert(external !== "mutated outside", "Public state should be cloned rather than exposing mutable internals.");
    });
    await verify("canonical · text renders literally and lifecycle preserves reviewed state", async () => {
      const probe = '<img id="canonical-injection-probe" src="x" onerror="window.__canonicalProbe=1">';
      await page.evaluate(() => { window.__canonicalProbe = 0; });
      const label = page.locator('[data-dimension-field="label"]').first();
      await label.fill(probe);
      await label.press("Tab");
      assert(await page.locator("#canonical-injection-probe").count() === 0, "Dimension labels should render as text rather than markup.");
      assert(await page.evaluate(() => window.__canonicalProbe) === 0, "Dimension labels should execute no injected handler.");
      assert((await canonicalState(page)).dimensions[0].label === probe, "State should preserve markup-like text literally.");
      await page.locator('[data-reviewer="true"]').fill("Facilitation group");
      await page.locator('[data-review-note="true"]').fill("Anchors and thresholds reviewed together.");
      await page.locator('[data-action="review"]').click();
      const reviewed = await canonicalState(page);
      assert(reviewed.lifecycle.status === "reviewed", "Review should create a stable reviewed state.");
      assert(reviewed.lifecycle.reviewedSnapshot?.dimensions?.length === reviewed.dimensions.length, "Reviewed state should carry a complete snapshot.");
      assert(await page.locator('[data-score-input="true"]').first().isDisabled(), "Reviewed state should lock editing controls.");
      await page.locator('[data-action="reopen"]').click();
      const reopened = await canonicalState(page);
      assert(reopened.lifecycle.status === "working" && reopened.meta.revision === reviewed.meta.revision + 1, "Reopen should begin the next working revision.");
      assert(reopened.lifecycle.reviewedSnapshot, "Reopen should preserve the reviewed snapshot.");
    });
    await verify("canonical · presentation, reduced-motion, forced-colors, and print", async () => {
      await page.locator('[data-action="toggle-mode"]').click();
      assert((await canonicalState(page)).view.mode === "presentation", "Presentation action should update state.");
      assert(await page.locator("body").getAttribute("data-view-mode") === "presentation", "Presentation state should reach the rendered surface.");
      await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
      assert(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), "Reduced motion should be available to the surface.");
      assert(await page.evaluate(() => matchMedia("(forced-colors: active)").matches), "Forced colors should be available to the surface.");
      await page.emulateMedia({ media: "print" });
      assert(await page.locator('[data-sc-role="text-equivalent"] table').isVisible(), "Print should preserve the semantic table.");
      assertTelemetry(telemetry);
    });
  } finally {
    await context.close();
  }
}

async function canonicalExchangeRecoveryContract(browser, url) {
  await verify("canonical · facilitator edits a score, reads the JSON export, and retains the working revision after malformed import", async () => {
    const { context, page, telemetry } = await openPage(browser, url, VIEWPORTS[1]);
    try {
      await page.locator('[data-sc-role="chart"] svg').waitFor({ state: "visible" });
      // A facilitator changes a labelled score; the visible export carries that edit, and import feedback returns them to the same usable working state.
      const initial = await canonicalState(page);
      assert(initial.lifecycle.status === "working", "The facilitator should begin from an editable working revision.");
      const dimension = initial.dimensions[0];
      const score = page.locator(`[data-score-input="true"][data-dimension-id="${dimension.id}"][data-series="current"]`);
      assert(await score.isVisible(), "The working revision should expose its labelled current-score control.");
      const raised = Math.min(initial.scale.max, dimension.scores.current + initial.scale.step * 2);
      const target = raised === dimension.scores.current
        ? Math.max(initial.scale.min, dimension.scores.current - initial.scale.step * 2)
        : raised;
      await score.fill(String(target));
      await score.press("Tab");

      const edited = await canonicalState(page);
      assert(edited.dimensions[0].scores.current === target, "The labelled score edit should reach the working state.");
      const jsonOutput = page.locator('[data-sc-role="json"]');
      assert(await jsonOutput.isVisible(), "The current JSON export should remain visible beside the working surface.");
      const exported = JSON.parse(await jsonOutput.textContent());
      assert(exported.dimensions[0].scores.current === target, "The visible JSON export should carry the facilitator's score edit.");
      assert(same(exported, edited), "The visible JSON export should describe the edited working state.");

      const importInput = page.locator('[data-sc-role="import"]');
      await importInput.evaluate((input) => { input.closest("details").open = true; });
      await importInput.fill('{"schemaVersion":');
      await page.locator('[data-action="import"]').click();
      await page.waitForFunction(() => document.querySelector('[data-sc-role="live"]')?.textContent.includes("Import needs attention:"));

      const recovered = await canonicalState(page);
      assert(same(recovered, edited), "Malformed input should retain the edited working state.");
      assert(await score.isEnabled(), "Recovery should keep the labelled score control available.");
      assert(await score.inputValue() === String(target), "Recovery should keep the edited score visible and usable.");
      assert(same(JSON.parse(await jsonOutput.textContent()), exported), "Recovery should retain the edited JSON export.");
      assertTelemetry(telemetry);
    } finally {
      await context.close();
    }
  });
}

async function canonicalImportBoundaryContract(browser, url) {
  await verify("canonical · malformed, oversized, deep, and high-node imports fail locally with state intact", async () => {
    const { context, page, telemetry } = await openPage(browser, url, VIEWPORTS[1]);
    try {
      await page.locator('[data-sc-role="chart"] svg').waitFor({ state: "visible" });
      await page.locator('[data-sc-role="import"]').evaluate((input) => { input.closest("details").open = true; });
      const before = await canonicalState(page);
      const cases = [
        { id: "malformed", text: '{"schemaVersion":', expected: "Import needs attention:" },
        { id: "oversized", text: JSON.stringify({ payload: "x".repeat(512 * 1024) }), expected: "512 KiB local review boundary" },
        { id: "deep", text: (() => { let value = "leaf"; for (let index = 0; index < 40; index += 1) value = { child: value }; return JSON.stringify(value); })(), expected: "32-level local review boundary" },
        { id: "high-node", text: JSON.stringify({ values: Array.from({ length: 20001 }, () => 0) }), expected: "20,000-value local review boundary" }
      ];
      for (const testCase of cases) {
        await page.locator('[data-sc-role="import"]').evaluate((input, value) => { input.value = value; }, testCase.text);
        await page.locator('[data-action="import"]').click();
        await page.locator('[data-sc-role="live"]').waitFor({ state: "attached" });
        await page.waitForFunction((expected) => document.querySelector('[data-sc-role="live"]')?.textContent.includes(expected), testCase.expected);
        assert(same(await canonicalState(page), before), `${testCase.id} import should leave canonical state unchanged.`);
      }
      assertTelemetry(telemetry);
    } finally {
      await context.close();
    }
  });
}

async function canonicalZoomContract(browser, url) {
  for (const profile of ZOOM_PROFILES) {
    await verify(`canonical · ${profile.name} zoom and reflow`, async () => {
      const { context, page, telemetry } = await openPage(browser, url, profile);
      try {
        await page.locator('[data-sc-role="chart"] svg').waitFor({ state: "visible" });
        await assertZoomContainment(page, `Canonical ${profile.name}`);
        await assertLocalScroller(page, ".sc-chart-frame", '[data-sc-role="chart"] svg', `Canonical ${profile.name} chart frame`);
        await assertFocusable(page, [
          '[data-action="toggle-mode"]',
          ".sc-chart-frame",
          '[data-score-input="true"]'
        ], `Canonical ${profile.name}`);
        const table = page.locator('[data-sc-role="text-equivalent"] table');
        assert(await table.isVisible(), `Canonical ${profile.name} should retain a visible text and table equivalent.`);
        assert(await table.locator("tbody tr").count() === 6, `Canonical ${profile.name} table should retain all six dimensions.`);
        assert((await table.locator("thead").innerText()).trim().length > 24, `Canonical ${profile.name} table should retain readable column labels.`);
        assert((await table.locator("tbody tr").first().innerText()).trim().length > 48, `Canonical ${profile.name} table should retain dimension anchors and evidence text.`);
        await page.screenshot({ path: resolve(runDir, `canonical-zoom-${profile.name.replace("%", "")}.png`), fullPage: true });
        assertTelemetry(telemetry);
      } finally {
        await context.close();
      }
    });
  }
}

async function canonicalMountFailureContract(browser, url) {
  await verify("canonical · mount failure preserves the semantic static baseline", async () => {
    const context = await browser.newContext({ viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height } });
    const page = await context.newPage();
    const telemetry = monitor(page);
    try {
      await page.addInitScript(() => {
        Object.defineProperty(window, "StrategyCanvasCanonical", {
          configurable: true,
          get() {
            return Object.freeze({ mount() { throw new Error("forced canonical mount failure"); } });
          },
          set(value) { window.__strategyCanvasRealController = value; }
        });
      });
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const baseline = page.locator('[data-sc-role="static-baseline"]');
      assert(await baseline.isVisible(), "A failed mount should leave the semantic baseline visible.");
      assert(await baseline.locator("svg").isVisible(), "The retained baseline should include the complete static chart.");
      assert(await baseline.locator("tbody tr").count() === 6, "The retained baseline should include all six exact-value rows.");
      assert(await page.locator(".sc-workbench").isHidden(), "Unmounted interactive controls should stay unavailable.");
      assert(await page.locator("#strategy-canvas-root").getAttribute("data-sc-enhancement-state") === "static", "A failed mount should publish static enhancement standing.");
      assert(await page.locator('[data-sc-role="skip-link"]').getAttribute("href") === "#strategy-canvas-static", "The failure-safe skip link should continue to target the static reading.");
      assert(await page.evaluate(() => window.strategyCanvasCanonical) === undefined, "A failed mount should publish no interactive inspection boundary.");
      assertTelemetry(telemetry);
    } finally {
      await context.close();
    }
  });
}

async function schemaNegativeContract(browser, url) {
  const fixture = JSON.parse(await readFile(resolve(SCHEMA_NEGATIVE_FIXTURE), "utf8"));
  const base = JSON.parse(await readFile(resolve("planning/context-canvas/strategy-canvas/fixtures", fixture.baseFixture), "utf8"));
  await verify("shared schema boundary · published nested constraints reject every negative fixture", async () => {
    const { context, page, telemetry } = await openPage(browser, url, VIEWPORTS[0]);
    try {
      const receipt = await page.evaluate(({ baseState, cases }) => {
        const materialize = (value) => value && typeof value === "object" && "$repeat" in value
          ? String(value.$repeat).repeat(value.count)
          : value;
        const pointerTokens = (pointer) => pointer.slice(1).split("/").map((token) => token.replace(/~1/g, "/").replace(/~0/g, "~"));
        const applyCase = (state, testCase) => {
          const tokens = pointerTokens(testCase.path);
          const key = tokens.pop();
          let target = state;
          for (const token of tokens) target = target[token];
          if (testCase.operation === "delete") delete target[key];
          else target[key] = materialize(testCase.value);
        };
        const baseValidation = globalThis.StrategyCanvasCore.validateState(baseState);
        const results = cases.map((testCase) => {
          const state = structuredClone(baseState);
          applyCase(state, testCase);
          return { id: testCase.id, expected: testCase.expected, validation: globalThis.StrategyCanvasCore.validateState(state) };
        });
        return { baseValidation, results };
      }, { baseState: base, cases: fixture.cases });
      assert(receipt.baseValidation.valid === true, `The negative suite base fixture should validate. ${(receipt.baseValidation.errors || []).join(" ")}`);
      for (const result of receipt.results) {
        assert(result.validation.valid === false, `${result.id} should be rejected by the published contract.`);
        assert(result.validation.errors.some((error) => error.includes(result.expected)), `${result.id} should report ${result.expected}. ${result.validation.errors.join(" ")}`);
      }
      assertTelemetry(telemetry);
    } finally {
      await context.close();
    }
  });
}

async function noJavaScriptContract(browser, url, kind) {
  const { context, page, telemetry } = await openPage(browser, url, VIEWPORTS[0], { javaScriptEnabled: false });
  try {
    await verify(`${kind} · no-JavaScript complete reading surface`, async () => {
      if (kind === "canonical") {
        assert(await page.locator(".sc-static-twin").isVisible(), "Canonical static twin should remain visible.");
        assert(await page.locator(".sc-static-twin tbody tr").count() === 6, "Canonical static twin should retain all six dimensions.");
      } else {
        assert(await page.locator(".static-field").isVisible(), "Context static field should remain visible.");
        assert(await page.locator(".static-field tbody tr").count() === 6, "Context static field should retain all six starting dimensions.");
      }
      const receipt = await layoutReceipt(page);
      assert(receipt.scrollWidth <= receipt.clientWidth + 2, `${kind} no-JavaScript surface should contain document width.`);
      assertTelemetry(telemetry);
    });
  } finally {
    await context.close();
  }
}

async function contextViewportContract(browser, url) {
  for (const viewport of VIEWPORTS) {
    await verify(`Context workbench ${viewport.name} · layout, channels, and telemetry`, async () => {
      const { context, page, telemetry } = await openPage(browser, url, viewport);
      try {
        await page.locator("#strategy-field").waitFor({ state: "visible" });
        await assertLayout(page, `Context ${viewport.name}`);
        const state = await contextState(page);
        const validation = await page.evaluate(() => window.StrategyCanvasWorkbench.getValidation());
        assert(await page.evaluate(() => Object.isFrozen(window.StrategyCanvasWorkbench)), "Context inspection boundary should be frozen.");
        assert(validation.valid === true, `Context state should validate. ${(validation.errors || []).join(" ")}`);
        assert(state.extensions?.contextCanvas?.collaboration, "Context state should use the contextCanvas collaboration namespace.");
        assert(state.extensions?.contextCanvas?.aiCollaboration, "Context state should use the contextCanvas AI namespace.");
        assert(await page.locator("[data-phase-link]").count() === 8, "Workbench should expose eight collaboration phases.");
        assert(await page.locator('[role="status"][aria-live]').count() === 1, "Workbench should use one settled live status route.");
        assert(await page.locator('#strategy-chart[role="group"]').count() === 1, "Interactive SVG should be a named group rather than an image role.");
        await assertContextIdIntegrity(page, `Mounted ${viewport.name}`);
        await page.screenshot({ path: resolve(runDir, `context-${viewport.name}.png`), fullPage: true });
        assertTelemetry(telemetry);
      } finally {
        await context.close();
      }
    });
  }
}

async function contextZoomContract(browser, url) {
  for (const profile of ZOOM_PROFILES) {
    await verify(`Context workbench · ${profile.name} zoom and reflow`, async () => {
      const { context, page, telemetry } = await openPage(browser, url, profile);
      try {
        await page.locator("#strategy-field").waitFor({ state: "visible" });
        await assertZoomContainment(page, `Context ${profile.name}`);
        await assertLocalScroller(page, "#chart-scroll", "#strategy-chart", `Context ${profile.name} chart frame`);
        await assertFocusable(page, [
          '[data-phase-link="orient"]',
          "#chart-scroll",
          ".data-table-disclosure > summary"
        ], `Context ${profile.name}`);
        await page.locator(".data-table-disclosure").evaluate((details) => { details.open = true; });
        const table = page.locator("#semantic-table table");
        assert(await table.isVisible(), `Context ${profile.name} should expose the complete semantic table on request.`);
        assert(await table.locator("tbody tr").count() === 6, `Context ${profile.name} table should retain all six dimensions.`);
        assert((await table.locator("caption").innerText()).trim().length > 16, `Context ${profile.name} table should retain a readable caption.`);
        await page.screenshot({ path: resolve(runDir, `context-zoom-${profile.name.replace("%", "")}.png`), fullPage: true });
        assertTelemetry(telemetry);
      } finally {
        await context.close();
      }
    });
  }
}

async function sealNextBallot(page, offset) {
  await page.locator('[data-action="open-private-turn"]').click();
  const form = page.locator("#ballot-form");
  await form.waitFor({ state: "visible" });
  const inputs = form.locator('input[type="number"]');
  const count = await inputs.count();
  for (let index = 0; index < count; index += 1) {
    await inputs.nth(index).fill(String(Math.min(10, 2 + offset + index)));
  }
  await form.locator('button[type="submit"]').click();
}

async function contextCollaborationContract(browser, url) {
  const { context, page, telemetry } = await openPage(browser, url, VIEWPORTS[1]);
  try {
    await page.locator("#strategy-field").waitFor({ state: "visible" });
    await verify("Context · SVG dimension routes support keyboard activation and focus continuity", async () => {
      const route = page.locator('#strategy-chart [data-select-dimension][role="button"]');
      assert(await route.count() >= 3, "The live SVG should expose multiple dimension routes.");
      const enterTarget = await route.nth(1).getAttribute("data-select-dimension");
      await route.nth(1).focus();
      await route.nth(1).press("Enter");
      assert((await contextState(page)).view.selectedDimensionId === enterTarget, "Enter should select the focused SVG dimension route.");
      assert(await page.evaluate((id) => document.activeElement?.getAttribute("data-select-dimension") === id, enterTarget), "Enter selection should restore focus to the selected SVG route after render.");
      const spaceRoute = page.locator('#strategy-chart [data-select-dimension][role="button"]').nth(2);
      const spaceTarget = await spaceRoute.getAttribute("data-select-dimension");
      await spaceRoute.focus();
      await spaceRoute.press("Space");
      assert((await contextState(page)).view.selectedDimensionId === spaceTarget, "Space should select the focused SVG dimension route.");
      assert(await page.evaluate((id) => document.activeElement?.getAttribute("data-select-dimension") === id, spaceTarget), "Space selection should restore focus to the selected SVG route after render.");
      assertTelemetry(telemetry);
    });
    await verify("Context · private ballots remain concealed until explicit reveal", async () => {
      await page.locator('[data-phase-link="vote"]').click();
      assert((await page.evaluate(() => window.StrategyCanvasWorkbench.getChannels())).systemDerivedAggregates && Object.keys(await page.evaluate(() => window.StrategyCanvasWorkbench.getChannels().systemDerivedAggregates)).length === 0, "Aggregates should stay unavailable before reveal.");
      for (const offset of [0, 2, 4]) await sealNextBallot(page, offset);
      let channels = await page.evaluate(() => window.StrategyCanvasWorkbench.getChannels());
      const ballotRounds = Object.values(channels.humanBallots);
      assert(ballotRounds.length === 1 && Object.keys(ballotRounds[0]).length === 3, "Three human ballots should be sealed in the active round.");
      assert(Object.keys(channels.systemDerivedAggregates).length === 0, "Sealed ballots should remain concealed before reveal.");
      await page.locator('[data-phase-link="reveal"]').click();
      await page.locator('[data-action="reveal-round"]').click();
      channels = await page.evaluate(() => window.StrategyCanvasWorkbench.getChannels());
      assert(Object.keys(channels.systemDerivedAggregates).length === 6, "Reveal should expose a system-derived aggregate for each dimension.");
      for (const aggregate of Object.values(channels.systemDerivedAggregates)) {
        assert(aggregate.count === 3 && aggregate.missing === 0, "Aggregate should disclose three readings and zero missing values.");
        assert(Number.isFinite(aggregate.mean) && Number.isFinite(aggregate.median) && Number.isFinite(aggregate.range), "Aggregate should carry center and spread together.");
      }
    });
    await verify("Context · scenario shaping preserves the human aggregate", async () => {
      const aggregateBefore = await page.evaluate(() => window.StrategyCanvasWorkbench.getChannels().systemDerivedAggregates);
      await page.locator('[data-phase-link="shape"]').click();
      // Use the final dimension: the first point shares the same left anchor
      // even when render and drag geometry disagree, so it cannot guard the
      // right-edge plot bound that keeps pointer movement x-invariant.
      const handle = page.locator("#strategy-chart [data-scenario-handle]").last();
      await handle.waitFor({ state: "visible" });
      await assertContextColumnGeometry(page);
      await handle.scrollIntoViewIfNeeded();
      const dimensionId = await handle.getAttribute("data-scenario-handle");
      const boxBeforeDrag = await handle.boundingBox();
      assert(boxBeforeDrag, "Scenario handle should expose rendered pointer geometry.");
      const xBeforeDrag = boxBeforeDrag.x + boxBeforeDrag.width / 2;
      const yBeforeDrag = boxBeforeDrag.y + boxBeforeDrag.height / 2;
      const valueBeforeDrag = Number(await handle.getAttribute("aria-valuenow"));
      await page.mouse.move(xBeforeDrag, yBeforeDrag);
      await page.mouse.down();
      await page.mouse.move(xBeforeDrag, yBeforeDrag + 58, { steps: 4 });
      await page.mouse.up();
      const draggedHandle = page.locator(`#strategy-chart [data-scenario-handle="${dimensionId}"]`);
      const boxAfterDrag = await draggedHandle.boundingBox();
      assert(boxAfterDrag, "Dragged scenario handle should retain rendered geometry.");
      const xAfterDrag = boxAfterDrag.x + boxAfterDrag.width / 2;
      const valueAfterDrag = Number(await draggedHandle.getAttribute("aria-valuenow"));
      assert(Math.abs(xAfterDrag - xBeforeDrag) <= 1.5, `Pointer drag should preserve the selected dimension x coordinate (${xBeforeDrag.toFixed(2)} → ${xAfterDrag.toFixed(2)}).`);
      assert(valueAfterDrag !== valueBeforeDrag, "Vertical pointer drag should update the selected scenario value.");
      await handle.focus();
      const scenarioBefore = await page.evaluate(() => window.StrategyCanvasWorkbench.getChannels().workingScenarios.at(-1));
      await handle.press("ArrowUp");
      const scenarioAfter = await page.evaluate(() => window.StrategyCanvasWorkbench.getChannels().workingScenarios.at(-1));
      const aggregateAfter = await page.evaluate(() => window.StrategyCanvasWorkbench.getChannels().systemDerivedAggregates);
      assert(!same(scenarioBefore.values, scenarioAfter.values), "Scenario handle should change the working scenario.");
      assert(same(aggregateBefore, aggregateAfter), "Scenario shaping should preserve the revealed human aggregate.");
      await page.locator('[data-action="return-scenario"]').click();
      const returned = await page.evaluate(() => window.StrategyCanvasWorkbench.getChannels().workingScenarios.at(-1));
      const meanMap = Object.fromEntries(Object.entries(aggregateAfter).map(([id, value]) => [id, Math.round(value.mean * 10) / 10]));
      assert(same(returned.values, meanMap), "Return should restore the scenario to the group mean curve.");
    });
    await verify("Context · AI shadow remains attributed and outside the human aggregate", async () => {
      const aggregateBefore = await page.evaluate(() => window.StrategyCanvasWorkbench.getChannels().systemDerivedAggregates);
      await page.locator('[data-phase-link="reveal"]').click();
      await page.locator('[data-action="prepare-ai-shadow"]').click();
      await page.locator("#ai-proposal-value").fill("9");
      await page.locator("#ai-proposal-note").fill("Attributed test proposal");
      await page.locator('[data-action="record-ai-proposal"]').click();
      const channels = await page.evaluate(() => window.StrategyCanvasWorkbench.getChannels());
      assert(Object.values(channels.aiAttributedProposals).includes(9), "AI shadow should retain an attributed proposal value.");
      assert(same(aggregateBefore, channels.systemDerivedAggregates), "AI proposal should preserve the human aggregate.");
      const state = await contextState(page);
      assert(state.extensions.contextCanvas.aiCollaboration.standing === "AI-attributed proposal", "AI proposal should preserve written standing.");
    });
    await verify("Context · reviewed handoff follows explicit scope authorization", async () => {
      const readReport = () => page.locator("#print-report").evaluate((report) => ({
        standing: report.dataset.reportStanding,
        revision: Number(report.dataset.reportRevision),
        source: report.dataset.reportSource,
        title: report.querySelector("h1")?.textContent.trim(),
        receipt: report.querySelector("[data-report-receipt]")?.textContent.trim(),
        rows: [...report.querySelectorAll("tbody tr")].map((row) => [...row.children].map((cell) => cell.textContent.trim()))
      }));
      const expectedReviewedRows = (snapshot) => {
        const contextExtension = snapshot.extensions.contextCanvas;
        const record = contextExtension.collaboration.reviewedSnapshots.at(-1);
        const scenario = record.scenario;
        const proposals = contextExtension.aiCollaboration.proposals;
        const byId = new Map(snapshot.dimensions.map((dimension) => [dimension.id, dimension]));
        const rounded = (value) => String(Math.round(value * 10) / 10);
        const actions = { eliminate: "Eliminate", reduce: "Reduce", raise: "Raise", create: "Create", hold: "Hold", open: "Open" };
        return snapshot.view.dimensionOrder.map((id) => {
          const dimension = byId.get(id);
          const aggregate = record.aggregates[id];
          return [
            dimension.label,
            String(dimension.scores.current),
            String(dimension.scores.goodEnough),
            String(dimension.scores.desired),
            Number.isFinite(aggregate?.mean) ? rounded(aggregate.mean) : "Open",
            Number.isFinite(aggregate?.median) ? `${rounded(aggregate.median)} / ${rounded(aggregate.range)}` : "Open",
            Number.isFinite(scenario?.values?.[id]) ? rounded(scenario.values[id]) : "Open",
            Number.isFinite(proposals[id]) ? rounded(proposals[id]) : "Open",
            actions[dimension.action]
          ];
        });
      };
      await page.locator('[data-phase-link="review"]').click();
      await page.locator("#note-author").fill("Cross-functional review group");
      await page.locator("#note-body").fill("Carry this evidence note with the reviewed record when note scope is explicitly authorized.");
      await page.locator('#note-form button[type="submit"]').click();
      await page.locator("#note-author").fill("Cross-functional review group");
      const reviewedReceipt = "Carry the scenario into a bounded pilot and revisit after the evidence receipt.";
      await page.locator("#decision-receipt").fill(reviewedReceipt);
      await page.locator('[data-action="review-revision"]').click();
      let state = await contextState(page);
      assert(state.extensions.contextCanvas.collaboration.reviewedSnapshots.length === 1, "Review should create a collaboration snapshot.");
      const reviewedState = state;
      const privateMarkers = reviewedState.extensions.contextCanvas.collaboration.participants.flatMap((participant) => [participant.id, participant.alias]);
      const reviewedSnapshot = JSON.stringify(reviewedState.lifecycle.reviewedSnapshot);
      const reviewedReport = await readReport();
      assert(reviewedReport.standing === "reviewed" && reviewedReport.source === "lifecycle-reviewed-snapshot", "A reviewed report should name the lifecycle snapshot as its source.");
      assert(reviewedReport.revision === reviewedState.lifecycle.reviewedSnapshot.meta.revision, "A reviewed report should name the snapshot revision.");
      assert(reviewedReport.title === reviewedState.lifecycle.reviewedSnapshot.meta.title && reviewedReport.receipt === reviewedReceipt, "Reviewed title and receipt should come from the lifecycle snapshot.");
      assert(same(reviewedReport.rows, expectedReviewedRows(reviewedState.lifecycle.reviewedSnapshot)), "Every reviewed report row should derive from the same lifecycle snapshot and review record.");
      await assertContextIdIntegrity(page, "Reviewed");
      await page.locator('[data-phase-link="orient"]').click();
      state = await contextState(page);
      assert(state.lifecycle.status === "reviewed" && state.meta.revision === reviewedState.meta.revision, "Phase selection should preserve reviewed standing and revision.");
      assert(same(await readReport(), reviewedReport), "A transport-only phase change should leave the reviewed report pinned to its lifecycle snapshot.");
      await page.locator('[data-phase-link="review"]').click();
      const revisedReceipt = "Carry the bounded pilot forward; review the evidence receipt at the next decision point.";
      await page.locator("#decision-receipt").fill(revisedReceipt);
      await page.locator("#decision-receipt").press("Tab");
      state = await contextState(page);
      assert(state.lifecycle.status === "working", "Editing the decision receipt should reopen reviewed Context state.");
      assert(state.meta.revision === reviewedState.meta.revision + 1, "The first post-review receipt edit should increment the revision exactly once.");
      assert(JSON.stringify(state.lifecycle.reviewedSnapshot) === reviewedSnapshot, "Reopening should preserve the reviewed snapshot byte for byte.");
      assert(state.extensions.contextCanvas.collaboration.session.decisionReceipt === revisedReceipt, "The reopened working state should carry the current decision receipt.");
      const workingReport = await readReport();
      assert(workingReport.standing === "working" && workingReport.source === "current-working-state", "The reopened report should name current working state as its source.");
      assert(workingReport.revision === state.meta.revision && workingReport.receipt === revisedReceipt, "The working report should carry the reopened revision and current receipt.");
      const stableSemanticCore = (candidate) => ({
        schemaVersion: candidate.schemaVersion,
        meta: { ...candidate.meta, revision: undefined },
        method: candidate.method,
        scale: candidate.scale,
        dimensions: candidate.dimensions,
        view: candidate.view
      });
      assert(same(stableSemanticCore(state), stableSemanticCore(reviewedState)), "The receipt edit should preserve the core semantic field.");
      let packet = await page.evaluate(() => window.StrategyCanvasWorkbench.exportPacket("cross-platform"));
      assert(packet.validation.valid === true, "Export packet should remain schema-valid.");
      assert(packet.state.extensions.contextCanvas.collaboration.reviewedSnapshots.length === 0, "Reviewed state should remain reserved until explicitly authorized.");
      assertPacketRedaction(packet, { authorized: false, included: false, reviewedRevision: null, expectedNoteCount: 0, privateMarkers });
      await page.locator('[data-phase-link="handoff"]').click();
      await page.locator("#include-reviewed-state").check();
      packet = await page.evaluate(() => window.StrategyCanvasWorkbench.exportPacket("cross-platform"));
      assert(packet.validation.valid === true, `Authorized export packet should remain schema-valid. ${(packet.validation.errors || []).join(" ")}`);
      assert(packet.state.extensions.contextCanvas.collaboration.reviewedSnapshots.length === 1, "Authorized packet should include the reviewed snapshot.");
      assert(packet.state.meta.revision === reviewedState.meta.revision + 1, "The authorized packet should retain the outer working revision.");
      assert(packet.state.extensions.contextCanvas.aiCollaboration.reviewedRevision === packet.state.lifecycle.reviewedSnapshot.meta.revision, "Reviewed-state consent should name the reviewed snapshot revision as provenance.");
      assert(packet.state.extensions.contextCanvas.aiCollaboration.reviewedRevision === reviewedState.meta.revision, "Reviewed-state consent should refer to reviewed revision N while the working artifact is revision N+1.");
      assertPacketRedaction(packet, { authorized: true, included: true, reviewedRevision: reviewedState.meta.revision, expectedNoteCount: 1, privateMarkers });
      assert(packet.handoff.includes("AI-attributed proposals are a separate proposal channel"), "Handoff should preserve the channel contract.");
    });
    await verify("Context · a fresh starter pack preserves historical review receipts", async () => {
      const before = await contextState(page);
      const priorReceipt = JSON.stringify(before.extensions.contextCanvas.collaboration.reviewedSnapshots.at(-1));
      assert(priorReceipt, "The pack transition should begin with a historical reviewed receipt.");
      await page.locator('[data-phase-link="define"]').click();
      await page.locator("#dimension-pack").selectOption("education");
      await page.locator('[data-action="preview-pack"]').click();
      await page.locator('[data-action="use-pack"]').click();
      const after = await contextState(page);
      const validation = await page.evaluate(() => window.StrategyCanvasWorkbench.getValidation());
      assert(validation.valid === true, `A fresh pack should validate while preserving history. ${(validation.errors || []).join(" ")}`);
      assert(after.lifecycle.status === "working", "A fresh pack should open a working revision.");
      assert(JSON.stringify(after.extensions.contextCanvas.collaboration.reviewedSnapshots.at(-1)) === priorReceipt, "A fresh pack should preserve the prior reviewed receipt byte for byte.");
      const currentIds = new Set(after.dimensions.map((dimension) => dimension.id));
      const historicalIds = after.extensions.contextCanvas.collaboration.reviewedSnapshots.at(-1).dimensionIds;
      assert(historicalIds.some((id) => !currentIds.has(id)), "The regression should exercise historical dimension IDs outside the new active field.");
      assertTelemetry(telemetry);
    });
    await verify("Context · user-authored text stays literal", async () => {
      const probe = '<img id="context-injection-probe" src="x" onerror="window.__contextProbe=1">';
      await page.evaluate(() => { window.__contextProbe = 0; });
      await page.locator('[data-phase-link="orient"]').click();
      await page.locator("#session-title-input").fill(probe);
      await page.locator("#session-title-input").press("Tab");
      assert(await page.locator("#context-injection-probe").count() === 0, "Context rendering should create no markup node from session text.");
      assert(await page.evaluate(() => window.__contextProbe) === 0, "Context rendering should execute no injected handler.");
      assert((await contextState(page)).meta.title === probe, "Context state should preserve markup-like text literally.");
      assertTelemetry(telemetry);
    });
  } finally {
    await context.close();
  }
}

async function contextMediaContract(browser, url) {
  const { context, page, telemetry } = await openPage(browser, url, VIEWPORTS[2]);
  try {
    await page.locator("#strategy-field").waitFor({ state: "visible" });
    await verify("Context · presentation, reduced-motion, forced-colors, and print", async () => {
      await page.locator('[data-action="presentation"]').click();
      assert((await contextState(page)).view.mode === "presentation", "Presentation control should update state.");
      const handles = await page.locator("[data-scenario-handle]").count();
      if (handles) {
        const box = await page.locator("[data-scenario-handle]").first().boundingBox();
        assert(box && box.width >= 60 && box.height >= 60, "Presentation scenario handle should stay room-scale.");
      }
      await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
      assert(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), "Context surface should receive reduced-motion preference.");
      assert(await page.evaluate(() => matchMedia("(forced-colors: active)").matches), "Context surface should receive forced-colors mode.");
      await page.screenshot({ path: resolve(runDir, "context-room-forced-colors.png"), fullPage: true });
      await page.emulateMedia({ media: "print" });
      assert(await page.locator("#print-report").isVisible(), "Print should preserve the reviewed collaboration sheet.");
      assertTelemetry(telemetry);
    });
  } finally {
    await context.close();
  }
}

async function compatibilityContract(browser, origin) {
  const routes = [
    "core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-chimeric-prototype-v0.1.1.html",
    "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/strategy-canvas-chimeric-prototype-v0.1.1.html",
    "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/narrative-capsule-composer/companions/strategy-canvas-chimeric-prototype-v0.1.1.html"
  ];
  for (const route of routes) {
    await verify(`compatibility route · ${route}`, async () => {
      const { context, page, telemetry } = await openPage(browser, `${origin}/${route}`, VIEWPORTS[0]);
      try {
        const redirected = page.url().endsWith("strategy-canvas-chimeric-prototype-v0.2.1.html");
        const link = page.locator('a[href*="strategy-canvas-chimeric-prototype-v0.2.1.html"]').first();
        const linkVisible = await link.isVisible().catch(() => false);
        assert(redirected || linkVisible, "Compatibility route should redirect or expose a direct current-version link.");
        if (linkVisible) assert((await link.textContent()).trim().length > 8, "Compatibility link should carry a readable name.");
        assertTelemetry(telemetry);
      } finally {
        await context.close();
      }
    });
  }
}

async function narrativeImportSafetyContract(browser, origin) {
  const literalLabel = '"><img src=x onerror=globalThis.__narrativeLabelProbe=1>';
  for (const composer of NARRATIVE_COMPOSERS) {
    await verify(`Narrative Composer ${composer.name} · schema-valid Strategy Canvas labels render literally with source lineage`, async () => {
      const { context, page, telemetry } = await openPage(browser, `${origin}/${composer.route}`, VIEWPORTS[1]);
      try {
        await page.addScriptTag({ path: resolve(SHARED_STRATEGY_CORE) });
        const fixture = await page.evaluate(() => {
          const source = JSON.parse(document.querySelector("#jsonPreview").textContent).strategy_canvas_v2;
          source.meta.id = "literal-rendering-source";
          source.meta.revision = 7;
          return source;
        });
        fixture.dimensions[0].label = literalLabel;
        await page.locator("#importText").fill(JSON.stringify(fixture));
        await page.locator('[data-action="import-json"]').click();
        await page.locator("#dimensionList .dimension-row").first().waitFor({ state: "visible" });
        const result = await page.evaluate(() => {
          const exported = JSON.parse(document.querySelector("#jsonPreview").textContent);
          const strategyCanvas = exported.strategy_canvas_v2;
          const dimensionIndexes = [...document.querySelectorAll("#dimensionList [data-dim-index]")].map((element) => element.dataset.dimIndex);
          const moduleIndexes = [...document.querySelectorAll("#moduleGrid [data-module-index]")].map((element) => element.dataset.moduleIndex);
          return {
            ids: strategyCanvas.dimensions.map((dimension) => dimension.id),
            labels: [...document.querySelectorAll('#dimensionList [data-dim-field="label"]')].map((element) => element.value),
            dimensionIndexes,
            moduleIndexes,
            dimensionImageCount: document.querySelectorAll("#dimensionList img").length,
            labelProbe: globalThis.__narrativeLabelProbe,
            validation: globalThis.StrategyCanvasCore.validateState(strategyCanvas),
            receipt: exported.strategy_canvas_adapter_receipt,
            sourceImportReceipt: strategyCanvas.extensions.narrativeProjection.sourceImportReceipt
          };
        });
        assert(same(result.ids, fixture.view.dimensionOrder), "Imported IDs should follow the source-declared dimension order.");
        assert(result.labels[0] === literalLabel, "Markup-like labels should remain literal input text.");
        assert(result.dimensionIndexes.every((value) => /^\d+$/.test(value)), "Dimension controls should use numeric index references.");
        assert(result.moduleIndexes.every((value) => /^\d+$/.test(value)), "Module controls should use numeric index references.");
        assert(result.dimensionImageCount === 0 && result.labelProbe === undefined, "Imported label text should create no markup node or executable handler.");
        assert(result.validation.valid === true, `The shared core validator should accept the normalized adapter output. ${(result.validation.errors || []).join(" ")}`);
        assert(result.receipt.sourceArtifactIdentity.id === fixture.meta.id && result.receipt.sourceArtifactIdentity.revision === fixture.meta.revision, "The adapter receipt should retain source identity and revision as lineage.");
        assert(same(result.sourceImportReceipt, result.receipt), "The receiver-owned Strategy projection should carry the source import receipt.");
        assertTelemetry(telemetry);
      } finally {
        await context.close();
      }
    });
  }
}

async function narrativeInlineParityContract() {
  for (const composer of NARRATIVE_COMPOSERS) {
    await verify(`Narrative Composer ${composer.name} · inline registry and seed match adjacent sources`, async () => {
      const directory = composer.route.slice(0, composer.route.lastIndexOf("/"));
      const [html, registrySource, seedSource] = await Promise.all([
        readFile(resolve(composer.route), "utf8"),
        readFile(resolve(directory, "core-architecture-target-pair-registry.v0.1.json"), "utf8"),
        readFile(resolve(directory, "expectation-opportunity-to-strategy-canvas.example.v0.1.json"), "utf8")
      ]);
      const inlineRegistry = inlineJsonConstant(html, "TARGET_REGISTRY");
      const inlineSeed = inlineJsonConstant(html, "SEED");
      assert(same(inlineRegistry, JSON.parse(registrySource)), "Inline TARGET_REGISTRY should match the adjacent registry exactly.");
      assert(same(inlineSeed, JSON.parse(seedSource)), "Inline SEED should match the adjacent example exactly.");
    });
  }
}

async function main() {
  await mkdir(runDir, { recursive: true });
  await narrativeInlineParityContract();
  const staticServer = await startStaticServer(resolve("."));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const canonicalUrl = `${staticServer.origin}/${CANONICAL}`;
    const contextUrl = `${staticServer.origin}/${CONTEXT}`;
    await canonicalViewportContract(browser, canonicalUrl);
    await canonicalColumnGeometryContract(browser, canonicalUrl);
    await canonicalInteractionContract(browser, canonicalUrl);
    await canonicalExchangeRecoveryContract(browser, canonicalUrl);
    await canonicalImportBoundaryContract(browser, canonicalUrl);
    await canonicalZoomContract(browser, canonicalUrl);
    await canonicalMountFailureContract(browser, canonicalUrl);
    await schemaNegativeContract(browser, canonicalUrl);
    await noJavaScriptContract(browser, canonicalUrl, "canonical");
    await contextViewportContract(browser, contextUrl);
    await contextZoomContract(browser, contextUrl);
    await contextCollaborationContract(browser, contextUrl);
    await contextMediaContract(browser, contextUrl);
    await noJavaScriptContract(browser, contextUrl, "Context");
    await compatibilityContract(browser, staticServer.origin);
    await narrativeImportSafetyContract(browser, staticServer.origin);
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      await staticServer.close();
    }
  }

  const summary = {
    runId,
    routes: { canonical: CANONICAL, context: CONTEXT },
    total: checks.length,
    passed: checks.filter((check) => check.status === "passed").length,
    failed: failures.length,
    checks,
    failures
  };
  await writeFile(resolve(runDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Strategy Canvas contract: ${summary.passed}/${summary.total} passed.`);
  console.log(`Artifacts: ${relative(resolve("."), runDir)}`);
  if (failures.length) {
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

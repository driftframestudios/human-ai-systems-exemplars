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

const CANONICAL = "core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-chimeric-prototype-v0.2.4.html";
const CONTEXT = "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/strategy-canvas-chimeric-prototype-v0.2.2.html";
const PROMPT_CAPSULE_EXAMPLE = "prompt-capsules/0.1.0/examples/strategy-canvas.md";
const RELATED_LOOPS = [
  {
    id: "repository-reentry",
    name: "Re-enter, make one bounded change, and return it clearly",
    publicUrl: "https://schemas.radiantnull.com/collaboration/#repository-reentry",
    fit: "Use when this versioned canvas carries a named question or requested change into resumed repository work and the return needs an exact stopping and re-entry point."
  },
  {
    id: "public-release",
    name: "Publish a repeatable, byte-comparable artifact through a named destination",
    publicUrl: "https://schemas.radiantnull.com/collaboration/#public-release",
    fit: "Use after people accept this canvas revision as source for a public artifact whose declared files and bytes need a named delivery receiver."
  }
];
const NARRATIVE_COMPOSERS = [
  {
    name: "Context",
    route: "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/narrative-capsule-composer/narrative-capsules-chimeric-prototype-v0.1.html"
  }
];
const SCHEMA_NEGATIVE_FIXTURE = "planning/context-canvas/strategy-canvas/fixtures/schema-validator-negative-cases.v2.json";
const SHARED_STRATEGY_CORE = "core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-core.js";
const STRATEGY_EVIDENCE = "core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-evidence.v0.1.json";
const GENOMIC_REPRESENTATION = "context-canvas-project-surface/context-canvas/genomic-viewer-replatforming.html";
const GENOMIC_SVG = "context-canvas-project-surface/img/plot/genomic_viewer_strategy_canvas.svg";
const INITIATIVE_COSTING = "collaboration/initiative-costing-calculator/index.html";
const STRATEGY_PLANNING_SOURCE_RESOLVER = new Map([
  ["urn:source-key:strategy-canvas-research/001", "planning/context-canvas/strategy-canvas/01-method-scale-and-adaptation.md"],
  ["urn:source-key:strategy-canvas-research/002", "planning/context-canvas/strategy-canvas/02-independent-elicitation-and-aggregation.md"],
  ["urn:source-key:strategy-canvas-research/003", "planning/context-canvas/strategy-canvas/03-direct-manipulation-and-room-ergonomics.md"],
  ["urn:source-key:strategy-canvas-research/004", "planning/context-canvas/strategy-canvas/04-domain-dimension-and-anchor-atlas.md"],
  ["urn:source-key:strategy-canvas-research/005", "planning/context-canvas/strategy-canvas/06-architecture-security-and-verification.md"],
  ["urn:source-key:strategy-canvas-research/006", "planning/context-canvas/strategy-canvas/README.md"],
  ["urn:source-key:strategy-canvas-research/007", "planning/context-canvas/strategy-canvas/07-implementation-coverage-ledger.md"],
]);
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

async function canonicalSelectionReceipt(page) {
  return page.evaluate(() => {
    const ids = (selector, attribute) => [...document.querySelectorAll(selector)].map((element) => element.getAttribute(attribute));
    return {
      stateId: window.strategyCanvasCanonical.getState().view.selectedDimensionId,
      chooserCount: document.querySelectorAll('[data-sc-role="dimension-chooser"] [data-select-dimension]').length,
      chooserCurrent: ids('[data-sc-role="dimension-chooser"] [aria-current="true"]', 'data-select-dimension'),
      chooserStatus: document.querySelector('[data-sc-role="dimension-chooser"] [aria-current="true"] .sc-dimension-choice-status')?.textContent.trim() || '',
      chartCurrent: ids('[data-selection-route="chart"][aria-current="true"]', 'data-select-dimension'),
      matrixCurrent: ids('[data-selection-route="matrix"][aria-current="true"]', 'data-dimension-id'),
      selectedRows: ids('[data-sc-role="score-matrix"] tr[data-selected="true"] [data-selection-route="matrix"]', 'data-dimension-id'),
      selectedHandleIds: [...new Set(ids('[data-handle="true"][data-selected="true"]', 'data-dimension-id'))],
      selectedHandleCount: document.querySelectorAll('[data-handle="true"][data-selected="true"]').length,
      inspectorHeading: document.querySelector('[data-sc-role="inspector"] h3')?.textContent.trim() || ''
    };
  });
}

async function assertCanonicalSelectionCoherence(page, label) {
  const receipt = await canonicalSelectionReceipt(page);
  assert(receipt.chooserCount === (await canonicalState(page)).dimensions.length, `${label} should expose one chooser control per dimension.`);
  for (const [surface, ids] of [
    ['chooser', receipt.chooserCurrent],
    ['chart label', receipt.chartCurrent],
    ['score matrix', receipt.matrixCurrent],
    ['selected row', receipt.selectedRows],
    ['selected handles', receipt.selectedHandleIds]
  ]) {
    assert(same(ids, [receipt.stateId]), `${label} ${surface} should identify only ${receipt.stateId}. ${JSON.stringify(ids)}`);
  }
  assert(receipt.chooserStatus === 'Current', `${label} chooser should name the current dimension in visible text.`);
  assert(receipt.selectedHandleCount === 3, `${label} should mark all three handles for the current dimension.`);
  assert(receipt.inspectorHeading.includes((await canonicalState(page)).dimensions.find((dimension) => dimension.id === receipt.stateId).label), `${label} inspector should describe the current dimension.`);
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
        await assertCanonicalSelectionCoherence(page, `Canonical ${viewport.name}`);
        await assertSkipLinkLifecycle(page, `Canonical ${viewport.name}`);
        await page.screenshot({ path: resolve(runDir, `canonical-${viewport.name}.png`), fullPage: true });
        assertTelemetry(telemetry);
      } finally {
        await context.close();
      }
    });
  }
}

async function canonicalSelectionStateVisualContract(browser, url) {
  async function focusedChartReceipt(page) {
    return page.evaluate(() => {
      const target = document.activeElement;
      const frame = target?.closest?.('.sc-chart-frame');
      if (!frame) return null;
      const frameRect = frame.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const visibleWidth = Math.max(0, Math.min(frameRect.right, targetRect.right) - Math.max(frameRect.left, targetRect.left));
      return {
        dimensionId: target.dataset.dimensionId || target.dataset.selectDimension || '',
        isChartLabel: target.dataset.selectionRoute === 'chart',
        isHandle: target.dataset.handle === 'true',
        scrollLeft: frame.scrollLeft,
        targetWidth: targetRect.width,
        visibleWidth,
        visibleRatio: targetRect.width ? visibleWidth / targetRect.width : 0,
      };
    });
  }

  async function assertFocusedChartControlVisible(page, label) {
    await page.waitForFunction(() => {
      const target = document.activeElement;
      const frame = target?.closest?.('.sc-chart-frame');
      if (!frame) return false;
      const frameRect = frame.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const visibleWidth = Math.max(0, Math.min(frameRect.right, targetRect.right) - Math.max(frameRect.left, targetRect.left));
      return visibleWidth >= Math.min(44, targetRect.width * 0.75) && visibleWidth / targetRect.width >= 0.75;
    });
    const receipt = await focusedChartReceipt(page);
    assert(receipt && receipt.visibleWidth >= Math.min(44, receipt.targetWidth * 0.75) && receipt.visibleRatio >= 0.75, `${label} should remain meaningfully visible in the chart scroller. ${JSON.stringify(receipt)}`);
    return receipt;
  }

  async function tabTo(page, predicate, label) {
    for (let index = 0; index < 30; index += 1) {
      await page.keyboard.press('Tab');
      const receipt = await focusedChartReceipt(page);
      if (receipt && predicate(receipt)) return assertFocusedChartControlVisible(page, label);
    }
    throw new Error(`${label} should be reachable through the chart's actual Tab order.`);
  }

  for (const viewport of [VIEWPORTS[1], VIEWPORTS[0]]) {
    await verify(`canonical ${viewport.name} · initial, keyboard-focus, and selected states stay visibly distinct`, async () => {
      const { context, page, telemetry } = await openPage(browser, url, viewport);
      try {
        const section = page.locator(".sc-chart-section");
        await section.waitFor({ state: "visible" });
        await section.screenshot({ path: resolve(runDir, `canonical-${viewport.name}-selection-initial.png`) });
        let target = page.locator('[data-selection-route="chart"]').nth(1);
        if (viewport.name === "mobile") {
          const targetId = await target.getAttribute('data-select-dimension');
          await page.locator('.sc-chart-frame').focus();
          await tabTo(page, (receipt) => receipt.isChartLabel && receipt.dimensionId === targetId, "Mobile second chart label");
        } else {
          await target.focus();
          await assertFocusedChartControlVisible(page, "Desktop second chart label");
        }
        await section.screenshot({ path: resolve(runDir, `canonical-${viewport.name}-selection-focus.png`) });
        await page.keyboard.press("Enter");
        await assertCanonicalSelectionCoherence(page, `Canonical ${viewport.name} selected state`);
        await assertFocusedChartControlVisible(page, `${viewport.name} selected chart label after Enter`);
        await section.screenshot({ path: resolve(runDir, `canonical-${viewport.name}-selection-selected.png`) });
        if (viewport.name === "mobile") {
          await tabTo(page, (receipt) => receipt.isHandle, "Mobile plotted handle");
          await section.screenshot({ path: resolve(runDir, "canonical-mobile-selection-handle-focus.png") });
          await page.emulateMedia({ forcedColors: "active" });
          const selected = page.locator('[data-selection-route="chart"][aria-current="true"]');
          await selected.focus();
          const forcedColorState = await selected.evaluate((element) => {
            const surface = element.querySelector(".sc-dimension-label-surface");
            const choice = document.querySelector('[data-selection-route="chooser"][aria-current="true"]');
            const unselected = document.querySelector('[data-selection-route="chart"]:not([aria-current="true"])');
            const unselectedSurface = unselected.querySelector(".sc-dimension-label-surface");
            const unselectedText = unselected.querySelector(".sc-dimension-label");
            const referenceSurface = document.createElementNS(element.ownerSVGElement.namespaceURI, "rect");
            const referenceText = document.createElementNS(element.ownerSVGElement.namespaceURI, "text");
            referenceSurface.style.fill = "Canvas";
            referenceSurface.style.stroke = "CanvasText";
            referenceText.style.fill = "CanvasText";
            element.ownerSVGElement.append(referenceSurface, referenceText);
            const receipt = {
              focusIsVisible: element.matches(":focus-visible"),
              surfaceStrokeWidth: Number.parseFloat(getComputedStyle(surface).strokeWidth),
              choiceBorderStyle: getComputedStyle(choice).borderStyle,
              unselectedSurfaceFill: getComputedStyle(unselectedSurface).fill,
              unselectedSurfaceStroke: getComputedStyle(unselectedSurface).stroke,
              unselectedTextFill: getComputedStyle(unselectedText).fill,
              canvasFill: getComputedStyle(referenceSurface).fill,
              canvasTextStroke: getComputedStyle(referenceSurface).stroke,
              canvasTextFill: getComputedStyle(referenceText).fill,
            };
            referenceSurface.remove();
            referenceText.remove();
            return receipt;
          });
          assert(forcedColorState.focusIsVisible, "Forced-colors observation should retain keyboard focus.");
          assert(forcedColorState.surfaceStrokeWidth >= 4, "Forced colors should retain the selected, focused chart-label outline.");
          assert(forcedColorState.choiceBorderStyle !== "none", "Forced colors should retain the matching chooser border.");
          assert(
            forcedColorState.unselectedSurfaceFill === forcedColorState.canvasFill &&
              forcedColorState.unselectedSurfaceStroke === forcedColorState.canvasTextStroke &&
              forcedColorState.unselectedTextFill === forcedColorState.canvasTextFill,
            `Forced colors should give an unselected chart label the system Canvas and CanvasText pair. ${JSON.stringify(forcedColorState)}`
          );
          await section.screenshot({ path: resolve(runDir, "canonical-mobile-selection-forced-colors-focus.png") });
        }
        assertTelemetry(telemetry);
      } finally {
        await context.close();
      }
    });
  }
}

async function canonicalSourceNavigationContract(browser, url) {
  await verify("canonical · direct view opens its official method source in a separate top-level page", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const methodUrl = "https://www.blueoceanstrategy.com/tools/strategy-canvas/";
    await context.route(methodUrl, (route) => route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><title>Controlled source navigation</title><p>Navigation observed.</p>",
    }));
    try {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded" });
      assert(await page.locator('[data-framed-source-handoff]').isHidden(), "Direct view should keep the embedded handoff hidden.");
      const sourceLink = page.locator(`[data-direct-source-route][href="${methodUrl}"]`);
      assert(await sourceLink.count() === 1, "Direct view should expose its official method source once.");
      const [popup] = await Promise.all([page.waitForEvent("popup"), sourceLink.click()]);
      try {
        await popup.waitForLoadState("domcontentloaded");
        assert(popup.url() === methodUrl, "Direct source navigation should retain the official destination.");
        assert((await popup.locator("body").textContent()).includes("Navigation observed"), "Direct source destination should open outside the artifact page.");
      } finally {
        await popup.close();
      }
    } finally {
      await context.close();
    }
  });
}

async function canonicalInteractionContract(browser, url) {
  const { context, page, telemetry } = await openPage(browser, url, VIEWPORTS[1]);
  try {
    await page.locator('[data-sc-role="chart"] svg').waitFor({ state: "visible" });
    await verify("canonical · pointer and keyboard selection keep every current-dimension route coherent", async () => {
      const initial = await canonicalState(page);
      const chartRoutes = page.locator('[data-selection-route="chart"]');
      const enterTarget = initial.dimensions[1].id;
      await chartRoutes.nth(1).focus();
      await chartRoutes.nth(1).press("Enter");
      assert((await canonicalState(page)).view.selectedDimensionId === enterTarget, "Enter should select the focused chart dimension.");
      assert(await page.evaluate((id) => document.activeElement?.getAttribute('data-select-dimension') === id && document.activeElement?.getAttribute('data-selection-route') === 'chart', enterTarget), "Enter selection should restore focus to the replacement chart label.");
      await assertCanonicalSelectionCoherence(page, "Canonical Enter selection");

      const spaceTarget = initial.dimensions[2].id;
      const chooser = page.locator('[data-sc-role="dimension-chooser"] [data-selection-route="chooser"]');
      await chooser.nth(2).focus();
      await chooser.nth(2).press("Space");
      assert((await canonicalState(page)).view.selectedDimensionId === spaceTarget, "Space should select the focused native chooser button.");
      assert(await page.evaluate((id) => document.activeElement?.getAttribute('data-select-dimension') === id && document.activeElement?.getAttribute('data-selection-route') === 'chooser', spaceTarget), "Chooser selection should restore focus after render.");
      await assertCanonicalSelectionCoherence(page, "Canonical Space selection");

      const pointerTarget = initial.dimensions[3].id;
      await page.locator(`[data-selection-route="chart"][data-select-dimension="${pointerTarget}"]`).click();
      assert((await canonicalState(page)).view.selectedDimensionId === pointerTarget, "Pointer activation should select the chart dimension.");
      await page.waitForFunction((label) => document.querySelector('[data-sc-role="live"]')?.textContent.includes(label), initial.dimensions[3].label);
      await assertCanonicalSelectionCoherence(page, "Canonical pointer selection");

      await page.locator('[data-action="undo"]').click();
      assert((await canonicalState(page)).view.selectedDimensionId === spaceTarget, "Undo should restore the prior selected dimension.");
      await assertCanonicalSelectionCoherence(page, "Canonical selection undo");
      await page.locator('[data-action="redo"]').click();
      assert((await canonicalState(page)).view.selectedDimensionId === pointerTarget, "Redo should restore the later selected dimension.");
      await assertCanonicalSelectionCoherence(page, "Canonical selection redo");

      const selectedExport = await page.evaluate(() => window.strategyCanvasCanonical.serialize());
      await chooser.first().click();
      await page.locator('[data-sc-role="import"]').evaluate((input) => { input.closest('details').open = true; });
      await page.locator('[data-sc-role="import"]').fill(selectedExport);
      await page.locator('[data-action="import"]').click();
      assert((await canonicalState(page)).view.selectedDimensionId === pointerTarget, "Import should restore the serialized selected dimension.");
      await assertCanonicalSelectionCoherence(page, "Canonical selection import");
    });
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
      await assertCanonicalSelectionCoherence(page, "Canonical score and weight changes");
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
      await assertCanonicalSelectionCoherence(page, "Canonical reviewed lifecycle");
      await page.locator('[data-action="reopen"]').click();
      const reopened = await canonicalState(page);
      assert(reopened.lifecycle.status === "working" && reopened.meta.revision === reviewed.meta.revision + 1, "Reopen should begin the next working revision.");
      assert(reopened.lifecycle.reviewedSnapshot, "Reopen should preserve the reviewed snapshot.");
      await assertCanonicalSelectionCoherence(page, "Canonical reopened lifecycle");
    });
    await verify("canonical · presentation, reduced-motion, forced-colors, and print", async () => {
      await page.locator('[data-action="toggle-mode"]').click();
      assert((await canonicalState(page)).view.mode === "presentation", "Presentation action should update state.");
      assert(await page.locator("body").getAttribute("data-view-mode") === "presentation", "Presentation state should reach the rendered surface.");
      await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
      assert(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), "Reduced motion should be available to the surface.");
      assert(await page.evaluate(() => matchMedia("(forced-colors: active)").matches), "Forced colors should be available to the surface.");
      assert(await page.locator('[data-selection-route="chart"][aria-current="true"] .sc-dimension-current-marker').isVisible(), "Forced colors should retain the visible current-dimension marker.");
      await page.emulateMedia({ media: "print" });
      assert(await page.locator('[data-sc-role="text-equivalent"] table').isVisible(), "Print should preserve the semantic table.");
      assert(await page.locator('[data-selection-route="chart"][aria-current="true"] .sc-dimension-current-marker').isVisible(), "Print should retain the current dimension in visible chart text.");
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
      const markdownOutput = page.locator('[data-sc-role="prompt"]');
      const acceptedMarkdown = await markdownOutput.textContent();
      const acceptedFingerprint = await page.evaluate(() => window.strategyCanvasCanonical.promptCapsuleFingerprint());

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
      assert(await markdownOutput.textContent() === acceptedMarkdown, "Recovery should retain the accepted Markdown projection.");
      assert(await page.evaluate(() => window.strategyCanvasCanonical.promptCapsuleFingerprint()) === acceptedFingerprint, "Recovery should retain the accepted state fingerprint.");
      assertTelemetry(telemetry);
    } finally {
      await context.close();
    }
  });
}

async function canonicalPromptCapsuleContract(browser, url) {
  await verify("canonical · native Prompt Capsule views keep state fixed and active Markdown bytes aligned", async () => {
    const context = await browser.newContext({
      viewport: { width: VIEWPORTS[1].width, height: VIEWPORTS[1].height },
      acceptDownloads: true
    });
    const page = await context.newPage();
    const telemetry = monitor(page);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.locator('[data-sc-role="prompt"]').waitFor({ state: "visible" });
      const checkedExample = await readFile(resolve(PROMPT_CAPSULE_EXAMPLE), "utf8");
      const prompt = page.locator('[data-sc-role="prompt"]');
      const radios = page.locator('[data-sc-role="prompt-view-control"] input[type="radio"]');
      assert(await page.locator('[data-sc-role="prompt-view-control"] fieldset').count() === 0, "The Prompt Capsule view control should itself be the native fieldset.");
      assert(await page.locator('fieldset[data-sc-role="prompt-view-control"] > legend').count() === 1, "The native view group should have one visible legend.");
      assert(await radios.count() === 2, "The view group should expose plain and skill-assisted radios.");
      assert(await radios.nth(0).getAttribute("value") === "plain" && await radios.nth(0).isChecked(), "Plain Markdown should be the native default.");
      assert(await prompt.textContent() === checkedExample, "The mounted plain view should equal the checked default example.");
      assert(await page.evaluate(() => window.strategyCanvasCanonical.promptCapsule()) === checkedExample, "The promptCapsule compatibility seam should return plain Markdown.");
      assert(checkedExample.includes("## Related loops"), "The plain view should carry its related-loop section.");
      assert(checkedExample.includes("https://schemas.radiantnull.com/collaboration/#repository-reentry"), "The plain view should link the fitting repository re-entry loop.");
      assert(checkedExample.includes("https://schemas.radiantnull.com/collaboration/#public-release"), "The plain view should link the fitting public-release loop.");
      assert(!checkedExample.includes("#visitor-surface-change"), "The Strategy Canvas should omit subject-dependent visitor-surface routing.");
      assert(!checkedExample.includes("#skill-from-receiving-use"), "The Strategy Canvas should omit subject-dependent skill-growth routing.");

      const stateBeforeView = await page.evaluate(() => window.strategyCanvasCanonical.serialize());
      const fingerprintBeforeView = await page.evaluate(() => window.strategyCanvasCanonical.promptCapsuleFingerprint());
      const assisted = radios.nth(1);
      await assisted.focus();
      await assisted.check();
      await page.waitForFunction(() => document.querySelector('[data-sc-role="live"]')?.textContent.includes("Skill-assisted Markdown view selected."));
      assert(await page.evaluate(() => document.activeElement?.getAttribute("data-prompt-view") === "" && document.activeElement?.value === "skill-assisted"), "View switching should retain focus on the chosen radio.");
      assert(await page.evaluate(() => window.strategyCanvasCanonical.serialize()) === stateBeforeView, "View switching should leave Strategy Canvas state unchanged.");
      assert(await page.evaluate(() => window.strategyCanvasCanonical.promptCapsuleFingerprint()) === fingerprintBeforeView, "Both Markdown views should share one state fingerprint.");
      const assistedMarkdown = await prompt.textContent();
      assert(assistedMarkdown.includes("## Skill assistance"), "The assisted view should add its bounded skill section.");
      assert(assistedMarkdown.includes("## Related loops"), "The assisted view should retain the same related-loop section.");
      assert(await page.evaluate(() => window.strategyCanvasCanonical.promptCapsuleMarkdown()) === assistedMarkdown, "The programmatic Markdown reading should equal the visible active view.");
      assert(
        assistedMarkdown.slice(
          assistedMarkdown.indexOf("## Related loops"),
          assistedMarkdown.indexOf("## Evidence and recovery")
        ) === checkedExample.slice(
          checkedExample.indexOf("## Related loops"),
          checkedExample.indexOf("## Evidence and recovery")
        ),
        "Both views should carry byte-identical related-loop metadata outside the state fingerprint."
      );
      assert(assistedMarkdown.includes(`- Fingerprint: \`${fingerprintBeforeView}\``), "The assisted view should expose the shared fingerprint.");

      await page.evaluate(() => {
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText: async (value) => { window.__strategyCanvasCopiedMarkdown = value; } }
        });
        const createObjectURL = URL.createObjectURL.bind(URL);
        URL.createObjectURL = (blob) => {
          window.__strategyCanvasDownloadType = blob.type;
          return createObjectURL(blob);
        };
      });
      await page.locator('[data-action="copy-markdown"]').click();
      await page.waitForFunction(() => typeof window.__strategyCanvasCopiedMarkdown === "string");
      assert(await page.evaluate(() => window.__strategyCanvasCopiedMarkdown) === assistedMarkdown, "Copy should use the exact active Markdown bytes.");

      const downloadEvent = page.waitForEvent("download");
      await page.locator('[data-action="download-markdown"]').click();
      const download = await downloadEvent;
      const downloadPath = await download.path();
      assert(download.suggestedFilename() === "strategy-canvas-collaboration-field.prompt-capsule.r1.skill-assisted.md", "Download should use a deterministic Markdown filename.");
      assert(await page.evaluate(() => window.__strategyCanvasDownloadType) === "text/markdown;charset=utf-8", "Download should declare UTF-8 Markdown.");
      assert(downloadPath && await readFile(downloadPath, "utf8") === assistedMarkdown, "Download should use the exact active Markdown bytes.");

      await radios.nth(0).check();
      assert(await prompt.textContent() === checkedExample, "Returning to plain should restore the checked example bytes.");
      assert(await page.evaluate(() => window.strategyCanvasCanonical.promptCapsuleMarkdown()) === checkedExample, "The programmatic Markdown reading should return the checked plain bytes.");
      await page.locator('[data-action="copy-markdown"]').click();
      await page.waitForFunction((expected) => window.__strategyCanvasCopiedMarkdown === expected, checkedExample);
      const plainDownloadEvent = page.waitForEvent("download");
      await page.locator('[data-action="download-markdown"]').click();
      const plainDownload = await plainDownloadEvent;
      const plainDownloadPath = await plainDownload.path();
      assert(plainDownload.suggestedFilename() === "strategy-canvas-collaboration-field.prompt-capsule.r1.plain.md", "Plain download should name its active view.");
      assert(plainDownloadPath && await readFile(plainDownloadPath, "utf8") === checkedExample, "Plain copy, download, and visible Markdown should agree byte for byte.");
      const dimensionId = (await canonicalState(page)).dimensions[0].id;
      const score = page.locator(`[data-score-input="true"][data-dimension-id="${dimensionId}"][data-series="current"]`);
      await score.fill("6");
      await score.press("Tab");
      assert(await page.evaluate(() => window.strategyCanvasCanonical.promptCapsuleFingerprint()) !== fingerprintBeforeView, "A material state edit should change the fingerprint.");
      assert((await prompt.textContent()).includes('current `6`; good enough `7`; desired `9`'), "The visible Markdown should agree with the edited state.");
      assertTelemetry(telemetry);
    } finally {
      await context.close();
    }
  });
}

async function canonicalRelatedLoopsContract(browser, url) {
  await verify("canonical · native Related loops disclosure shares the Prompt Capsule metadata", async () => {
    const { context, page, telemetry } = await openPage(browser, url, VIEWPORTS[0]);
    try {
      const details = page.locator('details[data-sc-role="related-loops"]');
      const summary = details.locator("summary");
      assert(await details.count() === 1 && await details.isVisible(), "The canonical visitor surface should expose one visible native Related loops disclosure.");
      assert(await summary.evaluate((element) => element.tagName === "SUMMARY"), "Related loops should use the native details/summary control.");
      assert(await summary.textContent() === "Related loops", "The prototype control should use the compact Related loops label.");
      assert(await details.evaluate((element) => element.open) === false, "The Related loops disclosure should begin collapsed.");

      const sourceLoops = await page.evaluate(() => window.StrategyCanvasCore.promptCapsuleRelatedLoops.map((loop) => ({
        id: loop.id,
        name: loop.name,
        publicUrl: loop.publicUrl,
        fit: loop.fit
      })));
      const visibleLoops = await details.locator("[data-related-loop-id]").evaluateAll((items) => items.map((item) => {
        const link = item.querySelector("a[data-related-loop-link]");
        return {
          id: item.dataset.relatedLoopId,
          name: link?.textContent.trim() || "",
          publicUrl: link?.href || "",
          fit: item.querySelector("p")?.textContent.replace(/^Fit condition:\s*/u, "").trim() || ""
        };
      }));
      assert(same(sourceLoops, RELATED_LOOPS), "The exported core metadata should retain the exact accepted two-loop set.");
      assert(same(visibleLoops, sourceLoops), "The native visitor control should be generated from the same loop metadata as Markdown.");

      await page.evaluate(() => document.activeElement?.blur());
      let reachedSummary = false;
      for (let index = 0; index < 8; index += 1) {
        await page.keyboard.press("Tab");
        reachedSummary = await summary.evaluate((element) => document.activeElement === element);
        if (reachedSummary) break;
      }
      assert(reachedSummary, "The Related loops summary should be reachable in native keyboard order.");
      const summaryFocus = await summary.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return { width: rect.width, height: rect.height, outlineWidth: Number.parseFloat(style.outlineWidth) || 0 };
      });
      assert(summaryFocus.width >= 44 && summaryFocus.height >= 44, `The Related loops summary should retain a touch-sized target. ${JSON.stringify(summaryFocus)}`);
      assert(summaryFocus.outlineWidth >= 3, "Keyboard focus should remain visibly outlined on the Related loops summary.");
      await page.keyboard.press("Enter");
      assert(await details.evaluate((element) => element.open), "Enter on the native summary should reveal the related loops.");

      const links = details.locator("a[data-related-loop-link]");
      assert(await links.count() === 2, "The open disclosure should expose exactly two native anchors.");
      for (let index = 0; index < await links.count(); index += 1) {
        const target = await links.nth(index).boundingBox();
        assert(target && target.width >= 44 && target.height >= 44, `Related loop ${index + 1} should retain a touch-sized anchor target.`);
      }
      await page.evaluate(() => {
        window.__strategyCanvasRelatedLoopActivation = "";
        const link = document.querySelector('a[data-related-loop-link]');
        link.addEventListener("click", (event) => {
          event.preventDefault();
          window.__strategyCanvasRelatedLoopActivation = link.href;
        }, { once: true });
      });
      await links.first().focus();
      assert(await links.first().evaluate((element) => (Number.parseFloat(getComputedStyle(element).outlineWidth) || 0) >= 3), "A related-loop anchor should retain a visible keyboard focus indicator.");
      await page.keyboard.press("Enter");
      assert(await page.evaluate(() => window.__strategyCanvasRelatedLoopActivation) === RELATED_LOOPS[0].publicUrl, "Enter should activate the first native public loop anchor.");
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
      assert(await baseline.locator('[data-sc-role="static-prompt"]').textContent() === await readFile(resolve(PROMPT_CAPSULE_EXAMPLE), "utf8"), "The retained baseline should include the checked plain Markdown default.");
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
        assert(await page.locator('[data-strategy-canvas-source="method-origin"]').isVisible(), "Canonical static reading should retain its method and adaptation source note.");
        assert(await page.locator('[data-sc-role="static-prompt"]').textContent() === await readFile(resolve(PROMPT_CAPSULE_EXAMPLE), "utf8"), "Canonical static reading should retain the checked plain Markdown default.");
        const details = page.locator('details[data-sc-role="related-loops"]');
        const summary = details.locator("summary");
        assert(await details.count() === 1 && await details.isVisible(), "Canonical static reading should retain one native Related loops disclosure.");
        assert(await details.evaluate((element) => element.open) === false, "The no-JavaScript Related loops disclosure should begin collapsed.");
        await summary.click();
        assert(await details.evaluate((element) => element.open), "The native Related loops disclosure should open without JavaScript.");
        const staticLoops = await details.locator("[data-related-loop-id]").evaluateAll((items) => items.map((item) => ({
          id: item.dataset.relatedLoopId,
          name: item.querySelector("a")?.textContent.trim() || "",
          publicUrl: item.querySelector("a")?.href || "",
          fit: item.querySelector("p")?.textContent.replace(/^Fit condition:\s*/u, "").trim() || ""
        })));
        assert(same(staticLoops, RELATED_LOOPS), "The no-JavaScript disclosure should retain the exact accepted two-loop set and fit conditions.");
        const summaryTarget = await summary.boundingBox();
        assert(summaryTarget && summaryTarget.width >= 44 && summaryTarget.height >= 44, "The no-JavaScript disclosure summary should retain a touch-sized target.");
      } else {
        assert(await page.locator(".static-field").isVisible(), "Context static field should remain visible.");
        assert(await page.locator(".static-field tbody tr").count() === 6, "Context static field should retain all six starting dimensions.");
        assert(await page.locator('[data-strategy-canvas-source="method-origin"]').isVisible(), "Context static reading should retain its method and adaptation source note.");
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
        assert(await page.locator('#dimension-strip [aria-current="true"]').count() === 1, "Context parity should retain one explicit current dimension in its existing chooser.");
        assert(await page.locator('[data-strategy-canvas-source="method-origin"]').isVisible(), "Context workbench should keep its method and local adaptation visible.");
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
    {
      route: "core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-chimeric-prototype-v0.1.1.html",
      current: "strategy-canvas-chimeric-prototype-v0.2.4.html"
    },
    {
      route: "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/strategy-canvas-chimeric-prototype-v0.1.1.html",
      current: "strategy-canvas-chimeric-prototype-v0.2.2.html"
    },
    {
      route: "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/narrative-capsule-composer/companions/strategy-canvas-chimeric-prototype-v0.1.1.html",
      current: "strategy-canvas-chimeric-prototype-v0.2.2.html"
    }
  ];
  for (const { route, current } of routes) {
    await verify(`compatibility route · ${route}`, async () => {
      const { context, page, telemetry } = await openPage(browser, `${origin}/${route}`, VIEWPORTS[0]);
      try {
        const redirected = page.url().endsWith(current);
        const link = page.locator(`a[href*="${current}"]`).first();
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

async function strategyCanvasEvidenceContract() {
  await verify("Strategy Canvas evidence · origin, implementation decisions, counterevidence, and limits remain source-owned", async () => {
    const registry = JSON.parse(await readFile(resolve(STRATEGY_EVIDENCE), "utf8"));
    assert(registry.schemaVersion === "strategy-canvas-evidence/0.1", "Evidence registry should publish its contract version.");
    assert(registry.methodOrigin.primarySource.url === "https://www.blueoceanstrategy.com/tools/strategy-canvas/", "Evidence registry should name the method owners' primary description.");
    assert(registry.methodOrigin.institutionalRecord.url.startsWith("https://www.insead.edu/"), "Evidence registry should retain the institutional record.");
    assert(registry.methodOrigin.developers.includes("W. Chan Kim") && registry.methodOrigin.developers.includes("Renée Mauborgne"), "Evidence registry should retain both method developers.");
    const inventory = registry.representationInventory;
    const expectedInventoryIds = [
      "canonical-worksheet",
      "canonical-compatibility",
      "canonical-iframe-projection",
      "context-workbench",
      "context-compatibility",
      "narrative-projection",
      "narrative-portable-companion",
      "genomic-static-companion",
      "context-host-embeds",
      "public-schema-example",
      "planning-and-evidence-spine",
    ];
    assert(/incidental/iu.test(inventory.scope), "Representation inventory should state why incidental mentions remain outside its finite scope.");
    assert(!JSON.stringify(registry).includes("planning/context-canvas"), "The public evidence registry should carry operator-blind planning source keys rather than private planning locators.");
    assert(same(Object.keys(inventory.authorities).sort(), ["canonicalManifest", "contextManifest", "evidenceRegistry", "semanticContract"]), "Representation inventory should name its four source authorities.");
    assert(same(inventory.artifacts.map((artifact) => artifact.id), expectedInventoryIds), "Representation inventory should retain the complete ordered set of material Strategy Canvas carriers.");
    const [canonicalManifest, contextManifest, publicRouteManifest] = await Promise.all([
      readFile(resolve(inventory.authorities.canonicalManifest), "utf8").then(JSON.parse),
      readFile(resolve(inventory.authorities.contextManifest), "utf8").then(JSON.parse),
      readFile(resolve("core-architectures-chimeric-prototype-current-pack-v0.1/public-iframe-route-manifest-v1.json"), "utf8").then(JSON.parse),
    ]);
    const canonicalCurrent = canonicalManifest.prototypes.find((prototype) =>
      prototype.id === "strategy-canvas" && prototype.status === "current" && prototype.expression === "canonical"
    );
    const contextCurrent = contextManifest.prototypes.find((prototype) =>
      prototype.id === "strategy-canvas" && prototype.status === "current" && prototype.expression === "context-canvas"
    );
    assert(canonicalCurrent && contextCurrent, "Each owning manifest should declare one current Strategy Canvas expression.");
    const canonicalRoot = inventory.authorities.canonicalManifest.slice(0, inventory.authorities.canonicalManifest.lastIndexOf("/") + 1);
    const contextRoot = inventory.authorities.contextManifest.slice(0, inventory.authorities.contextManifest.lastIndexOf("/") + 1);
    const inventoryById = new Map(inventory.artifacts.map((artifact) => [artifact.id, artifact]));
    const canonicalInventory = inventoryById.get("canonical-worksheet");
    assert(canonicalInventory.version === canonicalCurrent.version, "Canonical inventory version should derive from its owning manifest.");
    assert(canonicalInventory.paths.includes(`${canonicalRoot}${canonicalCurrent.file}`), "Canonical inventory should name the manifest-current worksheet.");
    const canonicalCompatibility = inventoryById.get("canonical-compatibility");
    assert(canonicalCompatibility.paths.includes(`${canonicalRoot}${canonicalCurrent.compatibility_route}`), "Canonical inventory should name the manifest-owned compatibility route.");
    const contextInventory = inventoryById.get("context-workbench");
    assert(contextInventory.version === contextCurrent.version, "Context inventory version should derive from its owning manifest.");
    assert(contextInventory.paths.includes(`${contextRoot}${contextCurrent.file}`), "Context inventory should name the manifest-current workbench.");
    const contextCompatibility = inventoryById.get("context-compatibility");
    assert(contextCompatibility.paths.includes(`${contextRoot}${contextCurrent.compatibility_route}`), "Context inventory should name the manifest-owned compatibility route.");
    const iframeRoute = publicRouteManifest.routes.find((route) => route.id === "strategy-canvas");
    assert(iframeRoute?.source_file === canonicalCurrent.file, "The public iframe route should project the manifest-current canonical worksheet.");
    assert(iframeRoute?.source_version === canonicalCurrent.version && iframeRoute?.expression === canonicalCurrent.expression, "The public iframe route should retain canonical version and expression identity.");
    assert(iframeRoute?.package_files?.some((file) => file.source_file === canonicalCurrent.evidence), "The public iframe route should carry the evidence file declared by the canonical manifest.");
    const iframeInventory = inventoryById.get("canonical-iframe-projection");
    assert(iframeInventory.version === iframeRoute.source_version, "Iframe inventory version should derive from the route manifest.");
    for (const artifact of inventory.artifacts) {
      assert(artifact.expression.length > 4, `${artifact.id} should name its expression.`);
      assert(artifact.role.length > 8, `${artifact.id} should name its carrier role.`);
      assert(artifact.version.length > 2, `${artifact.id} should name its version or current standing.`);
      assert(artifact.relation.length > 24, `${artifact.id} should state its relation to source or receiver.`);
      assert(Array.isArray(artifact.paths) && artifact.paths.length > 0, `${artifact.id} should name its repository paths.`);
      for (const file of artifact.paths) {
        assert((await readFile(resolve(file))).length > 0, `${artifact.id} should resolve ${file}.`);
      }
      for (const sourceKey of artifact.sourceKeys || []) {
        const planningPath = STRATEGY_PLANNING_SOURCE_RESOLVER.get(sourceKey);
        assert(planningPath, `${artifact.id} should use a source key present in the authorized local resolver.`);
        const planningSource = await readFile(resolve(planningPath), "utf8");
        assert(planningSource.includes("strategy-canvas-evidence.v0.1.json"), `${planningPath} should route back to the evidence registry.`);
      }
    }
    const portableCompanion = inventory.artifacts.find((artifact) => artifact.id === "narrative-portable-companion");
    assert(portableCompanion.version === canonicalCurrent.version, "Narrative portable-companion inventory should derive its version from the canonical manifest.");
    assert(portableCompanion.archiveMember.endsWith(canonicalCurrent.file), "Narrative portable-companion inventory should name the manifest-current canonical worksheet without collapsing it into the Context workbench.");
    const ids = registry.implementationEvidence.map((entry) => entry.id);
    assert(new Set(ids).size === ids.length && ids.length >= 8, "Evidence registry should carry a distinct, substantive implementation ledger.");
    for (const entry of registry.implementationEvidence) {
      assert(entry.url.startsWith("https://"), `${entry.id} should use a stable HTTPS source.`);
      assert(entry.evidenceClass.length > 8, `${entry.id} should name its evidence class.`);
      assert(entry.implementationDecision.length > 24, `${entry.id} should name the implementation decision it informs.`);
      assert(entry.transferLimit.length > 32, `${entry.id} should carry a decision-proximate transfer limit.`);
      assert(Array.isArray(entry.receivingSurfaces) && entry.receivingSurfaces.length > 0, `${entry.id} should name at least one receiving surface.`);
      for (const receiver of entry.receivingSurfaces) {
        assert(Object.hasOwn(registry.representations, receiver), `${entry.id} should map only to a registered representation (${receiver}).`);
      }
      assert(Array.isArray(entry.planningSourceKeys) && entry.planningSourceKeys.length > 0, `${entry.id} should name the planning source that explains its implementation use.`);
      for (const sourceKey of entry.planningSourceKeys) {
        const planningPath = STRATEGY_PLANNING_SOURCE_RESOLVER.get(sourceKey);
        assert(planningPath, `${entry.id} should use a planning source key present in the authorized local resolver.`);
        const planningSource = await readFile(resolve(planningPath), "utf8");
        assert(planningSource.includes("strategy-canvas-evidence.v0.1.json"), `${planningPath} should route back to the evidence registry.`);
        assert(planningSource.includes(`\`${entry.id}\``), `${planningPath} should name evidence entry ${entry.id}.`);
      }
    }
    const usedReceivers = new Set(registry.implementationEvidence.flatMap((entry) => entry.receivingSurfaces));
    assert(same([...usedReceivers].sort(), Object.keys(registry.representations).sort()), "Every registered representation should receive at least one evidence item.");
    const socialInfluence = registry.implementationEvidence.find((entry) => entry.id === "independent-before-reveal");
    assert(socialInfluence?.counterevidence?.url === "https://doi.org/10.1073/pnas.1109947108", "Independent-before-reveal evidence should travel with its published counterpoint.");
    assert(registry.claimBoundaries.some((claim) => claim.includes("psychometrically validated")), "Evidence registry should keep the local scale's measurement boundary explicit.");
  });

  await verify("Strategy Canvas evidence · registry copy and sources reach every named representation", async () => {
    const registry = JSON.parse(await readFile(resolve(STRATEGY_EVIDENCE), "utf8"));
    const methodUrl = "https://www.blueoceanstrategy.com/tools/strategy-canvas/";
    for (const [id, representation] of Object.entries(registry.representations)) {
      assert(Array.isArray(representation.receivers) && representation.receivers.length > 0, `${id} should name its receiving artifacts.`);
      for (const file of representation.receivers) {
        const source = await readFile(resolve(file), "utf8");
        const normalized = source.replace(/\s+/g, " ");
        for (const field of ["sourceClaim", "adaptationClaim", "boundaryClaim"]) {
          assert(normalized.includes(representation[field]), `${file} should carry the exact ${id} ${field} from the evidence registry.`);
        }
      }
    }
    const strategyFiles = [CANONICAL, CONTEXT, ...NARRATIVE_COMPOSERS.map((composer) => composer.route), GENOMIC_REPRESENTATION];
    for (const file of strategyFiles) {
      const source = await readFile(resolve(file), "utf8");
      assert(source.includes('data-strategy-canvas-source="method-origin"'), `${file} should expose a visible method-origin marker.`);
      assert(source.includes(methodUrl), `${file} should link the method owners' primary description.`);
    }
    const initiativeSource = await readFile(resolve(INITIATIVE_COSTING), "utf8");
    const fourActionsUrl = registry.relatedMethods.fourActionsFramework.primarySource.url;
    assert(initiativeSource.includes('data-strategy-canvas-source="four-actions-origin"'), "Initiative costing should expose its Four Actions method marker.");
    assert(initiativeSource.includes(`<a href="${fourActionsUrl}">`), "Initiative costing should link its official Four Actions source with ordinary in-place navigation.");
    assert(!initiativeSource.includes(`href="${fourActionsUrl}" target="_blank"`), "The Initiative Costing source should preserve the visitor's browsing-context choice; iframe projection owns separate-tab behavior.");
    assert(registry.representations.initiativeCosting.classification === "strategy-canvas-adjacent-four-actions", "Initiative costing should retain its precise adjacent-method classification.");
    const genomicSource = await readFile(resolve(GENOMIC_REPRESENTATION), "utf8");
    assert(genomicSource.includes('<figcaption class="table-note" data-strategy-canvas-source="method-origin">\n                This static representation adapts the Strategy Canvas'), "The Genomic page should attach the method marker to the Strategy Canvas caption itself.");
    assert(!genomicSource.includes(`href="${methodUrl}" target="_blank"`), "The parent Genomic visitor page should keep ordinary in-place citation navigation.");
    const svg = await readFile(resolve(GENOMIC_SVG), "utf8");
    assert(svg.includes('<metadata id="strategy-method-source">'), "Static Strategy Canvas SVG should carry machine-readable method metadata.");
    assert(svg.includes(`<dc:source rdf:resource="${methodUrl}"/>`), "Static Strategy Canvas SVG metadata should link the primary method source.");
    assert(svg.includes("Strategy Canvas method developed by W. Chan Kim and Renée Mauborgne"), "Static Strategy Canvas SVG metadata should attribute the method without assigning the local artifact to its developers.");
    assert(svg.includes("local qualitative adaptation"), "Static Strategy Canvas SVG metadata should state its local adaptation standing.");
    const buildSource = await readFile(resolve("core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/build.mjs"), "utf8");
    assert(buildSource.includes("strategy-canvas-evidence.v0.1.json") && buildSource.includes("representations?.canonical"), "The canonical builder should consume its evidence registry representation.");
    const publicRouteManifest = JSON.parse(await readFile(resolve("core-architectures-chimeric-prototype-current-pack-v0.1/public-iframe-route-manifest-v1.json"), "utf8"));
    const publicRoute = publicRouteManifest.routes.find((route) => route.id === "strategy-canvas");
    assert(publicRoute.expression === "canonical", "The public Strategy Canvas route should identify its canonical expression.");
    assert(publicRoute.reader_job.includes("canonical worksheet"), "The public Strategy Canvas route should name its canonical worksheet reader job.");
    const fmiHost = await readFile(resolve("context-canvas-project-surface/context-canvas/fmi-lims-eln-replatforming.html"), "utf8");
    assert(fmiHost.includes("embedded canonical worksheet"), "The FMI host should identify the embedded surface as the canonical worksheet.");
    assert(fmiHost.includes("JSON state remains visible"), "The FMI host should use the canonical worksheet's JSON-state term.");
    assert(fmiHost.includes("Open the Strategy Canvas workbench"), "The FMI host should keep the fuller Context workbench as a distinct handoff.");
  });
}

async function main() {
  await mkdir(runDir, { recursive: true });
  await strategyCanvasEvidenceContract();
  await narrativeInlineParityContract();
  const staticServer = await startStaticServer(resolve("."));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const canonicalUrl = `${staticServer.origin}/${CANONICAL}`;
    const contextUrl = `${staticServer.origin}/${CONTEXT}`;
    await canonicalViewportContract(browser, canonicalUrl);
    await canonicalSelectionStateVisualContract(browser, canonicalUrl);
    await canonicalSourceNavigationContract(browser, canonicalUrl);
    await canonicalColumnGeometryContract(browser, canonicalUrl);
    await canonicalInteractionContract(browser, canonicalUrl);
    await canonicalPromptCapsuleContract(browser, canonicalUrl);
    await canonicalRelatedLoopsContract(browser, canonicalUrl);
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

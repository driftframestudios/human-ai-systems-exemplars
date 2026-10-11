import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

import {
  assertTelemetry,
  monitor,
  startStaticServer,
} from "../../tools/core-architecture-browser-helper.mjs";

const route = "/context-canvas-project-surface/context-canvas/who-to-believe-reviews-platform.html";
const repositoryRoot = resolve(import.meta.dirname, "../..");
const pagePath = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/who-to-believe-reviews-platform.html",
);
let browser;
let server;

before(async () => {
  server = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  try {
    await browser?.close();
  } finally {
    await server?.close();
  }
});

async function containExternalCarriers(context) {
  // This graph owns local interaction. Stable stand-ins keep its observations
  // independent from the page's separately tested video and iframe carriers.
  await context.route("https://vik.guru/v1-cdn/video/**", request => request.fulfill({
    status: 200,
    contentType: request.request().url().endsWith(".mp4") ? "video/mp4" : "image/webp",
    body: "",
  }));
  await context.route("https://iframes.vik.guru/**", request => request.fulfill({
    status: 200,
    contentType: "text/html",
    body: "<!doctype html><title>Bounded iframe fixture</title>",
  }));
}

async function waitForGraph(page) {
  await page.waitForFunction(() => document.querySelector("[data-wtb-system-graph]")?.dataset.graphState === "enhanced");
  await page.waitForFunction(() => document.querySelectorAll("[data-graph-svg] .wtb-system-graph__edge").length === 26);
  return page.locator("[data-wtb-system-graph]");
}

for (const width of [390, 820, 1279, 1280]) {
  test(`the source-authentic graph keeps fixed topology and the exact responsive composition at ${width}px`, async t => {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    t.after(() => context.close());
    await containExternalCarriers(context);
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    const telemetry = monitor(page);

    await page.goto(`${server.origin}${route}`, { waitUntil: "load" });
    const graph = await waitForGraph(page);

    assert.equal(await graph.locator(".wtb-system-graph__node").count(), 22);
    assert.equal(await graph.locator(".wtb-system-graph__edge").count(), 26);
    assert.equal(await graph.locator("[marker-end]").count(), 0);
    assert.equal(await graph.locator("[data-route-start], [data-route-end], [data-trace-route], [data-route-previous], [data-route-next]").count(), 0);
    assert.equal(await graph.getByLabel("Symfony PHP monolith").isChecked(), true);
    assert.equal(await graph.getByLabel("All dimensions").isChecked(), true);
    assert.equal(await graph.locator('[data-node-id="household"]').getAttribute("aria-pressed"), "true");
    assert.equal(await graph.locator("[data-detail-title]").textContent(), "Household profile");
    assert.equal(await graph.locator("[data-detail-status]").textContent(), "DEGRADED");
    assert.match(await graph.locator("[data-status-summary]").textContent(), /Working · 4/u);
    assert.match(await graph.locator("[data-status-summary]").textContent(), /Degraded · 8/u);
    assert.match(await graph.locator("[data-status-summary]").textContent(), /Breaking · 10/u);
    assert.equal(await graph.locator(".wtb-system-graph__reading").getAttribute("open"), null);

    const geometry = await graph.evaluate(node => {
      const stage = node.querySelector(".wtb-system-graph__stage");
      const scroller = node.querySelector(".wtb-system-graph__canvas-scroll");
      const svg = node.querySelector("[data-graph-svg]");
      const panel = node.querySelector("[data-detail-panel]");
      const readingContainer = node.closest(".content");
      const readingStyle = getComputedStyle(readingContainer);
      const householdFrame = node.querySelector('[data-node-id="household"] .wtb-system-graph__node-frame');
      const brokenBand = node.querySelector('[data-node-id="graph"] .wtb-system-graph__node-label-band');
      const addresses = node.querySelector('[data-node-id="addresses"]');
      const dots = Array.from(addresses.querySelectorAll(".wtb-system-graph__node-dot"));
      const swatches = Array.from(node.querySelectorAll(".wtb-system-graph__legend-swatch"));
      const canvasBox = scroller.getBoundingClientRect();
      const panelBox = panel.getBoundingClientRect();
      return {
        viewBox: svg.getAttribute("viewBox"),
        svgMinWidth: getComputedStyle(svg).minWidth,
        stageGap: getComputedStyle(stage).gap,
        graphBackground: getComputedStyle(node).backgroundColor,
        graphColor: getComputedStyle(node).color,
        canvasBackground: getComputedStyle(scroller).backgroundColor,
        canvasRadius: getComputedStyle(scroller).borderRadius,
        panelBackground: getComputedStyle(panel).backgroundColor,
        panelColor: getComputedStyle(panel).color,
        panelRadius: getComputedStyle(panel).borderRadius,
        legendBackgrounds: swatches.map(swatch => getComputedStyle(swatch).backgroundColor),
        crossColumnPath: node.querySelector('[data-edge-id="accounts-auth"].wtb-system-graph__edge').getAttribute("d"),
        sameColumnPath: node.querySelector('[data-edge-id="graph-risk"].wtb-system-graph__edge').getAttribute("d"),
        household: {
          x: householdFrame.getAttribute("x"),
          y: householdFrame.getAttribute("y"),
          width: householdFrame.getAttribute("width"),
          height: householdFrame.getAttribute("height"),
          rx: householdFrame.getAttribute("rx"),
          fill: getComputedStyle(householdFrame).fill,
          stroke: getComputedStyle(householdFrame).stroke,
          strokeWidth: getComputedStyle(householdFrame).strokeWidth,
        },
        brokenBand: {
          x: brokenBand.getAttribute("x"),
          y: brokenBand.getAttribute("y"),
          width: brokenBand.getAttribute("width"),
          height: brokenBand.getAttribute("height"),
          fill: getComputedStyle(brokenBand).fill,
        },
        dotDimensions: dots.map(dot => dot.dataset.dimension),
        dotX: dots.map(dot => Number(dot.getAttribute("cx"))),
        stageColumns: getComputedStyle(stage).gridTemplateColumns.split(/\s+/u).filter(Boolean).length,
        canvasTop: canvasBox.top,
        canvasBottom: canvasBox.bottom,
        panelTop: panelBox.top,
        panelWidth: panelBox.width,
        readingContentWidth: readingContainer.clientWidth
          - Number.parseFloat(readingStyle.paddingLeft)
          - Number.parseFloat(readingStyle.paddingRight),
        localScrollWidth: scroller.scrollWidth,
        localClientWidth: scroller.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      };
    });

    assert.equal(geometry.viewBox, "0 0 1130 600");
    assert.equal(geometry.svgMinWidth, "820px");
    assert.equal(geometry.stageGap, "16px");
    assert.equal(geometry.graphBackground, "rgb(251, 238, 234)");
    assert.equal(geometry.graphColor, "rgb(26, 63, 216)");
    assert.equal(geometry.canvasBackground, "rgb(255, 248, 245)");
    assert.equal(geometry.canvasRadius, "0px");
    assert.equal(geometry.panelBackground, "rgb(236, 236, 61)");
    assert.equal(geometry.panelColor, "rgb(26, 63, 216)");
    assert.equal(geometry.panelRadius, "0px");
    assert.deepEqual(geometry.legendBackgrounds, [
      "rgb(26, 63, 216)",
      "rgb(217, 164, 0)",
      "rgb(244, 93, 76)",
    ]);
    assert.equal(geometry.crossColumnPath, "M225 110 C275 110 275 110 325 110");
    assert.equal(geometry.sameColumnPath, "M805 110 C855 110 855 192 805 192");
    assert.deepEqual(geometry.household, {
      x: "35",
      y: "330",
      width: "190",
      height: "52",
      rx: null,
      fill: "rgb(236, 236, 61)",
      stroke: "rgb(26, 63, 216)",
      strokeWidth: "3px",
    });
    assert.deepEqual(geometry.brokenBand, {
      x: "621",
      y: "99",
      width: "178",
      height: "22",
      fill: "rgb(255, 228, 222)",
    });
    assert.deepEqual(geometry.dotDimensions, ["abuse", "core", "misfit"]);
    assert.deepEqual(geometry.dotX, [217, 208, 199]);
    assert.ok(geometry.documentWidth <= geometry.viewportWidth + 1);

    if (geometry.readingContentWidth >= 1200) {
      assert.equal(geometry.stageColumns, 2);
      assert.ok(Math.abs(geometry.panelTop - geometry.canvasTop) <= 1);
      assert.ok(Math.abs(geometry.panelWidth - 300) <= 1);
    } else {
      assert.equal(geometry.stageColumns, 1);
      assert.ok(geometry.panelTop >= geometry.canvasBottom - 1);
    }
    if (width <= 820) assert.ok(geometry.localScrollWidth > geometry.localClientWidth);

    assertTelemetry(telemetry);
  });
}

test("the original comparison, concern, and directional-neighbor interactions remain coherent", async t => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  t.after(() => context.close());
  await containExternalCarriers(context);
  const page = await context.newPage();
  const telemetry = monitor(page);
  await page.goto(`${server.origin}${route}`, { waitUntil: "load" });
  const graph = await waitForGraph(page);

  await graph.getByLabel("Forecasting", { exact: true }).check();
  assert.equal(await graph.locator('[data-node-id="household"]').getAttribute("aria-pressed"), "true");
  assert.equal(await graph.locator('[data-node-id="household"]').getAttribute("data-in-dimension"), "false");
  assert.equal(await graph.locator('[data-node-id="household"]').evaluate(node => getComputedStyle(node).opacity), "0.15");
  assert.equal(await graph.locator("[data-detail-title]").textContent(), "Household profile");
  assert.match(await graph.locator("[data-status-summary]").textContent(), /Working · 4/u);
  assert.equal(await graph.locator("[data-graph-status]").textContent(), "Concern changed to Forecasting.");
  const filteredNamedEdge = await graph.locator('[data-edge-id="household-eligibility"].wtb-system-graph__edge-group').evaluate(group => ({
    groupOpacity: getComputedStyle(group).opacity,
    labelOpacity: getComputedStyle(group.querySelector(".wtb-system-graph__edge-label")).opacity,
    pathOpacity: getComputedStyle(group.querySelector(".wtb-system-graph__edge")).opacity,
  }));
  assert.deepEqual(filteredNamedEdge, {
    groupOpacity: "0.08",
    labelOpacity: "1",
    pathOpacity: "1",
  });

  await graph.getByLabel("Partial Spring Boot migration").check();
  assert.equal(await graph.locator('[data-node-id="household"]').getAttribute("aria-pressed"), "true");
  assert.equal(await graph.locator("[data-detail-status]").textContent(), "BREAKING");
  assert.match(await graph.locator("[data-status-summary]").textContent(), /Working · 11/u);
  assert.match(await graph.locator("[data-status-summary]").textContent(), /Degraded · 10/u);
  assert.match(await graph.locator("[data-status-summary]").textContent(), /Breaking · 1/u);
  assert.equal(await graph.locator("[data-graph-status]").textContent(), "Architecture state changed to Partial Spring Boot migration.");

  await graph.getByLabel("All dimensions").check();
  await graph.locator('[data-node-id="risk"]').click();
  assert.equal(await graph.locator("[data-detail-title]").textContent(), "Risk scoring");
  assert.equal(await graph.locator('.wtb-system-graph__edge[data-selected="true"]').count(), 6);
  assert.equal(await graph.locator(".wtb-system-graph__edge-label").textContent(), "hold");
  assert.equal(await graph.locator("[data-graph-status]").textContent(), "Risk scoring selected.");

  const toFulfillment = graph.locator("[data-detail-neighbors] button", { hasText: "→ Kit fulfillment" });
  assert.equal(
    await toFulfillment.getAttribute("aria-label"),
    "Outgoing connection to Kit fulfillment via hold. Breaking.",
  );
  await toFulfillment.click();
  assert.equal(await graph.locator("[data-detail-title]").textContent(), "Kit fulfillment");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-node-id")), "fulfillment");
  assert.equal(await graph.locator("[data-graph-status]").textContent(), "Kit fulfillment selected.");

  const fromRisk = graph.locator("[data-detail-neighbors] button", { hasText: "← Risk scoring" });
  assert.equal(
    await fromRisk.getAttribute("aria-label"),
    "Incoming connection from Risk scoring via hold. Breaking.",
  );
  await fromRisk.click();
  assert.equal(await graph.locator("[data-detail-title]").textContent(), "Risk scoring");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-node-id")), "risk");
  assert.equal(await graph.locator("[data-graph-status]").textContent(), "Risk scoring selected.");

  const household = graph.locator('[data-node-id="household"]');
  await household.focus();
  await household.press("Enter");
  assert.equal(await graph.locator("[data-detail-title]").textContent(), "Household profile");
  assert.equal(await graph.locator("[data-graph-status]").textContent(), "Household profile selected.");

  const surveys = graph.locator('[data-node-id="surveys"]');
  await surveys.focus();
  await surveys.press("Space");
  assert.equal(await graph.locator("[data-detail-title]").textContent(), "Surveys & reviews");
  assert.equal(await graph.locator("[data-graph-status]").textContent(), "Surveys & reviews selected.");

  await graph.getByLabel("Symfony PHP monolith").check();
  const originalTreatments = await graph.evaluate(node => {
    const degraded = node.querySelector('.wtb-system-graph__edge[data-edge-id="household-eligibility"]');
    const breaking = node.querySelector('.wtb-system-graph__edge[data-edge-id="household-velocity"]');
    const brokenNode = node.querySelector('[data-node-id="graph"]');
    const frame = brokenNode.querySelector(".wtb-system-graph__node-frame");
    return {
      degradedDash: getComputedStyle(degraded).strokeDasharray,
      breakingDash: getComputedStyle(breaking).strokeDasharray,
      hatch: getComputedStyle(frame).fill,
      bandCount: brokenNode.querySelectorAll(".wtb-system-graph__node-label-band").length,
    };
  });
  assert.match(originalTreatments.degradedDash, /2(?:px)?[, ]+4(?:px)?/u);
  assert.match(originalTreatments.breakingDash, /6(?:px)?[, ]+5(?:px)?/u);
  assert.match(originalTreatments.hatch, /url\(/u);
  assert.equal(originalTreatments.bandCount, 1);

  assertTelemetry(telemetry);
});

test("narrow neighbor traversal preserves page position and reveals the focused node within the local graph scroller", async t => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 700 },
    reducedMotion: "reduce",
  });
  t.after(() => context.close());
  await containExternalCarriers(context);
  const page = await context.newPage();
  const telemetry = monitor(page);
  await page.goto(`${server.origin}${route}`, { waitUntil: "load" });
  const graph = await waitForGraph(page);
  const connection = graph.getByRole("button", {
    name: "Outgoing connection to Eligibility rules via dual-write. Degraded.",
  });
  await connection.scrollIntoViewIfNeeded();

  const before = await page.evaluate(() => ({
    pageY: window.scrollY,
    scrollLeft: document.querySelector(".wtb-system-graph__canvas-scroll").scrollLeft,
  }));
  await connection.click();
  const after = await graph.evaluate(node => {
    const scroller = node.querySelector(".wtb-system-graph__canvas-scroll");
    const selected = node.querySelector('[data-node-id="eligibility"]');
    const scrollerBox = scroller.getBoundingClientRect();
    const selectedBox = selected.getBoundingClientRect();
    const visibleLeft = scrollerBox.left + scroller.clientLeft;
    const visibleRight = visibleLeft + scroller.clientWidth;
    return {
      activeNodeId: document.activeElement?.getAttribute("data-node-id"),
      pageY: window.scrollY,
      scrollLeft: scroller.scrollLeft,
      selectedLeft: selectedBox.left,
      selectedRight: selectedBox.right,
      visibleLeft,
      visibleRight,
    };
  });

  assert.equal(after.activeNodeId, "eligibility");
  assert.ok(Math.abs(after.pageY - before.pageY) <= 1, "node focus should preserve the visitor's page position");
  assert.ok(after.scrollLeft > before.scrollLeft, "the graph scroller should reveal a newly selected off-axis node");
  assert.ok(after.selectedLeft >= after.visibleLeft - 1);
  assert.ok(after.selectedRight <= after.visibleRight + 1);
  assertTelemetry(telemetry);
});

test("forced colors preserve checked and selected distinctions", async t => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    forcedColors: "active",
    reducedMotion: "reduce",
  });
  t.after(() => context.close());
  await containExternalCarriers(context);
  const page = await context.newPage();
  const telemetry = monitor(page);
  await page.goto(`${server.origin}${route}`, { waitUntil: "load" });
  const graph = await waitForGraph(page);

  const state = await graph.evaluate(node => {
    const checked = node.querySelector("[data-graph-mode-control]:checked + span");
    const unchecked = node.querySelector("[data-graph-mode-control]:not(:checked) + span");
    const selected = node.querySelector('[data-node-id="household"] .wtb-system-graph__node-frame');
    const unselected = node.querySelector('[data-node-id="accounts"] .wtb-system-graph__node-frame');
    return {
      checkedBackground: getComputedStyle(checked).backgroundColor,
      uncheckedBackground: getComputedStyle(unchecked).backgroundColor,
      selectedFill: getComputedStyle(selected).fill,
      unselectedFill: getComputedStyle(unselected).fill,
    };
  });
  assert.notEqual(state.checkedBackground, state.uncheckedBackground);
  assert.notEqual(state.selectedFill, state.unselectedFill);
  const canvasScroll = graph.locator(".wtb-system-graph__canvas-scroll");
  await canvasScroll.focus();
  const canvasFocus = await canvasScroll.evaluate(node => ({
    active: document.activeElement === node,
    outlineColor: getComputedStyle(node).outlineColor,
    outlineStyle: getComputedStyle(node).outlineStyle,
    outlineWidth: getComputedStyle(node).outlineWidth,
  }));
  assert.equal(canvasFocus.active, true);
  assert.equal(canvasFocus.outlineStyle, "solid");
  assert.ok(Number.parseFloat(canvasFocus.outlineWidth) >= 3);
  assert.notEqual(canvasFocus.outlineColor, "rgba(0, 0, 0, 0)");
  assertTelemetry(telemetry);
});

test("the system graph initializes during direct local-file inspection", async t => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 1000 } });
  t.after(() => context.close());
  await containExternalCarriers(context);

  const page = await context.newPage();
  const telemetry = monitor(page);
  const parsedScripts = [];
  const graphRequestFailures = [];
  const cdp = await context.newCDPSession(page);
  await cdp.send("Debugger.enable");
  cdp.on("Debugger.scriptParsed", event => parsedScripts.push(event.url));
  page.on("requestfailed", request => {
    if (request.url().endsWith("/who-to-believe-system-graph.js")) {
      graphRequestFailures.push(request.failure()?.errorText || "unknown failure");
    }
  });

  await page.goto(pathToFileURL(pagePath).href, { waitUntil: "load" });
  const graph = await waitForGraph(page);

  assert.equal(await graph.locator(".wtb-system-graph__node").count(), 22);
  assert.equal(await graph.locator("[data-graph-enhancement]").isVisible(), true);
  assert.equal(await graph.locator(".wtb-system-graph__reading").getAttribute("open"), null);
  assert.equal(await page.evaluate(() => Object.isFrozen(globalThis.ContextCanvasWhoToBelieveSystemGraph)), true);
  assert.ok(parsedScripts.some(url => url.endsWith("/who-to-believe-system-graph.js")));
  assert.deepEqual(graphRequestFailures, []);
  assertTelemetry(telemetry);
});

test("the complete graph reading remains available without JavaScript", async t => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 1000 },
    javaScriptEnabled: false,
  });
  t.after(() => context.close());
  const page = await context.newPage();
  await page.goto(`${server.origin}${route}`, { waitUntil: "load" });

  const graph = page.locator("[data-wtb-system-graph]");
  assert.equal(await graph.locator("[data-graph-enhancement]").isVisible(), false);
  assert.equal(await graph.locator(".wtb-system-graph__reading").getAttribute("open"), null);
  const reading = await graph.locator(".wtb-system-graph__reading").textContent();
  assert.match(reading, /Member accounts/u);
  assert.match(reading, /AI assistant/u);
  assert.match(reading, /Declared directed connections/u);
});

test("two mounted graphs retain independent controls, state, and accessible names", async t => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  t.after(() => context.close());
  await containExternalCarriers(context);
  const page = await context.newPage();
  const telemetry = monitor(page);
  await page.goto(`${server.origin}${route}`, { waitUntil: "load" });
  await waitForGraph(page);

  const receipt = await page.evaluate(() => {
    const { mountSystemGraph } = globalThis.ContextCanvasWhoToBelieveSystemGraph;
    const original = document.querySelector("[data-wtb-system-graph]");
    const originalController = mountSystemGraph(original);
    const repeatedOriginalController = mountSystemGraph(original);
    const clone = original.cloneNode(true);
    clone.removeAttribute("data-graph-state");
    const cloneController = mountSystemGraph(clone);
    const repeatedCloneController = mountSystemGraph(clone);
    document.body.append(clone);
    clone.querySelector('[data-graph-mode-control][value="spring"]').click();

    const describe = root => {
      const graphTitleId = root.getAttribute("aria-labelledby");
      const detailPanel = root.querySelector("[data-detail-panel]");
      const detailTitleId = detailPanel.getAttribute("aria-labelledby");
      return {
        checkedMode: root.querySelector("[data-graph-mode-control]:checked")?.value,
        detailTitleId,
        detailTitleOwned: root.querySelector(`[id="${detailTitleId}"]`) !== null,
        dimensionNames: [...new Set(Array.from(root.querySelectorAll("[data-graph-dimension-control]"), control => control.name))],
        graphTitleId,
        graphTitleOwned: root.querySelector(`[id="${graphTitleId}"]`) !== null,
        modeNames: [...new Set(Array.from(root.querySelectorAll("[data-graph-mode-control]"), control => control.name))],
      };
    };

    // Mount-local relations let cloned instruments coexist without document-wide ID collisions.
    const mountedRoots = [original, clone];
    const internalIds = mountedRoots.flatMap(root => Array.from(root.querySelectorAll("[id]"), element => element.id));
    const duplicateInternalIds = internalIds.filter((id, index) => internalIds.indexOf(id) !== index);
    const unresolvedLocalIdRefs = mountedRoots.flatMap((root, rootIndex) => {
      const localIds = new Set(Array.from(root.querySelectorAll("[id]"), element => element.id));
      return Array.from(root.querySelectorAll("[aria-labelledby], [aria-describedby]")).flatMap(element => (
        ["aria-labelledby", "aria-describedby"].flatMap(attribute => {
          const references = (element.getAttribute(attribute) || "").trim().split(/\s+/u).filter(Boolean);
          return references
            .filter(id => !localIds.has(id))
            .map(id => ({ attribute, id, rootIndex }));
        })
      ));
    });
    const result = {
      clone: describe(clone),
      cloneState: cloneController.getState().mode,
      duplicateInternalIds,
      original: describe(original),
      originalState: originalController.getState().mode,
      repeatedCloneMountReturnedSameController: repeatedCloneController === cloneController,
      repeatedOriginalMountReturnedSameController: repeatedOriginalController === originalController,
      unresolvedLocalIdRefs,
    };
    cloneController.destroy();
    cloneController.destroy();
    clone.remove();
    return result;
  });

  assert.equal(receipt.original.checkedMode, "symfony");
  assert.equal(receipt.originalState, "symfony");
  assert.equal(receipt.clone.checkedMode, "spring");
  assert.equal(receipt.cloneState, "spring");
  assert.equal(receipt.repeatedOriginalMountReturnedSameController, true);
  assert.equal(receipt.repeatedCloneMountReturnedSameController, true);
  assert.equal(receipt.original.modeNames.length, 1);
  assert.equal(receipt.clone.modeNames.length, 1);
  assert.notEqual(receipt.original.modeNames[0], receipt.clone.modeNames[0]);
  assert.equal(receipt.original.dimensionNames.length, 1);
  assert.equal(receipt.clone.dimensionNames.length, 1);
  assert.notEqual(receipt.original.dimensionNames[0], receipt.clone.dimensionNames[0]);
  assert.equal(receipt.original.graphTitleOwned, true);
  assert.equal(receipt.clone.graphTitleOwned, true);
  assert.notEqual(receipt.original.graphTitleId, receipt.clone.graphTitleId);
  assert.equal(receipt.original.detailTitleOwned, true);
  assert.equal(receipt.clone.detailTitleOwned, true);
  assert.notEqual(receipt.original.detailTitleId, receipt.clone.detailTitleId);
  assert.deepEqual(receipt.duplicateInternalIds, []);
  assert.deepEqual(receipt.unresolvedLocalIdRefs, []);
  assertTelemetry(telemetry);
});

test("mount recovery keeps the semantic fallback and supports a repaired remount", async t => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 1000 } });
  t.after(() => context.close());
  await containExternalCarriers(context);
  const page = await context.newPage();
  const telemetry = monitor(page);
  await page.goto(`${server.origin}${route}`, { waitUntil: "load" });
  await waitForGraph(page);

  const receipt = await page.evaluate(() => {
    const { mountSystemGraph } = globalThis.ContextCanvasWhoToBelieveSystemGraph;
    const original = document.querySelector("[data-wtb-system-graph]");
    const first = mountSystemGraph(original);
    first.destroy();
    first.destroy();
    const remounted = mountSystemGraph(original);
    const repeatedRemount = mountSystemGraph(original);

    const clone = original.cloneNode(true);
    clone.removeAttribute("data-graph-state");
    clone.querySelector("[data-detail-title]").remove();
    document.body.append(clone);
    const fallback = mountSystemGraph(clone);
    const repeatedFallback = mountSystemGraph(clone);
    const fallbackReceipt = {
      ok: fallback.ok,
      state: clone.dataset.graphState,
      enhancementHidden: clone.querySelector("[data-graph-enhancement]").hidden,
      readingOpen: clone.querySelector(".wtb-system-graph__reading").open,
      errorText: clone.querySelector("[data-graph-error]").textContent,
      readingText: clone.querySelector(".wtb-system-graph__reading").textContent,
    };
    fallback.destroy();
    fallback.destroy();

    const repairedTitle = document.createElement("h5");
    repairedTitle.className = "wtb-system-graph__detail-title";
    repairedTitle.dataset.detailTitle = "";
    clone.querySelector("[data-detail-panel]").prepend(repairedTitle);
    const repaired = mountSystemGraph(clone);
    const repeatedRepaired = mountSystemGraph(clone);
    clone.querySelector('[data-graph-mode-control][value="spring"]').click();
    const repairedDetailTitleId = clone.querySelector("[data-detail-panel]").getAttribute("aria-labelledby");
    const repairedReceipt = {
      ok: repaired.ok,
      state: clone.dataset.graphState,
      mode: repaired.getState().mode,
      announcement: clone.querySelector("[data-graph-status]").textContent,
      detailTitleOwned: clone.querySelector(`[id="${repairedDetailTitleId}"]`) !== null,
      enhancementHidden: clone.querySelector("[data-graph-enhancement]").hidden,
      readingOpen: clone.querySelector(".wtb-system-graph__reading").open,
      repeatedMountReturnedSameController: repeatedRepaired === repaired,
    };
    repaired.destroy();
    repaired.destroy();
    const fresh = mountSystemGraph(clone);
    const freshReceipt = {
      controllerChanged: fresh !== repaired,
      mode: fresh.getState().mode,
      ok: fresh.ok,
    };
    fresh.destroy();
    clone.remove();
    remounted.destroy();
    remounted.destroy();

    return {
      remounted: remounted !== first && remounted.ok && repeatedRemount === remounted,
      fallback: fallbackReceipt,
      fallbackMountWasStable: repeatedFallback === fallback,
      fresh: freshReceipt,
      repaired: repairedReceipt,
    };
  });

  assert.equal(receipt.remounted, true);
  const { readingText, ...fallbackState } = receipt.fallback;
  assert.deepEqual(fallbackState, {
    ok: false,
    state: "fallback",
    enhancementHidden: true,
    readingOpen: true,
    errorText: "The complete system reading is ready below. The interactive view needs a repaired data or page structure before it can start.",
  });
  assert.match(readingText, /Member accounts/u);
  assert.equal(receipt.fallbackMountWasStable, true);
  assert.deepEqual(receipt.repaired, {
    ok: true,
    state: "enhanced",
    mode: "spring",
    announcement: "Architecture state changed to Partial Spring Boot migration.",
    detailTitleOwned: true,
    enhancementHidden: false,
    readingOpen: false,
    repeatedMountReturnedSameController: true,
  });
  assert.deepEqual(receipt.fresh, {
    controllerChanged: true,
    mode: "symfony",
    ok: true,
  });
  assert.deepEqual(telemetry.consoleErrors, [
    "Who To Believe system graph startup reported validation errors:\nThe graph requires one detail title ([data-detail-title]).",
  ]);
  assertTelemetry({ ...telemetry, consoleErrors: [] });
});

test("invalid graph JSON and geometry remain in the complete reading until repaired", async t => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 1000 } });
  t.after(() => context.close());
  await containExternalCarriers(context);
  const page = await context.newPage();
  const telemetry = monitor(page);
  await page.goto(`${server.origin}${route}`, { waitUntil: "load" });
  await waitForGraph(page);

  const receipts = await page.evaluate(() => {
    const { mountSystemGraph } = globalThis.ContextCanvasWhoToBelieveSystemGraph;
    const original = document.querySelector("[data-wtb-system-graph]");
    const source = document.getElementById(original.getAttribute("data-contract-id"));
    const acceptedText = source.textContent;

    // A private data block rejects one mount while the page's accepted source stays intact for repair.
    const exercise = (suffix, rejectedText) => {
      const contract = document.createElement("script");
      contract.type = "application/json";
      contract.id = `wtb-system-graph-contract-${suffix}`;
      contract.textContent = rejectedText;
      document.body.append(contract);

      const clone = original.cloneNode(true);
      clone.removeAttribute("data-graph-state");
      clone.setAttribute("data-contract-id", contract.id);
      document.body.append(clone);

      const fallback = mountSystemGraph(clone);
      const repeatedFallback = mountSystemGraph(clone);
      const fallbackReceipt = {
        errors: Array.isArray(fallback.errors) ? [...fallback.errors] : [],
        enhancementHidden: clone.querySelector("[data-graph-enhancement]").hidden,
        errorText: clone.querySelector("[data-graph-error]").textContent,
        ok: fallback.ok,
        readingOpen: clone.querySelector(".wtb-system-graph__reading").open,
        repeatedMountReturnedSameController: repeatedFallback === fallback,
        state: clone.dataset.graphState,
      };
      fallback.destroy();
      fallback.destroy();

      contract.textContent = acceptedText;
      const repaired = mountSystemGraph(clone);
      const repeatedRepaired = mountSystemGraph(clone);
      clone.querySelector('[data-graph-mode-control][value="spring"]').click();
      const repairedReceipt = {
        announcement: clone.querySelector("[data-graph-status]").textContent,
        controllerChanged: repaired !== fallback,
        mode: repaired.getState().mode,
        ok: repaired.ok,
        repeatedMountReturnedSameController: repeatedRepaired === repaired,
        state: clone.dataset.graphState,
      };
      repaired.destroy();
      repaired.destroy();

      const fresh = mountSystemGraph(clone);
      const freshReceipt = {
        controllerChanged: fresh !== repaired,
        mode: fresh.getState().mode,
        ok: fresh.ok,
      };
      fresh.destroy();
      clone.remove();
      contract.remove();
      return { fallback: fallbackReceipt, fresh: freshReceipt, repaired: repairedReceipt };
    };

    const invalidGeometry = JSON.parse(acceptedText);
    invalidGeometry.nodes[0].row = 6;
    return {
      geometry: exercise("invalid-geometry", JSON.stringify(invalidGeometry)),
      json: exercise("invalid-json", "{"),
    };
  });

  for (const receipt of [receipts.geometry, receipts.json]) {
    assert.deepEqual(
      {
        enhancementHidden: receipt.fallback.enhancementHidden,
        errorText: receipt.fallback.errorText,
        ok: receipt.fallback.ok,
        readingOpen: receipt.fallback.readingOpen,
        repeatedMountReturnedSameController: receipt.fallback.repeatedMountReturnedSameController,
        state: receipt.fallback.state,
      },
      {
        enhancementHidden: true,
        errorText: "The complete system reading is ready below. The interactive view needs a repaired data or page structure before it can start.",
        ok: false,
        readingOpen: true,
        repeatedMountReturnedSameController: true,
        state: "fallback",
      },
    );
    assert.deepEqual(receipt.repaired, {
      announcement: "Architecture state changed to Partial Spring Boot migration.",
      controllerChanged: true,
      mode: "spring",
      ok: true,
      repeatedMountReturnedSameController: true,
      state: "enhanced",
    });
    assert.deepEqual(receipt.fresh, {
      controllerChanged: true,
      mode: "symfony",
      ok: true,
    });
  }
  assert.ok(receipts.geometry.fallback.errors.some(error => /nodes\[0\]\.row/u.test(error)));
  assert.ok(receipts.json.fallback.errors.some(error => /invalid JSON/u.test(error)));
  assert.equal(telemetry.consoleErrors.length, 2);
  assert.ok(telemetry.consoleErrors.some(error => /nodes\[0\]\.row/u.test(error)));
  assert.ok(telemetry.consoleErrors.some(error => /invalid JSON/u.test(error)));
  assertTelemetry({ ...telemetry, consoleErrors: [] });
});

test("print keeps the semantic reading and removes the direct-manipulation field", async t => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 1000 } });
  t.after(() => context.close());
  await containExternalCarriers(context);
  const page = await context.newPage();
  const telemetry = monitor(page);
  await page.goto(`${server.origin}${route}`, { waitUntil: "load" });
  await page.emulateMedia({ media: "print" });

  assert.equal(await page.locator("[data-graph-enhancement]").evaluate(node => getComputedStyle(node).display), "none");
  assert.notEqual(await page.locator(".wtb-system-graph__reading").evaluate(node => getComputedStyle(node).display), "none");
  assert.notEqual(await page.locator(".wtb-system-graph__reading > p").evaluate(node => getComputedStyle(node).display), "none");
  assertTelemetry(telemetry);
});

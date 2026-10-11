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

for (const width of [390, 768, 1024, 1440]) {
  test(`the system graph keeps controls, route state, and local containment at ${width}px`, async t => {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
      forcedColors: width === 1440 ? "active" : "none",
    });
    t.after(() => context.close());
    // This receiver owns the local graph behavior. Stable stand-ins keep its
    // observations independent from the page's separately tested media and
    // cross-origin iframe delivery contracts.
    await context.route("https://vik.guru/v1-cdn/video/**", route => route.fulfill({
      status: 200,
      contentType: route.request().url().endsWith(".mp4") ? "video/mp4" : "image/webp",
      body: "",
    }));
    await context.route("https://iframes.vik.guru/**", route => route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Bounded iframe fixture</title>",
    }));
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    const telemetry = monitor(page);

    await page.goto(`${server.origin}${route}`, { waitUntil: "load" });
    const graph = page.locator("[data-wtb-system-graph]");
    await graph.waitFor();
    await page.waitForFunction(() => document.querySelector("[data-wtb-system-graph]")?.dataset.graphState === "enhanced");
    await page.waitForFunction(() => document.querySelectorAll("[data-edge-layer] .wtb-system-graph__edge").length === 26);

    assert.equal(await graph.locator(".wtb-system-graph__node").count(), 22);
    assert.equal(await graph.locator("[data-route-list] li").count(), 4);
    assert.equal(await graph.locator('[data-node-id="accounts"]').first().getAttribute("data-in-route"), "true");
    assert.equal(await graph.locator(".wtb-system-graph__reading").getAttribute("open"), null);

    if (width !== 1440) {
      const readingColors = await graph.evaluate(node => ({
        header: getComputedStyle(node.querySelector(".wtb-system-graph__header p:not(.wtb-system-graph__eyebrow)")).color,
        eyebrow: getComputedStyle(node.querySelector(".wtb-system-graph__eyebrow")).color,
        summary: getComputedStyle(node.querySelector(".wtb-system-graph__reading summary")).color,
      }));
      assert.deepEqual(readingColors, {
        header: "rgb(23, 52, 95)",
        eyebrow: "rgb(36, 64, 216)",
        summary: "rgb(23, 52, 95)",
      });
    }

    await graph.getByLabel("Symfony").check();
    await graph.locator('.wtb-system-graph__node[data-node-id="accounts"]').click();
    assert.equal(await graph.locator("[data-detail-status]").textContent(), "Working");

    await graph.locator("[data-route-start]").selectOption("pv");
    await graph.locator("[data-route-end]").selectOption("accounts");
    await graph.locator("[data-trace-route]").click();
    assert.match(await graph.locator("[data-route-list]").textContent(), /no declared directed route/u);
    assert.match(await graph.locator("[data-graph-status]").textContent(), /Choose another endpoint or concern/u);

    await graph.getByRole("radio", { name: "Forecasting", exact: true }).check();
    assert.equal(await graph.locator("[data-route-start]").inputValue(), "warehouse");
    assert.equal(await graph.locator("[data-route-end]").inputValue(), "brand");
    assert.equal(await graph.locator("[data-route-list] li").count(), 3);
    const outsideNode = graph.locator('.wtb-system-graph__node[data-node-id="accounts"]');
    assert.match(await outsideNode.getAttribute("aria-label"), /Outside the current concern/u);
    assert.match(await outsideNode.locator("[data-node-state]").textContent(), /Outside concern/u);
    assert.equal(await outsideNode.evaluate(node => getComputedStyle(node).opacity), "1");

    await graph.locator("[data-route-next]").click();
    assert.equal(await graph.locator('[data-node-id="prophet"]').first().getAttribute("aria-current"), "step");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-node-id")), "prophet");
    assert.match(await graph.locator("[data-graph-status]").textContent(), /Route step 2 of 3/u);
    const focusedNodeVisibility = await graph.locator('.wtb-system-graph__node[data-node-id="prophet"]').evaluate(node => {
      const scroller = node.closest(".wtb-system-graph__canvas-scroll");
      const nodeBox = node.getBoundingClientRect();
      const scrollerBox = scroller.getBoundingClientRect();
      return {
        left: nodeBox.left >= scrollerBox.left - 1,
        right: nodeBox.right <= scrollerBox.right + 1,
        scrollLeft: scroller.scrollLeft,
      };
    });
    assert.equal(focusedNodeVisibility.left, true);
    assert.equal(focusedNodeVisibility.right, true);
    if (width === 390) assert.ok(focusedNodeVisibility.scrollLeft > 0);

    if (width === 1440) {
      const forcedColorState = await graph.evaluate(node => {
        const checked = node.querySelector('input[name="wtb-system-dimension"][value="forecast"] + span');
        const unchecked = node.querySelector('input[name="wtb-system-dimension"][value="all"] + span');
        const selected = node.querySelector('.wtb-system-graph__node[data-node-id="prophet"]');
        const unselected = node.querySelector('.wtb-system-graph__node[data-node-id="accounts"]');
        return {
          checkedBackground: getComputedStyle(checked).backgroundColor,
          uncheckedBackground: getComputedStyle(unchecked).backgroundColor,
          selectedBackground: getComputedStyle(selected).backgroundColor,
          unselectedBackground: getComputedStyle(unselected).backgroundColor,
        };
      });
      assert.notEqual(forcedColorState.checkedBackground, forcedColorState.uncheckedBackground);
      assert.notEqual(forcedColorState.selectedBackground, forcedColorState.unselectedBackground);
    }

    await graph.locator('[data-detail-neighbors] .wtb-system-graph__neighbor[data-node-id="brand"]').click();
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-node-id")), "brand");
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("wtb-system-graph__node")), true);

    const containment = await graph.evaluate(node => {
      const scroll = node.querySelector(".wtb-system-graph__canvas-scroll");
      const graphBox = node.getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        graphLeft: graphBox.left,
        graphRight: graphBox.right,
        localScrollWidth: scroll.scrollWidth,
        localClientWidth: scroll.clientWidth,
      };
    });
    assert.ok(containment.documentWidth <= containment.viewportWidth + 1);
    assert.ok(containment.graphLeft >= -1);
    assert.ok(containment.graphRight <= containment.viewportWidth + 1);
    if (width === 390) assert.ok(containment.localScrollWidth > containment.localClientWidth);

    assertTelemetry(telemetry);
  });
}

test("the system graph initializes during direct local-file inspection", async t => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 1000 } });
  t.after(() => context.close());
  await context.route("https://vik.guru/v1-cdn/video/**", route => route.fulfill({ status: 200, body: "" }));
  await context.route("https://iframes.vik.guru/**", route => route.fulfill({
    status: 200,
    contentType: "text/html",
    body: "<!doctype html><title>Bounded iframe fixture</title>",
  }));

  const page = await context.newPage();
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
  await page.waitForFunction(() => document.querySelector("[data-wtb-system-graph]")?.dataset.graphState === "enhanced");
  await page.waitForFunction(() => document.querySelectorAll("[data-edge-layer] .wtb-system-graph__edge").length === 26);

  const graph = page.locator("[data-wtb-system-graph]");
  assert.equal(await graph.locator(".wtb-system-graph__node").count(), 22);
  assert.equal(await graph.locator("[data-graph-enhancement]").isVisible(), true);
  assert.equal(await graph.locator(".wtb-system-graph__reading").getAttribute("open"), null);
  assert.equal(await page.evaluate(() => Object.isFrozen(globalThis.ContextCanvasWhoToBelieveSystemGraph)), true);
  assert.ok(
    parsedScripts.some(url => url.endsWith("/who-to-believe-system-graph.js")),
    "Chromium should parse the graph controller during direct-file inspection",
  );
  assert.deepEqual(graphRequestFailures, []);
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
  assert.match(reading, /Brand pharmacovigilance/u);
  assert.match(reading, /Declared directed connections/u);
});

test("mount recovery keeps the semantic fallback and supports a repaired remount", async t => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 1000 } });
  t.after(() => context.close());
  await context.route("https://vik.guru/v1-cdn/video/**", route => route.fulfill({ status: 200, body: "" }));
  await context.route("https://iframes.vik.guru/**", route => route.fulfill({
    status: 200,
    contentType: "text/html",
    body: "<!doctype html><title>Bounded iframe fixture</title>",
  }));
  const page = await context.newPage();
  await page.goto(`${server.origin}${route}`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("[data-wtb-system-graph]")?.dataset.graphState === "enhanced");

  const receipt = await page.evaluate(() => {
    const { mountSystemGraph } = globalThis.ContextCanvasWhoToBelieveSystemGraph;
    const original = document.querySelector("[data-wtb-system-graph]");
    const first = mountSystemGraph(original);
    first.destroy();
    const remounted = mountSystemGraph(original);

    const clone = original.cloneNode(true);
    clone.removeAttribute("data-graph-state");
    clone.querySelector("[data-detail-title]").remove();
    document.body.append(clone);
    const fallback = mountSystemGraph(clone);
    const fallbackReceipt = {
      ok: fallback.ok,
      state: clone.dataset.graphState,
      enhancementHidden: clone.querySelector("[data-graph-enhancement]").hidden,
      readingOpen: clone.querySelector(".wtb-system-graph__reading").open,
      errorText: clone.querySelector("[data-graph-error]").textContent,
      readingText: clone.querySelector(".wtb-system-graph__reading").textContent,
    };
    fallback.destroy();

    const repairedTitle = document.createElement("h5");
    repairedTitle.dataset.detailTitle = "";
    clone.querySelector(".wtb-system-graph__detail").prepend(repairedTitle);
    const repaired = mountSystemGraph(clone);
    const repairedReceipt = {
      ok: repaired.ok,
      state: clone.dataset.graphState,
      enhancementHidden: clone.querySelector("[data-graph-enhancement]").hidden,
      readingOpen: clone.querySelector(".wtb-system-graph__reading").open,
    };
    repaired.destroy();
    clone.remove();

    return {
      remounted: remounted !== first && remounted.ok,
      fallback: fallbackReceipt,
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
    errorText: "The complete system reading is ready below. The interactive controls need a repaired data or page structure before they can start.",
  });
  assert.match(readingText, /Member accounts/u);
  assert.deepEqual(receipt.repaired, { ok: true, state: "enhanced", enhancementHidden: false, readingOpen: false });
});

test("print keeps the semantic reading and removes the direct-manipulation field", async t => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 1000 } });
  t.after(() => context.close());
  const page = await context.newPage();
  await page.goto(`${server.origin}${route}`, { waitUntil: "load" });
  await page.emulateMedia({ media: "print" });

  assert.equal(await page.locator("[data-graph-enhancement]").evaluate(node => getComputedStyle(node).display), "none");
  assert.notEqual(await page.locator(".wtb-system-graph__reading").evaluate(node => getComputedStyle(node).display), "none");
  assert.notEqual(await page.locator(".wtb-system-graph__reading > p").evaluate(node => getComputedStyle(node).display), "none");
});

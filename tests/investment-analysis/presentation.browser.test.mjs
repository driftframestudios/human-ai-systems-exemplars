import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createCanvasPackagePlan } from "../../tools/package-canvas-iframe-routes.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const routes = ["initiative-costing-calculator", "cross-functional-investment-model-studio"];
const captions = ["Decision-changing measures", "Commercial cohort and price realization", "Lifecycle event graph", "Incremental alternatives", "Discount sensitivity, same cash flows", "Service budget and capacity", "Cost-consequence view", "Shared domain and record contract", "Five domains, five cross-cutting record types"];
const widths = [320, 390, 700, 701, 980, 981, 1150, 1151, 1180, 1181, 1239, 1440, 2560];

// A Range observes the individual token, rather than rejecting useful multiline phrases.
function fragmentedTokens(table) {
  const fragments = [];
  for (const cell of table.querySelectorAll("th,td")) {
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement.closest(".investment-identifier")) continue;
      for (const match of node.textContent.matchAll(/[+-]?\d[\d,]*(?:\.\d+)?(?:[eE][+-]?\d+)?|[\p{L}\p{M}]+(?:'[\p{L}\p{M}]+)?/gu)) {
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        if (new Set(Array.from(range.getClientRects(), rect => Math.round(rect.top))).size > 1) fragments.push(match[0]);
      }
    }
  }
  return fragments;
}

// This declared extraction channel uses native headers and supplementary row metadata.
function detachedRows(table) {
  const purpose = table.caption.textContent;
  const headers = Array.from(table.tHead.rows[0].cells, cell => cell.textContent);
  return Array.from(table.tBodies[0].rows, row => ({
    purpose, label: row.dataset.label, key: row.dataset.recordKey,
    fields: Array.from(row.cells, (cell, index) => ({ field: headers[index], label: cell.dataset.label, value: cell.textContent }))
  }));
}

test("investment chapters retain readable, navigable, source-grounded screen and report accounts", { timeout: 240000 }, async () => {
  const plan = await createCanvasPackagePlan();
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const file = path.resolve(root, "." + pathname);
      if (!file.startsWith(root)) { response.writeHead(403); response.end(); return; }
      const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png", ".webp": "image/webp" };
      response.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
      response.end(await readFile(file));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({ headless: true });
  const artifacts = path.join(root, ".visual-runs/investment-cohesion");
  await mkdir(artifacts, { recursive: true });
  try {
    for (const route of routes) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      page.setDefaultTimeout(7000);
      await page.goto(`${origin}/collaboration/${route}/index.html`);
      await page.waitForFunction(() => Boolean(window.investmentAnalysis));
      assert.deepEqual(errors, []);
      assert.equal(await page.locator("[data-investment-analysis] details[open]").count(), 0);
      assert.equal(await page.locator("[data-summary]").isVisible(), true);
      assert.equal(await page.locator(".investment-analysis h2").count(), 1);
      const initial = await page.evaluate(() => window.investmentAnalysis.getState());

      if (route === routes[0]) {
        assert.equal(await page.locator('.page-nav a[href="#investment-analysis-title"]').count(), 1);
        await page.getByRole("button", { name: "Direct receipts", exact: true }).click();
        const receipt = page.locator("#analysis-direct-receipts").getByRole("link", { name: "Cohort, pricing, and implementation", exact: true });
        await receipt.focus();
        await page.keyboard.press("Enter");
        assert.equal(await page.locator("#analysis-commercial-title").evaluate(el => el === document.activeElement && el.closest("details").open), true);
        await page.locator("#analysis-newCustomers").fill("40");
        assert.match(await page.locator("#analysis-direct-receipts").textContent(), /250 USD\/customer/);
        assert.equal(await page.locator("#analysis-newCustomers").evaluate(el => el === document.activeElement), true);
        assert.equal(await page.locator("#summary-tab-receipts").getAttribute("aria-pressed"), "true");
      } else {
        await page.locator("header.hero").getByRole("link", { name: "Compare layered investment", exact: true }).click();
        assert.equal(await page.locator("#investment-analysis-title").evaluate(el => el === document.activeElement), true);
        const geometry = await page.locator(".investment-analysis").evaluate(el => ({ width: el.getBoundingClientRect().width, parent: el.parentElement.getBoundingClientRect().width }));
        assert.ok(geometry.width >= geometry.parent - 4, "the comparison occupies the full chapter width");
        assert.equal(await page.locator(".hero-grid > *").count(), 2);
      }

      await page.locator(".investment-analysis details").evaluateAll(nodes => nodes.forEach(node => { node.open = true; }));
      for (const width of widths) {
        await page.setViewportSize({ width, height: width === 1239 || width === 1151 ? 501 : 1000 });
        const geometry = await page.locator(".investment-analysis").evaluate(el => ({ left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right, width: innerWidth }));
        assert.ok(geometry.left >= 0 && geometry.right <= width + 1, `${route} chapter containment at ${width}`);
        for (const caption of captions) {
          const table = page.getByRole("table", { name: caption, exact: true });
          assert.deepEqual(await table.evaluate(fragmentedTokens), [], `${route}: ${caption}, ${width}`);
          assert.equal(await table.locator("tbody tr[data-label]").count(), await table.locator("tbody tr").count());
          assert.equal(await table.locator("th[data-label]").count(), await table.locator("th").count());
          const region = table.locator("..");
          await region.focus();
          assert.equal(await region.evaluate(el => el === document.activeElement && el.getBoundingClientRect().right <= innerWidth + 1), true);
        }
        if (route === routes[1]) {
          await page.getByRole("table", { name: "Cost-consequence view", exact: true }).scrollIntoViewIfNeeded();
          assert.equal(await page.locator(".investment-analysis").evaluate(el => {
            const chapter = el.getBoundingClientRect();
            const inspector = document.querySelector(".inspector").getBoundingClientRect();
            return inspector.bottom <= chapter.top + 1;
          }), true, `the first-chapter inspector stays clear of the comparison at ${width}`);
        }
        if (route === routes[0] && width === 1151) {
          const rail = page.locator(".page-nav");
          await page.locator('.page-nav a[href="#investment-analysis-title"]').focus();
          assert.equal(await rail.evaluate(el => {
            const link = document.activeElement.getBoundingClientRect(), bounds = el.getBoundingClientRect();
            return bounds.top >= 0 && bounds.bottom <= innerHeight && link.top >= bounds.top && link.bottom <= bounds.bottom;
          }), true);
        }
      }

      const fixture = structuredClone(initial);
      fixture.inputs.currency = "EUR";
      fixture.inputs.period = "quarter";
      fixture.inputs.label = 'A < B & "paired" comparison';
      fixture.inputs.owner = "Named reviewer";
      fixture.alternatives.reverse();
      fixture.alternatives.find(alternative => alternative.id === "proceed").label = 'Proceed <carefully> & retain the operating comparison';
      fixture.serviceOutcomes[0] = { ...fixture.serviceOutcomes[0], standing: "locally-verified", unit: "event", baseline: 0, candidate: 2, source: 'Local <evidence> & "review" '.repeat(15) };
      fixture.outcomes[0].probability = null;
      fixture.outcomes[1].probability = 0;
      fixture.outcomes[2].probability = " ";
      await page.evaluate(state => window.investmentAnalysis.importState(JSON.stringify(state)), fixture);
      const alternatives = await page.getByRole("table", { name: "Incremental alternatives", exact: true }).evaluate(detachedRows);
      const consequences = await page.getByRole("table", { name: "Cost-consequence view", exact: true }).evaluate(detachedRows);
      const proceed = alternatives.find(row => row.key === "proceed");
      assert.match(proceed.label, /Incremental alternatives: Proceed <carefully> & retain/);
      assert.match(proceed.label, /EUR \/ quarter; illustrative/);
      assert.match(proceed.fields.find(field => field.field === "NPV").value, /EUR/);
      assert.ok(alternatives.every(row => row.fields.every(field => field.field === field.label)));
      assert.ok(consequences.every(row => row.fields.every(field => field.field === field.label)));
      assert.match(consequences[1].fields.at(-1).value, /unavailable/);
      assert.match(consequences[0].fields.at(-1).value, /Local <evidence> & "review"/);
      assert.equal(await page.locator(".investment-analysis carefully,.investment-analysis evidence").count(), 0);
      await page.setViewportSize({ width: 1239, height: 501 });
      for (const caption of captions) assert.deepEqual(await page.getByRole("table", { name: caption, exact: true }).evaluate(fragmentedTokens), [], caption + " with retained fixture");
      await page.getByRole("table", { name: route === routes[0] ? "Incremental alternatives" : "Cost-consequence view", exact: true }).screenshot({ path: path.join(artifacts, "after-" + route + ".png") });

      const fingerprint = await page.evaluate(() => window.investmentAnalysis.fingerprint());
      await page.locator("#analysis-label").fill("x".repeat(2001));
      await page.locator("#analysis-events").fill("[");
      assert.equal(await page.evaluate(() => window.investmentAnalysis.fingerprint()), fingerprint);
      if (route === routes[0]) {
        assert.match(await page.locator("#investment-summary").textContent(), /EUR \/ quarter/);
        assert.match(await page.locator("#analysis-direct-receipts").textContent(), /1 of 9 dimensions are recorded as locally verified/);
        const popupPromise = context.waitForEvent("page");
        await page.getByRole("button", { name: "Open report in a new tab", exact: true }).click();
        const report = await popupPromise;
        await report.waitForLoadState("domcontentloaded");
        assert.equal(await report.locator(".investment-report").getAttribute("data-state-fingerprint"), fingerprint);
        assert.match(await report.locator(".investment-report").textContent(), /A < B & "paired" comparison/);
        assert.equal(await report.locator("script").count(), 0);
        assert.match(await report.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content"), /default-src 'none'/);
        assert.equal(await report.locator('meta[name="author"]').count(), 1);
        assert.equal(await report.locator('meta[name="author"]').getAttribute("content"), "Vikrant Varun Kudesia");
        assert.match(await report.locator("footer").textContent(), /Vikrant Varun Kudesia/);
        assert.match(await report.locator(".investment-report").textContent(), /Formula version: 0\.1\.0/);
        const download = await report.getByRole("link", { name: "Download HTML", exact: true }).getAttribute("href");
        const downloaded = await context.newPage();
        await downloaded.setContent(decodeURIComponent(download.slice(download.indexOf(",") + 1)));
        assert.equal(await downloaded.locator(".investment-report").textContent(), await report.locator(".investment-report").textContent());
        const reportRows = await report.getByRole("table", { name: "Incremental alternatives", exact: true }).evaluate(detachedRows);
        assert.deepEqual(reportRows, alternatives);
        assert.match(await report.locator(".investment-report .state-receipts").textContent(), /1 of 9 dimensions are recorded as locally verified/);
        const probabilities = await report.getByRole("table", { name: "Outcome tree: supplied probabilities and cash flows", exact: true }).locator('tbody td[data-label="Probability"]').allTextContents();
        assert.deepEqual(probabilities, ["unavailable", "0", "unavailable"]);
        for (const link of await report.locator('.state-receipt-route a').all()) {
          const target = await link.getAttribute("href");
          assert.equal(await report.locator(target).count(), 1);
        }
        await report.setViewportSize({ width: 390, height: 844 });
        assert.deepEqual(await report.getByRole("table", { name: "Incremental alternatives", exact: true }).evaluate(fragmentedTokens), []);
        await report.emulateMedia({ media: "print" });
        assert.equal(await report.locator(".investment-report tbody tr").first().isVisible(), true);
        assert.equal(await report.getByRole("table", { name: "Incremental alternatives", exact: true }).evaluate(el => el.getBoundingClientRect().right <= innerWidth + 1), true);
        await page.locator("#analysis-label").fill("Next accepted scenario");
        assert.equal(await report.locator(".investment-report").getAttribute("data-state-fingerprint"), fingerprint);
        const nextPopup = context.waitForEvent("page");
        await page.getByRole("button", { name: "Open report in a new tab", exact: true }).click();
        const next = await nextPopup;
        await next.waitForLoadState("domcontentloaded");
        assert.equal(await next.locator(".investment-report").getAttribute("data-state-fingerprint"), await page.evaluate(() => window.investmentAnalysis.fingerprint()));
        await next.close(); await report.close(); await downloaded.close();
      }

      await page.locator(".investment-analysis details").evaluateAll(nodes => nodes.forEach((node, index) => { node.open = index % 2 === 0; }));
      const retained = await page.locator(".investment-analysis details").evaluateAll(nodes => nodes.map(node => node.open));
      await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
      assert.equal(await page.locator("[data-summary]").isVisible(), true);
      await page.emulateMedia({ media: "print", forcedColors: "none" });
      await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
      assert.equal(await page.locator(".investment-analysis details:not([open])").count(), 0);
      await page.evaluate(() => dispatchEvent(new Event("afterprint")));
      assert.deepEqual(await page.locator(".investment-analysis details").evaluateAll(nodes => nodes.map(node => node.open)), retained);
      assert.deepEqual(errors, []);
      await context.close();

      const nojs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
      const staticPage = await nojs.newPage();
      await staticPage.goto(`${origin}/collaboration/${route}/index.html#investment-analysis-title`);
      await staticPage.locator(".investment-static-overview summary").focus();
      await staticPage.keyboard.press("Enter");
      const overview = staticPage.getByRole("table", { name: captions.at(-1), exact: true });
      assert.equal(await overview.isVisible(), true);
      assert.deepEqual(await overview.evaluate(fragmentedTokens), []);
      await nojs.close();
    }

    // The actual About carrier keeps its declared sandbox, while local package bytes supply the child.
    const aboutContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await aboutContext.route("https://iframes.vik.guru/**", async route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === "/v1/canvas/cross-functional-investment-studio/") {
        await route.fulfill({ status: 200, contentType: "text/html", body: plan.outputFiles.get("cross-functional-investment-studio/index.html") });
      } else await route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Adjacent carrier outside this check</title>" });
    });
    const about = await aboutContext.newPage();
    await about.goto(origin + "/context-canvas-project-surface/context-canvas/index.html");
    const frame = about.frameLocator('iframe[title="Interactive Cross-Functional Investment Studio"]');
    await frame.locator("[data-investment-analysis]:not([hidden])").waitFor();
    await frame.getByRole("button", { name: "Direct receipts", exact: true }).click();
    await frame.locator("#analysis-direct-receipts").getByRole("link", { name: "Decision owner, gate, and revisit", exact: true }).click();
    await frame.locator("#analysis-owner").waitFor({ state: "visible" });
    assert.equal(await frame.locator("#analysis-owner").isVisible(), true);
    const popupPromise = aboutContext.waitForEvent("page");
    await frame.getByRole("button", { name: "Open report in a new tab", exact: true }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded");
    assert.equal(await popup.getByRole("heading", { name: "Layered investment comparison", exact: true }).count(), 1);
    assert.equal(await popup.evaluate(() => window.opener === null), true);
    const counterpart = about.getByRole("table", { name: "Cross-Functional Investment Studio: static counterpart to the editable analysis", exact: true });
    assert.equal(await counterpart.locator("tbody tr[data-label]").count(), 5);
    await aboutContext.close();
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

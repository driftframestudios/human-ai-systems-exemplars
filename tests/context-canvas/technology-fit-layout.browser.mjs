import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { after, before, test } from "node:test";
import { chromium, firefox, webkit } from "@playwright/test";
import { startStaticServer } from "../../tools/core-architecture-browser-helper.mjs";

const route = "/context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/technology-fit-sampling-tableau/technology-fit-sampling-tableau-chimeric-prototype-v0.2.html";
const output = new URL("../../.visual-runs/technology-fit-layout/", import.meta.url);
const widths = [320, 390, 779, 780, 781, 1440, 2560];
let server;

before(async () => {
  server = await startStaticServer();
  await mkdir(output, { recursive: true });
});
after(async () => server?.close());

async function openPage(browser, width, options = {}) {
  const page = await browser.newPage({
    viewport: { width, height: 1000 }, reducedMotion: "reduce", ...options,
  });
  await page.goto(`${server.origin}${route}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.technologyFitSamplingTableau && document.querySelector("#baselineRunSelect option"));
  return page;
}

async function readingGeometry(page) {
  return page.evaluate(() => {
    const rectangle = element => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    };
    const issues = [];
    for (const header of document.querySelectorAll(".panel-header")) {
      const bounds = rectangle(header);
      if (bounds.left < -1 || bounds.right > innerWidth + 1) issues.push("header leaves the viewport");
      for (const pill of header.querySelectorAll(".pill")) {
        if (pill.scrollWidth > pill.clientWidth + 1) issues.push(`status text exceeds its pill: ${pill.textContent.trim().slice(0,50)}`);
        const pillBounds = rectangle(pill);
        const walker = document.createTreeWalker(pill, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (!node.textContent.trim() || node.parentElement.closest("select, option")) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const box of range.getClientRects()) {
            if (box.width && box.height && (box.left < pillBounds.left - 1 || box.right > pillBounds.right + 1 || box.top < pillBounds.top - 1 || box.bottom > pillBounds.bottom + 1)) {
              issues.push(`status text leaves its visible pill: ${node.textContent.trim().slice(0,50)}`);
            }
          }
        }
      }
      for (const control of header.querySelectorAll("input, select, button")) {
        const box = rectangle(control);
        if (box.left < bounds.left - 1 || box.right > bounds.right + 1) issues.push(`header control leaves its owner: ${control.id}`);
      }
      if (innerWidth <= 780) {
        const children = [...header.children];
        for (let index = 1; index < children.length; index++) {
          if (rectangle(children[index]).top < rectangle(children[index - 1]).bottom - 1) issues.push("narrow heading and controls overlap their reading rows");
        }
      }
    }
    const scrollRegions = [...document.querySelectorAll(".svg-wrap, .table-wrap")].map(element => ({
      ...rectangle(element), width: element.clientWidth, scrollWidth: element.scrollWidth,
      overflow: getComputedStyle(element).overflowX,
    }));
    return { issues, documentWidth: document.documentElement.scrollWidth, viewport: innerWidth, scrollRegions };
  });
}

async function assertReading(page) {
  const geometry = await readingGeometry(page);
  assert.equal(geometry.documentWidth, geometry.viewport, "the document stays within the viewport");
  assert.deepEqual(geometry.issues, [], "header labels and native controls remain complete and contained");
  for (const region of geometry.scrollRegions) {
    assert.ok(region.left >= -1 && region.right <= geometry.viewport + 1, "data scroll region stays within the viewport");
    assert.equal(region.overflow, "auto", "tables and charts retain their local scroll owner");
  }
  if (geometry.viewport === 390) {
    assert.ok(geometry.scrollRegions.some(region => region.scrollWidth > region.width + 100), "wide data remains inspectable through local scrolling");
  }
}

for (const [name, engine] of [["Chromium", chromium], ["Firefox", firefox], ["WebKit", webkit]]) {
  test(`${name}: Technology Fit header reading and controls`, async t => {
    const browser = await engine.launch();
    try {
      for (const width of widths) {
        await t.test(`complete header reading at ${width}px`, async () => {
          const page = await openPage(browser, width);
          try {
            await assertReading(page);
            if (width === 390 || width === 1440) {
              await page.locator("#compare .panel-header").evaluate(element => element.scrollIntoView({ block: "start" }));
              await page.evaluate(() => scrollBy(0, -65));
              await page.screenshot({ path: new URL(`${name.toLowerCase()}-${width}.png`, output).pathname });
            }
          } finally { await page.close(); }
        });
      }
      await t.test("native comparison controls update state and keep the reading intact", async () => {
        const page = await openPage(browser, 390);
        try {
          const options = await page.locator("#baselineRunSelect option").evaluateAll(elements => elements.map(element => element.value));
          assert.ok(options.length >= 2, "the seeded comparison offers two distinct runs");
          await page.locator("#baselineRunSelect").selectOption(options[1]);
          await page.locator("#comparisonRunSelect2").selectOption(options[0]);
          const state = await page.evaluate(() => window.technologyFitSamplingTableau.getState());
          assert.equal(state.comparison.baselineRunId, options[1]);
          assert.equal(state.comparison.comparisonRunId, options[0]);
          await assertReading(page);
        } finally { await page.close(); }
      });
      await t.test("long comparison names retain native state and keyboard reachability", async () => {
        const page = await openPage(browser, 320);
        try {
          const label = "Run B — evidence-enriched comparison with complete methodological context and a maintained recovery route";
          const options = await page.locator("#baselineRunSelect option").evaluateAll(elements => elements.map(element => element.value));
          await page.locator("#baselineRunSelect").selectOption(options[1]);
          await page.locator("#baselineRunSelect option").nth(1).evaluate((element, text) => { element.textContent = text; }, label);
          assert.ok((await page.locator("#baselineRunSelect").ariaSnapshot()).includes(label), "the native menu retains the complete selected option name");
          assert.equal(await page.locator("#baselineRunSelect").inputValue(), options[1]);
          assert.equal(await page.evaluate(() => window.technologyFitSamplingTableau.getState().comparison.baselineRunId), options[1]);
          await page.locator("#baselineRunSelect").focus();
          await page.keyboard.press("Tab");
          assert.equal(await page.evaluate(() => document.activeElement.id), "comparisonRunSelect2", "keyboard traversal reaches the next native comparison control");
          await assertReading(page);
        } finally { await page.close(); }
      });
      await t.test("enlarged header text remains complete", async () => {
        const page = await openPage(browser, 390);
        try {
          await page.addStyleTag({ content: ".panel-header { font-size: 200%; } .panel-header .pill { font-size: 1em; }" });
          await assertReading(page);
        } finally { await page.close(); }
      });
      await t.test("the oracle rejects the prior compressed header behavior", async () => {
        const page = await openPage(browser, 390);
        try {
          await assertReading(page);
          const prior = await page.addStyleTag({ content: ".panel-header { flex-direction: row; } .panel-header .toolbar { width: auto; } .panel-header .pill { flex-wrap: nowrap; overflow-wrap: normal; overflow: hidden; } .panel-header select { overflow: visible; }" });
          const damaged = await readingGeometry(page);
          assert.ok(damaged.issues.some(issue => issue.includes("status text")), "restoring the original layout must expose incomplete status labels");
          if (name === "WebKit") assert.ok(damaged.documentWidth > damaged.viewport, "the prior native-control layout exposes page overflow in WebKit");
          await prior.evaluate(element => element.remove());
          await assertReading(page);
        } finally { await page.close(); }
      });
    } finally { await browser.close(); }
  });
}

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { after, before, test } from "node:test";
import { chromium, expect, firefox, webkit } from "@playwright/test";
import { startStaticServer } from "../../tools/core-architecture-browser-helper.mjs";

const visitorRoot = "/context-canvas-project-surface/context-canvas/";
const output = new URL("../../.visual-runs/debrief-reading-layout/", import.meta.url);
const targets = ["genomic-viewer-replatforming.html", "fmi-clinical-trial-coordination.html"];
const family = [
  ...targets,
  "choose-your-player-humatics.html",
  "ehr-discrete-genomic-result.html",
  "ehr-interface-engine-replatform.html",
  "ehr-pgx-alert-failure.html",
  "ehr-three-front-doors.html",
  "ehr-two-charts-one-result.html",
  "multilingual-clinical-vocabulary-practice.html",
  "recoverable-enterprise-forms.html",
  "spatial-capture-collaborative-memory.html",
];
const viewports = [
  { width: 390, height: 844 },
  { width: 1359, height: 1000 },
  { width: 1360, height: 1000 },
  { width: 1361, height: 1000 },
  { width: 1512, height: 982 },
  { width: 2560, height: 1440 },
];
let server;

before(async () => {
  server = await startStaticServer();
  await mkdir(output, { recursive: true });
});
after(async () => server?.close());

async function openPage(browser, route, options = {}) {
  const { enlargedInitially = false, ...contextOptions } = options;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    ...contextOptions,
  });
  // This contract observes the parent reading. Remote instruments and video
  // have separate delivery and interaction owners; no live service is needed.
  await context.route("**/*", async request => {
    const url = new URL(request.request().url());
    if (url.origin === server.origin && !url.pathname.startsWith("/v1-cdn/")) {
      if (enlargedInitially && url.pathname === `${visitorRoot}${route}`) {
        const response = await request.fetch();
        return request.fulfill({ response, body: (await response.text()).replace(
          "</head>", "<style>html { font-size: 200%; }</style></head>",
        ) });
      }
      return request.continue();
    }
    return request.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Parent reading observation</title>",
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  await page.goto(`${server.origin}${visitorRoot}${route}`, { waitUntil: "load" });
  // The source uses local system fonts. Firefox's FontFaceSet.ready can remain
  // pending with scripting disabled even after the complete document loads.
  if (options.javaScriptEnabled !== false) await page.evaluate(() => document.fonts.ready);
  return { page, close: () => context.close() };
}

async function observeReading(page) {
  return page.evaluate(() => {
    const rect = box => ({
      left: box.left, right: box.right, top: box.top, bottom: box.bottom,
      width: box.width, height: box.height,
    });
    const box = node => rect(node.getBoundingClientRect());
    const positive = value => value.width > 0 && value.height > 0;
    const fragments = root => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const result = [];
      let node;
      while ((node = walker.nextNode())) {
        const start = node.textContent.search(/\S/u);
        if (start < 0) continue;
        const end = node.textContent.search(/\s*$/u);
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        const style = getComputedStyle(node.parentElement);
        // WebKit can return empty extra rectangles around a multicol spanner.
        // Only nonempty ranges establish text-fragment geometry.
        const boxes = [...range.getClientRects()].map(rect).filter(positive);
        result.push({
          text: node.textContent.slice(start, end), boxes,
          visible: style.display !== "none" && style.visibility === "visible",
        });
      }
      return result;
    };
    const movementHeaders = [...document.querySelectorAll(".debrief-movement")].map(movement => {
      const header = movement.querySelector(":scope > .debrief-movement__header");
      const label = header?.querySelector(".debrief-track-label, .genomic-track-label");
      const title = header?.querySelector("h2");
      const flow = movement.querySelector(":scope > .debrief-reading-flow");
      if (!header || !label || !title || !flow) return { valid: false };
      return {
        valid: true,
        semantic: movement.matches("section, article"),
        id: title.id,
        named: movement.getAttribute("aria-labelledby")?.split(/\s+/u).includes(title.id),
        ordered: header.nextElementSibling === flow && label.nextElementSibling === title,
        box: box(header), labelBox: box(label), titleBox: box(title), flowBox: box(flow),
        label: fragments(label), title: fragments(title),
        parts: [...label.children].map(child => ({ tag: child.tagName, box: box(child) })),
        rail: Boolean(document.querySelector(`.page-section-rail a[href="#${title.id}"]`)),
      };
    });

    const wideSelector = "h1, h2, figure, .table-figure, .table-span-all, .career-slide, .clean-list, .embed-slot, pre";
    const isWide = node => node.matches(wideSelector) && !node.matches(".table-figure--column");
    const owners = [...document.querySelectorAll(".debrief-reading-flow")].map(owner => {
      const children = [...owner.children];
      const flowBox = box(owner);
      // The nested selector also observes the negative control that puts an
      // opening heading back into columns, where a continuation can precede it.
      const headings = owner.querySelectorAll(":scope > .beat-title, :scope > .prose-flow > .beat-title");
      const regions = [...headings].map(heading => {
        const content = [];
        for (let sibling = heading.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
          // An authored heading or wide evidence field ends this region. The
          // complete intervening prose supplies its actual continuation starts.
          if (sibling.matches(".beat-title") || isWide(sibling)) break;
          content.push(...fragments(sibling));
        }
        const body = content.flatMap(item => item.boxes);
        const midpoint = flowBox.left + flowBox.width / 2;
        const run = heading.parentElement.matches(".prose-flow")
          ? heading.parentElement : heading.nextElementSibling;
        return {
          id: heading.id || heading.textContent.trim(),
          heading: fragments(heading),
          columns: run?.matches(".prose-flow") ? Number.parseInt(getComputedStyle(run).columnCount, 10) || 1 : 1,
          // Both column starts are derived from the complete region's text
          // fragments. This catches continuations far above a tall heading.
          starts: [
            body.filter(value => value.left < midpoint),
            body.filter(value => value.left >= midpoint),
          ].map(column => column.length ? Math.min(...column.map(value => value.top)) : null),
        };
      });
      const boundaries = children.filter(isWide).flatMap(wide => {
        const next = wide.nextElementSibling;
        if (!next) return [];
        const following = fragments(next).flatMap(part => part.boxes);
        return [{ id: wide.id || wide.tagName, box: box(wide), following }];
      });
      return { box: flowBox, regions, boundaries };
    });
    const flows = [...document.querySelectorAll(".debrief-reading-flow > .prose-flow")].map(flow => ({
      columns: Number.parseInt(getComputedStyle(flow).columnCount, 10) || 1,
      misplaced: [...flow.children].filter(child => child.matches(".beat-title") || isWide(child))
        .map(child => child.id || child.tagName),
    }));
    return {
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      headers: movementHeaders,
      owners, flows,
    };
  });
}

function assertText(text, owner, context) {
  assert.ok(text.length, `${context}: has authored text`);
  for (const part of text) {
    assert.ok(part.visible && part.boxes.length, `${context}: visible text has nonempty layout bounds (${part.text.slice(0, 50)})`);
    for (const box of part.boxes) {
      assert.ok(box.left >= owner.left - 2 && box.right <= owner.right + 2
        && box.top >= owner.top - 2 && box.bottom <= owner.bottom + 2,
      `${context}: text fragment stays inside its visible owner`);
    }
  }
}

function assertHeaders(reading, expected, label, { rails = true } = {}) {
  assert.equal(reading.headers.length, expected, `${label}: source-native movement count`);
  for (const header of reading.headers) {
    assert.ok(header.valid && header.semantic && header.named && header.ordered,
      `${label}: one named movement groups label, title, then prose`);
    const name = `${label} ${header.id}`;
    assertText(header.label, header.labelBox, `${name}: metadata`);
    assertText(header.label, header.box, `${name}: header metadata`);
    assertText(header.title, header.box, `${name}: header title`);
    assert.ok(header.labelBox.bottom <= header.titleBox.top + 2, `${name}: metadata precedes title`);
    assert.ok(header.titleBox.bottom <= header.flowBox.top + 2, `${name}: title precedes reading`);
    assert.ok(header.box.left >= -2 && header.box.right <= reading.viewport + 2,
      `${name}: header fits the visitor field`);
    for (let index = 1; index < header.parts.length; index += 1) {
      const previous = header.parts[index - 1].box;
      const next = header.parts[index].box;
      if (Math.min(previous.bottom, next.bottom) > Math.max(previous.top, next.top) + 2) {
        assert.ok(next.left - previous.right >= 3, `${name}: adjacent label parts have readable spacing`);
      } else {
        assert.ok(next.top >= previous.bottom - 2, `${name}: wrapped label parts preserve source order`);
      }
    }
    if (rails) assert.ok(header.rail, `${name}: movement remains discoverable from the rail`);
  }
}

function assertRegions(reading, label) {
  let count = 0;
  let paired = 0;
  for (const owner of reading.owners) {
    for (const region of owner.regions) {
      count += 1;
      const heading = region.heading.flatMap(part => part.boxes);
      assertText(region.heading, owner.box, `${label} ${region.id}: heading`);
      const bottom = Math.max(...heading.map(value => value.bottom));
      for (const start of region.starts.filter(value => value !== null)) {
        assert.ok(start >= bottom - 2,
          `${label} ${region.id}: heading precedes its first continuation (${start.toFixed(1)} < ${bottom.toFixed(1)})`);
      }
      if (region.columns === 2 && region.starts.every(value => value !== null)) paired += 1;
    }
  }
  assert.ok(count > 0, `${label}: observes authored beat regions`);
  return { count, paired };
}

function assertWideBoundaries(reading, label) {
  for (const owner of reading.owners) {
    for (const boundary of owner.boundaries) {
      for (const fragment of boundary.following) {
        assert.ok(fragment.top >= boundary.box.bottom - 2,
          `${label} ${boundary.id}: wide evidence precedes the following text`);
      }
    }
  }
  assert.deepEqual(reading.flows.flatMap(flow => flow.misplaced), [],
    `${label}: continuous prose keeps authored headings and wide evidence at its outer boundary`);
}

function assertReading(reading, route, options = {}) {
  assertHeaders(reading, route === "choose-your-player-humatics.html" ? 3 : 2, route, options);
  assert.ok(reading.documentWidth <= reading.viewport + 2,
    `${route}: page remains contained (${reading.documentWidth}px within ${reading.viewport}px)`);
  const result = assertRegions(reading, route);
  assertWideBoundaries(reading, route);
  return result;
}

async function captureOpenings(page, prefix) {
  const capture = async suffix => {
    await page.waitForFunction(() => [...document.images].filter(image => {
      const bounds = image.getBoundingClientRect();
      return bounds.width > 0 && bounds.bottom > 0 && bounds.top < innerHeight;
    }).every(image => image.complete && image.naturalWidth > 0));
    await page.evaluate(() => Promise.all([...document.images].filter(image => {
      const bounds = image.getBoundingClientRect();
      return bounds.width > 0 && bounds.bottom > 0 && bounds.top < innerHeight;
    }).map(image => image.decode())));
    await page.screenshot({ path: new URL(`${prefix}-${suffix}.png`, output).pathname });
  };
  const headers = page.locator(".debrief-movement__header");
  for (let index = 0; index < await headers.count(); index += 1) {
    await headers.nth(index).evaluate(node => window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY - 150));
    await capture(index + 1);
  }
  const intervention = page.locator('.debrief-reading-flow > .beat-title').filter({ hasText: /§c|\.c /u }).first();
  if (await intervention.count()) {
    await intervention.evaluate(node => window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY - 150));
    await capture("intervention");
  }
}

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  test(`${engine}: movement orientation precedes continuous reading`, async t => {
    const browser = await browserType.launch({ headless: true });
    t.after(() => browser.close());
    let regions = 0;
    let pairedRegions = 0;

    for (const route of family) {
      await t.test(`${route}: desktop family reading`, async () => {
        const session = await openPage(browser, route);
        try {
          const result = assertReading(await observeReading(session.page), route);
          regions += result.count;
          pairedRegions += result.paired;
          assert.ok(result.paired > 0, `${route}: exercises real two-column continuation`);
          if (targets.includes(route)) await captureOpenings(session.page, `${engine}-${route}-1440`);
        } finally { await session.close(); }
      });
    }

    for (const route of targets) {
      for (const viewport of viewports) {
        await t.test(`${route}: ${viewport.width}px column transition and reflow`, async () => {
          const session = await openPage(browser, route, { viewport });
          try {
            const reading = await observeReading(session.page);
            assertReading(reading, route);
            const expectedColumns = viewport.width < 1360 ? 1 : 2;
            assert.ok(reading.flows.every(flow => flow.columns === expectedColumns),
              `${route}: actual 80rem reading-container transition at ${viewport.width}px`);
            if (viewport.width === 390 || viewport.width === 2560) {
              await captureOpenings(session.page, `${engine}-${route}-${viewport.width}`);
            }
          } finally { await session.close(); }
        });
      }
    }

    for (const route of targets) {
      await t.test(`${route}: live viewport changes preserve reading in both directions`, async () => {
        const session = await openPage(browser, route);
        try {
          for (const width of [1359, 1360, 390, 1440]) {
            await session.page.setViewportSize({ width, height: 1000 });
            const columns = width < 1360 ? 1 : 2;
            await expect.poll(() => session.page.locator(".debrief-reading-flow > .prose-flow")
              .evaluateAll(flows => flows.map(flow => Number.parseInt(getComputedStyle(flow).columnCount, 10) || 1)),
            { timeout: 3000 }).toEqual((await observeReading(session.page)).flows.map(() => columns));
            assertReading(await observeReading(session.page), route);
          }
        } finally { await session.close(); }
      });

      for (const mode of ["print", "forced-colors", "no-script", "enlarged-initial", "enlarged-long-label"]) {
        await t.test(`${route}: ${mode} retains complete orientation`, async () => {
          const session = await openPage(browser, route, {
            javaScriptEnabled: mode !== "no-script",
            forcedColors: mode === "forced-colors" ? "active" : "none",
            enlargedInitially: mode === "enlarged-initial",
          });
          try {
            let enlargement;
            if (mode === "print") await session.page.emulateMedia({ media: "print" });
            if (mode === "enlarged-long-label") {
              enlargement = await session.page.addStyleTag({ content: "html { font-size: 200%; }" });
              await session.page.locator(".debrief-movement__header p").evaluateAll(labels => {
                for (const label of labels) label.append(document.createTextNode(
                  " · Extended movement orientation names the receiving people, retained responsibility, and next observable decision.",
                ));
              });
            }
            const reading = await observeReading(session.page);
            assertReading(reading, route, { rails: mode !== "no-script" });
            if (mode.startsWith("enlarged")) {
              assert.ok(reading.flows.every(flow => flow.columns === 1),
                `${route}: enlarged text exits the multicolumn reading state`);
            }
            if (enlargement) {
              await enlargement.evaluate(node => node.remove());
              await expect.poll(() => session.page.locator(".debrief-reading-flow > .prose-flow").evaluateAll(flows =>
                flows.filter(flow => getComputedStyle(flow).columnCount !== "2")
                  .map(flow => flow.previousElementSibling?.id || "prose continuation")),
              { timeout: 3000, message: `${route}: responsive reading returns to two columns` }).toEqual([]);
              const restored = await observeReading(session.page);
              assertReading(restored, route);
              assert.ok(restored.flows.every(flow => flow.columns === 2),
                `${route}: restoring text size returns to two readable columns without reloading`);
            }
            if (mode === "print" || mode === "forced-colors") {
              await captureOpenings(session.page, `${engine}-${route}-${mode}`);
            }
          } finally { await session.close(); }
        });
      }
    }

    await t.test("labels outside columns and ordinary unlabeled prose retain their reading", async () => {
      for (const route of ["one-figure-several-readings.html", "grammar-family.html"]) {
        const session = await openPage(browser, route);
        try {
          const control = await session.page.evaluate(() => ({
            optedIn: document.querySelectorAll(".debrief-movement, .debrief-reading-flow").length,
            labels: [...document.querySelectorAll(".debrief-track-label")].map(label => ({
              outside: !label.closest(".prose-flow"),
              top: label.getBoundingClientRect().top,
              bottom: label.getBoundingClientRect().bottom,
              next: label.nextElementSibling.getBoundingClientRect().top,
            })),
            flows: [...document.querySelectorAll(".prose-flow")].map(flow => ({
              columns: getComputedStyle(flow).columnCount,
              width: flow.getBoundingClientRect().width,
              text: flow.innerText.trim().length,
            })),
            width: document.documentElement.clientWidth,
            pageWidth: document.documentElement.scrollWidth,
          }));
          assert.equal(control.optedIn, 0, `${route}: retains its independent composition`);
          assert.ok(control.pageWidth <= control.width + 2, `${route}: stays contained`);
          if (route.startsWith("one-figure")) {
            assert.equal(control.labels.length, 2);
            assert.ok(control.labels.every(label => label.outside && label.bottom > label.top && label.bottom <= label.next + 2));
          } else {
            assert.ok(control.flows.some(flow => flow.columns === "2" && flow.width > 0 && flow.text > 0),
              "ordinary prose retains its two-column reading");
          }
        } finally { await session.close(); }
      }
    });

    await t.test("negative controls expose clipping, column reversal, and evidence overlap", async () => {
      const session = await openPage(browser, "fmi-clinical-trial-coordination.html");
      try {
        assertReading(await observeReading(session.page), "fmi-clinical-trial-coordination.html");
        const clipping = await session.page.addStyleTag({ content:
          ".debrief-movement__header { height: 1px !important; overflow: hidden !important; }",
        });
        const readingForClipping = await observeReading(session.page);
        assert.throws(() => assertHeaders(readingForClipping, 2, "clipped metadata"), /text fragment stays inside/u);
        await clipping.evaluate(node => node.remove());
        // Reconstruct the earlier topology without rewriting any source file.
        // It must lose the explicit label/title-before-body relationship even
        // in an engine that happens to paint the short pre-title flow intact.
        await session.page.evaluate(() => {
          const movement = document.querySelector(".debrief-movement");
          const header = movement.querySelector(".debrief-movement__header");
          const flow = movement.querySelector(".debrief-reading-flow > .prose-flow");
          flow.prepend(...header.children);
          header.remove();
        });
        const originalTopology = await observeReading(session.page);
        assert.throws(() => assertHeaders(originalTopology, 2, "metadata inside columns"),
          /one named movement groups label, title, then prose/u);
        await session.page.reload({ waitUntil: "load" });
        await session.page.evaluate(() => {
          const heading = document.querySelector(".debrief-reading-flow > .beat-title");
          heading.nextElementSibling.prepend(heading);
        });
        const brokenHeading = await observeReading(session.page);
        assert.throws(() => assertRegions(brokenHeading, "heading inside columns"), /heading precedes its first continuation/u);
        await session.page.reload({ waitUntil: "load" });
        await session.page.evaluate(() => {
          const figure = document.querySelector(".debrief-reading-flow > figure");
          figure.nextElementSibling.style.transform = "translateY(-10000px)";
        });
        const overlappingEvidence = await observeReading(session.page);
        assert.throws(() => assertWideBoundaries(overlappingEvidence, "overlapping evidence"),
          /wide evidence precedes the following text/u);
      } finally { await session.close(); }
    });

    t.diagnostic(`${engine} ${browser.version()}: ${regions} authored regions, ${pairedRegions} with both column starts in the desktop family. ` +
      "Focused screenshots remain in .visual-runs/debrief-reading-layout; native Safari and DuckDuckGo remain separate environment observations.");
  });
}

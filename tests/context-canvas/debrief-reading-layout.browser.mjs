import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { after, before, test } from "node:test";
import { chromium, expect, firefox, webkit } from "@playwright/test";
import { startStaticServer } from "../../tools/core-architecture-browser-helper.mjs";
import { assertColumnActivation, assertRegions, assertText, assertWideBoundaries, observeReading, settleColumns } from "./reading-layout-helper.mjs";

const visitorRoot = "/context-canvas-project-surface/context-canvas/";
const output = new URL("../../.visual-runs/debrief-reading-layout/", import.meta.url);
const targets = ["genomic-viewer-replatforming.html", "fmi-clinical-trial-coordination.html"];
const extendedFamily = [
  "fmi-lims-eln-replatforming.html",
  "field-inspection-harness-replatform.html",
  "distributed-inspection-harness.html",
  "who-to-believe-reviews-platform.html",
  "three-way-comparative-return.html",
  "initiative-costing.html",
];
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
  ...extendedFamily,
];
// These counts preserve each authored composition, including title-only owners.
const nativeMovements = {
  "choose-your-player-humatics.html": 3,
  "fmi-lims-eln-replatforming.html": 1,
  "field-inspection-harness-replatform.html": 3,
  "distributed-inspection-harness.html": 2,
  "who-to-believe-reviews-platform.html": 0,
  "three-way-comparative-return.html": 0,
  "initiative-costing.html": 0,
};
const orientationRoutes = new Set([
  "choose-your-player-humatics.html",
  "distributed-inspection-harness.html",
  "ehr-discrete-genomic-result.html",
  "ehr-interface-engine-replatform.html",
  "ehr-pgx-alert-failure.html",
  "ehr-three-front-doors.html",
  "ehr-two-charts-one-result.html",
  "fmi-clinical-trial-coordination.html",
  "multilingual-clinical-vocabulary-practice.html",
  "recoverable-enterprise-forms.html",
  "spatial-capture-collaborative-memory.html",
  "three-way-comparative-return.html",
]);
const extensionShape = {
  "fmi-lims-eln-replatforming.html": [4, 4],
  "field-inspection-harness-replatform.html": [3, 13],
  "distributed-inspection-harness.html": [3, 2],
  "who-to-believe-reviews-platform.html": [2, 16],
  "three-way-comparative-return.html": [2, 1],
  "initiative-costing.html": [2, 9],
};
const controls = [
  "one-figure-several-readings.html",
  "readable-tables-reusable-evidence.html",
  "narrative-execution-gap-research-atlas.html",
  "prompt-side-conditions-practice.html",
  "benchmark-orientation.html",
  "maps-evaluations.html",
];
const familyWidths = [390, 1440, 2560];
const modePlan = new Map([
  ...targets.map(route => [route, ["print", "forced-colors", "no-script", "enlarged-initial", "enlarged-long-label"]]),
  [extendedFamily[0], ["print", "forced-colors", "no-script", "enlarged-long-label"]],
  [extendedFamily[1], ["print", "forced-colors", "enlarged-long-label"]],
  [extendedFamily[2], ["no-script", "enlarged-long-label"]],
  [extendedFamily[3], ["print", "forced-colors", "no-script", "enlarged-long-label"]],
  [extendedFamily[4], ["enlarged-initial"]],
  [extendedFamily[5], ["enlarged-long-label"]],
]);
const viewports = [
  { width: 1359, height: 1000 },
  { width: 1360, height: 1000 },
  { width: 1361, height: 1000 },
  { width: 1512, height: 982 },
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



function assertReading(reading, route, options = {}) {
  assertHeaders(reading, nativeMovements[route] ?? 2, route, options);
  if (extensionShape[route]) {
    assert.deepEqual([reading.owners.length, reading.owners.flatMap(owner => owner.regions).filter(region => region.beat).length],
      extensionShape[route], `${route}: source-native owners and beats remain observable`);
  }
  assert.ok(reading.owners.every(owner => owner.titleNamed), `${route}: title-only readings retain their accessible names`);
  if (options.media !== "print") {
    assert.ok(reading.documentWidth <= reading.viewport + 2,
      `${route}: page remains contained (${reading.documentWidth}px within ${reading.viewport}px)`);
  }
  // Print decorations can enlarge scrollWidth without clipping reader text.
  // Actual title/prose geometry, evidence order, and the mixed capital table
  // below supply the print claim; screen document containment stays strict.
  assert.ok(reading.owners.every(owner => owner.box.left >= -2 && owner.box.right <= reading.viewport + 2),
    `${route}: reading owners fit the visitor field`);
  for (const promise of reading.promises) {
    assert.equal(promise.fragments.length, 1, `${route}: the introductory promise remains one unfragmented callout`);
    assert.ok(promise.fragments[0].left >= promise.owner.left - 2 && promise.fragments[0].right <= promise.owner.right + 2,
      `${route}: introductory callout fits its reading owner`);
  }
  for (const flow of reading.flows) {
    assert.ok(flow.box.left >= flow.ownerBox.left - 2 && flow.box.right <= flow.ownerBox.right + 2
      && flow.box.left >= -2 && flow.box.right <= reading.viewport + 2,
    `${route}: continuous prose fits its reading owner and visitor field`);
    // Raised footnote references can sit above the first line's block box.
    // Keep their inline bounds in the flow and their vertical bounds within
    // the outer reading; ordinary paragraph text stays inside the flow box.
    const ordinary = flow.paragraphs.filter(part => !part.raised);
    const raised = flow.paragraphs.filter(part => part.raised);
    if (ordinary.length) assertText(ordinary, flow.box, `${route}: continuous paragraph text`);
    if (raised.length) assertText(raised,
      { ...flow.box, top: flow.ownerBox.top, bottom: flow.ownerBox.bottom },
      `${route}: raised footnote text`);
  }
  assert.equal(reading.orientations.length, orientationRoutes.has(route) ? 1 : 0,
    `${route}: direct-child orientation callout inventory`);
  for (const orientation of reading.orientations) {
    assert.equal(orientation.display, "inline-block",
      `${route}: orientation callout establishes one atomic painted object`);
    assert.equal(orientation.breakInside, "avoid",
      `${route}: orientation callout requests intact column placement`);
    assert.equal(orientation.fragments.length, 1,
      `${route}: orientation callout has one painted fragment`);
    const [fragment] = orientation.fragments;
    assert.ok(fragment.left >= orientation.owner.left - 2 && fragment.right <= orientation.owner.right + 2
      && fragment.top >= orientation.owner.top - 2 && fragment.bottom <= orientation.owner.bottom + 2,
    `${route}: orientation callout stays inside its continuous-reading owner`);
    assert.ok(Math.abs(fragment.width - orientation.inlineSize) <= 2,
      `${route}: orientation callout fills its declared atomic inline size`);
    for (const [role, child] of [["paragraph", orientation.paragraph], ["footer", orientation.footer]]) {
      assert.ok(child, `${route}: orientation callout retains its ${role}`);
      assert.ok(child.box.left >= fragment.left - 2 && child.box.right <= fragment.right + 2
        && child.box.top >= fragment.top - 2 && child.box.bottom <= fragment.bottom + 2,
      `${route}: orientation ${role} stays inside the single painted boundary`);
      assertText(child.text, fragment, `${route}: orientation ${role}`);
    }
    assert.ok(orientation.footer.box.top >= orientation.paragraph.box.bottom - 2,
      `${route}: orientation footer follows its statement inside the same boundary`);
  }
  if (route === "who-to-believe-reviews-platform.html") {
    assert.equal(reading.owners.flatMap(owner => owner.regions).filter(region => region.level === "H4").length, 6,
      "Who To Believe preserves its six authored subordinate beats");
  }
  if (route === "initiative-costing.html") {
    assert.equal(reading.principles.length, 8, "all short costing principles remain observable");
    assert.ok(reading.principles.every(principle => principle.direct),
      "short costing principles remain direct heading continuations");
    assert.ok(reading.principles.every(principle => principle.fragments.length === 1),
      "short costing principles remain single readings without an isolated column continuation");
  }
  const result = assertRegions(reading, route);
  assertWideBoundaries(reading, route);
  return result;
}



async function observeCapitalTable(page) {
  return page.locator('[aria-label="Current staged capital plan"] > table').evaluate(table => {
    const rect = box => ({ left: box.left, right: box.right, top: box.top, bottom: box.bottom });
    return {
      viewport: document.documentElement.clientWidth,
      box: rect(table.getBoundingClientRect()),
      cells: [...table.querySelectorAll("th, td")].map(cell => {
        const range = document.createRange();
        range.selectNodeContents(cell);
        return { text: cell.textContent.trim(), box: rect(cell.getBoundingClientRect()),
          fragments: [...range.getClientRects()].filter(box => box.width > 0 && box.height > 0).map(rect) };
      }),
    };
  });
}

function assertCapitalTable(table) {
  assert.ok(table.box.left >= -2 && table.box.right <= table.viewport + 2,
    "the printed capital table fits the reading field");
  for (const cell of table.cells) {
    assert.ok(cell.text && cell.fragments.length, "each printed capital value has text layout bounds");
    assert.ok(cell.fragments.every(fragment => fragment.left >= cell.box.left - 2 && fragment.right <= cell.box.right + 2
      && fragment.top >= cell.box.top - 2 && fragment.bottom <= cell.box.bottom + 2),
    "printed capital text remains inside its table cell");
  }
}

async function captureCapitalTable(page, prefix) {
  await page.locator('[aria-label="Current staged capital plan"]').evaluate(node =>
    window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY - 150));
  await page.screenshot({ path: new URL(`${prefix}.png`, output).pathname });
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
  const headers = page.locator(".debrief-movement__header, .reading-flow > h2");
  for (let index = 0; index < await headers.count(); index += 1) {
    await headers.nth(index).evaluate(node => window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY - 150));
    await capture(index + 1);
  }
  // Paint-only fragments need a visual comparison: a Range can establish
  // layout order while an engine still paints a later glyph above a figure.
  const evidence = page.locator(".reading-flow > figure:has(+ .prose-flow)").first();
  if (await evidence.count()) {
    await evidence.evaluate(node => window.scrollTo(0, node.getBoundingClientRect().bottom + window.scrollY - 550));
    await capture("evidence-return");
  }
  const intervention = page.locator('.reading-flow > .beat-title').filter({ hasText: /§c|\.c /u }).first();
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

    await t.test("the complete catalog has an explicit reading disposition", async () => {
      const session = await openPage(browser, "debriefs.html");
      try {
        const routes = await session.page.locator('script[type="application/ld+json"]').evaluateAll(nodes =>
          nodes.flatMap(node => {
            const data = JSON.parse(node.textContent);
            const items = data["@graph"] || [data];
            return items.filter(item => item["@type"] === "ItemList").flatMap(item => item.itemListElement)
              .map(item => new URL(item.url).pathname.split("/").at(-1));
          }));
        assert.deepEqual(routes.sort(), [...family, ...controls].sort(), "all 23 catalog routes have a consumer or control observation");
      } finally { await session.close(); }
    });

    for (const route of family) {
      for (const width of familyWidths) {
        await t.test(`${route}: ${width}px family reading`, async () => {
          const session = await openPage(browser, route, { viewport: { width, height: width === 390 ? 844 : width === 2560 ? 1440 : 1000 } });
          try {
            const reading = await observeReading(session.page);
            const result = assertReading(reading, route);
            assertColumnActivation(reading, route);
            if (width === 1440) {
              regions += result.count;
              pairedRegions += result.paired;
            }
            if (width === 2560) assert.ok(result.paired > 0, `${route}: exercises real two-column continuation`);
            if ((width === 1440 && [...targets, ...extendedFamily].includes(route))
              || (width !== 1440 && [...targets, ...extendedFamily.slice(0, 2), extendedFamily[3], extendedFamily[5]].includes(route))) {
              await captureOpenings(session.page, `${engine}-${route}-${width}`);
              if (route === "field-inspection-harness-replatform.html" && width === 1440) {
                await captureCapitalTable(session.page, `${engine}-field-capital-screen-1440`);
              }
            }
          } finally { await session.close(); }
        });
      }
    }

    for (const route of targets) {
      for (const viewport of viewports) {
        await t.test(`${route}: ${viewport.width}px column transition and reflow`, async () => {
          const session = await openPage(browser, route, { viewport });
          try {
            const reading = await observeReading(session.page);
            assertReading(reading, route);
            assertColumnActivation(reading, route);
          } finally { await session.close(); }
        });
      }
    }

    for (const route of [...targets, extendedFamily[0]]) {
      await t.test(`${route}: live viewport changes cross its actual reading seam in both directions`, async () => {
        const session = await openPage(browser, route);
        try {
          // Locate the viewport that gives this route 80rem of reading space.
          // LIMS reserves rail width, so its seam differs from ordinary pages.
          const initial = (await observeReading(session.page)).flows[0];
          const seam = Math.round(1440 + initial.columnThreshold - initial.containerWidth);
          if (route === extendedFamily[0]) assert.ok(seam > 1360, "the LIMS rail reserves reading space");
          else assert.equal(seam, 1360, "ordinary reading activates at the established seam");
          for (const width of [seam - 1, seam, seam + 1, 390, 2560, 1440]) {
            await session.page.setViewportSize({ width, height: 1000 });
            await settleColumns(session.page);
            const reading = await observeReading(session.page);
            assertReading(reading, route);
            assertColumnActivation(reading, route);
            if (Math.abs(width - seam) <= 1) {
              assert.ok(reading.flows.every(flow => flow.columns === (width < seam ? 1 : 2)),
                `${route}: crosses its measured seam at ${seam}px`);
            }
          }
        } finally { await session.close(); }
      });
    }

    for (const [route, modes] of modePlan) {
      for (const mode of modes) {
        await t.test(`${route}: ${mode} retains complete orientation`, async () => {
          const session = await openPage(browser, route, {
            javaScriptEnabled: mode !== "no-script",
            forcedColors: mode === "forced-colors" ? "active" : "none",
            enlargedInitially: mode === "enlarged-initial",
            // The LIMS reserved rail needs a wider viewport to exercise both
            // sides of text enlargement; all other representatives use 1440.
            viewport: { width: route === extendedFamily[0] ? 1800 : 1440, height: 1000 },
          });
          try {
            let priorRootFont;
            if (mode === "print") await session.page.emulateMedia({ media: "print" });
            if (mode === "enlarged-long-label") {
              // The contract owns one root-font mutation, so change that
              // property directly and retain its complete inline state. This
              // gives every engine the same style-invalidation boundary and
              // keeps stylesheet attachment/removal outside the responsive-
              // column behavior under observation.
              priorRootFont = await session.page.evaluate(() => {
                const root = document.documentElement;
                const prior = {
                  value: root.style.getPropertyValue("font-size"),
                  priority: root.style.getPropertyPriority("font-size"),
                };
                root.style.setProperty("font-size", "200%", "important");
                return prior;
              });
              await session.page.locator(".debrief-movement__header > p:first-child, .reading-flow > h2").evaluateAll(labels => {
                for (const label of labels) label.append(document.createTextNode(
                  " · Extended movement orientation names the receiving people, retained responsibility, and next observable decision.",
                ));
              });
            }
            const reading = await observeReading(session.page);
            assertReading(reading, route, { rails: mode !== "no-script", media: mode === "print" ? "print" : "screen" });
            if (mode === "print") {
              t.diagnostic(`${route}: print document extent ${reading.documentWidth}px / ${reading.viewport}px; title and prose layout bounds checked.`);
              if (route === "field-inspection-harness-replatform.html") {
                assertCapitalTable(await observeCapitalTable(session.page));
                await captureCapitalTable(session.page, `${engine}-field-capital-print-1440`);
              }
            }
            if (mode.startsWith("enlarged")) {
              assert.equal(reading.rootFont, 32, `${route}: observes enlarged root text`);
              assert.ok(reading.flows.every(flow => flow.columns === 1),
                `${route}: enlarged text exits the multicolumn reading state`);
            }
            if (priorRootFont) {
              await session.page.evaluate(prior => {
                const root = document.documentElement;
                if (prior.value) root.style.setProperty("font-size", prior.value, prior.priority);
                else root.style.removeProperty("font-size");
              }, priorRootFont);
              await settleColumns(session.page);
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

    for (const route of controls) {
      for (const width of familyWidths) {
        await t.test(`${route}: ${width}px independent composition control`, async () => {
          const session = await openPage(browser, route, { viewport: { width, height: 1000 } });
          try {
            const control = await session.page.evaluate(() => ({
              optedIn: document.querySelectorAll(".debrief-movement, .reading-flow").length,
              labels: [...document.querySelectorAll(".debrief-track-label")].map(label => ({
                outside: !label.closest(".prose-flow"),
                top: label.getBoundingClientRect().top,
                bottom: label.getBoundingClientRect().bottom,
                next: label.nextElementSibling.getBoundingClientRect().top,
              })),
              headings: [...document.querySelectorAll("main h2")].map(heading => ({
                left: heading.getBoundingClientRect().left, right: heading.getBoundingClientRect().right,
                width: heading.getBoundingClientRect().width, height: heading.getBoundingClientRect().height,
                text: heading.textContent.trim(),
              })).filter(heading => heading.width > 0 && heading.height > 0),
              flows: [...document.querySelectorAll(".prose-flow")].map(flow => ({
                columns: Number.parseInt(getComputedStyle(flow).columnCount, 10) || 1,
                tags: [...flow.children].map(child => child.tagName),
                top: flow.getBoundingClientRect().top, bottom: flow.getBoundingClientRect().bottom,
                before: flow.previousElementSibling?.getBoundingClientRect().bottom,
                beforeTag: flow.previousElementSibling?.tagName,
                after: flow.nextElementSibling?.getBoundingClientRect().top,
                afterTag: flow.nextElementSibling?.tagName,
              })),
              width: document.documentElement.clientWidth,
              pageWidth: document.documentElement.scrollWidth,
            }));
            assert.equal(control.optedIn, 0, `${route}: retains its independent composition`);
            assert.ok(control.pageWidth <= control.width + 2, `${route}: stays contained`);
            assert.ok(control.headings.length > 0, `${route}: retains readable section orientation`);
            assert.ok(control.headings.every(heading => heading.text && heading.left >= -2 && heading.right <= width + 2),
              `${route}: visible section titles fit the visitor field`);
            if (route === controls[0]) {
              assert.equal(control.labels.length, 2);
              assert.ok(control.labels.every(label => label.outside && label.bottom > label.top && label.bottom <= label.next + 2));
              assertRegions(await observeReading(session.page, { includeOrdinary: true }), route);
            } else if (route === controls[1]) {
              assert.equal(control.flows.length, 1);
              const flow = control.flows[0];
              assert.deepEqual(flow.tags, ["P", "P", "P"], "Readable Tables retains its pure three-paragraph flow");
              assert.equal(flow.beforeTag, "P");
              assert.equal(flow.afterTag, "FIGURE");
              assert.ok(flow.before <= flow.top + 2 && flow.bottom <= flow.after + 2,
                "the independent prose remains between its introduction and evidence");
              assert.equal(flow.columns, width >= 1360 ? 2 : 1);
            } else {
              assert.equal(control.flows.length, 0, `${route}: keeps its block/grid composition`);
            }
          } finally { await session.close(); }
        });
      }
    }

    await t.test("the mixed capital table remains readable in a narrow print field", async () => {
      const session = await openPage(browser, "field-inspection-harness-replatform.html", { viewport: { width: 800, height: 1100 } });
      try {
        await session.page.emulateMedia({ media: "print" });
        assertReading(await observeReading(session.page), "field-inspection-harness-replatform.html", { media: "print" });
        assertCapitalTable(await observeCapitalTable(session.page));
        await captureCapitalTable(session.page, `${engine}-field-capital-print-800`);
        // Whole-table numeric styling incorrectly makes narrative cells nowrap.
        await session.page.locator('[aria-label="Current staged capital plan"] > table').evaluate(table => table.classList.add("table--numeric"));
        const fault = await observeCapitalTable(session.page);
        assert.throws(() => assertCapitalTable(fault), /printed capital table fits/u);
      } finally { await session.close(); }
    });

    await t.test("Who To Believe keeps graph interaction and title navigation after prose separation", async () => {
      const session = await openPage(browser, "who-to-believe-reviews-platform.html");
      try {
        const graph = session.page.locator("[data-wtb-system-graph]");
        await expect(graph).toHaveAttribute("data-graph-state", "enhanced");
        assert.equal(await graph.locator(".wtb-system-graph__node").count(), 22);
        assert.equal(await graph.locator(".wtb-system-graph__edge").count(), 26);
        await graph.getByLabel("Partial Spring Boot migration").check();
        await expect(graph.locator("[data-detail-status]")).toHaveText("BREAKING");
        await graph.locator('[data-node-id="risk"]').click();
        await expect(graph.locator("[data-detail-title]")).toHaveText("Risk scoring");
        await graph.locator("[data-detail-neighbors] button", { hasText: "→ Kit fulfillment" }).click();
        await expect(graph.locator("[data-detail-title]")).toHaveText("Kit fulfillment");
        const links = session.page.locator('.page-section-rail a[href="#implementation-architecture-title"]');
        assert.equal(await links.count(), 1, "the title-only implementation remains in the reading rail");
        await links.click();
        await expect(session.page).toHaveURL(/#implementation-architecture-title$/u);
        assertReading(await observeReading(session.page), "who-to-believe-reviews-platform.html");
      } finally { await session.close(); }
    });

    await t.test("title-only and callout faults expose new-family reading regressions", async () => {
      const session = await openPage(browser, "initiative-costing.html", { viewport: { width: 2560, height: 1440 } });
      try {
        assertReading(await observeReading(session.page), "initiative-costing.html");
        await session.page.evaluate(() => {
          const title = document.querySelector(".reading-flow > h2");
          title.nextElementSibling.style.transform = "translateY(-1000px)";
        });
        const titleFault = await observeReading(session.page);
        assert.throws(() => assertRegions(titleFault, "title-only continuation"), /heading precedes its first continuation/u);
        await session.page.reload({ waitUntil: "load" });
        await session.page.evaluate(() => {
          const heading = document.querySelector(".reading-flow > .beat-title:not([id])");
          const paragraph = heading.nextElementSibling;
          const run = document.createElement("div");
          run.className = "prose-flow";
          heading.before(run);
          run.append(heading, paragraph);
        });
        const unnamedFault = await observeReading(session.page);
        assert.throws(() => assertWideBoundaries(unnamedFault, "unnamed beat in columns"), /continuous prose keeps authored headings/u);
        await session.page.reload({ waitUntil: "load" });
        await session.page.evaluate(() => {
          const paragraph = [...document.querySelectorAll('[aria-labelledby="doctrines-title"] > .beat-title + p')]
            .find(node => node.textContent.includes("recovery work"));
          const run = document.createElement("div");
          run.className = "prose-flow";
          paragraph.before(run);
          run.append(paragraph);
        });
        const splitPrinciple = await observeReading(session.page);
        assert.throws(() => assertReading(splitPrinciple, "initiative-costing.html"),
          /short costing principles remain direct heading continuations/u);
      } finally { await session.close(); }
      const lims = await openPage(browser, "fmi-lims-eln-replatforming.html", { viewport: { width: 2560, height: 1440 } });
      try {
        assertReading(await observeReading(lims.page), "fmi-lims-eln-replatforming.html");
        // Firefox keeps the historic callout in one column. Chromium and
        // WebKit reproduce its split; all engines check the repaired source.
        if (engine !== "firefox") {
          await lims.page.evaluate(() => {
            const promise = document.querySelector(".reading-flow > .fmi-track-promise");
            const run = document.createElement("div");
            run.className = "prose-flow";
            promise.before(run);
            run.append(promise);
          });
          const fragmented = await observeReading(lims.page);
          assert.throws(() => assertReading(fragmented, "fmi-lims-eln-replatforming.html"), /one unfragmented callout/u);
        }
      } finally { await lims.close(); }
    });

    await t.test("orientation callouts retain one boundary across continuous-reading columns", async () => {
      const session = await openPage(browser, "fmi-clinical-trial-coordination.html", {
        viewport: { width: 1512, height: 982 },
      });
      try {
        const selector = ".prose-flow > .debrief-quote--orientation";
        const accepted = await observeReading(session.page);
        assertReading(accepted, "fmi-clinical-trial-coordination.html");
        const original = await session.page.locator(selector).getAttribute("style");
        try {
          await session.page.locator(selector).evaluate(node => {
            node.style.setProperty("display", "block", "important");
            node.style.setProperty("break-inside", "auto", "important");
          });
          const fragmented = await observeReading(session.page);
          assert.equal(fragmented.orientations[0].display, "block",
            "the controlled fault restores ordinary block fragmentation behavior");
          assert.equal(fragmented.orientations[0].breakInside, "auto",
            "the controlled fault releases the intact-column request");
          assert.ok(fragmented.orientations[0].fragments.length > 1,
            "the controlled fault paints the callout across column fragments");
          assert.throws(() => assertReading(fragmented, "fmi-clinical-trial-coordination.html"),
            /orientation callout establishes one atomic painted object|orientation callout has one painted fragment/u);
        } finally {
          await session.page.locator(selector).evaluate((node, style) => {
            if (style === null) node.removeAttribute("style");
            else node.setAttribute("style", style);
          }, original);
        }
        assertReading(await observeReading(session.page), "fmi-clinical-trial-coordination.html");
      } finally { await session.close(); }
    });

    await t.test("painted-text observation distinguishes the declared accessible cue from changed hiding", async () => {
      const session = await openPage(browser, "fmi-lims-eln-replatforming.html", { viewport: { width: 390, height: 844 } });
      try {
        const cue = session.page.locator(".reading-flow > .prose-flow p .fmi-link-cue").first();
        const cueText = (await cue.textContent()).trim();
        const observedCues = reading => reading.flows.flatMap(flow => flow.paragraphs)
          .filter(part => part.text === cueText);
        assert.equal(await session.page.getByRole("link", {
          name: "Service Design Blueprint (opens in a new tab)", exact: true,
        }).count(), 1, "The clipped cue remains part of the accessible link name.");
        const accepted = await observeReading(session.page);
        assert.equal(observedCues(accepted).length, 0, "The declared fully clipped cue contributes no painted fragment.");
        assertReading(accepted, "fmi-lims-eln-replatforming.html");
        for (const [property, value] of [["clip-path", "none"], ["width", "2px"]]) {
          const original = await cue.getAttribute("style");
          try {
            await cue.evaluate((node, fault) => node.style.setProperty(fault.property, fault.value, "important"), { property, value });
            assert.ok(observedCues(await observeReading(session.page)).length > 0,
              `${property}: a changed hiding contract receives ordinary fragment observation`);
          } finally {
            await cue.evaluate((node, style) => style === null ? node.removeAttribute("style") : node.setAttribute("style", style), original);
          }
          const restored = await observeReading(session.page);
          assert.equal(observedCues(restored).length, 0, "The restored accessible cue retains its bounded paint role.");
          assertReading(restored, "fmi-lims-eln-replatforming.html");
        }
      } finally { await session.close(); }
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
          const flow = movement.querySelector(".reading-flow > .prose-flow");
          flow.prepend(...header.children);
          header.remove();
        });
        const originalTopology = await observeReading(session.page);
        assert.throws(() => assertHeaders(originalTopology, 2, "metadata inside columns"),
          /one named movement groups label, title, then prose/u);
        await session.page.reload({ waitUntil: "load" });
        await session.page.evaluate(() => {
          const heading = document.querySelector(".reading-flow > .beat-title");
          heading.nextElementSibling.prepend(heading);
        });
        const brokenHeading = await observeReading(session.page);
        assert.throws(() => assertRegions(brokenHeading, "heading inside columns"), /heading precedes its first continuation/u);
        await session.page.reload({ waitUntil: "load" });
        await session.page.evaluate(() => {
          const figure = document.querySelector(".reading-flow > figure");
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

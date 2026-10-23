import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { chromium, firefox, webkit } from "@playwright/test";
import { startStaticServer } from "../../tools/core-architecture-browser-helper.mjs";
import { assertColumnActivation, assertRegions, assertText, assertWideBoundaries, observeReading, settleColumns } from "./reading-layout-helper.mjs";

const visitorRoot = "/context-canvas-project-surface/context-canvas/";
const output = new URL("../../.visual-runs/ai-systems-reading-layout/", import.meta.url);
const routes = [
  "ai-systems.html", "shared-machinery.html", "benchmark-orientation.html",
  "collaboration-skills.html", "concept-nursery.html", "conditioning-field.html",
  "core-architectures-orientation-index.html", "cross-platform-collaboration-cycle.html",
  "fmi-clinical-trial-coordination.html", "fmi-lims-eln-replatforming.html",
  "genomic-viewer-replatforming.html", "grammar-family.html", "hiring-surfaces-talent-agent-intake.html",
  "maps-evaluations.html", "metadata-blocks.html", "planning-surface.html", "poda.html",
  "prompt-side-conditions-practice.html", "readable-tables-reusable-evidence.html",
  "registry-goal-fidelity-routing.html", "resting-concepts.html", "visualization-fidelity-atlas.html",
  "initiative-costing.html", "recoverable-enterprise-forms.html", "one-figure-several-readings.html",
  "who-to-believe-reviews-platform.html",
];
const repaired = new Map([
  ["ai-systems.html", 2], ["core-architectures-orientation-index.html", 1],
  ["grammar-family.html", 1], ["hiring-surfaces-talent-agent-intake.html", 3],
  ["metadata-blocks.html", 3], ["poda.html", 3],
]);
const widths = [390, 1440, 2560];
let server;

before(async () => {
  server = await startStaticServer();
  await mkdir(output, { recursive: true });
});
after(async () => server?.close());

async function openPage(browser, route, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce", ...options });
  // Parent reading and local assets define this observation. Remote embedded
  // documents retain their separate delivery and interaction contracts.
  await context.route("**/*", request => {
    const url = new URL(request.request().url());
    return url.origin === server.origin && !url.pathname.startsWith("/v1-cdn/")
      ? request.continue()
      : request.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Parent reading fixture</title>" });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const response = await page.goto(`${server.origin}${visitorRoot}${route}`, { waitUntil: "load" });
  assert.equal(response.status(), 200, `${route}: source document is available`);
  if (options.javaScriptEnabled !== false) await page.evaluate(() => document.fonts.ready);
  return { page, close: () => context.close() };
}

async function observeSurface(page) {
  return page.evaluate(() => {
    const rect = value => ({ left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height });
    const visible = node => {
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(node).visibility === "visible"
        && !node.matches(".visually-hidden, .sr-only, .wtb-system-graph__sr-only");
    };
    const fragments = node => {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const values = [];
      let text;
      while ((text = walker.nextNode())) {
        if (!text.textContent.trim()) continue;
        const range = document.createRange();
        range.setStart(text, text.textContent.search(/\S/u));
        range.setEnd(text, text.textContent.search(/\s*$/u));
        values.push(...[...range.getClientRects()].filter(box => box.width > 0 && box.height > 0).map(rect));
      }
      return values;
    };
    const labels = [...document.querySelectorAll(".reading-flow > .architecture-pair__label")].map(node => ({
      text: node.textContent.trim(), box: rect(node.getBoundingClientRect()), fragments: fragments(node),
      next: node.nextElementSibling?.matches("h1, h2, h3, h4, h5, h6") ? rect(node.nextElementSibling.getBoundingClientRect()) : null,
    }));
    return {
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      h1: [...document.querySelectorAll("body h1")].filter(visible).map(node => node.textContent.trim()),
      headings: [...document.querySelectorAll("body h1, main :is(h2,h3,h4,h5,h6)")].filter(visible).map(node => ({
        text: node.textContent.trim(), box: rect(node.getBoundingClientRect()), fragments: fragments(node),
        clips: (() => {
          const clips = [];
          for (let owner = node; owner; owner = owner.parentElement) {
            const style = getComputedStyle(owner);
            const inline = ["hidden", "clip"].includes(style.overflowX);
            const block = ["hidden", "clip"].includes(style.overflowY);
            if (inline || block) clips.push({ box: rect(owner.getBoundingClientRect()), inline, block });
          }
          return clips;
        })(),
      })),
      labels,
      scrolls: [...document.querySelectorAll("main .table-scroll")].filter(visible).map(node => ({
        box: rect(node.getBoundingClientRect()), width: node.clientWidth, contentWidth: node.scrollWidth,
        overflow: getComputedStyle(node).overflowX,
      })),
      frames: [...document.querySelectorAll("main .table-figure--wide, main .story-visual, main .prototype-embed")]
        .filter(visible).map(node => ({ className: node.className, box: rect(node.getBoundingClientRect()) })),
      shortParagraphs: [...document.querySelectorAll(".reading-flow > p:not(.architecture-pair__label)")]
        .filter(visible).map(node => ({ text: node.textContent.trim(), fragments: [...node.getClientRects()].filter(box => box.width > 0 && box.height > 0).map(rect) })),
    };
  });
}

function assertSurface(surface, route, { print = false } = {}) {
  assert.equal(surface.h1.length, 1, `${route}: one visible document heading`);
  assert.ok(surface.headings.length > 1, `${route}: section orientation remains observable`);
  if (!print) assert.ok(surface.documentWidth <= surface.viewport + 2,
    `${route}: document fits the viewport (${surface.documentWidth}px / ${surface.viewport}px)`);
  for (const heading of surface.headings) {
    assert.ok(heading.text && heading.fragments.length, `${route}: heading text has layout bounds`);
    assert.ok(heading.box.left >= -2 && heading.box.right <= surface.viewport + 2,
      `${route}: heading fits the visitor field (${heading.text.slice(0, 60)})`);
    // Display typography can intentionally paint above and below its line box.
    // Its inline measure and actual clipping ancestors determine containment.
    assert.ok(heading.fragments.every(fragment => fragment.left >= heading.box.left - 2
      && fragment.right <= heading.box.right + 2),
    `${route}: complete heading text fits its inline owner (${heading.text.slice(0, 60)})`);
    for (const clip of heading.clips) assert.ok(heading.fragments.every(fragment => (
      (!clip.inline || (fragment.left >= clip.box.left - 2 && fragment.right <= clip.box.right + 2))
      && (!clip.block || (fragment.top >= clip.box.top - 2 && fragment.bottom <= clip.box.bottom + 2))
    )), `${route}: heading paint remains within actual clipping ancestors`);
  }
  for (const label of surface.labels) {
    assert.ok(label.text && label.fragments.length, `${route}: metadata has visible text`);
    assert.ok(label.fragments.every(fragment => fragment.left >= label.box.left - 2 && fragment.right <= label.box.right + 2
      && fragment.top >= label.box.top - 2 && fragment.bottom <= label.box.bottom + 2), `${route}: complete metadata fits its owner`);
    if (label.next) assert.ok(label.box.bottom <= label.next.top + 2, `${route}: metadata precedes its heading`);
  }
  for (const frame of surface.frames) assert.ok(frame.box.left >= -2 && frame.box.right <= surface.viewport + 2,
    `${route}: evidence frame stays within the visitor field (${frame.className})`);
  for (const scroll of surface.scrolls) {
    assert.ok(scroll.box.left >= -2 && scroll.box.right <= surface.viewport + 2, `${route}: table scroll owner fits the visitor field`);
    if (!print && scroll.contentWidth > scroll.width + 2) assert.ok(["auto", "scroll"].includes(scroll.overflow),
      `${route}: wider table content retains a local scroll owner`);
  }
  for (const paragraph of surface.shortParagraphs) assert.equal(paragraph.fragments.length, 1,
    `${route}: ordinary paragraph remains one reading (${paragraph.text.slice(0, 40)})`);
}

function assertReading(reading, route) {
  if (repaired.has(route)) assert.equal(reading.owners.length, repaired.get(route), `${route}: all source-owned readings are present`);
  assert.ok(reading.owners.every(owner => owner.titleNamed), `${route}: reading titles retain accessible ownership`);
  for (const flow of reading.flows) {
    assert.ok(flow.box.left >= flow.ownerBox.left - 2 && flow.box.right <= flow.ownerBox.right + 2,
      `${route}: continuous prose fits the reading owner`);
    const ordinary = flow.paragraphs.filter(part => !part.raised);
    const raised = flow.paragraphs.filter(part => part.raised);
    if (ordinary.length) assertText(ordinary, flow.box, `${route}: paragraph text`);
    if (raised.length) assertText(raised, { ...flow.box, top: flow.ownerBox.top, bottom: flow.ownerBox.bottom }, `${route}: footnote text`);
  }
  if (reading.owners.length) {
    assertRegions(reading, route);
    assertWideBoundaries(reading, route);
  }
}

async function assertPage(page, route, options = {}) {
  // Scriptless documents are observed after load; animation callbacks belong
  // to the scripting-enabled settling path.
  if (!options.scriptless) await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const reading = await observeReading(page, { allHeadings: repaired.has(route) });
  assertSurface(await observeSurface(page), route, options);
  assertReading(reading, route);
  return reading;
}

async function captureOpening(page, engine, route) {
  const first = page.locator(".reading-flow").first();
  await first.evaluate(node => window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY - 125));
  await page.screenshot({ path: new URL(`${engine}-${route}-opening.png`, output).pathname });
}

test("AI Systems and Shared Machinery have an explicit reading-route population", async () => {
  assert.equal(new Set(routes).size, 26);
  const links = new Set();
  for (const route of routes) {
    const html = await readFile(new URL(`../../context-canvas-project-surface/context-canvas/${route}`, import.meta.url), "utf8");
    assert.match(html, /<main\b/u, `${route}: retains its authored visitor reading`);
    if (["ai-systems.html", "shared-machinery.html"].includes(route)) {
      const main = html.match(/<main\b[\s\S]*?<\/main>/u)?.[0];
      assert.ok(main, `${route}: owns a primary reading route surface`);
      const directReadings = [...new Set([...main.matchAll(/href="([^"#?]+\.html)(?:[?#][^"]*)?"/gu)]
        .map(match => match[1]).filter(href => !href.includes("/")))];
      assert.ok(directReadings.length >= 10, `${route}: primary collection supplies substantive route membership`);
      assert.deepEqual(directReadings.filter(href => !routes.includes(href)), [],
        `${route}: every primary local reading has an explicit browser disposition`);
    }
    for (const [, href] of html.matchAll(/href="([^"#?]+\.html)(?:[?#][^"]*)?"/gu)) {
      if (!href.includes("/")) links.add(href);
    }
  }
  assert.deepEqual(routes.filter(route => !links.has(route)), [], "every selected reading remains linked within the authored route family");
});

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  test(`${engine}: AI Systems and Shared Machinery retain complete reading orientation`, async t => {
    const browser = await browserType.launch({ headless: true });
    t.after(() => browser.close());
    for (const route of [...routes, "debriefs.html"]) {
      for (const width of widths) {
        await t.test(`${route}: ${width}px reading`, async () => {
          const session = await openPage(browser, route, { viewport: { width, height: 1000 } });
          try {
            const reading = await assertPage(session.page, route);
            if (repaired.has(route) && reading.flows.length) assertColumnActivation(reading, route);
            if (repaired.has(route) && width === 2560) await captureOpening(session.page, engine, route);
          } finally { await session.close(); }
        });
      }
    }
    for (const route of repaired.keys()) {
      await t.test(`${route}: responsive seam preserves headings in both directions`, async () => {
        const session = await openPage(browser, route);
        try {
          const initial = await observeReading(session.page);
          const first = initial.flows[0];
          const seam = first ? Math.round(1440 + first.columnThreshold - first.containerWidth) : 1360;
          for (const width of [seam - 1, seam, seam + 1, seam - 1]) {
            await session.page.setViewportSize({ width, height: 1000 });
            // Some repaired readings intentionally keep their concise prose in
            // the outer reading block, so they own no multicolumn formatting
            // context. The shared seam still exercises their heading geometry;
            // column settlement belongs only to pages that authored a flow.
            if (first) await settleColumns(session.page);
            const reading = await assertPage(session.page, route);
            if (first) {
              assertColumnActivation(reading, route);
              assert.ok(reading.flows.every(flow => flow.columns === (width < seam ? 1 : 2)), `${route}: exact source seam changes column state`);
            } else {
              assert.equal(reading.flows.length, 0, `${route}: short readings preserve their ordinary block composition across the shared seam`);
            }
          }
        } finally { await session.close(); }
      });
    }
    for (const route of ["ai-systems.html", "shared-machinery.html", "metadata-blocks.html", "poda.html"]) {
      for (const mode of ["print", "forced-colors", "no-script", "enlarged-text"]) {
        await t.test(`${route}: ${mode} preserves readable orientation`, async () => {
          const session = await openPage(browser, route, {
            viewport: { width: mode === "enlarged-text" ? 2560 : 1440, height: 1000 },
            javaScriptEnabled: mode !== "no-script", forcedColors: mode === "forced-colors" ? "active" : "none",
          });
          try {
            if (mode === "print") await session.page.emulateMedia({ media: "print" });
            if (mode === "enlarged-text") await session.page.evaluate(() => document.documentElement.style.fontSize = "200%");
            await assertPage(session.page, route, { print: mode === "print", scriptless: mode === "no-script" });
            if (mode === "enlarged-text") {
              const enlarged = await observeReading(session.page);
              assert.ok(enlarged.flows.every(flow => flow.columns === 1), `${route}: enlarged text enters one-column reading`);
              await session.page.evaluate(() => document.documentElement.style.removeProperty("font-size"));
              // A short reading can preserve ordinary block composition at
              // every text size. Poll the multicolumn state only when this
              // source route actually owns one of those formatting contexts.
              if (enlarged.flows.length) await settleColumns(session.page);
              const restored = await assertPage(session.page, route);
              assert.equal(restored.flows.length, enlarged.flows.length,
                `${route}: text-size restoration preserves the source-owned flow composition`);
              if (restored.flows.length) assertColumnActivation(restored, route);
            }
          } finally { await session.close(); }
        });
      }
    }
    await t.test("controlled faults expose clipping and heading order, then restore the reading", async () => {
      const session = await openPage(browser, "poda.html", { viewport: { width: 2560, height: 1440 } });
      try {
        await assertPage(session.page, "poda.html");
        const label = session.page.locator(".reading-flow > .architecture-pair__label").first();
        const originalStyle = await label.getAttribute("style");
        await label.evaluate(node => { node.style.height = "1px"; node.style.overflow = "hidden"; });
        const clipped = await observeSurface(session.page);
        assert.throws(() => assertSurface(clipped, "poda.html"), /complete metadata fits its owner/u);
        await label.evaluate((node, value) => value === null ? node.removeAttribute("style") : node.setAttribute("style", value), originalStyle);
        await assertPage(session.page, "poda.html");
        await session.page.evaluate(() => {
          const heading = document.querySelector(".reading-flow > h2:has(+ .prose-flow)");
          const run = heading.nextElementSibling;
          if (!run.matches(".prose-flow")) throw new Error("The controlled fault needs the authored opening prose run");
          run.prepend(heading);
        });
        const fault = await observeReading(session.page);
        assert.throws(() => assertWideBoundaries(fault, "heading in columns"), /continuous prose keeps authored headings/u);
        await session.page.evaluate(() => {
          const run = document.querySelector(".reading-flow > .prose-flow:has(> h2)");
          run.before(run.querySelector(":scope > h2"));
        });
        await assertPage(session.page, "poda.html");
      } finally { await session.close(); }
    });
    t.diagnostic(`${engine} ${browser.version()}: parent reading and local layout; native-browser, remote embedded behavior, and deployed publication retain separate observations.`);
  });
}

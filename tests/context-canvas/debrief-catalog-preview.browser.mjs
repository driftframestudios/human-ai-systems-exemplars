import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { chromium } from "@playwright/test";

import {
  assertTelemetry,
  monitor,
  startStaticServer,
} from "../../tools/core-architecture-browser-helper.mjs";

const route = "/context-canvas-project-surface/context-canvas/debriefs.html";
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

async function focusPreview(page, cardSelector) {
  await page.locator(`${cardSelector} a[href]`).first().focus();
  await page.locator("[data-preview-entry]").waitFor({ state: "visible" });

  return page.evaluate(selector => {
    const card = document.querySelector(selector);
    const primaryImage = card?.querySelector(".project__upfront");
    const previewImage = document.querySelector("[data-preview-image]");
    const previewFigure = previewImage?.closest("figure");
    const figureBox = previewFigure?.getBoundingClientRect();
    const attr = (node, name) => node?.getAttribute(name) || "";
    const preferred = name => attr(card, `data-catalog-preview-${name}`) || attr(primaryImage, name);
    const expectedAlt = preferred("alt");
    const expectedCaption = attr(card, "data-catalog-preview-caption") || expectedAlt;

    return {
      expected: {
        src: preferred("src"),
        srcset: preferred("srcset"),
        sizes: preferred("sizes"),
        width: preferred("width"),
        height: preferred("height"),
        alt: expectedAlt,
        caption: `Preview visual — ${expectedCaption}`,
        linkLabel: card?.getAttribute("data-formats") === "article"
          ? "Open the Article"
          : "Read the Full Debrief",
      },
      actual: {
        src: attr(previewImage, "src"),
        srcset: attr(previewImage, "srcset"),
        sizes: attr(previewImage, "sizes"),
        width: attr(previewImage, "width"),
        height: attr(previewImage, "height"),
        alt: attr(previewImage, "alt"),
        caption: document.querySelector("[data-preview-caption]")?.textContent.trim() || "",
        linkLabel: document.querySelector("[data-preview-link-label]")?.textContent.trim() || "",
      },
      geometry: {
        figureLeft: figureBox?.left ?? -1,
        figureRight: figureBox?.right ?? Number.POSITIVE_INFINITY,
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      },
    };
  }, cardSelector);
}

for (const width of [390, 1440]) {
  test(`catalog preview replaces responsive metadata cleanly at ${width}px`, async t => {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    t.after(() => context.close());
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const telemetry = monitor(page);

    await page.goto(`${server.origin}${route}`, { waitUntil: "load" });

    const responsive = await focusPreview(page, "#catalog-genomic-viewer");
    assert.deepEqual(responsive.actual, responsive.expected);
    assert.ok(responsive.actual.srcset, "the WebP preview exposes responsive candidates");
    assert.ok(responsive.actual.sizes, "the WebP preview exposes its rendered-size hint");

    const fallback = await focusPreview(page, "#catalog-table-reading");
    assert.deepEqual(fallback.actual, fallback.expected);
    assert.equal(fallback.actual.srcset, "", "the SVG fallback clears the prior srcset");
    assert.equal(fallback.actual.sizes, "", "the SVG fallback clears the prior sizes hint");
    assert.equal(fallback.actual.width, "", "the fallback clears an inapplicable prior width");
    assert.equal(fallback.actual.height, "", "the fallback clears an inapplicable prior height");

    const restored = await focusPreview(page, "#catalog-lims-eln");
    assert.deepEqual(restored.actual, restored.expected);
    assert.ok(restored.actual.srcset, "a later WebP preview restores responsive candidates");
    assert.ok(restored.actual.width && restored.actual.height, "a later WebP preview restores intrinsic geometry");

    for (const state of [responsive, fallback, restored]) {
      assert.ok(state.geometry.figureLeft >= -1, "the preview stays inside the leading viewport edge");
      assert.ok(
        state.geometry.figureRight <= state.geometry.viewportWidth + 1,
        "the preview stays inside the trailing viewport edge",
      );
      assert.ok(
        state.geometry.documentWidth <= state.geometry.viewportWidth + 1,
        "preview replacement introduces no document-level horizontal overflow",
      );
    }

    assertTelemetry(telemetry);
  });
}

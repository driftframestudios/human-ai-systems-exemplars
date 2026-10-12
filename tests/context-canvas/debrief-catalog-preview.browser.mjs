import assert from "node:assert/strict";
import { resolve } from "node:path";
import { after, before, test } from "node:test";
import { pathToFileURL } from "node:url";

import { chromium, webkit } from "@playwright/test";

import {
  assertTelemetry,
  monitor,
  startStaticServer,
} from "../../tools/core-architecture-browser-helper.mjs";

const route = "/context-canvas-project-surface/context-canvas/debriefs.html";
const localRoute = resolve(
  import.meta.dirname,
  "../../context-canvas-project-surface/context-canvas/debriefs.html",
);
const expectedCaseBriefFields = [
  "Situation and stakes",
  "Scope and role",
  "Core constraint",
  "Key decision",
  "Outcome and evidence",
  "Relevance now",
];
const expectedEhrRoutes = [
  "ehr-discrete-genomic-result.html",
  "ehr-two-charts-one-result.html",
  "ehr-three-front-doors.html",
  "ehr-pgx-alert-failure.html",
  "ehr-interface-engine-replatform.html",
];
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
    const hasPreviewImage = card?.hasAttribute("data-catalog-preview-src");
    const preferred = name => hasPreviewImage
      ? attr(card, `data-catalog-preview-${name}`)
      : attr(primaryImage, name);
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

async function chooseCaseBriefMode(page) {
  await page.locator('input[data-filter][value="case-brief"]').check();
}

async function waitForCaseBriefProjection(page) {
  await page.waitForFunction(() => (
    document.querySelectorAll(
      '[data-debrief-list] > [data-formats~="case-brief"]:not([hidden]) [data-card-case-briefs] > .debrief-card__case-brief',
    ).length === 16
  ));
}

async function inspectCaseBriefProjection(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll(
      '[data-debrief-list] > [data-formats~="case-brief"]:not([hidden])',
    )];
    const articles = cards.flatMap(card => [...card.querySelectorAll(
      ":scope > [data-card-case-briefs] > .debrief-card__case-brief",
    )]);

    return {
      visibleCards: cards.length,
      articles: articles.map(article => {
        const fieldLabels = [...article.querySelectorAll(".debrief-preview-facts dt")]
          .map(label => label.textContent.trim());
        const actions = [...article.querySelectorAll(".debrief-preview-actions a")]
          .map(link => ({ label: link.textContent.trim(), href: link.getAttribute("href") }));
        const media = article.querySelector("[data-case-brief-media]");
        return {
          route: article.getAttribute("data-case-brief-route"),
          fieldLabels,
          actions,
          mediaItems: media?.querySelectorAll("li").length || 0,
          mediaLinks: [...(media?.querySelectorAll("a[href]") || [])]
            .map(link => link.getAttribute("href")),
        };
      }),
      clonedDetailCount: document.querySelectorAll(
        "[data-card-case-briefs] [data-case-brief-detail], [data-card-case-briefs] .debrief-case-brief__tracks",
      ).length,
      genericFallbackCount: [...document.querySelectorAll("[data-card-case-briefs]")]
        .filter(panel => /source page carries|open the direct route/iu.test(panel.textContent)).length,
      linkedHeadingCount: articles.filter(article => (
        article.querySelector(":scope > .debrief-card__case-brief-title > a[href]")
      )).length,
      eras: cards.map(card => {
        const era = card.querySelector(":scope > .debrief-card__heading .debrief-card__era");
        const eraBox = era?.getBoundingClientRect();
        const badges = [...card.querySelectorAll(
          ":scope > .debrief-card__types > li, :scope > .debrief-card__topics > li",
        )];
        const intersects = box => Boolean(eraBox && !(
          eraBox.right <= box.left
          || eraBox.left >= box.right
          || eraBox.bottom <= box.top
          || eraBox.top >= box.bottom
        ));
        return {
          card: card.id,
          text: era?.textContent.trim() || "",
          visible: Boolean(
            era
            && eraBox?.width
            && eraBox?.height
            && getComputedStyle(era).visibility !== "hidden"
            && getComputedStyle(era).display !== "none"
          ),
          overlaps: badges
            .map(badge => ({ text: badge.textContent.trim(), box: badge.getBoundingClientRect() }))
            .filter(item => intersects(item.box))
            .map(item => item.text),
        };
      }),
    };
  });
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

    const whoToBelieve = await focusPreview(page, "#catalog-who-to-believe");
    assert.deepEqual(whoToBelieve.actual, whoToBelieve.expected);
    assert.match(whoToBelieve.actual.src, /who_to_believe_influence_map\.svg$/u);
    assert.equal(whoToBelieve.actual.srcset, "", "the SVG preview clears the prior responsive candidates");
    assert.equal(whoToBelieve.actual.sizes, "", "the SVG preview clears the prior rendered-size hint");
    assert.equal(whoToBelieve.actual.width, "1600");
    assert.equal(whoToBelieve.actual.height, "1180");

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

    for (const state of [responsive, whoToBelieve, fallback, restored]) {
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

for (const width of [320, 390, 736, 737, 768, 1024, 1440]) {
  test(`Case Brief mode reveals static source-owned scans with stable badge geometry at ${width}px`, async t => {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    t.after(() => context.close());
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    const telemetry = monitor(page);
    await page.goto(`${server.origin}${route}`, { waitUntil: "load" });
    await chooseCaseBriefMode(page);
    await waitForCaseBriefProjection(page);

    const projection = await inspectCaseBriefProjection(page);
    assert.equal(projection.visibleCards, 12);
    assert.equal(projection.articles.length, 16);
    assert.equal(projection.clonedDetailCount, 0, "catalog scans stop before source-page track detail");
    assert.equal(projection.genericFallbackCount, 0, "the catalog synthesizes no generic brief fallback");
    assert.equal(projection.linkedHeadingCount, 0, "explicit actions own the two destinations without a duplicate title link");

    for (const article of projection.articles) {
      assert.deepEqual(
        article.fieldLabels,
        expectedCaseBriefFields,
        `${article.route} should project the ordered six-field scan`,
      );
      assert.ok(article.mediaItems >= 1, `${article.route} should project at least one related figure or medium`);
      assert.equal(
        article.mediaLinks.length,
        article.mediaItems,
        `${article.route} related-media entries should retain inspectable links`,
      );
      assert.ok(
        article.mediaLinks.every(href => href.startsWith(`${article.route}#`)),
        `${article.route} should qualify each source-local related-media fragment after cloning`,
      );
      assert.deepEqual(
        article.actions,
        [
          { label: "Read the Easy-to-Scan Case Brief", href: `${article.route}#case-brief` },
          { label: "Read the Full Debrief", href: article.route },
        ],
        `${article.route} should expose distinct compact and complete reading routes`,
      );
    }

    assert.equal(projection.eras.length, 12);
    for (const era of projection.eras) {
      assert.ok(era.text, `${era.card} should name its era in Case Brief mode`);
      assert.equal(era.visible, true, `${era.card} should keep its era visible in Case Brief mode`);
      assert.deepEqual(
        era.overlaps,
        [],
        `${era.card} era should remain clear of format, topic, and tool badges at ${width}px`,
      );
    }

    const ehrRoutes = projection.articles
      .filter(article => expectedEhrRoutes.includes(article.route))
      .map(article => article.route)
      .sort();
    assert.deepEqual(ehrRoutes, expectedEhrRoutes.slice().sort(), "the EHR series remains five distinct Case Brief panels");

    await page.locator('input[data-filter][value="catalog"]').check();
    await chooseCaseBriefMode(page);
    await page.locator('input[data-filter][value="catalog"]').check();
    await chooseCaseBriefMode(page);
    const repeated = await inspectCaseBriefProjection(page);
    assert.equal(repeated.articles.length, 16, "repeated mode changes should clone each projection once");
    assert.equal(new Set(repeated.articles.map(article => article.route)).size, 16);

    assert.match(await page.locator("[data-filter-status]").textContent(), /^Showing 16 Case Briefs across 12 catalog cases/u);
    assertTelemetry(telemetry);
  });
}

test("a missing EHR projection retains its complete ordinary card as one atomic fallback", async t => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 1000 },
    reducedMotion: "reduce",
  });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const telemetry = monitor(page);

  await page.route(`**${route}`, async intercepted => {
    const response = await intercepted.fetch();
    const body = await response.text();
    const withoutProjection = body.replace(
      /\s*<template\b(?=[^>]*\bdata-case-brief-projection="ehr-interface-engine-replatform\.html")[^>]*>[\s\S]*?<\/template>/u,
      "",
    );
    assert.notEqual(withoutProjection, body, "the fixture should remove the intended EHR projection");
    await intercepted.fulfill({ response, body: withoutProjection });
  });
  await page.goto(`${server.origin}${route}`, { waitUntil: "load" });
  await chooseCaseBriefMode(page);
  await page.waitForFunction(() => (
    document.querySelectorAll(
      '[data-debrief-list] > [data-formats~="case-brief"]:not([hidden]) [data-card-case-briefs] > .debrief-card__case-brief',
    ).length === 11
  ));

  const projection = await inspectCaseBriefProjection(page);
  assert.equal(projection.visibleCards, 12);
  assert.equal(projection.articles.length, 11, "the five-route EHR card remains atomic when one source fails");
  assert.equal(projection.genericFallbackCount, 0);
  assert.equal(projection.linkedHeadingCount, 0);
  const failedEra = projection.eras.find(era => era.card === "catalog-ehr-integration");
  assert.ok(failedEra?.visible, "the fallback EHR card should retain its era orientation");
  assert.deepEqual(failedEra?.overlaps, [], "the fallback era should remain clear of its visible badges at 390px");
  assert.equal(projection.articles.some(article => expectedEhrRoutes.includes(article.route)), false);

  const failedCard = await page.locator("#catalog-ehr-integration").evaluate(card => {
    const fullRoute = card.querySelector(":scope > .txt-right a");
    const compact = card.querySelector("[data-card-case-briefs]");
    return {
      ordinaryImageVisible: getComputedStyle(card.querySelector(".project__media--container")).display !== "none",
      ordinaryTextVisible: getComputedStyle(card.querySelector(".project__media--text")).display !== "none",
      compactHidden: compact?.hidden,
      compactArticles: compact?.querySelectorAll(".debrief-card__case-brief").length,
      fullRouteLabel: fullRoute?.textContent.replace(/\s+/g, " ").trim(),
      fullRouteHref: fullRoute?.getAttribute("href"),
    };
  });
  assert.deepEqual(failedCard, {
    ordinaryImageVisible: true,
    ordinaryTextVisible: true,
    compactHidden: true,
    compactArticles: 0,
    fullRouteLabel: "Read the Full Debrief for the first EHR Integration Series reading...",
    fullRouteHref: "ehr-discrete-genomic-result.html",
  });
  assert.equal(
    (await page.locator("[data-filter-status]").textContent()).trim(),
    "11 of 16 Case Briefs are displayed in the catalog. 5 Full Debrief routes remain available in their catalog cards.",
  );

  assertTelemetry(telemetry);
});

test("Case Brief mode reads every static scan from file URLs without request failures", async t => {
  const context = await browser.newContext({
    viewport: { width: 736, height: 1000 },
    reducedMotion: "reduce",
  });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const pageErrors = [];
  const requestFailures = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("requestfailed", request => requestFailures.push(
    `${request.url()} :: ${request.failure()?.errorText || "request failed"}`,
  ));

  await page.goto(pathToFileURL(localRoute).href, { waitUntil: "load" });
  await chooseCaseBriefMode(page);
  await waitForCaseBriefProjection(page);

  const projection = await inspectCaseBriefProjection(page);
  assert.equal(projection.visibleCards, 12);
  assert.equal(projection.articles.length, 16);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(requestFailures, []);
});

test("WebKit preserves the Case Brief contract over HTTP and direct-file viewing", async t => {
  const webkitBrowser = await webkit.launch({ headless: true });
  t.after(() => webkitBrowser.close());
  const context = await webkitBrowser.newContext({
    viewport: { width: 736, height: 1000 },
    reducedMotion: "reduce",
  });
  t.after(() => context.close());

  for (const [destination, directFile] of [
    [`${server.origin}${route}`, false],
    [pathToFileURL(localRoute).href, true],
  ]) {
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    const pageErrors = [];
    const requestFailures = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("requestfailed", request => requestFailures.push(
      `${request.url()} :: ${request.failure()?.errorText || "request failed"}`,
    ));

    await page.goto(destination, { waitUntil: "load" });
    await chooseCaseBriefMode(page);
    await waitForCaseBriefProjection(page);

    const projection = await inspectCaseBriefProjection(page);
    assert.equal(projection.visibleCards, 12);
    assert.equal(projection.articles.length, 16);
    assert.ok(projection.eras.every(era => era.visible && era.overlaps.length === 0));
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(
      requestFailures.filter(message => /\.html\b/iu.test(message)),
      [],
      "WebKit should make no sibling-page request for a Case Brief projection",
    );
    if (directFile) {
      assert.ok(
        requestFailures.every(message => /manifest\.json/iu.test(message)),
        requestFailures.join(" | "),
      );
    } else {
      assert.deepEqual(requestFailures, []);
    }
    await page.close();
  }
});

test("the Full Debrief index names every EHR reading from its route-specific navigation", async t => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const telemetry = monitor(page);

  await page.goto(`${server.origin}${route}`, { waitUntil: "load" });
  await page.locator('input[data-filter][value="full-debrief"]').check();

  const labels = await page.locator("#catalog-ehr-integration [data-card-full-index] a").evaluateAll(links => (
    links.map(link => link.textContent.replace(/\s+/g, " ").trim())
  ));
  assert.deepEqual(labels, [
    "SR1 · Partial The Discrete Result That Kept Arriving as a PDF",
    "SR2 · Pivoted Two Charts, One Result",
    "SR3 · Successful Three Front Doors",
    "SR4 · Failed The Alert Nobody Clicked",
    "SR5 · Partial Re-platforming the Backbone",
  ]);
  assertTelemetry(telemetry);
});

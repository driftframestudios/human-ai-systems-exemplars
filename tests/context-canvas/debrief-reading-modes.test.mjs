import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);

const expectedCaseBriefFields = [
  "Situation and stakes",
  "Scope and role",
  "Core constraint",
  "Key decision",
  "Outcome and evidence",
  "Relevance now",
];

const formatLabels = new Map([
  ["Case Brief", "case-brief"],
  ["Full Debrief", "full-debrief"],
  ["Article", "article"],
]);

const readingModeLabels = new Map([
  ["Catalog overview", "catalog"],
  ["Case Briefs", "case-brief"],
  ["Full Debrief index", "full-debrief"],
  ["Articles", "article"],
]);

const topicLabels = new Map([
  ["Practice", "practice"],
  ["Data Visualization", "data-visualization"],
  ["Research", "research"],
  ["AI Systems", "ai-systems"],
  ["Interactive Instrument", "instrument"],
]);

async function readCanvasFile(path) {
  return readFile(resolve(canvasRoot, path), "utf8");
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`, "u"));
  return match ? match[1] : "";
}

function values(tag, name) {
  return attribute(tag, name).split(/\s+/u).filter(Boolean);
}

function countValues(cards, name) {
  const counts = new Map();
  for (const card of cards) {
    for (const value of values(card.tag, name)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

function displayedCounts(html, ariaLabel, labels) {
  const list = html.match(new RegExp(
    `<ul class="debrief-tag-cloud clean-list" aria-label="${ariaLabel}">([\\s\\S]*?)<\\/ul>`,
    "u",
  ));
  assert.ok(list, `Expected ${ariaLabel}`);
  return new Map(
    Array.from(list[1].matchAll(/<li><span>([^<]+)<\/span><strong>(\d+)<\/strong><\/li>/gu))
      .map(match => [labels.get(match[1]), Number.parseInt(match[2], 10)]),
  );
}

test("Debrief catalog gives Case Briefs a true display mode and retains every direct route", async () => {
  const [html, script] = await Promise.all([
    readCanvasFile("debriefs.html"),
    readCanvasFile("debriefs-catalog.js"),
  ]);
  const cards = Array.from(html.matchAll(/<li id="(catalog-[^"]+)" class="project__media debrief-catalog__card"[^>]*>/gu))
    .map(match => ({ id: match[1], tag: match[0] }));

  assert.equal(cards.length, 19);
  for (const card of cards) {
    assert.ok(attribute(card.tag, "data-formats"), `${card.id} should declare a format`);
    assert.ok(attribute(card.tag, "data-topics"), `${card.id} should declare a topic or tool`);
    for (const format of values(card.tag, "data-formats")) {
      assert.ok(Array.from(formatLabels.values()).includes(format), `${card.id} has an unknown format: ${format}`);
    }
    for (const topic of values(card.tag, "data-topics")) {
      assert.ok(Array.from(topicLabels.values()).includes(topic), `${card.id} has an unknown topic: ${topic}`);
    }
  }

  for (const [label, value] of readingModeLabels) {
    assert.match(
      html,
      new RegExp(`<input[^>]*type="radio"[^>]*name="format"[^>]*value="${value}"[^>]*>[\\s\\S]*?<span class="debrief-filter__label">${label}<\\/span>`, "u"),
      `${label} should be one mutually exclusive reading mode`,
    );
  }
  assert.doesNotMatch(html, /<input[^>]*type="checkbox"[^>]*name="format"/u);

  assert.deepEqual(
    displayedCounts(html, "Reading route counts", formatLabels),
    new Map([
      ["case-brief", 16],
      ["full-debrief", 16],
      ["article", 7],
    ]),
  );
  assert.deepEqual(
    displayedCounts(html, "Topic and tool counts", topicLabels),
    countValues(cards, "data-topics"),
  );

  const caseBriefCards = cards.filter(card => values(card.tag, "data-formats").includes("case-brief"));
  const articleCards = cards.filter(card => values(card.tag, "data-formats").includes("article"));
  assert.equal(caseBriefCards.length, 12);
  assert.equal(articleCards.length, 7);
  for (const card of caseBriefCards) {
    assert.deepEqual(values(card.tag, "data-formats"), ["case-brief", "full-debrief"]);
    assert.ok(attribute(card.tag, "data-case-brief-routes"), `${card.id} should name its Full Debrief route`);
  }
  for (const card of articleCards) {
    assert.equal(attribute(card.tag, "data-case-brief-routes"), "");
  }

  const fullDebriefCallsToAction = Array.from(html.matchAll(
    /<span class="txt-right">\s*<a href="([^"#]+)">Read the Full Debrief/gu,
  ), match => match[1]).sort();
  assert.deepEqual(
    fullDebriefCallsToAction,
    caseBriefCards.map(card => values(card.tag, "data-case-brief-routes")[0]).sort(),
    "Each Full Debrief card should keep a fragment-free complete-account route without scripting",
  );

  const ehrStart = html.indexOf('<li id="catalog-ehr-integration"');
  const ehrEnd = html.indexOf('<li id="catalog-lims-eln"', ehrStart);
  const ehrCard = html.slice(ehrStart, ehrEnd);
  const ehrRoutes = values(
    cards.find(card => card.id === "catalog-ehr-integration").tag,
    "data-case-brief-routes",
  ).sort();
  const ehrSeriesLinks = Array.from(ehrCard.matchAll(
    /<li><a href="([^"#]+)"><strong>SR\d/gu,
  ), match => match[1]).sort();
  assert.deepEqual(ehrSeriesLinks, ehrRoutes, "Each EHR series route should open its complete Full Debrief");

  assert.doesNotMatch(html, /href="[^"]+#case-brief"/u);
  const eras = Array.from(html.matchAll(
    /<p class="debrief-card__era" aria-label="[^"]+">([^<]+)<\/p>/gu,
  ), match => match[1].trim());
  assert.equal(eras.length, cards.length, "Every catalog entry should expose one visible era or date");
  assert.ok(eras.every(Boolean), "Every era or date label should carry visible text");
  assert.match(
    html,
    /Choose one reading mode, then add any topics or tools that help narrow the collection\. Choose the\s*<strong>Case Brief mode<\/strong> for a scanning-friendly overview directly on this page\./u,
  );
  assert.equal(
    Array.from(html.matchAll(/\{\{PUBLIC_URL_REGISTRY_SITE_READING_STORY_WALL\}\}/gu)).length,
    1,
    "The Story Wall continuation should have one public-reference owner",
  );
  assert.ok(
    html.indexOf("{{PUBLIC_URL_REGISTRY_SITE_READING_STORY_WALL}}") > html.indexOf('id="debrief-amplified-reach-title"'),
    "The Story Wall continuation should follow the catalog",
  );

  assert.doesNotMatch(html, /Executive Summar(?:y|ies)/u);
  assert.match(script, /"executive-summary": \{ kind: "format", value: "case-brief" \}/u);
  assert.match(script, /legacyOrMode/u);
  assert.match(script, /unknownLegacyTypes/u);
  assert.match(script, /catalog\.setAttribute\("data-reading-mode", displayMode\)/u);
  assert.match(script, /function ensureCaseBriefDisplay\(card\)/u);
  assert.match(script, /function createCaseBriefArticle\(card, route, source, index\)/u);
  assert.match(script, /existing\.setAttribute\("data-card-full-index", ""\)/u);
  assert.match(script, /cloneForCatalog\(source\.fields, "debrief-preview-facts", route\)/u);
  assert.match(script, /cloneForCatalog\(source\.media, "debrief-card__case-brief-media", route\)/u);
  assert.doesNotMatch(script, /createCaseBriefFallback/u);
  assert.doesNotMatch(script, /source page carries this complete Case Brief/iu);
  assert.doesNotMatch(script, /source\.detail/u, "The catalog should leave the deeper track digest on the source page");
  assert.match(script, /caseBriefCache\.delete\(route\)/u, "A rejected source request should remain retryable");
  assert.match(script, /route \+ "#case-brief", "Open the Case Brief"/u);
  assert.match(script, /route, "Read the Full Debrief"/u);
  assert.match(html, /data-preview-link[^>]*>[\s\S]*?Read the Full Debrief/u);
  assert.doesNotMatch(html, /data-preview-case-brief-content/u);
});

test("Every catalogued Full Debrief carries one complete Case Brief contract", async () => {
  const catalog = await readCanvasFile("debriefs.html");
  const caseBriefRoutes = Array.from(catalog.matchAll(/\bdata-case-brief-routes="([^"]+)"/gu))
    .flatMap(match => match[1].split(/\s+/u));
  const uniqueRoutes = [...new Set(caseBriefRoutes)];

  assert.equal(caseBriefRoutes.length, 16);
  assert.equal(uniqueRoutes.length, 16);

  for (const route of uniqueRoutes) {
    const html = await readCanvasFile(route);
    assert.match(
      html,
      /<link rel="stylesheet" href="styles\/components\/debrief-reading\.css">/u,
      `${route} should load the shared owner for its Case Brief track and media styles`,
    );
    const sections = Array.from(html.matchAll(
      /<section\b(?=[^>]*\bid="case-brief")(?=[^>]*\bdata-content-form="case-brief")(?=[^>]*\baria-labelledby="([^"]+)")[^>]*>([\s\S]*?)<\/section>/gu,
    ));
    assert.equal(sections.length, 1, `${route} should carry one Case Brief section`);

    const headingId = sections[0][1];
    const section = sections[0][2];
    assert.match(
      section,
      new RegExp(`<h2\\b[^>]*id="${headingId}"[^>]*>\\s*At-a-Glance\\s*<\\/h2>`, "u"),
      `${route} should expose the shared visible heading`,
    );

    const orientation = section.match(
      /<h2\b[^>]*>\s*At-a-Glance\s*<\/h2>\s*<p(?:\s[^>]*)?>([\s\S]*?)<\/p>\s*<dl class="debrief-at-glance">/u,
    );
    assert.ok(orientation, `${route} should orient a cold reader before the six fields`);
    assert.ok(
      orientation[1].replace(/<[^>]+>/gu, "").replace(/\s+/gu, " ").trim().length >= 40,
      `${route} should provide a meaningful Case Brief orientation`,
    );

    const definitionList = section.match(/<dl class="debrief-at-glance">([\s\S]*?)<\/dl>/u);
    assert.ok(definitionList, `${route} should preserve the shared at-a-glance grid owner`);
    const labels = Array.from(definitionList[1].matchAll(/<dt>([^<]+)<\/dt>/gu), match => match[1]);
    assert.deepEqual(labels, expectedCaseBriefFields, `${route} should carry the six-field Case Brief contract`);
    assert.match(section, /<p><strong>Basis and limits:<\/strong>[^<]+<\/p>/u, `${route} should state its basis and limits`);

    const detailStart = section.indexOf('data-case-brief-detail');
    const basisStart = section.indexOf("<strong>Basis and limits:</strong>");
    const continuationStart = section.indexOf("Read the Full Debrief");
    assert.ok(detailStart > basisStart, `${route} should place the track digest after its evidence boundary`);
    assert.ok(continuationStart > detailStart, `${route} should place the Full Debrief continuation after the digest`);
    assert.match(
      section,
      /<div\b(?=[^>]*\bdata-case-brief-detail\b)[^>]*>[\s\S]*?<\/article>\s*<\/div>\s*<div\b(?=[^>]*\bdata-case-brief-media\b)[^>]*>/u,
      `${route} should keep the concise media index beside, rather than inside, the source-page track digest`,
    );

    const tracks = Array.from(section.matchAll(
      /<article\b(?=[^>]*\bclass="[^"]*\bdebrief-case-brief__track\b[^"]*")(?=[^>]*\bdata-case-brief-track="([^"]+)")[^>]*>([\s\S]*?)<\/article>/gu,
    ), match => ({ kind: match[1], html: match[2] }));
    const expectedTrackKinds = route === "three-way-comparative-return.html"
      ? ["comparative", "return"]
      : ["solution", "implementation"];
    assert.deepEqual(tracks.map(track => track.kind), expectedTrackKinds, `${route} should expose its truthful paired scan`);

    for (const track of tracks) {
      const links = Array.from(track.html.matchAll(/<li\b[^>]*>[\s\S]*?<a\b[^>]*href="#([^"]+)"/gu), match => match[1]);
      const expectedCount = route === "three-way-comparative-return.html"
        ? (track.kind === "comparative" ? 5 : 3)
        : (route === "field-inspection-harness-replatform.html" && track.kind === "implementation" ? 6 : 5);
      assert.equal(links.length, expectedCount, `${route} ${track.kind} scan should represent every owned beat`);
      for (const id of links) {
        assert.match(html, new RegExp(`\\bid="${id}"`, "u"), `${route} should resolve ${track.kind} scan link #${id}`);
      }
    }

    const media = section.match(
      /<div class="debrief-case-brief__media" data-case-brief-media>([\s\S]*?)<\/div>/u,
    );
    assert.ok(media, `${route} should carry one reviewed related-media index`);
    const mediaLinks = Array.from(media[1].matchAll(/<li\b[^>]*>[\s\S]*?<a\b[^>]*href="#([^"]+)"/gu), match => match[1]);
    assert.ok(mediaLinks.length >= 1 && mediaLinks.length <= 3, `${route} should keep its related-media index concise`);
    for (const id of mediaLinks) {
      assert.match(html, new RegExp(`\\bid="${id}"`, "u"), `${route} should resolve media link #${id}`);
    }

    const continuation = section.match(/<a\b[^>]*href="(#[^"]+)"[^>]*>\s*Read the Full Debrief[^<]*<\/a>/u);
    assert.ok(continuation, `${route} should continue into the Full Debrief`);
    const destinationId = continuation[1].slice(1);
    assert.match(html, new RegExp(`\\bid="${destinationId}"`, "u"), `${route} continuation should resolve in the document`);
  }
});

test("Who To Believe keeps rounded outcome figures anchored to contemporaneous telemetry notes", async () => {
  const html = await readCanvasFile("who-to-believe-reviews-platform.html");
  const caseBriefStart = html.indexOf('<section id="case-brief"');
  const caseBriefEnd = html.indexOf("</section>", caseBriefStart);
  const outcomesStart = html.indexOf('<h3 id="solution-outcomes-title"');
  const outcomesEnd = html.indexOf('<h3 id="solution-repeatability-title"', outcomesStart);

  assert.ok(caseBriefStart >= 0 && caseBriefEnd > caseBriefStart, "Expected the Who To Believe Case Brief");
  assert.ok(outcomesStart >= 0 && outcomesEnd > outcomesStart, "Expected the Who To Believe outcomes section");

  const caseBrief = html.slice(caseBriefStart, caseBriefEnd);
  const outcomes = html.slice(outcomesStart, outcomesEnd);

  assert.match(caseBrief, /These rounded percentages come from contemporaneous notes taken from system telemetry/u);
  assert.match(outcomes, /Contemporaneous notes from system telemetry record the checkpoint/u);
  assert.match(outcomes, /Original denominators and event definitions would reconstruct the rate/u);
  assert.match(outcomes, /causal attribution would require the original experiment or a defensible observational design/u);
  assert.match(outcomes, /Contemporaneous telemetry notes record both checkpoints/u);
  assert.match(outcomes, /Contemporaneous notes from system telemetry record both directions/u);
  assert.doesNotMatch(`${caseBrief}\n${outcomes}`, /(?:My (?:approximate|directional) recollection|I (?:recall|remember))/u);
});

test("the two table-reading articles retain ordinary routes and the Atlas reading closes the catalog", async () => {
  const html = await readCanvasFile("debriefs.html");
  const cards = [...html.matchAll(/<li id="(catalog-[^"]+)" class="project__media debrief-catalog__card"[^>]*>/gu)];
  const tableReading = cards.find(card => card[1] === "catalog-table-reading");
  assert.ok(tableReading);
  assert.deepEqual(values(tableReading[0], "data-formats"), ["article"]);
  assert.deepEqual(values(tableReading[0], "data-topics"), ["research", "practice", "data-visualization", "ai-systems"]);
  assert.equal(attribute(tableReading[0], "data-case-brief-routes"), "");
  assert.match(
    html.slice(tableReading.index, cards.find(card => card.index > tableReading.index)?.index),
    /href="readable-tables-reusable-evidence\.html">Read the Article/u,
  );

  const last = cards.at(-1);
  assert.equal(last[1], "catalog-atlas-reference");
  assert.deepEqual(values(last[0], "data-formats"), ["article"]);
  assert.deepEqual(values(last[0], "data-topics"), ["research", "practice", "data-visualization", "ai-systems"]);
  assert.equal(attribute(last[0], "data-case-brief-routes"), "");
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/u)[1]);
  const list = graph["@graph"].find(item => item["@type"] === "ItemList");
  assert.equal(list.numberOfItems, list.itemListElement.length);
  assert.equal(list.itemListElement.at(-1).position, list.numberOfItems);
  assert.ok(list.itemListElement.at(-1).url.endsWith("/one-figure-several-readings.html"));
  const article = await readCanvasFile("readable-tables-reusable-evidence.html");
  assert.match(article, /<h1\b[^>]*>Give the Comparison Room<\/h1>/u);
  assert.match(article, /estimate verification work at the beginning/u);
  assert.match(article, /focused unit, integration, regression, or browser checks/u);
  assert.match(article, /full suite belongs in the completion path/u);
  assert.match(article, /Cartesian matrix can cross routes, viewports, states, input classes, and interactions/u);
  assert.match(article, /SVG contributes a compact geometric oracle[\s\S]*painter’s order/u);
  assert.match(article, /Playwright/u);
  const atlasReading = await readCanvasFile("one-figure-several-readings.html");
  assert.match(atlasReading, /<h1\b[^>]*>One Figure, Several Readings<\/h1>/u);
  assert.match(html.slice(last.index), /href="one-figure-several-readings.html">Read the Article/u);
});

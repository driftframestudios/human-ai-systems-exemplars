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

  const compactCallsToAction = Array.from(html.matchAll(
    /<span class="txt-right">\s*<a href="([^"#]+)#case-brief">Read the Case Brief/gu,
  ), match => match[1]).sort();
  assert.deepEqual(
    compactCallsToAction,
    caseBriefCards.map(card => values(card.tag, "data-case-brief-routes")[0]).sort(),
    "Each Case Brief card should retain a direct compact path without scripting",
  );

  const ehrStart = html.indexOf('<li id="catalog-ehr-integration"');
  const ehrEnd = html.indexOf('<li id="catalog-lims-eln"', ehrStart);
  const ehrCard = html.slice(ehrStart, ehrEnd);
  const ehrRoutes = values(
    cards.find(card => card.id === "catalog-ehr-integration").tag,
    "data-case-brief-routes",
  ).sort();
  const ehrSeriesLinks = Array.from(ehrCard.matchAll(
    /<li><a href="([^"#]+)#case-brief"><strong>SR\d/gu,
  ), match => match[1]).sort();
  assert.deepEqual(ehrSeriesLinks, ehrRoutes, "Each EHR series route should retain its own Case Brief path");

  assert.doesNotMatch(html, /Executive Summar(?:y|ies)/u);
  assert.match(script, /"executive-summary": \{ kind: "format", value: "case-brief" \}/u);
  assert.match(script, /legacyOrMode/u);
  assert.match(script, /unknownLegacyTypes/u);
  assert.match(script, /catalog\.setAttribute\("data-reading-mode", displayMode\)/u);
  assert.match(script, /function ensureCaseBriefDisplay\(card\)/u);
  assert.match(script, /function createCaseBriefArticle\(card, route, source, index\)/u);
  assert.match(script, /existing\.setAttribute\("data-card-full-index", ""\)/u);
  assert.match(script, /cloneForCatalog\(source\.fields, "debrief-preview-facts", route\)/u);
  assert.match(script, /caseBriefCache\.delete\(route\)/u, "A rejected source request should remain retryable");
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
    const sections = Array.from(html.matchAll(
      /<section\b(?=[^>]*\bid="case-brief")(?=[^>]*\bdata-content-form="case-brief")(?=[^>]*\baria-labelledby="([^"]+)")[^>]*>([\s\S]*?)<\/section>/gu,
    ));
    assert.equal(sections.length, 1, `${route} should carry one Case Brief section`);

    const headingId = sections[0][1];
    const section = sections[0][2];
    assert.match(
      section,
      new RegExp(`<h2\\b[^>]*id="${headingId}"[^>]*>\\s*At a glance\\s*<\\/h2>`, "u"),
      `${route} should expose the shared visible heading`,
    );

    const orientation = section.match(
      /<h2\b[^>]*>\s*At a glance\s*<\/h2>\s*<p(?:\s[^>]*)?>([\s\S]*?)<\/p>\s*<dl class="debrief-at-glance">/u,
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

    const continuation = section.match(/<a\b[^>]*href="(#[^"]+)"[^>]*>\s*Read the Full Debrief[^<]*<\/a>/u);
    assert.ok(continuation, `${route} should continue into the Full Debrief`);
    const destinationId = continuation[1].slice(1);
    assert.match(html, new RegExp(`\\bid="${destinationId}"`, "u"), `${route} continuation should resolve in the document`);
  }
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
  const atlasReading = await readCanvasFile("one-figure-several-readings.html");
  assert.match(atlasReading, /<h1\b[^>]*>One Figure, Several Readings<\/h1>/u);
  assert.match(html.slice(last.index), /href="one-figure-several-readings.html">Read the Article/u);
});

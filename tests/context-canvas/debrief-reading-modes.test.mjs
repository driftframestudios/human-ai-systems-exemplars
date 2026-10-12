import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);
const compactSourcePath = resolve(
  repositoryRoot,
  "context-canvas-project-surface/data/debrief-case-briefs.source.html",
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

function normalizeVisibleText(html) {
  return html
    .replace(/<[^>]+>/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/&nbsp;/gu, " ")
    .replace(/&#(?:x27|39);/gu, "'")
    .replace(/&quot;/gu, '"')
    .replace(/\s+/gu, " ")
    .trim();
}

function definitionPairs(html) {
  const list = html.match(/<dl\b[^>]*>([\s\S]*?)<\/dl>/u);
  assert.ok(list, "Expected a definition list");
  return Array.from(list[1].matchAll(
    /<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gu,
  ), match => ({
    label: normalizeVisibleText(match[1]),
    value: normalizeVisibleText(match[2]),
  }));
}

function caseBriefProjections(html) {
  return Array.from(html.matchAll(
    /<template\b(?=[^>]*\bdata-case-brief-projection="([^"]+)")[^>]*>([\s\S]*?)<\/template>/gu,
  ), match => ({
    route: match[1],
    title: attribute(match[0], "data-case-brief-title"),
    html: match[2],
  }));
}

function caseBriefSources(html) {
  const starts = [...html.matchAll(
    /<article\b(?=[^>]*\bdata-case-brief-source="([^"]+)")[^>]*>/gu,
  )];
  return starts.map((match, index) => ({
    route: match[1],
    html: html.slice(match.index, starts[index + 1]?.index ?? html.length),
  }));
}

function caseBriefTracks(html, element = "article") {
  return Array.from(html.matchAll(new RegExp(
    `<${element}\\b(?=[^>]*\\bdata-case-brief-track="([^"]+)")[^>]*>([\\s\\S]*?)<\\/${element}>`,
    "gu",
  )), match => ({
    kind: match[1],
    tag: match[0].slice(0, match[0].indexOf(">") + 1),
    html: match[2],
  }));
}

function projectionMediaLinks(html) {
  const media = html.match(
    /<div\b(?=[^>]*\bdata-case-brief-media\b)[^>]*>([\s\S]*?)<\/div>/u,
  );
  assert.ok(media, "Expected a related-media projection");
  return Array.from(media[1].matchAll(/<a\b[^>]*href="([^"]+)"/gu), match => match[1]);
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
  assert.match(
    html,
    /every complete account remains available through an ordinary Full Debrief link\. The small catalog enhancement presents the scanning-friendly Case Brief mode when scripts run\./u,
    "The no-script path should lead with the ordinary complete-reading route and describe the bounded enhancement accurately",
  );
  assert.match(script, /"executive-summary": \{ kind: "format", value: "case-brief" \}/u);
  assert.match(script, /legacyOrMode/u);
  assert.match(script, /unknownLegacyTypes/u);
  assert.match(script, /catalog\.setAttribute\("data-reading-mode", displayMode\)/u);
  assert.match(script, /function ensureCaseBriefDisplay\(card\)/u);
  assert.match(script, /function caseBriefProjection\(route\)/u);
  assert.match(script, /document\.importNode\(template\.content, true\)/u);
  assert.match(script, /trackHeading\.matches\("h4\.debrief-case-brief__track-group-title"\)/u);
  assert.match(script, /trackChildren\[1\]\.matches\("p\.debrief-case-brief__track-intro"\)/u);
  assert.match(script, /var disclosures = trackChildren\.slice\(trackIntro \? 2 : 1\)/u);
  assert.match(script, /function createCaseBriefArticle\(card, route, projection, index\)/u);
  assert.match(script, /existing\.setAttribute\("data-card-full-index", ""\)/u);
  assert.doesNotMatch(script, /rewriteFragmentLinks/u, "The authored projection should already carry route-qualified fragments");
  assert.doesNotMatch(script, /createCaseBriefFallback/u);
  assert.doesNotMatch(script, /source page carries this complete Case Brief/iu);
  assert.doesNotMatch(script, /\b(?:window\.)?fetch\s*\(/u, "Case Brief mode should read the authored projection without a network request");
  assert.doesNotMatch(script, /\bDOMParser\b/u, "Case Brief mode should clone authored DOM rather than parse fetched pages");
  assert.doesNotMatch(script, /\bcaseBriefCache\b|function\s+loadCaseBrief\b|function\s+parseCaseBriefSource\b/u);
  assert.doesNotMatch(script, /Read the Easy-to-Scan Case Brief|route \+ "#case-brief"/u);
  assert.match(script, /route, "Read the Full Debrief"/u);
  assert.match(html, /data-preview-link[^>]*>[\s\S]*?Read the Full Debrief/u);
  assert.doesNotMatch(html, /data-preview-case-brief-content/u);

  const projections = caseBriefProjections(html);
  assert.equal(projections.length, 16, "The catalog should carry one static projection for each Case Brief route");
  assert.equal(new Set(projections.map(projection => projection.route)).size, 16);
  assert.deepEqual(
    projections.map(projection => projection.route).sort(),
    caseBriefCards.flatMap(card => values(card.tag, "data-case-brief-routes")).sort(),
    "Static projections should cover the declared route contract exactly",
  );
  for (const projection of projections) {
    assert.ok(projection.title, `${projection.route} should carry its source-owned heading`);
    assert.deepEqual(
      definitionPairs(projection.html).map(pair => pair.label),
      expectedCaseBriefFields,
      `${projection.route} should carry the ordered six-field scanning contract`,
    );
    assert.match(
      projection.html,
      /<h4 class="txt-h4 debrief-case-brief__track-group-title">(?:Solution and implementation|Comparison and return) quick scan<\/h4>/u,
      `${projection.route} should begin its track group with the admitted heading`,
    );
    const trackIntros = Array.from(projection.html.matchAll(
      /<p class="debrief-case-brief__track-intro">([\s\S]*?)<\/p>/gu,
    ));
    if (projection.route === "choose-your-player-humatics.html") {
      assert.equal(trackIntros.length, 1, "the Humatics compact account should retain its narrative-track orientation");
      assert.match(
        trackIntros[0][1],
        /href="choose-your-player-humatics\.html#narrative-architecture-title"/u,
        "the Humatics introduction should qualify its source-local narrative route",
      );
      assert.match(trackIntros[0][1], /client meeting, field inquiry, and two-day reframe/u);
    } else {
      assert.equal(trackIntros.length, 0, `${projection.route} should add no unowned track introduction`);
    }
    const tracks = caseBriefTracks(projection.html, "details");
    const expectedTrackKinds = projection.route === "three-way-comparative-return.html"
      ? ["comparative", "return"]
      : ["solution", "implementation"];
    assert.deepEqual(tracks.map(track => track.kind), expectedTrackKinds, `${projection.route} should carry its truthful paired scan`);
    for (const track of tracks) {
      assert.doesNotMatch(track.tag, /\sopen(?:\s|=|>)/u, `${projection.route} ${track.kind} quick scan should begin collapsed`);
      assert.match(track.html, /class="debrief-case-brief__track-title"/u);
      assert.match(track.html, /class="debrief-case-brief__track-state"[^>]*aria-hidden="true"/u);
      assert.match(track.html, /class="debrief-case-brief__track-state--expand"[^>]*>Expand</u);
      assert.match(track.html, /class="debrief-case-brief__track-state--collapse"[^>]*>Collapse</u);
      assert.match(track.html, /<ol\b/u, `${projection.route} ${track.kind} quick scan should retain its ordered story beats`);
    }
    const mediaLinks = projectionMediaLinks(projection.html);
    assert.ok(mediaLinks.length >= 1, `${projection.route} should carry at least one related-media route`);
    assert.ok(
      mediaLinks.every(href => href.startsWith(`${projection.route}#`)),
      `${projection.route} template should qualify source-local fragments for the no-JavaScript carrier`,
    );
  }
});

test("The bounded compact-account source owns every catalogued Case Brief", async () => {
  const [catalog, compactSource] = await Promise.all([
    readCanvasFile("debriefs.html"),
    readFile(compactSourcePath, "utf8"),
  ]);
  const caseBriefRoutes = Array.from(catalog.matchAll(/\bdata-case-brief-routes="([^"]+)"/gu))
    .flatMap(match => match[1].split(/\s+/u));
  const uniqueRoutes = [...new Set(caseBriefRoutes)];
  const sources = new Map(caseBriefSources(compactSource).map(source => [source.route, source.html]));
  const projections = new Map(
    caseBriefProjections(catalog).map(projection => [projection.route, projection.html]),
  );

  assert.equal(caseBriefRoutes.length, 16);
  assert.equal(uniqueRoutes.length, 16);
  assert.equal(sources.size, 16);
  assert.deepEqual([...sources.keys()].sort(), uniqueRoutes.slice().sort());

  for (const route of uniqueRoutes) {
    const html = await readCanvasFile(route);
    const source = sources.get(route);
    const projection = projections.get(route);
    assert.ok(source, `${route} should have one compact-account source`);
    assert.ok(projection, `${route} should have one static catalog projection`);
    assert.match(source, /<h2\b[^>]*\bdata-case-brief-title\b/u, `${route} should name its compact account`);
    const orientation = source.match(/<p\b[^>]*\bdata-case-brief-orientation\b[^>]*>([\s\S]*?)<\/p>/u);
    assert.ok(orientation, `${route} should orient a cold reader before the six fields`);
    assert.ok(
      orientation[1].replace(/<[^>]+>/gu, "").replace(/\s+/gu, " ").trim().length >= 40,
      `${route} should provide a meaningful Case Brief orientation`,
    );

    const definitionList = source.match(/<dl\b[^>]*\bdata-case-brief-fields\b[^>]*>([\s\S]*?)<\/dl>/u);
    assert.ok(definitionList, `${route} should preserve the six-field compact account`);
    const labels = Array.from(definitionList[1].matchAll(/<dt>([^<]+)<\/dt>/gu), match => match[1]);
    assert.deepEqual(labels, expectedCaseBriefFields, `${route} should carry the six-field Case Brief contract`);
    assert.deepEqual(
      definitionPairs(projection),
      definitionPairs(definitionList[0]),
      `${route} catalog projection should preserve the source-owned six-field wording`,
    );
    assert.match(source, /<p\b[^>]*\bdata-case-brief-basis\b[^>]*><strong>Basis and limits:<\/strong>/u, `${route} should state its basis and limits`);

    const detailStart = source.indexOf("data-case-brief-detail");
    const basisStart = source.indexOf("data-case-brief-basis");
    assert.ok(detailStart > basisStart, `${route} should place the track digest after its evidence boundary`);

    const sourceTrackIntro = source.match(/<p\b[^>]*\bdata-case-brief-tracks-intro\b[^>]*>([\s\S]*?)<\/p>/u);
    const projectedTrackIntro = projection.match(/<p class="debrief-case-brief__track-intro">([\s\S]*?)<\/p>/u);
    if (route === "choose-your-player-humatics.html") {
      assert.ok(sourceTrackIntro, `${route} should retain the source-owned Narrative Architecture orientation`);
      assert.ok(projectedTrackIntro, `${route} should project the Narrative Architecture orientation`);
      assert.match(sourceTrackIntro[1], /href="#narrative-architecture-title"/u);
      assert.match(projectedTrackIntro[1], new RegExp(`href="${route}#narrative-architecture-title"`, "u"));
      assert.equal(
        normalizeVisibleText(projectedTrackIntro[1]),
        normalizeVisibleText(sourceTrackIntro[1]),
        `${route} projection should preserve its source-owned track orientation`,
      );
    } else {
      assert.equal(sourceTrackIntro, null, `${route} should add a track introduction only when the compact account needs one`);
      assert.equal(projectedTrackIntro, null, `${route} projection should add a track introduction only when its source owns one`);
    }

    const tracks = caseBriefTracks(source);
    const projectedTracks = caseBriefTracks(projection, "details");
    const expectedTrackKinds = route === "three-way-comparative-return.html"
      ? ["comparative", "return"]
      : ["solution", "implementation"];
    assert.deepEqual(tracks.map(track => track.kind), expectedTrackKinds, `${route} should expose its truthful paired scan`);
    assert.deepEqual(projectedTracks.map(track => track.kind), expectedTrackKinds, `${route} projection should preserve its truthful paired scan`);

    for (const [trackIndex, track] of tracks.entries()) {
      const links = Array.from(track.html.matchAll(/<li\b[^>]*>[\s\S]*?<a\b[^>]*href="#([^"]+)"/gu), match => match[1]);
      const expectedCount = route === "three-way-comparative-return.html"
        ? (track.kind === "comparative" ? 5 : 3)
        : (route === "field-inspection-harness-replatform.html" && track.kind === "implementation" ? 6 : 5);
      assert.equal(links.length, expectedCount, `${route} ${track.kind} scan should represent every owned beat`);
      for (const id of links) {
        assert.match(html, new RegExp(`\\bid="${id}"`, "u"), `${route} should resolve ${track.kind} scan link #${id}`);
      }
      const projectedLinks = Array.from(projectedTracks[trackIndex].html.matchAll(
        /<li\b[^>]*>[\s\S]*?<a\b[^>]*href="([^"]+)"/gu,
      ), match => match[1]);
      assert.deepEqual(
        projectedLinks,
        links.map(id => `${route}#${id}`),
        `${route} ${track.kind} catalog disclosure should qualify every source-local fragment`,
      );
      assert.deepEqual(
        normalizeVisibleText(projectedTracks[trackIndex].html.replace(/Expand|Collapse/gu, "")),
        normalizeVisibleText(track.html),
        `${route} ${track.kind} catalog disclosure should preserve its source-owned quick scan`,
      );
    }

    const media = source.match(/<div\b[^>]*\bdata-case-brief-media\b[^>]*>([\s\S]*?)<\/div>/u);
    assert.ok(media, `${route} should carry one reviewed related-media index`);
    const mediaLinks = Array.from(media[1].matchAll(/<li\b[^>]*>[\s\S]*?<a\b[^>]*href="#([^"]+)"/gu), match => match[1]);
    assert.ok(mediaLinks.length >= 1 && mediaLinks.length <= 3, `${route} should keep its related-media index concise`);
    for (const id of mediaLinks) {
      assert.match(html, new RegExp(`\\bid="${id}"`, "u"), `${route} should resolve media link #${id}`);
    }
    const projectedMediaLinks = projectionMediaLinks(projection);
    assert.deepEqual(
      projectedMediaLinks,
      mediaLinks.map(id => `${route}#${id}`),
      `${route} catalog projection should preserve and qualify the reviewed related-media index`,
    );
    assert.doesNotMatch(source, /Read the (?:Easy-to-Scan Case Brief|Full Debrief)/u);

    assert.equal(
      Array.from(html.matchAll(/\bid="case-brief"/gu)).length,
      1,
      `${route} should retain exactly one published-coordinate compatibility target`,
    );
    assert.match(
      html,
      /<span id="case-brief" aria-hidden="true"><\/span>/u,
      `${route} compatibility target should remain empty and hidden from the accessibility tree`,
    );
    assert.doesNotMatch(html, /\bdata-content-form="case-brief"|\bdata-case-brief-(?:detail|media|track)\b/u, `${route} should begin with its complete narrative rather than repeat the compact account`);
    assert.doesNotMatch(
      html,
      /class="[^"]*\bdebrief-case-brief__media\b|\bdata-case-brief-media\b/u,
      `${route} should leave the legacy compact-account media carrier in the catalog projection`,
    );
    assert.doesNotMatch(
      html,
      new RegExp(`<a\\b[^>]*href="${route}"[^>]*>(?:(?!<\\/a>)[\\s\\S])*?Read the Full Debrief(?:(?!<\\/a>)[\\s\\S])*?<\\/a>`, "u"),
      `${route} should leave its self-referential Full Debrief action in the catalog projection`,
    );
  }
});

test("Who To Believe keeps rounded outcome figures anchored to contemporaneous telemetry notes", async () => {
  const [html, compactSource] = await Promise.all([
    readCanvasFile("who-to-believe-reviews-platform.html"),
    readFile(compactSourcePath, "utf8"),
  ]);
  const caseBrief = caseBriefSources(compactSource)
    .find(source => source.route === "who-to-believe-reviews-platform.html")?.html || "";
  const outcomesStart = html.indexOf('<h3 id="solution-outcomes-title"');
  const outcomesEnd = html.indexOf('<h3 id="solution-repeatability-title"', outcomesStart);

  assert.ok(caseBrief, "Expected the Who To Believe compact account");
  assert.ok(outcomesStart >= 0 && outcomesEnd > outcomesStart, "Expected the Who To Believe outcomes section");

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

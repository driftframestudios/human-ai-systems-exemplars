import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const canvasRoot = resolve(
  import.meta.dirname,
  "../../context-canvas-project-surface/context-canvas",
);

const owners = {
  tokens: "styles/core/tokens.css",
  foundation: "styles/core/foundation.css",
  navigation: "styles/components/site-navigation.css",
  tables: "styles/components/tables.css",
  routeCards: "styles/components/route-card-grid.css",
  legacy: "expanded.css",
  about: "styles/routes/about.css",
  aboutNoscript: "styles/routes/about-noscript.css",
  shell: "canvas-shell.css",
};

async function canvasFile(path) {
  return readFile(resolve(canvasRoot, path), "utf8");
}

function stylesheetOrder(html) {
  return [...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/gu)]
    .map(match => match[1]);
}

function assertOrdered(order, expected, label) {
  let prior = -1;
  for (const owner of expected) {
    const position = order.indexOf(owner);
    assert.ok(position >= 0, `${label}: expected ${owner}`);
    assert.ok(position > prior, `${label}: expected ${owner} after ${expected[expected.indexOf(owner) - 1]}`);
    prior = position;
  }
}

test("About has a complete named first-paint CSS path without the legacy sheet", async () => {
  const html = await canvasFile("index.html");
  const order = stylesheetOrder(html);

  assertOrdered(order, [
    owners.tokens,
    owners.foundation,
    owners.navigation,
    owners.tables,
    owners.routeCards,
    owners.about,
    owners.aboutNoscript,
    owners.shell,
  ], "About stylesheet order");
  assert.equal(order.includes(owners.legacy), false, "About leaves the broad legacy sheet outside first paint");

  const ordinaryOwners = order.filter(owner => owner !== owners.aboutNoscript);
  const ordinaryBytes = (await Promise.all(ordinaryOwners.map(canvasFile)))
    .reduce((total, source) => total + Buffer.byteLength(source), 0);
  assert.ok(
    ordinaryBytes < 122_737,
    `About's complete ordinary path (${ordinaryBytes} bytes) stays below the recorded 122,737-byte baseline`,
  );
});

test("legacy consumers load extracted owners before their remaining route terrain", async () => {
  const htmlFiles = (await readdir(canvasRoot)).filter(path => path.endsWith(".html"));
  let legacyConsumerCount = 0;
  let tableConsumerCount = 0;
  const routeCardConsumers = [];

  for (const path of htmlFiles) {
    const html = await canvasFile(path);
    const order = stylesheetOrder(html);
    const consumesLegacy = order.includes(owners.legacy);
    if (!consumesLegacy) continue;
    legacyConsumerCount += 1;

    assertOrdered(order, [
      owners.tokens,
      owners.foundation,
      owners.navigation,
      owners.legacy,
    ], path);

    const carriesTable = /<table\b|table-scroll|table-shell|about-table-wrap|framework-table-wrap/u.test(html);
    assert.equal(
      order.includes(owners.tables),
      carriesTable,
      `${path}: the table component follows an actual semantic-table or table-wrapper consumer`,
    );
    if (carriesTable) {
      tableConsumerCount += 1;
      assertOrdered(order, [owners.navigation, owners.tables, owners.legacy], path);
    }

    if (/about-route-grid/u.test(html)) routeCardConsumers.push(path);
    assert.equal(
      order.includes(owners.routeCards),
      /about-route-grid/u.test(html),
      `${path}: the route-card component follows an actual route-card consumer`,
    );
  }

  assert.equal(legacyConsumerCount, 43);
  assert.equal(tableConsumerCount, 38);
  assert.deepEqual(routeCardConsumers, ["prompt-side-conditions-practice.html"]);
});

test("each extracted declaration family has one authored owner", async () => {
  const [tokens, foundation, navigation, tables, routeCards, legacy, shell] = await Promise.all([
    owners.tokens,
    owners.foundation,
    owners.navigation,
    owners.tables,
    owners.routeCards,
    owners.legacy,
    owners.shell,
  ].map(canvasFile));

  assert.match(tokens, /:root\s*\{/u);
  assert.match(foundation, /(?:^|\n)body,\s*\nhtml\s*\{/u);
  assert.match(foundation, /@media screen and \(max-width: 770px\)[\s\S]*?\.txt-h1,\s+h1\s*\{\s*font-size: 2\.35em;/u);
  assert.match(navigation, /(?:^|\n)\.nav__top--sticky\s*\{/u);
  assert.match(navigation, /(?:^|\n)main \[id\]\s*\{/u);
  assert.match(tables, /(?:^|\n)table\s*\{/u);
  assert.match(routeCards, /(?:^|\n)\.about-route-grid\s*\{/u);

  assert.doesNotMatch(legacy, /(?:^|\n):root\s*\{/u);
  assert.doesNotMatch(legacy, /(?:^|\n)\.nav__top--sticky\s*\{/u);
  assert.doesNotMatch(legacy, /(?:^|\n)table\s*\{/u);
  assert.doesNotMatch(legacy, /(?:^|\n)\.about-route-grid\s*\{/u);
  assert.doesNotMatch(legacy, /(?:^|\n)main \[id\]\s*\{/u);
  assert.doesNotMatch(shell, /scroll-margin-block-start/u);
  assert.doesNotMatch(navigation, /\.txt-h1/u);

  assert.match(legacy, /\.bg__adjust--deep-blue > p,\s*h1/u);
});

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  artifactAuthor,
  artifactAttribution,
  artifactLicense,
  attributionContract,
} from "../../tools/attribution-contract.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const visitorGlob = attributionContract.public_html.context_canvas_top_level_glob;
assert.match(visitorGlob, /\/\*\.html$/u);
const visitorRoot = resolve(repositoryRoot, visitorGlob.slice(0, -"/*.html".length));
const authorMeta =
  `<meta name="author" content="${artifactAuthor}">`;
const licenseLink =
  `<link rel="license" href="${artifactLicense}">`;

function occurrenceCount(source, value) {
  return source.split(value).length - 1;
}

test("top-level Context Canvas routes expose one consistent authorship and license statement", async () => {
  const routes = (await readdir(visitorRoot, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith(".html"))
    .map(entry => entry.name)
    .sort();

  assert.ok(routes.includes("index.html"));
  assert.ok(routes.includes("404.html"));

  for (const route of routes) {
    const html = await readFile(join(visitorRoot, route), "utf8");
    assert.equal(occurrenceCount(html, artifactAttribution), 1, `${route} should carry one visible attribution`);
    assert.equal(occurrenceCount(html, authorMeta), 1, `${route} should carry one author metadata element`);
    assert.equal(occurrenceCount(html, licenseLink), 1, `${route} should carry one Apache-2.0 license link`);
  }
});

test("the About hero uses the named dark-and-cobalt heading treatment", async () => {
  const html = await readFile(join(visitorRoot, "index.html"), "utf8");
  assert.match(
    html,
    /<h1 id="about-title"><span class="about-title__line">About<\/span> <span class="about-title__line about-title__line--name">Vikrant<\/span> <span class="about-title__line about-title__line--name">Kudesia<\/span><\/h1>/u,
  );
});

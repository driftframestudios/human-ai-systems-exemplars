import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const visitorRoot = join(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas"
);
const attribution =
  "© 2003–2026 Vikrant Varun Kudesia · Driftframe Studios, Limited Liability Company · Licensed under the Apache License, Version 2.0 (Apache-2.0).";
const authorMeta =
  '<meta name="author" content="Driftframe Studios, Limited Liability Company">';
const licenseLink =
  '<link rel="license" href="https://www.apache.org/licenses/LICENSE-2.0">';

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
    assert.equal(occurrenceCount(html, attribution), 1, `${route} should carry one visible attribution`);
    assert.equal(occurrenceCount(html, authorMeta), 1, `${route} should carry one author metadata element`);
    assert.equal(occurrenceCount(html, licenseLink), 1, `${route} should carry one Apache-2.0 license link`);
  }
});

test("the About hero uses the named dark-and-cobalt heading treatment", async () => {
  const html = await readFile(join(visitorRoot, "index.html"), "utf8");
  assert.match(html, /<h1 id="about-title">About <span>Vikrant Kudesia<\/span><\/h1>/u);
  assert.doesNotMatch(html, /identity intentionally (?:held open|unassigned)/iu);
});

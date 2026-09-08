import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);

function withoutComments(source) {
  return source.replace(/<!--[\s\S]*?-->/gu, "");
}

test("ordinary parent links preserve the visitor's browsing-context choice", async () => {
  const routes = (await readdir(canvasRoot, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith(".html"))
    .map(entry => entry.name)
    .filter(route => route !== "conditioning-field.html")
    .sort();
  const forcedNewTabs = [];

  for (const route of routes) {
    const html = withoutComments(await readFile(join(canvasRoot, route), "utf8"));
    for (const match of html.matchAll(/<a\b[^>]*\btarget="_blank"[^>]*>/gu)) {
      const href = match[0].match(/\bhref="([^"]+)"/u)?.[1];
      forcedNewTabs.push(`${route}:${href}`);
      assert.match(match[0], /\brel="noopener noreferrer"/u, `${route}: ${href}`);
    }
  }

  assert.deepEqual(forcedNewTabs, []);
});

test("the About cartography retains its recorded embedded-document exception", async () => {
  const svg = await readFile(
    resolve(
      repositoryRoot,
      "context-canvas-project-surface/img/plot/about_prompt_conditions_cartography.svg",
    ),
    "utf8",
  );
  const links = [...svg.matchAll(/<a\b[^>]*\btarget="_blank"[^>]*>/gu)];

  assert.equal(links.length, 5);
  for (const link of links) {
    assert.match(link[0], /\brel="noopener noreferrer"/u);
    assert.match(link[0], /\baria-label="[^"]+\(opens in a new tab\)"/u);
  }
});

test("Accessible Forms remains truthful catalog content until its reading is ready", async () => {
  const owners = [
    "debriefs.html",
    "exemplar-gallery-list.html",
    "exemplar-ideal-debrief.html",
    "exemplar-maximal-debrief.html",
    "exemplar-maximal-information-radiator.html",
  ];
  let cards = 0;

  for (const owner of owners) {
    const html = await readFile(join(canvasRoot, owner), "utf8");
    const heading = "<h2 class=\"txt-h2\">The Architecture of Accessible Forms</h2>";
    let headingIndex = html.indexOf(heading);
    while (headingIndex !== -1) {
      const cardStart = html.lastIndexOf("<li", headingIndex);
      const pendingIndex = html.indexOf("Dedicated reading in preparation.</span>", headingIndex);
      assert.ok(cardStart >= 0 && pendingIndex >= 0, `${owner} keeps a complete pending card`);
      const card = html.slice(cardStart, pendingIndex + "Dedicated reading in preparation.</span>".length);
      cards += 1;
      assert.doesNotMatch(card, /<a\b/iu, `${owner} keeps the pending card non-linking`);
      headingIndex = html.indexOf(heading, pendingIndex);
    }
  }

  assert.equal(cards, 6, "the primary catalog and retained exemplars agree on six cards");
});

test("the shared parent footer emits standard links", async () => {
  const shell = await readFile(join(canvasRoot, "canvas-shell.js"), "utf8");

  assert.match(
    shell,
    /var professionalProfileRoute = "\{\{PUBLIC_URL_AUTHOR_PROFESSIONAL_PROFILE\}\}";/u,
  );
  assert.match(shell, /professionalProfileLink\.href = professionalProfileRoute;/u);
  assert.match(shell, /View the author's professional profile/u);
  assert.match(shell, /Professional profile available in the public build/u);
  assert.doesNotMatch(shell, /\.target\s*=\s*["']_blank["']/u);
  assert.doesNotMatch(shell, /\.rel\s*=\s*["']noopener noreferrer["']/u);
  assert.doesNotMatch(shell, /opens in a new tab/iu);
});

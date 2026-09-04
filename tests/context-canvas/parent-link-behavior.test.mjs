import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);

const iframeAdjacentLinks = [
  "ai-systems.html:conditioning-field.html",
  "fmi-lims-eln-replatforming.html:prototypes/core-architectures/chimeric-pack-v0.1/strategy-canvas-chimeric-prototype-v0.2.2.html",
  "fmi-lims-eln-replatforming.html:https://www.blueoceanstrategy.com/tools/strategy-canvas/",
  "fmi-lims-eln-replatforming.html:https://www.insead.edu/faculty-research/publications/books/blue-ocean-strategy-expanded-edition-how-create-uncontested",
  "grammar-family.html:prototypes/core-architectures/chimeric-pack-v0.1/strategy-canvas-chimeric-prototype-v0.2.2.html",
  "grammar-family.html:https://www.blueoceanstrategy.com/tools/strategy-canvas/",
  "grammar-family.html:https://www.insead.edu/faculty-research/publications/books/blue-ocean-strategy-expanded-edition-how-create-uncontested",
  "prompt-side-conditions-practice.html:../../collaboration/open-lesson-field/index.html",
];

function withoutComments(source) {
  return source.replace(/<!--[\s\S]*?-->/gu, "");
}

test("ordinary parent links preserve visitor choice while iframe-adjacent handoffs use isolated tabs", async () => {
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

  assert.deepEqual(forcedNewTabs, iframeAdjacentLinks);
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

import '../../tools/node-runtime-admission.mjs';
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
    .sort();
  const forcedNewTabs = [];

  for (const route of routes) {
    const html = withoutComments(await readFile(join(canvasRoot, route), "utf8"));
    for (const match of html.matchAll(/<a\b[^>]*\btarget="_blank"[^>]*>/gu)) {
      const href = match[0].match(/\bhref="([^"]+)"/u)?.[1];
      assert.match(match[0], /\brel="noopener noreferrer"/u, `${route}: ${href}`);
      // The human-selected FMI method companions explicitly preserve the
      // reading in its tab; their icon, cue and destinations have a focused contract.
      const methodCompanion = route === "fmi-lims-eln-replatforming.html"
        && /\bclass="fmi-method-link"/u.test(match[0]);
      if (!methodCompanion) forcedNewTabs.push(`${route}:${href}`);
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

test("the current Debrief catalog links the Forms Debrief", async () => {
  const currentHeading = "<h2 class=\"txt-h2\">The Form Is a Contract</h2>";
  const html = await readFile(join(canvasRoot, "debriefs.html"), "utf8");
  const currentHeadingIndex = html.indexOf(currentHeading);
  assert.ok(currentHeadingIndex >= 0, "debriefs.html names the Forms Debrief");
  const currentCard = html.slice(currentHeadingIndex, currentHeadingIndex + 5000);
  assert.match(currentCard, /href="recoverable-enterprise-forms\.html"/u);
  assert.doesNotMatch(currentCard, /Dedicated reading in preparation\./u);
});

test("the current Debrief routes expose truthful navigation and progressive enhancement", async () => {
  const currentRoutes = [
    "spatial-capture-collaborative-memory.html",
    "multilingual-clinical-vocabulary-practice.html",
    "recoverable-enterprise-forms.html",
  ];
  for (const route of currentRoutes) {
    const html = await readFile(join(canvasRoot, route), "utf8");
    assert.doesNotMatch(
      html,
      /href="debriefs\.html"[^>]*aria-current="page"/u,
      `${route} does not identify the catalog route as the current page`,
    );
  }

  const [catalog, enhancement] = await Promise.all([
    readFile(join(canvasRoot, "debriefs.html"), "utf8"),
    readFile(join(canvasRoot, "debriefs-catalog.js"), "utf8"),
  ]);
  assert.match(catalog, /<a class="skip-link" href="#main-content">/u);
  assert.match(catalog, /<nav aria-label="Primary">/u);
  assert.match(catalog, /<main id="main-content"[^>]*tabindex="-1">/u);
  assert.match(catalog, /data-debrief-preview hidden>/u);
  assert.match(enhancement, /preview\.hidden = false;\s*setSelections/u);
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

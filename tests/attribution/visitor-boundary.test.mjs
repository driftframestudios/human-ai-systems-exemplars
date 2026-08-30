import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import test from "node:test";

import { artifactAttribution, attributionContract } from "../../tools/attribution-contract.mjs";
import visitorBoundaryContract from "../../context-canvas-project-surface/context-canvas/visitor-boundary-contract.js";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const visitorRoot = resolve(
  repositoryRoot,
  attributionContract.public_html.context_canvas_top_level_glob.replace(/\/\*\.html$/u, ""),
);
const sharedShellPath = resolve(visitorRoot, "canvas-shell.js");
const sharedShellCssPath = resolve(visitorRoot, "canvas-shell.css");

function occurrenceCount(source, value) {
  return source.split(value).length - 1;
}

function normalizedMarkerText(source) {
  return source
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<[^>]+>/gu, "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .join("\n");
}

async function htmlFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

async function governedHtmlFiles() {
  const paths = new Set();

  for (const root of attributionContract.public_html.standalone_prototype_roots) {
    for (const path of await htmlFiles(resolve(repositoryRoot, root))) paths.add(path);
  }
  for (const entry of await readdir(visitorRoot, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".html")) paths.add(resolve(visitorRoot, entry.name));
  }

  const [sourceRootName, projectionRootName] = attributionContract.public_html.core_projection_roots;
  const sourceRoot = resolve(repositoryRoot, sourceRootName);
  const projectionRoot = resolve(repositoryRoot, projectionRootName);
  const routeManifest = JSON.parse(await readFile(resolve(
    repositoryRoot,
    attributionContract.public_html.core_route_manifest,
  ), "utf8"));
  const sourceManifest = JSON.parse(await readFile(resolve(
    sourceRoot,
    routeManifest.source_manifest,
  ), "utf8"));
  const projectionManifest = JSON.parse(await readFile(resolve(
    projectionRoot,
    routeManifest.source_manifest,
  ), "utf8"));
  const localManifest = JSON.parse(await readFile(resolve(
    projectionRoot,
    "context-canvas-local-manifest-v0.1.json",
  ), "utf8"));
  const sourceCompatibility = sourceManifest.prototypes.find(({ id }) => id === "strategy-canvas").compatibility_route;
  const projectionCompatibility = projectionManifest.prototypes.find(({ id }) => id === "strategy-canvas").compatibility_route;

  routeManifest.routes.forEach(({ source_file }) => paths.add(resolve(sourceRoot, source_file)));
  paths.add(resolve(sourceRoot, sourceCompatibility));
  paths.add(resolve(sourceRoot, "strategy-canvas-system-v0.2/compatibility-v0.1.1.html"));
  attributionContract.public_html.canonical_templates.forEach(path => paths.add(resolve(repositoryRoot, path)));

  projectionManifest.prototypes.forEach(({ file }) => paths.add(resolve(projectionRoot, file)));
  paths.add(resolve(projectionRoot, localManifest.entryFile));
  paths.add(resolve(projectionRoot, projectionCompatibility));

  const prototypeLibrary = resolve(repositoryRoot, attributionContract.public_html.context_canvas_prototype_root);
  for (const path of await htmlFiles(prototypeLibrary)) {
    if (!path.startsWith(`${projectionRoot}/`)) paths.add(path);
  }
  return [...paths].sort();
}

test("all attribution-governed HTML carries one exact MAPS to BIG-bench boundary before final attribution", async () => {
  const paths = await governedHtmlFiles();
  assert.equal(paths.length, 104, "the current governed visitor population should remain explicit");

  for (const path of paths) {
    const html = await readFile(path, "utf8");
    const label = relative(repositoryRoot, path);
    const footerStart = html.lastIndexOf("<footer", html.indexOf(artifactAttribution));
    const footerEnd = html.indexOf("</footer>", html.indexOf(artifactAttribution));
    const footer = html.slice(footerStart, footerEnd + "</footer>".length);
    const boundaryMatches = [...footer.matchAll(/<div\b[^>]*\bdata-visitor-boundary(?:\s|>)[^>]*>([\s\S]*?)<\/div>/giu)];
    assert.equal(boundaryMatches.length, 1, `${label} visitor boundary wrapper`);

    const markerMatches = [...boundaryMatches[0][1].matchAll(
      /<p\b[^>]*\bdata-visitor-boundary-marker=["']([^"']+)["'][^>]*>([\s\S]*?)<\/p>/giu,
    )];
    assert.deepEqual(
      markerMatches.map(match => match[1]),
      visitorBoundaryContract.markers.map(marker => marker.id),
      `${label} marker order`,
    );

    markerMatches.forEach((match, index) => {
      const expected = visitorBoundaryContract.markers[index].lines.join("\n");
      assert.equal(normalizedMarkerText(match[2]), expected, `${label} ${match[1]} copied text`);
      visitorBoundaryContract.markers[index].lines.forEach(line => {
        assert.equal(occurrenceCount(html, line), 1, `${label} exact ${match[1]} line`);
      });
    });

    const boundaryPosition = footer.indexOf(boundaryMatches[0][0]);
    const attributionPosition = footer.indexOf(artifactAttribution);
    assert.ok(boundaryPosition >= 0 && boundaryPosition < attributionPosition, `${label} boundary before attribution`);

    const lastLocalNavigation = footer.lastIndexOf("</nav>");
    assert.ok(lastLocalNavigation < boundaryPosition, `${label} local navigation before boundary`);

    const afterAttribution = footer
      .slice(attributionPosition + artifactAttribution.length)
      .replace(/<\/p>\s*<\/footer>$/u, "")
      .trim();
    assert.equal(afterAttribution, "", `${label} attribution is the final footer content`);
  }
});

test("enhanced routes load one contract and preserve the authored boundary as the footer closure", async () => {
  const routes = (await readdir(visitorRoot, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith(".html") && entry.name !== "404.html")
    .map(entry => entry.name)
    .sort();
  assert.equal(routes.length, 41);

  for (const route of routes) {
    const html = await readFile(resolve(visitorRoot, route), "utf8");
    const contractPosition = html.indexOf('<script src="visitor-boundary-contract.js" defer></script>');
    const shellPosition = html.indexOf('<script src="canvas-shell.js" defer></script>');
    assert.ok(contractPosition >= 0 && contractPosition < shellPosition, `${route} contract before enhancement`);
    assert.equal(occurrenceCount(html, "visitor-boundary-contract.js"), 1, `${route} contract load`);
  }

  const shell = await readFile(sharedShellPath, "utf8");
  const detachBoundary = shell.indexOf("if (visitorBoundary) visitorBoundary.remove()");
  const appendBoundary = shell.indexOf("if (visitorBoundary) footer.appendChild(visitorBoundary)");
  const appendAttribution = shell.indexOf("if (attribution) footer.appendChild(attribution)");
  assert.ok(detachBoundary >= 0 && detachBoundary < appendBoundary);
  assert.ok(appendBoundary < appendAttribution, "enhancement closes with boundary then attribution");
});

test("governed visitor language is direct except for exact non-rendered Technology Fit import aliases", async () => {
  const paths = await governedHtmlFiles();
  const technologyPath = resolve(
    repositoryRoot,
    "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/technology-fit-sampling-tableau/technology-fit-sampling-tableau-chimeric-prototype-v0.2.html",
  );
  const acceptedLegacyAliases = [
    'illustrative_verbalized_sample:"uncalibrated_verbalized_sample"',
    'illustrative_planning_estimate:"uncalibrated_planning_estimate"',
    'illustrative_seed:"sample_state"',
    'illustrative_walkthrough:"working_example"',
  ];

  for (const path of paths) {
    const html = await readFile(path, "utf8");
    const label = relative(repositoryRoot, path);
    if (path !== technologyPath) {
      assert.doesNotMatch(html, /illustrative/iu, `${label} direct visitor language`);
      continue;
    }

    const aliasBlock = html.match(/const legacyTechnologyVocabulary=Object\.freeze\(\{([\s\S]*?)\}\);/u);
    assert.ok(aliasBlock, `${label} explicit legacy import adapter`);
    acceptedLegacyAliases.forEach(alias => assert.ok(aliasBlock[1].includes(alias), `${label} ${alias}`));
    assert.equal((aliasBlock[1].match(/illustrative/giu) || []).length, 4, `${label} exact alias count`);
    assert.doesNotMatch(html.replace(aliasBlock[0], ""), /illustrative/iu, `${label} aliases never enter visitor copy`);
  }

  const adjacentVisitorFiles = [
    "collaboration/about-heatmap-comparison/index.html",
    "collaboration/career-quality-visual-variants/index.html",
    "context-canvas-project-surface/context-canvas/README.md",
    "context-canvas-project-surface/context-canvas/humans.txt",
    "context-canvas-project-surface/site-readings/exemplars/index-exemplar--cobalt-temporal-field.html",
    "context-canvas-project-surface/img/plot/inspection_staged_capital_map.svg",
    "context-canvas-project-surface/img/plot/site_reading_grammar_small_multiples.svg",
    "context-canvas-project-surface/img/plot/v3b2_gold_note_viewlets.svg",
    "visual-fidelity-contracts/rose-quartz-editorial-field.md",
    "visual-fidelity-contracts/tiffany-ledger-field.md",
  ];
  for (const entry of adjacentVisitorFiles) {
    assert.doesNotMatch(await readFile(resolve(repositoryRoot, entry), "utf8"), /illustrative/iu, entry);
  }
});

test("shared and self-contained styles preserve selectable narrow, print, and forced-color readings", async () => {
  const paths = await governedHtmlFiles();
  const selfContained = paths.filter(path => dirname(path) !== visitorRoot || path.endsWith("/404.html"));
  assert.equal(selfContained.length, 63);

  for (const path of selfContained) {
    const html = await readFile(path, "utf8");
    const label = relative(repositoryRoot, path);
    assert.equal(occurrenceCount(html, "<style data-canary-stack-css>"), 1, `${label} self-contained style`);
    assert.match(html, /\.visitor-boundary\{[^}]*overflow-wrap:anywhere/u, `${label} narrow containment`);
    assert.match(html, /@media print\{\.visitor-boundary\{/u, `${label} print treatment`);
    assert.match(html, /@media \(forced-colors:active\)\{\.visitor-boundary\{/u, `${label} forced-color treatment`);
  }

  const css = await readFile(sharedShellCssPath, "utf8");
  assert.match(css, /\.visitor-boundary\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/u);
  assert.match(css, /@media \(forced-colors:\s*active\)[\s\S]*?\.visitor-boundary/u);
  assert.match(css, /@media print[\s\S]*?\.visitor-boundary/u);
});

test("the embedded Conditioning Field fallback keeps canaries and attribution in full-width rows", async () => {
  const html = await readFile(resolve(visitorRoot, "conditioning-field.html"), "utf8");
  assert.match(html, /footer\s*\{[^}]*flex-wrap:\s*wrap;/u);
  assert.match(
    html,
    /footer\s*>\s*\.site-attribution\s*\{[^}]*flex:\s*1 0 100%;[^}]*text-align:\s*center;/u,
  );
});

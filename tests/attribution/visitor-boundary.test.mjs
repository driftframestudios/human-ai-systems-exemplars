import '../../tools/node-runtime-admission.mjs';
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

  routeManifest.routes.forEach(({ source_file, source_root }) => paths.add(resolve(
    source_root === undefined ? sourceRoot : resolve(repositoryRoot, source_root),
    source_file,
  )));
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
  assert.equal(paths.length, 107, "the current governed visitor population should remain explicit");

  for (const path of paths) {
    const html = await readFile(path, "utf8");
    const label = relative(repositoryRoot, path);
    const footerStart = html.lastIndexOf("<footer", html.indexOf(artifactAttribution));
    const footerEnd = html.indexOf("</footer>", html.indexOf(artifactAttribution));
    const footer = html.slice(footerStart, footerEnd + "</footer>".length);
    const boundaryMatches = [...footer.matchAll(/<div\b[^>]*\bdata-visitor-boundary(?:\s|>)[^>]*>([\s\S]*?)<\/div>/giu)];
    assert.equal(boundaryMatches.length, 1, `${label} visitor boundary wrapper`);

    const contextMatches = [...boundaryMatches[0][1].matchAll(
      /<p\b[^>]*\bdata-visitor-boundary-context(?=\s|>)[^>]*>([\s\S]*?)<\/p>/giu,
    )];
    assert.equal(contextMatches.length, 1, `${label} visitor boundary context`);
    assert.equal(
      normalizedMarkerText(contextMatches[0][1]),
      visitorBoundaryContract.contextText,
      `${label} ordinary-language canary context`,
    );
    assert.equal(
      occurrenceCount(html, visitorBoundaryContract.contextText),
      1,
      `${label} exact canary context count`,
    );

    const markerMatches = [...boundaryMatches[0][1].matchAll(
      /<p\b[^>]*\bdata-visitor-boundary-marker=["']([^"']+)["'][^>]*>([\s\S]*?)<\/p>/giu,
    )];
    assert.deepEqual(
      markerMatches.map(match => match[1]),
      visitorBoundaryContract.markers.map(marker => marker.id),
      `${label} marker order`,
    );
    assert.ok(
      boundaryMatches[0][1].indexOf(contextMatches[0][0]) <
        boundaryMatches[0][1].indexOf(markerMatches[0][0]),
      `${label} context before exact markers`,
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
  assert.match(shell, /visitorBoundaryContract\.contextSelector/u);
  assert.match(shell, /visitorBoundaryContract\.contextText/u);
  const detachBoundary = shell.indexOf("if (visitorBoundary) visitorBoundary.remove()");
  const appendBoundary = shell.indexOf("if (visitorBoundary) footer.appendChild(visitorBoundary)");
  const appendAttribution = shell.indexOf("if (attribution) footer.appendChild(attribution)");
  assert.ok(detachBoundary >= 0 && detachBoundary < appendBoundary);
  assert.ok(appendBoundary < appendAttribution, "enhancement closes with boundary then attribution");
});

test("governed visitor language replaces reviewed vague media phrases and preserves exact import aliases", async () => {
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
  const podaPath = resolve(
    repositoryRoot,
    "context-canvas-project-surface/context-canvas/poda.html",
  );
  const acceptedPodaMarker = "Illustrative example content shown.";
  const reviewedVaguePhrases = [
    /the records are synthetic/iu,
    /the worked-example records are synthetic/iu,
    /working proxy walkthrough/iu,
    /silent walkthrough/iu,
    /open the MP4 directly/iu,
  ];

  for (const path of paths) {
    const html = await readFile(path, "utf8");
    const label = relative(repositoryRoot, path);
    for (const phrase of reviewedVaguePhrases) {
      assert.doesNotMatch(html, phrase, `${label} reviewed media language`);
    }
    if (path === podaPath) {
      assert.equal(occurrenceCount(html, acceptedPodaMarker), 1, `${label} exact reviewed example marker`);
    }
    if (path === technologyPath) {
      const aliasBlock = html.match(/const legacyTechnologyVocabulary=Object\.freeze\(\{([\s\S]*?)\}\);/u);
      assert.ok(aliasBlock, `${label} explicit legacy import adapter`);
      acceptedLegacyAliases.forEach(alias => assert.ok(aliasBlock[1].includes(alias), `${label} ${alias}`));
      assert.equal((aliasBlock[1].match(/illustrative/giu) || []).length, 4, `${label} exact alias count`);
    }
  }

});

test("shared and self-contained styles preserve selectable narrow, print, and forced-color readings", async () => {
  const paths = await governedHtmlFiles();
  const selfContained = paths.filter(path => dirname(path) !== visitorRoot || path.endsWith("/404.html"));
  assert.equal(selfContained.length, 66);

  for (const path of selfContained) {
    const html = await readFile(path, "utf8");
    const label = relative(repositoryRoot, path);
    assert.equal(occurrenceCount(html, "<style data-canary-stack-css>"), 1, `${label} self-contained style`);
    assert.match(html, /\.visitor-boundary\{[^}]*overflow-wrap:anywhere/u, `${label} narrow containment`);
    assert.match(html, /\.visitor-boundary__context\{[^}]*margin:0/u, `${label} context rhythm`);
    assert.match(html, /@media print\{\.visitor-boundary\{/u, `${label} print treatment`);
    assert.match(html, /@media \(forced-colors:active\)\{\.visitor-boundary\{/u, `${label} forced-color treatment`);
  }

  const css = await readFile(sharedShellCssPath, "utf8");
  assert.match(css, /\.visitor-boundary\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/u);
  assert.match(css, /\.visitor-boundary__context\s*\{[\s\S]*?margin:\s*0;/u);
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

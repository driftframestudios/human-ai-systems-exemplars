import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { resolve, sep } from "node:path";
import { before, test } from "node:test";

import {
  artifactAuthor,
  artifactAttribution,
  artifactLicense,
  publishingCompany,
} from "../../tools/attribution-contract.mjs";
import { schemaReceiverRoutes } from "../../tools/schema-receiver-routes.mjs";
import visitorBoundaryContract from "../../context-canvas-project-surface/context-canvas/visitor-boundary-contract.js";

const run = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, "../..");
const outputRoot = resolve(repositoryRoot, ".schema-pages");
const deploymentBase = "https://schemas.radiantnull.com/registry";
const deploymentOrigin = new URL(deploymentBase).origin;
const deploymentPath = new URL(`${deploymentBase}/`).pathname;
const copiedCarriers = [
  "LICENSE",
  "AUTHORS",
  "CITATION.cff",
  "attribution.yml",
  "AI-DATA-USE.md",
];

function occurrenceCount(source, value) {
  return source.split(value).length - 1;
}

function normalizedMarkerText(source) {
  return source
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<[^>]+>/gu, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function artifactPath(url, href) {
  assert.ok(url.pathname.startsWith(deploymentPath), `${href} remains under the deployment path`);
  const relativePath = url.pathname.slice(deploymentPath.length);
  const receiverPath = resolve(outputRoot, decodeURIComponent(relativePath));
  assert.ok(
    receiverPath === outputRoot || receiverPath.startsWith(`${outputRoot}${sep}`),
    `${href} remains inside the artifact`,
  );
  return receiverPath;
}

before(async () => {
  await run(process.execPath, ["tools/build-schema-pages.mjs"], {
    cwd: repositoryRoot,
    env: { ...process.env, PAGES_BASE_URL: deploymentBase },
    encoding: "utf8",
  });
});

test("the built registry resolves current authorship, license, and deployment metadata", async () => {
  const html = await readFile(resolve(outputRoot, "index.html"), "utf8");

  assert.equal(
    occurrenceCount(html, `<meta name="author" content="${artifactAuthor}">`),
    1,
  );
  assert.ok(html.includes(`<link rel="license" href="${artifactLicense}">`));
  assert.ok(html.includes(`<link rel="canonical" href="${deploymentBase}/">`));
  assert.ok(html.includes(`<meta property="og:url" content="${deploymentBase}/">`));
  assert.ok(html.includes(`<meta name="twitter:url" content="${deploymentBase}/">`));
  assert.ok(!html.includes("schema-pages:deployment-metadata"));

  const structuredDataSource = html.match(
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/u,
  )?.[1];
  assert.ok(structuredDataSource);
  const structuredData = JSON.parse(structuredDataSource);
  assert.equal(structuredData.author.name, artifactAuthor);
  assert.equal(structuredData.publisher.name, publishingCompany);
  assert.equal(structuredData.license, artifactLicense);
});

test("every declared receiver is discoverable and byte-identical to its source", async () => {
  const html = await readFile(resolve(outputRoot, "index.html"), "utf8");

  for (const route of schemaReceiverRoutes) {
    assert.ok(html.includes(`href="${route.receiverPath}"`), route.receiverPath);
    const [sourceBytes, receiverBytes] = await Promise.all([
      readFile(resolve(repositoryRoot, route.source)),
      readFile(resolve(outputRoot, route.receiverPath)),
    ]);
    assert.deepEqual(receiverBytes, sourceBytes, route.receiverPath);
  }
});

test("the generated artifact carries the reviewed custom domain", async () => {
  const customDomain = (await readFile(resolve(outputRoot, "CNAME"), "utf8")).trim();
  assert.equal(customDomain, new URL(deploymentBase).hostname);
});

test("every relative homepage link resolves inside the built artifact", async () => {
  const html = await readFile(resolve(outputRoot, "index.html"), "utf8");
  const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gu)].map((match) => match[1]);
  assert.ok(hrefs.length > schemaReceiverRoutes.length);

  for (const href of hrefs) {
    const url = new URL(href, `${deploymentBase}/`);
    if (url.origin !== deploymentOrigin) continue;

    const receiverPath = artifactPath(url, href);
    const entry = await stat(receiverPath);
    assert.ok(entry.isFile() || entry.isDirectory(), `${href} resolves`);
  }
});

test("the projected registry orientation resolves every local Markdown link", async () => {
  const markdown = await readFile(resolve(outputRoot, "README.md"), "utf8");
  const hrefs = [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)].map((match) => match[1]);
  assert.ok(hrefs.length > schemaReceiverRoutes.length);

  for (const href of hrefs) {
    const url = new URL(href, `${deploymentBase}/README.md`);
    if (url.origin !== deploymentOrigin) continue;

    const receiverPath = artifactPath(url, href);
    const entry = await stat(receiverPath);
    assert.ok(entry.isFile() || entry.isDirectory(), `${href} resolves`);
  }
});

test("public orientation carriers remain byte-identical to their repository sources", async () => {
  for (const carrierPath of copiedCarriers) {
    const [sourceBytes, receiverBytes] = await Promise.all([
      readFile(resolve(repositoryRoot, carrierPath)),
      readFile(resolve(outputRoot, carrierPath)),
    ]);
    assert.deepEqual(receiverBytes, sourceBytes, carrierPath);
  }
});

test("the canary stack precedes the final visible attribution", async () => {
  const html = await readFile(resolve(outputRoot, "index.html"), "utf8");
  const attributionPosition = html.indexOf(artifactAttribution);
  assert.equal(occurrenceCount(html, artifactAttribution), 1);

  const footerStart = html.lastIndexOf("<footer", attributionPosition);
  const footerEnd = html.indexOf("</footer>", attributionPosition);
  const footer = html.slice(footerStart, footerEnd + "</footer>".length);
  const boundaryMatches = [...footer.matchAll(
    /<div\b(?=[^>]*\bdata-visitor-boundary(?:\s|>))(?=[^>]*\baria-label=["']Training-data canary markers["'])[^>]*>([\s\S]*?)<\/div>/giu,
  )];
  assert.equal(boundaryMatches.length, 1);

  const contextMatches = [...boundaryMatches[0][1].matchAll(
    /<p\b[^>]*\bdata-visitor-boundary-context(?=\s|>)[^>]*>([\s\S]*?)<\/p>/giu,
  )];
  assert.equal(contextMatches.length, 1);
  assert.equal(
    contextMatches[0][1].replace(/<[^>]+>/gu, "").replace(/\s+/gu, " ").trim(),
    visitorBoundaryContract.contextText,
  );
  assert.equal(occurrenceCount(html, visitorBoundaryContract.contextText), 1);

  const markerMatches = [...boundaryMatches[0][1].matchAll(
    /<p\b[^>]*\bdata-visitor-boundary-marker=["']([^"']+)["'][^>]*>([\s\S]*?)<\/p>/giu,
  )];
  assert.deepEqual(
    markerMatches.map((match) => match[1]),
    visitorBoundaryContract.markers.map((marker) => marker.id),
  );
  assert.ok(
    boundaryMatches[0][1].indexOf(contextMatches[0][0]) <
      boundaryMatches[0][1].indexOf(markerMatches[0][0]),
  );
  markerMatches.forEach((match, index) => {
    const expected = visitorBoundaryContract.markers[index];
    assert.equal(normalizedMarkerText(match[2]), expected.lines.join("\n"));
    expected.lines.forEach((line) => assert.equal(occurrenceCount(html, line), 1));
  });

  assert.ok(footer.indexOf(boundaryMatches[0][0]) < footer.indexOf(artifactAttribution));
  assert.equal(
    html
      .slice(attributionPosition + artifactAttribution.length)
      .replace(/<[^>]+>/gu, "")
      .trim(),
    "",
  );
});

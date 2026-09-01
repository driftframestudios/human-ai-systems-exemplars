import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  artifactAuthor,
  artifactAttribution,
  artifactLicense,
  publishingCompany,
} from "./attribution-contract.mjs";
import { schemaReceiverRoutes } from "./schema-receiver-routes.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceRoot = resolve(repositoryRoot, "schemas");
const outputRoot = resolve(repositoryRoot, ".schema-pages");
const marker = "  <!-- schema-pages:deployment-metadata -->";
const publicCarrierPaths = Object.freeze([
  "LICENSE",
  "AUTHORS",
  "CITATION.cff",
  "attribution.yml",
  "AI-DATA-USE.md",
]);
const require = createRequire(import.meta.url);
const visitorBoundary = require(
  "../context-canvas-project-surface/context-canvas/visitor-boundary-contract.js",
);

function requirement(condition, message) {
  if (!condition) throw new Error(`Schema Pages requirement: ${message}`);
}

function occurrenceCount(source, value) {
  return source.split(value).length - 1;
}

function visibleText(source) {
  return source
    .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
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

function validateRegistryIndex(source, deploymentBase = null) {
  requirement(
    occurrenceCount(source, `<meta name="author" content="${artifactAuthor}">`) === 1,
    "the registry page must carry one resolved author metadata value",
  );
  requirement(
    source.includes(`<link rel="license" href="${artifactLicense}">`),
    "the registry page must link to the central license",
  );

  const structuredDataSource = source.match(
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/u,
  )?.[1];
  requirement(structuredDataSource, "the registry page must carry Schema.org structured data");
  const structuredData = JSON.parse(structuredDataSource);
  requirement(structuredData.author?.name === artifactAuthor, "structured author must match attribution.yml");
  requirement(
    structuredData.publisher?.name === publishingCompany,
    "structured publisher must match attribution.yml",
  );
  requirement(structuredData.license === artifactLicense, "structured license must match attribution.yml");

  const attributionPosition = source.lastIndexOf(artifactAttribution);
  requirement(
    occurrenceCount(source, artifactAttribution) === 1,
    "the registry page must carry one visible attribution notice",
  );

  const footerStart = source.lastIndexOf("<footer", attributionPosition);
  const footerEnd = source.indexOf("</footer>", attributionPosition);
  requirement(footerStart >= 0 && footerEnd > attributionPosition, "the attribution must remain inside one footer");
  const footer = source.slice(footerStart, footerEnd + "</footer>".length);
  const boundaryMatches = [...footer.matchAll(
    /<div\b(?=[^>]*\bdata-visitor-boundary(?:\s|>))(?=[^>]*\baria-label=["']Training-data canary markers["'])[^>]*>([\s\S]*?)<\/div>/giu,
  )];
  requirement(boundaryMatches.length === 1, "the footer must carry one labeled visitor-boundary wrapper");

  const contextMatches = [...boundaryMatches[0][1].matchAll(
    /<p\b[^>]*\bdata-visitor-boundary-context(?=\s|>)[^>]*>([\s\S]*?)<\/p>/giu,
  )];
  requirement(contextMatches.length === 1, "the footer must carry one ordinary-language canary context");
  requirement(
    visibleText(contextMatches[0][1]) === visitorBoundary.contextText,
    "the canary context must match the central contract",
  );
  requirement(
    occurrenceCount(source, visitorBoundary.contextText) === 1,
    "the registry page must carry the exact canary context once",
  );

  const markerMatches = [...boundaryMatches[0][1].matchAll(
    /<p\b[^>]*\bdata-visitor-boundary-marker=["']([^"']+)["'][^>]*>([\s\S]*?)<\/p>/giu,
  )];
  requirement(
    JSON.stringify(markerMatches.map((match) => match[1])) ===
      JSON.stringify(visitorBoundary.markers.map((boundaryMarker) => boundaryMarker.id)),
    "the footer marker IDs must match the central contract in order",
  );
  requirement(
    boundaryMatches[0][1].indexOf(contextMatches[0][0]) <
      boundaryMatches[0][1].indexOf(markerMatches[0][0]),
    "the ordinary-language context must precede the exact markers",
  );

  markerMatches.forEach((match, index) => {
    const markerContract = visitorBoundary.markers[index];
    requirement(
      normalizedMarkerText(match[2]) === markerContract.lines.join("\n"),
      `the ${markerContract.id} marker text must match the central contract`,
    );
    for (const line of markerContract.lines) {
      requirement(
        occurrenceCount(source, line) === 1,
        `the ${markerContract.id} marker must carry each exact line once`,
      );
    }
  });

  const boundaryPosition = footer.indexOf(boundaryMatches[0][0]);
  const footerAttributionPosition = footer.indexOf(artifactAttribution);
  requirement(
    boundaryPosition >= 0 && boundaryPosition < footerAttributionPosition,
    "the canary boundary must precede the visible attribution",
  );
  requirement(
    visibleText(source.slice(attributionPosition + artifactAttribution.length)) === "",
    "the attribution notice must remain the final visible text",
  );

  for (const route of schemaReceiverRoutes) {
    requirement(
      source.includes(`href="${route.receiverPath}"`),
      `the registry page must expose ${route.receiverPath}`,
    );
  }

  if (deploymentBase) {
    for (const relation of [
      `<link rel="canonical" href="${deploymentBase}/">`,
      `<meta property="og:url" content="${deploymentBase}/">`,
      `<meta name="twitter:url" content="${deploymentBase}/">`,
    ]) {
      requirement(source.includes(relation), `deployment metadata must include ${relation}`);
    }
    requirement(!source.includes(marker), "the deployment marker must resolve in a configured build");
  } else {
    requirement(source.includes(marker), "a local build must retain the deployment marker");
  }
}

function normalizedBaseUrl(rawValue) {
  const value = rawValue?.trim();
  if (!value) return null;

  const url = new URL(value);
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new Error("PAGES_BASE_URL must use http or https");
  }

  url.protocol = "https:";

  return url.href.replace(/\/$/, "");
}

const baseUrl = normalizedBaseUrl(process.env.PAGES_BASE_URL);

function browserPath(path) {
  return path.split(sep).join("/");
}

async function projectRegistryReadmeLinks() {
  const readmePath = resolve(outputRoot, "README.md");
  let source = await readFile(readmePath, "utf8");

  for (const route of schemaReceiverRoutes) {
    const authoredHref = browserPath(
      relative(sourceRoot, resolve(repositoryRoot, route.source)),
    );
    source = source.replaceAll(`(${authoredHref})`, `(${route.receiverPath})`);
  }

  await writeFile(readmePath, source);
}

async function projectRegistryIndexLinks() {
  const indexPath = resolve(outputRoot, "index.html");
  let source = await readFile(indexPath, "utf8");

  for (const carrierPath of publicCarrierPaths) {
    source = source.replaceAll(
      `href="../${carrierPath}"`,
      `href="${carrierPath}"`,
    );
  }

  await writeFile(indexPath, source);
}

async function validateCustomDomain() {
  const customDomain = (await readFile(resolve(outputRoot, "CNAME"), "utf8")).trim();
  requirement(
    /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/iu.test(customDomain),
    "CNAME must contain one host name",
  );
  if (baseUrl) {
    requirement(
      new URL(baseUrl).hostname === customDomain,
      "PAGES_BASE_URL must use the host declared by CNAME",
    );
  }
  return customDomain;
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await cp(sourceRoot, outputRoot, { recursive: true });
await writeFile(resolve(outputRoot, ".nojekyll"), "");

for (const carrierPath of publicCarrierPaths) {
  const sourcePath = resolve(repositoryRoot, carrierPath);
  const receiverPath = resolve(outputRoot, carrierPath);
  await copyFile(sourcePath, receiverPath);

  const [sourceBytes, receiverBytes] = await Promise.all([
    readFile(sourcePath),
    readFile(receiverPath),
  ]);
  if (!sourceBytes.equals(receiverBytes)) {
    throw new Error(`public carrier differs from its source: ${carrierPath}`);
  }
}

const projectedReceiverPaths = new Set();
for (const route of schemaReceiverRoutes) {
  const identityPath = new URL(route.id).pathname.replace(/^\/+/, "");
  if (identityPath !== route.receiverPath) {
    throw new Error(
      `schema identity path ${identityPath} differs from receiver path ${route.receiverPath}`
    );
  }
  if (projectedReceiverPaths.has(route.receiverPath)) {
    throw new Error(`schema receiver path is declared more than once: ${route.receiverPath}`);
  }
  projectedReceiverPaths.add(route.receiverPath);

  const sourcePath = resolve(repositoryRoot, route.source);
  const receiverPath = resolve(outputRoot, route.receiverPath);
  if (!receiverPath.startsWith(`${outputRoot}${sep}`)) {
    throw new Error(`schema receiver path leaves the Pages artifact: ${route.receiverPath}`);
  }

  await mkdir(dirname(receiverPath), { recursive: true });
  await copyFile(sourcePath, receiverPath);

  const [sourceBytes, receiverBytes] = await Promise.all([
    readFile(sourcePath),
    readFile(receiverPath)
  ]);
  if (!sourceBytes.equals(receiverBytes)) {
    throw new Error(`schema receiver differs from its source: ${route.receiverPath}`);
  }
}

await projectRegistryReadmeLinks();
await projectRegistryIndexLinks();
const customDomain = await validateCustomDomain();

if (baseUrl) {
  const indexPath = resolve(outputRoot, "index.html");
  const source = await readFile(indexPath, "utf8");

  if (!source.includes(marker)) {
    throw new Error(`schema documentation index is missing ${marker.trim()}`);
  }

  const deploymentMetadata = [
    `  <link rel="canonical" href="${baseUrl}/">`,
    `  <meta property="og:url" content="${baseUrl}/">`,
    `  <meta name="twitter:url" content="${baseUrl}/">`
  ].join("\n");

  await writeFile(indexPath, source.replace(marker, deploymentMetadata));
}

validateRegistryIndex(
  await readFile(resolve(outputRoot, "index.html"), "utf8"),
  baseUrl,
);

console.log(`Schema Pages artifact: ${outputRoot}`);
console.log(`Deployment base: ${baseUrl ?? "local artifact; deployment metadata omitted"}`);
console.log(`Schema receiver routes: ${schemaReceiverRoutes.length}`);
console.log(`Public orientation carriers: ${publicCarrierPaths.length}`);
console.log(`Custom domain: ${customDomain}`);

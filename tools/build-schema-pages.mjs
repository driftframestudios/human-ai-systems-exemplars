import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { schemaReceiverRoutes } from "./schema-receiver-routes.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceRoot = resolve(repositoryRoot, "schemas");
const outputRoot = resolve(repositoryRoot, ".schema-pages");
const marker = "  <!-- schema-pages:deployment-metadata -->";

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

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await cp(sourceRoot, outputRoot, { recursive: true });
await writeFile(resolve(outputRoot, ".nojekyll"), "");

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

console.log(`Schema Pages artifact: ${outputRoot}`);
console.log(`Deployment base: ${baseUrl ?? "local artifact; deployment metadata omitted"}`);
console.log(`Schema receiver routes: ${schemaReceiverRoutes.length}`);

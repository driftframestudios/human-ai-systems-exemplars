import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { schemaReceiverRoutes } from "../../tools/schema-receiver-routes.mjs";
import { schemaCompanionRoutes, schemaPublication } from "../../tools/schema-publication.mjs";
import { resolvePublicationFile } from "../../tools/publication-boundary.mjs";
import { artifactAuthor, artifactAttribution, artifactLicense } from "../../tools/attribution-contract.mjs";

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, "../..");
const output = resolve(directory, "public");
const base = "https://schemas.vik.guru";
const carriers = ["LICENSE", "AUTHORS", "CITATION.cff", "attribution.yml", "AI-DATA-USE.md"];
const mutableSchema = "context-canvas-project-surface/context-canvas/prototypes/prototype-local-manifest.schema.json";
const routes = [...schemaReceiverRoutes, ...schemaCompanionRoutes];
const args = process.argv.slice(2);
const checking = args.length === 1 && args[0] === "--check";
const selecting = args.length === 2 && args[0] === "--source-revision";
assert(args.length === 0 || checking || selecting, "Use prepare-publication.mjs [--check | --source-revision <accepted SHA>]");
const previous = JSON.parse(await readFile(resolve(output, "publication-manifest.json"), "utf8"));
const revision = selecting ? args[1] : previous.sourceRevision;
assert.match(revision ?? "", /^[0-9a-f]{40}$/, "Select the accepted schema source with --source-revision <full SHA>");

const sourceInputs = [
  "cloudflare/schema-delivery/source", "tools/schema-receiver-routes.mjs",
  "tools/schema-publication.mjs", "tools/schema-publication-lock.json",
  "tools/publication-boundary.mjs", "tools/attribution-contract.mjs",
  ...carriers, ...routes.map(({ source }) => source),
];
// The schema-source pin stays stable across commits to the receiving Worker.
// Preparation is O(selected bytes + route count), with sorted inventory checks.
execFileSync("git", ["merge-base", "--is-ancestor", revision, "origin/main"], { cwd: root });
execFileSync("git", ["diff", "--quiet", revision, "--", ...sourceInputs], { cwd: root });
const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard", "--", ...sourceInputs], { cwd: root, encoding: "utf8" });
assert.equal(untracked, "", "Publication inputs belong to the selected source revision");

const catalog = await schemaPublication(root, base, revision);
const files = new Map();
const aliases = {};
const frozen = new Set();
const frozenSources = new Set(catalog.contracts.filter(({ path }) => path !== mutableSchema).map(({ path }) => path));
function assetPath(path) {
  return path.startsWith("schemas/") ? path : `schemas/${path}`;
}
for (const { source, receiverPath } of routes) {
  const destination = assetPath(receiverPath);
  assert(!files.has(destination), `Unique publication asset: ${destination}`);
  files.set(destination, await readFile(await resolvePublicationFile(root, source)));
  aliases[`/${receiverPath}`] = `/${destination}`;
  if (frozenSources.has(receiverPath)) {
    frozen.add(`/${receiverPath}`);
    frozen.add(`/${destination}`);
  }
}
for (const path of carriers) files.set(path, await readFile(await resolvePublicationFile(root, path)));

const escape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
let index = await readFile(await resolvePublicationFile(root, "cloudflare/schema-delivery/source/index.html"), "utf8");
const cards = catalog.contracts.map((contract) => `<article><h2>${escape(contract.path)}</h2><p><a href="/${escape(contract.path)}">Download from schemas.vik.guru</a></p><p>Stable identity: <code>${escape(contract.canonicalId)}</code></p><p class="receipt">SHA-256 <code>${contract.sha256}</code></p></article>`).join("\n");
index = index.replace("<!-- schema-delivery:contracts -->", cards)
  .replace("<!-- schema-delivery:author -->", `<meta name="author" content="${escape(artifactAuthor)}"><link rel="license" href="${artifactLicense}"><link rel="canonical" href="${base}/">`)
  .replace("<!-- schema-delivery:attribution -->", `<footer><p><a href="/LICENSE">License</a> | <a href="/AUTHORS">Authors</a> | <a href="/CITATION.cff">Citation</a> | <a href="/AI-DATA-USE.md">Data-use posture</a></p><p>${escape(artifactAttribution)}</p></footer>`);
files.set("index.html", Buffer.from(index));
files.set("schema-catalog.json", Buffer.from(`${JSON.stringify(catalog, null, 2)}\n`));

// Reuse the public response policy; this handler owns status-aware caching.
const headers = {};
let globalRule = false;
const headerSource = await readFile(await resolvePublicationFile(root, "cloudflare/schema-delivery/source/_headers"), "utf8");
for (const line of headerSource.split("\n")) {
  if (!line.trim() || line.trimStart().startsWith("#")) continue;
  if (!line.startsWith(" ") && !line.startsWith("\t")) {
    globalRule = line.trim() === "/*";
    continue;
  }
  const separator = line.indexOf(":");
  if (!globalRule || separator < 0) continue;
  const name = line.slice(0, separator).trim();
  if (name.toLowerCase() !== "cache-control") headers[name] = line.slice(separator + 1).trim();
}
headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS";
headers["Access-Control-Allow-Headers"] = "If-None-Match, If-Modified-Since";
headers["Access-Control-Expose-Headers"] = "ETag";
const manifest = { schemaVersion: "1", sourceRevision: revision, frozen: [...frozen].sort(), routes: aliases, headers };
files.set("publication-manifest.json", Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));

for (const path of previous.frozen) {
  assert(frozen.has(path), `Retain the published frozen route: ${path}`);
  const priorAsset = previous.routes?.[path] ?? path;
  const nextAsset = aliases[path] ?? path;
  const bytes = await readFile(await resolvePublicationFile(output, priorAsset.slice(1)));
  assert(bytes.equals(files.get(nextAsset.slice(1))), `Preserve the frozen bytes at ${path}`);
}

async function inventory(relative = "") {
  const paths = [];
  for (const entry of await readdir(resolve(output, relative), { withFileTypes: true })) {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    assert(!entry.isSymbolicLink(), `Publication assets are regular files: ${path}`);
    if (entry.isDirectory()) paths.push(...await inventory(path));
    else {
      assert(entry.isFile(), `Publication asset is a file: ${path}`);
      paths.push(path);
    }
  }
  return paths;
}
if (checking) {
  assert.deepEqual((await inventory()).sort(), [...files.keys()].sort(), "Exact selected public inventory");
  for (const [path, bytes] of files) {
    assert(bytes.equals(await readFile(await resolvePublicationFile(output, path))), `Selected publication bytes: ${path}`);
  }
} else {
  const existing = await inventory();
  const removals = existing.filter((path) => !files.has(path) && path !== "schemas/.gitkeep");
  assert.deepEqual(removals, [], "Existing public assets retain their publication owner before removal");
  for (const [path, bytes] of files) {
    await mkdir(dirname(resolve(output, path)), { recursive: true });
    await writeFile(resolve(output, path), bytes);
  }
  await rm(resolve(output, "schemas/.gitkeep"), { force: true });
}
console.log(`Schema Worker publication: ${catalog.contracts.length} contracts, ${frozenSources.size} frozen contracts, ${files.size} selected files; source ${revision}.`);

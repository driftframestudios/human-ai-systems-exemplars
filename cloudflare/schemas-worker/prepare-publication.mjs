import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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
const selecting = args.length === 4 && args[0] === "--source-revision" && args[2] === "--pages-release-tag";
assert(
  args.length === 0 || checking || selecting,
  "Use prepare-publication.mjs [--check | --source-revision <accepted SHA> --pages-release-tag <pages-vX.Y.Z>]",
);
const previous = JSON.parse(await readFile(resolve(output, "publication-manifest.json"), "utf8"));
const revision = selecting ? args[1] : previous.sourceRevision;
const pagesReleaseTag = selecting ? args[3] : previous.peerRelease?.releaseTag;
assert.match(revision ?? "", /^[0-9a-f]{40}$/, "Select the accepted schema source with --source-revision <full SHA>");
assert.match(pagesReleaseTag ?? "", /^pages-v(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/, "Select one exact annotated Pages release tag");

const gitText = (...gitArgs) => execFileSync("git", gitArgs, { cwd: root, encoding: "utf8" }).trim();
const gitBytes = (...gitArgs) => execFileSync("git", gitArgs, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const taggedBytes = (path) => gitBytes("show", `${pagesReleaseTag}:${path}`);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

assert.equal(gitText("cat-file", "-t", `refs/tags/${pagesReleaseTag}`), "tag", "The Pages coordinate is an annotated tag");
const tagObject = gitText("rev-parse", `refs/tags/${pagesReleaseTag}`);
const projectionRevision = gitText("rev-parse", `${pagesReleaseTag}^{commit}`);
execFileSync("git", ["merge-base", "--is-ancestor", projectionRevision, "origin/docs"], { cwd: root });
const tagNote = gitText("for-each-ref", "--format=%(contents)", `refs/tags/${pagesReleaseTag}`);
const sourceLine = `Source-Revision: ${revision}`;
const closureLine = tagNote.split("\n").find((line) => line.startsWith("Closure-SHA256: "));
assert(tagNote.split("\n").includes(sourceLine), `The Pages tag binds ${sourceLine}`);
assert.match(closureLine ?? "", /^Closure-SHA256: [0-9a-f]{64}$/, "The Pages tag binds one closure digest");
const closureSha256 = closureLine.slice("Closure-SHA256: ".length);

// Match the Pages receiver's depth-first, locale-sorted closure calculation.
const taggedPaths = gitText("ls-tree", "-r", "--name-only", pagesReleaseTag).split("\n");
const tree = {};
for (const path of taggedPaths) {
  let branch = tree;
  for (const segment of path.split("/")) branch = branch[segment] ??= {};
}
const orderedTaggedPaths = [];
function visit(branch, prefix = "") {
  for (const name of Object.keys(branch).sort((left, right) => left.localeCompare(right))) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (Object.keys(branch[name]).length === 0) orderedTaggedPaths.push(path);
    else visit(branch[name], path);
  }
}
visit(tree);
const closureHash = createHash("sha256");
for (const path of orderedTaggedPaths) {
  const bytes = taggedBytes(path);
  closureHash.update(path);
  closureHash.update("\0");
  closureHash.update(String(bytes.length));
  closureHash.update("\0");
  closureHash.update(bytes);
  closureHash.update("\0");
}
assert.equal(closureHash.digest("hex"), closureSha256, "The annotated digest matches the complete Pages release closure");
const pagesRelease = JSON.parse(taggedBytes("release.json"));
assert.equal(pagesRelease.releaseTag, pagesReleaseTag, "release.json names the annotated tag");
assert.equal(pagesRelease.sourceRevision, revision, "release.json names the accepted source revision");

const skillCatalogBytes = taggedBytes("skills/catalog.json");
const skillCatalog = JSON.parse(skillCatalogBytes);
assert.equal(skillCatalog.sourceRevision, revision, "The skill catalog names the accepted source revision");
assert.equal(skillCatalog.publicationStanding, "public_ready", "The peer catalog contains public-ready skills");
assert(Array.isArray(skillCatalog.skills) && Array.isArray(skillCatalog.supportingSources), "The peer catalog declares skills and supporting sources");
for (const { name } of skillCatalog.skills) assert.match(name ?? "", /^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Skill names stay conventional slugs");
assert.equal(new Set(skillCatalog.skills.map(({ name }) => name)).size, skillCatalog.skills.length, "Skill names are unique");
const skillSourceRecords = [
  ...skillCatalog.skills.map(({ sourcePath, sourceRoute, sourceSha256 }) => ({ sourcePath, route: sourceRoute, sha256: sourceSha256 })),
  ...skillCatalog.skills.flatMap(({ dependencies }) => dependencies.map(({ sourcePath, path, sha256 }) => ({ sourcePath, route: path, sha256 }))),
  ...skillCatalog.supportingSources.map(({ sourcePath, path, sha256 }) => ({ sourcePath, route: path, sha256 })),
];
const uniqueSkillSources = new Map();
function assertRelativePath(path, label) {
  assert.equal(typeof path, "string", `${label} is a string`);
  assert(path.length > 0 && !path.startsWith("/") && !path.includes("\\"), `${label} stays repository-relative`);
  assert(path.split("/").every((segment) => segment && segment !== "." && segment !== ".."), `${label} has direct path segments`);
}
for (const record of skillSourceRecords) {
  assertRelativePath(record.route, "Skill source route");
  assert(record.route.startsWith("source/"), "Skill source routes stay inside skills/source");
  assertRelativePath(record.sourcePath, "Skill source path");
  assert.match(record.sha256 ?? "", /^[0-9a-f]{64}$/, "Skill source records carry SHA-256 digests");
  const prior = uniqueSkillSources.get(record.route);
  if (prior) assert.deepEqual(prior, record, `Shared skill source metadata agrees: ${record.route}`);
  else uniqueSkillSources.set(record.route, record);
}

const sourceInputs = [
  "cloudflare/schema-delivery/source", "tools/schema-receiver-routes.mjs",
  "tools/schema-publication.mjs", "tools/schema-publication-lock.json",
  "tools/publication-boundary.mjs", "tools/attribution-contract.mjs",
  ".agents/skills/publication-selection.json",
  ...carriers, ...routes.map(({ source }) => source),
  ...[...uniqueSkillSources.values()].map(({ sourcePath }) => sourcePath),
];
// The schema-source pin stays stable across commits to the receiving Worker.
// Preparation is O(selected bytes + route count), with sorted inventory checks.
execFileSync("git", ["merge-base", "--is-ancestor", revision, "origin/main"], { cwd: root });
try {
  execFileSync("git", ["diff", "--quiet", revision, "--", ...sourceInputs], { cwd: root, stdio: "ignore" });
} catch (error) {
  if (error.status !== 1) throw error;
  assert.fail(
    `Current publication inputs differ from accepted source ${revision}. ` +
    "The accepted release remains available; form a later release from newly reviewed source and Pages coordinates.",
  );
}
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
  const bytes = await readFile(await resolvePublicationFile(root, source));
  assert(bytes.equals(taggedBytes(receiverPath)), `${receiverPath} matches the accepted Pages release`);
  files.set(destination, bytes);
  aliases[`/${receiverPath}`] = `/${destination}`;
  if (frozenSources.has(receiverPath)) {
    frozen.add(`/${receiverPath}`);
    frozen.add(`/${destination}`);
  }
}
aliases["/schemas/schema-catalog.json"] = "/schema-catalog.json";
for (const path of carriers) {
  const bytes = await readFile(await resolvePublicationFile(root, path));
  assert(bytes.equals(taggedBytes(path)), `${path} matches the accepted Pages release`);
  files.set(path, bytes);
}

files.set("skills/catalog.json", skillCatalogBytes);
for (const [index, skill] of skillCatalog.skills.entries()) {
  assert.equal(skill.publicationStanding, "public_ready", `${skill.name} remains public-ready`);
  assert.equal(skill.projectionPath, `${skill.name}/projection.json`, `${skill.name} projection path stays conventional`);
  const path = `skills/${skill.projectionPath}`;
  const bytes = taggedBytes(path);
  const projection = JSON.parse(bytes);
  assert.equal(projection.name, skill.name, `${skill.name} projection retains its name`);
  assert.equal(projection.id, `${base}/skills/${skill.projectionPath}`, `${skill.name} projection retains its canonical Worker identity`);
  assert.equal(projection.sourceRef, `../catalog.json#/skills/${index}`, `${skill.name} projection retains its catalog coordinate`);
  assert.equal(projection.semanticAuthorityRef, `../${skill.sourceRoute}`, `${skill.name} projection retains its semantic authority route`);
  files.set(path, bytes);
}
for (const { sourcePath, route, sha256 } of uniqueSkillSources.values()) {
  const path = `skills/${route}`;
  const pagesBytes = taggedBytes(path);
  const sourceBytes = gitBytes("show", `${revision}:${sourcePath}`);
  assert(pagesBytes.equals(sourceBytes), `${sourcePath} matches the accepted source revision and Pages release`);
  assert.equal(digest(pagesBytes), sha256, `${sourcePath} matches its catalog digest`);
  files.set(path, pagesBytes);
}

const escape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
let index = await readFile(await resolvePublicationFile(root, "cloudflare/schema-delivery/source/index.html"), "utf8");
const cards = catalog.contracts.map((contract) => `<article><h2><code>${escape(contract.path)}</code></h2><p><a href="/${escape(contract.path)}">Download from schemas.vik.guru</a></p><p>Stable identity: <code>${escape(contract.canonicalId)}</code></p><p class="receipt">SHA-256 <code>${contract.sha256}</code></p></article>`).join("\n");
const skillDiscovery = `<section aria-labelledby="skill-contracts"><h2 id="skill-contracts">Portable skill contracts</h2><p><a href="/skills/catalog.json">Read the catalog of ${skillCatalog.skills.length} public-ready skills</a>. Each machine projection links its exact semantic source and supporting files.</p></section>`;
index = index.replace("Stable exact-version schemas for Human–AI Systems Exemplars.", "Stable schema and portable skill contracts for Human–AI Systems Exemplars.")
  .replace("<title>Human–AI Systems schemas</title>", "<title>Human–AI Systems schemas and skills</title>")
  .replace("<h1>Stable schema routes</h1>", "<h1>Stable schema and skill routes</h1>")
  .replace("<!-- schema-delivery:contracts -->", `${cards}\n${skillDiscovery}`)
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

const IMMUTABLE = "immutable";
const REVALIDATE = "revalidate";
function contentType(path) {
  if (path.endsWith(".jsonld")) return "application/ld+json; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (path.endsWith(".yml") || path.endsWith(".yaml") || path.endsWith(".cff")) return "application/yaml; charset=utf-8";
  if (path.endsWith(".js") || path.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  return "text/plain; charset=utf-8";
}
const resources = {};
function resource(requestPath, assetPath = requestPath) {
  const normalizedAsset = assetPath === "/" ? "/index.html" : assetPath;
  resources[requestPath] = {
    asset: normalizedAsset,
    contentType: contentType(normalizedAsset),
    cache: frozen.has(requestPath) ? IMMUTABLE : REVALIDATE,
  };
}
resource("/", "/index.html");
for (const path of files.keys()) resource(`/${path}`);
for (const [requestPath, assetPath] of Object.entries(aliases)) resource(requestPath, assetPath);
resource("/publication-manifest.json");
const selectedInventory = [...files.keys(), "publication-manifest.json"].sort((left, right) => left.localeCompare(right));
const manifest = {
  schemaVersion: "2",
  sourceRevision: revision,
  peerRelease: { releaseTag: pagesReleaseTag, tagObject, projectionRevision, closureSha256 },
  frozen: [...frozen].sort(), routes: aliases, resources, headers, inventory: selectedInventory,
};
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
  const priorInventory = new Set(previous.inventory ?? []);
  const removals = existing.filter((path) => !files.has(path) && path !== "schemas/.gitkeep");
  assert(removals.every((path) => priorInventory.has(path)), "Only a previously generated public asset can leave the selected closure");
  for (const path of removals) await rm(resolve(output, path));
  for (const [path, bytes] of files) {
    await mkdir(dirname(resolve(output, path)), { recursive: true });
    await writeFile(resolve(output, path), bytes);
  }
  await rm(resolve(output, "schemas/.gitkeep"), { force: true });
}
console.log(`Schema Worker publication: ${catalog.contracts.length} schema contracts, ${skillCatalog.skills.length} skill projections, ${frozenSources.size} frozen contracts, ${files.size} selected files; source ${revision}; peer ${pagesReleaseTag}.`);

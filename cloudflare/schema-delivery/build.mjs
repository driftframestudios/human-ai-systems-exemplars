import '../../tools/node-runtime-admission.mjs';
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { schemaReceiverRoutes } from "../../tools/schema-receiver-routes.mjs";
import { assertPublicationRevision, schemaCompanionRoutes, schemaPublication } from "../../tools/schema-publication.mjs";
import { assertExactFileInventory, resolvePublicationFile } from "../../tools/publication-boundary.mjs";
import { artifactAuthor, artifactAttribution, artifactLicense } from "../../tools/attribution-contract.mjs";

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, "../..");
const output = resolve(directory, "dist");
const base = "https://schemas.vik.guru";
const escape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const args = process.argv.slice(2);
if (args.length && (args.length !== 1 || args[0] !== "--check")) throw new Error("Use build.mjs [--check]");
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
await assertPublicationRevision(root, revision, [
  "cloudflare/schema-delivery/source", "cloudflare/schema-delivery/build.mjs", "cloudflare/schema-delivery/wrangler.jsonc",
  "tools/schema-publication.mjs", "tools/schema-publication-lock.json", "tools/schema-receiver-routes.mjs",
  "tools/publication-boundary.mjs", "tools/attribution-contract.mjs",
  "LICENSE", "AUTHORS", "CITATION.cff", "attribution.yml", "AI-DATA-USE.md",
  ...[...schemaReceiverRoutes, ...schemaCompanionRoutes].map(({ source }) => source),
]);
const catalog = await schemaPublication(root, base, revision);
const files = new Map();
for (const route of [...schemaReceiverRoutes, ...schemaCompanionRoutes]) {
  files.set(route.receiverPath, await readFile(await resolvePublicationFile(root, route.source)));
}
for (const path of ["LICENSE", "AUTHORS", "CITATION.cff", "attribution.yml", "AI-DATA-USE.md"]) {
  files.set(path, await readFile(await resolvePublicationFile(root, path)));
}
let index = await readFile(await resolvePublicationFile(root, "cloudflare/schema-delivery/source/index.html"), "utf8");
const cards = catalog.contracts.map((contract) => `<article><h2>${escape(contract.path)}</h2><p><a href="/${escape(contract.path)}">Download from schemas.vik.guru</a></p><p>Stable identity: <code>${escape(contract.canonicalId)}</code></p><p class="receipt">SHA-256 <code>${contract.sha256}</code></p></article>`).join("\n");
index = index.replace("<!-- schema-delivery:contracts -->", cards)
  .replace("<!-- schema-delivery:author -->", `<meta name="author" content="${escape(artifactAuthor)}"><link rel="license" href="${artifactLicense}"><link rel="canonical" href="${base}/">`)
  .replace("<!-- schema-delivery:attribution -->", `<footer><p><a href="/LICENSE">License</a> · <a href="/AUTHORS">Authors</a> · <a href="/CITATION.cff">Citation</a> · <a href="/AI-DATA-USE.md">Data-use posture</a></p><p>${escape(artifactAttribution)}</p></footer>`);
files.set("index.html", Buffer.from(index));
files.set("404.html", await readFile(await resolvePublicationFile(root, "cloudflare/schema-delivery/source/404.html")));
files.set("schema-catalog.json", Buffer.from(`${JSON.stringify(catalog, null, 2)}\n`));
let headers = await readFile(await resolvePublicationFile(root, "cloudflare/schema-delivery/source/_headers"), "utf8");
for (const path of ["", ...files.keys()]) {
  if (path === "404.html") continue;
  const versionedSchema = schemaReceiverRoutes.some((route) => route.receiverPath === path)
    && path !== "context-canvas-project-surface/context-canvas/prototypes/prototype-local-manifest.schema.json";
  const policy = versionedSchema ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate";
  headers += `\n/${path}\n  ! Cache-Control\n  Cache-Control: ${policy}\n`;
}
files.set("_headers", Buffer.from(headers));
if (!args.length) {
  await rm(output, { recursive: true, force: true });
  for (const [path, bytes] of files) {
    await mkdir(dirname(resolve(output, path)), { recursive: true });
    await writeFile(resolve(output, path), bytes);
  }
}
await assertExactFileInventory(output, [...files.keys()]);
for (const [path, bytes] of files) {
  if (!bytes.equals(await readFile(resolve(output, path)))) throw new Error(`Schema receiver must match accepted source: ${path}`);
}
console.log(`Schema delivery: ${files.size} selected files; ${catalog.contracts.length} frozen contracts; source ${revision}.`);

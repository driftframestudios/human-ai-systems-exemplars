import './node-runtime-admission.mjs';
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { schemaReceiverRoutes } from "./schema-receiver-routes.mjs";
import { resolvePublicationFile } from "./publication-boundary.mjs";

const run = promisify(execFile);
export async function assertPublicationRevision(root, revision, paths) {
  const git = async (...args) => (await run("git", args, { cwd: root, encoding: "utf8" })).stdout.trim();
  if (!/^[a-f0-9]{40}$/u.test(revision) || await git("rev-parse", "HEAD") !== revision) {
    throw new Error("Publication source must equal its named full commit revision");
  }
  try { await git("diff", "--quiet", revision, "--", ...paths); }
  catch (error) {
    if (error.code === 1) throw new Error("Commit the selected publication inputs before binding release provenance");
    throw error;
  }
  for (const flags of [["--others", "--exclude-standard"], ["--others", "--ignored", "--exclude-standard"]]) {
    if (await git("ls-files", ...flags, "--", ...paths)) {
      throw new Error("Every selected publication input must belong to the named commit");
    }
  }
}

export const schemaCompanionRoutes = Object.freeze([
  { source: "schemas/prototype-exemplars/1.0.0/prototype-exemplars.example.json", receiverPath: "prototype-exemplars/1.0.0/prototype-exemplars.example.json" },
  { source: "schemas/context-canvas/1.0.0/context-canvas.context.jsonld", receiverPath: "context-canvas/1.0.0/context-canvas.context.jsonld" },
  { source: "collaboration/investment-analysis/example.json", receiverPath: "investment-analysis/0.2.0/example.json" },
  { source: "schemas/investment-analysis/0.2.0/README.md", receiverPath: "investment-analysis/0.2.0/README.md" },
  { source: "a3-stacked-cube-atlas-expanded-bundle-v0.2/schema/a3-stacked-cube.context.jsonld", receiverPath: "a3-stacked-cube-atlas-expanded/0.2/a3-stacked-cube.context.jsonld" },
  { source: "a3-stacked-cube-visual-system-bundle-v0.1/schema/a3-stacked-cube-visual-system.context.v0.1.jsonld", receiverPath: "schemas/a3-stacked-cube-visual-system.context.v0.1.jsonld" },
  { source: "visualization-fidelity-atlas-bundle-v0.1/visualization-fidelity-atlas.context.v0.1.jsonld", receiverPath: "visualization/visualization-fidelity-atlas.context.v0.1.jsonld" },
  { source: "schemas/narrative-threadkeeping/0.1/README.md", receiverPath: "narrative-threadkeeping/0.1/README.md" },
  { source: "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/narrative-capsule-composer/narrative-capsule-composition.context.v0.1.jsonld", receiverPath: "na/schema/narrative-capsule-composition.context.v0.1.jsonld" },
  { source: "schemas/narrative-threadkeeping/0.1/examples/narrative-capsule-composition.public.example.v0.1.json", receiverPath: "na/schema/narrative-capsule-composition.example.public.v0.1.json" },
  { source: "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/semantic-sampling-tableau/terminology-exploration/narrative-sampling-tableau.context.v0.1.jsonld", receiverPath: "na/schema/narrative-sampling-tableau.context.v0.1.jsonld" },
  { source: "schemas/narrative-threadkeeping/0.1/examples/narrative-sampling-tableau.public.example.v0.1.json", receiverPath: "na/schema/narrative-sampling-tableau-state.example.public.v0.1.json" },
  { source: "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/technology-fit-sampling-tableau/technology-fit-sampling-tableau.context.v0.1.jsonld", receiverPath: "na/schema/technology-fit-sampling-tableau.context.v0.1.jsonld" },
  { source: "schemas/narrative-threadkeeping/0.1/examples/technology-fit-sampling-tableau.public.example.v0.1.json", receiverPath: "na/schema/technology-fit-sampling-tableau-state.example.public.v0.1.json" },
  { source: "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/threadkeeping-ledger/threadkeeping-ledger-chimeric-prototype-bundle-v0.1/threadkeeping-ledger.context.v0.1.jsonld", receiverPath: "fg/schema/threadkeeping-ledger.context.v0.1.jsonld" },
  { source: "schemas/narrative-threadkeeping/0.1/examples/threadkeeping-ledger.public.example.v0.1.json", receiverPath: "fg/schema/threadkeeping-ledger.example.public.v0.1.json" },
]);

export function assertPublicationReceiverPaths(routes) {
  const reservedReceiverPaths = new Set([
    ".nojekyll",
    "CNAME",
    "AI-DATA-USE.md",
    "AUTHORS",
    "CITATION.cff",
    "LICENSE",
    "README.md",
    "attribution.yml",
    "collaboration/index.html",
    "index.html",
    "release.json",
    "schema-catalog.json",
  ]);
  const receiverPaths = new Set();
  for (const route of routes) {
    const pathSegments = typeof route.receiverPath === "string"
      ? route.receiverPath.split("/")
      : [];
    const collidesWithGeneratedOutput = typeof route.receiverPath === "string" &&
      [...reservedReceiverPaths].some((reservedPath) =>
        route.receiverPath === reservedPath || route.receiverPath.startsWith(`${reservedPath}/`)
      );
    if (
      typeof route.receiverPath !== "string" ||
      route.receiverPath.length === 0 ||
      route.receiverPath.includes("\\") ||
      route.receiverPath.startsWith("/") ||
      pathSegments.some((segment) => segment === "" || segment === "." || segment === "..") ||
      route.receiverPath === "skills" ||
      route.receiverPath.startsWith("skills/") ||
      collidesWithGeneratedOutput ||
      receiverPaths.has(route.receiverPath)
    ) {
      throw new Error(`Publication receiver paths must be unique repository-relative paths: ${route.receiverPath}`);
    }
    receiverPaths.add(route.receiverPath);
  }
}

function selectedRoutes() {
  const routes = [...schemaReceiverRoutes, ...schemaCompanionRoutes];
  assertPublicationReceiverPaths(routes);
  const canonicalIds = new Set();
  for (const route of schemaReceiverRoutes) {
    const identityPath = decodeURIComponent(new URL(route.id).pathname).replace(/^\/+/, "");
    if (identityPath !== route.receiverPath || canonicalIds.has(route.id)) {
      throw new Error(`Schema identity and unique receiver path must agree: ${route.receiverPath}`);
    }
    canonicalIds.add(route.id);
  }
  return routes;
}

export function retrievalUrl(path, baseUrl) {
  return baseUrl ? new URL(path, `${baseUrl.replace(/\/$/u, "")}/`).href : path;
}

export function schemaDigest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function referenceIdentities(value, base, found = new Set()) {
  if (!value || typeof value !== "object") return found;
  const identity = typeof value.$id === "string" ? new URL(value.$id, base).href : base;
  if (typeof value.$ref === "string") {
    const target = new URL(value.$ref, identity);
    target.hash = "";
    found.add(target.href);
  }
  for (const child of Object.values(value)) referenceIdentities(child, identity, found);
  return found;
}

// One source selection feeds both host adapters. Work is linear in selected
// JSON bytes and nodes; the returned catalog owns its metadata values.
export async function schemaPublication(root, baseUrl, sourceRevision) {
  const lock = JSON.parse(await readFile(resolve(root, "tools/schema-publication-lock.json"), "utf8"));
  const expectedLockPaths = schemaReceiverRoutes.map(({ receiverPath }) => receiverPath).sort();
  if (JSON.stringify(Object.keys(lock).sort()) !== JSON.stringify(expectedLockPaths)) {
    throw new Error("Published-byte lock keys must exactly match the selected schema receiver paths");
  }
  selectedRoutes();
  const known = new Set(schemaReceiverRoutes.map(({ id }) => id));
  const contracts = [];
  for (const route of schemaReceiverRoutes) {
    const bytes = await readFile(await resolvePublicationFile(root, route.source));
    const schema = JSON.parse(bytes);
    const sha256 = schemaDigest(bytes);
    if (schema.$id !== route.id || lock[route.receiverPath] !== sha256) {
      throw new Error(`Published identity and frozen bytes must agree: ${route.receiverPath}`);
    }
    const dependencyIdentities = [...referenceIdentities(schema, route.id)]
      .filter((id) => id !== route.id).sort();
    for (const id of dependencyIdentities) {
      if (!known.has(id)) throw new Error(`Select the referenced contract before publication: ${id}`);
    }
    contracts.push({
      canonicalId: route.id,
      retrievalUrl: retrievalUrl(route.receiverPath, baseUrl),
      path: route.receiverPath,
      sourcePath: route.source,
      sha256,
      sizeBytes: bytes.length,
      dependencyIdentities,
    });
  }
  return { schemaVersion: "1", sourceRevision, deliveryBase: baseUrl,
    identityRole: "canonicalId identifies the contract; retrievalUrl downloads this site's copy.", contracts };
}

export async function copySchemaPayload(root, outputRoot) {
  const output = resolve(outputRoot);
  for (const route of selectedRoutes()) {
    const source = await resolvePublicationFile(root, route.source);
    const target = resolve(output, route.receiverPath);
    const remainder = relative(output, target);
    if (
      remainder === ".." ||
      remainder.startsWith(`..${sep}`) ||
      isAbsolute(remainder)
    ) {
      throw new Error(`Publication receiver path must remain inside the output root: ${route.receiverPath}`);
    }
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
  }
}

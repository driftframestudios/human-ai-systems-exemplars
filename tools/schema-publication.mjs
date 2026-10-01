import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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
]);

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
  for (const route of [...schemaReceiverRoutes, ...schemaCompanionRoutes]) {
    const source = await resolvePublicationFile(root, route.source);
    const target = resolve(outputRoot, route.receiverPath);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
  }
}

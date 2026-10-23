import '../../../tools/node-runtime-admission.mjs';
import { createHash } from "node:crypto";
import { lstat, readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

export const IMMUTABLE = "public, max-age=31536000, immutable";
export const REVALIDATE = "public, max-age=0, must-revalidate";

export function cacheHeader(cacheClass) {
  if (cacheClass === "immutable") return IMMUTABLE;
  if (cacheClass === "revalidate") return REVALIDATE;
  throw new Error(`Unknown publication cache class: ${cacheClass}`);
}

export function expectedContentType(path) {
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".jsonld")) return "application/ld+json; charset=utf-8";
  if (path.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (path.endsWith(".js") || path.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".yml") || path.endsWith(".yaml") || path.endsWith(".cff")) {
    return "application/yaml; charset=utf-8";
  }
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path === "AUTHORS" || path === "LICENSE" || path.endsWith("/AUTHORS") || path.endsWith("/LICENSE")) {
    return "text/plain; charset=utf-8";
  }
  throw new Error(`No declared publication media type for ${path}`);
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function skillArtifactPaths(catalog) {
  return [...new Set([
    "skills/catalog.json",
    ...catalog.skills.flatMap((skill) => [
      `skills/${skill.projectionPath}`,
      `skills/${skill.sourceRoute}`,
      ...skill.dependencies.map((dependency) => `skills/${dependency.path}`),
    ]),
    ...catalog.supportingSources.map((source) => `skills/${source.path}`),
  ])].sort((left, right) => left.localeCompare(right));
}

export async function regularFilePaths(root, directory = root) {
  const paths = [];
  for (const entry of (await readdir(directory, { withFileTypes: true }))
    .sort((left, right) => left.name.localeCompare(right.name))) {
    const path = resolve(directory, entry.name);
    const state = await lstat(path);
    if (state.isSymbolicLink()) throw new Error(`Publication artifacts cannot be symbolic links: ${path}`);
    if (state.isDirectory()) paths.push(...await regularFilePaths(root, path));
    else {
      if (!state.isFile()) throw new Error(`Publication artifact must be a regular file: ${path}`);
      paths.push(relative(root, path).split(sep).join("/"));
    }
  }
  return paths;
}

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  expectedContentType,
  regularFilePaths,
  sha256,
  skillArtifactPaths,
} from "./test/publication-contract.mjs";

const directory = dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = resolve(directory, "../..");
const defaultPublicRoot = resolve(directory, "public");
const acceptedLockPath = resolve(directory, "accepted-publication-lock.json");
const acceptedPublicPrefix = "cloudflare/schemas-worker/public/";
const acceptedSelectionPath = ".agents/skills/publication-selection.json";
const carriers = ["LICENSE", "AUTHORS", "CITATION.cff", "attribution.yml", "AI-DATA-USE.md"];

function gitText(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function gitBytes(root, ...args) {
  return execFileSync("git", args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
}

function assertGitAncestor(root, ancestor, descendant, message) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], { cwd: root, stdio: "ignore" });
  } catch (error) {
    throw new Error(message, { cause: error });
  }
}

function acceptedTree(root, revision) {
  const output = gitBytes(root, "ls-tree", "-r", "-z", revision, "--", acceptedPublicPrefix);
  if (output.length === 0) throw new Error(`Accepted publication tree is absent at ${revision}`);
  return output.toString("utf8").split("\0").filter(Boolean).map((entry) => {
    const match = /^(\d{6}) blob ([0-9a-f]{40})\t(.+)$/u.exec(entry);
    assert(match, `Accepted publication entries are regular Git blobs: ${entry}`);
    assert.equal(match[1], "100644", `Accepted publication files use regular non-executable mode: ${match[3]}`);
    assert(match[3].startsWith(acceptedPublicPrefix), `Accepted publication path stays inside its tree: ${match[3]}`);
    return match[3].slice(acceptedPublicPrefix.length);
  }).sort((left, right) => left.localeCompare(right));
}

function assertRelativePath(value, label) {
  assert.equal(typeof value, "string", `${label} is a string`);
  assert(value.length > 0 && !value.startsWith("/") && !value.includes("\\"), `${label} stays repository-relative`);
  assert(value.split("/").every((segment) => segment && segment !== "." && segment !== ".."), `${label} has direct path segments`);
}

function sortedUnique(values, label) {
  const sorted = [...values].sort((left, right) => left.localeCompare(right));
  assert.equal(new Set(values).size, values.length, `${label} contains unique entries`);
  assert.deepEqual(values, sorted, `${label} uses deterministic lexical order`);
  return sorted;
}

function selectedNames(selection, standing) {
  assert(Array.isArray(selection?.skills), "The accepted selection declares a skills array");
  return selection.skills
    .filter((entry) => entry?.publicationStanding === standing)
    .map((entry) => {
      assert.match(entry?.name ?? "", /^[a-z0-9]+(?:-[a-z0-9]+)*$/u, `${standing} skill names use conventional slugs`);
      return entry.name;
    })
    .sort((left, right) => left.localeCompare(right));
}

export function assertAcceptedSkillSelection(selection, skillCatalog, inventory) {
  const ready = selectedNames(selection, "public_ready");
  const possible = selectedNames(selection, "public_possible");
  assert.equal(new Set([...ready, ...possible]).size, ready.length + possible.length, "Accepted skill standings do not overlap");
  assert.deepEqual(
    skillCatalog.skills.map(({ name }) => name).sort((left, right) => left.localeCompare(right)),
    ready,
    "The Worker catalog contains exactly the accepted source revision's public-ready skills",
  );
  for (const name of possible) {
    assert(!inventory.includes(`skills/${name}/projection.json`), `${name} remains outside the accepted Worker inventory`);
    const entry = selection.skills.find((candidate) => candidate.name === name);
    if (entry?.sourcePath) {
      assert(!inventory.includes(`skills/source/${entry.sourcePath}`), `${name} source remains outside the accepted Worker inventory`);
    }
  }
  return { ready, possible };
}

function tagClosureSha256(root, tag) {
  const paths = gitText(root, "ls-tree", "-r", "--name-only", tag).split("\n").filter(Boolean);
  const tree = {};
  for (const path of paths) {
    let branch = tree;
    for (const segment of path.split("/")) branch = branch[segment] ??= {};
  }
  const ordered = [];
  function visit(branch, prefix = "") {
    for (const name of Object.keys(branch).sort((left, right) => left.localeCompare(right))) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (Object.keys(branch[name]).length === 0) ordered.push(path);
      else visit(branch[name], path);
    }
  }
  visit(tree);

  const hash = createHash("sha256");
  for (const path of ordered) {
    const bytes = gitBytes(root, "show", `${tag}:${path}`);
    hash.update(path);
    hash.update("\0");
    hash.update(String(bytes.length));
    hash.update("\0");
    hash.update(bytes);
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function jsonFile(path, label) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`${label} must be readable JSON: ${error.message}`, { cause: error });
  }
}

export async function verifyAcceptedPublication(options = {}) {
  const repositoryRoot = resolve(options.repositoryRoot ?? defaultRepositoryRoot);
  const publicRoot = resolve(options.publicRoot ?? defaultPublicRoot);
  const acceptedLock = await jsonFile(acceptedLockPath, "Accepted publication lock");
  const manifest = await jsonFile(resolve(publicRoot, "publication-manifest.json"), "Publication manifest");
  const schemaCatalog = await jsonFile(resolve(publicRoot, "schema-catalog.json"), "Schema catalog");
  const skillCatalog = await jsonFile(resolve(publicRoot, "skills/catalog.json"), "Skill catalog");

  assert.equal(acceptedLock.schemaVersion, "1", "The accepted publication lock uses schema version 1");
  assert.match(acceptedLock.publicationRevision ?? "", /^[0-9a-f]{40}$/u, "The accepted publication lock names a full Git revision");
  assert.match(acceptedLock.sourceRevision ?? "", /^[0-9a-f]{40}$/u, "The accepted publication lock names a full source revision");
  assert.match(acceptedLock.pagesReleaseTag ?? "", /^pages-v(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u, "The accepted publication lock names an exact Pages tag");
  assert.match(acceptedLock.closureSha256 ?? "", /^[0-9a-f]{64}$/u, "The accepted publication lock names a closure digest");
  assert.equal(gitText(repositoryRoot, "cat-file", "-t", acceptedLock.publicationRevision), "commit", "The accepted publication coordinate is a commit");
  assert.equal(gitText(repositoryRoot, "cat-file", "-t", acceptedLock.sourceRevision), "commit", "The accepted source coordinate is a commit");
  assertGitAncestor(repositoryRoot, acceptedLock.sourceRevision, acceptedLock.publicationRevision, "The accepted source precedes its Worker publication revision");
  assertGitAncestor(repositoryRoot, acceptedLock.publicationRevision, "origin/main", "The accepted Worker publication was reviewed into origin/main");
  assertGitAncestor(repositoryRoot, acceptedLock.publicationRevision, "HEAD", "The candidate receives the accepted Worker publication revision");

  assert.equal(manifest.schemaVersion, "2", "The accepted Worker uses publication manifest v2");
  assert.match(manifest.sourceRevision ?? "", /^[0-9a-f]{40}$/u, "The accepted source revision is a full Git SHA");
  assert.match(manifest.peerRelease?.releaseTag ?? "", /^pages-v(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u, "The accepted peer release is an exact Pages tag");
  assert.match(manifest.peerRelease?.tagObject ?? "", /^[0-9a-f]{40}$/u, "The accepted Pages tag object is a full Git SHA");
  assert.match(manifest.peerRelease?.projectionRevision ?? "", /^[0-9a-f]{40}$/u, "The accepted Pages projection is a full Git SHA");
  assert.match(manifest.peerRelease?.closureSha256 ?? "", /^[0-9a-f]{64}$/u, "The accepted Pages closure has a SHA-256 digest");

  const { sourceRevision } = manifest;
  const { releaseTag, tagObject, projectionRevision, closureSha256 } = manifest.peerRelease;
  assert.equal(sourceRevision, acceptedLock.sourceRevision, "The manifest and accepted lock name one source revision");
  assert.equal(releaseTag, acceptedLock.pagesReleaseTag, "The manifest and accepted lock name one Pages release");
  assert.equal(closureSha256, acceptedLock.closureSha256, "The manifest and accepted lock name one Pages closure");
  assert.equal(gitText(repositoryRoot, "cat-file", "-t", `refs/tags/${releaseTag}`), "tag", "The accepted Pages coordinate is an annotated tag");
  assert.equal(gitText(repositoryRoot, "rev-parse", `refs/tags/${releaseTag}`), tagObject, "The manifest names the accepted tag object");
  assert.equal(gitText(repositoryRoot, "rev-parse", `${releaseTag}^{commit}`), projectionRevision, "The manifest names the accepted Pages projection");
  assertGitAncestor(repositoryRoot, projectionRevision, "origin/docs", "The accepted Pages projection was reviewed into origin/docs");

  const tagNote = gitText(repositoryRoot, "for-each-ref", "--format=%(contents)", `refs/tags/${releaseTag}`).split("\n");
  assert(tagNote.includes(`Source-Revision: ${sourceRevision}`), "The annotated Pages tag names the accepted source revision");
  assert(tagNote.includes(`Closure-SHA256: ${closureSha256}`), "The annotated Pages tag names the accepted closure digest");
  assert.equal(tagClosureSha256(repositoryRoot, releaseTag), closureSha256, "The complete Pages release matches its annotated closure digest");

  const taggedJson = (path, label) => {
    try {
      return JSON.parse(gitBytes(repositoryRoot, "show", `${releaseTag}:${path}`).toString("utf8"));
    } catch (error) {
      throw new Error(`${label} must be readable JSON at ${releaseTag}:${path}: ${error.message}`, { cause: error });
    }
  };
  const release = taggedJson("release.json", "Pages release receipt");
  assert.equal(release.releaseTag, releaseTag, "The Pages release receipt names the accepted tag");
  assert.equal(release.sourceRevision, sourceRevision, "The Pages release receipt names the accepted source revision");
  assert.equal(schemaCatalog.sourceRevision, sourceRevision, "The Worker schema catalog names the accepted source revision");
  assert.equal(skillCatalog.sourceRevision, sourceRevision, "The Worker skill catalog names the accepted source revision");

  const inventory = sortedUnique(manifest.inventory, "Publication inventory");
  const diskInventory = (await regularFilePaths(publicRoot)).sort((left, right) => left.localeCompare(right));
  assert.deepEqual(diskInventory, inventory, "The accepted Worker inventory matches the checked-in regular files exactly");
  const lockedInventory = acceptedTree(repositoryRoot, acceptedLock.publicationRevision);
  assert.deepEqual(diskInventory, lockedInventory, "The checked-in Worker contains the complete accepted publication tree");
  for (const path of lockedInventory) {
    const currentPath = resolve(publicRoot, path);
    const state = await lstat(currentPath);
    assert.equal(state.mode & 0o111, 0, `${path} retains non-executable publication mode`);
    const currentBytes = await readFile(currentPath);
    const acceptedBytes = gitBytes(repositoryRoot, "show", `${acceptedLock.publicationRevision}:${acceptedPublicPrefix}${path}`);
    assert(currentBytes.equals(acceptedBytes), `${path} matches the accepted publication revision`);
  }
  const inventorySet = new Set(inventory);
  assert.equal(typeof manifest.routes, "object", "The publication manifest declares aliases");
  assert.equal(typeof manifest.resources, "object", "The publication manifest declares request resources");
  assert.deepEqual(manifest.resources["/"], {
    asset: "/index.html",
    contentType: "text/html; charset=utf-8",
    cache: "revalidate",
  }, "The accepted Worker root resolves to the catalog");
  for (const path of inventory) {
    assert.deepEqual(manifest.resources[`/${path}`], {
      asset: `/${path}`,
      contentType: expectedContentType(path),
      cache: manifest.frozen.includes(`/${path}`) ? "immutable" : "revalidate",
    }, `${path} retains its direct accepted route`);
  }
  for (const [requestPath, resource] of Object.entries(manifest.resources)) {
    assert(requestPath.startsWith("/") && !requestPath.includes("\\"), `Request route stays root-relative: ${requestPath}`);
    assert(requestPath === "/" || requestPath.split("/").every((segment, index) => index === 0 || (segment && segment !== "." && segment !== "..")), `Request route has direct path segments: ${requestPath}`);
    assert.equal(typeof resource?.asset, "string", `${requestPath} declares an asset`);
    assert(resource.asset.startsWith("/") && !resource.asset.includes("\\") && !resource.asset.split("/").includes(".."), `${requestPath} maps to a contained asset`);
    const assetPath = resource.asset.slice(1);
    assert(inventorySet.has(assetPath), `${requestPath} maps inside the accepted inventory`);
    assert.equal(resource.contentType, expectedContentType(assetPath), `${requestPath} retains its declared media type`);
    assert.equal(resource.cache, manifest.frozen.includes(requestPath) ? "immutable" : "revalidate", `${requestPath} retains its accepted cache class`);
  }
  sortedUnique(manifest.frozen, "Frozen request paths");
  for (const path of manifest.frozen) assert.equal(manifest.resources[path]?.cache, "immutable", `${path} is an immutable accepted resource`);
  for (const [requestPath, assetPath] of Object.entries(manifest.routes)) {
    assert(requestPath.startsWith("/") && assetPath.startsWith("/"), `${requestPath} keeps a root-relative accepted alias`);
    assert.equal(manifest.resources[requestPath]?.asset, assetPath, `${requestPath} keeps its accepted alias`);
  }

  const acceptedSelection = JSON.parse(gitBytes(repositoryRoot, "show", `${sourceRevision}:${acceptedSelectionPath}`).toString("utf8"));
  const selection = assertAcceptedSkillSelection(acceptedSelection, skillCatalog, inventory);
  const skillPaths = skillArtifactPaths(skillCatalog);
  assert.deepEqual(inventory.filter((path) => path.startsWith("skills/")), skillPaths, "The Worker contains the complete accepted skill artifact closure");
  for (const path of skillPaths) {
    const workerBytes = await readFile(resolve(publicRoot, path));
    const pagesBytes = gitBytes(repositoryRoot, "show", `${releaseTag}:${path}`);
    assert(workerBytes.equals(pagesBytes), `${path} matches the accepted Pages release`);
  }

  const sourceRecords = new Map();
  const rememberSource = (record, label) => {
    assertRelativePath(record.sourcePath, `${label} source path`);
    assertRelativePath(record.route, `${label} Worker route`);
    assert.match(record.sha256 ?? "", /^[0-9a-f]{64}$/u, `${label} declares a source digest`);
    const prior = sourceRecords.get(record.route);
    if (prior) assert.deepEqual(prior, record, `${label} shared source metadata agrees`);
    else sourceRecords.set(record.route, record);
  };
  for (const skill of skillCatalog.skills) {
    assert.equal(skill.publicationStanding, "public_ready", `${skill.name} retains accepted public-ready standing`);
    rememberSource({ sourcePath: skill.sourcePath, route: skill.sourceRoute, sha256: skill.sourceSha256 }, skill.name);
    for (const dependency of skill.dependencies) {
      rememberSource({ sourcePath: dependency.sourcePath, route: dependency.path, sha256: dependency.sha256 }, `${skill.name} dependency`);
    }
  }
  for (const source of skillCatalog.supportingSources) {
    rememberSource({ sourcePath: source.sourcePath, route: source.path, sha256: source.sha256 }, "Supporting source");
  }
  for (const { sourcePath, route, sha256: expectedDigest } of sourceRecords.values()) {
    const acceptedBytes = gitBytes(repositoryRoot, "show", `${sourceRevision}:${sourcePath}`);
    const workerBytes = await readFile(resolve(publicRoot, `skills/${route}`));
    assert(workerBytes.equals(acceptedBytes), `${sourcePath} matches the accepted source revision`);
    assert.equal(sha256(workerBytes), expectedDigest, `${sourcePath} matches its accepted catalog digest`);
  }

  for (const [requestPath, assetPath] of Object.entries(manifest.routes)) {
    if (requestPath === "/schemas/schema-catalog.json") continue;
    const workerBytes = await readFile(resolve(publicRoot, assetPath.slice(1)));
    const pagesBytes = gitBytes(repositoryRoot, "show", `${releaseTag}:${requestPath.slice(1)}`);
    assert(workerBytes.equals(pagesBytes), `${requestPath} matches the accepted Pages release`);
  }
  for (const path of carriers) {
    const workerBytes = await readFile(resolve(publicRoot, path));
    assert(workerBytes.equals(gitBytes(repositoryRoot, "show", `${releaseTag}:${path}`)), `${path} matches the accepted Pages release`);
  }

  for (const contract of schemaCatalog.contracts) {
    assertRelativePath(contract.path, "Schema contract path");
    assert.match(contract.sha256 ?? "", /^[0-9a-f]{64}$/u, `${contract.path} declares a SHA-256 digest`);
    const asset = manifest.routes[`/${contract.path}`];
    assert.equal(typeof asset, "string", `${contract.path} retains a Worker route`);
    const bytes = await readFile(resolve(publicRoot, asset.slice(1)));
    assert.equal(sha256(bytes), contract.sha256, `${contract.path} matches the accepted schema digest`);
    assert.equal(JSON.parse(bytes).$id, contract.canonicalId, `${contract.path} retains its canonical schema identity`);
  }

  return Object.freeze({
    publicationRevision: acceptedLock.publicationRevision,
    sourceRevision,
    releaseTag,
    schemas: schemaCatalog.contracts.length,
    publicReadySkills: selection.ready.length,
    publicPossibleSkills: selection.possible.length,
    files: inventory.length,
    routes: Object.keys(manifest.resources).length,
    closureSha256,
  });
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
  try {
    const receipt = await verifyAcceptedPublication();
    console.log(
      `Accepted schema Worker publication: PASS; publication ${receipt.publicationRevision}; ` +
      `source ${receipt.sourceRevision}; peer ${receipt.releaseTag}; ` +
      `${receipt.schemas} schemas; ${receipt.publicReadySkills} public-ready skills; ` +
      `${receipt.publicPossibleSkills} source-held public-possible skills; ${receipt.files} files; ${receipt.routes} routes.`,
    );
  } catch (error) {
    console.error(`Accepted schema Worker publication: FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}

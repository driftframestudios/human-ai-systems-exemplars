import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { lstat, readFile, readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function requirement(condition, message) {
  if (!condition) throw new Error(`Schema Pages receiver requirement: ${message}`);
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    requirement(key?.startsWith("--") && value, "options must use --name value pairs");
    requirement(!(key.slice(2) in options), `${key} may be supplied once`);
    options[key.slice(2)] = value;
  }

  for (const key of [
    "source-revision",
    "source-branch",
    "projection-root",
    "projection-revision",
    "projection-branch",
  ]) {
    requirement(options[key], `--${key} is required`);
  }
  for (const key of ["source-revision", "projection-revision"]) {
    requirement(
      /^[a-f0-9]{40}$/u.test(options[key]),
      `--${key} must be one full lowercase Git SHA`,
    );
  }
  return options;
}

async function resolvedCommit(root, requested) {
  const { stdout } = await execFileAsync(
    "git",
    ["rev-parse", `${requested}^{commit}`],
    { cwd: root, encoding: "utf8" },
  );
  return stdout.trim().toLowerCase();
}

async function isAncestor(root, ancestor, descendant) {
  try {
    await execFileAsync(
      "git",
      ["merge-base", "--is-ancestor", ancestor, descendant],
      { cwd: root, encoding: "utf8" },
    );
    return true;
  } catch (error) {
    if (error?.code === 1) return false;
    throw error;
  }
}

async function workingTreeStatus(root) {
  const { stdout } = await execFileAsync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all", "--ignored=matching"],
    { cwd: root, encoding: "utf8" },
  );
  return stdout.trim();
}

function browserPath(path) {
  return path.split(sep).join("/");
}

async function regularFilesUnder(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (directory === root && entry.name === ".git") continue;
    const filePath = resolve(directory, entry.name);
    const stat = await lstat(filePath);
    requirement(!stat.isSymbolicLink(), `${browserPath(relative(root, filePath))} must not be a symbolic link`);
    if (stat.isDirectory()) {
      files.push(...await regularFilesUnder(root, filePath));
      continue;
    }
    requirement(stat.isFile(), `${browserPath(relative(root, filePath))} must be a regular file`);
    files.push(filePath);
  }
  return files;
}

async function fileMap(root) {
  const map = new Map();
  for (const filePath of await regularFilesUnder(root)) {
    map.set(browserPath(relative(root, filePath)), await readFile(filePath));
  }
  return map;
}

function closureDigest(files) {
  const hash = createHash("sha256");
  for (const [path, bytes] of files) {
    hash.update(path);
    hash.update("\0");
    hash.update(String(bytes.length));
    hash.update("\0");
    hash.update(bytes);
    hash.update("\0");
  }
  return hash.digest("hex");
}

export async function verifySchemaPagesReceiver({
  sourceRoot,
  sourceRevision,
  sourceBranch,
  artifactRoot,
  projectionRoot,
  projectionRevision,
  projectionBranch,
}) {
  requirement(
    await resolvedCommit(sourceRoot, "HEAD") === sourceRevision,
    "the source checkout must equal --source-revision",
  );
  requirement(
    await resolvedCommit(sourceRoot, sourceRevision) === sourceRevision,
    "--source-revision must resolve exactly in the source checkout",
  );
  requirement(
    await isAncestor(sourceRoot, sourceRevision, sourceBranch),
    `--source-revision must belong to ${sourceBranch}`,
  );
  requirement(
    await resolvedCommit(projectionRoot, "HEAD") === projectionRevision,
    "the projection checkout must equal --projection-revision",
  );
  requirement(
    await resolvedCommit(projectionRoot, projectionRevision) === projectionRevision,
    "--projection-revision must resolve exactly in the projection checkout",
  );
  requirement(
    await isAncestor(projectionRoot, projectionRevision, projectionBranch),
    `--projection-revision must belong to ${projectionBranch}`,
  );
  const [artifactFiles, projectionFiles] = await Promise.all([
    fileMap(artifactRoot),
    fileMap(projectionRoot),
  ]);
  requirement(
    await workingTreeStatus(projectionRoot) === "",
    "the projection checkout must remain an unchanged rendering of --projection-revision",
  );
  const artifactPaths = [...artifactFiles.keys()];
  const projectionPaths = [...projectionFiles.keys()];
  requirement(
    JSON.stringify(artifactPaths) === JSON.stringify(projectionPaths),
    "the rebuilt artifact and docs receiver must have identical sorted file membership",
  );

  for (const path of artifactPaths) {
    requirement(
      artifactFiles.get(path).equals(projectionFiles.get(path)),
      `${path} must be byte-identical in the rebuilt artifact and docs receiver`,
    );
  }

  const artifactDigest = closureDigest(artifactFiles);
  const projectionDigest = closureDigest(projectionFiles);
  requirement(
    artifactDigest === projectionDigest,
    "the rebuilt artifact and docs receiver closure digests must agree",
  );

  return { fileCount: artifactPaths.length, closureDigest: artifactDigest };
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  const options = parseArguments(process.argv.slice(2));
  const sourceRevision = options["source-revision"];
  const sourceBranch = options["source-branch"];
  const projectionRevision = options["projection-revision"];
  const projectionBranch = options["projection-branch"];
  const projectionRoot = resolve(repositoryRoot, options["projection-root"]);
  const result = await verifySchemaPagesReceiver({
    sourceRoot: repositoryRoot,
    sourceRevision,
    sourceBranch,
    artifactRoot: resolve(repositoryRoot, ".schema-pages"),
    projectionRoot,
    projectionRevision,
    projectionBranch,
  });

  console.log(`Schema Pages source revision: ${sourceRevision}`);
  console.log(`Schema Pages projection revision: ${projectionRevision}`);
  console.log(`Schema Pages receiver files: ${result.fileCount}`);
  console.log(`Schema Pages receiver closure SHA-256: ${result.closureDigest}`);
}

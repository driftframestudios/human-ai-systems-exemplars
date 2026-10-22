import './node-runtime-admission.mjs';
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const toolPath = fileURLToPath(import.meta.url);
const contractId = "promotion-topology.v1";
const modes = Object.freeze({
  equalTree: "equal-tree",
  retainedRoot: "retained-root",
});
const gitEnvironment = Object.freeze({
  PATH: process.env.PATH,
  LANG: "C",
  LC_ALL: "C",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_TERMINAL_PROMPT: "0",
  GIT_OPTIONAL_LOCKS: "0",
  GIT_NO_REPLACE_OBJECTS: "1",
});

export class PromotionTopologyError extends Error {
  constructor(message, code = "PROMOTION_TOPOLOGY_INVALID") {
    super(message);
    this.name = "PromotionTopologyError";
    this.code = code;
  }
}

function fail(message, code) {
  throw new PromotionTopologyError(message, code);
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    fail(`${label} must be one nonempty, trimmed string.`, "INVALID_ARGUMENT");
  }
  return value;
}

function assertFullObjectId(value, label, objectFormat) {
  const objectId = assertString(value, label);
  const length = objectFormat === "sha256" ? 64 : 40;
  if (!new RegExp(`^[0-9a-f]{${length}}$`, "u").test(objectId)) {
    fail(
      `${label} must be one full lowercase ${objectFormat} commit identifier; branch names, tags, and abbreviated identifiers are outside this check.`,
      "INVALID_OBJECT_ID",
    );
  }
  return objectId;
}

function assertRetainedRoot(value) {
  const retainedRoot = assertString(value, "Retained root");
  if (
    retainedRoot.startsWith("/") ||
    retainedRoot.includes("\\") ||
    retainedRoot.includes("\0") ||
    retainedRoot !== retainedRoot.normalize("NFC") ||
    path.posix.normalize(retainedRoot) !== retainedRoot ||
    retainedRoot.split("/").some((part) =>
      part.length === 0 ||
      part === "." ||
      part === ".." ||
      /[\u0000-\u001f\u007f:*?\[\\]/u.test(part)
    )
  ) {
    fail(
      "Retained root must be one normalized, repository-relative Git path without pathspec syntax.",
      "INVALID_RETAINED_ROOT",
    );
  }
  return retainedRoot;
}

async function git(repository, args, options = {}) {
  try {
    const { stdout = options.encoding === null ? Buffer.alloc(0) : "" } =
      await execFileAsync("git", args, {
        cwd: repository,
        encoding: Object.hasOwn(options, "encoding") ? options.encoding : "utf8",
        maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
        env: gitEnvironment,
      });
    return stdout;
  } catch (error) {
    const detail = Buffer.isBuffer(error.stderr)
      ? error.stderr.toString("utf8").trim()
      : String(error.stderr ?? "").trim();
    const suffix = detail.length > 0 ? ` ${detail}` : "";
    fail(
      `Git could not inspect the requested promotion coordinate.${suffix}`,
      "GIT_INSPECTION_FAILED",
    );
  }
}

async function assertAncestor(repository, ancestor, descendant, label) {
  try {
    await execFileAsync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
      cwd: repository,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      env: gitEnvironment,
    });
  } catch (error) {
    if (error.code === 1) {
      fail(`${label} must remain an ancestor relationship.`, "ANCESTRY_MISMATCH");
    }
    const detail = String(error.stderr ?? "").trim();
    fail(
      `Git could not inspect ${label}.${detail.length > 0 ? ` ${detail}` : ""}`,
      "GIT_INSPECTION_FAILED",
    );
  }
}

async function inspectRepository(repository) {
  const requested = path.resolve(repository ?? process.cwd());
  const root = String(
    await git(requested, ["rev-parse", "--show-toplevel"]),
  ).trim();
  const objectFormat = String(
    await git(root, ["rev-parse", "--show-object-format"]),
  ).trim();
  if (objectFormat !== "sha1" && objectFormat !== "sha256") {
    fail(
      `Git reported unsupported object format ${objectFormat}.`,
      "UNSUPPORTED_OBJECT_FORMAT",
    );
  }
  return { root, objectFormat };
}

async function resolveCommit(repository, objectId, label) {
  const resolved = String(
    await git(repository, [
      "rev-parse",
      "--verify",
      "--end-of-options",
      `${objectId}^{commit}`,
    ]),
  ).trim();
  if (resolved !== objectId) {
    fail(
      `${label} resolved to ${resolved} instead of the supplied immutable coordinate ${objectId}.`,
      "OBJECT_ID_MISMATCH",
    );
  }
  return resolved;
}

async function inspectCommit(repository, objectId) {
  const line = String(
    await git(repository, ["rev-list", "--parents", "--max-count=1", objectId]),
  ).trim();
  const [commit, ...parents] = line.split(/\s+/u);
  if (commit !== objectId) {
    fail(`Git returned an unexpected commit while inspecting ${objectId}.`, "GIT_INSPECTION_FAILED");
  }
  const tree = String(
    await git(repository, ["show", "--no-patch", "--format=%T", objectId]),
  ).trim();
  return { objectId, parents, tree };
}

function assertParents(actual, expected, label) {
  if (
    actual.length !== expected.length ||
    actual.some((parent, index) => parent !== expected[index])
  ) {
    fail(
      `${label} parent topology must be [${expected.join(", ")}]; received [${actual.join(", ")}].`,
      "PARENT_TOPOLOGY_MISMATCH",
    );
  }
}

function assertEqualTree(commit, upstream, label) {
  if (commit.tree !== upstream.tree) {
    fail(
      `${label} tree ${commit.tree} must equal upstream tree ${upstream.tree} in equal-tree mode.`,
      "TREE_MISMATCH",
    );
  }
}

async function inspectTreeAtPath(repository, commit, retainedRoot, label) {
  let objectId;
  try {
    objectId = String(
      await git(repository, [
        "rev-parse",
        "--verify",
        "--end-of-options",
        `${commit.objectId}:${retainedRoot}`,
      ]),
    ).trim();
  } catch (error) {
    if (error instanceof PromotionTopologyError) {
      fail(
        `${label} must carry retained root ${retainedRoot}.`,
        "RETAINED_ROOT_MISSING",
      );
    }
    throw error;
  }
  const type = String(await git(repository, ["cat-file", "-t", objectId])).trim();
  if (type !== "tree") {
    fail(
      `${label} retained root ${retainedRoot} must resolve to a Git tree; received ${type}.`,
      "RETAINED_ROOT_NOT_TREE",
    );
  }
  return objectId;
}

function bufferPathIsInside(candidate, retainedRoot) {
  const root = Buffer.from(retainedRoot, "utf8");
  return (
    candidate.equals(root) ||
    (
      candidate.length > root.length &&
      candidate.subarray(0, root.length).equals(root) &&
      candidate[root.length] === 0x2f
    )
  );
}

async function changedPaths(repository, left, right) {
  const output = await git(
    repository,
    [
      "diff-tree",
      "--no-commit-id",
      "--name-only",
      "--no-renames",
      "-r",
      "-z",
      left.objectId,
      right.objectId,
    ],
    { encoding: null },
  );
  const paths = [];
  let start = 0;
  for (let index = 0; index < output.length; index += 1) {
    if (output[index] !== 0) continue;
    if (index > start) paths.push(output.subarray(start, index));
    start = index + 1;
  }
  if (start < output.length) {
    fail("Git returned a non-NUL-terminated path list.", "GIT_INSPECTION_FAILED");
  }
  return paths;
}

function printablePath(value) {
  const text = value.toString("utf8");
  return JSON.stringify(text.length > 120 ? `${text.slice(0, 117)}...` : text);
}

async function assertRetainedTree(repository, commit, upstream, destination, retainedRoot, label) {
  const [destinationTree, commitTree, differences] = await Promise.all([
    inspectTreeAtPath(repository, destination, retainedRoot, "Destination"),
    inspectTreeAtPath(repository, commit, retainedRoot, label),
    changedPaths(repository, upstream, commit),
  ]);
  if (commitTree !== destinationTree) {
    fail(
      `${label} retained root ${retainedRoot} resolves to ${commitTree}; destination resolves to ${destinationTree}.`,
      "RETAINED_ROOT_MISMATCH",
    );
  }
  const outside = differences.filter(
    (candidate) => !bufferPathIsInside(candidate, retainedRoot),
  );
  if (outside.length > 0) {
    const sample = outside.slice(0, 5).map(printablePath).join(", ");
    const remainder = outside.length > 5 ? ` and ${outside.length - 5} more` : "";
    fail(
      `${label} changes source-owned paths outside retained root ${retainedRoot}: ${sample}${remainder}.`,
      "SOURCE_PATH_MISMATCH",
    );
  }
  return destinationTree;
}

/**
 * Verify one destination-based promotion without reading branch names or
 * mutating repository state. Supplied coordinates remain the sole authority.
 */
export async function verifyPromotionTopology(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    fail("Promotion topology options must be an object.", "INVALID_ARGUMENT");
  }
  const repository = await inspectRepository(options.repository);
  const upstreamSha = assertFullObjectId(
    options.upstreamSha,
    "Upstream coordinate",
    repository.objectFormat,
  );
  const destinationSha = assertFullObjectId(
    options.destinationSha,
    "Destination coordinate",
    repository.objectFormat,
  );
  const candidateSha = assertFullObjectId(
    options.candidateSha,
    "Candidate coordinate",
    repository.objectFormat,
  );
  const resultSha = options.resultSha === undefined
    ? undefined
    : assertFullObjectId(
        options.resultSha,
        "Result coordinate",
        repository.objectFormat,
      );
  const mode = options.retainedRoot === undefined ? modes.equalTree : modes.retainedRoot;
  const retainedRoot = mode === modes.retainedRoot
    ? assertRetainedRoot(options.retainedRoot)
    : undefined;

  await Promise.all([
    resolveCommit(repository.root, upstreamSha, "Upstream coordinate"),
    resolveCommit(repository.root, destinationSha, "Destination coordinate"),
    resolveCommit(repository.root, candidateSha, "Candidate coordinate"),
    ...(resultSha === undefined
      ? []
      : [resolveCommit(repository.root, resultSha, "Result coordinate")]),
  ]);

  const [upstream, destination, candidate, result] = await Promise.all([
    inspectCommit(repository.root, upstreamSha),
    inspectCommit(repository.root, destinationSha),
    inspectCommit(repository.root, candidateSha),
    resultSha === undefined ? undefined : inspectCommit(repository.root, resultSha),
  ]);

  assertParents(candidate.parents, [destinationSha, upstreamSha], "Candidate");
  if (result !== undefined) {
    assertParents(result.parents, [destinationSha, candidateSha], "Result");
  }
  // Exact direct-parent order is the stronger topology claim. These explicit
  // ancestry probes also preserve the named Issue contract in the receipt path.
  await Promise.all([
    assertAncestor(
      repository.root,
      destinationSha,
      candidateSha,
      "Destination-to-candidate ancestry",
    ),
    assertAncestor(
      repository.root,
      upstreamSha,
      candidateSha,
      "Upstream-to-candidate ancestry",
    ),
    ...(result === undefined
      ? []
      : [
          assertAncestor(
            repository.root,
            destinationSha,
            resultSha,
            "Destination-to-result ancestry",
          ),
          assertAncestor(
            repository.root,
            candidateSha,
            resultSha,
            "Candidate-to-result ancestry",
          ),
        ]),
  ]);

  let retainedTree;
  if (mode === modes.equalTree) {
    assertEqualTree(candidate, upstream, "Candidate");
    if (result !== undefined) assertEqualTree(result, upstream, "Result");
  } else {
    retainedTree = await assertRetainedTree(
      repository.root,
      candidate,
      upstream,
      destination,
      retainedRoot,
      "Candidate",
    );
    if (result !== undefined) {
      await assertRetainedTree(
        repository.root,
        result,
        upstream,
        destination,
        retainedRoot,
        "Result",
      );
    }
  }

  return {
    id: contractId,
    status: "PASS",
    mode,
    object_format: repository.objectFormat,
    coordinates: {
      upstream: upstreamSha,
      destination: destinationSha,
      candidate: candidateSha,
      ...(resultSha === undefined ? {} : { result: resultSha }),
    },
    trees: {
      upstream: upstream.tree,
      destination: destination.tree,
      candidate: candidate.tree,
      ...(result === undefined ? {} : { result: result.tree }),
      ...(retainedRoot === undefined
        ? {}
        : { retained_root: retainedRoot, retained_tree: retainedTree }),
    },
  };
}

export function parsePromotionTopologyArguments(argv) {
  const values = new Map();
  let help = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }
    if (![
      "--repository",
      "--upstream",
      "--destination",
      "--candidate",
      "--result",
      "--retained-root",
    ].includes(argument)) {
      fail(`Unknown argument ${argument}.`, "INVALID_ARGUMENT");
    }
    if (values.has(argument)) {
      fail(`Argument ${argument} may appear once.`, "INVALID_ARGUMENT");
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      fail(`Argument ${argument} requires a value.`, "INVALID_ARGUMENT");
    }
    values.set(argument, value);
    index += 1;
  }
  if (help) return { help: true };
  for (const required of ["--upstream", "--destination", "--candidate"]) {
    if (!values.has(required)) {
      fail(`Argument ${required} is required.`, "INVALID_ARGUMENT");
    }
  }
  return {
    repository: values.get("--repository") ?? process.cwd(),
    upstreamSha: values.get("--upstream"),
    destinationSha: values.get("--destination"),
    candidateSha: values.get("--candidate"),
    ...(values.has("--result") ? { resultSha: values.get("--result") } : {}),
    ...(values.has("--retained-root")
      ? { retainedRoot: values.get("--retained-root") }
      : {}),
  };
}

function usage() {
  return `Usage:
  node tools/check-promotion-topology.mjs \\
    --upstream <full-sha> \\
    --destination <full-sha> \\
    --candidate <full-sha> \\
    [--result <full-sha>] \\
    [--retained-root <repository-relative-path>] \\
    [--repository <path>]

The default contract requires candidate and result trees to equal upstream.
Supplying --retained-root preserves that exact destination subtree while every
source-owned path outside it remains equal to upstream.`;
}

async function main(argv) {
  const options = parsePromotionTopologyArguments(argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const receipt = await verifyPromotionTopology(options);
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === toolPath) {
  main(process.argv.slice(2)).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Promotion topology: FAIL — ${message}\n`);
    process.exitCode = 1;
  });
}

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  PromotionTopologyError,
  verifyPromotionTopology,
} from "../../tools/check-promotion-topology.mjs";

const execFileAsync = promisify(execFile);
const testRoot = path.dirname(fileURLToPath(import.meta.url));
const toolPath = path.resolve(testRoot, "../../tools/check-promotion-topology.mjs");
const retainedRoot = "deployment/cpanel/carrier";

async function git(repository, args, options = {}) {
  const { stdout = "" } = await execFileAsync("git", args, {
    cwd: repository,
    encoding: "utf8",
    env: {
      ...process.env,
      LANG: "C",
      LC_ALL: "C",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_TERMINAL_PROMPT: "0",
      GIT_OPTIONAL_LOCKS: "0",
      GIT_NO_REPLACE_OBJECTS: "1",
    },
    ...options,
  });
  return stdout.trim();
}

async function initializeRepository(prefix) {
  const repository = await mkdtemp(path.join(os.tmpdir(), prefix));
  await git(repository, ["init", "--quiet"]);
  await git(repository, ["config", "user.name", "Promotion Topology Test"]);
  await git(repository, ["config", "user.email", "promotion-topology@example.test"]);
  return repository;
}

async function commitWorktree(repository, message) {
  await git(repository, ["add", "-A"]);
  await git(repository, ["commit", "--quiet", "-m", message]);
  return await git(repository, ["rev-parse", "HEAD"]);
}

async function commitTree(repository, tree, parents, message) {
  return await git(repository, [
    "commit-tree",
    tree,
    ...parents.flatMap((parent) => ["-p", parent]),
    "-m",
    message,
  ]);
}

async function repositoryState(repository) {
  return {
    head: await git(repository, ["rev-parse", "HEAD"]),
    symbolicHead: await git(repository, ["symbolic-ref", "--quiet", "HEAD"]),
    indexEntries: await git(repository, ["ls-files", "--stage"]),
    status: await git(repository, ["status", "--porcelain=v2", "--untracked-files=all"]),
    refs: await git(repository, [
      "for-each-ref",
      "--format=%(refname) %(objectname)",
      "refs/heads",
      "refs/tags",
    ]),
  };
}

async function expectFailure(promise, code, pattern) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof PromotionTopologyError);
    assert.equal(error.code, code);
    assert.match(error.message, pattern);
    return true;
  });
}

async function createEqualTreeFixture() {
  const repository = await initializeRepository("promotion-equal-tree-");
  await writeFile(path.join(repository, "accepted.txt"), "destination\n", "utf8");
  const destination = await commitWorktree(repository, "Accept destination");
  await writeFile(path.join(repository, "accepted.txt"), "upstream\n", "utf8");
  await writeFile(path.join(repository, "source.txt"), "source-owned\n", "utf8");
  const upstream = await commitWorktree(repository, "Accept upstream");
  const upstreamTree = await git(repository, ["rev-parse", `${upstream}^{tree}`]);
  const destinationTree = await git(repository, ["rev-parse", `${destination}^{tree}`]);
  const candidate = await commitTree(
    repository,
    upstreamTree,
    [destination, upstream],
    "Form destination-based candidate",
  );
  const result = await commitTree(
    repository,
    upstreamTree,
    [destination, candidate],
    "Accept destination-based candidate",
  );
  return {
    repository,
    destination,
    destinationTree,
    upstream,
    upstreamTree,
    candidate,
    result,
  };
}

async function withEqualTreeFixture(callback) {
  const fixture = await createEqualTreeFixture();
  try {
    return await callback(fixture);
  } finally {
    await rm(fixture.repository, { recursive: true, force: true });
  }
}

async function createRetainedRootFixture() {
  const repository = await initializeRepository("promotion-retained-root-");
  const carrierPath = path.join(repository, retainedRoot);
  await mkdir(carrierPath, { recursive: true });
  await writeFile(path.join(repository, "source.txt"), "destination source\n", "utf8");
  await writeFile(path.join(carrierPath, "index.html"), "accepted carrier\n", "utf8");
  const destination = await commitWorktree(repository, "Accept destination carrier");

  await writeFile(path.join(repository, "source.txt"), "upstream source\n", "utf8");
  await writeFile(path.join(repository, "new-source.txt"), "upstream addition\n", "utf8");
  await writeFile(path.join(carrierPath, "index.html"), "stale upstream carrier\n", "utf8");
  const upstream = await commitWorktree(repository, "Accept upstream source");
  const upstreamTree = await git(repository, ["rev-parse", `${upstream}^{tree}`]);

  await git(repository, ["checkout", "--quiet", destination, "--", retainedRoot]);
  const candidateTree = await git(repository, ["write-tree"]);
  const candidate = await commitTree(
    repository,
    candidateTree,
    [destination, upstream],
    "Form retained-carrier candidate",
  );
  const result = await commitTree(
    repository,
    candidateTree,
    [destination, candidate],
    "Accept retained-carrier candidate",
  );

  return {
    repository,
    destination,
    upstream,
    upstreamTree,
    candidate,
    candidateTree,
    result,
  };
}

async function withRetainedRootFixture(callback) {
  const fixture = await createRetainedRootFixture();
  try {
    return await callback(fixture);
  } finally {
    await rm(fixture.repository, { recursive: true, force: true });
  }
}

test("equal-tree promotion verifies exact candidate and result parent order", async () => {
  await withEqualTreeFixture(async (fixture) => {
    const receipt = await verifyPromotionTopology({
      repository: fixture.repository,
      upstreamSha: fixture.upstream,
      destinationSha: fixture.destination,
      candidateSha: fixture.candidate,
      resultSha: fixture.result,
    });
    assert.deepEqual(receipt.coordinates, {
      upstream: fixture.upstream,
      destination: fixture.destination,
      candidate: fixture.candidate,
      result: fixture.result,
    });
    assert.equal(receipt.id, "promotion-topology.v1");
    assert.equal(receipt.status, "PASS");
    assert.equal(receipt.mode, "equal-tree");
    assert.equal(receipt.trees.upstream, fixture.upstreamTree);
    assert.equal(receipt.trees.candidate, fixture.upstreamTree);
    assert.equal(receipt.trees.result, fixture.upstreamTree);
  });
});

test("the command emits one compact machine-readable PASS receipt", async () => {
  await withEqualTreeFixture(async (fixture) => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      toolPath,
      "--repository",
      fixture.repository,
      "--upstream",
      fixture.upstream,
      "--destination",
      fixture.destination,
      "--candidate",
      fixture.candidate,
      "--result",
      fixture.result,
    ], { encoding: "utf8" });
    assert.equal(stderr, "");
    assert.equal(stdout.trim().split("\n").length, 1);
    const receipt = JSON.parse(stdout);
    assert.equal(receipt.status, "PASS");
    assert.equal(receipt.mode, "equal-tree");
  });
});

test("verification leaves refs, HEAD, index, and worktree state unchanged", async () => {
  await withEqualTreeFixture(async (fixture) => {
    await writeFile(path.join(fixture.repository, "untracked-observation.txt"), "preserve me\n", "utf8");
    const before = await repositoryState(fixture.repository);
    await verifyPromotionTopology({
      repository: fixture.repository,
      upstreamSha: fixture.upstream,
      destinationSha: fixture.destination,
      candidateSha: fixture.candidate,
      resultSha: fixture.result,
    });
    assert.deepEqual(await repositoryState(fixture.repository), before);
  });
});

test("full coordinates preserve authority when similarly named refs move", async () => {
  await withEqualTreeFixture(async (fixture) => {
    await git(fixture.repository, ["branch", "moving-destination", fixture.destination]);
    const captured = await git(fixture.repository, ["rev-parse", "moving-destination"]);
    await git(fixture.repository, ["branch", "--force", "moving-destination", fixture.upstream]);
    assert.equal(captured, fixture.destination);
    assert.equal(
      await git(fixture.repository, ["rev-parse", "moving-destination"]),
      fixture.upstream,
    );

    const receipt = await verifyPromotionTopology({
      repository: fixture.repository,
      upstreamSha: fixture.upstream,
      destinationSha: captured,
      candidateSha: fixture.candidate,
    });
    assert.equal(receipt.status, "PASS");
    await expectFailure(
      verifyPromotionTopology({
        repository: fixture.repository,
        upstreamSha: fixture.upstream,
        destinationSha: "moving-destination",
        candidateSha: fixture.candidate,
      }),
      "INVALID_OBJECT_ID",
      /branch names, tags, and abbreviated identifiers are outside this check/u,
    );
  });
});

test("candidate topology rejects wrong first parent, wrong second parent, and destination movement", async (t) => {
  await withEqualTreeFixture(async (fixture) => {
    const alternate = await commitTree(
      fixture.repository,
      fixture.upstreamTree,
      [fixture.destination],
      "Alternate coordinate",
    );
    const wrongFirst = await commitTree(
      fixture.repository,
      fixture.upstreamTree,
      [alternate, fixture.upstream],
      "Wrong first parent",
    );
    const wrongSecond = await commitTree(
      fixture.repository,
      fixture.upstreamTree,
      [fixture.destination, alternate],
      "Wrong second parent",
    );
    const movedDestination = await commitTree(
      fixture.repository,
      fixture.destinationTree,
      [fixture.destination],
      "Destination moved after candidate formation",
    );
    const extraParent = await commitTree(
      fixture.repository,
      fixture.upstreamTree,
      [fixture.destination, fixture.upstream, alternate],
      "Candidate with an extra parent",
    );

    for (const [name, options] of [
      ["wrong first parent", {
        destinationSha: fixture.destination,
        candidateSha: wrongFirst,
      }],
      ["wrong second parent", {
        destinationSha: fixture.destination,
        candidateSha: wrongSecond,
      }],
      ["destination movement", {
        destinationSha: movedDestination,
        candidateSha: fixture.candidate,
      }],
      ["extra parent", {
        destinationSha: fixture.destination,
        candidateSha: extraParent,
      }],
    ]) {
      await t.test(name, async () => {
        await expectFailure(
          verifyPromotionTopology({
            repository: fixture.repository,
            upstreamSha: fixture.upstream,
            ...options,
          }),
          "PARENT_TOPOLOGY_MISMATCH",
          /Candidate parent topology must be/u,
        );
      });
    }
  });
});

test("equal-tree promotion rejects an unexpected authored delta", async () => {
  await withEqualTreeFixture(async (fixture) => {
    await writeFile(path.join(fixture.repository, "unexpected.txt"), "unexpected delta\n", "utf8");
    await git(fixture.repository, ["add", "unexpected.txt"]);
    const changedTree = await git(fixture.repository, ["write-tree"]);
    const changedCandidate = await commitTree(
      fixture.repository,
      changedTree,
      [fixture.destination, fixture.upstream],
      "Candidate with unexpected delta",
    );
    await expectFailure(
      verifyPromotionTopology({
        repository: fixture.repository,
        upstreamSha: fixture.upstream,
        destinationSha: fixture.destination,
        candidateSha: changedCandidate,
      }),
      "TREE_MISMATCH",
      /must equal upstream tree/u,
    );
  });
});

test("a conflict-resolution delta remains visible and fails the equal-tree contract", async () => {
  const repository = await initializeRepository("promotion-conflict-");
  try {
    await writeFile(path.join(repository, "shared.txt"), "base\n", "utf8");
    await commitWorktree(repository, "Shared base");
    const destinationBranch = await git(repository, ["symbolic-ref", "--short", "HEAD"]);
    await git(repository, ["branch", "upstream"]);

    await writeFile(path.join(repository, "shared.txt"), "destination\n", "utf8");
    const destination = await commitWorktree(repository, "Destination change");

    await git(repository, ["checkout", "--quiet", "upstream"]);
    await writeFile(path.join(repository, "shared.txt"), "upstream\n", "utf8");
    const upstream = await commitWorktree(repository, "Upstream change");
    await git(repository, ["checkout", "--quiet", destinationBranch]);

    await assert.rejects(
      execFileAsync("git", ["merge", "--no-ff", "--no-commit", upstream], {
        cwd: repository,
        encoding: "utf8",
        env: { ...process.env, LANG: "C", LC_ALL: "C" },
      }),
      (error) => error.code === 1,
    );
    assert.equal(
      await git(repository, ["diff", "--name-only", "--diff-filter=U"]),
      "shared.txt",
    );
    await writeFile(path.join(repository, "shared.txt"), "resolved combination\n", "utf8");
    await git(repository, ["add", "shared.txt"]);
    await git(repository, ["commit", "--quiet", "-m", "Resolve promotion conflict"]);
    const candidate = await git(repository, ["rev-parse", "HEAD"]);

    await expectFailure(
      verifyPromotionTopology({ repository, upstreamSha: upstream, destinationSha: destination, candidateSha: candidate }),
      "TREE_MISMATCH",
      /must equal upstream tree/u,
    );
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});

test("accepted result rejects any parent order other than destination then candidate", async () => {
  await withEqualTreeFixture(async (fixture) => {
    const wrongResult = await commitTree(
      fixture.repository,
      fixture.upstreamTree,
      [fixture.candidate, fixture.destination],
      "Result with reversed parents",
    );
    await expectFailure(
      verifyPromotionTopology({
        repository: fixture.repository,
        upstreamSha: fixture.upstream,
        destinationSha: fixture.destination,
        candidateSha: fixture.candidate,
        resultSha: wrongResult,
      }),
      "PARENT_TOPOLOGY_MISMATCH",
      /Result parent topology must be/u,
    );
  });
});

test("equal-tree promotion rechecks accepted result content", async () => {
  await withEqualTreeFixture(async (fixture) => {
    await writeFile(
      path.join(fixture.repository, "result-only-drift.txt"),
      "unexpected result delta\n",
      "utf8",
    );
    await git(fixture.repository, ["add", "result-only-drift.txt"]);
    const changedTree = await git(fixture.repository, ["write-tree"]);
    const changedResult = await commitTree(
      fixture.repository,
      changedTree,
      [fixture.destination, fixture.candidate],
      "Result with unexpected delta",
    );

    await expectFailure(
      verifyPromotionTopology({
        repository: fixture.repository,
        upstreamSha: fixture.upstream,
        destinationSha: fixture.destination,
        candidateSha: fixture.candidate,
        resultSha: changedResult,
      }),
      "TREE_MISMATCH",
      /Result tree .* must equal upstream tree/u,
    );
  });
});

test("an abandoned candidate can be replaced by a fresh valid candidate", async () => {
  await withEqualTreeFixture(async (fixture) => {
    const staleCandidate = await commitTree(
      fixture.repository,
      fixture.destinationTree,
      [fixture.destination, fixture.upstream],
      "Abandoned candidate",
    );
    await expectFailure(
      verifyPromotionTopology({
        repository: fixture.repository,
        upstreamSha: fixture.upstream,
        destinationSha: fixture.destination,
        candidateSha: staleCandidate,
      }),
      "TREE_MISMATCH",
      /must equal upstream tree/u,
    );
    const receipt = await verifyPromotionTopology({
      repository: fixture.repository,
      upstreamSha: fixture.upstream,
      destinationSha: fixture.destination,
      candidateSha: fixture.candidate,
    });
    assert.equal(receipt.status, "PASS");
    assert.equal(receipt.coordinates.candidate, fixture.candidate);
  });
});

test("retained-root promotion preserves the destination subtree and upstream source", async () => {
  await withRetainedRootFixture(async (fixture) => {
    const receipt = await verifyPromotionTopology({
      repository: fixture.repository,
      upstreamSha: fixture.upstream,
      destinationSha: fixture.destination,
      candidateSha: fixture.candidate,
      resultSha: fixture.result,
      retainedRoot,
    });
    assert.equal(receipt.status, "PASS");
    assert.equal(receipt.mode, "retained-root");
    assert.equal(receipt.trees.candidate, fixture.candidateTree);
    assert.equal(receipt.trees.result, fixture.candidateTree);
    assert.equal(receipt.trees.retained_root, retainedRoot);
    assert.match(receipt.trees.retained_tree, /^[0-9a-f]{40}$/u);
  });
});

test("retained-root promotion rejects carrier drift and source drift independently", async (t) => {
  await withRetainedRootFixture(async (fixture) => {
    const carrierDrift = await commitTree(
      fixture.repository,
      fixture.upstreamTree,
      [fixture.destination, fixture.upstream],
      "Candidate with stale carrier",
    );

    await writeFile(path.join(fixture.repository, "unexpected-source.txt"), "drift\n", "utf8");
    await git(fixture.repository, ["add", "unexpected-source.txt"]);
    const sourceDriftTree = await git(fixture.repository, ["write-tree"]);
    const sourceDrift = await commitTree(
      fixture.repository,
      sourceDriftTree,
      [fixture.destination, fixture.upstream],
      "Candidate with source drift",
    );

    await t.test("destination-retained carrier drift", async () => {
      await expectFailure(
        verifyPromotionTopology({
          repository: fixture.repository,
          upstreamSha: fixture.upstream,
          destinationSha: fixture.destination,
          candidateSha: carrierDrift,
          retainedRoot,
        }),
        "RETAINED_ROOT_MISMATCH",
        /destination resolves to/u,
      );
    });

    await t.test("upstream-owned source drift", async () => {
      await expectFailure(
        verifyPromotionTopology({
          repository: fixture.repository,
          upstreamSha: fixture.upstream,
          destinationSha: fixture.destination,
          candidateSha: sourceDrift,
          retainedRoot,
        }),
        "SOURCE_PATH_MISMATCH",
        /changes source-owned paths outside retained root/u,
      );
    });
  });
});

test("retained-root promotion rechecks accepted result content", async (t) => {
  await withRetainedRootFixture(async (fixture) => {
    const carrierDriftResult = await commitTree(
      fixture.repository,
      fixture.upstreamTree,
      [fixture.destination, fixture.candidate],
      "Result with stale carrier",
    );

    await writeFile(
      path.join(fixture.repository, "result-source-drift.txt"),
      "unexpected result source delta\n",
      "utf8",
    );
    await git(fixture.repository, ["add", "result-source-drift.txt"]);
    const sourceDriftTree = await git(fixture.repository, ["write-tree"]);
    const sourceDriftResult = await commitTree(
      fixture.repository,
      sourceDriftTree,
      [fixture.destination, fixture.candidate],
      "Result with source drift",
    );

    await t.test("destination-retained carrier drift", async () => {
      await expectFailure(
        verifyPromotionTopology({
          repository: fixture.repository,
          upstreamSha: fixture.upstream,
          destinationSha: fixture.destination,
          candidateSha: fixture.candidate,
          resultSha: carrierDriftResult,
          retainedRoot,
        }),
        "RETAINED_ROOT_MISMATCH",
        /Result retained root .* destination resolves to/u,
      );
    });

    await t.test("upstream-owned source drift", async () => {
      await expectFailure(
        verifyPromotionTopology({
          repository: fixture.repository,
          upstreamSha: fixture.upstream,
          destinationSha: fixture.destination,
          candidateSha: fixture.candidate,
          resultSha: sourceDriftResult,
          retainedRoot,
        }),
        "SOURCE_PATH_MISMATCH",
        /Result changes source-owned paths outside retained root/u,
      );
    });
  });
});

test("retained-root promotion requires the retained coordinate to remain a tree", async (t) => {
  await withRetainedRootFixture(async (fixture) => {
    await git(fixture.repository, ["rm", "--quiet", "--cached", "-r", retainedRoot]);
    const missingTree = await git(fixture.repository, ["write-tree"]);
    const missingCandidate = await commitTree(
      fixture.repository,
      missingTree,
      [fixture.destination, fixture.upstream],
      "Candidate without retained root",
    );

    await t.test("missing retained root", async () => {
      await expectFailure(
        verifyPromotionTopology({
          repository: fixture.repository,
          upstreamSha: fixture.upstream,
          destinationSha: fixture.destination,
          candidateSha: missingCandidate,
          retainedRoot,
        }),
        "RETAINED_ROOT_MISSING",
        /must carry retained root/u,
      );
    });

    await rm(path.join(fixture.repository, retainedRoot), { recursive: true, force: true });
    await writeFile(path.join(fixture.repository, retainedRoot), "retained root became a blob\n", "utf8");
    await git(fixture.repository, ["add", retainedRoot]);
    const blobRootTree = await git(fixture.repository, ["write-tree"]);
    const blobRootCandidate = await commitTree(
      fixture.repository,
      blobRootTree,
      [fixture.destination, fixture.upstream],
      "Candidate with blob retained root",
    );

    await t.test("retained root is a blob", async () => {
      await expectFailure(
        verifyPromotionTopology({
          repository: fixture.repository,
          upstreamSha: fixture.upstream,
          destinationSha: fixture.destination,
          candidateSha: blobRootCandidate,
          retainedRoot,
        }),
        "RETAINED_ROOT_NOT_TREE",
        /must resolve to a Git tree/u,
      );
    });
  });
});

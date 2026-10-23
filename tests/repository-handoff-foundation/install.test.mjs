import '../../tools/node-runtime-admission.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

import {
  FoundationError,
  admitFoundation,
  applyFoundation,
  createFoundationPlan,
  run,
  verifyFoundation,
} from "../../tools/repository-handoff-foundation.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function temporaryDirectory(t, prefix) {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function snapshotTree(root, relativePath = "") {
  const entries = await readdir(path.join(root, relativePath), { withFileTypes: true });
  const snapshot = [];
  for (const entry of entries.sort((left, right) => Buffer.compare(Buffer.from(left.name), Buffer.from(right.name)))) {
    const childRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    const childPath = path.join(root, childRelative);
    const status = await lstat(childPath);
    if (status.isDirectory()) {
      snapshot.push({ path: childRelative, kind: "directory" });
      snapshot.push(...await snapshotTree(root, childRelative));
    } else if (status.isFile()) {
      snapshot.push({ path: childRelative, kind: "file", bytes: (await readFile(childPath)).toString("base64") });
    } else if (status.isSymbolicLink()) {
      snapshot.push({ path: childRelative, kind: "symlink", target: await readlink(childPath) });
    } else {
      snapshot.push({ path: childRelative, kind: "special" });
    }
  }
  return snapshot;
}

function foundationError(code, inspect = () => {}) {
  return (error) => {
    assert.ok(error instanceof FoundationError);
    assert.equal(error.code, code);
    inspect(error);
    return true;
  };
}

function selectedEntries(foundation) {
  const selected = new Set(foundation.profile.selectedEntryKeys);
  return foundation.manifest.entries.filter((entry) => selected.has(entry.key));
}

test("clean apply is create-only, path-neutral, receipted, and idempotent", async (t) => {
  const foundation = await admitFoundation();
  const targetRoot = await temporaryDirectory(t, "repository-handoff-install-clean-");
  const equivalentRoot = await temporaryDirectory(t, "repository-handoff-install-equivalent-");
  await mkdir(path.join(targetRoot, "owner-notes"));
  await writeFile(path.join(targetRoot, "owner-notes/keep.txt"), "owner state stays intact\n");
  await mkdir(path.join(equivalentRoot, "owner-notes"));
  await writeFile(path.join(equivalentRoot, "owner-notes/keep.txt"), "different unrelated state\n");

  const plan = await createFoundationPlan(foundation, { targetRoot });
  const equivalentPlan = await createFoundationPlan(foundation, { targetRoot: equivalentRoot });
  assert.match(plan.planSha256, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(plan.planSha256, equivalentPlan.planSha256);
  assert.equal(plan.applyEligible, true);

  const applied = await applyFoundation(foundation, {
    targetRoot,
    confirmedPlan: plan.planSha256,
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.summary.created, selectedEntries(foundation).length);
  assert.equal(await readFile(path.join(targetRoot, "owner-notes/keep.txt"), "utf8"), "owner state stays intact\n");
  for (const entry of selectedEntries(foundation)) {
    assert.deepEqual(
      await readFile(path.join(targetRoot, ...entry.targetPath.split("/"))),
      entry.sourceBytes,
      entry.key,
    );
  }

  const receiptPath = path.join(targetRoot, ".repository-handoff/foundation-receipt.json");
  const firstReceiptBytes = await readFile(receiptPath);
  const receipt = JSON.parse(firstReceiptBytes);
  assert.deepEqual(receipt, applied.receipt.document);
  const receiptSchemaPath = path.join(
    ROOT,
    "repository-handoff-foundation-v0.1/schema/local-materialization-receipt.schema.v0.1.json",
  );
  const receiptSchemaBytes = await readFile(receiptSchemaPath);
  const receiptSchema = JSON.parse(receiptSchemaBytes);
  const validateReceipt = new Ajv2020({ strict: true, allErrors: true }).compile(receiptSchema);
  assert.equal(validateReceipt(receipt), true, JSON.stringify(validateReceipt.errors));
  assert.equal(receipt.schemaAuthority.id, receiptSchema.$id);
  assert.equal(receipt.schemaAuthority.sha256, createHash("sha256").update(receiptSchemaBytes).digest("hex"));
  assert.equal(JSON.stringify(receipt).includes(targetRoot), false);
  assert.ok(receipt.entries.every((entry) => !Object.hasOwn(entry, "observedSha256")));
  assert.equal(receipt.operationBoundary.gitMutation, "none");
  assert.equal(receipt.operationBoundary.githubMutation, "none");
  assert.equal(receipt.operationBoundary.networkMutation, "none");
  assert.equal(
    receipt.summary.receivingOwnerCurrent,
    selectedEntries(foundation).filter((entry) => entry.ownership === "receiving_owner").length,
  );
  assert.ok(receipt.entries.every((entry) => entry.disposition === (
    entry.ownership === "receiving_owner" ? "receiving_owner_current" : "exact_source"
  )));
  assert.equal((await verifyFoundation(foundation, { targetRoot })).ok, true);

  const repeatPlan = await createFoundationPlan(foundation, { targetRoot });
  const repeated = await applyFoundation(foundation, {
    targetRoot,
    confirmedPlan: repeatPlan.planSha256,
  });
  assert.equal(repeated.summary.created, 0);
  assert.equal(repeated.summary.alreadyExact, selectedEntries(foundation).length);
  assert.equal(repeated.receipt.state, "already_exact");
  assert.deepEqual(await readFile(receiptPath), firstReceiptBytes);
});

test("a receiving-owner edit preserves the original receipt and supports confirmed re-entry", async (t) => {
  const foundation = await admitFoundation();
  const targetRoot = await temporaryDirectory(t, "repository-handoff-install-owner-reentry-");
  const firstPlan = await createFoundationPlan(foundation, { targetRoot });
  await applyFoundation(foundation, { targetRoot, confirmedPlan: firstPlan.planSha256 });
  const receiptPath = path.join(targetRoot, ".repository-handoff/foundation-receipt.json");
  const acceptedReceipt = await readFile(receiptPath);
  const ownerBytes = Buffer.from("# Receiving owner revision\n\nThe current owner now maintains this orientation.\n");
  await writeFile(path.join(targetRoot, "README.md"), ownerBytes);

  const reentryPlan = await createFoundationPlan(foundation, { targetRoot });
  assert.equal(reentryPlan.applyEligible, true);
  const reapplied = await applyFoundation(foundation, {
    targetRoot,
    confirmedPlan: reentryPlan.planSha256,
  });

  assert.equal(reapplied.summary.created, 0);
  assert.equal(reapplied.summary.preservedExisting, 1);
  assert.equal(reapplied.receipt.state, "already_exact");
  assert.deepEqual(await readFile(path.join(targetRoot, "README.md")), ownerBytes);
  assert.deepEqual(await readFile(receiptPath), acceptedReceipt);
});

test("apply preserves a receiving-owner collision and omits its content digest from the receipt", async (t) => {
  const foundation = await admitFoundation();
  const targetRoot = await temporaryDirectory(t, "repository-handoff-install-owner-");
  const ownerBytes = Buffer.from("# Receiving owner README\n\nOwner-authored orientation remains current.\n");
  await writeFile(path.join(targetRoot, "README.md"), ownerBytes);
  const plan = await createFoundationPlan(foundation, { targetRoot });
  assert.equal(plan.applyEligible, true);

  const applied = await applyFoundation(foundation, {
    targetRoot,
    confirmedPlan: plan.planSha256,
  });

  assert.deepEqual(await readFile(path.join(targetRoot, "README.md")), ownerBytes);
  assert.equal(applied.summary.preservedExisting, 1);
  const receiptEntry = applied.receipt.document.entries.find((entry) => entry.key === "orientation.readme");
  assert.equal(receiptEntry.disposition, "receiving_owner_current");
  assert.equal(Object.hasOwn(receiptEntry, "observedSha256"), false);
  assert.equal(Object.hasOwn(receiptEntry, "observedBytes"), false);
  assert.equal((await verifyFoundation(foundation, { targetRoot })).ok, true);
});

test("an exact-byte collision blocks every selected-entry mutation", async (t) => {
  const foundation = await admitFoundation();
  const targetRoot = await temporaryDirectory(t, "repository-handoff-install-exact-block-");
  await mkdir(path.join(targetRoot, "references/local"), { recursive: true });
  await writeFile(path.join(targetRoot, "references/local/.gitignore"), "owner replacement\n");
  const before = await snapshotTree(targetRoot);
  const plan = await createFoundationPlan(foundation, { targetRoot });
  assert.equal(plan.applyEligible, false);
  assert.deepEqual(plan.blockingReasons.map((entry) => entry.key), ["references.local-ignore"]);

  await assert.rejects(
    applyFoundation(foundation, { targetRoot, confirmedPlan: plan.planSha256 }),
    foundationError("apply_blocked", (error) => assert.equal(error.details.recovery.complete, true)),
  );
  assert.deepEqual(await snapshotTree(targetRoot), before);
});

test("a stale confirmed plan refuses writes and preserves the new owner file", async (t) => {
  const foundation = await admitFoundation();
  const targetRoot = await temporaryDirectory(t, "repository-handoff-install-stale-");
  const plan = await createFoundationPlan(foundation, { targetRoot });
  const ownerBytes = Buffer.from("# Owner arrived after planning\n");
  await writeFile(path.join(targetRoot, "README.md"), ownerBytes);

  await assert.rejects(
    applyFoundation(foundation, { targetRoot, confirmedPlan: plan.planSha256 }),
    foundationError("stale_plan", (error) => assert.equal(error.details.recovery.complete, true)),
  );
  assert.deepEqual(await readFile(path.join(targetRoot, "README.md")), ownerBytes);
  assert.deepEqual(await readdir(targetRoot), ["README.md"]);
});

test("an existing apply lock preserves target state and returns a bounded recovery route", async (t) => {
  const foundation = await admitFoundation();
  const targetRoot = await temporaryDirectory(t, "repository-handoff-install-lock-");
  const lockPath = path.join(targetRoot, ".repository-handoff/.apply.lock");
  await mkdir(path.dirname(lockPath), { recursive: true });
  await writeFile(lockPath, "prior apply recovery signal\n");
  const before = await snapshotTree(targetRoot);
  const plan = await createFoundationPlan(foundation, { targetRoot });

  await assert.rejects(
    applyFoundation(foundation, { targetRoot, confirmedPlan: plan.planSha256 }),
    foundationError("apply_locked", (error) => {
      assert.match(error.message, /Confirm the prior apply has stopped/u);
      assert.equal(error.details.recovery.complete, true);
    }),
  );
  assert.deepEqual(await snapshotTree(targetRoot), before);
});

test("a foreign receipt becomes a confirmed-plan blocker before foundation entries change", async (t) => {
  const foundation = await admitFoundation();
  const targetRoot = await temporaryDirectory(t, "repository-handoff-install-receipt-collision-");
  const receiptPath = path.join(targetRoot, ".repository-handoff/foundation-receipt.json");
  await mkdir(path.dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, "{\"foreign\":true}\n");
  const before = await snapshotTree(targetRoot);
  const plan = await createFoundationPlan(foundation, { targetRoot });

  assert.equal(plan.receipt.state, "preserve_collision");
  assert.equal(plan.applyEligible, false);
  assert.equal(
    plan.blockingReasons.find((entry) => entry.key === "foundation-receipt")?.reason,
    "exact_bytes_collision",
  );
  await assert.rejects(
    applyFoundation(foundation, { targetRoot, confirmedPlan: plan.planSha256 }),
    foundationError("apply_blocked"),
  );
  assert.deepEqual(await snapshotTree(targetRoot), before);
});

test("a portable alias for the apply control directory blocks writes", async (t) => {
  const foundation = await admitFoundation();
  const targetRoot = await temporaryDirectory(t, "repository-handoff-install-control-alias-");
  await mkdir(path.join(targetRoot, ".Repository-Handoff"));
  const before = await snapshotTree(targetRoot);
  const plan = await createFoundationPlan(foundation, { targetRoot });

  assert.equal(plan.applyEligible, false);
  assert.equal(plan.receipt.reason, "portable_case_alias");
  await assert.rejects(
    applyFoundation(foundation, { targetRoot, confirmedPlan: plan.planSha256 }),
    foundationError("apply_control_path"),
  );
  assert.deepEqual(await snapshotTree(targetRoot), before);
});

test("apply rehashes admitted source buffers before creating selected entries", async (t) => {
  const foundation = await admitFoundation();
  const targetRoot = await temporaryDirectory(t, "repository-handoff-install-buffer-identity-");
  const plan = await createFoundationPlan(foundation, { targetRoot });
  const entry = foundation.manifest.entriesByKey.get("orientation.agents");
  const originalByte = entry.sourceBytes[0];
  entry.sourceBytes[0] = originalByte ^ 0xff;
  try {
    await assert.rejects(
      applyFoundation(foundation, { targetRoot, confirmedPlan: plan.planSha256 }),
      foundationError("admitted_source_identity", (error) => assert.equal(error.details.recovery.complete, true)),
    );
    assert.deepEqual(await readdir(targetRoot), []);
  } finally {
    entry.sourceBytes[0] = originalByte;
  }
});

test("apply refuses symbolic-link components and special target entries", async (t) => {
  const foundation = await admitFoundation();

  await t.test("symbolic-link component", async (t) => {
    const targetRoot = await temporaryDirectory(t, "repository-handoff-install-symlink-");
    const outsideRoot = await temporaryDirectory(t, "repository-handoff-install-outside-");
    await symlink(outsideRoot, path.join(targetRoot, "references"), "dir");
    const before = await snapshotTree(targetRoot);
    const plan = await createFoundationPlan(foundation, { targetRoot });
    assert.equal(plan.applyEligible, false);
    await assert.rejects(
      applyFoundation(foundation, { targetRoot, confirmedPlan: plan.planSha256 }),
      foundationError("apply_blocked"),
    );
    assert.deepEqual(await snapshotTree(targetRoot), before);
    assert.deepEqual(await readdir(outsideRoot), []);
  });

  await t.test("directory at a file target", async (t) => {
    const targetRoot = await temporaryDirectory(t, "repository-handoff-install-special-");
    await mkdir(path.join(targetRoot, "README.md"));
    const before = await snapshotTree(targetRoot);
    const plan = await createFoundationPlan(foundation, { targetRoot });
    assert.equal(plan.applyEligible, false);
    await assert.rejects(
      applyFoundation(foundation, { targetRoot, confirmedPlan: plan.planSha256 }),
      foundationError("apply_blocked"),
    );
    assert.deepEqual(await snapshotTree(targetRoot), before);
  });

  await t.test("portable case alias", async (t) => {
    const targetRoot = await temporaryDirectory(t, "repository-handoff-install-case-alias-");
    const ownerBytes = Buffer.from("# Existing portable alias\n");
    await writeFile(path.join(targetRoot, "readme.md"), ownerBytes);
    const before = await snapshotTree(targetRoot);
    const plan = await createFoundationPlan(foundation, { targetRoot });
    assert.equal(plan.applyEligible, false);
    assert.equal(
      plan.blockingReasons.find((entry) => entry.key === "orientation.readme")?.reason,
      "portable_case_alias",
    );
    await assert.rejects(
      applyFoundation(foundation, { targetRoot, confirmedPlan: plan.planSha256 }),
      foundationError("apply_blocked"),
    );
    assert.deepEqual(await snapshotTree(targetRoot), before);
    assert.deepEqual(await readFile(path.join(targetRoot, "readme.md")), ownerBytes);
  });
});

test("rollback removes unchanged transaction files and preserves an edited created file", async (t) => {
  const foundation = await admitFoundation();
  const targetRoot = await temporaryDirectory(t, "repository-handoff-install-rollback-");
  const plan = await createFoundationPlan(foundation, { targetRoot });
  let createdCount = 0;
  const editedBytes = Buffer.from("# Receiving owner took over this file during apply\n");

  await assert.rejects(
    applyFoundation(foundation, {
      targetRoot,
      confirmedPlan: plan.planSha256,
      hooks: {
        async afterFileCreated({ targetPath }) {
          createdCount += 1;
          if (createdCount !== 2) return;
          await writeFile(targetPath, editedBytes);
          throw new Error("injected failure after owner edit");
        },
      },
    }),
    foundationError("apply_failed", (error) => {
      assert.equal(error.details.recovery.complete, false);
      assert.ok(error.details.recovery.files.some((entry) => entry.state === "removed"));
      assert.ok(error.details.recovery.files.some((entry) => entry.state === "preserved"));
    }),
  );

  assert.equal(createdCount, 2);
  assert.deepEqual(await readFile(path.join(targetRoot, "README.md")), editedBytes);
  await assert.rejects(readFile(path.join(targetRoot, "AGENTS.md")), { code: "ENOENT" });
  await assert.rejects(readFile(path.join(targetRoot, ".repository-handoff/foundation-receipt.json")), { code: "ENOENT" });
});

test("rollback isolates a cleanup failure and retains the initiating error with a complete ledger", async (t) => {
  const foundation = await admitFoundation();
  const targetRoot = await temporaryDirectory(t, "repository-handoff-install-rollback-isolation-");
  const plan = await createFoundationPlan(foundation, { targetRoot });
  let createdCount = 0;
  let cleanupFailureInjected = false;

  await assert.rejects(
    applyFoundation(foundation, {
      targetRoot,
      confirmedPlan: plan.planSha256,
      hooks: {
        async afterFileCreated() {
          createdCount += 1;
          if (createdCount === 3) throw new Error("initiating apply failure");
        },
        async beforeFileRollback(created) {
          if (!cleanupFailureInjected && created.targetPath !== ".repository-handoff/.apply.lock") {
            cleanupFailureInjected = true;
            const error = new Error("injected cleanup failure");
            error.code = "EACCES";
            throw error;
          }
        },
      },
    }),
    foundationError("apply_failed", (error) => {
      assert.match(error.message, /initiating apply failure/u);
      assert.equal(error.details.recovery.complete, false);
      assert.equal(
        error.details.recovery.files.filter((entry) => entry.reason === "cleanup_error:EACCES").length,
        1,
      );
      assert.ok(error.details.recovery.files.some((entry) => entry.state === "removed"));
      assert.equal(error.details.recovery.files.length, createdCount + 1);
    }),
  );

  assert.equal(cleanupFailureInjected, true);
});

test("lock loss prevents a successful apply and rolls back transaction-created state", async (t) => {
  const foundation = await admitFoundation();
  const targetRoot = await temporaryDirectory(t, "repository-handoff-install-lock-loss-");
  const plan = await createFoundationPlan(foundation, { targetRoot });
  let removed = false;

  await assert.rejects(
    applyFoundation(foundation, {
      targetRoot,
      confirmedPlan: plan.planSha256,
      hooks: {
        async afterFileCreated() {
          if (removed) return;
          removed = true;
          await unlink(path.join(targetRoot, ".repository-handoff/.apply.lock"));
        },
      },
    }),
    foundationError("lock_cleanup", (error) => {
      assert.equal(error.details.recovery.complete, true);
    }),
  );

  assert.equal(removed, true);
  assert.deepEqual(await readdir(targetRoot), []);
});

test("CLI apply requires an explicit target and exact plan confirmation", async (t) => {
  const targetRoot = await temporaryDirectory(t, "repository-handoff-install-cli-");
  const foundation = await admitFoundation();
  const plan = await createFoundationPlan(foundation, { targetRoot });
  const output = { stdout: "", stderr: "" };
  const io = {
    stdout: { write(value) { output.stdout += value; } },
    stderr: { write(value) { output.stderr += value; } },
  };

  assert.equal(await run(["--apply", "--confirm-plan", plan.planSha256, "--json"], io), 1);
  assert.match(output.stderr, /explicit --target/u);
  assert.deepEqual(await readdir(targetRoot), []);

  output.stdout = "";
  output.stderr = "";
  assert.equal(await run(["--apply", "--target", targetRoot, "--json"], io), 1);
  assert.match(output.stderr, /--confirm-plan/u);
  assert.deepEqual(await readdir(targetRoot), []);
});

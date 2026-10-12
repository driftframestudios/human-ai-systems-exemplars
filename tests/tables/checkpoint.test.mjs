import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collectCleanupErrors, digest, openCheckpoints, publishObservation, withCheckpointLock } from "../../tools/observation-checkpoint.mjs";

test("completed case reuse follows exact definition and dependency agreement", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "table-checkpoint-"));
  try {
    const store = await openCheckpoints(directory);
    const result = { id: "family/390", standing: "pass", observed: 3 };
    await store.write(result.id, "definition-1", { source: "sha-a" }, result);
    const resumed = await openCheckpoints(directory);
    for (const [signature, source, expected] of [
      ["definition-1", "sha-a", result], ["definition-2", "sha-a", null], ["definition-1", "sha-b", null],
    ]) assert.deepEqual(await resumed.read(result.id, signature, (dependencies) => dependencies.source === source), expected);
    assert.equal(await resumed.read("other", "definition-1", () => true), null);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test("interrupted writes retain completed observations and incomplete cases retry", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "table-checkpoint-"));
  try {
    const store = await openCheckpoints(directory);
    const result = { id: "complete", standing: "review" };
    await store.write(result.id, "v1", {}, result);
    await fs.writeFile(path.join(directory, digest(result.id) + ".interrupted.tmp"), '{"version":');
    assert.deepEqual(await store.read(result.id, "v1", () => true), result);
    await store.write("unfinished", "v1", {}, { standing: "incomplete" });
    assert.equal(await store.read("unfinished", "v1", () => true), null);
    await fs.writeFile(path.join(directory, digest("partial") + ".json"), '{"version":');
    assert.equal(await store.read("partial", "v1", () => true), null);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test("required artifacts complete before an observation becomes reusable", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "table-checkpoint-"));
  try {
    const store = await openCheckpoints(directory);
    const record = { id: "capture", signature: "v1", dependencies: {}, result: { standing: "pass" } };
    await assert.rejects(publishObservation(store, record, async () => { throw new Error("capture interrupted"); }), /capture interrupted/u);
    assert.equal(await store.read(record.id, "v1", () => true), null);
    await publishObservation(store, record, async () => { record.dependencies.screenshot = "sha-image"; });
    assert.deepEqual(await store.read(record.id, "v1", (deps) => deps.screenshot === "sha-image"), record.result);
    assert.equal(await store.read(record.id, "v1", () => false), null, "missing or changed capture reopens the case");
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

for (const failing of [[], [0], [0, 1]]) {
  test("cleanup attempts every release with failures at " + JSON.stringify(failing), async () => {
    const visited = [];
    const failures = [new Error("browser close failed"), new Error("server close failed")];
    const errors = await collectCleanupErrors([0, 1].map(index => async () => {
      visited.push(index);
      if (failing.includes(index)) throw failures[index];
    }));
    assert.deepEqual(visited, [0, 1]);
    assert.deepEqual(errors, failing.map(index => failures[index]));
  });
}

test("an unacquired lock keeps the existing writer and never enters the operation", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "table-lock-owned-"));
  const filename = path.join(directory, "campaign.lock");
  try {
    await fs.writeFile(filename, "existing writer\n");
    let entered = false;
    await assert.rejects(withCheckpointLock(filename, {}, async () => { entered = true; }), { code: "EEXIST" });
    assert.equal(entered, false);
    assert.equal(await fs.readFile(filename, "utf8"), "existing writer\n");
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test("lock metadata preparation failure releases exactly the acquired handle and path", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "table-lock-prepare-"));
  const filename = path.join(directory, "campaign.lock");
  const open = fs.open.bind(fs), failure = new Error("metadata write failed");
  let closed = 0, entered = false;
  try {
    t.mock.method(fs, "open", async (...args) => {
      const handle = await open(...args);
      if (args[0] !== filename) return handle;
      return {
        async writeFile() { throw failure; },
        async close() { closed++; await handle.close(); },
      };
    });
    await assert.rejects(withCheckpointLock(filename, {}, async () => { entered = true; }), error => error === failure);
    assert.equal(entered, false);
    assert.equal(closed, 1);
    await assert.rejects(fs.access(filename), { code: "ENOENT" });
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

for (const removeFails of [false, true]) {
  test("primary failure survives handle cleanup" + (removeFails ? " and unlink failure" : ""), async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "table-lock-errors-"));
    const filename = path.join(directory, "campaign.lock");
    const open = fs.open.bind(fs), remove = fs.rm.bind(fs);
    const primary = new Error("original observation failure");
    const closeFailure = new Error("handle close failure"), unlinkFailure = new Error("unlink failure");
    const visited = [];
    try {
      t.mock.method(fs, "open", async (...args) => {
        const handle = await open(...args);
        if (args[0] !== filename) return handle;
        return {
          writeFile: (...values) => handle.writeFile(...values),
          async close() { visited.push("close"); await handle.close(); throw closeFailure; },
        };
      });
      t.mock.method(fs, "rm", async (...args) => {
        if (args[0] === filename) {
          visited.push("unlink");
          if (removeFails) throw unlinkFailure;
        }
        return remove(...args);
      });
      await assert.rejects(withCheckpointLock(filename, {}, async () => { throw primary; }), error => {
        assert(error instanceof AggregateError);
        assert.strictEqual(error.cause, primary);
        assert.deepEqual(error.errors, removeFails ? [primary, closeFailure, unlinkFailure] : [primary, closeFailure]);
        return true;
      });
      assert.deepEqual(visited, ["close", "unlink"]);
      if (removeFails) await fs.access(filename);
      else await assert.rejects(fs.access(filename), { code: "ENOENT" });
    } finally { await remove(directory, { recursive: true, force: true }); }
  });
}

test("report preparation failure releases the lock and retains the original filesystem diagnosis", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "table-lock-report-"));
  const filename = path.join(directory, "campaign.lock");
  try {
    await assert.rejects(withCheckpointLock(filename, {}, () =>
      fs.writeFile(path.join(directory, "absent", "summary.json"), "{}")), { code: "ENOENT" });
    await assert.rejects(fs.access(filename), { code: "ENOENT" });
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test("a completed lock scope can be acquired again without changing its returned value", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "table-lock-return-"));
  const filename = path.join(directory, "campaign.lock");
  try {
    for (const value of ["first", "second"]) {
      assert.equal(await withCheckpointLock(filename, { value }, async () => {
        assert.deepEqual(JSON.parse(await fs.readFile(filename, "utf8")), { value });
        return value;
      }), value);
      await assert.rejects(fs.access(filename), { code: "ENOENT" });
    }
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

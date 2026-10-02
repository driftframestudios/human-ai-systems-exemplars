import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { digest, openCheckpoints, publishObservation } from "../../tools/observation-checkpoint.mjs";

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

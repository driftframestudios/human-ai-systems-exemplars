import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import test, { before, after } from "node:test";
import { sha, signature, opportunities, material, parity, adjudicate, assertApproval, summarize } from "./core.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const protocol = JSON.parse(await fs.readFile(path.join(root, "protocol.json"), "utf8"));
const corpus = JSON.parse(await fs.readFile(path.join(root, "faults.json"), "utf8"));
let temporary;
let checkpoint;
let campaign;
before(async () => {
  await fs.mkdir(path.join(root, ".local"), { recursive: true });
  temporary = await fs.mkdtemp(path.join(root, ".local/focused-tests-"));
  // Load the actual pinned thin owners without importing Playwright or opening a browser.
  for (const name of ["observation-checkpoint.mjs", "evidence-campaign.mjs"]) {
    const bytes = execFileSync("git", ["show", protocol.applicationRevision + ":tools/" + name],
      { cwd: root, maxBuffer: 4 * 1024 * 1024 });
    await fs.writeFile(path.join(temporary, name), bytes);
  }
  checkpoint = await import(pathToFileURL(path.join(temporary, "observation-checkpoint.mjs")).href);
  campaign = await import(pathToFileURL(path.join(temporary, "evidence-campaign.mjs")).href);
});
after(async () => { if (temporary) await fs.rm(temporary, { recursive: true, force: true }); });

const families = [
  { id: "conditioning", widths: [304, 320, 390, 1280] },
  { id: "shared", widths: [304, 320, 390, 479, 480, 481, 1280], projection: "shared.html" },
  { id: "investment", widths: [304, 320, 390, 1239, 1280] },
];
test("frozen schedule has five complete opportunities per scenario with counterbalanced order", () => {
  const plan = campaign.executionPlan(families, { mode: "closure", familyId: "all" });
  const rows = opportunities(protocol, plan.expected);
  assert.equal(rows.length, 15);
  for (const scenario of protocol.scenarios) {
    const selected = rows.filter((row) => row.scenario === scenario.id);
    assert.equal(selected.length, 5);
    assert([2, 3].includes(selected.filter((row) => row.order[0] === "full").length));
    assert(selected.every((row) => JSON.stringify(row.expected) === JSON.stringify(plan.expected)));
  }
  assert.equal(rows.reduce((sum, row) => sum + 1 + Number(row.selected.length > 0), 0), 25);
  assert.equal(rows.reduce((sum, row) => sum + row.expected.length + row.selected.length, 0), 840);
  assert.equal(rows.filter((row) => row.scenario === "family")[0].selected.length, 12);
  assert.equal(rows.filter((row) => row.scenario === "helper")[0].selected.length, 39);
  assert.equal(rows.filter((row) => row.scenario === "unchanged")[0].selected.length, 0);
});
for (const fault of corpus.faults) {
  test("independent fault and actual-validator fresh control: " + fault.id, async () => {
    const directory = await fs.mkdtemp(path.join(temporary, "fault-"));
    const store = await checkpoint.openCheckpoints(path.join(directory, "checkpoints"));
    const oracle = structuredClone(corpus.oracle);
    for (const [file, bytes] of Object.entries(oracle.dependencies)) {
      await fs.writeFile(path.join(directory, file), bytes);
      oracle.dependencies[file] = sha(bytes);
    }
    const record = structuredClone(oracle);
    let requestedSignature = oracle.signature;
    const change = async (file, bytes) => {
      await fs.writeFile(path.join(directory, file), bytes);
      oracle.dependencies[file] = sha(bytes);
    };
    if (fault.mutation === "source") {
      await change("source.html", "source-B");
      oracle.result.records[5].value = "qualified: 24 USD";
    }
    if (fault.mutation === "helper") {
      await change("helper.mjs", "helper-B");
      requestedSignature = "definition-B/runtime-A";
      oracle.signature = requestedSignature;
    }
    if (fault.mutation === "runtime") {
      await change("runtime", "runtime-B");
      requestedSignature = "definition-A/runtime-B";
      oracle.signature = requestedSignature;
    }
    if (fault.mutation === "artifact") await fs.rm(path.join(directory, "capture.png"));
    if (fault.mutation === "omitted") {
      delete record.dependencies["source.html"];
      await change("source.html", "source-B");
      oracle.result.records[5].value = "qualified: 24 USD";
    }
    if (fault.mutation === "state") record.result.records[1].value = "another selection";
    if (fault.mutation === "label") record.result.records[1].label = "Hours";
    if (fault.mutation === "assertion") record.result.assertions.keyboard = "unobserved";
    const snapshot = campaign.inputSnapshot(directory);
    const agrees = (dependencies) => snapshot.agrees(dependencies, true);
    await store.write(record.id, record.signature, record.dependencies, record.result);
    const reused = await store.readRecord(record.id, requestedSignature, agrees);
    assert.equal(Boolean(reused), fault.pipelineReuse);
    const faults = adjudicate(record, oracle);
    for (const [file, hash] of Object.entries(oracle.dependencies)) {
      if (!await agrees({ [file]: hash })) faults.push("dependency:" + file);
    }
    assert(faults.includes(fault.oracleFault), fault.consequence);

    // Fresh publication supplies current dependency bytes, including regenerated artifacts.
    if (fault.mutation === "artifact") await change("capture.png", "image-B");
    const fresh = structuredClone(oracle);
    assert.deepEqual(Object.keys(fresh.dependencies).sort(), Object.keys(corpus.oracle.dependencies).sort());
    assert(await agrees(fresh.dependencies), "Fresh control agrees with actual dependency bytes");
    await checkpoint.publishObservation(store, fresh, async () => {
      assert(await agrees(fresh.dependencies), "Required artifacts finish before fresh publication");
    });
    const reopened = await checkpoint.openCheckpoints(path.join(directory, "checkpoints"));
    const accepted = await reopened.readRecord(fresh.id, requestedSignature, agrees);
    assert(accepted, "The production checkpoint validator accepts the coherent fresh control");
    assert.deepEqual(adjudicate(accepted, oracle), []);
    const published = await campaign.publishCampaign(path.join(directory, "publication"), [fresh.id], [accepted],
      ({ dependencies }) => agrees(dependencies));
    assert.equal(published.standing, "pass", "The production generation validator accepts the fresh control");
  });
}
for (const [name, change] of [
  ["stale helper", (deps) => { deps["helper.mjs"] = sha("old-helper"); }],
  ["stale runtime", (deps) => { deps.runtime = sha("old-runtime"); }],
  ["null screenshot", (deps) => { deps["capture.png"] = null; }],
]) test("actual validator rejects an inconsistent fresh control: " + name, async () => {
  const directory = await fs.mkdtemp(path.join(temporary, "fresh-control-"));
  for (const [file, bytes] of Object.entries(corpus.oracle.dependencies)) await fs.writeFile(path.join(directory, file), bytes);
  const snapshot = campaign.inputSnapshot(directory);
  const dependencies = { ...await snapshot.fingerprints(Object.keys(corpus.oracle.dependencies)) };
  change(dependencies);
  const record = { ...structuredClone(corpus.oracle), dependencies };
  const store = await checkpoint.openCheckpoints(path.join(directory, "checkpoints"));
  await store.write(record.id, record.signature, record.dependencies, record.result);
  const agrees = (deps) => snapshot.agrees(deps, true);
  assert.equal(await store.readRecord(record.id, record.signature, agrees), null);
  await assert.rejects(campaign.publishCampaign(path.join(directory, "publication"), [record.id], [record],
    ({ dependencies: deps }) => agrees(deps)));
});
test("physical source/helper/runtime/artifact mutations reopen real snapshot-backed checkpoints", async () => {
  const directory = await fs.mkdtemp(path.join(temporary, "physical-"));
  const names = ["source.html", "helper.mjs", "runtime", "capture.png"];
  for (const name of names) await fs.writeFile(path.join(directory, name), "accepted");
  const snapshot = campaign.inputSnapshot(directory);
  const dependencies = await snapshot.fingerprints(names);
  const store = await checkpoint.openCheckpoints(path.join(directory, "checkpoints"));
  await store.write("case", "identity", dependencies, { id: "case", standing: "pass" });
  for (const name of names) {
    await fs.writeFile(path.join(directory, name), "changed");
    assert.equal(await store.readRecord("case", "identity", (deps) => snapshot.agrees(deps, true)), null, name);
    await fs.writeFile(path.join(directory, name), "accepted");
  }
  await fs.rm(path.join(directory, "capture.png"));
  assert.equal(await store.readRecord("case", "identity", (deps) => snapshot.agrees(deps, true)), null);
});
test("complete receiving generations reject omitted, duplicate and incomplete cases", async () => {
  const directory = await fs.mkdtemp(path.join(temporary, "publication-"));
  const record = { ...structuredClone(corpus.oracle), result: { id: corpus.oracle.id, standing: "pass" } };
  for (const records of [[], [record, record], [{ ...record, id: "other" }],
    [{ ...record, result: { ...record.result, standing: "incomplete" } }]]) {
    await assert.rejects(campaign.publishCampaign(directory, [record.id], records, () => true));
  }
  const accepted = await campaign.publishCampaign(directory, [record.id], [record], () => true);
  assert.equal(accepted.standing, "pass");
  await assert.rejects(campaign.publishCampaign(directory, [record.id], [record], () => false));
  const pointer = JSON.parse(await fs.readFile(path.join(directory, "completion.json"), "utf8"));
  assert.equal(pointer.sha256, accepted.sha256);
});
function generation() {
  const record = structuredClone(corpus.oracle);
  record.dependencies[".visual-runs/paired-replay-02/screenshots/" + "a".repeat(64) + ".png"] = "a".repeat(64);
  return { version: 1, observationVersion: "table-reading.v3", expected: [record.id],
    records: [record], metadata: { definition: "A", started: 1 } };
}
for (const [label, mutate] of [
  ["blank becomes zero", (g) => { g.records[0].result.records[0].value = "0"; }],
  ["zero becomes blank", (g) => { g.records[0].result.records[1].value = ""; }],
  ["status changes", (g) => { g.records[0].result.records[2].value = "inapplicable"; }],
  ["label changes", (g) => { g.records[0].result.records[1].label = "Hours"; }],
  ["row identity changes", (g) => { g.records[0].result.records[1].identity = "Another"; }],
  ["assertion changes", (g) => { g.records[0].result.assertions.population = 5; }],
  ["screenshot changes", (g) => { const key = Object.keys(g.records[0].dependencies).at(-1); g.records[0].dependencies[key] = "b".repeat(64); }],
  ["unknown result field", (g) => { g.records[0].result.newAssertion = "review"; }],
  ["verdict changes", (g) => { g.records[0].result.standing = "review"; }],
  ["case removed", (g) => { g.records = []; }],
]) {
  test("normalization preserves material: " + label, () => {
    const seed = generation();
    const changed = structuredClone(seed);
    mutate(changed);
    assert.throws(() => parity(seed, seed, changed));
  });
}
test("only documented source identity and measurement envelopes normalize away", () => {
  const seed = generation();
  const full = structuredClone(seed);
  full.metadata.started = 99;
  full.metadata.definition = "B";
  full.records[0].signature = "B";
  full.records[0].dependencies["source.html"] = "source-B";
  assert.deepEqual(material(seed), material(full));
  assert.equal(parity(seed, full, structuredClone(full)), signature(material(seed)));
  const selected = structuredClone(full);
  selected.records[0].dependencies["source.html"] = "wrong";
  assert.throws(() => parity(seed, full, selected), /dependency/u);
});
test("equivalent checkpoints detach policy mutations and preserve artifact-relative paths", async () => {
  const directory = await fs.mkdtemp(path.join(temporary, "isolation-"));
  const seed = path.join(directory, "seed");
  const output = path.join(directory, "work");
  await fs.mkdir(seed);
  const bytes = JSON.stringify(corpus.oracle);
  await fs.writeFile(path.join(seed, "record.json"), bytes);
  for (const policy of ["full", "selected"]) {
    await fs.rm(output, { recursive: true, force: true });
    await fs.cp(seed, output, { recursive: true });
    assert.equal(sha(await fs.readFile(path.join(output, "record.json"))), sha(bytes), policy);
    await fs.writeFile(path.join(output, "record.json"), JSON.stringify({ contaminated: policy }));
    assert.equal(await fs.readFile(path.join(seed, "record.json"), "utf8"), bytes);
  }
});
const frozen = { createdAt: "2000-01-01T00:00:00.000Z", bundleHash: "bundle" };
const approval = {
  frozenHash: signature(frozen), bundleHash: "bundle", reviewer: "independent-parent",
  approvedAt: "2000-01-02T00:00:00.000Z", independentFaultAdjudication: true,
  authorizeBrowserExecution: true, contention: "quiet",
};
for (const [field, value] of [
  ["frozenHash", "changed"], ["bundleHash", "changed"], ["reviewer", ""],
  ["approvedAt", null], ["independentFaultAdjudication", false],
  ["authorizeBrowserExecution", false], ["contention", "unrecorded"],
]) test("review gate rejects " + field, () => assert.throws(() => assertApproval({ ...approval, [field]: value }, frozen)));
test("review gate accepts the exact independently adjudicated frozen bundle", () => assertApproval(approval, frozen));
for (const [values, expected] of [
  [[1, 2, 3, 4, 5], "adopt"], [[-1, -2, 0, -4, -5], "retain"], [[1, -1, 0, 2, -2], "combine"],
]) test("prospective decision rule: " + expected, () => {
  const pairs = protocol.scenarios.flatMap((scenario) => values.map((differenceMilliseconds) =>
    ({ scenario: scenario.id, differenceMilliseconds })));
  const state = { pairs, sessions: [{}], measuredMilliseconds: 1000, started: true };
  const result = summarize(protocol, state);
  assert.equal(result.disposition, expected);
  assert.deepEqual(result.scenarios[0].rangeMilliseconds, [Math.min(...values), Math.max(...values)]);
  assert.equal(summarize(protocol, { ...state, stop: "budget" }).disposition, "indeterminate");
  assert.equal(summarize(protocol, { ...state, sessions: [{}, {}] }).disposition, "indeterminate");
});
test("partial and paused work retain observations without claiming five completed pairs", () => {
  assert.equal(summarize(protocol, {}).disposition, "defer");
  const result = summarize(protocol, { started: true, pairs: [
    { scenario: "unchanged", differenceMilliseconds: 1 }, { scenario: "unchanged", differenceMilliseconds: 3 },
  ] });
  assert.equal(result.disposition, "indeterminate");
  assert.equal(result.scenarios[0].medianMilliseconds, 2);
});

test("a retained interruption overrides otherwise complete positive paired differences", () => {
  const state = { interrupted: true, started: true, sessions: [{}],
    pairs: protocol.scenarios.flatMap((scenario) => Array.from({ length: protocol.repetitions },
      () => ({ scenario: scenario.id, differenceMilliseconds: 1 }))) };
  assert.equal(summarize(protocol, state).disposition, "indeterminate");
});

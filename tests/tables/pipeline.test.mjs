import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { executionPlan, inputSnapshot, publishCampaign, publishScreenshot } from "../../tools/evidence-campaign.mjs";
import { conditioningInputs, corePlanningInputs } from "../../tools/evidence-inputs.mjs";
import { digest, openCheckpoints } from "../../tools/observation-checkpoint.mjs";
import { assertSelectedInspection } from "./conditioning.browser.mjs";

const family = { id: "example", source: "example.html", widths: [320, 390], tables: { script: 1, static: 1 } };
test("exact plans reject unknown selectors before executable work", () => {
  const options = { mode: "closure", familyId: "all" };
  const plan = executionPlan([family], options);
  assert.equal(plan.expected.length, 10);
  assert.equal(executionPlan([family], { ...options, caseId: plan.cases[0].id }).expected.length, 2);
  for (const changes of [{ caseId: "missing" }, { caseId: "" }, { familyId: "missing" }, { mode: "missing" }]) {
    assert.throws(() => executionPlan([family], { ...options, ...changes }));
  }
  assert.deepEqual(executionPlan([family], { mode: "fixtures", familyId: "all" }).expected, ["observer-fixtures"]);
});

test("fingerprints include material assertion data and loaded shell owners", () => {
  assert(corePlanningInputs.includes("attribution.yml"));
  for (const file of ["canvas-shell.css", "canvas-shell.js"]) assert(conditioningInputs.some((input) => input.endsWith(file)));
});

test("CLI value options stop at admission when their value is absent", () => {
  for (const option of ["--case", "--family", "--mode", "--output"]) {
    for (const args of [["--plan", option], [option, "--plan"]]) {
      const result = spawnSync(process.execPath, ["tools/table-reading-contract.mjs", ...args], {
        cwd: new URL("../../", import.meta.url), encoding: "utf8", timeout: 10000,
      });
      assert.ifError(result.error);
      assert.equal(result.status, 1, args.join(" "));
      assert(result.stderr.includes(`${option} requires a value`));
      assert.equal(result.stdout, "", "admission finishes before a plan or browser campaign starts");
    }
  }
});

test("overlapping requests share one capture across a controlled source change", async (t) => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "evidence-overlap-")));
  const file = path.join(root, "source.html");
  const readFile = fs.readFile.bind(fs);
  let entered;
  let release;
  const firstRead = new Promise((resolve) => { entered = resolve; });
  const gate = new Promise((resolve) => { release = resolve; });
  let reads = 0;
  try {
    await fs.writeFile(file, "A");
    t.mock.method(fs, "readFile", async (...args) => {
      const bytes = await readFile(...args);
      if (args[0] === file && ++reads === 1) { entered(); await gate; }
      return bytes;
    });
    const snapshot = inputSnapshot(root);
    const first = snapshot.bytes("source.html");
    await firstRead;
    await fs.writeFile(file, "B");
    const second = snapshot.bytes("source.html");
    const hash = snapshot.hash("source.html");
    release();
    const [a, b, observed] = await Promise.all([first, second, hash]);
    assert.equal(reads, 1, "one pending capture owns every overlapping request");
    assert.strictEqual(a, b);
    assert.equal(a.toString(), "A");
    assert.equal(observed, digest("A"));
    assert.equal(snapshot.metrics.uniqueReads, 1);
    await fs.writeFile(file, "A");
    assert(await snapshot.agrees({ "source.html": observed }, true));
  } finally { release(); await fs.rm(root, { recursive: true, force: true }); }
});

test("each dependency perturbation reopens evidence while served bytes stay frozen", async () => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "evidence-inputs-")));
  try {
    const files = ["attribution.yml", "canvas-shell.css", "canvas-shell.js", "source.html", "helper.mjs", "runtime", "parameters.json"];
    for (const file of files) await fs.writeFile(path.join(root, file), "original");
    const snapshot = inputSnapshot(root);
    const hashes = await snapshot.fingerprints(files);
    const store = await openCheckpoints(path.join(root, "cases"));
    await store.write("case", "definition", hashes, { standing: "pass" });
    for (const file of files) {
      await fs.writeFile(path.join(root, file), "changed");
      assert.equal(await store.read("case", "definition", (deps) => snapshot.agrees(deps, true)), null, file);
      assert.equal((await snapshot.bytes(file)).toString(), "original", "served snapshot retains its identity");
      await fs.writeFile(path.join(root, file), "original");
    }
    await fs.writeFile(path.join(root, "unrelated"), "changed");
    assert.deepEqual(await store.read("case", "definition", (deps) => snapshot.agrees(deps, true)), { standing: "pass" });
    assert.equal(await store.read("case", "new-definition", () => true), null);
    assert.equal(snapshot.metrics.uniqueReads, files.length);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("campaign publication requires exact population and current required artifacts", async () => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "evidence-generation-")));
  const artifact = path.join(root, "capture.png");
  try {
    await fs.writeFile(artifact, "image");
    const record = { id: "case", signature: "v3", dependencies: { "capture.png": digest("image") }, result: { standing: "pass" } };
    const snapshot = inputSnapshot(root);
    const validate = ({ dependencies }) => snapshot.agrees(dependencies, true);
    for (const records of [[], [record, record], [{ ...record, id: "other" }], [{ ...record, result: { standing: "incomplete" } }]]) {
      await assert.rejects(publishCampaign(root, ["case"], records, validate));
    }
    await assert.rejects(fs.readFile(path.join(root, "completion.json")), { code: "ENOENT" });
    const published = await publishCampaign(root, ["case"], [record], validate);
    assert.equal(published.standing, "pass");
    const bytes = await fs.readFile(path.join(root, published.generation));
    assert.equal(digest(bytes), published.sha256);
    await fs.rm(artifact);
    await assert.rejects(publishCampaign(root, ["case"], [record], validate), /Inputs and artifacts/u);
    const pointer = JSON.parse(await fs.readFile(path.join(root, "completion.json"), "utf8"));
    assert.equal(pointer.sha256, published.sha256, "prior complete generation remains recoverable");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("material inspection distinguishes exact-row parity and real state transitions", () => {
  const prompt = "### Evidence basis\n### Scope and open questions\n### Review and receiving decision";
  const valid = { prompt, authored: prompt, inspectorVisible: true,
    state: { selectedRungId: "rung-5", activeView: "inspector", lastAction: { kind: "open-inspector", recordId: "rung-5" } } };
  assertSelectedInspection(valid);
  for (const changes of [{ authored: "another row" }, { inspectorVisible: false },
    { state: { ...valid.state, selectedRungId: "rung-4" } }, { state: { ...valid.state, activeView: "ladder" } },
    { state: { ...valid.state, lastAction: { kind: "select-rung", recordId: "rung-5" } } }]) {
    assert.throws(() => assertSelectedInspection({ ...valid, ...changes }));
  }
});

test("an interrupted successor retains the complete generation's screenshot bytes", async (t) => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "evidence-captures-")));
  try {
    const original = await publishScreenshot(root, Buffer.from("first capture"));
    const record = { id: "case", signature: "v3", dependencies: { [path.relative(root, original.file)]: original.sha256 }, result: { standing: "pass" } };
    const snapshot = inputSnapshot(root);
    const validate = ({ dependencies }) => snapshot.agrees(dependencies, true);
    const published = await publishCampaign(root, ["case"], [record], validate);
    const nextBytes = Buffer.from("successor capture");
    const writeFile = fs.writeFile.bind(fs);
    let interrupt = true;
    t.mock.method(fs, "writeFile", async (filename, bytes, options) => {
      if (interrupt && filename.endsWith(".tmp") && path.dirname(filename) === path.join(root, "screenshots")) {
        interrupt = false;
        await writeFile(filename, Buffer.from(bytes).subarray(0, 4), options);
        throw new Error("Interrupted temporary screenshot write");
      }
      return writeFile(filename, bytes, options);
    });
    await assert.rejects(publishScreenshot(root, nextBytes), /Interrupted temporary/u);
    await assert.rejects(fs.readFile(path.join(root, "screenshots", `${digest(nextBytes)}.png`)), { code: "ENOENT" });
    assert(await validate(record), "an interrupted write preserves the earlier generation");
    // A hard process interruption may retain a partial temporary file. A retry
    // owns a fresh temporary path and leaves that orphan outside the generation.
    await writeFile(path.join(root, "screenshots", "interrupted.tmp"), "part");
    const successor = await publishScreenshot(root, nextBytes);
    assert.equal(digest(await fs.readFile(successor.file)), successor.sha256);
    assert.notEqual(successor.file, original.file);
    await assert.rejects(publishCampaign(root, ["case"], [record], () => false));
    assert(await validate(record), "the retained generation still resolves its original artifact");
    assert.equal((await fs.readFile(original.file)).toString(), "first capture");
    const pointer = JSON.parse(await fs.readFile(path.join(root, "completion.json"), "utf8"));
    assert.equal(pointer.sha256, published.sha256);
    assert.deepEqual(await publishScreenshot(root, Buffer.from("first capture")), original);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

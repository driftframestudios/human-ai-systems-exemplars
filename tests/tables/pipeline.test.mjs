import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { executionPlan, inputSnapshot, publishCampaign, publishScreenshot } from "../../tools/evidence-campaign.mjs";
import { conditioningInputs, corePlanningInputs } from "../../tools/evidence-inputs.mjs";
import { digest, openCheckpoints, withCheckpointLock } from "../../tools/observation-checkpoint.mjs";
import { assertSelectedInspection } from "./conditioning.browser.mjs";
import { harnessSources, invocationCounts, publishTableObservation } from "../../tools/table-reading-contract.mjs";
import { runAcceptanceCases } from "../../tools/table-focused-acceptance.mjs";

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

test("every resumable campaign fingerprints runtime policy changes", async () => {
  const repository = path.resolve(import.meta.dirname, "../..");
  const runtimeFiles = ["tools/node-runtime-admission.mjs", "tools/check-node-runtime.mjs"];
  const routes = new Map([
    ["table-reading", harnessSources], ["core-planning", corePlanningInputs], ["conditioning", conditioningInputs],
  ]);
  // Read the browser campaigns' literal definitions while their execution remains separate.
  for (const [file, name] of [
    ["tests/core-architectures/recovery-import.browser.mjs", "definitions"],
    ["tests/core-architectures/jobs-text.browser.mjs", "definitions"],
    ["tests/tables/hiring-schema-print.browser.mjs", "definitions"],
    ["tests/tables/core-followthrough/browser.mjs", "definitionFiles"],
  ]) {
    const source = await fs.readFile(path.join(repository, file), "utf8");
    const declaration = source.match(new RegExp(String.raw`const ${name} = \[([\s\S]*?)\];`, "u"));
    assert(declaration, `${file} retains an inspectable input definition`);
    routes.set(file, [...declaration[1].matchAll(/"([^"\n]+)"/gu)].map(match => match[1]));
  }
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "runtime-fingerprints-")));
  try {
    const files = new Set([...routes.values()].flat());
    for (const file of files) {
      await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await fs.writeFile(path.join(root, file), "original");
    }
    const store = await openCheckpoints(path.join(root, "checkpoints"));
    const signatures = new Map();
    for (const [route, inputs] of routes) {
      for (const file of runtimeFiles) assert(inputs.includes(file), `${route} fingerprints ${file}`);
      const dependencies = await inputSnapshot(root).fingerprints(inputs);
      const signature = digest(JSON.stringify(dependencies));
      signatures.set(route, signature);
      await store.write(route, signature, dependencies, { standing: "pass" });
    }
    await fs.writeFile(path.join(root, "unrelated-review-note.md"), "changed");
    const agrees = dependencies => inputSnapshot(root).agrees(dependencies, true);
    for (const [route, signature] of signatures) {
      assert.deepEqual(await store.read(route, signature, agrees), { standing: "pass" }, route);
    }
    for (const file of runtimeFiles) {
      await fs.writeFile(path.join(root, file), "updated runtime policy");
      for (const [route, inputs] of routes) {
        const next = digest(JSON.stringify(await inputSnapshot(root).fingerprints(inputs)));
        assert.notEqual(next, signatures.get(route), `${route} reopens when ${file} changes`);
        assert.equal(await store.read(route, signatures.get(route), agrees), null, route);
      }
      await fs.writeFile(path.join(root, file), "original");
    }
  } finally { await fs.rm(root, { recursive: true, force: true }); }
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

for (const phase of ["capture", "validation"]) {
  test("late telemetry during " + phase + " retains the prior checkpoint and completion", async () => {
    const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "table-final-telemetry-")));
    try {
      const store = await openCheckpoints(path.join(root, "checkpoints"));
      await fs.writeFile(path.join(root, "capture.png"), "prior image");
      const previous = { id: "case", signature: "prior", dependencies: { "capture.png": digest("prior image") },
        result: { id: "case", standing: "pass", errors: [], observed: 7 } };
      await store.write(previous.id, previous.signature, previous.dependencies, previous.result);
      const snapshot = inputSnapshot(root);
      await publishCampaign(root, ["case"], [previous], record => snapshot.agrees(record.dependencies, true));
      const pointer = await fs.readFile(path.join(root, "completion.json"), "utf8");
      const candidate = { id: "case", signature: "candidate", dependencies: {},
        result: { id: "case", standing: "pass", errors: [], observed: 9 } };
      const visited = [];
      await assert.rejects(publishTableObservation(store, candidate, async () => {
        visited.push("capture");
        await fs.writeFile(path.join(root, "candidate.png"), "new image");
        candidate.dependencies["candidate.png"] = digest("new image");
        if (phase === "capture") candidate.result.errors.push("late capture error");
        visited.push("validation");
        assert(await snapshot.agrees(candidate.dependencies, true));
        if (phase === "validation") candidate.result.errors.push("late validation error");
      }), /Final case telemetry/);
      assert.deepEqual(visited, ["capture", "validation"]);
      assert.deepEqual(await store.read("case", "prior", deps => snapshot.agrees(deps, true)), previous.result);
      assert.equal(await store.read("case", "candidate", () => true), null);
      assert.equal(await fs.readFile(path.join(root, "completion.json"), "utf8"), pointer);
      assert.equal(await fs.readFile(path.join(root, "capture.png"), "utf8"), "prior image");
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });
}

for (const phase of ["before artifacts", "during validation"]) {
  test("controlled cancellation " + phase + " releases the lock without publishing a successor", async () => {
    const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "table-cancel-")));
    try {
      const store = await openCheckpoints(path.join(root, "checkpoints"));
      const previous = { id: "case", signature: "prior", dependencies: {}, result: { standing: "review", observed: 7 } };
      await store.write(previous.id, previous.signature, previous.dependencies, previous.result);
      await publishCampaign(root, ["case"], [previous], async () => true, { scope: { mode: "discovery" } });
      const pointer = await fs.readFile(path.join(root, "completion.json"), "utf8");
      const controller = new AbortController(), reason = new Error("Requested stop");
      if (phase === "before artifacts") controller.abort(reason);
      let entered = false;
      const filename = path.join(root, "campaign.lock");
      const candidate = { id: "case", signature: "next", dependencies: {}, result: { standing: "pass", errors: [] } };
      await assert.rejects(withCheckpointLock(filename, { phase }, () =>
        publishTableObservation(store, candidate, async () => {
          entered = true;
          await Promise.resolve();
          controller.abort(reason);
        }, { signal: controller.signal })), error => error === reason);
      assert.equal(entered, phase === "during validation");
      await assert.rejects(fs.access(filename), { code: "ENOENT" });
      assert.deepEqual(await store.read("case", "prior", () => true), previous.result);
      assert.equal(await store.read("case", "next", () => true), null);
      assert.equal(await fs.readFile(path.join(root, "completion.json"), "utf8"), pointer);
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });
}

test("clear final telemetry permits publication after the complete artifact callback", async () => {
  const events = [];
  const record = { id: "case", signature: "current", dependencies: {}, result: { standing: "pass", errors: [] } };
  await publishTableObservation({ async write(id, signature, dependencies, result) {
    events.push("write");
    assert.equal(id, "case");
    assert.equal(signature, "current");
    assert.deepEqual(dependencies, { image: "validated" });
    assert.strictEqual(result, record.result);
  } }, record, async () => {
    events.push("artifacts");
    await Promise.resolve();
    record.dependencies.image = "validated";
    events.push("validation");
  });
  assert.deepEqual(events, ["artifacts", "validation", "write"]);
});

test("all-reused observations retain prior standing while recording zero new attempts", () => {
  const cases = [{ id: "a", attempted: true, standing: "pass" }, { id: "b", attempted: true, standing: "review" }];
  assert.deepEqual(invocationCounts(cases, new Set(), new Set(["a", "b"]), ["a", "b"]),
    { attemptedCases: 0, newCases: 0, reused: 2, unrunCaseIds: [] });
  assert.deepEqual(cases.map(item => item.standing), ["pass", "review"]);
});

test("new, reused, unrun and failed-preparation work keep distinct invocation counts", () => {
  const cases = [{ id: "old", attempted: true, standing: "pass" },
    { id: "new", attempted: true, standing: "review" },
    { id: "later", attempted: false, standing: "incomplete" }];
  assert.deepEqual(invocationCounts(cases, new Set(["new"]), new Set(["old"]), ["old", "new", "later"]),
    { attemptedCases: 1, newCases: 1, reused: 1, unrunCaseIds: ["later"] });
  assert.deepEqual(invocationCounts([], new Set(["preparation-failed"]), new Set(), ["preparation-failed"]),
    { attemptedCases: 1, newCases: 1, reused: 0, unrunCaseIds: [] });
});

test("between-case cancellation counts the dispatcher rejection and leaves later work unrun", async () => {
  const selected = [{ id: "first" }, { id: "second" }, { id: "third" }];
  const cases = [], attempted = new Set(), reused = new Set();
  const controller = new AbortController();
  const reason = new Error("Stop between cases");
  const stopped = await runAcceptanceCases(selected, async ({ id }) => {
    controller.signal.throwIfAborted();
    attempted.add(id);
    const result = { id, standing: "pass", attempted: true };
    cases.push(result);
    controller.abort(reason);
    return result;
  }, async result => { cases.push(result); });
  assert.equal(stopped, "second");
  assert.deepEqual([...attempted], ["first"], "cancellation rejects before the case-local attempt marker");
  assert.deepEqual(cases.map(({ id, standing, attempted }) => ({ id, standing, attempted })), [
    { id: "first", standing: "pass", attempted: true },
    { id: "second", standing: "incomplete", attempted: true },
    { id: "third", standing: "incomplete", attempted: false },
  ]);
  assert.equal(cases[1].error, "Stop between cases");
  assert.deepEqual(invocationCounts(cases, attempted, reused, ["first", "second", "third"]),
    { attemptedCases: 2, newCases: 2, reused: 0, unrunCaseIds: ["third"] });
});

test("pre-loop cancellation accounts for every selected case as unrun", async () => {
  const selected = [{ id: "first" }, { id: "second" }];
  const cases = [], attempted = new Set(), reused = new Set();
  const controller = new AbortController(), reason = new Error("Stop before dispatch");
  controller.abort(reason);
  await assert.rejects(async () => {
    controller.signal.throwIfAborted();
    await runAcceptanceCases(selected, async () => {
      assert.fail("cancelled selection must not enter a case");
    }, async result => { cases.push(result); });
  }, error => error === reason);
  assert.deepEqual(cases, []);
  assert.deepEqual(invocationCounts(cases, attempted, reused, ["first", "second"]),
    { attemptedCases: 0, newCases: 0, reused: 0, unrunCaseIds: ["first", "second"] });
});

test("the campaign owner wires final artifact validation, lock scope and cooperative signal cleanup", async () => {
  const source = await fs.readFile(new URL("../../tools/table-reading-contract.mjs", import.meta.url), "utf8");
  assert.match(source, /return withCheckpointLock\(lockPath/);
  assert.match(source, /await publishTableObservation\(checkpoints, record/);
  assert.match(source, /await closeContext\(\);\s*if \(journey\) assertAcceptanceRecord/);
  assert.match(source, /counts = invocationCounts\(cases, attemptedCaseIds, reusedCaseIds, campaign.expected\)/);
  for (const event of ["SIGINT", "SIGTERM"]) {
    assert(source.includes('process.on("' + event + '"'));
    assert(source.includes('process.removeListener("' + event + '"'));
  }
});

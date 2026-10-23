import './node-runtime-admission.mjs';

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { sha, signature, opportunities, material, parity, assertApproval, summarize } from "./core.mjs";

const exec = promisify(execFile);
const root = path.dirname(fileURLToPath(import.meta.url));
const local = path.join(root, ".local");
const app = path.join(local, "app");
const browserRoot = path.join(local, "browsers");
const output = path.join(app, ".visual-runs/paired-replay-02");
const seedDirectory = path.join(local, "seed");
const protocol = JSON.parse(await fs.readFile(path.join(root, "protocol.json"), "utf8"));
const bundleFiles = [".gitignore", "README.md", "PROTOCOL.md", "protocol.json", "check-node-runtime.mjs",
  "node-runtime-admission.mjs", "core.mjs", "worker.mjs", "replay.mjs", "replay.test.mjs",
  "faults.json", "runner-path.test.mjs"];
const args = process.argv.slice(2);
const command = args.shift();
function option(name, fallback = null) {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  assert(args[i + 1] && !args[i + 1].startsWith("--"), name + " requires a value");
  return args[i + 1];
}
const exists = async (file) => fs.access(file).then(() => true, () => false);
const read = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
async function write(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = file + ".tmp";
  await fs.writeFile(temp, JSON.stringify(value, null, 2) + "\n");
  await fs.rename(temp, file);
}
const relativeOutput = ".visual-runs/paired-replay-02";
const env = () => ({ ...process.env, PLAYWRIGHT_BROWSERS_PATH: browserRoot, TZ: "UTC", LANG: "en_US.UTF-8" });
async function bundleHash() {
  const entries = [];
  for (const file of bundleFiles) entries.push([file, sha(await fs.readFile(path.join(root, file)))]);
  return signature(entries);
}
async function inventory(directory, excluded = []) {
  const entries = [];
  const base = await fs.realpath(directory);
  async function visit(prefix) {
    for (const name of (await fs.readdir(path.join(directory, prefix))).sort()) {
      if (!prefix && excluded.includes(name)) continue;
      const relative = prefix ? prefix + "/" + name : name;
      const absolute = path.join(directory, relative);
      const stat = await fs.lstat(absolute);
      if (stat.isDirectory()) await visit(relative);
      else if (stat.isSymbolicLink()) {
        const actual = await fs.realpath(absolute);
        assert(actual.startsWith(base + path.sep), "Fixture symlink retains local ownership");
        entries.push({ file: relative, link: await fs.readlink(absolute) });
      } else {
        assert(stat.isFile(), "Fixture contains ordinary files");
        const bytes = await fs.readFile(absolute);
        entries.push({ file: relative, bytes: bytes.length, sha256: sha(bytes), mode: stat.mode & 0o777 });
      }
    }
  }
  await visit("");
  return entries;
}
const sourceInventory = () => inventory(app, ["node_modules", ".visual-runs", ".git"]);
async function runtime() {
  const result = await exec(process.execPath, [path.join(root, "worker.mjs"), "runtime", app],
    { env: env(), timeout: 30000 });
  const value = JSON.parse(result.stdout.trim());
  const executableStat = await fs.stat(value.executable);
  const browserExecutable = path.relative(browserRoot, value.executable);
  assert(!browserExecutable.startsWith(".."), "Browser installation belongs to the fixture");
  delete value.executable;
  return {
    ...value, nodeExecutableHash: sha(await fs.readFile(process.execPath)), nodeVersions: process.versions,
    osRelease: os.release(), cpuModel: os.cpus()[0]?.model ?? "unknown", cpuCount: os.cpus().length,
    timezone: "UTC", language: "en_US.UTF-8", browserExecutable,
    browserExecutableSize: executableStat.size, browserExecutableMtimeMs: executableStat.mtimeMs,
    dependenciesHash: signature(await inventory(path.join(app, "node_modules"))),
    browsersHash: signature(await inventory(browserRoot)),
  };
}
async function event(category, causalEventId, detail) {
  await fs.appendFile(path.join(local, "events.jsonl"), JSON.stringify({
    category, causalEventId, recordedAt: new Date().toISOString(), ...detail,
  }) + "\n");
}
async function prepare() {
  const started = performance.now();
  assert.equal(await exists(path.join(local, "prepared.json")), false, "A preparation already exists; use freeze or resume");
  assert.equal(await exists(app), false, "A partial preparation stays available for review in .local/app");
  const repo = path.resolve(option("--application-repo", process.cwd()));
  const dependencies = path.resolve(option("--dependencies", path.join(repo, "node_modules")));
  await fs.mkdir(app, { recursive: true });
  const archive = path.join(local, "application.tar");
  try {
    const commit = await exec("git", ["rev-parse", protocol.applicationRevision + "^{commit}"], { cwd: repo });
    assert.equal(commit.stdout.trim(), protocol.applicationRevision);
    await exec("git", ["archive", "--format=tar", "--output=" + archive, protocol.applicationRevision],
      { cwd: repo, timeout: 60000 });
    await exec("tar", ["-xf", archive, "-C", app], { timeout: 60000 });
    await fs.rm(archive);
    const locked = await read(path.join(app, "package-lock.json"));
    const installed = await read(path.join(dependencies, ".package-lock.json"));
    for (const [key, info] of Object.entries(installed.packages ?? {})) {
      assert(locked.packages[key], "Installed package appears in the pinned lock: " + key);
      assert.equal(info.version, locked.packages[key].version, "Installed package version agrees: " + key);
      if (locked.packages[key].integrity) assert.equal(info.integrity, locked.packages[key].integrity, "Installed package integrity agrees: " + key);
    }
    await fs.cp(dependencies, path.join(app, "node_modules"),
      { recursive: true, dereference: true, preserveTimestamps: true });
    const current = await exec(process.execPath, [path.join(root, "worker.mjs"), "runtime", app],
      { timeout: 30000 });
    let browserDirectory = JSON.parse(current.stdout.trim()).executable;
    while (!/^chromium-\d+$/u.test(path.basename(browserDirectory))) {
      const parent = path.dirname(browserDirectory);
      assert.notEqual(parent, browserDirectory, "Existing Playwright Chromium installation is identifiable");
      browserDirectory = parent;
    }
    const browserCache = path.dirname(browserDirectory);
    await fs.mkdir(browserRoot, { recursive: true });
    for (const name of await fs.readdir(browserCache)) {
      if (/^(chromium[-_]|ffmpeg-)/u.test(name)) await fs.cp(path.join(browserCache, name), path.join(browserRoot, name),
        { recursive: true, verbatimSymlinks: true, preserveTimestamps: true });
    }
    const source = await sourceInventory();
    await write(path.join(local, "prepared.json"), {
      applicationRevision: protocol.applicationRevision, source, sourceHash: signature(source),
      setupMilliseconds: performance.now() - started,
    });
    await event("setup", "prepare", { standing: "complete", elapsedMilliseconds: performance.now() - started, browserLaunches: 0 });
    console.log(JSON.stringify({ standing: "prepared", sourceHash: signature(source), browserLaunches: 0 }));
  } catch (error) {
    await event("setup", "prepare", { standing: "failed", elapsedMilliseconds: performance.now() - started, error: error.message });
    throw error;
  }
}
async function expectedSource(scenario) {
  const prepared = await read(path.join(local, "prepared.json"));
  const expected = structuredClone(prepared.source);
  if (scenario.file) {
    const entry = expected.find((item) => item.file === scenario.file);
    assert(entry, "Perturbation owner belongs to the pinned source");
    const original = await fs.readFile(path.join(local, "baseline", scenario.id));
    const changed = Buffer.concat([original, Buffer.from(scenario.suffix)]);
    entry.sha256 = sha(changed);
    entry.bytes = changed.length;
  }
  return expected;
}
async function setScenario(scenario) {
  for (const candidate of protocol.scenarios.filter((s) => s.file)) {
    await fs.copyFile(path.join(local, "baseline", candidate.id), path.join(app, candidate.file));
  }
  if (scenario.file) await fs.appendFile(path.join(app, scenario.file), scenario.suffix);
  assert.equal(signature(await sourceInventory()), signature(await expectedSource(scenario)), "Exact pinned post-change source");
}
async function freeze() {
  const freezeStart = performance.now();
  assert.equal(await exists(path.join(local, "frozen.json")), false, "The existing protocol remains frozen");
  const prepared = await read(path.join(local, "prepared.json"));
  assert.equal(signature(await sourceInventory()), prepared.sourceHash, "Preparation retains the pinned tree");
  await fs.mkdir(path.join(local, "baseline"), { recursive: true });
  for (const scenario of protocol.scenarios.filter((s) => s.file)) {
    await fs.copyFile(path.join(app, scenario.file), path.join(local, "baseline", scenario.id));
  }
  const planned = await exec(process.execPath, [path.join(root, "worker.mjs"), "plan", app],
    { env: env(), timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
  const plan = JSON.parse(planned.stdout.trim());
  assert.equal(plan.cases.length, protocol.expected.prototypeCases);
  for (const [family, count] of Object.entries(protocol.expected.familyCases)) {
    assert.equal(plan.cases.filter((c) => c.family.id === family).length, count);
  }
  const schedule = opportunities(protocol, plan.expected);
  const scenarios = [];
  for (const scenario of protocol.scenarios) scenarios.push({ id: scenario.id, sourceHash: signature(await expectedSource(scenario)) });
  const frozen = {
    version: 1, createdAt: new Date().toISOString(), applicationRevision: protocol.applicationRevision,
    bundleHash: await bundleHash(), runtime: await runtime(), sourceHash: prepared.sourceHash,
    observationVersion: plan.observationVersion, plan, schedule, scenarios,
    budgetMilliseconds: protocol.measuredBudgetMilliseconds,
  };
  await write(path.join(local, "frozen.json"), frozen);
  await write(path.join(local, "approval.example.json"), {
    frozenHash: signature(frozen), bundleHash: frozen.bundleHash, reviewer: "",
    approvedAt: null, independentFaultAdjudication: false,
    authorizeBrowserExecution: false, contention: "unrecorded",
  });
  await event("setup", "freeze", { standing: "prospectively-frozen", frozenHash: signature(frozen), elapsedMilliseconds: performance.now() - freezeStart, browserLaunches: 0 });
  console.log(JSON.stringify({ standing: "awaiting-parent-review", frozenHash: signature(frozen), bundleHash: frozen.bundleHash,
    expected: protocol.expected, browserLaunches: 0 }));
}

let activeChild = null;
let interrupted = false;
let runningState = null;
function retainCancellation(state) {
  if (interrupted) {
    state.interrupted = true;
    state.stop ??= "interrupted";
  }
  return interrupted;
}
function requireActiveSession() {
  assert(!interrupted, "Cancellation stops this opportunity");
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  interrupted = true;
  if (runningState) retainCancellation(runningState);
  if (activeChild) {
    try { process.kill(-activeChild.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
  }
});
async function childRun(id, policy, deadline) {
  assert(!interrupted, "Execution retains an active session");
  assert(deadline > performance.now(), "Declared browser budget remains");
  const directory = path.join(local, "runs", id);
  await fs.mkdir(directory, { recursive: true });
  const stdout = await fs.open(path.join(directory, "stdout.jsonl"), "wx");
  const stderr = await fs.open(path.join(directory, "stderr.log"), "wx");
  const workerReceipt = path.join(directory, "worker.json");
  const began = performance.now();
  let timedOut = false;
  let outcome;
  try {
    outcome = await new Promise((resolve, reject) => {
      // Preparation and execution draw from the same absolute deadline.
      requireActiveSession();
      const milliseconds = Math.floor(deadline - performance.now());
      assert(milliseconds > 0, "Declared browser budget remains immediately before spawn");
      const child = spawn(process.execPath, [path.join(root, "worker.mjs"), "run", app, workerReceipt, policy],
        { env: env(), cwd: app, detached: true, stdio: ["ignore", stdout.fd, stderr.fd] });
      activeChild = child;
      const timer = setTimeout(() => {
        timedOut = true;
        try { process.kill(-child.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") reject(error); }
      }, Math.max(0, deadline - performance.now()));
      child.once("error", (error) => { clearTimeout(timer); reject(error); });
      child.once("close", (code, signal) => { clearTimeout(timer); resolve({ code, signal }); });
    });
  } finally {
    activeChild = null;
    await stdout.close(); await stderr.close();
  }
  const elapsedMilliseconds = performance.now() - began;
  const raw = { ...outcome, elapsedMilliseconds, timedOut, interrupted };
  await write(path.join(directory, "process.json"), raw);
  assert(!timedOut && !interrupted, "Budget or interruption stops this opportunity");
  assert.equal(outcome.code, 0, "Campaign completes with passing evidence; inspect the local attempt");
  const summary = await read(path.join(output, "summary.json"));
  assert.equal(summary.executionError, null);
  assert.equal(summary.incomplete, 0);
  assert.equal(summary.review, 0);
  assert.equal(summary.pass, protocol.expected.population);
  assert(summary.completion, "Current invocation published a complete generation");
  const pointer = await read(path.join(output, "completion.json"));
  assert.equal(pointer.sha256, summary.completion.sha256);
  const bytes = await fs.readFile(path.join(output, pointer.generation));
  assert.equal(sha(bytes), pointer.sha256, "Generation identity");
  const generation = JSON.parse(bytes);
  assert.equal(generation.metadata.definition, summary.definition);
  const metrics = await read(workerReceipt);
  const lines = (await fs.readFile(path.join(directory, "stdout.jsonl"), "utf8")).split("\n").filter(Boolean)
    .map((line) => JSON.parse(line));
  const fresh = lines.filter((line) => line.case && line.standing !== "reused").map((line) => line.case);
  assert.equal(fresh.length, summary.newCases, "Every fresh attempt has a completion");
  const normalized = {
    childWallMilliseconds: elapsedMilliseconds, fresh, reused: summary.reused,
    browserLaunches: { value: summary.browserLaunches, standing: "exact" },
    documentNavigations: { value: summary.documentNavigations, standing: "exact" },
    caseAttempts: { value: fresh.length, standing: "exact-completed-invocation" },
    caseCompletions: { value: fresh.length, standing: "exact" },
    stages: summary.stages, hashing: summary.hashing, ...metrics,
  };
  await fs.copyFile(path.join(output, "summary.json"), path.join(directory, "summary.json"));
  await write(path.join(directory, "generation.json"), generation);
  await write(path.join(directory, "measurements.json"), normalized);
  requireActiveSession();
  return { generation, normalized };
}
async function validateReceiving(generation, frozen, scenario) {
  assert.deepEqual(generation.expected, frozen.plan.expected);
  const expectedArtifacts = new Set(frozen.plan.cases.filter((c) =>
    c.width === 390 && c.media === "screen" && c.script && !c.enlarged).map((c) => c.id));
  const cases = new Map(frozen.plan.cases.map((c) => [c.id, c]));
  const definitionFiles = [
    "tools/table-reading-contract.mjs", "tools/table-reading-observer.mjs", "tools/observation-checkpoint.mjs",
    "tools/evidence-campaign.mjs", "tools/core-architecture-browser-helper.mjs", "tools/attribution-contract.mjs",
    "tools/package-v1-iframe-routes.mjs", "tools/iframe-route-package-engine.mjs", "tools/package-iframe-routes.mjs",
    "tools/package-canvas-iframe-routes.mjs", "tools/project-investment-analysis.mjs",
    "context-canvas-project-surface/context-canvas/visitor-boundary-contract.js", "attribution.yml", "package-lock.json",
  ];
  const source = new Map((await expectedSource(scenario)).map((entry) => [entry.file, entry.sha256]));
  for (const record of generation.records) {
    for (const file of definitionFiles) assert.equal(record.dependencies[file], source.get(file), "Required executable dependency");
    const item = cases.get(record.id);
    if (item) {
      const owners = [item.family.source, item.parent ? item.family.parent :
        item.variant === "projection" ? item.family.projection : null].filter(Boolean);
      for (const owner of owners) assert.equal(record.dependencies[owner], source.get(owner), "Required family owner");
    }
    const artifacts = Object.entries(record.dependencies).filter(([key]) => key.startsWith(".visual-runs/"));
    assert.equal(artifacts.length, expectedArtifacts.has(record.id) ? 1 : 0, "Required artifact population");
    for (const [key, expected] of artifacts) {
      assert(key.startsWith(relativeOutput + "/screenshots/") && !key.includes(".."), "Local screenshot owner");
      assert.equal(sha(await fs.readFile(path.join(app, key))), expected, "Current required screenshot");
    }
  }
  material(generation);
}
async function restoreSeed(seedHash) {
  const start = performance.now();
  await fs.rm(output, { recursive: true, force: true });
  await fs.cp(seedDirectory, output, { recursive: true, preserveTimestamps: true });
  assert.equal(signature(await inventory(output)), seedHash, "Byte-equivalent deliberately prepared checkpoint");
  return performance.now() - start;
}
async function measure() {
  const frozen = await read(path.join(local, "frozen.json"));
  assert.equal(await bundleHash(), frozen.bundleHash, "Reviewed bundle remains frozen");
  const approvalFile = option("--approval");
  assert(approvalFile, "Parent review supplies --approval <local-file>");
  const approval = await read(path.resolve(approvalFile));
  assertApproval(approval, frozen);
  assert.deepEqual(await runtime(), frozen.runtime, "Frozen runtime remains identical");
  const lock = path.join(local, "runner.lock");
  await fs.writeFile(lock, JSON.stringify({ pid: process.pid }) + "\n", { flag: "wx" });
  const stateFile = path.join(local, "state.json");
  let state = await exists(stateFile) ? await read(stateFile) : {
    frozenHash: signature(frozen), pairs: [], sessions: [], measuredMilliseconds: 0, started: false,
  };
  runningState = state;
  let phaseStart = null;
  let phaseBase = state.measuredMilliseconds;
  try {
    retainCancellation(state);
    requireActiveSession();
    assert.equal(state.frozenHash, signature(frozen));
    assert(!state.stop, "A stopped epoch returns to independent review");
    if (state.active) {
      state.stop = "interrupted-opportunity";
      state.measuredMilliseconds = protocol.measuredBudgetMilliseconds;
      await write(stateFile, state);
      throw new Error("Interrupted opportunity retained; a new reviewed epoch owns another attempt");
    }
    if (state.pairs.length === frozen.schedule.length) {
      return;
    }
    const limit = Number(option("--pairs", String(frozen.schedule.length)));
    assert(Number.isInteger(limit) && limit > 0 && limit <= frozen.schedule.length, "Bounded positive opportunity count");
    if (!state.seed) {
      state.active = { category: "checkpoint-seed", id: "seed", policy: "full" };
      await write(stateFile, state);
      const deadline = performance.now() + protocol.preparationBrowserBudgetMilliseconds;
      await setScenario(protocol.scenarios[0]);
      await fs.rm(output, { recursive: true, force: true });
      const seedStart = performance.now();
      const seed = await childRun("seed", "full", deadline);
      await validateReceiving(seed.generation, frozen, protocol.scenarios[0]);
      await fs.cp(output, seedDirectory, { recursive: true, preserveTimestamps: true });
      state.seed = { hash: signature(await inventory(seedDirectory)),
        material: signature(material(seed.generation)), measurements: seed.normalized };
      await event("checkpoint-seed", "seed", { elapsedMilliseconds: performance.now() - seedStart, measurements: seed.normalized });
      await restoreSeed(state.seed.hash);
      state.active = { category: "warmup", id: "warmup", policy: "full" };
      await write(stateFile, state);
      const warm = await childRun("warmup", "full", deadline);
      await validateReceiving(warm.generation, frozen, protocol.scenarios[0]);
      parity(seed.generation, warm.generation, warm.generation);
      await event("warmup", "warmup", { elapsedMilliseconds: warm.normalized.childWallMilliseconds, measurements: warm.normalized });
      state.warmup = warm.normalized;
      state.active = null;
      await write(stateFile, state);
    }
    const seed = await read(path.join(local, "runs/seed/generation.json"));
    state.started = true;
    state.sessions.push({ index: state.sessions.length + 1, startedAt: new Date().toISOString(),
      cache: state.sessions.length ? "resumed-session-uncontrolled-host-cache" : "seed-and-warmup-preceded" });
    phaseBase = state.measuredMilliseconds;
    phaseStart = performance.now();
    const deadline = phaseStart + protocol.measuredBudgetMilliseconds - phaseBase;
    const chosen = frozen.schedule.slice(state.pairs.length, state.pairs.length + limit);
    for (const opportunity of chosen) {
      assert(performance.now() < deadline && !interrupted, "Measured budget remains");
      const scenario = protocol.scenarios.find((s) => s.id === opportunity.scenario);
      state.active = { id: opportunity.id, reservedMilliseconds: protocol.measuredBudgetMilliseconds - state.measuredMilliseconds };
      await write(stateFile, state);
      const definitionStart = performance.now();
      await setScenario(scenario);
      await event("definition-change", opportunity.id, { elapsedMilliseconds: performance.now() - definitionStart });
      const observations = {};
      for (const policy of opportunity.order) {
        state.active.policy = policy;
        await write(stateFile, state);
        const restorationMilliseconds = await restoreSeed(state.seed.hash);
        const admissionStart = performance.now();
        assert.equal(signature(await sourceInventory()), frozen.scenarios.find((s) => s.id === scenario.id).sourceHash);
        const admissionMilliseconds = performance.now() - admissionStart;
        const result = await childRun(opportunity.id + "-" + policy, policy, deadline);
        await event("measured-execution", opportunity.id, { policy, elapsedMilliseconds: result.normalized.childWallMilliseconds, measurements: result.normalized });
        const observationStart = performance.now();
        await validateReceiving(result.generation, frozen, scenario);
        assert.equal(signature(await sourceInventory()), frozen.scenarios.find((s) => s.id === scenario.id).sourceHash,
          "Source remains fixed through execution");
        const fresh = policy === "full" ? opportunity.expected : opportunity.selected;
        assert.deepEqual(result.normalized.fresh, fresh, "Prospective selected case set agrees");
        assert.equal(result.normalized.reused, opportunity.expected.length - fresh.length);
        assert.equal(result.normalized.browserLaunches.value, fresh.length ? 1 : 0);
        assert.deepEqual(material(result.generation), material(seed), "Semantically unchanged material retains its oracle");
        observations[policy] = result;
        await event("checkpoint-preparation", opportunity.id, { policy, elapsedMilliseconds: restorationMilliseconds });
        await event("observer-work", opportunity.id, { policy, elapsedMilliseconds: admissionMilliseconds + performance.now() - observationStart });
      }
      requireActiveSession();
      const materialHash = parity(seed, observations.full.generation, observations.selected.generation);
      const row = {
        id: opportunity.id, scenario: opportunity.scenario, round: opportunity.round, order: opportunity.order,
        sourceHash: frozen.scenarios.find((s) => s.id === scenario.id).sourceHash,
        definition: observations.full.generation.metadata.definition,
        materialHash, full: observations.full.normalized, selected: observations.selected.normalized,
        differenceMilliseconds: observations.full.normalized.childWallMilliseconds - observations.selected.normalized.childWallMilliseconds,
      };
      state.pairs.push(row);
      state.measuredMilliseconds = phaseBase + performance.now() - phaseStart;
      if (state.measuredMilliseconds >= protocol.measuredBudgetMilliseconds) throw new Error("Measured budget reached");
      state.active = null;
      await write(stateFile, state);
      requireActiveSession();
      console.log(JSON.stringify({ opportunity: row.id, standing: "paired-parity", differenceMilliseconds: row.differenceMilliseconds }));
    }
  } catch (error) {
    if (phaseStart !== null) state.measuredMilliseconds = phaseBase + performance.now() - phaseStart;
    state.stop ??= interrupted ? "interrupted" : state.measuredMilliseconds >= protocol.measuredBudgetMilliseconds ? "budget" : "parity-or-execution-defect";
    const attemptName = state.active?.category ? state.active.id : state.active?.id && state.active?.policy ? state.active.id + "-" + state.active.policy : null;
    const attemptFile = attemptName ? path.join(local, "runs", attemptName, "process.json") : null;
    const failedProcess = attemptFile && await exists(attemptFile) ? await read(attemptFile) : null;
    await event("failed-attempt", state.active?.id ?? "preparation", {
      ownerCategory: state.active?.category ?? "measured-execution", policy: state.active?.policy ?? null,
      childWallMilliseconds: failedProcess?.elapsedMilliseconds ?? null,
      standing: "indeterminate", error: error.message,
      counters: "Successful process receipts remain exact; interrupted process attempts are unmeasured pending local adjudication.",
    });
    state.active = null;
    await write(stateFile, state);
    throw error;
  } finally {
    if (phaseStart !== null) state.measuredMilliseconds = phaseBase + performance.now() - phaseStart;
    retainCancellation(state);
    await write(stateFile, state);
    await fs.rm(lock);
    // Terminal disposition settles after the final asynchronous publication boundary.
    if (retainCancellation(state)) await write(stateFile, state);
    runningState = null;
    console.log(JSON.stringify(summarize(protocol, state)));
  }
}
async function recordCost() {
  await fs.mkdir(local, { recursive: true });
  const category = option("--category");
  const causalEventId = option("--event");
  assert(["harness-development", "harness-repair", "definition-change", "review",
    "ancillary-material-check", "observer-work"].includes(category), "Named separate cost category");
  assert(causalEventId && /^[a-zA-Z0-9_-]{1,100}$/u.test(causalEventId), "Public-safe causal event key");
  const supplied = option("--milliseconds", "unmeasured");
  const elapsedMilliseconds = supplied === "unmeasured" ? null : Number(supplied);
  assert(elapsedMilliseconds === null || Number.isFinite(elapsedMilliseconds) && elapsedMilliseconds >= 0);
  const standing = option("--standing", "complete");
  assert(["complete", "failed"].includes(standing));
  await event(category, causalEventId, { elapsedMilliseconds, standing, observation: "operator-supplied" });
  console.log(JSON.stringify({ category, causalEventId, standing, elapsedMilliseconds }));
}
async function decision() {
  const state = await exists(path.join(local, "state.json")) ? await read(path.join(local, "state.json")) : {};
  const events = await exists(path.join(local, "events.jsonl"))
    ? (await fs.readFile(path.join(local, "events.jsonl"), "utf8")).split("\n").filter(Boolean).map(JSON.parse) : [];
  const accounting = {};
  for (const e of events) {
    const category = accounting[e.category] ??= { entries: 0, measuredMilliseconds: 0, unmeasuredDurations: 0, causalEventIds: [] };
    category.entries += 1;
    if (typeof e.elapsedMilliseconds === "number") category.measuredMilliseconds += e.elapsedMilliseconds;
    else category.unmeasuredDurations += 1;
    if (!category.causalEventIds.includes(e.causalEventId)) category.causalEventIds.push(e.causalEventId);
  }
  const frozen = await exists(path.join(local, "frozen.json")) ? await read(path.join(local, "frozen.json")) : null;
  const result = {
    accounting,
    failedAttempts: events.filter((e) => e.category === "failed-attempt").map((e) => ({
      causalEventId: e.causalEventId, ownerCategory: e.ownerCategory, policy: e.policy,
      childWallMilliseconds: e.childWallMilliseconds, counters: { value: null, standing: "unmeasured" },
    })),
    frozenBundleHash: frozen?.bundleHash ?? null,
    issue: protocol.issue, applicationRevision: protocol.applicationRevision, protocolBundleHash: await bundleHash(),
    ...summarize(protocol, state), rows: state.pairs ?? [],
    setupSeedWarmup: { seed: state.seed?.measurements ?? null, warmup: state.warmup ?? null },
    additionalCostCategories: {
      checkpointPreparation: "local event ledger", observerWork: "local event ledger",
      harnessDevelopment: { value: null, standing: "unmeasured" },
      definitionChanges: { value: null, standing: "unmeasured" },
      review: { value: null, standing: "unmeasured" },
      ancillaryMaterialChecks: { value: null, standing: "unmeasured-in-this-package" },
    },
    interpretation: "Local conditional execution cost; widths remain correlated. Seed amortization and human workload remain separate.",
    nextReceiver: "Parent independent review, then Issues #320 and #278 through parent GitHub coordination",
  };
  console.log(JSON.stringify(result, null, 2));
}

if (command === "plan") console.log(JSON.stringify({
  standing: protocol.standing, applicationRevision: protocol.applicationRevision, expected: protocol.expected,
  measuredBudgetMilliseconds: protocol.measuredBudgetMilliseconds, gate: protocol.reviewGate,
}, null, 2));
else if (command === "prepare") await prepare();
else if (command === "freeze") await freeze();
else if (command === "measure") await measure();
else if (command === "decision") await decision();
else if (command === "record-cost") await recordCost();
else throw new Error("Use plan, prepare, freeze, measure, decision or record-cost");

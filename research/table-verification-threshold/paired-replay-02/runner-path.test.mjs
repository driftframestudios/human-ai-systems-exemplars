import './node-runtime-admission.mjs';

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test, { before, after } from "node:test";
import { sha, signature } from "./core.mjs";

const exec = promisify(execFile);
const root = path.dirname(fileURLToPath(import.meta.url));
const names = [".gitignore", "README.md", "PROTOCOL.md", "protocol.json", "check-node-runtime.mjs",
  "node-runtime-admission.mjs", "core.mjs", "worker.mjs", "replay.mjs", "replay.test.mjs",
  "faults.json", "runner-path.test.mjs"];
let temporary;
const sources = new Map();
before(async () => {
  for (const name of names) sources.set(name, await fs.readFile(path.join(root, name), "utf8"));
  await fs.mkdir(path.join(root, ".local"), { recursive: true });
  temporary = await fs.mkdtemp(path.join(root, ".local/runner-tests-"));
});
after(async () => { if (temporary) await fs.rm(temporary, { recursive: true, force: true }); });

test("flat bundle policy matches the repository policy and admits copied execution", async () => {
  for (const name of ["check-node-runtime.mjs", "node-runtime-admission.mjs"]) {
    assert.equal(
      sources.get(name),
      await fs.readFile(path.join(root, "../../../tools", name), "utf8"),
      `${name} remains byte-identical to the repository policy`,
    );
  }

  const directory = await fs.mkdtemp(path.join(temporary, "policy-"));
  for (const name of ["check-node-runtime.mjs", "node-runtime-admission.mjs", "core.mjs"]) {
    await fs.writeFile(path.join(directory, name), sources.get(name));
  }
  const accepted = await exec(process.execPath, [path.join(directory, "core.mjs")], {
    cwd: directory,
    timeout: 5000,
  });
  assert.equal(accepted.stdout, "");
  assert.equal(accepted.stderr, "");

  const stale = path.join(directory, "stale-version.mjs");
  await fs.writeFile(stale, "Object.defineProperty(process, 'version', { value: 'v22.23.3' });\n");
  await assert.rejects(
    exec(process.execPath, [path.join(directory, "core.mjs")], {
      cwd: directory,
      env: { ...process.env, NODE_OPTIONS: `--import=${pathToFileURL(stale).href}` },
      timeout: 5000,
    }),
    error => {
      assert.equal(error.stdout, "");
      assert.match(error.stderr, /ERR_NODE_RUNTIME: Detected Node v22\.23\.3/u);
      return true;
    },
  );
});

const workerSource = "import fs from \"node:fs/promises\";\nimport path from \"node:path\";\nimport { createHash } from \"node:crypto\";\nimport { fileURLToPath } from \"node:url\";\nconst root = path.dirname(fileURLToPath(import.meta.url));\nconst local = path.join(root, \".local\");\nconst [mode, app, receipt, policy] = process.argv.slice(2);\nconst hash = (bytes) => createHash(\"sha256\").update(bytes).digest(\"hex\");\nif (mode === \"runtime\") {\n  console.log(JSON.stringify({ node: process.version, platform: process.platform, arch: process.arch,\n    playwright: \"isolated-stub-no-browser\", executable: path.join(local, \"browsers/chromium-0/chrome\") }));\n} else if (mode === \"plan\") {\n  console.log(JSON.stringify({ observationVersion: \"fixture-v1\", expected: [\"observer-fixtures\"], cases: [] }));\n} else {\n  const id = path.basename(path.dirname(receipt));\n  await fs.appendFile(path.join(local, \"stub-launches.jsonl\"), JSON.stringify({ id, policy, browser: false }) + \"\\n\");\n  if (policy === \"full\") await new Promise((resolve) => setTimeout(resolve, 20));\n  const prepared = JSON.parse(await fs.readFile(path.join(local, \"prepared.json\"), \"utf8\"));\n  const dependencies = Object.fromEntries(prepared.source.map((entry) => [entry.file, entry.sha256]));\n  const record = { id: \"observer-fixtures\", signature: \"fixture-definition\", dependencies,\n    result: { id: \"observer-fixtures\", standing: \"pass\", result: { control: \"synthetic-pass\" } } };\n  const generation = { version: 1, observationVersion: \"fixture-v1\", expected: [record.id], records: [record],\n    metadata: { definition: \"fixture-definition\" } };\n  const bytes = JSON.stringify(generation) + \"\\n\";\n  const pointer = { generation: \"generations/\" + hash(bytes) + \".json\", sha256: hash(bytes) };\n  const output = path.join(app, \".visual-runs/paired-replay-02\");\n  await fs.mkdir(path.join(output, \"generations\"), { recursive: true });\n  await fs.mkdir(path.join(output, \"checkpoints\"), { recursive: true });\n  await fs.writeFile(path.join(output, pointer.generation), bytes);\n  await fs.writeFile(path.join(output, \"checkpoints/fixture.json\"), JSON.stringify(record));\n  await fs.writeFile(path.join(output, \"completion.json\"), JSON.stringify(pointer));\n  await fs.writeFile(path.join(output, \"summary.json\"), JSON.stringify({\n    executionError: null, incomplete: 0, review: 0, pass: 1, completion: pointer,\n    definition: \"fixture-definition\", newCases: policy === \"full\" ? 1 : 0,\n    reused: policy === \"full\" ? 0 : 1, browserLaunches: policy === \"full\" ? 1 : 0,\n    documentNavigations: 0, stages: { executionMilliseconds: 0, publicationMilliseconds: 0 },\n    hashing: { uniqueReads: 0, bytesHashed: 0, freshReads: 0, hashMilliseconds: 0 },\n  }));\n  await fs.writeFile(receipt, JSON.stringify({ campaignCallMilliseconds: 0, fsApiCalls: {},\n    nodePeakResidentKiB: 0, browserProcessTreePeakMemory: { value: null, standing: \"unmeasured\" } }));\n  console.log(JSON.stringify({ case: record.id, standing: policy === \"full\" ? \"pass\" : \"reused\" }));\n}\n";
const preloadSource = "import fs from \"node:fs/promises\";\nimport syncFs from \"node:fs\";\nimport path from \"node:path\";\nconst config = JSON.parse(process.env.REPLAY_TEST_INJECTION);\nconst root = path.dirname(path.resolve(process.argv[1]));\nconst local = path.join(root, \".local\");\nconst target = local + \"/runs/unchanged-1-full\";\nlet fired = false;\nlet completedStateWrites = 0;\nlet offset = 0;\nconst now = performance.now.bind(performance);\nObject.defineProperty(performance, \"now\", { value: () => now() + offset });\nconst openHandles = new Set();\nasync function inject(stage) {\n  if (fired || config.stage !== stage) return;\n  fired = true;\n  if (config.kind === \"deadline\") offset += config.advance;\n  else if (config.kind === \"signal\") {\n    process.kill(process.pid, config.signal);\n    await new Promise((resolve) => setTimeout(resolve, 20));\n  }\n}\nfor (const operation of [\"mkdir\", \"open\", \"writeFile\", \"rm\"]) {\n  const original = fs[operation].bind(fs);\n  fs[operation] = async (...args) => {\n    const filename = typeof args[0] === \"string\" ? path.resolve(args[0]) : \"\";\n    const result = await original(...args);\n    if (operation === \"mkdir\" && filename === target) await inject(\"mkdir\");\n    if (operation === \"open\" && filename.startsWith(target + \"/\")) {\n      openHandles.add(filename);\n      const close = result.close.bind(result);\n      result.close = async () => { await close(); openHandles.delete(filename); };\n      if (filename.endsWith(\"/stdout.jsonl\")) await inject(\"stdout-open\");\n      if (filename.endsWith(\"/stderr.log\")) await inject(\"stderr-open\");\n    }\n    if (operation === \"writeFile\") {\n      if (filename.endsWith(\"/runs/unchanged-1-selected/measurements.json.tmp\")) await inject(\"final-child\");\n      if (filename === path.join(local, \"state.json.tmp\")) {\n        const state = JSON.parse(args[1]);\n        if (state.pairs.length === 1 && state.active === null) {\n          completedStateWrites += 1;\n          if (completedStateWrites === 1) await inject(\"pair-publication\");\n          if (completedStateWrites === 2) await inject(\"final-state\");\n        }\n      }\n    }\n    if (operation === \"rm\" && filename === path.join(local, \"runner.lock\")) await inject(\"lock-release\");\n    return result;\n  };\n}\nprocess.on(\"exit\", () => {\n  syncFs.writeFileSync(path.join(local, \"hook.json\"), JSON.stringify({ fired, openHandles: [...openHandles] }));\n});\n";

const owners = [
  "tools/table-reading-contract.mjs", "tools/table-reading-observer.mjs", "tools/observation-checkpoint.mjs",
  "tools/evidence-campaign.mjs", "tools/core-architecture-browser-helper.mjs", "tools/attribution-contract.mjs",
  "tools/package-v1-iframe-routes.mjs", "tools/iframe-route-package-engine.mjs", "tools/package-iframe-routes.mjs",
  "tools/package-canvas-iframe-routes.mjs", "tools/project-investment-analysis.mjs",
  "context-canvas-project-surface/context-canvas/visitor-boundary-contract.js", "attribution.yml", "package-lock.json",
];
async function manifest(directory, prefix = "") {
  const entries = [];
  for (const name of (await fs.readdir(path.join(directory, prefix))).sort()) {
    if (!prefix && ["node_modules", ".visual-runs"].includes(name)) continue;
    const file = prefix ? prefix + "/" + name : name;
    const target = path.join(directory, file);
    const stat = await fs.stat(target);
    if (stat.isDirectory()) entries.push(...await manifest(directory, file));
    else {
      const bytes = await fs.readFile(target);
      entries.push({ file, bytes: bytes.length, sha256: sha(bytes), mode: stat.mode & 0o777 });
    }
  }
  return entries;
}
async function fixture(config) {
  const directory = await fs.mkdtemp(path.join(temporary, "case-"));
  const local = path.join(directory, ".local");
  const app = path.join(local, "app");
  await fs.mkdir(app, { recursive: true });
  for (const [name, content] of sources) await fs.writeFile(path.join(directory, name), content);
  const protocol = JSON.parse(sources.get("protocol.json"));
  protocol.repetitions = 1;
  protocol.scenarios = [protocol.scenarios[0]];
  protocol.measuredBudgetMilliseconds = 10000;
  protocol.preparationBrowserBudgetMilliseconds = 10000;
  protocol.expected = { population: 1, prototypeCases: 0, familyCases: {}, measuredPairs: 1 };
  await fs.writeFile(path.join(directory, "protocol.json"), JSON.stringify(protocol));
  await fs.writeFile(path.join(directory, "worker.mjs"), workerSource);
  await fs.writeFile(path.join(directory, "inject.mjs"), preloadSource);
  for (const owner of owners) {
    const target = path.join(app, owner);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, "synthetic source for " + owner);
  }
  await fs.mkdir(path.join(app, "node_modules"));
  await fs.writeFile(path.join(app, "node_modules/runtime.txt"), "synthetic dependency");
  await fs.mkdir(path.join(local, "browsers/chromium-0"), { recursive: true });
  await fs.writeFile(path.join(local, "browsers/chromium-0/chrome"), "synthetic browser identity; never executed");
  const source = await manifest(app);
  await fs.writeFile(path.join(local, "prepared.json"), JSON.stringify({ source, sourceHash: signature(source) }));
  await exec(process.execPath, [path.join(directory, "replay.mjs"), "freeze"], { cwd: directory, timeout: 15000 });
  const frozen = JSON.parse(await fs.readFile(path.join(local, "frozen.json"), "utf8"));
  await fs.writeFile(path.join(local, "approval.json"), JSON.stringify({
    frozenHash: signature(frozen), bundleHash: frozen.bundleHash, reviewer: "synthetic-test-control",
    approvedAt: new Date().toISOString(), independentFaultAdjudication: true,
    authorizeBrowserExecution: true, contention: "quiet",
  }));
  let result;
  try {
    result = { ...await exec(process.execPath, ["--import", path.join(directory, "inject.mjs"),
      path.join(directory, "replay.mjs"), "measure", "--approval", path.join(local, "approval.json")],
    { cwd: directory, env: { ...process.env, REPLAY_TEST_INJECTION: JSON.stringify(config) },
      timeout: 20000, maxBuffer: 1024 * 1024 }), code: 0 };
  } catch (error) { result = error; }
  const state = JSON.parse(await fs.readFile(path.join(local, "state.json"), "utf8"));
  const hook = JSON.parse(await fs.readFile(path.join(local, "hook.json"), "utf8"));
  const launches = (await fs.readFile(path.join(local, "stub-launches.jsonl"), "utf8"))
    .trim().split("\n").filter(Boolean).map(JSON.parse);
  const summaries = (result.stdout ?? "").trim().split("\n").filter(Boolean).map(JSON.parse)
    .filter((entry) => Object.hasOwn(entry, "disposition"));
  assert.equal(summaries.length, 1, "One terminal disposition follows finalization");
  assert.equal(launches.every((entry) => entry.browser === false), true, "All workers are browser-free stubs");
  assert.deepEqual(hook.openHandles, [], "Prepared log handles close on every admission path");
  const decision = await exec(process.execPath, [path.join(directory, "replay.mjs"), "decision"],
    { cwd: directory, timeout: 5000 });
  return { state, hook, launches, summary: summaries[0], decision: JSON.parse(decision.stdout), code: result.code };
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  for (const stage of ["final-child", "pair-publication", "final-state", "lock-release"]) {
    test("runner retains " + signal + " during " + stage + " before completion/adoption", async () => {
      const result = await fixture({ kind: "signal", signal, stage });
      assert.equal(result.hook.fired, true, "The requested OS signal was delivered");
      assert.equal(result.launches.length, 4, "Seed, warm-up and paired stub invocations completed");
      assert.equal(result.state.interrupted, true);
      assert.equal(result.state.stop, "interrupted");
      assert.equal(result.summary.disposition, "indeterminate");
      assert.equal(result.decision.disposition, "indeterminate", "A later decision read retains cancellation");
      assert([0, 1].includes(result.code), "Signal handling follows the normal terminal route");
    });
  }
}
for (const stage of ["mkdir", "stdout-open", "stderr-open"]) {
  test("runner rechecks absolute deadline after asynchronous " + stage, async () => {
    const result = await fixture({ kind: "deadline", advance: 20000, stage });
    assert.equal(result.hook.fired, true);
    assert.equal(result.code, 1);
    assert.equal(result.launches.length, 2, "Only preparatory stub workers ran; expired admission spawned no measured child");
    assert.equal(result.state.pairs.length, 0);
    assert.equal(result.state.stop, "budget");
    assert.equal(result.summary.disposition, "indeterminate");
    assert.equal(result.decision.disposition, "indeterminate");
  });
}
test("runner accepts a complete stub pair while the post-preparation deadline remains open", async () => {
  const result = await fixture({ kind: "deadline", advance: 1, stage: "stderr-open" });
  assert.equal(result.hook.fired, true);
  assert.equal(result.code, 0);
  assert.equal(result.launches.length, 4);
  assert.equal(result.state.pairs.length, 1);
  assert.equal(result.summary.evidence, "complete-local-paired-comparison");
  assert.notEqual(result.summary.disposition, "indeterminate");
  assert.equal(result.decision.disposition, result.summary.disposition);
});

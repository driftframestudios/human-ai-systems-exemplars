import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { tableCaseVerdict } from "../../tools/table-reading-observer.mjs";
import { assertExpectedTables, harnessSources } from "../../tools/table-reading-contract.mjs";

const baseline = () => ({ tables: [{ visible: true, fragments: [] }], controls: [], keyboard: [], viewport: { pageWidth: 320, clientWidth: 320 } });
test("every required observation contributes to the case verdict", () => {
  assert.equal(tableCaseVerdict(baseline()).standing, "pass");
  const mutations = [
    ["keyboard-review", (value) => value.keyboard.push({ standing: "review" })],
    ["keyboard-review", (value) => value.keyboard.push({ standing: "owner-review" })],
    ["clipped-control", (value) => value.controls.push({ fragments: [], clipped: true })],
    ["table-state-unobserved", (value) => { value.tables[0].visible = false; }],
    ["page-overflow", (value) => { value.viewport.pageWidth = 400; }],
    ["ordinary-word-fragmentation", (value) => value.tables[0].fragments.push({ kind: "word" })],
    ["numeric-fragmentation", (value) => value.tables[0].fragments.push({ kind: "numeric" })],
  ];
  for (const [reason, mutate] of mutations) {
    const value = baseline(); mutate(value);
    assert.equal(tableCaseVerdict(value).standing, "review", reason);
    assert(tableCaseVerdict(value).reasons.includes(reason));
  }
  assert.equal(tableCaseVerdict(baseline(), ["runtime failure"]).standing, "review");
});

test("expected table populations distinguish unavailable runtime and missing content", () => {
  for (const count of [2, 3, 4, 18]) {
    assertExpectedTables(Array(count).fill({}), count, "fixture");
    assert.throws(() => assertExpectedTables([], count, "fixture"), /declared table population/u);
  }
  assertExpectedTables([], 0, "authored handoff with runtime tables outside static view");
});

test("resume definitions include the local executable helper closure", async () => {
  const root = path.resolve(import.meta.dirname, "../..");
  const declared = new Set(harnessSources);
  for (const file of harnessSources) {
    const source = await fs.readFile(path.join(root, file), "utf8");
    for (const match of source.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/gu)) {
      const dependency = path.relative(root, path.resolve(path.dirname(path.join(root, file)), match[1]));
      if (/\.[mc]?js$/u.test(dependency)) assert(declared.has(dependency), `${file} imports ${dependency}`);
    }
  }
});

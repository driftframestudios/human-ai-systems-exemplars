import '../../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { planCases } from "./cases.mjs";
import { validateRecordArtifacts } from "./contracts.mjs";
import { staticColumns, staticRows, reportColumns, validateStrategyStatic,
  expectedSeedReportRows, validateStrategyReport } from "./strategy-states.mjs";

function table(columns, rows) {
  return { caption: "Dimension readings and standing",
    columns: columns.map(text => ({ text, scope: "col" })),
    rows: rows.map(row => ({ cells: row.map((text, index) => ({
      text, tag: index ? "TD" : "TH", scope: index ? null : "row",
    })) })),
  };
}
function state() {
  return { meta: { revision: 4 }, view: { dimensionOrder: staticRows.map((_, index) => "dimension-" + index) },
    dimensions: staticRows.map((row, index) => ({
      id: "dimension-" + index, label: row[0], action: "hold",
      scores: { current: Number(row[1]), goodEnough: Number(row[2]), desired: Number(row[3]) },
    })) };
}
function report(source, standing = "working") {
  return { standing, source: standing === "reviewed" ? "lifecycle-reviewed-snapshot" : "current-working-state",
    revision: source.meta.revision, table: table(reportColumns, expectedSeedReportRows(source)) };
}

test("Strategy cases bind exact source roles, media and print companion inputs", () => {
  const cases = planCases({ combined: true }).filter(item => item.family.state);
  assert.deepEqual(cases.map(item => [item.id, item.mode, item.width]), [
    ["strategy-canonical-source-390-static", "static", 390],
    ["strategy-context-source-1280-print", "print", 1280],
  ]);
  assert.equal(cases[1].family.inputs.length, 4);
});
test("canonical no-script table preserves all six independent seed readings", () => {
  validateStrategyStatic(table(staticColumns, staticRows));
});
test("canonical missing dimension cannot be hidden behind complete headers", () => {
  assert.throws(() => validateStrategyStatic(table(staticColumns, staticRows.slice(1))));
});
test("canonical consequence column remains in the native reading", () => {
  assert.throws(() => validateStrategyStatic(table(staticColumns.slice(0, 4), staticRows.map(row => row.slice(0, 4)))));
});
for (const standing of ["working", "reviewed"]) test(standing + " print report uses its declared source and complete rows", () => {
  const source = state();
  validateStrategyReport(report(source, standing), source, standing);
});
test("empty source and empty table cannot create report parity", () => {
  const source = { ...state(), dimensions: [], view: { dimensionOrder: [] } };
  assert.throws(() => validateStrategyReport({ standing: "working", source: "current-working-state",
    revision: 4, table: table(reportColumns, []) }, source, "working"));
});
test("working data cannot be relabeled as a reviewed snapshot", () => {
  const source = state(), observed = report(source);
  observed.standing = "reviewed";
  assert.throws(() => validateStrategyReport(observed, source, "reviewed"));
});
test("stale report revision cannot pass with otherwise identical values", () => {
  const source = state(), observed = report(source);
  observed.revision--;
  assert.throws(() => validateStrategyReport(observed, source, "working"));
});
test("partial print row fails despite matching dimension identity", () => {
  const source = state(), observed = report(source);
  observed.table.rows[0].cells.pop();
  assert.throws(() => validateStrategyReport(observed, source, "working"));
});
test("changed numerical value fails independently of report labels", () => {
  const source = state(), observed = report(source);
  observed.table.rows[0].cells[1].text = "0";
  assert.throws(() => validateStrategyReport(observed, source, "working"));
});
test("all four declared print dependencies are mandatory even when remaining bytes agree", async () => {
  const planned = planCases({ combined: true, caseId: "strategy-context-source-1280-print" })[0];
  const dependencies = Object.fromEntries([planned.family.source, ...planned.family.inputs].map(key => [key, "a".repeat(64)]));
  const record = { id: planned.id, dependencies, result: { id: planned.id, family: planned.family.id,
    kind: planned.family.kind, mode: planned.mode, width: planned.width, variant: planned.variant,
    standing: "pass", screenshots: [] } };
  const snapshot = { agrees: async () => true };
  assert(await validateRecordArtifacts(record, planned, "/unused-unit-root", snapshot));
  for (const input of planned.family.inputs) {
    const candidate = structuredClone(record);
    delete candidate.dependencies[input];
    assert.equal(await validateRecordArtifacts(candidate, planned, "/unused-unit-root", snapshot), false);
  }
});
test("browser wiring preserves genuine disabled-script setup and the existing real review action", async () => {
  const browser = await fs.readFile(new URL("./browser.mjs", import.meta.url), "utf8");
  const helper = await fs.readFile(new URL("./strategy-states.mjs", import.meta.url), "utf8");
  assert.match(browser, /javaScriptEnabled: mode !== "static"/u);
  assert.match(browser, /await observeStrategyState\(page, frame, family\)/u);
  assert.match(browser, /"tests\/tables\/core-followthrough\/strategy-states\.mjs"/u);
  assert.match(helper, /data-action="review-revision"/u);
  assert.match(helper, /capture\("working"\)/u);
  assert.match(helper, /capture\("reviewed"\)/u);
  assert.doesNotMatch(helper, /\.lifecycle\.status\s*=/u);
});

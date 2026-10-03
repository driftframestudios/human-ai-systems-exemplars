import assert from "node:assert/strict";
import { observeTableReading } from "../../../tools/table-reading-observer.mjs";
import { readSemanticTable } from "./closure.mjs";

export const staticColumns = ["Dimension", "Current", "Good enough", "Desired", "Consequence"];
export const staticRows = [
  ["Goal fidelity", "4", "7", "9", "5"],
  ["Evidence provenance", "3", "7", "10", "5"],
  ["Decision legibility", "5", "7", "9", "4"],
  ["Participant reach", "4", "6", "9", "4"],
  ["Recovery clarity", "3", "6", "8", "5"],
  ["Cross-surface continuity", "4", "7", "9", "4"],
];
export const reportColumns = ["Dimension", "Current", "Good enough", "Desired", "Group mean",
  "Median / range", "Scenario", "AI proposal", "Action"];

export async function observeStrategyTables(frame, selector) {
  const target = frame.locator(selector);
  await target.waitFor({ state: "visible" });
  const index = await target.evaluate(table => [...document.querySelectorAll("table")].indexOf(table));
  const tables = (await frame.evaluate(observeTableReading)).filter(table => table.tableIndex === index);
  assert.equal(tables.length, 1, "the named Strategy state has one observed table");
  assert(tables[0].visible, "the named Strategy table is genuinely visible");
  return tables;
}

function validateNativeRows(table, columns, expected) {
  assert(expected.length > 0, "an empty model cannot establish report parity");
  assert.deepEqual(table.columns.map(cell => [cell.text, cell.scope]), columns.map(text => [text, "col"]));
  assert.equal(table.rows.length, expected.length);
  table.rows.forEach((row, index) => {
    assert.equal(row.cells[0].tag, "TH");
    assert.equal(row.cells[0].scope, "row");
    assert(row.cells.slice(1).every(cell => cell.tag === "TD"));
    assert.deepEqual(row.cells.map(cell => cell.text), expected[index]);
  });
}

export function validateStrategyStatic(table) {
  validateNativeRows(table, staticColumns, staticRows);
}

export function expectedSeedReportRows(state) {
  assert.equal(state.dimensions?.length, 6, "this focused seed journey retains six dimensions");
  assert.equal(new Set(state.view.dimensionOrder).size, 6);
  const actions = { eliminate: "Eliminate", reduce: "Reduce", raise: "Raise", create: "Create", hold: "Hold", open: "Open" };
  return state.view.dimensionOrder.map(id => {
    const dimension = state.dimensions.find(item => item.id === id);
    assert(dimension && Object.hasOwn(actions, dimension.action), "ordered dimension has an owned action");
    return [dimension.label, String(dimension.scores.current), String(dimension.scores.goodEnough),
      String(dimension.scores.desired), "Open", "Open", "Open", "Open", actions[dimension.action]];
  });
}

export function validateStrategyReport(report, state, standing) {
  assert.equal(report.standing, standing);
  assert.equal(report.source, standing === "reviewed" ? "lifecycle-reviewed-snapshot" : "current-working-state");
  assert.equal(report.revision, state.meta.revision);
  assert.equal(report.table.caption, "Dimension readings and standing");
  validateNativeRows(report.table, reportColumns, expectedSeedReportRows(state));
}

async function observePrintJourney(page, frame, selector) {
  const report = frame.locator("#print-report");
  const state = () => frame.evaluate(() => window.StrategyCanvasWorkbench.getState());
  const capture = async standing => {
    await page.emulateMedia({ media: "print" });
    await report.waitFor({ state: "visible" });
    const current = await state();
    assert.equal(current.lifecycle.status, standing);
    const source = standing === "reviewed" ? current.lifecycle.reviewedSnapshot : current;
    assert(source, "reviewed observation requires an actual lifecycle snapshot");
    const sample = await report.evaluate(element => ({
      standing: element.dataset.reportStanding,
      source: element.dataset.reportSource,
      revision: Number(element.dataset.reportRevision),
      receipt: element.querySelector("[data-report-receipt]").textContent.trim(),
    }));
    sample.table = await readSemanticTable(frame.locator(selector));
    validateStrategyReport(sample, source, standing);
    sample.tables = await observeStrategyTables(frame, selector);
    return sample;
  };

  // Match the existing contract's real UI review/reopen journey, without claiming
  // its broader ballot, scenario, AI, export, or privacy coverage.
  await page.emulateMedia({ media: "screen" });
  assert(await report.isHidden(), "the report is an alternate-media state, not an absent table");
  const samples = [await capture("working")];
  await page.emulateMedia({ media: "screen" });
  await frame.locator('[data-phase-link="review"]').click();
  await frame.locator("#note-author").fill("Table observation fixture");
  const reviewedReceipt = "Review the seeded dimension readings for this bounded table observation.";
  await frame.locator("#decision-receipt").fill(reviewedReceipt);
  await frame.locator("#decision-receipt").press("Tab");
  await frame.locator('[data-action="review-revision"]').click();
  const reviewedState = await state();
  assert.equal(reviewedState.extensions.contextCanvas.collaboration.reviewedSnapshots.length, 1);
  const retainedSnapshot = JSON.stringify(reviewedState.lifecycle.reviewedSnapshot);
  const reviewed = await capture("reviewed");
  assert.equal(reviewed.receipt, reviewedReceipt);
  samples.push(reviewed);

  await page.emulateMedia({ media: "screen" });
  const reopenedReceipt = "Reopen the same seeded readings for the next bounded review.";
  await frame.locator("#decision-receipt").fill(reopenedReceipt);
  await frame.locator("#decision-receipt").press("Tab");
  const reopenedState = await state();
  assert.equal(reopenedState.meta.revision, reviewedState.meta.revision + 1);
  assert.equal(JSON.stringify(reopenedState.lifecycle.reviewedSnapshot), retainedSnapshot,
    "reopening retains the accepted snapshot rather than rewriting its history");
  const reopened = await capture("working");
  assert.equal(reopened.receipt, reopenedReceipt);
  samples.push(reopened);
  return { state: "print-report", screenVisible: false, printVisible: true, samples,
    coverage: "seeded working, reviewed snapshot and reopened working print tables; no full collaboration journey" };
}

export async function observeStrategyState(page, frame, family) {
  if (family.state === "static-baseline") {
    assert(await frame.locator('[data-sc-role="static-baseline"]').isVisible());
    assert.equal(await frame.evaluate(() => typeof window.strategyCanvasCanonical), "undefined",
      "the static case is a genuine JavaScript-disabled initial document");
    const table = await readSemanticTable(frame.locator(family.tableSelector));
    validateStrategyStatic(table);
    return { state: "genuine-scriptless-initial", table, runtimeAPI: "absent", dimensions: 6 };
  }
  assert.equal(family.state, "print-report");
  return observePrintJourney(page, frame, family.tableSelector);
}

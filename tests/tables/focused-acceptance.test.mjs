import '../../tools/node-runtime-admission.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { openCheckpoints, publishObservation } from "../../tools/observation-checkpoint.mjs";
import { publishCampaign } from "../../tools/evidence-campaign.mjs";
import {
  acceptancePlan, activeView, assertAcceptanceRecord, assertReportParity,
  assertSharedTransition, driveHorizontal, reportReceiver, resultCaptions,
  assertAcceptedCustomerEdit, assertRouteReadout, assertReorderFocusVisible, createDocumentAccounting, runAcceptanceCases,
} from "../../tools/table-focused-acceptance.mjs";

const C = createRequire(import.meta.url)("../../collaboration/investment-analysis/core.js");

const families = [
  { id: "shared", source: "shared.html", parent: "nursery.html" },
  { id: "investment", source: "studio.html", parent: "costing.html" },
];
const plan = () => acceptancePlan(families);

test("exact supplemental plan has three cases, seven visits and no fixture/model sweep", () => {
  const result = plan();
  assert.deepEqual(result.expected, ["shared-acceptance-view-320", "investment-acceptance-reach-320", "investment-acceptance-report-390"]);
  assert.deepEqual(result.cases.map(item => [item.width, item.parent]), [[320, true], [320, true], [390, false]]);
  assert.equal(result.browserLaunches, 1);
  assert.equal(result.documentVisits, 7);
  assert(result.cases.every(item => item.media === "screen" && item.script));
});
test("family and exact-case selection retain the trusted budget", () => {
  assert.equal(acceptancePlan(families, { familyId: "investment" }).documentVisits, 5);
  assert.equal(acceptancePlan(families, { caseId: "investment-acceptance-report-390" }).documentVisits, 3);
  assert.throws(() => acceptancePlan(families, { familyId: "shared", caseId: "investment-acceptance-report-390" }));
  assert.throws(() => acceptancePlan(families, { familyId: "conditioning" }));
  assert.throws(() => acceptancePlan(families, { caseId: "research-prediction" }));
});

test("horizontal driver reaches the far edge only through supplied input", async () => {
  let left = 0, inputs = 0;
  const result = await driveHorizontal(async () => ({ left, max: 360, rightmostVisible: left === 360 }),
    async () => { inputs++; left = Math.min(360, left + 90); });
  assert.equal(inputs, 4);
  assert.equal(result.actions, 4);
  assert(result.reached && result.rightmostVisible);
});
test("horizontal driver returns through input rather than an assigned starting position", async () => {
  let left = 360;
  const result = await driveHorizontal(async () => ({ left, max: 360 }), async () => { left -= 90; }, { edge: "start" });
  assert.equal(result.actions, 4);
  assert.equal(result.left, 0);
  assert(result.reached);
});
test("a stalled scroll has a bounded failing observation", async () => {
  let inputs = 0;
  const result = await driveHorizontal(async () => ({ left: 0, max: 900 }), async () => { inputs++; }, { limit: 3 });
  assert.equal(inputs, 3);
  assert.equal(result.reached, false);
});

function sharedFixture() {
  return {
    artifact_identity: { id: "priority-map" },
    shared_surface_priority_map: {
      surfaces: [{ id: "surface-a", label: "A" }, { id: "surface-b", label: "B" }],
      heatmap_cells: [{ id: "cell-a", note: "<literal>", linked_shared_asset_ids: ["asset-a"], composite_intensity: "high", visible_in_active_view: true }],
      shared_assets: [{ id: "asset-a", supported_cells: ["cell-a"], visible_in_active_view: true }],
    },
    view_state: { active_view_id: "active", views: [
      { id: "active", surface_order: ["surface-a", "surface-b"], active_intensity_basis_ids: ["workflow", "reach"], hidden_surface_ids: ["surface-b"], selected_cell_id: "cell-a" },
      { id: "inactive", surface_order: ["surface-b", "surface-a"] },
    ] },
  };
}
test("basis transition allows derived intensity while retaining source data and inactive views", () => {
  const before = sharedFixture(), after = structuredClone(before);
  activeView(after).active_intensity_basis_ids = ["reach"];
  after.shared_surface_priority_map.heatmap_cells[0].composite_intensity = "low";
  assertSharedTransition(before, after, { active_intensity_basis_ids: ["reach"] });
  assert.equal(before.shared_surface_priority_map.heatmap_cells[0].composite_intensity, "high");
});
test("display order changes cannot erase a filter or selection", () => {
  const before = sharedFixture(), after = structuredClone(before);
  activeView(after).surface_order.reverse();
  assertSharedTransition(before, after, { surface_order: ["surface-b", "surface-a"] });
  activeView(after).hidden_surface_ids = [];
  assert.throws(() => assertSharedTransition(before, after, { surface_order: ["surface-b", "surface-a"] }));
});
test("view actions cannot rewrite cell content, identity or linked assets", () => {
  for (const [key, value] of [["note", "changed"], ["id", "new-id"], ["linked_shared_asset_ids", []]]) {
    const before = sharedFixture(), after = structuredClone(before);
    after.shared_surface_priority_map.heatmap_cells[0][key] = value;
    assert.throws(() => assertSharedTransition(before, after, {}));
  }
});

function reportFixture() {
  const state = C.defaults();
  state.inputs.label = '<em>literal</em> & "quoted"';
  state.inputs.newCustomers = 40;
  const result = C.calculate(state);
  const metric = value => value.value == null ? value.status : String(value.value) + (value.unit ? " " + value.unit : "");
  const numeric = value => value == null ? "unavailable" : String(value);
  const basis = (state.inputs.currency || "currency unspecified") + " / " + state.inputs.period + "; " + state.origin;
  const table = (caption, columns, records) => ({
    caption, headers: columns.map(text => ({ text, scope: "col" })),
    rows: records.map(([identity, ...values]) => ({ identity, cells: values.map((text, index) => ({
      tag: index === 0 ? "TH" : "TD", scope: index === 0 ? "row" : null, label: columns[index], text,
    })) })),
  });
  const measures = pairs => pairs.map(([key, label]) => [key, label, metric(result.metrics[key])]);
  return { fingerprint: "accepted-one", state, result, tables: [
    table("Decision-changing measures", ["Measure", "Value and standing"], measures([
      ["grr", "Gross revenue retention"], ["nrr", "Net revenue retention"], ["cac", "Customer acquisition cost"],
      ["expectedNpv", "Expected NPV"], ["budgetImpact", "Incremental service budget impact"],
    ])),
    table("Commercial cohort and price realization", ["Measure", "Result"], measures([
      ["logoRetention", "Customer retention, opening cohort"], ["closingCustomers", "Closing customers"],
      ["closingRevenue", "Closing recurring revenue"], ["grr", "GRR, opening cohort"], ["nrr", "NRR, opening cohort"],
      ["cac", "Acquisition spend / new customers"], ["acquisitionRevenueRatio", "Acquisition spend / new recurring revenue"],
      ["cacPayback", "Contribution-based acquisition payback"], ["discountAmount", "Per-unit discount"],
      ["netPrice", "Net price after discount and rebate"], ["unitContribution", "Net price less variable and service costs"],
    ])),
    table("Lifecycle event graph", ["Occurrence", "Stage", "Period", "Predecessors", "Standing"],
      state.events.map(event => [event.id, event.id, event.kind, numeric(event.period), event.predecessors.join(", ") || "Entry", event.standing])),
    table("Incremental alternatives", ["Choice", "Standing", "Cash flows from t=0", "NPV", "IRR per period", "Payback"],
      result.alternatives.map(alternative => [alternative.id, alternative.label, alternative.standing,
        alternative.flows.map(numeric).join(", "), metric(alternative.npv), metric(alternative.irr), metric(alternative.payback)])),
    table("Discount sensitivity, same cash flows", ["Alternative", "Rate minus 0.02", "Entered rate", "Rate plus 0.02"],
      result.sensitivity.map(alternative => [alternative.id, alternative.id,
        ...alternative.values.map(value => numeric(value.rate) + ": " + metric(value.result))])),
    table("Service budget and capacity", ["Measure", "Result"], measures([
      ["adoptedPopulation", "Adopted population"], ["budgetImpact", "Incremental budget per period"],
      ["capacityGap", "Capacity gap"], ["costPerOutcome", "Reviewed incremental cost per outcome"],
    ])),
    table("Cost-consequence view", ["Dimension", "Unit", "Baseline", "Candidate", "Standing", "Change and evidence"],
      result.serviceOutcomes.map(outcome => ["Cost-consequence view: " + outcome.name + "; " + basis, outcome.name,
        outcome.unit || "Unspecified", numeric(outcome.baseline), numeric(outcome.candidate), outcome.standing,
        metric(outcome.delta) + (outcome.source ? " / " + outcome.source : "")])),
    table("Shared domain and record contract", ["Domain", "Record types present"],
      C.DOMAINS.map(domain => [domain, domain === "service-operational" ? "Service and operational value" : domain,
        [...new Set(result.records.filter(record => record.domain === domain).map(record => record.type))].join(", ") || "Records remain open"])),
  ] };
}
test("report parity requires all eight populated native result tables and exact accepted state", () => {
  const expected = reportFixture();
  assert.deepEqual(expected.tables.map(table => table.rows.length), [5, 11, 6, 7, 7, 4, 9, 5]);
  assert.deepEqual(expected.tables.map(table => table.caption), resultCaptions);
  assertReportParity(expected, structuredClone(expected));
});
test("a heading-only or missing-table report is not acceptance evidence", () => {
  const expected = reportFixture(), actual = structuredClone(expected);
  actual.tables.pop();
  assert.throws(() => assertReportParity(expected, actual));
  actual.tables = [];
  assert.throws(() => assertReportParity(expected, actual));
});
test("report parity rejects stale state, substituted numbers and lost native row headers", () => {
  for (const mutate of [
    value => { value.fingerprint = "stale"; },
    value => { value.state.inputs.newCustomers = 41; },
    value => { value.tables[0].rows[0].cells[1].text = "unavailable"; },
    value => { value.tables[0].rows[0].cells[0].tag = "TD"; },
  ]) {
    const expected = reportFixture(), actual = structuredClone(expected); mutate(actual);
    assert.throws(() => assertReportParity(expected, actual));
  }
});


test("matching empty/headerless observations across all eight captions fail independently of equality", () => {
  const expected = reportFixture();
  for (const table of expected.tables) {
    table.headers = [];
    table.rows = [{ identity: "", cells: [] }];
  }
  assert.throws(() => assertReportParity(expected, structuredClone(expected)));
});

for (const [name, mutate] of [
  ["missing headers", table => { table.headers = []; }],
  ["blank header meanings", table => { table.headers.forEach(header => { header.text = ""; }); }],
  ["wrong column scope", table => { table.headers[0].scope = "row"; }],
  ["no body rows", table => { table.rows = []; }],
  ["empty row cells", table => { table.rows.forEach(row => { row.cells = []; }); }],
  ["blank row identity", table => { table.rows[0].identity = ""; }],
  ["blank row meaning", table => { table.rows[0].cells[0].text = " "; }],
  ["missing value cell", table => { table.rows[0].cells.pop(); }],
  ["row header changed to data cell", table => { table.rows[0].cells[0].tag = "TD"; }],
  ["missing row scope", table => { table.rows[0].cells[0].scope = null; }],
  ["lost field labels", table => { table.rows[0].cells[1].label = ""; }],
  ["missing expected seeded row", table => { table.rows.pop(); }],
  ["duplicated row identity", table => { table.rows[1] = structuredClone(table.rows[0]); }],
  ["substituted nonblank row meaning", table => { table.rows[0].cells[0].text = "Wrong record"; }],
]) {
  test("paired degeneration rejects " + name + " in each of the eight table families", () => {
    for (let index = 0; index < resultCaptions.length; index++) {
      const expected = reportFixture(); mutate(expected.tables[index]);
      assert.throws(() => assertReportParity(expected, structuredClone(expected)), resultCaptions[index]);
    }
  });
}

test("either observation independently needs native meaning, not just a matching counterpart", () => {
  for (const side of ["source", "report"]) {
    const expected = reportFixture(), actual = structuredClone(expected);
    (side === "source" ? expected : actual).tables[0].rows[0].cells = [];
    assert.throws(() => assertReportParity(expected, actual), side);
  }
});

test("blank, zero and explicit absence/status values remain valid data-cell text", () => {
  for (const value of ["", "0", "unavailable", "invalid", "inapplicable", "qualified: 12 USD"]) {
    const expected = reportFixture();
    for (const table of expected.tables) {
      for (const row of table.rows) for (const cell of row.cells.slice(1)) cell.text = value;
    }
    assertReportParity(expected, structuredClone(expected));
  }
});

function recordFixture(planned) {
  const sha256 = "a".repeat(64), dependencies = { [planned.family.source]: sha256 };
  if (planned.parent) dependencies[planned.family.parent] = sha256;
  if (planned.journey === "studio-report") dependencies[reportReceiver] = sha256;
  const screenshots = planned.screenshotLabels.map((label, index) => {
    const path = ".visual-runs/acceptance/shot-" + index + ".png"; dependencies[path] = sha256;
    return { label, path, sha256 };
  });
  return { id: planned.id, dependencies, result: {
    id: planned.id, journey: planned.journey, width: planned.width, variant: planned.variant,
    media: planned.media, script: planned.script, parent: planned.parent,
    checks: [{ name: "Invariant", pass: true }], errors: [], standing: "pass", screenshots,
  } };
}
test("publication metadata binds planned dimensions, source owners and screenshot path/digest", () => {
  for (const planned of plan().cases) assertAcceptanceRecord(recordFixture(planned), planned);
});
test("publication rejects substituted media/width, missing checks and screenshot evidence", () => {
  const planned = plan().cases[2];
  for (const mutate of [
    value => { value.result.width = "390"; }, value => { value.result.media = "print"; },
    value => { delete value.result.journey; }, value => { value.result.checks = []; },
    value => { value.result.screenshots.pop(); }, value => { delete value.result.screenshots[0].path; },
    value => { value.result.screenshots[0].sha256 = "b".repeat(64); },
    value => { delete value.dependencies[reportReceiver]; },
  ]) {
    const record = recordFixture(planned); mutate(record);
    assert.throws(() => assertAcceptanceRecord(record, planned));
  }
});


test("accepted numeric editor retains its raw string while producing the numeric result", () => {
  const state = C.defaults(); state.inputs.newCustomers = "40";
  const projection = { state, result: C.calculate(state) };
  assertAcceptedCustomerEdit(projection);
  for (const mutate of [
    value => { value.state.inputs.newCustomers = 40; },
    value => { value.state.inputs.newCustomers = "41"; },
    value => { value.result.metrics.cac.value = 251; },
  ]) {
    const invalid = structuredClone(projection); mutate(invalid);
    assert.throws(() => assertAcceptedCustomerEdit(invalid));
  }
});

for (const failureIndex of [0, 1, 2]) {
  test("stop after failing case " + (failureIndex + 1) + " preserves real checkpoints and explicitly marks unrun population", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "table-focused-stop-"));
    try {
      const checkpoints = await openCheckpoints(path.join(root, "checkpoints"));
      const campaign = plan(), performed = [], completed = [], persisted = [];
      const stopped = await runAcceptanceCases(campaign.cases, async item => {
        performed.push(item.id);
        const record = recordFixture(item); record.signature = "fixture";
        record.result.attempted = true;
        if (completed.length === failureIndex) {
          record.result.checks[0].pass = false; record.result.standing = "review";
        }
        await publishObservation(checkpoints, record, async () => {});
        completed.push(record); persisted.push(record.result);
        return record.result;
      }, async result => { persisted.push(result); });
      assert.equal(stopped, campaign.expected[failureIndex]);
      assert.deepEqual(performed, campaign.expected.slice(0, failureIndex + 1));
      assert.deepEqual(persisted.map(item => item.id), campaign.expected);
      assert(persisted.slice(failureIndex + 1).every(item => item.standing === "incomplete" &&
        item.attempted === false && item.screenshots.length === 0 && item.reason.includes(stopped)));
      for (const record of completed) {
        const saved = await checkpoints.readRecord(record.id, "fixture", async () => true);
        assert.deepEqual(saved.result, record.result);
        assertAcceptanceRecord(saved, campaign.cases.find(item => item.id === record.id));
      }
      if (failureIndex < 2) {
        await assert.rejects(publishCampaign(root, campaign.expected, completed, async () => true),
          /Every requested case has one completion record/);
      } else {
        const publication = await publishCampaign(root, campaign.expected, completed, async () => true);
        assert.equal(publication.standing, "review");
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

test("an exception or incomplete case stops later browser work with an explicit population", async () => {
  for (const throws of [false, true]) {
    const attempted = [], observations = [], campaign = plan();
    const stopped = await runAcceptanceCases(campaign.cases, async item => {
      attempted.push(item.id);
      if (throws) throw new Error("Fixture setup failed");
      const result = { id: item.id, standing: "incomplete", attempted: true, error: "Fixture case failed" };
      observations.push(result); return result;
    }, async result => { observations.push(result); });
    assert.equal(stopped, campaign.expected[0]);
    assert.deepEqual(attempted, [campaign.expected[0]]);
    assert.equal(observations.length, 3);
    assert.equal(observations[0].attempted, true);
    assert(observations.slice(1).every(item => item.attempted === false && item.standing === "incomplete"));
  }
});

test("a passing plan performs all cases without fabricating incomplete observations", async () => {
  const performed = [], unrun = [];
  const stopped = await runAcceptanceCases(plan().cases, async item => {
    performed.push(item.id); return { id: item.id, standing: "pass" };
  }, async item => { unrun.push(item); });
  assert.equal(stopped, null);
  assert.deepEqual(performed, plan().expected);
  assert.deepEqual(unrun, []);
});

test("served HTML and observed documents stay separate, including a late-observed blob report", () => {
  const accounting = createDocumentAccounting();
  for (let i = 0; i < 6; i++) accounting.servedHtml();
  assert.deepEqual(accounting.snapshot(), { servedHtmlNavigations: 6, documentVisits: 0, blobDocumentVisits: 0 });
  const frames = Array.from({ length: 7 }, () => ({}));
  frames.forEach((frame, index) => accounting.visit(frame, {
    protocol: index === 6 ? "blob:" : "http:", timeOrigin: 1000 + index,
  }));
  // The popup can already be loaded when observed; no page-event timing is assumed.
  assert.equal(accounting.visit(frames[6], { protocol: "blob:", timeOrigin: 1006 }), false);
  assert.deepEqual(accounting.snapshot(), { servedHtmlNavigations: 6, documentVisits: 7, blobDocumentVisits: 1 });
  assert.equal(accounting.visit(frames[0], { protocol: "http:", timeOrigin: 2000 }), true);
  assert.equal(accounting.snapshot().documentVisits, 8, "A new document in the same frame is a new visit");
  assert.equal(accounting.visit({}, { protocol: "about:", timeOrigin: 3000 }), false);
  assert.throws(() => accounting.visit({}, { protocol: "http:", timeOrigin: NaN }));
});

test("literal route readout requires full text, wrapping and actual-width containment", () => {
  const text = 'Service-design Blueprint <literal> & "custom"';
  const good = { text: "Current route: " + text, whiteSpace: "normal", overflowWrap: "anywhere",
    width: 210, clientWidth: 210, scrollWidth: 210, left: 20, right: 230, viewportWidth: 251 };
  assertRouteReadout(good, text);
  for (const patch of [
    { text: "Current route: Service-design Bluepri" }, { whiteSpace: "nowrap" },
    { scrollWidth: 240 }, { right: 280 }, { left: -10 }, { width: 0 },
  ]) assert.throws(() => assertRouteReadout({ ...good, ...patch }, text));
});

test("runtime owner wires case stopping, committed document observations and real wall-clock endpoints", async () => {
  const harness = await readFile(new URL("../../tools/table-reading-contract.mjs", import.meta.url), "utf8");
  const journeys = await readFile(new URL("../../tools/table-focused-acceptance.mjs", import.meta.url), "utf8");
  assert.match(harness, /runAcceptanceCases\(campaign\.cases/);
  assert.match(harness, /if \(records\.length === campaign\.expected\.length\)/);
  assert.match(harness, /counts = invocationCounts\(cases, attemptedCaseIds, reusedCaseIds, campaign\.expected\)/);
  assert.match(harness, /const ended = Date\.now\(\)/);
  assert.match(harness, /endedAt: new Date\(ended\)\.toISOString\(\)/);
  assert.match(harness, /await observeDocument\(page\.mainFrame\(\)\)/);
  assert.match(harness, /await observeDocument\(frame\)/);
  assert.doesNotMatch(harness, /documentNavigations:|framenavigated/);
  assert.match(journeys, /await observeDocument\(receiver\.mainFrame\(\)\)/);
  assert.match(journeys, /await report\.locator\("\.investment-report"\)\.waitFor\(\);\s*await observeDocument\(report\.mainFrame\(\)\)/);
});

function visibleReorderFixture() {
  return { active: true, focusVisible: true, unobscured: true, visiblePointHitsControl: true,
    outlineReserve: 1, viewport: { width: 251, height: 604 },
    rect: { left: 66, right: 172.296875, top: 279.609375, bottom: 323.609375 } };
}
test("reorder visible-focus oracle admits independently measured in-view geometry", () => {
  assertReorderFocusVisible(visibleReorderFixture());
});
for (const [name, mutate] of [
  ["recorded offscreen asset despite positive focus flags", value => { value.rect.top = 785.546875; value.rect.bottom = 829.546875; }],
  ["above viewport", value => { value.rect.top = -60; value.rect.bottom = -16; }],
  ["fitting control partly below viewport", value => { value.rect.top = 590; value.rect.bottom = 634; }],
  ["outline clipped despite a fitting border box", value => { value.rect.top = 560; value.rect.bottom = 604; value.outlineReserve = 3; }],
  ["entirely outside horizontal viewport", value => { value.rect.left = 300; value.rect.right = 406; }],
  ["covered visible sample", value => { value.visiblePointHitsControl = false; }],
  ["missing geometry", value => { delete value.rect; }],
  ["mistyped viewport", value => { value.viewport.height = "604"; }],
  ["nonfinite geometry", value => { value.rect.top = NaN; }],
  ["lost active control", value => { value.active = false; }],
]) {
  test("reorder visible-focus oracle rejects " + name, () => {
    const value = visibleReorderFixture(); mutate(value);
    assert.throws(() => assertReorderFocusVisible(value));
  });
}
test("overwide control remains valid through a visible interior point without requiring both horizontal edges", () => {
  const value = visibleReorderFixture();
  Object.assign(value.rect, { left: -400, right: 300 });
  value.unobscured = false; // Its full-box center is offscreen; its visible portion is usable.
  assertReorderFocusVisible(value);
});
test("both surface and asset reorders enable immediate geometry assertions before any subsequent view action", async () => {
  const journeys = await readFile(new URL("../../tools/table-focused-acceptance.mjs", import.meta.url), "utf8");
  assert.match(journeys, /await target\.press\(key\);\s*const focus = retainFocus \? await frame\.locator\(selector\)\.evaluate\(focusObservation\)/);
  assert.match(journeys, /if \(requireVisibleFocus\) assertReorderFocusVisible\(focus\)/);
  assert.match(journeys, /await act\("Reorder "[\s\S]*?\}, "Enter", true, true\);/);
  assert.match(journeys, /await move\("surface", "surface_order"\);/);
  assert.match(journeys, /await move\("asset", "shared_asset_order"\);/);
});

import assert from "node:assert/strict";

// Supplemental acceptance only. PR326 retains the broad initial/media/model evidence.
export const reportReceiver = "collaboration/initiative-costing-calculator/index.html";
export const resultCaptions = [
  "Decision-changing measures", "Commercial cohort and price realization",
  "Lifecycle event graph", "Incremental alternatives", "Discount sensitivity, same cash flows",
  "Service budget and capacity", "Cost-consequence view", "Shared domain and record contract",
];

export function acceptancePlan(families, { familyId = "all", caseId = null } = {}) {
  assert(["all", "shared", "investment"].includes(familyId), "Acceptance covers only #316/#317");
  const specifications = [
    { id: "shared-acceptance-view-320", familyId: "shared", width: 320, parent: true, journey: "shared-view", visits: 2 },
    { id: "investment-acceptance-reach-320", familyId: "investment", width: 320, parent: true, journey: "studio-reach", visits: 2 },
    { id: "investment-acceptance-report-390", familyId: "investment", width: 390, parent: false, journey: "studio-report", visits: 3 },
  ];
  const cases = specifications.filter(item => (familyId === "all" || item.familyId === familyId) && (!caseId || item.id === caseId))
    .map(({ familyId: name, ...item }) => {
      const family = families.find(candidate => candidate.id === name);
      assert(family, "The established harness owns the requested family");
      return { ...item, family, variant: item.parent ? "parent" : "source", media: "screen", script: true, enlarged: false };
    });
  assert(cases.length, "Requested acceptance case exists in the selected family");
  for (const item of cases) item.screenshotLabels = item.journey === "shared-view"
    ? ["shared-select-focus", "shared-view-result"] : item.journey === "studio-reach"
      ? ["studio-keyboard-right-edge", "studio-pointer-right-edge"]
      : ["studio-accepted-state", "executed-studio-state-report"];
  return { cases, expected: cases.map(item => item.id), browserLaunches: 1,
    documentVisits: cases.reduce((total, item) => total + item.visits, 0),
    boundary: "Local packaged composition; external resources empty; no hosted, cross-engine, print, research, or blanket Issue closure." };
}

export function assertAcceptanceRecord(record, planned) {
  assert(planned && record && typeof record === "object");
  const result = record.result;
  assert(result && typeof result === "object");
  for (const key of ["id", "journey", "width", "variant", "media", "script", "parent"]) {
    assert.equal(result[key], planned[key], "Published case matches trusted plan: " + key);
  }
  assert.equal(record.id, planned.id);
  assert(Array.isArray(result.checks) && result.checks.length > 0);
  assert(result.checks.every(check => typeof check.name === "string" && check.name && typeof check.pass === "boolean"));
  assert(Array.isArray(result.errors) && result.errors.every(error => typeof error === "string"));
  assert.equal(result.standing, result.checks.every(check => check.pass) && !result.errors.length ? "pass" : "review");
  assert(Array.isArray(result.screenshots));
  assert.deepEqual(result.screenshots.map(image => image.label).sort(), [...planned.screenshotLabels].sort());
  for (const screenshot of result.screenshots) {
    assert(typeof screenshot.path === "string" && screenshot.path.startsWith(".visual-runs/") && !screenshot.path.split("/").includes(".."));
    assert(/^[a-f0-9]{64}$/.test(screenshot.sha256));
    assert.equal(record.dependencies[screenshot.path], screenshot.sha256);
  }
  for (const owner of [planned.family.source, planned.parent && planned.family.parent,
    planned.journey === "studio-report" && reportReceiver].filter(Boolean)) {
    assert(/^[a-f0-9]{64}$/.test(record.dependencies[owner]), "Declared source dependency: " + owner);
  }
}


// A visit is an observed committed document, not an inferred popup or a served response.
// Frame identity plus timeOrigin distinguishes reloads without counting repeated observations.
export function createDocumentAccounting() {
  const documents = new WeakMap();
  let servedHtmlNavigations = 0, documentVisits = 0, blobDocumentVisits = 0;
  return {
    servedHtml() { servedHtmlNavigations++; },
    visit(frame, { protocol, timeOrigin }) {
      if (!["http:", "https:", "blob:"].includes(protocol)) return false;
      assert(Number.isFinite(timeOrigin) && timeOrigin > 0, "A committed document has a real time origin");
      let seen = documents.get(frame);
      if (!seen) { seen = new Set(); documents.set(frame, seen); }
      const identity = protocol + ":" + timeOrigin;
      if (seen.has(identity)) return false;
      seen.add(identity); documentVisits++;
      if (protocol === "blob:") blobDocumentVisits++;
      return true;
    },
    snapshot: () => ({ servedHtmlNavigations, documentVisits, blobDocumentVisits }),
  };
}

// perform owns persistence of the completed case; later cases never reach browser work.
export async function runAcceptanceCases(planned, perform, persistUnrun) {
  let stoppedAfterCase = null;
  for (const item of planned) {
    if (stoppedAfterCase) {
      await persistUnrun({
        id: item.id, journey: item.journey, width: item.width, variant: item.variant,
        media: item.media, script: item.script, parent: item.parent,
        standing: "incomplete", attempted: false, checks: [], errors: [], screenshots: [],
        reason: "Not run after first failing case: " + stoppedAfterCase,
      });
      continue;
    }
    let result;
    try { result = await perform(item); }
    catch (error) {
      result = { id: item.id, standing: "incomplete", attempted: true, error: error.message };
      await persistUnrun(result);
    }
    assert.equal(result.id, item.id, "The performed case retains its planned identity");
    assert(["pass", "review", "incomplete"].includes(result.standing));
    if (result.standing !== "pass") stoppedAfterCase = item.id;
  }
  return stoppedAfterCase;
}

export function assertAcceptedCustomerEdit(projection) {
  assert.equal(projection.state.inputs.newCustomers, "40", "Accepted raw input remains a string");
  assert.equal(projection.result.metrics.cac.value, 250, "The derived metric uses the entered amount");
}

export function assertRouteReadout(readout, expectedText) {
  assert.equal(readout.text, "Current route: " + expectedText);
  assert.equal(readout.whiteSpace, "normal");
  assert.equal(readout.overflowWrap, "anywhere");
  assert(readout.width > 0 && readout.scrollWidth <= readout.clientWidth + 1, "Full literal route fits its wrapping readout");
  assert(readout.left >= -1 && readout.right <= readout.viewportWidth + 1, "Route readout remains in the actual child width");
}

export function activeView(state) {
  const view = state.view_state.views.find(item => item.id === state.view_state.active_view_id);
  assert(view, "Active view has a stable identity");
  return view;
}

function intrinsicState(state) {
  const result = structuredClone(state);
  for (const cell of result.shared_surface_priority_map.heatmap_cells) {
    delete cell.composite_intensity;
    delete cell.visible_in_active_view;
  }
  for (const asset of result.shared_surface_priority_map.shared_assets) delete asset.visible_in_active_view;
  return result;
}

export function assertSharedTransition(before, after, changes) {
  const expected = intrinsicState(before);
  Object.assign(activeView(expected), changes);
  assert.deepEqual(intrinsicState(after), expected, "Only the intended active-view fields change; IDs, content, links and inactive views survive");
}

// Independent semantic minimum for the eight authored result tables in this seeded journey.
// Values may legitimately be blank, zero or explicit absence; native row meaning must remain.
function reportTableContracts(state) {
  for (const key of ["events", "alternatives", "serviceOutcomes"]) {
    assert(Array.isArray(state?.[key]) && state[key].length > 0, "The accepted journey populates " + key);
  }
  const basis = (state.inputs.currency || "currency unspecified") + " / " + state.inputs.period + "; " + state.origin;
  return [
    ["Decision-changing measures", ["Measure", "Value and standing"], [
      ["grr", "Gross revenue retention"], ["nrr", "Net revenue retention"], ["cac", "Customer acquisition cost"],
      ["expectedNpv", "Expected NPV"], ["budgetImpact", "Incremental service budget impact"],
    ]],
    ["Commercial cohort and price realization", ["Measure", "Result"], [
      ["logoRetention", "Customer retention, opening cohort"], ["closingCustomers", "Closing customers"],
      ["closingRevenue", "Closing recurring revenue"], ["grr", "GRR, opening cohort"], ["nrr", "NRR, opening cohort"],
      ["cac", "Acquisition spend / new customers"], ["acquisitionRevenueRatio", "Acquisition spend / new recurring revenue"],
      ["cacPayback", "Contribution-based acquisition payback"], ["discountAmount", "Per-unit discount"],
      ["netPrice", "Net price after discount and rebate"], ["unitContribution", "Net price less variable and service costs"],
    ]],
    ["Lifecycle event graph", ["Occurrence", "Stage", "Period", "Predecessors", "Standing"],
      state.events.map(event => [event.id, event.id])],
    ["Incremental alternatives", ["Choice", "Standing", "Cash flows from t=0", "NPV", "IRR per period", "Payback"],
      state.alternatives.map(alternative => [alternative.id, alternative.label])],
    ["Discount sensitivity, same cash flows", ["Alternative", "Rate minus 0.02", "Entered rate", "Rate plus 0.02"],
      state.alternatives.map(alternative => [alternative.id, alternative.id])],
    ["Service budget and capacity", ["Measure", "Result"], [
      ["adoptedPopulation", "Adopted population"], ["budgetImpact", "Incremental budget per period"],
      ["capacityGap", "Capacity gap"], ["costPerOutcome", "Reviewed incremental cost per outcome"],
    ]],
    ["Cost-consequence view", ["Dimension", "Unit", "Baseline", "Candidate", "Standing", "Change and evidence"],
      state.serviceOutcomes.map(outcome => ["Cost-consequence view: " + outcome.name + "; " + basis, outcome.name])],
    ["Shared domain and record contract", ["Domain", "Record types present"], [
      ["internal-investment", "internal-investment"], ["customer-implementation", "customer-implementation"],
      ["commercial-cohort", "commercial-cohort"], ["service-operational", "Service and operational value"],
      ["capital-allocation", "capital-allocation"],
    ]],
  ];
}

function assertNativeResultTable(table, headers, rows, side) {
  const label = side + ": " + table.caption;
  assert(Array.isArray(table.headers), label + " has native column headers");
  assert.deepEqual(table.headers, headers.map(text => ({ text, scope: "col" })), label + " preserves the authored column axes");
  assert(Array.isArray(table.rows), label + " has native body rows");
  assert.equal(table.rows.length, rows.length, label + " represents every expected record");
  assert.equal(new Set(rows.map(([identity]) => identity)).size, rows.length, label + " has distinct expected identities");
  rows.forEach(([identity, meaning], index) => {
    assert(typeof identity === "string" && identity.trim(), label + " has an expected stable identity");
    assert(typeof meaning === "string" && meaning.trim(), label + " has expected row meaning");
    const row = table.rows[index];
    assert(row && typeof row === "object", label + " has a row record");
    assert.equal(row.identity, identity, label + " retains row identity and order");
    assert(Array.isArray(row.cells), label + " has native cells");
    assert.equal(row.cells.length, headers.length, label + " has one cell per column");
    row.cells.forEach((cell, column) => {
      assert(cell && typeof cell === "object", label + " has a cell record");
      assert.equal(cell.tag, column === 0 ? "TH" : "TD", label + " retains native row/header cells");
      assert.equal(cell.scope, column === 0 ? "row" : null, label + " retains row-header scope");
      assert.equal(cell.label, headers[column], label + " retains the field's column meaning");
      assert.equal(typeof cell.text, "string", label + " carries literal text, including legitimate absence");
    });
    assert.equal(row.cells[0].text, meaning.trim(), label + " retains meaningful row-header text");
  });
}

export function assertReportParity(expected, actual) {
  assert.equal(actual.fingerprint, expected.fingerprint, "Report and accepted analysis identify the same revision");
  assert.deepEqual(actual.state, expected.state, "The executed report carries exact accepted state, not a draft");
  assert(Array.isArray(expected.tables) && Array.isArray(actual.tables), "Both observations contain table records");
  for (const [caption, headers, rows] of reportTableContracts(expected.state)) {
    const source = expected.tables.filter(table => table?.caption === caption);
    const report = actual.tables.filter(table => table?.caption === caption);
    assert.equal(source.length, 1, "One source result table: " + caption);
    assert.equal(report.length, 1, "One report result table: " + caption);
    assertNativeResultTable(source[0], headers, rows, "Studio");
    assertNativeResultTable(report[0], headers, rows, "Report");
    assert.deepEqual(report[0], source[0], "Native headers, row identities, literal values and standings agree: " + caption);
  }
}

// The driver only observes position. Its caller supplies actual keyboard/wheel input.
export async function driveHorizontal(read, advance, { edge = "end", limit = 80 } = {}) {
  assert(["start", "end"].includes(edge));
  let position = await read();
  const start = position.left;
  let actions = 0;
  const reached = () => edge === "start" ? position.left <= 2 : position.max - position.left <= 2;
  while (!reached() && actions < limit) {
    await advance();
    actions++;
    position = await read();
  }
  return { start, ...position, actions, reached: reached() };
}

async function reveal(locator) {
  // Setup only: disclosure behavior is not inferred from this operation.
  await locator.evaluate(element => {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === "DETAILS") parent.open = true;
    }
  });
  await locator.scrollIntoViewIfNeeded();
}

function focusObservation(element) {
  const style = getComputedStyle(element), rect = element.getBoundingClientRect();
  const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + Math.min(12, rect.height / 2));
  return {
    active: document.activeElement === element,
    focusVisible: element.matches(":focus-visible"),
    outline: style.outlineStyle + " " + style.outlineWidth + " " + style.outlineColor,
    shadow: style.boxShadow, width: rect.width, height: rect.height,
    unobscured: hit === element || element.contains(hit),
    name: element.labels ? [...element.labels].map(label => label.textContent.trim()).join(" ") : element.textContent.trim(),
  };
}

function semanticTables(root) {
  return [...root.querySelectorAll("table")].map(table => ({
    caption: table.caption?.textContent.trim() || "",
    headers: [...table.querySelectorAll("thead th")].map(cell => ({ text: cell.textContent.trim(), scope: cell.scope })),
    rows: [...table.querySelectorAll("tbody tr")].map(row => ({
      identity: row.dataset.recordKey || row.dataset.label || "",
      cells: [...row.cells].map(cell => ({ tag: cell.tagName, scope: cell.getAttribute("scope"),
        label: cell.dataset.label || "", text: cell.textContent.trim() })),
    })),
  }));
}

async function sharedJourney(frame, check, capture) {
  const state = () => frame.evaluate(() => window.sharedSurfacePriorityMap.getState());
  await frame.waitForFunction(() => Boolean(window.sharedSurfacePriorityMap));
  const initial = await state(), map = initial.shared_surface_priority_map;
  const selected = map.heatmap_cells.find(cell => cell.visible_in_active_view);
  assert(selected, "An actual visible priority cell is available");
  const cell = frame.locator('#tableEquivalent [data-select-cell="' + selected.id + '"]');
  await reveal(cell);
  await cell.click();
  const selectedState = await state();
  check("Selected cell identity", () => assert.equal(activeView(selectedState).selected_cell_id, selected.id));
  const select = frame.locator("#cell-route");
  await reveal(select);
  await select.focus();
  await select.press("Tab");
  await frame.page().keyboard.press("Shift+Tab");
  const selectFocus = await select.evaluate(focusObservation);
  const selectedLabel = await select.evaluate(element => element.selectedOptions[0]?.textContent || "");
  const selectLabel = await frame.locator("#cell-route-label").evaluate(element => {
    const style = getComputedStyle(element), rect = element.getBoundingClientRect();
    return { text: element.textContent, whiteSpace: style.whiteSpace, overflowWrap: style.overflowWrap,
      width: rect.width, left: rect.left, right: rect.right, viewportWidth: innerWidth,
      clientWidth: element.clientWidth, scrollWidth: element.scrollWidth };
  });
  check("Select name, target and keyboard focus", () => {
    assert(selectFocus.name && selectFocus.active && selectFocus.focusVisible && selectFocus.unobscured);
    assert(selectFocus.width >= 24 && selectFocus.height >= 24);
    assert(selectedLabel);
    assertRouteReadout(selectLabel, selectedLabel);
  }, { selectFocus, selectLabel });
  const reason = frame.locator("#cell-reason");
  const originalReason = await reason.inputValue();
  const editedReason = originalReason + " [focused acceptance]";
  await reason.fill(editedReason);
  await reason.press("Shift+Tab");
  const editedState = await state();
  const editedFocus = await select.evaluate(focusObservation);
  check("Inspector edit commits while native backward Tab reaches the same route control", () => {
    const expected = structuredClone(selectedState);
    expected.shared_surface_priority_map.heatmap_cells.find(item => item.id === selected.id).reason = editedReason;
    assert.deepEqual(editedState, expected);
    assert(editedFocus.active && editedFocus.focusVisible);
  }, editedFocus);
  await reason.fill(originalReason);
  await reason.press("Shift+Tab");
  const restoredState = await state();
  check("Inspector restoration preserves the exact selected and orthogonal state", () => assert.deepEqual(restoredState, selectedState));
  await capture("shared-select-focus");

  const inspectNative = async () => {
    const current = await state(), view = activeView(current), body = current.shared_surface_priority_map;
    const observed = await frame.locator("#tableEquivalent table").evaluate(table => ({
      caption: table.caption.textContent.trim(),
      columns: [...table.tHead.rows[0].cells].map(cell => ({ tag: cell.tagName, scope: cell.scope, text: cell.textContent.trim() })),
      rows: [...table.tBodies[0].rows].map(row => ({ label: row.cells[0].firstChild.textContent.trim(),
        header: row.cells[0].tagName + ":" + row.cells[0].scope,
        cells: [...row.querySelectorAll("[data-select-cell]")].map(button => button.dataset.selectCell) })),
      group: { scope: table.tBodies[1].rows[0].cells[0].scope, span: table.tBodies[1].rows[0].cells[0].colSpan },
      assets: [...table.tBodies[1].rows].slice(1).map(row => ({
        header: row.cells[0].tagName + ":" + row.cells[0].scope, span: row.cells[1].colSpan,
        id: row.querySelector("[data-select-asset]").dataset.selectAsset })),
    }));
    const registry = await frame.locator("#identityRegistry tbody tr").evaluateAll(rows => rows.map(row => ({
      id: row.cells[2].textContent.trim(), header: row.cells[1].tagName + ":" + row.cells[1].scope,
    })));
    check("Native complex headers and visible stable identities", () => {
      const stages = view.stage_order.filter(id => !view.hidden_stage_ids.includes(id));
      const surfaces = view.surface_order.filter(id => !view.hidden_surface_ids.includes(id));
      assert.equal(observed.caption, "Shared surface priority comparison");
      assert.deepEqual(observed.columns.map(cell => cell.text), ["Surface / Stage", ...stages.map(id => body.stages.find(item => item.id === id).label)]);
      assert(observed.columns.every(cell => cell.tag === "TH" && cell.scope === "col"));
      assert.deepEqual(observed.rows, surfaces.map(id => ({ label: body.surfaces.find(item => item.id === id).label,
        header: "TH:row", cells: stages.map(stage => body.heatmap_cells.find(cell => cell.surface_id === id && cell.stage_id === stage).id) })));
      assert.deepEqual(observed.group, { scope: "rowgroup", span: stages.length + 1 });
      assert.deepEqual(observed.assets, view.shared_asset_order.filter(id => !view.hidden_shared_asset_ids.includes(id))
        .map(id => ({ id, header: "TH:row", span: stages.length })));
      assert.deepEqual(registry.map(row => row.id), [...view.stage_order, ...view.surface_order, ...view.shared_asset_order]);
      assert(registry.every(row => row.header === "TH:row"));
    });
  };
  await inspectNative();
  const act = async (label, selector, changes, key = "Enter", retainFocus = true) => {
    const before = await state(), target = frame.locator(selector);
    await reveal(target); await target.focus(); await target.press(key);
    const after = await state();
    check(label + ": orthogonal state", () => assertSharedTransition(before, after, changes(activeView(before), before)));
    if (retainFocus) {
      const focus = await frame.locator(selector).evaluate(focusObservation);
      check(label + ": control focus after render", () => assert(focus.active && focus.focusVisible), focus);
    }
    await inspectNative();
  };
  const view = activeView(selectedState);
  const basis = view.active_intensity_basis_ids[0];
  assert(view.active_intensity_basis_ids.length > 1, "A basis can be filtered independently");
  await act("Basis filter", '[data-basis-toggle="' + basis + '"]',
    v => ({ active_intensity_basis_ids: v.active_intensity_basis_ids.filter(id => id !== basis) }), "Space");
  const stage = view.stage_order.find(id => id !== selected.stage_id);
  const surface = view.surface_order.find(id => id !== selected.surface_id);
  const asset = view.shared_asset_order.at(-1);
  for (const [kind, id, field] of [["stage", stage, "hidden_stage_ids"], ["surface", surface, "hidden_surface_ids"], ["asset", asset, "hidden_shared_asset_ids"]]) {
    await act("Hide " + kind, '[data-hide-' + kind + '="' + id + '"]',
      v => ({ [field]: [...v[field], id] }), "Enter", false);
  }
  const move = async (kind, field) => {
    const current = activeView(await state()), id = current[field][0];
    await act("Reorder " + kind, '[data-move-' + kind + '="' + id + '"][data-dir="1"]', v => {
      const order = [...v[field]]; [order[0], order[1]] = [order[1], order[0]]; return { [field]: order };
    });
  };
  await move("surface", "surface_order");
  await move("asset", "shared_asset_order");
  const reset = (_view, source) => ({
    surface_order: [...source.shared_surface_priority_map.surfaces].sort((a, b) => a.canonical_order - b.canonical_order).map(item => item.id),
    shared_asset_order: [...source.shared_surface_priority_map.shared_assets].sort((a, b) => a.canonical_order - b.canonical_order).map(item => item.id),
  });
  await act("Reset order while filters remain", "#resetOrderBtn", reset);
  await move("surface", "surface_order");
  await act("Show all preserves order and basis", "#showAllBtn",
    () => ({ hidden_stage_ids: [], hidden_surface_ids: [], hidden_shared_asset_ids: [] }));
  await capture("shared-view-result");
}

async function reachJourney(frame, page, check, capture) {
  await frame.waitForFunction(() => Boolean(window.crossFunctionalInvestmentModelStudio && window.investmentAnalysis));
  const saved = await frame.evaluate(() => ({ studio: window.crossFunctionalInvestmentModelStudio.getState(), analysis: window.investmentAnalysis.serialize() }));
  const table = frame.locator(".equivalent-table").first(), region = table.locator("..");
  await reveal(region);
  const summary = region.locator("..").locator("summary");
  await summary.focus(); await summary.press("Tab");
  const focus = await region.evaluate(focusObservation);
  check("Keyboard enters named original Activity-Based scroll region", () => {
    assert(focus.active && focus.focusVisible);
  }, focus);
  const read = () => region.evaluate(element => {
    const last = element.querySelector("tbody tr").lastElementChild.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return { left: element.scrollLeft, max: element.scrollWidth - element.clientWidth,
      rightmostVisible: last.right <= box.left + element.clientLeft + element.clientWidth + 2,
      client: element.clientWidth, caption: element.querySelector("caption").textContent.trim() };
  });
  const initial = await read();
  check("Real overflow starts at the leading edge", () => assert(initial.max > 0 && initial.left <= 2), initial);
  const arrow = async key => { await page.keyboard.press(key); await page.waitForTimeout(80); };
  const keyboard = await driveHorizontal(read, () => arrow("ArrowRight"));
  check("Keyboard reaches rightmost column without position assignment", () => assert(keyboard.actions > 0 && keyboard.reached && keyboard.rightmostVisible), keyboard);
  await capture("studio-keyboard-right-edge");
  const returned = await driveHorizontal(read, () => arrow("ArrowLeft"), { edge: "start" });
  check("Keyboard returns to leading edge", () => assert(returned.reached), returned);
  await region.hover({ position: { x: Math.max(8, initial.client / 2), y: 20 } });
  const pointer = await driveHorizontal(read, async () => { await page.mouse.wheel(180, 0); await page.waitForTimeout(80); });
  check("Pointer wheel reaches rightmost column without position assignment", () => assert(pointer.actions > 0 && pointer.reached && pointer.rightmostVisible), pointer);
  await capture("studio-pointer-right-edge");
  const after = await frame.evaluate(() => ({ studio: window.crossFunctionalInvestmentModelStudio.getState(), analysis: window.investmentAnalysis.serialize() }));
  check("Scroll input preserves selected method and accepted analysis", () => assert.deepEqual(after, saved));
}

async function reportJourney(frame, page, context, origin, check, capture, observeDocument) {
  await frame.waitForFunction(() => Boolean(window.investmentAnalysis));
  const tab = frame.locator('[role="tab"][data-model-id]').last();
  await tab.click();
  const instruction = await frame.locator("#modelPanel pre.prompt-capsule").textContent();
  const model = await frame.evaluate(() => window.crossFunctionalInvestmentModelStudio.getState());
  const label = frame.locator("#analysis-label");
  await reveal(label);
  const literal = 'Focused acceptance <em>literal</em> & "comparison"';
  await label.fill(literal);
  const customers = frame.locator("#analysis-newCustomers");
  await reveal(customers);
  const disclosures = await frame.locator("[data-investment-analysis] details").evaluateAll(nodes => nodes.map(node => node.open));
  await customers.fill("");
  const unavailable = await frame.evaluate(() => window.investmentAnalysis.getResult().metrics.cac.status);
  check("Blank is an unavailable accepted amount", () => assert.equal(unavailable, "unavailable"));
  await customers.fill("40");
  const accepted = await frame.evaluate(() => window.investmentAnalysis.getProjection());
  const active = await customers.evaluate(element => document.activeElement === element);
  const retainedDisclosures = await frame.locator("[data-investment-analysis] details").evaluateAll(nodes => nodes.map(node => node.open));
  const afterModel = await frame.evaluate(() => window.crossFunctionalInvestmentModelStudio.getState());
  const afterInstruction = await frame.locator("#modelPanel pre.prompt-capsule").textContent();
  check("Accepted edit preserves active editor, disclosures and requested instruction", () => {
    assert(active); assert.deepEqual(retainedDisclosures, disclosures);
    assert.deepEqual(afterModel, model); assert.equal(afterInstruction, instruction);
    assert.equal(accepted.state.method, model.activeModelId);
    assertAcceptedCustomerEdit(accepted);
  });
  const tables = (await frame.locator("[data-investment-analysis]").evaluate(semanticTables)).filter(table => resultCaptions.includes(table.caption));
  const capsule = await frame.evaluate(() => window.crossFunctionalInvestmentModelStudio.promptCapsuleStateProjection());
  const visibleFingerprint = await frame.locator("[data-investment-analysis]").getAttribute("data-state-fingerprint");
  check("Accepted projection, visible result owner and capsule agree", () => {
    assert.deepEqual(capsule.investmentAnalysis, accepted);
    assert.equal(visibleFingerprint, accepted.fingerprint);
  });
  const editor = frame.locator("#analysis-events");
  await reveal(editor); await editor.fill("[");
  const retained = await frame.evaluate(() => window.investmentAnalysis.getProjection());
  check("Pending matrix draft does not enter accepted outputs", () => assert.deepEqual(retained, accepted));
  await frame.locator('[data-action="export"]').click();
  const exported = await frame.locator("#analysis-exchange").inputValue();
  check("Visitor export contains exact accepted state", () => assert.deepEqual(JSON.parse(exported), accepted.state));
  await capture("studio-accepted-state");

  // The Studio supplies the accepted state; the calculator owns the visitor report action.
  const receiver = await context.newPage();
  try {
    await receiver.goto(origin + "/" + reportReceiver, { waitUntil: "load" });
    await observeDocument(receiver.mainFrame());
    await receiver.waitForFunction(() => Boolean(window.investmentAnalysis));
    const exchange = receiver.locator("#analysis-exchange");
    await reveal(exchange); await exchange.fill(exported);
    await receiver.locator('[data-action="import-text"]').click();
    const received = await receiver.evaluate(() => window.investmentAnalysis.getProjection());
    check("Report receiver accepts Studio state without semantic change", () => assert.deepEqual(received, accepted));
    const popup = context.waitForEvent("page", { timeout: 10000 });
    await receiver.getByRole("button", { name: "Open report in a new tab", exact: true }).click();
    const report = await popup;
    try {
      await report.waitForLoadState("domcontentloaded");
      await report.locator(".investment-report").waitFor();
      await observeDocument(report.mainFrame());
      const actual = {
        fingerprint: await report.locator(".investment-report").getAttribute("data-state-fingerprint"),
        state: JSON.parse(await report.locator("#report-analysis-inspection-title").locator("..").locator("pre").textContent()),
        tables: await report.locator(".investment-report").evaluate(semanticTables),
      };
      check("Executed report matches all eight accepted result tables and exact state", () => assertReportParity({ ...accepted, tables }, actual));
      const literalText = await report.locator(".investment-report").textContent();
      const unsafeMarkup = await report.locator(".investment-report em").count();
      const scriptCount = await report.locator("script").count();
      check("Report keeps literal text literal and runs no scripts", () => {
        assert(literalText.includes(literal)); assert.equal(unsafeMarkup, 0); assert.equal(scriptCount, 0);
      });
      await report.locator("#report-investment-title").scrollIntoViewIfNeeded();
      await capture("executed-studio-state-report", report);
      await label.fill("A later Studio revision");
      const later = await frame.evaluate(() => window.investmentAnalysis.fingerprint());
      const reportFingerprint = await report.locator(".investment-report").getAttribute("data-state-fingerprint");
      check("Opened report remains the captured accepted revision", () => {
        assert.notEqual(later, accepted.fingerprint); assert.equal(reportFingerprint, accepted.fingerprint);
      });
    } finally { await report.close(); }
  } finally { await receiver.close(); }
}

export async function runFocusedAcceptance({ journey, frame, page, context, origin, capture, observeDocument }) {
  const checks = [];
  const check = (name, assertion, evidence = null) => {
    try { assertion(); checks.push({ name, pass: true, evidence }); }
    catch (error) { checks.push({ name, pass: false, message: error.message, evidence }); }
  };
  if (journey === "shared-view") await sharedJourney(frame, check, capture);
  else if (journey === "studio-reach") await reachJourney(frame, page, check, capture);
  else if (journey === "studio-report") await reportJourney(frame, page, context, origin, check, capture, observeDocument);
  else throw new Error("Unknown acceptance journey");
  return { journey, checks, standing: checks.every(check => check.pass) ? "pass" : "review",
    boundary: "Assertions plus retained screenshots; screenshots require human paint/overlap review. No broad-layout or research claim." };
}

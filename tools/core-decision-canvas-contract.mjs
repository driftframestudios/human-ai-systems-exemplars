#!/usr/bin/env node

import assert from "node:assert/strict";

import { chromium } from "@playwright/test";

import {
  assertTelemetry,
  coreProjections as projections,
  openFresh,
  startStaticServer,
  textJson,
  valueJson
} from "./core-architecture-browser-helper.mjs";

const artifactNames = {
  impact: "impact-map-chimeric-prototype-v0.1.1.html",
  service: "service-design-blueprint-chimeric-prototype-v0.2.html",
  heart: "heart-chart-chimeric-prototype-v0.1.2.html",
  specification: "specification-by-example-chimeric-prototype-v0.1.1.html"
};
const checks = [];
const failures = [];

async function verify(label, callback) {
  try {
    await callback();
    checks.push({ label, status: "passed" });
  } catch (error) {
    const message = error?.stack || error?.message || String(error);
    checks.push({ label, status: "failed", message });
    failures.push(`${label}: ${message}`);
  }
}

async function impactPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route);
  try {
    const initial = await textJson(page, "#jsonOut");
    const actor = initial.impact_map.actors[0];
    const impact = actor.impacts[0];
    const discoverable = impact.discoverables[0];
    assert.ok(actor.id && impact.id && discoverable.id, "Impact hierarchy should expose stable actor, impact, and discoverable IDs");
    assert.equal(await page.locator(`[data-node-id="${actor.id}"]`).count(), 1);
    assert.equal(await page.locator(`[data-node-id="${impact.id}"]`).count(), 1);
    assert.equal(await page.locator(`[data-node-id="${discoverable.id}"]`).count(), 1);

    const literal = "Reviewer <img src=x onerror=globalThis.__coreProbe=1> & collaborator";
    await page.locator(`input[data-kind="actor"][data-actor-index="0"]`).fill(literal);
    const edited = await textJson(page, "#jsonOut");
    assert.equal(edited.impact_map.actors[0].id, actor.id);
    assert.equal(edited.impact_map.actors[0].impacts[0].id, impact.id);
    assert.equal(edited.impact_map.actors[0].impacts[0].discoverables[0].id, discoverable.id);
    assert.equal(edited.impact_map.actors[0].text, literal);
    assert.equal(await page.locator("#traceTable tbody tr").first().locator("td").nth(1).textContent(), literal);
    assert.match(await page.locator(`[data-node-id="${actor.id}"]`).textContent(), /Reviewer <img/);
    assert.equal(await page.evaluate(() => globalThis.__coreProbe), undefined);

    const compatible = structuredClone(edited);
    const importedText = "Imported discoverable <strong>stays literal</strong>";
    compatible.impact_map.actors[0].impacts[0].discoverables[0].text = importedText;
    await page.locator("#jsonImport").fill(JSON.stringify(compatible));
    await page.locator("#importJsonBtn").click();
    assert.match(await page.locator("#importNotice").textContent(), /Impact Map imported/);
    const imported = await textJson(page, "#jsonOut");
    assert.equal(imported.impact_map.actors[0].text, literal);
    assert.equal(imported.impact_map.actors[0].impacts[0].discoverables[0].text, importedText);

    const sentinel = "Impact recovery sentinel";
    await page.locator(`input[data-kind="actor"][data-actor-index="0"]`).fill(sentinel);
    const retainedId = (await textJson(page, "#jsonOut")).impact_map.actors[0].id;
    const invalid = structuredClone(compatible);
    invalid.impact_map.actors[0].impacts = "unavailable hierarchy";
    await page.locator("#jsonImport").fill(JSON.stringify(invalid));
    await page.locator("#importJsonBtn").click();
    assert.match(await page.locator("#importNotice").textContent(), /current Impact Map remains available/i);
    const recovered = await textJson(page, "#jsonOut");
    assert.equal(recovered.impact_map.actors[0].id, retainedId);
    assert.equal(recovered.impact_map.actors[0].text, sentinel);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function servicePath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route);
  try {
    const initial = await textJson(page, "#jsonOut");
    const blueprint = initial.service_blueprint;
    assert.equal(blueprint.cells.length, blueprint.stages.length * blueprint.layers.length, "Every stage × layer pair should own one cell");
    const pairKeys = new Set(blueprint.cells.map(cell => `${cell.layer_id}::${cell.stage_id}`));
    assert.equal(pairKeys.size, blueprint.cells.length, "Stage × layer cell identity should stay unique");
    for (const layer of blueprint.layers.filter(candidate => candidate.required)) {
      assert.equal(await page.locator(`[data-action="remove-layer"][data-id="${layer.id}"]`).isDisabled(), true, `${layer.id} should remain required`);
    }

    await page.locator("#addStage").click();
    await page.locator("#addLayer").click();
    const expanded = await textJson(page, "#jsonOut");
    assert.equal(expanded.service_blueprint.cells.length, expanded.service_blueprint.stages.length * expanded.service_blueprint.layers.length, "Adding a stage and layer should complete their cell intersections");

    const cellId = initial.view_state.views[0].selected_cell_id;
    assert.ok(blueprint.cells.some(cell => cell.id === cellId), "The initial focus view should select a current stage × layer cell");
    const literal = "Visible <img src=x onerror=globalThis.__coreProbe=1> service consequence";
    await page.locator(`[data-action="select-cell"][data-id="${cellId}"]`).click();
    await page.locator("#cellText").fill(literal);
    await page.locator("#cellText").blur();
    const edited = await textJson(page, "#jsonOut");
    const editedCell = edited.service_blueprint.cells.find(cell => cell.id === cellId);
    assert.equal(editedCell.text, literal);
    assert.ok(editedCell.asset_ids.length > 0, "The selected cell should retain linked shared assets");
    for (const assetId of editedCell.asset_ids) {
      const asset = edited.service_blueprint.shared_assets.find(candidate => candidate.id === assetId);
      assert.ok(asset?.supported_cell_ids.includes(cellId), `${assetId} should derive its linked cell`);
    }
    assert.match(await page.locator(`[data-action="select-cell"][data-id="${cellId}"] .cell-preview`).textContent(), /Visible <img/);
    assert.equal(await page.evaluate(() => globalThis.__coreProbe), undefined);

    await page.locator('[data-action="hide-stage"][data-id="stage-intake"]').click();
    const focused = await textJson(page, "#jsonOut");
    assert.ok(focused.view_state.views[0].hidden_stage_ids.includes("stage-intake"));
    assert.ok(focused.service_blueprint.stages.some(stage => stage.id === "stage-intake"));
    assert.ok(focused.service_blueprint.cells.filter(cell => cell.stage_id === "stage-intake").every(cell => cell.visible_in_active_view === false));
    await page.locator('[data-action="show-stage"][data-id="stage-intake"]').click();

    const compatible = await textJson(page, "#jsonOut");
    await page.locator("#jsonIn").fill(JSON.stringify(compatible));
    await page.locator("#importJson").click();
    assert.match(await page.locator("#importNotice").textContent(), /Service-design Blueprint imported/);

    const sentinel = "Service recovery sentinel";
    await page.locator(`[data-action="select-cell"][data-id="${cellId}"]`).click();
    await page.locator("#cellText").fill(sentinel);
    await page.locator("#cellText").blur();
    const invalid = structuredClone(await textJson(page, "#jsonOut"));
    invalid.artifact_identity.display_name = "Mutated before validation";
    invalid.view_state = { active_view_id: "missing-view", views: [] };
    await page.locator("#jsonIn").fill(JSON.stringify(invalid));
    await page.locator("#importJson").click();
    assert.match(await page.locator("#importNotice").textContent(), /current Service-design Blueprint remains available/i);
    const recovered = await textJson(page, "#jsonOut");
    assert.equal(recovered.artifact_identity.display_name, compatible.artifact_identity.display_name);
    assert.equal(recovered.service_blueprint.cells.find(cell => cell.id === cellId).text, sentinel);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function heartPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route);
  try {
    for (const width of [1280, 800]) {
      await page.setViewportSize({ width, height: 1000 });
      const containment = await page.evaluate(() => {
        const root = document.documentElement;
        const editTable = document.querySelector("#editTable");
        return {
          rootClientWidth: root.clientWidth,
          rootScrollWidth: root.scrollWidth,
          tableClientWidth: editTable.clientWidth,
          tableScrollWidth: editTable.scrollWidth
        };
      });
      assert.ok(
        containment.rootScrollWidth <= containment.rootClientWidth,
        `HEART page should keep two-dimensional overflow local at ${width}px`
      );
      assert.ok(
        containment.tableScrollWidth > containment.tableClientWidth,
        `HEART editable matrix should retain its local horizontal scroll region at ${width}px`
      );
    }
    await page.setViewportSize({ width: 1440, height: 1000 });

    const initial = await valueJson(page, "#jsonExport");
    const view = initial.view_state.views[0];
    const firstId = view.row_order[0];
    const secondId = view.row_order[1];
    const literal = "Metric <img src=x onerror=globalThis.__coreProbe=1> remains contextual";
    const route = "Recovery Routing Atlas";
    const routeReason = "Route <strong>signal strain</strong> through a visible recovery path";
    await page.locator(`[data-field="metric"][data-row-id="${firstId}"]`).fill(literal);
    await page.locator(`[data-field="handoff"][data-row-id="${firstId}"]`).selectOption(route);
    await page.locator(`[data-field="reason"][data-row-id="${firstId}"]`).fill(routeReason);
    const edited = await valueJson(page, "#jsonExport");
    const editedRow = edited.heart_chart.rows.find(row => row.id === firstId);
    assert.equal(editedRow.metric, literal);
    assert.equal(editedRow.handoff, route);
    assert.equal(editedRow.reason, routeReason);
    for (const field of ["category", "goal", "signal", "metric", "status", "handoff", "reason"]) {
      assert.equal(await page.locator(`[data-field="${field}"][data-row-id="${firstId}"]`).inputValue(), editedRow[field]);
    }
    const readableRow = page.locator("#readableTable tr").filter({ hasText: firstId });
    assert.match(await readableRow.textContent(), /Metric <img src=x/);
    assert.match(await readableRow.textContent(), /Recovery Routing Atlas/);
    assert.match(await page.locator("#inspector").textContent(), /Route <strong>signal strain<\/strong> through a visible recovery path/);
    assert.equal(await page.evaluate(() => globalThis.__coreProbe), undefined);

    await page.locator(`[data-action="move-down"][data-row-id="${firstId}"]`).click();
    const reordered = await valueJson(page, "#jsonExport");
    assert.deepEqual(reordered.view_state.views[0].row_order.slice(0, 2), [secondId, firstId]);
    assert.equal(reordered.heart_chart.rows.find(row => row.id === firstId).id, firstId);

    await page.locator(`[data-action="hide-row"][data-row-id="${firstId}"]`).click();
    const focused = await valueJson(page, "#jsonExport");
    assert.ok(focused.view_state.views[0].hidden_row_ids.includes(firstId));
    assert.equal(focused.heart_chart.rows.find(row => row.id === firstId).visible_in_active_view, false);
    await page.locator(`[data-action="show-row"][data-row-id="${firstId}"]`).click();

    const compatible = await valueJson(page, "#jsonExport");
    await page.locator("#jsonImport").fill(JSON.stringify(compatible));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importMessage").textContent(), /HEART Chart imported/);
    const imported = await valueJson(page, "#jsonExport");
    const importedRow = imported.heart_chart.rows.find(row => row.id === firstId);
    assert.equal(importedRow.metric, literal);
    assert.equal(importedRow.handoff, route);
    assert.equal(importedRow.reason, routeReason);
    assert.equal(new Set(imported.view_state.views[0].row_order).size, imported.heart_chart.rows.length);

    const sentinel = "HEART recovery sentinel";
    await page.locator(`[data-field="goal"][data-row-id="${firstId}"]`).fill(sentinel);
    const invalidRoute = structuredClone(await valueJson(page, "#jsonExport"));
    invalidRoute.heart_chart.rows.find(row => row.id === firstId).handoff = { unexpected: true };
    await page.locator("#jsonImport").fill(JSON.stringify(invalidRoute));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importMessage").textContent(), /current HEART Chart remains available/i);
    let recovered = await valueJson(page, "#jsonExport");
    assert.equal(recovered.heart_chart.rows.find(row => row.id === firstId).goal, sentinel);
    assert.equal(recovered.heart_chart.rows.find(row => row.id === firstId).handoff, route);

    const invalidOrder = structuredClone(recovered);
    invalidOrder.view_state.views[0].row_order = [firstId, firstId, ...invalidOrder.view_state.views[0].row_order.filter(id => id !== firstId)];
    await page.locator("#jsonImport").fill(JSON.stringify(invalidOrder));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importMessage").textContent(), /current HEART Chart remains available/i);
    recovered = await valueJson(page, "#jsonExport");
    assert.equal(recovered.heart_chart.rows.find(row => row.id === firstId).goal, sentinel);
    assert.equal(new Set(recovered.view_state.views[0].row_order).size, recovered.heart_chart.rows.length);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function specificationPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route);
  try {
    const initial = await valueJson(page, "#jsonOut");
    const ruleIds = new Set(initial.specification_by_example.rules.map(rule => rule.id));
    assert.ok(initial.specification_by_example.scenarios.every(scenario => ruleIds.has(scenario.rule_id)), "Every scenario should belong to a current rule");
    assert.ok(initial.specification_by_example.scenarios.every(scenario => typeof scenario.given === "string" && typeof scenario.when === "string" && typeof scenario.then === "string"), "Every scenario should retain Given / When / Then text");

    const view = initial.view_state.views[0];
    const firstId = view.scenario_order[0];
    const secondId = view.scenario_order[1];
    const literal = "Then <img src=x onerror=globalThis.__coreProbe=1> appears as collaborator text";
    await page.locator(`[data-scenario-id="${firstId}"][data-field="then"]`).fill(literal);
    await page.locator(`[data-scenario-id="${firstId}"][data-field="then"]`).blur();
    const edited = await valueJson(page, "#jsonOut");
    assert.equal(edited.specification_by_example.scenarios.find(scenario => scenario.id === firstId).then, literal);
    assert.match(await page.locator("#scenarioText").textContent(), /Then <img src=x/);
    assert.equal(await page.evaluate(() => globalThis.__coreProbe), undefined);

    await page.locator(`[data-action="move-scenario"][data-id="${firstId}"][data-dir="1"]`).click();
    const reordered = await valueJson(page, "#jsonOut");
    assert.deepEqual(reordered.view_state.views[0].scenario_order.slice(0, 2), [secondId, firstId]);

    const ruleId = reordered.specification_by_example.scenarios.find(scenario => scenario.id === firstId).rule_id;
    await page.locator(`[data-action="hide-rule"][data-id="${ruleId}"]`).click();
    const focused = await valueJson(page, "#jsonOut");
    assert.ok(focused.view_state.views[0].hidden_rule_ids.includes(ruleId));
    assert.equal(focused.specification_by_example.scenarios.find(scenario => scenario.id === firstId).visible_in_active_view, false);
    await page.locator(`#hiddenRules [data-action="show-rule"][data-id="${ruleId}"]`).click();

    const compatible = await valueJson(page, "#jsonOut");
    await page.locator("#jsonImport").fill(JSON.stringify(compatible));
    await page.locator("#importJsonBtn").click();
    assert.match(await page.locator("#importNotice").textContent(), /Specification-by-Example imported/);
    const imported = await valueJson(page, "#jsonOut");
    assert.equal(imported.specification_by_example.scenarios.find(scenario => scenario.id === firstId).then, literal);

    const sentinel = "Specification recovery sentinel";
    await page.locator(`[data-scenario-id="${firstId}"][data-field="given"]`).fill(sentinel);
    await page.locator(`[data-scenario-id="${firstId}"][data-field="given"]`).blur();
    const invalid = structuredClone(await valueJson(page, "#jsonOut"));
    invalid.specification_by_example.scenarios[0].rule_id = "missing-rule";
    await page.locator("#jsonImport").fill(JSON.stringify(invalid));
    await page.locator("#importJsonBtn").click();
    assert.match(await page.locator("#importNotice").textContent(), /current Specification-by-Example remains available/i);
    const recovered = await valueJson(page, "#jsonOut");
    assert.equal(recovered.specification_by_example.scenarios.find(scenario => scenario.id === firstId).given, sentinel);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

const server = await startStaticServer();
const browser = await chromium.launch({ headless: true });
try {
  for (const projection of projections) {
    await verify(`${projection.label} · Impact Map hierarchy, exchange, literal text, and recovery`, () => impactPath(browser, server.origin, `${projection.root}/${artifactNames.impact}`));
    await verify(`${projection.label} · Service Blueprint cells, assets, focus, exchange, and recovery`, () => servicePath(browser, server.origin, `${projection.root}/${artifactNames.service}`));
    await verify(`${projection.label} · HEART rows, order, focus, exchange, and recovery`, () => heartPath(browser, server.origin, `${projection.root}/${artifactNames.heart}`));
    await verify(`${projection.label} · Specification rules, scenarios, order, exchange, and recovery`, () => specificationPath(browser, server.origin, `${projection.root}/${artifactNames.specification}`));
  }
} finally {
  await browser.close();
  await server.close();
}

for (const check of checks) {
  process.stdout.write(`${check.status === "passed" ? "PASS" : "FAIL"} ${check.label}\n`);
}
process.stdout.write(`Core decision-canvas browser contract: ${checks.length - failures.length}/${checks.length} passed.\n`);
if (failures.length) {
  process.stderr.write(`${failures.join("\n\n")}\n`);
  process.exitCode = 1;
}

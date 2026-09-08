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
  impact: "impact-map-chimeric-prototype-v0.1.4.html",
  service: "service-design-blueprint-chimeric-prototype-v0.2.4.html",
  heart: "heart-chart-chimeric-prototype-v0.1.6.html",
  specification: "specification-by-example-chimeric-prototype-v0.1.6.html"
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

async function exercisePromptCapsule(page, {
  apiName,
  copySelector,
  downloadSelector,
  filename,
  loopIds,
  promptSelector,
  stateContract,
  title,
  version,
}) {
  const initial = await page.evaluate(name => {
    const api = globalThis[name];
    return {
      contract: api.contract,
      fingerprint: api.promptCapsuleFingerprint(),
      frozen: Object.isFrozen(api),
      plain: api.promptCapsule(),
      explicitPlain: api.promptCapsuleMarkdown("plain"),
      projection: api.promptCapsuleStateProjection(),
      state: api.getState(),
      stateContract: api.stateContract,
      version: api.version,
      view: api.getPromptCapsuleView(),
    };
  }, apiName);
  assert.equal(initial.frozen, true);
  assert.deepEqual(
    [initial.version, initial.contract, initial.stateContract, initial.view],
    [version, "prompt-capsule/0.1.0", stateContract, "plain"],
  );
  assert.equal(initial.plain, initial.explicitPlain);
  assert.equal(await page.locator(promptSelector).textContent(), initial.plain);
  assert.match(initial.plain, new RegExp(`^# Prompt Capsule: ${title}\\n`, "u"));
  assert.ok(initial.plain.includes(`- Fingerprint: \`${initial.fingerprint}\``));
  assert.match(initial.plain, /## Related loops/u);
  assert.doesNotMatch(initial.plain, /## Skill assistance/u);
  assert.ok(initial.plain.endsWith("\n"));

  const loops = await page.locator("[data-prompt-related-loops]").evaluate(details => ({
    open: details.open,
    tag: details.tagName,
    ids: [...details.querySelectorAll("[data-related-loop-id]")].map(item => item.dataset.relatedLoopId),
  }));
  assert.deepEqual(loops, { open: false, tag: "DETAILS", ids: loopIds });
  const summary = page.locator("[data-prompt-related-loops] summary");
  await summary.focus();
  const summaryBox = await summary.boundingBox();
  assert.ok(summaryBox && summaryBox.height >= 44 && summaryBox.width >= 44);
  await summary.press("Enter");
  assert.equal(await page.locator("[data-prompt-related-loops]").evaluate(element => element.open), true);
  const firstLoopBox = await page.locator("[data-related-loop-id] a").first().boundingBox();
  assert.ok(firstLoopBox && firstLoopBox.height >= 44 && firstLoopBox.width >= 44);

  await page.locator('[data-prompt-view][value="skill-assisted"]').check();
  const assisted = await page.evaluate(name => {
    const api = globalThis[name];
    return {
      fingerprint: api.promptCapsuleFingerprint(),
      markdown: api.promptCapsuleMarkdown(),
      projection: api.promptCapsuleStateProjection(),
      view: api.getPromptCapsuleView(),
    };
  }, apiName);
  assert.equal(assisted.view, "skill-assisted");
  assert.equal(assisted.fingerprint, initial.fingerprint);
  assert.deepEqual(assisted.projection, initial.projection);
  assert.equal(await page.locator(promptSelector).textContent(), assisted.markdown);
  assert.match(assisted.markdown, /## Skill assistance/u);
  assert.match(assisted.markdown, /\.agents\/skills\/[a-z0-9-]+\/SKILL\.md/u);

  await page.evaluate(() => { globalThis.__coreClipboard = ""; });
  await page.locator(copySelector).click();
  await page.waitForFunction(() => Boolean(globalThis.__coreClipboard));
  assert.equal(await page.evaluate(() => globalThis.__coreClipboard), assisted.markdown);
  await page.evaluate(() => {
    const original = URL.createObjectURL.bind(URL);
    URL.createObjectURL = blob => {
      globalThis.__promptDownloadType = blob.type;
      return original(blob);
    };
  });
  const downloadPromise = page.waitForEvent("download");
  await page.locator(downloadSelector).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), filename);
  assert.equal(await page.evaluate(() => globalThis.__promptDownloadType), "text/markdown;charset=utf-8");
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  assert.equal(Buffer.concat(chunks).toString("utf8"), assisted.markdown);

  await page.locator('[data-prompt-view][value="plain"]').check();
  assert.equal(await page.locator(promptSelector).textContent(), initial.plain);
  return initial;
}

async function assertNoScriptPromptCapsule(browser, origin, route, promptSelector, expectedPlain) {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 900 },
  });
  try {
    const page = await context.newPage();
    await page.goto(`${origin}/${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(await page.locator(promptSelector).textContent(), expectedPlain);
    assert.equal(await page.locator(promptSelector).isVisible(), true);
    assert.equal(await page.locator("[data-prompt-view-control]").isVisible(), false);
    assert.equal(await page.locator("[data-prompt-actions]").isVisible(), false);
    assert.equal(await page.locator("[data-prompt-related-loops]").isVisible(), true);
    const containment = await page.locator("html").evaluate(root => ({
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
    }));
    assert.ok(containment.scrollWidth <= containment.clientWidth + 1, JSON.stringify(containment));
  } finally {
    await context.close();
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
  const { context, page, telemetry } = await openFresh(
    browser,
    origin,
    route,
    { captureClipboard: true },
  );
  let initialPrompt;
  try {
    initialPrompt = await exercisePromptCapsule(page, {
      apiName: "heartChart",
      copySelector: '[data-action="copy-prompt"]',
      downloadSelector: '[data-action="download-prompt"]',
      filename: "heart-chart.prompt-capsule.r0.1.6.skill-assisted.md",
      loopIds: ["visitor-surface-change", "skill-from-receiving-use"],
      promptSelector: "#aiPrompt",
      stateContract: "heart-chart-state.v0.1",
      title: "HEART Chart",
      version: "0.1.6",
    });
    assert.equal(initialPrompt.projection.rows.length, 5);
    assert.ok(initialPrompt.projection.rows.every(row => [
      "goal", "signal", "metric", "interpretation", "tolerance",
      "counterSignal", "qualitativeCompanion", "status", "route",
    ].every(field => Object.hasOwn(row, field))));

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
    const twoViewState = structuredClone(initial);
    twoViewState.view_state.views.push({
      id: "view-secondary-review",
      name: "Secondary review focus",
      row_order: [...view.row_order].reverse(),
      hidden_row_ids: [secondId],
      text_mode: "preview_with_reveal",
      selected_row_id: firstId,
    });
    await page.locator("#jsonImport").fill(JSON.stringify(twoViewState));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importMessage").textContent(), /HEART Chart imported/);
    assert.deepEqual(await valueJson(page, "#jsonExport"), twoViewState);
    await page.locator(`[data-action="select-row"][data-row-id="${firstId}"]`).click();
    const selectedOnly = await page.evaluate(() => ({
      fingerprint: window.heartChart.promptCapsuleFingerprint(),
      markdown: window.heartChart.promptCapsule(),
    }));
    assert.equal(selectedOnly.fingerprint, initialPrompt.fingerprint);
    assert.equal(selectedOnly.markdown, initialPrompt.plain);
    await page.locator('[data-action="copy-json"]').click();
    assert.equal(
      await page.evaluate(() => globalThis.__coreClipboard),
      await page.locator("#jsonExport").inputValue(),
    );
    assert.equal(await page.locator("#jsonCopyMessage").textContent(), "JSON copied.");

    await page.locator('[data-action="add-row"]').click();
    const withAddedRow = await valueJson(page, "#jsonExport");
    const addedId = withAddedRow.heart_chart.rows.at(-1).id;
    assert.equal(withAddedRow.view_state.views.length, 2);
    for (const focusView of withAddedRow.view_state.views) {
      assert.equal(focusView.row_order.length, withAddedRow.heart_chart.rows.length);
      assert.equal(focusView.row_order.filter(id => id === addedId).length, 1);
    }
    await page.locator("#jsonImport").fill(JSON.stringify(withAddedRow));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importMessage").textContent(), /HEART Chart imported/);
    assert.deepEqual(await valueJson(page, "#jsonExport"), withAddedRow);
    const expectedFocusId = withAddedRow.view_state.views[0].row_order.at(-2);
    const removeButton = page.locator(`[data-action="remove-row"][data-row-id="${addedId}"]`);
    await removeButton.click();
    assert.equal(await removeButton.textContent(), "Confirm removal");
    assert.ok((await valueJson(page, "#jsonExport")).heart_chart.rows.some(({ id }) => id === addedId));
    assert.match(await page.locator("#rowActionMessage").textContent(), /remains available until then/);

    const firstRemoveButton = page.locator(`[data-action="remove-row"][data-row-id="${firstId}"]`);
    await firstRemoveButton.click();
    assert.equal(await removeButton.textContent(), "Remove");
    assert.equal(await firstRemoveButton.textContent(), "Confirm removal");
    assert.equal(await page.getByRole("button", { name: "Confirm removal" }).count(), 1);
    assert.ok((await valueJson(page, "#jsonExport")).heart_chart.rows.some(({ id }) => id === addedId));
    await page.locator("#jsonImport").fill("{}");
    assert.equal(await firstRemoveButton.textContent(), "Remove");
    assert.match(await page.locator("#rowActionMessage").textContent(), /confirmation cleared/i);

    await removeButton.click();
    assert.equal(await removeButton.textContent(), "Confirm removal");
    await removeButton.click();
    assert.equal((await valueJson(page, "#jsonExport")).heart_chart.rows.some(({ id }) => id === addedId), false);
    assert.match(await page.locator("#rowActionMessage").textContent(), /row removed/);
    assert.deepEqual(
      await page.evaluate(() => ({
        action: document.activeElement?.dataset?.action,
        rowId: document.activeElement?.dataset?.rowId,
      })),
      { action: "remove-row", rowId: expectedFocusId },
    );
    const withoutAddedRow = await valueJson(page, "#jsonExport");
    assert.equal(withoutAddedRow.view_state.views.length, 2);
    for (const focusView of withoutAddedRow.view_state.views) {
      assert.equal(focusView.row_order.length, withoutAddedRow.heart_chart.rows.length);
      assert.equal(focusView.row_order.includes(addedId), false);
      assert.equal(focusView.hidden_row_ids.includes(addedId), false);
      assert.notEqual(focusView.selected_row_id, addedId);
    }
    await page.locator("#jsonImport").fill(JSON.stringify(withoutAddedRow));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importMessage").textContent(), /HEART Chart imported/);
    assert.deepEqual(await valueJson(page, "#jsonExport"), withoutAddedRow);

    await page.evaluate(() => {
      Object.defineProperty(Navigator.prototype, "clipboard", {
        configurable: true,
        get: () => ({
          writeText: async () => {
            throw new Error("clipboard unavailable");
          },
        }),
      });
    });
    const visibleJson = await page.locator("#jsonExport").inputValue();
    await page.locator('[data-action="copy-json"]').click();
    await assert.doesNotReject(() => page.waitForFunction(
      () => document.querySelector("#jsonCopyMessage")?.textContent?.includes("manual copy"),
    ));
    assert.equal(await page.locator("#jsonExport").inputValue(), visibleJson);

    await page.locator(`[data-action="select-row"][data-row-id="${firstId}"]`).click();
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
    for (const [field, label] of [
      ["goal", "Goal"],
      ["signal", "Signal"],
      ["metric", "Metric"],
      ["interpretation", "Interpretation"],
      ["tolerance", "Tolerance"],
      ["counter_signal", "Counter-signal"],
      ["qualitative_companion", "Qualitative companion"],
      ["status", "Evidence status"],
      ["handoff", "Route"],
    ]) {
      assert.equal(
        await page.locator(`[data-field="${field}"][data-row-id="${firstId}"]`).getAttribute("aria-label"),
        `${label} for ${editedRow.category}`,
      );
    }
    const readableRow = page.locator("#readableTable tr").filter({ hasText: firstId });
    assert.match(await readableRow.textContent(), /Metric <img src=x/);
    assert.match(await readableRow.textContent(), /Recovery Routing Atlas/);
    assert.match(await page.locator("#inspector").textContent(), /Route <strong>signal strain<\/strong> through a visible recovery path/);
    assert.equal(await page.evaluate(() => globalThis.__coreProbe), undefined);
    const changedPrompt = await page.evaluate(() => ({
      fingerprint: window.heartChart.promptCapsuleFingerprint(),
      markdown: window.heartChart.promptCapsule(),
    }));
    assert.notEqual(changedPrompt.fingerprint, initialPrompt.fingerprint);
    assert.notEqual(changedPrompt.markdown, initialPrompt.plain);
    assert.ok(changedPrompt.markdown.includes(
      "Metric &lt;img src=x onerror=globalThis.\\_\\_coreProbe=1&gt; remains contextual",
    ));

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

    const privateBaseline = await page.evaluate(() => ({
      fingerprint: window.heartChart.promptCapsuleFingerprint(),
      markdown: window.heartChart.promptCapsule(),
      state: window.heartChart.getState(),
    }));
    const privateOnly = structuredClone(privateBaseline.state);
    privateOnly.private_annotation = "local HEART note";
    privateOnly.heart_chart.rows[0].private_annotation = "local row note";
    await page.locator("#jsonImport").fill(JSON.stringify(privateOnly));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importMessage").textContent(), /HEART Chart imported/);
    const privateReceipt = await page.evaluate(() => ({
      fingerprint: window.heartChart.promptCapsuleFingerprint(),
      markdown: window.heartChart.promptCapsule(),
      state: window.heartChart.getState(),
    }));
    assert.equal(privateReceipt.state.private_annotation, "local HEART note");
    assert.equal(privateReceipt.state.heart_chart.rows[0].private_annotation, "local row note");
    assert.equal(privateReceipt.fingerprint, privateBaseline.fingerprint);
    assert.equal(privateReceipt.markdown, privateBaseline.markdown);

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
  await assertNoScriptPromptCapsule(browser, origin, route, "#aiPrompt", initialPrompt.plain);
}

async function specificationPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  let initialPlain = "";
  try {
    const apiInitial = await page.evaluate(() => {
      const api = window.specificationByExample;
      return {
        frozen: Object.isFrozen(api),
        version: api.version,
        contract: api.contract,
        stateContract: api.stateContract,
        view: api.getPromptCapsuleView(),
        state: api.getState(),
        projection: api.promptCapsuleStateProjection(),
        fingerprint: api.promptCapsuleFingerprint(),
        plain: api.promptCapsule(),
        explicitPlain: api.promptCapsuleMarkdown("plain"),
        visible: document.querySelector("#aiPrompt").textContent,
      };
    });
    initialPlain = apiInitial.plain;
    assert.equal(apiInitial.frozen, true);
    assert.deepEqual(
      [apiInitial.version, apiInitial.contract, apiInitial.stateContract, apiInitial.view],
      ["0.1.6", "prompt-capsule/0.1.0", "specification-by-example-state.v0.1", "plain"],
    );
    assert.equal(apiInitial.plain, apiInitial.explicitPlain);
    assert.equal(apiInitial.visible, apiInitial.plain);
    assert.equal(apiInitial.projection.rules.length, apiInitial.state.specification_by_example.rules.length);
    assert.equal(apiInitial.projection.scenarios.length, apiInitial.state.specification_by_example.scenarios.length);
    assert.ok(apiInitial.plain.includes(`- Fingerprint: \`${apiInitial.fingerprint}\``));
    assert.match(apiInitial.plain, /^# Prompt Capsule: Specification-by-Example\n/u);
    assert.match(apiInitial.plain, /## Related loops/u);
    assert.doesNotMatch(apiInitial.plain, /## Skill assistance/u);

    const initial = await valueJson(page, "#jsonOut");
    const ruleIds = new Set(initial.specification_by_example.rules.map(rule => rule.id));
    assert.ok(initial.specification_by_example.scenarios.every(scenario => ruleIds.has(scenario.rule_id)), "Every scenario should belong to a current rule");
    assert.ok(initial.specification_by_example.scenarios.every(scenario => typeof scenario.given === "string" && typeof scenario.when === "string" && typeof scenario.then === "string"), "Every scenario should retain Given / When / Then text");

    const view = initial.view_state.views[0];
    const firstId = view.scenario_order[0];
    const secondId = view.scenario_order[1];
    await page.locator(`[data-action="select-scenario"][data-id="${firstId}"]`).first().click();
    const selectedOnly = await page.evaluate(() => ({
      selectedId: window.specificationByExample.getState().view_state.views[0].selected_scenario_id,
      fingerprint: window.specificationByExample.promptCapsuleFingerprint(),
      markdown: window.specificationByExample.promptCapsule(),
    }));
    assert.equal(selectedOnly.selectedId, firstId);
    assert.equal(selectedOnly.fingerprint, apiInitial.fingerprint);
    assert.equal(selectedOnly.markdown, apiInitial.plain);

    const loopReceipt = await page.locator("[data-prompt-related-loops]").evaluate((details) => ({
      tag: details.tagName,
      open: details.open,
      loops: [...details.querySelectorAll("[data-related-loop-id]")].map((item) => ({
        id: item.dataset.relatedLoopId,
        href: item.querySelector("a")?.href,
      })),
    }));
    assert.deepEqual(loopReceipt, {
      tag: "DETAILS",
      open: false,
      loops: [
        { id: "repository-reentry", href: "https://schemas.radiantnull.com/collaboration/#repository-reentry" },
        { id: "skill-from-receiving-use", href: "https://schemas.radiantnull.com/collaboration/#skill-from-receiving-use" },
      ],
    });
    const relatedSummary = page.locator("[data-prompt-related-loops] summary");
    const summaryBox = await relatedSummary.boundingBox();
    assert.ok(summaryBox && summaryBox.height >= 44 && summaryBox.width >= 44);
    await relatedSummary.press("Enter");
    assert.equal(await page.locator("[data-prompt-related-loops]").evaluate(element => element.open), true);
    const firstLoopBox = await page.locator("[data-related-loop-id] a").first().boundingBox();
    assert.ok(firstLoopBox && firstLoopBox.height >= 44 && firstLoopBox.width >= 44);

    const assistedControl = page.locator('[data-prompt-view][value="skill-assisted"]');
    await assistedControl.check();
    const assisted = await page.evaluate(() => ({
      view: window.specificationByExample.getPromptCapsuleView(),
      projection: window.specificationByExample.promptCapsuleStateProjection(),
      fingerprint: window.specificationByExample.promptCapsuleFingerprint(),
      markdown: window.specificationByExample.promptCapsuleMarkdown(),
      visible: document.querySelector("#aiPrompt").textContent,
    }));
    assert.equal(assisted.view, "skill-assisted");
    assert.equal(assisted.markdown, assisted.visible);
    assert.equal(assisted.fingerprint, apiInitial.fingerprint);
    assert.deepEqual(assisted.projection, apiInitial.projection);
    assert.match(assisted.markdown, /## Skill assistance/u);
    assert.match(assisted.markdown, /\.agents\/skills\/stateful-artifact-behavior-contracts\/SKILL\.md/u);

    await page.evaluate(() => { globalThis.__coreClipboard = ""; });
    await page.locator("#copyPromptBtn").click();
    await page.waitForFunction(() => Boolean(globalThis.__coreClipboard));
    assert.equal(await page.evaluate(() => globalThis.__coreClipboard), assisted.markdown);
    await page.evaluate(() => {
      const original = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (blob) => {
        globalThis.__promptDownloadType = blob.type;
        return original(blob);
      };
    });
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#downloadPromptBtn").click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), "specification-by-example.prompt-capsule.r0.1.6.skill-assisted.md");
    assert.equal(await page.evaluate(() => globalThis.__promptDownloadType), "text/markdown;charset=utf-8");
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString("utf8"), assisted.markdown);
    await page.locator('[data-prompt-view][value="plain"]').check();
    assert.equal(await page.locator("#aiPrompt").textContent(), apiInitial.plain);

    const literal = "Then <img src=x onerror=globalThis.__coreProbe=1> appears as collaborator text";
    await page.locator(`[data-scenario-id="${firstId}"][data-field="then"]`).fill(literal);
    await page.locator(`[data-scenario-id="${firstId}"][data-field="then"]`).blur();
    const edited = await valueJson(page, "#jsonOut");
    assert.equal(edited.specification_by_example.scenarios.find(scenario => scenario.id === firstId).then, literal);
    assert.match(await page.locator("#scenarioText").textContent(), /Then <img src=x/);
    assert.equal(await page.evaluate(() => globalThis.__coreProbe), undefined);
    const changedCapsule = await page.evaluate(() => ({
      fingerprint: window.specificationByExample.promptCapsuleFingerprint(),
      markdown: window.specificationByExample.promptCapsule(),
    }));
    assert.notEqual(changedCapsule.fingerprint, apiInitial.fingerprint);
    assert.notEqual(changedCapsule.markdown, apiInitial.plain);
    assert.ok(
      changedCapsule.markdown.includes(
        "Then &lt;img src=x onerror=globalThis.\\_\\_coreProbe=1&gt; appears as collaborator text",
      ),
    );

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

  const stateBoundaryContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const stateBoundaryPage = await stateBoundaryContext.newPage();
    await stateBoundaryPage.goto(`${origin}/${route}`, { waitUntil: "domcontentloaded" });
    const baseline = await stateBoundaryPage.evaluate(() => ({
      state: window.specificationByExample.getState(),
      fingerprint: window.specificationByExample.promptCapsuleFingerprint(),
      markdown: window.specificationByExample.promptCapsule(),
    }));
    const privateOnly = structuredClone(baseline.state);
    privateOnly.private_annotation = "local behavior note";
    privateOnly.specification_by_example.private_annotation = "local specification note";
    await stateBoundaryPage.locator("#jsonImport").fill(JSON.stringify(privateOnly));
    await stateBoundaryPage.locator("#importJsonBtn").click();
    assert.match(await stateBoundaryPage.locator("#importNotice").textContent(), /Specification-by-Example imported/i);
    const privateReceipt = await stateBoundaryPage.evaluate(() => ({
      state: window.specificationByExample.getState(),
      fingerprint: window.specificationByExample.promptCapsuleFingerprint(),
      markdown: window.specificationByExample.promptCapsule(),
    }));
    assert.equal(privateReceipt.state.private_annotation, "local behavior note");
    assert.equal(privateReceipt.state.specification_by_example.private_annotation, "local specification note");
    assert.equal(privateReceipt.fingerprint, baseline.fingerprint);
    assert.equal(privateReceipt.markdown, baseline.markdown);

    const semanticChange = structuredClone(privateReceipt.state);
    semanticChange.specification_by_example.scenarios[0].then = "A revised example produces an observable result.";
    await stateBoundaryPage.locator("#jsonImport").fill(JSON.stringify(semanticChange));
    await stateBoundaryPage.locator("#importJsonBtn").click();
    assert.match(await stateBoundaryPage.locator("#importNotice").textContent(), /Specification-by-Example imported/i);
    const semanticReceipt = await stateBoundaryPage.evaluate(() => ({
      fingerprint: window.specificationByExample.promptCapsuleFingerprint(),
      markdown: window.specificationByExample.promptCapsule(),
    }));
    assert.notEqual(semanticReceipt.fingerprint, baseline.fingerprint);
    assert.notEqual(semanticReceipt.markdown, baseline.markdown);
    assert.match(semanticReceipt.markdown, /A revised example produces an observable result\./u);
  } finally {
    await stateBoundaryContext.close();
  }

  const noScriptContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 900 },
  });
  try {
    const noScriptPage = await noScriptContext.newPage();
    await noScriptPage.goto(`${origin}/${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(await noScriptPage.locator("#aiPrompt").textContent(), initialPlain);
    assert.equal(await noScriptPage.locator("#aiPrompt").isVisible(), true);
    assert.equal(await noScriptPage.locator("[data-prompt-view-control]").isVisible(), false);
    assert.equal(await noScriptPage.locator("[data-prompt-actions]").isVisible(), false);
    assert.equal(await noScriptPage.locator("[data-prompt-related-loops]").isVisible(), true);
    const containment = await noScriptPage.locator("html").evaluate(root => ({
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
    }));
    assert.ok(containment.scrollWidth <= containment.clientWidth + 1, JSON.stringify(containment));
  } finally {
    await noScriptContext.close();
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

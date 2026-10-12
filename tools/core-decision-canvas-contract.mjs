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
  impact: "impact-map-chimeric-prototype-v0.1.5.html",
  service: "service-design-blueprint-chimeric-prototype-v0.2.6.html",
  heart: "heart-chart-chimeric-prototype-v0.1.6.html",
  specification: "specification-by-example-chimeric-prototype-v0.1.7.html"
};
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== "--artifact" || !Object.hasOwn(artifactNames, args[1]))) {
  throw new Error("Usage: node tools/core-decision-canvas-contract.mjs [--artifact impact|service|heart|specification]");
}
const selectedArtifact = args[1] || null;
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

async function assertPromptCapsuleKeyOrderStability(page, apiName) {
  const receipt = await page.evaluate(name => {
    const reverseKeys = value => {
      if (Array.isArray(value)) return value.map(reverseKeys);
      if (value && typeof value === "object") {
        return Object.fromEntries(Object.keys(value).reverse().map(key => [key, reverseKeys(value[key])]));
      }
      return value;
    };
    const api = globalThis[name];
    const before = { fingerprint: api.promptCapsuleFingerprint(), markdown: api.promptCapsule() };
    api.importState(reverseKeys(api.getState()));
    return { before, after: { fingerprint: api.promptCapsuleFingerprint(), markdown: api.promptCapsule() } };
  }, apiName);
  assert.deepEqual(receipt.after, receipt.before, "object key order does not change represented-state identity or Markdown");
}

async function impactPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  let initialCapsule;
  try {
    const initial = await textJson(page, "#jsonOut");
    const actor = initial.impact_map.actors[0];
    const impact = actor.impacts[0];
    const discoverable = impact.discoverables[0];
    assert.ok(actor.id && impact.id && discoverable.id, "Impact hierarchy should expose stable actor, impact, and discoverable IDs");
    assert.equal(await page.locator(`[data-node-id="${actor.id}"]`).count(), 1);
    assert.equal(await page.locator(`[data-node-id="${impact.id}"]`).count(), 1);
    assert.equal(await page.locator(`[data-node-id="${discoverable.id}"]`).count(), 1);

    initialCapsule = await exercisePromptCapsule(page, {
      apiName: "impactMap",
      copySelector: "#copyPromptBtn",
      downloadSelector: "#downloadPromptBtn",
      filename: "impact-map.prompt-capsule.r0.1.5.skill-assisted.md",
      loopIds: ["visitor-surface-change", "repository-reentry"],
      promptSelector: "#promptOut",
      stateContract: "impact-map-state.v0.1",
      title: "Impact Map",
      version: "0.1.5",
    });
    const hierarchyCounts = {
      actors: initialCapsule.projection.actors.length,
      impacts: initialCapsule.projection.actors.reduce((count, item) => count + item.impacts.length, 0),
      discoverables: initialCapsule.projection.actors.reduce(
        (count, item) => count + item.impacts.reduce((subtotal, child) => subtotal + child.discoverables.length, 0),
        0,
      ),
    };
    assert.deepEqual(hierarchyCounts, { actors: 4, impacts: 4, discoverables: 7 });
    assert.equal(initialCapsule.projection.goal.id, initial.impact_map.goal.id);
    assert.deepEqual(
      initialCapsule.projection.actors.map(item => item.id),
      initial.impact_map.actors.map(item => item.id),
    );
    const editorLabels = await page.locator("#actorsEditor label[for]").evaluateAll(labels => ({
      allAssociated: labels.every(label => document.querySelectorAll(`#${CSS.escape(label.htmlFor)}`).length === 1),
      controlIds: labels.map(label => label.htmlFor),
    }));
    assert.equal(editorLabels.allAssociated, true);
    assert.equal(new Set(editorLabels.controlIds).size, editorLabels.controlIds.length);

    const beforeMembership = await page.evaluate(() => ({
      state: window.impactMap.getState(),
      fingerprint: window.impactMap.promptCapsuleFingerprint(),
    }));
    await page.locator("#addActorBtn").click();
    const expandedMembership = await page.evaluate(() => ({
      count: window.impactMap.promptCapsuleStateProjection().actors.length,
      fingerprint: window.impactMap.promptCapsuleFingerprint(),
    }));
    assert.equal(expandedMembership.count, beforeMembership.state.impact_map.actors.length + 1);
    assert.notEqual(expandedMembership.fingerprint, beforeMembership.fingerprint);
    await page.locator('[data-action="remove-actor"]').last().click();
    assert.deepEqual(await page.evaluate(() => window.impactMap.getState()), beforeMembership.state);
    assert.equal(await page.evaluate(() => window.impactMap.promptCapsuleFingerprint()), beforeMembership.fingerprint);

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
    const literalCapsule = await page.evaluate(() => ({
      fingerprint: window.impactMap.promptCapsuleFingerprint(),
      markdown: window.impactMap.promptCapsule(),
    }));
    assert.notEqual(literalCapsule.fingerprint, initialCapsule.fingerprint);
    assert.match(literalCapsule.markdown, /Reviewer &lt;img src=x onerror=globalThis\.\\_\\_coreProbe=1&gt; &amp; collaborator/u);

    const compatible = structuredClone(edited);
    const importedText = "Imported discoverable <strong>stays literal</strong>";
    compatible.impact_map.actors[0].impacts[0].discoverables[0].text = importedText;
    compatible.private_annotation = "local map note";
    compatible.artifact_identity.private_annotation = "local identity note";
    compatible.quick_use.private_annotation = "local quick-use note";
    compatible.impact_map.private_annotation = "local hierarchy note";
    compatible.impact_map.goal.private_annotation = "local goal note";
    compatible.impact_map.actors[0].private_annotation = "local actor note";
    compatible.impact_map.actors[0].impacts[0].private_annotation = "local impact note";
    compatible.impact_map.actors[0].impacts[0].discoverables[0].private_annotation = "local discoverable note";
    compatible.semantic_locality.replacement_state_guidance[0].private_annotation = "local wording note";
    compatible.recovery_calibration.private_annotation = "local recovery note";
    await page.locator("#jsonImport").fill(JSON.stringify(compatible));
    await page.locator("#importJsonBtn").click();
    assert.match(await page.locator("#importNotice").textContent(), /Impact Map imported/);
    const imported = await textJson(page, "#jsonOut");
    assert.equal(imported.impact_map.actors[0].text, literal);
    assert.equal(imported.impact_map.actors[0].impacts[0].discoverables[0].text, importedText);
    assert.deepEqual(imported, compatible);
    const privateReceipt = await page.evaluate(() => ({
      fingerprint: window.impactMap.promptCapsuleFingerprint(),
      markdown: window.impactMap.promptCapsule(),
    }));
    const representedOnly = structuredClone(compatible);
    delete representedOnly.private_annotation;
    delete representedOnly.artifact_identity.private_annotation;
    delete representedOnly.quick_use.private_annotation;
    delete representedOnly.impact_map.private_annotation;
    delete representedOnly.impact_map.goal.private_annotation;
    delete representedOnly.impact_map.actors[0].private_annotation;
    delete representedOnly.impact_map.actors[0].impacts[0].private_annotation;
    delete representedOnly.impact_map.actors[0].impacts[0].discoverables[0].private_annotation;
    delete representedOnly.semantic_locality.replacement_state_guidance[0].private_annotation;
    delete representedOnly.recovery_calibration.private_annotation;
    await page.locator("#jsonImport").fill(JSON.stringify(representedOnly));
    await page.locator("#importJsonBtn").click();
    const representedReceipt = await page.evaluate(() => ({
      fingerprint: window.impactMap.promptCapsuleFingerprint(),
      markdown: window.impactMap.promptCapsule(),
    }));
    assert.deepEqual(representedReceipt, privateReceipt);

    const minimum = structuredClone(await textJson(page, "#jsonOut"));
    minimum.impact_map.actors = minimum.impact_map.actors.slice(0, 1);
    minimum.impact_map.actors[0].impacts = minimum.impact_map.actors[0].impacts.slice(0, 1);
    minimum.impact_map.actors[0].impacts[0].discoverables = minimum.impact_map.actors[0].impacts[0].discoverables.slice(0, 1);
    await page.locator("#jsonImport").fill(JSON.stringify(minimum));
    await page.locator("#importJsonBtn").click();
    assert.match(await page.locator("#importNotice").textContent(), /Impact Map imported/);
    assert.equal(await page.locator('[data-action="remove-actor"]').isDisabled(), true);
    assert.equal(await page.locator('[data-action="remove-impact"]').isDisabled(), true);
    assert.equal(await page.locator('[data-action="remove-discoverable"]').isDisabled(), true);

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
  await assertNoScriptPromptCapsule(browser, origin, route, "#promptOut", initialCapsule.plain);
}

async function exerciseServiceNameSync(page) {
  const read = () => page.evaluate(() => {
    const api = window.serviceDesignBlueprint;
    const input = document.getElementById("artifactName");
    const table = document.getElementById("serviceTable");
    return {
      state: api.getState(),
      fingerprint: api.promptCapsuleFingerprint(),
      markdown: api.promptCapsule(),
      caption: table.caption.textContent,
      labels: [...table.querySelectorAll("tbody tr[data-label]")].map(row => row.dataset.label),
      cellIds: [...table.querySelectorAll('[data-action="select-cell"]')].map(cell => cell.dataset.id),
      focused: document.activeElement === input,
      caret: [input.selectionStart, input.selectionEnd],
      injected: Boolean(table.querySelector("probe")),
    };
  });
  const baseline = await read();
  const input = page.locator("#artifactName");
  const originalName = await input.inputValue();
  for (const name of ['Renamed "<probe>& Service', originalName]) {
    await input.fill(name);
    const receipt = await read();
    const expected = structuredClone(baseline.state);
    expected.artifact_identity.display_name = name;
    const caption = "Service blueprint: " + name + ". Visible stages and layers";
    assert.deepEqual(receipt.state, expected, "Rename changes only the artifact name");
    assert.equal(receipt.caption, caption);
    assert.deepEqual(receipt.labels, baseline.labels.map(label => caption + label.slice(baseline.caption.length)));
    assert.deepEqual(receipt.cellIds, baseline.cellIds);
    assert.equal(receipt.focused, true, "The name input keeps focus without an unrelated action");
    assert.deepEqual(receipt.caret, [name.length, name.length]);
    assert.equal(receipt.injected, false, "Markup-shaped names remain literal table context");
    if (name === originalName) {
      assert.equal(receipt.fingerprint, baseline.fingerprint);
      assert.equal(receipt.markdown, baseline.markdown);
    } else {
      assert.notEqual(receipt.fingerprint, baseline.fingerprint);
      assert.notEqual(receipt.markdown, baseline.markdown);
    }
  }
}

async function exerciseServiceCellSelection(page, initial) {
  const blueprint = initial.service_blueprint;
  const cells = blueprint.cells.slice(0, 3);
  const baseline = await page.evaluate(() => ({
    fingerprint: window.serviceDesignBlueprint.promptCapsuleFingerprint(),
    markdown: window.serviceDesignBlueprint.promptCapsule(),
  }));
  assert.equal(await page.locator("#blueprintSvg").getAttribute("role"), "group");
  assert.equal(await page.locator("#blueprintSvg [role=button]").count(), blueprint.cells.length);
  assert.equal(await page.locator("#serviceTable tbody th[scope=row]").count(), blueprint.layers.length);
  assert.equal(await page.locator("#serviceTable thead th[scope=col]").count(), blueprint.stages.length + 1);
  assert.match(await page.locator("#serviceTable caption").textContent(), /Service blueprint:/u);
  assert.equal(await page.locator("#serviceTable tbody tr[data-label]").count(), blueprint.layers.length);
  await page.evaluate(() => {
    globalThis.__serviceScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function(options) {
      globalThis.__serviceScroll = { id: this.id, options };
      return globalThis.__serviceScrollIntoView.call(this, options);
    };
  });
  const svgCell = cell => page.locator('#blueprintSvg [data-action="select-cell"][data-id="' + cell.id + '"]');
  const tableCell = cell => page.locator('#serviceTable [data-action="select-cell"][data-id="' + cell.id + '"]');
  const assertSelection = async (cell, behavior) => {
    await page.waitForFunction(() => {
      const bounds = document.getElementById("cellText").getBoundingClientRect();
      return bounds.top >= 0 && bounds.bottom <= innerHeight;
    });
    const receipt = await page.evaluate(() => {
      const api = window.serviceDesignBlueprint;
      return {
        state: api.getState(),
        fingerprint: api.promptCapsuleFingerprint(),
        markdown: api.promptCapsule(),
        focused: document.activeElement.id,
        editorCell: document.getElementById("cellText").dataset.cellId,
        scroll: globalThis.__serviceScroll,
      };
    });
    const expected = structuredClone(initial);
    const view = expected.view_state.views.find(item => item.id === expected.view_state.active_view_id);
    view.selected_cell_id = cell.id;
    view.selected_asset_id = "";
    assert.deepEqual(receipt.state, expected, "Selection changes only the active view's selected IDs");
    assert.equal(receipt.editorCell, cell.id);
    assert.equal(receipt.focused, "cellText");
    assert.equal(await page.locator("#cellText").inputValue(), cell.text);
    assert.deepEqual({ fingerprint: receipt.fingerprint, markdown: receipt.markdown }, baseline);
    assert.deepEqual(receipt.scroll, { id: "cellText", options: { behavior, block: "center", inline: "nearest" } });
    const stage = blueprint.stages.find(item => item.id === cell.stage_id);
    const layer = blueprint.layers.find(item => item.id === cell.layer_id);
    for (const control of [svgCell(cell), tableCell(cell)]) {
      assert.equal(await control.getAttribute("aria-pressed"), "true");
      assert.equal(await control.getAttribute("aria-controls"), "cellInspector");
      const name = await control.getAttribute("aria-label");
      assert.ok(name.includes(stage.label) && name.includes(layer.label) && name.includes(cell.id));
    }
    assert.equal(await page.locator('[data-action="select-cell"][aria-pressed="true"]').count(), 2);
  };
  try {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await svgCell(cells[0]).locator("rect").click({ position: { x: 6, y: 6 } });
    await assertSelection(cells[0], "smooth");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await svgCell(cells[1]).locator("text").first().click();
    await assertSelection(cells[1], "instant");
    await svgCell(cells[2]).locator("[data-cell-status]").click();
    await assertSelection(cells[2], "instant");
    await svgCell(cells[0]).focus();
    await svgCell(cells[0]).press("Enter");
    await assertSelection(cells[0], "instant");
    await svgCell(cells[1]).focus();
    await svgCell(cells[1]).press("Space");
    await assertSelection(cells[1], "instant");
    await tableCell(cells[2]).click();
    await assertSelection(cells[2], "instant");
    await tableCell(cells[0]).focus();
    await tableCell(cells[0]).press("Enter");
    await assertSelection(cells[0], "instant");
    await tableCell(cells[1]).focus();
    await tableCell(cells[1]).press("Space");
    await assertSelection(cells[1], "instant");

    const status = await page.locator("#cellStatus").inputValue();
    await page.locator("#cellStatus").focus();
    await page.locator("#cellStatus").selectOption(status === "known" ? "assumed" : "known");
    assert.equal(await page.evaluate(() => document.activeElement.id), "cellStatus");
    await page.locator("#cellStatus").selectOption(status);
    const originalText = await page.locator("#cellText").inputValue();
    await page.locator("#cellText").fill("An edit keeps the next field reachable.");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "cellStatus", "Leaving the text editor preserves the next field");
    await page.locator("#cellText").fill(originalText);
    await page.locator("#cellText").blur();

    const assetCandidate = page.locator('#cellInspector [data-field="asset-link"]:not(:checked)').first();
    const assetId = await assetCandidate.getAttribute("data-id");
    assert(assetId, "The selected asset has a stable identity");
    const asset = page.locator('#cellInspector [data-field="asset-link"][data-id="' + assetId + '"]');
    const checked = await asset.isChecked();
    await asset.focus();
    await asset.setChecked(!checked);
    assert.equal(await asset.isChecked(), !checked, "The same asset receives the checkbox edit");
    assert.equal(await page.evaluate(() => document.activeElement.dataset.id), assetId);
    await asset.setChecked(checked);
    assert.deepEqual(await page.evaluate(() => window.serviceDesignBlueprint.getState().service_blueprint), blueprint);
    assert.deepEqual(await page.evaluate(() => ({
      fingerprint: window.serviceDesignBlueprint.promptCapsuleFingerprint(),
      markdown: window.serviceDesignBlueprint.promptCapsule(),
    })), baseline);
  } finally {
    await page.evaluate(() => {
      Element.prototype.scrollIntoView = globalThis.__serviceScrollIntoView;
      delete globalThis.__serviceScrollIntoView;
      delete globalThis.__serviceScroll;
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
}

async function servicePath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  let initialPrompt;
  try {
    const initial = await textJson(page, "#jsonOut");
    const blueprint = initial.service_blueprint;
    assert.equal(blueprint.cells.length, blueprint.stages.length * blueprint.layers.length, "Every stage × layer pair should own one cell");
    const pairKeys = new Set(blueprint.cells.map(cell => `${cell.layer_id}::${cell.stage_id}`));
    assert.equal(pairKeys.size, blueprint.cells.length, "Stage × layer cell identity should stay unique");
    for (const layer of blueprint.layers.filter(candidate => candidate.required)) {
      assert.equal(await page.locator(`[data-action="remove-layer"][data-id="${layer.id}"]`).isDisabled(), true, `${layer.id} should remain required`);
    }

    initialPrompt = await exercisePromptCapsule(page, {
      apiName: "serviceDesignBlueprint",
      copySelector: "#copyPrompt",
      downloadSelector: "#downloadPrompt",
      filename: "service-design-blueprint.prompt-capsule.r0.2.6.skill-assisted.md",
      loopIds: ["visitor-surface-change", "repository-reentry"],
      promptSelector: "#promptOut",
      stateContract: "service-design-blueprint-state.v0.2",
      title: "Service-design Blueprint",
      version: "0.2.6",
    });
    assert.equal(initialPrompt.projection.stages.length, blueprint.stages.length, "the capsule represents every stage");
    assert.equal(initialPrompt.projection.layers.length, blueprint.layers.length, "the capsule represents every service lane");
    assert.equal(initialPrompt.projection.cells.length, blueprint.cells.length, "the capsule represents every service cell");
    assert.equal(initialPrompt.projection.sharedAssets.length, blueprint.shared_assets.length, "the capsule represents every shared asset");
    assert.equal(initialPrompt.projection.views.length, initial.view_state.views.length, "the capsule represents every accepted focus view");
    await assertPromptCapsuleKeyOrderStability(page, "serviceDesignBlueprint");
    await exerciseServiceNameSync(page);
    await exerciseServiceCellSelection(page, await textJson(page, "#jsonOut"));

    const cellId = initial.view_state.views[0].selected_cell_id;
    assert.ok(blueprint.cells.some(cell => cell.id === cellId), "The initial focus view should select a current stage × layer cell");
    const selectionProbeId = blueprint.cells.find(cell => cell.id !== cellId).id;
    await page.locator(`#serviceTable [data-action="select-cell"][data-id="${selectionProbeId}"]`).click();
    assert.deepEqual(await page.evaluate(() => ({
      fingerprint: window.serviceDesignBlueprint.promptCapsuleFingerprint(),
      markdown: window.serviceDesignBlueprint.promptCapsule(),
    })), { fingerprint: initialPrompt.fingerprint, markdown: initialPrompt.plain });

    await page.locator("#addStage").click();
    await page.locator("#addLayer").click();
    const expanded = await textJson(page, "#jsonOut");
    assert.equal(expanded.service_blueprint.cells.length, expanded.service_blueprint.stages.length * expanded.service_blueprint.layers.length, "Adding a stage and layer should complete their cell intersections");

    const literal = "Visible <img src=x onerror=globalThis.__coreProbe=1> service consequence";
    await page.locator(`#serviceTable [data-action="select-cell"][data-id="${cellId}"]`).click();
    const beforeLiteralFingerprint = await page.evaluate(() => window.serviceDesignBlueprint.promptCapsuleFingerprint());
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
    assert.match(await page.locator(`#serviceTable [data-action="select-cell"][data-id="${cellId}"] .cell-preview`).textContent(), /Visible <img/);
    assert.equal(await page.evaluate(() => globalThis.__coreProbe), undefined);
    const afterLiteralPrompt = await page.evaluate(() => ({
      fingerprint: window.serviceDesignBlueprint.promptCapsuleFingerprint(),
      markdown: window.serviceDesignBlueprint.promptCapsule(),
    }));
    assert.notEqual(afterLiteralPrompt.fingerprint, beforeLiteralFingerprint);
    assert.match(afterLiteralPrompt.markdown, /Visible &lt;img src=x onerror=globalThis\.\\_\\_coreProbe=1&gt; service consequence/u);

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
    await page.locator(`#serviceTable [data-action="select-cell"][data-id="${cellId}"]`).click();
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

    const privateExtensionReceipt = await page.evaluate(() => {
      const api = window.serviceDesignBlueprint;
      const before = { fingerprint: api.promptCapsuleFingerprint(), markdown: api.promptCapsule() };
      const candidate = api.getState();
      candidate.private_review_note = "local service note";
      candidate.service_blueprint.private_review_note = "local body note";
      candidate.view_state.private_review_note = "local view note";
      api.importState(candidate);
      const roundtrip = api.getState();
      return {
        before,
        after: { fingerprint: api.promptCapsuleFingerprint(), markdown: api.promptCapsule() },
        retained: [
          roundtrip.private_review_note,
          roundtrip.service_blueprint.private_review_note,
          roundtrip.view_state.private_review_note,
        ],
      };
    });
    assert.deepEqual(privateExtensionReceipt.after, privateExtensionReceipt.before);
    assert.deepEqual(privateExtensionReceipt.retained, ["local service note", "local body note", "local view note"]);

    const multiViewReceipt = await page.evaluate(cell => {
      const api = window.serviceDesignBlueprint;
      const candidate = api.getState();
      const second = structuredClone(candidate.view_state.views[0]);
      second.id = "view-contract-second";
      second.name = "Contract second view";
      second.selected_cell_id = "";
      second.selected_asset_id = "";
      candidate.view_state.views.push(second);
      api.importState(candidate);
      const withSecond = { fingerprint: api.promptCapsuleFingerprint(), projection: api.promptCapsuleStateProjection() };
      const selectionOnly = api.getState();
      selectionOnly.view_state.views.find(view => view.id === "view-contract-second").selected_cell_id = cell;
      api.importState(selectionOnly);
      return {
        withSecond,
        afterSelection: { fingerprint: api.promptCapsuleFingerprint(), projection: api.promptCapsuleStateProjection() },
      };
    }, cellId);
    assert.equal(multiViewReceipt.withSecond.projection.views.length, 2);
    assert.deepEqual(multiViewReceipt.afterSelection, multiViewReceipt.withSecond);

    await page.locator("#addStage").click();
    await page.locator("#addLayer").click();
    const withAddedTopology = await textJson(page, "#jsonOut");
    const addedStage = withAddedTopology.service_blueprint.stages.at(-1);
    const addedLayer = withAddedTopology.service_blueprint.layers.at(-1);
    const addedStageCell = withAddedTopology.service_blueprint.cells.find(
      candidate => candidate.stage_id === addedStage.id,
    );
    assert.ok(addedStageCell, "A new stage should own service-layer intersection cells");
    for (const focusView of withAddedTopology.view_state.views) {
      assert.equal(focusView.stage_order.filter(id => id === addedStage.id).length, 1);
      assert.equal(focusView.layer_order.filter(id => id === addedLayer.id).length, 1);
    }
    await page.evaluate(({ stageId, selectedCellId }) => {
      const api = window.serviceDesignBlueprint;
      const candidate = api.getState();
      const second = candidate.view_state.views.find(view => view.id === "view-contract-second");
      second.hidden_stage_ids.push(stageId);
      second.selected_cell_id = selectedCellId;
      api.importState(candidate);
    }, { stageId: addedStage.id, selectedCellId: addedStageCell.id });
    const removeStageButton = page.locator(`[data-action="remove-stage"][data-id="${addedStage.id}"]`);
    await removeStageButton.click();
    assert.equal(await removeStageButton.textContent(), "Confirm removal");
    await removeStageButton.click();
    const withoutAddedStage = await textJson(page, "#jsonOut");
    assert.equal(withoutAddedStage.service_blueprint.stages.some(({ id }) => id === addedStage.id), false);
    for (const focusView of withoutAddedStage.view_state.views) {
      assert.equal(focusView.stage_order.includes(addedStage.id), false);
      assert.equal(focusView.hidden_stage_ids.includes(addedStage.id), false);
      assert.ok(
        !focusView.selected_cell_id
          || withoutAddedStage.service_blueprint.cells.some(({ id }) => id === focusView.selected_cell_id),
      );
    }

    const addedLayerCell = withoutAddedStage.service_blueprint.cells.find(
      candidate => candidate.layer_id === addedLayer.id,
    );
    assert.ok(addedLayerCell, "The added layer should remain after removing the added stage");
    await page.evaluate(({ layerId, selectedCellId }) => {
      const api = window.serviceDesignBlueprint;
      const candidate = api.getState();
      const second = candidate.view_state.views.find(view => view.id === "view-contract-second");
      second.hidden_layer_ids.push(layerId);
      second.selected_cell_id = selectedCellId;
      api.importState(candidate);
    }, { layerId: addedLayer.id, selectedCellId: addedLayerCell.id });
    const removeLayerButton = page.locator(`[data-action="remove-layer"][data-id="${addedLayer.id}"]`);
    await removeLayerButton.click();
    assert.equal(await removeLayerButton.textContent(), "Confirm removal");
    await removeLayerButton.click();
    const withoutAddedLayer = await textJson(page, "#jsonOut");
    assert.equal(withoutAddedLayer.service_blueprint.layers.some(({ id }) => id === addedLayer.id), false);
    for (const focusView of withoutAddedLayer.view_state.views) {
      assert.equal(focusView.layer_order.includes(addedLayer.id), false);
      assert.equal(focusView.hidden_layer_ids.includes(addedLayer.id), false);
      assert.ok(
        !focusView.selected_cell_id
          || withoutAddedLayer.service_blueprint.cells.some(({ id }) => id === focusView.selected_cell_id),
      );
    }

    await page.locator("#addAsset").click();
    const withAddedAsset = await textJson(page, "#jsonOut");
    const addedAsset = withAddedAsset.service_blueprint.shared_assets.at(-1);
    await page.evaluate(assetId => {
      const api = window.serviceDesignBlueprint;
      const candidate = api.getState();
      const second = candidate.view_state.views.find(view => view.id === "view-contract-second");
      second.hidden_asset_ids.push(assetId);
      second.selected_asset_id = assetId;
      api.importState(candidate);
    }, addedAsset.id);
    const removeAssetButton = page.locator(`[data-action="remove-asset"][data-id="${addedAsset.id}"]`);
    await removeAssetButton.click();
    assert.equal(await removeAssetButton.textContent(), "Confirm removal");
    await removeAssetButton.click();
    const withoutAddedAsset = await textJson(page, "#jsonOut");
    assert.equal(withoutAddedAsset.service_blueprint.shared_assets.some(({ id }) => id === addedAsset.id), false);
    for (const focusView of withoutAddedAsset.view_state.views) {
      assert.equal(focusView.hidden_asset_ids.includes(addedAsset.id), false);
      assert.notEqual(focusView.selected_asset_id, addedAsset.id);
    }
    const serviceSelfImport = await page.evaluate(() => {
      const api = window.serviceDesignBlueprint;
      const before = api.getState();
      api.importState(before);
      return { before, after: api.getState() };
    });
    assert.deepEqual(serviceSelfImport.after, serviceSelfImport.before);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
  await assertNoScriptPromptCapsule(browser, origin, route, "#promptOut", initialPrompt.plain);
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
      ["0.1.7", "prompt-capsule/0.1.0", "specification-by-example-state.v0.1", "plain"],
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
    assert.equal(download.suggestedFilename(), "specification-by-example.prompt-capsule.r0.1.7.skill-assisted.md");
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
    if (!selectedArtifact || selectedArtifact === "impact") await verify(`${projection.label} · Impact Map hierarchy, capsule, exchange, literal text, and recovery`, () => impactPath(browser, server.origin, `${projection.root}/${artifactNames.impact}`));
    if (!selectedArtifact || selectedArtifact === "service") await verify(`${projection.label} · Service Blueprint cells, assets, focus, exchange, and recovery`, () => servicePath(browser, server.origin, `${projection.root}/${artifactNames.service}`));
    if (!selectedArtifact || selectedArtifact === "heart") await verify(`${projection.label} · HEART rows, order, focus, exchange, and recovery`, () => heartPath(browser, server.origin, `${projection.root}/${artifactNames.heart}`));
    if (!selectedArtifact || selectedArtifact === "specification") await verify(`${projection.label} · Specification rules, scenarios, order, exchange, and recovery`, () => specificationPath(browser, server.origin, `${projection.root}/${artifactNames.specification}`));
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

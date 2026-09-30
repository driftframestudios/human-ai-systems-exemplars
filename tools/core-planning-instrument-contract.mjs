#!/usr/bin/env node

import assert from "node:assert/strict";

import { chromium } from "@playwright/test";

import {
  assertTelemetry,
  copiedJson,
  coreProjections as projections,
  openFresh,
  startStaticServer,
  textJson,
  valueJson
} from "./core-architecture-browser-helper.mjs";

const artifactNames = {
  poda: "poda-chimeric-prototype-v0.1.5.html",
  alignment: "alignment-worksheet-chimeric-prototype-v0.1.4.html",
  frv: "first-responsible-version-matrix-chimeric-prototype-v0.1.4.html",
  sharedSurface: "shared-surface-priority-map-chimeric-prototype-v0.1.4.html",
  aiSystems: "ai-systems-service-blueprint-chimeric-prototype-v0.1.5.html",
  softwareViews: "software-architecture-views-chimeric-prototype-v0.1.4.html",
  participatory: "participatory-design-kit-chimeric-prototype-v0.1.4.html",
  plusDelta: "plus-delta-chimeric-prototype-v0.1.5.html",
  upstream: "upstream-revision-loop-chimeric-prototype-v0.1.5.html"
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

function activeView(exported) {
  return exported.view_state.views.find(view => view.id === exported.view_state.active_view_id);
}

function withActiveViewArtifactCollision(exported) {
  const candidate = structuredClone(exported);
  const artifactId = candidate.artifact_identity.id;
  const view = activeView(candidate);
  view.id = artifactId;
  candidate.view_state.active_view_id = artifactId;
  return candidate;
}

async function openContainingDetails(page, selector) {
  await page.locator(selector).evaluate(element => {
    let details = element.closest("details");
    while (details) {
      details.open = true;
      details = details.parentElement?.closest("details");
    }
  });
}

async function assertVisibleNotice(page, selector, pattern) {
  const notice = page.locator(selector);
  assert.equal(await notice.isVisible(), true, `${selector} should remain visible`);
  assert.match(await notice.textContent(), pattern);
}

async function clearNotice(page, selector) {
  await page.locator(selector).evaluate(element => {
    element.textContent = "";
  });
}

async function podaPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  let initialPlain = "";
  try {
    const initial = await exercisePromptCapsule(page, {
      apiName: "poda",
      copySelector: "#copyPromptBtn",
      downloadSelector: "#downloadPromptBtn",
      filename: "poda.prompt-capsule.r0.1.5.skill-assisted.md",
      loopIds: ["repository-reentry", "skill-from-receiving-use"],
      promptSelector: "#aiPrompt",
      stateContract: "poda-state.v0.1",
      title: "PODA",
      version: "0.1.5",
    });
    initialPlain = initial.plain;
    assert.equal(initial.projection.objectives.length, initial.state.poda.objectives.length);
    assert.equal(initial.projection.discoverables.length, initial.state.poda.discoverables.length);
    assert.equal(initial.projection.activities.length, initial.state.poda.activities.length);
    const initialCapsule = { fingerprint: initial.fingerprint, markdown: initial.plain };
    const activityId = "activity-impact-map";
    const discoverableId = "discoverable-role-context";
    await page.locator(`button[data-action="select"][data-type="activity"][data-id="${activityId}"]`).click();
    assert.deepEqual(await page.evaluate(() => ({ fingerprint: window.poda.promptCapsuleFingerprint(), markdown: window.poda.promptCapsule() })), initialCapsule);
    const relationship = page.locator(`input[data-link="discoverable_ids"][data-type="activity"][data-id="${activityId}"][value="${discoverableId}"]`);
    assert.equal(await relationship.isChecked(), false);
    await relationship.check();

    let exported = await textJson(page, "#jsonPreview");
    let activity = exported.poda.activities.find(item => item.id === activityId);
    assert.ok(activity.discoverable_ids.includes(discoverableId));
    assert.match(await page.locator("#textTable").textContent(), /Role-specific context/);
    const linkedGraph = JSON.parse(await page.locator("#jsonld-script").textContent());
    const activityNode = linkedGraph["@graph"].find(node => node["@id"] === `#${activityId}`);
    assert.ok(activityNode["ca:surfacesDiscoverable"].some(node => node["@id"] === `#${discoverableId}`));
    assert.notEqual(await page.evaluate(() => window.poda.promptCapsuleFingerprint()), initial.fingerprint);
    assert.match(await page.locator("#aiPrompt").textContent(), /Role-specific context/u);

    await page.locator(`#activitiesEditor button[data-action="toggleVisibility"][data-type="activity"][data-id="${activityId}"]`).click();
    exported = await textJson(page, "#jsonPreview");
    activity = exported.poda.activities.find(item => item.id === activityId);
    assert.ok(activeView(exported).hidden_activity_ids.includes(activityId));
    assert.equal(activity.visible_in_active_view, false);
    assert.ok(activity.discoverable_ids.includes(discoverableId));
    await page.waitForTimeout(40);
    await page.locator(`#hiddenActivities button[data-action="toggleVisibility"][data-type="activity"][data-id="${activityId}"]`).click();

    const compatible = await textJson(page, "#jsonPreview");
    const importedActivity = "Imported PODA activity relationship";
    compatible.poda.activities.find(item => item.id === activityId).text = importedActivity;
    activeView(compatible).selected_item_type = "activity";
    activeView(compatible).selected_item_id = activityId;
    await page.locator("#jsonImport").fill(JSON.stringify(compatible));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const imported = await textJson(page, "#jsonPreview");
    assert.equal(imported.poda.activities.find(item => item.id === activityId).text, importedActivity);
    assert.equal(activeView(imported).selected_item_id, activityId);
    assert.match(await page.locator("#textTable").textContent(), /Imported PODA activity relationship/);

    const privateCapsule = await page.evaluate(() => ({ fingerprint: window.poda.promptCapsuleFingerprint(), markdown: window.poda.promptCapsule() }));
    const privateCandidate = structuredClone(await textJson(page, "#jsonPreview"));
    privateCandidate._private_annotation = "local orientation note";
    privateCandidate.poda._private_annotation = "local PODA note";
    privateCandidate.poda.purpose._private_annotation = "local purpose note";
    await page.locator("#jsonImport").fill(JSON.stringify(privateCandidate));
    await page.locator("#importJsonBtn").click();
    const privateReceipt = await textJson(page, "#jsonPreview");
    assert.equal(privateReceipt._private_annotation, "local orientation note");
    assert.equal(privateReceipt.poda._private_annotation, "local PODA note");
    assert.equal(privateReceipt.poda.purpose._private_annotation, "local purpose note");
    assert.deepEqual(await page.evaluate(() => ({ fingerprint: window.poda.promptCapsuleFingerprint(), markdown: window.poda.promptCapsule() })), privateCapsule);

    const multiView = structuredClone(privateReceipt);
    const baseView = activeView(multiView);
    multiView.view_state.views.push({
      ...structuredClone(baseView),
      id: "view-review-route",
      name: "Review route focus",
      objective_order: [...baseView.objective_order].reverse(),
      discoverable_order: [...baseView.discoverable_order].reverse(),
      activity_order: [...baseView.activity_order].reverse(),
      hidden_objective_ids: [baseView.objective_order[0]],
      selected_item_type: "",
      selected_item_id: "",
      _private_annotation: "local view note",
    });
    await page.locator("#jsonImport").fill(JSON.stringify(multiView));
    await page.locator("#importJsonBtn").click();
    assert.deepEqual(await textJson(page, "#jsonPreview"), multiView);
    const beforeObjectiveIds = new Set(multiView.poda.objectives.map(item => item.id));
    await page.locator("#addObjectiveBtn").click();
    const afterAdd = await textJson(page, "#jsonPreview");
    const addedObjective = afterAdd.poda.objectives.find(item => !beforeObjectiveIds.has(item.id));
    assert.ok(addedObjective);
    assert.ok(afterAdd.view_state.views.every(view => view.objective_order.includes(addedObjective.id)));
    const removeAdded = page.locator(`#objectivesEditor button[data-action="remove"][data-id="${addedObjective.id}"]`);
    await page.waitForTimeout(50);
    await removeAdded.click();
    await page.waitForTimeout(50);
    await removeAdded.click();
    const afterRemove = await textJson(page, "#jsonPreview");
    assert.ok(afterRemove.view_state.views.every(view => !view.objective_order.includes(addedObjective.id) && !view.hidden_objective_ids.includes(addedObjective.id)));
    await page.locator("#jsonImport").fill(JSON.stringify(afterRemove));
    await page.locator("#importJsonBtn").click();
    assert.deepEqual(await textJson(page, "#jsonPreview"), afterRemove);

    const sentinel = "PODA recovery sentinel";
    await page.locator("#purposeText").fill(sentinel);
    const invalid = structuredClone(await textJson(page, "#jsonPreview"));
    invalid.poda.objectives = { unexpected: true };
    await page.locator("#jsonImport").fill(JSON.stringify(invalid));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /remains available|working state retained/i);
    assert.equal((await textJson(page, "#jsonPreview")).poda.purpose.text, sentinel);

    const lateInvalid = structuredClone(await textJson(page, "#jsonPreview"));
    lateInvalid.semantic_locality.replacement_state_guidance = [null];
    await clearNotice(page, "#importNotice");
    await page.locator("#jsonImport").fill(JSON.stringify(lateInvalid));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /replacement_state_guidance.*object/i);
    assert.equal((await textJson(page, "#jsonPreview")).poda.purpose.text, sentinel);

    const collision = withActiveViewArtifactCollision(await textJson(page, "#jsonPreview"));
    await clearNotice(page, "#importNotice");
    await page.locator("#jsonImport").fill(JSON.stringify(collision));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /unique semantic namespace/i);
    assert.equal((await textJson(page, "#jsonPreview")).poda.purpose.text, sentinel);
    const minimum = structuredClone(await textJson(page, "#jsonPreview"));
    minimum.poda.objectives = minimum.poda.objectives.slice(0, 1);
    minimum.poda.discoverables = minimum.poda.discoverables.slice(0, 1);
    minimum.poda.discoverables[0].objective_ids = [minimum.poda.objectives[0].id];
    minimum.poda.activities = minimum.poda.activities.slice(0, 1);
    minimum.poda.activities[0].discoverable_ids = [minimum.poda.discoverables[0].id];
    minimum.view_state.views.forEach(view => {
      view.objective_order = [minimum.poda.objectives[0].id];
      view.hidden_objective_ids = [];
      view.discoverable_order = [minimum.poda.discoverables[0].id];
      view.hidden_discoverable_ids = [];
      view.activity_order = [minimum.poda.activities[0].id];
      view.hidden_activity_ids = [];
      view.selected_item_type = "";
      view.selected_item_id = "";
    });
    await page.locator("#jsonImport").fill(JSON.stringify(minimum));
    await page.locator("#importJsonBtn").click();
    assert.equal(await page.locator('#objectivesEditor button[data-action="remove"], #discoverablesEditor button[data-action="remove"], #activitiesEditor button[data-action="remove"]').evaluateAll(buttons => buttons.length === 3 && buttons.every(button => button.disabled)), true);
    const minimumFingerprint = await page.evaluate(() => window.poda.promptCapsuleFingerprint());
    await page.locator('#objectivesEditor button[data-action="remove"]').evaluate(button => button.click());
    assert.equal(await page.evaluate(() => window.poda.promptCapsuleFingerprint()), minimumFingerprint);
    assert.equal(await page.locator("#objectivesEditor label, #discoverablesEditor label, #activitiesEditor label, #inspector label").evaluateAll(labels => labels.every(label => Boolean(label.htmlFor && document.getElementById(label.htmlFor)))), true);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
  await assertNoScriptPromptCapsule(browser, origin, route, "#aiPrompt", initialPlain);
}

async function alignmentPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  let initialPlain = "";
  try {
    const initial = await exercisePromptCapsule(page, {
      apiName: "alignmentWorksheet",
      copySelector: "#copyPromptBtn",
      downloadSelector: "#downloadPromptBtn",
      filename: "alignment-worksheet.prompt-capsule.r0.1.4.skill-assisted.md",
      loopIds: ["repository-reentry", "skill-from-receiving-use"],
      promptSelector: "#promptBox",
      stateContract: "alignment-worksheet-state.v0.1",
      title: "Alignment Worksheet",
      version: "0.1.4",
    });
    initialPlain = initial.plain;
    assert.equal(initial.projection.baseline.length, initial.state.baseline_chain.length);
    assert.equal(initial.projection.options.length, initial.state.options.length);
    const initialCapsule = { fingerprint: initial.fingerprint, markdown: initial.plain };
    await page.locator('button.select-option[data-id="option-ai-boundary"]').click();
    assert.deepEqual(await page.evaluate(() => ({ fingerprint: window.alignmentWorksheet.promptCapsuleFingerprint(), markdown: window.alignmentWorksheet.promptCapsule() })), initialCapsule);
    const restored = "Review boundaries remain visible <strong>as collaborator text</strong>.";
    const strain = "Reviewers can locate the source boundary and still need a clearer confirmation route.";
    await page.locator('.blank-text[data-key="restored_state"]').fill(restored);
    await page.locator('.inverse-field[data-key="observed_strain_state"]').fill(strain);
    await page.locator('button.move-option[data-id="option-ai-boundary"][data-dir="-1"]').click();

    let exported = await textJson(page, "#jsonOut");
    assert.equal(exported.baseline_chain.find(blank => blank.key === "restored_state").text, restored);
    assert.equal(exported.inverse_state.observed_strain_state, strain);
    assert.ok(activeView(exported).option_order.indexOf("option-ai-boundary") < activeView(exported).option_order.indexOf("option-data-stewardship"));
    assert.notEqual(await page.evaluate(() => window.alignmentWorksheet.promptCapsuleFingerprint()), initial.fingerprint);
    assert.ok((await page.locator("#promptBox").textContent()).includes("Review boundaries remain visible \\<strong\\>as collaborator text\\</strong\\>\\."));
    assert.match(await page.locator("#svgMount").textContent(), /Review boundaries remain\s*visible/);
    const optionTable = await page.locator("#tableMount").textContent();
    assert.ok(optionTable.indexOf("AI boundary clarity") < optionTable.indexOf("Data stewardship"));

    await page.locator('button.hide-option[data-id="option-reviewer-provenance"]').click();
    exported = await textJson(page, "#jsonOut");
    assert.ok(activeView(exported).hidden_option_ids.includes("option-reviewer-provenance"));
    assert.notEqual(activeView(exported).selected_option_id, "option-reviewer-provenance");
    assert.equal(await page.locator('#svgMount [data-option-id="option-reviewer-provenance"]').count(), 0);

    const compatible = structuredClone(exported);
    const importedOption = "Imported AI boundary option";
    compatible.options.find(option => option.id === "option-ai-boundary").name = importedOption;
    activeView(compatible).selected_option_id = "option-ai-boundary";
    await page.locator("#importText").fill(JSON.stringify(compatible));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const imported = await textJson(page, "#jsonOut");
    assert.equal(imported.options.find(option => option.id === "option-ai-boundary").name, importedOption);
    assert.equal(activeView(imported).selected_option_id, "option-ai-boundary");
    assert.match(await page.locator("#tableMount").textContent(), /Imported AI boundary option/);

    const privateCapsule = await page.evaluate(() => ({ fingerprint: window.alignmentWorksheet.promptCapsuleFingerprint(), markdown: window.alignmentWorksheet.promptCapsule() }));
    const privateCandidate = structuredClone(await textJson(page, "#jsonOut"));
    privateCandidate._private_annotation = "local premise note";
    privateCandidate.options[0]._private_annotation = "local option note";
    privateCandidate.inverse_state._private_annotation = { receiver: "local recovery review" };
    await page.locator("#importText").fill(JSON.stringify(privateCandidate));
    await page.locator("#importJsonBtn").click();
    const privateReceipt = await textJson(page, "#jsonOut");
    assert.equal(privateReceipt._private_annotation, "local premise note");
    assert.equal(privateReceipt.options[0]._private_annotation, "local option note");
    assert.deepEqual(privateReceipt.inverse_state._private_annotation, { receiver: "local recovery review" });
    assert.deepEqual(await page.evaluate(() => ({ fingerprint: window.alignmentWorksheet.promptCapsuleFingerprint(), markdown: window.alignmentWorksheet.promptCapsule() })), privateCapsule);

    const multiView = structuredClone(privateReceipt);
    const baseView = activeView(multiView);
    multiView.view_state.views.push({
      ...structuredClone(baseView),
      id: "view-recovery-route",
      name: "Recovery route focus",
      option_order: [...baseView.option_order].reverse(),
      hidden_option_ids: [baseView.option_order[0]],
      selected_option_id: baseView.option_order.at(-1),
      _private_annotation: "local view note",
    });
    await page.locator("#importText").fill(JSON.stringify(multiView));
    await page.locator("#importJsonBtn").click();
    assert.deepEqual(await textJson(page, "#jsonOut"), multiView);
    const beforeOptionIds = new Set(multiView.options.map(item => item.id));
    await page.locator("#addOptionBtn").click();
    const afterAdd = await textJson(page, "#jsonOut");
    const addedOption = afterAdd.options.find(item => !beforeOptionIds.has(item.id));
    assert.ok(addedOption);
    assert.ok(afterAdd.view_state.views.every(view => view.option_order.includes(addedOption.id)));
    const removeAdded = page.locator(`button.remove-option[data-id="${addedOption.id}"]`);
    await removeAdded.click();
    await removeAdded.click();
    const afterRemove = await textJson(page, "#jsonOut");
    assert.ok(afterRemove.view_state.views.every(view => !view.option_order.includes(addedOption.id) && !view.hidden_option_ids.includes(addedOption.id)));
    await page.locator("#importText").fill(JSON.stringify(afterRemove));
    await page.locator("#importJsonBtn").click();
    assert.deepEqual(await textJson(page, "#jsonOut"), afterRemove);

    const sentinel = "Alignment recovery sentinel";
    await page.locator('.blank-text[data-key="restored_state"]').fill(sentinel);
    const invalid = structuredClone(await textJson(page, "#jsonOut"));
    invalid.options = { unexpected: true };
    await page.locator("#importText").fill(JSON.stringify(invalid));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /remains available|working state retained/i);
    assert.equal((await textJson(page, "#jsonOut")).baseline_chain.find(blank => blank.key === "restored_state").text, sentinel);

    const collision = withActiveViewArtifactCollision(await textJson(page, "#jsonOut"));
    await clearNotice(page, "#importNotice");
    await page.locator("#importText").fill(JSON.stringify(collision));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /unique semantic namespace/i);
    assert.equal((await textJson(page, "#jsonOut")).baseline_chain.find(blank => blank.key === "restored_state").text, sentinel);
    const minimum = structuredClone(await textJson(page, "#jsonOut"));
    minimum.options = minimum.options.slice(0, 1);
    minimum.view_state.views.forEach(view => {
      view.option_order = [minimum.options[0].id];
      view.hidden_option_ids = [];
      view.selected_option_id = minimum.options[0].id;
    });
    await page.locator("#importText").fill(JSON.stringify(minimum));
    await page.locator("#importJsonBtn").click();
    const onlyRemove = page.locator("button.remove-option");
    assert.equal(await onlyRemove.isDisabled(), true);
    const minimumFingerprint = await page.evaluate(() => window.alignmentWorksheet.promptCapsuleFingerprint());
    await onlyRemove.evaluate(button => button.click());
    assert.equal(await page.evaluate(() => window.alignmentWorksheet.promptCapsuleFingerprint()), minimumFingerprint);
    assert.equal(await page.locator("#blankEditor label, #optionInspector label, #inverseEditor label").evaluateAll(labels => labels.every(label => Boolean(label.htmlFor && document.getElementById(label.htmlFor)))), true);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
  await assertNoScriptPromptCapsule(browser, origin, route, "#promptBox", initialPlain);
}

async function frvPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  let initialPlain = "";
  try {
    const cardId = "card-ai-generated-summary-panel";
    const initial = await page.evaluate(() => {
      const api = window.firstResponsibleVersionMatrix;
      return {
        frozen: Object.isFrozen(api),
        version: api.version,
        contract: api.contract,
        stateContract: api.stateContract,
        view: api.getPromptCapsuleView(),
        state: api.getState(),
        stateProjection: api.promptCapsuleStateProjection(),
        fingerprint: api.promptCapsuleFingerprint(),
        plain: api.promptCapsule(),
        explicitPlain: api.promptCapsuleMarkdown("plain"),
        visible: document.querySelector("#aiPrompt").textContent,
      };
    });
    initialPlain = initial.plain;
    assert.equal(initial.frozen, true);
    assert.deepEqual(
      [initial.version, initial.contract, initial.stateContract, initial.view],
      ["0.1.4", "prompt-capsule/0.1.0", "first-responsible-version-matrix-state.v0.1", "plain"],
    );
    assert.equal(initial.plain, initial.explicitPlain);
    assert.equal(initial.visible, initial.plain);
    assert.equal(initial.stateProjection.cards.length, initial.state.cards.length);
    assert.ok(initial.plain.includes(`- Fingerprint: \`${initial.fingerprint}\``));
    assert.match(initial.plain, /^# Prompt Capsule: First Responsible Version Matrix\n/u);
    assert.match(initial.plain, /## Related loops/u);
    assert.doesNotMatch(initial.plain, /## Skill assistance/u);

    await page.locator('[data-action="select"][data-id="card-ai-generated-summary-panel"]').click();
    const selectedOnly = await page.evaluate(() => ({
      selectedCardId: window.firstResponsibleVersionMatrix.getState().view_state.views[0].selected_card_id,
      fingerprint: window.firstResponsibleVersionMatrix.promptCapsuleFingerprint(),
      markdown: window.firstResponsibleVersionMatrix.promptCapsule(),
    }));
    assert.equal(selectedOnly.selectedCardId, "card-ai-generated-summary-panel");
    assert.equal(selectedOnly.fingerprint, initial.fingerprint);
    assert.equal(selectedOnly.markdown, initial.plain);

    const loopReceipt = await page.locator("[data-prompt-related-loops]").evaluate((details) => ({
      tag: details.tagName,
      open: details.open,
      summary: details.querySelector("summary")?.textContent.trim(),
      loops: [...details.querySelectorAll("[data-related-loop-id]")].map((item) => ({
        id: item.dataset.relatedLoopId,
        href: item.querySelector("a")?.href,
      })),
    }));
    assert.deepEqual(loopReceipt, {
      tag: "DETAILS",
      open: false,
      summary: "Related loops",
      loops: [
        { id: "repository-reentry", href: "https://schemas.radiantnull.com/collaboration/#repository-reentry" },
        { id: "skill-from-receiving-use", href: "https://schemas.radiantnull.com/collaboration/#skill-from-receiving-use" },
      ],
    });
    const relatedSummary = page.locator("[data-prompt-related-loops] summary");
    await relatedSummary.focus();
    const summaryBox = await relatedSummary.boundingBox();
    assert.ok(summaryBox && summaryBox.height >= 44 && summaryBox.width >= 44);
    await relatedSummary.press("Enter");
    assert.equal(await page.locator("[data-prompt-related-loops]").evaluate(element => element.open), true);
    const firstLoopBox = await page.locator("[data-related-loop-id] a").first().boundingBox();
    assert.ok(firstLoopBox && firstLoopBox.height >= 44 && firstLoopBox.width >= 44);

    const assistedControl = page.locator('[data-prompt-view][value="skill-assisted"]');
    await assistedControl.check();
    assert.equal(await assistedControl.evaluate(element => document.activeElement === element), true);
    const assisted = await page.evaluate(() => ({
      view: window.firstResponsibleVersionMatrix.getPromptCapsuleView(),
      stateProjection: window.firstResponsibleVersionMatrix.promptCapsuleStateProjection(),
      fingerprint: window.firstResponsibleVersionMatrix.promptCapsuleFingerprint(),
      markdown: window.firstResponsibleVersionMatrix.promptCapsuleMarkdown(),
      visible: document.querySelector("#aiPrompt").textContent,
    }));
    assert.equal(assisted.view, "skill-assisted");
    assert.equal(assisted.markdown, assisted.visible);
    assert.equal(assisted.fingerprint, initial.fingerprint);
    assert.deepEqual(assisted.stateProjection, initial.stateProjection);
    assert.match(assisted.markdown, /## Skill assistance/u);
    assert.match(assisted.markdown, /\.agents\/skills\/source-authority-mapping\/SKILL\.md/u);
    assert.match(assisted.markdown, /## Related loops/u);

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
    assert.equal(download.suggestedFilename(), "first-responsible-version-matrix.prompt-capsule.r0.1.4.skill-assisted.md");
    assert.equal(await page.evaluate(() => globalThis.__promptDownloadType), "text/markdown;charset=utf-8");
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString("utf8"), assisted.markdown);

    await page.locator('[data-prompt-view][value="plain"]').check();
    assert.equal(await page.locator("#aiPrompt").textContent(), initial.plain);
    const placement = page.locator(`select[data-field="placement"][data-id="${cardId}"]`);
    await placement.selectOption("above_line");

    let exported = await textJson(page, "#jsonOut");
    let card = exported.cards.find(item => item.id === cardId);
    assert.equal(card.placement, "above_line");
    const zoneHeading = await page.locator(`#cardList article[data-card-id="${cardId}"]`).evaluate(element => element.closest(".panel")?.querySelector("h3")?.textContent);
    assert.equal(zoneHeading, "Above line");
    assert.match(await page.locator("#tableEquivalent").textContent(), /Above line/);
    assert.equal(await page.locator(`#thresholdSvg [data-card-id="${cardId}"]`).count(), 1);
    assert.ok(Number(await page.locator(`#thresholdSvg [data-card-id="${cardId}"] rect`).getAttribute("y")) < 200);
    const movedCapsule = await page.evaluate(() => ({
      fingerprint: window.firstResponsibleVersionMatrix.promptCapsuleFingerprint(),
      markdown: window.firstResponsibleVersionMatrix.promptCapsule(),
    }));
    assert.notEqual(movedCapsule.fingerprint, initial.fingerprint);
    assert.notEqual(movedCapsule.markdown, initial.plain);
    assert.match(movedCapsule.markdown, /AI-generated summary panel[\s\S]*?- Focus view: `visible`; display order `6`\.[\s\S]*?- Type: `Support condition`\./u);

    await page.locator(`#cardList button[data-action="hide"][data-id="${cardId}"]`).click();
    exported = await textJson(page, "#jsonOut");
    card = exported.cards.find(item => item.id === cardId);
    assert.ok(activeView(exported).hidden_card_ids.includes(cardId));
    assert.equal(card.visible_in_active_view, false);
    assert.equal(card.placement, "above_line");
    await page.locator(`#hiddenCardsPanel button[data-action="show"][data-id="${cardId}"]`).click();

    const compatible = await textJson(page, "#jsonOut");
    const importedCard = "Imported AI summary threshold";
    compatible.cards.find(item => item.id === cardId).title = importedCard;
    activeView(compatible).selected_card_id = cardId;
    await openContainingDetails(page, "#importText");
    await page.locator("#importText").fill(JSON.stringify(compatible));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const imported = await textJson(page, "#jsonOut");
    assert.equal(imported.cards.find(item => item.id === cardId).title, importedCard);
    assert.equal(activeView(imported).selected_card_id, cardId);
    assert.match(await page.locator("#cardInspector").textContent(), /Imported AI summary threshold/);

    const sentinel = "First Responsible Version recovery sentinel";
    await page.locator(`textarea[data-field="reason"][data-id="${cardId}"]`).fill(sentinel);
    const invalid = structuredClone(await textJson(page, "#jsonOut"));
    invalid.cards = { unexpected: true };
    const retainedCapsule = await page.evaluate(() => ({
      fingerprint: window.firstResponsibleVersionMatrix.promptCapsuleFingerprint(),
      markdown: window.firstResponsibleVersionMatrix.promptCapsule(),
    }));
    await page.locator("#importText").fill(JSON.stringify(invalid));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /remains available|working state retained/i);
    assert.equal((await textJson(page, "#jsonOut")).cards.find(item => item.id === cardId).reason, sentinel);
    assert.deepEqual(await page.evaluate(() => ({
      fingerprint: window.firstResponsibleVersionMatrix.promptCapsuleFingerprint(),
      markdown: window.firstResponsibleVersionMatrix.promptCapsule(),
    })), retainedCapsule);

    const lateInvalid = structuredClone(await textJson(page, "#jsonOut"));
    lateInvalid.semantic_locality.replacement_state_guidance = [null];
    await clearNotice(page, "#importNotice");
    await page.locator("#importText").fill(JSON.stringify(lateInvalid));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /replacement_state_guidance.*object/i);
    assert.equal((await textJson(page, "#jsonOut")).cards.find(item => item.id === cardId).reason, sentinel);

    const collision = withActiveViewArtifactCollision(await textJson(page, "#jsonOut"));
    await clearNotice(page, "#importNotice");
    await page.locator("#importText").fill(JSON.stringify(collision));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /unique semantic namespace/i);
    assert.equal((await textJson(page, "#jsonOut")).cards.find(item => item.id === cardId).reason, sentinel);

    await page.evaluate(() => {
      Object.defineProperty(Navigator.prototype, "clipboard", {
        configurable: true,
        get: () => ({ writeText: async () => { throw new Error("clipboard unavailable"); } }),
      });
    });
    await page.locator("#copyPromptBtn").click();
    await page.waitForFunction(() => /manual copy/i.test(document.querySelector("#promptCapsuleStatus")?.textContent || ""));
    assert.equal(await page.locator("#aiPrompt").isVisible(), true);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }

  const stateBoundaryContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const stateBoundaryPage = await stateBoundaryContext.newPage();
    await stateBoundaryPage.goto(`${origin}/${route}`, { waitUntil: "domcontentloaded" });
    const baseline = await stateBoundaryPage.evaluate(() => ({
      state: window.firstResponsibleVersionMatrix.getState(),
      fingerprint: window.firstResponsibleVersionMatrix.promptCapsuleFingerprint(),
      markdown: window.firstResponsibleVersionMatrix.promptCapsule(),
    }));
    const privateOnly = structuredClone(baseline.state);
    privateOnly.artifact_identity.private_annotation = "local review note";
    privateOnly.cards[0].private_annotation = "local card note";
    await openContainingDetails(stateBoundaryPage, "#importText");
    await stateBoundaryPage.locator("#importText").fill(JSON.stringify(privateOnly));
    await stateBoundaryPage.locator("#importJsonBtn").click();
    await assertVisibleNotice(stateBoundaryPage, "#importNotice", /JSON imported/i);
    const privateOnlyReceipt = await stateBoundaryPage.evaluate(() => ({
      state: window.firstResponsibleVersionMatrix.getState(),
      fingerprint: window.firstResponsibleVersionMatrix.promptCapsuleFingerprint(),
      markdown: window.firstResponsibleVersionMatrix.promptCapsule(),
    }));
    assert.equal(privateOnlyReceipt.state.artifact_identity.private_annotation, "local review note");
    assert.equal(privateOnlyReceipt.state.cards[0].private_annotation, "local card note");
    assert.equal(privateOnlyReceipt.fingerprint, baseline.fingerprint);
    assert.equal(privateOnlyReceipt.markdown, baseline.markdown);

    const semanticChange = structuredClone(privateOnlyReceipt.state);
    semanticChange.semantic_locality.preferred_phrasing[0] = "Which evidence makes this threshold responsible?";
    await stateBoundaryPage.locator("#importText").fill(JSON.stringify(semanticChange));
    await stateBoundaryPage.locator("#importJsonBtn").click();
    await assertVisibleNotice(stateBoundaryPage, "#importNotice", /JSON imported/i);
    const semanticReceipt = await stateBoundaryPage.evaluate(() => ({
      fingerprint: window.firstResponsibleVersionMatrix.promptCapsuleFingerprint(),
      markdown: window.firstResponsibleVersionMatrix.promptCapsule(),
    }));
    assert.notEqual(semanticReceipt.fingerprint, baseline.fingerprint);
    assert.notEqual(semanticReceipt.markdown, baseline.markdown);
    assert.match(semanticReceipt.markdown, /Which evidence makes this threshold responsible\?/u);
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
    const details = noScriptPage.locator("[data-prompt-related-loops]");
    assert.equal(await details.isVisible(), true);
    await details.locator("summary").click();
    assert.equal(await details.evaluate(element => element.open), true);
    const containment = await noScriptPage.locator("html").evaluate(root => ({
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
    }));
    assert.ok(containment.scrollWidth <= containment.clientWidth + 1, JSON.stringify(containment));
  } finally {
    await noScriptContext.close();
  }
}

async function sharedSurfacePath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  let initialPrompt;
  try {
    initialPrompt = await exercisePromptCapsule(page, {
      apiName: "sharedSurfacePriorityMap",
      copySelector: "#copyPromptBtn",
      downloadSelector: "#downloadPromptBtn",
      filename: "shared-surface-priority-map.prompt-capsule.r0.1.4.skill-assisted.md",
      loopIds: ["visitor-surface-change", "repository-reentry"],
      promptSelector: "#aiPrompt",
      stateContract: "shared-surface-priority-map-state.v0.1",
      title: "Shared Surface Priority Map",
      version: "0.1.4",
    });
    assert.equal(
      initialPrompt.projection.shared_surface_priority_map.heatmap_cells.length,
      initialPrompt.state.shared_surface_priority_map.heatmap_cells.length,
      "the capsule represents every priority cell",
    );
    assert.equal(
      initialPrompt.projection.shared_surface_priority_map.shared_assets.length,
      initialPrompt.state.shared_surface_priority_map.shared_assets.length,
      "the capsule represents every shared asset",
    );
    assert.equal(
      initialPrompt.projection.view_state.views.length,
      initialPrompt.state.view_state.views.length,
      "the capsule represents every accepted focus view",
    );
    await assertPromptCapsuleKeyOrderStability(page, "sharedSurfacePriorityMap");
    const cellId = "cell-analysis-environment__stage-review";
    const assetId = "asset-claim-source-map";
    await page.locator(`button[data-select-cell="${cellId}"]`).click();
    assert.deepEqual(await page.evaluate(() => ({
      fingerprint: window.sharedSurfacePriorityMap.promptCapsuleFingerprint(),
      markdown: window.sharedSurfacePriorityMap.promptCapsule(),
    })), { fingerprint: initialPrompt.fingerprint, markdown: initialPrompt.plain });
    await page.locator('select[data-cell-basis="workflow_consequence"]').selectOption("disputed");
    const asset = page.locator(`input[data-cell-asset="${assetId}"]`);
    if (!(await asset.isChecked())) await asset.check();

    let exported = await copiedJson(page, "#copyJsonBtn");
    let cell = exported.shared_surface_priority_map.heatmap_cells.find(item => item.id === cellId);
    assert.equal(cell.intensity_by_basis.workflow_consequence, "disputed");
    assert.equal(cell.composite_intensity, "disputed");
    assert.ok(cell.linked_shared_asset_ids.includes(assetId));
    const sharedAsset = exported.shared_surface_priority_map.shared_assets.find(item => item.id === assetId);
    assert.ok(sharedAsset.supported_cells.includes(cellId));
    assert.ok(sharedAsset.supported_stage_ids.includes("stage-review"));
    assert.match(await page.locator(`#tableEquivalent button[data-select-cell="${cellId}"]`).getAttribute("class"), /disputed/);
    const jsonLd = JSON.parse(await page.locator("#jsonLdScript").textContent());
    const cellNode = jsonLd["@graph"].find(node => node.id === `#${cellId}`);
    assert.ok(cellNode.linkedSharedAsset.includes(`#${assetId}`));
    const changedPrompt = await page.evaluate(() => ({
      fingerprint: window.sharedSurfacePriorityMap.promptCapsuleFingerprint(),
      markdown: window.sharedSurfacePriorityMap.promptCapsule(),
    }));
    assert.notEqual(changedPrompt.fingerprint, initialPrompt.fingerprint);
    assert.match(changedPrompt.markdown, /asset-claim-source-map/u);

    await page.locator('[data-hide-surface="surface-analysis-environment"]').click();
    exported = await copiedJson(page, "#copyJsonBtn");
    cell = exported.shared_surface_priority_map.heatmap_cells.find(item => item.id === cellId);
    assert.ok(activeView(exported).hidden_surface_ids.includes("surface-analysis-environment"));
    assert.equal(cell.visible_in_active_view, false);
    assert.ok(cell.linked_shared_asset_ids.includes(assetId));
    await page.locator('[data-show-surface="surface-analysis-environment"]').click();

    const compatible = await copiedJson(page, "#copyJsonBtn");
    const importedCell = "Imported <strong>shared-surface</strong> decision";
    compatible.shared_surface_priority_map.heatmap_cells.find(item => item.id === cellId).note = importedCell;
    activeView(compatible).selected_cell_id = cellId;
    await openContainingDetails(page, "#importText");
    await page.locator("#importText").fill(JSON.stringify(compatible));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const imported = await copiedJson(page, "#copyJsonBtn");
    assert.equal(imported.shared_surface_priority_map.heatmap_cells.find(item => item.id === cellId).note, importedCell);
    assert.equal(activeView(imported).selected_cell_id, cellId);
    assert.match(await page.locator("#inspector").textContent(), /Imported <strong>shared-surface<\/strong> decision/);
    assert.match(
      await page.evaluate(() => window.sharedSurfacePriorityMap.promptCapsule()),
      /Imported &lt;strong&gt;shared-surface&lt;\/strong&gt; decision/u,
    );

    await page.locator(`button[data-select-cell="${cellId}"]`).click();
    const sentinel = "Shared Surface recovery sentinel";
    await page.locator("#cell-note").fill(sentinel);
    const invalid = structuredClone(await copiedJson(page, "#copyJsonBtn"));
    invalid.shared_surface_priority_map.stages = { unexpected: true };
    await page.locator("#importText").fill(JSON.stringify(invalid));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /remains available|working state retained/i);
    const recovered = await copiedJson(page, "#copyJsonBtn");
    assert.equal(recovered.shared_surface_priority_map.heatmap_cells.find(item => item.id === cellId).note, sentinel);

    const lateInvalid = structuredClone(recovered);
    activeView(lateInvalid).active_intensity_basis_ids = [null];
    await clearNotice(page, "#importNotice");
    await page.locator("#importText").fill(JSON.stringify(lateInvalid));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /intensity basis/i);
    assert.equal((await copiedJson(page, "#copyJsonBtn")).shared_surface_priority_map.heatmap_cells.find(item => item.id === cellId).note, sentinel);

    const collision = withActiveViewArtifactCollision(await copiedJson(page, "#copyJsonBtn"));
    await clearNotice(page, "#importNotice");
    await page.locator("#importText").fill(JSON.stringify(collision));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /unique semantic namespace/i);
    assert.equal((await copiedJson(page, "#copyJsonBtn")).shared_surface_priority_map.heatmap_cells.find(item => item.id === cellId).note, sentinel);

    const privateExtensionReceipt = await page.evaluate(() => {
      const api = window.sharedSurfacePriorityMap;
      const before = { fingerprint: api.promptCapsuleFingerprint(), markdown: api.promptCapsule() };
      const candidate = api.getState();
      candidate.private_review_note = "local priority-map note";
      candidate.shared_surface_priority_map.private_review_note = "local body note";
      candidate.view_state.private_review_note = "local view note";
      api.importState(candidate);
      const roundtrip = api.getState();
      return {
        before,
        after: { fingerprint: api.promptCapsuleFingerprint(), markdown: api.promptCapsule() },
        retained: [
          roundtrip.private_review_note,
          roundtrip.shared_surface_priority_map.private_review_note,
          roundtrip.view_state.private_review_note,
        ],
      };
    });
    assert.deepEqual(privateExtensionReceipt.after, privateExtensionReceipt.before);
    assert.deepEqual(privateExtensionReceipt.retained, ["local priority-map note", "local body note", "local view note"]);

    const multiViewReceipt = await page.evaluate(cell => {
      const api = window.sharedSurfacePriorityMap;
      const candidate = api.getState();
      const second = structuredClone(candidate.view_state.views[0]);
      second.id = "view-contract-second";
      second.name = "Contract second view";
      second.selected_cell_id = "";
      second.selected_shared_asset_id = "";
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
    assert.equal(multiViewReceipt.withSecond.projection.view_state.views.length, 2);
    assert.deepEqual(multiViewReceipt.afterSelection, multiViewReceipt.withSecond);

    await page.locator("#addSurfaceBtn").click();
    const withAddedSurface = await copiedJson(page, "#copyJsonBtn");
    const addedSurface = withAddedSurface.shared_surface_priority_map.surfaces.at(-1);
    const addedSurfaceCell = withAddedSurface.shared_surface_priority_map.heatmap_cells.find(
      candidate => candidate.surface_id === addedSurface.id,
    );
    assert.ok(addedSurfaceCell, "A new surface should own stage-intersection cells");
    for (const focusView of withAddedSurface.view_state.views) {
      assert.equal(focusView.surface_order.filter(id => id === addedSurface.id).length, 1);
    }
    await page.evaluate(({ surfaceId, cellId: selectedCellId }) => {
      const api = window.sharedSurfacePriorityMap;
      const candidate = api.getState();
      const second = candidate.view_state.views.find(view => view.id === "view-contract-second");
      second.hidden_surface_ids.push(surfaceId);
      second.selected_cell_id = selectedCellId;
      api.importState(candidate);
    }, { surfaceId: addedSurface.id, cellId: addedSurfaceCell.id });
    const removeSurfaceButton = page.locator(`[data-remove-surface="${addedSurface.id}"]`);
    await removeSurfaceButton.click();
    assert.equal(await removeSurfaceButton.textContent(), "Confirm removal");
    await removeSurfaceButton.click();
    const withoutAddedSurface = await copiedJson(page, "#copyJsonBtn");
    assert.equal(
      withoutAddedSurface.shared_surface_priority_map.surfaces.some(({ id }) => id === addedSurface.id),
      false,
    );
    for (const focusView of withoutAddedSurface.view_state.views) {
      assert.equal(focusView.surface_order.includes(addedSurface.id), false);
      assert.equal(focusView.hidden_surface_ids.includes(addedSurface.id), false);
      assert.ok(
        !focusView.selected_cell_id
          || withoutAddedSurface.shared_surface_priority_map.heatmap_cells.some(({ id }) => id === focusView.selected_cell_id),
      );
    }

    await page.locator("#addAssetBtn").click();
    const withAddedAsset = await copiedJson(page, "#copyJsonBtn");
    const addedAsset = withAddedAsset.shared_surface_priority_map.shared_assets.at(-1);
    for (const focusView of withAddedAsset.view_state.views) {
      assert.equal(focusView.shared_asset_order.filter(id => id === addedAsset.id).length, 1);
    }
    await page.evaluate(assetId => {
      const api = window.sharedSurfacePriorityMap;
      const candidate = api.getState();
      const second = candidate.view_state.views.find(view => view.id === "view-contract-second");
      second.hidden_shared_asset_ids.push(assetId);
      second.selected_shared_asset_id = assetId;
      api.importState(candidate);
    }, addedAsset.id);
    const removeAssetButton = page.locator(`[data-remove-asset="${addedAsset.id}"]`);
    await removeAssetButton.click();
    assert.equal(await removeAssetButton.textContent(), "Confirm removal");
    await removeAssetButton.click();
    const withoutAddedAsset = await copiedJson(page, "#copyJsonBtn");
    assert.equal(
      withoutAddedAsset.shared_surface_priority_map.shared_assets.some(({ id }) => id === addedAsset.id),
      false,
    );
    for (const focusView of withoutAddedAsset.view_state.views) {
      assert.equal(focusView.shared_asset_order.includes(addedAsset.id), false);
      assert.equal(focusView.hidden_shared_asset_ids.includes(addedAsset.id), false);
      assert.notEqual(focusView.selected_shared_asset_id, addedAsset.id);
    }
    const sharedSurfaceSelfImport = await page.evaluate(() => {
      const api = window.sharedSurfacePriorityMap;
      const before = api.getState();
      api.importState(before);
      return { before, after: api.getState() };
    });
    assert.deepEqual(sharedSurfaceSelfImport.after, sharedSurfaceSelfImport.before);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
  await assertNoScriptPromptCapsule(browser, origin, route, "#aiPrompt", initialPrompt.plain);
}

async function aiSystemsPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  let initialPrompt;
  try {
    initialPrompt = await exercisePromptCapsule(page, {
      apiName: "aiSystemsServiceBlueprint",
      copySelector: "#copyPromptBtn",
      downloadSelector: "#downloadPromptBtn",
      filename: "ai-systems-service-blueprint.prompt-capsule.r0.1.5.skill-assisted.md",
      loopIds: ["repository-reentry", "visitor-surface-change"],
      promptSelector: "#promptOut",
      stateContract: "ai-systems-service-blueprint-state.v0.1",
      title: "AI Systems Service Blueprint",
      version: "0.1.5",
    });
    assert.equal(
      initialPrompt.projection.ai_systems_service_blueprint.cells.length,
      initialPrompt.state.ai_systems_service_blueprint.cells.length,
      "the capsule represents every topology cell",
    );
    assert.equal(
      initialPrompt.projection.view_state.views.length,
      initialPrompt.state.view_state.views.length,
      "the capsule represents every accepted focus view",
    );
    await assertPromptCapsuleKeyOrderStability(page, "aiSystemsServiceBlueprint");
    const cellId = "cell-runtime__plan";
    const literal = "Orchestrator keeps <strong>plan limits</strong> visible.";
    await page.locator(`textarea[data-bind="cell-text"][data-id="${cellId}"]`).click();
    assert.deepEqual(await page.evaluate(() => ({
      fingerprint: window.aiSystemsServiceBlueprint.promptCapsuleFingerprint(),
      markdown: window.aiSystemsServiceBlueprint.promptCapsule(),
    })), { fingerprint: initialPrompt.fingerprint, markdown: initialPrompt.plain });
    await page.locator(`textarea[data-bind="cell-text"][data-id="${cellId}"]`).fill(literal);
    await page.locator(`select[data-bind="cell-status"][data-id="${cellId}"]`).selectOption("ready_to_route");
    await page.locator(`select[data-bind="cell-veracity"][data-id="${cellId}"]`).selectOption("source_specific");

    let exported = await valueJson(page, "#jsonOut");
    let cell = exported.ai_systems_service_blueprint.cells.find(item => item.id === cellId);
    assert.equal(cell.text, literal);
    assert.equal(cell.status, "ready_to_route");
    assert.equal(cell.veracity, "source_specific");
    assert.equal(cell.layer_id, "layer-runtime");
    assert.equal(cell.stage_id, "stage-plan");
    assert.match(await page.locator(`#topologySvg [data-cell-id="${cellId}"] title`).textContent(), /Orchestrator keeps <strong>plan limits/);
    assert.equal(await page.locator(`textarea[data-bind="cell-text"][data-id="${cellId}"]`).inputValue(), literal);
    assert.match(await page.locator(`select[data-bind="cell-route"][data-id="cell-runtime__intake"] option:checked`).textContent(), /No route yet/i);
    const changedPrompt = await page.evaluate(() => ({
      fingerprint: window.aiSystemsServiceBlueprint.promptCapsuleFingerprint(),
      markdown: window.aiSystemsServiceBlueprint.promptCapsule(),
    }));
    assert.notEqual(changedPrompt.fingerprint, initialPrompt.fingerprint);
    assert.match(changedPrompt.markdown, /Orchestrator keeps \\<strong\\>plan limits\\<\/strong\\> visible\./u);

    const stageIds = new Set(exported.ai_systems_service_blueprint.stages.map(stage => stage.id));
    const layerIds = new Set(exported.ai_systems_service_blueprint.layers.map(layer => layer.id));
    assert.ok(exported.ai_systems_service_blueprint.cells.every(item => stageIds.has(item.stage_id) && layerIds.has(item.layer_id)));

    await page.locator('button[data-action="hide-layer"][data-id="layer-runtime"]').click();
    exported = await valueJson(page, "#jsonOut");
    cell = exported.ai_systems_service_blueprint.cells.find(item => item.id === cellId);
    assert.ok(activeView(exported).hidden_layer_ids.includes("layer-runtime"));
    assert.equal(cell.visible_in_active_view, false);
    assert.equal(cell.text, literal);
    await page.locator('button[data-action="show-layer"][data-id="layer-runtime"]').click();

    const compatible = await valueJson(page, "#jsonOut");
    const importedCell = "Imported AI systems topology";
    compatible.ai_systems_service_blueprint.cells.find(item => item.id === cellId).text = importedCell;
    activeView(compatible).selected_cell_id = cellId;
    await page.locator("#jsonImport").fill(JSON.stringify(compatible));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const imported = await valueJson(page, "#jsonOut");
    assert.equal(imported.ai_systems_service_blueprint.cells.find(item => item.id === cellId).text, importedCell);
    assert.equal(activeView(imported).selected_cell_id, cellId);
    assert.match(await page.locator("#cellInspector").textContent(), /Imported AI systems topology/);

    const sentinel = "AI Systems recovery sentinel";
    await page.locator(`textarea[data-bind="cell-text"][data-id="${cellId}"]`).fill(sentinel);
    const invalid = structuredClone(await valueJson(page, "#jsonOut"));
    invalid.view_state.views = [];
    await page.locator("#jsonImport").fill(JSON.stringify(invalid));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /remains available|working state retained/i);
    assert.equal((await valueJson(page, "#jsonOut")).ai_systems_service_blueprint.cells.find(item => item.id === cellId).text, sentinel);

    const privateExtensionReceipt = await page.evaluate(() => {
      const api = window.aiSystemsServiceBlueprint;
      const before = { fingerprint: api.promptCapsuleFingerprint(), markdown: api.promptCapsule() };
      const candidate = api.getState();
      candidate.private_review_note = "local topology note";
      candidate.ai_systems_service_blueprint.private_review_note = "local body note";
      candidate.view_state.private_review_note = "local view note";
      candidate.artifact_identity.private_review_note = "local identity note";
      candidate.quick_use.private_review_note = "local quick-use note";
      candidate.ai_systems_service_blueprint.stages[0].private_review_note = "local stage note";
      candidate.ai_systems_service_blueprint.layers[0].private_review_note = "local layer note";
      candidate.ai_systems_service_blueprint.cells[0].private_review_note = "local cell note";
      candidate.ai_systems_service_blueprint.components[0].private_review_note = "local component note";
      candidate.view_state.views[0].private_review_note = "local focus-view note";
      candidate.semantic_locality.private_review_note = "local language note";
      candidate.semantic_locality.replacement_state_guidance[0].private_review_note = "local guidance note";
      candidate.recovery_calibration.private_review_note = "local recovery note";
      api.importState(candidate);
      const roundtrip = api.getState();
      return {
        before,
        after: { fingerprint: api.promptCapsuleFingerprint(), markdown: api.promptCapsule() },
        retained: [
          roundtrip.private_review_note,
          roundtrip.ai_systems_service_blueprint.private_review_note,
          roundtrip.view_state.private_review_note,
          roundtrip.artifact_identity.private_review_note,
          roundtrip.quick_use.private_review_note,
          roundtrip.ai_systems_service_blueprint.stages[0].private_review_note,
          roundtrip.ai_systems_service_blueprint.layers[0].private_review_note,
          roundtrip.ai_systems_service_blueprint.cells[0].private_review_note,
          roundtrip.ai_systems_service_blueprint.components[0].private_review_note,
          roundtrip.view_state.views[0].private_review_note,
          roundtrip.semantic_locality.private_review_note,
          roundtrip.semantic_locality.replacement_state_guidance[0].private_review_note,
          roundtrip.recovery_calibration.private_review_note,
        ],
      };
    });
    assert.deepEqual(privateExtensionReceipt.after, privateExtensionReceipt.before);
    assert.deepEqual(privateExtensionReceipt.retained, [
      "local topology note", "local body note", "local view note", "local identity note", "local quick-use note",
      "local stage note", "local layer note", "local cell note", "local component note", "local focus-view note",
      "local language note", "local guidance note", "local recovery note",
    ]);

    const multiViewReceipt = await page.evaluate(cell => {
      const api = window.aiSystemsServiceBlueprint;
      const candidate = api.getState();
      const second = structuredClone(candidate.view_state.views[0]);
      second.id = "view-contract-second";
      second.name = "Contract second view";
      second.selected_cell_id = "";
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
    assert.equal(multiViewReceipt.withSecond.projection.view_state.views.length, 2);
    assert.deepEqual(multiViewReceipt.afterSelection, multiViewReceipt.withSecond);

    const collision = withActiveViewArtifactCollision(await valueJson(page, "#jsonOut"));
    await clearNotice(page, "#importNotice");
    await page.locator("#jsonImport").fill(JSON.stringify(collision));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /unique semantic namespace/i);
    assert.equal((await valueJson(page, "#jsonOut")).ai_systems_service_blueprint.cells.find(item => item.id === cellId).text, sentinel);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
  await assertNoScriptPromptCapsule(browser, origin, route, "#promptOut", initialPrompt.plain);
}

async function softwareViewsPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  let initialPrompt;
  try {
    initialPrompt = await exercisePromptCapsule(page, {
      apiName: "softwareArchitectureViews",
      copySelector: "#copyPromptBtn",
      downloadSelector: "#downloadPromptBtn",
      filename: "software-architecture-views.prompt-capsule.r0.1.4.skill-assisted.md",
      loopIds: ["repository-reentry", "visitor-surface-change"],
      promptSelector: "#aiPrompt",
      stateContract: "software-architecture-views-state.v0.1",
      title: "Software Architecture Views",
      version: "0.1.4",
    });
    assert.equal(
      initialPrompt.projection.software_architecture_views.attachments.length,
      initialPrompt.state.software_architecture_views.attachments.length,
      "the capsule represents every architecture attachment",
    );
    assert.equal(
      initialPrompt.projection.view_state.views.length,
      initialPrompt.state.view_state.views.length,
      "the capsule represents every accepted focus view",
    );
    await assertPromptCapsuleKeyOrderStability(page, "softwareArchitectureViews");
    const attachmentId = "att-review-state-service";
    const literal = "Review state crosses <strong>service and audit</strong> attachments.";
    await page.locator(`button[data-action="select-attachment"][data-id="${attachmentId}"]`).click();
    assert.deepEqual(await page.evaluate(() => ({
      fingerprint: window.softwareArchitectureViews.promptCapsuleFingerprint(),
      markdown: window.softwareArchitectureViews.promptCapsule(),
    })), { fingerprint: initialPrompt.fingerprint, markdown: initialPrompt.plain });
    await page.locator("#attRelationship").fill(literal);

    let exported = await textJson(page, "#jsonOut");
    let attachment = exported.software_architecture_views.attachments.find(item => item.id === attachmentId);
    assert.equal(attachment.relationship, literal);
    assert.match(await page.locator(`#attachmentSvg [data-attachment-id="${attachmentId}"] title`).textContent(), /Review state crosses <strong>service and audit/);
    assert.match(await page.locator("#attachmentTable").textContent(), /Review state crosses <strong>service and audit/);
    const jsonLd = await textJson(page, "#jsonLdOut");
    const attachmentNode = jsonLd["@graph"].find(node => node.id === `#${attachmentId}`);
    assert.equal(attachmentNode["ca:belongsToView"].id, "#view-module");
    const changedPrompt = await page.evaluate(() => ({
      fingerprint: window.softwareArchitectureViews.promptCapsuleFingerprint(),
      markdown: window.softwareArchitectureViews.promptCapsule(),
    }));
    assert.notEqual(changedPrompt.fingerprint, initialPrompt.fingerprint);
    assert.match(changedPrompt.markdown, /Review state crosses \\<strong\\>service and audit\\<\/strong\\> attachments\./u);

    await page.locator(`#attachmentTable button[data-action="toggle-attachment"][data-id="${attachmentId}"]`).click();
    exported = await textJson(page, "#jsonOut");
    attachment = exported.software_architecture_views.attachments.find(item => item.id === attachmentId);
    assert.ok(activeView(exported).hidden_attachment_ids.includes(attachmentId));
    assert.equal(attachment.visible_in_active_view, false);
    assert.equal(attachment.relationship, literal);
    await page.locator("#showAllAttachmentsBtn").click();

    const compatible = await textJson(page, "#jsonOut");
    const importedAttachment = "Imported software attachment relationship";
    compatible.software_architecture_views.attachments.find(item => item.id === attachmentId).relationship = importedAttachment;
    activeView(compatible).selected_attachment_id = attachmentId;
    await openContainingDetails(page, "#jsonImport");
    await page.locator("#jsonImport").fill(JSON.stringify(compatible));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const imported = await textJson(page, "#jsonOut");
    assert.equal(imported.software_architecture_views.attachments.find(item => item.id === attachmentId).relationship, importedAttachment);
    assert.equal(activeView(imported).selected_attachment_id, attachmentId);
    assert.match(await page.locator("#attachmentTable").textContent(), /Imported software attachment relationship/);

    await page.locator(`button[data-action="select-attachment"][data-id="${attachmentId}"]`).click();
    const sentinel = "Software Views recovery sentinel";
    await page.locator("#attRelationship").fill(sentinel);
    const invalid = structuredClone(await textJson(page, "#jsonOut"));
    invalid.software_architecture_views.views = [null];
    await page.locator("#jsonImport").fill(JSON.stringify(invalid));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /remains available|working state retained/i);
    assert.equal((await textJson(page, "#jsonOut")).software_architecture_views.attachments.find(item => item.id === attachmentId).relationship, sentinel);

    const privateExtensionReceipt = await page.evaluate(() => {
      const api = window.softwareArchitectureViews;
      const before = { fingerprint: api.promptCapsuleFingerprint(), markdown: api.promptCapsule() };
      const candidate = api.getState();
      candidate.private_review_note = "local architecture note";
      candidate.software_architecture_views.private_review_note = "local body note";
      candidate.view_state.private_review_note = "local view note";
      candidate.artifact_identity.private_review_note = "local identity note";
      candidate.quick_use.private_review_note = "local quick-use note";
      candidate.modeled_element.private_review_note = "local modeled-element note";
      candidate.software_architecture_views.views[0].private_review_note = "local architecture-view note";
      candidate.software_architecture_views.attachments[0].private_review_note = "local attachment note";
      candidate.view_state.views[0].private_review_note = "local focus-view note";
      candidate.semantic_locality.private_review_note = "local language note";
      candidate.semantic_locality.replacement_state_guidance[0].private_review_note = "local guidance note";
      candidate.recovery_calibration.private_review_note = "local recovery note";
      api.importState(candidate);
      const roundtrip = api.getState();
      return {
        before,
        after: { fingerprint: api.promptCapsuleFingerprint(), markdown: api.promptCapsule() },
        retained: [
          roundtrip.private_review_note,
          roundtrip.software_architecture_views.private_review_note,
          roundtrip.view_state.private_review_note,
          roundtrip.artifact_identity.private_review_note,
          roundtrip.quick_use.private_review_note,
          roundtrip.modeled_element.private_review_note,
          roundtrip.software_architecture_views.views[0].private_review_note,
          roundtrip.software_architecture_views.attachments[0].private_review_note,
          roundtrip.view_state.views[0].private_review_note,
          roundtrip.semantic_locality.private_review_note,
          roundtrip.semantic_locality.replacement_state_guidance[0].private_review_note,
          roundtrip.recovery_calibration.private_review_note,
        ],
      };
    });
    assert.deepEqual(privateExtensionReceipt.after, privateExtensionReceipt.before);
    assert.deepEqual(privateExtensionReceipt.retained, [
      "local architecture note", "local body note", "local view note", "local identity note", "local quick-use note",
      "local modeled-element note", "local architecture-view note", "local attachment note", "local focus-view note",
      "local language note", "local guidance note", "local recovery note",
    ]);

    const multiViewReceipt = await page.evaluate(attachment => {
      const api = window.softwareArchitectureViews;
      const candidate = api.getState();
      const second = structuredClone(candidate.view_state.views[0]);
      second.id = "view-contract-second";
      second.name = "Contract second view";
      second.selected_attachment_id = "";
      candidate.view_state.views.push(second);
      api.importState(candidate);
      const withSecond = { fingerprint: api.promptCapsuleFingerprint(), projection: api.promptCapsuleStateProjection() };
      const selectionOnly = api.getState();
      selectionOnly.view_state.views.find(view => view.id === "view-contract-second").selected_attachment_id = attachment;
      api.importState(selectionOnly);
      return {
        withSecond,
        afterSelection: { fingerprint: api.promptCapsuleFingerprint(), projection: api.promptCapsuleStateProjection() },
      };
    }, attachmentId);
    assert.equal(multiViewReceipt.withSecond.projection.view_state.views.length, 2);
    assert.deepEqual(multiViewReceipt.afterSelection, multiViewReceipt.withSecond);

    const collision = structuredClone(await textJson(page, "#jsonOut"));
    collision.software_architecture_views.attachments.find(item => item.id === attachmentId).id = "view-module";
    collision.view_state.views.forEach(view => { view.selected_attachment_id = ""; });
    activeView(collision).hidden_attachment_ids = [];
    await clearNotice(page, "#importNotice");
    await page.locator("#jsonImport").fill(JSON.stringify(collision));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /unique semantic namespace/i);
    assert.equal((await textJson(page, "#jsonOut")).software_architecture_views.attachments.find(item => item.id === attachmentId).relationship, sentinel);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
  await assertNoScriptPromptCapsule(browser, origin, route, "#aiPrompt", initialPrompt.plain);
}

async function participatoryPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  let initialPlain = "";
  try {
    const itemId = "bar-consent-exception";
    const fragmentId = "frag-consent-route";
    const literal = "the review route stays visible as <strong>collaborator text</strong>";
    const initial = await page.evaluate(() => {
      const api = window.participatoryDesignKit;
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
        visible: document.querySelector("#ai-prompt").textContent,
      };
    });
    initialPlain = initial.plain;
    assert.equal(initial.frozen, true);
    assert.deepEqual(
      [initial.version, initial.contract, initial.stateContract, initial.view],
      ["0.1.4", "prompt-capsule/0.1.0", "participatory-design-kit-state.v0.1", "plain"],
    );
    assert.equal(initial.plain, initial.explicitPlain);
    assert.equal(initial.visible, initial.plain);
    assert.equal(initial.projection.kit.gantt_items.length, initial.state.participatory_design_kit.gantt_items.length);
    assert.equal(initial.projection.kit.example_fragments.length, initial.state.participatory_design_kit.example_fragments.length);
    assert.ok(initial.plain.includes(`- Fingerprint: \`${initial.fingerprint}\``));
    assert.match(initial.plain, /^# Prompt Capsule: Participatory Design Kit\n/u);
    assert.match(initial.plain, /## Related loops/u);
    assert.doesNotMatch(initial.plain, /## Skill assistance/u);

    await page.locator(`button[data-action="select"][data-type="item"][data-id="${itemId}"]`).click();
    const selectedOnly = await page.evaluate(() => ({
      selectedId: window.participatoryDesignKit.getState().view_state.views[0].selected_id,
      fingerprint: window.participatoryDesignKit.promptCapsuleFingerprint(),
      markdown: window.participatoryDesignKit.promptCapsule(),
    }));
    assert.equal(selectedOnly.selectedId, itemId);
    assert.equal(selectedOnly.fingerprint, initial.fingerprint);
    assert.equal(selectedOnly.markdown, initial.plain);

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
        { id: "skill-from-receiving-use", href: "https://schemas.radiantnull.com/collaboration/#skill-from-receiving-use" },
        { id: "repository-reentry", href: "https://schemas.radiantnull.com/collaboration/#repository-reentry" },
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
      view: window.participatoryDesignKit.getPromptCapsuleView(),
      projection: window.participatoryDesignKit.promptCapsuleStateProjection(),
      fingerprint: window.participatoryDesignKit.promptCapsuleFingerprint(),
      markdown: window.participatoryDesignKit.promptCapsuleMarkdown(),
      visible: document.querySelector("#ai-prompt").textContent,
    }));
    assert.equal(assisted.view, "skill-assisted");
    assert.equal(assisted.markdown, assisted.visible);
    assert.equal(assisted.fingerprint, initial.fingerprint);
    assert.deepEqual(assisted.projection, initial.projection);
    assert.match(assisted.markdown, /## Skill assistance/u);
    assert.match(assisted.markdown, /\.agents\/skills\/source-authority-mapping\/SKILL\.md/u);

    await page.evaluate(() => { globalThis.__coreClipboard = ""; });
    await page.locator("#copy-prompt").click();
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
    await page.locator("#download-prompt").click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), "participatory-design-kit.prompt-capsule.r0.1.4.skill-assisted.md");
    assert.equal(await page.evaluate(() => globalThis.__promptDownloadType), "text/markdown;charset=utf-8");
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString("utf8"), assisted.markdown);
    await page.locator('[data-prompt-view][value="plain"]').check();
    assert.equal(await page.locator("#ai-prompt").textContent(), initial.plain);

    await page.locator(`select[data-kind="item"][data-id="${itemId}"][data-field="lane_id"]`).selectOption("lane-reviewer");
    await page.locator(`select[data-kind="item"][data-id="${itemId}"][data-field="start_phase_id"]`).selectOption("phase-review");
    await page.locator(`select[data-kind="item"][data-id="${itemId}"][data-field="end_phase_id"]`).selectOption("phase-exception-routing");
    const fragmentThen = page.locator(`textarea[data-kind="fragment"][data-id="${fragmentId}"][data-field="then"]`);
    await fragmentThen.fill(literal);
    await fragmentThen.press("Tab");

    let exported = await textJson(page, "#json-export");
    let body = exported.participatory_design_kit;
    const item = body.gantt_items.find(candidate => candidate.id === itemId);
    const fragment = body.example_fragments.find(candidate => candidate.id === fragmentId);
    assert.equal(item.lane_id, "lane-reviewer");
    assert.equal(item.start_phase_id, "phase-review");
    assert.equal(item.end_phase_id, "phase-exception-routing");
    assert.equal(fragment.then, literal);
    const changedCapsule = await page.evaluate(() => ({
      fingerprint: window.participatoryDesignKit.promptCapsuleFingerprint(),
      markdown: window.participatoryDesignKit.promptCapsule(),
    }));
    assert.notEqual(changedCapsule.fingerprint, initial.fingerprint);
    assert.notEqual(changedCapsule.markdown, initial.plain);
    assert.ok(
      changedCapsule.markdown.includes(
        "the review route stays visible as &lt;strong&gt;collaborator text&lt;/strong&gt;",
      ),
    );
    assert.match(await page.locator("#inspector").textContent(), /Reviewer workflow/);
    assert.match(await page.locator("#svg-wrap").textContent(), /Route consent-state exception/);
    assert.ok(Number(await page.locator(`#svg-wrap .svg-select[data-type="item"][data-id="${itemId}"] rect`).getAttribute("width")) > 300);
    await page.locator(`button[data-action="select"][data-type="fragment"][data-id="${fragmentId}"]`).click();
    assert.match(await page.locator("#inspector").textContent(), /<strong>collaborator text<\/strong>/);
    const jsonLd = JSON.parse(await page.locator("#embedded-jsonld").textContent());
    assert.ok(jsonLd["@graph"].some(node => node.id === `#${fragmentId}` && node["ca:then"] === literal));

    await page.locator('button[data-action="hide-lane"][data-id="lane-reviewer"]').click();
    exported = await textJson(page, "#json-export");
    body = exported.participatory_design_kit;
    assert.ok(activeView(exported).hidden_lane_ids.includes("lane-reviewer"));
    assert.ok(body.gantt_items.some(candidate => candidate.id === itemId && candidate.lane_id === "lane-reviewer"));
    await page.locator('button[data-action="show-lane"][data-id="lane-reviewer"]').click();

    const compatible = await textJson(page, "#json-export");
    const importedFragment = "the imported route remains visible";
    compatible.participatory_design_kit.example_fragments.find(candidate => candidate.id === fragmentId).then = importedFragment;
    activeView(compatible).selected_type = "fragment";
    activeView(compatible).selected_id = fragmentId;
    await page.locator("#json-import").fill(JSON.stringify(compatible));
    await page.locator("#import-json").click();
    await assertVisibleNotice(page, "#import-note", /updated|imported/i);
    const imported = await textJson(page, "#json-export");
    assert.equal(imported.participatory_design_kit.example_fragments.find(candidate => candidate.id === fragmentId).then, importedFragment);
    assert.equal(activeView(imported).selected_id, fragmentId);
    assert.match(await page.locator("#inspector").textContent(), /the imported route remains visible/);

    const sentinel = "Participatory recovery sentinel";
    await page.locator(`textarea[data-kind="fragment"][data-id="${fragmentId}"][data-field="then"]`).fill(sentinel);
    const invalid = structuredClone(await textJson(page, "#json-export"));
    invalid.participatory_design_kit.phases = { unexpected: true };
    await page.locator("#json-import").fill(JSON.stringify(invalid));
    await page.locator("#import-json").click();
    await assertVisibleNotice(page, "#import-note", /remains available|working state retained/i);
    assert.equal((await textJson(page, "#json-export")).participatory_design_kit.example_fragments.find(candidate => candidate.id === fragmentId).then, sentinel);

    const collision = withActiveViewArtifactCollision(await textJson(page, "#json-export"));
    await clearNotice(page, "#import-note");
    await page.locator("#json-import").fill(JSON.stringify(collision));
    await page.locator("#import-json").click();
    await assertVisibleNotice(page, "#import-note", /unique semantic namespace/i);
    assert.equal((await textJson(page, "#json-export")).participatory_design_kit.example_fragments.find(candidate => candidate.id === fragmentId).then, sentinel);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }

  const stateBoundaryContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const stateBoundaryPage = await stateBoundaryContext.newPage();
    await stateBoundaryPage.goto(`${origin}/${route}`, { waitUntil: "domcontentloaded" });
    const baseline = await stateBoundaryPage.evaluate(() => ({
      state: window.participatoryDesignKit.getState(),
      fingerprint: window.participatoryDesignKit.promptCapsuleFingerprint(),
      markdown: window.participatoryDesignKit.promptCapsule(),
    }));
    const privateOnly = structuredClone(baseline.state);
    privateOnly.private_annotation = "local participatory note";
    privateOnly.participatory_design_kit.private_annotation = "local kit note";
    await stateBoundaryPage.locator("#json-import").fill(JSON.stringify(privateOnly));
    await stateBoundaryPage.locator("#import-json").click();
    await assertVisibleNotice(stateBoundaryPage, "#import-note", /updated|imported/i);
    const privateReceipt = await stateBoundaryPage.evaluate(() => ({
      state: window.participatoryDesignKit.getState(),
      fingerprint: window.participatoryDesignKit.promptCapsuleFingerprint(),
      markdown: window.participatoryDesignKit.promptCapsule(),
    }));
    assert.equal(privateReceipt.state.private_annotation, "local participatory note");
    assert.equal(privateReceipt.state.participatory_design_kit.private_annotation, "local kit note");
    assert.equal(privateReceipt.fingerprint, baseline.fingerprint);
    assert.equal(privateReceipt.markdown, baseline.markdown);

    const semanticChange = structuredClone(privateReceipt.state);
    semanticChange.participatory_design_kit.example_fragments[0].then = "A revised receiving route becomes visible.";
    await stateBoundaryPage.locator("#json-import").fill(JSON.stringify(semanticChange));
    await stateBoundaryPage.locator("#import-json").click();
    await assertVisibleNotice(stateBoundaryPage, "#import-note", /updated|imported/i);
    const semanticReceipt = await stateBoundaryPage.evaluate(() => ({
      fingerprint: window.participatoryDesignKit.promptCapsuleFingerprint(),
      markdown: window.participatoryDesignKit.promptCapsule(),
    }));
    assert.notEqual(semanticReceipt.fingerprint, baseline.fingerprint);
    assert.notEqual(semanticReceipt.markdown, baseline.markdown);
    assert.match(semanticReceipt.markdown, /A revised receiving route becomes visible\./u);
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
    assert.equal(await noScriptPage.locator("#ai-prompt").textContent(), initialPlain);
    assert.equal(await noScriptPage.locator("#ai-prompt").isVisible(), true);
    assert.equal(await noScriptPage.locator("[data-prompt-view-control]").isVisible(), false);
    assert.equal(await noScriptPage.locator("[data-prompt-actions]").isVisible(), false);
    const details = noScriptPage.locator("[data-prompt-related-loops]");
    assert.equal(await details.isVisible(), true);
    const containment = await noScriptPage.locator("html").evaluate(root => ({
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
    }));
    assert.ok(containment.scrollWidth <= containment.clientWidth + 1, JSON.stringify(containment));
  } finally {
    await noScriptContext.close();
  }
}

async function plusDeltaPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  let initialPrompt;
  try {
    const observationId = "obs-source-provenance-plus";
    const literal = "Source provenance now needs <strong>one clearer recovery route</strong>.";
    initialPrompt = await exercisePromptCapsule(page, {
      apiName: "plusDelta",
      copySelector: "#copyPromptBtn",
      downloadSelector: "#downloadPromptBtn",
      filename: "plus-delta.prompt-capsule.r0.1.5.skill-assisted.md",
      loopIds: ["repository-reentry", "skill-from-receiving-use"],
      promptSelector: "#aiPrompt",
      stateContract: "plus-delta-state.v0.1",
      title: "Plus / Delta",
      version: "0.1.5",
    });
    assert.equal(initialPrompt.projection.observations.length, 5);
    assert.ok(initialPrompt.projection.observations.every(observation => [
      "type", "goal", "actor", "evidence", "status", "route",
      "routeReason", "instruction", "reviewTrigger",
    ].every(field => Object.hasOwn(observation, field))));

    const fieldAssociations = await page.locator("#observationsEditor [data-field]").evaluateAll(controls => controls.map(control => ({
      id: control.id,
      labelCount: control.labels?.length || 0,
      labelTargetsControl: control.labels?.[0]?.control === control,
    })));
    assert.ok(fieldAssociations.length > 0);
    assert.equal(new Set(fieldAssociations.map(({ id }) => id)).size, fieldAssociations.length);
    assert.ok(fieldAssociations.every(({ id, labelCount, labelTargetsControl }) => id && labelCount === 1 && labelTargetsControl));
    await page.locator(`select[data-field="route"][data-id="${observationId}"]`).selectOption("__custom__");
    const customRouteControlId = `observation-${encodeURIComponent(observationId)}-custom-route`;
    await page.waitForFunction(controlId => document.activeElement?.id === controlId, customRouteControlId);
    const customRouteAssociation = await page.locator(`input[data-field="custom-route"][data-id="${observationId}"]`).evaluate(control => ({
      id: control.id,
      labelCount: control.labels?.length || 0,
      labelTargetsControl: control.labels?.[0]?.control === control,
      receivesFocus: document.activeElement === control,
    }));
    assert.deepEqual(customRouteAssociation, {
      id: customRouteControlId,
      labelCount: 1,
      labelTargetsControl: true,
      receivesFocus: true,
    });
    await page.locator(`select[data-field="route"][data-id="${observationId}"]`).selectOption("HEART Chart");
    assert.equal(await page.locator(`select[data-field="route"][data-id="${observationId}"]`).inputValue(), "HEART Chart");
    assert.equal(await page.locator(`input[data-field="custom-route"][data-id="${observationId}"]`).count(), 0);

    await page.locator(`button[data-action="select"][data-id="${observationId}"]`).first().click();
    const selectedOnly = await page.evaluate(() => ({
      fingerprint: window.plusDelta.promptCapsuleFingerprint(),
      markdown: window.plusDelta.promptCapsule(),
    }));
    assert.equal(selectedOnly.fingerprint, initialPrompt.fingerprint);
    assert.equal(selectedOnly.markdown, initialPrompt.plain);

    await page.locator(`select[data-field="type"][data-id="${observationId}"]`).selectOption("delta");
    await page.locator(`textarea[data-field="observation"][data-id="${observationId}"]`).fill(literal);

    let exported = await copiedJson(page, "#copyJsonBtn");
    let observation = exported.observations.find(item => item.id === observationId);
    assert.equal(observation.type, "delta");
    assert.equal(observation.observation, literal);
    assert.match(await page.locator(`#textTable tr[data-id="${observationId}"]`).textContent(), /needs to change/i);
    assert.match(await page.locator(`#diagramWrap .svg-cell[data-id="${observationId}"] title`).textContent(), /Source provenance now needs <strong>one clearer recovery route/);
    const changedPrompt = await page.evaluate(() => ({
      fingerprint: window.plusDelta.promptCapsuleFingerprint(),
      markdown: window.plusDelta.promptCapsule(),
    }));
    assert.notEqual(changedPrompt.fingerprint, initialPrompt.fingerprint);
    assert.notEqual(changedPrompt.markdown, initialPrompt.plain);
    assert.match(changedPrompt.markdown, /Source provenance now needs &lt;strong&gt;one clearer recovery route&lt;\/strong&gt;\./u);

    await page.locator(`button[data-action="hide"][data-id="${observationId}"]`).click();
    exported = await copiedJson(page, "#copyJsonBtn");
    observation = exported.observations.find(item => item.id === observationId);
    assert.ok(activeView(exported).hidden_observation_ids.includes(observationId));
    assert.equal(observation.visible_in_active_view, false);
    assert.equal(observation.type, "delta");
    await page.locator(`#hiddenList button[data-action="show"][data-id="${observationId}"]`).click();

    const compatible = await copiedJson(page, "#copyJsonBtn");
    const importedObservation = "Imported Delta observation";
    const importedViewId = "view-imported";
    compatible.observations.find(item => item.id === observationId).observation = importedObservation;
    const importedView = activeView(compatible);
    importedView.id = importedViewId;
    importedView.name = "Imported focus view";
    importedView.selected_observation_id = observationId;
    compatible.view_state.active_view_id = importedViewId;
    await page.locator("#importArea").fill(JSON.stringify(compatible));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const imported = await copiedJson(page, "#copyJsonBtn");
    assert.equal(imported.observations.find(item => item.id === observationId).observation, importedObservation);
    assert.equal(activeView(imported).id, importedViewId);
    assert.match(await page.locator("#inspector").textContent(), /Imported Delta observation/);
    const importedJsonLd = JSON.parse(await page.locator("#embedded-jsonld").textContent());
    const artifactNode = importedJsonLd["@graph"].find(node => Array.isArray(node.type) && node.type.includes("ca:PlusDelta"));
    const viewNode = importedJsonLd["@graph"].find(node => node.id === `#${importedViewId}`);
    assert.equal(artifactNode.activeView, `#${importedViewId}`);
    assert.equal(viewNode.name, "Imported focus view");

    const privateBaseline = await page.evaluate(() => ({
      fingerprint: window.plusDelta.promptCapsuleFingerprint(),
      markdown: window.plusDelta.promptCapsule(),
      state: window.plusDelta.getState(),
    }));
    const privateOnly = structuredClone(privateBaseline.state);
    privateOnly.private_annotation = "local reflection note";
    privateOnly.artifact_identity.private_annotation = "local identity note";
    privateOnly.observations[0].private_annotation = "local observation note";
    privateOnly.view_state.private_annotation = "local view-state note";
    activeView(privateOnly).private_annotation = "local focus-view note";
    await page.locator("#importArea").fill(JSON.stringify(privateOnly));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const privateReceipt = await page.evaluate(() => ({
      fingerprint: window.plusDelta.promptCapsuleFingerprint(),
      markdown: window.plusDelta.promptCapsule(),
      state: window.plusDelta.getState(),
    }));
    assert.equal(privateReceipt.state.private_annotation, "local reflection note");
    assert.equal(privateReceipt.state.artifact_identity.private_annotation, "local identity note");
    assert.equal(privateReceipt.state.observations[0].private_annotation, "local observation note");
    assert.equal(privateReceipt.state.view_state.private_annotation, "local view-state note");
    assert.equal(activeView(privateReceipt.state).private_annotation, "local focus-view note");
    assert.equal(privateReceipt.fingerprint, privateBaseline.fingerprint);
    assert.equal(privateReceipt.markdown, privateBaseline.markdown);

    const sentinel = "Plus Delta recovery sentinel";
    await page.locator(`textarea[data-field="observation"][data-id="${observationId}"]`).fill(sentinel);
    const invalid = structuredClone(await copiedJson(page, "#copyJsonBtn"));
    invalid.observations = [null];
    await page.locator("#importArea").fill(JSON.stringify(invalid));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /remains available|working state retained/i);
    assert.equal((await copiedJson(page, "#copyJsonBtn")).observations.find(item => item.id === observationId).observation, sentinel);

    const collision = withActiveViewArtifactCollision(await copiedJson(page, "#copyJsonBtn"));
    await clearNotice(page, "#importNotice");
    await page.locator("#importArea").fill(JSON.stringify(collision));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /unique semantic namespace/i);
    assert.equal((await copiedJson(page, "#copyJsonBtn")).observations.find(item => item.id === observationId).observation, sentinel);

    const multiView = structuredClone(await copiedJson(page, "#copyJsonBtn"));
    const secondaryView = structuredClone(activeView(multiView));
    secondaryView.id = `obs-new-observation-${multiView.observations.length + 1}`;
    secondaryView.name = "Secondary membership view";
    secondaryView.selected_observation_id = "";
    secondaryView.private_annotation = "secondary view extension";
    multiView.view_state.views.push(secondaryView);
    await page.locator("#importArea").fill(JSON.stringify(multiView));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const beforeAddIds = new Set(multiView.observations.map(({ id }) => id));
    await page.locator("#addObservationBtn").click();
    const afterAdd = await page.evaluate(() => ({
      state: window.plusDelta.getState(),
      fingerprint: window.plusDelta.promptCapsuleFingerprint(),
      markdown: window.plusDelta.promptCapsule(),
    }));
    const addedObservation = afterAdd.state.observations.find(({ id }) => !beforeAddIds.has(id));
    assert.ok(addedObservation);
    assert.notEqual(addedObservation.id, secondaryView.id);
    assert.ok(afterAdd.state.view_state.views.every(view => view.observation_order.includes(addedObservation.id)));
    await page.locator("#importArea").fill(JSON.stringify(afterAdd.state));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const addRoundTrip = await page.evaluate(() => ({
      state: window.plusDelta.getState(),
      fingerprint: window.plusDelta.promptCapsuleFingerprint(),
      markdown: window.plusDelta.promptCapsule(),
    }));
    assert.deepEqual(addRoundTrip, afterAdd);

    await page.locator(`button[data-action="request-remove"][data-id="${addedObservation.id}"]`).click();
    await page.locator(`button[data-action="confirm-remove"][data-id="${addedObservation.id}"]`).click();
    const afterRemove = await page.evaluate(() => ({
      state: window.plusDelta.getState(),
      fingerprint: window.plusDelta.promptCapsuleFingerprint(),
      markdown: window.plusDelta.promptCapsule(),
    }));
    assert.equal(afterRemove.state.observations.some(({ id }) => id === addedObservation.id), false);
    assert.ok(afterRemove.state.view_state.views.every(view => (
      !view.observation_order.includes(addedObservation.id)
      && !view.hidden_observation_ids.includes(addedObservation.id)
      && view.selected_observation_id !== addedObservation.id
    )));
    assert.equal(afterRemove.state.view_state.views.find(({ id }) => id === secondaryView.id).private_annotation, "secondary view extension");
    await page.locator("#importArea").fill(JSON.stringify(afterRemove.state));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const removeRoundTrip = await page.evaluate(() => ({
      state: window.plusDelta.getState(),
      fingerprint: window.plusDelta.promptCapsuleFingerprint(),
      markdown: window.plusDelta.promptCapsule(),
    }));
    assert.deepEqual(removeRoundTrip, afterRemove);

    const singleObservation = structuredClone(await copiedJson(page, "#copyJsonBtn"));
    singleObservation.observations = [singleObservation.observations.find(item => item.id === observationId)];
    for (const view of singleObservation.view_state.views) {
      view.observation_order = [observationId];
      view.hidden_observation_ids = [];
      view.selected_observation_id = observationId;
    }
    await page.locator("#importArea").fill(JSON.stringify(singleObservation));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const finalRemove = page.locator(`button[data-action="request-remove"][data-id="${observationId}"]`);
    assert.equal(await finalRemove.isDisabled(), true);
    const minimumBaseline = await page.evaluate(() => ({
      state: window.plusDelta.getState(),
      fingerprint: window.plusDelta.promptCapsuleFingerprint(),
      markdown: window.plusDelta.promptCapsule(),
    }));
    await finalRemove.evaluate(button => {
      button.disabled = false;
      button.dataset.action = "confirm-remove";
      button.click();
    });
    const guardedMinimum = await page.evaluate(() => ({
      state: window.plusDelta.getState(),
      fingerprint: window.plusDelta.promptCapsuleFingerprint(),
      markdown: window.plusDelta.promptCapsule(),
    }));
    assert.equal(guardedMinimum.state.observations.length, 1);
    assert.equal(guardedMinimum.fingerprint, minimumBaseline.fingerprint);
    assert.equal(guardedMinimum.markdown, minimumBaseline.markdown);
    assert.match(await page.locator("#interactionNotice").textContent(), /at least one observation remains available/i);
    await page.locator("#importArea").fill(JSON.stringify(guardedMinimum.state));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    assert.equal((await copiedJson(page, "#copyJsonBtn")).observations.length, 1);
    assert.equal(await page.evaluate(() => window.plusDelta.promptCapsuleFingerprint()), minimumBaseline.fingerprint);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
  await assertNoScriptPromptCapsule(browser, origin, route, "#aiPrompt", initialPrompt.plain);
}

async function upstreamPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  let initialPlain = "";
  try {
    const revisionId = "revision-ai-summary-review-route";
    const observation = "Human review evidence now identifies a visible source-boundary transition.";
    const revisedRead = "The prior artifact can expose source support and confirmation as separate review states.";
    const initial = await page.evaluate(() => {
      const api = window.upstreamRevisionLoop;
      return {
        frozen: Object.isFrozen(api),
        version: api.version,
        contract: api.contract,
        stateContract: api.stateContract,
        view: api.getPromptCapsuleView(),
        state: api.getState(),
        stateProjection: api.promptCapsuleStateProjection(),
        fingerprint: api.promptCapsuleFingerprint(),
        plain: api.promptCapsule(),
        explicitPlain: api.promptCapsuleMarkdown("plain"),
        visible: document.querySelector("#aiPromptOut").textContent,
      };
    });
    initialPlain = initial.plain;
    assert.equal(initial.frozen, true);
    assert.deepEqual(
      [initial.version, initial.contract, initial.stateContract, initial.view],
      ["0.1.5", "prompt-capsule/0.1.0", "upstream-revision-loop-state.v0.1", "plain"],
    );
    assert.equal(initial.plain, initial.explicitPlain);
    assert.equal(initial.visible, initial.plain);
    assert.equal(initial.stateProjection.revisions.length, initial.state.revisions.length);
    assert.ok(initial.plain.includes(`- Fingerprint: \`${initial.fingerprint}\``));
    assert.match(initial.plain, /^# Prompt Capsule: Upstream Revision Loop\n/u);
    assert.match(initial.plain, /## Related loops/u);
    assert.doesNotMatch(initial.plain, /## Skill assistance/u);

    await page.locator('[data-action="select"][data-id="revision-summary-feature-service-layers"]').first().click();
    const selectedOnly = await page.evaluate(() => ({
      selectedRevisionId: window.upstreamRevisionLoop.getState().view_state.views[0].selected_revision_id,
      fingerprint: window.upstreamRevisionLoop.promptCapsuleFingerprint(),
      markdown: window.upstreamRevisionLoop.promptCapsule(),
    }));
    assert.equal(selectedOnly.selectedRevisionId, "revision-summary-feature-service-layers");
    assert.equal(selectedOnly.fingerprint, initial.fingerprint);
    assert.equal(selectedOnly.markdown, initial.plain);

    const loopReceipt = await page.locator("[data-prompt-related-loops]").evaluate((details) => ({
      tag: details.tagName,
      open: details.open,
      summary: details.querySelector("summary")?.textContent.trim(),
      loops: [...details.querySelectorAll("[data-related-loop-id]")].map((item) => ({
        id: item.dataset.relatedLoopId,
        href: item.querySelector("a")?.href,
      })),
    }));
    assert.deepEqual(loopReceipt, {
      tag: "DETAILS",
      open: false,
      summary: "Related loops",
      loops: [
        { id: "repository-reentry", href: "https://schemas.radiantnull.com/collaboration/#repository-reentry" },
        { id: "public-release", href: "https://schemas.radiantnull.com/collaboration/#public-release" },
      ],
    });
    const relatedSummary = page.locator("[data-prompt-related-loops] summary");
    await relatedSummary.focus();
    const summaryBox = await relatedSummary.boundingBox();
    assert.ok(summaryBox && summaryBox.height >= 44 && summaryBox.width >= 44);
    await relatedSummary.press("Enter");
    assert.equal(await page.locator("[data-prompt-related-loops]").evaluate(element => element.open), true);
    const firstLoopBox = await page.locator("[data-related-loop-id] a").first().boundingBox();
    assert.ok(firstLoopBox && firstLoopBox.height >= 44 && firstLoopBox.width >= 44);

    const assistedControl = page.locator('[data-prompt-view][value="skill-assisted"]');
    await assistedControl.check();
    const assisted = await page.evaluate(() => ({
      view: window.upstreamRevisionLoop.getPromptCapsuleView(),
      stateProjection: window.upstreamRevisionLoop.promptCapsuleStateProjection(),
      fingerprint: window.upstreamRevisionLoop.promptCapsuleFingerprint(),
      markdown: window.upstreamRevisionLoop.promptCapsuleMarkdown(),
      visible: document.querySelector("#aiPromptOut").textContent,
    }));
    assert.equal(assisted.view, "skill-assisted");
    assert.equal(assisted.markdown, assisted.visible);
    assert.equal(assisted.fingerprint, initial.fingerprint);
    assert.deepEqual(assisted.stateProjection, initial.stateProjection);
    assert.match(assisted.markdown, /## Skill assistance/u);
    assert.match(assisted.markdown, /\.agents\/skills\/source-authority-mapping\/SKILL\.md/u);

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
    assert.equal(download.suggestedFilename(), "upstream-revision-loop.prompt-capsule.r0.1.5.skill-assisted.md");
    assert.equal(await page.evaluate(() => globalThis.__promptDownloadType), "text/markdown;charset=utf-8");
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString("utf8"), assisted.markdown);

    await page.locator('[data-prompt-view][value="plain"]').check();
    assert.equal(await page.locator("#aiPromptOut").textContent(), initial.plain);
    await page.locator(`[data-action="select"][data-id="${revisionId}"]`).first().click();
    const evidenceField = page.locator(`textarea[data-field="evidence_observation"][data-id="${revisionId}"]`);
    await evidenceField.fill(observation);
    await evidenceField.press("Tab");
    const revisedField = page.locator(`textarea[data-field="revised_read"][data-id="${revisionId}"]`);
    await revisedField.fill(revisedRead);
    await revisedField.press("Tab");

    let exported = await textJson(page, "#jsonOut");
    let revision = exported.revisions.find(item => item.id === revisionId);
    assert.equal(revision.evidence_observation, observation);
    assert.equal(revision.revised_read, revisedRead);
    assert.match(await page.locator("#svgWrap").textContent(), /Human review evidence now identifies/);
    assert.match(await page.locator("#tableWrap").textContent(), /The prior artifact can expose source support/);
    assert.match(await page.locator("#inspector").textContent(), /Human review evidence now identifies/);
    assert.ok((await textJson(page, "#jsonLdOut"))["@graph"].some(node => node.id.endsWith(revisionId) && node["ca:revisedRead"] === revisedRead));
    const changedCapsule = await page.evaluate(() => ({
      fingerprint: window.upstreamRevisionLoop.promptCapsuleFingerprint(),
      markdown: window.upstreamRevisionLoop.promptCapsule(),
    }));
    assert.notEqual(changedCapsule.fingerprint, initial.fingerprint);
    assert.notEqual(changedCapsule.markdown, initial.plain);
    assert.match(changedCapsule.markdown, /Human review evidence now identifies a visible source-boundary transition\./u);

    const beforeOrder = [...activeView(exported).revision_order];
    const beforeIndex = beforeOrder.indexOf(revisionId);
    await page.locator(`button[data-action="move-down"][data-id="${revisionId}"]`).click();
    exported = await textJson(page, "#jsonOut");
    const movedIndex = beforeIndex + 1;
    assert.equal(activeView(exported).revision_order.indexOf(revisionId), movedIndex);
    assert.equal(exported.revisions.find(item => item.id === revisionId).canonical_order, revision.canonical_order);
    assert.match(await page.locator("#tableWrap tbody tr").nth(movedIndex).textContent(), new RegExp(revisionId));
    assert.equal(Number(await page.locator(`#svgWrap [data-svg-revision="${revisionId}"]`).first().getAttribute("y")), 70 + movedIndex * 112);

    await page.locator(`button[data-action="hide"][data-id="${revisionId}"]`).click();
    exported = await textJson(page, "#jsonOut");
    revision = exported.revisions.find(item => item.id === revisionId);
    assert.ok(activeView(exported).hidden_revision_ids.includes(revisionId));
    assert.equal(revision.visible_in_active_view, false);
    assert.equal(revision.revised_read, revisedRead);
    const showRevision = page.locator(`button[data-action="show"][data-id="${revisionId}"]`);
    await showRevision.focus();
    assert.equal(await showRevision.evaluate(element => document.activeElement === element), true);
    await showRevision.press("Enter");

    const compatible = await textJson(page, "#jsonOut");
    const importedRevision = "Imported upstream revision read";
    compatible.revisions.find(item => item.id === revisionId).revised_read = importedRevision;
    activeView(compatible).selected_revision_id = revisionId;
    await page.locator("#importArea").fill(JSON.stringify(compatible));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const imported = await textJson(page, "#jsonOut");
    assert.equal(imported.revisions.find(item => item.id === revisionId).revised_read, importedRevision);
    assert.equal(activeView(imported).selected_revision_id, revisionId);
    assert.match(await page.locator("#inspector").textContent(), /Imported upstream revision read/);

    const sentinel = "Upstream recovery sentinel";
    const sentinelField = page.locator(`textarea[data-field="evidence_observation"][data-id="${revisionId}"]`);
    await sentinelField.fill(sentinel);
    await sentinelField.press("Tab");
    const invalid = structuredClone(await textJson(page, "#jsonOut"));
    invalid.view_state.views = [];
    const retainedCapsule = await page.evaluate(() => ({
      fingerprint: window.upstreamRevisionLoop.promptCapsuleFingerprint(),
      markdown: window.upstreamRevisionLoop.promptCapsule(),
    }));
    await page.locator("#importArea").fill(JSON.stringify(invalid));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /remains available|working state retained/i);
    assert.equal((await textJson(page, "#jsonOut")).revisions.find(item => item.id === revisionId).evidence_observation, sentinel);
    assert.deepEqual(await page.evaluate(() => ({
      fingerprint: window.upstreamRevisionLoop.promptCapsuleFingerprint(),
      markdown: window.upstreamRevisionLoop.promptCapsule(),
    })), retainedCapsule);

    const collision = withActiveViewArtifactCollision(await textJson(page, "#jsonOut"));
    await clearNotice(page, "#importNotice");
    await page.locator("#importArea").fill(JSON.stringify(collision));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /unique semantic namespace/i);
    assert.equal((await textJson(page, "#jsonOut")).revisions.find(item => item.id === revisionId).evidence_observation, sentinel);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }

  const stateBoundaryContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const stateBoundaryPage = await stateBoundaryContext.newPage();
    await stateBoundaryPage.goto(`${origin}/${route}`, { waitUntil: "domcontentloaded" });
    const baseline = await stateBoundaryPage.evaluate(() => ({
      state: window.upstreamRevisionLoop.getState(),
      fingerprint: window.upstreamRevisionLoop.promptCapsuleFingerprint(),
      markdown: window.upstreamRevisionLoop.promptCapsule(),
    }));
    const privateOnly = structuredClone(baseline.state);
    privateOnly.artifact_identity.private_annotation = "local review note";
    privateOnly.revisions[0].private_annotation = "local revision note";
    await stateBoundaryPage.locator("#importArea").fill(JSON.stringify(privateOnly));
    await stateBoundaryPage.locator("#importBtn").click();
    await assertVisibleNotice(stateBoundaryPage, "#importNotice", /updated|imported/i);
    const privateOnlyReceipt = await stateBoundaryPage.evaluate(() => ({
      state: window.upstreamRevisionLoop.getState(),
      fingerprint: window.upstreamRevisionLoop.promptCapsuleFingerprint(),
      markdown: window.upstreamRevisionLoop.promptCapsule(),
    }));
    assert.equal(privateOnlyReceipt.state.artifact_identity.private_annotation, "local review note");
    assert.equal(privateOnlyReceipt.state.revisions[0].private_annotation, "local revision note");
    assert.equal(privateOnlyReceipt.fingerprint, baseline.fingerprint);
    assert.equal(privateOnlyReceipt.markdown, baseline.markdown);

    const semanticChange = structuredClone(privateOnlyReceipt.state);
    semanticChange.semantic_locality.preferred_phrasing[0] = "Which accepted evidence improves this prior artifact?";
    await stateBoundaryPage.locator("#importArea").fill(JSON.stringify(semanticChange));
    await stateBoundaryPage.locator("#importBtn").click();
    await assertVisibleNotice(stateBoundaryPage, "#importNotice", /updated|imported/i);
    const semanticReceipt = await stateBoundaryPage.evaluate(() => ({
      fingerprint: window.upstreamRevisionLoop.promptCapsuleFingerprint(),
      markdown: window.upstreamRevisionLoop.promptCapsule(),
    }));
    assert.notEqual(semanticReceipt.fingerprint, baseline.fingerprint);
    assert.notEqual(semanticReceipt.markdown, baseline.markdown);
    assert.match(semanticReceipt.markdown, /Which accepted evidence improves this prior artifact\?/u);
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
    assert.equal(await noScriptPage.locator("#aiPromptOut").textContent(), initialPlain);
    assert.equal(await noScriptPage.locator("#aiPromptOut").isVisible(), true);
    assert.equal(await noScriptPage.locator("[data-prompt-view-control]").isVisible(), false);
    assert.equal(await noScriptPage.locator("[data-prompt-actions]").isVisible(), false);
    const details = noScriptPage.locator("[data-prompt-related-loops]");
    assert.equal(await details.isVisible(), true);
    await details.locator("summary").click();
    assert.equal(await details.evaluate(element => element.open), true);
    const containment = await noScriptPage.locator("html").evaluate(root => ({
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
    }));
    assert.ok(containment.scrollWidth <= containment.clientWidth + 1, JSON.stringify(containment));
  } finally {
    await noScriptContext.close();
  }
}

const paths = [
  ["PODA relationships, focus, exchange, and recovery", "poda", podaPath],
  ["Alignment premise order, inverse state, focus, exchange, and recovery", "alignment", alignmentPath],
  ["First Responsible Version placement, focus, exchange, and recovery", "frv", frvPath],
  ["Shared Surface intensity, asset links, focus, exchange, and recovery", "sharedSurface", sharedSurfacePath],
  ["AI Systems topology, veracity, focus, exchange, and recovery", "aiSystems", aiSystemsPath],
  ["Software Views attachments, focus, exchange, and recovery", "softwareViews", softwareViewsPath],
  ["Participatory timeline, scenario, focus, exchange, and recovery", "participatory", participatoryPath],
  ["Plus Delta type, focus, exchange, and recovery", "plusDelta", plusDeltaPath],
  ["Upstream revision order, focus, exchange, and recovery", "upstream", upstreamPath]
];

const expectedArtifactKeys = Object.keys(artifactNames).sort();
const pathKeys = paths.map(([, artifactKey]) => artifactKey);
assert.equal(projections.length, 2, "The planning-instrument contract should exercise both maintained projections.");
assert.equal(paths.length, 9, "The planning-instrument contract should exercise all nine planning instruments.");
assert.deepEqual([...pathKeys].sort(), expectedArtifactKeys, "Planning-instrument paths should match the maintained artifact inventory.");
assert.equal(new Set(pathKeys).size, paths.length, "Each planning instrument should have one browser path.");
const expectedCheckCount = projections.length * paths.length;

const staticServer = await startStaticServer();
const browser = await chromium.launch({ headless: true });
try {
  for (const projection of projections) {
    for (const [label, artifactKey, path] of paths) {
      const route = `${projection.root}/${artifactNames[artifactKey]}`;
      await verify(`${projection.label} · ${label}`, () => path(browser, staticServer.origin, route));
    }
  }
} finally {
  await browser.close();
  await staticServer.close();
}

assert.equal(checks.length, expectedCheckCount, `The planning-instrument contract should complete ${expectedCheckCount} projection checks.`);

for (const check of checks) {
  console.log(`${check.status === "passed" ? "PASS" : "FAIL"} ${check.label}`);
  if (check.message) console.log(check.message);
}

if (failures.length) {
  console.error(`Core planning-instrument browser contract: ${checks.length - failures.length}/${checks.length} passed.`);
  process.exitCode = 1;
} else {
  console.log(`Core planning-instrument browser contract: ${checks.length}/${checks.length} passed.`);
}

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
  contextTree: "context-tree-chimeric-prototype-v0.1.6.html",
  treemap: "jobs-to-be-done-treemap-chimeric-prototype-v0.1.4.html",
  probes: "practitioner-judgment-probes-chimeric-prototype-v0.1.3.html",
  matrix: "pattern-problem-surface-matrix-chimeric-prototype-v0.1.4.html",
  unitTestFirst: "unit-test-first-design-chimeric-prototype-v0.1.4.html",
  recoveryAtlas: "recovery-routing-atlas-chimeric-prototype-v0.1.4.html",
  familyIndex: "core-architecture-family-index-chimeric-prototype-v0.1.4.html"
};

const packIndexName = "core-architectures-chimeric-prototype-pack-index-v0.1.3.html";
const manifestName = "core-architectures-chimeric-prototype-manifest-v0.1.json";
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

function activeView(exported) {
  return exported.view_state.views.find(view => view.id === exported.view_state.active_view_id);
}

function relativeLuminance(cssColor) {
  const channels = cssColor.match(/[\d.]+/gu)?.slice(0, 3).map(Number);
  assert.equal(channels?.length, 3, `Expected an RGB color, received ${cssColor}`);
  const linear = channels.map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrastRatio(foreground, background) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

function withActiveViewArtifactCollision(exported) {
  const candidate = structuredClone(exported);
  const artifactId = candidate.artifact_identity.id;
  const view = activeView(candidate);
  view.id = artifactId;
  candidate.view_state.active_view_id = artifactId;
  return candidate;
}

async function clearNotice(page, selector) {
  await page.locator(selector).evaluate(element => {
    element.textContent = "";
    element.hidden = false;
    element.style.display = "block";
  });
}

async function assertVisibleNotice(page, selector, pattern) {
  const notice = page.locator(selector);
  assert.equal(await notice.isVisible(), true, `${selector} should remain visible`);
  assert.match(await notice.textContent(), pattern);
}

async function revealControl(page, selector) {
  await page.locator(selector).evaluate(element => {
    let ancestor = element.parentElement;
    while (ancestor) {
      if (ancestor.tagName === "DETAILS") ancestor.open = true;
      ancestor = ancestor.parentElement;
    }
  });
}

async function exercisePromptCapsule(page, {
  apiName,
  copySelector,
  downloadSelector,
  filename,
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

  const loopReceipt = await page.locator("[data-prompt-related-loops]").evaluate(details => ({
    open: details.open,
    tag: details.tagName,
    loops: [...details.querySelectorAll("[data-related-loop-id]")].map(item => item.dataset.relatedLoopId),
  }));
  assert.deepEqual(loopReceipt, {
    open: false,
    tag: "DETAILS",
    loops: ["repository-reentry", "skill-from-receiving-use"],
  });
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
    const loops = page.locator("[data-prompt-related-loops]");
    assert.equal(await loops.isVisible(), true);
    await loops.locator("summary").click();
    assert.equal(await loops.evaluate(element => element.open), true);
    const containment = await page.locator("html").evaluate(root => ({
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
    }));
    assert.ok(containment.scrollWidth <= containment.clientWidth + 1, JSON.stringify(containment));
  } finally {
    await context.close();
  }
}

async function contextTreePath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route);
  try {
    const rowId = "row-context-to-surface";
    const groupId = "group-molecular-pathologist";
    const cellId = "cell-context-to-surface-molecular-pathologist";
    const hiddenGroupId = "group-ai-assistance-surface";
    const hiddenCellId = "cell-context-to-surface-ai-assistance-surface";
    const literal = "Context stays visible as <strong>collaborator text</strong>.";
    const cellText = page.locator(`#cell-text-${cellId}`);

    await cellText.fill(literal);
    await cellText.press("Tab");
    await page.locator(`#cell-status-${cellId}`).selectOption("ready_to_route");
    await page.locator(`#cell-route-${cellId}`).selectOption("__custom__");
    const customRoute = page.locator(`#cell-custom-route-${cellId}`);
    assert.equal(await customRoute.isVisible(), true);
    await customRoute.fill("Imported Context Route");
    await customRoute.press("Tab");
    await page.locator(`#contextTable tr[data-cell-id="${cellId}"]`).click();

    let exported = await textJson(page, "#jsonOut");
    let cell = exported.context_tree.cells.find(item => item.id === cellId);
    assert.equal(cell.text, literal);
    assert.equal(cell.status, "ready_to_route");
    assert.equal(cell.handoff, "Imported Context Route");
    assert.equal(activeView(exported).selected_cell_id, cellId);
    assert.match(await page.locator(`#contextTable tr[data-cell-id="${cellId}"]`).textContent(), /<strong>collaborator text<\/strong>/);
    assert.match(await page.locator(`#contextSvg g[data-cell-id="${cellId}"] title`).textContent(), /<strong>collaborator text<\/strong>/);
    assert.match(await page.locator("#selectedCellPanel").textContent(), /Imported Context Route/);
    const linkedGraph = await textJson(page, "#jsonLdOut");
    assert.equal(linkedGraph["@graph"].find(node => node.id === `#${cellId}`)["schema:text"], literal);

    const beforeOrder = [...activeView(exported).column_order];
    await page.locator(`#groupsEditor button[data-action="move-left"][data-group-id="${hiddenGroupId}"]`).click();
    exported = await textJson(page, "#jsonOut");
    assert.equal(activeView(exported).column_order.indexOf(hiddenGroupId), beforeOrder.indexOf(hiddenGroupId) - 1);
    const matrixHead = await page.locator("#matrixEditorTable thead").textContent();
    assert.ok(matrixHead.indexOf("AI assistance surface") < matrixHead.indexOf("Data steward"));

    await page.locator(`#groupsEditor button[data-action="hide-group"][data-group-id="${hiddenGroupId}"]`).click();
    exported = await textJson(page, "#jsonOut");
    assert.ok(activeView(exported).hidden_group_ids.includes(hiddenGroupId));
    assert.equal(exported.context_tree.cells.find(item => item.id === hiddenCellId).visible_in_active_view, false);
    assert.equal(await page.locator(`#contextSvg g[data-cell-id="${hiddenCellId}"]`).count(), 0);
    await page.locator(`#hiddenGroupsList button[data-action="show-group"][data-group-id="${hiddenGroupId}"]`).click();
    assert.equal(await page.locator(`#contextSvg g[data-cell-id="${hiddenCellId}"]`).count(), 1);

    const compatible = await textJson(page, "#jsonOut");
    const importedText = "Imported Context Tree relationship";
    compatible.context_tree.cells.find(item => item.id === cellId).text = importedText;
    activeView(compatible).selected_cell_id = cellId;
    await revealControl(page, "#importJsonInput");
    await page.locator("#importJsonInput").fill(JSON.stringify(compatible));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const imported = await textJson(page, "#jsonOut");
    assert.equal(imported.context_tree.cells.find(item => item.id === cellId).text, importedText);
    assert.equal(activeView(imported).selected_cell_id, cellId);
    assert.match(await page.locator("#selectedCellPanel").textContent(), /Imported Context Tree relationship/);

    const sentinel = "Context Tree recovery sentinel";
    await page.locator(`#cell-text-${cellId}`).fill(sentinel);
    await page.locator(`#cell-text-${cellId}`).press("Tab");
    const malformed = structuredClone(await textJson(page, "#jsonOut"));
    malformed.view_state.views = [];
    await clearNotice(page, "#importNotice");
    await page.locator("#importJsonInput").fill(JSON.stringify(malformed));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /working .* retained|remains available/i);
    assert.equal((await textJson(page, "#jsonOut")).context_tree.cells.find(item => item.id === cellId).text, sentinel);
    await page.locator(`#cell-text-${cellId}`).fill(`${sentinel} and remains operable`);
    await page.locator(`#cell-text-${cellId}`).press("Tab");
    assert.match((await textJson(page, "#jsonOut")).context_tree.cells.find(item => item.id === cellId).text, /remains operable/);

    const collision = withActiveViewArtifactCollision(await textJson(page, "#jsonOut"));
    await clearNotice(page, "#importNotice");
    await page.locator("#importJsonInput").fill(JSON.stringify(collision));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /semantic namespace.*unique|unique.*semantic namespace/i);
    assert.match((await textJson(page, "#jsonOut")).context_tree.cells.find(item => item.id === cellId).text, /remains operable/);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}
async function treemapPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  let initialPrompt;
  try {
    const jobId = "job-confirm-evidence-provenance";
    const literal = "Provenance remains <strong>literal collaborator text</strong>.";
    initialPrompt = await exercisePromptCapsule(page, {
      apiName: "jobsToBeDoneTreemap",
      copySelector: "#copy-prompt-btn",
      downloadSelector: "#download-prompt-btn",
      filename: "jobs-to-be-done-treemap.prompt-capsule.r0.1.4.skill-assisted.md",
      promptSelector: "#ai-prompt",
      stateContract: "jobs-to-be-done-treemap-state.v0.1",
      title: "Jobs-to-be-Done Treemap",
      version: "0.1.4",
    });
    assert.equal(initialPrompt.projection.jobs.length, 8);
    await page.locator(`#table-equivalent [data-select-job="${jobId}"]`).click();
    const selectedOnly = await page.evaluate(() => ({
      fingerprint: window.jobsToBeDoneTreemap.promptCapsuleFingerprint(),
      markdown: window.jobsToBeDoneTreemap.promptCapsule(),
    }));
    assert.equal(selectedOnly.fingerprint, initialPrompt.fingerprint);
    assert.equal(selectedOnly.markdown, initialPrompt.plain);
    const rect = page.locator(`#treemap-svg-wrap [data-job-id="${jobId}"] rect`);
    const initialArea = Number(await rect.getAttribute("width")) * Number(await rect.getAttribute("height"));
    const jobCard = page.locator(`[data-job-card="${jobId}"]`);

    await jobCard.locator('[data-field="relative_weight"]').fill("5");
    await jobCard.locator('[data-field="relative_weight"]').press("Tab");
    await jobCard.locator('[data-field="note"]').fill(literal);
    await jobCard.locator('[data-field="note"]').press("Tab");
    await page.locator(`[data-route-select="${jobId}"]`).selectOption("Unit-test-first Design");
    await page.locator(`#table-equivalent [data-select-job="${jobId}"]`).click();

    let exported = await textJson(page, "#json-output");
    let job = exported.jobs.find(item => item.id === jobId);
    assert.equal(job.relative_weight, 5);
    assert.equal(job.note, literal);
    assert.equal(job.route, "Unit-test-first Design");
    assert.equal(activeView(exported).selected_job_id, jobId);
    const changedRect = page.locator(`#treemap-svg-wrap [data-job-id="${jobId}"] rect`);
    const changedArea = Number(await changedRect.getAttribute("width")) * Number(await changedRect.getAttribute("height"));
    assert.ok(changedArea < initialArea, `weight-responsive area should shrink: ${changedArea} < ${initialArea}`);
    assert.match(await page.locator(`#treemap-svg-wrap [data-job-id="${jobId}"] title`).textContent(), /<strong>literal collaborator text<\/strong>/);
    assert.match(await page.locator(`#table-equivalent tr[data-row-job="${jobId}"]`).textContent(), /5 \/ 10/);
    assert.match(await page.locator("#selected-job-panel").textContent(), /Unit-test-first Design/);
    const changedPrompt = await page.evaluate(() => ({
      fingerprint: window.jobsToBeDoneTreemap.promptCapsuleFingerprint(),
      markdown: window.jobsToBeDoneTreemap.promptCapsule(),
    }));
    assert.notEqual(changedPrompt.fingerprint, initialPrompt.fingerprint);
    assert.notEqual(changedPrompt.markdown, initialPrompt.plain);
    assert.match(changedPrompt.markdown, /Provenance remains &lt;strong&gt;literal collaborator text&lt;\/strong&gt;\./u);
    const linkedGraph = await textJson(page, "#jsonld-data");
    const jobNode = linkedGraph["@graph"].find(node => node.id === `#${jobId}`);
    assert.equal(jobNode["ca:relativeWeight"], 5);
    assert.deepEqual(linkedGraph["@graph"].find(node => node.type === "ca:ViewConfiguration")["ca:jobOrder"][0], { id: `#${jobId}` });

    const beforeOrder = [...activeView(exported).job_order];
    await page.locator(`[data-move-job="${jobId}"][data-dir="1"]`).click();
    exported = await textJson(page, "#json-output");
    assert.equal(activeView(exported).job_order.indexOf(jobId), beforeOrder.indexOf(jobId) + 1);
    assert.match(await page.locator("#table-equivalent tbody tr").nth(1).textContent(), new RegExp(jobId));

    await page.locator(`[data-hide-job="${jobId}"]`).click();
    exported = await textJson(page, "#json-output");
    assert.ok(activeView(exported).hidden_job_ids.includes(jobId));
    assert.notEqual(activeView(exported).selected_job_id, jobId);
    assert.equal(exported.jobs.find(item => item.id === jobId).visible_in_active_view, false);
    assert.equal(await page.locator(`#treemap-svg-wrap [data-job-id="${jobId}"]`).count(), 0);
    await page.locator(`#hidden-jobs [data-show-job="${jobId}"]`).click();
    assert.equal(await page.locator(`#treemap-svg-wrap [data-job-id="${jobId}"]`).count(), 1);

    const compatible = await textJson(page, "#json-output");
    const importedLabel = "Imported provenance-weighted job";
    compatible.jobs.find(item => item.id === jobId).label = importedLabel;
    compatible.jobs.find(item => item.id === jobId).relative_weight = 7;
    activeView(compatible).selected_job_id = jobId;
    await page.locator("#json-import").fill(JSON.stringify(compatible));
    await page.locator("#import-json-btn").click();
    await assertVisibleNotice(page, "#import-status", /updated|imported/i);
    const imported = await textJson(page, "#json-output");
    assert.equal(imported.jobs.find(item => item.id === jobId).label, importedLabel);
    assert.equal(activeView(imported).selected_job_id, jobId);
    assert.match(await page.locator("#selected-job-panel").textContent(), /Imported provenance-weighted job/);

    const privateBaseline = await page.evaluate(() => ({
      fingerprint: window.jobsToBeDoneTreemap.promptCapsuleFingerprint(),
      markdown: window.jobsToBeDoneTreemap.promptCapsule(),
      state: window.jobsToBeDoneTreemap.getState(),
    }));
    const privateOnly = structuredClone(privateBaseline.state);
    privateOnly.private_annotation = "local job-map note";
    privateOnly.jobs[0].private_annotation = "local job note";
    privateOnly.view_state.private_annotation = "local view-state note";
    activeView(privateOnly).private_annotation = "local view note";
    await page.locator("#json-import").fill(JSON.stringify(privateOnly));
    await page.locator("#import-json-btn").click();
    await assertVisibleNotice(page, "#import-status", /updated|imported/i);
    const privateReceipt = await page.evaluate(() => ({
      fingerprint: window.jobsToBeDoneTreemap.promptCapsuleFingerprint(),
      markdown: window.jobsToBeDoneTreemap.promptCapsule(),
      state: window.jobsToBeDoneTreemap.getState(),
    }));
    assert.equal(privateReceipt.state.private_annotation, "local job-map note");
    assert.equal(privateReceipt.state.jobs[0].private_annotation, "local job note");
    assert.equal(privateReceipt.state.view_state.private_annotation, "local view-state note");
    assert.equal(activeView(privateReceipt.state).private_annotation, "local view note");
    assert.equal(privateReceipt.fingerprint, privateBaseline.fingerprint);
    assert.equal(privateReceipt.markdown, privateBaseline.markdown);

    const sentinel = "Treemap recovery sentinel";
    const importedCard = page.locator(`[data-job-card="${jobId}"]`);
    await importedCard.locator('[data-field="note"]').fill(sentinel);
    await importedCard.locator('[data-field="note"]').press("Tab");
    const malformed = structuredClone(await textJson(page, "#json-output"));
    malformed.artifact_identity.display_name = "Partially committed title";
    malformed.jobs = [null];
    await clearNotice(page, "#import-status");
    await page.locator("#json-import").fill(JSON.stringify(malformed));
    await page.locator("#import-json-btn").click();
    await assertVisibleNotice(page, "#import-status", /working .* retained|remains available/i);
    let recovered = await textJson(page, "#json-output");
    assert.notEqual(recovered.artifact_identity.display_name, "Partially committed title");
    assert.equal(recovered.jobs.find(item => item.id === jobId).note, sentinel);
    await page.locator(`[data-job-card="${jobId}"] [data-field="note"]`).fill(`${sentinel} and remains operable`);
    await page.locator(`[data-job-card="${jobId}"] [data-field="note"]`).press("Tab");

    const collision = withActiveViewArtifactCollision(await textJson(page, "#json-output"));
    await clearNotice(page, "#import-status");
    await page.locator("#json-import").fill(JSON.stringify(collision));
    await page.locator("#import-json-btn").click();
    await assertVisibleNotice(page, "#import-status", /semantic namespace.*unique|unique.*semantic namespace/i);
    recovered = await textJson(page, "#json-output");
    assert.match(recovered.jobs.find(item => item.id === jobId).note, /remains operable/);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
  await assertNoScriptPromptCapsule(browser, origin, route, "#ai-prompt", initialPrompt.plain);
}
async function probesPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route);
  try {
    const probeId = "probe-protect-business-rules";
    const literal = "Could the rule remain visible as <strong>collaborator text</strong>?";
    let card = page.locator(`.probe-card[data-probe-id="${probeId}"]`);
    await card.locator('[data-field="question"]').fill(literal);
    await card.locator('[data-field="question"]').press("Tab");
    card = page.locator(`.probe-card[data-probe-id="${probeId}"]`);
    await card.locator('[data-field="probability_estimate"]').fill("0.73");
    await card.locator('[data-field="probability_estimate"]').press("Tab");
    await page.locator(`button[data-action="select-probe"][data-probe-id="${probeId}"]`).first().click();

    let exported = await textJson(page, "#json-output");
    let probe = exported.probes.find(item => item.id === probeId);
    assert.equal(probe.question, literal);
    assert.equal(probe.probability_estimate, 0.73);
    assert.equal(activeView(exported).selected_probe_id, probeId);
    assert.match(await page.locator(`.probe-card[data-probe-id="${probeId}"] .prob-pill`).textContent(), /73%/);
    assert.match(await page.locator(`#table-equivalent tr[data-probe-id="${probeId}"]`).textContent(), /<strong>collaborator text<\/strong>/);
    assert.equal(await page.locator(`#table-equivalent tr[data-probe-id="${probeId}"] .cell-full strong`).count(), 0);
    assert.match(await page.locator("#selected-probe-inspector").textContent(), /73%/);
    assert.match(await page.locator("#svg-container").textContent(), /73% prior/);
    const linkedGraph = await textJson(page, "#jsonld-output");
    const probeNode = linkedGraph["@graph"].find(node => node["@id"] === `#${probeId}`);
    assert.equal(probeNode["ca:probabilityEstimate"], 0.73);

    const beforeOrder = [...activeView(exported).probe_order];
    await page.locator(`button[data-action="move-probe"][data-direction="1"][data-probe-id="${probeId}"]`).click();
    exported = await textJson(page, "#json-output");
    assert.equal(activeView(exported).probe_order.indexOf(probeId), beforeOrder.indexOf(probeId) + 1);
    assert.match(await page.locator("#table-equivalent tbody tr").nth(1).textContent(), /<strong>collaborator text<\/strong>/);

    await page.locator(`button[data-action="hide-probe"][data-probe-id="${probeId}"]`).click();
    exported = await textJson(page, "#json-output");
    probe = exported.probes.find(item => item.id === probeId);
    assert.ok(activeView(exported).hidden_probe_ids.includes(probeId));
    assert.notEqual(activeView(exported).selected_probe_id, probeId);
    assert.equal(probe.visible_in_active_view, false);
    assert.equal(await page.locator(`#table-equivalent tr[data-probe-id="${probeId}"]`).count(), 0);
    await page.locator(`#hidden-probes button[data-action="show-probe"][data-probe-id="${probeId}"]`).click();
    assert.equal(await page.locator(`#table-equivalent tr[data-probe-id="${probeId}"]`).count(), 1);

    const compatible = await textJson(page, "#json-output");
    const importedQuestion = "Imported probability-bounded practitioner probe";
    compatible.probes.find(item => item.id === probeId).question = importedQuestion;
    compatible.probability_target = "Probability that imported evidence changes the route.";
    activeView(compatible).selected_probe_id = probeId;
    await page.locator("#import-json").fill(JSON.stringify(compatible));
    await page.locator('button[data-action="import-json"]').click();
    await assertVisibleNotice(page, "#import-message", /updated|imported/i);
    const imported = await textJson(page, "#json-output");
    assert.equal(imported.probes.find(item => item.id === probeId).question, importedQuestion);
    assert.equal(activeView(imported).selected_probe_id, probeId);
    assert.match(await page.locator("#selected-probe-inspector").textContent(), /Imported probability-bounded practitioner probe/);

    const sentinel = "Practitioner probe recovery sentinel";
    card = page.locator(`.probe-card[data-probe-id="${probeId}"]`);
    await card.locator('[data-field="question"]').fill(sentinel);
    await card.locator('[data-field="question"]').press("Tab");
    const invalidProbability = structuredClone(await textJson(page, "#json-output"));
    invalidProbability.probes.find(item => item.id === probeId).probability_estimate = 7;
    await clearNotice(page, "#import-message");
    await page.locator("#import-json").fill(JSON.stringify(invalidProbability));
    await page.locator('button[data-action="import-json"]').click();
    await assertVisibleNotice(page, "#import-message", /working state retained|probability.*0.*1/i);
    assert.equal((await textJson(page, "#json-output")).probes.find(item => item.id === probeId).question, sentinel);

    const malformedView = structuredClone(await textJson(page, "#json-output"));
    malformedView.view_state.views = [];
    await clearNotice(page, "#import-message");
    await page.locator("#import-json").fill(JSON.stringify(malformedView));
    await page.locator('button[data-action="import-json"]').click();
    await assertVisibleNotice(page, "#import-message", /working state retained|focus view/i);
    await page.locator(`.probe-card[data-probe-id="${probeId}"] [data-field="question"]`).fill(`${sentinel} remains operable`);
    await page.locator(`.probe-card[data-probe-id="${probeId}"] [data-field="question"]`).press("Tab");

    const collision = withActiveViewArtifactCollision(await textJson(page, "#json-output"));
    await clearNotice(page, "#import-message");
    await page.locator("#import-json").fill(JSON.stringify(collision));
    await page.locator('button[data-action="import-json"]').click();
    await assertVisibleNotice(page, "#import-message", /semantic namespace.*unique|unique.*semantic namespace/i);
    assert.match((await textJson(page, "#json-output")).probes.find(item => item.id === probeId).question, /remains operable/);

    const singleProbe = structuredClone(await textJson(page, "#json-output"));
    singleProbe.probes = [singleProbe.probes.find(item => item.id === probeId)];
    for (const view of singleProbe.view_state.views) {
      view.probe_order = [probeId];
      view.hidden_probe_ids = [];
      view.selected_probe_id = probeId;
    }
    await page.locator("#import-json").fill(JSON.stringify(singleProbe));
    await page.locator('button[data-action="import-json"]').click();
    await assertVisibleNotice(page, "#import-message", /updated|imported/i);
    assert.equal(await page.locator(`button[data-action="remove-probe"][data-probe-id="${probeId}"]`).isDisabled(), true);
    const ownProbeExport = await textJson(page, "#json-output");
    await page.locator("#import-json").fill(JSON.stringify(ownProbeExport));
    await page.locator('button[data-action="import-json"]').click();
    await assertVisibleNotice(page, "#import-message", /updated|imported/i);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}
async function matrixPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  let initialPrompt;
  try {
    const patternId = "pattern-form-validation";
    const populationId = "pop-designers";
    const cellId = "cell-form-validation__designers";
    const literal = "Validation remains visible as <strong>literal collaborator text</strong>.";
    const cellTextarea = () => page.locator(`#text-${cellId}`);

    initialPrompt = await exercisePromptCapsule(page, {
      apiName: "patternProblemSurfaceMatrix",
      copySelector: "#copyPromptBtn",
      downloadSelector: "#downloadPromptBtn",
      filename: "pattern-problem-surface-matrix.prompt-capsule.r0.1.4.skill-assisted.md",
      promptSelector: "#aiPrompt",
      stateContract: "pattern-problem-surface-matrix-state.v0.1",
      title: "Pattern–Problem Surface Matrix",
      version: "0.1.4",
    });
    assert.equal(initialPrompt.projection.patterns.length, 8);
    assert.equal(initialPrompt.projection.populationColumns.length, 6);
    assert.equal(initialPrompt.projection.patterns.flatMap(pattern => pattern.cells).length, 48);

    await page.locator(`.svg-click-cell[data-cell-id="${cellId}"]`).click();
    const selectedOnly = await page.evaluate(() => ({
      fingerprint: window.patternProblemSurfaceMatrix.promptCapsuleFingerprint(),
      markdown: window.patternProblemSurfaceMatrix.promptCapsule(),
    }));
    assert.equal(selectedOnly.fingerprint, initialPrompt.fingerprint);
    assert.equal(selectedOnly.markdown, initialPrompt.plain);
    await cellTextarea().fill(literal);
    await cellTextarea().press("Tab");
    await page.locator(`.cell-status[data-pattern="${patternId}"][data-pop="${populationId}"]`).selectOption("ready_to_route");

    let exported = await valueJson(page, "#jsonIO");
    let pattern = exported.patterns.find(item => item.id === patternId);
    let cell = exported.cells.find(item => item.id === cellId);
    assert.equal(pattern.reads[populationId], literal);
    assert.equal(pattern.cell_statuses[populationId], "ready_to_route");
    assert.equal(cell.text, literal);
    assert.equal(activeView(exported).selected_cell_id, cellId);
    assert.match(await page.locator(`#preview-${cellId}`).textContent(), /<strong>literal collaborator text<\/strong>/);
    assert.match(await page.locator(`.svg-click-cell[data-cell-id="${cellId}"] title`).textContent(), /<strong>literal collaborator text<\/strong>/);
    assert.equal(await page.locator(`[data-inspector-cell-text="${cellId}"]`).inputValue(), literal);
    assert.match(await page.locator("#inspector").textContent(), /Ready to route/);
    const changedPrompt = await page.evaluate(() => ({
      fingerprint: window.patternProblemSurfaceMatrix.promptCapsuleFingerprint(),
      markdown: window.patternProblemSurfaceMatrix.promptCapsule(),
    }));
    assert.notEqual(changedPrompt.fingerprint, initialPrompt.fingerprint);
    assert.notEqual(changedPrompt.markdown, initialPrompt.plain);
    assert.match(changedPrompt.markdown, /Validation remains visible as &lt;strong&gt;literal collaborator text&lt;\/strong&gt;\./u);
    const linkedGraph = await copiedJson(page, "#copyJsonLdBtn");
    const cellNode = linkedGraph["@graph"].find(node => (node.id || node["@id"]) === `#${cellId}`);
    assert.equal(cellNode.text || cellNode["schema:text"], literal);
    assert.equal(cellNode.status || cellNode["ca:status"], "ready_to_route");

    const populationOrder = [...activeView(exported).population_order];
    const populationIndex = populationOrder.indexOf(populationId);
    const populationDelta = populationIndex < populationOrder.length - 1 ? 1 : -1;
    const populationMove = populationDelta === 1 ? "data-pop-right" : "data-pop-left";
    await page.locator(`button[${populationMove}="${populationId}"]`).click();
    exported = await valueJson(page, "#jsonIO");
    assert.equal(activeView(exported).population_order.indexOf(populationId), populationIndex + populationDelta);
    assert.equal(await page.locator(`#matrixWrap td[data-cell-id="${cellId}"]`).count(), 1);

    const patternOrder = [...activeView(exported).pattern_order];
    const patternIndex = patternOrder.indexOf(patternId);
    const patternDelta = patternIndex < patternOrder.length - 1 ? 1 : -1;
    const patternMove = patternDelta === 1 ? "data-pat-down" : "data-pat-up";
    await page.locator(`button[${patternMove}="${patternId}"]`).click();
    exported = await valueJson(page, "#jsonIO");
    assert.equal(activeView(exported).pattern_order.indexOf(patternId), patternIndex + patternDelta);

    await page.locator(`button[data-pop-hide="${populationId}"]`).click();
    exported = await valueJson(page, "#jsonIO");
    cell = exported.cells.find(item => item.id === cellId);
    assert.ok(activeView(exported).hidden_population_ids.includes(populationId));
    assert.notEqual(activeView(exported).selected_cell_id, cellId);
    assert.equal(cell.visible_in_active_view, false);
    assert.equal(await page.locator(`.svg-click-cell[data-cell-id="${cellId}"]`).count(), 0);
    await page.locator(`#hiddenPopulationList button[data-pop-show="${populationId}"]`).click();
    assert.equal(await page.locator(`.svg-click-cell[data-cell-id="${cellId}"]`).count(), 1);

    const beforeAddition = await valueJson(page, "#jsonIO");
    await page.locator("#addPatternBtn").focus();
    await page.locator("#addPatternBtn").press("Enter");
    await page.waitForTimeout(300);
    await page.locator("#addPopulationBtn").focus();
    await page.locator("#addPopulationBtn").press("Enter");
    exported = await valueJson(page, "#jsonIO");
    assert.equal(exported.patterns.length, beforeAddition.patterns.length + 1);
    assert.equal(exported.population_columns.length, beforeAddition.population_columns.length + 1);
    assert.equal(exported.cells.length, exported.patterns.length * exported.population_columns.length);
    for (const candidatePattern of exported.patterns) {
      for (const candidatePopulation of exported.population_columns) {
        assert.ok(exported.cells.some(item => item.pattern_id === candidatePattern.id && item.population_id === candidatePopulation.id));
      }
    }

    const compatible = structuredClone(exported);
    const importedText = "Imported cross-population problem reading";
    compatible.patterns.find(item => item.id === patternId).reads[populationId] = importedText;
    activeView(compatible).selected_cell_id = cellId;
    activeView(compatible).selected_pattern_id = patternId;
    await page.locator("#jsonIO").fill(JSON.stringify(compatible));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#ioStatus", /updated|imported/i);
    const imported = await valueJson(page, "#jsonIO");
    assert.equal(imported.patterns.find(item => item.id === patternId).reads[populationId], importedText);
    assert.equal(activeView(imported).selected_cell_id, cellId);
    assert.equal(await page.locator(`[data-inspector-cell-text="${cellId}"]`).inputValue(), importedText);

    const privateBaseline = await page.evaluate(() => ({
      fingerprint: window.patternProblemSurfaceMatrix.promptCapsuleFingerprint(),
      markdown: window.patternProblemSurfaceMatrix.promptCapsule(),
      state: window.patternProblemSurfaceMatrix.getState(),
    }));
    const privateOnly = structuredClone(privateBaseline.state);
    privateOnly.private_annotation = "local pattern-map note";
    privateOnly.patterns[0].private_annotation = "local pattern note";
    privateOnly.view_state.private_annotation = "local view-state note";
    activeView(privateOnly).private_annotation = "local view note";
    await page.locator("#jsonIO").fill(JSON.stringify(privateOnly));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#ioStatus", /updated|imported/i);
    const privateReceipt = await page.evaluate(() => ({
      fingerprint: window.patternProblemSurfaceMatrix.promptCapsuleFingerprint(),
      markdown: window.patternProblemSurfaceMatrix.promptCapsule(),
      state: window.patternProblemSurfaceMatrix.getState(),
    }));
    assert.equal(privateReceipt.state.private_annotation, "local pattern-map note");
    assert.equal(privateReceipt.state.patterns[0].private_annotation, "local pattern note");
    assert.equal(privateReceipt.state.view_state.private_annotation, "local view-state note");
    assert.equal(activeView(privateReceipt.state).private_annotation, "local view note");
    assert.equal(privateReceipt.fingerprint, privateBaseline.fingerprint);
    assert.equal(privateReceipt.markdown, privateBaseline.markdown);

    const sentinel = "Pattern matrix recovery sentinel";
    await cellTextarea().fill(sentinel);
    await cellTextarea().press("Tab");
    const invalidStatus = structuredClone(await valueJson(page, "#jsonIO"));
    invalidStatus.patterns.find(item => item.id === patternId).cell_statuses[populationId] = "unbounded_status";
    await clearNotice(page, "#ioStatus");
    await page.locator("#jsonIO").fill(JSON.stringify(invalidStatus));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#ioStatus", /working state retained|remains available|current status/i);
    assert.equal((await valueJson(page, "#jsonIO")).patterns.find(item => item.id === patternId).reads[populationId], sentinel);

    const malformedView = structuredClone(await valueJson(page, "#jsonIO"));
    malformedView.view_state.views = [];
    await clearNotice(page, "#ioStatus");
    await page.locator("#jsonIO").fill(JSON.stringify(malformedView));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#ioStatus", /working state retained|remains available|focus view/i);
    await cellTextarea().fill(`${sentinel} and remains operable`);
    await cellTextarea().press("Tab");

    const collision = withActiveViewArtifactCollision(await valueJson(page, "#jsonIO"));
    await clearNotice(page, "#ioStatus");
    await page.locator("#jsonIO").fill(JSON.stringify(collision));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#ioStatus", /semantic namespace.*unique|unique.*semantic namespace/i);
    assert.match((await valueJson(page, "#jsonIO")).patterns.find(item => item.id === patternId).reads[populationId], /remains operable/);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
  await assertNoScriptPromptCapsule(browser, origin, route, "#aiPrompt", initialPrompt.plain);
}

async function unitTestFirstPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  let initialPrompt;
  try {
    const targetId = "target-consent-review-route";
    const boundaryId = "target-advanced-visual-comparison";
    const targetItems = exported => exported.unit_test_first_design.test_targets;
    const targetEditor = () => page.locator(`#edit-${targetId}`);
    const platformField = () => targetEditor().locator('textarea[oninput*="platform_agnostic_test"]');
    const literal = "Given consent is <strong>changed</strong>, when an export is requested, then review routing remains observable.";

    initialPrompt = await exercisePromptCapsule(page, {
      apiName: "unitTestFirstDesign",
      copySelector: "#copyPromptBtn",
      downloadSelector: "#downloadPromptBtn",
      filename: "unit-test-first-design.prompt-capsule.r0.1.4.skill-assisted.md",
      promptSelector: "#promptOut",
      stateContract: "unit-test-first-design-state.v0.1",
      title: "Unit-test-first Design",
      version: "0.1.4",
    });
    assert.equal(initialPrompt.projection.targets.length, 5);
    await targetEditor().getByRole("button", { name: "Inspect" }).click();
    const selectedOnly = await page.evaluate(() => ({
      fingerprint: window.unitTestFirstDesign.promptCapsuleFingerprint(),
      markdown: window.unitTestFirstDesign.promptCapsule(),
    }));
    assert.equal(selectedOnly.fingerprint, initialPrompt.fingerprint);
    assert.equal(selectedOnly.markdown, initialPrompt.plain);

    let exported = await textJson(page, "#jsonOut");
    assert.equal(targetItems(exported).length, 5);
    assert.equal(targetItems(exported).filter(target => /^Given\b/i.test(target.platform_agnostic_test) && /\bwhen\b/i.test(target.platform_agnostic_test) && /\bthen\b/i.test(target.platform_agnostic_test)).length, 4);
    assert.match(targetItems(exported).find(target => target.id === boundaryId).platform_agnostic_test, /intentionally unprotected/i);

    await platformField().fill(literal);
    await platformField().press("Tab");
    await targetEditor().getByRole("button", { name: "Inspect" }).click();
    exported = await textJson(page, "#jsonOut");
    let target = targetItems(exported).find(item => item.id === targetId);
    assert.equal(target.platform_agnostic_test, literal);
    assert.equal(activeView(exported).selected_target_id, targetId);
    assert.match(await page.locator("#selectedInspector").textContent(), /<strong>changed<\/strong>/);
    assert.match(await page.locator("#tableEquivalent").textContent(), /<strong>changed<\/strong>/);
    assert.match(await page.locator("#diagram").textContent(), /<strong>changed<\/strong>/);
    const changedPrompt = await page.evaluate(() => ({
      fingerprint: window.unitTestFirstDesign.promptCapsuleFingerprint(),
      markdown: window.unitTestFirstDesign.promptCapsule(),
    }));
    assert.notEqual(changedPrompt.fingerprint, initialPrompt.fingerprint);
    assert.notEqual(changedPrompt.markdown, initialPrompt.plain);
    assert.match(changedPrompt.markdown, /Given consent is &lt;strong&gt;changed&lt;\/strong&gt;/u);
    let linkedGraph = await textJson(page, "#jsonLdOut");
    assert.equal(linkedGraph["@graph"].find(node => node["@id"] === `#${targetId}`)["ca:platformAgnosticTest"], literal);
    assert.deepEqual(JSON.parse(await page.locator("#embedded-json-ld").textContent()), linkedGraph);

    const beforeOrder = [...activeView(exported).target_order];
    await targetEditor().getByRole("button", { name: "Move later" }).click();
    exported = await textJson(page, "#jsonOut");
    assert.equal(activeView(exported).target_order.indexOf(targetId), beforeOrder.indexOf(targetId) + 1);

    await targetEditor().getByRole("button", { name: "Hide" }).click();
    exported = await textJson(page, "#jsonOut");
    target = targetItems(exported).find(item => item.id === targetId);
    assert.ok(activeView(exported).hidden_target_ids.includes(targetId));
    assert.notEqual(activeView(exported).selected_target_id, targetId);
    assert.equal(target.visible_in_active_view, false);
    assert.equal(await page.locator(`#diagram g[onclick*="${targetId}"]`).count(), 0);
    await page.locator(`#hiddenPanel button[onclick*="${targetId}"]`).click();
    assert.equal(await page.locator(`#edit-${targetId}`).count(), 1);

    const compatible = await textJson(page, "#jsonOut");
    const importedTitle = "Imported consent-sensitive behavior";
    const importedTarget = targetItems(compatible).find(item => item.id === targetId);
    importedTarget.title = importedTitle;
    importedTarget.platform_agnostic_test = "Given imported consent state, when export begins, then the named review route is returned.";
    activeView(compatible).selected_target_id = targetId;
    await revealControl(page, "#importText");
    await page.locator("#importText").fill(JSON.stringify(compatible));
    await page.locator("#importPasteBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const imported = await textJson(page, "#jsonOut");
    assert.equal(targetItems(imported).find(item => item.id === targetId).title, importedTitle);
    assert.equal(activeView(imported).selected_target_id, targetId);
    assert.match(await page.locator("#selectedInspector").textContent(), /Imported consent-sensitive behavior/);

    const privateBaseline = await page.evaluate(() => ({
      fingerprint: window.unitTestFirstDesign.promptCapsuleFingerprint(),
      markdown: window.unitTestFirstDesign.promptCapsule(),
      state: window.unitTestFirstDesign.getState(),
    }));
    const privateOnly = structuredClone(privateBaseline.state);
    privateOnly.private_annotation = "local protected-behavior note";
    privateOnly.unit_test_first_design.private_annotation = "local design note";
    privateOnly.unit_test_first_design.test_targets[0].private_annotation = "local target note";
    await page.locator("#importText").fill(JSON.stringify(privateOnly));
    await page.locator("#importPasteBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const privateReceipt = await page.evaluate(() => ({
      fingerprint: window.unitTestFirstDesign.promptCapsuleFingerprint(),
      markdown: window.unitTestFirstDesign.promptCapsule(),
      state: window.unitTestFirstDesign.getState(),
    }));
    assert.equal(privateReceipt.state.private_annotation, "local protected-behavior note");
    assert.equal(privateReceipt.state.unit_test_first_design.private_annotation, "local design note");
    assert.equal(privateReceipt.state.unit_test_first_design.test_targets[0].private_annotation, "local target note");
    assert.equal(privateReceipt.fingerprint, privateBaseline.fingerprint);
    assert.equal(privateReceipt.markdown, privateBaseline.markdown);

    const singleVisibleTarget = structuredClone(imported);
    activeView(singleVisibleTarget).hidden_target_ids = targetItems(singleVisibleTarget).map(item => item.id).filter(id => id !== targetId);
    activeView(singleVisibleTarget).selected_target_id = targetId;
    await page.locator("#importText").fill(JSON.stringify(singleVisibleTarget));
    await page.locator("#importPasteBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const lastTargetHide = targetEditor().getByRole("button", { name: "Hide" });
    assert.equal(await lastTargetHide.isDisabled(), true);
    const ownTargetExport = await textJson(page, "#jsonOut");
    await page.locator("#importText").fill(JSON.stringify(ownTargetExport));
    await page.locator("#importPasteBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    assert.equal(activeView(await textJson(page, "#jsonOut")).selected_target_id, targetId);

    const sentinel = "Given recovery state, when consent changes, then the current behavior remains operable.";
    await platformField().fill(sentinel);
    await platformField().press("Tab");
    const missingTargets = structuredClone(await textJson(page, "#jsonOut"));
    delete missingTargets.unit_test_first_design;
    await clearNotice(page, "#importNotice");
    await page.locator("#importText").fill(JSON.stringify(missingTargets));
    await page.locator("#importPasteBtn").click();
    await assertVisibleNotice(page, "#importNotice", /working unit-test-first design retained|working state retained/i);
    assert.equal(targetItems(await textJson(page, "#jsonOut")).find(item => item.id === targetId).platform_agnostic_test, sentinel);

    const hiddenSelection = structuredClone(await textJson(page, "#jsonOut"));
    activeView(hiddenSelection).hidden_target_ids = [targetId];
    activeView(hiddenSelection).selected_target_id = targetId;
    const retainedView = structuredClone(activeView(await textJson(page, "#jsonOut")));
    await clearNotice(page, "#importNotice");
    await page.locator("#importText").fill(JSON.stringify(hiddenSelection));
    await page.locator("#importPasteBtn").click();
    await assertVisibleNotice(page, "#importNotice", /working unit-test-first design retained|visible test target/i);
    const retainedAfterHiddenSelection = await textJson(page, "#jsonOut");
    assert.equal(targetItems(retainedAfterHiddenSelection).find(item => item.id === targetId).platform_agnostic_test, sentinel);
    assert.deepEqual(activeView(retainedAfterHiddenSelection), retainedView);

    const collision = withActiveViewArtifactCollision(await textJson(page, "#jsonOut"));
    await clearNotice(page, "#importNotice");
    await page.locator("#importText").fill(JSON.stringify(collision));
    await page.locator("#importPasteBtn").click();
    await assertVisibleNotice(page, "#importNotice", /semantic namespace.*unique|unique.*semantic namespace/i);
    await platformField().fill(`${sentinel} Fresh edit confirmed.`);
    await platformField().press("Tab");
    assert.match(targetItems(await textJson(page, "#jsonOut")).find(item => item.id === targetId).platform_agnostic_test, /Fresh edit confirmed/);

    await targetEditor().getByRole("button", { name: "Remove" }).click();
    await targetEditor().getByRole("button", { name: "Remove behavior" }).click();
    const afterSoleVisibleRemoval = await textJson(page, "#jsonOut");
    const remainingTargetIds = new Set(targetItems(afterSoleVisibleRemoval).map(item => item.id));
    assert.equal(remainingTargetIds.has(targetId), false);
    assert.ok(remainingTargetIds.has(activeView(afterSoleVisibleRemoval).selected_target_id));
    assert.equal(activeView(afterSoleVisibleRemoval).hidden_target_ids.includes(activeView(afterSoleVisibleRemoval).selected_target_id), false);
    await page.locator("#importText").fill(JSON.stringify(afterSoleVisibleRemoval));
    await page.locator("#importPasteBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
  await assertNoScriptPromptCapsule(browser, origin, route, "#promptOut", initialPrompt.plain);
}

async function recoveryAtlasPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  let initialPlain = "";
  try {
    const geometryId = "geom-testless-unease";
    const strainCue = "A relied-upon behavior changes without an executable example.";
    const stabilizingRead = "The vital behavior becomes an executable example.";
    const restoredState = "A collaborator can change the system with bounded confidence.";
    const primaryRoute = "Unit-test-first Design";
    const recoveryMoves = ["name the relied-upon behavior", "write one observable example"];

    const initial = await page.evaluate(() => {
      const api = window.recoveryRoutingAtlas;
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
        visible: document.querySelector("#promptBox").textContent,
        promptStyle: (() => {
          const style = getComputedStyle(document.querySelector("#promptBox"));
          return { color: style.color, backgroundColor: style.backgroundColor };
        })(),
      };
    });
    initialPlain = initial.plain;
    assert.equal(initial.frozen, true);
    assert.deepEqual(
      [initial.version, initial.contract, initial.stateContract, initial.view],
      ["0.1.4", "prompt-capsule/0.1.0", "recovery-routing-atlas-state.v0.1", "plain"],
    );
    assert.equal(initial.plain, initial.explicitPlain);
    assert.equal(initial.visible, initial.plain);
    assert.equal(initial.stateProjection.geometries.length, initial.state.geometries.length);
    assert.equal(initial.stateProjection.geometries.length, 19);
    assert.ok(initial.plain.includes(`- Fingerprint: \`${initial.fingerprint}\``));
    assert.match(initial.plain, /^# Prompt Capsule: Recovery Routing Atlas\n/u);
    assert.match(initial.plain, /## Related loops/u);
    assert.doesNotMatch(initial.plain, /## Skill assistance/u);
    const promptContrast = contrastRatio(initial.promptStyle.color, initial.promptStyle.backgroundColor);
    assert.ok(
      promptContrast >= 4.5,
      `Prompt Capsule contrast should meet 4.5:1, received ${promptContrast.toFixed(2)}:1 (${initial.promptStyle.color} on ${initial.promptStyle.backgroundColor})`,
    );

    await page.locator(`#geometryList button[data-action="select"][data-id="${geometryId}"]`).click();
    const selectedOnly = await page.evaluate(() => ({
      selectedGeometryId: window.recoveryRoutingAtlas.getState().view_state.views[0].selected_geometry_id,
      fingerprint: window.recoveryRoutingAtlas.promptCapsuleFingerprint(),
      markdown: window.recoveryRoutingAtlas.promptCapsule(),
    }));
    assert.equal(selectedOnly.selectedGeometryId, geometryId);
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
    const assisted = await page.evaluate(() => ({
      view: window.recoveryRoutingAtlas.getPromptCapsuleView(),
      stateProjection: window.recoveryRoutingAtlas.promptCapsuleStateProjection(),
      fingerprint: window.recoveryRoutingAtlas.promptCapsuleFingerprint(),
      markdown: window.recoveryRoutingAtlas.promptCapsuleMarkdown(),
      visible: document.querySelector("#promptBox").textContent,
    }));
    assert.equal(assisted.view, "skill-assisted");
    assert.equal(assisted.markdown, assisted.visible);
    assert.equal(assisted.fingerprint, initial.fingerprint);
    assert.deepEqual(assisted.stateProjection, initial.stateProjection);
    assert.match(assisted.markdown, /## Skill assistance/u);
    assert.match(assisted.markdown, /\.agents\/skills\/practitioner-probe\/SKILL\.md/u);

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
    assert.equal(download.suggestedFilename(), "recovery-routing-atlas.prompt-capsule.r0.1.4.skill-assisted.md");
    assert.equal(await page.evaluate(() => globalThis.__promptDownloadType), "text/markdown;charset=utf-8");
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString("utf8"), assisted.markdown);
    await page.locator('[data-prompt-view][value="plain"]').check();
    assert.equal(await page.locator("#promptBox").textContent(), initial.plain);

    await page.locator("#cueField").fill(strainCue);
    await page.locator("#cueField").press("Tab");
    await page.locator("#readField").fill(stabilizingRead);
    await page.locator("#readField").press("Tab");
    await page.locator("#restoredField").fill(restoredState);
    await page.locator("#restoredField").press("Tab");
    await page.locator("#routeField").fill(primaryRoute);
    await page.locator("#routeField").press("Tab");
    await page.locator("#movesField").fill(recoveryMoves.join("\n"));
    await page.locator("#movesField").press("Tab");

    let exported = await textJson(page, "#jsonOut");
    let geometry = exported.geometries.find(item => item.id === geometryId);
    assert.deepEqual(geometry.strain_cues, [strainCue]);
    assert.equal(geometry.stabilizing_read, stabilizingRead);
    assert.equal(geometry.restored_state, restoredState);
    assert.deepEqual(geometry.primary_routes, [primaryRoute]);
    assert.deepEqual(geometry.recovery_moves, recoveryMoves);
    assert.equal(activeView(exported).selected_geometry_id, geometryId);
    assert.match(await page.locator(`#routingTable tbody tr[data-id="${geometryId}"]`).textContent(), /vital behavior becomes an executable example/i);
    assert.match(await page.locator(`#atlasSvg .svg-geom[data-id="${geometryId}"]`).textContent(), /vital behavior becomes an executable example/i);
    assert.equal(await page.locator("#readField").inputValue(), stabilizingRead);
    let linkedGraph = await textJson(page, "#jsonLdOut");
    let geometryNode = linkedGraph["@graph"].find(node => (node.id || node["@id"]) === `#${geometryId}`);
    assert.deepEqual(geometryNode.strainCue || geometryNode["ca:strainCue"], [strainCue]);
    assert.equal(geometryNode.stabilizingRead || geometryNode["ca:stabilizingRead"], stabilizingRead);
    assert.deepEqual(geometryNode.recoveryMove || geometryNode["ca:recoveryMove"], recoveryMoves);
    let viewNode = linkedGraph["@graph"].find(node => (node.type || node["@type"]) === "ca:ViewConfiguration");
    assert.equal(viewNode["ca:selectedGeometry"], `#${geometryId}`);
    const changedCapsule = await page.evaluate(() => ({
      fingerprint: window.recoveryRoutingAtlas.promptCapsuleFingerprint(),
      markdown: window.recoveryRoutingAtlas.promptCapsule(),
    }));
    assert.notEqual(changedCapsule.fingerprint, initial.fingerprint);
    assert.notEqual(changedCapsule.markdown, initial.plain);
    assert.match(changedCapsule.markdown, /The vital behavior becomes an executable example\./u);

    const beforeOrder = [...activeView(exported).geometry_order];
    const index = beforeOrder.indexOf(geometryId);
    const moveDown = page.locator(`#geometryList button[data-action="move-down"][data-id="${geometryId}"]`);
    const action = await moveDown.isEnabled() ? "move-down" : "move-up";
    const delta = action === "move-down" ? 1 : -1;
    await page.locator(`#geometryList button[data-action="${action}"][data-id="${geometryId}"]`).click();
    exported = await textJson(page, "#jsonOut");
    assert.equal(activeView(exported).geometry_order.indexOf(geometryId), index + delta);

    await page.locator(`#geometryList button[data-action="hide"][data-id="${geometryId}"]`).click();
    exported = await textJson(page, "#jsonOut");
    geometry = exported.geometries.find(item => item.id === geometryId);
    assert.ok(activeView(exported).hidden_geometry_ids.includes(geometryId));
    assert.notEqual(activeView(exported).selected_geometry_id, geometryId);
    assert.equal(geometry.visible_in_active_view, false);
    assert.equal(await page.locator(`#atlasSvg .svg-geom[data-id="${geometryId}"]`).count(), 0);
    await page.locator(`#hiddenPanel button[data-id="${geometryId}"]`).click();
    assert.equal(await page.locator(`#atlasSvg .svg-geom[data-id="${geometryId}"]`).count(), 1);

    const compatible = await textJson(page, "#jsonOut");
    const importedArtifactId = "ca-artifact-recovery-routing-atlas-imported";
    const importedViewId = "view-imported-recovery-focus";
    compatible.artifact_identity.id = importedArtifactId;
    compatible.artifact_identity.display_name = "Imported Recovery Routing Atlas";
    const compatibleView = activeView(compatible);
    compatibleView.id = importedViewId;
    compatibleView.name = "Imported recovery focus";
    compatibleView.selected_geometry_id = geometryId;
    compatible.view_state.active_view_id = importedViewId;
    compatible.geometries.find(item => item.id === geometryId).stabilizing_read = "Imported stabilizing read";
    await revealControl(page, "#importText");
    await page.locator("#importText").fill(JSON.stringify(compatible));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const imported = await textJson(page, "#jsonOut");
    assert.equal(imported.artifact_identity.id, importedArtifactId);
    assert.equal(imported.view_state.active_view_id, importedViewId);
    assert.equal(activeView(imported).selected_geometry_id, geometryId);
    assert.equal(imported.geometries.find(item => item.id === geometryId).stabilizing_read, "Imported stabilizing read");
    linkedGraph = await textJson(page, "#jsonLdOut");
    assert.ok(linkedGraph["@graph"].some(node => (node.id || node["@id"]) === `#${importedArtifactId}`));
    viewNode = linkedGraph["@graph"].find(node => (node.id || node["@id"]) === `#${importedViewId}`);
    assert.equal(viewNode["ca:selectedGeometry"], `#${geometryId}`);

    const sentinel = "Recovery Atlas retained-state sentinel";
    await page.locator("#readField").fill(sentinel);
    await page.locator("#readField").press("Tab");
    const malformed = structuredClone(await textJson(page, "#jsonOut"));
    malformed.artifact_identity.display_name = "Partially committed recovery title";
    malformed.geometries = [null];
    const retainedCapsule = await page.evaluate(() => ({
      fingerprint: window.recoveryRoutingAtlas.promptCapsuleFingerprint(),
      markdown: window.recoveryRoutingAtlas.promptCapsule(),
    }));
    await clearNotice(page, "#importNotice");
    await page.locator("#importText").fill(JSON.stringify(malformed));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /working recovery routing atlas retained|working state retained/i);
    let recovered = await textJson(page, "#jsonOut");
    assert.notEqual(recovered.artifact_identity.display_name, "Partially committed recovery title");
    assert.equal(recovered.geometries.find(item => item.id === geometryId).stabilizing_read, sentinel);
    assert.deepEqual(await page.evaluate(() => ({
      fingerprint: window.recoveryRoutingAtlas.promptCapsuleFingerprint(),
      markdown: window.recoveryRoutingAtlas.promptCapsule(),
    })), retainedCapsule);

    const collision = withActiveViewArtifactCollision(recovered);
    await clearNotice(page, "#importNotice");
    await page.locator("#importText").fill(JSON.stringify(collision));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /semantic namespace.*unique|unique.*semantic namespace/i);
    await page.locator("#readField").fill(`${sentinel} and remains operable`);
    await page.locator("#readField").press("Tab");
    recovered = await textJson(page, "#jsonOut");
    assert.match(recovered.geometries.find(item => item.id === geometryId).stabilizing_read, /remains operable/);

    const requiredFieldsBefore = structuredClone(recovered.geometries.find(item => item.id === geometryId));
    await page.locator("#routeField").fill(" ");
    await page.locator("#routeField").press("Tab");
    await page.waitForFunction(() => /working geometry retained/i.test(document.querySelector("#promptCapsuleStatus")?.textContent || ""));
    let afterRequiredRecovery = (await textJson(page, "#jsonOut")).geometries.find(item => item.id === geometryId);
    assert.deepEqual(afterRequiredRecovery.primary_routes, requiredFieldsBefore.primary_routes);
    assert.equal(await page.locator("#routeField").inputValue(), requiredFieldsBefore.primary_routes.join("\n"));

    await page.locator("#nameField").fill(" ");
    await page.locator("#nameField").press("Tab");
    afterRequiredRecovery = (await textJson(page, "#jsonOut")).geometries.find(item => item.id === geometryId);
    assert.equal(afterRequiredRecovery.name, requiredFieldsBefore.name);
    assert.equal(await page.locator("#nameField").inputValue(), requiredFieldsBefore.name);

    const exactSelfRoundtrip = await textJson(page, "#jsonOut");
    await page.locator("#importText").fill(JSON.stringify(exactSelfRoundtrip));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    assert.deepEqual(await textJson(page, "#jsonOut"), exactSelfRoundtrip);

    await page.evaluate(() => {
      Object.defineProperty(Navigator.prototype, "clipboard", {
        configurable: true,
        get: () => undefined,
      });
      document.execCommand = () => false;
    });
    await page.locator("#copyPromptBtn").click();
    await page.waitForFunction(() => /manual copy/i.test(document.querySelector("#promptCapsuleStatus")?.textContent || ""));
    assert.equal(await page.locator("#promptBox").isVisible(), true);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }

  const stateBoundaryContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const stateBoundaryPage = await stateBoundaryContext.newPage();
    await stateBoundaryPage.goto(`${origin}/${route}`, { waitUntil: "domcontentloaded" });
    const baseline = await stateBoundaryPage.evaluate(() => ({
      state: window.recoveryRoutingAtlas.getState(),
      fingerprint: window.recoveryRoutingAtlas.promptCapsuleFingerprint(),
      markdown: window.recoveryRoutingAtlas.promptCapsule(),
    }));
    const privateOnly = structuredClone(baseline.state);
    privateOnly.artifact_identity.private_annotation = "local review note";
    privateOnly.geometries[0].private_annotation = "local geometry note";
    await revealControl(stateBoundaryPage, "#importText");
    await stateBoundaryPage.locator("#importText").fill(JSON.stringify(privateOnly));
    await stateBoundaryPage.locator("#importBtn").click();
    await assertVisibleNotice(stateBoundaryPage, "#importNotice", /updated|imported/i);
    const privateOnlyReceipt = await stateBoundaryPage.evaluate(() => ({
      state: window.recoveryRoutingAtlas.getState(),
      fingerprint: window.recoveryRoutingAtlas.promptCapsuleFingerprint(),
      markdown: window.recoveryRoutingAtlas.promptCapsule(),
    }));
    assert.equal(privateOnlyReceipt.state.artifact_identity.private_annotation, "local review note");
    assert.equal(privateOnlyReceipt.state.geometries[0].private_annotation, "local geometry note");
    assert.equal(privateOnlyReceipt.fingerprint, baseline.fingerprint);
    assert.equal(privateOnlyReceipt.markdown, baseline.markdown);

    const semanticChange = structuredClone(privateOnlyReceipt.state);
    semanticChange.semantic_locality.preferred_phrasing[0] = "Which restored condition would re-open movement?";
    await stateBoundaryPage.locator("#importText").fill(JSON.stringify(semanticChange));
    await stateBoundaryPage.locator("#importBtn").click();
    await assertVisibleNotice(stateBoundaryPage, "#importNotice", /updated|imported/i);
    const semanticReceipt = await stateBoundaryPage.evaluate(() => ({
      fingerprint: window.recoveryRoutingAtlas.promptCapsuleFingerprint(),
      markdown: window.recoveryRoutingAtlas.promptCapsule(),
    }));
    assert.notEqual(semanticReceipt.fingerprint, baseline.fingerprint);
    assert.notEqual(semanticReceipt.markdown, baseline.markdown);
    assert.match(semanticReceipt.markdown, /Which restored condition would re-open movement\?/u);
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
    assert.equal(await noScriptPage.locator("#promptBox").textContent(), initialPlain);
    assert.equal(await noScriptPage.locator("#promptBox").isVisible(), true);
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

async function familyIndexPath(browser, origin, route, projection) {
  const { context, page, telemetry } = await openFresh(browser, origin, route);
  try {
    const cardId = "unit-test-first-design";
    const literal = "protect <strong>vital behavior</strong> through executable examples";
    let exported = await textJson(page, "#jsonPreview");
    const manifest = await page.evaluate(async fileName => {
      const response = await fetch(fileName);
      if (!response.ok) throw new Error(`Manifest request returned ${response.status}.`);
      return response.json();
    }, manifestName);
    const cardIds = new Set(exported.cards.map(card => card.id));
    assert.equal(exported.families.length, 7);
    assert.equal(exported.cards.length, 20);
    assert.equal(exported.entry_routes.length, 20);
    assert.equal(exported.recovery_routes.length, 19);
    exported.entry_routes.forEach(entry => assert.ok(cardIds.has(entry.start), `${entry.id} should resolve to a card`));
    exported.recovery_routes.forEach(recovery => recovery.start.forEach(start => assert.ok(cardIds.has(start), `${recovery.geometry} should resolve to a card`)));
    const manifestCards = manifest.prototypes.filter(item => item.id !== "core-architecture-family-index").map(item => ({ id: item.id, file: item.file })).sort((left, right) => left.id.localeCompare(right.id));
    const familyCards = exported.cards.map(item => ({ id: item.id, file: item.file })).sort((left, right) => left.id.localeCompare(right.id));
    assert.deepEqual(familyCards, manifestCards);
    assert.equal(await page.locator("#entryRoutesTable tbody tr").count(), 20);
    assert.equal(await page.locator("#recoveryTable tbody tr").count(), 19);
    assert.equal(await page.locator("#cardRegistry article[data-card-id]").count(), 20);

    await page.locator(`#cardRegistry article[data-card-id="${cardId}"] button[data-action="select-card"]`).click();
    await page.locator('[data-bind-card="move"]').fill(literal);
    await page.locator('[data-bind-card="move"]').press("Tab");
    exported = await textJson(page, "#jsonPreview");
    let card = exported.cards.find(item => item.id === cardId);
    assert.equal(card.move, literal);
    assert.equal(activeView(exported).selected_card_id, cardId);
    assert.match(await page.locator(`#cardRegistry article[data-card-id="${cardId}"]`).textContent(), /<strong>vital behavior<\/strong>/);
    assert.match(await page.locator("#registryTable").textContent(), /<strong>vital behavior<\/strong>/);
    assert.equal(await page.locator('#registryTable strong:has-text("vital behavior")').count(), 0);
    let linkedGraph = await textJson(page, "#jsonLdPreview");
    assert.equal(linkedGraph["@graph"].find(node => node["@id"] === `#${cardId}`)["ca:primaryCognitiveMove"], literal);

    const beforeOrder = [...activeView(exported).card_order];
    const cardIndex = beforeOrder.indexOf(cardId);
    const delta = cardIndex < beforeOrder.length - 1 ? 1 : -1;
    await page.locator(`#cardRegistry button[data-action="move-card"][data-id="${cardId}"][data-delta="${delta}"]`).click();
    exported = await textJson(page, "#jsonPreview");
    assert.equal(activeView(exported).card_order.indexOf(cardId), cardIndex + delta);
    assert.equal(await page.locator(`#atlasSvg [data-card-id="${cardId}"]`).count(), 1);

    await page.locator(`#cardRegistry button[data-action="hide-card"][data-id="${cardId}"]`).click();
    exported = await textJson(page, "#jsonPreview");
    card = exported.cards.find(item => item.id === cardId);
    assert.ok(activeView(exported).hidden_card_ids.includes(cardId));
    assert.notEqual(activeView(exported).selected_card_id, cardId);
    assert.equal(await page.locator(`#cardRegistry article[data-card-id="${cardId}"]`).count(), 0);
    assert.ok(card, "hidden card should remain in the exported source registry");
    await page.locator('button[data-action="show-all"]').click();
    assert.equal(await page.locator(`#cardRegistry article[data-card-id="${cardId}"]`).count(), 1);

    const compatible = await textJson(page, "#jsonPreview");
    const importedMove = "Imported behavior-protection route";
    compatible.cards.find(item => item.id === cardId).move = importedMove;
    activeView(compatible).selected_card_id = cardId;
    await page.locator("#importText").fill(JSON.stringify(compatible));
    await page.locator('button[data-action="import-json"]').click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const imported = await textJson(page, "#jsonPreview");
    assert.equal(imported.cards.find(item => item.id === cardId).move, importedMove);
    assert.equal(activeView(imported).selected_card_id, cardId);
    assert.match(await page.locator("#inspector").textContent(), /Imported behavior-protection route/);

    const singleVisibleCard = structuredClone(imported);
    const selectedFamilyId = singleVisibleCard.cards.find(item => item.id === cardId).family;
    activeView(singleVisibleCard).hidden_family_ids = singleVisibleCard.families.map(item => item.id).filter(id => id !== selectedFamilyId);
    activeView(singleVisibleCard).hidden_card_ids = singleVisibleCard.cards.filter(item => item.family === selectedFamilyId && item.id !== cardId).map(item => item.id);
    activeView(singleVisibleCard).selected_card_id = cardId;
    await page.locator("#importText").fill(JSON.stringify(singleVisibleCard));
    await page.locator('button[data-action="import-json"]').click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    assert.equal(await page.locator(`#cardRegistry button[data-action="hide-card"][data-id="${cardId}"]`).isDisabled(), true);
    assert.equal(await page.locator(`button[data-action="hide-family"][data-id="${selectedFamilyId}"]`).isDisabled(), true);
    const ownFamilyExport = await textJson(page, "#jsonPreview");
    await page.locator("#importText").fill(JSON.stringify(ownFamilyExport));
    await page.locator('button[data-action="import-json"]').click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    assert.equal(activeView(await textJson(page, "#jsonPreview")).selected_card_id, cardId);

    const sentinel = "Family Index recovery sentinel";
    await page.locator('[data-bind-card="move"]').fill(sentinel);
    await page.locator('[data-bind-card="move"]').press("Tab");
    const malformed = structuredClone(await textJson(page, "#jsonPreview"));
    malformed.artifact_identity.display_name = "Partially committed family title";
    malformed.recovery_routes = [null];
    await clearNotice(page, "#importNotice");
    await page.locator("#importText").fill(JSON.stringify(malformed));
    await page.locator('button[data-action="import-json"]').click();
    await assertVisibleNotice(page, "#importNotice", /working core architecture family index retained|working state retained/i);
    let recovered = await textJson(page, "#jsonPreview");
    assert.notEqual(recovered.artifact_identity.display_name, "Partially committed family title");
    assert.equal(recovered.cards.find(item => item.id === cardId).move, sentinel);

    const collision = withActiveViewArtifactCollision(recovered);
    await clearNotice(page, "#importNotice");
    await page.locator("#importText").fill(JSON.stringify(collision));
    await page.locator('button[data-action="import-json"]').click();
    await assertVisibleNotice(page, "#importNotice", /semantic namespace.*unique|unique.*semantic namespace/i);
    await page.locator('[data-bind-card="move"]').fill(`${sentinel} and remains operable`);
    await page.locator('[data-bind-card="move"]').press("Tab");
    recovered = await textJson(page, "#jsonPreview");
    assert.match(recovered.cards.find(item => item.id === cardId).move, /remains operable/);

    const familyGeometryNames = recovered.recovery_routes.map(item => item.geometry).sort();
    await page.goto(`${origin}/${projection.root}/${artifactNames.recoveryAtlas}`, { waitUntil: "domcontentloaded" });
    const atlasGeometryNames = (await textJson(page, "#jsonOut")).geometries.map(item => item.name).sort();
    assert.deepEqual(familyGeometryNames, atlasGeometryNames);

    const packRoute = `${projection.root}/${packIndexName}`;
    await page.goto(`${origin}/${packRoute}`, { waitUntil: "domcontentloaded" });
    const currentLinks = page.getByRole("link", { name: "Open current prototype" });
    assert.equal(await currentLinks.count(), 21);
    const linkedFiles = (await currentLinks.evaluateAll(links => links.map(link => new URL(link.href).pathname.split("/").pop()))).sort();
    const manifestFiles = manifest.prototypes.filter(item => item.status === "current" && item.exists).map(item => item.file).sort();
    assert.deepEqual(linkedFiles, manifestFiles);
    const familyLink = page.locator(`a[href="${artifactNames.familyIndex}"]`);
    await familyLink.click();
    await page.waitForURL(new RegExp(`${artifactNames.familyIndex.replaceAll(".", "\\.")}$`));
    assert.match(await page.title(), /Core Architecture Family Index/);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

const paths = [
  ["Context Tree completeness, focus, exchange, and recovery", "contextTree", contextTreePath],
  ["Jobs-to-be-Done Treemap weighting, focus, exchange, and recovery", "treemap", treemapPath],
  ["Practitioner Probes probability, order, exchange, and recovery", "probes", probesPath],
  ["Pattern–Problem Matrix closure, focus, exchange, and recovery", "matrix", matrixPath],
  ["Unit-test-first behavior examples, focus, exchange, and recovery", "unitTestFirst", unitTestFirstPath],
  ["Recovery Atlas geometry, focus, exchange, and recovery", "recoveryAtlas", recoveryAtlasPath],
  ["Core family inventory, routing, navigation, exchange, and recovery", "familyIndex", familyIndexPath]
];

const expectedArtifactKeys = Object.keys(artifactNames).sort();
const pathKeys = paths.map(([, artifactKey]) => artifactKey);
assert.equal(projections.length, 2, "The reference-instrument contract should exercise both maintained projections.");
assert.equal(paths.length, 7, "The reference-instrument contract should exercise all seven receiving instruments.");
assert.deepEqual([...pathKeys].sort(), expectedArtifactKeys, "Reference-instrument paths should match the maintained receiving inventory.");
assert.equal(new Set(pathKeys).size, paths.length, "Each reference instrument should have one browser path.");
const expectedCheckCount = projections.length * paths.length;

const staticServer = await startStaticServer();
const browser = await chromium.launch({ headless: true });
try {
  for (const projection of projections) {
    for (const [label, artifactKey, path] of paths) {
      const route = `${projection.root}/${artifactNames[artifactKey]}`;
      await verify(`${projection.label} · ${label}`, () => path(browser, staticServer.origin, route, projection));
    }
  }
} finally {
  await browser.close();
  await staticServer.close();
}

assert.equal(checks.length, expectedCheckCount, `The reference-instrument contract should complete ${expectedCheckCount} projection checks.`);

for (const check of checks) {
  console.log(`${check.status === "passed" ? "PASS" : "FAIL"} ${check.label}`);
  if (check.message) console.log(check.message);
}

if (failures.length) {
  console.error(`Core reference-instrument browser contract: ${checks.length - failures.length}/${checks.length} passed.`);
  process.exitCode = 1;
} else {
  console.log(`Core reference-instrument browser contract: ${checks.length}/${checks.length} passed.`);
}

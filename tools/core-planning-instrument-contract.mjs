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
  poda: "poda-chimeric-prototype-v0.1.1.html",
  alignment: "alignment-worksheet-chimeric-prototype-v0.1.1.html",
  frv: "first-responsible-version-matrix-chimeric-prototype-v0.1.1.html",
  sharedSurface: "shared-surface-priority-map-chimeric-prototype-v0.1.1.html",
  aiSystems: "ai-systems-service-blueprint-chimeric-prototype-v0.1.1.html",
  softwareViews: "software-architecture-views-chimeric-prototype-v0.1.1.html",
  participatory: "participatory-design-kit-chimeric-prototype-v0.1.1.html",
  plusDelta: "plus-delta-chimeric-prototype-v0.1.1.html",
  upstream: "upstream-revision-loop-chimeric-prototype-v0.1.1.html"
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
  const { context, page, telemetry } = await openFresh(browser, origin, route);
  try {
    const activityId = "activity-impact-map";
    const discoverableId = "discoverable-role-context";
    await page.locator(`button[data-action="select"][data-type="activity"][data-id="${activityId}"]`).click();
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
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function alignmentPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route);
  try {
    const restored = "Review boundaries remain visible <strong>as collaborator text</strong>.";
    const strain = "Reviewers can locate the source boundary and still need a clearer confirmation route.";
    await page.locator("#text-restored_state").fill(restored);
    await page.locator('.inverse-field[data-key="observed_strain_state"]').fill(strain);
    await page.locator('button.move-option[data-id="option-ai-boundary"][data-dir="-1"]').click();

    let exported = await textJson(page, "#jsonOut");
    assert.equal(exported.baseline_chain.find(blank => blank.key === "restored_state").text, restored);
    assert.equal(exported.inverse_state.observed_strain_state, strain);
    assert.ok(activeView(exported).option_order.indexOf("option-ai-boundary") < activeView(exported).option_order.indexOf("option-data-stewardship"));
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

    const sentinel = "Alignment recovery sentinel";
    await page.locator("#text-restored_state").fill(sentinel);
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
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function frvPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route);
  try {
    const cardId = "card-ai-generated-summary-panel";
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
    await page.locator("#importText").fill(JSON.stringify(invalid));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /remains available|working state retained/i);
    assert.equal((await textJson(page, "#jsonOut")).cards.find(item => item.id === cardId).reason, sentinel);

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
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function sharedSurfacePath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  try {
    const cellId = "cell-analysis-environment__stage-review";
    const assetId = "asset-claim-source-map";
    await page.locator(`button[data-select-cell="${cellId}"]`).click();
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

    await page.locator('[data-hide-surface="surface-analysis-environment"]').click();
    exported = await copiedJson(page, "#copyJsonBtn");
    cell = exported.shared_surface_priority_map.heatmap_cells.find(item => item.id === cellId);
    assert.ok(activeView(exported).hidden_surface_ids.includes("surface-analysis-environment"));
    assert.equal(cell.visible_in_active_view, false);
    assert.ok(cell.linked_shared_asset_ids.includes(assetId));
    await page.locator('[data-show-surface="surface-analysis-environment"]').click();

    const compatible = await copiedJson(page, "#copyJsonBtn");
    const importedCell = "Imported shared-surface decision";
    compatible.shared_surface_priority_map.heatmap_cells.find(item => item.id === cellId).note = importedCell;
    activeView(compatible).selected_cell_id = cellId;
    await openContainingDetails(page, "#importText");
    await page.locator("#importText").fill(JSON.stringify(compatible));
    await page.locator("#importJsonBtn").click();
    await assertVisibleNotice(page, "#importNotice", /updated|imported/i);
    const imported = await copiedJson(page, "#copyJsonBtn");
    assert.equal(imported.shared_surface_priority_map.heatmap_cells.find(item => item.id === cellId).note, importedCell);
    assert.equal(activeView(imported).selected_cell_id, cellId);
    assert.match(await page.locator("#inspector").textContent(), /Imported shared-surface decision/);

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
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function aiSystemsPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route);
  try {
    const cellId = "cell-runtime__plan";
    const literal = "Orchestrator keeps <strong>plan limits</strong> visible.";
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
}

async function softwareViewsPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route);
  try {
    const attachmentId = "att-review-state-service";
    const literal = "Review state crosses <strong>service and audit</strong> attachments.";
    await page.locator(`button[data-action="select-attachment"][data-id="${attachmentId}"]`).click();
    await page.locator("#attRelationship").fill(literal);

    let exported = await textJson(page, "#jsonOut");
    let attachment = exported.software_architecture_views.attachments.find(item => item.id === attachmentId);
    assert.equal(attachment.relationship, literal);
    assert.match(await page.locator(`#attachmentSvg [data-attachment-id="${attachmentId}"] title`).textContent(), /Review state crosses <strong>service and audit/);
    assert.match(await page.locator("#attachmentTable").textContent(), /Review state crosses <strong>service and audit/);
    const jsonLd = await textJson(page, "#jsonLdOut");
    const attachmentNode = jsonLd["@graph"].find(node => node.id === `#${attachmentId}`);
    assert.equal(attachmentNode["ca:belongsToView"].id, "#view-module");

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

    const collision = structuredClone(await textJson(page, "#jsonOut"));
    collision.software_architecture_views.attachments.find(item => item.id === attachmentId).id = "view-module";
    activeView(collision).selected_attachment_id = "";
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
}

async function participatoryPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route);
  try {
    const itemId = "bar-consent-exception";
    const fragmentId = "frag-consent-route";
    const literal = "the review route stays visible as <strong>collaborator text</strong>";
    await page.locator(`button[data-action="select"][data-type="item"][data-id="${itemId}"]`).click();
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
}

async function plusDeltaPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route, { captureClipboard: true });
  try {
    const observationId = "obs-source-provenance-plus";
    const literal = "Source provenance now needs <strong>one clearer recovery route</strong>.";
    await page.locator(`select[data-field="type"][data-id="${observationId}"]`).selectOption("delta");
    await page.locator(`textarea[data-field="observation"][data-id="${observationId}"]`).fill(literal);

    let exported = await copiedJson(page, "#copyJsonBtn");
    let observation = exported.observations.find(item => item.id === observationId);
    assert.equal(observation.type, "delta");
    assert.equal(observation.observation, literal);
    assert.match(await page.locator(`#textTable tr[data-id="${observationId}"]`).textContent(), /needs to change/i);
    assert.match(await page.locator(`#diagramWrap .svg-cell[data-id="${observationId}"] title`).textContent(), /Source provenance now needs <strong>one clearer recovery route/);

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
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function upstreamPath(browser, origin, route) {
  const { context, page, telemetry } = await openFresh(browser, origin, route);
  try {
    const revisionId = "revision-ai-summary-review-route";
    const observation = "Human review evidence now identifies a visible source-boundary transition.";
    const revisedRead = "The prior artifact can expose source support and confirmation as separate review states.";
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
    await page.locator("#importArea").fill(JSON.stringify(invalid));
    await page.locator("#importBtn").click();
    await assertVisibleNotice(page, "#importNotice", /remains available|working state retained/i);
    assert.equal((await textJson(page, "#jsonOut")).revisions.find(item => item.id === revisionId).evidence_observation, sentinel);

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

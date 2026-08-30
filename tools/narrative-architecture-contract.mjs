#!/usr/bin/env node

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const routes = {
  composer: "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/narrative-capsule-composer/narrative-capsules-chimeric-prototype-v0.1.html",
  semantic: "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/semantic-sampling-tableau/terminology-exploration/narrative-sampling-tableau-chimeric-prototype-v0.1.html",
  semanticJsonLd: "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/semantic-sampling-tableau/terminology-exploration/conation-motion-naming-sampling.example.v0.1.jsonld",
  technology: "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/technology-fit-sampling-tableau/technology-fit-sampling-tableau-chimeric-prototype-v0.2.html",
  technologyJsonLd: "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/technology-fit-sampling-tableau/front-end-stack-selection.example.v0.1.jsonld",
  threadkeeping: "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/threadkeeping-ledger/threadkeeping-ledger-chimeric-prototype-bundle-v0.1/threadkeeping-ledger-chimeric-prototype-v0.1.html"
};

const checks = [];
const failures = [];

function fnv1a32Utf8(value) {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(String(value))) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function compactJsonLdId(prefix, value) {
  const encoded = encodeURIComponent(String(value)).replace(
    /[!'()*]/g,
    character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `${prefix}:${encoded}`;
}

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

async function startStaticServer() {
  const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8"
  };
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const absolutePath = resolve(repositoryRoot, `.${pathname}`);
      const repositoryPath = relative(repositoryRoot, absolutePath);
      if (repositoryPath.startsWith("..") || repositoryPath === "") {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const body = await readFile(absolutePath);
      response.writeHead(200, {
        "Content-Type": contentTypes[extname(absolutePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      response.end(body);
    } catch (error) {
      response.writeHead(error?.code === "ENOENT" ? 404 : 500).end("Unavailable");
    }
  });
  await new Promise((resolveListening, rejectListening) => {
    server.once("error", rejectListening);
    server.listen(0, "127.0.0.1", resolveListening);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close(error => error ? rejectClose(error) : resolveClose());
    })
  };
}

function monitor(page) {
  const telemetry = { consoleErrors: [], pageErrors: [], requestFailures: [], responseErrors: [] };
  page.on("console", message => {
    if (message.type() === "error") telemetry.consoleErrors.push(message.text());
  });
  page.on("pageerror", error => telemetry.pageErrors.push(error.message));
  page.on("requestfailed", request => telemetry.requestFailures.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText || "request failed"}`));
  page.on("response", response => {
    if (response.status() >= 400) telemetry.responseErrors.push(`${response.status()} ${response.url()}`);
  });
  return telemetry;
}

function assertTelemetry(telemetry) {
  const observations = [
    ...telemetry.consoleErrors.map(value => `console: ${value}`),
    ...telemetry.pageErrors.map(value => `page: ${value}`),
    ...telemetry.requestFailures.map(value => `request: ${value}`),
    ...telemetry.responseErrors.map(value => `response: ${value}`)
  ];
  assert.deepEqual(observations, [], observations.join(" | "));
}

async function openFresh(browser, origin, route) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const telemetry = monitor(page);
  await page.goto(`${origin}/${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  assert.equal(await page.evaluate(() => localStorage.length), 0, `${route} should begin with fresh browser storage`);
  return { context, page, telemetry };
}

async function previewJson(page, selector) {
  const text = await page.locator(selector).textContent();
  assert.ok(text?.trim(), `${selector} should expose JSON`);
  return JSON.parse(text);
}

async function authoredJsonLd(route, id) {
  const source = await readFile(resolve(repositoryRoot, route), "utf8");
  const match = source.match(new RegExp(`<script type="application/ld\\+json" id="${id}">([\\s\\S]*?)<\\/script>`));
  assert.ok(match, `${route} should carry an authored JSON-LD twin`);
  return JSON.parse(match[1]);
}

async function downloadedJson(page, selector) {
  const downloadPromise = page.waitForEvent("download");
  await page.locator(selector).click();
  const download = await downloadPromise;
  const path = await download.path();
  assert.ok(path, `${selector} should create a local download`);
  return JSON.parse(await readFile(path, "utf8"));
}

async function composerPath(browser, origin) {
  const { context, page, telemetry } = await openFresh(browser, origin, routes.composer);
  try {
    const initial = await previewJson(page, "#jsonPreview");
    assert.ok(initial.strategy_canvas_v2, "Composer should expose its Strategy Canvas 2.0 projection");

    await page.locator("#importText").fill(JSON.stringify(initial.strategy_canvas_v2));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importNotice").textContent(), /Composition imported/);

    const threshold = page.locator('[data-dim-field="next"]').first();
    await threshold.fill("8");
    const edited = await downloadedJson(page, '[data-action="download-json"]');
    assert.equal(edited.strategy_canvas_v2.dimensions[0].scores.goodEnough, 8);
    assert.equal(edited.composition.aiContextProjectionRef, edited.ai_context_projection.id);
    assert.ok(Array.isArray(edited.composition.gapRefs));
    assert.ok(edited.composition.targetBindings.every(binding => binding.reviewState === "working"));

    await page.locator("#importText").fill(JSON.stringify({ unexpected: true }));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importNotice").textContent(), /Current composition is still available/);
    const recovered = await previewJson(page, "#jsonPreview");
    assert.equal(recovered.strategy_canvas_v2.dimensions[0].scores.goodEnough, 8);
    assert.equal(recovered.composition.id, edited.composition.id);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function composerLifecyclePath(browser, origin) {
  const { context, page, telemetry } = await openFresh(browser, origin, routes.composer);
  try {
    const authored = await authoredJsonLd(routes.composer, "jsonld-data");
    assert.deepEqual(authored, await previewJson(page, "#jsonLdPreview"));

    await page.locator('[data-action="include-recommended"]').click();
    const hydrated = await previewJson(page, "#jsonPreview");
    const requiredKind = hydrated.target_pair.requiredModuleKinds.find(kind =>
      hydrated.composition.sourceSelections.some(selection =>
        selection.moduleKind === kind && selection.inclusionState === "included"
      )
    );
    assert.ok(requiredKind, "Composer should expose an included required source before the held-open transition");
    const requiredIndex = hydrated.composition.sourceSelections.findIndex(selection =>
      selection.moduleKind === requiredKind
    );
    const requiredSelection = hydrated.composition.sourceSelections[requiredIndex];

    await page.locator(`select[data-module-field="inclusionState"][data-module-index="${requiredIndex}"]`).selectOption("held_open");
    const held = await previewJson(page, "#jsonPreview");
    const heldGap = held.composition.gaps.find(gap =>
      gap.gapType === "held_open_required_module" && gap.moduleKind === requiredKind
    );
    assert.equal(held.composition.readinessState, "ready_with_caveats");
    assert.ok(heldGap, "held-open required support should remain an explicit caveat");
    assert.equal(
      held.composition.sourceSelections.find(selection => selection.id === requiredSelection.id).inclusionState,
      "held_open"
    );
    assert.ok(
      held.composition.targetBindings.some(binding =>
        binding.bindingState === "held_open" && binding.sourceSelectionRefs.includes(requiredSelection.id)
      ),
      "a required held-open source should remain traceable from its target binding"
    );
    assert.equal(held.composition.sourceCapsuleVersionRefs.includes(requiredSelection.sourceCapsuleVersionRef), false);
    assert.equal(held.ai_context_projection.projectionOfCapsuleVersionRefs.includes(requiredSelection.sourceCapsuleVersionRef), false);
    assert.equal(held.ai_context_projection.includedModuleRefs.includes(requiredSelection.id), false);
    assert.equal(
      held.ai_context_projection.contentHash,
      `fnv1a32-utf8:${fnv1a32Utf8(held.ai_context_projection.text)}`
    );
    assert.notEqual(held.ai_context_projection.contentHash, hydrated.ai_context_projection.contentHash);
    assert.ok(held.ai_context_projection.promptSections.length >= 8);
    assert.ok(held.ai_context_projection.promptSections.some(section => section.semanticRole === "gap_disclosure"));

    const sourceIds = new Set(held.composition.sourceSelections.map(selection => selection.id));
    const bindingIds = new Set(held.composition.targetBindings.map(binding => binding.id));
    const gapIds = new Set(held.composition.gaps.map(gap => gap.id));
    assert.equal(held.composition.aiContextProjectionRef, held.ai_context_projection.id);
    assert.equal(held.composition.boundaryManifestRef, held.boundary_manifest.id);
    assert.equal(held.ai_context_projection.compositionRef, held.composition.id);
    assert.equal(held.ai_context_projection.boundaryManifestRef, held.boundary_manifest.id);
    assert.ok(held.composition.targetBindings.every(binding =>
      binding.sourceSelectionRefs.every(reference => sourceIds.has(reference))
    ));
    assert.ok(held.composition.gapRefs.every(reference => gapIds.has(reference)));
    assert.ok(held.ai_context_projection.projectionOfModuleRefs.every(reference => sourceIds.has(reference)));
    assert.ok(held.ai_context_projection.targetBindingRefs.every(reference => bindingIds.has(reference)));
    assert.ok(held.ai_context_projection.knownGapRefs.every(reference => gapIds.has(reference)));

    const runtimeJsonLd = await previewJson(page, "#jsonLdPreview");
    assert.deepEqual(runtimeJsonLd, JSON.parse(await page.locator("#jsonld-data").textContent()));
    const graphIds = new Set(runtimeJsonLd["@graph"].map(node => node["@id"]));
    assert.ok(graphIds.has(requiredSelection.id));
    assert.ok(graphIds.has(heldGap.id));
    assert.ok(graphIds.has(held.boundary_manifest.id));
    assert.ok(graphIds.has(held.ai_context_projection.id));
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function semanticPath(browser, origin) {
  const { context, page, telemetry } = await openFresh(browser, origin, routes.semantic);
  try {
    const initial = await previewJson(page, "#jsonPreview");
    await page.locator('[data-action="duplicate-run"]').click();
    await page.locator('[data-action="add-candidate"]').click();
    const name = "Browser recovery candidate";
    const nameInput = page.locator('[data-inspector-field="displayName"]');
    await nameInput.fill(name);
    await nameInput.press("Tab");

    await page.locator("details:has(#importText) > summary").click();
    await page.locator('[data-action="save-local"]').click();
    assert.match(await page.locator("#importStatus").textContent(), /saved in this browser/);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("details:has(#importText) > summary").click();
    await page.locator('[data-action="load-local"]').click();
    assert.match(await page.locator("#importStatus").textContent(), /Browser save loaded/);

    const restored = await downloadedJson(page, '#twins [data-action="download-json"]');
    assert.equal(restored.runs.length, initial.runs.length + 1);
    const restoredRun = restored.runs.find(run => run.id === restored.activeRunId);
    assert.ok(restoredRun.candidates.some(candidate => candidate.displayName === name));

    const invalid = structuredClone(restored);
    delete invalid.id;
    await page.locator("#importText").fill(JSON.stringify(invalid));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importStatus").textContent(), /Current sampling state is still available/);
    const recovered = await previewJson(page, "#jsonPreview");
    assert.equal(recovered.id, restored.id);
    assert.equal(recovered.runs.length, restored.runs.length);
    assert.ok(recovered.runs.find(run => run.id === recovered.activeRunId).candidates.some(candidate => candidate.displayName === name));
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function semanticPromptAndLineagePath(browser, origin) {
  const { context, page, telemetry } = await openFresh(browser, origin, routes.semantic);
  try {
    const authored = await authoredJsonLd(routes.semantic, "jsonld-data");
    assert.deepEqual(authored, await previewJson(page, "#jsonLdPreview"));
    assert.deepEqual(authored, JSON.parse(await readFile(resolve(repositoryRoot, routes.semanticJsonLd), "utf8")));
    const runTabs = page.locator("[data-run-id]");
    assert.ok(await runTabs.count() >= 2, "Semantic Sampling should expose comparable runs");
    const baselineId = await runTabs.first().getAttribute("data-run-id");
    const comparisonId = await runTabs.last().getAttribute("data-run-id");

    await runTabs.first().click();
    await page.locator("#candidateSemantics").selectOption("closed_exclusive_exhaustive");
    await page.locator(`[data-run-id="${comparisonId}"]`).click();

    const selected = await previewJson(page, "#jsonPreview");
    const selectedRun = selected.runs.find(run => run.id === selected.activeRunId);
    const prompt = await page.locator("#promptPreview").textContent();
    assert.equal(selected.activeRunId, comparisonId);
    assert.equal(selected.conditionProfile.candidateSetSemantics, selectedRun.candidateSetSemantics);
    assert.match(prompt, new RegExp(`Active sampling run:\\n${selectedRun.displayName.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`));
    assert.match(prompt, new RegExp(`Candidate-set semantics:\\n${selectedRun.candidateSetSemantics}`));

    await page.locator('[data-action="duplicate-run"]').click();
    const duplicated = await previewJson(page, "#jsonPreview");
    const child = duplicated.runs.find(run => run.id === duplicated.activeRunId);
    const parent = duplicated.runs.find(run => run.id === child.parentRunRef);
    assert.ok(parent, "A duplicated run should retain its parent relation");
    assert.ok(child.variantRef, "A duplicated run should receive a variant identity");
    assert.deepEqual(child.candidates.map(({ id }) => id), parent.candidates.map(({ id }) => id));
    assert.equal(duplicated.comparison.baselineRunId, parent.id);
    assert.equal(duplicated.comparison.comparisonRunId, child.id);
    assert.equal(duplicated.promptCapsule.comparisonRunRefs[0], parent.id);
    const jsonLd = await previewJson(page, "#jsonLdPreview");
    assert.equal(jsonLd["na:activeRun"]["na:parentRunRef"]["@id"], parent.id);
    assert.equal(jsonLd["na:activeRun"]["na:variantRef"]["@id"], child.variantRef);
    assert.equal(jsonLd["na:comparison"]["na:baselineRunRef"]["@id"], parent.id);
    assert.equal(jsonLd["na:comparison"]["na:comparisonRunRef"]["@id"], child.id);
    assert.deepEqual(jsonLd["na:decisionRecord"]["na:selectedCandidateRef"].map(ref => ref["@id"]), duplicated.decision.selectedCandidateIds);
    assert.deepEqual(jsonLd["na:decisionRecord"]["na:heldCandidateRef"].map(ref => ref["@id"]), duplicated.decision.heldCandidateIds);
    assert.deepEqual(jsonLd["na:decisionRecord"]["na:declinedCandidateRef"].map(ref => ref["@id"]), duplicated.decision.declinedCandidateIds);

    await page.locator("details:has(#importText) > summary").click();
    await page.locator("#importText").fill(JSON.stringify(duplicated));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importStatus").textContent(), /Sampling state imported/);

    const duplicateRunId = structuredClone(duplicated);
    duplicateRunId.runs.at(-1).id = baselineId;
    duplicateRunId.activeRunId = baselineId;
    await page.locator("#importText").fill(JSON.stringify(duplicateRunId));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importStatus").textContent(), /Current sampling state is still available/);
    const recovered = await previewJson(page, "#jsonPreview");
    assert.equal(recovered.activeRunId, child.id);
    assert.equal(new Set(recovered.runs.map(({ id }) => id)).size, recovered.runs.length);
    assert.deepEqual(recovered, duplicated);

    const missingDimensionId = structuredClone(recovered);
    delete missingDimensionId.dimensions[0].id;
    await page.locator("#importText").fill(JSON.stringify(missingDimensionId));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importStatus").textContent(), /Current sampling state is still available/);
    assert.deepEqual(await previewJson(page, "#jsonPreview"), recovered);

    const unknownMode = structuredClone(recovered);
    unknownMode.runs.find(run => run.id === unknownMode.activeRunId).candidateSetSemantics = "unknown_mode";
    await page.locator("#importText").fill(JSON.stringify(unknownMode));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importStatus").textContent(), /Current sampling state is still available/);
    assert.deepEqual(await previewJson(page, "#jsonPreview"), recovered);

    const cyclicLineage = structuredClone(recovered);
    cyclicLineage.runs.find(run => run.id === cyclicLineage.activeRunId).parentRunRef = cyclicLineage.activeRunId;
    await page.locator("#importText").fill(JSON.stringify(cyclicLineage));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importStatus").textContent(), /Current sampling state is still available/);
    assert.deepEqual(await previewJson(page, "#jsonPreview"), recovered);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function semanticNormalizationPath(browser, origin) {
  const { context, page, telemetry } = await openFresh(browser, origin, routes.semantic);
  try {
    for (let index = 0; index < 4; index += 1) {
      await page.locator('[data-action="add-candidate"]').click();
    }
    const expanded = await previewJson(page, "#jsonPreview");
    const expandedRun = expanded.runs.find(item => item.id === expanded.activeRunId);
    const expandedTotal = expandedRun.candidates.reduce((sum, candidate) => sum + candidate.estimate, 0) + expandedRun.otherOrTailMass;
    assert.ok(Math.abs(expandedTotal - 1) < 0.001, "new Semantic candidates should draw from the declared open tail");
    const positiveAddition = expandedRun.candidates.slice(-4).find(candidate => candidate.estimate > 0);
    assert.ok(positiveAddition, "the open tail should fund at least one added Semantic candidate");
    await page.locator(`[data-select-candidate="${positiveAddition.id}"]`).click();
    await page.locator('[data-action="remove-candidate"]').click();
    const reduced = await previewJson(page, "#jsonPreview");
    const reducedRun = reduced.runs.find(item => item.id === reduced.activeRunId);
    const reducedTotal = reducedRun.candidates.reduce((sum, candidate) => sum + candidate.estimate, 0) + reducedRun.otherOrTailMass;
    assert.ok(Math.abs(reducedTotal - 1) < 0.001, "removed Semantic candidates should return their mass to the open tail");
    assert.equal(Number((reducedRun.otherOrTailMass - expandedRun.otherOrTailMass).toFixed(4)), positiveAddition.estimate);
    await page.locator('[data-action="reset"]').click();

    await page.evaluate(() => {
      const state = window.__NST__.getState();
      const run = state.runs.find(item => item.id === state.activeRunId);
      run.candidateSetSemantics = "independent_events";
      run.candidates.forEach(candidate => { candidate.estimate = 1; });
      state.conditionProfile.candidateSetSemantics = run.candidateSetSemantics;
      window.__NST__.render();
    });
    const independentBefore = await previewJson(page, "#jsonPreview");
    const independentTail = independentBefore.runs.find(item => item.id === independentBefore.activeRunId).otherOrTailMass;
    await page.locator('[data-action="add-candidate"]').click();
    const independentExpanded = await previewJson(page, "#jsonPreview");
    const independentRun = independentExpanded.runs.find(item => item.id === independentExpanded.activeRunId);
    assert.equal(independentRun.candidates.at(-1).estimate, 0.05, "independent events should retain a declared seed estimate outside exclusive-total allocation");
    assert.equal(independentRun.otherOrTailMass, independentTail);
    await page.locator('[data-action="reset"]').click();

    await page.evaluate(() => {
      const state = window.__NST__.getState();
      const run = state.runs.find(item => item.id === state.activeRunId);
      const template = structuredClone(run.candidates[0]);
      run.candidateSetSemantics = "open_exclusive";
      run.otherOrTailMass = 0.998;
      run.candidates = Array.from({ length: 30 }, (_, index) => ({
        ...structuredClone(template),
        id: `vs:candidate/normalization-${index + 1}`,
        displayName: `Normalization candidate ${index + 1}`,
        estimate: 1
      }));
      state.conditionProfile.candidateSetSemantics = run.candidateSetSemantics;
      state.viewState.selectedCandidateId = run.candidates[0].id;
      window.__NST__.render();
    });

    await page.locator('[data-action="normalize"]').click();
    const normalized = await previewJson(page, "#jsonPreview");
    const run = normalized.runs.find(item => item.id === normalized.activeRunId);
    const total = run.candidates.reduce((sum, candidate) => sum + candidate.estimate, 0) + run.otherOrTailMass;
    assert.ok(Math.abs(total - 1) < 0.0001, `exclusive total should align exactly enough for continued use; received ${total}`);
    assert.ok(run.candidates.every(candidate => candidate.estimate >= 0 && candidate.estimate <= 1), "normalization should keep every estimate inside its declared probability bounds");
    assert.match(await page.locator("#normalizationSummary").textContent(), /aligned/);

    await page.locator("details:has(#importText) > summary").click();
    await page.locator("#importText").fill(JSON.stringify(normalized));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importStatus").textContent(), /Sampling state imported/);

    const oneCandidate = structuredClone(normalized);
    const active = oneCandidate.runs.find(item => item.id === oneCandidate.activeRunId);
    active.candidates = [active.candidates[0]];
    active.otherOrTailMass = Number((1 - active.candidates[0].estimate).toFixed(4));
    oneCandidate.viewState.selectedCandidateId = active.candidates[0].id;
    await page.locator("#importText").fill(JSON.stringify(oneCandidate));
    await page.locator('[data-action="import-json"]').click();
    assert.match(await page.locator("#importStatus").textContent(), /Sampling state imported/);
    const finalRemove = page.locator('[data-action="remove-candidate"]');
    assert.equal(await finalRemove.count(), 1);
    assert.equal(await finalRemove.isDisabled(), true, "the final candidate should remain available as the minimum usable set");

    await page.evaluate(() => {
      const state = window.__NST__.getState();
      state.dimensions = [state.dimensions[0]];
      window.__NST__.render();
    });
    const finalDimensionRemove = page.locator('[data-action="remove-dimension"]');
    assert.equal(await finalDimensionRemove.count(), 1);
    assert.equal(await finalDimensionRemove.isDisabled(), true, "the final fit dimension should remain available for comparison");
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function technologyPath(browser, origin) {
  const { context, page, telemetry } = await openFresh(browser, origin, routes.technology);
  try {
    const initial = await previewJson(page, "#jsonPreview");
    await page.locator("#loadResponseExampleBtn").click();
    await page.locator("#importAiResponseBtn").click();
    assert.match(await page.locator("#aiResponseStatus").textContent(), /Successor run imported/);
    const successor = await previewJson(page, "#jsonPreview");
    assert.equal(successor.runs.length, initial.runs.length + 1);
    assert.equal(successor.comparison.comparisonRunId, successor.activeRunId);

    await page.locator("#saveLocalBtn").click();
    assert.match(await page.locator("#globalStatus").textContent(), /saved locally/);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#loadLocalBtn").click();
    assert.match(await page.locator("#globalStatus").textContent(), /Browser save loaded/);
    const restored = await downloadedJson(page, "#downloadStateBtn");
    assert.equal(restored.activeRunId, successor.activeRunId);
    assert.equal(restored.runs.length, successor.runs.length);

    const legacy = structuredClone(restored);
    legacy.promptCapsule.probabilityObjects[0].measurementStatus = "illustrative_verbalized_sample";
    legacy.promptCapsule.probabilityObjects[1].measurementStatus = "illustrative_planning_estimate";
    const legacyRun = legacy.runs.find(item => item.id === legacy.activeRunId);
    legacyRun.candidates[0].evidenceStatus = "illustrative_seed";
    const legacySpikeCandidateId = Object.keys(legacy.lowFidelitySpikes[0].candidateStates)[0];
    legacy.lowFidelitySpikes[0].candidateStates[legacySpikeCandidateId].status = "illustrative_walkthrough";
    await page.locator("details:has(#stateImportInput) > summary").click();
    await page.locator("#stateImportInput").fill(JSON.stringify(legacy));
    await page.locator("#importStateBtn").click();
    assert.match(await page.locator("#importStatus").textContent(), /Technology-fit state imported/);
    const migrated = await downloadedJson(page, "#downloadStateBtn");
    assert.equal(migrated.promptCapsule.probabilityObjects[0].measurementStatus, "uncalibrated_verbalized_sample");
    assert.equal(migrated.promptCapsule.probabilityObjects[1].measurementStatus, "uncalibrated_planning_estimate");
    assert.equal(migrated.runs.find(item => item.id === migrated.activeRunId).candidates[0].evidenceStatus, "sample_state");
    assert.equal(migrated.lowFidelitySpikes[0].candidateStates[legacySpikeCandidateId].status, "working_example");
    assert.doesNotMatch(JSON.stringify(migrated), /illustrative_(?:verbalized_sample|planning_estimate|seed|walkthrough)/);

    const invalid = structuredClone(migrated);
    delete invalid.id;
    await page.locator("#stateImportInput").fill(JSON.stringify(invalid));
    await page.locator("#importStateBtn").click();
    assert.match(await page.locator("#importStatus").textContent(), /Current technology-fit state is still available/);
    const recovered = await previewJson(page, "#jsonPreview");
    assert.equal(recovered.id, migrated.id);
    assert.equal(recovered.activeRunId, migrated.activeRunId);
    assert.equal(recovered.runs.length, migrated.runs.length);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function technologyCompositionIdentityPath(browser, origin) {
  const { context, page, telemetry } = await openFresh(browser, origin, routes.technology);
  try {
    const authored = await authoredJsonLd(routes.technology, "embedded-jsonld");
    assert.deepEqual(authored, await previewJson(page, "#jsonldPreview"));
    assert.deepEqual(authored, JSON.parse(await readFile(resolve(repositoryRoot, routes.technologyJsonLd), "utf8")));
    await page.evaluate(() => {
      Date.now = () => 1700000000000;
    });
    const name = "Rapid composition candidate";
    await page.locator("#composedCandidateName").fill(name);
    await page.locator("#composeCandidateBtn").click();
    await page.locator("#composeCandidateBtn").click();
    await page.locator("#composeCandidateBtn").click();

    const composed = await previewJson(page, "#jsonPreview");
    const run = composed.runs.find(item => item.id === composed.activeRunId);
    const additions = run.candidates.filter(candidate => candidate.name === name);
    assert.equal(additions.length, 3);
    assert.equal(new Set(additions.map(({ id }) => id)).size, additions.length, "rapid compositions should receive distinct stable identities");
    const composedTotal = run.candidates.reduce((sum, candidate) => sum + candidate.defaultLikelihood.estimate, 0) + run.otherOrTailMass;
    assert.ok(Math.abs(composedTotal - 1) < 0.001, "composed candidates should draw from the declared open tail");

    const jsonLd = await previewJson(page, "#jsonldPreview");
    const composedNodeIds = jsonLd["@graph"]
      .filter(node => node["@type"] === "TechnologyCandidate" && node.name === name)
      .map(node => node["@id"]);
    assert.equal(new Set(composedNodeIds).size, additions.length);

    await page.locator("details:has(#stateImportInput) > summary").click();
    await page.locator("#stateImportInput").fill(JSON.stringify(composed));
    await page.locator("#importStateBtn").click();
    assert.match(await page.locator("#importStatus").textContent(), /Technology-fit state imported/);

    const positiveAddition = additions.find(candidate => candidate.defaultLikelihood.estimate > 0);
    assert.ok(positiveAddition, "the open tail should fund at least one composed Technology candidate");
    page.once("dialog", dialog => dialog.accept());
    await page.locator(`[data-remove-candidate="${positiveAddition.id}"]`).click();
    const reduced = await previewJson(page, "#jsonPreview");
    const reducedRun = reduced.runs.find(item => item.id === reduced.activeRunId);
    const reducedTotal = reducedRun.candidates.reduce((sum, candidate) => sum + candidate.defaultLikelihood.estimate, 0) + reducedRun.otherOrTailMass;
    assert.ok(Math.abs(reducedTotal - 1) < 0.001, "removed Technology candidates should return their mass to the open tail");
    assert.equal(Number((reducedRun.otherOrTailMass - run.otherOrTailMass).toFixed(4)), positiveAddition.defaultLikelihood.estimate);

    const duplicateCandidateId = structuredClone(composed);
    const duplicateRun = duplicateCandidateId.runs.find(item => item.id === duplicateCandidateId.activeRunId);
    duplicateRun.candidates.at(-1).id = duplicateRun.candidates.at(-2).id;
    await page.locator("#stateImportInput").fill(JSON.stringify(duplicateCandidateId));
    await page.locator("#importStateBtn").click();
    assert.match(await page.locator("#importStatus").textContent(), /Current technology-fit state is still available/);
    const recovered = await previewJson(page, "#jsonPreview");
    const recoveredRun = recovered.runs.find(item => item.id === recovered.activeRunId);
    assert.equal(new Set(recoveredRun.candidates.map(({ id }) => id)).size, recoveredRun.candidates.length);
    assert.deepEqual(recovered, reduced);

    const unknownMode = structuredClone(recovered);
    unknownMode.runs.find(item => item.id === unknownMode.activeRunId).candidateSetSemantics = "unknown_mode";
    await page.locator("#stateImportInput").fill(JSON.stringify(unknownMode));
    await page.locator("#importStateBtn").click();
    assert.match(await page.locator("#importStatus").textContent(), /Current technology-fit state is still available/);
    assert.deepEqual(await previewJson(page, "#jsonPreview"), recovered);

    const outOfRange = structuredClone(recovered);
    outOfRange.runs.find(item => item.id === outOfRange.activeRunId).candidates[0].defaultLikelihood.estimate = 2;
    await page.locator("#stateImportInput").fill(JSON.stringify(outOfRange));
    await page.locator("#importStateBtn").click();
    assert.match(await page.locator("#importStatus").textContent(), /Current technology-fit state is still available/);
    assert.deepEqual(await previewJson(page, "#jsonPreview"), recovered);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function technologyDecisionAndLineagePath(browser, origin) {
  const { context, page, telemetry } = await openFresh(browser, origin, routes.technology);
  try {
    const initial = await previewJson(page, "#jsonPreview");
    const parentId = initial.runs[0].id;
    await page.locator(`[data-run="${parentId}"]`).click();
    const selectedSource = await previewJson(page, "#jsonPreview");
    const candidateId = selectedSource.runs.find(run => run.id === parentId).candidates[0].id;
    await page.locator("#duplicateRunBtn").click();

    const duplicated = await previewJson(page, "#jsonPreview");
    const child = duplicated.runs.find(run => run.id === duplicated.activeRunId);
    assert.equal(child.parentRunRef, parentId);
    assert.ok(child.variantRef);
    assert.equal(duplicated.comparison.baselineRunId, parentId);
    assert.equal(duplicated.comparison.comparisonRunId, child.id);

    await page.locator(`[data-spike="${candidateId}"]`).click();
    const selected = await previewJson(page, "#jsonPreview");
    const selectedRun = selected.runs.find(run => run.id === selected.activeRunId);
    assert.equal(selectedRun.candidates.find(candidate => candidate.id === candidateId).decisionState, "selected_for_spike");
    assert.ok(selected.decision.selectedCandidateIds.includes(candidateId));
    assert.match(await page.locator("#decisionCandidateLists").textContent(), new RegExp(selectedRun.candidates.find(candidate => candidate.id === candidateId).shortName));

    const jsonLd = await previewJson(page, "#jsonldPreview");
    const decisionNode = jsonLd["@graph"].find(node => node["@type"] === "TechnologyDecisionRecord");
    const runNode = jsonLd["@graph"].find(node => node["@type"] === "SamplingRun" && node["@id"].endsWith(`/${child.id}`));
    const comparisonNode = jsonLd["@graph"].find(node => node["@type"] === "na:SamplingRunComparison");
    const candidateNode = jsonLd["@graph"].find(node => node["@type"] === "TechnologyCandidate" && node["@id"].endsWith(`/${child.id}/candidate/${candidateId}`));
    assert.ok(decisionNode["na:selectedCandidateRef"].some(ref => ref["@id"].endsWith(`/${child.id}/candidate/${candidateId}`)));
    assert.equal(runNode["na:parentRunRef"]["@id"].endsWith(`/${parentId}`), true);
    assert.ok(runNode["na:variantRef"]["@id"].endsWith(`/${child.variantRef}`));
    assert.equal(comparisonNode["na:baselineRunRef"]["@id"].endsWith(`/${parentId}`), true);
    assert.equal(comparisonNode["na:comparisonRunRef"]["@id"].endsWith(`/${child.id}`), true);
    assert.equal(candidateNode["na:decisionState"], "selected_for_spike");
    assert.ok(Array.isArray(decisionNode["na:heldCandidateRef"]));
    assert.ok(Array.isArray(decisionNode["na:declinedCandidateRef"]));
    assert.match(await page.locator("#comparisonTable").textContent(), /unreviewed → selected for spike/);
    assert.deepEqual(JSON.parse(await page.locator("#embedded-jsonld").textContent()), jsonLd);

    await page.locator(`[data-run="${parentId}"]`).click();
    const parentSelected = await previewJson(page, "#jsonPreview");
    assert.ok(!parentSelected.decision.selectedCandidateIds.includes(candidateId));
    assert.equal(parentSelected.runs.find(run => run.id === parentId).candidates.find(candidate => candidate.id === candidateId).decisionState, "unreviewed");

    await page.locator(`[data-run="${child.id}"]`).click();
    const childSelected = await previewJson(page, "#jsonPreview");
    assert.ok(childSelected.decision.selectedCandidateIds.includes(candidateId));
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function technologySuccessorExchangePath(browser, origin) {
  const { context, page, telemetry } = await openFresh(browser, origin, routes.technology);
  try {
    const initial = await previewJson(page, "#jsonPreview");
    await page.locator("#loadResponseExampleBtn").click();
    const acceptedResponse = JSON.parse(await page.locator("#aiResponseInput").inputValue());
    await page.locator("#importAiResponseBtn").click();
    assert.match(await page.locator("#aiResponseStatus").textContent(), /Successor run imported/);

    const successor = await previewJson(page, "#jsonPreview");
    const run = successor.runs.find(item => item.id === successor.activeRunId);
    const total = run.candidates.reduce((sum, candidate) => sum + candidate.defaultLikelihood.estimate, 0) + run.otherOrTailMass;
    assert.ok(Math.abs(total - 1) < 0.001, `successor distribution should satisfy its open-exclusive contract; received ${total}`);
    assert.equal(run.parentRunRef, initial.activeRunId);
    assert.ok(run.variantRef);
    assert.equal(successor.comparison.baselineRunId, initial.activeRunId);
    assert.equal(successor.comparison.comparisonRunId, run.id);

    const misalignedDistribution = structuredClone(acceptedResponse);
    misalignedDistribution.otherOrTailMass = 0.1;
    await page.locator("#aiResponseInput").fill(JSON.stringify(misalignedDistribution));
    await page.locator("#importAiResponseBtn").click();
    assert.match(await page.locator("#aiResponseStatus").textContent(), /Current technology-fit state is still available/);
    assert.deepEqual(await previewJson(page, "#jsonPreview"), successor);

    await page.locator("#aiResponseInput").fill(JSON.stringify({ candidates: [] }));
    await page.locator("#importAiResponseBtn").click();
    assert.match(await page.locator("#aiResponseStatus").textContent(), /Current technology-fit state is still available/);
    const recovered = await previewJson(page, "#jsonPreview");
    assert.deepEqual(recovered, successor);

    await page.locator("details:has(#stateImportInput) > summary").click();
    const oneCandidate = structuredClone(recovered);
    const active = oneCandidate.runs.find(item => item.id === oneCandidate.activeRunId);
    active.candidates = [active.candidates[0]];
    oneCandidate.viewState.selectedCandidateId = active.candidates[0].id;
    await page.locator("#stateImportInput").fill(JSON.stringify(oneCandidate));
    await page.locator("#importStateBtn").click();
    assert.match(await page.locator("#importStatus").textContent(), /Current technology-fit state is still available/);
    assert.deepEqual(await previewJson(page, "#jsonPreview"), recovered);

    const twoCandidate = structuredClone(recovered);
    const boundedRun = twoCandidate.runs.find(item => item.id === twoCandidate.activeRunId);
    boundedRun.candidates = boundedRun.candidates.slice(0, 2);
    twoCandidate.viewState.selectedCandidateId = boundedRun.candidates[0].id;
    await page.locator("#stateImportInput").fill(JSON.stringify(twoCandidate));
    await page.locator("#importStateBtn").click();
    assert.match(await page.locator("#importStatus").textContent(), /Technology-fit state imported/);
    const removeButtons = page.locator("[data-remove-candidate]");
    assert.equal(await removeButtons.count(), 2);
    assert.equal(await removeButtons.first().isDisabled(), true, "the schema-aligned two-candidate floor should stay available");
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

async function threadkeepingPath(browser, origin) {
  const { context, page, telemetry } = await openFresh(browser, origin, routes.threadkeeping);
  try {
    const authored = await authoredJsonLd(routes.threadkeeping, "jsonldGraph");
    assert.deepEqual(authored, await page.evaluate(() => buildJsonLd()));

    const literalEntryId = "tk-entry-'quoted-<literal>";
    const literalEntryTitle = "Quoted <literal> collaboration state";
    const literalSummary = "Literal collaborator text stays intact across controls: 'single quotes', \"double quotes\", <angle brackets>, & ampersands, and enough additional prose to exercise the full-text reveal path without turning authored content into executable code.";
    const literalCandidateId = "next-'quoted-<literal>";
    const literalCandidateTitle = "Quoted <literal> continuation";
    const candidate = await page.evaluate(() => exportDocument());
    candidate.threadkeeper.entries[0] = {
      ...candidate.threadkeeper.entries[0],
      id: literalEntryId,
      title: literalEntryTitle,
      summary: literalSummary,
      status: "stable_for_now",
      horizonPosition: "later",
      reviewTrigger: "Review when the literal-text path is exercised."
    };
    candidate.threadkeeper.nextCandidates[0] = {
      ...candidate.threadkeeper.nextCandidates[0],
      id: literalCandidateId,
      title: literalCandidateTitle,
      reason: "Carry exact collaborator text into the next revisable move.",
      readinessState: "ready_for_execution",
      horizonPosition: "next"
    };
    candidate.threadkeeper.continuityAssessments = [
      {
        id: "continuity-future-first",
        type: "ContextContinuityAssessment",
        assessorType: "human",
        band: "compressed",
        basis: "The first assessment at the newest date.",
        atRiskElements: [],
        observedLoss: "",
        recommendedMove: "continue",
        reviewState: "human_confirmed",
        asOf: "2030-01-02"
      },
      {
        id: "continuity-past-second",
        type: "ContextContinuityAssessment",
        assessorType: "ai_collaborator",
        band: "breathable",
        basis: "An older assessment inserted later in the array.",
        atRiskElements: [],
        observedLoss: "",
        recommendedMove: "continue",
        reviewState: "unreviewed",
        asOf: "2029-12-30"
      },
      {
        id: "continuity-future-tie-latest",
        type: "ContextContinuityAssessment",
        assessorType: "human",
        band: "threadbare",
        basis: "The later insertion resolves the equal-date continuity view.",
        atRiskElements: ["Literal text path"],
        observedLoss: "",
        recommendedMove: "rehydrate",
        reviewState: "human_confirmed",
        asOf: "2030-01-02"
      }
    ];
    candidate.viewState.selectedEntryId = literalEntryId;
    candidate.viewState.selectedCandidateId = literalCandidateId;
    delete candidate.relationshipContract;
    delete candidate.recoveryCalibration;
    delete candidate.sourceNote;

    await page.locator("#jsonImport").fill(JSON.stringify(candidate));
    await page.locator("#importJsonBtn").click();
    assert.match(await page.locator("#importStatus").textContent(), /Ledger imported/);
    assert.equal(await page.locator('[data-entry-field="status"]').inputValue(), "stable_for_now");
    assert.equal(await page.locator('[data-entry-field="horizonPosition"]').inputValue(), "later");
    assert.match(await page.locator("#relationshipContract").textContent(), /owning contract/);
    assert.match(await page.locator("#recoveryCalibration").textContent(), /owning contract/);
    assert.match(await page.locator("#sourceAnchors").textContent(), /owning record/);

    await page.locator('[data-entry-field="status"]').selectOption("needs_review");
    await page.locator('[data-entry-field="horizonPosition"]').selectOption("next");
    assert.equal(await page.locator('[data-entry-field="status"]').inputValue(), "needs_review");
    assert.equal(await page.locator('[data-entry-field="horizonPosition"]').inputValue(), "next");

    await page.locator('#horizon [data-select-entry]').filter({ hasText: literalEntryTitle }).click();
    assert.equal(await page.locator("#selectedInspector .inspector-meta").textContent(), literalEntryId);
    assert.match(await page.locator('.horizon-col[data-pos="next"]').textContent(), new RegExp(literalEntryTitle));

    await page.locator('#reviewQueue [data-select-entry]').filter({ hasText: literalEntryTitle }).click();
    assert.equal(await page.locator("#selectedInspector .inspector-meta").textContent(), literalEntryId);

    const literalRow = page.locator("#ledgerBody tr").filter({ hasText: literalEntryTitle });
    await literalRow.locator("[data-reveal-entry]").first().click();
    assert.equal(await page.locator("#textDialogContent").textContent(), literalSummary);
    await page.locator('[data-close-dialog="textDialog"]').click();

    await page.locator("#columnsBtn").click();
    const summaryToggle = page.locator('[data-column-toggle][data-column-key="summary"]');
    await summaryToggle.uncheck();
    assert.equal(await page.locator("#ledgerHead th").filter({ hasText: "Summary" }).count(), 0);
    await page.locator('[data-column-toggle][data-column-key="summary"]').check();
    await page.locator('[data-close-dialog="columnsDialog"]').click();

    await page.locator('#candidateList [data-edit-candidate]').filter({ hasText: literalCandidateTitle }).click();
    await page.locator('#candidateForm [name="title"]').fill("Quoted <literal> continuation — reviewed");
    await page.locator('#candidateForm [name="reason"]').fill("Carry exact collaborator text into a reviewed continuation.");
    await page.locator("#candidateSubmitBtn").click();

    assert.match(await page.locator("#continuitySummary").textContent(), /threadbare/);
    assert.match(await page.locator("#continuitySummary").textContent(), /2030-01-02/);
    assert.match(await page.locator("#hydrationPacket").inputValue(), /The later insertion resolves the equal-date continuity view/);

    const detached = await page.evaluate(() => {
      const snapshot = exportDocument();
      const workingTitle = model.threadkeeper.entries[0].title;
      const workingSearch = view.filters.search;
      snapshot.threadkeeper.entries[0].title = "mutated exported title";
      snapshot.viewState.filters.search = "mutated exported filter";
      return {
        workingTitle,
        titleAfterMutation: model.threadkeeper.entries[0].title,
        workingSearch,
        searchAfterMutation: view.filters.search
      };
    });
    assert.equal(detached.titleAfterMutation, detached.workingTitle);
    assert.equal(detached.searchAfterMutation, detached.workingSearch);

    const saved = await downloadedJson(page, "#downloadJsonBtn");
    const savedEntry = saved.threadkeeper.entries.find(entry => entry.id === literalEntryId);
    const savedCandidate = saved.threadkeeper.nextCandidates.find(item => item.id === literalCandidateId);
    assert.equal(savedEntry.status, "needs_review");
    assert.equal(savedEntry.horizonPosition, "next");
    assert.equal(savedEntry.summary, literalSummary);
    assert.equal(savedCandidate.title, "Quoted <literal> continuation — reviewed");
    assert.equal(savedCandidate.reason, "Carry exact collaborator text into a reviewed continuation.");

    const liveJsonLd = JSON.parse(await page.locator("#jsonldGraph").textContent());
    const graphIdentifiers = liveJsonLd["@graph"].map(node => node["@id"]);
    const entryNode = liveJsonLd["@graph"].find(node => node["@id"] === compactJsonLdId("fg", literalEntryId));
    const candidateNode = liveJsonLd["@graph"].find(node => node["@id"] === compactJsonLdId("na", literalCandidateId));
    const continuityNode = liveJsonLd["@graph"].find(node => node["@id"] === "na:continuity-future-tie-latest");
    const supersedingNode = liveJsonLd["@graph"].find(node => node["@id"] === "fg:tk-entry-006");
    assert.equal(new Set(graphIdentifiers).size, graphIdentifiers.length);
    assert.ok(graphIdentifiers.every(identifier => !/[<>'"&\s]/.test(identifier)));
    assert.equal(entryNode["fg:status"], "needs_review");
    assert.equal(entryNode["na:horizonPosition"], "next");
    assert.equal(entryNode["schema:description"], literalSummary);
    assert.equal(candidateNode["schema:name"], "Quoted <literal> continuation — reviewed");
    assert.equal(candidateNode["schema:description"], "Carry exact collaborator text into a reviewed continuation.");
    assert.equal(continuityNode["na:continuityBand"], "threadbare");
    assert.equal(supersedingNode["ca:supersedes"]["@id"], "fg:tk-entry-007");

    await page.locator("#jsonImport").fill(JSON.stringify(saved));
    await page.locator("#importJsonBtn").click();
    assert.match(await page.locator("#importStatus").textContent(), /Ledger imported/);

    const invalid = structuredClone(saved);
    delete invalid.threadkeeper.nextCandidates[0].reason;
    await page.locator("#jsonImport").fill(JSON.stringify(invalid));
    await page.locator("#importJsonBtn").click();
    assert.match(await page.locator("#importStatus").textContent(), /Current ledger remains available/);
    const recovered = await page.evaluate(() => exportDocument());
    assert.deepEqual(recovered, saved);
    assert.equal(await page.locator('#reviewQueue [data-select-entry]').filter({ hasText: literalEntryTitle }).count(), 1);

    const duplicate = structuredClone(saved);
    duplicate.threadkeeper.entries[1].id = duplicate.threadkeeper.entries[0].id;
    await page.locator("#jsonImport").fill(JSON.stringify(duplicate));
    await page.locator("#importJsonBtn").click();
    assert.match(await page.locator("#importStatus").textContent(), /Current ledger remains available/);
    assert.deepEqual(await page.evaluate(() => exportDocument()), saved);

    const unnormalizedView = structuredClone(saved);
    unnormalizedView.viewState.selectedEntryId = "missing-entry";
    unnormalizedView.viewState.selectedCandidateId = "missing-candidate";
    unnormalizedView.viewState.filters = {
      search: 42,
      entryType: "unknown-entry-type",
      status: "unknown-status",
      horizon: "unknown-horizon"
    };
    await page.locator("#jsonImport").fill(JSON.stringify(unnormalizedView));
    await page.locator("#importJsonBtn").click();
    assert.match(await page.locator("#importStatus").textContent(), /Ledger imported/);
    const normalized = await page.evaluate(() => exportDocument());
    assert.equal(normalized.viewState.selectedEntryId, normalized.threadkeeper.entries[0].id);
    assert.equal(normalized.viewState.selectedCandidateId, "");
    assert.deepEqual(normalized.viewState.filters, { search: "", entryType: "all", status: "all", horizon: "all" });
    assert.equal(await page.locator("#ledgerBody tr").count(), normalized.threadkeeper.entries.length);
    assertTelemetry(telemetry);
  } finally {
    await context.close();
  }
}

const server = await startStaticServer();
const browser = await chromium.launch({ headless: true });
try {
  await verify("Narrative Capsule Composer · Strategy v2 import, edit, governed export, and recovery", () => composerPath(browser, server.origin));
  await verify("Narrative Capsule Composer · held-open readiness, reference closure, fingerprint, and JSON-LD", () => composerLifecyclePath(browser, server.origin));
  await verify("Semantic Sampling · candidate and run edit, browser round trip, export, and recovery", () => semanticPath(browser, server.origin));
  await verify("Semantic Sampling · active-run prompt contract and variant lineage", () => semanticPromptAndLineagePath(browser, server.origin));
  await verify("Semantic Sampling · exact exclusive normalization and minimum usable set", () => semanticNormalizationPath(browser, server.origin));
  await verify("Technology Fit · AI successor, browser round trip, export, and recovery", () => technologyPath(browser, server.origin));
  await verify("Technology Fit · rapid composition identity and collision-safe recovery", () => technologyCompositionIdentityPath(browser, server.origin));
  await verify("Technology Fit · decision synchronization and successor lineage", () => technologyDecisionAndLineagePath(browser, server.origin));
  await verify("Technology Fit · aligned successor exchange and minimum candidate boundary", () => technologySuccessorExchangePath(browser, server.origin));
  await verify("Threadkeeping Ledger · literal controls, chronology, detached exchange, JSON-LD, and recovery", () => threadkeepingPath(browser, server.origin));
} finally {
  await browser.close();
  await server.close();
}

for (const check of checks) {
  process.stdout.write(`${check.status === "passed" ? "PASS" : "FAIL"} ${check.label}\n`);
}
process.stdout.write(`Narrative Architecture browser contract: ${checks.length - failures.length}/${checks.length} passed.\n`);
if (failures.length) {
  process.stderr.write(`${failures.join("\n\n")}\n`);
  process.exitCode = 1;
}

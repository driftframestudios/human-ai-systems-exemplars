#!/usr/bin/env node
import './node-runtime-admission.mjs';

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "@playwright/test";
import Ajv2020 from "ajv/dist/2020.js";

import {
  assertTelemetry,
  monitor,
  repositoryRoot,
  startStaticServer
} from "./core-architecture-browser-helper.mjs";

const coreRoute = "core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-chimeric-prototype-v0.2.5.html";
const composerRoute = "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/narrative-capsule-composer/narrative-capsules-chimeric-prototype-v0.1.html";
const coreSchemaPath = resolve(
  repositoryRoot,
  "core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas.schema.json"
);
const compositionSchemaPath = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/narrative-capsule-composer/narrative-capsule-composition.schema.v0.1.json"
);

const json = async path => JSON.parse(await readFile(path, "utf8"));

function fnv1a32Utf8(value) {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(String(value))) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32-utf8:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function schemaValidator(schema) {
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictSchema: false, validateFormats: false });
  return ajv.compile(schema);
}

function assertValid(validate, value, label) {
  assert.equal(
    validate(value),
    true,
    `${label} should satisfy its source-owned schema: ${JSON.stringify(validate.errors || [])}`
  );
}

async function openPage(browser, origin, route) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const telemetry = monitor(page);
  await page.goto(`${origin}/${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  return { context, page, telemetry };
}

async function main() {
  const [coreSchema, compositionSchema] = await Promise.all([
    json(coreSchemaPath),
    json(compositionSchemaPath)
  ]);
  const validateCore = schemaValidator(coreSchema);
  const validateComposition = schemaValidator(compositionSchema);
  const server = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  let sourceText;
  let sourceArtifact;
  let sourceHash;

  try {
    const core = await openPage(browser, server.origin, coreRoute);
    try {
      await core.page.locator('[data-sc-role="chart"] svg').waitFor({ state: "visible" });
      const score = core.page.locator('[data-score-input="true"][data-dimension-id="goal-fidelity"][data-series="current"]');
      await score.fill("6");
      await score.press("Tab");

      const captured = await core.page.evaluate(() => ({
        serialized: window.strategyCanvasCanonical.serialize(),
        validation: window.strategyCanvasCanonical.getValidation(),
        visible: document.querySelector('[data-sc-role="json"]')?.textContent
      }));
      assert.deepEqual(captured.validation, { valid: true, errors: [] });
      assert.equal(captured.visible, captured.serialized, "the visible Core export should equal its public serializer");
      sourceText = captured.serialized;
      sourceArtifact = JSON.parse(sourceText);
      sourceHash = fnv1a32Utf8(JSON.stringify(sourceArtifact));
      assert.equal(sourceArtifact.dimensions[0].scores.current, 6);
      assertValid(validateCore, sourceArtifact, "edited Core Strategy Canvas export");
      assertTelemetry(core.telemetry);
    } finally {
      await core.context.close();
    }

    const receiver = await openPage(browser, server.origin, composerRoute);
    try {
      const initialText = await receiver.page.locator("#jsonPreview").textContent();
      const initial = JSON.parse(initialText);
      await receiver.page.locator("#importText").fill(sourceText);
      await receiver.page.locator('[data-action="import-json"]').click();
      assert.match(await receiver.page.locator("#importNotice").textContent(), /Composition imported with its declared adapter and review receipt/);

      const acceptedText = await receiver.page.locator("#jsonPreview").textContent();
      const accepted = JSON.parse(acceptedText);
      const receiverDimensions = accepted.strategy_canvas.dimensions;
      assert.ok(receiverDimensions.length > 0, "the receiving composition should retain a usable dimension set");
      assert.deepEqual(receiverDimensions.map(({ id }) => id), sourceArtifact.dimensions.map(({ id }) => id));
      assert.deepEqual(receiverDimensions.map(({ label }) => label), sourceArtifact.dimensions.map(({ label }) => label));
      assert.deepEqual(
        receiverDimensions.map(({ now, next, later }) => ({ now, next, later })),
        sourceArtifact.dimensions.map(({ scores }) => ({
          now: scores.current,
          next: scores.goodEnough,
          later: scores.desired
        }))
      );
      assert.deepEqual(accepted.artifact_identity, initial.artifact_identity, "Composer identity should remain receiver-owned");
      assert.notEqual(accepted.artifact_identity.id, sourceArtifact.meta.id);
      assert.deepEqual(accepted.strategy_canvas_adapter_receipt.sourceArtifactIdentity, {
        schemaVersion: sourceArtifact.schemaVersion,
        id: sourceArtifact.meta.id,
        revision: sourceArtifact.meta.revision
      });
      assert.equal(accepted.strategy_canvas_adapter_receipt.sourceContentHash, sourceHash);
      assertValid(validateComposition, accepted.composition, "governed Narrative composition");
      assertValid(validateCore, accepted.strategy_canvas_v2, "Narrative Strategy Canvas re-export");
      assert.deepEqual(
        accepted.strategy_canvas_v2.dimensions.map(({ id, scores }) => ({ id, scores })),
        sourceArtifact.dimensions.map(({ id, scores }) => ({ id, scores }))
      );
      assert.notEqual(accepted.strategy_canvas_v2.meta.id, sourceArtifact.meta.id);
      assert.deepEqual(
        accepted.strategy_canvas_v2.extensions.narrativeProjection.upstreamStrategyCanvasIdentity,
        accepted.strategy_canvas_adapter_receipt.sourceArtifactIdentity
      );
      assert.equal(
        accepted.strategy_canvas_v2.extensions.narrativeProjection.upstreamStrategyCanvasContentHash,
        sourceHash
      );

      const detached = await receiver.page.evaluate(() => {
        const first = buildExport();
        first.strategy_canvas_v2.dimensions[0].scores.current = -1;
        return buildExport().strategy_canvas_v2.dimensions[0].scores.current;
      });
      assert.equal(detached, sourceArtifact.dimensions[0].scores.current, "exported projections should remain detached from Composer state");

      const firstControl = receiver.page.locator('[data-dim-field="next"]').first();
      const acceptedControlValue = await firstControl.inputValue();
      const incompatible = structuredClone(sourceArtifact);
      delete incompatible.meta;
      incompatible.dimensions[0].label = "Changed only inside the rejected candidate";
      incompatible.dimensions[0].scores.current = 1;
      assert.equal(validateCore(incompatible), false, "the incompatible case should fail the Core-owned schema before exchange");

      await receiver.page.locator("#importText").fill(JSON.stringify(incompatible));
      await receiver.page.locator('[data-action="import-json"]').click();
      assert.match(
        await receiver.page.locator("#importNotice").textContent(),
        /Current composition is still available\. Review the import: Strategy Canvas 2\.0 source contract mismatch.*\$\.meta is required/i
      );
      assert.equal(await receiver.page.locator("#jsonPreview").textContent(), acceptedText);
      assert.equal(await firstControl.inputValue(), acceptedControlValue);
      assert.equal(await firstControl.isEnabled(), true, "recovery should retain an operable composition control");
      assertTelemetry(receiver.telemetry);
    } finally {
      await receiver.context.close();
    }

    process.stdout.write(`passed Core Strategy Canvas v2 → Narrative Composer exchange · ${sourceHash}\n`);
    process.stdout.write("passed incompatible claimed-v2 recovery with accepted composition retained\n");
    process.stdout.write("2/2 cross-prototype exchange contracts passed\n");
  } finally {
    await browser.close();
    await server.close();
  }
}

await main();

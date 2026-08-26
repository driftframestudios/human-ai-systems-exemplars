import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const composerRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/narrative-capsule-composer"
);
const strategyCanvasValidatorPath = resolve(
  repositoryRoot,
  "core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-validator.js"
);

async function loadAdapter() {
  const context = vm.createContext({ console, structuredClone, TextEncoder });
  const validatorSource = await readFile(strategyCanvasValidatorPath, "utf8");
  vm.runInContext(validatorSource, context, { filename: "strategy-canvas-validator.js" });
  const source = await readFile(
    resolve(composerRoot, "strategy-canvas-v2-adapter.js"),
    "utf8"
  );
  vm.runInContext(source, context, { filename: "strategy-canvas-v2-adapter.js" });
  return context.StrategyCanvasNarrativeAdapter;
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test("adapter dialect detection keeps supported and open inputs distinct", async () => {
  const Adapter = await loadAdapter();

  assert.equal(Adapter.detectDialect({ schemaVersion: "strategy-canvas/2.0" }), "strategy-canvas/2.0");
  assert.equal(Adapter.detectDialect({ strategyDimensions: [] }), "narrative-composer/0.1");
  assert.equal(Adapter.detectDialect({ strategy_canvas: { dimensions: [] } }), "narrative-projection/0.1");
  assert.equal(Adapter.detectDialect({ dimensions: [] }), "unknown");
});

test("Composer mapping normalizes literal text, IDs, actions, bounds, and steps", async () => {
  const Adapter = await loadAdapter();
  const composer = {
    artifactIdentity: {
      id: "123 Unsafe Identity",
      displayName: "  Projection\r\nName\u0000  "
    },
    capsuleEnvelope: {
      capsuleId: "na:capsules/material-example",
      capsuleVersion: "0.1",
      currentContractRef: "na:contract/material-example/v0.1"
    },
    strategyDimensions: [
      {
        id: "shared-id",
        label: "Café\r\n<script>literal</script>\u0000",
        now: -2,
        next: 5.6,
        later: 200,
        consequenceWeight: 8,
        action: "unexpected"
      },
      {
        id: "shared-id",
        label: "Second",
        now: 2,
        next: 4,
        later: 8,
        consequenceWeight: 2,
        action: "raise"
      }
    ]
  };
  const before = JSON.stringify(composer);

  const result = Adapter.toStrategyCanvasV2(composer);

  assert.equal(JSON.stringify(composer), before, "mapping keeps source input intact");
  assert.equal(result.meta.id, "na-capsules-material-example");
  assert.equal(result.meta.title, "Projection\nName");
  assert.equal(result.dimensions[0].label, "Café\n<script>literal</script>");
  assert.deepEqual(plain(result.dimensions[0].scores), {
    current: 0,
    goodEnough: 6,
    desired: 10
  });
  assert.equal(result.dimensions[0].consequenceWeight, 5);
  assert.equal(result.dimensions[0].action, "open");
  assert.deepEqual(result.dimensions.map(({ id }) => id), ["shared-id", "shared-id-2"]);
  assert.equal(result.extensions.narrativeProjection.migrationReceipt.reviewRequired, true);
});

test("Composer and Strategy Canvas mappings preserve declared dimensions with a review receipt", async () => {
  const Adapter = await loadAdapter();
  const composer = JSON.parse(
    await readFile(
      resolve(composerRoot, "expectation-opportunity-to-strategy-canvas.example.v0.1.json"),
      "utf8"
    )
  );
  const before = JSON.stringify(composer);

  const strategy = Adapter.toStrategyCanvasV2(composer);
  const returned = Adapter.fromStrategyCanvasV2(strategy);

  assert.equal(JSON.stringify(composer), before);
  assert.equal(strategy.schemaVersion, "strategy-canvas/2.0");
  assert.equal(strategy.dimensions.length, composer.strategyDimensions.length);
  assert.deepEqual(
    strategy.dimensions.map(({ id }) => id),
    composer.strategyDimensions.map(({ id }) => id)
  );
  assert.deepEqual(
    returned.strategyDimensions.map(({ id, now, next, later, action }) => ({ id, now, next, later, action })),
    composer.strategyDimensions.map(({ id, now, next, later, action }) => ({ id, now, next, later, action }))
  );
  assert.equal(returned.adapterReceipt.sourceDialect, "strategy-canvas/2.0");
  assert.equal(returned.adapterReceipt.targetDialect, "narrative-composer/0.1");
  assert.equal(returned.adapterReceipt.reviewRequired, true);
  assert.deepEqual(plain(returned.adapterReceipt.sourceArtifactIdentity), {
    schemaVersion: "strategy-canvas/2.0",
    id: strategy.meta.id,
    revision: strategy.meta.revision
  });
  assert.match(returned.adapterReceipt.sourceContentHash, /^fnv1a32-utf8:[0-9a-f]{8}$/);

  const projectedAgain = Adapter.toStrategyCanvasV2({
    ...composer,
    strategyCanvasAdapterReceipt: returned.adapterReceipt
  });
  assert.deepEqual(
    plain(projectedAgain.extensions.narrativeProjection.upstreamStrategyCanvasIdentity),
    plain(returned.adapterReceipt.sourceArtifactIdentity)
  );
  assert.equal(
    projectedAgain.extensions.narrativeProjection.upstreamStrategyCanvasContentHash,
    returned.adapterReceipt.sourceContentHash
  );
});

test("Strategy Canvas imports require a valid named v2 artifact boundary", async () => {
  const Adapter = await loadAdapter();

  assert.throws(
    () => Adapter.fromStrategyCanvasV2({ schemaVersion: "strategy-canvas/1.0", dimensions: [] }),
    /Strategy Canvas 2\.0 artifact/
  );

  const valid = Adapter.toStrategyCanvasV2({
    artifactIdentity: { id: "narrative-source", displayName: "Narrative source" },
    strategyDimensions: [{ id: "fit", label: "Fit", now: 2, next: 5, later: 8 }]
  });
  const claimedV2 = structuredClone(valid);
  delete claimedV2.meta;
  claimedV2.dimensions[0].label = "Changed only inside the rejected candidate";

  assert.throws(
    () => Adapter.fromStrategyCanvasV2(claimedV2),
    /source contract mismatch.*\$\.meta is required/i
  );
});

test("Strategy Canvas imports follow declared order within the current Narrative scale", async () => {
  const Adapter = await loadAdapter();
  const strategy = Adapter.toStrategyCanvasV2({
    artifactIdentity: { id: "ordered-source", displayName: "Ordered source" },
    strategyDimensions: [
      { id: "first", label: "First", now: 2, next: 5, later: 8 },
      { id: "second", label: "Second", now: 3, next: 6, later: 9 }
    ]
  });
  strategy.view.dimensionOrder = ["second", "first"];
  strategy.view.selectedDimensionId = "second";

  const mapped = Adapter.fromStrategyCanvasV2(strategy);
  assert.deepEqual(mapped.strategyDimensions.map(({ id }) => id), ["second", "first"]);

  const alternateScale = structuredClone(strategy);
  alternateScale.scale.max = 20;
  assert.throws(
    () => Adapter.fromStrategyCanvasV2(alternateScale),
    /current Narrative mapping accepts a Strategy Canvas scale of 0–10 in steps of 1/i
  );
});

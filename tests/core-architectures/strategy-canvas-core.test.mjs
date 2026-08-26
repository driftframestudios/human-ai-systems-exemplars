import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const coreRoot = resolve(
  repositoryRoot,
  "core-architectures-chimeric-prototype-current-pack-v0.1"
);
const contextCoreRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1"
);
const systemRoot = resolve(coreRoot, "strategy-canvas-system-v0.2");

async function loadStrategyCanvasCore() {
  const context = vm.createContext({ console, structuredClone });
  const validatorSource = await readFile(
    resolve(systemRoot, "strategy-canvas-validator.js"),
    "utf8"
  );
  const coreSource = await readFile(
    resolve(systemRoot, "strategy-canvas-core.js"),
    "utf8"
  );
  vm.runInContext(validatorSource, context, {
    filename: "strategy-canvas-validator.js"
  });
  vm.runInContext(coreSource, context, {
    filename: "strategy-canvas-core.js"
  });
  return context.StrategyCanvasCore;
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test("Strategy Canvas default state satisfies its published contract", async () => {
  const Core = await loadStrategyCanvasCore();
  const result = Core.validateState(Core.defaultState);

  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(Core.defaultState.schemaVersion, "strategy-canvas/2.0");
  assert.equal(Core.defaultState.dimensions.length, 6);
});

test("normalization preserves its input and resolves values at declared boundaries", async () => {
  const Core = await loadStrategyCanvasCore();
  const input = plain(Core.defaultState);
  input.scale = { ...input.scale, min: 1, max: 9, step: 2 };
  input.dimensions[0].scores = {
    current: -40,
    goodEnough: 5.4,
    desired: 100
  };
  input.dimensions[0].consequenceWeight = 99;
  input.dimensions[0].action = "unpublished-action";
  input.extensions.materialExample = { source: "core-unit-case" };
  const before = JSON.stringify(input);

  const normalized = Core.normalizeState(input);

  assert.equal(JSON.stringify(input), before, "normalization keeps the caller's object intact");
  assert.deepEqual(plain(normalized.dimensions[0].scores), {
    current: 1,
    goodEnough: 5,
    desired: 9
  });
  assert.equal(normalized.dimensions[0].consequenceWeight, 5);
  assert.equal(normalized.dimensions[0].action, "open");
  assert.deepEqual(plain(normalized.extensions.materialExample), {
    source: "core-unit-case"
  });
});

test("representative v1 migration preserves view order and extension data", async () => {
  const Core = await loadStrategyCanvasCore();
  const legacy = {
    artifact_identity: {
      id: "legacy-strategy",
      display_name: "Legacy Strategy Canvas"
    },
    score_scale: { min: 0, max: 10, step: 1 },
    strategy_canvas: {
      dimensions: [
        { id: "second", label: "Second", current_score: 3 },
        { id: "first", label: "First", current_score: 7 }
      ]
    },
    view_state: {
      active_view_id: "working-view",
      views: [
        {
          id: "working-view",
          dimension_order: ["first", "second"],
          selected_dimension_id: "first"
        }
      ]
    },
    extensions: { materialExample: { standing: "preserved" } }
  };
  const before = JSON.stringify(legacy);

  const migrated = Core.migrateV1(legacy);

  assert.equal(JSON.stringify(legacy), before);
  assert.equal(migrated.schemaVersion, "strategy-canvas/2.0");
  assert.deepEqual(plain(migrated.view.dimensionOrder), ["first", "second"]);
  assert.equal(migrated.view.selectedDimensionId, "first");
  assert.deepEqual(plain(migrated.extensions.materialExample), {
    standing: "preserved"
  });
});

test("reducer transitions retain stable IDs and explicit lifecycle movement", async () => {
  const Core = await loadStrategyCanvasCore();
  let state = Core.normalizeState(Core.defaultState);

  state = Core.reducer(state, Core.actions.dimensionAdd({
    id: "new-signal",
    label: "New signal"
  }));
  assert.equal(state.view.selectedDimensionId, "new-signal");
  assert.equal(state.dimensions.at(-1).id, "new-signal");

  state = Core.reducer(
    state,
    Core.actions.dimensionUpdate("new-signal", {
      label: "Revised signal",
      scores: { current: 6 }
    })
  );
  assert.equal(state.dimensions.at(-1).id, "new-signal");
  assert.equal(state.dimensions.at(-1).label, "Revised signal");
  assert.equal(state.dimensions.at(-1).scores.current, 6);

  state = Core.reducer(state, Core.actions.dimensionMove("new-signal", -1));
  assert.equal(state.view.dimensionOrder.at(-2), "new-signal");

  state = Core.reducer(
    state,
    Core.actions.lifecycleReview("Review steward", "Representative review", "2026-08-26T00:00:00.000Z")
  );
  assert.equal(state.lifecycle.status, "reviewed");
  assert.equal(state.lifecycle.reviewedAt, "2026-08-26T00:00:00.000Z");
  assert.equal(state.lifecycle.reviewedSnapshot.dimensions.length, state.dimensions.length);

  const beforeSerialization = JSON.stringify(state);
  const serialized = Core.serialize(state);
  assert.equal(JSON.stringify(state), beforeSerialization);
  assert.equal(JSON.parse(serialized).lifecycle.reviewedAt, "2026-08-26T00:00:00.000Z");

  state = Core.reducer(state, Core.actions.lifecycleReopen());
  assert.equal(state.lifecycle.status, "working");
  assert.equal(state.meta.revision, 2);

  state = Core.reducer(state, Core.actions.dimensionRemove("new-signal"));
  assert.equal(state.dimensions.some(({ id }) => id === "new-signal"), false);
  assert.equal(state.view.dimensionOrder.includes("new-signal"), false);
});

test("store observations are detached from internal mutation authority", async () => {
  const Core = await loadStrategyCanvasCore();
  const store = Core.createStore(Core.defaultState, { historyLimit: 4 });
  const firstReading = store.getState();
  firstReading.meta.title = "External mutation";
  assert.equal(store.getState().meta.title, "Strategy Canvas");

  const listenerReadings = [];
  store.subscribe((state) => {
    listenerReadings.push(state);
    state.meta.title = "Listener mutation";
  });

  const dispatchReading = store.dispatch(
    Core.actions.metaUpdate({ title: "Reviewed title" })
  );
  dispatchReading.meta.title = "Dispatch mutation";
  assert.equal(store.getState().meta.title, "Reviewed title");
  assert.equal(listenerReadings[0].meta.title, "Listener mutation");
  assert.equal(store.canUndo(), true);

  const undoReading = store.undo();
  undoReading.meta.title = "Undo mutation";
  assert.equal(store.getState().meta.title, "Strategy Canvas");
  assert.equal(store.canRedo(), true);

  const redoReading = store.redo();
  redoReading.meta.title = "Redo mutation";
  assert.equal(store.getState().meta.title, "Reviewed title");
});

test("aggregation and selectors retain declared order and numeric standing", async () => {
  const Core = await loadStrategyCanvasCore();
  const state = Core.normalizeState(Core.defaultState);
  const reversed = Core.reducer(state, Core.actions.dimensionMove("goal-fidelity", 5));

  assert.equal(Core.selectors.orderedDimensions(reversed).at(-1).id, "goal-fidelity");
  assert.equal(Core.selectors.selectedDimension(reversed).id, "goal-fidelity");
  assert.deepEqual(plain(Core.aggregate([8, "4", null, "open", 6])), {
    count: 3,
    mean: 6,
    median: 6,
    min: 4,
    max: 8,
    range: 4
  });
});

test("Core manifests resolve current files, byte counts, and published digests", async (t) => {
  const manifestPaths = [
    resolve(coreRoot, "core-architectures-chimeric-prototype-manifest-v0.1.json"),
    resolve(contextCoreRoot, "core-architectures-chimeric-prototype-manifest-v0.1.json")
  ];

  for (const manifestPath of manifestPaths) {
    await t.test(manifestPath.slice(repositoryRoot.length + 1), async () => {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      const byId = new Map(manifest.prototypes.map((entry) => [entry.id, entry]));
      const currentIdentities = {
        "impact-map": ["impact-map-chimeric-prototype-v0.1.1.html", "0.1.1"],
        "service-design-blueprint": ["service-design-blueprint-chimeric-prototype-v0.2.html", "0.2"],
        "heart-chart": ["heart-chart-chimeric-prototype-v0.1.2.html", "0.1.2"],
        "specification-by-example": ["specification-by-example-chimeric-prototype-v0.1.1.html", "0.1.1"]
      };
      for (const [id, identity] of Object.entries(currentIdentities)) {
        const entry = byId.get(id);
        assert.deepEqual([entry.file, entry.version], identity, `${id} current identity`);
        const source = await readFile(resolve(dirname(manifestPath), entry.file), "utf8");
        const embeddedVersion = new RegExp(
          `version\\s*:\\s*['"]${entry.version.replaceAll(".", "\\.")}['"]`
        );
        assert.match(source, embeddedVersion, `${id} embeds version ${entry.version}`);
      }

      for (const entry of manifest.prototypes) {
        const artifactPath = resolve(dirname(manifestPath), entry.file);
        assert.equal(existsSync(artifactPath), true, `${entry.id} resolves ${entry.file}`);
        const bytes = await readFile(artifactPath);
        if (entry.size_bytes !== undefined) {
          assert.equal(entry.size_bytes, (await stat(artifactPath)).size, `${entry.id} byte count`);
        }
        if (entry.sha256) {
          assert.equal(
            entry.sha256,
            createHash("sha256").update(bytes).digest("hex"),
            `${entry.id} SHA-256`
          );
        }
      }
    });
  }
});

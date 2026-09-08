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
const promptCapsuleExamplePath = resolve(
  repositoryRoot,
  "prompt-capsules/0.1.0/examples/strategy-canvas.md"
);
const collaborationGuidePath = resolve(
  repositoryRoot,
  "schemas/collaboration/index.html"
);

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

test("Prompt Capsule views share one deterministic state coordinate and checked plain example", async () => {
  const Core = await loadStrategyCanvasCore();
  const plainMarkdown = Core.promptCapsuleMarkdown(Core.defaultState, { view: "plain" });
  const assistedMarkdown = Core.promptCapsuleMarkdown(Core.defaultState, {
    view: "skill-assisted"
  });
  const checkedExample = await readFile(promptCapsuleExamplePath, "utf8");
  const collaborationGuide = await readFile(collaborationGuidePath, "utf8");
  const fingerprint = Core.promptCapsuleFingerprint(Core.defaultState);

  assert.equal(Core.version, "0.2.4");
  assert.equal(Core.promptCapsuleContract, "prompt-capsule/0.1.0");
  assert.equal(Core.promptCapsule(Core.defaultState), plainMarkdown);
  assert.equal(checkedExample, plainMarkdown);
  assert.match(plainMarkdown, /^# Prompt Capsule: Strategy Canvas\n/u);
  assert.match(plainMarkdown, /- View: `plain`/u);
  assert.match(plainMarkdown, /People retain decisions about handoff scope, interpretation, acceptance, and publication\./u);
  assert.match(plainMarkdown, /Return a Markdown review note grouped by stable dimension ID\./u);
  assert.match(plainMarkdown, /## Related loops/u);
  assert.doesNotMatch(plainMarkdown, /## Skill assistance/u);
  assert.match(assistedMarkdown, /- View: `skill-assisted`/u);
  assert.match(assistedMarkdown, /## Related loops/u);
  assert.ok(plainMarkdown.includes("- Fingerprint: `" + fingerprint + "`"));
  assert.ok(assistedMarkdown.includes("- Fingerprint: `" + fingerprint + "`"));

  const relatedLoops = [
    [
      "repository-reentry",
      "https://schemas.radiantnull.com/collaboration/#repository-reentry",
      "Use when this versioned canvas carries a named question or requested change into resumed repository work"
    ],
    [
      "public-release",
      "https://schemas.radiantnull.com/collaboration/#public-release",
      "Use after people accept this canvas revision as source for a public artifact"
    ]
  ];
  assert.deepEqual(
    plain(Core.promptCapsuleRelatedLoops.map(({ id, publicUrl }) => [id, publicUrl])),
    relatedLoops.map(([id, publicUrl]) => [id, publicUrl])
  );
  for (const [loopId, publicUrl, fitCondition] of relatedLoops) {
    assert.match(collaborationGuide, new RegExp(`id=["']${loopId}["']`, "u"));
    for (const markdown of [plainMarkdown, assistedMarkdown]) {
      assert.ok(markdown.includes(`- \`${loopId}\` — [`));
      assert.ok(markdown.includes(`](${publicUrl})`));
      assert.ok(markdown.includes(`- Fit condition: ${fitCondition}`));
    }
  }
  for (const unrelatedLoopId of ["skill-from-receiving-use", "visitor-surface-change"]) {
    assert.doesNotMatch(plainMarkdown, new RegExp(`#${unrelatedLoopId}`, "u"));
    assert.doesNotMatch(assistedMarkdown, new RegExp(`#${unrelatedLoopId}`, "u"));
  }
  assert.ok(
    plainMarkdown.indexOf("## Requested return") < plainMarkdown.indexOf("## Related loops")
      && plainMarkdown.indexOf("## Related loops") < plainMarkdown.indexOf("## Evidence and recovery"),
    "Related loops should keep the contract-defined section order"
  );
  assert.ok(
    assistedMarkdown.indexOf("## Evidence and recovery") < assistedMarkdown.indexOf("## Skill assistance"),
    "Skill assistance should remain an addition after the shared capsule sections"
  );

  const skillRevision = "058469145696009485aa68c089f424b00adc10ae";
  const skillCoordinates = [
    [
      "stateful-artifact-behavior-contracts",
      ".agents/skills/stateful-artifact-behavior-contracts/SKILL.md",
      "596f139100a448139c7c4ceb2dc6d1b470dc86ff19df4ed68a9ac765005f576a"
    ],
    [
      "source-authority-mapping",
      ".agents/skills/source-authority-mapping/SKILL.md",
      "706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5"
    ],
    [
      "bounded-support-routing",
      ".agents/skills/bounded-support-routing/SKILL.md",
      "80dff2f88bc919500d9557a0ff67210e68cbdf1c69bbe63ac29b93662f9bd402"
    ]
  ];
  for (const [skillName, skillPath, skillSha256] of skillCoordinates) {
    assert.match(assistedMarkdown, new RegExp(skillPath.replaceAll(".", "\\.")));
    assert.match(
      assistedMarkdown,
      new RegExp(`https://schemas\\.radiantnull\\.com/skills/${skillName}/`)
    );
    assert.ok(assistedMarkdown.includes(skillSha256));
  }
  assert.doesNotMatch(assistedMarkdown, /github\.com\/driftframestudios/u);
  assert.equal((assistedMarkdown.match(new RegExp(skillRevision, "gu")) || []).length, 3);
});

test("minimum Prompt Capsule state self-roundtrips, agrees with represented state, and escapes GFM structure", async () => {
  const Core = await loadStrategyCanvasCore();
  const source = plain(Core.defaultState);
  source.meta.title = "Literal <title> [link](https://example.invalid) @mention ~~change~~ www.example.invalid #42";
  source.scale = {
    min: 1,
    max: 100,
    step: 1,
    lowLabel: "Emerging *cue*",
    middleLabel: "Partial | cue",
    highLabel: "Consistent <cue>"
  };
  source.dimensions = [{
    ...source.dimensions[0],
    label: "One <img src=x> [linked](https://example.invalid) *dimension*",
    definition: "A | bounded _definition_",
    scores: { current: 40, goodEnough: 70, desired: 90 }
  }];
  source.view.dimensionOrder = [source.dimensions[0].id];
  source.view.selectedDimensionId = source.dimensions[0].id;
  const minimum = Core.normalizeState(source);
  const markdown = Core.promptCapsule(minimum);
  const restored = Core.normalizeState(JSON.parse(Core.serialize(minimum)));

  for (const heading of [
    "## Purpose and target",
    "## Relevant context and inputs",
    "## Working state",
    "## Boundaries and human-held decisions",
    "## Requested return",
    "## Evidence and recovery"
  ]) assert.match(markdown, new RegExp(heading));
  assert.equal(restored.dimensions.length, 1);
  assert.equal(Core.promptCapsule(restored), markdown);
  assert.equal(Core.promptCapsuleFingerprint(restored), Core.promptCapsuleFingerprint(minimum));
  assert.match(markdown, /Scale: minimum `1`; maximum `100`; step `1`/u);
  assert.ok(markdown.includes("low: Emerging \\*cue\\*; middle: Partial \\| cue; high: Consistent &lt;cue&gt;"));
  assert.match(markdown, /current `40`; good enough `70`; desired `90`/u);
  assert.doesNotMatch(markdown, /<img src=x>/u);
  assert.match(markdown, /&lt;img src=x&gt;/u);
  assert.ok(markdown.includes("\\[linked\\](https\\://example.invalid)"));
  assert.ok(markdown.includes("\\@mention \\~\\~change\\~\\~ www\\.example.invalid \\#42"));
  const sourceAuthoredLines = markdown
    .split("\n")
    .filter((line) => line.startsWith("# Prompt Capsule:") || line.startsWith("### One"))
    .join("\n");
  assert.doesNotMatch(sourceAuthoredLines, /https?:\/\//u);
  assert.doesNotMatch(sourceAuthoredLines, /(?<!\\)@mention/u);
  assert.doesNotMatch(sourceAuthoredLines, /(?<!\\)~~/u);
  assert.match(markdown, /A \\\| bounded \\_definition\\_/u);

  const edited = Core.reducer(minimum, Core.actions.scoreSet(minimum.dimensions[0].id, "current", 41));
  assert.notEqual(Core.promptCapsuleFingerprint(edited), Core.promptCapsuleFingerprint(minimum));
  assert.match(Core.promptCapsule(edited), /current `41`; good enough `70`; desired `90`/u);
});

test("Prompt Capsule fingerprint carries represented state and leaves transient or private state silent", async () => {
  const Core = await loadStrategyCanvasCore();
  const baseline = plain(Core.defaultState);
  const baselineMarkdown = Core.promptCapsule(baseline);
  const baselineFingerprint = Core.promptCapsuleFingerprint(baseline);

  const anotherSelection = plain(baseline);
  anotherSelection.view.selectedDimensionId = anotherSelection.dimensions[1].id;
  assert.equal(Core.promptCapsule(anotherSelection), baselineMarkdown);
  assert.equal(Core.promptCapsuleFingerprint(anotherSelection), baselineFingerprint);

  const privateExtensionA = plain(baseline);
  privateExtensionA.extensions.privateReview = { approved: false, note: "held locally" };
  const privateExtensionB = plain(baseline);
  privateExtensionB.extensions.privateReview = { note: "held locally", approved: true };
  assert.equal(Core.promptCapsule(privateExtensionA), baselineMarkdown);
  assert.equal(Core.promptCapsule(privateExtensionB), baselineMarkdown);
  assert.equal(Core.promptCapsuleFingerprint(privateExtensionA), baselineFingerprint);
  assert.equal(Core.promptCapsuleFingerprint(privateExtensionB), baselineFingerprint);
  assert.equal(Object.hasOwn(Core.promptCapsuleStateProjection(privateExtensionA), "extensions"), false);
  assert.equal(Object.hasOwn(Core.promptCapsuleStateProjection(privateExtensionA), "relatedLoops"), false);
  assert.equal(Object.hasOwn(Core.promptCapsuleStateProjection(privateExtensionA), "view"), false);

  const sharedScope = plain(baseline);
  sharedScope.extensions.contextCanvas = {
    collaboration: { session: { includeReviewedStateInAI: true } },
    aiCollaboration: {
      consentScope: ["reviewed-scores"],
      reviewedRevision: 1,
      networkPolicy: "local-only"
    }
  };
  const sharedMarkdown = Core.promptCapsule(sharedScope);
  assert.notEqual(sharedMarkdown, baselineMarkdown);
  assert.notEqual(Core.promptCapsuleFingerprint(sharedScope), baselineFingerprint);
  assert.match(sharedMarkdown, /Reviewed fields in scope: reviewed-scores/u);
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
        "core-architecture-family-index": ["core-architecture-family-index-chimeric-prototype-v0.1.4.html", "0.1.4"],
        "impact-map": ["impact-map-chimeric-prototype-v0.1.5.html", "0.1.5"],
        "strategy-canvas": dirname(manifestPath) === coreRoot
          ? ["strategy-canvas-chimeric-prototype-v0.2.4.html", "0.2.4"]
          : ["strategy-canvas-chimeric-prototype-v0.2.2.html", "0.2.2"],
        "service-design-blueprint": ["service-design-blueprint-chimeric-prototype-v0.2.4.html", "0.2.4"],
        "heart-chart": ["heart-chart-chimeric-prototype-v0.1.6.html", "0.1.6"],
        "plus-delta": ["plus-delta-chimeric-prototype-v0.1.4.html", "0.1.4"],
        "practitioner-judgment-probes": ["practitioner-judgment-probes-chimeric-prototype-v0.1.4.html", "0.1.4"],
        "specification-by-example": ["specification-by-example-chimeric-prototype-v0.1.6.html", "0.1.6"]
      };
      for (const [id, identity] of Object.entries(currentIdentities)) {
        const entry = byId.get(id);
        assert.deepEqual([entry.file, entry.version], identity, `${id} current identity`);
        const source = await readFile(resolve(dirname(manifestPath), entry.file), "utf8");
        if (id === "strategy-canvas" && dirname(manifestPath) === contextCoreRoot) {
          assert.match(source, /<title>Strategy Canvas Collaboration Field v0\.2\.2<\/title>/u);
        } else {
          const embeddedVersion = new RegExp(
            `['"]?version['"]?\\s*:\\s*['"]${entry.version.replaceAll(".", "\\.")}['"]`
          );
          assert.match(source, embeddedVersion, `${id} embeds version ${entry.version}`);
        }
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

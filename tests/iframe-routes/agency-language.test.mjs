import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const coreRoot = resolve(repositoryRoot, "core-architectures-chimeric-prototype-current-pack-v0.1");
const contextRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1",
);

async function text(...segments) {
  return readFile(resolve(repositoryRoot, ...segments), "utf8");
}

test("current Core copies describe source authority and self-contained handoffs directly", async () => {
  const indexFile = "core-architectures-chimeric-prototype-pack-index-v0.1.4.html";
  const [coreIndex, contextIndex] = await Promise.all([
    readFile(resolve(coreRoot, indexFile), "utf8"),
    readFile(resolve(contextRoot, indexFile), "utf8"),
  ]);
  for (const index of [coreIndex, contextIndex]) {
    assert.match(index, /Each prototype’s JSON, JSON-LD, and view state remain the source authority; this file is the index\./u);
    assert.doesNotMatch(index, /JSON-LD, or view state inside each prototype remains ground truth/u);
  }

  const contexts = new Map([
    ["first-responsible-version-matrix-chimeric-prototype-v0.1.4.html", "threshold"],
    ["shared-surface-priority-map-chimeric-prototype-v0.1.4.html", "shared-surface"],
    ["service-design-blueprint-chimeric-prototype-v0.2.6.html", "service-topology"],
    ["ai-systems-service-blueprint-chimeric-prototype-v0.1.5.html", "topology"],
    ["software-architecture-views-chimeric-prototype-v0.1.4.html", "architecture"],
    ["participatory-design-kit-chimeric-prototype-v0.1.4.html", "participatory"],
    ["specification-by-example-chimeric-prototype-v0.1.7.html", "behavior-example"],
    ["upstream-revision-loop-chimeric-prototype-v0.1.5.html", "revision"],
  ]);
  for (const [file, context] of contexts) {
    const [source, projection] = await Promise.all([
      readFile(resolve(coreRoot, file), "utf8"),
      readFile(resolve(contextRoot, file), "utf8"),
    ]);
    for (const html of [source, projection]) {
      assert.match(html, new RegExp(`Plain Markdown is a self-contained handoff with the complete ${context} context\\.`, "u"));
      assert.doesNotMatch(html, /Plain Markdown carries the complete .*without asking the receiver/u);
    }
  }

  const strategy = await readFile(resolve(coreRoot, "strategy-canvas-chimeric-prototype-v0.2.5.html"), "utf8");
  assert.match(strategy, /Plain Markdown is a self-contained handoff with the complete working context\./u);
});

test("orientation prototypes name the action and restored review state", async () => {
  const files = [
    ["poda-chimeric-prototype-v0.1.5.html", /translates product-market and self-proclamatory language into project-orientation terms/u],
    ["alignment-worksheet-chimeric-prototype-v0.1.4.html", /use generated support while keeping suggestion, source evidence, and accepted interpretation distinct/u],
  ];
  for (const [file, expected] of files) {
    for (const root of [coreRoot, contextRoot]) assert.match(await readFile(resolve(root, file), "utf8"), expected);
  }

  const alignment = await readFile(resolve(coreRoot, files[1][0]), "utf8");
  assert.match(alignment, /AI-generated boundaries and source provenance need claim-level visibility\./u);
  assert.match(alignment, /Which blank needs revision to bring the restored state into reach\?/u);
  assert.doesNotMatch(alignment, /not yet visible enough|did not yet include|not only faster review|without immediate reframing|without confusing suggestion/u);
});

test("Canvas prototypes name records, outputs, flags, and proposal-system actions", async () => {
  const [lims, studio, gallery, belief] = await Promise.all([
    text("collaboration/lims-eln-program-constellation/index.html"),
    text("collaboration/initiative-costing-calculator/index.html"),
    text("collaboration/about-ai-method-gallery/index.html"),
    text("collaboration/context-tree-visual-variants/who-to-believe-presentation.html"),
  ]);

  assert.match(lims, /audit events and credential-rotation records retain references or redacted metadata/u);
  assert.match(studio, /AI-system outputs routed to named human receivers/u);
  assert.match(studio, /Source-linked readouts/u);
  assert.doesNotMatch(studio, />Human–AI collaboration map<|>Direct receipts</u);
  assert.match(gallery, /the detector flags an anomalous event for inspection/u);
  assert.match(belief, /The proposal system assembles candidate explanations or methods for human inspection\./u);
  assert.match(belief, /safety review record/u);
  assert.doesNotMatch(belief, /Which candidate explanation or method should be proposed|safety receipt/u);
});

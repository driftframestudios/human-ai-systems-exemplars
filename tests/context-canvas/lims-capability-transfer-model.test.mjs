import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);
const modelPath = resolve(
  repositoryRoot,
  "context-canvas-project-surface/img/plot/lims_eln_capability_transfer_model.svg",
);

test("the LIMS Debrief owns an engagement-specific capability-transfer model", async () => {
  const html = await readFile(resolve(canvasRoot, "fmi-lims-eln-replatforming.html"), "utf8");

  assert.match(html, /href="\.\.\/img\/plot\/lims_eln_capability_transfer_model\.svg"/u);
  assert.match(html, /src="\.\.\/img\/plot\/lims_eln_capability_transfer_model\.svg"/u);
  assert.doesNotMatch(
    html,
    /a3-stacked-cube-four-state-v0\.1\.svg/u,
    "the LIMS reading should use its own laboratory chronology",
  );
  assert.match(html, /all candidate vendors were rated/iu);
  assert.match(html, /production authority transfer/iu);
});

test("the stacked-cube model distinguishes correction, selection, and completed transfer", async () => {
  const svg = await readFile(modelPath, "utf8");

  assert.match(svg, /role="img" aria-labelledby="lims-transfer-title lims-transfer-desc"/u);
  assert.match(svg, /<title id="lims-transfer-title">[^<]+<\/title>/u);
  assert.match(svg, /<desc id="lims-transfer-desc">[^<]+<\/desc>/u);
  assert.match(svg, /01 · OBSERVED BASELINE/u);
  assert.match(svg, /02 · PARTICIPANT CORRECTION/u);
  assert.match(svg, /03 · DEMO \+ SELECTION/u);
  assert.match(svg, /04 · COMPLETED TRANSFER/u);
  assert.match(svg, /System Usability Scale/u);
  assert.match(svg, /all candidates rated · vendor selected/u);
  assert.match(svg, /NEW LIMS \/ ELN · PRODUCTION/u);
  assert.doesNotMatch(svg, /TARGET CONDITION|HISTORICAL RESULT · PARTIAL/u);
});

test("the production closure carries the LIMS capability-transfer model and its semantic role", async () => {
  const sourcePath = "context-canvas-project-surface/img/plot/lims_eln_capability_transfer_model.svg";
  const manifest = JSON.parse(await readFile(
    resolve(repositoryRoot, "deployment/cpanel/primary-route-manifest.json"),
    "utf8",
  ));
  const inventory = JSON.parse(await readFile(
    resolve(repositoryRoot, "context-canvas-project-surface/asset-inventory.json"),
    "utf8",
  ));

  assert.deepEqual(
    manifest.files.filter((file) => file.source_path === sourcePath),
    [{
      source_path: sourcePath,
      projected_path: "img/plot/lims_eln_capability_transfer_model.svg",
      media_type: "image/svg+xml",
    }],
  );
  assert.deepEqual(
    inventory.overrides.filter((entry) => entry.source_path === sourcePath)
      .map(({ semantic_key, roles }) => ({ semantic_key, roles })),
    [{
      semantic_key: "context-canvas.shared-plot.lims-eln-capability-transfer-model",
      roles: [{
        id: "capability_transfer_model",
        visitor_job: "Show the laboratory capability transfer from observed work through participant correction and vendor selection to completed production authority.",
        accessibility_text_owner: "The SVG title and description and the referring LIMS and ELN Debrief image alternative.",
      }],
    }],
  );
});

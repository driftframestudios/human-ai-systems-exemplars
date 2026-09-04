import assert from "node:assert/strict";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validatePrimaryManifest } from "../../tools/build-prod-projection.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const canvasRoot = "context-canvas-project-surface/context-canvas";
const acceptedRoutes = [
  "index.html",
  "ai-systems.html",
  "collaboration-skills.html",
  "hiring-surfaces-talent-agent-intake.html",
  "shared-machinery.html",
  "poda.html",
  "metadata-blocks.html",
  "grammar-family.html",
  "visualization-fidelity-atlas.html",
  "concept-nursery.html",
  "resting-concepts.html",
  "cross-platform-collaboration-cycle.html",
  "planning-surface.html",
  "core-architectures-orientation-index.html",
  "debriefs.html",
  "registry-goal-fidelity-routing.html",
  "conditioning-field.html",
  "three-way-comparative-return.html",
  "narrative-execution-gap-research-atlas.html",
  "prompt-side-conditions-practice.html",
  "benchmark-orientation.html",
  "maps-evaluations.html",
  "genomic-viewer-replatforming.html",
  "fmi-clinical-trial-coordination.html",
  "ehr-discrete-genomic-result.html",
  "ehr-two-charts-one-result.html",
  "ehr-three-front-doors.html",
  "ehr-pgx-alert-failure.html",
  "ehr-interface-engine-replatform.html",
  "fmi-lims-eln-replatforming.html",
  "who-to-believe-reviews-platform.html",
  "choose-your-player-humatics.html",
  "initiative-costing.html",
  "field-inspection-harness-replatform.html",
  "distributed-inspection-harness.html",
  "exemplar-brief-exploration.html",
  "exemplar-gallery-list.html",
].sort();
const restingExemplars = [
  "exemplar-ideal-debrief.html",
  "exemplar-index-landing.html",
  "exemplar-maximal-debrief.html",
  "exemplar-maximal-information-radiator.html",
];

async function loadPrimaryManifest() {
  const source = await readFile(
    path.join(repositoryRoot, "deployment/cpanel/primary-route-manifest.json"),
    "utf8",
  );
  return validatePrimaryManifest(JSON.parse(source));
}

test("the production manifest carries the accepted 37-route primary collection and its explicit closure", async () => {
  const manifest = await loadPrimaryManifest();
  const projectedPaths = new Set(manifest.files.map(({ projected_path }) => projected_path));
  const rootHtml = manifest.files
    .map(({ projected_path }) => projected_path)
    .filter((projectedPath) => !projectedPath.includes("/") && projectedPath.endsWith(".html"));
  assert.deepEqual(
    rootHtml.filter((route) => route !== "404.html").sort(),
    acceptedRoutes,
  );
  assert.ok(projectedPaths.has("404.html"));
  for (const route of restingExemplars) assert.equal(projectedPaths.has(route), false);
  for (const required of [
    "sitemap.xml",
    "robots.txt",
    "manifest.json",
    "browserconfig.xml",
    "humans.txt",
    "favicon.ico",
    "android-chrome-144x144.png",
    "android-chrome-192x192.png",
    "apple-touch-icon.png",
  ]) {
    assert.ok(projectedPaths.has(required), `${required} belongs to the primary closure`);
  }
  assert.ok(manifest.files.length > acceptedRoutes.length + 1);
  for (const file of manifest.files) {
    const status = await lstat(
      path.join(repositoryRoot, ...file.source_path.split("/")),
    );
    assert.ok(status.isFile() && !status.isSymbolicLink(), file.source_path);
  }
});

test("the sitemap identifies exactly the 37 indexable production routes", async () => {
  const sitemap = await readFile(
    path.join(repositoryRoot, canvasRoot, "sitemap.xml"),
    "utf8",
  );
  const legacyBase =
    "https://schemas.radiantnull.com/context-canvas-project-surface/context-canvas/";
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const routes = locs.map((location) => {
    assert.ok(location.startsWith(legacyBase), location);
    return location === legacyBase ? "index.html" : location.slice(legacyBase.length);
  });
  assert.deepEqual(routes.sort(), acceptedRoutes);
  assert.equal(routes.includes("404.html"), false);
  for (const route of restingExemplars) assert.equal(routes.includes(route), false);
});

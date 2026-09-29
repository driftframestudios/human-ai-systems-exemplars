import assert from "node:assert/strict";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  inspectImageDimensions,
  validateAssetInventory,
  validatePrimaryManifest,
} from "../../tools/build-prod-projection.mjs";
import { createAggregatePackagePlan } from "../../tools/package-v1-iframe-routes.mjs";

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
  "spatial-capture-collaborative-memory.html",
  "multilingual-clinical-vocabulary-practice.html",
  "recoverable-enterprise-forms.html",
  "exemplar-gallery-list.html",
].sort();
const restingExemplars = [
  "exemplar-ideal-debrief.html",
  "exemplar-index-landing.html",
  "exemplar-maximal-debrief.html",
  "exemplar-maximal-information-radiator.html",
];
const robotsCommon = `# Search discovery and person-directed retrieval are welcome.
User-agent: OAI-SearchBot
User-agent: Claude-SearchBot
User-agent: PerplexityBot
User-agent: ChatGPT-User
User-agent: Claude-User
User-agent: Perplexity-User
User-agent: Googlebot
User-agent: Applebot
Allow: /
Content-Signal: search=yes, ai-input=yes, ai-train=no

# Model-training collection is outside this site's intended use.
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: CCBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: Amazonbot
User-agent: Bytespider
User-agent: meta-externalagent
Disallow: /
Content-Signal: search=yes, ai-input=yes, ai-train=no

User-agent: *
Allow: /
Content-Signal: search=yes, ai-input=yes, ai-train=no
`;

async function loadPrimaryManifest() {
  const source = await readFile(
    path.join(repositoryRoot, "deployment/cpanel/primary-route-manifest.json"),
    "utf8",
  );
  return validatePrimaryManifest(JSON.parse(source));
}

test("the production manifest carries the accepted 39-route primary collection and its explicit closure", async () => {
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
  for (const repositoryOwnedContinuation of [
    "lims-eln-functional-nucleus/lims-eln-program-specification/README.md",
    "schemas/collaboration-skills/0.1.0/README.md",
    "schemas/collaboration-skills/0.1.0/examples/collaboration-account.example.json",
    "schemas/collaboration-skills/0.1.0/examples/portable-skill.example.json",
    "schemas/collaboration-skills/0.1.0/examples/retired-projection.example.json",
    "visual-fidelity-contracts/cobalt-temporal-field.md",
  ]) {
    assert.equal(projectedPaths.has(repositoryOwnedContinuation), false);
  }
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

test("the semantic inventory resolves every selected image without becoming a membership source", async () => {
  const configuration = JSON.parse(await readFile(
    path.join(repositoryRoot, "deployment/cpanel/production-projection.config.json"),
    "utf8",
  ));
  assert.equal(
    configuration.asset_inventory,
    "context-canvas-project-surface/asset-inventory.json",
  );
  const inventory = validateAssetInventory(JSON.parse(await readFile(
    path.join(repositoryRoot, configuration.asset_inventory),
    "utf8",
  )));
  const primary = await loadPrimaryManifest();
  const aggregate = await createAggregatePackagePlan();
  const selected = new Map(
    primary.files
      .filter(({ media_type }) => media_type.startsWith("image/"))
      .map(({ source_path, media_type }) => [source_path, media_type]),
  );
  for (const familyPlan of aggregate.familyPlans.values()) {
    for (const route of familyPlan.receipt.routes) {
      for (const group of ["package_files", "navigation_files"]) {
        for (const file of route.static_resource_closure?.[group] ?? []) {
          if (!file.content_type.startsWith("image/")) continue;
          const existing = selected.get(file.source_file);
          assert.ok(existing === undefined || existing === file.content_type, file.source_file);
          selected.set(file.source_file, file.content_type);
        }
      }
    }
  }

  const usedFamilies = new Set();
  const overrides = new Map(
    inventory.overrides.map((override) => [override.source_path, override]),
  );
  for (const [sourcePath, mediaType] of selected) {
    const families = inventory.families.filter(({ selector }) =>
      selector.prefix === undefined
        ? selector.paths.includes(sourcePath)
        : sourcePath.startsWith(selector.prefix),
    );
    assert.equal(families.length, 1, sourcePath);
    usedFamilies.add(families[0].id);
    const bytes = await readFile(path.join(repositoryRoot, sourcePath));
    assert.match(mediaType, /^image\//);
    assert.ok(
      ["available", "variant_set"].includes(
        inspectImageDimensions(bytes, mediaType, sourcePath).standing,
      ),
      sourcePath,
    );
    const roles = overrides.get(sourcePath)?.roles ?? families[0].roles;
    if (
      mediaType === "image/svg+xml" &&
      roles.some(({ accessibility_text_owner: owner }) =>
        /svg title and description/i.test(owner),
      )
    ) {
      const svg = bytes.toString("utf8");
      assert.match(svg, /<title(?:\s|>)/i, `${sourcePath} title owner`);
      assert.match(svg, /<desc(?:\s|>)/i, `${sourcePath} description owner`);
    }
  }
  assert.deepEqual(
    [...usedFamilies].sort(),
    inventory.families.map(({ id }) => id).sort(),
  );
  for (const override of inventory.overrides) {
    assert.ok(selected.has(override.source_path), override.source_path);
  }
  for (const group of inventory.variant_groups) {
    for (const member of group.members) assert.ok(selected.has(member), member);
  }
});

test("the sitemap identifies exactly the 39 indexable production routes", async () => {
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

test("the duplicated Strategy Canvas contract files agree across primary and iframe delivery", async () => {
  const manifest = await loadPrimaryManifest();
  const aggregate = await createAggregatePackagePlan();
  for (const contractFile of [
    {
      basename: "strategy-canvas.schema.json",
      mediaType: "application/schema+json",
      label: "schema",
    },
    {
      basename: "strategy-canvas-evidence.v0.1.json",
      mediaType: "application/json",
      label: "evidence registry",
    },
  ]) {
    const primarySource =
      `core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/${contractFile.basename}`;
    const iframePath =
      `core/strategy-canvas/strategy-canvas-system-v0.2/${contractFile.basename}`;
    const primary = manifest.files.find(({ source_path }) => source_path === primarySource);
    assert.ok(primary, `the primary closure carries the shared Strategy Canvas ${contractFile.label}`);
    assert.equal(primary.media_type, contractFile.mediaType);

    const iframeBytes = aggregate.outputFiles.get(iframePath);
    assert.ok(iframeBytes, `the iframe closure carries the shared Strategy Canvas ${contractFile.label}`);
    assert.ok(
      iframeBytes.equals(await readFile(path.join(repositoryRoot, primarySource))),
      `both surfaces carry the same ${contractFile.label} bytes`,
    );
    const iframeDeclaration = aggregate.familyPlans
      .get("core")
      .receipt.routes
      .flatMap((route) => (route.static_resource_closure?.package_files ?? []).map(
        (file) => ({ route, file }),
      ))
      .find(({ route, file }) =>
        `core/${path.posix.join(path.posix.dirname(route.projection_file), file.target_file)}` === iframePath,
      );
    assert.ok(
      iframeDeclaration,
      `the iframe route contract declares the shared ${contractFile.label}`,
    );
    assert.equal(iframeDeclaration.file.content_type, primary.media_type);
  }
});

test("both production origins carry the settled crawler posture through explicit source owners", async () => {
  const primaryRobots = await readFile(
    path.join(repositoryRoot, canvasRoot, "robots.txt"),
    "utf8",
  );
  const iframeRobots = await readFile(
    path.join(repositoryRoot, "deployment/cpanel/iframe-origin-robots.txt"),
    "utf8",
  );
  assert.equal(primaryRobots, `${robotsCommon}\nSitemap: https://vik.guru/sitemap.xml\n`);
  assert.equal(iframeRobots, robotsCommon);

  const configuration = JSON.parse(await readFile(
    path.join(repositoryRoot, "deployment/cpanel/production-projection.config.json"),
    "utf8",
  ));
  assert.equal(
    configuration.iframe_origin_robots,
    "deployment/cpanel/iframe-origin-robots.txt",
  );
});

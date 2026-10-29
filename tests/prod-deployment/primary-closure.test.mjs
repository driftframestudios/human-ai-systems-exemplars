import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { build } from "esbuild";

import {
  createProductionProjectionPlan,
  inspectImageDimensions,
  validateAssetInventory,
  validatePrimaryManifest,
} from "../../tools/build-prod-projection.mjs";
import { classifyJavaScript } from "../../tools/node-route-inventory.mjs";
import { createAggregatePackagePlan } from "../../tools/package-v1-iframe-routes.mjs";
import {
  loadSourceRouteAuthority,
  resolveSourceRouteValue,
} from "../public-references/source-route-authority.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const canvasRoot = "context-canvas-project-surface/context-canvas";
const nativeRoot = "collaboration/native-investment-studio";
const nativeModules = [
  "config.mjs", "contract.mjs", "controller.mjs", "display.mjs", "draft.mjs",
  "editing.mjs", "icons.mjs", "person-draft.mjs", "shell.mjs", "state.mjs", "team-controller.mjs",
]
  .map((file) => `${nativeRoot}/${file}`);
const nativeEntry = `${nativeRoot}/controller.mjs`;
const execFileAsync = promisify(execFile);
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
  "readable-tables-reusable-evidence.html",
  "one-figure-several-readings.html",
].sort();
const restingExemplars = [
  "exemplar-index-landing.html",
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

function quotedHtmlAttribute(tag, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "iu").exec(tag);
  return match?.[2] ?? null;
}

function localStylesheetReferences(html) {
  const references = [];
  for (const match of html.matchAll(/<link\b[^>]*>/giu)) {
    const tag = match[0];
    const rel = quotedHtmlAttribute(tag, "rel");
    const href = quotedHtmlAttribute(tag, "href");
    if (
      href === null ||
      rel === null ||
      !rel.split(/\s+/u).some((token) => token.toLowerCase() === "stylesheet") ||
      /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#|\{\{)/iu.test(href)
    ) {
      continue;
    }
    references.push(href.split(/[?#]/u, 1)[0]);
  }
  return references;
}

// esbuild parses the actual module syntax; the receiver supplies its exact closure.
async function parsedNativeGraph(files, entry) {
  const visited = new Set();
  await build({
    entryPoints: [entry], bundle: true, write: false, platform: "browser",
    format: "esm", logLevel: "silent",
    plugins: [{
      name: "native-closure-observation",
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, (args) => {
          assert.ok(args.kind === "entry-point" || args.kind === "import-statement",
            "the native receiver declares a static module graph");
          if (args.kind !== "entry-point") assert.match(args.path, /^\.\.?\//u);
          const resolved = args.kind === "entry-point" ? path.posix.normalize(args.path)
            : path.posix.normalize(path.posix.join(path.posix.dirname(args.importer), args.path));
          assert.ok(files.has(resolved), `module closure supplies ${resolved}`);
          return { path: resolved, namespace: "native-closure" };
        });
        builder.onLoad({ filter: /.*/, namespace: "native-closure" }, (args) => {
          visited.add(args.path);
          return { contents: files.get(args.path), loader: "js" };
        });
      },
    }],
  });
  return [...visited].sort();
}

function firstJsonLd(html, label) {
  const block = html.match(
    /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/u,
  );
  assert.ok(block, `${label} carries JSON-LD`);
  return JSON.parse(block[1]);
}

function allJsonLdObjects(value) {
  if (Array.isArray(value)) return value.flatMap(allJsonLdObjects);
  if (value === null || typeof value !== "object") return [];
  return [value, ...Object.values(value).flatMap(allJsonLdObjects)];
}

function pageDateModified(html, location, label, authority) {
  const document = firstJsonLd(html, label);
  if (typeof document.dateModified === "string") return document.dateModified;
  const dates = new Set(
    allJsonLdObjects(document)
      .filter((entry) => {
        const url = resolveSourceRouteValue(entry.url, authority);
        const id = resolveSourceRouteValue(entry["@id"], authority);
        return url === location || id === location || id?.startsWith(`${location}#`);
      })
      .map((entry) => entry.dateModified)
      .filter((value) => typeof value === "string"),
  );
  assert.equal(dates.size, 1, `${label} carries one page-level dateModified`);
  return [...dates][0];
}

test("the production manifest carries the accepted 40-route primary collection and its explicit closure", async () => {
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
    "readable-tables-reusable-evidence.html",
    "styles/routes/table-study.css",
    "img/plot/table_reading_contract.svg",
    "img/plot/table_study_observations.svg",
    "img/plot/table_verification_states.svg",
    "img/debriefs/choose-your-player/robotics-upfront-480.webp",
    "img/debriefs/choose-your-player/robotics-upfront-960.webp",
    "img/debriefs/choose-your-player/robotics-upfront-1920.webp",
    "img/debriefs/sample-noone-could-find/clinical-trial-coordination-upfront-480.webp",
    "img/debriefs/sample-noone-could-find/clinical-trial-coordination-upfront-960.webp",
    "img/debriefs/sample-noone-could-find/clinical-trial-coordination-upfront-1920.webp",
    "img/debriefs/spatial-capture/3d-modeling-scan-480.webp",
    "img/debriefs/spatial-capture/3d-modeling-scan-960.webp",
    "img/debriefs/spatial-capture/3d-modeling-scan-1920.webp",
  ]) {
    assert.ok(projectedPaths.has(required), `${required} belongs to the primary closure`);
  }
  for (const sourceOnlyOrRetired of [
    "img/debriefs/choose-your-player/robotics-upfront.webp",
    "img/debriefs/sample-noone-could-find/clinical-trial-coordination-upfront.webp",
    "img/debriefs/spatial-capture/3d-modeling-scan.webp",
    "img/plot/structure_sensor_3_angled.webp",
    "occipital.png",
    "exemplar-gallery-list.html",
    "exemplar-ideal-debrief.html",
    "exemplar-maximal-debrief.html",
    "exemplar-maximal-information-radiator.html",
  ]) {
    assert.equal(projectedPaths.has(sourceOnlyOrRetired), false, `${sourceOnlyOrRetired} stays outside the primary closure`);
  }
  assert.ok(manifest.files.length > acceptedRoutes.length + 1);
  for (const file of manifest.files) {
    const status = await lstat(
      path.join(repositoryRoot, ...file.source_path.split("/")),
    );
    assert.ok(status.isFile() && !status.isSymbolicLink(), file.source_path);
  }
});

test("every local stylesheet linked by production-selected HTML belongs to the explicit closure", async () => {
  const manifest = await loadPrimaryManifest();
  const selectedSources = new Set(manifest.files.map(({ source_path }) => source_path));
  for (const file of manifest.files.filter(({ media_type }) => media_type === "text/html")) {
    const html = await readFile(path.join(repositoryRoot, file.source_path), "utf8");
    for (const reference of localStylesheetReferences(html)) {
      const sourcePath = path.posix.normalize(
        path.posix.join(path.posix.dirname(file.source_path), reference),
      );
      assert.ok(
        selectedSources.has(sourcePath),
        `${file.source_path} links ${reference}; ${sourcePath} must belong to the production closure`,
      );
    }
  }
});

test("native Studio modules retain exact static-import and media closure in the production artifact", async (t) => {
  const manifest = await loadPrimaryManifest();
  const sources = new Map();
  for (const sourcePath of nativeModules) {
    assert.deepEqual(manifest.files.filter((file) => file.source_path === sourcePath), [{
      source_path: sourcePath, projected_path: sourcePath, media_type: "text/javascript",
    }], sourcePath);
    assert.equal(classifyJavaScript(sourcePath), "browser-shared", sourcePath);
    sources.set(sourcePath, await readFile(path.join(repositoryRoot, sourcePath)));
  }
  assert.deepEqual(await parsedNativeGraph(sources, nativeEntry), nativeModules);
  for (const required of ["config.mjs", "display.mjs", "editing.mjs", "icons.mjs", "person-draft.mjs", "shell.mjs", "team-controller.mjs"]) {
    const incomplete = new Map(sources);
    incomplete.delete(`${nativeRoot}/${required}`);
    await assert.rejects(parsedNativeGraph(incomplete, nativeEntry), /module closure supplies/u,
      `the production graph requires ${required}`);
  }

  const about = await readFile(path.join(repositoryRoot, canvasRoot, "index.html"), "utf8");
  const tags = [...about.matchAll(/<script\b[^>]*>/giu)].map(([tag]) => tag).filter((tag) => {
    const source = quotedHtmlAttribute(tag, "src");
    return source !== null && path.posix.normalize(path.posix.join(canvasRoot, source)) === nativeEntry;
  });
  assert.equal(tags.length, 1, "About starts the canonical native controller once");
  assert.equal(quotedHtmlAttribute(tags[0], "type"), "module");

  // An isolated committed fixture exercises the production builder with exact
  // native bytes and About's real script tag, independently of private receivers.
  const fixture = await mkdtemp(path.join(os.tmpdir(), "native-module-projection-"));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  const git = (...args) => execFileAsync("git", args, { cwd: fixture, encoding: "utf8" });
  const configPath = "deployment/cpanel/production-projection.config.json";
  const manifestPath = "deployment/cpanel/primary-route-manifest.json";
  const fixtureFiles = new Map([
    ...sources,
    [`${canvasRoot}/index.html`, Buffer.from(`<!doctype html><title>Native module delivery</title>${tags[0]}</script>\n`)],
    [manifestPath, Buffer.from(JSON.stringify({
      id: manifest.id, version: manifest.version,
      files: manifest.files.filter(({ source_path }) =>
        nativeModules.includes(source_path) || source_path === `${canvasRoot}/index.html`),
    }))],
    [configPath, Buffer.from(JSON.stringify({
      id: "prod-projection.configuration.v1", version: "1", primary_manifest: manifestPath,
      publication: { base_url: "https://vik.guru/", source_root: canvasRoot, public_reference_config: ".env.public" },
    }))],
    [".gitignore", Buffer.from(".env.public\n")],
    [".env.public", Buffer.alloc(0)],
  ]);
  for (const [relative, bytes] of fixtureFiles) {
    await mkdir(path.dirname(path.join(fixture, relative)), { recursive: true });
    await writeFile(path.join(fixture, relative), bytes);
  }
  await git("init", "--quiet");
  await git("add", ".");
  await git("-c", "user.name=Projection Fixture", "-c", "user.email=projection@example.test",
    "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "Accept native module fixture");
  const plan = await createProductionProjectionPlan({
    repositoryRoot: fixture, configurationPath: path.join(fixture, configPath),
    aggregatePlan: await createAggregatePackagePlan(),
  });
  const finalSources = new Map();
  for (const sourcePath of nativeModules) {
    const projectedPath = `primary-public/${sourcePath}`;
    const output = plan.manifest.outputs.find((row) => row.projected_path === projectedPath);
    assert.equal(output?.media_type, "text/javascript", projectedPath);
    const bytes = plan.outputFiles.get(projectedPath);
    assert.ok(bytes?.equals(sources.get(sourcePath)), `${sourcePath} retains its exact imported bytes`);
    finalSources.set(sourcePath, bytes);
  }
  const projectedAbout = plan.outputFiles.get("primary-public/index.html").toString("utf8");
  const projectedTag = projectedAbout.match(/<script\b[^>]*>/iu)?.[0];
  assert.ok(projectedTag, "the production About carrier keeps the module entry");
  assert.equal(quotedHtmlAttribute(projectedTag, "src"), nativeEntry);
  assert.equal(quotedHtmlAttribute(projectedTag, "type"), "module");
  assert.deepEqual(await parsedNativeGraph(finalSources, nativeEntry), nativeModules);
});

test("the manufacturing gallery carries its exact primary closure and generated image provenance", async () => {
  const manifest = await loadPrimaryManifest();
  const views = ["rate", "count", "reconciliation", "conditions"];
  const expected = [
    ...["atlas-gallery.js", "atlas-gallery-model.js", "atlas-gallery-table.js"].map((file) =>
      [`${canvasRoot}/${file}`, file, "text/javascript"]),
    ...[["gallery.v1.json", "application/json"], ["summary.v1.json", "application/json"],
      ["README.md", "text/markdown"]].map(([file, mediaType]) =>
      [`context-canvas-project-surface/data/visualization-fidelity/ai4i/${file}`,
        `data/visualization-fidelity/ai4i/${file}`, mediaType]),
    ...views.map((view) => [`context-canvas-project-surface/img/plot/atlas_ai4i_${view}.svg`,
      `img/plot/atlas_ai4i_${view}.svg`, "image/svg+xml"]),
  ];
  for (const [source_path, projected_path, media_type] of expected) {
    assert.deepEqual(manifest.files.filter((file) => file.source_path === source_path),
      [{ source_path, projected_path, media_type }], source_path);
    const status = await lstat(path.join(repositoryRoot, source_path));
    assert.ok(status.isFile() && !status.isSymbolicLink(), source_path);
  }
  const inventory = validateAssetInventory(JSON.parse(await readFile(
    path.join(repositoryRoot, "context-canvas-project-surface/asset-inventory.json"), "utf8",
  )));
  for (const view of views) {
    const sourcePath = `context-canvas-project-surface/img/plot/atlas_ai4i_${view}.svg`;
    const families = inventory.families.filter(({ selector }) => selector.prefix === undefined
      ? selector.paths.includes(sourcePath) : sourcePath.startsWith(selector.prefix));
    assert.deepEqual(families.map(({ id }) => id), ["context-canvas.shared-plot"]);
    const overrides = inventory.overrides.filter(({ source_path }) => source_path === sourcePath);
    assert.equal(overrides.length, 1, sourcePath);
    assert.equal(overrides[0].semantic_key, `context-canvas.shared-plot.ai4i-${view}`);
    assert.deepEqual(overrides[0].source_relationship, {
      standing: "generated_derivative",
      canonical_source_path: "context-canvas-project-surface/data/visualization-fidelity/ai4i/ai4i2020.csv",
      generator_path: "tools/atlas-gallery-model.mjs",
      profile: `ai4i-gallery-${view}-v1`,
    });
    assert.ok(overrides[0].roles.some(({ accessibility_text_owner }) =>
      /svg title and description/i.test(accessibility_text_owner)));
    const bytes = await readFile(path.join(repositoryRoot, sourcePath));
    assert.equal(inspectImageDimensions(bytes, "image/svg+xml", sourcePath).standing, "available");
    assert.match(bytes.toString("utf8"), /<title(?:\s|>)/i);
    assert.match(bytes.toString("utf8"), /<desc(?:\s|>)/i);
  }
});

test("the public research extract carries its exact primary closure and generated image provenance", async () => {
  const manifest = await loadPrimaryManifest();
  const sourcePath = "context-canvas-project-surface/img/plot/atlas_public_research.svg";
  const expected = [
    [sourcePath, "img/plot/atlas_public_research.svg", "image/svg+xml"],
    ...[["sources.v1.json", "application/json"], ["summary.v1.json", "application/json"],
      ["README.md", "text/markdown"]].map(([file, mediaType]) =>
      [`context-canvas-project-surface/data/visualization-fidelity/research/${file}`,
        `data/visualization-fidelity/research/${file}`, mediaType]),
  ];
  for (const [source_path, projected_path, media_type] of expected) {
    assert.deepEqual(manifest.files.filter((file) => file.source_path === source_path),
      [{ source_path, projected_path, media_type }], source_path);
    const status = await lstat(path.join(repositoryRoot, source_path));
    assert.ok(status.isFile() && !status.isSymbolicLink(), source_path);
  }
  const inventory = validateAssetInventory(JSON.parse(await readFile(
    path.join(repositoryRoot, "context-canvas-project-surface/asset-inventory.json"), "utf8",
  )));
  const families = inventory.families.filter(({ selector }) => selector.prefix === undefined
    ? selector.paths.includes(sourcePath) : sourcePath.startsWith(selector.prefix));
  assert.deepEqual(families.map(({ id }) => id), ["context-canvas.shared-plot"]);
  const overrides = inventory.overrides.filter(({ source_path }) => source_path === sourcePath);
  assert.equal(overrides.length, 1, sourcePath);
  assert.equal(overrides[0].semantic_key, "context-canvas.shared-plot.public-research-topic-memberships");
  assert.deepEqual(overrides[0].source_relationship, {
    standing: "generated_derivative",
    canonical_source_path: "context-canvas-project-surface/data/visualization-fidelity/research/sources.v1.json",
    generator_path: "tools/build-atlas-research-view.mjs",
    profile: "public-research-topic-memberships-v1",
  });
  assert.ok(overrides[0].roles.some(({ accessibility_text_owner }) =>
    /svg title and description/i.test(accessibility_text_owner)));
  const bytes = await readFile(path.join(repositoryRoot, sourcePath));
  assert.equal(inspectImageDimensions(bytes, "image/svg+xml", sourcePath).standing, "available");
  assert.match(bytes.toString("utf8"), /<title(?:\s|>)/i);
  assert.match(bytes.toString("utf8"), /<desc(?:\s|>)/i);
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

test("the sitemap identifies exactly the 40 indexable production routes with page-owned dates", async () => {
  const authority = await loadSourceRouteAuthority();
  const sitemap = await readFile(
    path.join(repositoryRoot, canvasRoot, "sitemap.xml"),
    "utf8",
  );
  const publicBase = "https://vik.guru/";
  const entries = [...sitemap.matchAll(
    /<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>\s*<\/url>/gu,
  )].map(([, location, lastModified]) => ({ location, lastModified }));
  const routes = entries.map(({ location }) => {
    const resolved = resolveSourceRouteValue(location, authority);
    assert.ok(resolved.startsWith(publicBase), resolved);
    return resolved === publicBase ? "index.html" : resolved.slice(publicBase.length);
  });
  assert.deepEqual(routes.sort(), acceptedRoutes);
  assert.equal(routes.includes("404.html"), false);
  for (const route of restingExemplars) assert.equal(routes.includes(route), false);
  for (const { location, lastModified } of entries) {
    const resolved = resolveSourceRouteValue(location, authority);
    const route = resolved === publicBase ? "index.html" : resolved.slice(publicBase.length);
    const html = await readFile(path.join(repositoryRoot, canvasRoot, route), "utf8");
    // Advance both owners for meaningful public content or structured-data changes.
    // Mechanical styling and footer-only edits keep the latest substantive date.
    assert.equal(
      lastModified,
      pageDateModified(html, resolved, route, authority),
      `${route}: current modification date`,
    );
  }
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

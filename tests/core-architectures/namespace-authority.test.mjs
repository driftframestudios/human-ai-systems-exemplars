import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  observeIframeRuntimeCapabilities,
  scanHtmlClosure,
} from "../../tools/package-iframe-routes.mjs";

const testRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testRoot, "../..");
const coreRoot = path.join(
  repositoryRoot,
  "core-architectures-chimeric-prototype-current-pack-v0.1",
);
const contextCoreRoot = path.join(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1",
);
const sourceManifestPath = path.join(
  coreRoot,
  "core-architectures-chimeric-prototype-manifest-v0.1.json",
);
const contextManifestPath = path.join(
  contextCoreRoot,
  "core-architectures-chimeric-prototype-manifest-v0.1.json",
);
const routeManifestPath = path.join(coreRoot, "public-iframe-route-manifest-v1.json");
const localManifestPath = path.join(contextCoreRoot, "context-canvas-local-manifest-v0.1.json");

const vocabularyNamespace = "https://vik.guru/vocabulary/core-architectures#";
const upstreamInstanceBase = "https://vik.guru/id/core-architectures/upstream-revision-loop/";
const placeholderNamespace = "https://example.org/core-architectures#";
const placeholderAuthority = /https:\/\/example\.org\/core-architectures(?:#|\/)/u;
const semanticIdentifiers = {
  vocabulary_namespace: vocabularyNamespace,
  upstream_revision_loop_instance_base: upstreamInstanceBase,
  retrieval_standing: "identifier_only",
};

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function count(source, value) {
  return source.split(value).length - 1;
}

function currentById(manifest) {
  return new Map(manifest.prototypes.map((entry) => [entry.id, entry]));
}

test("manifest-current Core JSON-LD uses the approved semantic identifiers", async () => {
  const [sourceManifest, contextManifest] = await Promise.all([
    readJson(sourceManifestPath),
    readJson(contextManifestPath),
  ]);

  assert.deepEqual(sourceManifest.semantic_identifiers, semanticIdentifiers);
  assert.deepEqual(contextManifest.semantic_identifiers, semanticIdentifiers);
  assert.equal(sourceManifest.prototypes.length, 21);
  assert.deepEqual(
    contextManifest.prototypes.map(({ id }) => id),
    sourceManifest.prototypes.map(({ id }) => id),
  );

  for (const entry of sourceManifest.prototypes) {
    const contextEntry = currentById(contextManifest).get(entry.id);
    if (entry.id === "strategy-canvas") {
      assert.deepEqual(
        [entry.file, entry.version],
        ["strategy-canvas-chimeric-prototype-v0.2.4.html", "0.2.4"],
        "Strategy Canvas canonical current identity",
      );
      assert.deepEqual(
        [contextEntry.file, contextEntry.version],
        ["strategy-canvas-chimeric-prototype-v0.2.2.html", "0.2.2"],
        "Strategy Canvas maintained Context identity",
      );
    } else {
      assert.deepEqual(
        [contextEntry.file, contextEntry.version],
        [entry.file, entry.version],
        `${entry.id} source and Context identities`,
      );
    }
    const [source, contextSource] = await Promise.all([
      readFile(path.join(coreRoot, entry.file), "utf8"),
      readFile(path.join(contextCoreRoot, contextEntry.file), "utf8"),
    ]);
    assert.doesNotMatch(source, placeholderAuthority, `${entry.id} canonical authority`);
    assert.doesNotMatch(contextSource, placeholderAuthority, `${entry.id} Context authority`);

    if (entry.id === "strategy-canvas") {
      assert.equal(count(source, vocabularyNamespace), 0);
      assert.equal(count(contextSource, vocabularyNamespace), 0);
      continue;
    }

    assert.equal(count(source, vocabularyNamespace), 1, `${entry.id} canonical namespace`);
    assert.equal(count(contextSource, vocabularyNamespace), 1, `${entry.id} Context namespace`);

    assert.ok(entry.previous.length, `${entry.id} retains prior version coordinates`);
    const availablePriorFiles = entry.previous.filter((priorFile) =>
      existsSync(path.join(coreRoot, priorFile)) && existsSync(path.join(contextCoreRoot, priorFile))
    );
    assert.ok(availablePriorFiles.length, `${entry.id} retains an available prior version pair`);
    const priorPairs = await Promise.all(availablePriorFiles.map(async (priorFile) => Promise.all([
      readFile(path.join(coreRoot, priorFile), "utf8"),
      readFile(path.join(contextCoreRoot, priorFile), "utf8"),
    ])));
    assert.ok(
      priorPairs.some(([priorSource]) => count(priorSource, placeholderNamespace) === 1),
      `${entry.id} canonical placeholder-era predecessor remains recoverable`,
    );
    assert.ok(
      priorPairs.some(([, priorContextSource]) => count(priorContextSource, placeholderNamespace) === 1),
      `${entry.id} Context placeholder-era predecessor remains recoverable`,
    );
  }

  const independentHistoricalContext = await readFile(
    path.join(
      repositoryRoot,
      "core-architecture-shared-schema-extraction-v0.1/core-architecture.context.v0.1.jsonld",
    ),
    "utf8",
  );
  assert.equal(count(independentHistoricalContext, placeholderNamespace), 1);
});

test("current canonical and Context projections retain their declared relationship", async () => {
  const [sourceManifest, contextManifest, localManifest] = await Promise.all([
    readJson(sourceManifestPath),
    readJson(contextManifestPath),
    readJson(localManifestPath),
  ]);
  const contextEntries = currentById(contextManifest);
  const declaredAdaptations = new Set(localManifest.divergence.changedPaths);

  for (const entry of sourceManifest.prototypes) {
    const contextEntry = contextEntries.get(entry.id);
    const [source, projection] = await Promise.all([
      readFile(path.join(coreRoot, entry.file)),
      readFile(path.join(contextCoreRoot, contextEntry.file)),
    ]);
    if (entry.id === "strategy-canvas") {
      assert.ok(
        declaredAdaptations.has(contextEntry.file),
        "Strategy Canvas keeps its independently versioned Context adaptation",
      );
    } else if (!declaredAdaptations.has(entry.file)) {
      assert.ok(projection.equals(source), `${entry.id} remains byte-identical`);
    }
  }

  assert.ok(
    declaredAdaptations.has("poda-chimeric-prototype-v0.1.4.html"),
    "PODA retains its Context navigation adaptation",
  );
  assert.ok(
    declaredAdaptations.has("core-architecture-family-index-chimeric-prototype-v0.1.4.html"),
    "the family index retains its Context navigation adaptation",
  );
});

test("semantic-identifier successors retain the established iframe request closure", async () => {
  const [sourceManifest, routeManifest] = await Promise.all([
    readJson(sourceManifestPath),
    readJson(routeManifestPath),
  ]);
  const sourceEntries = currentById(sourceManifest);
  const acceptedCapabilityAdditions = new Map([
    ["poda", ["file-download"]],
    ["alignment-worksheet", ["file-download"]],
    ["impact-map", ["file-download"]],
    ["context-tree", ["file-download"]],
    ["cross-channel-blueprint", ["file-download"]],
    ["service-design-blueprint", ["file-download"]],
    ["ai-systems-service-blueprint", ["clipboard-write", "file-download"]],
    ["software-architecture-views", ["file-download"]],
    ["first-responsible-version-matrix", ["file-download"]],
    ["upstream-revision-loop", ["file-download"]],
    ["recovery-routing-atlas", ["file-download"]],
    ["participatory-design-kit", ["file-download"]],
    ["specification-by-example", ["file-download"]],
    ["pattern-problem-surface-matrix", ["file-download"]],
    ["jobs-to-be-done-treemap", ["file-download"]],
    ["unit-test-first-design", ["file-download"]],
    ["heart-chart", ["file-download"]],
    ["plus-delta", ["file-download"]],
    ["practitioner-judgment-probes", ["file-download"]],
  ]);

  for (const entry of sourceManifest.prototypes) {
    const route = routeManifest.routes.find(({ id }) => id === entry.id);
    assert.ok(route, `${entry.id} keeps a public route coordinate`);
    assert.deepEqual(
      [route.source_file, route.source_version],
      [entry.file, entry.version],
      `${entry.id} route follows the current source identity`,
    );

    if (entry.id === "strategy-canvas") continue;
    const priorFile = entry.previous.at(-1);
    const [current, prior] = await Promise.all([
      readFile(path.join(coreRoot, entry.file), "utf8"),
      readFile(path.join(coreRoot, priorFile), "utf8"),
    ]);
    const priorCapabilities = observeIframeRuntimeCapabilities(prior);
    const addedCapabilities = acceptedCapabilityAdditions.get(entry.id) ?? [];
    assert.deepEqual(
      observeIframeRuntimeCapabilities(current),
      [...priorCapabilities, ...addedCapabilities],
      `${entry.id} runtime capabilities retain the predecessor plus accepted additions`,
    );
    assert.deepEqual(
      scanHtmlClosure(current, new Set(), `${entry.id} current source`),
      scanHtmlClosure(prior, new Set(), `${entry.id} prior source`),
      `${entry.id} static request closure`,
    );
  }

  const upstream = sourceEntries.get("upstream-revision-loop");
  const [upstreamSource, upstreamProjection] = await Promise.all([
    readFile(path.join(coreRoot, upstream.file), "utf8"),
    readFile(path.join(contextCoreRoot, upstream.file), "utf8"),
  ]);
  assert.equal(count(upstreamSource, upstreamInstanceBase), 1);
  assert.equal(count(upstreamProjection, upstreamInstanceBase), 1);

  const hubRoute = routeManifest.routes.find(({ id }) => id === "core-architectures-pack");
  assert.deepEqual(
    [hubRoute.source_file, hubRoute.source_version],
    ["core-architectures-chimeric-prototype-pack-index-v0.1.3.html", "0.1.3"],
  );
  const [hub, priorHub] = await Promise.all([
    readFile(path.join(coreRoot, hubRoute.source_file), "utf8"),
    readFile(
      path.join(coreRoot, "core-architectures-chimeric-prototype-pack-index-v0.1.2.html"),
      "utf8",
    ),
  ]);
  assert.deepEqual(observeIframeRuntimeCapabilities(hub), observeIframeRuntimeCapabilities(priorHub));
  assert.deepEqual(
    scanHtmlClosure(hub, new Set(), "current Core hub"),
    scanHtmlClosure(priorHub, new Set(), "prior Core hub"),
  );
  for (const entry of sourceManifest.prototypes) {
    assert.match(hub, new RegExp(`href=["']${entry.file.replaceAll(".", "\\.")}["']`, "u"));
  }
});

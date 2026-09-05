#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, mkdir, readFile, writeFile, copyFile, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const fixedTime = new Date("2026-08-22T00:00:00Z");

const rootCanonicalPack = join(repositoryRoot, "core-architectures-chimeric-prototype-current-pack-v0.1");
const contextCanonicalPack = join(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1",
);

const narrativeContext = join(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/narrative-capsule-composer",
);
const semanticContext = join(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/semantic-sampling-tableau/terminology-exploration",
);
const technologyContext = join(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/technology-fit-sampling-tableau",
);
const threadkeepingContext = join(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/threadkeeping-ledger",
);

function source(path) {
  return { kind: "source", path };
}

function legacy(archive, entry) {
  return { kind: "legacy", archive, entry };
}

function portableNarrativeText(value) {
  return value
    .replaceAll(
      "../../../../core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-chimeric-prototype-v0.2.2.html",
      "companions/strategy-canvas-chimeric-prototype-v0.2.2.html",
    )
    .replaceAll(
      "../../../../core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-chimeric-prototype-v0.1.1.html",
      "companions/strategy-canvas-chimeric-prototype-v0.1.1.html",
    )
    .replaceAll(
      "../../../../core-architectures-chimeric-prototype-current-pack-v0.1/core-architecture-family-index-chimeric-prototype-v0.1.4.html",
      "companions/core-architecture-family-index-chimeric-prototype-v0.1.4.html",
    )
    .replaceAll(
      "../../core-architectures/chimeric-pack-v0.1/strategy-canvas-chimeric-prototype-v0.2.2.html",
      "companions/strategy-canvas-chimeric-prototype-v0.2.2.html",
    )
    .replaceAll(
      "../../../../../core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas.schema.json",
      "companions/strategy-canvas-system-v0.2/strategy-canvas.schema.json",
    )
    .replaceAll(
      "../../../../core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas.schema.json",
      "companions/strategy-canvas-system-v0.2/strategy-canvas.schema.json",
    )
    .replaceAll(
      "../../../../../core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-validator.js",
      "companions/strategy-canvas-system-v0.2/strategy-canvas-validator.js",
    )
    .replaceAll(
      "../../../../core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-validator.js",
      "companions/strategy-canvas-system-v0.2/strategy-canvas-validator.js",
    )
    .replaceAll(
      "../../../../../core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-evidence.v0.1.json",
      "companions/strategy-canvas-system-v0.2/strategy-canvas-evidence.v0.1.json",
    )
    .replaceAll(
      "../../../../core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-evidence.v0.1.json",
      "companions/strategy-canvas-system-v0.2/strategy-canvas-evidence.v0.1.json",
    )
    .replaceAll(
      '<a href="../context-canvas-project-surface/context-canvas/core-architectures-orientation-index.html">Core Architectures Orientation Index</a>',
      '<a href="https://schemas.radiantnull.com/context-canvas-project-surface/context-canvas/core-architectures-orientation-index.html" target="_blank" rel="noopener noreferrer">Core Architectures Orientation Index (opens in a new tab)</a>',
    )
    .replaceAll(
      '<a href="../../../../core-architectures-orientation-index.html">Core Architectures Orientation Index</a>',
      '<a href="https://schemas.radiantnull.com/context-canvas-project-surface/context-canvas/core-architectures-orientation-index.html" target="_blank" rel="noopener noreferrer">Core Architectures Orientation Index (opens in a new tab)</a>',
    );
}

function narrativeBundle(base, archivePath, familyIndex, compatibility) {
  return {
    name: relative(repositoryRoot, archivePath),
    archivePath,
    root: "narrative-capsules-chimeric-prototype-v0.1",
    closureEntries: ["companions/strategy-canvas-chimeric-prototype-v0.2.2.html"],
    entries: [
      ["companions/core-architecture-family-index-chimeric-prototype-v0.1.4.html", source(familyIndex)],
      ["companions/strategy-canvas-chimeric-prototype-v0.1.1.html", source(compatibility)],
      ["companions/strategy-canvas-chimeric-prototype-v0.2.2.html", source(join(rootCanonicalPack, "strategy-canvas-chimeric-prototype-v0.2.2.html"))],
      ["companions/strategy-canvas-system-v0.2/strategy-canvas.schema.json", source(join(rootCanonicalPack, "strategy-canvas-system-v0.2/strategy-canvas.schema.json"))],
      ["companions/strategy-canvas-system-v0.2/strategy-canvas-validator.js", source(join(rootCanonicalPack, "strategy-canvas-system-v0.2/strategy-canvas-validator.js"))],
      ["companions/strategy-canvas-system-v0.2/strategy-canvas-evidence.v0.1.json", source(join(rootCanonicalPack, "strategy-canvas-system-v0.2/strategy-canvas-evidence.v0.1.json"))],
      ["core-architecture-target-pair-registry.v0.1.json", source(join(base, "core-architecture-target-pair-registry.v0.1.json"))],
      ["expectation-opportunity-to-strategy-canvas.example.v0.1.json", source(join(base, "expectation-opportunity-to-strategy-canvas.example.v0.1.json"))],
      ["narrative-capsule-composition.context.v0.1.jsonld", source(join(base, "narrative-capsule-composition.context.v0.1.jsonld"))],
      ["narrative-capsule-composition.schema.v0.1.json", source(join(base, "narrative-capsule-composition.schema.v0.1.json"))],
      ["narrative-capsules-chimeric-prototype-manifest-v0.1.json", source(join(base, "narrative-capsules-chimeric-prototype-manifest-v0.1.json"))],
      ["strategy-canvas-v2-adapter.js", source(join(base, "strategy-canvas-v2-adapter.js"))],
      ["narrative-capsules-chimeric-prototype-v0.1.html", source(join(base, "narrative-capsules-chimeric-prototype-v0.1.html"))],
      ["narrative-capsules-composition-addendum-v0.1.md", source(join(base, "narrative-capsules-composition-addendum-v0.1.md"))],
      ["narrative-capsules-prototype-profile-v0.1.yaml", source(join(base, "narrative-capsules-prototype-profile-v0.1.yaml"))],
    ],
    transform(path, buffer) {
      const textFiles = new Set([
        "companions/core-architecture-family-index-chimeric-prototype-v0.1.4.html",
        "companions/strategy-canvas-chimeric-prototype-v0.1.1.html",
        "core-architecture-target-pair-registry.v0.1.json",
        "narrative-capsules-chimeric-prototype-manifest-v0.1.json",
        "narrative-capsules-chimeric-prototype-v0.1.html",
      ]);
      if (!textFiles.has(path)) return buffer;
      let value = portableNarrativeText(buffer.toString("utf8"));
      if (path.startsWith("companions/")) {
        value = value.replaceAll(
          "../../../core-architectures/chimeric-pack-v0.1/strategy-canvas-chimeric-prototype-v0.2.2.html",
          "strategy-canvas-chimeric-prototype-v0.2.2.html",
        );
      }
      return Buffer.from(value);
    },
  };
}

function semanticBundle(base, archivePath) {
  const archiveRoot = "narrative-sampling-tableau-chimeric-prototype-v0.1";
  return {
    name: relative(repositoryRoot, archivePath),
    archivePath,
    root: archiveRoot,
    receiptManifest: "narrative-sampling-tableau-manifest-v0.1.json",
    entries: [
      ["README.md", legacy(archivePath, `${archiveRoot}/README.md`)],
      ["conation-motion-naming-sampling.example.v0.1.json", source(join(base, "conation-motion-naming-sampling.example.v0.1.json"))],
      ["conation-motion-naming-sampling.example.v0.1.jsonld", source(join(base, "conation-motion-naming-sampling.example.v0.1.jsonld"))],
      ["core-architecture-routing-registry.v0.1.json", source(join(base, "core-architecture-routing-registry.v0.1.json"))],
      ["narrative-sampling-tableau-chimeric-prototype-v0.1.html", source(join(base, "narrative-sampling-tableau-chimeric-prototype-v0.1.html"))],
      ["narrative-sampling-tableau-manifest-v0.1.json", source(join(base, "narrative-sampling-tableau-manifest-v0.1.json"))],
      ["narrative-sampling-tableau-prototype-addendum-v0.1.md", source(join(base, "narrative-sampling-tableau-prototype-addendum-v0.1.md"))],
      ["narrative-sampling-tableau-prototype-profile-v0.1.yaml", source(join(base, "narrative-sampling-tableau-prototype-profile-v0.1.yaml"))],
      ["narrative-sampling-tableau-state.schema.v0.1.json", source(join(base, "narrative-sampling-tableau-state.schema.v0.1.json"))],
      ["narrative-sampling-tableau-validation-report-v0.1.json", source(join(base, "narrative-sampling-tableau-validation-report-v0.1.json"))],
      ["narrative-sampling-tableau.context.v0.1.jsonld", source(join(base, "narrative-sampling-tableau.context.v0.1.jsonld"))],
    ],
  };
}

function technologyBundle(base, archivePath) {
  const archiveRoot = "technology-fit-sampling-tableau-chimeric-prototype-v0.1";
  return {
    name: relative(repositoryRoot, archivePath),
    archivePath,
    root: archiveRoot,
    receiptManifest: "technology-fit-sampling-tableau-manifest-v0.1.json",
    entries: [
      ["front-end-practitioner-probe-registry.v0.1.json", source(join(base, "front-end-practitioner-probe-registry.v0.1.json"))],
      ["front-end-stack-selection.example.v0.1.json", source(join(base, "front-end-stack-selection.example.v0.1.json"))],
      ["front-end-stack-selection.example.v0.1.jsonld", source(join(base, "front-end-stack-selection.example.v0.1.jsonld"))],
      ["technology-decision-routing-registry.v0.1.json", source(join(base, "technology-decision-routing-registry.v0.1.json"))],
      ["technology-fit-sampling-tableau-chimeric-prototype-v0.2.html", source(join(base, "technology-fit-sampling-tableau-chimeric-prototype-v0.2.html"))],
      ["technology-fit-sampling-tableau-manifest-v0.1.json", source(join(base, "technology-fit-sampling-tableau-manifest-v0.1.json"))],
      ["technology-fit-sampling-tableau-preview-v0.1.png", legacy(archivePath, `${archiveRoot}/technology-fit-sampling-tableau-preview-v0.1.png`)],
      ["technology-fit-sampling-tableau-prototype-addendum-v0.1.md", source(join(base, "technology-fit-sampling-tableau-prototype-addendum-v0.1.md"))],
      ["technology-fit-sampling-tableau-prototype-profile-v0.1.yaml", source(join(base, "technology-fit-sampling-tableau-prototype-profile-v0.1.yaml"))],
      ["technology-fit-sampling-tableau-state.schema.v0.1.json", source(join(base, "technology-fit-sampling-tableau-state.schema.v0.1.json"))],
      ["technology-fit-sampling-tableau-validation-report-v0.1.json", source(join(base, "technology-fit-sampling-tableau-validation-report-v0.1.json"))],
      ["technology-fit-sampling-tableau.context.v0.1.jsonld", source(join(base, "technology-fit-sampling-tableau.context.v0.1.jsonld"))],
    ],
  };
}

function threadkeepingBundle(base, archivePath) {
  return {
    name: relative(repositoryRoot, archivePath),
    archivePath,
    root: "",
    entries: [
      ["threadkeeping-ledger-chimeric-prototype-v0.1.html", source(join(base, "threadkeeping-ledger-chimeric-prototype-v0.1.html"))],
      ["threadkeeping-ledger-manifest-v0.1.json", source(join(base, "threadkeeping-ledger-manifest-v0.1.json"))],
      ["threadkeeping-ledger.context.v0.1.jsonld", source(join(base, "threadkeeping-ledger.context.v0.1.jsonld"))],
      ["threadkeeping-ledger.schema.v0.1.json", source(join(base, "threadkeeping-ledger.schema.v0.1.json"))],
    ],
  };
}

const bundles = [
  narrativeBundle(
    narrativeContext,
    join(narrativeContext, "narrative-capsules-chimeric-prototype-bundle-v0.1.zip"),
    join(narrativeContext, "companions/core-architecture-family-index-chimeric-prototype-v0.1.4.html"),
    join(narrativeContext, "companions/strategy-canvas-chimeric-prototype-v0.1.1.html"),
  ),
  semanticBundle(semanticContext, join(semanticContext, "narrative-sampling-tableau-chimeric-prototype-bundle-v0.1.zip")),
  technologyBundle(technologyContext, join(technologyContext, "technology-fit-sampling-tableau-chimeric-prototype-bundle-v0.1.zip")),
  threadkeepingBundle(
    join(threadkeepingContext, "threadkeeping-ledger-chimeric-prototype-bundle-v0.1"),
    join(threadkeepingContext, "threadkeeping-ledger-chimeric-prototype-bundle-v0.1.zip"),
  ),
];

function readLegacy(archive, entry) {
  return execFileSync("unzip", ["-p", archive, entry], { encoding: "buffer", maxBuffer: 8 * 1024 * 1024 });
}

async function readDescriptor(descriptor) {
  return descriptor.kind === "source"
    ? readFile(descriptor.path)
    : readLegacy(descriptor.archive, descriptor.entry);
}

async function verifyManifestReceipts(bundle) {
  if (!bundle.receiptManifest) return;
  const descriptors = new Map(bundle.entries);
  const manifestDescriptor = descriptors.get(bundle.receiptManifest);
  if (!manifestDescriptor) throw new Error(`${bundle.name} does not include its receipt manifest`);
  const manifest = JSON.parse((await readDescriptor(manifestDescriptor)).toString("utf8"));
  for (const record of manifest.files || []) {
    const entryPath = record.path || record.name;
    const descriptor = descriptors.get(entryPath);
    if (!descriptor) throw new Error(`${bundle.name} manifest names missing member ${entryPath}`);
    const bytes = await readDescriptor(descriptor);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (record.bytes !== bytes.length) throw new Error(`${bundle.name} manifest byte receipt is stale for ${entryPath}`);
    if (record.sha256 !== digest) throw new Error(`${bundle.name} manifest SHA-256 receipt is stale for ${entryPath}`);
  }
}

function localDocumentReferences(value) {
  const references = [];
  for (const match of value.matchAll(/\b(?:href|src|data-href)=["']([^"']+)["']/giu)) {
    const reference = match[1].trim();
    if (
      !reference ||
      reference.startsWith("#") ||
      /^(?:data|https?|mailto|tel|javascript):/iu.test(reference)
    ) continue;
    references.push(reference.split(/[?#]/u, 1)[0]);
  }
  return references;
}

async function verifyStagedClosure(bundle, stage) {
  if (!bundle.closureEntries?.length) return;
  const included = new Set(bundle.entries.map(([entryPath]) => entryPath));
  for (const entryPath of bundle.closureEntries) {
    const value = await readFile(join(stage, entryPath), "utf8");
    for (const reference of localDocumentReferences(value)) {
      const target = posix.normalize(posix.join(posix.dirname(entryPath), reference));
      if (target.startsWith("../") || !included.has(target)) {
        throw new Error(`${bundle.name} leaves ${entryPath} reference ${reference} outside its archive closure`);
      }
    }
  }
}

async function buildBundle(bundle, temporaryRoot) {
  const stage = bundle.root ? join(temporaryRoot, bundle.root) : temporaryRoot;
  await mkdir(stage, { recursive: true });
  const archiveEntries = [];

  for (const [entryPath, descriptor] of bundle.entries) {
    const destination = join(stage, entryPath);
    await mkdir(dirname(destination), { recursive: true });
    let bytes = await readDescriptor(descriptor);
    if (bundle.transform) bytes = bundle.transform(entryPath, bytes);
    await writeFile(destination, bytes);
    await chmod(destination, 0o644);
    await utimes(destination, fixedTime, fixedTime);
    archiveEntries.push(bundle.root ? `${bundle.root}/${entryPath}` : entryPath);
  }
  await verifyStagedClosure(bundle, stage);

  const output = join(temporaryRoot, "bundle.zip");
  execFileSync("zip", ["-X", "-q", output, ...archiveEntries], {
    cwd: temporaryRoot,
    env: { ...process.env, TZ: "UTC" },
  });
  return output;
}

async function main() {
  for (const bundle of bundles) {
    await verifyManifestReceipts(bundle);
    const temporaryRoot = await mkdtemp(join(tmpdir(), "strategy-canvas-bundle-"));
    try {
      const built = await buildBundle(bundle, temporaryRoot);
      if (checkOnly) {
        const [expected, actual] = await Promise.all([readFile(bundle.archivePath), readFile(built)]);
        if (!expected.equals(actual)) throw new Error(`${bundle.name} differs from its deterministic source snapshot`);
        process.stdout.write(`current ${bundle.name}\n`);
      } else {
        await copyFile(built, bundle.archivePath);
        process.stdout.write(`rebuilt ${bundle.name}\n`);
      }
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});

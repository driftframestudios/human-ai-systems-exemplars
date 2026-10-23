import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

import {
  artifactAttribution,
  artifactAuthor,
  artifactLicense
} from "../../tools/attribution-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const familyRoot = path.join(repositoryRoot, "visual-fidelity-contracts");

const readJson = async (relativePath) => JSON.parse(await readFile(path.join(repositoryRoot, relativePath), "utf8"));
const exists = async (relativePath) => access(path.join(repositoryRoot, relativePath)).then(() => true, () => false);
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/u;
const publicTextExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs"]);
const publicBoundaryPatterns = Object.freeze([
  {
    label: "a direct Notion route",
    pattern: /https?:\/\/(?:[^/\s"'<>]+\.)?notion\.(?:com|site|so)(?:[/?#]|\b)/iu
  },
  {
    label: "a private POSIX user coordinate",
    pattern: /(?:file:\/\/)?\/(?:Users|home)\/[^/\s"'<>]+/iu
  },
  {
    label: "a private macOS temporary coordinate",
    pattern: /(?:file:\/\/)?\/(?:private\/)?var\/folders\/[^/\s"'<>]+/iu
  },
  {
    label: "a private Windows user coordinate",
    pattern: /\b[A-Za-z]:\\(?:Users|Documents and Settings)\\/u
  },
  {
    label: "a private Codex coordinate",
    pattern: /(?:^|[/'"])(?:\.codex)(?:[/'"])/imu
  },
  {
    label: "the private collaboration repository name",
    pattern: /\bprototype-exemplars\b/iu
  }
]);
const secretShapedPatterns = Object.freeze([
  {
    label: "a credential-shaped assignment",
    pattern: /\b(?:api[ _-]?key|password|secret|token)\s*:\s*\S+/iu
  },
  {
    label: "a provider-token shape",
    pattern: /\b(?:github_pat|ghp|gho|ghu|ghs|ghr|sk)_[\p{L}\p{N}_-]{8,}\b/iu
  },
  {
    label: "a private-key header",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u
  }
]);

const collectPublicTextFiles = async (directory) => {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectPublicTextFiles(absolutePath));
    } else if (entry.isFile() && publicTextExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(absolutePath);
    }
  }
  return files;
};

const isCalendarDate = (value) => {
  const match = datePattern.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
};

const isDateTime = (value) => (
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)
  && Number.isFinite(Date.parse(value))
);

const isUri = (value) => {
  try {
    return Boolean(new URL(value).protocol);
  } catch {
    return false;
  }
};

const strictAjv = () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  ajv.addFormat("date", isCalendarDate);
  ajv.addFormat("date-time", isDateTime);
  ajv.addFormat("uri", isUri);
  return ajv;
};

const schemaPaths = {
  contract: "visual-fidelity-contracts/schemas/visual-fidelity-contract.schema.json",
  lab: "visual-fidelity-contracts/schemas/lab-state.schema.json",
  catalog: "visual-fidelity-contracts/schemas/catalog.schema.json",
  exampleCatalog: "visual-fidelity-contracts/schemas/example-catalog.schema.json",
  lineage: "visual-fidelity-contracts/schemas/public-lineage.schema.json"
};

test("visual-fidelity schemas compile in strict Draft 2020-12 mode", async () => {
  for (const [name, relativePath] of Object.entries(schemaPaths)) {
    const schema = await readJson(relativePath);
    assert.doesNotThrow(() => strictAjv().compile(schema), `${name} schema should compile`);
    assert.match(schema.$id, /^https:\/\/schemas\.vik\.guru\/visual-fidelity-contracts\/1\.0\.0\//u);
  }
});
test("contract schema accepts complete records and rejects a missing authority role", async () => {
  const schema = await readJson(schemaPaths.contract);
  const validate = strictAjv().compile(schema);
  const acceptedPaths = [
    "visual-fidelity-contracts/contracts/industrial-ink/contract.v1.json",
    "visual-fidelity-contracts/contracts/soft-color-blocking/contract.v1.json",
    "visual-fidelity-contracts/schemas/fixtures/contracts/accepted/minimum-art-direction.v1.json"
  ];

  for (const relativePath of acceptedPaths) {
    const instance = await readJson(relativePath);
    assert.equal(validate(instance), true, `${relativePath}: ${JSON.stringify(validate.errors)}`);
    const measure = instance.typography.readingMeasureCh;
    assert.ok(measure.targetMin <= measure.targetMax, `${relativePath}: target reading range`);
    assert.ok(measure.targetMax <= measure.absoluteMax, `${relativePath}: absolute reading maximum`);
    const declaredPaths = [
      instance.sourceAuthority.sourcePath,
      instance.tokens.path,
      ...instance.references.canonicalExamples.map(({ path: examplePath }) => examplePath),
      ...instance.references.codeSamples,
      ...instance.references.tests
    ];
    for (const declaredPath of declaredPaths) {
      assert.equal(await exists(declaredPath), true, `${relativePath}: ${declaredPath}`);
    }
  }

  const invalidDate = {
    ...await readJson(acceptedPaths[0]),
    reviewedOn: "20 October 2026"
  };
  assert.equal(validate(invalidDate), false);
  assert.ok(validate.errors.some((error) => error.instancePath === "/reviewedOn" && error.keyword === "format"));

  const rejected = await readJson(
    "visual-fidelity-contracts/schemas/fixtures/contracts/rejected/missing-publication-owner.v1.json"
  );
  assert.equal(validate(rejected), false);
  assert.ok(validate.errors.some((error) =>
    error.instancePath === "/sourceAuthority"
    && error.keyword === "required"
    && error.params.missingProperty === "publicationOwner"
  ), JSON.stringify(validate.errors));
});

test("lab-state schema preserves accepted, draft, request, recovery, and authority boundaries", async () => {
  const schema = await readJson(schemaPaths.lab);
  const validate = strictAjv().compile(schema);
  const accepted = await readJson(
    "visual-fidelity-contracts/schemas/fixtures/labs/accepted/retained-draft.v1.json"
  );
  assert.equal(validate(accepted), true, JSON.stringify(validate.errors));
  assert.notDeepEqual(accepted.acceptedState.values, accepted.draftState.values);
  assert.ok(accepted.recovery.availableActions.includes(accepted.recovery.nextAction));

  const rejected = await readJson(
    "visual-fidelity-contracts/schemas/fixtures/labs/rejected/unknown-phase.v1.json"
  );
  assert.equal(validate(rejected), false);
  assert.ok(validate.errors.some((error) => error.instancePath === "/phase" && error.keyword === "enum"));
});

test("catalog, example, and lineage fixtures isolate their malformed boundaries", async () => {
  const cases = [
    {
      name: "catalog",
      schemaPath: schemaPaths.catalog,
      acceptedPath: "visual-fidelity-contracts/schemas/fixtures/catalogs/accepted/minimum-catalog.v1.json",
      rejectedPath: "visual-fidelity-contracts/schemas/fixtures/catalogs/rejected/art-direction-missing-public-route.v1.json",
      expectedError: {
        instancePath: "/contracts/0",
        keyword: "required",
        params: { missingProperty: "publicRoute" }
      }
    },
    {
      name: "example catalog",
      schemaPath: schemaPaths.exampleCatalog,
      acceptedPath: "visual-fidelity-contracts/schemas/fixtures/example-catalogs/accepted/minimum-example-catalog.v1.json",
      rejectedPath: "visual-fidelity-contracts/schemas/fixtures/example-catalogs/rejected/empty-example-family.v1.json",
      expectedError: {
        instancePath: "/examples",
        keyword: "minItems",
        params: { limit: 4 }
      }
    },
    {
      name: "public lineage",
      schemaPath: schemaPaths.lineage,
      acceptedPath: "visual-fidelity-contracts/schemas/fixtures/lineage/accepted/minimum-public-lineage.v1.json",
      rejectedPath: "visual-fidelity-contracts/schemas/fixtures/lineage/rejected/non-public-route.v1.json",
      expectedError: {
        instancePath: "/records/0/publicRoute",
        keyword: "pattern",
        params: { pattern: "^https://kindlight\\.systems/" }
      }
    }
  ];

  for (const fixtureCase of cases) {
    const validate = strictAjv().compile(await readJson(fixtureCase.schemaPath));
    const accepted = await readJson(fixtureCase.acceptedPath);
    assert.equal(validate(accepted), true, `${fixtureCase.name} accepted fixture: ${JSON.stringify(validate.errors)}`);

    const rejected = await readJson(fixtureCase.rejectedPath);
    assert.equal(validate(rejected), false, `${fixtureCase.name} rejected fixture should fail`);
    assert.ok(validate.errors.some((error) => (
      error.instancePath === fixtureCase.expectedError.instancePath
      && error.keyword === fixtureCase.expectedError.keyword
      && JSON.stringify(error.params) === JSON.stringify(fixtureCase.expectedError.params)
    )), `${fixtureCase.name} rejected fixture: ${JSON.stringify(validate.errors)}`);
  }
});

test("catalog has unique IDs and complete path closure", async () => {
  const catalog = await readJson("visual-fidelity-contracts/catalog.v1.json");
  const validate = strictAjv().compile(await readJson(schemaPaths.catalog));
  assert.equal(validate(catalog), true, JSON.stringify(validate.errors));

  const ids = catalog.contracts.map(({ id }) => id);
  const resourceIds = catalog.resources.map(({ id }) => id);
  assert.equal(catalog.contracts.length, 9, "catalog should inventory the current nine contract families");
  assert.equal(new Set(ids).size, ids.length, "contract IDs must be unique");
  assert.ok(ids.includes("vfc:industrial-ink"));
  assert.ok(ids.includes("vfc:soft-color-blocking"));
  assert.equal(catalog.resources.length, 12, "catalog should inventory labs, probes, and the example collection");
  assert.equal(new Set(resourceIds).size, resourceIds.length, "resource IDs must be unique");
  assert.ok(resourceIds.includes("vfc-resource:service-boundary-lab"));
  assert.ok(resourceIds.includes("vfc-resource:components-and-data-probes"));
  assert.ok(resourceIds.includes("vfc-resource:design-token-pipeline-probes"));
  assert.ok(resourceIds.includes("vfc-resource:pattern-library"));

  for (const entry of catalog.contracts) {
    for (const key of ["sourcePath", "recordPath", "tokensPath", "specimenPath"]) {
      if (entry[key]) assert.equal(await exists(entry[key]), true, `${entry.id} ${key}: ${entry[key]}`);
    }
    for (const relativePath of [...entry.examples, ...entry.tests]) {
      assert.equal(await exists(relativePath), true, `${entry.id} declared path: ${relativePath}`);
    }
  }
  for (const resource of catalog.resources) {
    assert.match(resource.publicRoute, /^https:\/\/kindlight\.systems\//u, `${resource.id} publicRoute`);
    assert.equal(await exists(resource.sourcePath), true, `${resource.id} sourcePath: ${resource.sourcePath}`);
    for (const relativePath of resource.tests) {
      assert.equal(await exists(relativePath), true, `${resource.id} declared test: ${relativePath}`);
    }
  }
});

test("cataloged labs declare their exact implementation versions and behavior routes", async () => {
  const [catalog, packageManifest, serviceModel] = await Promise.all([
    readJson("visual-fidelity-contracts/catalog.v1.json"),
    readJson("package.json"),
    readFile(path.join(familyRoot, "labs/service-boundary-lab/service-boundary-model.js"), "utf8")
  ]);
  const resources = new Map(catalog.resources.map((resource) => [resource.id, resource]));
  const lifecycle = resources.get("vfc-resource:lifecycle-lab");
  const service = resources.get("vfc-resource:service-boundary-lab");

  assert.ok(lifecycle.tests.includes("tests/visual-fidelity-contracts/lifecycle-framework-adapters.browser.mjs"));
  assert.equal(packageManifest.devDependencies.react, "19.2.0");
  assert.equal(packageManifest.devDependencies["react-dom"], "19.2.0");
  assert.equal(packageManifest.devDependencies.esbuild, "0.28.2");
  assert.match(serviceModel, new RegExp(`MODEL_VERSION = '${service.version.replaceAll(".", "\\.")}'`, "u"));
});

test("standalone HTML artifacts carry the shared public attribution contract", async () => {
  const htmlPaths = [
    "visual-fidelity-contracts/contracts/industrial-ink/specimen.html",
    "visual-fidelity-contracts/contracts/soft-color-blocking/specimen.html",
    "visual-fidelity-contracts/examples/index.html",
    "visual-fidelity-contracts/labs/lifecycle-lab/index.html",
    "visual-fidelity-contracts/labs/lifecycle-lab/sandbox-specimen.html",
    "visual-fidelity-contracts/labs/component-lab/index.html",
    "visual-fidelity-contracts/labs/component-lab/standalone/index.html",
    "visual-fidelity-contracts/labs/data-view-lab/index.html",
    "visual-fidelity-contracts/labs/data-view-lab/standalone/index.html",
    "visual-fidelity-contracts/labs/service-boundary-lab/index.html",
    "visual-fidelity-contracts/labs/service-boundary-lab/sandbox-specimen.html",
    "visual-fidelity-contracts/labs/service-boundary-lab/sandbox-child.html"
  ];

  for (const relativePath of htmlPaths) {
    const html = await readFile(path.join(repositoryRoot, relativePath), "utf8");
    assert.match(html, new RegExp(`<meta name="author" content="${artifactAuthor}">`, "u"), relativePath);
    assert.match(html, new RegExp(`<link rel="license" href="${artifactLicense.replaceAll(".", "\\.")}">`, "u"), relativePath);
    assert.ok(html.includes(artifactAttribution), `${relativePath}: visible attribution`);
  }
});

test("off-canvas skip links retain a viewport-bounded focus target at enlarged text", async () => {
  const styleOwners = [
    "visual-fidelity-contracts/contracts/industrial-ink/specimen.html",
    "visual-fidelity-contracts/contracts/soft-color-blocking/specimen.html",
    "visual-fidelity-contracts/examples/styles.css",
    "visual-fidelity-contracts/labs/component-lab/src/styles/lab.css",
    "visual-fidelity-contracts/labs/data-view-lab/src/styles/lab.css",
    "visual-fidelity-contracts/labs/lifecycle-lab/styles.css",
    "visual-fidelity-contracts/labs/service-boundary-lab/styles.css"
  ];
  const boundedSkipLink = /\.skip-link\s*\{[^}]*max-inline-size:\s*calc\(100% - [^)]+\);[^}]*overflow-wrap:\s*anywhere;[^}]*\}/u;

  for (const relativePath of styleOwners) {
    const source = await readFile(path.join(repositoryRoot, relativePath), "utf8");
    assert.match(source, boundedSkipLink, `${relativePath}: bounded skip-link focus target`);
  }
});

test("example catalog validates the rendered pattern collection", async () => {
  const catalog = await readJson("visual-fidelity-contracts/examples/catalog.v1.json");
  const validate = strictAjv().compile(await readJson(schemaPaths.exampleCatalog));
  assert.equal(validate(catalog), true, JSON.stringify(validate.errors));

  const ids = catalog.examples.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length, "example IDs must be unique");
  assert.equal(catalog.examples.length, 4, "the current collection carries four representative families");
});

test("public lineage maps repository sources to cataloged public contracts", async () => {
  const catalog = await readJson("visual-fidelity-contracts/catalog.v1.json");
  const lineage = await readJson("visual-fidelity-contracts/publication/public-lineage.v1.json");
  const validate = strictAjv().compile(await readJson(schemaPaths.lineage));
  assert.equal(validate(lineage), true, JSON.stringify(validate.errors));

  const byId = new Map(catalog.contracts.map((entry) => [entry.id, entry]));
  assert.deepEqual(
    new Set(lineage.records.map(({ contractId }) => contractId)),
    new Set(["vfc:industrial-ink", "vfc:soft-color-blocking"])
  );
  for (const record of lineage.records) {
    const entry = byId.get(record.contractId);
    assert.ok(entry, record.contractId);
    assert.equal(record.repositorySource, entry.sourcePath);
    assert.equal(record.publicRoute, entry.publicRoute);
    assert.notEqual(record.semanticOwner, record.repositorySource);
    assert.equal(await exists(record.repositorySource), true);
  }
});

test("public Visual Fidelity text artifacts retain public-safe locators and secret boundaries", async () => {
  const files = await collectPublicTextFiles(familyRoot);
  const relativePaths = files.map((absolutePath) => path.relative(familyRoot, absolutePath).split(path.sep).join("/"));
  for (const expectedPath of [
    "README.md",
    "contracts/industrial-ink/specimen.html",
    "examples/catalog.v1.json",
    "labs/component-lab/src/controller.js",
    "probes/ai/README.md",
    "schemas/public-lineage.schema.json"
  ]) {
    assert.ok(relativePaths.includes(expectedPath), `recursive public-boundary scan includes ${expectedPath}`);
  }
  assert.equal(relativePaths.some((relativePath) => relativePath.endsWith(".webp")), false);

  for (const [index, absolutePath] of files.entries()) {
    const relativePath = relativePaths[index];
    const source = await readFile(absolutePath, "utf8");
    for (const { label, pattern } of [...publicBoundaryPatterns, ...secretShapedPatterns]) {
      assert.doesNotMatch(source, pattern, `${relativePath} contains ${label}`);
    }
  }
});

test("foundation directory contains the declared decision routes", async () => {
  const names = [
    "contract-anatomy.md",
    "semantic-state-and-ownership.md",
    "color-contrast-and-forced-colors.md",
    "typography-reading-measure.md",
    "responsive-overflow-and-print.md",
    "svg-and-media-accessibility.md",
    "evidence-authority-and-publication.md",
    "design-token-pipeline.md"
  ];
  for (const name of names) {
    const source = await readFile(path.join(familyRoot, "foundations", name), "utf8");
    assert.match(source, /^# /u, name);
    assert.match(source, /## (?:Review probe|Completion)/u, name);
  }
});

test("foundation and contract Markdown links resolve locally", async () => {
  const documents = [
    "visual-fidelity-contracts/README.md",
    "visual-fidelity-contracts/contracts/industrial-ink/README.md",
    "visual-fidelity-contracts/contracts/soft-color-blocking/README.md",
    "visual-fidelity-contracts/schemas/fixtures/README.md",
    ...[
      "contract-anatomy.md",
      "semantic-state-and-ownership.md",
      "color-contrast-and-forced-colors.md",
      "typography-reading-measure.md",
      "responsive-overflow-and-print.md",
      "svg-and-media-accessibility.md",
      "evidence-authority-and-publication.md",
      "design-token-pipeline.md"
    ].map((name) => `visual-fidelity-contracts/foundations/${name}`)
  ];

  for (const relativePath of documents) {
    const absolutePath = path.join(repositoryRoot, relativePath);
    const source = await readFile(absolutePath, "utf8");
    const targets = [...source.matchAll(/\[[^\]]+\]\(([^)]+)\)/gmu)]
      .map((match) => match[1])
      .filter((target) => !/^(?:https?:|#)/u.test(target))
      .map((target) => target.split("#", 1)[0]);
    for (const target of targets) {
      const resolved = path.resolve(path.dirname(absolutePath), target);
      await assert.doesNotReject(access(resolved), `${relativePath}: ${target}`);
    }
  }
});

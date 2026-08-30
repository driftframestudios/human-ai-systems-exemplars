import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const prototypesRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/prototypes"
);
const narrativeRoot = resolve(prototypesRoot, "narrative-architectures");
const composerRoot = resolve(narrativeRoot, "narrative-capsule-composer");
const semanticRoot = resolve(
  narrativeRoot,
  "semantic-sampling-tableau/terminology-exploration"
);
const technologyRoot = resolve(narrativeRoot, "technology-fit-sampling-tableau");
const threadkeepingRoot = resolve(
  narrativeRoot,
  "threadkeeping-ledger/threadkeeping-ledger-chimeric-prototype-bundle-v0.1"
);

const schemaPaths = {
  composer: resolve(composerRoot, "narrative-capsule-composition.schema.v0.1.json"),
  semantic: resolve(semanticRoot, "narrative-sampling-tableau-state.schema.v0.1.json"),
  technology: resolve(technologyRoot, "technology-fit-sampling-tableau-state.schema.v0.1.json"),
  threadkeeping: resolve(threadkeepingRoot, "threadkeeping-ledger.schema.v0.1.json"),
  localManifest: resolve(prototypesRoot, "prototype-local-manifest.schema.json")
};

const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

function strictAjv() {
  return new Ajv2020({
    strict: true,
    allErrors: true,
    validateFormats: false
  });
}

async function compile(path) {
  return strictAjv().compile(await json(path));
}

async function compileDefinition(path, definition) {
  const schema = await json(path);
  const ajv = strictAjv();
  ajv.addSchema(schema);
  return ajv.compile({ $ref: `${schema.$id}#/$defs/${definition}` });
}

async function findNamedFiles(directory, fileName) {
  const matches = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) matches.push(...await findNamedFiles(path, fileName));
    else if (entry.name === fileName) matches.push(path);
  }
  return matches.sort();
}

async function threadkeepingExample() {
  const source = await readFile(
    resolve(threadkeepingRoot, "threadkeeping-ledger-chimeric-prototype-v0.1.html"),
    "utf8"
  );
  const match = source.match(/^const INITIAL = (.+);$/m);
  assert.ok(match, "Threadkeeping Ledger publishes one adjacent INITIAL example");
  return JSON.parse(match[1]);
}

test("current Narrative and local-manifest schemas compile in the named strict posture", async (t) => {
  for (const [name, path] of Object.entries(schemaPaths)) {
    await t.test(name, async () => {
      const validate = await compile(path);
      assert.equal(typeof validate, "function");
    });
  }
});

test("Narrative Capsule composition examples express accepted and rejected contracts", async () => {
  const validate = await compile(schemaPaths.composer);
  const valid = await json(
    resolve(composerRoot, "narrative-capsule-composition.example.valid.v0.1.json")
  );
  const invalid = await json(
    resolve(composerRoot, "narrative-capsule-composition.example.invalid.v0.1.json")
  );

  assert.equal(validate(valid), true, JSON.stringify(validate.errors, null, 2));
  assert.equal(validate(invalid), false, "the boundary example should remain outside the contract");
  assert.ok(validate.errors.length > 0);
});

test("Narrative Capsule AI projections carry the prompt sections needed for exchange", async () => {
  const validate = await compileDefinition(schemaPaths.composer, "AIContextProjection");
  const projection = {
    id: "projection-material-example",
    type: "AIContextProjection",
    projectionOfCapsuleVersionRefs: ["na:capsules/expectation/v0.1"],
    projectionOfModuleRefs: ["module-expectation"],
    compositionRef: "composition-material-example",
    targetPairRef: "ca:strategy-canvas",
    targetCognitiveMove: "compare current, sufficient, and desired support",
    promptRole: "generate",
    includedModuleRefs: ["module-expectation"],
    withheldModuleRefs: [],
    promptSections: [{
      id: "section-source-identity",
      heading: "Source identity",
      body: "Versioned capsule sources remain the exchange authority.",
      semanticRole: "identity"
    }],
    targetBindingRefs: ["binding-strategy-canvas-good-enough"],
    knownGapRefs: ["gap-required-expectation-held-open"],
    boundaryManifestRef: "boundary-manifest-current",
    requiredAcknowledgements: ["held-open required support"],
    requestedOutputKinds: ["json", "jsonld"],
    responseContract: "Return the received, held-open, and requested support state.",
    sourceTruthStatement: "Versioned capsule sources remain source truth.",
    contentHash: "fnv1a32-utf8:7b3f92a1",
    generatedAt: "2026-08-26T12:00:00.000Z",
    reviewState: "working"
  };

  assert.equal(validate(projection), true, JSON.stringify(validate.errors, null, 2));

  const incomplete = clone(projection);
  delete incomplete.promptSections;
  assert.equal(validate(incomplete), false);
  assert.ok(validate.errors.some(({ keyword, params }) =>
    keyword === "required" && params.missingProperty === "promptSections"
  ));

  const schema = await json(schemaPaths.composer);
  assert.ok(
    schema.$defs.CapsuleCompositionGap.properties.gapType.enum.includes("held_open_required_module"),
    "held-open required support should remain distinguishable from absent support"
  );
});

test("Semantic Sampling material state has meaningful identity and run-mode boundaries", async () => {
  const validate = await compile(schemaPaths.semantic);
  const valid = await json(
    resolve(semanticRoot, "conation-motion-naming-sampling.example.v0.1.json")
  );
  const invalid = clone(valid);
  delete invalid.id;

  assert.equal(validate(valid), true, JSON.stringify(validate.errors, null, 2));
  assert.equal(validate(invalid), false);
  assert.ok(validate.errors.some(({ keyword, params }) =>
    keyword === "required" && params.missingProperty === "id"
  ));

  const unknownRunMode = clone(valid);
  unknownRunMode.runs[0].candidateSetSemantics = "unknown_mode";
  assert.equal(validate(unknownRunMode), false);
  assert.ok(validate.errors.some(({ keyword, instancePath }) =>
    keyword === "enum" && instancePath === "/runs/0/candidateSetSemantics"
  ));
});

test("Technology Fit material state has a meaningful required-field boundary", async () => {
  const validate = await compile(schemaPaths.technology);
  const valid = await json(
    resolve(technologyRoot, "front-end-stack-selection.example.v0.1.json")
  );
  const invalid = clone(valid);
  delete invalid.id;

  assert.equal(validate(valid), true, JSON.stringify(validate.errors, null, 2));
  assert.equal(validate(invalid), false);
  assert.ok(validate.errors.some(({ keyword, params }) =>
    keyword === "required" && params.missingProperty === "id"
  ));

  const insufficientComparison = clone(valid);
  insufficientComparison.runs[0].candidates = [insufficientComparison.runs[0].candidates[0]];
  assert.equal(validate(insufficientComparison), false);
  assert.ok(validate.errors.some(({ keyword, instancePath }) =>
    keyword === "minItems" && instancePath === "/runs/0/candidates"
  ));
});

test("Technology Fit inline seed is an exact projection of its canonical example state", async () => {
  const canonical = await json(
    resolve(technologyRoot, "front-end-stack-selection.example.v0.1.json")
  );
  const html = await readFile(
    resolve(technologyRoot, "technology-fit-sampling-tableau-chimeric-prototype-v0.2.html"),
    "utf8"
  );
  const match = html.match(/^const SEED=(.+);$/mu);
  assert.ok(match, "Technology Fit publishes one adjacent SEED projection");
  assert.deepEqual(JSON.parse(match[1]), canonical);
  assert.deepEqual(canonical.runs.map(({ status }) => status), ["sample_state", "sample_state"]);
});

test("Threadkeeping Ledger material state has a meaningful identity boundary", async () => {
  const validate = await compile(schemaPaths.threadkeeping);
  const valid = await threadkeepingExample();
  const invalid = clone(valid);
  delete invalid.artifactIdentity;

  assert.equal(validate(valid), true, JSON.stringify(validate.errors, null, 2));
  assert.equal(validate(invalid), false);
  assert.ok(validate.errors.some(({ keyword, params }) =>
    keyword === "required" && params.missingProperty === "artifactIdentity"
  ));

  const literal = clone(valid);
  literal.threadkeeper.entries[0].id = "tk-entry-'quoted-<literal>";
  literal.threadkeeper.entries[0].title = "A quoted \"title\" with <literal> markup";
  literal.threadkeeper.entries[0].summary = "Literal collaborator text stays intact: 'single', \"double\", <angle>, and & ampersand.";
  assert.equal(validate(literal), true, JSON.stringify(validate.errors, null, 2));
});

test("every Context-local prototype manifest satisfies the shared source relationship", async (t) => {
  const validate = await compile(schemaPaths.localManifest);
  const manifests = await findNamedFiles(
    prototypesRoot,
    "context-canvas-local-manifest-v0.1.json"
  );
  assert.ok(manifests.length >= 5, "current projection families supply material manifests");

  for (const path of manifests) {
    await t.test(path.slice(repositoryRoot.length + 1), async () => {
      const valid = await json(path);
      assert.equal(validate(valid), true, JSON.stringify(validate.errors, null, 2));

      const invalid = clone(valid);
      delete invalid.id;
      assert.equal(validate(invalid), false);
      assert.ok(validate.errors.some(({ keyword, params }) =>
        keyword === "required" && params.missingProperty === "id"
      ));
    });
  }
});

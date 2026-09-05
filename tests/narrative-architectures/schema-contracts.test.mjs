import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const prototypesRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/prototypes"
);
const narrativeRoot = resolve(prototypesRoot, "narrative-architectures");
const composerRoot = resolve(narrativeRoot, "narrative-capsule-composer");
const coreRoot = resolve(
  repositoryRoot,
  "core-architectures-chimeric-prototype-current-pack-v0.1"
);
const contextCoreRoot = resolve(prototypesRoot, "core-architectures/chimeric-pack-v0.1");
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

function familyIndexSeed(source) {
  const match = source.match(/const seed = (\{[\s\S]+?\n\});\nlet state = structuredClone\(seed\);/u);
  assert.ok(match, "the family index publishes one adjacent seed");
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

test("Narrative Capsule Composer publishes the shared Prompt Capsule exchange contract", async () => {
  const html = await readFile(
    resolve(composerRoot, "narrative-capsules-chimeric-prototype-v0.1.html"),
    "utf8"
  );
  assert.match(html, /const PROMPT_CAPSULE_CONTRACT="prompt-capsule\/0\.1\.0";/u);
  assert.match(html, /const PROMPT_CAPSULE_STATE_CONTRACT="narrative-capsule-composition\/0\.1";/u);
  assert.match(html, /<fieldset[^>]+id="promptViewControl"[\s\S]*?<legend>Markdown view<\/legend>/u);
  assert.match(html, /type="radio"[^>]+value="plain"[^>]+checked/u);
  assert.match(html, /type="radio"[^>]+value="skill-assisted"/u);
  assert.match(html, /<noscript>[\s\S]*?complete plain Markdown remains available/u);
  assert.match(html, /<details[^>]+data-prompt-related-loops[\s\S]*?<summary>Related loops<\/summary>/u);
  assert.doesNotMatch(html, /__COMPOSER_PROMPT_CAPSULE_PLAIN_BASELINE__/u);
  assert.match(html, /https:\/\/schemas\.radiantnull\.com\/collaboration\/#repository-reentry/u);
  assert.match(html, /https:\/\/schemas\.radiantnull\.com\/collaboration\/#visitor-surface-change/u);
  assert.match(html, /window\.narrativeCapsuleComposer=Object\.freeze\(/u);

  const revision = "b8b305c78b82a288ae2aca9574bb86d7d3d574d9";
  assert.match(html, new RegExp(`const PROMPT_CAPSULE_SKILL_REVISION="${revision}";`, "u"));
  const skills = [
    [".agents/skills/source-authority-mapping/SKILL.md", "706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5"],
    [".agents/skills/stateful-artifact-behavior-contracts/SKILL.md", "596f139100a448139c7c4ceb2dc6d1b470dc86ff19df4ed68a9ac765005f576a"],
    [".agents/skills/bounded-support-routing/SKILL.md", "80dff2f88bc919500d9557a0ff67210e68cbdf1c69bbe63ac29b93662f9bd402"],
  ];
  for (const [path, expectedDigest] of skills) {
    const source = await readFile(resolve(repositoryRoot, path));
    assert.equal(createHash("sha256").update(source).digest("hex"), expectedDigest);
    assert.ok(html.includes(`path:"${path}"`));
    assert.ok(html.includes(`sha256:"${expectedDigest}"`));
  }
});

test("Narrative Capsule links and bundles the Context-received Core family index", async () => {
  const [coreManifest, contextCoreManifest, composerManifest, composer, targetRegistry] = await Promise.all([
    json(resolve(coreRoot, "core-architectures-chimeric-prototype-manifest-v0.1.json")),
    json(resolve(contextCoreRoot, "core-architectures-chimeric-prototype-manifest-v0.1.json")),
    json(resolve(composerRoot, "narrative-capsules-chimeric-prototype-manifest-v0.1.json")),
    readFile(resolve(composerRoot, "narrative-capsules-chimeric-prototype-v0.1.html"), "utf8"),
    json(resolve(composerRoot, "core-architecture-target-pair-registry.v0.1.json"))
  ]);
  const familyIndex = coreManifest.prototypes.find(({ id }) => id === "core-architecture-family-index");
  const currentCompanion = `companions/${familyIndex.file}`;
  const priorCompanion = "companions/core-architecture-family-index-chimeric-prototype-v0.1.html";

  assert.ok(composerManifest.files.companions.includes(currentCompanion));
  assert.ok(!composerManifest.files.companions.includes(priorCompanion));
  assert.match(composer, new RegExp(`href=["']${currentCompanion.replaceAll(".", "\\.")}["']`, "u"));

  const [companion, acceptedFamilyIndex] = await Promise.all([
    readFile(resolve(composerRoot, currentCompanion), "utf8"),
    readFile(resolve(contextCoreRoot, familyIndex.file), "utf8")
  ]);
  const expectedCompanion = acceptedFamilyIndex.replace(
    'href="../../../core-architectures-orientation-index.html"',
    'href="../../../../core-architectures-orientation-index.html"'
  );
  assert.notEqual(expectedCompanion, acceptedFamilyIndex, "the companion owns one local route adaptation");
  assert.equal(companion, expectedCompanion, "the companion otherwise retains the accepted current index");
  assert.doesNotMatch(companion, /https:\/\/example\.org\/core-architectures(?:#|\/)/u);
  assert.match(companion, /https:\/\/vik\.guru\/vocabulary\/core-architectures#/u);
  const companionSeed = familyIndexSeed(companion);
  assert.equal(companionSeed.artifact_identity.version, familyIndex.version);

  const currentFiles = new Map(
    coreManifest.prototypes
      .filter(({ id }) => id !== "core-architecture-family-index")
      .map(({ id, file }) => [id, file])
  );
  const contextStrategyCanvas = contextCoreManifest.prototypes.find(({ id }) => id === "strategy-canvas");
  assert.equal(contextStrategyCanvas.expression, "context-canvas");
  assert.notEqual(
    contextStrategyCanvas.file,
    currentFiles.get("strategy-canvas"),
    "the independently maintained Context Strategy Canvas keeps its own version coordinate"
  );
  currentFiles.set("strategy-canvas", contextStrategyCanvas.file);
  assert.deepEqual(
    new Map(companionSeed.cards.map(({ id, file }) => [id, file])),
    currentFiles,
    "the companion index keeps current Core coordinates and the declared Context Strategy adaptation"
  );

  const heart = coreManifest.prototypes.find(({ id }) => id === "heart-chart");
  assert.equal(
    targetRegistry.cards.find(({ id }) => id === heart.id).prototypeRef,
    heart.file,
    "the target registry and current family index agree on HEART"
  );

  const archive = resolve(composerRoot, "narrative-capsules-chimeric-prototype-bundle-v0.1.zip");
  const archiveRoot = "narrative-capsules-chimeric-prototype-v0.1";
  const archiveEntries = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" }).split("\n");
  assert.ok(archiveEntries.includes(`${archiveRoot}/${currentCompanion}`));
  assert.ok(!archiveEntries.includes(`${archiveRoot}/${priorCompanion}`));
  const bundledCompanion = execFileSync(
    "unzip",
    ["-p", archive, `${archiveRoot}/${currentCompanion}`],
    { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }
  );
  assert.doesNotMatch(bundledCompanion, /https:\/\/example\.org\/core-architectures(?:#|\/)/u);
  assert.deepEqual(familyIndexSeed(bundledCompanion), companionSeed);

  const historicalCompanion = await readFile(resolve(composerRoot, priorCompanion), "utf8");
  assert.match(historicalCompanion, /https:\/\/example\.org\/core-architectures#/u);
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

test("Semantic Sampling publishes its canonical state and Prompt Capsule coordinates together", async () => {
  const canonical = await json(
    resolve(semanticRoot, "conation-motion-naming-sampling.example.v0.1.json")
  );
  const html = await readFile(
    resolve(semanticRoot, "narrative-sampling-tableau-chimeric-prototype-v0.1.html"),
    "utf8"
  );
  const match = html.match(/^const SEED=(.+);$/mu);
  assert.ok(match, "Semantic Sampling publishes one adjacent SEED projection");
  assert.deepEqual(JSON.parse(match[1]), canonical);

  assert.match(html, /const PROMPT_CAPSULE_CONTRACT="prompt-capsule\/0\.1\.0";/u);
  assert.match(html, /const PROMPT_CAPSULE_STATE_CONTRACT="narrative-sampling-tableau-state\/0\.1";/u);
  assert.match(html, /<fieldset[^>]+id="promptViewControl"[\s\S]*?<legend>Markdown view<\/legend>/u);
  assert.match(html, /type="radio"[^>]+value="plain"[^>]+checked/u);
  assert.match(html, /type="radio"[^>]+value="skill-assisted"/u);
  assert.match(html, /<noscript>[\s\S]*?complete plain Markdown remains available/u);
  assert.match(html, /<details[^>]+data-prompt-related-loops[\s\S]*?<summary>Related loops<\/summary>/u);
  assert.equal((html.match(/data-related-loop-id=/gu) || []).length, 2);
  assert.doesNotMatch(html, /__SEMANTIC_PROMPT_CAPSULE_PLAIN_BASELINE__/u);
  assert.match(html, /https:\/\/schemas\.radiantnull\.com\/collaboration\/#skill-from-receiving-use/u);
  assert.match(html, /https:\/\/schemas\.radiantnull\.com\/collaboration\/#visitor-surface-change/u);
  assert.match(html, /Candidate-set semantics: `open_exclusive`/u);
  assert.doesNotMatch(html, /Candidate-set semantics: `open\\_exclusive`/u);

  const revision = "b8b305c78b82a288ae2aca9574bb86d7d3d574d9";
  assert.match(html, new RegExp(`const PROMPT_CAPSULE_SKILL_REVISION="${revision}";`, "u"));
  const skills = [
    [".agents/skills/practitioner-probe/SKILL.md", "348ea113a75af3487a420e2075aa199297673aca0ba0a69e5a19d6c5a463776c"],
    [".agents/skills/evidence-grounded-research-spike/SKILL.md", "844fc0c6b0b956b81984a2c2d47d9252abadeb0a6554c5ef4734d0f1e5f4b531"],
    [".agents/skills/source-authority-mapping/SKILL.md", "706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5"],
  ];
  for (const [path, expectedDigest] of skills) {
    const source = await readFile(resolve(repositoryRoot, path));
    assert.equal(createHash("sha256").update(source).digest("hex"), expectedDigest);
    assert.ok(html.includes(`path:"${path}"`));
    assert.ok(html.includes(`sha256:"${expectedDigest}"`));
  }
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

test("Technology Fit publishes the Narrative Prompt Capsule pilot and exact skill coordinates", async () => {
  const html = await readFile(
    resolve(technologyRoot, "technology-fit-sampling-tableau-chimeric-prototype-v0.2.html"),
    "utf8"
  );
  assert.doesNotMatch(html, /function buildPrompt\s*\(/u);
  assert.match(html, /const PROMPT_CAPSULE_CONTRACT="prompt-capsule\/0\.1\.0";/u);
  assert.match(html, /const PROMPT_CAPSULE_STATE_CONTRACT="technology-fit-sampling-tableau-state\/0\.1";/u);
  assert.match(html, /<fieldset[^>]+id="promptViewControl"[\s\S]*?<legend>Markdown view<\/legend>/u);
  assert.match(html, /type="radio"[^>]+value="plain"[^>]+checked/u);
  assert.match(html, /type="radio"[^>]+value="skill-assisted"/u);
  assert.match(html, /<noscript>[\s\S]*?complete plain Markdown remains available/u);
  assert.match(html, /<details[^>]+data-prompt-related-loops[\s\S]*?<summary>Related loops<\/summary>/u);
  assert.equal((html.match(/data-related-loop-id=/gu) || []).length, 2);
  assert.doesNotMatch(html, /__PROMPT_CAPSULE_PLAIN_BASELINE__/u);
  assert.match(html, /https:\/\/schemas\.radiantnull\.com\/collaboration\/#visitor-surface-change/u);
  assert.match(html, /https:\/\/schemas\.radiantnull\.com\/collaboration\/#repository-reentry/u);
  assert.match(html, /Candidate-set semantics: `open_exclusive`/u);
  assert.doesNotMatch(html, /Candidate-set semantics: `open\\_exclusive`/u);

  const revision = "64992546a4fe7f6fd7b2e27022f0625033a81cf1";
  assert.match(html, new RegExp(`const PROMPT_CAPSULE_SKILL_REVISION="${revision}";`, "u"));
  const skills = [
    [".agents/skills/practitioner-probe/SKILL.md", "348ea113a75af3487a420e2075aa199297673aca0ba0a69e5a19d6c5a463776c"],
    [".agents/skills/evidence-grounded-research-spike/SKILL.md", "844fc0c6b0b956b81984a2c2d47d9252abadeb0a6554c5ef4734d0f1e5f4b531"],
    [".agents/skills/stateful-artifact-behavior-contracts/SKILL.md", "596f139100a448139c7c4ceb2dc6d1b470dc86ff19df4ed68a9ac765005f576a"]
  ];
  for (const [path, expectedDigest] of skills) {
    const source = await readFile(resolve(repositoryRoot, path));
    const actualDigest = createHash("sha256").update(source).digest("hex");
    assert.equal(actualDigest, expectedDigest, `${path} should retain the capsule's exact source digest`);
    assert.ok(html.includes(`path:"${path}"`));
    assert.ok(html.includes(`sha256:"${expectedDigest}"`));
  }
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

test("Threadkeeping Ledger publishes its complete state through the shared Prompt Capsule contract", async () => {
  const html = await readFile(
    resolve(threadkeepingRoot, "threadkeeping-ledger-chimeric-prototype-v0.1.html"),
    "utf8"
  );
  assert.match(html, /const PROMPT_CAPSULE_CONTRACT="prompt-capsule\/0\.1\.0";/u);
  assert.match(html, /const PROMPT_CAPSULE_STATE_CONTRACT="threadkeeping-ledger-state\/0\.1";/u);
  assert.match(html, /<fieldset[^>]+id="promptViewControl"[\s\S]*?<legend>Markdown view<\/legend>/u);
  assert.match(html, /type="radio"[^>]+value="plain"[^>]+checked/u);
  assert.match(html, /type="radio"[^>]+value="skill-assisted"/u);
  assert.match(html, /<noscript>[\s\S]*?complete plain Markdown remains available/u);
  assert.match(html, /<details[^>]+data-prompt-related-loops[\s\S]*?<summary>Related loops<\/summary>/u);
  assert.doesNotMatch(html, /__THREADKEEPING_PROMPT_CAPSULE_PLAIN_BASELINE__/u);
  assert.match(html, /https:\/\/schemas\.radiantnull\.com\/collaboration\/#repository-reentry/u);
  assert.match(html, /window\.threadkeepingLedger=Object\.freeze\(/u);
  assert.match(html, /Every ledger entry, next candidate, continuity assessment, relationship field, recovery field, and source note contributes/u);

  const revision = "b8b305c78b82a288ae2aca9574bb86d7d3d574d9";
  assert.match(html, new RegExp(`const PROMPT_CAPSULE_SKILL_REVISION="${revision}";`, "u"));
  const skills = [
    [".agents/skills/repository-reentry/SKILL.md", "211cdbd293c260e95e62d3bc7ed5cb4d6d9ca3debd560a28a74b52364a1bfa90"],
    [".agents/skills/issue-chain-stewardship/SKILL.md", "86815b7996c29de1aefce7b58e1276b727d50da75dd2b19985decb6884390c57"],
    [".agents/skills/source-authority-mapping/SKILL.md", "706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5"],
  ];
  for (const [path, expectedDigest] of skills) {
    const source = await readFile(resolve(repositoryRoot, path));
    assert.equal(createHash("sha256").update(source).digest("hex"), expectedDigest);
    assert.ok(html.includes(`path:"${path}"`));
    assert.ok(html.includes(`sha256:"${expectedDigest}"`));
  }
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

      const manifestDirectory = dirname(path);
      const entryPath = resolve(manifestDirectory, valid.entryFile);
      assert.doesNotMatch(
        relative(manifestDirectory, entryPath),
        /^\.\.(?:[/\\]|$)/u,
        "entry file remains inside its local prototype family",
      );
      const entryBytes = await readFile(entryPath);
      assert.equal(valid.integrity.algorithm, "sha256");
      assert.equal(
        valid.integrity.entryFile,
        createHash("sha256").update(entryBytes).digest("hex"),
        "entry-file integrity resolves to the current material bytes",
      );

      const invalid = clone(valid);
      delete invalid.id;
      assert.equal(validate(invalid), false);
      assert.ok(validate.errors.some(({ keyword, params }) =>
        keyword === "required" && params.missingProperty === "id"
      ));
    });
  }
});

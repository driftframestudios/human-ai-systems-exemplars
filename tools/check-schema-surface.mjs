import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

import { schemaReceiverRoutes } from "./schema-receiver-routes.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const paths = {
  repositorySchema: "schemas/prototype-exemplars/1.0.0/prototype-exemplars.schema.json",
  repositoryExample: "schemas/prototype-exemplars/1.0.0/prototype-exemplars.example.json",
  contextSchema: "schemas/context-canvas/1.0.0/context-canvas.schema.json",
  contextContext: "schemas/context-canvas/1.0.0/context-canvas.context.jsonld",
  contextExamples: [
    "schemas/context-canvas/1.0.0/examples/collection.example.json",
    "schemas/context-canvas/1.0.0/examples/visitor-surface.example.json",
    "schemas/context-canvas/1.0.0/examples/prototype.example.json"
  ],
  strategyCanvasPrototypeExample: "schemas/context-canvas/1.0.0/examples/prototype.example.json",
  canonicalCoreManifest:
    "core-architectures-chimeric-prototype-current-pack-v0.1/core-architectures-chimeric-prototype-manifest-v0.1.json",
  contextCoreManifest:
    "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/core-architectures-chimeric-prototype-manifest-v0.1.json",
  strategyCanvasEvidence:
    "core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-evidence.v0.1.json",
  collaborationSkillSchema: "schemas/collaboration-skills/0.1.0/collaboration-skill.schema.json",
  collaborationAccountSchema: "schemas/collaboration-skills/0.1.0/collaboration-account.schema.json",
  collaborationSkillExamples: [
    "schemas/collaboration-skills/0.1.0/examples/portable-skill.example.json",
    "schemas/collaboration-skills/0.1.0/examples/retired-projection.example.json"
  ],
  collaborationAccountExample:
    "schemas/collaboration-skills/0.1.0/examples/collaboration-account.example.json",
  supportiveSchema: "supportive-change-writing-exemplars-bundle-v0.1/schema/collection-manifest.schema.v0.1.json",
  supportiveInstance: "supportive-change-writing-exemplars-bundle-v0.1/manifest.json"
};

async function readJson(relativePath) {
  const contents = await readFile(path.join(repositoryRoot, relativePath), "utf8");
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(`${relativePath} is not valid JSON: ${error.message}`);
  }
}

function assertExact(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label} carries ${JSON.stringify(actual)}; expected ${JSON.stringify(expected)}.`);
  }
}

function repositoryRouteFromManifest(manifestPath, referencedPath) {
  const route = path.posix.normalize(
    path.posix.join(path.posix.dirname(manifestPath), referencedPath)
  );
  if (route.startsWith("../") || path.posix.isAbsolute(route)) {
    throw new Error(`${manifestPath} carries a reference outside the repository: ${referencedPath}`);
  }
  return route;
}

function strategyCanvasEntry(manifest, manifestPath) {
  const entries = manifest.prototypes?.filter(({ id }) => id === "strategy-canvas") ?? [];
  if (entries.length !== 1) {
    throw new Error(`${manifestPath} should carry one Strategy Canvas entry; received ${entries.length}.`);
  }
  return entries[0];
}

function representationByKind(example, kind) {
  const representations =
    example.representations?.filter((representation) => representation.kind === kind) ?? [];
  if (representations.length !== 1) {
    throw new Error(
      `The Strategy Canvas prototype example should carry one ${kind} representation; received ${representations.length}.`
    );
  }
  return representations[0];
}

async function assertStrategyCanvasExampleCoordinates(
  example,
  canonicalManifest,
  contextManifest,
  evidenceRegistry
) {
  const canonical = strategyCanvasEntry(canonicalManifest, paths.canonicalCoreManifest);
  const context = strategyCanvasEntry(contextManifest, paths.contextCoreManifest);

  assertExact(
    "Strategy Canvas evidence registry contract",
    evidenceRegistry.schemaVersion,
    "strategy-canvas-evidence/0.1"
  );
  assertExact("Canonical Strategy Canvas expression", canonical.expression, "canonical");
  assertExact("Context Strategy Canvas expression", context.expression, "context-canvas");
  assertExact("Canonical Strategy Canvas standing", canonical.status, "current");
  assertExact("Context Strategy Canvas standing", context.status, "current");

  const canonicalRoute = repositoryRouteFromManifest(paths.canonicalCoreManifest, canonical.file);
  const contextRoute = repositoryRouteFromManifest(paths.contextCoreManifest, context.file);
  const schemaRoute = repositoryRouteFromManifest(paths.canonicalCoreManifest, canonical.schema);
  const contextSchemaRoute = repositoryRouteFromManifest(paths.contextCoreManifest, context.canonical_schema);
  const evidenceRoute = repositoryRouteFromManifest(paths.canonicalCoreManifest, canonical.evidence);
  const contextEvidenceRoute = repositoryRouteFromManifest(paths.contextCoreManifest, context.canonical_evidence);

  assertExact("Context Strategy Canvas canonical schema route", contextSchemaRoute, schemaRoute);
  assertExact("Context Strategy Canvas canonical evidence route", contextEvidenceRoute, evidenceRoute);
  assertExact("Strategy Canvas evidence registry route", evidenceRoute, paths.strategyCanvasEvidence);

  if (canonicalRoute === contextRoute) {
    throw new Error("Canonical worksheet and Context workbench should retain distinct current source routes.");
  }

  await Promise.all(
    [canonicalRoute, contextRoute, schemaRoute, evidenceRoute].map(async (route) => {
      try {
        await access(path.join(repositoryRoot, route));
      } catch {
        throw new Error(`The Strategy Canvas authority coordinate should resolve in repository source: ${route}`);
      }
    })
  );

  assertExact("Strategy Canvas workbench content authority", example.authority.contentAuthorityRef, contextRoute);

  const canonicalRepresentation = representationByKind(example, "canonical_html");
  assertExact("Canonical worksheet source", canonicalRepresentation.sourceRef, canonicalRoute);
  assertExact("Canonical worksheet revision", canonicalRepresentation.revision, canonical.version);

  const schemaRepresentation = representationByKind(example, "machine_representation");
  assertExact("Strategy Canvas schema source", schemaRepresentation.sourceRef, schemaRoute);
  assertExact("Strategy Canvas semantic revision", schemaRepresentation.revision, canonical.semantic_contract);

  const contextRepresentation = representationByKind(example, "served_projection");
  assertExact("Context workbench source", contextRepresentation.sourceRef, contextRoute);
  assertExact("Context workbench revision", contextRepresentation.revision, context.version);

  const staticRepresentation = representationByKind(example, "static_fallback");
  assertExact("Context static reading source", staticRepresentation.sourceRef, contextRoute);
  assertExact("Context static reading revision", staticRepresentation.revision, context.version);

  if (!example.standing.sourceRefs.includes(evidenceRoute)) {
    throw new Error(`Strategy Canvas standing should reference its source-owned evidence registry: ${evidenceRoute}`);
  }
  if (!example.contractRefs.some(({ ref }) => ref === evidenceRoute)) {
    throw new Error(`Strategy Canvas contract routes should include its source-owned evidence registry: ${evidenceRoute}`);
  }
}

function findExternalRefs(value, location = "$") {
  const findings = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => findings.push(...findExternalRefs(item, `${location}[${index}]`)));
    return findings;
  }
  if (!value || typeof value !== "object") {
    return findings;
  }
  for (const [key, item] of Object.entries(value)) {
    const nextLocation = `${location}.${key}`;
    if (key === "$ref" && (typeof item !== "string" || !item.startsWith("#"))) {
      findings.push(`${nextLocation}=${JSON.stringify(item)}`);
    }
    findings.push(...findExternalRefs(item, nextLocation));
  }
  return findings;
}

function findReferenceValues(value, location = "$") {
  const findings = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => findings.push(...findReferenceValues(item, `${location}[${index}]`)));
    return findings;
  }
  if (!value || typeof value !== "object") {
    return findings;
  }
  for (const [key, item] of Object.entries(value)) {
    const nextLocation = `${location}.${key}`;
    if (key.endsWith("Ref") && typeof item === "string") {
      findings.push({ location: nextLocation, value: item });
    } else if (key.endsWith("Refs") && Array.isArray(item)) {
      item.forEach((reference, index) => {
        if (typeof reference === "string") {
          findings.push({ location: `${nextLocation}[${index}]`, value: reference });
        }
      });
    }
    findings.push(...findReferenceValues(item, nextLocation));
  }
  return findings;
}

async function assertReferenceRoutes(label, instance, allowedExternalReferences = new Map()) {
  const uriScheme = /^[a-z][a-z0-9+.-]*:/i;
  for (const reference of findReferenceValues(instance)) {
    if (uriScheme.test(reference.value)) {
      if (allowedExternalReferences.get(reference.location) === reference.value) {
        continue;
      }
      throw new Error(
        `${label} contains an external reference without a declared retrieval role at ${reference.location}: ${reference.value}`
      );
    }
    if (path.isAbsolute(reference.value)) {
      throw new Error(`${label} contains an absolute local reference at ${reference.location}.`);
    }
    const resolvedPath = path.resolve(repositoryRoot, reference.value);
    const routeFromRoot = path.relative(repositoryRoot, resolvedPath);
    if (routeFromRoot.startsWith("..") || path.isAbsolute(routeFromRoot)) {
      throw new Error(`${label} leaves the repository at ${reference.location}.`);
    }
    try {
      await access(resolvedPath);
    } catch {
      throw new Error(`${label} points to an unavailable repository route at ${reference.location}: ${reference.value}`);
    }
  }
}

async function assertReferenceRoutesInvalid(label, instance, allowedExternalReferences = new Map()) {
  try {
    await assertReferenceRoutes(label, instance, allowedExternalReferences);
  } catch {
    return;
  }
  throw new Error(`${label} unexpectedly accepted its reference routes.`);
}

function assertValid(label, validate, instance) {
  if (!validate(instance)) {
    throw new Error(`${label} failed validation:\n${JSON.stringify(validate.errors, null, 2)}`);
  }
}

function assertInvalid(label, validate, instance) {
  if (validate(instance)) {
    throw new Error(`${label} unexpectedly validated.`);
  }
}

const strictAjv = new Ajv2020({
  strict: true,
  allErrors: true,
  validateFormats: false,
  useDefaults: false,
  removeAdditional: false,
  coerceTypes: false
});

const repositorySchema = await readJson(paths.repositorySchema);
const contextSchema = await readJson(paths.contextSchema);
const collaborationSkillSchema = await readJson(paths.collaborationSkillSchema);
const collaborationAccountSchema = await readJson(paths.collaborationAccountSchema);

for (const [label, schema] of [
  [paths.repositorySchema, repositorySchema],
  [paths.contextSchema, contextSchema],
  [paths.collaborationSkillSchema, collaborationSkillSchema],
  [paths.collaborationAccountSchema, collaborationAccountSchema]
]) {
  const externalRefs = findExternalRefs(schema);
  if (externalRefs.length > 0) {
    throw new Error(`${label} contains external references:\n${externalRefs.join("\n")}`);
  }
  if (!strictAjv.validateSchema(schema)) {
    throw new Error(`${label} is not a valid Draft 2020-12 schema:\n${JSON.stringify(strictAjv.errors, null, 2)}`);
  }
}

const validateRepository = strictAjv.compile(repositorySchema);
const validateContext = strictAjv.compile(contextSchema);
const validateCollaborationSkill = strictAjv.compile(collaborationSkillSchema);
const validateCollaborationAccount = strictAjv.compile(collaborationAccountSchema);

const repositoryExample = await readJson(paths.repositoryExample);
const contextExamples = await Promise.all(paths.contextExamples.map(readJson));
const collaborationSkillExamples = await Promise.all(paths.collaborationSkillExamples.map(readJson));
const collaborationAccountExample = await readJson(paths.collaborationAccountExample);
const [canonicalCoreManifest, contextCoreManifest, strategyCanvasEvidence] = await Promise.all([
  readJson(paths.canonicalCoreManifest),
  readJson(paths.contextCoreManifest),
  readJson(paths.strategyCanvasEvidence)
]);
const collaborationAccountExternalReferences = new Map([
  [
    "$.relatedRefs[1]",
    "https://schemas.vik.guru/collaboration-skills/0.1.0/examples/portable-skill.example.json"
  ]
]);
await readJson(paths.contextContext);

assertValid(paths.repositoryExample, validateRepository, repositoryExample);
paths.contextExamples.forEach((examplePath, index) => {
  assertValid(examplePath, validateContext, contextExamples[index]);
});
await assertStrategyCanvasExampleCoordinates(
  contextExamples[paths.contextExamples.indexOf(paths.strategyCanvasPrototypeExample)],
  canonicalCoreManifest,
  contextCoreManifest,
  strategyCanvasEvidence
);
paths.collaborationSkillExamples.forEach((examplePath, index) => {
  assertValid(examplePath, validateCollaborationSkill, collaborationSkillExamples[index]);
});
assertValid(paths.collaborationAccountExample, validateCollaborationAccount, collaborationAccountExample);

for (const [examplePath, example] of [
  ...paths.collaborationSkillExamples.map((examplePath, index) => [examplePath, collaborationSkillExamples[index]]),
  [paths.collaborationAccountExample, collaborationAccountExample]
]) {
  const externalReferences =
    examplePath === paths.collaborationAccountExample
      ? collaborationAccountExternalReferences
      : new Map();
  await assertReferenceRoutes(examplePath, example, externalReferences);
}

const branchBoundAuthorityReference = structuredClone(collaborationSkillExamples[0]);
branchBoundAuthorityReference.semanticAuthorityRef =
  "https://github.com/driftframestudios/human-ai-systems-exemplars/tree/main/.agents/skills/source-authority-mapping/SKILL.md";
await assertReferenceRoutesInvalid(
  "branch-bound current authority reference boundary",
  branchBoundAuthorityReference
);

const misplacedRetrievalReference = structuredClone(collaborationAccountExample);
misplacedRetrievalReference.currentOwnerRef =
  "https://schemas.vik.guru/collaboration-skills/0.1.0/examples/portable-skill.example.json";
await assertReferenceRoutesInvalid(
  "retrieval reference role boundary",
  misplacedRetrievalReference,
  collaborationAccountExternalReferences
);

const servingAuthorityBoundary = structuredClone(repositoryExample);
delete servingAuthorityBoundary.servedProjections[0].deliveryAuthorityRef;
assertInvalid("served projection delivery authority boundary", validateRepository, servingAuthorityBoundary);

const firstUseRangeBoundary = structuredClone(contextExamples[0]);
firstUseRangeBoundary.firstUsePrior.solution = 1.01;
assertInvalid("S/I/R first-use probability boundary", validateContext, firstUseRangeBoundary);

const currentnessScopeBoundary = structuredClone(contextExamples[1]);
currentnessScopeBoundary.standing.currentness.compositeScore = 0.8;
assertInvalid("independent currentness boundary", validateContext, currentnessScopeBoundary);

const focalizationScopeBoundary = structuredClone(contextExamples[1]);
focalizationScopeBoundary.experienceIntent.focalization.inferredParticipantProfile = "returning technical visitor";
assertInvalid("declared focalization boundary", validateContext, focalizationScopeBoundary);

const unexpectedCoreProperty = structuredClone(repositoryExample);
unexpectedCoreProperty.unexpectedCoreProperty = true;
assertInvalid("unknown repository core property boundary", validateRepository, unexpectedCoreProperty);

const acceptedExtension = structuredClone(contextExamples[1]);
acceptedExtension.extensions["urn:example:context-canvas:accepted-probe"] = {
  observation: "A namespaced extension remains available."
};
assertValid("namespaced Context Canvas extension boundary", validateContext, acceptedExtension);

const missingIdentity = structuredClone(contextExamples[1]);
delete missingIdentity.id;
assertInvalid("required Context Canvas identity boundary", validateContext, missingIdentity);

const supportiveSchema = await readJson(paths.supportiveSchema);
const supportiveInstance = await readJson(paths.supportiveInstance);
const validateSupportive = strictAjv.compile(supportiveSchema);
assertValid(paths.supportiveInstance, validateSupportive, supportiveInstance);

for (const route of schemaReceiverRoutes) {
  const schema = await readJson(route.source);
  if (schema.$id !== route.id) {
    throw new Error(
      `${route.source} routes through ${JSON.stringify(schema.$id)}; expected ${JSON.stringify(route.id)}`
    );
  }
}

const limsRoot = path.join(repositoryRoot, "lims-eln-functional-nucleus");
const limsResult = spawnSync(
  "python3",
  [
    "site-reading-governance/tools/validate_governance.py",
    "--governance-root",
    "site-reading-governance",
    "--source-root",
    "lims-eln-program-specification",
    "--schema-name",
    "machine-node.schema.json",
    "--document-path",
    "machine-node.json"
  ],
  {
    cwd: limsRoot,
    encoding: "utf8"
  }
);

if (limsResult.error) {
  throw limsResult.error;
}
if (limsResult.status !== 0) {
  throw new Error(
    `LIMS/ELN representative use failed with status ${limsResult.status}:\n${limsResult.stderr || limsResult.stdout}`
  );
}

console.log(
  `Schema surface check passed: 4 strict schemas, 7 representative schema instances, 1 Supportive instance, 1 LIMS/ELN instance, 1 Strategy Canvas cross-owner coordinate, 9 boundary probes, and ${schemaReceiverRoutes.length} receiver identities.`
);

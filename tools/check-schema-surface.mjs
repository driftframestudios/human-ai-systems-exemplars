import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
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

for (const [label, schema] of [
  [paths.repositorySchema, repositorySchema],
  [paths.contextSchema, contextSchema]
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

const repositoryExample = await readJson(paths.repositoryExample);
const contextExamples = await Promise.all(paths.contextExamples.map(readJson));
await readJson(paths.contextContext);

assertValid(paths.repositoryExample, validateRepository, repositoryExample);
paths.contextExamples.forEach((examplePath, index) => {
  assertValid(examplePath, validateContext, contextExamples[index]);
});

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
  `Schema surface check passed: 2 strict v1 schemas, 4 v1 instances, 1 Supportive instance, 1 LIMS/ELN instance, 7 boundary probes, and ${schemaReceiverRoutes.length} receiver identities.`
);

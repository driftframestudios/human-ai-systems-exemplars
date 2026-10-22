import './node-runtime-admission.mjs';
import { isDirectExecution } from './check-node-runtime.mjs';
import { constants as fsConstants } from "node:fs";
import { lstat, mkdir, open, opendir, rmdir, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";

const toolPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(toolPath), "..");

const SCHEMA_VERSION = "0.1";
const MANIFEST_SCHEMA_VERSION = "0.2";
const MANIFEST_TYPE = "repository_handoff_foundation_manifest";
const PROFILE_TYPE = "repository_handoff_foundation_profile";
const ISSUE_SEED_TYPE = "repository_handoff_issue_route_seed";
const DEFAULT_BUNDLE_DIRECTORY = "repository-handoff-foundation-v0.1";
const DEFAULT_MANIFEST_NAME = "foundation.manifest.json";
const MAX_DOCUMENT_BYTES = 16 * 1024 * 1024;
const MAX_AGGREGATE_SOURCE_BYTES = 64 * 1024 * 1024;
const MAX_AGGREGATE_PROFILE_BYTES = 64 * 1024 * 1024;
const MAX_AGGREGATE_BODY_BYTES = 64 * 1024 * 1024;
const MAX_TARGET_COMPARISON_BYTES = 16 * 1024 * 1024;
const MAX_PROFILES = 64;
const MAX_ENTRIES = 10_000;
const MAX_PATH_BYTES = 512;
const MAX_COMPONENT_BYTES = 255;
const READ_CHUNK_BYTES = 64 * 1024;
const APPLY_CONTROL_DIRECTORY = ".repository-handoff";
const APPLY_LOCK_PATH = `${APPLY_CONTROL_DIRECTORY}/.apply.lock`;
const FOUNDATION_RECEIPT_PATH = `${APPLY_CONTROL_DIRECTORY}/foundation-receipt.json`;
const semanticKeyPattern = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/u;
const digestPattern = /^[a-f0-9]{64}$/u;
const confirmedPlanPattern = /^sha256:[a-f0-9]{64}$/u;
const semanticVersionPattern = /^0\.1\.(?:0|[1-9][0-9]*)$/u;
const gitCommitPattern = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const schemaIdPattern = /^urn:repository-handoff-foundation:schema:[a-z0-9-]+:v0\.[12]$/u;
const issueRelationTypes = new Set([
  "prepares",
  "receives",
  "runs_alongside",
]);
const expectedInverseRelationType = new Map([
  ["prepares", "receives"],
  ["receives", "prepares"],
  ["runs_alongside", "runs_alongside"],
]);
const entryOwnerships = new Set(["foundation_generator", "receiving_owner"]);
const collisionPolicies = new Set(["create_if_absent", "preserve_and_report"]);
const verificationPolicies = new Set(["exact_bytes", "present_regular_file"]);
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

export const foundationDefaults = Object.freeze({
  repositoryRoot,
  bundleRoot: path.join(repositoryRoot, DEFAULT_BUNDLE_DIRECTORY),
  manifestPath: path.join(repositoryRoot, DEFAULT_BUNDLE_DIRECTORY, DEFAULT_MANIFEST_NAME),
  targetRoot: repositoryRoot,
});

export class FoundationError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "FoundationError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

function fail(code, message, details = undefined) {
  throw new FoundationError(code, message, details);
}

function requireCondition(condition, code, message, details = undefined) {
  if (!condition) fail(code, message, details);
}

function owns(value, key) {
  return Object.hasOwn(value, key);
}

function isPlainRecord(value) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

function record(value, label) {
  requireCondition(isPlainRecord(value), "record", `${label} must be an object.`);
  return value;
}

function assertExactKeys(value, expectedKeys, label) {
  record(value, label);
  const actual = Object.keys(value).sort(compareUtf8);
  const expected = [...expectedKeys].sort(compareUtf8);
  requireCondition(
    actual.length === expected.length
      && actual.every((key, index) => key === expected[index]),
    "fields",
    `${label} must contain exactly: ${expected.join(", ")}.`,
  );
}

function field(value, key, label) {
  requireCondition(owns(value, key), "field", `${label} requires its own ${key} field.`);
  return value[key];
}

function denseArray(value, label, { allowEmpty = false, maximum = MAX_ENTRIES } = {}) {
  requireCondition(
    Array.isArray(value) && (allowEmpty || value.length > 0),
    "array",
    `${label} must be ${allowEmpty ? "an" : "a nonempty"} array.`,
  );
  requireCondition(value.length <= maximum, "limit", `${label} exceeds the ${maximum}-item boundary.`);
  for (let index = 0; index < value.length; index += 1) {
    requireCondition(owns(value, index), "sparse_array", `${label} must own every indexed value.`);
  }
  return value;
}

function text(value, label, { singleLine = false, maximum = 65_536 } = {}) {
  requireCondition(
    typeof value === "string"
      && value.length > 0
      && value.trim() === value
      && !value.includes("\0")
      && value.length <= maximum
      && (!singleLine || !/[\r\n]/u.test(value)),
    "text",
    `${label} must be one nonempty, trimmed${singleLine ? ", single-line" : ""} string.`,
  );
  return value;
}

function semanticKey(value, label) {
  const selected = text(value, label, { singleLine: true, maximum: 128 });
  requireCondition(
    semanticKeyPattern.test(selected),
    "semantic_key",
    `${label} must use a lowercase portable semantic key.`,
  );
  return selected;
}

function digest(value, label) {
  requireCondition(
    typeof value === "string" && digestPattern.test(value),
    "digest",
    `${label} must be one lowercase SHA-256 digest.`,
  );
  return value;
}

function enumeration(value, allowed, label) {
  requireCondition(
    typeof value === "string" && allowed.has(value),
    "enum",
    `${label} must be one of: ${[...allowed].join(", ")}.`,
  );
  return value;
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value, label = "Canonical JSON value") {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    requireCondition(Number.isFinite(value), "canonical_json", `${label} contains a non-finite number.`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item, index) => canonicalJson(item, `${label}[${index}]`)).join(",")}]`;
  }
  requireCondition(isPlainRecord(value), "canonical_json", `${label} must contain only JSON values.`);
  const keys = Object.keys(value).sort(compareUtf8);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key], `${label}.${key}`)}`).join(",")}}`;
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

async function readHandleBounded(handle, maximum, label) {
  const chunks = [];
  let total = 0;
  while (total <= maximum) {
    const remaining = maximum + 1 - total;
    const buffer = Buffer.allocUnsafe(Math.min(READ_CHUNK_BYTES, remaining));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
    if (bytesRead === 0) break;
    chunks.push(buffer.subarray(0, bytesRead));
    total += bytesRead;
  }
  requireCondition(total <= maximum, "file_limit", `${label} exceeds the ${maximum}-byte boundary.`);
  return Buffer.concat(chunks, total);
}

function freezeAdmittedGraph(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value) || Buffer.isBuffer(value)) return value;
  seen.add(value);
  if (value instanceof Map) {
    for (const [key, item] of value.entries()) {
      freezeAdmittedGraph(key, seen);
      freezeAdmittedGraph(item, seen);
    }
  } else {
    for (const item of Object.values(value)) freezeAdmittedGraph(item, seen);
  }
  return Object.freeze(value);
}

function portablePathKey(value) {
  return value.normalize("NFC").toLowerCase();
}

export function assertPortableTargetPath(value, label = "Target path") {
  const relativePath = text(value, label, { singleLine: true, maximum: MAX_PATH_BYTES });
  requireCondition(
    !path.posix.isAbsolute(relativePath)
      && !path.win32.isAbsolute(relativePath)
      && !relativePath.includes("\\")
      && !relativePath.includes("\0")
      && relativePath === relativePath.normalize("NFC")
      && path.posix.normalize(relativePath) === relativePath
      && /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/u.test(relativePath),
    "portable_path",
    `${label} must be one normalized ASCII portable relative path: ${relativePath}.`,
  );
  const components = relativePath.split("/");
  requireCondition(
    components.every((component) => component.length > 0 && component !== "." && component !== ".."),
    "portable_path",
    `${label} must not contain empty, current-directory, or parent-directory segments: ${relativePath}.`,
  );
  for (const component of components) {
    requireCondition(
      Buffer.byteLength(component, "utf8") <= MAX_COMPONENT_BYTES,
      "portable_path",
      `${label} contains a component longer than ${MAX_COMPONENT_BYTES} bytes: ${relativePath}.`,
    );
    requireCondition(
      !/[\u0000-\u001f\u007f<>:"|?*]/u.test(component)
        && !/[. ]$/u.test(component)
        && !/^(?:con|prn|aux|nul|clock\$|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/iu.test(component),
      "portable_path",
      `${label} is not portable across common filesystems: ${relativePath}.`,
    );
  }
  requireCondition(
    Buffer.byteLength(relativePath, "utf8") <= MAX_PATH_BYTES,
    "portable_path",
    `${label} exceeds the ${MAX_PATH_BYTES}-byte path boundary: ${relativePath}.`,
  );
  return relativePath;
}

function assertContainedReference(value, baseDirectory, containmentRoot, label) {
  const reference = text(value, label, { singleLine: true, maximum: MAX_PATH_BYTES });
  requireCondition(
    !path.posix.isAbsolute(reference)
      && !path.win32.isAbsolute(reference)
      && !reference.includes("\\")
      && !reference.includes("\0")
      && reference === reference.normalize("NFC"),
    "contained_path",
    `${label} must be an NFC relative path contained by the bundle.`,
  );
  const absolutePath = path.resolve(baseDirectory, ...reference.split("/"));
  const relativeToRoot = path.relative(containmentRoot, absolutePath);
  requireCondition(
    relativeToRoot !== ""
      && relativeToRoot !== ".."
      && !relativeToRoot.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relativeToRoot),
    "contained_path",
    `${label} must resolve to a file contained by the bundle.`,
  );
  return { reference, absolutePath, relativeToRoot: relativeToRoot.split(path.sep).join("/") };
}

async function lstatOrNull(absolutePath) {
  try {
    return await lstat(absolutePath);
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function assertDirectoryRoot(absolutePath, label) {
  const status = await lstatOrNull(absolutePath);
  requireCondition(status !== null, "missing_root", `${label} does not exist.`);
  requireCondition(!status.isSymbolicLink(), "symlink", `${label} must not be a symbolic link.`);
  requireCondition(status.isDirectory(), "not_directory", `${label} must be a directory.`);
}

async function walkContainedPath(root, relativePath, label, { allowMissing = false } = {}) {
  const components = relativePath.split("/");
  let current = root;
  for (let index = 0; index < components.length; index += 1) {
    current = path.join(current, components[index]);
    const status = await lstatOrNull(current);
    if (status === null) {
      if (allowMissing) {
        return {
          kind: "missing",
          absolutePath: current,
          missingAt: components.slice(0, index + 1).join("/"),
        };
      }
      fail("missing_source", `${label} is missing: ${relativePath}.`);
    }
    if (status.isSymbolicLink()) {
      if (allowMissing) {
        return { kind: "invalid", reason: "symlink", absolutePath: current };
      }
      fail("symlink", `${label} must not traverse a symbolic link: ${relativePath}.`);
    }
    const final = index === components.length - 1;
    if (!final && !status.isDirectory()) {
      if (allowMissing) {
        return { kind: "invalid", reason: "non_directory_component", absolutePath: current };
      }
      fail("path_component", `${label} has a non-directory path component: ${relativePath}.`);
    }
    if (final) {
      return status.isFile()
        ? { kind: "file", status, absolutePath: current }
        : { kind: "invalid", reason: "not_regular_file", status, absolutePath: current };
    }
  }
  fail("path", `${label} did not resolve to a file.`);
}

async function readRegularFileWithin(root, relativePath, label, { maximum = MAX_DOCUMENT_BYTES } = {}) {
  const walked = await walkContainedPath(root, relativePath, label);
  requireCondition(walked.kind === "file", "not_regular_file", `${label} must be a regular file: ${relativePath}.`);
  requireCondition(walked.status.size <= maximum, "file_limit", `${label} exceeds the ${maximum}-byte boundary.`);
  let handle;
  try {
    handle = await open(
      walked.absolutePath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | (fsConstants.O_NONBLOCK ?? 0),
    );
    const status = await handle.stat();
    requireCondition(status.isFile(), "not_regular_file", `${label} must be a regular file: ${relativePath}.`);
    requireCondition(
      sameFileIdentity(walked.status, status),
      "path_changed",
      `${label} changed identity while it was being opened: ${relativePath}.`,
    );
    requireCondition(status.size <= maximum, "file_limit", `${label} exceeds the ${maximum}-byte boundary.`);
    const bytes = await readHandleBounded(handle, maximum, label);
    const finalStatus = await handle.stat();
    requireCondition(
      finalStatus.isFile()
        && sameFileIdentity(status, finalStatus)
        && finalStatus.size === bytes.length,
      "file_changed",
      `${label} changed while it was being read: ${relativePath}.`,
    );
    return { bytes, absolutePath: walked.absolutePath, status: finalStatus };
  } finally {
    await handle?.close();
  }
}

function decodeUtf8(bytes, label) {
  try {
    return utf8Decoder.decode(bytes);
  } catch {
    fail("utf8", `${label} must contain valid UTF-8.`);
  }
}

function parseJsonCompatible(bytes, label) {
  let value;
  try {
    value = JSON.parse(decodeUtf8(bytes, label));
  } catch (error) {
    if (error instanceof FoundationError) throw error;
    fail("json_projection", `${label} must be a JSON-compatible JSON/YAML projection.`);
  }
  return record(value, label);
}

async function admitSchemaReference(
  document,
  documentPath,
  bundleRoot,
  schemaAuthoritiesByPath,
  expectedReference,
  label,
) {
  requireCondition(
    field(document, "$schema", label) === expectedReference,
    "schema_reference",
    `${label}.$schema must be ${expectedReference}.`,
  );
  const reference = assertContainedReference(
    expectedReference,
    path.dirname(documentPath),
    bundleRoot,
    `${label}.$schema`,
  );
  requireCondition(
    schemaAuthoritiesByPath.has(portablePathKey(reference.relativeToRoot)),
    "schema_authority",
    `${label}.$schema must resolve to a digest-bound schema authority.`,
  );
  return reference.relativeToRoot;
}

function admitSchemaDescriptor(raw, index) {
  const label = `Manifest schema ${index + 1}`;
  assertExactKeys(raw, ["key", "sourcePath", "id", "sha256"], label);
  const descriptor = {
    key: semanticKey(field(raw, "key", label), `${label}.key`),
    sourcePath: assertPortableTargetPath(field(raw, "sourcePath", label), `${label}.sourcePath`),
    id: text(field(raw, "id", label), `${label}.id`, { singleLine: true, maximum: 256 }),
    sha256: digest(field(raw, "sha256", label), `${label}.sha256`),
  };
  requireCondition(
    schemaIdPattern.test(descriptor.id),
    "schema_identity",
    `${label}.id must use the repository handoff foundation v0.1 schema URN form.`,
  );
  return descriptor;
}

async function admitSchemaAuthorities(descriptors, bundleRoot) {
  const byKey = uniqueKeys(descriptors, "Foundation manifest.schemas");
  const byPath = new Map();
  const byId = new Map();
  let aggregateBytes = 0;
  for (const descriptor of descriptors) {
    const pathKey = portablePathKey(descriptor.sourcePath);
    requireCondition(
      !byPath.has(pathKey),
      "portable_collision",
      `Foundation schemas repeat a portable path: ${descriptor.sourcePath}.`,
    );
    requireCondition(
      !byId.has(descriptor.id),
      "schema_identity",
      `Foundation schemas repeat identity ${descriptor.id}.`,
    );
    const source = await readRegularFileWithin(
      bundleRoot,
      descriptor.sourcePath,
      `Schema ${descriptor.key} source`,
    );
    aggregateBytes += source.bytes.length;
    requireCondition(
      aggregateBytes <= MAX_AGGREGATE_SOURCE_BYTES,
      "aggregate_source_limit",
      `Foundation schemas exceed the ${MAX_AGGREGATE_SOURCE_BYTES}-byte aggregate boundary.`,
    );
    requireCondition(
      sha256(source.bytes) === descriptor.sha256,
      "schema_digest",
      `Schema ${descriptor.key} source digest differs from its manifest SHA-256.`,
    );
    const schema = parseJsonCompatible(source.bytes, `Schema ${descriptor.key}`);
    requireCondition(
      field(schema, "$schema", `Schema ${descriptor.key}`) === "https://json-schema.org/draft/2020-12/schema",
      "schema_dialect",
      `Schema ${descriptor.key} must use JSON Schema draft 2020-12.`,
    );
    requireCondition(
      field(schema, "$id", `Schema ${descriptor.key}`) === descriptor.id,
      "schema_identity",
      `Schema ${descriptor.key}.$id must match its manifest identity.`,
    );
    descriptor.sourceSize = source.bytes.length;
    descriptor.sourceBytes = source.bytes;
    descriptor.document = schema;
    byPath.set(pathKey, descriptor);
    byId.set(descriptor.id, descriptor);
  }
  return { byKey, byPath, byId, aggregateBytes };
}

function uniqueKeys(items, label, keySelector = (item) => item.key) {
  const found = new Map();
  for (const item of items) {
    const key = keySelector(item);
    requireCondition(!found.has(key), "duplicate_key", `${label} repeats semantic key ${key}.`);
    found.set(key, item);
  }
  return found;
}

function uniqueSemanticKeyArray(
  value,
  label,
  { allowEmpty = false, maximum = MAX_ENTRIES } = {},
) {
  const selected = denseArray(value, label, { allowEmpty, maximum }).map((item, index) => (
    semanticKey(item, `${label}[${index}]`)
  ));
  requireCondition(new Set(selected).size === selected.length, "duplicate_key", `${label} repeats a semantic key.`);
  return selected;
}

async function admitExactProjection(document, documentPath, authorityBytes, bundleRoot, label) {
  requireCondition(Buffer.isBuffer(authorityBytes), "projection_authority", `${label} requires its admitted authority bytes.`);
  const projection = record(field(document, "projection", label), `${label}.projection`);
  assertExactKeys(
    projection,
    ["authority", "jsonSource", "yamlTarget", "mode", "derivationNote"],
    `${label}.projection`,
  );
  requireCondition(
    field(projection, "authority", `${label}.projection`) === "json",
    "projection_authority",
    `${label}.projection.authority must be json.`,
  );
  text(field(projection, "derivationNote", `${label}.projection`), `${label}.projection.derivationNote`, {
    maximum: 500,
  });
  requireCondition(
    field(projection, "mode", `${label}.projection`) === "exact_json_bytes",
    "projection_mode",
    `${label}.projection.mode must be exact_json_bytes.`,
  );
  const jsonSource = assertPortableTargetPath(
    field(projection, "jsonSource", `${label}.projection`),
    `${label}.projection.jsonSource`,
  );
  const yamlTarget = assertPortableTargetPath(
    field(projection, "yamlTarget", `${label}.projection`),
    `${label}.projection.yamlTarget`,
  );
  const jsonReference = assertContainedReference(
    jsonSource,
    bundleRoot,
    bundleRoot,
    `${label}.projection.jsonSource`,
  );
  const yamlReference = assertContainedReference(
    yamlTarget,
    bundleRoot,
    bundleRoot,
    `${label}.projection.yamlTarget`,
  );
  requireCondition(
    path.resolve(documentPath) === path.resolve(jsonReference.absolutePath),
    "projection_authority",
    `${label}.projection.jsonSource must identify its authoritative JSON document.`,
  );
  requireCondition(
    portablePathKey(jsonReference.relativeToRoot) !== portablePathKey(yamlReference.relativeToRoot),
    "projection_target",
    `${label}.projection.yamlTarget must identify a portable-distinct readability companion.`,
  );
  const yamlFile = await readRegularFileWithin(bundleRoot, yamlReference.relativeToRoot, `${label} YAML projection`);
  parseJsonCompatible(yamlFile.bytes, `${label} YAML projection`);
  requireCondition(
    authorityBytes.equals(yamlFile.bytes),
    "projection_difference",
    `${label} JSON and YAML projections must contain exact matching bytes.`,
  );
  return {
    jsonSource: jsonReference.relativeToRoot,
    yamlTarget: yamlReference.relativeToRoot,
    sha256: sha256(authorityBytes),
  };
}

function admitModule(raw, index) {
  const label = `Manifest module ${index + 1}`;
  assertExactKeys(raw, ["key", "title", "description"], label);
  return {
    key: semanticKey(field(raw, "key", label), `${label}.key`),
    title: text(field(raw, "title", label), `${label}.title`, { maximum: 120 }),
    description: text(field(raw, "description", label), `${label}.description`, { maximum: 500 }),
    requires: [],
  };
}

function admitManifestEntry(raw, index) {
  const label = `Manifest entry ${index + 1}`;
  assertExactKeys(
    raw,
    [
      "key",
      "moduleKey",
      "sourcePath",
      "targetPath",
      "profiles",
      "activationCondition",
      "ownership",
      "collisionPolicy",
      "verificationPolicy",
      "sha256",
    ],
    label,
  );
  const admitted = {
    key: semanticKey(field(raw, "key", label), `${label}.key`),
    moduleKey: semanticKey(field(raw, "moduleKey", label), `${label}.moduleKey`),
    sourcePath: assertPortableTargetPath(field(raw, "sourcePath", label), `${label}.sourcePath`),
    targetPath: assertPortableTargetPath(field(raw, "targetPath", label), `${label}.targetPath`),
    profiles: uniqueSemanticKeyArray(field(raw, "profiles", label), `${label}.profiles`, { maximum: 32 }),
    activationCondition: text(field(raw, "activationCondition", label), `${label}.activationCondition`, {
      maximum: 500,
    }),
    ownership: enumeration(field(raw, "ownership", label), entryOwnerships, `${label}.ownership`),
    collisionPolicy: enumeration(
      field(raw, "collisionPolicy", label),
      collisionPolicies,
      `${label}.collisionPolicy`,
    ),
    verificationPolicy: enumeration(
      field(raw, "verificationPolicy", label),
      verificationPolicies,
      `${label}.verificationPolicy`,
    ),
    sha256: digest(field(raw, "sha256", label), `${label}.sha256`),
  };
  requireCondition(
    admitted.ownership !== "foundation_generator" || admitted.verificationPolicy === "exact_bytes",
    "ownership_verification",
    `${label} uses foundation_generator ownership and therefore requires exact_bytes verification.`,
  );
  return admitted;
}

function admitIssueSeedDescriptor(raw, index) {
  const label = `Manifest Issue seed ${index + 1}`;
  assertExactKeys(raw, ["key", "sourcePath", "profiles", "sha256"], label);
  return {
    key: semanticKey(field(raw, "key", label), `${label}.key`),
    sourcePath: assertPortableTargetPath(field(raw, "sourcePath", label), `${label}.sourcePath`),
    profiles: uniqueSemanticKeyArray(field(raw, "profiles", label), `${label}.profiles`, { maximum: 32 }),
    sha256: digest(field(raw, "sha256", label), `${label}.sha256`),
  };
}

function assertTargetTreeClosure(entries) {
  const byPortablePath = new Map();
  const exactPaths = new Set();
  for (const entry of entries) {
    requireCondition(!exactPaths.has(entry.targetPath), "duplicate_target", `Manifest repeats target ${entry.targetPath}.`);
    exactPaths.add(entry.targetPath);
    const key = portablePathKey(entry.targetPath);
    requireCondition(
      !byPortablePath.has(key),
      "portable_collision",
      `Manifest targets collide after NFC/case folding: ${byPortablePath.get(key)?.targetPath} and ${entry.targetPath}.`,
    );
    byPortablePath.set(key, entry);
  }
  const sortedKeys = [...byPortablePath.keys()].sort(compareUtf8);
  const targetByKey = new Set(sortedKeys);
  for (const entry of entries) {
    const components = entry.targetPath.split("/");
    for (let length = 1; length < components.length; length += 1) {
      const prefix = portablePathKey(components.slice(0, length).join("/"));
      requireCondition(
        !targetByKey.has(prefix),
        "target_tree_collision",
        `Manifest target ${entry.targetPath} descends from another file target.`,
      );
    }
  }
}

function assertModuleDependencyClosure(modules) {
  for (const module of modules.values()) {
    for (const requirement of module.requires) {
      requireCondition(
        modules.has(requirement),
        "unknown_module",
        `Module ${module.key} requires unknown module ${requirement}.`,
      );
    }
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(key) {
    if (visited.has(key)) return;
    requireCondition(!visiting.has(key), "module_cycle", `Module dependency cycle reaches ${key}.`);
    visiting.add(key);
    for (const requirement of modules.get(key).requires) visit(requirement);
    visiting.delete(key);
    visited.add(key);
  }
  for (const key of modules.keys()) visit(key);
}

async function admitManifest(manifestPath, bundleRoot) {
  await assertDirectoryRoot(bundleRoot, "Foundation bundle root");
  const relativeManifest = path.relative(bundleRoot, manifestPath).split(path.sep).join("/");
  requireCondition(
    relativeManifest !== ""
      && relativeManifest !== ".."
      && !relativeManifest.startsWith("../")
      && !path.isAbsolute(relativeManifest),
    "manifest_path",
    "Foundation manifest must be contained by the bundle root.",
  );
  assertPortableTargetPath(relativeManifest, "Foundation manifest path");
  const manifestFile = await readRegularFileWithin(bundleRoot, relativeManifest, "Foundation manifest");
  const raw = parseJsonCompatible(manifestFile.bytes, "Foundation manifest");
  assertExactKeys(
    raw,
    ["$schema", "schemaVersion", "artifactType", "key", "version", "defaultProfileKey", "schemas", "modules", "entries", "issueSeeds"],
    "Foundation manifest",
  );
  const schemaDescriptors = denseArray(
    field(raw, "schemas", "Foundation manifest"),
    "Foundation manifest.schemas",
    { maximum: 16 },
  ).map(admitSchemaDescriptor);
  const schemaAuthorities = await admitSchemaAuthorities(schemaDescriptors, bundleRoot);
  await admitSchemaReference(
    raw,
    manifestPath,
    bundleRoot,
    schemaAuthorities.byPath,
    "./schema/foundation-manifest.schema.v0.2.json",
    "Foundation manifest",
  );
  const schemaVersion = field(raw, "schemaVersion", "Foundation manifest");
  requireCondition(
    schemaVersion === MANIFEST_SCHEMA_VERSION,
    "schema_version",
    `Foundation manifest schemaVersion must be ${MANIFEST_SCHEMA_VERSION}.`,
  );
  requireCondition(field(raw, "artifactType", "Foundation manifest") === MANIFEST_TYPE, "artifact_type", `Foundation manifest artifactType must be ${MANIFEST_TYPE}.`);
  const key = semanticKey(field(raw, "key", "Foundation manifest"), "Foundation manifest.key");
  const version = text(field(raw, "version", "Foundation manifest"), "Foundation manifest.version", { singleLine: true });
  requireCondition(semanticVersionPattern.test(version), "version", "Foundation manifest.version must identify a 0.1 patch release.");
  const defaultProfileKey = semanticKey(
    field(raw, "defaultProfileKey", "Foundation manifest"),
    "Foundation manifest.defaultProfileKey",
  );
  const moduleList = denseArray(
    field(raw, "modules", "Foundation manifest"),
    "Foundation manifest.modules",
    { maximum: 64 },
  ).map(admitModule);
  const modules = uniqueKeys(moduleList, "Foundation manifest.modules");
  assertModuleDependencyClosure(modules);
  const entries = denseArray(
    field(raw, "entries", "Foundation manifest"),
    "Foundation manifest.entries",
    { maximum: 512 },
  ).map(admitManifestEntry);
  const entriesByKey = uniqueKeys(entries, "Foundation manifest.entries");
  assertTargetTreeClosure(entries);
  const issueSeeds = denseArray(
    field(raw, "issueSeeds", "Foundation manifest"),
    "Foundation manifest.issueSeeds",
    { maximum: 64 },
  ).map(admitIssueSeedDescriptor);
  const issueSeedsByKey = uniqueKeys(issueSeeds, "Foundation manifest.issueSeeds");
  let aggregateSourceBytes = schemaAuthorities.aggregateBytes;
  for (const entry of entries) {
    requireCondition(modules.has(entry.moduleKey), "unknown_module", `Entry ${entry.key} names unknown module ${entry.moduleKey}.`);
    const source = await readRegularFileWithin(bundleRoot, entry.sourcePath, `Entry ${entry.key} source`);
    aggregateSourceBytes += source.bytes.length;
    requireCondition(
      aggregateSourceBytes <= MAX_AGGREGATE_SOURCE_BYTES,
      "aggregate_source_limit",
      `Foundation entry sources exceed the ${MAX_AGGREGATE_SOURCE_BYTES}-byte aggregate boundary.`,
    );
    const observedDigest = sha256(source.bytes);
    requireCondition(
      observedDigest === entry.sha256,
      "source_digest",
      `Entry ${entry.key} source digest differs from its manifest SHA-256.`,
    );
    entry.sourceBytes = source.bytes;
    entry.sourceSize = source.bytes.length;
  }
  for (const issueSeed of issueSeeds) {
    const source = await readRegularFileWithin(
      bundleRoot,
      issueSeed.sourcePath,
      `Issue seed ${issueSeed.key} source`,
    );
    aggregateSourceBytes += source.bytes.length;
    requireCondition(
      aggregateSourceBytes <= MAX_AGGREGATE_SOURCE_BYTES,
      "aggregate_source_limit",
      `Foundation sources exceed the ${MAX_AGGREGATE_SOURCE_BYTES}-byte aggregate boundary.`,
    );
    requireCondition(
      sha256(source.bytes) === issueSeed.sha256,
      "source_digest",
      `Issue seed ${issueSeed.key} source digest differs from its manifest SHA-256.`,
    );
    issueSeed.sourceBytes = source.bytes;
    issueSeed.sourceSize = source.bytes.length;
  }
  return {
    raw,
    schemaVersion,
    key,
    version,
    defaultProfileKey,
    modules,
    schemas: schemaDescriptors,
    schemasByKey: schemaAuthorities.byKey,
    schemasByPath: schemaAuthorities.byPath,
    schemasById: schemaAuthorities.byId,
    entries,
    entriesByKey,
    issueSeeds,
    issueSeedsByKey,
    aggregateSourceBytes,
    manifestPath,
    manifestSha256: sha256(manifestFile.bytes),
  };
}

async function profileCandidateForKey(profileKey, bundleRoot) {
  const sourcePath = assertPortableTargetPath(
    `profiles/${profileKey}.profile.json`,
    `Profile ${profileKey} source path`,
  );
  const source = await readRegularFileWithin(bundleRoot, sourcePath, `Profile ${profileKey} source`);
  return { sourcePath, sourceBytes: source.bytes, expectedKey: profileKey };
}

async function admitProfile(entry, manifest, bundleRoot) {
  const label = `Foundation profile ${entry.sourcePath}`;
  const document = parseJsonCompatible(entry.sourceBytes, label);
  assertExactKeys(
    document,
    [
      "$schema",
      "schemaVersion",
      "artifactType",
      "key",
      "title",
      "foundationManifest",
      "sourceStanding",
      "selectedModules",
      "selectedEntryKeys",
      "selectedIssueSeedKeys",
      "heldDecisions",
      "nextOwnerAction",
      "projection",
    ],
    label,
  );
  await admitSchemaReference(
    document,
    path.join(bundleRoot, entry.sourcePath),
    bundleRoot,
    manifest.schemasByPath,
    "../schema/foundation-profile.schema.v0.1.json",
    label,
  );
  requireCondition(field(document, "schemaVersion", label) === SCHEMA_VERSION, "schema_version", `${label}.schemaVersion must be ${SCHEMA_VERSION}.`);
  requireCondition(field(document, "artifactType", label) === PROFILE_TYPE, "artifact_type", `${label}.artifactType must be ${PROFILE_TYPE}.`);
  const key = semanticKey(field(document, "key", label), `${label}.key`);
  requireCondition(
    entry.expectedKey === undefined || key === entry.expectedKey,
    "profile_identity",
    `${label}.key must match its declared profile key ${entry.expectedKey}.`,
  );
  const title = text(field(document, "title", label), `${label}.title`, { maximum: 160 });
  const foundationManifestPath = assertPortableTargetPath(
    field(document, "foundationManifest", label),
    `${label}.foundationManifest`,
  );
  const manifestReference = assertContainedReference(
    foundationManifestPath,
    bundleRoot,
    bundleRoot,
    `${label}.foundationManifest`,
  );
  requireCondition(
    path.resolve(manifestReference.absolutePath) === path.resolve(manifest.manifestPath),
    "manifest_reference",
    `${label}.foundationManifest must identify the admitted manifest.`,
  );
  await readRegularFileWithin(bundleRoot, manifestReference.relativeToRoot, `${label} manifest reference`);
  const sourceStanding = enumeration(
    field(document, "sourceStanding", label),
    new Set(["source_awaiting", "source_received"]),
    `${label}.sourceStanding`,
  );
  const selectedModules = uniqueSemanticKeyArray(
    field(document, "selectedModules", label),
    `${label}.selectedModules`,
    { maximum: 64 },
  );
  const selectedEntryKeys = uniqueSemanticKeyArray(
    field(document, "selectedEntryKeys", label),
    `${label}.selectedEntryKeys`,
    { maximum: 512 },
  );
  const selectedIssueSeedKeys = uniqueSemanticKeyArray(
    field(document, "selectedIssueSeedKeys", label),
    `${label}.selectedIssueSeedKeys`,
    { maximum: 64 },
  );
  const heldDecisions = denseArray(field(document, "heldDecisions", label), `${label}.heldDecisions`, { maximum: 64 }).map((raw, index) => {
    const decisionLabel = `${label}.heldDecisions[${index}]`;
    assertExactKeys(
      raw,
      ["key", "owner", "state", "decision", "availableRoute", "releaseEvent"],
      decisionLabel,
    );
    requireCondition(field(raw, "state", decisionLabel) === "held", "held_state", `${decisionLabel}.state must be held.`);
    return {
      key: semanticKey(field(raw, "key", decisionLabel), `${decisionLabel}.key`),
      owner: semanticKey(field(raw, "owner", decisionLabel), `${decisionLabel}.owner`),
      state: "held",
      decision: text(field(raw, "decision", decisionLabel), `${decisionLabel}.decision`, { maximum: 500 }),
      availableRoute: text(field(raw, "availableRoute", decisionLabel), `${decisionLabel}.availableRoute`, { maximum: 500 }),
      releaseEvent: text(field(raw, "releaseEvent", decisionLabel), `${decisionLabel}.releaseEvent`, { maximum: 500 }),
    };
  });
  uniqueKeys(heldDecisions, `${label}.heldDecisions`);
  const nextOwnerAction = text(field(document, "nextOwnerAction", label), `${label}.nextOwnerAction`, {
    maximum: 500,
  });
  const projection = await admitExactProjection(
    document,
    path.join(bundleRoot, entry.sourcePath),
    entry.sourceBytes,
    bundleRoot,
    label,
  );
  return {
    key,
    title,
    sourceStanding,
    selectedModules,
    selectedEntryKeys,
    selectedIssueSeedKeys,
    heldDecisions,
    nextOwnerAction,
    projection,
    sourcePath: entry.sourcePath,
    document,
  };
}

function assertProfileClosure(profile, manifest) {
  const selectedModuleSet = new Set(profile.selectedModules);
  const selectedEntrySet = new Set(profile.selectedEntryKeys);
  const selectedIssueSeedSet = new Set(profile.selectedIssueSeedKeys);
  for (const moduleKey of profile.selectedModules) {
    requireCondition(manifest.modules.has(moduleKey), "unknown_module", `Profile ${profile.key} selects unknown module ${moduleKey}.`);
  }
  for (const moduleKey of profile.selectedModules) {
    for (const requirement of manifest.modules.get(moduleKey).requires) {
      requireCondition(
        selectedModuleSet.has(requirement),
        "profile_module_closure",
        `Profile ${profile.key} selects ${moduleKey} without required module ${requirement}.`,
      );
    }
  }
  for (const entryKey of profile.selectedEntryKeys) {
    const entry = manifest.entriesByKey.get(entryKey);
    requireCondition(entry, "unknown_entry", `Profile ${profile.key} selects unknown entry ${entryKey}.`);
    requireCondition(
      selectedModuleSet.has(entry.moduleKey),
      "profile_module_closure",
      `Profile ${profile.key} selects entry ${entry.key} without module ${entry.moduleKey}.`,
    );
    requireCondition(
      entry.profiles.includes(profile.key),
      "profile_entry_closure",
      `Profile ${profile.key} selects entry ${entry.key}, but the entry does not select that profile.`,
    );
  }
  for (const entry of manifest.entries) {
    if (!entry.profiles.includes(profile.key)) continue;
    requireCondition(
      selectedEntrySet.has(entry.key),
      "profile_entry_closure",
      `Entry ${entry.key} selects profile ${profile.key}, but the profile does not select that entry.`,
    );
  }
  for (const moduleKey of profile.selectedModules) {
    requireCondition(
      profile.selectedEntryKeys.some((entryKey) => manifest.entriesByKey.get(entryKey)?.moduleKey === moduleKey),
      "empty_module",
      `Profile ${profile.key} selects module ${moduleKey} without a selected entry.`,
    );
  }
  for (const issueSeedKey of profile.selectedIssueSeedKeys) {
    const issueSeed = manifest.issueSeedsByKey.get(issueSeedKey);
    requireCondition(
      issueSeed,
      "unknown_issue_seed",
      `Profile ${profile.key} selects unknown Issue seed ${issueSeedKey}.`,
    );
    requireCondition(
      issueSeed.profiles.includes(profile.key),
      "profile_issue_seed_closure",
      `Profile ${profile.key} selects Issue seed ${issueSeed.key}, but the seed does not select that profile.`,
    );
  }
  for (const issueSeed of manifest.issueSeeds) {
    if (!issueSeed.profiles.includes(profile.key)) continue;
    requireCondition(
      selectedIssueSeedSet.has(issueSeed.key),
      "profile_issue_seed_closure",
      `Issue seed ${issueSeed.key} selects profile ${profile.key}, but the profile does not select that seed.`,
    );
  }
}

function assertKnownReferences(values, known, label, code) {
  const references = denseArray(values, label, { allowEmpty: true, maximum: 128 });
  for (const [index, value] of references.entries()) {
    const key = semanticKey(value, `${label}[${index}]`);
    requireCondition(known.has(key), code, `${label}[${index}] names unknown key ${key}.`);
  }
}

export function assertTechnologyProfileSemanticClosure(document) {
  const label = "Technology profile";
  record(document, label);
  const source = record(field(document, "source", label), `${label}.source`);
  const revision = record(field(source, "revision", `${label}.source`), `${label}.source.revision`);
  const sourceDigest = record(field(source, "digest", `${label}.source`), `${label}.source.digest`);
  const digestProcedure = text(
    field(sourceDigest, "procedure", `${label}.source.digest`),
    `${label}.source.digest.procedure`,
    { singleLine: true, maximum: 80 },
  );
  const digestProcedureInput = text(
    field(sourceDigest, "procedureInput", `${label}.source.digest`),
    `${label}.source.digest.procedureInput`,
    { singleLine: true, maximum: 512 },
  );
  if (digestProcedure === "git_ls_tree_full_z_sha256_v1") {
    const revisionKind = field(revision, "kind", `${label}.source.revision`);
    const revisionValue = text(
      field(revision, "value", `${label}.source.revision`),
      `${label}.source.revision.value`,
      { singleLine: true, maximum: 64 },
    );
    requireCondition(
      revisionKind === "git_commit" && gitCommitPattern.test(revisionValue),
      "source_digest_revision",
      "A Git-tree digest requires one full lowercase Git commit coordinate.",
    );
    requireCondition(
      digestProcedureInput === revisionValue,
      "source_digest_revision",
      "A Git-tree digest procedureInput must equal the source revision value.",
    );
  }
  if (digestProcedure === "utf8_label_sha256_v1") {
    requireCondition(
      digest(field(sourceDigest, "value", `${label}.source.digest`), `${label}.source.digest.value`)
        === sha256(Buffer.from(digestProcedureInput, "utf8")),
      "source_digest_identity",
      "A UTF-8 label digest must equal the SHA-256 of its exact procedureInput bytes.",
    );
  }
  const evidence = denseArray(field(document, "evidence", label), `${label}.evidence`, { maximum: 512 })
    .map((item, index) => {
      const itemLabel = `${label}.evidence[${index}]`;
      record(item, itemLabel);
      return { key: semanticKey(field(item, "key", itemLabel), `${itemLabel}.key`) };
    });
  const evidenceByKey = uniqueKeys(evidence, `${label}.evidence`);
  const observations = record(field(document, "observations", label), `${label}.observations`);
  const facts = [];

  function admitFacts(items, itemLabel, area) {
    denseArray(items, itemLabel, { maximum: 512 }).forEach((item, index) => {
      const factLabel = `${itemLabel}[${index}]`;
      record(item, factLabel);
      const key = semanticKey(field(item, "key", factLabel), `${factLabel}.key`);
      assertKnownReferences(
        field(item, "evidenceRefs", factLabel),
        evidenceByKey,
        `${factLabel}.evidenceRefs`,
        "unknown_evidence_reference",
      );
      facts.push({ key, area, item, label: factLabel });
    });
  }

  if (owns(observations, "sourceLayout")) {
    const sourceLayout = record(observations.sourceLayout, `${label}.observations.sourceLayout`);
    for (const key of ["editableSource", "generatedOutput"]) {
      if (owns(sourceLayout, key)) {
        admitFacts(sourceLayout[key], `${label}.observations.sourceLayout.${key}`, "source-layout");
      }
    }
  }
  const observationCollections = [
    ["runtimes", "runtimes"],
    ["packageManagers", "package-managers"],
    ["lockfiles", "lockfiles"],
    ["manifests", "manifests"],
    ["scripts", "scripts"],
    ["commands", "commands"],
    ["routes", "routes"],
    ["assets", "assets"],
    ["styles", "styles"],
    ["fonts", "fonts"],
    ["environmentVariables", "environment-variables"],
    ["externalRequests", "external-requests"],
    ["forms", "forms"],
    ["storage", "storage"],
    ["authentication", "authentication"],
    ["analytics", "analytics"],
    ["hosting", "hosting"],
    ["browserStates", "browser-states"],
  ];
  for (const [key, area] of observationCollections) {
    if (owns(observations, key)) admitFacts(observations[key], `${label}.observations.${key}`, area);
  }
  if (owns(observations, "pagesCompatibility")) {
    admitFacts([observations.pagesCompatibility], `${label}.observations.pagesCompatibility`, "pages-compatibility");
  }
  const factsByKey = uniqueKeys(facts, `${label}.observations facts`);

  if (owns(observations, "commands")) {
    const scripts = new Set((observations.scripts ?? []).map((item) => item.key));
    for (const [index, command] of observations.commands.entries()) {
      const scriptKey = semanticKey(command.scriptKey, `${label}.observations.commands[${index}].scriptKey`);
      requireCondition(
        scripts.has(scriptKey),
        "unknown_script_reference",
        `${label}.observations.commands[${index}].scriptKey names unknown script ${scriptKey}.`,
      );
    }
  }
  if (owns(observations, "browserStates")) {
    const routes = new Set((observations.routes ?? []).map((item) => item.key));
    for (const [index, browserState] of observations.browserStates.entries()) {
      const routeKey = semanticKey(browserState.routeKey, `${label}.observations.browserStates[${index}].routeKey`);
      requireCondition(
        routes.has(routeKey),
        "unknown_route_reference",
        `${label}.observations.browserStates[${index}].routeKey names unknown route ${routeKey}.`,
      );
    }
  }

  const coverage = denseArray(field(document, "coverage", label), `${label}.coverage`, { maximum: 64 })
    .map((item, index) => {
      const itemLabel = `${label}.coverage[${index}]`;
      record(item, itemLabel);
      assertKnownReferences(
        field(item, "evidenceRefs", itemLabel),
        evidenceByKey,
        `${itemLabel}.evidenceRefs`,
        "unknown_evidence_reference",
      );
      assertKnownReferences(
        field(item, "factKeys", itemLabel),
        factsByKey,
        `${itemLabel}.factKeys`,
        "unknown_fact_reference",
      );
      const area = text(field(item, "area", itemLabel), `${itemLabel}.area`, {
        singleLine: true,
        maximum: 80,
      });
      for (const factKey of item.factKeys) {
        requireCondition(
          factsByKey.get(factKey).area === area,
          "fact_area_mismatch",
          `${itemLabel}.factKeys names ${factKey} from ${factsByKey.get(factKey).area}, rather than ${area}.`,
        );
      }
      return { key: semanticKey(field(item, "key", itemLabel), `${itemLabel}.key`) };
    });
  uniqueKeys(coverage, `${label}.coverage`);

  const unresolved = denseArray(field(document, "unresolved", label), `${label}.unresolved`, {
    allowEmpty: true,
    maximum: 128,
  }).map((item, index) => {
    const itemLabel = `${label}.unresolved[${index}]`;
    record(item, itemLabel);
    assertKnownReferences(
      field(item, "evidenceRefs", itemLabel),
      evidenceByKey,
      `${itemLabel}.evidenceRefs`,
      "unknown_evidence_reference",
    );
    return { key: semanticKey(field(item, "key", itemLabel), `${itemLabel}.key`) };
  });
  uniqueKeys(unresolved, `${label}.unresolved`);

  return {
    evidence: evidenceByKey.size,
    facts: factsByKey.size,
    coverage: coverage.length,
    unresolved: unresolved.length,
  };
}

export function assertSourceReceivedProfileClosure(document, baseProfileDocument) {
  const label = "Source-received profile";
  const baseLabel = "Base source-awaiting profile";
  record(document, label);
  record(baseProfileDocument, baseLabel);
  requireCondition(
    field(document, "sourceStanding", label) === "source_received",
    "source_received_profile",
    `${label}.sourceStanding must be source_received.`,
  );
  requireCondition(
    field(baseProfileDocument, "sourceStanding", baseLabel) === "source_awaiting",
    "source_received_profile",
    `${baseLabel}.sourceStanding must be source_awaiting.`,
  );
  const baseReference = record(field(document, "baseProfile", label), `${label}.baseProfile`);
  const baseKey = semanticKey(field(baseProfileDocument, "key", baseLabel), `${baseLabel}.key`);
  requireCondition(
    semanticKey(field(baseReference, "key", `${label}.baseProfile`), `${label}.baseProfile.key`) === baseKey,
    "base_profile_identity",
    `${label}.baseProfile.key must equal the received base profile key.`,
  );
  const selections = [
    ["selectedModules", 64],
    ["selectedEntryKeys", 512],
    ["selectedIssueSeedKeys", 64],
  ];
  for (const [key, maximum] of selections) {
    const selected = uniqueSemanticKeyArray(field(document, key, label), `${label}.${key}`, { maximum });
    const baseSelected = uniqueSemanticKeyArray(
      field(baseProfileDocument, key, baseLabel),
      `${baseLabel}.${key}`,
      { maximum },
    );
    requireCondition(
      selected.length === baseSelected.length
        && selected.every((value, index) => value === baseSelected[index]),
      "derived_profile_selection",
      `${label}.${key} must preserve the exact ordered selection from ${baseLabel}.${key}.`,
    );
  }
  return {
    baseProfileKey: baseKey,
    selectedModules: document.selectedModules.length,
    selectedEntries: document.selectedEntryKeys.length,
    selectedIssueSeeds: document.selectedIssueSeedKeys.length,
  };
}

async function admitIssueSeed(entry, manifest, bundleRoot, aggregateBudget) {
  const label = `Issue seed ${entry.sourcePath}`;
  const document = parseJsonCompatible(entry.sourceBytes, label);
  assertExactKeys(
    document,
    [
      "$schema",
      "schemaVersion",
      "artifactType",
      "key",
      "title",
      "currentFrontKey",
      "materializationPolicy",
      "labels",
      "milestones",
      "relationTypes",
      "issues",
      "relations",
      "projection",
    ],
    label,
  );
  await admitSchemaReference(
    document,
    path.join(bundleRoot, entry.sourcePath),
    bundleRoot,
    manifest.schemasByPath,
    "../schema/issue-route-seed.schema.v0.1.json",
    label,
  );
  requireCondition(field(document, "schemaVersion", label) === SCHEMA_VERSION, "schema_version", `${label}.schemaVersion must be ${SCHEMA_VERSION}.`);
  requireCondition(field(document, "artifactType", label) === ISSUE_SEED_TYPE, "artifact_type", `${label}.artifactType must be ${ISSUE_SEED_TYPE}.`);
  const key = semanticKey(field(document, "key", label), `${label}.key`);
  const title = text(field(document, "title", label), `${label}.title`, { maximum: 200 });
  const materializationPolicyRaw = record(
    field(document, "materializationPolicy", label),
    `${label}.materializationPolicy`,
  );
  assertExactKeys(
    materializationPolicyRaw,
    ["liveIssueAuthorityAfterMaterialization", "existingIssuePolicy", "linkResolution"],
    `${label}.materializationPolicy`,
  );
  requireCondition(
    field(materializationPolicyRaw, "liveIssueAuthorityAfterMaterialization", `${label}.materializationPolicy`) === true,
    "materialization_policy",
    `${label}.materializationPolicy must make live Issues authoritative after materialization.`,
  );
  requireCondition(
    field(materializationPolicyRaw, "existingIssuePolicy", `${label}.materializationPolicy`) === "preserve_and_report",
    "materialization_policy",
    `${label}.materializationPolicy.existingIssuePolicy must be preserve_and_report.`,
  );
  requireCondition(
    field(materializationPolicyRaw, "linkResolution", `${label}.materializationPolicy`) === "two_pass",
    "materialization_policy",
    `${label}.materializationPolicy.linkResolution must be two_pass.`,
  );

  const relationTypes = denseArray(
    field(document, "relationTypes", label),
    `${label}.relationTypes`,
    { maximum: 16 },
  ).map((raw, index) => {
    const typeLabel = `${label}.relationTypes[${index}]`;
    assertExactKeys(raw, ["key", "inverseType", "description"], typeLabel);
    const typeKey = enumeration(field(raw, "key", typeLabel), issueRelationTypes, `${typeLabel}.key`);
    return {
      key: typeKey,
      inverseType: enumeration(
        field(raw, "inverseType", typeLabel),
        issueRelationTypes,
        `${typeLabel}.inverseType`,
      ),
      description: text(field(raw, "description", typeLabel), `${typeLabel}.description`, {
        maximum: 300,
      }),
    };
  });
  const relationTypesByKey = uniqueKeys(relationTypes, `${label}.relationTypes`);
  for (const relationType of relationTypes) {
    requireCondition(
      relationType.inverseType === expectedInverseRelationType.get(relationType.key),
      "relation_type_semantics",
      `Relation type ${relationType.key} requires inverse ${expectedInverseRelationType.get(relationType.key)}.`,
    );
    const inverse = relationTypesByKey.get(relationType.inverseType);
    requireCondition(
      inverse && inverse.inverseType === relationType.key,
      "relation_type_closure",
      `Relation type ${relationType.key} requires a reciprocal declared inverse ${relationType.inverseType}.`,
    );
  }

  const labels = denseArray(field(document, "labels", label), `${label}.labels`, { maximum: 64 }).map((raw, index) => {
    const itemLabel = `${label}.labels[${index}]`;
    assertExactKeys(raw, ["key", "name", "color", "description"], itemLabel);
    const color = text(field(raw, "color", itemLabel), `${itemLabel}.color`, { singleLine: true });
    requireCondition(/^[0-9A-Fa-f]{6}$/u.test(color), "label_color", `${itemLabel}.color must be six hexadecimal digits.`);
    return {
      key: semanticKey(field(raw, "key", itemLabel), `${itemLabel}.key`),
      name: text(field(raw, "name", itemLabel), `${itemLabel}.name`, { singleLine: true, maximum: 50 }),
      color,
      description: text(field(raw, "description", itemLabel), `${itemLabel}.description`, { maximum: 100 }),
    };
  });
  const labelsByKey = uniqueKeys(labels, `${label}.labels`);
  requireCondition(new Set(labels.map((item) => item.name.toLowerCase())).size === labels.length, "duplicate_label", `${label}.labels repeats a case-folded label name.`);

  const milestones = denseArray(field(document, "milestones", label), `${label}.milestones`, { maximum: 32 }).map((raw, index) => {
    const itemLabel = `${label}.milestones[${index}]`;
    assertExactKeys(raw, ["key", "title", "description"], itemLabel);
    return {
      key: semanticKey(field(raw, "key", itemLabel), `${itemLabel}.key`),
      title: text(field(raw, "title", itemLabel), `${itemLabel}.title`, { maximum: 256 }),
      description: text(field(raw, "description", itemLabel), `${itemLabel}.description`, {
        maximum: 500,
      }),
    };
  });
  const milestonesByKey = uniqueKeys(milestones, `${label}.milestones`);

  const issueBaseDirectory = bundleRoot;
  const issues = [];
  const rawIssues = denseArray(
    field(document, "issues", label),
    `${label}.issues`,
    { maximum: 128 },
  );
  requireCondition(rawIssues.length >= 2, "issue_count", `${label}.issues must contain at least two Issues.`);
  for (const [index, raw] of rawIssues.entries()) {
    const itemLabel = `${label}.issues[${index}]`;
    assertExactKeys(
      raw,
      [
        "key",
        "title",
        "bodySource",
        "bodySha256",
        "labels",
        "milestoneKey",
        "acceptance",
        "authority",
        "nextReceiver",
      ],
      itemLabel,
    );
    const issueKey = semanticKey(field(raw, "key", itemLabel), `${itemLabel}.key`);
    const bodySource = assertPortableTargetPath(
      field(raw, "bodySource", itemLabel),
      `${itemLabel}.bodySource`,
    );
    const bodyReference = assertContainedReference(
      bodySource,
      issueBaseDirectory,
      bundleRoot,
      `${itemLabel}.bodySource`,
    );
    const bodyFile = await readRegularFileWithin(bundleRoot, bodyReference.relativeToRoot, `${itemLabel} bodySource`, { maximum: MAX_DOCUMENT_BYTES });
    aggregateBudget.issueBodyBytes += bodyFile.bytes.length;
    requireCondition(
      aggregateBudget.issueBodyBytes <= MAX_AGGREGATE_BODY_BYTES,
      "aggregate_body_limit",
      `Foundation Issue bodies exceed the ${MAX_AGGREGATE_BODY_BYTES}-byte aggregate boundary.`,
    );
    const bodyText = decodeUtf8(bodyFile.bytes, `${itemLabel}.bodySource`);
    requireCondition(
      bodyText.trim().length > 0,
      "issue_body_text",
      `${itemLabel}.bodySource must contain nonempty UTF-8 Markdown.`,
    );
    const bodySha256 = digest(field(raw, "bodySha256", itemLabel), `${itemLabel}.bodySha256`);
    requireCondition(
      sha256(bodyFile.bytes) === bodySha256,
      "body_digest",
      `${itemLabel}.bodySource differs from its bodySha256.`,
    );
    const acceptance = denseArray(
      field(raw, "acceptance", itemLabel),
      `${itemLabel}.acceptance`,
      { maximum: 32 },
    ).map((criterion, criterionIndex) => {
      const criterionLabel = `${itemLabel}.acceptance[${criterionIndex}]`;
      assertExactKeys(criterion, ["key", "statement"], criterionLabel);
      return {
        key: semanticKey(field(criterion, "key", criterionLabel), `${criterionLabel}.key`),
        statement: text(field(criterion, "statement", criterionLabel), `${criterionLabel}.statement`, {
          maximum: 500,
        }),
      };
    });
    uniqueKeys(acceptance, `${itemLabel}.acceptance`);
    const authority = denseArray(
      field(raw, "authority", itemLabel),
      `${itemLabel}.authority`,
      { maximum: 32 },
    ).map((authorityItem, authorityIndex) => {
      const authorityLabel = `${itemLabel}.authority[${authorityIndex}]`;
      assertExactKeys(authorityItem, ["key", "owner", "state", "statement"], authorityLabel);
      return {
        key: semanticKey(field(authorityItem, "key", authorityLabel), `${authorityLabel}.key`),
        owner: semanticKey(field(authorityItem, "owner", authorityLabel), `${authorityLabel}.owner`),
        state: enumeration(field(authorityItem, "state", authorityLabel), new Set(["held", "active"]), `${authorityLabel}.state`),
        statement: text(field(authorityItem, "statement", authorityLabel), `${authorityLabel}.statement`, {
          maximum: 500,
        }),
      };
    });
    uniqueKeys(authority, `${itemLabel}.authority`);
    const nextReceiverRaw = record(field(raw, "nextReceiver", itemLabel), `${itemLabel}.nextReceiver`);
    assertExactKeys(nextReceiverRaw, ["type", "key", "condition"], `${itemLabel}.nextReceiver`);
    issues.push({
      key: issueKey,
      title: text(field(raw, "title", itemLabel), `${itemLabel}.title`, { maximum: 256 }),
      bodySource: bodyReference.relativeToRoot,
      bodySha256,
      labels: uniqueSemanticKeyArray(
        field(raw, "labels", itemLabel),
        `${itemLabel}.labels`,
        { maximum: 32 },
      ),
      milestoneKey: semanticKey(field(raw, "milestoneKey", itemLabel), `${itemLabel}.milestoneKey`),
      acceptance,
      authority,
      nextReceiver: {
        type: enumeration(
          field(nextReceiverRaw, "type", `${itemLabel}.nextReceiver`),
          new Set(["issue", "owner", "external"]),
          `${itemLabel}.nextReceiver.type`,
        ),
        key: semanticKey(field(nextReceiverRaw, "key", `${itemLabel}.nextReceiver`), `${itemLabel}.nextReceiver.key`),
        condition: text(
          field(nextReceiverRaw, "condition", `${itemLabel}.nextReceiver`),
          `${itemLabel}.nextReceiver.condition`,
          { maximum: 500 },
        ),
      },
    });
  }
  const issuesByKey = uniqueKeys(issues, `${label}.issues`);
  const currentFrontKey = semanticKey(field(document, "currentFrontKey", label), `${label}.currentFrontKey`);
  requireCondition(issuesByKey.has(currentFrontKey), "current_front", `${label}.currentFrontKey names unknown Issue ${currentFrontKey}.`);
  for (const issue of issues) {
    for (const labelKey of issue.labels) {
      requireCondition(labelsByKey.has(labelKey), "unknown_label", `Issue ${issue.key} names unknown label ${labelKey}.`);
    }
    requireCondition(
      milestonesByKey.has(issue.milestoneKey),
      "unknown_milestone",
      `Issue ${issue.key} names unknown milestone ${issue.milestoneKey}.`,
    );
    if (issue.nextReceiver.type === "issue") {
      requireCondition(
        issuesByKey.has(issue.nextReceiver.key),
        "unknown_issue",
        `Issue ${issue.key} names unknown next receiver ${issue.nextReceiver.key}.`,
      );
    }
  }
  const relations = denseArray(
    field(document, "relations", label),
    `${label}.relations`,
    { maximum: 512 },
  ).map((raw, index) => {
    const relationLabel = `${label}.relations[${index}]`;
    assertExactKeys(
      raw,
      ["key", "fromIssueKey", "type", "toIssueKey", "condition", "inverseRelationKey"],
      relationLabel,
    );
    const relation = {
      key: semanticKey(field(raw, "key", relationLabel), `${relationLabel}.key`),
      fromIssueKey: semanticKey(field(raw, "fromIssueKey", relationLabel), `${relationLabel}.fromIssueKey`),
      type: enumeration(
        field(raw, "type", relationLabel),
        new Set(relationTypesByKey.keys()),
        `${relationLabel}.type`,
      ),
      toIssueKey: semanticKey(field(raw, "toIssueKey", relationLabel), `${relationLabel}.toIssueKey`),
      condition: text(field(raw, "condition", relationLabel), `${relationLabel}.condition`, {
        maximum: 500,
      }),
      inverseRelationKey: semanticKey(
        field(raw, "inverseRelationKey", relationLabel),
        `${relationLabel}.inverseRelationKey`,
      ),
    };
    requireCondition(issuesByKey.has(relation.fromIssueKey), "unknown_issue", `Relation ${relation.key} names unknown source Issue ${relation.fromIssueKey}.`);
    requireCondition(issuesByKey.has(relation.toIssueKey), "unknown_issue", `Relation ${relation.key} names unknown target Issue ${relation.toIssueKey}.`);
    return relation;
  });
  const relationsByKey = uniqueKeys(relations, `${label}.relations`);
  for (const relation of relations) {
    const inverse = relationsByKey.get(relation.inverseRelationKey);
    const declaredType = relationTypesByKey.get(relation.type);
    requireCondition(
      inverse
        && inverse.inverseRelationKey === relation.key
        && inverse.fromIssueKey === relation.toIssueKey
        && inverse.toIssueKey === relation.fromIssueKey
        && inverse.type === declaredType.inverseType,
      "relation_closure",
      `Relation ${relation.key} requires one reciprocal inverse relation ${relation.inverseRelationKey}.`,
    );
  }
  const projection = await admitExactProjection(
    document,
    path.join(bundleRoot, entry.sourcePath),
    entry.sourceBytes,
    bundleRoot,
    label,
  );
  return {
    key,
    title,
    currentFrontKey,
    materializationPolicy: {
      liveIssueAuthorityAfterMaterialization: true,
      existingIssuePolicy: "preserve_and_report",
      linkResolution: "two_pass",
    },
    labels,
    milestones,
    relationTypes,
    issues,
    relations,
    projection,
    sourcePath: entry.sourcePath,
  };
}

export async function admitFoundation({
  bundleRoot = foundationDefaults.bundleRoot,
  manifestPath = path.join(bundleRoot, DEFAULT_MANIFEST_NAME),
  profileKey = undefined,
} = {}) {
  const resolvedBundleRoot = path.resolve(bundleRoot);
  const resolvedManifestPath = path.resolve(manifestPath);
  const manifest = await admitManifest(resolvedManifestPath, resolvedBundleRoot);

  const declaredProfileKeys = new Set([
    manifest.defaultProfileKey,
    ...manifest.entries.flatMap((entry) => entry.profiles),
    ...manifest.issueSeeds.flatMap((issueSeed) => issueSeed.profiles),
  ]);
  requireCondition(
    declaredProfileKeys.size <= MAX_PROFILES,
    "profile_limit",
    `Foundation manifest declares more than ${MAX_PROFILES} distinct profiles.`,
  );
  const profileList = [];
  let aggregateProfileBytes = 0;
  for (const declaredProfileKey of [...declaredProfileKeys].sort(compareUtf8)) {
    const entry = await profileCandidateForKey(declaredProfileKey, resolvedBundleRoot);
    aggregateProfileBytes += entry.sourceBytes.length;
    requireCondition(
      aggregateProfileBytes <= MAX_AGGREGATE_PROFILE_BYTES,
      "aggregate_profile_limit",
      `Foundation profiles exceed the ${MAX_AGGREGATE_PROFILE_BYTES}-byte aggregate boundary.`,
    );
    profileList.push(await admitProfile(entry, manifest, resolvedBundleRoot));
  }
  requireCondition(profileList.length > 0, "profile", "Foundation manifest must include at least one authoritative JSON profile entry.");
  const profiles = uniqueKeys(profileList, "Foundation profiles");
  requireCondition(profiles.has(manifest.defaultProfileKey), "default_profile", `Manifest defaultProfileKey names unknown profile ${manifest.defaultProfileKey}.`);
  for (const entry of manifest.entries) {
    for (const selectedProfile of entry.profiles) {
      requireCondition(profiles.has(selectedProfile), "unknown_profile", `Entry ${entry.key} names unknown profile ${selectedProfile}.`);
    }
  }
  for (const issueSeed of manifest.issueSeeds) {
    for (const selectedProfile of issueSeed.profiles) {
      requireCondition(
        profiles.has(selectedProfile),
        "unknown_profile",
        `Issue seed ${issueSeed.key} names unknown profile ${selectedProfile}.`,
      );
    }
  }
  for (const profile of profiles.values()) assertProfileClosure(profile, manifest);
  const selectedProfileKey = profileKey ?? manifest.defaultProfileKey;
  requireCondition(profiles.has(selectedProfileKey), "profile_selection", `Choose a declared foundation profile; received ${selectedProfileKey}.`);

  const admittedIssueSeeds = [];
  const aggregateBudget = { issueBodyBytes: 0 };
  for (const issueSeed of manifest.issueSeeds) {
    const admitted = await admitIssueSeed(issueSeed, manifest, resolvedBundleRoot, aggregateBudget);
    requireCondition(
      admitted.key === issueSeed.key,
      "issue_seed_identity",
      `Issue seed ${issueSeed.sourcePath}.key must match manifest key ${issueSeed.key}.`,
    );
    admittedIssueSeeds.push(admitted);
  }
  const admittedIssueSeedsByKey = uniqueKeys(admittedIssueSeeds, "Foundation Issue seeds");
  const selectedProfile = profiles.get(selectedProfileKey);
  const issueSeeds = selectedProfile.selectedIssueSeedKeys.map((key) => admittedIssueSeedsByKey.get(key));

  return freezeAdmittedGraph({
    bundleRoot: resolvedBundleRoot,
    manifest,
    profiles,
    profile: selectedProfile,
    issueSeeds,
  });
}

async function inspectTargetEntry(targetRoot, entry) {
  const portableAlias = await findPortableAlias(targetRoot, entry.targetPath);
  if (portableAlias !== null) {
    return { state: "invalid_entry", reason: portableAlias };
  }
  const walked = await walkContainedPath(targetRoot, entry.targetPath, `Target ${entry.targetPath}`, { allowMissing: true });
  if (walked.kind === "missing") {
    return { state: "create", reason: `missing at ${walked.missingAt}` };
  }
  if (walked.kind === "invalid") {
    return { state: "invalid_entry", reason: walked.reason };
  }
  let handle;
  try {
    handle = await open(
      walked.absolutePath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | (fsConstants.O_NONBLOCK ?? 0),
    );
    const status = await handle.stat();
    if (!status.isFile()) return { state: "invalid_entry", reason: "not_regular_file" };
    if (!sameFileIdentity(walked.status, status)) {
      return { state: "invalid_entry", reason: "path_changed_while_opening" };
    }
    if (status.size > MAX_TARGET_COMPARISON_BYTES) {
      return {
        state: "preserve_collision",
        reason: entry.verificationPolicy === "present_regular_file"
          ? "present_regular_file_exceeds_comparison_budget"
          : "exact_bytes_exceeds_comparison_budget",
        observedBytes: status.size,
      };
    }
    if (entry.verificationPolicy === "exact_bytes" && status.size !== entry.sourceSize) {
      return {
        state: "preserve_collision",
        reason: "exact_bytes_size_difference",
        observedBytes: status.size,
      };
    }
    let bytes;
    try {
      bytes = await readHandleBounded(handle, MAX_TARGET_COMPARISON_BYTES, `Target ${entry.targetPath}`);
    } catch (error) {
      if (error instanceof FoundationError && error.code === "file_limit") {
        return {
          state: "preserve_collision",
          reason: entry.verificationPolicy === "present_regular_file"
            ? "present_regular_file_exceeds_comparison_budget"
            : "exact_bytes_exceeds_comparison_budget",
        };
      }
      throw error;
    }
    const finalStatus = await handle.stat();
    if (
      !finalStatus.isFile()
      || !sameFileIdentity(status, finalStatus)
      || finalStatus.size !== bytes.length
    ) {
      return { state: "invalid_entry", reason: "target_changed_during_read" };
    }
    if (sha256(bytes) === entry.sha256 && bytes.equals(entry.sourceBytes)) {
      return {
        state: "same",
        reason: entry.verificationPolicy === "present_regular_file"
          ? "present_regular_file_exact_source"
          : "exact_bytes",
        observedBytes: bytes.length,
      };
    }
    return {
      state: "preserve_collision",
      reason: entry.verificationPolicy === "exact_bytes"
        ? "exact_bytes_difference"
        : entry.ownership === "receiving_owner"
          ? "receiving_owner_difference"
          : "present_regular_file_difference",
      observedBytes: bytes.length,
      observedSha256: sha256(bytes),
    };
  } catch (error) {
    if (error?.code === "ELOOP") return { state: "invalid_entry", reason: "symlink" };
    throw error;
  } finally {
    await handle?.close();
  }
}

async function findPortableAlias(root, relativePath) {
  const components = relativePath.split("/");
  let current = root;
  for (const component of components) {
    const status = await lstatOrNull(current);
    if (status === null) return null;
    if (status.isSymbolicLink()) return "symlink";
    if (!status.isDirectory()) return "non_directory_component";
    const matchingNames = [];
    let count = 0;
    const directory = await opendir(current);
    try {
      for await (const entry of directory) {
        count += 1;
        requireCondition(
          count <= MAX_ENTRIES,
          "directory_limit",
          `Target directory exceeds the ${MAX_ENTRIES}-entry comparison boundary.`,
        );
        if (portablePathKey(entry.name) === portablePathKey(component)) matchingNames.push(entry.name);
      }
    } finally {
      await directory.close().catch((error) => {
        if (error?.code !== "ERR_DIR_CLOSED") throw error;
      });
    }
    if (matchingNames.length === 0) return null;
    if (matchingNames.length !== 1 || matchingNames[0] !== component) return "portable_case_alias";
    current = path.join(current, component);
  }
  return null;
}

function publicEntry(entry, observation) {
  return {
    key: entry.key,
    moduleKey: entry.moduleKey,
    targetPath: entry.targetPath,
    state: observation.state,
    reason: observation.reason,
    ownership: entry.ownership,
    collisionPolicy: entry.collisionPolicy,
    verificationPolicy: entry.verificationPolicy,
    sourceSha256: entry.sha256,
    sourceBytes: entry.sourceSize,
    ...(observation.observedSha256 ? { observedSha256: observation.observedSha256 } : {}),
    ...(Number.isSafeInteger(observation.observedBytes) ? { observedBytes: observation.observedBytes } : {}),
  };
}

function planIdentityEntry(entry) {
  return {
    key: entry.key,
    moduleKey: entry.moduleKey,
    targetPath: entry.targetPath,
    state: entry.state,
    reason: entry.reason,
    ownership: entry.ownership,
    collisionPolicy: entry.collisionPolicy,
    verificationPolicy: entry.verificationPolicy,
    sourceSha256: entry.sourceSha256,
    sourceBytes: entry.sourceBytes,
    ...(entry.observedSha256 ? { observedSha256: entry.observedSha256 } : {}),
    ...(Number.isSafeInteger(entry.observedBytes) ? { observedBytes: entry.observedBytes } : {}),
  };
}

function applyBlockers(entries, selectedEntryKeys) {
  const selected = new Set(selectedEntryKeys);
  return entries
    .filter((entry) => selected.has(entry.key))
    .flatMap((entry) => {
      if (entry.state === "invalid_entry") {
        return [{ key: entry.key, targetPath: entry.targetPath, reason: entry.reason }];
      }
      if (entry.state === "preserve_collision" && entry.verificationPolicy === "exact_bytes") {
        return [{ key: entry.key, targetPath: entry.targetPath, reason: "exact_bytes_collision" }];
      }
      return [];
    });
}

function planSha256For(foundation, entries, receipt) {
  const identity = {
    foundationKey: foundation.manifest.key,
    foundationVersion: foundation.manifest.version,
    manifestSha256: foundation.manifest.manifestSha256,
    profileKey: foundation.profile.key,
    profileSha256: foundation.profile.projection.sha256,
    receipt,
    entries: entries.map(planIdentityEntry),
  };
  return `sha256:${sha256(Buffer.from(canonicalJson(identity), "utf8"))}`;
}

function assertAdmittedSourceDescriptor(descriptor, label) {
  digest(descriptor.sha256, `${label}.sha256`);
  requireCondition(
    Buffer.isBuffer(descriptor.sourceBytes)
      && descriptor.sourceSize === descriptor.sourceBytes.length
      && sha256(descriptor.sourceBytes) === descriptor.sha256,
    "admitted_source_identity",
    `${label} source bytes must retain their declared identity.`,
  );
}

function assertAdmittedPlanEntry(entry) {
  record(entry, "Admitted foundation entry");
  semanticKey(entry.key, "Admitted foundation entry.key");
  semanticKey(entry.moduleKey, `Admitted foundation entry ${entry.key}.moduleKey`);
  assertPortableTargetPath(entry.targetPath, `Admitted foundation entry ${entry.key}.targetPath`);
  enumeration(entry.ownership, entryOwnerships, `Admitted foundation entry ${entry.key}.ownership`);
  enumeration(entry.collisionPolicy, collisionPolicies, `Admitted foundation entry ${entry.key}.collisionPolicy`);
  enumeration(entry.verificationPolicy, verificationPolicies, `Admitted foundation entry ${entry.key}.verificationPolicy`);
  requireCondition(
    entry.ownership !== "foundation_generator" || entry.verificationPolicy === "exact_bytes",
    "ownership_verification",
    `Admitted foundation entry ${entry.key} uses foundation_generator ownership and therefore requires exact_bytes verification.`,
  );
  assertAdmittedSourceDescriptor(entry, `Admitted foundation entry ${entry.key}`);
}

export async function createFoundationPlan(foundation, { targetRoot = foundationDefaults.targetRoot } = {}) {
  const resolvedTargetRoot = path.resolve(targetRoot);
  await assertDirectoryRoot(resolvedTargetRoot, "Foundation target root");
  const selected = new Set(foundation.profile.selectedEntryKeys);
  const ordered = [...foundation.manifest.entries].sort((left, right) => {
    const pathOrder = compareUtf8(left.targetPath, right.targetPath);
    return pathOrder || compareUtf8(left.key, right.key);
  });
  const entries = [];
  for (const entry of ordered) {
    assertAdmittedPlanEntry(entry);
    if (!selected.has(entry.key)) {
      entries.push(publicEntry(entry, { state: "held", reason: "not_selected_by_profile" }));
      continue;
    }
    entries.push(publicEntry(entry, await inspectTargetEntry(resolvedTargetRoot, entry)));
  }
  const counts = Object.fromEntries(
    ["create", "same", "preserve_collision", "held", "invalid_entry"].map((state) => [
      state,
      entries.filter((entry) => entry.state === state).length,
    ]),
  );
  const expectedReceipt = foundationReceipt(foundation, { entries });
  const expectedReceiptBytes = receiptBytes(expectedReceipt);
  const receiptObservation = await inspectTargetEntry(resolvedTargetRoot, {
    targetPath: FOUNDATION_RECEIPT_PATH,
    verificationPolicy: "exact_bytes",
    ownership: "foundation_generator",
    sha256: sha256(expectedReceiptBytes),
    sourceSize: expectedReceiptBytes.length,
    sourceBytes: expectedReceiptBytes,
  });
  const receipt = {
    path: FOUNDATION_RECEIPT_PATH,
    state: receiptObservation.state,
    reason: receiptObservation.state === "create" ? "absent" : receiptObservation.reason,
    expectedSha256: sha256(expectedReceiptBytes),
    expectedBytes: expectedReceiptBytes.length,
    ...(receiptObservation.observedSha256 ? { observedSha256: receiptObservation.observedSha256 } : {}),
    ...(Number.isSafeInteger(receiptObservation.observedBytes)
      ? { observedBytes: receiptObservation.observedBytes }
      : {}),
  };
  const blockingReasons = applyBlockers(entries, foundation.profile.selectedEntryKeys);
  if (!["create", "same"].includes(receipt.state)) {
    blockingReasons.push({
      key: "foundation-receipt",
      targetPath: FOUNDATION_RECEIPT_PATH,
      reason: receipt.state === "invalid_entry" ? receipt.reason : "exact_bytes_collision",
    });
  }
  return {
    ok: counts.invalid_entry === 0 && receipt.state !== "invalid_entry",
    applyEligible: blockingReasons.length === 0,
    mode: "plan",
    execution: "read_only",
    foundationKey: foundation.manifest.key,
    foundationVersion: foundation.manifest.version,
    manifestSha256: foundation.manifest.manifestSha256,
    profileKey: foundation.profile.key,
    profileSha256: foundation.profile.projection.sha256,
    targetRoot: resolvedTargetRoot,
    planSha256: planSha256For(foundation, entries, receipt),
    receipt,
    entries,
    summary: { total: entries.length, ...counts },
    blockingReasons,
    heldDecisions: foundation.profile.heldDecisions,
    nextOwnerAction: foundation.profile.nextOwnerAction,
  };
}

export async function verifyFoundation(foundation, { targetRoot = foundationDefaults.targetRoot } = {}) {
  const plan = await createFoundationPlan(foundation, { targetRoot });
  const selected = new Set(foundation.profile.selectedEntryKeys);
  const entries = plan.entries.map((entry) => {
    if (!selected.has(entry.key)) return { ...entry, verification: "held" };
    if (entry.state === "same") return { ...entry, verification: "verified" };
    if (entry.state === "create") return { ...entry, verification: "missing" };
    if (entry.state === "invalid_entry") return { ...entry, verification: "invalid_entry" };
    if (entry.state === "preserve_collision" && entry.verificationPolicy === "present_regular_file") {
      return { ...entry, verification: "preserved_difference" };
    }
    return { ...entry, verification: "mismatch" };
  });
  const required = entries.filter((entry) => selected.has(entry.key));
  const failures = required.filter((entry) => ["missing", "invalid_entry", "mismatch"].includes(entry.verification));
  const preservedDifferences = required.filter((entry) => entry.verification === "preserved_difference");
  return {
    ok: failures.length === 0,
    mode: "verify",
    execution: "read_only",
    foundationKey: foundation.manifest.key,
    foundationVersion: foundation.manifest.version,
    manifestSha256: foundation.manifest.manifestSha256,
    profileKey: foundation.profile.key,
    profileSha256: foundation.profile.projection.sha256,
    targetRoot: plan.targetRoot,
    entries,
    summary: {
      required: required.length,
      verified: required.filter((entry) => entry.verification === "verified").length,
      preservedDifferences: preservedDifferences.length,
      missing: required.filter((entry) => entry.verification === "missing").length,
      invalidEntries: required.filter((entry) => entry.verification === "invalid_entry").length,
      mismatches: required.filter((entry) => entry.verification === "mismatch").length,
      held: entries.filter((entry) => entry.verification === "held").length,
    },
    coverageBoundary: "Structural admission and selected target-file policy only; received application behavior and live GitHub state retain their own evidence routes.",
  };
}

function foundationReceipt(foundation, plan) {
  const receiptSchema = foundation.manifest.schemasByKey.get("local-materialization-receipt");
  requireCondition(
    receiptSchema !== undefined,
    "receipt_schema",
    "The admitted manifest must identify the local materialization receipt schema.",
  );
  const selected = new Set(foundation.profile.selectedEntryKeys);
  const entries = plan.entries
    .filter((entry) => selected.has(entry.key))
    .map((entry) => ({
      key: entry.key,
      moduleKey: entry.moduleKey,
      targetPath: entry.targetPath,
      ownership: entry.ownership,
      verificationPolicy: entry.verificationPolicy,
      sourceSha256: entry.sourceSha256,
      disposition: entry.ownership === "receiving_owner" ? "receiving_owner_current" : "exact_source",
    }));
  const exactSource = entries.filter((entry) => entry.disposition === "exact_source").length;
  const receivingOwnerCurrent = entries.length - exactSource;
  return {
    schemaVersion: SCHEMA_VERSION,
    artifactType: "repository_handoff_foundation_install_receipt",
    schemaAuthority: {
      id: receiptSchema.id,
      sha256: receiptSchema.sha256,
    },
    foundation: {
      key: foundation.manifest.key,
      version: foundation.manifest.version,
      manifestSha256: foundation.manifest.manifestSha256,
    },
    profile: {
      key: foundation.profile.key,
      sha256: foundation.profile.projection.sha256,
      sourceStanding: foundation.profile.sourceStanding,
    },
    selectedModules: [...foundation.profile.selectedModules],
    entries,
    summary: {
      selected: entries.length,
      exactSource,
      receivingOwnerCurrent,
    },
    checks: [
      {
        key: "bundle-admission",
        result: "passed",
        establishes: "The manifest, selected profile, schemas, source bytes, and internal references passed local admission.",
      },
      {
        key: "target-verification",
        result: receivingOwnerCurrent === 0 ? "passed" : "passed_with_receiving_owner_state",
        establishes: "Every selected target satisfies its declared verification policy after apply; receiving-owner entries remain owner-current state.",
      },
    ],
    operationBoundary: {
      mutationPolicy: "create_absent_only",
      localFilesystemOnly: true,
      gitMutation: "none",
      githubMutation: "none",
      networkMutation: "none",
    },
    recovery: {
      strategy: "digest_and_identity_guarded_rollback",
      knownGoodCoordinate: {
        manifestSha256: foundation.manifest.manifestSha256,
        profileSha256: foundation.profile.projection.sha256,
      },
      rule: "Remove only transaction-created files whose identity and digest still match; preserve edited or ambiguous state.",
    },
    coverageBoundary: "Foundation source admission and selected local target-file policies only; received application behavior and live GitHub state retain their own evidence routes.",
    nextOwnerAction: foundation.profile.nextOwnerAction,
  };
}

function receiptBytes(receipt) {
  return Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

async function ensureDirectoryComponents(targetRoot, relativeDirectory, createdDirectories) {
  if (!relativeDirectory || relativeDirectory === ".") return;
  assertPortableTargetPath(relativeDirectory, "Target directory path");
  await assertDirectoryRoot(targetRoot, "Foundation target root");
  const components = relativeDirectory.split("/");
  let current = targetRoot;
  let currentRelative = "";
  for (const component of components) {
    current = path.join(current, component);
    currentRelative = currentRelative ? `${currentRelative}/${component}` : component;
    let status = await lstatOrNull(current);
    let created = false;
    if (status === null) {
      try {
        await mkdir(current, { mode: 0o755 });
        created = true;
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
      }
      status = await lstatOrNull(current);
    }
    requireCondition(status !== null, "directory_changed", `Target directory disappeared: ${currentRelative}.`);
    requireCondition(!status.isSymbolicLink(), "symlink", `Target directory must not be a symbolic link: ${currentRelative}.`);
    requireCondition(status.isDirectory(), "path_component", `Target path component must be a directory: ${currentRelative}.`);
    if (created) createdDirectories.push({ relativePath: currentRelative, status });
  }
}

async function createExclusiveTargetFile(
  targetRoot,
  relativePath,
  bytes,
  createdFiles,
  createdDirectories,
  { mode = 0o644, collisionCode = "target_changed" } = {},
) {
  assertPortableTargetPath(relativePath, "Created target path");
  const relativeDirectory = path.posix.dirname(relativePath);
  await ensureDirectoryComponents(targetRoot, relativeDirectory, createdDirectories);
  const absolutePath = path.join(targetRoot, ...relativePath.split("/"));
  const collisionMessage = collisionCode === "apply_locked"
    ? `An apply lock already owns this target: ${relativePath}. Confirm the prior apply has stopped, inspect its target state, then remove the lock and plan again.`
    : `Target became present before create: ${relativePath}.`;
  requireCondition(
    await lstatOrNull(absolutePath) === null,
    collisionCode,
    collisionMessage,
  );
  let handle;
  let record;
  try {
    try {
      handle = await open(
        absolutePath,
        fsConstants.O_WRONLY
          | fsConstants.O_CREAT
          | fsConstants.O_EXCL
          | (fsConstants.O_NOFOLLOW ?? 0),
        mode,
      );
    } catch (error) {
      if (["EEXIST", "ELOOP"].includes(error?.code)) {
        fail(
          collisionCode,
          collisionCode === "apply_locked"
            ? `An apply lock acquired this target first: ${relativePath}. Confirm the active apply completes, then inspect and plan again.`
            : `Target changed before exclusive create: ${relativePath}.`,
        );
      }
      throw error;
    }
    const initialStatus = await handle.stat();
    requireCondition(initialStatus.isFile(), "not_regular_file", `Created target must be a regular file: ${relativePath}.`);
    record = {
      targetPath: relativePath,
      status: initialStatus,
      sha256: sha256(bytes),
      bytes: bytes.length,
    };
    createdFiles.push(record);
    await handle.writeFile(bytes);
    await handle.sync();
    const finalStatus = await handle.stat();
    requireCondition(
      finalStatus.isFile()
        && sameFileIdentity(initialStatus, finalStatus)
        && finalStatus.size === bytes.length,
      "file_changed",
      `Created target changed while it was written: ${relativePath}.`,
    );
  } finally {
    await handle?.close();
  }
  const admitted = await readRegularFileWithin(
    targetRoot,
    relativePath,
    `Created target ${relativePath}`,
    { maximum: Math.max(bytes.length, 1) },
  );
  requireCondition(
    sameFileIdentity(record.status, admitted.status)
      && admitted.bytes.equals(bytes)
      && sha256(admitted.bytes) === record.sha256,
    "file_changed",
    `Created target differs from its admitted bytes: ${relativePath}.`,
  );
  return record;
}

async function removeCreatedFile(targetRoot, created) {
  const walked = await walkContainedPath(
    targetRoot,
    created.targetPath,
    `Rollback target ${created.targetPath}`,
    { allowMissing: true },
  );
  if (walked.kind === "missing") return { targetPath: created.targetPath, state: "already_absent" };
  if (walked.kind !== "file") {
    return { targetPath: created.targetPath, state: "preserved", reason: walked.reason ?? "not_regular_file" };
  }
  if (!sameFileIdentity(created.status, walked.status) || walked.status.size !== created.bytes) {
    return { targetPath: created.targetPath, state: "preserved", reason: "identity_or_size_changed" };
  }
  let handle;
  try {
    handle = await open(
      walked.absolutePath,
      fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0) | (fsConstants.O_NONBLOCK ?? 0),
    );
    const status = await handle.stat();
    if (!status.isFile() || !sameFileIdentity(created.status, status) || status.size !== created.bytes) {
      return { targetPath: created.targetPath, state: "preserved", reason: "identity_or_size_changed" };
    }
    const bytes = await readHandleBounded(handle, Math.max(created.bytes, 1), `Rollback target ${created.targetPath}`);
    if (sha256(bytes) !== created.sha256) {
      return { targetPath: created.targetPath, state: "preserved", reason: "digest_changed" };
    }
    const finalStatus = await lstatOrNull(walked.absolutePath);
    if (finalStatus === null) return { targetPath: created.targetPath, state: "already_absent" };
    if (finalStatus.isSymbolicLink() || !finalStatus.isFile() || !sameFileIdentity(created.status, finalStatus)) {
      return { targetPath: created.targetPath, state: "preserved", reason: "identity_changed" };
    }
    await unlink(walked.absolutePath);
    return { targetPath: created.targetPath, state: "removed" };
  } catch (error) {
    if (error?.code === "ENOENT") return { targetPath: created.targetPath, state: "already_absent" };
    if (error?.code === "ELOOP") return { targetPath: created.targetPath, state: "preserved", reason: "symlink" };
    return { targetPath: created.targetPath, state: "preserved", reason: `cleanup_error:${error?.code ?? "unknown"}` };
  } finally {
    await handle?.close();
  }
}

async function removeCreatedDirectory(targetRoot, created) {
  const absolutePath = path.join(targetRoot, ...created.relativePath.split("/"));
  const status = await lstatOrNull(absolutePath);
  if (status === null) return { targetPath: created.relativePath, state: "already_absent" };
  if (status.isSymbolicLink() || !status.isDirectory() || !sameFileIdentity(created.status, status)) {
    return { targetPath: created.relativePath, state: "preserved", reason: "identity_changed" };
  }
  try {
    await rmdir(absolutePath);
    return { targetPath: created.relativePath, state: "removed" };
  } catch (error) {
    if (error?.code === "ENOENT") return { targetPath: created.relativePath, state: "already_absent" };
    if (["ENOTEMPTY", "EEXIST"].includes(error?.code)) {
      return { targetPath: created.relativePath, state: "preserved", reason: "not_empty" };
    }
    return { targetPath: created.relativePath, state: "preserved", reason: `cleanup_error:${error?.code ?? "unknown"}` };
  }
}

function cleanupFailure(targetPath, error) {
  return {
    targetPath,
    state: "preserved",
    reason: `cleanup_error:${error?.code ?? "unknown"}`,
  };
}

async function rollbackCreatedState(targetRoot, createdFiles, createdDirectories, hooks = {}) {
  const files = [];
  for (const created of [...createdFiles].reverse()) {
    try {
      await hooks.beforeFileRollback?.(created);
      files.push(await removeCreatedFile(targetRoot, created));
    } catch (error) {
      files.push(cleanupFailure(created.targetPath, error));
    }
  }
  const directories = [];
  for (const created of [...createdDirectories].reverse()) {
    try {
      await hooks.beforeDirectoryRollback?.(created);
      directories.push(await removeCreatedDirectory(targetRoot, created));
    } catch (error) {
      directories.push(cleanupFailure(created.relativePath, error));
    }
  }
  return {
    complete: [...files, ...directories].every((entry) => ["removed", "already_absent"].includes(entry.state)),
    files,
    directories,
  };
}

export async function applyFoundation(
  foundation,
  {
    targetRoot,
    confirmedPlan,
    hooks = {},
  } = {},
) {
  requireCondition(targetRoot !== undefined, "arguments", "Apply requires an explicit target root.");
  requireCondition(
    typeof confirmedPlan === "string" && confirmedPlanPattern.test(confirmedPlan),
    "arguments",
    "Apply requires --confirm-plan sha256:<digest>.",
  );
  const resolvedTargetRoot = path.resolve(targetRoot);
  await assertDirectoryRoot(resolvedTargetRoot, "Foundation target root");
  const createdFiles = [];
  const createdDirectories = [];
  const lockBytes = Buffer.from("repository handoff foundation apply lock\n", "utf8");
  let plan;
  let receipt;
  let expectedReceiptBytes;
  let receiptState = "create";
  try {
    const controlAlias = await findPortableAlias(resolvedTargetRoot, APPLY_LOCK_PATH);
    requireCondition(
      controlAlias === null,
      "apply_control_path",
      `The local apply control path requires its exact portable spelling: ${APPLY_CONTROL_DIRECTORY}.`,
      { reason: controlAlias, targetPath: APPLY_LOCK_PATH },
    );
    await createExclusiveTargetFile(
      resolvedTargetRoot,
      APPLY_LOCK_PATH,
      lockBytes,
      createdFiles,
      createdDirectories,
      { mode: 0o600, collisionCode: "apply_locked" },
    );
    plan = await createFoundationPlan(foundation, { targetRoot: resolvedTargetRoot });
    requireCondition(
      plan.planSha256 === confirmedPlan,
      "stale_plan",
      `Confirmed plan ${confirmedPlan} no longer matches current plan ${plan.planSha256}.`,
    );
    requireCondition(
      plan.applyEligible,
      "apply_blocked",
      "Apply is blocked by invalid entries or exact-byte collisions.",
      { blockingReasons: plan.blockingReasons },
    );
    const selected = new Set(foundation.profile.selectedEntryKeys);
    for (const entry of foundation.manifest.entries) {
      if (selected.has(entry.key)) assertAdmittedPlanEntry(entry);
    }
    receipt = foundationReceipt(foundation, plan);
    expectedReceiptBytes = receiptBytes(receipt);
    const receiptObservation = await inspectTargetEntry(resolvedTargetRoot, {
      targetPath: FOUNDATION_RECEIPT_PATH,
      verificationPolicy: "exact_bytes",
      ownership: "foundation_generator",
      sha256: sha256(expectedReceiptBytes),
      sourceSize: expectedReceiptBytes.length,
      sourceBytes: expectedReceiptBytes,
    });
    requireCondition(
      ["create", "same"].includes(receiptObservation.state),
      "receipt_collision",
      `Foundation receipt path must be absent or contain the exact deterministic receipt: ${FOUNDATION_RECEIPT_PATH}.`,
    );
    receiptState = receiptObservation.state;

    const entriesToCreate = plan.entries.filter((entry) => selected.has(entry.key) && entry.state === "create");
    for (const plannedEntry of entriesToCreate) {
      const entry = foundation.manifest.entriesByKey.get(plannedEntry.key);
      assertAdmittedPlanEntry(entry);
      const created = await createExclusiveTargetFile(
        resolvedTargetRoot,
        entry.targetPath,
        entry.sourceBytes,
        createdFiles,
        createdDirectories,
      );
      await hooks.afterFileCreated?.({
        entry: plannedEntry,
        targetPath: path.join(resolvedTargetRoot, ...entry.targetPath.split("/")),
        created,
      });
    }

    const verification = await verifyFoundation(foundation, { targetRoot: resolvedTargetRoot });
    requireCondition(
      verification.ok,
      "post_apply_verification",
      "Selected foundation entries did not satisfy their verification policies after apply.",
      { summary: verification.summary },
    );
    const verifiedReceipt = foundationReceipt(foundation, verification);
    const verifiedReceiptBytes = receiptBytes(verifiedReceipt);
    requireCondition(
      receiptState !== "same" || verifiedReceiptBytes.equals(expectedReceiptBytes),
      "receipt_collision",
      "The verified target state no longer matches the existing deterministic foundation receipt.",
    );
    receipt = verifiedReceipt;
    expectedReceiptBytes = verifiedReceiptBytes;
    if (receiptState === "create") {
      const createdReceipt = await createExclusiveTargetFile(
        resolvedTargetRoot,
        FOUNDATION_RECEIPT_PATH,
        expectedReceiptBytes,
        createdFiles,
        createdDirectories,
        { collisionCode: "receipt_collision" },
      );
      await hooks.afterReceiptCreated?.({
        receipt,
        targetPath: path.join(resolvedTargetRoot, ...FOUNDATION_RECEIPT_PATH.split("/")),
        created: createdReceipt,
      });
    }

    const lockRecord = createdFiles.find((entry) => entry.targetPath === APPLY_LOCK_PATH);
    const lockRemoval = await removeCreatedFile(resolvedTargetRoot, lockRecord);
    requireCondition(
      lockRemoval.state === "removed",
      "lock_cleanup",
      "Apply lost ownership of its local lock before release; rollback now preserves the recoverable target state.",
      { lockRemoval },
    );
    const lockIndex = createdFiles.indexOf(lockRecord);
    if (lockIndex >= 0) createdFiles.splice(lockIndex, 1);

    const appliedEntries = plan.entries
      .filter((entry) => selected.has(entry.key))
      .map((entry) => ({
        ...entry,
        apply: entry.state === "create"
          ? "created"
          : entry.state === "same"
            ? "already_exact"
            : "preserved_existing",
      }));
    return {
      ok: true,
      mode: "apply",
      execution: "local_write",
      foundationKey: foundation.manifest.key,
      foundationVersion: foundation.manifest.version,
      manifestSha256: foundation.manifest.manifestSha256,
      profileKey: foundation.profile.key,
      profileSha256: foundation.profile.projection.sha256,
      targetRoot: resolvedTargetRoot,
      planSha256: plan.planSha256,
      entries: appliedEntries,
      summary: {
        selected: appliedEntries.length,
        created: appliedEntries.filter((entry) => entry.apply === "created").length,
        alreadyExact: appliedEntries.filter((entry) => entry.apply === "already_exact").length,
        preservedExisting: appliedEntries.filter((entry) => entry.apply === "preserved_existing").length,
      },
      receipt: {
        path: FOUNDATION_RECEIPT_PATH,
        state: receiptState === "create" ? "created" : "already_exact",
        sha256: sha256(expectedReceiptBytes),
        document: receipt,
      },
      recovery: { required: false },
    };
  } catch (error) {
    const recovery = await rollbackCreatedState(resolvedTargetRoot, createdFiles, createdDirectories, hooks);
    const normalized = error instanceof FoundationError
      ? error
      : new FoundationError("apply_failed", error?.message ?? "Foundation apply failed.");
    throw new FoundationError(
      normalized.code,
      normalized.message,
      {
        ...(normalized.details === undefined ? {} : { causeDetails: normalized.details }),
        confirmedPlan,
        ...(plan?.planSha256 ? { observedPlan: plan.planSha256 } : {}),
        recovery,
      },
    );
  }
}

function checkResult(foundation) {
  for (const schema of foundation.manifest.schemas) {
    assertAdmittedSourceDescriptor(schema, `Admitted schema ${schema.key}`);
  }
  for (const entry of foundation.manifest.entries) assertAdmittedPlanEntry(entry);
  for (const issueSeed of foundation.manifest.issueSeeds) {
    assertAdmittedSourceDescriptor(issueSeed, `Admitted Issue seed ${issueSeed.key}`);
  }
  return {
    ok: true,
    mode: "check",
    execution: "read_only",
    foundationKey: foundation.manifest.key,
    foundationVersion: foundation.manifest.version,
    schemaVersion: foundation.manifest.schemaVersion,
    manifestSha256: foundation.manifest.manifestSha256,
    profileKey: foundation.profile.key,
    profileSha256: foundation.profile.projection.sha256,
    sourceStanding: foundation.profile.sourceStanding,
    summary: {
      schemas: foundation.manifest.schemas.length,
      modules: foundation.manifest.modules.size,
      entries: foundation.manifest.entries.length,
      selectedModules: foundation.profile.selectedModules.length,
      selectedEntries: foundation.profile.selectedEntryKeys.length,
      issueSeeds: foundation.issueSeeds.length,
      issues: foundation.issueSeeds.reduce((total, seed) => total + seed.issues.length, 0),
      relations: foundation.issueSeeds.reduce((total, seed) => total + seed.relations.length, 0),
    },
    issueRoutes: foundation.issueSeeds.map((seed) => ({
      key: seed.key,
      currentFrontKey: seed.currentFrontKey,
      issues: seed.issues.length,
      relations: seed.relations.length,
    })),
    nextOwnerAction: foundation.profile.nextOwnerAction,
  };
}

export const admitBundle = admitFoundation;
export const checkFoundation = checkResult;
export const createPlan = createFoundationPlan;
export const verifyTarget = verifyFoundation;
export const applyTarget = applyFoundation;

export function parseArgs(argv) {
  const options = {
    mode: "check",
    json: false,
    bundleRoot: undefined,
    manifestPath: undefined,
    profileKey: undefined,
    targetRoot: undefined,
    confirmedPlan: undefined,
    help: false,
  };
  let modeSeen = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (["--check", "--plan", "--verify", "--apply"].includes(argument)) {
      requireCondition(!modeSeen, "arguments", "Choose only one of --check, --plan, --verify, or --apply.");
      modeSeen = true;
      options.mode = argument.slice(2);
      continue;
    }
    if (argument === "--json") {
      requireCondition(!options.json, "arguments", "--json may be supplied once.");
      options.json = true;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    const names = new Map([
      ["--bundle-root", "bundleRoot"],
      ["--manifest", "manifestPath"],
      ["--profile", "profileKey"],
      ["--target", "targetRoot"],
      ["--target-root", "targetRoot"],
      ["--confirm-plan", "confirmedPlan"],
    ]);
    if (names.has(argument)) {
      const key = names.get(argument);
      requireCondition(options[key] === undefined, "arguments", `${argument} may be supplied once.`);
      const value = argv[++index];
      requireCondition(value !== undefined && !value.startsWith("--"), "arguments", `${argument} requires a value.`);
      options[key] = value;
      continue;
    }
    fail("arguments", `Unknown argument: ${argument}.`);
  }
  return options;
}

function helpText() {
  return [
    "Usage: node tools/repository-handoff-foundation.mjs [--check|--plan|--verify|--apply] [options]",
    "",
    "Modes:",
    "  --check                 Admit the bundle and validate its source graph (default).",
    "  --plan                  Compare the selected profile with a target tree, read-only.",
    "  --verify                Verify required target entries, read-only.",
    "  --apply                 Create missing selected entries after exact plan confirmation.",
    "",
    "Options:",
    "  --bundle-root <path>    Foundation bundle root.",
    "  --manifest <path>       Manifest path; relative to the bundle root when one is supplied.",
    "  --profile <key>         Declared profile key; defaults to manifest.defaultProfileKey.",
    "  --target <path>         Receiving repository root; required by --apply, otherwise defaults to the current directory.",
    "  --confirm-plan <digest> Required by --apply; exact sha256:<digest> from --plan.",
    "  --json                  Emit machine-readable JSON.",
    "  --help                  Show this help.",
  ].join("\n");
}

function renderText(result) {
  if (result.mode === "check") {
    return [
      `repository handoff foundation check: pass (${result.profileKey}; ${result.summary.selectedEntries} selected entries; ${result.summary.issues} Issues)`,
      `coordinate: manifest sha256:${result.manifestSha256}; profile sha256:${result.profileSha256}`,
    ].join("\n");
  }
  if (result.mode === "apply") {
    const lines = result.entries.map((entry) => `${entry.apply.padEnd(20)} ${entry.targetPath}`);
    lines.push(`apply: pass; created ${result.summary.created}; already exact ${result.summary.alreadyExact}; preserved ${result.summary.preservedExisting}`);
    lines.push(`receipt: ${result.receipt.state}; ${result.receipt.path}; sha256:${result.receipt.sha256}`);
    lines.push(`plan: ${result.planSha256}`);
    return lines.join("\n");
  }
  const lines = result.entries.map((entry) => {
    const state = result.mode === "verify" ? entry.verification : entry.state;
    return `${state.padEnd(20)} ${entry.targetPath}`;
  });
  if (result.mode === "plan") {
    lines.push(`plan: ${result.ok ? "pass" : "invalid"}; create ${result.summary.create}; same ${result.summary.same}; preserve ${result.summary.preserve_collision}; held ${result.summary.held}; invalid ${result.summary.invalid_entry}`);
    lines.push(`receipt: ${result.receipt.state}; ${result.receipt.path}`);
    lines.push(`plan identity: ${result.planSha256}; apply ${result.applyEligible ? "eligible" : "blocked"}`);
  } else {
    lines.push(`verify: ${result.ok ? "pass" : "fail"}; verified ${result.summary.verified}; preserved differences ${result.summary.preservedDifferences}; missing ${result.summary.missing}; invalid ${result.summary.invalidEntries}; mismatches ${result.summary.mismatches}`);
  }
  lines.push(`coordinate: manifest sha256:${result.manifestSha256}; profile sha256:${result.profileSha256}`);
  return lines.join("\n");
}

function errorResult(error) {
  const normalized = error instanceof FoundationError
    ? error
    : new FoundationError("unexpected", error?.message ?? "Unexpected foundation-tool failure.");
  return {
    ok: false,
    mode: "error",
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details === undefined ? {} : { details: normalized.details }),
    },
  };
}

export async function run(argv = process.argv.slice(2), io = { stdout: process.stdout, stderr: process.stderr }) {
  let parsed;
  try {
    parsed = parseArgs(argv);
    if (parsed.help) {
      io.stdout.write(`${helpText()}\n`);
      return 0;
    }
    let bundleRoot;
    let manifestPath;
    if (parsed.bundleRoot !== undefined) {
      bundleRoot = path.resolve(parsed.bundleRoot);
      manifestPath = parsed.manifestPath === undefined
        ? path.join(bundleRoot, DEFAULT_MANIFEST_NAME)
        : path.resolve(bundleRoot, parsed.manifestPath);
    } else if (parsed.manifestPath !== undefined) {
      manifestPath = path.resolve(parsed.manifestPath);
      bundleRoot = path.dirname(manifestPath);
    } else {
      bundleRoot = foundationDefaults.bundleRoot;
      manifestPath = foundationDefaults.manifestPath;
    }
    const foundation = await admitFoundation({
      bundleRoot,
      manifestPath,
      profileKey: parsed.profileKey,
    });
    if (parsed.mode === "apply") {
      requireCondition(parsed.targetRoot !== undefined, "arguments", "--apply requires an explicit --target.");
      requireCondition(
        typeof parsed.confirmedPlan === "string" && confirmedPlanPattern.test(parsed.confirmedPlan),
        "arguments",
        "--apply requires --confirm-plan sha256:<digest>.",
      );
    } else {
      requireCondition(parsed.confirmedPlan === undefined, "arguments", "--confirm-plan is only valid with --apply.");
    }
    const targetRoot = path.resolve(parsed.targetRoot ?? process.cwd());
    const result = parsed.mode === "plan"
      ? await createFoundationPlan(foundation, { targetRoot })
      : parsed.mode === "verify"
        ? await verifyFoundation(foundation, { targetRoot })
        : parsed.mode === "apply"
          ? await applyFoundation(foundation, {
            targetRoot,
            confirmedPlan: parsed.confirmedPlan,
          })
        : checkResult(foundation);
    io.stdout.write(parsed.json ? `${JSON.stringify(result, null, 2)}\n` : `${renderText(result)}\n`);
    return result.ok ? 0 : 1;
  } catch (error) {
    const result = errorResult(error);
    const json = parsed?.json ?? argv.includes("--json");
    io.stderr.write(json ? `${JSON.stringify(result, null, 2)}\n` : `repository handoff foundation: ${result.error.message}\n`);
    return 1;
  }
}

export const main = run;

if (isDirectExecution(import.meta.url)) {
  process.exitCode = await run();
}

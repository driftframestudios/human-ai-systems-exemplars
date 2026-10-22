import './node-runtime-admission.mjs';
import { createHash } from "node:crypto";
import { open } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

export const DEFAULT_REGISTRY_REFERENCE_BINDING_PATH = join(
  repositoryRoot,
  "deployment/public-references/context-canvas-registry-bindings.v1.json",
);

export const REGISTRY_REFERENCE_CONTRACT_ID =
  "context-canvas.registry-public-reference-bindings.v1";
export const REGISTRY_REFERENCE_CONTRACT_VERSION = "1";
export const REGISTRY_PUBLIC_ROOT = "https://kindlight.systems/";
export const REGISTRY_REFERENCE_SCHEMA =
  "./context-canvas-registry-bindings.schema.json";
export const REGISTRY_ATLAS_DATA_USE_NOTICE =
  "deployment/public-references/registry-atlas-data-use.txt";
export const REGISTRY_ATLAS_DATA_USE_SHA256 =
  "71ca36c88846940b837772dd1541c74a3f609438bfc915e3e52ac5cbe07aea67";

const MAXIMUM_BINDING_BYTES = 1024 * 1024;
const MAXIMUM_DATA_USE_BYTES = 64 * 1024;
const MAXIMUM_JSON_DEPTH = 128;
const TOKEN_PATTERN = /^PUBLIC_URL_REGISTRY_[A-Z0-9]+(?:_[A-Z0-9]+)*$/;
const RECORD_KEY_PATTERN =
  /^registry:[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?(?:\/[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?)*$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const SEMANTIC_VERSION_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;
const ENCODED_BRACE_PATTERN = /%(?:7b|7d)/i;
const ENCODED_PATH_SEPARATOR_PATTERN = /%(?:2f|5c)/i;
const ENCODED_DOT_SEGMENT_PATTERN = /(?:^|\/)(?:%2e|\.|%252e)+(?:\/|$)/i;

const TOP_LEVEL_KEYS = Object.freeze(["$schema", "id", "version", "atlas", "bindings"]);
const ATLAS_KEYS = Object.freeze([
  "reference_version",
  "guide_version",
  "data_schema_version",
  "snapshot_date",
  "accepted_at",
  "archive_sha256",
  "registry_atlas_sha256",
  "manifest_sha256",
  "current_route_map_sha256",
  "public_root",
  "license",
  "content_role",
  "action_authority",
  "data_use_notice",
  "data_use_sha256",
  "benchmark_scope",
]);
const BINDING_KEYS = Object.freeze([
  "token",
  "atlas_record_key",
  "expected_public_title",
  "expected_family",
  "expected_resource_role",
  "expected_reader_job",
  "expected_source_lifecycle",
  "expected_route_state",
  "url",
  "selection_basis",
]);
const registryDestinationAuthorities = new WeakSet();

export class RegistryReferenceContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "RegistryReferenceContractError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new RegistryReferenceContractError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function exactKeys(value, expected, label) {
  if (!isPlainObject(value)) {
    fail("shape", `${label} uses one JSON object.`);
  }
  const actual = Object.keys(value).sort(compareUtf8);
  const selected = [...expected].sort(compareUtf8);
  if (
    actual.length !== selected.length ||
    actual.some((key, index) => key !== selected[index])
  ) {
    fail("shape", `${label} uses exactly these fields: ${selected.join(", ")}.`);
  }
}

function text(value, label, { maximum = 512 } = {}) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value ||
    value.length > maximum ||
    CONTROL_PATTERN.test(value)
  ) {
    fail(
      "text",
      `${label} uses one trimmed, single-line text value of at most ${maximum} characters.`,
    );
  }
  return value;
}

function exact(value, expected, label) {
  if (value !== expected) {
    fail("constant", `${label} uses ${JSON.stringify(expected)}.`);
  }
  return value;
}

function digest(value, label) {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    fail("digest", `${label} uses one lowercase SHA-256 digest.`);
  }
  return value;
}

function semanticVersion(value, label) {
  if (typeof value !== "string" || !SEMANTIC_VERSION_PATTERN.test(value)) {
    fail("version", `${label} uses a three-part semantic version.`);
  }
  return value;
}

function calendarDate(value, label) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    fail("date", `${label} uses YYYY-MM-DD.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    fail("date", `${label} names a calendar date in YYYY-MM-DD form.`);
  }
  return value;
}

function registryToken(value, label) {
  if (typeof value !== "string" || !TOKEN_PATTERN.test(value)) {
    fail("token", `${label} uses the PUBLIC_URL_REGISTRY_* token form.`);
  }
  return value;
}

function atlasRecordKey(value, label) {
  if (typeof value !== "string" || !RECORD_KEY_PATTERN.test(value)) {
    fail("atlas_record_key", `${label} uses a portable registry:<family>/<record> key.`);
  }
  return value;
}

function registryUrl(value, label) {
  const selected = text(value, label, { maximum: 2048 });
  if (
    selected.includes("{") ||
    selected.includes("}") ||
    selected.includes("\\") ||
    ENCODED_BRACE_PATTERN.test(selected) ||
    ENCODED_PATH_SEPARATOR_PATTERN.test(selected) ||
    ENCODED_DOT_SEGMENT_PATTERN.test(selected) ||
    /(?:^|\/)\.{1,2}(?:\/|$)/.test(selected) ||
    /\.example(?:[/:]|$)/i.test(selected)
  ) {
    fail("url", `${label} uses an exact public Registry route.`);
  }

  let parsed;
  try {
    parsed = new URL(selected);
  } catch {
    fail("url", `${label} uses an exact HTTPS kindlight.systems URL.`);
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "kindlight.systems" ||
    parsed.port !== "" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    parsed.href !== selected ||
    parsed.pathname.includes("//")
  ) {
    fail(
      "url",
      `${label} uses the normalized HTTPS kindlight.systems route without credentials, an explicit port, query, or fragment.`,
    );
  }
  return selected;
}

function normalizeRequiredKeys(requiredKeys) {
  if (requiredKeys === undefined) return null;
  if (!Array.isArray(requiredKeys) && !(requiredKeys instanceof Set)) {
    fail("required_keys", "requiredKeys uses an array or Set of Registry tokens.");
  }
  const values = [...requiredKeys].map((value, index) =>
    registryToken(value, `requiredKeys[${index}]`),
  );
  if (new Set(values).size !== values.length) {
    fail("required_keys", "requiredKeys lists each Registry token once.");
  }
  return values.sort(compareUtf8);
}

function decodeBindingBytes(bytes) {
  let buffer;
  if (Buffer.isBuffer(bytes) || bytes instanceof Uint8Array) {
    buffer = Buffer.from(bytes);
  } else if (typeof bytes === "string") {
    buffer = Buffer.from(bytes, "utf8");
  } else {
    fail("bytes", "Registry binding input uses UTF-8 bytes or a string.");
  }
  if (buffer.length === 0 || buffer.length > MAXIMUM_BINDING_BYTES) {
    fail(
      "bytes",
      `Registry binding input uses 1 to ${MAXIMUM_BINDING_BYTES} bytes.`,
    );
  }
  try {
    return {
      buffer,
      source: new TextDecoder("utf-8", { fatal: true }).decode(buffer),
    };
  } catch {
    fail("encoding", "Registry binding input uses valid UTF-8.");
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readBoundedFile(path, maximumBytes, { code, label }) {
  let handle;
  try {
    handle = await open(path, "r");
    const before = await handle.stat({ bigint: true });
    if (
      !before.isFile() ||
      before.size < 1n ||
      before.size > BigInt(maximumBytes)
    ) {
      fail(code, `${label} uses 1 to ${maximumBytes} bytes in one regular file.`);
    }

    const buffer = Buffer.allocUnsafe(Number(before.size));
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        offset,
        buffer.length - offset,
        offset,
      );
      if (bytesRead === 0) {
        fail(code, `${label} remains stable while it is read.`);
      }
      offset += bytesRead;
    }

    const after = await handle.stat({ bigint: true });
    if (
      !after.isFile() ||
      after.dev !== before.dev ||
      after.ino !== before.ino ||
      after.size !== before.size ||
      after.mtimeNs !== before.mtimeNs ||
      after.ctimeNs !== before.ctimeNs
    ) {
      fail(code, `${label} remains stable while it is read.`);
    }
    return buffer;
  } catch (error) {
    if (error instanceof RegistryReferenceContractError) throw error;
    fail(code, `${label} could not be read.`);
  } finally {
    await handle?.close().catch(() => {});
  }
}

function routeIdentity(binding) {
  return JSON.stringify([
    binding.atlasRecordKey,
    binding.publicTitle,
    binding.family,
    binding.resourceRole,
    binding.readerJob,
    binding.sourceLifecycle,
    binding.routeState,
    binding.url,
  ]);
}

function createDestinationAuthority(routes) {
  const destinations = new Map(routes.map(({ token, url }) => [token, url]));
  const authority = Object.freeze({
    get size() {
      return destinations.size;
    },
    get(token) {
      return destinations.get(token);
    },
    has(token) {
      return destinations.has(token);
    },
    entries() {
      return destinations.entries();
    },
    keys() {
      return destinations.keys();
    },
    values() {
      return destinations.values();
    },
    [Symbol.iterator]() {
      return destinations[Symbol.iterator]();
    },
  });
  registryDestinationAuthorities.add(authority);
  return authority;
}

export function isRegistryReferenceDestinationAuthority(value) {
  return value !== null &&
    typeof value === "object" &&
    registryDestinationAuthorities.has(value);
}

function assertUniqueObjectMembers(source) {
  let cursor = 0;

  function skipWhitespace() {
    while (/\s/.test(source[cursor] ?? "")) cursor += 1;
  }

  function parseString() {
    const start = cursor;
    cursor += 1;
    while (cursor < source.length) {
      if (source[cursor] === "\\") {
        cursor += 2;
        continue;
      }
      if (source[cursor] === '"') {
        cursor += 1;
        return JSON.parse(source.slice(start, cursor));
      }
      cursor += 1;
    }
    fail("json", "Registry binding input uses readable JSON.");
  }

  function parsePrimitive() {
    while (cursor < source.length && !/[\s,\]}]/.test(source[cursor])) {
      cursor += 1;
    }
  }

  function parseArray(depth) {
    cursor += 1;
    skipWhitespace();
    if (source[cursor] === "]") {
      cursor += 1;
      return;
    }
    while (cursor < source.length) {
      parseValue(depth + 1);
      skipWhitespace();
      if (source[cursor] === "]") {
        cursor += 1;
        return;
      }
      cursor += 1;
      skipWhitespace();
    }
  }

  function parseObject(depth) {
    cursor += 1;
    skipWhitespace();
    const keys = new Set();
    if (source[cursor] === "}") {
      cursor += 1;
      return;
    }
    while (cursor < source.length) {
      const key = parseString();
      if (keys.has(key)) {
        fail("duplicate_json_member", "Registry binding input uses unique object keys.");
      }
      keys.add(key);
      skipWhitespace();
      cursor += 1;
      skipWhitespace();
      parseValue(depth + 1);
      skipWhitespace();
      if (source[cursor] === "}") {
        cursor += 1;
        return;
      }
      cursor += 1;
      skipWhitespace();
    }
  }

  function parseValue(depth) {
    if (depth > MAXIMUM_JSON_DEPTH) {
      fail(
        "json_depth",
        `Registry binding input uses at most ${MAXIMUM_JSON_DEPTH} nested JSON levels.`,
      );
    }
    skipWhitespace();
    if (source[cursor] === "{") parseObject(depth);
    else if (source[cursor] === "[") parseArray(depth);
    else if (source[cursor] === '"') parseString();
    else parsePrimitive();
  }

  parseValue(0);
}

function validateAtlas(atlas) {
  exactKeys(atlas, ATLAS_KEYS, "atlas");
  const guideVersion = atlas.guide_version;
  if (!Number.isSafeInteger(guideVersion) || guideVersion < 1) {
    fail("guide_version", "atlas.guide_version uses a positive safe integer.");
  }
  return Object.freeze({
    referenceVersion: semanticVersion(atlas.reference_version, "atlas.reference_version"),
    guideVersion,
    dataSchemaVersion: semanticVersion(
      atlas.data_schema_version,
      "atlas.data_schema_version",
    ),
    snapshotDate: calendarDate(atlas.snapshot_date, "atlas.snapshot_date"),
    acceptedAt: calendarDate(atlas.accepted_at, "atlas.accepted_at"),
    archiveSha256: digest(atlas.archive_sha256, "atlas.archive_sha256"),
    registryAtlasSha256: digest(
      atlas.registry_atlas_sha256,
      "atlas.registry_atlas_sha256",
    ),
    manifestSha256: digest(atlas.manifest_sha256, "atlas.manifest_sha256"),
    currentRouteMapSha256: digest(
      atlas.current_route_map_sha256,
      "atlas.current_route_map_sha256",
    ),
    publicRoot: exact(atlas.public_root, REGISTRY_PUBLIC_ROOT, "atlas.public_root"),
    license: exact(atlas.license, "Apache-2.0", "atlas.license"),
    contentRole: exact(atlas.content_role, "reference_data", "atlas.content_role"),
    actionAuthority: exact(
      atlas.action_authority,
      "current_human_request_and_repository_owned_tools",
      "atlas.action_authority",
    ),
    dataUseNotice: exact(
      atlas.data_use_notice,
      REGISTRY_ATLAS_DATA_USE_NOTICE,
      "atlas.data_use_notice",
    ),
    dataUseSha256: exact(
      digest(atlas.data_use_sha256, "atlas.data_use_sha256"),
      REGISTRY_ATLAS_DATA_USE_SHA256,
      "atlas.data_use_sha256",
    ),
    benchmarkScope: exact(
      atlas.benchmark_scope,
      "all_atlas_records_and_resources",
      "atlas.benchmark_scope",
    ),
  });
}

function validateBinding(binding, index) {
  const label = `bindings[${index}]`;
  exactKeys(binding, BINDING_KEYS, label);
  const token = registryToken(binding.token, `${label}.token`);
  return Object.freeze({
    token,
    atlasRecordKey: atlasRecordKey(binding.atlas_record_key, `${label}.atlas_record_key`),
    publicTitle: text(binding.expected_public_title, `${label}.expected_public_title`),
    family: text(binding.expected_family, `${label}.expected_family`),
    resourceRole: text(
      binding.expected_resource_role,
      `${label}.expected_resource_role`,
    ),
    readerJob: text(binding.expected_reader_job, `${label}.expected_reader_job`),
    sourceLifecycle: exact(
      binding.expected_source_lifecycle,
      "Current",
      `${label}.expected_source_lifecycle`,
    ),
    routeState: exact(
      binding.expected_route_state,
      "Identity verified",
      `${label}.expected_route_state`,
    ),
    url: registryUrl(binding.url, `${label}.url`),
    selectionBasis: text(binding.selection_basis, `${label}.selection_basis`, {
      maximum: 1024,
    }),
  });
}

/**
 * Validate the reviewed projection contract and return only the route map plus
 * receipt-grade metadata. Free-form selection prose never becomes executable
 * configuration or generated visitor copy.
 */
export function parseRegistryReferenceBinding(bytes, { requiredKeys } = {}) {
  const decoded = decodeBindingBytes(bytes);
  let document;
  try {
    document = JSON.parse(decoded.source);
  } catch {
    fail("json", "Registry binding input uses readable JSON.");
  }
  try {
    assertUniqueObjectMembers(decoded.source);
  } catch (error) {
    if (error instanceof RegistryReferenceContractError) throw error;
    if (error instanceof RangeError) {
      fail(
        "json_depth",
        "Registry binding input uses a supported JSON nesting depth.",
      );
    }
    throw error;
  }

  exactKeys(document, TOP_LEVEL_KEYS, "Registry binding document");
  exact(document.$schema, REGISTRY_REFERENCE_SCHEMA, "$schema");
  exact(document.id, REGISTRY_REFERENCE_CONTRACT_ID, "id");
  exact(document.version, REGISTRY_REFERENCE_CONTRACT_VERSION, "version");
  const atlas = validateAtlas(document.atlas);

  if (!Array.isArray(document.bindings) || document.bindings.length === 0) {
    fail("bindings", "bindings contains at least one reviewed Registry route.");
  }

  const admitted = document.bindings.map(validateBinding);
  const tokens = admitted.map((binding) => binding.token);
  const sortedTokens = [...tokens].sort(compareUtf8);
  if (tokens.some((token, index) => token !== sortedTokens[index])) {
    fail("binding_order", "bindings follow ascending UTF-8 token order.");
  }
  if (new Set(tokens).size !== tokens.length) {
    fail("duplicate_token", "bindings assigns each Registry token once.");
  }
  const identityByUrl = new Map();
  const identityByRecordKey = new Map();
  for (const binding of admitted) {
    const identity = routeIdentity(binding);
    const urlIdentity = identityByUrl.get(binding.url);
    const recordIdentity = identityByRecordKey.get(binding.atlasRecordKey);
    if (
      (urlIdentity !== undefined && urlIdentity !== identity) ||
      (recordIdentity !== undefined && recordIdentity !== identity)
    ) {
      fail(
        "route_identity",
        "each public route and Atlas record key resolves to one exact reviewed identity.",
      );
    }
    identityByUrl.set(binding.url, identity);
    identityByRecordKey.set(binding.atlasRecordKey, identity);
  }

  const required = normalizeRequiredKeys(requiredKeys);
  if (
    required !== null &&
    (required.length !== sortedTokens.length ||
      required.some((token, index) => token !== sortedTokens[index]))
  ) {
    const admittedSet = new Set(sortedTokens);
    const requiredSet = new Set(required);
    const missing = required.filter((token) => !admittedSet.has(token));
    const unexpected = sortedTokens.filter((token) => !requiredSet.has(token));
    fail(
      "token_coverage",
      `bindings covers the required Registry tokens exactly (missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}).`,
    );
  }

  const routes = Object.freeze(admitted.map((binding) => Object.freeze({
    token: binding.token,
    atlasRecordKey: binding.atlasRecordKey,
    publicTitle: binding.publicTitle,
    family: binding.family,
    resourceRole: binding.resourceRole,
    readerJob: binding.readerJob,
    sourceLifecycle: binding.sourceLifecycle,
    routeState: binding.routeState,
    url: binding.url,
  })));
  const destinations = createDestinationAuthority(routes);
  const receipt = Object.freeze({
    id: REGISTRY_REFERENCE_CONTRACT_ID,
    version: REGISTRY_REFERENCE_CONTRACT_VERSION,
    bindingSha256: sha256(decoded.buffer),
    bindingCount: admitted.length,
    atlas,
  });
  return Object.freeze({ destinations, routes, receipt });
}

export async function loadRegistryReferenceBinding({
  path = DEFAULT_REGISTRY_REFERENCE_BINDING_PATH,
  requiredKeys,
} = {}) {
  const bytes = await readBoundedFile(path, MAXIMUM_BINDING_BYTES, {
    code: "binding_read",
    label: "Registry binding input",
  });
  const parsed = parseRegistryReferenceBinding(bytes, { requiredKeys });
  const dataUseBytes = await readBoundedFile(
    join(repositoryRoot, REGISTRY_ATLAS_DATA_USE_NOTICE),
    MAXIMUM_DATA_USE_BYTES,
    {
      code: "data_use_read",
      label: "Registry Atlas DATA-USE input",
    },
  );
  verifyRegistryAtlasDataUse(dataUseBytes);
  return parsed;
}

export function verifyRegistryAtlasDataUse(bytes) {
  const selected = Buffer.isBuffer(bytes) || bytes instanceof Uint8Array
    ? Buffer.from(bytes)
    : typeof bytes === "string"
      ? Buffer.from(bytes, "utf8")
      : fail("data_use_bytes", "Registry Atlas DATA-USE input uses UTF-8 bytes or a string.");
  if (sha256(selected) !== REGISTRY_ATLAS_DATA_USE_SHA256) {
    fail(
      "data_use_digest",
      `Registry Atlas DATA-USE input matches ${REGISTRY_ATLAS_DATA_USE_SHA256}.`,
    );
  }
  return Object.freeze({
    path: REGISTRY_ATLAS_DATA_USE_NOTICE,
    sha256: REGISTRY_ATLAS_DATA_USE_SHA256,
    bytes: selected.length,
  });
}

import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { constants as fileConstants } from "node:fs";
import { link, lstat, open, realpath, unlink } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  admitFoundation,
  FoundationError,
  foundationDefaults,
} from "./repository-handoff-foundation.mjs";

const API_VERSION = "2026-03-10";
const SCHEMA_VERSION = "0.1";
const MATERIALIZER_VERSION = "0.1.0";
const BINDINGS_TYPE = "repository_handoff_issue_route_bindings";
const BINDINGS_SCHEMA_ID = "urn:repository-handoff-foundation:schema:issue-route-bindings:v0.1";
const BINDINGS_SCHEMA_REFERENCE = BINDINGS_SCHEMA_ID;
const RECEIPT_TYPE = "repository_handoff_issue_route_materialization_receipt";
const RECEIPT_SCHEMA_KEY = "issue-route-materialization-receipt";
const RECEIPT_SCHEMA_ID = "urn:repository-handoff-foundation:schema:issue-route-materialization-receipt:v0.1";
const RECEIPT_SCHEMA_REFERENCE = RECEIPT_SCHEMA_ID;
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_API_BYTES = 32 * 1024 * 1024;
const MAX_ISSUE_BODY_CHARS = 65_536;
const MAX_ISSUE_BODY_UTF8_BYTES = 65_536;
const MAX_MILESTONE_DESCRIPTION_CHARS = 4_096;
const MAX_MILESTONE_DESCRIPTION_UTF8_BYTES = 4_096;
const MAX_PAGES = 101;
const PAGE_SIZE = 100;
const MAX_INVENTORY_RECORDS = 10_000;
const MAX_INVENTORY_UTF8_BYTES = 64 * 1024 * 1024;
const DEFAULT_MUTATION_DELAY_MS = 1_050;
const keyPattern = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/u;
const digestPattern = /^[a-f0-9]{64}$/u;
const planDigestPattern = /^sha256:[a-f0-9]{64}$/u;
const repositoryPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/[A-Za-z0-9._-]{1,100}$/u;
const semanticVersionPattern = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-((?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/u;
const issueTokenPattern = /\{\{issue:([a-z][a-z0-9]*(?:[._-][a-z0-9]+)*)\}\}/gu;
const issueMarkerPattern = /<!-- repository-handoff:issue-route-v0\.1 route=([a-z][a-z0-9]*(?:[._-][a-z0-9]+)*) key=([a-z][a-z0-9]*(?:[._-][a-z0-9]+)*) seed=([a-f0-9]{64}) phase=(pending|live) -->/gu;
const milestoneMarkerPattern = /<!-- repository-handoff:milestone-v0\.1 route=([a-z][a-z0-9]*(?:[._-][a-z0-9]+)*) key=([a-z][a-z0-9]*(?:[._-][a-z0-9]+)*) seed=([a-f0-9]{64}) -->/gu;

const resourceOrder = new Map([
  ["repository", 0],
  ["label", 1],
  ["milestone", 2],
  ["issue", 3],
]);
const admittedBindingValues = new WeakSet();
const admittedReceiptValues = new WeakSet();
const admittedBodyValues = new WeakSet();
const preflightReceiptValues = new WeakSet();

export const issueRouteDefaults = Object.freeze({
  bundleRoot: foundationDefaults.bundleRoot,
  manifestPath: foundationDefaults.manifestPath,
  mutationDelayMs: DEFAULT_MUTATION_DELAY_MS,
});

export class IssueRouteError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "IssueRouteError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

function fail(code, message, details = undefined) {
  throw new IssueRouteError(code, message, details);
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

function assertExactKeys(value, required, optional, label) {
  const allowed = new Set([...required, ...optional]);
  const actual = Object.keys(record(value, label));
  for (const key of required) {
    requireCondition(owns(value, key), "missing_property", `${label} must include ${key}.`);
  }
  for (const key of actual) {
    requireCondition(allowed.has(key), "unknown_property", `${label} includes an unsupported property.`);
  }
}

function denseArray(value, label, { allowEmpty = true, maximum = 10_000 } = {}) {
  requireCondition(
    Array.isArray(value) && (allowEmpty || value.length > 0) && value.length <= maximum,
    "array",
    `${label} must be ${allowEmpty ? "an" : "a nonempty"} array within the ${maximum}-item boundary.`,
  );
  for (let index = 0; index < value.length; index += 1) {
    requireCondition(owns(value, index), "sparse_array", `${label} must own every indexed value.`);
  }
  return value;
}

function text(value, label, maximum = 65_536) {
  requireCondition(
    typeof value === "string"
      && value.trim() === value
      && value.length > 0
      && value.length <= maximum
      && !value.includes("\0"),
    "text",
    `${label} must be one nonempty, trimmed string.`,
  );
  return value;
}

function optionalText(value, label, maximum = 65_536) {
  if (value === null || value === undefined) return null;
  return text(value, label, maximum);
}

function semanticKey(value, label) {
  const selected = text(value, label, 128);
  requireCondition(keyPattern.test(selected), "semantic_key", `${label} must be a lowercase portable semantic key.`);
  return selected;
}

function safeInteger(value, label) {
  requireCondition(Number.isSafeInteger(value) && value > 0, "integer", `${label} must be a positive safe integer.`);
  return value;
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function labelNameKey(value) {
  return value.normalize("NFC").toLowerCase();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function digest(value, label) {
  requireCondition(typeof value === "string" && digestPattern.test(value), "digest", `${label} must be a lowercase SHA-256 digest.`);
  return value;
}

function admittedSeedSha256(issueSeed) {
  // Foundation admission derives projection.sha256 from the exact authoritative
  // seed bytes after proving that the JSON and YAML projections are identical.
  return digest(issueSeed?.projection?.sha256, "Admitted Issue route seed digest");
}

function canonicalJson(value, label = "Canonical JSON value") {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
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

function normalizedRepository(value, label = "Repository") {
  const selected = text(value, label, 140);
  requireCondition(
    repositoryPattern.test(selected)
      && !selected.split("/").some((component) => component === "." || component === ".."),
    "repository",
    `${label} must use the exact OWNER/REPOSITORY form.`,
  );
  return selected;
}

function endpointFor(repository, suffix = "") {
  const [owner, name] = repository.split("/");
  return `repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}${suffix}`;
}

function marker(kind, routeKey, itemKey, seedSha256, phase = undefined) {
  if (kind === "issue") {
    return `<!-- repository-handoff:issue-route-v0.1 route=${routeKey} key=${itemKey} seed=${seedSha256} phase=${phase} -->`;
  }
  return `<!-- repository-handoff:milestone-v0.1 route=${routeKey} key=${itemKey} seed=${seedSha256} -->`;
}

export function parseIssueRouteMarkers(source, kind) {
  const body = typeof source === "string" ? source : "";
  const pattern = kind === "issue" ? issueMarkerPattern : milestoneMarkerPattern;
  const matches = [];
  pattern.lastIndex = 0;
  for (const match of body.matchAll(pattern)) {
    matches.push({
      routeKey: match[1],
      key: match[2],
      seedSha256: match[3],
      ...(kind === "issue" ? { phase: match[4] } : {}),
    });
  }
  return matches;
}

function issuePendingBody(routeKey, issueKey, seedSha256) {
  return `${marker("issue", routeKey, issueKey, seedSha256, "pending")}\n\n## Route materialization in progress\n\nGitHub has assigned this Issue a stable repository coordinate. If this generated pending state remains exact, the materializer verifies it and replaces this body with the route text whose repository-local links use the live Issue numbers.\n`;
}

function milestoneDescription(routeKey, milestone, seedSha256) {
  return `${milestone.description}\n\n${marker("milestone", routeKey, milestone.key, seedSha256)}`;
}

function renderRelationLabel(value) {
  return value.replaceAll("_", " ").replace(/(^|\s)([a-z])/gu, (_match, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

export function renderIssueRouteBody({ issueSeed, issue, bodySource, numberByIssueKey }) {
  let authored = bodySource.replace(issueTokenPattern, (_token, key) => {
    const number = numberByIssueKey.get(key);
    requireCondition(number !== undefined, "unresolved_link", `Issue ${issue.key} references unresolved Issue ${key}.`);
    return `#${number}`;
  });
  requireCondition(!authored.includes("{{issue:"), "unresolved_link", `Issue ${issue.key} contains an unresolved Issue token.`);
  authored = authored.trimEnd();

  const acceptance = issue.acceptance.map((item) => (
    `- [ ] ${item.statement} <!-- repository-handoff:acceptance key=${item.key} -->`
  ));
  const authority = issue.authority.map((item) => (
    `- **${renderRelationLabel(item.state)} — ${item.owner}:** ${item.statement} <!-- repository-handoff:authority key=${item.key} -->`
  ));
  const relations = issueSeed.relations
    .filter((relation) => relation.fromIssueKey === issue.key)
    .sort((left, right) => compareUtf8(left.key, right.key))
    .map((relation) => {
      const number = numberByIssueKey.get(relation.toIssueKey);
      requireCondition(number !== undefined, "unresolved_link", `Relation ${relation.key} references an unresolved Issue.`);
      return `- **${renderRelationLabel(relation.type)} #${number}:** ${relation.condition} <!-- repository-handoff:relation key=${relation.key} -->`;
    });
  let receiver;
  if (issue.nextReceiver.type === "issue") {
    const number = numberByIssueKey.get(issue.nextReceiver.key);
    requireCondition(number !== undefined, "unresolved_link", `Issue ${issue.key} has an unresolved next receiver.`);
    receiver = `- **Next receiver — #${number}:** ${issue.nextReceiver.condition}`;
  } else {
    receiver = `- **Next receiver — ${issue.nextReceiver.key}:** ${issue.nextReceiver.condition}`;
  }

  return `${authored}\n\n## Acceptance\n\n${acceptance.join("\n")}\n\n## Authority\n\n${authority.join("\n")}\n\n## Issue route\n\n${relations.join("\n")}\n\n## Next receiver\n\n${receiver}\n\n${marker("issue", issueSeed.key, issue.key, admittedSeedSha256(issueSeed), "live")}\n`;
}

async function readJsonFile(filePath, label) {
  const bytes = await readBoundedRegularNoFollow(filePath, label, {
    maxBytes: MAX_JSON_BYTES,
    errorCode: "json_target",
  });
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("json", `${label} must contain valid JSON.`);
  }
}

function coordinateValue(raw, label, kind) {
  const required = kind === "label"
    ? ["immutableId", "name"]
    : ["immutableId", "number", "title"];
  assertExactKeys(raw, required, [], label);
  const entry = { immutableId: safeInteger(raw.immutableId, `${label}.immutableId`) };
  if (kind === "label") entry.name = text(raw.name, `${label}.name`, 50);
  else {
    entry.number = safeInteger(raw.number, `${label}.number`);
    entry.title = text(raw.title, `${label}.title`, 256);
  }
  return entry;
}

function coordinateMap(raw, label, kind, { minimum = 0, maximum = 128 } = {}) {
  record(raw, label);
  const keys = Object.keys(raw).sort(compareUtf8);
  requireCondition(
    keys.length >= minimum && keys.length <= maximum,
    "coordinate_count",
    `${label} must contain between ${minimum} and ${maximum} semantic coordinates.`,
  );
  const result = new Map();
  for (const key of keys) {
    const admittedKey = semanticKey(key, `${label} key`);
    result.set(admittedKey, { key: admittedKey, ...coordinateValue(raw[key], `${label}.${key}`, kind) });
  }
  return result;
}

function coordinatesObject(coordinates, kind) {
  const result = {};
  for (const [key, item] of [...coordinates.entries()].sort(([left], [right]) => compareUtf8(left, right))) {
    result[key] = kind === "label"
      ? { immutableId: item.immutableId ?? item.id, name: item.name }
      : {
        immutableId: item.immutableId ?? item.id,
        number: item.number,
        title: item.title,
      };
  }
  return result;
}

function buildBindingsDocument({ routeKey, seedSha256, repository, labels, milestones, issues }) {
  return {
    $schema: BINDINGS_SCHEMA_REFERENCE,
    schemaVersion: SCHEMA_VERSION,
    artifactType: BINDINGS_TYPE,
    routeKey,
    seedSha256,
    repository: {
      immutableId: repository.immutableId ?? repository.id,
      fullName: repository.fullName,
    },
    labels: coordinatesObject(labels, "label"),
    milestones: coordinatesObject(milestones, "milestone"),
    issues: coordinatesObject(issues, "issue"),
  };
}

function bindingsDigest(document) {
  return sha256(Buffer.from(canonicalJson(document, "Issue-route bindings"), "utf8"));
}

export function admitIssueRouteBindings(value, routeKey) {
  if (value === undefined || value === null) return null;
  const document = record(value, "Issue-route bindings");
  assertExactKeys(
    document,
    ["$schema", "schemaVersion", "artifactType", "routeKey", "seedSha256", "repository", "labels", "milestones", "issues"],
    [],
    "Issue-route bindings",
  );
  requireCondition(document.$schema === BINDINGS_SCHEMA_REFERENCE, "schema_reference", `Issue-route bindings.$schema must be ${BINDINGS_SCHEMA_REFERENCE}.`);
  requireCondition(document.schemaVersion === SCHEMA_VERSION, "schema_version", `Issue-route bindings schemaVersion must be ${SCHEMA_VERSION}.`);
  requireCondition(document.artifactType === BINDINGS_TYPE, "artifact_type", `Issue-route bindings artifactType must be ${BINDINGS_TYPE}.`);
  requireCondition(semanticKey(document.routeKey, "Issue-route bindings.routeKey") === routeKey, "route_key", "Issue-route bindings must name the selected route.");
  const seedSha256 = digest(document.seedSha256, "Issue-route bindings.seedSha256");
  const repository = record(document.repository, "Issue-route bindings.repository");
  assertExactKeys(repository, ["immutableId", "fullName"], [], "Issue-route bindings.repository");
  const admitted = {
    source: document,
    digest: bindingsDigest(document),
    seedSha256,
    repository: {
      immutableId: safeInteger(repository.immutableId, "Issue-route bindings.repository.immutableId"),
      fullName: normalizedRepository(repository.fullName, "Issue-route bindings.repository.fullName"),
    },
    labels: coordinateMap(document.labels, "Issue-route bindings.labels", "label", { maximum: 64 }),
    milestones: coordinateMap(document.milestones, "Issue-route bindings.milestones", "milestone", { maximum: 32 }),
    issues: coordinateMap(document.issues, "Issue-route bindings.issues", "issue", { maximum: 128 }),
  };
  admittedBindingValues.add(admitted);
  return Object.freeze(admitted);
}

export function admitIssueRouteReceipt(value, routeKey) {
  if (value === undefined || value === null) return null;
  const document = record(value, "Issue-route receipt");
  assertExactKeys(
    document,
    ["schemaVersion", "artifactType", "schemaAuthority", "materializerVersion", "routeKey", "seedSha256", "admittedBindingsSha256", "resolvedBindingsSha256", "confirmedPlanSha256", "verifiedPlanSha256", "repository", "bootstrapFrontKey", "labels", "milestones", "issues", "operationBoundary", "recovery", "coverageBoundary", "nextOwnerAction"],
    ["$schema"],
    "Issue-route receipt",
  );
  if (owns(document, "$schema")) {
    requireCondition(document.$schema === RECEIPT_SCHEMA_REFERENCE, "schema_reference", `Issue-route receipt.$schema must be ${RECEIPT_SCHEMA_REFERENCE}.`);
  }
  requireCondition(document.schemaVersion === SCHEMA_VERSION, "schema_version", `Issue-route receipt schemaVersion must be ${SCHEMA_VERSION}.`);
  requireCondition(document.artifactType === RECEIPT_TYPE, "artifact_type", `Issue-route receipt artifactType must be ${RECEIPT_TYPE}.`);
  requireCondition(semanticKey(document.routeKey, "Issue-route receipt.routeKey") === routeKey, "route_key", "Issue-route receipt must name the selected route.");
  const schemaAuthority = record(document.schemaAuthority, "Issue-route receipt.schemaAuthority");
  assertExactKeys(schemaAuthority, ["id", "sha256"], [], "Issue-route receipt.schemaAuthority");
  requireCondition(schemaAuthority.id === RECEIPT_SCHEMA_ID, "schema_identity", `Issue-route receipt.schemaAuthority.id must be ${RECEIPT_SCHEMA_ID}.`);
  const materializerVersion = text(document.materializerVersion, "Issue-route receipt.materializerVersion", 128);
  requireCondition(semanticVersionPattern.test(materializerVersion), "semantic_version", "Issue-route receipt.materializerVersion must be a semantic version.");
  const seedSha256 = digest(document.seedSha256, "Issue-route receipt.seedSha256");
  const admittedBindingsSha256 = document.admittedBindingsSha256 === null
    ? null
    : digest(document.admittedBindingsSha256, "Issue-route receipt.admittedBindingsSha256");
  const resolvedBindingsSha256 = digest(document.resolvedBindingsSha256, "Issue-route receipt.resolvedBindingsSha256");
  requireCondition(document.confirmedPlanSha256 === null || (typeof document.confirmedPlanSha256 === "string" && planDigestPattern.test(document.confirmedPlanSha256)), "plan_digest", "Issue-route receipt.confirmedPlanSha256 must be null or a sha256 plan coordinate.");
  requireCondition(typeof document.verifiedPlanSha256 === "string" && planDigestPattern.test(document.verifiedPlanSha256), "plan_digest", "Issue-route receipt.verifiedPlanSha256 must be a sha256 plan coordinate.");
  const repository = record(document.repository, "Issue-route receipt.repository");
  assertExactKeys(repository, ["immutableId", "fullName"], [], "Issue-route receipt.repository");
  const admittedRepository = {
    immutableId: safeInteger(repository.immutableId, "Issue-route receipt.repository.immutableId"),
    fullName: normalizedRepository(repository.fullName, "Issue-route receipt.repository.fullName"),
  };
  const labels = coordinateMap(document.labels, "Issue-route receipt.labels", "label", { minimum: 1, maximum: 64 });
  const milestones = coordinateMap(document.milestones, "Issue-route receipt.milestones", "milestone", { minimum: 1, maximum: 32 });
  const issues = coordinateMap(document.issues, "Issue-route receipt.issues", "issue", { minimum: 2, maximum: 128 });
  const operationBoundary = record(document.operationBoundary, "Issue-route receipt.operationBoundary");
  assertExactKeys(operationBoundary, ["mutationPolicy", "existingResourcePolicy", "linkResolution", "applyCoordinationPrecondition", "liveIssueAuthorityAfterMaterialization", "gitRepositoryContentMutation", "githubRepositorySettingsMutation", "localReceiptMutation"], [], "Issue-route receipt.operationBoundary");
  requireCondition(
    operationBoundary.mutationPolicy === "create_missing_resources_and_finalize_pending_issues"
      && operationBoundary.existingResourcePolicy === "preserve_and_report"
      && operationBoundary.linkResolution === "two_pass"
      && operationBoundary.applyCoordinationPrecondition === "one_active_coordinator_per_repository_route"
      && operationBoundary.liveIssueAuthorityAfterMaterialization === true
      && operationBoundary.gitRepositoryContentMutation === "none"
      && operationBoundary.githubRepositorySettingsMutation === "none"
      && operationBoundary.localReceiptMutation === "create_only",
    "operation_boundary",
    "Issue-route receipt.operationBoundary must retain the bounded create-and-finalize, preserve-live materialization boundary.",
  );
  const recovery = record(document.recovery, "Issue-route receipt.recovery");
  assertExactKeys(recovery, ["strategy", "knownGoodCoordinate", "rule"], [], "Issue-route receipt.recovery");
  requireCondition(recovery.strategy === "seed_bindings_and_live_state_reconciliation", "recovery_strategy", "Issue-route receipt.recovery must use seed, bindings, and live-state reconciliation.");
  const knownGood = record(recovery.knownGoodCoordinate, "Issue-route receipt.recovery.knownGoodCoordinate");
  assertExactKeys(knownGood, ["routeKey", "seedSha256", "resolvedBindingsSha256", "repositoryImmutableId"], [], "Issue-route receipt.recovery.knownGoodCoordinate");
  requireCondition(knownGood.routeKey === routeKey, "recovery_coordinate", "Issue-route receipt recovery routeKey must match the receipt.");
  requireCondition(knownGood.seedSha256 === seedSha256, "recovery_coordinate", "Issue-route receipt recovery seed digest must match the receipt.");
  requireCondition(knownGood.resolvedBindingsSha256 === resolvedBindingsSha256, "recovery_coordinate", "Issue-route receipt recovery resolved-bindings digest must match the receipt.");
  requireCondition(knownGood.repositoryImmutableId === admittedRepository.immutableId, "recovery_coordinate", "Issue-route receipt recovery repository identity must match the receipt.");
  text(recovery.rule, "Issue-route receipt.recovery.rule", 500);
  text(document.coverageBoundary, "Issue-route receipt.coverageBoundary", 1_000);
  text(document.nextOwnerAction, "Issue-route receipt.nextOwnerAction", 500);
  const reconstructedBindings = buildBindingsDocument({
    routeKey,
    seedSha256,
    repository: admittedRepository,
    labels,
    milestones,
    issues,
  });
  requireCondition(bindingsDigest(reconstructedBindings) === resolvedBindingsSha256, "bindings_digest", "Issue-route receipt resolved-bindings digest must match its deterministic full-coordinate map.");
  const admitted = {
    source: document,
    schemaAuthority: { id: schemaAuthority.id, sha256: digest(schemaAuthority.sha256, "Issue-route receipt.schemaAuthority.sha256") },
    materializerVersion,
    seedSha256,
    admittedBindingsSha256,
    resolvedBindingsSha256,
    confirmedPlanSha256: document.confirmedPlanSha256,
    verifiedPlanSha256: document.verifiedPlanSha256,
    bootstrapFrontKey: semanticKey(document.bootstrapFrontKey, "Issue-route receipt.bootstrapFrontKey"),
    repository: admittedRepository,
    labels,
    milestones,
    issues,
  };
  admittedReceiptValues.add(admitted);
  return Object.freeze(admitted);
}

function collectProcess(command, args, { input = undefined, maxBytes = MAX_API_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    const stdout = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxBytes) {
        child.kill();
        reject(new IssueRouteError("github_response_limit", "GitHub returned more data than the materializer can safely inspect."));
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderrBytes += chunk.length;
      if (stderrBytes > 64 * 1024) child.kill();
    });
    child.once("error", () => reject(new IssueRouteError("github_cli", "GitHub CLI could not start.")));
    child.once("close", (code, signal) => {
      if (code !== 0) {
        reject(new IssueRouteError(
          "github_request",
          `The GitHub CLI ended before the materializer received an accepted response (exit ${code ?? "signal"}${signal ? `, ${signal}` : ""}). The request outcome is unknown; read live state and create a fresh plan before continuing.`,
        ));
        return;
      }
      resolve(Buffer.concat(stdout, stdoutBytes).toString("utf8"));
    });
    if (input === undefined) child.stdin.end();
    else child.stdin.end(input);
  });
}

export function createGitHubIssueRouteAdapter({ runner = collectProcess } = {}) {
  return Object.freeze({
    async request({ method = "GET", endpoint, query = undefined, body = undefined }) {
      const queryText = query
        ? `?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)])).toString()}`
        : "";
      const args = [
        "api",
        `${endpoint}${queryText}`,
        "--method",
        method,
        "-H",
        "Accept: application/vnd.github+json",
        "-H",
        `X-GitHub-Api-Version: ${API_VERSION}`,
      ];
      let input;
      if (body !== undefined) {
        args.push("--input", "-");
        input = JSON.stringify(body);
      }
      const output = await runner("gh", args, { input, maxBytes: MAX_API_BYTES });
      if (output.trim() === "") return null;
      try {
        return JSON.parse(output);
      } catch {
        fail("github_response", "GitHub returned a response the materializer could not interpret.");
      }
    },
  });
}

async function request(adapter, options) {
  requireCondition(adapter && typeof adapter.request === "function", "adapter", "The Issue-route operation requires an injected GitHub adapter.");
  return adapter.request(options);
}

async function readPages(adapter, endpoint, query, label) {
  const rows = [];
  let observedBytes = 0;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await request(adapter, {
      method: "GET",
      endpoint,
      query: { ...query, per_page: PAGE_SIZE, page },
    });
    const items = denseArray(response, `${label} page ${page}`, { maximum: PAGE_SIZE });
    observedBytes += Buffer.byteLength(JSON.stringify(items), "utf8");
    requireCondition(
      observedBytes <= MAX_INVENTORY_UTF8_BYTES,
      "inventory_limit",
      `${label} exceeds the ${MAX_INVENTORY_UTF8_BYTES}-byte inventory boundary. Use a repository-specific inventory procedure with an explicit higher bound before apply.`,
    );
    requireCondition(
      rows.length + items.length <= MAX_INVENTORY_RECORDS,
      "inventory_limit",
      `${label} exceeds the ${MAX_INVENTORY_RECORDS}-record inventory boundary. Use a repository-specific inventory procedure with an explicit higher bound before apply.`,
    );
    rows.push(...items);
    if (items.length < PAGE_SIZE) return rows;
  }
  fail("pagination_limit", `${label} exceeds the ${MAX_PAGES}-page inventory boundary.`);
}

function normalizedLabel(item) {
  record(item, "GitHub label");
  return {
    id: safeInteger(item.id, "GitHub label.id"),
    nodeId: text(item.node_id, "GitHub label.node_id", 512),
    name: text(item.name, "GitHub label.name", 50),
    color: text(item.color, "GitHub label.color", 16).toUpperCase(),
    description: item.description ?? "",
    archivedAt: item.archived_at === null || item.archived_at === undefined
      ? null
      : text(item.archived_at, "GitHub label.archived_at", 128),
  };
}

function normalizedMilestone(item) {
  record(item, "GitHub milestone");
  return {
    id: safeInteger(item.id, "GitHub milestone.id"),
    nodeId: text(item.node_id, "GitHub milestone.node_id", 512),
    number: safeInteger(item.number, "GitHub milestone.number"),
    title: text(item.title, "GitHub milestone.title", 256),
    description: item.description ?? "",
    state: item.state,
  };
}

function normalizedIssue(item) {
  record(item, "GitHub Issue");
  return {
    id: safeInteger(item.id, "GitHub Issue.id"),
    nodeId: text(item.node_id, "GitHub Issue.node_id", 512),
    number: safeInteger(item.number, "GitHub Issue.number"),
    title: text(item.title, "GitHub Issue.title", 256),
    body: item.body ?? "",
    state: item.state,
    labels: denseArray(item.labels ?? [], "GitHub Issue.labels").map((label) => typeof label === "string" ? label : label.name),
    milestoneNumber: item.milestone?.number ?? null,
  };
}

export async function readIssueRouteInventory({ adapter, repo }) {
  const requestedRepository = normalizedRepository(repo);
  const repositoryRaw = await request(adapter, { method: "GET", endpoint: endpointFor(requestedRepository) });
  const repository = {
    id: safeInteger(repositoryRaw.id, "GitHub repository.id"),
    nodeId: text(repositoryRaw.node_id, "GitHub repository.node_id", 512),
    fullName: normalizedRepository(repositoryRaw.full_name, "GitHub repository.full_name"),
    hasIssues: repositoryRaw.has_issues === true,
    archived: repositoryRaw.archived === true,
    disabled: repositoryRaw.disabled === true,
  };
  const rawLabels = await readPages(adapter, endpointFor(repository.fullName, "/labels"), {}, "GitHub labels");
  const rawMilestones = await readPages(adapter, endpointFor(repository.fullName, "/milestones"), { state: "all" }, "GitHub milestones");
  const rawIssues = await readPages(adapter, endpointFor(repository.fullName, "/issues"), { state: "all", sort: "created", direction: "asc" }, "GitHub Issues");
  const pullRequestNumbers = new Set();
  const issues = [];
  for (const item of rawIssues) {
    if (item.pull_request !== undefined) pullRequestNumbers.add(item.number);
    else issues.push(normalizedIssue(item));
  }
  return Object.freeze({
    repository,
    labels: rawLabels.map(normalizedLabel),
    milestones: rawMilestones.map(normalizedMilestone),
    issues,
    pullRequestNumbers,
  });
}

async function readIssueBodies(foundation, issueSeed) {
  const bodies = {};
  const issueKeys = new Set(issueSeed.issues.map((issue) => issue.key));
  for (const issue of issueSeed.issues) {
    const sourcePath = path.join(foundation.bundleRoot, issue.bodySource);
    const bytes = await readBoundedRegularNoFollow(sourcePath, `Issue body ${issue.bodySource}`, {
      maxBytes: MAX_JSON_BYTES,
      errorCode: "body_source",
    });
    requireCondition(sha256(bytes) === issue.bodySha256, "body_digest", `Issue body ${issue.bodySource} changed after foundation admission.`);
    const source = bytes.toString("utf8");
    requireCondition(!source.includes("<!-- repository-handoff:"), "reserved_marker", `Issue body ${issue.bodySource} must leave the repository-handoff marker namespace to the materializer.`);
    issueTokenPattern.lastIndex = 0;
    const withoutKnownTokens = source.replace(issueTokenPattern, (_token, key) => {
      requireCondition(issueKeys.has(key), "unknown_issue_token", `Issue body ${issue.bodySource} references an unknown Issue semantic key.`);
      return "";
    });
    requireCondition(!withoutKnownTokens.includes("{{issue:"), "issue_token", `Issue body ${issue.bodySource} contains an unsupported Issue-link token.`);
    bodies[issue.key] = source;
  }
  const admitted = Object.freeze(bodies);
  admittedBodyValues.add(admitted);
  return admitted;
}

function requestField(value, label, { maxChars, maxBytes }) {
  requireCondition(typeof value === "string", "request_field", `${label} must be text before GitHub request planning.`);
  const bytes = Buffer.byteLength(value, "utf8");
  requireCondition(
    value.length <= maxChars && bytes <= maxBytes,
    "request_field_limit",
    `${label} exceeds the materializer's ${maxChars}-character or ${maxBytes}-byte GitHub request boundary. Shorten or split the field before apply.`,
  );
}

export function assertIssueRouteRequestBounds({ issueSeed, bodyByKey }) {
  requireCondition(issueSeed && Array.isArray(issueSeed.issues), "issue_seed", "Request preflight requires one admitted Issue route seed.");
  requireCondition(isPlainRecord(bodyByKey), "body_source", "Request preflight requires the admitted Issue body sources.");
  requireCondition(
    !JSON.stringify(issueSeed).includes("<!-- repository-handoff:"),
    "reserved_marker",
    "The Issue route seed must leave the repository-handoff marker namespace to the materializer.",
  );

  const numberByIssueKey = new Map(issueSeed.issues.map((issue) => [issue.key, Number.MAX_SAFE_INTEGER]));
  for (const label of issueSeed.labels) {
    requestField(label.name, `Label ${label.key} name`, { maxChars: 50, maxBytes: 200 });
    requestField(label.description, `Label ${label.key} description`, { maxChars: 100, maxBytes: 400 });
  }
  for (const milestone of issueSeed.milestones) {
    requestField(milestone.title, `Milestone ${milestone.key} title`, { maxChars: 256, maxBytes: 1_024 });
    const description = milestoneDescription(issueSeed.key, milestone, admittedSeedSha256(issueSeed));
    requestField(description, `Milestone ${milestone.key} rendered description`, {
      maxChars: MAX_MILESTONE_DESCRIPTION_CHARS,
      maxBytes: MAX_MILESTONE_DESCRIPTION_UTF8_BYTES,
    });
    const markers = parseIssueRouteMarkers(description, "milestone");
    requireCondition(
      markers.length === 1 && markers[0].key === milestone.key && markers[0].seedSha256 === admittedSeedSha256(issueSeed),
      "rendered_marker",
      `Milestone ${milestone.key} must render exactly one matching semantic marker.`,
    );
  }
  for (const issue of issueSeed.issues) {
    requireCondition(owns(bodyByKey, issue.key), "body_source", `Issue ${issue.key} needs its admitted body source.`);
    requestField(issue.title, `Issue ${issue.key} title`, { maxChars: 256, maxBytes: 1_024 });
    const pending = issuePendingBody(issueSeed.key, issue.key, admittedSeedSha256(issueSeed));
    requestField(pending, `Issue ${issue.key} pending body`, {
      maxChars: MAX_ISSUE_BODY_CHARS,
      maxBytes: MAX_ISSUE_BODY_UTF8_BYTES,
    });
    const pendingMarkers = parseIssueRouteMarkers(pending, "issue");
    requireCondition(
      pendingMarkers.length === 1 && pendingMarkers[0].key === issue.key && pendingMarkers[0].phase === "pending",
      "rendered_marker",
      `Issue ${issue.key} must render exactly one matching pending marker.`,
    );
    const rendered = renderIssueRouteBody({
      issueSeed,
      issue,
      bodySource: bodyByKey[issue.key],
      numberByIssueKey,
    });
    requestField(rendered, `Issue ${issue.key} rendered body`, {
      maxChars: MAX_ISSUE_BODY_CHARS,
      maxBytes: MAX_ISSUE_BODY_UTF8_BYTES,
    });
    const liveMarkers = parseIssueRouteMarkers(rendered, "issue");
    requireCondition(
      liveMarkers.length === 1 && liveMarkers[0].key === issue.key && liveMarkers[0].phase === "live",
      "rendered_marker",
      `Issue ${issue.key} must render exactly one matching live marker.`,
    );
  }
  return true;
}

function byId(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function byNumber(items) {
  return new Map(items.map((item) => [item.number, item]));
}

function identityFromCoordinate(coordinate, items, kind) {
  if (!coordinate) return null;
  const idMatch = byId(items).get(coordinate.immutableId);
  const labelMatches = kind === "label"
    ? items.filter((item) => labelNameKey(item.name) === labelNameKey(coordinate.name))
    : [];
  if (labelMatches.length > 1) return { conflict: "case-insensitive label coordinate is ambiguous" };
  const numberMatch = kind === "label" ? labelMatches[0] : byNumber(items).get(coordinate.number);
  if (idMatch && numberMatch && idMatch.id !== numberMatch.id) return { conflict: "coordinate disagreement" };
  const selected = idMatch ?? numberMatch ?? null;
  if (!selected) return { conflict: "coordinate is absent" };
  if (selected.id !== coordinate.immutableId) return { conflict: "immutable identity differs" };
  return { item: selected };
}

function markersByKey(items, routeKey, kind, valueKey) {
  const result = new Map();
  for (const item of items) {
    for (const found of parseIssueRouteMarkers(item[valueKey], kind)) {
      if (found.routeKey !== routeKey) continue;
      if (!result.has(found.key)) result.set(found.key, []);
      result.get(found.key).push({ item, marker: found });
    }
  }
  return result;
}

function exactSet(left, right) {
  const a = [...left].sort(compareUtf8);
  const b = [...right].sort(compareUtf8);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function exactLabelSet(left, right) {
  return exactSet([...left].map(labelNameKey), [...right].map(labelNameKey));
}

function expectedPendingIssue({ issueSeed, seedIssue, coordinates }) {
  const milestone = coordinates.milestones.get(seedIssue.milestoneKey);
  const labels = seedIssue.labels.map((key) => coordinates.labels.get(key)?.name);
  if (!milestone || labels.some((name) => name === undefined)) return null;
  return {
    title: seedIssue.title,
    body: issuePendingBody(issueSeed.key, seedIssue.key, admittedSeedSha256(issueSeed)),
    labels,
    milestoneNumber: milestone.number,
  };
}

function pendingIssueAgrees(live, expected) {
  return expected !== null
    && live.title === expected.title
    && live.body === expected.body
    && live.milestoneNumber === expected.milestoneNumber
    && exactLabelSet(live.labels, expected.labels);
}

function action(resource, key, state, reason, extra = {}) {
  return { resource, key, state, reason, ...extra };
}

function sortActions(actions) {
  return actions.sort((left, right) => (
    resourceOrder.get(left.resource) - resourceOrder.get(right.resource)
      || compareUtf8(left.key, right.key)
  ));
}

function findIdentity({ kind, seedItem, liveItems, receiptMap, markerMap, bindingMap }) {
  const candidates = [];
  const receiptCoordinate = receiptMap?.get(seedItem.key);
  if (receiptCoordinate) {
    const resolved = identityFromCoordinate(receiptCoordinate, liveItems, kind);
    if (resolved.conflict) return { conflict: `receipt ${resolved.conflict}` };
    candidates.push({ item: resolved.item, source: "receipt" });
  }
  const marked = markerMap?.get(seedItem.key) ?? [];
  if (marked.length > 1) return { conflict: "more than one live object carries the semantic marker" };
  if (marked.length === 1) candidates.push({ item: marked[0].item, marker: marked[0].marker, source: "marker" });
  const bindingCoordinate = bindingMap?.get(seedItem.key);
  if (bindingCoordinate) {
    const resolved = identityFromCoordinate(bindingCoordinate, liveItems, kind);
    if (resolved.conflict) return { conflict: `explicit binding ${resolved.conflict}` };
    candidates.push({ item: resolved.item, source: "binding" });
  }
  const identities = new Set(candidates.map((candidate) => candidate.item.id));
  if (identities.size > 1) return { conflict: "receipt, marker, and explicit binding identify different live objects" };
  if (candidates.length === 0) return {};
  return {
    ...candidates[0],
    authorityEstablished: candidates.some((candidate) => candidate.source === "receipt" || candidate.source === "binding"),
  };
}

function addBlocker(blockers, resource, key, reason) {
  blockers.push({ resource, key, reason });
}

function publicRepositoryAction(inventory, requestedRepository, blockers) {
  const blockerCountBeforeRepositoryChecks = blockers.length;
  if (inventory.repository.fullName !== requestedRepository) {
    addBlocker(blockers, "repository", requestedRepository, "GitHub resolved a different canonical repository name.");
  }
  if (!inventory.repository.hasIssues) addBlocker(blockers, "repository", requestedRepository, "GitHub Issues need to be enabled before this route can materialize.");
  if (inventory.repository.archived) addBlocker(blockers, "repository", requestedRepository, "The archived repository can remain intact while the repository owner selects its continuation route.");
  if (inventory.repository.disabled) addBlocker(blockers, "repository", requestedRepository, "The platform owner must restore the repository to an active state before Issue-route materialization can continue.");
  return action("repository", requestedRepository, blockers.length === blockerCountBeforeRepositoryChecks ? "compatible" : "held", "repository identity and Issue capability inspected", {
    repositoryId: inventory.repository.id,
  });
}

function resolveObjects({ issueSeed, inventory, receipt, bindings, bodyByKey }) {
  const seedSha256 = admittedSeedSha256(issueSeed);
  const actions = [];
  const blockers = [];
  const labels = new Map();
  const milestones = new Map();
  const issues = new Map();
  const claimedLabels = new Map();
  const claimedMilestones = new Map();
  const claimedIssues = new Map();
  const milestoneMarkers = markersByKey(inventory.milestones, issueSeed.key, "milestone", "description");
  const issueMarkers = markersByKey(inventory.issues, issueSeed.key, "issue", "body");

  for (const seedLabel of issueSeed.labels) {
    let found;
    const identity = findIdentity({
      kind: "label",
      seedItem: seedLabel,
      liveItems: inventory.labels,
      receiptMap: receipt?.labels,
      bindingMap: bindings?.labels,
    });
    if (identity.conflict) {
      actions.push(action("label", seedLabel.key, "conflict", identity.conflict));
      addBlocker(blockers, "label", seedLabel.key, identity.conflict);
      continue;
    }
    const labelCandidates = identity.item
      ? [identity.item]
      : inventory.labels.filter((item) => labelNameKey(item.name) === labelNameKey(seedLabel.name));
    if (labelCandidates.length > 1) {
      const reason = "more than one live label matches the semantic label name case-insensitively";
      actions.push(action("label", seedLabel.key, "conflict", reason));
      addBlocker(blockers, "label", seedLabel.key, reason);
      continue;
    }
    [found] = labelCandidates;
    if (!found) {
      actions.push(action("label", seedLabel.key, "create", "the semantic label is absent", { name: seedLabel.name }));
      continue;
    }
    if (found.archivedAt !== null) {
      const reason = "the matching GitHub label is archived and cannot be assigned to an Issue";
      actions.push(action("label", seedLabel.key, "conflict", reason, { name: found.name, id: found.id }));
      addBlocker(blockers, "label", seedLabel.key, "Restore the label to active use, or bind this semantic key to a fitting active label before apply.");
      continue;
    }
    if (claimedLabels.has(found.id)) {
      const reason = `live label is already claimed by ${claimedLabels.get(found.id)}`;
      actions.push(action("label", seedLabel.key, "conflict", reason));
      addBlocker(blockers, "label", seedLabel.key, reason);
      continue;
    }
    claimedLabels.set(found.id, seedLabel.key);
    labels.set(seedLabel.key, found);
    const same = found.name === seedLabel.name
      && found.color === seedLabel.color.toUpperCase()
      && found.description === seedLabel.description;
    actions.push(action("label", seedLabel.key, same ? "compatible" : "preserve_live", same ? "live label agrees with the seed" : "live label retains the repository owner's wording and presentation", {
      name: found.name,
      id: found.id,
    }));
  }

  for (const seedMilestone of issueSeed.milestones) {
    const identity = findIdentity({
      kind: "milestone",
      seedItem: seedMilestone,
      liveItems: inventory.milestones,
      receiptMap: receipt?.milestones,
      markerMap: milestoneMarkers,
      bindingMap: bindings?.milestones,
    });
    if (identity.conflict) {
      actions.push(action("milestone", seedMilestone.key, "conflict", identity.conflict));
      addBlocker(blockers, "milestone", seedMilestone.key, identity.conflict);
      continue;
    }
    let found = identity.item;
    if (!found) {
      const candidates = inventory.milestones.filter((item) => item.title === seedMilestone.title);
      if (candidates.length > 0) {
        const numbers = candidates.map((item) => item.number).sort((a, b) => a - b);
        actions.push(action("milestone", seedMilestone.key, "unresolved", "title matches require an explicit binding", { suggestions: numbers }));
        addBlocker(blockers, "milestone", seedMilestone.key, "Review the matching milestone and bind its semantic key before apply.");
        continue;
      }
      actions.push(action("milestone", seedMilestone.key, "create", "the semantic milestone is absent"));
      continue;
    }
    if (claimedMilestones.has(found.id)) {
      const reason = `live milestone is already claimed by ${claimedMilestones.get(found.id)}`;
      actions.push(action("milestone", seedMilestone.key, "conflict", reason));
      addBlocker(blockers, "milestone", seedMilestone.key, reason);
      continue;
    }
    claimedMilestones.set(found.id, seedMilestone.key);
    milestones.set(seedMilestone.key, found);
    const expected = milestoneDescription(issueSeed.key, seedMilestone, seedSha256);
    const same = found.title === seedMilestone.title && found.description === expected;
    const mayPreserveDifference = identity.authorityEstablished === true;
    const state = same ? "compatible" : (mayPreserveDifference ? "preserve_live" : "conflict");
    const reason = same
      ? "live milestone agrees with the seed"
      : (mayPreserveDifference ? "live milestone retains the repository owner's wording" : "marker-discovered milestone differs before the live-authority transition");
    actions.push(action("milestone", seedMilestone.key, state, reason, {
      number: found.number,
      id: found.id,
    }));
    if (state === "conflict") addBlocker(blockers, "milestone", seedMilestone.key, "Review and bind the live milestone, or restore the exact seeded title and description before apply.");
  }

  for (const seedIssue of issueSeed.issues) {
    const identity = findIdentity({
      kind: "issue",
      seedItem: seedIssue,
      liveItems: inventory.issues,
      receiptMap: receipt?.issues,
      markerMap: issueMarkers,
      bindingMap: bindings?.issues,
    });
    if (identity.conflict) {
      actions.push(action("issue", seedIssue.key, "conflict", identity.conflict));
      addBlocker(blockers, "issue", seedIssue.key, identity.conflict);
      continue;
    }
    let found = identity.item;
    if (!found) {
      const candidates = inventory.issues.filter((item) => item.title === seedIssue.title);
      if (candidates.length > 0) {
        const numbers = candidates.map((item) => item.number).sort((a, b) => a - b);
        actions.push(action("issue", seedIssue.key, "unresolved", "title matches are suggestions only", { suggestions: numbers }));
        addBlocker(blockers, "issue", seedIssue.key, "Review the matching Issue and bind its semantic key before apply.");
        continue;
      }
      actions.push(action("issue", seedIssue.key, "create", "the semantic Issue is absent"));
      continue;
    }
    if (claimedIssues.has(found.id)) {
      const reason = `live Issue is already claimed by ${claimedIssues.get(found.id)}`;
      actions.push(action("issue", seedIssue.key, "conflict", reason));
      addBlocker(blockers, "issue", seedIssue.key, reason);
      continue;
    }
    claimedIssues.set(found.id, seedIssue.key);
    issues.set(seedIssue.key, found);
    if (identity.marker?.phase === "pending") {
      const expectedPending = issuePendingBody(issueSeed.key, seedIssue.key, seedSha256);
      const expectedState = expectedPendingIssue({
        issueSeed,
        seedIssue,
        coordinates: { labels, milestones },
      });
      if (identity.marker.seedSha256 !== seedSha256) {
        actions.push(action("issue", seedIssue.key, "conflict", "pending Issue carries a different seed digest", { number: found.number, id: found.id }));
        addBlocker(blockers, "issue", seedIssue.key, "Resume with the seed that created the pending Issue, or choose an explicit reconciliation for the live Issue.");
      } else if (found.body !== expectedPending) {
        actions.push(action("issue", seedIssue.key, "conflict", "the repository owner edited the pending body", { number: found.number, id: found.id }));
        addBlocker(blockers, "issue", seedIssue.key, "The owner edit remains intact. Restore the exact pending body for automatic finalization, or reconcile the owner-authored continuation before another apply.");
      } else if (expectedState === null) {
        actions.push(action("issue", seedIssue.key, "deferred_postcondition", "the pending Issue needs resolved active labels and a milestone before finalization", { number: found.number, id: found.id }));
        addBlocker(blockers, "issue", seedIssue.key, "Resolve the seeded active labels and milestone, then create a fresh plan.");
      } else if (!pendingIssueAgrees(found, expectedState)) {
        actions.push(action("issue", seedIssue.key, "conflict", "the pending Issue title, labels, or milestone differs from the seeded state", { number: found.number, id: found.id }));
        addBlocker(blockers, "issue", seedIssue.key, "The pending Issue remains available for reconciliation. Restore its exact generated title, label set, and milestone before automatic finalization.");
      } else {
        actions.push(action("issue", seedIssue.key, "recover_pending", "the complete pending Issue can receive its resolved body", { number: found.number, id: found.id }));
      }
      continue;
    }
    actions.push(action("issue", seedIssue.key, "provisional_live", identity.source === "marker" ? "live semantic Issue discovered" : "explicit live Issue coordinate discovered", {
      number: found.number,
      id: found.id,
      authorityEstablished: identity.authorityEstablished === true,
    }));
  }

  const numberByIssueKey = new Map([...issues.entries()].map(([key, item]) => [key, item.number]));
  for (const planned of actions.filter((item) => item.resource === "issue" && item.state === "provisional_live")) {
    const seedIssue = issueSeed.issues.find((item) => item.key === planned.key);
    const live = issues.get(planned.key);
    let expectedBody = null;
    try {
      expectedBody = renderIssueRouteBody({ issueSeed, issue: seedIssue, bodySource: bodyByKey[seedIssue.key], numberByIssueKey });
    } catch (error) {
      if (!(error instanceof IssueRouteError) || error.code !== "unresolved_link") throw error;
    }
    const expectedMilestone = milestones.get(seedIssue.milestoneKey)?.number;
    const expectedLabels = seedIssue.labels.map((key) => labels.get(key)?.name).filter(Boolean);
    const comparisonReady = expectedBody !== null
      && expectedMilestone !== undefined
      && expectedLabels.length === seedIssue.labels.length;
    if (!comparisonReady) {
      planned.state = "deferred_postcondition";
      planned.reason = "exact live postconditions can be evaluated after the remaining route coordinates resolve";
      delete planned.authorityEstablished;
      continue;
    }
    const same = live.title === seedIssue.title
      && live.body === expectedBody
      && expectedMilestone === live.milestoneNumber
      && exactLabelSet(live.labels, expectedLabels);
    planned.state = same ? "compatible" : (planned.authorityEstablished ? "preserve_live" : "conflict");
    planned.reason = same
      ? "live Issue agrees with the seed"
      : (planned.authorityEstablished ? "live Issue retains the repository owner's edits" : "marker-discovered Issue differs before the live-authority transition");
    planned.observedBodySha256 = sha256(Buffer.from(live.body, "utf8"));
    delete planned.authorityEstablished;
    if (planned.state === "conflict") {
      addBlocker(blockers, "issue", planned.key, "Review and bind the live Issue, or restore its exact seeded title, body, labels, and milestone before apply.");
    }
  }

  return { actions: sortActions(actions), blockers, coordinates: { labels, milestones, issues }, numberByIssueKey };
}

function publicPlanIdentity(plan) {
  return {
    schemaVersion: plan.schemaVersion,
    materializerVersion: plan.materializerVersion,
    mode: "plan",
    routeKey: plan.routeKey,
    seedSha256: plan.seedSha256,
    receiptSchemaAuthority: plan.receiptSchemaAuthority,
    foundationAuthority: plan.foundationAuthority,
    nextOwnerAction: plan.nextOwnerAction,
    admittedBindingsSha256: plan.admittedBindingsSha256,
    repository: plan.repository,
    bootstrapFront: plan.bootstrapFront,
    actions: plan.actions,
    blockers: plan.blockers,
    summary: plan.summary,
  };
}

function countStates(actions) {
  const counts = Object.create(null);
  for (const item of actions) counts[item.state] = (counts[item.state] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => compareUtf8(left, right)));
}

function receiptSchemaAuthority(foundation) {
  const authority = foundation?.manifest?.schemasByKey?.get(RECEIPT_SCHEMA_KEY);
  requireCondition(authority, "receipt_schema", `The admitted foundation manifest must identify ${RECEIPT_SCHEMA_KEY}.`);
  requireCondition(authority.id === RECEIPT_SCHEMA_ID, "receipt_schema", "The Issue-route receipt schema identity differs from the materializer contract.");
  return Object.freeze({ id: authority.id, sha256: digest(authority.sha256, "Issue-route receipt schema digest") });
}

export async function createIssueRoutePlan({
  foundation,
  issueSeedKey = undefined,
  repo,
  adapter,
  receipt = null,
  bindings = null,
  inventory = undefined,
  bodySources = undefined,
} = {}) {
  requireCondition(foundation && Array.isArray(foundation.issueSeeds), "foundation", "Use admitFoundation before planning an Issue route.");
  const issueSeed = issueSeedKey === undefined
    ? (foundation.issueSeeds.length === 1 ? foundation.issueSeeds[0] : null)
    : foundation.issueSeeds.find((item) => item.key === issueSeedKey);
  requireCondition(issueSeed, "issue_seed", "Select one Issue seed included by the admitted foundation profile.");
  const seedSha256 = admittedSeedSha256(issueSeed);
  const requestedRepository = normalizedRepository(repo);
  const admittedReceipt = admittedReceiptValues.has(receipt) ? receipt : admitIssueRouteReceipt(receipt, issueSeed.key);
  const admittedBindings = admittedBindingValues.has(bindings) ? bindings : admitIssueRouteBindings(bindings, issueSeed.key);
  const schemaAuthority = receiptSchemaAuthority(foundation);
  const seedLabelKeys = new Set(issueSeed.labels.map((item) => item.key));
  const seedMilestoneKeys = new Set(issueSeed.milestones.map((item) => item.key));
  const seedIssueKeys = new Set(issueSeed.issues.map((item) => item.key));
  const requireSubset = (coordinates, keys, label) => {
    requireCondition([...coordinates.keys()].every((key) => keys.has(key)), "coordinate_key", `${label} must name only semantic keys declared by the admitted seed.`);
  };
  if (admittedReceipt) {
    requireCondition(admittedReceipt.seedSha256 === seedSha256, "receipt_seed", "The receipt belongs to a different admitted Issue route seed revision.");
    requireCondition(admittedReceipt.bootstrapFrontKey === issueSeed.currentFrontKey, "receipt_bootstrap_front", "The receipt names a different bootstrap-front semantic key.");
    requireCondition(exactSet(admittedReceipt.labels.keys(), seedLabelKeys), "receipt_coordinates", "The receipt label map must exactly cover the admitted seed labels.");
    requireCondition(exactSet(admittedReceipt.milestones.keys(), seedMilestoneKeys), "receipt_coordinates", "The receipt milestone map must exactly cover the admitted seed milestones.");
    requireCondition(exactSet(admittedReceipt.issues.keys(), seedIssueKeys), "receipt_coordinates", "The receipt Issue map must exactly cover the admitted seed Issues.");
    requireCondition(
      admittedReceipt.schemaAuthority.id === schemaAuthority.id && admittedReceipt.schemaAuthority.sha256 === schemaAuthority.sha256,
      "receipt_schema",
      "The receipt names a different materialization-receipt schema authority.",
    );
  }
  if (admittedBindings) {
    requireCondition(admittedBindings.seedSha256 === seedSha256, "bindings_seed", "The supplied bindings name a different admitted Issue route seed revision.");
    requireSubset(admittedBindings.labels, seedLabelKeys, "Issue-route bindings.labels");
    requireSubset(admittedBindings.milestones, seedMilestoneKeys, "Issue-route bindings.milestones");
    requireSubset(admittedBindings.issues, seedIssueKeys, "Issue-route bindings.issues");
  }
  const bodyByKey = bodySources === undefined
    ? await readIssueBodies(foundation, issueSeed)
    : bodySources;
  requireCondition(
    admittedBodyValues.has(bodyByKey),
    "body_source",
    "Issue-route planning reuses only body sources admitted through the bounded no-follow reader.",
  );
  assertIssueRouteRequestBounds({ issueSeed, bodyByKey });
  const observed = inventory ?? await readIssueRouteInventory({ adapter, repo: requestedRepository });
  if (admittedReceipt) {
    requireCondition(admittedReceipt.repository.immutableId === observed.repository.id, "receipt_repository", "The receipt belongs to a different repository identity.");
  }
  if (admittedBindings) {
    requireCondition(admittedBindings.repository.immutableId === observed.repository.id, "bindings_repository", "The supplied bindings name a different repository identity.");
  }
  const resolved = resolveObjects({ issueSeed, inventory: observed, receipt: admittedReceipt, bindings: admittedBindings, bodyByKey });
  const repositoryAction = publicRepositoryAction(observed, requestedRepository, resolved.blockers);
  const actions = sortActions([repositoryAction, ...resolved.actions]);
  const current = resolved.coordinates.issues.get(issueSeed.currentFrontKey);
  const nextOwnerAction = text(foundation.profile.nextOwnerAction, "Foundation profile next owner action", 500);
  const plan = {
    schemaVersion: SCHEMA_VERSION,
    materializerVersion: MATERIALIZER_VERSION,
    mode: "plan",
    routeKey: issueSeed.key,
    seedSha256,
    receiptSchemaAuthority: schemaAuthority,
    foundationAuthority: {
      manifestSha256: digest(foundation.manifest.manifestSha256, "Foundation manifest digest"),
      profileKey: semanticKey(foundation.profile.key, "Foundation profile key"),
      profileSha256: digest(foundation.profile.projection.sha256, "Foundation profile digest"),
    },
    nextOwnerAction,
    admittedBindingsSha256: admittedBindings?.digest ?? null,
    repository: {
      requested: requestedRepository,
      fullName: observed.repository.fullName,
      id: observed.repository.id,
      nodeId: observed.repository.nodeId,
    },
    bootstrapFront: { key: issueSeed.currentFrontKey, number: current?.number ?? null },
    actions,
    blockers: resolved.blockers.sort((left, right) => resourceOrder.get(left.resource) - resourceOrder.get(right.resource) || compareUtf8(left.key, right.key)),
    summary: {
      resources: actions.length - 1,
      blockers: resolved.blockers.length,
      states: countStates(actions.slice(1)),
    },
  };
  plan.planSha256 = `sha256:${sha256(Buffer.from(canonicalJson(publicPlanIdentity(plan)), "utf8"))}`;
  Object.defineProperty(plan, "internal", {
    enumerable: false,
    value: Object.freeze({
      foundation,
      issueSeed,
      issueSeedKey: issueSeed.key,
      receipt: admittedReceipt,
      bindings: admittedBindings,
      receiptSchemaAuthority: schemaAuthority,
      adapter,
      bodyByKey,
      inventory: observed,
      coordinates: resolved.coordinates,
      numberByIssueKey: resolved.numberByIssueKey,
    }),
  });
  return Object.freeze(plan);
}

export function verifyIssueRoutePlan(plan, { confirmedPlanSha256 = null } = {}) {
  requireCondition(plan?.internal, "plan", "Verification requires a plan produced by createIssueRoutePlan.");
  requireCondition(confirmedPlanSha256 === null || (typeof confirmedPlanSha256 === "string" && planDigestPattern.test(confirmedPlanSha256)), "plan_digest", "Confirmed plan must be null or an exact sha256 plan coordinate.");
  const failureStates = new Set(["create", "unresolved", "conflict", "recover_pending", "deferred_postcondition", "held"]);
  const failures = [
    ...plan.blockers,
    ...plan.actions.filter((item) => failureStates.has(item.state)).map((item) => ({
      resource: item.resource,
      key: item.key,
      reason: item.reason,
    })),
  ];
  const differences = plan.actions
    .filter((item) => item.state === "preserve_live")
    .map((item) => ({ resource: item.resource, key: item.key, reason: item.reason }));
  const { issueSeed, coordinates } = plan.internal;
  const complete = issueSeed.labels.every((item) => coordinates.labels.has(item.key))
    && issueSeed.milestones.every((item) => coordinates.milestones.has(item.key))
    && issueSeed.issues.every((item) => coordinates.issues.has(item.key));
  if (!complete) failures.push({ resource: "route", key: issueSeed.key, reason: "one or more semantic coordinates remain unresolved" });
  if (failures.length > 0) return { ok: false, failures, differences, receipt: null };
  const bindingsDocument = buildBindingsDocument({
    routeKey: issueSeed.key,
    seedSha256: plan.seedSha256,
    repository: plan.repository,
    labels: coordinates.labels,
    milestones: coordinates.milestones,
    issues: coordinates.issues,
  });
  const resolvedBindingsSha256 = bindingsDigest(bindingsDocument);
  const receipt = {
    schemaVersion: SCHEMA_VERSION,
    artifactType: RECEIPT_TYPE,
    schemaAuthority: plan.internal.receiptSchemaAuthority,
    materializerVersion: MATERIALIZER_VERSION,
    routeKey: issueSeed.key,
    seedSha256: plan.seedSha256,
    admittedBindingsSha256: plan.admittedBindingsSha256,
    resolvedBindingsSha256,
    confirmedPlanSha256,
    verifiedPlanSha256: plan.planSha256,
    repository: {
      immutableId: plan.repository.id,
      fullName: plan.repository.fullName,
    },
    bootstrapFrontKey: issueSeed.currentFrontKey,
    labels: coordinatesObject(coordinates.labels, "label"),
    milestones: coordinatesObject(coordinates.milestones, "milestone"),
    issues: coordinatesObject(coordinates.issues, "issue"),
    operationBoundary: {
      mutationPolicy: "create_missing_resources_and_finalize_pending_issues",
      existingResourcePolicy: "preserve_and_report",
      linkResolution: "two_pass",
      applyCoordinationPrecondition: "one_active_coordinator_per_repository_route",
      liveIssueAuthorityAfterMaterialization: true,
      gitRepositoryContentMutation: "none",
      githubRepositorySettingsMutation: "none",
      localReceiptMutation: "create_only",
    },
    recovery: {
      strategy: "seed_bindings_and_live_state_reconciliation",
      knownGoodCoordinate: {
        routeKey: issueSeed.key,
        seedSha256: plan.seedSha256,
        resolvedBindingsSha256,
        repositoryImmutableId: plan.repository.id,
      },
      rule: "Re-enter with the admitted seed, its deterministic bindings map, and a fresh live inventory. Preserve the repository owner's live content and reconcile any identity disagreement before another apply.",
    },
    coverageBoundary: "This receipt establishes the observed repository identity, semantic resource coordinates, resolved binding digest, and final verified-plan digest. Live content and preserved differences remain available through a fresh repository read; application behavior, owner acceptance, repository settings, and publication retain their named evidence and decision owners.",
    nextOwnerAction: plan.nextOwnerAction,
  };
  return { ok: true, failures: [], differences, receipt };
}

async function readBoundedRegularNoFollow(filePath, label, {
  maxBytes = MAX_JSON_BYTES,
  errorCode = "receipt_target",
} = {}) {
  let handle;
  try {
    handle = await open(
      filePath,
      fileConstants.O_RDONLY | fileConstants.O_NOFOLLOW | fileConstants.O_NONBLOCK,
    );
    const metadata = await handle.stat();
    requireCondition(metadata.isFile() && metadata.size <= maxBytes, errorCode, `${label} must be a regular file within the ${maxBytes}-byte boundary.`);
    const chunks = [];
    let total = 0;
    while (total <= maxBytes) {
      const buffer = Buffer.alloc(Math.min(64 * 1024, maxBytes + 1 - total));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) return Buffer.concat(chunks, total);
      chunks.push(buffer.subarray(0, bytesRead));
      total += bytesRead;
    }
    fail(errorCode, `${label} exceeds the ${maxBytes}-byte boundary.`);
  } catch (error) {
    if (error instanceof IssueRouteError) throw error;
    fail(errorCode, `${label} could not be read through the no-follow regular-file boundary.`);
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function syncDirectoryNoFollow(directoryPath, errorCode, message) {
  let handle;
  try {
    const directoryFlags = fileConstants.O_RDONLY
      | (fileConstants.O_DIRECTORY ?? 0)
      | (fileConstants.O_NOFOLLOW ?? 0);
    handle = await open(directoryPath, directoryFlags);
    const metadata = await handle.stat();
    requireCondition(metadata.isDirectory(), errorCode, message);
    await handle.sync();
  } catch (error) {
    if (error instanceof IssueRouteError) throw error;
    fail(errorCode, message);
  } finally {
    await handle?.close().catch(() => {});
  }
}

export async function preflightReceiptOutput(receiptPath) {
  requireCondition(typeof receiptPath === "string" && receiptPath.length > 0, "receipt_path", "Apply requires a create-only receipt output path.");
  const requestedPath = path.resolve(receiptPath);
  const requestedParent = path.dirname(requestedPath);
  let parentMetadata;
  try {
    parentMetadata = await lstat(requestedParent);
  } catch {
    fail("receipt_parent", "The receipt parent must already exist as a real directory.");
  }
  requireCondition(parentMetadata.isDirectory() && !parentMetadata.isSymbolicLink(), "receipt_parent", "The receipt parent must already exist as a real directory.");
  const canonicalParent = await realpath(requestedParent).catch(() => fail("receipt_parent", "The receipt parent could not be resolved to a canonical directory."));
  const canonicalPath = path.join(canonicalParent, path.basename(requestedPath));
  let targetMetadata = null;
  try {
    targetMetadata = await lstat(canonicalPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (targetMetadata !== null) {
    requireCondition(
      targetMetadata.isFile() && !targetMetadata.isSymbolicLink(),
      "receipt_target",
      "The requested receipt path must be absent; a symbolic link or special filesystem entry already occupies it.",
    );
    fail("receipt_exists", "A receipt already exists at the requested output path. Choose an unused path so this apply can create its own immutable receipt.");
  }

  const probeSource = path.join(canonicalParent, `.issue-route-receipt-preflight.${process.pid}.${randomUUID()}.tmp`);
  const probeLink = `${probeSource}.link`;
  let probeHandle;
  try {
    probeHandle = await open(probeSource, "wx", 0o600);
    await probeHandle.writeFile("issue-route receipt preflight\n");
    await probeHandle.sync();
    await probeHandle.close();
    probeHandle = null;
    await link(probeSource, probeLink);
  } catch {
    fail("receipt_parent_write", "The receipt parent must support create-only files, durable file and directory writes, and same-directory hard links before GitHub mutation begins.");
  } finally {
    await probeHandle?.close().catch(() => {});
    await unlink(probeLink).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
    await unlink(probeSource).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
    await syncDirectoryNoFollow(
      canonicalParent,
      "receipt_parent_write",
      "The receipt parent must support create-only files, durable file and directory writes, and same-directory hard links before GitHub mutation begins.",
    );
  }
  const admitted = { path: canonicalPath, parent: canonicalParent };
  preflightReceiptValues.add(admitted);
  return Object.freeze(admitted);
}

async function writeReceiptCreateOnly(receiptTarget, receipt) {
  requireCondition(preflightReceiptValues.has(receiptTarget), "receipt_preflight", "Receipt writing requires the canonical preflight result from this run.");
  const bytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  requireCondition(bytes.length <= MAX_JSON_BYTES, "receipt_limit", "The materialization receipt exceeds the bounded receipt size.");
  const receiptPath = receiptTarget.path;
  const temporary = path.join(receiptTarget.parent, `.${path.basename(receiptPath)}.${process.pid}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    try {
      await link(temporary, receiptPath);
      return { state: "created", bytes: bytes.length, sha256: sha256(bytes) };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const existing = await readBoundedRegularNoFollow(receiptPath, "Existing receipt target");
      requireCondition(existing.equals(bytes), "receipt_exists", "The accepted receipt remains unchanged; choose a new receipt output path for the new observation.");
      return { state: "same", bytes: bytes.length, sha256: sha256(bytes) };
    }
  } finally {
    await handle?.close().catch(() => {});
    await unlink(temporary).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
    await syncDirectoryNoFollow(
      receiptTarget.parent,
      "receipt_directory_sync",
      "The receipt directory entry could not be synchronized after the create-only write. Read the live repository and inspect the requested receipt path before another apply.",
    );
  }
}

function sleepFor(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function planInputs(plan) {
  return {
    foundation: plan.internal.foundation,
    issueSeedKey: plan.internal.issueSeedKey,
    repo: plan.repository.requested,
    adapter: plan.internal.adapter,
    receipt: plan.internal.receipt,
    bindings: plan.internal.bindings,
    bodySources: plan.internal.bodyByKey,
  };
}

export async function applyIssueRoutePlan({
  plan,
  confirmRepository,
  confirmPlan,
  receiptPath,
  sleep = sleepFor,
  mutationDelayMs = DEFAULT_MUTATION_DELAY_MS,
} = {}) {
  requireCondition(plan?.internal, "plan", "Apply requires a plan produced by createIssueRoutePlan.");
  requireCondition(normalizedRepository(confirmRepository, "Apply repository confirmation") === plan.repository.fullName, "apply_repository_confirmation", "Apply requires the exact canonical OWNER/REPOSITORY confirmation.");
  requireCondition(typeof confirmPlan === "string" && planDigestPattern.test(confirmPlan), "apply_plan_confirmation", "Apply requires the exact sha256 plan confirmation.");
  requireCondition(confirmPlan === plan.planSha256, "apply_plan_confirmation", "The supplied plan confirmation names a different plan.");
  requireCondition(Number.isSafeInteger(mutationDelayMs) && mutationDelayMs >= 0, "mutation_delay", "Mutation delay must be a nonnegative safe integer.");
  const receiptTarget = await preflightReceiptOutput(receiptPath);

  let current = await createIssueRoutePlan(planInputs(plan));
  requireCondition(current.planSha256 === plan.planSha256, "plan_stale", "Live repository state changed after planning. Review the new plan before apply.");
  requireCondition(current.blockers.length === 0, "apply_held", "The plan keeps one or more decisions held for review.", current.blockers);
  const adapter = current.internal.adapter;
  const repo = current.repository.fullName;
  let mutationCount = 0;
  const pauseBeforeMutation = async () => {
    if (mutationCount > 0 && mutationDelayMs > 0) await sleep(mutationDelayMs);
  };
  const mutate = async (options) => {
    await pauseBeforeMutation();
    mutationCount += 1;
    return request(adapter, options);
  };

  for (const planned of current.actions.filter((item) => item.resource === "label" && item.state === "create")) {
    const seed = current.internal.issueSeed.labels.find((item) => item.key === planned.key);
    await mutate({ method: "POST", endpoint: endpointFor(repo, "/labels"), body: { name: seed.name, color: seed.color, description: seed.description } });
  }
  for (const planned of current.actions.filter((item) => item.resource === "milestone" && item.state === "create")) {
    const seed = current.internal.issueSeed.milestones.find((item) => item.key === planned.key);
    await mutate({
      method: "POST",
      endpoint: endpointFor(repo, "/milestones"),
      body: { title: seed.title, description: milestoneDescription(current.routeKey, seed, current.seedSha256) },
    });
  }

  current = await createIssueRoutePlan(planInputs(current));
  requireCondition(current.blockers.length === 0, "apply_held", "Repository state needs review before Issue creation.", current.blockers);
  for (const planned of current.actions.filter((item) => item.resource === "issue" && item.state === "create")) {
    const seed = current.internal.issueSeed.issues.find((item) => item.key === planned.key);
    const milestone = current.internal.coordinates.milestones.get(seed.milestoneKey);
    const labels = seed.labels.map((key) => current.internal.coordinates.labels.get(key)?.name);
    requireCondition(milestone && labels.every(Boolean), "apply_dependency", `Issue ${seed.key} needs its labels and milestone before creation.`);
    await mutate({
      method: "POST",
      endpoint: endpointFor(repo, "/issues"),
      body: {
        title: seed.title,
        body: issuePendingBody(current.routeKey, seed.key, current.seedSha256),
        labels,
        milestone: milestone.number,
      },
    });
  }

  current = await createIssueRoutePlan(planInputs(current));
  requireCondition(current.blockers.length === 0, "apply_held", "Repository state needs review before second-pass link resolution.", current.blockers);
  for (const planned of current.actions.filter((item) => item.resource === "issue" && item.state === "recover_pending")) {
    const seed = current.internal.issueSeed.issues.find((item) => item.key === planned.key);
    const expectedState = expectedPendingIssue({
      issueSeed: current.internal.issueSeed,
      seedIssue: seed,
      coordinates: current.internal.coordinates,
    });
    requireCondition(expectedState !== null, "apply_dependency", `Issue ${seed.key} needs its active labels and milestone before finalization.`);
    await pauseBeforeMutation();
    const liveRaw = await request(adapter, { method: "GET", endpoint: endpointFor(repo, `/issues/${planned.number}`) });
    requireCondition(liveRaw.pull_request === undefined, "issue_identity", `Issue coordinate #${planned.number} resolved to a pull request.`);
    const live = normalizedIssue(liveRaw);
    requireCondition(
      live.id === planned.id && pendingIssueAgrees(live, expectedState),
      "pending_changed",
      `Issue #${planned.number} remains pending because its title, body, labels, or milestone changed. Its live state remains available for repository-owner reconciliation.`,
    );
    const finalBody = renderIssueRouteBody({
      issueSeed: current.internal.issueSeed,
      issue: seed,
      bodySource: current.internal.bodyByKey[seed.key],
      numberByIssueKey: current.internal.numberByIssueKey,
    });
    mutationCount += 1;
    await request(adapter, {
      method: "PATCH",
      endpoint: endpointFor(repo, `/issues/${planned.number}`),
      body: { body: finalBody },
    });
  }

  current = await createIssueRoutePlan(planInputs(current));
  const verification = verifyIssueRoutePlan(current, { confirmedPlanSha256: plan.planSha256 });
  requireCondition(verification.ok, "verify", "The live Issue route remains held for an explicit recovery step.", verification.failures);
  const admittedReceipt = admitIssueRouteReceipt(verification.receipt, current.routeKey);
  requireCondition(
    admittedReceipt.schemaAuthority.id === current.receiptSchemaAuthority.id
      && admittedReceipt.schemaAuthority.sha256 === current.receiptSchemaAuthority.sha256,
    "receipt_schema",
    "The built receipt must retain the plan-confirmed schema authority before writing.",
  );
  const receiptWrite = await writeReceiptCreateOnly(receiptTarget, admittedReceipt.source);
  return {
    mode: "apply",
    routeKey: current.routeKey,
    repository: current.repository,
    confirmedPlanSha256: plan.planSha256,
    verifiedPlanSha256: current.planSha256,
    mutations: mutationCount,
    differences: verification.differences,
    receipt: { path: receiptTarget.path, ...receiptWrite },
  };
}

export function parseIssueRouteArgs(argv) {
  const args = denseArray([...argv], "Issue-route arguments", { allowEmpty: true, maximum: 64 });
  const options = { mode: "plan", json: false };
  const modes = [];
  const valued = new Set([
    "--repo", "--confirm-repository", "--confirm-plan", "--bundle-root", "--manifest",
    "--profile", "--seed", "--bindings", "--receipt", "--receipt-out",
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (["--plan", "--apply", "--verify"].includes(arg)) {
      modes.push(arg.slice(2));
      continue;
    }
    if (arg === "--json") {
      requireCondition(!options.json, "arguments", "--json may be provided once.");
      options.json = true;
      continue;
    }
    requireCondition(valued.has(arg), "arguments", `Unknown Issue-route option ${arg}.`);
    requireCondition(index + 1 < args.length, "arguments", `${arg} requires a value.`);
    const key = {
      "--repo": "repo",
      "--confirm-repository": "confirmRepository",
      "--confirm-plan": "confirmPlan",
      "--bundle-root": "bundleRoot",
      "--manifest": "manifestPath",
      "--profile": "profileKey",
      "--seed": "issueSeedKey",
      "--bindings": "bindingsPath",
      "--receipt": "receiptPath",
      "--receipt-out": "receiptOutputPath",
    }[arg];
    requireCondition(options[key] === undefined, "arguments", `${arg} may be provided once.`);
    options[key] = args[index + 1];
    index += 1;
  }
  requireCondition(modes.length <= 1, "arguments", "Choose one of --plan, --apply, or --verify.");
  if (modes.length === 1) options.mode = modes[0];
  requireCondition(options.repo !== undefined, "arguments", "Choose the destination with --repo OWNER/REPOSITORY.");
  normalizedRepository(options.repo);
  if (options.mode === "apply") {
    requireCondition(options.confirmRepository !== undefined && options.confirmPlan !== undefined, "arguments", "Apply requires --confirm-repository and --confirm-plan.");
    requireCondition(options.receiptOutputPath !== undefined, "arguments", "Apply requires --receipt-out for its create-only receipt.");
  }
  return options;
}

function publicPlan(plan) {
  return { ...publicPlanIdentity(plan), planSha256: plan.planSha256 };
}

function textResult(result) {
  if (result.mode === "plan") {
    const lines = [
      `Issue route: ${result.routeKey}`,
      `Repository: ${result.repository.fullName}`,
      `Plan: ${result.planSha256}`,
      `Bootstrap front: ${result.bootstrapFront.number === null ? result.bootstrapFront.key : `#${result.bootstrapFront.number} (${result.bootstrapFront.key})`}`,
      `Route resources: ${result.summary.resources}; held conditions: ${result.summary.blockers}`,
    ];
    for (const item of result.actions.filter((entry) => entry.resource !== "repository")) {
      lines.push(`- ${item.resource} ${item.key}: ${item.state} — ${item.reason}`);
    }
    if (result.blockers.length > 0) {
      lines.push("Held conditions and next actions:");
      for (const item of result.blockers) {
        lines.push(`- ${item.resource} ${item.key}: ${item.reason}`);
      }
      lines.push("Next: resolve the named condition, then create a fresh plan. Use --json when a machine-readable recovery route is useful.");
    }
    return `${lines.join("\n")}\n`;
  }
  if (result.mode === "verify") {
    if (result.ok) return `Issue route ${result.routeKey} verifies with ${result.differences.length} preserved live difference(s).\n`;
    const lines = [`Issue route ${result.routeKey} remains held by ${result.failures.length} route-integrity condition(s).`];
    for (const item of result.failures) {
      lines.push(`- ${item.resource} ${item.key}: ${item.reason}`);
    }
    lines.push("Next: resolve the named condition, then verify a fresh live-state plan. Use --json when a machine-readable recovery route is useful.");
    return `${lines.join("\n")}\n`;
  }
  return `Issue route ${result.routeKey} applied ${result.mutations} mutation(s); receipt ${result.receipt.state} at ${result.receipt.path}.\nConfirmed plan: ${result.confirmedPlanSha256}\nVerified plan: ${result.verifiedPlanSha256}\n`;
}

function safeErrorText(value, fallback, maximum = 512) {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/[\u0000-\u001f\u007f]+/gu, " ").replace(/\s+/gu, " ").trim();
  if (normalized.length === 0) return fallback;
  return normalized.slice(0, maximum);
}

export function formatIssueRouteError(error) {
  const recognized = error instanceof IssueRouteError || error instanceof FoundationError;
  const code = recognized ? safeErrorText(error.code, "held", 64) : "unexpected";
  const message = recognized
    ? safeErrorText(error.message, "The Issue-route operation remains held.")
    : "The Issue-route operation stopped before changing additional repository state.";
  const lines = [`Issue-route operation held (${code}): ${message}`];
  if (Array.isArray(error?.details)) {
    for (const item of error.details.slice(0, 20)) {
      if (!isPlainRecord(item)) continue;
      const resource = safeErrorText(item.resource, "", 64);
      const key = safeErrorText(item.key, "", 128);
      const reason = safeErrorText(item.reason, "", 512);
      if (resource && key && reason) lines.push(`- ${resource} ${key}: ${reason}`);
    }
  }
  lines.push("Next: correct the named condition. If a request may have reached GitHub, read live state and create a fresh plan before applying again.");
  return `${lines.join("\n")}\n`;
}

export async function runIssueRoute(options, {
  adapter = createGitHubIssueRouteAdapter(),
  foundation = undefined,
  write = (value) => process.stdout.write(value),
  sleep = sleepFor,
} = {}) {
  const admittedFoundation = foundation ?? await admitFoundation({
    bundleRoot: options.bundleRoot ?? issueRouteDefaults.bundleRoot,
    manifestPath: options.manifestPath ?? (options.bundleRoot ? path.join(options.bundleRoot, "foundation.manifest.json") : issueRouteDefaults.manifestPath),
    profileKey: options.profileKey,
  });
  const selectedSeed = options.issueSeedKey === undefined
    ? (admittedFoundation.issueSeeds.length === 1 ? admittedFoundation.issueSeeds[0] : null)
    : admittedFoundation.issueSeeds.find((item) => item.key === options.issueSeedKey);
  requireCondition(selectedSeed, "issue_seed", "Select one Issue seed with --seed.");
  const [bindingsDocument, receiptDocument] = await Promise.all([
    options.bindingsPath ? readJsonFile(options.bindingsPath, "Issue-route bindings") : undefined,
    options.receiptPath ? readJsonFile(options.receiptPath, "Issue-route receipt") : undefined,
  ]);
  const plan = await createIssueRoutePlan({
    foundation: admittedFoundation,
    issueSeedKey: selectedSeed.key,
    repo: options.repo,
    adapter,
    bindings: bindingsDocument,
    receipt: receiptDocument,
  });
  let result;
  if (options.mode === "apply") {
    result = await applyIssueRoutePlan({
      plan,
      confirmRepository: options.confirmRepository,
      confirmPlan: options.confirmPlan,
      receiptPath: options.receiptOutputPath,
      sleep,
    });
  } else if (options.mode === "verify") {
    const verification = verifyIssueRoutePlan(plan);
    result = { mode: "verify", routeKey: plan.routeKey, repository: plan.repository, ...verification };
  } else {
    result = publicPlan(plan);
  }
  write(options.json ? `${JSON.stringify(result, null, 2)}\n` : textResult(result));
  return result;
}

export async function main(argv = process.argv.slice(2), dependencies = {}) {
  try {
    const result = await runIssueRoute(parseIssueRouteArgs(argv), dependencies);
    requireCondition(
      result.mode !== "verify" || result.ok,
      "verify",
      "The live Issue route remains held by one or more integrity conditions.",
      result.failures,
    );
    return result;
  } catch (error) {
    if (error instanceof IssueRouteError || error instanceof FoundationError) throw error;
    throw new IssueRouteError("unexpected", "The Issue-route operation stopped before changing additional repository state.", {
      causeName: error?.name ?? "Error",
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(formatIssueRouteError(error));
    process.exitCode = 1;
  });
}

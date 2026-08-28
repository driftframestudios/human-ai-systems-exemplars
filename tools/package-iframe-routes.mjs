import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(toolPath), "..");
const coreRoot = path.join(
  repositoryRoot,
  "core-architectures-chimeric-prototype-current-pack-v0.1",
);

export const defaultPaths = Object.freeze({
  repositoryRoot,
  sourceRoot: coreRoot,
  routeManifestPath: path.join(coreRoot, "public-iframe-route-manifest-v1.json"),
  sourceManifestPath: path.join(
    coreRoot,
    "core-architectures-chimeric-prototype-manifest-v0.1.json",
  ),
  outputCoreRoot: path.join(
    repositoryRoot,
    ".iframe-route-build/iframes.vik.guru/v1/core",
  ),
});

const expectedReceiverStandings = new Set([
  "byte_identical",
  "context_adapted",
  "reserve",
]);
const expectedActivationStandings = new Set([
  "eligible",
  "navigation_observation",
  "parity_review",
  "provenance_review",
  "reader_job_required",
  "visitor_copy_review",
]);
const supportedSandboxTokens = new Set(["allow-scripts"]);
const supportedPermissionsPolicyFeatures = new Set(["clipboard-write"]);
const supportedHeldCapabilities = new Set(["native-modals"]);
const expectedRouteAliases = new Map([
  ["core-architectures-pack", "/v1/core/"],
  ["poda", "/v1/core/poda/"],
  ["alignment-worksheet", "/v1/core/alignment-worksheet/"],
  ["impact-map", "/v1/core/impact-map/"],
  ["context-tree", "/v1/core/context-tree/"],
  ["strategy-canvas", "/v1/core/strategy-canvas/"],
  ["first-responsible-version-matrix", "/v1/core/first-responsible-version-matrix/"],
  ["cross-channel-blueprint", "/v1/core/cross-channel-blueprint/"],
  ["service-design-blueprint", "/v1/core/service-design-blueprint/"],
  ["ai-systems-service-blueprint", "/v1/core/ai-systems-service-blueprint/"],
  ["software-architecture-views", "/v1/core/software-architecture-views/"],
  ["participatory-design-kit", "/v1/core/participatory-design-kit/"],
  ["specification-by-example", "/v1/core/specification-by-example/"],
  ["heart-chart", "/v1/core/heart-chart/"],
  ["plus-delta", "/v1/core/plus-delta/"],
  ["practitioner-judgment-probes", "/v1/core/practitioner-judgment-probes/"],
  ["pattern-problem-surface-matrix", "/v1/core/pattern-problem-surface-matrix/"],
  ["jobs-to-be-done-treemap", "/v1/core/jobs-to-be-done-treemap/"],
  ["unit-test-first-design", "/v1/core/unit-test-first-design/"],
  ["upstream-revision-loop", "/v1/core/upstream-revision-loop/"],
  ["recovery-routing-atlas", "/v1/core/recovery-routing-atlas/"],
  ["core-architecture-family-index", "/v1/core/core-architecture-family-index/"],
]);
const resourceLinkRelationships = new Set([
  "apple-touch-icon",
  "icon",
  "manifest",
  "mask-icon",
  "modulepreload",
  "prefetch",
  "preload",
  "prerender",
  "stylesheet",
]);

function fail(message) {
  throw new Error(message);
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactString(value, expected, label) {
  if (value !== expected) {
    fail(`${label} must be ${JSON.stringify(expected)}; received ${JSON.stringify(value)}.`);
  }
}

function assertBoundedRelativePath(value, label, extension = null) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value === "." ||
    path.posix.isAbsolute(value) ||
    path.posix.normalize(value) !== value ||
    value.endsWith("/") ||
    value === ".." ||
    value.startsWith("../") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    fail(`${label} must be a normalized, bounded relative path; received ${JSON.stringify(value)}.`);
  }
  if (extension && !value.endsWith(extension)) {
    fail(`${label} must end with ${extension}; received ${JSON.stringify(value)}.`);
  }
  if (value.normalize("NFC") !== value) {
    fail(`${label} must use NFC-normalized path text; received ${JSON.stringify(value)}.`);
  }
  for (const segment of value.split("/")) {
    const stem = segment.split(".", 1)[0].toUpperCase();
    if (
      segment.length === 0 ||
      /[<>:"|?*]/.test(segment) ||
      /[ .]$/.test(segment) ||
      /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/.test(stem)
    ) {
      fail(`${label} contains a non-portable path segment: ${JSON.stringify(segment)}.`);
    }
  }
}

function portablePathKey(value) {
  return value.normalize("NFC").toLowerCase();
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertArrayMatchesSet(values, expected, label) {
  if (!Array.isArray(values)) {
    fail(`${label} must be an array.`);
  }
  const actual = new Set(values);
  if (
    actual.size !== values.length ||
    actual.size !== expected.size ||
    [...expected].some((value) => !actual.has(value))
  ) {
    fail(`${label} does not match the supported standing values.`);
  }
}

function assertSupportedStringArray(values, supported, label) {
  if (!Array.isArray(values)) {
    fail(`${label} must be an array.`);
  }
  const unique = new Set(values);
  if (
    unique.size !== values.length ||
    values.some((value) => typeof value !== "string" || !supported.has(value))
  ) {
    fail(`${label} must contain only unique supported values.`);
  }
  const sorted = [...values].sort(compareCodeUnits);
  if (values.some((value, index) => value !== sorted[index])) {
    fail(`${label} must use stable lexical order.`);
  }
}

function assertExactArray(actual, expected, label) {
  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    fail(
      `${label} must be ${JSON.stringify(expected)}; received ${JSON.stringify(actual)}.`,
    );
  }
}

function routeDirectory(contract, route) {
  if (route.public_alias === contract.base_path) {
    return "";
  }
  return route.public_alias
    .slice(contract.base_path.length)
    .replace(/\/$/, "");
}

function routeIndexPath(contract, route) {
  return path.posix.join(routeDirectory(contract, route), "index.html");
}

function packageFilesFor(route) {
  return route.package_files ?? [];
}

export function validateRouteContract(contract, sourceManifest) {
  if (!isObject(contract)) {
    fail("The public iframe route manifest must be a JSON object.");
  }
  if (!isObject(sourceManifest)) {
    fail("The Core source manifest must be a JSON object.");
  }

  assertExactString(contract.id, "core-architectures.public-iframe-routes.v1", "Route manifest id");
  assertExactString(contract.version, "1", "Route manifest version");
  assertExactString(contract.host, "iframes.vik.guru", "Route host");
  assertExactString(contract.base_path, "/v1/core/", "Route base path");
  assertExactString(
    contract.source_manifest,
    "core-architectures-chimeric-prototype-manifest-v0.1.json",
    "Source manifest filename",
  );

  if (!isObject(contract.projection_contract)) {
    fail("projection_contract must be an object.");
  }
  assertExactString(contract.projection_contract.entry_file, "index.html", "Projection entry file");
  assertExactString(
    contract.projection_contract.hub_source_manifest_file,
    "manifest.json",
    "Projected source manifest file",
  );
  assertExactString(
    contract.projection_contract.route_receipt_file,
    "route-manifest.json",
    "Projected route receipt file",
  );
  assertExactString(
    contract.projection_contract.html_closure,
    "single_file",
    "HTML closure posture",
  );
  assertExactString(
    contract.projection_contract.package_coupled_media,
    "inline_or_package_local",
    "Package-coupled media posture",
  );
  assertExactString(
    contract.projection_contract.neighboring_path_posture,
    "unmatched",
    "Neighboring path posture",
  );

  if (!isObject(contract.carrier_contract)) {
    fail("carrier_contract must be an object.");
  }
  assertExactString(
    contract.carrier_contract.title,
    "context_specific_non_empty",
    "Carrier title posture",
  );
  assertExactString(contract.carrier_contract.loading, "lazy", "Carrier loading posture");
  assertExactString(
    contract.carrier_contract.referrer_policy,
    "no-referrer",
    "Carrier referrer posture",
  );
  assertExactString(
    contract.carrier_contract.sandbox_posture,
    "exact_per_route_allowlist",
    "Carrier sandbox posture",
  );
  assertExactString(
    contract.carrier_contract.permissions_policy_posture,
    "exact_per_route_allowlist",
    "Carrier Permissions Policy posture",
  );
  assertExactString(
    contract.carrier_contract.held_capability_posture,
    "Source-visible capabilities remain ungranted until a route-local inline replacement removes the dependency.",
    "Carrier held-capability posture",
  );
  assertExactString(
    contract.carrier_contract.full_view_posture,
    "A carrier keeps a direct full-view route beside the embedded view.",
    "Carrier full-view posture",
  );

  assertArrayMatchesSet(
    contract.standing_values?.receiver,
    expectedReceiverStandings,
    "Receiver standing values",
  );
  assertArrayMatchesSet(
    contract.standing_values?.activation,
    expectedActivationStandings,
    "Activation standing values",
  );

  if (!Array.isArray(sourceManifest.prototypes) || sourceManifest.prototypes.length !== 21) {
    fail("The Core source manifest must contain exactly 21 current prototypes.");
  }
  if (sourceManifest.counts?.current_prototypes !== 21) {
    fail("The Core source manifest current_prototypes count must be 21.");
  }
  if (!Array.isArray(contract.routes) || contract.routes.length !== 22) {
    fail("The public iframe route manifest must contain exactly 22 primary routes.");
  }

  const sourceById = new Map();
  const sourceFiles = new Set();
  const portableSourceFiles = new Set();
  for (const entry of sourceManifest.prototypes) {
    if (!isObject(entry) || typeof entry.id !== "string") {
      fail("Every Core source manifest prototype must carry an id.");
    }
    if (sourceById.has(entry.id)) {
      fail(`Duplicate Core source id: ${entry.id}.`);
    }
    assertBoundedRelativePath(entry.file, `Core source file for ${entry.id}`, ".html");
    if (sourceFiles.has(entry.file)) {
      fail(`Duplicate Core source file: ${entry.file}.`);
    }
    const portableSourceFile = portablePathKey(entry.file);
    if (portableSourceFiles.has(portableSourceFile)) {
      fail(`Case- or Unicode-colliding Core source file: ${entry.file}.`);
    }
    if (entry.status !== "current" || entry.exists !== true) {
      fail(`Core source ${entry.id} must be current and declared present.`);
    }
    if (typeof entry.version !== "string" || entry.version.length === 0) {
      fail(`Core source ${entry.id} must carry a version.`);
    }
    if (!Number.isSafeInteger(entry.size_bytes) || entry.size_bytes <= 0) {
      fail(`Core source ${entry.id} must carry a positive integer size_bytes receipt.`);
    }
    sourceById.set(entry.id, entry);
    sourceFiles.add(entry.file);
    portableSourceFiles.add(portableSourceFile);
  }

  const routeIds = new Set();
  const routeFiles = new Set();
  const portableRouteFiles = new Set();
  const aliases = new Set();
  const foldedAliases = new Set();
  const decodedAliases = new Set();
  const portableOutputPaths = new Set(["manifest.json", "route-manifest.json"]);
  const prototypeIds = new Set();
  let hubCount = 0;
  if (!Array.isArray(contract.runtime_exclusions)) {
    fail("runtime_exclusions must be an array.");
  }
  const runtimeExclusions = new Set();
  for (const excluded of contract.runtime_exclusions) {
    assertBoundedRelativePath(excluded, "Runtime exclusion");
    if (runtimeExclusions.has(excluded)) {
      fail(`Duplicate runtime exclusion: ${excluded}.`);
    }
    runtimeExclusions.add(excluded);
  }

  for (const route of contract.routes) {
    if (!isObject(route) || typeof route.id !== "string" || route.id.length === 0) {
      fail("Every public iframe route must carry an id.");
    }
    if (routeIds.has(route.id)) {
      fail(`Duplicate public iframe route id: ${route.id}.`);
    }
    routeIds.add(route.id);

    if (typeof route.display_name !== "string" || route.display_name.length === 0) {
      fail(`Route ${route.id} must carry a display_name.`);
    }
    if (typeof route.reader_job !== "string" || route.reader_job.length === 0) {
      fail(`Route ${route.id} must carry a reader_job.`);
    }
    if (!expectedReceiverStandings.has(route.receiver_standing)) {
      fail(`Route ${route.id} has unsupported receiver standing ${route.receiver_standing}.`);
    }
    if (!expectedActivationStandings.has(route.activation_standing)) {
      fail(`Route ${route.id} has unsupported activation standing ${route.activation_standing}.`);
    }
    if (!isObject(route.carrier_policy)) {
      fail(`Route ${route.id} must carry a carrier_policy object.`);
    }
    assertSupportedStringArray(
      route.carrier_policy.sandbox_tokens,
      supportedSandboxTokens,
      `Route ${route.id} sandbox tokens`,
    );
    assertSupportedStringArray(
      route.carrier_policy.permissions_policy,
      supportedPermissionsPolicyFeatures,
      `Route ${route.id} Permissions Policy features`,
    );
    assertSupportedStringArray(
      route.carrier_policy.held_capabilities,
      supportedHeldCapabilities,
      `Route ${route.id} held capabilities`,
    );

    assertBoundedRelativePath(route.source_file, `Source file for route ${route.id}`, ".html");
    if (routeFiles.has(route.source_file)) {
      fail(`Duplicate route source file: ${route.source_file}.`);
    }
    const portableRouteFile = portablePathKey(route.source_file);
    if (portableRouteFiles.has(portableRouteFile)) {
      fail(`Case- or Unicode-colliding route source file: ${route.source_file}.`);
    }
    routeFiles.add(route.source_file);
    portableRouteFiles.add(portableRouteFile);

    if (
      typeof route.public_alias !== "string" ||
      !route.public_alias.startsWith(contract.base_path) ||
      !route.public_alias.endsWith("/") ||
      route.public_alias.includes("?") ||
      route.public_alias.includes("#") ||
      route.public_alias.includes("\\") ||
      route.public_alias.includes("//")
    ) {
      fail(`Route ${route.id} must use a normalized trailing-slash alias beneath ${contract.base_path}.`);
    }
    let decodedAlias;
    try {
      decodedAlias = decodeURIComponent(route.public_alias);
    } catch {
      fail(`Route ${route.id} contains an invalid percent-encoded alias.`);
    }
    if (decodedAlias !== route.public_alias) {
      fail(`Route ${route.id} must not use percent-encoding in its public alias.`);
    }
    const relativeAlias = routeDirectory(contract, route);
    if (relativeAlias && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(relativeAlias)) {
      fail(`Route ${route.id} must use one lowercase kebab-case segment beneath ${contract.base_path}.`);
    }
    const normalizedAlias = relativeAlias
      ? `${contract.base_path}${relativeAlias}/`
      : contract.base_path;
    if (normalizedAlias !== route.public_alias) {
      fail(`Route ${route.id} alias is not canonical: ${route.public_alias}.`);
    }
    const expectedAlias = expectedRouteAliases.get(route.id);
    if (!expectedAlias) {
      fail(`Route ${route.id} is not part of the pinned v1 alias population.`);
    }
    if (route.public_alias !== expectedAlias) {
      fail(
        `Route ${route.id} must retain its pinned v1 alias ${expectedAlias}; ` +
        `received ${route.public_alias}.`,
      );
    }
    if (aliases.has(route.public_alias)) {
      fail(`Duplicate public iframe alias: ${route.public_alias}.`);
    }
    const folded = portablePathKey(route.public_alias);
    if (foldedAliases.has(folded)) {
      fail(`Case-folded public iframe alias collision: ${route.public_alias}.`);
    }
    if (decodedAliases.has(decodedAlias)) {
      fail(`Decoded public iframe alias collision: ${route.public_alias}.`);
    }
    aliases.add(route.public_alias);
    foldedAliases.add(folded);
    decodedAliases.add(decodedAlias);

    const indexOutputPath = routeIndexPath(contract, route);
    const portableIndexOutputPath = portablePathKey(indexOutputPath);
    if (portableOutputPaths.has(portableIndexOutputPath)) {
      fail(`Route ${route.id} has a case- or Unicode-colliding package output ${indexOutputPath}.`);
    }
    portableOutputPaths.add(portableIndexOutputPath);

    if (route.kind === "hub") {
      hubCount += 1;
      if (route.public_alias !== contract.base_path) {
        fail("The hub route must occupy the exact base path.");
      }
      if (route.source_file !== "core-architectures-chimeric-prototype-pack-index-v0.1.html") {
        fail("The hub route must name the current Core pack index.");
      }
      if (route.source_version !== "0.1") {
        fail("The hub route must name source version 0.1.");
      }
    } else if (route.kind === "prototype") {
      const source = sourceById.get(route.id);
      if (!source) {
        fail(`Prototype route ${route.id} is absent from the Core source manifest.`);
      }
      if (prototypeIds.has(route.id)) {
        fail(`Duplicate prototype route id: ${route.id}.`);
      }
      prototypeIds.add(route.id);
      if (route.source_file !== source.file || route.source_version !== source.version) {
        fail(
          `Prototype route ${route.id} does not match source identity ${source.file} at ${source.version}.`,
        );
      }
    } else {
      fail(`Route ${route.id} has unsupported kind ${JSON.stringify(route.kind)}.`);
    }

    if (!Array.isArray(packageFilesFor(route))) {
      fail(`Route ${route.id} package_files must be an array when present.`);
    }
    const targetFiles = new Set(["index.html"]);
    const portableTargetFiles = new Set(["index.html"]);
    const portablePackageSources = new Set();
    for (const entry of packageFilesFor(route)) {
      if (!isObject(entry)) {
        fail(`Route ${route.id} package_files entries must be objects.`);
      }
      assertBoundedRelativePath(entry.source_file, `Package source for route ${route.id}`);
      assertBoundedRelativePath(entry.target_file, `Package target for route ${route.id}`);
      if (runtimeExclusions.has(entry.source_file)) {
        fail(`Route ${route.id} package source is a runtime exclusion: ${entry.source_file}.`);
      }
      if (targetFiles.has(entry.target_file)) {
        fail(`Route ${route.id} has duplicate or reserved package target ${entry.target_file}.`);
      }
      const portableSource = portablePathKey(entry.source_file);
      if (portablePackageSources.has(portableSource)) {
        fail(`Route ${route.id} has a case- or Unicode-colliding package source ${entry.source_file}.`);
      }
      const portableTarget = portablePathKey(entry.target_file);
      if (portableTargetFiles.has(portableTarget)) {
        fail(`Route ${route.id} has a case- or Unicode-colliding package target ${entry.target_file}.`);
      }
      if (
        route.kind === "hub" &&
        ["manifest.json", "route-manifest.json"].includes(entry.target_file)
      ) {
        fail(`Route ${route.id} package target is reserved by the route package: ${entry.target_file}.`);
      }
      const packageOutputPath = path.posix.join(routeDirectory(contract, route), entry.target_file);
      const portablePackageOutputPath = portablePathKey(packageOutputPath);
      if (portableOutputPaths.has(portablePackageOutputPath)) {
        fail(
          `Route ${route.id} has a case- or Unicode-colliding package output ${packageOutputPath}.`,
        );
      }
      if (
        typeof entry.content_type !== "string" ||
        !/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i.test(entry.content_type)
      ) {
        fail(`Route ${route.id} package target ${entry.target_file} needs an explicit content_type.`);
      }
      targetFiles.add(entry.target_file);
      portableTargetFiles.add(portableTarget);
      portablePackageSources.add(portableSource);
      portableOutputPaths.add(portablePackageOutputPath);
    }
  }

  if (hubCount !== 1) {
    fail(`The public iframe route manifest must contain one hub; received ${hubCount}.`);
  }
  if (prototypeIds.size !== 21) {
    fail(`The public iframe route manifest must contain 21 prototype routes; received ${prototypeIds.size}.`);
  }
  for (const id of sourceById.keys()) {
    if (!prototypeIds.has(id)) {
      fail(`Core source ${id} is missing from the public iframe route manifest.`);
    }
  }

  if (!Array.isArray(contract.compatibility_aliases) || contract.compatibility_aliases.length !== 1) {
    fail("compatibility_aliases must contain the one resting Strategy Canvas alias.");
  }
  const [compatibilityAlias] = contract.compatibility_aliases;
  if (!isObject(compatibilityAlias)) {
    fail("The resting Strategy Canvas compatibility alias must be an object.");
  }
  assertExactString(compatibilityAlias.id, "strategy-canvas-v0.1.1", "Compatibility alias id");
  assertExactString(
    compatibilityAlias.source_file,
    "strategy-canvas-chimeric-prototype-v0.1.1.html",
    "Compatibility alias source",
  );
  assertExactString(
    compatibilityAlias.proposed_alias,
    "/v1/core/strategy-canvas/v0.1.1/",
    "Compatibility alias route",
  );
  assertExactString(
    compatibilityAlias.standing,
    "resting_optional_migration_alias",
    "Compatibility alias standing",
  );
  if (compatibilityAlias.generated !== false) {
    fail("The Strategy Canvas compatibility alias must remain explicitly non-generated.");
  }
  if (!sourceById.get("strategy-canvas").previous?.includes(compatibilityAlias.source_file)) {
    fail("The Strategy Canvas compatibility source must remain in its declared source history.");
  }

  return true;
}

export async function assertRegularFile(filePath, label = "File") {
  const status = await lstat(filePath);
  if (status.isSymbolicLink() || !status.isFile()) {
    fail(`${label} must resolve to a regular file: ${filePath}`);
  }
  return status;
}

function attributeValue(tag, attributeName) {
  const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(
    new RegExp(`(?:^|\\s)${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

export function observeIframeRuntimeCapabilities(html) {
  if (typeof html !== "string") {
    fail("Iframe runtime capability observation requires HTML text.");
  }

  const executableBodies = [];
  let executableScripts = false;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const type = (attributeValue(match[1], "type") ?? "").trim().toLowerCase();
    if (["application/json", "application/ld+json", "importmap", "speculationrules"].includes(type)) {
      continue;
    }
    const isJavaScript =
      type === "" ||
      type === "module" ||
      /^(?:text|application)\/(?:x-)?(?:java|ecma)script(?:[0-9.]*)$/.test(type);
    if (!isJavaScript) {
      fail(`Iframe runtime observation encountered an unsupported script type: ${type}.`);
    }
    executableScripts = true;
    executableBodies.push(match[2]);
  }

  const executableSource = executableBodies.join("\n");
  const capabilities = [];
  if (executableScripts) capabilities.push("executable-scripts");
  if (/\bnavigator\.clipboard\b[\s\S]{0,120}?\bwriteText\s*\(/.test(executableSource)) {
    capabilities.push("clipboard-write");
  }
  if (/(?:^|[^\w.])(?:(?:window|globalThis)\.)?(?:alert|confirm|prompt)\s*\(/m.test(executableSource)) {
    capabilities.push("native-modals");
  }
  return capabilities;
}

function validateCarrierPolicyAgainstCapabilities(route, capabilities) {
  const observed = new Set(capabilities);
  const expectedSandbox = observed.has("executable-scripts") ? ["allow-scripts"] : [];
  const expectedPermissions = observed.has("clipboard-write") ? ["clipboard-write"] : [];
  const expectedHeld = observed.has("native-modals") ? ["native-modals"] : [];

  assertExactArray(
    route.carrier_policy.sandbox_tokens,
    expectedSandbox,
    `Route ${route.id} sandbox tokens for observed runtime`,
  );
  assertExactArray(
    route.carrier_policy.permissions_policy,
    expectedPermissions,
    `Route ${route.id} Permissions Policy for observed runtime`,
  );
  assertExactArray(
    route.carrier_policy.held_capabilities,
    expectedHeld,
    `Route ${route.id} held capabilities for observed runtime`,
  );
}

function srcsetReferences(value) {
  const references = [];
  let index = 0;
  while (index < value.length) {
    while (index < value.length && /[\s,]/.test(value[index])) index += 1;
    if (index >= value.length) break;
    const start = index;
    const isData = value.slice(index, index + 5).toLowerCase() === "data:";
    while (
      index < value.length &&
      !/\s/.test(value[index]) &&
      (isData || value[index] !== ",")
    ) {
      index += 1;
    }
    const reference = value.slice(start, index);
    if (reference) references.push(reference);
    while (index < value.length && value[index] !== ",") index += 1;
    if (value[index] === ",") index += 1;
  }
  return references;
}

function classifyResourceReference(reference, baseDirectory = "") {
  const value = reference.trim();
  if (
    value.length === 0 ||
    value.startsWith("#") ||
    value.toLowerCase().startsWith("data:") ||
    value.toLowerCase() === "about:blank"
  ) {
    return { kind: "inline" };
  }
  if (value.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return { kind: "outside", value };
  }
  if (value.startsWith("/")) {
    return { kind: "outside", value };
  }

  const pathname = value.split(/[?#]/, 1)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { kind: "invalid", value };
  }
  const normalized = path.posix.normalize(path.posix.join(baseDirectory, decoded));
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    path.posix.isAbsolute(normalized) ||
    normalized.includes("\\")
  ) {
    return { kind: "outside", value };
  }
  return { kind: "package", value, target: normalized.replace(/^\.\//, "") };
}

function styleReferences(text) {
  const references = [];
  for (const match of text.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s][^)]*))\s*\)/gi)) {
    references.push({ tag: "style", attribute: "url", reference: match[1] ?? match[2] ?? match[3] });
  }
  for (const match of text.matchAll(/@import\s+(?:url\(\s*)?(?:"([^"]*)"|'([^']*)')/gi)) {
    references.push({ tag: "style", attribute: "@import", reference: match[1] ?? match[2] });
  }
  return references;
}

function resolveResourceReferences(
  references,
  targets,
  label,
  { baseDirectory = "", requireAllTargets = true } = {},
) {
  const usedPackageTargets = new Set();
  let inlineReferences = 0;
  for (const observation of references) {
    const classification = classifyResourceReference(observation.reference, baseDirectory);
    if (classification.kind === "inline") {
      inlineReferences += 1;
      continue;
    }
    if (classification.kind !== "package") {
      fail(
        `${label} references a resource outside its package closure: ${observation.reference} ` +
        `(${observation.tag} ${observation.attribute}).`,
      );
    }
    if (!targets.has(classification.target)) {
      fail(
        `${label} references undeclared package resource ${classification.target} ` +
        `(${observation.tag} ${observation.attribute}).`,
      );
    }
    usedPackageTargets.add(classification.target);
  }

  if (requireAllTargets) {
    const unusedTargets = [...targets].filter((target) => !usedPackageTargets.has(target));
    if (unusedTargets.length) {
      fail(`${label} declares package resources that its document does not use: ${unusedTargets.join(", ")}.`);
    }
  }
  return {
    inline_references: inlineReferences,
    package_targets: [...usedPackageTargets].sort(),
  };
}

export function scanHtmlClosure(
  html,
  declaredPackageTargets = new Set(),
  label = "HTML artifact",
  options = {},
) {
  if (typeof html !== "string") {
    fail(`${label} must be supplied as text.`);
  }
  const targets = new Set(declaredPackageTargets);
  const references = [];

  if (/<base\b/i.test(html)) {
    fail(`${label} must not use a base element because it changes route resolution.`);
  }
  if (/<meta\b[^>]*http-equiv\s*=\s*["']?refresh\b/i.test(html)) {
    fail(`${label} must not use a meta refresh route.`);
  }

  const tags = html.match(/<(?:script|link|img|source|iframe|audio|video|track|object|embed|input|image|feimage|use)\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const tagName = tag.match(/^<\s*([a-z0-9:-]+)/i)?.[1]?.toLowerCase();
    const add = (attributeName, splitSrcset = false) => {
      const value = attributeValue(tag, attributeName);
      if (value === null) return;
      const values = splitSrcset ? srcsetReferences(value) : [value];
      for (const reference of values) {
        references.push({ tag: tagName, attribute: attributeName, reference });
      }
    };

    if (tagName === "script") add("src");
    if (tagName === "link") {
      const relationships = (attributeValue(tag, "rel") ?? "")
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      if (relationships.some((relationship) => resourceLinkRelationships.has(relationship))) {
        add("href");
        add("imagesrcset", true);
      }
    }
    if (tagName === "img") {
      add("src");
      add("srcset", true);
    }
    if (tagName === "source") {
      add("src");
      add("srcset", true);
    }
    if (["iframe", "audio", "track", "embed"].includes(tagName)) add("src");
    if (tagName === "video") {
      add("src");
      add("poster");
    }
    if (tagName === "object") add("data");
    if (tagName === "input" && (attributeValue(tag, "type") ?? "").toLowerCase() === "image") {
      add("src");
    }
    if (["image", "feimage", "use"].includes(tagName)) {
      add("href");
      add("xlink:href");
    }
  }

  references.push(...styleReferences(html));

  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (attributeValue(match[1], "src") !== null) continue;
    const script = match[2];
    const networkPrimitives = [
      /\bfetch\s*\(/,
      /\bimport\s*\(/,
      /\bnew\s+(?:(?:window|globalThis)\.)?XMLHttpRequest\b/,
      /\bnew\s+(?:(?:window|globalThis)\.)?EventSource\b/,
      /\bnew\s+(?:(?:window|globalThis)\.)?WebSocket\b/,
      /\bnew\s+(?:(?:window|globalThis)\.)?(?:Shared)?Worker\b/,
      /\bnew\s+(?:(?:window|globalThis)\.)?(?:Image|Audio|WebTransport)\s*\(/,
      /\bimportScripts\s*\(/,
      /\bnavigator\.serviceWorker\.register\s*\(/,
      /\bnavigator\.sendBeacon\s*\(/,
      /\bdocument\.createElement\s*\(\s*["'](?:img|iframe|link|source|video|audio|track|object|embed)["']/i,
      /\bdocument\.(?:write|writeln)\s*\(/,
      /\.(?:src|srcset|poster)\s*=/,
      /\.setAttribute\s*\(\s*["'](?:src|srcset|poster|data)["']/i,
    ];
    const detected = networkPrimitives.find((pattern) => pattern.test(script));
    if (detected) {
      fail(`${label} uses a runtime network primitive (${detected.source}).`);
    }
  }

  return resolveResourceReferences(references, targets, label, options);
}

function scanCssClosure(css, declaredPackageTargets, label, options = {}) {
  if (typeof css !== "string") fail(`${label} must be supplied as text.`);
  return resolveResourceReferences(
    styleReferences(css),
    new Set(declaredPackageTargets),
    label,
    options,
  );
}

export function scanPackageClosure(html, packageReadings, label = "HTML artifact") {
  const targets = new Set(packageReadings.keys());
  const root = scanHtmlClosure(html, targets, label, { requireAllTargets: false });
  const reachable = new Set(root.package_targets);
  const queue = [...reachable];
  let inlineReferences = root.inline_references;

  while (queue.length) {
    const target = queue.shift();
    const reading = packageReadings.get(target);
    if (!reading) fail(`${label} has no package reading for ${target}.`);
    const contentType = reading.contentType.toLowerCase();
    const text = reading.bytes.toString("utf8");
    const baseDirectory = path.posix.dirname(target) === "." ? "" : path.posix.dirname(target);
    let nested = { inline_references: 0, package_targets: [] };

    if (["text/html", "application/xhtml+xml", "image/svg+xml"].includes(contentType)) {
      nested = scanHtmlClosure(text, targets, `${label} package file ${target}`, {
        baseDirectory,
        requireAllTargets: false,
      });
    } else if (contentType === "text/css") {
      nested = scanCssClosure(text, targets, `${label} package file ${target}`, {
        baseDirectory,
        requireAllTargets: false,
      });
    } else if (
      contentType.includes("javascript") ||
      contentType === "application/ecmascript" ||
      contentType === "text/ecmascript"
    ) {
      fail(`${label} package file ${target} is executable code; this media tranche keeps JavaScript inline.`);
    }

    inlineReferences += nested.inline_references;
    for (const nestedTarget of nested.package_targets) {
      if (!reachable.has(nestedTarget)) {
        reachable.add(nestedTarget);
        queue.push(nestedTarget);
      }
    }
  }

  const unusedTargets = [...targets].filter((target) => !reachable.has(target));
  if (unusedTargets.length) {
    fail(`${label} declares package resources outside its reachable closure: ${unusedTargets.join(", ")}.`);
  }
  return {
    inline_references: inlineReferences,
    package_targets: [...reachable].sort(),
  };
}

function replaceSingleHref(html, sourceHref, projectedHref, label) {
  const escaped = sourceHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(`(\\shref\\s*=\\s*)(["'])${escaped}\\2`, "g");
  let replacements = 0;
  const rewritten = html.replace(expression, (_match, prefix, quote) => {
    replacements += 1;
    return `${prefix}${quote}${projectedHref}${quote}`;
  });
  if (replacements !== 1) {
    fail(`${label} expected one href for ${sourceHref}; received ${replacements}.`);
  }
  return rewritten;
}

export function rewriteHub(html, contract) {
  let projected = html;
  for (const route of contract.routes.filter(({ kind }) => kind === "prototype")) {
    projected = replaceSingleHref(
      projected,
      route.source_file,
      `./${routeDirectory(contract, route)}/`,
      "Core pack hub",
    );
  }
  projected = replaceSingleHref(
    projected,
    contract.source_manifest,
    "./manifest.json",
    "Core pack hub",
  );
  return projected;
}

function extractAnchorHrefs(html) {
  const hrefs = [];
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attributeValue(match[0], "href");
    if (href !== null) hrefs.push(href.trim());
  }
  return hrefs;
}

export function navigationObservation(html, routeRelativeDirectory, expectedOutputPaths, basePath) {
  let packagedLinks = 0;
  let fragmentLinks = 0;
  let externalLinks = 0;
  const unresolved = new Map();

  for (const href of extractAnchorHrefs(html)) {
    if (!href || href.startsWith("#")) {
      fragmentLinks += 1;
      continue;
    }
    if (href.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(href)) {
      externalLinks += 1;
      continue;
    }

    const rawPath = href.split(/[?#]/, 1)[0];
    let decodedPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      unresolved.set(href, "invalid-percent-encoding");
      continue;
    }

    let projectedTarget;
    if (decodedPath.startsWith("/")) {
      if (!decodedPath.startsWith(basePath)) {
        fail(`Route navigation escapes ${basePath}: ${href}.`);
      }
      projectedTarget = decodedPath.slice(basePath.length);
    } else {
      projectedTarget = path.posix.normalize(
        path.posix.join(routeRelativeDirectory, decodedPath || "."),
      );
    }
    if (projectedTarget === ".." || projectedTarget.startsWith("../")) {
      fail(`Route navigation escapes ${basePath}: ${href}.`);
    }
    if (projectedTarget === ".") projectedTarget = "";
    if (decodedPath.endsWith("/") || projectedTarget === "") {
      projectedTarget = path.posix.join(projectedTarget, "index.html");
    }
    projectedTarget = projectedTarget.replace(/^\.\//, "");

    if (expectedOutputPaths.has(projectedTarget)) {
      packagedLinks += 1;
    } else {
      unresolved.set(href, projectedTarget);
    }
  }

  return {
    packaged_links: packagedLinks,
    fragment_links: fragmentLinks,
    external_links: externalLinks,
    unresolved_local_links: [...unresolved.entries()]
      .map(([href, projected_target]) => ({ href, projected_target }))
      .sort((left, right) => compareCodeUnits(left.href, right.href)),
  };
}

export async function assertRegularFileWithin(root, filePath, label) {
  const resolvedRoot = path.resolve(root);
  const resolvedFile = path.resolve(filePath);
  if (!resolvedFile.startsWith(`${resolvedRoot}${path.sep}`)) {
    fail(`${label} must remain inside ${resolvedRoot}: ${resolvedFile}.`);
  }
  const rootStatus = await lstat(resolvedRoot);
  if (rootStatus.isSymbolicLink() || !rootStatus.isDirectory()) {
    fail(`Source root must be a regular directory: ${resolvedRoot}.`);
  }
  const canonicalRoot = await realpath(resolvedRoot);
  const relative = path.relative(resolvedRoot, resolvedFile);
  let cursor = resolvedRoot;
  for (const component of relative.split(path.sep)) {
    cursor = path.join(cursor, component);
    const status = await lstat(cursor);
    if (status.isSymbolicLink()) {
      fail(`${label} path must not traverse a symbolic link: ${cursor}.`);
    }
  }
  await assertRegularFile(resolvedFile, label);
  const canonicalFile = await realpath(resolvedFile);
  if (!canonicalFile.startsWith(`${canonicalRoot}${path.sep}`)) {
    fail(`${label} resolves outside its source root: ${resolvedFile}.`);
  }
}

async function readJsonFile(root, filePath, label) {
  await assertRegularFileWithin(root, filePath, label);
  const bytes = await readFile(filePath);
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error instanceof Error ? error.message : error}`);
  }
  return { bytes, value };
}

export async function createPackagePlan(options = {}) {
  const paths = { ...defaultPaths, ...options };
  const [routeManifestReading, sourceManifestReading] = await Promise.all([
    readJsonFile(paths.sourceRoot, paths.routeManifestPath, "Public iframe route manifest"),
    readJsonFile(paths.sourceRoot, paths.sourceManifestPath, "Core source manifest"),
  ]);
  const contract = routeManifestReading.value;
  const sourceManifest = sourceManifestReading.value;
  validateRouteContract(contract, sourceManifest);
  for (const compatibilityAlias of contract.compatibility_aliases) {
    await assertRegularFileWithin(
      paths.sourceRoot,
      path.join(paths.sourceRoot, compatibilityAlias.source_file),
      `Compatibility source for ${compatibilityAlias.id}`,
    );
  }

  const outputFiles = new Map([["manifest.json", sourceManifestReading.bytes]]);
  const portablePlannedOutputPaths = new Set(["manifest.json", "route-manifest.json"]);
  const reservedOutputPaths = new Set(["manifest.json", "route-manifest.json"]);
  const sourceById = new Map(sourceManifest.prototypes.map((entry) => [entry.id, entry]));
  const routeReadings = [];
  for (const route of contract.routes) {
    const sourcePath = path.join(paths.sourceRoot, route.source_file);
    await assertRegularFileWithin(paths.sourceRoot, sourcePath, `HTML source for route ${route.id}`);
    const sourceBytes = await readFile(sourcePath);
    const sourceText = sourceBytes.toString("utf8");
    const runtimeCapabilities = observeIframeRuntimeCapabilities(sourceText);
    validateCarrierPolicyAgainstCapabilities(route, runtimeCapabilities);
    const projectionText = route.kind === "hub" ? rewriteHub(sourceText, contract) : sourceText;
    const projectionBytes = route.kind === "hub"
      ? Buffer.from(projectionText, "utf8")
      : sourceBytes;
    if (route.kind === "prototype" && sourceBytes.byteLength !== sourceById.get(route.id).size_bytes) {
      fail(
        `HTML source for route ${route.id} has ${sourceBytes.byteLength} bytes; ` +
        `the Core source manifest records ${sourceById.get(route.id).size_bytes}.`,
      );
    }
    const routeOutputDirectory = routeDirectory(contract, route);
    const indexOutputPath = routeIndexPath(contract, route);
    const portableIndexOutputPath = portablePathKey(indexOutputPath);
    if (
      reservedOutputPaths.has(indexOutputPath) ||
      outputFiles.has(indexOutputPath) ||
      portablePlannedOutputPaths.has(portableIndexOutputPath)
    ) {
      fail(`Output collision at ${indexOutputPath}.`);
    }
    outputFiles.set(indexOutputPath, projectionBytes);
    portablePlannedOutputPaths.add(portableIndexOutputPath);

    const packageReceipts = [];
    const packageReadings = new Map();
    for (const packageFile of packageFilesFor(route)) {
      const packageSourcePath = path.join(paths.sourceRoot, packageFile.source_file);
      await assertRegularFileWithin(
        paths.sourceRoot,
        packageSourcePath,
        `Package source for route ${route.id}`,
      );
      const packageBytes = await readFile(packageSourcePath);
      const packageOutputPath = path.posix.join(routeOutputDirectory, packageFile.target_file);
      const portablePackageOutputPath = portablePathKey(packageOutputPath);
      if (
        reservedOutputPaths.has(packageOutputPath) ||
        outputFiles.has(packageOutputPath) ||
        portablePlannedOutputPaths.has(portablePackageOutputPath)
      ) {
        fail(`Output collision at ${packageOutputPath}.`);
      }
      outputFiles.set(packageOutputPath, packageBytes);
      portablePlannedOutputPaths.add(portablePackageOutputPath);
      packageReadings.set(packageFile.target_file, {
        bytes: packageBytes,
        contentType: packageFile.content_type,
      });
      packageReceipts.push({
        source_file: packageFile.source_file,
        target_file: packageFile.target_file,
        content_type: packageFile.content_type,
        bytes: packageBytes.byteLength,
        sha256: sha256(packageBytes),
      });
    }
    const closure = scanPackageClosure(projectionText, packageReadings, `Route ${route.id}`);

    routeReadings.push({
      route,
      routeOutputDirectory,
      indexOutputPath,
      sourceBytes,
      projectionBytes,
      closure,
      runtimeCapabilities,
      packageReceipts,
    });
  }

  const expectedOutputPaths = new Set([...outputFiles.keys(), "route-manifest.json"]);

  const routeReceipts = routeReadings.map((reading) => {
    const navigation = navigationObservation(
      reading.projectionBytes.toString("utf8"),
      reading.routeOutputDirectory,
      expectedOutputPaths,
      contract.base_path,
    );
    if (
      reading.route.activation_standing === "eligible" &&
      navigation.unresolved_local_links.length > 0
    ) {
      fail(
        `Eligible route ${reading.route.id} has unresolved local navigation: ` +
        navigation.unresolved_local_links.map(({ href }) => href).join(", "),
      );
    }
    return {
      id: reading.route.id,
      public_alias: reading.route.public_alias,
      source_file: reading.route.source_file,
      source_version: reading.route.source_version,
      receiver_standing: reading.route.receiver_standing,
      activation_standing: reading.route.activation_standing,
      activation_eligible: reading.route.activation_standing === "eligible",
      carrier_policy: reading.route.carrier_policy,
      observed_runtime_capabilities: reading.runtimeCapabilities,
      projection_file: reading.indexOutputPath,
      projection_kind: reading.route.kind === "hub" ? "navigation_adapted" : "source_identical",
      source_bytes: reading.sourceBytes.byteLength,
      source_sha256: sha256(reading.sourceBytes),
      projection_bytes: reading.projectionBytes.byteLength,
      projection_sha256: sha256(reading.projectionBytes),
      static_resource_closure: {
        inline_references: reading.closure.inline_references,
        package_files: reading.packageReceipts,
      },
      navigation,
    };
  });

  const generatedFileCount = outputFiles.size + 1;
  const receipt = {
    id: "core-architectures.iframe-route-package-receipt.v1",
    version: "1",
    host: contract.host,
    base_path: contract.base_path,
    route_contract: {
      file: path.basename(paths.routeManifestPath),
      sha256: sha256(routeManifestReading.bytes),
    },
    source_manifest: {
      file: "manifest.json",
      source_file: path.basename(paths.sourceManifestPath),
      sha256: sha256(sourceManifestReading.bytes),
    },
    package_contract: {
      primary_routes: routeReceipts.length,
      prototype_routes: routeReceipts.filter(({ projection_kind }) => projection_kind === "source_identical").length,
      generated_files: generatedFileCount,
      compatibility_aliases_generated: false,
      live_cloudflare_mutation: false,
      closure_observation: "static_resource_graph",
      browser_request_observation_required: true,
      neighboring_path_posture: contract.projection_contract.neighboring_path_posture,
    },
    routes: routeReceipts,
    resting_compatibility_aliases: contract.compatibility_aliases,
  };
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  outputFiles.set("route-manifest.json", receiptBytes);

  return {
    contract,
    sourceManifest,
    receipt,
    outputFiles,
    outputCoreRoot: paths.outputCoreRoot,
  };
}

export async function listRegularFiles(directory, relativeDirectory = "") {
  if (relativeDirectory === "") {
    const rootStatus = await lstat(directory);
    if (rootStatus.isSymbolicLink() || !rootStatus.isDirectory()) {
      fail(`Generated iframe package root must be a regular directory: ${directory}.`);
    }
  }
  const entries = await readdir(path.join(directory, relativeDirectory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isSymbolicLink()) {
      fail(`Generated iframe package contains a symbolic link: ${relativePath}.`);
    }
    if (entry.isDirectory()) {
      files.push(...await listRegularFiles(directory, relativePath));
      continue;
    }
    if (!entry.isFile()) {
      fail(`Generated iframe package contains a non-file entry: ${relativePath}.`);
    }
    files.push(relativePath);
  }
  return files.sort();
}

export async function writePackagePlan(plan, outputCoreRoot) {
  for (const [relativePath, bytes] of [...plan.outputFiles.entries()].sort(([left], [right]) => compareCodeUnits(left, right))) {
    const outputPath = path.join(outputCoreRoot, relativePath);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, bytes, { flag: "wx" });
  }
}

export async function verifyPackagePlan(plan, outputCoreRoot) {
  const expectedFiles = [...plan.outputFiles.keys()].sort();
  const actualFiles = await listRegularFiles(outputCoreRoot);
  const missing = expectedFiles.filter((file) => !actualFiles.includes(file));
  const extra = actualFiles.filter((file) => !expectedFiles.includes(file));
  if (missing.length || extra.length) {
    fail([
      "Generated iframe package differs from its exact allowlist.",
      missing.length ? `Missing: ${missing.join(", ")}` : "",
      extra.length ? `Extra: ${extra.join(", ")}` : "",
    ].filter(Boolean).join("\n"));
  }

  let totalBytes = 0;
  for (const [relativePath, expectedBytes] of plan.outputFiles) {
    const outputPath = path.join(outputCoreRoot, relativePath);
    await assertRegularFile(outputPath, "Generated iframe package file");
    const actualBytes = await readFile(outputPath);
    if (!actualBytes.equals(expectedBytes)) {
      fail(`Generated iframe package file differs from its plan: ${relativePath}.`);
    }
    totalBytes += actualBytes.byteLength;
  }
  return { files: actualFiles.length, bytes: totalBytes };
}

async function ensureRegularDirectory(directory) {
  try {
    const status = await lstat(directory);
    if (status.isSymbolicLink() || !status.isDirectory()) {
      fail(`Iframe package path must be a regular directory: ${directory}.`);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await mkdir(directory);
  }
}

async function ensureBoundedDirectories(root, relativeDirectory) {
  await ensureRegularDirectory(root);
  let cursor = root;
  for (const component of relativeDirectory.split(path.posix.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    await ensureRegularDirectory(cursor);
  }
}

export async function assertOwnedPackageDirectory(directory) {
  const status = await lstat(directory);
  if (status.isSymbolicLink() || !status.isDirectory()) {
    fail(`Existing iframe package destination is not a regular directory: ${directory}.`);
  }
  const receiptPath = path.join(directory, "route-manifest.json");
  await assertRegularFile(receiptPath, "Existing iframe package ownership receipt");
  let receipt;
  try {
    receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  } catch (error) {
    fail(
      `Existing iframe package ownership receipt is invalid: ` +
      `${error instanceof Error ? error.message : error}`,
    );
  }
  if (
    receipt.id !== "core-architectures.iframe-route-package-receipt.v1" ||
    receipt.host !== "iframes.vik.guru" ||
    receipt.base_path !== "/v1/core/"
  ) {
    fail(`Existing iframe package destination is not owned by this builder: ${directory}.`);
  }
  return receipt;
}

async function persistPackage(plan, destination) {
  const buildRoot = path.resolve(destination, "../../..");
  const expectedBuildRoot = path.join(repositoryRoot, ".iframe-route-build");
  if (buildRoot !== expectedBuildRoot || destination !== defaultPaths.outputCoreRoot) {
    fail(`Refusing an unexpected persistent iframe package destination: ${destination}.`);
  }
  await ensureBoundedDirectories(repositoryRoot, ".iframe-route-build/iframes.vik.guru/v1");
  const transaction = await mkdtemp(path.join(buildRoot, ".core-transaction-"));
  const stage = path.join(transaction, "next");
  const previous = path.join(transaction, "previous");
  let movedPrevious = false;
  let preserveTransaction = false;

  try {
    await mkdir(stage);
    await writePackagePlan(plan, stage);
    const verification = await verifyPackagePlan(plan, stage);
    try {
      await assertOwnedPackageDirectory(destination);
      await rename(destination, previous);
      movedPrevious = true;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    try {
      await rename(stage, destination);
    } catch (error) {
      if (movedPrevious) {
        try {
          await rename(previous, destination);
        } catch (restoreError) {
          preserveTransaction = true;
          fail(
            `Iframe package replacement failed and its prior generation could not be restored. ` +
            `Recovery directory: ${transaction}. Restore error: ` +
            `${restoreError instanceof Error ? restoreError.message : restoreError}.`,
          );
        }
      }
      throw error;
    }
    await rm(transaction, { recursive: true, force: true });
    return verification;
  } catch (error) {
    if (!preserveTransaction) {
      await rm(transaction, { recursive: true, force: true });
    }
    throw error;
  }
}

async function checkWithoutPersisting(plan) {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "core-iframe-route-check-"));
  try {
    await writePackagePlan(plan, temporaryRoot);
    return await verifyPackagePlan(plan, temporaryRoot);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--check")) {
    fail(`Usage: node ${path.relative(repositoryRoot, toolPath)} [--check]`);
  }
  const plan = await createPackagePlan();
  const checkOnly = args[0] === "--check";
  const verification = checkOnly
    ? await checkWithoutPersisting(plan)
    : await persistPackage(plan, defaultPaths.outputCoreRoot);
  const destination = checkOnly
    ? "temporary verification directory (not persisted)"
    : path.relative(repositoryRoot, defaultPaths.outputCoreRoot);
  console.log([
    `Core iframe route package ${checkOnly ? "verified" : "built"}: ${plan.receipt.package_contract.primary_routes} routes, ${verification.files} files, ${verification.bytes} bytes.`,
    `Destination: ${destination}.`,
    "Live Cloudflare mutation: none.",
  ].join("\n"));
}

if (process.argv[1] && path.resolve(process.argv[1]) === toolPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

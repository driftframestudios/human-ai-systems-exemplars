import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import visitorBoundaryContract from "../context-canvas-project-surface/context-canvas/visitor-boundary-contract.js";
import {
  artifactAttribution,
  artifactAuthor,
  artifactLicense,
} from "./attribution-contract.mjs";
import {
  assertRegularFileWithin,
  navigationObservation,
  observeIframeRuntimeCapabilities,
  scanPackageClosure,
  sha256,
} from "./iframe-route-package-engine.mjs";

const toolPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(toolPath), "..");
const canvasFamilyRoot = path.join(repositoryRoot, "iframe-route-families/canvas");
const supportedReceiverStandings = new Set(["byte_identical", "context_adapted"]);
const supportedActivationStandings = new Set(["eligible"]);
const supportedProjectionKinds = new Set([
  "byte_identical",
  "decorated_copy",
  "decorated_rewrite",
]);
const supportedSandboxTokens = new Set([
  "allow-downloads",
  "allow-modals",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
  "allow-scripts",
]);
const supportedPermissionsPolicyFeatures = new Set(["clipboard-write"]);
const canonicalContentTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css"],
  [".gif", "image/gif"],
  [".htm", "text/html"],
  [".html", "text/html"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".json", "application/json"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

export const canvasDefaultPaths = Object.freeze({
  repositoryRoot,
  routeManifestPath: path.join(
    canvasFamilyRoot,
    "public-iframe-route-manifest-v1.json",
  ),
  outputCanvasRoot: path.join(
    repositoryRoot,
    ".iframe-route-build/iframes.vik.guru/v1/canvas",
  ),
});

const visitorBoundaryStyle = `<style data-canary-stack-css>
.visitor-boundary{border-block-start:1px solid currentColor;box-sizing:border-box;display:grid;flex:1 0 100%;gap:.75rem;grid-column:1/-1;inline-size:100%;margin:clamp(1.5rem,4vw,3rem) auto 0;max-inline-size:82rem;overflow-wrap:anywhere;padding:1rem clamp(1rem,3vw,1.75rem) 0;user-select:text}.visitor-boundary__marker{box-sizing:border-box;color:inherit;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:.7rem;font-variant-ligatures:none;line-height:1.55;margin:0;max-inline-size:100%;white-space:normal}.visitor-boundary__context{box-sizing:border-box;font-family:inherit;font-size:.8rem;line-height:1.55;margin:0;max-inline-size:70ch}@media print{.visitor-boundary{border-color:#000;color:#000}}@media (forced-colors:active){.visitor-boundary{border-color:CanvasText;color:CanvasText}}
</style>`;

const projectionStyle = `<style data-iframe-route-projection>
.artifact-attribution{position:static;box-sizing:border-box;width:100%;overflow-wrap:anywhere}.artifact-attribution__notice{box-sizing:border-box;width:100%;max-width:82rem;margin:clamp(1.5rem,4vw,3rem) auto 0;padding:1rem clamp(1rem,3vw,1.75rem) 0;color:var(--muted,currentColor);font-size:.78rem;line-height:1.55;text-align:center}@media print{.artifact-attribution__notice{color:#000}}@media(forced-colors:active){.artifact-attribution__notice{color:CanvasText}}
</style>`;

function fail(message) {
  throw new Error(message);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
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

function assertStableSupportedArray(values, supported, label) {
  if (!Array.isArray(values)) fail(`${label} must be an array.`);
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
    !Array.isArray(actual) ||
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    fail(`${label} must be ${JSON.stringify(expected)}; received ${JSON.stringify(actual)}.`);
  }
}

function assertRelativeSourceReference(value, label) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.startsWith("/") ||
    value.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(value) ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    fail(`${label} must be a repository-local relative reference.`);
  }
}

function resolvedSourceReference(route, reference) {
  const pathname = reference.split(/[?#]/, 1)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    fail(`Route ${route.id} has an invalid percent-encoded source reference: ${reference}.`);
  }
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(route.source_file), decoded),
  );
  assertBoundedRelativePath(resolved, `Route ${route.id} resolved source reference`);
  return resolved;
}

function filesFor(route, field) {
  return route[field] ?? [];
}

function validateDeclaredFile(route, entry, field, seenReferences, seenTargets) {
  if (!isObject(entry)) fail(`Route ${route.id} ${field} entries must be objects.`);
  assertRelativeSourceReference(
    entry.source_reference,
    `Route ${route.id} ${field} source_reference`,
  );
  assertBoundedRelativePath(
    entry.source_file,
    `Route ${route.id} ${field} source_file`,
  );
  assertBoundedRelativePath(
    entry.target_file,
    `Route ${route.id} ${field} target_file`,
  );
  if (typeof entry.content_type !== "string" || entry.content_type.length === 0) {
    fail(`Route ${route.id} ${field} content_type must be non-empty.`);
  }
  for (const [fileRole, file] of [
    ["source_file", entry.source_file],
    ["target_file", entry.target_file],
  ]) {
    const extension = path.posix.extname(file).toLowerCase();
    const expectedContentType = canonicalContentTypes.get(extension);
    if (!expectedContentType) {
      fail(`Route ${route.id} ${field} ${fileRole} has an unsupported media extension: ${file}.`);
    }
    if (entry.content_type !== expectedContentType) {
      fail(
        `Route ${route.id} ${field} ${fileRole} ${file} must use ` +
        `${expectedContentType}; received ${entry.content_type}.`,
      );
    }
  }
  if (resolvedSourceReference(route, entry.source_reference) !== entry.source_file) {
    fail(
      `Route ${route.id} ${field} source_reference does not resolve to ${entry.source_file}.`,
    );
  }
  const portableTarget = entry.target_file.normalize("NFC").toLowerCase();
  if (seenReferences.has(entry.source_reference)) {
    fail(`Route ${route.id} repeats source reference ${entry.source_reference}.`);
  }
  if (seenTargets.has(portableTarget)) {
    fail(`Route ${route.id} has a case- or Unicode-colliding target ${entry.target_file}.`);
  }
  seenReferences.add(entry.source_reference);
  seenTargets.add(portableTarget);
}

export function validateCanvasRouteContract(contract) {
  if (!isObject(contract)) fail("Canvas public iframe route manifest must be an object.");
  assertExactString(
    contract.id,
    "context-canvas.public-iframe-routes.v1",
    "Canvas route manifest id",
  );
  assertExactString(contract.version, "1", "Canvas route manifest version");
  assertExactString(contract.host, "iframes.vik.guru", "Canvas route manifest host");
  assertExactString(contract.base_path, "/v1/canvas/", "Canvas route manifest base path");
  if (!isObject(contract.projection_contract)) {
    fail("Canvas route manifest projection_contract must be an object.");
  }
  assertExactString(
    contract.projection_contract.entry_file,
    "index.html",
    "Canvas projection entry file",
  );
  assertExactString(
    contract.projection_contract.route_receipt_file,
    "route-manifest.json",
    "Canvas route receipt file",
  );
  assertExactString(
    contract.projection_contract.html_closure,
    "declared_package_local",
    "Canvas HTML closure",
  );
  assertExactString(
    contract.projection_contract.neighboring_path_posture,
    "unmatched",
    "Canvas neighboring-path posture",
  );
  assertExactArray(
    contract.standing_values?.receiver,
    ["byte_identical", "context_adapted"],
    "Canvas receiver standings",
  );
  assertExactArray(
    contract.standing_values?.activation,
    ["eligible"],
    "Canvas activation standings",
  );
  if (!Array.isArray(contract.routes) || contract.routes.length !== 15) {
    fail("Canvas route manifest must declare exactly 15 routes.");
  }

  const routeIds = new Set();
  const portableRouteIds = new Set();
  const sourceFiles = new Set();
  for (const route of contract.routes) {
    if (!isObject(route)) fail("Canvas route entries must be objects.");
    assertBoundedRelativePath(route.id, "Canvas route id");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route.id)) {
      fail(
        `Canvas route id must be one lowercase kebab-case URL segment; ` +
        `received ${JSON.stringify(route.id)}.`,
      );
    }
    const portableRouteId = route.id.normalize("NFC").toLowerCase();
    if (routeIds.has(route.id) || portableRouteIds.has(portableRouteId)) {
      fail(`Canvas route id is duplicated or non-portably colliding: ${route.id}.`);
    }
    routeIds.add(route.id);
    portableRouteIds.add(portableRouteId);
    if (typeof route.display_name !== "string" || route.display_name.length === 0) {
      fail(`Canvas route ${route.id} display_name must be non-empty.`);
    }
    assertExactString(route.kind, "visitor_companion", `Canvas route ${route.id} kind`);
    assertBoundedRelativePath(
      route.source_file,
      `Canvas route ${route.id} source_file`,
      ".html",
    );
    if (sourceFiles.has(route.source_file)) {
      fail(`Canvas route source is duplicated: ${route.source_file}.`);
    }
    sourceFiles.add(route.source_file);
    assertExactString(
      route.public_alias,
      `/v1/canvas/${route.id}/`,
      `Canvas route ${route.id} public alias`,
    );
    if (!supportedReceiverStandings.has(route.receiver_standing)) {
      fail(`Canvas route ${route.id} has an unsupported receiver standing.`);
    }
    if (!supportedActivationStandings.has(route.activation_standing)) {
      fail(`Canvas route ${route.id} has an unsupported activation standing.`);
    }
    if (!supportedProjectionKinds.has(route.projection_kind)) {
      fail(`Canvas route ${route.id} has an unsupported projection kind.`);
    }
    if (!isObject(route.carrier_policy)) {
      fail(`Canvas route ${route.id} carrier_policy must be an object.`);
    }
    assertStableSupportedArray(
      route.carrier_policy.sandbox_tokens,
      supportedSandboxTokens,
      `Canvas route ${route.id} sandbox tokens`,
    );
    assertStableSupportedArray(
      route.carrier_policy.permissions_policy,
      supportedPermissionsPolicyFeatures,
      `Canvas route ${route.id} Permissions Policy`,
    );
    if (
      route.carrier_policy.sandbox_tokens.includes("allow-popups-to-escape-sandbox") &&
      !route.carrier_policy.sandbox_tokens.includes("allow-popups")
    ) {
      fail(`Canvas route ${route.id} cannot escape popups without allowing popups.`);
    }
    if (typeof route.reader_job !== "string" || route.reader_job.length === 0) {
      fail(`Canvas route ${route.id} reader_job must be non-empty.`);
    }

    const seenReferences = new Set();
    const seenTargets = new Set(["index.html", "route-manifest.json"]);
    for (const field of ["package_files", "navigation_files"]) {
      const entries = filesFor(route, field);
      if (!Array.isArray(entries)) fail(`Canvas route ${route.id} ${field} must be an array.`);
      for (const entry of entries) {
        validateDeclaredFile(route, entry, field, seenReferences, seenTargets);
      }
    }

    const rewrites = route.navigation_rewrites ?? [];
    if (!Array.isArray(rewrites)) {
      fail(`Canvas route ${route.id} navigation_rewrites must be an array.`);
    }
    for (const rewrite of rewrites) {
      if (!isObject(rewrite)) {
        fail(`Canvas route ${route.id} navigation_rewrites entries must be objects.`);
      }
      assertRelativeSourceReference(
        rewrite.source_reference,
        `Canvas route ${route.id} navigation rewrite source_reference`,
      );
      if (seenReferences.has(rewrite.source_reference)) {
        fail(`Canvas route ${route.id} repeats source reference ${rewrite.source_reference}.`);
      }
      seenReferences.add(rewrite.source_reference);
      let publicReference;
      try {
        publicReference = new URL(rewrite.public_reference);
      } catch {
        fail(`Canvas route ${route.id} has an invalid public navigation reference.`);
      }
      if (
        publicReference.origin !== "https://vik.guru" ||
        publicReference.username !== "" ||
        publicReference.password !== ""
      ) {
        fail(`Canvas route ${route.id} navigation rewrites must use https://vik.guru/.`);
      }
    }

    if (
      route.projection_kind === "byte_identical" &&
      (seenReferences.size > 0 || route.receiver_standing !== "byte_identical")
    ) {
      fail(`Canvas byte-identical route ${route.id} must not declare projection rewrites.`);
    }
    if (
      route.projection_kind === "decorated_copy" &&
      seenReferences.size > 0
    ) {
      fail(`Canvas decorated-copy route ${route.id} must not declare projection rewrites.`);
    }
    if (
      route.projection_kind === "decorated_rewrite" &&
      seenReferences.size === 0
    ) {
      fail(`Canvas decorated-rewrite route ${route.id} must declare a bounded rewrite.`);
    }
  }
  return true;
}

function occurrenceCount(source, value) {
  return source.split(value).length - 1;
}

function escapeHtmlText(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function insertAtClosingTag(source, tagName, insertion, label, fromEnd = false) {
  const normalized = source.toLowerCase();
  const closingTag = `</${tagName}>`;
  const index = fromEnd
    ? normalized.lastIndexOf(closingTag)
    : normalized.indexOf(closingTag);
  if (index === -1) fail(`${label} is missing.`);
  return `${source.slice(0, index)}${insertion}\n${source.slice(index)}`;
}

function visitorBoundaryMarkup() {
  const [maps, bigBench] = visitorBoundaryContract.markers;
  if (
    typeof visitorBoundaryContract.contextText !== "string" ||
    visitorBoundaryContract.contextText.trim() !== visitorBoundaryContract.contextText ||
    visitorBoundaryContract.contextText.length === 0 ||
    maps?.id !== "maps" ||
    bigBench?.id !== "big-bench" ||
    maps.lines.length !== 2 ||
    bigBench.lines.length !== 2
  ) {
    fail("The centralized visitor-boundary marker contract has drifted.");
  }
  return `  <div class="visitor-boundary" data-visitor-boundary aria-label="Training-data canary markers">
    <p class="visitor-boundary__context" data-visitor-boundary-context>${escapeHtmlText(visitorBoundaryContract.contextText)}</p>
    <p class="visitor-boundary__marker visitor-boundary__marker--maps" data-visitor-boundary-marker="maps">${maps.lines[0]}<br>
      ${maps.lines[1]}</p>
    <p class="visitor-boundary__marker visitor-boundary__marker--big-bench" data-visitor-boundary-marker="big-bench">${bigBench.lines[0]}<br>
      ${bigBench.lines[1]}</p>
  </div>`;
}

function assertAttributionProjection(html, route, expectedDecoration) {
  const authorPattern = new RegExp(
    `<meta\\b[^>]*\\bname=["']author["'][^>]*\\bcontent=["']${artifactAuthor}["'][^>]*>`,
    "gi",
  );
  const licensePattern = new RegExp(
    `<link\\b[^>]*\\brel=["']license["'][^>]*\\bhref=["']${artifactLicense.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
    "gi",
  );
  const authorCount = [...html.matchAll(authorPattern)].length;
  const licenseCount = [...html.matchAll(licensePattern)].length;
  const boundaryCount = occurrenceCount(html, "data-visitor-boundary aria-label=");
  const noticeCount = occurrenceCount(html, artifactAttribution);
  if (
    authorCount !== 1 ||
    licenseCount !== 1 ||
    boundaryCount !== 1 ||
    noticeCount !== 1
  ) {
    fail(`Canvas route ${route.id} must expose one exact authorship, license, boundary, and notice.`);
  }
  for (const marker of visitorBoundaryContract.markers) {
    for (const line of marker.lines) {
      if (occurrenceCount(html, line) !== 1) {
        fail(`Canvas route ${route.id} must expose one exact ${marker.id} marker line.`);
      }
    }
  }
  if (occurrenceCount(html, visitorBoundaryContract.contextText) !== 1) {
    fail(`Canvas route ${route.id} must expose one exact ordinary-language canary context.`);
  }
  const contextPosition = html.indexOf("data-visitor-boundary-context");
  const firstMarkerPosition = html.indexOf("data-visitor-boundary-marker");
  if (contextPosition === -1 || contextPosition >= firstMarkerPosition) {
    fail(`Canvas route ${route.id} must place ordinary-language context before the exact markers.`);
  }
  const decorationCount = occurrenceCount(html, "<style data-iframe-route-projection>");
  if (decorationCount !== expectedDecoration) {
    fail(`Canvas route ${route.id} has an unexpected projection-decoration count.`);
  }
}

function decorateProjection(html, route) {
  if (
    /<meta\b[^>]*\bname=["']author["']/i.test(html) ||
    /<link\b[^>]*\brel=["']license["']/i.test(html) ||
    html.includes("data-visitor-boundary") ||
    html.includes(artifactAttribution) ||
    html.includes("data-iframe-route-projection")
  ) {
    fail(`Canvas decorated route ${route.id} already carries projection-owned decoration.`);
  }
  const head = [
    `  <meta name="author" content="${artifactAuthor}">`,
    `  <link rel="license" href="${artifactLicense}">`,
    projectionStyle,
    visitorBoundaryStyle,
  ].join("\n");
  const footer = `<footer class="iframe-route-attribution artifact-attribution" data-iframe-route-attribution aria-label="Authorship and license">
${visitorBoundaryMarkup()}
  <p class="artifact-attribution__notice">${artifactAttribution}</p>
</footer>`;
  let projected = insertAtClosingTag(
    html,
    "head",
    head,
    `Canvas route ${route.id} closing head`,
  );
  projected = insertAtClosingTag(
    projected,
    "body",
    footer,
    `Canvas route ${route.id} closing body`,
    true,
  );
  assertAttributionProjection(projected, route, 1);
  return projected;
}

function rewriteReference(source, reference, replacement, label) {
  const replacements = occurrenceCount(source, reference);
  if (replacements < 1) {
    fail(`${label} was not found in its declared source.`);
  }
  return {
    projected: source.split(reference).join(replacement),
    replacements,
  };
}

export function deriveCanvasProjection(html, route) {
  if (typeof html !== "string") fail(`Canvas route ${route.id} requires HTML text.`);
  let projected = html;
  const rewriteReceipts = [];
  for (const field of ["package_files", "navigation_files"]) {
    for (const entry of filesFor(route, field)) {
      const result = rewriteReference(
        projected,
        entry.source_reference,
        `./${entry.target_file}`,
        `Canvas route ${route.id} ${field} reference ${entry.source_reference}`,
      );
      projected = result.projected;
      rewriteReceipts.push({
        kind: field === "package_files" ? "package_file" : "navigation_file",
        source_reference: entry.source_reference,
        projected_reference: `./${entry.target_file}`,
        replacements: result.replacements,
      });
    }
  }
  for (const rewrite of route.navigation_rewrites ?? []) {
    const result = rewriteReference(
      projected,
      rewrite.source_reference,
      rewrite.public_reference,
      `Canvas route ${route.id} navigation reference ${rewrite.source_reference}`,
    );
    projected = result.projected;
    rewriteReceipts.push({
      kind: "primary_site_navigation",
      source_reference: rewrite.source_reference,
      projected_reference: rewrite.public_reference,
      replacements: result.replacements,
    });
  }
  if (route.projection_kind !== "byte_identical") {
    projected = decorateProjection(projected, route);
  } else {
    assertAttributionProjection(projected, route, 0);
    if (projected !== html) fail(`Canvas route ${route.id} must remain byte-identical.`);
  }
  return { html: projected, rewrites: rewriteReceipts };
}

function observedCarrierPolicy(html) {
  const runtimeCapabilities = observeIframeRuntimeCapabilities(html);
  const sandboxTokens = [];
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  if (
    /\.download\s*=/.test(html) ||
    /<a\b[^>]*\bdownload(?:\s|=|>)/i.test(markup)
  ) {
    sandboxTokens.push("allow-downloads");
  }
  if (
    runtimeCapabilities.includes("native-modals") ||
    /(?:^|[^\w.])(?:(?:window|globalThis)\.)?print\s*\(/m.test(html)
  ) {
    sandboxTokens.push("allow-modals");
  }
  if (
    /\b(?:target|formtarget)\s*=\s*["']_blank["']/i.test(html) ||
    /\b(?:(?:window|globalThis)\.)?open\s*\(/.test(html)
  ) {
    sandboxTokens.push("allow-popups", "allow-popups-to-escape-sandbox");
  }
  if (runtimeCapabilities.includes("executable-scripts")) {
    sandboxTokens.push("allow-scripts");
  }
  sandboxTokens.sort(compareCodeUnits);
  const permissionsPolicy = runtimeCapabilities.includes("clipboard-write")
    ? ["clipboard-write"]
    : [];
  return { runtimeCapabilities, sandboxTokens, permissionsPolicy };
}

function validateObservedCarrierPolicy(route, observation) {
  assertExactArray(
    route.carrier_policy.sandbox_tokens,
    observation.sandboxTokens,
    `Canvas route ${route.id} sandbox tokens for observed behavior`,
  );
  assertExactArray(
    route.carrier_policy.permissions_policy,
    observation.permissionsPolicy,
    `Canvas route ${route.id} Permissions Policy for observed behavior`,
  );
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

async function readRepositoryFile(paths, relativePath, label) {
  const filePath = path.join(paths.repositoryRoot, relativePath);
  await assertRegularFileWithin(paths.repositoryRoot, filePath, label);
  return await readFile(filePath);
}

function fileReceipt(entry, bytes, rewrites) {
  return {
    source_file: entry.source_file,
    target_file: entry.target_file,
    content_type: entry.content_type,
    source_reference: entry.source_reference,
    rewritten_references: rewrites,
    bytes: bytes.byteLength,
    sha256: sha256(bytes),
  };
}

export async function createCanvasPackagePlan(options = {}) {
  const paths = { ...canvasDefaultPaths, ...options };
  const routeManifestReading = await readJsonFile(
    paths.repositoryRoot,
    paths.routeManifestPath,
    "Canvas public iframe route manifest",
  );
  const contract = routeManifestReading.value;
  validateCanvasRouteContract(contract);

  const outputFiles = new Map();
  const portableOutputPaths = new Set(["route-manifest.json"]);
  const routeReadings = [];
  for (const route of contract.routes) {
    const sourceBytes = await readRepositoryFile(
      paths,
      route.source_file,
      `Canvas HTML source for route ${route.id}`,
    );
    for (const rewrite of route.navigation_rewrites ?? []) {
      const target = resolvedSourceReference(route, rewrite.source_reference);
      await assertRegularFileWithin(
        paths.repositoryRoot,
        path.join(paths.repositoryRoot, target),
        `Canvas navigation source for route ${route.id}`,
      );
    }
    const projection = deriveCanvasProjection(sourceBytes.toString("utf8"), route);
    const projectionBytes = route.projection_kind === "byte_identical"
      ? sourceBytes
      : Buffer.from(projection.html, "utf8");
    const carrierObservation = observedCarrierPolicy(projection.html);
    validateObservedCarrierPolicy(route, carrierObservation);
    const routeDirectory = route.id;
    const indexOutputPath = path.posix.join(routeDirectory, "index.html");
    const portableIndexPath = indexOutputPath.normalize("NFC").toLowerCase();
    if (portableOutputPaths.has(portableIndexPath)) {
      fail(`Canvas output collision at ${indexOutputPath}.`);
    }
    outputFiles.set(indexOutputPath, projectionBytes);
    portableOutputPaths.add(portableIndexPath);

    const packageReadings = new Map();
    const fileReceipts = { package_files: [], navigation_files: [] };
    for (const field of ["package_files", "navigation_files"]) {
      for (const entry of filesFor(route, field)) {
        const bytes = await readRepositoryFile(
          paths,
          entry.source_file,
          `Canvas ${field} source for route ${route.id}`,
        );
        const outputPath = path.posix.join(routeDirectory, entry.target_file);
        const portableOutputPath = outputPath.normalize("NFC").toLowerCase();
        if (portableOutputPaths.has(portableOutputPath)) {
          fail(`Canvas output collision at ${outputPath}.`);
        }
        outputFiles.set(outputPath, bytes);
        portableOutputPaths.add(portableOutputPath);
        packageReadings.set(entry.target_file, {
          bytes,
          contentType: entry.content_type,
        });
        const rewrite = projection.rewrites.find(
          (candidate) =>
            candidate.source_reference === entry.source_reference &&
            candidate.kind === (field === "package_files" ? "package_file" : "navigation_file"),
        );
        fileReceipts[field].push(fileReceipt(entry, bytes, rewrite?.replacements ?? 0));
      }
    }
    const closure = scanPackageClosure(
      projection.html,
      packageReadings,
      `Canvas route ${route.id}`,
      { scanMarkupContextsOnly: true, scanStyleContextsOnly: true },
    );
    routeReadings.push({
      route,
      routeDirectory,
      indexOutputPath,
      sourceBytes,
      projectionBytes,
      projection,
      closure,
      carrierObservation,
      fileReceipts,
    });
  }

  const expectedOutputPaths = new Set([...outputFiles.keys(), "route-manifest.json"]);
  const routeReceipts = routeReadings.map((reading) => {
    const navigation = navigationObservation(
      reading.projection.html,
      reading.routeDirectory,
      expectedOutputPaths,
      contract.base_path,
      { scanMarkupContextsOnly: true },
    );
    if (navigation.unresolved_local_links.length > 0) {
      fail(
        `Eligible Canvas route ${reading.route.id} has unresolved local navigation: ` +
        navigation.unresolved_local_links.map(({ href }) => href).join(", "),
      );
    }
    return {
      id: reading.route.id,
      public_alias: reading.route.public_alias,
      source_file: reading.route.source_file,
      ...(reading.route.source_view ? { source_view: reading.route.source_view } : {}),
      receiver_standing: reading.route.receiver_standing,
      activation_standing: reading.route.activation_standing,
      activation_eligible: true,
      projection_kind: reading.route.projection_kind,
      carrier_policy: reading.route.carrier_policy,
      observed_runtime_capabilities: reading.carrierObservation.runtimeCapabilities,
      projection_file: reading.indexOutputPath,
      source_bytes: reading.sourceBytes.byteLength,
      source_sha256: sha256(reading.sourceBytes),
      projection_bytes: reading.projectionBytes.byteLength,
      projection_sha256: sha256(reading.projectionBytes),
      projection_rewrites: reading.projection.rewrites,
      static_resource_closure: {
        inline_references: reading.closure.inline_references,
        package_files: reading.fileReceipts.package_files,
        navigation_files: reading.fileReceipts.navigation_files,
      },
      navigation,
    };
  });

  const receipt = {
    id: "context-canvas.iframe-route-package-receipt.v1",
    version: "1",
    host: contract.host,
    base_path: contract.base_path,
    route_contract: {
      file: path
        .relative(paths.repositoryRoot, paths.routeManifestPath)
        .split(path.sep)
        .join(path.posix.sep),
      sha256: sha256(routeManifestReading.bytes),
    },
    package_contract: {
      primary_routes: routeReceipts.length,
      decorated_routes: routeReceipts.filter(
        ({ projection_kind }) => projection_kind !== "byte_identical",
      ).length,
      byte_identical_routes: routeReceipts.filter(
        ({ projection_kind }) => projection_kind === "byte_identical",
      ).length,
      generated_files: outputFiles.size + 1,
      live_cloudflare_mutation: false,
      closure_observation: "static_resource_graph",
      browser_request_observation_required: true,
      neighboring_path_posture: contract.projection_contract.neighboring_path_posture,
    },
    routes: routeReceipts,
  };
  outputFiles.set(
    "route-manifest.json",
    Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8"),
  );

  return {
    contract,
    receipt,
    outputFiles,
    outputCanvasRoot: paths.outputCanvasRoot,
  };
}

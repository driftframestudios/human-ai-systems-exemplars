import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

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

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
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

function hasCharacterReference(value) {
  return /&(?:#[^\s;]*;?|[a-z][a-z0-9]+;)/i.test(value);
}

function decodeExecutableAttribute(value, { rejectRemaining = true } = {}) {
  const namedReferences = new Map([
    ["colon", ":"],
    ["lpar", "("],
    ["rpar", ")"],
    ["period", "."],
    ["Tab", "\t"],
    ["NewLine", "\n"],
  ]);
  const decoded = value
    .replace(/&#(?:x([0-9a-f]+)|([0-9]+));?/gi, (_match, hexadecimal, decimal) => {
      const codePoint = Number.parseInt(hexadecimal ?? decimal, hexadecimal ? 16 : 10);
      return Number.isSafeInteger(codePoint) &&
        codePoint > 0 &&
        codePoint <= 0x10ffff &&
        !(codePoint >= 0xd800 && codePoint <= 0xdfff)
        ? String.fromCodePoint(codePoint)
        : "\ufffd";
    })
    .replace(/&(colon|lpar|rpar|period|Tab|NewLine);/g, (reference, name) =>
      namedReferences.get(name) ?? reference,
    );
  if (rejectRemaining && hasCharacterReference(decoded)) {
    fail("Iframe runtime observation encountered a character reference in executable code.");
  }
  return decoded;
}

function iframeExecutableSources(html) {
  const executableBodies = [];
  let executableScripts = false;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const type = (attributeValue(match[1], "type") ?? "").trim().toLowerCase();
    if (
      [
        "application/json",
        "application/ld+json",
        "application/schema+json",
        "importmap",
        "speculationrules",
      ].includes(type)
    ) {
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

  const markupWithoutScriptBodies = html.replace(
    /<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi,
    "<script$1></script>",
  );
  for (const tagMatch of markupWithoutScriptBodies.matchAll(/<[a-z][^>]*>/gi)) {
    const tag = tagMatch[0];
    for (const handler of tag.matchAll(
      /\son[a-z][a-z0-9:._-]*\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    )) {
      executableScripts = true;
      executableBodies.push(
        decodeExecutableAttribute(handler[1] ?? handler[2] ?? handler[3] ?? ""),
      );
    }
    for (const attributeName of ["href", "src", "action", "formaction", "xlink:href"]) {
      const rawValue = attributeValue(tag, attributeName);
      if (rawValue === null) continue;
      const decodedValue = decodeExecutableAttribute(rawValue, { rejectRemaining: false });
      const compactValue = decodedValue.replace(/[\u0000-\u0020]+/g, "");
      if (!compactValue.toLowerCase().startsWith("javascript:")) continue;
      if (hasCharacterReference(decodedValue)) {
        fail("Iframe runtime observation encountered a character reference in executable code.");
      }
      executableScripts = true;
      executableBodies.push(compactValue.slice("javascript:".length));
    }
  }

  return { executableBodies, executableScripts };
}

export function observeIframeRuntimeCapabilities(html) {
  if (typeof html !== "string") {
    fail("Iframe runtime capability observation requires HTML text.");
  }

  const { executableBodies, executableScripts } = iframeExecutableSources(html);
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

function htmlStyleReferences(html) {
  const references = [];
  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
    references.push(...styleReferences(match[1]));
  }
  for (const match of html.matchAll(/<[a-z][^>]*\bstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)[^>]*>/gi)) {
    const style = attributeValue(match[0], "style");
    if (style !== null) references.push(...styleReferences(style));
  }
  return references;
}

function markupResourceContext(html, options) {
  if (!options.scanMarkupContextsOnly) return html;
  return html.replace(
    /<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi,
    (_match, attributes) => `<script${attributes}></script>`,
  );
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
  const markup = markupResourceContext(html, options);

  if (/<base\b/i.test(html)) {
    fail(`${label} must not use a base element because it changes route resolution.`);
  }
  if (/<meta\b[^>]*http-equiv\s*=\s*["']?refresh\b/i.test(html)) {
    fail(`${label} must not use a meta refresh route.`);
  }

  const tags = markup.match(/<(?:script|link|img|source|iframe|audio|video|track|object|embed|input|image|feimage|use)\b[^>]*>/gi) ?? [];
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

  references.push(...(
    options.scanStyleContextsOnly
      ? htmlStyleReferences(markup)
      : styleReferences(markup)
  ));

  for (const script of iframeExecutableSources(html).executableBodies) {
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

function extractAnchorHrefs(html, options = {}) {
  const hrefs = [];
  const markup = markupResourceContext(html, options);
  for (const match of markup.matchAll(/<a\b[^>]*>/gi)) {
    const href = attributeValue(match[0], "href");
    if (href !== null) hrefs.push(href.trim());
  }
  return hrefs;
}

export function scanPackageClosure(
  html,
  packageReadings,
  label = "HTML artifact",
  options = {},
) {
  const targets = new Set(packageReadings.keys());
  const root = scanHtmlClosure(html, targets, label, {
    ...options,
    requireAllTargets: false,
  });
  const reachable = new Set(root.package_targets);
  for (const href of extractAnchorHrefs(html, options)) {
    const classification = classifyResourceReference(href);
    if (classification.kind === "package" && targets.has(classification.target)) {
      reachable.add(classification.target);
    }
  }
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
        ...options,
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

export function navigationObservation(
  html,
  routeRelativeDirectory,
  expectedOutputPaths,
  basePath,
  options = {},
) {
  let packagedLinks = 0;
  let fragmentLinks = 0;
  let externalLinks = 0;
  const unresolved = new Map();

  for (const href of extractAnchorHrefs(html, options)) {
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

export function assertPackageOutputPath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    fail("Generated iframe package output paths must be non-empty strings.");
  }
  const normalized = path.posix.normalize(relativePath);
  if (
    relativePath !== normalized ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    path.posix.isAbsolute(normalized) ||
    normalized.includes("\\") ||
    normalized.includes("\0")
  ) {
    fail(`Generated iframe package output path must stay relative and normalized: ${relativePath}.`);
  }
  return normalized;
}

function packageOutputPath(outputRoot, relativePath) {
  const safeRelativePath = assertPackageOutputPath(relativePath);
  const resolvedRoot = path.resolve(outputRoot);
  const resolvedOutput = path.resolve(
    resolvedRoot,
    ...safeRelativePath.split(path.posix.sep),
  );
  if (!resolvedOutput.startsWith(`${resolvedRoot}${path.sep}`)) {
    fail(`Generated iframe package output escapes its root: ${relativePath}.`);
  }
  return resolvedOutput;
}

export async function writePackagePlan(plan, outputRoot) {
  const entries = [...plan.outputFiles.entries()]
    .map(([relativePath, bytes]) => [assertPackageOutputPath(relativePath), bytes])
    .sort(([left], [right]) => compareCodeUnits(left, right));
  for (const [relativePath, bytes] of entries) {
    const outputPath = packageOutputPath(outputRoot, relativePath);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, bytes, { flag: "wx" });
  }
}

export async function verifyPackagePlan(plan, outputRoot) {
  const expectedFiles = [...plan.outputFiles.keys()]
    .map(assertPackageOutputPath)
    .sort(compareCodeUnits);
  const actualFiles = await listRegularFiles(outputRoot);
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
    const outputPath = packageOutputPath(outputRoot, relativePath);
    await assertRegularFile(outputPath, "Generated iframe package file");
    const actualBytes = await readFile(outputPath);
    if (!actualBytes.equals(expectedBytes)) {
      fail(`Generated iframe package file differs from its plan: ${relativePath}.`);
    }
    totalBytes += actualBytes.byteLength;
  }
  return { files: actualFiles.length, bytes: totalBytes };
}

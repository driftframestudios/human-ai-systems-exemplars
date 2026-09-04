import {
  cp,
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
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  posix,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const PUBLIC_REFERENCE_SOURCE = join(
  REPOSITORY_ROOT,
  "context-canvas-project-surface",
);
export const PUBLIC_REFERENCE_HTML_ROOT = join(
  PUBLIC_REFERENCE_SOURCE,
  "context-canvas",
);
export const PUBLIC_REFERENCE_OUTPUT = join(
  REPOSITORY_ROOT,
  ".public-reference-build",
  "context-canvas-project-surface",
);
export const PUBLIC_REFERENCE_CONFIG = join(REPOSITORY_ROOT, ".env.public");
export const PUBLIC_IFRAME_ROUTE_MANIFEST = join(
  REPOSITORY_ROOT,
  "core-architectures-chimeric-prototype-current-pack-v0.1",
  "public-iframe-route-manifest-v1.json",
);
export const PUBLIC_REFERENCE_NAMESPACE = "PUBLIC_URL_REGISTRY_";
export const PUBLIC_IFRAME_NAMESPACE = "PUBLIC_URL_IFRAME_";
export const PUBLIC_AUTHOR_PROFILE_KEY =
  "PUBLIC_URL_AUTHOR_PROFESSIONAL_PROFILE";

const OUTPUT_MARKER = ".public-reference-materialization.json";
const OUTPUT_FORMAT = 1;
const PUBLIC_REFERENCE_NAMESPACES = [
  PUBLIC_REFERENCE_NAMESPACE,
  PUBLIC_IFRAME_NAMESPACE,
];
const PUBLIC_IFRAME_LOCAL_ROOT =
  "context-canvas/prototypes/core-architectures/chimeric-pack-v0.1";
const PUBLIC_IFRAME_CONTEXT_CANVAS_SOURCE_ROOT =
  "context-canvas-project-surface/context-canvas";
const PUBLIC_AUTHOR_PROFILE_SCRIPT_PATH = posix.join(
  "context-canvas",
  "canvas-shell.js",
);
const EXACT_TOKEN = /^PUBLIC_URL_(?:REGISTRY|IFRAME)_[A-Z0-9_]+$/;
const EXACT_IFRAME_TOKEN = /^PUBLIC_URL_IFRAME_[A-Z0-9_]+$/;
const TOKEN_OCCURRENCE = /\{\{(PUBLIC_URL[^{}\s]*)\}\}/g;
const PUBLIC_KEY_LOOKALIKE = /PUBLIC_URL(?:_[A-Za-z0-9]+)+/;
const URL_CANDIDATE = /(?:\bhttps?:)?\/\/[^\s"'<>]+/gi;
const HTML_URL_ENTITIES = new Map([
  ["amp", "&"],
  ["bsol", "\\"],
  ["colon", ":"],
  ["commat", "@"],
  ["equals", "="],
  ["NewLine", "\n"],
  ["num", "#"],
  ["percnt", "%"],
  ["period", "."],
  ["quest", "?"],
  ["sol", "/"],
  ["Tab", "\t"],
]);
const CREDENTIAL_PARAMETER_NAMES = new Set([
  "accesstoken",
  "apikey",
  "auth",
  "authorization",
  "authtoken",
  "bearer",
  "clientsecret",
  "credential",
  "credentials",
  "idtoken",
  "jwt",
  "key",
  "password",
  "passwd",
  "refreshtoken",
  "sastoken",
  "secret",
  "sharedaccesssignature",
  "sig",
  "signature",
  "token",
]);

export class PublicReferenceContractError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "PublicReferenceContractError";
    this.code = code;
  }
}

export class PublicReferenceOperationalError extends Error {
  constructor(code, message, options) {
    super(`${code}: ${message}`, options);
    this.name = "PublicReferenceOperationalError";
    this.code = code;
  }
}

export function isPublicReferencePathWithin(
  parent,
  candidate,
  pathFunctions = { isAbsolute, relative, sep },
) {
  const path = pathFunctions.relative(parent, candidate);
  return (
    path === "" ||
    (!pathFunctions.isAbsolute(path) &&
      path !== ".." &&
      !path.startsWith(`..${pathFunctions.sep}`))
  );
}

function assertSeparateTrees(sourceRoot, outputRoot) {
  const source = resolve(sourceRoot);
  const output = resolve(outputRoot);
  if (
    isPublicReferencePathWithin(source, output) ||
    isPublicReferencePathWithin(output, source)
  ) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_PATH_OVERLAP",
      "the authored source and generated output must be separate trees",
    );
  }
}

async function lstatIfPresent(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function decodeHtmlUrlReferences(value) {
  return value
    .replace(/&#(?:x([0-9a-f]+)|([0-9]+));?/gi, (reference, hex, decimal) => {
      const codePoint = Number.parseInt(hex ?? decimal, hex ? 16 : 10);
      if (!Number.isSafeInteger(codePoint) || codePoint > 0x10ffff) return reference;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return reference;
      }
    })
    .replace(/&([A-Za-z]+);/g, (reference, name) =>
      HTML_URL_ENTITIES.get(name) ?? reference,
    );
}

function decodeBackslashUrlEscapes(value) {
  return value
    .replace(/\\u\{([0-9a-f]{1,6})\}/gi, (escape, hex) => {
      const codePoint = Number.parseInt(hex, 16);
      if (codePoint > 0x10ffff) return escape;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return escape;
      }
    })
    .replace(/\\u([0-9a-f]{4})/gi, (_escape, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/\\x([0-9a-f]{2})/gi, (_escape, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replaceAll("\\/", "/");
}

function urlTextVariants(value) {
  const htmlDecoded = decodeHtmlUrlReferences(value);
  return new Set([
    value,
    htmlDecoded,
    decodeBackslashUrlEscapes(value),
    decodeBackslashUrlEscapes(htmlDecoded),
  ]);
}

function isNotionPageHost(host) {
  const hostname = host.toLowerCase();

  return (
    hostname === "app.notion.com" ||
    hostname === "notion.so" ||
    hostname === "www.notion.so" ||
    hostname.endsWith(".notion.so") ||
    hostname === "notion.site" ||
    hostname.endsWith(".notion.site")
  );
}

function containsDirectNotionPageUrl(html) {
  for (const variant of urlTextVariants(html)) {
    for (const match of variant.matchAll(URL_CANDIDATE)) {
      const candidate = match[0].replaceAll("&amp;", "&");
      try {
        const url = new URL(
          candidate.startsWith("//") ? `https:${candidate}` : candidate,
        );
        if (isNotionPageHost(url.hostname)) return true;
      } catch {
        // Malformed URL-like text is handled by its owning HTML or token contract.
      }
    }
  }
  return false;
}

async function prepareOutputParent(boundaryRoot, outputRoot) {
  const boundary = resolve(boundaryRoot);
  const output = resolve(outputRoot);
  const outputParent = dirname(output);
  if (
    !isPublicReferencePathWithin(boundary, output) ||
    output === boundary
  ) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_OUTPUT_BOUNDARY",
      "the generated output must remain inside its owned build boundary",
    );
  }

  const boundaryState = await lstatIfPresent(boundary);
  if (
    !boundaryState?.isDirectory() ||
    boundaryState.isSymbolicLink()
  ) {
    throw new PublicReferenceOperationalError(
      "PUBLIC_REFERENCE_OUTPUT_BOUNDARY",
      "the generated-output boundary is unavailable or symbolic",
    );
  }

  let current = boundary;
  for (const component of relative(boundary, outputParent).split(sep)) {
    if (component === "") continue;
    current = join(current, component);
    const state = await lstatIfPresent(current);
    if (!state) break;
    if (!state.isDirectory() || state.isSymbolicLink()) {
      throw new PublicReferenceContractError(
        "PUBLIC_REFERENCE_OUTPUT_PARENT",
        "the generated-output path crosses a non-directory or symbolic-link component",
      );
    }
  }

  await mkdir(outputParent, { recursive: true });
  const [boundaryRealPath, parentRealPath] = await Promise.all([
    realpath(boundary),
    realpath(outputParent),
  ]);
  if (!isPublicReferencePathWithin(boundaryRealPath, parentRealPath)) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_OUTPUT_PARENT",
      "the generated-output parent resolves outside its owned build boundary",
    );
  }
  return outputParent;
}

function tokenOccurrences(value) {
  return [...value.matchAll(TOKEN_OCCURRENCE)].map((match) => ({
    key: match[1],
    index: match.index,
    text: match[0],
  }));
}

function tokenBearingJsonBlocks(html) {
  const blocks = [];
  const scriptPattern = /<script\b[^>]*>[\s\S]*?<\/script>/gi;

  for (const match of html.matchAll(scriptPattern)) {
    const script = match[0];
    const openEnd = script.indexOf(">");
    const closeStart = script.toLowerCase().lastIndexOf("</script>");
    const open = script.slice(0, openEnd + 1);
    const body = script.slice(openEnd + 1, closeStart);
    if (!/\btype\s*=\s*(["'])application\/ld\+json\1/i.test(open)) continue;
    if (!body.includes("PUBLIC_URL")) continue;

    const carriers = [];
    for (const token of tokenOccurrences(body)) {
      const before = body[token.index - 1];
      const after = body[token.index + token.text.length];
      if (before !== '"' || after !== '"') continue;
      carriers.push(token);
    }

    blocks.push({ body, carriers });
  }

  return blocks;
}

function registryAnchorTokenCarriers(html) {
  const carriers = [];
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = match[0];
    const href = /\bhref\s*=\s*(["'])\{\{(PUBLIC_URL_REGISTRY_[A-Z0-9_]+)\}\}\1/i.exec(tag);
    if (href) carriers.push({ key: href[2] });
  }
  return carriers;
}

function attributeMatches(tag, name) {
  const pattern = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`,
    "gi",
  );
  return [...tag.matchAll(pattern)];
}

function assertLocalIframeFallback(value, key, safePath, attribute) {
  if (
    typeof value !== "string" ||
    value === "" ||
    value.trim() !== value ||
    /[\x00-\x1F\x7F]/.test(value) ||
    value.startsWith("//") ||
    value.startsWith("#") ||
    value.startsWith("?") ||
    value.includes("&") ||
    value.includes("\\") ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value) ||
    value.includes("{{PUBLIC_URL")
  ) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_IFRAME_FALLBACK",
      `${key} needs one complete repository-local ${attribute} fallback in ${safePath}`,
    );
  }
}

function iframeTokenCarriers(html, safePath) {
  const carriers = [];
  for (const match of html.matchAll(/<([A-Za-z][A-Za-z0-9:-]*)\b[^>]*>/g)) {
    const tag = match[0];
    const tagName = match[1].toLowerCase();
    const publicSrc = attributeMatches(tag, "data-public-src");
    const publicHref = attributeMatches(tag, "data-public-href");
    if (publicSrc.length === 0 && publicHref.length === 0) continue;

    const expected =
      tagName === "iframe"
        ? {
            publicMatches: publicSrc,
            publicName: "data-public-src",
            localName: "src",
          }
        : tagName === "a"
          ? {
              publicMatches: publicHref,
              publicName: "data-public-href",
              localName: "href",
            }
          : null;
    const hasUnexpectedCarrier =
      publicSrc.length + publicHref.length !== 1 ||
      (tagName === "iframe" && publicHref.length > 0) ||
      (tagName === "a" && publicSrc.length > 0);
    if (!expected || hasUnexpectedCarrier) {
      throw new PublicReferenceContractError(
        "PUBLIC_REFERENCE_IFRAME_CARRIER",
        `${safePath} pairs data-public-src with iframe src and data-public-href with anchor href`,
      );
    }

    const publicValue = expected.publicMatches[0][2];
    const token = /^\{\{(PUBLIC_URL[^{}\s]*)\}\}$/.exec(publicValue);
    if (!token || !EXACT_IFRAME_TOKEN.test(token[1])) {
      throw new PublicReferenceContractError(
        "PUBLIC_REFERENCE_IFRAME_CARRIER",
        `${safePath} carries each hosted iframe destination as one complete ${PUBLIC_IFRAME_NAMESPACE} token`,
      );
    }

    const localMatches = attributeMatches(tag, expected.localName);
    if (localMatches.length !== 1) {
      throw new PublicReferenceContractError(
        "PUBLIC_REFERENCE_IFRAME_FALLBACK",
        `${token[1]} needs one complete repository-local ${expected.localName} fallback in ${safePath}`,
      );
    }
    assertLocalIframeFallback(
      localMatches[0][2],
      token[1],
      safePath,
      expected.localName,
    );
    carriers.push({
      key: token[1],
      localFallback: localMatches[0][2],
      tagName,
      tag,
    });
  }
  return carriers;
}

function requiredHostedIframeAttribute(tag, name, key, safePath, { allowEmpty = false } = {}) {
  const matches = attributeMatches(tag, name);
  if (
    matches.length !== 1 ||
    (!allowEmpty && matches[0][2].trim().length === 0) ||
    matches[0][2].trim() !== matches[0][2]
  ) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_IFRAME_POLICY",
      `${key} needs one explicit ${name} attribute on its hosted iframe in ${safePath}`,
    );
  }
  return matches[0][2];
}

function assertHostedIframePolicy(carrier, safePath, iframeCarrierPolicies = null) {
  const { key, tag } = carrier;
  requiredHostedIframeAttribute(tag, "title", key, safePath);
  const loading = requiredHostedIframeAttribute(tag, "loading", key, safePath);
  const sandbox = requiredHostedIframeAttribute(
    tag,
    "sandbox",
    key,
    safePath,
    { allowEmpty: true },
  );
  const referrerPolicy = requiredHostedIframeAttribute(
    tag,
    "referrerpolicy",
    key,
    safePath,
  );

  if (loading !== "lazy" || referrerPolicy !== "no-referrer") {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_IFRAME_POLICY",
      `${key} needs loading=lazy and referrerpolicy=no-referrer in ${safePath}`,
    );
  }

  const sandboxTokens = sandbox.split(/\s+/).filter(Boolean);
  if (
    new Set(sandboxTokens).size !== sandboxTokens.length ||
    sandboxTokens.some((token) => token !== "allow-scripts")
  ) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_IFRAME_POLICY",
      `${key} may grant only its observed allow-scripts sandbox capability in ${safePath}`,
    );
  }

  const allowMatches = attributeMatches(tag, "allow");
  if (allowMatches.length > 1) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_IFRAME_POLICY",
      `${key} may carry at most one narrow allow attribute in ${safePath}`,
    );
  }
  const allowFeatures = (allowMatches[0]?.[2] ?? "")
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    new Set(allowFeatures).size !== allowFeatures.length ||
    allowFeatures.some((feature) => feature !== "clipboard-write")
  ) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_IFRAME_POLICY",
      `${key} may delegate only the observed clipboard-write feature in ${safePath}`,
    );
  }

  if (iframeCarrierPolicies === null) return;
  const expected = iframeCarrierPolicies.get(key);
  if (expected === undefined) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_IFRAME_POLICY",
      `${key} needs a route-manifest carrier profile in ${safePath}`,
    );
  }
  const normalizedSafePath = safePath.split(sep).join("/");
  const normalizedFallback = posix.normalize(
    posix.join(posix.dirname(normalizedSafePath), carrier.localFallback),
  );
  if (
    normalizedFallback !== expected.localFallback ||
    sandboxTokens.length !== expected.sandboxTokens.length ||
    sandboxTokens.some((token, index) => token !== expected.sandboxTokens[index]) ||
    allowFeatures.length !== expected.allowFeatures.length ||
    allowFeatures.some((feature, index) => feature !== expected.allowFeatures[index])
  ) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_IFRAME_POLICY",
      `${key} must match the route source and exact sandbox and Permissions Policy profile in ${safePath}`,
    );
  }
}

export function inspectPublicReferenceHtml(
  html,
  safePath = "Context Canvas HTML",
  iframeCarrierPolicies = null,
) {
  if (containsDirectNotionPageUrl(html)) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_DIRECT_NOTION_URL",
      `${safePath} contains a direct Notion page route; use a Registry-scoped semantic key`,
    );
  }

  const tokens = tokenOccurrences(html);
  for (const token of tokens) {
    if (!EXACT_TOKEN.test(token.key)) {
      throw new PublicReferenceContractError(
        "PUBLIC_REFERENCE_TOKEN_NAMESPACE",
        `${safePath} contains a public-reference token outside ${PUBLIC_REFERENCE_NAMESPACES.join(" or ")}`,
      );
    }
  }

  const registryAnchors = registryAnchorTokenCarriers(html);
  const iframeCarriers = iframeTokenCarriers(html, safePath);
  const jsonBlocks = tokenBearingJsonBlocks(html);
  const jsonCarriers = jsonBlocks.flatMap((block) => block.carriers);
  const carrierCount =
    registryAnchors.length + iframeCarriers.length + jsonCarriers.length;

  if (carrierCount !== tokens.length) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_TOKEN_CARRIER",
      `${safePath} must carry each public-reference token as a complete Registry anchor, hosted iframe data carrier, or JSON-LD string value`,
    );
  }

  const embeddedIframeKeys = new Set(
    iframeCarriers
      .filter((carrier) => carrier.tagName === "iframe")
      .map((carrier) => carrier.key),
  );
  const fullViewIframeKeys = new Set(
    iframeCarriers
      .filter((carrier) => carrier.tagName === "a")
      .map((carrier) => carrier.key),
  );
  const iframeKeys = new Set([
    ...embeddedIframeKeys,
    ...fullViewIframeKeys,
  ]);
  for (const key of iframeKeys) {
    if (!embeddedIframeKeys.has(key) || !fullViewIframeKeys.has(key)) {
      throw new PublicReferenceContractError(
        "PUBLIC_REFERENCE_IFRAME_KEY_MISMATCH",
        `${key} must identify both the hosted iframe and its full-view anchor in ${safePath}`,
      );
    }
    const localFallbacks = new Set(
      iframeCarriers
        .filter((carrier) => carrier.key === key)
        .map((carrier) => carrier.localFallback),
    );
    if (localFallbacks.size !== 1) {
      throw new PublicReferenceContractError(
        "PUBLIC_REFERENCE_IFRAME_FALLBACK",
        `${key} must use the same repository-local fallback for its iframe and full-view anchor in ${safePath}`,
      );
    }
  }
  for (const carrier of iframeCarriers.filter(({ tagName }) => tagName === "iframe")) {
    assertHostedIframePolicy(carrier, safePath, iframeCarrierPolicies);
  }
  for (const carrier of jsonCarriers) {
    if (EXACT_IFRAME_TOKEN.test(carrier.key) && !iframeKeys.has(carrier.key)) {
      throw new PublicReferenceContractError(
        "PUBLIC_REFERENCE_IFRAME_KEY_MISMATCH",
        `${carrier.key} appears in JSON-LD without a matching hosted iframe carrier in ${safePath}`,
      );
    }
  }

  const withoutExactTokens = html.replace(
    /\{\{PUBLIC_URL_(?:REGISTRY|IFRAME)_[A-Z0-9_]+\}\}/g,
    "",
  );
  if (withoutExactTokens.includes("{{PUBLIC_URL")) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_UNRESOLVED",
      `${safePath} contains an incomplete public-reference token`,
    );
  }
  if (PUBLIC_KEY_LOOKALIKE.test(withoutExactTokens)) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_TOKEN_LOOKALIKE",
      `${safePath} contains a public-reference key without its complete token carrier`,
    );
  }

  for (const block of jsonBlocks) {
    try {
      JSON.parse(block.body);
    } catch {
      throw new PublicReferenceContractError(
        "PUBLIC_REFERENCE_JSON_SOURCE",
        `${safePath} contains token-bearing JSON-LD that does not parse`,
      );
    }
  }

  return {
    keys: new Set(tokens.map((token) => token.key)),
    occurrenceCount: tokens.length,
    anchorCount:
      registryAnchors.length +
      iframeCarriers.filter((carrier) => carrier.tagName === "a").length,
    iframeCount: iframeCarriers.filter(
      (carrier) => carrier.tagName === "iframe",
    ).length,
    jsonLdCount: jsonCarriers.length,
  };
}

function normalizedSafePath(safePath) {
  return safePath.split(sep).join("/");
}

export function inspectProfessionalProfileScript(
  source,
  safePath = PUBLIC_AUTHOR_PROFILE_SCRIPT_PATH,
) {
  if (normalizedSafePath(safePath) !== PUBLIC_AUTHOR_PROFILE_SCRIPT_PATH) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_TOKEN_SCOPE",
      `${safePath} is outside the approved professional-profile script carrier`,
    );
  }
  const tokens = tokenOccurrences(source);
  if (tokens.length === 0) {
    if (PUBLIC_KEY_LOOKALIKE.test(source)) {
      throw new PublicReferenceContractError(
        "PUBLIC_REFERENCE_TOKEN_LOOKALIKE",
        `${safePath} contains a public-reference key without its complete token carrier`,
      );
    }
    return {
      keys: new Set(),
      occurrenceCount: 0,
      anchorCount: 0,
      iframeCount: 0,
      jsonLdCount: 0,
    };
  }

  if (tokens.some((token) => token.key !== PUBLIC_AUTHOR_PROFILE_KEY)) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_TOKEN_NAMESPACE",
      `${safePath} may carry only the exact ${PUBLIC_AUTHOR_PROFILE_KEY} public-reference token`,
    );
  }
  if (tokens.length !== 1) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_PROFILE_CARRIER",
      `${safePath} needs exactly one professional-profile token carrier`,
    );
  }

  const assignmentPattern = new RegExp(
    `\\bvar\\s+professionalProfileRoute\\s*=\\s*(["'])\\{\\{${PUBLIC_AUTHOR_PROFILE_KEY}\\}\\}\\1\\s*;`,
    "g",
  );
  const assignments = [...source.matchAll(assignmentPattern)];
  const routeUses = source.match(/\bprofessionalProfileRoute\b/g) ?? [];
  const linkUses = source.match(/\bprofessionalProfileLink\b/g) ?? [];
  const guardedLinkPattern = /if\s*\(professionalProfileRoute\.indexOf\(["']\{\{PUBLIC_URL_["']\)\s*===\s*-1\)\s*\{[\s\S]*?\bvar\s+professionalProfileLink\s*=\s*element\(["']a["'],\s*["']["'],\s*["']Professional profile["']\)\s*;[\s\S]*?\bprofessionalProfileLink\.href\s*=\s*professionalProfileRoute\s*;[\s\S]*?\bnetwork\.appendChild\(professionalProfileLink\)\s*;\s*\}\s*else\s*\{[\s\S]*?\bnetwork\.appendChild\(\s*element\(\s*["']span["'],\s*["']super-footer__reserved["'],\s*["']Professional profile available in the public build["'],?\s*\)\s*,?\s*\)\s*;\s*\}/g;
  const guardedLinks = [...source.matchAll(guardedLinkPattern)];
  if (
    assignments.length !== 1 ||
    routeUses.length !== 3 ||
    linkUses.length !== 4 ||
    guardedLinks.length !== 1
  ) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_PROFILE_CARRIER",
      `${safePath} needs one guarded professional-profile link, its source-mode availability text, and no additional destination sinks`,
    );
  }

  const withoutExactToken = source.replace(
    `{{${PUBLIC_AUTHOR_PROFILE_KEY}}}`,
    "",
  );
  if (PUBLIC_KEY_LOOKALIKE.test(withoutExactToken)) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_TOKEN_LOOKALIKE",
      `${safePath} contains a public-reference key outside its exact professional-profile carrier`,
    );
  }

  return {
    keys: new Set([PUBLIC_AUTHOR_PROFILE_KEY]),
    occurrenceCount: 1,
    anchorCount: 1,
    iframeCount: 0,
    jsonLdCount: 0,
  };
}

async function inventoryTree(sourceRoot, htmlRoot, iframeCarrierPolicies = null) {
  const sourceState = await lstatIfPresent(sourceRoot);
  if (!sourceState?.isDirectory() || sourceState.isSymbolicLink()) {
    throw new PublicReferenceOperationalError(
      "PUBLIC_REFERENCE_SOURCE_UNAVAILABLE",
      "the authored public-reference source directory is unavailable",
    );
  }
  if (!isPublicReferencePathWithin(sourceRoot, htmlRoot)) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_HTML_SCOPE",
      "the authored HTML root must be inside the copied source tree",
    );
  }

  const files = [];
  const htmlFiles = [];
  const scriptFiles = [];
  const keys = new Set();
  let occurrenceCount = 0;
  let anchorCount = 0;
  let iframeCount = 0;
  let jsonLdCount = 0;

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const path = join(directory, entry.name);
      const safePath = relative(sourceRoot, path);
      if (entry.isSymbolicLink()) {
        throw new PublicReferenceContractError(
          "PUBLIC_REFERENCE_SOURCE_SYMLINK",
          `${safePath} is a symbolic link; the materialized subtree accepts regular files and directories`,
        );
      }
      if (entry.isDirectory()) {
        await visit(path);
        continue;
      }
      if (!entry.isFile()) {
        throw new PublicReferenceContractError(
          "PUBLIC_REFERENCE_SOURCE_ENTRY",
          `${safePath} is not a regular file or directory`,
        );
      }

      if (entry.name === ".env" || entry.name.startsWith(".env.")) {
        throw new PublicReferenceContractError(
          "PUBLIC_REFERENCE_SOURCE_CONFIG",
          `${safePath} is configuration inside the copied source tree; keep build settings in their ignored external receiver`,
        );
      }

      files.push(safePath);
      const contents = await readFile(path);
      const searchable = contents.toString("utf8");
      if (containsDirectNotionPageUrl(searchable)) {
        throw new PublicReferenceContractError(
          "PUBLIC_REFERENCE_DIRECT_NOTION_URL",
          `${safePath} contains a direct Notion page route; use a Registry-scoped semantic key or keep the coordinate in the authorized resolver`,
        );
      }

      const isMaterializedHtml =
        isPublicReferencePathWithin(htmlRoot, path) &&
        extname(path).toLowerCase() === ".html";
      if (!isMaterializedHtml) {
        if (normalizedSafePath(safePath) === PUBLIC_AUTHOR_PROFILE_SCRIPT_PATH) {
          const inspection = inspectProfessionalProfileScript(searchable, safePath);
          scriptFiles.push({ path, safePath, inspection, source: searchable });
          occurrenceCount += inspection.occurrenceCount;
          anchorCount += inspection.anchorCount;
          for (const key of inspection.keys) keys.add(key);
          continue;
        }
        if (searchable.includes("{{PUBLIC_URL")) {
          throw new PublicReferenceContractError(
            "PUBLIC_REFERENCE_TOKEN_SCOPE",
            `${safePath} contains a public-reference token outside materialized Context Canvas HTML`,
          );
        }
        continue;
      }

      const html = searchable;
      const inspection = inspectPublicReferenceHtml(
        html,
        safePath,
        iframeCarrierPolicies,
      );
      htmlFiles.push({ path, safePath, inspection, source: html });
      occurrenceCount += inspection.occurrenceCount;
      anchorCount += inspection.anchorCount;
      iframeCount += inspection.iframeCount;
      jsonLdCount += inspection.jsonLdCount;
      for (const key of inspection.keys) keys.add(key);
    }
  }

  try {
    await visit(sourceRoot);
  } catch (error) {
    if (
      error instanceof PublicReferenceContractError ||
      error instanceof PublicReferenceOperationalError
    ) {
      throw error;
    }
    throw new PublicReferenceOperationalError(
      "PUBLIC_REFERENCE_SOURCE_READ",
      "the authored public-reference source could not be inventoried",
      { cause: error },
    );
  }

  return {
    files,
    htmlFiles,
    scriptFiles,
    keys,
    occurrenceCount,
    anchorCount,
    iframeCount,
    jsonLdCount,
  };
}

function relevantKeyAssignments(source) {
  const assignments = new Map();
  const duplicates = new Set();

  for (const line of source.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (!match || !match[1].startsWith("PUBLIC_URL_")) continue;
    const key = match[1];
    if (assignments.has(key)) duplicates.add(key);
    assignments.set(key, true);
  }

  return { assignments: new Set(assignments.keys()), duplicates };
}

function validateDestination(key, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_VALUE_MISSING",
      `${key} needs an approved destination in .env.public or the process environment`,
    );
  }
  if (/[\x00-\x1F\x7F]/.test(value)) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_VALUE_CONTROL_CHARACTER",
      `${key} contains a control character`,
    );
  }
  if (value.trim() !== value) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_VALUE_WHITESPACE",
      `${key} must not contain leading or trailing whitespace`,
    );
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_VALUE_URL",
      `${key} must be an absolute HTTPS URL`,
    );
  }
  if (url.protocol !== "https:") {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_VALUE_PROTOCOL",
      `${key} must use HTTPS`,
    );
  }
  if (url.username !== "" || url.password !== "") {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_VALUE_CREDENTIAL",
      `${key} must not contain an embedded username or password`,
    );
  }
  const parameterNames = [
    ...url.searchParams.keys(),
    ...url.hash
      .slice(1)
      .split(/[?&;]/)
      .filter((part) => part.includes("="))
      .map((part) => part.slice(0, part.indexOf("="))),
  ];
  for (const parameterName of parameterNames) {
    let decodedName = parameterName;
    try {
      decodedName = decodeURIComponent(parameterName.replaceAll("+", " "));
    } catch {
      // URL parsing already established a valid destination. An undecodable
      // parameter name remains outside the recognized credential-name set.
    }
    const normalizedName = decodedName.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (
      CREDENTIAL_PARAMETER_NAMES.has(normalizedName) ||
      /^(?:awsaccesskeyid|googleaccessid|xamz(?:credential|securitytoken|signature)|xgoog(?:credential|signature))$/.test(
        normalizedName,
      )
    ) {
      throw new PublicReferenceContractError(
        "PUBLIC_REFERENCE_VALUE_CREDENTIAL",
        `${key} must not contain a credential-bearing query or fragment parameter`,
      );
    }
  }
  return url.href;
}

function validateIframeDestination(key, value) {
  const normalized = validateDestination(key, value);
  const url = new URL(normalized);
  const authority = /^https:\/\/([^/?#]+)/i.exec(value)?.[1] ?? "";

  if (url.hostname !== "iframes.vik.guru") {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_IFRAME_HOST",
      `${key} must use the approved iframes.vik.guru host`,
    );
  }
  if (authority.includes(":")) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_IFRAME_PORT",
      `${key} must use the host's standard HTTPS port without an explicit port`,
    );
  }
  if (value.includes("?") || value.includes("#")) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_IFRAME_ROUTE",
      `${key} must use a path-only hosted iframe destination`,
    );
  }
  if (normalized !== value) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_IFRAME_ROUTE",
      `${key} must use an already-normalized hosted iframe destination`,
    );
  }

  const pathSegments = url.pathname.slice(1, -1).split("/");
  const hasVersionedRoute =
    url.pathname.endsWith("/") &&
    pathSegments[0] === "v1" &&
    pathSegments.length === 3 &&
    /^[a-z0-9]+$/.test(pathSegments[1]) &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pathSegments[2]);
  if (!hasVersionedRoute) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_IFRAME_ROUTE",
      `${key} must use one normalized /v1/{family}/{route}/ destination with a trailing slash`,
    );
  }

  const expectedKey = `${PUBLIC_IFRAME_NAMESPACE}${pathSegments
    .slice(1)
    .map((segment) => segment.replaceAll("-", "_").toUpperCase())
    .join("_")}`;
  if (key !== expectedKey) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_IFRAME_KEY_MISMATCH",
      `${key} does not match its configured hosted iframe route`,
    );
  }
  return normalized;
}

export async function resolvePublicReferenceDestinations(
  keys,
  {
    configPath = PUBLIC_REFERENCE_CONFIG,
    environment = process.env,
    configurationSource,
  } = {},
) {
  if (configurationSource !== undefined && typeof configurationSource !== "string") {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_CONFIG_SOURCE",
      "the supplied public-reference configuration source must be text",
    );
  }
  let fileSource = configurationSource ?? "";
  if (configurationSource === undefined) {
    try {
      fileSource = await readFile(configPath, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw new PublicReferenceOperationalError(
          "PUBLIC_REFERENCE_CONFIG_READ",
          "the public-reference configuration could not be read",
          { cause: error },
        );
      }
    }
  }

  const assignmentInfo = relevantKeyAssignments(fileSource);
  if (assignmentInfo.duplicates.size > 0) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_CONFIG_DUPLICATE",
      `the configuration assigns ${[...assignmentInfo.duplicates].sort().join(", ")} more than once`,
    );
  }

  let fileValues = {};
  try {
    fileValues = fileSource === "" ? {} : parseEnv(fileSource);
  } catch {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_CONFIG_SYNTAX",
      "the public-reference configuration is not valid environment-file syntax",
    );
  }

  const unsupportedAssignments = [...assignmentInfo.assignments]
    .filter(
      (key) =>
        key !== PUBLIC_AUTHOR_PROFILE_KEY &&
        !PUBLIC_REFERENCE_NAMESPACES.some((namespace) =>
          key.startsWith(namespace),
        ),
    )
    .sort();
  if (unsupportedAssignments.length > 0) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_CONFIG_NAMESPACE",
      `the configuration includes unsupported public-reference settings: ${unsupportedAssignments.join(", ")}`,
    );
  }

  const resolved = new Map();
  for (const key of [...keys].sort()) {
    const processValue = Object.hasOwn(environment, key) ? environment[key] : undefined;
    const value = processValue === undefined ? fileValues[key] : processValue;
    resolved.set(
      key,
      key.startsWith(PUBLIC_IFRAME_NAMESPACE)
        ? validateIframeDestination(key, value)
        : validateDestination(key, value),
    );
  }
  return resolved;
}

function escapeHtmlAttribute(value, quote) {
  let escaped = value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  if (quote === '"') escaped = escaped.replaceAll('"', "&quot;");
  if (quote === "'") escaped = escaped.replaceAll("'", "&#39;");
  return escaped;
}

function jsonStringForHtml(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003C");
}

function jsonStringForJavaScript(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003C")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function replaceHtmlAttribute(tag, name, value) {
  const pattern = new RegExp(
    `(\\s${name}\\s*=\\s*)(["'])([\\s\\S]*?)\\2`,
    "i",
  );
  return tag.replace(pattern, (_carrier, prefix, quote) =>
    `${prefix}${quote}${escapeHtmlAttribute(value, quote)}${quote}`,
  );
}

export function materializePublicReferenceHtml(
  html,
  destinations,
  safePath = "Context Canvas HTML",
  iframeCarrierPolicies = null,
) {
  const expected = inspectPublicReferenceHtml(
    html,
    safePath,
    iframeCarrierPolicies,
  );
  let anchorCount = 0;
  let iframeCount = 0;
  let jsonLdCount = 0;

  let materialized = html.replace(/<a\b[^>]*>/gi, (tag) =>
    tag.replace(
      /(\bhref\s*=\s*)(["'])\{\{(PUBLIC_URL_REGISTRY_[A-Z0-9_]+)\}\}\2/i,
      (carrier, prefix, quote, key) => {
        const value = destinations.get(key);
        if (value === undefined) {
          throw new PublicReferenceContractError(
            "PUBLIC_REFERENCE_VALUE_MISSING",
            `${key} needs an approved destination before ${safePath} can materialize`,
          );
        }
        anchorCount += 1;
        return `${prefix}${quote}${escapeHtmlAttribute(value, quote)}${quote}`;
      },
    ),
  );

  materialized = materialized.replace(
    /<(iframe|a)\b[^>]*>/gi,
    (tag, rawTagName) => {
      const tagName = rawTagName.toLowerCase();
      const publicName =
        tagName === "iframe" ? "data-public-src" : "data-public-href";
      const localName = tagName === "iframe" ? "src" : "href";
      const publicMatches = attributeMatches(tag, publicName);
      if (publicMatches.length === 0) return tag;

      const token = /^\{\{(PUBLIC_URL_IFRAME_[A-Z0-9_]+)\}\}$/.exec(
        publicMatches[0][2],
      );
      const key = token?.[1];
      const value = key === undefined ? undefined : destinations.get(key);
      if (value === undefined) {
        throw new PublicReferenceContractError(
          "PUBLIC_REFERENCE_VALUE_MISSING",
          `${key ?? PUBLIC_IFRAME_NAMESPACE} needs an approved destination before ${safePath} can materialize`,
        );
      }

      if (tagName === "iframe") iframeCount += 1;
      else anchorCount += 1;
      const materializedCarrier = replaceHtmlAttribute(tag, publicName, value);
      if (tagName === "a") {
        // The hosted route belongs to the embedded view. The adjacent full-view
        // link deliberately keeps its Context Canvas prototype fallback so a
        // visitor can open the base artifact rather than a second hosted copy.
        return materializedCarrier;
      }
      return replaceHtmlAttribute(materializedCarrier, localName, value);
    },
  );

  materialized = materialized.replace(
    /(<script\b[^>]*\btype\s*=\s*(["'])application\/ld\+json\2[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (script, open, _quote, body, close) => {
      if (!body.includes("PUBLIC_URL")) return script;
      const transformed = body.replace(
        /"\{\{(PUBLIC_URL_(?:REGISTRY|IFRAME)_[A-Z0-9_]+)\}\}"/g,
        (carrier, key) => {
          const value = destinations.get(key);
          if (value === undefined) {
            throw new PublicReferenceContractError(
              "PUBLIC_REFERENCE_VALUE_MISSING",
              `${key} needs an approved destination before ${safePath} can materialize`,
            );
          }
          jsonLdCount += 1;
          return jsonStringForHtml(value);
        },
      );
      try {
        JSON.parse(transformed);
      } catch {
        throw new PublicReferenceContractError(
          "PUBLIC_REFERENCE_JSON_OUTPUT",
          `${safePath} produced JSON-LD that does not parse`,
        );
      }
      return `${open}${transformed}${close}`;
    },
  );

  if (materialized.includes("{{PUBLIC_URL")) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_UNRESOLVED",
      `${safePath} contains an unresolved public-reference token after materialization`,
    );
  }
  if (
    anchorCount !== expected.anchorCount ||
    iframeCount !== expected.iframeCount ||
    jsonLdCount !== expected.jsonLdCount
  ) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_CARRIER_COUNT",
      `${safePath} did not materialize every accepted anchor, iframe, and JSON-LD carrier`,
    );
  }

  return materialized;
}

export function materializeProfessionalProfileScript(
  source,
  destinations,
  safePath = PUBLIC_AUTHOR_PROFILE_SCRIPT_PATH,
) {
  const expected = inspectProfessionalProfileScript(source, safePath);
  if (expected.occurrenceCount === 0) return source;

  const value = destinations.get(PUBLIC_AUTHOR_PROFILE_KEY);
  if (value === undefined) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_VALUE_MISSING",
      `${PUBLIC_AUTHOR_PROFILE_KEY} needs an approved destination before ${safePath} can materialize`,
    );
  }

  const materialized = source.replace(
    new RegExp(
      `(["'])\\{\\{${PUBLIC_AUTHOR_PROFILE_KEY}\\}\\}\\1`,
    ),
    () => jsonStringForJavaScript(value),
  );
  if (/\{\{PUBLIC_URL_[A-Z0-9_]+\}\}/.test(materialized)) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_UNRESOLVED",
      `${safePath} contains an unresolved public-reference token after materialization`,
    );
  }
  return materialized;
}

async function readOutputMarker(outputRoot) {
  let marker;
  try {
    marker = JSON.parse(await readFile(join(outputRoot, OUTPUT_MARKER), "utf8"));
  } catch {
    return false;
  }
  return (
    marker?.format === OUTPUT_FORMAT &&
    marker?.builder === "tools/materialize-public-references.mjs"
  );
}

async function publishGeneration(
  stagedOutput,
  outputRoot,
  stagingRoot,
  renamePath = rename,
) {
  const current = await lstatIfPresent(outputRoot);
  if (current) {
    if (
      !current.isDirectory() ||
      current.isSymbolicLink() ||
      !(await readOutputMarker(outputRoot))
    ) {
      throw new PublicReferenceContractError(
        "PUBLIC_REFERENCE_OUTPUT_OWNERSHIP",
        "the existing generated-output path is not owned by this materializer",
      );
    }
  }

  const previous = join(stagingRoot, "previous-generation");
  let previousMoved = false;
  if (current) {
    await renamePath(outputRoot, previous);
    previousMoved = true;
  }

  try {
    await renamePath(stagedOutput, outputRoot);
  } catch (error) {
    if (previousMoved) {
      try {
        await renamePath(previous, outputRoot);
      } catch (restoreError) {
        const recoveryError = new PublicReferenceOperationalError(
          "PUBLIC_REFERENCE_OUTPUT_RESTORE",
          "the prior generated artifact could not be restored automatically; keep the ignored .public-references-* recovery directory until it is recovered",
          { cause: restoreError },
        );
        recoveryError.preserveStaging = true;
        throw recoveryError;
      }
    }
    throw new PublicReferenceOperationalError(
      "PUBLIC_REFERENCE_OUTPUT_PUBLISH",
      "the validated public-reference generation could not be published",
      { cause: error },
    );
  }

  if (previousMoved) {
    await rm(previous, { recursive: true, force: true });
  }
}

async function loadIframeRouteProfiles(manifestPath) {
  if (manifestPath === null) return null;

  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new PublicReferenceContractError(
        "PUBLIC_REFERENCE_IFRAME_POLICY_MANIFEST",
        "the iframe route manifest must contain valid JSON",
      );
    }
    throw new PublicReferenceOperationalError(
      "PUBLIC_REFERENCE_IFRAME_POLICY_MANIFEST_READ",
      "the iframe route manifest could not be read",
      { cause: error },
    );
  }

  const fail = (message) => {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_IFRAME_POLICY_MANIFEST",
      message,
    );
  };
  if (
    manifest === null ||
    typeof manifest !== "object" ||
    Array.isArray(manifest) ||
    manifest.host !== "iframes.vik.guru" ||
    manifest.carrier_contract?.sandbox_posture !== "exact_per_route_allowlist" ||
    manifest.carrier_contract?.permissions_policy_posture !== "exact_per_route_allowlist" ||
    !Array.isArray(manifest.routes)
  ) {
    fail("the iframe route manifest needs its expected host, exact carrier postures, and routes");
  }

  const profiles = new Map();
  for (const route of manifest.routes) {
    const policy = route?.carrier_policy;
    const ownsContextCanvasSource =
      route?.kind === "supplemental_instrument" &&
      route?.source_root === PUBLIC_IFRAME_CONTEXT_CANVAS_SOURCE_ROOT;
    const ownsCorePackSource =
      ["hub", "prototype"].includes(route?.kind) &&
      route?.source_root === undefined;
    if (
      typeof route?.source_file !== "string" ||
      basename(route.source_file) !== route.source_file ||
      (!ownsCorePackSource && !ownsContextCanvasSource) ||
      typeof route?.public_alias !== "string" ||
      !Array.isArray(policy?.sandbox_tokens) ||
      !Array.isArray(policy?.permissions_policy) ||
      policy.sandbox_tokens.some((value) => typeof value !== "string") ||
      policy.permissions_policy.some((value) => typeof value !== "string")
    ) {
      fail("each iframe route needs a regular source name, public alias, and carrier policy arrays");
    }

    let routeUrl;
    try {
      routeUrl = new URL(route.public_alias, `https://${manifest.host}`);
    } catch {
      fail("each iframe route alias must form a URL on the declared host");
    }
    if (
      routeUrl.origin !== `https://${manifest.host}` ||
      routeUrl.pathname !== route.public_alias ||
      routeUrl.search !== "" ||
      routeUrl.hash !== "" ||
      !route.public_alias.startsWith("/v1/") ||
      !route.public_alias.endsWith("/") ||
      profiles.has(routeUrl.href)
    ) {
      fail("each iframe route alias must be unique, normalized, versioned, and host-local");
    }
    const localFallback = ownsContextCanvasSource
      ? `context-canvas/${route.source_file}`
      : `${PUBLIC_IFRAME_LOCAL_ROOT}/${route.source_file}`;
    profiles.set(routeUrl.href, {
      localFallback,
      sandboxTokens: [...policy.sandbox_tokens],
      allowFeatures: [...policy.permissions_policy],
    });
  }
  return profiles;
}

function carrierPoliciesForDestinations(destinations, routeProfiles) {
  if (routeProfiles === null) return null;
  const policies = new Map();
  for (const [key, destination] of destinations) {
    if (!key.startsWith(PUBLIC_IFRAME_NAMESPACE)) continue;
    const profile = routeProfiles.get(destination);
    if (profile === undefined) {
      throw new PublicReferenceContractError(
        "PUBLIC_REFERENCE_IFRAME_POLICY",
        `${key} needs an exact profile in the iframe route manifest`,
      );
    }
    policies.set(key, profile);
  }
  return policies;
}

export async function inspectPublicReferenceSource({
  sourceRoot = PUBLIC_REFERENCE_SOURCE,
  htmlRoot = join(sourceRoot, "context-canvas"),
} = {}) {
  return inventoryTree(resolve(sourceRoot), resolve(htmlRoot));
}

export async function materializePublicReferences({
  sourceRoot = PUBLIC_REFERENCE_SOURCE,
  htmlRoot = join(sourceRoot, "context-canvas"),
  outputRoot = PUBLIC_REFERENCE_OUTPUT,
  configPath = PUBLIC_REFERENCE_CONFIG,
  environment = process.env,
  outputBoundaryRoot = REPOSITORY_ROOT,
  publishRename = rename,
  iframeRouteManifestPath,
} = {}) {
  const source = resolve(sourceRoot);
  const html = resolve(htmlRoot);
  const output = resolve(outputRoot);
  const config = resolve(configPath);
  const carrierManifest = iframeRouteManifestPath ?? (
    source === resolve(PUBLIC_REFERENCE_SOURCE)
      ? PUBLIC_IFRAME_ROUTE_MANIFEST
      : null
  );
  assertSeparateTrees(source, output);
  if (!isPublicReferencePathWithin(source, html)) {
    throw new PublicReferenceContractError(
      "PUBLIC_REFERENCE_HTML_SCOPE",
      "the authored HTML root must be inside the copied source tree",
    );
  }

  const outputParent = await prepareOutputParent(outputBoundaryRoot, output);
  const stagingRoot = await mkdtemp(join(outputParent, ".public-references-"));
  const stagedOutput = join(stagingRoot, "generation");
  let preserveStaging = false;
  let inventory;

  try {
    await cp(source, stagedOutput, {
      recursive: true,
      force: false,
      errorOnExist: true,
      dereference: false,
      preserveTimestamps: true,
    });

    const stagedHtmlRoot = join(stagedOutput, relative(source, html));
    inventory = await inventoryTree(stagedOutput, stagedHtmlRoot);
    const destinations = await resolvePublicReferenceDestinations(
      inventory.keys,
      { configPath: config, environment },
    );
    const routeProfiles = await loadIframeRouteProfiles(
      carrierManifest,
    );
    const iframeCarrierPolicies = carrierPoliciesForDestinations(
      destinations,
      routeProfiles,
    );

    for (const record of inventory.htmlFiles) {
      if (record.inspection.occurrenceCount === 0) continue;
      const materialized = materializePublicReferenceHtml(
        record.source,
        destinations,
        record.safePath,
        iframeCarrierPolicies,
      );
      await writeFile(join(stagedOutput, record.safePath), materialized, "utf8");
    }

    for (const record of inventory.scriptFiles) {
      if (record.inspection.occurrenceCount === 0) continue;
      const materialized = materializeProfessionalProfileScript(
        record.source,
        destinations,
        record.safePath,
      );
      await writeFile(join(stagedOutput, record.safePath), materialized, "utf8");
    }

    await writeFile(
      join(stagedOutput, OUTPUT_MARKER),
      `${JSON.stringify(
        {
          format: OUTPUT_FORMAT,
          builder: "tools/materialize-public-references.mjs",
          source: "context-canvas-project-surface",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    await publishGeneration(stagedOutput, output, stagingRoot, publishRename);
  } catch (error) {
    preserveStaging = error?.preserveStaging === true;
    if (
      error instanceof PublicReferenceContractError ||
      error instanceof PublicReferenceOperationalError
    ) {
      throw error;
    }
    throw new PublicReferenceOperationalError(
      "PUBLIC_REFERENCE_BUILD_IO",
      "the generated public-reference artifact could not be completed",
      { cause: error },
    );
  } finally {
    if (!preserveStaging) {
      await rm(stagingRoot, { recursive: true, force: true }).catch(() => {});
    }
  }

  return {
    sourceFileCount: inventory.files.length,
    htmlFileCount: inventory.htmlFiles.length,
    scriptFileCount: inventory.scriptFiles.length,
    affectedHtmlFileCount: inventory.htmlFiles.filter(
      (record) => record.inspection.occurrenceCount > 0,
    ).length,
    affectedScriptFileCount: inventory.scriptFiles.filter(
      (record) => record.inspection.occurrenceCount > 0,
    ).length,
    affectedSourceFileCount: [
      ...inventory.htmlFiles,
      ...inventory.scriptFiles,
    ].filter((record) => record.inspection.occurrenceCount > 0).length,
    keyCount: inventory.keys.size,
    occurrenceCount: inventory.occurrenceCount,
    anchorCount: inventory.anchorCount,
    iframeCount: inventory.iframeCount,
    jsonLdCount: inventory.jsonLdCount,
    keys: [...inventory.keys].sort(),
  };
}

function printHelp() {
  console.log(`Materialize approved Context Canvas public references.

Usage:
  node tools/materialize-public-references.mjs

Inputs:
  .env.public                 optional ignored file
  PUBLIC_URL_REGISTRY_*       process values override matching file values
  PUBLIC_URL_IFRAME_*         approved iframes.vik.guru/v1/ route values
  PUBLIC_URL_AUTHOR_PROFESSIONAL_PROFILE
                              approved professional-profile destination

Output:
  .public-reference-build/context-canvas-project-surface

The command has fixed repository-local source and output roots. It never prints
configured destination values.`);
}

async function main(arguments_) {
  if (arguments_.includes("--help") || arguments_.includes("-h")) {
    printHelp();
    return;
  }
  if (arguments_.length > 0) {
    throw new PublicReferenceOperationalError(
      "PUBLIC_REFERENCE_ARGUMENT",
      "this command accepts no arguments; use --help for the fixed build contract",
    );
  }

  const result = await materializePublicReferences();
  console.log(
    `Materialized ${result.occurrenceCount} public-reference carriers across ${result.affectedSourceFileCount} Context Canvas source files using ${result.keyCount} semantic keys.`,
  );
  console.log(
    "Generated artifact: .public-reference-build/context-canvas-project-surface",
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    if (error instanceof PublicReferenceContractError) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    if (error instanceof PublicReferenceOperationalError) {
      console.error(error.message);
      process.exitCode = 2;
      return;
    }
    console.error(
      "PUBLIC_REFERENCE_UNEXPECTED: the public-reference build ended unexpectedly",
    );
    process.exitCode = 2;
  });
}

import { constants as fsConstants } from "node:fs";
import { access, lstat, readFile, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canvasDirectory = path.join(repositoryRoot, "context-canvas-project-surface", "context-canvas");
const catalogPath = path.join(canvasDirectory, "debriefs.html");
const catalogRelativePath = path.relative(repositoryRoot, catalogPath);
const startMarker = "  <!-- debrief-case-brief-projections:start -->";
const endMarker = "  <!-- debrief-case-brief-projections:end -->";
const insertionSentinel = "</main><!-- /content class on main -->";
const routePattern = /^[a-z0-9][a-z0-9-]*\.html$/;
const fragmentPattern = /^#[A-Za-z][A-Za-z0-9_.:-]*$/;
const expectedFieldLabels = [
  "Situation and stakes",
  "Scope and role",
  "Core constraint",
  "Key decision",
  "Outcome and evidence",
  "Relevance now"
];
const allowedElements = new Set([
  "a", "abbr", "br", "cite", "code", "dd", "div", "dl", "dt", "em", "h4", "li", "ol", "p", "q", "small", "span", "strong", "sub", "sup", "ul"
]);
const voidElements = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const rawTextElements = new Set(["script", "style", "textarea", "title"]);

class MaterializationError extends Error {
  constructor(message) {
    super(message);
    this.name = "MaterializationError";
  }
}

function fail(message) {
  throw new MaterializationError(message);
}

function escapeAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function decodeTextEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    nbsp: "\u00a0",
    ndash: "–",
    quot: '"',
    rarr: "→",
    rdquo: "”",
    rsquo: "’",
    times: "×"
  };
  return value.replace(/&(#(?:x[0-9a-f]+|[0-9]+)|[a-z][a-z0-9]+);/gi, (entity, key) => {
    if (key[0] === "#") {
      const hexadecimal = key[1].toLowerCase() === "x";
      const codePoint = Number.parseInt(key.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      if (!Number.isSafeInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
        fail("Case Brief source contains an invalid numeric character reference");
      }
      return String.fromCodePoint(codePoint);
    }
    return Object.prototype.hasOwnProperty.call(named, key.toLowerCase()) ? named[key.toLowerCase()] : entity;
  });
}

function normalizedText(node) {
  const value = node.children.map((child) => child.type === "text" ? child.value : normalizedText(child)).join("");
  return decodeTextEntities(value).replace(/\s+/g, " ").trim();
}

function findTagEnd(source, offset) {
  let quote = "";
  for (let index = offset; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = "";
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      return index;
    }
  }
  fail("HTML contains an unterminated tag");
}

function parseAttributes(source, fileLabel) {
  const attributes = new Map();
  let offset = 0;
  while (offset < source.length) {
    while (/\s/.test(source[offset] || "")) offset += 1;
    if (offset >= source.length) break;
    const nameMatch = /^[^\s=/>]+/.exec(source.slice(offset));
    if (!nameMatch) fail(`${fileLabel} contains a malformed attribute`);
    const name = nameMatch[0].toLowerCase();
    offset += nameMatch[0].length;
    if (attributes.has(name)) fail(`${fileLabel} contains the duplicate attribute ${name}`);
    while (/\s/.test(source[offset] || "")) offset += 1;
    let value = null;
    if (source[offset] === "=") {
      offset += 1;
      while (/\s/.test(source[offset] || "")) offset += 1;
      const quote = source[offset];
      if (quote === '"' || quote === "'") {
        const end = source.indexOf(quote, offset + 1);
        if (end === -1) fail(`${fileLabel} contains an unterminated ${name} attribute`);
        value = source.slice(offset + 1, end);
        offset = end + 1;
      } else {
        const valueMatch = /^[^\s>]+/.exec(source.slice(offset));
        if (!valueMatch) fail(`${fileLabel} contains an empty ${name} attribute`);
        value = valueMatch[0];
        offset += valueMatch[0].length;
      }
    }
    attributes.set(name, value);
  }
  return attributes;
}

function parseHtml(source, fileLabel) {
  const root = { type: "root", tag: "#root", attributes: new Map(), children: [] };
  const stack = [root];
  let offset = 0;

  while (offset < source.length) {
    if (source.startsWith("<!--", offset)) {
      const end = source.indexOf("-->", offset + 4);
      if (end === -1) fail(`${fileLabel} contains an unterminated comment`);
      offset = end + 3;
      continue;
    }
    if (source[offset] !== "<") {
      const next = source.indexOf("<", offset);
      const end = next === -1 ? source.length : next;
      stack.at(-1).children.push({ type: "text", value: source.slice(offset, end) });
      offset = end;
      continue;
    }
    if (/^<!doctype\b/i.test(source.slice(offset))) {
      offset = findTagEnd(source, offset + 2) + 1;
      continue;
    }
    const tagEnd = findTagEnd(source, offset + 1);
    let token = source.slice(offset + 1, tagEnd).trim();
    if (token.startsWith("!")) {
      offset = tagEnd + 1;
      continue;
    }
    if (token.startsWith("/")) {
      const tag = token.slice(1).trim().toLowerCase();
      if (!/^[a-z][a-z0-9:-]*$/.test(tag) || stack.length === 1 || stack.at(-1).tag !== tag) {
        fail(`${fileLabel} contains an unmatched closing ${tag || "tag"}`);
      }
      stack.pop();
      offset = tagEnd + 1;
      continue;
    }

    const selfClosing = token.endsWith("/");
    if (selfClosing) token = token.slice(0, -1).trimEnd();
    const nameMatch = /^([a-zA-Z][a-zA-Z0-9:-]*)/.exec(token);
    if (!nameMatch) fail(`${fileLabel} contains a malformed start tag`);
    const tag = nameMatch[1].toLowerCase();
    const node = {
      type: "element",
      tag,
      attributes: parseAttributes(token.slice(nameMatch[0].length), fileLabel),
      children: []
    };
    stack.at(-1).children.push(node);
    offset = tagEnd + 1;

    if (rawTextElements.has(tag) && !selfClosing) {
      const closingPattern = new RegExp(`<\\/${tag}\\s*>`, "ig");
      closingPattern.lastIndex = offset;
      const closing = closingPattern.exec(source);
      if (!closing) fail(`${fileLabel} contains an unterminated ${tag} element`);
      node.children.push({ type: "text", value: source.slice(offset, closing.index) });
      offset = closing.index + closing[0].length;
    } else if (!selfClosing && !voidElements.has(tag)) {
      stack.push(node);
    }
  }
  if (stack.length !== 1) fail(`${fileLabel} contains an unterminated ${stack.at(-1).tag} element`);
  return root;
}

function descendants(node, predicate, found = []) {
  for (const child of node.children) {
    if (child.type !== "element") continue;
    if (predicate(child)) found.push(child);
    descendants(child, predicate, found);
  }
  return found;
}

function directElements(node) {
  return node.children.filter((child) => child.type === "element");
}

function hasAttribute(node, name, value = undefined) {
  if (!node.attributes.has(name)) return false;
  return value === undefined || node.attributes.get(name) === value;
}

function one(nodes, description, fileLabel) {
  if (nodes.length !== 1) fail(`${fileLabel} must contain exactly one ${description}; found ${nodes.length}`);
  return nodes[0];
}

function validateRoute(route, source = catalogRelativePath) {
  if (!routePattern.test(route) || route.includes("..") || route.includes("/") || route.includes("\\")) {
    fail(`${source} contains an unsafe Case Brief route: ${JSON.stringify(route)}`);
  }
  const resolved = path.resolve(canvasDirectory, route);
  if (path.dirname(resolved) !== canvasDirectory) fail(`${source} contains a Case Brief route outside the Context Canvas directory`);
  return resolved;
}

function extractRoutes(catalogTree) {
  const carriers = descendants(catalogTree, (node) => hasAttribute(node, "data-case-brief-routes"));
  const routes = [];
  const seen = new Set();
  if (carriers.length === 0) fail(`${catalogRelativePath} contains no Case Brief route carriers`);
  for (const carrier of carriers) {
    const value = carrier.attributes.get("data-case-brief-routes") || "";
    const carrierRoutes = value.split(/\s+/).filter(Boolean);
    if (carrierRoutes.length === 0) fail(`${catalogRelativePath} contains an empty data-case-brief-routes attribute`);
    for (const route of carrierRoutes) {
      validateRoute(route);
      if (seen.has(route)) fail(`${catalogRelativePath} declares the duplicate Case Brief route ${route}`);
      seen.add(route);
      routes.push(route);
    }
  }
  return routes;
}

function validateSafeAttributes(node, route) {
  for (const [name, value] of node.attributes) {
    if (name === "href" && node.tag === "a") {
      if (typeof value !== "string" || !fragmentPattern.test(value)) {
        fail(`${route} contains an unsupported or unsafe Case Brief link: ${JSON.stringify(value)}`);
      }
      continue;
    }
    if (name === "class" && (node.tag === "h4" || node.tag === "ul" || node.tag === "ol")) {
      if (typeof value !== "string" || !/^[a-zA-Z0-9_-]+(?:\s+[a-zA-Z0-9_-]+)*$/.test(value)) {
        fail(`${route} contains an unsafe class value in its Case Brief projection`);
      }
      continue;
    }
    fail(`${route} contains the unsupported ${name} attribute in its Case Brief projection`);
  }
}

function renderSafeNode(node, route) {
  if (node.type === "text") return node.value.replace(/\s+/g, " ");
  if (!allowedElements.has(node.tag)) fail(`${route} contains the unsupported <${node.tag}> element in its Case Brief projection`);
  validateSafeAttributes(node, route);
  const attributes = [];
  for (const [name, value] of node.attributes) {
    if (name === "href") attributes.push(`href="${escapeAttribute(route + value)}"`);
    if (name === "class") attributes.push(`class="${escapeAttribute(value)}"`);
  }
  const open = attributes.length > 0 ? `<${node.tag} ${attributes.join(" ")}>` : `<${node.tag}>`;
  if (voidElements.has(node.tag)) return open;
  return `${open}${node.children.map((child) => renderSafeNode(child, route)).join("")}</${node.tag}>`;
}

function renderChildren(node, route) {
  return node.children.map((child) => renderSafeNode(child, route)).join("").trim();
}

function renderTemplate(route, source) {
  const fileLabel = path.relative(repositoryRoot, path.join(canvasDirectory, route));
  const tree = parseHtml(source, fileLabel);
  const main = one(descendants(tree, (node) => node.tag === "main"), "main element", fileLabel);
  const heading = one(descendants(main, (node) => node.tag === "h1"), "main h1", fileLabel);
  const sections = descendants(main, (node) => node.tag === "section" && hasAttribute(node, "id", "case-brief") && hasAttribute(node, "data-content-form", "case-brief"));
  const section = one(sections, "#case-brief[data-content-form='case-brief'] section", fileLabel);
  const sectionChildren = directElements(section);
  const orientationHeadingIndex = sectionChildren.findIndex((node) => node.tag === "h2");
  if (orientationHeadingIndex === -1 || !sectionChildren[orientationHeadingIndex + 1] || sectionChildren[orientationHeadingIndex + 1].tag !== "p") {
    fail(`${fileLabel} must place its Case Brief orientation paragraph directly after its h2`);
  }
  const orientationHeading = sectionChildren[orientationHeadingIndex];
  const orientation = sectionChildren[orientationHeadingIndex + 1];
  const fields = one(sectionChildren.filter((node) => node.tag === "dl" && (node.attributes.get("class") || "").split(/\s+/).includes("debrief-at-glance")), "direct Case Brief debrief-at-glance list", fileLabel);
  const fieldGroups = directElements(fields);
  if (fieldGroups.length !== expectedFieldLabels.length || fieldGroups.some((group) => group.tag !== "div")) {
    fail(`${fileLabel} must contain exactly six direct div field groups in its Case Brief scan`);
  }
  fieldGroups.forEach((group, index) => {
    const terms = directElements(group);
    if (terms.length !== 2 || terms[0].tag !== "dt" || terms[1].tag !== "dd") {
      fail(`${fileLabel} Case Brief field ${index + 1} must contain one dt followed by one dd`);
    }
    const label = normalizedText(terms[0]);
    if (label !== expectedFieldLabels[index]) {
      fail(`${fileLabel} Case Brief field ${index + 1} must be ${JSON.stringify(expectedFieldLabels[index])}; found ${JSON.stringify(label)}`);
    }
  });
  const basis = one(sectionChildren.filter((node) => {
    if (node.tag !== "p") return false;
    const firstElement = directElements(node)[0];
    return firstElement && firstElement.tag === "strong" && normalizedText(firstElement) === "Basis and limits:";
  }), "direct Basis and limits paragraph", fileLabel);
  const media = one(sectionChildren.filter((node) => node.tag === "div" && hasAttribute(node, "data-case-brief-media")), "direct related-media block", fileLabel);

  const fieldMarkup = fieldGroups.map((group) => `        <div>${renderChildren(group, route)}</div>`).join("\n");
  const mediaMarkup = renderChildren(media, route);
  return [
    `  <template data-case-brief-projection="${escapeAttribute(route)}" data-case-brief-title="${escapeAttribute(normalizedText(heading))}" data-case-brief-orientation-heading="${escapeAttribute(normalizedText(orientationHeading))}">`,
    `    <p class="debrief-preview-slug">${renderChildren(orientation, route)}</p>`,
    "    <dl class=\"debrief-preview-facts\">",
    fieldMarkup,
    "    </dl>",
    `    <p class="debrief-preview-note">${renderChildren(basis, route)}</p>`,
    "    <div class=\"debrief-card__case-brief-media\" data-case-brief-media>",
    `      ${mediaMarkup}`,
    "    </div>",
    "  </template>"
  ].join("\n");
}

function markerOffsets(source) {
  const starts = Array.from(source.matchAll(new RegExp(startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")), (match) => match.index);
  const ends = Array.from(source.matchAll(new RegExp(endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")), (match) => match.index);
  if (starts.length > 1 || ends.length > 1 || starts.length !== ends.length) {
    fail(`${catalogRelativePath} must contain either zero or one complete generated Case Brief projection block`);
  }
  if (starts.length === 0) return null;
  if (starts[0] >= ends[0]) fail(`${catalogRelativePath} contains Case Brief projection markers in the wrong order`);
  return { start: starts[0], end: ends[0] + endMarker.length };
}

function validateExistingTemplates(source, offsets, expectedRoutes, exact) {
  if (!offsets) {
    if (exact) fail(`${catalogRelativePath} is missing its generated Case Brief projection block`);
    return;
  }
  const blockTree = parseHtml(source.slice(offsets.start + startMarker.length, offsets.end - endMarker.length), `${catalogRelativePath} generated projection block`);
  const templates = descendants(blockTree, (node) => node.tag === "template" && hasAttribute(node, "data-case-brief-projection"));
  const routes = templates.map((template) => template.attributes.get("data-case-brief-projection"));
  const seen = new Set();
  routes.forEach((route) => {
    validateRoute(route, `${catalogRelativePath} generated projection block`);
    if (seen.has(route)) fail(`${catalogRelativePath} generated projection block contains duplicate template route ${route}`);
    seen.add(route);
  });
  if (exact && (routes.length !== expectedRoutes.length || routes.some((route, index) => route !== expectedRoutes[index]))) {
    fail(`${catalogRelativePath} generated projection routes differ from the authored Case Brief route order`);
  }
}

function materializedCatalog(source, block) {
  const offsets = markerOffsets(source);
  if (offsets) return source.slice(0, offsets.start) + block + source.slice(offsets.end);
  const sentinelIndex = source.indexOf(insertionSentinel);
  if (sentinelIndex === -1 || source.indexOf(insertionSentinel, sentinelIndex + 1) !== -1) {
    fail(`${catalogRelativePath} must contain exactly one materializer insertion sentinel`);
  }
  return source.slice(0, sentinelIndex) + block + "\n" + source.slice(sentinelIndex);
}

async function writeAtomically(destination, content) {
  const temporary = `${destination}.tmp-${process.pid}`;
  try {
    await access(temporary, fsConstants.F_OK).then(() => fail(`Refusing to replace the existing temporary file ${path.basename(temporary)}`), () => undefined);
    await writeFile(temporary, content, { encoding: "utf8", flag: "wx", mode: 0o644 });
    await rename(temporary, destination);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

export async function readAdmittedCaseBriefSource(sourcePath, {
  baseDirectory = canvasDirectory,
  fileLabel = path.relative(repositoryRoot, sourcePath)
} = {}) {
  const [baseRealPath, sourceEntry] = await Promise.all([
    realpath(baseDirectory),
    lstat(sourcePath).catch((error) => {
      if (error && error.code === "ENOENT") fail(`${fileLabel} is missing`);
      throw error;
    })
  ]);
  if (sourceEntry.isSymbolicLink() || !sourceEntry.isFile()) {
    fail(`${fileLabel} must be a regular source file rather than a symlink or special entry`);
  }
  const sourceRealPath = await realpath(sourcePath);
  if (path.dirname(sourceRealPath) !== baseRealPath) {
    fail(`${fileLabel} resolves outside its admitted source directory`);
  }
  return readFile(sourcePath, "utf8");
}

async function main() {
  const argumentsList = process.argv.slice(2);
  if (argumentsList.some((argument) => argument !== "--check") || argumentsList.filter((argument) => argument === "--check").length > 1) {
    fail("Usage: node tools/materialize-debrief-case-briefs.mjs [--check]");
  }
  const check = argumentsList.includes("--check");
  const catalog = await readFile(catalogPath, "utf8");
  const catalogTree = parseHtml(catalog, catalogRelativePath);
  const routes = extractRoutes(catalogTree);
  const offsets = markerOffsets(catalog);
  validateExistingTemplates(catalog, offsets, routes, check);

  const templates = [];
  for (const route of routes) {
    const sourcePath = validateRoute(route);
    const source = await readAdmittedCaseBriefSource(sourcePath);
    templates.push(renderTemplate(route, source));
  }
  const block = `${startMarker}\n${templates.join("\n")}\n${endMarker}`;
  const expected = materializedCatalog(catalog, block);

  if (check) {
    if (expected !== catalog) fail(`${catalogRelativePath} Case Brief projections are stale; run npm run build:debrief-case-briefs`);
    process.stdout.write(`Case Brief projections are current: ${routes.length} source routes.\n`);
    return;
  }
  if (expected !== catalog) await writeAtomically(catalogPath, expected);
  process.stdout.write(`Materialized ${routes.length} Case Brief projections in ${catalogRelativePath}.\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const message = error instanceof MaterializationError ? error.message : "Case Brief projection materialization failed";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}

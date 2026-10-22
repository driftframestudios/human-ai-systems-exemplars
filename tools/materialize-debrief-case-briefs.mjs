import './node-runtime-admission.mjs';
import { isDirectExecution } from './check-node-runtime.mjs';
import { constants as fsConstants } from "node:fs";
import { access, lstat, readFile, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canvasDirectory = path.join(repositoryRoot, "context-canvas-project-surface", "context-canvas");
const dataDirectory = path.join(repositoryRoot, "context-canvas-project-surface", "data");
const caseBriefSourcePath = path.join(dataDirectory, "debrief-case-briefs.source.html");
const caseBriefSourceRelativePath = path.relative(repositoryRoot, caseBriefSourcePath);
const catalogPath = path.join(canvasDirectory, "debriefs.html");
const catalogRelativePath = path.relative(repositoryRoot, catalogPath);
const startMarker = "  <!-- debrief-case-brief-projections:start -->";
const endMarker = "  <!-- debrief-case-brief-projections:end -->";
const insertionSentinel = "</main><!-- /content class on main -->";
const fullDebriefStartMarker = "          <!-- debrief-at-a-glance-projection:start -->";
const fullDebriefEndMarker = "          <!-- debrief-at-a-glance-projection:end -->";
const fullDebriefInsertionSentinel = "          <span id=\"case-brief\" aria-hidden=\"true\"></span>";
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
const expectedTrackKinds = Object.freeze({
  default: ["solution", "implementation"],
  "three-way-comparative-return.html": ["comparative", "return"]
});
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

export function formatMaterializationError(error) {
  if (error instanceof MaterializationError) return error.message;
  const code = error && typeof error.code === "string" ? ` (${error.code})` : "";
  const detail = error instanceof Error ? error.message : "unknown error";
  return `Case Brief projection materialization failed${code}: ${detail}`;
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

function renderSafeNode(node, route, fragmentPrefix = route) {
  if (node.type === "text") return node.value.replace(/\s+/g, " ");
  if (!allowedElements.has(node.tag)) fail(`${route} contains the unsupported <${node.tag}> element in its Case Brief projection`);
  validateSafeAttributes(node, route);
  const attributes = [];
  for (const [name, value] of node.attributes) {
    if (name === "href") attributes.push(`href="${escapeAttribute(fragmentPrefix + value)}"`);
    if (name === "class") attributes.push(`class="${escapeAttribute(value)}"`);
  }
  const open = attributes.length > 0 ? `<${node.tag} ${attributes.join(" ")}>` : `<${node.tag}>`;
  if (voidElements.has(node.tag)) return open;
  return `${open}${node.children.map((child) => renderSafeNode(child, route, fragmentPrefix)).join("")}</${node.tag}>`;
}

function renderChildren(node, route, fragmentPrefix = route) {
  return node.children.map((child) => renderSafeNode(child, route, fragmentPrefix)).join("").trim();
}

function assertAttributes(node, expected, fileLabel) {
  if (node.attributes.size !== expected.size) {
    fail(`${fileLabel} <${node.tag}> has unsupported or missing source-contract attributes`);
  }
  for (const [name, value] of expected) {
    if (!node.attributes.has(name) || node.attributes.get(name) !== value) {
      fail(`${fileLabel} <${node.tag}> must carry ${name}${value === null ? "" : `=${JSON.stringify(value)}`}`);
    }
  }
}

function assertTagAndAttributes(node, tag, expected, description, fileLabel) {
  if (!node || node.tag !== tag) fail(`${fileLabel} must contain ${description} as a direct <${tag}> element`);
  assertAttributes(node, new Map(expected), fileLabel);
}

function validateFieldGroups(fields, fileLabel) {
  const fieldGroups = directElements(fields);
  if (fieldGroups.length !== expectedFieldLabels.length || fieldGroups.some((group) => group.tag !== "div")) {
    fail(`${fileLabel} must contain exactly six ordered direct div field groups`);
  }
  fieldGroups.forEach((group, index) => {
    assertAttributes(group, new Map(), fileLabel);
    const terms = directElements(group);
    if (terms.length !== 2 || terms[0].tag !== "dt" || terms[1].tag !== "dd") {
      fail(`${fileLabel} field ${index + 1} must contain one dt followed by one dd`);
    }
    assertAttributes(terms[0], new Map(), fileLabel);
    assertAttributes(terms[1], new Map(), fileLabel);
    const label = normalizedText(terms[0]);
    if (label !== expectedFieldLabels[index]) {
      fail(`${fileLabel} field ${index + 1} must be ${JSON.stringify(expectedFieldLabels[index])}; found ${JSON.stringify(label)}`);
    }
  });
  return fieldGroups;
}

function validateSourceEntry(entry, route) {
  const fileLabel = `${caseBriefSourceRelativePath} entry ${route}`;
  assertAttributes(entry, new Map([["data-case-brief-source", route]]), fileLabel);
  const children = directElements(entry);
  if (children.length !== 7) fail(`${fileLabel} must contain exactly seven source-contract elements`);
  const [title, orientationHeading, orientation, fields, basis, tracksContainer, mediaContainer] = children;
  assertTagAndAttributes(title, "h2", [["data-case-brief-title", null]], "its title", fileLabel);
  assertTagAndAttributes(orientationHeading, "h3", [["data-case-brief-orientation-heading", null]], "its orientation heading", fileLabel);
  assertTagAndAttributes(orientation, "p", [["data-case-brief-orientation", null]], "its orientation paragraph", fileLabel);
  assertTagAndAttributes(fields, "dl", [["data-case-brief-fields", null]], "its six-field scan", fileLabel);
  assertTagAndAttributes(basis, "p", [["data-case-brief-basis", null]], "its Basis and limits paragraph", fileLabel);
  assertTagAndAttributes(tracksContainer, "div", [["data-case-brief-detail", null]], "its track container", fileLabel);
  assertTagAndAttributes(mediaContainer, "div", [["data-case-brief-media", null]], "its related-media container", fileLabel);

  if (!normalizedText(title)) fail(`${fileLabel} title must carry visible text`);
  if (normalizedText(orientationHeading) !== "At-a-Glance") fail(`${fileLabel} orientation heading must be At-a-Glance`);
  if (!normalizedText(orientation)) fail(`${fileLabel} orientation paragraph must carry visible text`);
  const fieldGroups = validateFieldGroups(fields, fileLabel);
  const basisChildren = directElements(basis);
  if (basisChildren.length === 0 || basisChildren[0].tag !== "strong" || normalizedText(basisChildren[0]) !== "Basis and limits:") {
    fail(`${fileLabel} must begin its basis paragraph with the strong label "Basis and limits:"`);
  }

  const trackChildren = directElements(tracksContainer);
  if (trackChildren.length < 3 || trackChildren.length > 4) {
    fail(`${fileLabel} must contain one track heading, an optional track introduction, and exactly two tracks`);
  }
  const [tracksHeading] = trackChildren;
  assertTagAndAttributes(tracksHeading, "h3", [["data-case-brief-tracks-heading", null]], "its track-group heading", fileLabel);
  const tracksIntro = trackChildren[1]?.tag === "p" ? trackChildren[1] : null;
  if (tracksIntro) {
    assertTagAndAttributes(tracksIntro, "p", [["data-case-brief-tracks-intro", null]], "its optional track introduction", fileLabel);
    if (!normalizedText(tracksIntro)) fail(`${fileLabel} optional track introduction must carry visible text`);
  }
  const trackNodes = trackChildren.slice(tracksIntro ? 2 : 1);
  if (trackNodes.length !== 2) fail(`${fileLabel} must contain exactly two tracks after its track heading and optional introduction`);
  const trackKinds = expectedTrackKinds[route] || expectedTrackKinds.default;
  const tracks = trackNodes.map((track, index) => {
    const kind = track.attributes.get("data-case-brief-track");
    assertTagAndAttributes(track, "article", [["data-case-brief-track", trackKinds[index]]], `track ${index + 1}`, fileLabel);
    const trackParts = directElements(track);
    if (trackParts.length !== 2) fail(`${fileLabel} ${kind} track must contain one heading and one ordered list`);
    const [trackTitle, list] = trackParts;
    assertTagAndAttributes(trackTitle, "h4", [["data-case-brief-track-title", null]], `${kind} track title`, fileLabel);
    assertTagAndAttributes(list, "ol", [], `${kind} ordered scan`, fileLabel);
    const items = directElements(list);
    if (items.length === 0 || items.some((item) => item.tag !== "li")) fail(`${fileLabel} ${kind} track must contain list items`);
    return { kind, title: trackTitle, list };
  });

  const mediaChildren = directElements(mediaContainer);
  if (mediaChildren.length !== 2) fail(`${fileLabel} related media must contain one heading and one unordered list`);
  const [mediaHeading, mediaList] = mediaChildren;
  assertTagAndAttributes(mediaHeading, "h3", [["data-case-brief-media-heading", null]], "its related-media heading", fileLabel);
  assertTagAndAttributes(mediaList, "ul", [], "its related-media list", fileLabel);
  const mediaItems = directElements(mediaList);
  if (mediaItems.length === 0 || mediaItems.some((item) => item.tag !== "li")) fail(`${fileLabel} related media must contain list items`);

  // Rendering every accepted content-bearing node also validates its element,
  // attribute, and fragment-only link vocabulary before any bytes are emitted.
  [title, orientationHeading, orientation, ...fieldGroups, basis, tracksHeading, ...(tracksIntro ? [tracksIntro] : []), ...tracks.flatMap(({ title: trackTitle, list }) => [trackTitle, list]), mediaHeading, mediaList]
    .forEach((node) => renderChildren(node, route));
  return { route, title, orientationHeading, orientation, fields, fieldGroups, basis, tracksHeading, tracksIntro, tracks, mediaHeading, mediaList, entry };
}

function extractSourceEntries(source, expectedRoutes) {
  const tree = parseHtml(source, caseBriefSourceRelativePath);
  const forbidden = descendants(tree, (node) => ["embed", "form", "iframe", "object", "script", "style"].includes(node.tag));
  if (forbidden.length > 0) fail(`${caseBriefSourceRelativePath} contains the unsupported <${forbidden[0].tag}> element`);
  const main = one(descendants(tree, (node) => node.tag === "main" && hasAttribute(node, "data-debrief-case-brief-sources")), "main[data-debrief-case-brief-sources]", caseBriefSourceRelativePath);
  assertAttributes(main, new Map([["data-debrief-case-brief-sources", null]]), caseBriefSourceRelativePath);
  const mainChildren = directElements(main);
  if (mainChildren.length !== expectedRoutes.length + 1) {
    fail(`${caseBriefSourceRelativePath} main must contain one source heading and ${expectedRoutes.length} compact accounts`);
  }
  const [sourceHeading, ...entries] = mainChildren;
  assertTagAndAttributes(sourceHeading, "h1", [], "its source heading", caseBriefSourceRelativePath);
  if (entries.some((entry) => entry.tag !== "article" || !hasAttribute(entry, "data-case-brief-source"))) {
    fail(`${caseBriefSourceRelativePath} compact accounts must be direct article[data-case-brief-source] elements`);
  }
  const routes = entries.map((entry) => entry.attributes.get("data-case-brief-source"));
  const seen = new Set();
  routes.forEach((route) => {
    validateRoute(route, caseBriefSourceRelativePath);
    if (seen.has(route)) fail(`${caseBriefSourceRelativePath} contains duplicate source route ${route}`);
    seen.add(route);
  });
  if (routes.length !== expectedRoutes.length || routes.some((route, index) => route !== expectedRoutes[index])) {
    fail(`${caseBriefSourceRelativePath} source routes must match the authored catalog route order exactly`);
  }
  return entries.map((entry, index) => validateSourceEntry(entry, expectedRoutes[index]));
}

function validateEntryAgainstRoute(sourceEntry, routeSource) {
  const route = sourceEntry.route;
  const fileLabel = path.relative(repositoryRoot, path.join(canvasDirectory, route));
  const routeTree = parseHtml(routeSource, fileLabel);
  const main = one(descendants(routeTree, (node) => node.tag === "main"), "main element", fileLabel);
  const heading = one(descendants(main, (node) => node.tag === "h1"), "main h1", fileLabel);
  if (normalizedText(heading) !== normalizedText(sourceEntry.title)) {
    fail(`${caseBriefSourceRelativePath} title for ${route} must match its Full Debrief h1`);
  }
  one(
    descendants(main, (node) => node.attributes.get("id") === "case-brief"),
    "published #case-brief coordinate",
    fileLabel,
  );
  const identifiers = new Set();
  descendants(routeTree, (node) => {
    const identifier = node.attributes.get("id");
    if (identifier) identifiers.add(identifier);
    return false;
  });
  const links = descendants(sourceEntry.entry, (node) => node.tag === "a");
  for (const link of links) {
    const href = link.attributes.get("href");
    if (typeof href !== "string" || !fragmentPattern.test(href)) {
      fail(`${caseBriefSourceRelativePath} entry ${route} contains an unsafe or unsupported link ${JSON.stringify(href)}`);
    }
    if (!identifiers.has(href.slice(1))) {
      fail(`${caseBriefSourceRelativePath} entry ${route} targets the missing Full Debrief fragment ${href}`);
    }
  }
}

function renderFullDebriefAtAGlance(sourceEntry) {
  const { route } = sourceEntry;
  const fieldMarkup = sourceEntry.fieldGroups.map((group) => {
    const [term, description] = directElements(group);
    return [
      "              <div>",
      `                <dt>${renderChildren(term, route, "")}</dt>`,
      `                <dd>${renderChildren(description, route, "")}</dd>`,
      "              </div>",
    ].join("\n");
  }).join("\n");
  return [
    fullDebriefStartMarker,
    "          <section id=\"case-brief\" data-content-form=\"case-brief\" aria-labelledby=\"case-brief-at-a-glance-title\">",
    `            <h2 id="case-brief-at-a-glance-title" class="txt-h2">${renderChildren(sourceEntry.orientationHeading, route, "")}</h2>`,
    `            <p>${renderChildren(sourceEntry.orientation, route, "")}</p>`,
    "            <dl class=\"debrief-at-glance\">",
    fieldMarkup,
    "            </dl>",
    `            <p>${renderChildren(sourceEntry.basis, route, "")}</p>`,
    "          </section>",
    fullDebriefEndMarker,
  ].join("\n");
}

function renderTemplate(sourceEntry) {
  const { route } = sourceEntry;
  const fieldMarkup = sourceEntry.fieldGroups.map((group) => `        <div>${renderChildren(group, route)}</div>`).join("\n");
  const trackIntroMarkup = sourceEntry.tracksIntro
    ? `      <p class="debrief-case-brief__track-intro">${renderChildren(sourceEntry.tracksIntro, route)}</p>`
    : null;
  const trackMarkup = sourceEntry.tracks.map(({ kind, title, list }) => [
    `      <details class="debrief-case-brief__track debrief-case-brief__track--disclosure" data-case-brief-track="${escapeAttribute(kind)}">`,
    `        <summary class="debrief-case-brief__track-summary"><span class="debrief-case-brief__track-title">${renderChildren(title, route)}</span> <span class="debrief-case-brief__track-state" aria-hidden="true"><span class="debrief-case-brief__track-state--expand">Expand</span><span class="debrief-case-brief__track-state--collapse">Collapse</span></span></summary>`,
    `        <ol>${renderChildren(list, route)}</ol>`,
    "      </details>"
  ].join("\n")).join("\n");
  return [
    `  <template data-case-brief-projection="${escapeAttribute(route)}" data-case-brief-title="${escapeAttribute(normalizedText(sourceEntry.title))}" data-case-brief-orientation-heading="${escapeAttribute(normalizedText(sourceEntry.orientationHeading))}">`,
    `    <p class="debrief-preview-slug">${renderChildren(sourceEntry.orientation, route)}</p>`,
    "    <dl class=\"debrief-preview-facts\">",
    fieldMarkup,
    "    </dl>",
    `    <p class="debrief-preview-note">${renderChildren(sourceEntry.basis, route)}</p>`,
    "    <div class=\"debrief-case-brief__tracks\" data-case-brief-detail>",
    `      <h4 class="txt-h4 debrief-case-brief__track-group-title">${renderChildren(sourceEntry.tracksHeading, route)}</h4>`,
    ...(trackIntroMarkup ? [trackIntroMarkup] : []),
    trackMarkup,
    "    </div>",
    "    <div class=\"debrief-card__case-brief-media\" data-case-brief-media>",
    `      <h4 class="txt-h4">${renderChildren(sourceEntry.mediaHeading, route)}</h4>`,
    `      <ul>${renderChildren(sourceEntry.mediaList, route)}</ul>`,
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

function fullDebriefMarkerOffsets(source, fileLabel) {
  const starts = Array.from(source.matchAll(new RegExp(fullDebriefStartMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")), (match) => match.index);
  const ends = Array.from(source.matchAll(new RegExp(fullDebriefEndMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")), (match) => match.index);
  if (starts.length > 1 || ends.length > 1 || starts.length !== ends.length) {
    fail(`${fileLabel} must contain either zero or one complete generated At-a-Glance projection block`);
  }
  if (starts.length === 0) return null;
  if (starts[0] >= ends[0]) fail(`${fileLabel} contains At-a-Glance projection markers in the wrong order`);
  return { start: starts[0], end: ends[0] + fullDebriefEndMarker.length };
}

function assertFullDebriefProjectionOwnership(source, offsets, fileLabel) {
  const routeTree = parseHtml(source, fileLabel);
  const projectionTree = parseHtml(
    source.slice(offsets.start, offsets.end),
    `${fileLabel} generated At-a-Glance projection`,
  );
  for (const identifier of ["case-brief", "case-brief-at-a-glance-title"]) {
    const owned = descendants(projectionTree, (node) => node.attributes.get("id") === identifier).length;
    const total = descendants(routeTree, (node) => node.attributes.get("id") === identifier).length;
    const outside = total - owned;
    if (owned !== 1 || outside !== 0) {
      fail(`${fileLabel} generated At-a-Glance projection must own exactly one #${identifier} and keep that identifier out of route-owned markup; found ${owned} inside and ${outside} outside`);
    }
  }
}

export function replaceGeneratedAtAGlance(source, generatedBlock, {
  fileLabel = "Full Debrief",
  requireGeneratedBlock = false,
} = {}) {
  const offsets = fullDebriefMarkerOffsets(source, fileLabel);
  if (offsets) {
    const expected = source.slice(0, offsets.start) + generatedBlock + source.slice(offsets.end);
    assertFullDebriefProjectionOwnership(expected, fullDebriefMarkerOffsets(expected, fileLabel), fileLabel);
    return expected;
  }
  if (requireGeneratedBlock) fail(`${fileLabel} is missing its generated At-a-Glance projection block`);
  const sentinels = Array.from(source.matchAll(new RegExp(fullDebriefInsertionSentinel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")), (match) => match.index);
  if (sentinels.length !== 1) {
    fail(`${fileLabel} must contain exactly one legacy #case-brief insertion coordinate before its first At-a-Glance build`);
  }
  const offset = sentinels[0];
  const expected = source.slice(0, offset) + generatedBlock + source.slice(offset + fullDebriefInsertionSentinel.length);
  assertFullDebriefProjectionOwnership(expected, fullDebriefMarkerOffsets(expected, fileLabel), fileLabel);
  return expected;
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

export async function writeAtomically(destination, content, {
  expectedSource,
  fileLabel = path.relative(repositoryRoot, destination),
} = {}) {
  const temporary = `${destination}.tmp-${process.pid}`;
  try {
    await access(temporary, fsConstants.F_OK).then(() => fail(`Refusing to replace the existing temporary file ${path.basename(temporary)}`), () => undefined);
    await writeFile(temporary, content, { encoding: "utf8", flag: "wx", mode: 0o644 });
    if (expectedSource !== undefined) {
      const currentSource = await readFile(destination, "utf8");
      if (currentSource !== expectedSource) {
        fail(`${fileLabel} changed after materialization planning; preserve the newer edits and rerun the build`);
      }
    }
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

  const caseBriefSource = await readAdmittedCaseBriefSource(caseBriefSourcePath, {
    baseDirectory: dataDirectory,
    fileLabel: caseBriefSourceRelativePath
  });
  const sourceEntries = extractSourceEntries(caseBriefSource, routes);
  const templates = [];
  const fullDebriefProjections = [];
  for (const sourceEntry of sourceEntries) {
    const routeSourcePath = validateRoute(sourceEntry.route);
    const routeSource = await readAdmittedCaseBriefSource(routeSourcePath);
    validateEntryAgainstRoute(sourceEntry, routeSource);
    templates.push(renderTemplate(sourceEntry));
    fullDebriefProjections.push({
      destination: routeSourcePath,
      fileLabel: path.relative(repositoryRoot, routeSourcePath),
      source: routeSource,
      expected: replaceGeneratedAtAGlance(routeSource, renderFullDebriefAtAGlance(sourceEntry), {
        fileLabel: path.relative(repositoryRoot, routeSourcePath),
        requireGeneratedBlock: check,
      }),
    });
  }
  const block = `${startMarker}\n${templates.join("\n")}\n${endMarker}`;
  const expected = materializedCatalog(catalog, block);

  if (check) {
    if (expected !== catalog) fail(`${catalogRelativePath} Case Brief projections are stale; run npm run build:debrief-case-briefs`);
    const staleFullDebrief = fullDebriefProjections.find(({ source, expected: routeExpected }) => source !== routeExpected);
    if (staleFullDebrief) fail(`${staleFullDebrief.fileLabel} At-a-Glance projection is stale; run npm run build:debrief-case-briefs`);
    process.stdout.write(`Case Brief and Full Debrief At-a-Glance projections are current: ${routes.length} source routes.\n`);
    return;
  }
  for (const projection of fullDebriefProjections) {
    if (projection.expected !== projection.source) {
      await writeAtomically(projection.destination, projection.expected, {
        expectedSource: projection.source,
        fileLabel: projection.fileLabel,
      });
    }
  }
  if (expected !== catalog) {
    await writeAtomically(catalogPath, expected, {
      expectedSource: catalog,
      fileLabel: catalogRelativePath,
    });
  }
  process.stdout.write(`Materialized ${routes.length} catalog Case Brief and Full Debrief At-a-Glance projections.\n`);
}

if (isDirectExecution(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${formatMaterializationError(error)}\n`);
    process.exitCode = 1;
  });
}

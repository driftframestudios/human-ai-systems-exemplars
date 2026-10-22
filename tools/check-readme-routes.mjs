#!/usr/bin/env node
import './node-runtime-admission.mjs';

import { lstat, readdir, readFile, realpath, stat } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { schemaReceiverRoutes } from "./schema-receiver-routes.mjs";
import { schemaCompanionRoutes } from "./schema-publication.mjs";

const ignoredDirectories = new Set([
  ".git",
  ".iframe-route-build",
  ".prod-projection-build",
  ".public-reference-build",
  ".schema-pages",
  ".schema_pages",
  ".tools",
  ".visual-runs",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const defaultPublicationSurfaces = Object.freeze([
  Object.freeze({
    manifest: "cloudflare/schemas-worker/public/publication-manifest.json",
    publicRoot: "cloudflare/schemas-worker/public",
    sourceRoutes: Object.freeze([...schemaReceiverRoutes, ...schemaCompanionRoutes]),
  }),
]);

async function walkReadmes(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const readmes = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      readmes.push(...await walkReadmes(root, path));
    } else if (entry.isFile() && /^README(?:\.[^.]+)?\.md$/iu.test(entry.name)) {
      readmes.push(path);
    }
  }

  return readmes.sort();
}

function leadingBlockQuote(line) {
  let content = line;
  let depth = 0;
  while (true) {
    const quote = /^ {0,3}>[ \t]?/u.exec(content);
    if (!quote) return { content, depth };
    content = content.slice(quote[0].length);
    depth += 1;
  }
}

function markdownContainer(line) {
  const leadingQuote = leadingBlockQuote(line);
  const blockContent = leadingQuote.content;
  let content = blockContent;
  let quoteDepth = leadingQuote.depth;
  let listIndent = 0;

  while (true) {
    const quote = /^ {0,3}>[ \t]?/u.exec(content);
    if (quote) {
      content = content.slice(quote[0].length);
      quoteDepth += 1;
      continue;
    }
    const list = /^ {0,3}(?:[-+*]|\d{1,9}[.)])[ \t]+/u.exec(content);
    if (list) {
      listIndent += list[0].length;
      content = content.slice(list[0].length);
      continue;
    }
    return { blockContent, content, listIndent, quoteDepth };
  }
}

function fenceMarker(line, fence, listContext = null) {
  const container = markdownContainer(line);
  const inheritedListIndent = fence?.listIndent ?? (
    listContext?.quoteDepth === container.quoteDepth ? listContext.indent : 0
  );
  const usesListContinuation = Boolean(inheritedListIndent) && container.listIndent === 0;
  const candidate = usesListContinuation ? container.blockContent : container.content;
  const allowedIndent = usesListContinuation ? inheritedListIndent + 3 : 3;
  const marker = /^( *)(`{3,}|~{3,})(.*)$/u.exec(candidate);
  if (!marker || marker[1].length > allowedIndent) return null;
  return {
    character: marker[2][0],
    length: marker[2].length,
    rest: marker[3],
    listIndent: container.listIndent || (usesListContinuation ? inheritedListIndent : 0),
    quoteDepth: container.quoteDepth,
  };
}

function listContextForLine(line, activeList) {
  const container = markdownContainer(line);
  if (container.listIndent > 0) {
    return { indent: container.listIndent, quoteDepth: container.quoteDepth };
  }
  if (!activeList) return null;
  if (container.blockContent.trim() === "") {
    return container.quoteDepth === activeList.quoteDepth ? activeList : null;
  }
  if (container.quoteDepth !== activeList.quoteDepth) return null;
  const leadingSpaces = /^ */u.exec(container.blockContent)[0].length;
  return leadingSpaces >= activeList.indent ? activeList : null;
}

function exitsFenceContainer(line, fence) {
  const container = markdownContainer(line);
  if (fence.quoteDepth > 0 && container.quoteDepth < fence.quoteDepth) return true;
  if (fence.listIndent > 0 && container.blockContent.trim() !== "") {
    const leadingSpaces = /^ */u.exec(container.blockContent)[0].length;
    if (leadingSpaces < fence.listIndent) return true;
  }
  return false;
}

function transformInlineCode(line, preserveMarkup) {
  let result = "";
  let cursor = 0;

  while (cursor < line.length) {
    if (line[cursor] !== "`") {
      result += line[cursor];
      cursor += 1;
      continue;
    }

    let runEnd = cursor;
    while (line[runEnd] === "`") runEnd += 1;
    const delimiter = line.slice(cursor, runEnd);
    const close = line.indexOf(delimiter, runEnd);
    if (close < 0) {
      result += delimiter;
      cursor = runEnd;
      continue;
    }

    if (preserveMarkup) result += line.slice(cursor, close + delimiter.length);
    cursor = close + delimiter.length;
  }

  return result;
}

function stripFencedAndInlineCode(source, { preserveInlineMarkup = false } = {}) {
  const retained = [];
  let fence = null;
  let activeList = null;

  for (const line of source.split(/\r?\n/u)) {
    if (fence && exitsFenceContainer(line, fence)) {
      fence = null;
      activeList = null;
    }
    if (!fence) activeList = listContextForLine(line, activeList);
    const marker = fenceMarker(line, fence, activeList);
    if (marker) {
      if (!fence) {
        fence = marker;
        retained.push("");
        continue;
      }
      if (marker.character === fence.character && marker.length >= fence.length && marker.rest.trim() === "") {
        fence = null;
      }
      retained.push("");
      continue;
    }

    if (fence) {
      retained.push("");
      continue;
    }

    retained.push(transformInlineCode(line, preserveInlineMarkup));
  }

  return retained.join("\n");
}

function markdownLinks(source) {
  const prose = stripFencedAndInlineCode(source);
  const links = [];
  const pattern = /(?<!!)\[[^\]]*\]\(([^)]+)\)/gu;
  for (const match of prose.matchAll(pattern)) {
    let destination = match[1].trim();
    if (destination.startsWith("<") && destination.endsWith(">")) {
      destination = destination.slice(1, -1);
    } else {
      destination = destination.split(/\s+["']/u, 1)[0];
    }
    if (destination) links.push(destination);
  }

  const definitions = [];
  const referenceLines = [];
  const referenceDefinition = /^\s{0,3}\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+))/u;
  const referenceStart = /^\s{0,3}\[([^\]]+)\]:\s*$/u;
  const referenceContinuation = /^ {1,3}(?:<([^>]+)>|(\S+))/u;
  const proseLines = prose.split("\n");
  for (let index = 0; index < proseLines.length; index += 1) {
    const line = proseLines[index];
    const normalized = markdownContainer(line).content;
    const match = referenceDefinition.exec(normalized);
    if (match) {
      definitions.push({
        label: match[1].trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US"),
        destination: (match[2] ?? match[3] ?? "").trim(),
      });
      referenceLines.push("");
      continue;
    }

    const start = referenceStart.exec(normalized);
    const next = index + 1 < proseLines.length
      ? markdownContainer(proseLines[index + 1]).content
      : "";
    const continuation = start ? referenceContinuation.exec(next) : null;
    if (start && continuation) {
      definitions.push({
        label: start[1].trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US"),
        destination: (continuation[1] ?? continuation[2] ?? "").trim(),
      });
      referenceLines.push("", "");
      index += 1;
      continue;
    }

    referenceLines.push(normalized);
  }

  const usedLabels = new Set();
  const references = referenceLines.join("\n")
    .replace(/(?<!!)\[[^\]]*\]\([^)]+\)/gu, "")
    .replace(/(?<!!)\[([^\]]+)\]\[([^\]]*)\]/gu, (_match, text, label) => {
      usedLabels.add((label || text).trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US"));
      return "";
    });

  for (const match of references.matchAll(/(?<!!)\[([^\]]+)\](?![\[(])/gu)) {
    usedLabels.add(match[1].trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US"));
  }

  for (const definition of definitions) {
    if (definition.destination && usedLabels.has(definition.label)) links.push(definition.destination);
  }

  return links;
}

function slugBase(heading) {
  const inlineSegments = [];
  let protectedHeading = "";
  let cursor = 0;
  while (cursor < heading.length) {
    if (heading[cursor] !== "`") {
      protectedHeading += heading[cursor];
      cursor += 1;
      continue;
    }
    let runEnd = cursor;
    while (heading[runEnd] === "`") runEnd += 1;
    const delimiter = heading.slice(cursor, runEnd);
    const close = heading.indexOf(delimiter, runEnd);
    if (close < 0) {
      protectedHeading += delimiter;
      cursor = runEnd;
      continue;
    }
    const token = `\u0000${inlineSegments.length}\u0000`;
    inlineSegments.push(heading.slice(runEnd, close));
    protectedHeading += token;
    cursor = close + delimiter.length;
  }

  return protectedHeading
    .replace(/<[^>]*>/gu, "")
    .replace(/\u0000(\d+)\u0000/gu, (_match, index) => inlineSegments[Number(index)] ?? "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
    .replace(/[`*_~]/gu, "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/gu, "-");
}

function markdownAnchors(source) {
  const anchors = new Set();
  const counts = new Map();
  const headingProse = stripFencedAndInlineCode(source, { preserveInlineMarkup: true });

  for (const line of headingProse.split(/\r?\n/u)) {
    const normalized = markdownContainer(line).content;
    const heading = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(normalized);
    if (!heading) continue;
    const base = slugBase(heading[2]);
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    anchors.add(seen === 0 ? base : `${base}-${seen}`);
  }

  const explicitAnchorProse = stripFencedAndInlineCode(source);
  for (const match of explicitAnchorProse.matchAll(/<(?:a|[A-Za-z][\w:-]*)\b[^>]*\b(?:id|name)=["']([^"']+)["'][^>]*>/gu)) {
    anchors.add(match[1]);
  }

  return anchors;
}

function markdownH2SectionState(source, title) {
  const structuralLines = stripFencedAndInlineCode(source, { preserveInlineMarkup: true })
    .split(/\r?\n/u);
  const contentLines = source
    .replace(/<!--[\s\S]*?-->/gu, (comment) => comment.replace(/[^\r\n]/gu, ""))
    .split(/\r?\n/u);
  let found = false;

  for (let index = 0; index < structuralLines.length; index += 1) {
    const normalized = markdownContainer(structuralLines[index]).content;
    const heading = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(normalized);
    if (heading) {
      if (!found && heading[1] === "##" && heading[2].trim().toLocaleLowerCase("en-US") === title.toLocaleLowerCase("en-US")) {
        found = true;
        continue;
      }
      if (found && heading[1].length <= 2) return { found, hasContent: false };
      if (found) continue;
    }

    if (found && /[\p{L}\p{N}]/u.test(contentLines[index] ?? "")) {
      return { found, hasContent: true };
    }
  }

  return { found, hasContent: false };
}

function htmlAnchors(source) {
  return new Set([...source.matchAll(/\b(?:id|name)=["']([^"']+)["']/gu)].map((match) => match[1]));
}

async function inspectContained(path, canonicalRoot) {
  let entry;
  try {
    entry = await lstat(path);
  } catch {
    return { stat: null, outside: false };
  }

  let canonical;
  try {
    canonical = await realpath(path);
  } catch {
    return { stat: null, outside: false };
  }

  if (!isWithin(canonicalRoot, canonical)) {
    return { stat: null, outside: true };
  }

  if (!entry.isSymbolicLink()) {
    return { stat: entry, outside: false };
  }

  try {
    return { stat: await stat(path), outside: false };
  } catch {
    return { stat: null, outside: false };
  }
}

function isWithin(root, target) {
  const route = relative(root, target);
  return route === "" || (route !== ".." && !route.startsWith(`..${sep}`) && !isAbsolute(route));
}

function repositoryRoute(root, path) {
  if (typeof path !== "string" || path === "" || isAbsolute(path)) return null;
  const target = resolve(root, path);
  if (!isWithin(root, target)) return null;
  return relative(root, target).split(sep).join("/");
}

function requestRoute(path) {
  if (typeof path !== "string" || path === "" || path.includes("\\") || /[?#]/u.test(path)) return null;
  const request = path.startsWith("/") ? path : `/${path}`;
  return posix.normalize(request) === request ? request : null;
}

async function loadPublicationSurfaces(repositoryRoot, canonicalRepositoryRoot, declarations) {
  const surfaces = [];
  for (const declaration of declarations) {
    const manifestRoute = repositoryRoute(repositoryRoot, declaration.manifest);
    const publicRootRoute = repositoryRoute(repositoryRoot, declaration.publicRoot);
    if (!manifestRoute || !publicRootRoute) continue;

    const manifestPath = resolve(repositoryRoot, manifestRoute);
    const publicRoot = resolve(repositoryRoot, publicRootRoute);
    const [manifestState, publicRootState] = await Promise.all([
      inspectContained(manifestPath, canonicalRepositoryRoot),
      inspectContained(publicRoot, canonicalRepositoryRoot),
    ]);
    if (!manifestState.stat?.isFile() || !publicRootState.stat?.isDirectory()) continue;

    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const aliases = new Map();
    for (const [request, asset] of Object.entries(manifest.routes ?? {})) {
      const requestPath = requestRoute(request);
      const assetPath = requestRoute(asset);
      if (requestPath && assetPath) aliases.set(requestPath, assetPath);
    }

    const sourceRequests = new Map();
    for (const route of declaration.sourceRoutes ?? []) {
      const source = repositoryRoute(repositoryRoot, route.source);
      const receiver = requestRoute(route.receiverPath);
      if (!source || !receiver) continue;
      const requests = sourceRequests.get(source) ?? [];
      requests.push(receiver);
      sourceRequests.set(source, requests);
    }

    surfaces.push({
      aliases,
      canonicalPublicRoot: await realpath(publicRoot),
      publicRoot,
      sourceRequests,
    });
  }
  return surfaces;
}

async function publicationAsset(surface, request) {
  const assetRequest = surface.aliases.get(request) ?? request;
  const assetRoute = requestRoute(assetRequest);
  if (!assetRoute) return null;
  const targetPath = resolve(surface.publicRoot, assetRoute.slice(1));
  if (!isWithin(surface.publicRoot, targetPath)) return null;
  const targetState = await inspectContained(targetPath, surface.canonicalPublicRoot);
  if (targetState.outside || !targetState.stat) return null;
  return { targetPath, targetState };
}

async function publicationBases(repositoryRoot, sourcePath, source, surfaces) {
  const sourceRoute = relative(repositoryRoot, sourcePath).split(sep).join("/");
  const bases = [];
  for (const surface of surfaces) {
    // Files inside the public root use their runtime request path. Authored
    // templates gain that context only through an exact, declared receiver.
    if (isWithin(surface.publicRoot, sourcePath)) {
      const assetRoute = relative(surface.publicRoot, sourcePath).split(sep).join("/");
      const request = requestRoute(assetRoute);
      if (request) bases.push({ request, surface });
    }

    for (const request of surface.sourceRequests.get(sourceRoute) ?? []) {
      const receiver = await publicationAsset(surface, request);
      if (!receiver?.targetState.stat?.isFile()) continue;
      const receiverSource = await readFile(receiver.targetPath, "utf8");
      if (receiverSource === source) bases.push({ request, surface });
    }
  }
  return bases;
}

async function publicationTarget(bases, decodedPath) {
  if (decodedPath.includes("\\")) return null;
  for (const { request, surface } of bases) {
    const targetRequest = requestRoute(posix.join(posix.dirname(request), decodedPath));
    if (!targetRequest) continue;
    const target = await publicationAsset(surface, targetRequest);
    if (target) return target;
  }
  return null;
}

function splitDestination(destination) {
  const hashIndex = destination.indexOf("#");
  const queryIndex = destination.indexOf("?");
  const cutCandidates = [hashIndex, queryIndex].filter((index) => index >= 0);
  const pathEnd = cutCandidates.length > 0 ? Math.min(...cutCandidates) : destination.length;
  const rawPath = destination.slice(0, pathEnd);
  const fragment = hashIndex >= 0
    ? destination.slice(hashIndex + 1, queryIndex > hashIndex ? queryIndex : destination.length)
    : "";
  return { rawPath, fragment };
}

function isExternal(destination) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(destination);
}

export async function checkReadmeRoutes(root, { publicationSurfaces = defaultPublicationSurfaces } = {}) {
  const repositoryRoot = resolve(root);
  const canonicalRepositoryRoot = await realpath(repositoryRoot);
  const readmes = await walkReadmes(repositoryRoot);
  const findings = [];
  let localLinkCount = 0;
  let fragmentCount = 0;

  const publications = await loadPublicationSurfaces(
    repositoryRoot,
    canonicalRepositoryRoot,
    publicationSurfaces,
  );

  if (readmes.length === 0) {
    findings.push({ kind: "empty-corpus", source: ".", destination: "README*.md" });
  }

  for (const sourcePath of readmes) {
    const source = await readFile(sourcePath, "utf8");
    const publishedBases = await publicationBases(repositoryRoot, sourcePath, source, publications);
    for (const destination of markdownLinks(source)) {
      if (isExternal(destination)) continue;
      localLinkCount += 1;

      const { rawPath, fragment } = splitDestination(destination);
      let decodedPath;
      let decodedFragment;
      try {
        decodedPath = decodeURIComponent(rawPath);
        decodedFragment = decodeURIComponent(fragment);
      } catch {
        findings.push({ kind: "invalid-encoding", source: sourcePath, destination });
        continue;
      }

      let targetPath = decodedPath ? resolve(dirname(sourcePath), decodedPath) : sourcePath;
      if (!isWithin(repositoryRoot, targetPath)) {
        findings.push({ kind: "outside-repository", source: sourcePath, destination });
        continue;
      }

      let targetState = await inspectContained(targetPath, canonicalRepositoryRoot);
      if (targetState.outside) {
        findings.push({ kind: "outside-repository", source: sourcePath, destination });
        continue;
      }
      if (!targetState.stat) {
        const publishedTarget = await publicationTarget(publishedBases, decodedPath);
        if (!publishedTarget) {
          findings.push({ kind: "missing-target", source: sourcePath, destination });
          continue;
        }
        targetPath = publishedTarget.targetPath;
        targetState = publishedTarget.targetState;
      }

      if (targetState.stat.isDirectory()) {
        if (decodedFragment) {
          targetPath = join(targetPath, "README.md");
          targetState = await inspectContained(targetPath, canonicalRepositoryRoot);
          if (targetState.outside) {
            findings.push({ kind: "outside-repository", source: sourcePath, destination });
            continue;
          }
          if (!targetState.stat?.isFile()) {
            findings.push({ kind: "directory-fragment-without-readme", source: sourcePath, destination });
            continue;
          }
        }
      }

      if (targetState.stat.isDirectory()) continue;

      if (!decodedFragment) continue;
      fragmentCount += 1;
      const extension = extname(targetPath).toLocaleLowerCase("en-US");
      if (extension !== ".md" && extension !== ".html" && extension !== ".htm") continue;

      const target = await readFile(targetPath, "utf8");
      const anchors = extension === ".md" ? markdownAnchors(target) : htmlAnchors(target);
      if (!anchors.has(decodedFragment)) {
        findings.push({ kind: "missing-fragment", source: sourcePath, destination });
      }
    }
  }

  const skillsRoot = join(repositoryRoot, ".agents", "skills");
  const skillsCatalog = join(skillsRoot, "README.md");
  const skillsRootState = await inspectContained(skillsRoot, canonicalRepositoryRoot);
  let skillEntries = [];
  if (skillsRootState.outside) {
    findings.push({
      kind: "outside-repository",
      source: skillsRoot,
      destination: ".agents/skills",
    });
  } else if (skillsRootState.stat?.isDirectory()) {
    skillEntries = await readdir(skillsRoot, { withFileTypes: true });
  }

  const activeSkills = [];
  for (const entry of skillEntries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === "README.md" || (!entry.isDirectory() && !entry.isSymbolicLink())) continue;
    const skillDirectory = join(skillsRoot, entry.name);
    const skillDirectoryState = await inspectContained(skillDirectory, canonicalRepositoryRoot);
    if (skillDirectoryState.outside) {
      findings.push({
        kind: "outside-repository",
        source: skillsRoot,
        destination: entry.name,
      });
      continue;
    }
    if (!skillDirectoryState.stat?.isDirectory()) continue;

    const skillPath = join(skillsRoot, entry.name, "SKILL.md");
    const skillState = await inspectContained(skillPath, canonicalRepositoryRoot);
    if (skillState.outside) {
      findings.push({
        kind: "outside-repository",
        source: skillDirectory,
        destination: "SKILL.md",
      });
      continue;
    }
    if (!skillState.stat?.isFile()) continue;
    activeSkills.push(entry.name);

    const overviewPath = join(skillDirectory, "README.md");
    const overviewState = await inspectContained(overviewPath, canonicalRepositoryRoot);
    if (overviewState.outside) {
      findings.push({
        kind: "outside-repository",
        source: skillDirectory,
        destination: "README.md",
      });
      continue;
    }
    if (!overviewState.stat?.isFile()) {
      findings.push({
        kind: "missing-skill-overview",
        source: skillDirectory,
        destination: "README.md",
      });
      continue;
    }

    const overview = await readFile(overviewPath, "utf8");
    const concreteExample = markdownH2SectionState(overview, "Concrete example");
    if (!concreteExample.found) {
      findings.push({
        kind: "missing-skill-concrete-example",
        source: overviewPath,
        destination: "## Concrete example",
      });
    } else if (!concreteExample.hasContent) {
      findings.push({
        kind: "empty-skill-concrete-example",
        source: overviewPath,
        destination: "## Concrete example",
      });
    }
  }

  const catalogState = skillsRootState.outside
    ? { stat: null, outside: false }
    : await inspectContained(skillsCatalog, canonicalRepositoryRoot);
  let catalogReadable = false;
  if (catalogState.outside) {
    findings.push({
      kind: "outside-repository",
      source: skillsRoot,
      destination: "README.md",
    });
  } else if (catalogState.stat?.isFile()) {
    catalogReadable = true;
  }

  if (activeSkills.length > 0 && !catalogState.stat?.isFile() && !catalogState.outside) {
    findings.push({
      kind: "missing-skill-catalog",
      source: skillsRoot,
      destination: "README.md",
    });
  } else if (catalogReadable) {
    const catalog = await readFile(skillsCatalog, "utf8");
    const catalogLinks = markdownLinks(catalog);
    for (const skill of activeSkills) {
      const contractRoute = `${skill}/SKILL.md`;
      const contractOccurrences = catalogLinks.filter((destination) => destination === contractRoute).length;
      if (contractOccurrences !== 1) {
        findings.push({
          kind: "skill-catalog-membership",
          source: skillsCatalog,
          destination: contractRoute,
          occurrences: contractOccurrences,
        });
      }

      const overviewRoute = `${skill}/README.md`;
      const overviewOccurrences = catalogLinks.filter((destination) => destination === overviewRoute).length;
      if (overviewOccurrences !== 1) {
        findings.push({
          kind: "skill-catalog-overview-membership",
          source: skillsCatalog,
          destination: overviewRoute,
          occurrences: overviewOccurrences,
        });
      }
    }
  }

  return {
    readmeCount: readmes.length,
    localLinkCount,
    fragmentCount,
    findings: findings.map((finding) => ({
      ...finding,
      source: finding.source.startsWith(repositoryRoot)
        ? finding.source.slice(repositoryRoot.length + 1).split(sep).join("/")
        : finding.source,
    })),
  };
}

async function main() {
  const root = resolve(process.argv[2] ?? process.cwd());
  const result = await checkReadmeRoutes(root);
  if (result.findings.length > 0) {
    for (const finding of result.findings) {
      console.error(`${finding.kind}: ${finding.source} -> ${finding.destination}${finding.occurrences === undefined ? "" : ` (${finding.occurrences})`}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`README route check passed: ${result.readmeCount} README files, ${result.localLinkCount} local links, ${result.fragmentCount} checked fragments.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

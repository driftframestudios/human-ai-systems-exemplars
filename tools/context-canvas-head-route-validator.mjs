import "./node-runtime-admission.mjs";

import { posix } from "node:path";

export const CONTEXT_CANVAS_HEAD_ROUTE_CONTRACT_ID =
  "context-canvas.head-route-authority.v1";
export const CONTEXT_CANVAS_SOURCE_ROOT =
  "context-canvas-project-surface/context-canvas";
export const CONTEXT_CANVAS_404_PATH =
  `${CONTEXT_CANVAS_SOURCE_ROOT}/404.html`;
export const CONTEXT_CANVAS_RETAINED_EXEMPLAR_PATH =
  `${CONTEXT_CANVAS_SOURCE_ROOT}/exemplar-index-landing.html`;

const PUBLIC_TOKEN =
  /^\{\{(PUBLIC_URL_(?:REGISTRY|IFRAME|PAGE|ASSET|SCHEMA|SKILL)_[A-Z0-9_]+)\}\}$/u;
const LEGACY_PUBLIC_HOST = "schemas.radiantnull.com";
const PAGE_TYPES = new Set([
  "Article",
  "CollectionPage",
  "CreativeWork",
  "ProfilePage",
  "TechArticle",
  "WebPage",
]);
const ARTICLE_TYPES = new Set(["Article", "TechArticle"]);
const RECOGNIZED_URL_PROPERTIES = new Set([
  "@context",
  "@id",
  "@vocab",
  "associatedMedia",
  "cc",
  "citation",
  "contentUrl",
  "doi",
  "discussionUrl",
  "downloadUrl",
  "embedUrl",
  "encoding",
  "hasPart",
  "image",
  "isBasedOn",
  "isPartOf",
  "item",
  "itemListOrder",
  "license",
  "logo",
  "mainEntity",
  "mainEntityOfPage",
  "sameAs",
  "schema",
  "schemaVersion",
  "significantLink",
  "subjectOf",
  "target",
  "thumbnailUrl",
  "url",
]);
const REQUIRED_OPEN_GRAPH = Object.freeze([
  "og:title",
  "og:description",
  "og:url",
  "og:image",
  "og:image:alt",
]);
const REQUIRED_TWITTER = Object.freeze([
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
  "twitter:image:alt",
]);
const OPTIONAL_OPEN_GRAPH_IMAGE_DETAILS = Object.freeze([
  "og:image:type",
  "og:image:width",
  "og:image:height",
]);
const MAXIMUM_JSONLD_DEPTH = 128;
const MAXIMUM_JSONLD_NODES = 8192;

function utf8Compare(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function pointerEscape(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function decodeHtmlAttribute(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function attributes(tag) {
  const values = new Map();
  const source = tag.replace(/^<[^\s>]+/u, "").replace(/\/?\s*>$/u, "");
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gu;
  for (const match of source.matchAll(pattern)) {
    const name = match[1].toLowerCase();
    const value = decodeHtmlAttribute(match[2] ?? match[3] ?? match[4] ?? "");
    if (!values.has(name)) values.set(name, value);
  }
  return values;
}

function typeNames(node) {
  const value = node?.["@type"];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
  return [];
}

function objectDescription(node, pointer) {
  const types = typeNames(node);
  const objectType = types.length > 0 ? types.join(" + ") : "JSON-LD object";
  const named = ["name", "headline", "title", "alternateName"]
    .map((key) => node?.[key])
    .find((value) => typeof value === "string" && value.trim().length > 0);
  return {
    objectType,
    objectName: named?.trim() ?? `${objectType} at ${pointer}`,
  };
}

function diagnostic({
  code,
  source,
  locator = "",
  observed = null,
  expected = null,
  token = null,
  carrier = null,
  authorityClass = null,
  owner = null,
  remediation,
}) {
  return {
    code,
    severity: "error",
    source,
    locator,
    carrier,
    token,
    authority_class: authorityClass,
    owner,
    observed,
    expected,
    remediation,
  };
}

function sortDiagnostics(diagnostics) {
  return [...diagnostics].sort((left, right) =>
    utf8Compare(left.source, right.source) ||
    utf8Compare(left.locator, right.locator) ||
    utf8Compare(left.code, right.code) ||
    utf8Compare(left.token ?? "", right.token ?? ""),
  );
}

function authorityAdapter(authority) {
  if (authority instanceof Map) {
    return {
      resolveToken: (token) => authority.get(token),
      assertTokenCarrier: null,
      assertResolvedCarrier: null,
    };
  }
  if (authority === null || authority === undefined) {
    return {
      resolveToken: () => undefined,
      assertTokenCarrier: null,
      assertResolvedCarrier: null,
    };
  }
  const resolve =
    typeof authority.resolveToken === "function"
      ? (token) => authority.resolveToken(token)
      : typeof authority.destinationForToken === "function"
        ? (token) => authority.destinationForToken(token)
        : typeof authority.get === "function"
          ? (token) => authority.get(token)
          : () => undefined;
  const assertCarrier =
    typeof authority.assertTokenCarrier === "function"
      ? (token, carrier, source) =>
          authority.assertTokenCarrier(token, carrier, source)
      : typeof authority.assertCarrier === "function"
        ? (token, carrier, source) => authority.assertCarrier(token, carrier, source)
        : null;
  const assertResolvedCarrier =
    typeof authority.assertResolvedCarrier === "function"
      ? (value, carrier, source) =>
          authority.assertResolvedCarrier(value, carrier, source)
      : null;
  return {
    resolveToken: resolve,
    assertTokenCarrier: assertCarrier,
    assertResolvedCarrier,
  };
}

function authorityDiagnostics(error, source, locator, token, carrier) {
  if (Array.isArray(error?.diagnostics) && error.diagnostics.length > 0) {
    return error.diagnostics.map((item) => diagnostic({
      code: item.code ?? "HEAD_ROUTE_AUTHORITY_REJECTED",
      source,
      locator,
      token,
      carrier,
      authorityClass: item.authority_class ?? null,
      owner: item.owner ?? null,
      observed: item.observed ?? null,
      expected: item.expected ?? null,
      remediation:
        item.remediation ?? "Align the token carrier with its tracked route authority.",
    }));
  }
  return [diagnostic({
    code: "HEAD_ROUTE_AUTHORITY_REJECTED",
    source,
    locator,
    token,
    carrier,
    observed: error?.code ?? error?.message ?? "authority rejection",
    expected: "an authority-approved token and carrier",
    remediation: "Align the token and carrier with the tracked route authority.",
  })];
}

function resolvePublicValue(rawValue, carrier, source, locator, authority, diagnostics) {
  const tokenMatch = PUBLIC_TOKEN.exec(rawValue);
  if (tokenMatch === null) {
    if (rawValue.includes("{{PUBLIC_URL")) {
      diagnostics.push(diagnostic({
        code: "HEAD_ROUTE_TOKEN_SHAPE",
        source,
        locator,
        carrier,
        observed: rawValue,
        expected: "one complete semantic public-route token",
        remediation: "Give the carrier one exact token from the tracked route authority.",
      }));
      return null;
    }
    return rawValue;
  }

  const token = tokenMatch[1];
  if (authority.assertTokenCarrier !== null) {
    try {
      authority.assertTokenCarrier(token, carrier, source);
    } catch (error) {
      diagnostics.push(...authorityDiagnostics(
        error,
        source,
        locator,
        token,
        carrier,
      ));
    }
  }
  const destination = authority.resolveToken(token);
  if (typeof destination !== "string" || destination.length === 0) {
    diagnostics.push(diagnostic({
      code: "HEAD_ROUTE_TOKEN_UNRESOLVED",
      source,
      locator,
      carrier,
      token,
      observed: token,
      expected: "a destination from the tracked route authority",
      remediation: "Add or repair the manifest-derived binding for this semantic token.",
    }));
    return null;
  }
  return destination;
}

function validateHttpsValue(value, source, locator, carrier, diagnostics) {
  if (value === null) return null;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    diagnostics.push(diagnostic({
      code: "HEAD_ROUTE_URL_SHAPE",
      source,
      locator,
      carrier,
      observed: value,
      expected: "one absolute HTTPS URL",
      remediation: "Select the manifest-owned HTTPS receiver for this identity.",
    }));
    return null;
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.port !== ""
  ) {
    diagnostics.push(diagnostic({
      code: "HEAD_ROUTE_URL_SHAPE",
      source,
      locator,
      carrier,
      observed: value,
      expected: "one credential-free HTTPS URL using the receiver's standard port",
      remediation: "Select the reviewed HTTPS receiver from its route authority.",
    }));
    return null;
  }
  if (parsed.hostname === LEGACY_PUBLIC_HOST) {
    diagnostics.push(diagnostic({
      code: "HEAD_ROUTE_LEGACY_RECEIVER",
      source,
      locator,
      carrier,
      observed: value,
      expected: "the current typed public receiver",
      remediation: "Route this identity through its semantic materializer token.",
    }));
  }
  return parsed.href;
}

function effectivePublicValue(rawValue, carrier, source, locator, authority, diagnostics) {
  const effective = validateHttpsValue(
    resolvePublicValue(rawValue, carrier, source, locator, authority, diagnostics),
    source,
    locator,
    carrier,
    diagnostics,
  );
  if (
    effective !== null &&
    PUBLIC_TOKEN.exec(rawValue) === null &&
    authority.assertResolvedCarrier !== null
  ) {
    try {
      authority.assertResolvedCarrier(effective, carrier, source);
    } catch (error) {
      diagnostics.push(...authorityDiagnostics(
        error,
        source,
        locator,
        null,
        carrier,
      ));
    }
  }
  return effective;
}

function publicIdentityBase(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function addSingletonDiagnostic(values, key, source, locator, diagnostics) {
  const selected = values.get(key) ?? [];
  if (selected.length === 1) {
    if (typeof selected[0].raw !== "string" || selected[0].raw.trim().length === 0) {
      diagnostics.push(diagnostic({
        code: "HEAD_METADATA_EMPTY",
        source,
        locator,
        observed: selected[0].raw ?? null,
        expected: `one nonempty ${key} value`,
        remediation: `State the ${key} value explicitly for link-preview and indexing receivers.`,
      }));
    }
    return selected[0];
  }
  diagnostics.push(diagnostic({
    code: selected.length === 0 ? "HEAD_METADATA_MISSING" : "HEAD_METADATA_DUPLICATE",
    source,
    locator,
    observed: selected.length,
    expected: 1,
    remediation:
      selected.length === 0
        ? `Add the single ${key} carrier required by the page-head contract.`
        : `Keep one authoritative ${key} carrier in the page head.`,
  }));
  return selected[0] ?? null;
}

function jsonScriptBlocks(html) {
  const blocks = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/giu;
  for (const match of html.matchAll(pattern)) {
    const attrs = attributes(`<script${match[1]}>`);
    if ((attrs.get("type") ?? "").toLowerCase() !== "application/ld+json") continue;
    blocks.push({ body: match[2], index: blocks.length });
  }
  return blocks;
}

function recordJsonUrl({
  value,
  key,
  pointer,
  source,
  authority,
  diagnostics,
  records,
  objectType,
  objectName,
}) {
  const token = PUBLIC_TOKEN.test(value);
  const absolute = /^https:\/\//u.test(value);
  const recognized = RECOGNIZED_URL_PROPERTIES.has(key);
  if (
    !recognized &&
    !token &&
    !absolute &&
    !value.includes("{{PUBLIC_URL")
  ) return;
  const role = key === "@context" ? "vocabulary" : "jsonld";
  if (!recognized) {
    diagnostics.push(diagnostic({
      code: "HEAD_JSONLD_URL_PROPERTY_REVIEW",
      source,
      locator: pointer,
      carrier: role,
      observed: key,
      expected: "a reviewed URL-bearing JSON-LD property",
      remediation: "Classify this relationship before adding it to the public authority matrix.",
    }));
  }
  const effective = effectivePublicValue(
    value,
    "jsonld",
    source,
    pointer,
    authority,
    diagnostics,
  );
  records.push({
    source,
    locator: pointer,
    carrier: "jsonld",
    property: key,
    raw: value,
    effective,
    token: PUBLIC_TOKEN.exec(value)?.[1] ?? null,
    relationship_role: role,
    objectType,
    objectName,
  });
}

function hasMeaningfulRelationshipIdentity(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  if (typeof value["@id"] === "string" && value["@id"].trim().length > 0) {
    return true;
  }
  const named = typeof value.name === "string" && value.name.trim().length > 0;
  const types = typeNames(value).filter((type) => type.trim().length > 0);
  return named && types.length > 0;
}

function hasMeaningfulRelationship(value) {
  if (Array.isArray(value)) {
    return value.length > 0 && value.every(hasMeaningfulRelationshipIdentity);
  }
  return hasMeaningfulRelationshipIdentity(value);
}

function jsonLdTraversalBudget() {
  return { nodes: 0, exhausted: false };
}

function admitJsonLdNode(
  budget,
  depth,
  pointer,
  source,
  diagnostics = null,
) {
  if (budget.exhausted) return false;
  budget.nodes += 1;
  const depthExceeded = depth > MAXIMUM_JSONLD_DEPTH;
  const nodesExceeded = budget.nodes > MAXIMUM_JSONLD_NODES;
  if (!depthExceeded && !nodesExceeded) return true;

  budget.exhausted = true;
  if (diagnostics !== null) {
    diagnostics.push(diagnostic({
      code: "HEAD_JSONLD_TRAVERSAL_LIMIT",
      source,
      locator: pointer,
      observed: {
        depth,
        nodes: budget.nodes,
        limit: depthExceeded ? "depth" : "node_count",
      },
      expected: {
        maximum_depth: MAXIMUM_JSONLD_DEPTH,
        maximum_nodes: MAXIMUM_JSONLD_NODES,
      },
      remediation:
        "Keep each structured-data block within the bounded page graph, or divide independent graph populations into separately reviewed blocks.",
    }));
  }
  return false;
}

function walkJsonUrls(
  value,
  pointer,
  source,
  authority,
  diagnostics,
  records,
  budget,
  depth = 0,
) {
  if (!admitJsonLdNode(budget, depth, pointer, source, diagnostics)) return;
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      walkJsonUrls(
        item,
        `${pointer}/${index}`,
        source,
        authority,
        diagnostics,
        records,
        budget,
        depth + 1,
      );
      if (budget.exhausted) break;
    }
    return;
  }
  if (value === null || typeof value !== "object") return;
  const description = objectDescription(value, pointer);
  for (const [key, child] of Object.entries(value)) {
    const childPointer = `${pointer}/${pointerEscape(key)}`;
    if (typeof child === "string") {
      if (!admitJsonLdNode(
        budget,
        depth + 1,
        childPointer,
        source,
        diagnostics,
      )) return;
      recordJsonUrl({
        value: child,
        key,
        pointer: childPointer,
        source,
        authority,
        diagnostics,
        records,
        ...description,
      });
    } else if (Array.isArray(child)) {
      if (!admitJsonLdNode(
        budget,
        depth + 1,
        childPointer,
        source,
        diagnostics,
      )) return;
      for (const [index, item] of child.entries()) {
        const itemPointer = `${childPointer}/${index}`;
        if (typeof item === "string") {
          if (!admitJsonLdNode(
            budget,
            depth + 2,
            itemPointer,
            source,
            diagnostics,
          )) break;
          recordJsonUrl({
            value: item,
            key,
            pointer: itemPointer,
            source,
            authority,
            diagnostics,
            records,
            ...description,
          });
        } else {
          walkJsonUrls(
            item,
            itemPointer,
            source,
            authority,
            diagnostics,
            records,
            budget,
            depth + 2,
          );
        }
        if (budget.exhausted) break;
      }
      continue;
    }
    walkJsonUrls(
      child,
      childPointer,
      source,
      authority,
      diagnostics,
      records,
      budget,
      depth + 1,
    );
    if (budget.exhausted) return;
  }
}

function collectJsonLdIdentityDefinitions(
  value,
  pointer,
  source,
  authority,
  definitions,
  budget,
  depth = 0,
) {
  if (!admitJsonLdNode(budget, depth, pointer, source)) return;
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      collectJsonLdIdentityDefinitions(
        item,
        `${pointer}/${index}`,
        source,
        authority,
        definitions,
        budget,
        depth + 1,
      );
      if (budget.exhausted) break;
    }
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (
    typeof value["@id"] === "string" &&
    Object.keys(value).some((key) => key !== "@id")
  ) {
    const effective = resolvePublicValue(
      value["@id"],
      "jsonld",
      source,
      `${pointer}/@id`,
      authority,
      [],
    );
    if (typeof effective === "string") {
      const selected = definitions.get(effective) ?? [];
      selected.push(`${pointer}/@id`);
      definitions.set(effective, selected);
    }
  }
  for (const [key, child] of Object.entries(value)) {
    collectJsonLdIdentityDefinitions(
      child,
      `${pointer}/${pointerEscape(key)}`,
      source,
      authority,
      definitions,
      budget,
      depth + 1,
    );
    if (budget.exhausted) return;
  }
}

function rootCandidates(parsedBlocks) {
  const candidates = [];
  for (const block of parsedBlocks) {
    const roots = Array.isArray(block.value?.["@graph"])
      ? block.value["@graph"]
      : [block.value];
    roots.forEach((node, index) => {
      if (
        node !== null &&
        typeof node === "object" &&
        typeNames(node).some((name) => PAGE_TYPES.has(name))
      ) {
        candidates.push({
          node,
          pointer: Array.isArray(block.value?.["@graph"])
            ? `/jsonld/${block.index}/@graph/${index}`
            : `/jsonld/${block.index}`,
        });
      }
    });
  }
  return candidates;
}

export function deriveIndexedContextCanvasPages(
  primaryManifest,
  { expectedPageCount = 40 } = {},
) {
  const diagnostics = [];
  const source = "deployment/cpanel/primary-route-manifest.json";
  if (
    primaryManifest === null ||
    typeof primaryManifest !== "object" ||
    !Array.isArray(primaryManifest.files)
  ) {
    diagnostics.push(diagnostic({
      code: "HEAD_MANIFEST_SHAPE",
      source,
      observed: primaryManifest,
      expected: "a primary route manifest with a files array",
      remediation: "Supply the tracked primary route manifest to the head validator.",
    }));
    return { pages: [], diagnostics };
  }

  const prefix = `${CONTEXT_CANVAS_SOURCE_ROOT}/`;
  const pages = [];
  const seenSources = new Set();
  const seenProjected = new Set();
  for (const [index, entry] of primaryManifest.files.entries()) {
    if (
      entry === null ||
      typeof entry !== "object" ||
      typeof entry.source_path !== "string" ||
      typeof entry.projected_path !== "string"
    ) continue;
    if (
      !entry.source_path.startsWith(prefix) ||
      entry.media_type !== "text/html" ||
      posix.dirname(entry.projected_path) !== "." ||
      !entry.projected_path.endsWith(".html") ||
      entry.projected_path === "404.html"
    ) continue;
    if (seenSources.has(entry.source_path) || seenProjected.has(entry.projected_path)) {
      diagnostics.push(diagnostic({
        code: "HEAD_MANIFEST_DUPLICATE_PAGE",
        source,
        locator: `/files/${index}`,
        observed: {
          source_path: entry.source_path,
          projected_path: entry.projected_path,
        },
        expected: "one source and projected coordinate per indexed page",
        remediation: "Keep one manifest-owned route for each indexed visitor page.",
      }));
      continue;
    }
    seenSources.add(entry.source_path);
    seenProjected.add(entry.projected_path);
    pages.push({
      sourcePath: entry.source_path,
      projectedPath: entry.projected_path,
    });
  }
  pages.sort((left, right) => utf8Compare(left.sourcePath, right.sourcePath));
  if (expectedPageCount !== null && pages.length !== expectedPageCount) {
    diagnostics.push(diagnostic({
      code: "HEAD_MANIFEST_PAGE_COUNT",
      source,
      observed: pages.length,
      expected: expectedPageCount,
      remediation: "Reconcile the indexed top-level page set with the reviewed primary manifest.",
    }));
  }
  return { pages, diagnostics: sortDiagnostics(diagnostics) };
}

export function inspectContextCanvasHeadDocument({
  sourcePath,
  html,
  authority: rawAuthority = null,
}) {
  const diagnostics = [];
  const records = [];
  const authority = authorityAdapter(rawAuthority);
  if (typeof html !== "string") {
    diagnostics.push(diagnostic({
      code: "HEAD_DOCUMENT_SHAPE",
      source: sourcePath,
      observed: typeof html,
      expected: "UTF-8 HTML text",
      remediation: "Supply the tracked page bytes as decoded UTF-8 text.",
    }));
    return { diagnostics, records, canonical: null, dateModified: null };
  }
  const headMatch = /<head\b[^>]*>([\s\S]*?)<\/head\s*>/iu.exec(html);
  if (headMatch === null) {
    diagnostics.push(diagnostic({
      code: "HEAD_DOCUMENT_MISSING",
      source: sourcePath,
      observed: "no head element",
      expected: "one page head",
      remediation: "Give the visitor page one explicit head contract.",
    }));
    return { diagnostics, records, canonical: null, dateModified: null };
  }

  const head = headMatch[1];
  const documentTitle = decodeHtmlAttribute(
    /<title\b[^>]*>([\s\S]*?)<\/title\s*>/iu.exec(head)?.[1] ?? sourcePath,
  ).replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim();
  const metadata = new Map();
  for (const match of head.matchAll(/<(?:link|meta)\b[^>]*>/giu)) {
    const tag = match[0];
    const attrs = attributes(tag);
    const isLink = /^<link\b/iu.test(tag);
    if (isLink && (attrs.get("rel") ?? "").toLowerCase() === "canonical") {
      const raw = attrs.get("href") ?? "";
      const locator = "/head/link[@rel='canonical']/@href";
      const effective = effectivePublicValue(
        raw,
        "canonical",
        sourcePath,
        locator,
        authority,
        diagnostics,
      );
      const record = {
        source: sourcePath,
        locator,
        carrier: "canonical",
        property: "canonical",
        raw,
        effective,
        token: PUBLIC_TOKEN.exec(raw)?.[1] ?? null,
        relationship_role: "primary_retrieval",
        objectType: "HTML document",
        objectName: documentTitle,
      };
      const selected = metadata.get("canonical") ?? [];
      selected.push(record);
      metadata.set("canonical", selected);
      records.push(record);
      continue;
    }
    if (!isLink) {
      const key = (attrs.get("property") ?? attrs.get("name") ?? "").toLowerCase();
      if (key === "") continue;
      const raw = attrs.get("content") ?? "";
      let carrier = null;
      let role = null;
      if (key === "og:url") {
        carrier = "open_graph_url";
        role = "primary_retrieval";
      } else if (key === "og:image") {
        carrier = "open_graph_image";
        role = "primary_asset";
      } else if (key === "twitter:image") {
        carrier = "twitter_image";
        role = "primary_asset";
      }
      const locator = `/head/meta[@${attrs.has("property") ? "property" : "name"}='${key}']/@content`;
      const effective = carrier === null
        ? raw
        : effectivePublicValue(
            raw,
            carrier,
            sourcePath,
            locator,
            authority,
            diagnostics,
          );
      const record = {
        source: sourcePath,
        locator,
        carrier,
        property: key,
        raw,
        effective,
        token: PUBLIC_TOKEN.exec(raw)?.[1] ?? null,
        relationship_role: role,
        objectType: "HTML document",
        objectName: documentTitle,
      };
      const selected = metadata.get(key) ?? [];
      selected.push(record);
      metadata.set(key, selected);
      if (carrier !== null) records.push(record);
    }
  }

  const canonicalRecord = addSingletonDiagnostic(
    metadata,
    "canonical",
    sourcePath,
    "/head/link[@rel='canonical']",
    diagnostics,
  );
  for (const key of REQUIRED_OPEN_GRAPH) {
    addSingletonDiagnostic(metadata, key, sourcePath, `/head/meta[@property='${key}']`, diagnostics);
  }
  for (const key of REQUIRED_TWITTER) {
    addSingletonDiagnostic(metadata, key, sourcePath, `/head/meta[@name='${key}']`, diagnostics);
  }
  const imageDetailsPresent = OPTIONAL_OPEN_GRAPH_IMAGE_DETAILS.filter((key) =>
    (metadata.get(key)?.length ?? 0) > 0);
  if (imageDetailsPresent.length > 0) {
    for (const key of OPTIONAL_OPEN_GRAPH_IMAGE_DETAILS) {
      addSingletonDiagnostic(
        metadata,
        key,
        sourcePath,
        `/head/meta[@property='${key}']`,
        diagnostics,
      );
    }
    const imageType = metadata.get("og:image:type")?.[0]?.raw ?? "";
    if (imageType !== "" && !/^image\/[a-z0-9.+-]+$/u.test(imageType)) {
      diagnostics.push(diagnostic({
        code: "HEAD_SOCIAL_IMAGE_TYPE",
        source: sourcePath,
        locator: "/head/meta[@property='og:image:type']/@content",
        observed: imageType,
        expected: "one image media type",
        remediation: "Declare the production asset's exact image media type.",
      }));
    }
    for (const key of ["og:image:width", "og:image:height"]) {
      const value = metadata.get(key)?.[0]?.raw ?? "";
      if (value !== "" && !/^[1-9][0-9]*$/u.test(value)) {
        diagnostics.push(diagnostic({
          code: "HEAD_SOCIAL_IMAGE_DIMENSION",
          source: sourcePath,
          locator: `/head/meta[@property='${key}']/@content`,
          observed: value,
          expected: "one positive integer pixel dimension",
          remediation: "Declare the accepted social image's exact pixel dimension.",
        }));
      }
    }
  }
  const canonical = canonicalRecord?.effective ?? null;
  const ogUrl = metadata.get("og:url")?.[0]?.effective ?? null;
  if (canonical !== null && ogUrl !== null && canonical !== ogUrl) {
    diagnostics.push(diagnostic({
      code: "HEAD_METADATA_IDENTITY_MISMATCH",
      source: sourcePath,
      locator: "/head/meta[@property='og:url']/@content",
      observed: ogUrl,
      expected: canonical,
      remediation: "Use the same page-route authority for canonical and Open Graph identity.",
    }));
  }
  const openGraphImage = metadata.get("og:image")?.[0]?.effective ?? null;
  const twitterImage = metadata.get("twitter:image")?.[0]?.effective ?? null;
  if (
    openGraphImage !== null &&
    twitterImage !== null &&
    openGraphImage !== twitterImage
  ) {
    diagnostics.push(diagnostic({
      code: "HEAD_SOCIAL_IMAGE_MISMATCH",
      source: sourcePath,
      locator: "/head/meta[@name='twitter:image']/@content",
      observed: twitterImage,
      expected: openGraphImage,
      remediation: "Use the same reviewed social image, or introduce an explicit receiver-specific derivative contract.",
    }));
  }

  const parsedBlocks = [];
  for (const block of jsonScriptBlocks(head)) {
    const locator = `/head/script[@type='application/ld+json'][${block.index + 1}]`;
    try {
      const value = JSON.parse(block.body);
      parsedBlocks.push({ value, index: block.index });
      walkJsonUrls(
        value,
        `/jsonld/${block.index}`,
        sourcePath,
        authority,
        diagnostics,
        records,
        jsonLdTraversalBudget(),
      );
    } catch {
      diagnostics.push(diagnostic({
        code: "HEAD_JSONLD_PARSE",
        source: sourcePath,
        locator,
        observed: "malformed JSON-LD",
        expected: "one parseable JSON document",
        remediation: "Repair this JSON-LD block while preserving the other page findings.",
      }));
    }
  }
  if (parsedBlocks.length === 0) {
    diagnostics.push(diagnostic({
      code: "HEAD_JSONLD_MISSING",
      source: sourcePath,
      locator: "/head",
      observed: 0,
      expected: "at least one page identity JSON-LD block",
      remediation: "Add the structured page identity required by this visitor page family.",
    }));
  }

  const identityDefinitions = new Map();
  for (const block of parsedBlocks) {
    collectJsonLdIdentityDefinitions(
      block.value,
      `/jsonld/${block.index}`,
      sourcePath,
      authority,
      identityDefinitions,
      jsonLdTraversalBudget(),
    );
  }
  for (const [identity, pointers] of identityDefinitions) {
    if (pointers.length < 2) continue;
    diagnostics.push(diagnostic({
      code: "HEAD_JSONLD_ID_DUPLICATE",
      source: sourcePath,
      locator: pointers[1],
      observed: pointers,
      expected: `one defining object for ${identity}`,
      remediation: "Keep one defining graph node and use @id-only references for later relationships.",
    }));
  }

  const candidates = rootCandidates(parsedBlocks);
  const matching = candidates.filter(({ node }) => {
    const rawId = typeof node["@id"] === "string" ? node["@id"] : null;
    const rawUrl = typeof node.url === "string" ? node.url : null;
    const resolvedId = rawId === null
      ? null
      : resolvePublicValue(rawId, "jsonld", sourcePath, "/jsonld/root/@id", authority, []);
    const resolvedUrl = rawUrl === null
      ? null
      : resolvePublicValue(rawUrl, "jsonld", sourcePath, "/jsonld/root/url", authority, []);
    return canonical !== null &&
      (publicIdentityBase(resolvedId) === canonical || resolvedUrl === canonical);
  });
  if (canonical !== null && matching.length === 0) {
    diagnostics.push(diagnostic({
      code: "HEAD_JSONLD_IDENTITY_MISMATCH",
      source: sourcePath,
      locator: "/jsonld",
      observed: candidates.map(({ node }) => ({
        "@id": node["@id"] ?? null,
        url: node.url ?? null,
      })),
      expected: canonical,
      remediation: "Bind the page-root JSON-LD identity to the canonical page route.",
    }));
  }
  if (canonical !== null && matching.length > 1) {
    diagnostics.push(diagnostic({
      code: "HEAD_JSONLD_ROOT_AMBIGUOUS",
      source: sourcePath,
      locator: "/jsonld",
      observed: matching.map(({ pointer }) => pointer),
      expected: "one page root whose identity matches the canonical route",
      remediation: "Keep one family-specific page root and model related graph nodes through distinct identities.",
    }));
  }
  for (const { node, pointer } of matching) {
    if (typeof node["@id"] !== "string") {
      diagnostics.push(diagnostic({
        code: "HEAD_JSONLD_ROOT_ID_MISSING",
        source: sourcePath,
        locator: `${pointer}/@id`,
        observed: null,
        expected: "a stable fragment-bearing page identity",
        remediation: "Add the family-specific page-root identifier from route authority.",
      }));
    } else {
      const resolvedId = resolvePublicValue(
        node["@id"],
        "jsonld",
        sourcePath,
        `${pointer}/@id`,
        authority,
        [],
      );
      let fragment = "";
      try {
        fragment = new URL(resolvedId).hash;
      } catch {
        // The URL-shape diagnostic from the inventory retains the primary fault.
      }
      if (publicIdentityBase(resolvedId) !== canonical) {
        diagnostics.push(diagnostic({
          code: "HEAD_JSONLD_ROOT_ID_MISMATCH",
          source: sourcePath,
          locator: `${pointer}/@id`,
          observed: resolvedId,
          expected: `${canonical} plus one stable fragment`,
          remediation: "Bind the page-root identifier to its canonical retrieval route.",
        }));
      }
      if (fragment.length < 2) {
        diagnostics.push(diagnostic({
          code: "HEAD_JSONLD_ROOT_FRAGMENT_MISSING",
          source: sourcePath,
          locator: `${pointer}/@id`,
          observed: resolvedId,
          expected: "the canonical page route plus one stable nonempty fragment",
          remediation: "Select the family-specific fragment-bearing page identity from route authority.",
        }));
      }
    }
    if (typeof node.url !== "string") {
      diagnostics.push(diagnostic({
        code: "HEAD_JSONLD_ROOT_URL_MISSING",
        source: sourcePath,
        locator: `${pointer}/url`,
        observed: null,
        expected: canonical,
        remediation: "Add the canonical retrieval route to the page-root JSON-LD object.",
      }));
    } else {
      const resolvedUrl = resolvePublicValue(
        node.url,
        "jsonld",
        sourcePath,
        `${pointer}/url`,
        authority,
        [],
      );
      if (resolvedUrl !== canonical) {
        diagnostics.push(diagnostic({
          code: "HEAD_JSONLD_ROOT_URL_MISMATCH",
          source: sourcePath,
          locator: `${pointer}/url`,
          observed: resolvedUrl,
          expected: canonical,
          remediation: "Use the canonical retrieval route for the page root's url relationship.",
        }));
      }
    }
    if (typeNames(node).some((name) => ARTICLE_TYPES.has(name))) {
      for (const [property, expected, remediation] of [
        ["author", "one or more identified or typed, named author relationships", "Add the page family's truthful author identity."],
        ["publisher", "one or more identified or typed, named publisher relationships", "Add the page family's truthful publisher identity."],
      ]) {
        const relationship = node[property];
        const valid = hasMeaningfulRelationship(relationship);
        if (valid) continue;
        diagnostics.push(diagnostic({
          code: property === "author"
            ? "HEAD_JSONLD_AUTHOR_MISSING"
            : "HEAD_JSONLD_PUBLISHER_MISSING",
          source: sourcePath,
          locator: `${pointer}/${property}`,
          observed: relationship ?? null,
          expected,
          remediation,
        }));
      }
    }
  }

  const dateModified = matching
    .map(({ node }) => node.dateModified)
    .find((value) => typeof value === "string") ?? null;
  return {
    sourcePath,
    diagnostics: sortDiagnostics(diagnostics),
    records,
    canonical,
    dateModified,
    parsedJsonLdCount: parsedBlocks.length,
  };
}

function documentValue(documents, path) {
  if (documents instanceof Map) return documents.get(path);
  if (documents !== null && typeof documents === "object") return documents[path];
  return undefined;
}

function inspectSitemap(source, authority, diagnostics) {
  const records = [];
  if (typeof source !== "string") {
    diagnostics.push(diagnostic({
      code: "HEAD_SITEMAP_MISSING",
      source: `${CONTEXT_CANVAS_SOURCE_ROOT}/sitemap.xml`,
      observed: typeof source,
      expected: "UTF-8 XML text",
      remediation: "Supply the tracked sitemap to the route validator.",
    }));
    return records;
  }
  let index = 0;
  for (const match of source.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gu)) {
    const raw = decodeHtmlAttribute(match[1].trim());
    const locator = `/urlset/url/${index}/loc`;
    const effective = effectivePublicValue(
      raw,
      "sitemap",
      `${CONTEXT_CANVAS_SOURCE_ROOT}/sitemap.xml`,
      locator,
      authority,
      diagnostics,
    );
    records.push({
      source: `${CONTEXT_CANVAS_SOURCE_ROOT}/sitemap.xml`,
      locator,
      carrier: "sitemap",
      property: "loc",
      raw,
      effective,
      token: PUBLIC_TOKEN.exec(raw)?.[1] ?? null,
      relationship_role: "primary_retrieval",
      objectType: "Sitemap URL",
      objectName: `Context Canvas sitemap entry ${index + 1}`,
    });
    index += 1;
  }
  return records;
}

function standingDiagnostics({ primaryManifest, documents, sitemapValues }) {
  const findings = [];
  const manifestSources = new Set(
    Array.isArray(primaryManifest?.files)
      ? primaryManifest.files.map((entry) => entry?.source_path).filter(Boolean)
      : [],
  );
  const hasNoindex = (html) => [...html.matchAll(/<meta\b[^>]*>/giu)]
    .map(([tag]) => attributes(tag))
    .some((attrs) =>
      (attrs.get("name") ?? "").toLowerCase() === "robots" &&
      (attrs.get("content") ?? "")
        .toLowerCase()
        .split(",")
        .map((part) => part.trim())
        .includes("noindex"));
  for (const [path, role] of [
    [CONTEXT_CANVAS_404_PATH, "manifested 404"],
    [CONTEXT_CANVAS_RETAINED_EXEMPLAR_PATH, "retained exemplar"],
  ]) {
    const html = documentValue(documents, path);
    if (typeof html !== "string") {
      findings.push(diagnostic({
        code: "HEAD_STANDING_DOCUMENT_MISSING",
        source: path,
        observed: typeof html,
        expected: `${role} HTML text`,
        remediation: "Supply the standing document alongside the indexed page set.",
      }));
      continue;
    }
    if (!hasNoindex(html)) {
      findings.push(diagnostic({
        code: "HEAD_STANDING_NOINDEX_MISSING",
        source: path,
        locator: "/head/meta[@name='robots']",
        observed: "no noindex directive",
        expected: "noindex",
        remediation: `Keep the ${role} outside the indexed visitor collection.`,
      }));
    }
  }
  if (!manifestSources.has(CONTEXT_CANVAS_404_PATH)) {
    findings.push(diagnostic({
      code: "HEAD_404_MANIFEST_STANDING",
      source: CONTEXT_CANVAS_404_PATH,
      observed: "absent from primary manifest",
      expected: "manifested delivery with noindex standing",
      remediation: "Retain the 404 carrier in the primary deployment manifest.",
    }));
  }
  if (manifestSources.has(CONTEXT_CANVAS_RETAINED_EXEMPLAR_PATH)) {
    findings.push(diagnostic({
      code: "HEAD_EXEMPLAR_MANIFEST_STANDING",
      source: CONTEXT_CANVAS_RETAINED_EXEMPLAR_PATH,
      observed: "present in primary manifest",
      expected: "retained source outside the production route manifest",
      remediation: "Keep the retained exemplar outside the production projection.",
    }));
  }
  if (sitemapValues.some((value) => value?.endsWith("/404.html"))) {
    findings.push(diagnostic({
      code: "HEAD_404_SITEMAP_STANDING",
      source: `${CONTEXT_CANVAS_SOURCE_ROOT}/sitemap.xml`,
      observed: "404 route present",
      expected: "404 route absent",
      remediation: "Keep the 404 carrier outside the indexed sitemap set.",
    }));
  }
  if (sitemapValues.some((value) => value?.endsWith("/exemplar-index-landing.html"))) {
    findings.push(diagnostic({
      code: "HEAD_EXEMPLAR_SITEMAP_STANDING",
      source: `${CONTEXT_CANVAS_SOURCE_ROOT}/sitemap.xml`,
      observed: "retained exemplar route present",
      expected: "retained exemplar route absent",
      remediation: "Keep the retained exemplar outside the indexed sitemap set.",
    }));
  }
  return findings;
}

export function validateContextCanvasHeadRoutes({
  primaryManifest,
  documents,
  sitemapSource,
  authority: rawAuthority = null,
  expectedPageCount = 40,
  requireStandingDocuments = true,
}) {
  const authority = authorityAdapter(rawAuthority);
  const derived = deriveIndexedContextCanvasPages(primaryManifest, {
    expectedPageCount,
  });
  const diagnostics = [...derived.diagnostics];
  const records = [];
  const pageResults = [];

  for (const page of derived.pages) {
    const html = documentValue(documents, page.sourcePath);
    if (typeof html !== "string") {
      diagnostics.push(diagnostic({
        code: "HEAD_DOCUMENT_MISSING",
        source: page.sourcePath,
        observed: typeof html,
        expected: "manifest-owned page HTML text",
        remediation: "Supply every manifest-derived indexed page to the validator.",
      }));
      continue;
    }
    const result = inspectContextCanvasHeadDocument({
      sourcePath: page.sourcePath,
      html,
      authority,
    });
    diagnostics.push(...result.diagnostics);
    records.push(...result.records);
    pageResults.push(result);
  }

  const sitemapRecords = inspectSitemap(sitemapSource, authority, diagnostics);
  records.push(...sitemapRecords);
  const sitemapValues = sitemapRecords.map(({ effective }) => effective).filter(Boolean);
  const sitemapSet = new Set(sitemapValues);
  const canonicalValues = pageResults.map(({ canonical }) => canonical).filter(Boolean);
  const canonicalSet = new Set(canonicalValues);
  if (canonicalSet.size !== canonicalValues.length) {
    diagnostics.push(diagnostic({
      code: "HEAD_CANONICAL_DUPLICATE_ROUTE",
      source: CONTEXT_CANVAS_SOURCE_ROOT,
      observed: canonicalValues.length - canonicalSet.size,
      expected: 0,
      remediation: "Give each manifest-derived indexed page one distinct canonical route.",
    }));
  }
  if (sitemapSet.size !== sitemapValues.length) {
    diagnostics.push(diagnostic({
      code: "HEAD_SITEMAP_DUPLICATE_ROUTE",
      source: `${CONTEXT_CANVAS_SOURCE_ROOT}/sitemap.xml`,
      observed: sitemapValues.length - sitemapSet.size,
      expected: 0,
      remediation: "Keep one sitemap loc for each manifest-derived indexed page.",
    }));
  }
  for (const canonical of canonicalSet) {
    if (!sitemapSet.has(canonical)) {
      diagnostics.push(diagnostic({
        code: "HEAD_SITEMAP_ROUTE_MISSING",
        source: `${CONTEXT_CANVAS_SOURCE_ROOT}/sitemap.xml`,
        observed: null,
        expected: canonical,
        remediation: "Materialize the manifest-owned canonical route into the sitemap.",
      }));
    }
  }
  for (const sitemapValue of sitemapSet) {
    if (!canonicalSet.has(sitemapValue)) {
      diagnostics.push(diagnostic({
        code: "HEAD_SITEMAP_ROUTE_EXTRA",
        source: `${CONTEXT_CANVAS_SOURCE_ROOT}/sitemap.xml`,
        observed: sitemapValue,
        expected: "one canonical route from the indexed page set",
        remediation: "Align the sitemap population with the manifest-derived page set.",
      }));
    }
  }
  if (requireStandingDocuments) {
    diagnostics.push(...standingDiagnostics({
      primaryManifest,
      documents,
      sitemapValues,
    }));
  }

  const selected = sortDiagnostics(diagnostics);
  return {
    id: CONTEXT_CANVAS_HEAD_ROUTE_CONTRACT_ID,
    accepted: selected.length === 0,
    pageCount: derived.pages.length,
    recordCount: records.length,
    pages: derived.pages,
    pageResults,
    records,
    diagnostics: selected,
  };
}

export function formatContextCanvasHeadRouteDiagnostics(
  result,
  { format = "human" } = {},
) {
  if (format === "json") {
    return `${JSON.stringify({
      id: result.id ?? CONTEXT_CANVAS_HEAD_ROUTE_CONTRACT_ID,
      accepted: result.accepted === true,
      page_count: result.pageCount ?? 0,
      record_count: result.recordCount ?? 0,
      diagnostics: result.diagnostics ?? [],
    }, null, 2)}\n`;
  }
  const findings = result.diagnostics ?? [];
  if (findings.length === 0) {
    return `Context Canvas head-route authority: PASS (${result.pageCount ?? 0} pages; ${result.recordCount ?? 0} URL carriers)\n`;
  }
  const lines = [
    `Context Canvas head-route authority: ${findings.length} finding${findings.length === 1 ? "" : "s"}`,
  ];
  for (const finding of findings) {
    lines.push(
      `- ${finding.code} · ${finding.source}${finding.locator ? ` · ${finding.locator}` : ""}`,
      `  ${finding.remediation}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

export function contextCanvasHeadRouteExitCode(result) {
  return (result?.diagnostics?.length ?? 0) === 0 ? 0 : 1;
}

import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const visitorSurfaceRoot = join(
  repositoryRoot,
  "context-canvas-project-surface",
);
const contextRoot = join(
  visitorSurfaceRoot,
  "context-canvas",
);
const routeManifestPath = join(
  repositoryRoot,
  "core-architectures-chimeric-prototype-current-pack-v0.1/public-iframe-route-manifest-v1.json",
);
const contextCoreManifestPath = join(
  contextRoot,
  "prototypes/core-architectures/chimeric-pack-v0.1/core-architectures-chimeric-prototype-manifest-v0.1.json",
);
const canvasRouteManifestPath = join(
  repositoryRoot,
  "iframe-route-families/canvas/public-iframe-route-manifest-v1.json",
);
const exemplarOwner =
  "context-canvas-project-surface/site-readings/exemplars/index-exemplar--cobalt-temporal-field.html";
const primaryIndexOwner = "context-canvas-project-surface/context-canvas/index.html";

const expectedCarrierInventory = [
  [
    "context-canvas-project-surface/context-canvas/ai-systems.html",
    "https://iframes.vik.guru/v1/core/conditioning-field/",
    "Interactive Conditioning Field prompt formulation, repair, and human-referent surface",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/ai-systems.html",
    "https://iframes.vik.guru/v1/canvas/registry-goal-fidelity/",
    "Interactive Registry Goal Fidelity controls and routing surface",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/concept-nursery.html",
    "https://iframes.vik.guru/v1/core/cross-channel-blueprint/",
    "Interactive Shared Surface Priority Map companion",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/core-architectures-orientation-index.html",
    "https://iframes.vik.guru/v1/core/heart-chart/",
    "Interactive HEART Chart companion",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/core-architectures-orientation-index.html",
    "https://iframes.vik.guru/v1/core/core-architecture-family-index/",
    "Interactive Core Architecture Family Index operational companion",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/cross-platform-collaboration-cycle.html",
    "https://iframes.vik.guru/v1/core/specification-by-example/",
    "Specification-by-Example chimeric prototype",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/cross-platform-collaboration-cycle.html",
    "https://iframes.vik.guru/v1/canvas/cross-platform-collaboration-cycle/",
    "Cross-platform collaboration turn presentation",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/fmi-lims-eln-replatforming.html",
    "https://iframes.vik.guru/v1/canvas/lims-eln-program-constellation/",
    "LIMS and ELN program constellation: hierarchy, capabilities, scenarios, technical surfaces, and current environment boundary",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/fmi-lims-eln-replatforming.html",
    "https://iframes.vik.guru/v1/core/strategy-canvas/",
    "Strategy Canvas carrier for comparing current state, good-enough thresholds, and desired state",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/genomic-viewer-replatforming.html",
    "https://iframes.vik.guru/v1/canvas/genomic-viewer-context-tree/",
    "Genomic viewer Actor Context Board with view and population filters",
    "eager",
  ],
  [
    "context-canvas-project-surface/context-canvas/grammar-family.html",
    "https://iframes.vik.guru/v1/core/strategy-canvas/",
    "Interactive Strategy Canvas collaboration workbench",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/hiring-surfaces-talent-agent-intake.html",
    "https://iframes.vik.guru/v1/canvas/talent-agent-intake/",
    "Interactive two-reader talent-intake projection field",
    "lazy",
  ],
  [
    primaryIndexOwner,
    "https://iframes.vik.guru/v1/canvas/cross-functional-investment-studio/",
    "Interactive Cross-Functional Investment Studio",
    "eager",
  ],
  [
    primaryIndexOwner,
    "https://iframes.vik.guru/v1/canvas/prompt-conditions-explorer/",
    "Prompt Conditions Routing Explorer",
    "lazy",
  ],
  [
    primaryIndexOwner,
    "https://iframes.vik.guru/v1/canvas/heatmap-comparison/",
    "Interactive before and after heatmap comparison",
    "lazy",
  ],
  [
    primaryIndexOwner,
    "https://iframes.vik.guru/v1/canvas/ai-method-gallery/",
    "Interactive AI and ML method gallery",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/initiative-costing.html",
    "https://iframes.vik.guru/v1/canvas/cross-functional-investment-model-studio/",
    "Interactive Cross-Functional Investment Model Studio with eight costing methods",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/metadata-blocks.html",
    "https://iframes.vik.guru/v1/canvas/threadkeeping-ledger/",
    "Interactive Threadkeeping Ledger companion",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/planning-surface.html",
    "https://iframes.vik.guru/v1/core/service-design-blueprint/",
    "Service-design Blueprint chimeric prototype",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/poda.html",
    "https://iframes.vik.guru/v1/core/poda/",
    "Interactive PODA Core Architecture companion",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/prompt-side-conditions-practice.html",
    "https://iframes.vik.guru/v1/canvas/open-lesson-field/",
    "Open Lesson Field educator collaboration instrument",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/registry-goal-fidelity-routing.html",
    "https://iframes.vik.guru/v1/canvas/registry-goal-fidelity/",
    "Interactive Registry Goal Fidelity recovery and re-entry instrument",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/visualization-fidelity-atlas.html",
    "https://iframes.vik.guru/v1/canvas/visualization-fidelity-atlas/",
    "Visualization Fidelity Atlas chimeric prototype",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/visualization-fidelity-atlas.html",
    "https://iframes.vik.guru/v1/canvas/visualization-fidelity-selector/",
    "Visualization Fidelity Atlas qualitative selector",
    "lazy",
  ],
  [
    "context-canvas-project-surface/context-canvas/who-to-believe-reviews-platform.html",
    "https://iframes.vik.guru/v1/canvas/who-to-believe-context-tree/",
    "Interactive Who To Believe Context Tree",
    "eager",
  ],
  [
    exemplarOwner,
    "https://iframes.vik.guru/v1/canvas/cross-functional-investment-studio/",
    "Interactive Cross-Functional Investment Studio",
    "eager",
  ],
  [
    exemplarOwner,
    "https://iframes.vik.guru/v1/canvas/heatmap-comparison/",
    "Interactive before and after heatmap comparison",
    "lazy",
  ],
  [
    exemplarOwner,
    "https://iframes.vik.guru/v1/canvas/ai-method-gallery/",
    "Interactive AI and ML method gallery",
    "lazy",
  ],
];

const expectedDuplicateRouteCounts = [
  ["https://iframes.vik.guru/v1/canvas/ai-method-gallery/", 2],
  ["https://iframes.vik.guru/v1/canvas/cross-functional-investment-studio/", 2],
  ["https://iframes.vik.guru/v1/canvas/heatmap-comparison/", 2],
  ["https://iframes.vik.guru/v1/canvas/registry-goal-fidelity/", 2],
  ["https://iframes.vik.guru/v1/core/strategy-canvas/", 2],
];

function attributeValue(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(
    new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function escapeExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function repositoryPath(path) {
  return relative(repositoryRoot, path).split(sep).join("/");
}

async function filesWithin(root, predicate) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await filesWithin(path, predicate));
    if (entry.isFile() && predicate(path)) files.push(path);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function tokens(value, separator) {
  if (value === null || value.trim() === "") return [];
  return value.split(separator).map((token) => token.trim()).filter(Boolean);
}

function routeCountEntries(carriers) {
  const counts = new Map();
  for (const { src } of carriers) counts.set(src, (counts.get(src) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => left.localeCompare(right));
}

function localReferenceIdentity(ownerPath, href) {
  if (
    href.startsWith("#") ||
    href.startsWith("/") ||
    /^[a-z][a-z\d+.-]*:/iu.test(href)
  ) return null;
  const match = href.match(/^([^?#]+)([?#].*)?$/u);
  if (!match) return null;
  return `${repositoryPath(resolve(dirname(ownerPath), match[1]))}${match[2] ?? ""}`;
}

function routeSourceIdentity(family, route, contextCoreFiles = new Map()) {
  if (family === "canvas") {
    return `${route.source_file}${route.source_view ? `?view=${route.source_view}` : ""}`;
  }
  const sourceRoot = route.source_root ??
    "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1";
  return `${sourceRoot}/${contextCoreFiles.get(route.id) ?? route.source_file}`;
}

function enclosingSemanticBlocks(html, targetIndex) {
  const stack = [];
  for (const match of html.matchAll(/<\/?(section|article|figure)\b[^>]*>/giu)) {
    if (match.index > targetIndex) break;
    const tagName = match[1].toLowerCase();
    if (match[0].startsWith("</")) {
      const openIndex = stack.map(({ tag }) => tag).lastIndexOf(tagName);
      if (openIndex >= 0) stack.splice(openIndex, 1);
    } else {
      stack.push({ start: match.index, tag: tagName });
    }
  }
  return [...stack].reverse().map((owner) => {
    const tagPattern = new RegExp(`<\\/?${owner.tag}\\b[^>]*>`, "giu");
    tagPattern.lastIndex = owner.start;
    let depth = 0;
    for (const match of html.matchAll(tagPattern)) {
      if (match.index < owner.start) continue;
      depth += match[0].startsWith("</") ? -1 : 1;
      if (depth === 0) return html.slice(owner.start, match.index + match[0].length);
    }
    return "";
  }).filter(Boolean);
}

async function discoverVisitorCarriers() {
  const carriers = [];
  const htmlPaths = await filesWithin(visitorSurfaceRoot, (path) => path.endsWith(".html"));
  for (const path of htmlPaths) {
    const html = await readFile(path, "utf8");
    assert.doesNotMatch(
      html,
      /<!--[\s\S]*?<iframe\b[\s\S]*?-->/iu,
      `${repositoryPath(path)} does not hide a carrier in an HTML comment`,
    );
    const openingTags = [...html.matchAll(/<iframe\b[^>]*>/giu)];
    const completeTags = [...html.matchAll(/(<iframe\b[^>]*>)([\s\S]*?)<\/iframe>/giu)];
    assert.equal(
      completeTags.length,
      openingTags.length,
      `${repositoryPath(path)} closes every iframe explicitly`,
    );
    for (let index = 0; index < openingTags.length; index += 1) {
      const opening = openingTags[index];
      const complete = completeTags[index];
      assert.equal(complete.index, opening.index, `${repositoryPath(path)} iframe pairing`);
      assert.equal(complete[1], opening[0], `${repositoryPath(path)} iframe opening tag`);
      assert.equal(complete[2].trim(), "", `${repositoryPath(path)} iframe has no fallback body`);
      const tag = opening[0];
      carriers.push({
        allow: attributeValue(tag, "allow"),
        blocks: enclosingSemanticBlocks(html, opening.index),
        loading: attributeValue(tag, "loading"),
        owner: repositoryPath(path),
        ownerPath: path,
        referrerpolicy: attributeValue(tag, "referrerpolicy"),
        sandbox: attributeValue(tag, "sandbox"),
        src: attributeValue(tag, "src"),
        tag,
        title: attributeValue(tag, "title"),
      });
    }
  }
  return carriers;
}

test("all Context Canvas iframe carriers remain explicitly inventoried", async () => {
  const [manifests, contextCoreManifest] = await Promise.all([
    Promise.all([
    ["core", routeManifestPath],
    ["canvas", canvasRouteManifestPath],
  ].map(async ([family, path]) => [
    family,
    JSON.parse(await readFile(path, "utf8")),
    ])),
    readFile(contextCoreManifestPath, "utf8").then(JSON.parse),
  ]);
  const contextCoreFiles = new Map(
    contextCoreManifest.prototypes.map((entry) => [entry.id, entry.file]),
  );
  const routeByPublicUrl = new Map();
  for (const [family, manifest] of manifests) {
    for (const route of manifest.routes) {
      const publicUrl = `https://${manifest.host}${route.public_alias}`;
      assert.equal(routeByPublicUrl.has(publicUrl), false, `${publicUrl} has one manifest owner`);
      routeByPublicUrl.set(publicUrl, { family, manifest, route });
    }
  }

  const carriers = await discoverVisitorCarriers();
  assert.deepEqual(
    carriers.map(({ owner, src, title, loading }) => [owner, src, title, loading]),
    expectedCarrierInventory,
    "the authored owner, route, title, loading, and source order stay explicit",
  );
  assert.equal(carriers.length, 28, "the visitor source owns 28 iframe occurrences");
  assert.equal(new Set(carriers.map(({ src }) => src)).size, 23, "the carriers use 23 routes");
  assert.equal(new Set(carriers.map(({ owner }) => owner)).size, 18, "18 visitor files own carriers");
  const canvasCarriers = carriers.filter(({ src }) =>
    src.startsWith("https://iframes.vik.guru/v1/canvas/"));
  assert.equal(canvasCarriers.length, 19, "the Canvas manifest owns 19 carrier occurrences");
  assert.equal(new Set(canvasCarriers.map(({ src }) => src)).size, 15, "the Canvas carriers use 15 routes");
  assert.deepEqual(
    routeCountEntries(carriers).filter(([, count]) => count > 1),
    expectedDuplicateRouteCounts,
    "only the five declared routes have duplicate carriers",
  );

  for (const carrier of carriers) {
    const profile = routeByPublicUrl.get(carrier.src);
    const label = `${carrier.owner} → ${profile?.route.id ?? carrier.src}`;
    assert.ok(profile, `${label} resolves through the Core or Canvas manifest`);
    assert.ok(carrier.title?.trim(), `${label} has a contextual title`);
    assert.notEqual(carrier.sandbox, null, `${label} declares an explicit sandbox`);
    assert.equal(carrier.referrerpolicy, profile.manifest.carrier_contract.referrer_policy, `${label} referrer policy`);
    assert.equal(attributeValue(carrier.tag, "srcdoc"), null, `${label} does not use srcdoc`);
    assert.equal(attributeValue(carrier.tag, "data-src"), null, `${label} is not deferred`);
    assert.equal(attributeValue(carrier.tag, "data-public-src"), null, `${label} uses its active route directly`);

    const sandboxTokens = tokens(carrier.sandbox, /\s+/u);
    const allowFeatures = tokens(carrier.allow, /\s*;\s*/u);
    assert.equal(new Set(sandboxTokens).size, sandboxTokens.length, `${label} sandbox tokens are unique`);
    assert.equal(new Set(allowFeatures).size, allowFeatures.length, `${label} permission features are unique`);
    assert.deepEqual(
      [...sandboxTokens].sort(),
      [...profile.route.carrier_policy.sandbox_tokens].sort(),
      `${label} uses the exact minimal sandbox profile`,
    );
    assert.deepEqual(
      [...allowFeatures].sort(),
      [...profile.route.carrier_policy.permissions_policy].sort(),
      `${label} uses the exact minimal Permissions Policy profile`,
    );
    assert.equal(
      carrier.allow === null,
      profile.route.carrier_policy.permissions_policy.length === 0,
      `${label} omits an empty Permissions Policy attribute`,
    );

    const sourceIdentity = routeSourceIdentity(profile.family, profile.route, contextCoreFiles);
    const sourcePath = resolve(repositoryRoot, sourceIdentity.split(/[?#]/u, 1)[0]);
    assert.equal((await stat(sourcePath)).isFile(), true, `${label} local source is a regular file`);
    const singleCarrierBlocks = carrier.blocks.filter(
      (block) => (block.match(/<iframe\b/giu) ?? []).length === 1,
    );
    assert.ok(
      singleCarrierBlocks.length > 0,
      `${label} belongs to a bounded semantic block with one iframe`,
    );
    const localAnchorIdentities = singleCarrierBlocks.map((block) =>
      [...block.matchAll(/<a\b[^>]*>/giu)]
        .map((match) => attributeValue(match[0], "href"))
        .filter((href) => href !== null)
        .map((href) => localReferenceIdentity(carrier.ownerPath, href))
        .filter((identity) => identity !== null),
    );
    assert.ok(
      localAnchorIdentities.some((identities) => identities.includes(sourceIdentity)),
      `${label} retains a repository-local full-view source identity in a containing semantic block`,
    );
  }

  const runtimePaths = await filesWithin(
    visitorSurfaceRoot,
    (path) => /\.(?:html|js|mjs)$/u.test(path),
  );
  for (const path of runtimePaths) {
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(
      source,
      /(?:createElement(?:NS)?\s*\([^)]*["']iframe["']|HTMLIFrameElement|\.srcdoc\s*=|insertAdjacentHTML\s*\([^)]*<iframe|document\.write\s*\([^)]*<iframe)/iu,
      `${repositoryPath(path)} does not construct a hidden iframe carrier`,
    );
  }
});

test("the retained cobalt exemplar keeps exact carrier parity with the primary index", async () => {
  const carriers = await discoverVisitorCarriers();
  const exemplars = carriers.filter(({ owner }) => owner === exemplarOwner);
  const primary = carriers.filter(({ owner }) => owner === primaryIndexOwner);
  assert.equal(exemplars.length, 3, "the retained cobalt exemplar owns three iframe carriers");
  assert.deepEqual(
    exemplars.map(({ src }) => src),
    [
      "https://iframes.vik.guru/v1/canvas/cross-functional-investment-studio/",
      "https://iframes.vik.guru/v1/canvas/heatmap-comparison/",
      "https://iframes.vik.guru/v1/canvas/ai-method-gallery/",
    ],
  );
  for (const exemplar of exemplars) {
    const twin = primary.find(({ src }) => src === exemplar.src);
    assert.ok(twin, `${exemplar.src} has a primary-index twin`);
    assert.deepEqual(
      [exemplar.title, exemplar.loading, exemplar.sandbox, exemplar.allow, exemplar.referrerpolicy],
      [twin.title, twin.loading, twin.sandbox, twin.allow, twin.referrerpolicy],
      `${exemplar.src} preserves title and carrier-policy parity`,
    );
  }
});

test("manifest-owned prototype carriers keep a minimal explicit iframe boundary", async () => {
  const [manifest, contextCoreManifest] = await Promise.all([
    readFile(routeManifestPath, "utf8").then(JSON.parse),
    readFile(contextCoreManifestPath, "utf8").then(JSON.parse),
  ]);
  const contextCoreFiles = new Map(
    contextCoreManifest.prototypes.map((entry) => [entry.id, entry.file]),
  );
  const routeByPublicUrl = new Map(
    manifest.routes.map((route) => [
      `https://${manifest.host}${route.public_alias}`,
      route,
    ]),
  );
  const pages = (await readdir(contextRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => entry.name)
    .sort();

  const carriers = [];
  for (const page of pages) {
    const html = await readFile(join(contextRoot, page), "utf8");
    for (const match of html.matchAll(/<iframe\b[^>]*>/gi)) {
      const tag = match[0];
      const src = attributeValue(tag, "src");
      if (!src?.startsWith(`https://${manifest.host}${manifest.base_path}`)) continue;
      const figureStart = html.lastIndexOf("<figure", match.index);
      const figureEnd = html.indexOf("</figure>", match.index);
      const figure =
        figureStart >= 0 && figureEnd >= match.index
          ? html.slice(figureStart, figureEnd + "</figure>".length)
          : "";
      carriers.push({ page, figure, tag, src });
    }
  }

  assert.equal(carriers.length, 9, "the current Context Canvas owns nine hosted iframe carriers");
  assert.equal(
    new Set(carriers.map(({ src }) => src)).size,
    8,
    "the nine carriers use eight manifest-owned public routes",
  );

  for (const carrier of carriers) {
    const route = routeByPublicUrl.get(carrier.src);
    const label = `${carrier.page} → ${route?.id ?? carrier.src}`;
    const title = attributeValue(carrier.tag, "title");
    const sandbox = attributeValue(carrier.tag, "sandbox");
    const allow = attributeValue(carrier.tag, "allow");
    const sandboxTokens = sandbox?.split(/\s+/).filter(Boolean) ?? [];
    const allowFeatures = allow?.split(";").map((value) => value.trim()).filter(Boolean) ?? [];

    assert.ok(route, `${label} resolves to the public route manifest`);
    assert.ok(title?.trim(), `${label} has a contextual title`);
    assert.equal(attributeValue(carrier.tag, "loading"), "lazy", `${label} loads intentionally`);
    assert.notEqual(sandbox, null, `${label} declares a sandbox even when its token list is empty`);
    assert.equal(attributeValue(carrier.tag, "referrerpolicy"), "no-referrer", `${label} sends no referrer`);
    assert.equal(attributeValue(carrier.tag, "data-public-src"), null, `${label} uses its active stable route directly`);
    assert.doesNotMatch(
      sandbox,
      /allow-(?:same-origin|forms|popups|top-navigation|storage-access)/,
      `${label} avoids unrelated sandbox capabilities`,
    );
    assert.deepEqual(
      sandboxTokens,
      route.carrier_policy.sandbox_tokens,
      `${label} uses its exact public-route sandbox profile`,
    );
    assert.deepEqual(
      allowFeatures,
      route.carrier_policy.permissions_policy,
      `${label} uses the exact route Permissions Policy profile`,
    );
    const localFullView = route.id === "conditioning-field"
      ? "conditioning-field.html"
      : `prototypes/core-architectures/chimeric-pack-v0.1/${contextCoreFiles.get(route.id) ?? route.source_file}`;
    assert.match(
      carrier.figure,
      new RegExp(`href=["']${escapeExpression(localFullView)}["']`, "i"),
      `${label} keeps its repository-local full-view route in the owning figure`,
    );
    assert.doesNotMatch(
      carrier.figure,
      /data-public-(?:src|href)=/i,
      `${label} does not retain a superseded late-binding carrier`,
    );
  }

  const conditioningRoute = "https://iframes.vik.guru/v1/core/conditioning-field/";
  const conditioningCarrier = carriers.find(({ src }) => src === conditioningRoute);
  assert.ok(conditioningCarrier, "AI Systems embeds the hosted Conditioning Field route");
  assert.equal(conditioningCarrier.page, "ai-systems.html");
  assert.equal(attributeValue(conditioningCarrier.tag, "sandbox"), "allow-scripts");
  assert.equal(attributeValue(conditioningCarrier.tag, "allow"), null);
  assert.equal(attributeValue(conditioningCarrier.tag, "referrerpolicy"), "no-referrer");
  assert.match(
    conditioningCarrier.figure,
    /href=["']conditioning-field\.html["']/i,
    "the hosted Conditioning Field keeps its local standalone full view",
  );
  const aiSystemsHtml = await readFile(join(contextRoot, "ai-systems.html"), "utf8");
  assert.doesNotMatch(
    aiSystemsHtml,
    /<link\b[^>]*rel=["']prefetch["'][^>]*href=["']conditioning-field\.html["']/i,
    "AI Systems does not prefetch the local fallback ahead of its lazy hosted carrier",
  );
  const conditioningParentRuntime = [
    aiSystemsHtml,
    await readFile(join(contextRoot, "visitor-boundary-contract.js"), "utf8"),
    await readFile(join(contextRoot, "canvas-shell.js"), "utf8"),
  ].join("\n");
  assert.doesNotMatch(
    conditioningParentRuntime,
    /(?:addEventListener\s*\(\s*["']message["']|\bonmessage\s*=|\b(?:BroadcastChannel|MessageChannel)\s*\()/u,
    "the Conditioning Field parent and its shared runtime install no cross-document message receiver",
  );

  const hubRoute = manifest.routes.find(({ id }) => id === "core-architectures-pack");
  assert.ok(hubRoute, "the pack hub route remains in the public route manifest");
  assert.equal(
    carriers.some(({ src }) => src === `https://${manifest.host}${hubRoute.public_alias}`),
    false,
    "the multi-route pack index is presented as a full view rather than one union-capability iframe",
  );
  const orientationHtml = await readFile(
    join(contextRoot, "core-architectures-orientation-index.html"),
    "utf8",
  );
  assert.match(
    orientationHtml,
    new RegExp(
      `href=["']prototypes/core-architectures/chimeric-pack-v0\\.1/${escapeExpression(hubRoute.source_file)}["']`,
      "i",
    ),
    "the pack index keeps a direct repository-local full-view route",
  );

  const downloadCarriers = carriers.filter(({ tag }) =>
    (attributeValue(tag, "sandbox") ?? "").split(/\s+/).includes("allow-downloads"),
  );
  const downloadRoutes = downloadCarriers.map(({ src }) => src);
  assert.equal(downloadCarriers.length, 8, "the eight capsule carriers grant their implemented Markdown downloads");
  assert.equal(
    downloadRoutes.filter((src) => src === "https://iframes.vik.guru/v1/core/strategy-canvas/").length,
    2,
    "both Strategy Canvas carriers grant their source-owned Markdown download",
  );
  assert.equal(
    downloadRoutes.filter((src) => src === "https://iframes.vik.guru/v1/core/specification-by-example/").length,
    1,
    "the Specification-by-Example carrier grants its source-owned Markdown download",
  );
  assert.equal(
    downloadRoutes.filter((src) => src === "https://iframes.vik.guru/v1/core/core-architecture-family-index/").length,
    1,
    "the Family Index carrier grants its source-owned Markdown download",
  );
  assert.equal(
    downloadRoutes.filter((src) => src === "https://iframes.vik.guru/v1/core/heart-chart/").length,
    1,
    "the HEART Chart carrier grants its source-owned Markdown download",
  );
  assert.equal(
    downloadRoutes.filter((src) => src === "https://iframes.vik.guru/v1/core/poda/").length,
    1,
    "the PODA carrier grants its source-owned Markdown download",
  );
  assert.equal(
    downloadRoutes.filter((src) => src === "https://iframes.vik.guru/v1/core/cross-channel-blueprint/").length,
    1,
    "the Shared Surface Priority Map carrier grants its source-owned Markdown download",
  );
  assert.equal(
    downloadRoutes.filter((src) => src === "https://iframes.vik.guru/v1/core/service-design-blueprint/").length,
    1,
    "the Service-design Blueprint carrier grants its source-owned Markdown download",
  );
});

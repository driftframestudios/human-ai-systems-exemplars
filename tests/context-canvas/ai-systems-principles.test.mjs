import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);
const aiSystemsCollectionId =
  "https://schemas.radiantnull.com/context-canvas-project-surface/context-canvas/ai-systems.html#collection";
const aiSystemsCollectionName =
  "AI Systems — Accountable Decisions and Recoverable Work";
const humanAuthor = { "@type": "Person", name: "Vikrant Varun Kudesia" };
const publishingCompany = {
  "@type": "Organization",
  name: "Driftframe Studios, Limited Liability Company",
  url: "https://github.com/driftframestudios/human-ai-systems-exemplars",
};

const placements = new Map([
  ["ai-systems.html", {
    sectionId: "solution-title",
    after: {
      tag: "article",
      marker: "<p class=\"architecture-pair__label\">Opportunity</p>",
    },
    label: "Central operating principle",
    text: "A collaborative artifact earns its place when it changes a decision, preserves authority, or makes recovery easier.",
    footer: "Central operating principle",
  }],
  ["benchmark-orientation.html", {
    sectionId: "coordinate-title",
    after: {
      tag: "ol",
      marker: "class=\"benchmark-flow table-span-all\"",
    },
    label: "Benchmark orientation boundary",
    text: "Begin with the decision the measurement must support. Record the run and score coordinates. End with the smallest claim those coordinates can carry.",
    footer: "Benchmark orientation boundary",
  }],
  ["collaboration-skills.html", {
    sectionId: "receipt-title",
    after: {
      tag: "figure",
      marker: "href=\"../img/plot/collaboration_skill_affordance_field.svg\"",
    },
    label: "First-use boundary",
    text: "A skill offers a working method. The receiving team decides whether the method fits, which authority applies, and what material result counts.",
    footer: "First-use boundary",
  }],
  ["concept-nursery.html", {
    sectionId: "lifecycle-title",
    after: {
      tag: "figure",
      marker: "data-label=\"Six moves and their collaboration receipts\"",
    },
    label: "Concept Nursery boundary",
    text: "Stage the page with a named destination; move it when its use settles; record the move so the next steward can resume from the current location.",
    footer: "Staging contract",
  }],
  ["core-architectures-orientation-index.html", {
    sectionId: "resolver-title",
    after: {
      tag: "figure",
      marker: "href=\"../img/plot/core_architectures_resolver.svg\"",
    },
    label: "Core Architecture resolver principle",
    text: "Choose the architecture by the decision it must make inspectable.",
    footer: "Core Architecture resolver principle",
  }],
  ["cross-platform-collaboration-cycle.html", {
    sectionId: "records-title",
    after: {
      tag: "figure",
      marker: "data-label=\"What each surface preserves and where durable meaning lives\"",
    },
    label: "Collaboration cycle doctrine",
    text: "A discussion can explain a decision. In this collaboration cycle, the durable decision payload carries its resolved meaning, affected identities, dependencies, and acceptance into the next turn.",
    footer: "Current durable-record contract",
  }],
  ["grammar-family.html", {
    sectionId: "selection-title",
    after: {
      tag: "aside",
      marker: "aria-labelledby=\"selection-gate-title\"",
    },
    label: "Reading-form selection principle",
    text: "The strongest form carries each consequential distinction and gives every reader a clear route through it.",
    footer: "Grammar selection principle",
  }],
  ["hiring-surfaces-talent-agent-intake.html", {
    sectionId: "convergence-title",
    after: {
      tag: "figure",
      marker: "href=\"../img/plot/hiring_two_reader_operating_field.svg\"",
    },
    label: "Central two-reader principle",
    text: "Specificity reads senior to a human and parses cleanly for an agent.",
    footer: "Central two-reader principle",
  }],
  ["maps-evaluations.html", {
    sectionId: "canonical-title",
    after: {
      tag: "div",
      marker: "class=\"architecture-pair blueprint-pop-cards table-span-all\"",
    },
    label: "Canary-first reading boundary",
    text: "Read the canonical Evaluations Canary record first. Keep its exact marker intact with evaluation material so the stated filtering and detection purpose remains available.",
    footer: "Canary-first reading boundary",
  }],
  ["metadata-blocks.html", {
    sectionId: "metadata-scan-title",
    after: {
      tag: "dl",
      marker: "class=\"debrief-at-glance ai-systems-scan\"",
    },
    label: "Metadata authoring principle",
    text: "A field earns its slot when it helps a reader decide, interpret, or act.",
    footer: "Metadata authoring principle",
  }],
  ["planning-surface.html", {
    sectionId: "decision-title",
    after: {
      tag: "figure",
      marker: "data-label=\"Three decisions that make later reading work navigable\"",
    },
    label: "Planning artifact boundary",
    text: "This reusable decision hierarchy and stewardship contract describes what the shared area must make possible. Current scheduling and delivery decisions remain with their accountable initiative owners.",
    footer: "Planning boundary",
  }],
  ["poda.html", {
    sectionId: "poda-beats-title",
    after: {
      tag: "div",
      marker: "class=\"architecture-pair blueprint-pop-cards table-span-all\"",
    },
    label: "PODA operating principle",
    text: "Outcomes are discovered through encounter; the artifact form follows the learning.",
    footer: "PODA operating principle",
  }],
  ["readable-tables-reusable-evidence.html", {
    sectionId: "process-model-title",
    after: {
      tag: "details",
      marker: "<summary>Inspect numerical thresholds and the independent calculation</summary>",
    },
    label: "Verification timing principle",
    text: "Complete the fitting required checks after the last relevant change; use a focused observation when it can resolve a named uncertainty; and preserve the evidence that still answers its question. A probability can sharpen that discussion while the receiving people retain the decision.",
    footer: "Verification timing principle",
  }],
  ["registry-goal-fidelity-routing.html", {
    sectionId: "position-title",
    after: {
      tag: "figure",
      marker: "href=\"../img/plot/registry_goal_fidelity_operating_field.svg\"",
    },
    label: "Recovery and re-entry operating principle",
    text: "Preserve valid work. Change the layer that generated the strain.",
    footer: "Recovery and re-entry operating principle",
  }],
  ["resting-concepts.html", {
    sectionId: "architecture-title",
    after: {
      tag: "div",
      marker: "class=\"architecture-pair blueprint-pop-cards table-span-all\"",
    },
    label: "Resting Concepts boundary",
    text: "Rest is a reversible state. The page remains findable, its reason remains interpretable, and its return follows an observable condition recorded with the page.",
    footer: "Resting contract",
  }],
  ["shared-machinery.html", {
    sectionId: "shared-contract-title",
    after: {
      tag: "div",
      marker: "class=\"architecture-pair blueprint-pop-cards table-span-all\"",
    },
    label: "Shared Machinery operating principle",
    text: "The instrument stays small; the ownership needed to keep it useful remains explicit.",
    footer: "Shared Machinery operating principle",
  }],
  ["visualization-fidelity-atlas.html", {
    sectionId: "exemplar-title",
    after: {
      tag: "figure",
      marker: "href=\"../img/plot/visualization_fidelity_clean_exemplar.svg\"",
    },
    label: "Atlas doctrine",
    text: "The visual carries the reader’s comparison burden; its companion carries exact values, uncertainty, provenance, and a recoverable interpretation.",
    footer: "Visual selection doctrine",
  }],
]);

const sourceSectionIds = new Map([
  ["ai-systems.html", "sources-title"],
  ["benchmark-orientation.html", "sources-title"],
  ["collaboration-skills.html", "sources-title"],
  ["concept-nursery.html", "source-title"],
  ["core-architectures-orientation-index.html", "core-source-title"],
  ["cross-platform-collaboration-cycle.html", "source-title"],
  ["grammar-family.html", "grammar-source-title"],
  ["hiring-surfaces-talent-agent-intake.html", "sources-title"],
  ["maps-evaluations.html", "sources-title"],
  ["metadata-blocks.html", "metadata-source-title"],
  ["planning-surface.html", "source-title"],
  ["poda.html", "poda-source-title"],
  ["readable-tables-reusable-evidence.html", "sources-title"],
  ["registry-goal-fidelity-routing.html", "sources-title"],
  ["resting-concepts.html", "source-title"],
  ["shared-machinery.html", "sources-title"],
  ["visualization-fidelity-atlas.html", "source-title"],
]);

async function canvasFile(path) {
  return readFile(resolve(canvasRoot, path), "utf8");
}

function normalizedText(value) {
  return value
    .replace(/<[^>]+>/gu, "")
    .replace(/&amp;/gu, "&")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizedMetadataTitle(value) {
  return value
    .replace(/&amp;/gu, "&")
    .replace(/\s+\|\s+Context Canvas$/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function metadataContent(source, identity) {
  const tag = [...source.matchAll(/<meta\b[^>]*>/gu)].find((match) => (
    new RegExp(`(?:name|property)="${identity}"`, "u").test(match[0])
  ))?.[0];
  return tag?.match(/\bcontent="([^"]*)"/u)?.[1] ?? "";
}

function operatingPrinciples(source) {
  return [...source.matchAll(
    /<aside class="debrief-quote debrief-quote--operating-principle" aria-label="([^"]+)">([\s\S]*?)<\/aside>/gu,
  )];
}

function pageJsonLd(source) {
  const payload = source.match(
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/u,
  )?.[1];
  assert.ok(payload, "missing JSON-LD payload");
  return JSON.parse(payload);
}

function labelledOwner(source, sectionId) {
  const opening = new RegExp(
    "<(?<tag>section|article)\\b[^>]*aria-labelledby=\"" + sectionId + "\"[^>]*>",
    "u",
  ).exec(source);
  if (!opening) return null;

  const tags = new RegExp(`<\\/?${opening.groups.tag}\\b[^>]*>`, "gu");
  tags.lastIndex = opening.index;
  let depth = 0;
  let end = -1;

  for (const match of source.matchAll(tags)) {
    depth += match[0].startsWith(`</${opening.groups.tag}`) ? -1 : 1;
    if (depth === 0) {
      end = match.index + match[0].length;
      break;
    }
  }
  if (end < 0) return null;

  return {
    start: opening.index,
    end,
    tag: opening.groups.tag,
  };
}

function anchoredElementEnd(source, owner, expected) {
  const markerIndex = source.indexOf(expected.marker, owner.start);
  if (markerIndex < owner.start || markerIndex >= owner.end) return null;

  const openingIndex = source.lastIndexOf(`<${expected.tag}`, markerIndex);
  if (openingIndex < owner.start) return null;

  const tags = new RegExp(`<\\/?${expected.tag}\\b[^>]*>`, "gu");
  tags.lastIndex = openingIndex;
  let depth = 0;

  for (const match of source.matchAll(tags)) {
    if (match.index >= owner.end) break;
    depth += match[0].startsWith(`</${expected.tag}`) ? -1 : 1;
    if (depth === 0) return match.index + match[0].length;
  }

  return null;
}

function atRuleBlocks(source, openingPattern) {
  const blocks = [];
  for (const opening of source.matchAll(openingPattern)) {
    const start = opening.index;
    let depth = 0;
    let end = -1;
    for (let index = source.indexOf("{", start); index < source.length; index += 1) {
      if (source[index] === "{") depth += 1;
      if (source[index] === "}") depth -= 1;
      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
    assert.ok(end > start, `unterminated CSS at-rule at ${start}`);
    blocks.push(source.slice(start, end));
  }
  return blocks;
}

test("the complete AI Systems family carries one principle at its earned body transition", async () => {
  const aiSystemsRoutes = [];
  for (const entry of await readdir(canvasRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
    const source = await canvasFile(entry.name);
    if (/<body class="[^"]*\bai-systems-page\b/u.test(source)) {
      aiSystemsRoutes.push(entry.name);
    }
  }
  assert.deepEqual(aiSystemsRoutes.sort(), [...placements.keys()].sort());

  for (const [route, expected] of placements) {
    const source = await canvasFile(route);
    const principles = operatingPrinciples(source);
    assert.equal(principles.length, 1, route);

    const heroStart = source.indexOf("<header class=\"non-index-hero__container");
    const heroEnd = source.indexOf("</header>", heroStart);
    assert.ok(heroStart >= 0 && heroEnd > heroStart, route);
    assert.doesNotMatch(
      source.slice(heroStart, heroEnd),
      /debrief-quote--operating-principle/u,
      route,
    );

    const owner = labelledOwner(source, expected.sectionId);
    const principleStart = principles[0].index;
    assert.ok(owner, route + ": missing " + expected.sectionId);
    assert.ok(principleStart > owner.start, route + ": principle precedes its owner");
    assert.ok(principleStart < owner.end, route + ": principle leaves its " + owner.tag);

    const anchorEnd = anchoredElementEnd(source, owner, expected.after);
    assert.ok(anchorEnd, route + ": missing route-specific content anchor");
    assert.ok(
      principleStart > anchorEnd,
      route + ": principle precedes the content that earns it",
    );

    assert.equal(principles[0][1], expected.label, route);
    assert.equal(
      normalizedText(principles[0][2].match(/<p>([\s\S]*?)<\/p>/u)?.[1] ?? ""),
      expected.text,
      route,
    );
    assert.equal(
      normalizedText(principles[0][2].match(/<footer>([\s\S]*?)<\/footer>/u)?.[1] ?? ""),
      expected.footer,
      route,
    );
  }
});

test("the complete AI Systems family closes with page-specific sources and current evidence", async () => {
  assert.deepEqual(
    [...sourceSectionIds.keys()].sort(),
    [...placements.keys()].sort(),
  );

  const evidenceNotes = new Set();
  for (const [route, sourceSectionId] of sourceSectionIds) {
    const source = await canvasFile(route);
    const owner = labelledOwner(source, sourceSectionId);
    assert.ok(owner, `${route}: missing final source section`);

    const section = source.slice(owner.start, owner.end);
    assert.match(
      section,
      new RegExp(
        `<h2\\b[^>]*id="${sourceSectionId}"[^>]*>Sources and current evidence<\\/h2>`,
        "u",
      ),
      `${route}: final source heading`,
    );

    const currentEvidence = [...section.matchAll(
      /<p\b[^>]*>\s*<strong>Current evidence\.<\/strong>([\s\S]*?)<\/p>/gu,
    )];
    assert.equal(currentEvidence.length, 1, `${route}: current-evidence receipt`);

    const evidenceText = normalizedText(currentEvidence[0][0]);
    assert.ok(
      evidenceText.length >= 120,
      `${route}: current-evidence statement carries enough context to name present standing and continued study`,
    );
    assert.ok(
      (evidenceText.match(/[.!?](?:\s|$)/gu) ?? []).length >= 2,
      `${route}: current-evidence statement separates present standing from continued study`,
    );
    assert.doesNotMatch(
      evidenceText,
      /\b(?:TBD|TODO|placeholder)\b/iu,
      `${route}: current-evidence statement is complete`,
    );
    evidenceNotes.add(evidenceText);
  }

  assert.equal(
    evidenceNotes.size,
    sourceSectionIds.size,
    "each route carries a page-specific current-evidence receipt",
  );
});

test("the AI Systems family presents one title across document, social, and structured metadata", async () => {
  for (const route of placements.keys()) {
    const source = await canvasFile(route);
    const metadata = pageJsonLd(source);
    const titles = {
      document: source.match(/<title>([\s\S]*?)<\/title>/u)?.[1] ?? "",
      openGraph: metadataContent(source, "og:title"),
      twitter: metadataContent(source, "twitter:title"),
      structured: metadata.headline ?? "",
    };
    const normalized = Object.fromEntries(
      Object.entries(titles).map(([key, value]) => [
        key,
        normalizedMetadataTitle(value),
      ]),
    );

    assert.ok(normalized.document, `${route}: document title`);
    assert.deepEqual(
      new Set(Object.values(normalized)),
      new Set([normalized.document]),
      `${route}: metadata title parity`,
    );

    if (route === "ai-systems.html") {
      assert.equal(normalized.document, aiSystemsCollectionName, route);
      continue;
    }

    const parents = Array.isArray(metadata.isPartOf)
      ? metadata.isPartOf
      : [metadata.isPartOf];
    const collection = parents.find(
      (parent) => parent?.["@id"] === aiSystemsCollectionId,
    );
    assert.equal(
      collection?.name,
      aiSystemsCollectionName,
      `${route}: AI Systems collection name`,
    );
  }
});

test("the operating-principle modifier has one family owner and route-local Hiring variation", async () => {
  const [legacyCss, familyCss, hiringCss] = await Promise.all([
    canvasFile("expanded.css"),
    canvasFile("styles/routes/ai-systems.css"),
    canvasFile("styles/routes/hiring-surfaces.css"),
  ]);

  assert.doesNotMatch(legacyCss, /\.ai-systems-hero \.debrief-quote/u);
  assert.match(familyCss, /\.ai-systems-page \.debrief-quote--operating-principle\s*\{/u);
  const forcedColorBlocks = atRuleBlocks(
    familyCss,
    /@media \(forced-colors: active\)\s*\{/gu,
  );
  assert.ok(
    forcedColorBlocks.some((block) => (
      /\.ai-systems-page \.debrief-quote--operating-principle/u.test(block)
    )),
    "forced-colors block owns the operating-principle selector",
  );
  const printBlocks = atRuleBlocks(
    familyCss,
    /@media print\s*\{/gu,
  );
  assert.ok(
    printBlocks.some((block) => (
      /\.ai-systems-page \.debrief-quote--operating-principle/u.test(block)
    )),
    "print block owns the operating-principle selector",
  );
  assert.match(
    hiringCss,
    /\.hiring-surfaces-page \.debrief-quote--operating-principle\s*\{[\s\S]*?var\(--hiring-lime\)[\s\S]*?var\(--hiring-coral\)/u,
  );
});

test("the visual reference includes all seventeen AI Systems routes", async () => {
  const source = await readFile(
    resolve(repositoryRoot, "tools/context-canvas-visual-reference.mjs"),
    "utf8",
  );
  const family = source.match(
    /id: "ai-systems-and-instruments",[\s\S]*?routes: \[([\s\S]*?)\]\s*\}/u,
  )?.[1] ?? "";
  const routes = [...family.matchAll(/"([^"]+\.html)"/gu)]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(routes, [...placements.keys()].sort());
});

test("the AI Systems shelf exposes the complete family", async () => {
  const source = await canvasFile("canvas-shell.js");
  const aiShelf = source.match(
    /\bai:\s*\[([\s\S]*?)\n\s*\],\n\s*debriefs:/u,
  )?.[1] ?? "";

  for (const route of placements.keys()) {
    assert.match(aiShelf, new RegExp(`"${route.replaceAll(".", "\\.")}"`, "u"), route);
  }
});

test("the AI Systems family identifies human authorship, publication, and collection ancestry", async () => {
  for (const route of placements.keys()) {
    const source = await canvasFile(route);
    const metadata = pageJsonLd(source);

    assert.deepEqual(metadata.author, humanAuthor, `${route}: author`);
    assert.deepEqual(metadata.publisher, publishingCompany, `${route}: publisher`);
    assert.match(metadata.dateModified, /^\d{4}-\d{2}-\d{2}$/u, `${route}: dateModified`);

    if (route === "ai-systems.html") {
      assert.equal(metadata["@id"], aiSystemsCollectionId, route);
      assert.match(
        source,
        /class="anchor_ai_systems" aria-current="page">AI Systems<\/a>/u,
        route,
      );
      continue;
    }

    const parents = Array.isArray(metadata.isPartOf)
      ? metadata.isPartOf
      : [metadata.isPartOf];
    assert.ok(
      parents.some((parent) => parent?.["@id"] === aiSystemsCollectionId),
      `${route}: AI Systems collection ancestry`,
    );
    assert.match(
      source,
      /class="anchor_ai_systems" aria-current="location">AI Systems<\/a>/u,
      route,
    );
  }
});

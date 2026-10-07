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
const humanAuthor = { "@type": "Person", name: "Vikrant Varun Kudesia" };
const publishingCompany = {
  "@type": "Organization",
  name: "Driftframe Studios, Limited Liability Company",
  url: "https://github.com/driftframestudios/human-ai-systems-exemplars",
};

const placements = new Map([
  ["ai-systems.html", {
    sectionId: "instrument-title",
    label: "Central operating principle",
    text: "A collaborative artifact earns its place when it changes a decision, preserves authority, or makes recovery easier.",
    footer: "Central operating principle",
  }],
  ["benchmark-orientation.html", {
    sectionId: "coordinate-title",
    label: "Benchmark orientation boundary",
    text: "Begin with the decision the measurement must support. Record the run and score coordinates. End with the smallest claim those coordinates can carry.",
    footer: "Benchmark orientation boundary",
  }],
  ["collaboration-skills.html", {
    sectionId: "receipt-title",
    label: "First-use boundary",
    text: "A skill offers a working method. The receiving team decides whether the method fits, which authority applies, and what material result counts.",
    footer: "First-use boundary",
  }],
  ["concept-nursery.html", {
    sectionId: "lifecycle-title",
    label: "Concept Nursery boundary",
    text: "Stage the page with a named destination; move it when its use settles; record the move so the next steward can resume from the current location.",
    footer: "Staging contract",
  }],
  ["core-architectures-orientation-index.html", {
    sectionId: "resolver-title",
    label: "Core Architecture resolver principle",
    text: "Choose the architecture by the decision it must make inspectable.",
    footer: "Core Architecture resolver principle",
  }],
  ["cross-platform-collaboration-cycle.html", {
    sectionId: "records-title",
    label: "Collaboration cycle doctrine",
    text: "A discussion can explain a decision; only a durable decision payload can carry its resolved meaning, affected identities, dependencies, and acceptance into the next turn.",
    footer: "Current durable-record contract",
  }],
  ["grammar-family.html", {
    sectionId: "selection-title",
    label: "Reading-form selection principle",
    text: "The strongest form carries each consequential distinction and gives every reader a clear route through it.",
    footer: "Grammar selection principle",
  }],
  ["hiring-surfaces-talent-agent-intake.html", {
    sectionId: "convergence-title",
    label: "Central two-reader principle",
    text: "Specificity reads senior to a human and parses cleanly for an agent.",
    footer: "Central two-reader principle",
  }],
  ["maps-evaluations.html", {
    sectionId: "canonical-title",
    label: "Canary-first reading boundary",
    text: "Read the canonical Evaluations Canary record first. Keep its exact marker intact with evaluation material so the stated filtering and detection purpose remains available.",
    footer: "Canary-first reading boundary",
  }],
  ["metadata-blocks.html", {
    sectionId: "metadata-scan-title",
    label: "Metadata authoring principle",
    text: "A field earns its slot when it helps a reader decide, interpret, or act.",
    footer: "Metadata authoring principle",
  }],
  ["planning-surface.html", {
    sectionId: "decision-title",
    label: "Planning artifact boundary",
    text: "This reusable decision hierarchy and stewardship contract describes what the shared area must make possible. Current scheduling and delivery decisions remain with their accountable initiative owners.",
    footer: "Planning boundary",
  }],
  ["poda.html", {
    sectionId: "poda-beats-title",
    label: "PODA operating principle",
    text: "Outcomes are discovered through encounter; the artifact form follows the learning.",
    footer: "PODA operating principle",
  }],
  ["readable-tables-reusable-evidence.html", {
    sectionId: "process-model-title",
    label: "Verification timing principle",
    text: "Complete the fitting required checks after the last relevant change; use a focused observation when it can resolve a named uncertainty; and preserve the evidence that still answers its question. A probability can sharpen that discussion while the receiving people retain the decision.",
    footer: "Verification timing principle",
  }],
  ["registry-goal-fidelity-routing.html", {
    sectionId: "position-title",
    label: "Recovery and re-entry operating principle",
    text: "Preserve valid work. Change the layer that generated the strain.",
    footer: "Recovery and re-entry operating principle",
  }],
  ["resting-concepts.html", {
    sectionId: "architecture-title",
    label: "Resting Concepts boundary",
    text: "Rest is a reversible state. The page remains findable, its reason remains interpretable, and its return follows an observable condition recorded with the page.",
    footer: "Resting contract",
  }],
  ["shared-machinery.html", {
    sectionId: "shared-contract-title",
    label: "Shared Machinery operating principle",
    text: "The instrument stays small; the ownership needed to keep it useful remains explicit.",
    footer: "Shared Machinery operating principle",
  }],
  ["visualization-fidelity-atlas.html", {
    sectionId: "exemplar-title",
    label: "Atlas doctrine",
    text: "The visual carries the reader’s comparison burden; its companion carries exact values, uncertainty, provenance, and a recoverable interpretation.",
    footer: "Visual selection doctrine",
  }],
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

  const closing = `</${opening.groups.tag}>`;
  const end = source.indexOf(closing, opening.index + opening[0].length);
  if (end < 0) return null;

  return {
    start: opening.index,
    end: end + closing.length,
    tag: opening.groups.tag,
  };
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

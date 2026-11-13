import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { loadSourceRouteAuthority, resolveSourceRouteValue } from "../public-references/source-route-authority.mjs";

const routeAuthority = await loadSourceRouteAuthority();
const publicValue = value => resolveSourceRouteValue(value, routeAuthority);

const canvasRoot = resolve(
  import.meta.dirname,
  "../../context-canvas-project-surface/context-canvas",
);

const cometSurfaces = [
  {
    url: "https://cometspectrum.ai/",
    name: "Comet Spectrum schema signals and semantic contexts",
  },
  {
    url: "https://cometspectrum.io/",
    name: "Comet Spectrum LIMS/ELN comparative evidence",
  },
  {
    url: "https://cometspectrum.org/",
    name: "Comet Spectrum LIMS/ELN program specification",
  },
];

async function canvasFile(path) {
  return readFile(resolve(canvasRoot, path), "utf8");
}

function jsonLd(source) {
  return [...source.matchAll(
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gu,
  )].map((match) => JSON.parse(match[1]));
}

function findNamedItemList(value, name) {
  if (!value || typeof value !== "object") return null;
  if (value["@type"] === "ItemList" && value.name === name) return value;
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = findNamedItemList(item, name);
        if (found) return found;
      }
    } else {
      const found = findNamedItemList(child, name);
      if (found) return found;
    }
  }
  return null;
}

function bodyLinkDestinations(source) {
  const body = source.slice(source.indexOf("<body")).replace(/<!--[\s\S]*?-->/gu, "");
  return new Set([...body.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>[\s\S]*?<\/a>/gu)]
    .map(([, href]) => href));
}

function assertPublicTopology(about, aiSystems, limsDebrief) {
  const [aboutRecord] = jsonLd(about);
  assert.equal(findNamedItemList(aboutRecord, "Public collaboration system"), null,
    "About routes to the collection owned by AI Systems rather than duplicating it");
  assert.deepEqual(aboutRecord.hasPart.map(part => [part.name, publicValue(part.url)]), [
    ['Cross-Functional Investment Studio', 'https://vik.guru/#studio-title'],
    ['AI and ML Method Gallery', 'https://iframes.vik.guru/v1/canvas/ai-method-gallery/'],
  ], 'About describes the two prototypes retained in its reading');
  assert.ok(aboutRecord.significantLink.map(publicValue).includes('https://vik.guru/ai-systems.html'));
  assert.match(jsonLd(aiSystems)[0].description, /public collaboration system/iu,
    'AI Systems metadata identifies its expanded public collection');
  const surfaces = [
    ["ai-systems.html", "Public system topology", aiSystems],
  ];

  for (const [route, listName, source] of surfaces) {
    const itemList = jsonLd(source)
      .map((entry) => findNamedItemList(entry, listName))
      .find(Boolean);
    assert.ok(itemList, `${route} carries ${listName}`);
    assert.equal(itemList.numberOfItems, itemList.itemListElement.length, route);
    assert.equal(new Set(itemList.itemListElement.map((item) => item.url)).size, itemList.numberOfItems, route);

    for (const expected of cometSurfaces) {
      const item = itemList.itemListElement.find((candidate) => candidate.url === expected.url);
      assert.equal(item?.name, expected.name, `${route} names the distinct job at ${expected.url}`);
    }
  }

  assert.ok(bodyLinkDestinations(about).has("ai-systems.html"), "About leads to AI Systems' public project collection");
  for (const [route, source] of [["AI Systems", aiSystems], ["LIMS/ELN Debrief", limsDebrief]]) {
    const destinations = bodyLinkDestinations(source);
    for (const expected of cometSurfaces) {
      assert.ok(destinations.has(expected.url), `${route} links ${expected.url}`);
    }
  }
}

test("About routes to the public project collection with distinct Comet Spectrum destinations", async () => {
  const sources = await Promise.all([
    "index.html", "ai-systems.html", "fmi-lims-eln-replatforming.html",
  ].map(canvasFile));
  assertPublicTopology(...sources);

  const [about, aiSystems, limsDebrief] = sources;
  assert.throws(() => assertPublicTopology(
    about.replace(/<a\b[^>]*\bhref="ai-systems\.html"[^>]*>[\s\S]*?<\/a>/gu, '<!--$&-->'), aiSystems, limsDebrief,
  ), /About leads to AI Systems/u, "metadata and commented-out links leave the onward route unavailable");
  assert.throws(() => assertPublicTopology(
    about, aiSystems.replaceAll('href="https://cometspectrum.io/"', 'href="https://cometspectrum.ai/"'), limsDebrief,
  ), /AI Systems links https:\/\/cometspectrum\.io\//u, "the evidence destination remains distinct from the schema destination");
});

test("the AI Systems reading order follows the visitor's decision path", async () => {
  const source = await canvasFile("ai-systems.html");
  const position = (fragment) => {
    const index = source.indexOf(fragment);
    assert.notEqual(index, -1, `AI Systems carries ${fragment}`);
    return index;
  };

  assert.ok(bodyLinkDestinations(source).has("{{PUBLIC_URL_SKILL_CATALOG}}"), "the project collection exposes the public skill catalog");
  assert.match(
    source,
    /href="https:\/\/github\.com\/driftframestudios\/lims-eln-program-specification"/u,
  );

  for (const [label, expectedRows] of [
    ["Thirteen constraints translated into decision use and inspectable receipts", 13],
    ["Investment shifts from artifact volume toward decision quality and operating continuity", 7],
    ["Each population receives the view required for its decision and authority", 8],
  ]) {
    const table = source.match(new RegExp(`<table[^>]*data-label="${label}"[^>]*>([\\s\\S]*?)<\\/table>`, "u"));
    assert.ok(table, `AI Systems carries the ${label} table`);
    assert.equal(
      [...table[1].matchAll(/<th scope="row"[^>]*><a href="\{\{PUBLIC_URL_REGISTRY_[A-Z0-9_]+\}\}">/gu)].length,
      expectedRows,
      `every ${label} row has a public Registry route`,
    );
  }

  const goalTable = source.match(/<table[^>]*data-label="Thirteen constraints translated into decision use and inspectable receipts"[^>]*>([\s\S]*?)<\/table>/u);
  assert.deepEqual(
    [...goalTable[1].matchAll(/<th scope="row" data-label="Reading"><a href="\{\{(PUBLIC_URL_REGISTRY_[A-Z0-9_]+)\}\}">([^<]+)<\/a><\/th>/gu)]
      .map(([, route, reading]) => [reading, route]),
    [
      ["The Harness Is Part of the Behavior", "PUBLIC_URL_REGISTRY_GOAL_FIDELITY_UNDER_PARTIAL_CONTEXT"],
      ["The Stronger Partner Is the Baseline", "PUBLIC_URL_REGISTRY_GOAL_FIDELITY_UNDER_PARTIAL_CONTEXT"],
      ["The Check Has a Reader", "PUBLIC_URL_REGISTRY_GOAL_FIDELITY_UNDER_PARTIAL_CONTEXT"],
      ["A Loop Needs New Information", "PUBLIC_URL_REGISTRY_GOAL_FIDELITY_UNDER_PARTIAL_CONTEXT"],
      ["The Horizon Moves at the Decision", "PUBLIC_URL_REGISTRY_WORKING_WITHIN_A_DECLARED_CONTEXT_HORIZON"],
      ["Correction Needs an Object", "PUBLIC_URL_REGISTRY_GOAL_FIDELITY_UNDER_PARTIAL_CONTEXT"],
      ["Confidence Is a Relationship", "PUBLIC_URL_REGISTRY_GOAL_FIDELITY_UNDER_PARTIAL_CONTEXT"],
      ["The Fast Patch Leaves a Comprehension Tax", "PUBLIC_URL_REGISTRY_GOAL_FIDELITY_UNDER_PARTIAL_CONTEXT"],
      ["Calm Recovery After Overreach", "PUBLIC_URL_REGISTRY_RECOVERY_ROUTING"],
      ["Working From a Declared Horizon", "PUBLIC_URL_REGISTRY_WORKING_WITHIN_A_DECLARED_CONTEXT_HORIZON"],
      ["Material Verification", "PUBLIC_URL_REGISTRY_MATERIAL_VERIFICATION"],
      ["Attainability Drift &amp; Scaffold Capture", "PUBLIC_URL_REGISTRY_GOAL_FIDELITY_UNDER_PARTIAL_CONTEXT"],
      ["Constraints Become Design", "PUBLIC_URL_REGISTRY_GOAL_FIDELITY_UNDER_PARTIAL_CONTEXT"],
    ],
    "Goal Fidelity rows preserve their exact shared or dedicated Registry routes",
  );

  assert.ok(
    position('id="collaboration-skills-reading-title"')
      < position('id="amplified-production-reach-title"'),
    "the reusable method introduces the expanded unit of contribution",
  );
  assert.ok(
    position('id="amplified-production-reach-title"')
      < position('id="hiring-reading-title"'),
    "amplified production reach directly precedes the hiring translation",
  );
  assert.ok(
    position('<p class="architecture-pair__label">Opportunity</p>')
      < position('aria-label="Central operating principle"')
      && position('aria-label="Central operating principle"')
        < position('§c The Intervention — Expectation, Focalization, and Opportunity Become Shared Artifacts'),
    "the operating principle completes the Solution Architecture card group before the intervention",
  );
  assert.ok(
    position('id="implementation-title"')
      < position('id="lims-eln-constellation-title"'),
    "the LIMS/ELN source constellation belongs to Implementation Architecture",
  );
  const assertProjectReadingOrder = (reading) => {
    const indices = ["instrument-title", "public-system-topology-title", "conditioning-field-title"]
      .map(id => reading.indexOf(`id="${id}"`));
    assert.ok(indices.every(index => index >= 0), "the introductory instruments, projects and methods each have a reading destination");
    assert.ok(indices[0] < indices[1] && indices[1] < indices[2],
      "the public projects follow the introductory instruments and precede the deeper methods");
  };
  assertProjectReadingOrder(source);
  assert.throws(() => assertProjectReadingOrder(source.replace(
    /id="(public-system-topology-title|conditioning-field-title)"/gu,
    (_, id) => `id="${id === "public-system-topology-title" ? "conditioning-field-title" : "public-system-topology-title"}"`,
  )), /public projects follow/u, "moving the project collection behind the methods changes the reading contract");
  assert.ok(
    position('id="population-title"')
      < position('id="benchmark-reading-title"'),
    "the benchmark pair follows population cartography",
  );
  assert.ok(
    position('id="benchmark-reading-title"') < position('id="sources-title"'),
    "the benchmark pair remains inside the main reading before its source basis",
  );
});

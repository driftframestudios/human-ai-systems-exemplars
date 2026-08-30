import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const contextRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas"
);

const sourceEraRoutes = [
  "exemplar-brief-exploration.html",
  "exemplar-gallery-list.html",
  "exemplar-ideal-debrief.html",
  "exemplar-maximal-debrief.html",
  "exemplar-maximal-information-radiator.html"
];

async function jsonLd(route) {
  const source = await readFile(resolve(contextRoot, route), "utf8");
  const match = source.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/u);
  assert.ok(match, `${route} should carry its Context Canvas JSON-LD`);
  return JSON.parse(match[1]);
}

function webpage(graph, route) {
  const node = graph["@graph"].find(item => item["cc:standing"]);
  assert.ok(node, `${route} should carry one page node`);
  return node;
}

test("retained non-profile exemplars state observed source-era standing", async () => {
  for (const route of sourceEraRoutes) {
    const node = webpage(await jsonLd(route), route);
    assert.equal(node["cc:standing"]["cc:claimStatus"], "observed", route);
    assert.equal(
      node["cc:standing"]["cc:evidenceClass"],
      "retained_source_era_surface",
      route
    );
  }
});

test("the retained landing identifies its anonymous composite profile without a person claim", async () => {
  const route = "exemplar-index-landing.html";
  const graph = await jsonLd(route);
  const node = webpage(graph, route);
  const subjectId = `${node["@id"].replace(/#webpage$/u, "")}#composite-practitioner`;

  assert.equal(node["cc:standing"]["cc:claimStatus"], "observed");
  assert.equal(
    node["cc:standing"]["cc:evidenceClass"],
    "retained_anonymous_composite_profile"
  );
  assert.equal(node.mainEntity["@id"], subjectId);
  assert.ok(graph["@graph"].some(item => item["@id"] === subjectId));
});

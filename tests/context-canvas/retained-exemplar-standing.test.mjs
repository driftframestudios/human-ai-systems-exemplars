import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const contextRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas"
);

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

test("retired source-era exemplars and their preview asset stay absent", async () => {
  const retired = [
    "occipital.png",
    "exemplar-gallery-list.html",
    "exemplar-ideal-debrief.html",
    "exemplar-maximal-debrief.html",
    "exemplar-maximal-information-radiator.html",
  ];
  for (const entry of retired) {
    await assert.rejects(
      readFile(resolve(contextRoot, entry)),
      error => error?.code === "ENOENT",
      `${entry} should remain retired`,
    );
  }
});

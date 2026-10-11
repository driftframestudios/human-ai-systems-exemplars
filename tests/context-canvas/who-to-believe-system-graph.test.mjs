import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import graphApi from "../../context-canvas-project-surface/context-canvas/who-to-believe-system-graph.js";

const {
  findShortestRoute,
  initialSystemGraphState,
  transitionSystemGraph,
  validateSystemGraphContract,
} = graphApi;

const repositoryRoot = resolve(import.meta.dirname, "../..");
const pagePath = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/who-to-believe-reviews-platform.html",
);

async function sourceContract() {
  const html = await readFile(pagePath, "utf8");
  const match = html.match(/<script type="application\/json" id="wtb-system-graph-contract">([\s\S]*?)<\/script>/u);
  assert.ok(match, "Who To Believe should carry its page-local system graph contract");
  return JSON.parse(match[1]);
}

test("the accepted system graph admits one finite contract", async () => {
  const admission = validateSystemGraphContract(await sourceContract());
  assert.equal(admission.ok, true, admission.errors.join("\n"));
  assert.equal(admission.model.nodes.length, 22);
  assert.equal(admission.model.edges.length, 26);
  assert.equal(Object.isFrozen(admission.model), true);
  assert.equal(Object.isFrozen(admission.model.nodes[0].status), true);
});

test("contract admission reports materially related faults together", async () => {
  const fixture = await sourceContract();
  fixture.nodes[1].id = fixture.nodes[0].id;
  fixture.nodes[2].status.spring = "mysterious";
  fixture.nodes[3].dims.push("unknown-concern");
  fixture.edges[0].to = "missing-node";
  fixture.defaults.routes.all.end = "missing-node";

  const admission = validateSystemGraphContract(fixture);
  assert.equal(admission.ok, false);
  assert.ok(admission.errors.length >= 5);
  assert.match(admission.errors.join("\n"), /duplicates accounts/u);
  assert.match(admission.errors.join("\n"), /outside the declared vocabulary/u);
  assert.match(admission.errors.join("\n"), /unknown concern/u);
  assert.match(admission.errors.join("\n"), /unknown node missing-node/u);
  assert.match(admission.errors.join("\n"), /defaults\.routes\.all/u);
});

test("declared concern routes remain deterministic and directed", async () => {
  const { model } = validateSystemGraphContract(await sourceContract());

  assert.deepEqual(findShortestRoute(model, "accounts", "tsqueue", "abuse"), {
    nodes: ["accounts", "graph", "risk", "tsqueue"],
    edges: ["accounts-graph", "graph-risk", "risk-tsqueue"],
  });
  assert.deepEqual(findShortestRoute(model, "household", "assistant", "misfit"), {
    nodes: ["household", "eligibility", "assistant"],
    edges: ["household-eligibility", "eligibility-assistant"],
  });
  assert.deepEqual(findShortestRoute(model, "addresses", "campaignops", "core"), {
    nodes: ["addresses", "fulfillment", "campaignops"],
    edges: ["addresses-fulfillment", "fulfillment-campaignops"],
  });
  assert.deepEqual(findShortestRoute(model, "warehouse", "brand", "forecast"), {
    nodes: ["warehouse", "prophet", "brand"],
    edges: ["warehouse-prophet", "prophet-brand"],
  });
  assert.equal(findShortestRoute(model, "tsqueue", "accounts", "abuse"), null);
  assert.equal(findShortestRoute(model, "accounts", "brand", "forecast"), null);
});

test("contract admission requires reachable default routes", async () => {
  const fixture = await sourceContract();
  fixture.edges = fixture.edges.filter(edge => edge.id !== "prophet-brand");

  const admission = validateSystemGraphContract(fixture);
  assert.equal(admission.ok, false);
  assert.match(admission.errors.join("\n"), /defaults\.routes\.forecast.*reachable directed route/u);
});

test("declared edge order resolves equal-length routes", async () => {
  const fixture = await sourceContract();
  fixture.edges.push(
    { id: "accounts-risk", from: "accounts", to: "risk", status: { symfony: "broken", spring: "strained" } },
    { id: "graph-tsqueue", from: "graph", to: "tsqueue", status: { symfony: "broken", spring: "ok" } },
  );
  const { model } = validateSystemGraphContract(fixture);
  assert.deepEqual(findShortestRoute(model, "accounts", "tsqueue", "abuse"), {
    nodes: ["accounts", "graph", "tsqueue"],
    edges: ["accounts-graph", "graph-tsqueue"],
  });
});

test("the closed transition vocabulary preserves one coherent state", async () => {
  const { model } = validateSystemGraphContract(await sourceContract());
  const initial = initialSystemGraphState(model);
  const unchanged = transitionSystemGraph(model, initial, { type: "UNKNOWN" });
  assert.equal(unchanged, initial);

  const forecast = transitionSystemGraph(model, initial, {
    type: "SET_DIMENSION",
    value: "forecast",
    label: "Forecasting",
  });
  assert.equal(forecast.startId, "warehouse");
  assert.equal(forecast.endId, "brand");
  assert.deepEqual(forecast.route.nodes, ["warehouse", "prophet", "brand"]);

  const next = transitionSystemGraph(model, forecast, {
    type: "STEP_ROUTE",
    delta: 1,
    label: "Prophet forecasting",
  });
  assert.equal(next.routeIndex, 1);
  assert.equal(next.selectedNodeId, "prophet");

  const reset = transitionSystemGraph(model, next, { type: "RESET" });
  assert.deepEqual(reset, initial);

  const reachable = transitionSystemGraph(model, initial, {
    type: "TRACE_ROUTE",
    startLabel: "Member accounts",
    endLabel: "Trust & Safety queue",
  });
  assert.match(reachable.announcement, /Route traced from Member accounts/u);

  const unavailableStart = transitionSystemGraph(model, initial, { type: "SET_START", value: "pv" });
  const unavailableEnd = transitionSystemGraph(model, unavailableStart, { type: "SET_END", value: "accounts" });
  const unavailable = transitionSystemGraph(model, unavailableEnd, {
    type: "TRACE_ROUTE",
    startLabel: "Brand pharmacovigilance",
    endLabel: "Member accounts",
  });
  assert.equal(unavailable.route, null);
  assert.match(unavailable.announcement, /Choose another endpoint or concern/u);
  assert.match(unavailable.announcement, /no declared directed route from Brand pharmacovigilance to Member accounts/u);
});

test("the static reading carries every accepted node and edge", async () => {
  const [html, source] = await Promise.all([readFile(pagePath, "utf8"), sourceContract()]);
  const reading = html.match(/<details class="wtb-system-graph__reading"[\s\S]*?<\/details>/u)?.[0] ?? "";
  assert.ok(reading);
  const normalizedReading = reading.replaceAll("&amp;", "&");
  for (const node of source.nodes) {
    assert.ok(normalizedReading.includes(node.label), `Static reading should include ${node.label}`);
    const escapedLabel = node.label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const nodeReading = normalizedReading.match(new RegExp(`<li><strong>${escapedLabel}\\.<\\/strong>([\\s\\S]*?)<\\/li>`, "u"))?.[1] ?? "";
    assert.match(nodeReading, /Symfony/iu, `${node.label} should preserve its Symfony state`);
    assert.match(nodeReading, /partial Spring/iu, `${node.label} should preserve its partial-Spring state`);
  }
  const statusWords = { ok: "working", strained: "strained", broken: "breaking" };
  for (const edge of source.edges) {
    const from = source.nodes.find(node => node.id === edge.from).label;
    const to = source.nodes.find(node => node.id === edge.to).label;
    const relationship = `${from} → ${to}${edge.label ? ` via ${edge.label}` : ""}`;
    const completeReading = `${relationship}. Symfony: ${statusWords[edge.status.symfony]}; Partial Spring: ${statusWords[edge.status.spring]}.`;
    assert.ok(normalizedReading.includes(completeReading), `Static reading should include both states for ${relationship}`);
  }
});

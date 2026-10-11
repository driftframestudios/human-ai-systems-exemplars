import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import graphApi from "../../context-canvas-project-surface/context-canvas/who-to-believe-system-graph.js";

const {
  countStatuses,
  initialSystemGraphState,
  transitionSystemGraph,
  validateSystemGraphContract,
} = graphApi;

const repositoryRoot = resolve(import.meta.dirname, "../..");
const pagePath = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/who-to-believe-reviews-platform.html",
);
const reviewedContractSha256 = "0fede43c88eed960a4e2149f06817c0f835300669ec2a04a180d6950516f9899";

async function sourceContract() {
  const html = await readFile(pagePath, "utf8");
  const match = html.match(/<script type="application\/json" id="wtb-system-graph-contract">([\s\S]*?)<\/script>/u);
  assert.ok(match, "Who To Believe should carry its page-local system graph contract");
  return JSON.parse(match[1]);
}

function normalizeReviewedContract(contract) {
  // The digest owns the reviewed technical meaning and source-derived topology.
  // Schema version and edge IDs remain local carrier metadata governed by
  // admission and identity tests. Copy or data corrections update this digest
  // deliberately after the static and interactive forms agree.
  return {
    columns: contract.columns,
    dimensions: contract.dimensions.map(({ id, label, color }) => ({ id, label, color })),
    nodes: contract.nodes.map(({ id, label, col, row, dims, stack, status, note }) => ({
      id,
      label,
      col,
      row,
      dims,
      stack,
      status,
      note,
    })),
    edges: contract.edges.map(({ from, to, label = "", status }) => ({ from, to, label, status })),
    defaults: contract.defaults,
  };
}

test("the accepted system graph admits and freezes one finite contract", async () => {
  const fixture = await sourceContract();
  const admission = validateSystemGraphContract(fixture);
  assert.equal(admission.ok, true, admission.errors.join("\n"));
  assert.equal(admission.model.nodes.length, 22);
  assert.equal(admission.model.edges.length, 26);
  assert.equal(Object.isFrozen(admission.model), true);
  assert.equal(Object.isFrozen(admission.model.dimensions[0]), true);
  assert.deepEqual(admission.model.dimensions[0], {
    id: "abuse",
    label: "Multi-account abuse",
    color: "#f45d4c",
  });
  assert.equal(Object.isFrozen(admission.model.nodes[0].status), true);
  assert.equal(Object.isFrozen(admission.model.edges[0].status), true);
  assert.deepEqual(admission.model.defaults, {
    mode: "symfony",
    dimension: "all",
    selectedNode: "household",
  });
  assert.equal(Object.isFrozen(admission.model.defaults), true);
  assert.equal("routes" in admission.model.defaults, false, "route defaults stay outside the original graph state model");
});

test("the accepted contract retains reviewed technical data and exact source topology", async () => {
  const normalized = normalizeReviewedContract(await sourceContract());
  const digest = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  assert.equal(digest, reviewedContractSha256);
});

test("contract admission reports materially related faults together", async () => {
  const fixture = await sourceContract();
  fixture.nodes[1].id = fixture.nodes[0].id;
  fixture.nodes[2].status.spring = "mysterious";
  fixture.nodes[3].dims.push("unknown-concern");
  fixture.dimensions[0].color = "url(javascript:alert(1))";
  fixture.edges[0].to = "missing-node";
  fixture.nodes.find(node => node.id === "household").id = "household-renamed";
  fixture.defaults.selectedNode = "household-renamed";

  const admission = validateSystemGraphContract(fixture);
  assert.equal(admission.ok, false);
  assert.ok(admission.errors.length >= 5);
  assert.match(admission.errors.join("\n"), /duplicates accounts/u);
  assert.match(admission.errors.join("\n"), /outside the declared vocabulary/u);
  assert.match(admission.errors.join("\n"), /unknown concern/u);
  assert.match(admission.errors.join("\n"), /six-digit hexadecimal color/u);
  assert.match(admission.errors.join("\n"), /unknown node missing-node/u);
  assert.match(admission.errors.join("\n"), /initial household selection/u);
  assert.match(admission.errors.join("\n"), /defaults\.selectedNode must be household/u);
});

test("contract admission keeps every node inside the fixed graph viewBox", async () => {
  const fixture = await sourceContract();
  fixture.nodes[0].row = 6;

  const admission = validateSystemGraphContract(fixture);
  assert.equal(admission.ok, false);
  assert.match(admission.errors.join("\n"), /row must be an integer from 0 through 5/u);
});

test("contract admission rejects duplicate directed relationships", async () => {
  const fixture = await sourceContract();
  fixture.edges.push({
    ...fixture.edges[0],
    id: "accounts-auth-copy",
    status: { ...fixture.edges[0].status },
  });

  const admission = validateSystemGraphContract(fixture);
  assert.equal(admission.ok, false);
  assert.match(admission.errors.join("\n"), /duplicates directed relationship accounts → auth/u);
});

test("initial state reproduces the original Review Routing graph", async () => {
  const { model } = validateSystemGraphContract(await sourceContract());
  assert.deepEqual(initialSystemGraphState(model), {
    mode: "symfony",
    dimension: "all",
    selectedNodeId: "household",
    announcement: "The system graph is ready. Household profile is selected.",
  });
});

test("the finite transition vocabulary changes only mode, dimension, or selection", async () => {
  const { model } = validateSystemGraphContract(await sourceContract());
  const initial = initialSystemGraphState(model);

  assert.equal(transitionSystemGraph(model, initial, { type: "UNKNOWN" }), initial);
  assert.equal(transitionSystemGraph(model, initial, { type: "SET_MODE", value: "symfony" }), initial);
  assert.equal(transitionSystemGraph(model, initial, { type: "SET_DIMENSION", value: "unknown" }), initial);
  assert.equal(transitionSystemGraph(model, initial, { type: "SELECT_NODE", value: "missing" }), initial);

  const spring = transitionSystemGraph(model, initial, {
    type: "SET_MODE",
    value: "spring",
    label: "Partial Spring Boot migration",
  });
  assert.deepEqual(spring, {
    mode: "spring",
    dimension: "all",
    selectedNodeId: "household",
    announcement: "Architecture state changed to Partial Spring Boot migration.",
  });

  const abuse = transitionSystemGraph(model, spring, {
    type: "SET_DIMENSION",
    value: "abuse",
    label: "Multi-account abuse",
  });
  assert.equal(abuse.dimension, "abuse");
  assert.equal(abuse.selectedNodeId, "household", "dimension filters preserve the original selection model");
  assert.equal(abuse.announcement, "Concern changed to Multi-account abuse.");

  const selected = transitionSystemGraph(model, abuse, {
    type: "SELECT_NODE",
    value: "risk",
    label: "Risk scoring",
  });
  assert.equal(selected.selectedNodeId, "risk");
  assert.equal(selected.announcement, "Risk scoring selected.");
  assert.equal(Object.isFrozen(selected), true);

  const reset = transitionSystemGraph(model, selected, { type: "RESET" });
  assert.deepEqual(reset, initial);
  assert.equal(transitionSystemGraph(model, initial, { type: "RESET" }), initial);
});

test("transition announcements retain canonical admitted labels", async () => {
  const { model } = validateSystemGraphContract(await sourceContract());
  const initial = initialSystemGraphState(model);

  const spring = transitionSystemGraph(model, initial, {
    type: "SET_MODE",
    value: "spring",
    label: "Unrelated architecture label",
  });
  assert.equal(spring.announcement, "Architecture state changed to Partial Spring Boot migration.");

  const abuse = transitionSystemGraph(model, spring, {
    type: "SET_DIMENSION",
    value: "abuse",
    label: "Unrelated concern label",
  });
  assert.equal(abuse.announcement, "Concern changed to Multi-account abuse.");

  const selected = transitionSystemGraph(model, abuse, {
    type: "SELECT_NODE",
    value: "risk",
    label: "Unrelated node label",
  });
  assert.equal(selected.announcement, "Risk scoring selected.");

  const allDimensions = transitionSystemGraph(model, selected, {
    type: "SET_DIMENSION",
    value: "all",
  });
  assert.equal(allDimensions.announcement, "Concern changed to All dimensions.");

  assert.equal(
    transitionSystemGraph(model, initial, {
      type: "SET_MODE",
      value: "symfony",
      label: "Caller text cannot replace the canonical label",
    }),
    initial,
    "same-state requests remain inert even when a caller supplies alternate prose",
  );
  assert.equal(
    transitionSystemGraph(model, initial, { type: "SET_MODE", value: "missing" }),
    initial,
    "a missing mode remains outside the closed transition vocabulary",
  );
});

test("status counts span all 22 nodes in either architecture state", async () => {
  const { model } = validateSystemGraphContract(await sourceContract());
  assert.deepEqual(countStatuses(model, "symfony"), { ok: 4, strained: 8, broken: 10 });
  assert.deepEqual(countStatuses(model, "spring"), { ok: 11, strained: 10, broken: 1 });
  assert.equal(countStatuses(model, "unknown"), null);
});

test("the static reading carries every accepted node and edge", async () => {
  const [html, source] = await Promise.all([readFile(pagePath, "utf8"), sourceContract()]);
  const reading = html.match(/<details class="wtb-system-graph__reading"[\s\S]*?<\/details>/u)?.[0] ?? "";
  assert.ok(reading);
  const normalizedReading = reading.replaceAll("&amp;", "&");
  const statusWords = { ok: "Working", strained: "Degraded", broken: "Breaking" };
  const sentence = value => /[.!?]$/u.test(value) ? value : `${value}.`;
  for (const node of source.nodes) {
    const completeReading = [
      `<li><strong>${node.label}.</strong>`,
      `Symfony PHP monolith — ${node.stack.symfony}; ${statusWords[node.status.symfony]}; ${sentence(node.note.symfony)}`,
      `Partial Spring Boot migration — ${node.stack.spring}; ${statusWords[node.status.spring]}; ${sentence(node.note.spring)}</li>`,
    ].join(" ");
    assert.ok(
      normalizedReading.includes(completeReading),
      `Static reading should preserve the complete two-state reading for ${node.label}`,
    );
  }
  for (const edge of source.edges) {
    const from = source.nodes.find(node => node.id === edge.from).label;
    const to = source.nodes.find(node => node.id === edge.to).label;
    const relationship = `${from} → ${to}${edge.label ? ` via ${edge.label}` : ""}`;
    const completeReading = `${relationship}. Symfony PHP monolith: ${statusWords[edge.status.symfony]}; Partial Spring Boot migration: ${statusWords[edge.status.spring]}.`;
    assert.ok(normalizedReading.includes(completeReading), `Static reading should include both states for ${relationship}`);
  }
});

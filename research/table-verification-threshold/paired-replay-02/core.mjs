import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const sha = (value) => createHash("sha256").update(value).digest("hex");
export function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort()
    .map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  return JSON.stringify(value);
}
export const signature = (value) => sha(canonical(value));

export function opportunities(protocol, expected) {
  assert.equal(expected.length, protocol.expected.population);
  assert.equal(new Set(expected).size, expected.length);
  const result = [];
  for (let round = 0; round < protocol.repetitions; round += 1) {
    for (let offset = 0; offset < protocol.scenarios.length; offset += 1) {
      const index = (round + offset) % protocol.scenarios.length;
      const scenario = protocol.scenarios[index];
      const selected = expected.filter((id) => id === "observer-fixtures"
        ? scenario.selectedFixture : scenario.selectedFamilies.some((family) => id.startsWith(family + "-")));
      result.push({
        id: scenario.id + "-" + (round + 1), scenario: scenario.id, round: round + 1,
        order: (round + index) % 2 ? ["selected", "full"] : ["full", "selected"],
        expected: [...expected], selected,
      });
    }
  }
  return result;
}

export function material(generation) {
  assert.equal(new Set(generation.expected).size, generation.expected.length, "Unique requested cases");
  assert.equal(generation.records.length, generation.expected.length, "Complete receiving population");
  const byId = new Map(generation.records.map((record) => [record.id, record]));
  assert.equal(byId.size, generation.records.length, "Unique completed cases");
  return {
    observationVersion: generation.observationVersion,
    expected: generation.expected,
    records: generation.expected.map((id) => {
      const record = byId.get(id);
      assert(record && record.result.id === id, "Result identity agrees");
      assert.equal(record.result.standing, "pass", "Every required verdict passes");
      const screenshots = Object.entries(record.dependencies).filter(([key]) => key.startsWith(".visual-runs/"))
        .map(([key, hash]) => {
          assert(/\/screenshots\/[a-f0-9]{64}\.png$/u.test(key), "Known artifact class");
          return { kind: "screenshot/png", sha256: hash };
        }).sort((a, b) => a.sha256.localeCompare(b.sha256));
      return { id, result: record.result, screenshots };
    }),
  };
}

export function parity(seed, full, selected) {
  assert.deepEqual(material(full), material(selected), "Paired policies preserve complete material evidence");
  assert.deepEqual(material(full), material(seed), "Identity-only changes preserve seeded material");
  const f = new Map(full.records.map((r) => [r.id, r]));
  for (const record of selected.records) {
    assert.deepEqual(record.dependencies, f.get(record.id).dependencies, "Paired dependency and artifact closure agrees");
    assert.equal(record.signature, f.get(record.id).signature, "Paired definition and runtime agree");
  }
  return signature(material(full));
}

// This oracle is authored separately from cache eligibility and the verdict detector.
export function adjudicate(record, oracle) {
  const faults = [];
  if (!record || record.id !== oracle.id || record.result?.id !== oracle.id) return ["identity"];
  if (record.signature !== oracle.signature) faults.push("definition-runtime");
  for (const [key, hash] of Object.entries(oracle.dependencies)) {
    if (record.dependencies?.[key] !== hash) faults.push("dependency:" + key);
  }
  if (canonical(record.result) !== canonical(oracle.result)) faults.push("material");
  return faults;
}

export function assertApproval(approval, frozen) {
  assert.equal(approval.frozenHash, signature(frozen), "Approval binds the complete frozen environment");
  assert.equal(approval.bundleHash, frozen.bundleHash, "Approval binds reviewed source and protocol");
  assert.equal(approval.authorizeBrowserExecution, true, "Parent authorizes browser execution after review");
  assert.equal(approval.independentFaultAdjudication, true, "Independent reviewer adjudicates the fault corpus");
  assert.equal(approval.contention, "quiet", "Reviewer declares a quiet local machine");
  assert(typeof approval.reviewer === "string" && /^[a-zA-Z0-9][a-zA-Z0-9 ._-]{2,79}$/u.test(approval.reviewer),
    "A reviewer role or public-safe identity is recorded");
  assert(Number.isFinite(Date.parse(approval.approvedAt)) &&
    Date.parse(approval.approvedAt) >= Date.parse(frozen.createdAt) &&
    Date.parse(approval.approvedAt) <= Date.now(), "Review follows freezing and precedes execution");
}

export function summarize(protocol, state) {
  const rows = state.pairs ?? [];
  const result = {
    disposition: "defer", evidence: "awaiting-reviewed-execution", scenarios: [],
    completedPairs: rows.length, measuredMilliseconds: state.measuredMilliseconds ?? 0,
    measuredBudgetMilliseconds: protocol.measuredBudgetMilliseconds,
    stop: state.stop ?? null, sessions: state.sessions?.length ?? 0,
  };
  for (const scenario of protocol.scenarios) {
    const values = rows.filter((row) => row.scenario === scenario.id).map((row) => row.differenceMilliseconds);
    const sorted = [...values].sort((a, b) => a - b);
    result.scenarios.push({
      scenario: scenario.id, pairedDifferencesMilliseconds: values, n: values.length,
      meanMilliseconds: values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null,
      medianMilliseconds: values.length ? (sorted[Math.floor((values.length - 1) / 2)] + sorted[Math.floor(values.length / 2)]) / 2 : null,
      rangeMilliseconds: values.length ? [sorted[0], sorted.at(-1)] : null,
    });
  }
  if (state.interrupted || state.stop || (state.sessions?.length ?? 0) > 1 || state.contention === true) {
    result.disposition = "indeterminate"; result.evidence = "bounded-local-comparison";
  } else if (rows.length === protocol.expected.measuredPairs) {
    const values = rows.map((row) => row.differenceMilliseconds);
    result.disposition = values.every((v) => v > 0) ? "adopt" : values.every((v) => v <= 0) ? "retain" : "combine";
    result.evidence = "complete-local-paired-comparison";
  } else if (state.started) {
    result.disposition = "indeterminate"; result.evidence = "partial-local-comparison";
  }
  return result;
}

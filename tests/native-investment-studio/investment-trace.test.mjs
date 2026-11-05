import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createExamplePlan, preparePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createShowcasePlan } from '../../collaboration/native-investment-studio/presets.mjs';
import { projectInvestmentTrace } from '../../collaboration/native-investment-studio/investment-trace.mjs';

function smallPlan(rate = 10000) {
  const plan = createExamplePlan(); plan.people = [{ ...plan.people[0], fundedMinutes: 0, rateCentsPerHour: rate }];
  plan.teams[0].personIds = ['product-one']; plan.work[0].personIds = ['product-one']; plan.work[0].occurrences = 1; plan.practices = [];
  return plan;
}

test('four longer pilot reviews reconcile the whole plan and exact person contributions against a held baseline', () => {
  const plan = createShowcasePlan(), baseline = preparePlan(plan);
  plan.work.find(row => row.id === 'review').minutesPerOccurrence = 45;
  const accepted = preparePlan(plan), trace = projectInvestmentTrace(accepted, baseline);
  assert.equal(trace.baseline.knownCents, 398000); assert.equal(trace.accepted.knownCents, 435000);
  assert.deepEqual(trace.difference, { knownCents: 37000, totalCents: 37000 });
  assert.deepEqual(trace.rows.filter(row => row.difference.knownCents).map(row => [row.personId, row.difference.knownCents]),
    [['maya', 12000], ['ari', 14000], ['noor', 11000]]);
  assert.equal(trace.rows.reduce((sum, row) => sum + row.accepted.knownCents, 0), 435000);
  assert.equal(trace.accepted.fundedKnownCents, 284000); assert.equal(trace.accepted.additionalKnownCents, 151000);
  assert.equal(trace.accepted.allocatedKnownCents, 148000, 'allocation is inside funded staffing rather than a third contribution');
  assert.equal(baseline.result.plannedCommitmentCents, 398000);
});

test('the interacting-input example explains $1,050 by source contribution instead of asserting input causality', () => {
  const plan = createExamplePlan(), baseline = preparePlan(plan);
  const fifth = { ...plan.people[0], id: 'reviewer-five', label: 'Additional reviewer' }; plan.people.push(fifth);
  plan.teams[0].personIds.push(fifth.id); plan.work[0].personIds.push(fifth.id); plan.work[0].minutesPerOccurrence = 45;
  const trace = projectInvestmentTrace(preparePlan(plan), baseline);
  assert.equal(trace.baseline.totalCents, 120000); assert.equal(trace.accepted.totalCents, 225000);
  assert.equal(trace.difference.totalCents, 105000);
  assert.deepEqual(trace.rows.map(row => row.difference.totalCents), [15000, 15000, 15000, 15000, 45000]);
  assert.equal(trace.rows.at(-1).baseline, null); assert.deepEqual(trace.rows.at(-1).source, { kind: 'person', id: 'reviewer-five' });
  const ordered = new Map(trace.rows.map(row => [row.key, row.difference]));
  plan.people.reverse(); plan.work[0].personIds.reverse();
  const reordered = projectInvestmentTrace(preparePlan(plan), baseline);
  assert.deepEqual(new Map(reordered.rows.map(row => [row.key, row.difference])), ordered);
  assert.deepEqual(reordered.difference, trace.difference);
});

test('settled funding pools preserve split-work rounding and keep inactive work commitments', () => {
  const plan = smallPlan(1); plan.work.push({ ...plan.work[0], id: 'second' });
  plan.assuranceSettings.quality.concepts[0].workIds = ['review', 'second'];
  plan.assuranceSettings.quality.concepts[1].workIds = ['review'];
  const before = preparePlan(plan), trace = projectInvestmentTrace(before);
  assert.equal(trace.accepted.totalCents, 1); assert.equal(trace.rows[0].accepted.totalCents, 1);
  assert.deepEqual(trace.rows[0].accepted.work.map(row => row.cents), [1, 1]);
  assert.deepEqual(trace.accepted.lineRoundingAdjustments, { allocatedCents: 0, additionalCents: -1 });
  plan.work[0].status = 'paused'; plan.work[1].lifecycle = 'retired';
  const after = preparePlan(plan), changed = projectInvestmentTrace(after, before);
  assert.equal(after.result.standing, 'incomplete'); assert.equal(changed.accepted.totalCents, 1); assert.equal(changed.difference.totalCents, 0);
  assert.deepEqual(changed.rows[0].accepted.work.map(row => [row.status, row.lifecycle]), [['paused', 'active'], ['planned', 'retired']]);
  assert.equal(changed.rows[0].accepted.work.length, 2, 'shared quality references retain one ledger incidence for each session');
});

test('allocating an existing session preserves its attributed value while removing only additional commitment', () => {
  const plan = smallPlan(); plan.people[0].fundedMinutes = 60;
  const before = preparePlan(plan); plan.work[0].funding = 'allocated';
  const trace = projectInvestmentTrace(preparePlan(plan), before), row = trace.rows[0].accepted;
  assert.deepEqual(row.funded, { minutes: 60, cents: 10000 });
  assert.deepEqual(row.allocated, { minutes: 30, cents: 5000 });
  assert.deepEqual(row.additional, { minutes: 0, cents: 0 });
  assert.equal(row.remainingFundedMinutes, 30); assert.equal(row.totalCents, 10000);
  assert.deepEqual(trace.difference, { knownCents: -5000, totalCents: -5000 });
});

test('missing positive-time rates, known zero and a missing baseline remain distinct', () => {
  const plan = smallPlan(null), unknown = preparePlan(plan), first = projectInvestmentTrace(unknown);
  assert.equal(first.baseline, null); assert.equal(first.difference, null); assert.equal(first.rows[0].difference, null);
  assert.equal(first.accepted.knownCents, 0); assert.equal(first.accepted.totalCents, null);
  assert.equal(first.rows[0].accepted.work[0].cents, null);
  plan.work[0].occurrences = 0; const zero = projectInvestmentTrace(preparePlan(plan), unknown);
  assert.equal(zero.accepted.totalCents, 0); assert.equal(zero.rows[0].accepted.totalCents, 0);
  assert.deepEqual(zero.difference, { knownCents: 0, totalCents: null });
  assert.deepEqual(zero.rows[0].difference, { knownCents: 0, totalCents: null });
});

test('source identity remains scoped to its plan and removed sources retain a readable baseline without a current editor', () => {
  const plan = smallPlan(), baseline = preparePlan(plan); plan.planId = 'another-plan';
  const separate = projectInvestmentTrace(preparePlan(plan), baseline);
  assert.equal(separate.rows.length, 2); assert.notEqual(separate.rows[0].key, separate.rows[1].key);
  assert.equal(separate.rows[0].baseline, null); assert.equal(separate.rows[1].accepted, null); assert.equal(separate.rows[1].source, null);
  assert.deepEqual(separate.difference, { knownCents: 0, totalCents: 0 });
  plan.planId = baseline.state.planId; plan.people = []; plan.teams = []; plan.work = [];
  const removed = projectInvestmentTrace(preparePlan(plan), baseline);
  assert.equal(removed.rows[0].baseline.label, baseline.state.people[0].label);
  assert.equal(removed.rows[0].source, null); assert.equal(removed.difference.totalCents, -5000);
  assert.throws(() => { removed.rows[0].baseline.work[0].cents = 0; }, TypeError);
  assert.throws(() => removed.accepted.people.push({}), TypeError);
  assert.equal(baseline.result.plannedCommitmentCents, 5000);
});

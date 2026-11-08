import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createExamplePlan, preparePlan, prepareImport, prepareScoreSettings, prepareAvailability } from '../../collaboration/native-investment-studio/contract.mjs';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { LIMITS } from '../../collaboration/native-investment-studio/config.mjs';
import { createPlanExchange } from '../../collaboration/native-investment-studio/exchange.mjs';
import { createDraftCoordinator } from '../../collaboration/native-investment-studio/editing.mjs';
import { describeScoreChanges } from '../../collaboration/native-investment-studio/score-reference.mjs';

const command = (plan, extra = {}) => ({ type: 'score.arrangement.replace', scoreSettings: structuredClone(plan.scoreSettings), workTiming: [], availability: [], fundProposalIds: [], ...extra });
const rejects = (fn, code) => assert.throws(fn, error => error.code === code);
function proposalPlan() {
  const plan = createExamplePlan();
  plan.scoreSettings.stages = [{ id: 'review-stage', label: 'Review the evidence', workIds: ['review'] }];
  plan.scoreSettings.gates = [{ id: 'decision', label: 'Decide the next work', afterStageId: 'review-stage', reviewerPersonId: 'product-one', question: 'Is the recovery ready?', evidence: null, modeledDecision: 'open' }];
  plan.scoreSettings.proposals = [{ id: 'followup', bank: 'next', gateId: 'decision', work: { ...structuredClone(plan.work[0]), id: 'followup-session', label: 'Clarify the recovery', personIds: ['product-one'], occurrences: 1 } }];
  return plan;
}
test('investment comparisons name actual score changes and separate modeled decisions from funded sessions', () => {
  const original = proposalPlan(); original.people[0].label = 'Product lead';
  const before = preparePlan(original).state, candidate = structuredClone(before);
  candidate.work[0].timing = { startMinute: 20, repeatEveryMinutes: 45 };
  candidate.people[0].availability = [{ startMinute: 10, endMinute: 90 }];
  candidate.scoreSettings.window = { label: 'Pilot morning', startMinute: 0, endMinute: 240 };
  candidate.scoreSettings.gates[0].modeledDecision = 'proceed';
  const after = preparePlan(candidate);
  assert.equal(after.result.knownCommitmentCents, 120000);
  assert.deepEqual(describeScoreChanges(before, after.state), [
    `Session timing — ${before.work[0].label}: Timing to choose → starts at minute 20; repeats every 45 minutes.`,
    `Availability — ${before.people[0].label}: Availability to choose → minutes 10–90.`,
    'Score window: Window to choose → Pilot morning; minutes 0–240.',
    'Decision gate changed: Decide the next work; after Review the evidence; modeled decision: proceed; reviewer Product lead; question: Is the recovery ready?; evidence: to describe.',
  ]);
  const studio = createStudio(after.state), accepted = studio.read();
  assert.equal(studio.applyCommand(command(accepted.state, { fundProposalIds: ['followup'] }), accepted).ok, true);
  assert.deepEqual(describeScoreChanges(accepted.state, studio.read().state), ['Added to planned work: Clarify the recovery.']);
  const unavailable = structuredClone(studio.read().state); unavailable.people[0].availability = [];
  assert.deepEqual(describeScoreChanges(studio.read().state, preparePlan(unavailable).state), [`Availability — ${before.people[0].label}: minutes 10–90 → No available intervals.`]);
});
test('schema0.6 migration preserves amounts and unknown calendar inputs, including an omitted legacy timing member', () => {
  const legacy = createExamplePlan(); legacy.schemaVersion = '0.6.0'; delete legacy.scoreSettings; delete legacy.arrangements;
  legacy.people.forEach(row => { delete row.availability; }); delete legacy.work[0].timing;
  const result = prepareImport(JSON.stringify(legacy)).projection;
  assert.equal(result.state.schemaVersion, '0.9.0'); assert.equal(result.result.knownCommitmentCents, 120000);
  assert.equal(result.state.work[0].timing, null); assert.ok(result.state.people.every(row => row.availability === null));
  assert.equal(result.state.scoreSettings.window, null); assert.deepEqual(result.state.scoreSettings.proposals, []);
  assert.equal(result.score.workRows[0].placement, 'unspecified');
  legacy.work[0].timing = { startMinute: 0, repeatEveryMinutes: 60 }; rejects(() => preparePlan(legacy), 'timing-version');
  const current = createExamplePlan(); delete current.people[0].availability; rejects(() => preparePlan(current), 'fields');
});
test('timing admits explicit cadence and bounded half-open intervals while ownership never reads an accessor', () => {
  const plan = createExamplePlan(); plan.work[0].timing = { startMinute: 60, repeatEveryMinutes: null };
  rejects(() => preparePlan(plan), 'score-cadence'); plan.work[0].timing.repeatEveryMinutes = 60;
  plan.people[0].availability = [{ startMinute: 60, endMinute: 90 }, { startMinute: 90, endMinute: 90 }];
  const result = preparePlan(plan); assert.equal(result.score.occurrences.length, 6); assert.equal(result.result.knownCommitmentCents, 120000);
  plan.people[0].availability[0].endMinute = 0; assert.equal(result.state.people[0].availability[0].endMinute, 90);
  rejects(() => prepareAvailability(plan.people[0].availability), 'integer');
  plan.people[0].availability = null; plan.work[0].timing.startMinute = LIMITS.scoreMinute - 20;
  rejects(() => preparePlan(plan), 'score-minute-budget');
  let reads = 0; const settings = proposalPlan().scoreSettings;
  Object.defineProperty(settings.proposals[0].work, 'personIds', { enumerable: true, get() { reads += 1; return ['product-one']; } });
  rejects(() => prepareScoreSettings(settings), 'data-property'); assert.equal(reads, 0);
});
test('every authored dependency participates in cycle admission even when its connection is paused', () => {
  const plan = createExamplePlan(); plan.work.push({ ...structuredClone(plan.work[0]), id: 'later' });
  plan.teams.push({ id: 'reviewers', label: 'Reviewers', personIds: ['product-one'], lifecycle: 'active' });
  plan.connections = [{ id: 'handoff', senderTeamId: 'delivery', receiverTeamId: 'reviewers', receiverPersonId: 'product-one', sharedObject: 'Review result', responseExpectation: 'Confirm receipt', workIds: [], status: 'paused' }];
  plan.scoreSettings.dependencies = [{ id: 'forward', fromWorkId: 'review', toWorkId: 'later', lagMinutes: 0, connectionId: null },
    { id: 'return', fromWorkId: 'later', toWorkId: 'review', lagMinutes: 1, connectionId: 'handoff' }];
  rejects(() => preparePlan(plan), 'score-cycle'); plan.scoreSettings.dependencies.pop(); assert.equal(preparePlan(plan).score.dependencies.length, 1);
  plan.scoreSettings.dependencies[0].toWorkId = 'missing'; rejects(() => preparePlan(plan), 'reference');
});
test('expanded occurrences and person assignments are bounded before projection, including inactive placements', () => {
  const plan = createExamplePlan(); Object.assign(plan.work[0], { status: 'paused', occurrences: 4096, timing: { startMinute: 0, repeatEveryMinutes: 1 } });
  const admitted = preparePlan(plan); assert.equal(admitted.score.occurrences.length, 4096); assert.equal(admitted.score.capacity[0].scheduledEffortMinutes, 0);
  plan.work[0].occurrences = 4097; rejects(() => preparePlan(plan), 'score-occurrence-budget'); plan.work[0].occurrences = 4096;
  plan.people.push({ ...structuredClone(plan.people[0]), id: 'extra' }); plan.teams[0].personIds.push('extra'); plan.work[0].personIds.push('extra');
  rejects(() => preparePlan(plan), 'score-assignment-budget');
  plan.work[0].timing = null; assert.equal(preparePlan(plan).score.occurrences.length, 0);
});
test('score references share the current plan reference budget with existing settings', () => {
  const plan = createExamplePlan(); plan.work = Array.from({ length: 256 }, (_, index) => ({ ...structuredClone(plan.work[0]), id: `work-${index}`, occurrences: 0 }));
  plan.practices = []; const ids = plan.work.map(row => row.id);
  for (const framework of plan.changeSettings.frameworkMaps) for (const component of framework.components) component.workIds = [...ids];
  assert.ok(preparePlan(plan));
  plan.scoreSettings.stages = Array.from({ length: 32 }, (_, index) => ({ id: `stage-${index}`, label: 'Review this work', workIds: [...ids] }));
  rejects(() => preparePlan(plan), 'reference-budget');
});
test('gate decisions preserve investment until explicit atomic funding; failed admission preserves accepted bytes and history', () => {
  const studio = createStudio(proposalPlan()), before = studio.read(), settings = structuredClone(before.state.scoreSettings);
  const blocked = studio.applyCommand(command(before.state, { fundProposalIds: ['followup'] }), before);
  assert.equal(blocked.error.code, 'score-gate'); assert.strictEqual(studio.read(), before); assert.equal(studio.readHistory().undoCount, 0);
  settings.gates[0].modeledDecision = 'proceed';
  assert.equal(studio.applyCommand(command(before.state, { scoreSettings: settings }), before).ok, true);
  const gateAccepted = studio.read(); assert.equal(gateAccepted.result.knownCommitmentCents, 120000); assert.equal(gateAccepted.state.work.length, 1);
  const funded = command(gateAccepted.state, { fundProposalIds: ['followup'], workTiming: [{ workId: 'followup-session', timing: { startMinute: 500, repeatEveryMinutes: null } }] });
  funded.scoreSettings.stages[0].workIds.push('followup-session');
  const preview = studio.previewCommand(funded, gateAccepted); assert.equal(preview.ok, true, preview.error?.message); assert.equal(preview.projection.result.knownCommitmentCents, 125000);
  assert.strictEqual(studio.read(), gateAccepted); assert.equal(studio.applyCommand(funded, gateAccepted).ok, true);
  assert.deepEqual(studio.read().state.scoreSettings.proposals, []); assert.equal(studio.read().state.work[1].timing.startMinute, 500);
  assert.equal(studio.undo(studio.read()).ok, true); assert.equal(studio.read().serialized, gateAccepted.serialized);
  const invalid = command(studio.read().state); invalid.scoreSettings.proposals.push(structuredClone(invalid.scoreSettings.proposals[0]));
  assert.equal(studio.applyCommand(invalid, studio.read()).error.code, 'duplicate-id'); assert.equal(studio.read().serialized, gateAccepted.serialized);
});
test('proposed sessions accept cross-team participants without changing the hosting roster', () => {
  const plan = proposalPlan();
  plan.teams.push({ id: 'review-host', label: 'Review host', personIds: [], lifecycle: 'active' });
  plan.scoreSettings.proposals[0].work.teamId = 'review-host';
  plan.scoreSettings.gates[0].modeledDecision = 'proceed';
  const studio = createStudio(plan), before = studio.read();
  const result = studio.applyCommand(command(before.state, { fundProposalIds: ['followup'] }), before);
  assert.equal(result.ok, true, result.error?.message);
  assert.deepEqual(result.projection.state.work.at(-1).personIds, ['product-one']);
  assert.equal(result.projection.state.work.at(-1).teamId, 'review-host');
  assert.deepEqual(result.projection.state.teams, before.state.teams);
  assert.equal(studio.undo(studio.read()).ok, true);
  assert.equal(studio.exportText(), before.serialized);
});
test('score-aware removal guards identify the exact records and comparison separates timing, availability and gate changes', () => {
  const plan = proposalPlan(); plan.scoreSettings.waits = [{ id: 'response-wait', label: 'Wait for review', startMinute: 0, endMinute: 60, reason: null, receiverPersonId: 'product-one' }];
  const studio = createStudio(plan), before = studio.read();
  const person = studio.previewCommand({ type: 'person.remove', personId: 'product-one' }, before);
  assert.deepEqual(person.error.references.filter(row => row.collection === 'scoreSettings').map(row => row.field), ['waits[0].receiverPersonId', 'gates[0].reviewerPersonId', 'proposals[0].work.personIds']);
  const work = studio.previewCommand({ type: 'work.remove', workId: 'review' }, before);
  assert.equal(work.ok, true); assert.deepEqual(work.projection.state.scoreSettings.stages[0].workIds, []);
  assert.strictEqual(studio.read(), before);
  const candidate = structuredClone(before.state); candidate.work[0].timing = { startMinute: 0, repeatEveryMinutes: 60 };
  candidate.people[0].availability = [{ startMinute: 0, endMinute: 400 }]; candidate.scoreSettings.gates[0].modeledDecision = 'proceed';
  const exchange = createPlanExchange(studio, createDraftCoordinator(studio)).previewText(JSON.stringify(candidate));
  assert.equal(exchange.ok, true, exchange.error?.message); assert.deepEqual(exchange.view.preview.changes.scoreSettings, ['gates']);
  assert.deepEqual(exchange.view.preview.changes.work.changed, [{ id: 'review', fields: ['timing'] }]);
  assert.deepEqual(exchange.view.preview.changes.people.changed, [{ id: 'product-one', fields: ['availability'] }]);
});
test('owned timing and availability copies remain exact no-ops at the revision ceiling', () => {
  const plan = createExamplePlan(); plan.revision = LIMITS.revision; plan.work[0].timing = { startMinute: 0, repeatEveryMinutes: 60 }; plan.people[0].availability = [{ startMinute: 0, endMinute: 400 }];
  const studio = createStudio(plan), before = studio.read(), acceptance = studio.readAcceptance();
  assert.equal(studio.updateWork('review', structuredClone(before.state.work[0]), before).ok, true); assert.strictEqual(studio.read(), before);
  assert.equal(studio.updatePerson('product-one', structuredClone(before.state.people[0]), before).ok, true); assert.strictEqual(studio.read(), before);
  assert.equal(studio.applyCommand(command(before.state, { workTiming: [{ workId: 'review', timing: structuredClone(before.state.work[0].timing) }], availability: [{ personId: 'product-one', intervals: structuredClone(before.state.people[0].availability) }] }), before).ok, true);
  assert.strictEqual(studio.read(), before); assert.strictEqual(studio.readAcceptance(), acceptance); assert.equal(studio.readHistory().undoCount, 0);
});

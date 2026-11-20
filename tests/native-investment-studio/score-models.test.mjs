import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createExamplePlan, preparePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createScoreSettings, projectScore, selectScoreIntervalWork } from '../../collaboration/native-investment-studio/score-models.mjs';
import { ordinaryWork, literalScoreFixture, EXPECTED_LITERAL_READING } from './score-fixtures.mjs';

function reading(plan) {
  const admitted = preparePlan(plan);
  return { admitted, score: projectScore(admitted.state) };
}
function exactCapacity(row) {
  return Object.fromEntries(['scheduledEffortMinutes', 'unscheduledEffortMinutes', 'occupiedMinutes', 'overlapMinutes',
    'peakConcurrent', 'availableMinutes', 'outsideAvailabilityMinutes'].map(key => [key, row[key]]));
}

test('empty score settings leave accepted effort unscheduled and availability unknown', () => {
  const first = createScoreSettings(), second = createScoreSettings();
  first.stages.push({ id: 'local', label: 'Local proposal', workIds: [] });
  assert.deepEqual(second, { version: '1.1.0', window: null, dependencies: [], stages: [], waits: [], gates: [], proposals: [], cadence: null });
  const plan = createExamplePlan(); plan.scoreSettings = second;
  const { score } = reading(plan);
  assert.equal(score.window, null); assert.equal(score.workRows[0].placement, 'unspecified');
  assert.deepEqual(score.span, { startMinute: null, endMinute: null, elapsedMinutes: null });
  assert.deepEqual(score.agenda, []);
  assert.deepEqual(score.diagnostics, [{ code: 'needs-timing', kind: 'work', id: 'review', workId: 'review' }]);
  assert.equal(score.capacity[0].scheduledEffortMinutes, 0);
  assert.equal(score.capacity[0].unscheduledEffortMinutes, 180);
  assert.equal(score.capacity[0].availableMinutes, null);
});

test('literal recurrence distinguishes participant effort, occupied time, overlap, availability and accepted spending', () => {
  const { admitted, score } = reading(literalScoreFixture());
  assert.deepEqual(score.occurrences.filter(row => row.workId === 'walkthrough')
    .map(({ startMinute, endMinute }) => [startMinute, endMinute]), [[60, 105], [180, 225]]);
  for (const row of score.capacity) assert.deepEqual(exactCapacity(row), EXPECTED_LITERAL_READING[row.personId]);
  assert.deepEqual(score.capacity[0].outsideAvailability, [{ startMinute: 210, endMinute: 225 }]);
  assert.deepEqual(score.capacity[0].overlap, [{ startMinute: 90, endMinute: 105, concurrent: 2 }]);
  assert.deepEqual(selectScoreIntervalWork(score, 'researcher', { startMinute: 90, endMinute: 105 })
    .map(row => [row.workId, row.occurrenceIndex]), [['walkthrough', 0], ['review', 0]]);
  assert.deepEqual(score.span, EXPECTED_LITERAL_READING.span);
  assert.equal(score.workRows.find(row => row.workId === 'follow-up').effortMinutesPerPerson, 20);
  assert.equal(admitted.result.knownCommitmentCents, 50500);
  assert.ok(score.occurrences.some(row => row.workId === 'paused' && !row.active), 'paused commitments retain their visible placement');
});

test('moving review after repeated work resolves the clash while a paused connection suspends only its dependency', () => {
  const plan = literalScoreFixture(), initial = reading(plan);
  assert.equal(initial.score.dependencies[0].status, 'satisfied');
  assert.equal(initial.score.dependencies[1].status, 'starts-before-ready');
  assert.equal(initial.score.dependencies[1].earliestStartMinute, 240);
  assert.equal(initial.score.dependencies[1].slackMinutes, -150);
  plan.work.find(work => work.id === 'review').timing.startMinute = 240;
  plan.connections[0].status = 'paused';
  const revised = reading(plan);
  assert.equal(revised.score.dependencies[0].status, 'connection-paused');
  assert.equal(revised.score.dependencies[1].status, 'satisfied');
  assert.equal(revised.score.capacity[0].overlapMinutes, 0);
  assert.equal(revised.score.span.elapsedMinutes, 270);
  assert.equal(revised.score.capacity[0].scheduledEffortMinutes, 180);
  assert.equal(revised.admitted.result.knownCommitmentCents, 50500);
  assert.ok(revised.score.diagnostics.some(row => row.code === 'outside-planning-window' && row.workId === 'review'));
  const retained = plan.work.find(work => work.id === 'paused'); retained.status = 'planned';
  assert.equal(reading(plan).score.capacity[0].scheduledEffortMinutes, 220);
  retained.lifecycle = 'retired';
  assert.equal(reading(plan).score.capacity[0].scheduledEffortMinutes, 180);
  assert.equal(reading(plan).admitted.result.knownCommitmentCents, 50500);
});

test('touching intervals and a zero-duration milestone keep half-open capacity, with empty availability distinct from unknown', () => {
  const plan = literalScoreFixture(); plan.connections = []; plan.scoreSettings = createScoreSettings();
  plan.work = [ordinaryWork('first', 'First session', ['researcher'], 60, 1, 'allocated', { startMinute: 0, repeatEveryMinutes: null }),
    ordinaryWork('second', 'Second session', ['researcher'], 30, 1, 'additional', { startMinute: 60, repeatEveryMinutes: null }),
    ordinaryWork('point', 'Review point', ['researcher'], 0, 1, 'additional', { startMinute: 60, repeatEveryMinutes: null })];
  plan.people[0].availability = [];
  const { score } = reading(plan), capacity = score.capacity[0];
  assert.equal(capacity.scheduledEffortMinutes, 90); assert.equal(capacity.occupiedMinutes, 90);
  assert.equal(capacity.overlapMinutes, 0); assert.equal(capacity.peakConcurrent, 1);
  assert.equal(capacity.availableMinutes, 0); assert.equal(capacity.outsideAvailabilityMinutes, 90);
  assert.equal(score.capacity[1].availableMinutes, null);
  assert.equal(score.occurrences.find(row => row.workId === 'point').kind, 'milestone');
  assert.deepEqual(selectScoreIntervalWork(score, 'researcher', { startMinute: 60, endMinute: 90 }).map(row => row.workId), ['second']);
  plan.people[0].availability = [{ startMinute: 0, endMinute: 45 }, { startMinute: 30, endMinute: 90 }];
  const available = reading(plan).score.capacity[0];
  assert.equal(available.availableMinutes, 90); assert.equal(available.outsideAvailabilityMinutes, 0);
});

test('a repeated session can overlap its earlier occurrence without double-counting occupied time', () => {
  const plan = literalScoreFixture(); plan.connections = []; plan.scoreSettings = createScoreSettings();
  plan.work = [ordinaryWork('repeat', 'Repeat the walkthrough', ['researcher'], 45, 2, 'allocated', { startMinute: 0, repeatEveryMinutes: 30 })];
  const { score } = reading(plan), capacity = score.capacity[0];
  assert.equal(capacity.scheduledEffortMinutes, 90); assert.equal(capacity.occupiedMinutes, 75);
  assert.deepEqual(capacity.overlap, [{ startMinute: 30, endMinute: 45, concurrent: 2 }]);
  assert.deepEqual(selectScoreIntervalWork(score, 'researcher', capacity.overlap[0]).map(row => row.occurrenceIndex), [0, 1]);
});

test('unspecified work leaves a partial stage and its modeled gate without an invented time', () => {
  const plan = literalScoreFixture(); plan.work.find(work => work.id === 'walkthrough').timing = null;
  plan.scoreSettings.gates[0].reviewerPersonId = null;
  const { score } = reading(plan);
  assert.equal(score.dependencies[0].status, 'needs-timing');
  const stage = score.stages.find(stage => stage.id === 'pilot');
  assert.equal(stage.status, 'partial'); assert.deepEqual(stage.unspecifiedWorkIds, ['walkthrough']);
  assert.deepEqual([stage.startMinute, stage.endMinute], [90, 225]);
  assert.equal(score.gates[0].minute, null); assert.equal(score.gates[0].reviewerPersonId, null);
  assert.equal(score.agenda.some(row => row.kind === 'gate'), false);
  assert.equal(score.capacity[1].unscheduledEffortMinutes, 110);
});

test('waits extend elapsed time and modeled gate decisions leave Next and Options outside accepted effort and investment', () => {
  const plan = literalScoreFixture();
  plan.scoreSettings.waits[0].startMinute = 240; plan.scoreSettings.waits[0].endMinute = 300;
  plan.scoreSettings.waits[0].receiverPersonId = null; plan.scoreSettings.waits[0].reason = null;
  plan.scoreSettings.gates[0].modeledDecision = 'proceed';
  plan.scoreSettings.proposals[0].work.timing = { startMinute: 500, repeatEveryMinutes: null };
  const { score, admitted } = reading(plan);
  assert.equal(score.span.elapsedMinutes, 300); assert.equal(score.waits[0].endMinute - score.waits[0].startMinute, 60);
  assert.equal(score.gates[0].minute, 225); assert.equal(score.gates[0].standing, 'modeled-decision');
  assert.equal(score.capacity[1].scheduledEffortMinutes, 90); assert.equal(admitted.result.knownCommitmentCents, 50500);
  assert.deepEqual(score.banks.committedWorkIds, ['prepare', 'walkthrough', 'review', 'follow-up', 'paused', 'milestone']);
  assert.equal(score.banks.next[0].gateId, 'pilot-decision'); assert.equal(score.banks.next[0].work.timing.startMinute, 500);
  assert.equal(score.banks.options[0].work.id, 'new-expansion');
  assert.equal(score.occurrences.some(row => row.workId === 'new-follow-up'), false);
});

test('wide work lanes and chronological agenda share frozen detached records while funding and window choices keep their own meaning', () => {
  const plan = literalScoreFixture(), before = JSON.stringify(plan), score = projectScore(plan);
  for (const row of score.workRows) for (const occurrence of row.occurrences) {
    assert.strictEqual(score.occurrences.find(item => item.workId === row.workId && item.occurrenceIndex === occurrence.occurrenceIndex), occurrence);
    assert.strictEqual(score.agenda.find(item => item.workId === row.workId && item.occurrenceIndex === occurrence.occurrenceIndex), occurrence);
  }
  assert.deepEqual(score.agenda.map(row => row.startMinute), [0, 60, 90, 100, 120, 180, 225, 225]);
  assert.equal(JSON.stringify(plan), before); assert.equal(Object.isFrozen(plan.work[0]), false);
  assert.throws(() => { score.banks.next[0].work.personIds.push('engineer'); }, TypeError);
  plan.scoreSettings.proposals[0].work.label = 'Revised proposal'; plan.people[0].availability[0].endMinute = 30;
  assert.equal(score.banks.next[0].work.label, 'Review the pilot findings'); assert.equal(score.capacity[0].availableMinutes, 150);
  const alternative = literalScoreFixture(); alternative.people[0].fundedMinutes = 4800;
  alternative.scoreSettings.window = { label: 'Inspect the review period', startMinute: 90, endMinute: 210 };
  const changed = reading(alternative).score;
  assert.deepEqual(changed.capacity, score.capacity); assert.deepEqual(changed.span, score.span);
  assert.deepEqual(changed.occurrences, score.occurrences);
});

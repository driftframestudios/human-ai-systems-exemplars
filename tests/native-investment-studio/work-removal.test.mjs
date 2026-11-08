import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan, preparePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createCadence } from '../../collaboration/native-investment-studio/cadence.mjs';
import { getCapabilityDefinition } from '../../collaboration/native-investment-studio/capabilities.mjs';

function linkedPlan() {
  const plan = createExamplePlan(), work = plan.work[0];
  plan.teams.push({ id: 'receivers', label: 'Receiving team', personIds: [], lifecycle: 'active' });
  plan.work.push({ ...work, id: 'later', label: 'Later work' }, { ...work, id: 'last', label: 'Last work' });
  const workIds = ['later', 'review', 'last'];
  const definition = getCapabilityDefinition('ability', 'inspect-history', '1.0.0');
  plan.abilities = [{ ...plan.practices[0], id: 'history', definitionId: definition.id, definitionVersion: definition.version,
    supportBindings: definition.supportRequirements.map(row => ({ requirementId: row.id, workIds })) }];
  plan.practices[0].supportBindings[0].workIds = workIds;
  plan.contributions = [{ id: 'sources', categoryId: 'source-retrieval', receiverPersonId: null,
    decisionOwnerPersonId: null, workIds, reviewBoundary: null, decisionBoundary: null }];
  plan.connections = [{ id: 'delivery-route', senderTeamId: 'delivery', receiverTeamId: 'receivers', receiverPersonId: null,
    sharedObject: 'Reviewed work', responseExpectation: null, workIds, status: 'active' }];
  plan.changeSettings.frameworkMaps[0].components[0].workIds = workIds;
  const assurance = plan.assuranceSettings;
  assurance.quality.concepts[0].workIds = workIds;
  assurance.recoveryEvents = [{ id: 'recovery', label: 'Recover the request', included: true, lifecycle: 'active', eventCount: 1,
    aggregateMinutesPerEvent: 30, receiverPersonId: null, reviewBoundary: null, workIds }];
  assurance.learningActions = [{ id: 'learning', promptId: 'source-framing', context: null,
    decisionOwnerPersonId: null, reviewBoundary: null, workIds }];
  assurance.rehearsals = [{ id: 'rehearsal', definitionId: 'review-change', definitionVersion: '1.0.0', context: null,
    assumptions: null, response: null, reviewerPersonId: null, observedPlanRevision: 0, observation: null,
    workIds, connectionIds: ['delivery-route'], personIds: ['product-one'] }];
  const score = plan.scoreSettings, cadence = createCadence();
  score.cadence = cadence;
  score.dependencies = [{ id: 'incident', fromWorkId: 'review', toWorkId: 'later', lagMinutes: 0, connectionId: 'delivery-route' },
    { id: 'retained', fromWorkId: 'later', toWorkId: 'last', lagMinutes: 0, connectionId: null }];
  score.stages = [{ id: 'review-stage', label: 'Review', workIds: ['review'] }, { id: 'later-stage', label: 'Later', workIds: ['later'] }];
  cadence.placements = plan.work.flatMap(row => [0, 1].map(occurrenceIndex => ({ workId: row.id, occurrenceIndex,
    periodId: 'period-1', subdivision: 1 })));
  cadence.handoffs = [
    { id: 'removed-handoff', from: { kind: 'work', id: 'review' }, to: { kind: 'work', id: 'later' }, connectionId: 'delivery-route' },
    { id: 'retained-handoff', from: { kind: 'work', id: 'later' }, to: { kind: 'work', id: 'last' }, connectionId: null },
  ];
  score.gates = ['handoff-only', 'stage-backed', 'unrelated'].map((id, index) => ({ id, label: id,
    afterStageId: index === 0 ? null : 'review-stage', reviewerPersonId: null, question: null, evidence: null, modeledDecision: 'open' }));
  cadence.decisionAnchors = ['handoff-only', 'stage-backed'].map(gateId => ({ gateId, kind: 'handoff', id: 'removed-handoff' }));
  cadence.delays = [
    ['work-delay', 'work', 'review'], ['handoff-delay', 'handoff', 'removed-handoff'], ['stage-delay', 'stage', 'review-stage'],
  ].map(([id, kind, target]) => ({ id, label: id, anchor: { kind, id: target },
    fromPeriodId: 'period-1', toPeriodId: 'period-2', reason: null, receiverPersonId: null }));
  score.proposals = [{ id: 'proposal', bank: 'next', gateId: 'handoff-only', work: { ...work, id: 'proposed' } }];
  return plan;
}

test('one session removal dissolves its links, preserves their owners and recovers exactly through Undo', () => {
  const studio = createStudio(linkedPlan()), before = studio.read();
  const command = { type: 'work.remove', workId: 'review' };
  const preview = studio.previewCommand(command, before);
  assert.equal(preview.ok, true, preview.error?.message);
  assert.strictEqual(studio.read(), before);
  assert.equal(studio.readHistory().undoCount, 0);
  const removed = studio.applyCommand(command, before);
  assert.equal(removed.ok, true, removed.error?.message);
  const next = removed.projection.state;
  assert.deepEqual(next.work.map(row => row.id), ['later', 'last']);
  for (const rows of [next.contributions, next.connections, next.abilities[0].supportBindings, next.practices[0].supportBindings,
    [next.changeSettings.frameworkMaps[0].components[0]], [next.assuranceSettings.quality.concepts[0]],
    next.assuranceSettings.recoveryEvents, next.assuranceSettings.learningActions, next.assuranceSettings.rehearsals]) {
    assert.ok(rows.length > 0);
    for (const row of rows) assert.deepEqual(row.workIds, ['later', 'last']);
  }
  assert.deepEqual(next.scoreSettings.stages, [
    { id: 'review-stage', label: 'Review', workIds: [] }, { id: 'later-stage', label: 'Later', workIds: ['later'] },
  ]);
  assert.deepEqual(next.scoreSettings.dependencies, [before.state.scoreSettings.dependencies[1]]);
  const cadence = next.scoreSettings.cadence;
  assert.deepEqual(cadence.handoffs, [before.state.scoreSettings.cadence.handoffs[1]]);
  assert.deepEqual(cadence.placements, before.state.scoreSettings.cadence.placements.slice(2));
  assert.deepEqual(cadence.delays, [before.state.scoreSettings.cadence.delays[2]]);
  assert.deepEqual(cadence.decisionAnchors, []);
  assert.deepEqual(next.scoreSettings.gates, before.state.scoreSettings.gates.slice(1));
  assert.deepEqual(next.scoreSettings.proposals, [{ ...before.state.scoreSettings.proposals[0], gateId: null }]);
  for (const field of ['people', 'teams', 'arrangements', 'capabilityEvidence', 'purpose']) assert.deepEqual(next[field], before.state[field]);
  assert.deepEqual(next.assuranceSettings.rehearsals[0].connectionIds, ['delivery-route']);
  assert.equal(next.revision, before.state.revision + 1);
  assert.equal(studio.readHistory().undoCount, 1);
  assert.equal(preparePlan(JSON.parse(studio.exportText())).serialized, studio.exportText());
  const removedBytes = studio.exportText();
  assert.equal(studio.undo(studio.read()).ok, true);
  assert.equal(studio.exportText(), before.serialized);
  assert.equal(studio.redo(studio.read()).ok, true);
  assert.equal(studio.exportText(), removedBytes);
});

test('removing an occurrence keeps its plan links and an absent plan removal preserves state', () => {
  const studio = createStudio(linkedPlan()), before = studio.read();
  const work = { ...before.state.work[0], occurrences: 1 };
  assert.equal(studio.applyCommand({ type: 'work.update', work }, before).ok, true);
  const next = studio.read();
  assert.deepEqual(next.state.connections, before.state.connections);
  assert.deepEqual(next.state.practices, before.state.practices);
  assert.deepEqual(next.state.scoreSettings.cadence.handoffs, before.state.scoreSettings.cadence.handoffs);
  assert.deepEqual(next.state.scoreSettings.cadence.placements.filter(row => row.workId === 'review').map(row => row.occurrenceIndex), [0]);
  const history = studio.readHistory();
  assert.equal(studio.applyCommand({ type: 'work.remove', workId: 'absent' }, next).error.code, 'reference');
  assert.strictEqual(studio.read(), next);
  assert.deepEqual(studio.readHistory(), history);
});

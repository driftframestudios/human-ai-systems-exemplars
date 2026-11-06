import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCadence, resizeCadence, regroupCadence, projectCadence } from '../../collaboration/native-investment-studio/cadence.mjs';
import { createExamplePlan, preparePlan, prepareImport } from '../../collaboration/native-investment-studio/contract.mjs';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createPlanExchange } from '../../collaboration/native-investment-studio/exchange.mjs';
import { createDraftCoordinator } from '../../collaboration/native-investment-studio/editing.mjs';
import { describeScoreChanges, describeScoreReference } from '../../collaboration/native-investment-studio/score-reference.mjs';
import { prepareCoordinationTemplate, applyCoordinationTemplate } from '../../collaboration/native-investment-studio/connection-templates.mjs';

function periodPlan() {
  const plan = createExamplePlan();
  plan.work[0].occurrences = 2;
  plan.work.push({ ...structuredClone(plan.work[0]), id: 'followup', label: 'Follow up the review', occurrences: 1 });
  const cadence = createCadence('sprint', 2);
  cadence.placements = [
    { workId: 'review', occurrenceIndex: 0, periodId: 'period-1', subdivision: 1 },
    { workId: 'review', occurrenceIndex: 1, periodId: 'period-1', subdivision: 2 },
    { workId: 'followup', occurrenceIndex: 0, periodId: 'period-2', subdivision: 1 },
  ];
  cadence.handoffs = [{ id: 'review-handoff', from: { kind: 'work', id: 'review' }, to: { kind: 'work', id: 'followup' }, connectionId: null }];
  cadence.availability = [{ personId: 'product-one', periodId: 'period-1', availableMinutes: null },
    { personId: 'product-one', periodId: 'period-2', availableMinutes: 0 }];
  plan.scoreSettings.cadence = cadence;
  plan.scoreSettings.gates = [{ id: 'review-decision', label: 'Accept the review', afterStageId: null,
    reviewerPersonId: 'product-one', question: 'Can the receiving team proceed?', evidence: null, modeledDecision: 'open' }];
  cadence.decisionAnchors = [{ gateId: 'review-decision', kind: 'handoff', id: 'review-handoff' }];
  return plan;
}

test('period projection groups authored occurrences and anchored decisions without inventing availability or elapsed time', () => {
  const plan = periodPlan(), accepted = preparePlan(plan), view = projectCadence(accepted.state);
  assert.deepEqual(view.periods.map(row => [row.label, row.occurrences.map(item => item.workId)]),
    [['Sprint 1', ['review', 'review']], ['Sprint 2', ['followup']]]);
  assert.deepEqual(view.decisions.map(row => [row.id, row.periodId, row.subdivision]), [['review-decision', 'period-2', 1]]);
  assert.deepEqual(view.availability.map(row => row.availableMinutes), [null, 0]);
  assert.equal(view.handoffs[0].status, 'in-order');
  assert.equal(accepted.score.occurrences.length, 0);
  assert.ok(Object.isFrozen(view.periods[0].occurrences[0].personIds));
  plan.work[0].label = 'Changed outside the accepted owner';
  assert.equal(view.occurrences[0].label, accepted.state.work[0].label);
});

test('horizon shortening retains unresolved work and decisions; regrouping preserves effort and requires fresh availability', () => {
  const before = preparePlan(periodPlan()), next = structuredClone(before.state);
  next.scoreSettings.cadence = resizeCadence(next.scoreSettings.cadence, 1);
  const shortened = preparePlan(next);
  assert.deepEqual(shortened.score.cadence.unplaced.map(row => [row.workId, row.occurrenceIndex]), [['followup', 0]]);
  assert.equal(shortened.score.cadence.decisions[0].periodId, null);
  assert.deepEqual(shortened.state.work, before.state.work);
  assert.deepEqual(shortened.result, before.result);
  next.scoreSettings.cadence = regroupCadence(before.state.scoreSettings.cadence, 'quarter', 2);
  const regrouped = preparePlan(next);
  assert.deepEqual(regrouped.state.scoreSettings.cadence.availability, []);
  assert.equal(regrouped.score.cadence.periods[0].subdivisions.length, 3);
  assert.deepEqual(regrouped.result, before.result);
});

test('session creation and period placement publish once, retain rejection state and recover together through Undo', () => {
  const studio = createStudio(periodPlan()), before = studio.read();
  const work = { ...before.state.work[0], id: 'new-session', label: 'Prepare the receiver', occurrences: 1 };
  const command = { type: 'work.create', work, placements: [{ occurrenceIndex: 0, periodId: 'missing', subdivision: 1 }] };
  const rejected = studio.applyCommand(command, before);
  assert.equal(rejected.error.code, 'reference'); assert.strictEqual(studio.read(), before); assert.equal(studio.readHistory().undoCount, 0);
  command.placements[0].periodId = 'period-2';
  const preview = studio.previewCommand(command, before);
  assert.equal(preview.ok, true); assert.strictEqual(studio.read(), before);
  assert.equal(studio.applyCommand(command, before).ok, true);
  assert.equal(studio.read().state.revision, before.state.revision + 1);
  assert.equal(studio.read().score.cadence.periods[1].occurrences.at(-1).workId, 'new-session');
  assert.equal(studio.undo(studio.read()).ok, true); assert.equal(studio.exportText(), before.serialized);
  assert.equal(studio.redo(studio.read()).ok, true);
  const accepted = studio.read();
  assert.equal(studio.applyCommand({ type: 'work.remove', workId: 'new-session' }, accepted).ok, true);
  assert.ok(studio.read().state.scoreSettings.cadence.placements.every(row => row.workId !== 'new-session'));
  assert.equal(studio.undo(studio.read()).ok, true); assert.equal(studio.exportText(), accepted.serialized);
});

test('session edits replace only their own placements and direct count reduction clears trailing occurrences', () => {
  const interleaved = periodPlan(), rows = interleaved.scoreSettings.cadence.placements;
  interleaved.scoreSettings.cadence.placements = [rows[0], rows[2], rows[1]];
  const interleavedStudio = createStudio(interleaved);
  assert.equal(interleavedStudio.applyCommand({ type: 'work.update', work: { ...interleavedStudio.read().state.work[0], label: 'Review together' },
    placements: [rows[0], rows[1]].map(({ workId, ...placement }) => placement) }, interleavedStudio.read()).ok, true);
  assert.deepEqual(interleavedStudio.read().state.scoreSettings.cadence.placements.map(row => [row.workId, row.occurrenceIndex]),
    [['review', 0], ['followup', 0], ['review', 1]]);
  const studio = createStudio(periodPlan()), before = studio.read();
  const work = { ...before.state.work[0], occurrences: 1 };
  const command = { type: 'work.update', work, placements: [{ occurrenceIndex: 0, periodId: 'period-2', subdivision: 2 }] };
  assert.equal(studio.applyCommand(command, before).ok, true);
  assert.deepEqual(studio.read().score.cadence.occurrences.map(row => row.workId), ['review', 'followup']);
  assert.deepEqual(studio.read().state.scoreSettings.cadence.placements.filter(row => row.workId === 'followup'),
    [{ workId: 'followup', occurrenceIndex: 0, periodId: 'period-2', subdivision: 1 }]);
  assert.equal(studio.undo(studio.read()).ok, true);
  assert.equal(studio.updateWork('review', work, studio.read()).ok, true);
  assert.deepEqual(studio.read().state.scoreSettings.cadence.placements.map(row => [row.workId, row.occurrenceIndex]), [['review', 0], ['followup', 0]]);
  const reordered = structuredClone(studio.read().state);
  reordered.work.reverse();
  assert.deepEqual(preparePlan(reordered).score.cadence.occurrences.map(row => row.workId), ['review', 'followup']);
});

test('typed handoffs, decision anchors and delays admit meaningful references and identify deletion receivers', () => {
  const plan = periodPlan();
  plan.scoreSettings.cadence.delays = [{ id: 'receiving-delay', label: 'Await receiving review', anchor: { kind: 'handoff', id: 'review-handoff' },
    fromPeriodId: 'period-1', toPeriodId: 'period-2', reason: 'The receiving team reviews the evidence next sprint.', receiverPersonId: 'product-one' }];
  const studio = createStudio(plan), before = studio.read();
  const removal = studio.applyCommand({ type: 'work.remove', workId: 'followup' }, before);
  assert.equal(removal.error.code, 'dependencies');
  assert.equal(describeScoreReference(before.state.scoreSettings, removal.error.references.find(row => row.field.startsWith('cadence.'))).kind, 'handoff');
  for (const [code, mutate] of [
    ['reference', row => { row.scoreSettings.cadence.decisionAnchors[0].id = 'missing'; }],
    ['reference', row => { row.scoreSettings.cadence.delays[0].anchor.id = 'missing'; }],
    ['duplicate-reference', row => { row.scoreSettings.cadence.placements.push({ ...row.scoreSettings.cadence.placements[0] }); }],
    ['cadence-cycle', row => { row.scoreSettings.cadence.handoffs.push({ id: 'return', from: { kind: 'work', id: 'followup' }, to: { kind: 'work', id: 'review' }, connectionId: null }); }],
  ]) { const candidate = structuredClone(plan); mutate(candidate); assert.throws(() => preparePlan(candidate), { code }); }
  assert.strictEqual(studio.read(), before);
});

test('strict previous-version migration retains arrangement identities and current cadence round-trips through exchange', () => {
  const studio = createStudio();
  const request = { templateId: 'pod', version: '1.0.0', proposalId: 'working-pod',
    teams: [{ slotId: 'partner', kind: 'new', label: 'Receiving reviewers', personIds: ['product-one'] }, { slotId: 'pod', kind: 'existing', teamId: 'delivery', addPersonIds: [] }],
    connections: ['feedback', 'handoff'].map(slotId => ({ slotId, receiverPersonId: 'product-one', sharedObject: 'Review evidence', responseExpectation: 'Confirm receipt.', workIds: ['review'], status: 'active', recoveryWork: null })) };
  assert.equal(applyCoordinationTemplate(studio, prepareCoordinationTemplate(studio.read(), request)).ok, true);
  const old = structuredClone(studio.read().state); old.schemaVersion = '0.8.0'; old.scoreSettings.version = '1.0.0'; delete old.scoreSettings.cadence;
  const migrated = prepareImport(JSON.stringify(old));
  assert.equal(migrated.sourceSchemaVersion, '0.8.0'); assert.equal(migrated.projection.state.schemaVersion, '0.9.0');
  assert.deepEqual(migrated.projection.state.arrangements, old.arrangements); assert.deepEqual(migrated.projection.state.work, old.work);
  assert.equal(migrated.projection.state.scoreSettings.cadence, null);
  old.scoreSettings.cadence = createCadence(); assert.throws(() => preparePlan(old), { code: 'fields' });
  const current = createStudio(periodPlan()), before = current.read(), editing = createDraftCoordinator(current), exchange = createPlanExchange(current, editing);
  const proposal = structuredClone(before.state); proposal.scoreSettings.cadence.placements[0].subdivision = 2;
  const receipt = exchange.previewText(JSON.stringify(proposal));
  assert.equal(receipt.ok, true); assert.deepEqual(receipt.view.preview.changes.scoreSettings, ['cadence']);
  assert.equal(prepareImport(before.serialized).projection.serialized, before.serialized);
  assert.ok(describeScoreChanges(before.state, receipt.view.preview.projection.state).some(text => text.includes('Sprint 1 · week 2')));
  exchange.dispose(); editing.dispose();
});

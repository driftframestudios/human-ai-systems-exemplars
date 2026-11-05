import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createExamplePlan, preparePlan, prepareAssuranceSettings, prepareImport, parsePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createAssuranceSettings } from '../../collaboration/native-investment-studio/assurance-models.mjs';
import { createShowcasePlan } from '../../collaboration/native-investment-studio/presets.mjs';
import { LIMITS, SCHEMA_BYTE_LIMITS } from '../../collaboration/native-investment-studio/config.mjs';

function event(id = 'interruption') {
  return { id, label: 'A deliberate interruption', included: true, lifecycle: 'active', eventCount: 2,
    aggregateMinutesPerEvent: 180, receiverPersonId: null, reviewBoundary: null, workIds: [] };
}
function learning(id = 'next-observation') {
  return { id, promptId: 'source-framing', context: null, decisionOwnerPersonId: null, reviewBoundary: null, workIds: [] };
}
function rehearsal(id = 'recovery-attempt') {
  return { id, definitionId: 'recovery-failure', definitionVersion: '1.0.0',
    context: 'A synthetic pilot request', assumptions: 'The instructions retain a named reviewer.', response: 'Repeat the interruption after revising the instructions.',
    reviewerPersonId: null, observedPlanRevision: 0, observation: null, workIds: [], connectionIds: [], personIds: [] };
}

test('reference assumptions and concept choices preserve native money, explicit quantities and caller ownership', () => {
  const plan = createShowcasePlan(), before = preparePlan(plan), settings = plan.assuranceSettings;
  assert.equal(before.assurance.quality.estimate.status, 'unavailable');
  assert.equal(before.assurance.recovery.estimate.amountCents, 0);
  settings.context.referenceHorizon = { quantity: 1, unit: 'sprints' };
  settings.context.recoveryRatePersonIds = ['maya', 'ari'];
  settings.context.sourcePresetId = 'discovery-alignment'; settings.context.namedUnknowns = 6;
  settings.recoveryEvents = [event()]; settings.recoveryAdditionalShareBasisPoints = 5000;
  settings.quality.concepts[0].workIds = ['review']; settings.quality.concepts[1].included = false;
  settings.learningActions = [learning('second'), learning('first')];
  const current = preparePlan(plan);
  assert.deepEqual(current.result, before.result);
  assert.equal(current.result.plannedCommitmentCents, 398000);
  assert.ok(Math.abs(current.assurance.quality.estimate.hours - 15.84) < 1e-12);
  assert.equal(current.assurance.quality.estimate.amountCents, 308880);
  assert.equal(current.assurance.recovery.estimate.hours, 6);
  assert.equal(current.assurance.recovery.estimate.amountCents, 39000); // 6 aggregate hours × mean($120,$140) ×50%.
  assert.deepEqual(current.state.assuranceSettings.learningActions.map(row => row.id), ['second', 'first']);
  const owned = prepareAssuranceSettings(settings); owned.quality.concepts[0].workIds.length = 0;
  assert.deepEqual(settings.quality.concepts[0].workIds, ['review']);
  assert.equal(Object.isFrozen(settings), false);
  assert.equal(parsePlan(current.serialized).serialized, current.serialized);
});

test('finite assurance fields reject malformed versions, units, bounds and accessors before evaluation', () => {
  const cases = [
    [s => { s.version = '2.0.0'; }, 'assurance-version'],
    [s => { s.context.sourcePresetId = 'unknown'; }, 'assurance-preset'],
    [s => { s.context.referenceHorizon = { quantity: 1, unit: 'weeks' }; }, 'choice'],
    [s => { s.context.referenceHorizon = { quantity: 0, unit: 'hours' }; }, 'integer'],
    [s => { s.context.namedUnknowns = 21; }, 'integer'],
    [s => { s.quality.included = 1; }, 'boolean'],
    [s => { s.quality.concepts.pop(); }, 'quality-concepts'],
    [s => { s.quality.concepts[1] = s.quality.concepts[0]; }, 'duplicate-reference'],
    [s => { s.quality.concepts[0].conceptId = 'unknown'; }, 'quality-concept'],
    [s => { s.quality.concepts[0].workIds = ['review', 'review']; }, 'duplicate-reference'],
    [s => { s.quality.allocationPercent = 101; }, 'integer'],
    [s => { s.quality.independentRateCentsPerHour = -1; }, 'integer'],
    ...[1, 13, 2.5, '6'].map(value => [s => { s.quality.sigmaHalfSteps = value; }, 'integer']),
    [s => { s.quality.additionalShareBasisPoints = 10001; }, 'integer'],
    [s => { s.recoveryEvents = [{ ...event(), eventCount: 1001 }]; }, 'integer'],
    [s => { s.recoveryEvents = [{ ...event(), aggregateMinutesPerEvent: 60001 }]; }, 'integer'],
    [s => { s.recoveryEvents = [{ ...event(), lifecycle: 'paused' }]; }, 'choice'],
    [s => { s.learningActions = [{ ...learning(), promptId: 'unknown' }]; }, 'learning-prompt'],
    [s => { s.rehearsals = [{ ...rehearsal(), definitionVersion: '2.0.0' }]; }, 'rehearsal-definition'],
    [s => { s.rehearsals = [{ ...rehearsal(), observation: 'A restart worked.' }]; }, 'rehearsal-observation'],
    [s => { s.recoveryEvents = [event(), event()]; }, 'duplicate-id'],
    [s => { s.extra = true; }, 'fields'],
  ];
  for (const [mutate, code] of cases) {
    const settings = createAssuranceSettings(); mutate(settings);
    assert.throws(() => prepareAssuranceSettings(settings), { code });
  }
  let reads = 0;
  const accessor = createAssuranceSettings();
  Object.defineProperty(accessor.quality, 'sigmaHalfSteps', { enumerable: true, get() { reads += 1; return 6; } });
  assert.throws(() => prepareAssuranceSettings(accessor), { code: 'data-property' });
  const oversized = createAssuranceSettings(); oversized.recoveryEvents = Array(33).fill(null);
  Object.defineProperty(oversized.recoveryEvents, '0', { enumerable: true, get() { reads += 1; return event(); } });
  assert.throws(() => prepareAssuranceSettings(oversized), { code: 'collection' });
  const hostile = createAssuranceSettings(); hostile.context.sourcePresetId = { toString() { reads += 1; throw new Error('unused'); } };
  assert.throws(() => prepareAssuranceSettings(hostile), { code: 'assurance-preset' });
  assert.equal(reads, 0);
});

test('human observations retain their context and revision as current work changes', () => {
  const plan = createShowcasePlan(); plan.revision = 2;
  plan.assuranceSettings.rehearsals = [{ ...rehearsal(), reviewerPersonId: 'noor', observedPlanRevision: 1,
    observation: 'The reviewer recovered the selected request from its saved record.', workIds: ['rehearsal'], connectionIds: ['readiness'], personIds: ['noor', 'sam'] }];
  const before = preparePlan(plan);
  plan.work.find(row => row.id === 'rehearsal').status = 'paused';
  plan.assuranceSettings.quality.included = false;
  const after = preparePlan(plan);
  assert.deepEqual(after.state.assuranceSettings.rehearsals, before.state.assuranceSettings.rehearsals);
  assert.equal(after.result.knownCommitmentCents, before.result.knownCommitmentCents);
  for (const field of ['context', 'response', 'reviewerPersonId']) {
    const candidate = structuredClone(plan); candidate.assuranceSettings.rehearsals[0][field] = null;
    assert.throws(() => preparePlan(candidate), { code: 'rehearsal-observation' });
  }
  for (const [field, value, code] of [['observedPlanRevision', 3, 'observation-revision'], ['workIds', ['missing'], 'reference'],
    ['connectionIds', ['missing'], 'reference'], ['personIds', ['missing'], 'reference'], ['reviewerPersonId', 'missing', 'reference']]) {
    const candidate = structuredClone(plan); candidate.assuranceSettings.rehearsals[0][field] = value;
    assert.throws(() => preparePlan(candidate), { code });
  }
});

test('exact 0.5 plans retain Change maps, capabilities, roles and observations before assurance migration', () => {
  const old = createShowcasePlan(); old.schemaVersion = '0.5.0'; delete old.assuranceSettings; delete old.scoreSettings; delete old.arrangements; old.people = old.people.map(({ availability, ...row }) => row); old.work = old.work.map(row => ({ ...row, timing: null })); old.revision = 7;
  old.people[0].role.change = { frameworkId: 'weick', componentId: 'retention' };
  old.changeSettings.activeFramework = { frameworkId: 'npt', version: '1.0.0' };
  old.changeSettings.frameworkMaps.reverse(); old.changeSettings.frameworkMaps.forEach(row => row.components.reverse());
  old.changeSettings.frameworkMaps[0].components[0].workIds = ['review'];
  old.capabilityEvidence = [{ id: 'prior-observation', subject: { kind: 'practice', instanceId: 'shared-expectations' },
    stage: 'rehearsed', context: 'A synthetic pilot', observation: 'The reviewers agreed the recorded scope.',
    recorderPersonId: 'maya', reviewBoundary: 'Check an unfamiliar request.', observedPlanRevision: 6 }];
  const bytes = JSON.stringify(old), receipt = prepareImport(bytes), next = receipt.projection;
  assert.equal(receipt.sourceSchemaVersion, '0.5.0'); assert.equal(next.state.schemaVersion, '0.8.0');
  const { assuranceSettings, scoreSettings, arrangements, ...restored } = next.state;
  assert.deepEqual({ ...restored, people: restored.people.map(({ availability, ...row }) => row), schemaVersion: '0.5.0' }, old);
  assert.equal(scoreSettings.window, null); assert.ok(restored.people.every(row => row.availability === null));
  assert.deepEqual(assuranceSettings, createAssuranceSettings());
  assert.equal(next.result.plannedCommitmentCents, 398000);
  assert.equal(JSON.stringify(old), bytes); assert.equal(parsePlan(next.serialized).serialized, next.serialized);
  assert.equal(SCHEMA_BYTE_LIMITS['0.5.0'], 10737393);
  const exactTransport = bytes + ' '.repeat(SCHEMA_BYTE_LIMITS['0.5.0'] - Buffer.byteLength(bytes));
  assert.equal(prepareImport(exactTransport).projection.serialized, next.serialized);
  assert.throws(() => prepareImport(`${exactTransport} `), { code: 'bytes' });
  old.assuranceSettings = createAssuranceSettings(); assert.throws(() => preparePlan(old), { code: 'fields' });
});

test('assurance records and aggregate references have exact boundaries without changing archived admission', () => {
  for (const [name, limit, factory] of [['recoveryEvents', 32, event], ['learningActions', 32, learning], ['rehearsals', 64, rehearsal]]) {
    const plan = createExamplePlan(); plan.assuranceSettings[name] = Array.from({ length: limit }, (_, index) => factory(`record-${index}`));
    assert.equal(preparePlan(plan).state.assuranceSettings[name].length, limit);
    plan.assuranceSettings[name].push(factory('one-more'));
    assert.throws(() => preparePlan(plan), { code: 'collection' });
  }
  const plan = createExamplePlan(); plan.practices = [];
  plan.people = Array.from({ length: 128 }, (_, index) => ({ ...plan.people[0], id: `person-${index}`, rateCentsPerHour: 0 }));
  const ids = plan.people.map(row => row.id);
  plan.teams = Array.from({ length: 32 }, (_, index) => ({ id: `team-${index}`, label: 'Team', personIds: ids, lifecycle: 'active' }));
  plan.work = Array.from({ length: 96 }, (_, index) => ({ ...plan.work[0], id: `work-${index}`, teamId: 'team-0', personIds: index === 95 ? ids.slice(0, 32) : ids }));
  // 4096 memberships +12192 participants +96 work owners =16384 references.
  const old = { ...plan, schemaVersion: '0.5.0' }; delete old.assuranceSettings; delete old.scoreSettings; delete old.arrangements; old.people = old.people.map(({ availability, ...row }) => row); old.work = old.work.map(row => ({ ...row, timing: null }));
  assert.equal(preparePlan(old).state.schemaVersion, '0.8.0');
  plan.assuranceSettings.context.recoveryRatePersonIds = ['person-0'];
  assert.throws(() => preparePlan(plan), { code: 'reference-budget' });
  plan.work.at(-1).personIds.pop();
  const exact = preparePlan(plan); assert.equal(exact.result.knownCommitmentCents, 0);
  plan.assuranceSettings.quality.concepts[0].workIds = ['work-0'];
  assert.throws(() => preparePlan(plan), { code: 'reference-budget' });
  assert.equal(parsePlan(exact.serialized).serialized, exact.serialized);
  assert.equal(LIMITS.references, 16384);
});

test('maximum escaped assurance text remains independently owned and self-importable', () => {
  const plan = createShowcasePlan(), text = '\u0000'.repeat(600), id = prefix => prefix.padEnd(64, 'x');
  plan.assuranceSettings.recoveryEvents = Array.from({ length: 32 }, (_, index) => ({ ...event(id(`event-${index}`)), label: '\u0000'.repeat(120), reviewBoundary: text }));
  plan.assuranceSettings.learningActions = Array.from({ length: 32 }, (_, index) => ({ ...learning(id(`learning-${index}`)), context: text, reviewBoundary: text }));
  plan.assuranceSettings.rehearsals = Array.from({ length: 64 }, (_, index) => ({ ...rehearsal(id(`rehearsal-${index}`)), context: text,
    assumptions: text, response: text, observation: text, reviewerPersonId: 'noor', personIds: ['noor', 'sam'], workIds: ['rehearsal'], connectionIds: ['readiness'] }));
  const current = preparePlan(plan);
  assert.equal(current.state.assuranceSettings.rehearsals.at(-1).observation, text);
  assert.ok(Buffer.byteLength(current.serialized) <= SCHEMA_BYTE_LIMITS['0.8.0']);
  assert.equal(parsePlan(current.serialized).serialized, current.serialized);
  assert.equal(Object.isFrozen(plan.assuranceSettings.rehearsals[0]), false);
});

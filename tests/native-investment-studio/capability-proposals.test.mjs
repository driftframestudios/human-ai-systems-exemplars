import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan, parsePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { getCapabilityDefinition } from '../../collaboration/native-investment-studio/capabilities.mjs';
import { prepareCapabilityProposal, applyCapabilityProposal } from '../../collaboration/native-investment-studio/capability-proposals.mjs';
import { LIMITS } from '../../collaboration/native-investment-studio/config.mjs';

function funded() {
  const plan = createExamplePlan();
  plan.people = [{ ...plan.people[0], fundedMinutes: 9600, rateCentsPerHour: 10000 }];
  plan.teams = [{ ...plan.teams[0], personIds: ['product-one'] }];
  plan.work = [{ ...plan.work[0], personIds: ['product-one'], minutesPerOccurrence: 240, occurrences: 1, funding: 'allocated' }];
  plan.practices = []; plan.abilities = []; plan.capabilityEvidence = [];
  plan.contributions = []; plan.connections = [];
  return plan;
}
function instance(id = 'history', definitionId = 'inspect-history', kind = 'ability', overrides = {}) {
  const definition = getCapabilityDefinition(kind, definitionId, '1.0.0');
  return { id, definitionId, definitionVersion: '1.0.0', context: 'A service-request pilot',
    teamId: 'delivery', responsiblePersonIds: ['product-one'], decisionOwnerPersonId: 'product-one', lifecycle: 'active',
    prerequisites: [], supportBindings: definition.supportRequirements.map(row => ({ requirementId: row.id, workIds: ['review'] })), ...overrides };
}
function review(id = 'extra-review') {
  return { id, label: 'Additional review', teamId: 'delivery', personIds: ['product-one'],
    minutesPerOccurrence: 90, occurrences: 1, funding: 'additional', status: 'planned', timing: null, lifecycle: 'active' };
}
function evidence(instanceId = 'history', overrides = {}) {
  return { id: 'observation-one', subject: { kind: 'ability', instanceId }, stage: 'proposed',
    context: 'The service-request pilot plan', observation: 'The proposed review has a named participant and recovery route.',
    recorderPersonId: 'product-one', reviewBoundary: 'A rehearsal will establish whether a person can recover the task.',
    observedPlanRevision: 0, ...overrides };
}
const request = (row = instance(), overrides = {}) => ({ mode: 'create', kind: 'ability', instance: row, newWork: [], evidence: [], ...overrides });
function apply(studio, raw) {
  const proposal = prepareCapabilityProposal(studio.read(), raw), result = applyCapabilityProposal(studio, proposal);
  assert.equal(result.ok, true, result.error?.message); return { proposal, projection: result.projection };
}
function unchanged(studio, operation, code) {
  const before = studio.read(), acceptance = studio.readAcceptance(), history = studio.readHistory();
  assert.throws(operation, { code });
  assert.strictEqual(studio.read(), before); assert.strictEqual(studio.readAcceptance(), acceptance);
  assert.deepEqual(studio.readHistory(), history); assert.equal(studio.exportText(), before.serialized);
}
function command(studio, value) {
  const result = studio.applyCommand(value, studio.read()); assert.equal(result.ok, true, result.error?.message); return result.projection;
}

test('installation aligns owned instance, explicit work, evidence and exact money in one recoverable acceptance', () => {
  const studio = createStudio(funded()), before = studio.read();
  const raw = request(instance('history', 'inspect-history', 'ability', {
    supportBindings: [{ requirementId: 'preparation', workIds: ['review'] }, { requirementId: 'review', workIds: ['extra-review'] }],
  }), { newWork: [review()], evidence: [evidence()] });
  const proposal = prepareCapabilityProposal(before, raw);
  assert.strictEqual(studio.read(), before); assert.equal(studio.readHistory().undoCount, 0);
  assert.deepEqual(proposal.summary.money, { beforeKnownCents: 1600000, afterKnownCents: 1615000, knownDeltaCents: 15000,
    beforeTotalCents: 1600000, afterTotalCents: 1615000, totalDeltaCents: 15000 });
  assert.equal(proposal.projection.result.allocatedKnownCents, 40000);
  assert.deepEqual(proposal.summary.newWorkIds, ['extra-review']);
  assert.deepEqual(proposal.summary.newEvidenceIds, ['observation-one']);
  raw.instance.supportBindings[0].workIds.length = 0; raw.newWork[0].personIds.length = 0; raw.evidence[0].subject.instanceId = 'changed';
  const result = applyCapabilityProposal(studio, proposal);
  assert.equal(result.ok, true); assert.equal(result.projection.state.revision, 1);
  assert.equal(studio.readHistory().undoCount, 1); assert.equal(studio.readAcceptance().sequence, 1);
  assert.deepEqual(result.projection.state.abilities[0].supportBindings[0].workIds, ['review']);
  assert.equal(result.projection.state.capabilityEvidence[0].subject.instanceId, 'history');
  assert.equal(parsePlan(studio.exportText()).serialized, studio.exportText());
  assert.equal(studio.undo(studio.read()).ok, true); assert.deepEqual(studio.read().state, before.state);
  assert.deepEqual(studio.read().capabilities, before.capabilities);
  assert.equal(studio.redo(studio.read()).ok, true); assert.deepEqual(studio.read().capabilities, result.projection.capabilities);
  assert.equal(studio.read().result.plannedCommitmentCents, 1615000);
});

test('a prerequisite diamond shares one work and capacity account across its ability and practice cards', () => {
  const studio = createStudio(funded());
  const support = instance('assurance', 'assurance', 'practice');
  support.supportBindings[1].workIds.push('extra-review');
  apply(studio, request(support, { kind: 'practice', newWork: [review()] }));
  apply(studio, request(instance('trace', 'trace-evidence', 'ability', { prerequisites: [{ kind: 'practice', instanceId: 'assurance' }] })));
  apply(studio, request(instance('compare', 'compare-alternatives', 'ability', { prerequisites: [{ kind: 'ability', instanceId: 'trace' }] })));
  const last = apply(studio, request(instance('approval', 'approve-change', 'ability', {
    prerequisites: [{ kind: 'ability', instanceId: 'compare' }, { kind: 'ability', instanceId: 'trace' }],
  })));
  assert.equal(last.projection.result.plannedCommitmentCents, 1615000);
  assert.equal(last.projection.result.allocatedKnownCents, 40000);
  assert.deepEqual(last.projection.result.ledger.map(row => row.workId), ['review', 'extra-review']);
  assert.deepEqual(last.projection.result.capacity.map(row => [row.personId, row.allocatedMinutes, row.additionalMinutes]), [['product-one', 240, 90]]);
  assert.equal(last.proposal.summary.money.knownDeltaCents, 0);
});

test('same-meaning installation replay retains accepted identity and history while changed identities require correction', () => {
  const studio = createStudio(funded()), raw = request(instance(), { newWork: [review()], evidence: [evidence()] });
  raw.instance.supportBindings[1].workIds.push('extra-review');
  apply(studio, raw);
  const accepted = studio.read(), marker = studio.readAcceptance(), history = studio.readHistory();
  const replay = apply(studio, raw);
  assert.strictEqual(replay.proposal.projection, accepted); assert.strictEqual(studio.read(), accepted);
  assert.strictEqual(studio.readAcceptance(), marker); assert.deepEqual(studio.readHistory(), history);
  for (const changed of [
    { ...raw, instance: { ...raw.instance, context: 'Changed meaning' } },
    { ...raw, newWork: [{ ...raw.newWork[0], minutesPerOccurrence: 100 }] },
    { ...raw, evidence: [{ ...raw.evidence[0], observation: 'Changed observation' }] },
  ]) unchanged(studio, () => prepareCapabilityProposal(studio.read(), changed), 'identity-collision');
});

test('a proposal is bound to the exact accepted projection including an Undo-restored equivalent plan', () => {
  const studio = createStudio(funded()), before = studio.read();
  const proposal = prepareCapabilityProposal(before, request());
  command(studio, { type: 'work.status.set', workId: 'review', status: 'paused' });
  let result = applyCapabilityProposal(studio, proposal);
  assert.equal(result.ok, false); assert.equal(result.error.code, 'stale-edit');
  studio.undo(studio.read()); assert.deepEqual(studio.read().state, before.state);
  result = applyCapabilityProposal(studio, proposal);
  assert.equal(result.ok, false); assert.equal(result.error.code, 'stale-edit');
  assert.equal(studio.read().state.abilities.length, 0);
  assert.equal(applyCapabilityProposal(studio, { ...proposal }).error.code, 'capability-proposal');
});

test('updating support and recording an observation publishes together while old People and Session edits preserve the instance', () => {
  const studio = createStudio(funded()); apply(studio, request());
  const before = studio.read(), raw = request({ ...before.state.abilities[0], context: 'Review the interruption rehearsal',
    supportBindings: [{ requirementId: 'preparation', workIds: ['review'] }, { requirementId: 'review', workIds: ['extra-review'] }] },
  { mode: 'update', newWork: [review()], evidence: [evidence('history', { stage: 'rehearsed', observedPlanRevision: before.state.revision })] });
  apply(studio, raw);
  assert.equal(studio.read().state.revision, before.state.revision + 1); assert.equal(studio.readHistory().undoCount, 2);
  const capability = studio.read().state.abilities[0], observation = studio.read().state.capabilityEvidence[0];
  const person = studio.read().state.people[0];
  assert.equal(studio.updatePerson(person.id, { id: person.id, label: 'Reviewer', fundedMinutes: 9600, rateCentsPerHour: 10000 }, studio.read()).ok, true);
  const work = studio.read().state.work[0], { lifecycle, ...legacyWork } = work;
  assert.equal(studio.updateWork(work.id, { ...legacyWork, label: 'Review support' }, studio.read()).ok, true);
  assert.deepEqual(studio.read().state.abilities[0], capability); assert.deepEqual(studio.read().state.capabilityEvidence[0], observation);
  assert.equal(studio.read().result.plannedCommitmentCents, 1615000);
});

test('retirement preserves separately owned funding and evidence; removal exposes typed dependants until reassigned', () => {
  const studio = createStudio(funded());
  apply(studio, request());
  apply(studio, request(instance('recover', 'recover-interrupted-work', 'ability', { prerequisites: [{ kind: 'ability', instanceId: 'history' }] })));
  command(studio, { type: 'capability.evidence.record', evidence: evidence() });
  const before = studio.read();
  unchanged(studio, () => prepareCapabilityProposal(before, { mode: 'remove', kind: 'ability', instanceId: 'history' }), 'dependencies');
  const rejected = studio.applyCommand({ type: 'capability.remove', kind: 'ability', instanceId: 'history' }, before);
  assert.deepEqual(rejected.error.references, [
    { collection: 'abilities', id: 'recover', field: 'prerequisites' },
    { collection: 'capabilityEvidence', id: 'observation-one', field: 'subject' },
  ]);
  command(studio, { type: 'capability.lifecycle.set', kind: 'ability', instanceId: 'history', lifecycle: 'retired' });
  assert.equal(studio.read().state.capabilityEvidence[0].observation, evidence().observation);
  assert.deepEqual(studio.read().result, before.result);
  command(studio, { type: 'capability.evidence.remove', evidenceId: 'observation-one' });
  command(studio, { type: 'capability.update', kind: 'ability', instanceId: 'recover', instance: { ...studio.read().state.abilities[1], prerequisites: [] } });
  apply(studio, { mode: 'remove', kind: 'ability', instanceId: 'history' });
  assert.deepEqual(studio.read().state.work, before.state.work); assert.equal(studio.read().result.plannedCommitmentCents, 1600000);
});

test('people, team and work removal include every new capability and observation dependency', () => {
  const studio = createStudio(funded()); apply(studio, request());
  command(studio, { type: 'capability.evidence.record', evidence: evidence() });
  const expected = [
    [{ type: 'person.remove', personId: 'product-one' }, [
      { collection: 'abilities', id: 'history', field: 'responsiblePersonIds' },
      { collection: 'abilities', id: 'history', field: 'decisionOwnerPersonId' },
      { collection: 'capabilityEvidence', id: 'observation-one', field: 'recorderPersonId' },
    ]],
    [{ type: 'team.remove', teamId: 'delivery' }, [{ collection: 'abilities', id: 'history', field: 'teamId' }]],
    [{ type: 'work.remove', workId: 'review' }, [
      { collection: 'abilities', id: 'history', field: 'supportBindings[0].workIds' },
      { collection: 'abilities', id: 'history', field: 'supportBindings[1].workIds' },
    ]],
  ];
  for (const [input, references] of expected) {
    const before = studio.read(), history = studio.readHistory(), result = studio.applyCommand(input, before);
    assert.equal(result.error.code, 'dependencies');
    for (const reference of references) assert.ok(result.error.references.some(row => JSON.stringify(row) === JSON.stringify(reference)));
    assert.strictEqual(studio.read(), before); assert.deepEqual(studio.readHistory(), history);
  }
});

test('finite updates, evidence replay and unsupported references retain their exact accepted boundaries', () => {
  const studio = createStudio(funded()); apply(studio, request());
  const row = studio.read().state.abilities[0], before = studio.read();
  const mismatch = studio.applyCommand({ type: 'capability.update', kind: 'ability', instanceId: 'history', instance: { ...row, id: 'other' } }, before);
  assert.equal(mismatch.error.code, 'target'); assert.strictEqual(studio.read(), before);
  const observed = evidence(); command(studio, { type: 'capability.evidence.record', evidence: observed });
  const accepted = studio.read(), marker = studio.readAcceptance();
  command(studio, { type: 'capability.evidence.record', evidence: observed });
  assert.strictEqual(studio.read(), accepted); assert.strictEqual(studio.readAcceptance(), marker);
  const conflict = studio.applyCommand({ type: 'capability.evidence.record', evidence: { ...observed, context: 'Another context' } }, accepted);
  assert.equal(conflict.error.code, 'identity-collision'); assert.strictEqual(studio.read(), accepted);
  const changedSubject = { ...row, definitionId: 'trace-evidence' };
  unchanged(studio, () => prepareCapabilityProposal(accepted, request(changedSubject, { mode: 'update' })), 'capability-definition-change');
  const definitionChange = studio.applyCommand({ type: 'capability.update', kind: 'ability', instanceId: row.id, instance: changedSubject }, accepted);
  assert.equal(definitionChange.error.code, 'capability-definition-change'); assert.strictEqual(studio.read(), accepted);
  assert.deepEqual(studio.read().state.capabilityEvidence, accepted.state.capabilityEvidence);
  const invalid = request({ ...row, supportBindings: [{ requirementId: 'review', workIds: ['missing'] }] }, { mode: 'update' });
  unchanged(studio, () => prepareCapabilityProposal(accepted, invalid), 'reference');
});

test('closed request admission rejects accessors, repeated work and over-limit arrays before visiting their entries', () => {
  const studio = createStudio(funded()); let reads = 0;
  const accessor = request(); Object.defineProperty(accessor, 'instance', { enumerable: true, get() { reads += 1; return instance(); } });
  unchanged(studio, () => prepareCapabilityProposal(studio.read(), accessor), 'data-property'); assert.equal(reads, 0);
  unchanged(studio, () => prepareCapabilityProposal(studio.read(), request(instance(), { newWork: [review(), review()] })), 'duplicate-id');
  const oversized = Array(LIMITS.work + 1).fill(null);
  Object.defineProperty(oversized, '0', { enumerable: true, get() { reads += 1; return review(); } });
  unchanged(studio, () => prepareCapabilityProposal(studio.read(), request(instance(), { newWork: oversized })), 'collection'); assert.equal(reads, 0);
  unchanged(studio, () => prepareCapabilityProposal(studio.read(), { ...request(), hidden: true }), 'fields');
  unchanged(studio, () => prepareCapabilityProposal(studio.read(), request(instance(), { mode: 'update' })), 'reference');
});

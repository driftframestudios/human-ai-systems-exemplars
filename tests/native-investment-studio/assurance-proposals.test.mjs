import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createShowcasePlan } from '../../collaboration/native-investment-studio/presets.mjs';
import { parsePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { prepareAssuranceProposal, applyAssuranceProposal } from '../../collaboration/native-investment-studio/assurance-proposals.mjs';
import { LIMITS } from '../../collaboration/native-investment-studio/config.mjs';

function session(overrides = {}) {
  return { id: 'recovery-check', label: 'Check the recovery instructions', teamId: 'operations', personIds: ['noor', 'sam'],
    minutesPerOccurrence: 30, occurrences: 1, funding: 'additional', status: 'planned', timing: null, lifecycle: 'active', ...overrides };
}
function request(base) {
  return { assuranceSettings: structuredClone(base.state.assuranceSettings), newWork: [], workUpdates: [], connectionUpdates: [] };
}
function recoveryRequest(base) {
  const raw = request(base); raw.newWork = [session()];
  raw.assuranceSettings.context.recoveryRatePersonIds = ['noor', 'sam'];
  raw.assuranceSettings.quality.concepts.find(row => row.conceptId === 'reconciliation-replay').workIds = ['recovery-check'];
  raw.assuranceSettings.recoveryEvents = [{ id: 'request-interrupted', label: 'An interrupted request', included: true, lifecycle: 'active',
    eventCount: 1, aggregateMinutesPerEvent: 60, receiverPersonId: 'noor', reviewBoundary: 'Repeat the saved-state recovery with an unfamiliar request.', workIds: ['recovery-check'] }];
  raw.assuranceSettings.rehearsals = [{ id: 'pilot-recovery', definitionId: 'recovery-failure', definitionVersion: '1.0.0',
    context: 'The service-request pilot recovery instructions', assumptions: 'The review uses fictional people and illustrative rates.',
    response: 'Pause the readiness connection and inspect the recovery instructions together.', reviewerPersonId: 'noor',
    observedPlanRevision: base.state.revision, observation: null, workIds: ['recovery-check'], connectionIds: ['readiness'], personIds: ['noor', 'sam'] }];
  raw.connectionUpdates = [{ ...base.state.connections.find(row => row.id === 'readiness'), status: 'paused' }];
  return raw;
}
function apply(studio, raw) {
  const proposal = prepareAssuranceProposal(studio.read(), raw), result = applyAssuranceProposal(studio, proposal);
  assert.equal(result.ok, true, result.error?.message); return { proposal, projection: result.projection };
}

test('the pilot recovery response adds two people for thirty minutes and exactly $100 in one recoverable acceptance', () => {
  const studio = createStudio(createShowcasePlan()), before = studio.read();
  studio.setBaseline(before);
  const raw = recoveryRequest(before), proposal = prepareAssuranceProposal(before, raw);
  assert.strictEqual(studio.read(), before); assert.equal(studio.readHistory().undoCount, 0);
  assert.deepEqual(proposal.summary.money, { beforeKnownCents: 398000, afterKnownCents: 408000, knownDeltaCents: 10000,
    beforeTotalCents: 398000, afterTotalCents: 408000, totalDeltaCents: 10000 });
  assert.deepEqual(proposal.summary.newWorkIds, ['recovery-check']);
  assert.deepEqual(proposal.summary.updatedConnectionIds, ['readiness']);
  assert.deepEqual(proposal.summary.work, [{ workId: 'recovery-check', before: null,
    after: { minutesPerOccurrence: 30, occurrences: 1, participantCount: 2, personMinutes: 60, funding: 'additional', status: 'planned', lifecycle: 'active' } }]);
  assert.equal(proposal.projection.state.assuranceSettings.recoveryEvents[0].aggregateMinutesPerEvent, 60);
  assert.equal(proposal.projection.assurance.recovery.estimate.hours, 1);
  raw.newWork[0].personIds.length = 0; raw.assuranceSettings.rehearsals[0].response = 'Changed after preparation';
  assert.equal(applyAssuranceProposal(studio, proposal).ok, true);
  const accepted = studio.read();
  assert.equal(accepted.state.revision, 1); assert.equal(studio.readHistory().undoCount, 1);
  assert.equal(studio.readAcceptance().sequence, 1);
  assert.equal(accepted.state.connections.find(row => row.id === 'readiness').status, 'paused');
  assert.deepEqual(accepted.state.work.at(-1).personIds, ['noor', 'sam']);
  assert.deepEqual(accepted.state.changeSettings, before.state.changeSettings);
  assert.deepEqual(accepted.state.practices, before.state.practices);
  assert.deepEqual(accepted.state.people, before.state.people);
  assert.equal(accepted.state.assuranceSettings.rehearsals[0].observation, null);
  assert.equal(parsePlan(studio.exportText()).serialized, studio.exportText());
  assert.equal(studio.undo(accepted).ok, true); assert.deepEqual(studio.read().state, before.state);
  assert.deepEqual(studio.read().assurance, before.assurance);
  assert.equal(studio.redo(studio.read()).ok, true); assert.deepEqual(studio.read().assurance, accepted.assurance);
  assert.equal(studio.restoreBaseline(studio.read()).ok, true); assert.deepEqual(studio.read().assurance, before.assurance);
  assert.equal(studio.read().result.plannedCommitmentCents, 398000);
});

test('shared support and repeated proposals retain one session account while mixed funding changes remain explicit', () => {
  const studio = createStudio(createShowcasePlan()), before = studio.read();
  const raw = recoveryRequest(before);
  raw.workUpdates = [{ ...before.state.work.find(row => row.id === 'rehearsal'), funding: 'allocated' }];
  const first = apply(studio, raw);
  assert.equal(first.projection.result.knownCommitmentCents, 368000); // $3980 -$400 reused inside funding +$100 new work.
  assert.equal(first.projection.result.allocatedKnownCents, 188000);
  assert.deepEqual(first.proposal.summary.updatedWorkIds, ['rehearsal']);
  assert.equal(first.proposal.summary.work.find(row => row.workId === 'rehearsal').after.personMinutes, 240);
  const repeat = request(studio.read()); repeat.newWork = [session()]; repeat.workUpdates = [structuredClone(studio.read().state.work.find(row => row.id === 'rehearsal'))];
  const again = apply(studio, repeat);
  assert.strictEqual(again.projection, first.projection);
  assert.deepEqual(again.proposal.summary.reusedWorkIds, ['recovery-check']);
  assert.equal(again.proposal.summary.money.knownDeltaCents, 0); assert.equal(studio.readHistory().undoCount, 1);
  const shared = request(studio.read()); shared.assuranceSettings.quality.concepts[0].workIds = ['recovery-check'];
  const linked = apply(studio, shared);
  assert.equal(linked.proposal.summary.money.knownDeltaCents, 0);
  assert.equal(linked.projection.state.work.filter(row => row.id === 'recovery-check').length, 1);
  const paused = request(studio.read()); paused.workUpdates = [{ ...studio.read().state.work.find(row => row.id === 'recovery-check'), status: 'paused' }];
  const held = apply(studio, paused);
  assert.equal(held.proposal.summary.money.knownDeltaCents, 0);
  assert.equal(held.proposal.summary.work[0].after.personMinutes, 60);
  assert.equal(held.projection.result.obligations.some(row => row.code === 'paused-work' && row.workId === 'recovery-check'), true);
});

test('zero events, zero work and unknown participant rates retain distinct effort and monetary meanings', () => {
  const plan = createShowcasePlan(); plan.people.find(row => row.id === 'noor').rateCentsPerHour = null;
  const studio = createStudio(plan), raw = recoveryRequest(studio.read());
  raw.assuranceSettings.recoveryEvents[0].eventCount = 0;
  const proposed = prepareAssuranceProposal(studio.read(), raw);
  assert.equal(proposed.projection.assurance.recovery.estimate.hours, 0);
  assert.equal(proposed.projection.assurance.recovery.estimate.amountCents, 0);
  assert.equal(proposed.summary.work[0].after.personMinutes, 60);
  assert.equal(proposed.summary.money.knownDeltaCents, 4500); // Sam's explicit half-hour is known; Noor's rate remains open.
  assert.equal(proposed.summary.money.totalDeltaCents, null);
  raw.newWork[0].occurrences = 0;
  const zero = prepareAssuranceProposal(studio.read(), raw);
  assert.equal(zero.summary.work[0].after.personMinutes, 0);
  assert.equal(zero.summary.money.knownDeltaCents, 0);
  assert.equal(zero.summary.money.totalDeltaCents, null); // Existing funded and planned time still has an unknown rate.
});

test('assurance reference guards name dependent records and settings commands preserve complete no-op identity', () => {
  const studio = createStudio(createShowcasePlan()); apply(studio, recoveryRequest(studio.read()));
  const before = studio.read(), marker = studio.readAcceptance();
  assert.equal(studio.applyCommand({ type: 'assurance.settings.replace', assuranceSettings: before.state.assuranceSettings }, before).ok, true);
  assert.strictEqual(studio.read(), before); assert.strictEqual(studio.readAcceptance(), marker);
  const changedSubject = request(before); changedSubject.assuranceSettings.rehearsals[0].definitionId = 'specialist-unavailable';
  assert.throws(() => prepareAssuranceProposal(before, changedSubject), { code: 'rehearsal-definition-change' });
  const changedCommand = studio.applyCommand({ type: 'assurance.settings.replace', assuranceSettings: changedSubject.assuranceSettings }, before);
  assert.equal(changedCommand.error.code, 'rehearsal-definition-change');
  assert.strictEqual(studio.read(), before); assert.strictEqual(studio.readAcceptance(), marker);
  const removedWork = studio.applyCommand({ type: 'work.remove', workId: 'recovery-check' }, before);
  assert.equal(removedWork.error.code, 'dependencies');
  assert.deepEqual(removedWork.error.references.map(row => row.field), ['quality.concepts[7].workIds', 'recoveryEvents[0].workIds', 'rehearsals[0].workIds']);
  const removedConnection = studio.applyCommand({ type: 'connection.remove', connectionId: 'readiness' }, before);
  assert.deepEqual(removedConnection.error.references, [{ collection: 'assuranceSettings', id: 'pilot-recovery', field: 'rehearsals[0].connectionIds' }]);
  const removedPerson = studio.applyCommand({ type: 'person.remove', personId: 'noor' }, before);
  assert.ok(removedPerson.error.references.some(row => row.collection === 'assuranceSettings' && row.field === 'context.recoveryRatePersonIds'));
  assert.ok(removedPerson.error.references.some(row => row.collection === 'assuranceSettings' && row.field === 'rehearsals[0].reviewerPersonId'));
  assert.ok(removedPerson.error.references.some(row => row.collection === 'assuranceSettings' && row.field === 'rehearsals[0].personIds'));
  const settings = structuredClone(before.state.assuranceSettings); settings.rehearsals[0].connectionIds = [];
  assert.equal(studio.applyCommand({ type: 'assurance.settings.replace', assuranceSettings: settings }, before).ok, true);
  assert.equal(studio.applyCommand({ type: 'connection.remove', connectionId: 'readiness' }, studio.read()).ok, true);
  assert.equal(studio.read().state.work.at(-1).id, 'recovery-check');
  assert.equal(studio.read().result.knownCommitmentCents, 408000);
  const full = createShowcasePlan(); full.revision = LIMITS.revision;
  const atLimit = createStudio(full), current = atLimit.read();
  assert.strictEqual(apply(atLimit, request(current)).projection, current);
  assert.equal(atLimit.applyCommand({ type: 'assurance.settings.replace', assuranceSettings: current.state.assuranceSettings }, current).ok, true);
  assert.strictEqual(atLimit.read(), current);
});

test('closed proposal admission rejects conflicting identities and malformed batches without publishing partial work', () => {
  const studio = createStudio(createShowcasePlan()), before = studio.read(); let reads = 0;
  const cases = [
    [raw => { raw.extra = true; }, 'fields'],
    [raw => { raw.newWork = [session(), session()]; }, 'duplicate-id'],
    [raw => { raw.workUpdates = [session()]; }, 'proposal-work-overlap'],
    [raw => { raw.newWork = []; raw.workUpdates = [session()]; }, 'reference'],
    [raw => { raw.newWork[0].personIds = ['missing']; }, 'reference'],
    [raw => { delete raw.newWork[0].lifecycle; }, 'fields'],
    [raw => { raw.newWork[0].minutesPerOccurrence = 1441; }, 'integer'],
    [raw => { raw.newWork = [{ ...before.state.work[0], minutesPerOccurrence: 31 }]; }, 'identity-collision'],
    [raw => { raw.connectionUpdates[0].id = 'missing'; }, 'reference'],
    [raw => { Object.defineProperty(raw, 'assuranceSettings', { enumerable: true, get() { reads += 1; return {}; } }); }, 'data-property'],
    [raw => { raw.newWork = Array(LIMITS.work + 1).fill(null); Object.defineProperty(raw.newWork, '0', { enumerable: true, get() { reads += 1; return session(); } }); }, 'collection'],
  ];
  for (const [mutate, code] of cases) {
    const raw = recoveryRequest(before); mutate(raw);
    assert.throws(() => prepareAssuranceProposal(before, raw), { code });
    assert.strictEqual(studio.read(), before); assert.equal(studio.exportText(), before.serialized);
    assert.equal(studio.readHistory().undoCount, 0);
  }
  assert.equal(reads, 0);
});

test('stale and descriptor-triggered rehearsal preparation keeps the newer accepted review and its history', () => {
  const studio = createStudio(createShowcasePlan()), before = studio.read(), raw = recoveryRequest(before);
  const proposal = prepareAssuranceProposal(before, raw);
  assert.equal(applyAssuranceProposal(createStudio(createShowcasePlan()), proposal).error.code, 'stale-edit');
  assert.equal(applyAssuranceProposal(studio, { ...proposal }).error.code, 'assurance-proposal');
  let nested = false;
  raw.assuranceSettings = new Proxy(raw.assuranceSettings, { ownKeys(target) {
    if (!nested) {
      nested = true; const current = studio.read();
      assert.equal(studio.updateWork('review', { ...current.state.work[0], minutesPerOccurrence: 45 }, current).ok, true);
    }
    return Reflect.ownKeys(target);
  } });
  const interrupted = prepareAssuranceProposal(before, raw), newer = studio.read(), marker = studio.readAcceptance();
  assert.equal(applyAssuranceProposal(studio, interrupted).error.code, 'stale-edit');
  assert.equal(applyAssuranceProposal(studio, proposal).error.code, 'stale-edit');
  assert.strictEqual(studio.read(), newer); assert.strictEqual(studio.readAcceptance(), marker);
  assert.equal(studio.read().result.knownCommitmentCents, 435000);
  assert.equal(studio.read().state.work.length, 4); assert.equal(studio.readHistory().undoCount, 1);
});

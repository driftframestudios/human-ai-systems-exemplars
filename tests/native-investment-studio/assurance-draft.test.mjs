import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createShowcasePlan } from '../../collaboration/native-investment-studio/presets.mjs';
import { createDraftCoordinator } from '../../collaboration/native-investment-studio/editing.mjs';
import { createAssuranceDraftAdapter } from '../../collaboration/native-investment-studio/assurance-draft.mjs';
import { describeAssuranceReference } from '../../collaboration/native-investment-studio/assurance-models.mjs';
import { LIMITS } from '../../collaboration/native-investment-studio/config.mjs';
const set = (editor, token, key, value) => { const result = editor[Array.isArray(value) ? 'setIds' : 'setText'](token, key, value); assert.equal(result.ok, true, result.error?.message); };
function event(editor, token, id = 'recovery-one') {
  set(editor, token, 'eventIds', [id]);
  for (const [key, value] of Object.entries({ label: 'Recover the interrupted request', included: 'yes', lifecycle: 'active', eventCount: '1', aggregateMinutesPerEvent: '60', receiverPersonId: 'sam', reviewBoundary: 'Quality checks the repeat observation.', workIds: [] })) set(editor, token, `event.${id}.${key}`, value);
}
function session(editor, token) {
  for (const [key, value] of Object.entries({ target: 'event/recovery-one', label: 'Repeat the interrupted request', teamId: 'operations', personIds: ['noor', 'sam'], hoursPerSession: '0', minutesPerSession: '30', occurrences: '1', funding: 'additional', mode: 'new' })) set(editor, token, `proposal.${key}`, value);
}

test('a Quality and Operations recovery previews 30 minutes each and $100 additional, then accepts and undoes the whole proposal', () => {
  const studio = createStudio(createShowcasePlan()), before = studio.read(), editor = createDraftCoordinator(studio).assurance;
  const token = editor.begin('assurance', before).view.draft.token; event(editor, token); assert.deepEqual(editor.read().draft.raw['event.recovery-one.workIds'], []); session(editor, token);
  const proposal = editor.preview(token); assert.equal(proposal.ok, true, proposal.error?.message);
  assert.equal(proposal.projection.result.knownCommitmentCents, 408000); assert.strictEqual(studio.read(), before);
  assert.equal(proposal.summary.work[0].after.personMinutes, 60); assert.equal(proposal.summary.work[0].after.minutesPerOccurrence, 30);
  assert.equal(proposal.summary.money.knownDeltaCents, 10000); assert.strictEqual(editor.preview(token).projection, proposal.projection);
  assert.equal(editor.apply(token).ok, true); assert.equal(studio.readHistory().undoCount, 1);
  assert.deepEqual(studio.read().state.assuranceSettings.recoveryEvents[0].workIds, ['assurance-work-1']);
  assert.equal(studio.undo(studio.read()).ok, true); assert.equal(studio.read().serialized, before.serialized);
});

test('untouched imported ordering preserves exact bytes, acceptance and history including the revision ceiling', () => {
  for (const revision of [0, LIMITS.revision]) {
    const plan = createShowcasePlan(); plan.revision = revision;
    plan.assuranceSettings.quality.concepts.reverse();
    plan.assuranceSettings.recoveryEvents = ['recovery-z', 'recovery-a'].map(id => ({ id, label: id, included: true, lifecycle: 'active', eventCount: 2, aggregateMinutesPerEvent: 30, receiverPersonId: 'sam', reviewBoundary: null, workIds: ['rehearsal', 'review'] }));
    plan.assuranceSettings.context.recoveryRatePersonIds = ['sam', 'noor'];
    plan.assuranceSettings.learningActions = ['learning-z', 'learning-a'].map(id => ({ id, promptId: 'quality-followthrough', context: null, decisionOwnerPersonId: 'maya', reviewBoundary: null, workIds: ['rehearsal', 'review'] }));
    plan.assuranceSettings.rehearsals = ['rehearsal-z', 'rehearsal-a'].map(id => ({ id, definitionId: 'review-change', definitionVersion: '1.0.0', context: null, assumptions: null, response: null, reviewerPersonId: null, observedPlanRevision: 0, observation: null, workIds: ['rehearsal', 'review'], connectionIds: ['readiness', 'scope'], personIds: ['sam', 'noor'] }));
    const studio = createStudio(plan), editor = createDraftCoordinator(studio).assurance, before = studio.read(), acceptance = studio.readAcceptance(), history = studio.readHistory();
    const token = editor.begin('assurance', before).view.draft.token; assert.equal(editor.read().draft.changed, false);
    assert.equal(editor.apply(token).ok, true); assert.strictEqual(studio.read(), before); assert.strictEqual(studio.readAcceptance(), acceptance); assert.deepEqual(studio.readHistory(), history);
  }
});

test('a real quality edit preserves imported concept and participant ordering', () => {
  const plan = createShowcasePlan(); plan.assuranceSettings.quality.concepts.reverse();
  plan.assuranceSettings.context.recoveryRatePersonIds = ['sam', 'noor'];
  const studio = createStudio(plan), editor = createDraftCoordinator(studio).assurance;
  const token = editor.begin('assurance', studio.read()).view.draft.token; set(editor, token, 'allocationPercent', '25');
  assert.equal(editor.apply(token).ok, true); const expected = structuredClone(plan.assuranceSettings); expected.quality.allocationPercent = 25;
  assert.deepEqual(studio.read().state.assuranceSettings, expected); assert.equal(studio.read().result.knownCommitmentCents, 398000);
});

test('a dynamic recovery draft survives parking, dependency creation, stale review and an invalid raw value', () => {
  const studio = createStudio(createShowcasePlan()), editing = createDraftCoordinator(studio), editor = editing.assurance;
  let token = editor.begin('assurance', studio.read()).view.draft.token; event(editor, token); set(editor, token, 'event.recovery-one.eventCount', ' later ');
  assert.equal(editing.park().ok, true);
  const plan = JSON.parse(studio.exportText()); plan.purpose.changedAbility = 'Recover the interrupted request and explain the result.';
  assert.equal(studio.importText(JSON.stringify(plan), studio.read()).ok, true);
  assert.equal(editor.begin('assurance', studio.read()).error.code, 'review-required');
  const reviewed = editor.review(editor.read().draft.token, studio.read()); assert.equal(reviewed.ok, true, reviewed.error?.message); token = reviewed.view.draft.token;
  assert.equal(editor.read().draft.raw['event.recovery-one.eventCount'], ' later '); assert.equal(editor.preview(token).error.code, 'integer-text');
  set(editor, token, 'event.recovery-one.eventCount', '2'); assert.equal(editor.apply(token).ok, true);
  assert.equal(studio.read().state.assuranceSettings.recoveryEvents[0].eventCount, 2);
});

test('existing work and a rehearsal connection update share one proposed response while cancel retains accepted work', () => {
  const studio = createStudio(createShowcasePlan()), editor = createDraftCoordinator(studio).assurance, before = studio.read();
  let token = editor.begin('assurance', before).view.draft.token; event(editor, token); session(editor, token);
  set(editor, token, 'proposal.mode', 'update'); set(editor, token, 'proposal.existingWorkId', 'rehearsal');
  set(editor, token, 'connectionUpdateIds', ['readiness']); set(editor, token, 'connection.readiness.status', 'paused');
  const proposal = editor.preview(token); assert.equal(proposal.ok, true, proposal.error?.message);
  assert.deepEqual(proposal.summary.updatedWorkIds, ['rehearsal']); assert.deepEqual(proposal.summary.updatedConnectionIds, ['readiness']);
  assert.equal(proposal.projection.state.work.length, before.state.work.length); assert.equal(proposal.projection.state.connections.find(row => row.id === 'readiness').status, 'paused');
  assert.equal(editor.cancel(token).ok, true); assert.strictEqual(studio.read(), before);
});

test('malformed reference lists and unowned dynamic fields leave accepted plan and draft intact', () => {
  const studio = createStudio(createShowcasePlan()), editor = createAssuranceDraftAdapter(studio), before = studio.read();
  const token = editor.begin('assurance', before).view.draft.token;
  let reads = 0; const ids = []; Object.defineProperty(ids, '0', { enumerable: true, get() { reads += 1; return 'sam'; } });
  assert.equal(editor.setIds(token, 'recoveryRatePersonIds', ids).error.code, 'data-property'); assert.equal(reads, 0);
  assert.equal(editor.setText(token, 'event.unowned.label', 'New event').error.code, 'field'); assert.strictEqual(studio.read(), before);
});

test('removal references name the actual quality, recovery, learning and rehearsal owners', () => {
  const plan = createShowcasePlan(), settings = plan.assuranceSettings;
  settings.quality.concepts.find(row => row.conceptId === 'independent-review').workIds = ['review'];
  settings.recoveryEvents = [{ id: 'event-one', label: 'Recover the interrupted request', included: true, lifecycle: 'active', eventCount: 1, aggregateMinutesPerEvent: 60, receiverPersonId: 'sam', reviewBoundary: null, workIds: ['review'] }];
  settings.learningActions = [{ id: 'learn-one', promptId: 'quality-followthrough', context: null, decisionOwnerPersonId: 'maya', reviewBoundary: null, workIds: ['review'] }];
  settings.rehearsals = [{ id: 'rehearsal-one', definitionId: 'recovery-failure', definitionVersion: '1.0.0', context: 'Try a failed restart', assumptions: null, response: null, reviewerPersonId: 'noor', observedPlanRevision: 0, observation: null, workIds: ['review'], connectionIds: ['readiness'], personIds: ['sam'] }];
  const studio = createStudio(plan), before = studio.read();
  const removal = studio.previewCommand({ type: 'work.remove', workId: 'review' }, before);
  assert.equal(removal.ok, false); assert.equal(removal.error.code, 'dependencies');
  assert.deepEqual(removal.error.references.map(reference => describeAssuranceReference(before.state.assuranceSettings, reference)).filter(Boolean), [
    'Quality concept: Independent review', 'Recovery event: Recover the interrupted request',
    'Learning action: Connect quality evidence to release and post-release learning',
    'Rehearsal: A recovery rehearsal reveals a gap · Try a failed restart',
  ]);
  assert.strictEqual(studio.read(), before);
});

test('supporting-session steps carry minutes across hours and zero occurrences preserve the exact staffing amount', () => {
  const studio = createStudio(createShowcasePlan()), editor = createDraftCoordinator(studio).assurance, before = studio.read();
  const token = editor.begin('assurance', before).view.draft.token; event(editor, token); session(editor, token);
  set(editor, token, 'proposal.minutesPerSession', '59');
  assert.equal(editor.step(token, 'proposal.minutesPerSession', 1).ok, true);
  assert.equal(editor.read().draft.raw['proposal.hoursPerSession'], '1'); assert.equal(editor.read().draft.raw['proposal.minutesPerSession'], '0');
  assert.equal(editor.preview(token).summary.money.knownDeltaCents, 20000);
  assert.equal(editor.step(token, 'proposal.minutesPerSession', -1).ok, true);
  assert.equal(editor.read().draft.raw['proposal.hoursPerSession'], '0'); assert.equal(editor.read().draft.raw['proposal.minutesPerSession'], '59');
  assert.equal(editor.preview(token).summary.money.knownDeltaCents, 19667);
  set(editor, token, 'proposal.occurrences', '0'); const proposal = editor.preview(token); assert.equal(proposal.ok, true, proposal.error?.message);
  assert.equal(proposal.summary.money.knownDeltaCents, 0); assert.equal(proposal.projection.result.knownCommitmentCents, 398000); assert.strictEqual(studio.read(), before);
  assert.equal(editor.apply(token).ok, true); assert.equal(studio.read().state.work.find(row => row.id === 'assurance-work-1').occurrences, 0);
});

test('rate and share steppers retain decimal precision, respect bounds and preserve incomplete raw entries', () => {
  const studio = createStudio(createShowcasePlan()), editor = createDraftCoordinator(studio).assurance, before = studio.read();
  const token = editor.begin('assurance', before).view.draft.token;
  set(editor, token, 'independentRate', '10.25'); set(editor, token, 'qualityAdditionalPercent', '18.25');
  assert.equal(editor.step(token, 'independentRate', 1).ok, true);
  assert.equal(editor.step(token, 'qualityAdditionalPercent', 1).ok, true);
  const proposal = editor.preview(token); assert.equal(proposal.ok, true, proposal.error?.message);
  assert.equal(proposal.projection.state.assuranceSettings.quality.independentRateCentsPerHour, 1125);
  assert.equal(proposal.projection.state.assuranceSettings.quality.additionalShareBasisPoints, 1925);
  assert.strictEqual(studio.read(), before);
  set(editor, token, 'qualityAdditionalPercent', '99.75'); editor.step(token, 'qualityAdditionalPercent', 1);
  assert.equal(editor.read().draft.raw.qualityAdditionalPercent, '100');
  set(editor, token, 'recoveryAdditionalPercent', '0.25'); editor.step(token, 'recoveryAdditionalPercent', -1);
  assert.equal(editor.read().draft.raw.recoveryAdditionalPercent, '0');
  for (const value of ['', ' later ', '1.234', '-1']) {
    set(editor, token, 'independentRate', value); assert.equal(editor.step(token, 'independentRate', 1).ok, false);
    assert.equal(editor.read().draft.raw.independentRate, value);
  }
  set(editor, token, 'namedUnknowns', ' later '); assert.equal(editor.step(token, 'namedUnknowns', 1).ok, false);
  assert.equal(editor.read().draft.raw.namedUnknowns, ' later '); assert.strictEqual(studio.read(), before);
});

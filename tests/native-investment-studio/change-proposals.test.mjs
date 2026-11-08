import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan, parsePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { getChangeComponent } from '../../collaboration/native-investment-studio/change-models.mjs';
import { prepareChangeProposal, applyChangeProposal } from '../../collaboration/native-investment-studio/change-proposals.mjs';
import { LIMITS } from '../../collaboration/native-investment-studio/config.mjs';

const component = (settings, framework = 'kotter', id = 'urgency') => settings.frameworkMaps.find(row => row.frameworkId === framework).components.find(row => row.componentId === id);
function funded() {
  const plan = createExamplePlan();
  plan.people = [{ ...plan.people[0], fundedMinutes: 9600, rateCentsPerHour: 10000 }];
  plan.teams[0].personIds = ['product-one'];
  plan.work[0] = { ...plan.work[0], personIds: ['product-one'], minutesPerOccurrence: 240, occurrences: 1, funding: 'allocated' };
  return plan;
}
function extraWork(overrides = {}) {
  return { id: 'extra-review', label: 'Additional review', teamId: 'delivery', personIds: ['product-one'],
    minutesPerOccurrence: 90, occurrences: 1, funding: 'additional', status: 'planned', timing: null, lifecycle: 'active', ...overrides };
}
function request(base, work = null, componentId = 'urgency') {
  return { changeSettings: structuredClone(base.state.changeSettings), workProposal: work === null ? null : {
    frameworkId: 'kotter', frameworkVersion: '1.0.0', componentId, source: 'core',
    suggestionId: getChangeComponent('kotter', '1.0.0', componentId).coreSuggestions[0].id, work,
  } };
}
function apply(studio, raw) {
  const proposal = prepareChangeProposal(studio.read(), raw), result = applyChangeProposal(studio, proposal);
  assert.equal(result.ok, true, result.error?.message); return { proposal, projection: result.projection };
}

test('one proposal accepts explicit work and the complete retained Change draft with literal money and history', () => {
  const studio = createStudio(funded()), before = studio.read();
  studio.setBaseline(before);
  const raw = request(before, { kind: 'new', work: extraWork() });
  raw.changeSettings.activeFramework = { frameworkId: 'npt', version: '1.0.0' };
  raw.changeSettings.lens = { lensId: 'learning', version: '1.0.0' };
  raw.changeSettings.sourceFilter = 'enterprise';
  raw.changeSettings.attention.channels[0].parts = 25;
  component(raw.changeSettings, 'npt', 'coherence').status = 'outside';
  const proposal = prepareChangeProposal(before, raw);
  assert.strictEqual(studio.read(), before); assert.equal(studio.readHistory().undoCount, 0);
  assert.deepEqual(proposal.summary.money, { beforeKnownCents: 1600000, afterKnownCents: 1615000, knownDeltaCents: 15000,
    beforeTotalCents: 1600000, afterTotalCents: 1615000, totalDeltaCents: 15000 });
  assert.deepEqual(proposal.summary.newWorkIds, ['extra-review']);
  assert.deepEqual(proposal.summary.reusedWorkIds, []);
  assert.equal(proposal.projection.result.allocatedKnownCents, 40000);
  assert.equal(proposal.projection.result.capacity[0].additionalMinutes, 90);
  raw.workProposal.work.work.personIds.length = 0; component(raw.changeSettings).workIds.push('missing');
  assert.equal(applyChangeProposal(studio, proposal).ok, true);
  const accepted = studio.read();
  assert.equal(accepted.state.revision, 1); assert.equal(studio.readHistory().undoCount, 1);
  assert.equal(studio.readAcceptance().sequence, 1);
  assert.equal(accepted.change.framework.id, 'npt'); assert.equal(accepted.change.lens.id, 'learning');
  assert.equal(accepted.state.changeSettings.sourceFilter, 'enterprise');
  assert.equal(accepted.change.attention.channels[0].parts, 25);
  assert.equal(component(accepted.state.changeSettings, 'npt', 'coherence').status, 'outside');
  assert.deepEqual(component(accepted.state.changeSettings).workIds, ['extra-review']);
  assert.equal(component(accepted.state.changeSettings).status, 'planned');
  assert.equal(parsePlan(studio.exportText()).serialized, studio.exportText());
  assert.equal(studio.undo(accepted).ok, true); assert.deepEqual(studio.read().state, before.state);
  assert.deepEqual(studio.read().change, before.change);
  assert.equal(studio.redo(studio.read()).ok, true); assert.deepEqual(studio.read().change, accepted.change);
  assert.equal(studio.restoreBaseline(studio.read()).ok, true); assert.deepEqual(studio.read().change, before.change);
  assert.equal(studio.read().result.plannedCommitmentCents, 1600000);
});

test('reusing work and repeating the same prepared intent retain one price account and one reference', () => {
  const studio = createStudio(funded());
  const first = apply(studio, request(studio.read(), { kind: 'new', work: extraWork() }));
  const repeated = apply(studio, request(studio.read(), { kind: 'new', work: extraWork() }));
  assert.strictEqual(repeated.projection, first.projection);
  assert.deepEqual(repeated.proposal.summary.newWorkIds, []);
  assert.deepEqual(repeated.proposal.summary.reusedWorkIds, ['extra-review']);
  assert.equal(repeated.proposal.summary.money.knownDeltaCents, 0);
  assert.equal(studio.readHistory().undoCount, 1);
  const shared = apply(studio, request(studio.read(), { kind: 'existing', workId: 'extra-review' }, 'coalition'));
  assert.equal(shared.proposal.summary.money.knownDeltaCents, 0);
  assert.equal(shared.projection.result.knownCommitmentCents, 1615000);
  assert.equal(shared.projection.result.capacity[0].additionalMinutes, 90);
  assert.deepEqual(component(shared.projection.state.changeSettings).workIds, ['extra-review']);
  assert.deepEqual(component(shared.projection.state.changeSettings, 'kotter', 'coalition').workIds, ['extra-review']);
  assert.equal(shared.projection.state.work.filter(row => row.id === 'extra-review').length, 1);
  const current = studio.read(), count = studio.readHistory().undoCount;
  assert.throws(() => prepareChangeProposal(current, request(current, { kind: 'new', work: extraWork({ minutesPerOccurrence: 120 }) })), { code: 'identity-collision' });
  assert.strictEqual(studio.read(), current); assert.equal(studio.readHistory().undoCount, count);
});

test('settings commands preserve money, exact no-op identity and linked-record removal diagnostics', () => {
  const studio = createStudio(funded()), before = studio.read(), settings = structuredClone(before.state.changeSettings);
  component(settings).workIds = ['review'];
  component(settings).capabilityRefs = [{ kind: 'practice', instanceId: 'shared-expectations' }];
  const preview = studio.previewCommand({ type: 'change.settings.replace', changeSettings: settings }, before);
  assert.equal(preview.ok, true); assert.deepEqual(preview.projection.result, before.result); assert.strictEqual(studio.read(), before);
  const accepted = studio.applyCommand({ type: 'change.settings.replace', changeSettings: settings }, before);
  assert.equal(accepted.ok, true);
  const identity = studio.read(), chronology = studio.readAcceptance();
  assert.equal(studio.applyCommand({ type: 'change.settings.replace', changeSettings: settings }, identity).ok, true);
  assert.strictEqual(studio.read(), identity); assert.strictEqual(studio.readAcceptance(), chronology);
  const removeWork = studio.previewCommand({ type: 'work.remove', workId: 'review' }, identity);
  assert.equal(removeWork.ok, true);
  assert.deepEqual(component(removeWork.projection.state.changeSettings).workIds, []);
  const removePractice = studio.applyCommand({ type: 'capability.remove', kind: 'practice', instanceId: 'shared-expectations' }, identity);
  assert.deepEqual(removePractice.error.references, [{ collection: 'changeSettings', id: 'kotter', field: 'frameworkMaps[0].components[0].capabilityRefs' }]);
  component(settings).capabilityRefs = [];
  assert.equal(studio.applyCommand({ type: 'change.settings.replace', changeSettings: settings }, identity).ok, true);
  assert.equal(studio.applyCommand({ type: 'capability.remove', kind: 'practice', instanceId: 'shared-expectations' }, studio.read()).ok, true);
  assert.equal(studio.read().state.work[0].id, 'review'); assert.deepEqual(studio.read().result, before.result);
  const full = funded(); full.revision = LIMITS.revision;
  const atLimit = createStudio(full), current = atLimit.read();
  assert.strictEqual(apply(atLimit, request(current)).projection, current);
  assert.equal(atLimit.applyCommand({ type: 'change.settings.replace', changeSettings: current.state.changeSettings }, current).ok, true);
  assert.strictEqual(atLimit.read(), current);
});

test('malformed, dangling and unknown proposal values retain accepted bytes and avoid evaluating getters', () => {
  const studio = createStudio(funded()), before = studio.read(); let reads = 0;
  const invalid = [
    [raw => { raw.extra = true; }, 'fields'],
    [raw => { raw.workProposal.suggestionId = 'unknown'; }, 'change-suggestion'],
    [raw => { raw.workProposal.source = 'all'; }, 'change-suggestion'],
    [raw => { raw.workProposal.work = { kind: 'existing', workId: 'missing' }; }, 'reference'],
    [raw => { raw.workProposal.work.kind = 'automatic'; }, 'change-work'],
    [raw => { raw.workProposal.work.work.personIds = ['missing']; }, 'reference'],
    [raw => { raw.workProposal.work.work.minutesPerOccurrence = 1441; }, 'integer'],
    [raw => { Object.defineProperty(raw, 'changeSettings', { enumerable: true, get() { reads += 1; return {}; } }); }, 'data-property'],
    [raw => { Object.defineProperty(raw.workProposal.work, 'work', { enumerable: true, get() { reads += 1; return {}; } }); }, 'data-property'],
  ];
  for (const [mutate, code] of invalid) {
    const raw = request(before, { kind: 'new', work: extraWork() }); mutate(raw);
    assert.throws(() => prepareChangeProposal(before, raw), { code });
    assert.strictEqual(studio.read(), before); assert.equal(studio.exportText(), before.serialized);
    assert.equal(studio.readHistory().undoCount, 0);
  }
  assert.equal(reads, 0);
  const unknown = createStudio({ ...funded(), people: [{ ...funded().people[0], rateCentsPerHour: null }] });
  const preview = prepareChangeProposal(unknown.read(), request(unknown.read(), { kind: 'new', work: extraWork() }));
  assert.equal(preview.summary.money.totalDeltaCents, null);
  assert.equal(preview.summary.money.knownDeltaCents, 0);
});

test('stale, foreign and descriptor-triggered proposals preserve the newer accepted plan and history', () => {
  const studio = createStudio(funded()), original = studio.read(), raw = request(original, { kind: 'new', work: extraWork() });
  const prepared = prepareChangeProposal(original, raw);
  assert.equal(applyChangeProposal(createStudio(funded()), prepared).error.code, 'stale-edit');
  assert.equal(applyChangeProposal(studio, { ...prepared }).error.code, 'change-proposal');
  let nested = false;
  raw.changeSettings = new Proxy(raw.changeSettings, { ownKeys(target) {
    if (!nested) {
      nested = true;
      const current = studio.read();
      assert.equal(studio.updatePerson('product-one', { ...current.state.people[0], fundedMinutes: 9660 }, current).ok, true);
    }
    return Reflect.ownKeys(target);
  } });
  const interrupted = prepareChangeProposal(original, raw), newer = studio.read(), marker = studio.readAcceptance();
  assert.equal(applyChangeProposal(studio, interrupted).error.code, 'stale-edit');
  assert.equal(applyChangeProposal(studio, prepared).error.code, 'stale-edit');
  assert.strictEqual(studio.read(), newer); assert.strictEqual(studio.readAcceptance(), marker);
  assert.equal(studio.readHistory().undoCount, 1); assert.equal(studio.read().state.work.length, 1);
  assert.equal(studio.read().result.knownCommitmentCents, 1610000);
});

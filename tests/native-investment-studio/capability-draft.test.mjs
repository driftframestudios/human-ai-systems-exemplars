import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createShowcasePlan, createQuarterShowcasePlan, preparePreset } from '../../collaboration/native-investment-studio/presets.mjs';
import { createDraftCoordinator } from '../../collaboration/native-investment-studio/editing.mjs';
import { capabilityForm, makeCapabilityTarget, createCapabilityDraftAdapter } from '../../collaboration/native-investment-studio/capability-draft.mjs';

function fixture() {
  const plan = createExamplePlan();
  plan.people = plan.people.slice(0, 2).map(person => ({ ...person, fundedMinutes: 4800 }));
  plan.teams[0].personIds = plan.people.map(person => person.id);
  plan.work = [{ ...plan.work[0], personIds: [...plan.teams[0].personIds], minutesPerOccurrence: 120, occurrences: 1, funding: 'allocated' }];
  plan.practices = [];
  return plan;
}
function create(editing, studio, definition = 'inspect-history') {
  const result = editing.capability.create(capabilityForm('ability', 'create', definition), studio.read());
  assert.equal(result.ok, true, result.error?.message); return result.view.draft.token;
}
function text(editing, token, key, value) { const result = editing.capability.setText(token, key, value); assert.equal(result.ok, true, result.error?.message); }
function ids(editing, token, key, value) { const result = editing.capability.setIds(token, key, value); assert.equal(result.ok, true, result.error?.message); }
function common(editing, token) {
  text(editing, token, 'context', 'Recover an accepted change in the pilot');
  text(editing, token, 'teamId', 'delivery'); ids(editing, token, 'responsiblePersonIds', ['product-one', 'product-two']);
  text(editing, token, 'decisionOwnerPersonId', 'product-one');
  ids(editing, token, 'support.preparation', ['review']); ids(editing, token, 'support.review', ['review']);
}
function rejected(result, code) { assert.equal(result.ok, false); assert.equal(result.error.code, code); }

test('the pilot supplies editable context and shared support while ordinary plans receive context without assignments', () => {
  const studio = createStudio(createShowcasePlan()), editing = createDraftCoordinator(studio), before = studio.read();
  const token = create(editing, studio), raw = editing.capability.read().draft.raw;
  assert.equal(raw.context, 'Help pilot reviewers find an earlier service-request decision and recover why it changed.');
  assert.equal(raw.teamId, 'engineering');
  assert.deepEqual(raw.responsiblePersonIds, ['ari', 'jules', 'maya', 'noor']);
  assert.deepEqual(raw['support.preparation'], ['pairing']); assert.deepEqual(raw['support.review'], ['review']);
  assert.equal(raw['new.review.enabled'], 'no');
  assert.strictEqual(studio.read(), before);
  text(editing, token, 'context', 'Review the history of a missed handoff.');
  assert.equal(editing.capability.apply(token).ok, true);
  assert.equal(studio.read().state.abilities[0].context, 'Review the history of a missed handoff.');
  assert.equal(studio.read().state.work.length, before.state.work.length);
  assert.equal(studio.read().result.knownCommitmentCents, 398000);
  assert.equal(studio.undo(studio.read()).ok, true); assert.equal(studio.read().serialized, before.serialized);
  const ordinary = createStudio(fixture()), ordinaryEditing = createDraftCoordinator(ordinary);
  create(ordinaryEditing, ordinary);
  const empty = ordinaryEditing.capability.read().draft.raw;
  assert.equal(empty.context, 'Inspect earlier accepted records and distinguish them from the current proposal.');
  assert.equal(empty.teamId, ''); assert.deepEqual(empty.responsiblePersonIds, []);
  assert.deepEqual(empty['support.preparation'], []); assert.deepEqual(empty['support.review'], []);
});

test('rollout and starter proposals use the capability explanation for both catalogues', () => {
  for (const plan of [createQuarterShowcasePlan(), preparePreset('discovery-alignment', '1.0.0').projection.state]) {
    const studio = createStudio(plan), editing = createDraftCoordinator(studio), before = studio.read();
    for (const [kind, id, expected] of [
      ['ability', 'trace-evidence', 'Follow a claim to its observation and describe the observation context.'],
      ['practice', 'focalization', 'Name the decision, its owner, and the information that could change it.'],
    ]) {
      const result = editing.capability.create(capabilityForm(kind, 'create', id), studio.read());
      assert.equal(result.ok, true, result.error?.message);
      assert.equal(result.view.draft.raw.context, expected, `${plan.planId}: ${kind}`);
      assert.equal(result.view.draft.raw.teamId, '', 'context supplies no assignment');
      assert.strictEqual(studio.read(), before, 'opening a suggested context accepts no plan changes');
      assert.equal(editing.capability.cancel(result.view.draft.token).ok, true);
    }
  }
});

test('cleared context survives parking and stale review, then remains blank when its accepted record reopens', () => {
  const studio = createStudio(fixture()), editing = createDraftCoordinator(studio);
  const token = create(editing, studio), target = editing.capability.read().draft.capabilityId;
  text(editing, token, 'context', '');
  assert.equal(editing.park().ok, true);
  const resumed = editing.capability.begin(target, studio.read());
  assert.equal(resumed.ok, true); assert.equal(resumed.view.draft.raw.context, '');
  const changed = JSON.parse(studio.exportText()); changed.purpose.changedAbility = 'A revised plan outcome';
  assert.equal(studio.importText(JSON.stringify(changed), studio.read()).ok, true);
  const reviewed = editing.capability.review(editing.capability.read().draft.token, studio.read());
  assert.equal(reviewed.ok, true); assert.equal(reviewed.view.draft.raw.context, '');
  assert.equal(editing.capability.apply(reviewed.view.draft.token).ok, true);
  const row = studio.read().state.abilities[0]; assert.equal(row.context, null);
  const reopened = editing.capability.begin(makeCapabilityTarget(capabilityForm('ability', 'update', row.definitionId), row.id), studio.read());
  assert.equal(reopened.ok, true); assert.equal(reopened.view.draft.raw.context, '');
});

test('pilot proposals use available existing support and retain genuine maintenance gaps', () => {
  const plan = createShowcasePlan();
  plan.work.find(row => row.id === 'review').status = 'paused';
  plan.people.find(row => row.id === 'maya').lifecycle = 'retired';
  const studio = createStudio(plan), editing = createDraftCoordinator(studio);
  const token = create(editing, studio, 'recover-interrupted-work'), raw = editing.capability.read().draft.raw;
  assert.deepEqual(raw.responsiblePersonIds, ['noor', 'sam']); assert.equal(raw.decisionOwnerPersonId, '');
  assert.deepEqual(raw['support.preparation'], ['rehearsal']); assert.deepEqual(raw['support.review'], []);
  assert.deepEqual(raw['support.maintenance'], []); assert.deepEqual(raw.prerequisites, []);
  assert.equal(editing.capability.preview(token).ok, true);
});

test('one capability proposal keeps $400 allocated inside $16,000 staffing, then accepts $150 review with one Undo', () => {
  const studio = createStudio(fixture()), editing = createDraftCoordinator(studio), before = studio.read();
  assert.equal(before.result.knownCommitmentCents, 1600000);
  const token = create(editing, studio); common(editing, token);
  const allocated = editing.capability.preview(token);
  assert.equal(allocated.ok, true); assert.equal(allocated.projection.result.knownCommitmentCents, 1600000);
  assert.equal(allocated.projection.capabilities.abilities[0].amounts.allocatedKnownCents, 40000);
  assert.strictEqual(editing.capability.preview(token).projection, allocated.projection, 'unchanged raw entries reuse their prepared proposal');
  text(editing, token, 'new.review.enabled', 'yes'); text(editing, token, 'new.review.teamId', 'delivery');
  ids(editing, token, 'new.review.personIds', ['product-one']);
  text(editing, token, 'new.review.hoursPerSession', '1'); text(editing, token, 'new.review.minutesPerSession', '30');
  text(editing, token, 'new.review.funding', 'additional');
  for (const [key, value] of Object.entries({ evidenceStage: 'rehearsed', evidenceContext: 'Pilot recovery exercise',
    evidenceObservation: 'The participant recovered the earlier accepted version.', evidenceRecorder: 'product-two',
    evidenceReviewBoundary: 'One guided exercise with the pilot records' })) text(editing, token, key, value);
  const proposed = editing.capability.preview(token); assert.equal(proposed.ok, true, proposed.error?.message);
  assert.equal(proposed.projection.result.knownCommitmentCents, 1615000); assert.strictEqual(studio.read(), before);
  assert.equal(editing.capability.apply(token).ok, true);
  assert.equal(studio.read().state.abilities.length, 1); assert.equal(studio.read().state.work.length, 2);
  assert.equal(studio.read().state.capabilityEvidence[0].stage, 'rehearsed');
  assert.equal(studio.read().state.capabilityEvidence[0].observedPlanRevision, before.state.revision);
  assert.equal(studio.read().result.knownCommitmentCents, 1615000);
  assert.equal(studio.undo(studio.read()).ok, true); assert.equal(studio.read().serialized, before.serialized);
});

test('shared support remains one cost and retiring a card retains its working session', () => {
  const studio = createStudio(fixture()), editing = createDraftCoordinator(studio);
  const first = create(editing, studio); common(editing, first); assert.equal(editing.capability.apply(first).ok, true);
  const second = create(editing, studio); common(editing, second); assert.equal(editing.capability.apply(second).ok, true);
  assert.equal(studio.read().result.knownCommitmentCents, 1600000); assert.equal(studio.read().state.work.length, 1);
  assert.deepEqual(studio.read().capabilities.abilities.map(row => row.sharedWorkIds), [['review'], ['review']]);
  const row = studio.read().state.abilities[0];
  const target = makeCapabilityTarget(capabilityForm('ability', 'update', row.definitionId), row.id);
  const token = editing.capability.begin(target, studio.read()).view.draft.token;
  text(editing, token, 'lifecycle', 'retired'); assert.equal(editing.capability.apply(token).ok, true);
  assert.equal(studio.read().state.abilities[0].lifecycle, 'retired'); assert.equal(studio.read().state.work.length, 1);
  assert.equal(studio.read().result.knownCommitmentCents, 1600000);
});

test('capability and ordinary drafts share eight saved slots and preserve exact raw text through stale review and collision recovery', () => {
  const studio = createStudio(fixture()), editing = createDraftCoordinator(studio);
  for (let index = 0; index < 8; index += 1) {
    const token = create(editing, studio); text(editing, token, 'context', `  Context ${index}  `);
  }
  assert.equal(editing.read().slots, 8);
  rejected(editing.person.begin('product-one', studio.read()), 'draft-limit');
  assert.equal(editing.park().ok, true); assert.equal(editing.read().parked.length, 8);
  const first = editing.read().parked[0];
  const source = JSON.parse(studio.exportText()); source.purpose.changedAbility = 'A revised context';
  assert.equal(studio.importText(JSON.stringify(source), studio.read()).ok, true);
  rejected(editing.capability.begin(first.targetId, studio.read()), 'review-required');
  const saved = editing.capability.read(); assert.equal(saved.draft.raw.context, '  Context 0  ');
  assert.equal(Object.hasOwn(first, 'projection'), false);
  const reviewed = editing.capability.review(saved.draft.token, studio.read()); assert.equal(reviewed.ok, true);
  assert.equal(reviewed.view.draft.raw.context, '  Context 0  ');
  assert.equal(editing.capability.apply(reviewed.view.draft.token).ok, true);
  const collision = editing.read().parked[0];
  const colliding = JSON.parse(studio.exportText()); colliding.abilities.push({ ...colliding.abilities[0], id: 'ability-2' });
  assert.equal(studio.importText(JSON.stringify(colliding), studio.read()).ok, true);
  rejected(editing.capability.begin(collision.targetId, studio.read()), 'review-required');
  const held = editing.capability.read(); assert.equal(held.creationConflict, true);
  const fresh = editing.capability.freshId(held.draft.token, studio.read()); assert.equal(fresh.ok, true);
  assert.equal(fresh.view.draft.raw.context, '  Context 1  '); assert.equal(fresh.view.draft.targetId, 'ability-9');
  const latest = fresh.view.draft.token; editing.dispose(); rejected(editing.capability.apply(latest), 'disposed');
  assert.equal(editing.read().slots, 0); assert.equal(studio.read().state.abilities.length, 2);
});

test('invalid duration and foreign selection input preserve the accepted plan and raw correction route', () => {
  const studio = createStudio(fixture()), adapter = createCapabilityDraftAdapter(studio), before = studio.read();
  const target = makeCapabilityTarget(capabilityForm('ability', 'create', 'inspect-history'), 'history');
  const opened = adapter.begin(target, before), token = opened.view.draft.token;
  adapter.setText(token, 'new.review.enabled', 'yes'); adapter.setText(token, 'new.review.minutesPerSession', 'later');
  rejected(adapter.preview(token), 'integer-text'); assert.equal(adapter.read().draft.raw['new.review.minutesPerSession'], 'later');
  let reads = 0; const supplied = []; Object.defineProperty(supplied, '0', { enumerable: true, get() { reads += 1; return 'review'; } });
  rejected(adapter.setIds(token, 'support.review', supplied), 'data-property'); assert.equal(reads, 0);
  rejected(adapter.setIds(token, 'prerequisites', ['ability/one', 'ability/one']), 'reference');
  rejected(adapter.setText({}, 'context', 'foreign'), 'draft-token');
  assert.strictEqual(studio.read(), before); assert.equal(adapter.cancel(token).ok, true);
  rejected(adapter.apply(token), 'draft-token');
});

test('successive additional support sessions allocate fresh IDs beside imported records with the same prefix', () => {
  const plan = fixture(); plan.work.push({ ...plan.work[0], id: 'ability-1-support-2', label: 'Imported existing support' });
  const studio = createStudio(plan), editing = createDraftCoordinator(studio);
  let token = create(editing, studio); common(editing, token);
  function additional(token) {
    text(editing, token, 'new.review.enabled', 'yes'); text(editing, token, 'new.review.teamId', 'delivery');
    ids(editing, token, 'new.review.personIds', ['product-one']);
  }
  additional(token);
  const preview = editing.capability.preview(token); assert.equal(preview.ok, true, preview.error?.message);
  assert.deepEqual(preview.summary.newWorkIds, ['ability-1-support-2-2']);
  assert.strictEqual(editing.capability.preview(token).projection, preview.projection);
  assert.equal(editing.capability.apply(token).ok, true);
  const target = makeCapabilityTarget(capabilityForm('ability', 'update', 'inspect-history'), 'ability-1');
  token = editing.capability.begin(target, studio.read()).view.draft.token; additional(token);
  const second = editing.capability.preview(token); assert.equal(second.ok, true, second.error?.message);
  assert.deepEqual(second.summary.newWorkIds, ['ability-1-support-2-3']);
  assert.equal(editing.capability.apply(token).ok, true);
  assert.deepEqual(studio.read().state.abilities[0].supportBindings[1].workIds, ['review', 'ability-1-support-2-2', 'ability-1-support-2-3']);
  assert.equal(new Set(studio.read().state.work.map(row => row.id)).size, 4);
});

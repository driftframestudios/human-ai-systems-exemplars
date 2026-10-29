import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createDraftCoordinator } from '../../collaboration/native-investment-studio/editing.mjs';
import { describeSessionTarget } from '../../collaboration/native-investment-studio/command-draft.mjs';

function setup(options = {}) { const studio = createStudio(); return { studio, editing: createDraftCoordinator(studio, options) }; }
function rejected(result, code) { assert.equal(result.ok, false); assert.equal(result.error.code, code); return result; }
function create(editing, studio, label = 'New session') {
  const opened = editing.session.create('work.create', studio.read()); assert.equal(opened.ok, true, opened.error?.message);
  const draft = opened.view.draft;
  editing.session.setText(draft.token, 'label', label); editing.session.setText(draft.token, 'teamId', 'delivery');
  editing.session.setIds(draft.token, 'personIds', ['product-one']); return draft;
}

test('full session drafts coexist with existing duration, person, purpose and assembly drafts under one lease', () => {
  const { studio, editing } = setup();
  const session = create(editing, studio); const id = session.sessionId;
  const numeric = editing.work.begin('review', studio.read()).view.draft;
  editing.work.setText(numeric.token, 'minutesPerSession', '45');
  const person = editing.person.begin('product-one', studio.read()).view.draft; editing.person.setText(person.token, 'ratePerHour', '125');
  const purpose = editing.purpose.begin('purpose', studio.read()).view.draft; editing.purpose.setText(purpose.token, 'changedAbility', 'Find samples');
  const team = editing.assembly.create('team.create', studio.read()).view.draft; editing.assembly.setText(team.token, 'label', 'Design');
  assert.equal(editing.read().slots, 5);
  const saved = editing.read().parked.find(row => row.kind === 'session');
  assert.deepEqual(saved.raw.personIds, ['product-one']); assert.ok(Object.isFrozen(saved.raw.personIds));
  assert.equal(Object.hasOwn(saved, 'projection'), false); assert.equal(Object.hasOwn(saved, 'baseProjection'), false);
  assert.equal(editing.read().selected.session, id); assert.equal(editing.read().selected.work, 'review');
  const resumed = editing.session.begin(id, studio.read()); assert.equal(resumed.ok, true);
  rejected(editing.session.apply(session.token), 'draft-token');
  assert.equal(editing.session.apply(resumed.view.draft.token).ok, true);
  assert.equal(studio.read().result.knownCommitmentCents, 125000);
  assert.equal(editing.work.read().status, 'stale'); assert.equal(editing.assembly.read().status, 'stale');
});

test('eight session drafts reserve parking and fresh-ID replacement recovers at the exact cap', () => {
  const { studio, editing } = setup(), keys = [];
  for (let index = 0; index < 8; index += 1) keys.push(create(editing, studio, `Session ${index}`).sessionId);
  assert.equal(new Set(keys).size, 8); assert.equal(editing.read().slots, 8);
  rejected(editing.assembly.create('person.create', studio.read()), 'draft-limit');
  assert.equal(editing.park().ok, true); assert.equal(editing.read().parked.length, 8);
  const previous = editing.session.read().draft;
  const replacement = editing.session.freshId(previous.token, studio.read()); assert.equal(replacement.ok, true);
  assert.equal(editing.read().slots, 8); assert.notEqual(replacement.view.draft.sessionId, previous.sessionId);
  assert.deepEqual(replacement.view.draft.raw, previous.raw);
  rejected(editing.session.apply(previous.token), 'draft-token');
});

test('an imported creation collision retains the saved form until explicit fresh-ID recovery', () => {
  const { studio, editing } = setup(); const original = create(editing, studio);
  editing.session.setText(original.token, 'minutesPerSession', '00045'); editing.park();
  const before = editing.session.read().draft, id = describeSessionTarget(original.sessionId).id;
  const imported = structuredClone(studio.read().state);
  imported.work.push({ ...imported.work[0], id, label: 'Imported record', personIds: ['engineering-one'], occurrences: 1 });
  assert.equal(studio.replace(imported, studio.read()).ok, true);
  assert.equal(editing.session.read().creationConflict, true);
  rejected(editing.session.begin(original.sessionId, studio.read()), 'review-required');
  rejected(editing.session.review(before.token, studio.read()), 'creation-conflict');
  const fresh = editing.session.freshId(before.token, studio.read()); assert.equal(fresh.ok, true);
  assert.deepEqual(fresh.view.draft.raw, before.raw); assert.equal(fresh.view.creationConflict, false);
  assert.equal(editing.session.apply(fresh.view.draft.token).ok, true);
  assert.equal(studio.read().state.work.find(row => row.id === id).label, 'Imported record');
  assert.equal(studio.read().result.knownCommitmentCents, 132500);
});

test('stale full session review rebases all fields while current-value recovery preserves accepted values', () => {
  const { studio, editing } = setup(); let draft = editing.session.begin('work.update:review', studio.read()).view.draft;
  editing.session.setText(draft.token, 'label', 'Saved name'); editing.session.setText(draft.token, 'funding', 'allocated');
  editing.session.setIds(draft.token, 'personIds', ['engineering-two', 'product-one']); editing.park();
  studio.updatePurpose({ ...studio.read().state.purpose, changedAbility: 'Find samples' }, studio.read());
  draft = editing.session.read().draft; rejected(editing.session.begin(draft.sessionId, studio.read()), 'review-required');
  const reviewed = editing.session.review(draft.token, studio.read()); assert.equal(reviewed.ok, true);
  assert.deepEqual(reviewed.view.draft.raw.personIds, ['engineering-two', 'product-one']);
  assert.equal(editing.session.preview(reviewed.view.draft.token).projection.result.allocatedKnownCents, 60000);
  const current = editing.session.useCurrent(reviewed.view.draft.token, studio.read()); assert.equal(current.ok, true);
  assert.equal(current.view.draft.raw.label, 'Weekly working session'); assert.equal(current.view.draft.raw.funding, 'additional');
  assert.equal(editing.session.cancel(current.view.draft.token).ok, true); assert.equal(studio.read().state.work[0].label, 'Weekly working session');
});

test('removed saved sessions remain inspectable and can release their held capacity', () => {
  const { studio, editing } = setup({ limit: 2 });
  const added = create(editing, studio); const id = describeSessionTarget(added.sessionId).id;
  assert.equal(editing.session.apply(added.token).ok, true);
  const draft = editing.session.begin(`work.update:${id}`, studio.read()).view.draft;
  editing.session.setText(draft.token, 'label', 'Retained'); editing.park();
  const person = editing.person.begin('product-one', studio.read()).view.draft; editing.person.setText(person.token, 'ratePerHour', '101');
  assert.equal(studio.applyCommand({ type: 'work.remove', workId: id }, studio.read()).ok, true);
  const result = editing.session.begin(draft.sessionId, studio.read()); rejected(result, 'review-required');
  assert.equal(result.view.draft.raw.label, 'Retained');
  rejected(editing.session.review(result.view.draft.token, studio.read()), 'reference');
  assert.equal(editing.discard(result.view.draft.token).ok, true); assert.equal(editing.read().slots, 1);
});

test('a transient removal confirmation parks no empty draft and preserves dependency diagnostics', () => {
  const { studio, editing } = setup();
  const draft = editing.session.begin('work.remove:review', studio.read()).view.draft;
  assert.deepEqual(rejected(editing.session.preview(draft.token), 'dependencies').error.references,
    [{ collection: 'practices', id: 'shared-expectations', field: 'workIds' }]);
  assert.equal(editing.park().ok, true); assert.equal(editing.read().slots, 0);
  assert.equal(editing.session.read().draft, null);
});

test('session fresh-ID recovery holds reentrant cancellation and preserves the original lease until replacement', () => {
  const real = createStudio(); let editing, token, armed = false, nested;
  const studio = { ...real, read() { if (armed) { armed = false; nested = editing.session.cancel(token); } return real.read(); } };
  editing = createDraftCoordinator(studio, { limit: 1 }); const draft = create(editing, studio); token = draft.token;
  const expected = studio.read(); armed = true;
  const fresh = editing.session.freshId(token, expected); assert.equal(fresh.ok, true);
  rejected(nested, 'settling'); assert.equal(fresh.view.draft.raw.label, 'New session'); assert.equal(editing.read().slots, 1);
  editing.dispose(); assert.equal(editing.session.read().status, 'disposed'); assert.equal(editing.read().selected.session, null);
  rejected(editing.session.apply(fresh.view.draft.token), 'disposed');
});

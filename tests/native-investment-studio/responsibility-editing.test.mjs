import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createDraftCoordinator } from '../../collaboration/native-investment-studio/editing.mjs';
import { describeContributionTarget } from '../../collaboration/native-investment-studio/command-draft.mjs';

const ok = result => { assert.equal(result.ok, true, result.error?.message); return result; };
const rejected = (result, code) => { assert.equal(result.ok, false); assert.equal(result.error.code, code); return result; };
function create(editing, studio, categoryId = 'source-retrieval') {
  const draft = ok(editing.contribution.create('contribution.create', studio.read())).view.draft;
  ok(editing.contribution.setText(draft.token, 'categoryId', categoryId)); return draft;
}

test('role and contribution selections share one lease with person, Session and purpose while retaining raw intent', () => {
  const studio = createStudio(), editing = createDraftCoordinator(studio);
  const role = ok(editing.role.begin('role.update:product-one', studio.read())).view.draft;
  ok(editing.role.setText(role.token, 'change', 'npt:coherence'));
  const person = ok(editing.person.begin('product-one', studio.read())).view.draft;
  ok(editing.person.setText(person.token, 'ratePerHour', '105'));
  const contribution = create(editing, studio); ok(editing.contribution.setIds(contribution.token, 'workIds', ['review']));
  const session = ok(editing.session.begin('work.update:review', studio.read())).view.draft;
  ok(editing.session.setText(session.token, 'label', 'Named session'));
  const purpose = ok(editing.purpose.begin('purpose', studio.read())).view.draft;
  ok(editing.purpose.setText(purpose.token, 'changedAbility', 'Find samples'));
  assert.equal(editing.read().slots, 5); assert.equal(editing.read().active.kind, 'purpose');
  const parked = editing.read().parked.find(record => record.kind === 'contribution');
  assert.deepEqual(parked.raw.workIds, ['review']); assert.ok(Object.isFrozen(parked.raw.workIds));
  assert.equal(Object.hasOwn(parked, 'baseProjection'), false); assert.equal(Object.hasOwn(parked, 'projection'), false);
  assert.equal(editing.read().selected.role, 'role.update:product-one'); assert.equal(editing.read().selected.person, 'product-one');
  const resumed = ok(editing.role.begin(role.roleId, studio.read())).view.draft;
  rejected(editing.role.apply(role.token), 'draft-token'); ok(editing.role.apply(resumed.token));
  assert.equal(studio.read().result.knownCommitmentCents, 120000);
  assert.equal(editing.person.read().status, 'stale'); assert.equal(editing.contribution.read().status, 'stale');
  assert.equal(editing.session.read().status, 'stale'); editing.dispose();
});

test('eight responsibility drafts reserve capacity and fresh identity replaces a slot at the exact cap', () => {
  const studio = createStudio(), editing = createDraftCoordinator(studio), keys = [];
  for (let index = 0; index < 8; index += 1) keys.push(create(editing, studio).contributionId);
  assert.equal(new Set(keys).size, 8); assert.equal(editing.read().slots, 8);
  rejected(editing.role.begin('role.update:product-one', studio.read()), 'draft-limit');
  ok(editing.park()); const original = editing.contribution.read().draft;
  const replaced = ok(editing.contribution.freshId(original.token, studio.read())).view.draft;
  assert.notEqual(replaced.contributionId, original.contributionId); assert.deepEqual(replaced.raw, original.raw);
  assert.equal(editing.read().slots, 8); rejected(editing.contribution.apply(original.token), 'draft-token'); editing.dispose();
});

test('imported identity collision preserves contribution text and ordered work until deliberate new-ID recovery', () => {
  const studio = createStudio(), editing = createDraftCoordinator(studio), draft = create(editing, studio);
  ok(editing.contribution.setText(draft.token, 'reviewBoundary', '  Inspect the sources  '));
  ok(editing.contribution.setIds(draft.token, 'workIds', ['review'])); ok(editing.park());
  const original = editing.contribution.read().draft, id = describeContributionTarget(draft.contributionId).id;
  const imported = structuredClone(studio.read().state);
  imported.contributions.push({ id, categoryId: 'transparent-calculation', receiverPersonId: null,
    decisionOwnerPersonId: null, workIds: [], reviewBoundary: 'Imported record', decisionBoundary: null });
  ok(studio.replace(imported, studio.read()));
  assert.equal(editing.contribution.read().creationConflict, true);
  rejected(editing.contribution.begin(draft.contributionId, studio.read()), 'review-required');
  rejected(editing.contribution.review(original.token, studio.read()), 'creation-conflict');
  const fresh = ok(editing.contribution.freshId(original.token, studio.read())).view.draft;
  assert.deepEqual(fresh.raw, original.raw); ok(editing.contribution.apply(fresh.token));
  assert.equal(studio.read().state.contributions.find(row => row.id === id).reviewBoundary, 'Imported record');
  assert.equal(studio.read().state.contributions.at(-1).reviewBoundary, 'Inspect the sources');
  assert.equal(studio.read().result.knownCommitmentCents, 120000); editing.dispose();
});

test('stale role review carries all saved fields while Use current restores accepted complete values', () => {
  const studio = createStudio(), editing = createDraftCoordinator(studio);
  const draft = ok(editing.role.begin('role.update:product-one', studio.read())).view.draft;
  ok(editing.role.setText(draft.token, 'change', 'npt:coherence'));
  ok(editing.role.setText(draft.token, 'decisionId', 'recommends')); ok(editing.park());
  ok(studio.updatePerson('product-one', { ...studio.read().state.people[0], label: 'Renamed person' }, studio.read()));
  const saved = editing.role.read().draft; rejected(editing.role.begin(saved.roleId, studio.read()), 'review-required');
  const reviewed = ok(editing.role.review(saved.token, studio.read())).view.draft;
  assert.equal(reviewed.raw.change, 'npt:coherence'); assert.equal(reviewed.raw.decisionId, 'recommends');
  const current = ok(editing.role.useCurrent(reviewed.token, studio.read())).view.draft;
  assert.equal(current.raw.change, ''); assert.equal(current.raw.decisionId, ''); assert.equal(current.changed, false);
  ok(editing.role.cancel(current.token)); assert.equal(studio.read().state.people[0].label, 'Renamed person'); editing.dispose();
});

test('removed role and contribution targets retain inspection and discard while another edit remains', () => {
  const studio = createStudio(), editing = createDraftCoordinator(studio);
  const added = create(editing, studio); ok(editing.contribution.apply(added.token));
  const role = ok(editing.role.begin('role.update:product-one', studio.read())).view.draft;
  ok(editing.role.setText(role.token, 'qualityId', 'independent-review')); ok(editing.park());
  const contribution = ok(editing.contribution.begin(added.contributionId.replace('.create:', '.update:'), studio.read())).view.draft;
  ok(editing.contribution.setText(contribution.token, 'reviewBoundary', 'Retain this note')); ok(editing.park());
  const imported = structuredClone(studio.read().state);
  imported.people = imported.people.filter(row => row.id !== 'product-one');
  for (const team of imported.teams) team.personIds = team.personIds.filter(id => id !== 'product-one');
  for (const work of imported.work) work.personIds = work.personIds.filter(id => id !== 'product-one');
  imported.contributions = []; ok(studio.replace(imported, studio.read()));
  let result = rejected(editing.role.begin(role.roleId, studio.read()), 'review-required');
  assert.equal(result.view.draft.raw.qualityId, 'independent-review');
  rejected(editing.role.review(result.view.draft.token, studio.read()), 'reference'); ok(editing.discard(result.view.draft.token));
  result = rejected(editing.contribution.begin(contribution.contributionId, studio.read()), 'review-required');
  assert.equal(result.view.draft.raw.reviewBoundary, 'Retain this note');
  rejected(editing.contribution.review(result.view.draft.token, studio.read()), 'reference'); ok(editing.discard(result.view.draft.token));
  assert.equal(editing.read().slots, 0); editing.dispose();
});

test('responsibility reference reflection holds competing operations and preserves the active lease', () => {
  const studio = createStudio(), editing = createDraftCoordinator(studio), draft = create(editing, studio);
  let nested; const candidate = new Proxy(['review'], { ownKeys(target) {
    nested = editing.role.begin('role.update:product-one', studio.read()); return Reflect.ownKeys(target);
  } });
  ok(editing.contribution.setIds(draft.token, 'workIds', candidate)); rejected(nested, 'settling');
  assert.equal(editing.read().active.kind, 'contribution'); assert.deepEqual(editing.contribution.read().draft.raw.workIds, ['review']);
  const before = studio.read(); editing.dispose(); rejected(editing.contribution.apply(draft.token), 'disposed');
  assert.strictEqual(studio.read(), before); assert.equal(editing.read().selected.role, null); assert.equal(editing.read().selected.contribution, null);
});

test('transient removal parks no raw draft and metadata targets reject caller coercion', () => {
  const studio = createStudio(), editing = createDraftCoordinator(studio), added = create(editing, studio);
  assert.equal(editing.role.create, undefined); assert.equal(editing.role.freshId, undefined);
  ok(editing.contribution.apply(added.token));
  const target = added.contributionId.replace('.create:', '.remove:'); ok(editing.contribution.begin(target, studio.read()));
  ok(editing.park()); assert.equal(editing.read().slots, 0);
  rejected(editing.role.begin({ toString() { assert.fail('caller coercion'); } }, studio.read()), 'reference');
  rejected(editing.contribution.create('team.create', studio.read()), 'target'); editing.dispose();
});

import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { LIMITS } from '../../collaboration/native-investment-studio/config.mjs';
import { createDraftCoordinator } from '../../collaboration/native-investment-studio/editing.mjs';
import { describeConnectionTarget } from '../../collaboration/native-investment-studio/command-draft.mjs';

const ok = result => { assert.equal(result.ok, true, result.error?.message); return result; };
const rejected = (result, code) => { assert.equal(result.ok, false); assert.equal(result.error.code, code); return result; };
function plan() {
  const value = createExamplePlan(); value.teams.push({ id: 'receiving', label: 'Receiving', personIds: ['product-one'], lifecycle: 'active' });
  return value;
}
function create(editing, studio) {
  const draft = ok(editing.connection.create('connection.create', studio.read())).view.draft;
  for (const [field, raw] of Object.entries({ senderTeamId: 'delivery', receiverTeamId: 'receiving', receiverPersonId: 'product-one',
    sharedObject: '  Review this plan  ', responseExpectation: 'Return decisions' })) ok(editing.connection.setText(draft.token, field, raw));
  ok(editing.connection.setIds(draft.token, 'workIds', ['review'])); return draft;
}
const connection = id => ({ id, senderTeamId: 'delivery', receiverTeamId: 'receiving', receiverPersonId: 'product-one',
  sharedObject: 'Imported object', responseExpectation: null, workIds: ['review'], status: 'active' });

test('connection selection shares the active lease and saved capacity with every existing draft family', () => {
  const studio = createStudio(plan()), editing = createDraftCoordinator(studio), connection = create(editing, studio);
  const role = ok(editing.role.begin('role.update:product-one', studio.read())).view.draft; ok(editing.role.setText(role.token, 'qualityId', 'independent-review'));
  const person = ok(editing.person.begin('product-one', studio.read())).view.draft; ok(editing.person.setText(person.token, 'ratePerHour', '105'));
  const session = ok(editing.session.begin('work.update:review', studio.read())).view.draft; ok(editing.session.setText(session.token, 'label', 'Revised session'));
  const purpose = ok(editing.purpose.begin('purpose', studio.read())).view.draft; ok(editing.purpose.setText(purpose.token, 'changedAbility', 'Find samples'));
  const contribution = ok(editing.contribution.create('contribution.create', studio.read())).view.draft;
  ok(editing.contribution.setText(contribution.token, 'categoryId', 'source-retrieval'));
  const assembly = ok(editing.assembly.begin('team.update:delivery', studio.read())).view.draft; ok(editing.assembly.setText(assembly.token, 'label', 'Renamed group'));
  const duration = ok(editing.work.begin('review', studio.read())).view.draft; ok(editing.work.setText(duration.token, 'minutesPerSession', '45'));
  assert.equal(editing.read().slots, 8); assert.equal(editing.read().active.kind, 'work');
  const parked = editing.read().parked.find(row => row.kind === 'connection');
  assert.deepEqual(parked.raw.workIds, ['review']); assert.ok(Object.isFrozen(parked.raw.workIds));
  assert.equal(Object.hasOwn(parked, 'projection'), false); assert.equal(Object.hasOwn(parked, 'baseProjection'), false);
  rejected(editing.connection.apply(connection.token), 'draft-token');
  const resumed = ok(editing.connection.begin(connection.connectionId, studio.read())).view.draft;
  assert.equal(editing.read().active.kind, 'connection'); assert.equal(editing.read().slots, 8); ok(editing.connection.apply(resumed.token));
  assert.equal(studio.read().result.plannedCommitmentCents, 120000);
  assert.equal(editing.role.read().status, 'stale'); assert.equal(editing.person.read().status, 'stale'); editing.dispose();
});

test('eight saved connections share the global limit while a fresh ID replaces one slot', () => {
  const studio = createStudio(plan()), editing = createDraftCoordinator(studio), targets = [];
  for (let index = 0; index < 8; index += 1) targets.push(create(editing, studio).connectionId);
  assert.equal(new Set(targets).size, 8); assert.equal(editing.read().slots, 8);
  rejected(editing.person.begin('product-one', studio.read()), 'draft-limit');
  ok(editing.park()); const old = editing.connection.read().draft;
  const fresh = ok(editing.connection.freshId(old.token, studio.read())).view.draft;
  assert.notEqual(fresh.connectionId, old.connectionId); assert.deepEqual(fresh.raw, old.raw); assert.equal(editing.read().slots, 8);
  rejected(editing.connection.apply(old.token), 'draft-token'); editing.dispose();
});

test('an imported identity collision preserves ordered work and text through deliberate fresh-ID recovery', () => {
  const studio = createStudio(plan()), editing = createDraftCoordinator(studio), draft = create(editing, studio);
  ok(editing.park()); const saved = editing.connection.read().draft, id = describeConnectionTarget(draft.connectionId).id;
  const value = structuredClone(studio.read().state); value.connections.push(connection(id)); ok(studio.replace(value, studio.read()));
  assert.equal(editing.connection.read().creationConflict, true);
  rejected(editing.connection.begin(draft.connectionId, studio.read()), 'review-required');
  rejected(editing.connection.review(saved.token, studio.read()), 'creation-conflict');
  const fresh = ok(editing.connection.freshId(saved.token, studio.read())).view.draft;
  assert.deepEqual(fresh.raw, saved.raw); ok(editing.connection.apply(fresh.token));
  assert.equal(studio.read().state.connections.find(row => row.id === id).sharedObject, 'Imported object');
  assert.equal(studio.read().state.connections.at(-1).sharedObject, 'Review this plan');
  assert.equal(studio.read().result.plannedCommitmentCents, 120000); editing.dispose();
});

test('stale review uses the displayed accepted identity and Use current restores all connection fields', () => {
  const studio = createStudio(plan()), editing = createDraftCoordinator(studio), added = create(editing, studio);
  ok(editing.connection.apply(added.token));
  const target = added.connectionId.replace('.create:', '.update:'), draft = ok(editing.connection.begin(target, studio.read())).view.draft;
  ok(editing.connection.setText(draft.token, 'sharedObject', 'Saved object')); ok(editing.connection.setText(draft.token, 'status', 'paused')); ok(editing.park());
  const shown = studio.read(), replacement = structuredClone(shown.state);
  replacement.connections[0] = { ...replacement.connections[0], sharedObject: 'New current object', responseExpectation: 'New current response', receiverPersonId: null, workIds: [] };
  ok(studio.replace(replacement, shown)); const saved = editing.connection.read().draft;
  rejected(editing.connection.review(saved.token, shown), 'stale-edit');
  assert.equal(editing.connection.read().draft.raw.sharedObject, 'Saved object');
  const reviewed = ok(editing.connection.review(saved.token, studio.read())).view.draft;
  assert.equal(reviewed.raw.sharedObject, 'Saved object'); assert.equal(reviewed.raw.status, 'paused');
  const current = ok(editing.connection.useCurrent(reviewed.token, studio.read())).view.draft;
  assert.deepEqual(current.raw, { senderTeamId: 'delivery', receiverTeamId: 'receiving', receiverPersonId: '', sharedObject: 'New current object',
    responseExpectation: 'New current response', workIds: [], status: 'active' });
  assert.equal(current.changed, false); ok(editing.connection.cancel(current.token)); editing.dispose();
});

test('removed connection targets retain visible raw values and global discard preserves another active edit', () => {
  const studio = createStudio(plan()), editing = createDraftCoordinator(studio), added = create(editing, studio); ok(editing.connection.apply(added.token));
  const target = added.connectionId.replace('.create:', '.update:'), draft = ok(editing.connection.begin(target, studio.read())).view.draft;
  ok(editing.connection.setText(draft.token, 'sharedObject', 'Keep this object')); ok(editing.park());
  const id = describeConnectionTarget(target).id; ok(studio.applyCommand({ type: 'connection.remove', connectionId: id }, studio.read()));
  const result = rejected(editing.connection.begin(target, studio.read()), 'review-required');
  assert.equal(result.view.draft.raw.sharedObject, 'Keep this object'); rejected(editing.connection.review(result.view.draft.token, studio.read()), 'reference');
  const savedToken = result.view.draft.token;
  const person = ok(editing.person.begin('product-one', studio.read())).view.draft; ok(editing.person.setText(person.token, 'ratePerHour', '105'));
  ok(editing.discard(savedToken)); assert.strictEqual(editing.person.read().draft.token, person.token);
  assert.equal(editing.person.read().draft.raw.ratePerHour, '105'); assert.equal(editing.read().slots, 1); editing.dispose();
});

test('review retains a now-invalid receiver until the visitor corrects its membership explicitly', () => {
  const studio = createStudio(plan()), editing = createDraftCoordinator(studio), draft = create(editing, studio); ok(editing.park());
  const replacement = structuredClone(studio.read().state); replacement.teams[1].personIds = [];
  ok(studio.replace(replacement, studio.read())); const saved = editing.connection.read().draft;
  const reviewed = ok(editing.connection.review(saved.token, studio.read())).view.draft;
  assert.equal(reviewed.raw.receiverPersonId, 'product-one'); rejected(editing.connection.preview(reviewed.token), 'team-membership');
  assert.equal(studio.read().state.connections.length, 0);
  ok(editing.connection.setText(reviewed.token, 'receiverPersonId', '')); ok(editing.connection.apply(reviewed.token));
  assert.equal(studio.read().state.connections[0].receiverPersonId, null); editing.dispose();
});

test('a full canonical collection holds creation before replacing an unrelated active lease', () => {
  const value = plan(); for (let index = 0; index < LIMITS.connections; index += 1) value.connections.push(connection(`connection-${index + 1}`));
  const studio = createStudio(value), editing = createDraftCoordinator(studio);
  const role = ok(editing.role.begin('role.update:product-one', studio.read())).view.draft;
  ok(editing.role.setText(role.token, 'decisionId', 'recommends'));
  rejected(editing.connection.create('connection.create', studio.read()), 'collection');
  assert.strictEqual(editing.role.read().draft.token, role.token); assert.equal(editing.read().active.kind, 'role');
  assert.equal(editing.read().slots, 1); editing.dispose();
});

test('connection reflection holds competing operations and disposal retires its single lease', () => {
  const studio = createStudio(plan()), editing = createDraftCoordinator(studio), draft = create(editing, studio); let nested;
  const ids = new Proxy(['review'], { ownKeys(target) { nested = editing.role.begin('role.update:product-one', studio.read()); return Reflect.ownKeys(target); } });
  ok(editing.connection.setIds(draft.token, 'workIds', ids)); rejected(nested, 'settling');
  assert.equal(editing.read().active.kind, 'connection'); assert.deepEqual(editing.connection.read().draft.raw.workIds, ['review']);
  const before = studio.read(); editing.dispose(); rejected(editing.connection.apply(draft.token), 'disposed');
  assert.equal(editing.read().selected.connection, null); assert.strictEqual(studio.read(), before);
});

test('transient removal holds no saved slot and connection targets reject cross-family or coercible inputs', () => {
  const studio = createStudio(plan()), editing = createDraftCoordinator(studio), added = create(editing, studio); ok(editing.connection.apply(added.token));
  ok(editing.connection.begin(added.connectionId.replace('.create:', '.remove:'), studio.read())); ok(editing.park());
  assert.equal(editing.read().slots, 0);
  rejected(editing.connection.create('contribution.create', studio.read()), 'target');
  rejected(editing.connection.begin('contribution.update:other', studio.read()), 'reference');
  rejected(editing.connection.begin({ toString() { assert.fail('coercion'); } }, studio.read()), 'reference'); editing.dispose();
});

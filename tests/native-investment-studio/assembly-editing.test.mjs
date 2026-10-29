import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createDraftCoordinator } from '../../collaboration/native-investment-studio/editing.mjs';
import { describeAssemblyTarget } from '../../collaboration/native-investment-studio/command-draft.mjs';
const unassignedRole = () => ({ functionId: null, seniorityId: null, postureId: null, enablerId: null,
  change: null, qualityId: null, aiId: null, decisionId: null });


function setup(options = {}) { const studio = createStudio(); return { studio, editing: createDraftCoordinator(studio, options) }; }
function created(editing, studio, form) {
  const result = editing.assembly.create(form, studio.read()); assert.equal(result.ok, true, result.error?.message); return result.view.draft;
}
function rejected(result, code) { assert.equal(result.ok, false); assert.equal(result.error.code, code); return result; }

test('assembly creation parks alongside numeric and purpose drafts with stable IDs and detached ordered selections', () => {
  const { studio, editing } = setup();
  const team = created(editing, studio, 'team.create');
  editing.assembly.setText(team.token, 'label', 'Design');
  const ids = ['engineering-two', 'product-one'];
  editing.assembly.setIds(team.token, 'personIds', ids); ids.reverse();
  const intent = editing.read().intent;
  editing.park();
  const saved = editing.read().parked[0];
  assert.equal(saved.targetId, team.assemblyId);
  assert.deepEqual(saved.raw.personIds, ['engineering-two', 'product-one']);
  assert.ok(Object.isFrozen(saved.raw.personIds));
  assert.equal(Object.hasOwn(saved, 'projection'), false);
  assert.equal(Object.hasOwn(saved, 'baseProjection'), false);
  assert.equal(saved.targetExists, true);
  assert.strictEqual(editing.read().intent, intent);
  const work = editing.work.begin('review', studio.read()).view.draft;
  editing.work.setText(work.token, 'minutesPerSession', '45');
  const purpose = editing.purpose.begin('purpose', studio.read()).view.draft;
  editing.purpose.setText(purpose.token, 'changedAbility', 'Find samples');
  const resumed = editing.assembly.begin(team.assemblyId, studio.read());
  assert.equal(resumed.ok, true);
  assert.equal(resumed.view.draft.assemblyId, team.assemblyId);
  assert.deepEqual(resumed.view.draft.raw, saved.raw);
  assert.equal(editing.read().active.kind, 'assembly');
  assert.equal(editing.read().slots, 3);
  rejected(editing.assembly.apply(team.token), 'draft-token');
  assert.equal(editing.assembly.apply(resumed.view.draft.token).ok, true);
  assert.deepEqual(studio.read().state.teams.at(-1).personIds, ['engineering-two', 'product-one']);
  assert.equal(editing.work.read().status, 'stale');
  assert.equal(editing.purpose.read().status, 'stale');
});

test('all eight creation slots remain available for parking while a ninth creation is held', () => {
  const { studio, editing } = setup();
  const targets = [];
  for (let index = 0; index < 8; index += 1) {
    const draft = created(editing, studio, 'person.create'); targets.push(draft.assemblyId);
    editing.assembly.setText(draft.token, 'label', `Person ${index}`);
  }
  assert.equal(new Set(targets).size, 8);
  assert.equal(editing.read().slots, 8);
  rejected(editing.assembly.create('team.create', studio.read()), 'draft-limit');
  assert.equal(editing.park().ok, true);
  assert.equal(editing.read().parked.length, 8);
  assert.equal(editing.read().active, null);
  const last = editing.assembly.read().draft;
  const refreshed = editing.assembly.freshId(last.token, studio.read());
  assert.equal(refreshed.ok, true);
  assert.notEqual(refreshed.view.draft.assemblyId, last.assemblyId);
  assert.equal(refreshed.view.draft.raw.label, 'Person 7');
  assert.equal(editing.read().slots, 8);
  assert.equal(editing.read().parked.length, 7);
});

test('imported creation collision retains all raw data until explicit fresh-ID recovery', () => {
  const { studio, editing } = setup();
  const draft = created(editing, studio, 'person.create');
  for (const [field, raw] of Object.entries({ label: 'Ada', ratePerHour: '00120.00', fundedHours: '2', fundedMinutes: '0' })) editing.assembly.setText(draft.token, field, raw);
  editing.park();
  const before = editing.assembly.read().draft;
  const id = describeAssemblyTarget(draft.assemblyId).id;
  const replacement = structuredClone(studio.read().state);
  replacement.people.push({ id, label: 'Imported person', fundedMinutes: 0, rateCentsPerHour: 0, role: unassignedRole(), lifecycle: 'active' });
  studio.replace(replacement, studio.read());
  assert.equal(editing.assembly.read().status, 'stale');
  assert.equal(editing.assembly.read().creationConflict, true);
  assert.equal(editing.read().parked[0].creationConflict, true);
  rejected(editing.assembly.begin(draft.assemblyId, studio.read()), 'review-required');
  rejected(editing.assembly.review(before.token, studio.read()), 'creation-conflict');
  assert.deepEqual(editing.assembly.read().draft.raw, before.raw);
  const recovered = editing.assembly.freshId(before.token, studio.read());
  assert.equal(recovered.ok, true);
  assert.equal(recovered.view.creationConflict, false);
  assert.deepEqual(recovered.view.draft.raw, before.raw);
  assert.notEqual(recovered.view.draft.assemblyId, draft.assemblyId);
  rejected(editing.assembly.apply(before.token), 'draft-token');
  assert.equal(editing.assembly.apply(recovered.view.draft.token).ok, true);
  assert.equal(studio.read().result.knownCommitmentCents, 144000);
  assert.equal(studio.read().state.people.find(row => row.id === id).label, 'Imported person');
  assert.equal(studio.read().state.people.at(-1).label, 'Ada');
});

test('stale team selection review and current values preserve their separate ownership choices', () => {
  const { studio, editing } = setup();
  let draft = editing.assembly.begin('team.update:delivery', studio.read()).view.draft;
  editing.assembly.setText(draft.token, 'label', 'Typed label');
  editing.assembly.setIds(draft.token, 'personIds', [...studio.read().state.teams[0].personIds].reverse());
  editing.park();
  studio.updatePurpose({ ...studio.read().state.purpose, changedAbility: 'New accepted purpose' }, studio.read());
  draft = editing.assembly.read().draft;
  const reviewed = editing.assembly.review(draft.token, studio.read());
  assert.equal(reviewed.ok, true);
  assert.equal(reviewed.view.draft.raw.label, 'Typed label');
  assert.equal(editing.assembly.preview(reviewed.view.draft.token).projection.result.knownCommitmentCents, 120000);
  const current = editing.assembly.useCurrent(reviewed.view.draft.token, studio.read());
  assert.equal(current.ok, true);
  assert.equal(current.view.draft.raw.label, 'Product and Engineering');
  assert.deepEqual(current.view.draft.raw.personIds, studio.read().state.teams[0].personIds);
  assert.equal(current.view.draft.changed, false);
});

test('removed team keeps saved text for global discard while transient removal intent releases its slot', () => {
  const { studio, editing } = setup();
  const draft = editing.assembly.begin('team.update:delivery', studio.read()).view.draft;
  editing.assembly.setText(draft.token, 'label', 'Saved label'); editing.park();
  const replacement = structuredClone(studio.read().state);
  replacement.teams = []; replacement.work = []; replacement.practices = [];
  studio.replace(replacement, studio.read());
  assert.equal(editing.assembly.read().draft.raw.label, 'Saved label');
  assert.equal(editing.read().parked[0].targetExists, false);
  rejected(editing.assembly.review(editing.assembly.read().draft.token, studio.read()), 'reference');
  assert.equal(editing.discard(editing.assembly.read().draft.token).ok, true);
  const removal = editing.assembly.begin('person.remove:product-one', studio.read());
  assert.equal(removal.ok, true);
  assert.equal(editing.assembly.preview(removal.view.draft.token).ok, true);
  editing.park();
  assert.equal(editing.read().slots, 0);
  assert.equal(studio.read().state.people.length, 4);
});

test('selecting an unselected removed team exposes its saved raw values and parks the other edit', () => {
  const { studio, editing } = setup();
  const draft = editing.assembly.begin('team.update:delivery', studio.read()).view.draft;
  editing.assembly.setText(draft.token, 'label', 'Saved team'); editing.park();
  const replacement = structuredClone(studio.read().state);
  replacement.teams = []; replacement.work = []; replacement.practices = [];
  studio.replace(replacement, studio.read());
  const other = created(editing, studio, 'person.create');
  editing.assembly.setText(other.token, 'label', 'Another edit');
  const selected = rejected(editing.assembly.begin('team.update:delivery', studio.read()), 'review-required');
  assert.equal(selected.view.draft.assemblyId, 'team.update:delivery');
  assert.equal(selected.view.draft.raw.label, 'Saved team');
  assert.equal(editing.read().active, null);
  assert.equal(editing.read().parked.length, 2);
  assert.equal(editing.read().parked.find(row => row.targetId === other.assemblyId).raw.label, 'Another edit');
  rejected(editing.assembly.review(selected.view.draft.token, studio.read()), 'reference');
  assert.equal(editing.assembly.cancel(selected.view.draft.token).ok, true);
  assert.equal(editing.read().slots, 1);
});

test('setIds reflection keeps coordinator settlement singular and retires raw intent only for an admitted change', () => {
  const { studio, editing } = setup();
  const draft = editing.assembly.begin('team.update:delivery', studio.read()).view.draft;
  const intent = editing.read().intent;
  let nested;
  const ids = new Proxy([...draft.raw.personIds].reverse(), { ownKeys(target) {
    nested = editing.assembly.freshId(draft.token, studio.read()); return Reflect.ownKeys(target);
  } });
  assert.equal(editing.assembly.setIds(draft.token, 'personIds', ids).ok, true);
  rejected(nested, 'settling');
  assert.notStrictEqual(editing.read().intent, intent);
  const after = editing.read().intent;
  editing.assembly.setIds(draft.token, 'personIds', [...draft.raw.personIds].reverse());
  assert.strictEqual(editing.read().intent, after);
});

test('fresh-ID settlement blocks reentry while preserving collision raw data and the sole active lease', () => {
  const owner = createStudio();
  let callback = null, editing, nested;
  const studio = { ...owner, read() { const action = callback; callback = null; action?.(); return owner.read(); } };
  editing = createDraftCoordinator(studio);
  const draft = created(editing, studio, 'team.create');
  editing.assembly.setText(draft.token, 'label', 'Typed team');
  const expected = owner.read();
  callback = () => { nested = editing.assembly.cancel(draft.token); };
  const result = editing.assembly.freshId(draft.token, expected);
  rejected(nested, 'settling');
  assert.equal(result.ok, true);
  assert.equal(result.view.draft.raw.label, 'Typed team');
  assert.equal(editing.read().slots, 1);
  assert.equal(editing.read().parked.length, 0);
  assert.equal(editing.read().active.kind, 'assembly');
});

test('assembly dispose retires all tokens and fresh coordinator construction preserves accepted state', () => {
  const { studio, editing } = setup();
  const draft = created(editing, studio, 'team.create');
  editing.assembly.setText(draft.token, 'label', 'Saved'); editing.park();
  const disposed = editing.dispose();
  assert.equal(disposed.slots, 0);
  assert.equal(disposed.selected.assembly, null);
  rejected(editing.assembly.freshId(draft.token, studio.read()), 'disposed');
  const fresh = createDraftCoordinator(studio);
  assert.equal(fresh.read().slots, 0);
  assert.equal(studio.read().state.teams.length, 1);
});

test('assembly targets stay scalar and caller coercion remains outside admission', () => {
  const { studio, editing } = setup();
  let coercions = 0;
  const target = { toString() { coercions += 1; return 'team.update:delivery'; } };
  rejected(editing.assembly.begin(target, studio.read()), 'reference');
  rejected(editing.assembly.create(target, studio.read()), 'target');
  assert.equal(coercions, 0);
  assert.equal(editing.read().slots, 0);
});

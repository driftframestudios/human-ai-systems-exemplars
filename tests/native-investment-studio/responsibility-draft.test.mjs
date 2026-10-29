import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { LIMITS } from '../../collaboration/native-investment-studio/config.mjs';
import { createRoleDraftAdapter, createContributionDraftAdapter, ROLE_FORMS, CONTRIBUTION_FORMS,
  makeRoleTarget, makeContributionTarget, describeRoleTarget, describeContributionTarget } from '../../collaboration/native-investment-studio/command-draft.mjs';

const roleRaw = Object.freeze({ functionId: 'engineering', seniorityId: 'principal-plus', postureId: 'player-coach',
  enablerId: 'protected-focus-time', change: 'npt:collective-action', qualityId: 'independent-review',
  aiId: 'receives-reviews', decisionId: 'recommends' });
const expectedRole = Object.freeze({ functionId: 'engineering', seniorityId: 'principal-plus', postureId: 'player-coach',
  enablerId: 'protected-focus-time', change: { frameworkId: 'npt', componentId: 'collective-action' },
  qualityId: 'independent-review', aiId: 'receives-reviews', decisionId: 'recommends' });
const ok = result => { assert.equal(result.ok, true, result.error?.message); return result; };
const rejected = (result, code) => { assert.equal(result.ok, false); assert.equal(result.error.code, code); return result; };
const openRole = (editor, studio) => ok(editor.begin(makeRoleTarget('role.update', 'product-one'), studio.read())).view.draft.token;
const openContribution = (editor, studio, form = 'contribution.create', id = 'output') => ok(editor.begin(makeContributionTarget(form, id), studio.read())).view.draft.token;
const set = (editor, token, fields) => { for (const [field, raw] of Object.entries(fields)) ok(editor.setText(token, field, raw)); };
function addContribution(studio, id = 'output') {
  const editor = createContributionDraftAdapter(studio), token = openContribution(editor, studio, 'contribution.create', id);
  set(editor, token, { categoryId: 'source-retrieval', receiverPersonId: 'product-one', reviewBoundary: 'Check sources' });
  ok(editor.setIds(token, 'workIds', ['review'])); ok(editor.apply(token)); return studio.read().state.contributions.at(-1);
}

test('role and contribution forms have finite distinct identities and bounded fields', () => {
  assert.deepEqual(Object.keys(ROLE_FORMS), ['role.update']);
  assert.deepEqual(Object.keys(CONTRIBUTION_FORMS), ['contribution.create', 'contribution.update', 'contribution.remove']);
  assert.deepEqual(Object.keys(ROLE_FORMS['role.update'].fields), Object.keys(roleRaw));
  assert.equal(ROLE_FORMS['role.update'].fields.change.maxLength, 129);
  assert.equal(CONTRIBUTION_FORMS['contribution.create'].fields.workIds.maxItems, 256);
  assert.equal(CONTRIBUTION_FORMS['contribution.create'].fields.reviewBoundary.maxLength, 600);
  assert.equal(describeRoleTarget('role.update:product-one').collection, 'people');
  assert.equal(describeContributionTarget('contribution.update:output').collection, 'contributions');
  for (const target of ['role.create:product-one', 'person.role.replace:product-one', 'contribution.create:output', null]) assert.equal(describeRoleTarget(target), null);
  for (const target of ['role.update:product-one', 'contribution.update:Bad', 'contribution.update:a:b', null]) assert.equal(describeContributionTarget(target), null);
  assert.throws(() => makeRoleTarget('role.update', { toString() { assert.fail('caller coercion'); } }), TypeError);
});

test('one role Apply carries every field and its atomic change reference without changing money or capacity', () => {
  const studio = createStudio(), before = studio.read(), editor = createRoleDraftAdapter(studio), token = openRole(editor, studio);
  assert.deepEqual(editor.read().draft.raw, Object.fromEntries(Object.keys(roleRaw).map(field => [field, ''])));
  set(editor, token, roleRaw); const preview = ok(editor.preview(token));
  assert.deepEqual(preview.projection.state.people[0].role, expectedRole);
  assert.strictEqual(studio.read(), before); ok(editor.apply(token));
  assert.deepEqual(studio.read().state.people[0].role, expectedRole);
  assert.equal(studio.read().result.knownCommitmentCents, 120000);
  assert.deepEqual(studio.read().result.capacity, before.result.capacity);
  assert.deepEqual(JSON.parse(studio.read().serialized).people[0].role, expectedRole);
  assert.equal(editor.read().draft, null);
});

test('role selectors retain invalid text and clear all fields explicitly to unassigned', () => {
  const studio = createStudio(), editor = createRoleDraftAdapter(studio); let token = openRole(editor, studio);
  for (const [field, raw] of [['functionId', 'unknown'], ['change', 'npt:urgency'], ['change', 'npt:collective-action:extra']]) {
    set(editor, token, { [field]: raw }); rejected(editor.preview(token), 'choice');
    assert.equal(editor.read().draft.raw[field], raw); set(editor, token, { [field]: '' });
  }
  rejected(editor.setText(token, 'change', 'x'.repeat(130)), 'text');
  rejected(editor.setText(token, 'functionId', null), 'text');
  rejected(editor.setText(token, 'constructor', 'x'), 'field');
  set(editor, token, roleRaw); ok(editor.apply(token)); token = openRole(editor, studio);
  set(editor, token, Object.fromEntries(Object.keys(roleRaw).map(field => [field, '']))); ok(editor.apply(token));
  assert.deepEqual(studio.read().state.people[0].role, Object.fromEntries(Object.keys(roleRaw).map(field => [field, null])));
});

test('role no-op preserves exact acceptance at the revision ceiling and across Redo', () => {
  const plan = createExamplePlan(); plan.revision = LIMITS.revision;
  const studio = createStudio(plan), editor = createRoleDraftAdapter(studio), before = studio.read(), marker = studio.readAcceptance();
  let token = openRole(editor, studio); assert.equal(editor.read().draft.changed, false);
  assert.strictEqual(ok(editor.preview(token)).projection, before); ok(editor.apply(token));
  assert.strictEqual(studio.read(), before); assert.strictEqual(studio.readAcceptance(), marker);
  const normal = createStudio(), other = createRoleDraftAdapter(normal);
  token = openRole(other, normal); set(other, token, { functionId: 'engineering' }); ok(other.apply(token)); ok(normal.undo(normal.read()));
  const history = normal.readHistory(), accepted = normal.read(); token = openRole(other, normal); ok(other.apply(token));
  assert.strictEqual(normal.read(), accepted); assert.deepEqual(normal.readHistory(), history); assert.equal(history.redoCount, 1);
});

test('role proposals own their nested change object across facade retention and cached preview', () => {
  const studio = createStudio(); let held, calls = 0;
  const editor = createRoleDraftAdapter({ ...studio, previewCommand(command, expected) {
    calls += 1; held = command; const result = studio.previewCommand(command, expected); command.role.change.componentId = 'coherence'; return result;
  } });
  const token = openRole(editor, studio); set(editor, token, roleRaw);
  const first = ok(editor.preview(token)).projection; held.role.change.frameworkId = 'kotter';
  assert.strictEqual(ok(editor.preview(token)).projection, first); assert.equal(calls, 1);
  assert.equal(editor.read().draft.raw.change, 'npt:collective-action'); ok(editor.apply(token));
  assert.deepEqual(studio.read().state.people[0].role.change, { frameworkId: 'npt', componentId: 'collective-action' });
});

test('all six contribution categories retain human identities and literal unchanged investment', () => {
  const categories = ['scenario-generation', 'source-retrieval', 'dependency-mapping', 'draft-artifacts', 'cross-source-synthesis', 'transparent-calculation'];
  const studio = createStudio(), before = studio.read(), editor = createContributionDraftAdapter(studio);
  for (const [index, categoryId] of categories.entries()) {
    const token = openContribution(editor, studio, 'contribution.create', `output-${index}`);
    rejected(editor.preview(token), 'choice');
    set(editor, token, { categoryId, receiverPersonId: 'product-one', decisionOwnerPersonId: 'engineering-two',
      reviewBoundary: '  Check sources  ', decisionBoundary: 'Approve the plan' });
    ok(editor.setIds(token, 'workIds', ['review'])); assert.equal(ok(editor.preview(token)).projection.result.knownCommitmentCents, 120000);
    ok(editor.apply(token));
  }
  assert.deepEqual(studio.read().state.contributions.map(row => row.categoryId), categories);
  assert.deepEqual(studio.read().state.contributions[0], { id: 'output-0', categoryId: 'scenario-generation', receiverPersonId: 'product-one',
    decisionOwnerPersonId: 'engineering-two', workIds: ['review'], reviewBoundary: 'Check sources', decisionBoundary: 'Approve the plan' });
  assert.equal(studio.read().result.knownCommitmentCents, 120000); assert.deepEqual(studio.read().result.capacity, before.result.capacity);
  assert.deepEqual(JSON.parse(studio.read().serialized).contributions, studio.read().state.contributions);
  ok(studio.updatePerson('product-one', { ...studio.read().state.people[0], label: 'Renamed receiver' }, studio.read()));
  ok(studio.applyCommand({ type: 'person.lifecycle.set', personId: 'product-one', lifecycle: 'retired' }, studio.read()));
  const token = openContribution(editor, studio, 'contribution.update', 'output-0');
  assert.equal(editor.read().draft.raw.receiverPersonId, 'product-one');
  assert.equal(editor.read().draft.changed, false); ok(editor.apply(token));
  assert.equal(studio.read().state.people[0].lifecycle, 'retired');
  assert.equal(studio.read().state.contributions[0].receiverPersonId, 'product-one');
  assert.equal(studio.read().result.knownCommitmentCents, 120000); assert.deepEqual(studio.read().result.capacity, before.result.capacity);
});

test('contribution nulls, empty raw text and bounded text preserve their distinct admission jobs', () => {
  const studio = createStudio(), editor = createContributionDraftAdapter(studio), token = openContribution(editor, studio);
  set(editor, token, { categoryId: 'draft-artifacts', reviewBoundary: '   ', decisionBoundary: '' });
  rejected(editor.setText(token, 'reviewBoundary', ' '.repeat(601)), 'text');
  rejected(editor.setText(token, 'receiverPersonId', null), 'text');
  rejected(editor.setText(token, 'workIds', 'review'), 'field');
  set(editor, token, { reviewBoundary: '0' });
  let preview = ok(editor.preview(token)).projection;
  assert.equal(preview.state.contributions[0].reviewBoundary, '0');
  assert.equal(preview.state.contributions[0].decisionBoundary, null);
  set(editor, token, { reviewBoundary: '   ' }); ok(editor.apply(token));
  assert.deepEqual(studio.read().state.contributions[0], { id: 'output', categoryId: 'draft-artifacts', receiverPersonId: null,
    decisionOwnerPersonId: null, workIds: [], reviewBoundary: null, decisionBoundary: null });
});

test('ordered supporting work is detached from caller arrays and retained facade proposals', () => {
  const studio = createStudio(); ok(studio.applyCommand({ type: 'work.create', work: { ...studio.read().state.work[0], id: 'other' } }, studio.read()));
  let calls = 0, held;
  const editor = createContributionDraftAdapter({ ...studio, previewCommand(command, expected) {
    calls += 1; held = command; const result = studio.previewCommand(command, expected); command.contribution.workIds.reverse(); return result;
  } });
  const token = openContribution(editor, studio), ids = ['other', 'review'];
  set(editor, token, { categoryId: 'transparent-calculation' }); ok(editor.setIds(token, 'workIds', ids)); ids.reverse();
  const first = ok(editor.preview(token)).projection; held.contribution.workIds.push('missing');
  assert.strictEqual(ok(editor.preview(token)).projection, first); assert.equal(calls, 1);
  assert.deepEqual(editor.read().draft.raw.workIds, ['other', 'review']);
  set(editor, token, { reviewBoundary: 'Check totals' }); ok(editor.preview(token)); assert.equal(calls, 2);
  ok(editor.apply(token)); assert.deepEqual(studio.read().state.contributions[0].workIds, ['other', 'review']);
  assert.equal(studio.read().result.knownCommitmentCents, 240000);
});

test('missing people and work hold accepted state while retained raw values remain correctable', () => {
  const studio = createStudio(), before = studio.read(), editor = createContributionDraftAdapter(studio), token = openContribution(editor, studio);
  set(editor, token, { categoryId: 'source-retrieval', receiverPersonId: 'missing' }); rejected(editor.apply(token), 'reference');
  assert.strictEqual(studio.read(), before); assert.equal(editor.read().draft.raw.receiverPersonId, 'missing');
  set(editor, token, { receiverPersonId: '' }); ok(editor.setIds(token, 'workIds', ['missing'])); rejected(editor.preview(token), 'reference');
  rejected(editor.setIds(token, 'workIds', ['review', 'review']), 'duplicate-reference');
  rejected(editor.setIds(token, 'workIds', Array.from({ length: 257 }, (_, index) => `work-${index}`)), 'collection');
  ok(editor.setIds(token, 'workIds', [])); ok(editor.apply(token));
});

test('contribution update canonical no-op preserves Redo and removal retires only the named record', () => {
  const studio = createStudio(); addContribution(studio); addContribution(studio, 'other'); ok(studio.undo(studio.read()));
  const editor = createContributionDraftAdapter(studio), before = studio.read(), history = studio.readHistory();
  let token = openContribution(editor, studio, 'contribution.update'); set(editor, token, { reviewBoundary: '  Check sources  ' });
  assert.equal(editor.read().draft.changed, false); ok(editor.apply(token)); assert.strictEqual(studio.read(), before); assert.deepEqual(studio.readHistory(), history);
  token = openContribution(editor, studio, 'contribution.remove'); ok(editor.apply(token));
  assert.deepEqual(studio.read().state.contributions, []); assert.equal(studio.read().result.knownCommitmentCents, 120000);
});

test('reflection and preview callbacks preserve the newer responsibility editor and diagnostic', () => {
  const studio = createStudio(); let editor, token, replacement;
  editor = createContributionDraftAdapter({ ...studio, previewCommand(command, expected) {
    const result = studio.previewCommand(command, expected); ok(editor.cancel(token)); replacement = openContribution(editor, studio, 'contribution.create', 'newer');
    rejected(editor.setText(replacement, 'reviewBoundary', 'x'.repeat(601)), 'text'); return result;
  } });
  token = openContribution(editor, studio); set(editor, token, { categoryId: 'source-retrieval' });
  const ids = new Proxy(['review'], { ownKeys(target) { set(editor, token, { reviewBoundary: 'Newer text' }); return Reflect.ownKeys(target); } });
  rejected(editor.setIds(token, 'workIds', ids), 'draft-changed'); assert.deepEqual(editor.read().draft.raw.workIds, []);
  rejected(editor.preview(token), 'draft-token'); assert.strictEqual(editor.read().draft.token, replacement); assert.equal(editor.read().error.code, 'text');
});

for (const accepted of [true, false]) test(`${accepted ? 'accepted' : 'held'} responsibility publication preserves replacement diagnostics`, () => {
  const studio = createStudio(); let editor, token, replacement;
  editor = createRoleDraftAdapter({ ...studio, applyCommand(command, expected) {
    const result = accepted ? studio.applyCommand(command, expected) : { ok: false, error: { code: 'held', path: 'command', message: 'Try again.' } };
    ok(editor.cancel(token)); replacement = openRole(editor, studio);
    rejected(editor.setText(replacement, 'functionId', 'x'.repeat(65)), 'text'); return result;
  } });
  token = openRole(editor, studio); set(editor, token, roleRaw);
  assert.equal(editor.apply(token).ok, accepted); assert.strictEqual(editor.read().draft.token, replacement); assert.equal(editor.read().error.code, 'text');
});

test('successful role publication retains a newer raw edit on the same token', () => {
  const studio = createStudio(); let editor, token;
  editor = createRoleDraftAdapter({ ...studio, applyCommand(command, expected) {
    const result = studio.applyCommand(command, expected); set(editor, token, { change: 'kotter:vision' }); return result;
  } });
  token = openRole(editor, studio); set(editor, token, roleRaw); ok(editor.apply(token));
  assert.deepEqual(studio.read().state.people[0].role.change, { frameworkId: 'npt', componentId: 'collective-action' });
  assert.equal(editor.read().draft.raw.change, 'kotter:vision'); assert.equal(editor.read().status, 'stale'); rejected(editor.apply(token), 'stale-edit');
});

import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { LIMITS } from '../../collaboration/native-investment-studio/config.mjs';
import { CONNECTION_FORMS, createConnectionDraftAdapter, makeConnectionTarget, describeConnectionTarget,
  copyConnectionRaw, sameConnectionRaw } from '../../collaboration/native-investment-studio/command-draft.mjs';

const ok = result => { assert.equal(result.ok, true, result.error?.message); return result; };
const rejected = (result, code) => { assert.equal(result.ok, false); assert.equal(result.error.code, code); return result; };
const rawFields = { senderTeamId: 'delivery', receiverTeamId: 'receiving', receiverPersonId: 'product-one',
  sharedObject: '  Reviewed plan  ', responseExpectation: '  Respond after review  ', status: 'active' };
function plan() {
  const value = createExamplePlan();
  value.teams.push({ id: 'receiving', label: 'Receiving', personIds: ['product-one'], lifecycle: 'active' });
  return value;
}
const open = (editor, studio, form = 'connection.create', id = 'handoff') => ok(editor.begin(makeConnectionTarget(form, id), studio.read())).view.draft.token;
const set = (editor, token, fields) => { for (const [field, value] of Object.entries(fields)) ok(editor.setText(token, field, value)); };
function fill(editor, token) { set(editor, token, rawFields); ok(editor.setIds(token, 'workIds', ['review'])); }
function accepted(studio, id = 'handoff') {
  const editor = createConnectionDraftAdapter(studio), token = open(editor, studio, 'connection.create', id);
  fill(editor, token); ok(editor.apply(token)); return studio.read();
}

test('the connection family carries three finite forms and one bounded ordered raw shape', () => {
  assert.deepEqual(Object.keys(CONNECTION_FORMS), ['connection.create', 'connection.update', 'connection.remove']);
  const fields = CONNECTION_FORMS['connection.create'].fields;
  assert.deepEqual(Object.keys(fields), ['senderTeamId', 'receiverTeamId', 'receiverPersonId', 'sharedObject', 'responseExpectation', 'workIds', 'status']);
  assert.deepEqual([fields.senderTeamId.maxLength, fields.sharedObject.maxLength, fields.workIds.maxItems, fields.status.maxLength], [64, 600, 256, 16]);
  assert.deepEqual(fields.status.choices, ['active', 'paused']); assert.ok(Object.isFrozen(fields));
  assert.equal(describeConnectionTarget('connection.update:handoff').collection, 'connections');
  for (const target of ['contribution.update:handoff', 'connection.status.set:handoff', 'connection.update:Bad', 'connection.update:a:b', null]) assert.equal(describeConnectionTarget(target), null);
  assert.throws(() => makeConnectionTarget('connection.create', { toString() { assert.fail('coercion'); } }), TypeError);
});

test('one complete connection publishes its explicit receiver and references while preserving literal investment', () => {
  const studio = createStudio(plan()), before = studio.read(), editor = createConnectionDraftAdapter(studio), token = open(editor, studio);
  assert.deepEqual(editor.read().draft.raw, { senderTeamId: '', receiverTeamId: '', receiverPersonId: '', sharedObject: '', responseExpectation: '', workIds: [], status: 'active' });
  rejected(editor.preview(token), 'reference'); fill(editor, token);
  const preview = ok(editor.preview(token)).projection;
  assert.deepEqual(preview.state.connections, [{ id: 'handoff', senderTeamId: 'delivery', receiverTeamId: 'receiving', receiverPersonId: 'product-one',
    sharedObject: 'Reviewed plan', responseExpectation: 'Respond after review', workIds: ['review'], status: 'active' }]);
  assert.strictEqual(studio.read(), before); assert.equal(preview.result.plannedCommitmentCents, 120000);
  assert.deepEqual(preview.result.capacity, before.result.capacity); ok(editor.apply(token));
  assert.deepEqual(studio.read().state.connections, preview.state.connections);
  assert.equal(studio.readHistory().undoCount, 1); assert.equal(editor.read().draft, null);
  assert.deepEqual(JSON.parse(studio.exportText()).connections, preview.state.connections);
});

test('optional blank fields, literal zero text and exact text limits preserve distinct meanings', () => {
  const studio = createStudio(plan()), editor = createConnectionDraftAdapter(studio), token = open(editor, studio);
  fill(editor, token); set(editor, token, { receiverPersonId: '', responseExpectation: '  ', sharedObject: '0' });
  let preview = ok(editor.preview(token)).projection.state.connections[0];
  assert.equal(preview.receiverPersonId, null); assert.equal(preview.responseExpectation, null); assert.equal(preview.sharedObject, '0');
  rejected(editor.setText(token, 'sharedObject', ' '.repeat(601)), 'text');
  rejected(editor.setText(token, 'responseExpectation', 'x'.repeat(601)), 'text');
  rejected(editor.setText(token, 'receiverPersonId', null), 'text');
  set(editor, token, { responseExpectation: '0', sharedObject: 'x'.repeat(600) });
  preview = ok(editor.preview(token)).projection.state.connections[0];
  assert.equal(preview.sharedObject.length, 600); assert.equal(preview.responseExpectation, '0');
  set(editor, token, { sharedObject: '   ' }); rejected(editor.preview(token), 'relationship-text');
  assert.equal(editor.read().draft.raw.sharedObject, '   '); assert.equal(studio.read().state.connections.length, 0);
});

test('changing the receiving team retains its named person until an explicit membership correction', () => {
  const value = plan(); value.teams.push({ id: 'other', label: 'Other', personIds: ['engineering-one'], lifecycle: 'active' });
  const studio = createStudio(value), editor = createConnectionDraftAdapter(studio), token = open(editor, studio);
  fill(editor, token); set(editor, token, { receiverTeamId: 'other' });
  rejected(editor.preview(token), 'team-membership'); assert.equal(editor.read().draft.raw.receiverPersonId, 'product-one');
  assert.equal(editor.read().draft.raw.receiverTeamId, 'other');
  set(editor, token, { receiverPersonId: 'engineering-one' }); ok(editor.apply(token));
  assert.equal(studio.read().state.connections[0].receiverPersonId, 'engineering-one');
  assert.equal(studio.read().result.plannedCommitmentCents, 120000);
});

test('status, endpoints and missing supporting records hold the accepted state with retained correctable raw values', () => {
  const studio = createStudio(plan()), editor = createConnectionDraftAdapter(studio), token = open(editor, studio), before = studio.read();
  fill(editor, token);
  for (const [field, value, code] of [['senderTeamId', 'missing', 'reference'], ['receiverPersonId', 'missing', 'reference'],
    ['receiverTeamId', 'delivery', 'connection-endpoints'], ['status', 'scheduled', 'choice']]) {
    set(editor, token, { [field]: value }); rejected(editor.preview(token), code);
    assert.equal(editor.read().draft.raw[field], value); assert.strictEqual(studio.read(), before);
    set(editor, token, { [field]: rawFields[field] });
  }
  ok(editor.setIds(token, 'workIds', ['missing'])); rejected(editor.apply(token), 'reference');
  assert.deepEqual(editor.read().draft.raw.workIds, ['missing']); assert.strictEqual(studio.read(), before);
});

test('supporting work arrays remain owned across caller mutation, cached preview and retained facade commands', () => {
  const value = plan(); value.work.push({ ...value.work[0], id: 'other', minutesPerOccurrence: 0 });
  const studio = createStudio(value); let calls = 0, held;
  const editor = createConnectionDraftAdapter({ ...studio, previewCommand(command, expected) {
    calls += 1; held = command; const result = studio.previewCommand(command, expected); command.connection.workIds.reverse(); return result;
  }, applyCommand(command, expected) {
    const result = studio.applyCommand(command, expected); command.connection.workIds.length = 0; return result;
  } });
  const token = open(editor, studio), workIds = ['other', 'review']; set(editor, token, rawFields);
  ok(editor.setIds(token, 'workIds', workIds)); workIds.reverse(); const first = ok(editor.preview(token)).projection;
  held.connection.workIds.push('missing'); assert.strictEqual(ok(editor.preview(token)).projection, first); assert.equal(calls, 1);
  assert.deepEqual(editor.read().draft.raw.workIds, ['other', 'review']);
  const copied = copyConnectionRaw('connection.create:handoff', editor.read().draft.raw);
  assert.ok(Object.isFrozen(copied.workIds)); assert.equal(sameConnectionRaw('connection.create:handoff', copied, editor.read().draft.raw), true);
  set(editor, token, { sharedObject: 'Another object' }); ok(editor.preview(token)); assert.equal(calls, 2);
  ok(editor.apply(token)); assert.deepEqual(studio.read().state.connections[0].workIds, ['other', 'review']);
  assert.equal(studio.read().result.plannedCommitmentCents, 120000);
});

test('ordered work admission retains its exact count, descriptor and identity boundaries', () => {
  const value = plan(); while (value.work.length < LIMITS.work) value.work.push({ ...value.work[0], id: `work-${value.work.length}`, minutesPerOccurrence: 0 });
  const studio = createStudio(value), editor = createConnectionDraftAdapter(studio), token = open(editor, studio); fill(editor, token);
  ok(editor.setIds(token, 'workIds', value.work.map(row => row.id)));
  assert.equal(ok(editor.preview(token)).projection.state.connections[0].workIds.length, 256);
  for (const [input, code] of [[Array(257).fill('review'), 'collection'], [['review', 'review'], 'duplicate-reference'], [new Array(1), 'collection']]) rejected(editor.setIds(token, 'workIds', input), code);
  const ids = ['review']; let getterCalls = 0;
  Object.defineProperty(ids, '0', { enumerable: true, get() { getterCalls += 1; return 'review'; } });
  rejected(editor.setIds(token, 'workIds', ids), 'data-property'); assert.equal(getterCalls, 0);
  rejected(editor.setText(token, 'workIds', 'review'), 'field'); rejected(editor.setIds(token, 'personIds', []), 'field');
  rejected(editor.setText(token, 'constructor', 'x'), 'field'); assert.equal(editor.read().draft.raw.workIds.length, 256);
});

test('pause and removal change relationships while sharing each work record and preserving amounts', () => {
  const studio = createStudio(plan()); accepted(studio); accepted(studio, 'parallel');
  const editor = createConnectionDraftAdapter(studio), before = studio.read();
  let token = open(editor, studio, 'connection.update'); set(editor, token, { status: 'paused' }); ok(editor.apply(token));
  assert.equal(studio.read().state.connections[0].status, 'paused'); assert.deepEqual(studio.read().result, before.result);
  token = open(editor, studio, 'connection.remove'); ok(editor.apply(token));
  assert.deepEqual(studio.read().state.connections.map(row => row.id), ['parallel']); assert.deepEqual(studio.read().state.work, before.state.work);
  assert.deepEqual(studio.read().result, before.result);
});

test('canonical no-op at the revision ceiling and after Undo preserves accepted chronology and Redo', () => {
  const setup = createStudio(plan()); accepted(setup); const value = structuredClone(setup.read().state); value.revision = LIMITS.revision;
  const studio = createStudio(value), editor = createConnectionDraftAdapter(studio), before = studio.read(), acceptance = studio.readAcceptance();
  let token = open(editor, studio, 'connection.update'); set(editor, token, { sharedObject: '  Reviewed plan  ', responseExpectation: ' Respond after review ' });
  assert.equal(editor.read().draft.changed, false); assert.strictEqual(ok(editor.preview(token)).projection, before); ok(editor.apply(token));
  assert.strictEqual(studio.read(), before); assert.strictEqual(studio.readAcceptance(), acceptance);
  ok(setup.applyCommand({ type: 'connection.status.set', connectionId: 'handoff', status: 'paused' }, setup.read())); ok(setup.undo(setup.read()));
  const other = createConnectionDraftAdapter(setup), history = setup.readHistory(), prior = setup.read();
  token = open(other, setup, 'connection.update'); ok(other.apply(token)); assert.strictEqual(setup.read(), prior); assert.deepEqual(setup.readHistory(), history);
  assert.equal(history.redoCount, 1);
});

test('equal-payload imports retire even a cached unchanged connection draft before Apply', () => {
  const studio = createStudio(plan()); accepted(studio); const editor = createConnectionDraftAdapter(studio), token = open(editor, studio, 'connection.update');
  const before = studio.read(); assert.strictEqual(ok(editor.preview(token)).projection, before);
  ok(studio.replace(before.state, before)); rejected(editor.preview(token), 'stale-edit'); rejected(editor.apply(token), 'stale-edit');
  assert.equal(editor.read().draft.raw.sharedObject, 'Reviewed plan'); ok(editor.cancel(token));
});

test('reflection and preview callbacks preserve the newer connection editor and its diagnostic', () => {
  const studio = createStudio(plan()); let editor, token, replacement;
  editor = createConnectionDraftAdapter({ ...studio, previewCommand(command, expected) {
    const result = studio.previewCommand(command, expected); ok(editor.cancel(token)); replacement = open(editor, studio, 'connection.create', 'newer');
    rejected(editor.setText(replacement, 'sharedObject', 'x'.repeat(601)), 'text'); return result;
  } });
  token = open(editor, studio); fill(editor, token);
  const ids = new Proxy([], { ownKeys(target) { set(editor, token, { sharedObject: 'Newer object' }); return Reflect.ownKeys(target); } });
  rejected(editor.setIds(token, 'workIds', ids), 'draft-changed'); assert.deepEqual(editor.read().draft.raw.workIds, ['review']);
  rejected(editor.preview(token), 'draft-token'); assert.strictEqual(editor.read().draft.token, replacement); assert.equal(editor.read().error.code, 'text');
});

for (const committed of [true, false]) test(`${committed ? 'accepted' : 'held'} publication preserves a replacement connection and newer diagnostic`, () => {
  const studio = createStudio(plan()); let editor, token, replacement;
  editor = createConnectionDraftAdapter({ ...studio, applyCommand(command, expected) {
    const result = committed ? studio.applyCommand(command, expected) : { ok: false, error: { code: 'held', path: 'command', message: 'Try again.' } };
    ok(editor.cancel(token)); replacement = open(editor, studio, 'connection.create', 'newer');
    rejected(editor.setText(replacement, 'sharedObject', 'x'.repeat(601)), 'text'); return result;
  } });
  token = open(editor, studio); fill(editor, token);
  assert.equal(editor.apply(token).ok, committed); assert.strictEqual(editor.read().draft.token, replacement); assert.equal(editor.read().error.code, 'text');
  assert.equal(studio.read().state.connections.length, committed ? 1 : 0);
});

test('successful publication retains newer raw text on the same lease as a stale correctable edit', () => {
  const studio = createStudio(plan()); let editor, token;
  editor = createConnectionDraftAdapter({ ...studio, applyCommand(command, expected) {
    const result = studio.applyCommand(command, expected); set(editor, token, { sharedObject: 'Newer object' }); return result;
  } });
  token = open(editor, studio); fill(editor, token); ok(editor.apply(token));
  assert.equal(studio.read().state.connections[0].sharedObject, 'Reviewed plan');
  assert.equal(editor.read().draft.raw.sharedObject, 'Newer object'); assert.equal(editor.read().status, 'stale');
  rejected(editor.apply(token), 'stale-edit'); ok(editor.cancel(token));
});

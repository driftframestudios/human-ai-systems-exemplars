import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { LIMITS } from '../../collaboration/native-investment-studio/config.mjs';
import { createSessionDraftAdapter, SESSION_FORMS, ASSEMBLY_FORMS, makeSessionTarget, describeSessionTarget,
  describeAssemblyTarget } from '../../collaboration/native-investment-studio/command-draft.mjs';

function open(editor, studio, form = 'work.update', id = 'review') {
  const result = editor.begin(makeSessionTarget(form, id), studio.read());
  assert.equal(result.ok, true, result.error?.message); return result.view.draft.token;
}
function rejected(result, code) { assert.equal(result.ok, false); assert.equal(result.error.code, code); return result; }
function fill(editor, token, fields = {}) {
  for (const [field, raw] of Object.entries({ label: 'Working session', teamId: 'delivery', ...fields })) {
    assert.equal(editor.setText(token, field, raw).ok, true);
  }
  assert.equal(editor.setIds(token, 'personIds', ['product-one']).ok, true);
}

test('session forms have closed target and field metadata, separate from assembly forms', () => {
  assert.deepEqual(Object.keys(SESSION_FORMS), ['work.create', 'work.update', 'work.remove']);
  assert.equal(Object.hasOwn(ASSEMBLY_FORMS, 'work.create'), false);
  const descriptor = describeSessionTarget('work.update:review');
  assert.equal(descriptor.id, 'review'); assert.equal(descriptor.collection, 'work');
  assert.equal(descriptor.mode, 'update');
  assert.deepEqual(Object.keys(descriptor.fields), ['label', 'teamId', 'personIds', 'hoursPerSession', 'minutesPerSession', 'occurrences', 'funding', 'status']);
  assert.deepEqual(descriptor.fields.status.choices, ['planned', 'paused']);
  assert.equal(descriptor.fields.teamId.maxLength, 64);
  assert.ok(Object.isFrozen(descriptor.fields.funding.choices));
  for (const target of ['team.create:review', 'work.pause:review', 'work.create:Bad', 'work.update:a:b', '', null]) assert.equal(describeSessionTarget(target), null);
  assert.equal(describeAssemblyTarget('work.create:review'), null);
  assert.throws(() => makeSessionTarget('team.create', 'review'), TypeError);
});

test('session creation starts incomplete, previews $1250 and accepts one additional $50 session', () => {
  const studio = createStudio(), editor = createSessionDraftAdapter(studio), before = studio.read();
  const token = open(editor, studio, 'work.create', 'extra');
  assert.deepEqual(editor.read().draft.raw, { label: '', teamId: '', personIds: [], hoursPerSession: '0', minutesPerSession: '30', occurrences: '1', funding: 'additional', status: 'planned' });
  rejected(editor.preview(token), 'label');
  fill(editor, token, { label: '  One session  ' });
  const preview = editor.preview(token); assert.equal(preview.ok, true);
  assert.equal(preview.projection.result.knownCommitmentCents, 125000);
  assert.equal(preview.projection.state.work.at(-1).timing, null);
  assert.strictEqual(studio.read(), before);
  const result = editor.apply(token); assert.equal(result.ok, true);
  assert.equal(studio.read().state.work.at(-1).label, 'One session');
  assert.equal(studio.read().state.work.at(-1).id, 'extra');
  assert.equal(studio.readHistory().undoCount, 1);
  assert.equal(editor.read().draft, null);
  rejected(editor.apply(token), 'draft-token');
});

test('complete session updates use the work owner, preserve timing and canonical no-op identity', () => {
  const plan = createExamplePlan(); plan.revision = LIMITS.revision;
  const studio = createStudio(plan); let previews = 0, updates = 0, timing;
  const editor = createSessionDraftAdapter({ ...studio,
    previewWork(id, row, expected) { previews += 1; timing = row.timing; return studio.previewWork(id, row, expected); },
    updateWork(id, row, expected) { updates += 1; timing = row.timing; return studio.updateWork(id, row, expected); },
    previewCommand() { assert.fail('update belongs to previewWork'); }, applyCommand() { assert.fail('update belongs to updateWork'); },
  });
  const before = studio.read(), token = open(editor, studio);
  editor.setText(token, 'label', ` ${before.state.work[0].label} `);
  editor.setText(token, 'minutesPerSession', '00030');
  assert.equal(editor.read().draft.changed, false);
  assert.strictEqual(editor.preview(token).projection, before);
  assert.strictEqual(editor.preview(token).projection, before);
  assert.equal(previews, 1); assert.equal(timing, before.state.work[0].timing);
  assert.equal(editor.apply(token).ok, true); assert.equal(updates, 1);
  assert.strictEqual(studio.read(), before); assert.equal(studio.readHistory().undoCount, 0);
});

test('duration, funding and paused status retain their distinct accounting meaning', () => {
  const studio = createStudio(), editor = createSessionDraftAdapter(studio), token = open(editor, studio);
  fill(editor, token, { minutesPerSession: '45', occurrences: '2', status: 'paused' });
  let preview = editor.preview(token);
  assert.equal(preview.projection.result.knownCommitmentCents, 15000);
  assert.ok(preview.projection.result.obligations.some(item => item.code === 'paused-work'));
  editor.setText(token, 'funding', 'allocated'); preview = editor.preview(token);
  assert.equal(preview.projection.result.knownCommitmentCents, 0);
  assert.equal(preview.projection.result.allocatedKnownCents, 15000);
  assert.ok(preview.projection.result.obligations.some(item => item.code === 'allocated-capacity-exceeded'));
  assert.equal(editor.apply(token).ok, true);
  assert.equal(studio.read().state.work[0].minutesPerOccurrence, 45);
  assert.equal(studio.read().state.work[0].status, 'paused');
});

test('the shared duration codec keeps carry, lexical bounds and zero explicit', () => {
  const studio = createStudio(), editor = createSessionDraftAdapter(studio), token = open(editor, studio);
  editor.setText(token, 'hoursPerSession', '0'); editor.setText(token, 'minutesPerSession', '59');
  assert.equal(editor.step(token, 'minutesPerSession', 1).ok, true);
  assert.equal(editor.read().draft.raw.hoursPerSession, '1'); assert.equal(editor.read().draft.raw.minutesPerSession, '0');
  assert.equal(editor.read().draft.raw.label, 'Weekly working session');
  for (const [field, raw, code] of [['hoursPerSession', '-1', 'range'], ['minutesPerSession', '60', 'range'],
    ['occurrences', '1e', 'incomplete'], ['occurrences', '10001', 'range'], ['occurrences', '', 'empty'],
    ['hoursPerSession', '1.5', 'integer-text']]) {
    const old = editor.read().draft.raw[field]; editor.setText(token, field, raw);
    rejected(editor.preview(token), code); assert.equal(editor.read().draft.raw[field], raw);
    editor.setText(token, field, old);
  }
  editor.setText(token, 'hoursPerSession', '24'); editor.setText(token, 'minutesPerSession', '1');
  rejected(editor.preview(token), 'range'); editor.setText(token, 'minutesPerSession', '0');
  rejected(editor.step(token, 'minutesPerSession', 1), 'range');
  editor.setText(token, 'hoursPerSession', '0'); editor.setText(token, 'occurrences', '0');
  assert.equal(editor.preview(token).projection.result.knownCommitmentCents, 0);
  rejected(editor.step(token, 'occurrences', -1), 'range'); rejected(editor.step(token, 'label', 1), 'field');
  rejected(editor.setText(token, 'occurrences', '1'.repeat(33)), 'text');
  rejected(editor.setText(token, 'constructor', 'x'), 'field');
  rejected(editor.setText(token, 'timing', 'null'), 'field');
});

test('session admission preserves selections and reports team, membership and choice errors', () => {
  const studio = createStudio(), editor = createSessionDraftAdapter(studio), before = studio.read();
  studio.applyCommand({ type: 'team.create', team: { id: 'empty', label: 'Empty', personIds: [] } }, before);
  const token = open(editor, studio);
  editor.setText(token, 'teamId', 'empty');
  rejected(editor.preview(token), 'team-membership');
  assert.deepEqual(editor.read().draft.raw.personIds, ['product-one', 'product-two', 'engineering-one', 'engineering-two']);
  editor.setText(token, 'teamId', 'missing'); rejected(editor.preview(token), 'reference');
  editor.setText(token, 'teamId', 'delivery'); editor.setText(token, 'funding', 'maybe'); rejected(editor.preview(token), 'choice');
  editor.setText(token, 'funding', 'additional'); editor.setText(token, 'status', 'done'); rejected(editor.preview(token), 'choice');
  editor.setText(token, 'status', 'planned'); editor.setIds(token, 'personIds', []); rejected(editor.preview(token), 'collection');
  rejected(editor.setIds(token, 'personIds', ['product-one', 'product-one']), 'duplicate-reference');
  rejected(editor.setText(token, 'personIds', 'product-one'), 'field');
  assert.equal(studio.read().state.work[0].teamId, 'delivery');
  assert.equal(editor.cancel(token).ok, true);
});

test('participant order remains detached across caller, preview facade, cache and accepted publication', () => {
  const studio = createStudio(); let previews = 0;
  const editor = createSessionDraftAdapter({ ...studio,
    previewWork(id, row, expected) { previews += 1; const result = studio.previewWork(id, row, expected); row.personIds.reverse(); return result; },
    updateWork(id, row, expected) { const result = studio.updateWork(id, row, expected); row.personIds.push('missing'); return result; },
  });
  const token = open(editor, studio), ids = ['engineering-one', 'product-one'];
  editor.setIds(token, 'personIds', ids); ids.reverse();
  assert.deepEqual(editor.read().draft.raw.personIds, ['engineering-one', 'product-one']);
  const first = editor.preview(token); assert.equal(first.projection.result.knownCommitmentCents, 60000);
  assert.strictEqual(editor.preview(token).projection, first.projection); assert.equal(previews, 1);
  assert.deepEqual(editor.read().draft.raw.personIds, ['engineering-one', 'product-one']);
  assert.equal(editor.apply(token).ok, true);
  assert.deepEqual(studio.read().state.work[0].personIds, ['engineering-one', 'product-one']);
});

test('session removal preserves bounded practice references and releases only an unreferenced record', () => {
  const studio = createStudio(), editor = createSessionDraftAdapter(studio), before = studio.read();
  let token = open(editor, studio, 'work.remove');
  const result = rejected(editor.preview(token), 'dependencies');
  assert.deepEqual(result.error.references, [{ collection: 'practices', id: 'shared-expectations', field: 'workIds' }]);
  rejected(editor.apply(token), 'dependencies'); assert.strictEqual(studio.read(), before);
  assert.equal(editor.cancel(token).ok, true);
  token = open(editor, studio, 'work.create', 'extra'); fill(editor, token); editor.apply(token);
  token = open(editor, studio, 'work.remove', 'extra'); assert.equal(editor.read().draft.changed, true);
  assert.equal(editor.apply(token).ok, true);
  assert.deepEqual(studio.read().state.work.map(row => row.id), ['review']);
});

test('stale projections, foreign tokens and disposal retain their exact ownership boundaries', () => {
  const studio = createStudio(), editor = createSessionDraftAdapter(studio);
  rejected(editor.begin('work.update:review', createStudio().read()), 'stale-edit');
  const token = open(editor, studio); editor.setText(token, 'label', 'Saved label');
  studio.updatePurpose({ ...studio.read().state.purpose, changedAbility: 'Find samples' }, studio.read());
  rejected(editor.apply(token), 'stale-edit'); assert.equal(editor.read().draft.raw.label, 'Saved label');
  rejected(editor.cancel({}), 'draft-token'); assert.equal(editor.cancel(token).ok, true);
  editor.dispose(); rejected(editor.begin('work.update:review', studio.read()), 'disposed');
});

test('session selection reflection cannot replace newer raw or a replacement editor', () => {
  const studio = createStudio(), editor = createSessionDraftAdapter(studio), token = open(editor, studio);
  const first = new Proxy(['product-one'], { ownKeys(target) { editor.setText(token, 'label', 'Newer'); return Reflect.ownKeys(target); } });
  rejected(editor.setIds(token, 'personIds', first), 'draft-changed');
  assert.equal(editor.read().draft.raw.label, 'Newer'); assert.equal(editor.read().draft.raw.personIds.length, 4);
  let next;
  const second = new Proxy(['product-one'], { ownKeys(target) {
    editor.cancel(token); next = open(editor, studio, 'work.create', 'extra'); editor.setText(next, 'label', 'Fresh');
    rejected(editor.setText(next, 'label', 'x'.repeat(121)), 'text'); return Reflect.ownKeys(target);
  } });
  rejected(editor.setIds(token, 'personIds', second), 'draft-token');
  assert.strictEqual(editor.read().draft.token, next); assert.equal(editor.read().error.code, 'text');
});

test('accepted session publication preserves newer same-session text and its stale recovery state', () => {
  const studio = createStudio(); let editor, token;
  editor = createSessionDraftAdapter({ ...studio, updateWork(...args) {
    const result = studio.updateWork(...args); editor.setText(token, 'label', 'Newer'); return result;
  } });
  token = open(editor, studio); editor.setText(token, 'label', 'Accepted');
  assert.equal(editor.apply(token).ok, true);
  assert.equal(studio.read().state.work[0].label, 'Accepted');
  assert.equal(editor.read().draft.raw.label, 'Newer'); assert.equal(editor.read().status, 'stale');
});

for (const accepted of [true, false]) test(`${accepted ? 'accepted' : 'held'} session publication preserves replacement-editor diagnostics`, () => {
  const studio = createStudio(); let editor, token, replacement;
  editor = createSessionDraftAdapter({ ...studio, updateWork(...args) {
    const result = accepted ? studio.updateWork(...args) : { ok: false, error: { code: 'held', path: 'work', message: 'Try again.' } };
    editor.cancel(token); replacement = open(editor, studio, 'work.create', 'extra');
    editor.setText(replacement, 'label', 'Replacement'); rejected(editor.setText(replacement, 'label', 'x'.repeat(121)), 'text');
    return result;
  } });
  token = open(editor, studio); editor.setText(token, 'label', 'Accepted');
  assert.equal(editor.apply(token).ok, accepted);
  assert.strictEqual(editor.read().draft.token, replacement);
  assert.equal(editor.read().draft.raw.label, 'Replacement'); assert.equal(editor.read().error.code, 'text');
});


test('canonical full-session no-op preserves an existing Redo entry', () => {
  const studio = createStudio();
  studio.updateWork('review', { ...studio.read().state.work[0], label: 'Later name' }, studio.read());
  studio.undo(studio.read());
  const before = studio.read(), marker = studio.readAcceptance(), history = studio.readHistory();
  assert.equal(history.redoCount, 1);
  const editor = createSessionDraftAdapter(studio), token = open(editor, studio);
  editor.setText(token, 'occurrences', '0006');
  assert.equal(editor.apply(token).ok, true);
  assert.strictEqual(studio.read(), before); assert.strictEqual(studio.readAcceptance(), marker);
  assert.deepEqual(studio.readHistory(), history);
});

test('session creation retains unknown and explicit-zero rate accounting', () => {
  for (const [rate, expectedTotal] of [[null, null], [0, 120000]]) {
    const studio = createStudio();
    studio.applyCommand({ type: 'person.create', person: { id: 'extra', label: 'Extra', fundedMinutes: 0, rateCentsPerHour: rate } }, studio.read());
    const team = studio.read().state.teams[0];
    studio.applyCommand({ type: 'team.members.replace', teamId: team.id, personIds: [...team.personIds, 'extra'] }, studio.read());
    const editor = createSessionDraftAdapter(studio), token = open(editor, studio, 'work.create', 'extra-session');
    fill(editor, token); editor.setIds(token, 'personIds', ['extra']);
    assert.equal(editor.preview(token).projection.result.plannedCommitmentCents, expectedTotal);
    assert.equal(editor.apply(token).ok, true);
    assert.equal(studio.read().state.people.at(-1).rateCentsPerHour, rate);
  }
});

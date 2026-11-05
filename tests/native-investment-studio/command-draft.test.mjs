import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createAssemblyDraftAdapter, ASSEMBLY_FORMS, makeAssemblyTarget, describeAssemblyTarget } from '../../collaboration/native-investment-studio/command-draft.mjs';

function open(editor, studio, form, id) {
  const result = editor.begin(makeAssemblyTarget(form, id), studio.read());
  assert.equal(result.ok, true, result.error?.message);
  return result.view.draft.token;
}
function rejected(result, code) { assert.equal(result.ok, false); assert.equal(result.error.code, code); return result; }
function person(editor, token, label = 'Ada') {
  for (const [field, value] of Object.entries({ label, ratePerHour: '120', fundedHours: '2', fundedMinutes: '0' })) {
    assert.equal(editor.setText(token, field, value).ok, true);
  }
}

test('finite target metadata distinguishes creation, update and removal with closed field choices', () => {
  assert.deepEqual(Object.keys(ASSEMBLY_FORMS), ['person.create', 'team.create', 'team.update', 'person.remove', 'team.remove']);
  const descriptor = describeAssemblyTarget(makeAssemblyTarget('team.update', 'delivery'));
  assert.equal(descriptor.id, 'delivery');
  assert.equal(descriptor.mode, 'update');
  assert.equal(descriptor.fields.personIds.maxItems, 128);
  for (const key of ['constructor:x', 'work.create:review', 'team.update:Bad', 'person.create:a:b', '', null]) assert.equal(describeAssemblyTarget(key), null);
  assert.throws(() => makeAssemblyTarget('team.create', 'a:b'), TypeError);
  assert.ok(Object.isFrozen(ASSEMBLY_FORMS));
  assert.ok(Object.isFrozen(descriptor.fields.personIds));
});

test('person creation previews and accepts $1440 while retaining the literal raw entry until Apply', () => {
  const studio = createStudio(), editor = createAssemblyDraftAdapter(studio), before = studio.read();
  const token = open(editor, studio, 'person.create', 'ada');
  person(editor, token, '  Ada  ');
  editor.setText(token, 'ratePerHour', '00120.00');
  const preview = editor.preview(token);
  assert.equal(preview.ok, true);
  assert.equal(preview.projection.result.knownCommitmentCents, 144000);
  assert.equal(preview.projection.state.people.at(-1).label, 'Ada');
  assert.equal(editor.read().draft.raw.ratePerHour, '00120.00');
  assert.strictEqual(studio.read(), before);
  assert.deepEqual(studio.readHistory(), { undoCount: 0, redoCount: 0, limit: 20 });
  const result = editor.apply(token);
  assert.equal(result.ok, true);
  assert.equal(result.projection.result.knownCommitmentCents, 144000);
  assert.equal(editor.read().status, 'idle');
  assert.equal(editor.read().draft, null);
  rejected(editor.apply(token), 'draft-token');
});

test('creation shares strict numeric admission and minute carry with person editing', () => {
  const studio = createStudio(), editor = createAssemblyDraftAdapter(studio);
  const token = open(editor, studio, 'person.create', 'ada');
  person(editor, token);
  editor.setText(token, 'fundedMinutes', '59');
  assert.equal(editor.step(token, 'fundedMinutes', 1).ok, true);
  assert.equal(editor.read().draft.raw.fundedHours, '3');
  assert.equal(editor.read().draft.raw.fundedMinutes, '0');
  assert.equal(editor.read().draft.raw.label, 'Ada');
  assert.equal(editor.preview(token).projection.result.knownCommitmentCents, 156000);
  for (const raw of ['1e2', '-1', '120.001', '']) {
    editor.setText(token, 'ratePerHour', raw);
    if (raw === '') {
      assert.equal(editor.preview(token).projection.result.plannedCommitmentCents, null);
      rejected(editor.step(token, 'ratePerHour', 1), 'unknown-rate');
    } else assert.equal(editor.preview(token).ok, false);
  }
  editor.setText(token, 'ratePerHour', '0');
  assert.equal(editor.preview(token).projection.result.plannedCommitmentCents, 120000);
  rejected(editor.step(token, 'label', 1), 'field');
  rejected(editor.step(token, 'ratePerHour', 2), 'step');
});

test('ordered selections detach caller arrays and preserve team order through preview and Apply', () => {
  const studio = createStudio(), editor = createAssemblyDraftAdapter(studio);
  const token = open(editor, studio, 'team.create', 'design');
  editor.setText(token, 'label', 'Design');
  const ids = ['engineering-two', 'product-one'];
  assert.equal(editor.setIds(token, 'personIds', ids).ok, true);
  ids.reverse(); ids.push('missing');
  const view = editor.read();
  assert.deepEqual(view.draft.raw.personIds, ['engineering-two', 'product-one']);
  assert.ok(Object.isFrozen(view.draft.raw.personIds));
  assert.equal(editor.preview(token).projection.result.knownCommitmentCents, 120000);
  assert.equal(editor.apply(token).ok, true);
  assert.deepEqual(studio.read().state.teams.at(-1).personIds, ['engineering-two', 'product-one']);
});

test('complete team no-op preserves accepted identity and preview cache owns one complete raw revision', () => {
  const studio = createStudio();
  let previews = 0;
  const editor = createAssemblyDraftAdapter({ ...studio, previewCommand(...args) { previews += 1; return studio.previewCommand(...args); } });
  const token = open(editor, studio, 'team.update', 'delivery'), before = studio.read();
  editor.setText(token, 'label', ` ${before.state.teams[0].label} `);
  assert.equal(editor.read().draft.changed, false);
  assert.strictEqual(editor.preview(token).projection, before);
  assert.strictEqual(editor.preview(token).projection, before);
  assert.equal(previews, 1);
  editor.setIds(token, 'personIds', [...before.state.teams[0].personIds]);
  editor.preview(token); assert.equal(previews, 1);
  editor.setIds(token, 'personIds', [...before.state.teams[0].personIds].reverse());
  editor.preview(token); assert.equal(previews, 2);
  editor.setIds(token, 'personIds', [...before.state.teams[0].personIds]);
  assert.equal(editor.apply(token).ok, true);
  assert.strictEqual(studio.read(), before);
});

test('a retained command facade receives detached memberships while raw order and cached preview remain coherent', () => {
  const studio = createStudio();
  let retained, previews = 0;
  const editor = createAssemblyDraftAdapter({ ...studio, previewCommand(command, expected) {
    previews += 1; retained = command;
    const result = studio.previewCommand(command, expected);
    command.team.personIds.reverse();
    return result;
  }, applyCommand(command, expected) {
    const result = studio.applyCommand(command, expected);
    command.team.personIds.push('missing');
    return result;
  } });
  const token = open(editor, studio, 'team.create', 'design');
  editor.setText(token, 'label', 'Design');
  editor.setIds(token, 'personIds', ['product-one', 'engineering-one']);
  const first = editor.preview(token);
  assert.equal(first.ok, true);
  assert.deepEqual(first.projection.state.teams.at(-1).personIds, ['product-one', 'engineering-one']);
  assert.deepEqual(editor.read().draft.raw.personIds, ['product-one', 'engineering-one']);
  retained.team.personIds.push('missing');
  assert.strictEqual(editor.preview(token).projection, first.projection);
  assert.equal(previews, 1);
  assert.deepEqual(editor.read().draft.raw.personIds, ['product-one', 'engineering-one']);
  editor.setText(token, 'label', 'Renamed design');
  assert.deepEqual(editor.preview(token).projection.state.teams.at(-1).personIds, ['product-one', 'engineering-one']);
  assert.equal(previews, 2);
  assert.equal(editor.apply(token).ok, true);
  assert.deepEqual(studio.read().state.teams.at(-1).personIds, ['product-one', 'engineering-one']);
});

test('selection shape, field types, text limits and unsupported forms preserve recoverable raw data', () => {
  const studio = createStudio(), editor = createAssemblyDraftAdapter(studio);
  const token = open(editor, studio, 'team.update', 'delivery'), before = editor.read().draft.raw;
  let calls = 0;
  const accessor = ['product-one'];
  Object.defineProperty(accessor, '0', { enumerable: true, get() { calls += 1; return 'product-one'; } });
  for (const [candidate, code] of [[['product-one', 'product-one'], 'duplicate-reference'], [new Array(2), 'collection'],
    [Array(129).fill('product-one'), 'collection'], [['Bad'], 'text'], [accessor, 'data-property']]) {
    rejected(editor.setIds(token, 'personIds', candidate), code);
    assert.deepEqual(editor.read().draft.raw, before);
  }
  assert.equal(calls, 0);
  rejected(editor.setText(token, 'personIds', 'product-one'), 'field');
  rejected(editor.setIds(token, 'label', []), 'field');
  rejected(editor.setText(token, 'label', '😀'.repeat(61)), 'text');
  editor.setText(token, 'label', '<b>Team</b>');
  assert.equal(editor.preview(token).projection.state.teams[0].label, '<b>Team</b>');
  editor.setText(token, 'label', '  ');
  rejected(editor.apply(token), 'label');
  assert.equal(editor.read().draft.raw.label, '  ');
});

test('removal retains dependency diagnostics while unreferenced removal and Cancel have distinct outcomes', () => {
  const studio = createStudio(), editor = createAssemblyDraftAdapter(studio), before = studio.read();
  const token = open(editor, studio, 'person.remove', 'product-one');
  const preview = rejected(editor.preview(token), 'dependencies');
  assert.deepEqual(preview.error.references, [
    { collection: 'teams', id: 'delivery', field: 'personIds' }, { collection: 'work', id: 'review', field: 'personIds' },
  ]);
  rejected(editor.apply(token), 'dependencies');
  assert.strictEqual(studio.read(), before);
  assert.equal(editor.read().draft.assemblyId, 'person.remove:product-one');
  assert.equal(editor.cancel(token).ok, true);
  const creation = open(editor, studio, 'team.create', 'empty');
  editor.setText(creation, 'label', 'Empty team'); editor.apply(creation);
  const removal = open(editor, studio, 'team.remove', 'empty');
  assert.equal(editor.apply(removal).ok, true);
  assert.deepEqual(studio.read().state.teams.map(row => row.id), ['delivery']);
});

test('stale and foreign plans preserve the typed values until explicit cancellation', () => {
  const studio = createStudio(), editor = createAssemblyDraftAdapter(studio);
  rejected(editor.begin('person.create:ada', createStudio().read()), 'stale-edit');
  const token = open(editor, studio, 'person.create', 'ada');
  person(editor, token);
  studio.updatePurpose({ ...studio.read().state.purpose, changedAbility: 'Find samples' }, studio.read());
  assert.equal(editor.read().status, 'stale');
  assert.equal(editor.read().draft.raw.label, 'Ada');
  rejected(editor.preview(token), 'stale-edit');
  rejected(editor.apply(token), 'stale-edit');
  assert.equal(editor.cancel(token).ok, true);
  assert.equal(studio.read().state.people.length, 4);
  editor.dispose();
  rejected(editor.begin('person.create:ada', studio.read()), 'disposed');
});

test('setIds reflection preserves a replacement session and its diagnostic', () => {
  const studio = createStudio(), editor = createAssemblyDraftAdapter(studio);
  const old = open(editor, studio, 'team.update', 'delivery');
  let fresh;
  const candidate = new Proxy(['product-one'], { ownKeys(target) {
    editor.cancel(old); fresh = open(editor, studio, 'team.create', 'new-team');
    editor.setText(fresh, 'label', 'New values');
    rejected(editor.setText(fresh, 'label', 'x'.repeat(121)), 'text');
    return Reflect.ownKeys(target);
  } });
  rejected(editor.setIds(old, 'personIds', candidate), 'draft-token');
  assert.strictEqual(editor.read().draft.token, fresh);
  assert.equal(editor.read().draft.raw.label, 'New values');
  assert.equal(editor.read().error.code, 'text');
  assert.deepEqual(editor.read().draft.raw.personIds, []);
});

test('setIds reflection preserves newer raw text in the same session', () => {
  const studio = createStudio(), editor = createAssemblyDraftAdapter(studio);
  const token = open(editor, studio, 'team.update', 'delivery');
  const original = editor.read().draft.raw.personIds;
  const candidate = new Proxy(['product-one'], { ownKeys(target) {
    editor.setText(token, 'label', 'Newer name'); return Reflect.ownKeys(target);
  } });
  rejected(editor.setIds(token, 'personIds', candidate), 'draft-changed');
  assert.equal(editor.read().draft.raw.label, 'Newer name');
  assert.deepEqual(editor.read().draft.raw.personIds, original);
});

test('accepted publication preserves newer raw values entered synchronously in the same session', () => {
  const studio = createStudio();
  let editor, token;
  const facade = { ...studio, applyCommand(...args) {
    const result = studio.applyCommand(...args); editor.setText(token, 'label', 'Newer text'); return result;
  } };
  editor = createAssemblyDraftAdapter(facade); token = open(editor, studio, 'person.create', 'ada');
  person(editor, token);
  assert.equal(editor.apply(token).ok, true);
  assert.equal(studio.read().state.people.at(-1).label, 'Ada');
  assert.equal(editor.read().draft.raw.label, 'Newer text');
  assert.equal(editor.read().status, 'stale');
  assert.equal(editor.read().creationConflict, true);
});

test('successful and failed publication preserve a replacement editor’s newer diagnostic', () => {
  for (const accepted of [true, false]) {
    const studio = createStudio();
    let editor, token, fresh;
    const facade = { ...studio, applyCommand(...args) {
      const result = accepted ? studio.applyCommand(...args) : { ok: false, error: { code: 'old-failure', path: 'command', message: 'Older failure' }, projection: studio.read() };
      editor.cancel(token); fresh = open(editor, studio, 'team.create', 'next-team');
      editor.setText(fresh, 'label', 'Replacement');
      editor.setText(fresh, 'label', 'x'.repeat(121));
      return result;
    } };
    editor = createAssemblyDraftAdapter(facade); token = open(editor, studio, 'person.create', 'ada'); person(editor, token);
    assert.equal(editor.apply(token).ok, accepted);
    assert.strictEqual(editor.read().draft.token, fresh);
    assert.equal(editor.read().draft.raw.label, 'Replacement');
    assert.equal(editor.read().error.code, 'text');
  }
});

test('preview reentry and disposal retire stale proposal caches without accepting values', () => {
  const studio = createStudio();
  let editor, token;
  const facade = { ...studio, previewCommand(...args) {
    const result = studio.previewCommand(...args); editor.dispose(); return result;
  } };
  editor = createAssemblyDraftAdapter(facade); token = open(editor, studio, 'person.create', 'ada'); person(editor, token);
  rejected(editor.preview(token), 'disposed');
  assert.equal(editor.read().draft, null);
  assert.equal(studio.read().state.people.length, 4);
});

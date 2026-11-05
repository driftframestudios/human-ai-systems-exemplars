import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createPurposeDraftAdapter } from '../../collaboration/native-investment-studio/purpose-draft.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { LIMITS } from '../../collaboration/native-investment-studio/config.mjs';

const EMPTY = Object.freeze({ changedAbility: null, affectedPopulation: null, observationSignal: null,
  accountableOwner: null, reviewBoundary: null, openConditions: null });
function setup(plan = createExamplePlan()) {
  const studio = createStudio(plan);
  const editor = createPurposeDraftAdapter(studio);
  const opened = editor.begin('purpose', studio.read());
  assert.equal(opened.ok, true);
  return { studio, editor, token: opened.view.draft.token };
}
function rejected(result, code) { assert.equal(result.ok, false); assert.equal(result.error.code, code); }

test('purpose drafts retain raw notes and replace all six canonical fields together', () => {
  const { studio, editor, token } = setup();
  const before = studio.read();
  const inputs = { changedAbility: '  Restore a sample  ', affectedPopulation: 'Research teams',
    observationSignal: ' Find the sample ', accountableOwner: 'Study lead',
    reviewBoundary: '\nNext sprint\n', openConditions: '  Access to the laboratory  ' };
  for (const [field, raw] of Object.entries(inputs)) assert.equal(editor.setText(token, field, raw).ok, true);
  const view = editor.read();
  assert.equal(view.draft.purposeId, 'purpose');
  assert.strictEqual(view.draft.baseProjection, before);
  assert.deepEqual(view.draft.raw, inputs);
  assert.equal(view.draft.changed, true);
  assert.deepEqual(view.draft.errors, []);
  assert.equal(editor.validate(token).ok, true);
  const preview = editor.preview(token);
  assert.equal(preview.ok, true);
  assert.strictEqual(studio.read(), before);
  assert.deepEqual(preview.projection.state.purpose, { changedAbility: 'Restore a sample', affectedPopulation: 'Research teams',
    observationSignal: 'Find the sample', accountableOwner: 'Study lead', reviewBoundary: 'Next sprint',
    openConditions: 'Access to the laboratory' });
  assert.equal(preview.projection.result.plannedCommitmentCents, 120000);
  assert.equal(editor.apply(token).ok, true);
  assert.deepEqual(studio.read(), preview.projection);
  assert.equal(studio.read().state.revision, 1);
  assert.equal(editor.read().status, 'idle');
  const next = editor.begin('purpose', studio.read()).view.draft.token;
  editor.setText(next, 'openConditions', ' \t\n ');
  editor.setText(next, 'reviewBoundary', '');
  assert.equal(editor.apply(next).ok, true);
  assert.deepEqual(studio.read().state.purpose, { ...preview.projection.state.purpose, openConditions: null, reviewBoundary: null });
  assert.deepEqual(before.state.purpose, EMPTY);
});

test('empty and whitespace-only text represent null and settle a canonical no-op', () => {
  const plan = createExamplePlan();
  plan.revision = LIMITS.revision;
  const { studio, editor, token } = setup(plan);
  const before = studio.read();
  const acceptance = studio.readAcceptance();
  editor.setText(token, 'changedAbility', '\n \t');
  assert.equal(editor.read().draft.changed, false);
  assert.strictEqual(editor.preview(token).projection, before);
  assert.equal(editor.apply(token).ok, true);
  assert.strictEqual(studio.read(), before);
  assert.strictEqual(studio.readAcceptance(), acceptance);
  assert.equal(studio.readHistory().undoCount, 0);
  assert.equal(editor.read().draft, null);
  rejected(editor.apply(token), 'draft-token');
});

test('text admission bounds raw UTF-16 units before trimming and retains prior values', () => {
  const { studio, editor, token } = setup();
  const before = studio.read();
  for (const raw of ['x'.repeat(600), '😀'.repeat(300), ' '.repeat(600)]) {
    assert.equal(editor.setText(token, 'changedAbility', raw).ok, true);
    assert.equal(editor.read().draft.raw.changedAbility, raw);
    assert.equal(editor.preview(token).ok, true);
  }
  for (const [field, raw, code] of [
    ['changedAbility', 'x'.repeat(601), 'text'], ['changedAbility', '😀'.repeat(301), 'text'],
    ['changedAbility', ` ${'x'.repeat(600)}`, 'text'], ['changedAbility', undefined, 'text'],
    ['changedAbility', null, 'text'], ['changedAbility', 1, 'text'],
    ['__proto__', 'changed', 'field'], ['unknown', 'changed', 'field'],
  ]) {
    const held = editor.read().draft.raw;
    rejected(editor.setText(token, field, raw), code);
    assert.deepEqual(editor.read().draft.raw, held);
    assert.strictEqual(studio.read(), before);
  }
  editor.setText(token, 'changedAbility', '😀'.repeat(300));
  assert.equal(editor.apply(token).ok, true);
  assert.equal(studio.read().state.purpose.changedAbility.length, 600);
});

test('markup remains literal purpose data through preview, acceptance, and serialization', () => {
  const { studio, editor, token } = setup();
  const raw = '<img src=x onerror="unexpected()"> & <script>data</script>';
  editor.setText(token, 'observationSignal', raw);
  assert.equal(editor.preview(token).projection.state.purpose.observationSignal, raw);
  assert.equal(editor.apply(token).ok, true);
  assert.equal(JSON.parse(studio.exportText()).purpose.observationSignal, raw);
  assert.equal(studio.read().result.plannedCommitmentCents, 120000);
});

test('one complete preview follows canonical values while raw text remains independently owned', () => {
  const studio = createStudio();
  let preparations = 0;
  const editor = createPurposeDraftAdapter({ ...studio, previewPurpose(...args) {
    preparations += 1;
    return studio.previewPurpose(...args);
  } });
  const token = editor.begin('purpose', studio.read()).view.draft.token;
  editor.setText(token, 'changedAbility', 'Find a sample');
  const first = editor.preview(token);
  for (let index = 0; index < 4; index += 1) {
    editor.read();
    assert.strictEqual(editor.preview(token).projection, first.projection);
  }
  editor.setText(token, 'changedAbility', '  Find a sample\n');
  editor.setText(token, 'openConditions', '\t');
  assert.strictEqual(editor.preview(token).projection, first.projection);
  assert.equal(preparations, 1);
  assert.equal(editor.read().draft.raw.changedAbility, '  Find a sample\n');
  editor.setText(token, 'openConditions', 'Access');
  assert.notStrictEqual(editor.preview(token).projection, first.projection);
  assert.equal(preparations, 2);
  studio.importText(studio.exportText(), studio.read());
  rejected(editor.preview(token), 'stale-edit');
  assert.equal(preparations, 2);
});

test('exact projection identity keeps imports, history restores, and foreign owners distinct', () => {
  const { studio, editor, token } = setup();
  const initial = studio.read();
  editor.setText(token, 'accountableOwner', 'Study lead');
  assert.equal(studio.updatePurpose({ ...EMPTY, openConditions: 'Access' }, initial).ok, true);
  assert.equal(studio.undo(studio.read()).ok, true);
  assert.deepEqual(studio.read().state, initial.state);
  assert.notStrictEqual(studio.read(), initial);
  const current = studio.read();
  for (const operation of [() => editor.validate(token), () => editor.preview(token), () => editor.apply(token)]) {
    rejected(operation(), 'stale-edit');
    assert.strictEqual(studio.read(), current);
    assert.equal(editor.read().draft.raw.accountableOwner, 'Study lead');
  }
  editor.cancel(token);
  rejected(editor.begin('purpose', createStudio().read()), 'stale-edit');
  const next = editor.begin('purpose', current).view.draft.token;
  assert.equal(studio.importText(studio.exportText(), current).ok, true);
  assert.equal(studio.read().state.revision, current.state.revision);
  rejected(editor.apply(next), 'stale-edit');
});

test('canonical no-op preserves Redo and material purpose changes participate in history', () => {
  const { studio, editor, token } = setup();
  editor.setText(token, 'changedAbility', 'Locate samples');
  assert.equal(editor.apply(token).ok, true);
  assert.equal(studio.undo(studio.read()).ok, true);
  const before = studio.read();
  const next = editor.begin('purpose', before).view.draft.token;
  editor.setText(next, 'changedAbility', '  ');
  assert.equal(editor.apply(next).ok, true);
  assert.strictEqual(studio.read(), before);
  assert.equal(studio.readHistory().redoCount, 1);
  assert.equal(studio.redo(before).ok, true);
  assert.equal(studio.read().state.purpose.changedAbility, 'Locate samples');
  assert.equal(studio.read().result.plannedCommitmentCents, 120000);
});

test('fixed targets, foreign tokens, cancel, and disposal preserve the current transaction', () => {
  const studio = createStudio();
  const editor = createPurposeDraftAdapter(studio);
  for (const target of ['other', null, {}, new String('purpose')]) rejected(editor.begin(target, studio.read()), 'reference');
  const token = editor.begin('purpose', studio.read()).view.draft.token;
  editor.setText(token, 'reviewBoundary', 'Next sprint');
  rejected(editor.begin('purpose', studio.read()), 'draft-open');
  assert.equal(editor.cancel(token).ok, true);
  const next = editor.begin('purpose', studio.read()).view.draft.token;
  for (const operation of [() => editor.setText(token, 'reviewBoundary', 'old'), () => editor.validate(token),
    () => editor.preview(token), () => editor.apply(token), () => editor.cancel(token)]) {
    rejected(operation(), 'draft-token');
    assert.strictEqual(editor.read().draft.token, next);
    assert.equal(editor.read().draft.raw.reviewBoundary, '');
    assert.equal(editor.read().error, null);
  }
  for (const value of [editor.read(), editor.read().draft, editor.read().draft.raw, editor.read().draft.errors, next]) {
    assert.ok(Object.isFrozen(value));
  }
  assert.equal(editor.dispose().ok, true);
  assert.equal(editor.dispose().ok, true);
  assert.equal(editor.read().status, 'disposed');
  assert.equal(editor.read().pending, false);
  assert.equal(editor.read().draft, null);
  rejected(editor.begin('purpose', studio.read()), 'disposed');
  rejected(editor.apply(next), 'disposed');
  assert.deepEqual(studio.read().state.purpose, EMPTY);
});

test('a preview callback editing raw text leaves the newer text ready for its own preview', () => {
  const studio = createStudio();
  let editor;
  let token;
  let interrupt = true;
  editor = createPurposeDraftAdapter({ ...studio, previewPurpose(...args) {
    const result = studio.previewPurpose(...args);
    if (interrupt) { interrupt = false; editor.setText(token, 'changedAbility', 'New text'); }
    return result;
  } });
  token = editor.begin('purpose', studio.read()).view.draft.token;
  editor.setText(token, 'changedAbility', 'Old text');
  const accepted = studio.read();
  rejected(editor.preview(token), 'draft-changed');
  assert.equal(editor.read().draft.raw.changedAbility, 'New text');
  assert.strictEqual(studio.read(), accepted);
  assert.equal(editor.preview(token).projection.state.purpose.changedAbility, 'New text');
});

test('preview reentry preserves newer accepted state and replacement draft ownership', () => {
  for (const action of ['accept', 'replace-draft', 'dispose']) {
    const studio = createStudio();
    let editor;
    let token;
    let replacement;
    editor = createPurposeDraftAdapter({ ...studio, previewPurpose(...args) {
      const result = studio.previewPurpose(...args);
      if (action === 'accept') studio.updatePurpose({ ...EMPTY, reviewBoundary: 'Current boundary' }, studio.read());
      if (action === 'replace-draft') {
        editor.cancel(token);
        replacement = editor.begin('purpose', studio.read()).view.draft.token;
        editor.setText(replacement, 'changedAbility', 'Replacement text');
      }
      if (action === 'dispose') editor.dispose();
      return result;
    } });
    token = editor.begin('purpose', studio.read()).view.draft.token;
    editor.setText(token, 'changedAbility', 'Earlier text');
    rejected(editor.preview(token), action === 'accept' ? 'stale-edit' : action === 'dispose' ? 'disposed' : 'draft-token');
    if (action === 'accept') assert.equal(studio.read().state.purpose.reviewBoundary, 'Current boundary');
    if (action === 'replace-draft') {
      assert.strictEqual(editor.read().draft.token, replacement);
      assert.equal(editor.read().draft.raw.changedAbility, 'Replacement text');
    }
    if (action === 'dispose') assert.equal(editor.read().draft, null);
  }
});

test('an accepted Apply callback preserves a replacement editor opened after acceptance', () => {
  const studio = createStudio();
  let editor;
  let token;
  let replacement;
  editor = createPurposeDraftAdapter({ ...studio, updatePurpose(...args) {
    const result = studio.updatePurpose(...args);
    editor.cancel(token);
    replacement = editor.begin('purpose', studio.read()).view.draft.token;
    editor.setText(replacement, 'openConditions', 'New draft');
    rejected(editor.setText(replacement, 'openConditions', 'x'.repeat(601)), 'text');
    return result;
  } });
  token = editor.begin('purpose', studio.read()).view.draft.token;
  editor.setText(token, 'changedAbility', 'Accepted text');
  const applied = editor.apply(token);
  assert.equal(applied.ok, true);
  assert.equal(applied.view.error.code, 'text');
  assert.equal(studio.read().state.purpose.changedAbility, 'Accepted text');
  assert.strictEqual(editor.read().draft.token, replacement);
  assert.equal(editor.read().draft.raw.openConditions, 'New draft');
  assert.equal(studio.read().state.purpose.openConditions, null);
});

test('a failed Apply completion preserves diagnostics from a replacement editor', () => {
  const studio = createStudio();
  let editor;
  let token;
  let replacement;
  editor = createPurposeDraftAdapter({ ...studio, updatePurpose(candidate, expected) {
    const result = studio.updatePurpose({ ...candidate, extra: true }, expected);
    editor.cancel(token);
    replacement = editor.begin('purpose', studio.read()).view.draft.token;
    rejected(editor.setText(replacement, 'changedAbility', 'x'.repeat(601)), 'text');
    return result;
  } });
  token = editor.begin('purpose', studio.read()).view.draft.token;
  const before = studio.read();
  const result = editor.apply(token);
  rejected(result, 'fields');
  assert.equal(result.view.error.code, 'text');
  assert.strictEqual(result.view.draft.token, replacement);
  assert.strictEqual(studio.read(), before);
});

test('successful Apply preserves newer raw text written into its existing transaction during publication', () => {
  const studio = createStudio();
  let editor;
  let token;
  editor = createPurposeDraftAdapter({ ...studio, updatePurpose(...args) {
    const result = studio.updatePurpose(...args);
    assert.equal(editor.setText(token, 'changedAbility', 'Newer text').ok, true);
    return result;
  } });
  token = editor.begin('purpose', studio.read()).view.draft.token;
  editor.setText(token, 'changedAbility', 'Accepted text');
  const result = editor.apply(token);
  assert.equal(result.ok, true);
  assert.equal(studio.read().state.purpose.changedAbility, 'Accepted text');
  assert.equal(result.view.status, 'stale');
  assert.strictEqual(result.view.draft.token, token);
  assert.equal(result.view.draft.raw.changedAbility, 'Newer text');
  rejected(editor.apply(token), 'stale-edit');
  assert.equal(editor.cancel(token).ok, true);
});

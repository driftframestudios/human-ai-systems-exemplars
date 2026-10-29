import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createPersonDraftAdapter } from '../../collaboration/native-investment-studio/person-draft.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';

const PERSON = 'product-one';
function setup() {
  const studio = createStudio();
  const editor = createPersonDraftAdapter(studio);
  const opened = editor.begin(PERSON, studio.read());
  assert.equal(opened.ok, true);
  return { studio, editor, token: opened.view.draft.token };
}
function rejected(result, code) { assert.equal(result.ok, false); assert.equal(result.error.code, code); }

test('one person draft converts exact dollars and funded time into a coherent accepted row', () => {
  const { studio, editor, token } = setup();
  const before = studio.capture();
  assert.deepEqual(editor.read().draft.raw, { ratePerHour: '100.00', fundedHours: '0', fundedMinutes: '0' });
  editor.setText(token, 'ratePerHour', '101.01');
  editor.setText(token, 'fundedHours', '2');
  editor.setText(token, 'fundedMinutes', '30');
  const preview = editor.preview(token);
  assert.equal(preview.ok, true);
  // 2.5 funded hours + 3 additional hours at $101.01, plus $900 for other people.
  assert.equal(preview.projection.result.fundedKnownCents, 25253);
  assert.equal(preview.projection.result.additionalKnownCents, 120303);
  assert.equal(preview.projection.result.plannedCommitmentCents, 145556);
  assert.strictEqual(studio.read(), before);
  const applied = editor.apply(token);
  assert.equal(applied.ok, true);
  assert.equal(applied.view.status, 'idle');
  assert.equal(applied.view.draft, null);
  assert.equal(studio.read().state.revision, 1);
  assert.equal(studio.read().state.people[0].rateCentsPerHour, 10101);
  assert.equal(studio.read().state.people[0].fundedMinutes, 150);
  assert.deepEqual(studio.read(), preview.projection);
  assert.equal(before.state.people[0].fundedMinutes, 0);
  assert.equal(before.result.plannedCommitmentCents, 120000);
  assert.equal(JSON.parse(studio.exportText()).people[0].rateCentsPerHour, 10101);
});

test('blank hourly rate is unknown while an explicit zero remains priced', () => {
  const { studio, editor, token } = setup();
  editor.setText(token, 'ratePerHour', '');
  assert.equal(editor.validate(token).ok, true);
  assert.deepEqual(editor.read().draft.errors, []);
  assert.equal(editor.preview(token).projection.result.plannedCommitmentCents, null);
  rejected(editor.step(token, 'ratePerHour', 1), 'unknown-rate');
  assert.equal(editor.apply(token).ok, true);
  assert.equal(studio.read().state.people[0].rateCentsPerHour, null);
  const next = editor.begin(PERSON, studio.read()).view.draft.token;
  assert.equal(editor.read().draft.raw.ratePerHour, '');
  editor.setText(next, 'ratePerHour', '0');
  assert.equal(editor.preview(next).projection.result.plannedCommitmentCents, 90000);
  assert.equal(editor.apply(next).ok, true);
  assert.equal(studio.read().state.people[0].rateCentsPerHour, 0);
});

for (const [raw, cents] of [['0.01', 1], ['1.1', 110], ['001.01', 101], ['999999.99', 99999999], ['1000000.00', 100000000]]) {
  test(`rate text ${raw} admits exactly ${cents} cents`, () => {
    const { studio, editor, token } = setup();
    editor.setText(token, 'ratePerHour', raw);
    assert.equal(editor.apply(token).ok, true);
    assert.equal(studio.read().state.people[0].rateCentsPerHour, cents);
  });
}

for (const [field, raw, code] of [
  ['ratePerHour', '1.', 'incomplete'], ['ratePerHour', '-', 'incomplete'], ['ratePerHour', '1e', 'incomplete'],
  ['ratePerHour', '1.001', 'money-text'], ['ratePerHour', '.50', 'money-text'], ['ratePerHour', ' 1', 'money-text'],
  ['ratePerHour', '-0.01', 'range'], ['ratePerHour', '1000000.01', 'range'],
  ['ratePerHour', '1e2', 'money-text'], ['ratePerHour', '1'.repeat(32), 'range'],
  ['fundedHours', '', 'empty'], ['fundedHours', '-1', 'range'], ['fundedHours', '1.5', 'integer-text'],
  ['fundedHours', '166667', 'range'], ['fundedMinutes', '60', 'range'], ['fundedMinutes', '-', 'incomplete'],
]) {
  test(`invalid ${field} ${JSON.stringify(raw)} keeps editable text beside accepted state`, () => {
    const { studio, editor, token } = setup();
    const before = studio.capture();
    assert.equal(editor.setText(token, field, raw).ok, true);
    assert.equal(editor.read().draft.raw[field], raw);
    assert.equal(editor.read().draft.changed, true);
    assert.equal(editor.read().draft.errors[0].code, code);
    rejected(editor.preview(token), code);
    rejected(editor.apply(token), code);
    assert.equal(editor.read().status, 'editing');
    assert.strictEqual(studio.read(), before);
    assert.equal(studio.exportText(), before.serialized);
    assert.equal(editor.cancel(token).ok, true);
    assert.equal(editor.read().status, 'idle');
  });
}

test('field and text admission preserve prior bounded values', () => {
  const { editor, token } = setup();
  for (const [field, raw, code] of [['__proto__', 'x', 'field'], ['ratePerHour', '1'.repeat(33), 'text'],
    ['fundedHours', 123, 'text'], ['fundedMinutes', null, 'text']]) {
    const before = editor.read().draft.raw;
    rejected(editor.setText(token, field, raw), code);
    assert.deepEqual(editor.read().draft.raw, before);
  }
  rejected(editor.step(token, 'other', 1), 'field');
  rejected(editor.step(token, 'ratePerHour', 2), 'step');
});

test('steps preserve cents and carry funded minutes through hour boundaries', () => {
  const { studio, editor, token } = setup();
  editor.setText(token, 'ratePerHour', '100.25');
  editor.setText(token, 'fundedHours', '1');
  editor.setText(token, 'fundedMinutes', '59');
  assert.equal(editor.step(token, 'ratePerHour', 1).ok, true);
  assert.equal(editor.read().draft.raw.ratePerHour, '101.25');
  assert.equal(editor.step(token, 'fundedMinutes', 1).ok, true);
  assert.equal(editor.read().draft.raw.fundedHours, '2');
  assert.equal(editor.read().draft.raw.fundedMinutes, '0');
  assert.equal(editor.step(token, 'fundedMinutes', -1).ok, true);
  assert.equal(editor.read().draft.raw.fundedHours, '1');
  assert.equal(editor.read().draft.raw.fundedMinutes, '59');
  assert.equal(editor.step(token, 'fundedHours', 1).ok, true);
  assert.equal(editor.apply(token).ok, true);
  assert.equal(studio.read().state.people[0].fundedMinutes, 179);
  assert.equal(studio.read().state.people[0].rateCentsPerHour, 10125);
});

test('combined funded duration admits its exact cap and bounds direct entry and stepping', () => {
  const { studio, editor, token } = setup();
  editor.setText(token, 'fundedHours', '166666');
  editor.setText(token, 'fundedMinutes', '41');
  rejected(editor.validate(token), 'range');
  rejected(editor.apply(token), 'range');
  editor.setText(token, 'fundedMinutes', '40');
  assert.equal(editor.validate(token).ok, true);
  rejected(editor.step(token, 'fundedMinutes', 1), 'range');
  rejected(editor.step(token, 'fundedHours', 1), 'range');
  assert.equal(editor.apply(token).ok, true);
  assert.equal(studio.read().state.people[0].fundedMinutes, 10000000);
  const next = editor.begin(PERSON, studio.read()).view.draft.token;
  editor.setText(next, 'fundedHours', '0');
  editor.setText(next, 'fundedMinutes', '0');
  editor.setText(next, 'ratePerHour', '0.25');
  rejected(editor.step(next, 'fundedMinutes', -1), 'range');
  rejected(editor.step(next, 'fundedHours', -1), 'range');
  rejected(editor.step(next, 'ratePerHour', -1), 'range');
});

test('one proposal cache follows canonical values, exact draft ownership, and accepted identity', () => {
  const studio = createStudio();
  let preparations = 0;
  const editor = createPersonDraftAdapter({ ...studio, previewPerson(...args) { preparations += 1; return studio.previewPerson(...args); } });
  const token = editor.begin(PERSON, studio.read()).view.draft.token;
  editor.setText(token, 'ratePerHour', '101');
  const first = editor.preview(token);
  assert.equal(first.ok, true);
  for (let read = 0; read < 8; read += 1) { editor.read(); assert.strictEqual(editor.preview(token).projection, first.projection); }
  assert.equal(preparations, 1);
  editor.setText(token, 'ratePerHour', '0101.00');
  assert.strictEqual(editor.preview(token).projection, first.projection);
  assert.equal(preparations, 1);
  editor.setText(token, 'fundedHours', '-');
  rejected(editor.preview(token), 'incomplete');
  assert.equal(preparations, 1);
  editor.setText(token, 'fundedHours', '1');
  const second = editor.preview(token);
  assert.equal(second.ok, true);
  assert.notStrictEqual(second.projection, first.projection);
  assert.equal(preparations, 2);
  studio.importText(studio.exportText(), studio.read());
  assert.equal(editor.read().status, 'stale');
  rejected(editor.preview(token), 'stale-edit');
  rejected(editor.apply(token), 'stale-edit');
  assert.equal(preparations, 2);
  assert.equal(editor.cancel(token).ok, true);
  const next = editor.begin(PERSON, studio.read()).view.draft.token;
  assert.equal(editor.preview(next).ok, true);
  assert.equal(preparations, 3);
});

test('canonical no-op settles the draft and preserves the accepted projection', () => {
  const { studio, editor, token } = setup();
  const before = studio.read();
  editor.setText(token, 'ratePerHour', '00100.0');
  editor.setText(token, 'fundedHours', '00');
  assert.equal(editor.read().draft.changed, false);
  assert.strictEqual(editor.preview(token).projection, before);
  assert.equal(editor.apply(token).ok, true);
  assert.strictEqual(studio.read(), before);
  assert.equal(editor.read().status, 'idle');
  rejected(editor.apply(token), 'draft-token');
});

test('target changes, foreign sessions, and disposal preserve current draft ownership', () => {
  const { studio, editor, token } = setup();
  editor.setText(token, 'ratePerHour', '110');
  rejected(editor.begin('product-two', studio.read()), 'draft-open');
  assert.equal(editor.read().draft.personId, PERSON);
  editor.cancel(token);
  const next = editor.begin('product-two', studio.read()).view.draft.token;
  const current = editor.read().draft.raw;
  for (const operation of [() => editor.setText(token, 'ratePerHour', '999'), () => editor.apply(token),
    () => editor.preview(token), () => editor.cancel(token), () => editor.step(token, 'fundedHours', 1)]) {
    rejected(operation(), 'draft-token');
    assert.deepEqual(editor.read().draft.raw, current);
    assert.strictEqual(editor.read().draft.token, next);
    assert.equal(editor.read().error, null);
  }
  assert.equal(editor.dispose().ok, true);
  assert.equal(editor.dispose().ok, true);
  assert.equal(editor.read().status, 'disposed');
  assert.equal(editor.read().pending, false);
  assert.equal(editor.read().draft, null);
  rejected(editor.begin(PERSON, studio.read()), 'disposed');
  rejected(editor.setText(next, 'ratePerHour', '1'), 'disposed');
  assert.equal(studio.read().result.plannedCommitmentCents, 120000);
});

test('freshness uses exact projections across equal-numbered replacements and different owners', () => {
  const { studio, editor, token } = setup();
  const before = studio.read();
  editor.setText(token, 'fundedHours', '2');
  const replacement = createExamplePlan();
  replacement.people[0].rateCentsPerHour = 12000;
  assert.equal(studio.replace(replacement, before).ok, true);
  const accepted = studio.read();
  assert.equal(accepted.state.revision, before.state.revision);
  rejected(editor.validate(token), 'stale-edit');
  rejected(editor.preview(token), 'stale-edit');
  rejected(editor.apply(token), 'stale-edit');
  assert.equal(editor.read().draft.raw.fundedHours, '2');
  assert.strictEqual(studio.read(), accepted);
  editor.cancel(token);
  rejected(editor.begin(PERSON, createStudio().read()), 'stale-edit');
  assert.equal(editor.begin(PERSON, accepted).ok, true);
  assert.equal(editor.read().draft.raw.ratePerHour, '120.00');
});

test('views expose immutable bounded text and errors while later edits leave prior views intact', () => {
  const { editor, token } = setup();
  editor.setText(token, 'fundedHours', '-');
  const first = editor.read();
  for (const value of [first, first.draft, first.draft.raw, first.draft.errors, first.draft.errors[0], token]) assert.ok(Object.isFrozen(value));
  assert.throws(() => { first.draft.raw.fundedHours = '2'; }, TypeError);
  editor.setText(token, 'fundedHours', '2');
  assert.equal(first.draft.raw.fundedHours, '-');
  assert.equal(first.draft.errors[0].code, 'incomplete');
  assert.equal(editor.read().draft.raw.fundedHours, '2');
});

test('a cooperative preview callback that changes draft text cannot install its older proposal', () => {
  const studio = createStudio();
  let editor;
  let token;
  let changeDuringPreview = true;
  editor = createPersonDraftAdapter({ ...studio, previewPerson(...args) {
    const result = studio.previewPerson(...args);
    if (changeDuringPreview) { changeDuringPreview = false; editor.setText(token, 'ratePerHour', '102'); }
    return result;
  } });
  token = editor.begin(PERSON, studio.read()).view.draft.token;
  editor.setText(token, 'ratePerHour', '101');
  rejected(editor.preview(token), 'draft-changed');
  const current = editor.preview(token);
  assert.equal(current.ok, true);
  assert.equal(current.projection.result.plannedCommitmentCents, 120600);
  assert.equal(studio.read().result.plannedCommitmentCents, 120000);
});

test('successful person Apply retains newer raw text written during publication', () => {
  const studio = createStudio();
  let editor, token;
  editor = createPersonDraftAdapter({ ...studio, updatePerson(...args) {
    const result = studio.updatePerson(...args);
    editor.setText(token, 'ratePerHour', '102');
    return result;
  } });
  token = editor.begin(PERSON, studio.read()).view.draft.token;
  editor.setText(token, 'ratePerHour', '101');
  const result = editor.apply(token);
  assert.equal(result.ok, true);
  assert.equal(studio.read().state.people[0].rateCentsPerHour, 10100);
  assert.equal(studio.read().result.plannedCommitmentCents, 120300);
  assert.equal(result.view.status, 'stale');
  assert.strictEqual(result.view.draft.token, token);
  assert.equal(result.view.draft.raw.ratePerHour, '102');
  rejected(editor.apply(token), 'stale-edit');
  assert.equal(editor.cancel(token).ok, true);
});

test('successful person Apply preserves a replacement editor and its diagnostic', () => {
  const studio = createStudio();
  let editor, token, replacement;
  editor = createPersonDraftAdapter({ ...studio, updatePerson(...args) {
    const result = studio.updatePerson(...args);
    editor.cancel(token);
    replacement = editor.begin(PERSON, studio.read()).view.draft.token;
    editor.setText(replacement, 'ratePerHour', '103');
    rejected(editor.setText(replacement, 'ratePerHour', '9'.repeat(33)), 'text');
    return result;
  } });
  token = editor.begin(PERSON, studio.read()).view.draft.token;
  editor.setText(token, 'ratePerHour', '101');
  const result = editor.apply(token);
  assert.equal(result.ok, true);
  assert.equal(studio.read().state.people[0].rateCentsPerHour, 10100);
  assert.strictEqual(result.view.draft.token, replacement);
  assert.equal(result.view.draft.raw.ratePerHour, '103');
  assert.equal(result.view.error.code, 'text');
});

test('failed person publication returns its error while a newer editor retains its own diagnostic', () => {
  const studio = createStudio();
  let editor, token, replacement;
  editor = createPersonDraftAdapter({ ...studio, updatePerson(id, candidate, expected) {
    const result = studio.updatePerson(id, { ...candidate, extra: true }, expected);
    editor.cancel(token);
    replacement = editor.begin(PERSON, studio.read()).view.draft.token;
    rejected(editor.setText(replacement, 'ratePerHour', '9'.repeat(33)), 'text');
    return result;
  } });
  token = editor.begin(PERSON, studio.read()).view.draft.token;
  editor.setText(token, 'ratePerHour', '101');
  const before = studio.read();
  const result = editor.apply(token);
  rejected(result, 'fields');
  assert.strictEqual(result.view.draft.token, replacement);
  assert.equal(result.view.error.code, 'text');
  assert.strictEqual(studio.read(), before);
});

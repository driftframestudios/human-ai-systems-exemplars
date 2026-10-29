import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createDraftCoordinator, EDITING_LIMITS } from '../../collaboration/native-investment-studio/editing.mjs';

function setup(options = {}, source = createExamplePlan()) {
  const studio = createStudio(source);
  return { studio, editing: createDraftCoordinator(studio, options) };
}
function opened(editing, studio, kind, id) {
  const result = editing[kind].begin(id, studio.read());
  assert.equal(result.ok, true);
  assert.equal(result.view.status, 'editing');
  return result.view.draft.token;
}
function rejected(result, code) { assert.equal(result.ok, false); assert.equal(result.error.code, code); }

test('purpose uses one shared lease and parks six bounded raw fields independently of accepted state', () => {
  const { studio, editing } = setup();
  const before = studio.read();
  assert.equal(Object.hasOwn(editing.purpose, 'step'), false);
  const token = opened(editing, studio, 'purpose', 'purpose');
  const inputs = { changedAbility: '  Find a sample  ', affectedPopulation: 'Research teams', observationSignal: '',
    accountableOwner: '\nStudy lead\n', reviewBoundary: 'Next sprint', openConditions: '😀'.repeat(300) };
  for (const [field, value] of Object.entries(inputs)) assert.equal(editing.purpose.setText(token, field, value).ok, true);
  const intent = editing.read().intent;
  assert.equal(editing.park().ok, true);
  const saved = editing.read().parked[0];
  assert.equal(saved.kind, 'purpose');
  assert.equal(saved.targetId, 'purpose');
  assert.equal(saved.targetExists, true);
  assert.deepEqual(saved.raw, inputs);
  assert.equal(Object.hasOwn(saved, 'projection'), false);
  assert.equal(Object.hasOwn(saved, 'baseProjection'), false);
  assert.strictEqual(editing.read().intent, intent);
  const resumed = opened(editing, studio, 'purpose', 'purpose');
  assert.deepEqual(editing.purpose.read().draft.raw, inputs);
  assert.strictEqual(editing.read().intent, intent);
  rejected(editing.purpose.apply(token), 'draft-token');
  assert.strictEqual(studio.read(), before);
  assert.equal(editing.purpose.preview(resumed).projection.result.plannedCommitmentCents, 120000);
  assert.equal(editing.purpose.apply(resumed).ok, true);
  assert.equal(studio.read().state.purpose.changedAbility, 'Find a sample');
  assert.equal(studio.read().state.purpose.observationSignal, null);
  assert.equal(studio.read().result.plannedCommitmentCents, 120000);
  assert.equal(editing.read().slots, 0);
});

test('accepting purpose retains a saved work edit for explicit review against the newer plan', () => {
  const { studio, editing } = setup();
  const work = opened(editing, studio, 'work', 'review');
  editing.work.setText(work, 'minutesPerSession', '45');
  const purpose = opened(editing, studio, 'purpose', 'purpose');
  editing.purpose.setText(purpose, 'changedAbility', 'Locate samples');
  assert.equal(editing.purpose.apply(purpose).ok, true);
  assert.equal(editing.work.read().status, 'stale');
  assert.equal(editing.work.read().draft.raw.minutesPerSession, '45');
  const saved = editing.work.read().draft.token;
  rejected(editing.work.begin('review', studio.read()), 'review-required');
  const reviewed = editing.work.review(saved, studio.read());
  assert.equal(reviewed.ok, true);
  assert.equal(editing.work.apply(reviewed.view.draft.token).ok, true);
  assert.equal(studio.read().state.purpose.changedAbility, 'Locate samples');
  assert.equal(studio.read().result.plannedCommitmentCents, 180000);
});

test('legacy import preserves parked purpose text for review or deliberate current-value recovery', () => {
  const { studio, editing } = setup();
  const purpose = opened(editing, studio, 'purpose', 'purpose');
  editing.purpose.setText(purpose, 'changedAbility', 'Restore sample tracking');
  editing.purpose.setText(purpose, 'reviewBoundary', '  Next sprint  ');
  editing.park();
  const saved = editing.purpose.read().draft.token;
  const legacy = createExamplePlan();
  legacy.schemaVersion = '0.1.0';
  delete legacy.purpose;
  assert.equal(studio.importText(JSON.stringify(legacy), studio.read()).ok, true);
  assert.equal(studio.read().state.schemaVersion, '0.2.0');
  assert.equal(editing.purpose.read().status, 'stale');
  rejected(editing.purpose.begin('purpose', studio.read()), 'review-required');
  const reviewed = editing.purpose.review(saved, studio.read());
  assert.equal(reviewed.ok, true);
  assert.equal(reviewed.view.draft.raw.reviewBoundary, '  Next sprint  ');
  assert.equal(editing.purpose.apply(reviewed.view.draft.token).ok, true);
  assert.equal(studio.read().state.purpose.reviewBoundary, 'Next sprint');
  const next = opened(editing, studio, 'purpose', 'purpose');
  editing.purpose.setText(next, 'reviewBoundary', 'Later draft');
  editing.park();
  const parked = editing.purpose.read().draft.token;
  studio.importText(JSON.stringify(legacy), studio.read());
  const current = editing.purpose.useCurrent(parked, studio.read());
  assert.equal(current.ok, true);
  assert.equal(current.view.draft.raw.reviewBoundary, '');
  assert.equal(editing.purpose.cancel(current.view.draft.token).ok, true);
  assert.equal(studio.read().state.purpose.reviewBoundary, null);
});

test('purpose reserves a bounded slot, accepts only its fixed target, and releases all ownership on disposal', () => {
  const { studio, editing } = setup({ limit: 1 });
  rejected(editing.purpose.begin('__proto__', studio.read()), 'reference');
  const purpose = opened(editing, studio, 'purpose', 'purpose');
  const intent = editing.read().intent;
  rejected(editing.purpose.setText(purpose, 'changedAbility', 'x'.repeat(601)), 'text');
  assert.strictEqual(editing.read().intent, intent);
  editing.purpose.setText(purpose, 'changedAbility', '  ');
  assert.equal(editing.purpose.read().draft.changed, false);
  rejected(editing.person.begin('product-one', studio.read()), 'draft-limit');
  assert.equal(editing.park().ok, true);
  assert.equal(editing.read().slots, 1);
  assert.equal(editing.discard(editing.read().parked[0].token).ok, true);
  const next = opened(editing, studio, 'purpose', 'purpose');
  editing.purpose.setText(next, 'changedAbility', 'Still a draft');
  const disposed = editing.dispose();
  assert.deepEqual(disposed.selected, { work: null, person: null, purpose: null, assembly: null, session: null });
  assert.equal(disposed.slots, 0);
  assert.equal(disposed.active, null);
  assert.equal(editing.purpose.read().status, 'disposed');
  rejected(editing.purpose.apply(next), 'disposed');
  assert.equal(studio.read().state.purpose.changedAbility, null);
});

test('parking one session edit, changing a rate and explicitly reviewing retain exact independent amounts', () => {
  const { studio, editing } = setup();
  const original = studio.read();
  const workToken = opened(editing, studio, 'work', 'review');
  editing.work.setText(workToken, 'minutesPerSession', '45');
  assert.equal(editing.work.preview(workToken).projection.result.knownCommitmentCents, 180000);
  assert.equal(editing.park().ok, true);
  const parkedToken = editing.work.read().draft.token;
  assert.notEqual(parkedToken, workToken);
  assert.equal(editing.work.read().status, 'parked');
  assert.strictEqual(studio.read(), original);
  const personToken = opened(editing, studio, 'person', 'product-one');
  editing.person.setText(personToken, 'ratePerHour', '105');
  assert.equal(editing.person.apply(personToken).ok, true);
  assert.equal(studio.read().result.knownCommitmentCents, 121500);
  rejected(editing.work.begin('review', studio.read()), 'review-required');
  assert.equal(editing.work.read().draft.raw.minutesPerSession, '45');
  assert.equal(editing.work.read().status, 'stale');
  rejected(editing.work.apply(parkedToken), 'draft-token');
  const reviewed = editing.work.review(parkedToken, studio.read());
  assert.equal(reviewed.ok, true);
  assert.notEqual(reviewed.view.draft.token, parkedToken);
  assert.equal(studio.read().result.knownCommitmentCents, 121500);
  assert.equal(editing.work.preview(reviewed.view.draft.token).projection.result.knownCommitmentCents, 182250);
  assert.equal(editing.work.apply(reviewed.view.draft.token).ok, true);
  assert.equal(studio.read().result.knownCommitmentCents, 182250);
  assert.equal(editing.read().slots, 0);
});

test('fresh saved raw text resumes through a new lease and foreign or retired tokens cannot edit it', () => {
  const { studio, editing } = setup();
  const first = opened(editing, studio, 'person', 'product-one');
  editing.person.setText(first, 'ratePerHour', '103');
  const second = opened(editing, studio, 'person', 'product-two');
  assert.equal(editing.read().selected.person, 'product-two');
  rejected(editing.person.setText(first, 'ratePerHour', '999'), 'draft-token');
  rejected(editing.work.setText(second, 'occurrences', '99'), 'draft-token');
  assert.equal(editing.person.read().draft.raw.ratePerHour, '100.00');
  const saved = editing.read().parked[0];
  const resumed = opened(editing, studio, 'person', 'product-one');
  assert.notEqual(resumed, first);
  assert.notEqual(resumed, saved.token);
  assert.equal(editing.person.read().draft.raw.ratePerHour, '103');
  assert.equal(editing.read().parked.length, 0);
  assert.equal(editing.read().slots, 1);
  rejected(editing.person.cancel(saved.token), 'draft-token');
  assert.equal(editing.person.cancel(resumed).ok, true);
  assert.equal(studio.read().result.knownCommitmentCents, 120000);
});

test('the active reservation bounds all drafts and leaves chapter parking available at capacity', () => {
  const { studio, editing } = setup({ limit: 2 });
  const work = opened(editing, studio, 'work', 'review');
  editing.work.setText(work, 'minutesPerSession', '45');
  const person = opened(editing, studio, 'person', 'product-one');
  editing.person.setText(person, 'ratePerHour', '101');
  const before = editing.read();
  rejected(editing.person.begin('product-two', studio.read()), 'draft-limit');
  assert.deepEqual(editing.read(), before);
  assert.equal(editing.park().ok, true);
  assert.equal(editing.read().parked.length, 2);
  assert.equal(editing.read().active, null);
  assert.equal(editing.read().slots, 2);
  const held = editing.read();
  rejected(editing.person.begin('product-two', studio.read()), 'draft-limit');
  assert.deepEqual(editing.read(), held);
  const resumed = opened(editing, studio, 'work', 'review');
  assert.equal(editing.read().slots, 2);
  assert.equal(editing.read().parked.length, 1);
  assert.equal(editing.work.cancel(resumed).ok, true);
  opened(editing, studio, 'person', 'product-two');
  assert.equal(editing.read().slots, 2);
});

test('unchanged sessions release their slot while literal formatting and invalid text survive parking', () => {
  const { studio, editing } = setup({ limit: 1 });
  opened(editing, studio, 'work', 'review');
  editing.park();
  assert.equal(editing.read().slots, 0);
  const first = opened(editing, studio, 'work', 'review');
  editing.work.setText(first, 'minutesPerSession', '00030');
  assert.equal(editing.work.read().draft.changed, false);
  editing.park();
  assert.equal(editing.read().parked[0].raw.minutesPerSession, '00030');
  const resumed = opened(editing, studio, 'work', 'review');
  editing.work.setText(resumed, 'minutesPerSession', '-');
  editing.park();
  const invalid = opened(editing, studio, 'work', 'review');
  assert.equal(editing.work.read().draft.raw.minutesPerSession, '-');
  rejected(editing.work.apply(invalid), 'incomplete');
  assert.equal(studio.read().result.knownCommitmentCents, 120000);
});

test('parked records own only frozen bounded raw fields and tiny acceptance markers', () => {
  const { studio, editing } = setup();
  const token = opened(editing, studio, 'person', 'product-one');
  editing.person.setText(token, 'ratePerHour', '00101');
  editing.person.setText(token, 'fundedHours', '2');
  editing.park();
  const record = editing.read().parked[0];
  assert.deepEqual(Object.keys(record).sort(), ['baseAcceptance', 'kind', 'raw', 'status', 'targetExists', 'targetId', 'token']);
  assert.deepEqual(Object.keys(record.raw).sort(), ['fundedHours', 'fundedMinutes', 'ratePerHour']);
  assert.deepEqual(Object.keys(record.baseAcceptance).sort(), ['instance', 'sequence', 'token']);
  assert.equal(typeof record.baseAcceptance.instance, 'symbol');
  assert.equal(typeof record.baseAcceptance.token, 'symbol');
  assert.equal(Object.hasOwn(record, 'projection'), false);
  assert.equal(Object.hasOwn(editing.person.read().draft, 'baseProjection'), false);
  assert.ok(Object.isFrozen(record) && Object.isFrozen(record.raw) && Object.isFrozen(record.baseAcceptance));
  assert.throws(() => { record.raw.ratePerHour = '999'; }, TypeError);
  const next = opened(editing, studio, 'person', 'product-one');
  const intent = editing.read().intent;
  rejected(editing.person.setText(next, 'ratePerHour', '1'.repeat(33)), 'text');
  rejected(editing.person.setText(next, '__proto__', '1'), 'field');
  assert.equal(editing.person.read().draft.raw.ratePerHour, '00101');
  assert.strictEqual(editing.read().intent, intent);
});

test('stale review binds the displayed current projection and current-values choice deliberately resets text', () => {
  const { studio, editing } = setup();
  const token = opened(editing, studio, 'person', 'product-one');
  editing.person.setText(token, 'ratePerHour', '105');
  editing.park();
  const saved = editing.person.read().draft.token;
  const previous = studio.read();
  assert.equal(studio.updatePerson('product-one', { ...previous.state.people[0], rateCentsPerHour: 11000 }, previous).ok, true);
  rejected(editing.person.review(saved, previous), 'stale-edit');
  assert.equal(editing.person.read().draft.raw.ratePerHour, '105');
  const reset = editing.person.useCurrent(saved, studio.read());
  assert.equal(reset.ok, true);
  assert.equal(reset.view.draft.raw.ratePerHour, '110.00');
  assert.equal(reset.view.draft.changed, false);
  assert.equal(studio.read().result.knownCommitmentCents, 123000);
  rejected(editing.person.cancel(saved), 'draft-token');
  assert.equal(editing.person.cancel(reset.view.draft.token).ok, true);
});

test('removed targets keep readable saved text until explicit discard', () => {
  const source = createExamplePlan();
  source.people.push({ id: 'reserve', label: 'Reserve', fundedMinutes: 0, rateCentsPerHour: null });
  const { studio, editing } = setup({}, source);
  const token = opened(editing, studio, 'person', 'reserve');
  editing.person.setText(token, 'ratePerHour', '120');
  editing.park();
  const saved = editing.person.read().draft.token;
  const before = studio.read();
  assert.equal(studio.replace({ ...before.state, people: before.state.people.filter(person => person.id !== 'reserve') }, before).ok, true);
  assert.equal(editing.read().parked[0].targetExists, false);
  assert.equal(editing.person.read().draft.raw.ratePerHour, '120');
  rejected(editing.person.review(saved, studio.read()), 'reference');
  rejected(editing.person.useCurrent(saved, studio.read()), 'reference');
  assert.equal(editing.person.cancel(saved).ok, true);
  assert.equal(editing.read().slots, 0);
});

test('accepted A to B to A restoration keeps older parked text stale', () => {
  const { studio, editing } = setup();
  const token = opened(editing, studio, 'work', 'review');
  editing.work.setText(token, 'minutesPerSession', '45');
  editing.park();
  const oldMarker = editing.read().parked[0].baseAcceptance;
  const first = studio.read();
  assert.equal(studio.updatePerson('product-one', { ...first.state.people[0], rateCentsPerHour: 10500 }, first).ok, true);
  assert.equal(studio.undo(studio.read()).ok, true);
  assert.equal(studio.read().result.knownCommitmentCents, 120000);
  assert.notEqual(studio.readAcceptance().token, oldMarker.token);
  assert.equal(editing.work.read().status, 'stale');
  rejected(editing.work.begin('review', studio.read()), 'review-required');
  assert.equal(editing.work.read().draft.raw.minutesPerSession, '45');
});

test('discarding an unselected removed target releases capacity and preserves the active lease', () => {
  const source = createExamplePlan();
  source.people.push({ id: 'reserve', label: 'Reserve', fundedMinutes: 0, rateCentsPerHour: null });
  const { studio, editing } = setup({ limit: 2 }, source);
  const reserve = opened(editing, studio, 'person', 'reserve');
  editing.person.setText(reserve, 'ratePerHour', '120');
  const person = opened(editing, studio, 'person', 'product-one');
  editing.person.setText(person, 'ratePerHour', '105');
  const orphan = editing.read().parked[0];
  const previous = studio.read();
  studio.replace({ ...previous.state, people: previous.state.people.filter(row => row.id !== 'reserve') }, previous);
  rejected(editing.person.begin('product-two', studio.read()), 'draft-limit');
  const held = editing.read();
  const accepted = studio.read();
  assert.equal(held.parked[0].targetExists, false);
  assert.equal(editing.discard(orphan.token).ok, true);
  assert.deepEqual(editing.read().active, held.active);
  assert.equal(editing.read().selected.person, 'product-one');
  assert.equal(editing.person.read().draft.raw.ratePerHour, '105');
  assert.strictEqual(studio.read(), accepted);
  assert.equal(editing.read().slots, 1);
  rejected(editing.discard(orphan.token), 'draft-token');
  opened(editing, studio, 'person', 'product-two');
  assert.equal(editing.read().slots, 2);
  assert.equal(editing.read().parked[0].targetId, 'product-one');
});

test('a coordinator is shared only by its Studio instance and disposal permits a fresh owner', () => {
  const { studio, editing } = setup();
  assert.strictEqual(createDraftCoordinator(studio), editing);
  assert.throws(() => createDraftCoordinator(studio, { limit: 2 }), /existing Studio draft limit/u);
  const other = setup();
  assert.notEqual(other.editing, editing);
  const token = opened(editing, studio, 'work', 'review');
  editing.work.setText(token, 'minutesPerSession', '45');
  const before = studio.read();
  editing.dispose();
  assert.equal(editing.read().slots, 0);
  assert.equal(editing.read().disposed, true);
  assert.equal(editing.work.read().status, 'disposed');
  rejected(editing.work.apply(token), 'disposed');
  rejected(editing.work.begin('review', studio.read()), 'disposed');
  assert.strictEqual(studio.read(), before);
  const fresh = createDraftCoordinator(studio);
  assert.notEqual(fresh, editing);
  assert.equal(fresh.read().slots, 0);
  opened(fresh, studio, 'work', 'review');
  assert.equal(other.editing.read().slots, 0);
  assert.equal(EDITING_LIMITS.drafts, 8);
});

test('preview reentry cannot publish or revive an edit disposed during proposal preparation', () => {
  const studio = createStudio();
  let editing;
  const facade = Object.freeze({ ...studio, previewWork(...args) {
    editing.dispose();
    return studio.previewWork(...args);
  } });
  editing = createDraftCoordinator(facade);
  const token = opened(editing, facade, 'work', 'review');
  editing.work.setText(token, 'minutesPerSession', '45');
  const before = studio.read();
  rejected(editing.work.preview(token), 'draft-token');
  assert.equal(editing.read().disposed, true);
  assert.equal(editing.read().slots, 0);
  assert.strictEqual(studio.read(), before);
});

test('raw edit intent changes for invalid text while chapter parking, resuming and inspection preserve it', () => {
  const { studio, editing } = setup();
  const token = opened(editing, studio, 'work', 'review');
  const before = editing.read().intent;
  editing.work.setText(token, 'minutesPerSession', '-');
  const changed = editing.read().intent;
  assert.notEqual(changed, before);
  editing.work.setText(token, 'minutesPerSession', '-');
  editing.work.validate(token);
  assert.strictEqual(editing.read().intent, changed);
  editing.park();
  opened(editing, studio, 'person', 'product-one');
  editing.park();
  const resumed = opened(editing, studio, 'work', 'review');
  assert.strictEqual(editing.read().intent, changed);
  editing.work.preview(resumed);
  assert.strictEqual(editing.read().intent, changed);
  editing.work.useCurrent(resumed, studio.read());
  assert.notEqual(editing.read().intent, changed);
});

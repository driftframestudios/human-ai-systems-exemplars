import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan, preparePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { LIMITS } from '../../collaboration/native-investment-studio/config.mjs';
const unassignedRole = () => ({ functionId: null, seniorityId: null, postureId: null, enablerId: null,
  change: null, qualityId: null, aiId: null, decisionId: null });


const PERSON = 'product-one';
function person(projection, overrides = {}, id = PERSON) {
  return { ...projection.state.people.find(row => row.id === id), ...overrides };
}
function held(result, projection, code) {
  assert.equal(result.ok, false);
  assert.equal(result.error.code, code);
  assert.strictEqual(result.projection, projection);
}

for (const [workCount, expectedDelta] of [[1, 300], [8, 2400], [25, 7500]]) {
  test(`rate command adds the literal ${expectedDelta} cents across ${workCount} shared work references`, () => {
    const plan = createExamplePlan();
    plan.work = Array.from({ length: workCount }, (_, index) => ({ ...plan.work[0], id: index ? `review-${index}` : 'review' }));
    const studio = createStudio(plan);
    const before = studio.capture();
    const row = person(before, { rateCentsPerHour: 10100 });
    const preview = studio.previewPerson(PERSON, row, before);
    assert.equal(preview.ok, true);
    assert.equal(preview.projection.result.plannedCommitmentCents - before.result.plannedCommitmentCents, expectedDelta);
    assert.strictEqual(studio.read(), before);
    const update = studio.updatePerson(PERSON, row, before);
    assert.equal(update.ok, true);
    assert.equal(update.projection.result.plannedCommitmentCents - before.result.plannedCommitmentCents, expectedDelta);
    assert.deepEqual(update.projection, preview.projection);
    const whole = { ...before.state, revision: 1, people: before.state.people.map(p => p.id === PERSON ? row : p) };
    assert.deepEqual(update.projection, preparePlan(whole), 'whole-plan parity complements the literal delta');
    assert.equal(before.state.people[0].rateCentsPerHour, 10000);
    assert.equal(before.result.plannedCommitmentCents, workCount * 120000);
    row.rateCentsPerHour = 0;
    assert.equal(studio.read().state.people[0].rateCentsPerHour, 10100);
    assert.ok(Object.isFrozen(update.projection.state.people[0]));
  });
}

test('a person shared by teams contributes one funded account and both funding pools once', () => {
  const plan = createExamplePlan();
  plan.people = [
    { id: 'one', label: 'One', fundedMinutes: 120, rateCentsPerHour: 10000, role: unassignedRole(), lifecycle: 'active' },
    { id: 'two', label: 'Two', fundedMinutes: 60, rateCentsPerHour: 5000, role: unassignedRole(), lifecycle: 'active' },
  ];
  plan.teams = ['first', 'second'].map(id => ({ id, label: id, personIds: ['one', 'two'], lifecycle: 'active' }));
  const work = (id, teamId, personId, minutes, funding) => ({ ...plan.work[0], id, teamId, personIds: [personId], minutesPerOccurrence: minutes, occurrences: 1, funding });
  plan.work = [work('one-allocation', 'first', 'one', 60, 'allocated'), work('one-purchase', 'second', 'one', 30, 'additional'),
    work('two-allocation', 'second', 'two', 15, 'allocated'), work('two-purchase', 'first', 'two', 60, 'additional')];
  plan.practices = [];
  const studio = createStudio(plan);
  const before = studio.read();
  assert.equal(before.result.plannedCommitmentCents, 35000);
  const changed = studio.updatePerson('one', person(before, { rateCentsPerHour: 12500 }, 'one'), before);
  assert.equal(changed.ok, true);
  assert.equal(changed.projection.result.fundedKnownCents, 30000);
  assert.equal(changed.projection.result.allocatedKnownCents, 13750);
  assert.equal(changed.projection.result.additionalKnownCents, 11250);
  assert.equal(changed.projection.result.plannedCommitmentCents, 41250);
  assert.equal(changed.projection.result.capacity.find(row => row.personId === 'one').remainingMinutes, 60);
  assert.deepEqual(changed.projection.state.people.map(row => row.id), ['one', 'two']);
});

test('person previews preserve pool rounding when displayed work lines round independently', () => {
  const plan = createExamplePlan();
  plan.people = [{ id: 'one', label: 'One', fundedMinutes: 60, rateCentsPerHour: 1, role: unassignedRole(), lifecycle: 'active' }];
  plan.teams = [{ id: 'delivery', label: 'Delivery', personIds: ['one'], lifecycle: 'active' }];
  plan.work = ['allocated', 'additional'].flatMap(funding => [0, 1].map(index => ({ ...plan.work[0], id: `${funding}-${index}`,
    personIds: ['one'], minutesPerOccurrence: 15, occurrences: 1, funding })));
  plan.practices = [];
  const studio = createStudio(plan);
  const before = studio.read();
  const preview = studio.previewPerson('one', person(before, { rateCentsPerHour: 2 }, 'one'), before);
  assert.equal(preview.ok, true);
  assert.equal(preview.projection.result.plannedCommitmentCents, 3);
  assert.equal(preview.projection.result.allocatedKnownCents, 1);
  assert.equal(preview.projection.result.additionalKnownCents, 1);
  assert.deepEqual(preview.projection.result.lineRoundingAdjustments, { allocatedCents: -1, additionalCents: -1 });
  assert.strictEqual(studio.read(), before);
});

test('unknown rate, explicit zero, and zero funded time retain different pricing meanings', () => {
  const studio = createStudio();
  const initial = studio.read();
  const missing = studio.updatePerson(PERSON, person(initial, { rateCentsPerHour: null, role: unassignedRole(), lifecycle: 'active' }), initial);
  assert.equal(missing.ok, true);
  assert.equal(missing.projection.result.plannedCommitmentCents, null);
  assert.equal(missing.projection.result.knownCommitmentCents, 90000);
  const zero = studio.updatePerson(PERSON, person(missing.projection, { rateCentsPerHour: 0, role: unassignedRole(), lifecycle: 'active' }), missing.projection);
  assert.equal(zero.ok, true);
  assert.equal(zero.projection.result.plannedCommitmentCents, 90000);
  assert.equal(zero.projection.result.standing, 'priced');
  assert.equal(zero.projection.state.people[0].fundedMinutes, 0);
});

test('admitted material no-op preserves identity and revision, including the revision limit', () => {
  const plan = createExamplePlan();
  plan.revision = LIMITS.revision;
  const studio = createStudio(plan);
  const before = studio.read();
  for (const command of ['previewPerson', 'updatePerson']) {
    const result = studio[command](PERSON, person(before, { fundedMinutes: -0 }), before);
    assert.equal(result.ok, true);
    assert.strictEqual(result.projection, before);
    held(studio[command](PERSON, person(before, { rateCentsPerHour: 10100 }), before), before, 'integer');
  }
  assert.strictEqual(studio.capture(), before);
  assert.equal(studio.exportText(), before.serialized);
});

test('a changed display label receives a material revision while rate and effort retain their values', () => {
  const studio = createStudio();
  const before = studio.read();
  const result = studio.updatePerson(PERSON, person(before, { label: 'Product lead' }), before);
  assert.equal(result.ok, true);
  assert.notStrictEqual(result.projection, before);
  assert.equal(result.projection.state.revision, 1);
  assert.equal(result.projection.state.people[0].label, 'Product lead');
  assert.equal(result.projection.result.plannedCommitmentCents, 120000);
});

test('person commands validate every field before treating a candidate as unchanged', () => {
  const studio = createStudio();
  const before = studio.read();
  const cases = [
    [person(before, { rateCentsPerHour: -1 }), 'integer'], [person(before, { rateCentsPerHour: 1.01 }), 'integer'],
    [person(before, { rateCentsPerHour: LIMITS.rateCentsPerHour + 1 }), 'integer'],
    [person(before, { fundedMinutes: LIMITS.fundedMinutes + 1 }), 'integer'],
    [person(before, { fundedMinutes: NaN }), 'integer'], [person(before, { fundedMinutes: Infinity }), 'integer'],
    [person(before, { fundedMinutes: '60' }), 'integer'], [person(before, { label: 'x'.repeat(LIMITS.label + 1) }), 'text'],
    [person(before, { extra: true }), 'fields'], [{ id: PERSON }, 'fields'],
    [person(before, { id: 'other' }), 'target'],
  ];
  for (const [candidate, code] of cases) {
    held(studio.updatePerson(PERSON, candidate, before), before, code);
    held(studio.previewPerson(PERSON, candidate, before), before, code);
  }
  let reads = 0;
  const accessor = person(before);
  Object.defineProperty(accessor, 'fundedMinutes', { enumerable: true, get() { reads += 1; return 0; } });
  held(studio.updatePerson(PERSON, accessor, before), before, 'data-property');
  const accessorId = person(before);
  Object.defineProperty(accessorId, 'id', { enumerable: true, get() { reads += 1; return PERSON; } });
  held(studio.updatePerson(PERSON, accessorId, before), before, 'target');
  const surplus = person(before);
  Object.defineProperty(surplus, 'extra', { enumerable: true, get() { reads += 1; throw new Error('unowned'); } });
  held(studio.updatePerson(PERSON, surplus, before), before, 'fields');
  assert.equal(reads, 0);
  held(studio.updatePerson('missing', person(before), before), before, 'reference');
  assert.strictEqual(studio.read(), before);
});

test('an individually valid rate whose aggregate exceeds safe money retains the last priced plan', () => {
  const plan = createExamplePlan();
  plan.people = [
    { id: 'one', label: 'One', fundedMinutes: 0, rateCentsPerHour: LIMITS.rateCentsPerHour, role: unassignedRole(), lifecycle: 'active' },
    { id: 'two', label: 'Two', fundedMinutes: 0, rateCentsPerHour: 0, role: unassignedRole(), lifecycle: 'active' },
  ];
  plan.teams = [{ id: 'delivery', label: 'Delivery', personIds: ['one', 'two'], lifecycle: 'active' }];
  plan.work = Array.from({ length: LIMITS.work }, (_, index) => ({ ...plan.work[0], id: `work-${index}`,
    personIds: ['one', 'two'], minutesPerOccurrence: LIMITS.minutesPerOccurrence, occurrences: LIMITS.occurrences }));
  plan.practices = [];
  const studio = createStudio(plan);
  const before = studio.read();
  assert.equal(before.result.plannedCommitmentCents, 6144000000000000);
  const candidate = person(before, { rateCentsPerHour: LIMITS.rateCentsPerHour, role: unassignedRole(), lifecycle: 'active' }, 'two');
  held(studio.previewPerson('two', candidate, before), before, 'money-overflow');
  held(studio.updatePerson('two', candidate, before), before, 'money-overflow');
  assert.strictEqual(studio.capture(), before);
  assert.equal(studio.exportText(), before.serialized);
});

test('stale and foreign projection checks cover preview, material edits, and no-op edits', () => {
  const studio = createStudio();
  const before = studio.read();
  const foreign = createStudio().read();
  held(studio.previewPerson(PERSON, person(before), foreign), before, 'stale-edit');
  held(studio.updatePerson(PERSON, person(before), foreign), before, 'stale-edit');
  const imported = studio.importText(before.serialized, before);
  assert.equal(imported.ok, true);
  assert.equal(imported.projection.state.revision, before.state.revision);
  assert.notStrictEqual(imported.projection, before);
  held(studio.updatePerson(PERSON, person(before), before), imported.projection, 'stale-edit');
  held(studio.previewPerson(PERSON, person(before, { rateCentsPerHour: 10100 }), before), imported.projection, 'stale-edit');
});

test('replacement and import refresh person positions while edits preserve authored ordering and exchange', () => {
  const studio = createStudio();
  for (const command of ['replace', 'importText']) {
    const next = JSON.parse(studio.exportText());
    next.people.reverse();
    const replacement = studio[command](command === 'replace' ? next : JSON.stringify(next), studio.read());
    assert.equal(replacement.ok, true);
    const before = studio.read();
    const order = before.state.people.map(row => row.id);
    const changed = studio.updatePerson(PERSON, person(before, { fundedMinutes: before.state.people.find(p => p.id === PERSON).fundedMinutes + 60 }), before);
    assert.equal(changed.ok, true);
    assert.deepEqual(changed.projection.state.people.map(row => row.id), order);
    assert.deepEqual(JSON.parse(studio.exportText()), changed.projection.state);
    assert.equal(changed.projection.state.people.filter(row => row.id !== PERSON && row.fundedMinutes !== 0).length, 0);
  }
});

test('reentrant person admission preserves a newer replacement and its people index', () => {
  const studio = createStudio();
  const before = studio.read();
  const next = createExamplePlan();
  next.people.reverse();
  let nested;
  const candidate = new Proxy(person(before, { rateCentsPerHour: 10100 }), {
    getOwnPropertyDescriptor(target, key) {
      if (!nested) nested = studio.replace(next, before);
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  held(studio.updatePerson(PERSON, candidate, before), nested?.projection ?? studio.read(), 'stale-edit');
  assert.equal(nested.ok, true);
  const changed = studio.updatePerson(PERSON, person(nested.projection, { rateCentsPerHour: 10200 }), nested.projection);
  assert.equal(changed.ok, true);
  assert.equal(changed.projection.state.people[3].id, PERSON);
  assert.equal(changed.projection.state.people[3].rateCentsPerHour, 10200);
  assert.equal(changed.projection.result.plannedCommitmentCents, 120600);
});
